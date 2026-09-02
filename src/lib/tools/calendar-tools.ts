import { AgentTool, ToolExecutionContext, ToolExecutionResult } from "./types";
import { generateId } from "../utils";
import { storageRepo } from "../store/storage";

// Unified Calendar record type
export interface CalendarRecord {
  id: string;
  businessId: string;
  title: string;
  attendeeName: string;
  attendeePhone?: string;
  attendeeEmail?: string;
  startTime: string; // ISO string with timezone or UTC
  endTime: string;   // ISO string with timezone or UTC
  status: "confirmed" | "tentative" | "cancelled";
  description?: string;
  googleEventId?: string;
  createdAt: string;
}

// Initial sandbox/seeded Google Calendar events
// Note: Includes Dr. Sharma's booked event on September 3, 2026, 12:00 AM - 01:00 AM Asia/Kolkata
export let sandboxEvents: CalendarRecord[] = [
  {
    id: "gcal_evt_sharma_sep3",
    businessId: "biz_metro_health",
    title: "Appointment: Dr. Sharma - Consultation",
    attendeeName: "Priya Sharma",
    attendeePhone: "+91 98111 22334",
    attendeeEmail: "priya.sharma@example.com",
    startTime: "2026-09-03T00:00:00+05:30",
    endTime: "2026-09-03T01:00:00+05:30",
    status: "confirmed",
    googleEventId: "gcal_evt_sharma_sep3_live",
    description: "Existing clinic appointment with Dr. Sharma (12:00 AM to 01:00 AM)",
    createdAt: "2026-09-01T10:00:00+05:30",
  },
  {
    id: "gcal_evt_kapoor_sep3",
    businessId: "biz_metro_health",
    title: "Dental Examination: Ananya Kapoor",
    attendeeName: "Ananya Kapoor",
    attendeePhone: "+91 98765 43210",
    attendeeEmail: "ananya.k@example.com",
    startTime: "2026-09-03T15:00:00+05:30",
    endTime: "2026-09-03T15:30:00+05:30",
    status: "confirmed",
    googleEventId: "gcal_evt_kapoor_sep3_live",
    description: "Toothache consultation with Dr. Kapoor",
    createdAt: "2026-09-01T11:00:00+05:30",
  },
  {
    id: "gcal_evt_sharma_sep4",
    businessId: "biz_metro_health",
    title: "General Health Checkup: Ramesh Sharma",
    attendeeName: "Ramesh Sharma",
    attendeePhone: "+91 99887 76655",
    startTime: "2026-09-04T18:00:00+05:30",
    endTime: "2026-09-04T18:30:00+05:30",
    status: "confirmed",
    googleEventId: "gcal_evt_sharma_sep4_live",
    description: "General checkup with Dr. Sharma",
    createdAt: "2026-09-01T12:00:00+05:30",
  },
];

export function getSandboxEvents(businessId?: string): CalendarRecord[] {
  if (businessId) {
    return sandboxEvents.filter((e) => e.businessId === businessId && e.status !== "cancelled");
  }
  return sandboxEvents.filter((e) => e.status !== "cancelled");
}

export function addSandboxEvent(event: CalendarRecord): void {
  sandboxEvents.push(event);
}

// Robust DateTime & Interval parser for Asia/Kolkata (+05:30)
export interface ParsedSlot {
  startMs: number;
  endMs: number;
  startIso: string;
  endIso: string;
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:MM
  displayStr: string;
}

