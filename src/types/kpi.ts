export interface ManagerKpiSettings {
  id: string;
  profile_id: string;
  organization_id: string;
  min_call_score: number;
  min_calls_per_day: number;
  min_answered_rate: number;
  created_at: string;
  updated_at: string;
}

export interface KpiNotification {
  id: string;
  profile_id: string;
  organization_id: string;
  notification_type: 'low_score' | 'low_calls' | 'low_answered_rate';
  message: string;
  current_value: number | null;
  threshold_value: number | null;
  is_read: boolean;
  created_at: string;
}

export interface ManagerKpiWithProfile extends ManagerKpiSettings {
  profiles?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}

export const DEFAULT_KPI_SETTINGS = {
  min_call_score: 7.0,
  min_calls_per_day: 10,
  min_answered_rate: 0.7,
};

export const KPI_NOTIFICATION_LABELS: Record<string, string> = {
  low_score: 'Низкая оценка звонков',
  low_calls: 'Мало звонков',
  low_answered_rate: 'Низкий процент отвеченных',
};
