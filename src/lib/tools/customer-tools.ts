import { AgentTool, ToolExecutionResult } from "./types";

const mockCustomerCRM: Record<string, {
  name: string;
  vip: boolean;
  notes: string;
  pastOrders?: string[];
  allergies?: string[];
  preferredDoctor?: string;
}> = {
  "+91 98765 43210": {
    name: "Rajesh Gupta",
    vip: true,
    notes: "Prefers morning appointments. Known allergy: Penicillin.",
    preferredDoctor: "Dr. Sharma",
  },
  "+91 98111 22334": {
    name: "Priya Sharma",
    vip: false,
    notes: "Frequent buyer of Red Velvet pastries. Prefers eggless cakes.",
    pastOrders: ["1kg Eggless Red Velvet Cake", "Chocolate Cupcakes box"],
    allergies: ["Eggs (strictly vegetarian)"],
  },
  "+1 (555) 234-5678": {
    name: "Sarah Jenkins",
    vip: true,
    notes: "Corporate client for weekly logistics deliveries.",
  },
};

export const lookupCustomerTool: AgentTool = {
  name: "crm.lookupCustomer",
  displayName: "Lookup Existing Customer History",
  description: "Retrieves past orders, preferences, allergies, or notes for returning callers based on their phone number.",
  category: "crm",
  parameters: {
    type: "object",
    properties: {
      phoneNumber: {
        type: "string",
        description: "Phone number of the caller to lookup",
      },
    },
    required: ["phoneNumber"],
  },
  execute: async (args, context): Promise<ToolExecutionResult> => {
    const phone = args.phoneNumber || context.callerPhone;
    if (!phone) {
      return { success: false, error: "No phone number provided for lookup" };
    }

    const cleanPhone = String(phone).replace(/\s+/g, "");
    let match = mockCustomerCRM[phone] || mockCustomerCRM[cleanPhone];

    if (!match) {
      for (const [k, v] of Object.entries(mockCustomerCRM)) {
        if (k.replace(/\D/g, "").includes(cleanPhone.replace(/\D/g, ""))) {
          match = v;
          break;
        }
      }
    }

    if (match) {
      return {
        success: true,
        data: {
          found: true,
          name: match.name,
          vip: match.vip,
          notes: match.notes,
          allergies: match.allergies,
          pastOrders: match.pastOrders,
          message: `Found profile for ${match.name}. Notes: ${match.notes}`,
        },
      };
    }

    return {
      success: true,
      data: {
        found: false,
        message: "No previous customer records found for this number.",
      },
    };
  },
};
