"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  CalendarCheck,
  Plus,
  Clock,
  User,
  Phone,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { storageRepo, AppState } from "@/lib/store/storage";
import { CalendarEvent } from "@/types";
import { Button, Badge, Card, Dialog, Input, Textarea } from "@/components/ui";
import { formatDateTime, formatTime, formatDate, formatPhone } from "@/lib/utils";

export default function CalendarPage() {
  const [appState, setAppState] = useState<AppState>(storageRepo.getState());
  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState(false);

  // New Event Form
  const [eventTitle, setEventTitle] = useState("");
  const [attendeeName, setAttendeeName] = useState("");
  const [attendeePhone, setAttendeePhone] = useState("+1 (555) 000-1122");
  const [eventDate, setEventDate] = useState("2026-09-02");
  const [eventTime, setEventTime] = useState("14:00");
  const [eventDesc, setEventDesc] = useState("Direct calendar reservation");

  useEffect(() => {
    const unsub = storageRepo.subscribe((s) => setAppState({ ...s }));
    return () => unsub();
  }, []);

  const activeBiz = storageRepo.getActiveBusiness();
  const events = storageRepo.getCalendarEvents(activeBiz.id);

  const handleCancelEvent = (id: string) => {
    if (confirm("Are you sure you want to cancel this calendar appointment?")) {
      storageRepo.cancelCalendarEvent(id);
    }
  };

  const handleCreateEvent = () => {
    if (!eventTitle.trim() || !attendeeName.trim()) return;

    const start = new Date(`${eventDate}T${eventTime}:00`);
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    storageRepo.createCalendarEvent({
      businessId: activeBiz.id,
      title: eventTitle,
      attendeeName,
      attendeePhone,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      description: eventDesc,
      status: "confirmed",
    });

    setIsNewEventModalOpen(false);
    setEventTitle("");
    setAttendeeName("");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <CalendarCheck className="h-7 w-7 text-indigo-600" />
              <span>Google Calendar Hub</span>
            </h1>
            <Badge variant="success" dot>GCal API v3 Synced</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Appointments, scheduled callbacks, and pickup reservations managed autonomously by CallPilot AI.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/simulator?industry=clinic">
            <Button size="md" variant="secondary" leftIcon={<Sparkles className="h-4 w-4 text-emerald-600" />}>
              Test GCal Tool
            </Button>
          </Link>
          <Button size="md" variant="glow" onClick={() => setIsNewEventModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
            Schedule Event
          </Button>
        </div>
      </div>

      {/* Sync Status Banner */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-emerald-900">Google Calendar Agent Integration Active</h3>
            <p className="text-xs text-emerald-700 mt-0.5">
              AI checks availability (<code className="bg-emerald-100 px-1 py-0.5 rounded font-mono text-[11px]">calendar.checkAvailability</code>) and auto-creates reservations (<code className="bg-emerald-100 px-1 py-0.5 rounded font-mono text-[11px]">calendar.createEvent</code>).
            </p>
          </div>
        </div>
        <div className="text-xs font-bold text-emerald-800 bg-white border border-emerald-200 px-3 py-1.5 rounded-xl shadow-2xs">
          {events.filter((e) => e.status === "confirmed").length} Active Bookings
        </div>
      </div>

      {/* Events List / Agenda View */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Clock className="h-4 w-4 text-indigo-600" />
          <span>Scheduled Appointments & Calendar Reservations</span>
        </h2>

        {events.length === 0 ? (
          <Card className="p-12 text-center border-slate-200 bg-white shadow-xs">
            <CalendarIcon className="h-10 w-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-900">No Calendar Events Scheduled</h3>
            <p className="text-xs text-slate-500 mt-1">
              Switch to the AI Simulator in Clinic mode and ask to book an appointment to see live automated scheduling!
            </p>
            <div className="mt-4">
              <Link href="/simulator?industry=clinic">
                <Button size="sm" variant="glow">
                  Test Clinic Booking Flow
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((evt) => {
              const isConfirmed = evt.status === "confirmed";

              return (
                <Card
                  key={evt.id}
                  className={`p-5 border-slate-200 bg-white shadow-xs flex flex-col justify-between space-y-4 ${
                    !isConfirmed ? "opacity-60 bg-slate-50" : ""
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant={isConfirmed ? "success" : "secondary"}>
                        {evt.status.toUpperCase()}
                      </Badge>
                      <span className="text-[11px] font-mono text-slate-400">{evt.googleEventId ? "GCal Synced" : "Local"}</span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900">{evt.title}</h3>
                      {evt.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{evt.description}</p>
                      )}
                    </div>

                    {/* Event Metadata */}
                    <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 text-xs space-y-2 text-slate-700">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-indigo-600" />
                        <span>{formatDateTime(evt.startTime)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-indigo-600" />
                        <span>{evt.attendeeName}</span>
                      </div>
                      {evt.attendeePhone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-indigo-600" />
                          <span className="font-mono">{formatPhone(evt.attendeePhone)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">Duration: 30 mins</span>
                    {isConfirmed && (
                      <button
                        onClick={() => handleCancelEvent(evt.id)}
                        className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Cancel Booking</span>
                      </button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual Event Modal */}
      <Dialog
        isOpen={isNewEventModalOpen}
        onClose={() => setIsNewEventModalOpen(false)}
        title="Schedule Google Calendar Appointment"
        description="Manually create a reservation synchronized with the Google Calendar Agent tool."
      >
        <div className="space-y-3.5">
          <Input
            label="Event Title"
            value={eventTitle}
            onChange={(e) => setEventTitle(e.target.value)}
            placeholder="e.g. Doctor Consultation - Rahul Verma"
          />
          <Input
            label="Attendee / Patient Name"
            value={attendeeName}
            onChange={(e) => setAttendeeName(e.target.value)}
            placeholder="Rahul Verma"
          />
          <Input
            label="Attendee Phone Number"
            value={attendeePhone}
            onChange={(e) => setAttendeePhone(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              label="Date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
            <Input
              type="time"
              label="Time"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
            />
          </div>
          <Textarea
            label="Description / Symptoms"
            value={eventDesc}
            onChange={(e) => setEventDesc(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="secondary" size="sm" onClick={() => setIsNewEventModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="glow" size="sm" onClick={handleCreateEvent}>
              Schedule Appointment
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
