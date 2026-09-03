/**
 * CallPilot AI - Robust Multilingual Audio Recorder & Hands-Free Continuous Voice Engine
 * Features:
 * 1. Continuous Live Hands-Free Conversational Voice Loop (Zero button clicks during calls)
 * 2. Voice Activity Detection (VAD) & Automatic Silence Turn-Ending (auto-commits speech)
 * 3. Echo & Noise Isolation: Prevents ambient noise or speaker playback from interrupting AI speech
 * 4. Dual STT: Real-time Web Speech Streaming + 16kHz PCM WAV Sarvam Saaras v3
 * 5. Warm mic state management: instant turn reset without microphone reconnect delays
 */

export interface RecordingSession {
  stop: () => Promise<{ transcript: string; wavBlob: Blob | null }>;
  cancel: () => void;
  resetTurn: () => void;
  pause: () => void;
  resume: () => void;
  isPaused: () => boolean;
  getLiveTranscript: () => string;
  setMuted: (muted: boolean) => void;
}

export interface StartRecordingOptions {
  language: "en" | "hi" | "kn" | "hinglish";
  continuous?: boolean;
  silenceTimeoutMs?: number;
  onLiveTranscript?: (text: string, isFinal: boolean) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: (transcript: string) => void;
  onVolumeChange?: (volume: number) => void;
  onBargeIn?: () => void;
  onError?: (error: string) => void;
}

/**
 * Encodes Float32Array PCM audio samples into a standard 16-bit mono 16kHz WAV Blob.
 */
export function encodePcmWav(samples: Float32Array, sampleRate = 16000): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, "RIFF");
  // file length
  view.setUint32(4, 36 + samples.length * 2, true);
  // RIFF type
  writeString(view, 8, "WAVE");
  // format chunk identifier
  writeString(view, 12, "fmt ");
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (1 = raw PCM)
  view.setUint16(20, 1, true);
  // channel count (1 = mono)
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, "data");
  // data chunk length
  view.setUint32(40, samples.length * 2, true);

  // Write 16-bit PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Start high-accuracy audio capture with live browser speech recognition,
 * continuous hands-free silence detection (VAD), and Sarvam PCM WAV backup.
 */
