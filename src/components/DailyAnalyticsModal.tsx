import React, { useState } from "react";
import { Task, TaskPriority } from "../types";
import { formatDateUz, getTodayString } from "../services/storage";
import {
  X,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  Repeat,
  CalendarDays,
  Percent
} from "lucide-react";

interface DailyAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onOpenMonthly?: () => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; bar: string; badge: string }> = {
  "Soliq(Muhim)": {
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-800",
    bar: "bg-rose-600",
    badge: "bg-rose-100 text-rose-800 border-rose-300"
  },
  "Ichki hisobot(Muhim)": {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    bar: "bg-amber-600",
    badge: "bg-amber-100 text-amber-800 border-amber-300"
  },
  "Ichki hisobot(O'rtacha)": {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-800",
    bar: "bg-blue-600",
    badge: "bg-blue-100 text-blue-800 border-blue-300"
  },
  "Ichki hisobot(Past)": {
    bg: "bg-slate-50",
    border: "border-slate-200",
    text: "text-slate-700",
    bar: "bg-slate-500",
    badge: "bg-slate-100 text-slate-700 border-slate-300"
  },
  "Takrorlanmas ish(Muhim)": {
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-800",
    bar: "bg-purple-600",
    badge: "bg-purple-100 text-purple-800 border-purple-300"
  },
  "Takrorlanmas ish(O'rtacha)": {
    bg: "bg-cyan-50",
    border: "border-cyan-200",
    text: "text-cyan-800",
    bar: "bg-cyan-600",
    badge: "bg-cyan-100 text-cyan-800 border-cyan-300"
  },
  "Takrorlanmas ish(Past)": {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-800",
    bar: "bg-emerald-600",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-300"
  }
};

const DEFAULT_COLOR = {
  bg: "bg-slate-50",
  border: "border-slate-200",
  text: "text-slate-800",
  bar: "bg-indigo-600",
  badge: "bg-slate-100 text-slate-700 border-slate-300"
};

