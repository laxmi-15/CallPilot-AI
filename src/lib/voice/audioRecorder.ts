/**
 * CallPilot AI - Robust Multilingual Audio Recorder & Live Speech-to-Text
 * Dual-Mode Transcription:
 * 1. Real-time Live Web Speech Recognition (instant on-screen live words as you speak)
 * 2. 16kHz PCM WAV Encoder -> Sarvam Saaras v3 STT (/api/voice/stt)
 */

export interface RecordingSession {
  stop: () => Promise<{ transcript: string; wavBlob: Blob | null }>;
  cancel: () => void;
}

export interface StartRecordingOptions {
  language: "en" | "hi" | "kn" | "hinglish";
  onLiveTranscript?: (text: string, isFinal: boolean) => void;
  onVolumeChange?: (volume: number) => void;
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
 * Resample Float32Array audio buffer to target sample rate (16000Hz)
 */
function resampleTo16k(audioBuffer: AudioBuffer): Float32Array {
  const sourceRate = audioBuffer.sampleRate;
  const targetRate = 16000;
  const channelData = audioBuffer.getChannelData(0);

  if (sourceRate === targetRate) {
    return channelData;
  }

  const ratio = sourceRate / targetRate;
  const newLength = Math.round(channelData.length / ratio);
  const result = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const origIndex = i * ratio;
    const indexFloor = Math.floor(origIndex);
    const indexCeil = Math.min(channelData.length - 1, indexFloor + 1);
    const fraction = origIndex - indexFloor;
    result[i] = channelData[indexFloor] * (1 - fraction) + channelData[indexCeil] * fraction;
  }

  return result;
}

/**
 * Start high-accuracy audio capture with live browser speech recognition and Sarvam PCM WAV backup.
 */
export async function startAudioCapture(options: StartRecordingOptions): Promise<RecordingSession> {
  const { language, onLiveTranscript, onVolumeChange, onError } = options;

  let stream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let mediaRecorder: MediaRecorder | null = null;
  let recognition: any = null;
  let liveTranscript = "";
  let pcmChunks: Float32Array[] = [];
  let scriptProcessor: ScriptProcessorNode | null = null;
  let animFrameId: number | null = null;

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

    // 1. Live Volume Visualizer Analyser
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const updateVolume = () => {
      if (analyser && onVolumeChange) {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        onVolumeChange(Math.min(100, Math.round((avg / 128) * 100)));
      }
      animFrameId = requestAnimationFrame(updateVolume);
    };
    updateVolume();

    // 2. Capture raw PCM samples via ScriptProcessor for 100% compliant 16kHz WAV
    scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
    scriptProcessor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      pcmChunks.push(new Float32Array(inputData));
    };
    source.connect(scriptProcessor);
    scriptProcessor.connect(audioContext.destination);

    // 3. Initialize Live Web Speech Recognition (Real-time live streaming text)
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionClass) {
      try {
        recognition = new SpeechRecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = true;

        let targetLang = "en-IN";
        if (language === "kn") targetLang = "kn-IN";
        else if (language === "hi" || language === "hinglish") targetLang = "hi-IN";
        else targetLang = "en-IN";

        recognition.lang = targetLang;

        recognition.onresult = (event: any) => {
          let interimStr = "";
          let finalStr = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalStr += event.results[i][0].transcript;
            } else {
              interimStr += event.results[i][0].transcript;
            }
          }

          const currentText = (finalStr || interimStr).trim();
          if (currentText) {
            liveTranscript = currentText;
            onLiveTranscript?.(currentText, Boolean(finalStr));
          }
        };

        recognition.onerror = (event: any) => {
          console.warn("Live recognition note:", event.error);
        };

        recognition.start();
      } catch (recErr) {
        console.warn("Web SpeechRecognition init note:", recErr);
      }
    }
  } catch (err: any) {
    console.error("Audio capture start error:", err);
    onError?.(
      err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
        ? "Microphone permission denied. Please allow microphone access."
        : "Failed to access microphone."
    );
    throw err;
  }

  const cleanup = () => {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    if (recognition) {
      try {
        recognition.stop();
      } catch (e) {}
    }
    if (scriptProcessor) {
      try {
        scriptProcessor.disconnect();
      } catch (e) {}
    }
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    if (audioContext && audioContext.state !== "closed") {
      try {
        audioContext.close();
      } catch (e) {}
    }
  };

  return {
    cancel: cleanup,
    stop: async () => {
      // Collect all PCM samples
      cleanup();

      // Total samples
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
      const sourceRate = 44100; // standard default AudioContext rate
      const ratio = sourceRate / targetRate;
      const resampledLength = Math.round(mergedSamples.length / ratio);
      const resampledSamples = new Float32Array(resampledLength);
      for (let i = 0; i < resampledLength; i++) {
        const origIdx = Math.round(i * ratio);
        resampledSamples[i] = mergedSamples[origIdx] || 0;
      }

      const wavBlob = encodePcmWav(resampledSamples, 16000);

      // If we already got live speech recognition transcript, return it immediately!
      if (liveTranscript.trim().length > 0) {
        return {
          transcript: liveTranscript.trim(),
          wavBlob,
        };
      }

      // Otherwise, query Sarvam Saaras v3 STT with the 100% compliant WAV Blob
      try {
        const formData = new FormData();
        formData.append("file", wavBlob, "speech.wav");
        formData.append("language", language);

        const res = await fetch("/api/voice/stt", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.transcript && data.transcript.trim()) {
            return {
              transcript: data.transcript.trim(),
              wavBlob,
            };
          }
        }
      } catch (sarvamErr) {
        console.warn("Sarvam Saaras STT backup call note:", sarvamErr);
      }

      return {
        transcript: liveTranscript.trim(),
        wavBlob,
      };
    },
  };
}
