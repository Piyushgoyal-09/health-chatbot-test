import axios from "axios";
import { Message } from "../types";
import { generateMessageId } from "../utils/messageUtils";


const API_BASE_URL = process.env.REACT_APP_BASE_URL;

// Create axios instance with default configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export interface ChatRequest {
  message: string;
  session_id?: string;
  image_data?: string; // base64 encoded
  pdf_text?: string;
}

export interface ChatResponse {
  message: string;
  specialist_name: string;
  session_id: string;
  avatar: string;
  timestamp: string;
}

export interface SpecialistInfo {
  name: string;
  avatar: string;
  description: string;
}

export interface TaskProgress {
  task_name: string;
  progress: string[];
}

export interface HealthPlan {
  id: string;
  plan_name: string;
  condition: string;
  timeline_days: number;
  tasks: TaskProgress[];
  created_at: string;
  updated_at: string;
}

export interface PlanProgressStats {
  plan_id: string;
  plan_name: string;
  condition: string;
  timeline_days: number;
  total_tasks: number;
  completed_tasks: number;
  progress_percentage: number;
  daily_progress: Array<{
    date: string;
    completed: number;
    total: number;
  }>;
}

export interface DashboardSummary {
  total_active_plans: number;
  total_tasks: number;
  completed_tasks: number;
  overall_progress: number;
  recent_activity: Array<{
    date: string;
    plan_name: string;
    task_name: string;
    type: string;
  }>;
}

export interface SpecialistStats {
  specialist_name: string;
  total_words_generated: number;
  total_messages_sent: number;
  last_activity: string | null;
  daily_word_counts: Record<string, number>;
}

export interface TimeSpentData {
  date: string;
  display_date: string;
  total_words: number;
  time_spent_minutes: number;
  time_spent_seconds: number;
  specialist_breakdown: Record<string, number>;
}

export interface TimeSpentAnalytics {
  daily_time_data: TimeSpentData[];
  summary: {
    total_time_minutes: number;
    total_words_generated: number;
    average_daily_time_minutes: number;
    days_with_activity: number;
    specialist_word_totals: Record<string, number>;
  };
}

export interface WordGenerationTrends {
  specialist_trends: Record<
    string,
    Array<{
      date: string;
      display_date: string;
      words: number;
      time_minutes: number;
    }>
  >;
  specialist_totals: Array<{
    specialist_name: string;
    total_words: number;
    total_messages: number;
    last_activity: string | null;
  }>;
}

export class BackendService {
  private sessionId: string;

  private generateSessionId(): string {
    return (
      "react-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9)
    );
  }

  constructor() {
    // Try to get existing session ID from localStorage, or generate new one
    const existingSessionId = localStorage.getItem("elyx_session_id");
    if (existingSessionId) {
      this.sessionId = existingSessionId;
      console.log("📱 Using existing session ID:", this.sessionId);
    } else {
      this.sessionId = this.generateSessionId();
      localStorage.setItem("elyx_session_id", this.sessionId);
      console.log("🆕 Generated new session ID:", this.sessionId);
    }
  }

  // Get session ID
  getSessionId(): string {
    return this.sessionId;
  }

  // Send a chat message and get specialist response
  async sendMessage(
    message: string,
    imageData?: string,
    pdfText?: string
  ): Promise<ChatResponse> {
    try {
      const payload: ChatRequest = {
        message,
        session_id: this.sessionId,
        image_data: imageData,
        pdf_text: pdfText,
      };

      console.log("🚀 Payload to backend:", {
        message_length: payload.message?.length || 0,
        session_id: payload.session_id,
        image_data: payload.image_data
          ? `${Math.round(payload.image_data.length / 1024)}KB base64`
          : null,
        pdf_text: payload.pdf_text ? `${payload.pdf_text.length} chars` : null,
      });

      const response = await api.post("/chat", payload);
      return response.data;
    } catch (error) {
      console.error("Error sending message:", error);
      throw new Error("Failed to send message to backend");
    }
  }

  // Get chat history for current session with pagination
  async getChatHistory(
    limit: number = 20,
    offset: number = 0
  ): Promise<Message[]> {
    try {
      console.log(`📜 Loading chat history: limit=${limit}, offset=${offset}`);
      const response = await api.get(`/chat/${this.sessionId}/history`, {
        params: { limit, offset },
      });

      const messages = response.data.map((msg: any) => ({
        id: generateMessageId(),
        content: msg.content,
        role: msg.role,
        speakerName: msg.speaker_name,
        timestamp: new Date(msg.timestamp),
        image: msg.image_data,
        pdfText: msg.pdf_text,
      }));

      console.log(`✅ Loaded ${messages.length} messages from history`);
      return messages;
    } catch (error) {
      console.error("Error getting chat history:", error);
      // Don't throw error for history loading - just return empty array
      return [];
    }
  }

