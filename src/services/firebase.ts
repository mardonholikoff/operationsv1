import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, signInAnonymously, Auth } from "firebase/auth";
import {
  Firestore,
  initializeFirestore,
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  writeBatch,
  getDocs,
  arrayUnion,
  arrayRemove,
  FirestoreError,
} from "firebase/firestore";
import { Task, ActivityLog } from "../types";
import {
  getDeletedTaskIds,
  markTasksAsDeleted,
  getCompletedTaskIds,
  markTasksAsCompleted,
} from "./storage";
import firebaseConfigData from "../../firebase-applet-config.json";

// Initialize Firebase App
const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId,
};

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Seamlessly authenticate anonymously across all devices/PWA
let auth: Auth;
try {
  auth = getAuth(app);
  signInAnonymously(auth).catch((authErr) => {
    console.warn("Firebase Auth anonymous sign-in info:", authErr);
  });
} catch (e) {
  console.warn("Auth initialization info:", e);
}

// Initialize Firestore for the specified databaseId with ignoreUndefinedProperties
const databaseId =
  firebaseConfigData.firestoreDatabaseId &&
  firebaseConfigData.firestoreDatabaseId !== "(default)"
    ? firebaseConfigData.firestoreDatabaseId
    : undefined;

let db: Firestore;
try {
  db = databaseId
    ? initializeFirestore(app, { ignoreUndefinedProperties: true }, databaseId)
    : initializeFirestore(app, { ignoreUndefinedProperties: true });
} catch {
  db = getFirestore(app, databaseId);
}

export { db, app, auth };

const TASKS_COLLECTION = "tasks";
const LOGS_COLLECTION = "activity_logs";
const META_COLLECTION = "system_meta";
const TOMBSTONES_DOC_ID = "tombstones";

/**
 * Recursively strips `undefined` properties from any object/array before writing to Firestore
 * so `setDoc` and `batch.set` never fail with `Unsupported field value: undefined`.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (value !== undefined) {
        result[key] = sanitizeForFirestore(value);
      }
    }
    return result as T;
  }
  return data;
}

/**
 * Syncs deleted task IDs to cloud Firestore tombstones so no other device/tab can ever resurrect them
 */
