import React, { useState, useRef } from "react";
import { Send, Paperclip, Image, FileText } from "lucide-react";
import { FileAttachment as FileAttachmentType } from "../types";
import FileAttachment from "./FileAttachment";
import { createFileAttachment } from "../utils/fileHandlers";

interface ChatInputProps {
  onSendMessage: (message: string, attachments: FileAttachmentType[]) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled,
  isLoading,
}) => {
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<FileAttachmentType[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      (!message.trim() && attachments.length === 0) ||
      disabled ||
      isLoading
    ) {
      return;
    }

    onSendMessage(message.trim(), attachments);
    setMessage("");
    setAttachments([]);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    for (const file of files) {
      try {
        const attachment = await createFileAttachment(file);
        setAttachments((prev) => [...prev, attachment]);
      } catch (error) {
        console.error("Error processing file:", error);
        alert(`Error processing file: ${error}`); // Show error to user
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 120); // Max height of ~3 lines
      textarea.style.height = `${newHeight}px`;
    }
  };

  return (
    <div className="border-t bg-white p-6">
      {/* File Attachments */}
      {attachments.length > 0 && (
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 mb-2">
            {attachments.map((attachment, index) => (
              <FileAttachment
                key={index}
                attachment={attachment}
                onRemove={() => removeAttachment(index)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex items-end gap-4">
        {/* Attachment Buttons */}
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
            disabled={disabled || isLoading}
            title="Attach files"
          >
            <Paperclip size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Message Input */}
        <div className="flex-1 flex relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              adjustTextareaHeight();
            }}
            onKeyPress={handleKeyPress}
            placeholder="Type your message here..."
            className="w-full p-8 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base flex-1"
            rows={1}
            disabled={disabled || isLoading}
            style={{ minHeight: "56px" }}
          />
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={
            (!message.trim() && attachments.length === 0) ||
            disabled ||
            isLoading
          }
          className="w-16 h-16 bg-blue-500 p-2 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-colors"
        >
          <Send
            size={20}
            className={`text-white ${isLoading ? "animate-pulse" : ""}`}
          />
        </button>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
      </form>

      {/* File Type Info */}
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <Image size={12} />
          <span>Images</span>
        </div>
        <div className="flex items-center gap-1">
          <FileText size={12} />
          <span>PDFs</span>
        </div>
        <span>• Max 10MB per file</span>
      </div>
    </div>
  );
};

export default ChatInput;
