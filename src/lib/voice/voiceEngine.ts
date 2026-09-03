/**
 * CallPilot AI - Voice-First Client Audio & Telephony Sound Engine
 * Dual-Engine Speech Synthesis:
 *  1. Primary: Sarvam Bulbul v3 (Indian English, Hindi, Kannada)
 *  2. Fallback: Web Speech API (window.speechSynthesis)
 * Telephony Audio FX: Web Audio API synthesized phone ring, connect chime, end call, and mute.
 */

export type VoiceLanguage = "en" | "hi" | "kn" | "hinglish";
export type VoiceSpeaker = "shubh" | "meera";

export interface SpeakOptions {
  text: string;
  language?: VoiceLanguage;
  speaker?: VoiceSpeaker;
  speed?: number; // 0.8 to 1.5
  volume?: number; // 0.0 to 1.0
  responseId?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

class VoiceEngine {
  private isUnlocked = false;
  private audioContext: AudioContext | null = null;
  private currentAudioElement: HTMLAudioElement | null = null;
  private isSpeaking = false;
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private ttsCache = new Map<string, string>(); // text -> base64

  constructor() {
    if (typeof window !== "undefined") {
      const unlockEvents = ["click", "touchstart", "keydown", "mousedown"];
      const unlockHandler = () => {
        this.unlockAudio();
        unlockEvents.forEach((ev) => window.removeEventListener(ev, unlockHandler));
      };
      unlockEvents.forEach((ev) => window.addEventListener(ev, unlockHandler, { once: true, passive: true }));
    }
  }

  /**
   * Unlock Web Audio API and AudioElement on first user interaction.
   */
  public async unlockAudio(): Promise<boolean> {
    if (this.isUnlocked && this.audioContext && this.audioContext.state === "running") {
      return true;
    }

    try {
      if (typeof window === "undefined") return false;

      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioContext && AudioCtxClass) {
        this.audioContext = new AudioCtxClass();
      }

      if (this.audioContext && this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      if (this.audioContext) {
        const buffer = this.audioContext.createBuffer(1, 1, 22050);
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);
        source.start(0);
      }

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.getVoices();
      }

