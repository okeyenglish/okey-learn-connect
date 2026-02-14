/**
 * Model Router — Model Cascade для AI-запросов
 * 
 * Архитектура:
 *   80% → cheap (Gemini Flash Lite) — batch, tagging, classification
 *   18% → mid   (GPT-4o mini / Gemini Flash) — realtime CRM, suggestions
 *    2% → smart (GPT-5 mini) — deep analytics, complex reasoning
 * 
 * Все вызовы идут через Lovable AI Gateway или OpenAI напрямую.
 */

export type ModelTier = 'cheap' | 'mid' | 'smart';

export type TaskType = 
  | 'batch_classification'    // массовый tagging/intent
  | 'batch_segmentation'      // разбивка диалогов
  | 'batch_faq'               // извлечение FAQ
  | 'realtime_classify'       // realtime классификация стадии
  | 'realtime_suggest'        // подсказки менеджеру
  | 'realtime_response'       // генерация ответа
  | 'deep_analytics'          // глубокий анализ паттернов
  | 'deep_summarize'          // суммаризация за период
  | 'coaching';               // коучинг-рекомендации

interface ModelConfig {
  gateway: string;           // 'lovable' | 'openai'
  model: string;
  maxTokens: number;
  temperature: number;
}

const TIER_MAP: Record<ModelTier, ModelConfig> = {
  cheap: {
    gateway: 'lovable',
    model: 'google/gemini-2.5-flash-lite',
    maxTokens: 500,
    temperature: 0.1,
  },
  mid: {
    gateway: 'lovable',
    model: 'google/gemini-2.5-flash',
    maxTokens: 1000,
    temperature: 0.2,
  },
  smart: {
    gateway: 'lovable',
    model: 'google/gemini-2.5-pro',
    maxTokens: 2000,
    temperature: 0.3,
  },
};

const TASK_TO_TIER: Record<TaskType, ModelTier> = {
  batch_classification: 'cheap',
  batch_segmentation: 'cheap',
  batch_faq: 'cheap',
  realtime_classify: 'cheap',
  realtime_suggest: 'mid',
  realtime_response: 'mid',
  deep_analytics: 'smart',
  deep_summarize: 'smart',
  coaching: 'mid',
};

export interface ModelRouterRequest {
  task: TaskType;
  messages: Array<{ role: string; content: string }>;
  overrideModel?: string;
  overrideMaxTokens?: number;
  overrideTemperature?: number;
}

export interface ModelRouterResponse {
  content: string;
  model: string;
  tier: ModelTier;
  tokensUsed?: number;
  latencyMs: number;
}

/**
 * Route AI request to the appropriate model based on task type
 */
export async function routeModelRequest(req: ModelRouterRequest): Promise<ModelRouterResponse> {
  const tier = TASK_TO_TIER[req.task];
  const config = TIER_MAP[tier];
  
  const model = req.overrideModel || config.model;
  const maxTokens = req.overrideMaxTokens || config.maxTokens;
  const temperature = req.overrideTemperature ?? config.temperature;
  
  const startTime = Date.now();
  
  // Always prefer Lovable AI Gateway
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  
  let apiUrl: string;
  let apiKey: string;
  let actualModel = model;
  
  if (lovableKey && config.gateway === 'lovable') {
    apiUrl = 'https://ai.gateway.lovable.dev/v1/chat/completions';
    apiKey = lovableKey;
  } else if (openaiKey) {
    apiUrl = 'https://api.openai.com/v1/chat/completions';
    apiKey = openaiKey;
    // Map Gemini models to OpenAI equivalents when using OpenAI directly
    if (actualModel.startsWith('google/')) {
      actualModel = tier === 'cheap' ? 'gpt-4o-mini' 
                  : tier === 'mid' ? 'gpt-4o-mini' 
                  : 'gpt-4o';
    }
  } else {
    throw new Error('No AI API key configured (LOVABLE_API_KEY or OPENAI_API_KEY)');
  }
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: actualModel,
      messages: req.messages,
      max_tokens: maxTokens,
      temperature,
    }),
  });
  
  if (!response.ok) {
    const errText = await response.text();
    console.error(`[model-router] ${tier}/${actualModel} error:`, response.status, errText);
    
    // Rate limit / payment errors — propagate
    if (response.status === 429 || response.status === 402) {
      throw new Error(`AI API error ${response.status}: ${errText}`);
    }
    
    // For other errors on cheap tier, try fallback to mid
    if (tier === 'cheap') {
      console.log('[model-router] Falling back from cheap to mid tier');
      return routeModelRequest({ ...req, task: 'realtime_suggest' });
    }
    
    throw new Error(`AI API error: ${response.status}`);
  }
  
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  const latencyMs = Date.now() - startTime;
  
  console.log(`[model-router] ${tier}/${actualModel}: ${latencyMs}ms, ${content.length} chars`);
  
  return {
    content,
    model: actualModel,
    tier,
    tokensUsed: data.usage?.total_tokens,
    latencyMs,
  };
}

/**
 * Get embedding via Lovable Gateway or OpenAI
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  
  const apiUrl = lovableKey 
    ? 'https://ai.gateway.lovable.dev/v1/embeddings'
    : 'https://api.openai.com/v1/embeddings';
  const apiKey = lovableKey || openaiKey;
  
  if (!apiKey) throw new Error('No AI API key for embeddings');
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000),
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Embedding error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Normalize text for hash dedup (same logic as SQL function)
 */
export function normalizeTextForHash(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[^\u0400-\u04FFa-z0-9\s]/g, '')  // keep cyrillic, latin, digits, spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * MD5 hash of normalized text
 * Uses Web Crypto API available in Deno
 */
export async function hashText(text: string): Promise<string> {
  const normalized = normalizeTextForHash(text);
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('MD5', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