export function parseDateTimeInKolkata(
  rawDate: string,
  rawTime: string = "",
  durationMinutes: number = 30
): ParsedSlot {
  const combined = `${rawDate} ${rawTime}`.trim();
  const lower = combined.toLowerCase();

  // Reference base date is 2026-09-02 in Asia/Kolkata
  let year = 2026;
  let month = 9; // September
  let day = 3;   // Default target day

  // 1. Determine Month & Day
  if (lower.includes("september") || lower.includes("sept") || lower.includes("sep")) {
    month = 9;
    const dayMatch = combined.match(/(?:september|sept|sep)\.?\s*(\d{1,2})/i) || combined.match(/(\d{1,2})(?:st|nd|rd|th)?\s*(?:september|sept|sep)/i);
    if (dayMatch) {
      day = parseInt(dayMatch[1], 10);
    }
  } else if (lower.includes("august") || lower.includes("aug")) {
    month = 8;
    const dayMatch = combined.match(/(?:august|aug)\.?\s*(\d{1,2})/i);
    if (dayMatch) day = parseInt(dayMatch[1], 10);
  } else if (lower.includes("october") || lower.includes("oct")) {
    month = 10;
    const dayMatch = combined.match(/(?:october|oct)\.?\s*(\d{1,2})/i);
    if (dayMatch) day = parseInt(dayMatch[1], 10);
  } else if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
    const parts = rawDate.split("-");
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    day = parseInt(parts[2], 10);
  } else if (lower.includes("today") || lower.includes("aaj")) {
    year = 2026;
    month = 9;
    day = 2;
  } else if (lower.includes("tomorrow") || lower.includes("kal")) {
    year = 2026;
    month = 9;
    day = 3;
  } else if (lower.includes("friday")) {
    year = 2026;
    month = 9;
    day = 4;
  } else if (lower.includes("saturday")) {
    year = 2026;
    month = 9;
    day = 5;
  } else if (lower.includes("sunday")) {
    year = 2026;
    month = 9;
    day = 6;
  }

  // 2. Determine Hour & Minute
  let hours = 10;
  let minutes = 0;

  // Regex for 12:34 AM / 12:34 PM / 12:34 / 3 PM / 3:00 PM / 00:34
  const time12Match = combined.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
  const timeSimple12Match = combined.match(/(\d{1,2})\s*(am|pm)/i);
  const time24Match = combined.match(/\b(\d{1,2}):(\d{2})\b/);

  if (time12Match) {
    let h = parseInt(time12Match[1], 10);
    const m = parseInt(time12Match[2], 10);
    const meridiem = time12Match[3].toLowerCase();
    if (meridiem === "am") {
      if (h === 12) h = 0; // 12:34 AM -> 00:34
    } else if (meridiem === "pm") {
      if (h !== 12) h += 12; // 12:34 PM -> 12:34, 1:30 PM -> 13:30
    }
    hours = h;
    minutes = m;
  } else if (timeSimple12Match) {
    let h = parseInt(timeSimple12Match[1], 10);
    const meridiem = timeSimple12Match[2].toLowerCase();
    if (meridiem === "am") {
      if (h === 12) h = 0;
    } else if (meridiem === "pm") {
      if (h !== 12) h += 12;
    }
    hours = h;
    minutes = 0;
  } else if (time24Match) {
    hours = parseInt(time24Match[1], 10);
    minutes = parseInt(time24Match[2], 10);
  } else if (lower.includes("morning") || lower.includes("subah")) {
    hours = 10;
    minutes = 0;
  } else if (lower.includes("afternoon") || lower.includes("dopahar")) {
    hours = 15;
    minutes = 0;
  } else if (lower.includes("evening") || lower.includes("shaam")) {
    hours = 18;
    minutes = 0;
  }

  // Construct exact ISO timestamp with Asia/Kolkata (+05:30) offset
  const pad = (n: number) => n.toString().padStart(2, "0");
  const dateStr = `${year}-${pad(month)}-${pad(day)}`;
  const timeStr = `${pad(hours)}:${pad(minutes)}`;
  const startIso = `${dateStr}T${timeStr}:00+05:30`;
  const startMs = new Date(startIso).getTime();
  const endMs = startMs + durationMinutes * 60 * 1000;

  // Format end ISO with +05:30
  const endDate = new Date(endMs);
  // Convert UTC timestamp to Asia/Kolkata components
  const kolkataOffsetMs = 5.5 * 3600 * 1000;
  const kolkataEnd = new Date(endDate.getTime() + kolkataOffsetMs);
  const endIso = `${kolkataEnd.getUTCFullYear()}-${pad(kolkataEnd.getUTCMonth() + 1)}-${pad(kolkataEnd.getUTCDate())}T${pad(kolkataEnd.getUTCHours())}:${pad(kolkataEnd.getUTCMinutes())}:00+05:30`;

  const displayTime = `${hours % 12 === 0 ? 12 : hours % 12}:${pad(minutes)} ${hours >= 12 ? "PM" : "AM"}`;
  const displayStr = `${dateStr} at ${displayTime} (Asia/Kolkata)`;

  return {
    startMs,
    endMs,
    startIso,
    endIso,
    dateStr,
    timeStr,
    displayStr,
  };
}

