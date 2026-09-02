export interface ToolParameterProperty {
  type: string;
  description: string;
  enum?: string[];
  items?: { type: string };
  default?: any;
}

export interface ToolParametersSchema {
  type: "object";
  properties: Record<string, ToolParameterProperty>;
  required?: string[];
}

export interface ToolExecutionContext {
  businessId: string;
  conversationId?: string;
  customerId?: string;
  googleAccessToken?: string;
  callerPhone?: string;
}

export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  metadata?: Record<string, any>;
}

export interface AgentTool {
  name: string;
  displayName: string;
  description: string;
  category: "calendar" | "delivery" | "crm" | "notification" | "external";
  parameters: ToolParametersSchema;
  execute: (args: Record<string, any>, context: ToolExecutionContext) => Promise<ToolExecutionResult>;
}