export async function syncDeletedIdsToCloud(taskIds: string[]): Promise<void> {
  if (!taskIds || taskIds.length === 0) return;
  try {
    const cleanIds = taskIds.filter(Boolean);
    if (cleanIds.length === 0) return;
    const ref = doc(db, META_COLLECTION, TOMBSTONES_DOC_ID);
    await setDoc(
      ref,
      {
        deletedIds: arrayUnion(...cleanIds),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("Could not sync deleted IDs to cloud tombstones:", err);
  }
}

/**
 * Syncs completed task IDs to cloud Firestore tombstones so no other device/tab can revert them to uncompleted
 */
export async function syncCompletedIdsToCloud(
  completedIds: string[],
  uncompletedIds: string[] = []
): Promise<void> {
  try {
    const ref = doc(db, META_COLLECTION, TOMBSTONES_DOC_ID);
    const payload: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };
    const cleanComp = (completedIds || []).filter(Boolean);
    const cleanUncomp = (uncompletedIds || []).filter(Boolean);

    if (cleanComp.length > 0) {
      payload.completedIds = arrayUnion(...cleanComp);
    } else if (cleanUncomp.length > 0) {
      payload.completedIds = arrayRemove(...cleanUncomp);
    } else {
      return;
    }

    await setDoc(ref, payload, { merge: true });
  } catch (err) {
    console.warn("Could not sync completed IDs to cloud tombstones:", err);
  }
}

/**
 * Real-time listener for tasks collection with offline cache support and cloud tombstone synchronization
 */
export function subscribeToTasksFirestore(
  onUpdate: (tasks: Task[], isFromCache: boolean) => void,
  onError?: (error: FirestoreError) => void
): () => void {
  let latestRawDocs: { id: string; data: Task }[] = [];
  let latestFromCache = true;
  let hasReceivedTasksSnap = false;

  const processAndEmit = () => {
    if (!hasReceivedTasksSnap) return;
    const deletedSet = getDeletedTaskIds();
    const completedSet = getCompletedTaskIds();
    const tasks: Task[] = [];
    const staleDeletedIds: string[] = [];
    const staleUncompletedTasks: Task[] = [];

    for (const item of latestRawDocs) {
      const { id, data } = item;
      if (deletedSet.has(id) || (data as Task & { isDeleted?: boolean }).isDeleted) {
        if (!latestFromCache) {
          staleDeletedIds.push(id);
        }
        continue;
      }

      const allStepsDone =
        Array.isArray(data.steps) &&
        data.steps.length > 0 &&
        data.steps.every((s) => Boolean(s.completed));

      const isActuallyCompleted =
        data.isCompleted ||
        data.status === "completed" ||
        Boolean(data.completedAt) ||
        completedSet.has(id) ||
        allStepsDone;

      if (isActuallyCompleted && (!data.isCompleted || data.status !== "completed")) {
        const fixedTask: Task = {
          ...data,
          id,
          isCompleted: true,
          status: "completed",
          completedAt: data.completedAt || new Date().toISOString(),
        };
        tasks.push(fixedTask);
        if (!latestFromCache) {
          staleUncompletedTasks.push(fixedTask);
        }
      } else {
        if (isActuallyCompleted && !completedSet.has(id)) {
          markTasksAsCompleted([id]);
        }
        tasks.push({
          ...data,
          id,
        });
      }
    }

    // If any deleted task still exists in live Firestore, purge it immediately
    if (staleDeletedIds.length > 0) {
      deleteTasksBatchFirestore(staleDeletedIds).catch(() => {});
    }

    // If any completed task was reverted in Firestore, repair it immediately
    if (staleUncompletedTasks.length > 0) {
      saveTasksBatchFirestore(staleUncompletedTasks).catch(() => {});
    }

    onUpdate(tasks, latestFromCache);
  };

  try {
    // 1. Subscribe to cloud tombstones document so deletions/completions from any device are honored
    const tombstonesRef = doc(db, META_COLLECTION, TOMBSTONES_DOC_ID);
    const unsubTombstones = onSnapshot(
      tombstonesRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as {
            deletedIds?: string[];
            completedIds?: string[];
          };
          let changed = false;
          if (Array.isArray(data.deletedIds) && data.deletedIds.length > 0) {
            const currentDel = getDeletedTaskIds();
            const newDels = data.deletedIds.filter((id) => id && !currentDel.has(id));
            if (newDels.length > 0) {
              markTasksAsDeleted(newDels);
              changed = true;
            }
          }
          if (Array.isArray(data.completedIds) && data.completedIds.length > 0) {
            const currentComp = getCompletedTaskIds();
            const currentDel = getDeletedTaskIds();
            const newComps = data.completedIds.filter(
              (id) => id && !currentComp.has(id) && !currentDel.has(id)
            );
            if (newComps.length > 0) {
              markTasksAsCompleted(newComps);
              changed = true;
            }
          }
          if (changed && hasReceivedTasksSnap) {
            processAndEmit();
          }
        }
      },
      () => {
        // Ignore tombstone listener errors silently
      }
    );

    // 2. Subscribe to tasks collection
    const tasksQuery = query(collection(db, TASKS_COLLECTION));
    const unsubTasks = onSnapshot(
      tasksQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        hasReceivedTasksSnap = true;
        latestFromCache = snapshot.metadata.fromCache;
        const docs: { id: string; data: Task }[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Task;
          const id = docSnap.id || data.id;
          if (id) {
            docs.push({ id, data });
          }
        });
        latestRawDocs = docs;
        processAndEmit();
      },
      (error) => {
        console.error("Firestore tasks snapshot error:", error);
        if (onError) onError(error);
      }
    );

    return () => {
      unsubTombstones();
      unsubTasks();
    };
  } catch (err) {
    console.error("Error setting up tasks snapshot:", err);
    return () => {};
  }
}

/**
 * Real-time listener for activity logs collection with offline cache support
 */
export function subscribeToLogsFirestore(
  onUpdate: (logs: ActivityLog[], isFromCache: boolean) => void,
  onError?: (error: FirestoreError) => void
): () => void {
  try {
    const logsQuery = query(collection(db, LOGS_COLLECTION));
    return onSnapshot(
      logsQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        const logs: ActivityLog[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as ActivityLog;
          logs.push({
            ...data,
            id: docSnap.id || data.id,
          });
        });

        // Sort logs descending by timestamp
        logs.sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));

        const isFromCache = snapshot.metadata.fromCache;
        onUpdate(logs, isFromCache);
      },
      (error) => {
        console.error("Firestore logs snapshot error:", error);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.error("Error setting up logs snapshot:", err);
    return () => {};
  }
}

/**
 * Save single task to Firestore (both online and queued offline)
 */
