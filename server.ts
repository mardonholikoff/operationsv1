import express, { Response } from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "20mb" }));

// Server memory storage for persistent state
const DATA_FILE = path.join(process.cwd(), "server_data_store.json");

interface ServerStore {
  tasks: any[];
  logs: any[];
  lastSyncedAt: string;
}

function readServerData(): ServerStore {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      return {
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        logs: Array.isArray(parsed.logs) ? parsed.logs : [],
        lastSyncedAt: parsed.lastSyncedAt || new Date().toISOString(),
      };
    }
  } catch (e) {
    console.error("Error reading server store:", e);
  }
  return { tasks: [], logs: [], lastSyncedAt: new Date().toISOString() };
}

function writeServerData(data: ServerStore) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing server store:", e);
  }
}

// SSE (Server-Sent Events) clients registry for instant real-time broadcast across all devices
const sseClients: Set<Response> = new Set();

function broadcastToClients(eventType: string, payload: any) {
  const message = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// SSE endpoint for instant multi-device real-time sync (PC, mobile browser, PWA)
app.get("/api/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  sseClients.add(res);

  // Send initial data immediately upon connection
  const currentData = readServerData();
  res.write(
    `event: initial_state\ndata: ${JSON.stringify({
      tasks: currentData.tasks,
      logs: currentData.logs,
      lastSyncedAt: currentData.lastSyncedAt,
    })}\n\n`
  );

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(": heartbeat\n\n");
    } catch {
      clearInterval(heartbeat);
      sseClients.delete(res);
    }
  }, 20000);

  req.on("close", () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

// Fast Online/Offline Full Sync endpoint
app.post("/api/sync", (req, res) => {
  try {
    const { tasks, logs = [], replaceTasks = true } = req.body;
    const serverData = readServerData();

    if (replaceTasks && Array.isArray(tasks)) {
      serverData.tasks = tasks;
    } else if (Array.isArray(tasks)) {
      // Upsert tasks by ID
      const map = new Map<string, any>();
      serverData.tasks.forEach((t) => t?.id && map.set(t.id, t));
      tasks.forEach((t) => t?.id && map.set(t.id, t));
      serverData.tasks = Array.from(map.values());
    }

    // Merge activity logs
    if (Array.isArray(logs) && logs.length > 0) {
      const logMap = new Map<string, any>();
      serverData.logs.forEach((l) => l?.id && logMap.set(l.id, l));
      logs.forEach((l) => l?.id && logMap.set(l.id, l));
      serverData.logs = Array.from(logMap.values())
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 500);
    }

    serverData.lastSyncedAt = new Date().toISOString();
    writeServerData(serverData);

    // Broadcast change to all other connected tabs/devices
    broadcastToClients("data_updated", {
      tasks: serverData.tasks,
      logs: serverData.logs,
      lastSyncedAt: serverData.lastSyncedAt,
    });

    return res.json({
      success: true,
      tasks: serverData.tasks,
      logs: serverData.logs,
      syncedAt: serverData.lastSyncedAt,
    });
  } catch (error: any) {
    console.error("Sync error:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Single task save / update endpoint
app.post("/api/tasks", (req, res) => {
  try {
    const task = req.body;
    if (!task || !task.id) {
      return res.status(400).json({ error: "Task ID required" });
    }
    const serverData = readServerData();
    const idx = serverData.tasks.findIndex((t: any) => t && t.id === task.id);
    if (idx >= 0) {
      serverData.tasks[idx] = { ...serverData.tasks[idx], ...task };
    } else {
      serverData.tasks.unshift(task);
    }
    serverData.lastSyncedAt = new Date().toISOString();
    writeServerData(serverData);

    broadcastToClients("data_updated", {
      tasks: serverData.tasks,
      logs: serverData.logs,
      lastSyncedAt: serverData.lastSyncedAt,
    });

    return res.json({ success: true, task, tasks: serverData.tasks });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Delete task endpoint
app.delete("/api/tasks/:id", (req, res) => {
  try {
    const { id } = req.params;
    const serverData = readServerData();
    serverData.tasks = serverData.tasks.filter((t: any) => t && t.id !== id);
    serverData.lastSyncedAt = new Date().toISOString();
    writeServerData(serverData);

    broadcastToClients("data_updated", {
      tasks: serverData.tasks,
      logs: serverData.logs,
      lastSyncedAt: serverData.lastSyncedAt,
    });

    return res.json({ success: true, deletedId: id, tasks: serverData.tasks });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Clear all tasks endpoint
app.delete("/api/tasks", (req, res) => {
  try {
    const serverData = readServerData();
    serverData.tasks = [];
    serverData.lastSyncedAt = new Date().toISOString();
    writeServerData(serverData);

    broadcastToClients("data_updated", {
      tasks: [],
      logs: serverData.logs,
      lastSyncedAt: serverData.lastSyncedAt,
    });

    return res.json({ success: true, tasks: [] });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Fetch latest server data
app.get("/api/tasks", (req, res) => {
  const serverData = readServerData();
  res.json({
    tasks: serverData.tasks,
    logs: serverData.logs,
    lastSyncedAt: serverData.lastSyncedAt,
  });
});

async function start() {
  // Vite middleware for development vs static dist for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: "0.0.0.0", port: PORT },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Task Management Server running on port ${PORT}`);
  });
}

start();
