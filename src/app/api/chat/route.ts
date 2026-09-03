import { NextRequest, NextResponse } from "next/server";
import { processConversationTurn } from "@/lib/ai/orchestrator";
import { storageRepo } from "@/lib/store/storage";
import { PREBUILT_TEMPLATES } from "@/lib/workflow/templates";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      businessId,
      workflowId,
      conversationHistory,
      latestUserMessage,
      extractedFields,
      callerPhone,
      language,
      apiKey,
    } = body;

    const business = storageRepo.getBusiness(businessId) || storageRepo.getActiveBusiness();
    const workflow = storageRepo.getWorkflow(workflowId) || 
      PREBUILT_TEMPLATES[business.type] || 
      PREBUILT_TEMPLATES.cake_shop;

    const effectiveApiKey = apiKey || process.env.GEMINI_API_KEY;

    const result = await processConversationTurn({
      business,
      workflow,
      conversationHistory: conversationHistory || [],
      latestUserMessage: latestUserMessage || "",
      extractedFields: extractedFields || {},
      callerPhone: callerPhone || "+1 (555) 000-1122",
      language,
      apiKey: effectiveApiKey,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process AI conversation turn" },
      { status: 500 }
    );
  }
}
