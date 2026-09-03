"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Bot,
  Send,
  RotateCcw,
  Sparkles,
  CalendarCheck,
  PhoneCall,
  Volume2,
  VolumeX,
  CheckCircle2,
  UserCheck,
  Save,
  Mic,
  MicOff,
  Square,
  Activity,
  Radio,
  Clock,
  ShieldCheck,
  Building2,
  PhoneForwarded,
  AlertCircle,
  HelpCircle,
  X,
  Check,
  Loader2,
  Edit3,
  Play,
  Pause,
  Sliders,
  PhoneOff,
  Trash2,
  CornerDownLeft,
  Headphones,
  Zap,
} from "lucide-react";
import { storageRepo, AppState } from "@/lib/store/storage";
import { PREBUILT_TEMPLATES } from "@/lib/workflow/templates";
import { processConversationTurn } from "@/lib/ai/orchestrator";
import { Message, ToolCallRecord, UrgencyLevel, LanguageCode, Workflow, VoiceState } from "@/types";
import { Button, Badge, ProgressBar } from "@/components/ui";
import { generateId, formatTime } from "@/lib/utils";
import { voiceEngine, VoiceLanguage, VoiceSpeaker } from "@/lib/voice/voiceEngine";
import { startAudioCapture, RecordingSession } from "@/lib/voice/audioRecorder";

