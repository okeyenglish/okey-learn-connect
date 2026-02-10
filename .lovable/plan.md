

# Fix Wappi WhatsApp Media: Store Base64 in Supabase Storage

## Problem

When Wappi sends incoming media messages (images, documents, audio, video), the webhook payload contains the file as base64 in the `body` field. Currently, the webhook saves a fake URL `wappi://media/{messageId}` as `file_url`, which the frontend cannot render. Images, documents, videos, and voice messages from Wappi WhatsApp are invisible in the CRM chat.

## Root Cause

Line 354 of `supabase/functions/wappi-whatsapp-webhook/index.ts`:
```
fileUrl = `wappi://media/${message.id}`
```

This is a non-existent protocol. The frontend's `OptimizedAttachedFile` component tries to load this URL and fails silently.

## Solution

Decode the base64 `body` from Wappi, upload it to the `chat-media` Supabase Storage bucket, and use the resulting public URL as `file_url` -- the same pattern already used by `wpp-webhook` and `max-webhook`.

## Technical Changes

### File: `supabase/functions/wappi-whatsapp-webhook/index.ts`

Replace the current media handling block (lines 348-356) with:

1. Decode `message.body` from base64 to binary (`Uint8Array`)
2. Determine file extension from `message.mimetype` or `message.type`
3. Generate a storage path: `wappi/{organizationId}/{messageId}.{ext}`
4. Upload to `chat-media` bucket via `supabase.storage`
5. Get the public URL and set it as `fileUrl`
6. If `file_name` is not provided by Wappi (common for images), generate one from the MIME type
7. Set `fileType` to `message.mimetype` (e.g., `image/jpeg`, `application/pdf`)

Also apply the same logic to `handleOutgoingMessage` (lines 535-537) for consistency -- outgoing messages sent from the phone also carry media.

### File: `supabase/functions/_shared/types.ts`

Add `title` field to `WappiMessage` interface (Wappi sends `title` for documents, visible in the screenshot).

### File: `supabase/functions/wappi-whatsapp-webhook/index.ts` (additional)

Update `fileName` assignment to use `message.file_name || message.title` as fallback, then generate a name from MIME type if neither exists.

## Helper Function (added to webhook)

```text
async function uploadWappiMedia(
  base64Body: string, 
  messageId: string, 
  mimeType: string, 
  orgId: string
): Promise<string | null>

Steps:
  1. Convert base64 string to Uint8Array
  2. Build path: wappi/{orgId}/{messageId}.{ext}
  3. Upload to chat-media bucket
  4. Return public URL or null on error
```

## Extension Mapping

```text
image/jpeg  -> .jpg
image/png   -> .png
image/webp  -> .webp
video/mp4   -> .mp4
video/3gpp  -> .3gp
audio/ogg   -> .ogg
audio/mpeg  -> .mp3
audio/mp4   -> .m4a
application/pdf -> .pdf
(default)   -> .bin
```

## Expected Result

After this change:
- Incoming Wappi images will display inline in the chat (like WhatsApp)
- Documents (PDF, etc.) will show with thumbnail and download button
- Audio/voice messages will play inline with the audio player
- Videos will render with the video player
- All media files are permanently stored in Supabase Storage, not dependent on temporary Wappi URLs

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/wappi-whatsapp-webhook/index.ts` | Add `uploadWappiMedia` helper, replace fake `wappi://` URL with real storage upload for both incoming and outgoing media messages |
| `supabase/functions/_shared/types.ts` | Add `title?: string` to `WappiMessage` interface |

