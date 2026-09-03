import { CAKE_SHOP_WORKFLOW, CLINIC_WORKFLOW, DELIVERY_WORKFLOW } from "../src/lib/workflow/templates";
import {
  evaluateCondition,
  evaluateWorkflow,
  getMissingRequiredFields,
  validateFieldValue,
} from "../src/lib/workflow/engine";
import { extractFieldsFromText, detectLanguage } from "../src/lib/ai/orchestrator";
import { toolRegistry } from "../src/lib/tools/registry";
import { storageRepo } from "../src/lib/store/storage";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log("\n==========================================");
  console.log("   CallPilot AI - Automated Test Suite");
  console.log("==========================================\n");

  // 1. Workflow Condition Evaluation
  console.log("1. Testing Workflow Condition Evaluation:");
  {
    const cond = CAKE_SHOP_WORKFLOW.conditions[0]; // within_hours 24 -> HIGH
    const fields = CAKE_SHOP_WORKFLOW.fields;

    const resTomorrow = evaluateCondition(cond, { required_date: "Tomorrow" }, fields);
    assert(resTomorrow.matches === true && resTomorrow.urgency === "HIGH", "Tomorrow triggers HIGH urgency (< 24h)");

    const resUrgent = evaluateCondition(cond, { required_date: "Today (Urgent)" }, fields);
    assert(resUrgent.matches === true && resUrgent.urgency === "HIGH", "Today triggers HIGH urgency");

    const resNextMonth = evaluateCondition(cond, { required_date: "2026-10-15" }, fields);
    assert(resNextMonth.matches === false && resNextMonth.urgency === "NORMAL", "Future date triggers NORMAL urgency");
  }

  // 2. Required Field Validation
  console.log("\n2. Testing Required Field Validation:");
  {
    const nameField = CAKE_SHOP_WORKFLOW.fields.find((f) => f.name === "customer_name")!;
    assert(validateFieldValue(nameField, "").isValid === false, "Empty required field fails validation");
    assert(validateFieldValue(nameField, "Rahul Verma").isValid === true, "Populated name passes validation");

    const phoneField = CAKE_SHOP_WORKFLOW.fields.find((f) => f.name === "phone_number")!;
    assert(validateFieldValue(phoneField, "123").isValid === false, "Short invalid phone fails");
    assert(validateFieldValue(phoneField, "+91 9876543210").isValid === true, "Valid phone passes");

    const missing = getMissingRequiredFields(CAKE_SHOP_WORKFLOW, {
      customer_name: "Rahul",
      cake_type: "Birthday Cake",
    });
    assert(missing.some((f) => f.name === "flavor"), "Detects missing required flavor field");
  }

  // 3. AI Entity Extraction & Language Detection
  console.log("\n3. Testing AI Structured Extraction & Multilingual Detection:");
  {
    const messageEn = "Hi, my name is Rahul and I need a 2kg chocolate truffle birthday cake for tomorrow. Budget is 1500.";
    const resEn = extractFieldsFromText(messageEn, CAKE_SHOP_WORKFLOW, {});
    assert(resEn.extracted.customer_name === "Rahul", "Extracted customer name correctly");
    assert(resEn.extracted.cake_type === "Birthday Cake", "Extracted cake type correctly");
    assert(resEn.extracted.flavor === "Chocolate truffle", "Extracted flavor correctly");
    assert(resEn.extracted.required_date === "Tomorrow", "Extracted tomorrow required date");
    assert(resEn.extracted.budget === "₹1500", "Extracted budget");

    const messageHi = "मुझे कल 4 baje doctor ka appointment chahiye";
    const lang = detectLanguage(messageHi);
    assert(lang === "hi" || lang === "hinglish", "Detected Hindi/Hinglish message correctly");
  }

  // 4. Google Calendar Agent Tool Arguments & Execution
  console.log("\n4. Testing Google Calendar Tool Calling:");
  {
    // Test checkAvailability
    const availResult = await toolRegistry.executeTool("calendar.checkAvailability", {
      date: "Tomorrow",
      time: "11:00 AM",
    }, { businessId: "biz_metro_health" });
    assert(availResult.success === true, "calendar.checkAvailability executes successfully");
    assert(availResult.data?.available === true, "Reports slot is available");

    // Test createEvent
    const createResult = await toolRegistry.executeTool("calendar.createEvent", {
      title: "Clinic Consultation: Test Patient",
      attendeeName: "Test Patient",
      attendeePhone: "+91 99999 88888",
      date: "2026-09-03",
      time: "10:00 AM",
      durationMinutes: 30,
    }, { businessId: "biz_metro_health" });
    assert(createResult.success === true, "calendar.createEvent executes successfully");
    assert(createResult.data?.eventId !== undefined, "Returns generated event ID");

    // Test cancelEvent
    const cancelResult = await toolRegistry.executeTool("calendar.cancelEvent", {
      attendeeName: "Test Patient",
      reason: "Patient requested cancellation",
    }, { businessId: "biz_metro_health" });
    assert(cancelResult.success === true, "calendar.cancelEvent executes successfully");
  }

  // 5. Delivery Tracking External Tool
  console.log("\n5. Testing Delivery Tracking Agent Tool:");
  {
    const trackResult = await toolRegistry.executeTool("delivery.trackPackage", {
      trackingNumber: "DEL-9821",
    }, { businessId: "biz_swift_route" });
    assert(trackResult.success === true, "delivery.trackPackage executes successfully");
    assert(trackResult.data?.status === "Out for Delivery", "Returns live status for DEL-9821");
  }

  // 6. Workflow Complete Cycle & Urgency Evaluation
  console.log("\n6. Testing Full Workflow Evaluation:");
  {
    const fullData = {
      customer_name: "Rahul Verma",
      cake_type: "Birthday Cake",
      flavor: "Chocolate Truffle",
      weight: "2 kg",
      required_date: "Tomorrow",
      delivery_type: "Store Pickup",
      phone_number: "+91 98765 43210",
    };
    const evalRes = evaluateWorkflow(CAKE_SHOP_WORKFLOW, fullData);
    assert(evalRes.isComplete === true, "Workflow marks complete when all required fields present");
    assert(evalRes.urgency === "HIGH", "Workflow flags HIGH urgency due to tomorrow delivery date");
    assert(evalRes.summary.includes("Rahul Verma"), "Summary includes captured customer details");
  }

  // 7. Conversation Persistence in Storage Repo
  console.log("\n7. Testing Persistence & CRM Synchronization:");
  {
    const newConv = storageRepo.createConversation({
      businessId: "biz_cake_haven",
      workflowId: "wf_cake_shop_default",
      callerNumber: "+1 (555) 999-1234",
      callerName: "Automated Test User",
      status: "new",
      urgency: "HIGH",
      intent: "Automated Test Enquiry",
      language: "en",
      extractedFields: {
        customer_name: "Automated Test User",
        cake_type: "Pastries",
      },
      messages: [],
      toolCalls: [],
    });
    assert(newConv.id !== undefined, "Creates conversation with generated ID");

    const foundConv = storageRepo.getConversation(newConv.id);
    assert(foundConv !== undefined, "Retrieves persisted conversation from store");

    const updated = storageRepo.updateConversationStatus(newConv.id, "completed");
    assert(updated?.status === "completed", "Updates conversation status to completed");

    const cust = storageRepo.getCustomers("biz_cake_haven").find((c) => c.phone === "+1 (555) 999-1234");
    assert(cust !== undefined && cust.name === "Automated Test User", "Auto-creates CRM customer record");
  }

  // 8. Multi-Turn Clinic Appointment & Conflict Resolution
  console.log("\n8. Testing Multi-Turn Clinic Appointment Flow & No Self-Conflict:");
  {
    const { processConversationTurn } = await import("../src/lib/ai/orchestrator");
    const biz = storageRepo.getBusiness("biz_metro_health")!;

    // Turn 1: Caller requests appointment without name
    const turn1 = await processConversationTurn({
      business: biz,
      workflow: CLINIC_WORKFLOW,
      conversationHistory: [],
      latestUserMessage: "Want to book an appointment with Dr. Sharma at September 4 on 1:39 AM",
      extractedFields: {},
      callerPhone: "+1 (555) 349-8800",
    });

    assert(turn1.toolCallsExecuted.some((t) => t.toolName === "calendar.checkAvailability"), "Turn 1 checks calendar availability");
    assert(!turn1.reply.includes("unavailable"), "Turn 1 reports available slot");
    assert(turn1.reply.includes("name") || turn1.reply.includes("full name"), "Turn 1 asks for patient name");

    // Turn 2: Caller provides name
    const turn2MsgHistory = [
      { id: "m1", conversationId: "c1", role: "user" as const, content: "Want to book an appointment with Dr. Sharma at September 4 on 1:39 AM", timestamp: "" },
      { id: "m2", conversationId: "c1", role: "assistant" as const, content: turn1.reply, toolCalls: turn1.toolCallsExecuted, timestamp: "" },
    ];

    const turn2 = await processConversationTurn({
      business: biz,
      workflow: CLINIC_WORKFLOW,
      conversationHistory: turn2MsgHistory,
      latestUserMessage: "My name is Priya Sharma",
      extractedFields: turn1.updatedExtractedFields,
      callerPhone: "+1 (555) 349-8800",
    });

    assert(turn2.toolCallsExecuted.some((t) => t.toolName === "calendar.createEvent"), "Turn 2 creates calendar event for Priya");
    assert(turn2.reply.includes("confirmed") || turn2.reply.includes("reserved"), "Turn 2 confirms booking on Google Calendar");

    // Turn 3: Caller says "ok, thank you"
    const turn3MsgHistory = [
      ...turn2MsgHistory,
      { id: "m3", conversationId: "c1", role: "user" as const, content: "My name is Priya Sharma", timestamp: "" },
      { id: "m4", conversationId: "c1", role: "assistant" as const, content: turn2.reply, toolCalls: turn2.toolCallsExecuted, timestamp: "" },
    ];

    const turn3 = await processConversationTurn({
      business: biz,
      workflow: CLINIC_WORKFLOW,
      conversationHistory: turn3MsgHistory,
      latestUserMessage: "ok, thank you",
      extractedFields: turn2.updatedExtractedFields,
      callerPhone: "+1 (555) 349-8800",
    });

    assert(!turn3.reply.includes("unavailable"), "Turn 3 NEVER falsely marks confirmed booking as unavailable");
    assert(turn3.reply.toLowerCase().includes("welcome") || turn3.reply.toLowerCase().includes("confirmed"), "Turn 3 acknowledges confirmed appointment warmly");
  }

  // 9. Multi-Turn Bakery Flow: Standalone Name + Dynamic Follow-up (No Repetition)
  console.log("\n9. Testing Multi-Turn Dynamic Bakery Flow (Standalone Name & Item Intake):");
  {
    const { processConversationTurn } = await import("../src/lib/ai/orchestrator");
    const biz = storageRepo.getBusiness("biz_cake_haven")!;

    // Turn 1: Caller introduces with standalone name "Lakshmi"
    const turn1 = await processConversationTurn({
      business: biz,
      workflow: CAKE_SHOP_WORKFLOW,
      conversationHistory: [
        { id: "init", conversationId: "c1", role: "assistant", content: CAKE_SHOP_WORKFLOW.greeting, timestamp: "" }
      ],
      latestUserMessage: "Lakshmi",
      extractedFields: {},
      callerPhone: "+1 (555) 349-8800",
    });

    assert(turn1.updatedExtractedFields.customer_name === "Lakshmi", "Turn 1 extracts standalone name 'Lakshmi'");
    assert(turn1.reply.includes("Lakshmi"), "Turn 1 addresses Lakshmi by name warmly");
    assert(!turn1.reply.includes("May I have your name"), "Turn 1 DOES NOT repeat name question to Lakshmi");

    // Turn 2: Caller says "chocolate cake"
    const turn2MsgHistory = [
      { id: "init", conversationId: "c1", role: "assistant" as const, content: CAKE_SHOP_WORKFLOW.greeting, timestamp: "" },
      { id: "m1", conversationId: "c1", role: "user" as const, content: "Lakshmi", timestamp: "" },
      { id: "m2", conversationId: "c1", role: "assistant" as const, content: turn1.reply, timestamp: "" },
    ];

    const turn2 = await processConversationTurn({
      business: biz,
      workflow: CAKE_SHOP_WORKFLOW,
      conversationHistory: turn2MsgHistory,
      latestUserMessage: "chocolate cake",
      extractedFields: turn1.updatedExtractedFields,
      callerPhone: "+1 (555) 349-8800",
    });

    assert(turn2.updatedExtractedFields.flavor.toLowerCase().includes("chocolate"), "Turn 2 extracts chocolate flavor");
    assert(!turn2.reply.includes("May I have your name"), "Turn 2 DOES NOT ask for name again");
    assert(turn2.reply.includes("weight") || turn2.reply.includes("size") || turn2.reply.includes("kg"), "Turn 2 dynamically asks for weight/size");
  }

  console.log("\n==========================================");
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log("==========================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution encountered an error:", err);
  process.exit(1);
});