  // Load more messages (for "Load More" button)
  async loadMoreMessages(
    currentMessageCount: number,
    limit: number = 20
  ): Promise<Message[]> {
    return this.getChatHistory(limit, currentMessageCount);
  }

  // Get list of specialists
  async getSpecialists(): Promise<SpecialistInfo[]> {
    try {
      const response = await api.get("/specialists");
      return response.data;
    } catch (error) {
      console.error("Error getting specialists:", error);
      throw new Error("Failed to get specialists");
    }
  }

  // Upload PDF and extract text
  async uploadPDF(file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post("/upload/pdf", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return response.data.text;
    } catch (error) {
      console.error("Error uploading PDF:", error);
      throw new Error("Failed to upload PDF");
    }
  }

  // Note: Image processing is now handled locally in the frontend
  // Images are converted to base64 directly and sent in the chat message

  // Check if backend is available
  async checkHealth(): Promise<boolean> {
    try {
      const response = await api.get("/");
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  // Clear current session
  async clearSession(): Promise<void> {
    try {
      await api.delete(`/chat/${this.sessionId}`);
      // Generate new session ID and update localStorage
      this.sessionId = this.generateSessionId();
      localStorage.setItem("elyx_session_id", this.sessionId);
      console.log("🔄 Session cleared, new session ID:", this.sessionId);
    } catch (error) {
      console.error("Error clearing session:", error);
      // Still generate new session ID even if delete fails
      this.sessionId = this.generateSessionId();
      localStorage.setItem("elyx_session_id", this.sessionId);
      console.log(
        "🔄 Session cleared (with error), new session ID:",
        this.sessionId
      );
    }
  }

  // Dashboard API methods

  // Get all active health plans
  async getHealthPlans(): Promise<HealthPlan[]> {
    try {
      const response = await api.get("/plans");
      return response.data;
    } catch (error) {
      console.error("Error getting health plans:", error);
      return [];
    }
  }

  // Get progress statistics for a specific plan
  async getPlanProgress(planId: string): Promise<PlanProgressStats | null> {
    try {
      const response = await api.get(`/plans/${planId}/progress`);
      return response.data;
    } catch (error) {
      console.error("Error getting plan progress:", error);
      return null;
    }
  }

  // Get dashboard summary with overall statistics
  async getDashboardSummary(): Promise<DashboardSummary | null> {
    try {
      const response = await api.get("/dashboard/summary");
      return response.data;
    } catch (error) {
      console.error("Error getting dashboard summary:", error);
      return null;
    }
  }

  // Mark task as complete
  async markTaskComplete(
    planId: string,
    taskName: string,
    date?: string
  ): Promise<boolean> {
    try {
      const payload = {
        plan_id: planId,
        task_name: taskName,
        date: date || new Date().toISOString().split("T")[0], // YYYY-MM-DD format
      };

      const response = await api.post(`/plans/${planId}/progress`, payload);
      return response.status === 200;
    } catch (error) {
      console.error("Error marking task complete:", error);
      return false;
    }
  }

  // Mark all tasks complete for a plan (bulk update)
  async markAllTasksComplete(
    planId: string,
    condition: string
  ): Promise<boolean> {
    try {
      const payload = {
        message: `I completed all tasks for my ${condition} plan today`,
        mark_all_complete: true,
        specific_plan_condition: condition,
      };

      const response = await api.post("/progress/daily-report", payload);
      return response.status === 200;
    } catch (error) {
      console.error("Error marking all tasks complete:", error);
      return false;
    }
  }

  // Deactivate a health plan
  async deactivatePlan(planId: string): Promise<boolean> {
    try {
      const response = await api.delete(`/plans/${planId}`);
      return response.status === 200;
    } catch (error) {
      console.error("Error deactivating plan:", error);
      return false;
    }
  }

  // Analytics API methods

  // Get specialist statistics
  async getSpecialistStats(
    specialistName?: string
  ): Promise<SpecialistStats[]> {
    try {
      const params = specialistName ? { specialist_name: specialistName } : {};
      const response = await api.get("/specialists/stats", { params });
      return response.data.specialist_stats;
    } catch (error) {
      console.error("Error getting specialist stats:", error);
      return [];
    }
  }

  // Get time spent analytics for the last 7 days
  async getTimeSpentAnalytics(): Promise<TimeSpentAnalytics | null> {
    try {
      const response = await api.get("/analytics/time-spent");
      return response.data;
    } catch (error) {
      console.error("Error getting time spent analytics:", error);
      return null;
    }
  }

  // Get word generation trends by specialist
  async getWordGenerationTrends(): Promise<WordGenerationTrends | null> {
    try {
      const response = await api.get("/analytics/word-generation-trends");
      return response.data;
    } catch (error) {
      console.error("Error getting word generation trends:", error);
      return null;
    }
  }
}