      this.isUnlocked = true;
      return true;
    } catch (e) {
      console.warn("Audio unlock notice:", e);
      return false;
    }
  }

  public getAudioContext(): AudioContext | null {
    if (!this.audioContext && typeof window !== "undefined") {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioContext = new AudioCtxClass();
      }
    }
    return this.audioContext;
  }

  // =========================================================================
  // TELEPHONY SOUND EFFECTS
  // =========================================================================

  public async playRingTone(durationSeconds = 1.6): Promise<void> {
    await this.unlockAudio();
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(440, now);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(480, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.05);
      gain.gain.setValueAtTime(0.18, now + durationSeconds - 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + durationSeconds);
      osc2.stop(now + durationSeconds);
    } catch (e) {
      console.warn("Ring tone playback note:", e);
    }
  }

  public async playConnectChime(): Promise<void> {
    await this.unlockAudio();
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.12);
      osc.frequency.setValueAtTime(783.99, now + 0.24);
      osc.frequency.setValueAtTime(1046.50, now + 0.36);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.2, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.6);
    } catch (e) {
      console.warn("Connect chime playback note:", e);
    }
  }

  public async playHangupTone(): Promise<void> {
    await this.unlockAudio();
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.setValueAtTime(400, now + 0.15);
      osc.frequency.setValueAtTime(320, now + 0.3);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch (e) {
      console.warn("Hangup tone playback note:", e);
    }
  }

  public async playMuteChime(isMuted: boolean): Promise<void> {
    await this.unlockAudio();
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      if (isMuted) {
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.setValueAtTime(300, now + 0.08);
      } else {
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.setValueAtTime(600, now + 0.08);
      }

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch (e) {}
  }

  // =========================================================================
  // DUAL-ENGINE SPEECH SYNTHESIS
  // =========================================================================

  public async speak(options: SpeakOptions): Promise<void> {
    const {
      text,
      language = "en",
      speaker = "shubh",
      speed = 1.0,
      volume = 1.0,
      responseId,
      onStart,
      onEnd,
      onError,
    } = options;

    if (!text || text.trim() === "") {
      onEnd?.();
      return;
    }

    this.stopSpeaking();
    await this.unlockAudio();

    this.isSpeaking = true;
    onStart?.();

    // 1. Primary: Sarvam Bulbul v3
    try {
      const cacheKey = `${language}:${speaker}:${text.trim()}`;
      let audioBase64: string | undefined = this.ttsCache.get(cacheKey);

      if (!audioBase64) {
        const res = await fetch("/api/voice/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            language,
            speaker,
            responseId,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && typeof data.audioBase64 === "string") {
            const returnedBase64: string = data.audioBase64;
            audioBase64 = returnedBase64;
            this.ttsCache.set(cacheKey, returnedBase64);
          }
        }
      }

      if (audioBase64) {
        await this.playBase64Audio(audioBase64, speed, volume, () => {
          this.isSpeaking = false;
          onEnd?.();
        });
        return;
      }
    } catch (sarvamErr) {
      console.warn("Sarvam TTS request notice, engaging browser speech fallback:", sarvamErr);
    }

    // 2. Fallback: Browser Web Speech API
    try {
      this.speakViaBrowser(text, language, speed, volume, () => {
        this.isSpeaking = false;
        onEnd?.();
      }, (err) => {
        this.isSpeaking = false;
        onError?.(err);
        onEnd?.();
      });
    } catch (fallbackErr) {
      console.error("Browser speech synthesis error:", fallbackErr);
      this.isSpeaking = false;
      onError?.(fallbackErr);
      onEnd?.();
    }
  }

  private async playBase64Audio(
    base64Data: string,
    speed = 1.0,
    volume = 1.0,
    onFinish: () => void
  ): Promise<void> {
    return new Promise((resolve) => {
      try {
        const audioSrc = base64Data.startsWith("data:")
          ? base64Data
          : `data:audio/wav;base64,${base64Data}`;

        const audio = new Audio(audioSrc);
        this.currentAudioElement = audio;
        audio.playbackRate = Math.max(0.75, Math.min(2.0, speed));
        audio.volume = Math.max(0, Math.min(1.0, volume));

        const cleanup = () => {
          if (this.currentAudioElement === audio) {
            this.currentAudioElement = null;
          }
          onFinish();
          resolve();
        };

        audio.onended = cleanup;
        audio.onerror = (e) => {
          console.warn("Audio element playback error, falling back to speech synthesis:", e);
          cleanup();
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((playErr) => {
            console.warn("Audio play rejected by browser autoplay policy:", playErr);
            cleanup();
          });
        }
      } catch (err) {
        console.warn("playBase64Audio exception:", err);
        onFinish();
        resolve();
      }
    });
  }

  private speakViaBrowser(
    text: string,
    language: VoiceLanguage,
    speed = 1.0,
    volume = 1.0,
    onFinish: () => void,
    onError?: (err: any) => void
  ): void {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      onFinish();
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      this.activeUtterance = utterance;
      utterance.rate = Math.max(0.8, Math.min(1.4, speed));
      utterance.volume = Math.max(0, Math.min(1.0, volume));
      utterance.pitch = 1.0;

      let targetLocale = "en-IN";
      if (language === "kn") targetLocale = "kn-IN";
      else if (language === "hi" || language === "hinglish") targetLocale = "hi-IN";
      else targetLocale = "en-IN";

      utterance.lang = targetLocale;

      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const matchingVoice =
          voices.find((v) => (v.lang || "").toLowerCase() === targetLocale.toLowerCase()) ||
          voices.find((v) => (v.lang || "").toLowerCase().startsWith(targetLocale.slice(0, 2).toLowerCase())) ||
          voices.find((v) => (v.lang || "").includes("en-IN") || (v.name || "").includes("India")) ||
          voices.find((v) => (v.lang || "").startsWith("en"));

        if (matchingVoice) {
          utterance.voice = matchingVoice;
        }
      }

      utterance.onend = () => {
        this.activeUtterance = null;
        onFinish();
      };

      utterance.onerror = (e) => {
        this.activeUtterance = null;
        onError?.(e);
        onFinish();
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("SpeechSynthesis error:", e);
      onFinish();
    }
  }

  public stopSpeaking(): void {
    this.isSpeaking = false;

    if (this.currentAudioElement) {
      try {
        this.currentAudioElement.pause();
        this.currentAudioElement.currentTime = 0;
      } catch (e) {}
      this.currentAudioElement = null;
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    this.activeUtterance = null;
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  public async testAudio(): Promise<void> {
    await this.playConnectChime();
    setTimeout(() => {
      this.speak({
        text: "CallPilot AI Voice Engine is active and ready.",
        language: "en",
        speaker: "shubh",
      });
    }, 400);
  }
}

export const voiceEngine = new VoiceEngine();
