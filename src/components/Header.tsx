import React, { useState, useEffect } from "react";
import { User } from "../types";
import {
  CheckSquare,
  LogOut,
  ShieldCheck,
  User as UserIcon,
  Wifi,
  WifiOff,
  Bell,
  RefreshCw,
  Check,
  BarChart3,
  TrendingUp,
  CloudCheck,
} from "lucide-react";

interface HeaderProps {
  user: User;
  onLogout: () => void;
  todayCount: number;
  overdueCount: number;
  isSyncing?: boolean;
  isFromCache?: boolean;
  pendingCount?: number;
  onTriggerSync?: () => void;
  lastSyncedAt?: string;
  onOpenDailyAnalytics?: () => void;
  onOpenMonthlyAnalytics?: () => void;
  adminViewVersion?: "v1" | "v2";
  onChangeAdminViewVersion?: (version: "v1" | "v2") => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  todayCount,
  overdueCount,
  isSyncing = false,
  isFromCache = false,
  pendingCount = 0,
  onTriggerSync,
  onOpenDailyAnalytics,
  onOpenMonthlyAnalytics,
  adminViewVersion = "v1",
  onChangeAdminViewVersion,
}) => {
  const [timeStr, setTimeStr] = useState<string>("");
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      };
      setTimeStr(now.toLocaleDateString("uz-UZ", options));
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      clearInterval(timer);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const isV1 = user.role === "admin" && adminViewVersion === "v1";

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Main Navbar Row */}
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* 1. Left: Brand / Logo + v1/v2 switcher for Admin */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base sm:text-xl text-slate-900 tracking-tight leading-none">
                Tizim
              </span>
            </div>

            {/* Admin v1 / v2 Switcher */}
            {user.role === "admin" && (
              <div className="flex items-center p-0.5 sm:p-1 bg-slate-100/90 rounded-xl border border-slate-200/90 shadow-2xs ml-1 sm:ml-3">
                <button
                  type="button"
                  id="nav-btn-v1"
                  onClick={() => onChangeAdminViewVersion?.("v1")}
                  className={`inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    adminViewVersion === "v1"
                      ? "bg-white text-blue-600 shadow-xs border border-slate-200/60"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="v1: Chuqur Analitika (Kunlik, Oylik, Oraliq)"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${adminViewVersion === "v1" ? "bg-blue-600" : "bg-slate-400"}`} />
                  <span>v1</span>
                  <span className="hidden md:inline font-medium text-[11px] text-slate-500">Analitika</span>
                </button>
                <button
                  type="button"
                  id="nav-btn-v2"
                  onClick={() => onChangeAdminViewVersion?.("v2")}
                  className={`inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    adminViewVersion === "v2"
                      ? "bg-white text-indigo-600 shadow-xs border border-slate-200/60"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="v2: To'liq Ishchi Panel (Kalendar, Soatlar, Vazifalar)"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${adminViewVersion === "v2" ? "bg-indigo-600" : "bg-slate-400"}`} />
                  <span>v2</span>
                  <span className="hidden md:inline font-medium text-[11px] text-slate-500">Ishchi panel</span>
                </button>
              </div>
            )}
          </div>

          {/* 2. Center: Status and buttons */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 flex-1 max-w-2xl px-1">
            {/* If NOT v1 (or for Operator), show Quick Analytics Modals */}
            {!isV1 && user.role === "admin" && (
              <>
                {onOpenDailyAnalytics && (
                  <button
                    type="button"
                    id="header-btn-daily-analytics"
                    onClick={onOpenDailyAnalytics}
                    className="inline-flex items-center justify-center px-2 py-1.5 sm:px-3 sm:py-1.5 md:px-3.5 md:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs md:text-sm font-bold text-blue-700 bg-blue-50/90 hover:bg-blue-100 active:bg-blue-200 border border-blue-200/90 shadow-2xs transition-all cursor-pointer group whitespace-nowrap shrink-0"
                    title="Kunlik vazifalar analitikasi"
                  >
                    <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 text-blue-600 group-hover:scale-105 transition-transform shrink-0" />
                    <span className="inline sm:hidden">Kunlik</span>
                    <span className="hidden sm:inline">Kunlik Analitika</span>
                  </button>
                )}

                {onOpenMonthlyAnalytics && (
                  <button
                    type="button"
                    id="header-btn-monthly-analytics"
                    onClick={onOpenMonthlyAnalytics}
                    className="inline-flex items-center justify-center px-2 py-1.5 sm:px-3 sm:py-1.5 md:px-3.5 md:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs md:text-sm font-bold text-indigo-700 bg-indigo-50/90 hover:bg-indigo-100 active:bg-indigo-200 border border-indigo-200/90 shadow-2xs transition-all cursor-pointer group whitespace-nowrap shrink-0"
                    title="Oylik vazifalar analitikasi"
                  >
                    <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 text-indigo-600 group-hover:scale-105 transition-transform shrink-0" />
                    <span className="inline sm:hidden">Oylik</span>
                    <span className="hidden sm:inline">Oylik Analitika</span>
                  </button>
                )}
              </>
            )}

            {/* Status & Clock - Always present in v1, and on desktop in v2 */}
            <div className={`${isV1 ? "flex" : "hidden xl:flex"} items-center space-x-2.5 ml-2`}>
              <div className="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl bg-slate-100/90 text-xs border border-slate-200/80 shadow-2xs">
                {isOnline ? (
                  <div className="flex items-center text-emerald-700 font-semibold space-x-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Baza statusi: Faol</span>
                    {isSyncing && (
                      <>
                        <span className="text-slate-300">|</span>
                        <span className="text-blue-600 font-medium text-[11px] flex items-center">
                          <RefreshCw className="w-3 h-3 mr-0.5 animate-spin text-blue-500" />
                          Sinxronlanmoqda...
                        </span>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center text-amber-700 font-semibold space-x-1.5">
                    <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                    <span>Baza statusi: Oflayn</span>
                    {pendingCount > 0 && (
                      <span className="px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded-md text-[10px] font-bold">
                        {pendingCount} kutilmoqda
                      </span>
                    )}
                  </div>
                )}

                {onTriggerSync && (
                  <button
                    type="button"
                    onClick={onTriggerSync}
                    disabled={isSyncing}
                    className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors disabled:opacity-50 cursor-pointer ml-0.5"
                    title="Bazani qayta tekshirish"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin text-blue-600" : ""}`} />
                  </button>
                )}

                <span className="text-slate-300">|</span>
                <span className="font-medium text-slate-600">{timeStr}</span>
              </div>
            </div>
          </div>

          {/* 3. Right: Online/Sync Badge (Mobile & Tablet) + User Profile + Logout */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            {/* Mobile / Tablet Compact Online & Sync Badge (Only when not v1 desktop already visible) */}
            {!isV1 && (
              <div className="flex xl:hidden items-center">
                <button
                  type="button"
                  onClick={onTriggerSync}
                  disabled={isSyncing}
                  title={isOnline ? (isSyncing ? "Sinxronlanmoqda..." : "Baza statusi: Faol") : "Baza statusi: Oflayn"}
                  className={`inline-flex items-center space-x-1 px-1.5 sm:px-2 py-1 rounded-lg text-[10px] sm:text-xs font-semibold border transition-all cursor-pointer ${
                    isOnline
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/90 hover:bg-emerald-100"
                      : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                  }`}
                >
                  {isOnline ? (
                    <>
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                      </span>
                      <span className="hidden xs:inline font-bold">Baza: Faol</span>
                      <RefreshCw className={`w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-600 ${isSyncing ? "animate-spin text-blue-600" : ""}`} />
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-2.5 h-2.5 text-amber-600" />
                      <span className="hidden xs:inline font-bold">Baza: Oflayn</span>
                      {pendingCount > 0 && (
                        <span className="px-1 bg-amber-200 text-amber-900 rounded font-bold text-[9px]">
                          {pendingCount}
                        </span>
                      )}
                    </>
                  )}
                </button>
              </div>
            )}

            {/* User Profile Avatar & Logout */}
            <div className="flex items-center pl-1 sm:pl-2 border-l border-slate-200 space-x-1 sm:space-x-1.5">
              <div className="flex items-center space-x-1.5">
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                    user.role === "admin"
                      ? "bg-gradient-to-tr from-purple-600 to-pink-600 shadow-purple-500/20"
                      : "bg-gradient-to-tr from-blue-600 to-cyan-600 shadow-blue-500/20"
                  } shadow-xs`}
                  title={`${user.name} (${user.role === "admin" ? "Bosh Admin" : "Operator"})`}
                >
                  {user.role === "admin" ? (
                    <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  ) : (
                    <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  )}
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-xs font-bold text-slate-800 leading-tight">
                    {user.name}
                  </div>
                  <div className="text-[9px] uppercase font-semibold text-slate-500">
                    {user.role === "admin" ? "Bosh Admin" : "Operator"}
                  </div>
                </div>
              </div>

              {/* Logout button */}
              <button
                id="btn-logout"
                onClick={onLogout}
                className="p-1 sm:p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer ml-1"
                title="Chiqish"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick notification row for mobile if there are overdue/today tasks - Only in v2 */}
        {!isV1 && (todayCount > 0 || overdueCount > 0) && (
          <div className="flex lg:hidden items-center justify-between py-1 px-1 border-t border-slate-100 text-[11px] text-slate-600 gap-2">
            <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar">
              {todayCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-semibold border border-amber-200/80">
                  <Bell className="w-3 h-3 mr-1 text-amber-600" />
                  Bugun: {todayCount}
                </span>
              )}
              {overdueCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 font-semibold border border-rose-200/80">
                  Kechikkan: {overdueCount}
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-medium shrink-0">
              {timeStr}
            </span>
          </div>
        )}
      </div>
    </header>
  );
};

