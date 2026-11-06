import React, { useState, useEffect, useCallback, useRef } from "react";
import { Task, ActivityLog, User } from "./types";
import {
  getStoredTasks,
  saveStoredTasks,
  getStoredLogs,
  saveStoredLogs,
  addActivityLog,
  checkAndPerformAutoRollover,
  detectAutoSpawnedGhostTasks,
  getTodayString,
  isTaskTrulyRecurring,
  getNextRecurringDate,
  rememberTaskAsTemplate,
  getDeletedTaskIds,
  markTasksAsDeleted,
  getCompletedTaskIds,
  markTasksAsCompleted,
  unmarkTaskCompleted,
} from "./services/storage";
import {
  subscribeToTasksFirestore,
  subscribeToLogsFirestore,
  saveTaskFirestore,
  saveTasksBatchFirestore,
  deleteTaskFirestore,
  deleteTasksBatchFirestore,
  saveActivityLogFirestore,
  clearAllLogsFirestore,
  syncDeletedIdsToCloud,
  syncCompletedIdsToCloud,
} from "./services/firebase";
import {
  enqueueSaveTask,
  enqueueDeleteTask,
  enqueueDeleteTasksBatch,
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

  // Track whether we have received a confirmed live snapshot from Firestore server
  const hasLiveSnapshotRef = useRef<boolean>(false);
  const logsRef = useRef<ActivityLog[]>(logs);
  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);

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

  // Merge Firestore cloud tasks with locally pending offline mutations and tombstones
  const mergeWithOfflineQueue = useCallback((cloudTasks: Task[]): Task[] => {
    const queue = getOfflineQueue();
    const deletedSet = getDeletedTaskIds();
    const completedSet = getCompletedTaskIds();
    const map = new Map<string, Task>();

    // 1. Add all non-deleted cloud tasks
    cloudTasks.forEach((t) => {
      if (t && t.id && !deletedSet.has(t.id) && !(t as Task & { isDeleted?: boolean }).isDeleted) {
        if (completedSet.has(t.id) && !t.isCompleted) {
          map.set(t.id, { ...t, isCompleted: true, status: "completed" });
        } else {
          map.set(t.id, t);
        }
      }
    });

    // 2. Apply queued operations
    queue.forEach((mutation) => {
      if (mutation.type === "save_task" && mutation.task) {
        if (!deletedSet.has(mutation.task.id)) {
          if (completedSet.has(mutation.task.id) && !mutation.task.isCompleted) {
            map.set(mutation.task.id, {
              ...mutation.task,
              isCompleted: true,
              status: "completed",
            });
          } else {
            map.set(mutation.task.id, mutation.task);
          }
        }
      } else if (mutation.type === "delete_task" && mutation.taskId) {
        map.delete(mutation.taskId);
      }
    });

    return Array.from(map.values());
  }, []);

  // Initial load and Real-time Firebase Firestore Listeners
  useEffect(() => {
    // 1. Load local state without pushing unverified stale localStorage rollovers to Firestore
    const initialLocalTasks = getStoredTasks();
    const initialLocalLogs = getStoredLogs();

    setTasks(initialLocalTasks);
    setLogs(initialLocalLogs);
    setPendingCount(getPendingQueueCount());

    // 2. If online, flush any pending offline mutations immediately
    if (navigator.onLine) {
      triggerFlushOffline();
    }

    // 3. Subscribe to real-time Tasks collection in Firebase Firestore (Universal Source of Truth)
    const unsubscribeTasks = subscribeToTasksFirestore(
      (firestoreTasks, fromCache) => {
        setIsFromCache(fromCache);
        if (!fromCache) {
          hasLiveSnapshotRef.current = true;
        }

        if (Array.isArray(firestoreTasks)) {
          // Merge with any local pending un-flushed offline tasks and tombstones
          let merged = mergeWithOfflineQueue(firestoreTasks);

          // Automatically detect and purge any ghost tasks that were previously auto-spawned on completion
          const ghostIds = detectAutoSpawnedGhostTasks(merged, logsRef.current);
          if (ghostIds.length > 0) {
            markTasksAsDeleted(ghostIds);
            const ghostSet = new Set(ghostIds);
            merged = merged.filter((t) => !ghostSet.has(t.id));
            if (!fromCache && navigator.onLine) {
              deleteTasksBatchFirestore(ghostIds).catch(() => {
                enqueueDeleteTasksBatch(ghostIds);
              });
            }
          }

          // Only perform and persist auto-rollover once we have a live snapshot (!fromCache)
          // or if offline
          if (!fromCache || !navigator.onLine) {
            const {
              updatedTasks: rolledMerged,
              rolledCount: incomingRolled,
              changedTasks: incomingChanged,
            } = checkAndPerformAutoRollover(merged);

            setTasks(rolledMerged);
            saveStoredTasks(rolledMerged);

            if (!fromCache && incomingChanged.length > 0) {
              if (incomingRolled > 0) {
                setRolledOverCount((prev) => prev + incomingRolled);
              }
              if (navigator.onLine) {
                saveTasksBatchFirestore(incomingChanged).catch(() => {
                  incomingChanged.forEach((t) => enqueueSaveTask(t));
                });
              } else {
                incomingChanged.forEach((t) => enqueueSaveTask(t));
              }
            }
          } else {
            setTasks(merged);
          }
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
          logsRef.current = firestoreLogs;
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

    // Periodic check to flush offline items if online
    const syncInterval = setInterval(() => {
      if (navigator.onLine && getPendingQueueCount() > 0) {
        triggerFlushOffline();
      }
    }, 4000);

    // Periodic check (every 15 seconds) to roll over uncompleted overdue tasks ONLY after live snapshot is confirmed
    const rolloverInterval = setInterval(() => {
      if (navigator.onLine && !hasLiveSnapshotRef.current) return;
      setTasks((currentTasks) => {
        const today = getTodayString();
        const deletedSet = getDeletedTaskIds();
        const completedSet = getCompletedTaskIds();
        const hasOverdueUncompleted = currentTasks.some(
          (t) =>
            !t.isCompleted &&
            t.status !== "completed" &&
            !completedSet.has(t.id) &&
            !deletedSet.has(t.id) &&
            t.dueDate < today
        );
        if (hasOverdueUncompleted) {
          const { updatedTasks: rolled, rolledCount: count, changedTasks: changed } =
            checkAndPerformAutoRollover(currentTasks);
          if (count > 0 && changed.length > 0) {
            setRolledOverCount((prev) => prev + count);
            if (navigator.onLine && hasLiveSnapshotRef.current) {
              saveTasksBatchFirestore(changed).catch(() => {
                changed.forEach((t) => enqueueSaveTask(t));
              });
            } else if (!navigator.onLine) {
              changed.forEach((t) => enqueueSaveTask(t));
            }
            return rolled;
          }
        }
        return currentTasks;
      });
    }, 15000);

    const handleVisibilityOrFocus = () => {
      if (navigator.onLine && !hasLiveSnapshotRef.current) return;
      setTasks((currentTasks) => {
        const today = getTodayString();
        const deletedSet = getDeletedTaskIds();
        const completedSet = getCompletedTaskIds();
        const hasOverdueUncompleted = currentTasks.some(
          (t) =>
            !t.isCompleted &&
            t.status !== "completed" &&
            !completedSet.has(t.id) &&
            !deletedSet.has(t.id) &&
            t.dueDate < today
        );
        if (hasOverdueUncompleted) {
          const { updatedTasks: rolled, rolledCount: count, changedTasks: changed } =
            checkAndPerformAutoRollover(currentTasks);
          if (count > 0 && changed.length > 0) {
            setRolledOverCount((prev) => prev + count);
            if (navigator.onLine && hasLiveSnapshotRef.current) {
              saveTasksBatchFirestore(changed).catch(() => {
                changed.forEach((t) => enqueueSaveTask(t));
              });
            } else if (!navigator.onLine) {
              changed.forEach((t) => enqueueSaveTask(t));
            }
            return rolled;
          }
        }
        return currentTasks;
      });
    };

    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);

    return () => {
      unsubscribeTasks();
      unsubscribeLogs();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      clearInterval(syncInterval);
      clearInterval(rolloverInterval);
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

    rememberTaskAsTemplate(savedTaskObj);

    const currentLogs = getStoredLogs();
    setLogs(currentLogs);
    setPendingCount(getPendingQueueCount());
  };

  const handleToggleStep = (
    taskId: string,
    stepId: string,
    actualMinutes?: number,
    completeEntireTask?: boolean
  ) => {
    let targetedTask: Task | undefined;
    let spawnedRecurringTask: Task | null = null;
    let willAllBeCompleted = false;
    const today = getTodayString();
    const nowIso = new Date().toISOString();

    const updated = tasks.map((task) => {
      if (task.id === taskId) {
        const updatedSteps = (task.steps || []).map((step) => {
          if (step.id === stepId) {
            const nextCompleted = !step.completed;
            return {
              ...step,
              completed: nextCompleted,
              actualMinutes: nextCompleted
                ? (typeof actualMinutes === "number" ? actualMinutes : step.actualMinutes)
                : undefined,
              completedAt: nextCompleted ? nowIso : undefined,
            };
          }
          return completeEntireTask ? { ...step, completed: true, completedAt: step.completedAt || nowIso } : step;
        });

        const isNowAllCompleted =
          updatedSteps.length > 0 && updatedSteps.every((s) => s.completed);
        const wasTaskCompleted = task.isCompleted;

        let newIsCompleted = task.isCompleted;
        let newStatus = task.status;
        let newActualDuration = task.actualDuration;
        let newCompletedAt = task.completedAt;
        let newCompletedBy = task.completedBy;

        // Foydalanuvchi oxirgi amalni ham tick qilib barcha amallarni tugatganida yoki butun vazifani yakunlashni tanlaganida:
        // Darhol bajarildi (isCompleted: true) holatiga o'tkazamiz (ertasi kuni kechikkan bo'lib qaytib chiqmasligi uchun!)
        if ((isNowAllCompleted || completeEntireTask) && !wasTaskCompleted) {
          willAllBeCompleted = true;
          newIsCompleted = true;
          newStatus = "completed";
          newCompletedAt = nowIso;
          newCompletedBy = currentUser?.username || "operator";
          markTasksAsCompleted([task.id]);
          syncCompletedIdsToCloud([task.id]).catch(() => {});

          // Agar vazifa haqiqatan davriy takrorlanuvchi bo'lsa (daily, every_3_days, weekly, monthly),
          // izoh modali yopib yuborilgan taqdirda ham keyingi muddat uchun nusxasi ochilishini ta'minlaymiz
          const nextDueDate = getNextRecurringDate(task, today);
          if (nextDueDate && isTaskTrulyRecurring(task)) {
            const alreadyExists = tasks.some(
              (t) =>
                t.id !== task.id &&
                !t.isCompleted &&
                t.title.trim().toLowerCase() === task.title.trim().toLowerCase() &&
                t.dueDate >= nextDueDate
            );
            if (!alreadyExists) {
              spawnedRecurringTask = {
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
                createdAt: nowIso,
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
          }
        } else if (wasTaskCompleted && !isNowAllCompleted && !completeEntireTask) {
          // Agar avval bajarilgan vazifaning biror amali tick'dan chiqarilsa (uncheck):
          newIsCompleted = false;
          newStatus = "pending";
          newActualDuration = undefined;
          newCompletedAt = undefined;
          unmarkTaskCompleted(task.id);
          syncCompletedIdsToCloud([], [task.id]).catch(() => {});
        }

        const updatedTask: Task = {
          ...task,
          steps: updatedSteps,
          isCompleted: newIsCompleted,
          status: newStatus,
          actualDuration: newActualDuration,
          completedAt: newCompletedAt,
          completedBy: newCompletedBy,
        };
        targetedTask = updatedTask;
        return updatedTask;
      }
      return task;
    });

    const finalTasks = spawnedRecurringTask ? [spawnedRecurringTask, ...updated] : updated;
    setTasks(finalTasks);
    saveStoredTasks(finalTasks);

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

    if (spawnedRecurringTask) {
      const toSaveSpawned: Task = spawnedRecurringTask;
      if (navigator.onLine) {
        saveTaskFirestore(toSaveSpawned).catch(() => {
          enqueueSaveTask(toSaveSpawned);
        });
      } else {
        enqueueSaveTask(toSaveSpawned);
        setPendingCount(getPendingQueueCount());
      }
    }

    // Amallarni tick qilib belgilab bajarildi deb qo'yganda:
    // Qo'shimcha izoh va sarflangan vaqtni kiritish modali ochiladi (lekin vazifa allaqachon Bajarildi sifatida saqlangan bo'ladi)
    if (willAllBeCompleted && targetedTask) {
      setTaskToComplete(targetedTask);
      setIsCompleteModalOpen(true);
    }
  };

  const handleConfirmComplete = (
    taskId: string,
    note: string,
    actualDuration?: number,
    spawnNext?: boolean
  ) => {
    markTasksAsCompleted([taskId]);
    syncCompletedIdsToCloud([taskId]).catch(() => {});

    let completedTaskTitle = "";
    let spawnedTask: Task | null = null;
    let targetUpdatedTask: Task | null = null;
    let taskEstimatedDuration: number | undefined;
    let cancelledRecurringTitle: string | null = null;
    const today = getTodayString();
    const nowIso = new Date().toISOString();

    const updated = tasks.map((task) => {
      if (task.id === taskId) {
        completedTaskTitle = task.title;
        taskEstimatedDuration = task.estimatedDuration;

        const isRecurring = isTaskTrulyRecurring(task);
        const shouldSpawnNext = spawnNext !== undefined ? spawnNext : isRecurring;
        const nextDueDate = getNextRecurringDate(task, today);

        // Davriy vazifalar (daily, every_3_days, weekly, monthly) uchun keyingi muddatga yangi vazifa ochamiz;
        // Bir martalik vazifalar ("once" yoki "Takrorlanmas ish") uchun esa hech qachon yangi nusxa ochilmaydi!
        if (shouldSpawnNext && isRecurring && nextDueDate) {
          const alreadyExists = tasks.some(
            (t) =>
              t.id !== task.id &&
              !t.isCompleted &&
              t.title.trim().toLowerCase() === task.title.trim().toLowerCase() &&
              t.dueDate >= nextDueDate
          );

          if (!alreadyExists) {
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
              createdAt: nowIso,
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
        } else if (isRecurring && spawnNext === false) {
          // Foydalanuvchi modalda keyingi kunga takrorlashni o'chirgan bo'lsa, vazifani bir martalikka aylantiramiz
          cancelledRecurringTitle = task.title.trim().toLowerCase();
        }

        const compTask: Task = {
          ...task,
          scheduleType: !shouldSpawnNext ? "once" : task.scheduleType,
          steps: (task.steps || []).map((s) => ({ ...s, completed: true })),
          isCompleted: true,
          completedAt: nowIso,
          completionNote: note,
          completedBy: currentUser?.username || "operator",
          status: "completed" as const,
          ...(typeof actualDuration === "number" && actualDuration >= 0
            ? { actualDuration }
            : {}),
        };
        targetUpdatedTask = compTask;
        return compTask;
      }
      return task;
    });

    let finalTasks = spawnedTask ? [spawnedTask, ...updated] : updated;

    // Agar foydalanuvchi takrorlashni bekor qilgan bo'lsa (spawnNext === false), oldinroq ochilgan kelgusi nusxasini ham tozalaymiz
    if (cancelledRecurringTitle) {
      const idsToCancel = finalTasks
        .filter(
          (t) =>
            t.id !== taskId &&
            !t.isCompleted &&
            t.title.trim().toLowerCase() === cancelledRecurringTitle &&
            t.dueDate > today
        )
        .map((t) => t.id);

      if (idsToCancel.length > 0) {
        markTasksAsDeleted(idsToCancel);
        syncDeletedIdsToCloud(idsToCancel).catch(() => {});
        const cancelSet = new Set(idsToCancel);
        finalTasks = finalTasks.filter((t) => !cancelSet.has(t.id));
        if (navigator.onLine) {
          deleteTasksBatchFirestore(idsToCancel).catch(() => {
            enqueueDeleteTasksBatch(idsToCancel);
          });
        } else {
          enqueueDeleteTasksBatch(idsToCancel);
        }
      }
    }

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

    let detailsText = "";
    if (typeof actualDuration === "number") {
      detailsText = `Sarflangan vaqt: ${actualDuration} daqiqa`;
      if (taskEstimatedDuration) {
        const diff = taskEstimatedDuration - actualDuration;
        if (diff > 0) {
          detailsText += ` (${diff} daqiqa tejaldi, reja: ${taskEstimatedDuration} daq)`;
        } else if (diff < 0) {
          detailsText += ` (+${Math.abs(diff)} daqiqa ortiqcha, reja: ${taskEstimatedDuration} daq)`;
        } else {
          detailsText += ` (rejadagidek: ${taskEstimatedDuration} daq)`;
        }
      }
      if (note) detailsText += `. Izoh: ${note}`;
    } else {
      detailsText = note ? `Izoh: ${note}` : "Muvaffaqiyatli bajarildi.";
    }

    const log1: ActivityLog = {
      id: "log-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      timestamp: nowIso,
      operator: currentUser?.username || "operator",
      action: "completed",
      taskTitle: completedTaskTitle,
      details: detailsText,
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
        timestamp: nowIso,
        operator: "Tizim",
        action: "created",
        taskTitle: (spawnedTask as Task).title,
        details: `Davriy takrorlanuvchi keyingi eslatma (${(spawnedTask as Task).dueDate}) ro'yxatga qo'shildi.`,
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

    const cleanTitle = (taskToRemove.title || "").trim().toLowerCase();

    // Also include any uncompleted duplicate/spawned copies of this exact task so it never comes back tomorrow
    const duplicateUncompletedIds = tasks
      .filter(
        (t) =>
          t.id !== taskId &&
          !t.isCompleted &&
          (t.title || "").trim().toLowerCase() === cleanTitle
      )
      .map((t) => t.id);

    const allIdsToDelete = Array.from(new Set([taskId, ...duplicateUncompletedIds]));

    // Permanently tombstone all deleted task IDs locally and in Firestore
    markTasksAsDeleted(allIdsToDelete);
    syncDeletedIdsToCloud(allIdsToDelete).catch(() => {});

    const deleteSet = new Set(allIdsToDelete);
    const updated = tasks.filter((t) => !deleteSet.has(t.id));
    setTasks(updated);
    saveStoredTasks(updated);

    // Delete directly from Firebase Firestore if online, or enqueue delete if offline
    if (navigator.onLine) {
      if (allIdsToDelete.length === 1) {
        deleteTaskFirestore(taskId).catch(() => {
          enqueueDeleteTask(taskId);
        });
      } else {
        deleteTasksBatchFirestore(allIdsToDelete).catch(() => {
          enqueueDeleteTasksBatch(allIdsToDelete);
        });
      }
    } else {
      enqueueDeleteTasksBatch(allIdsToDelete);
    }

    const logItem: ActivityLog = {
      id: "log-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      operator: currentUser?.username || "operator",
      action: "deleted",
      taskTitle: taskToRemove.title,
      details:
        allIdsToDelete.length > 1
          ? `Vazifa va uning ${allIdsToDelete.length - 1} ta takroriy nusxasi tizimdan butunlay o'chirildi.`
          : "Vazifa tizimdan butunlay o'chirildi.",
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

  const handleBulkCompleteTasks = (taskIds: string[], note?: string) => {
    if (!taskIds || taskIds.length === 0) return;
    const idSet = new Set(taskIds);
    markTasksAsCompleted(taskIds);
    syncCompletedIdsToCloud(taskIds).catch(() => {});

    const today = getTodayString();
    const nowIso = new Date().toISOString();
    const operatorName = currentUser?.username || "operator";
    const changedTasks: Task[] = [];
    const spawnedTasks: Task[] = [];
    const spawnedKeys = new Set<string>();

    // Ommaviy "Bajarildi" qilinganda:
    // - Bir martalik vazifalar ("once" yoki "Takrorlanmas ish") butunlay yopiladi va qaytib chiqmaydi.
    // - Davriy takrorlanuvchi vazifalar (daily, every_3_days, weekly, monthly) uchun esa keyingi muddatga yangi eslatma yaratiladi.
    const updated = tasks.map((task) => {
      if (!idSet.has(task.id) || task.isCompleted) {
        return task;
      }

      const nextDueDate = getNextRecurringDate(task, today);
      if (nextDueDate && isTaskTrulyRecurring(task)) {
        const cleanTitle = task.title.trim().toLowerCase();
        const recKey = `${cleanTitle}__${nextDueDate}`;
        const alreadyExists =
          spawnedKeys.has(recKey) ||
          tasks.some(
            (t) =>
              !idSet.has(t.id) &&
              !t.isCompleted &&
              t.title.trim().toLowerCase() === cleanTitle &&
              t.dueDate >= nextDueDate
          );

        if (!alreadyExists) {
          spawnedKeys.add(recKey);
          const nextTask: Task = {
            id: "task-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7) + "-" + spawnedTasks.length,
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
            createdAt: nowIso,
            createdBy: task.createdBy || operatorName,
            steps: (task.steps || []).map((s, idx) => ({
              id: `step-${Date.now()}-${idx}-${spawnedTasks.length}`,
              text: s.text,
              completed: false,
              estimatedMinutes: s.estimatedMinutes,
            })),
            history: [],
          };
          spawnedTasks.push(nextTask);
        }
      }

      const compTask: Task = {
        ...task,
        steps: (task.steps || []).map((s) => ({ ...s, completed: true })),
        isCompleted: true,
        completedAt: nowIso,
        completionNote: note || "Ommaviy ravishda bajarildi deb belgilandi",
        completedBy: operatorName,
        status: "completed",
      };
      changedTasks.push(compTask);
      return compTask;
    });

    const finalTasks = [...spawnedTasks, ...updated];
    setTasks(finalTasks);
    saveStoredTasks(finalTasks);

    const allToPersist = [...changedTasks, ...spawnedTasks];
    if (allToPersist.length > 0) {
      if (navigator.onLine) {
        saveTasksBatchFirestore(allToPersist).catch(() => {
          allToPersist.forEach((t) => enqueueSaveTask(t));
        });
      } else {
        allToPersist.forEach((t) => enqueueSaveTask(t));
      }
    }

    const logItem: ActivityLog = {
      id: "log-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      timestamp: nowIso,
      operator: operatorName,
      action: "completed",
      taskTitle: `${changedTasks.length} ta vazifa`,
      details: `Jadval orqali birdaniga ${changedTasks.length} ta vazifa "Bajarildi" deb belgilandi.${note ? ` Izoh: ${note}` : ""}`,
    };

    addActivityLog(logItem);
    if (navigator.onLine) {
      saveActivityLogFirestore(logItem).catch(() => enqueueSaveLog(logItem));
    } else {
      enqueueSaveLog(logItem);
    }

    setLogs(getStoredLogs());
    setPendingCount(getPendingQueueCount());
  };

  const handleBulkDeleteTasks = (taskIds: string[]) => {
    if (!taskIds || taskIds.length === 0) return;
    const initialSet = new Set(taskIds);

    // Find titles of selected tasks so any uncompleted auto-spawned duplicate copies are also purged
    const selectedTitles = new Set(
      tasks
        .filter((t) => initialSet.has(t.id))
        .map((t) => (t.title || "").trim().toLowerCase())
        .filter(Boolean)
    );

    const duplicateUncompletedIds = tasks
      .filter(
        (t) =>
          !initialSet.has(t.id) &&
          !t.isCompleted &&
          selectedTitles.has((t.title || "").trim().toLowerCase())
      )
      .map((t) => t.id);

    const allIdsToDelete = Array.from(new Set([...taskIds, ...duplicateUncompletedIds]));
    const deleteSet = new Set(allIdsToDelete);

    // Permanently tombstone all deleted task IDs locally and in Firestore
    markTasksAsDeleted(allIdsToDelete);
    syncDeletedIdsToCloud(allIdsToDelete).catch(() => {});

    const removedTitles = tasks
      .filter((t) => initialSet.has(t.id))
      .map((t) => t.title)
      .slice(0, 3)
      .join(", ");

    const updated = tasks.filter((t) => !deleteSet.has(t.id));
    setTasks(updated);
    saveStoredTasks(updated);

    if (navigator.onLine) {
      deleteTasksBatchFirestore(allIdsToDelete).catch(() => {
        enqueueDeleteTasksBatch(allIdsToDelete);
      });
    } else {
      enqueueDeleteTasksBatch(allIdsToDelete);
    }

    const logItem: ActivityLog = {
      id: "log-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      operator: currentUser?.username || "operator",
      action: "deleted",
      taskTitle: `${taskIds.length} ta vazifa (${removedTitles}${taskIds.length > 3 ? "..." : ""})`,
      details: `Jadval orqali tanlangan ${allIdsToDelete.length} ta vazifa tizimdan butunlay o'chirildi.`,
    };

    addActivityLog(logItem);
    if (navigator.onLine) {
      saveActivityLogFirestore(logItem).catch(() => enqueueSaveLog(logItem));
    } else {
      enqueueSaveLog(logItem);
    }

    setLogs(getStoredLogs());
    setPendingCount(getPendingQueueCount());
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
              <AdminV1Dashboard
                tasks={tasks}
                onOpenTaskDetails={(task) => {
                  setEditingTask(task);
                  setIsTaskModalOpen(true);
                }}
              />
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
                onBulkCompleteTasks={handleBulkCompleteTasks}
                onBulkDeleteTasks={handleBulkDeleteTasks}
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
