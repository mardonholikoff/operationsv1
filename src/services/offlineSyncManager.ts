import { Task, ActivityLog } from "../types";
import {
  saveTaskFirestore,
  deleteTaskFirestore,
  saveActivityLogFirestore,
  clearAllLogsFirestore,
} from "./firebase";

const OFFLINE_QUEUE_KEY = "vazifalar_offline_mutations_queue_v4";

export interface OfflineMutation {
  id: string;
  type: "save_task" | "delete_task" | "save_log" | "clear_logs";
  task?: Task;
  taskId?: string;
  log?: ActivityLog;
  timestamp: string;
}

/**
 * Retrieve all pending offline operations from persistent storage (localStorage)
 */
export function getOfflineQueue(): OfflineMutation[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to read offline queue:", e);
    return [];
  }
}

/**
 * Save offline operations queue to persistent storage
 */
export function saveOfflineQueue(queue: OfflineMutation[]): void {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error("Failed to save offline queue:", e);
  }
}

/**
 * Enqueue a task save (create or update) when offline
 */
export function enqueueSaveTask(task: Task): void {
  const queue = getOfflineQueue();
  // If there is already a pending save for this task, update it
  const existingIdx = queue.findIndex(
    (item) => item.type === "save_task" && item.task?.id === task.id
  );

  // If there was a pending delete for this task, remove it
  const filtered = queue.filter(
    (item) => !(item.type === "delete_task" && item.taskId === task.id)
  );

  const mutation: OfflineMutation = {
    id: "mut-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
    type: "save_task",
    task,
    timestamp: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    filtered[existingIdx] = mutation;
  } else {
    filtered.push(mutation);
  }

  saveOfflineQueue(filtered);
}

/**
 * Enqueue a task delete when offline
 */
export function enqueueDeleteTask(taskId: string): void {
  const queue = getOfflineQueue();
  // Remove any pending saves for this task as it is now deleted
  const filtered = queue.filter(
    (item) => !(item.type === "save_task" && item.task?.id === taskId)
  );

  filtered.push({
    id: "mut-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
    type: "delete_task",
    taskId,
    timestamp: new Date().toISOString(),
  });

  saveOfflineQueue(filtered);
}

/**
 * Enqueue an activity log save when offline
 */
export function enqueueSaveLog(log: ActivityLog): void {
  const queue = getOfflineQueue();
  queue.push({
    id: "mut-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
    type: "save_log",
    log,
    timestamp: new Date().toISOString(),
  });
  saveOfflineQueue(queue);
}

/**
 * Enqueue a clear logs mutation
 */
export function enqueueClearLogs(): void {
  const queue = getOfflineQueue();
  const filtered = queue.filter((item) => item.type !== "save_log");
  filtered.push({
    id: "mut-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
    type: "clear_logs",
    timestamp: new Date().toISOString(),
  });
  saveOfflineQueue(filtered);
}

/**
 * Returns the number of pending un-synced offline items
 */
export function getPendingQueueCount(): number {
  return getOfflineQueue().length;
}

/**
 * Clear the entire offline queue
 */
export function clearOfflineQueue(): void {
  try {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  } catch {}
}

/**
 * Flush all offline queued mutations to Firebase Firestore once online.
 * Executes each queued operation in sequence and removes it upon success.
 */
let isFlushing = false;

export async function flushOfflineQueue(
  onStatusChange?: (isSyncing: boolean, pendingCount: number) => void
): Promise<{ success: boolean; processed: number; remaining: number }> {
  if (isFlushing) {
    return { success: false, processed: 0, remaining: getPendingQueueCount() };
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { success: false, processed: 0, remaining: getPendingQueueCount() };
  }

  const queue = getOfflineQueue();
  if (queue.length === 0) {
    return { success: true, processed: 0, remaining: 0 };
  }

  isFlushing = true;
  if (onStatusChange) onStatusChange(true, queue.length);

  const remainingQueue: OfflineMutation[] = [];
  let processed = 0;

  for (const mutation of queue) {
    try {
      if (mutation.type === "save_task" && mutation.task) {
        await saveTaskFirestore(mutation.task);
        processed++;
      } else if (mutation.type === "delete_task" && mutation.taskId) {
        await deleteTaskFirestore(mutation.taskId);
        processed++;
      } else if (mutation.type === "save_log" && mutation.log) {
        await saveActivityLogFirestore(mutation.log);
        processed++;
      } else if (mutation.type === "clear_logs") {
        await clearAllLogsFirestore();
        processed++;
      }
    } catch (err) {
      console.warn("Failed to flush offline mutation, keeping in queue:", mutation, err);
      // Keep mutation in queue to retry next time
      remainingQueue.push(mutation);
    }
  }

  saveOfflineQueue(remainingQueue);
  isFlushing = false;

  if (onStatusChange) onStatusChange(false, remainingQueue.length);

  return {
    success: remainingQueue.length === 0,
    processed,
    remaining: remainingQueue.length,
  };
}
