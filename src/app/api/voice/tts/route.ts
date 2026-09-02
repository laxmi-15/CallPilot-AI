import { NextRequest, NextResponse } from "next/server";

// In-memory cache to prevent duplicate TTS requests and conserve API credits
const ttsCache = new Map<string, { audioBase64: string; format: string; timestamp: number }>();

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.SARVAM_API_KEY;
    const body = await req.json();
    const { text, language, responseId, speaker } = body;

    if (!text || text.trim() === "") {
      return NextResponse.json({ success: false, error: "Text is required" }, { status: 400 });
    }

    let targetLanguageCode = "en-IN";
    if (language === "kn" || language === "kn-IN") {
      targetLanguageCode = "kn-IN";
    } else if (language === "hi" || language === "hi-IN" || language === "hinglish") {
      targetLanguageCode = "hi-IN";
    } else {
      // Also check if text has Kannada or Devanagari characters
      if (/[\u0C80-\u0CFF]/.test(text)) targetLanguageCode = "kn-IN";
      else if (/[\u0900-\u097F]/.test(text)) targetLanguageCode = "hi-IN";
      else targetLanguageCode = "en-IN";
    }

    // Deduplication check
    const cacheKey = responseId || `${targetLanguageCode}:${text.trim()}`;
    if (ttsCache.has(cacheKey)) {
      const cached = ttsCache.get(cacheKey)!;
      return NextResponse.json({
        success: true,
        audioBase64: cached.audioBase64,
        format: cached.format,
        languageCode: targetLanguageCode,
        model: "bulbul:v3",
        cached: true,
      });
    }

    if (!apiKey || apiKey.trim() === "") {
      return NextResponse.json({
        success: false,
        error: "KEY_NOT_CONFIGURED",
        message: "SARVAM_API_KEY is not set in .env.local",
        fallback: true,
      }, { status: 503 });
    }

    // Selected speaker: Prefer "shubh" for natural Indian vocalization
    const selectedSpeaker = speaker || "shubh";

    const payload = {
      inputs: [text.trim()],
      target_language_code: targetLanguageCode,
      speaker: selectedSpeaker,
      pitch: 0,
      pace: 1.0,
      loudness: 1.0,
      speech_sample_rate: 22050,
      enable_preprocessing: true,
      model: "bulbul:v3",
    };

    const sarvamRes = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    // Handle Sarvam 402 / Credit Exhaustion gracefully
    if (sarvamRes.status === 402) {
      console.warn("Sarvam AI TTS reported 402 Payment Required / Credit Exhausted.");
      return NextResponse.json({
        success: false,
        error: "CREDIT_EXHAUSTED",
        creditsExhausted: true,
        message: "Voice credits are exhausted. Text mode is still available.",
      }, { status: 402 });
    }

    if (!sarvamRes.ok) {
      const errText = await sarvamRes.text();
      // If speaker 'shubh' is not available for specific language, fallback to 'meera'
      if (sarvamRes.status === 400 && selectedSpeaker !== "meera") {
        const retryRes = await fetch("https://api.sarvam.ai/text-to-speech", {
          method: "POST",
          headers: {
            "api-subscription-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...payload, speaker: "meera" }),
        });

        if (retryRes.ok) {
          const retryData = await retryRes.json();
          const retryAudio = retryData.audios?.[0];
          if (retryAudio) {
            ttsCache.set(cacheKey, { audioBase64: retryAudio, format: "audio/wav", timestamp: Date.now() });
            return NextResponse.json({
              success: true,
              audioBase64: retryAudio,
              format: "audio/wav",
              languageCode: targetLanguageCode,
              model: "bulbul:v3",
            });
          }
        }
      }

      return NextResponse.json({
        success: false,
        error: "TTS_ERROR",
        message: `Sarvam TTS failed with status ${sarvamRes.status}`,
      }, { status: sarvamRes.status });
    }

    const data = await sarvamRes.json();
    const audioBase64 = data.audios?.[0];

    if (!audioBase64) {
      return NextResponse.json({
        success: false,
        error: "NO_AUDIO_RETURNED",
        message: "Sarvam did not return audio data",
      }, { status: 500 });
    }

    // Cache successful synthesis (keep cache size <= 100)
    if (ttsCache.size > 100) {
      const firstKey = ttsCache.keys().next().value;
      if (firstKey) ttsCache.delete(firstKey);
    }
    ttsCache.set(cacheKey, { audioBase64, format: "audio/wav", timestamp: Date.now() });

    return NextResponse.json({
      success: true,
      audioBase64,
      format: "audio/wav",
      languageCode: targetLanguageCode,
      model: "bulbul:v3",
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: "SERVER_ERROR",
      message: error.message || "Failed to process text-to-speech",
    }, { status: 500 });
  }
}
