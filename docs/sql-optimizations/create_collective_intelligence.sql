-- ============================================================
-- Collective Intelligence Layer
-- Выполнить на self-hosted: api.academyos.ru
-- Зависимость: базовые таблицы clients, chat_messages, profiles
--
-- Уровни:
--   1. team_behavior_events    — поведенческие траектории менеджеров
--   2. conversation_paths      — агрегированные пути диалогов
--   3. manager_performance     — materialized view метрик менеджеров
--   4. team_insights           — AI-сгенерированные инсайты команды
--   5. manager_coaching_tips   — персональные рекомендации от AI Coach
--
-- Архитектура:
--   chat_messages → триггер → team_behavior_events
--   team_behavior_events → cron → conversation_paths (агрегация)
--   conversation_paths + manager_performance → Edge Function (AI) → team_insights + coaching_tips
-- ============================================================

-- ==========================================
-- 1. Поведенческие события команды
-- ==========================================
-- Каждая запись = одно значимое действие менеджера в диалоге
-- Собирается автоматически триггером на chat_messages

CREATE TABLE IF NOT EXISTS public.team_behavior_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  manager_id UUID, -- profile_id менеджера (NULL для входящих клиентских событий)
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  conversation_id UUID, -- логическая группировка (client_id + дата)
  -- Поведенческие данные
  event_type TEXT NOT NULL, -- 'message_sent', 'first_response', 'follow_up', 'price_mentioned', 'trial_offered', 'close_attempted', 'client_message'
  stage TEXT, -- текущая стадия: 'greeting', 'qualification', 'presentation', 'objection', 'trial', 'close', 'lost'
  client_intent TEXT, -- intent входящего сообщения клиента (NULL для исходящих)
  response_time_sec INTEGER, -- время ответа в секундах (NULL если инициатива менеджера)
  message_length INTEGER, -- длина сообщения
  is_incoming BOOLEAN NOT NULL DEFAULT false, -- true = сообщение клиента
  -- Контекст
  hour_of_day SMALLINT, -- 0-23, час отправки
  day_of_week SMALLINT, -- 0-6, день недели (0=пн)
  client_type TEXT, -- 'new', 'returning', 'vip', 'cold'
  -- Результат (заполняется позже при закрытии диалога)
  outcome TEXT, -- 'converted', 'trial_booked', 'lost', 'pending', 'prolonged'
  --
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Миграция: добавить столбцы если таблица уже существовала
ALTER TABLE public.team_behavior_events ADD COLUMN IF NOT EXISTS client_intent TEXT;
ALTER TABLE public.team_behavior_events ADD COLUMN IF NOT EXISTS is_incoming BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.team_behavior_events ADD COLUMN IF NOT EXISTS stage TEXT;
ALTER TABLE public.team_behavior_events ADD COLUMN IF NOT EXISTS message_length INTEGER;

CREATE INDEX IF NOT EXISTS idx_tbe_org_manager ON public.team_behavior_events(organization_id, manager_id);
CREATE INDEX IF NOT EXISTS idx_tbe_conversation ON public.team_behavior_events(conversation_id);
CREATE INDEX IF NOT EXISTS idx_tbe_client ON public.team_behavior_events(client_id);
CREATE INDEX IF NOT EXISTS idx_tbe_created ON public.team_behavior_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tbe_event_type ON public.team_behavior_events(event_type);

ALTER TABLE public.team_behavior_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view team events" ON public.team_behavior_events;
CREATE POLICY "Org members can view team events"
  ON public.team_behavior_events FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Service role full access team events" ON public.team_behavior_events;
CREATE POLICY "Service role full access team events"
  ON public.team_behavior_events FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- 2. Пути диалогов (агрегированные)
-- ==========================================
-- Каждая запись = один завершённый диалог, сжатый в путь
-- Заполняется cron-задачей из team_behavior_events

CREATE TABLE IF NOT EXISTS public.conversation_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL,
  -- Путь
  stage_path TEXT[] NOT NULL, -- ['greeting', 'qualification', 'trial', 'close']
  event_path TEXT[] NOT NULL, -- ['first_response', 'follow_up', 'trial_offered', 'close_attempted']
  -- Метрики пути
  total_messages INTEGER NOT NULL DEFAULT 0,
  manager_messages INTEGER NOT NULL DEFAULT 0,
  client_messages INTEGER NOT NULL DEFAULT 0,
  avg_response_time_sec NUMERIC(10,2),
  first_response_time_sec INTEGER,
  total_duration_hours NUMERIC(10,2), -- от первого до последнего сообщения
  -- Контекст
  primary_hour SMALLINT, -- основной час общения
  primary_day SMALLINT, -- основной день
  client_type TEXT,
  -- Результат
  outcome TEXT NOT NULL, -- 'converted', 'trial_booked', 'lost', 'pending', 'prolonged'
  outcome_value NUMERIC(10,2) DEFAULT 0, -- сумма оплаты если есть
  --
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_cp_org_outcome ON public.conversation_paths(organization_id, outcome);
CREATE INDEX IF NOT EXISTS idx_cp_manager ON public.conversation_paths(manager_id);
CREATE INDEX IF NOT EXISTS idx_cp_stage_path ON public.conversation_paths USING GIN(stage_path);

ALTER TABLE public.conversation_paths ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view conversation paths" ON public.conversation_paths;
CREATE POLICY "Org members can view conversation paths"
  ON public.conversation_paths FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Service role full access conversation paths" ON public.conversation_paths;
CREATE POLICY "Service role full access conversation paths"
  ON public.conversation_paths FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- 3. Снимки производительности менеджеров
-- ==========================================
-- Периодические агрегаты по каждому менеджеру (ежедневно)

