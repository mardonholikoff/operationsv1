import React, { useState, useMemo } from "react";
import { Task, TaskPriority } from "../types";
import {
  formatDateUz,
  formatCreatedAtUz,
  getTodayString,
  getCreatorLabel,
  formatTaskScheduleDisplay,
  getTaskOverdueRolloverInfo,
} from "../services/storage";
import { exportTasksToExcel } from "../services/excelExport";
import { getPriorityBadge } from "./TaskCard";
import {
  Search,
  Filter,
  FileSpreadsheet,
  Calendar,
  CalendarDays,
  Layers,
  Repeat,
  CheckCircle2,
  CalendarClock,
  Clock,
  Edit2,
  Trash2,
  FileText,
  History,
  Download,
  SlidersHorizontal,
  RefreshCw,
  CheckCheck,
  AlertTriangle,
  UserCheck,
  ShieldCheck,
  CalendarPlus
} from "lucide-react";

interface TaskTableProps {
  tasks: Task[];
  onToggleStep: (taskId: string, stepId: string) => void;
  onOpenCompleteModal: (task: Task) => void;
  onOpenRescheduleModal: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenNewTask: () => void;
  onBulkCompleteTasks?: (taskIds: string[], note?: string) => void;
  onBulkDeleteTasks?: (taskIds: string[]) => void;
}

const ALL_PRIORITIES: TaskPriority[] = [
  "Soliq(Muhim)",
  "Ichki hisobot(Muhim)",
  "Ichki hisobot(O'rtacha)",
  "Ichki hisobot(Past)",
  "Takrorlanmas ish(Muhim)",
  "Takrorlanmas ish(O'rtacha)",
  "Takrorlanmas ish(Past)",
];

