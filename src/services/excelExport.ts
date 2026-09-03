import * as XLSX from "xlsx";
import { Task, ActivityLog } from "../types";
import { formatDateUz, getTodayString, getCreatorLabel, formatTaskScheduleDisplay } from "./storage";

export function exportTasksToExcel(tasks: Task[], customFilename?: string) {
  const wb = XLSX.utils.book_new();

  // 1. Prepare Main Sheet Data
  const mainData = tasks.map((t, index) => {
    // Format steps
    const stepsText = (t.steps || [])
      .map((s, i) => `${i + 1}. [${s.completed ? "✓" : " "}] ${s.text}`)
      .join("\n");

    // Format schedule type
    const scheduleMeta = formatTaskScheduleDisplay(t);
    const scheduleText = `${scheduleMeta.label} (${scheduleMeta.detail})`;

    // Format date string
    const dateDisplay =
      t.dateMode === "range" && t.startDate
        ? `${t.startDate} ~ ${t.dueDate}`
        : t.dueDate;

    // Format status
    let statusText = "Kutilmoqda (Bajarilmagan)";
    if (t.isCompleted) {
      statusText = "Bajarildi";
    } else if (t.status === "rescheduled" || (t.history && t.history.length > 0)) {
      statusText = `Boshqa kunga ko'chirilgan (${t.history.length} marta)`;
    } else if (t.dueDate < getTodayString()) {
      statusText = "Muddati o'tgan";
    }

    // Format history/notes
    const historyLines = (t.history || []).map(
      (h) => `• ${h.oldDate} -> ${h.newDate}: "${h.reason}" (${h.operator})`
    );
    let notesText = t.completionNote ? `Bajarish izohi: ${t.completionNote}` : "";
    if (historyLines.length > 0) {
      notesText += (notesText ? "\n\n" : "") + "Ko'chirish tarixi:\n" + historyLines.join("\n");
    }

    const creatorInfo = getCreatorLabel(t.createdBy);

    return {
      "№": index + 1,
      "Vazifa Nomi": t.title,
      "Kerakli Amallar": stepsText || "-",
      "Muhimlik Darajasi": t.priority,
      "Reja Turi": scheduleText,
      "Muddati (Sana)": dateDisplay,
      "Holati": statusText,
      "Kiritgan Shaxs": creatorInfo.text,
      "Bajarilgan Vaqti": t.completedAt ? formatDateUz(t.completedAt.split("T")[0]) : "-",
      "Bajaruvchi / Izohlar": notesText || "-",
      "Yaratilgan Sana": formatDateUz(t.createdAt.split("T")[0]),
    };
  });

  const wsMain = XLSX.utils.json_to_sheet(mainData);

  // Set explicit column widths for beautiful spreadsheet rendering
  wsMain["!cols"] = [
    { wch: 6 },  // №
    { wch: 35 }, // Vazifa Nomi
    { wch: 45 }, // Kerakli Amallar
    { wch: 25 }, // Muhimlik Darajasi
    { wch: 25 }, // Reja Turi
    { wch: 15 }, // Muddati
    { wch: 25 }, // Holati
    { wch: 28 }, // Kiritgan Shaxs
    { wch: 18 }, // Bajarilgan Vaqti
    { wch: 40 }, // Bajaruvchi / Izohlar
    { wch: 18 }, // Yaratilgan Sana
  ];

  XLSX.utils.book_append_sheet(wb, wsMain, "Barcha Vazifalar");

  // 2. Add Tax and Reports Sheet ("Soliq va Hisobotlar")
  const taxTasks = tasks.filter(
    (t) => t.priority.includes("Soliq") || t.priority.includes("hisobot")
  );
  if (taxTasks.length > 0) {
    const taxData = taxTasks.map((t, index) => ({
      "№": index + 1,
      "Soliq / Hisobot Nomi": t.title,
      "Muhimlik": t.priority,
      "Topshirish Muddati": t.dueDate,
      "Holat": t.isCompleted ? "Topshirildi" : "Kutilmoqda",
      "Izoh": t.completionNote || (t.history?.[0]?.reason ?? "-"),
    }));
    const wsTax = XLSX.utils.json_to_sheet(taxData);
    wsTax["!cols"] = [
      { wch: 6 },
      { wch: 35 },
      { wch: 25 },
      { wch: 18 },
      { wch: 18 },
      { wch: 35 },
    ];
    XLSX.utils.book_append_sheet(wb, wsTax, "Soliq va Hisobotlar");
  }

  // 3. Add Today & Upcoming Sheet
  const todayStr = getTodayString();
  const todayUpcomingTasks = tasks.filter((t) => !t.isCompleted && t.dueDate >= todayStr);
  if (todayUpcomingTasks.length > 0) {
    const todayData = todayUpcomingTasks.map((t, index) => ({
      "№": index + 1,
      "Vazifa Nomi": t.title,
      "Muddati": t.dueDate,
      "Muhimlik": t.priority,
      "Amallar Soni": `${(t.steps || []).filter((s) => s.completed).length}/${(t.steps || []).length}`,
    }));
    const wsToday = XLSX.utils.json_to_sheet(todayData);
    wsToday["!cols"] = [{ wch: 6 }, { wch: 35 }, { wch: 18 }, { wch: 25 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsToday, "Bugungi va Yaqin");
  }

  // Generate date stamp
  const today = getTodayString();
  const filename = customFilename || `Vazifalar_Hisoboti_${today}.xlsx`;

  // Write and trigger download
  XLSX.writeFile(wb, filename);
}

export function exportLogsToExcel(logs: ActivityLog[], customFilename?: string) {
  const wb = XLSX.utils.book_new();

  const actionLabels: Record<string, string> = {
    created: "Vazifa kiritildi",
    edited: "Tahrirlandi",
    completed: "Bajarildi",
    rescheduled: "Muddat ko'chirildi",
    auto_rolled: "Avtomatik ko'chirildi",
    deleted: "O'chirildi",
  };

  const logsData = logs.map((l, index) => {
    let dateStr = "";
    let timeStr = "";
    if (l.timestamp) {
      const parts = l.timestamp.split("T");
      dateStr = formatDateUz(parts[0]);
      if (parts[1]) {
        timeStr = parts[1].substring(0, 8);
      }
    }

    return {
      "№": index + 1,
      "Sana": dateStr,
      "Vaqt": timeStr,
      "Amal Turi": actionLabels[l.action] || l.action,
      "Bajaruvchi / Xodim": l.operator || "-",
      "Vazifa Nomi": l.taskTitle || "-",
      "Batafsil Izoh / Sabab": l.details || "-",
      "Qayd ID": l.id,
    };
  });

  const ws = XLSX.utils.json_to_sheet(logsData);
  ws["!cols"] = [
    { wch: 6 },  // №
    { wch: 20 }, // Sana
    { wch: 12 }, // Vaqt
    { wch: 22 }, // Amal Turi
    { wch: 20 }, // Bajaruvchi
    { wch: 35 }, // Vazifa Nomi
    { wch: 50 }, // Izoh
    { wch: 15 }, // Qayd ID
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Admin Amallar Logi");

  const today = getTodayString();
  const filename = customFilename || `Admin_Amallar_Logi_${today}.xlsx`;
  XLSX.writeFile(wb, filename);
}

