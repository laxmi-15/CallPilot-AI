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
      time: "3:00 PM",
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
