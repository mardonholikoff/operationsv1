import React, { useState } from "react";
import { Task, ActivityLog, User } from "../types";
import { TaskCard } from "./TaskCard";
import { TaskTable } from "./TaskTable";
import { ActivityLogView } from "./ActivityLogView";
import { TaskCalendarView } from "./TaskCalendarView";
import { getTodayString } from "../services/storage";
import {
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  Info,
  CalendarCheck2,
  BarChart3,
  TrendingUp,
  History,
  ShieldCheck,
  CalendarDays
} from "lucide-react";

interface OperatorDashboardProps {
  tasks: Task[];
  logs?: ActivityLog[];
  currentUser?: User | null;
  onOpenNewTask: (defaultDate?: string, defaultTime?: string) => void;
  onToggleStep: (taskId: string, stepId: string) => void;
  onOpenCompleteModal: (task: Task) => void;
  onOpenRescheduleModal: (task: Task) => void;
  onOpenHourReschedule?: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  rolledOverCount: number;
  onClearLogs?: () => void;
}

export const OperatorDashboard: React.FC<OperatorDashboardProps> = ({
  tasks,
  logs = [],
  currentUser,
  onOpenNewTask,
  onToggleStep,
  onOpenCompleteModal,
  onOpenRescheduleModal,
  onOpenHourReschedule,
  onEditTask,
  onDeleteTask,
  rolledOverCount,
  onClearLogs,
}) => {
  const [activeMainTab, setActiveMainTab] = useState<"calendar" | "cards" | "table" | "logs">("calendar");
  const [activeCategoryTab, setActiveCategoryTab] = useState<"today" | "upcoming" | "overdue" | "completed">("today");

  const todayStr = getTodayString();
  const isAdmin = currentUser?.role === "admin";

  // Categorize tasks
  const todayTasks = tasks.filter(
    (t) => !t.isCompleted && t.dueDate === todayStr
  );

  const upcomingTasks = tasks.filter(
    (t) => !t.isCompleted && t.dueDate > todayStr
  );

  const overdueTasks = tasks.filter(
    (t) => !t.isCompleted && t.dueDate < todayStr
  );

  // Completed today filter as requested: "bajarilganlar faqat bugungilarni ko'rsatsin va nomi ham bugun bajarilganlarga o'zgartirilsin"
  const todayCompletedTasks = tasks.filter((t) => {
    if (!t.isCompleted) return false;
    if (t.completedAt) {
      return t.completedAt.startsWith(todayStr);
    }
    return t.dueDate === todayStr;
  });

  // Counts
  const totalTaxTasks = tasks.filter(
    (t) => !t.isCompleted && t.priority.includes("Soliq")
  ).length;

  return (
    <div className="space-y-5 pb-12">
      {/* Top Banner: Auto-rollover notification if any */}
      {rolledOverCount > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start space-x-3 shadow-xs animate-fadeIn">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <span className="font-bold">Avtomatik muddat ko'chirish:</span>{" "}
            Muddati o'tgan {rolledOverCount} ta bajarilmagan vazifa avtomatik ravishda bugungi kunga o'tkazildi va ko'chirish tarixi qayd etildi.
          </div>
        </div>
      )}

      {/* Ixcham KPI Ko'rsatkichlar Paneli (Kam joy egallaydigan ixcham format) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Card 1: Bugun */}
        <button
          onClick={() => {
            setActiveMainTab("cards");
            setActiveCategoryTab("today");
          }}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
            activeMainTab === "cards" && activeCategoryTab === "today"
              ? "bg-blue-600 border-blue-600 text-white shadow-xs ring-2 ring-blue-400/30"
              : "bg-white border-slate-200 text-slate-900 hover:border-slate-300 hover:bg-slate-50 shadow-2xs"
          }`}
        >
          <div className="min-w-0 pr-2">
            <div className={`text-[11px] font-bold uppercase tracking-wider truncate ${
              activeMainTab === "cards" && activeCategoryTab === "today" ? "text-blue-100" : "text-slate-500"
            }`}>
              Bugungi Vazifalar
            </div>
            <div className={`text-[11px] mt-0.5 truncate ${
              activeMainTab === "cards" && activeCategoryTab === "today" ? "text-blue-200" : "text-slate-400"
            }`}>
              Bajarilishi shart
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-xl sm:text-2xl font-black">{todayTasks.length}</span>
            <div className={`p-1.5 rounded-lg ${
              activeMainTab === "cards" && activeCategoryTab === "today" ? "bg-white/20 text-white" : "bg-blue-50 text-blue-600"
            }`}>
              <Calendar className="w-4 h-4" />
            </div>
          </div>
        </button>

        {/* Card 2: Yaqinlashayotgan */}
        <button
          onClick={() => {
            setActiveMainTab("cards");
            setActiveCategoryTab("upcoming");
          }}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
            activeMainTab === "cards" && activeCategoryTab === "upcoming"
              ? "bg-indigo-600 border-indigo-600 text-white shadow-xs ring-2 ring-indigo-400/30"
              : "bg-white border-slate-200 text-slate-900 hover:border-slate-300 hover:bg-slate-50 shadow-2xs"
          }`}
        >
          <div className="min-w-0 pr-2">
            <div className={`text-[11px] font-bold uppercase tracking-wider truncate ${
              activeMainTab === "cards" && activeCategoryTab === "upcoming" ? "text-indigo-100" : "text-slate-500"
            }`}>
              Yaqinlashayotgan
            </div>
            <div className={`text-[11px] mt-0.5 truncate ${
              activeMainTab === "cards" && activeCategoryTab === "upcoming" ? "text-indigo-200" : "text-slate-400"
            }`}>
              Kelgusi kunlar
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-xl sm:text-2xl font-black">{upcomingTasks.length}</span>
            <div className={`p-1.5 rounded-lg ${
              activeMainTab === "cards" && activeCategoryTab === "upcoming" ? "bg-white/20 text-white" : "bg-indigo-50 text-indigo-600"
            }`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
        </button>

        {/* Card 3: Soliq & Muhim */}
        <button
          onClick={() => {
            setActiveMainTab("table");
          }}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
            activeMainTab === "table"
              ? "bg-rose-600 border-rose-600 text-white shadow-xs ring-2 ring-rose-400/30"
              : "bg-white border-slate-200 text-slate-900 hover:border-slate-300 hover:bg-slate-50 shadow-2xs"
          }`}
        >
          <div className="min-w-0 pr-2">
            <div className={`text-[11px] font-bold uppercase tracking-wider truncate ${
              activeMainTab === "table" ? "text-rose-100" : "text-slate-500"
            }`}>
              Soliq va Muhim
            </div>
            <div className={`text-[11px] mt-0.5 truncate ${
              activeMainTab === "table" ? "text-rose-200" : "text-slate-400"
            }`}>
              Yuqori nazorat
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <span className={`text-xl sm:text-2xl font-black ${activeMainTab === "table" ? "text-white" : "text-rose-600"}`}>
              {totalTaxTasks}
            </span>
            <div className={`p-1.5 rounded-lg ${
              activeMainTab === "table" ? "bg-white/20 text-white" : "bg-rose-50 text-rose-600"
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
        </button>

        {/* Card 4: Bugun Bajarilganlar */}
        <button
          onClick={() => {
            setActiveMainTab("cards");
            setActiveCategoryTab("completed");
          }}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
            activeMainTab === "cards" && activeCategoryTab === "completed"
              ? "bg-emerald-600 border-emerald-600 text-white shadow-xs ring-2 ring-emerald-400/30"
              : "bg-white border-slate-200 text-slate-900 hover:border-slate-300 hover:bg-slate-50 shadow-2xs"
          }`}
        >
          <div className="min-w-0 pr-2">
            <div className={`text-[11px] font-bold uppercase tracking-wider truncate ${
              activeMainTab === "cards" && activeCategoryTab === "completed" ? "text-emerald-100" : "text-slate-500"
            }`}>
              Bugun Bajarilganlar
            </div>
            <div className={`text-[11px] mt-0.5 truncate ${
              activeMainTab === "cards" && activeCategoryTab === "completed" ? "text-emerald-200" : "text-slate-400"
            }`}>
              Yakunlangan
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-xl sm:text-2xl font-black">{todayCompletedTasks.length}</span>
            <div className={`p-1.5 rounded-lg ${
              activeMainTab === "cards" && activeCategoryTab === "completed" ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-600"
            }`}>
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
        </button>
      </div>

      {/* Main Switcher: Katta Kalendar vs Ro'yxat vs Jadval vs Loglar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3.5">
        {/* View Switch Buttons */}
        <div className="flex flex-wrap items-center p-1 bg-slate-200/70 rounded-xl gap-1">
          {/* Default First Tab: Katta Kalendar */}
          <button
            id="btn-view-calendar"
            onClick={() => setActiveMainTab("calendar")}
            className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeMainTab === "calendar"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-700 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Katta Kalendar & Soatlar</span>
          </button>

          <button
            id="btn-view-cards"
            onClick={() => setActiveMainTab("cards")}
            className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeMainTab === "cards"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-700 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Kategoriyali Bloklar</span>
          </button>

          <button
            id="btn-view-table"
            onClick={() => setActiveMainTab("table")}
            className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeMainTab === "table"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-700 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Jadval Ko'rinishi</span>
          </button>

          {/* Dedicated Amallar Jurnali Tab for Admin */}
          {isAdmin && (
            <button
              id="btn-view-logs"
              onClick={() => setActiveMainTab("logs")}
              className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeMainTab === "logs"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-purple-700 hover:bg-purple-100/70 font-semibold"
              }`}
            >
              <History className="w-4 h-4" />
              <span>Amallar Jurnali</span>
              {logs.length > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                    activeMainTab === "logs"
                      ? "bg-purple-800 text-purple-100"
                      : "bg-purple-200 text-purple-800"
                  }`}
                >
                  {logs.length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Action Buttons Group */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Admin Amallar Logi Quick Switcher */}
          {isAdmin && activeMainTab !== "logs" && (
            <button
              type="button"
              id="op-btn-quick-logs"
              onClick={() => setActiveMainTab("logs")}
              className="inline-flex items-center justify-center px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 mr-1.5 text-purple-600" />
              Amallar Logi
            </button>
          )}

          {/* Primary Action Button: Vazifa Kiritish */}
          <button
            id="btn-add-task-main"
            onClick={() => onOpenNewTask()}
            className="inline-flex items-center justify-center px-4 sm:px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 hover:shadow-lg transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1.5 stroke-[2.5]" />
            Vazifa Kiritish
          </button>
        </div>
      </div>

      {/* Main View 1: Katta Kalendar va Har bir kun uchun topshiriqlar & Soat jadvali */}
      {activeMainTab === "calendar" ? (
        <TaskCalendarView
          tasks={tasks}
          onOpenNewTask={onOpenNewTask}
          onOpenHourReschedule={onOpenHourReschedule || onOpenRescheduleModal}
          onOpenDateReschedule={onOpenRescheduleModal}
          onOpenCompleteModal={onOpenCompleteModal}
          onEditTask={onEditTask}
          onDeleteTask={onDeleteTask}
          onToggleStep={onToggleStep}
        />
      ) : activeMainTab === "cards" ? (
        /* View 2: Cards with category tabs */
        <div className="space-y-5">
          {/* Sub category tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveCategoryTab("today")}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeCategoryTab === "today"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Bugungi Vazifalar ({todayTasks.length})</span>
            </button>

            <button
              onClick={() => setActiveCategoryTab("upcoming")}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeCategoryTab === "upcoming"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Yaqinlashayotgan ({upcomingTasks.length})</span>
            </button>

            {overdueTasks.length > 0 && (
              <button
                onClick={() => setActiveCategoryTab("overdue")}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  activeCategoryTab === "overdue"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-white text-rose-700 border border-rose-200 hover:bg-rose-50"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Muddati O'tgan ({overdueTasks.length})</span>
              </button>
            )}

            <button
              onClick={() => setActiveCategoryTab("completed")}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeCategoryTab === "completed"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Bugun Bajarilganlar ({todayCompletedTasks.length})</span>
            </button>
          </div>

          {/* Cards Grid Rendering */}
          {activeCategoryTab === "today" && (
            <div>
              {todayTasks.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500">
                  <CalendarCheck2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-800">
                    Bugun uchun barcha vazifalar bajarilgan yoki yangi vazifa yo'q!
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Yangi vazifa kiritish uchun yuqoridagi "Vazifa Kiritish" tugmasidan foydalaning
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {todayTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggleStep={onToggleStep}
                      onOpenCompleteModal={onOpenCompleteModal}
                      onOpenRescheduleModal={onOpenRescheduleModal}
                      onOpenHourReschedule={onOpenHourReschedule}
                      onEditTask={onEditTask}
                      onDeleteTask={onDeleteTask}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeCategoryTab === "upcoming" && (
            <div>
              {upcomingTasks.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500">
                  <Clock className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-800">
                    Kelgusi kunlar uchun hozircha rejalashtirilgan vazifalar yo'q
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Oylik yoki bir martalik muddatlar bilan vazifa qo'shishingiz mumkin
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {upcomingTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggleStep={onToggleStep}
                      onOpenCompleteModal={onOpenCompleteModal}
                      onOpenRescheduleModal={onOpenRescheduleModal}
                      onOpenHourReschedule={onOpenHourReschedule}
                      onEditTask={onEditTask}
                      onDeleteTask={onDeleteTask}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeCategoryTab === "overdue" && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {overdueTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggleStep={onToggleStep}
                    onOpenCompleteModal={onOpenCompleteModal}
                    onOpenRescheduleModal={onOpenRescheduleModal}
                    onOpenHourReschedule={onOpenHourReschedule}
                    onEditTask={onEditTask}
                    onDeleteTask={onDeleteTask}
                  />
                ))}
              </div>
            </div>
          )}

          {activeCategoryTab === "completed" && (
            <div>
              {todayCompletedTasks.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500">
                  <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-800">
                    Bugun hali bajarilgan vazifalar mavjud emas
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Bugun bajarilgan topshiriqlar "Bajarildi" deb belgilangach shu yerda aks etadi
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {todayCompletedTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggleStep={onToggleStep}
                      onOpenCompleteModal={onOpenCompleteModal}
                      onOpenRescheduleModal={onOpenRescheduleModal}
                      onOpenHourReschedule={onOpenHourReschedule}
                      onEditTask={onEditTask}
                      onDeleteTask={onDeleteTask}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : activeMainTab === "table" ? (
        /* View 3: Full Task Table with Filters and Excel Export */
        <TaskTable
          tasks={tasks}
          onToggleStep={onToggleStep}
          onOpenCompleteModal={onOpenCompleteModal}
          onOpenRescheduleModal={onOpenRescheduleModal}
          onEditTask={onEditTask}
          onDeleteTask={onDeleteTask}
          onOpenNewTask={onOpenNewTask}
        />
      ) : (
        /* View 4: Dedicated Activity Audit Logs View */
        <ActivityLogView
          logs={logs}
          onClearLogs={onClearLogs}
        />
      )}
    </div>
  );
};