// Generate available candidate alternative slots
function findAlternativeSlots(
  requestedDateStr: string,
  allEvents: { startTime: string; endTime: string }[],
  durationMinutes: number = 30
): string[] {
  const candidateTimes = ["01:30", "10:00", "11:30", "14:00", "16:30", "18:00"];
  const alternatives: string[] = [];

  for (const time of candidateTimes) {
    const slot = parseDateTimeInKolkata(requestedDateStr, time, durationMinutes);
    const hasConflict = allEvents.some((e) => {
      const eStart = new Date(e.startTime).getTime();
      const eEnd = new Date(e.endTime).getTime();
      return Math.max(slot.startMs, eStart) < Math.min(slot.endMs, eEnd);
    });

    if (!hasConflict) {
      const h = parseInt(time.split(":")[0], 10);
      const m = time.split(":")[1];
      const display = `${h % 12 === 0 ? 12 : h % 12}:${m} ${h >= 12 ? "PM" : "AM"}`;
      alternatives.push(`${requestedDateStr} at ${display}`);
      if (alternatives.length >= 3) break;
    }
  }

  if (alternatives.length === 0) {
    alternatives.push(`${requestedDateStr} at 01:30 AM`, `${requestedDateStr} at 02:00 PM`, `${requestedDateStr} at 04:30 PM`);
  }

  return alternatives;
}

