"use client";

import { DashboardProvider, useDashboard } from "@/contexts/DashboardContext";
import { useDashboardState } from "@/hooks/useDashboardState";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import MessagesPanel from "@/components/dashboard/MessagesPanel";
import { CheckCircle2, XCircle, X } from "lucide-react";

/**
 * Toast notification — slides in from top-right, Discord style
 */
function Toast() {
  const { toast, showToast } = useDashboard();

  if (!toast) return null;

  return (
    <div className="fixed right-4 top-4 z-[100] animate-in slide-in-from-top-2 fade-in duration-300">
      <div
        className={`flex items-center gap-3 rounded-lg border px-4 py-3 shadow-xl ${
          toast.type === "success"
            ? "border-[hsl(139,47%,30%)] bg-[hsl(139,47%,15%)] text-[hsl(139,47%,75%)]"
            : "border-[hsl(0,60%,30%)] bg-[hsl(0,60%,15%)] text-[hsl(0,60%,75%)]"
        }`}
      >
        {toast.type === "success" ? (
          <CheckCircle2 className="h-4 w-4 shrink-0" />
        ) : (
          <XCircle className="h-4 w-4 shrink-0" />
        )}
        <p className="max-w-xs text-sm font-medium">{toast.message}</p>
        <button
          onClick={() => showToast("", "success")}
          className="ml-2 shrink-0 rounded-md p-0.5 opacity-60 transition hover:opacity-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/**
 * Inner component that uses the dashboard state hook
 */
function DashboardContent() {
  const dashboardState = useDashboardState();

  return (
    <DashboardProvider value={dashboardState}>
      <div className="flex h-screen overflow-hidden">
        <DashboardSidebar />
        <MessagesPanel />
        <Toast />
      </div>
    </DashboardProvider>
  );
}

export default function Dashboard() {
  return <DashboardContent />;
}
