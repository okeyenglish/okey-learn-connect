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
 * Vertex AI Adapter (future implementation)
 * Direct integration with Google Cloud Vertex AI
 */
export class VertexAdapter implements AIAdapter {
  private projectId: string;
  private region: string;

  constructor(projectId: string, region: string = 'us-central1') {
    this.projectId = projectId;
    this.region = region;
  }

  async generateText(params: GenerateTextParams): Promise<string> {
    throw new Error('Vertex AI adapter not yet implemented. Use gateway provider.');
  }

  async generateImage(params: GenerateImageParams): Promise<string> {
    throw new Error('Vertex AI adapter not yet implemented. Use gateway provider.');
  }

  async streamText(params: StreamTextParams): Promise<ReadableStream> {
    throw new Error('Vertex AI adapter not yet implemented. Use gateway provider.');
  }

  async generateEmbedding(text: string): Promise<number[]> {
    throw new Error('Vertex AI adapter not yet implemented. Use gateway provider.');
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
      if (!projectId) {
        throw new Error('GCP_PROJECT_ID is required for vertex provider');
      }
      return new VertexAdapter(projectId, region);
    }
    
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}
