import { Task, TaskStep, ActivityLog, TaskPriority, ScheduleType, DateMode } from "../types";

const STORAGE_KEY_TASKS = "vazifalar_tasks_v3";
const STORAGE_KEY_LOGS = "vazifalar_activity_logs_v3";
const STORAGE_KEY_LAST_SYNC = "vazifalar_last_sync_v3";
const STORAGE_KEY_TEMPLATES_HISTORY = "vazifalar_templates_history_v3";

export interface TaskTemplateItem {
  id: string;
  title: string;
  steps: TaskStep[];
  priority: TaskPriority;
  scheduleType: ScheduleType;
  dateMode?: DateMode;
  monthlyDay?: number;
  monthlyStartDay?: number;
  monthlyEndDay?: number;
  dueTime?: string;
  estimatedDuration?: number;
  categoryLabel?: string;
}

export const DEFAULT_BUILTIN_TEMPLATES: TaskTemplateItem[] = [
  {
    id: "builtin-tmpl-1",
    title: "QQS hisobotini soliq.uz orqali topshirish",
    priority: "Soliq(Muhim)",
    scheduleType: "monthly",
    dateMode: "single",
    monthlyDay: 20,
    dueTime: "10:00",
    estimatedDuration: 60,
    categoryLabel: "Soliq hisoboti",
    steps: [
      { id: "s1", text: "Elektron hisobvaraq-fakturalarni solishtirish va ro'yxatni tekshirish", completed: false, estimatedMinutes: 20 },
      { id: "s2", text: "1C buxgalteriya tizimidan QQS reestrini eksport qilish", completed: false, estimatedMinutes: 15 },
      { id: "s3", text: "my.soliq.uz kabinetiga hisobotni yuklash va qatorlarni tekshirish", completed: false, estimatedMinutes: 15 },
      { id: "s4", text: "Hisobotni elektron imzo bilan tasdiqlash va jo'natish", completed: false, estimatedMinutes: 10 }
    ]
  },
  {
    id: "builtin-tmpl-2",
    title: "Oylik daromad va ijtimoiy soliq (JShODS) hisoboti",
    priority: "Soliq(Muhim)",
    scheduleType: "monthly",
    dateMode: "single",
    monthlyDay: 15,
    dueTime: "11:00",
    estimatedDuration: 45,
    categoryLabel: "Soliq hisoboti",
    steps: [
      { id: "s1", text: "Hisoblangan ish haqi qaydnomasi (raschyot vedomost)ni tekshirish", completed: false, estimatedMinutes: 15 },
      { id: "s2", text: "JShODS va INPS badallarini shakllantirish", completed: false, estimatedMinutes: 15 },
      { id: "s3", text: "Soliq portalida hisobotni tekshirish va tasdiqlash", completed: false, estimatedMinutes: 15 }
    ]
  },
  {
    id: "builtin-tmpl-3",
    title: "Bank ko'chirmalari (vypiska) va to'lovlarni o'tkazish",
    priority: "Ichki hisobot(Muhim)",
    scheduleType: "daily",
    dateMode: "single",
    dueTime: "09:30",
    estimatedDuration: 30,
    categoryLabel: "Bank va moliya",
    steps: [
      { id: "s1", text: "Internet-banking tizimidan kunlik ko'chirmani yuklab olish", completed: false, estimatedMinutes: 10 },
      { id: "s2", text: "1C dasturiga import qilish va provodkalarni tekshirish", completed: false, estimatedMinutes: 15 },
      { id: "s3", text: "Rejalashtirilgan to'lov topshirig'i bo'yicha to'lovlarni jo'natish", completed: false, estimatedMinutes: 5 }
    ]
  },
  {
    id: "builtin-tmpl-4",
    title: "Elektron hisobvaraq-fakturalarni (EHF) tekshirish va tasdiqlash",
    priority: "Ichki hisobot(Muhim)",
    scheduleType: "daily",
    dateMode: "single",
    dueTime: "14:00",
    estimatedDuration: 25,
    categoryLabel: "Hujjat aylanishi",
    steps: [
      { id: "s1", text: "Didox / Rouming tizimiga kirish va yangi EHF larni tekshirish", completed: false, estimatedMinutes: 10 },
      { id: "s2", text: "Kirim hujjatlari bilan nomenklyatura va narxlarni solishtirish", completed: false, estimatedMinutes: 10 },
      { id: "s3", text: "ERI kaliti bilan tasdiqlash yoki rad etish sababini yozish", completed: false, estimatedMinutes: 5 }
    ]
  },
  {
    id: "builtin-tmpl-5",
    title: "Xodimlar oylik ish haqini hisoblash va to'lash",
    priority: "Ichki hisobot(Muhim)",
    scheduleType: "monthly",
    dateMode: "single",
    monthlyDay: 5,
    dueTime: "11:30",
    estimatedDuration: 50,
    categoryLabel: "Ish haqi",
    steps: [
      { id: "s1", text: "Ish vaqti tabelini tekshirish va tasdiqlash", completed: false, estimatedMinutes: 15 },
      { id: "s2", text: "1C da ish haqini to'liq hisoblash va vedomost chiqarish", completed: false, estimatedMinutes: 20 },
      { id: "s3", text: "Bankka ish haqi reestrini jo'natish va to'lovni o'tkazish", completed: false, estimatedMinutes: 15 }
    ]
  },
  {
    id: "builtin-tmpl-6",
    title: "Statistika hisobotini (1-BX shakli) topshirish",
    priority: "Ichki hisobot(O'rtacha)",
    scheduleType: "monthly",
    dateMode: "single",
    monthlyDay: 25,
    dueTime: "15:00",
    estimatedDuration: 40,
    categoryLabel: "Statistika",
    steps: [
      { id: "s1", text: "Oylik statistika ko'rsatkichlarini jamlash", completed: false, estimatedMinutes: 15 },
      { id: "s2", text: "stat.uz tizimiga kirib shaklni to'ldirish", completed: false, estimatedMinutes: 15 },
      { id: "s3", text: "Hisobotni jo'natish va qabul qilingan kvitansiyasini saqlash", completed: false, estimatedMinutes: 10 }
    ]
  },
  {
    id: "builtin-tmpl-7",
    title: "Kontragentlar bilan solishtirma dalolatnomalar (Akt sverki)",
    priority: "Ichki hisobot(O'rtacha)",
    scheduleType: "weekly",
    dateMode: "single",
    dueTime: "16:00",
    estimatedDuration: 35,
    categoryLabel: "Hisob-kitoblar",
    steps: [
      { id: "s1", text: "Asosiy mijoz va ta'minotchilar bo'yicha akt sverka chiqarish", completed: false, estimatedMinutes: 15 },
      { id: "s2", text: "Elektron pochta yoki Didox orqali jo'natish", completed: false, estimatedMinutes: 10 },
      { id: "s3", text: "Imzolangan javob aktlarini tekshirish va arxivga biriktirish", completed: false, estimatedMinutes: 10 }
    ]
  },
  {
    id: "builtin-tmpl-8",
    title: "Ofis ijarasi va kommunal xizmatlar to'lovini amalga oshirish",
    priority: "Ichki hisobot(Muhim)",
    scheduleType: "monthly",
    dateMode: "single",
    monthlyDay: 10,
    dueTime: "11:00",
    estimatedDuration: 25,
    categoryLabel: "To'lovlar",
    steps: [
      { id: "s1", text: "Hisobvaraq-faktura va ko'rsatkichlarni tekshirish", completed: false, estimatedMinutes: 10 },
      { id: "s2", text: "Internet-banking orqali to'lov topshirig'ini jo'natish", completed: false, estimatedMinutes: 15 }
    ]
  }
];

