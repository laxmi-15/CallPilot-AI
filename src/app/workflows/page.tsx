"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  GitBranch,
  Bot,
  Plus,
  ArrowRight,
  Sparkles,
  PhoneMissed,
  CalendarCheck,
  Zap,
  CheckCircle2,
  Clock,
  MoreVertical,
  Trash2,
  Edit,
} from "lucide-react";
import { storageRepo, AppState } from "@/lib/store/storage";
import { Workflow } from "@/types";
import { Button, Badge, Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

export default function WorkflowsPage() {
  const [appState, setAppState] = useState<AppState>(storageRepo.getState());

  useEffect(() => {
    const unsub = storageRepo.subscribe((s) => setAppState({ ...s }));
    return () => unsub();
  }, []);

  const activeBiz = storageRepo.getActiveBusiness();
  const workflows = storageRepo.getWorkflows(activeBiz.id);

  const handleToggleActive = (id: string, current: boolean) => {
    storageRepo.updateWorkflow(id, { isActive: !current });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this workflow?")) {
      storageRepo.deleteWorkflow(id);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <GitBranch className="h-7 w-7 text-indigo-600" />
            <span>Missed-Call Workflows</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Data-driven conversational workflows configured for <strong>{activeBiz.name}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/simulator">
            <Button size="md" variant="secondary" leftIcon={<Bot className="h-4 w-4 text-indigo-600" />}>
              Test in Simulator
            </Button>
          </Link>
          <Link href="/workflows/new">
            <Button size="md" variant="glow" leftIcon={<Plus className="h-4 w-4" />}>
              Create Workflow
            </Button>
          </Link>
        </div>
      </div>

      {/* Workflows Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workflows.map((wf) => (
          <Card key={wf.id} className="border-slate-200/90 bg-white p-6 flex flex-col justify-between glass-card-hover shadow-xs space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant={wf.isActive ? "success" : "secondary"} dot={wf.isActive}>
                  {wf.isActive ? "Active on Calls" : "Paused"}
                </Badge>
                <Badge variant="purple" className="capitalize">
                  {wf.industry.replace("_", " ")}
                </Badge>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">{wf.name}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{wf.description}</p>
              </div>

              {/* Workflow Details */}
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 text-xs space-y-1.5 font-mono">
                <div className="flex justify-between text-slate-600">
                  <span>Trigger:</span>
                  <span className="text-indigo-700 font-semibold">Missed Call</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Fields Collected:</span>
                  <span className="text-slate-900 font-bold">{wf.fields.length} Fields</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Urgency Rules:</span>
                  <span className="text-amber-700 font-semibold">{wf.conditions.length} Rules</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Automated Actions:</span>
                  <span className="text-emerald-700 font-semibold">{wf.actions.length} Actions</span>
                </div>
              </div>
            </div>

            {/* Card Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                onClick={() => handleToggleActive(wf.id, wf.isActive)}
                className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                  wf.isActive
                    ? "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                }`}
              >
                {wf.isActive ? "Pause" : "Activate"}
              </button>

              <div className="flex items-center gap-1.5">
                <Link href={`/workflows/${wf.id}`}>
                  <Button size="sm" variant="outline" leftIcon={<Edit className="h-3 w-3" />}>
                    Edit
                  </Button>
                </Link>
                {workflows.length > 1 && (
                  <button
                    onClick={() => handleDelete(wf.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete workflow"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