export const TaskTable: React.FC<TaskTableProps> = ({
  tasks,
  onToggleStep,
  onOpenCompleteModal,
  onOpenRescheduleModal,
  onEditTask,
  onDeleteTask,
  onOpenNewTask,
  onBulkCompleteTasks,
  onBulkDeleteTasks,
}) => {
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [scheduleFilter, setScheduleFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [bulkActionMode, setBulkActionMode] = useState<"none" | "confirm_complete" | "confirm_delete">("none");
  const [bulkCompleteNote, setBulkCompleteNote] = useState("");

  const todayStr = getTodayString();

  // Filter logic
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // 1. Search filter
      if (search.trim()) {
        const query = search.toLowerCase();
        const titleMatch = task.title.toLowerCase().includes(query);
        const stepsMatch = (task.steps || []).some((s) => s.text.toLowerCase().includes(query));
        const noteMatch = (task.completionNote || "").toLowerCase().includes(query);
        const reasonMatch = (task.history || []).some((h) => h.reason.toLowerCase().includes(query));
        if (!titleMatch && !stepsMatch && !noteMatch && !reasonMatch) {
          return false;
        }
      }

      // 2. Priority filter
      if (priorityFilter !== "all" && task.priority !== priorityFilter) {
        return false;
      }

      // 3. Schedule filter
      if (scheduleFilter !== "all" && task.scheduleType !== scheduleFilter) {
        return false;
      }

      // 4. Status filter
      if (statusFilter === "pending" && task.isCompleted) {
        return false;
      }
      if (statusFilter === "completed" && !task.isCompleted) {
        return false;
      }
      if (statusFilter === "auto_rolled") {
        const rollover = getTaskOverdueRolloverInfo(task);
        if (!rollover || task.isCompleted) return false;
      }
      if (statusFilter === "rescheduled" && (!task.history || task.history.length === 0)) {
        return false;
      }
      if (statusFilter === "overdue" && (task.isCompleted || task.dueDate >= todayStr)) {
        return false;
      }

      // 5. Date filter
      if (dateFilter === "today" && task.dueDate !== todayStr) {
        return false;
      }
      if (dateFilter === "tomorrow") {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        const tomorrowStr = d.toISOString().split("T")[0];
        if (task.dueDate !== tomorrowStr) return false;
      }
      if (dateFilter === "this_week") {
        const now = new Date();
        const start = new Date(now.setDate(now.getDate() - now.getDay() + 1)).toISOString().split("T")[0];
        const end = new Date(now.setDate(now.getDate() - now.getDay() + 7)).toISOString().split("T")[0];
        if (task.dueDate < start || task.dueDate > end) return false;
      }
      if (dateFilter === "this_month") {
        const currentMonthPrefix = todayStr.substring(0, 7); // YYYY-MM
        if (!task.dueDate.startsWith(currentMonthPrefix)) return false;
      }
      if (dateFilter === "custom") {
        if (customStartDate && task.dueDate < customStartDate) return false;
        if (customEndDate && task.dueDate > customEndDate) return false;
      }

      return true;
    });
  }, [
    tasks,
    search,
    priorityFilter,
    statusFilter,
    scheduleFilter,
    dateFilter,
    customStartDate,
    customEndDate,
    todayStr,
  ]);

  const handleExportExcel = () => {
    setIsExporting(true);
    setTimeout(() => {
      exportTasksToExcel(
        filteredTasks,
        `Barcha_Vazifalar_Hisoboti_${getTodayString()}.xlsx`
      );
      setIsExporting(false);
    }, 400);
  };

  const validSelectedIds = useMemo(() => {
    const taskMap = new Set(tasks.map((t) => t.id));
    return selectedTaskIds.filter((id) => taskMap.has(id));
  }, [selectedTaskIds, tasks]);

  const isAllFilteredSelected =
    filteredTasks.length > 0 &&
    filteredTasks.every((t) => validSelectedIds.includes(t.id));

  const selectedTasksList = useMemo(() => {
    const set = new Set(validSelectedIds);
    return tasks.filter((t) => set.has(t.id));
  }, [tasks, validSelectedIds]);

  const selectedUncompletedIds = useMemo(() => {
    return selectedTasksList.filter((t) => !t.isCompleted).map((t) => t.id);
  }, [selectedTasksList]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const merged = new Set([...validSelectedIds, ...filteredTasks.map((t) => t.id)]);
      setSelectedTaskIds(Array.from(merged));
    } else {
      const filteredSet = new Set(filteredTasks.map((t) => t.id));
      setSelectedTaskIds(validSelectedIds.filter((id) => !filteredSet.has(id)));
      setBulkActionMode("none");
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedTaskIds((prev) => {
      const next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
      if (next.length === 0) setBulkActionMode("none");
      return next;
    });
  };

  const handleExecuteBulkComplete = () => {
    const targetIds = selectedUncompletedIds.length > 0 ? selectedUncompletedIds : validSelectedIds;
    if (targetIds.length === 0) return;

    if (onBulkCompleteTasks) {
      onBulkCompleteTasks(targetIds, bulkCompleteNote.trim() || "Jadval orqali ommaviy bajarildi deb belgilandi");
    } else {
      targetIds.forEach((id) => {
        const found = tasks.find((t) => t.id === id);
        if (found) onOpenCompleteModal(found);
      });
    }
    setSelectedTaskIds([]);
    setBulkActionMode("none");
    setBulkCompleteNote("");
  };

  const handleExecuteBulkDelete = () => {
    if (validSelectedIds.length === 0) return;
    if (onBulkDeleteTasks) {
      onBulkDeleteTasks(validSelectedIds);
    } else {
      validSelectedIds.forEach((id) => onDeleteTask(id));
    }
    setSelectedTaskIds([]);
    setBulkActionMode("none");
  };

  const handleResetFilters = () => {
    setSearch("");
    setPriorityFilter("all");
    setStatusFilter("all");
    setScheduleFilter("all");
    setDateFilter("all");
    setCustomStartDate("");
    setCustomEndDate("");
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Top Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center">
            <FileSpreadsheet className="w-5 h-5 mr-2 text-blue-600" />
            Barcha Vazifalar Jadvali
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Filtrlar orqali saralash, tahlil qilish va Excel fayliga eksport qilish
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Excel Export Button */}
          <button
            id="btn-export-excel-table"
            onClick={handleExportExcel}
            disabled={filteredTasks.length === 0 || isExporting}
            className="inline-flex items-center px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs sm:text-sm font-semibold shadow-sm hover:shadow transition-all disabled:opacity-50 cursor-pointer"
            title="Alohida cell va ramkalar bilan Excelga yuklab olish"
          >
            <Download className="w-4 h-4 mr-1.5" />
            {isExporting ? "Eksport qilinmoqda..." : "Excelga Yuklash (.XLSX)"}
          </button>

          {/* Add Task Button */}
          <button
            id="btn-add-task-from-table"
            onClick={onOpenNewTask}
            className="inline-flex items-center px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-semibold shadow-sm hover:shadow transition-all cursor-pointer"
          >
            + Vazifa Kiritish
          </button>
        </div>
      </div>

      {/* Filter Bar Controls */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {/* Search Box */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Qidiruv
            </label>
            <div className="relative">
              <input
                id="filter-search-input"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Vazifa nomi yoki amallari..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Muhimlik Darajasi
            </label>
            <div className="relative">
              <select
                id="filter-priority-select"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">Barcha darajalar</option>
                {ALL_PRIORITIES.map((p) => {
                  const badge = getPriorityBadge(p);
                  return (
                    <option key={p} value={p}>
                      {badge.label}
                    </option>
                  );
                })}
              </select>
              <Layers className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Date Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Sana / Muddat
            </label>
            <div className="relative">
              <select
                id="filter-date-select"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">Barcha sanalar</option>
                <option value="today">Bugungi vazifalar</option>
                <option value="tomorrow">Ertangi vazifalar</option>
                <option value="this_week">Shu hafta</option>
                <option value="this_month">Shu oy</option>
                <option value="custom">Shaxsiy sana oralig'i</option>
              </select>
              <Calendar className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Schedule Type Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Takrorlanish Turi
            </label>
            <div className="relative">
              <select
                id="filter-schedule-select"
                value={scheduleFilter}
                onChange={(e) => setScheduleFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">Barcha takrorlanishlar</option>
                <option value="daily">Har kunlik</option>
                <option value="every_3_days">Har 3 kunda bir</option>
                <option value="weekly">Har haftada bir</option>
                <option value="monthly">Har oyda bir martta</option>
                <option value="once">Bir martalik</option>
              </select>
              <Repeat className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Bajarilish Holati
            </label>
            <div className="relative">
              <select
                id="filter-status-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">Barcha holatlar</option>
                <option value="pending">Kutilayotgan (Bajarilmagan)</option>
                <option value="completed">Bajarilgan</option>
                <option value="auto_rolled">⚠️ Bajarilmay o'tganlar (Kechikkan)</option>
                <option value="rescheduled">Ko'chirilganlar</option>
                <option value="overdue">Muddati o'tganlar</option>
              </select>
              <SlidersHorizontal className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Custom Date Range if chosen */}
        {dateFilter === "custom" && (
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex flex-wrap items-center gap-3 animate-fadeIn">
            <span className="text-xs font-bold text-blue-900">Sana oralig'i:</span>
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs"
              />
              <span className="text-xs text-slate-500">dan</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs"
              />
              <span className="text-xs text-slate-500">gacha</span>
            </div>
          </div>
        )}

        {/* Filter Summary & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center space-x-2 cursor-pointer select-none bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1 rounded-lg text-slate-700 font-bold transition-colors">
              <input
                id="checkbox-select-all-bar"
                type="checkbox"
                checked={isAllFilteredSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>Barchasini tanlash ({filteredTasks.length})</span>
            </label>
            <span>•</span>
            <span>
              Topildi: <strong className="text-slate-800 font-bold">{filteredTasks.length}</strong> ta vazifa
            </span>
            <span>•</span>
            <span className="text-emerald-700 font-semibold">
              Bajarilgan: {filteredTasks.filter((t) => t.isCompleted).length} ta
            </span>
            <span>•</span>
            <span className="text-rose-700 font-semibold">
              Soliqlar: {filteredTasks.filter((t) => t.priority.includes("Soliq")).length} ta
            </span>
          </div>

          {(search || priorityFilter !== "all" || statusFilter !== "all" || scheduleFilter !== "all" || dateFilter !== "all") && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Filtrlarni tozalash
            </button>
          )}
        </div>
      </div>

      {/* Ommaviy Amallar Paneli (Bir nechta vazifa tanlanganda chiqadi) */}
      {validSelectedIds.length > 0 && (
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-4 rounded-2xl shadow-lg border border-blue-800/60 space-y-3 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-sm shadow-xs">
                {validSelectedIds.length}
              </span>
              <div>
                <div className="text-xs sm:text-sm font-extrabold text-white">
                  {validSelectedIds.length} ta vazifa tanlandi
                </div>
                <div className="text-[11px] text-blue-200">
                  {selectedUncompletedIds.length > 0
                    ? `${selectedUncompletedIds.length} ta bajarilmagan • ${validSelectedIds.length - selectedUncompletedIds.length} ta bajarilgan`
                    : "Barcha tanlangan vazifalar bajarilgan"}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Bulk Complete Button */}
              {selectedUncompletedIds.length > 0 && (
                <button
                  id="btn-bulk-complete-trigger"
                  type="button"
                  onClick={() =>
                    setBulkActionMode(
                      bulkActionMode === "confirm_complete" ? "none" : "confirm_complete"
                    )
                  }
                  className="inline-flex items-center px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Bajarildi deb belgilash ({selectedUncompletedIds.length})
                </button>
              )}

              {/* Bulk Delete Button */}
              <button
                id="btn-bulk-delete-trigger"
                type="button"
                onClick={() =>
                  setBulkActionMode(
                    bulkActionMode === "confirm_delete" ? "none" : "confirm_delete"
                  )
                }
                className="inline-flex items-center px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Tanlanganlarni o'chirish ({validSelectedIds.length})
              </button>

              {/* Clear Selection */}
              <button
                id="btn-bulk-clear-selection"
                type="button"
                onClick={() => {
                  setSelectedTaskIds([]);
                  setBulkActionMode("none");
                }}
                className="inline-flex items-center px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
              >
                Bekor qilish
              </button>
            </div>
          </div>

          {/* Inline Confirmation for Bulk Complete */}
          {bulkActionMode === "confirm_complete" && (
            <div className="p-3.5 rounded-xl bg-emerald-950/90 border border-emerald-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1 space-y-1.5">
                <div className="text-xs font-bold text-emerald-200 flex items-center">
                  <CheckCheck className="w-4 h-4 mr-1.5 text-emerald-400" />
                  Tanlangan {selectedUncompletedIds.length} ta vazifani birdaniga "Bajarildi" deb tasdiqlash:
                </div>
                <input
                  type="text"
                  value={bulkCompleteNote}
                  onChange={(e) => setBulkCompleteNote(e.target.value)}
                  placeholder="Umumiy izoh yozish (ixtiyoriy)..."
                  className="w-full sm:max-w-md px-3 py-1.5 rounded-lg bg-white/95 text-slate-900 text-xs border border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div className="flex items-center space-x-2 self-end sm:self-center">
                <button
                  id="btn-bulk-complete-confirm"
                  type="button"
                  onClick={handleExecuteBulkComplete}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-sm cursor-pointer transition-all"
                >
                  ✓ Ha, Bajarildi ({selectedUncompletedIds.length} ta)
                </button>
                <button
                  type="button"
                  onClick={() => setBulkActionMode("none")}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer"
                >
                  Yopish
                </button>
              </div>
            </div>
          )}

          {/* Inline Confirmation for Bulk Delete */}
          {bulkActionMode === "confirm_delete" && (
            <div className="p-3.5 rounded-xl bg-rose-950/90 border border-rose-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-rose-100 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2 text-rose-400 shrink-0" />
                <span>
                  Haqiqatan ham tanlangan <strong className="text-white font-black">{validSelectedIds.length} ta</strong> vazifani tizimdan butunlay o'chirib tashlamoqchimisiz?
                </span>
              </div>
              <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
                <button
                  id="btn-bulk-delete-confirm"
                  type="button"
                  onClick={handleExecuteBulkDelete}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-extrabold text-xs shadow-sm cursor-pointer transition-all"
                >
                  Ha, butunlay o'chirish ({validSelectedIds.length} ta)
                </button>
                <button
                  type="button"
                  onClick={() => setBulkActionMode("none")}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer"
                >
                  Yo'q, qaytish
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Compact Responsive Table (No Horizontal Scroll Needed) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-3 w-16 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <input
                    id="checkbox-select-all-thead"
                    type="checkbox"
                    checked={isAllFilteredSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    title="Barcha vazifalarni tanlash / bekor qilish"
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>№</span>
                </div>
              </th>
              <th className="py-3 px-3">Vazifa, Muhimlik va Yaratilgan Vaqti</th>
              <th className="py-3 px-3 w-44 hidden md:table-cell">Amallar (Bosqichlar)</th>
              <th className="py-3 px-3 w-36 sm:w-44">Muddati va Soati</th>
              <th className="py-3 px-3 w-28 sm:w-32">Holati</th>
              <th className="py-3 px-3 text-right w-24 sm:w-28">Boshqaruv</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-600">
                    Filtr bo'yicha hech qanday vazifa topilmadi
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Filtr parametrlarini o'zgartiring yoki yangi vazifa kiritish tugmasini bosing
                  </p>
                </td>
              </tr>
            ) : (
              filteredTasks.map((task, index) => {
                const priorityMeta = getPriorityBadge(task.priority);
                const scheduleMeta = formatTaskScheduleDisplay(task);
                const isOverdue = !task.isCompleted && task.dueDate < todayStr;
                const isToday = !task.isCompleted && task.dueDate === todayStr;
                const rolloverInfo = getTaskOverdueRolloverInfo(task);
                const creatorInfo = getCreatorLabel(task.createdBy);
                const steps = task.steps || [];
                const completedSteps = steps.filter((s) => s.completed).length;
                const stepsPercent = steps.length > 0 ? Math.round((completedSteps / steps.length) * 100) : 0;
                const lastHistory = task.history && task.history.length > 0 ? task.history[task.history.length - 1] : null;
                const isSelected = validSelectedIds.includes(task.id);
                const createdTimeFormatted = formatCreatedAtUz(task.createdAt, task.id);

                return (
                  <tr
                    key={task.id}
                    className={`transition-colors ${
                      isSelected
                        ? "bg-blue-50/80 hover:bg-blue-100/60"
                        : task.isCompleted
                        ? "bg-slate-50/40 text-slate-600 hover:bg-slate-50/90"
                        : rolloverInfo
                        ? "bg-amber-50/30 hover:bg-amber-50/60"
                        : isOverdue
                        ? "bg-rose-50/20 hover:bg-rose-50/40"
                        : isToday
                        ? "bg-blue-50/20 hover:bg-blue-50/40"
                        : "hover:bg-slate-50/90"
                    }`}
                  >
                    {/* Tanlash Checkbox & № & Quick Tick */}
                    <td className="py-3 px-3 text-center align-top">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <input
                            id={`select-task-${task.id}`}
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectOne(task.id)}
                            title="Bir nechta vazifani tanlash uchun belgilang"
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <button
                            type="button"
                            onClick={() => onOpenCompleteModal(task)}
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                              task.isCompleted
                                ? "bg-emerald-500 border-emerald-600 text-white shadow-xs"
                                : "border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 text-emerald-600"
                            }`}
                            title={task.isCompleted ? "Bajarilgan" : "Tick: Bajarildi deb belgilash va vaqtni kiritish"}
                          >
                            {task.isCompleted && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">#{index + 1}</span>
                      </div>
                    </td>

                    {/* Vazifa Nomi, Muhimlik, Muallif va Izohlar */}
                    <td className="py-3 px-3 align-top">
                      <div className="space-y-1.5">
                        {/* Title */}
                        <div
                          className={`font-bold text-slate-900 leading-snug ${
                            task.isCompleted ? "line-through text-slate-400" : ""
                          }`}
                        >
                          {task.title}
                        </div>

                        {/* Badges row: Priority + Schedule + Creator */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                          {/* Priority badge */}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded font-bold border ${priorityMeta.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1 ${priorityMeta.dot}`} />
                            {priorityMeta.label}
                          </span>

                          {/* Schedule badge */}
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded font-semibold border ${scheduleMeta.badgeClass}`}
                            title={scheduleMeta.detail}
                          >
                            {task.scheduleType === "monthly" ? (
                              <Repeat className="w-2.5 h-2.5 mr-1" />
                            ) : task.scheduleType === "daily" ? (
                              <CalendarDays className="w-2.5 h-2.5 mr-1" />
                            ) : task.scheduleType === "weekly" || task.scheduleType === "every_3_days" ? (
                              <Calendar className="w-2.5 h-2.5 mr-1" />
                            ) : (
                              <Clock className="w-2.5 h-2.5 mr-1" />
                            )}
                            {scheduleMeta.shortTag}
                          </span>

                          {/* Creator info */}
                          {creatorInfo.isCustomAdmin ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                              <ShieldCheck className="w-2.5 h-2.5 mr-0.5 text-purple-600" />
                              Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              <UserCheck className="w-2.5 h-2.5 mr-0.5 text-blue-600" />
                              {creatorInfo.text.replace(" tomonidan kiritilgan", "")}
                            </span>
                          )}
                        </div>

                        {/* Rollover badge if delayed / carried over */}
                        {rolloverInfo && (
                          <div className="pt-0.5">
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs"
                              title={rolloverInfo.detailedNotice}
                            >
                              <AlertTriangle className="w-2.5 h-2.5 mr-1 text-amber-600 shrink-0" />
                              Oldingi kundan bajarilmay o'tgan ({rolloverInfo.timesRolled}-marta kechikkan)
                            </span>
                          </div>
                        )}

                        {/* Notes / Reschedule info if exists */}
                        {(task.completionNote || lastHistory) && (
                          <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px]">
                            {task.completionNote && (
                              <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <strong>Izoh:</strong> {task.completionNote}
                              </span>
                            )}
                            {lastHistory && (
                              <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                                <History className="w-3 h-3 text-amber-600" />
                                <span>Ko'chirilgan: {lastHistory.reason}</span>
                              </span>
                            )}
                          </div>
                        )}

                        {/* Mobile visible steps summary & interactive checkboxes */}
                        {steps.length > 0 && (
                          <div className="md:hidden pt-1.5 space-y-1">
                            <div className="text-[10px] text-slate-500 font-bold">
                              Amallar ({completedSteps}/{steps.length}):
                            </div>
                            <div className="space-y-1">
                              {steps.map((st) => (
                                <label
                                  key={st.id}
                                  className={`flex items-start space-x-1.5 text-[11px] p-0.5 rounded cursor-pointer ${
                                    st.completed ? "text-slate-400 line-through" : "text-slate-700 font-medium"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={st.completed}
                                    onChange={() => onToggleStep(task.id, st.id)}
                                    className="mt-0.5 w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0"
                                  />
                                  <span className="truncate flex-1">{st.text}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Yaratilgan vaqti - jadval ko'rinishida har bir vazifa pastida avtomatik ko'rinadi */}
                        <div className="pt-2 mt-1.5 border-t border-slate-100 flex flex-wrap items-center gap-2">
                          <span
                            id={`table-task-created-at-${task.id}`}
                            className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100/90 border border-slate-200/90 text-[11px] text-slate-600 font-medium"
                          >
                            <CalendarPlus className="w-3 h-3 mr-1 text-blue-600 shrink-0" />
                            Yaratilgan vaqti:{" "}
                            <strong className="text-slate-800 font-bold ml-1">
                              {createdTimeFormatted}
                            </strong>
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Amallar (Bosqichlar) - Desktop */}
                    <td className="py-3 px-3 align-top hidden md:table-cell">
                      {steps.length > 0 ? (
                        <div className="space-y-1.5 max-w-xs">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                            <span>{completedSteps}/{steps.length} bajarildi</span>
                            <span className="text-slate-400">{stepsPercent}%</span>
                          </div>
                          {/* Mini progress bar */}
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                stepsPercent === 100 ? "bg-emerald-500" : "bg-blue-600"
                              }`}
                              style={{ width: `${stepsPercent}%` }}
                            />
                          </div>
                          {/* Interactive steps checklist */}
                          <div className="space-y-1 pt-0.5 max-h-32 overflow-y-auto pr-1">
                            {steps.map((st) => (
                              <label
                                key={st.id}
                                className={`flex items-start space-x-1.5 text-[11px] p-1 rounded hover:bg-slate-100/80 cursor-pointer transition-colors ${
                                  st.completed ? "text-slate-400 line-through" : "text-slate-700 font-medium"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={st.completed}
                                  onChange={() => onToggleStep(task.id, st.id)}
                                  className="mt-0.5 w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0"
                                />
                                <span className="truncate leading-tight flex-1">{st.text}</span>
                                {st.estimatedMinutes && (
                                  <span className="text-[10px] text-slate-400 font-semibold shrink-0">
                                    {st.estimatedMinutes}m
                                  </span>
                                )}
                              </label>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>

                    {/* Muddati va Soati */}
                    <td className="py-3 px-3 align-top">
                      <div className="font-bold text-slate-900 text-xs">
                        {formatDateUz(task.dueDate)}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                        {task.dueTime ? (
                          <span className="font-bold text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200">
                            ⏰ {task.dueTime}
                          </span>
                        ) : (
                          <span>Vaqt yo'q</span>
                        )}
                        {task.isCompleted && typeof task.actualDuration === "number" ? (
                          <span
                            className="text-emerald-800 font-bold bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200"
                            title={`Amalda sarflangan vaqt: ${task.actualDuration} daqiqa (Reja: ${task.estimatedDuration || 30}m)`}
                          >
                            ⏱ {task.actualDuration}m
                            {task.estimatedDuration && task.actualDuration < task.estimatedDuration && (
                              <span className="text-[9px] text-emerald-700 font-extrabold ml-0.5">
                                (-{task.estimatedDuration - task.actualDuration}m)
                              </span>
                            )}
                            {task.estimatedDuration && task.actualDuration > task.estimatedDuration && (
                              <span className="text-[9px] text-amber-700 font-extrabold ml-0.5">
                                (+{task.actualDuration - task.estimatedDuration}m)
                              </span>
                            )}
                          </span>
                        ) : (
                          task.estimatedDuration && (
                            <span className="text-indigo-700 font-semibold">
                              ⏱ {task.estimatedDuration}m
                            </span>
                          )
                        )}
                      </div>
                      <div className="mt-1.5 pt-1 border-t border-slate-100 text-[10px] text-slate-500 flex items-center">
                        <CalendarPlus className="w-2.5 h-2.5 mr-1 text-slate-400 shrink-0" />
                        <span className="truncate" title={`Yaratilgan: ${createdTimeFormatted}`}>
                          Yaratildi: <strong className="text-slate-700">{createdTimeFormatted}</strong>
                        </span>
                      </div>
                    </td>

                    {/* Holati */}
                    <td className="py-3 px-3 align-top">
                      {task.isCompleted ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCheck className="w-3 h-3 mr-1" /> Bajarildi
                        </span>
                      ) : rolloverInfo ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs">
                            <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
                            Kechikkan ({rolloverInfo.timesRolled}x)
                          </span>
                          <div className="text-[10px] font-bold text-amber-800 pl-0.5">
                            Bajarilmay o'tgan
                          </div>
                        </div>
                      ) : isOverdue ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                          <AlertTriangle className="w-3 h-3 mr-1" /> Kechikkan
                        </span>
                      ) : isToday ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900">
                          Bugun
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                          Kutilmoqda
                        </span>
                      )}
                    </td>

                    {/* Amallar (Buttons) */}
                    <td className="py-3 px-3 text-right align-top">
                      <div className="flex items-center justify-end space-x-1">
                        {!task.isCompleted && (
                          <>
                            <button
                              onClick={() => onOpenCompleteModal(task)}
                              className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                              title="Bajarildi deb belgilash"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onOpenRescheduleModal(task)}
                              className="p-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                              title="Boshqa kunga ko'chirish"
                            >
                              <CalendarClock className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => onEditTask(task)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Tahrirlash"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteTask(task.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="O'chirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Jadval pastki ma'lumot paneli (Footer) */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center font-semibold text-slate-700">
              <CalendarPlus className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
              Har bir vazifa qatori pastida uning tizimga kiritilgan (yaratilgan) aniq sanasi va soati avtomatik ko'rsatilgan.
            </span>
          </div>
          <div className="flex items-center space-x-3 shrink-0 font-medium">
            <span>Jami ko'rsatilmoqda: <strong className="text-slate-900">{filteredTasks.length} ta</strong></span>
            {validSelectedIds.length > 0 && (
              <span className="text-blue-700 font-bold bg-blue-100 px-2 py-0.5 rounded-md">
                Tanlangan: {validSelectedIds.length} ta
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
