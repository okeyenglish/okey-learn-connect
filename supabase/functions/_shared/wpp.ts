type StartResult =
  | { state: 'connected' }
  | { state: 'qr'; base64: string }
  | { state: 'starting' }
  | { state: 'timeout' }
  | { state: 'error'; message: string };

export interface WppClientOptions {
  baseUrl: string;
  session: string;
  secret: string;
  timeoutMs?: number;
  pollSeconds?: number;
}

export class WppClient {
  private base: string;
  private session: string;
  private secret: string;
  private timeoutMs: number;
  private pollSeconds: number;

  constructor(o: WppClientOptions) {
    this.base = o.baseUrl.replace(/\/+$/, '');
    this.session = o.session;
    this.secret = o.secret;
    this.timeoutMs = o.timeoutMs ?? 10_000;
    this.pollSeconds = o.pollSeconds ?? 30;
  }

  private maskSecret(s: string): string {
    if (s.length < 8) return '***';
    return `${s.substring(0, 4)}***${s.slice(-4)}`;
  }

  private async _fetch(
    url: string,
    init: RequestInit & { expected?: 'json' | 'any' } = {},
  ): Promise<any> {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), this.timeoutMs);
    
    try {
      console.log(`[WppClient] ${init.method || 'GET'} ${url.replace(this.secret, this.maskSecret(this.secret))}`);
      
      const res = await fetch(url, {
        redirect: 'follow',
        headers: {
          'Accept': init.expected === 'json' ? 'application/json' : '*/*',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          ...(init.headers || {}),
        },
        signal: ac.signal,
        ...init,
      });

      console.log(`[WppClient] Response: ${res.status} ${res.statusText}`);
      const ct = res.headers.get('content-type') || '';
      console.log(`[WppClient] Content-Type: ${ct}`);

      if (!res.ok) {
        const bodyText = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${res.statusText} ${bodyText.slice(0, 200)}`);
      }

      if (init.expected === 'json') {
        if (!ct.includes('json')) {
          const text = await res.text();
          console.log(`[WppClient] Body (not JSON CT, first 200 chars): ${text.substring(0, 200)}`);
          try {
            return JSON.parse(text);
          } catch {
            return text;
          }
        }
        return await res.json();
      }

      return res;
    } finally {
      clearTimeout(t);
    }
  }

  async getToken(): Promise<string> {
    const pathA = `${this.base}/api/${encodeURIComponent(this.session)}/${encodeURIComponent(this.secret)}/generate-token`;
    const pathB = `${this.base}/api/${encodeURIComponent(this.session)}/generate-token`;
    const pathC = `${pathB}?secretKey=${encodeURIComponent(this.secret)}`;

    console.log('[WppClient] Attempting to generate token...');

    // A: secret in path
    try {
      console.log('[WppClient] Try: POST secret in path');
      const j = await this._fetch(pathA, { method: 'POST', expected: 'json' });
      if (j && typeof j === 'object' && 'token' in j) {
        console.log('[WppClient] ✓ Token generated via POST secret in path');
        return (j as any).token as string;
      }
    } catch (e) {
      console.log(`[WppClient] POST secret in path failed: ${e}`);
    }

    // B: secret in body
    try {
      console.log('[WppClient] Try: POST secret in body');
      const j = await this._fetch(pathB, {
        method: 'POST',
        expected: 'json',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretkey: this.secret, secretKey: this.secret }),
      });
      if (j && typeof j === 'object' && 'token' in j) {
        console.log('[WppClient] ✓ Token generated via POST secret in body');
        return (j as any).token as string;
      }
    } catch (e) {
      console.log(`[WppClient] POST secret in body failed: ${e}`);
    }

    // C: secret in query
    try {
      console.log('[WppClient] Try: POST secret in query');
      const j = await this._fetch(pathC, { method: 'POST', expected: 'json' });
      if (j && typeof j === 'object' && 'token' in j) {
        console.log('[WppClient] ✓ Token generated via POST secret in query');
        return (j as any).token as string;
      }
    } catch (e) {
      console.log(`[WppClient] POST secret in query failed: ${e}`);
    }

    throw new Error('Failed to generate token: server did not return token (check secret & Caddy config).');
  }

  async startSession(bearer: string, webhookUrl?: string): Promise<any> {
    const url = `${this.base}/api/${encodeURIComponent(this.session)}/start-session`;
    console.log('[WppClient] Starting session...');
    
    const body: any = {};
    if (webhookUrl) {
      body.webhook = webhookUrl;
      body.waitQrCode = true;
    }

    const j = await this._fetch(url, {
      method: 'POST',
      expected: 'json',
      headers: {
        'Authorization': `Bearer ${bearer}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    console.log(`[WppClient] Start session response:`, JSON.stringify(j).substring(0, 300));
    return j;
  }

  async getStatus(bearer: string): Promise<any> {
    const url = `${this.base}/api/${encodeURIComponent(this.session)}/status-session`;
    return await this._fetch(url, {
      expected: 'json',
      headers: { 'Authorization': `Bearer ${bearer}` },
    });
  }

  async getQr(bearer: string): Promise<{ base64: string } | null> {
    const url = `${this.base}/api/${encodeURIComponent(this.session)}/qrcode`;
    console.log('[WppClient] Fetching QR code...');

    // Try JSON first
    try {
      const j = await this._fetch(url, {
        expected: 'json',
        headers: { 'Authorization': `Bearer ${bearer}` },
      });

      if (j && typeof j === 'object') {
        const d = j as any;
        const s = (d.qrcode || d.base64 || d.image) as string | undefined;
        if (s) {
          const base64 = s.startsWith('data:image') ? s : `data:image/png;base64,${s}`;
          console.log('[WppClient] ✓ QR found as JSON');
          return { base64 };
        }
      }
    } catch (e) {
      console.log(`[WppClient] JSON QR attempt failed: ${e}`);
    }

    // Try RAW PNG
    try {
      const res = await this._fetch(url, {
        expected: 'any',
        headers: { 'Authorization': `Bearer ${bearer}` },
      }) as Response;

      const buf = new Uint8Array(await res.arrayBuffer());
      
      // Check PNG signature: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
      const isPng = buf.length >= 8 &&
        buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47 &&
        buf[4] === 0x0D && buf[5] === 0x0A && buf[6] === 0x1A && buf[7] === 0x0A;

      if (isPng) {
        const base64 = btoa(String.fromCharCode(...buf));
        console.log('[WppClient] ✓ QR found as RAW PNG');
        return { base64: `data:image/png;base64,${base64}` };
      }
    } catch (e) {
      console.log(`[WppClient] RAW PNG QR attempt failed: ${e}`);
    }

    return null;
  }

  async logout(bearer: string): Promise<void> {
    const url = `${this.base}/api/${encodeURIComponent(this.session)}/logout-session`;
    console.log('[WppClient] Logging out session...');
    
    await this._fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${bearer}` },
    });
    
    console.log('[WppClient] ✓ Logged out');
  }

  async ensureSessionWithQr(webhookUrl?: string): Promise<StartResult> {
    try {
      const token = await this.getToken();
      await this.startSession(token, webhookUrl);

      const deadline = Date.now() + this.pollSeconds * 1000;
      let attempts = 0;

      while (Date.now() < deadline) {
        attempts++;
        console.log(`[WppClient] Polling status... attempt ${attempts}`);

        // Check status
        let st: any = null;
        try {
          st = await this.getStatus(token);
          const status = String(st?.status || st?.state || '').toUpperCase();
          console.log(`[WppClient] Status: ${status}`);

          if (status === 'CONNECTED') {
            console.log('[WppClient] ✓ Session connected');
            return { state: 'connected' };
          }
        } catch (e) {
          console.log(`[WppClient] Status check failed: ${e}`);
        }

        // Try to get QR
        const qr = await this.getQr(token).catch(() => null);
        if (qr?.base64) {
          console.log('[WppClient] ✓ QR code retrieved');
          return { state: 'qr', base64: qr.base64 };
        }

        // Wait before next attempt
        await new Promise(r => setTimeout(r, 2000));
      }

      console.log('[WppClient] ⚠ Timeout waiting for QR/connection');
      return { state: 'timeout' };
    } catch (error: any) {
      console.error('[WppClient] Error:', error);
      return { state: 'error', message: error.message };
    }
  }
}
