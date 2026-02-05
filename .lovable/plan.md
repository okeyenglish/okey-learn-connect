
## Исправление: Отправка медиафайлов через WPP

### Проблема

Ошибка `Cannot POST /api/messages/image` (HTTP 404) указывает на несоответствие между SDK и реальным API сервера:

| Компонент | Текущий формат | Ожидаемый сервером |
|-----------|----------------|-------------------|
| WppMsgClient | `/api/messages/image` | `/api/{account}/send-image` |
| WppMsgClient | `/api/messages/video` | `/api/{account}/send-file` |
| WppMsgClient | `/api/messages/file` | `/api/{account}/send-file` |

WPP Platform (msg.academyos.ru) использует стандартный WPPConnect Server API, где эндпоинты имеют формат `/api/{session}/send-*`.

### План исправления

#### Файл: `supabase/functions/_shared/wpp.ts`

**1. Обновить метод `sendImage` (строки 396-409)**

```typescript
async sendImage(account: string, to: string, imageUrl: string, caption?: string): Promise<WppTaskResult> {
  // WPPConnect format: /api/{session}/send-image
  const url = `${this.baseUrl}/api/${encodeURIComponent(account)}/send-image`;
  
  const result = await this._fetch(url, {
    method: 'POST',
    body: JSON.stringify({ 
      phone: to, 
      isGroup: false,
      filename: 'image',
      caption: caption || '',
      base64: imageUrl,  // WPPConnect expects base64 OR path
      path: imageUrl,    // URL also supported
    }),
  });

  return {
    success: result.status !== 'error',
    taskId: result.ids?.[0]?.id || result.id,
    status: result.status,
    error: result.message,
  };
}
```

**2. Обновить метод `sendVideo` (строки 415-428)**

```typescript
async sendVideo(account: string, to: string, videoUrl: string, caption?: string): Promise<WppTaskResult> {
  // WPPConnect: video отправляется через send-file
  const url = `${this.baseUrl}/api/${encodeURIComponent(account)}/send-file`;
  
  const result = await this._fetch(url, {
    method: 'POST',
    body: JSON.stringify({ 
      phone: to, 
      isGroup: false,
      filename: 'video.mp4',
      caption: caption || '',
      path: videoUrl,
    }),
  });

  return {
    success: result.status !== 'error',
    taskId: result.ids?.[0]?.id || result.id,
    status: result.status,
    error: result.message,
  };
}
```

**3. Обновить метод `sendFile` (строки 434-447)**

```typescript
async sendFile(account: string, to: string, fileUrl: string, filename: string): Promise<WppTaskResult> {
  const url = `${this.baseUrl}/api/${encodeURIComponent(account)}/send-file`;
  
  const result = await this._fetch(url, {
    method: 'POST',
    body: JSON.stringify({ 
      phone: to, 
      isGroup: false,
      filename: filename,
      path: fileUrl,
    }),
  });

  return {
    success: result.status !== 'error',
    taskId: result.ids?.[0]?.id || result.id,
    status: result.status,
    error: result.message,
  };
}
```

**4. Обновить метод `sendAudio` (строки 453-466)**

```typescript
async sendAudio(account: string, to: string, audioUrl: string): Promise<WppTaskResult> {
  // WPPConnect: POST /api/{session}/send-ptt-status для голосовых или send-file для аудио
  const url = `${this.baseUrl}/api/${encodeURIComponent(account)}/send-file`;
  
  const result = await this._fetch(url, {
    method: 'POST',
    body: JSON.stringify({ 
      phone: to, 
      isGroup: false,
      filename: 'audio.mp3',
      path: audioUrl,
    }),
  });

  return {
    success: result.status !== 'error',
    taskId: result.ids?.[0]?.id || result.id,
    status: result.status,
    error: result.message,
  };
}
```

**5. Обновить метод `sendText` (строки 377-390)**

```typescript
async sendText(account: string, to: string, text: string, priority?: 'high' | 'normal' | 'low'): Promise<WppTaskResult> {
  // WPPConnect format: /api/{session}/send-message
  const url = `${this.baseUrl}/api/${encodeURIComponent(account)}/send-message`;
  
  const result = await this._fetch(url, {
    method: 'POST',
    body: JSON.stringify({ 
      phone: to, 
      isGroup: false,
      message: text,
    }),
  });

  return {
    success: result.status !== 'error',
    taskId: result.ids?.[0]?.id || result.id,
    status: result.status,
    error: result.message,
  };
}
```

### Технические детали

**Формат WPPConnect Server API:**

| Тип | Эндпоинт | Body |
|-----|----------|------|
| Текст | `POST /api/{session}/send-message` | `{ phone, message, isGroup }` |
| Изображение | `POST /api/{session}/send-image` | `{ phone, path, caption, isGroup }` |
| Файл/Видео | `POST /api/{session}/send-file` | `{ phone, path, filename, isGroup }` |

**Формат ответа WPPConnect:**
```json
{
  "status": "success",
  "ids": [{ "id": "true_xxx", "_serialized": "..." }]
}
```

### Изменяемые файлы

| Файл | Изменения |
|------|-----------|
| `supabase/functions/_shared/wpp.ts` | Обновить все методы send* для использования WPPConnect формата |

### Ожидаемый результат

1. Изображения, видео, аудио и документы будут успешно отправляться через WPP
2. Ошибка 404 `/api/messages/image` исчезнет
3. Сообщения будут корректно сохраняться в БД с правильным `external_message_id`