export function getStoredTaskTemplatesHistory(): TaskTemplateItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TEMPLATES_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function rememberTaskAsTemplate(task: Task): void {
  if (!task || !task.title || !task.title.trim()) return;
  try {
    const current = getStoredTaskTemplatesHistory();
    const cleanTitle = task.title.trim().toLowerCase();
    const filtered = current.filter((item) => item.title.trim().toLowerCase() !== cleanTitle);

    const newItem: TaskTemplateItem = {
      id: "history-tmpl-" + Date.now(),
      title: task.title.trim(),
      steps: task.steps && task.steps.length > 0 ? task.steps.map((s) => ({ ...s, completed: false })) : [{ id: "s1", text: task.title.trim(), completed: false }],
      priority: task.priority,
      scheduleType: task.scheduleType || "once",
      dateMode: task.dateMode,
      monthlyDay: task.monthlyDay,
      monthlyStartDay: task.monthlyStartDay,
      monthlyEndDay: task.monthlyEndDay,
      dueTime: task.dueTime,
      estimatedDuration: task.estimatedDuration,
      categoryLabel: "Kiritilgan vazifalar tarixi"
    };

    filtered.unshift(newItem);
    if (filtered.length > 50) filtered.pop();
    localStorage.setItem(STORAGE_KEY_TEMPLATES_HISTORY, JSON.stringify(filtered));
  } catch (e) {
    console.error("Failed to remember task template:", e);
  }
}

