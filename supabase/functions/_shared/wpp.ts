/**
 * WPP Platform SDK for msg.academyos.ru
 * 
 * New API architecture:
 * - Authentication via POST /auth/token with { apiKey }
 * - Account-based (phone numbers) instead of session-based
 * - Per-organization API keys stored in messenger_integrations.settings.wppApiKey
 */

// ============================================================================
// Types
// ============================================================================

export type WppStartResult =
  | { state: 'connected' }
  | { state: 'qr'; qr: string }
  | { state: 'starting' }
  | { state: 'timeout' }
  | { state: 'error'; message: string };

export interface WppAccountStatus {
  status: 'connected' | 'starting' | 'offline' | 'qr_required';
}

export interface WppTaskResult {
  success: boolean;
  taskId?: string;
  status?: string;
  error?: string;
}

export interface WppMsgClientOptions {
  baseUrl: string;
  apiKey?: string;       // Для получения JWT (если jwtToken не передан)
  jwtToken?: string;     // Прямой JWT (приоритет)
  jwtExpiresAt?: number; // Unix timestamp истечения JWT
  timeoutMs?: number;
}

// ============================================================================
// New WPP Platform Client (msg.academyos.ru)
// ============================================================================

export class WppMsgClient {
  private baseUrl: string;
  private apiKey: string | undefined;
  private timeoutMs: number;
  private cachedToken: string | null = null;
  private _tokenExpiry: number = 0;

  constructor(options: WppMsgClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    
    // Если передан готовый JWT токен - использовать его
    if (options.jwtToken) {
      this.cachedToken = options.jwtToken;
      this._tokenExpiry = options.jwtExpiresAt || (Date.now() + 3600 * 1000);
      console.log(`[WppMsgClient] Initialized with pre-loaded JWT (expires: ${new Date(this._tokenExpiry).toISOString()})`);
    } else {
      console.log(`[WppMsgClient] Initialized for ${this.baseUrl}`);
    }
  }

  // Публичный геттер для получения expiry токена
  get tokenExpiry(): number {
    return this._tokenExpiry;
  }

  private maskKey(key: string): string {
    if (key.length < 8) return '***';
    return `${key.substring(0, 4)}***${key.slice(-4)}`;
  }

