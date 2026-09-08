import { Task, TaskPriority } from "../types";
import { getTaskEstimatedMinutes } from "./workload";

export interface TaskTypeStat {
  priority: TaskPriority;
  label: string;
  shortLabel: string;
  group: "soliq" | "takrorlanmas" | "hisobot" | "boshqa";
  groupName: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  barColor: string;
  dotColor: string;
  accentBg: string;
  
  tasksCount: number;
  completedTasksCount: number;
  pendingTasksCount: number;
  taskCompletionPercent: number;
  
  totalMinutes: number;
  completedMinutes: number;
  pendingMinutes: number;
  minutesPercentageOfTotal: number;
  
  totalSteps: number;
  completedSteps: number;
  stepsCompletionPercent: number;
  
  tasks: Task[];
}

export interface TaskGroupStat {
  groupId: "soliq" | "takrorlanmas" | "hisobot" | "boshqa";
  groupName: string;
  barColor: string;
  badgeClass: string;
  
  tasksCount: number;
  completedTasksCount: number;
  pendingTasksCount: number;
  taskCompletionPercent: number;
  
  totalMinutes: number;
  completedMinutes: number;
  pendingMinutes: number;
  minutesPercentageOfTotal: number;
  
  totalSteps: number;
  completedSteps: number;
  priorities: TaskTypeStat[];
  tasks: Task[];
}

export interface TypeAnalyticsResult {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  totalMinutes: number;
  completedMinutes: number;
  pendingMinutes: number;
  
  typeStats: TaskTypeStat[];
  groupStats: TaskGroupStat[];
  activeTypeStats: TaskTypeStat[]; // Only types that have tasksCount > 0
  activeGroupStats: TaskGroupStat[]; // Only groups that have tasksCount > 0
}

export const ALL_TASK_PRIORITIES_CONFIG: {
  priority: TaskPriority;
  label: string;
  shortLabel: string;
  group: "soliq" | "takrorlanmas" | "hisobot" | "boshqa";
  groupName: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  barColor: string;
  dotColor: string;
  accentBg: string;
}[] = [
  {
    priority: "Soliq(Muhim)",
    label: "Soliq (Muhim)",
    shortLabel: "Soliq",
    group: "soliq",
    groupName: "Soliq Majburiyatlari",
    badgeBg: "bg-rose-50",
    badgeText: "text-rose-800",
    badgeBorder: "border-rose-200",
    barColor: "bg-rose-500",
    dotColor: "bg-rose-600",
    accentBg: "bg-rose-500/10",
  },
  {
    priority: "Takrorlanmas ish(Muhim)",
    label: "Takrorlanmas ish (Muhim)",
    shortLabel: "Takrorlanmas (Muhim)",
    group: "takrorlanmas",
    groupName: "Takrorlanmas / Alohida Ishlar",
    badgeBg: "bg-purple-50",
    badgeText: "text-purple-800",
    badgeBorder: "border-purple-200",
    barColor: "bg-purple-600",
    dotColor: "bg-purple-600",
    accentBg: "bg-purple-500/10",
  },
  {
    priority: "Takrorlanmas ish(O'rtacha)",
    label: "Takrorlanmas ish (O'rtacha)",
    shortLabel: "Takrorlanmas (O'rtacha)",
    group: "takrorlanmas",
    groupName: "Takrorlanmas / Alohida Ishlar",
    badgeBg: "bg-indigo-50",
    badgeText: "text-indigo-800",
    badgeBorder: "border-indigo-200",
    barColor: "bg-indigo-500",
    dotColor: "bg-indigo-600",
    accentBg: "bg-indigo-500/10",
  },
  {
    priority: "Takrorlanmas ish(Past)",
    label: "Takrorlanmas ish (Past)",
    shortLabel: "Takrorlanmas (Past)",
    group: "takrorlanmas",
    groupName: "Takrorlanmas / Alohida Ishlar",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-800",
    badgeBorder: "border-emerald-200",
    barColor: "bg-emerald-500",
    dotColor: "bg-emerald-600",
    accentBg: "bg-emerald-500/10",
  },
  {
    priority: "Ichki hisobot(Muhim)",
    label: "Ichki hisobot (Muhim)",
    shortLabel: "Ichki hisobot (Muhim)",
    group: "hisobot",
    groupName: "Ichki Hisobotlar",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-800",
    badgeBorder: "border-amber-200",
    barColor: "bg-amber-500",
    dotColor: "bg-amber-600",
    accentBg: "bg-amber-500/10",
  },
  {
    priority: "Ichki hisobot(O'rtacha)",
    label: "Ichki hisobot (O'rtacha)",
    shortLabel: "Ichki hisobot (O'rtacha)",
    group: "hisobot",
    groupName: "Ichki Hisobotlar",
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-800",
    badgeBorder: "border-blue-200",
    barColor: "bg-blue-500",
    dotColor: "bg-blue-600",
    accentBg: "bg-blue-500/10",
  },
  {
    priority: "Ichki hisobot(Past)",
    label: "Ichki hisobot (Past)",
    shortLabel: "Ichki hisobot (Past)",
    group: "hisobot",
    groupName: "Ichki Hisobotlar",
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-700",
    badgeBorder: "border-slate-200",
    barColor: "bg-slate-400",
    dotColor: "bg-slate-500",
    accentBg: "bg-slate-500/10",
  },
];

