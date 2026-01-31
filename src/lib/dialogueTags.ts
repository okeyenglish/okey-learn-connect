/**
 * Справочник тегов для системы классификации диалогов
 * Централизованное хранение меток, цветов и описаний для UI
 */

// ============= ТИПЫ =============

export type DialogType = 
  | 'new_lead'
  | 'returning'
  | 'complaint'
  | 'upsell'
  | 'reactivation'
  | 'info_request'
  | 'scheduling'
  | 'payment'
  | 'consultation'
  | 'objection'
  | 'enrollment'
  | 'active_service'
  | 'renewal'
  | 'lost_client'
  | 'unknown';

export type ClientStage = 
  | 'lead'
  | 'warm'
  | 'ready_to_pay'
  | 'active_student'
  | 'paused'
  | 'churned'
  | 'returned'
  | 'cold'
  | 'hot'
  | 'active'
  | 'unknown';

export type Intent = 
  | 'price_check'
  | 'schedule_info'
  | 'program_choice'
  | 'comparison'
  | 'hesitation'
  | 'urgent_start'
  | 'support_request'
  | 'upgrade_interest'
  | 'unknown';

export type Issue = 
  | 'price_too_high'
  | 'no_time'
  | 'child_motivation'
  | 'teacher_issue'
  | 'technical_problem'
  | 'missed_lessons'
  | 'payment_problem'
  | 'organization_complaint'
  | null;

export type Outcome = 
  | 'converted'
  | 'resolved'
  | 'scheduled'
  | 'paid'
  | 'retained'
  | 'satisfied'
  | 'lost'
  | 'ongoing'
  | 'unknown';

// ============= МЕТКИ =============

export const dialogTypeLabels: Record<string, string> = {
  new_lead: 'Новый лид',
  returning: 'Возврат клиента',
  complaint: 'Жалоба',
  upsell: 'Допродажа',
  reactivation: 'Реактивация',
  info_request: 'Запрос информации',
  scheduling: 'Запись',
  payment: 'Оплата',
  consultation: 'Консультация',
  objection: 'Возражение',
  enrollment: 'Запись на курс',
  active_service: 'Обслуживание',
  renewal: 'Продление',
  lost_client: 'Потерянный клиент',
  unknown: 'Прочее'
};

export const clientStageLabels: Record<string, string> = {
  lead: 'Первичный контакт',
  warm: 'Тёплый',
  ready_to_pay: 'Готов к оплате',
  active_student: 'Активный ученик',
  paused: 'На паузе',
  churned: 'Ушёл',
  returned: 'Вернувшийся',
  cold: 'Холодный',
  hot: 'Горячий',
  active: 'Активный',
  unknown: 'Неизвестно'
};

export const intentLabels: Record<string, string> = {
  price_check: 'Узнать цену',
  schedule_info: 'Узнать расписание',
  program_choice: 'Выбор программы',
  comparison: 'Сравнение',
  hesitation: 'Сомнение',
  urgent_start: 'Срочный старт',
  support_request: 'Запрос поддержки',
  upgrade_interest: 'Интерес к апгрейду',
  unknown: 'Неизвестно'
};

export const issueLabels: Record<string, string> = {
  price_too_high: 'Дорого',
  no_time: 'Нет времени',
  child_motivation: 'Мотивация ребёнка',
  teacher_issue: 'Проблема с педагогом',
  technical_problem: 'Техническая проблема',
  missed_lessons: 'Пропуски занятий',
  payment_problem: 'Проблема с оплатой',
  organization_complaint: 'Жалоба на организацию'
};

export const outcomeLabels: Record<string, string> = {
  converted: 'Конверсия',
  resolved: 'Решено',
  scheduled: 'Записан',
  paid: 'Оплачено',
  retained: 'Сохранён',
  satisfied: 'Доволен',
  lost: 'Потерян',
  ongoing: 'В процессе',
  unknown: 'Прочее'
};

// ============= ЦВЕТА =============

export const dialogTypeColors: Record<string, string> = {
  new_lead: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  returning: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  complaint: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  upsell: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  reactivation: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  info_request: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  scheduling: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  payment: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  consultation: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  objection: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
  enrollment: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  active_service: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  renewal: 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200',
  lost_client: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  unknown: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
};

