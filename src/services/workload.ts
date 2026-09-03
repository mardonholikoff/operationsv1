import { Task } from "../types";

export const DAILY_WORK_HOURS = 8;
export const DAILY_WORK_MINUTES = DAILY_WORK_HOURS * 60; // 480 daqiqa

/**
 * Vazifaning umumiy vaqtini daqiqalarda aniqlash
 */
export function getTaskEstimatedMinutes(task: Task): number {
  if (typeof task.estimatedDuration === "number" && task.estimatedDuration > 0) {
    return task.estimatedDuration;
  }

  // Agar amallarda vaqt ko'rsatilgan bo'lsa
  if (task.steps && task.steps.length > 0) {
    const stepsSum = task.steps.reduce((acc, s) => acc + (s.estimatedMinutes || 0), 0);
    if (stepsSum > 0) return stepsSum;
    // Har bir amalga 15 daqiqa deb hisoblash
    return Math.max(30, task.steps.length * 15);
  }

  // Standart o'rtacha vaqt: 30 daqiqa
  return 30;
}

export interface DayWorkloadStats {
  date: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  totalMinutes: number;
  totalHoursFormatted: string;
  completedMinutes: number;
  pendingMinutes: number;
  workloadPercent: number; // 8 soatga nisbatan %
  isOverloaded: boolean; // > 100%
  overloadedMinutes: number;
  remainingMinutes: number; // Agar < 480 bo'lsa, qolgan erkin vaqt
  totalSteps: number;
  completedSteps: number;
  stepsPercent: number;
}

/**
 * Berilgan kun uchun barcha vazifalar va yuklama tahlili
 */
export function calculateDayWorkload(dateStr: string, tasks: Task[]): DayWorkloadStats {
  const dayTasks = tasks.filter((t) => t.dueDate === dateStr);

  let totalMinutes = 0;
  let completedMinutes = 0;
  let totalSteps = 0;
  let completedSteps = 0;

  dayTasks.forEach((task) => {
    const minutes = getTaskEstimatedMinutes(task);
    totalMinutes += minutes;

    if (task.isCompleted) {
      completedMinutes += minutes;
    }

    if (task.steps && task.steps.length > 0) {
      totalSteps += task.steps.length;
      completedSteps += task.steps.filter((s) => s.completed).length;
    }
  });

  const workloadPercent = Math.round((totalMinutes / DAILY_WORK_MINUTES) * 100);
  const pendingMinutes = Math.max(0, totalMinutes - completedMinutes);
  const isOverloaded = totalMinutes > DAILY_WORK_MINUTES;
  const overloadedMinutes = isOverloaded ? totalMinutes - DAILY_WORK_MINUTES : 0;
  const remainingMinutes = !isOverloaded ? DAILY_WORK_MINUTES - totalMinutes : 0;

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const totalHoursFormatted = hours > 0 ? (mins > 0 ? `${hours} soat ${mins} daq` : `${hours} soat`) : `${mins} daqiqa`;

  const stepsPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return {
    date: dateStr,
    totalTasks: dayTasks.length,
    completedTasks: dayTasks.filter((t) => t.isCompleted).length,
    pendingTasks: dayTasks.filter((t) => !t.isCompleted).length,
    totalMinutes,
    totalHoursFormatted,
    completedMinutes,
    pendingMinutes,
    workloadPercent,
    isOverloaded,
    overloadedMinutes,
    remainingMinutes,
    totalSteps,
    completedSteps,
    stepsPercent,
  };
}

export interface StepTimeDetail {
  stepId: string;
  stepText: string;
  taskId: string;
  taskTitle: string;
  taskPriority?: string;
  dueDate: string;
  estimatedMinutes: number;
  completed: boolean;
}

export interface TaskTimeDetail {
  task: Task;
  totalMinutes: number;
  stepsCount: number;
  completedStepsCount: number;
  percentageOfTotal: number;
}

/**
 * Berilgan vazifalar ichidan eng ko'p vaqt talab qilgan vazifalarni reytingi
 */
export function getTopTimeConsumingTasks(tasks: Task[], limit: number = 5): TaskTimeDetail[] {
  const totalPeriodMinutes = tasks.reduce((sum, t) => sum + getTaskEstimatedMinutes(t), 0);
  
  const mapped = tasks.map((task) => {
    const totalMinutes = getTaskEstimatedMinutes(task);
    const stepsCount = task.steps?.length || 0;
    const completedStepsCount = task.steps?.filter((s) => s.completed).length || 0;
    const percentageOfTotal = totalPeriodMinutes > 0 ? Math.round((totalMinutes / totalPeriodMinutes) * 100) : 0;
    return {
      task,
      totalMinutes,
      stepsCount,
      completedStepsCount,
      percentageOfTotal,
    };
  });

  return mapped.sort((a, b) => b.totalMinutes - a.totalMinutes).slice(0, limit);
}

/**
 * Berilgan vazifalar ichidan eng ko'p vaqt talab qiluvchi amallarni (steps) reytingi
 */
export function getTopTimeConsumingSteps(tasks: Task[], limit: number = 8): StepTimeDetail[] {
  const allSteps: StepTimeDetail[] = [];

  tasks.forEach((task) => {
    if (task.steps && task.steps.length > 0) {
      task.steps.forEach((step) => {
        // Agar step.estimatedMinutes berilgan bo'lsa shuni, bo'lmasa vazifa vaqtidan ulush yoki standart 15 min
        const mins = step.estimatedMinutes && step.estimatedMinutes > 0
          ? step.estimatedMinutes
          : Math.round(getTaskEstimatedMinutes(task) / task.steps!.length);

        allSteps.push({
          stepId: step.id,
          stepText: step.text,
          taskId: task.id,
          taskTitle: task.title,
          taskPriority: task.priority,
          dueDate: task.dueDate,
          estimatedMinutes: mins,
          completed: !!step.completed,
        });
      });
    }
  });

  return allSteps.sort((a, b) => b.estimatedMinutes - a.estimatedMinutes).slice(0, limit);
}

/**
 * Daqiqani chiroyli o'qiladigan matnga aylantirish (masalan: "1 soat 30 daq")
 */
export function formatMinutesUz(minutes: number): string {
  if (minutes <= 0) return "0 daqiqa";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} daqiqa`;
  if (m === 0) return `${h} soat`;
  return `${h} soat ${m} daqiqa`;
}
