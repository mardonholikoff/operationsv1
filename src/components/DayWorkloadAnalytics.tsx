import React from "react";
import { Task } from "../types";
import {
  DAILY_WORK_HOURS,
  DAILY_WORK_MINUTES,
  calculateDayWorkload,
  getTaskEstimatedMinutes,
  formatMinutesUz
} from "../services/workload";
import { formatDateUz } from "../services/storage";
import { getPriorityBadge } from "./TaskCard";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ListChecks,
  TrendingUp,
  Percent,
  Calendar,
  Hourglass,
  CheckCheck,
  CircleDot
} from "lucide-react";

interface DayWorkloadAnalyticsProps {
  date: string;
  tasks: Task[];
  onToggleStep?: (taskId: string, stepId: string) => void;
  onOpenCompleteModal?: (task: Task) => void;
  onOpenHourReschedule?: (task: Task) => void;
}

export const DayWorkloadAnalytics: React.FC<DayWorkloadAnalyticsProps> = ({
  date,
  tasks,
  onToggleStep,
  onOpenCompleteModal,
  onOpenHourReschedule,
}) => {
  const stats = calculateDayWorkload(date, tasks);
  const dayTasks = tasks.filter((t) => t.dueDate === date);

  // Status color logic based on 8-hour workload percentage
  const getWorkloadTheme = (percent: number) => {
    if (percent === 0) {
      return {
        badgeBg: "bg-slate-100 text-slate-700 border-slate-200",
        barColor: "bg-slate-400",
        cardBorder: "border-slate-200",
        statusText: "Bo'sh kun (Vazifalar yo'q)",
        statusSub: "Rejalashtirilgan topshiriq yo'q",
      };
    }
    if (percent <= 50) {
      return {
        badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
        barColor: "bg-emerald-500",
        cardBorder: "border-emerald-200/80",
        statusText: "Yengil ish yuklamasi",
        statusSub: "Normadan past, yangi vazifalar qo'shish mumkin",
      };
    }
    if (percent <= 85) {
      return {
        badgeBg: "bg-blue-50 text-blue-800 border-blue-200",
        barColor: "bg-blue-600",
        cardBorder: "border-blue-200/80",
        statusText: "Optimal me'yoriy yuklama",
        statusSub: "Ish soatlari qulay taqsimlangan",
      };
    }
    if (percent <= 100) {
      return {
        badgeBg: "bg-amber-50 text-amber-900 border-amber-300",
        barColor: "bg-amber-500",
        cardBorder: "border-amber-300",
        statusText: "To'liq 8 soatlik yuklama",
        statusSub: "Kunlik norma to'liq band",
      };
    }
    return {
      badgeBg: "bg-rose-50 text-rose-900 border-rose-300",
      barColor: "bg-rose-600",
      cardBorder: "border-rose-400",
      statusText: "Ortiqcha yuklama (8 soatdan ortiq)",
      statusSub: "Diqqat: ish vaqti normadan oshib ketgan!",
    };
  };

  const theme = getWorkloadTheme(stats.workloadPercent);

  // Aggregate step analytics across tasks for this day
  const allDaySteps = dayTasks.flatMap((t) =>
    (t.steps || []).map((s) => ({
      ...s,
      taskTitle: t.title,
      taskId: t.id,
      taskPriority: t.priority,
      taskTime: t.dueTime,
      isTaskCompleted: t.isCompleted,
    }))
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-4 sm:p-5">
      {/* Header with Title & Date */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-xs shrink-0">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                Kunlik Ish Yuklamasi va Amallar Tahlili
              </h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                {formatDateUz(date)}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              1 kunlik ish normasi: <strong>{DAILY_WORK_HOURS} soat ({DAILY_WORK_MINUTES} daqiqa)</strong>
            </p>
          </div>
        </div>

        {/* Workload Status Badge */}
        <div className="flex items-center space-x-2">
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center space-x-1.5 ${theme.badgeBg}`}>
            {stats.isOverloaded ? (
              <Flame className="w-4 h-4 text-rose-600 animate-pulse" />
            ) : (
              <TrendingUp className="w-4 h-4 text-blue-600" />
            )}
            <span>{stats.workloadPercent}% Yuklama</span>
          </div>
        </div>
      </div>

      {/* 1. Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Kunlik Yuklama Foizi */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Ish Yuklamasi
            </span>
            <span className="text-xs font-black text-blue-600">8 soat me'yor</span>
          </div>
          <div className="text-2xl font-black text-slate-900 flex items-baseline gap-1">
            {stats.workloadPercent}%
            <span className="text-xs font-medium text-slate-500">
              ({formatMinutesUz(stats.totalMinutes)})
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-200 h-2 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${theme.barColor}`}
              style={{ width: `${Math.min(100, stats.workloadPercent)}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-500 mt-1.5 font-medium truncate">
            {theme.statusText}
          </div>
        </div>

        {/* Card 2: Rejalashtirilgan vaqt & Bo'sh / Ortiqcha vaqt */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Vaqt Taqsimoti
            </span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats.totalHoursFormatted}
          </div>
          <div className="text-[11px] mt-2 font-semibold">
            {stats.isOverloaded ? (
              <span className="text-rose-600 flex items-center gap-1 font-bold">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Ortiqcha yuklama: +{formatMinutesUz(stats.overloadedMinutes)}
              </span>
            ) : (
              <span className="text-emerald-700 flex items-center gap-1 font-bold">
                <Hourglass className="w-3.5 h-3.5 shrink-0" />
                Erkin zaxira: {formatMinutesUz(stats.remainingMinutes)}
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Bajarilgani: {formatMinutesUz(stats.completedMinutes)}
          </div>
        </div>

        {/* Card 3: Vazifalar Holati */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Vazifalar
            </span>
            <CheckCircle2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats.completedTasks} / {stats.totalTasks}
          </div>
          <div className="flex items-center space-x-2 text-[11px] font-medium text-slate-600 mt-2">
            <span className="text-emerald-700 font-bold">
              ✓ {stats.completedTasks} bajarildi
            </span>
            <span>•</span>
            <span className="text-blue-700 font-bold">
              ⌛ {stats.pendingTasks} kutilmoqda
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Jami {dayTasks.length} ta topshiriq biriktirilgan
          </div>
        </div>

        {/* Card 4: Amallar (Bosqichlar) Tahlili */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Amallar & Bosqichlar
            </span>
            <ListChecks className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 flex items-baseline gap-1">
            {stats.completedSteps} / {stats.totalSteps}
            <span className="text-xs font-medium text-slate-500">
              ({stats.stepsPercent}%)
            </span>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${stats.stepsPercent}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-500 mt-1.5 font-medium">
            {stats.totalSteps > 0
              ? `${stats.totalSteps - stats.completedSteps} ta amal bajarilishi kerak`
              : "Amallar kiritilmagan"}
          </div>
        </div>
      </div>

      {/* 2. Chuqur Tahlil: Vazifalar va ularning amallari (Steps Breakdown) */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center space-x-2">
            <ListChecks className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs sm:text-sm font-extrabold text-slate-800">
              Vazifalarni bajarish uchun kerak bo'lgan amallar (qadamlar) tahlili
            </h4>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {dayTasks.length} ta vazifa tarkibida {allDaySteps.length} ta amal
          </span>
        </div>

        {dayTasks.length === 0 ? (
          <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">
            <Calendar className="w-8 h-8 mx-auto text-slate-300 mb-1" />
            <p className="text-xs font-semibold text-slate-600">
              Ushbu kunga rejalashtirilgan vazifalar mavjud emas
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {dayTasks.map((task) => {
              const taskMinutes = getTaskEstimatedMinutes(task);
              const taskSharePercent = Math.round((taskMinutes / DAILY_WORK_MINUTES) * 100);
              const priorityBadge = getPriorityBadge(task.priority);
              const steps = task.steps || [];
              const completedCount = steps.filter((s) => s.completed).length;

              return (
                <div
                  key={task.id}
                  className={`p-3 sm:p-3.5 rounded-xl border transition-all ${
                    task.isCompleted
                      ? "bg-slate-50/60 border-slate-200"
                      : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
                  }`}
                >
                  {/* Task Header info row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${priorityBadge.bg}`}>
                        {priorityBadge.label}
                      </span>
                      {task.dueTime && (
                        <span className="inline-flex items-center text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 shrink-0">
                          <Clock className="w-3 h-3 mr-0.5" />
                          {task.dueTime}
                        </span>
                      )}
                      <span className={`text-xs sm:text-sm font-bold truncate ${
                        task.isCompleted ? "line-through text-slate-400" : "text-slate-900"
                      }`}>
                        {task.title}
                      </span>
                    </div>

                    {/* Workload Contribution & Duration */}
                    <div className="flex items-center space-x-2 shrink-0 text-xs">
                      <span className="font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                        ⏱ {formatMinutesUz(taskMinutes)}
                      </span>
                      <span
                        className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200"
                        title="8 soatlik umumiy kunlik normaning necha foizini egallashi"
                      >
                        {taskSharePercent}% ish kuni ulushi
                      </span>
                      {task.isCompleted && (
                        <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                          ✓ Bajarilgan
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Steps (Amallar) List */}
                  {steps.length > 0 ? (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1.5 bg-slate-50/60 p-2.5 rounded-lg">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
                        <span className="flex items-center gap-1">
                          <CheckCheck className="w-3.5 h-3.5 text-blue-600" />
                          Kerakli amallar ro'yxati ({completedCount}/{steps.length}):
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Amalni bosib bajarilgan deb belgilashingiz mumkin
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                        {steps.map((step, idx) => (
                          <div
                            key={step.id || idx}
                            onClick={() => onToggleStep && onToggleStep(task.id, step.id)}
                            className={`flex items-center justify-between p-2 rounded-md border text-xs cursor-pointer transition-all ${
                              step.completed
                                ? "bg-emerald-50/80 border-emerald-200 text-emerald-900 line-through opacity-80"
                                : "bg-white border-slate-200 hover:border-blue-300 text-slate-800"
                            }`}
                          >
                            <div className="flex items-center space-x-2 min-w-0 pr-2">
                              <input
                                type="checkbox"
                                checked={step.completed}
                                onChange={() => {}} // handled by parent onClick
                                className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0"
                              />
                              <span className="truncate">{step.text}</span>
                            </div>

                            {step.estimatedMinutes && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                step.completed ? "bg-emerald-200/70 text-emerald-900" : "bg-blue-50 text-blue-700"
                              }`}>
                                {step.estimatedMinutes} daq
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic pt-1 pl-1">
                      (Ushbu vazifa uchun alohida kichik amallar belgilanmagan)
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
