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

// ============================================================================
// Telegram-specific Types
// ============================================================================

/**
 * Telegram settings from messenger_settings
 */
export interface TelegramSettings {
  profileId: string;
  apiToken: string;
  webhookUrl?: string;
}

/**
 * Telegram send message request
 */
export interface TelegramSendRequest extends SendMessageRequest {
  clientId: string;
  text?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  phoneId?: string;
}

/**
 * Telegram send message response
 */
export interface TelegramSendResponse extends SendMessageResponse {
  success: boolean;
  messageId?: string;
  savedMessageId?: string;
  error?: string;
  code?: string;
}

/**
 * Telegram get avatar request
 */
export interface TelegramGetAvatarRequest {
  clientId?: string;
  chatId?: string;
}

/**
 * Telegram get avatar response
 */
export interface TelegramGetAvatarResponse extends BaseResponse {
  success: boolean;
  avatarUrl?: string;
  error?: string;
}

/**
 * Wappi.pro contact response
 */
export interface WappiContactResponse {
  photo_url?: string;
  avatar_url?: string;
  status?: string;
}

// ============================================================================
// WPP Connect Types
// ============================================================================

/**
 * WPP session configuration
 */
export interface WppSessionConfig {
  baseUrl: string;
  session: string;
  secret: string;
  pollSeconds?: number;
}

/**
 * WPP send message request
 */
export interface WppSendRequest {
  clientId: string;
  message: string;
  phoneNumber?: string;
  fileUrl?: string;
  fileName?: string;
  action?: 'test_connection';
}

/**
 * WPP send message response
 */
export interface WppSendResponse extends BaseResponse {
  success: boolean;
  messageId?: string;
  savedMessageId?: string;
  status?: number;
  message?: string;
  session?: string;
  error?: string;
}

/**
 * WPP API response from server
 */
export interface WppApiResponse {
  id?: string;
  status?: string;
  error?: string;
  message?: string;
}

/**
 * WPP status request
 */
export interface WppStatusRequest {
  force?: boolean;
}

/**
 * WPP status response
 */
export interface WppStatusResponse extends BaseResponse {
  status: 'connected' | 'qr_issued' | 'qr_pending' | 'disconnected' | 'error';
  qrcode?: string;
  last_qr_at?: string;
  message?: string;
}

/**
 * WPP start request
 */
export interface WppStartRequest {
  session_suffix?: string;
}

/**
 * WPP start response
 */
export interface WppStartResponse extends BaseResponse {
  ok: boolean;
  status: 'connected' | 'qr_issued' | 'timeout' | 'error';
  qrcode?: string;
  session_name?: string;
  error?: string;
}

/**
 * WPP session result from client
 */
