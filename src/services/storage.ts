import { Task, TaskStep, ActivityLog, TaskPriority, ScheduleType, DateMode } from "../types";

const STORAGE_KEY_TASKS = "vazifalar_tasks_v3";
const STORAGE_KEY_LOGS = "vazifalar_activity_logs_v3";
const STORAGE_KEY_LAST_SYNC = "vazifalar_last_sync_v3";

export function getTodayString(): string {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

export function formatDateUz(dateStr: string): string {
  if (!dateStr) return "-";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const year = parts[0];
      const month = parts[1];
      const day = parts[2];
      const monthsUz = [
        "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
        "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"
      ];
      const mIdx = parseInt(month, 10) - 1;
      const monthName = monthsUz[mIdx] || month;
      return `${parseInt(day, 10)}-${monthName}, ${year}`;
    }
  } catch {
    // fallback
  }
  return dateStr;
}

export function addDaysToDate(dateStr: string, days: number): string {
  if (!dateStr) return getTodayString();
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function addMonthsToDate(dateStr: string, months: number = 1): string {
  if (!dateStr) return getTodayString();
  const d = new Date(dateStr + "T00:00:00");
  const originalDay = d.getDate();
  d.setMonth(d.getMonth() + months);
  // Handle shorter months overflow
  if (d.getDate() !== originalDay) {
    d.setDate(0);
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function getNextOccurrenceDate(
  startDate: string,
  scheduleType: ScheduleType,
  baseDate?: string
): string {
  const base = baseDate || getTodayString();
  const start = startDate || base;

  if (scheduleType === "daily") {
    if (start > base) return start;
    return addDaysToDate(base, 1);
  }

  if (scheduleType === "every_3_days") {
    if (start > base) return start;
    let curr = start;
    let safetyLimit = 0;
    while (curr <= base && safetyLimit < 1000) {
      curr = addDaysToDate(curr, 3);
      safetyLimit++;
    }
    return curr;
  }

  if (scheduleType === "weekly") {
    if (start > base) return start;
    let curr = start;
    let safetyLimit = 0;
    while (curr <= base && safetyLimit < 500) {
      curr = addDaysToDate(curr, 7);
      safetyLimit++;
    }
    return curr;
  }

  if (scheduleType === "monthly") {
    if (start > base) return start;
    let curr = start;
    let safetyLimit = 0;
    while (curr <= base && safetyLimit < 120) {
      curr = addMonthsToDate(curr, 1);
      safetyLimit++;
    }
    return curr;
  }

  return start;
}

export function formatTaskScheduleDisplay(task: Task): { label: string; detail: string; shortTag: string } {
  if (task.scheduleType === "daily") {
    return {
      label: "Har kunlik",
      detail: task.startDate ? `${formatDateUz(task.startDate)} dan har kuni muntazam eslatiladi` : "Har kuni muntazam eslatiladi",
      shortTag: "Har kuni"
    };
  }

  if (task.scheduleType === "every_3_days") {
    return {
      label: "Har 3 kunda bir",
      detail: task.startDate ? `${formatDateUz(task.startDate)} dan har 3 kunda eslatiladi` : "Har 3 kunda bir",
      shortTag: "Har 3 kunda"
    };
  }

  if (task.scheduleType === "weekly") {
    return {
      label: "Har haftada bir",
      detail: task.startDate ? `${formatDateUz(task.startDate)} dan har haftada bir marta` : "Har haftada bir",
      shortTag: "Har hafta"
    };
  }

  if (task.scheduleType === "monthly") {
    if (task.dateMode === "range" && task.monthlyStartDay && task.monthlyEndDay) {
      return {
        label: `Har oy (${task.monthlyStartDay}-${task.monthlyEndDay}-kunlar)`,
        detail: `Har oyning ${task.monthlyStartDay}-sanasidan ${task.monthlyEndDay}-sanasigacha`,
        shortTag: `Har oy (${task.monthlyStartDay}-${task.monthlyEndDay})`
      };
    }
    if (task.startDate) {
      return {
        label: "Har oyda bir",
        detail: `${formatDateUz(task.startDate)} dan har oy muntazam eslatiladi`,
        shortTag: "Har oy"
      };
    }
    return {
      label: `Har oy (${task.monthlyDay || 15}-kun)`,
      detail: `Har oyning ${task.monthlyDay || 15}-sanasida`,
      shortTag: `Har oy (${task.monthlyDay || 15})`
    };
  }

  // Once (Bir martalik)
  if (task.dateMode === "range" && task.startDate && task.dueDate) {
    return {
      label: "Muddat oralig'ida",
      detail: `${formatDateUz(task.startDate)} dan ${formatDateUz(task.dueDate)} gacha`,
      shortTag: "Oraliq"
    };
  }

  return {
    label: "Bir martalik",
    detail: formatDateUz(task.dueDate),
    shortTag: "Bir martalik"
  };
}

export function getNextMonthlyDate(dayOfMonth: number): string {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11
  const todayDate = now.getDate();

  let targetYear = currentYear;
  let targetMonth = currentMonth;

  if (dayOfMonth < todayDate) {
    targetMonth += 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }
  }

  const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const finalDay = Math.min(dayOfMonth, lastDayOfTargetMonth);

  const mm = String(targetMonth + 1).padStart(2, "0");
  const dd = String(finalDay).padStart(2, "0");
  return `${targetYear}-${mm}-${dd}`;
}

export function getCreatorLabel(createdBy?: string): {
  text: string;
  isCustomAdmin: boolean;
  rawUser: string;
} {
  const user = (createdBy || "").trim().toLowerCase();
  if (user === "admin" || user.includes("admin")) {
    return {
      text: "admin tomonidan qo'shilgan",
      isCustomAdmin: true,
      rawUser: createdBy || "admin"
    };
  }
  if (user === "operator1" || user === "operator" || user.startsWith("operator")) {
    const cleanName = user === "operator" ? "operator1" : user;
    return {
      text: `${cleanName} tomonidan qo'shilgan`,
      isCustomAdmin: false,
      rawUser: cleanName
    };
  }
  if (!user) {
    return {
      text: "operator1 tomonidan qo'shilgan",
      isCustomAdmin: false,
      rawUser: "operator1"
    };
  }
  return {
    text: `${createdBy} tomonidan qo'shilgan`,
    isCustomAdmin: false,
    rawUser: createdBy
  };
}

export function calculateTaskStatus(task: Task): "pending" | "completed" | "rescheduled" | "overdue" {
  if (task.isCompleted) return "completed";
  const today = getTodayString();
  if (task.dueDate < today) {
    return "overdue";
  }
  if (task.history && task.history.length > 0) {
    const last = task.history[task.history.length - 1];
    if (last.newDate === task.dueDate) {
      return "rescheduled";
    }
  }
  return "pending";
}

export function getStoredTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TASKS);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (e) {
    console.error("Failed to read tasks from localStorage:", e);
  }
  return [];
}

