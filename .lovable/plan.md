
# Система учёта рабочего времени и мотивации сотрудников

## ✅ Фаза 1: Базовый трекинг (ЗАВЕРШЕНА)

### Реализованные компоненты:

1. **useActivityTracker** (`src/hooks/useActivityTracker.ts`) ✅
   - Отслеживание событий: mousemove, keydown, click, scroll, touchstart
   - Throttled обновления (30 сек)
   - Автоматическое определение idle после 5 минут неактивности
   - Персистентность состояния в localStorage
   - Статусы: online, idle, on_call, offline

2. **useWorkSession** (`src/hooks/useWorkSession.ts`) ✅
   - Управление рабочей сессией
   - Отслеживание начала/конца смены
   - Поддержка перерывов
   - Автостарт сессии при входе

3. **useStaffOnlinePresence** (обновлён) ✅
   - Расширенный payload: status, sessionStart, activeTime, idleTime, activityPercentage
   - Новый метод getUserStatus()
   - Сохранение всех полей при sync

4. **StaffActivityIndicator** (`src/components/crm/StaffActivityIndicator.tsx`) ✅
   - Визуальный индикатор статуса в хедере
   - Цветовая индикация: зеленый (онлайн), желтый (неактивен), синий (на звонке)
   - Таймер сессии
   - Процент активности с цветовой индикацией
   - Tooltip с детальной информацией
   - Компактный режим для мобильных

5. **StaffActivityDashboard** (`src/components/crm/StaffActivityDashboard.tsx`) ✅
   - Dashboard для руководителей
   - Список всех сотрудников с их статусами
   - Алерты о длительной неактивности (>10 мин)
   - Сортировка: on_call → online → idle → offline

### Интеграция: ✅
- StaffActivityIndicator добавлен в UnifiedCRMHeader
- Отображается для ролей: admin, manager, methodist, teacher

---

## Статусы сотрудников

| Статус | Условие | Цвет | Иконка |
|--------|---------|------|--------|
| Онлайн | Активность < 5 мин | Зеленый | Circle (filled) |
| На звонке | Активный звонок в call_logs | Синий пульсирующий | Phone |
| Неактивен | Активность 5+ мин | Желтый | Clock |
| Оффлайн | Нет heartbeat 2+ мин | Серый | Circle (outline) |

---

## 🔲 Фаза 2: Персистентность (ПЛАНИРУЕТСЯ)

### SQL миграция для self-hosted:
```sql
CREATE TABLE IF NOT EXISTS staff_work_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  session_start TIMESTAMPTZ,
  session_end TIMESTAMPTZ,
  total_online_seconds INT DEFAULT 0,
  active_seconds INT DEFAULT 0,
  idle_seconds INT DEFAULT 0,
  on_call_seconds INT DEFAULT 0,
  idle_events INT DEFAULT 0,
  max_idle_streak_seconds INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, session_date)
);

CREATE TABLE IF NOT EXISTS staff_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID,
  stat_date DATE NOT NULL,
  total_online_minutes INT DEFAULT 0,
  active_minutes INT DEFAULT 0,
  idle_minutes INT DEFAULT 0,
  call_minutes INT DEFAULT 0,
  calls_count INT DEFAULT 0,
  messages_sent INT DEFAULT 0,
  avg_response_time_seconds INT,
  efficiency_score NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, stat_date)
);

CREATE INDEX idx_work_sessions_user_date ON staff_work_sessions(user_id, session_date);
CREATE INDEX idx_daily_stats_user_date ON staff_daily_stats(user_id, stat_date);
```

### Edge Functions:
- `save-work-session` - периодическое сохранение (каждые 5 мин)
- `aggregate-staff-stats` - ежечасная агрегация

---

## 🔲 Фаза 3: Аналитика (ПЛАНИРУЕТСЯ)

- Графики активности по дням/неделям
- Cron-агрегация статистики
- Уведомления о простоях в Telegram
- Ежедневные/еженедельные отчёты

---

## 🔲 Фаза 4: Интеграция с KPI (ПЛАНИРУЕТСЯ)

- Связь с manager_kpi_settings
- Автоматические предупреждения
- Отчёты в Telegram
- Геймификация (бейджи, уровни)

---

## Ключевые принципы

1. **Минимальная нагрузка**: используем существующий Presence канал
2. **Privacy**: сотрудник видит свой статус, руководитель - команды
3. **Честность**: точный учёт без микроменеджмента
4. **Мотивация**: фокус на позитивных метриках