export interface WppSessionResult {
  state: 'qr' | 'connected' | 'timeout' | 'error';
  base64?: string;
  message?: string;
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
// OnlinePBX Types
// ============================================================================

/**
 * OnlinePBX webhook payload from PBX
 */
export interface OnlinePBXWebhookPayload {
  event?: string;
  direction?: 'incoming' | 'outgoing' | 'inbound' | 'outbound';
  caller?: string;
  callee?: string;
  uuid?: string;
  call_duration?: string | number;
  dialog_duration?: string | number;
  download_url?: string;
  hangup_cause?: string;
  call_id?: string;
  from?: string;
  to?: string;
  status?: string;
  start_time?: string;
  end_time?: string;
  duration?: number;
  record_url?: string;
  domain?: string;
  pbx_domain?: string;
  account?: string;
  [key: string]: unknown;
}

/**
 * OnlinePBX call request
 */
export interface OnlinePBXCallRequest {
  to_number: string;
  from_user: string;
}

/**
 * OnlinePBX call response
 */
export interface OnlinePBXCallResponse extends BaseResponse {
  success: boolean;
  message?: string;
  from_extension?: string;
  to_number?: string;
  call_id?: string | null;
  call_log_id?: string;
  error?: string;
}

/**
 * OnlinePBX webhook response
 */
export interface OnlinePBXWebhookResponse extends BaseResponse {
  success: boolean;
  message?: string;
  callId?: string;
  deduplicated?: boolean;
}

/**
 * OnlinePBX settings from messenger_settings
 */
export interface OnlinePBXSettings {
  pbx_domain?: string;
  pbxDomain?: string;
  api_key_id?: string;
  apiKeyId?: string;
  api_key_secret?: string;
  apiKeySecret?: string;
  is_enabled?: boolean;
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
// Green API WhatsApp Webhook Types
// ============================================================================

/**
 * Green API instance data in webhook
 */
export interface GreenAPIInstanceData {
  idInstance: string;
  wid: string;
  typeInstance: string;
}

/**
 * Green API sender data in webhook
 */
export interface GreenAPISenderData {
  chatId: string;
  chatName?: string;
  sender: string;
  senderName?: string;
}

/**
 * Green API text message data
 */
export interface GreenAPITextMessageData {
  textMessage: string;
}

/**
 * Green API file message data
 */
export interface GreenAPIFileMessageData {
  downloadUrl: string;
  caption?: string;
  fileName?: string;
  jpegThumbnail?: string;
  mimeType?: string;
}

/**
 * Green API extended text message data
 */
export interface GreenAPIExtendedTextMessageData {
  text: string;
  stanzaId?: string;
  participant?: string;
}

/**
 * Green API reaction message data
 */
export interface GreenAPIReactionMessageData {
  messageId: string;
  reaction: string;
}

/**
 * Green API message data in webhook
 */
export interface GreenAPIMessageData {
  typeMessage: string;
  textMessageData?: GreenAPITextMessageData;
  fileMessageData?: GreenAPIFileMessageData;
  extendedTextMessageData?: GreenAPIExtendedTextMessageData;
  reactionMessageData?: GreenAPIReactionMessageData;
}

/**
 * Green API status data in webhook
 */
export interface GreenAPIStatusData {
  timestamp: number;
  idMessage: string;
  status: string;
}

/**
 * Green API webhook payload
 */
export interface GreenAPIWebhook {
  typeWebhook: string;
  instanceData: GreenAPIInstanceData;
  timestamp: number;
  idMessage?: string;
  senderData?: GreenAPISenderData;
  messageData?: GreenAPIMessageData;
  status?: string;
  statusData?: GreenAPIStatusData;
}

// ============================================================================
// Wappi WhatsApp Webhook Types
// ============================================================================

/**
 * Wappi message in webhook
 */
export interface WappiMessage {
  wh_type: 'incoming_message' | 'outgoing_message_api' | 'outgoing_message_phone' | 'delivery_status' | 'authorization_status';
  profile_id: string;
  id: string;
  body: string;
  type: 'chat' | 'image' | 'video' | 'document' | 'audio' | 'ptt' | 'location' | 'vcard' | 'sticker' | 'reaction';
  from: string;
  to: string;
  senderName?: string;
  chatId: string;
  timestamp: string;
  time: number;
  caption?: string;
  mimetype?: string;
  file_name?: string;
  file_link?: string;
  contact_name?: string;
  contact_username?: string;
  contact_phone?: string;
  is_forwarded?: boolean;
  isReply?: boolean;
  isForwarded?: boolean;
  stanza_id?: string;
  quotedMsgId?: string;
  thumbnail?: string;
  picture?: string;
  from_where?: string;
  is_me?: boolean;
  username?: string;
}

/**
 * Wappi webhook payload
 */
export interface WappiWebhook {
  messages: WappiMessage[];
}

// ============================================================================
// WPP Connect Webhook Types
// ============================================================================

/**
 * WPP Connect media data
 */
export interface WPPMediaData {
  url?: string;
  fileName?: string;
  mime?: string;
  mimetype?: string;
}

/**
 * WPP Connect message data
 */
export interface WPPMessageData {
  from: string;
  text?: string;
  body?: string;
  media?: WPPMediaData;
  timestamp?: number;
  id?: string;
  fromMe?: boolean;
  session?: string;
  sessionName?: string;
}

/**
 * WPP Connect webhook event
 */
export interface WPPWebhookEvent {
  type?: string;
  event?: string;
  session?: string;
  qrcode?: string;
  qr?: string;
  data?: WPPMessageData;
  instanceData?: {
    idInstance?: string;
  };
}

// ============================================================================
// Telegram Webhook Types (Wappi format)
// ============================================================================

/**
 * Telegram message via Wappi
 */
export interface TelegramWappiMessage {
  id: string;
  profile_id: string;
  wh_type: 'incoming_message' | 'outgoing_message' | 'outgoing_message_phone' | 'delivery_status' | 'authorization_status';
  timestamp: string;
  time: number;
  body?: string;
  type: 'text' | 'image' | 'video' | 'document' | 'audio' | 'ptt' | 'location' | 'vcard' | 'sticker';
  from?: string;
  to?: string;
  senderName?: string;
  chatId: string;
  username?: string;
  contact_username?: string;
  contact_name?: string;
  contact_phone?: string;
  caption?: string;
  file_link?: string;
  mimetype?: string;
  isForwarded?: boolean;
  quotedMsgId?: string;
  thumbnail?: string;
  picture?: string;
  from_where?: string;
  is_me?: boolean;
}

/**
 * Telegram webhook payload via Wappi
 */
export interface TelegramWappiWebhook {
  messages: TelegramWappiMessage[];
}

// ============================================================================
// Salebot Webhook Types
// ============================================================================

/**
 * Salebot client data in webhook
 */
export interface SalebotClientData {
  id: number;
  recepient: string;
  client_type: number;
  name: string;
  avatar: string;
  created_at: string;
  tag: string;
  group: string;
}

/**
 * Salebot attachment in webhook
 */
export interface SalebotAttachment {
  url?: string;
  file?: string;
  name?: string;
  filename?: string;
  type?: string;
}

/**
 * Salebot webhook payload
 */
export interface SalebotWebhookPayload {
  id: number;
  client: SalebotClientData;
  message: string;
  attachments: (string | SalebotAttachment)[];
  message_id: number;
  project_id: number;
  is_input: 0 | 1;
  delivered: 0 | 1;
  error_message: string | null;
}

/**
 * Salebot client type to messenger type mapping
 * 0 = VK, 1 = Telegram, 2 = Viber, 3 = Facebook, 5 = Online chat
 * 6 = WhatsApp, 7 = Avito, 8 = Odnoklassniki, 10 = Instagram
 * 12 = Yula, 13 = Telephony, 14 = Email, 16 = Telegram Business
 * 19 = Cian, 20 = Max, 21 = Telegram account, 22 = TikTok
 */
export type SalebotClientType = 0 | 1 | 2 | 3 | 5 | 6 | 7 | 8 | 10 | 12 | 13 | 14 | 16 | 19 | 20 | 21 | 22;

/**
 * Messenger type values
 */
export type MessengerTypeValue = 'whatsapp' | 'telegram' | 'viber' | 'vk' | 'max' | 'instagram' | 'facebook';

// ============================================================================
// MAX (Green API v3) Types - Webhooks and API Requests/Responses
// ============================================================================

/**
 * MAX settings stored in messenger_settings
 */
export interface MaxSettings {
  instanceId: string;
  apiToken: string;
  apiUrl?: string;
  webhookUrl?: string;
}

/**
 * MAX webhook type
 */
export type MaxWebhookType = 
  | 'incomingMessageReceived' 
  | 'outgoingMessageReceived' 
  | 'outgoingAPIMessageReceived' 
  | 'outgoingMessageStatus' 
  | 'stateInstanceChanged';

/**
 * MAX webhook instance data
 */
export interface MaxWebhookInstanceData {
  idInstance: number | string;
  wid: string;
  typeInstance?: string;
}

/**
 * MAX webhook sender data
 */
export interface MaxWebhookSenderData {
  chatId: string;
  sender: string;
  chatName?: string;
  senderName?: string;
  senderPhoneNumber?: number;
}

/**
 * MAX webhook text message data
 */
export interface MaxWebhookTextMessageData {
  textMessage: string;
}

/**
 * MAX webhook extended text message data
 */
export interface MaxWebhookExtendedTextMessageData {
  text: string;
  description?: string;
  title?: string;
  jpegThumbnail?: string;
}

/**
 * MAX webhook file message data
 */
export interface MaxWebhookFileMessageData {
  downloadUrl: string;
  caption?: string;
  fileName?: string;
  mimeType?: string;
}

/**
 * MAX webhook location message data
 */
export interface MaxWebhookLocationMessageData {
  latitude: number;
  longitude: number;
  nameLocation?: string;
  address?: string;
}

/**
 * MAX webhook contact message data
 */
export interface MaxWebhookContactMessageData {
  displayName: string;
  vcard: string;
}

/**
 * MAX webhook message data
 */
export interface MaxWebhookMessageData {
  typeMessage: 'textMessage' | 'extendedTextMessage' | 'imageMessage' | 'videoMessage' | 'documentMessage' | 'audioMessage' | 'locationMessage' | 'contactMessage' | 'pollMessage' | string;
  textMessageData?: MaxWebhookTextMessageData;
  extendedTextMessageData?: MaxWebhookExtendedTextMessageData;
  fileMessageData?: MaxWebhookFileMessageData;
  locationMessageData?: MaxWebhookLocationMessageData;
  contactMessageData?: MaxWebhookContactMessageData;
}

/**
 * MAX webhook payload (Green API v3)
 */
export interface MaxWebhookPayload {
  typeWebhook: MaxWebhookType | string;
  instanceData: MaxWebhookInstanceData;
  timestamp?: number;
  idMessage?: string;
  senderData?: MaxWebhookSenderData;
  messageData?: MaxWebhookMessageData;
  status?: string;
  stateInstance?: string;
}

/**
 * MAX contact from getContacts API
 */
export interface MaxContact {
  id: string;
  name?: string;
  chatId?: string;
  phone?: string;
  avatar?: string;
  type?: string;
}

// ============================================================================
// MAX API Request/Response Types
// ============================================================================

/**
 * MAX check availability request
 */
export interface MaxCheckAvailabilityRequest {
  phoneNumber: string;
}

/**
 * MAX check availability response
 */
export interface MaxCheckAvailabilityResponse extends BaseResponse {
  existsWhatsapp: boolean;
  chatId: string | null;
  unavailable?: boolean;
  reason?: string;
}

/**
 * MAX get contacts response
 */
export interface MaxGetContactsResponse extends BaseResponse {
  contacts: MaxContact[];
}

/**
 * MAX get avatar request
 */
export interface MaxGetAvatarRequest {
  clientId?: string;
  chatId?: string;
}

/**
 * MAX get avatar response
 */
export interface MaxGetAvatarResponse extends BaseResponse {
  urlAvatar: string | null;
  available: boolean;
  reason?: string;
}

/**
 * MAX get contact info request
 */
export interface MaxGetContactInfoRequest {
  clientId?: string;
  chatId?: string;
}

/**
 * MAX get contact info response
 */
export interface MaxGetContactInfoResponse extends BaseResponse {
  name?: string;
  phone?: string;
  email?: string;
  about?: string;
  [key: string]: unknown;
}

/**
 * MAX send message request
 */
export interface MaxSendMessageRequest {
  clientId: string;
  text?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  phoneId?: string;
}

/**
 * MAX send message response
 */
export interface MaxSendMessageResponse extends BaseResponse {
  messageId?: string;
  idMessage?: string;
  savedMessageId?: string;
}

/**
 * MAX edit message request
 */
export interface MaxEditMessageRequest {
  messageId: string;
  newMessage: string;
  clientId: string;
}

/**
 * MAX edit message response
 */
export interface MaxEditMessageResponse extends BaseResponse {
  messageId?: string;
  localOnly?: boolean;
}

/**
 * MAX delete message request
 */
export interface MaxDeleteMessageRequest {
  messageId: string;
  clientId: string;
}

/**
 * MAX delete message response
 */
export interface MaxDeleteMessageResponse extends BaseResponse {
  localOnly?: boolean;
}

// ============================================================================
// WhatsApp Send/Edit/Delete Types
// ============================================================================

/**
 * WhatsApp send message request (all providers)
 */
export interface WhatsAppSendRequest {
  clientId: string;
  message?: string;
  text?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  phoneNumber?: string;
  chatId?: string;
  quotedMessageId?: string;
}

/**
 * WhatsApp send message response
 */
export interface WhatsAppSendResponse extends BaseResponse {
  messageId?: string;
  idMessage?: string;
  chatId?: string;
  savedMessageId?: string;
  timestamp?: string;
}

/**
 * WhatsApp edit message request
 */
export interface WhatsAppEditRequest {
  clientId: string;
  messageId: string;
  newMessage: string;
  newText?: string;
}

/**
 * WhatsApp delete message request
 */
export interface WhatsAppDeleteRequest {
  clientId: string;
  messageId: string;
  deleteForEveryone?: boolean;
}

/**
 * WhatsApp typing indicator request
 */
export interface WhatsAppTypingRequest {
  clientId: string;
  chatId?: string;
}

/**
 * WhatsApp download file request
 */
export interface WhatsAppDownloadRequest {
  chatId?: string;
  messageId: string;
  idMessage?: string;
  organizationId?: string;
}

/**
 * WhatsApp download file response
 */
export interface WhatsAppDownloadResponse extends BaseResponse {
  downloadUrl?: string;
  mimeType?: string;
  fileName?: string;
  base64?: string;
}

// ============================================================================
// WPP Connect Session Types
// ============================================================================

/**
 * WPP session status
 */
export type WPPSessionStatus = 'connected' | 'disconnected' | 'qr_issued' | 'connecting' | 'error';

/**
 * WPP session record in database
 */
export interface WPPSessionRecord {
  organization_id: string;
  session_name: string;
  status: WPPSessionStatus;
  last_qr_b64?: string | null;
  last_qr_at?: string | null;
  updated_at: string;
}

/**
 * WPP start session request
 */
export interface WPPStartRequest {
  force?: boolean;
}

/**
 * WPP start session response
 */
export interface WPPStartResponse extends BaseResponse {
  status?: WPPSessionStatus;
  qrCode?: string;
  sessionName?: string;
}

/**
 * WPP status response
 */
export interface WPPStatusResponse extends BaseResponse {
  status?: WPPSessionStatus;
  qrCode?: string;
  phone?: string;
  sessionName?: string;
}

/**
 * WPP disconnect response
 */
export interface WPPDisconnectResponse extends BaseResponse {
  status?: 'disconnected';
}

/**
 * WPP diagnostics response
 */
export interface WPPDiagnosticsResponse extends BaseResponse {
  sessions?: Array<{
    name: string;
    status: string;
    phone?: string;
  }>;
  serverStatus?: string;
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

/**
 * Get OpenAI API key from messenger_settings table for organization
 * Falls back to OPENAI_API_KEY env variable if not found in DB
 */
export async function getOpenAIApiKey(
  supabase: any,
  organizationId?: string
): Promise<string | null> {
  // First try environment variable (backward compatibility)
  const envKey = Deno.env.get('OPENAI_API_KEY');
  
  // If no org ID provided, use env only
  if (!organizationId) {
    return envKey || null;
  }
  
  try {
    // Try to get from messenger_settings
    const { data, error } = await supabase
      .from('messenger_settings')
      .select('settings, is_enabled')
      .eq('organization_id', organizationId)
      .eq('messenger_type', 'openai')
      .maybeSingle();
    
    if (error) {
      console.warn('[getOpenAIApiKey] DB error, falling back to env:', error.message);
      return envKey || null;
    }
    
    if (data?.is_enabled && data?.settings?.openaiApiKey) {
      console.log('[getOpenAIApiKey] Using API key from messenger_settings');
      return data.settings.openaiApiKey;
    }
    
    // Fall back to env variable
    if (envKey) {
      console.log('[getOpenAIApiKey] Using API key from environment');
      return envKey;
    }
    
    console.warn('[getOpenAIApiKey] No API key found in DB or environment');
    return null;
  } catch (err) {
    console.error('[getOpenAIApiKey] Error:', err);
    return envKey || null;
  }
}

/**
 * Get organization ID from user's profile
 */
export async function getOrganizationIdFromUser(
  supabase: any,
  authHeader: string | null
): Promise<string | null> {
  if (!authHeader) return null;
  
  try {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.warn('[getOrganizationIdFromUser] Auth error:', authError?.message);
      return null;
    }
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile?.organization_id) {
      console.warn('[getOrganizationIdFromUser] Profile error:', profileError?.message);
      return null;
    }
    
