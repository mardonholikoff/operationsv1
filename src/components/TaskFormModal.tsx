import React, { useState, useEffect, useMemo } from "react";
import { Task, TaskPriority, ScheduleType, DateMode, TaskStep, User } from "../types";
import {
  getTodayString,
  getNextMonthlyDate,
  getCreatorLabel,
  addDaysToDate,
  addMonthsToDate,
  formatDateUz,
  getAllTaskTemplates,
  TaskTemplateItem,
} from "../services/storage";
import {
  X,
  Plus,
  Trash2,
  Calendar,
  Repeat,
  CalendarDays,
  FileCheck2,
  Layers,
  AlertCircle,
  Clock,
  ArrowRight,
  Sparkles,
  Info,
  ShieldCheck,
  History,
  RotateCcw,
  CheckCircle2,
  Search,
  Copy,
  ChevronDown
} from "lucide-react";

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTask: (taskData: Omit<Task, "id" | "createdAt" | "createdBy" | "history">) => void;
  initialTask?: Task | null;
  currentUser?: User | null;
  defaultDate?: string;
  defaultTime?: string;
  existingTasks?: Task[];
}

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; desc: string; color: string }[] = [
  {
    value: "Soliq(Muhim)",
    label: "Soliq (Muhim)",
    desc: "Soliq idoralari hisobotlari va to'lovlari (Yuqori daraja)",
    color: "bg-rose-50 border-rose-300 text-rose-800"
  },
  {
    value: "Ichki hisobot(Muhim)",
    label: "Ichki hisobot (Muhim)",
    desc: "Rahbariyat va bosh buxgalter uchun birlamchi hisobotlar",
    color: "bg-amber-50 border-amber-300 text-amber-800"
  },
  {
    value: "Ichki hisobot(O'rtacha)",
    label: "Ichki hisobot (O'rtacha)",
    desc: "Muntazam davriy monitoring va solishtirish aktlari",
    color: "bg-blue-50 border-blue-300 text-blue-800"
  },
  {
    value: "Ichki hisobot(Past)",
    label: "Ichki hisobot (Past)",
    desc: "Kichik ichki ma'lumotnomalar va yozishmalar",
    color: "bg-slate-50 border-slate-300 text-slate-800"
  },
  {
    value: "Takrorlanmas ish(Muhim)",
    label: "Takrorlanmas ish (Muhim)",
    desc: "Kechiktirib bo'lmaydigan alohida topshiriqlar",
    color: "bg-purple-50 border-purple-300 text-purple-800"
  },
  {
    value: "Takrorlanmas ish(O'rtacha)",
    label: "Takrorlanmas ish (O'rtacha)",
    desc: "Oddiy kundalik topshiriqlar va buyurtmalar",
    color: "bg-indigo-50 border-indigo-300 text-indigo-800"
  },
  {
    value: "Takrorlanmas ish(Past)",
    label: "Takrorlanmas ish (Past)",
    desc: "Muddati erkin bo'lgan kichik ishlar",
    color: "bg-emerald-50 border-emerald-300 text-emerald-800"
  }
];

