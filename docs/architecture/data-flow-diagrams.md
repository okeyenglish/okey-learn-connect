# Data Flow Diagrams

> **Дата:** 2026-01-26  
> **Версия:** 1.0

## Общая архитектура потоков данных

```mermaid
graph TB
    subgraph Frontend["🖥️ Frontend (React)"]
        UI[UI Components]
        Hooks[React Hooks]
        API[selfHostedApi.ts]
    end
    
    subgraph EdgeRuntime["⚡ Edge Runtime"]
        Router[main/index.ts<br/>Central Router]
        
        subgraph Messengers["📱 Мессенджеры"]
            WPP[wpp-*]
            Wappi[wappi-*]
            Telegram[telegram-*]
            MAX[max-*]
        end
        
        subgraph AI["🤖 AI/ML"]
            Voice[voice-assistant]
            Chat[ask / ai-consultant]
            GPT[generate-gpt-response]
        end
        
        subgraph Business["💼 Бизнес-логика"]
            Import[import-holihope]
            Payments[tbank-*]
            PBX[onlinepbx-*]
        end
    end
    
    subgraph External["🌐 Внешние сервисы"]
        WhatsApp[WhatsApp API]
        TelegramAPI[Telegram Bot API]
        OpenAI[OpenAI API]
        TBank[T-Bank API]
        OnlinePBX[OnlinePBX API]
        Holihope[Holihope API]
    end
    
    subgraph Database["🗄️ PostgreSQL"]
        Tables[(Tables)]
        RLS{RLS Policies}
    end
    
    UI --> Hooks
    Hooks --> API
    API -->|HTTPS + JWT| Router
    
    Router --> Messengers
    Router --> AI
    Router --> Business
    
    WPP --> WhatsApp
    Wappi --> WhatsApp
    Telegram --> TelegramAPI
    Voice --> OpenAI
    Chat --> OpenAI
    GPT --> OpenAI
    Payments --> TBank
    PBX --> OnlinePBX
    Import --> Holihope
    
    Messengers --> RLS
    AI --> RLS
    Business --> RLS
    RLS --> Tables
```

## Поток аутентификации

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant API as selfHostedApi
    participant Auth as Supabase Auth
    participant EF as Edge Function
    participant DB as PostgreSQL

    U->>F: Действие пользователя
    F->>Auth: getSession()
    Auth-->>F: JWT Token
    F->>API: selfHostedPost(fn, body)
    API->>API: Inject Authorization header
    API->>EF: POST /functions/v1/{fn}
    EF->>EF: Validate JWT
    EF->>DB: Query with RLS
    DB-->>EF: Data (filtered by org_id)
    EF-->>API: Response
    API-->>F: { success, data }
    F-->>U: UI Update
```

## Поток голосового ассистента

```mermaid
sequenceDiagram
    participant U as User
    participant VA as VoiceAssistant.tsx
    participant API as selfHostedApi
    participant EF as voice-assistant
    participant OpenAI as OpenAI API
    participant DB as PostgreSQL

    U->>VA: 🎤 Голосовая команда
    VA->>VA: MediaRecorder → Base64
    VA->>API: selfHostedPost('voice-assistant', {audio, context})
    API->>EF: POST with JWT
    
    alt Аудио вход
        EF->>OpenAI: Whisper STT
        OpenAI-->>EF: Транскрипция
    end
    
    EF->>OpenAI: GPT-4 (context + command)
    OpenAI-->>EF: Ответ + действия
    
    opt Голосовой ответ
        EF->>OpenAI: TTS
        OpenAI-->>EF: Audio Base64
    end
    
    EF->>DB: Логирование
    EF-->>API: {transcription, response, audioResponse, actionResult}
    API-->>VA: Response
    VA->>VA: executeActionResult()
    VA->>VA: 🔊 Воспроизведение аудио
    VA-->>U: UI обновление
