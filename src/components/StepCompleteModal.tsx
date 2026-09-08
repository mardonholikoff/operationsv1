import React, { useState, useEffect } from "react";
import { Task, TaskStep } from "../types";
import {
  CheckCheck,
  X,
  Clock,
  TrendingDown,
  TrendingUp,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { formatMinutesUz } from "../services/workload";

interface StepCompleteModalProps {
  isOpen: boolean;
  task: Task | null;
  step: TaskStep | null;
  onClose: () => void;
  onConfirm: (
    taskId: string,
    stepId: string,
    actualMinutes?: number,
    completeEntireTask?: boolean
  ) => void;
}

export const StepCompleteModal: React.FC<StepCompleteModalProps> = ({
  isOpen,
  task,
  step,
  onClose,
  onConfirm,
}) => {
  const [actualMinutesInput, setActualMinutesInput] = useState<string>("");
  const [completeEntireTask, setCompleteEntireTask] = useState<boolean>(false);

  // Rejadagi vaqtni aniqlash
  const stepPlannedMinutes = step?.estimatedMinutes || 15;

  useEffect(() => {
    if (isOpen && step && task) {
      // Agar avval kiritilgan bo'lsa
      if (typeof step.actualMinutes === "number" && step.actualMinutes >= 0) {
        setActualMinutesInput(step.actualMinutes.toString());
      } else {
        setActualMinutesInput("");
      }

      // Agar bu amal oxirgi kutilayotgan amal bo'lsa
      const remainingOthers = (task.steps || []).filter(
        (s) => s.id !== step.id && !s.completed
      );
      setCompleteEntireTask(remainingOthers.length === 0);
    }
  }, [isOpen, task, step]);

  if (!isOpen || !task || !step) return null;

  const parsedActual =
    actualMinutesInput.trim() !== "" ? parseInt(actualMinutesInput, 10) : undefined;
  const isActualProvided =
    typeof parsedActual === "number" && !isNaN(parsedActual) && parsedActual >= 0;
  const actualMinutes = isActualProvided ? parsedActual : undefined;

  const diffMinutes =
    actualMinutes !== undefined ? stepPlannedMinutes - actualMinutes : 0;
  const isSaved = actualMinutes !== undefined && diffMinutes > 0;
  const isOver = actualMinutes !== undefined && diffMinutes < 0;
  const isExact = actualMinutes !== undefined && diffMinutes === 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(task.id, step.id, actualMinutes, completeEntireTask);
    onClose();
  };

  const quickPresets = [
    { label: "5 daq", val: 5 },
    { label: "10 daq", val: 10 },
    { label: "15 daq", val: 15 },
    { label: "20 daq", val: 20 },
    { label: "30 daq", val: 30 },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 sm:p-6 animate-fadeIn">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <CheckCheck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Amalni Bajarildi Deb Belgilash
              </h3>
              <p className="text-xs text-slate-500 truncate max-w-[240px]">
                {task.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Step Info Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Tanlangan amal:
            </div>
            <div className="text-sm font-extrabold text-slate-900 flex items-center justify-between gap-2">
              <span>{step.text}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold shrink-0">
                Reja: {formatMinutesUz(stepPlannedMinutes)}
              </span>
            </div>
          </div>

          {/* Actual Minutes input */}
          <div className="p-3.5 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 space-y-2.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="step-actual-minutes"
                className="text-xs font-bold text-slate-800 flex items-center"
              >
                <Clock className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                Amalda sarflangan vaqt (Ixtiyoriy)
              </label>
              <span className="text-[11px] text-slate-400 font-medium">daqiqa</span>
            </div>

            <div className="relative">
              <input
                type="number"
                id="step-actual-minutes"
                min="1"
                max="480"
                value={actualMinutesInput}
                onChange={(e) => setActualMinutesInput(e.target.value)}
                placeholder={`Masalan: ${Math.max(5, stepPlannedMinutes - 5)} (bo'sh qolsa reja olinadi)`}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 text-sm font-bold placeholder:font-normal placeholder:text-slate-400 transition-all bg-white"
              />
              {actualMinutes !== undefined && (
                <button
                  type="button"
                  onClick={() => setActualMinutesInput("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded hover:bg-slate-100 cursor-pointer"
                >
                  Tozalash
                </button>
              )}
            </div>

            {/* Quick presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-500 font-medium mr-1">
                Tezkor:
              </span>
              {quickPresets.map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => setActualMinutesInput(p.val.toString())}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                    actualMinutes === p.val
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setActualMinutesInput(stepPlannedMinutes.toString())}
                className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                  actualMinutes === stepPlannedMinutes
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                Rejadagidek ({stepPlannedMinutes}m)
              </button>
            </div>

            {/* Saved time impact notification */}
            {isSaved && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start space-x-2 text-emerald-900 text-xs">
                <TrendingDown className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-extrabold text-emerald-800">
                    ⏱ {diffMinutes} daqiqa vaqt tejaldi!
                  </div>
                  <div className="text-[11px] text-emerald-700 leading-tight">
                    Kunlik 8 soatlik me'yordan {diffMinutes} daqiqa avtomatik
                    chiqariladi va yuklama kamayadi.
                  </div>
                </div>
              </div>
            )}

            {isOver && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex items-start space-x-2 text-amber-900 text-xs">
                <TrendingUp className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-extrabold text-amber-800">
                    ⏱ {Math.abs(diffMinutes)} daqiqa ko'proq vaqt ketdi
                  </div>
                  <div className="text-[11px] text-amber-700 leading-tight">
                    Amaldagi sarf qilingan vaqt kunlik yuklamaga kiritiladi.
                  </div>
                </div>
              </div>
            )}

            {isExact && (
              <div className="p-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                ✓ Rejalashtirilgan {stepPlannedMinutes} daqiqa to'liq sarflandi.
              </div>
            )}
          </div>

          {/* Option to complete entire task */}
          <label className="flex items-start space-x-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={completeEntireTask}
              onChange={(e) => setCompleteEntireTask(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
            <div className="text-xs">
              <span className="font-bold text-slate-800">
                Ushbu amal bilan birga butun vazifani ham yakunlash
              </span>
              <p className="text-[11px] text-slate-500">
                Vazifa to'liq bajarildi deb belgilanadi va arxivlanadi.
              </p>
            </div>
          </label>

          {/* Action buttons */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center space-x-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Bajarildi deb saqlash</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
