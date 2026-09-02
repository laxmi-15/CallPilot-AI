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
} from "lucide-react";
import { storageRepo, AppState } from "@/lib/store/storage";
import { PREBUILT_TEMPLATES } from "@/lib/workflow/templates";
import { processConversationTurn } from "@/lib/ai/orchestrator";
import { Message, ToolCallRecord, UrgencyLevel, LanguageCode, Workflow, VoiceState } from "@/types";
import { Button, Badge, ProgressBar } from "@/components/ui";
import { generateId, formatTime } from "@/lib/utils";

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
  const [lastUpdatedField, setLastUpdatedField] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isCallEnded, setIsCallEnded] = useState(false);

  // =========================================================================
  // CHATGPT-STYLE VOICE DICTATION & REAL MULTILINGUAL ENGINE
  // =========================================================================
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceModeType, setVoiceModeType] = useState<"dictate" | "live_call">("dictate");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceProviderStatus, setVoiceProviderStatus] = useState<{ configured: boolean; provider: string } | null>(null);
  const [voiceCreditExhausted, setVoiceCreditExhausted] = useState(false);
  const [liveVolume, setLiveVolume] = useState<number>(0);
  const [voiceErrorMessage, setVoiceErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const isSpeakingRef = useRef<boolean>(false);

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
    if (!isCallEnded) {
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
  }, [isCallEnded]);

  // Clean up audio streams on unmount
  useEffect(() => {
    return () => {
      stopMicrophoneStream();
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
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
    setLastUpdatedField(null);
    setSavedSuccess(false);
    setCallDuration(0);
    setVoiceErrorMessage(null);
  }, [selectedIndustry, selectedLanguage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isTranscribing]);

  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // =========================================================================
  // CHATGPT-STYLE AUDIO CAPTURE & STREAMING VISUALIZER
  // =========================================================================
  const startRecording = async () => {
    try {
      setVoiceState("requesting_permission");
      setVoiceErrorMessage(null);
      setRecordingSeconds(0);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      audioStreamRef.current = stream;

      // Web Audio Analyser for real-time soundwave animation
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        if (analyserRef.current && !isSpeakingRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setLiveVolume(Math.min(100, Math.round((avg / 128) * 100)));
        }
        animFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      // Setup MediaRecorder
      const options = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? { mimeType: "audio/webm;codecs=opus" }
        : {};
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0 && !isSpeakingRef.current) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.start(250);
      setIsRecording(true);
      setVoiceState("listening");

      // Start recording timer
      recTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Microphone access error:", err);
      setVoiceState("error");
      setIsRecording(false);
      setVoiceErrorMessage(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Microphone permission was denied. Please allow microphone access in your browser."
          : "Could not access microphone. Text mode remains active."
      );
    }
  };

  const stopMicrophoneStream = () => {
    if (recTimerRef.current) {
      clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
      mediaRecorderRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsRecording(false);
    setLiveVolume(0);
  };

  // User clicks Done / Stop Recording: Transcribe via Sarvam Saaras v3
  const stopAndTranscribe = async () => {
    if (!isRecording) return;

    try {
      setIsTranscribing(true);
      setVoiceState("processing");

      // Capture final chunks
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.requestData();
      }

      // Small delay to collect final chunk
      await new Promise((r) => setTimeout(r, 150));

      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      stopMicrophoneStream();
      audioChunksRef.current = [];

      if (audioBlob.size === 0) {
        setIsTranscribing(false);
        setVoiceState("idle");
        return;
      }

      const formData = new FormData();
      formData.append("file", audioBlob, "speech.webm");
      formData.append("language", selectedLanguage);

      const sttRes = await fetch("/api/voice/stt", {
        method: "POST",
        body: formData,
      });

      if (sttRes.status === 402) {
        setVoiceCreditExhausted(true);
        setVoiceState("error");
        setVoiceErrorMessage("Voice credits are exhausted. Text mode is still available.");
        setIsTranscribing(false);
        return;
      }

      if (sttRes.ok) {
        const data = await sttRes.json();
        const transcript = data.transcript?.trim();

        if (transcript) {
          if (voiceModeType === "live_call") {
            // Auto-send in hands-free call mode
            await handleSendMessage(transcript);
          } else {
            // ChatGPT Style: Populate input text box for immediate user review and editing!
            setInputText((prev) => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript));
            setTimeout(() => {
              inputRef.current?.focus();
            }, 100);
          }
        }
      }
    } catch (err: any) {
      console.warn("STT processing error:", err);
    } finally {
      setIsTranscribing(false);
      setVoiceState("idle");
    }
  };

  // User cancels recording
  const cancelRecording = () => {
    stopMicrophoneStream();
    audioChunksRef.current = [];
    setIsTranscribing(false);
    setVoiceState("idle");
  };

  // Synthesize & Play AI Voice with Sarvam Bulbul v3 TTS
  const speakAIResponse = async (textToSpeak: string, responseId: string) => {
    if (!audioEnabled || voiceCreditExhausted) return;

    try {
      isSpeakingRef.current = true;
      setVoiceState("speaking");

      const ttsRes = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToSpeak,
          language: selectedLanguage,
          responseId,
          speaker: "shubh",
        }),
      });

      if (ttsRes.status === 402) {
        setVoiceCreditExhausted(true);
        setVoiceState("idle");
        isSpeakingRef.current = false;
        return;
      }

      if (ttsRes.ok) {
        const ttsData = await ttsRes.json();
        if (ttsData.audioBase64) {
          if (audioPlayerRef.current) {
            audioPlayerRef.current.pause();
          }

          const audio = new Audio(`data:audio/wav;base64,${ttsData.audioBase64}`);
          audioPlayerRef.current = audio;

          audio.onended = () => {
            isSpeakingRef.current = false;
            setVoiceState("idle");
          };

          audio.onerror = () => {
            isSpeakingRef.current = false;
            setVoiceState("idle");
          };

          await audio.play();
        } else {
          isSpeakingRef.current = false;
          setVoiceState("idle");
        }
      } else {
        isSpeakingRef.current = false;
        setVoiceState("idle");
      }
    } catch (err) {
      console.warn("TTS Playback note:", err);
      isSpeakingRef.current = false;
      setVoiceState("idle");
    }
  };

  // Interrupt / Stop speech playback
  const handleInterruptSpeaking = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    isSpeakingRef.current = false;
    setVoiceState("idle");
  };

  // =========================================================================
  // CORE CONVERSATION HANDLER
  // =========================================================================
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isLoading) return;

    setInputText("");
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

      if (isFarewell || (result.isComplete && Object.keys(result.updatedExtractedFields).length >= activeWorkflow.fields.filter((f) => f.required).length)) {
        if (isFarewell) {
          setIsCallEnded(true);
        }
      }

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

      // Trigger Sarvam Bulbul v3 TTS Audio Playback
      if (audioEnabled) {
        speakAIResponse(result.reply, responseId);
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
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
    setVoiceState("idle");
    setLastUpdatedField(null);
    setSavedSuccess(false);
    setCallDuration(0);
    setInputText("");
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
      summary: `Multilingual Voice & Text session for ${activeBiz.name}. Captured ${Object.keys(extractedFields).length}/${activeWorkflow.fields.length} fields: ${JSON.stringify(extractedFields)}.`,
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

  // 1-Click Test Prompts (English, Hindi, and Kannada)
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
    <div className="space-y-6 pb-16">
      {/* =========================================================================
          TOP COMMAND BAR & MULTILINGUAL VOICE STATUS
      ========================================================================== */}
      <div className="glass-panel-luxury rounded-3xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-200/90 shadow-lg">
        {/* Industry Selector */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200/60">
              Interactive AI Voice & Text Simulator
            </span>
            <span className="text-[10px] font-mono text-slate-400">₹0 Out-of-Pocket</span>
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
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

        {/* Right Action Controls: Language Toggle, Mode Toggle, Reset & CRM Sync */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Multilingual Selector: English, Hindi, Kannada */}
          <div className="flex items-center rounded-2xl bg-slate-100/90 p-1 border border-slate-200/80 shadow-inner text-xs">
            <button
              onClick={() => setSelectedLanguage("en")}
              className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
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
              className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
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
              className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                selectedLanguage === "kn"
                  ? "bg-white text-indigo-700 shadow-xs scale-[1.02]"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Kannada / ಕನ್ನಡ (kn-IN)"
            >
              🇮🇳 ಕನ್ನಡ
            </button>
          </div>

          {/* Voice Mode Selector: Dictate & Edit (ChatGPT Style) vs Live Phone Call */}
          <div className="flex items-center rounded-2xl bg-slate-100/90 p-1 border border-slate-200/80 shadow-inner text-xs">
            <button
              onClick={() => setVoiceModeType("dictate")}
              className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
                voiceModeType === "dictate"
                  ? "bg-indigo-600 text-white shadow-xs scale-[1.02]"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Speak -> Transcribe into text box -> Edit -> Send"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Dictate & Edit</span>
            </button>
            <button
              onClick={() => setVoiceModeType("live_call")}
              className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
                voiceModeType === "live_call"
                  ? "bg-indigo-600 text-white shadow-xs scale-[1.02]"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Hands-free continuous phone call simulation"
            >
              <PhoneCall className="h-3.5 w-3.5" />
              <span>Live Call</span>
            </button>
          </div>

          {/* Audio TTS Output Toggle */}
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`p-2 rounded-2xl border transition-all cursor-pointer ${
              audioEnabled
                ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                : "bg-slate-100 border-slate-200 text-slate-400"
            }`}
            title="Toggle Assistant Speech Output (Sarvam Bulbul v3)"
          >
            {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {/* Reset Session */}
          <Button
            size="sm"
            variant="secondary"
            onClick={handleReset}
            leftIcon={<RotateCcw className="h-3.5 w-3.5 text-slate-500" />}
            className="rounded-2xl"
          >
            Reset
          </Button>

          {/* Save to CRM Action */}
          <Button
            size="sm"
            variant="glow"
            onClick={handleSaveToDashboard}
            leftIcon={<Save className="h-3.5 w-3.5" />}
            className="rounded-2xl shadow-md"
          >
            {savedSuccess ? "✓ Logged to CRM!" : "Save"}
          </Button>
        </div>
      </div>

      {/* Credit Exhausted or Error Banner */}
      {voiceCreditExhausted && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between text-xs shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="font-semibold">
              Voice credits are exhausted. Text mode is still available with full Gemini AI reasoning & Google Calendar tools.
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
          3-COLUMN HIGH-PERFORMANCE COCKPIT GRID
      ========================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* =========================================================================
            COLUMN 1: BUSINESS CONTEXT, PROGRESS & TEST SCENARIOS (3 Cols)
        ========================================================================== */}
        <div className="lg:col-span-3 space-y-4">
          {/* Active Business Profile Card */}
          <div className="glass-card-luxury rounded-3xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
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

            <div className="text-xs space-y-2 text-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Company:</span>
                <span className="font-bold text-slate-900">{storageRepo.getActiveBusiness().name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Language:</span>
                <span className="font-bold text-indigo-700 font-mono text-[11px]">
                  {selectedLanguage === "kn" ? "🇮🇳 Kannada (kn-IN)" : selectedLanguage === "hi" ? "🇮🇳 Hindi (hi-IN)" : "🇬🇧 English (en-IN)"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Voice Mode:</span>
                <span className="font-bold text-slate-800 text-[11px]">
                  {voiceModeType === "dictate" ? "ChatGPT Dictate & Edit" : "Continuous Live Call"}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 bg-slate-50/80 p-2.5 rounded-2xl border border-slate-200/70 leading-relaxed font-normal">
                {activeWorkflow.description}
              </div>
            </div>
          </div>

          {/* Intake Completion & Fields Checklist Card */}
          <div className="glass-card-luxury rounded-3xl p-4 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                  Fields Checklist
                </span>
                <p className="text-[10px] text-slate-400">Never asks answered questions</p>
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
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
              {activeWorkflow.fields.map((field) => {
                const capturedValue = extractedFields[field.name];
                const isCollected = capturedValue !== undefined && capturedValue !== "" && capturedValue !== null;
                const isJustUpdated = lastUpdatedField === field.name;

                return (
                  <div
                    key={field.id}
                    className={`flex flex-col p-2 rounded-2xl text-xs transition-all duration-300 border ${
                      isCollected
                        ? "bg-emerald-50/90 border-emerald-200 text-emerald-950 shadow-2xs font-semibold"
                        : "bg-slate-50/70 border-slate-200/80 text-slate-500 font-normal"
                    } ${isJustUpdated ? "animate-field-pulse ring-2 ring-indigo-500 scale-[1.02]" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2 truncate">
                        {isCollected ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        ) : (
                          <div className="h-3.5 w-3.5 rounded-full border-2 border-slate-300 shrink-0" />
                        )}
                        <span className="truncate">{field.label}</span>
                      </div>
                      {field.required && !isCollected && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 font-bold shrink-0">
                          Req
                        </span>
                      )}
                    </div>

                    {isCollected && (
                      <div className="mt-1 pl-6 text-[11px] font-mono text-emerald-800 font-bold truncate">
                        ↳ &ldquo;{String(capturedValue)}&rdquo;
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 1-Click Realistic Test Scenarios */}
          <div className="glass-card-luxury rounded-3xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                <span>1-Click Scenarios</span>
              </div>
              <span className="text-[10px] text-slate-400">Simulate caller</span>
            </div>

            <div className="space-y-2">
              {(quickPrompts[selectedIndustry] || quickPrompts.cake_shop).map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(item.text)}
                  disabled={isLoading}
                  className="w-full text-left p-2.5 rounded-2xl bg-slate-50/80 hover:bg-indigo-50/80 border border-slate-200 hover:border-indigo-300 text-xs text-slate-800 font-medium transition-all duration-200 cursor-pointer group shadow-2xs hover:scale-[1.01]"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900 group-hover:text-indigo-700 text-xs truncate">
                      {item.label}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-500 font-bold shrink-0 ml-1">
                      {item.tag}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 line-clamp-1 italic font-normal">
                    &ldquo;{item.text}&rdquo;
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* =========================================================================
            COLUMN 2: LIVE VOICE STREAM & CHATGPT-STYLE INPUT (6 Cols)
        ========================================================================== */}
        <div className="lg:col-span-6 space-y-4">
          <div className="glass-card-luxury rounded-3xl flex flex-col h-[720px] overflow-hidden border border-slate-200 shadow-xl bg-white/95">
            {/* High-End Voice Call Header */}
            <div className="p-4 border-b border-slate-100/90 flex items-center justify-between bg-gradient-to-r from-slate-50/90 via-indigo-50/30 to-purple-50/30">
              <div className="flex items-center gap-3">
                {/* Caller Avatar with Live Pulse Rings */}
                <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30">
                  <PhoneCall className="h-5 w-5" />
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
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
                      Live Missed-Call Voice Assistant
                    </h3>
                    <Badge
                      variant={
                        isCallEnded
                          ? "secondary"
                          : voiceState === "speaking"
                          ? "neon-emerald"
                          : isRecording
                          ? "neon-rose"
                          : isTranscribing
                          ? "neon-amber"
                          : "neon-indigo"
                      }
                      dot={!isCallEnded}
                      className="text-[10px] py-0.5"
                    >
                      {isCallEnded
                        ? "✓ Call Ended"
                        : voiceState === "speaking"
                        ? "🔊 Speaking"
                        : isRecording
                        ? "🎙️ Recording Voice"
                        : isTranscribing
                        ? "⚡ Transcribing..."
                        : "Active Call"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <span>Caller: +1 (555) 349-8800</span>
                    <span>•</span>
                    <span className="font-mono text-slate-600 font-bold">{formatCallDuration(callDuration)}</span>
                  </p>
                </div>
              </div>

              {/* Soundwave Audio Equalizer / Voice Control */}
              <div className="flex items-center gap-2">
                {voiceState === "speaking" && (
                  <button
                    onClick={handleInterruptSpeaking}
                    className="px-2.5 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold hover:bg-rose-100 flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                    title="Interrupt assistant audio"
                  >
                    <Square className="h-3 w-3" />
                    <span>Interrupt</span>
                  </button>
                )}

                {audioEnabled && (
                  <div className="flex items-center gap-1 h-8 px-3 rounded-2xl bg-white/90 border border-indigo-200/80 shadow-2xs">
                    <div className={`w-1 bg-indigo-600 rounded-full transition-all duration-75 ${voiceState === "speaking" ? "animate-wave-1" : liveVolume > 10 ? "h-4" : "h-1.5"}`} />
                    <div className={`w-1 bg-indigo-600 rounded-full transition-all duration-75 ${voiceState === "speaking" ? "animate-wave-2" : liveVolume > 20 ? "h-6" : "h-2.5"}`} />
                    <div className={`w-1 bg-purple-600 rounded-full transition-all duration-75 ${voiceState === "speaking" ? "animate-wave-3" : liveVolume > 30 ? "h-7" : "h-3.5"}`} />
                    <div className={`w-1 bg-purple-600 rounded-full transition-all duration-75 ${voiceState === "speaking" ? "animate-wave-4" : liveVolume > 20 ? "h-5" : "h-2"}`} />
                    <div className={`w-1 bg-indigo-600 rounded-full transition-all duration-75 ${voiceState === "speaking" ? "animate-wave-5" : liveVolume > 15 ? "h-6" : "h-3"}`} />
                    <div className={`w-1 bg-indigo-600 rounded-full transition-all duration-75 ${voiceState === "speaking" ? "animate-wave-6" : liveVolume > 5 ? "h-3" : "h-1.5"}`} />
                    <span className="ml-1.5 text-[10px] font-extrabold text-indigo-700 tracking-wide uppercase">
                      {voiceState === "speaking" ? "Speaking" : isRecording ? "Listening" : "Voice On"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Conversation Stream Message List */}
            <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 bg-slate-50/40">
              {messages.map((msg) => {
                const isAssistant = msg.role === "assistant";
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

                    <div
                      className={`max-w-[88%] sm:max-w-[82%] rounded-3xl px-4 sm:px-5 py-3 text-xs sm:text-sm leading-relaxed shadow-sm transition-all ${
                        isAssistant
                          ? "bg-white border border-indigo-100/90 text-slate-800 font-normal rounded-tl-sm"
                          : "bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 text-white font-medium rounded-tr-sm shadow-indigo-600/20"
                      }`}
                    >
                      {msg.content}
                    </div>

                    {/* Tool Call Inline Badge if assistant executed tools */}
                    {isAssistant && msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5 pl-1">
                        {msg.toolCalls.map((t, idx) => (
                          <div
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-mono font-bold shadow-2xs"
                          >
                            <CalendarCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
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

              {/* Reasoning & Tool execution animation state */}
              {isLoading && (
                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">
                    <Bot className="h-3 w-3 text-indigo-600" />
                    <span>CallPilot AI</span>
                  </div>
                  <div className="rounded-3xl rounded-tl-sm bg-white border border-indigo-100 px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-indigo-600 animate-bounce" />
                      <div className="h-2 w-2 rounded-full bg-purple-600 animate-bounce [animation-delay:0.2s]" />
                      <div className="h-2 w-2 rounded-full bg-pink-500 animate-bounce [animation-delay:0.4s]" />
                      <span className="text-xs font-semibold text-slate-600 ml-1">
                        Extracting entities & checking Google Calendar availability...
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Smart Contextual Suggestion Chips */}
            <div className="px-4 py-2 border-t border-slate-100 bg-white flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-indigo-500" />
                <span>Quick Answers:</span>
              </span>
              {getContextualChips().map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(chip)}
                  disabled={isLoading}
                  className="shrink-0 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* =========================================================================
                CHATGPT-STYLE VOICE DICTATION & EDIT BAR
            ========================================================================== */}
            <div className="p-3.5 border-t border-slate-200/80 bg-white/90">
              {isRecording ? (
                /* Active Recording State (Waveform + Done / Cancel) */
                <div className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-xl animate-in fade-in duration-200">
                  <div className="flex items-center gap-2.5 pl-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
                    </span>
                    <span className="font-mono text-xs font-bold text-rose-300">
                      {formatCallDuration(recordingSeconds)}
                    </span>
                  </div>

                  {/* Dynamic Soundwave Visualizer Bars */}
                  <div className="flex items-center gap-1 h-6">
                    <div className={`w-1 bg-rose-400 rounded-full transition-all duration-75 ${liveVolume > 10 ? "h-5" : "h-1.5"}`} />
                    <div className={`w-1 bg-indigo-300 rounded-full transition-all duration-75 ${liveVolume > 20 ? "h-6" : "h-2.5"}`} />
                    <div className={`w-1 bg-purple-300 rounded-full transition-all duration-75 ${liveVolume > 30 ? "h-7" : "h-3.5"}`} />
                    <div className={`w-1 bg-rose-300 rounded-full transition-all duration-75 ${liveVolume > 20 ? "h-5" : "h-2"}`} />
                    <div className={`w-1 bg-indigo-400 rounded-full transition-all duration-75 ${liveVolume > 15 ? "h-6" : "h-3"}`} />
                    <div className={`w-1 bg-purple-400 rounded-full transition-all duration-75 ${liveVolume > 5 ? "h-3" : "h-1.5"}`} />
                  </div>

                  <span className="text-xs text-slate-300 font-medium hidden sm:inline">
                    Listening in {selectedLanguage === "kn" ? "Kannada" : selectedLanguage === "hi" ? "Hindi" : "English"}...
                  </span>

                  <div className="flex items-center gap-2">
                    {/* Cancel Recording */}
                    <button
                      type="button"
                      onClick={cancelRecording}
                      className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
                      title="Cancel recording"
                    >
                      <X className="h-4 w-4" />
                    </button>

                    {/* Done / Transcribe Button */}
                    <button
                      type="button"
                      onClick={stopAndTranscribe}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-lg shadow-emerald-500/30 hover:scale-[1.02] transition-all cursor-pointer"
                      title="Transcribe and edit message"
                    >
                      <Check className="h-4 w-4" />
                      <span>Done</span>
                    </button>
                  </div>
                </div>
              ) : isTranscribing ? (
                /* Transcribing Loader State */
                <div className="flex items-center justify-center gap-2.5 p-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-bold animate-pulse">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                  <span>Transcribing speech with Sarvam Saaras v3 ({selectedLanguage === "kn" ? "kn-IN" : selectedLanguage === "hi" ? "hi-IN" : "en-IN"})...</span>
                </div>
              ) : (
                /* Standard ChatGPT Input Form with Dedicated Mic Button */
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  {/* ChatGPT Microphone Dictation Trigger */}
                  <button
                    type="button"
                    onClick={startRecording}
                    disabled={isLoading || voiceState === "speaking"}
                    className="p-3 rounded-2xl bg-slate-100 hover:bg-indigo-50 border border-slate-300/80 hover:border-indigo-400 text-slate-700 hover:text-indigo-600 transition-all cursor-pointer shrink-0 shadow-2xs group"
                    title="Click to speak (ChatGPT Voice Dictation)"
                  >
                    <Mic className="h-4 w-4 text-indigo-600 group-hover:scale-110 transition-transform" />
                  </button>

                  <div className="relative flex-1">
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder={
                        selectedLanguage === "kn"
                          ? "ಕರೆ ಮಾಡುವವರು ಏನು ಹೇಳುತ್ತಾರೆಂದು ಟೈಪ್ ಮಾಡಿ ಅಥವಾ ಮೈಕ್ ಕ್ಲಿಕ್ ಮಾಡಿ..."
                          : selectedLanguage === "hi"
                          ? "कॉल करने वाले की बात लिखें या माइक से बोलें..."
                          : "Type or click Mic to speak (e.g. 'Anusha', 'Dr. Sharma tomorrow 3 PM')..."
                      }
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      disabled={isLoading}
                      className="w-full rounded-2xl bg-slate-50/90 border border-slate-300/90 px-4 py-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-600 transition-all font-medium"
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
                    className="rounded-2xl px-5 shadow-md shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* =========================================================================
            COLUMN 3: LIVE TRIAGE, STRUCTURED ENTITIES & TOOL CONSOLE (3 Cols)
        ========================================================================== */}
        <div className="lg:col-span-3 space-y-4">
          {/* Live Urgency & Triage Telemetry */}
          <div className="glass-card-luxury rounded-3xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
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
                className="text-[11px]"
              >
                {urgency}
              </Badge>
            </div>

            <div className="text-xs space-y-2.5 text-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Detected Intent:</span>
                <span className="font-bold text-slate-900 font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded-md">
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
          <div className="glass-card-luxury rounded-3xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
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
              <div className="py-6 text-center text-xs text-slate-400 italic">
                Entities will populate in real time as the caller speaks or types.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                {Object.entries(extractedFields).map(([key, val]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 border border-slate-200 text-xs"
                  >
                    <span className="font-mono text-slate-500 text-[11px] font-semibold">{key}:</span>
                    <span className="font-bold text-slate-900 truncate max-w-[140px] text-right font-mono text-[11px]">
                      {String(val)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live Tool Execution & Telemetry Inspector */}
          <div className="glass-card-luxury rounded-3xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
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
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                {toolCalls.map((tc, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1"
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
  );
}
