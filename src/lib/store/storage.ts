import {
  Business,
  Workflow,
  Conversation,
  Customer,
  CalendarEvent,
  Task,
  NotificationItem,
  DashboardKPIs,
  ConversationStatus,
  UrgencyLevel,
} from "@/types";
import {
  DEMO_BUSINESSES,
  DEMO_WORKFLOWS,
  DEMO_CUSTOMERS,
  DEMO_CONVERSATIONS,
  DEMO_CALENDAR_EVENTS,
  DEMO_TASKS,
  DEMO_NOTIFICATIONS,
} from "./demo-data";
import { generateId } from "../utils";

const STORAGE_KEY = "callpilot_ai_v1_store";

export interface AppState {
  activeBusinessId: string;
  businesses: Business[];
  workflows: Workflow[];
  conversations: Conversation[];
  customers: Customer[];
  calendarEvents: CalendarEvent[];
  tasks: Task[];
  notifications: NotificationItem[];
  googleCalendarConnected: boolean;
  apiKey?: string;
  customSettings: {
    voiceProvider: string;
    temperature: number;
    emailNotificationEnabled: boolean;
    smsNotificationEnabled: boolean;
  };
}

const defaultInitialState: AppState = {
  activeBusinessId: "biz_cake_haven",
  businesses: DEMO_BUSINESSES,
  workflows: DEMO_WORKFLOWS,
  conversations: DEMO_CONVERSATIONS,
  customers: DEMO_CUSTOMERS,
  calendarEvents: DEMO_CALENDAR_EVENTS,
  tasks: DEMO_TASKS,
  notifications: DEMO_NOTIFICATIONS,
  googleCalendarConnected: true,
  customSettings: {
    voiceProvider: "simulated",
    temperature: 0.5,
    emailNotificationEnabled: true,
    smsNotificationEnabled: false,
  },
};

class StorageRepository {
  private state: AppState = defaultInitialState;
  private listeners: Set<(state: AppState) => void> = new Set();
  private initialized: boolean = false;

  constructor() {
    this.init();
  }