export function getAllTaskTemplates(existingTasks?: Task[]): TaskTemplateItem[] {
  const result: TaskTemplateItem[] = [];
  const seenTitles = new Set<string>();

  // 1. First priority: tasks currently in existingTasks (most recent first)
  if (existingTasks && existingTasks.length > 0) {
    for (const t of [...existingTasks].reverse()) {
      const key = t.title.trim().toLowerCase();
      if (key && !seenTitles.has(key)) {
        seenTitles.add(key);
        result.push({
          id: t.id,
          title: t.title.trim(),
          steps: t.steps && t.steps.length > 0 ? t.steps.map((s) => ({ ...s, completed: false })) : [{ id: "s1", text: t.title.trim(), completed: false }],
          priority: t.priority,
          scheduleType: t.scheduleType || "once",
          dateMode: t.dateMode,
          monthlyDay: t.monthlyDay,
          monthlyStartDay: t.monthlyStartDay,
          monthlyEndDay: t.monthlyEndDay,
          dueTime: t.dueTime,
          estimatedDuration: t.estimatedDuration,
          categoryLabel: "Mavjud vazifa"
        });
      }
    }
  }

  // 2. Second priority: remembered templates history in localStorage
  const historyTemplates = getStoredTaskTemplatesHistory();
  for (const ht of historyTemplates) {
    const key = ht.title.trim().toLowerCase();
    if (key && !seenTitles.has(key)) {
      seenTitles.add(key);
      result.push({
        ...ht,
        categoryLabel: ht.categoryLabel || "Oldingi vazifalar"
      });
    }
  }

  // 3. Third priority: built-in standard templates
  for (const bt of DEFAULT_BUILTIN_TEMPLATES) {
    const key = bt.title.trim().toLowerCase();
    if (key && !seenTitles.has(key)) {
      seenTitles.add(key);
      result.push(bt);
    }
  }

  return result;
}

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

