import React, { useState, useEffect, useRef } from "react";
import { Message, FileAttachment } from "../types";
import { BackendService } from "../api/backend";
import MessageComponent from "./Message";
import ChatInput from "./ChatInput";
import Sidebar from "./Sidebar";
import TypingIndicator from "./TypingIndicator";
import TopBar from "./TopBar";
import {
  generateMessageId,
  createMessageTimestamp,
} from "../utils/messageUtils";
import { convertImageToBase64 } from "../utils/fileHandlers";

const backendService = new BackendService();

function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [currentSpecialist, setCurrentSpecialist] = useState<
    string | undefined
  >();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [backendConnected, setBackendConnected] = useState<boolean | null>(
    null
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadMoreMessages = async () => {
    if (isLoadingMore || !hasMoreMessages || !backendConnected) return;

    try {
      setIsLoadingMore(true);

      // Save current scroll position
      const container = messagesContainerRef.current;
      const scrollTop = container?.scrollTop || 0;
      const scrollHeight = container?.scrollHeight || 0;

      // Load more messages
      const moreMessages = await backendService.loadMoreMessages(
        messages.length,
        20
      );

      if (moreMessages.length > 0) {
        setMessages((prevMessages) => [...moreMessages, ...prevMessages]);
        setHasMoreMessages(moreMessages.length >= 20);

        // Restore scroll position after new messages are added
        setTimeout(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            const scrollDiff = newScrollHeight - scrollHeight;
            container.scrollTop = scrollTop + scrollDiff;
          }
        }, 100);
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error("Error loading more messages:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log("🚀 Initializing app...");
        const isConnected = await backendService.checkHealth();
        setBackendConnected(isConnected);

        if (isConnected) {
          console.log("📜 Loading chat history...");
          const history = await backendService.getChatHistory(20, 0);
          if (history.length > 0) {
            setMessages(history);
            setHasMoreMessages(history.length >= 20);
          } else {
            // Show welcome message if no history
            setMessages([
              {
                id: "welcome",
                content:
                  "Hello! I'm Ruby, your concierge at Elyx. I'm here to help with scheduling, logistics, and connecting you with the right specialist on our team. How can I help you today?",
                role: "ai",
                speakerName: "Ruby",
                timestamp: createMessageTimestamp(),
              },
            ]);
            setHasMoreMessages(false);
          }
        } else {
          // Show backend connection warning
          setMessages([
            {
              id: "backend-warning",
              content:
                "⚠️ Backend server is not running. Please start the backend server and refresh the page to continue.",
              role: "ai",
              speakerName: "System",
              timestamp: createMessageTimestamp(),
            },
          ]);
          setHasMoreMessages(false);
        }
      } catch (error) {
        console.error("Error initializing app:", error);
        setBackendConnected(false);
        setMessages([
          {
            id: "fallback",
            content:
              "Welcome to Elyx Health Concierge. Please check your connection and refresh the page.",
            role: "ai",
            speakerName: "System",
            timestamp: createMessageTimestamp(),
          },
        ]);
        setHasMoreMessages(false);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    initializeApp();
  }, []);

  useEffect(() => {
    if (!isLoading && !isLoadingHistory) {
      scrollToBottom();
    }
  }, [messages, isLoading, isLoadingHistory]);

  const handleSendMessage = async (
    content: string,
    attachments: FileAttachment[]
  ) => {
    if ((!content.trim() && !attachments.length) || isLoading) return;

    const userMessage: Message = {
      id: generateMessageId(),
      content: content.trim(),
      role: "user",
      speakerName: "You",
      timestamp: createMessageTimestamp(),
    };

    // Process attachments
    let imageData: string | undefined;
    let pdfText: string | undefined;

    if (attachments.length > 0) {
      for (const attachment of attachments) {
        if (attachment.type === "image") {
          try {
            imageData = await convertImageToBase64(attachment.file);
            userMessage.content += "\n[Image attached]";
          } catch (error) {
            console.error("Error processing image:", error);
            userMessage.content += "\n[Failed to process image]";
          }
        } else if (attachment.type === "pdf") {
          try {
            pdfText = await backendService.uploadPDF(attachment.file);
            userMessage.content += `\n[PDF: ${attachment.file.name}]`;
          } catch (error) {
            console.error("Error processing PDF:", error);
            userMessage.content += `\n[Failed to process PDF: ${attachment.file.name}]`;
          }
        }
      }
    }

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setCurrentSpecialist(undefined);

    try {
      const response = await backendService.sendMessage(
        content.trim(),
        imageData,
        pdfText
      );

      const aiMessage: Message = {
        id: generateMessageId(),
        content: response.message,
        role: "ai",
        speakerName: response.specialist_name,
        timestamp: createMessageTimestamp(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      setCurrentSpecialist(response.specialist_name);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: generateMessageId(),
        content:
          "I'm sorry, I encountered an error while processing your message. Please try again.",
        role: "ai",
        speakerName: "System",
        timestamp: createMessageTimestamp(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setCurrentSpecialist(undefined); // Clear specialist when not loading
    }
  };

  // Render Chat view
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        currentSpecialist={currentSpecialist}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          onMenuClick={() => setSidebarOpen(true)}
          backendConnected={backendConnected}
        />

        {/* Messages Area */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white"
        >
          <div className="max-w-4xl mx-auto">
            {/* Load More Messages Button */}
            {hasMoreMessages && messages.length > 0 && !isLoadingHistory && (
              <div className="p-4 text-center">
                <button
                  onClick={loadMoreMessages}
                  disabled={isLoadingMore}
                  className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 mx-auto"
                >
                  {isLoadingMore ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Loading...
                    </>
                  ) : (
                    "Load More Messages"
                  )}
                </button>
              </div>
            )}

            {/* Loading History Indicator */}
            {isLoadingHistory && (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-gray-600">Loading chat history...</span>
                </div>
              </div>
            )}

            {/* Messages */}
            {!isLoadingHistory &&
              messages.map((message) => (
                <MessageComponent key={message.id} message={message} />
              ))}

            {/* Typing Indicator */}
            {isLoading && (
              <TypingIndicator
                specialistName={currentSpecialist || "Assistant"}
              />
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Chat Input */}
        <div className="border-t border-gray-200 bg-white">
          <div className="max-w-4xl mx-auto">
            <ChatInput
              onSendMessage={handleSendMessage}
              disabled={isLoading || isLoadingHistory}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
