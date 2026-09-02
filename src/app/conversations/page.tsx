"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Search,
  Filter,
  Bot,
  CalendarCheck,
  AlertTriangle,
  ExternalLink,
  PhoneCall,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { storageRepo, AppState } from "@/lib/store/storage";
import { Conversation, ConversationStatus, UrgencyLevel } from "@/types";
import { Button, Badge, Card, Input } from "@/components/ui";
import {
  formatDateTime,
  formatRelativeTime,
  getUrgencyBadgeClasses,
  getStatusBadgeClasses,
  formatPhone,
} from "@/lib/utils";

export default function ConversationsPage() {
  const [appState, setAppState] = useState<AppState>(storageRepo.getState());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedUrgency, setSelectedUrgency] = useState<string>("all");

  useEffect(() => {
    const unsub = storageRepo.subscribe((s) => setAppState({ ...s }));
    return () => unsub();
  }, []);

  const activeBiz = storageRepo.getActiveBusiness();
  const conversations = storageRepo.getConversations(activeBiz.id);

  const filtered = conversations.filter((c) => {
    const matchesSearch =
      (c.callerName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.callerNumber.includes(searchQuery) ||
      c.intent.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === "all" || c.status === selectedStatus;
    const matchesUrgency = selectedUrgency === "all" || c.urgency === selectedUrgency;
    return matchesSearch && matchesStatus && matchesUrgency;
  });

  const handleStatusChange = (id: string, newStatus: ConversationStatus) => {
    storageRepo.updateConversationStatus(id, newStatus);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <MessageSquare className="h-7 w-7 text-indigo-600" />
            <span>Missed-Call Conversations</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Complete transcripts, AI entity extraction, and follow-up status records for <strong>{activeBiz.name}</strong>.
          </p>
        </div>

        <Link href="/simulator">
          <Button size="md" variant="glow" leftIcon={<Bot className="h-4 w-4" />}>
            Simulate New Call
          </Button>
        </Link>
      </div>

      {/* Search & Status Filters */}
      <Card className="p-4 border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by caller, phone, or intent..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl bg-slate-50 border border-slate-300 pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
            {["all", "new", "contacted", "completed", "closed"].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors cursor-pointer ${
                  selectedStatus === st
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Conversations Table */}
      <Card className="border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Caller Details</th>
                <th className="px-6 py-4">Intent & Summary</th>
                <th className="px-6 py-4">Urgency</th>
                <th className="px-6 py-4">Follow-up Status</th>
                <th className="px-6 py-4">Date & Time</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No conversation records found.
                  </td>
                </tr>
              ) : (
                filtered.map((conv) => {
                  const urgencyCls = getUrgencyBadgeClasses(conv.urgency);
                  const statusCls = getStatusBadgeClasses(conv.status);

                  return (
                    <tr key={conv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">
                          {conv.callerName || "Caller"}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {formatPhone(conv.callerNumber)}
                        </div>
                      </td>

                      <td className="px-6 py-4 max-w-xs">
                        <div className="font-bold text-slate-800">{conv.intent}</div>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {conv.summary || "Conversation details collected."}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${urgencyCls}`}>
                          {conv.urgency}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <select
                          value={conv.status}
                          onChange={(e) => handleStatusChange(conv.id, e.target.value as ConversationStatus)}
                          className={`rounded-xl px-2.5 py-1 text-[11px] font-bold border ${statusCls} cursor-pointer focus:outline-none`}
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="completed">Completed</option>
                          <option value="closed">Closed</option>
                        </select>
                      </td>

                      <td className="px-6 py-4 text-slate-500 text-[11px]">
                        <div className="font-medium text-slate-700">{formatDateTime(conv.createdAt)}</div>
                        <div className="text-[10px] text-slate-400">{formatRelativeTime(conv.createdAt)}</div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Link href={`/conversations/${conv.id}`}>
                          <Button size="sm" variant="outline" className="text-xs" rightIcon={<ExternalLink className="h-3 w-3" />}>
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