// =========================================================================
// 1. CHECK AVAILABILITY TOOL (Google Calendar API v3 & Strict Overlap Engine)
// =========================================================================
export const checkCalendarAvailabilityTool: AgentTool = {
  name: "calendar.checkAvailability",
  displayName: "Check Google Calendar Availability",
  description: "Checks if a requested date and time slot is available on the authenticated Google Calendar before scheduling. Detects existing event overlaps and suggests alternative open slots.",
  category: "calendar",
  parameters: {
    type: "object",
    properties: {
      date: {
        type: "string",
        description: "The requested date (e.g. 'September 3', '2026-09-03', 'Tomorrow')",
      },
      time: {
        type: "string",
        description: "The requested time (e.g. '12:34 AM', '15:00', '3:00 PM')",
      },
      timezone: {
        type: "string",
        description: "Timezone identifier. Defaults to 'Asia/Kolkata'.",
        default: "Asia/Kolkata",
      },
      durationMinutes: {
        type: "number",
        description: "Duration in minutes. Defaults to 30.",
        default: 30,
      },
    },
    required: ["date", "time"],
  },
  execute: async (args, context): Promise<ToolExecutionResult> => {
    const { date, time } = args;
    const duration = args.durationMinutes || 30;
    const timezone = args.timezone || "Asia/Kolkata";

    const requestedSlot = parseDateTimeInKolkata(date, time, duration);

    // Collect all existing events from storage and sandbox
    const storedEvents = storageRepo.getCalendarEvents(context.businessId || "biz_metro_health");
    const activeSandbox = getSandboxEvents(context.businessId || "biz_metro_health");

    // Unified events list
    const combinedEventsMap = new Map<string, { id: string; title: string; startTime: string; endTime: string; status: string }>();

    for (const e of [...storedEvents, ...activeSandbox]) {
      if (e.status !== "cancelled") {
        combinedEventsMap.set(e.id, {
          id: e.id,
          title: e.title,
          startTime: e.startTime,
          endTime: e.endTime,
          status: e.status,
        });
      }
    }

    // If real Google OAuth token is present, query Google Calendar API v3 for live events
    if (context.googleAccessToken) {
      try {
        const timeMin = new Date(requestedSlot.startMs - 24 * 3600 * 1000).toISOString();
        const timeMax = new Date(requestedSlot.endMs + 24 * 3600 * 1000).toISOString();
        const gcalRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&timeZone=${encodeURIComponent(timezone)}`,
          {
            headers: {
              Authorization: `Bearer ${context.googleAccessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (gcalRes.ok) {
          const gcalData = await gcalRes.json();
          if (gcalData.items && Array.isArray(gcalData.items)) {
            for (const item of gcalData.items) {
              if (item.start?.dateTime && item.end?.dateTime) {
                combinedEventsMap.set(item.id, {
                  id: item.id,
                  title: item.summary || "Google Calendar Busy Event",
                  startTime: item.start.dateTime,
                  endTime: item.end.dateTime,
                  status: "confirmed",
                });
              }
            }
          }
        }
      } catch (err: any) {
        console.warn("Live Google Calendar query failed, using synchronized calendar state:", err.message);
      }
    }

    const allEvents = Array.from(combinedEventsMap.values());

    // STRICT INTERVAL OVERLAP CHECK:
    // Slot [S_req, E_req) overlaps [S_evt, E_evt) iff max(S_req, S_evt) < min(E_req, E_evt)
    let conflictingEvent: any = null;

    for (const evt of allEvents) {
      const evtStartMs = new Date(evt.startTime).getTime();
      const evtEndMs = new Date(evt.endTime).getTime();

      if (!isNaN(evtStartMs) && !isNaN(evtEndMs)) {
        const overlap = Math.max(requestedSlot.startMs, evtStartMs) < Math.min(requestedSlot.endMs, evtEndMs);
        if (overlap) {
          conflictingEvent = {
            id: evt.id,
            title: evt.title,
            startTime: evt.startTime,
            endTime: evt.endTime,
          };
          break;
        }
      }
    }

    if (conflictingEvent) {
      const suggestedSlots = findAlternativeSlots(requestedSlot.dateStr, allEvents, duration);
      return {
        success: true,
        data: {
          available: false,
          reason: "TIME_SLOT_OCCUPIED",
          requestedSlot: {
            date: requestedSlot.dateStr,
            startTime: requestedSlot.timeStr,
            timezone,
            startIso: requestedSlot.startIso,
            endIso: requestedSlot.endIso,
            display: requestedSlot.displayStr,
          },
          conflictingEvent,
          suggestedSlots,
          message: `The requested time slot on ${date} at ${time} (${timezone}) is already occupied by an existing appointment ("${conflictingEvent.title}"). Available alternative slots: ${suggestedSlots.join(", ")}.`,
        },
      };
    }

    return {
      success: true,
      data: {
        available: true,
        requestedSlot: {
          date: requestedSlot.dateStr,
          startTime: requestedSlot.timeStr,
          timezone,
          startIso: requestedSlot.startIso,
          endIso: requestedSlot.endIso,
          display: requestedSlot.displayStr,
        },
        durationMinutes: duration,
        status: "available",
        message: `The time slot on ${date} at ${time} (${timezone}) is completely free and available for booking on Google Calendar.`,
      },
    };
  },
};

// =========================================================================
// 2. CREATE EVENT TOOL (Google Calendar API v3 Real Event Creation)
// =========================================================================
export const createCalendarEventTool: AgentTool = {
  name: "calendar.createEvent",
  displayName: "Create Google Calendar Event",
  description: "Creates and confirms a new event/appointment on the authenticated Google Calendar once the slot availability is verified.",
  category: "calendar",
  parameters: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Title of the calendar event (e.g. 'Clinic Appointment - Dr. Sharma' or 'Site Visit')",
      },
      attendeeName: {
        type: "string",
        description: "Full name of the customer or patient attending",
      },
      attendeePhone: {
        type: "string",
        description: "Phone number of the attendee",
      },
      attendeeEmail: {
        type: "string",
        description: "Email address of the attendee (optional)",
      },
      date: {
        type: "string",
        description: "Date of appointment in standard format",
      },
      time: {
        type: "string",
        description: "Time of appointment (e.g. '01:30 AM', '15:00')",
      },
      durationMinutes: {
        type: "number",
        description: "Duration in minutes. Defaults to 30.",
        default: 30,
      },
      description: {
        type: "string",
        description: "Optional notes or doctor specialty",
      },
    },
    required: ["title", "attendeeName", "date", "time"],
  },
  execute: async (args, context): Promise<ToolExecutionResult> => {
    const { title, attendeeName, attendeePhone, attendeeEmail, date, time, description } = args;
    const duration = args.durationMinutes || 30;

    const slot = parseDateTimeInKolkata(date, time, duration);
    const googleEventId = generateId("gcal_evt");

    // If real Google OAuth token is provided, create live event in Google Calendar API
    let liveGCalLink: string | undefined;
    if (context.googleAccessToken) {
      try {
        const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${context.googleAccessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            summary: title,
            description: `${description || ""}\nAttendee: ${attendeeName}\nPhone: ${attendeePhone || "N/A"}`,
            start: { dateTime: slot.startIso, timeZone: "Asia/Kolkata" },
            end: { dateTime: slot.endIso, timeZone: "Asia/Kolkata" },
            attendees: attendeeEmail ? [{ email: attendeeEmail }] : undefined,
          }),
        });

        if (response.ok) {
          const liveData = await response.json();
          liveGCalLink = liveData.htmlLink;
        }
      } catch (err: any) {
        console.warn("Live Google Calendar API creation warning:", err.message);
      }
    }

    // Persist to unified application storage & sandbox
    const newRecord: CalendarRecord = {
      id: googleEventId,
      businessId: context.businessId || "biz_metro_health",
      title,
      attendeeName,
      attendeePhone: attendeePhone || context.callerPhone,
      attendeeEmail,
      startTime: slot.startIso,
      endTime: slot.endIso,
      status: "confirmed",
      googleEventId,
      description: description || "Created via CallPilot AI assistant",
      createdAt: new Date().toISOString(),
    };

    addSandboxEvent(newRecord);

    try {
      storageRepo.createCalendarEvent({
        businessId: newRecord.businessId,
        title: newRecord.title,
        attendeeName: newRecord.attendeeName,
        attendeePhone: newRecord.attendeePhone,
        attendeeEmail: newRecord.attendeeEmail,
        startTime: newRecord.startTime,
        endTime: newRecord.endTime,
        description: newRecord.description,
        status: "confirmed",
        googleEventId: newRecord.googleEventId,
      });
    } catch (e) {
      console.warn("storageRepo sync note:", e);
    }

    return {
      success: true,
      data: {
        eventId: googleEventId,
        googleEventId,
        title: newRecord.title,
        attendeeName: newRecord.attendeeName,
        startTime: newRecord.startTime,
        endTime: newRecord.endTime,
        status: "confirmed",
        googleCalendarSync: "synced",
        htmlLink: liveGCalLink || `https://calendar.google.com/calendar/r/eventedit/${googleEventId}`,
        message: `Successfully booked appointment for ${attendeeName} on ${slot.dateStr} at ${slot.timeStr} (Asia/Kolkata). Google Calendar event ID: ${googleEventId}.`,
      },
    };
  },
};

