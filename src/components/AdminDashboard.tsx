import React, { useState } from "react";
import { Task, ActivityLog } from "../types";
import { TaskTable } from "./TaskTable";
import { exportTasksToExcel } from "../services/excelExport";
import { formatDateUz, getTodayString } from "../services/storage";
import {
  ShieldCheck,
  Activity,
  Users,
  FileSpreadsheet,
  Download,
  AlertOctagon,
  CheckCircle2,
  Clock,
  TrendingUp,
  History,
  Database,
  Sliders,
  Sparkles,
  Info,
  BarChart3
} from "lucide-react";

interface AdminDashboardProps {
  tasks: Task[];
  logs: ActivityLog[];
  onToggleStep: (taskId: string, stepId: string) => void;
  onOpenCompleteModal: (task: Task) => void;
  onOpenRescheduleModal: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenNewTask: () => void;
  onClearAllData?: () => void;
  onOpenDailyAnalytics?: () => void;
  onOpenMonthlyAnalytics?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  tasks,
  logs,
  onToggleStep,
  onOpenCompleteModal,
  onOpenRescheduleModal,
  onEditTask,
  onDeleteTask,
  onOpenNewTask,
  onClearAllData,
  onOpenDailyAnalytics,
  onOpenMonthlyAnalytics,
}) => {
  const [activeTab, setActiveTab] = useState<"overview" | "tasks" | "logs">("overview");

  // Metrics calculation
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.isCompleted).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const taxTasks = tasks.filter((t) => t.priority.includes("Soliq"));
  const taxCompleted = taxTasks.filter((t) => t.isCompleted).length;
  const taxRate = taxTasks.length > 0 ? Math.round((taxCompleted / taxTasks.length) * 100) : 100;

  const rescheduledTasks = tasks.filter(
    (t) => t.history && t.history.length > 0
  ).length;

  const todayStr = getTodayString();
  const overdueCount = tasks.filter((t) => !t.isCompleted && t.dueDate < todayStr).length;

  const handleExportBackupJson = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      tasks,
      logs,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Vazifalar_Backup_Admin_${todayStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner indicating Admin readiness */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-purple-950/20 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-500/30 border border-purple-400/40 text-purple-200 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-300" />
              <span>2-Profil: Bosh Administrator Paneli</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Tizim va Operatorlar Nazorati
            </h1>
            <p className="text-xs sm:text-sm text-purple-200/90 leading-relaxed">
              Barcha vazifalar, soliq muddatlari va ko'chirish tarixlari bo'yicha to'liq statistik nazorat. Keyingi talablaringiz va qo'shimcha qoidalar kiritilishi uchun admin moduli to'liq tayyor.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onOpenDailyAnalytics && (
              <button
                type="button"
                id="admin-btn-daily-analytics"
                onClick={onOpenDailyAnalytics}
                className="inline-flex items-center px-3.5 py-2.5 rounded-xl bg-blue-600/90 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm border border-blue-400/40 shadow-md transition-all cursor-pointer"
              >
                <BarChart3 className="w-4 h-4 mr-1.5" />
                Kunlik Analitika
              </button>
            )}

            {onOpenMonthlyAnalytics && (
              <button
                type="button"
                id="admin-btn-monthly-analytics"
                onClick={onOpenMonthlyAnalytics}
                className="inline-flex items-center px-3.5 py-2.5 rounded-xl bg-purple-600/90 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm border border-purple-400/40 shadow-md transition-all cursor-pointer"
              >
                <TrendingUp className="w-4 h-4 mr-1.5" />
                Oylik Analitika
              </button>
            )}

            <button
              onClick={() => exportTasksToExcel(tasks, `Admin_Master_Hisobot_${todayStr}.xlsx`)}
              className="inline-flex items-center px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5" />
              Master Excel Eksport
            </button>
            <button
              onClick={handleExportBackupJson}
              className="inline-flex items-center px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm border border-white/20 transition-all cursor-pointer"
              title="Tizim ma'lumotlar bazasi zaxira nusxasi"
            >
              <Database className="w-4 h-4 mr-1.5" />
              JSON Zaxira
            </button>
          </div>
        </div>
      </div>

      {/* Admin KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            <span>Umumiy Vazifalar</span>
            <Database className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {totalTasks}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Bajarilish darajasi: <strong className="text-blue-600">{completionRate}%</strong>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            <span>Soliq / Hisobotlar</span>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-3xl font-extrabold text-purple-700 tracking-tight">
            {taxTasks.length} ta
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Topshirilgan: <strong className="text-purple-600">{taxCompleted} ta ({taxRate}%)</strong>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            <span>Ko'chirilgan Ishlar</span>
            <History className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-extrabold text-amber-600 tracking-tight">
            {rescheduledTasks} ta
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Muddati o'zgartirilgan vazifalar
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            <span>Muddati O'tgan</span>
            <AlertOctagon className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-3xl font-extrabold text-rose-600 tracking-tight">
            {overdueCount} ta
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Kechikkan vazifalar soni
          </div>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200/80 pb-3">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
            activeTab === "overview"
              ? "bg-purple-600 text-white shadow-xs"
              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Statistik Tahlil</span>
        </button>

        <button
          onClick={() => setActiveTab("tasks")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
            activeTab === "tasks"
              ? "bg-purple-600 text-white shadow-xs"
              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Barcha Vazifalar ({tasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
            activeTab === "logs"
              ? "bg-purple-600 text-white shadow-xs"
              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Amallar Jurnali (Audit Logs)</span>
        </button>
      </div>

      {/* Tab 1: Overview and Analytics */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-fadeIn">
          {/* Soliq & Hisobotlar Compliance card */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-purple-600" />
                Soliq va Ichki Hisobotlar Monitoringi
              </h3>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
                Oylik va Davriy
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Ushbu bo'limda Soliq(Muhim) va Ichki hisobot toifasidagi vazifalarning bajarilish grafigi aks etadi:
            </p>

            <div className="space-y-3">
              {taxTasks.map((t) => (
                <div
                  key={t.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-900">{t.title}</div>
                    <div className="text-slate-500">
                      Muddati: <span className="font-semibold text-slate-700">{formatDateUz(t.dueDate)}</span> • {t.scheduleType === "monthly" ? `Har oyning ${t.monthlyDay}-kuni` : "Bir martalik"}
                    </div>
                  </div>
                  <div>
                    {t.isCompleted ? (
                      <span className="px-2.5 py-1 rounded-full text-emerald-800 bg-emerald-100 font-bold">
                        Topshirildi ✓
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-amber-800 bg-amber-100 font-bold">
                        Kutilmoqda
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Operator Audit summary card */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-600" />
                Operatorlar Faoliyati va Xavfsizlik
              </h3>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                1-Profil: Operator
              </span>
            </div>

            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-xs text-blue-900 space-y-2">
              <div className="font-bold text-sm">Foydalanuvchilar Bo'yicha Vazifalar:</div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2 bg-white/80 rounded-lg border border-blue-100">
                  <div className="text-[11px] text-blue-700 font-semibold">👤 operator1 tomonidan:</div>
                  <div className="text-base font-extrabold text-blue-950">
                    {tasks.filter((t) => !t.createdBy || t.createdBy.toLowerCase().includes("operator")).length} ta vazifa
                  </div>
                </div>
                <div className="p-2 bg-white/80 rounded-lg border border-purple-100">
                  <div className="text-[11px] text-purple-700 font-semibold">🛡️ admin tomonidan:</div>
                  <div className="text-base font-extrabold text-purple-950">
                    {tasks.filter((t) => t.createdBy && t.createdBy.toLowerCase().includes("admin")).length} ta vazifa
                  </div>
                </div>
              </div>
              <div className="pt-1 text-[11px] text-blue-800">
                • Jami bajarilgan: <strong>{completedTasks} ta</strong> ({completionRate}%)
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                So'nggi Amallar:
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs">
                {logs.slice(0, 5).map((log) => (
                  <div key={log.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center justify-between text-slate-500 text-[11px] mb-0.5">
                      <span className="font-bold text-purple-700">@{log.operator}</span>
                      <span>{formatDateUz(log.timestamp.split("T")[0])}</span>
                    </div>
                    <div className="font-semibold text-slate-800">{log.taskTitle}</div>
                    {log.details && <div className="text-slate-500 text-[11px] mt-0.5">{log.details}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Full Tasks Table with Elevated Controls */}
      {activeTab === "tasks" && (
        <TaskTable
          tasks={tasks}
          onToggleStep={onToggleStep}
          onOpenCompleteModal={onOpenCompleteModal}
          onOpenRescheduleModal={onOpenRescheduleModal}
          onEditTask={onEditTask}
          onDeleteTask={onDeleteTask}
          onOpenNewTask={onOpenNewTask}
        />
      )}

      {/* Tab 3: Full Audit Logs */}
      {activeTab === "logs" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Tizimdagi Barcha Harakatlar Tarixi (Audit Log)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Kim qachon vazifa qo'shdi, muddatini ko'chirdi yoki bajardi
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-lg bg-slate-100 text-slate-700">
              Jami {logs.length} ta yozuv
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      @{log.operator}
                    </span>
                    <span className="font-bold text-slate-800">{log.taskTitle}</span>
                  </div>
                  {log.details && (
                    <p className="text-slate-600 text-[11px] pl-1">{log.details}</p>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 shrink-0 font-mono">
                  {new Date(log.timestamp).toLocaleString("uz-UZ")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
