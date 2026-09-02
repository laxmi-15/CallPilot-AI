import { Workflow, WorkflowField, WorkflowCondition, UrgencyLevel } from "@/types";

export interface EvaluationResult {
  isComplete: boolean;
  missingRequiredFields: WorkflowField[];
  nextField: WorkflowField | null;
  urgency: UrgencyLevel;
  actionsToTrigger: string[];
  fieldValues: Record<string, any>;
  summary: string;
}

export function validateFieldValue(field: WorkflowField, value: any): { isValid: boolean; error?: string } {
  if (value === undefined || value === null || value === "") {
    if (field.required) {
      return { isValid: false, error: `${field.label} is required.` };
    }
    return { isValid: true };
  }

  switch (field.type) {
    case "number": {
      const num = Number(value);
      if (isNaN(num)) {
        return { isValid: false, error: `${field.label} must be a valid number.` };
      }
      return { isValid: true };
    }
    case "email": {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (typeof value === "string" && !emailRegex.test(value.trim())) {
        return { isValid: false, error: `${field.label} must be a valid email address.` };
      }
      return { isValid: true };
    }
    case "phone": {
      const cleaned = String(value).replace(/\D/g, "");
      if (cleaned.length < 7) {
        return { isValid: false, error: `${field.label} must be a valid phone number.` };
      }
      return { isValid: true };
    }
    case "boolean": {
      if (typeof value !== "boolean" && value !== "true" && value !== "false") {
        return { isValid: false, error: `${field.label} must be true or false.` };
      }
      return { isValid: true };
    }
    case "date": {
      // accepts standard date or descriptive strings
      return { isValid: true };
    }
    case "select": {
      if (field.options && field.options.length > 0) {
        const valStr = String(value).toLowerCase();
        const found = field.options.some((opt) => opt.toLowerCase().includes(valStr) || valStr.includes(opt.toLowerCase()));
        if (!found) {
          // Soft validation for conversational flexibility
          return { isValid: true };
        }
      }
      return { isValid: true };
    }
    default:
      return { isValid: true };
  }
}

export function getMissingRequiredFields(workflow: Workflow, extractedData: Record<string, any>): WorkflowField[] {
  const sortedFields = [...workflow.fields].sort((a, b) => a.order - b.order);
  return sortedFields.filter((field) => {
    if (!field.required) return false;
    const val = extractedData[field.name];
    return val === undefined || val === null || val === "" || (typeof val === "string" && val.trim() === "");
  });
}

export function getNextFieldToAsk(workflow: Workflow, extractedData: Record<string, any>): WorkflowField | null {
  const missing = getMissingRequiredFields(workflow, extractedData);
  if (missing.length > 0) {
    return missing[0];
  }
  // If all required are filled, check if any optional fields are remaining that have not been asked
  const sortedFields = [...workflow.fields].sort((a, b) => a.order - b.order);
  const unpopulated = sortedFields.filter((field) => {
    const val = extractedData[field.name];
    return val === undefined || val === null || val === "";
  });
  return unpopulated[0] || null;
}

