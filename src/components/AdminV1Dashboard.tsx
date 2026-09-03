import React, { useState, useMemo } from "react";
import { Task } from "../types";
import { formatDateUz, getTodayString } from "../services/storage";
import {
  DAILY_WORK_HOURS,
  DAILY_WORK_MINUTES,
  calculateDayWorkload,
  getTaskEstimatedMinutes,
  getTopTimeConsumingTasks,
  getTopTimeConsumingSteps,
  formatMinutesUz,
} from "../services/workload";
import {
  Calendar,
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  ArrowUpRight,
  Filter,
  CheckCheck,
  Percent,
  ListTodo,
  CalendarRange,
  Zap,
  Info,
  RotateCcw,
} from "lucide-react";

interface AdminV1DashboardProps {
  tasks: Task[];
  onOpenTaskDetails?: (task: Task) => void;
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
  "Dekabr",
];

export const AdminV1Dashboard: React.FC<AdminV1DashboardProps> = ({ tasks }) => {
  // -------------------------------------------------------------
  // 1. KUNLIK ANALITIKA HOLATI
  // -------------------------------------------------------------
  const [selectedDay, setSelectedDay] = useState<string>(() => getTodayString());

  const handlePrevDay = () => {
    const d = new Date(selectedDay);
    d.setDate(d.getDate() - 1);
    setSelectedDay(d.toISOString().split("T")[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDay);
    d.setDate(d.getDate() + 1);
    setSelectedDay(d.toISOString().split("T")[0]);
  };

  const handleToday = () => {
    setSelectedDay(getTodayString());
  };

  // Kunlik hisob-kitoblar
  const dayStats = useMemo(() => {
    return calculateDayWorkload(selectedDay, tasks);
  }, [selectedDay, tasks]);

  const dayTasks = useMemo(() => {
    return tasks.filter((t) => t.dueDate === selectedDay);
  }, [selectedDay, tasks]);

  const dayTopTasks = useMemo(() => {
    return getTopTimeConsumingTasks(dayTasks, 6);
  }, [dayTasks]);

  const dayTopSteps = useMemo(() => {
    return getTopTimeConsumingSteps(dayTasks, 8);
  }, [dayTasks]);

  // -------------------------------------------------------------
  // 2. OYLIK ANALITIKA HOLATI
  // -------------------------------------------------------------
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    return new Date().getFullYear();
  });
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    return new Date().getMonth(); // 0 - 11
  });

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth());
  };

  // Oydagi vazifalar
  const monthTasks = useMemo(() => {
    const monthPrefix = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
    return tasks.filter((t) => t.dueDate.startsWith(monthPrefix));
  }, [selectedYear, selectedMonth, tasks]);

  // Oydagi umumiy statistika
  const monthStats = useMemo(() => {
    // Oydagi ish kunlari soni (taxminan 22 kun)
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    let workingDays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const dayOfWeek = new Date(selectedYear, selectedMonth, day).getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
    }
    if (workingDays === 0) workingDays = 22;

    const monthlyNormMinutes = workingDays * DAILY_WORK_MINUTES; // masalan 22 * 480 = 10,560 daqiqa (176 soat)

    let totalMinutes = 0;
    let completedMinutes = 0;
    let totalSteps = 0;
    let completedSteps = 0;

    monthTasks.forEach((t) => {
      const mins = getTaskEstimatedMinutes(t);
      totalMinutes += mins;
      if (t.isCompleted) completedMinutes += mins;

      if (t.steps && t.steps.length > 0) {
        totalSteps += t.steps.length;
        completedSteps += t.steps.filter((s) => s.completed).length;
      }
    });

    const workloadPercent = monthlyNormMinutes > 0 ? Math.round((totalMinutes / monthlyNormMinutes) * 100) : 0;
    const completedTasksCount = monthTasks.filter((t) => t.isCompleted).length;
    const pendingTasksCount = monthTasks.filter((t) => !t.isCompleted).length;
    const stepsPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    return {
      workingDays,
      monthlyNormMinutes,
      totalMinutes,
      completedMinutes,
      totalTasks: monthTasks.length,
      completedTasksCount,
      pendingTasksCount,
      workloadPercent,
      totalSteps,
      completedSteps,
      stepsPercent,
    };
  }, [monthTasks, selectedYear, selectedMonth]);

  const monthTopTasks = useMemo(() => {
    return getTopTimeConsumingTasks(monthTasks, 8);
  }, [monthTasks]);

  const monthTopSteps = useMemo(() => {
    return getTopTimeConsumingSteps(monthTasks, 10);
  }, [monthTasks]);

  // -------------------------------------------------------------
  // 3. MA'LUM VAQT ORALIG'I (CUSTOM DATE RANGE) HOLATI
  // By default hech narsa bo'lmaydi va faqat tanlangan bo'lsagina ko'rinadi
  // -------------------------------------------------------------
  const [rangeStartDate, setRangeStartDate] = useState<string>("");
  const [rangeEndDate, setRangeEndDate] = useState<string>("");

  const isRangeSelected = Boolean(rangeStartDate && rangeEndDate && rangeStartDate <= rangeEndDate);

  const rangeTasks = useMemo(() => {
    if (!isRangeSelected) return [];
    return tasks.filter((t) => t.dueDate >= rangeStartDate && t.dueDate <= rangeEndDate);
  }, [isRangeSelected, rangeStartDate, rangeEndDate, tasks]);

  const rangeStats = useMemo(() => {
    if (!isRangeSelected) return null;

    const startD = new Date(rangeStartDate);
    const endD = new Date(rangeEndDate);
    const diffDays = Math.max(1, Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    const periodNormMinutes = diffDays * DAILY_WORK_MINUTES;

    let totalMinutes = 0;
    let completedMinutes = 0;
    let totalSteps = 0;
    let completedSteps = 0;

    rangeTasks.forEach((t) => {
      const mins = getTaskEstimatedMinutes(t);
      totalMinutes += mins;
      if (t.isCompleted) completedMinutes += mins;

      if (t.steps && t.steps.length > 0) {
        totalSteps += t.steps.length;
        completedSteps += t.steps.filter((s) => s.completed).length;
      }
    });

    const workloadPercent = periodNormMinutes > 0 ? Math.round((totalMinutes / periodNormMinutes) * 100) : 0;
    const completedTasksCount = rangeTasks.filter((t) => t.isCompleted).length;
    const pendingTasksCount = rangeTasks.filter((t) => !t.isCompleted).length;
    const stepsPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    return {
      diffDays,
      periodNormMinutes,
      totalMinutes,
      completedMinutes,
      totalTasks: rangeTasks.length,
      completedTasksCount,
      pendingTasksCount,
      workloadPercent,
      totalSteps,
      completedSteps,
      stepsPercent,
    };
  }, [isRangeSelected, rangeStartDate, rangeEndDate, rangeTasks]);

  const rangeTopTasks = useMemo(() => {
    if (!isRangeSelected) return [];
    return getTopTimeConsumingTasks(rangeTasks, 8);
  }, [isRangeSelected, rangeTasks]);

  const rangeTopSteps = useMemo(() => {
    if (!isRangeSelected) return [];
    return getTopTimeConsumingSteps(rangeTasks, 10);
  }, [isRangeSelected, rangeTasks]);

  const handleResetRange = () => {
    setRangeStartDate("");
    setRangeEndDate("");
  };

  const handleSetQuickRange = (days: number) => {
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - (days - 1));
    setRangeStartDate(start.toISOString().split("T")[0]);
    setRangeEndDate(today.toISOString().split("T")[0]);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Top Welcome Title */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold mb-3 border border-blue-400/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Admin Boshqaruv & Chuqur Analitika Markazi (v1)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Operator Ish Yuklamasi va Amallar Tahlili
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl leading-relaxed">
              8 soatlik ish me'yori asosida kunlik, oylik va erkin vaqt oraliqlarida operatorning
              bajarayotgan vazifalari hamda har bir amallariga ketayotgan vaqt sarfi.
            </p>
          </div>
          <div className="flex items-center space-x-3 self-start md:self-center shrink-0">
            <div className="px-4 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center">
              <div className="text-xs text-slate-300 font-medium">Standart me'yor</div>
              <div className="text-lg font-bold text-white">8 soat / kun</div>
            </div>
            <div className="px-4 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center">
              <div className="text-xs text-slate-300 font-medium">Jami barcha vazifalar</div>
              <div className="text-lg font-bold text-blue-300">{tasks.length} ta</div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* 1. KUNLIK ANALITIKA BLOKI */}
      {/* ============================================================= */}
      <section className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Section Header with Day Switcher */}
        <div className="p-5 sm:p-6 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  1-Bo'lim
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-semibold text-slate-500">Kunlik Ish Yuklamasi</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                {formatDateUz(selectedDay)}
              </h2>
            </div>
          </div>

          {/* Day Navigation Controls */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePrevDay}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors cursor-pointer shadow-2xs"
              title="Oldingi kun"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer shadow-2xs"
            >
              Bugun
            </button>
            <button
              type="button"
              onClick={handleNextDay}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors cursor-pointer shadow-2xs"
              title="Keyingi kun"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {/* Direct date picker */}
            <div className="relative">
              <input
                type="date"
                value={selectedDay}
                onChange={(e) => e.target.value && setSelectedDay(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 shadow-2xs cursor-pointer focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Section Body */}
        <div className="p-5 sm:p-6 space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Ish Yuklamasi */}
            <div
              className={`p-4 rounded-2xl border transition-all ${
                dayStats.isOverloaded
                  ? "bg-rose-50/70 border-rose-200"
                  : dayStats.workloadPercent >= 80
                  ? "bg-amber-50/70 border-amber-200"
                  : "bg-blue-50/70 border-blue-200"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1">
                <span>Kunlik Yuklama</span>
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-extrabold text-slate-900">
                  {dayStats.workloadPercent}%
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  / 8 soat (480m)
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden mt-3">
                <div
                  className={`h-full rounded-full transition-all ${
                    dayStats.isOverloaded
                      ? "bg-rose-600"
                      : dayStats.workloadPercent >= 80
                      ? "bg-amber-500"
                      : "bg-blue-600"
                  }`}
                  style={{ width: `${Math.min(100, dayStats.workloadPercent)}%` }}
                />
              </div>
              <div className="mt-2 text-[11px] font-semibold">
                {dayStats.isOverloaded ? (
                  <span className="text-rose-700 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Ortiqcha yuklama: +{formatMinutesUz(dayStats.overloadedMinutes)}
                  </span>
                ) : (
                  <span className="text-emerald-700">
                    Erkin vaqt zaxirasi: {formatMinutesUz(dayStats.remainingMinutes)}
                  </span>
                )}
              </div>
            </div>

            {/* 2. Rejalashtirilgan Jami Vaqt */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-700 mb-1">
                <span>Jami Ish Vaqti</span>
                <Zap className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900">
                {formatMinutesUz(dayStats.totalMinutes)}
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-600">
                <span>Bajarildi: <strong className="text-emerald-700">{formatMinutesUz(dayStats.completedMinutes)}</strong></span>
                <span>Qoldi: <strong className="text-slate-700">{formatMinutesUz(dayStats.pendingMinutes)}</strong></span>
              </div>
            </div>

            {/* 3. Vazifalar Soni */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1">
                <span>Vazifalar Ko'rsatkichi</span>
                <ListTodo className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-extrabold text-slate-900">
                  {dayStats.totalTasks}
                </span>
                <span className="text-xs font-semibold text-slate-500">ta vazifa</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px]">
                <span className="text-emerald-700 font-semibold">
                  ✓ {dayStats.completedTasks} bajarildi
                </span>
                <span className="text-slate-500 font-semibold">
                  ⏳ {dayStats.pendingTasks} kutilmoqda
                </span>
              </div>
            </div>

            {/* 4. Amallar (Bosqichlar) */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-800 mb-1">
                <span>Amallar (Bosqichlar)</span>
                <Layers className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-extrabold text-slate-900">
                  {dayStats.totalSteps}
                </span>
                <span className="text-xs font-semibold text-emerald-700">
                  ta amal ({dayStats.stepsPercent}%)
                </span>
              </div>
              {/* Steps Progress */}
              <div className="w-full bg-emerald-200/80 h-2 rounded-full overflow-hidden mt-3">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all"
                  style={{ width: `${dayStats.stepsPercent}%` }}
                />
              </div>
              <div className="mt-2 text-[11px] font-semibold text-emerald-800">
                {dayStats.completedSteps} / {dayStats.totalSteps} amal bajarildi
              </div>
            </div>
          </div>

          {/* Deep Time Consumption Analysis Grid (Tasks vs Steps) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            {/* Left: Top Time-Consuming Tasks */}
            <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-slate-900 text-sm">
                    Eng Ko'p Vaqt Talab Qilayotgan Vazifalar
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                  Vaqt ulushi
                </span>
              </div>

              {dayTopTasks.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Ushbu kunga rejalashtirilgan vazifalar mavjud emas
                </div>
              ) : (
                <div className="space-y-3">
                  {dayTopTasks.map(({ task, totalMinutes, percentageOfTotal, stepsCount, completedStepsCount }, idx) => (
                    <div
                      key={task.id}
                      className="p-3 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 transition-colors border border-slate-100"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start space-x-2 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <h4
                              className={`text-xs font-bold truncate ${
                                task.isCompleted ? "line-through text-slate-400" : "text-slate-800"
                              }`}
                            >
                              {task.title}
                            </h4>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                              {task.dueTime && <span>⏰ {task.dueTime}</span>}
                              {task.category && <span>• {task.category}</span>}
                              {stepsCount > 0 && (
                                <span className="text-indigo-600 font-semibold">
                                  • {completedStepsCount}/{stepsCount} amal
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold text-slate-900">
                            {formatMinutesUz(totalMinutes)}
                          </div>
                          <div className="text-[10px] font-semibold text-blue-600">
                            {percentageOfTotal}% kunlik ulush
                          </div>
                        </div>
                      </div>

                      {/* Mini bar for proportion */}
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${Math.min(100, percentageOfTotal)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Top Time-Consuming Steps / Actions */}
            <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 text-sm">
                    Eng Ko'p Vaqt Ketayotgan Amallar (Bosqichlar)
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                  Vazifa ichidagi amallar
                </span>
              </div>

              {dayTopSteps.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Ushbu kundagi vazifalarga batafsil amallar (bosqichlar) kiritilmagan
                </div>
              ) : (
                <div className="space-y-2.5">
                  {dayTopSteps.map((step, idx) => (
                    <div
                      key={`${step.taskId}-${step.stepId}-${idx}`}
                      className={`p-2.5 rounded-xl border transition-colors flex items-center justify-between gap-3 ${
                        step.completed
                          ? "bg-emerald-50/60 border-emerald-200 text-slate-600"
                          : "bg-slate-50 border-slate-100 hover:bg-slate-100/70"
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                            step.completed
                              ? "bg-emerald-600 text-white"
                              : "border border-slate-300 bg-white"
                          }`}
                        >
                          {step.completed && <CheckCheck className="w-2.5 h-2.5" />}
                        </div>
                        <div className="min-w-0">
                          <p
                            className={`text-xs font-bold truncate ${
                              step.completed ? "line-through text-slate-400" : "text-slate-800"
                            }`}
                          >
                            {step.stepText}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            Vazifa: <strong className="text-slate-600">{step.taskTitle}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                          ⏱ {step.estimatedMinutes} daq
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================= */}
      {/* 2. OYLIK ANALITIKA BLOKI */}
      {/* ============================================================= */}
      <section className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Section Header with Month Switcher */}
        <div className="p-5 sm:p-6 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  2-Bo'lim
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-semibold text-slate-500">Oylik Umumiy Tahlil</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                {MONTH_NAMES[selectedMonth]} {selectedYear}
              </h2>
            </div>
          </div>

          {/* Month Navigation Controls */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors cursor-pointer shadow-2xs"
              title="Oldingi oy"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleCurrentMonth}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer shadow-2xs"
            >
              Joriy oy
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors cursor-pointer shadow-2xs"
              title="Keyingi oy"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Select Month and Year */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 shadow-2xs cursor-pointer focus:ring-2 focus:ring-indigo-500 outline-hidden"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 shadow-2xs cursor-pointer focus:ring-2 focus:ring-indigo-500 outline-hidden"
            >
              {[2024, 2025, 2026, 2027, 2028].map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Section Body */}
        <div className="p-5 sm:p-6 space-y-6">
          {/* Month Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Oylik Ish Me'yori va Yuklama */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-800 mb-1">
                <span>Oylik Yuklama</span>
                <Clock className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-extrabold text-slate-900">
                  {monthStats.workloadPercent}%
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  ({monthStats.workingDays} ish kuni)
                </span>
              </div>
              <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden mt-3">
                <div
                  className="h-full bg-indigo-600 rounded-full"
                  style={{ width: `${Math.min(100, monthStats.workloadPercent)}%` }}
                />
              </div>
              <div className="mt-2 text-[11px] text-slate-600 font-semibold">
                Me'yor: ~{Math.round(monthStats.monthlyNormMinutes / 60)} soat
              </div>
            </div>

            {/* 2. Oylik Sarflangan Vaqt */}
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200">
              <div className="flex items-center justify-between text-xs font-bold text-blue-800 mb-1">
                <span>Oylik Rejadagi Vaqt</span>
                <Zap className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900">
                {formatMinutesUz(monthStats.totalMinutes)}
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-600">
                <span>Bajarildi: <strong className="text-emerald-700">{formatMinutesUz(monthStats.completedMinutes)}</strong></span>
                <span>Qoldi: <strong className="text-slate-700">{formatMinutesUz(Math.max(0, monthStats.totalMinutes - monthStats.completedMinutes))}</strong></span>
              </div>
            </div>

            {/* 3. Oydagi Vazifalar */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1">
                <span>Oylik Vazifalar</span>
                <ListTodo className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-extrabold text-slate-900">
                  {monthStats.totalTasks}
                </span>
                <span className="text-xs font-semibold text-slate-500">ta vazifa</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px]">
                <span className="text-emerald-700 font-semibold">
                  ✓ {monthStats.completedTasksCount} bajarildi
                </span>
                <span className="text-slate-500 font-semibold">
                  ⏳ {monthStats.pendingTasksCount} kutilmoqda
                </span>
              </div>
            </div>

            {/* 4. Oylik Amallar */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-800 mb-1">
                <span>Oylik Amallar (Bosqichlar)</span>
                <Layers className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-extrabold text-slate-900">
                  {monthStats.totalSteps}
                </span>
                <span className="text-xs font-semibold text-emerald-700">
                  ta amal ({monthStats.stepsPercent}%)
                </span>
              </div>
              <div className="w-full bg-emerald-200/80 h-2 rounded-full overflow-hidden mt-3">
                <div
                  className="h-full bg-emerald-600 rounded-full"
                  style={{ width: `${monthStats.stepsPercent}%` }}
                />
              </div>
              <div className="mt-2 text-[11px] font-semibold text-emerald-800">
                {monthStats.completedSteps} / {monthStats.totalSteps} amal bajarildi
              </div>
            </div>
          </div>

          {/* Monthly Top Time Consumers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            {/* Top Tasks this month */}
            <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 text-sm">
                    Oylik Eng Ko'p Vaqt Oluvchi Vazifalar
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  Oy bo'yicha
                </span>
              </div>

              {monthTopTasks.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Ushbu oyda hech qanday vazifa mavjud emas
                </div>
              ) : (
                <div className="space-y-3">
                  {monthTopTasks.map(({ task, totalMinutes, percentageOfTotal, stepsCount }, idx) => (
                    <div
                      key={task.id}
                      className="p-3 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 transition-colors border border-slate-100"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start space-x-2 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <h4
                              className={`text-xs font-bold truncate ${
                                task.isCompleted ? "line-through text-slate-400" : "text-slate-800"
                              }`}
                            >
                              {task.title}
                            </h4>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                              <span>📅 {task.dueDate}</span>
                              {task.category && <span>• {task.category}</span>}
                              {stepsCount > 0 && <span>• {stepsCount} amal</span>}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold text-slate-900">
                            {formatMinutesUz(totalMinutes)}
                          </div>
                          <div className="text-[10px] font-semibold text-indigo-600">
                            {percentageOfTotal}% oylik ulush
                          </div>
                        </div>
                      </div>

                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2">
                        <div
                          className="h-full bg-indigo-600 rounded-full"
                          style={{ width: `${Math.min(100, percentageOfTotal)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Steps this month */}
            <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-slate-900 text-sm">
                    Oylik Eng Ko'p Vaqt Ketgan Amallar (Bosqichlar)
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                  Vazifa amallari
                </span>
              </div>

              {monthTopSteps.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Ushbu oydagi vazifalarga amallar kiritilmagan
                </div>
              ) : (
                <div className="space-y-2.5">
                  {monthTopSteps.map((step, idx) => (
                    <div
                      key={`${step.taskId}-${step.stepId}-${idx}`}
                      className={`p-2.5 rounded-xl border transition-colors flex items-center justify-between gap-3 ${
                        step.completed
                          ? "bg-emerald-50/60 border-emerald-200 text-slate-600"
                          : "bg-slate-50 border-slate-100 hover:bg-slate-100/70"
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                            step.completed
                              ? "bg-emerald-600 text-white"
                              : "border border-slate-300 bg-white"
                          }`}
                        >
                          {step.completed && <CheckCheck className="w-2.5 h-2.5" />}
                        </div>
                        <div className="min-w-0">
                          <p
                            className={`text-xs font-bold truncate ${
                              step.completed ? "line-through text-slate-400" : "text-slate-800"
                            }`}
                          >
                            {step.stepText}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {step.dueDate} • <strong className="text-slate-600">{step.taskTitle}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          ⏱ {step.estimatedMinutes} daq
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================= */}
      {/* 3. MA'LUM VAQT ORALIG'I (CUSTOM DATE RANGE) BLOKI */}
      {/* Default holatda hech narsa bo'lmaydi va faqat tanlangan bo'lsagina ko'rinadi */}
      {/* ============================================================= */}
      <section className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Section Header with Date Range Selectors */}
        <div className="p-5 sm:p-6 bg-slate-50/80 border-b border-slate-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0">
              <CalendarRange className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-600">
                  3-Bo'lim
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-semibold text-slate-500">Maxsus Oraliq Tahlili</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                {isRangeSelected
                  ? `${formatDateUz(rangeStartDate)} dan ${formatDateUz(rangeEndDate)} gacha`
                  : "Vaqt Oralig'ini Tanlang"}
              </h2>
            </div>
          </div>

          {/* Date Range Controls */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Start date */}
            <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500">Boshlanish:</span>
              <input
                type="date"
                value={rangeStartDate}
                onChange={(e) => setRangeStartDate(e.target.value)}
                className="text-xs font-semibold text-slate-800 outline-hidden cursor-pointer"
              />
            </div>

            {/* End date */}
            <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500">Tugash:</span>
              <input
                type="date"
                value={rangeEndDate}
                onChange={(e) => setRangeEndDate(e.target.value)}
                className="text-xs font-semibold text-slate-800 outline-hidden cursor-pointer"
              />
            </div>

            {/* Quick selectors */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleSetQuickRange(7)}
                className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer shadow-2xs"
              >
                7 kun
              </button>
              <button
                type="button"
                onClick={() => handleSetQuickRange(14)}
                className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer shadow-2xs"
              >
                14 kun
              </button>
              <button
                type="button"
                onClick={() => handleSetQuickRange(30)}
                className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer shadow-2xs"
              >
                30 kun
              </button>
            </div>

            {isRangeSelected && (
              <button
                type="button"
                onClick={handleResetRange}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 border border-slate-200 transition-colors cursor-pointer"
                title="Oraliqni tozalash"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Section Body */}
        <div className="p-5 sm:p-6">
          {!isRangeSelected ? (
            /* By default: Hech narsa ko'rsatilmaydi, yo'naltiruvchi toza banner */
            <div className="py-12 px-4 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3 border border-purple-200/80 shadow-2xs">
                <CalendarRange className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Maxsus vaqt oralig'i tanlanmagan
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                Ushbu bo'limda ma'lum bir sana oralig'idagi barcha ish yuklamalari va amallarni ko'rish uchun
                yuqoridagi <strong>Boshlanish</strong> va <strong>Tugash</strong> sanalarini tanlang yoki tezkor 7, 14, 30 kun tugmalaridan foydalaning.
              </p>
            </div>
          ) : rangeStats && (
            /* Faqat tanlangan bo'lsagina ko'rinadi */
            <div className="space-y-6">
              {/* Range Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Oraliqdagi Yuklama */}
                <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-800 mb-1">
                    <span>Oraliqdagi Yuklama</span>
                    <Clock className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-extrabold text-slate-900">
                      {rangeStats.workloadPercent}%
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      ({rangeStats.diffDays} kunlik oraliq)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden mt-3">
                    <div
                      className="h-full bg-purple-600 rounded-full"
                      style={{ width: `${Math.min(100, rangeStats.workloadPercent)}%` }}
                    />
                  </div>
                  <div className="mt-2 text-[11px] text-slate-600 font-semibold">
                    Kunlik o'rtacha: ~{formatMinutesUz(Math.round(rangeStats.totalMinutes / rangeStats.diffDays))}
                  </div>
                </div>

                {/* 2. Jami Rejadagi Vaqt */}
                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-800 mb-1">
                    <span>Oraliq Jami Vaqti</span>
                    <Zap className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900">
                    {formatMinutesUz(rangeStats.totalMinutes)}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-600">
                    <span>Bajarildi: <strong className="text-emerald-700">{formatMinutesUz(rangeStats.completedMinutes)}</strong></span>
                    <span>Qoldi: <strong className="text-slate-700">{formatMinutesUz(Math.max(0, rangeStats.totalMinutes - rangeStats.completedMinutes))}</strong></span>
                  </div>
                </div>

                {/* 3. Jami Vazifalar */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1">
                    <span>Oraliqdagi Vazifalar</span>
                    <ListTodo className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-extrabold text-slate-900">
                      {rangeStats.totalTasks}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">ta vazifa</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px]">
                    <span className="text-emerald-700 font-semibold">
                      ✓ {rangeStats.completedTasksCount} bajarildi
                    </span>
                    <span className="text-slate-500 font-semibold">
                      ⏳ {rangeStats.pendingTasksCount} kutilmoqda
                    </span>
                  </div>
                </div>

                {/* 4. Oraliqdagi Amallar */}
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-800 mb-1">
                    <span>Oraliqdagi Amallar</span>
                    <Layers className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-extrabold text-slate-900">
                      {rangeStats.totalSteps}
                    </span>
                    <span className="text-xs font-semibold text-emerald-700">
                      ta amal ({rangeStats.stepsPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-emerald-200/80 h-2 rounded-full overflow-hidden mt-3">
                    <div
                      className="h-full bg-emerald-600 rounded-full"
                      style={{ width: `${rangeStats.stepsPercent}%` }}
                    />
                  </div>
                  <div className="mt-2 text-[11px] font-semibold text-emerald-800">
                    {rangeStats.completedSteps} / {rangeStats.totalSteps} amal bajarildi
                  </div>
                </div>
              </div>

              {/* Range Top Time Consumers */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                {/* Top Tasks */}
                <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-2xs">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="w-4 h-4 text-purple-600" />
                      <h3 className="font-bold text-slate-900 text-sm">
                        Ushbu Oraliqda Eng Ko'p Vaqt Oluvchi Vazifalar
                      </h3>
                    </div>
                    <span className="text-[11px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">
                      Oraliq bo'yicha
                    </span>
                  </div>

                  {rangeTopTasks.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      Tanlangan oraliqda birorta vazifa topilmadi
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {rangeTopTasks.map(({ task, totalMinutes, percentageOfTotal, stepsCount }, idx) => (
                        <div
                          key={task.id}
                          className="p-3 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 transition-colors border border-slate-100"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start space-x-2 min-w-0">
                              <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <h4
                                  className={`text-xs font-bold truncate ${
                                    task.isCompleted ? "line-through text-slate-400" : "text-slate-800"
                                  }`}
                                >
                                  {task.title}
                                </h4>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                  <span>📅 {task.dueDate}</span>
                                  {task.category && <span>• {task.category}</span>}
                                  {stepsCount > 0 && <span>• {stepsCount} amal</span>}
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xs font-bold text-slate-900">
                                {formatMinutesUz(totalMinutes)}
                              </div>
                              <div className="text-[10px] font-semibold text-purple-600">
                                {percentageOfTotal}% oraliq ulushi
                              </div>
                            </div>
                          </div>

                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2">
                            <div
                              className="h-full bg-purple-600 rounded-full"
                              style={{ width: `${Math.min(100, percentageOfTotal)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Top Steps */}
                <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-2xs">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      <h3 className="font-bold text-slate-900 text-sm">
                        Ushbu Oraliqda Eng Ko'p Vaqt Ketgan Amallar
                      </h3>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      Amallar reytingi
                    </span>
                  </div>

                  {rangeTopSteps.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      Tanlangan oraliqdagi vazifalarda amallar kiritilmagan
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {rangeTopSteps.map((step, idx) => (
                        <div
                          key={`${step.taskId}-${step.stepId}-${idx}`}
                          className={`p-2.5 rounded-xl border transition-colors flex items-center justify-between gap-3 ${
                            step.completed
                              ? "bg-emerald-50/60 border-emerald-200 text-slate-600"
                              : "bg-slate-50 border-slate-100 hover:bg-slate-100/70"
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <div
                              className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                                step.completed
                              ? "bg-emerald-600 text-white"
                              : "border border-slate-300 bg-white"
                              }`}
                            >
                              {step.completed && <CheckCheck className="w-2.5 h-2.5" />}
                            </div>
                            <div className="min-w-0">
                              <p
                                className={`text-xs font-bold truncate ${
                                  step.completed ? "line-through text-slate-400" : "text-slate-800"
                                }`}
                              >
                                {step.stepText}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {step.dueDate} • <strong className="text-slate-600">{step.taskTitle}</strong>
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
                              ⏱ {step.estimatedMinutes} daq
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
