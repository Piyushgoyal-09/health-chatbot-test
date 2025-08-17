export interface Message {
  id: string;
  content: string;
  role: "user" | "ai";
  speakerName?: string;
  timestamp: Date;
  image?: File | string;
  pdfText?: string;
  isTyping?: boolean;
}

export interface Specialist {
  name: string;
  displayName: string;
  emoji: string;
  description: string;
  expertise: string[];
  prompt: string;
}

export interface FileAttachment {
  file: File;
  type: "image" | "pdf";
  preview?: string;
}

export interface ChatState {
  messages: Message[];
  currentSpecialist: string;
  isLoading: boolean;
  attachments: FileAttachment[];
}