export function evaluateCondition(
  condition: WorkflowCondition,
  extractedData: Record<string, any>,
  fields: WorkflowField[]
): { matches: boolean; urgency?: UrgencyLevel; action?: string } {
  const targetField = fields.find((f) => f.id === condition.fieldId);
  if (!targetField) return { matches: false };

  const rawValue = extractedData[targetField.name];
  if (rawValue === undefined || rawValue === null) {
    if (condition.operator === "is_not_set") {
      return { matches: true, urgency: condition.thenUrgency, action: condition.thenAction };
    }
    return { matches: false, urgency: condition.elseUrgency, action: condition.elseAction };
  }

  let isMatch = false;

  switch (condition.operator) {
    case "equals": {
      isMatch = String(rawValue).trim().toLowerCase() === String(condition.value).trim().toLowerCase();
      break;
    }
    case "not_equals": {
      isMatch = String(rawValue).trim().toLowerCase() !== String(condition.value).trim().toLowerCase();
      break;
    }
    case "contains": {
      isMatch = String(rawValue).toLowerCase().includes(String(condition.value).toLowerCase());
      break;
    }
    case "greater_than": {
      isMatch = Number(rawValue) > Number(condition.value);
      break;
    }
    case "less_than": {
      isMatch = Number(rawValue) < Number(condition.value);
      break;
    }
    case "less_than_or_equal": {
      isMatch = Number(rawValue) <= Number(condition.value);
      break;
    }
    case "is_set": {
      isMatch = String(rawValue).trim().length > 0;
      break;
    }
    case "is_not_set": {
      isMatch = String(rawValue).trim().length === 0;
      break;
    }
    case "within_hours": {
      const hoursThreshold = Number(condition.value) || 24;
      const strVal = String(rawValue).toLowerCase();
      
      // Heuristic parsing for text dates & relative hours (e.g. "by 6 hours", "in 2 hours", "today", "kal")
      const hourMatch = strVal.match(/(\d+(?:\.\d+)?)\s*(?:hour|hours|hr|hrs|ghante|ghanta)/i);
      if (hourMatch) {
        const numHours = parseFloat(hourMatch[1]);
        if (!isNaN(numHours) && numHours <= hoursThreshold) {
          isMatch = true;
          break;
        }
      }

      if (
        strVal.includes("today") ||
        strVal.includes("aaj") ||
        strVal.includes("urgent") ||
        strVal.includes("asap") ||
        strVal.includes("now") ||
        strVal.includes("tonight") ||
        strVal.includes("emergency")
      ) {
        isMatch = true;
      } else if (
        strVal.includes("tomorrow") ||
        strVal.includes("kal") ||
        strVal.includes("24 hour") ||
        strVal.includes("1 day")
      ) {
        isMatch = true;
      } else {
        const parsed = new Date(rawValue);
        if (!isNaN(parsed.getTime())) {
          const diffMs = parsed.getTime() - Date.now();
          const diffHours = diffMs / (1000 * 60 * 60);
          isMatch = diffHours >= 0 && diffHours <= hoursThreshold;
        } else {
          isMatch = false;
        }
      }
      break;
    }
  }

  if (isMatch) {
    return { matches: true, urgency: condition.thenUrgency, action: condition.thenAction };
  } else {
    return { matches: false, urgency: condition.elseUrgency, action: condition.elseAction };
  }
}

export function evaluateAllConditions(
  workflow: Workflow,
  extractedData: Record<string, any>
): { finalUrgency: UrgencyLevel; actionsToTrigger: string[] } {
  let finalUrgency: UrgencyLevel = "NORMAL";
  const actionsToTrigger: string[] = [];

  for (const condition of workflow.conditions) {
    const res = evaluateCondition(condition, extractedData, workflow.fields);
    if (res.matches) {
      if (res.urgency) {
        if (res.urgency === "CRITICAL" || (res.urgency === "HIGH" && finalUrgency !== "CRITICAL")) {
          finalUrgency = res.urgency;
        }
      }
      if (res.action && !actionsToTrigger.includes(res.action)) {
        actionsToTrigger.push(res.action);
      }
    } else {
      if (res.urgency && finalUrgency === "NORMAL") {
        finalUrgency = res.urgency;
      }
      if (res.action && !actionsToTrigger.includes(res.action)) {
        actionsToTrigger.push(res.action);
      }
    }
  }

  return { finalUrgency, actionsToTrigger };
}

export function generateStructuredSummary(workflow: Workflow, extractedData: Record<string, any>): string {
  const fields = workflow.fields;
  const entries: string[] = [];

  for (const field of fields) {
    const val = extractedData[field.name];
    if (val !== undefined && val !== null && val !== "") {
      entries.push(`- **${field.label}**: ${val}`);
    }
  }

  if (entries.length === 0) {
    return "No customer details captured yet.";
  }

  return `### Captured Details (${workflow.name})\n${entries.join("\n")}`;
}

export function evaluateWorkflow(workflow: Workflow, extractedData: Record<string, any>): EvaluationResult {
  const missing = getMissingRequiredFields(workflow, extractedData);
  const nextField = getNextFieldToAsk(workflow, extractedData);
  const { finalUrgency, actionsToTrigger } = evaluateAllConditions(workflow, extractedData);
  const summary = generateStructuredSummary(workflow, extractedData);

  return {
    isComplete: missing.length === 0,
    missingRequiredFields: missing,
    nextField,
    urgency: finalUrgency,
    actionsToTrigger,
    fieldValues: extractedData,
    summary,
  };
}