export const DailyAnalyticsModal: React.FC<DailyAnalyticsModalProps> = ({
  isOpen,
  onClose,
  tasks,
  onOpenMonthly
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const todayStr = getTodayString();

  // Shift day helper
  const shiftDay = (offset: number) => {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() + offset);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  // Filter tasks that belong to the selected day:
  // 1. Due date is selected day OR
  // 2. Completed on selected day OR
  // 3. For range tasks: selected day falls between startDate and dueDate
  const dayTasks = tasks.filter((t) => {
    const isDueToday = t.dueDate === selectedDate;
    const isCompletedToday = t.isCompleted && t.completedAt?.startsWith(selectedDate);
    const isWithinRange =
      t.startDate &&
      t.dueDate &&
      t.startDate <= selectedDate &&
      t.dueDate >= selectedDate;

    return isDueToday || isCompletedToday || isWithinRange;
  });

  const totalDayTasks = dayTasks.length;
  const completedDayTasks = dayTasks.filter((t) => {
    if (t.isCompleted) {
      if (t.completedAt) return t.completedAt.startsWith(selectedDate);
      return t.dueDate === selectedDate;
    }
    return false;
  }).length;

  const pendingDayTasks = totalDayTasks - completedDayTasks;
  const dayCompletionRate = totalDayTasks > 0 ? Math.round((completedDayTasks / totalDayTasks) * 100) : 0;

  // Group by Category (Priority)
  const categoryMap: Record<
    string,
    {
      category: string;
      total: number;
      completed: number;
      pending: number;
      rate: number;
      tasks: Task[];
    }
  > = {};

  // Initialize known priorities to show even with 0 if requested, or group existing
  const allPriorities: TaskPriority[] = [
    "Soliq(Muhim)",
    "Ichki hisobot(Muhim)",
    "Ichki hisobot(O'rtacha)",
    "Ichki hisobot(Past)",
    "Takrorlanmas ish(Muhim)",
    "Takrorlanmas ish(O'rtacha)",
    "Takrorlanmas ish(Past)"
  ];

  allPriorities.forEach((p) => {
    categoryMap[p] = {
      category: p,
      total: 0,
      completed: 0,
      pending: 0,
      rate: 0,
      tasks: []
    };
  });

  dayTasks.forEach((task) => {
    const cat = task.priority || "Boshqa";
    if (!categoryMap[cat]) {
      categoryMap[cat] = {
        category: cat,
        total: 0,
        completed: 0,
        pending: 0,
        rate: 0,
        tasks: []
      };
    }

    categoryMap[cat].total += 1;
    categoryMap[cat].tasks.push(task);

    const isTaskCompletedOnDate =
      task.isCompleted &&
      (task.completedAt?.startsWith(selectedDate) || task.dueDate === selectedDate);

    if (isTaskCompletedOnDate) {
      categoryMap[cat].completed += 1;
    } else {
      categoryMap[cat].pending += 1;
    }
  });

  // Calculate rate for each category
  Object.values(categoryMap).forEach((item) => {
    item.rate = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;
  });

  // Filter out categories with 0 tasks, or sort with active tasks first
  const activeCategories = Object.values(categoryMap).sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return b.rate - a.rate;
  });

  const categoriesWithTasks = activeCategories.filter((c) => c.total > 0);
  const categoriesEmpty = activeCategories.filter((c) => c.total === 0);

  const toggleCategoryExpand = (cat: string) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Group by schedule type for additional insight
  const scheduleTypeCounts = {
    daily: dayTasks.filter((t) => t.scheduleType === "daily"),
    every_3_days: dayTasks.filter((t) => t.scheduleType === "every_3_days"),
    weekly: dayTasks.filter((t) => t.scheduleType === "weekly"),
    monthly: dayTasks.filter((t) => t.scheduleType === "monthly"),
    once: dayTasks.filter((t) => t.scheduleType === "once")
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner">
              <BarChart3 className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  Kunlik Analitika
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white border border-white/25">
                  Kategoriyalar va Foizlar
                </span>
              </div>
              <p className="text-xs text-blue-100/90 mt-0.5">
                Tanlangan kun bo'yicha vazifalar kategoriyasi, soni va bajarilish foizlari
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onOpenMonthly && (
              <button
                type="button"
                id="btn-switch-to-monthly"
                onClick={() => {
                  onClose();
                  onOpenMonthly();
                }}
                className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold border border-white/20 transition-all cursor-pointer"
              >
                <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                Oylik Analitikaga o'tish
              </button>
            )}
            <button
              type="button"
              id="btn-close-daily-analytics"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {/* Date Selector Navigation Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-start">
              <button
                type="button"
                onClick={() => shiftDay(-1)}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                title="Oldingi kun"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  id="daily-analytics-date-picker"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 font-bold text-slate-800 text-xs sm:text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                />
                <span className="text-xs font-bold text-blue-700 hidden md:inline">
                  {formatDateUz(selectedDate)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => shiftDay(1)}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                title="Keyingi kun"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Date Presets */}
            <div className="flex items-center space-x-1.5 w-full sm:w-auto justify-center">
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedDate === todayStr
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Bugun
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() - 1);
                  setSelectedDate(d.toISOString().split("T")[0]);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all cursor-pointer"
              >
                Kecha
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 1);
                  setSelectedDate(d.toISOString().split("T")[0]);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all cursor-pointer"
              >
                Ertaga
              </button>
            </div>
          </div>

          {/* Day Total Performance Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1: Jami vazifalar */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider">Kunlik Jami</span>
                <Layers className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {totalDayTasks} ta
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Shu kunga belgilangan
              </div>
            </div>

            {/* Card 2: Bajarilgan */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider">Bajarilgan</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
                {completedDayTasks} ta
              </div>
              <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
                Muvaffaqiyatli yakunlandi
              </div>
            </div>

            {/* Card 3: Kutilayotgan / Bajarilmagan */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider">Kutilayotgan</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-600">
                {pendingDayTasks} ta
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Ijro etilishi kerak
              </div>
            </div>

            {/* Card 4: Kunlik Umumiy Foiz */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-4 sm:p-5 rounded-2xl shadow-md shadow-blue-500/20">
              <div className="flex items-center justify-between text-blue-100 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider">Bajarilish Foizi</span>
                <Percent className="w-4 h-4 text-white" />
              </div>
              <div className="text-2xl sm:text-3xl font-black tracking-tight">
                {dayCompletionRate}%
              </div>
              <div className="w-full bg-white/20 h-2 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-white h-full rounded-full transition-all duration-500"
                  style={{ width: `${dayCompletionRate}%` }}
                />
              </div>
            </div>
          </div>

          {/* Section: Kategoriyalar va Muhimlik Bo'yicha Bajarilish Foizlari */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center">
                  <Sparkles className="w-4 h-4 mr-2 text-blue-600" />
                  Kategoriyalar Bo'yicha Vazifalar Soni va Foizlari
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Har bir kategoriya bo'yicha kunlik reja, bajarilgan soni va foiz ko'rsatkichlari
                </p>
              </div>

              <div className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
                Jami {categoriesWithTasks.length} ta faol kategoriya
              </div>
            </div>

            {/* List of categories with visual percentage bars */}
            {categoriesWithTasks.length > 0 ? (
              <div className="space-y-3">
                {categoriesWithTasks.map((item) => {
                  const colors = CATEGORY_COLORS[item.category] || DEFAULT_COLOR;
                  const isExpanded = !!expandedCategories[item.category];

                  return (
                    <div
                      key={item.category}
                      className={`rounded-2xl border transition-all ${colors.bg} ${colors.border}`}
                    >
                      {/* Category summary header row */}
                      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${colors.badge}`}>
                              {item.category}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              (Jami: <strong>{item.total} ta</strong>)
                            </span>
                          </div>

                          {/* Progress bar and details */}
                          <div className="pt-2 pr-4">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-semibold text-slate-700">
                                Bajarildi: <strong className="text-emerald-700">{item.completed} ta</strong> / Kutilmoqda: <strong>{item.pending} ta</strong>
                              </span>
                              <span className="font-extrabold text-slate-900 text-sm">
                                {item.rate}%
                              </span>
                            </div>

                            <div className="w-full bg-slate-200/80 h-2.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  item.rate === 100
                                    ? "bg-emerald-500"
                                    : item.rate >= 50
                                    ? "bg-blue-600"
                                    : item.rate > 0
                                    ? "bg-amber-500"
                                    : "bg-slate-400"
                                }`}
                                style={{ width: `${item.rate}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Status Badge & Toggle tasks button */}
                        <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
                          <span
                            className={`px-3 py-1 rounded-xl text-xs font-bold ${
                              item.rate === 100
                                ? "bg-emerald-600 text-white shadow-xs"
                                : item.rate > 0
                                ? "bg-blue-600 text-white shadow-xs"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {item.rate === 100
                              ? "100% Bajarildi"
                              : `${item.rate}% Bajarildi`}
                          </span>

                          <button
                            type="button"
                            onClick={() => toggleCategoryExpand(item.category)}
                            className="p-1.5 rounded-lg bg-white/80 hover:bg-white text-slate-600 border border-slate-200 transition-colors cursor-pointer"
                            title="Vazifalarni ko'rish"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Expandable tasks list inside category */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-slate-200/60 space-y-2 bg-white/60 rounded-b-2xl">
                          <div className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                            Ushbu kategoriyadagi vazifalar:
                          </div>
                          <div className="space-y-1.5">
                            {item.tasks.map((t) => (
                              <div
                                key={t.id}
                                className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center space-x-2">
                                  {t.isCompleted ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                  ) : (
                                    <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                                  )}
                                  <span className={`font-semibold ${t.isCompleted ? "line-through text-slate-400" : "text-slate-800"}`}>
                                    {t.title}
                                  </span>
                                </div>

                                <div className="flex items-center space-x-2">
                                  <span className="text-[10px] text-slate-400">
                                    {t.scheduleType === "daily" && "Har kunlik"}
                                    {t.scheduleType === "every_3_days" && "Har 3 kunda"}
                                    {t.scheduleType === "weekly" && "Har haftalik"}
                                    {t.scheduleType === "monthly" && "Oylik"}
                                    {t.scheduleType === "once" && "1 martalik"}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      t.isCompleted
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : "bg-amber-50 text-amber-700 border border-amber-200"
                                    }`}
                                  >
                                    {t.isCompleted ? "Bajarildi" : "Kutilmoqda"}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <div className="font-bold text-slate-700 text-sm">
                  Ushbu sanada ({formatDateUz(selectedDate)}) hech qanday vazifa rejalashtirilmagan
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Boshqa sanani tanlang yoki yangi vazifa qo'shing.
                </p>
              </div>
            )}
          </div>

          {/* Mini Section: Davriylik / Reja Turlari Bo'yicha Tahlil */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center">
              <Repeat className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
              Takrorlanish Turlari Bo'yicha Bajarilish
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { label: "Har kunlik", list: scheduleTypeCounts.daily, icon: CalendarDays },
                { label: "Har 3 kunda", list: scheduleTypeCounts.every_3_days, icon: Repeat },
                { label: "Har haftalik", list: scheduleTypeCounts.weekly, icon: Calendar },
                { label: "Oylik", list: scheduleTypeCounts.monthly, icon: Repeat },
                { label: "Bir martalik", list: scheduleTypeCounts.once, icon: Clock }
              ].map((sch) => {
                const total = sch.list.length;
                const done = sch.list.filter((t) => t.isCompleted).length;
                const rate = total > 0 ? Math.round((done / total) * 100) : 0;
                const Icon = sch.icon;

                return (
                  <div key={sch.label} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between text-slate-600 mb-1">
                      <span className="text-[11px] font-bold">{sch.label}</span>
                      <Icon className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div className="text-lg font-black text-slate-800">
                      {done}/{total} ta
                    </div>
                    <div className="text-[10px] text-blue-600 font-bold mt-0.5">
                      {rate}% bajarildi
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Sana: <strong>{formatDateUz(selectedDate)}</strong> | Jami: <strong>{totalDayTasks} ta</strong> vazifa
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
};
