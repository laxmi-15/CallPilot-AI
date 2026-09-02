-- ==============================================================================
-- CallPilot AI: Production PostgreSQL Relational Schema & Row Level Security (RLS)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Businesses Table
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cake_shop', 'clinic', 'delivery', 'real_estate', 'repair_service', 'custom')),
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'hi', 'hinglish', 'kn')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Workflows Table
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  industry TEXT NOT NULL,
  trigger TEXT NOT NULL DEFAULT 'missed_call',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  greeting TEXT NOT NULL,
  greeting_hi TEXT,
  greeting_kn TEXT,
  personality TEXT NOT NULL DEFAULT 'warm_friendly',
  language TEXT NOT NULL DEFAULT 'en',
  closing_message TEXT NOT NULL,
  closing_message_hi TEXT,
  closing_message_kn TEXT,
  owner_notification JSONB NOT NULL DEFAULT '{"notifyOnUrgent": true, "notifyOnAll": true, "channels": ["in_app", "email"]}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Workflow Fields Table
CREATE TABLE IF NOT EXISTS workflow_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'number', 'date', 'time', 'phone', 'email', 'select', 'address', 'boolean')),
  required BOOLEAN NOT NULL DEFAULT FALSE,
  question TEXT NOT NULL,
  question_hi TEXT,
  question_kn TEXT,
  options JSONB,
  validation_rule TEXT,
  default_value TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Workflow Conditions Table
CREATE TABLE IF NOT EXISTS workflow_conditions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  field_id UUID REFERENCES workflow_fields(id) ON DELETE CASCADE,
  operator TEXT NOT NULL CHECK (operator IN ('equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'less_than_or_equal', 'within_hours', 'is_set', 'is_not_set')),
  value TEXT NOT NULL,
  then_urgency TEXT CHECK (then_urgency IN ('LOW', 'NORMAL', 'HIGH', 'CRITICAL')),
  then_action TEXT,
  else_urgency TEXT CHECK (else_urgency IN ('LOW', 'NORMAL', 'HIGH', 'CRITICAL')),
  else_action TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Workflow Actions Table
CREATE TABLE IF NOT EXISTS workflow_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('create_customer', 'create_task', 'create_calendar_event', 'update_calendar_event', 'cancel_calendar_event', 'send_notification', 'mark_urgent', 'generate_summary')),
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  notes TEXT,
  latest_urgency TEXT NOT NULL DEFAULT 'NORMAL' CHECK (latest_urgency IN ('LOW', 'NORMAL', 'HIGH', 'CRITICAL')),
  last_interaction_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_conversations INTEGER NOT NULL DEFAULT 1,
  extracted_attributes JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  caller_name TEXT,
  caller_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'completed', 'closed')),
  urgency TEXT NOT NULL DEFAULT 'NORMAL' CHECK (urgency IN ('LOW', 'NORMAL', 'HIGH', 'CRITICAL')),
  intent TEXT NOT NULL DEFAULT 'general_inquiry',
  summary TEXT NOT NULL DEFAULT '',
  extracted_fields JSONB NOT NULL DEFAULT '{}',
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'hi', 'hinglish', 'kn')),
  recording_url TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('system', 'assistant', 'user', 'tool')),
  content TEXT NOT NULL,
  audio_url TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Tool Calls Table
CREATE TABLE IF NOT EXISTS tool_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  input JSONB NOT NULL DEFAULT '{}',
  output JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error', 'pending')),
  error_message TEXT,
  execution_time_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Calendar Events Table (Google Calendar Sync)
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  google_event_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  attendee_name TEXT NOT NULL,
  attendee_phone TEXT,
  attendee_email TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'tentative', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Tasks Table (Follow-up Items)
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  urgency TEXT NOT NULL DEFAULT 'NORMAL' CHECK (urgency IN ('LOW', 'NORMAL', 'HIGH', 'CRITICAL')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  assigned_to TEXT,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_business_id ON conversations(business_id);
CREATE INDEX IF NOT EXISTS idx_conversations_urgency ON conversations(urgency);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- Enable Row Level Security (RLS)
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Public read/write demo policies (can be scoped to auth.uid() in multi-tenant mode)
CREATE POLICY "Public Read Access" ON businesses FOR SELECT USING (true);
CREATE POLICY "Public Write Access" ON businesses FOR ALL USING (true);
CREATE POLICY "Public Read Workflows" ON workflows FOR SELECT USING (true);
CREATE POLICY "Public Write Workflows" ON workflows FOR ALL USING (true);
CREATE POLICY "Public Read Fields" ON workflow_fields FOR SELECT USING (true);
CREATE POLICY "Public Write Fields" ON workflow_fields FOR ALL USING (true);
CREATE POLICY "Public Read Conditions" ON workflow_conditions FOR SELECT USING (true);
CREATE POLICY "Public Write Conditions" ON workflow_conditions FOR ALL USING (true);
CREATE POLICY "Public Read Actions" ON workflow_actions FOR SELECT USING (true);
CREATE POLICY "Public Write Actions" ON workflow_actions FOR ALL USING (true);
CREATE POLICY "Public Read Customers" ON customers FOR SELECT USING (true);
CREATE POLICY "Public Write Customers" ON customers FOR ALL USING (true);
CREATE POLICY "Public Read Conversations" ON conversations FOR SELECT USING (true);
CREATE POLICY "Public Write Conversations" ON conversations FOR ALL USING (true);
CREATE POLICY "Public Read Messages" ON messages FOR SELECT USING (true);
CREATE POLICY "Public Write Messages" ON messages FOR ALL USING (true);
CREATE POLICY "Public Read ToolCalls" ON tool_calls FOR SELECT USING (true);
CREATE POLICY "Public Write ToolCalls" ON tool_calls FOR ALL USING (true);
CREATE POLICY "Public Read Calendar" ON calendar_events FOR SELECT USING (true);
CREATE POLICY "Public Write Calendar" ON calendar_events FOR ALL USING (true);
CREATE POLICY "Public Read Tasks" ON tasks FOR SELECT USING (true);
CREATE POLICY "Public Write Tasks" ON tasks FOR ALL USING (true);
