"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  PhoneMissed,
  Bot,
  UserCheck,
  AlertTriangle,
  CalendarCheck,
  TrendingUp,
  ArrowRight,
  Filter,
  Search,
  ExternalLink,
  Clock,
  Sparkles,
  PhoneCall,
  CheckCircle2,
  Calendar,
  Layers,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { storageRepo, AppState } from "@/lib/store/storage";
import { Conversation, ConversationStatus, UrgencyLevel, DashboardKPIs } from "@/types";
import { Button, Badge, Card, CardHeader, CardTitle, CardContent, Input, Select } from "@/components/ui";
import {
  formatDateTime,
  formatRelativeTime,
  getUrgencyBadgeClasses,
  getStatusBadgeClasses,
  formatPhone,
} from "@/lib/utils";

const chartTrendData = [
  { day: "Mon", missedCalls: 12, aiHandled: 12, leads: 9 },
  { day: "Tue", missedCalls: 15, aiHandled: 15, leads: 11 },
  { day: "Wed", missedCalls: 8, aiHandled: 8, leads: 7 },
  { day: "Thu", missedCalls: 22, aiHandled: 21, leads: 18 },
  { day: "Fri", missedCalls: 19, aiHandled: 19, leads: 16 },
  { day: "Sat", missedCalls: 26, aiHandled: 25, leads: 22 },
  { day: "Sun", missedCalls: 14, aiHandled: 14, leads: 12 },
];

const intentPieData = [
  { name: "Order / Inquiry", value: 45, color: "#4f46e5" },
  { name: "Calendar Booking", value: 30, color: "#059669" },
  { name: "Tracking / Status", value: 15, color: "#d97706" },
  { name: "Reschedule / Help", value: 10, color: "#db2777" },
];