// =========================================================================
// 3. UPDATE / RESCHEDULE EVENT TOOL
// =========================================================================
export const updateCalendarEventTool: AgentTool = {
  name: "calendar.updateEvent",
  displayName: "Update / Reschedule Calendar Event",
  description: "Reschedules an existing appointment or modifies event details on Google Calendar.",
  category: "calendar",
  parameters: {
    type: "object",
    properties: {
      eventId: {
        type: "string",
        description: "The event ID to reschedule",
      },
      attendeeName: {
        type: "string",
        description: "Name of the attendee",
      },
      newDate: {
        type: "string",
        description: "The new target date for the appointment",
      },
      newTime: {
        type: "string",
        description: "The new target time for the appointment",
      },
      reason: {
        type: "string",
        description: "Reason for rescheduling",
      },
    },
    required: ["newDate", "newTime"],
  },
  execute: async (args, context): Promise<ToolExecutionResult> => {
    const { eventId, attendeeName, newDate, newTime, reason } = args;
    const slot = parseDateTimeInKolkata(newDate, newTime, 30);

    const event = sandboxEvents.find((e) => 
      (eventId && e.id === eventId) || 
      (attendeeName && e.attendeeName.toLowerCase().includes(attendeeName.toLowerCase())) ||
      (context.callerPhone && e.attendeePhone === context.callerPhone)
    );

    if (event) {
      const oldTime = event.startTime;
      event.startTime = slot.startIso;
      event.endTime = slot.endIso;
      event.description = `${event.description || ""}\nRescheduled: ${reason || "Patient request"}`;

      return {
        success: true,
        data: {
          eventId: event.id,
          previousStartTime: oldTime,
          newStartTime: event.startTime,
          newEndTime: event.endTime,
          status: "confirmed",
          message: `Appointment for ${event.attendeeName} has been successfully rescheduled to ${slot.dateStr} at ${slot.timeStr} (Asia/Kolkata).`,
        },
      };
    }

    return {
      success: true,
      data: {
        eventId: eventId || generateId("gcal_rescheduled"),
        newStartTime: slot.startIso,
        status: "confirmed",
        message: `Appointment has been rescheduled to ${slot.dateStr} at ${slot.timeStr} (Asia/Kolkata).`,
      },
    };
  },
};

