/**
 * AI Adapter for flexible provider switching
 * Currently supports:
 * - Lovable AI Gateway (default) - uses google/gemini models
 * - Vertex AI (future) - direct Google Cloud integration
 */

export type AIProvider = 'gateway' | 'vertex';

export interface AIAdapterConfig {
  provider: AIProvider;
  apiKey?: string;
  projectId?: string;
  region?: string;
}

export interface GenerateTextParams {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  model?: string;
}

export interface GenerateImageParams {
  prompt: string;
  width?: number;
  height?: number;
}

export interface StreamTextParams {
  messages: Array<{ role: string; content: string }>;
  systemPrompt?: string;
  maxTokens?: number;
  model?: string;
}

export interface AIAdapter {
  generateText(params: GenerateTextParams): Promise<string>;
  generateImage(params: GenerateImageParams): Promise<string>; // returns base64
  streamText(params: StreamTextParams): Promise<ReadableStream>;
  generateEmbedding(text: string): Promise<number[]>;
}

/**
 * Lovable AI Gateway Adapter (default)
 * Uses the Lovable AI Gateway with Google Gemini models
 */
export class GatewayAdapter implements AIAdapter {
  private apiKey: string;
  private baseUrl = 'https://ai.gateway.lovable.dev/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateText(params: GenerateTextParams): Promise<string> {
    const { prompt, systemPrompt, maxTokens = 2000, model = 'google/gemini-2.5-flash' } = params;

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        max_completion_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gateway error (${response.status}): ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  async generateImage(params: GenerateImageParams): Promise<string> {
    const { prompt, width = 1024, height = 1024 } = params;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        messages: [{ role: 'user', content: prompt }],
        modalities: ['image', 'text'],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gateway error (${response.status}): ${error}`);
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageUrl) {
      throw new Error('No image generated');
    }

    return imageUrl;
  }

  async streamText(params: StreamTextParams): Promise<ReadableStream> {
    const { messages, systemPrompt, maxTokens = 2000, model = 'google/gemini-2.5-flash' } = params;

    const fullMessages = systemPrompt 
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: fullMessages,
        max_completion_tokens: maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gateway error (${response.status}): ${error}`);
    }

    return response.body!;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gateway error (${response.status}): ${error}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }
}

/**
 * Vertex AI Adapter
 * Direct integration with Google Cloud Vertex AI
 */
export class VertexAdapter implements AIAdapter {
  private projectId: string;
  private region: string;
  private credentials: any;
  private accessToken?: string;
  private tokenExpiry?: number;

  constructor(projectId: string, region: string = 'us-central1', credentialsJson?: string) {
    this.projectId = projectId;
    this.region = region;
    if (credentialsJson) {
      this.credentials = JSON.parse(credentialsJson);
    }
  }

  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!this.credentials) {
      throw new Error('Google credentials not configured');
    }

    // Create JWT assertion
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const claimSet = {
      iss: this.credentials.client_email,
      sub: this.credentials.client_email,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
      scope: 'https://www.googleapis.com/auth/cloud-platform'
    };

    // Encode header and claim set
    const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const encodedClaimSet = btoa(JSON.stringify(claimSet)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const signatureInput = `${encodedHeader}.${encodedClaimSet}`;

    // Sign with private key using Web Crypto API
    const privateKeyPem = this.credentials.private_key;
    const pemContents = privateKeyPem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, '');
    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
    
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryDer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      new TextEncoder().encode(signatureInput)
    );

    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    const jwt = `${signatureInput}.${encodedSignature}`;

    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`OAuth token error: ${error}`);
    }

    const tokenData = await tokenResponse.json();
    this.accessToken = tokenData.access_token;
    this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000) - 60000; // 1 min buffer

    return this.accessToken;
  }

  async generateText(params: GenerateTextParams): Promise<string> {
    const { prompt, systemPrompt, maxTokens = 2000, model = 'gemini-2.5-flash' } = params;
    const token = await this.getAccessToken();

    const url = `https://${this.region}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.region}/publishers/google/models/${model}:generateContent`;

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'user', parts: [{ text: systemPrompt }] });
      messages.push({ role: 'model', parts: [{ text: 'Понял, буду следовать этим инструкциям.' }] });
    }
    messages.push({ role: 'user', parts: [{ text: prompt }] });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: messages,
        generationConfig: {
          maxOutputTokens: maxTokens,
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vertex AI error (${response.status}): ${error}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  async generateImage(params: GenerateImageParams): Promise<string> {
    const { prompt, width = 1024, height = 1024 } = params;
    const token = await this.getAccessToken();

    const url = `https://${this.region}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.region}/publishers/google/models/gemini-2.5-flash-image:generateContent`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'image/png'
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vertex AI error (${response.status}): ${error}`);
    }

    const data = await response.json();
    const imageData = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data);
    
    if (!imageData) {
      throw new Error('No image data in response');
    }

    return `data:${imageData.inlineData.mimeType || 'image/png'};base64,${imageData.inlineData.data}`;
  }

  async streamText(params: StreamTextParams): Promise<ReadableStream> {
    const { messages, systemPrompt, maxTokens = 2000, model = 'gemini-2.5-flash' } = params;
    const token = await this.getAccessToken();

    const url = `https://${this.region}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.region}/publishers/google/models/${model}:streamGenerateContent`;

    const contents = [];
    if (systemPrompt) {
      contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
      contents.push({ role: 'model', parts: [{ text: 'Понял.' }] });
    }
    contents.push(...messages.map(m => ({ 
      role: m.role === 'assistant' ? 'model' : 'user', 
      parts: [{ text: m.content }] 
    })));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        generationConfig: { maxOutputTokens: maxTokens }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vertex AI error (${response.status}): ${error}`);
    }

    return response.body!;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const token = await this.getAccessToken();

    const url = `https://${this.region}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.region}/publishers/google/models/text-embedding-004:predict`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [{ content: text }]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vertex AI error (${response.status}): ${error}`);
    }

    const data = await response.json();
    return data.predictions?.[0]?.embeddings?.values || [];
  }
}

/**
 * Factory function to create AI adapter based on environment
 */
export function createAIAdapter(config?: Partial<AIAdapterConfig>): AIAdapter {
  const provider = (Deno.env.get('AI_PROVIDER') || config?.provider || 'gateway') as AIProvider;

  switch (provider) {
    case 'gateway': {
      const apiKey = Deno.env.get('LOVABLE_API_KEY') || config?.apiKey;
      if (!apiKey) {
        throw new Error('LOVABLE_API_KEY is required for gateway provider');
      }
      return new GatewayAdapter(apiKey);
    }
    
    case 'vertex': {
      const projectId = Deno.env.get('GCP_PROJECT_ID') || config?.projectId;
      const region = Deno.env.get('GCP_REGION') || config?.region || 'us-central1';
      const credentialsJson = Deno.env.get('GOOGLE_APPLICATION_CREDENTIALS_JSON');
      
      if (!projectId) {
        throw new Error('GCP_PROJECT_ID is required for vertex provider');
      }
      if (!credentialsJson) {
        throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON is required for vertex provider');
      }
      
      return new VertexAdapter(projectId, region, credentialsJson);
    }
    
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}