    return profile.organization_id;
  } catch (err) {
    console.error('[getOrganizationIdFromUser] Error:', err);
    return null;
  }
}

// ============================================================================
// Self-Hosted Push Notification Helper
// ============================================================================

/**
 * Self-hosted API configuration
 * Push subscriptions are stored in self-hosted Supabase (api.academyos.ru)
 * so we need to call send-push-notification there, not in Lovable Cloud
 */
const SELF_HOSTED_URL = 'https://api.academyos.ru';
const SELF_HOSTED_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY5MDg4ODgzLCJleHAiOjE5MjY3Njg4ODN9.WEsCyaCdQvxzVObedC-A9hWTJUSwI_p9nCG1wlbaNEg';

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  data?: Record<string, unknown>;
}

export interface SendPushParams {
  userId?: string;
  userIds?: string[];
  payload: PushPayload;
}

/**
 * Send push notification via self-hosted API
 * This should be used instead of supabase.functions.invoke('send-push-notification')
 * because push subscriptions are stored in self-hosted database
 */
export async function sendPushNotification(params: SendPushParams): Promise<{ success: boolean; sent?: number; failed?: number; error?: string }> {
  const startTime = Date.now();
  const targetCount = params.userIds?.length || (params.userId ? 1 : 0);
  const targetIds = params.userIds || (params.userId ? [params.userId] : []);
  
  console.log('[sendPushNotification] ===== PUSH START =====');
  console.log('[sendPushNotification] Target:', {
    count: targetCount,
    userIds: targetIds.slice(0, 5), // Log first 5 for privacy
    title: params.payload.title,
    body: params.payload.body?.slice(0, 50),
    url: params.payload.url,
  });
  
  try {
    const response = await fetch(`${SELF_HOSTED_URL}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SELF_HOSTED_ANON_KEY}`,
      },
      body: JSON.stringify(params),
    });

    const responseText = await response.text();
    let data: Record<string, unknown>;
    
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error('[sendPushNotification] Invalid JSON response:', responseText.slice(0, 200));
      return { success: false, error: `Invalid response: ${responseText.slice(0, 100)}` };
    }
    
    const elapsed = Date.now() - startTime;
    
    console.log('[sendPushNotification] Response:', {
      status: response.status,
      ok: response.ok,
      sent: data.sent,
      failed: data.failed,
      subscriptions: data.subscriptions,
      elapsed: `${elapsed}ms`,
    });
    
    if (!response.ok) {
      console.error('[sendPushNotification] ❌ FAILED:', {
        error: data.error || response.statusText,
        details: data.details,
        status: response.status,
      });
      return { success: false, error: String(data.error || `HTTP ${response.status}`) };
    }

    const sent = typeof data.sent === 'number' ? data.sent : 0;
    const failed = typeof data.failed === 'number' ? data.failed : 0;
    
    if (sent > 0) {
      console.log('[sendPushNotification] ✅ SUCCESS:', { sent, failed, elapsed: `${elapsed}ms` });
    } else {
      console.log('[sendPushNotification] ⚠️ NO SUBSCRIPTIONS:', { targetIds, elapsed: `${elapsed}ms` });
    }
    
    console.log('[sendPushNotification] ===== PUSH END =====');
    
    return { success: true, sent, failed };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error('[sendPushNotification] ❌ EXCEPTION:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      elapsed: `${elapsed}ms`,
    });
    console.log('[sendPushNotification] ===== PUSH END (ERROR) =====');
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// Organization-scoped User Role Helpers
// ============================================================================

/**
 * Get user IDs of admins/managers for a specific organization
 * This ensures push notifications are only sent to users in the same organization
 */
export async function getOrgAdminManagerUserIds(
  supabase: SupabaseClient,
  organizationId: string
): Promise<string[]> {
  console.log('[getOrgAdminManagerUserIds] Fetching for org:', organizationId);
  
  // Join user_roles with profiles to filter by organization_id
  const { data, error } = await supabase
    .from('profiles')
    .select('id, user_roles!inner(role)')
    .eq('organization_id', organizationId)
    .in('user_roles.role', ['admin', 'manager']);

  if (error) {
    console.error('[getOrgAdminManagerUserIds] Error:', error);
    return [];
  }

  const userIds = data?.map((p: { id: string }) => p.id) || [];
  console.log('[getOrgAdminManagerUserIds] Found', userIds.length, 'users');
  
  return userIds;
}