CREATE TABLE IF NOT EXISTS public.manager_performance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL,
  snapshot_date DATE NOT NULL,
  -- Объёмные метрики
  total_conversations INTEGER DEFAULT 0,
  total_messages_sent INTEGER DEFAULT 0,
  unique_clients INTEGER DEFAULT 0,
  -- Конверсия
  conversations_converted INTEGER DEFAULT 0,
  conversations_trial INTEGER DEFAULT 0,
  conversations_lost INTEGER DEFAULT 0,
  conversion_rate NUMERIC(5,2) DEFAULT 0,
  -- Скорость
  avg_response_time_sec NUMERIC(10,2),
  median_response_time_sec NUMERIC(10,2),
  p90_response_time_sec NUMERIC(10,2),
  avg_first_response_sec NUMERIC(10,2),
  -- Качество
  avg_message_length NUMERIC(10,2),
  avg_messages_per_conversation NUMERIC(10,2),
  -- Паттерны
  most_common_path TEXT[], -- самый частый stage_path
  most_successful_path TEXT[], -- путь с лучшей конверсией
  peak_hour SMALLINT,
  peak_day SMALLINT,
  -- Сравнение с командой
  rank_conversion INTEGER, -- ранг по конверсии среди коллег
  rank_speed INTEGER, -- ранг по скорости ответа
  team_avg_conversion NUMERIC(5,2), -- средняя конверсия команды для сравнения
  --
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(manager_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_mps_org_date ON public.manager_performance_snapshots(organization_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_mps_manager ON public.manager_performance_snapshots(manager_id, snapshot_date DESC);

ALTER TABLE public.manager_performance_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view performance snapshots" ON public.manager_performance_snapshots;
CREATE POLICY "Admins can view performance snapshots"
  ON public.manager_performance_snapshots FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (SELECT has_role(auth.uid(), 'admin') OR manager_id = auth.uid()));

DROP POLICY IF EXISTS "Service role full access performance" ON public.manager_performance_snapshots;
CREATE POLICY "Service role full access performance"
  ON public.manager_performance_snapshots FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- 4. Инсайты команды (AI-сгенерированные)
-- ==========================================
-- Генерируются Edge Function через LLM анализ conversation_paths + performance

CREATE TABLE IF NOT EXISTS public.team_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Тип инсайта
  insight_type TEXT NOT NULL CHECK (insight_type IN (
    'path_efficiency',      -- эффективность путей диалогов
    'timing_pattern',       -- паттерны времени
    'team_bottleneck',      -- узкие места команды
    'behavior_drift',       -- дрейф поведения
    'conversion_driver',    -- драйверы конверсии
    'loss_pattern',         -- паттерны потерь
    'best_practice',        -- лучшие практики из данных
    'anomaly'               -- аномалия в поведении
  )),
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical', 'opportunity')),
  -- Контент
  title TEXT NOT NULL, -- краткий заголовок
  description TEXT NOT NULL, -- подробное описание
  recommendation TEXT, -- что делать
  -- Данные
  evidence JSONB DEFAULT '{}', -- числа, примеры, подтверждения
  affected_managers UUID[], -- кого касается
  affected_paths TEXT[][], -- какие пути затронуты
  -- Метрики инсайта
  potential_impact_pct NUMERIC(5,2), -- потенциальный рост конверсии %
  confidence NUMERIC(5,2), -- уверенность AI 0-100
  -- Жизненный цикл
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed')),
  acknowledged_by UUID, -- кто прочитал
  acknowledged_at TIMESTAMPTZ,
  --
  period_start DATE, -- за какой период
  period_end DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ti_org_status ON public.team_insights(organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ti_type ON public.team_insights(insight_type);

ALTER TABLE public.team_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view team insights" ON public.team_insights;
CREATE POLICY "Admins can view team insights"
  ON public.team_insights FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update team insights" ON public.team_insights;
CREATE POLICY "Admins can update team insights"
  ON public.team_insights FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role full access insights" ON public.team_insights;
CREATE POLICY "Service role full access insights"
  ON public.team_insights FOR ALL USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS update_team_insights_updated_at ON public.team_insights;
CREATE TRIGGER update_team_insights_updated_at
  BEFORE UPDATE ON public.team_insights
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- 5. Персональные коучинг-рекомендации
-- ==========================================
-- AI Coach: персонализированные советы каждому менеджеру

CREATE TABLE IF NOT EXISTS public.manager_coaching_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL,
  -- Контент
  category TEXT NOT NULL CHECK (category IN (
    'speed',          -- скорость ответа
    'qualification',  -- квалификация клиента
    'objection',      -- работа с возражениями
    'closing',        -- закрытие сделки
    'follow_up',      -- follow-up
    'tone',           -- тон общения
    'timing',         -- выбор времени
    'general'         -- общее
  )),
  title TEXT NOT NULL,
  tip TEXT NOT NULL, -- текст рекомендации
  example_good TEXT, -- пример хорошего поведения
  example_bad TEXT, -- пример плохого поведения (анонимизированный)
  -- Основание
  based_on JSONB DEFAULT '{}', -- на каких данных основано
  comparison_with TEXT, -- 'team_avg', 'top_performer', 'own_history'
  metric_current NUMERIC(10,2), -- текущее значение метрики менеджера
  metric_target NUMERIC(10,2), -- целевое значение
  -- Жизненный цикл
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'seen', 'applied', 'dismissed')),
  seen_at TIMESTAMPTZ,
  --
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mct_manager_status ON public.manager_coaching_tips(manager_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mct_org ON public.manager_coaching_tips(organization_id, created_at DESC);

ALTER TABLE public.manager_coaching_tips ENABLE ROW LEVEL SECURITY;

-- Менеджер видит только свои советы
DROP POLICY IF EXISTS "Managers can view own coaching tips" ON public.manager_coaching_tips;
CREATE POLICY "Managers can view own coaching tips"
  ON public.manager_coaching_tips FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND manager_id = auth.uid());

-- Менеджер может обновить статус своего совета
DROP POLICY IF EXISTS "Managers can update own coaching tips" ON public.manager_coaching_tips;
CREATE POLICY "Managers can update own coaching tips"
  ON public.manager_coaching_tips FOR UPDATE
  USING (manager_id = auth.uid());

-- Админ видит все советы
DROP POLICY IF EXISTS "Admins can view all coaching tips" ON public.manager_coaching_tips;
CREATE POLICY "Admins can view all coaching tips"
  ON public.manager_coaching_tips FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role full access coaching" ON public.manager_coaching_tips;
CREATE POLICY "Service role full access coaching"
  ON public.manager_coaching_tips FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- 6. Триггер: chat_messages → team_behavior_events
-- ==========================================
-- Автоматически записывает поведенческое событие при каждом
-- исходящем сообщении менеджера (direction='outgoing' или is_outgoing=true)

CREATE OR REPLACE FUNCTION public.track_team_behavior_event()
RETURNS TRIGGER AS $$
DECLARE
  v_is_outgoing BOOLEAN;
  v_response_time INTEGER;
  v_last_msg TIMESTAMPTZ;
  v_conversation_id UUID;
  v_client_type TEXT;
  v_event_type TEXT;
  v_msg_count INTEGER;
  v_stage TEXT := 'general';
  v_client_intent TEXT := NULL;
  v_text TEXT;
  v_all_texts TEXT;
