import React, { useState, useMemo, useRef } from "react";
import { Task } from "../types";
import {
  getTodayString,
  formatDateUz,
  getTaskOverdueRolloverInfo,
} from "../services/storage";
import { TaskCard, getPriorityBadge } from "./TaskCard";
import { HourlyTimeline } from "./HourlyTimeline";
import { DayWorkloadAnalytics } from "./DayWorkloadAnalytics";
import {
  calculateDayWorkload,
  formatMinutesUz,
} from "../services/workload";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Flame,
  CalendarDays,
  Activity,
  ArrowUp,
  ListChecks,
} from "lucide-react";

interface TaskCalendarViewProps {
  tasks: Task[];
  onOpenNewTask: (defaultDate?: string, defaultTime?: string) => void;
  onOpenHourReschedule: (task: Task) => void;
  onOpenDateReschedule: (task: Task) => void;
  onOpenCompleteModal: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleStep?: (
    taskId: string,
    stepId: string,
    actualMinutes?: number,
    completeEntireTask?: boolean
  ) => void;
}

const UZ_MONTH_NAMES = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"
];

const WEEKDAY_NAMES = ["Dush", "Sesh", "Chor", "Pay", "Juma", "Shan", "Yak"];

export const TaskCalendarView: React.FC<TaskCalendarViewProps> = ({
  tasks,
  onOpenNewTask,
  onOpenHourReschedule,
  onOpenDateReschedule,
  onOpenCompleteModal,
  onEditTask,
  onDeleteTask,
  onToggleStep,
}) => {
  const todayStr = getTodayString();
  const [currentYear, setCurrentYear] = useState<number>(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(() => new Date().getMonth()); // 0 - 11
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const calendarTopRef = useRef<HTMLDivElement | null>(null);
  const selectedDayTasksRef = useRef<HTMLDivElement | null>(null);

  const handleSelectDay = (dateStr: string) => {
    setSelectedDate(dateStr);
    // Parse year/month if user clicked a trailing/leading day from adjacent month
    const [y, m] = dateStr.split("-").map(Number);
    if (y && m) {
      if (y !== currentYear) setCurrentYear(y);
      if (m - 1 !== currentMonth) setCurrentMonth(m - 1);
    }
    setTimeout(() => {
      selectedDayTasksRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 60);
  };

  const handleShiftSelectedDay = (offsetDays: number) => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const dt = new Date(y, m - 1, d + offsetDays);
    const nextY = dt.getFullYear();
    const nextM = dt.getMonth();
    const nextD = dt.getDate();
    const nextDateStr = `${nextY}-${String(nextM + 1).padStart(2, "0")}-${String(nextD).padStart(2, "0")}`;
    setSelectedDate(nextDateStr);
    if (nextY !== currentYear) setCurrentYear(nextY);
    if (nextM !== currentMonth) setCurrentMonth(nextM);
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleGoToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDate(todayStr);
  };

  // Generate days matrix for current month
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const startingDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const totalDaysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  // Pre-calculate workload map for performance
  const workloadByDate = useMemo(() => {
    const map: Record<string, ReturnType<typeof calculateDayWorkload>> = {};
    tasks.forEach((t) => {
      if (t.dueDate && !map[t.dueDate]) {
        map[t.dueDate] = calculateDayWorkload(t.dueDate, tasks);
      }
    });
    return map;
  }, [tasks]);

  const getDayWorkload = (dateStr: string) => {
    if (!workloadByDate[dateStr]) {
      workloadByDate[dateStr] = calculateDayWorkload(dateStr, tasks);
    }
    return workloadByDate[dateStr];
  };

  // Build 35 or 42 cells grid
  const calendarCells: {
    dateStr: string;
    dayNum: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    isSelected: boolean;
    tasksOnDay: Task[];
    workload: ReturnType<typeof calculateDayWorkload>;
  }[] = [];

  // Previous month trailing days
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const d = totalDaysInPrevMonth - i;
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    calendarCells.push({
      dateStr,
      dayNum: d,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedDate,
      tasksOnDay: tasks.filter((t) => t.dueDate === dateStr),
      workload: getDayWorkload(dateStr),
    });
  }

  // Current month days
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    calendarCells.push({
      dateStr,
      dayNum: d,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedDate,
      tasksOnDay: tasks.filter((t) => t.dueDate === dateStr),
      workload: getDayWorkload(dateStr),
    });
  }

  // Next month leading days to complete grid
  const remainingCells = 7 - (calendarCells.length % 7);
  if (remainingCells < 7) {
    for (let d = 1; d <= remainingCells; d++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      calendarCells.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        tasksOnDay: tasks.filter((t) => t.dueDate === dateStr),
        workload: getDayWorkload(dateStr),
      });
    }
  }

  // Selected day tasks sorted by completion status and time
  const selectedDayTasks = useMemo(() => {
    return tasks
      .filter((t) => t.dueDate === selectedDate)
      .sort((a, b) => {
        if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
        return (a.dueTime || "23:59").localeCompare(b.dueTime || "23:59");
      });
  }, [tasks, selectedDate]);

  const selectedDayCompletedCount = selectedDayTasks.filter((t) => t.isCompleted).length;
  const selectedDayPendingCount = selectedDayTasks.length - selectedDayCompletedCount;
  const selectedDayRolledCount = selectedDayTasks.filter(
    (t) => !t.isCompleted && Boolean(getTaskOverdueRolloverInfo(t))
  ).length;
  const selectedDayWorkload = getDayWorkload(selectedDate);

  return (
    <div className="space-y-6" ref={calendarTopRef}>
      {/* 1. Main Calendar Header & Month Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Top Control Bar */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-white border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
              <CalendarDays className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <span>{UZ_MONTH_NAMES[currentMonth]} {currentYear}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-100/80 text-blue-800">
                  8 Soatlik Me'yor
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Istalgan kun ustiga bosing — o'sha kundagi barcha vazifalar pastda to'liq ko'rinishda ochiladi
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleGoToToday}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              Bugun
            </button>
            <div className="flex items-center rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition-colors cursor-pointer"
                title="Oldingi oy"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-slate-200" />
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition-colors cursor-pointer"
                title="Keyingi oy"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => onOpenNewTask(selectedDate)}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Vazifa qo'shish</span>
            </button>
          </div>
        </div>

        {/* Legend bar for workload percentages */}
        <div className="px-4 py-2 bg-slate-50/90 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
          <span className="font-bold text-slate-700 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            Yuklama indikatori (8 soat = 100%):
          </span>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 font-semibold">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              0% Bo'sh
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              1-50% Yengil
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              51-85% Optimal
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              86-100% To'liq
            </span>
            <span className="flex items-center gap-1 text-rose-700 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
              &gt;100% Ortiqcha
            </span>
          </div>
        </div>

        {/* Weekday Header Row */}
        <div className="grid grid-cols-7 border-b border-slate-200/90 bg-slate-100/60 text-center text-xs font-bold text-slate-700">
          {WEEKDAY_NAMES.map((name, idx) => (
            <div
              key={name}
              className={`py-2 px-1 border-r border-slate-200/60 last:border-r-0 ${
                idx >= 5 ? "text-rose-600/90 bg-rose-50/20" : ""
              }`}
            >
              {name}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-200/70 border-b border-slate-200/70 bg-slate-100/40">
          {calendarCells.map((cell) => {
            const hasTasks = cell.tasksOnDay.length > 0;
            const pendingTasks = cell.tasksOnDay.filter((t) => !t.isCompleted);
            const isPastOverdue = cell.dateStr < todayStr && pendingTasks.length > 0;
            const hasTaxTask = cell.tasksOnDay.some((t) => t.priority.includes("Soliq") && !t.isCompleted);
            const workload = cell.workload;
            const percent = workload.workloadPercent;

            // Sort tasks by dueTime and completion state
            const sortedDayTasks = [...cell.tasksOnDay].sort((a, b) => {
              if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
              return (a.dueTime || "23:59").localeCompare(b.dueTime || "23:59");
            });

            // Workload color badge for cell
            let badgeStyle = "bg-slate-100 text-slate-600";
            let barColor = "bg-slate-300";
            if (percent > 100) {
              badgeStyle = "bg-rose-100 text-rose-800 font-black border border-rose-300";
              barColor = "bg-rose-600";
            } else if (percent > 85) {
              badgeStyle = "bg-amber-100 text-amber-900 font-black border border-amber-300";
              barColor = "bg-amber-500";
            } else if (percent > 50) {
              badgeStyle = "bg-blue-100 text-blue-800 font-bold border border-blue-200";
              barColor = "bg-blue-600";
            } else if (percent > 0) {
              badgeStyle = "bg-emerald-100 text-emerald-800 font-bold border border-emerald-200";
              barColor = "bg-emerald-500";
            }

            const rolledTasksCount = cell.tasksOnDay.filter(
              (t) => !t.isCompleted && getTaskOverdueRolloverInfo(t)
            ).length;

            return (
              <div
                key={cell.dateStr}
                onClick={() => handleSelectDay(cell.dateStr)}
                className={`relative min-h-[104px] sm:min-h-[126px] p-1.5 sm:p-2 transition-all cursor-pointer flex flex-col justify-between ${
                  cell.isSelected
                    ? "bg-blue-50/90 ring-2 ring-inset ring-blue-600 z-10 shadow-xs"
                    : cell.isToday
                    ? "bg-amber-50/50 hover:bg-amber-50/80"
                    : cell.isCurrentMonth
                    ? "bg-white hover:bg-blue-50/30"
                    : "bg-slate-50/70 text-slate-400 hover:bg-slate-100/70"
                }`}
              >
                {/* Day Header Row: Number + Workload % Badge */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`inline-flex items-center justify-center text-xs font-black rounded-lg w-6 h-6 tabular-nums ${
                        cell.isToday
                          ? "bg-blue-600 text-white shadow-xs"
                          : cell.isSelected
                          ? "bg-blue-200 text-blue-900"
                          : cell.isCurrentMonth
                          ? "text-slate-800"
                          : "text-slate-400"
                      }`}
                    >
                      {cell.dayNum}
                    </span>

                    {/* Status badges: Workload % badge */}
                    <div className="flex items-center space-x-1">
                      {rolledTasksCount > 0 && (
                        <span
                          className="text-[9px] px-1 py-0.2 bg-amber-100 text-amber-950 border border-amber-300 rounded font-black flex items-center gap-0.5 tabular-nums"
                          title={`${rolledTasksCount} ta vazifa bajarilmasdan o'tgan`}
                        >
                          <AlertTriangle className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                          {rolledTasksCount}
                        </span>
                      )}
                      {hasTaxTask && (
                        <span
                          className="w-2 h-2 rounded-full bg-rose-500"
                          title="Muhim Soliq vazifasi bor"
                        />
                      )}
                      {isPastOverdue && (
                        <span
                          className="text-[9px] px-1 bg-rose-100 text-rose-700 rounded font-black"
                          title="Kechikkan vazifalar bor"
                        >
                          !
                        </span>
                      )}

                      {/* Workload Percentage Pill */}
                      {hasTasks && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold flex items-center gap-0.5 tabular-nums ${badgeStyle}`}
                          title={`8 soatlik me'yordan ${percent}% band (${formatMinutesUz(workload.totalMinutes)})`}
                        >
                          {percent > 100 && <Flame className="w-2.5 h-2.5 text-rose-600 shrink-0" />}
                          {percent}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Workload Progress Bar across cell */}
                  {hasTasks && (
                    <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden mb-1.5" title={`8 soatlik yuklama: ${percent}%`}>
                      <div
                        className={`h-full ${barColor}`}
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Day's task pills */}
                <div className="space-y-1 flex-1 overflow-hidden">
                  {sortedDayTasks.slice(0, 3).map((t) => {
                    const badge = getPriorityBadge(t.priority);
                    const rollover = getTaskOverdueRolloverInfo(t);
                    return (
                      <div
                        key={t.id}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold truncate flex items-center space-x-1 border ${
                          t.isCompleted
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200/80 line-through opacity-75"
                            : rollover
                            ? "bg-amber-100/90 text-amber-950 border-amber-300 font-bold"
                            : `${badge.bg}`
                        }`}
                      >
                        {rollover && !t.isCompleted && (
                          <span className="text-[9px] font-black text-amber-700 shrink-0 tabular-nums">
                            ⚠️{rollover.timesRolled}x
                          </span>
                        )}
                        {t.dueTime && (
                          <span className="font-bold shrink-0 tabular-nums">{t.dueTime}</span>
                        )}
                        <span className="truncate">{t.title}</span>
                      </div>
                    );
                  })}

                  {cell.tasksOnDay.length > 3 && (
                    <div className="text-[10px] font-bold text-blue-600 pl-1 tabular-nums">
                      +{cell.tasksOnDay.length - 3} ta vazifa (barchasini ko'rish)
                    </div>
                  )}
                </div>

                {/* Cell Footer: Task count + Add Button */}
                <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100/80">
                  <span className="text-[10px] font-semibold text-slate-500 tabular-nums">
                    {hasTasks ? `${cell.tasksOnDay.length} ta vazifa` : ""}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenNewTask(cell.dateStr);
                    }}
                    className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-blue-600 text-[10px] flex items-center cursor-pointer"
                    title={`${cell.dateStr} ga yangi vazifa kiritish`}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. TANLANGAN KUN VAZIFALARI — TO'LIQ KO'RINISH (Kunga bosilganda to'liq chiqadigan asosiy blok) */}
      <div
        ref={selectedDayTasksRef}
        className="bg-white rounded-2xl border-2 border-blue-200/90 shadow-sm overflow-hidden scroll-mt-4"
      >
        {/* Selected Day Header Bar */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-600/30 border border-blue-400/40 text-blue-200 flex items-center justify-center shrink-0">
              <ListChecks className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-xl font-black tracking-tight text-white">
                  {formatDateUz(selectedDate)} — Kunlik Vazifalar Ro'yxati
                </h3>
                {selectedDate === todayStr && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-500 text-white">
                    Bugun
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-1 tabular-nums">
                <span>
                  Jami vazifalar: <strong className="text-white">{selectedDayTasks.length} ta</strong>
                </span>
                <span>•</span>
                <span className="text-emerald-300 font-semibold">
                  Bajarildi: {selectedDayCompletedCount} ta
                </span>
                <span>•</span>
                <span className="text-amber-300 font-semibold">
                  Kutilmoqda: {selectedDayPendingCount} ta
                </span>
                {selectedDayRolledCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-orange-300 font-bold">
                      ⚠️ Kechikib o'tgan: {selectedDayRolledCount} ta
                    </span>
                  </>
                )}
                <span>•</span>
                <span className="text-blue-200 font-semibold">
                  Ish yuklamasi: {selectedDayWorkload.workloadPercent}% ({formatMinutesUz(selectedDayWorkload.totalMinutes)})
                </span>
              </div>
            </div>
          </div>

          {/* Day Navigation & Actions */}
          <div className="flex flex-wrap items-center gap-2 self-end lg:self-center">
            <div className="flex items-center rounded-xl bg-white/10 border border-white/15 overflow-hidden">
              <button
                type="button"
                onClick={() => handleShiftSelectedDay(-1)}
                className="px-2.5 py-1.5 text-xs font-bold text-white hover:bg-white/15 flex items-center gap-1 transition-colors cursor-pointer"
                title="Oldingi kun"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Oldingi kun</span>
              </button>
              <div className="w-px h-4 bg-white/20" />
              <button
                type="button"
                onClick={() => handleShiftSelectedDay(1)}
                className="px-2.5 py-1.5 text-xs font-bold text-white hover:bg-white/15 flex items-center gap-1 transition-colors cursor-pointer"
                title="Keyingi kun"
              >
                <span>Keyingi kun</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => onOpenNewTask(selectedDate)}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Shu kunga vazifa qo'shish</span>
            </button>

            <button
              type="button"
              onClick={() =>
                calendarTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 flex items-center gap-1 transition-colors cursor-pointer"
              title="Kalendar jadvaliga qaytish"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span>Kalendarga</span>
            </button>
          </div>
        </div>

        {/* Full Tasks Cards List for Selected Date */}
        <div className="p-4 sm:p-6 bg-slate-50/60">
          {selectedDayTasks.length === 0 ? (
            <div className="py-12 px-4 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-3">
              <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto" />
              <div>
                <h4 className="text-sm sm:text-base font-bold text-slate-800">
                  {formatDateUz(selectedDate)} sanasiga vazifalar kiritilmagan
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Ushbu kunga yangi vazifa qo'shish uchun quyidagi tugmani bosing
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenNewTask(selectedDate)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Vazifa qo'shish</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
              {selectedDayTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggleStep={(taskId, stepId) =>
                    onToggleStep && onToggleStep(taskId, stepId)
                  }
                  onOpenCompleteModal={onOpenCompleteModal}
                  onOpenRescheduleModal={onOpenDateReschedule}
                  onOpenHourReschedule={onOpenHourReschedule}
                  onEditTask={onEditTask}
                  onDeleteTask={onDeleteTask}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. Tanlangan kun uchun maxsus 8 soatlik Yuklama va Amallar Tahlili Paneli */}
      <DayWorkloadAnalytics
        date={selectedDate}
        tasks={tasks}
        onToggleStep={onToggleStep}
        onOpenCompleteModal={onOpenCompleteModal}
        onOpenHourReschedule={onOpenHourReschedule}
      />

      {/* 4. Tanlangan kun uchun Interaktiv Soatlar Jadvali */}
      <HourlyTimeline
        date={selectedDate}
        tasks={tasks}
        onOpenHourReschedule={onOpenHourReschedule}
        onOpenDateReschedule={onOpenDateReschedule}
        onOpenCompleteModal={onOpenCompleteModal}
        onEditTask={onEditTask}
        onDeleteTask={onDeleteTask}
        onAddTaskAtHour={(hour) => onOpenNewTask(selectedDate, hour)}
        onToggleStep={onToggleStep}
      />
    </div>
  );
};