  private async _fetch(
    url: string,
    init: RequestInit = {},
    authRequired = true,
    _isRetry = false  // Флаг для предотвращения бесконечного retry
  ): Promise<any> {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), this.timeoutMs);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(init.headers as Record<string, string> || {}),
      };

      if (authRequired) {
        const token = await this.getToken();
        headers['Authorization'] = `Bearer ${token}`;
      }

      console.log(`[WppMsgClient] ${init.method || 'GET'} ${url}`);

      const res = await fetch(url, {
        ...init,
        headers,
        signal: ac.signal,
      });

      console.log(`[WppMsgClient] Response: ${res.status} ${res.statusText}`);

      const text = await res.text();
      
      if (!res.ok) {
        // Если 401 и это не retry - попробовать обновить токен и повторить
        if (res.status === 401 && authRequired && !_isRetry) {
          console.log('[WppMsgClient] Got 401, clearing token and retrying...');
          this.cachedToken = null;
          this._tokenExpiry = 0;
          clearTimeout(t);
          return this._fetch(url, init, authRequired, true);
        }
        
        console.error(`[WppMsgClient] Error body: ${text.substring(0, 500)}`);
        throw new Error(`HTTP ${res.status}: ${text.substring(0, 200)}`);
      }

      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    } finally {
      clearTimeout(t);
    }
  }

  // ==========================================================================
  // Authentication
  // ==========================================================================

  /**
   * Get JWT token from API
   * POST /auth/token { apiKey }
   */
  async getToken(): Promise<string> {
    // Return cached token if still valid (with 60s buffer)
    if (this.cachedToken && Date.now() < this._tokenExpiry - 60_000) {
      return this.cachedToken;
    }

    if (!this.apiKey) {
      throw new Error('Cannot refresh token: apiKey not provided');
    }

    const url = `${this.baseUrl}/auth/token`;
    console.log(`[WppMsgClient] Getting token from ${url}`);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: this.apiKey }),
    });

    if (!res.ok) {
      const text = await res.text();
      // Специальная обработка невалидного API key
      if (text.includes('Invalid API key') || res.status === 401) {
        throw new Error('INVALID_API_KEY: API key expired or invalid. Use force_recreate to generate new session.');
      }
      throw new Error(`Failed to get token: ${res.status} ${text}`);
    }

    const data = await res.json();
    
    if (!data.token) {
      throw new Error('Token response missing token field');
    }

    this.cachedToken = data.token;
    // Assume token valid for 1 hour if not specified
    this._tokenExpiry = Date.now() + (data.expiresIn || 3600) * 1000;
    
    console.log(`[WppMsgClient] ✓ Token obtained, expires: ${new Date(this._tokenExpiry).toISOString()}`);
    return this.cachedToken;
  }

  /**
   * Static method to get initial JWT token after creating a client
   * Used immediately after createClient() to save the token in DB
   */
  static async getInitialToken(baseUrl: string, apiKey: string): Promise<{ token: string; expiresAt: number }> {
    const url = `${baseUrl.replace(/\/+$/, '')}/auth/token`;
    console.log(`[WppMsgClient] Getting initial token from ${url}`);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to get initial token: ${res.status} ${text}`);
    }

    const data = await res.json();
    
    if (!data.token) {
      throw new Error('Token response missing token field');
    }

    const expiresAt = Date.now() + (data.expiresIn || 3600) * 1000;
    console.log(`[WppMsgClient] ✓ Initial token obtained, expires: ${new Date(expiresAt).toISOString()}`);
    
    return { token: data.token, expiresAt };
  }

  /**
   * Create new client on WPP Platform (server-to-server)
   * POST /api/integrations/wpp/create
   * Authorization: Bearer <WPP_SECRET>
   * Body: { organizationId }
   * Returns { apiKey, session, status }
   */
  static async createClient(
    baseUrl: string, 
    wppSecret: string,
    organizationId: string
  ): Promise<{ apiKey: string; session: string; status: string }> {
    const url = `${baseUrl.replace(/\/+$/, '')}/api/integrations/wpp/create`;
    console.log(`[WppMsgClient] Creating client via ${url} for org ${organizationId}`);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${wppSecret}`,
      },
      body: JSON.stringify({ organizationId }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to create WPP client: ${res.status} ${text}`);
    }

    const data = await res.json();
    
    if (!data.apiKey) {
      throw new Error('WPP client creation response missing apiKey field');
    }

    console.log(`[WppMsgClient] ✓ Client created, session: ${data.session}`);
    return {
      apiKey: data.apiKey,
      session: data.session,
      status: data.status || 'starting',
    };
  }

  // ==========================================================================
  // Account Management
  // ==========================================================================

  /**
   * Start a WhatsApp account
   * POST /api/accounts/start { number }
   */
  async startAccount(number: string): Promise<WppStartResult> {
    const url = `${this.baseUrl}/api/accounts/start`;
    
    try {
      const result = await this._fetch(url, {
        method: 'POST',
        body: JSON.stringify({ number }),
      });

      console.log(`[WppMsgClient] Start account result:`, JSON.stringify(result).substring(0, 300));

      // Check if QR is needed
      if (result.qr) {
        return { state: 'qr', qr: result.qr };
      }

      // Check status
      const status = (result.status || result.state || '').toLowerCase();
      if (status === 'connected' || status === 'ready') {
        return { state: 'connected' };
      }

      if (status === 'starting' || status === 'pending') {
        return { state: 'starting' };
      }

      return { state: 'starting' };
    } catch (error: any) {
      console.error(`[WppMsgClient] Start account error:`, error);
      return { state: 'error', message: error.message };
    }
  }

  /**
   * Get account status
   * GET /api/accounts/{number}/status
   */
  async getAccountStatus(number: string): Promise<WppAccountStatus> {
    const url = `${this.baseUrl}/api/accounts/${encodeURIComponent(number)}/status`;
    
    try {
      const result = await this._fetch(url, { method: 'GET' });
      const status = (result.status || 'offline').toLowerCase();
      
      return {
        status: status === 'connected' ? 'connected' : 
                status === 'starting' ? 'starting' : 
                status === 'offline' ? 'offline' : 'qr_required'
      };
    } catch (error) {
      console.error(`[WppMsgClient] Get status error:`, error);
      return { status: 'offline' };
    }
  }

  /**
   * Get QR code for account
   * GET /api/accounts/{number}/qr
   */
  async getAccountQr(number: string): Promise<string | null> {
    const url = `${this.baseUrl}/api/accounts/${encodeURIComponent(number)}/qr`;
    
    try {
      const result = await this._fetch(url, { method: 'GET' });
      console.log('[WppMsgClient] QR response keys:', Object.keys(result || {}));
      
      // Поддержка разных форматов ответа
      const qr = result?.qr || result?.qrCode || result?.qrcode || result?.data?.qr || null;
      console.log('[WppMsgClient] QR extracted:', qr ? `yes (${qr.length} chars)` : 'no');
      return qr;
    } catch (error) {
      console.error(`[WppMsgClient] Get QR error:`, error);
      return null;
    }
  }

  /**
   * Stop/disconnect a session
   * POST /internal/session/{sessionId}/stop
   */
  async deleteAccount(sessionId: string): Promise<void> {
    const url = `${this.baseUrl}/internal/session/${encodeURIComponent(sessionId)}/stop`;
    
    console.log(`[WppMsgClient] Stopping session: ${sessionId}`);
    await this._fetch(url, { method: 'POST' });
    console.log(`[WppMsgClient] ✓ Session ${sessionId} stopped`);
  }

  /**
   * Set webhook for a session
   * POST /internal/session/{sessionId}/webhook
   */
  async registerWebhook(sessionId: string, webhookUrl: string): Promise<void> {
    const url = `${this.baseUrl}/internal/session/${encodeURIComponent(sessionId)}/webhook`;
    
    console.log(`[WppMsgClient] Setting webhook for session ${sessionId}: ${webhookUrl}`);
    await this._fetch(url, {
      method: 'POST',
      body: JSON.stringify({ url: webhookUrl }),
    });
    
    console.log(`[WppMsgClient] ✓ Webhook registered for session ${sessionId}`);
  }

  // ==========================================================================
  // Messaging (Custom WPP Platform API format)
  // ==========================================================================

  /**
   * Send text message
   * POST /api/messages/text { type: "text", to, text }
   */
  async sendText(account: string, to: string, text: string, priority?: 'high' | 'normal' | 'low'): Promise<WppTaskResult> {
    const url = `${this.baseUrl}/api/messages/text`;
    
    const result = await this._fetch(url, {
      method: 'POST',
      body: JSON.stringify({ 
        type: 'text',
        to, 
        text,
      }),
    });

    return {
      success: result.status !== 'error',
      taskId: result.taskId || result.id,
      status: result.status,
      error: result.message,
    };
  }

  /**
   * Send image message
   * POST /api/messages/image { type: "image", to, url, caption }
   */
  async sendImage(account: string, to: string, imageUrl: string, caption?: string): Promise<WppTaskResult> {
    const url = `${this.baseUrl}/api/messages/image`;
    
    const result = await this._fetch(url, {
      method: 'POST',
      body: JSON.stringify({ 
        type: 'image',
        to, 
        url: imageUrl,
        caption: caption || '',
      }),
    });

    return {
      success: result.status !== 'error',
      taskId: result.taskId || result.id,
      status: result.status,
      error: result.message,
    };
  }

  /**
   * Send video message
   * POST /api/messages/file { type: "file", to, url, filename }
   */
  async sendVideo(account: string, to: string, videoUrl: string, caption?: string): Promise<WppTaskResult> {
    const url = `${this.baseUrl}/api/messages/file`;
    
    const result = await this._fetch(url, {
      method: 'POST',
      body: JSON.stringify({ 
        type: 'file',
        to, 
        url: videoUrl,
        filename: 'video.mp4',
      }),
    });

    return {
      success: result.status !== 'error',
      taskId: result.taskId || result.id,
      status: result.status,
      error: result.message,
    };
  }

  /**
   * Send file/document message
   * POST /api/messages/file { type: "file", to, url, filename }
   */
  async sendFile(account: string, to: string, fileUrl: string, filename: string): Promise<WppTaskResult> {
    const url = `${this.baseUrl}/api/messages/file`;
    
    const result = await this._fetch(url, {
      method: 'POST',
      body: JSON.stringify({ 
        type: 'file',
        to, 
        url: fileUrl,
        filename,
      }),
    });

    return {
      success: result.status !== 'error',
      taskId: result.taskId || result.id,
      status: result.status,
      error: result.message,
    };
  }

  /**
   * Send audio message
   * POST /api/messages/file { type: "file", to, url, filename }
   */
  async sendAudio(account: string, to: string, audioUrl: string): Promise<WppTaskResult> {
    const url = `${this.baseUrl}/api/messages/file`;
    
    const result = await this._fetch(url, {
      method: 'POST',
      body: JSON.stringify({ 
        type: 'file',
        to, 
        url: audioUrl,
        filename: 'audio.mp3',
      }),
    });

    return {
      success: result.status !== 'error',
      taskId: result.taskId || result.id,
      status: result.status,
      error: result.message,
    };
  }

  // ==========================================================================
  // Message Management
  // ==========================================================================

  /**
   * Delete message by taskId
   * DELETE /api/messages/{taskId}
   */
  async deleteMessage(taskId: string): Promise<{ success: boolean; error?: string }> {
    const url = `${this.baseUrl}/api/messages/${encodeURIComponent(taskId)}`;
    
    try {
      await this._fetch(url, { method: 'DELETE' });
      return { success: true };
    } catch (error: any) {
      console.error(`[WppMsgClient] Delete message error:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * React to a message
   * POST /api/messages/react { to, waMessageId, emoji }
   * Supported emojis: 🔥 😂 👍 ❤️ 😡
   */
  async reactToMessage(waMessageId: string, emoji: string, to: string): Promise<{ success: boolean; error?: string }> {
    const url = `${this.baseUrl}/api/messages/react`;
    
    try {
      const result = await this._fetch(url, {
        method: 'POST',
        body: JSON.stringify({ to, waMessageId, emoji }),
      });
      return { success: result.status !== 'error', error: result.message };
    } catch (error: any) {
      console.error(`[WppMsgClient] React to message error:`, error);
      return { success: false, error: error.message };
    }
  }

  // Note: deleteMessageByWaId removed - API expects taskId, not waMessageId
  // Use deleteMessage(taskId) for deletions
  // waMessageId is only used for reactions

  /**
   * Send location message
   * POST /api/messages/location { account, to, lat, lng, name, address }
   */
  async sendLocation(
    account: string, 
    to: string, 
    lat: number, 
    lng: number, 
    name?: string, 
    address?: string
  ): Promise<WppTaskResult> {
    const url = `${this.baseUrl}/api/messages/location`;
    
    const result = await this._fetch(url, {
      method: 'POST',
      body: JSON.stringify({ account, to, lat, lng, name, address }),
    });

    return {
      success: result.success !== false,
      taskId: result.taskId,
      status: result.status,
    };
  }

  // ==========================================================================
  // High-level helpers
  // ==========================================================================

  /**
   * Ensure account is started and get QR if needed
   * Polls for QR code or connected state
   */
  async ensureAccountWithQr(number: string, webhookUrl?: string, pollSeconds = 30): Promise<WppStartResult> {
    try {
      // Start the account
      const startResult = await this.startAccount(number);
      
      if (startResult.state === 'connected') {
        if (webhookUrl) {
          await this.registerWebhook(number, webhookUrl).catch(e => 
            console.warn(`[WppMsgClient] Webhook registration failed:`, e)
          );
        }
        return startResult;
      }

      if (startResult.state === 'qr') {
        if (webhookUrl) {
          await this.registerWebhook(number, webhookUrl).catch(e => 
            console.warn(`[WppMsgClient] Webhook registration failed:`, e)
          );
        }
        return startResult;
      }

      if (startResult.state === 'error') {
        return startResult;
      }

      // Poll for status/QR
      const deadline = Date.now() + pollSeconds * 1000;
      let attempts = 0;

      while (Date.now() < deadline) {
        attempts++;
        console.log(`[WppMsgClient] Polling status... attempt ${attempts}`);
        
        await new Promise(r => setTimeout(r, 2000));

        // Check status
        const status = await this.getAccountStatus(number);
        
        if (status.status === 'connected') {
          if (webhookUrl) {
            await this.registerWebhook(number, webhookUrl).catch(e => 
              console.warn(`[WppMsgClient] Webhook registration failed:`, e)
            );
          }
          return { state: 'connected' };
        }

        // Try to get QR
        const qr = await this.getAccountQr(number);
        if (qr) {
          if (webhookUrl) {
            await this.registerWebhook(number, webhookUrl).catch(e => 
              console.warn(`[WppMsgClient] Webhook registration failed:`, e)
            );
          }
          return { state: 'qr', qr };
        }
      }

      return { state: 'timeout' };
    } catch (error: any) {
      console.error(`[WppMsgClient] ensureAccountWithQr error:`, error);
      return { state: 'error', message: error.message };
    }
  }
}