export function saveStoredTasks(tasks: Task[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
  } catch (e) {
    console.error("Failed to save tasks:", e);
  }
}

export function getStoredLogs(): ActivityLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOGS);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addActivityLog(log: Omit<ActivityLog, "id" | "timestamp">): ActivityLog {
  const newLog: ActivityLog = {
    ...log,
    id: "log-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString()
  };
  try {
    const logs = getStoredLogs();
    logs.unshift(newLog);
    if (logs.length > 300) logs.pop();
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
  } catch (e) {
    console.error("Failed to add activity log:", e);
  }
  return newLog;
}

export function saveStoredLogs(logs: ActivityLog[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
  } catch (e) {
    console.error("Failed to save activity logs:", e);
  }
}

/**
 * Automatically checks for overdue tasks and rolls them over to today/next day
 */
export function checkAndPerformAutoRollover(tasks: Task[]): { updatedTasks: Task[]; rolledCount: number } {
  const today = getTodayString();
  let rolledCount = 0;

  const updatedTasks = tasks.map((task) => {
    if (task.isCompleted) {
      return task;
    }

    if (task.dueDate < today) {
      rolledCount++;
      const oldDate = task.dueDate;
      const historyItem = {
        id: "hist-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
        oldDate,
        newDate: today,
        reason: "Avtomatik keyingi kunga o'tkazildi (bajarilmagan muddat o'tganligi sababli)",
        rescheduledAt: new Date().toISOString(),
        operator: "Tizim (Avtomatik)",
        isAutomatic: true
      };

      const updatedHistory = [...(task.history || []), historyItem];
      const autoCount = (task.autoRolledCount || 0) + 1;

      addActivityLog({
        operator: "Tizim",
        action: "auto_rolled",
        taskTitle: task.title,
        details: `Muddat (${oldDate}) o'tib ketganligi sababli avtomatik bugungi kunga (${today}) o'tkazildi.`
      });

      return {
        ...task,
        dueDate: today,
        status: "rescheduled" as const,
        history: updatedHistory,
        autoRolledCount: autoCount,
        lastRolledDate: today
      };
    }

    return task;
  });

  if (rolledCount > 0) {
    saveStoredTasks(updatedTasks);
  }

  return { updatedTasks, rolledCount };
}
