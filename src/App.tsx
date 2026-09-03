import React, { useState, useEffect, useCallback } from "react";
import { Task, ActivityLog, User } from "./types";
import {
  getStoredTasks,
  saveStoredTasks,
  getStoredLogs,
  saveStoredLogs,
  addActivityLog,
  checkAndPerformAutoRollover,
  getTodayString,
  getNextMonthlyDate,
  addDaysToDate,
  addMonthsToDate,
} from "./services/storage";
import {
  subscribeToTasksFirestore,
  subscribeToLogsFirestore,
  saveTaskFirestore,
  deleteTaskFirestore,
  saveActivityLogFirestore,
  clearAllLogsFirestore,
} from "./services/firebase";
import {
  enqueueSaveTask,
  enqueueDeleteTask,
  enqueueSaveLog,
  enqueueClearLogs,
  flushOfflineQueue,
  getOfflineQueue,
  getPendingQueueCount,
} from "./services/offlineSyncManager";
import { Header } from "./components/Header";
import { LoginForm } from "./components/LoginForm";
import { OperatorDashboard } from "./components/OperatorDashboard";
import { TaskFormModal } from "./components/TaskFormModal";
import { CompleteTaskModal } from "./components/CompleteTaskModal";
import { RescheduleTaskModal } from "./components/RescheduleTaskModal";
import { DailyAnalyticsModal } from "./components/DailyAnalyticsModal";
import { MonthlyAnalyticsModal } from "./components/MonthlyAnalyticsModal";
import { DeleteConfirmModal } from "./components/DeleteConfirmModal";
import { HourRescheduleModal } from "./components/HourRescheduleModal";
import { AdminV1Dashboard } from "./components/AdminV1Dashboard";

const USER_SESSION_KEY = "vazifalar_active_user_v3";

