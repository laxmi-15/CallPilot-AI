# CallPilot AI - Database Schema Documentation

CallPilot AI is architected with a relational database design for **Supabase PostgreSQL**, optimized for data integrity, multi-tenant isolation, and high query performance.

---

## 1. Entity Relationship Overview

| Table | Purpose | Primary Key | Key Foreign Keys |
|---|---|---|---|
| `businesses` | Tenant company profile, industry type, phone number, and default language. | `id` (UUID) | - |
| `workflows` | Data-driven conversation workflow configurations and assistant personas. | `id` (UUID) | `business_id` → `businesses(id)` |
| `workflow_fields` | Structured data fields (questions, types, required flags, order). | `id` (UUID) | `workflow_id` → `workflows(id)` |
| `workflow_conditions` | Conditional logic rules (e.g. `<= 24h` urgency trigger). | `id` (UUID) | `workflow_id` → `workflows(id)`, `field_id` → `workflow_fields(id)` |
| `workflow_actions` | Automated actions triggered on workflow completion. | `id` (UUID) | `workflow_id` → `workflows(id)` |
| `customers` | Long-term customer records, extracted attributes, and interaction counts. | `id` (UUID) | `business_id` → `businesses(id)` |
| `conversations` | Multi-turn missed-call conversation sessions, status, urgency, and AI summaries. | `id` (UUID) | `business_id` → `businesses(id)`, `workflow_id` → `workflows(id)`, `customer_id` → `customers(id)` |
| `messages` | Individual chat turns (role, content, tool call IDs, timestamps). | `id` (UUID) | `conversation_id` → `conversations(id)` |
| `tool_calls` | Logs of tool calls executed by AI (tool name, input arguments, output payload, timing). | `id` (UUID) | `conversation_id` → `conversations(id)`, `business_id` → `businesses(id)` |
| `calendar_events` | Synchronized Google Calendar appointments and scheduled callbacks. | `id` (UUID) | `business_id` → `businesses(id)`, `customer_id` → `customers(id)` |
| `tasks` | Follow-up action tasks generated for business staff. | `id` (UUID) | `business_id` → `businesses(id)`, `conversation_id` → `conversations(id)` |
| `notifications` | In-app alerts for urgent customer enquiries and booked appointments. | `id` (UUID) | `business_id` → `businesses(id)` |

---

## 2. Table Details & Key Fields

### `businesses`
- `id`: UUID
- `name`: string (e.g. "Sweet Delights Artisan Bakery")
- `type`: Enum (`cake_shop`, `clinic`, `delivery`, `real_estate`, `repair_service`, `custom`)
- `phone`: string (e.g. "+1 (555) 789-2253")
- `language`: `en` | `hi` | `hinglish`

### `workflows`
- `trigger`: `missed_call` | `voicemail` | `web_form` | `manual`
- `greeting`: string (English)
- `greeting_hi`: string (Hindi)
- `personality`: `warm_friendly` | `professional` | `concise` | `empathetic`
- `closing_message`: string
- `owner_notification`: JSONB `{ notifyOnUrgent, notifyOnAll, channels }`

### `workflow_fields`
- `type`: `text`, `number`, `date`, `time`, `phone`, `email`, `select`, `address`, `boolean`
- `required`: boolean
- `question`: string
- `order_index`: integer

### `workflow_conditions`
- `operator`: `equals`, `not_equals`, `contains`, `greater_than`, `less_than`, `less_than_or_equal`, `within_hours`, `is_set`, `is_not_set`
- `then_urgency`: `LOW` | `NORMAL` | `HIGH` | `CRITICAL`
- `then_action`: string

### `conversations`
- `status`: `new` | `contacted` | `completed` | `closed`
- `urgency`: `LOW` | `NORMAL` | `HIGH` | `CRITICAL`
- `extracted_fields`: JSONB (key-value structured data collected by AI)
- `summary`: text (AI generated concise synopsis)

---

## 3. Row Level Security (RLS) & Performance
- All tables have Row Level Security enabled.
- Composite B-Tree indexes on `(business_id, created_at DESC)` ensure sub-millisecond query performance on high-volume conversation and customer tables.
