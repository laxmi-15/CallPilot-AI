"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  GitBranch,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Bot,
  CalendarCheck,
  Zap,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Layers,
  Sparkles,
} from "lucide-react";
import { storageRepo } from "@/lib/store/storage";
import { Workflow, WorkflowField, WorkflowCondition, WorkflowAction, FieldType, ConditionOperator, ActionType } from "@/types";
import { Button, Card, Input, Textarea, Badge, Dialog } from "@/components/ui";
import { generateId } from "@/lib/utils";

interface WorkflowBuilderProps {
  initialWorkflow?: Workflow;
  isEditing?: boolean;
}

export function WorkflowBuilder({ initialWorkflow, isEditing = false }: WorkflowBuilderProps) {
  const router = useRouter();
  const activeBiz = storageRepo.getActiveBusiness();

  // Workflow Form State
  const [name, setName] = useState(initialWorkflow?.name || "Custom Missed-Call Workflow");
  const [description, setDescription] = useState(
    initialWorkflow?.description || "Automates customer intake and records requirements."
  );
  const [greeting, setGreeting] = useState(
    initialWorkflow?.greeting || "Hello! Thank you for calling. How can I help you today?"
  );
  const [greetingHi, setGreetingHi] = useState(
    initialWorkflow?.greetingHi || "नमस्ते! कॉल करने के लिए धन्यवाद। मैं आपकी क्या मदद करूँ?"
  );
  const [personality, setPersonality] = useState<"professional" | "warm_friendly" | "concise" | "empathetic">(
    initialWorkflow?.personality || "warm_friendly"
  );
  const [language, setLanguage] = useState(initialWorkflow?.language || "en");
  const [closingMessage, setClosingMessage] = useState(
    initialWorkflow?.closingMessage || "Thank you! I have saved all your details. We will follow up shortly."
  );
  const [closingMessageHi, setClosingMessageHi] = useState(
    initialWorkflow?.closingMessageHi || "धन्यवाद! मैंने आपका विवरण नोट कर लिया है।"
  );

  // Fields State
  const [fields, setFields] = useState<WorkflowField[]>(
    initialWorkflow?.fields || [
      {
        id: "f_1",
        name: "customer_name",
        label: "Customer Name",
        type: "text",
        required: true,
        question: "May I have your name, please?",
        order: 1,
      },
      {
        id: "f_2",
        name: "phone_number",
        label: "Phone Number",
        type: "phone",
        required: true,
        question: "What is the best callback phone number?",
        order: 2,
      },
    ]
  );

  // Conditions State
  const [conditions, setConditions] = useState<WorkflowCondition[]>(
    initialWorkflow?.conditions || [
      {
        id: "cond_1",
        fieldId: "f_1",
        operator: "is_set",
        value: "true",
        thenUrgency: "NORMAL",
        description: "Standard follow-up on caller details intake.",
      },
    ]
  );

  // Actions State
  const [actions, setActions] = useState<WorkflowAction[]>(
    initialWorkflow?.actions || [
      {
        id: "act_1",
        type: "create_customer",
        name: "Create CRM Profile",
        description: "Creates or updates customer profile in CRM",
        config: {},
        enabled: true,
      },
    ]
  );

  const [activeTab, setActiveTab] = useState<"general" | "fields" | "conditions" | "actions">("general");
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Field Management
  const handleAddField = () => {
    const newField: WorkflowField = {
      id: generateId("f"),
      name: `field_${fields.length + 1}`,
      label: `New Field ${fields.length + 1}`,
      type: "text",
      required: false,
      question: "Could you please specify this requirement?",
      order: fields.length + 1,
    };
    setFields([...fields, newField]);
  };

  const handleUpdateField = (index: number, updates: Partial<WorkflowField>) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], ...updates };
    setFields(updated);
  };

  const handleRemoveField = (index: number) => {
    if (fields.length <= 1) {
      alert("Workflow must contain at least 1 field.");
      return;
    }
    setFields(fields.filter((_, i) => i !== index));
  };

  // Condition Management
  const handleAddCondition = () => {
    const newCond: WorkflowCondition = {
      id: generateId("cond"),
      fieldId: fields[0]?.id || "f_1",
      operator: "within_hours",
      value: "24",
      thenUrgency: "HIGH",
      description: "Auto-flag as HIGH urgency if needed within 24 hours.",
    };
    setConditions([...conditions, newCond]);
  };

  const handleUpdateCondition = (index: number, updates: Partial<WorkflowCondition>) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], ...updates };
    setConditions(updated);
  };

  const handleRemoveCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  // Action Management
  const handleAddAction = (type: ActionType) => {
    const newAction: WorkflowAction = {
      id: generateId("act"),
      type,
      name: type === "create_calendar_event" ? "Schedule Google Calendar Event" : "Create Task in Dashboard",
      description: "Automated action executed upon intake completion",
      config: {},
      enabled: true,
    };
    setActions([...actions, newAction]);
  };

  const handleRemoveAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  // Save Workflow
  const handleSave = () => {
    if (!name.trim()) {
      alert("Workflow name is required.");
      return;
    }

    const workflowData: Workflow = {
      id: initialWorkflow?.id || generateId("wf"),
      businessId: activeBiz.id,
      name,
      description,
      industry: activeBiz.type,
      trigger: initialWorkflow?.trigger || "missed_call",
      isActive: initialWorkflow?.isActive ?? true,
      greeting,
      greetingHi,
      closingMessage,
      closingMessageHi,
      personality,
      language: language as any,
      fields,
      conditions,
      actions,
      ownerNotification: initialWorkflow?.ownerNotification || {
        notifyOnUrgent: true,
        notifyOnAll: false,
        channels: ["in_app"],
      },
      createdAt: initialWorkflow?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isEditing && initialWorkflow) {
      storageRepo.updateWorkflow(initialWorkflow.id, workflowData);
    } else {
      storageRepo.createWorkflow(workflowData);
    }

    setSavedSuccess(true);
    setTimeout(() => {
      router.push("/workflows");
    }, 1200);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/workflows">
            <Button size="sm" variant="secondary" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {isEditing ? `Edit: ${name}` : "Create New Workflow"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure triggers, AI questions, extraction fields, and calendar tools.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button size="md" variant="glow" onClick={handleSave} leftIcon={<Save className="h-4 w-4" />}>
            {savedSuccess ? "✓ Saved Successfully!" : "Save Workflow"}
          </Button>
        </div>
      </div>

      {/* Builder Step Tabs */}
      <div className="flex border-b border-slate-200 gap-2 pb-2 overflow-x-auto">
        {[
          { id: "general", label: "1. Persona & Greetings", count: null },
          { id: "fields", label: "2. Extraction Fields", count: fields.length },
          { id: "conditions", label: "3. Urgency Rules", count: conditions.length },
          { id: "actions", label: "4. Automated Actions", count: actions.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === tab.id
                ? "bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== null && (
              <span className="h-4 min-w-4 px-1 rounded-full bg-slate-200 text-[10px] text-slate-700 flex items-center justify-center font-bold">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: GENERAL SETTINGS */}
      {activeTab === "general" && (
        <div className="space-y-6">
          <Card className="p-6 border-slate-200 bg-white shadow-xs space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Bot className="h-4 w-4 text-indigo-600" />
              <span>Workflow Identity</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Workflow Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Urgent Cake Order Intake"
              />
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Personality & Tone</label>
                <select
                  value={personality}
                  onChange={(e) => setPersonality(e.target.value as any)}
                  className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="warm_friendly">Warm & Friendly (Default)</option>
                  <option value="professional">Professional & Direct</option>
                  <option value="empathetic">Empathetic & Reassuring (Clinics)</option>
                  <option value="concise">Fast & Concise (Logistics)</option>
                </select>
              </div>
            </div>

            <Textarea
              label="Workflow Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this workflow accomplishes for the business..."
            />
          </Card>

          <Card className="p-6 border-slate-200 bg-white shadow-xs space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <span>Conversational Greetings & Closing</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Textarea
                label="English Greeting (First sentence spoken to caller)"
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
              />
              <Textarea
                label="Hindi / Hinglish Greeting"
                value={greetingHi}
                onChange={(e) => setGreetingHi(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Textarea
                label="English Closing Message (When all details are captured)"
                value={closingMessage}
                onChange={(e) => setClosingMessage(e.target.value)}
              />
              <Textarea
                label="Hindi / Hinglish Closing Message"
                value={closingMessageHi}
                onChange={(e) => setClosingMessageHi(e.target.value)}
              />
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: EXTRACTION FIELDS */}
      {activeTab === "fields" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Define the structured data items the AI should extract from the natural voice conversation.
            </p>
            <Button size="sm" variant="glow" onClick={handleAddField} leftIcon={<Plus className="h-3.5 w-3.5" />}>
              Add Field
            </Button>
          </div>

          <div className="space-y-3">
            {fields.map((field, idx) => (
              <Card key={field.id} className="p-4 border-slate-200 bg-white shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-bold text-slate-900">{field.label || "Untitled Field"}</span>
                    {field.required && <Badge variant="danger">Required</Badge>}
                  </div>
                  <button
                    onClick={() => handleRemoveField(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    label="Field Key (JSON property)"
                    value={field.name}
                    onChange={(e) => handleUpdateField(idx, { name: e.target.value })}
                  />
                  <Input
                    label="Field Display Label"
                    value={field.label}
                    onChange={(e) => handleUpdateField(idx, { label: e.target.value })}
                  />
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Data Type</label>
                    <select
                      value={field.type}
                      onChange={(e) => handleUpdateField(idx, { type: e.target.value as FieldType })}
                      className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="text">Text (Name, Notes)</option>
                      <option value="phone">Phone Number</option>
                      <option value="date">Date (Pickup, Appointment)</option>
                      <option value="time">Time Slot</option>
                      <option value="number">Number (Quantity, Weight)</option>
                      <option value="email">Email Address</option>
                      <option value="address">Delivery Address</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <div className="sm:col-span-3">
                    <Input
                      label="AI Guiding Prompt (Question asked if field is missing)"
                      value={field.question}
                      onChange={(e) => handleUpdateField(idx, { question: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-2 pb-2">
                    <input
                      type="checkbox"
                      id={`req_${field.id}`}
                      checked={field.required}
                      onChange={(e) => handleUpdateField(idx, { required: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <label htmlFor={`req_${field.id}`} className="text-xs font-semibold text-slate-700 cursor-pointer">
                      Mandatory Field
                    </label>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CONDITIONS & URGENCY */}
      {activeTab === "conditions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Define conditional branching rules to calculate urgency and triage high-priority customers.
            </p>
            <Button size="sm" variant="glow" onClick={handleAddCondition} leftIcon={<Plus className="h-3.5 w-3.5" />}>
              Add Rule
            </Button>
          </div>

          <div className="space-y-3">
            {conditions.map((cond, idx) => (
              <Card key={cond.id} className="p-4 border-slate-200 bg-white shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-bold text-slate-900">Rule #{idx + 1}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveCondition(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">If Field</label>
                    <select
                      value={cond.fieldId}
                      onChange={(e) => handleUpdateCondition(idx, { fieldId: e.target.value })}
                      className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    >
                      {fields.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label} ({f.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Condition</label>
                    <select
                      value={cond.operator}
                      onChange={(e) => handleUpdateCondition(idx, { operator: e.target.value as ConditionOperator })}
                      className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="within_hours">Is within next X hours</option>
                      <option value="equals">Equals</option>
                      <option value="contains">Contains text</option>
                      <option value="greater_than">Greater than</option>
                      <option value="less_than">Less than</option>
                      <option value="is_set">Is provided by caller</option>
                    </select>
                  </div>

                  <Input
                    label="Value"
                    value={String(cond.value ?? "")}
                    onChange={(e) => handleUpdateCondition(idx, { value: e.target.value })}
                    placeholder="e.g. 24"
                  />

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Then Set Urgency</label>
                    <select
                      value={cond.thenUrgency}
                      onChange={(e) => handleUpdateCondition(idx, { thenUrgency: e.target.value as any })}
                      className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="NORMAL">NORMAL</option>
                      <option value="HIGH">HIGH (Urgent Alert)</option>
                      <option value="CRITICAL">CRITICAL (Emergency)</option>
                      <option value="LOW">LOW</option>
                    </select>
                  </div>
                </div>

                <Input
                  label="Rule Description"
                  value={cond.description}
                  onChange={(e) => handleUpdateCondition(idx, { description: e.target.value })}
                />
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: ACTIONS */}
      {activeTab === "actions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Automated actions executed when the conversation completes or triggers an event.
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => handleAddAction("create_task")}>
                + Task Action
              </Button>
              <Button size="sm" variant="glow" onClick={() => handleAddAction("create_calendar_event")}>
                + Google Calendar Action
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {actions.map((act, idx) => (
              <Card key={act.id} className="p-4 border-slate-200 bg-white shadow-xs flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600">
                    {act.type === "create_calendar_event" ? (
                      <CalendarCheck className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <Layers className="h-5 w-5 text-indigo-600" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{act.name}</h4>
                    <p className="text-xs text-slate-500">Type: <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700 font-mono text-[11px]">{act.type}</code></p>
                  </div>
                </div>

                <button
                  onClick={() => handleRemoveAction(idx)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
