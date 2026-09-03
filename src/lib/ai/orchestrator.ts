import { Business, Workflow, Message, ToolCallRecord, UrgencyLevel, LanguageCode, WorkflowField } from "@/types";
import { toolRegistry } from "../tools/registry";
import { evaluateWorkflow } from "../workflow/engine";
import { generateId } from "../utils";

export interface AIProcessInput {
  business: Business;
  workflow: Workflow;
  conversationHistory: Message[];
  latestUserMessage: string;
  extractedFields: Record<string, any>;
  callerPhone?: string;
  apiKey?: string;
  language?: LanguageCode;
  lastAskedField?: string;
}

export interface AIProcessOutput {
  reply: string;
  updatedExtractedFields: Record<string, any>;
  toolCallsExecuted: ToolCallRecord[];
  urgency: UrgencyLevel;
  isComplete: boolean;
  intent: string;
  detectedLanguage: LanguageCode;
  summary: string;
}

// Detect language (English vs Hindi / Hinglish vs Kannada) - Strict and robust
export function detectLanguage(text: string, currentLang: LanguageCode = "en"): LanguageCode {
  if (!text) return currentLang;

  // 1. Kannada Unicode block Check (U+0C80 to U+0CFF)
  const hasKannada = /[\u0C80-\u0CFF]/.test(text);
  if (hasKannada) return "kn";

  // 2. Kannada keywords in Roman script
  const kannadaKeywords = [
    "namaskara", "beku", "naale", "ivattu", "indu", "samaya", "hesaru", "eshtu",
    "madabeku", "hogi", "banni", "kodu", "illi", "nanna", "nanage", "yaavaga", "yelli",
    "houdu", "sari", "dhanyavadagalu", "matte", "kushi"
  ];
  const lower = text.toLowerCase();
  const hasKannadaRoman = kannadaKeywords.some((word) => new RegExp(`\\b${word}\\b`, "i").test(lower));
  if (hasKannadaRoman) return "kn";

  // 3. Devanagari Hindi Check (U+0900 to U+097F)
  const hasDevanagari = /[\u0900-\u097F]/.test(text);
  if (hasDevanagari) return "hi";

  // 4. Hindi keywords in Roman script
  const hindiKeywords = [
    "namaste", "chahiye", "karna", "mera", "naam", "kitna", "rupaye", "mujhe",
    "shukriya", "dhanyawad", "shubh", "bhai", "karo", "kab", "kaha", "kripya", "theek",
    "parson", "subah", "shaam", "dopahar", "ghante", "ghanta", "haan", "ji"
  ];
  const hasHinglish = hindiKeywords.some((word) => new RegExp(`\\b${word}\\b`, "i").test(lower));
  if (hasHinglish) return "hinglish";

  return currentLang;
}

// Helper: Identify which field the assistant previously inquired about
export function identifyLastAskedField(
  conversationHistory: Message[],
  workflow: Workflow
): WorkflowField | null {
  if (!conversationHistory || conversationHistory.length === 0) return null;

  for (let i = conversationHistory.length - 1; i >= 0; i--) {
    const msg = conversationHistory[i];
    if (msg.role === "assistant" && msg.content) {
      const contentLower = msg.content.toLowerCase();
      for (const field of workflow.fields) {
        if (
          (field.question && contentLower.includes(field.question.toLowerCase().slice(0, 20))) ||
          (field.questionHi && contentLower.includes(field.questionHi.slice(0, 15))) ||
          (field.questionKn && contentLower.includes(field.questionKn.slice(0, 15))) ||
          contentLower.includes(field.label.toLowerCase())
        ) {
          return field;
        }
      }

      if (contentLower.includes("name") || contentLower.includes("naam") || contentLower.includes("ಹೆಸರು") || contentLower.includes("hesaru")) {
        const nf = workflow.fields.find((f) => f.name === "customer_name" || f.name === "patient_name" || f.name === "caller_name");
        if (nf) return nf;
      }
      if (contentLower.includes("flavor") || contentLower.includes("flavour") || contentLower.includes("फ्लेवर") || contentLower.includes("ಫ್ಲೇವರ್")) {
        const ff = workflow.fields.find((f) => f.name === "flavor");
        if (ff) return ff;
      }
      if (contentLower.includes("size") || contentLower.includes("weight") || contentLower.includes("kg") || contentLower.includes("किलो") || contentLower.includes("ಕೆಜಿ")) {
        const wf = workflow.fields.find((f) => f.name === "weight");
        if (wf) return wf;
      }
      if (contentLower.includes("date") || contentLower.includes("time") || contentLower.includes("when") || contentLower.includes("तारीख") || contentLower.includes("समय") || contentLower.includes("ದಿನಾಂಕ") || contentLower.includes("ಸಮಯ")) {
        const df = workflow.fields.find((f) => f.name === "required_date" || f.name === "preferred_date" || f.name === "visit_date" || f.name === "preferred_time");
        if (df) return df;
      }
      if (contentLower.includes("message") || contentLower.includes("written") || contentLower.includes("संदेश") || contentLower.includes("ಸಂದೇಶ")) {
        const mf = workflow.fields.find((f) => f.name === "custom_message");
        if (mf) return mf;
      }
      if (contentLower.includes("pickup") || contentLower.includes("delivery") || contentLower.includes("डिलीवरी") || contentLower.includes("ಡೆಲಿವರಿ")) {
        const dtf = workflow.fields.find((f) => f.name === "delivery_type");
        if (dtf) return dtf;
      }
      if (contentLower.includes("budget") || contentLower.includes("बजट") || contentLower.includes("ಬಜೆಟ್")) {
        const bf = workflow.fields.find((f) => f.name === "budget");
        if (bf) return bf;
      }
      if (contentLower.includes("phone") || contentLower.includes("number") || contentLower.includes("नंबर") || contentLower.includes("ಸಂಖ್ಯೆ")) {
        const pf = workflow.fields.find((f) => f.name === "phone_number");
        if (pf) return pf;
      }
      if (contentLower.includes("doctor") || contentLower.includes("specialist") || contentLower.includes("डॉक्टर") || contentLower.includes("ವೈದ್ಯ")) {
        const docf = workflow.fields.find((f) => f.name === "doctor_speciality");
        if (docf) return docf;
      }
    }
  }
  return null;
}

