"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  PhoneCall,
  Bot,
  CalendarCheck,
  Zap,
  ArrowRight,
  ShieldCheck,
  Globe2,
  Sparkles,
  CheckCircle2,
  Clock,
  Layers,
  ChevronRight,
  PhoneMissed,
  Activity,
  HeartHandshake,
  TrendingUp,
  BookOpen,
  Play,
} from "lucide-react";
import { Button, Badge, Card, CardContent } from "@/components/ui";
import { WorkflowGuideModal } from "@/components/layout/WorkflowGuideModal";

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<"cake_shop" | "clinic" | "delivery">("cake_shop");
  const [showWorkflowGuide, setShowWorkflowGuide] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. HERO SECTION */}
      <section className="relative pt-16 pb-24 md:pt-24 md:pb-32 overflow-hidden bg-gradient-to-b from-indigo-50/60 via-white to-slate-50">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-indigo-400/15 via-purple-300/15 to-pink-300/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-200/80 px-4 py-1.5 text-xs font-bold text-indigo-700 mb-6 shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            <span>Autonomous Missed-Call Voice AI & Google Calendar Agent</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 max-w-4xl mx-auto leading-[1.15] mb-6">
            Never lose a customer to a <span className="gradient-text-vibrant">missed call.</span>
          </h1>

          <p className="text-base sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            CallPilot AI immediately engages missed callers in natural English or Hindi, extracts required order details, checks real-time availability, and books appointments autonomously on Google Calendar.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto">
            <Link href="/simulator" className="w-full sm:w-auto">
              <Button size="lg" variant="glow" className="w-full text-base font-bold shadow-md" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Try Live Simulator
              </Button>
            </Link>
            <button
              onClick={() => setShowWorkflowGuide(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center font-bold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 select-none cursor-pointer bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/90 shadow-sm text-base px-6 py-3.5 gap-2.5"
            >
              <BookOpen className="h-4 w-4 text-indigo-600" />
              <span>How It Works Guide</span>
            </button>
          </div>

          {/* Social Proof Badges */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-semibold text-slate-600">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Google Calendar API v3 Tool Calling</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>English, Hindi & Hinglish Voice</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Zero-Config Instant Sandbox</span>
            </div>
          </div>

          {/* Animated Product Cockpit Preview */}
          <div className="mt-14 relative mx-auto max-w-5xl rounded-3xl border border-slate-200/90 bg-white p-3 shadow-xl backdrop-blur-xl">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 sm:p-6 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-amber-400" />
                  <div className="h-3 w-3 rounded-full bg-emerald-400" />
                  <span className="ml-2 text-xs font-bold text-slate-600">CallPilot AI Simulator • Active Missed-Call Session</span>
                </div>
                <Badge variant="success" dot>Live AI Reasoning</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                {/* Left Mini Column */}
                <div className="rounded-xl bg-white p-4 border border-slate-200 shadow-2xs space-y-3">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Workflow Trigger</div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <PhoneMissed className="h-4 w-4 text-red-500" />
                    <span>Missed Call Triggered</span>
                  </div>
                  <div className="text-[11px] text-slate-600 border-t border-slate-100 pt-2 space-y-1">
                    <div>Business: <strong className="text-slate-800">Sweet Delights Bakery</strong></div>
                    <div>Urgency Rule: <strong className="text-amber-700">&lt; 24 hrs → HIGH</strong></div>
                  </div>
                </div>

                {/* Center Mini Chat */}
                <div className="rounded-xl bg-white p-4 border border-slate-200 shadow-2xs space-y-2.5">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Conversation</div>
                  <div className="rounded-lg bg-slate-100 p-2 text-xs text-slate-800">
                    <span className="text-indigo-600 font-bold">Caller: </span>
                    &ldquo;Hi, I need a 2kg chocolate cake for tomorrow pickup.&rdquo;
                  </div>
                  <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-2 text-xs text-indigo-900">
                    <span className="text-purple-700 font-bold">CallPilot AI: </span>
                    &ldquo;Understood! Flagged as urgent for tomorrow. What message would you like written on top?&rdquo;
                  </div>
                </div>

                {/* Right Mini Structured Data */}
                <div className="rounded-xl bg-white p-4 border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Live Extracted Data</span>
                    <Badge variant="danger" dot>HIGH URGENCY</Badge>
                  </div>
                  <div className="text-xs space-y-1 text-slate-700 font-mono text-[11px]">
                    <div>• cake_type: <span className="text-indigo-600 font-semibold">&ldquo;Birthday Cake&rdquo;</span></div>
                    <div>• flavor: <span className="text-indigo-600 font-semibold">&ldquo;Chocolate&rdquo;</span></div>
                    <div>• weight: <span className="text-indigo-600 font-semibold">&ldquo;2 kg&rdquo;</span></div>
                    <div>• required_date: <span className="text-amber-600 font-semibold">&ldquo;Tomorrow&rdquo;</span></div>
                  </div>
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-[10px] text-emerald-800 font-medium flex items-center gap-1.5">
                    <CalendarCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Action: Urgent Order Created</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. HOW IT WORKS SECTION */}
      <section className="py-20 border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-2">Automated Lifecycle</h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900">How CallPilot AI Handles Missed Calls</h3>
            <p className="text-sm sm:text-base text-slate-500 mt-3">From unanswered phone ring to synchronized Google Calendar booking in seconds.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                icon: PhoneMissed,
                title: "Call Missed",
                description: "When a customer calls and nobody answers, CallPilot instantly triggers your custom voice workflow.",
              },
              {
                step: "02",
                icon: Bot,
                title: "AI Natural Intake",
                description: "AI engages the caller warmly in English or Hindi, collecting required fields without sounding like a robotic form.",
              },
              {
                step: "03",
                icon: CalendarCheck,
                title: "Agent Tool Calling",
                description: "AI inspects Google Calendar availability, checks package tracking, and reserves real-time slots.",
              },
              {
                step: "04",
                icon: Zap,
                title: "Action & Follow-up",
                description: "Evaluates conditional rules (e.g. 24-hr turnaround), updates CRM, and notifies the business owner.",
              },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="relative rounded-2xl bg-white border border-slate-200 p-6 glass-card-hover shadow-xs">
                  <div className="text-2xl font-black text-indigo-600/30 mb-4">{item.step}</div>
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 mb-4">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 mb-2">{item.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. MULTI-INDUSTRY USE CASES WITH INTERACTIVE TABS */}
      <section className="py-24 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-2">Prebuilt Templates</h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Configured for Real Small Businesses</h3>
            <p className="text-sm sm:text-base text-slate-500 mt-3">Generic, data-driven architecture that adapts to any industry without hardcoding.</p>
          </div>

          {/* Industry Switcher Buttons */}
          <div className="flex justify-center gap-2 mb-10 overflow-x-auto pb-2">
            {[
              { id: "cake_shop", label: "🎂 Cake Shops & Bakeries" },
              { id: "clinic", label: "🏥 Clinics & Healthcare" },
              { id: "delivery", label: "🚚 Delivery & Logistics" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                    : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Industry Preview Card */}
          <Card className="max-w-4xl mx-auto border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            {activeTab === "cake_shop" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <Badge variant="purple">Cake Shop Template</Badge>
                  <h4 className="text-2xl font-bold text-slate-900">Cake Order & Custom Baking Intake</h4>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Collects cake occasion, custom flavors (Chocolate Truffle, Red Velvet), weight, inscription messages, and delivery preferences.
                  </p>
                  <div className="space-y-2 text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                      <span><strong>Conditional Rule:</strong> Date &le; 24h &rarr; Flags HIGH Urgency for baker.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                      <span><strong>Follow-up Action:</strong> Creates Bakery Quote task + Alerts head chef.</span>
                    </div>
                  </div>
                  <Link href="/simulator?industry=cake_shop">
                    <Button size="sm" variant="glow" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                      Simulate Cake Shop Flow
                    </Button>
                  </Link>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 space-y-3">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Example Caller Prompt</div>
                  <div className="rounded-xl bg-white border border-slate-200 p-3 text-xs text-slate-800 shadow-2xs">
                    &ldquo;Hi, I need a 2kg chocolate cake for my son&apos;s birthday tomorrow at 5 PM.&rdquo;
                  </div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider pt-2">AI Extraction Result</div>
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900 space-y-1 font-mono text-[11px]">
                    <div>• occasion: &ldquo;Birthday&rdquo;</div>
                    <div>• flavor: &ldquo;Chocolate&rdquo;</div>
                    <div>• weight: &ldquo;2 kg&rdquo;</div>
                    <div>• urgency: <strong className="text-red-700">HIGH (24h turnaround)</strong></div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "clinic" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <Badge variant="success">Clinic Template</Badge>
                  <h4 className="text-2xl font-bold text-slate-900">Doctor Consultation & Calendar Booking</h4>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Collects patient symptoms, consultation type, and preferred time slot. Seamlessly checks and schedules appointments via Google Calendar API v3.
                  </p>
                  <div className="space-y-2 text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                      <span><strong>Tool Calling:</strong> Executes <code>calendar.checkAvailability</code> & <code>calendar.createEvent</code>.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                      <span><strong>Guardrail:</strong> Strict safety filter prohibiting medical diagnosis.</span>
                    </div>
                  </div>
                  <Link href="/simulator?industry=clinic">
                    <Button size="sm" variant="glow" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                      Simulate Clinic Booking
                    </Button>
                  </Link>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 space-y-3">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Example Caller Prompt</div>
                  <div className="rounded-xl bg-white border border-slate-200 p-3 text-xs text-slate-800 shadow-2xs">
                    &ldquo;I have a severe toothache and want to book an appointment with Dr. Sharma for tomorrow afternoon.&rdquo;
                  </div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider pt-2">Tool Execution Result</div>
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900 space-y-1 font-mono text-[11px]">
                    <div>• tool: <strong className="text-indigo-700">calendar.createEvent</strong></div>
                    <div>• summary: &ldquo;Dental Checkup - Dr. Sharma&rdquo;</div>
                    <div>• status: <strong className="text-emerald-700">Confirmed (GCal invite created)</strong></div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "delivery" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <Badge variant="warning">Logistics Template</Badge>
                  <h4 className="text-2xl font-bold text-slate-900">Shipment Pickup & Parcel Tracking</h4>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Understands parcel tracking inquiries and schedule pickup requests. Executes real-time logistics tracking lookup.
                  </p>
                  <div className="space-y-2 text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                      <span><strong>Tool Calling:</strong> Executes <code>delivery.trackPackage</code> for instant status.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                      <span><strong>Urgency Rule:</strong> Fragile or delayed parcels flagged for immediate manager review.</span>
                    </div>
                  </div>
                  <Link href="/simulator?industry=delivery">
                    <Button size="sm" variant="glow" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                      Simulate Delivery Tracking
                    </Button>
                  </Link>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 space-y-3">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Example Caller Prompt</div>
                  <div className="rounded-xl bg-white border border-slate-200 p-3 text-xs text-slate-800 shadow-2xs">
                    &ldquo;Where is my package DEL-9821? I was expecting it this morning.&rdquo;
                  </div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider pt-2">Tool Execution Result</div>
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 space-y-1 font-mono text-[11px]">
                    <div>• tool: <strong className="text-indigo-700">delivery.trackPackage</strong></div>
                    <div>• tracking_id: &ldquo;DEL-9821&rdquo;</div>
                    <div>• status: &ldquo;Out for delivery (ETA: 2:30 PM)&rdquo;</div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </section>

      {/* 4. CTA BANNER */}
      <section className="py-20 bg-gradient-to-tr from-indigo-900 via-indigo-800 to-purple-900 text-white relative overflow-hidden">
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <Badge variant="purple" className="bg-white/10 text-white border-white/20">
            Get Started in 60 Seconds
          </Badge>
          <h3 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Stop losing leads to unanswered phone calls.
          </h3>
          <p className="text-indigo-100 text-sm sm:text-base max-w-xl mx-auto">
            Experience CallPilot AI in the interactive simulator or configure a customized workflow for your business.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link href="/simulator">
              <Button size="lg" variant="secondary" className="font-bold text-indigo-900" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Open AI Simulator Now
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline" className="text-white border-white/30 hover:bg-white/10">
                View Business Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Workflow Guide Modal */}
      <WorkflowGuideModal
        isOpen={showWorkflowGuide}
        onClose={() => setShowWorkflowGuide(false)}
      />
    </div>
  );
}
