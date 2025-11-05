// Normalize session name: remove dashes, spaces, transliterate cyrillic
function normalizeSessionName(raw: string, fallback = 'default'): string {
  const mapRu: Record<string, string> = {
    а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',
    н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sch',
    ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya'
  };
  
  let s = (raw || '').trim().toLowerCase();
  // Remove dashes and spaces
  s = s.replace(/[-\s]/g, '');
  // Transliterate cyrillic
  s = s.replace(/[а-яё]/g, ch => mapRu[ch] ?? '');
  // Keep only [a-z0-9_.]
  s = s.replace(/[^a-z0-9_.]/g, '');
  // Min length 3
  const allowedRe = /^[a-z0-9_.]{3,64}$/;
  return allowedRe.test(s) ? s : fallback;
}

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
  private normalizedSession: string;
  private secret: string;
  private timeoutMs: number;
  private pollSeconds: number;

  constructor(o: WppClientOptions) {
    this.base = o.baseUrl.replace(/\/+$/, '');
    this.session = o.session;
    this.normalizedSession = normalizeSessionName(o.session);
    this.secret = o.secret;
    this.timeoutMs = o.timeoutMs ?? 10_000;
    this.pollSeconds = o.pollSeconds ?? 30;
    console.log(`[WppClient] Session: "${this.session}" → Normalized: "${this.normalizedSession}"`);
  }

  getNormalizedSession(): string {
    return this.normalizedSession;
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
    const pathA = `${this.base}/api/${encodeURIComponent(this.normalizedSession)}/${encodeURIComponent(this.secret)}/generate-token`;
    const pathB = `${this.base}/api/${encodeURIComponent(this.normalizedSession)}/generate-token`;
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
    const url = `${this.base}/api/${encodeURIComponent(this.normalizedSession)}/start-session`;
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
    const url = `${this.base}/api/${encodeURIComponent(this.normalizedSession)}/status-session`;
    return await this._fetch(url, {
      expected: 'json',
      headers: { 'Authorization': `Bearer ${bearer}` },
    });
  }

  async getQr(bearer: string): Promise<{ base64: string } | null> {
    console.log('[WppClient] Fetching QR code...');

    try {
      // 1) Reliable path: get QR from status-session
      const statusUrl = `${this.base}/api/${encodeURIComponent(this.normalizedSession)}/status-session`;
      console.log('[WppClient] Trying status-session endpoint...');
      
      const statusData = await this._fetch(statusUrl, {
        expected: 'json',
        headers: { 
          'Authorization': `Bearer ${bearer}`,
          'Accept': 'application/json'
        },
      });

      if (statusData && typeof statusData === 'object') {
        const st = statusData as any;
        if (st.qrcode) {
          const base64 = st.qrcode.startsWith('data:image') ? st.qrcode : `data:image/png;base64,${st.qrcode}`;
          console.log('[WppClient] ✓ QR retrieved from status-session');
          return { base64 };
        }
      }

      // 2) Fallback: try legacy qr-code endpoint
      console.log('[WppClient] Trying legacy qr-code endpoint...');
      const qrUrl = `${this.base}/session/${encodeURIComponent(this.normalizedSession)}/qr-code`;
      
      const qrData = await this._fetch(qrUrl, {
        expected: 'json',
        headers: { 'Authorization': `Bearer ${bearer}` },
      });

      if (qrData && typeof qrData === 'object') {
        const q = qrData as any;
        const data = q.qrcode || q.qrCode || q.qr;
        if (data) {
          const base64 = data.startsWith('data:image') ? data : `data:image/png;base64,${data}`;
          console.log('[WppClient] ✓ QR retrieved from legacy endpoint');
          return { base64 };
        }
      }
      
      console.log('[WppClient] ⚠ QR not available in any endpoint');
      return null;
    } catch (e) {
      console.log(`[WppClient] ✗ QR request failed: ${e}`);
      return null;
    }
  }

  async logout(bearer: string): Promise<void> {
    const url = `${this.base}/api/${encodeURIComponent(this.normalizedSession)}/logout-session`;
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
