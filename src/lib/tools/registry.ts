import { AgentTool, ToolExecutionContext, ToolExecutionResult } from "./types";
import {
  checkCalendarAvailabilityTool,
  createCalendarEventTool,
  updateCalendarEventTool,
  cancelCalendarEventTool,
} from "./calendar-tools";
import { trackDeliveryPackageTool } from "./delivery-tools";
import { lookupCustomerTool } from "./customer-tools";

class ToolRegistry {
  private tools: Map<string, AgentTool> = new Map();

  constructor() {
    this.register(checkCalendarAvailabilityTool);
    this.register(createCalendarEventTool);
    this.register(updateCalendarEventTool);
    this.register(cancelCalendarEventTool);
    this.register(trackDeliveryPackageTool);
    this.register(lookupCustomerTool);
  }

  public register(tool: AgentTool): void {
    this.tools.set(tool.name, tool);
  }

  public getTool(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  public getAllTools(): AgentTool[] {
    return Array.from(this.tools.values());
  }

  public getToolsForIndustry(industry?: string): AgentTool[] {
    const all = this.getAllTools();
    if (!industry) return all;

    if (industry === "clinic") {
      return all.filter((t) => t.category === "calendar" || t.category === "crm");
    }
    if (industry === "delivery") {
      return all.filter((t) => t.category === "delivery" || t.category === "crm" || t.category === "calendar");
    }
    if (industry === "cake_shop") {
      return all.filter((t) => t.category === "calendar" || t.category === "crm");
    }

    return all;
  }

  public getOpenAIToolDefinitions(industry?: string): any[] {
    const tools = this.getToolsForIndustry(industry);
    return tools.map((t) => ({
      type: "function",
      function: {
        name: t.name.replace(".", "_"), // OpenAI function names prefer underscores
        description: t.description,
        parameters: t.parameters,
      },
    }));
  }

  public async executeTool(
    name: string,
    args: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const normalizedName = name.includes("_") && !this.tools.has(name) 
      ? name.replace("_", ".") 
      : name;

    const tool = this.tools.get(normalizedName);
    if (!tool) {
      return {
        success: false,
        error: `Tool '${name}' not found in registry.`,
      };
    }

    const startTime = Date.now();
    try {
      const result = await tool.execute(args, context);
      const executionTimeMs = Date.now() - startTime;
      return {
        ...result,
        metadata: {
          ...result.metadata,
          toolName: tool.name,
          displayName: tool.displayName,
          executionTimeMs,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Execution error in ${tool.name}: ${err.message}`,
        metadata: {
          toolName: tool.name,
          executionTimeMs: Date.now() - startTime,
        },
      };
    }
  }
}

export const toolRegistry = new ToolRegistry();
