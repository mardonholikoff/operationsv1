import React, { useState } from "react";
import { Task, TaskPriority } from "../types";
import { formatDateUz, getTodayString, formatTaskScheduleDisplay, getCreatorLabel } from "../services/storage";
import {
  CheckCircle2,
  Calendar,
  Repeat,
  CalendarClock,
  Clock,
  Edit2,
  Trash2,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  History,
  Info,
  ArrowRight,
  UserCheck,
  ShieldCheck
} from "lucide-react";

interface TaskCardProps {
  task: Task;
  onToggleStep: (taskId: string, stepId: string) => void;
  onOpenCompleteModal: (task: Task) => void;
  onOpenRescheduleModal: (task: Task) => void;
  onOpenHourReschedule?: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export function getPriorityBadge(priority: TaskPriority) {
  switch (priority) {
    case "Soliq(Muhim)":
      return {
        bg: "bg-rose-50 border-rose-200 text-rose-800",
        dot: "bg-rose-600",
        label: "Soliq (Muhim)",
      };
    case "Ichki hisobot(Muhim)":
      return {
        bg: "bg-amber-50 border-amber-200 text-amber-800",
        dot: "bg-amber-600",
        label: "Ichki hisobot (Muhim)",
      };
    case "Ichki hisobot(O'rtacha)":
      return {
        bg: "bg-blue-50 border-blue-200 text-blue-800",
        dot: "bg-blue-600",
        label: "Ichki hisobot (O'rtacha)",
      };
    case "Ichki hisobot(Past)":
      return {
        bg: "bg-slate-100 border-slate-200 text-slate-700",
        dot: "bg-slate-500",
        label: "Ichki hisobot (Past)",
      };
    case "Takrorlanmas ish(Muhim)":
      return {
        bg: "bg-purple-50 border-purple-200 text-purple-800",
        dot: "bg-purple-600",
        label: "Takrorlanmas ish (Muhim)",
      };
    case "Takrorlanmas ish(O'rtacha)":
      return {
        bg: "bg-indigo-50 border-indigo-200 text-indigo-800",
        dot: "bg-indigo-600",
        label: "Takrorlanmas ish (O'rtacha)",
      };
    case "Takrorlanmas ish(Past)":
      return {
        bg: "bg-emerald-50 border-emerald-200 text-emerald-800",
        dot: "bg-emerald-600",
        label: "Takrorlanmas ish (Past)",
      };
    default:
      return {
        bg: "bg-slate-50 border-slate-200 text-slate-700",
        dot: "bg-slate-500",
        label: priority,
      };
  }
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggleStep,
  onOpenCompleteModal,
  onOpenRescheduleModal,
  onOpenHourReschedule,
  onEditTask,
  onDeleteTask,
}) => {
  const [showSteps, setShowSteps] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const todayStr = getTodayString();
  const isOverdue = !task.isCompleted && task.dueDate < todayStr;
  const isToday = !task.isCompleted && task.dueDate === todayStr;

  const priorityMeta = getPriorityBadge(task.priority);
  const steps = task.steps || [];
  const completedStepsCount = steps.filter((s) => s.completed).length;
  const totalStepsCount = steps.length;
  const progressPercent =
    totalStepsCount > 0 ? Math.round((completedStepsCount / totalStepsCount) * 100) : 0;

  const creatorInfo = getCreatorLabel(task.createdBy);

  const scheduleInfo = formatTaskScheduleDisplay(task);

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 shadow-xs hover:shadow-md ${
        task.isCompleted
          ? "bg-slate-50/70 border-slate-200 opacity-90"
          : isOverdue
          ? "bg-rose-50/30 border-rose-200 ring-1 ring-rose-300/40"
          : isToday
          ? "bg-white border-blue-200 ring-2 ring-blue-500/10"
          : "bg-white border-slate-200/90"
      } p-4 sm:p-5 flex flex-col justify-between`}
    >
      <div>
        {/* Top Badges: Priority, Schedule Type, Time, Duration, Date Tag */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Priority Badge */}
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${priorityMeta.bg}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${priorityMeta.dot}`} />
              {priorityMeta.label}
            </span>

            {/* Time Badge if set */}
            {task.dueTime && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                <Clock className="w-3 h-3 mr-1 text-blue-600" />
                {task.dueTime}
              </span>
            )}

            {/* Estimated Duration Badge if set */}
            {task.estimatedDuration && (
              <span className="inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                ⏱ {task.estimatedDuration} daq
              </span>
            )}

            {/* Schedule Type */}
            {task.scheduleType === "monthly" ? (
              <span className="inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <Repeat className="w-3 h-3 mr-1" />
                {task.dateMode === "range"
                  ? `Har oy (${task.monthlyStartDay}-${task.monthlyEndDay}-kunlar)`
                  : `Har oy (${task.monthlyDay || 15}-kun)`}
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                <Clock className="w-3 h-3 mr-1" />
                {task.dateMode === "range" ? "Muddat oralig'ida" : "Bir martalik"}
              </span>
            )}

            {/* Reschedule Badge if moved */}
            {task.history && task.history.length > 0 && (
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                title="Ko'chirish tarixini ko'rish"
              >
                <History className="w-3 h-3 mr-1 text-amber-600" />
                Ko'chirilgan ({task.history.length})
              </button>
            )}
          </div>

          {/* Due date urgency tag */}
          <div>
            {task.isCompleted ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                <CheckCheck className="w-3.5 h-3.5 mr-1" /> Bajarildi
              </span>
            ) : isOverdue ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Muddati o'tgan
              </span>
            ) : isToday ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
                Bugungi vazifa
              </span>
            ) : (
              <span className="text-xs text-slate-500 font-medium">
                {formatDateUz(task.dueDate)}
              </span>
            )}
          </div>
        </div>

        {/* Task Title */}
        <h3
          className={`text-base font-bold tracking-tight mb-2 ${
            task.isCompleted ? "text-slate-500 line-through" : "text-slate-900"
          }`}
        >
          {task.title}
        </h3>

        {/* Date Range detail banner if range mode */}
        {task.dateMode === "range" && (
          <div className="mb-2.5 px-2.5 py-1.5 bg-indigo-50/80 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex items-center">
            <ArrowRight className="w-3.5 h-3.5 mr-1.5 text-indigo-600 shrink-0" />
            <span>
              {scheduleInfo.detail}
            </span>
          </div>
        )}

        {/* Reschedule / Rollover Alert notice */}
        {task.autoRolledCount && task.autoRolledCount > 0 ? (
          <div className="mb-3 p-2 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-center">
            <Info className="w-3.5 h-3.5 mr-1.5 text-amber-600 shrink-0" />
            <span>
              Avtomatik keyingi kunga ko'chirilgan ({task.autoRolledCount} marta kechiktirilgan)
            </span>
          </div>
        ) : null}

        {/* History Expandable Panel */}
        {showHistory && task.history && task.history.length > 0 && (
          <div className="mb-3 p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-xs space-y-1.5 animate-fadeIn">
            <div className="font-bold text-amber-900 flex items-center justify-between">
              <span>Ko'chirish Tarixi:</span>
              <button
                onClick={() => setShowHistory(false)}
                className="text-[10px] text-amber-700 underline"
              >
                Yopish
              </button>
            </div>
            {task.history.map((h, idx) => (
              <div key={h.id || idx} className="text-amber-800 text-[11px] pb-1 border-b border-amber-200/60 last:border-0">
                <span className="font-medium">{h.oldDate} ➔ {h.newDate}</span>
                <p className="italic text-amber-900">"{h.reason}"</p>
                <span className="text-[10px] text-amber-600">({h.operator} - {formatDateUz(h.rescheduledAt.split("T")[0])})</span>
              </div>
            ))}
          </div>
        )}

        {/* Completion Note if completed */}
        {task.isCompleted && task.completionNote && (
          <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
            <span className="font-bold">Bajarish izohi:</span> {task.completionNote}
          </div>
        )}

        {/* Action Steps (Checklist) */}
        {steps.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600">
                Kerakli amallar ({completedStepsCount}/{totalStepsCount})
              </span>
              <button
                type="button"
                onClick={() => setShowSteps(!showSteps)}
                className="text-xs text-slate-400 hover:text-slate-600 flex items-center space-x-0.5"
              >
                <span>{showSteps ? "Yashirish" : "Ko'rsatish"}</span>
                {showSteps ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2.5">
              <div
                className={`h-full transition-all duration-300 ${
                  progressPercent === 100 ? "bg-emerald-500" : "bg-blue-600"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {showSteps && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {steps.map((step) => (
                  <label
                    key={step.id}
                    className={`flex items-start space-x-2 p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      step.completed ? "bg-slate-50 text-slate-400" : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={step.completed}
                      disabled={task.isCompleted}
                      onChange={() => onToggleStep(task.id, step.id)}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className={`flex-1 ${step.completed ? "line-through" : "font-medium"}`}>
                      {step.text}
                    </span>
                    {step.estimatedMinutes && (
                      <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                        {step.estimatedMinutes} daq
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card Bottom: Date info + Action buttons */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center text-xs text-slate-500">
          <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />
          <span>
            Muddat: <strong className="text-slate-800">{formatDateUz(task.dueDate)}</strong>
            {task.dueTime && (
              <span className="ml-1 text-blue-700 font-bold">({task.dueTime})</span>
            )}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-1.5 self-end sm:self-auto">
          {!task.isCompleted ? (
            <>
              {/* Bajarildi button */}
              <button
                id={`btn-complete-${task.id}`}
                onClick={() => onOpenCompleteModal(task)}
                className="inline-flex items-center px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                title="Bajarildi deb belgilash va izoh yozish"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Bajarildi
              </button>

              {/* Soatni ko'chirish */}
              {onOpenHourReschedule && (
                <button
                  type="button"
                  id={`btn-reschedule-hour-${task.id}`}
                  onClick={() => onOpenHourReschedule(task)}
                  className="inline-flex items-center px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-semibold transition-all cursor-pointer"
                  title="Soatni ko'chirish / o'zgartirish"
                >
                  <Clock className="w-3.5 h-3.5 mr-1 text-blue-600" />
                  Soat
                </button>
              )}

              {/* Boshqa kunga ko'chirish */}
              <button
                id={`btn-reschedule-${task.id}`}
                onClick={() => onOpenRescheduleModal(task)}
                className="inline-flex items-center px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold transition-all cursor-pointer"
                title="Boshqa kunga ko'chirish va sababini yozish"
              >
                <CalendarClock className="w-3.5 h-3.5 mr-1 text-amber-600" />
                Kun
              </button>
            </>
          ) : (
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              ✓ Bajarilgan
            </span>
          )}

          {/* Edit button */}
          <button
            onClick={() => onEditTask(task)}
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
            title="Tahrirlash"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          {/* Delete button */}
          <button
            onClick={() => onDeleteTask(task.id)}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            title="O'chirish"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* O'chmas Kirituvchi / Muallif Izohi (Doimiy pastki yorliq) */}
      <div className="mt-3 pt-2.5 border-t border-slate-100/90 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-1.5 min-w-0">
          {creatorInfo.isCustomAdmin ? (
            <span
              id={`task-creator-badge-${task.id}`}
              className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/90 shadow-2xs"
            >
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-purple-600 shrink-0" />
              <span>admin tomonidan qo'shilgan</span>
            </span>
          ) : (
            <span
              id={`task-creator-badge-${task.id}`}
              className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/90 shadow-2xs"
            >
              <UserCheck className="w-3.5 h-3.5 mr-1.5 text-blue-600 shrink-0" />
              <span>{creatorInfo.text}</span>
            </span>
          )}
        </div>

        <span className="text-[11px] text-slate-400 font-medium shrink-0">
          {task.createdAt ? formatDateUz(task.createdAt.split("T")[0]) : ""}
        </span>
      </div>
    </div>
  );
};
