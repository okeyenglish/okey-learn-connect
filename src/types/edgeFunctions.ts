/**
 * Centralized Edge Function response types
 * 
 * This file provides unified TypeScript interfaces for all Edge Function API contracts.
 * Import these types to ensure consistent typing across the codebase.
 */

// ============================================================================
// Base Response Types
// ============================================================================

/**
 * Standard success/error response pattern used by most edge functions
 */
export interface BaseEdgeFunctionResponse {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Extended error response with additional context
 */
export interface DetailedErrorResponse extends BaseEdgeFunctionResponse {
  success: false;
  errorType?: string;
  hint?: string;
  details?: {
    message?: string;
    code?: string;
    [key: string]: unknown;
  };
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> extends BaseEdgeFunctionResponse {
  data: T[];
  total?: number;
  page?: number;
  pageSize?: number;
  hasMore?: boolean;
}

// ============================================================================
// Messenger Responses (WhatsApp, MAX, Telegram)
// ============================================================================

/**
 * Common message send response
 */
export interface MessageSendResponse extends BaseEdgeFunctionResponse {
  messageId?: string;
  timestamp?: string;
}

/**
 * MAX Messenger responses
 */
export interface MaxSendResponse extends MessageSendResponse {
  chatId?: string;
}

export interface MaxEditResponse extends BaseEdgeFunctionResponse {}

export interface MaxDeleteResponse extends BaseEdgeFunctionResponse {}

export interface MaxCheckAvailabilityResponse extends BaseEdgeFunctionResponse {
  existsWhatsapp?: boolean;
  chatId?: string;
}

export interface MaxAvatarResponse extends BaseEdgeFunctionResponse {
  urlAvatar?: string;
  available?: boolean;
}

export interface MaxContact {
  id: string;
  name?: string;
  phone?: string;
}

export interface MaxContactsResponse extends BaseEdgeFunctionResponse {
  contacts?: MaxContact[];
}

export interface MaxContactInfoResponse extends BaseEdgeFunctionResponse {
  name?: string;
  phone?: string;
  [key: string]: unknown;
}

/**
 * WhatsApp responses
 */
export interface WhatsAppSendResponse extends MessageSendResponse {
  idMessage?: string;
  chatId?: string;
}

export interface WhatsAppCheckResponse extends BaseEdgeFunctionResponse {
  existsWhatsapp?: boolean;
  chatId?: string;
}

export interface WhatsAppAvatarResponse extends BaseEdgeFunctionResponse {
  urlAvatar?: string;
  available?: boolean;
}

export interface WhatsAppFileDownloadResponse extends BaseEdgeFunctionResponse {
  downloadUrl?: string;
  mimeType?: string;
  fileName?: string;
}

export interface WhatsAppSessionResponse extends BaseEdgeFunctionResponse {
  qrCode?: string;
  status?: 'authorized' | 'not_authorized' | 'connecting' | 'timeout' | 'error';
  instanceId?: string;
}

/**
 * Telegram (Wappi) responses
 */
export interface TelegramSendResponse extends MessageSendResponse {}

export interface TelegramInstanceState {
  status: 'authorized' | 'not_authorized' | 'error' | 'unknown';
  phone?: string;
  lastError?: string;
}

export interface TelegramSettingsResponse extends BaseEdgeFunctionResponse {
  settings: {
    id: string;
    profileId: string;
    apiToken: string;
    webhookUrl?: string;
    isEnabled: boolean;
  } | null;
  instanceState: TelegramInstanceState | null;
}

// ============================================================================
// AI & Generation Responses
// ============================================================================

/**
 * GPT/AI chat response
 */
export interface AIChatResponse extends BaseEdgeFunctionResponse {
  response?: string;
  answer?: string;
  tokensUsed?: number;
  model?: string;
}

/**
 * Image generation response
 */
export interface ImageGenerationResponse extends BaseEdgeFunctionResponse {
  imageUrl?: string;
  width?: number;
  height?: number;
}

/**
 * Voice assistant response
 */
export interface VoiceAssistantResponse extends BaseEdgeFunctionResponse {
  text?: string;
  action?: string;
  audioUrl?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Transcription response
 */
export interface TranscriptionResponse extends BaseEdgeFunctionResponse {
  text?: string;
  duration?: number;
  language?: string;
}

/**
 * Call summary generation response
 */
export interface CallSummaryResponse extends BaseEdgeFunctionResponse {
  summary?: string;
  keyPoints?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
}

// ============================================================================
// Integration Import Responses (Salebot, Holihope)
// ============================================================================

/**
 * Salebot import batch response
 */
export interface SalebotImportBatchResponse extends BaseEdgeFunctionResponse {
  skipped?: boolean;
  apiLimitReached?: boolean;
  totalClients?: number;
  messagesImported?: number;
  processedClients?: number;
  newMessages?: number;
  totalNewMessages?: number;
  completed?: boolean;
}

/**
 * Salebot fill IDs response
 */
export interface SalebotFillIdsResponse extends BaseEdgeFunctionResponse {
  totalProcessed?: number;
  totalMatched?: number;
  processedThisBatch?: number;
  matchedThisBatch?: number;
}

/**
 * Salebot stop response
 */
export interface SalebotStopResponse extends BaseEdgeFunctionResponse {}

/**
 * CSV import response
 */
export interface CsvImportResponse extends BaseEdgeFunctionResponse {
  imported?: number;
  skipped?: number;
  updated?: number;
  created?: number;
  errors?: string[] | number;
}

/**
 * Holihope sync response
 */
export interface HolihopeSyncResponse extends BaseEdgeFunctionResponse {
  step?: number;
  imported?: number;
  updated?: number;
  skipped?: number;
}

// ============================================================================
// Payment & Financial Responses
// ============================================================================

/**
 * T-Bank payment init response
 */
export interface TBankInitResponse extends BaseEdgeFunctionResponse {
  paymentUrl?: string;
  paymentId?: string;
  orderId?: string;
  amount?: number;
}

/**
 * Payment notification response
 */
export interface PaymentNotificationResponse extends BaseEdgeFunctionResponse {
  sent?: number;
  failed?: number;
  skipped?: number;
}

// ============================================================================
// System & Health Responses
// ============================================================================

/**
 * Health check response
 */
export interface HealthCheckResponse extends BaseEdgeFunctionResponse {
  checked_at: string;
  duration_ms?: number;
  endpoints?: HealthCheckEndpoint[];
  summary?: {
    total: number;
    healthy: number;
    unhealthy: number;
  };
}

export interface HealthCheckEndpoint {
  name: string;
  status: 'healthy' | 'unhealthy' | 'timeout' | 'skipped';
  responseTime?: number;
  error?: string;
}

/**
 * Push notification response
 */
export interface PushNotificationResponse extends BaseEdgeFunctionResponse {
  sent?: number;
  failed?: number;
  errors?: string[];
}

// ============================================================================
// Video Conferencing (BBB) Responses
// ============================================================================

/**
 * BBB meeting response
 */
export interface BBBMeetingResponse extends BaseEdgeFunctionResponse {
  meetingId?: string;
  joinUrl?: string;
  attendeePassword?: string;
  moderatorPassword?: string;
  running?: boolean;
}

// ============================================================================
// Phone (OnlinePBX) Responses
// ============================================================================

/**
 * OnlinePBX call response
 */
export interface OnlinePBXCallResponse extends BaseEdgeFunctionResponse {
  callId?: string;
  status?: string;
}

/**
 * OnlinePBX call logs response
 */
export interface OnlinePBXLogsResponse extends BaseEdgeFunctionResponse {
  calls?: OnlinePBXCallRecord[];
  total?: number;
}

export interface OnlinePBXCallRecord {
  id: string;
  from: string;
  to: string;
  direction: 'incoming' | 'outgoing';
  duration?: number;
  status: string;
  recordingUrl?: string;
  timestamp: string;
}

// ============================================================================
// Webhook Responses
// ============================================================================

/**
 * Generic webhook response
 */
export interface WebhookResponse extends BaseEdgeFunctionResponse {
  processed?: boolean;
  eventType?: string;
}

/**
 * Webhook proxy response
 */
export interface WebhookProxyResponse extends BaseEdgeFunctionResponse {
  statusCode?: number;
  body?: unknown;
}

// ============================================================================
// Content & SEO Responses
// ============================================================================

/**
 * Content indexing response
 */
export interface ContentIndexResponse extends BaseEdgeFunctionResponse {
  indexed?: number;
  updated?: number;
  failed?: number;
}

/**
 * SEO keywords response
 */
export interface SEOKeywordsResponse extends BaseEdgeFunctionResponse {
  keywords?: string[];
  clusters?: SEOKeywordCluster[];
}

export interface SEOKeywordCluster {
  id: string;
  name: string;
  keywords: string[];
  volume?: number;
}

// ============================================================================
// AI Provider Settings Responses
// ============================================================================

/**
 * AI provider configuration response
 */
export interface AIProviderResponse extends BaseEdgeFunctionResponse {
  provider: string;
  source: 'env' | 'database';
  hasVertexSecrets: boolean;
  availableProviders: AIProviderOption[];
}

export interface AIProviderOption {
  value: string;
  label: string;
  description: string;
  available: boolean;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if response is an error
 */
export function isErrorResponse(response: BaseEdgeFunctionResponse): response is DetailedErrorResponse {
  return response.success === false;
}

/**
 * Type guard to check if response has detailed error info
 */
export function hasDetailedError(response: unknown): response is DetailedErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    (response as { success: unknown }).success === false &&
    ('errorType' in response || 'details' in response || 'hint' in response)
  );
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Generic Edge Function invocation result
 */
export type EdgeFunctionResult<T extends BaseEdgeFunctionResponse> = 
  | { data: T; error: null }
  | { data: null; error: Error };

/**
 * Async Edge Function handler type
 */
export type EdgeFunctionHandler<TRequest, TResponse extends BaseEdgeFunctionResponse> = (
  request: TRequest
) => Promise<TResponse>;