export async function saveTaskFirestore(task: Task): Promise<void> {
  try {
    const deletedSet = getDeletedTaskIds();
    if (deletedSet.has(task.id)) return;

    const completedSet = getCompletedTaskIds();
    let finalTask = task;

    if (task.isCompleted || task.status === "completed" || Boolean(task.completedAt)) {
      markTasksAsCompleted([task.id]);
      syncCompletedIdsToCloud([task.id]).catch(() => {});
      finalTask = {
        ...task,
        isCompleted: true,
        status: "completed",
        completedAt: task.completedAt || new Date().toISOString(),
      };
    } else if (completedSet.has(task.id)) {
      finalTask = {
        ...task,
        isCompleted: true,
        status: "completed",
        completedAt: task.completedAt || new Date().toISOString(),
      };
    }

    const taskDocRef = doc(db, TASKS_COLLECTION, finalTask.id);
    const cleanTask = sanitizeForFirestore(finalTask);
    await setDoc(taskDocRef, cleanTask, { merge: true });
  } catch (error) {
    console.error("Error saving task to Firestore:", error);
    throw error;
  }
}

/**
 * Batch save tasks (useful for seeding, auto-rollover, or bulk updates)
 */
export async function saveTasksBatchFirestore(tasks: Task[]): Promise<void> {
  try {
    if (!tasks || tasks.length === 0) return;
    const deletedSet = getDeletedTaskIds();
    const completedSet = getCompletedTaskIds();
    const validTasks = tasks.filter((t) => t && t.id && !deletedSet.has(t.id));
    if (validTasks.length === 0) return;

    const newlyCompletedIds: string[] = [];
    const batch = writeBatch(db);

    validTasks.forEach((task) => {
      let finalTask = task;
      if (task.isCompleted || task.status === "completed" || Boolean(task.completedAt)) {
        newlyCompletedIds.push(task.id);
        finalTask = {
          ...task,
          isCompleted: true,
          status: "completed",
          completedAt: task.completedAt || new Date().toISOString(),
        };
      } else if (completedSet.has(task.id)) {
        finalTask = {
          ...task,
          isCompleted: true,
          status: "completed",
          completedAt: task.completedAt || new Date().toISOString(),
        };
      }
      const docRef = doc(db, TASKS_COLLECTION, finalTask.id);
      batch.set(docRef, sanitizeForFirestore(finalTask), { merge: true });
    });

    await batch.commit();

    if (newlyCompletedIds.length > 0) {
      markTasksAsCompleted(newlyCompletedIds);
      syncCompletedIdsToCloud(newlyCompletedIds).catch(() => {});
    }
  } catch (error) {
    console.error("Error batch saving tasks to Firestore:", error);
    throw error;
  }
}

/**
 * Delete task from Firestore and permanently record in cloud tombstones
 */
export async function deleteTaskFirestore(taskId: string): Promise<void> {
  try {
    if (!taskId) return;
    markTasksAsDeleted([taskId]);
    syncDeletedIdsToCloud([taskId]).catch(() => {});
    const taskDocRef = doc(db, TASKS_COLLECTION, taskId);
    await deleteDoc(taskDocRef);
  } catch (error) {
    console.error("Error deleting task from Firestore:", error);
    throw error;
  }
}

/**
 * Batch delete multiple tasks from Firestore and permanently record in cloud tombstones
 */
export async function deleteTasksBatchFirestore(taskIds: string[]): Promise<void> {
  try {
    if (!taskIds || taskIds.length === 0) return;
    const cleanIds = taskIds.filter(Boolean);
    if (cleanIds.length === 0) return;

    markTasksAsDeleted(cleanIds);
    syncDeletedIdsToCloud(cleanIds).catch(() => {});

    const batch = writeBatch(db);
    cleanIds.forEach((id) => {
      const docRef = doc(db, TASKS_COLLECTION, id);
      batch.delete(docRef);
    });
    await batch.commit();
  } catch (error) {
    console.error("Error batch deleting tasks from Firestore:", error);
    throw error;
  }
}

/**
 * Clear all tasks in Firestore
 */
export async function clearAllTasksFirestore(): Promise<void> {
  try {
    const snapshot = await getDocs(collection(db, TASKS_COLLECTION));
    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  } catch (error) {
    console.error("Error clearing tasks in Firestore:", error);
  }
}

/**
 * Save single activity log to Firestore
 */
export async function saveActivityLogFirestore(log: ActivityLog): Promise<void> {
  try {
    const logDocRef = doc(db, LOGS_COLLECTION, log.id);
    await setDoc(logDocRef, sanitizeForFirestore(log), { merge: true });
  } catch (error) {
    console.error("Error saving activity log to Firestore:", error);
  }
}

/**
 * Clear all activity logs in Firestore
 */
export async function clearAllLogsFirestore(): Promise<void> {
  try {
    const snapshot = await getDocs(collection(db, LOGS_COLLECTION));
    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  } catch (error) {
    console.error("Error clearing logs in Firestore:", error);
  }
}

/**
 * Initialize Firestore data if the cloud collection has never been seeded before
 */
export async function initializeFirestoreSeed(
  _initialTasks: Task[],
  _initialLogs: ActivityLog[]
): Promise<boolean> {
  // Do not automatically re-populate deleted tasks.
  return false;
}
