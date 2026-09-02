"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

// --- BUTTON COMPONENT ---
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "glow" | "subtle";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer";
    
    const variants = {
      primary: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 active:scale-[0.98]",
      glow: "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/35 active:scale-[0.98]",
      secondary: "bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/90 shadow-sm active:scale-[0.98]",
      outline: "bg-transparent hover:bg-slate-100 text-slate-700 border border-slate-300 active:scale-[0.98]",
      ghost: "bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900",
      subtle: "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60 active:scale-[0.98]",
      danger: "bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-600/20 active:scale-[0.98]",
    };

    const sizes = {
      sm: "text-xs px-3 py-1.5 gap-1.5 font-semibold",
      md: "text-sm px-4 py-2.5 gap-2 font-medium",
      lg: "text-base px-6 py-3.5 gap-2.5 font-semibold",
      icon: "h-9 w-9 p-0",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        ) : leftIcon ? (
          <span className="shrink-0">{leftIcon}</span>
        ) : null}
        {children}
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);
Button.displayName = "Button";

// --- CARD COMPONENTS ---
export function Card({ className, children, glow = false, ...props }: React.HTMLAttributes<HTMLDivElement> & { glow?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden text-slate-900",
        glow && "glow-border",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 md:p-6 pb-2", className)} {...props}>{children}</div>;
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-lg md:text-xl font-bold tracking-tight text-slate-900", className)} {...props}>{children}</h3>;
}

export function CardDescription({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed", className)} {...props}>{children}</p>;
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 md:p-6 pt-3", className)} {...props}>{children}</div>;
}

export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 md:p-6 pt-0 border-t border-slate-100 flex items-center justify-between", className)} {...props}>{children}</div>;
}

// --- BADGE COMPONENT ---
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "secondary"
    | "success"
    | "warning"
    | "danger"
    | "purple"
    | "outline"
    | "blue"
    | "neon-emerald"
    | "neon-amber"
    | "neon-rose"
    | "neon-indigo";
  dot?: boolean;
}

export function Badge({ className, variant = "default", dot = false, children, ...props }: BadgeProps) {
  const variants = {
    default: "bg-indigo-50 text-indigo-700 border-indigo-200/70",
    secondary: "bg-slate-100 text-slate-700 border-slate-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    warning: "bg-amber-50 text-amber-700 border-amber-200/80",
    danger: "bg-red-50 text-red-700 border-red-200/80",
    purple: "bg-purple-50 text-purple-700 border-purple-200/80",
    blue: "bg-blue-50 text-blue-700 border-blue-200/80",
    outline: "bg-transparent text-slate-600 border-slate-300",
    "neon-emerald": "badge-neon-emerald font-bold",
    "neon-amber": "badge-neon-amber font-bold",
    "neon-rose": "badge-neon-rose font-bold",
    "neon-indigo": "badge-neon-indigo font-bold",
  };

  const dotColors = {
    default: "bg-indigo-500",
    secondary: "bg-slate-500",
    success: "bg-emerald-500 animate-pulse",
    warning: "bg-amber-500",
    danger: "bg-red-500 animate-ping",
    purple: "bg-purple-500",
    blue: "bg-blue-500",
    outline: "bg-slate-400",
    "neon-emerald": "bg-emerald-500 animate-pulse",
    "neon-amber": "bg-amber-500 animate-pulse",
    "neon-rose": "bg-rose-500 animate-ping",
    "neon-indigo": "bg-indigo-500 animate-pulse",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all duration-200 shadow-2xs",
        variants[variant],
        className
      )}
      {...props}
    >
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColors[variant])} />}
      {children}
    </span>
  );
}

// --- PROGRESS BAR COMPONENT ---
export function ProgressBar({ value, max = 100, className }: { value: number; max?: number; className?: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn("w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/80", className)}>
      <div
        className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 h-full rounded-full transition-all duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// --- PROGRESS RING COMPONENT ---
export function ProgressRing({
  progress,
  size = 48,
  strokeWidth = 4,
  className,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-100"
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="text-indigo-600 transition-all duration-700 ease-out"
          fill="transparent"
        />
      </svg>
      <div className="absolute text-[11px] font-bold text-slate-800">
        {Math.round(progress)}%
      </div>
    </div>
  );
}

// --- INPUT & TEXTAREA COMPONENTS ---
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, type = "text", ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5 text-left">
        {label && <label className="text-xs font-semibold text-slate-700">{label}</label>}
        <input
          type={type}
          ref={ref}
          className={cn(
            "w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-xs",
            "focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-600 transition-all",
            error && "border-red-500 focus:ring-red-500/40 focus:border-red-500",
            className
          )}
          {...props}
        />
        {error ? (
          <p className="text-xs text-red-600">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-slate-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string }>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5 text-left">
        {label && <label className="text-xs font-semibold text-slate-700">{label}</label>}
        <textarea
          ref={ref}
          className={cn(
            "w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-xs",
            "focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-600 transition-all min-h-[90px]",
            error && "border-red-500 focus:ring-red-500/40 focus:border-red-500",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

// --- SELECT COMPONENT ---
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, children, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5 text-left">
        {label && <label className="text-xs font-semibold text-slate-700">{label}</label>}
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              "w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 appearance-none cursor-pointer shadow-xs",
              "focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-600 transition-all pr-10",
              error && "border-red-500 focus:ring-red-500/40 focus:border-red-500",
              className
            )}
            {...props}
          >
            {options ? options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-white text-slate-900">
                {opt.label}
              </option>
            )) : children}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";

// --- MODAL / DIALOG COMPONENT ---
export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "max-w-lg",
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div
        className={cn(
          "relative z-10 w-full rounded-2xl bg-white border border-slate-200/90 p-6 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto text-slate-900",
          maxWidth
        )}
      >
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            {title && <h3 className="text-xl font-bold text-slate-900">{title}</h3>}
            {description && <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

// --- SKELETON LOADER ---
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-slate-200", className)}
      {...props}
    />
  );
}
