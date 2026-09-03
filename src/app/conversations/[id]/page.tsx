"use client";

import React, { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  CalendarCheck,
  CheckCircle2,
  Clock,
  PhoneCall,
  UserCheck,
  AlertTriangle,
  Code2,
  Calendar,
  Sparkles,
  Check,
  Layers,
  FileText,
  Volume2,
  Square,
  Play,
} from "lucide-react";
import { storageRepo, AppState } from "@/lib/store/storage";
import { Conversation, ConversationStatus, UrgencyLevel, Message } from "@/types";
import { Button, Badge, Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import {
  formatDateTime,
  formatTime,
  getUrgencyBadgeClasses,
  getStatusBadgeClasses,
  formatPhone,
} from "@/lib/utils";
import { voiceEngine, VoiceLanguage } from "@/lib/voice/voiceEngine";

export default function ConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [appState, setAppState] = useState<AppState>(storageRepo.getState());
  const [taskCreated, setTaskCreated] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = storageRepo.subscribe((s) => setAppState({ ...s }));
    return () => {
      unsub();
      voiceEngine.stopSpeaking();
    };
  }, []);

  const conversation = storageRepo.getConversation(resolvedParams.id);

  if (!conversation) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Conversation Not Found</h2>
        <p className="text-xs text-slate-500">This conversation record does not exist or has been deleted.</p>
        <Link href="/conversations">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back to Conversations
          </Button>
        </Link>
      </div>
    );
  }

  const urgencyCls = getUrgencyBadgeClasses(conversation.urgency);
  const statusCls = getStatusBadgeClasses(conversation.status);
  const callerName = conversation.callerName || "Caller";

  const handleUpdateStatus = (newStatus: ConversationStatus) => {
    storageRepo.updateConversationStatus(conversation.id, newStatus);
  };

  const handleCreateTask = () => {
    storageRepo.createTask({
      businessId: conversation.businessId,
      conversationId: conversation.id,
      title: `Follow up with ${callerName} (${conversation.intent})`,
      description: conversation.summary || "Follow up on customer missed call inquiry.",
      priority: conversation.urgency,
      completed: false,
    });
    setTaskCreated(true);
    setTimeout(() => setTaskCreated(false), 3000);
  };

  const handlePlayMessageAudio = async (msg: Message) => {
    if (playingMessageId === msg.id) {
      voiceEngine.stopSpeaking();
      setPlayingMessageId(null);
      return;
    }

    setPlayingMessageId(msg.id);
    await voiceEngine.speak({
      text: msg.content,
      language: (conversation.language || "en") as VoiceLanguage,
      speaker: "shubh",
      onStart: () => setPlayingMessageId(msg.id),
      onEnd: () => setPlayingMessageId(null),
      onError: () => setPlayingMessageId(null),
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/conversations">
            <Button size="sm" variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>{callerName}</span>
              <span className="text-xs font-mono text-slate-500 font-normal">({formatPhone(conversation.callerNumber)})</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">{conversation.intent}</p>
          </div>
        </div>

        {/* Quick Follow-up Status Actions */}
        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleCreateTask}
            leftIcon={<Check className="h-3.5 w-3.5 text-emerald-600" />}
          >
            {taskCreated ? "✓ Task Assigned" : "Create Follow-up Task"}
          </Button>

          <select
            value={conversation.status}
            onChange={(e) => handleUpdateStatus(e.target.value as ConversationStatus)}
            className={`rounded-xl px-3 py-2 text-xs font-bold border ${statusCls} cursor-pointer focus:outline-none`}
          >
            <option value="new">Status: New</option>
            <option value="contacted">Status: Contacted</option>
            <option value="completed">Status: Completed</option>
            <option value="closed">Status: Closed</option>
          </select>
        </div>
      </div>

      {/* Grid: Left Summary & Extracted Data, Right Transcript */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Metadata & Extracted Entities (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Urgency & Status Card */}
          <Card className="p-5 border-slate-200 bg-white shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Urgency Classification</span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${urgencyCls}`}>
                {conversation.urgency === "HIGH" && <AlertTriangle className="h-3.5 w-3.5" />}
                {conversation.urgency}
              </span>
            </div>

            <div className="space-y-2.5 text-xs text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Call Timestamp:</span>
                <span className="font-semibold">{formatDateTime(conversation.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Language:</span>
                <span className="font-bold text-indigo-700 uppercase">{conversation.language || "en"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Session ID:</span>
                <span className="font-mono text-[10px] text-slate-400">{conversation.id}</span>
              </div>
            </div>

            {conversation.summary && (
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 text-xs space-y-1">
                <span className="font-bold text-slate-900 text-[11px] uppercase tracking-wider">AI Call Summary:</span>
                <p className="text-slate-600 leading-relaxed">{conversation.summary}</p>
              </div>
            )}
          </Card>

          {/* Extracted Entities */}
          <Card className="p-5 border-slate-200 bg-white shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Extracted Customer Data</span>
              <Badge variant="purple" className="text-[10px]">Structured</Badge>
            </div>

            {Object.keys(conversation.extractedFields || {}).length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No structured data was extracted.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(conversation.extractedFields).map(([key, val]) => (
                  <div key={key} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">{key}</div>
                    <div className="text-indigo-700 font-bold text-xs mt-0.5 truncate">
                      {typeof val === "object" ? JSON.stringify(val) : String(val)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Executed Tools */}
          {conversation.toolCalls && conversation.toolCalls.length > 0 && (
            <Card className="p-5 border-slate-200 bg-white shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Code2 className="h-4 w-4 text-emerald-600" />
                  <span>Executed Agent Tools</span>
                </span>
                <Badge variant="success" className="text-[10px]">
                  {conversation.toolCalls.length} Executed
                </Badge>
              </div>

              <div className="space-y-2">
                {conversation.toolCalls.map((t, idx) => (
                  <div key={idx} className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs font-mono space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-700">{t.toolName}</span>
                      <span className="text-[10px] text-slate-400">{t.executionTimeMs}ms</span>
                    </div>
                    <div className="text-[10px] text-slate-600 truncate">Input: {JSON.stringify(t.input)}</div>
                    <div className="text-[10px] text-indigo-700 font-semibold truncate">Output: {JSON.stringify(t.output)}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column: Full Conversation Transcript with Voice Audio Replay */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-slate-200 bg-white shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-600" />
                <span>Audio Transcript & Voice Log</span>
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                {conversation.messages.length} Messages
              </span>
            </div>

            <div className="space-y-4 pt-2">
              {conversation.messages.map((msg) => {
                const isAssistant = msg.role === "assistant";
                const isPlaying = playingMessageId === msg.id;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isAssistant ? "items-start" : "items-end"}`}
                  >
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {isAssistant ? "CallPilot AI Voice" : "Caller"}
                      </span>
                      <span className="text-[10px] text-slate-400">{formatTime(msg.timestamp)}</span>
                    </div>

                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-xs ${
                        isAssistant
                          ? "bg-slate-50 border border-slate-200 text-slate-800"
                          : "bg-indigo-600 text-white font-medium"
                      }`}
                    >
                      {msg.content}
                    </div>

                    {/* Voice Replay button for assistant response */}
                    {isAssistant && (
                      <div className="mt-1 flex items-center gap-1.5 pl-1">
                        <button
                          onClick={() => handlePlayMessageAudio(msg)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            isPlaying
                              ? "bg-indigo-600 text-white animate-pulse"
                              : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80"
                          }`}
                        >
                          {isPlaying ? (
                            <>
                              <Square className="h-2.5 w-2.5 fill-current" />
                              <span>Playing Voice...</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="h-3 w-3" />
                              <span>Replay Voice</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {isAssistant && msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className="mt-1 flex gap-1 pl-1">
                        {msg.toolCalls.map((t, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-mono font-bold"
                          >
                            <CalendarCheck className="h-3 w-3 text-emerald-600" />
                            <span>{t.toolName} ({t.executionTimeMs}ms)</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
