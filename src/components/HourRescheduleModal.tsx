import React, { useState, useEffect } from "react";
import { Task } from "../types";
import { Clock, X, AlertCircle, Check, ArrowRight } from "lucide-react";

interface HourRescheduleModalProps {
  isOpen: boolean;
  task: Task | null;
  existingTasksOnDay?: Task[];
  onClose: () => void;
  onConfirmHourReschedule: (
    taskId: string,
    newTime: string,
    reason?: string,
    scope?: "temporary" | "permanent"
  ) => void;
}

const COMMON_HOURS = [
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00",
  "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"
];

export const HourRescheduleModal: React.FC<HourRescheduleModalProps> = ({
  isOpen,
  task,
  existingTasksOnDay = [],
  onClose,
  onConfirmHourReschedule,
}) => {
  const [newTime, setNewTime] = useState<string>("09:00");
  const [reason, setReason] = useState<string>("");
  const [scope, setScope] = useState<"temporary" | "permanent">("temporary");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (task) {
      setNewTime(task.dueTime || "09:00");
      setReason("");
      setScope("temporary");
      setError("");
    }
  }, [task, isOpen]);

  if (!isOpen || !task) return null;

  const isRecurring = task.scheduleType !== "once";

  // Count how many tasks already exist at the selected hour
  const overlappingTasks = existingTasksOnDay.filter(
    (t) => t.id !== task.id && t.dueTime === newTime && !t.isCompleted
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTime) {
      setError("Iltimos, yangi soatni tanlang!");
      return;
    }

    onConfirmHourReschedule(
      task.id,
      newTime,
      reason.trim() || undefined,
      isRecurring ? scope : undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 sm:p-6 animate-fadeIn">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Boshqa Soatga O'tkazish
              </h3>
              <p className="text-xs text-slate-500">
                Vazifa boshlanish vaqtini yangilash
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-hour-reschedule"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Task info */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
            <div className="font-semibold text-slate-500">Vazifa nomi:</div>
            <div className="font-bold text-slate-900 text-sm">{task.title}</div>
            <div className="text-slate-600 flex items-center gap-1.5 pt-0.5">
              <span>Hozirgi vaqti:</span>
              <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {task.dueTime || "Belgilanmagan"}
              </span>
            </div>
          </div>

          {/* New Time Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Yangi Soatni Belgilang <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="time"
                id="input-hour-reschedule-time"
                required
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            {/* Quick hour buttons */}
            <div className="flex flex-wrap gap-1.5 mt-2 max-h-24 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200/80">
              {COMMON_HOURS.map((h) => {
                const countAtH = existingTasksOnDay.filter(
                  (t) => t.id !== task.id && t.dueTime === h && !t.isCompleted
                ).length;
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setNewTime(h)}
                    className={`px-2 py-1 text-xs rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                      newTime === h
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>{h}</span>
                    {countAtH > 0 && (
                      <span
                        className={`text-[10px] px-1 rounded-full ${
                          newTime === h
                            ? "bg-blue-800 text-blue-100"
                            : "bg-amber-100 text-amber-800 font-bold"
                        }`}
                        title={`${countAtH} ta mavjud vazifa`}
                      >
                        {countAtH}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Overlap notice */}
            {overlappingTasks.length > 0 && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 flex items-start space-x-1.5">
                <span className="font-bold">Eslatma:</span>
                <span>
                  Soat {newTime} da yana {overlappingTasks.length} ta vazifa mavjud. Vazifalar bir vaqtga chiroyli kesishuv shaklida qo'shiladi.
                </span>
              </div>
            )}
          </div>

          {/* Scope for recurring tasks */}
          {isRecurring && (
            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
              <div className="text-xs font-bold text-indigo-900">
                Takrorlanish bo'yicha qo'llash turi:
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className={`flex items-start p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                  scope === "temporary"
                    ? "bg-white border-indigo-500 text-indigo-950 font-bold shadow-xs ring-1 ring-indigo-400"
                    : "bg-white/60 border-indigo-200 text-slate-700"
                }`}>
                  <input
                    type="radio"
                    name="hour_reschedule_scope"
                    value="temporary"
                    checked={scope === "temporary"}
                    onChange={() => setScope("temporary")}
                    className="mt-0.5 mr-1.5 text-indigo-600"
                  />
                  <div>
                    <div className="leading-tight font-semibold">Vaqtinchalik</div>
                    <div className="text-[10px] text-slate-500 font-normal">
                      Faqat hozirgi kun uchun
                    </div>
                  </div>
                </label>

                <label className={`flex items-start p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                  scope === "permanent"
                    ? "bg-white border-indigo-500 text-indigo-950 font-bold shadow-xs ring-1 ring-indigo-400"
                    : "bg-white/60 border-indigo-200 text-slate-700"
                }`}>
                  <input
                    type="radio"
                    name="hour_reschedule_scope"
                    value="permanent"
                    checked={scope === "permanent"}
                    onChange={() => setScope("permanent")}
                    className="mt-0.5 mr-1.5 text-indigo-600"
                  />
                  <div>
                    <div className="leading-tight font-semibold">Doimiy</div>
                    <div className="text-[10px] text-slate-500 font-normal">
                      Barcha keyingi kunlar uchun
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Optional reason */}
          <div>
            <label
              htmlFor="hour-reschedule-reason"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
            >
              Ko'chirish Izohi <span className="text-slate-400 font-normal normal-case">(ixtiyoriy)</span>
            </label>
            <input
              type="text"
              id="hour-reschedule-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Masalan: Majlis cho'zildi / mijoz so'rovi..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              id="btn-confirm-hour-reschedule"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Soatni Saqlash</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