export function formatTaskScheduleDisplay(task: Task): {
  label: string;
  detail: string;
  shortTag: string;
  badgeClass: string;
} {
  if (task.scheduleType === "daily") {
    return {
      label: "Har kunlik",
      detail: task.startDate ? `${formatDateUz(task.startDate)} dan har kuni muntazam eslatiladi` : "Har kuni muntazam eslatiladi",
      shortTag: "Har kuni",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200"
    };
  }

  if (task.scheduleType === "every_3_days") {
    return {
      label: "Har 3 kunda bir",
      detail: task.startDate ? `${formatDateUz(task.startDate)} dan har 3 kunda eslatiladi` : "Har 3 kunda bir",
      shortTag: "Har 3 kunda",
      badgeClass: "bg-teal-50 text-teal-700 border-teal-200"
    };
  }

  if (task.scheduleType === "weekly") {
    return {
      label: "Har haftada bir",
      detail: task.startDate ? `${formatDateUz(task.startDate)} dan har haftada bir marta` : "Har haftada bir marta",
      shortTag: "Har hafta",
      badgeClass: "bg-cyan-50 text-cyan-700 border-cyan-200"
    };
  }

  if (task.scheduleType === "monthly") {
    if (task.dateMode === "range" && task.monthlyStartDay && task.monthlyEndDay) {
      return {
        label: `Har oy (${task.monthlyStartDay}-${task.monthlyEndDay}-kunlar)`,
        detail: `Har oyning ${task.monthlyStartDay}-sanasidan ${task.monthlyEndDay}-sanasigacha`,
        shortTag: `Har oy (${task.monthlyStartDay}-${task.monthlyEndDay}-kun)`,
        badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200"
      };
    }
    if (task.monthlyDay) {
      return {
        label: `Har oy (${task.monthlyDay}-kun)`,
        detail: `Har oyning ${task.monthlyDay}-sanasida`,
        shortTag: `Har oy (${task.monthlyDay}-kun)`,
        badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200"
      };
    }
    return {
      label: "Oyda bir marta",
      detail: task.startDate ? `${formatDateUz(task.startDate)} dan har oy muntazam eslatiladi` : "Har oy muntazam eslatiladi",
      shortTag: "Oyda bir marta",
      badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200"
    };
  }

  // Once (Bir martalik)
  if (task.dateMode === "range" && task.startDate && task.dueDate) {
    return {
      label: "Muddat oralig'ida",
      detail: `${formatDateUz(task.startDate)} dan ${formatDateUz(task.dueDate)} gacha`,
      shortTag: "Muddat oralig'i",
      badgeClass: "bg-slate-100 text-slate-700 border-slate-200"
    };
  }

  return {
    label: "Bir martalik",
    detail: formatDateUz(task.dueDate),
    shortTag: "Bir martalik",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200"
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

export interface TaskOverdueRolloverInfo {
  isRolledOver: boolean;
  timesRolled: number;
  label: string; // e.g. "Bajarilmay qolgan (2-marta ko'chirilgan)"
  shortBadge: string; // e.g. "⚠️ Bajarilmay o'tgan (2x)"
  detailedNotice: string; // Tushuntirish matni
  originalDate?: string;
  lastRolledDate?: string;
}

/**
 * Returns structured info if a task was carried over due to not being completed,
 * including how many times it was delayed/rolled over.
 */
export function getTaskOverdueRolloverInfo(task: Task): TaskOverdueRolloverInfo | null {
  if (!task) return null;
  const autoCount = task.autoRolledCount ?? 0;
  const histCount =
    task.history?.filter(
      (h) =>
        h.isAutomatic ||
        h.reason?.toLowerCase().includes("bajarilmasdan") ||
        h.reason?.toLowerCase().includes("bajarilmagan") ||
        h.reason?.toLowerCase().includes("avtomatik")
    ).length ?? 0;

  const times = Math.max(autoCount, histCount);

  if (times <= 0 && !task.isOverdueRolled) {
    return null;
  }

  const timesRolled = times > 0 ? times : 1;

  let originalDate = task.originalDueDate;
  if (!originalDate && task.history && task.history.length > 0) {
    const firstAuto = task.history.find(
      (h) =>
        h.isAutomatic ||
        h.reason?.toLowerCase().includes("bajarilmasdan") ||
        h.reason?.toLowerCase().includes("bajarilmagan")
    );
    if (firstAuto) originalDate = firstAuto.oldDate;
  }

  return {
    isRolledOver: true,
    timesRolled,
    label: `Bajarilmay qolgan (${timesRolled}-marta ko'chirilgan)`,
    shortBadge: `⚠️ Bajarilmay o'tgan (${timesRolled}x)`,
    detailedNotice: `Bu vazifa oldingi kunda bajarilmay qolgani sababli avtomatik bugungi kunga ko'chirildi. Jami ${timesRolled} marta kech qolib boshqa kunga o'tgan.${
      originalDate ? ` (Dastlabki rejalashtirilgan sana: ${formatDateUz(originalDate)})` : ""
    }`,
    originalDate,
    lastRolledDate: task.lastRolledDate || task.dueDate,
  };
}

/**
 * Automatically checks for overdue tasks and rolls them over to today/next day
 * regardless of the number of existing tasks on that day.
 */
export function checkAndPerformAutoRollover(tasks: Task[]): {
  updatedTasks: Task[];
  rolledCount: number;
  changedTasks: Task[];
} {
  const today = getTodayString();
  const changedTasks: Task[] = [];
  let rolledCount = 0;

  const updatedTasks = tasks.map((task) => {
    // If completed or not past due, do not touch
    if (task.isCompleted || task.dueDate >= today) {
      return task;
    }

    // Task is uncompleted and dueDate is before today:
    // Automatically roll over to today regardless of how many tasks are on today!
    rolledCount++;
    const oldDate = task.dueDate;
    const prevAuto = task.autoRolledCount ?? 0;
    const prevHist =
      task.history?.filter(
        (h) =>
          h.isAutomatic ||
          h.reason?.toLowerCase().includes("bajarilmasdan") ||
          h.reason?.toLowerCase().includes("bajarilmagan")
      ).length ?? 0;
    const autoCount = Math.max(prevAuto, prevHist) + 1;
    const originalDueDate = task.originalDueDate || oldDate;

    const historyItem = {
      id: "hist-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      oldDate,
      newDate: today,
      oldTime: task.dueTime,
      newTime: task.dueTime,
      reason: `Oldingi kunda bajarilmay qoldirilgani sababli avtomatik bugungi kunga o'tkazildi (${autoCount}-marta kechikish)`,
      rescheduledAt: new Date().toISOString(),
      operator: "Tizim (Avtomatik)",
      isAutomatic: true,
      type: "date" as const,
      scope: "temporary" as const,
    };

    const updatedHistory = [...(task.history || []), historyItem];

    addActivityLog({
      operator: "Tizim",
      action: "auto_rolled",
      taskTitle: task.title,
      details: `Vazifa o'z vaqtida (${formatDateUz(oldDate)}) bajarilmagani sababli avtomatik tarzda bugungi kunga (${formatDateUz(today)}) o'tkazildi. Jami ${autoCount} marta kech qolib ko'chirilgan.`,
    });

    const rolledTask: Task = {
      ...task,
      dueDate: today,
      status: "rescheduled" as const,
      history: updatedHistory,
      autoRolledCount: autoCount,
      lastRolledDate: today,
      originalDueDate,
      isOverdueRolled: true,
    };

    changedTasks.push(rolledTask);
    return rolledTask;
  });

  if (rolledCount > 0) {
    saveStoredTasks(updatedTasks);
  }

  return { updatedTasks, rolledCount, changedTasks };
}

