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
  FirestoreError,
} from "firebase/firestore";
import { Task, ActivityLog } from "../types";
import { getDeletedTaskIds } from "./storage";
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
 * Real-time listener for tasks collection with offline cache support
 */
export function subscribeToTasksFirestore(
  onUpdate: (tasks: Task[], isFromCache: boolean) => void,
  onError?: (error: FirestoreError) => void
): () => void {
  try {
    const tasksQuery = query(collection(db, TASKS_COLLECTION));
    return onSnapshot(
      tasksQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        const deletedSet = getDeletedTaskIds();
        const tasks: Task[] = [];
        const staleDeletedIds: string[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Task;
          const id = docSnap.id || data.id;
          if (deletedSet.has(id)) {
            if (!snapshot.metadata.fromCache) {
              staleDeletedIds.push(id);
            }
            return;
          }
          tasks.push({
            ...data,
            id,
          });
        });

        // If any locally deleted task still exists in live Firestore, purge it
        if (staleDeletedIds.length > 0) {
          deleteTasksBatchFirestore(staleDeletedIds).catch(() => {});
        }

        const isFromCache = snapshot.metadata.fromCache;
        onUpdate(tasks, isFromCache);
      },
      (error) => {
        console.error("Firestore tasks snapshot error:", error);
        if (onError) onError(error);
      }
    );
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
    const taskDocRef = doc(db, TASKS_COLLECTION, task.id);
    const cleanTask = sanitizeForFirestore(task);
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
    const validTasks = tasks.filter((t) => t && t.id && !deletedSet.has(t.id));
    if (validTasks.length === 0) return;

    const batch = writeBatch(db);
    validTasks.forEach((task) => {
      const docRef = doc(db, TASKS_COLLECTION, task.id);
      batch.set(docRef, sanitizeForFirestore(task), { merge: true });
    });
    await batch.commit();
  } catch (error) {
    console.error("Error batch saving tasks to Firestore:", error);
    throw error;
  }
}

/**
 * Delete task from Firestore
 */
export async function deleteTaskFirestore(taskId: string): Promise<void> {
  try {
    const taskDocRef = doc(db, TASKS_COLLECTION, taskId);
    await deleteDoc(taskDocRef);
  } catch (error) {
    console.error("Error deleting task from Firestore:", error);
    throw error;
  }
}

/**
 * Batch delete multiple tasks from Firestore
 */
export async function deleteTasksBatchFirestore(taskIds: string[]): Promise<void> {
  try {
    if (!taskIds || taskIds.length === 0) return;
    const batch = writeBatch(db);
    taskIds.forEach((id) => {
      if (id) {
        const docRef = doc(db, TASKS_COLLECTION, id);
        batch.delete(docRef);
      }
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
