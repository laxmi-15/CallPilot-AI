import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { UrgencyLevel, ConversationStatus } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(prefix: string = "id"): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
}

export function formatDateTime(isoString?: string): string {
  if (!isoString) return "-";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return isoString;
  }
}

export function formatDate(isoString?: string): string {
  if (!isoString) return "-";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  } catch {
    return isoString;
  }
}

export function formatTime(isoString?: string): string {
  if (!isoString) return "-";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return isoString;
  }
}

export function formatRelativeTime(isoString?: string): string {
  if (!isoString) return "just now";
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 45) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(isoString);
  } catch {
    return "recently";
  }
}

export function formatPhone(phone: string): string {
  if (!phone) return "-";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `+1 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}

export function getUrgencyBadgeClasses(urgency: UrgencyLevel): {
  bg: string;
  text: string;
  border: string;
  glow: string;
  dot: string;
} {
  switch (urgency) {
    case "CRITICAL":
      return {
        bg: "bg-red-500/15 dark:bg-red-950/40",
        text: "text-red-600 dark:text-red-400",
        border: "border-red-500/30",
        glow: "shadow-[0_0_12px_rgba(239,68,68,0.3)]",
        dot: "bg-red-500 animate-ping",
      };
    case "HIGH":
      return {
        bg: "bg-amber-500/15 dark:bg-amber-950/40",
        text: "text-amber-600 dark:text-amber-400",
        border: "border-amber-500/30",
        glow: "shadow-[0_0_12px_rgba(245,158,11,0.3)]",
        dot: "bg-amber-500 animate-pulse",
      };
    case "NORMAL":
      return {
        bg: "bg-blue-500/15 dark:bg-blue-950/40",
        text: "text-blue-600 dark:text-blue-400",
        border: "border-blue-500/30",
        glow: "shadow-none",
        dot: "bg-blue-500",
      };
    case "LOW":
    default:
      return {
        bg: "bg-slate-500/15 dark:bg-slate-900/40",
        text: "text-slate-600 dark:text-slate-400",
        border: "border-slate-500/30",
        glow: "shadow-none",
        dot: "bg-slate-400",
      };
  }
}

export function getStatusBadgeClasses(status: ConversationStatus): {
  bg: string;
  text: string;
  border: string;
} {
  switch (status) {
    case "new":
      return {
        bg: "bg-purple-500/15 dark:bg-purple-950/40",
        text: "text-purple-600 dark:text-purple-400",
        border: "border-purple-500/30",
      };
    case "contacted":
      return {
        bg: "bg-blue-500/15 dark:bg-blue-950/40",
        text: "text-blue-600 dark:text-blue-400",
        border: "border-blue-500/30",
      };
    case "completed":
      return {
        bg: "bg-emerald-500/15 dark:bg-emerald-950/40",
        text: "text-emerald-600 dark:text-emerald-400",
        border: "border-emerald-500/30",
      };
    case "closed":
    default:
      return {
        bg: "bg-zinc-500/15 dark:bg-zinc-900/40",
        text: "text-zinc-600 dark:text-zinc-400",
        border: "border-zinc-500/30",
      };
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
