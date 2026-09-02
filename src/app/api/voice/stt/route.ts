import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.SARVAM_API_KEY;

    // Check Content-Type (FormData vs JSON)
    const contentType = req.headers.get("content-type") || "";
    let audioBlob: Blob | null = null;
    let languageCode = "en-IN";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as Blob | null;
      const lang = (formData.get("language") as string) || "en";
      audioBlob = file;

      if (lang === "kn" || lang === "kn-IN") languageCode = "kn-IN";
      else if (lang === "hi" || lang === "hi-IN" || lang === "hinglish") languageCode = "hi-IN";
      else languageCode = "en-IN";
    } else {
      const body = await req.json();
      const { audioBase64, language } = body;

      if (language === "kn" || language === "kn-IN") languageCode = "kn-IN";
      else if (language === "hi" || language === "hi-IN" || language === "hinglish") languageCode = "hi-IN";
      else languageCode = "en-IN";

      if (audioBase64) {
        const buffer = Buffer.from(audioBase64, "base64");
        audioBlob = new Blob([buffer], { type: "audio/wav" });
      }
    }

    if (!audioBlob) {
      return NextResponse.json({ success: false, error: "No audio provided" }, { status: 400 });
    }

    if (!apiKey || apiKey.trim() === "") {
      return NextResponse.json({
        success: false,
        error: "KEY_NOT_CONFIGURED",
        message: "SARVAM_API_KEY is not set in .env.local",
        fallback: true,
      }, { status: 503 });
    }

    // Prepare multipart payload for Sarvam Saaras v3 STT
    const sarvamFormData = new FormData();
    sarvamFormData.append("file", audioBlob, "speech.wav");
    sarvamFormData.append("model", "saaras:v3");
    sarvamFormData.append("language_code", languageCode);
    sarvamFormData.append("with_diarization", "false");

    const sarvamRes = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
      },
      body: sarvamFormData,
    });

    // Handle Sarvam 402 / Credit Exhaustion gracefully
    if (sarvamRes.status === 402) {
      console.warn("Sarvam AI STT reported 402 Payment Required / Credit Exhausted.");
      return NextResponse.json({
        success: false,
        error: "CREDIT_EXHAUSTED",
        creditsExhausted: true,
        message: "Voice credits are exhausted. Text mode is still available.",
      }, { status: 402 });
    }

    if (!sarvamRes.ok) {
      const errText = await sarvamRes.text();
      console.error(`Sarvam STT error (${sarvamRes.status}):`, errText);
      return NextResponse.json({
        success: false,
        error: "STT_ERROR",
        message: `Sarvam STT failed with status ${sarvamRes.status}`,
      }, { status: sarvamRes.status });
    }

    const data = await sarvamRes.json();
    const transcript = data.transcript || "";

    return NextResponse.json({
      success: true,
      transcript: transcript.trim(),
      languageCode: data.language_code || languageCode,
      model: "saaras:v3",
    });
  } catch (error: any) {
    console.error("STT route exception:", error);
    return NextResponse.json({
      success: false,
      error: "SERVER_ERROR",
      message: error.message || "Failed to process speech-to-text",
    }, { status: 500 });
  }
}
