import { AgentTool, ToolExecutionResult } from "./types";

const mockTrackingDB: Record<string, {
  status: string;
  carrier: string;
  origin: string;
  destination: string;
  estimatedDelivery: string;
  currentLocation: string;
  lastUpdate: string;
  driverName?: string;
  driverPhone?: string;
}> = {
  "DEL-9821": {
    status: "Out for Delivery",
    carrier: "SwiftRoute Express",
    origin: "Central Warehouse, Hub 4",
    destination: "742 Evergreen Terrace",
    estimatedDelivery: "Today by 4:30 PM",
    currentLocation: "Sector 14 (3.2 km away)",
    lastUpdate: "Loaded onto delivery van #12",
    driverName: "Vikram S.",
    driverPhone: "+91 98765 00012",
  },
  "DEL-4412": {
    status: "In Transit",
    carrier: "SwiftRoute Freight",
    origin: "Regional Distribution Depot",
    destination: "124 Market Street",
    estimatedDelivery: "Tomorrow by 11:00 AM",
    currentLocation: "North Expressway Toll Plaza",
    lastUpdate: "Departed Sort Facility",
  },
  "DEL-1008": {
    status: "Delivered",
    carrier: "SwiftRoute Express",
    origin: "Metro Hub",
    destination: "55 Baker Street",
    estimatedDelivery: "Delivered on Sep 1 at 2:15 PM",
    currentLocation: "Delivered to Front Porch",
    lastUpdate: "Signed by R. Kumar",
  },
};

export const trackDeliveryPackageTool: AgentTool = {
  name: "delivery.trackPackage",
  displayName: "Track Logistics Shipment",
  description: "Looks up real-time shipping status, driver location, and estimated delivery time for a given tracking or order number.",
  category: "delivery",
  parameters: {
    type: "object",
    properties: {
      trackingNumber: {
        type: "string",
        description: "The package tracking or order ID (e.g. DEL-9821, DEL-4412, etc.)",
      },
    },
    required: ["trackingNumber"],
  },
  execute: async (args): Promise<ToolExecutionResult> => {
    const { trackingNumber } = args;
    const cleanNumber = String(trackingNumber).trim().toUpperCase();

    const info = mockTrackingDB[cleanNumber];
    if (info) {
      return {
        success: true,
        data: {
          trackingNumber: cleanNumber,
          status: info.status,
          carrier: info.carrier,
          origin: info.origin,
          destination: info.destination,
          currentLocation: info.currentLocation,
          estimatedDelivery: info.estimatedDelivery,
          driver: info.driverName ? `${info.driverName} (${info.driverPhone})` : undefined,
          message: `Package ${cleanNumber} is currently ${info.status}. Estimated arrival: ${info.estimatedDelivery} at ${info.destination}. Current location: ${info.currentLocation}.`,
        },
      };
    }

    return {
      success: true,
      data: {
        trackingNumber: cleanNumber,
        status: "Active - Processing",
        carrier: "SwiftRoute Express",
        estimatedDelivery: "Within 24 to 48 hours",
        currentLocation: "Sorting Facility Hub",
        message: `Shipment ${cleanNumber} is verified and currently processing at the dispatch hub. Estimated delivery within 24-48 hours.`,
      },
    };
  },
};
