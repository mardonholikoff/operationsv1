import React from "react";
import { Task } from "../types";
import { formatDateUz } from "../services/storage";
import { Trash2, AlertTriangle, X, Calendar, Layers } from "lucide-react";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  task: Task | null;
  onClose: () => void;
  onConfirm: (taskId: string) => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  task,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !task) return null;

  return (
    <div
      id="modal-delete-confirm-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all">
        {/* Header */}
        <div className="px-6 py-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-rose-950">Vazifani o'chirish</h3>
              <p className="text-xs text-rose-700">Ushbu amalni ortga qaytarib bo'lmaydi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="font-bold text-sm text-slate-900 leading-snug">
              {task.title}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white border border-slate-200 font-medium">
                <Layers className="w-3 h-3 mr-1 text-slate-400" />
                {task.priority}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white border border-slate-200 font-medium">
                <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                {formatDateUz(task.dueDate)}
              </span>
            </div>
          </div>

          <div className="flex items-start space-x-2 text-xs text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              Haqiqatan ham ushbu vazifani tizimdan va barcha hisobotlardan butunlay o'chirib yubormoqchimisiz?
            </p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-3">
          <button
            type="button"
            id="btn-cancel-delete"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="button"
            id="btn-confirm-delete"
            onClick={() => {
              onConfirm(task.id);
              onClose();
            }}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs sm:text-sm font-bold shadow-md shadow-rose-600/20 transition-all cursor-pointer flex items-center space-x-1.5"
          >
            <Trash2 className="w-4 h-4" />
            <span>Ha, o'chirilsin</span>
          </button>
        </div>
      </div>
    </div>
  );
};
