"use client";

import React from "react";
import Link from "next/link";
import { PhoneCall, Heart, Sparkles, ShieldCheck, CheckCircle2 } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-12 text-slate-600">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Col 1: Brand & Tagline */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 shadow-sm shadow-indigo-600/30">
                <PhoneCall className="h-4 w-4 text-white" />
              </div>
              <span className="text-base font-bold text-slate-900">
                CallPilot <span className="text-indigo-600">AI</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your AI assistant for every missed call. Autonomous customer intake, Google Calendar scheduling, and CRM workflows.
            </p>
          </div>

          {/* Col 2: Navigation */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Product</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/dashboard" className="hover:text-indigo-600 transition-colors">Dashboard</Link></li>
              <li><Link href="/simulator" className="hover:text-indigo-600 transition-colors">AI Simulator</Link></li>
              <li><Link href="/workflows" className="hover:text-indigo-600 transition-colors">Workflows</Link></li>
              <li><Link href="/calendar" className="hover:text-indigo-600 transition-colors">Google Calendar</Link></li>
            </ul>
          </div>

          {/* Col 3: Integrations */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Integrations</h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Google Calendar API v3</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> OpenAI GPT-4o-mini</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Multilingual Hindi / English</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Supabase PostgreSQL</li>
            </ul>
          </div>

          {/* Col 4: Preset Templates */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Templates</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/simulator?industry=cake_shop" className="hover:text-indigo-600 transition-colors">🎂 Cake Shop & Bakery</Link></li>
              <li><Link href="/simulator?industry=clinic" className="hover:text-indigo-600 transition-colors">🏥 Healthcare Clinic</Link></li>
              <li><Link href="/simulator?industry=delivery" className="hover:text-indigo-600 transition-colors">🚚 Delivery & Logistics</Link></li>
              <li><Link href="/onboarding" className="hover:text-indigo-600 transition-colors">+ Custom Business Flow</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} CallPilot AI. Production-grade Missed-Call Voice Assistant.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-indigo-600" /> Free Tier First Architecture
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
