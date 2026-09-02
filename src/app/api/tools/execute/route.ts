import { NextRequest, NextResponse } from "next/server";
import { toolRegistry } from "@/lib/tools/registry";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { toolName, parameters, context } = body;

    if (!toolName) {
      return NextResponse.json({ error: "toolName is required" }, { status: 400 });
    }

    const result = await toolRegistry.executeTool(toolName, parameters || {}, context || { businessId: "biz_metro_health" });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Tool execution API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute tool" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const tools = toolRegistry.getAllTools();
  return NextResponse.json({
    tools: tools.map((t) => ({
      name: t.name,
      displayName: t.displayName,
      description: t.description,
      category: t.category,
      parameters: t.parameters,
    })),
  });
}