const SCHEDULE_TYPES_LIST: {
  id: ScheduleType;
  title: string;
  sub: string;
  badge: string;
  icon: any;
}[] = [
  {
    id: "daily",
    title: "Har kunlik",
    sub: "Boshlanish sanasidan har kuni eslatadi",
    badge: "Har kun",
    icon: CalendarDays,
  },
  {
    id: "every_3_days",
    title: "Har 3 kunda bir",
    sub: "Boshlanish sanasidan har 3 kunda eslatadi",
    badge: "Har 3 kun",
    icon: Repeat,
  },
  {
    id: "weekly",
    title: "Har haftada bir",
    sub: "Boshlanish sanasidan har 7 kunda eslatadi",
    badge: "Har hafta",
    icon: Calendar,
  },
  {
    id: "monthly",
    title: "Har oyda bir martta",
    sub: "Boshlanish sanasidan har oy muntazam eslatadi",
    badge: "Har oy",
    icon: Repeat,
  },
  {
    id: "once",
    title: "Bir martalik",
    sub: "Faqat bir martalik sana yoki muddat oralig'i",
    badge: "1 martalik",
    icon: Clock,
  },
];

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  onSaveTask,
  initialTask,
  currentUser,
  defaultDate,
  defaultTime,
  existingTasks = [],
}) => {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("Soliq(Muhim)");
  
  // Schedule type: daily | every_3_days | weekly | monthly | once
  const [scheduleType, setScheduleType] = useState<ScheduleType>("daily");
  
  // Tur: 'single' (1-bir kunga belgilash) vs 'range' (2-ma'lum muddat oralig'iga belgilash)
  const [dateMode, setDateMode] = useState<DateMode>("single");

  // Recurring / Once common Start Date
  const [startDate, setStartDate] = useState<string>(getTodayString());
  const [dueDate, setDueDate] = useState<string>(getTodayString());
  const [dueTime, setDueTime] = useState<string>("09:00");
  const [estimatedDuration, setEstimatedDuration] = useState<number | undefined>(undefined);

  // Monthly special fields (for month day range if needed)
  const [monthlyDay, setMonthlyDay] = useState<number>(15);
  const [monthlyStartDay, setMonthlyStartDay] = useState<number>(10);
  const [monthlyEndDay, setMonthlyEndDay] = useState<number>(20);
  const [useMonthlyDayPicker, setUseMonthlyDayPicker] = useState<boolean>(false);

  const [steps, setSteps] = useState<{ id: string; text: string; completed: boolean; estimatedMinutes?: number }[]>([
    { id: "step-1", text: "", completed: false }
  ]);
  const [errorMessage, setErrorMessage] = useState("");

  // Template / Oldingi vazifadan nusxa olish holati
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [templateSearchQuery, setTemplateSearchQuery] = useState<string>("");
  const [appliedTemplateNotification, setAppliedTemplateNotification] = useState<string | null>(null);

  // Barcha mavjud andozalar (oldingi kiritilgan vazifalar + saqlangan tarix + standart tayyor andozalar)
  const allTemplates = useMemo(() => {
    return getAllTaskTemplates(existingTasks);
  }, [existingTasks, isOpen]);

  // Qidiruv bo'yicha filtrlangan andozalar
  const filteredTemplates = useMemo(() => {
    if (!templateSearchQuery.trim()) return allTemplates;
    const q = templateSearchQuery.toLowerCase().trim();
    return allTemplates.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.priority.toLowerCase().includes(q) ||
        (t.categoryLabel && t.categoryLabel.toLowerCase().includes(q)) ||
        t.steps?.some((s) => s.text.toLowerCase().includes(q))
    );
  }, [allTemplates, templateSearchQuery]);

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title);
      setPriority(initialTask.priority);
      setScheduleType(initialTask.scheduleType || "once");
      setDateMode(initialTask.dateMode || "single");
      setMonthlyDay(initialTask.monthlyDay || 15);
      setMonthlyStartDay(initialTask.monthlyStartDay || 10);
      setMonthlyEndDay(initialTask.monthlyEndDay || 20);
      setStartDate(initialTask.startDate || initialTask.dueDate || getTodayString());
      setDueDate(initialTask.dueDate || getTodayString());
      setDueTime(initialTask.dueTime || "09:00");
      setEstimatedDuration(initialTask.estimatedDuration);
      setUseMonthlyDayPicker(Boolean(initialTask.monthlyDay || initialTask.monthlyStartDay));
      setSteps(
        initialTask.steps && initialTask.steps.length > 0
          ? initialTask.steps.map((s) => ({ ...s }))
          : [{ id: "step-1", text: "", completed: false }]
      );
      setSelectedTemplateId("");
      setAppliedTemplateNotification(null);
      setTemplateSearchQuery("");
    } else {
      // Reset form for fresh task
      setTitle("");
      setPriority("Soliq(Muhim)");
      setScheduleType("daily");
      setDateMode("single");
      setMonthlyDay(15);
      setMonthlyStartDay(10);
      setMonthlyEndDay(20);
      setStartDate(defaultDate || getTodayString());
      setDueDate(defaultDate || getTodayString());
      setDueTime(defaultTime || "09:00");
      setEstimatedDuration(undefined);
      setUseMonthlyDayPicker(false);
      setSteps([{ id: "step-1", text: "", completed: false }]);
      setErrorMessage("");
      setSelectedTemplateId("");
      setAppliedTemplateNotification(null);
      setTemplateSearchQuery("");
    }
  }, [initialTask, isOpen, defaultDate, defaultTime]);

  // Oldingi vazifadan andoza sifatida formani avtomatik to'ldirish
  const applyTemplate = (templateTask: TaskTemplateItem | Task) => {
    setTitle(templateTask.title);
    setPriority(templateTask.priority);
    setScheduleType(templateTask.scheduleType || "once");
    setDateMode(templateTask.dateMode || "single");
    setMonthlyDay(templateTask.monthlyDay || 15);
    setMonthlyStartDay(templateTask.monthlyStartDay || 10);
    setMonthlyEndDay(templateTask.monthlyEndDay || 20);
    setDueTime(templateTask.dueTime || "09:00");
    setEstimatedDuration(templateTask.estimatedDuration);
    setUseMonthlyDayPicker(Boolean(templateTask.monthlyDay || templateTask.monthlyStartDay));

    // Yangi amallar ro'yxati (yangi id lar bilan va completed: false holatda)
    if (templateTask.steps && templateTask.steps.length > 0) {
      setSteps(
        templateTask.steps.map((s, idx) => ({
          id: `step-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
          text: s.text,
          completed: false,
          estimatedMinutes: s.estimatedMinutes,
        }))
      );
    } else {
      setSteps([{ id: "step-1", text: templateTask.title, completed: false }]);
    }

    // Sana: agar ochilganda defaultDate belgilangan bo'lsa uni saqlab qolamiz
    const targetDate = defaultDate || getTodayString();
    setStartDate(targetDate);
    setDueDate(targetDate);

    setSelectedTemplateId(templateTask.id);
    setErrorMessage("");

    setAppliedTemplateNotification(
      `"${templateTask.title}" andozasi tanlandi va barcha maydonlar to'ldirildi. O'zingizga moslab bemalol tahrirlashingiz mumkin.`
    );
  };

  // Andozani tozalab noldan boshlash
  const handleResetToBlank = () => {
    setTitle("");
    setPriority("Soliq(Muhim)");
    setScheduleType("daily");
    setDateMode("single");
    setMonthlyDay(15);
    setMonthlyStartDay(10);
    setMonthlyEndDay(20);
    setStartDate(defaultDate || getTodayString());
    setDueDate(defaultDate || getTodayString());
    setDueTime(defaultTime || "09:00");
    setEstimatedDuration(undefined);
    setUseMonthlyDayPicker(false);
    setSteps([{ id: "step-1", text: "", completed: false }]);
    setSelectedTemplateId("");
    setAppliedTemplateNotification(null);
    setErrorMessage("");
  };

  // Vazifa nomi kiritilayotganda mos keluvchi tezkor takliflar (autocomplete)
  const titleSuggestions = useMemo(() => {
    if (!title.trim() || title.trim().length < 2 || initialTask) return [];
    const q = title.toLowerCase().trim();
    return allTemplates
      .filter((t) => t.title.toLowerCase().includes(q) && t.title.toLowerCase() !== q)
      .slice(0, 4);
  }, [title, allTemplates, initialTask]);

  // Handler for schedule type toggle
  const handleScheduleTypeChange = (type: ScheduleType) => {
    setScheduleType(type);
    if (type === "monthly") {
      if (useMonthlyDayPicker) {
        const targetDay = dateMode === "range" ? monthlyEndDay : monthlyDay;
        setDueDate(getNextMonthlyDate(targetDay));
      } else {
        setDueDate(startDate || getTodayString());
      }
    } else if (type === "once") {
      setDueDate(dueDate || startDate || getTodayString());
    } else {
      // daily, every_3_days, weekly
      setDueDate(startDate || getTodayString());
    }
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (scheduleType !== "once" || dateMode === "single") {
      setDueDate(val);
    }
  };

  const handleAddStep = () => {
    setSteps((prev) => [
      ...prev,
      { id: "step-" + Date.now() + "-" + prev.length, text: "", completed: false }
    ]);
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length <= 1) {
      setSteps([{ id: "step-1", text: "", completed: false }]);
      return;
    }
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStepTextChange = (index: number, text: string) => {
    setSteps((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], text };
      return updated;
    });
  };

  const handleStepMinutesChange = (index: number, minutesVal: string) => {
    const min = minutesVal ? Math.max(0, parseInt(minutesVal, 10)) : undefined;
    setSteps((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], estimatedMinutes: min };
      return updated;
    });
  };

  const sumStepMinutes = steps.reduce((acc, s) => acc + (Number(s.estimatedMinutes) || 0), 0);
  const remainingMinutes = estimatedDuration !== undefined ? estimatedDuration - sumStepMinutes : 0;
  const isOverDuration = estimatedDuration !== undefined && estimatedDuration > 0 && sumStepMinutes > estimatedDuration;

  const setQuickStartDate = (daysOffset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    const dateStr = d.toISOString().split("T")[0];
    setStartDate(dateStr);
    if (scheduleType !== "once" || dateMode === "single") {
      setDueDate(dateStr);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage("Vazifa nomini kiritish majburiy!");
      return;
    }

    let finalStartDate = startDate;
    let finalDueDate = dueDate;

    if (scheduleType === "daily" || scheduleType === "every_3_days" || scheduleType === "weekly") {
      if (!startDate) {
        setErrorMessage("Boshlanish sanasini belgilang!");
        return;
      }
      finalStartDate = startDate;
      finalDueDate = startDate;
    } else if (scheduleType === "monthly") {
      if (useMonthlyDayPicker && dateMode === "range") {
        if (monthlyStartDay > monthlyEndDay) {
          setErrorMessage("Boshlanish kuni tugash kunidan katta bo'lishi mumkin emas!");
          return;
        }
        finalDueDate = getNextMonthlyDate(monthlyEndDay);
      } else if (useMonthlyDayPicker && dateMode === "single") {
        finalDueDate = getNextMonthlyDate(monthlyDay);
      } else {
        if (!startDate) {
          setErrorMessage("Boshlanish sanasini belgilang!");
          return;
        }
        finalStartDate = startDate;
        finalDueDate = startDate;
      }
    } else {
      // Once (Bir martalik)
      if (!dueDate) {
        setErrorMessage("Vazifa sanasini belgilang!");
        return;
      }
      if (dateMode === "range") {
        if (!startDate) {
          setErrorMessage("Boshlanish sanasini belgilang!");
          return;
        }
        if (startDate > dueDate) {
          setErrorMessage("Boshlanish sanasi yakuniy muddatdan keyin bo'lishi mumkin emas!");
          return;
        }
        finalStartDate = startDate;
      } else {
        finalStartDate = undefined;
      }
    }

    if (estimatedDuration && estimatedDuration > 0 && sumStepMinutes > estimatedDuration) {
      setErrorMessage(
        `Amallar uchun taqsimlangan vaqtlar yig'indisi (${sumStepMinutes} daqiqa) vazifaning umumiy vaqtidan (${estimatedDuration} daqiqa) oshib ketdi! Iltimos, amallar vaqtini to'g'rilang.`
      );
      return;
    }

    const cleanedSteps: TaskStep[] = steps
      .filter((s) => s.text.trim().length > 0)
      .map((s) => ({
        id: s.id || `step-${Date.now()}-${Math.random()}`,
        text: s.text.trim(),
        completed: Boolean(s.completed),
        estimatedMinutes: s.estimatedMinutes && s.estimatedMinutes > 0 ? Number(s.estimatedMinutes) : undefined,
      }));

    if (cleanedSteps.length === 0) {
      cleanedSteps.push({
        id: `step-${Date.now()}-0`,
        text: title.trim(),
        completed: false,
      });
    }

    onSaveTask({
      title: title.trim(),
      priority,
      scheduleType,
      dateMode: scheduleType === "once" ? dateMode : "single",
      monthlyDay: scheduleType === "monthly" && useMonthlyDayPicker && dateMode === "single" ? monthlyDay : undefined,
      monthlyStartDay: scheduleType === "monthly" && useMonthlyDayPicker && dateMode === "range" ? monthlyStartDay : undefined,
      monthlyEndDay: scheduleType === "monthly" && useMonthlyDayPicker && dateMode === "range" ? monthlyEndDay : undefined,
      startDate: finalStartDate,
      dueDate: finalDueDate,
      dueTime: dueTime.trim() || undefined,
      estimatedDuration: estimatedDuration && estimatedDuration > 0 ? estimatedDuration : undefined,
      steps: cleanedSteps,
      status: "pending",
      isCompleted: false,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col animate-fadeIn">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  {initialTask ? "Vazifani Tahrirlash" : "Yangi Vazifa Kiritish"}
                </h2>
                {initialTask && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    {getCreatorLabel(initialTask.createdBy).text}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Vazifa nomi, bajarish amallari, muhimlik va muddat turini tanlang
              </p>
            </div>
          </div>
          <button
            id="btn-close-task-modal"
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 sm:p-6 space-y-5 flex-1">
          {/* Admin Role Notification */}
          {currentUser?.role === "admin" && (
            <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 text-xs flex items-center space-x-2.5 shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
              <div className="leading-relaxed">
                <strong className="font-bold text-purple-900">Bosh Administrator:</strong> Siz kiritgan vazifaga avtomatik tarzda <em>"admin tomonidan qo'shilgan"</em> deb belgi va doimiy izoh yoziladi.
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Oldingi (eski) vazifalardan andoza tanlash (Avtomatik to'ldirish) */}
          {!initialTask && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/80 to-slate-50 border-2 border-indigo-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-indigo-950 font-bold text-xs sm:text-sm">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-extrabold text-indigo-950">Eski vazifalardan tanlash</span>
                    <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold">
                      {allTemplates.length} ta andoza
                    </span>
                  </div>
                </div>
                {selectedTemplateId && (
                  <button
                    type="button"
                    onClick={handleResetToBlank}
                    className="inline-flex items-center space-x-1 text-xs font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                    title="Andozani bekor qilish va yangidan boshlash"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Tozalash</span>
                  </button>
                )}
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Avval kiritilgan vazifalar bilan bir xil bo'lsa, qayta to'ldirib o'tirmang — quyidan tanlang. Barcha maydonlar (nomi, vaqti, amallari, muhimligi) avtomatik to'ladi va keyin <strong>bemalol o'zingiz tahrirlashingiz mumkin</strong>.
              </p>

              {/* Tezkor tavsiyalar (Eng ko'p kiritiladigan andozalar) */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Tezkor andozalar:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {allTemplates.slice(0, 5).map((tmpl) => {
                    const isSelected = selectedTemplateId === tmpl.id;
                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => applyTemplate(tmpl)}
                        className={`inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-700 shadow-xs"
                            : "bg-white hover:bg-indigo-50 border-indigo-200 hover:border-indigo-300 text-indigo-900"
                        }`}
                        title="Ushbu vazifani andoza sifatida tanlash"
                      >
                        <Copy className={`w-3 h-3 ${isSelected ? "text-white" : "text-indigo-500"}`} />
                        <span className="truncate max-w-[180px] sm:max-w-xs">{tmpl.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Qidiruv va tanlash ro'yxati */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
                <div className="sm:col-span-5 relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={templateSearchQuery}
                    onChange={(e) => setTemplateSearchQuery(e.target.value)}
                    placeholder="Andozani qidirish..."
                    className="w-full pl-8 pr-3 py-2 bg-white border border-indigo-200 hover:border-indigo-300 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  {templateSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setTemplateSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="sm:col-span-7">
                  <select
                    id="select-task-template"
                    value={selectedTemplateId}
                    onChange={(e) => {
                      const found = allTemplates.find((t) => t.id === e.target.value);
                      if (found) {
                        applyTemplate(found);
                      } else if (e.target.value === "") {
                        handleResetToBlank();
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-indigo-200 hover:border-indigo-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 shadow-2xs focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Barcha andozalar ro'yxatidan tanlang ({filteredTemplates.length} ta) --</option>
                    {filteredTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.categoryLabel ? `[${t.categoryLabel}] ` : ""}{t.title}  ({t.priority} • {t.steps?.length || 1} ta amal)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Muvaffaqiyat bildirishnomasi */}
              {appliedTemplateNotification && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-start justify-between shadow-2xs animate-fadeIn">
                  <div className="flex items-start space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-emerald-950">Andoza muvaffaqiyatli yuklandi!</span>
                      <span className="leading-snug text-emerald-800">
                        {appliedTemplateNotification} Pastdagi maydonlar, sana, soat va amallar ro'yxatini bemalol tahrirlashingiz mumkin.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAppliedTemplateNotification(null)}
                    className="text-emerald-700 hover:text-emerald-950 font-bold px-1.5 py-0.5 rounded cursor-pointer ml-2"
                    title="Xabarni yopish"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 1. Vazifa Nomi */}
          <div>
            <label
              htmlFor="task-title-input"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              Vazifa Nomi <span className="text-rose-500">*</span>
            </label>
            <input
              id="task-title-input"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Masalan: QQS hisobotini soliq.uz orqali topshirish"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium"
            />

            {/* Avtomatik takliflar (nom yozilayotganda mos oldingi vazifalar) */}
            {titleSuggestions.length > 0 && !selectedTemplateId && (
              <div className="mt-2 p-2.5 rounded-xl bg-blue-50/90 border border-blue-200 text-xs space-y-1.5 animate-fadeIn">
                <div className="text-[11px] font-bold text-blue-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>O'xshash oldingi vazifa topildi (bitta bosishda to'liq to'ldirish):</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {titleSuggestions.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => applyTemplate(st)}
                      className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-blue-100 border border-blue-200 hover:border-blue-400 text-blue-900 text-xs font-semibold transition-all cursor-pointer shadow-2xs group"
                      title="Ushbu vazifadan andoza olish"
                    >
                      <Copy className="w-3 h-3 text-blue-500 group-hover:scale-110 transition-transform" />
                      <span className="font-bold truncate max-w-[200px] sm:max-w-xs">{st.title}</span>
                      <span className="text-[10px] text-blue-600 font-normal">
                        ({st.steps?.length || 1} amal{st.estimatedDuration ? `, ${st.estimatedDuration} daq` : ""})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. Vazifa Uchun Ketadigan Vaqt (ixtiyoriy) */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>Vazifa Uchun Ketadigan Vaqt (ixtiyoriy)</span>
              </label>
              {estimatedDuration !== undefined && (
                <button
                  type="button"
                  onClick={() => {
                    setEstimatedDuration(undefined);
                    setSteps((prev) => prev.map((s) => ({ ...s, estimatedMinutes: undefined })));
                  }}
                  className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                >
                  Vaqtni olib tashlash
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1.5">
                <input
                  type="number"
                  min={1}
                  value={estimatedDuration || ""}
                  onChange={(e) => setEstimatedDuration(e.target.value ? Math.max(1, parseInt(e.target.value, 10)) : undefined)}
                  placeholder="Masalan: 60"
                  className="w-28 px-3 py-2 rounded-xl bg-white border border-indigo-300 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-600 font-semibold">daqiqa</span>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1 items-center">
                {[15, 30, 45, 60, 90, 120, 180].map((min) => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => setEstimatedDuration(min)}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                      estimatedDuration === min
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                        : "bg-white text-slate-700 border-indigo-200 hover:bg-indigo-100/60"
                    }`}
                  >
                    {min >= 60 ? `${min / 60} soat` : `${min} daq`}
                  </button>
                ))}
              </div>
            </div>

            {estimatedDuration !== undefined && estimatedDuration > 0 && (
              <div className={`p-2.5 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-1 ${
                isOverDuration
                  ? "bg-rose-50 border-rose-300 text-rose-800 font-semibold"
                  : remainingMinutes === 0
                  ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                  : "bg-indigo-100/70 border-indigo-300 text-indigo-900"
              }`}>
                <span>
                  Amallarga taqsimlangan: <strong>{sumStepMinutes} daqiqa</strong> / Jami: <strong>{estimatedDuration} daqiqa</strong>
                </span>
                <span className="font-bold">
                  {isOverDuration ? (
                    <span className="text-rose-700">⚠️ {Math.abs(remainingMinutes)} daqiqa oshib ketdi!</span>
                  ) : remainingMinutes === 0 ? (
                    <span className="text-emerald-700">✓ To'liq taqsimlandi</span>
                  ) : (
                    <span>Qolgan vaqt: {remainingMinutes} daqiqa</span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* 3. Vazifani qilish uchun kerak amallar (Checklist) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Vazifani Qilish Uchun Kerak Amallar
              </label>
              <span className="text-xs text-slate-400">
                {estimatedDuration ? "Har bir amalga ketadigan vaqtni ham belgilashingiz mumkin" : "Ketma-ket bosqichlar"}
              </span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {steps.map((step, idx) => (
                <div key={step.id} className="flex items-center space-x-2">
                  <span className="w-5 text-center text-xs font-bold text-slate-400 shrink-0">
                    {idx + 1}.
                  </span>
                  <input
                    id={`task-step-input-${idx}`}
                    type="text"
                    value={step.text}
                    onChange={(e) => handleStepTextChange(idx, e.target.value)}
                    placeholder={`Amal ${idx + 1}: kerakli harakatni yozing...`}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />

                  {/* Step Estimated Minutes input if task duration is enabled */}
                  {estimatedDuration !== undefined && (
                    <div className="flex items-center space-x-1 shrink-0" title="Ushbu amal uchun vaqt (daqiqa)">
                      <input
                        type="number"
                        min={0}
                        value={step.estimatedMinutes !== undefined ? step.estimatedMinutes : ""}
                        onChange={(e) => handleStepMinutesChange(idx, e.target.value)}
                        placeholder="daq"
                        className={`w-16 px-2 py-1.5 rounded-lg border text-xs font-semibold text-center focus:ring-2 focus:ring-indigo-500 ${
                          isOverDuration ? "bg-rose-50 border-rose-300 text-rose-800" : "bg-white border-slate-300 text-slate-800"
                        }`}
                      />
                      <span className="text-[10px] text-slate-500 font-semibold">daq</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleRemoveStep(idx)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0 cursor-pointer"
                    title="O'chirish"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              id="btn-add-step"
              onClick={handleAddStep}
              className="mt-2.5 inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg border border-dashed border-blue-300 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Yana amal qo'shish
            </button>
          </div>

          {/* 3. Vazifa Muhimlik Darajasi */}
          <div>
            <label
              htmlFor="task-priority-select"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              Vazifa Muhimlik Darajasi <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                id="task-priority-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer"
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} — {opt.desc}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-2 p-2.5 rounded-xl border text-xs flex items-center space-x-2 bg-slate-50 border-slate-200">
              <Layers className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="text-slate-600">
                Tanlangan toifa:{" "}
                <span className="font-semibold text-slate-800">
                  {PRIORITY_OPTIONS.find((p) => p.value === priority)?.label}
                </span>
              </span>
            </div>
          </div>

          {/* 4. Vazifa Sanasi va Rejalashtirish Imkoniyatlari */}
          <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Vazifa Sanasi va Muddat Imkoniyati
              </label>
              <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                Takrorlanuvchi va Bir martalik
              </span>
            </div>

            {/* 5 xil Rejalashtirish Imkoniyatlari */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SCHEDULE_TYPES_LIST.map((item) => {
                const Icon = item.icon;
                const isSelected = scheduleType === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    id={`btn-schedule-${item.id}`}
                    onClick={() => handleScheduleTypeChange(item.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-500/20"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Icon className={`w-4 h-4 ${isSelected ? "text-white" : "text-blue-600"}`} />
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {item.badge}
                      </span>
                    </div>
                    <div>
                      <div className="font-bold text-xs">{item.title}</div>
                      <div className={`text-[10px] mt-0.5 leading-tight ${isSelected ? "text-blue-100" : "text-slate-400"}`}>
                        {item.sub}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Sub-options for selected schedule type */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
              {/* RECURRING: daily, every_3_days, weekly */}
              {(scheduleType === "daily" || scheduleType === "every_3_days" || scheduleType === "weekly") && (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="recurring-start-date"
                        className="block text-xs font-bold text-slate-700"
                      >
                        Boshlanish sanasi (Qaysi kundan boshlab eslatib borilsin):
                      </label>
                      <span className="text-[11px] text-slate-400">
                        Tanlangan sanadan boshlanadi
                      </span>
                    </div>
                    <input
                      id="recurring-start-date"
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Quick Start Date Presets */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-medium text-slate-400 mr-1">
                      Tezkor boshlash:
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuickStartDate(0)}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    >
                      Bugundan
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickStartDate(1)}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    >
                      Ertadan
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickStartDate(3)}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    >
                      +3 kundan
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickStartDate(7)}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    >
                      +1 haftadan
                    </button>
                  </div>

                  {/* Calculation Preview Banner */}
                  <div className="p-3 bg-blue-50/90 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
                    <div className="font-bold flex items-center text-blue-950">
                      <Sparkles className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                      {scheduleType === "daily" && "Har kunlik davriy eslatma jadvali:"}
                      {scheduleType === "every_3_days" && "Har 3 kunda bir marta eslatish jadvali:"}
                      {scheduleType === "weekly" && "Har haftada bir marta eslatish jadvali:"}
                    </div>
                    <p className="text-blue-800 text-[11px]">
                      {scheduleType === "daily" && (
                        <>
                          Vazifa <strong>{formatDateUz(startDate)}</strong> sanasidan boshlab <strong>har kuni</strong> doimiy ravishda bajarish uchun eslatib turiladi.
                        </>
                      )}
                      {scheduleType === "every_3_days" && (
                        <>
                          Vazifa <strong>{formatDateUz(startDate)}</strong> sanasidan boshlab <strong>har 3 kunda</strong> ketma-ket takrorlanadi (Yaqin sanalar: {startDate}, {addDaysToDate(startDate, 3)}, {addDaysToDate(startDate, 6)}...).
                        </>
                      )}
                      {scheduleType === "weekly" && (
                        <>
                          Vazifa <strong>{formatDateUz(startDate)}</strong> sanasidan boshlab <strong>har 7 kunda (haftada 1 marta)</strong> doimiy ravishda eslatib turiladi.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* RECURRING: monthly */}
              {scheduleType === "monthly" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">
                      Boshlanish sanasi (Har oy shu kundan boshlab):
                    </label>
                    <button
                      type="button"
                      onClick={() => setUseMonthlyDayPicker(!useMonthlyDayPicker)}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                    >
                      {useMonthlyDayPicker ? "Oddiy sana bilan kiritish" : "Aniq oy kunini belgilash"}
                    </button>
                  </div>

                  {!useMonthlyDayPicker ? (
                    <>
                      <input
                        type="date"
                        required
                        value={startDate}
                        onChange={(e) => handleStartDateChange(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="p-3 bg-blue-50/90 border border-blue-200 rounded-xl text-xs text-blue-900">
                        <div className="font-bold mb-0.5">Har oyda bir martta eslatish:</div>
                        <p className="text-[11px] text-blue-800">
                          Vazifa <strong>{formatDateUz(startDate)}</strong> sanasidan boshlanib, <strong>har oy</strong> takroriy vazifa sifatida operatorga eslatiladi.
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3 pt-1">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setDateMode("single")}
                          className={`py-1.5 px-3 rounded-lg text-xs font-bold border text-center transition-all cursor-pointer ${
                            dateMode === "single"
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-slate-50 text-slate-700 border-slate-200"
                          }`}
                        >
                          Har oyning 1-kuni
                        </button>
                        <button
                          type="button"
                          onClick={() => setDateMode("range")}
                          className={`py-1.5 px-3 rounded-lg text-xs font-bold border text-center transition-all cursor-pointer ${
                            dateMode === "range"
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-slate-50 text-slate-700 border-slate-200"
                          }`}
                        >
                          Har oy kunlar oralig'i
                        </button>
                      </div>

                      {dateMode === "single" ? (
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-medium text-slate-600">Oy kuni:</span>
                          <select
                            value={monthlyDay}
                            onChange={(e) => setMonthlyDay(parseInt(e.target.value, 10))}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 font-bold text-blue-700 text-xs"
                          >
                            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                              <option key={day} value={day}>
                                Har oyning {day}-sanasida
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[11px] text-slate-500 block mb-1">Boshlanish:</span>
                            <select
                              value={monthlyStartDay}
                              onChange={(e) => setMonthlyStartDay(parseInt(e.target.value, 10))}
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-blue-700"
                            >
                              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                <option key={day} value={day}>
                                  {day}-sanadan
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-500 block mb-1">Topshirish:</span>
                            <select
                              value={monthlyEndDay}
                              onChange={(e) => setMonthlyEndDay(parseInt(e.target.value, 10))}
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-blue-700"
                            >
                              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                <option key={day} value={day}>
                                  {day}-sanagacha
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ONCE (Bir martalik) */}
              {scheduleType === "once" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      id="btn-mode-single"
                      onClick={() => setDateMode("single")}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border text-center transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                        dateMode === "single"
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>1. Bir kunga belgilash</span>
                    </button>

                    <button
                      type="button"
                      id="btn-mode-range"
                      onClick={() => setDateMode("range")}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border text-center transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                        dateMode === "range"
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>2. Muddat oralig'iga</span>
                    </button>
                  </div>

                  {dateMode === "single" ? (
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-slate-700">
                        Bajarish muddati (Sana):
                      </label>
                      <input
                        type="date"
                        required
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Boshlanish sanasi:
                        </label>
                        <input
                          type="date"
                          required
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Tugash muddati (Dedlayn):
                        </label>
                        <input
                          type="date"
                          required
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-medium"
                        />
                      </div>
                    </div>
                  )}

                  {/* Interaktiv Soat Tanlash (Kunni qaysi soatiga qo'yish) */}
                  <div className="pt-2 border-t border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        <span>Kunni qaysi soatiga qo'yish (Bajarish soati)</span>
                      </label>
                      {dueTime && (
                        <button
                          type="button"
                          onClick={() => setDueTime("")}
                          className="text-[11px] text-slate-500 hover:text-slate-700 underline cursor-pointer"
                        >
                          Soatni tozalash
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        id="task-form-due-time"
                        value={dueTime}
                        onChange={(e) => setDueTime(e.target.value)}
                        className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-bold focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-[11px] text-slate-500">
                        Tanlangan soat: <strong className="text-slate-800">{dueTime || "Belgilanmagan"}</strong>
                      </span>
                    </div>

                    {/* Quick interactive hour pills with overlap indicator */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"].map((h) => {
                        const targetDate = dueDate || startDate;
                        const existingAtHour = existingTasks.filter(
                          (t) => (!initialTask || t.id !== initialTask.id) && t.dueDate === targetDate && t.dueTime === h
                        );
                        const hasCollision = existingAtHour.length > 0;
                        const isSelected = dueTime === h;

                        return (
                          <button
                            key={h}
                            type="button"
                            onClick={() => setDueTime(h)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center space-x-1 ${
                              isSelected
                                ? "bg-blue-600 text-white border-blue-600 shadow-2xs ring-2 ring-blue-500/20"
                                : hasCollision
                                ? "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <span>{h}</span>
                            {hasCollision && (
                              <span
                                className={`text-[9px] px-1 rounded font-extrabold ${
                                  isSelected ? "bg-blue-800 text-blue-100" : "bg-amber-200 text-amber-950"
                                }`}
                                title={`${existingAtHour.length} ta mavjud vazifa bor (ustiga qo'shiladi)`}
                              >
                                {existingAtHour.length}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Collision feedback */}
                    {dueTime && (
                      (() => {
                        const targetDate = dueDate || startDate;
                        const existingAtHour = existingTasks.filter(
                          (t) => (!initialTask || t.id !== initialTask.id) && t.dueDate === targetDate && t.dueTime === dueTime
                        );
                        if (existingAtHour.length === 0) return null;
                        return (
                          <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start space-x-2">
                            <span className="font-bold shrink-0">Kesishuv:</span>
                            <div className="flex-1">
                              Soat <strong>{dueTime}</strong> da hozir {existingAtHour.length} ta vazifa mavjud ("{existingAtHour.map(t => t.title).join(", ")}"). Yangi vazifa uning ustiga ham kiritiladi va jadvalda birga ko'rinadi.
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              id="btn-cancel-task-form"
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Bekor qilish
            </button>
            <button
              id="btn-save-task-form"
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs sm:text-sm shadow-md shadow-blue-500/20 hover:shadow-lg transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>{initialTask ? "O'zgarishlarni Saqlash" : "Vazifani Qo'shish"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
