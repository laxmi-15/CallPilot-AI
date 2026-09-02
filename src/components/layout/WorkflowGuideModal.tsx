"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  PhoneMissed,
  Bot,
  CalendarCheck,
  Zap,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Play,
  Layers,
  Database,
  Globe2,
  Code2,
  Key,
} from "lucide-react";
import { Dialog, Button, Badge } from "@/components/ui";

interface WorkflowGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WorkflowGuideModal({ isOpen, onClose }: WorkflowGuideModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "steps" | "examples" | "manual">("overview");

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="How CallPilot AI Works (Complete Workflow Guide)"
      description="Everything you need to know about CallPilot AI in simple, friendly terms."
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-2 pb-2 overflow-x-auto">
          {[
            { id: "overview", label: "🌟 What is CallPilot?", icon: Sparkles },
            { id: "steps", label: "🔄 5-Step Workflow", icon: Layers },
            { id: "examples", label: "🏢 Business Examples", icon: Play },
            { id: "manual", label: "🛠️ Manual Setup Guide", icon: Key },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === t.id
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-5 animate-in fade-in">
            <div className="rounded-2xl bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border border-indigo-100 p-5">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="text-xl">🎙️</span> The Core Problem & Solution
              </h3>
              <p className="text-xs sm:text-sm text-slate-700 mt-2 leading-relaxed">
                When you run a business (like a cake shop, doctor&apos;s clinic, or delivery service), you get dozens of phone calls every day. When you are busy assisting an in-person client or performing surgery/baking, you miss calls. <strong>Most callers don&apos;t leave voicemail and simply call your competitor instead.</strong>
              </p>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-medium text-slate-800">
                <div className="flex items-center gap-2 rounded-xl bg-white/80 border border-indigo-100/80 p-3 shadow-xs">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  <span><strong>Without CallPilot:</strong> Missed call = Lost revenue</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white/80 border border-indigo-100/80 p-3 shadow-xs">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span><strong>With CallPilot:</strong> AI calls back & completes booking</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-2">
                <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <Bot className="h-4 w-4 text-indigo-600" />
                  <span>1. Natural Voice AI</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Speaks warmly in English, Hindi, or Hinglish. Understands what the customer wants naturally without rigid robotic IVR menus.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-2">
                <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <CalendarCheck className="h-4 w-4 text-emerald-600" />
                  <span>2. Google Calendar Tool</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Checks your real schedule and books appointments autonomously with Google Calendar API v3 without double booking.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-2">
                <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-amber-600" />
                  <span>3. Smart Urgency Engine</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Automatically flags high-urgency orders (e.g. within 24 hours) and creates customer CRM records on your dashboard.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: 5-STEP WORKFLOW */}
        {activeTab === "steps" && (
          <div className="space-y-4 animate-in fade-in">
            <p className="text-xs text-slate-600">
              Here is the exact step-by-step lifecycle of how CallPilot AI processes every customer interaction:
            </p>

            <div className="space-y-3">
              {[
                {
                  step: "Step 1",
                  title: "Trigger: Customer Call Missed",
                  desc: "A customer calls your business number. Because lines are busy, the phone disconnects and automatically triggers CallPilot AI.",
                  badge: "Automatic Trigger",
                  badgeColor: "default",
                },
                {
                  step: "Step 2",
                  title: "AI Voice Conversation (English / Hindi / Hinglish)",
                  desc: "CallPilot initiates the voice assistant. The AI asks natural questions (e.g. 'Hello! How can I help you today?') based on your active business workflow.",
                  badge: "Multilingual Voice AI",
                  badgeColor: "purple",
                },
                {
                  step: "Step 3",
                  title: "Dynamic Entity Extraction",
                  desc: "While the customer speaks casually, AI extracts structured data in real-time (Customer name, cake flavor, appointment time, tracking number, budget).",
                  badge: "Zero Form Filling",
                  badgeColor: "blue",
                },
                {
                  step: "Step 4",
                  title: "Autonomous Tool Calling (Google Calendar v3)",
                  desc: "If the caller wants an appointment, the AI checks calendar availability in real-time, finds open slots, and creates the Google Calendar event instantly.",
                  badge: "GCal Tool Agent",
                  badgeColor: "success",
                },
                {
                  step: "Step 5",
                  title: "Conditional Rules, CRM Lead & Owner Alert",
                  desc: "The system checks rules (e.g. IF delivery <= 24h THEN mark HIGH URGENCY), updates the CRM customer record, and alerts the business owner on the dashboard.",
                  badge: "Action Executed",
                  badgeColor: "warning",
                },
              ].map((item, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{item.step}</span>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">{item.title}</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed pl-1">{item.desc}</p>
                  </div>
                  <Badge variant={item.badgeColor as any} className="self-start sm:self-center shrink-0">
                    {item.badge}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: BUSINESS EXAMPLES */}
        {activeTab === "examples" && (
          <div className="space-y-4 animate-in fade-in">
            <p className="text-xs text-slate-600">
              Select any prebuilt business preset to see how CallPilot AI adapts dynamically:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                <div className="text-2xl">🎂</div>
                <h4 className="text-sm font-bold text-slate-900">Cake Shop / Bakery</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Asks for cake type, flavor, weight, and delivery date. If date is tomorrow (&le; 24h), it flags <strong>HIGH Urgency</strong> for the baker.
                </p>
                <Link href="/simulator?industry=cake_shop" onClick={onClose}>
                  <Button size="sm" variant="subtle" className="w-full text-xs">
                    Try Cake Shop &rarr;
                  </Button>
                </Link>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                <div className="text-2xl">🏥</div>
                <h4 className="text-sm font-bold text-slate-900">Healthcare Clinic</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Asks for patient symptoms and consultation slot. Uses <strong>Google Calendar Tool</strong> to check doctor availability and book the slot.
                </p>
                <Link href="/simulator?industry=clinic" onClick={onClose}>
                  <Button size="sm" variant="subtle" className="w-full text-xs">
                    Try Clinic Booking &rarr;
                  </Button>
                </Link>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                <div className="text-2xl">🚚</div>
                <h4 className="text-sm font-bold text-slate-900">Delivery & Logistics</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Asks for package tracking ID (e.g. <code>DEL-9821</code>) and uses Logistics Tool to report real-time dispatch status.
                </p>
                <Link href="/simulator?industry=delivery" onClick={onClose}>
                  <Button size="sm" variant="subtle" className="w-full text-xs">
                    Try Tracking Flow &rarr;
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: MANUAL SETUP GUIDE */}
        {activeTab === "manual" && (
          <div className="space-y-4 animate-in fade-in text-xs text-slate-700">
            <div className="rounded-xl bg-amber-50 border border-amber-200/80 p-4">
              <h4 className="font-bold text-amber-900 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-600" />
                <span>Zero-Config Demo Mode (Runs Immediately!)</span>
              </h4>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                You do <strong>not</strong> need to add any external API keys to test CallPilot AI. The app has a high-fidelity local reasoning engine, simulated voice waveform, and sandbox Google Calendar tool ready to use right now!
              </p>
            </div>

            <h4 className="font-bold text-slate-900 text-sm">Optional Manual Configuration (In <code>.env.local</code>):</h4>

            <div className="space-y-2.5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <strong className="text-indigo-700">1. Google Calendar Real Live API:</strong>
                <p className="text-slate-600 mt-0.5">
                  Set <code>GOOGLE_CALENDAR_CLIENT_ID</code>, <code>GOOGLE_CALENDAR_CLIENT_SECRET</code>, and <code>GOOGLE_CALENDAR_REFRESH_TOKEN</code> in <code>.env.local</code> to synchronize with your actual personal/work Google Calendar account.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <strong className="text-indigo-700">2. OpenAI GPT-4o-mini (Live Conversational AI):</strong>
                <p className="text-slate-600 mt-0.5">
                  Set <code>OPENAI_API_KEY=sk-...</code> in <code>.env.local</code> to use live GPT-4o-mini for natural language parsing and voice reasoning.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <strong className="text-indigo-700">3. Supabase Cloud Database:</strong>
                <p className="text-slate-600 mt-0.5">
                  Create a Supabase PostgreSQL project and apply <code>supabase/migrations/001_initial_schema.sql</code>, then set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code>.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <strong className="text-indigo-700">4. Multilingual Indian Voice (Sarvam AI / ElevenLabs):</strong>
                <p className="text-slate-600 mt-0.5">
                  Set <code>SARVAM_API_KEY</code> or <code>ELEVENLABS_API_KEY</code> to enable real-time speech generation for English & Hindi.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <Link href="/simulator" onClick={onClose}>
            <Button size="sm" variant="glow" leftIcon={<Play className="h-3.5 w-3.5" />}>
              Open AI Simulator & Try Live
            </Button>
          </Link>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close Guide
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
