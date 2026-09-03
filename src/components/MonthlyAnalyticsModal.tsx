import React, { useState } from "react";
import { Task, TaskPriority } from "../types";
import { formatDateUz, getTodayString } from "../services/storage";
import {
  X,
  Calendar,
  CheckCircle2,
  Clock,
  BarChart3,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  Repeat,
  Percent,
  CalendarRange
} from "lucide-react";

interface MonthlyAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onOpenDaily?: () => void;
}

const MONTH_NAMES = [
  "Yanvar",
  "Fevral",
  "Mart",
  "Aprel",
  "May",
  "Iyun",
  "Iyul",
  "Avgust",
  "Sentyabr",
  "Oktyabr",
  "Noyabr",
  "Dekabr"
];

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

export const MonthlyAnalyticsModal: React.FC<MonthlyAnalyticsModalProps> = ({
  isOpen,
  onClose,
  tasks,
  onOpenDaily
}) => {
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth()); // 0-indexed
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const currentYearMonth = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
  const monthName = MONTH_NAMES[selectedMonth];

  const shiftMonth = (offset: number) => {
    let newMonth = selectedMonth + offset;
    let newYear = selectedYear;
    if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    } else if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    }
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  const handleResetToCurrent = () => {
    const now = new Date();
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth());
  };

  // Filter tasks belonging to selected month:
  // 1. Due date starts with YYYY-MM OR
  // 2. Completed in this month (completedAt starts with YYYY-MM) OR
  // 3. For range tasks, overlap with this month
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const monthStartStr = `${currentYearMonth}-01`;
  const monthEndStr = `${currentYearMonth}-${String(daysInMonth).padStart(2, "0")}`;

  const monthTasks = tasks.filter((t) => {
    const isDueInMonth = t.dueDate && t.dueDate.startsWith(currentYearMonth);
    const isCompletedInMonth = t.isCompleted && t.completedAt && t.completedAt.startsWith(currentYearMonth);
    const isOverlappingRange =
      t.startDate &&
      t.dueDate &&
      t.startDate <= monthEndStr &&
      t.dueDate >= monthStartStr;

    return isDueInMonth || isCompletedInMonth || isOverlappingRange;
  });

  const totalMonthTasks = monthTasks.length;
  const completedMonthTasks = monthTasks.filter((t) => t.isCompleted).length;
  const pendingMonthTasks = totalMonthTasks - completedMonthTasks;
  const monthCompletionRate = totalMonthTasks > 0 ? Math.round((completedMonthTasks / totalMonthTasks) * 100) : 0;

  // Group by Category / Priority
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

  monthTasks.forEach((task) => {
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

    if (task.isCompleted) {
      categoryMap[cat].completed += 1;
    } else {
      categoryMap[cat].pending += 1;
    }
  });

  Object.values(categoryMap).forEach((item) => {
    item.rate = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;
  });

  const activeCategories = Object.values(categoryMap).sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return b.rate - a.rate;
  });

  const categoriesWithTasks = activeCategories.filter((c) => c.total > 0);

  const toggleCategoryExpand = (cat: string) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Days breakdown inside the month
  const dailyDistribution: { day: number; total: number; completed: number }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dayDateStr = `${currentYearMonth}-${String(d).padStart(2, "0")}`;
    const tasksOnDay = monthTasks.filter(
      (t) =>
        t.dueDate === dayDateStr ||
        (t.completedAt && t.completedAt.startsWith(dayDateStr))
    );
    const doneOnDay = tasksOnDay.filter((t) => t.isCompleted).length;
    dailyDistribution.push({
      day: d,
      total: tasksOnDay.length,
      completed: doneOnDay
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner">
              <TrendingUp className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  Oylik Analitika
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white border border-white/25">
                  Kategoriyalar va Foizlar
                </span>
              </div>
              <p className="text-xs text-indigo-100/90 mt-0.5">
                Oylik vazifalar kategoriyasi, soni va bajarilish foizlari monitoringi
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onOpenDaily && (
              <button
                type="button"
                id="btn-switch-to-daily"
                onClick={() => {
                  onClose();
                  onOpenDaily();
                }}
                className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold border border-white/20 transition-all cursor-pointer"
              >
                <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
                Kunlik Analitikaga o'tish
              </button>
            )}
            <button
              type="button"
              id="btn-close-monthly-analytics"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {/* Month / Year Selector Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-start">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                title="Oldingi oy"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center space-x-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 font-bold text-slate-800 text-xs sm:text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={name} value={idx}>
                      {name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 font-bold text-slate-800 text-xs sm:text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                >
                  {[2024, 2025, 2026, 2027, 2028].map((y) => (
                    <option key={y} value={y}>
                      {y}-yil
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                title="Keyingi oy"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleResetToCurrent}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-all cursor-pointer"
              >
                Joriy Oy
              </button>
              <span className="text-xs font-semibold text-slate-500">
                {monthName} {selectedYear}-yil davri
              </span>
            </div>
          </div>

          {/* Monthly KPI Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1: Oylik Jami */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider">Oylik Jami</span>
                <Layers className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {totalMonthTasks} ta
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Shu oyga rejalashtirilgan
              </div>
            </div>

            {/* Card 2: Bajarilgan */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider">Topshirilgan</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
                {completedMonthTasks} ta
              </div>
              <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
                Oylik yakunlangan ishlar
              </div>
            </div>

            {/* Card 3: Qolgan / Kutilmoqda */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider">Kutilmoqda</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-600">
                {pendingMonthTasks} ta
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Bajarilishi kutilmoqda
              </div>
            </div>

            {/* Card 4: Oylik Umumiy Ko'rsatkich */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-4 sm:p-5 rounded-2xl shadow-md shadow-indigo-500/20">
              <div className="flex items-center justify-between text-indigo-100 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider">Oylik Bajarilish</span>
                <Percent className="w-4 h-4 text-white" />
              </div>
              <div className="text-2xl sm:text-3xl font-black tracking-tight">
                {monthCompletionRate}%
              </div>
              <div className="w-full bg-white/20 h-2 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-white h-full rounded-full transition-all duration-500"
                  style={{ width: `${monthCompletionRate}%` }}
                />
              </div>
            </div>
          </div>

          {/* Section: Kategoriyalar Bo'yicha Oylik Tahlil va Foizlar */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center">
                  <Sparkles className="w-4 h-4 mr-2 text-indigo-600" />
                  Kategoriyalar Bo'yicha Oylik Reja va Foizlar
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {monthName} oyidagi har bir kategoriya bo'yicha jami vazifalar soni va bajarilgan foizlari
                </p>
              </div>

              <div className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                {categoriesWithTasks.length} ta faol kategoriya
              </div>
            </div>

            {/* List of Categories */}
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
                      {/* Category summary header */}
                      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${colors.badge}`}>
                              {item.category}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              (Oy bo'yicha jami: <strong>{item.total} ta</strong>)
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="pt-2 pr-4">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-semibold text-slate-700">
                                Bajarildi: <strong className="text-emerald-700">{item.completed} ta</strong> / Qoldi: <strong>{item.pending} ta</strong>
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
                                    ? "bg-indigo-600"
                                    : item.rate > 0
                                    ? "bg-amber-500"
                                    : "bg-slate-400"
                                }`}
                                style={{ width: `${item.rate}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Status Badge & Expand tasks button */}
                        <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
                          <span
                            className={`px-3 py-1 rounded-xl text-xs font-bold ${
                              item.rate === 100
                                ? "bg-emerald-600 text-white shadow-xs"
                                : item.rate > 0
                                ? "bg-indigo-600 text-white shadow-xs"
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

                      {/* Expandable tasks list */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-slate-200/60 space-y-2 bg-white/60 rounded-b-2xl">
                          <div className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                            Ushbu oydagi vazifalar:
                          </div>
                          <div className="space-y-1.5 max-h-60 overflow-y-auto">
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
                                  <span className="text-[10px] font-medium text-slate-500">
                                    Muddat: {formatDateUz(t.dueDate)}
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
                  {monthName} {selectedYear}-yilda hech qanday vazifa topilmadi
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Boshqa oyni tanlang yoki ushbu oyga yangi vazifalar kiriting.
                </p>
              </div>
            )}
          </div>

          {/* Section: Oy Kunlari Bo'yicha Taqsimot (Daily Heat/Bar Chart) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
                <CalendarRange className="w-4 h-4 mr-1.5 text-indigo-600" />
                {monthName} Oyining Kunlari Bo'yicha Vazifalar Taqsimoti
              </h4>
              <span className="text-[11px] text-slate-400">
                (Kun: 1 dan {daysInMonth} gacha)
              </span>
            </div>

            <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-16 gap-1 pt-2">
              {dailyDistribution.map((item) => {
                const hasTasks = item.total > 0;
                const allDone = hasTasks && item.completed === item.total;
                const someDone = hasTasks && item.completed > 0 && !allDone;

                return (
                  <div
                    key={item.day}
                    className={`p-2 rounded-xl text-center border transition-all ${
                      allDone
                        ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold"
                        : someDone
                        ? "bg-amber-50 border-amber-300 text-amber-900 font-bold"
                        : hasTasks
                        ? "bg-blue-50 border-blue-200 text-blue-900 font-bold"
                        : "bg-slate-50/70 border-slate-100 text-slate-400"
                    }`}
                    title={`${item.day}-${monthName}: Jami ${item.total} ta, Bajarildi ${item.completed} ta`}
                  >
                    <div className="text-[10px] text-slate-500">{item.day}</div>
                    <div className="text-xs font-extrabold mt-0.5">
                      {item.total > 0 ? `${item.completed}/${item.total}` : "-"}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-end space-x-4 pt-1 text-[11px] text-slate-500">
              <span className="flex items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1" /> To'liq bajarilgan
              </span>
              <span className="flex items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-1" /> Qisman bajarilgan
              </span>
              <span className="flex items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 mr-1" /> Kutilayotgan
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Davr: <strong>{monthName} {selectedYear}-yil</strong> | Oylik Jami: <strong>{totalMonthTasks} ta</strong>
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