export async function startAudioCapture(options: StartRecordingOptions): Promise<RecordingSession> {
  const {
    language,
    continuous = false,
    silenceTimeoutMs = 1700,
    onLiveTranscript,
    onSpeechStart,
    onSpeechEnd,
    onVolumeChange,
    onError,
  } = options;

  let stream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let recognition: any = null;
  let isMuted = false;
  let isPaused = false;
  let isSessionActive = true;
  let hasSpokenThisTurn = false;
  let liveTranscript = "";
  let pcmChunks: Float32Array[] = [];
  let scriptProcessor: ScriptProcessorNode | null = null;
  let animFrameId: number | null = null;
  let silenceTimer: NodeJS.Timeout | null = null;

  const targetLang =
    language === "kn"
      ? "kn-IN"
      : language === "hi" || language === "hinglish"
      ? "hi-IN"
      : "en-IN";

  const clearSilenceTimer = () => {
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      silenceTimer = null;
    }
  };

  const scheduleSilenceCheck = (delayMs = silenceTimeoutMs) => {
    if (!continuous || !isSessionActive || isPaused || isMuted) return;

    clearSilenceTimer();
    silenceTimer = setTimeout(() => {
      if (!isSessionActive || isPaused || isMuted) return;

      const currentText = liveTranscript.trim();
      // Ensure there is meaningful speech (more than 1 character)
      if (currentText.length >= 2 && hasSpokenThisTurn) {
        console.log("[VAD] User finished speaking, committing turn:", currentText);
        const transcriptToCommit = currentText;
        liveTranscript = "";
        hasSpokenThisTurn = false;
        onSpeechEnd?.(transcriptToCommit);
      }
    }, delayMs);
  };

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    audioContext = new AudioCtxClass();
    const source = audioContext.createMediaStreamSource(stream);

    // 1. Live Volume Visualizer & Voice Activity Analyser
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.4;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let consecutiveVoiceFrames = 0;

    const updateVolume = () => {
      if (!isSessionActive) return;

      if (analyser && !isMuted) {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        const volumeScore = Math.min(100, Math.round((avg / 128) * 100));

        if (!isPaused) {
          onVolumeChange?.(volumeScore);

          // Audio energy threshold check for speech activity (filtered against ambient room hum)
          if (volumeScore > 14) {
            consecutiveVoiceFrames++;
            if (consecutiveVoiceFrames >= 3) {
              if (!hasSpokenThisTurn && liveTranscript.length > 0) {
                hasSpokenThisTurn = true;
                onSpeechStart?.();
              }
              clearSilenceTimer();
            }
          } else {
            consecutiveVoiceFrames = 0;
            if (hasSpokenThisTurn && liveTranscript.trim().length >= 2 && !silenceTimer) {
              scheduleSilenceCheck(silenceTimeoutMs);
            }
          }
        } else {
          // While paused (AI speaking), zero out volume display and do not trigger auto-interrupts
          onVolumeChange?.(0);
        }
      } else {
        onVolumeChange?.(0);
      }

      animFrameId = requestAnimationFrame(updateVolume);
    };
    updateVolume();

    // 2. Capture raw PCM samples via ScriptProcessor for 16kHz WAV
    scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
    scriptProcessor.onaudioprocess = (e) => {
      if (!isSessionActive || isPaused || isMuted) return;
      const inputData = e.inputBuffer.getChannelData(0);
      pcmChunks.push(new Float32Array(inputData));
    };
    source.connect(scriptProcessor);
    scriptProcessor.connect(audioContext.destination);

    // 3. Initialize Live Web Speech Recognition
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    const initSpeechRecognition = () => {
      if (!SpeechRecognitionClass || !isSessionActive) return;

      try {
        if (recognition) {
          try {
            recognition.abort();
          } catch (e) {}
        }

        recognition = new SpeechRecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = targetLang;

        recognition.onstart = () => {
          console.log("[STT] Web Speech Recognition started for lang:", targetLang);
        };

        recognition.onresult = (event: any) => {
          // STRICTLY IGNORE speech recognition events while AI is vocalizing or microphone is paused/muted
          if (!isSessionActive || isPaused || isMuted) {
            return;
          }

          let interimStr = "";
          let finalStr = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalStr += event.results[i][0].transcript;
            } else {
              interimStr += event.results[i][0].transcript;
            }
          }

          const combined = (finalStr || interimStr).trim();
          if (combined && !isPaused && !isMuted) {
            liveTranscript = combined;

            if (!hasSpokenThisTurn) {
              hasSpokenThisTurn = true;
              onSpeechStart?.();
            }

            onLiveTranscript?.(combined, Boolean(finalStr));

            // Reset silence timeout on new spoken words
            if (continuous) {
              const delay = Boolean(finalStr) ? Math.min(1200, silenceTimeoutMs) : silenceTimeoutMs;
              scheduleSilenceCheck(delay);
            }
          }
        };

        recognition.onerror = (event: any) => {
          if (event.error === "no-speech") {
            return;
          }
          console.warn("[STT] Live recognition error:", event.error);
        };

        recognition.onend = () => {
          if (isSessionActive && !isPaused && continuous) {
            try {
              recognition.start();
            } catch (e) {}
          }
        };

        recognition.start();
      } catch (recErr) {
        console.warn("SpeechRecognition initialization note:", recErr);
      }
    };

    initSpeechRecognition();
  } catch (err: any) {
    console.error("Audio capture start error:", err);
    onError?.(
      err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
        ? "Microphone permission denied. Please allow microphone access in your browser."
        : "Failed to access microphone audio stream."
    );
    throw err;
  }

  const cleanup = () => {
    isSessionActive = false;
    clearSilenceTimer();

    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }

    if (recognition) {
      try {
        recognition.stop();
      } catch (e) {}
      recognition = null;
    }

    if (scriptProcessor) {
      try {
        scriptProcessor.disconnect();
      } catch (e) {}
      scriptProcessor = null;
    }

    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }

    if (audioContext && audioContext.state !== "closed") {
      try {
        audioContext.close();
      } catch (e) {}
      audioContext = null;
    }
  };

  return {
    cancel: cleanup,

    getLiveTranscript: () => liveTranscript,

    isPaused: () => isPaused,

    pause: () => {
      isPaused = true;
      liveTranscript = "";
      hasSpokenThisTurn = false;
      clearSilenceTimer();
      if (recognition) {
        try {
          recognition.stop();
        } catch (e) {}
      }
    },

    resume: () => {
      isPaused = false;
      liveTranscript = "";
      hasSpokenThisTurn = false;
      pcmChunks = [];
      clearSilenceTimer();
      if (recognition && isSessionActive) {
        try {
          recognition.start();
        } catch (e) {}
      }
    },

    resetTurn: () => {
      liveTranscript = "";
      hasSpokenThisTurn = false;
      pcmChunks = [];
      clearSilenceTimer();
    },

    setMuted: (muted: boolean) => {
      isMuted = muted;
      if (muted) {
        clearSilenceTimer();
        onVolumeChange?.(0);
      }
    },

    stop: async () => {
      cleanup();

      // Merge PCM chunks
      let totalLength = 0;
      for (const chunk of pcmChunks) totalLength += chunk.length;
      const mergedSamples = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of pcmChunks) {
        mergedSamples.set(chunk, offset);
        offset += chunk.length;
      }

      // Resample to 16kHz
      const targetRate = 16000;
      const sourceRate = 44100;
      const ratio = sourceRate / targetRate;
      const resampledLength = Math.round(mergedSamples.length / ratio);
      const resampledSamples = new Float32Array(resampledLength);
      for (let i = 0; i < resampledLength; i++) {
        const origIdx = Math.round(i * ratio);
        resampledSamples[i] = mergedSamples[origIdx] || 0;
      }

      const wavBlob = encodePcmWav(resampledSamples, 16000);

      // Post-speech transcription via Sarvam Saaras v3 STT
      try {
        if (wavBlob && wavBlob.size > 2000) {
          const formData = new FormData();
          formData.append("file", wavBlob, "speech.wav");
          formData.append("language", language);

          const res = await fetch("/api/voice/stt", {
            method: "POST",
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            if (data.transcript && data.transcript.trim().length > 0) {
              return {
                transcript: data.transcript.trim(),
                wavBlob,
              };
            }
          }
        }
      } catch (sarvamErr) {
        console.warn("Sarvam Saaras STT call note:", sarvamErr);
      }

      return {
        transcript: liveTranscript.trim(),
        wavBlob,
      };
    },
  };
}