export function calculateTaskTypeAnalytics(taskList: Task[]): TypeAnalyticsResult {
  let grandTotalMinutes = 0;
  let grandCompletedMinutes = 0;
  let grandCompletedTasks = 0;

  // Initialize stats map
  const statsMap = new Map<TaskPriority, TaskTypeStat>();

  ALL_TASK_PRIORITIES_CONFIG.forEach((cfg) => {
    statsMap.set(cfg.priority, {
      ...cfg,
      tasksCount: 0,
      completedTasksCount: 0,
      pendingTasksCount: 0,
      taskCompletionPercent: 0,
      totalMinutes: 0,
      completedMinutes: 0,
      pendingMinutes: 0,
      minutesPercentageOfTotal: 0,
      totalSteps: 0,
      completedSteps: 0,
      stepsCompletionPercent: 0,
      tasks: [],
    });
  });

  // Calculate stats for each task
  taskList.forEach((task) => {
    const mins = getTaskEstimatedMinutes(task);
    grandTotalMinutes += mins;
    if (task.isCompleted) {
      grandCompletedMinutes += mins;
      grandCompletedTasks++;
    }

    let stat = statsMap.get(task.priority);
    if (!stat) {
      // Fallback for unexpected priority
      stat = {
        priority: task.priority,
        label: task.priority,
        shortLabel: task.priority,
        group: "boshqa",
        groupName: "Boshqa vazifalar",
        badgeBg: "bg-slate-50",
        badgeText: "text-slate-700",
        badgeBorder: "border-slate-200",
        barColor: "bg-slate-500",
        dotColor: "bg-slate-500",
        accentBg: "bg-slate-500/10",
        tasksCount: 0,
        completedTasksCount: 0,
        pendingTasksCount: 0,
        taskCompletionPercent: 0,
        totalMinutes: 0,
        completedMinutes: 0,
        pendingMinutes: 0,
        minutesPercentageOfTotal: 0,
        totalSteps: 0,
        completedSteps: 0,
        stepsCompletionPercent: 0,
        tasks: [],
      };
      statsMap.set(task.priority, stat);
    }

    stat.tasksCount++;
    stat.tasks.push(task);
    stat.totalMinutes += mins;

    if (task.isCompleted) {
      stat.completedTasksCount++;
      stat.completedMinutes += mins;
    } else {
      stat.pendingTasksCount++;
      stat.pendingMinutes += mins;
    }

    if (task.steps && task.steps.length > 0) {
      stat.totalSteps += task.steps.length;
      stat.completedSteps += task.steps.filter((s) => s.completed).length;
    }
  });

  // Finalize percentages
  const typeStats: TaskTypeStat[] = Array.from(statsMap.values()).map((st) => {
    const taskCompletionPercent = st.tasksCount > 0 ? Math.round((st.completedTasksCount / st.tasksCount) * 100) : 0;
    const stepsCompletionPercent = st.totalSteps > 0 ? Math.round((st.completedSteps / st.totalSteps) * 100) : 0;
    const minutesPercentageOfTotal = grandTotalMinutes > 0 ? Math.round((st.totalMinutes / grandTotalMinutes) * 100) : 0;

    return {
      ...st,
      taskCompletionPercent,
      stepsCompletionPercent,
      minutesPercentageOfTotal,
    };
  });

  // Sort by total minutes descending
  typeStats.sort((a, b) => b.totalMinutes - a.totalMinutes);

  const activeTypeStats = typeStats.filter((t) => t.tasksCount > 0);

  // Group stats calculation
  const groupConfigs: {
    groupId: "soliq" | "takrorlanmas" | "hisobot";
    groupName: string;
    barColor: string;
    badgeClass: string;
  }[] = [
    {
      groupId: "soliq",
      groupName: "Soliq Majburiyatlari",
      barColor: "bg-rose-500",
      badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
    },
    {
      groupId: "takrorlanmas",
      groupName: "Takrorlanmas / Alohida Ishlar",
      barColor: "bg-purple-600",
      badgeClass: "bg-purple-50 text-purple-800 border-purple-200",
    },
    {
      groupId: "hisobot",
      groupName: "Ichki Hisobotlar",
      barColor: "bg-blue-500",
      badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
    },
  ];

  const groupStats: TaskGroupStat[] = groupConfigs.map((g) => {
    const groupPriorities = typeStats.filter((t) => t.group === g.groupId);
    let tasksCount = 0;
    let completedTasksCount = 0;
    let pendingTasksCount = 0;
    let totalMinutes = 0;
    let completedMinutes = 0;
    let pendingMinutes = 0;
    let totalSteps = 0;
    let completedSteps = 0;
    const tasks: Task[] = [];

    groupPriorities.forEach((p) => {
      tasksCount += p.tasksCount;
      completedTasksCount += p.completedTasksCount;
      pendingTasksCount += p.pendingTasksCount;
      totalMinutes += p.totalMinutes;
      completedMinutes += p.completedMinutes;
      pendingMinutes += p.pendingMinutes;
      totalSteps += p.totalSteps;
      completedSteps += p.completedSteps;
      tasks.push(...p.tasks);
    });

    const taskCompletionPercent = tasksCount > 0 ? Math.round((completedTasksCount / tasksCount) * 100) : 0;
    const minutesPercentageOfTotal = grandTotalMinutes > 0 ? Math.round((totalMinutes / grandTotalMinutes) * 100) : 0;

    return {
      ...g,
      tasksCount,
      completedTasksCount,
      pendingTasksCount,
      taskCompletionPercent,
      totalMinutes,
      completedMinutes,
      pendingMinutes,
      minutesPercentageOfTotal,
      totalSteps,
      completedSteps,
      priorities: groupPriorities.filter((p) => p.tasksCount > 0),
      tasks,
    };
  });

  const activeGroupStats = groupStats.filter((g) => g.tasksCount > 0);

  return {
    totalTasks: taskList.length,
    completedTasks: grandCompletedTasks,
    pendingTasks: taskList.length - grandCompletedTasks,
    totalMinutes: grandTotalMinutes,
    completedMinutes: grandCompletedMinutes,
    pendingMinutes: Math.max(0, grandTotalMinutes - grandCompletedMinutes),
    typeStats,
    groupStats,
    activeTypeStats,
    activeGroupStats,
  };
}
