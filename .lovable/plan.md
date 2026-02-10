

# Fix Wappi Telegram Media: Upload Base64 to Storage

## Problem

When Wappi sends Telegram media messages (images, documents, audio, video), the webhook payload contains file data as base64 in the `body` field, just like WhatsApp. However, the `telegram-webhook` currently only looks at `message.file_link`, which is often null. This results in `file_url = null`, and the frontend shows "[Изображение]" as plain text with no actual image.

## Root Cause

In `supabase/functions/telegram-webhook/index.ts`, the `extractMessageContent` function (line 1050-1092) sets:
```
fileUrl = message.file_link || null;
```

Wappi Telegram rarely provides `file_link`. Instead, media is delivered as base64 in `message.body` -- the exact same pattern as Wappi WhatsApp.

## Solution

Apply the same `uploadWappiMedia` pattern from `wappi-whatsapp-webhook` to `telegram-webhook`:

1. Add `uploadWappiMedia`, `getExtFromMime`, and `generateFileName` helper functions (copied from wappi-whatsapp-webhook)
2. Modify `extractMessageContent` to accept `organizationId` parameter
3. For media types (image, video, document, audio, ptt, sticker), if `file_link` is absent but `body` exists, decode base64 and upload to `chat-media` bucket under path `wappi-telegram/{orgId}/{messageId}.{ext}`
4. Use the resulting public URL as `fileUrl`
5. Generate `fileName` when not provided

## Technical Changes

### File: `supabase/functions/telegram-webhook/index.ts`

1. **Add helper functions** (top of file, after imports):
   - `getExtFromMime(mime)` -- maps MIME type to file extension
   - `generateFileName(mime, messageId)` -- generates human-readable filename
   - `uploadWappiMedia(base64Body, messageId, mimeType, orgId)` -- decodes base64, uploads to `chat-media` bucket, returns public URL

2. **Make `extractMessageContent` async** and add `organizationId` parameter:
   - Change signature to `async function extractMessageContent(message, organizationId)`
   - For each media type (image, video, document, audio/ptt, sticker):
     - First try `message.file_link` (if Wappi provides a direct URL)
     - If no `file_link` but `message.body` exists and looks like base64, call `uploadWappiMedia`
     - Set `fileName` from `message.caption` or generate from MIME type
   - Update return to include `fileName`

3. **Update callers** of `extractMessageContent`:
   - Line 387 (handleIncomingMessage): `await extractMessageContent(message, organizationId)`
   - Line 711 (handleOutgoingMessage): `await extractMessageContent(message, organizationId)`

### Storage Path

Media will be stored at: `wappi-telegram/{organizationId}/{messageId}.{extension}`

This uses a different prefix (`wappi-telegram/`) than WhatsApp (`wappi/`) to keep files organized.

## Extension Mapping

Same as WhatsApp webhook:
- image/jpeg -> .jpg
- image/png -> .png
- image/webp -> .webp
- video/mp4 -> .mp4
- audio/ogg -> .ogg
- audio/mpeg -> .mp3
- application/pdf -> .pdf
- (default) -> .bin

## Expected Result

After this change:
- Incoming Telegram images via Wappi will display inline in the CRM chat
- Documents will show with download buttons
- Audio/voice messages will play with the audio player
- Videos will render with the video player
- All media permanently stored in Supabase Storage

## Prerequisites

The `chat-media` storage bucket must exist on the self-hosted Supabase (already created for WhatsApp fix).

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/telegram-webhook/index.ts` | Add `uploadWappiMedia` + helpers, make `extractMessageContent` async with base64 upload logic |

