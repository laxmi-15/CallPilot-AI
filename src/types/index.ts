export type BusinessType = 
  | 'cake_shop' 
  | 'clinic' 
  | 'delivery' 
  | 'real_estate' 
  | 'repair_service' 
  | 'custom';

export type LanguageCode = 'en' | 'hi' | 'hinglish' | 'kn';

export type VoiceState = 
  | 'idle' 
  | 'requesting_permission' 
  | 'connecting' 
  | 'listening' 
  | 'processing' 
  | 'speaking' 
  | 'error';

export interface Business {
  id: string;
  name: string;
  type: BusinessType;
  phone: string;
  email?: string;
  address?: string;
  timezone: string;
  language: LanguageCode;
  createdAt: string;
  updatedAt: string;
}

export type FieldType = 
  | 'text' 
  | 'number' 
  | 'date' 
  | 'time' 
  | 'phone' 
  | 'email' 
  | 'select' 
  | 'address' 
  | 'boolean';

export interface WorkflowField {
  id: string;
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  question: string;
  questionHi?: string;
  questionKn?: string;
  options?: string[]; // for select
  validationRule?: string; // regex or rule description
  defaultValue?: string | number | boolean;
  order: number;
}

export type ConditionOperator = 
  | 'equals' 
  | 'not_equals' 
  | 'contains' 
  | 'greater_than' 
  | 'less_than' 
  | 'less_than_or_equal' 
  | 'within_hours' 
  | 'is_set' 
  | 'is_not_set';

export interface WorkflowCondition {
  id: string;
  fieldId: string;
  operator: ConditionOperator;
  value: string | number | boolean;
  thenUrgency?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  thenAction?: string;
  elseUrgency?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  elseAction?: string;
  description?: string;
}

export type ActionType = 
  | 'create_customer' 
  | 'create_task' 
  | 'create_calendar_event' 
  | 'update_calendar_event' 
  | 'cancel_calendar_event' 
  | 'send_notification' 
  | 'mark_urgent' 
  | 'generate_summary';

export interface WorkflowAction {
  id: string;
  type: ActionType;
  name: string;
  description: string;
  config: Record<string, any>;
  enabled: boolean;
}

export interface Workflow {
  id: string;
  businessId: string;
  name: string;
  description: string;
  industry: BusinessType;
  trigger: 'missed_call' | 'voicemail' | 'web_form' | 'manual';
  isActive: boolean;
  greeting: string;
  greetingHi?: string;
  greetingKn?: string;
  personality: 'professional' | 'warm_friendly' | 'concise' | 'empathetic';
  language: LanguageCode;
  fields: WorkflowField[];
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  closingMessage: string;
  closingMessageHi?: string;
  closingMessageKn?: string;
  ownerNotification: {
    notifyOnUrgent: boolean;
    notifyOnAll: boolean;
    channels: ('in_app' | 'email' | 'sms')[];
    emailRecipient?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export type ConversationStatus = 'new' | 'contacted' | 'completed' | 'closed';
export type UrgencyLevel = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export interface Message {
  id: string;
  conversationId: string;
  role: 'assistant' | 'user' | 'system' | 'tool';
  content: string;
  toolCalls?: ToolCallRecord[];
  toolCallId?: string;
  timestamp: string;
  language?: LanguageCode;
}

export interface ToolCallRecord {
  id: string;
  toolName: string;
  input: Record<string, any>;
  output: Record<string, any>;
  status: 'success' | 'error' | 'pending';
  executionTimeMs?: number;
  timestamp: string;
}

export interface Conversation {
  id: string;
  businessId: string;
  workflowId: string;
  customerId?: string;
  callerNumber: string;
  callerName?: string;
  status: ConversationStatus;
  urgency: UrgencyLevel;
  intent: string;
  language: LanguageCode;
  extractedFields: Record<string, any>;
  summary?: string;
  messages: Message[];
  toolCalls: ToolCallRecord[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  latestUrgency: UrgencyLevel;
  lastInteractionAt: string;
  totalConversations: number;
  extractedAttributes: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export type CalendarEventStatus = 'confirmed' | 'tentative' | 'cancelled';

export interface CalendarEvent {
  id: string;
  businessId: string;
  customerId?: string;
  conversationId?: string;
  title: string;
  description?: string;
  startTime: string; // ISO String
  endTime: string;   // ISO String
  attendeeName: string;
  attendeePhone?: string;
  attendeeEmail?: string;
  status: CalendarEventStatus;
  googleEventId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  businessId: string;
  conversationId?: string;
  customerId?: string;
  title: string;
  description: string;
  dueDate?: string;
  priority: UrgencyLevel;
  completed: boolean;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  businessId: string;
  title: string;
  message: string;
  type: 'urgent_call' | 'appointment_booked' | 'order_enquiry' | 'system';
  isRead: boolean;
  conversationId?: string;
  createdAt: string;
}

export interface DashboardKPIs {
  missedCalls: number;
  aiConversations: number;
  qualifiedLeads: number;
  urgentFollowUps: number;
  appointmentsBooked: number;
  completionRate: number; // percentage
}