// Clean and extract a name from free-form user message in English, Hindi, and Kannada
export function parseCleanName(rawText: string): string | null {
  let cleaned = rawText.trim();
  if (!cleaned) return null;

  // Kannada name patterns
  const knMatch = cleaned.match(/(?:ನನ್ನ\s*ಹೆಸರು|ನಾನು|ಹೆಸರು)\s+([^\s,.]+)(?:\s+([^\s,.]+))?/u);
  if (knMatch && knMatch[1]) {
    return `${knMatch[1]}${knMatch[2] ? " " + knMatch[2] : ""}`.trim();
  }

  // English & Hindi name patterns
  const patterns = [
    /^(?:my\s+name\s+is|i\s+am|this\s+is|call\s+me|name['’]s|naam\s+hai|mera\s+naam|myself|it['’]s|it\s+is|here\s+is)\s+([A-Za-z\s.'-]+?)(?:\s+(?:is\s+my\s+name|here|please|speaking))?$/i,
    /^([A-Za-z\s.'-]+?)\s+(?:is\s+my\s+name|here|speaking|naam\s+hai)$/i,
  ];

  for (const pat of patterns) {
    const match = cleaned.match(pat);
    if (match && match[1]) {
      cleaned = match[1].trim();
      break;
    }
  }

  cleaned = cleaned.replace(/^(?:hi|hello|hey|yes|yeah|sure|okay|ok|namaste|namaskara|ji|haan|sari|houdu)\s*[,.-]?\s*/i, "");
  cleaned = cleaned.replace(/\s*[,.-]?\s*(?:please|thanks|thank you|shukriya|dhanyawadagalu|ji)$/i, "");
  cleaned = cleaned.replace(/\b(?:is\s+my\s+name|my\s+name\s+is|mera\s+naam\s+hai|mera\s+naam|nanna\s+hesaru)\b/gi, "").trim();

  // If Kannada script text remains
  if (/[\u0C80-\u0CFF]/.test(cleaned)) {
    const knWords = cleaned.split(/\s+/).filter(Boolean);
    const stopWordsKn = ["ಕೇಕ್", "ಆರ್ಡರ್", "ಅಪಾಯಿಂಟ್ಮೆಂಟ್", "ಡಾಕ್ಟರ್", "ವೈದ್ಯರು", "ಬೇಕು", "ನಾಳೆ", "ಸಂಜೆ", "ಬೆಳಿಗ್ಗೆ", "ಚಾಕೊಲೇಟ್"];
    const filtered = knWords.filter((w) => !stopWordsKn.includes(w));
    if (filtered.length >= 1 && filtered.length <= 3) {
      return filtered.join(" ");
    }
  }

  const words = cleaned.split(/\s+/).filter(Boolean);
  const stopWords = [
    "cake", "chocolate", "vanilla", "velvet", "truffle", "order", "delivery", "pickup", "urgent",
    "book", "appointment", "doctor", "track", "package", "need", "want", "help", "kg", "kilo",
    "today", "tomorrow", "tonight", "morning", "evening", "afternoon", "pm", "am", "hours",
    "birthday", "wedding", "anniversary", "custom", "message", "pastry", "cupcake"
  ];

  if (words.length >= 1 && words.length <= 4) {
    const hasStopWord = words.some((w) => stopWords.includes(w.toLowerCase()));
    if (!hasStopWord && /^[A-Za-z.'-]+(\s+[A-Za-z.'-]+)*$/.test(cleaned)) {
      return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    }
  }

  return null;
}

// Comprehensive Dynamic Date Parser across English, Hindi, and Kannada
export function parseDynamicDate(text: string): string | null {
  const lower = text.toLowerCase();

  const monthsMap: Record<string, string> = {
    january: "January", jan: "January", "जनवरी": "January", "ಜನವರಿ": "January",
    february: "February", feb: "February", "फरवरी": "February", "ಫೆಬ್ರವರಿ": "February",
    march: "March", mar: "March", "मार्च": "March", "ಮಾರ್ಚ್": "March",
    april: "April", apr: "April", "अप्रैल": "April", "ಏಪ್ರಿಲ್": "April",
    may: "May", "मई": "May", "ಮೇ": "May",
    june: "June", jun: "June", "जून": "June", "ಜೂನ್": "June",
    july: "July", jul: "July", "जुलाई": "July", "ಜುಲೈ": "July",
    august: "August", aug: "August", "अगस्त": "August", "ಆಗಸ್ಟ್": "August",
    september: "September", sept: "September", sep: "September", "सितंबर": "September", "सितम्बर": "September", "ಸೆಪ್ಟೆಂಬರ್": "September",
    october: "October", oct: "October", "अक्टूबर": "October", "ಅಕ್ಟೋಬರ್": "October",
    november: "November", nov: "November", "नवंबर": "November", "ನವೆಂಬರ್": "November",
    december: "December", dec: "December", "दिसंबर": "December", "ಡಿಸೆಂಬರ್": "December",
  };

  const monthRegexPart = Object.keys(monthsMap).join("|");

  // 1. Month followed by Day: e.g. "September 4", "Sept 4th", "सितंबर 4", "ಸೆಪ್ಟೆಂಬರ್ 4", "september 4 not 3"
  const m1 = text.match(new RegExp(`(?:${monthRegexPart})\\.?\\s*(\\d{1,2})(?:st|nd|rd|th)?`, "i"));
  if (m1) {
    const rawMonth = m1[0].replace(/\.?\s*\d{1,2}.*$/, "").toLowerCase().trim();
    const day = parseInt(m1[1], 10);
    const stdMonth = monthsMap[rawMonth] || "September";
    return `${stdMonth} ${day}`;
  }

  // 2. Day followed by Month: e.g. "4th of September", "4 September", "4th Sept", "4 ಸೆಪ್ಟೆಂಬರ್", "4 सितंबर"
  const m2 = text.match(new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:of\\s+)?(${monthRegexPart})`, "i"));
  if (m2) {
    const day = parseInt(m2[1], 10);
    const rawMonth = m2[2].toLowerCase().trim();
    const stdMonth = monthsMap[rawMonth] || "September";
    return `${stdMonth} ${day}`;
  }

  // 3. Negation handling: "4 not 3", "4th not 3rd"
  const mNot = text.match(/(?:at|on|for)?\s*(\d{1,2})(?:st|nd|rd|th)?\s*(?:not|\bno\b)/i);
  if (mNot) {
    const day = parseInt(mNot[1], 10);
    return `September ${day}`;
  }

  // 4. ISO Date format: 2026-09-04
  const isoMatch = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) {
    const mNum = parseInt(isoMatch[2], 10);
    const dNum = parseInt(isoMatch[3], 10);
    const mNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return `${mNames[mNum - 1] || "September"} ${dNum}`;
  }

  // 5. Relative Day Names
  if (lower.includes("day after tomorrow") || lower.includes("parson") || text.includes("परसों") || text.includes("ನಾಡಿದ್ದು")) {
    return "Day after tomorrow";
  }
  if (lower.includes("tomorrow") || lower.includes("kal") || text.includes("कल") || text.includes("ನಾಳೆ")) {
    return "Tomorrow";
  }
  if (lower.includes("today") || lower.includes("aaj") || text.includes("आज") || text.includes("ಇಂದು") || text.includes("ಇವತ್ತು")) {
    return "Today";
  }
  if (lower.includes("friday") || text.includes("शुक्रवार") || text.includes("ಶುಕ್ರವಾರ")) {
    return "This Friday";
  }
  if (lower.includes("saturday") || text.includes("शनिवार") || text.includes("ಶನಿವಾರ")) {
    return "This Saturday";
  }
  if (lower.includes("sunday") || text.includes("रविवार") || text.includes("ಭಾನುವಾರ")) {
    return "This Sunday";
  }
  if (lower.includes("monday") || text.includes("सोमवार") || text.includes("ಸೋಮವಾರ")) {
    return "This Monday";
  }
  if (lower.includes("tuesday") || text.includes("मंगलवार") || text.includes("ಮಂಗಳವಾರ")) {
    return "This Tuesday";
  }
  if (lower.includes("wednesday") || text.includes("बुधवार") || text.includes("ಬುಧವಾರ")) {
    return "This Wednesday";
  }
  if (lower.includes("thursday") || text.includes("गुरुवार") || text.includes("ಗುರುವಾರ")) {
    return "This Thursday";
  }

  return null;
}

// Extract entities and structured fields from natural language text with contextual slot filling
export function extractFieldsFromText(
  text: string,
  workflow: Workflow,
  currentFields: Record<string, any>,
  conversationHistory: Message[] = []
): { extracted: Record<string, any>; intent: string } {
  const extracted: Record<string, any> = { ...currentFields };
  const lower = text.toLowerCase().trim();
  let intent = "general_inquiry";

  // Check for dynamic date in current turn
  const dynamicDate = parseDynamicDate(text);
  if (dynamicDate) {
    if (workflow.fields.some((f) => f.name === "preferred_date")) {
      extracted.preferred_date = dynamicDate;
    }
    if (workflow.fields.some((f) => f.name === "required_date")) {
      extracted.required_date = dynamicDate;
    }
    if (workflow.fields.some((f) => f.name === "visit_date")) {
      extracted.visit_date = dynamicDate;
    }
  }

  // 1. Standalone Name Discovery (works anywhere, including first turn, e.g. "Lakshmi", "Priya", "Rahul")
  if (workflow.fields.some((f) => f.name === "customer_name" || f.name === "patient_name")) {
    const nameKey = workflow.fields.some((f) => f.name === "patient_name") ? "patient_name" : "customer_name";
    if (!extracted[nameKey]) {
      const candidateName = parseCleanName(text);
      if (candidateName) {
        extracted[nameKey] = candidateName;
      }
    }
  }

  // 2. CONTEXT-AWARE SLOT FILLING: Check what the assistant previously asked for
  const lastAskedField = identifyLastAskedField(conversationHistory, workflow);

  if (lastAskedField && (!extracted[lastAskedField.name] || extracted[lastAskedField.name] === "")) {
    const fieldName = lastAskedField.name;

    if (fieldName === "customer_name" || fieldName === "patient_name" || fieldName === "caller_name") {
      const parsedName = parseCleanName(text);
      if (parsedName) {
        extracted[fieldName] = parsedName;
      }
    } else if (fieldName === "flavor") {
      const knownFlavors = [
        "chocolate truffle", "chocolate", "red velvet", "butterscotch", "vanilla bean",
        "vanilla", "black forest", "white forest", "pineapple", "mango", "strawberry",
        "lotus biscoff", "biscoff", "blueberry", "fruit cake", "coffee chocolate", "ferrero rocher"
      ];
      const match = knownFlavors.find((f) => lower.includes(f));
      if (match) {
        extracted.flavor = match.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      } else if (text.includes("ಚಾಕೊಲೇಟ್")) {
        extracted.flavor = "Chocolate truffle";
      } else if (text.includes("ವೆನಿಲ್ಲಾ")) {
        extracted.flavor = "Vanilla Bean";
      } else if (text.includes("ರೆಡ್ ವೆಲ್ವೆಟ್")) {
        extracted.flavor = "Red Velvet";
      } else if (lower.length > 2 && !lower.includes("not sure") && !lower.includes("no")) {
        extracted.flavor = text.trim().split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      }
    } else if (fieldName === "cake_type") {
      if (lower.includes("birthday") || lower.includes("bday") || lower.includes("जनमदिन") || text.includes("ಜನ್ಮದಿನ") || text.includes("ಹುಟ್ಟುಹಬ್ಬ")) {
        extracted.cake_type = "Birthday Cake";
      } else if (lower.includes("wedding") || lower.includes("shaadi") || lower.includes("शादी") || text.includes("ಮದುವೆ")) {
        extracted.cake_type = "Wedding Cake";
      } else if (lower.includes("anniversary") || lower.includes("एनिवर्सरी") || text.includes("ವಾರ್ಷಿಕೋತ್ಸವ")) {
        extracted.cake_type = "Anniversary Cake";
      } else if (lower.includes("cupcake") || lower.includes("pastry") || lower.includes("पेस्ट्री") || text.includes("ಪೇಸ್ಟ್ರಿ")) {
        extracted.cake_type = "Pastries / Cupcakes";
      } else if (text.trim().length > 2) {
        extracted.cake_type = text.trim();
      }
    } else if (fieldName === "weight") {
      const wMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilo|pound|lbs|person|people|servings|grams|g|gm|ಕೆಜಿ|ಕಿಲೋ)/i);
      if (wMatch) {
        extracted.weight = `${wMatch[1]} kg`;
      } else if (lower.includes("half kg") || lower.includes("500g") || lower.includes("आधा किलो") || text.includes("ಅರ್ಧ ಕೆಜಿ")) {
        extracted.weight = "0.5 kg (Half kg)";
      } else if (lower.includes("1 kg") || lower.includes("one kg") || lower.includes("1kg") || text.includes("1 ಕೆಜಿ")) {
        extracted.weight = "1 kg";
      } else if (lower.includes("2 kg") || lower.includes("two kg") || lower.includes("2kg") || text.includes("2 ಕೆಜಿ")) {
        extracted.weight = "2 kg";
      } else if (text.trim().length > 0) {
        extracted.weight = text.trim();
      }
    } else if (fieldName === "required_date" || fieldName === "preferred_date") {
      const hourRelMatch = text.match(/(?:by|in|within)?\s*(\d+(?:\.\d+)?)\s*(?:hour|hours|hr|hrs|ghante|ghanta|ಗಂಟೆ|ಗಂಟೆಗಳಲ್ಲಿ|ಗಂಟೆಯಲ್ಲಿ)/i);
      if (hourRelMatch) {
        extracted[fieldName] = `In ${hourRelMatch[1]} hours (Today Urgent)`;
      } else if (dynamicDate) {
        extracted[fieldName] = dynamicDate;
      } else if (lower.includes("today") || lower.includes("aaj") || lower.includes("tonight") || text.includes("ಇಂದು") || text.includes("ಇವತ್ತು")) {
        extracted[fieldName] = "Today (Urgent)";
      } else if (lower.includes("tomorrow") || lower.includes("kal") || text.includes("ನಾಳೆ")) {
        const timePart = text.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm|baje|o'clock|ಗಂಟೆ))/i)?.[0];
        extracted[fieldName] = timePart ? `Tomorrow at ${timePart}` : "Tomorrow";
      } else if (text.trim().length > 2) {
        extracted[fieldName] = text.trim();
      }
    } else if (fieldName === "custom_message") {
      const isNegative = ["no", "none", "nothing", "no message", "skip", "nah", "nahi", "not needed", "no thanks", "ಬೇಡ", "ಏನೂ ಇಲ್ಲ"].some(
        (neg) => lower === neg || lower.startsWith(neg + " ") || lower.endsWith(" " + neg)
      );
      if (isNegative) {
        extracted.custom_message = "None";
      } else if (text.trim().length > 1) {
        extracted.custom_message = text.trim().replace(/^['"]|['"]$/g, "");
      }
    } else if (fieldName === "delivery_type") {
      if (lower.includes("pickup") || lower.includes("pick up") || lower.includes("store") || text.includes("ಪಿಕಪ್") || text.includes("ಅಂಗಡಿ")) {
        extracted.delivery_type = "Store Pickup";
      } else if (lower.includes("delivery") || lower.includes("deliver") || lower.includes("home") || text.includes("ಡೆಲಿವರಿ") || text.includes("ಮನೆ")) {
        extracted.delivery_type = "Home Delivery";
      } else if (text.trim().length > 2) {
        extracted.delivery_type = text.trim();
      }
    } else if (fieldName === "budget") {
      const isNegative = ["no", "none", "skip", "flexible", "not sure", "open", "ಗೊತ್ತಿಲ್ಲ"].some((b) => lower.includes(b));
      if (isNegative) {
        extracted.budget = "Flexible";
      } else {
        const budgetMatch =
          text.match(/(?:rs\.?|inr|₹|\$)\s*(\d+)/i) ||
          text.match(/(\d+)\s*(?:rupees|bucks|dollars|ರೂಪಾಯಿ)/i) ||
          text.match(/(?:budget\s*(?:is|of|around)?\s*[:=]?\s*)(\d+)/i);
        if (budgetMatch) {
          extracted.budget = `₹${budgetMatch[1]}`;
        } else if (text.trim().length > 0) {
          extracted.budget = text.trim();
        }
      }
    } else if (fieldName === "phone_number") {
      const phoneMatch = text.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/) || text.match(/\b\d{10}\b/);
      if (phoneMatch) {
        extracted.phone_number = phoneMatch[0];
      } else if (lower.includes("same") || lower.includes("this number") || text.includes("ಇದೇ ಸಂಖ್ಯೆ")) {
        extracted.phone_number = "+1 (555) 349-8800";
      }
    } else if (fieldName === "doctor_speciality") {
      if (lower.includes("sharma") || lower.includes("physician") || lower.includes("general") || text.includes("ಶರ್ಮಾ")) {
        extracted.doctor_speciality = "General Physician (Dr. Sharma)";
      } else if (lower.includes("kapoor") || lower.includes("dentist") || lower.includes("tooth") || lower.includes("teeth") || text.includes("ಕಪೂರ್") || text.includes("ಹಲ್ಲು")) {
        extracted.doctor_speciality = "Dentist (Dr. Kapoor)";
      } else if (lower.includes("mehta") || lower.includes("cardio") || lower.includes("heart") || text.includes("ಮೆಹ್ತಾ") || text.includes("ಹೃದಯ")) {
        extracted.doctor_speciality = "Cardiologist (Dr. Mehta)";
      } else if (lower.includes("patel") || lower.includes("skin") || lower.includes("derma") || text.includes("ಪಟೇಲ್") || text.includes("ಚರ್ಮ")) {
        extracted.doctor_speciality = "Dermatologist (Dr. Patel)";
      } else if (text.trim().length > 2) {
        extracted.doctor_speciality = text.trim();
      }
    }
  }

  // 3. BROAD MULTI-ENTITY EXTRACTION (Cross-field detection)
  const globalPhoneMatch = text.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/) || text.match(/\b\d{10}\b/);
  if (globalPhoneMatch && !extracted.phone_number) {
    extracted.phone_number = globalPhoneMatch[0];
  }

  // Explicit name patterns (e.g. "my name is Rahul")
  const knNameDirect = text.match(/(?:ನನ್ನ\s*ಹೆಸರು|ನಾನು|ಹೆಸರು)\s+([^\s,.]+)(?:\s+([^\s,.]+))?/u);
  if (knNameDirect && knNameDirect[1]) {
    const kName = `${knNameDirect[1]}${knNameDirect[2] ? " " + knNameDirect[2] : ""}`.trim();
    if (workflow.fields.some((f) => f.name === "customer_name" || f.name === "patient_name")) {
      const nameField = workflow.fields.find((f) => f.name === "customer_name" || f.name === "patient_name");
      if (nameField && !extracted[nameField.name]) {
        extracted[nameField.name] = kName;
      }
    }
  }

  const hiNameDirect = text.match(/(?:मेरा\s*नाम|नाम\s*है|मैं\s*हूँ|मैं)\s+([^\s,।]+)(?:\s+([^\s,।]+))?/u);
  if (hiNameDirect && hiNameDirect[1]) {
    const hName = `${hiNameDirect[1]}${hiNameDirect[2] ? " " + hiNameDirect[2] : ""}`.trim();
    if (workflow.fields.some((f) => f.name === "customer_name" || f.name === "patient_name")) {
      const nameField = workflow.fields.find((f) => f.name === "customer_name" || f.name === "patient_name");
      if (nameField && !extracted[nameField.name]) {
        extracted[nameField.name] = hName;
      }
    }
  }

  const nameExplicitPatterns = [
    /(?:my name is|i am|this is|call me|name's|naam hai|mera naam|myself)\s+([A-Za-z]+)(?:\s+([A-Za-z]+))?/i,
    /([A-Za-z]+)(?:\s+([A-Za-z]+))?\s+(?:is my name|here|speaking)/i,
  ];
  for (const pat of nameExplicitPatterns) {
    const m = text.match(pat);
    if (m && m[1]) {
      const stopWords = ["and", "i", "a", "the", "booking", "looking", "interested", "need", "for", "please", "here", "cake", "doctor", "hi", "hello"];
      const firstName = m[1].trim();
      const secondName = m[2] && !stopWords.includes(m[2].toLowerCase()) ? ` ${m[2].trim()}` : "";
      if (!stopWords.includes(firstName.toLowerCase())) {
        const fullName = `${firstName}${secondName}`;
        if (workflow.fields.some((f) => f.name === "customer_name" || f.name === "patient_name")) {
          const nameField = workflow.fields.find((f) => f.name === "customer_name" || f.name === "patient_name");
          if (nameField && !extracted[nameField.name]) {
            extracted[nameField.name] = fullName;
          }
        }
      }
    }
  }

  // Clinic Specific Intent & Field extraction
  if (workflow.industry === "clinic") {
    if (lower.includes("book") || lower.includes("appointment") || lower.includes("consult") || text.includes("बुकिंग") || text.includes("अपॉइंटमेंट") || text.includes("मिलना") || text.includes("ಬುಕ್") || text.includes("ಅಪಾಯಿಂಟ್ಮೆಂಟ್") || text.includes("ಭೇಟಿ")) {
      intent = "book_appointment";
    }

    if (lower.includes("tooth") || lower.includes("teeth") || lower.includes("dentist") || text.includes("ಹಲ್ಲು")) {
      extracted.doctor_speciality = "Dentist (Dr. Kapoor)";
    } else if (lower.includes("sharma") || lower.includes("physician") || lower.includes("general") || text.includes("ಶರ್ಮಾ")) {
      extracted.doctor_speciality = "General Physician (Dr. Sharma)";
    } else if (lower.includes("mehta") || lower.includes("cardio") || lower.includes("heart") || text.includes("ಮೆಹ್ತಾ")) {
      extracted.doctor_speciality = "Cardiologist (Dr. Mehta)";
    }

    const timeRegex = /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm|baje|ಗಂಟೆ))\b/i;
    const timeMatch = text.match(timeRegex);
    if (timeMatch && !extracted.preferred_time) {
      extracted.preferred_time = timeMatch[0].toUpperCase();
    } else if (text.includes("सुबह 10") || text.includes("10 बजे") || text.includes("10 am") || text.includes("10:00 am") || text.includes("ಬೆಳಿಗ್ಗೆ 10")) {
      extracted.preferred_time = "10:00 AM";
    } else if (text.includes("दोपहर 3") || text.includes("3 बजे") || text.includes("3 pm") || text.includes("3:00 pm") || text.includes("ಮಧ್ಯಾಹ್ನ 3")) {
      extracted.preferred_time = "3:00 PM";
    }
  } else if (workflow.industry === "cake_shop") {
    intent = "cake_order_enquiry";
    if (!extracted.cake_type) {
      if (lower.includes("birthday") || lower.includes("bday") || text.includes("ಹುಟ್ಟುಹಬ್ಬ") || text.includes("ಜನ್ಮದಿನ")) extracted.cake_type = "Birthday Cake";
      else if (lower.includes("wedding") || lower.includes("shaadi") || text.includes("ಮದುವೆ")) extracted.cake_type = "Wedding Cake";
      else if (lower.includes("anniversary") || text.includes("ವಾರ್ಷಿಕೋತ್ಸವ")) extracted.cake_type = "Anniversary Cake";
      else if (lower.includes("cupcake") || lower.includes("pastry") || text.includes("ಪೇಸ್ಟ್ರಿ")) extracted.cake_type = "Pastries / Cupcakes";
      else if (lower.includes("cake") || text.includes("ಕೇಕ್")) extracted.cake_type = "Birthday Cake";
    }

    if (!extracted.flavor) {
      if (lower.includes("chocolate truffle") || lower.includes("chocolate") || text.includes("ಚಾಕೊಲೇಟ್")) {
        extracted.flavor = "Chocolate truffle";
      } else if (lower.includes("red velvet") || text.includes("ರೆಡ್ ವೆಲ್ವೆಟ್")) {
        extracted.flavor = "Red Velvet";
      } else if (lower.includes("butterscotch")) {
        extracted.flavor = "Butterscotch";
      } else if (lower.includes("vanilla bean") || lower.includes("vanilla") || text.includes("ವೆನಿಲ್ಲಾ")) {
        extracted.flavor = "Vanilla Bean";
      } else if (lower.includes("black forest")) {
        extracted.flavor = "Black Forest";
      } else if (lower.includes("pineapple")) {
        extracted.flavor = "Pineapple";
      } else if (lower.includes("strawberry")) {
        extracted.flavor = "Strawberry";
      }
    }

    if (!extracted.weight) {
      const weightMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilo|pound|lbs|person|people|servings|ಕೆಜಿ)/i);
      if (weightMatch) {
        extracted.weight = `${weightMatch[1]} kg`;
      } else if (lower.includes("half kg") || lower.includes("500g") || text.includes("ಅರ್ಧ ಕೆಜಿ")) {
        extracted.weight = "0.5 kg";
      }
    }
  } else if (workflow.industry === "delivery") {
    if (lower.includes("track") || lower.includes("status") || lower.includes("where is") || text.includes("ಟ್ರ್ಯಾಕ್") || text.includes("ಸ್ಥಿತಿ")) {
      intent = "track_delivery";
      extracted.request_type = "Status update";
    }
    const trackMatch = text.match(/\b(DEL-\d{4}|TRK-\d{6}|[A-Z0-9]{8,12})\b/i);
    if (trackMatch) {
      extracted.tracking_number = trackMatch[0].toUpperCase();
    }
  }

  if (workflow.fields.some((f) => f.name === "budget") && !extracted.budget) {
    const budgetMatch =
      text.match(/(?:rs\.?|inr|₹|\$)\s*(\d+)/i) ||
      text.match(/(\d+)\s*(?:rupees|bucks|dollars|ರೂಪಾಯಿ)/i) ||
      text.match(/(?:budget\s*(?:is|of|around)?\s*[:=]?\s*)(\d+)/i);
    if (budgetMatch) {
      extracted.budget = `₹${budgetMatch[1]}`;
    }
  }

  return { extracted, intent };
}

// =========================================================================
// GEMINI 1.5 FLASH / 2.0 API CALLER (Optional High-Intelligence LLM)
// =========================================================================
async function callGeminiOrchestrator(
  apiKey: string,
  business: Business,
  workflow: Workflow,
  conversationHistory: Message[],
  latestUserMessage: string,
  currentFields: Record<string, any>,
  detectedLang: LanguageCode
): Promise<{
  reply?: string;
  extractedFields?: Record<string, any>;
  intent?: string;
} | null> {
  try {
    const systemPrompt = `You are CallPilot AI, an ultra-intelligent, friendly voice phone assistant for "${business.name}" (${business.type}).
Workflow Goal: ${workflow.name} - ${workflow.description}.
Target Language: ${detectedLang === "kn" ? "Kannada (kn-IN)" : detectedLang === "hi" || detectedLang === "hinglish" ? "Hindi (hi-IN)" : "English (en-IN)"}.

Current Extracted Fields: ${JSON.stringify(currentFields)}
Workflow Required Fields: ${JSON.stringify(workflow.fields.map(f => ({ name: f.name, label: f.label, required: f.required })))}

Instructions:
1. Extract any new or updated fields from the caller's message (e.g. customer_name, flavor, weight, date, time, custom_message, etc.).
2. Generate a warm, natural, dynamic, conversational response in the target language.
3. NEVER repeat questions if the user has already provided the detail.
4. If a name was just given (e.g. "Lakshmi"), warmly greet the person by name ("Nice to meet you, Lakshmi!") and ask for the next missing information (e.g. cake flavor/size or date).
5. If cake flavor or details were just given (e.g. "chocolate cake"), acknowledge the choice warmly ("A chocolate cake sounds wonderful!") and ask for whatever is still missing.
6. Keep spoken replies concise, natural, and friendly (1-2 short sentences max for voice clarity).

Return ONLY valid JSON matching this schema:
{
  "extractedFields": { "field_name": "value" },
  "reply": "Conversational assistant reply",
  "intent": "Intent label"
}`;

    const promptMessages = [
      ...conversationHistory.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      })),
      {
        role: "user",
        parts: [{ text: latestUserMessage }]
      }
    ];

    const modelName = "gemini-2.0-flash";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: promptMessages,
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawJson) {
        return JSON.parse(rawJson);
      }
    }
  } catch (err) {
    console.warn("Gemini API call warning, using smart local reasoning:", err);
  }
  return null;
}

// Main AI conversational processor
export async function processConversationTurn(input: AIProcessInput): Promise<AIProcessOutput> {
  const { business, workflow, conversationHistory, latestUserMessage, extractedFields, callerPhone, apiKey } = input;

  const detectedLang = detectLanguage(latestUserMessage, input.language || workflow.language);
  const { extracted: localExtracted, intent: localIntent } = extractFieldsFromText(latestUserMessage, workflow, extractedFields, conversationHistory);

  let newFields: Record<string, any> = { ...localExtracted };
  let intent = localIntent;
  const toolCallsExecuted: ToolCallRecord[] = [];
  let aiReply = "";

  // Optional: Attempt Google Gemini reasoning if API key is provided
  const effectiveApiKey = apiKey || process.env.GEMINI_API_KEY;
  if (effectiveApiKey && effectiveApiKey.trim().length > 10 && !effectiveApiKey.includes("your-gemini-api-key")) {
    const geminiResult = await callGeminiOrchestrator(
      effectiveApiKey,
      business,
      workflow,
      conversationHistory,
      latestUserMessage,
      newFields,
      detectedLang
    );
    if (geminiResult) {
      if (geminiResult.extractedFields) {
        newFields = { ...newFields, ...geminiResult.extractedFields };
      }
      if (geminiResult.intent) {
        intent = geminiResult.intent;
      }
      if (geminiResult.reply && geminiResult.reply.trim().length > 0) {
        aiReply = geminiResult.reply.trim();
      }
    }
  }

  // =========================================================================
  // 1. TOOL EXECUTION LAYER: Run Tools FIRST (Calendar Check, Booking, Tracking)
  // =========================================================================
  if (workflow.industry === "clinic") {
    const patientName = newFields.patient_name || newFields.customer_name || "";
    const prefDate = newFields.preferred_date || "";
    const prefTime = newFields.preferred_time || "";
    const intentType = newFields.appointment_intent || intent;

    // Check if appointment was already created and confirmed in this conversation session
    const alreadyBooked = conversationHistory.some((m) =>
      m.toolCalls?.some((tc) => tc.toolName === "calendar.createEvent" && tc.status === "success")
    );

    const isThankYouOrAck = [
      "thank", "thanks", "ok", "okay", "alright", "great", "perfect", "bye", "goodbye", "done", "sounds good",
      "ಧನ್ಯವಾದ", "ಸರಿ", "ಆಯಿತು", "ಶುಭ", "ಉತ್ತಮ", "ಸಾಕು",
      "धन्यवाद", "शुक्रिया", "ठीक है", "अच्छा", "अलविदा"
    ].some((w) => latestUserMessage.toLowerCase().includes(w));

    if (intentType.toLowerCase().includes("cancel") || latestUserMessage.includes("ರದ್ದು")) {
      const cancelRes = await toolRegistry.executeTool("calendar.cancelEvent", {
        attendeeName: patientName || "Patient",
        reason: "Patient requested cancellation via AI phone assistant",
      }, { businessId: business.id, callerPhone });

      toolCallsExecuted.push({
        id: generateId("tool_cancel"),
        toolName: "calendar.cancelEvent",
        input: { attendeeName: patientName || "Patient" },
        output: cancelRes.data,
        status: cancelRes.success ? "success" : "error",
        timestamp: new Date().toISOString(),
      });

      if (detectedLang === "kn") {
        aiReply = `ನಿಮ್ಮ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಅನ್ನು ಗೂಗಲ್ ಕ್ಯಾಲೆಂಡರ್‌ನಲ್ಲಿ ರದ್ದುಗೊಳಿಸಲಾಗಿದೆ. ಬೇರೆ ದಿನಾಂಕ ಬೇಕಿದ್ದರೆ ದಯವಿಟ್ಟು ತಿಳಿಸಿ.`;
      } else if (detectedLang === "hi" || detectedLang === "hinglish") {
        aiReply = `जी, मैंने आपका अपॉइंटमेंट रद्द कर दिया है। यदि आपको किसी अन्य तारीख पर बुकिंग करनी हो तो कृपया बताएं।`;
      } else {
        aiReply = `I have cancelled your appointment on our calendar as requested. Please let me know if you would like to book for another day.`;
      }
    } else if (alreadyBooked && isThankYouOrAck) {
      if (detectedLang === "kn") {
        aiReply = `ನಿಮಗೆ ಸ್ವಾಗತ, ${patientName || ""}! ${prefDate} ರಂದು ${prefTime} ಗೆ ${newFields.doctor_speciality || "ಡಾ. ಶರ್ಮಾ"} ಅವರೊಂದಿಗೆ ನಿಮ್ಮ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಕನ್ಫರ್ಮ್ ಆಗಿದೆ. ಶುಭ ದಿನ!`;
      } else if (detectedLang === "hi" || detectedLang === "hinglish") {
        aiReply = `आपका बहुत-बहुत स्वागत है, ${patientName || ""}! ${prefDate} को ${prefTime} पर ${newFields.doctor_speciality || "डॉक्टर"} के साथ आपका अपॉइंटमेंट कन्फर्म है। आपका दिन शुभ हो!`;
      } else {
        aiReply = `You're very welcome, ${patientName || "there"}! Your appointment with ${newFields.doctor_speciality || "Dr. Sharma"} on ${prefDate} at ${prefTime} is confirmed on Google Calendar. Have a wonderful day!`;
      }
    } else if (prefDate && prefTime && !alreadyBooked) {
      const availRes = await toolRegistry.executeTool("calendar.checkAvailability", {
        date: prefDate,
        time: prefTime,
        timezone: "Asia/Kolkata",
        durationMinutes: 30,
      }, { businessId: business.id, callerPhone });

      toolCallsExecuted.push({
        id: generateId("tool_avail"),
        toolName: "calendar.checkAvailability",
        input: { date: prefDate, time: prefTime, timezone: "Asia/Kolkata" },
        output: availRes.data,
        status: availRes.success ? "success" : "error",
        timestamp: new Date().toISOString(),
      });

      const isSlotAvailable = availRes.success && availRes.data?.available === true;

      if (!isSlotAvailable) {
        const alternatives = availRes.data?.suggestedSlots || ["1:30 AM", "2:00 PM", "4:30 PM"];
        const altText = alternatives.join(", ");

        if (detectedLang === "kn") {
          aiReply = `ನಾನು Google Calendar ಪರಿಶೀಲಿಸಿದೆ, ಆದರೆ ${prefDate} ರಂದು ${prefTime} ಗೆ ${newFields.doctor_speciality || "ಡಾ. ಶರ್ಮಾ"} ಅವರ ಸ್ಲಾಟ್ ಈಗಾಗಲೇ ಬುಕ್ ಆಗಿದೆ. ನೀವು ಲಭ್ಯವಿರುವ ಇತರ ಸಮಯಗಳಾದ ${altText} ಆಯ್ಕೆ ಮಾಡಲು ಬಯಸುವಿರಾ?`;
        } else if (detectedLang === "hi" || detectedLang === "hinglish") {
          aiReply = `मैंने Google Calendar चेक किया, लेकिन ${prefDate} को ${prefTime} पर ${newFields.doctor_speciality || "डॉक्टर"} का स्लॉट पहले से बुक है। क्या आप उपलब्ध समय जैसे ${altText} में से कोई स्लॉट चुनना चाहेंगे?`;
        } else {
          aiReply = `I checked our Google Calendar, but ${newFields.doctor_speciality || "Dr. Sharma"} is unavailable on ${prefDate} at ${prefTime} due to an existing booking. Would you like to schedule for one of our open slots instead, such as ${altText}?`;
        }
      } else {
        if (patientName) {
          const bookRes = await toolRegistry.executeTool("calendar.createEvent", {
            title: `Clinic Consultation: ${patientName} (${newFields.doctor_speciality || "Doctor"})`,
            attendeeName: patientName,
            attendeePhone: newFields.phone_number || callerPhone,
            date: prefDate,
            time: prefTime,
            description: `Doctor: ${newFields.doctor_speciality || "General"}\nGoogle Calendar Verified Booking`,
          }, { businessId: business.id, callerPhone });

          toolCallsExecuted.push({
            id: generateId("tool_book"),
            toolName: "calendar.createEvent",
            input: { title: `Clinic Consultation: ${patientName}`, attendeeName: patientName, date: prefDate, time: prefTime },
            output: bookRes.data,
            status: bookRes.success ? "success" : "error",
            timestamp: new Date().toISOString(),
          });

          if (detectedLang === "kn") {
            aiReply = `ಅತ್ಯುತ್ತಮ ${patientName}! ನಾನು Google Calendar ಪರಿಶೀಲಿಸಿ ${prefDate} ರಂದು ${prefTime} ಗೆ ${newFields.doctor_speciality || "ಡಾ. ಶರ್ಮಾ"} ಅವರೊಂದಿಗೆ ನಿಮ್ಮ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಅನ್ನು ಕನ್ಫರ್ಮ್ ಮಾಡಿದ್ದೇನೆ. ಗೂಗಲ್ ಕ್ಯಾಲೆಂಡರ್ ಆಮಂತ್ರಣವನ್ನು ಕಾಯ್ದಿರಿಸಲಾಗಿದೆ.`;
          } else if (detectedLang === "hi" || detectedLang === "hinglish") {
            aiReply = `बहुत बढ़िया ${patientName}! मैंने Google Calendar चेक किया और ${prefDate} को ${prefTime} पर ${newFields.doctor_speciality || "डॉक्टर"} के साथ आपका अपॉइंटमेंट कन्फर्म कर दिया है।`;
          } else {
            aiReply = `Excellent, ${patientName}! I checked our Google Calendar and confirmed your appointment with ${newFields.doctor_speciality || "Dr. Sharma"} for ${prefDate} at ${prefTime}. A Google Calendar invitation has been reserved.`;
          }
        } else {
          if (detectedLang === "kn") {
            aiReply = `ಉತ್ತಮ ಸುದ್ದಿ! ನಾನು Google Calendar ಪರಿಶೀಲಿಸಿದ್ದೇನೆ ಮತ್ತು ${prefDate} ರಂದು ${prefTime} ಗೆ ಸ್ಲಾಟ್ ಲಭ್ಯವಿದೆ. ಬುಕಿಂಗ್ ಪೂರ್ಣಗೊಳಿಸಲು ದಯವಿಟ್ಟು ರೋಗಿಯ ಪೂರ್ಣ ಹೆಸರನ್ನು ತಿಳಿಸುವಿರಾ?`;
          } else if (detectedLang === "hi" || detectedLang === "hinglish") {
            aiReply = `बहुत बढ़िया! मैंने Google Calendar चेक किया और ${prefDate} को ${prefTime} पर स्लॉट उपलब्ध है। बुकिंग पूरी करने के लिए कृपया अपना नाम बताएं?`;
          } else {
            aiReply = `Great news! I checked our Google Calendar and ${prefDate} at ${prefTime} is open and available. May I please have your full name to complete the reservation?`;
          }
        }
      }
    }
  } else if (workflow.industry === "delivery" && newFields.tracking_number) {
    const trackRes = await toolRegistry.executeTool("delivery.trackPackage", {
      trackingNumber: newFields.tracking_number,
    }, { businessId: business.id, callerPhone });

    toolCallsExecuted.push({
      id: generateId("tool_track"),
      toolName: "delivery.trackPackage",
      input: { trackingNumber: newFields.tracking_number },
      output: trackRes.data,
      status: trackRes.success ? "success" : "error",
      timestamp: new Date().toISOString(),
    });

    if (detectedLang === "kn") {
      aiReply = `ನಾನು ನಿಮ್ಮ ಪ್ಯಾಕೇಜ್ ${newFields.tracking_number} ಅನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿದ್ದೇನೆ. ಸ್ಥಿತಿ: ${trackRes.data.status}। ನಿರೀಕ್ಷಿತ ಡೆಲಿವರಿ: ${trackRes.data.estimatedDelivery}. ಚಾಲಕರಿಗೆ ಯಾವುದೇ ನಿರ್ದೇಶನ ನೀಡಲು ಬಯಸುವಿರಾ?`;
    } else if (detectedLang === "hi" || detectedLang === "hinglish") {
      aiReply = `मैंने आपका पैकेज ${newFields.tracking_number} ट्रैक किया है। स्थिति: ${trackRes.data.status}। अपेक्षित डिलीवरी: ${trackRes.data.estimatedDelivery}। क्या आप कोई निर्देश छोड़ना चाहते हैं?`;
    } else {
      aiReply = `I tracked your shipment ${newFields.tracking_number}. Status: ${trackRes.data.status}. Expected delivery: ${trackRes.data.estimatedDelivery}. Would you like to leave any specific delivery instructions?`;
    }
  } else if (workflow.industry === "real_estate" && (newFields.visit_date || (newFields.preferred_date && newFields.customer_name))) {
    const vDate = newFields.visit_date || newFields.preferred_date || "This Saturday";
    const vClient = newFields.customer_name || "Client";
    const vProp = newFields.property_type || "Property Site Visit";

    const bookVisit = await toolRegistry.executeTool("calendar.createEvent", {
      title: `Real Estate Site Visit: ${vClient} (${vProp})`,
      attendeeName: vClient,
      attendeePhone: newFields.phone_number || callerPhone,
      date: vDate,
      time: "11:00 AM",
      description: `Client: ${vClient}\nLooking for: ${vProp}\nBudget: ${newFields.budget || "Open"}\nSite visit scheduled by CallPilot AI`,
    }, { businessId: business.id, callerPhone });

    toolCallsExecuted.push({
      id: generateId("tool_visit"),
      toolName: "calendar.createEvent",
      input: { title: `Site Visit: ${vProp}`, attendeeName: vClient, date: vDate },
      output: bookVisit.data,
      status: bookVisit.success ? "success" : "error",
      timestamp: new Date().toISOString(),
    });

    if (detectedLang === "kn") {
      aiReply = `ಅದ್ಭುತ ${vClient}! ನಾನು ${vDate} ರಂದು ${vProp} ಸೈಟ್ ಭೇಟಿಯನ್ನು ಗೂಗಲ್ ಕ್ಯಾಲೆಂಡರ್‌ನಲ್ಲಿ ನಿಗದಿಪಡಿಸಿದ್ದೇನೆ.`;
    } else if (detectedLang === "hi" || detectedLang === "hinglish") {
      aiReply = `शानदार ${vClient}! मैंने ${vDate} को ${vProp} की साइट विजिट के लिए हमारे एजेंट का स्लॉट बुक कर दिया है।`;
    } else {
      aiReply = `Wonderful, ${vClient}! I have scheduled a site visit for the ${vProp} on ${vDate} at 11:00 AM in Google Calendar.`;
    }
  }

  // =========================================================================
  // 2. DYNAMIC CONVERSATIONAL & WORKFLOW STEPPING LAYER
  // =========================================================================
  const evalResult = evaluateWorkflow(workflow, newFields);

  if (!aiReply) {
    if (evalResult.nextField) {
      const nextField = evalResult.nextField;
      const callerName = newFields.customer_name || newFields.patient_name || "";
      const justGotName = Boolean(callerName && (!extractedFields.customer_name && !extractedFields.patient_name));
      const justGotFlavor = Boolean(newFields.flavor && !extractedFields.flavor);
      const justGotWeight = Boolean(newFields.weight && !extractedFields.weight);
      const justGotDate = Boolean(newFields.required_date && !extractedFields.required_date);

      if (detectedLang === "kn") {
        if (justGotName) {
          if (nextField.name === "flavor") {
            aiReply = `ನಮಸ್ಕಾರ ${callerName}! ನಿಮಗೆ ಯಾವ ಫ್ಲೇವರ್ ಕೇಕ್ ಬೇಕು (ಉದಾ: ಚಾಕೊಲೇಟ್ ಟ್ರಫಲ್, ರೆಡ್ ವೆಲ್ವೆಟ್)?`;
          } else {
            aiReply = `ನಮಸ್ಕಾರ ${callerName}! ${nextField.questionKn || nextField.question}`;
          }
        } else if (justGotFlavor) {
          if (!callerName) {
            aiReply = `${newFields.flavor} ಕೇಕ್ ಅದ್ಭುತ ಆಯ್ಕೆ! ಆರ್ಡರ್ ದಾಖಲಿಸಲು ದಯವಿಟ್ಟು ನಿಮ್ಮ ಹೆಸರು ತಿಳಿಸುವಿರಾ?`;
          } else {
            aiReply = `ಉತ್ತಮ! ${newFields.flavor} ಕೇಕ್ ನೋಟ್ ಮಾಡಿಕೊಂಡಿದ್ದೇನೆ. ಎಷ್ಟು ಕೆಜಿ ಅಥವಾ ಎಷ್ಟು ಜನರಿಗೆ ಬೇಕು?`;
          }
        } else {
          aiReply = `${nextField.questionKn || nextField.question}`;
        }
      } else if (detectedLang === "hi" || detectedLang === "hinglish") {
        if (justGotName) {
          if (nextField.name === "flavor") {
            aiReply = `नमस्ते ${callerName}! आप कौन सा फ्लेवर पसंद करेंगे (जैसे चॉकलेट, रेड वेलवेट या वैनिला)?`;
          } else {
            aiReply = `नमस्ते ${callerName}! ${nextField.questionHi || nextField.question}`;
          }
        } else if (justGotFlavor) {
          if (!callerName) {
            aiReply = `${newFields.flavor} केक बहुत बढ़िया पसंद है! बुकिंग के लिए कृपया अपना नाम बताएं?`;
          } else {
            aiReply = `बढ़िया! ${newFields.flavor} केक नोट कर लिया है। आपको कितने किलो का चाहिए?`;
          }
        } else {
          aiReply = `${nextField.questionHi || nextField.question}`;
        }
      } else {
        // English Conversational Flow
        if (justGotName) {
          if (nextField.name === "flavor") {
            aiReply = `Nice to meet you, ${callerName}! What flavor or occasion are you celebrating for your cake order?`;
          } else if (nextField.name === "cake_type") {
            aiReply = `Nice to meet you, ${callerName}! What kind of cake or occasion can we prepare for you?`;
          } else {
            aiReply = `Nice to meet you, ${callerName}! ${nextField.question}`;
          }
        } else if (justGotFlavor) {
          if (!callerName) {
            aiReply = `A ${newFields.flavor} cake sounds wonderful! Who am I speaking with so I can put this order under your name?`;
          } else if (nextField.name === "weight") {
            aiReply = `Great choice, ${callerName}! A ${newFields.flavor} cake. What size or weight do you need (e.g. 1 kg, 2 kg)?`;
          } else {
            aiReply = `Noted, ${newFields.flavor}! ${nextField.question}`;
          }
        } else if (justGotWeight) {
          if (!callerName) {
            aiReply = `Got it, ${newFields.weight}! May I please have your name for the order?`;
          } else if (nextField.name === "required_date") {
            aiReply = `Got it, ${newFields.weight}! When would you like this ready for pickup or delivery?`;
          } else {
            aiReply = `Got it, ${newFields.weight}! ${nextField.question}`;
          }
        } else if (justGotDate) {
          if (!callerName) {
            aiReply = `Perfect, ${newFields.required_date}! Who should I place this booking for?`;
          } else {
            aiReply = `Perfect, ${newFields.required_date}! ${nextField.question}`;
          }
        } else {
          const acks = ["Got it! ", "Understood. ", "Noted! ", "Perfect. "];
          const ack = acks[Math.floor(Math.random() * acks.length)];
          aiReply = `${ack}${nextField.question}`;
        }
      }
    } else {
      const isFarewell = ["end", "bye", "goodbye", "hang up", "thank you", "thanks", "done", "ok", "okay", "ಮುಗಿಸಿ", "ಧನ್ಯವಾದಗಳು", "ಸಾಕು"].some(
        (word) => latestUserMessage.toLowerCase().includes(word)
      );

      if (isFarewell) {
        if (detectedLang === "kn") {
          aiReply = "ಕರೆ ಮಾಡಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು! ನಿಮ್ಮ ವಿವರಗಳನ್ನು ಸುರಕ್ಷಿತವಾಗಿ ದಾಖಲಿಸಲಾಗಿದೆ. ಶುಭ ದಿನ, ನಮಸ್ಕಾರ!";
        } else if (detectedLang === "hi" || detectedLang === "hinglish") {
          aiReply = "कॉल करने के लिए धन्यवाद! आपका विवरण सुरक्षित कर लिया गया है। आपका दिन शुभ हो, अलविदा!";
        } else {
          aiReply = "Thank you for calling! All your details have been recorded. Goodbye and have a wonderful day!";
        }
      } else {
        if (detectedLang === "kn" && workflow.closingMessageKn) {
          aiReply = workflow.closingMessageKn;
        } else if ((detectedLang === "hi" || detectedLang === "hinglish") && workflow.closingMessageHi) {
          aiReply = workflow.closingMessageHi;
        } else {
          aiReply = workflow.closingMessage;
        }
      }
    }
  }

  return {
    reply: aiReply,
    updatedExtractedFields: newFields,
    toolCallsExecuted,
    urgency: evalResult.urgency,
    isComplete: evalResult.isComplete,
    intent,
    detectedLanguage: detectedLang,
    summary: evalResult.summary,
  };
}