// ============================================================================
// Legacy WPP Client (for backward compatibility during migration)
// ============================================================================

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

/**
 * @deprecated Use WppMsgClient instead for new integrations
 */
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
    const url = `${this.base}/session/${encodeURIComponent(this.normalizedSession)}/start`;
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
    const url = `${this.base}/session/${encodeURIComponent(this.normalizedSession)}/status`;
    return await this._fetch(url, {
      expected: 'json',
      headers: { 'Authorization': `Bearer ${bearer}` },
    });
  }

  async getQr(bearer: string): Promise<{ base64: string } | null> {
    console.log('[WppClient] Fetching QR code...');

    try {
      // 1) Primary: get QR from status endpoint
      const statusUrl = `${this.base}/session/${encodeURIComponent(this.normalizedSession)}/status`;
      console.log('[WppClient] Checking status for QR...');
      
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
          console.log('[WppClient] ✓ QR retrieved from status');
          return { base64 };
        }
      }

      // 2) Dedicated QR endpoint
      console.log('[WppClient] Trying dedicated qr-code endpoint...');
      const qrUrl = `${this.base}/session/${encodeURIComponent(this.normalizedSession)}/qr-code`;
      
      const qrData = await this._fetch(qrUrl, {
        expected: 'json',
        headers: { 
          'Authorization': `Bearer ${bearer}`,
          'Accept': 'application/json'
        },
      });

      if (qrData && typeof qrData === 'object') {
        const q = qrData as any;
        const data = q.qrcode || q.qrCode || q.qr;
        if (data) {
          const base64 = data.startsWith('data:image') ? data : `data:image/png;base64,${data}`;
          console.log('[WppClient] ✓ QR retrieved from qr-code endpoint');
          return { base64 };
        }
      }
      
      console.log('[WppClient] ⚠ QR not available');
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