```

## Поток WhatsApp сообщений (WPP)

```mermaid
sequenceDiagram
    participant WA as WhatsApp
    participant WH as wpp-webhook
    participant DB as PostgreSQL
    participant RT as Realtime
    participant UI as ChatWindow.tsx
    participant Send as wpp-send
    participant WPP as WPP Server

    Note over WA,UI: Входящее сообщение
    WA->>WPP: Сообщение
    WPP->>WH: Webhook POST
    WH->>WH: extractOrgIdFromSession()
    WH->>DB: INSERT chat_messages
    DB->>RT: Broadcast
    RT->>UI: postgres_changes
    UI->>UI: Обновление чата
    
    Note over WA,UI: Исходящее сообщение
    UI->>Send: selfHostedPost('wpp-send', {to, content})
    Send->>WPP: API call
    WPP->>WA: Отправка
    WA-->>WPP: Delivered
    WPP-->>Send: Status
    Send->>DB: UPDATE status
    Send-->>UI: Success
```

## Поток импорта Holihope

```mermaid
stateDiagram-v2
    [*] --> Idle
    
    Idle --> CheckRunning: Старт импорта
    CheckRunning --> AlreadyRunning: Импорт уже идёт
    AlreadyRunning --> Idle: Ожидание
    
    CheckRunning --> FetchBranches: Свободно
    FetchBranches --> ImportStudents: Батч студентов
    ImportStudents --> ImportClients: Батч клиентов
    ImportClients --> ImportGroups: Батч групп
    ImportGroups --> ImportSchedule: Батч расписания
    
    ImportSchedule --> CheckMore: Проверка
    CheckMore --> ImportStudents: Есть ещё данные
    CheckMore --> Complete: Всё импортировано
    
    Complete --> [*]
    
    note right of ImportStudents
        Каждый шаг:
        1. Fetch from Holihope API
        2. Transform data
        3. Upsert to PostgreSQL
        4. Update progress
    end note
```

## Поток платежей T-Bank

```mermaid
sequenceDiagram
    participant M as Manager
    participant UI as SendPaymentLinkModal
    participant Init as tbank-init-client
    participant TB as T-Bank API
    participant WH as tbank-webhook
    participant DB as PostgreSQL
    participant C as Client

    M->>UI: Создать ссылку на оплату
    UI->>Init: selfHostedPost({amount, student_id})
    Init->>DB: Получить данные студента
    Init->>TB: Init payment
    TB-->>Init: PaymentURL
    Init->>DB: INSERT payment_transactions
    Init-->>UI: {paymentUrl}
    UI-->>M: Ссылка готова
    
    M->>C: Отправить ссылку (WhatsApp/SMS)
    C->>TB: Оплата
    TB->>WH: Webhook (success/fail)
    WH->>DB: UPDATE payment_transactions
    WH->>DB: UPDATE student.balance
    
    opt Уведомление
        WH->>M: Push notification
    end
```

## Поток OnlinePBX звонков

```mermaid
sequenceDiagram
    participant M as Manager
    participant UI as WebRTCPhone
    participant Call as onlinepbx-call
    participant PBX as OnlinePBX API
    participant Phone as SIP Phone
    participant WH as onlinepbx-webhook
    participant DB as PostgreSQL

    M->>UI: Набрать номер
    UI->>Call: selfHostedPost({to_number, from_user})
    Call->>DB: Получить настройки PBX
    Call->>DB: Получить extension менеджера
    Call->>PBX: Initiate call
    PBX-->>Call: Call ID
    Call-->>UI: Success
    
    PBX->>Phone: Ring manager's phone
    Phone->>PBX: Answer
    PBX->>PBX: Connect to client
    
    Note over PBX,WH: После завершения звонка
    PBX->>WH: Webhook (call ended)
    WH->>WH: Verify webhook_key
    WH->>DB: INSERT call_logs
    WH->>DB: UPDATE client.last_call_at
    
    opt Запись звонка
        WH->>PBX: Get recording URL
        WH->>DB: UPDATE call_logs.recording_url
    end
