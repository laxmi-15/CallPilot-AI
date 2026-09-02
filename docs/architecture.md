# CallPilot AI - System Architecture

CallPilot AI is built on an enterprise-grade modular architecture designed for high-concurrency voice/chat orchestration, data-driven workflow evaluation, agentic tool execution, and real-time CRM updates.

---

## 1. End-to-End Architecture Diagram

```mermaid
graph TD
    User([Business Owner / Customer]) <--> |Web UI / Mobile| FE[Next.js 14 Frontend App]
    
    subgraph Presentation & Client State
        FE --> UIComponents[Tailwind CSS + Framer Motion + Recharts + Lucide]
        FE --> StateLayer[Storage Repository / Client State Sync]
    end

    subgraph Backend & API Layer
        FE <--> APIEndpoints[Next.js App Router API Routes / Server Actions]
        APIEndpoints <--> AIOrchestrator[AI Orchestrator Engine]
        APIEndpoints <--> WorkflowEngine[Workflow Execution Engine]
        APIEndpoints <--> ToolEngine[Agent Tool Registry]
    end

    subgraph AI & Voice Processing
        AIOrchestrator <--> OpenAI[OpenAI GPT-4o-mini / LLM API]
        AIOrchestrator <--> SmartLocalEngine[Smart Heuristic Reasoner Fallback]
        AIOrchestrator <--> VoiceProvider[VoiceProvider Abstraction: Sarvam / ElevenLabs / Deepgram]
    end

    subgraph Tool Calling Integrations
        ToolEngine <--> GCalService[Google Calendar Tool Agent]
        ToolEngine <--> TrackingService[Logistics Tracking API Tool]
        ToolEngine <--> CRMService[CRM History Lookup Tool]
        ToolEngine <--> NotifService[In-App & Email Notification Service]
    end

    subgraph Data & Storage Layer
        GCalService <--> GCalAPI[(Google Calendar REST API v3)]
        StateLayer <--> LocalStore[(Local Resilient State & Seeded Store)]
        APIEndpoints <--> SupabaseDB[(Supabase PostgreSQL 15 + RLS)]
    end
```

---

## 2. Core Subsystems

### A. Next.js 14 Frontend Layer
- **Landing Page (`/`)**: Conversion-focused showcase with hero simulation, workflow animation, use case tabs, ROI counters, and calendar preview.
- **AI Simulator (`/simulator`)**: 3-column interactive cockpit:
  - Left column: Active Workflow overview, prompt starters, template switcher.
  - Center column: Live chat stream, voice visualizer, input box.
  - Right column: Real-time extracted fields with animated pulse effects + expandable developer tool execution inspector.
- **Workflow Builder (`/workflows/new`, `/workflows/[id]`)**: Step-by-step visual editor for Greeting, Fields, Custom Types, Conditional Logic, Actions, and Notification settings.
- **Dashboard (`/dashboard`)**: KPI metric cards, Recharts trends, intent distributions, urgency alert banner, and recent conversations table.
- **Customer CRM (`/customers`)**: Lifetime records, extracted attributes, conversation history, and contact timeline.
- **Calendar (`/calendar`)**: Sync status, scheduled appointments, callbacks, and direct event manager.

### B. AI Orchestrator (`src/lib/ai/orchestrator.ts`)
- Dynamically injects business profile, active workflow fields, collected entities, conversation history, and available tool schemas into prompt.
- Executes multi-turn reasoning and tool invocation cycles.
- Multilingual support for English, Hindi, and Hinglish with automatic language detection.
- Seamless dual-mode: Uses OpenAI API when keys are configured, and a smart local heuristic parser when operating in zero-dependency demo mode.

### C. Workflow Engine (`src/lib/workflow/engine.ts`)
- Pure, data-driven workflow evaluation.
- Validates field data types (Text, Number, Date, Time, Phone, Email, Select, Address, Boolean).
- Evaluates conditional rules (e.g. `IF required_date <= 24h THEN urgency = HIGH`).
- Triggers follow-up actions (CRM record creation, Task assignment, Calendar event synchronization, Baker / Doctor notifications).

### D. Tool-Calling Engine (`src/lib/tools/`)
- Standardized tool interface: `AgentTool { name, displayName, description, parameters, execute }`.
- Integrations:
  - `calendar.checkAvailability`: Free/busy inspection.
  - `calendar.createEvent`: Google Calendar event booking.
  - `calendar.updateEvent`: Appointment rescheduling.
  - `calendar.cancelEvent`: Appointment cancellation.
  - `delivery.trackPackage`: Package location and delivery ETA lookup.
  - `crm.lookupCustomer`: Returning customer profile lookup.

### E. Voice Provider Abstraction (`src/lib/voice/provider.ts`)
- `VoiceProvider` contract decouples voice engines from business logic.
- Implemented adapters for **Sarvam AI** (Indian English/Hindi), **ElevenLabs**, **Deepgram**, and **Simulated Engine**.
