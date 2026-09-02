"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  PhoneCall,
  Calendar,
  MessageSquare,
  Clock,
  ExternalLink,
  Sparkles,
  User,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { storageRepo, AppState } from "@/lib/store/storage";
import { Customer, UrgencyLevel } from "@/types";
import { Button, Badge, Card, Dialog } from "@/components/ui";
import {
  formatDateTime,
  formatRelativeTime,
  getUrgencyBadgeClasses,
  formatPhone,
} from "@/lib/utils";

export default function CustomersPage() {
  const [appState, setAppState] = useState<AppState>(storageRepo.getState());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    const unsub = storageRepo.subscribe((s) => setAppState({ ...s }));
    return () => unsub();
  }, []);

  const activeBiz = storageRepo.getActiveBusiness();
  const customers = storageRepo.getCustomers(activeBiz.id);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      (c.notes || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="h-7 w-7 text-indigo-600" />
            <span>Customer Profiles & CRM</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Structured customer records automatically created and updated from missed-call conversations.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="p-4 border-slate-200 bg-white shadow-xs">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search customers by name, phone, or preferences..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl bg-slate-50 border border-slate-300 pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </Card>

      {/* Customers Table */}
      <Card className="border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Customer Name</th>
                <th className="px-6 py-4">Phone Number</th>
                <th className="px-6 py-4">Total Calls</th>
                <th className="px-6 py-4">Latest Urgency</th>
                <th className="px-6 py-4">Last Interaction</th>
                <th className="px-6 py-4 text-right">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No customer records found.
                  </td>
                </tr>
              ) : (
                filtered.map((cust) => {
                  const urgencyCls = getUrgencyBadgeClasses(cust.latestUrgency);

                  return (
                    <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{cust.name}</div>
                        {cust.email && <div className="text-[11px] text-slate-500">{cust.email}</div>}
                      </td>

                      <td className="px-6 py-4 font-mono font-medium text-slate-800">
                        {formatPhone(cust.phone)}
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {cust.totalConversations} Calls
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${urgencyCls}`}>
                          {cust.latestUrgency}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-500">
                        {formatRelativeTime(cust.lastInteractionAt)}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedCustomer(cust)}
                        >
                          View Profile
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Customer Detail Drawer / Modal */}
      {selectedCustomer && (
        <Dialog
          isOpen={!!selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          title={selectedCustomer.name}
          description={`Customer profile & historical extracted preferences.`}
          maxWidth="max-w-xl"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3.5 border border-slate-200 text-slate-700">
              <div>
                <span className="text-slate-500">Phone:</span>{" "}
                <strong className="font-mono text-slate-900">{formatPhone(selectedCustomer.phone)}</strong>
              </div>
              <div>
                <span className="text-slate-500">Total Calls:</span>{" "}
                <strong className="text-slate-900">{selectedCustomer.totalConversations}</strong>
              </div>
              <div>
                <span className="text-slate-500">First Contact:</span>{" "}
                <strong className="text-slate-900">{formatDateTime(selectedCustomer.createdAt)}</strong>
              </div>
              <div>
                <span className="text-slate-500">Last Seen:</span>{" "}
                <strong className="text-slate-900">{formatRelativeTime(selectedCustomer.lastInteractionAt)}</strong>
              </div>
            </div>

            {/* Extracted Attributes Map */}
            {selectedCustomer.extractedAttributes && Object.keys(selectedCustomer.extractedAttributes).length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  Extracted Attributes & Preferences
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(selectedCustomer.extractedAttributes).map(([k, v]) => (
                    <div key={k} className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">{k}</div>
                      <div className="text-indigo-700 font-semibold truncate mt-0.5">
                        {typeof v === "object" ? JSON.stringify(v) : String(v)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {selectedCustomer.notes && (
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 space-y-1">
                <span className="font-bold text-[11px]">AI Notes & Requirements:</span>
                <p className="text-xs">{selectedCustomer.notes}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="secondary" size="sm" onClick={() => setSelectedCustomer(null)}>
                Close
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
