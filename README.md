# CallPilot AI 🎙️⚡
> **"Your Multilingual Voice AI assistant for every missed call — ₹0 Out-of-Pocket."**

CallPilot AI is a production-grade Voice AI Personal Assistant web application built for small-business owners (Clinics, Cake shops, Delivery/logistics, Real estate, and Emergency repair) to automatically handle missed calls, transcribe real caller audio, extract structured requirements, evaluate conditional business workflows, execute agent tools (**Google Calendar API v3**, **Delivery tracking**, **CRM lookups**), and synthesize natural responses in **English**, **Hindi**, and **Kannada**.

---

## 🌟 Real Multilingual Voice AI Integration

- **Speech-to-Text (STT)**: **Sarvam Saaras v3** (`saaras:v3`) with streaming/chunked audio processing.
- **Text-to-Speech (TTS)**: **Sarvam Bulbul v3** (`bulbul:v3`) with low-latency Indian English, Hindi, and Kannada vocalizations.
- **AI Reasoning Engine**: **Google Gemini 1.5 Flash** with multilingual entity extraction and intent triage.
- **Calendar Automation**: **Google Calendar API v3** with real interval overlap checking in `Asia/Kolkata` (+05:30).
- **Database**: **Supabase PostgreSQL** with Row Level Security (RLS).

### Supported Languages:
1. 🇬🇧 **English (`en-IN`)**: Natural Indian English voice and transcription.
2. 🇮🇳 **Hindi (`hi-IN`) & Hinglish**: Conversational Hindi and mixed-language comprehension (e.g., *"Mujhe kal Dr. Sharma se appointment chahiye"*).
3. 🇮🇳 **Kannada (`kn-IN` / ಕನ್ನಡ)**: Full native Kannada speech-to-text, entity extraction, and text-to-speech synthesis (e.g., *"ನನ್ನ ಹೆಸರು ರಾಹುಲ್. ನನಗೆ ನಾಳೆ ಸಂಜೆ 4 ಗಂಟೆಗೆ ಡಾ. ಶರ್ಮಾ ಅವರ ಜೊತೆ ಅಪಾಯಿಂಟ್ಮೆಂಟ್ ಬೇಕು."*).

---

## 🔒 ₹0 Out-of-Pocket Cost Guarantee

- Uses **Sarvam AI free signup credits** strictly within limits.
- **No Paid Telephony / No Twilio** required.
- **No OpenAI Voice / No ElevenLabs** billing dependencies.
- **HTTP 402 Safety Guard**: If Sarvam free credits are exhausted, the system automatically detects HTTP 402, halts voice calls cleanly without billing or infinite retries, and allows seamless continued use in text mode.

---

## 🚀 Getting Started

### 1. Configure Environment Variables
Create or update `.env.local` with your API keys:

```env
# Google Gemini API (AI Reasoning) - Free at https://aistudio.google.com
GEMINI_API_KEY="your-gemini-api-key"

# Sarvam AI (Multilingual Voice STT & TTS) - Free signup at https://www.sarvam.ai
# IMPORTANT: Keep server-side only. NEVER prefix with NEXT_PUBLIC_
SARVAM_API_KEY="your-sarvam-api-key"

# Supabase (Database & CRM) - Free at https://supabase.com
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

# Google Calendar API v3 (Appointment Scheduling) - Free at https://console.cloud.google.com
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"
```

### 2. Run Development Server
```bash
npm install
npm run dev
```

### 3. Test Multilingual Voice in Simulator
1. Navigate to **http://localhost:3000/simulator**.
2. Select your business workflow (e.g., **Clinic & Doctor** or **Cake Bakery**).
3. Select your preferred language: **🇬🇧 English**, **🇮🇳 हिंदी**, or **🇮🇳 ಕನ್ನಡ**.
4. Click **Start Voice** (or **Voice ON**).
5. Grant browser microphone permission when prompted.
6. Speak your request:
   - **English**: *"Hi, my name is John. I want to book an appointment with Dr. Sharma tomorrow at 3 PM."*
   - **Hindi**: *"नमस्ते, मेरा नाम राहुल है। मुझे कल शाम 4 बजे डॉ शर्मा से अपॉइंटमेंट चाहिए।"*
   - **Kannada**: *"ನನ್ನ ಹೆಸರು ರಾಹುಲ್. ನನಗೆ ನಾಳೆ ಸಂಜೆ 4 ಗಂಟೆಗೆ ಡಾ. ಶರ್ಮಾ ಅವರ ಜೊತೆ ಅಪಾಯಿಂಟ್ಮೆಂಟ್ ಬೇಕು."*
7. CallPilot AI transcribes the audio, extracts entities, checks Google Calendar availability, and speaks the response via Sarvam Bulbul v3.

---

## 🏗️ Architecture Flow

```
Browser Microphone
       ↓ (Web Audio API / MediaRecorder)
Server-side Next.js Route (/api/voice/stt)
       ↓ (api-subscription-key)
Sarvam Saaras v3 STT
       ↓ (Final Transcript)
CallPilot Conversation Orchestrator Engine
       ↓ (Slot-Filling & Intent Detection)
Google Gemini API / Heuristic Reasoner
       ↓ (Availability & Conflict Checking)
Google Calendar API v3 Tool Registry
       ↓ (AI Localized Response Text)
Server-side Next.js Route (/api/voice/tts)
       ↓ (Model: bulbul:v3, Speaker: meera)
Sarvam Bulbul v3 TTS
       ↓ (Base64 Audio Stream)
Browser Audio Player + Dynamic Soundwave Equalizer
```

---

## 🧪 Testing Checklist

- [x] **Real Microphone Capture**: Web Audio volume visualizer and silence chunk processing.
- [x] **Sarvam Saaras v3 STT**: Transcribes English, Hindi, and Kannada speech.
- [x] **Multilingual Entity Extraction**: Contextual slot-filling without repeating questions.
- [x] **Google Calendar Overlap Gate**: Unavailable slots return `available: false` and suggest alternatives without creating events.
- [x] **Sarvam Bulbul v3 TTS**: Speaks localized responses in English, Hindi, and Kannada.
- [x] **Audio Feedback Suppression**: Microphone is paused while CallPilot is speaking, with an Interrupt button.
- [x] **Interchangeable Voice + Text**: Users can type and speak across the same conversation.
- [x] **₹0 Safety Guard**: Catches HTTP 402, displays warning, and falls back to text mode cleanly.
