export type UserRole = "operator" | "admin";

export interface User {
  username: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

export type TaskPriority =
  | "Soliq(Muhim)"
  | "Ichki hisobot(Muhim)"
  | "Ichki hisobot(O'rtacha)"
  | "Ichki hisobot(Past)"
  | "Takrorlanmas ish(Muhim)"
  | "Takrorlanmas ish(O'rtacha)"
  | "Takrorlanmas ish(Past)";

export type ScheduleType = "daily" | "every_3_days" | "weekly" | "monthly" | "once";
export type DateMode = "single" | "range";

export type TaskStatus = "pending" | "completed" | "rescheduled" | "overdue";

export interface TaskStep {
  id: string;
  text: string;
  completed: boolean;
  estimatedMinutes?: number; // Har bir amal uchun ajratilgan vaqt (daqiqa)
}

export interface TaskRescheduleHistory {
  id: string;
  oldDate: string;
  newDate: string;
  oldTime?: string;
  newTime?: string;
  reason?: string;
  rescheduledAt: string;
  operator: string;
  isAutomatic?: boolean;
  type?: "date" | "time"; // Kun yoki soat ko'chirilishi
  scope?: "temporary" | "permanent"; // Vaqtinchalik yoki doimiy
}

export interface Task {
  id: string;
  title: string;
  steps: TaskStep[];
  priority: TaskPriority;
  scheduleType: ScheduleType;
  dateMode?: DateMode; // 'single' (bir kunga) | 'range' (muddat oralig'iga)
  monthlyDay?: number; // 1-31 (if monthly single day)
  monthlyStartDay?: number; // 1-31 (if monthly range start)
  monthlyEndDay?: number; // 1-31 (if monthly range end)
  startDate?: string; // YYYY-MM-DD (if once date range start)
  dueDate: string; // YYYY-MM-DD (deadline or single day or end date)
  dueTime?: string; // HH:mm formatida (masalan "09:00", "14:30")
  estimatedDuration?: number; // Vazifa uchun umumiy ajratilgan vaqt (daqiqa)
  status: TaskStatus;
  isCompleted: boolean;
  completedAt?: string;
  completionNote?: string;
  completedBy?: string;
  createdAt: string;
  createdBy: string;
  history: TaskRescheduleHistory[];
  autoRolledCount?: number;
  lastRolledDate?: string;
}

export interface TaskFilterOptions {
  search: string;
  priority: string; // 'all' or TaskPriority
  scheduleType: string; // 'all' | 'monthly' | 'once'
  status: string; // 'all' | 'pending' | 'completed' | 'rescheduled' | 'overdue' | 'today' | 'upcoming'
  dateRange: "all" | "today" | "tomorrow" | "this_week" | "this_month" | "overdue" | "custom";
  customStartDate?: string;
  customEndDate?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  operator: string;
  action: "created" | "completed" | "rescheduled" | "auto_rolled" | "deleted" | "edited";
  taskTitle: string;
  details?: string;
}
