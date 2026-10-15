import React, { useState } from "react";
import { Task, TaskStep } from "../types";
import { getPriorityBadge } from "./TaskCard";
import { formatDateUz, getTaskOverdueRolloverInfo } from "../services/storage";
import { StepCompleteModal } from "./StepCompleteModal";
import {
  Clock,
  Plus,
  CheckCircle2,
  CalendarClock,
  AlertTriangle,
  Layers,
  ChevronRight,
  MoreVertical,
  Edit2,
  Trash2,
  Check
} from "lucide-react";

interface HourlyTimelineProps {
  date: string;
  tasks: Task[];
  onOpenHourReschedule: (task: Task) => void;
  onOpenDateReschedule: (task: Task) => void;
  onOpenCompleteModal: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTaskAtHour: (hour: string) => void;
  onToggleStep?: (
    taskId: string,
    stepId: string,
    actualMinutes?: number,
    completeEntireTask?: boolean
  ) => void;
}

const HOURS_RANGE = [
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00",
  "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"
];

export const HourlyTimeline: React.FC<HourlyTimelineProps> = ({
  date,
  tasks,
  onOpenHourReschedule,
  onOpenDateReschedule,
  onOpenCompleteModal,
  onEditTask,
  onDeleteTask,
  onAddTaskAtHour,
  onToggleStep,
}) => {
  const [selectedStepModal, setSelectedStepModal] = useState<{
    task: Task;
    step: TaskStep;
  } | null>(null);

  // Filter tasks for this date
  const dayTasks = tasks.filter((t) => t.dueDate === date);

  // Group by hour
  const tasksByHour: Record<string, Task[]> = {};
  const unassignedTasks: Task[] = [];

  dayTasks.forEach((t) => {
    if (t.dueTime) {
      // Normalize to hour slot or match exact HH:00
      const hourPart = t.dueTime.split(":")[0];
      const slot = `${hourPart.padStart(2, "0")}:00`;
      if (!tasksByHour[slot]) tasksByHour[slot] = [];
      tasksByHour[slot].push(t);
    } else {
      unassignedTasks.push(t);
    }
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-50 to-blue-50/40 border-b border-slate-200/80 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">
              Interaktiv Soatlar Jadvali: {formatDateUz(date)}
            </h3>
            <p className="text-[11px] text-slate-500">
              Jami {dayTasks.length} ta vazifa • Bir vaqtga tushgan vazifalar kesishuvi avtomatik ko'rsatiladi
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onAddTaskAtHour("09:00")}
          className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Vazifa qo'shish</span>
        </button>
      </div>

      {/* Unassigned time tasks if any */}
      {unassignedTasks.length > 0 && (
        <div className="p-3 bg-amber-50/70 border-b border-amber-200/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-900 flex items-center">
              <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" />
              Soati belgilanmagan vazifalar ({unassignedTasks.length}):
            </span>
            <span className="text-[10px] text-amber-700">
              Soat belgilash uchun "Soatni ko'chirish" tugmasini bosing
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {unassignedTasks.map((task) => {
              const rolloverInfo = getTaskOverdueRolloverInfo(task);
              return (
                <div
                  key={task.id}
                  className={`p-2.5 rounded-xl border text-xs bg-white transition-all flex flex-col justify-between ${
                    task.isCompleted
                      ? "border-emerald-200 bg-emerald-50/40"
                      : rolloverInfo
                      ? "border-amber-300 bg-amber-50/25 ring-1 ring-amber-400/30"
                      : "border-slate-200 shadow-2xs hover:border-slate-300"
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getPriorityBadge(task.priority).bg}`}>
                        {task.priority.split("(")[0]}
                      </span>
                      {rolloverInfo && (
                        <span
                          className="text-[10px] font-black text-amber-950 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded flex items-center gap-0.5"
                          title={rolloverInfo.detailedNotice}
                        >
                          <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                          {rolloverInfo.timesRolled}x kechikkan
                        </span>
                      )}
                      {task.isCompleted && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                          Bajarildi
                        </span>
                      )}
                    </div>
                    <div className={`font-bold text-slate-900 line-clamp-1 ${task.isCompleted ? "line-through text-slate-500" : ""}`}>
                      {task.title}
                    </div>
                  </div>

                <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => onOpenHourReschedule(task)}
                    className="inline-flex items-center text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                    title="Soat belgilash"
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    Soat qo'yish
                  </button>

                  <div className="flex items-center space-x-1">
                    {!task.isCompleted && (
                      <button
                        type="button"
                        onClick={() => onOpenCompleteModal(task)}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                        title="Bajarildi deb belgilash"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onOpenDateReschedule(task)}
                      className="p-1 text-amber-600 hover:bg-amber-50 rounded cursor-pointer"
                      title="Boshqa kunga ko'chirish"
                    >
                      <CalendarClock className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* Hourly Timeline Rows */}
      <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
        {HOURS_RANGE.map((hour) => {
          const hourTasks = tasksByHour[hour] || [];
          const hasOverlap = hourTasks.length > 1;

          return (
            <div
              key={hour}
              className={`p-2.5 sm:p-3 transition-colors flex items-start gap-2 sm:gap-4 ${
                hourTasks.length > 0 ? "bg-slate-50/50 hover:bg-blue-50/20" : "hover:bg-slate-50/80"
              }`}
            >
              {/* Hour Column */}
              <div className="w-14 sm:w-16 shrink-0 pt-1">
                <div className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-slate-100 border border-slate-200 text-center">
                  <span className="text-xs sm:text-sm font-extrabold text-slate-800">
                    {hour}
                  </span>
                  <span className="text-[9px] text-slate-400 uppercase font-semibold">
                    vaqt
                  </span>
                </div>
              </div>

              {/* Tasks in this hour */}
              <div className="flex-1 min-w-0">
                {hourTasks.length === 0 ? (
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-xs text-slate-400 italic">
                      Rejalashtirilgan vazifa yo'q
                    </span>
                    <button
                      type="button"
                      onClick={() => onAddTaskAtHour(hour)}
                      className="opacity-60 hover:opacity-100 text-slate-500 hover:text-blue-600 p-1 rounded-lg hover:bg-slate-200/60 transition-all text-xs flex items-center space-x-1 cursor-pointer"
                      title={`${hour} ga vazifa qo'shish`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span className="text-[11px] hidden sm:inline">Qo'shish</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Overlap notice tag */}
                    {hasOverlap && (
                      <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300">
                        <Layers className="w-3 h-3 text-amber-700" />
                        <span>Kesishuv: {hourTasks.length} ta vazifa bir vaqtda</span>
                      </div>
                    )}

                    {/* Task cards side-by-side or stacked */}
                    <div className={`grid gap-2 ${
                      hasOverlap
                        ? "grid-cols-1 md:grid-cols-2"
                        : "grid-cols-1"
                    }`}>
                      {hourTasks.map((task) => {
                        const priorityInfo = getPriorityBadge(task.priority);
                        const completedSteps = task.steps?.filter((s) => s.completed).length || 0;
                        const totalSteps = task.steps?.length || 0;
                        const rolloverInfo = getTaskOverdueRolloverInfo(task);

                        return (
                          <div
                            key={task.id}
                            className={`p-2.5 sm:p-3 rounded-xl border transition-all ${
                              task.isCompleted
                                ? "bg-emerald-50/60 border-emerald-200"
                                : rolloverInfo
                                ? "bg-amber-50/25 border-amber-300 ring-1 ring-amber-400/30 shadow-xs"
                                : hasOverlap
                                ? "bg-white border-blue-300 shadow-xs hover:border-blue-400 hover:shadow-sm"
                                : "bg-white border-slate-200/90 shadow-2xs hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-1 mb-1">
                                  {rolloverInfo && (
                                    <span
                                      className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-100 text-amber-950 border border-amber-300 text-[10px] font-black"
                                      title={rolloverInfo.detailedNotice}
                                    >
                                      <AlertTriangle className="w-2.5 h-2.5 mr-0.5 text-amber-600" />
                                      Bajarilmay o'tgan ({rolloverInfo.timesRolled}x)
                                    </span>
                                  )}

                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${priorityInfo.bg}`}>
                                    {priorityInfo.label}
                                  </span>

                                  {task.dueTime && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                                      <Clock className="w-2.5 h-2.5 mr-0.5" />
                                      {task.dueTime}
                                    </span>
                                  )}

                                  {task.estimatedDuration && (
                                    <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                                      ⏱ {task.estimatedDuration} daq
                                    </span>
                                  )}

                                  {task.isCompleted && (
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                      Bajarildi
                                    </span>
                                  )}

                                  {/* Prominent Quick Tick Button */}
                                  <button
                                    type="button"
                                    onClick={() => onOpenCompleteModal(task)}
                                    className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                                      task.isCompleted
                                        ? "bg-emerald-100 border-emerald-300 text-emerald-800 hover:bg-emerald-200"
                                        : "bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-700 shadow-2xs active:scale-95"
                                    }`}
                                    title={task.isCompleted ? "Bajarilgan" : "Vazifani bajarildi deb belgilash va vaqtni kiritish"}
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>{task.isCompleted ? "Bajarildi" : "Tick (Bajarildi)"}</span>
                                  </button>
                                </div>

                                <h4 className={`text-xs sm:text-sm font-bold text-slate-900 leading-snug ${
                                  task.isCompleted ? "line-through text-slate-400" : ""
                                }`}>
                                  {task.title}
                                </h4>

                                {totalSteps > 0 && (
                                  <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                                      <span>Amallar: {completedSteps}/{totalSteps}</span>
                                      <div className="flex items-center space-x-2">
                                        <span className="text-[10px] text-slate-400">
                                          {Math.round((completedSteps / totalSteps) * 100)}%
                                        </span>
                                        {!task.isCompleted && (
                                          <button
                                            type="button"
                                            onClick={() => onOpenCompleteModal(task)}
                                            className="text-[9px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 cursor-pointer"
                                            title="Barchasini yakunlash"
                                          >
                                            Barchasini tick qilish
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      {task.steps?.map((step) => (
                                        <div
                                          key={step.id}
                                          onClick={() => {
                                            if (!step.completed) {
                                              setSelectedStepModal({ task, step });
                                            } else {
                                              onToggleStep && onToggleStep(task.id, step.id);
                                            }
                                          }}
                                          className={`flex items-center justify-between px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
                                            step.completed
                                              ? "bg-emerald-50 text-emerald-800 line-through opacity-85"
                                              : "bg-slate-50 hover:bg-blue-50/50 hover:border-blue-200 text-slate-700 border border-transparent"
                                          }`}
                                        >
                                          <div className="flex items-center space-x-1.5 min-w-0 pr-1">
                                            <input
                                              type="checkbox"
                                              checked={step.completed}
                                              onChange={() => {}}
                                              className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer shrink-0"
                                            />
                                            <span className="truncate text-[11px] font-medium">{step.text}</span>
                                          </div>
                                          <div className="flex items-center space-x-1 shrink-0">
                                            {step.completed && typeof step.actualMinutes === "number" && (
                                              <span className="text-[9px] font-extrabold text-emerald-800 bg-emerald-100 px-1 py-0.5 rounded border border-emerald-200">
                                                ⏱ {step.actualMinutes}m
                                              </span>
                                            )}
                                            {step.estimatedMinutes && (
                                              <span className="text-[9px] font-bold text-slate-500 bg-white px-1 py-0.5 rounded border border-slate-200">
                                                {step.estimatedMinutes}m
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Action buttons */}
                              <div className="flex items-center space-x-1 shrink-0">
                                {/* Hour Reschedule Button */}
                                <button
                                  type="button"
                                  onClick={() => onOpenHourReschedule(task)}
                                  className="p-1 sm:px-2 sm:py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 transition-colors flex items-center space-x-1 cursor-pointer"
                                  title="Boshqa soatga o'tkazish"
                                >
                                  <Clock className="w-3 h-3" />
                                  <span className="hidden sm:inline text-[11px]">Soatni o'zgartirish</span>
                                </button>

                                {/* Date Reschedule Button */}
                                <button
                                  type="button"
                                  onClick={() => onOpenDateReschedule(task)}
                                  className="p-1 sm:px-2 sm:py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold border border-amber-200 transition-colors flex items-center space-x-1 cursor-pointer"
                                  title="Boshqa kunga ko'chirish"
                                >
                                  <CalendarClock className="w-3 h-3" />
                                  <span className="hidden sm:inline text-[11px]">Kunga ko'chirish</span>
                                </button>

                                {/* Complete Button */}
                                {!task.isCompleted && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenCompleteModal(task)}
                                    className="p-1 sm:p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                                    title="Bajarildi deb belgilash"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {/* Edit Button */}
                                <button
                                  type="button"
                                  onClick={() => onEditTask(task)}
                                  className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                  title="Tahrirlash"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Step Complete Modal */}
      {selectedStepModal && (
        <StepCompleteModal
          isOpen={!!selectedStepModal}
          task={selectedStepModal.task}
          step={selectedStepModal.step}
          onClose={() => setSelectedStepModal(null)}
          onConfirm={(taskId, stepId, actualMinutes, completeEntireTask) => {
            if (onToggleStep) {
              onToggleStep(taskId, stepId, actualMinutes, completeEntireTask);
            }
          }}
        />
      )}
    </div>
  );
};