  private init(): void {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          this.state = {
            ...defaultInitialState,
            ...parsed,
          };
        } else {
          this.saveToLocalStorage();
        }
      } catch (err) {
        console.warn("Could not load from localStorage:", err);
      }
    }
    this.initialized = true;
  }

  private saveToLocalStorage(): void {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch (err) {
        console.warn("Could not save to localStorage:", err);
      }
    }
    this.notify();
  }

  public subscribe(fn: (state: AppState) => void): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  public getState(): AppState {
    return this.state;
  }

  // Active Business
  public getActiveBusiness(): Business {
    return (
      this.state.businesses.find((b) => b.id === this.state.activeBusinessId) ||
      this.state.businesses[0] ||
      DEMO_BUSINESSES[0]
    );
  }

  public setActiveBusiness(businessId: string): void {
    this.state.activeBusinessId = businessId;
    this.saveToLocalStorage();
  }

  public getBusinesses(): Business[] {
    return this.state.businesses;
  }

  public getBusiness(id?: string): Business | undefined {
    if (!id) return this.getActiveBusiness();
    return this.state.businesses.find((b) => b.id === id);
  }

  public createBusiness(data: Omit<Business, "id" | "createdAt" | "updatedAt">): Business {
    const newBiz: Business = {
      id: generateId("biz"),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.state.businesses.push(newBiz);
    this.state.activeBusinessId = newBiz.id;
    this.saveToLocalStorage();
    return newBiz;
  }

  public updateBusiness(id: string, updates: Partial<Business>): Business | null {
    const idx = this.state.businesses.findIndex((b) => b.id === id);
    if (idx === -1) return null;
    this.state.businesses[idx] = {
      ...this.state.businesses[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveToLocalStorage();
    return this.state.businesses[idx];
  }

  // Workflows
  public getWorkflows(businessId?: string): Workflow[] {
    const bId = businessId || this.state.activeBusinessId;
    return this.state.workflows.filter((w) => w.businessId === bId);
  }

  public getWorkflow(id: string): Workflow | undefined {
    return this.state.workflows.find((w) => w.id === id);
  }

  public createWorkflow(workflowData: Omit<Workflow, "id" | "createdAt" | "updatedAt">): Workflow {
    const newWf: Workflow = {
      id: generateId("wf"),
      ...workflowData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.state.workflows.push(newWf);
    this.saveToLocalStorage();
    return newWf;
  }

  public updateWorkflow(id: string, updates: Partial<Workflow>): Workflow | null {
    const idx = this.state.workflows.findIndex((w) => w.id === id);
    if (idx === -1) return null;
    this.state.workflows[idx] = {
      ...this.state.workflows[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveToLocalStorage();
    return this.state.workflows[idx];
  }

  public deleteWorkflow(id: string): boolean {
    const initialLen = this.state.workflows.length;
    this.state.workflows = this.state.workflows.filter((w) => w.id !== id);
    if (this.state.workflows.length !== initialLen) {
      this.saveToLocalStorage();
      return true;
    }
    return false;
  }

  // Conversations
  public getConversations(businessId?: string): Conversation[] {
    const bId = businessId || this.state.activeBusinessId;
    return this.state.conversations
      .filter((c) => c.businessId === bId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getConversation(id: string): Conversation | undefined {
    return this.state.conversations.find((c) => c.id === id);
  }

  public createConversation(data: Omit<Conversation, "id" | "createdAt" | "updatedAt">): Conversation {
    const newConv: Conversation = {
      id: generateId("conv"),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.state.conversations.unshift(newConv);

    // Also auto-create or update customer record
    this.createOrUpdateCustomerFromConversation(newConv);

    // If urgent, push notification
    if (newConv.urgency === "HIGH" || newConv.urgency === "CRITICAL") {
      this.createNotification({
        businessId: newConv.businessId,
        title: "Urgent Customer Inquiry Received",
        message: `${newConv.callerName || newConv.callerNumber} flagged as ${newConv.urgency} urgency (${newConv.intent}).`,
        type: "urgent_call",
        conversationId: newConv.id,
      });
    }

    this.saveToLocalStorage();
    return newConv;
  }

  public updateConversation(id: string, updates: Partial<Conversation>): Conversation | null {
    const idx = this.state.conversations.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    this.state.conversations[idx] = {
      ...this.state.conversations[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveToLocalStorage();
    return this.state.conversations[idx];
  }

  public updateConversationStatus(id: string, status: ConversationStatus): Conversation | null {
    return this.updateConversation(id, {
      status,
      completedAt: status === "completed" || status === "closed" ? new Date().toISOString() : undefined,
    });
  }

  // Customers
  public getCustomers(businessId?: string): Customer[] {
    const bId = businessId || this.state.activeBusinessId;
    return this.state.customers.filter((c) => c.businessId === bId);
  }

  public getCustomer(id: string): Customer | undefined {
    return this.state.customers.find((c) => c.id === id);
  }

  public createOrUpdateCustomerFromConversation(conv: Conversation): Customer {
    const phone = conv.callerNumber;
    const name = conv.callerName || conv.extractedFields.customer_name || conv.extractedFields.patient_name || "Caller";
    let existing = this.state.customers.find(
      (c) => c.businessId === conv.businessId && (c.phone === phone || c.name.toLowerCase() === name.toLowerCase())
    );

    if (existing) {
      existing.lastInteractionAt = new Date().toISOString();
      existing.totalConversations += 1;
      existing.latestUrgency = conv.urgency;
      existing.extractedAttributes = {
        ...existing.extractedAttributes,
        ...conv.extractedFields,
      };
      if (name !== "Caller") existing.name = name;
      this.saveToLocalStorage();
      return existing;
    } else {
      const newCust: Customer = {
        id: generateId("cust"),
        businessId: conv.businessId,
        name,
        phone,
        latestUrgency: conv.urgency,
        lastInteractionAt: new Date().toISOString(),
        totalConversations: 1,
        extractedAttributes: { ...conv.extractedFields },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.state.customers.unshift(newCust);
      this.saveToLocalStorage();
      return newCust;
    }
  }

  // Calendar Events
  public getCalendarEvents(businessId?: string): CalendarEvent[] {
    const bId = businessId || this.state.activeBusinessId;
    return this.state.calendarEvents
      .filter((e) => e.businessId === bId && e.status !== "cancelled")
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }

  public createCalendarEvent(data: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">): CalendarEvent {
    const newEvt: CalendarEvent = {
      id: generateId("evt"),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.state.calendarEvents.push(newEvt);
    this.createNotification({
      businessId: newEvt.businessId,
      title: "Google Calendar Event Scheduled",
      message: `${newEvt.title} booked for ${new Date(newEvt.startTime).toLocaleDateString()}`,
      type: "appointment_booked",
      conversationId: newEvt.conversationId,
    });
    this.saveToLocalStorage();
    return newEvt;
  }

  public cancelCalendarEvent(id: string): boolean {
    const evt = this.state.calendarEvents.find((e) => e.id === id);
    if (evt) {
      evt.status = "cancelled";
      evt.updatedAt = new Date().toISOString();
      this.saveToLocalStorage();
      return true;
    }
    return false;
  }

  // Tasks
  public getTasks(businessId?: string): Task[] {
    const bId = businessId || this.state.activeBusinessId;
    return this.state.tasks.filter((t) => t.businessId === bId);
  }

  public createTask(data: Omit<Task, "id" | "createdAt">): Task {
    const newTask: Task = {
      id: generateId("task"),
      ...data,
      createdAt: new Date().toISOString(),
    };
    this.state.tasks.unshift(newTask);
    this.saveToLocalStorage();
    return newTask;
  }

  public toggleTask(id: string): boolean {
    const task = this.state.tasks.find((t) => t.id === id);
    if (task) {
      task.completed = !task.completed;
      this.saveToLocalStorage();
      return true;
    }
    return false;
  }

  // Notifications
  public getNotifications(businessId?: string): NotificationItem[] {
    const bId = businessId || this.state.activeBusinessId;
    return this.state.notifications
      .filter((n) => n.businessId === bId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public createNotification(data: Omit<NotificationItem, "id" | "createdAt" | "isRead">): NotificationItem {
    const newNotif: NotificationItem = {
      id: generateId("notif"),
      ...data,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    this.state.notifications.unshift(newNotif);
    this.saveToLocalStorage();
    return newNotif;
  }

  public markNotificationRead(id: string): void {
    const notif = this.state.notifications.find((n) => n.id === id);
    if (notif) {
      notif.isRead = true;
      this.saveToLocalStorage();
    }
  }

  public markAllNotificationsRead(businessId?: string): void {
    const bId = businessId || this.state.activeBusinessId;
    for (const n of this.state.notifications) {
      if (n.businessId === bId) {
        n.isRead = true;
      }
    }
    this.saveToLocalStorage();
  }

  // Dashboard KPIs
  public getDashboardKPIs(businessId?: string): DashboardKPIs {
    const bId = businessId || this.state.activeBusinessId;
    const convs = this.state.conversations.filter((c) => c.businessId === bId);
    const events = this.state.calendarEvents.filter((e) => e.businessId === bId && e.status === "confirmed");

    const totalConversations = convs.length;
    const missedCalls = totalConversations + 8; // realistic phone line counter
    const qualifiedLeads = convs.filter(
      (c) => c.status === "contacted" || c.status === "completed" || Object.keys(c.extractedFields).length >= 3
    ).length;
    const urgentFollowUps = convs.filter(
      (c) => (c.urgency === "HIGH" || c.urgency === "CRITICAL") && c.status !== "closed"
    ).length;
    const appointmentsBooked = events.length;
    const completedConvs = convs.filter((c) => c.status === "completed" || c.status === "closed").length;
    const completionRate = totalConversations > 0 ? Math.round((completedConvs / totalConversations) * 100) : 85;

    return {
      missedCalls,
      aiConversations: totalConversations,
      qualifiedLeads,
      urgentFollowUps,
      appointmentsBooked,
      completionRate,
    };
  }

  // Quick Switch / Load Demo Business
  public loadDemoBusiness(businessType: string): Business {
    const match = this.state.businesses.find((b) => b.type === businessType);
    if (match) {
      this.state.activeBusinessId = match.id;
      this.saveToLocalStorage();
      return match;
    }
    return this.getActiveBusiness();
  }

  public resetToFactoryDemo(): void {
    this.state = { ...defaultInitialState };
    this.saveToLocalStorage();
  }
}

export const storageRepo = new StorageRepository();
