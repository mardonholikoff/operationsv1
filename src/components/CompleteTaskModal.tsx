import React, { useState } from "react";
import { Task } from "../types";
import { CheckCircle, X, Sparkles, FileText, Calendar } from "lucide-react";
import confetti from "canvas-confetti";

interface CompleteTaskModalProps {
  isOpen: boolean;
  task: Task | null;
  onClose: () => void;
  onConfirmComplete: (taskId: string, note: string) => void;
}

export const CompleteTaskModal: React.FC<CompleteTaskModalProps> = ({
  isOpen,
  task,
  onClose,
  onConfirmComplete,
}) => {
  const [note, setNote] = useState("");

  if (!isOpen || !task) return null;

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

    onConfirmComplete(task.id, note.trim());
    setNote("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-5 sm:p-6 animate-fadeIn">
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
                Natija va bajarish bo'yicha izoh qoldiring
              </p>
            </div>
          </div>
          <button
            id="btn-close-complete-modal"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Task Info Summary */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-xs font-semibold text-slate-500 mb-1">
              Vazifa:
            </div>
            <div className="text-sm font-bold text-slate-900">{task.title}</div>
            <div className="mt-1 flex items-center space-x-2 text-xs text-slate-600">
              <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-medium">
                {task.priority}
              </span>
              <span>•</span>
              <span className="flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                Muddati: {task.dueDate}
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
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Masalan: Hisobot muvaffaqiyatli topshirildi, ERI bilan tasdiqlandi. Kvitansiya #9418..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-100 transition-colors"
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
