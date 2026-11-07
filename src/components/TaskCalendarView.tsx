import React, { useState, useMemo, useRef } from "react";
import { Task } from "../types";
import {
  getTodayString,
  formatDateUz,
  formatCreatedAtUz,
  formatTaskScheduleDisplay,
  getTaskOverdueRolloverInfo,
} from "../services/storage";
import { getPriorityBadge } from "./TaskCard";
import { HourlyTimeline } from "./HourlyTimeline";
import { DayWorkloadAnalytics } from "./DayWorkloadAnalytics";
import {
  calculateDayWorkload,
  DAILY_WORK_HOURS,
  DAILY_WORK_MINUTES,
  getTaskEstimatedMinutes,
  formatMinutesUz,
} from "../services/workload";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  CalendarDays,
  Percent,
  TrendingUp,
  Activity,
  Check,
  CalendarClock,
  Edit2,
  CalendarPlus,
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
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const hoverCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCellMouseEnter = (dateStr: string) => {
    if (hoverCloseTimeoutRef.current) {
      clearTimeout(hoverCloseTimeoutRef.current);
      hoverCloseTimeoutRef.current = null;
    }
    setHoveredDate(dateStr);
  };

  const handleCellMouseLeave = () => {
    if (hoverCloseTimeoutRef.current) {
      clearTimeout(hoverCloseTimeoutRef.current);
    }
    hoverCloseTimeoutRef.current = setTimeout(() => {
      setHoveredDate(null);
    }, 130);
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
    // Collect all relevant dates
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

  return (
    <div className="space-y-6">
      {/* 1. Main Calendar Header & Month Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm relative">
        {/* Top Control Bar */}
        <div className="p-4 sm:p-5 rounded-t-2xl bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-white border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
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
                1 kunlik ish me'yori: <strong>8 soat</strong> • Kunlik yuklama foizi va vazifalar tahlili
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
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-200/70 border-b border-slate-200/70 bg-slate-100/40 rounded-b-2xl">
          {calendarCells.map((cell, cellIdx) => {
            const hasTasks = cell.tasksOnDay.length > 0;
            const completedCount = cell.tasksOnDay.filter((t) => t.isCompleted).length;
            const pendingTasks = cell.tasksOnDay.filter((t) => !t.isCompleted);
            const isPastOverdue = cell.dateStr < todayStr && pendingTasks.length > 0;
            const hasTaxTask = cell.tasksOnDay.some((t) => t.priority.includes("Soliq") && !t.isCompleted);
            const workload = cell.workload;
            const percent = workload.workloadPercent;
            const isHovered = hoveredDate === cell.dateStr;

            const colIdx = cellIdx % 7; // 0 (Mon) .. 6 (Sun)
            const rowIdx = Math.floor(cellIdx / 7);

            // Smart horizontal positioning so the hover card never overflows left or right
            const popoverHorizontalClass =
              colIdx <= 1
                ? "left-0"
                : colIdx >= 5
                ? "right-0"
                : "left-1/2 -translate-x-1/2";

            // Smart vertical positioning so bottom rows open upward and top rows open downward
            const popoverVerticalClass =
              rowIdx >= 3 ? "bottom-full mb-2" : "top-full mt-2";

            // Sort tasks by dueTime and completion state for clean display
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
                onClick={() => setSelectedDate(cell.dateStr)}
                onMouseEnter={() => handleCellMouseEnter(cell.dateStr)}
                onMouseLeave={handleCellMouseLeave}
                className={`relative min-h-[96px] sm:min-h-[118px] p-1.5 sm:p-2 transition-all cursor-pointer flex flex-col justify-between ${
                  isHovered ? "z-40 ring-2 ring-blue-500/70 bg-blue-50/40" : ""
                } ${
                  cell.isSelected
                    ? "bg-blue-50/90 ring-2 ring-blue-600 z-20 shadow-xs"
                    : cell.isToday
                    ? "bg-amber-50/50"
                    : cell.isCurrentMonth
                    ? "bg-white hover:bg-slate-50"
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
                  {sortedDayTasks.slice(0, 2).map((t) => {
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

                  {cell.tasksOnDay.length > 2 && (
                    <div className="text-[10px] font-bold text-blue-600 pl-1 tabular-nums">
                      +{cell.tasksOnDay.length - 2} ta yana (ko'rish uchun ustiga boring)
                    </div>
                  )}
                </div>

                {/* Cell Footer: Task count + Add Button */}
                <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100/80">
                  <span className="text-[10px] font-medium text-slate-400 tabular-nums">
                    {hasTasks ? `${cell.tasksOnDay.length} vazifa` : ""}
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

                {/* HOVER PREVIEW POPOVER: Kun ustiga borilganda shu kundagi barcha vazifalar ro'yxati */}
                {isHovered && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    onMouseEnter={() => handleCellMouseEnter(cell.dateStr)}
                    onMouseLeave={handleCellMouseLeave}
                    className={`hidden sm:block absolute ${popoverHorizontalClass} ${popoverVerticalClass} z-50 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden cursor-default`}
                  >
                    {/* Popover Header */}
                    <div className="p-3 bg-slate-900 text-white flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <CalendarIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="text-xs font-extrabold tracking-tight truncate">
                            {formatDateUz(cell.dateStr)}
                          </span>
                          {cell.isToday && (
                            <span className="text-[10px] font-bold text-blue-300">
                              · Bugun
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-300 mt-0.5 tabular-nums">
                          <span>Jami: <strong className="text-white">{cell.tasksOnDay.length} ta</strong></span>
                          <span>·</span>
                          <span className="text-emerald-300">✓ {completedCount}</span>
                          <span>·</span>
                          <span className="text-amber-300">⏳ {pendingTasks.length}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 tabular-nums">
                        <div className="text-xs font-black text-white">
                          {percent}% yuklama
                        </div>
                        <div className="text-[10px] text-slate-300">
                          {formatMinutesUz(workload.totalMinutes)} / 8 soat
                        </div>
                      </div>
                    </div>

                    {/* Popover Body: Tasks List */}
                    {sortedDayTasks.length === 0 ? (
                      <div className="p-4 text-center space-y-2">
                        <p className="text-xs text-slate-500 font-medium">
                          Ushbu kunga vazifalar kiritilmagan
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setHoveredDate(null);
                            onOpenNewTask(cell.dateStr);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Vazifa qo'shish</span>
                        </button>
                      </div>
                    ) : (
                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                        {sortedDayTasks.map((t, idx) => {
                          const badge = getPriorityBadge(t.priority);
                          const rollover = getTaskOverdueRolloverInfo(t);
                          const scheduleInfo = formatTaskScheduleDisplay(t);
                          const estMins = getTaskEstimatedMinutes(t);
                          const totalSteps = t.steps?.length || 0;
                          const doneSteps = t.steps?.filter((s) => s.completed).length || 0;

                          return (
                            <div
                              key={t.id}
                              className={`p-3 transition-colors ${
                                t.isCompleted
                                  ? "bg-emerald-50/40 hover:bg-emerald-50/70"
                                  : rollover
                                  ? "bg-amber-50/50 hover:bg-amber-50/80"
                                  : "bg-white hover:bg-slate-50"
                              }`}
                            >
                              {/* Title & Status */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-1.5 min-w-0">
                                  <span className="text-xs font-bold text-slate-400 tabular-nums shrink-0 mt-0.5">
                                    {idx + 1}.
                                  </span>
                                  <div className="min-w-0">
                                    <div
                                      className={`text-xs font-bold leading-snug break-words ${
                                        t.isCompleted
                                          ? "line-through text-slate-500"
                                          : "text-slate-900"
                                      }`}
                                    >
                                      {t.title}
                                    </div>
                                    {/* Metadata line */}
                                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 mt-1 tabular-nums">
                                      <span className="font-semibold text-slate-700">
                                        {t.dueTime || "Soat yo'q"}
                                      </span>
                                      <span>·</span>
                                      <span>{formatMinutesUz(estMins)}</span>
                                      <span>·</span>
                                      <span>{scheduleInfo.shortTag}</span>
                                      <span>·</span>
                                      <span className="font-medium text-slate-700">{badge.label}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Status indicator */}
                                <div className="shrink-0">
                                  {t.isCompleted ? (
                                    <span className="inline-flex items-center text-[10px] font-bold text-emerald-700">
                                      <CheckCircle2 className="w-3.5 h-3.5 mr-0.5 text-emerald-600" />
                                      Bajarildi
                                    </span>
                                  ) : rollover ? (
                                    <span className="inline-flex items-center text-[10px] font-extrabold text-amber-800 tabular-nums">
                                      <AlertTriangle className="w-3 h-3 mr-0.5 text-amber-600" />
                                      {rollover.timesRolled}x kechikkan
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center text-[10px] font-semibold text-blue-700">
                                      Rejada
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Rollover notice if delayed */}
                              {rollover && !t.isCompleted && (
                                <div className="mt-1.5 text-[10px] font-semibold text-amber-800 bg-amber-100/70 px-2 py-1 rounded-md">
                                  ⚠️ Oldingi kundan bajarilmay o'tgan ({rollover.timesRolled}-marta kechikish)
                                </div>
                              )}

                              {/* Steps preview if present */}
                              {totalSteps > 0 && (
                                <div className="mt-1.5 pl-4 space-y-0.5">
                                  <div className="text-[10px] font-semibold text-slate-500 tabular-nums">
                                    Amallar ({doneSteps}/{totalSteps}):
                                  </div>
                                  {t.steps.slice(0, 3).map((s) => (
                                    <div
                                      key={s.id}
                                      className={`text-[10px] flex items-center gap-1 truncate ${
                                        s.completed ? "text-emerald-700 line-through" : "text-slate-600"
                                      }`}
                                    >
                                      <span>{s.completed ? "✓" : "•"}</span>
                                      <span className="truncate">{s.text}</span>
                                    </div>
                                  ))}
                                  {totalSteps > 3 && (
                                    <div className="text-[10px] text-slate-400">
                                      +{totalSteps - 3} ta amal...
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Bottom row: CreatedAt + Quick Actions */}
                              <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between gap-2">
                                <span className="text-[10px] text-slate-400 flex items-center truncate tabular-nums">
                                  <CalendarPlus className="w-2.5 h-2.5 mr-1 shrink-0" />
                                  {formatCreatedAtUz(t.createdAt, t.id)}
                                </span>

                                <div className="flex items-center gap-1 shrink-0">
                                  {!t.isCompleted && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setHoveredDate(null);
                                        onOpenCompleteModal(t);
                                      }}
                                      className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-0.5 transition-colors cursor-pointer"
                                      title="Bajarildi deb belgilash"
                                    >
                                      <Check className="w-2.5 h-2.5" />
                                      <span>Bajarildi</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setHoveredDate(null);
                                      onOpenDateReschedule(t);
                                    }}
                                    className="p-1 rounded hover:bg-amber-100 text-amber-700 transition-colors cursor-pointer"
                                    title="Boshqa kunga ko'chirish"
                                  >
                                    <CalendarClock className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setHoveredDate(null);
                                      onEditTask(t);
                                    }}
                                    className="p-1 rounded hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                                    title="Tahrirlash"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Popover Footer */}
                    <div className="p-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDate(cell.dateStr);
                          setHoveredDate(null);
                        }}
                        className="text-[11px] font-bold text-slate-700 hover:text-blue-600 px-2 py-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        Kun jadvalini ochish
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setHoveredDate(null);
                          onOpenNewTask(cell.dateStr);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Vazifa qo'shish</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Tanlangan kun uchun maxsus 8 soatlik Yuklama va Amallar Tahlili Paneli */}
      <DayWorkloadAnalytics
        date={selectedDate}
        tasks={tasks}
        onToggleStep={onToggleStep}
        onOpenCompleteModal={onOpenCompleteModal}
        onOpenHourReschedule={onOpenHourReschedule}
      />

      {/* 3. Tanlangan kun uchun Interaktiv Soatlar Jadvali */}
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

