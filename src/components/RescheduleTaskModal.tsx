import React, { useState, useEffect } from "react";
import { Task } from "../types";
import { CalendarClock, X, ArrowRight, AlertCircle, FileEdit, Clock, Calendar } from "lucide-react";
import { getTodayString, formatDateUz } from "../services/storage";

interface RescheduleTaskModalProps {
  isOpen: boolean;
  task: Task | null;
  existingTasksOnDate?: Task[];
  onClose: () => void;
  onConfirmReschedule: (
    taskId: string,
    newDate: string,
    reason: string,
    newTime?: string,
    scope?: "temporary" | "permanent"
  ) => void;
}

const COMMON_HOURS = [
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00",
  "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"
];

export const RescheduleTaskModal: React.FC<RescheduleTaskModalProps> = ({
  isOpen,
  task,
  existingTasksOnDate = [],
  onClose,
  onConfirmReschedule,
}) => {
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [reason, setReason] = useState("");
  const [scope, setScope] = useState<"temporary" | "permanent">("temporary");
  const [error, setError] = useState("");

  useEffect(() => {
    if (task) {
      // Default to tomorrow or today + 1
      const d = new Date();
      d.setDate(d.getDate() + 1);
      setNewDate(d.toISOString().split("T")[0]);
      setNewTime(task.dueTime || "09:00");
      setReason("");
      setScope("temporary");
      setError("");
    }
  }, [task, isOpen]);

  if (!isOpen || !task) return null;

  const isRecurring = task.scheduleType !== "once";

  const setQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setNewDate(d.toISOString().split("T")[0]);
  };

  // Count existing tasks on that new date at that time
  const existingAtSlot = existingTasksOnDate.filter(
    (t) => t.id !== task.id && t.dueDate === newDate && (!newTime || t.dueTime === newTime)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate) {
      setError("Yangi sanani tanlang!");
      return;
    }
    if (!reason.trim()) {
      setError("Boshqa kunga ko'chirish uchun majburiy izoh (sabab) yozilishi shart!");
      return;
    }

    onConfirmReschedule(
      task.id,
      newDate,
      reason.trim(),
      newTime.trim() || undefined,
      isRecurring ? scope : undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-5 sm:p-6 animate-fadeIn">
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <CalendarClock className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Boshqa Kunga O'tkazish
              </h3>
              <p className="text-xs text-slate-500">
                Vazifa sanasini, soatini o'zgartirish va sababini qayd etish
              </p>
            </div>
          </div>
          <button
            id="btn-close-reschedule-modal"
            type="button"
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
          {/* Current Task Details */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-xs font-semibold text-slate-500">Vazifa:</div>
            <div className="text-sm font-bold text-slate-900">{task.title}</div>
            <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
              <span className="font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                Hozirgi sana: {task.dueDate} ({formatDateUz(task.dueDate)})
              </span>
              {task.dueTime && (
                <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Soat: {task.dueTime}
                </span>
              )}
            </div>
          </div>

          {/* New Date Picker & Quick Options */}
          <div>
            <label
              htmlFor="new-reschedule-date"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center"
            >
              <Calendar className="w-3.5 h-3.5 mr-1 text-slate-500" />
              Yangi Bajarish Sanasi <span className="text-rose-500">*</span>
            </label>
            <input
              id="new-reschedule-date"
              type="date"
              required
              value={newDate}
              min={getTodayString()}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
            />

            {/* Quick date shortcuts */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <button
                type="button"
                onClick={() => setQuickDate(1)}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                Ertaga (+1 kun)
              </button>
              <button
                type="button"
                onClick={() => setQuickDate(2)}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                +2 kun
              </button>
              <button
                type="button"
                onClick={() => setQuickDate(7)}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                Keyingi hafta (+7 kun)
              </button>
            </div>
          </div>

          {/* Ko'chirilayotgan kundagi soatni aniqlash */}
          <div>
            <label
              htmlFor="new-reschedule-time"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center"
            >
              <Clock className="w-3.5 h-3.5 mr-1 text-slate-500" />
              O'sha Kundagi Soatini Aniqlash <span className="text-slate-400 font-normal normal-case">(ixtiyoriy, mavjud vazifalar ustiga ham qo'shilaveradi)</span>
            </label>
            <input
              id="new-reschedule-time"
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
            />

            {/* Quick hour buttons */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {COMMON_HOURS.slice(0, 7).map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setNewTime(h)}
                  className={`px-2 py-0.5 text-[11px] font-medium rounded-md border transition-all cursor-pointer ${
                    newTime === h
                      ? "bg-amber-600 text-white border-amber-600"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>

            {existingAtSlot.length > 0 && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-800">
                Ushbu kunda ({newDate}) {existingAtSlot.length} ta vazifa mavjud. Vazifa ularning ustiga ham muammosiz qo'shiladi.
              </div>
            )}
          </div>

          {/* Scope for recurring tasks */}
          {isRecurring && (
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
              <div className="text-xs font-bold text-amber-950">
                Takrorlanuvchi vazifa uchun ko'chirish turi:
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className={`flex items-start p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                  scope === "temporary"
                    ? "bg-white border-amber-500 text-amber-950 font-bold shadow-xs ring-1 ring-amber-400"
                    : "bg-white/70 border-amber-200 text-slate-700"
                }`}>
                  <input
                    type="radio"
                    name="date_reschedule_scope"
                    value="temporary"
                    checked={scope === "temporary"}
                    onChange={() => setScope("temporary")}
                    className="mt-0.5 mr-1.5 text-amber-600"
                  />
                  <div>
                    <div className="leading-tight font-semibold">Vaqtinchalik</div>
                    <div className="text-[10px] text-slate-500 font-normal">
                      Faqat hozirgi muddatni ko'chirish
                    </div>
                  </div>
                </label>

                <label className={`flex items-start p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                  scope === "permanent"
                    ? "bg-white border-amber-500 text-amber-950 font-bold shadow-xs ring-1 ring-amber-400"
                    : "bg-white/70 border-amber-200 text-slate-700"
                }`}>
                  <input
                    type="radio"
                    name="date_reschedule_scope"
                    value="permanent"
                    checked={scope === "permanent"}
                    onChange={() => setScope("permanent")}
                    className="mt-0.5 mr-1.5 text-amber-600"
                  />
                  <div>
                    <div className="leading-tight font-semibold">Butunlay</div>
                    <div className="text-[10px] text-slate-500 font-normal">
                      Jadvalni yangi kunga doimiy o'tkazish
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Mandatory Reason Input */}
          <div>
            <label
              htmlFor="reschedule-reason-input"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between"
            >
              <span className="flex items-center">
                <FileEdit className="w-3.5 h-3.5 mr-1 text-slate-500" />
                Ko'chirish Sababi va Izohi <span className="text-rose-500 ml-0.5">* (Majburiy)</span>
              </span>
            </label>
            <textarea
              id="reschedule-reason-input"
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Iltimos, boshqa kunga ko'chirish sababini yozing (Masalan: Kontragentdan ma'lumotlar kechikdi / Boshqa muhim tadbir sababli)..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
            />
          </div>

          {/* Previous History logs if any */}
          {task.history && task.history.length > 0 && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="font-semibold text-slate-600 mb-1">
                Oldingi ko'chirishlar ({task.history.length} ta):
              </div>
              <div className="space-y-1 text-slate-500 max-h-24 overflow-y-auto">
                {task.history.map((h, i) => (
                  <div key={h.id || i} className="text-[11px]">
                    • {h.oldDate} {h.oldTime ? `(${h.oldTime})` : ""} <ArrowRight className="w-3 h-3 inline text-slate-400" /> {h.newDate} {h.newTime ? `(${h.newTime})` : ""}: "{h.reason}" ({h.operator})
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Bekor qilish
            </button>
            <button
              id="btn-confirm-reschedule-task"
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-semibold text-xs sm:text-sm shadow-md shadow-amber-500/20 hover:shadow-lg transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <CalendarClock className="w-4 h-4" />
              <span>O'tkazishni Saqlash</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
