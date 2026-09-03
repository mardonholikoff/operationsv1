import React, { useState, useMemo } from "react";
import { Task } from "../types";
import { getTodayString, formatDateUz } from "../services/storage";
import { getPriorityBadge } from "./TaskCard";
import { HourlyTimeline } from "./HourlyTimeline";
import { DayWorkloadAnalytics } from "./DayWorkloadAnalytics";
import {
  calculateDayWorkload,
  DAILY_WORK_HOURS,
  DAILY_WORK_MINUTES,
  formatMinutesUz
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
  Activity
} from "lucide-react";

interface TaskCalendarViewProps {
  tasks: Task[];
  onOpenNewTask: (defaultDate?: string, defaultTime?: string) => void;
  onOpenHourReschedule: (task: Task) => void;
  onOpenDateReschedule: (task: Task) => void;
  onOpenCompleteModal: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleStep?: (taskId: string, stepId: string) => void;
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
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-200/70 border-b border-slate-200/70 bg-slate-100/40">
          {calendarCells.map((cell) => {
            const hasTasks = cell.tasksOnDay.length > 0;
            const completedCount = cell.tasksOnDay.filter((t) => t.isCompleted).length;
            const pendingTasks = cell.tasksOnDay.filter((t) => !t.isCompleted);
            const isPastOverdue = cell.dateStr < todayStr && pendingTasks.length > 0;
            const hasTaxTask = cell.tasksOnDay.some((t) => t.priority.includes("Soliq") && !t.isCompleted);
            const workload = cell.workload;
            const percent = workload.workloadPercent;

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

            return (
              <div
                key={cell.dateStr}
                onClick={() => setSelectedDate(cell.dateStr)}
                className={`min-h-[96px] sm:min-h-[118px] p-1.5 sm:p-2 transition-all cursor-pointer flex flex-col justify-between ${
                  cell.isSelected
                    ? "bg-blue-50/90 ring-2 ring-blue-600 z-10 shadow-xs"
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
                      className={`inline-flex items-center justify-center text-xs font-black rounded-lg w-6 h-6 ${
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
                      {hasTaxTask && (
                        <span
                          className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"
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
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold flex items-center gap-0.5 ${badgeStyle}`}
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
                  {cell.tasksOnDay.slice(0, 2).map((t) => {
                    const badge = getPriorityBadge(t.priority);
                    return (
                      <div
                        key={t.id}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold truncate flex items-center space-x-1 border ${
                          t.isCompleted
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200/80 line-through opacity-75"
                            : `${badge.bg}`
                        }`}
                        title={`${t.dueTime ? t.dueTime + " - " : ""}${t.title}`}
                      >
                        {t.dueTime && (
                          <span className="font-bold shrink-0">{t.dueTime}</span>
                        )}
                        <span className="truncate">{t.title}</span>
                      </div>
                    );
                  })}

                  {cell.tasksOnDay.length > 2 && (
                    <div className="text-[10px] font-bold text-blue-600 pl-1">
                      +{cell.tasksOnDay.length - 2} ta yana
                    </div>
                  )}
                </div>

                {/* Cell Footer: Task count + Add Button */}
                <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100/80">
                  <span className="text-[10px] font-medium text-slate-400">
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

