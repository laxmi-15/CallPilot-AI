"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PhoneCall,
  LayoutDashboard,
  GitBranch,
  Bot,
  MessageSquare,
  Users,
  Calendar as CalendarIcon,
  Settings,
  Bell,
  Sparkles,
  ChevronDown,
  Building2,
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  HelpCircle,
  BookOpen,
} from "lucide-react";
import { storageRepo, AppState } from "@/lib/store/storage";
import { Badge, Button, Dialog } from "@/components/ui";
import { formatRelativeTime } from "@/lib/utils";
import { WorkflowGuideModal } from "@/components/layout/WorkflowGuideModal";

export function Header() {
  const pathname = usePathname();
  const [appState, setAppState] = useState<AppState>(storageRepo.getState());
  const [showNotifications, setShowNotifications] = useState(false);
  const [showBizSwitcher, setShowBizSwitcher] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showWorkflowGuide, setShowWorkflowGuide] = useState(false);

  useEffect(() => {
    const unsub = storageRepo.subscribe((s) => setAppState({ ...s }));
    return () => unsub();
  }, []);

  const activeBiz = storageRepo.getActiveBusiness();
  const unreadNotifs = storageRepo.getNotifications().filter((n) => !n.isRead);

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/simulator", label: "AI Simulator", icon: Bot, highlight: true },
    { href: "/workflows", label: "Workflows", icon: GitBranch },
    { href: "/conversations", label: "Conversations", icon: MessageSquare },
    { href: "/customers", label: "Customers", icon: Users },
    { href: "/calendar", label: "Calendar", icon: CalendarIcon },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const handleSelectBusiness = (bizId: string) => {
    storageRepo.setActiveBusiness(bizId);
    setShowBizSwitcher(false);
  };

  const handleLoadDemoPreset = (type: string) => {
    storageRepo.loadDemoBusiness(type);
    setShowBizSwitcher(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/90 bg-white/85 backdrop-blur-xl shadow-xs">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-transform">
                <PhoneCall className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
                  CallPilot <span className="text-indigo-600 font-extrabold">AI</span>
                </span>
                <span className="text-[10px] text-slate-500 -mt-1 hidden sm:inline font-medium">
                  Missed-Call Voice Assistant
                </span>
              </div>
            </Link>

            {/* Active Business Switcher */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setShowBizSwitcher(!showBizSwitcher)}
                className="flex items-center gap-2 rounded-xl bg-slate-100/90 border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-200/70 transition-colors cursor-pointer shadow-2xs"
              >
                <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                <span className="max-w-[140px] truncate">{activeBiz.name}</span>
                <ChevronDown className="h-3 w-3 text-slate-500" />
              </button>

              {showBizSwitcher && (
                <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-2 py-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Select Demo Business
                  </div>
                  <button
                    onClick={() => handleLoadDemoPreset("cake_shop")}
                    className="w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-xl hover:bg-indigo-50 text-left text-slate-800 font-medium transition-colors cursor-pointer"
                  >
                    <span>🎂 Sweet Delights Bakery</span>
                    {activeBiz.type === "cake_shop" && <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />}
                  </button>
                  <button
                    onClick={() => handleLoadDemoPreset("clinic")}
                    className="w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-xl hover:bg-indigo-50 text-left text-slate-800 font-medium transition-colors cursor-pointer"
                  >
                    <span>🏥 Metro Health Clinic</span>
                    {activeBiz.type === "clinic" && <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />}
                  </button>
                  <button
                    onClick={() => handleLoadDemoPreset("delivery")}
                    className="w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-xl hover:bg-indigo-50 text-left text-slate-800 font-medium transition-colors cursor-pointer"
                  >
                    <span>🚚 SwiftRoute Logistics</span>
                    {activeBiz.type === "delivery" && <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />}
                  </button>
                  <button
                    onClick={() => handleLoadDemoPreset("real_estate")}
                    className="w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-xl hover:bg-indigo-50 text-left text-slate-800 font-medium transition-colors cursor-pointer"
                  >
                    <span>🏡 Prime Properties</span>
                    {activeBiz.type === "real_estate" && <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />}
                  </button>
                  <button
                    onClick={() => handleLoadDemoPreset("repair_service")}
                    className="w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-xl hover:bg-indigo-50 text-left text-slate-800 font-medium transition-colors cursor-pointer"
                  >
                    <span>🔧 FixIt Home Repair</span>
                    {activeBiz.type === "repair_service" && <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />}
                  </button>
                  <div className="border-t border-slate-100 my-1 pt-1">
                    <Link
                      href="/onboarding"
                      onClick={() => setShowBizSwitcher(false)}
                      className="w-full flex items-center gap-1.5 px-2.5 py-2 text-xs text-indigo-600 font-semibold hover:bg-indigo-50 rounded-xl transition-colors"
                    >
                      <span>+ Setup New Business</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  } ${item.highlight ? "relative text-indigo-700 font-bold" : ""}`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-indigo-600" : "text-slate-500"}`} />
                  <span>{item.label}</span>
                  {item.highlight && (
                    <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Actions: Workflow Guide Button, Calendar Status, Notifications, Simulator CTA */}
          <div className="flex items-center gap-2.5">
            {/* Workflow Guide Help Button */}
            <button
              onClick={() => setShowWorkflowGuide(true)}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200/80 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors shadow-2xs cursor-pointer"
              title="Learn how CallPilot AI works"
            >
              <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
              <span>Workflow Guide</span>
            </button>

            {/* Google Calendar Status pill */}
            <button
              onClick={() => setShowCalendarModal(true)}
              className="hidden sm:flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer shadow-2xs"
              title="Google Calendar Integration Active"
            >
              <CalendarCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>GCal Active</span>
            </button>

            {/* Notification bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative rounded-xl p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <Bell className="h-4 w-4" />
                {unreadNotifs.length > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-xs">
                    {unreadNotifs.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-2xl p-4 z-50 animate-in fade-in">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="text-sm font-bold text-slate-900">Notifications</span>
                    <button
                      onClick={() => storageRepo.markAllNotificationsRead()}
                      className="text-xs text-indigo-600 font-semibold hover:underline cursor-pointer"
                    >
                      Mark all as read
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto mt-2">
                    {unreadNotifs.length === 0 ? (
                      <p className="text-xs text-slate-500 py-4 text-center">No unread notifications</p>
                    ) : (
                      unreadNotifs.map((n) => (
                        <div key={n.id} className="py-2.5 flex items-start gap-2.5">
                          <div className="mt-0.5 rounded-lg bg-indigo-50 p-1.5 text-indigo-600 shrink-0">
                            <Sparkles className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-bold text-slate-900">{n.title}</p>
                            <p className="text-[11px] text-slate-600 mt-0.5">{n.message}</p>
                            <p className="text-[10px] text-slate-400 mt-1">{formatRelativeTime(n.createdAt)}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Simulator CTA button */}
            <Link href="/simulator">
              <Button size="sm" variant="glow" leftIcon={<Bot className="h-3.5 w-3.5" />}>
                Simulator
              </Button>
            </Link>
          </div>
        </div>

        {/* Mobile secondary navigation */}
        <div className="flex lg:hidden overflow-x-auto border-t border-slate-100 px-4 py-2 gap-1 bg-slate-50 scrollbar-none">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  isActive ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </header>

      {/* Google Calendar Info & Connection Modal */}
      <Dialog
        isOpen={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
        title="Google Calendar Agent Tool"
        description="CallPilot AI directly interfaces with Google Calendar API v3 to automate appointment checks, scheduling, and cancellations."
      >
        <div className="space-y-4 text-sm text-slate-700">
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-emerald-900">Calendar Agent Tool Active</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                The AI model has real-time tool calling access to <code className="bg-emerald-100 px-1 py-0.5 rounded text-emerald-900 font-mono text-[11px]">calendar.checkAvailability</code>, <code className="bg-emerald-100 px-1 py-0.5 rounded text-emerald-900 font-mono text-[11px]">calendar.createEvent</code>, and <code className="bg-emerald-100 px-1 py-0.5 rounded text-emerald-900 font-mono text-[11px]">calendar.cancelEvent</code>.
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3.5 space-y-2 border border-slate-200">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Available Calendar Tools</h4>
            <ul className="text-xs space-y-1.5 text-slate-600 list-disc list-inside">
              <li><strong>calendar.checkAvailability</strong>: Inspects business schedule conflicts before booking.</li>
              <li><strong>calendar.createEvent</strong>: Reserves appointment slot and generates event invite.</li>
              <li><strong>calendar.updateEvent</strong>: Reschedules existing patient or client calendar booking.</li>
              <li><strong>calendar.cancelEvent</strong>: Deletes/cancels calendar reservation upon customer request.</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setShowCalendarModal(false)}>
              Close
            </Button>
            <Link href="/calendar" onClick={() => setShowCalendarModal(false)}>
              <Button size="sm" variant="primary" rightIcon={<ExternalLink className="h-3.5 w-3.5" />}>
                View Calendar Events
              </Button>
            </Link>
          </div>
        </div>
      </Dialog>

      {/* Workflow Guide Modal */}
      <WorkflowGuideModal
        isOpen={showWorkflowGuide}
        onClose={() => setShowWorkflowGuide(false)}
      />
    </>
  );
}
