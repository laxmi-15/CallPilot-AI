"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import confetti from "canvas-confetti";
import {
  Building2,
  Phone,
  Bot,
  CalendarCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Globe2,
  Check,
} from "lucide-react";
import { storageRepo } from "@/lib/store/storage";
import { PREBUILT_TEMPLATES } from "@/lib/workflow/templates";
import { BusinessType, LanguageCode } from "@/types";
import { Button, Card, Input, Textarea, Badge } from "@/components/ui";

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType>("cake_shop");
  const [businessPhone, setBusinessPhone] = useState("+1 (555) 890-1234");
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>("cake_shop");
  const [greetingMessage, setGreetingMessage] = useState(
    "Hello! Thanks for calling our store. I am your AI assistant. How can I help you today?"
  );
  const [personality, setPersonality] = useState<"warm_friendly" | "professional" | "concise">("warm_friendly");
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [gcalConnected, setGcalConnected] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalSteps = 7;

  const handleNext = () => {
    if (currentStep === 2) {
      // Auto adjust template and greeting based on selected business type
      if (businessType === "clinic") {
        setSelectedTemplateKey("clinic");
        setGreetingMessage(PREBUILT_TEMPLATES.clinic.greeting);
        setPersonality("professional");
      } else if (businessType === "delivery") {
        setSelectedTemplateKey("delivery");
        setGreetingMessage(PREBUILT_TEMPLATES.delivery.greeting);
        setPersonality("concise");
      } else {
        setSelectedTemplateKey("cake_shop");
        setGreetingMessage(PREBUILT_TEMPLATES.cake_shop.greeting);
        setPersonality("warm_friendly");
      }
    }

    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleFinish = () => {
    setIsSubmitting(true);

    // Trigger celebratory confetti
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
    });

    // Save business profile
    const newBiz = storageRepo.createBusiness({
      name: businessName || "My New AI Business",
      type: businessType,
      phone: businessPhone,
      language,
      timezone: "UTC",
    });

    // Create workflow
    const template = PREBUILT_TEMPLATES[selectedTemplateKey] || PREBUILT_TEMPLATES.cake_shop;
    storageRepo.createWorkflow({
      ...template,
      businessId: newBiz.id,
      name: `${newBiz.name} Missed Call Intake`,
      greeting: greetingMessage,
      personality,
      language,
    });

    setTimeout(() => {
      router.push("/simulator");
    }, 1500);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
      {/* Step Progress Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
          <span>Step {currentStep} of {totalSteps}</span>
          <span className="text-indigo-600 font-bold">{Math.round((currentStep / totalSteps) * 100)}% Completed</span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-300 rounded-full"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <Card className="p-6 sm:p-8 border-slate-200 bg-white shadow-sm">
        {/* STEP 1: Business Name */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <Badge variant="purple">Step 1: Business Setup</Badge>
              <h2 className="text-2xl font-bold text-slate-900 mt-2">What is your business name?</h2>
              <p className="text-xs text-slate-500 mt-1">This will be introduced by your AI assistant when answering missed calls.</p>
            </div>
            <div className="space-y-4">
              <Input
                label="Business Name"
                placeholder="e.g. Sweet Delights Bakery, Metro Clinic..."
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                autoFocus
              />
            </div>
          </div>
        )}

        {/* STEP 2: Business Type */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <Badge variant="purple">Step 2: Industry Model</Badge>
              <h2 className="text-2xl font-bold text-slate-900 mt-2">Select your business type</h2>
              <p className="text-xs text-slate-500 mt-1">We will pre-load customized workflow logic and agent tools for your industry.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: "cake_shop", label: "🎂 Cake Shop / Bakery", desc: "Flavor intake, custom cake messages, 24-hr urgency check" },
                { id: "clinic", label: "🏥 Clinic / Healthcare", desc: "Doctor appointments, GCal sync, strict medical disclaimer" },
                { id: "delivery", label: "🚚 Delivery / Logistics", desc: "Shipment tracking, package ETA lookups, dispatch callback" },
                { id: "real_estate", label: "🏡 Real Estate", desc: "Property visits, buyer qualification, agent callback booking" },
                { id: "repair_service", label: "🔧 Repair & Home Services", desc: "Emergency repair requests, technician scheduling" },
                { id: "custom", label: "⚡ Custom Business", desc: "Fully customizable fields, questions, and conditional logic" },
              ].map((item) => (
                <div
                  key={item.id}
                  onClick={() => setBusinessType(item.id as BusinessType)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    businessType === item.id
                      ? "border-indigo-600 bg-indigo-50/70 shadow-xs"
                      : "border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="font-bold text-sm text-slate-900 flex items-center justify-between">
                    <span>{item.label}</span>
                    {businessType === item.id && <CheckCircle2 className="h-4 w-4 text-indigo-600" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: Business Phone Number */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <Badge variant="purple">Step 3: Line Configuration</Badge>
              <h2 className="text-2xl font-bold text-slate-900 mt-2">Enter your business phone number</h2>
              <p className="text-xs text-slate-500 mt-1">The primary line where missed calls will be forwarded to your AI assistant.</p>
            </div>
            <div className="space-y-4">
              <Input
                label="Primary Business Phone Number"
                placeholder="+1 (555) 000-0000 or +91 98765 00000"
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
              />
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="font-bold text-slate-900">How call forwarding works:</div>
                <p>You can enable &ldquo;Forward on No Answer (*61)&rdquo; on your carrier to route callers to CallPilot seamlessly.</p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Select Workflow Template */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <Badge variant="purple">Step 4: Workflow Template</Badge>
              <h2 className="text-2xl font-bold text-slate-900 mt-2">Choose your missed-call workflow</h2>
              <p className="text-xs text-slate-500 mt-1">Pre-configured with structured questions, validation rules, and follow-ups.</p>
            </div>
            <div className="space-y-3">
              {[
                {
                  id: "cake_shop",
                  title: "Cake Order & Custom Baking Intake",
                  fields: "9 Fields (Flavor, Weight, Pickup/Delivery, Custom Message, Date)",
                  badge: "Urgency Rules Included",
                },
                {
                  id: "clinic",
                  title: "Doctor Booking with Google Calendar",
                  fields: "6 Fields (Patient Name, Doctor, Date, Time Slot, SMS Number)",
                  badge: "Google Calendar Tool Agent",
                },
                {
                  id: "delivery",
                  title: "Shipment Tracking & Pickup Dispatch",
                  fields: "8 Fields (Tracking Number, Pickup Location, Package Type)",
                  badge: "Live Tracking API Tool",
                },
              ].map((tpl) => (
                <div
                  key={tpl.id}
                  onClick={() => setSelectedTemplateKey(tpl.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedTemplateKey === tpl.id
                      ? "border-indigo-600 bg-indigo-50/70 shadow-xs"
                      : "border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">{tpl.title}</span>
                    <Badge variant="default">{tpl.badge}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{tpl.fields}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 5: Configure AI Assistant */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <Badge variant="purple">Step 5: AI Persona & Tone</Badge>
              <h2 className="text-2xl font-bold text-slate-900 mt-2">Customize your AI assistant persona</h2>
              <p className="text-xs text-slate-500 mt-1">Set the initial greeting, tone, and language mode.</p>
            </div>
            <div className="space-y-4">
              <Textarea
                label="Greeting Message (Spoken to caller on missed-call answer)"
                rows={3}
                value={greetingMessage}
                onChange={(e) => setGreetingMessage(e.target.value)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">Personality & Tone</label>
                  <select
                    value={personality}
                    onChange={(e) => setPersonality(e.target.value as any)}
                    className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="warm_friendly">Warm & Friendly</option>
                    <option value="professional">Professional & Direct</option>
                    <option value="concise">Concise & Fast</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">Default Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="en">English (Global)</option>
                    <option value="hi">Hindi (हिंदी & Hinglish Auto-Detect)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: Connect Google Calendar */}
        {currentStep === 6 && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <Badge variant="success">Step 6: Google Calendar Tool</Badge>
              <h2 className="text-2xl font-bold text-slate-900 mt-2">Connect Google Calendar</h2>
              <p className="text-xs text-slate-500 mt-1">Allows the AI agent to check doctor/staff availability and book verified appointments.</p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                    <CalendarCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-emerald-900">Google Calendar API v3</div>
                    <div className="text-xs text-emerald-700">Ready & Enabled for AI Tool Calling</div>
                  </div>
                </div>
                <Badge variant="success" dot>Connected</Badge>
              </div>

              <div className="text-xs text-slate-700 space-y-1.5 border-t border-slate-200 pt-3 font-medium">
                <p>✓ <code className="text-emerald-700 font-mono text-[11px]">calendar.checkAvailability</code> enabled</p>
                <p>✓ <code className="text-emerald-700 font-mono text-[11px]">calendar.createEvent</code> enabled</p>
                <p>✓ Real-time event notifications enabled</p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 7: Finish & Launch */}
        {currentStep === 7 && (
          <div className="space-y-6 text-center py-4 animate-in fade-in">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-500/25">
              <Sparkles className="h-8 w-8" />
            </div>

            <div>
              <h2 className="text-3xl font-extrabold text-slate-900">Your AI Assistant is Ready!</h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto mt-2">
                <strong>{businessName || "Your Business"}</strong> is configured with full missed-call handling, Google Calendar tools, and multi-language reasoning.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 max-w-md mx-auto text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Business:</span>
                <span className="text-slate-900 font-bold">{businessName || "Sweet Delights Bakery"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Industry:</span>
                <span className="capitalize text-indigo-700 font-bold">{businessType.replace("_", " ")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Calendar Agent:</span>
                <span className="text-emerald-700 font-bold">Google Calendar Connected</span>
              </div>
            </div>

            <Button
              size="lg"
              variant="glow"
              onClick={handleFinish}
              isLoading={isSubmitting}
              className="w-full max-w-md mx-auto text-base"
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Launch Simulator &amp; Dashboard
            </Button>
          </div>
        )}

        {/* Navigation Buttons (for steps 1-6) */}
        {currentStep < 7 && (
          <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={currentStep === 1}
              leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
            >
              Back
            </Button>

            <Button
              variant="glow"
              size="sm"
              onClick={handleNext}
              rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
            >
              Continue
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