export default function SimulatorPage() {
  const [appState, setAppState] = useState<AppState>(storageRepo.getState());
  const [selectedIndustry, setSelectedIndustry] = useState<string>("cake_shop");
  const [activeWorkflow, setActiveWorkflow] = useState<Workflow>(PREBUILT_TEMPLATES.cake_shop);
  const [messages, setMessages] = useState<Message[]>([]);
  const [extractedFields, setExtractedFields] = useState<Record<string, any>>({});
  const [toolCalls, setToolCalls] = useState<ToolCallRecord[]>([]);
  const [urgency, setUrgency] = useState<UrgencyLevel>("NORMAL");
  const [currentIntent, setCurrentIntent] = useState<string>("Missed Call Follow-up");
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>("en");
  const [voiceSpeaker, setVoiceSpeaker] = useState<VoiceSpeaker>("shubh");
  const [voiceSpeed, setVoiceSpeed] = useState<number>(1.0);
  const [lastUpdatedField, setLastUpdatedField] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isCallEnded, setIsCallEnded] = useState(false);
  const [isLiveCallActive, setIsLiveCallActive] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);

  // =========================================================================
  // CONTINUOUS HANDS-FREE VOICE CONVERSATION STATE
  // =========================================================================
  const [voiceModeType, setVoiceModeType] = useState<"hands_free_call" | "dictate">("hands_free_call");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceProviderStatus, setVoiceProviderStatus] = useState<{ configured: boolean; provider: string } | null>(null);
  const [voiceCreditExhausted, setVoiceCreditExhausted] = useState(false);
  const [liveVolume, setLiveVolume] = useState<number>(0);
  const [voiceErrorMessage, setVoiceErrorMessage] = useState<string | null>(null);
  const [isTestingAudio, setIsTestingAudio] = useState(false);
  const [liveSpokenText, setLiveSpokenText] = useState<string>("");
  const [hasTranscribedSpeech, setHasTranscribedSpeech] = useState<boolean>(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingSessionRef = useRef<RecordingSession | null>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const isLiveCallActiveRef = useRef<boolean>(false);
  const voiceModeTypeRef = useRef<"hands_free_call" | "dictate">("hands_free_call");

  // Keep refs in sync with state for real-time callbacks
  useEffect(() => {
    isLiveCallActiveRef.current = isLiveCallActive;
  }, [isLiveCallActive]);

  useEffect(() => {
    voiceModeTypeRef.current = voiceModeType;
  }, [voiceModeType]);

  useEffect(() => {
    const unsub = storageRepo.subscribe((s) => setAppState({ ...s }));
    return () => unsub();
  }, []);

  // Fetch voice provider status from server on mount
  useEffect(() => {
    fetch("/api/voice/status")
      .then((res) => res.json())
      .then((data) => {
        setVoiceProviderStatus(data);
      })
      .catch((err) => console.warn("Voice status check warning:", err));
  }, []);

  // Call duration interval timer
  useEffect(() => {
    if (isLiveCallActive && !isCallEnded) {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLiveCallActive, isCallEnded]);

  // Clean up audio streams on unmount
  useEffect(() => {
    return () => {
      cancelRecording();
      voiceEngine.stopSpeaking();
    };
  }, []);

  // Initialize conversation when workflow or language changes
  useEffect(() => {
    const wf = PREBUILT_TEMPLATES[selectedIndustry] || PREBUILT_TEMPLATES.cake_shop;
    setActiveWorkflow(wf);
    storageRepo.loadDemoBusiness(selectedIndustry);

    let initialGreeting = wf.greeting;
    if (selectedLanguage === "kn" && wf.greetingKn) initialGreeting = wf.greetingKn;
    else if ((selectedLanguage === "hi" || selectedLanguage === "hinglish") && wf.greetingHi) initialGreeting = wf.greetingHi;

    const initialMsg: Message = {
      id: generateId("msg_init"),
      conversationId: "sim_conv",
      role: "assistant",
      content: initialGreeting,
      timestamp: new Date().toISOString(),
      language: selectedLanguage,
    };

    setMessages([initialMsg]);
    setExtractedFields({});
    setToolCalls([]);
    setUrgency("NORMAL");
    setIsComplete(false);
    setIsCallEnded(false);
    setIsLiveCallActive(false);
    setIsMicMuted(false);
    setLastUpdatedField(null);
    setSavedSuccess(false);
    setCallDuration(0);
    setVoiceErrorMessage(null);
    setPlayingMessageId(null);
    setLiveSpokenText("");
    setHasTranscribedSpeech(false);
  }, [selectedIndustry, selectedLanguage]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isLoading, isTranscribing, liveSpokenText]);

  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // =========================================================================
  // CONTINUOUS HANDS-FREE VOICE CAPTURE ENGINE
  // =========================================================================
  const startContinuousCapture = async () => {
    try {
      if (recordingSessionRef.current) {
        recordingSessionRef.current.cancel();
        recordingSessionRef.current = null;
      }

      await voiceEngine.unlockAudio();
      setVoiceErrorMessage(null);

      const session = await startAudioCapture({
        language: selectedLanguage,
        continuous: true,
        silenceTimeoutMs: 1300,
        onLiveTranscript: (text) => {
          setLiveSpokenText(text);
        },
        onSpeechStart: () => {
          if (!isSpeakingRef.current) {
            setVoiceState("listening");
            setIsRecording(true);
          }
        },
        onSpeechEnd: async (finalTranscript) => {
          // Automatic Turn End via Silence Detection (Zero Clicks Required!)
          console.log("[Continuous Call] Auto-submitting speech turn:", finalTranscript);
          if (finalTranscript.trim()) {
            setLiveSpokenText("");
            setIsRecording(false);
            setVoiceState("processing");
            recordingSessionRef.current?.pause();
            await handleSendMessage(finalTranscript.trim());
          }
        },
        onBargeIn: () => {
          // User started talking while AI was speaking!
          if (isSpeakingRef.current) {
            console.log("[Continuous Call] Barge-in detected, interrupting AI speech");
            handleInterruptSpeaking();
            recordingSessionRef.current?.resume();
            setVoiceState("listening");
          }
        },
        onVolumeChange: setLiveVolume,
        onError: (err) => {
          console.warn("Continuous microphone capture warning:", err);
          setVoiceErrorMessage(err);
        },
      });

      recordingSessionRef.current = session;
      return session;
    } catch (err: any) {
      console.error("Failed to start continuous capture:", err);
      setVoiceErrorMessage(err.message || "Microphone access error");
      return null;
    }
  };

  // Dictate mode recording trigger (ChatGPT manual record & edit)
  const startDictateRecording = async () => {
    try {
      if (voiceEngine.getIsSpeaking()) {
        voiceEngine.stopSpeaking();
      }

      await voiceEngine.unlockAudio();
      setVoiceState("requesting_permission");
      setVoiceErrorMessage(null);
      setRecordingSeconds(0);
      setLiveSpokenText("");
      setHasTranscribedSpeech(false);

      const session = await startAudioCapture({
        language: selectedLanguage,
        continuous: false,
        onLiveTranscript: (text) => {
          setLiveSpokenText(text);
        },
        onVolumeChange: setLiveVolume,
        onError: (err) => {
          setVoiceErrorMessage(err);
          setVoiceState("error");
          setIsRecording(false);
        },
      });

      recordingSessionRef.current = session;
      setIsRecording(true);
      setVoiceState("listening");

      recTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Microphone capture error:", err);
      setVoiceState("error");
      setIsRecording(false);
    }
  };

  // User clicks Done in manual Dictate mode
  const stopAndTranscribe = async () => {
    if (!isRecording || !recordingSessionRef.current) return;

    try {
      if (recTimerRef.current) {
        clearInterval(recTimerRef.current);
        recTimerRef.current = null;
      }

      setIsTranscribing(true);
      setVoiceState("processing");

      const session = recordingSessionRef.current;
      recordingSessionRef.current = null;
      setIsRecording(false);
      setLiveVolume(0);

      const result = await session.stop();
      const finalTranscript = (result.transcript || liveSpokenText || inputText || "").trim();

      if (finalTranscript) {
        setInputText(finalTranscript);
        setHasTranscribedSpeech(true);

        if (voiceModeType === "hands_free_call") {
          await handleSendMessage(finalTranscript);
        } else {
          setTimeout(() => {
            inputRef.current?.focus();
            inputRef.current?.select();
          }, 150);
        }
      }
    } catch (err: any) {
      console.warn("STT processing error:", err);
    } finally {
      setIsTranscribing(false);
      setVoiceState("idle");
      setLiveSpokenText("");
    }
  };

  const cancelRecording = () => {
    if (recTimerRef.current) {
      clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
    if (recordingSessionRef.current) {
      recordingSessionRef.current.cancel();
      recordingSessionRef.current = null;
    }
    setIsRecording(false);
    setIsTranscribing(false);
    setVoiceState("idle");
    setLiveVolume(0);
    setLiveSpokenText("");
  };

  // Toggle Mute
  const handleToggleMute = () => {
    const nextMute = !isMicMuted;
    setIsMicMuted(nextMute);
    recordingSessionRef.current?.setMuted(nextMute);
    voiceEngine.playMuteChime(nextMute);
  };

  // =========================================================================
  // DUAL-ENGINE AI SPEECH PLAYBACK & AUTO-TURN RESUME
  // =========================================================================
  const speakAIResponse = async (textToSpeak: string, responseId?: string, isCallLoop = true) => {
    if (!audioEnabled || voiceCreditExhausted) {
      // If audio is muted, return immediately to listening in live call mode
      if (isCallLoop && isLiveCallActiveRef.current && voiceModeTypeRef.current === "hands_free_call") {
        setVoiceState("listening");
        recordingSessionRef.current?.resume();
      }
      return;
    }

    try {
      isSpeakingRef.current = true;
      setVoiceState("speaking");
      if (responseId) setPlayingMessageId(responseId);

      // Pause continuous listener while AI is vocalizing
      recordingSessionRef.current?.pause();

      await voiceEngine.speak({
        text: textToSpeak,
        language: selectedLanguage as VoiceLanguage,
        speaker: voiceSpeaker,
        speed: voiceSpeed,
        responseId,
        onStart: () => {
          isSpeakingRef.current = true;
          setVoiceState("speaking");
        },
        onEnd: () => {
          isSpeakingRef.current = false;
          setPlayingMessageId(null);

          // CONTINUOUS HANDS-FREE LOOP: Automatically open mic and listen for caller's next reply!
          if (isCallLoop && isLiveCallActiveRef.current && voiceModeTypeRef.current === "hands_free_call" && !isCallEnded) {
            console.log("[Continuous Call] AI finished speaking, auto-resuming listening...");
            setVoiceState("listening");
            setIsRecording(true);
            setTimeout(() => {
              if (isLiveCallActiveRef.current && !isSpeakingRef.current) {
                recordingSessionRef.current?.resume();
              }
            }, 100);
          } else {
            setVoiceState("idle");
          }
        },
        onError: (err) => {
          console.warn("Audio vocalization notice:", err);
          isSpeakingRef.current = false;
          setPlayingMessageId(null);
          if (isCallLoop && isLiveCallActiveRef.current && voiceModeTypeRef.current === "hands_free_call" && !isCallEnded) {
            setVoiceState("listening");
            recordingSessionRef.current?.resume();
          } else {
            setVoiceState("idle");
          }
        },
      });
    } catch (err) {
      console.warn("speakAIResponse catch:", err);
      isSpeakingRef.current = false;
      setPlayingMessageId(null);
      if (isCallLoop && isLiveCallActiveRef.current && voiceModeTypeRef.current === "hands_free_call" && !isCallEnded) {
        setVoiceState("listening");
        recordingSessionRef.current?.resume();
      } else {
        setVoiceState("idle");
      }
    }
  };

  // Interrupt assistant playback
  const handleInterruptSpeaking = () => {
    voiceEngine.stopSpeaking();
    isSpeakingRef.current = false;
    setPlayingMessageId(null);
    if (isLiveCallActiveRef.current && voiceModeTypeRef.current === "hands_free_call" && !isCallEnded) {
      setVoiceState("listening");
      recordingSessionRef.current?.resume();
    } else {
      setVoiceState("idle");
    }
  };

  // Play / Replay specific message
  const handleReplayMessage = async (msg: Message) => {
    if (playingMessageId === msg.id) {
      handleInterruptSpeaking();
      return;
    }
    await speakAIResponse(msg.content, msg.id, false);
  };

  // =========================================================================
  // VOICE-FIRST TELEPHONY CONTROLS (Hands-Free Live Call)
  // =========================================================================
  const handleStartVoiceCall = async () => {
    try {
      await voiceEngine.unlockAudio();
      setIsLiveCallActive(true);
      setIsCallEnded(false);
      setIsMicMuted(false);
      setVoiceModeType("hands_free_call");
      setVoiceState("speaking");

      // Play ringing and connect chime
      await voiceEngine.playRingTone(1.2);
      await voiceEngine.playConnectChime();

      // Initialize warm continuous recording session
      await startContinuousCapture();
      recordingSessionRef.current?.pause(); // Keep paused while greeting is vocalized

      // Speak initial greeting automatically -> When finished, auto-triggers listening!
      const initialGreetingMsg = messages[0]?.content || activeWorkflow.greeting;
      await speakAIResponse(initialGreetingMsg, messages[0]?.id, true);
    } catch (e) {
      console.warn("Start voice call error:", e);
    }
  };

  const handleEndVoiceCall = async () => {
    cancelRecording();
    voiceEngine.stopSpeaking();
    isSpeakingRef.current = false;
    await voiceEngine.playHangupTone();
    setIsLiveCallActive(false);
    setIsCallEnded(true);
    setVoiceState("idle");
    setLiveSpokenText("");
  };

  const handleTestAudio = async () => {
    try {
      setIsTestingAudio(true);
      await voiceEngine.testAudio();
      setTimeout(() => setIsTestingAudio(false), 2500);
    } catch (e) {
      setIsTestingAudio(false);
    }
  };

  // =========================================================================
  // CORE CONVERSATION HANDLER
  // =========================================================================
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isLoading) return;

    setInputText("");
    setLiveSpokenText("");
    setHasTranscribedSpeech(false);

    const userMsg: Message = {
      id: generateId("msg_user"),
      conversationId: "sim_conv",
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
      language: selectedLanguage,
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setIsLoading(true);

    try {
      const activeBiz = storageRepo.getActiveBusiness();

      let result;
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessId: activeBiz.id,
            workflowId: activeWorkflow.id,
            conversationHistory: newHistory,
            latestUserMessage: text,
            extractedFields,
            callerPhone: "+1 (555) 349-8800",
            language: selectedLanguage,
          }),
        });
        if (res.ok) {
          result = await res.json();
        }
      } catch (e) {
        console.warn("Using orchestrator directly:", e);
      }

      if (!result) {
        result = await processConversationTurn({
          business: activeBiz,
          workflow: activeWorkflow,
          conversationHistory: newHistory,
          latestUserMessage: text,
          extractedFields,
          callerPhone: "+1 (555) 349-8800",
          language: selectedLanguage,
        });
      }

      // Track newly updated fields for pulse effect
      const keysUpdated = Object.keys(result.updatedExtractedFields).filter(
        (k) => result.updatedExtractedFields[k] !== extractedFields[k]
      );
      if (keysUpdated.length > 0) {
        setLastUpdatedField(keysUpdated[keysUpdated.length - 1]);
        setTimeout(() => setLastUpdatedField(null), 1800);
      }

      setExtractedFields(result.updatedExtractedFields);
      setUrgency(result.urgency);
      setIsComplete(result.isComplete);
      setCurrentIntent(result.intent);

      const lowerText = text.toLowerCase();
      const isFarewell = ["end", "bye", "goodbye", "hang up", "done", "ok end", "thanks bye", "exit", "ಮುಗಿಸಿ", "ಧನ್ಯವಾದಗಳು"].some(
        (w) => lowerText.includes(w) || text.includes(w)
      );

      if (result.toolCallsExecuted && result.toolCallsExecuted.length > 0) {
        setToolCalls((prev) => [...prev, ...result.toolCallsExecuted]);
      }

      const responseId = generateId("resp_ai");
      const aiMsg: Message = {
        id: responseId,
        conversationId: "sim_conv",
        role: "assistant",
        content: result.reply,
        timestamp: new Date().toISOString(),
        toolCalls: result.toolCallsExecuted,
        language: result.detectedLanguage,
      };

      setMessages((prev) => [...prev, aiMsg]);

      // If user indicated farewell, vocalize farewell then hang up
      if (isFarewell) {
        if (audioEnabled) {
          await speakAIResponse(result.reply, responseId, false);
        }
        setTimeout(() => {
          handleEndVoiceCall();
        }, 1200);
        return;
      }

      // Vocalize AI Response and automatically resume continuous listening onEnd
      if (audioEnabled) {
        await speakAIResponse(result.reply, responseId, isLiveCallActive);
      } else if (isLiveCallActive && voiceModeType === "hands_free_call") {
        setVoiceState("listening");
        recordingSessionRef.current?.resume();
      }
    } catch (err: any) {
      console.error("Simulation error:", err);
      const errorMsg: Message = {
        id: generateId("msg_err"),
        conversationId: "sim_conv",
        role: "assistant",
        content: selectedLanguage === "kn" 
          ? "ಕ್ಷಮಿಸಿ, ಧ್ವನಿ ಸಂಪರ್ಕದಲ್ಲಿ ಸಣ್ಣ ದೋಷ ಕಂಡುಬಂದಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೊಮ್ಮೆ ಹೇಳುವಿರಾ?"
          : selectedLanguage === "hi"
          ? "क्षमा करें, आवाज़ में थोड़ी रुकावट आई। क्या आप कृपया दोबारा बोलेंगे?"
          : "I apologize, I experienced a brief audio glitch. Could you please repeat that?",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      if (isLiveCallActive && voiceModeType === "hands_free_call") {
        setVoiceState("listening");
        recordingSessionRef.current?.resume();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    voiceEngine.stopSpeaking();
    isSpeakingRef.current = false;
    cancelRecording();

    let initialGreeting = activeWorkflow.greeting;
    if (selectedLanguage === "kn" && activeWorkflow.greetingKn) initialGreeting = activeWorkflow.greetingKn;
    else if ((selectedLanguage === "hi" || selectedLanguage === "hinglish") && activeWorkflow.greetingHi) initialGreeting = activeWorkflow.greetingHi;

    const initialMsg: Message = {
      id: generateId("msg_init"),
      conversationId: "sim_conv",
      role: "assistant",
      content: initialGreeting,
      timestamp: new Date().toISOString(),
      language: selectedLanguage,
    };

    setMessages([initialMsg]);
    setExtractedFields({});
    setToolCalls([]);
    setUrgency("NORMAL");
    setIsComplete(false);
    setIsCallEnded(false);
    setIsLiveCallActive(false);
    setIsMicMuted(false);
    setVoiceState("idle");
    setLastUpdatedField(null);
    setSavedSuccess(false);
    setCallDuration(0);
    setInputText("");
    setPlayingMessageId(null);
    setLiveSpokenText("");
    setHasTranscribedSpeech(false);
  };

  const handleSaveToDashboard = () => {
    const activeBiz = storageRepo.getActiveBusiness();
    const callerName = extractedFields.customer_name || extractedFields.patient_name || "Simulation Caller";
    const callerPhone = extractedFields.phone_number || "+1 (555) 349-8800";
    storageRepo.createConversation({
      businessId: activeBiz.id,
      workflowId: activeWorkflow.id,
      callerName,
      callerNumber: callerPhone,
      status: "new",
      urgency,
      intent: currentIntent,
      summary: `Continuous Voice Session for ${activeBiz.name}. Captured ${Object.keys(extractedFields).length}/${activeWorkflow.fields.length} fields: ${JSON.stringify(extractedFields)}.`,
      extractedFields,
      language: selectedLanguage,
      toolCalls,
      messages,
      completedAt: isComplete ? new Date().toISOString() : undefined,
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(extractedFields, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  // 1-Click Realistic Test Prompts (English, Hindi, and Kannada)
  const quickPrompts: Record<string, { label: string; text: string; tag: string }[]> = {
    cake_shop: [
      { label: "🎂 Urgent 2kg Chocolate Order", text: "Hi, I need a 2kg chocolate truffle cake by 6 hours for pickup.", tag: "Urgent <24h" },
      { label: "🍓 Custom Red Velvet Birthday", text: "Hello, my name is Priya. I'd like a 1.5kg Red Velvet cake for my daughter's birthday next Friday with 'Happy 5th Birthday Ananya' written on it.", tag: "Multi-Field" },
      { label: "🇮🇳 ಕನ್ನಡ Cake Order", text: "ನನ್ನ ಹೆಸರು ಪ್ರಿಯಾ. ನನಗೆ ನಾಳೆ ಸಂಜೆ 5 ಗಂಟೆಗೆ 2 ಕೆಜಿ ಚಾಕೊಲೇಟ್ ಟ್ರಫಲ್ ಕೇಕ್ ಬೇಕು.", tag: "Kannada Voice" },
      { label: "🇮🇳 Hindi Urgent Cake", text: "नमस्ते, मुझे आज शाम तक 1 किलो का वैनिला केक चाहिए।", tag: "Hindi Voice" },
    ],
    clinic: [
      { label: "📅 Book Doctor Appointment (GCal)", text: "Hi, my name is John. I have a severe toothache and want to book an appointment with Dr. Sharma tomorrow at 3 PM, phone 555-1234.", tag: "GCal Booking" },
      { label: "🇮🇳 ಕನ್ನಡ Doctor Booking", text: "ನನ್ನ ಹೆಸರು ರಾಹುಲ್. ನನಗೆ ನಾಳೆ ಸಂಜೆ 4 ಗಂಟೆಗೆ ಡಾ. ಶರ್ಮಾ ಅವರ ಜೊತೆ ಅಪಾಯಿಂಟ್ಮೆಂಟ್ ಬೇಕು.", tag: "Kannada Voice" },
      { label: "🇮🇳 ಕನ್ನಡ Confirmation", text: "ಹೌದು, ಬುಕ್ ಮಾಡಿ.", tag: "Kannada Confirm" },
      { label: "🩺 Check Availability Slot", text: "I want an appointment with Dr. Sharma on September 3 at 12:34 AM.", tag: "Conflict Check" },
      { label: "🇮🇳 Hindi Doctor Booking", text: "नमस्ते, मेरा नाम विकास है। मुझे कल शाम 6 बजे डॉक्टर शर्मा से मिलना है।", tag: "Hindi Triage" },
    ],
    delivery: [
      { label: "📦 Track Package DEL-9821", text: "Hi, where is my package DEL-9821? I was expecting it today.", tag: "Live Lookup" },
      { label: "🇮🇳 ಕನ್ನಡ Track Package", text: "ನನ್ನ ಪ್ಯಾಕೇಜ್ DEL-9821 ಎಲ್ಲಿದೆ? ದಯವಿಟ್ಟು ಸ್ಥಿತಿ ತಿಳಿಸಿ.", tag: "Kannada Tracking" },
      { label: "🚚 Schedule Heavy Pickup", text: "I need to schedule a heavy parcel pickup tomorrow morning at 10 AM from 452 Tech Park.", tag: "Dispatch" },
    ],
    real_estate: [
      { label: "🏡 Schedule 3 BHK Site Visit (GCal)", text: "Hi, my name is Rajesh. I want to schedule a site visit for a 3 BHK luxury apartment this Saturday at 11 AM in Whitefield.", tag: "GCal Site Visit" },
      { label: "🇮🇳 ಕನ್ನಡ Site Visit", text: "ನನ್ನ ಹೆಸರು ಸುರೇಶ್. ನಾನು ಈ ಶನಿವಾರ 3 BHK ಫ್ಲ್ಯಾಟ್ ಸೈಟ್ ಭೇಟಿ ಮಾಡಲು ಬಯಸುತ್ತೇನೆ.", tag: "Kannada Realty" },
    ],
    repair_service: [
      { label: "🚨 Emergency Water Leak (Critical)", text: "Help! There is an active major pipe leak in my kitchen at 84 Industrial Way. Need an emergency plumber immediately!", tag: "CRITICAL 911" },
      { label: "🇮🇳 ಕನ್ನಡ Emergency Repair", text: "ತುರ್ತು ಸಹಾಯ ಬೇಕು! ನನ್ನ ಮನೆಯಲ್ಲಿ ಪೈಪ್ ಲೀಕ್ ಆಗಿದೆ, ತಕ್ಷಣ ಪ್ಲಂಬರ್ ಕಳುಹಿಸಿ.", tag: "Kannada Emergency" },
    ],
  };

  // Smart contextual suggestion chips
  const getContextualChips = () => {
    if (selectedLanguage === "kn") {
      if (selectedIndustry === "clinic") {
        if (!extractedFields.patient_name) return ["ರಾಹುಲ್", "ಪ್ರಿಯಾ", "ಸುರೇಶ್"];
        if (!extractedFields.doctor_speciality) return ["ಡಾ. ಶರ್ಮಾ (ಜನರಲ್)", "ಡಾ. ಕಪೂರ್ (ಡೆಂಟಿಸ್ಟ್)", "ಡಾ. ಮೆಹ್ತಾ (ಹೃದಯ ತಜ್ಞ)"];
        if (!extractedFields.preferred_date) return ["ನಾಳೆ", "ಇವತ್ತು", "ಶುಕ್ರವಾರ"];
        return ["ಸಂಜೆ 4 ಗಂಟೆಗೆ", "ಬೆಳಿಗ್ಗೆ 10:00", "ಹೌದು, ಬುಕ್ ಮಾಡಿ"];
      }
      return ["ನಾಳೆ", "ಚಾಕೊಲೇಟ್", "ಹೌದು, ಕನ್ಫರ್ಮ್ ಮಾಡಿ"];
    }

    if (selectedIndustry === "cake_shop") {
      if (!extractedFields.customer_name) return ["Anusha", "Priya Sharma", "Rahul Verma"];
      if (!extractedFields.flavor) return ["Chocolate Truffle", "Red Velvet", "Butterscotch", "Vanilla Bean"];
      if (!extractedFields.weight) return ["1 kg", "2 kg", "0.5 kg (Half kg)", "for 15 people"];
      if (!extractedFields.required_date) return ["In 6 hours", "Tomorrow at 5 PM", "Tonight 8 PM"];
      if (!extractedFields.delivery_type) return ["Store Pickup", "Home Delivery"];
      return ["+1 (555) 349-8800", "Under ₹1,500", "All details confirmed!"];
    }

    if (selectedIndustry === "clinic") {
      if (!extractedFields.patient_name) return ["John Doe", "Sarah Jenkins", "Vikram Patel"];
      if (!extractedFields.doctor_speciality) return ["General Physician (Dr. Sharma)", "Dentist (Dr. Kapoor)", "Cardiologist (Dr. Mehta)"];
      if (!extractedFields.preferred_date) return ["Tomorrow", "This Friday", "Today afternoon"];
      return ["3:00 PM", "10:00 AM", "Yes, book it!"];
    }
    return ["DEL-9821", "Tomorrow 10 AM", "Confirm order"];
  };

  const capturedCount = Object.keys(extractedFields).length;
  const totalCount = activeWorkflow.fields.length;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-5 space-y-4 sm:space-y-6 pb-16">
      {/* =========================================================================
          TOP COMMAND BAR & MULTILINGUAL VOICE CONTROLS
      ========================================================================== */}
      <div className="glass-panel-luxury rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4 border border-slate-200/90 shadow-md">
        {/* Industry Selector */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Continuous Hands-Free Voice Agent
            </span>
            <span className="text-[10px] font-mono text-slate-400">Zero Clicks Needed • Live Turn-Taking</span>
          </div>

          <div className="flex items-center flex-wrap gap-1.5 pt-1">
            {[
              { id: "cake_shop", label: "🎂 Cake Bakery" },
              { id: "clinic", label: "🩺 Clinic & Doctor" },
              { id: "delivery", label: "📦 Logistics Delivery" },
              { id: "real_estate", label: "🏡 Real Estate" },
              { id: "repair_service", label: "🔧 Emergency Repair" },
            ].map((item) => {
              const isActive = selectedIndustry === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedIndustry(item.id)}
                  className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25 scale-[1.02] ring-2 ring-indigo-400/40"
                      : "bg-white/80 hover:bg-slate-100 text-slate-700 border border-slate-200/90 hover:border-slate-300"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-2.5">
          {/* Multilingual Selector: English, Hindi, Kannada */}
          <div className="flex items-center rounded-xl sm:rounded-2xl bg-slate-100/90 p-0.5 sm:p-1 border border-slate-200/80 shadow-inner text-[11px] sm:text-xs">
            <button
              onClick={() => setSelectedLanguage("en")}
              className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl font-bold transition-all cursor-pointer ${
                selectedLanguage === "en"
                  ? "bg-white text-indigo-700 shadow-xs scale-[1.02]"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="English (en-IN)"
            >
              🇬🇧 English
            </button>
            <button
              onClick={() => setSelectedLanguage("hi")}
              className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl font-bold transition-all cursor-pointer ${
                selectedLanguage === "hi" || selectedLanguage === "hinglish"
                  ? "bg-white text-indigo-700 shadow-xs scale-[1.02]"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Hindi / Hinglish (hi-IN)"
            >
              🇮🇳 हिंदी
            </button>
            <button
              onClick={() => setSelectedLanguage("kn")}
              className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl font-bold transition-all cursor-pointer ${
                selectedLanguage === "kn"
                  ? "bg-white text-indigo-700 shadow-xs scale-[1.02]"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Kannada / ಕನ್ನಡ (kn-IN)"
            >
              🇮🇳 ಕನ್ನಡ
            </button>
          </div>

          {/* Voice Mode Selector */}
          <div className="flex items-center rounded-xl sm:rounded-2xl bg-slate-100/90 p-0.5 sm:p-1 border border-slate-200/80 shadow-inner text-[11px] sm:text-xs">
            <button
              onClick={() => setVoiceModeType("hands_free_call")}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                voiceModeType === "hands_free_call"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs scale-[1.02]"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Continuous conversation (Zero button clicks during call)"
            >
              <PhoneCall className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
              <span>Hands-Free Call</span>
            </button>
            <button
              onClick={() => setVoiceModeType("dictate")}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                voiceModeType === "dictate"
                  ? "bg-indigo-600 text-white shadow-xs scale-[1.02]"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Speak -> Transcribe live -> Edit text -> Send"
            >
              <Edit3 className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
              <span>Dictate & Edit</span>
            </button>
          </div>

          {/* Voice Speed Toggle */}
          <button
            onClick={() => setVoiceSpeed((prev) => (prev === 1.0 ? 1.15 : prev === 1.15 ? 1.3 : 1.0))}
            className="px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-mono font-bold text-slate-700 shadow-2xs cursor-pointer transition-all"
            title="Voice Playback Speed"
          >
            ⚡ {voiceSpeed}x
          </button>

          {/* Test Audio Button */}
          <button
            onClick={handleTestAudio}
            disabled={isTestingAudio}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
              isTestingAudio
                ? "bg-emerald-50 border-emerald-300 text-emerald-700 animate-pulse"
                : "bg-white border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-600"
            }`}
            title="Test Voice Audio Output"
          >
            <Volume2 className="h-3.5 w-3.5 text-indigo-600" />
            <span>{isTestingAudio ? "Playing..." : "Test Audio"}</span>
          </button>

          {/* Audio Output Toggle */}
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border transition-all cursor-pointer ${
              audioEnabled
                ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-2xs"
                : "bg-slate-100 border-slate-200 text-slate-400"
            }`}
            title={audioEnabled ? "Mute Assistant Audio" : "Unmute Assistant Audio"}
          >
            {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {/* Reset Session */}
          <Button
            size="sm"
            variant="secondary"
            onClick={handleReset}
            leftIcon={<RotateCcw className="h-3.5 w-3.5 text-slate-500" />}
            className="rounded-xl sm:rounded-2xl text-xs"
          >
            Reset
          </Button>

          {/* Save to CRM Action */}
          <Button
            size="sm"
            variant="glow"
            onClick={handleSaveToDashboard}
            leftIcon={<Save className="h-3.5 w-3.5" />}
            className="rounded-xl sm:rounded-2xl shadow-md text-xs"
          >
            {savedSuccess ? "✓ Logged!" : "Save"}
          </Button>
        </div>
      </div>

      {/* Error Banners */}
      {voiceCreditExhausted && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between text-xs shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="font-semibold">
              Voice credits exhausted. Browser speech synthesis & text mode active with full Gemini reasoning.
            </span>
          </div>
          <Badge variant="warning" className="text-[10px]">₹0 Protected</Badge>
        </div>
      )}

      {voiceErrorMessage && !voiceCreditExhausted && (
        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 text-xs">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{voiceErrorMessage}</span>
        </div>
      )}

      {/* =========================================================================
          CONTINUOUS VOICE CALL HERO BANNER / IN-CALL COCKPIT
      ========================================================================== */}
      <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white shadow-2xl transition-all duration-500 border ${
        isLiveCallActive
          ? "bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border-indigo-500/50 ring-2 ring-indigo-500/20"
          : "bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 border-indigo-900/50"
      }`}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-5">
          {/* Left Avatar & Live State */}
          <div className="flex items-center gap-4 w-full md:w-auto">
            {/* Dynamic Interactive Voice Orb */}
            <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-teal-400 text-white shadow-xl shadow-indigo-500/30 shrink-0">
              <PhoneCall className={`h-7 w-7 ${isLiveCallActive ? "animate-pulse" : ""}`} />
              
              {isLiveCallActive && (
                <>
                  <span className={`absolute -inset-1 rounded-3xl opacity-75 animate-ping ${
                    voiceState === "speaking"
                      ? "bg-purple-500"
                      : voiceState === "listening"
                      ? "bg-emerald-500"
                      : "bg-indigo-500"
                  }`} />
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-950" />
                  </span>
                </>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-xl font-black tracking-tight text-white">
                  {isLiveCallActive ? "Continuous Voice Call In Progress" : "Autonomous Voice AI Telephony"}
                </h2>
                <Badge
                  variant={isLiveCallActive ? "neon-emerald" : "secondary"}
                  dot={isLiveCallActive}
                  className="text-[10px] font-mono uppercase tracking-wide"
                >
                  {isLiveCallActive ? `Live (${formatCallDuration(callDuration)})` : "Standby Ready"}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2 mt-1 text-xs text-indigo-200/90 font-medium">
                {isLiveCallActive ? (
                  <span className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                    Hands-Free Continuous Mode Active &bull; Speak naturally without pressing any buttons
                  </span>
                ) : (
                  <span>
                    Click &lsquo;Start Continuous Voice Call&rsquo; to test natural back-and-forth phone conversation in {selectedLanguage === "kn" ? "Kannada" : selectedLanguage === "hi" ? "Hindi" : "English"}.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right In-Call Telephony Action Bar */}
          <div className="flex items-center gap-2.5 sm:gap-3 w-full md:w-auto justify-end">
            {!isLiveCallActive ? (
              <button
                onClick={handleStartVoiceCall}
                className="w-full md:w-auto px-6 py-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-500/30 hover:scale-[1.03] active:scale-[0.98] transition-all cursor-pointer ring-2 ring-emerald-400/40"
              >
                <PhoneCall className="h-4 sm:h-5 w-4 sm:w-5 animate-bounce" />
                <span>Start Continuous Voice Call</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
                {/* Mute Microphone Button */}
                <button
                  onClick={handleToggleMute}
                  className={`px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                    isMicMuted
                      ? "bg-amber-500/90 hover:bg-amber-500 text-white ring-2 ring-amber-400/50"
                      : "bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15"
                  }`}
                  title={isMicMuted ? "Unmute Microphone" : "Mute Microphone"}
                >
                  {isMicMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  <span>{isMicMuted ? "Muted" : "Mute"}</span>
                </button>

                {/* Interrupt AI Button */}
                {voiceState === "speaking" && (
                  <button
                    onClick={handleInterruptSpeaking}
                    className="px-3.5 py-2.5 rounded-xl bg-purple-600/90 hover:bg-purple-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer animate-pulse"
                    title="Interrupt assistant speech"
                  >
                    <Square className="h-3.5 w-3.5 fill-current" />
                    <span>Interrupt AI</span>
                  </button>
                )}

                {/* End Call Button */}
                <button
                  onClick={handleEndVoiceCall}
                  className="px-4 sm:px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center gap-2 transition-all shadow-lg shadow-rose-600/30 hover:scale-[1.02] cursor-pointer"
                >
                  <PhoneOff className="h-4 w-4" />
                  <span>End Call</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Live In-Call Status Radar & Dynamic Subtitles Bar */}
        {isLiveCallActive && (
          <div className="mt-4 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className={`px-2.5 py-1 rounded-lg font-mono font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5 ${
                voiceState === "speaking"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                  : voiceState === "listening"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : voiceState === "processing"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "bg-slate-800 text-slate-300"
              }`}>
                {voiceState === "speaking" ? (
                  <>
                    <Volume2 className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
                    <span>🔊 Agent Speaking...</span>
                  </>
                ) : voiceState === "listening" ? (
                  <>
                    <Mic className="h-3.5 w-3.5 text-emerald-400 animate-bounce" />
                    <span>🎙️ Listening to You (Speak naturally)</span>
                  </>
                ) : voiceState === "processing" ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 text-amber-400 animate-spin" />
                    <span>⚡ AI Thinking & Checking Tools...</span>
                  </>
                ) : (
                  <span>Ready</span>
                )}
              </span>

              {/* Dynamic Sound Wave */}
              <div className="flex items-center gap-1 h-5 px-2 rounded-lg bg-black/30 border border-white/10">
                <div className={`w-1 rounded-full transition-all duration-75 ${
                  voiceState === "speaking"
                    ? "bg-purple-400 animate-wave-1"
                    : liveVolume > 10
                    ? "bg-emerald-400 h-4"
                    : "bg-slate-600 h-1.5"
                }`} />
                <div className={`w-1 rounded-full transition-all duration-75 ${
                  voiceState === "speaking"
                    ? "bg-purple-400 animate-wave-2"
                    : liveVolume > 20
                    ? "bg-emerald-400 h-5"
                    : "bg-slate-600 h-2"
                }`} />
                <div className={`w-1 rounded-full transition-all duration-75 ${
                  voiceState === "speaking"
                    ? "bg-indigo-300 animate-wave-3"
                    : liveVolume > 30
                    ? "bg-emerald-300 h-6"
                    : "bg-slate-600 h-2.5"
                }`} />
                <div className={`w-1 rounded-full transition-all duration-75 ${
                  voiceState === "speaking"
                    ? "bg-indigo-300 animate-wave-4"
                    : liveVolume > 20
                    ? "bg-emerald-400 h-5"
                    : "bg-slate-600 h-2"
                }`} />
                <div className={`w-1 rounded-full transition-all duration-75 ${
                  voiceState === "speaking"
                    ? "bg-purple-400 animate-wave-5"
                    : liveVolume > 10
                    ? "bg-emerald-400 h-4"
                    : "bg-slate-600 h-1.5"
                }`} />
              </div>
            </div>

            {/* Live Real-Time Subtitle Ticker */}
            {liveSpokenText ? (
              <div className="truncate text-emerald-300 font-medium max-w-lg bg-emerald-950/60 px-3 py-1 rounded-lg border border-emerald-500/30">
                <span className="text-emerald-400 font-bold mr-1">Hearing:</span>
                &ldquo;{liveSpokenText}&rdquo;
              </div>
            ) : (
              <div className="text-indigo-200/70 text-[11px] font-mono">
                Auto-silence detection commits speech seamlessly &bull; No button press needed
              </div>
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
          3-COLUMN RESPONSIVE COCKPIT GRID
      ========================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 lg:gap-6 items-start">
        {/* =========================================================================
            COLUMN 1: BUSINESS CONTEXT, PROGRESS & TEST SCENARIOS
        ========================================================================== */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-3.5 sm:space-y-4">
          {/* Active Business Profile Card */}
          <div className="glass-card-luxury rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 space-y-2.5 sm:space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                  Business Profile
                </span>
              </div>
              <Badge variant="purple" className="text-[10px]">
                {activeWorkflow.industry.replace("_", " ")}
              </Badge>
            </div>

            <div className="text-xs space-y-1.5 sm:space-y-2 text-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Company:</span>
                <span className="font-bold text-slate-900 truncate max-w-[130px]">{storageRepo.getActiveBusiness().name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Language:</span>
                <span className="font-bold text-indigo-700 font-mono text-[11px]">
                  {selectedLanguage === "kn" ? "🇮🇳 Kannada (kn-IN)" : selectedLanguage === "hi" ? "🇮🇳 Hindi (hi-IN)" : "🇬🇧 English (en-IN)"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Voice Synthesis:</span>
                <span className="font-bold text-emerald-700 text-[11px]">
                  Bulbul v3 ({voiceSpeaker})
                </span>
              </div>
              <div className="text-[11px] text-slate-600 bg-slate-50/80 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border border-slate-200/70 leading-relaxed font-normal">
                {activeWorkflow.description}
              </div>
            </div>
          </div>

          {/* Intake Completion & Fields Checklist Card */}
          <div className="glass-card-luxury rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                  Fields Checklist
                </span>
                <p className="text-[10px] text-slate-400">Contextual slot extraction</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-indigo-600">
                  {capturedCount}/{totalCount}
                </span>
                <span className="text-[10px] text-slate-400 ml-1">Captured</span>
              </div>
            </div>

            {/* Progress Bar */}
            <ProgressBar value={capturedCount} max={totalCount} />

            {/* Checklist items */}
            <div className="space-y-1.5 max-h-[220px] sm:max-h-[260px] overflow-y-auto pr-1">
              {activeWorkflow.fields.map((field) => {
                const capturedValue = extractedFields[field.name];
                const isCollected = capturedValue !== undefined && capturedValue !== "" && capturedValue !== null;
                const isJustUpdated = lastUpdatedField === field.name;

                return (
                  <div
                    key={field.id}
                    className={`flex flex-col p-2 rounded-xl sm:rounded-2xl text-xs transition-all duration-300 border ${
                      isCollected
                        ? "bg-emerald-50/90 border-emerald-200 text-emerald-950 shadow-2xs font-semibold"
                        : "bg-slate-50/70 border-slate-200/80 text-slate-500 font-normal"
                    } ${isJustUpdated ? "animate-field-pulse ring-2 ring-indigo-500 scale-[1.02]" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2 truncate">
                        {isCollected ? (
                          <CheckCircle2 className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-emerald-600 shrink-0" />
                        ) : (
                          <div className="h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full border-2 border-slate-300 shrink-0" />
                        )}
                        <span className="truncate text-[11px] sm:text-xs">{field.label}</span>
                      </div>
                      {field.required && !isCollected && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 font-bold shrink-0">
                          Req
                        </span>
                      )}
                    </div>

                    {isCollected && (
                      <div className="mt-1 pl-5 sm:pl-6 text-[10px] sm:text-[11px] font-mono text-emerald-800 font-bold truncate">
                        ↳ &ldquo;{String(capturedValue)}&rdquo;
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 1-Click Realistic Test Scenarios */}
          <div className="glass-card-luxury rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 space-y-2.5 sm:space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                <span>1-Click Scenarios</span>
              </div>
              <span className="text-[10px] text-slate-400">Simulate caller</span>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              {(quickPrompts[selectedIndustry] || quickPrompts.cake_shop).map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(item.text)}
                  disabled={isLoading}
                  className="w-full text-left p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-slate-50/80 hover:bg-indigo-50/80 border border-slate-200 hover:border-indigo-300 text-xs text-slate-800 font-medium transition-all duration-200 cursor-pointer group shadow-2xs hover:scale-[1.01]"
                >
                  <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                    <span className="font-bold text-slate-900 group-hover:text-indigo-700 text-xs truncate">
                      {item.label}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-500 font-bold shrink-0 ml-1">
                      {item.tag}
                    </span>
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-500 line-clamp-1 italic font-normal">
                    &ldquo;{item.text}&rdquo;
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* =========================================================================
            COLUMN 2: LIVE CONVERSATION STREAM & DUAL-MODE VOICE INPUT BAR
        ========================================================================== */}
        <div className="lg:col-span-8 xl:col-span-6 space-y-3.5 sm:space-y-4">
          <div className="glass-card-luxury rounded-2xl sm:rounded-3xl flex flex-col h-[540px] sm:h-[600px] lg:h-[640px] overflow-hidden border border-slate-200 shadow-xl bg-white/95">
            {/* Header */}
            <div className="p-3 sm:p-4 border-b border-slate-100/90 flex items-center justify-between bg-gradient-to-r from-slate-50/90 via-indigo-50/30 to-purple-50/30">
              <div className="flex items-center gap-2.5 sm:gap-3">
                {/* Caller Avatar */}
                <div className="relative flex h-8 sm:h-10 w-8 sm:w-10 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30 shrink-0">
                  <Bot className="h-4 sm:h-5 w-4 sm:w-5" />
                  {voiceState === "speaking" && (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-2xl bg-indigo-400 opacity-60" />
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                      </span>
                    </>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate max-w-[160px] sm:max-w-none">
                      CallPilot AI Assistant
                    </h3>
                    <Badge
                      variant={
                        isCallEnded
                          ? "secondary"
                          : voiceState === "speaking"
                          ? "neon-emerald"
                          : voiceState === "listening"
                          ? "neon-rose"
                          : voiceState === "processing"
                          ? "neon-amber"
                          : isLiveCallActive
                          ? "neon-indigo"
                          : "secondary"
                      }
                      dot={isLiveCallActive && !isCallEnded}
                      className="text-[9px] sm:text-[10px] py-0.5 px-1.5 font-bold"
                    >
                      {isCallEnded
                        ? "✓ Call Ended"
                        : voiceState === "speaking"
                        ? "🔊 Agent Speaking"
                        : voiceState === "listening"
                        ? "🎙️ Listening to You"
                        : voiceState === "processing"
                        ? "⚡ Processing Turn"
                        : isLiveCallActive
                        ? "Live Hands-Free Active"
                        : "Ready"}
                    </Badge>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 flex items-center gap-1 sm:gap-1.5 mt-0.5">
                    <span>+1 (555) 349-8800</span>
                    <span>•</span>
                    <span className="font-mono text-slate-600 font-bold">{formatCallDuration(callDuration)}</span>
                    <span>•</span>
                    <span className="text-emerald-700 font-semibold font-mono">Continuous Mode</span>
                  </p>
                </div>
              </div>

              {/* Soundwave Audio Equalizer / Voice Control */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {voiceState === "speaking" && (
                  <button
                    onClick={handleInterruptSpeaking}
                    className="px-2 sm:px-2.5 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold hover:bg-rose-100 flex items-center gap-1 transition-all cursor-pointer shadow-2xs shrink-0"
                    title="Interrupt assistant audio"
                  >
                    <Square className="h-3 w-3" />
                    <span className="hidden sm:inline">Interrupt</span>
                  </button>
                )}

                {audioEnabled && (
                  <div className="flex items-center gap-1 h-7 sm:h-8 px-2 sm:px-3 rounded-xl sm:rounded-2xl bg-white/90 border border-indigo-200/80 shadow-2xs">
                    <div className={`w-1 bg-indigo-600 rounded-full transition-all duration-75 ${voiceState === "speaking" ? "animate-wave-1" : liveVolume > 10 ? "h-3 sm:h-4" : "h-1.5"}`} />
                    <div className={`w-1 bg-indigo-600 rounded-full transition-all duration-75 ${voiceState === "speaking" ? "animate-wave-2" : liveVolume > 20 ? "h-4 sm:h-6" : "h-2"}`} />
                    <div className={`w-1 bg-purple-600 rounded-full transition-all duration-75 ${voiceState === "speaking" ? "animate-wave-3" : liveVolume > 30 ? "h-5 sm:h-7" : "h-2.5"}`} />
                    <div className={`w-1 bg-purple-600 rounded-full transition-all duration-75 ${voiceState === "speaking" ? "animate-wave-4" : liveVolume > 20 ? "h-4 sm:h-5" : "h-2"}`} />
                    <div className={`w-1 bg-indigo-600 rounded-full transition-all duration-75 ${voiceState === "speaking" ? "animate-wave-5" : liveVolume > 15 ? "h-4 sm:h-6" : "h-2"}`} />
                    <span className="ml-1 text-[9px] sm:text-[10px] font-extrabold text-indigo-700 tracking-wide uppercase hidden sm:inline">
                      {voiceState === "speaking" ? "Speaking" : voiceState === "listening" ? "Listening" : "Voice Active"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Conversation Stream Message List */}
            <div
              ref={messagesContainerRef}
              className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3 sm:space-y-4 bg-slate-50/40 min-h-0"
            >
              {messages.map((msg) => {
                const isAssistant = msg.role === "assistant";
                const isCurrentlyPlaying = playingMessageId === msg.id || (voiceState === "speaking" && messages[messages.length - 1]?.id === msg.id && !playingMessageId);

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isAssistant ? "items-start" : "items-end"} transition-all`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {isAssistant ? (
                        <>
                          <Bot className="h-3 w-3 text-indigo-600" />
                          <span className="text-indigo-700 font-extrabold">CallPilot AI</span>
                        </>
                      ) : (
                        <>
                          <span>Caller</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{formatTime(msg.timestamp)}</span>
                    </div>

                    <div className="relative group max-w-[90%] sm:max-w-[85%]">
                      <div
                        className={`rounded-2xl sm:rounded-3xl px-3.5 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm leading-relaxed shadow-sm transition-all ${
                          isAssistant
                            ? "bg-white border border-indigo-100/90 text-slate-800 font-normal rounded-tl-sm"
                            : "bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 text-white font-medium rounded-tr-sm shadow-indigo-600/20"
                        }`}
                      >
                        {msg.content}
                      </div>

                      {/* Assistant Per-Message Voice Replay Button */}
                      {isAssistant && (
                        <div className="mt-1 flex items-center gap-2 pl-1">
                          <button
                            onClick={() => handleReplayMessage(msg)}
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                              isCurrentlyPlaying
                                ? "bg-indigo-600 text-white shadow-xs animate-pulse"
                                : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/70"
                            }`}
                            title="Listen to agent audio response"
                          >
                            {isCurrentlyPlaying ? (
                              <>
                                <Square className="h-2.5 w-2.5 fill-current" />
                                <span>Playing Audio...</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="h-3 w-3" />
                                <span>Listen Audio</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Tool Call Inline Badge if assistant executed tools */}
                    {isAssistant && msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5 pl-1">
                        {msg.toolCalls.map((t, idx) => (
                          <div
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg sm:rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[10px] sm:text-[11px] font-mono font-bold shadow-2xs"
                          >
                            <CalendarCheck className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-emerald-600 shrink-0" />
                            <span>{t.toolName}</span>
                            <span className="text-[9px] text-emerald-600 bg-emerald-100 px-1 py-0.5 rounded font-bold">
                              {t.executionTimeMs || 45}ms
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Real-Time Live Spoken Speech Bubble (Live User Transcript) */}
              {isLiveCallActive && liveSpokenText && (
                <div className="flex flex-col items-end animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>Caller (Speaking live...)</span>
                  </div>
                  <div className="rounded-2xl sm:rounded-3xl rounded-tr-sm bg-indigo-50 border border-indigo-300 px-4 py-2.5 text-xs sm:text-sm text-indigo-950 font-medium italic shadow-sm">
                    &ldquo;{liveSpokenText}&rdquo;
                  </div>
                </div>
              )}

              {/* Reasoning & Tool execution animation state */}
              {isLoading && (
                <div className="flex flex-col items-start animate-in fade-in duration-150">
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">
                    <Bot className="h-3 w-3 text-indigo-600" />
                    <span>CallPilot AI</span>
                  </div>
                  <div className="rounded-2xl sm:rounded-3xl rounded-tl-sm bg-white border border-indigo-100 px-3.5 sm:px-4 py-2.5 sm:py-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-indigo-600 animate-bounce" />
                      <div className="h-2 w-2 rounded-full bg-purple-600 animate-bounce [animation-delay:0.2s]" />
                      <div className="h-2 w-2 rounded-full bg-teal-500 animate-bounce [animation-delay:0.4s]" />
                      <span className="text-xs font-semibold text-slate-600 ml-1">
                        Reasoning, extracting entities & executing tools...
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Smart Contextual Suggestion Chips */}
            <div className="px-3 sm:px-4 py-2 border-t border-slate-100 bg-white flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-indigo-500" />
                <span>Quick:</span>
              </span>
              {getContextualChips().map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(chip)}
                  disabled={isLoading}
                  className="shrink-0 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg sm:rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* =========================================================================
                INPUT BAR: CONTINUOUS LIVE CALL HUD / MANUAL CHATGPT DICTATE
            ========================================================================== */}
            <div className="p-2.5 sm:p-3.5 border-t border-slate-200/80 bg-white/95 space-y-2">
              {isLiveCallActive && voiceModeType === "hands_free_call" ? (
                /* Hands-Free Live Call In-Progress Controller */
                <div className="flex flex-col gap-2 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                          voiceState === "speaking" ? "bg-purple-400" : "bg-emerald-400"
                        }`} />
                        <span className={`relative inline-flex rounded-full h-3 w-3 ${
                          voiceState === "speaking" ? "bg-purple-500" : "bg-emerald-500"
                        }`} />
                      </span>
                      <span className="font-extrabold text-xs text-white">
                        {voiceState === "speaking"
                          ? "Assistant Vocalizing Response..."
                          : voiceState === "listening"
                          ? "Microphone Active — Speak Freely"
                          : voiceState === "processing"
                          ? "Processing Turn..."
                          : "Hands-Free Voice Active"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleToggleMute}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          isMicMuted
                            ? "bg-amber-500 text-white"
                            : "bg-white/10 hover:bg-white/20 text-slate-200"
                        }`}
                      >
                        {isMicMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                        <span>{isMicMuted ? "Unmute" : "Mute"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleEndVoiceCall}
                        className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <PhoneOff className="h-3.5 w-3.5" />
                        <span>Hang Up</span>
                      </button>
                    </div>
                  </div>

                  <div className="text-[11px] text-indigo-200/90 flex items-center justify-between">
                    <span>
                      {isMicMuted
                        ? "Microphone is muted. Click 'Unmute' to speak."
                        : liveSpokenText
                        ? `Live Speech: "${liveSpokenText}"`
                        : "Continuous conversational mode is active. Speak into your mic whenever you want to reply."}
                    </span>
                    <span className="font-mono text-emerald-400 text-[10px] hidden sm:inline font-bold">
                      ✓ Auto VAD Active
                    </span>
                  </div>
                </div>
              ) : isRecording ? (
                /* Manual Dictate Recording State */
                <div className="flex flex-col gap-2 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 pl-1.5">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                      </span>
                      <span className="font-mono text-xs font-bold text-rose-300">
                        {formatCallDuration(recordingSeconds)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <button
                        type="button"
                        onClick={cancelRecording}
                        className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
                        title="Cancel recording"
                      >
                        <X className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={stopAndTranscribe}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-extrabold flex items-center gap-1 sm:gap-1.5 shadow-lg shadow-emerald-500/30 hover:scale-[1.02] transition-all cursor-pointer"
                        title="Finish speaking and edit text"
                      >
                        <Check className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                        <span>Done Speaking</span>
                      </button>
                    </div>
                  </div>

                  <div className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-xs font-medium text-indigo-100 min-h-[32px] flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      <span className="h-2 w-2 rounded-full bg-rose-400 animate-ping shrink-0" />
                      <span className="truncate">
                        {liveSpokenText ? `Hearing: "${liveSpokenText}"` : `Recording in ${selectedLanguage === "kn" ? "Kannada" : selectedLanguage === "hi" ? "Hindi" : "English"}... Speak your message.`}
                      </span>
                    </div>
                  </div>
                </div>
              ) : isTranscribing ? (
                /* Transcribing Loader State */
                <div className="flex items-center justify-center gap-2 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-bold animate-pulse">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                  <span>Processing speech ({selectedLanguage === "kn" ? "kn-IN" : selectedLanguage === "hi" ? "hi-IN" : "en-IN"})...</span>
                </div>
              ) : (
                /* Standard Input Form with Mic Button & Fast Typing */
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  {/* Microphone Voice Trigger */}
                  <button
                    type="button"
                    onClick={startDictateRecording}
                    disabled={isLoading || voiceState === "speaking"}
                    className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border transition-all cursor-pointer shrink-0 shadow-2xs group flex items-center gap-1.5 font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
                    title="Click to speak (Dictate Mode)"
                  >
                    <Mic className="h-4 w-4 text-white group-hover:scale-110 transition-transform" />
                    <span className="hidden sm:inline">Speak</span>
                  </button>

                  <div className="relative flex-1">
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder={
                        selectedLanguage === "kn"
                          ? "ಕರೆ ಮಾಡುವವರು ಏನು ಹೇಳುತ್ತಾರೆಂದು ಟೈಪ್ ಮಾಡಿ ಅಥವಾ 'Speak' ಕ್ಲಿಕ್ ಮಾಡಿ..."
                          : selectedLanguage === "hi"
                          ? "कॉल करने वाले की बात लिखें या 'Speak' पर क्लिक करें..."
                          : "Speak or type (e.g. 'Priya', 'Tomorrow at 3 PM')..."
                      }
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      disabled={isLoading}
                      className="w-full rounded-xl sm:rounded-2xl bg-slate-50/90 border border-slate-300/90 px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-600 transition-all font-medium"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">Enter ↵</span>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="md"
                    variant="glow"
                    disabled={isLoading || !inputText.trim()}
                    className="rounded-xl sm:rounded-2xl px-4 sm:px-5 shadow-md shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* =========================================================================
            COLUMN 3: LIVE TRIAGE, STRUCTURED ENTITIES & TOOL CONSOLE
        ========================================================================== */}
        <div className="lg:col-span-12 xl:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-1 gap-3.5 sm:gap-4">
            {/* Live Urgency & Triage Telemetry */}
            <div className="glass-card-luxury rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 space-y-2.5 sm:space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-indigo-600" />
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                    Live Triage
                  </span>
                </div>
                <Badge
                  variant={
                    urgency === "CRITICAL"
                      ? "neon-rose"
                      : urgency === "HIGH"
                      ? "neon-amber"
                      : "neon-emerald"
                  }
                  dot
                  className="text-[10px] sm:text-[11px]"
                >
                  {urgency}
                </Badge>
              </div>

              <div className="text-xs space-y-2 text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Detected Intent:</span>
                  <span className="font-bold text-slate-900 font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[120px]">
                    {currentIntent}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Workflow Complete:</span>
                  <span
                    className={`font-bold flex items-center gap-1 ${
                      isComplete ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    {isComplete ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Ready to Confirm</span>
                      </>
                    ) : (
                      <>
                        <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                        <span>Collecting ({capturedCount}/{totalCount})</span>
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Live Extracted Customer Data Table */}
            <div className="glass-card-luxury rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 space-y-2.5 sm:space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-indigo-600" />
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                    Extracted Entities
                  </span>
                </div>
                <button
                  onClick={handleCopyJson}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                >
                  {copiedJson ? "✓ Copied!" : "Copy JSON"}
                </button>
              </div>

              {Object.keys(extractedFields).length === 0 ? (
                <div className="py-4 sm:py-6 text-center text-xs text-slate-400 italic">
                  Entities will populate as caller speaks or types.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[140px] sm:max-h-[160px] overflow-y-auto">
                  {Object.entries(extractedFields).map(([key, val]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-1.5 sm:p-2 rounded-xl bg-slate-50/80 border border-slate-200 text-xs"
                    >
                      <span className="font-mono text-slate-500 text-[10px] sm:text-[11px] font-semibold truncate max-w-[100px]">{key}:</span>
                      <span className="font-bold text-slate-900 truncate max-w-[130px] text-right font-mono text-[10px] sm:text-[11px]">
                        {String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live Tool Execution & Telemetry Inspector */}
            <div className="glass-card-luxury rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 space-y-2.5 sm:space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <CalendarCheck className="h-3.5 w-3.5 text-indigo-600" />
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                    Tool Telemetry
                  </span>
                </div>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {toolCalls.length} Executed
                </Badge>
              </div>

              {toolCalls.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400 italic">
                  Tools trigger automatically upon intent recognition.
                </div>
              ) : (
                <div className="space-y-1.5 sm:space-y-2 max-h-[150px] sm:max-h-[180px] overflow-y-auto pr-1">
                  {toolCalls.map((tc, idx) => (
                    <div
                      key={idx}
                      className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-700 font-mono text-xs truncate">
                          {tc.toolName}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            tc.status === "success"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {tc.status}
                        </span>
                      </div>

                      <div className="text-[10px] font-mono text-slate-500 bg-slate-50 p-1.5 rounded-lg overflow-x-auto">
                        <div>In: {JSON.stringify(tc.input)}</div>
                        <div className="text-emerald-700 mt-0.5">Out: {JSON.stringify(tc.output)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
