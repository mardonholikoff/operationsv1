import React, { useState, useMemo } from "react";
import { ActivityLog } from "../types";
import { formatDateUz, getTodayString } from "../services/storage";
import { exportLogsToExcel } from "../services/excelExport";
import {
  History,
  Search,
  Filter,
  Download,
  Trash2,
  CheckCircle2,
  CalendarClock,
  PlusCircle,
  Edit3,
  AlertOctagon,
  ShieldCheck,
  UserCheck,
  Bot,
  RefreshCw,
  FileSpreadsheet,
  Calendar,
  Layers
} from "lucide-react";

interface ActivityLogViewProps {
  logs: ActivityLog[];
  onClearLogs?: () => void;
}

export const ActivityLogView: React.FC<ActivityLogViewProps> = ({
  logs,
  onClearLogs,
}) => {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [operatorFilter, setOperatorFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  const todayStr = getTodayString();

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // 1. Search text
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesTitle = log.taskTitle?.toLowerCase().includes(query);
        const matchesDetails = log.details?.toLowerCase().includes(query);
        const matchesOp = log.operator?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDetails && !matchesOp) {
          return false;
        }
      }

      // 2. Action filter
      if (actionFilter !== "all" && log.action !== actionFilter) {
        return false;
      }

      // 3. Operator filter
      if (operatorFilter !== "all") {
        const op = (log.operator || "").toLowerCase();
        if (operatorFilter === "admin" && !op.includes("admin")) return false;
        if (operatorFilter === "operator" && !op.includes("operator")) return false;
        if (operatorFilter === "system" && !op.includes("tizim") && !op.includes("auto")) return false;
      }

      // 4. Date filter
      if (dateFilter !== "all") {
        const logDate = (log.timestamp || "").split("T")[0];
        if (dateFilter === "today" && logDate !== todayStr) return false;
        if (dateFilter === "yesterday") {
          const d = new Date();
          d.setDate(d.getDate() - 1);
          const yesterdayStr = d.toISOString().split("T")[0];
          if (logDate !== yesterdayStr) return false;
        }
        if (dateFilter === "7days") {
          const d = new Date();
          d.setDate(d.getDate() - 7);
          const sevenDaysAgo = d.toISOString().split("T")[0];
          if (logDate < sevenDaysAgo) return false;
        }
        if (dateFilter === "this_month") {
          const currentMonth = todayStr.substring(0, 7);
          if (!logDate.startsWith(currentMonth)) return false;
        }
      }

      return true;
    });
  }, [logs, search, actionFilter, operatorFilter, dateFilter, todayStr]);

  // Quick stats
  const totalCount = logs.length;
  const completedCount = logs.filter((l) => l.action === "completed").length;
  const rescheduledCount = logs.filter((l) => l.action === "rescheduled" || l.action === "auto_rolled").length;
  const createdCount = logs.filter((l) => l.action === "created").length;

  const handleExport = () => {
    exportLogsToExcel(filteredLogs, `Admin_Amallar_Logi_${todayStr}.xlsx`);
  };

  const getActionBadge = (action: ActivityLog["action"]) => {
    switch (action) {
      case "created":
        return {
          label: "Vazifa kiritildi",
          bg: "bg-blue-50 text-blue-700 border-blue-200",
          icon: <PlusCircle className="w-3.5 h-3.5 mr-1 text-blue-600" />,
        };
      case "edited":
        return {
          label: "Tahrirlandi",
          bg: "bg-indigo-50 text-indigo-700 border-indigo-200",
          icon: <Edit3 className="w-3.5 h-3.5 mr-1 text-indigo-600" />,
        };
      case "completed":
        return {
          label: "Bajarildi",
          bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
          icon: <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />,
        };
      case "rescheduled":
        return {
          label: "Muddat ko'chirildi",
          bg: "bg-amber-50 text-amber-800 border-amber-200",
          icon: <CalendarClock className="w-3.5 h-3.5 mr-1 text-amber-600" />,
        };
      case "auto_rolled":
        return {
          label: "Avtomatik ko'chirildi",
          bg: "bg-orange-50 text-orange-800 border-orange-200",
          icon: <RefreshCw className="w-3.5 h-3.5 mr-1 text-orange-600" />,
        };
      case "deleted":
        return {
          label: "O'chirildi",
          bg: "bg-rose-50 text-rose-800 border-rose-200",
          icon: <AlertOctagon className="w-3.5 h-3.5 mr-1 text-rose-600" />,
        };
      default:
        return {
          label: "Amal",
          bg: "bg-slate-50 text-slate-700 border-slate-200",
          icon: <History className="w-3.5 h-3.5 mr-1 text-slate-500" />,
        };
    }
  };

  const getOperatorBadge = (operator: string) => {
    const op = (operator || "").toLowerCase();
    if (op.includes("admin")) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
          <ShieldCheck className="w-3 h-3 mr-1 text-purple-600" />
          Bosh Administrator ({operator})
        </span>
      );
    }
    if (op.includes("tizim") || op.includes("auto")) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
          <Bot className="w-3 h-3 mr-1 text-amber-600" />
          Tizim (Avtomat)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
        <UserCheck className="w-3 h-3 mr-1 text-blue-600" />
        Operator ({operator})
      </span>
    );
  };

  const formatLogTime = (isoString?: string) => {
    if (!isoString) return "-";
    try {
      const parts = isoString.split("T");
      const datePart = formatDateUz(parts[0]);
      let timePart = "";
      if (parts[1]) {
        timePart = parts[1].substring(0, 8);
      }
      return `${datePart} ${timePart ? `soat ${timePart}` : ""}`;
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Top Banner / Header for Logs */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-300" />
              <span>Admin Amallari Jurnali (Audit Log)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Vazifalar Ustida Qilingan Barcha Amallar
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Kim qaysi vazifani kiritgan, kim bajargan, muddatini nima sabab bilan ko'chirgan yoki tahrirlagan — barchasi doimiy saqlanadi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="btn-export-logs-excel"
              onClick={handleExport}
              className="inline-flex items-center px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5" />
              Excel yuklash
            </button>

            {onClearLogs && (
              <button
                type="button"
                id="btn-clear-logs"
                onClick={onClearLogs}
                className="inline-flex items-center px-3.5 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-xs sm:text-sm border border-rose-400/30 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Tozalash
              </button>
            )}
          </div>
        </div>

        {/* 4 Mini KPI stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/80">
          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <div className="text-[11px] text-slate-400 font-semibold uppercase">Jami Amallar</div>
            <div className="text-xl font-extrabold text-white mt-0.5">{totalCount}</div>
          </div>
          <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-800/40">
            <div className="text-[11px] text-emerald-300 font-semibold uppercase">Bajarilganlar</div>
            <div className="text-xl font-extrabold text-emerald-400 mt-0.5">{completedCount}</div>
          </div>
          <div className="p-3 bg-amber-950/40 rounded-xl border border-amber-800/40">
            <div className="text-[11px] text-amber-300 font-semibold uppercase">Ko'chirilganlar</div>
            <div className="text-xl font-extrabold text-amber-400 mt-0.5">{rescheduledCount}</div>
          </div>
          <div className="p-3 bg-blue-950/40 rounded-xl border border-blue-800/40">
            <div className="text-[11px] text-blue-300 font-semibold uppercase">Yangi Kiritilganlar</div>
            <div className="text-xl font-extrabold text-blue-400 mt-0.5">{createdCount}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="input-log-search"
              type="text"
              placeholder="Qidiruv (vazifa, xodim, izoh)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* 2. Action Filter */}
          <div>
            <select
              id="select-log-action"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
            >
              <option value="all">Barcha amallar</option>
              <option value="created">🟢 Vazifa kiritildi</option>
              <option value="edited">🔵 Tahrirlandi</option>
              <option value="completed">✅ Bajarildi</option>
              <option value="rescheduled">🟡 Muddat ko'chirildi</option>
              <option value="auto_rolled">🟠 Avtomatik ko'chirildi</option>
              <option value="deleted">🔴 O'chirildi</option>
            </select>
          </div>

          {/* 3. Operator Filter */}
          <div>
            <select
              id="select-log-operator"
              value={operatorFilter}
              onChange={(e) => setOperatorFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
            >
              <option value="all">Barcha xodimlar</option>
              <option value="admin">🛡️ Bosh Administrator (admin)</option>
              <option value="operator">👤 Operator (operator1)</option>
              <option value="system">⚙️ Tizim (Avtomat)</option>
            </select>
          </div>

          {/* 4. Date Filter */}
          <div>
            <select
              id="select-log-date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
            >
              <option value="all">Barcha sanalar</option>
              <option value="today">Bugun qilingan amallar</option>
              <option value="yesterday">Kecha qilingan amallar</option>
              <option value="7days">Oxirgi 7 kun</option>
              <option value="this_month">Shu oy</option>
            </select>
          </div>
        </div>

        {/* Filter Results Counter & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
          <div>
            Topildi: <strong className="text-slate-800 font-bold">{filteredLogs.length}</strong> ta amal qaydi
          </div>

          {(search || actionFilter !== "all" || operatorFilter !== "all" || dateFilter !== "all") && (
            <button
              onClick={() => {
                setSearch("");
                setActionFilter("all");
                setOperatorFilter("all");
                setDateFilter("all");
              }}
              className="inline-flex items-center text-purple-600 hover:text-purple-800 font-medium cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Filtrlarni tozalash
            </button>
          )}
        </div>
      </div>

      {/* Logs Feed List */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
            <History className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-bold text-slate-600 text-base">Amallar jurnali bo'yicha ma'lumot topilmadi</p>
            <p className="text-xs text-slate-400 mt-1">
              Qidiruv yoki filtr parametrlarini o'zgartirib ko'ring
            </p>
          </div>
        ) : (
          filteredLogs.map((log, index) => {
            const actionBadge = getActionBadge(log.action);
            return (
              <div
                key={log.id || index}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  {/* Top Metadata Row: Action Badge + Operator Badge + Timestamp */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${actionBadge.bg}`}
                    >
                      {actionBadge.icon}
                      {actionBadge.label}
                    </span>

                    {getOperatorBadge(log.operator)}

                    <span className="text-xs text-slate-400 font-medium ml-auto sm:ml-0">
                      🕒 {formatLogTime(log.timestamp)}
                    </span>
                  </div>

                  {/* Task Title */}
                  <div className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                    {log.taskTitle}
                  </div>

                  {/* Details / Explanation / Reason Callout */}
                  {log.details && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs text-slate-700 leading-relaxed font-medium">
                      {log.details}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
