import React, { useState } from "react";
import { Task, TaskPriority } from "../types";
import { TaskTypeStat, TaskGroupStat, TypeAnalyticsResult } from "../services/typeAnalytics";
import { formatMinutesUz } from "../services/workload";
import { formatDateUz, formatCreatedAtUz, getTaskOverdueRolloverInfo } from "../services/storage";
import {
  Tag,
  Clock,
  CheckCircle2,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  AlertTriangle,
  Zap,
  ListTodo,
  TrendingUp,
  Filter,
  CalendarPlus
} from "lucide-react";

// =========================================================================
// 1. TEPADA KO'RSATILADIGAN TEZKOR ISH TURLARI TAQSIMOTI (Top Summary)
// =========================================================================

interface TaskTypeTopSummaryProps {
  analytics: TypeAnalyticsResult;
  selectedPriorityFilter?: string | null;
  onSelectPriorityFilter?: (priority: string | null) => void;
  periodLabel: string; // e.g. "Bugun", "Shu oy", "Oraliq"
}

export const TaskTypeTopSummary: React.FC<TaskTypeTopSummaryProps> = ({
  analytics,
  selectedPriorityFilter,
  onSelectPriorityFilter,
  periodLabel,
}) => {
  const { activeTypeStats, activeGroupStats, totalMinutes, totalTasks } = analytics;

  if (totalTasks === 0) {
    return null;
  }

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-slate-200/90 space-y-3.5 shadow-2xs">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Tag className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900">
              Ish Turlari Bo'yicha Taqsimot ({periodLabel})
            </h4>
            <p className="text-[11px] text-slate-500">
              Soliq, Takrorlanmas (Muhim/O'rtacha/Past) va Ichki hisobotlar bo'yicha yuklama
            </p>
          </div>
        </div>

        {/* Quick filter helper text */}
        {onSelectPriorityFilter && (
          <div className="flex items-center space-x-1.5 self-start sm:self-auto">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Filtr:
            </span>
            {selectedPriorityFilter && (
              <button
                type="button"
                onClick={() => onSelectPriorityFilter(null)}
                className="px-2 py-0.5 rounded-md bg-rose-100 hover:bg-rose-200 text-rose-700 text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>Tozalash (Barchasi)</span>
                <span>✕</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Multi-segment Proportional Distribution Bar */}
      {totalMinutes > 0 && activeTypeStats.length > 0 && (
        <div className="space-y-1.5">
          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex shadow-inner">
            {activeTypeStats.map((item) => (
              <div
                key={item.priority}
                className={`${item.barColor} h-full transition-all`}
                style={{ width: `${Math.max(2, item.minutesPercentageOfTotal)}%` }}
                title={`${item.label}: ${formatMinutesUz(item.totalMinutes)} (${item.minutesPercentageOfTotal}%)`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Interactive Quick Type Cards / Filter Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 pt-1">
        {activeTypeStats.map((item) => {
          const isSelected = selectedPriorityFilter === item.priority;
          return (
            <button
              key={item.priority}
              type="button"
              onClick={() => {
                if (onSelectPriorityFilter) {
                  onSelectPriorityFilter(isSelected ? null : item.priority);
                }
              }}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? "ring-2 ring-blue-500 bg-white shadow-sm border-blue-500"
                  : `${item.badgeBg} ${item.badgeBorder} hover:shadow-2xs`
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="flex items-center space-x-1 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${item.dotColor}`} />
                  <span className={`text-[11px] font-bold truncate ${item.badgeText}`}>
                    {item.shortLabel}
                  </span>
                </span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-white/80 text-slate-700 shadow-2xs">
                  {item.tasksCount} ta
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-1 mt-0.5">
                <span className="text-xs font-black text-slate-900">
                  {formatMinutesUz(item.totalMinutes)}
                </span>
                <span className="text-[10px] font-bold text-slate-500">
                  {item.minutesPercentageOfTotal}%
                </span>
              </div>

              {/* Completion status mini note */}
              <div className="flex items-center justify-between text-[9px] text-slate-500 font-semibold mt-1 pt-1 border-t border-slate-200/50">
                <span className="text-emerald-700">✓ {item.completedTasksCount}</span>
                <span className="text-slate-500">⏳ {item.pendingTasksCount}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// =========================================================================
// 2. PASTDA KO'RSATILADIGAN BATAFSIL ISH TURLARI TAHLILI (Detailed Bottom Section)
// =========================================================================

interface TaskTypeDetailedSectionProps {
  analytics: TypeAnalyticsResult;
  periodTitle: string; // e.g. "Kunlik", "Oylik", "Maxsus oraliq"
  onOpenTaskDetails?: (task: Task) => void;
}

export const TaskTypeDetailedSection: React.FC<TaskTypeDetailedSectionProps> = ({
  analytics,
  periodTitle,
  onOpenTaskDetails,
}) => {
  const { activeTypeStats, activeGroupStats, totalTasks, totalMinutes } = analytics;
  const [expandedPriority, setExpandedPriority] = useState<TaskPriority | null>(null);

  if (totalTasks === 0) {
    return (
      <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-400">
        Ushbu davrda ish turlari bo'yicha vazifalar mavjud emas
      </div>
    );
  }

  const toggleExpand = (p: TaskPriority) => {
    setExpandedPriority((prev) => (prev === p ? null : p));
  };

  return (
    <div className="border border-slate-200 rounded-2xl bg-white shadow-2xs overflow-hidden">
      {/* Section Header */}
      <div className="p-4 sm:p-5 bg-slate-50/90 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm shadow-purple-500/20">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              {periodTitle} Ish Turlari Bo'yicha Chuqur Tahlil & Natijadorlik
            </h3>
            <p className="text-[11px] text-slate-500">
              Soliq, Takrorlanmas muhim/o'rtacha va Ichki hisobotlar bo'yicha aniq taqsimot va amallar
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-semibold text-slate-600">
          <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 shadow-2xs">
            Jami: <strong className="text-slate-900">{activeTypeStats.length}</strong> xil ish turi
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-indigo-700 shadow-2xs">
            {formatMinutesUz(totalMinutes)}
          </span>
        </div>
      </div>

      {/* Main Breakdown Cards Grid */}
      <div className="p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeTypeStats.map((stat) => {
            const isExpanded = expandedPriority === stat.priority;

            return (
              <div
                key={stat.priority}
                className={`rounded-2xl border transition-all flex flex-col justify-between ${stat.badgeBg} ${stat.badgeBorder} shadow-2xs hover:shadow-xs`}
              >
                {/* Card Top */}
                <div className="p-4 space-y-3">
                  {/* Badge & Share */}
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-white/90 border border-slate-200 shadow-2xs">
                      <span className={`w-2 h-2 rounded-full ${stat.dotColor}`} />
                      <span className={`text-xs font-bold ${stat.badgeText}`}>
                        {stat.label}
                      </span>
                    </span>
                    <span className="text-xs font-black text-slate-800 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200/60">
                      {stat.minutesPercentageOfTotal}% ulush
                    </span>
                  </div>

                  {/* Primary Metrics */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="p-2.5 rounded-xl bg-white/80 border border-slate-200/70">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Vazifalar Soni
                      </div>
                      <div className="text-lg font-black text-slate-900 mt-0.5">
                        {stat.tasksCount} <span className="text-xs font-medium text-slate-500">ta</span>
                      </div>
                      <div className="text-[10px] font-semibold text-slate-600 mt-1 flex items-center justify-between">
                        <span className="text-emerald-700">✓ {stat.completedTasksCount}</span>
                        <span className="text-slate-500">⏳ {stat.pendingTasksCount}</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/80 border border-slate-200/70">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Jami Ish Vaqti
                      </div>
                      <div className="text-lg font-black text-slate-900 mt-0.5">
                        {formatMinutesUz(stat.totalMinutes)}
                      </div>
                      <div className="text-[10px] font-semibold text-slate-600 mt-1 flex items-center justify-between">
                        <span className="text-emerald-700">✓ {formatMinutesUz(stat.completedMinutes)}</span>
                        <span className="text-slate-500">⏳ {formatMinutesUz(stat.pendingMinutes)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bars for Completion & Steps */}
                  <div className="space-y-2 pt-1">
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
                        <span>Bajarilish darajasi:</span>
                        <span className="font-bold text-slate-900">{stat.taskCompletionPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${stat.barColor} rounded-full transition-all`}
                          style={{ width: `${stat.taskCompletionPercent}%` }}
                        />
                      </div>
                    </div>

                    {stat.totalSteps > 0 && (
                      <div className="text-[10px] text-slate-500 font-medium flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3 text-indigo-500" />
                          Amallar: {stat.completedSteps} / {stat.totalSteps}
                        </span>
                        <span className="font-semibold text-indigo-700">
                          {stat.stepsCompletionPercent}% amal bajarildi
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Bottom: Accordion trigger for Task List */}
                <div className="p-2.5 bg-white/60 border-t border-slate-200/80 rounded-b-2xl">
                  <button
                    type="button"
                    onClick={() => toggleExpand(stat.priority)}
                    className="w-full py-1.5 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/90 text-xs font-bold text-slate-700 flex items-center justify-between transition-colors cursor-pointer shadow-2xs"
                  >
                    <span>
                      Vazifalar ro'yxati ({stat.tasksCount} ta)
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </button>

                  {/* Expandable Task List */}
                  {isExpanded && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200 space-y-1.5 max-h-60 overflow-y-auto pr-1">
                      {stat.tasks.map((t, idx) => {
                        const rollover = getTaskOverdueRolloverInfo(t);
                        return (
                          <div
                            key={t.id}
                            onClick={() => onOpenTaskDetails && onOpenTaskDetails(t)}
                            className={`p-2 rounded-lg border text-left text-xs transition-colors ${
                              t.isCompleted
                                ? "bg-slate-50 border-slate-200 text-slate-500"
                                : rollover
                                ? "bg-amber-50/40 border-amber-300 ring-1 ring-amber-400/30 text-slate-900"
                                : "bg-white border-slate-200 text-slate-800 hover:border-slate-300"
                            } ${onOpenTaskDetails ? "cursor-pointer" : ""}`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <div className="flex items-start space-x-1.5 min-w-0">
                                <span className="text-[10px] font-bold text-slate-400 mt-0.5">
                                  {idx + 1}.
                                </span>
                                <div className="min-w-0">
                                  <p
                                    className={`font-semibold truncate ${
                                      t.isCompleted ? "line-through text-slate-400" : "text-slate-900"
                                    }`}
                                  >
                                    {t.title}
                                  </p>
                                  <div className="text-[10px] text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                                    {rollover && !t.isCompleted && (
                                      <span
                                        className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs shrink-0"
                                        title={rollover.detailedNotice}
                                      >
                                        <AlertTriangle className="w-2.5 h-2.5 mr-0.5 text-amber-600 shrink-0" />
                                        Bajarilmay o'tgan ({rollover.timesRolled}x)
                                      </span>
                                    )}
                                    <span>📅 {t.dueDate}</span>
                                    {t.dueTime && <span>⏰ {t.dueTime}</span>}
                                    {t.steps && t.steps.length > 0 && (
                                      <span className="text-indigo-600 font-medium">
                                        • {t.steps.filter((s) => s.completed).length}/{t.steps.length} amal
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                {t.isCompleted ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    ✓ Bajarildi
                                  </span>
                                ) : rollover ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs">
                                    Kechikkan ({rollover.timesRolled}x)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                                    Kutilmoqda
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Yaratilgan vaqti */}
                            <div className="mt-1.5 pt-1 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-500 font-medium">
                              <span className="flex items-center">
                                <CalendarPlus className="w-2.5 h-2.5 mr-1 text-slate-400 shrink-0" />
                                Yaratilgan: <strong className="text-slate-700 ml-1 font-semibold">{formatCreatedAtUz(t.createdAt, t.id)}</strong>
                              </span>
                              {t.createdBy && (
                                <span className="text-[9px] text-slate-400">
                                  {t.createdBy === "admin" ? "admin" : t.createdBy}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