export default function DashboardPage() {
  const [appState, setAppState] = useState<AppState>(storageRepo.getState());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");

  useEffect(() => {
    const unsub = storageRepo.subscribe((s) => setAppState({ ...s }));
    return () => unsub();
  }, []);

  const activeBiz = storageRepo.getActiveBusiness();
  const kpis: DashboardKPIs = storageRepo.getDashboardKPIs(activeBiz.id);
  const conversations = storageRepo.getConversations(activeBiz.id);
  const urgentCalls = conversations.filter(
    (c) => (c.urgency === "HIGH" || c.urgency === "CRITICAL") && c.status === "new"
  );

  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      (c.callerName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.callerNumber.includes(searchQuery) ||
      c.intent.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesUrgency = urgencyFilter === "all" || c.urgency === urgencyFilter;
    return matchesSearch && matchesStatus && matchesUrgency;
  });

  const handleStatusChange = (convId: string, newStatus: ConversationStatus) => {
    storageRepo.updateConversationStatus(convId, newStatus);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {activeBiz.name}
            </h1>
            <Badge variant="purple" dot className="capitalize">
              {activeBiz.type.replace("_", " ")}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time missed-call pipeline, AI conversation transcripts, and automated calendar follow-ups.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/simulator">
            <Button size="md" variant="glow" leftIcon={<Bot className="h-4 w-4" />}>
              Open Simulator
            </Button>
          </Link>
          <Link href="/workflows/new">
            <Button size="md" variant="secondary">
              + New Workflow
            </Button>
          </Link>
        </div>
      </div>

      {/* Urgent Follow-up Alert Banner */}
      {urgentCalls.length > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200/90 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3.5">
            <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                {urgentCalls.length} Urgent Follow-Up{urgentCalls.length > 1 ? "s" : ""} Pending
              </h3>
              <p className="text-xs text-amber-800/90 mt-0.5">
                High-priority leads require immediate callback (e.g. 24-hr orders, expedited deliveries, doctor appointments).
              </p>
            </div>
          </div>
          <Link href={`/conversations/${urgentCalls[0].id}`}>
            <Button size="sm" variant="glow" className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm">
              Review Top Lead &rarr;
            </Button>
          </Link>
        </div>
      )}

      {/* 6 KPI METRICS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          {
            label: "Missed Calls",
            value: kpis.missedCalls,
            sub: "+14% this week",
            icon: PhoneMissed,
            color: "text-red-600",
            bg: "bg-red-50 border-red-100",
          },
          {
            label: "AI Handled",
            value: kpis.aiConversations,
            sub: "100% response rate",
            icon: Bot,
            color: "text-indigo-600",
            bg: "bg-indigo-50 border-indigo-100",
          },
          {
            label: "Qualified Leads",
            value: kpis.qualifiedLeads,
            sub: "CRM profiles saved",
            icon: UserCheck,
            color: "text-emerald-600",
            bg: "bg-emerald-50 border-emerald-100",
          },
          {
            label: "Urgent Leads",
            value: kpis.urgentFollowUps,
            sub: "Require fast callback",
            icon: AlertTriangle,
            color: "text-amber-600",
            bg: "bg-amber-50 border-amber-100",
          },
          {
            label: "GCal Bookings",
            value: kpis.appointmentsBooked,
            sub: "API v3 auto-booked",
            icon: CalendarCheck,
            color: "text-blue-600",
            bg: "bg-blue-50 border-blue-100",
          },
          {
            label: "Completion Rate",
            value: `${kpis.completionRate}%`,
            sub: "Entity intake complete",
            icon: TrendingUp,
            color: "text-purple-600",
            bg: "bg-purple-50 border-purple-100",
          },
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Card key={idx} className="p-4 border-slate-200/90 bg-white shadow-xs hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{kpi.label}</span>
                <div className={`p-1.5 rounded-lg border ${kpi.bg}`}>
                  <Icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black tracking-tight text-slate-900">{kpi.value}</div>
              <div className="text-[11px] text-slate-500 mt-1 font-medium">{kpi.sub}</div>
            </Card>
          );
        })}
      </div>

      {/* ANALYTICS CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Call Volume Trend Chart */}
        <Card className="lg:col-span-2 p-6 border-slate-200/90 bg-white shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Missed Call Intake Volume</h3>
              <p className="text-xs text-slate-500 mt-0.5">Missed incoming calls vs AI handled follow-ups.</p>
            </div>
            <Badge variant="success" dot>Live Sync</Badge>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#e2e8f0",
                    borderRadius: "12px",
                    color: "#0f172a",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                    fontSize: "12px",
                  }}
                />
                <Area type="monotone" dataKey="missedCalls" name="Missed Calls" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorCalls)" />
                <Area type="monotone" dataKey="leads" name="Qualified Leads" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#colorLeads)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Intent Distribution Donut */}
        <Card className="p-6 border-slate-200/90 bg-white shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Caller Intent Breakdown</h3>
            <p className="text-xs text-slate-500 mt-0.5">Automated classification of customer goals.</p>
          </div>

          <div className="h-44 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={intentPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value">
                  {intentPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#e2e8f0",
                    borderRadius: "12px",
                    color: "#0f172a",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 font-medium">
            {intentPieData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="truncate">{item.name}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* RECENT CONVERSATIONS TABLE */}
      <Card className="border-slate-200/90 bg-white shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Missed-Call Conversations</h3>
            <p className="text-xs text-slate-500 mt-0.5">Live transcripts, extracted entities, and urgency classifications.</p>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-48 sm:w-60">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search caller or intent..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl bg-slate-50 border border-slate-200 pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="completed">Completed</option>
              <option value="closed">Closed</option>
            </select>

            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Urgency</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="NORMAL">Normal</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Caller</th>
                <th className="px-6 py-3.5">Intent / Summary</th>
                <th className="px-6 py-3.5">Urgency</th>
                <th className="px-6 py-3.5">Time</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredConversations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No conversations match your search. Try running a test in the Simulator!
                  </td>
                </tr>
              ) : (
                filteredConversations.map((conv) => {
                  const urgencyCls = getUrgencyBadgeClasses(conv.urgency);
                  const statusCls = getStatusBadgeClasses(conv.status);

                  return (
                    <tr key={conv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-medium">
                        <div className="text-slate-900 font-bold">{conv.callerName || "Unknown Caller"}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">{formatPhone(conv.callerNumber)}</div>
                      </td>

                      <td className="px-6 py-4 max-w-xs">
                        <div className="font-semibold text-slate-800 truncate">{conv.intent}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{conv.summary}</div>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${urgencyCls}`}>
                          {conv.urgency}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-500 text-[11px]">
                        {formatRelativeTime(conv.createdAt)}
                      </td>

                      <td className="px-6 py-4">
                        <select
                          value={conv.status}
                          onChange={(e) => handleStatusChange(conv.id, e.target.value as ConversationStatus)}
                          className={`rounded-lg text-[11px] font-semibold px-2 py-1 border focus:outline-none cursor-pointer ${statusCls}`}
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="completed">Completed</option>
                          <option value="closed">Closed</option>
                        </select>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Link href={`/conversations/${conv.id}`}>
                          <Button size="sm" variant="outline" rightIcon={<ExternalLink className="h-3 w-3" />}>
                            View Transcript
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
