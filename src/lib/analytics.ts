/**
 * Система аналитики для ЛК преподавателя
 * Интеграция с PostHog, Amplitude или другой системой
 */

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp?: number;
}

class Analytics {
  private enabled: boolean = true;
  private userId: string | null = null;

  /**
   * Инициализация аналитики
   */
  init(userId: string) {
    this.userId = userId;
    console.log('[Analytics] Initialized for user:', userId);
  }

  /**
   * Отслеживание события
   */
  track(eventName: string, properties?: Record<string, any>) {
    if (!this.enabled || !this.userId) return;

    const event: AnalyticsEvent = {
      name: eventName,
      properties: {
        ...properties,
        user_id: this.userId,
        timestamp: Date.now(),
        page: window.location.pathname,
      },
    };

    // В production здесь должна быть интеграция с PostHog/Amplitude
    console.log('[Analytics]', event);

    // TODO: Отправка в реальную систему аналитики
    // posthog.capture(eventName, event.properties);
  }

  /**
   * Установка свойств пользователя
   */
  identify(userId: string, traits?: Record<string, any>) {
    this.userId = userId;
    console.log('[Analytics] Identify:', userId, traits);
    // posthog.identify(userId, traits);
  }

  /**
   * Отслеживание времени выполнения действия
   */
  timeEvent(eventName: string): () => void {
    const startTime = Date.now();
    
    return () => {
      const duration = Date.now() - startTime;
      this.track(eventName, { duration_ms: duration });
    };
  }
}

// Экспортируем singleton
export const analytics = new Analytics();

// Типизированные события для автокомплита
export const AnalyticsEvents = {
  // Dashboard
  DASHBOARD_OPENED: 'dashboard_opened',
  NEXT_LESSON_CLICKED: 'next_lesson_clicked',
  
  // Lessons
  LESSON_STARTED: 'lesson_started',
  LESSON_COMPLETED: 'lesson_completed',
  LESSON_DETAILS_OPENED: 'lesson_details_opened',
  
  // Attendance
  ATTENDANCE_MODAL_OPENED: 'attendance_modal_opened',
  ATTENDANCE_SAVED: 'attendance_saved',
  
  // Homework
  HOMEWORK_MODAL_OPENED: 'homework_modal_opened',
  HOMEWORK_SENT: 'homework_sent',
  HOMEWORK_TEMPLATE_USED: 'homework_template_used',
  
  // Chat & Assistant
  CHAT_OPENED: 'chat_opened',
  CHAT_MESSAGE_SENT: 'chat_message_sent',
  ASSISTANT_OPENED: 'assistant_opened',
  ASSISTANT_PRESET_USED: 'assistant_preset_used',
  
  // Schedule
  SCHEDULE_OPENED: 'schedule_opened',
  SCHEDULE_FILTER_CHANGED: 'schedule_filter_changed',
  
  // Substitutions
  SUBSTITUTION_REQUESTED: 'substitution_requested',
  
  // Payroll
  PAYROLL_DETAILS_OPENED: 'payroll_details_opened',
  PAYROLL_CSV_EXPORTED: 'payroll_csv_exported',
  
  // Command Palette
  COMMAND_PALETTE_OPENED: 'command_palette_opened',
  COMMAND_EXECUTED: 'command_executed',
  
  // AI Hub
  AI_HUB_OPENED: 'ai_hub_opened',
  GAME_GENERATED: 'game_generated',
  APP_INSTALLED: 'app_installed',
} as const;

export default analytics;