/**
 * Shared TypeScript types for Supabase Edge Functions
 * 
 * This file provides unified interfaces for all Edge Function API contracts.
 * Import these types in Edge Functions to ensure consistent typing.
 */

// ============================================================================
// Base Response Types
// ============================================================================

/**
 * Standard success/error response pattern used by most edge functions
 */
export interface BaseResponse {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Extended error response with additional context
 */
export interface DetailedErrorResponse extends BaseResponse {
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
export interface PaginatedResponse<T> extends BaseResponse {
  data: T[];
  total?: number;
  page?: number;
  pageSize?: number;
  hasMore?: boolean;
}

// ============================================================================
// CORS Headers
// ============================================================================

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
} as const;

// ============================================================================
// Messenger Types (WhatsApp, MAX, Telegram)
// ============================================================================

/**
 * Common message send request
 */
export interface SendMessageRequest {
  clientId: string;
  text?: string;
  message?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  phoneId?: string;
  phoneNumber?: string;
}

/**
 * Common message send response
 */
export interface SendMessageResponse extends BaseResponse {
  messageId?: string;
  idMessage?: string;
  chatId?: string;
  savedMessageId?: string;
  timestamp?: string;
}

/**
 * Edit message request
 */
export interface EditMessageRequest {
  clientId: string;
  messageId: string;
  newMessage: string;
}

/**
 * Delete message request
 */
export interface DeleteMessageRequest {
  clientId: string;
  messageId: string;
}

/**
 * Check availability request
 */
export interface CheckAvailabilityRequest {
  clientId?: string;
  phoneNumber?: string;
}

/**
 * Check availability response
 */
export interface CheckAvailabilityResponse extends BaseResponse {
  existsWhatsapp?: boolean;
  chatId?: string;
  available?: boolean;
}

/**
 * Get avatar request
 */
export interface GetAvatarRequest {
  clientId: string;
}

/**
 * Get avatar response
 */
export interface GetAvatarResponse extends BaseResponse {
  urlAvatar?: string;
  available?: boolean;
}

/**
 * Get contact info request
 */
export interface GetContactInfoRequest {
  clientId: string;
}

/**
 * Get contact info response
 */
export interface GetContactInfoResponse extends BaseResponse {
  name?: string;
  phone?: string;
  [key: string]: unknown;
}

/**
 * Get contacts response
 */
export interface GetContactsResponse extends BaseResponse {
  contacts?: Contact[];
}

export interface Contact {
  id: string;
  name?: string;
  phone?: string;
}

/**
 * Messenger settings stored in DB
 */
export interface MessengerSettings {
  instanceId?: string;
  apiToken?: string;
  apiUrl?: string;
  webhookUrl?: string;
  isEnabled?: boolean;
  profileId?: string;
}

/**
 * Instance state for messenger connections
 */
export interface InstanceState {
  status: 'authorized' | 'not_authorized' | 'connecting' | 'error' | 'unknown' | 'timeout';
  stateInstance?: string;
  phone?: string;
  lastError?: string;
}

/**
 * WhatsApp session response
 */
export interface SessionResponse extends BaseResponse {
  qrCode?: string;
  status?: InstanceState['status'];
  instanceId?: string;
  state?: Record<string, unknown>;
  stateInstance?: string;
}

/**
 * File download request
 */
export interface FileDownloadRequest {
  chatId?: string;
  messageId: string;
  idMessage?: string;
  organizationId?: string;
}

/**
 * File download response
 */
export interface FileDownloadResponse extends BaseResponse {
  downloadUrl?: string;
  mimeType?: string;
  fileName?: string;
}

// ============================================================================
// AI & Generation Types
// ============================================================================

/**
 * AI chat request
 */
export interface AIChatRequest {
  prompt?: string;
  question?: string;
  message?: string;
  messages?: ChatMessage[];
  systemPrompt?: string;
  context?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * AI chat response
 */
export interface AIChatResponse extends BaseResponse {
  response?: string;
  answer?: string;
  content?: string;
  tokensUsed?: number;
  model?: string;
}

/**
 * Image generation request
 */
export interface ImageGenerationRequest {
  prompt: string;
  width?: number;
  height?: number;
}

/**
 * Image generation response
 */
export interface ImageGenerationResponse extends BaseResponse {
  imageUrl?: string;
  width?: number;
  height?: number;
}

/**
 * Voice assistant request
 */
export interface VoiceAssistantRequest {
  audio?: string;
  command?: string;
  sessionId?: string;
}

/**
 * Voice assistant response
 */
export interface VoiceAssistantResponse extends BaseResponse {
  text?: string;
  action?: string;
  audioUrl?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Transcription request
 */
export interface TranscriptionRequest {
  audioUrl: string;
}

/**
 * Transcription response
 */
export interface TranscriptionResponse extends BaseResponse {
  text?: string;
  duration?: number;
  language?: string;
}

/**
 * Call summary request
 */
export interface CallSummaryRequest {
  callId: string;
  callDetails?: Record<string, unknown>;
}

/**
 * Call summary response
 */
export interface CallSummaryResponse extends BaseResponse {
  summary?: string;
  keyPoints?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
}

// ============================================================================
// Import Types (Salebot, Holihope)
// ============================================================================

/**
 * Salebot import batch response
 */
export interface SalebotImportBatchResponse extends BaseResponse {
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
export interface SalebotFillIdsResponse extends BaseResponse {
  totalProcessed?: number;
  totalMatched?: number;
  processedThisBatch?: number;
  matchedThisBatch?: number;
}

/**
 * Salebot stop request
 */
export interface SalebotStopRequest {
  force_reset?: boolean;
}

/**
 * Salebot stop response
 */
export interface SalebotStopResponse extends BaseResponse {}

/**
 * CSV import request
 */
export interface CsvImportRequest {
  updates?: CsvUpdateRecord[];
  newClients?: CsvNewClientRecord[];
  branch?: string;
  organizationId: string;
}

export interface CsvUpdateRecord {
  id: string;
  salebot_id: string;
  [key: string]: unknown;
}

export interface CsvNewClientRecord {
  name: string;
  phone?: string;
  salebot_id?: string;
  [key: string]: unknown;
}

/**
 * CSV import response
 */
export interface CsvImportResponse extends BaseResponse {
  imported?: number;
  skipped?: number;
  updated?: number;
  created?: number;
  errors?: string[] | number;
}

/**
 * Holihope sync request
 */
export interface HolihopeSyncRequest {
  step?: number;
  mode?: 'full' | 'incremental';
}

/**
 * Holihope sync response
 */
export interface HolihopeSyncResponse extends BaseResponse {
  step?: number;
  imported?: number;
  updated?: number;
  skipped?: number;
}

// ============================================================================
// Payment Types
// ============================================================================

/**
 * T-Bank payment init request
 */
export interface TBankInitRequest {
  amount: number;
  orderId?: string;
  description?: string;
  clientId?: string;
  studentId?: string;
  paymentType?: string;
  returnUrl?: string;
  failUrl?: string;
}

/**
 * T-Bank payment init response
 */
export interface TBankInitResponse extends BaseResponse {
  paymentUrl?: string;
  paymentId?: string;
  orderId?: string;
  amount?: number;
}

/**
 * T-Bank webhook payload
 */
export interface TBankWebhookPayload {
  TerminalKey: string;
  OrderId: string;
  Success: boolean;
  Status: string;
  PaymentId: number;
  Amount: number;
  CardId?: number;
  Pan?: string;
  Token: string;
}

/**
 * Payment notification request
 */
export interface PaymentNotificationRequest {
  notification_id?: string;
  manual?: boolean;
}

/**
 * Payment notification response
 */
export interface PaymentNotificationResponse extends BaseResponse {
  sent?: number;
  failed?: number;
  skipped?: number;
}

// ============================================================================
// System & Health Types
// ============================================================================

/**
 * Health check request
 */
export interface HealthCheckRequest {
  mode?: 'critical' | 'all';
  alerts?: boolean;
}

/**
 * Health check response
 */
export interface HealthCheckResponse extends BaseResponse {
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
 * Push notification request
 */
export interface PushNotificationRequest {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  tag?: string;
  url?: string;
}

/**
 * Push notification response
 */
export interface PushNotificationResponse extends BaseResponse {
  sent?: number;
  failed?: number;
  errors?: string[];
}

// ============================================================================
// Video Conferencing (BBB) Types
// ============================================================================

/**
 * BBB meeting request
 */
export interface BBBMeetingRequest {
  action: 'create' | 'join' | 'end' | 'status';
  meetingId?: string;
  meetingName?: string;
  userName?: string;
  moderator?: boolean;
  teacherId?: string;
}

/**
 * BBB meeting response
 */
export interface BBBMeetingResponse extends BaseResponse {
  meetingId?: string;
  joinUrl?: string;
  attendeePassword?: string;
  moderatorPassword?: string;
  running?: boolean;
}

// ============================================================================
// Phone (OnlinePBX) Types
// ============================================================================

/**
 * OnlinePBX call request
 */
export interface OnlinePBXCallRequest {
  to_number: string;
  from_user?: string;
  from_extension?: string;
}

/**
 * OnlinePBX call response
 */
export interface OnlinePBXCallResponse extends BaseResponse {
  callId?: string;
  status?: string;
}

/**
 * OnlinePBX webhook payload
 */
export interface OnlinePBXWebhookPayload {
  event: string;
  call_id: string;
  from: string;
  to: string;
  direction: 'incoming' | 'outgoing';
  status: string;
  duration?: number;
  recording_url?: string;
  timestamp: string;
}

/**
 * OnlinePBX call record
 */
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
// Webhook Types
// ============================================================================

/**
 * Generic webhook response
 */
export interface WebhookResponse extends BaseResponse {
  processed?: boolean;
  eventType?: string;
}

/**
 * Webhook proxy request
 */
export interface WebhookProxyRequest {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
}

/**
 * Webhook proxy response
 */
export interface WebhookProxyResponse extends BaseResponse {
  statusCode?: number;
  body?: unknown;
}

// ============================================================================
// SEO Types
// ============================================================================

/**
 * Content indexing request
 */
export interface ContentIndexRequest {
  urls?: string[];
  sitemap?: boolean;
}

/**
 * Content indexing response
 */
export interface ContentIndexResponse extends BaseResponse {
  indexed?: number;
  updated?: number;
  failed?: number;
}

/**
 * SEO keywords cluster
 */
export interface SEOKeywordCluster {
  id: string;
  name: string;
  keywords: string[];
  volume?: number;
}

// ============================================================================
// AI Provider Types
// ============================================================================

/**
 * AI provider option
 */
export interface AIProviderOption {
  value: string;
  label: string;
  description: string;
  available: boolean;
}

/**
 * AI provider configuration response
 */
export interface AIProviderResponse extends BaseResponse {
  provider: string;
  source: 'env' | 'database';
  hasVertexSecrets: boolean;
  availableProviders: AIProviderOption[];
}

// ============================================================================
// Authentication Types
// ============================================================================

/**
 * QR login request
 */
export interface QRLoginRequest {
  sessionId?: string;
  qrToken?: string;
  deviceInfo?: Record<string, string>;
}

/**
 * QR login response
 */
export interface QRLoginResponse extends BaseResponse {
  qrCode?: string;
  sessionId?: string;
  expiresAt?: string;
  status?: 'pending' | 'confirmed' | 'expired';
  accessToken?: string;
  refreshToken?: string;
}

/**
 * SSO request
 */
export interface SSORequest {
  data: string;
}

/**
 * SSO response
 */
export interface SSOResponse extends BaseResponse {
  encrypted?: string;
  decrypted?: Record<string, unknown>;
  userId?: string;
  email?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a success response
 */
export function successResponse<T extends Record<string, unknown>>(
  data: T
): Response {
  return new Response(
    JSON.stringify({ success: true, ...data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * Create an error response
 */
export function errorResponse(
  error: string,
  status = 400,
  details?: Record<string, unknown>
): Response {
  return new Response(
    JSON.stringify({ success: false, error, ...details }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * Handle CORS preflight request
 */
export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

/**
 * Extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null) {
    if ('message' in error && typeof (error as { message: unknown }).message === 'string') {
      return (error as { message: string }).message;
    }
  }
  return 'Unknown error';
}
