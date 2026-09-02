"use client";

import React, { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  Building2,
  CalendarCheck,
  Cpu,
  Volume2,
  RotateCcw,
  Save,
  Shield,
  Languages,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { storageRepo, AppState } from "@/lib/store/storage";
import { Button, Badge, Card, Input, Textarea } from "@/components/ui";

export default function SettingsPage() {
  const [appState, setAppState] = useState<AppState>(storageRepo.getState());
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<{ configured: boolean; provider: string } | null>(null);

  // Form State
  const activeBiz = storageRepo.getActiveBusiness();
  const [bizName, setBizName] = useState(activeBiz.name);
  const [bizPhone, setBizPhone] = useState(activeBiz.phone);
  const [bizEmail, setBizEmail] = useState(activeBiz.email || "");
  const [bizAddress, setBizAddress] = useState(activeBiz.address || "");
  const [emailNotif, setEmailNotif] = useState(appState.customSettings?.emailNotificationEnabled ?? true);

  useEffect(() => {
    const unsub = storageRepo.subscribe((s) => setAppState({ ...s }));
    fetch("/api/voice/status")
      .then((res) => res.json())
      .then((data) => setVoiceStatus(data))
      .catch((e) => console.warn(e));
    return () => unsub();
  }, []);

  const handleSaveSettings = () => {
    storageRepo.updateBusiness(activeBiz.id, {
      name: bizName,
      phone: bizPhone,
      email: bizEmail,
      address: bizAddress,
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetDemo = () => {
    if (confirm("Reset all businesses, workflows, and conversations to factory demo state?")) {
      storageRepo.resetToFactoryDemo();
      window.location.reload();
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <SettingsIcon className="h-7 w-7 text-indigo-600" />
            <span>Settings & Integrations</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure business profile, Google Calendar tools, Gemini AI reasoning, and Sarvam AI multilingual voice engine.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button size="md" variant="outline" onClick={handleResetDemo} leftIcon={<RotateCcw className="h-4 w-4" />}>
            Reset Demo Data
          </Button>
          <Button size="md" variant="glow" onClick={handleSaveSettings} leftIcon={<Save className="h-4 w-4" />}>
            {savedSuccess ? "✓ Saved!" : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 1. Business Profile */}
        <Card className="p-6 border-slate-200 bg-white shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-indigo-700">
            <Building2 className="h-4 w-4" />
            <span>Business Profile</span>
          </div>

          <div className="space-y-3 text-xs">
            <Input
              label="Business Name"
              value={bizName}
              onChange={(e) => setBizName(e.target.value)}
            />
            <Input
              label="Forwarding Phone Number"
              value={bizPhone}
              onChange={(e) => setBizPhone(e.target.value)}
            />
            <Input
              label="Support / Owner Email"
              type="email"
              value={bizEmail}
              onChange={(e) => setBizEmail(e.target.value)}
              placeholder="owner@mybusiness.com"
            />
            <Textarea
              label="Physical Address / Store Location"
              value={bizAddress}
              onChange={(e) => setBizAddress(e.target.value)}
              placeholder="e.g. 104 Baker Street, Suite B"
            />
          </div>
        </Card>

        {/* 2. Google Calendar Tool Integration */}
        <Card className="p-6 border-slate-200 bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-emerald-700">
              <CalendarCheck className="h-4 w-4" />
              <span>Google Calendar API v3</span>
            </div>
            <Badge variant="neon-emerald" dot>Real Overlap Engine Active</Badge>
          </div>

          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-900 space-y-1">
            <p className="font-bold">✓ Interval Overlap & Availability Gate Enabled</p>
            <p className="text-[11px] text-emerald-700">
              The AI verifies slots with <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono text-[10px]">calendar.checkAvailability</code> in <strong>Asia/Kolkata</strong> and blocks <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono text-[10px]">calendar.createEvent</code> on occupied times.
            </p>
          </div>

          <div className="space-y-3 text-xs text-slate-700">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-600 font-semibold">Timezone:</span>
              <span className="font-bold font-mono text-slate-900">Asia/Kolkata (+05:30)</span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Shield className="h-4 w-4 text-slate-400" />
              <span className="text-[11px] text-slate-500">
                Live OAuth credentials read securely from server-side <code>.env.local</code>.
              </span>
            </div>
          </div>
        </Card>

        {/* 3. AI Reasoning & Gemini Engine */}
        <Card className="p-6 border-slate-200 bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-indigo-700">
              <Cpu className="h-4 w-4" />
              <span>AI Reasoning Engine</span>
            </div>
            <Badge variant="purple" dot>Gemini 1.5 Flash</Badge>
          </div>

          <div className="space-y-3 text-xs text-slate-700">
            <div className="p-3.5 rounded-xl bg-indigo-50/80 border border-indigo-200 text-indigo-950 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                <span>Multilingual Entity Extraction & Reasoning</span>
              </div>
              <p className="text-[11px] text-indigo-700">
                Processes English, Hindi, and Kannada natural speech, extracts structured fields, and triggers automated workflows.
              </p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-600 font-semibold">Model Provider:</span>
              <span className="font-bold font-mono text-slate-900">Google Gemini API</span>
            </div>
          </div>
        </Card>

        {/* 4. Voice Engine (Sarvam Saaras v3 + Bulbul v3) */}
        <Card className="p-6 border-slate-200 bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-emerald-700">
              <Volume2 className="h-4 w-4" />
              <span>Multilingual Voice AI</span>
            </div>
            <Badge variant={voiceStatus?.configured ? "neon-emerald" : "neon-amber"} dot>
              {voiceStatus?.configured ? "Sarvam Active" : "Configured via .env"}
            </Badge>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-slate-700">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-600">Speech-to-Text (STT):</span>
                <span className="font-mono font-bold text-slate-900">Sarvam Saaras v3 (saaras:v3)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-600">Text-to-Speech (TTS):</span>
                <span className="font-mono font-bold text-slate-900">Sarvam Bulbul v3 (bulbul:v3)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-600">Supported Languages:</span>
                <span className="font-bold text-indigo-700">🇬🇧 English • 🇮🇳 Hindi • 🇮🇳 Kannada</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-[11px] space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>₹0 Safety Guard Active</span>
              </div>
              <p className="text-amber-700">
                Uses limited free signup credits. If credits exhaust (HTTP 402), the system halts voice calls automatically without billing and falls back seamlessly to text mode.
              </p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="space-y-0.5">
                <div className="font-semibold text-slate-800">Email Alerts for Urgent Leads</div>
                <div className="text-[11px] text-slate-500">Send alert when &lt; 24h lead is captured</div>
              </div>
              <input
                type="checkbox"
                checked={emailNotif}
                onChange={(e) => setEmailNotif(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