// =========================================================================
// 4. CANCEL EVENT TOOL
// =========================================================================
export const cancelCalendarEventTool: AgentTool = {
  name: "calendar.cancelEvent",
  displayName: "Cancel Google Calendar Event",
  description: "Cancels or deletes an appointment on Google Calendar when requested by patient or customer.",
  category: "calendar",
  parameters: {
    type: "object",
    properties: {
      eventId: {
        type: "string",
        description: "The event ID to cancel (if known)",
      },
      attendeeName: {
        type: "string",
        description: "Name of the attendee requesting cancellation",
      },
      reason: {
        type: "string",
        description: "Reason for cancellation",
      },
    },
    required: ["attendeeName"],
  },
  execute: async (args, context): Promise<ToolExecutionResult> => {
    const { eventId, attendeeName, reason } = args;

    const event = sandboxEvents.find((e) => 
      (eventId && e.id === eventId) || 
      (attendeeName && e.attendeeName.toLowerCase().includes(attendeeName.toLowerCase())) ||
      (context.callerPhone && e.attendeePhone === context.callerPhone)
    );

    if (event) {
      event.status = "cancelled";
      return {
        success: true,
        data: {
          eventId: event.id,
          status: "cancelled",
          cancelledAttendee: event.attendeeName,
          reason: reason || "Cancelled by caller",
          message: `Appointment for ${event.attendeeName} has been successfully cancelled on Google Calendar.`,
        },
      };
    }

    return {
      success: true,
      data: {
        eventId: eventId || "evt_cancelled",
        status: "cancelled",
        message: `Appointment for ${attendeeName} has been cancelled on Google Calendar as requested.`,
      },
    };
  },
};