BEGIN
  -- Только сообщения с привязкой к клиенту
  IF NEW.client_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Определяем направление (совместимость self-hosted)
  v_is_outgoing := COALESCE(
    NEW.direction = 'outgoing',
    (NEW.metadata->>'is_outgoing')::BOOLEAN,
    false
  );

  -- Генерируем conversation_id
  v_conversation_id := gen_random_uuid();

  -- Нормализуем текст
  v_text := lower(COALESCE(NEW.content, ''));

  -- Контекст последних 5 сообщений
  SELECT string_agg(lower(COALESCE(content, '')), ' ' ORDER BY created_at DESC)
  INTO v_all_texts
  FROM (
    SELECT content, created_at
    FROM public.chat_messages
    WHERE client_id = NEW.client_id
    ORDER BY created_at DESC
    LIMIT 5
  ) recent;
  v_all_texts := COALESCE(v_all_texts, v_text);

  -- Тип клиента
  SELECT CASE
    WHEN c.status = 'new' THEN 'new'
    WHEN c.status IN ('active', 'enrolled') THEN 'returning'
    ELSE COALESCE(c.status, 'new')
  END INTO v_client_type
  FROM public.clients c WHERE c.id = NEW.client_id;

  -- ================================================================
  -- ВХОДЯЩИЕ сообщения клиента → определяем client_intent
  -- ================================================================
  IF NOT v_is_outgoing THEN
    v_event_type := 'client_message';

    -- Определяем intent клиента по ключевым словам
    -- Приоритет: от специфичных к общим

    -- 1. COMPLAINT (жалоба / негатив)
    IF v_text ~* '(жалоб|претензи|недовол|ужасн|отвратительн|кошмар|безобрази|обман|возврат.*денег|верните.*деньги)'
       OR v_text ~* '(плохо|ужас|хам|грубо|невежлив|не отвечает|игнорир|обратиться.*руководств)'
       OR v_text ~* '(написать.*жалоб|оставить.*отзыв.*негатив|роспотребнадзор|прокуратур)'
    THEN
      v_client_intent := 'complaint';

    -- 2. CANCELLATION (отмена / отказ)
    ELSIF v_text ~* '(отмен|отказ|не.*прид|не.*смог|перенес|не.*получится|передумал|не.*хочу|расторг)'
       OR v_text ~* '(верните.*деньги|возврат|не.*буду.*ходить|забрать.*документ|уход[иь]м)'
    THEN
      v_client_intent := 'cancellation';

    -- 3. PRICE_INQUIRY (вопрос о цене)
    ELSIF v_text ~* '(сколько.*стоит|цен[аы]|стоимость|прайс|тариф|абонемент|сколько.*стоят|почём)'
       OR v_text ~* '(сколько.*платить|какая.*цена|какая.*стоимость|за.*месяц|за.*занятие|за.*урок)'
       OR v_text ~* '(скидк|акци|промо|дешевл|подешевле|есть.*скидк|рассрочк)'
    THEN
      v_client_intent := 'price_inquiry';

    -- 4. SCHEDULE_INQUIRY (вопрос о расписании)
    ELSIF v_text ~* '(расписани|когда.*занят|во сколько|в какое.*время|какие.*дни|график|свободн.*врем)'
       OR v_text ~* '(утр[оа]|вечер|день|суббот|воскресен|будн|выходн|понедельник|вторник|сред[аы]|четверг|пятниц)'
       OR v_text ~* '(есть.*место|есть.*группа|когда.*начало|когда.*старт|набор.*групп)'
    THEN
      v_client_intent := 'schedule_inquiry';

    -- 5. TRIAL_REQUEST (запрос пробного)
    ELSIF v_text ~* '(пробн|попробовать|ознакомительн|первое.*занят|бесплатн.*занят|тестов)'
       OR v_text ~* '(можно.*попроб|хочу.*попроб|записаться.*пробн|пробный.*урок)'
    THEN
      v_client_intent := 'trial_request';

    -- 6. ENROLLMENT (запись / оформление)
    ELSIF v_text ~* '(записаться|запиши|оформить|хочу.*начать|готов.*начать|когда.*начинаем)'
       OR v_text ~* '(хочу.*в.*группу|запиш.*ребён|хочу.*на.*курс|готов.*оплат|как.*оплатить)'
    THEN
      v_client_intent := 'enrollment';

    -- 7. PROGRAM_INQUIRY (вопрос о программе / курсе)
    ELSIF v_text ~* '(какие.*курс|какие.*програм|какие.*направлен|чему.*учите|что.*преподаёте)'
       OR v_text ~* '(для.*начинающ|для.*продвинут|для.*детей|для.*взросл|какой.*уровень)'
       OR v_text ~* '(какие.*предмет|что.*входит|что.*включен|программа.*обучен|чем.*отличает)'
    THEN
      v_client_intent := 'program_inquiry';

    -- 8. LOCATION_INQUIRY (вопрос о месте / филиале)
    ELSIF v_text ~* '(где.*находит|адрес|как.*добрат|как.*доехать|какой.*филиал|ближайш)'
       OR v_text ~* '(район|метро|парковк|есть.*рядом|на.*карте|дорог[уа].*к.*вам)'
    THEN
      v_client_intent := 'location_inquiry';

    -- 9. TEACHER_INQUIRY (вопрос о преподавателе)
    ELSIF v_text ~* '(кто.*преподаёт|преподаватель|учитель|тренер|педагог|опыт.*преподавател)'
       OR v_text ~* '(квалификаци|образовани.*преподавател|какой.*преподаватель|можно.*выбрать.*преподавател)'
    THEN
      v_client_intent := 'teacher_inquiry';

    -- 10. PAYMENT_QUESTION (вопрос об оплате)
    ELSIF v_text ~* '(как.*оплатить|способ.*оплат|карт[ой]|наличн|безналичн|перевод|рассрочк|кредит)'
       OR v_text ~* '(реквизит|счёт|инвойс|квитанци|чек|договор|документ|справк)'
    THEN
      v_client_intent := 'payment_question';

    -- 11. POSITIVE_FEEDBACK (положительный отзыв)
    ELSIF v_text ~* '(спасиб|благодар|отлично|замечательн|прекрасн|супер|класс|молодц|нравится|довольн|рекомендую)'
       OR v_text ~* '(всё.*хорошо|всё.*нравится|всё.*устраивает|хорошие.*занят|отличн.*преподавател)'
    THEN
      v_client_intent := 'positive_feedback';

    -- 12. GREETING (приветствие)
    ELSIF v_text ~* '(здравствуйте|добрый|привет|доброе утро|добрый день|добрый вечер|алло|хай|хелло)'
       AND length(v_text) < 50
    THEN
      v_client_intent := 'greeting';

    -- 13. GENERAL_QUESTION (общий вопрос)
    ELSIF v_text ~* '\?' OR v_text ~* '(подскажите|расскажите|объясните|уточните|интересу|хотел.*бы.*узнать)'
    THEN
      v_client_intent := 'general_question';

    -- 14. SILENCE_BREAK (возвращение после молчания)
    ELSIF v_text ~* '(вернуться|ещё.*актуальн|вспомнил|решил.*всё.*таки|передумал|давайте.*попроб)'
    THEN
      v_client_intent := 'silence_break';

    ELSE
      v_client_intent := 'other';
    END IF;

    -- Определяем stage из контекста для входящих
    IF v_client_intent IN ('complaint', 'cancellation') THEN
      v_stage := 'lost';
    ELSIF v_client_intent = 'price_inquiry' THEN
      v_stage := 'price';
    ELSIF v_client_intent = 'trial_request' THEN
      v_stage := 'trial';
    ELSIF v_client_intent = 'enrollment' THEN
      v_stage := 'close';
    ELSIF v_client_intent IN ('program_inquiry', 'teacher_inquiry') THEN
      v_stage := 'presentation';
    ELSIF v_client_intent IN ('schedule_inquiry', 'location_inquiry', 'payment_question', 'general_question') THEN
      v_stage := 'qualification';
    ELSIF v_client_intent = 'greeting' THEN
      v_stage := 'greeting';
    ELSIF v_client_intent = 'silence_break' THEN
      v_stage := 'follow_up';
    END IF;

    -- Вставляем событие клиента
    INSERT INTO public.team_behavior_events (
      organization_id, manager_id, client_id, conversation_id,
      event_type, stage, client_intent, message_length, is_incoming,
      hour_of_day, day_of_week, client_type
    ) VALUES (
      NEW.organization_id, NEW.sender_id, NEW.client_id, v_conversation_id,
      v_event_type, v_stage, v_client_intent, COALESCE(length(NEW.content), 0), true,
      EXTRACT(HOUR FROM NEW.created_at)::SMALLINT,
      EXTRACT(ISODOW FROM NEW.created_at)::SMALLINT - 1,
      v_client_type
    );

    RETURN NEW;
  END IF;

  -- ================================================================
  -- ИСХОДЯЩИЕ сообщения менеджера → определяем stage + event_type
  -- ================================================================
  IF NEW.sender_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Время ответа: разница с последним входящим сообщением
  SELECT created_at INTO v_last_msg
  FROM public.chat_messages
  WHERE client_id = NEW.client_id
    AND id != NEW.id
    AND (direction = 'incoming' OR (metadata->>'is_outgoing')::BOOLEAN = false)
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_last_msg IS NOT NULL THEN
    v_response_time := EXTRACT(EPOCH FROM (NEW.created_at - v_last_msg))::INTEGER;
    IF v_response_time > 86400 THEN
      v_response_time := NULL;
    END IF;
  END IF;

  -- Определяем тип события
  SELECT count(*) INTO v_msg_count
  FROM public.chat_messages
  WHERE client_id = NEW.client_id
    AND sender_id = NEW.sender_id
    AND (direction = 'outgoing' OR (metadata->>'is_outgoing')::BOOLEAN = true)
    AND id != NEW.id;

  IF v_msg_count = 0 THEN
    v_event_type := 'first_response';
  ELSE
    v_event_type := 'follow_up';
  END IF;

  -- Определение стадии диалога (stage) по ключевым словам менеджера
  -- 1. CLOSE
  IF v_text ~* '(оплат|оформ|запис|договор|подтвер|готов.*начать|ждём вас|до встречи|увидимся|забронир)'
     OR v_text ~* '(реквизит|счёт|перевод|карт[аеу]|сбер|тинькофф|внес.*оплат)'
  THEN
    v_stage := 'close';
  -- 2. TRIAL
  ELSIF v_text ~* '(пробн|ознакомительн|первое занятие|попробо|бесплатн.*занят|тестов.*урок|приходите.*попроб)'
     OR v_all_texts ~* '(пробн.*занят|пробн.*урок|первое.*бесплатн)'
  THEN
    v_stage := 'trial';
  -- 3. OBJECTION
  ELSIF v_text ~* '(доро|не уверен|подума|сравн|конкурент|альтернатив|сомнев|не подход|другой вариант|гарант)'
     OR v_text ~* '(скидк|акци|промокод|дешевл|бонус|специальн.*предлож)'
  THEN
    v_stage := 'objection';
  -- 4. PRESENTATION
  ELSIF v_text ~* '(програм|курс|направлен|предмет|группа|расписани|формат|индивидуальн|преподавател|методик)'
     OR v_text ~* '(включа|состоит из|длительность|продолжительн|в программ|у нас есть|предлага|мы проводим)'
  THEN
    v_stage := 'presentation';
  -- 5. PRICE
  ELSIF v_text ~* '(стоим|цен|прайс|тариф|абонемент|руб|₽|рублей|стоит|за месяц|за занятие|оплат.*варианты)'
  THEN
    v_stage := 'price';
    v_event_type := 'price_mentioned';
  -- 6. QUALIFICATION
  ELSIF v_text ~* '(какой возраст|сколько лет|для кого|цел[ьи]|задач|уровень.*подготовк|опыт|раньше занимал)'
     OR v_text ~* '(что.*важно|что.*интересу|какой.*результат|как.*давно|пожелани|предпочтени|что.*хотите)'
  THEN
    v_stage := 'qualification';
  -- 7. GREETING
  ELSIF v_text ~* '(здравствуйте|добрый|привет|доброе утро|добрый день|добрый вечер|рад.*приветств)'
     OR v_msg_count = 0
  THEN
    v_stage := 'greeting';
  -- 8. FOLLOW_UP
  ELSIF v_text ~* '(напомин|вернуться.*вопрос|как.*решили|думали.*предложени|ещё актуальн|есть.*вопрос)'
  THEN
    v_stage := 'follow_up';
  -- 9. LOST
  ELSIF v_text ~* '(жаль|к сожалени|понима|если.*передумаете|будем.*рады|всегда.*можете.*вернуть)'
  THEN
    v_stage := 'lost';
  END IF;

  -- Дополнительно уточняем event_type
  IF v_text ~* '(пробн.*занят|записать.*пробн|приглаша.*пробн)' AND v_event_type != 'first_response' THEN
    v_event_type := 'trial_offered';
  ELSIF v_text ~* '(оформ|запис.*группу|забронир|подтвер.*запис)' AND v_event_type != 'first_response' THEN
    v_event_type := 'close_attempted';
  END IF;

  -- Вставляем событие менеджера
  INSERT INTO public.team_behavior_events (
    organization_id, manager_id, client_id, conversation_id,
    event_type, stage, response_time_sec, message_length, is_incoming,
    hour_of_day, day_of_week, client_type
  ) VALUES (
    NEW.organization_id, NEW.sender_id, NEW.client_id, v_conversation_id,
    v_event_type, v_stage, v_response_time, COALESCE(length(NEW.content), 0), false,
    EXTRACT(HOUR FROM NEW.created_at)::SMALLINT,
    EXTRACT(ISODOW FROM NEW.created_at)::SMALLINT - 1,
    v_client_type
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS track_team_behavior_on_message ON public.chat_messages;
CREATE TRIGGER track_team_behavior_on_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.track_team_behavior_event();

COMMENT ON FUNCTION public.track_team_behavior_event() IS
  'Записывает поведенческое событие при каждом сообщении: для менеджеров — stage и event_type, для клиентов — client_intent. Анализ по ключевым словам.';

-- Индекс для быстрого поиска по client_intent
CREATE INDEX IF NOT EXISTS idx_tbe_client_intent ON public.team_behavior_events(client_intent) WHERE client_intent IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tbe_incoming ON public.team_behavior_events(is_incoming, created_at DESC);

-- ==========================================
-- 7. Функция: агрегация путей диалогов
-- ==========================================
-- Вызывается по cron, собирает незакрытые диалоги в conversation_paths

CREATE OR REPLACE FUNCTION public.aggregate_conversation_paths(p_organization_id UUID DEFAULT NULL)
RETURNS TABLE(processed BIGINT) AS $$
BEGIN
  -- Собираем пути из team_behavior_events
  -- Группировка: client_id + manager_id + "сессия" (перерыв > 24ч = новая сессия)
  INSERT INTO public.conversation_paths (
    organization_id, manager_id, client_id, conversation_id,
    stage_path, event_path,
    total_messages, manager_messages, client_messages,
    avg_response_time_sec, first_response_time_sec,
    primary_hour, client_type, outcome,
    started_at, ended_at
  )
  SELECT
    e.organization_id,
    e.manager_id,
    e.client_id,
    e.conversation_id,
    -- Уникальные стадии в порядке появления
    ARRAY(SELECT DISTINCT unnest FROM unnest(array_agg(e.stage ORDER BY e.created_at)) WHERE unnest IS NOT NULL),
    -- Все события в порядке
    array_agg(e.event_type ORDER BY e.created_at),
    -- Метрики
    count(*)::INTEGER,
    count(*) FILTER (WHERE e.event_type IN ('first_response', 'follow_up'))::INTEGER,
    0, -- client_messages заполним отдельно
    ROUND(AVG(e.response_time_sec) FILTER (WHERE e.response_time_sec IS NOT NULL), 2),
    MIN(e.response_time_sec) FILTER (WHERE e.event_type = 'first_response'),
    MODE() WITHIN GROUP (ORDER BY e.hour_of_day),
    MODE() WITHIN GROUP (ORDER BY e.client_type),
    COALESCE(MODE() WITHIN GROUP (ORDER BY e.outcome), 'pending'),
    MIN(e.created_at),
    MAX(e.created_at)
  FROM public.team_behavior_events e
  WHERE (p_organization_id IS NULL OR e.organization_id = p_organization_id)
    AND e.conversation_id NOT IN (SELECT conversation_id FROM public.conversation_paths)
    -- Только "завершённые" сессии (последнее событие > 2ч назад)
    AND e.conversation_id IN (
      SELECT conversation_id FROM public.team_behavior_events
      GROUP BY conversation_id
      HAVING MAX(created_at) < now() - interval '2 hours'
    )
  GROUP BY e.organization_id, e.manager_id, e.client_id, e.conversation_id
  ON CONFLICT (conversation_id) DO NOTHING;

  GET DIAGNOSTICS processed = ROW_COUNT;
  RETURN QUERY SELECT processed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.aggregate_conversation_paths(UUID) IS
  'Агрегирует team_behavior_events в conversation_paths. Обрабатывает сессии, неактивные > 2ч.';

-- ==========================================
-- 8. Функция: снимок производительности менеджеров
-- ==========================================

CREATE OR REPLACE FUNCTION public.snapshot_manager_performance(
  p_organization_id UUID,
  p_date DATE DEFAULT CURRENT_DATE - 1
)
RETURNS TABLE(managers_processed BIGINT) AS $$
BEGIN
  INSERT INTO public.manager_performance_snapshots (
    organization_id, manager_id, snapshot_date,
    total_conversations, total_messages_sent, unique_clients,
    conversations_converted, conversations_trial, conversations_lost,
    conversion_rate,
    avg_response_time_sec, avg_first_response_sec,
    avg_message_length, avg_messages_per_conversation,
    most_common_path, peak_hour
  )
  SELECT
    cp.organization_id,
    cp.manager_id,
    p_date,
    COUNT(*)::INTEGER,
    SUM(cp.manager_messages)::INTEGER,
    COUNT(DISTINCT cp.client_id)::INTEGER,
    COUNT(*) FILTER (WHERE cp.outcome = 'converted')::INTEGER,
    COUNT(*) FILTER (WHERE cp.outcome = 'trial_booked')::INTEGER,
    COUNT(*) FILTER (WHERE cp.outcome = 'lost')::INTEGER,
    CASE WHEN COUNT(*) > 0
      THEN ROUND(COUNT(*) FILTER (WHERE cp.outcome IN ('converted', 'trial_booked'))::NUMERIC / COUNT(*) * 100, 2)
      ELSE 0 END,
    ROUND(AVG(cp.avg_response_time_sec), 2),
    ROUND(AVG(cp.first_response_time_sec), 2),
    ROUND(AVG(cp.total_messages::NUMERIC / NULLIF(cp.manager_messages, 0)), 2),
    ROUND(AVG(cp.manager_messages), 2),
    -- Самый частый путь (упрощённо — первый по частоте)
    (SELECT stage_path FROM conversation_paths cp2
     WHERE cp2.manager_id = cp.manager_id
       AND cp2.started_at::DATE = p_date
     GROUP BY stage_path ORDER BY count(*) DESC LIMIT 1),
    MODE() WITHIN GROUP (ORDER BY cp.primary_hour)
  FROM public.conversation_paths cp
  WHERE cp.organization_id = p_organization_id
    AND cp.started_at::DATE = p_date
  GROUP BY cp.organization_id, cp.manager_id
  ON CONFLICT (manager_id, snapshot_date) DO UPDATE SET
    total_conversations = EXCLUDED.total_conversations,
    total_messages_sent = EXCLUDED.total_messages_sent,
    unique_clients = EXCLUDED.unique_clients,
    conversations_converted = EXCLUDED.conversations_converted,
    conversations_trial = EXCLUDED.conversations_trial,
    conversations_lost = EXCLUDED.conversations_lost,
    conversion_rate = EXCLUDED.conversion_rate,
    avg_response_time_sec = EXCLUDED.avg_response_time_sec,
    avg_first_response_sec = EXCLUDED.avg_first_response_sec,
    avg_message_length = EXCLUDED.avg_message_length,
    avg_messages_per_conversation = EXCLUDED.avg_messages_per_conversation,
    most_common_path = EXCLUDED.most_common_path,
    peak_hour = EXCLUDED.peak_hour;

  GET DIAGNOSTICS managers_processed = ROW_COUNT;
  RETURN QUERY SELECT managers_processed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.snapshot_manager_performance(UUID, DATE) IS
  'Создаёт ежедневный снимок производительности менеджеров из conversation_paths.';

-- ==========================================
-- 9. Функция: топ путей по конверсии
-- ==========================================

CREATE OR REPLACE FUNCTION public.get_top_conversation_paths(
  p_organization_id UUID,
  p_days INTEGER DEFAULT 30,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  stage_path TEXT[],
  total_conversations BIGINT,
  converted BIGINT,
  conversion_rate NUMERIC,
  avg_response_time NUMERIC,
  avg_messages NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.stage_path,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE cp.outcome IN ('converted', 'trial_booked'))::BIGINT,
    ROUND(COUNT(*) FILTER (WHERE cp.outcome IN ('converted', 'trial_booked'))::NUMERIC / COUNT(*) * 100, 2),
    ROUND(AVG(cp.avg_response_time_sec), 2),
    ROUND(AVG(cp.total_messages), 1)
  FROM public.conversation_paths cp
  WHERE cp.organization_id = p_organization_id
    AND cp.started_at > now() - (p_days || ' days')::INTERVAL
  GROUP BY cp.stage_path
  HAVING COUNT(*) >= 3 -- минимум 3 диалога для статистической значимости
  ORDER BY conversion_rate DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_top_conversation_paths(UUID, INTEGER, INTEGER) IS
  'Возвращает топ путей диалогов по конверсии за указанный период.';

-- ==========================================
-- 10. Функция: сравнение менеджеров
-- ==========================================

CREATE OR REPLACE FUNCTION public.get_manager_comparison(
  p_organization_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  manager_id UUID,
  manager_name TEXT,
  total_conversations BIGINT,
  conversion_rate NUMERIC,
  avg_response_time NUMERIC,
  avg_first_response NUMERIC,
  most_used_path TEXT[],
  best_path TEXT[],
  peak_hour SMALLINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.manager_id,
    COALESCE(p.first_name || ' ' || p.last_name, p.email, cp.manager_id::TEXT),
    COUNT(*)::BIGINT,
    ROUND(COUNT(*) FILTER (WHERE cp.outcome IN ('converted', 'trial_booked'))::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2),
    ROUND(AVG(cp.avg_response_time_sec), 2),
    ROUND(AVG(cp.first_response_time_sec), 2),
    -- Самый частый путь
    (SELECT cp2.stage_path FROM conversation_paths cp2
     WHERE cp2.manager_id = cp.manager_id
       AND cp2.started_at > now() - (p_days || ' days')::INTERVAL
     GROUP BY cp2.stage_path ORDER BY count(*) DESC LIMIT 1),
    -- Лучший путь по конверсии (мин 2 диалога)
    (SELECT cp3.stage_path FROM conversation_paths cp3
     WHERE cp3.manager_id = cp.manager_id
       AND cp3.started_at > now() - (p_days || ' days')::INTERVAL
     GROUP BY cp3.stage_path
     HAVING count(*) >= 2
     ORDER BY count(*) FILTER (WHERE cp3.outcome IN ('converted', 'trial_booked'))::NUMERIC / count(*) DESC
     LIMIT 1),
    MODE() WITHIN GROUP (ORDER BY cp.primary_hour)
  FROM public.conversation_paths cp
  LEFT JOIN public.profiles p ON p.id = cp.manager_id
  WHERE cp.organization_id = p_organization_id
    AND cp.started_at > now() - (p_days || ' days')::INTERVAL
  GROUP BY cp.manager_id, p.first_name, p.last_name, p.email
  ORDER BY conversion_rate DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_manager_comparison(UUID, INTEGER) IS
  'Сравнение менеджеров по конверсии, скорости и паттернам за указанный период.';

-- ==========================================
-- 11. Функция: командные метрики
-- ==========================================

CREATE OR REPLACE FUNCTION public.get_team_metrics(
  p_organization_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  total_conversations BIGINT,
  total_converted BIGINT,
  team_conversion_rate NUMERIC,
  avg_response_time NUMERIC,
  avg_first_response NUMERIC,
  top_conversion_path TEXT[],
  worst_loss_path TEXT[],
  best_hour SMALLINT,
  worst_hour SMALLINT,
  active_managers BIGINT,
  conversion_spread NUMERIC -- разброс конверсии между менеджерами (стд. отклонение)
) AS $$
BEGIN
  RETURN QUERY
  WITH manager_rates AS (
    SELECT
      cp.manager_id,
      COUNT(*) FILTER (WHERE cp.outcome IN ('converted', 'trial_booked'))::NUMERIC / NULLIF(COUNT(*), 0) * 100 as rate
    FROM conversation_paths cp
    WHERE cp.organization_id = p_organization_id
      AND cp.started_at > now() - (p_days || ' days')::INTERVAL
    GROUP BY cp.manager_id
    HAVING COUNT(*) >= 3
  ),
  hourly AS (
    SELECT
      cp.primary_hour,
      COUNT(*) FILTER (WHERE cp.outcome IN ('converted', 'trial_booked'))::NUMERIC / NULLIF(COUNT(*), 0) * 100 as rate
    FROM conversation_paths cp
    WHERE cp.organization_id = p_organization_id
      AND cp.started_at > now() - (p_days || ' days')::INTERVAL
    GROUP BY cp.primary_hour
    HAVING COUNT(*) >= 3
  )
  SELECT
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE cp.outcome IN ('converted', 'trial_booked'))::BIGINT,
    ROUND(COUNT(*) FILTER (WHERE cp.outcome IN ('converted', 'trial_booked'))::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2),
    ROUND(AVG(cp.avg_response_time_sec), 2),
    ROUND(AVG(cp.first_response_time_sec), 2),
    -- Лучший путь
    (SELECT cp2.stage_path FROM conversation_paths cp2
     WHERE cp2.organization_id = p_organization_id
       AND cp2.started_at > now() - (p_days || ' days')::INTERVAL
     GROUP BY cp2.stage_path HAVING count(*) >= 3
     ORDER BY count(*) FILTER (WHERE cp2.outcome IN ('converted', 'trial_booked'))::NUMERIC / count(*) DESC LIMIT 1),
    -- Худший путь (потери)
    (SELECT cp3.stage_path FROM conversation_paths cp3
     WHERE cp3.organization_id = p_organization_id
       AND cp3.started_at > now() - (p_days || ' days')::INTERVAL
       AND cp3.outcome = 'lost'
     GROUP BY cp3.stage_path HAVING count(*) >= 3
     ORDER BY count(*) DESC LIMIT 1),
    (SELECT h.primary_hour FROM hourly h ORDER BY h.rate DESC LIMIT 1),
    (SELECT h.primary_hour FROM hourly h ORDER BY h.rate ASC LIMIT 1),
    (SELECT COUNT(DISTINCT mr.manager_id) FROM manager_rates mr)::BIGINT,
    ROUND((SELECT stddev(mr.rate) FROM manager_rates mr), 2)
  FROM conversation_paths cp
  WHERE cp.organization_id = p_organization_id
    AND cp.started_at > now() - (p_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_team_metrics(UUID, INTEGER) IS
  'Командные метрики: конверсия, скорость, лучшие/худшие пути, часы, разброс между менеджерами.';

-- ==========================================
-- 12. pg_cron задачи
-- ==========================================

-- Агрегация путей — каждые 3 часа
DO $$
BEGIN
  PERFORM cron.unschedule('aggregate-conversation-paths');
EXCEPTION WHEN others THEN NULL;
END;
$$;

SELECT cron.schedule(
  'aggregate-conversation-paths',
  '0 */3 * * *',
  $$SELECT * FROM public.aggregate_conversation_paths()$$
);

-- Снимки менеджеров — ежедневно в 3:00
-- Примечание: p_organization_id нужно подставить конкретный
-- Или обернуть в DO-блок с циклом по организациям
DO $$
BEGIN
  PERFORM cron.unschedule('snapshot-manager-performance');
EXCEPTION WHEN others THEN NULL;
END;
$$;

SELECT cron.schedule(
  'snapshot-manager-performance',
  '0 3 * * *',
  $$
  DO $snap$
  DECLARE
    v_org RECORD;
  BEGIN
    FOR v_org IN SELECT id FROM public.organizations LOOP
      PERFORM public.snapshot_manager_performance(v_org.id, CURRENT_DATE - 1);
    END LOOP;
  END;
  $snap$
  $$
);

-- AI-анализ команды — ежедневно в 5:00 (после снимков менеджеров в 3:00)
-- Вызывает Edge Function team-intelligence через net.http_post
DO $$
BEGIN
  PERFORM cron.unschedule('team-intelligence-daily');
EXCEPTION WHEN others THEN NULL;
END;
$$;

SELECT cron.schedule(
  'team-intelligence-daily',
  '0 5 * * *',
  $$
  DO $ti$
  DECLARE
    v_org RECORD;
    v_self_hosted_url TEXT := current_setting('app.settings.self_hosted_url', true);
    v_anon_key TEXT := current_setting('app.settings.anon_key', true);
  BEGIN
    -- Fallback defaults
    IF v_self_hosted_url IS NULL THEN
      v_self_hosted_url := 'https://api.academyos.ru';
    END IF;

    FOR v_org IN SELECT id FROM public.organizations LOOP
      PERFORM net.http_post(
        url := v_self_hosted_url || '/functions/v1/team-intelligence',
        headers := json_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || COALESCE(v_anon_key, '')
        )::jsonb,
        body := json_build_object(
          'organization_id', v_org.id,
          'days', 30,
          'mode', 'full'
        )::jsonb
      );
    END LOOP;
  END;
  $ti$
  $$
);

-- ==========================================
-- 9. RPC-функции для Edge Functions
-- ==========================================

-- 9a. Общие метрики команды за N дней
CREATE OR REPLACE FUNCTION public.get_team_metrics(
  p_organization_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_conversations BIGINT,
  total_converted BIGINT,
  team_conversion_rate NUMERIC,
  avg_response_time NUMERIC,
  top_conversion_path TEXT[],
  worst_loss_path TEXT[],
  best_hour SMALLINT,
  worst_hour SMALLINT,
  active_managers BIGINT,
  conversion_spread NUMERIC
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  v_since TIMESTAMPTZ := now() - (p_days || ' days')::INTERVAL;
  v_total BIGINT;
  v_converted BIGINT;
  v_avg_resp NUMERIC;
  v_active BIGINT;
  v_top_path TEXT[];
  v_worst_path TEXT[];
  v_best_hour SMALLINT;
  v_worst_hour SMALLINT;
  v_spread NUMERIC;
BEGIN
  -- Общие цифры из conversation_paths
  SELECT
    count(*),
    count(*) FILTER (WHERE cp.outcome IN ('converted', 'trial_booked'))
  INTO v_total, v_converted
  FROM conversation_paths cp
  WHERE cp.organization_id = p_organization_id
    AND cp.started_at >= v_since;

  -- Среднее время ответа
  SELECT round(avg(cp.avg_response_time_sec)::NUMERIC, 1)
  INTO v_avg_resp
  FROM conversation_paths cp
  WHERE cp.organization_id = p_organization_id
    AND cp.started_at >= v_since
    AND cp.avg_response_time_sec IS NOT NULL;

  -- Активные менеджеры
  SELECT count(DISTINCT cp.manager_id)
  INTO v_active
  FROM conversation_paths cp
  WHERE cp.organization_id = p_organization_id
    AND cp.started_at >= v_since;

  -- Лучший конверсионный путь
  SELECT cp.stage_path INTO v_top_path
  FROM conversation_paths cp
  WHERE cp.organization_id = p_organization_id
    AND cp.started_at >= v_since
    AND cp.outcome IN ('converted', 'trial_booked')
  GROUP BY cp.stage_path
  ORDER BY count(*) DESC
  LIMIT 1;

  -- Худший путь (потери)
  SELECT cp.stage_path INTO v_worst_path
  FROM conversation_paths cp
  WHERE cp.organization_id = p_organization_id
    AND cp.started_at >= v_since
    AND cp.outcome = 'lost'
  GROUP BY cp.stage_path
  ORDER BY count(*) DESC
  LIMIT 1;

  -- Лучший и худший час
  SELECT e.hour_of_day INTO v_best_hour
  FROM team_behavior_events e
  WHERE e.organization_id = p_organization_id
    AND e.created_at >= v_since
    AND e.is_incoming = false
    AND e.hour_of_day IS NOT NULL
  GROUP BY e.hour_of_day
  ORDER BY count(*) DESC
  LIMIT 1;

  SELECT e.hour_of_day INTO v_worst_hour
  FROM team_behavior_events e
  WHERE e.organization_id = p_organization_id
    AND e.created_at >= v_since
    AND e.is_incoming = false
    AND e.hour_of_day IS NOT NULL
  GROUP BY e.hour_of_day
  ORDER BY count(*) ASC
  LIMIT 1;

  -- Разброс конверсии между менеджерами (stddev)
  SELECT round(stddev(mgr_rate)::NUMERIC, 2) INTO v_spread
  FROM (
    SELECT
      cp.manager_id,
      CASE WHEN count(*) > 0
        THEN (count(*) FILTER (WHERE cp.outcome IN ('converted', 'trial_booked'))::NUMERIC / count(*) * 100)
        ELSE 0
      END AS mgr_rate
    FROM conversation_paths cp
    WHERE cp.organization_id = p_organization_id
      AND cp.started_at >= v_since
    GROUP BY cp.manager_id
    HAVING count(*) >= 3
  ) sub;

  RETURN QUERY SELECT
    v_total,
    v_converted,
    CASE WHEN v_total > 0
      THEN round(v_converted::NUMERIC / v_total * 100, 1)
      ELSE 0::NUMERIC
    END,
    COALESCE(v_avg_resp, 0::NUMERIC),
    v_top_path,
    v_worst_path,
    v_best_hour,
    v_worst_hour,
    v_active,
    COALESCE(v_spread, 0::NUMERIC);
END;
$$;

-- 9b. Сравнение менеджеров
CREATE OR REPLACE FUNCTION public.get_manager_comparison(
  p_organization_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  manager_id UUID,
  manager_name TEXT,
  total_conversations BIGINT,
  conversion_rate NUMERIC,
  avg_response_time NUMERIC,
  avg_first_response NUMERIC,
  avg_messages_per_conversation NUMERIC,
  most_used_path TEXT[],
  best_path TEXT[],
  peak_hour SMALLINT
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  v_since TIMESTAMPTZ := now() - (p_days || ' days')::INTERVAL;
  rec RECORD;
  v_name TEXT;
  v_most_used TEXT[];
  v_best TEXT[];
  v_peak SMALLINT;
BEGIN
  FOR rec IN
    SELECT
      cp.manager_id AS mid,
      count(*) AS total,
      CASE WHEN count(*) > 0
        THEN round(count(*) FILTER (WHERE cp.outcome IN ('converted', 'trial_booked'))::NUMERIC / count(*) * 100, 1)
        ELSE 0
      END AS conv_rate,
      round(avg(cp.avg_response_time_sec)::NUMERIC, 1) AS avg_resp,
      round(avg(cp.first_response_time_sec)::NUMERIC, 1) AS avg_first,
      round(avg(cp.total_messages)::NUMERIC, 1) AS avg_msgs
    FROM conversation_paths cp
    WHERE cp.organization_id = p_organization_id
      AND cp.started_at >= v_since
    GROUP BY cp.manager_id
    HAVING count(*) >= 1
    ORDER BY conv_rate DESC
  LOOP
    -- Имя менеджера
    SELECT COALESCE(p.first_name || ' ' || COALESCE(p.last_name, ''), rec.mid::TEXT)
    INTO v_name
    FROM profiles p WHERE p.id = rec.mid;
    v_name := COALESCE(trim(v_name), rec.mid::TEXT);

    -- Самый частый путь
    SELECT cp.stage_path INTO v_most_used
    FROM conversation_paths cp
    WHERE cp.organization_id = p_organization_id
      AND cp.manager_id = rec.mid
      AND cp.started_at >= v_since
    GROUP BY cp.stage_path
    ORDER BY count(*) DESC
    LIMIT 1;

    -- Лучший путь по конверсии
    SELECT cp.stage_path INTO v_best
    FROM conversation_paths cp
    WHERE cp.organization_id = p_organization_id
      AND cp.manager_id = rec.mid
      AND cp.started_at >= v_since
      AND cp.outcome IN ('converted', 'trial_booked')
    GROUP BY cp.stage_path
    ORDER BY count(*) DESC
    LIMIT 1;

    -- Пиковый час
    SELECT e.hour_of_day INTO v_peak
    FROM team_behavior_events e
    WHERE e.organization_id = p_organization_id
      AND e.manager_id = rec.mid
      AND e.created_at >= v_since
      AND e.is_incoming = false
      AND e.hour_of_day IS NOT NULL
    GROUP BY e.hour_of_day
    ORDER BY count(*) DESC
    LIMIT 1;

    RETURN QUERY SELECT
      rec.mid,
      v_name,
      rec.total,
      rec.conv_rate,
      COALESCE(rec.avg_resp, 0::NUMERIC),
      COALESCE(rec.avg_first, 0::NUMERIC),
      COALESCE(rec.avg_msgs, 0::NUMERIC),
      v_most_used,
      v_best,
      v_peak;
  END LOOP;
END;
$$;

-- 9c. Топ путей диалогов
CREATE OR REPLACE FUNCTION public.get_top_conversation_paths(
  p_organization_id UUID,
  p_days INTEGER DEFAULT 30,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  stage_path TEXT[],
  total_conversations BIGINT,
  converted BIGINT,
  conversion_rate NUMERIC,
  avg_response_time NUMERIC
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT
    cp.stage_path,
    count(*) AS total_conversations,
    count(*) FILTER (WHERE cp.outcome IN ('converted', 'trial_booked')) AS converted,
    CASE WHEN count(*) > 0
      THEN round(count(*) FILTER (WHERE cp.outcome IN ('converted', 'trial_booked'))::NUMERIC / count(*) * 100, 1)
      ELSE 0
    END AS conversion_rate,
    round(avg(cp.avg_response_time_sec)::NUMERIC, 1) AS avg_response_time
  FROM conversation_paths cp
  WHERE cp.organization_id = p_organization_id
    AND cp.started_at >= now() - (p_days || ' days')::INTERVAL
  GROUP BY cp.stage_path
  ORDER BY total_conversations DESC
  LIMIT p_limit;
$$;

-- ==========================================
-- Комментарии к таблицам
-- ==========================================

COMMENT ON TABLE public.team_behavior_events IS
  'Поведенческие события команды: каждое исходящее сообщение менеджера с контекстом (время ответа, тип события, час/день).';

COMMENT ON TABLE public.conversation_paths IS
  'Агрегированные пути диалогов: stage_path и event_path для каждой завершённой сессии с метриками конверсии.';

COMMENT ON TABLE public.manager_performance_snapshots IS
  'Ежедневные снимки производительности менеджеров: конверсия, скорость, паттерны.';

COMMENT ON TABLE public.team_insights IS
  'AI-сгенерированные инсайты о поведении команды: узкие места, лучшие практики, аномалии.';

COMMENT ON TABLE public.manager_coaching_tips IS
  'Персональные рекомендации AI Coach для каждого менеджера на основе его данных.';