export const clientStageColors: Record<string, string> = {
  lead: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
  warm: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  ready_to_pay: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  active_student: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  paused: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  churned: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  returned: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  cold: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  hot: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
  active: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  unknown: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
};

export const intentColors: Record<string, string> = {
  price_check: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  schedule_info: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  program_choice: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  comparison: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
  hesitation: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  urgent_start: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
  support_request: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  upgrade_interest: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  unknown: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
};

export const issueColors: Record<string, string> = {
  price_too_high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  no_time: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  child_motivation: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  teacher_issue: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
  technical_problem: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  missed_lessons: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  payment_problem: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  organization_complaint: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
};

export const outcomeColors: Record<string, string> = {
  converted: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  resolved: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  scheduled: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
  paid: 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200',
  retained: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  satisfied: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  lost: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  ongoing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  unknown: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
};

// ============= ОПИСАНИЯ (для подсказок) =============

export const intentDescriptions: Record<string, string> = {
  price_check: 'Клиент хочет узнать стоимость услуг',
  schedule_info: 'Клиент интересуется расписанием занятий',
  program_choice: 'Клиент выбирает подходящую программу или курс',
  comparison: 'Клиент сравнивает с конкурентами',
  hesitation: 'Клиент сомневается и не готов к решению',
  urgent_start: 'Клиенту нужно начать как можно скорее',
  support_request: 'Клиент обращается за поддержкой по текущим занятиям',
  upgrade_interest: 'Клиент интересуется продвинутыми курсами'
};

export const issueDescriptions: Record<string, string> = {
  price_too_high: 'Клиент считает цену слишком высокой',
  no_time: 'У клиента нет времени на посещение занятий',
  child_motivation: 'Проблемы с мотивацией ребёнка к обучению',
  teacher_issue: 'Клиент недоволен преподавателем',
  technical_problem: 'Технические проблемы с приложением или платформой',
  missed_lessons: 'Частые пропуски занятий (болезни и пр.)',
  payment_problem: 'Проблемы с оплатой или платёжными системами',
  organization_complaint: 'Жалобы на организацию процесса (филиал, расписание)'
};

// ============= ХЕЛПЕРЫ =============

export function getLabel(type: 'dialogType' | 'clientStage' | 'intent' | 'issue' | 'outcome', value: string | null): string {
  if (!value) return '—';
  
  switch (type) {
    case 'dialogType':
      return dialogTypeLabels[value] || value;
    case 'clientStage':
      return clientStageLabels[value] || value;
    case 'intent':
      return intentLabels[value] || value;
    case 'issue':
      return issueLabels[value] || value;
    case 'outcome':
      return outcomeLabels[value] || value;
    default:
      return value;
  }
}

export function getColor(type: 'dialogType' | 'clientStage' | 'intent' | 'issue' | 'outcome', value: string | null): string {
  if (!value) return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  
  switch (type) {
    case 'dialogType':
      return dialogTypeColors[value] || dialogTypeColors.unknown;
    case 'clientStage':
      return clientStageColors[value] || clientStageColors.unknown;
    case 'intent':
      return intentColors[value] || intentColors.unknown;
    case 'issue':
      return issueColors[value] || 'bg-gray-100 text-gray-800';
    case 'outcome':
      return outcomeColors[value] || outcomeColors.unknown;
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// Для селектов - массивы опций
export const intentOptions = Object.entries(intentLabels)
  .filter(([key]) => key !== 'unknown')
  .map(([value, label]) => ({ value, label }));

export const issueOptions = Object.entries(issueLabels)
  .map(([value, label]) => ({ value, label }));

export const dialogTypeOptions = Object.entries(dialogTypeLabels)
  .filter(([key]) => key !== 'unknown')
  .map(([value, label]) => ({ value, label }));

export const clientStageOptions = Object.entries(clientStageLabels)
  .filter(([key]) => key !== 'unknown')
  .map(([value, label]) => ({ value, label }));

export const outcomeOptions = Object.entries(outcomeLabels)
  .filter(([key]) => key !== 'unknown')
  .map(([value, label]) => ({ value, label }));
