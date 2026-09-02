import { NextResponse } from "next/server";

export async function GET() {
  const isConfigured = Boolean(process.env.SARVAM_API_KEY && process.env.SARVAM_API_KEY.trim() !== "");

  return NextResponse.json({
    configured: isConfigured,
    provider: "sarvam",
    sttModel: "saaras:v3",
    ttsModel: "bulbul:v3",
    supportedLanguages: [
      { code: "en", label: "English", locale: "en-IN" },
      { code: "hi", label: "Hindi", locale: "hi-IN" },
      { code: "kn", label: "Kannada", locale: "kn-IN" },
    ],
    pricingMode: "free_tier_credits",
    message: isConfigured 
      ? "Sarvam AI Multilingual Voice Engine (Saaras v3 + Bulbul v3) is active." 
      : "SARVAM_API_KEY is not configured in .env.local. Demo fallback active.",
  });
}