export function App() {
  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(USER_SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Admin view switcher state: default is 'v1'
  const [adminViewVersion, setAdminViewVersion] = useState<"v1" | "v2">("v1");

  // Tasks and Logs State
  const [tasks, setTasks] = useState<Task[]>(() => getStoredTasks());
  const [logs, setLogs] = useState<ActivityLog[]>(() => getStoredLogs());
  const [rolledOverCount, setRolledOverCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(() => getPendingQueueCount());

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTaskInitialDate, setNewTaskInitialDate] = useState<string | undefined>(undefined);
  const [newTaskInitialTime, setNewTaskInitialTime] = useState<string | undefined>(undefined);

  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);

  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [taskToReschedule, setTaskToReschedule] = useState<Task | null>(null);

  const [isHourRescheduleModalOpen, setIsHourRescheduleModalOpen] = useState(false);
  const [taskForHourReschedule, setTaskForHourReschedule] = useState<Task | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  // Analytics Modals State
  const [isDailyAnalyticsOpen, setIsDailyAnalyticsOpen] = useState(false);
  const [isMonthlyAnalyticsOpen, setIsMonthlyAnalyticsOpen] = useState(false);

  // Flush offline queue to Firebase Firestore
  const triggerFlushOffline = useCallback(async () => {
    if (!navigator.onLine) {
      setPendingCount(getPendingQueueCount());
      return;
    }
    setIsSyncing(true);
    try {
      await flushOfflineQueue((syncing, remaining) => {
        setIsSyncing(syncing);
        setPendingCount(remaining);
      });
    } catch (e) {
      console.warn("Offline flush attempt error:", e);
    } finally {
      setIsSyncing(false);
      setPendingCount(getPendingQueueCount());
    }
  }, []);

  // Merge Firestore cloud tasks with locally pending offline mutations
  const mergeWithOfflineQueue = useCallback((cloudTasks: Task[]): Task[] => {
    const queue = getOfflineQueue();
    const map = new Map<string, Task>();

    // 1. Add all cloud tasks
    cloudTasks.forEach((t) => {
      if (t && t.id) map.set(t.id, t);
    });

    // 2. Apply queued operations
    queue.forEach((mutation) => {
      if (mutation.type === "save_task" && mutation.task) {
        map.set(mutation.task.id, mutation.task);
      } else if (mutation.type === "delete_task" && mutation.taskId) {
        map.delete(mutation.taskId);
      }
    });

    return Array.from(map.values());
  }, []);

  // Initial load and Real-time Firebase Firestore Listeners
  useEffect(() => {
    // 1. Check auto-rollover for local state on startup
    const initialLocalTasks = getStoredTasks();
    const initialLocalLogs = getStoredLogs();

    const { updatedTasks, rolledCount } = checkAndPerformAutoRollover(initialLocalTasks);
    setTasks(updatedTasks);
    setLogs(initialLocalLogs);
    setRolledOverCount(rolledCount);
    setPendingCount(getPendingQueueCount());

    // 2. If online, flush any pending offline mutations immediately
    if (navigator.onLine) {
      triggerFlushOffline();
    }

    // 3. Subscribe to real-time Tasks collection in Firebase Firestore (Universal Source of Truth)
    const unsubscribeTasks = subscribeToTasksFirestore(
      (firestoreTasks, fromCache) => {
        setIsFromCache(fromCache);
        if (Array.isArray(firestoreTasks)) {
          // Merge with any local pending un-flushed offline tasks
          const merged = mergeWithOfflineQueue(firestoreTasks);
          setTasks(merged);
          saveStoredTasks(merged);
        }
      },
      (error) => {
        console.warn("Firestore tasks real-time error:", error);
      }
    );

    // 4. Subscribe to real-time Logs collection in Firebase Firestore
    const unsubscribeLogs = subscribeToLogsFirestore(
      (firestoreLogs, fromCache) => {
        setIsFromCache(fromCache);
        if (Array.isArray(firestoreLogs) && firestoreLogs.length > 0) {
          setLogs(firestoreLogs);
          saveStoredLogs(firestoreLogs);
        }
      },
      (error) => {
        console.warn("Firestore logs real-time error:", error);
      }
    );

    // 5. Handle coming online: flush queue immediately to Firestore
    const handleOnline = () => {
      triggerFlushOffline();
    };
    const handleOffline = () => {
      setPendingCount(getPendingQueueCount());
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Periodic check to flush offline items if online (e.g. when mobile browser or PWA resumes from background)
    const syncInterval = setInterval(() => {
      if (navigator.onLine && getPendingQueueCount() > 0) {
        triggerFlushOffline();
      }
    }, 4000);

    return () => {
      unsubscribeTasks();
      unsubscribeLogs();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(syncInterval);
    };
  }, [triggerFlushOffline, mergeWithOfflineQueue]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));

    const newLogItem: ActivityLog = {
      id: "log-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      operator: user.username,
      action: "created",
      taskTitle: "Tizimga kirish",
      details: `${user.name} (${user.role}) tizimga muvaffaqiyatli kirdi.`,
    };

    addActivityLog(newLogItem);
    const currentLogs = getStoredLogs();
    setLogs(currentLogs);

    if (navigator.onLine) {
      saveActivityLogFirestore(newLogItem).catch(() => enqueueSaveLog(newLogItem));
    } else {
      enqueueSaveLog(newLogItem);
      setPendingCount(getPendingQueueCount());
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(USER_SESSION_KEY);
  };

  // Task Operations
  const handleSaveTask = async (
    taskData: Omit<Task, "id" | "createdAt" | "createdBy" | "history">
  ) => {
    const creatorUsername = currentUser?.username || "operator1";
    let updated: Task[] = [];
    let savedTaskObj: Task;

    if (editingTask) {
      // Edit existing task
      savedTaskObj = {
        ...editingTask,
        ...taskData,
        createdBy: editingTask.createdBy || creatorUsername,
      };

      updated = tasks.map((t) => (t.id === editingTask.id ? savedTaskObj : t));
      setTasks(updated);
      saveStoredTasks(updated);

      const logItem: ActivityLog = {
        id: "log-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
        timestamp: new Date().toISOString(),
        operator: creatorUsername,
        action: "edited",
        taskTitle: taskData.title,
        details: "Vazifa ma'lumotlari va amallari tahrirlandi.",
      };

      addActivityLog(logItem);
      setEditingTask(null);

      // Write directly to Firebase Firestore if online, otherwise enqueue offline
      if (navigator.onLine) {
        try {
          await saveTaskFirestore(savedTaskObj);
          await saveActivityLogFirestore(logItem);
        } catch {
          enqueueSaveTask(savedTaskObj);
          enqueueSaveLog(logItem);
        }
      } else {
        enqueueSaveTask(savedTaskObj);
        enqueueSaveLog(logItem);
      }
    } else {
      // Create new task
      savedTaskObj = {
        ...taskData,
        id: "task-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
        createdAt: new Date().toISOString(),
        createdBy: creatorUsername,
        history: [],
      };

      updated = [savedTaskObj, ...tasks];
      setTasks(updated);
      saveStoredTasks(updated);

      const logItem: ActivityLog = {
        id: "log-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
        timestamp: new Date().toISOString(),
        operator: creatorUsername,
        action: "created",
        taskTitle: savedTaskObj.title,
        details: `Yangi vazifa kiritildi (${savedTaskObj.priority}, muddat: ${savedTaskObj.dueDate}). Muallif: ${creatorUsername}.`,
      };

      addActivityLog(logItem);

      // Write directly to Firebase Firestore if online, otherwise enqueue offline
      if (navigator.onLine) {
        try {
          await saveTaskFirestore(savedTaskObj);
          await saveActivityLogFirestore(logItem);
        } catch {
          enqueueSaveTask(savedTaskObj);
          enqueueSaveLog(logItem);
        }
      } else {
        enqueueSaveTask(savedTaskObj);
        enqueueSaveLog(logItem);
      }
    }

    const currentLogs = getStoredLogs();
    setLogs(currentLogs);
    setPendingCount(getPendingQueueCount());
  };

  const handleToggleStep = (taskId: string, stepId: string) => {
    let targetedTask: Task | undefined;
    const updated = tasks.map((task) => {
      if (task.id === taskId) {
        const updatedSteps = (task.steps || []).map((step) => {
          if (step.id === stepId) {
            return { ...step, completed: !step.completed };
          }
          return step;
        });
        const updatedTask = { ...task, steps: updatedSteps };
        targetedTask = updatedTask;
        return updatedTask;
      }
      return task;
    });

    setTasks(updated);
    saveStoredTasks(updated);

    if (targetedTask) {
      if (navigator.onLine) {
        saveTaskFirestore(targetedTask).catch(() => {
          if (targetedTask) enqueueSaveTask(targetedTask);
        });
      } else {
        enqueueSaveTask(targetedTask);
        setPendingCount(getPendingQueueCount());
      }
    }
  };

  const handleConfirmComplete = (taskId: string, note: string) => {
    let completedTaskTitle = "";
    let spawnedTask: Task | null = null;
    let targetUpdatedTask: Task | null = null;

    const updated = tasks.map((task) => {
      if (task.id === taskId) {
        completedTaskTitle = task.title;

        // If it's a recurring task, calculate the next occurrence
        if (
          task.scheduleType === "daily" ||
          task.scheduleType === "every_3_days" ||
          task.scheduleType === "weekly" ||
          task.scheduleType === "monthly"
        ) {
          const baseDate = task.dueDate || getTodayString();
          let nextDueDate = baseDate;

          if (task.scheduleType === "daily") {
            nextDueDate = addDaysToDate(baseDate, 1);
          } else if (task.scheduleType === "every_3_days") {
            nextDueDate = addDaysToDate(baseDate, 3);
          } else if (task.scheduleType === "weekly") {
            nextDueDate = addDaysToDate(baseDate, 7);
          } else if (task.scheduleType === "monthly") {
            if (task.dateMode === "range" && task.monthlyEndDay) {
              nextDueDate = getNextMonthlyDate(task.monthlyEndDay);
            } else if (task.monthlyDay) {
              nextDueDate = getNextMonthlyDate(task.monthlyDay);
            } else {
              nextDueDate = addMonthsToDate(baseDate, 1);
            }
          }

          spawnedTask = {
            id: "task-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
            title: task.title,
            priority: task.priority,
            scheduleType: task.scheduleType,
            dateMode: task.dateMode,
            monthlyDay: task.monthlyDay,
            monthlyStartDay: task.monthlyStartDay,
            monthlyEndDay: task.monthlyEndDay,
            startDate: nextDueDate,
            dueDate: nextDueDate,
            dueTime: task.dueTime,
            estimatedDuration: task.estimatedDuration,
            status: "pending",
            isCompleted: false,
            createdAt: new Date().toISOString(),
            createdBy: task.createdBy || currentUser?.username || "operator1",
            steps: (task.steps || []).map((s, idx) => ({
              id: `step-${Date.now()}-${idx}`,
              text: s.text,
              completed: false,
              estimatedMinutes: s.estimatedMinutes,
            })),
            history: [],
          };
        }

        const compTask: Task = {
          ...task,
          isCompleted: true,
          completedAt: new Date().toISOString(),
          completionNote: note,
          completedBy: currentUser?.username || "operator",
          status: "completed" as const,
        };
        targetUpdatedTask = compTask;
        return compTask;
      }
      return task;
    });

    const finalTasks = spawnedTask ? [spawnedTask, ...updated] : updated;

    setTasks(finalTasks);
    saveStoredTasks(finalTasks);

    // Save completed task and spawned task to Firebase Firestore or Offline queue
    if (targetUpdatedTask) {
      if (navigator.onLine) {
        saveTaskFirestore(targetUpdatedTask).catch(() => {
          if (targetUpdatedTask) enqueueSaveTask(targetUpdatedTask);
        });
      } else {
        enqueueSaveTask(targetUpdatedTask);
      }
    }
    if (spawnedTask) {
      if (navigator.onLine) {
        saveTaskFirestore(spawnedTask).catch(() => {
          if (spawnedTask) enqueueSaveTask(spawnedTask);
        });
      } else {
        enqueueSaveTask(spawnedTask);
      }
    }

    const log1: ActivityLog = {
      id: "log-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      operator: currentUser?.username || "operator",
      action: "completed",
      taskTitle: completedTaskTitle,
      details: note ? `Izoh: ${note}` : "Muvaffaqiyatli bajarildi.",
    };

    addActivityLog(log1);
    if (navigator.onLine) {
      saveActivityLogFirestore(log1).catch(() => enqueueSaveLog(log1));
    } else {
      enqueueSaveLog(log1);
    }

    if (spawnedTask) {
      const log2: ActivityLog = {
        id: "log-" + (Date.now() + 1) + "-" + Math.random().toString(36).substring(2, 6),
        timestamp: new Date().toISOString(),
        operator: "Tizim",
        action: "created",
        taskTitle: (spawnedTask as Task).title,
        details: `Davriy takrorlanuvchi keyingi eslatma (${(spawnedTask as Task).dueDate}) avtomatik ro'yxatga qo'shildi.`,
      };
      addActivityLog(log2);
      if (navigator.onLine) {
        saveActivityLogFirestore(log2).catch(() => enqueueSaveLog(log2));
      } else {
        enqueueSaveLog(log2);
      }
    }

    const currentLogs = getStoredLogs();
    setLogs(currentLogs);
    setPendingCount(getPendingQueueCount());
  };

  const handleConfirmReschedule = (
    taskId: string,
    newDate: string,
    reason: string,
    newTime?: string,
    scope?: "temporary" | "permanent"
  ) => {
    let taskTitle = "";
    let targetedTask: Task | undefined;

    const updated = tasks.map((task) => {
      if (task.id === taskId) {
        taskTitle = task.title;
        const oldDate = task.dueDate;
        const historyItem = {
          id: "hist-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
          oldDate,
          newDate,
          reason,
          rescheduledAt: new Date().toISOString(),
          operator: currentUser?.name || currentUser?.username || "Operator",
          newTime: newTime || task.dueTime,
          scope: scope || "temporary",
        };

        const resTask: Task = {
          ...task,
          dueDate: newDate,
          dueTime: newTime || task.dueTime,
          status: "rescheduled" as const,
          history: [...(task.history || []), historyItem],
        };

        if (scope === "permanent" && task.scheduleType === "monthly") {
          try {
            const dayNum = parseInt(newDate.split("-")[2], 10);
            if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
              resTask.monthlyDay = dayNum;
            }
          } catch {
            // Keep unchanged if cannot parse
          }
        }

        targetedTask = resTask;
        return resTask;
      }
      return task;
    });

    setTasks(updated);
    saveStoredTasks(updated);

    if (targetedTask) {
      if (navigator.onLine) {
        saveTaskFirestore(targetedTask).catch(() => {
          if (targetedTask) enqueueSaveTask(targetedTask);
        });
      } else {
        enqueueSaveTask(targetedTask);
      }
    }

    const timeDetails = newTime ? `, soat: ${newTime}` : "";
    const scopeDetails = scope === "permanent" ? " (Doimiy)" : " (Faqat bu galgi)";
    const logItem: ActivityLog = {
      id: "log-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      operator: currentUser?.username || "operator",
      action: "rescheduled",
      taskTitle,
      details: `Yangi muddat: ${newDate}${timeDetails}${scopeDetails}. Sabab: ${reason}`,
    };

    addActivityLog(logItem);
    if (navigator.onLine) {
      saveActivityLogFirestore(logItem).catch(() => enqueueSaveLog(logItem));
    } else {
      enqueueSaveLog(logItem);
    }

    const currentLogs = getStoredLogs();
    setLogs(currentLogs);
    setPendingCount(getPendingQueueCount());
  };

  const handleConfirmHourReschedule = (
    taskId: string,
    newTime: string,
    reason?: string,
    scope?: "temporary" | "permanent"
  ) => {
    let taskTitle = "";
    let targetedTask: Task | undefined;

    const updated = tasks.map((task) => {
      if (task.id === taskId) {
        taskTitle = task.title;
        const oldTime = task.dueTime || "09:00";
        const historyItem = {
          id: "hist-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
          oldDate: task.dueDate,
          newDate: task.dueDate,
          reason: reason || `Soat o'zgartirildi (${oldTime} -> ${newTime})`,
          rescheduledAt: new Date().toISOString(),
          operator: currentUser?.name || currentUser?.username || "Operator",
          newTime,
          scope: scope || "temporary",
        };

        const resTask: Task = {
          ...task,
          dueTime: newTime,
          history: [...(task.history || []), historyItem],
        };
        targetedTask = resTask;
        return resTask;
      }
      return task;
    });

    setTasks(updated);
    saveStoredTasks(updated);

    if (targetedTask) {
      if (navigator.onLine) {
        saveTaskFirestore(targetedTask).catch(() => {
          if (targetedTask) enqueueSaveTask(targetedTask);
        });
      } else {
        enqueueSaveTask(targetedTask);
      }
    }

    const scopeDetails = scope === "permanent" ? " (Doimiy)" : " (Faqat bu galgi)";
    const logItem: ActivityLog = {
      id: "log-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      operator: currentUser?.username || "operator",
      action: "rescheduled",
      taskTitle,
      details: `Vazifa soati ${newTime} ga ko'chirildi${scopeDetails}.${reason ? ` Sabab: ${reason}` : ""}`,
    };

    addActivityLog(logItem);
    if (navigator.onLine) {
      saveActivityLogFirestore(logItem).catch(() => enqueueSaveLog(logItem));
    } else {
      enqueueSaveLog(logItem);
    }

    const currentLogs = getStoredLogs();
    setLogs(currentLogs);
    setPendingCount(getPendingQueueCount());
    setIsHourRescheduleModalOpen(false);
    setTaskForHourReschedule(null);
  };

  const handleDeleteTask = (taskId: string) => {
    const found = tasks.find((t) => t.id === taskId);
    if (!found) return;
    setTaskToDelete(found);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (taskId: string) => {
    const taskToRemove = tasks.find((t) => t.id === taskId);
    if (!taskToRemove) return;

    const updated = tasks.filter((t) => t.id !== taskId);
    setTasks(updated);
    saveStoredTasks(updated);

    // Delete directly from Firebase Firestore if online, or enqueue delete if offline
    if (navigator.onLine) {
      deleteTaskFirestore(taskId).catch(() => {
        enqueueDeleteTask(taskId);
      });
    } else {
      enqueueDeleteTask(taskId);
    }

    const logItem: ActivityLog = {
      id: "log-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      operator: currentUser?.username || "operator",
      action: "deleted",
      taskTitle: taskToRemove.title,
      details: "Vazifa tizimdan o'chirildi.",
    };

    addActivityLog(logItem);
    if (navigator.onLine) {
      saveActivityLogFirestore(logItem).catch(() => enqueueSaveLog(logItem));
    } else {
      enqueueSaveLog(logItem);
    }

    const currentLogs = getStoredLogs();
    setLogs(currentLogs);
    setPendingCount(getPendingQueueCount());
    setIsDeleteModalOpen(false);
    setTaskToDelete(null);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleClearLogs = () => {
    saveStoredLogs([]);
    setLogs([]);
    if (navigator.onLine) {
      clearAllLogsFirestore().catch(() => enqueueClearLogs());
    } else {
      enqueueClearLogs();
    }
    setPendingCount(getPendingQueueCount());
  };

  const todayStr = getTodayString();
  const todayCount = tasks.filter((t) => !t.isCompleted && t.dueDate === todayStr).length;
  const overdueCount = tasks.filter((t) => !t.isCompleted && t.dueDate < todayStr).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-blue-600 selection:text-white">
      {currentUser ? (
        <>
          {/* App Header */}
          <Header
            user={currentUser}
            onLogout={handleLogout}
            todayCount={todayCount}
            overdueCount={overdueCount}
            isSyncing={isSyncing}
            isFromCache={isFromCache}
            pendingCount={pendingCount}
            onTriggerSync={triggerFlushOffline}
            onOpenDailyAnalytics={() => setIsDailyAnalyticsOpen(true)}
            onOpenMonthlyAnalytics={() => setIsMonthlyAnalyticsOpen(true)}
            adminViewVersion={adminViewVersion}
            onChangeAdminViewVersion={setAdminViewVersion}
          />

          {/* Offline Pending Queue Notice Bar (if any offline items are pending sync) */}
          {pendingCount > 0 && (
            <div className="bg-amber-500 text-white text-xs font-semibold py-1.5 px-4 text-center shadow-xs flex items-center justify-center gap-2">
              <span>
                {pendingCount} ta amal oflayn xotirada saqlandi. Internet paydo bo'lgach, avtomatik ravishda Firebase bazasiga yuklanadi.
              </span>
              {navigator.onLine && (
                <button
                  type="button"
                  onClick={triggerFlushOffline}
                  disabled={isSyncing}
                  className="underline bg-amber-600 hover:bg-amber-700 px-2 py-0.5 rounded cursor-pointer transition-colors"
                >
                  {isSyncing ? "Yuklanmoqda..." : "Hozir yuklash"}
                </button>
              )}
            </div>
          )}

          {/* Main Content Body */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
            {currentUser.role === "admin" && adminViewVersion === "v1" ? (
              <AdminV1Dashboard tasks={tasks} />
            ) : (
              <OperatorDashboard
                tasks={tasks}
                logs={logs}
                currentUser={currentUser}
                onOpenNewTask={(defaultDate, defaultTime) => {
                  setEditingTask(null);
                  setNewTaskInitialDate(defaultDate);
                  setNewTaskInitialTime(defaultTime);
                  setIsTaskModalOpen(true);
                }}
                onToggleStep={handleToggleStep}
                onOpenCompleteModal={(t) => {
                  setTaskToComplete(t);
                  setIsCompleteModalOpen(true);
                }}
                onOpenRescheduleModal={(t) => {
                  setTaskToReschedule(t);
                  setIsRescheduleModalOpen(true);
                }}
                onOpenHourReschedule={(t) => {
                  setTaskForHourReschedule(t);
                  setIsHourRescheduleModalOpen(true);
                }}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                rolledOverCount={rolledOverCount}
                onClearLogs={handleClearLogs}
              />
            )}
          </main>

          {/* Task Creation & Edit Modal */}
          <TaskFormModal
            isOpen={isTaskModalOpen}
            onClose={() => {
              setIsTaskModalOpen(false);
              setEditingTask(null);
              setNewTaskInitialDate(undefined);
              setNewTaskInitialTime(undefined);
            }}
            onSaveTask={handleSaveTask}
            initialTask={editingTask}
            currentUser={currentUser}
            defaultDate={newTaskInitialDate}
            defaultTime={newTaskInitialTime}
            existingTasks={tasks}
          />

          {/* Complete Task Modal */}
          <CompleteTaskModal
            isOpen={isCompleteModalOpen}
            task={taskToComplete}
            onClose={() => {
              setIsCompleteModalOpen(false);
              setTaskToComplete(null);
            }}
            onConfirmComplete={handleConfirmComplete}
          />

          {/* Reschedule Task Modal */}
          <RescheduleTaskModal
            isOpen={isRescheduleModalOpen}
            task={taskToReschedule}
            existingTasksOnDate={tasks.filter((t) => taskToReschedule && t.id !== taskToReschedule.id)}
            onClose={() => {
              setIsRescheduleModalOpen(false);
              setTaskToReschedule(null);
            }}
            onConfirmReschedule={handleConfirmReschedule}
          />

          {/* Hour-specific Interactive Reschedule Modal */}
          <HourRescheduleModal
            isOpen={isHourRescheduleModalOpen}
            task={taskForHourReschedule}
            existingTasksOnDay={tasks.filter((t) => taskForHourReschedule && t.dueDate === taskForHourReschedule.dueDate)}
            onClose={() => {
              setIsHourRescheduleModalOpen(false);
              setTaskForHourReschedule(null);
            }}
            onConfirmHourReschedule={handleConfirmHourReschedule}
          />

          {/* Daily Analytics Modal */}
          <DailyAnalyticsModal
            isOpen={isDailyAnalyticsOpen}
            onClose={() => setIsDailyAnalyticsOpen(false)}
            tasks={tasks}
            onOpenMonthly={() => setIsMonthlyAnalyticsOpen(true)}
          />

          {/* Monthly Analytics Modal */}
          <MonthlyAnalyticsModal
            isOpen={isMonthlyAnalyticsOpen}
            onClose={() => setIsMonthlyAnalyticsOpen(false)}
            tasks={tasks}
            onOpenDaily={() => setIsDailyAnalyticsOpen(true)}
          />

          {/* Delete Confirm Modal */}
          <DeleteConfirmModal
            isOpen={isDeleteModalOpen}
            task={taskToDelete}
            onClose={() => {
              setIsDeleteModalOpen(false);
              setTaskToDelete(null);
            }}
            onConfirm={handleConfirmDelete}
          />
        </>
      ) : (
        <LoginForm onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;
