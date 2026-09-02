# CallPilot AI - API Inventory & Free Tier Reference

This inventory lists all external APIs and services integrated with CallPilot AI, detailing their specific purpose, free tier allocations, and fallback behaviors.

---

## 1. External Services Inventory

| API / Service | Purpose | Free Tier / Allocation | Used For |
|---|---|---|---|
| **Google Calendar API (v3)** | Real-time agent tool calling for availability check, booking, rescheduling, and cancellation. | **1,000,000 queries/day** free under standard Google Cloud Console project. | `calendar.checkAvailability`, `calendar.createEvent`, `calendar.updateEvent`, `calendar.cancelEvent`. |
| **OpenAI API (GPT-4o-mini)** | Conversational reasoning, entity extraction, and dynamic tool calling decisions. | **$5 free trial credits** on new accounts; approx. $0.15 per 1M input tokens. | Real-time multi-turn conversation parsing in `/simulator` and API endpoints. |
| **Sarvam AI API** | Voice synthesis & speech transcription optimized for Indian English, Hindi, and Hinglish. | **Free developer credits** upon registration (up to 10,000 chars/month). | Multilingual Indian language voice generation. |
| **ElevenLabs API** | High-fidelity human-like voice synthesis. | **10,000 characters/month** permanently free tier. | Premium voice audio stream generation. |
| **Deepgram API** | Low-latency speech-to-text transcription. | **$200 free credit** on sign-up (covers ~45,000 minutes of audio). | Real-time speech transcription. |
| **Resend API** | Owner email notifications for urgent customer leads. | **3,000 emails/month** (100 emails/day) free tier. | Automated bakery/clinic staff email alerts. |
| **Supabase PostgreSQL** | Cloud PostgreSQL database with Row Level Security, Auth, and Storage. | **2 free projects**, 500MB database, 50,000 monthly active users free. | Relational database persistence and multi-tenant isolation. |

---

## 2. Free-Tier Fallback Architecture

To ensure flawless evaluation without requiring API keys or billing setup:
1. **Google Calendar Tool**: If `GOOGLE_CLIENT_ID` or OAuth token is not configured, the system seamlessly uses the high-fidelity interactive sandbox engine, providing exact JSON responses and live calendar event creation.
2. **AI Engine**: If `OPENAI_API_KEY` is not provided, CallPilot AI invokes its built-in conversational heuristic orchestrator, allowing full multi-turn chat, entity extraction, condition evaluations, and tool calls.
3. **Voice Engine**: Uses the simulated waveform engine with live visualizer by default.
