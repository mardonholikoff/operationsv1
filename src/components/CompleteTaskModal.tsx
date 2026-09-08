import React, { useState, useEffect } from "react";
import { Task } from "../types";
import {
  CheckCircle,
  CheckCheck,
  X,
  Sparkles,
  FileText,
  Calendar,
  Clock,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  Zap,
} from "lucide-react";
import confetti from "canvas-confetti";
import { getTaskEstimatedMinutes, formatMinutesUz } from "../services/workload";

interface CompleteTaskModalProps {
  isOpen: boolean;
  task: Task | null;
  onClose: () => void;
  onConfirmComplete: (taskId: string, note: string, actualDuration?: number) => void;
}

export const CompleteTaskModal: React.FC<CompleteTaskModalProps> = ({
  isOpen,
  task,
  onClose,
  onConfirmComplete,
}) => {
  const [note, setNote] = useState("");
  const [actualMinutesInput, setActualMinutesInput] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      setNote("");
      setActualMinutesInput("");
    }
  }, [isOpen, task]);

  if (!isOpen || !task) return null;

  const plannedMinutes = getTaskEstimatedMinutes(task);

  // Foydalanuvchi kiritgan raqamni hisoblash
  const parsedActual = actualMinutesInput.trim() !== "" ? parseInt(actualMinutesInput, 10) : undefined;
  const isActualProvided = typeof parsedActual === "number" && !isNaN(parsedActual) && parsedActual >= 0;
  const actualMinutes = isActualProvided ? parsedActual : undefined;

  // Farqni aniqlash
  const diffMinutes = actualMinutes !== undefined ? plannedMinutes - actualMinutes : 0;
  const isTimeSaved = actualMinutes !== undefined && diffMinutes > 0;
  const isTimeOver = actualMinutes !== undefined && diffMinutes < 0;
  const isTimeExact = actualMinutes !== undefined && diffMinutes === 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Fire festive celebratory confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }

    onConfirmComplete(task.id, note.trim(), actualMinutes);
    setNote("");
    setActualMinutesInput("");
    onClose();
  };

  // Tezkor vaqt variantlari
  const quickPresets = [
    { label: "10 daq", value: 10 },
    { label: "15 daq", value: 15 },
    { label: "20 daq", value: 20 },
    { label: "30 daq", value: 30 },
    { label: "45 daq", value: 45 },
    { label: "1 soat", value: 60 },
  ].filter((p) => p.value !== plannedMinutes);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-5 sm:p-6 animate-fadeIn">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Vazifani Bajarildi Deb Belgilash
              </h3>
              <p className="text-xs text-slate-500">
                Sarflangan vaqt va natija bo'yicha izoh qoldiring
              </p>
            </div>
          </div>
          <button
            id="btn-close-complete-modal"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Task Info Summary with Planned Duration */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Vazifa:
                </div>
                <div className="text-sm font-extrabold text-slate-900">{task.title}</div>
              </div>
              <span className="inline-block px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold shrink-0">
                {task.priority}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-600 border-t border-slate-200/70">
              <span className="flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                Muddati: <strong className="ml-1 text-slate-800">{task.dueDate}</strong>
              </span>
              {task.dueTime && (
                <span className="flex items-center">
                  <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  Soat: <strong className="ml-1 text-slate-800">{task.dueTime}</strong>
                </span>
              )}
              <span className="flex items-center bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded font-bold border border-indigo-200">
                <Clock className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                Rejalashtirilgan vaqt: {formatMinutesUz(plannedMinutes)}
              </span>
            </div>
          </div>

          {/* Monthly Reminder Info if applicable */}
          {task.scheduleType === "monthly" && (
            <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-800">
              <Sparkles className="w-4 h-4 text-blue-600 inline mr-1" />
              <strong>Oylik takrorlanuvchi vazifa:</strong> Ushbu oy uchun
              bajarildi deb belgilanadi va keyingi oyning {task.monthlyDay}-kuni
              uchun avtomatik navbatdagi eslatma faollashtiriladi.
            </div>
          )}

          {/* Amallar (Steps) holati xabarnomasi */}
          {task.steps && task.steps.length > 0 && (
            <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-950 space-y-1.5">
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center text-emerald-900">
                  <CheckCheck className="w-4 h-4 mr-1.5 text-emerald-600 shrink-0" />
                  {task.steps.every((s) => s.completed)
                    ? `Barcha ${task.steps.length} ta amal muvaffaqiyatli bajarildi!`
                    : `Amallar: ${task.steps.filter((s) => s.completed).length}/${task.steps.length} bajarildi`}
                </span>
                <span className="text-[11px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                  Reja: {formatMinutesUz(plannedMinutes)}
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-snug">
                Amallarni bajarishga rejadagidan kamroq vaqt sarflangan bo'lsa, pastda amaldagi daqiqani yozing — tejalgan vaqt kunlik 8 soatlik me'yordan chiqariladi va yuklama kamayadi!
              </p>
            </div>
          )}

          {/* Amalda sarflangan vaqt (Ixtiyoriy) */}
          <div className="p-3.5 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 space-y-2.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="actual-duration-input"
                className="block text-xs font-bold uppercase tracking-wider text-indigo-950 flex items-center"
              >
                <Clock className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                Amalda sarflangan vaqt (Ixtiyoriy):
              </label>
              {actualMinutesInput !== "" && (
                <button
                  type="button"
                  onClick={() => setActualMinutesInput("")}
                  className="text-[11px] font-bold text-slate-500 hover:text-rose-600 flex items-center space-x-1 cursor-pointer"
                  title="Rejadagi vaqtga qaytarish"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Rejaga qaytarish</span>
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              Vazifani bajarishga aslida qancha vaqt ketdi? Agar kiritmasangiz, rejadagi <strong>{formatMinutesUz(plannedMinutes)}</strong> sarflandi deb hisoblanadi. Agar kamroq vaqt kiritilsa (masalan 20 daqiqa), <strong>8 soatlik kundan qolgan vaqt bo'shaydi va yuklama kamayadi</strong>.
            </p>

            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <input
                  id="actual-duration-input"
                  type="number"
                  min="1"
                  max="1440"
                  step="1"
                  value={actualMinutesInput}
                  onChange={(e) => setActualMinutesInput(e.target.value)}
                  placeholder={`Reja bo'yicha: ${plannedMinutes} daqiqa (ixtiyoriy)`}
                  className="w-full pl-3.5 pr-14 py-2 rounded-xl bg-white border border-indigo-200 text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-2xs"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                  daqiqa
                </span>
              </div>

              <button
                type="button"
                onClick={() => setActualMinutesInput(String(plannedMinutes))}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer shrink-0 ${
                  actualMinutesInput === String(plannedMinutes)
                    ? "bg-indigo-600 text-white border-indigo-700"
                    : "bg-white hover:bg-indigo-50 text-indigo-700 border-indigo-200"
                }`}
                title="Rejadagi vaqtni o'rnatish"
              >
                Rejadagidek ({plannedMinutes} daq)
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center">
                <Zap className="w-3 h-3 mr-0.5 text-amber-500" />
                Tezkor:
              </span>
              {quickPresets.map((preset) => {
                const isActive = actualMinutesInput === String(preset.value);
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setActualMinutesInput(String(preset.value))}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      isActive
                        ? "bg-indigo-600 text-white border-indigo-700 shadow-2xs"
                        : "bg-white hover:bg-indigo-50 text-slate-700 border-slate-200 hover:border-indigo-300"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Dinamik tahlil xabari (Live feedback card) */}
            {isActualProvided && (
              <div className="animate-fadeIn pt-1">
                {isTimeSaved && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-start space-x-2">
                    <TrendingDown className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold block">
                        🎉 {diffMinutes} daqiqa vaqt tejaldi!
                      </span>
                      <span className="text-emerald-800 text-[11px] leading-snug">
                        Kunning 8 soatlik me'yoridan <strong>{diffMinutes} daqiqa</strong> bo'shaydi va kunlik ish yuklamasi avtomatik kamayadi.
                      </span>
                    </div>
                  </div>
                )}

                {isTimeOver && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start space-x-2">
                    <TrendingUp className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold block">
                        ⏱ Rejadagidan +{Math.abs(diffMinutes)} daqiqa ortiqcha vaqt ketdi
                      </span>
                      <span className="text-amber-800 text-[11px] leading-snug">
                        Kunlik sarflangan ish vaqti hisobiga jami <strong>{actualMinutes} daqiqa</strong> yoziladi.
                      </span>
                    </div>
                  </div>
                )}

                {isTimeExact && (
                  <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center space-x-2">
                    <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="text-[11px]">
                      Rejalashtirilganidek aynan <strong>{plannedMinutes} daqiqa</strong> sarflandi deb saqlanadi.
                    </span>
                  </div>
                )}
              </div>
            )}

            {!isActualProvided && actualMinutesInput.trim() === "" && (
              <div className="text-[11px] text-slate-500 bg-slate-100/70 p-2 rounded-lg flex items-center justify-between">
                <span>
                  Kiritilmasa, o'z belgilangan vaqti: <strong>{formatMinutesUz(plannedMinutes)}</strong> ketdi deb hisoblanadi.
                </span>
              </div>
            )}
          </div>

          {/* Izoh yozish input */}
          <div>
            <label
              htmlFor="completion-note-input"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center"
            >
              <FileText className="w-3.5 h-3.5 mr-1 text-slate-500" />
              Bajarish Izohi (Qo'shimcha tafsilotlar, chek yoki hujjat raqami):
            </label>
            <textarea
              id="completion-note-input"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Masalan: Hisobot muvaffaqiyatli topshirildi, ERI bilan tasdiqlandi. Kvitansiya #9418..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Bekor qilish
            </button>
            <button
              id="btn-confirm-complete-task"
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs sm:text-sm shadow-md shadow-emerald-500/20 hover:shadow-lg transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Bajarildi Deb Saqlash</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