```

## Поток публичных форм

```mermaid
flowchart LR
    subgraph Public["🌐 Публичные страницы"]
        Contact[Contacts.tsx]
        About[About.tsx]
        Test[PlacementTest.tsx]
        Schedule[ScheduleTable.tsx]
        Club[SpeakingClubModal.tsx]
    end
    
    subgraph API["⚡ API Layer"]
        Proxy[webhook-proxy]
    end
    
    subgraph Targets["🎯 Назначение"]
        N8N[N8N Workflow]
        CRM[CRM Tables]
        Notify[Notifications]
    end
    
    Contact -->|requireAuth: false| Proxy
    About -->|requireAuth: false| Proxy
    Test -->|requireAuth: false| Proxy
    Schedule -->|requireAuth: false| Proxy
    Club -->|requireAuth: false| Proxy
    
    Proxy -->|source: contact| N8N
    Proxy -->|source: franchise| N8N
    Proxy -->|source: placement_test| CRM
    Proxy -->|source: schedule| CRM
    Proxy -->|source: speaking_club| N8N
    
    N8N --> Notify
    CRM --> Notify
```

## Поток AI консультанта

```mermaid
flowchart TB
    subgraph Input["📥 Входные данные"]
        Text[Текстовый вопрос]
        Audio[Голосовой вопрос]
    end
    
    subgraph Processing["⚙️ Обработка"]
        Transcribe[transcribe-audio]
        Consultant[ai-consultant]
        RAG[Vector Search]
    end
    
    subgraph AI["🤖 AI Models"]
        Whisper[Whisper STT]
        GPT[GPT-4]
        Embed[Embeddings]
    end
    
    subgraph Output["📤 Ответ"]
        TextResp[Текстовый ответ]
        Sources[Источники]
    end
    
    Audio --> Transcribe
    Transcribe --> Whisper
    Whisper --> Text
    
    Text --> Consultant
    Consultant --> Embed
    Embed --> RAG
    RAG --> GPT
    GPT --> TextResp
    RAG --> Sources
```

## Мультитенантность и изоляция данных

```mermaid
flowchart TB
    subgraph Orgs["🏢 Организации"]
        Org1[Organization A]
        Org2[Organization B]
    end
    
    subgraph Auth["🔐 Аутентификация"]
        JWT1[JWT Token<br/>org_id: A]
        JWT2[JWT Token<br/>org_id: B]
    end
    
    subgraph EF["⚡ Edge Function"]
        Validate[Validate JWT]
        GetOrg[get_user_organization_id]
    end
    
    subgraph RLS["🛡️ Row Level Security"]
        Policy[organization_id = <br/>get_user_organization_id]
    end
    
    subgraph Data["🗄️ Данные"]
        DataA[(Данные Org A)]
        DataB[(Данные Org B)]
    end
    
    Org1 --> JWT1
    Org2 --> JWT2
    
    JWT1 --> Validate
    JWT2 --> Validate
    
    Validate --> GetOrg
    GetOrg --> Policy
    
    Policy -->|org_id = A| DataA
    Policy -->|org_id = B| DataB
```

## Cron Jobs и фоновые задачи

```mermaid
gantt
    title Расписание Cron Jobs
    dateFormat HH:mm
    axisFormat %H:%M
    
    section Мониторинг
    edge-health-monitor     :crit, 00:00, 5m
    sla-monitor            :00:00, 5m
    
    section Импорт
    import-salebot-chats-auto :06:00, 30m
    refresh-chat-threads-mv   :every 15min, 5m
    
    section Уведомления
    lesson-reminders         :08:00, 10m
    auto-payment-notifications :09:00, 15m
    
    section Обработка
    process-events          :active, every 1min, 1m
```

## Связанные документы

- [Self-Hosted API Architecture](./self-hosted-api.md)
- [Edge Functions Deployment](../migration/11-edge-functions-deployment.md)
- [RLS Policies](../migration/07-rls-policies.sql)
