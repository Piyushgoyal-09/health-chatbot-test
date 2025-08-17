import React from "react";
import ReactMarkdown from "react-markdown";
import { Message as MessageType } from "../types";
import { getSpecialist } from "../utils/specialistUtils";

interface MessageProps {
  message: MessageType;
}

const Message: React.FC<MessageProps> = ({ message }) => {
  const isUser = message.role === "user";
  const specialist = getSpecialist(message.speakerName);

  return (
    <div
      className={`flex gap-3 p-4 ${
        isUser ? "justify-end" : "justify-start"
      } animate-fade-in`}
    >
      {!isUser && specialist && (
        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-lg font-semibold">
          {specialist.emoji}
        </div>
      )}

      <div className={`max-w-[80%] ${isUser ? "order-first" : ""}`}>
        {!isUser && specialist && (
          <div className="text-sm font-medium text-gray-700 mb-1">
            {specialist.displayName}
          </div>
        )}

        <div
          className={`rounded-2xl px-4 py-3 shadow-sm ${
            isUser
              ? "bg-blue-500 text-white ml-auto"
              : "bg-white border border-gray-200 text-gray-800"
          }`}
        >
          <div className="text-sm leading-relaxed prose prose-sm max-w-none">
            <ReactMarkdown
              components={{
                p: ({ children }) => (
                  <p className="mb-2 last:mb-0">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="mb-2 pl-4 list-disc">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-2 pl-4 list-decimal">{children}</ol>
                ),
                li: ({ children }) => <li className="mb-1">{children}</li>,
                strong: ({ children }) => (
                  <strong className="font-semibold">{children}</strong>
                ),
                em: ({ children }) => <em className="italic">{children}</em>,
                h1: ({ children }) => (
                  <h1 className="text-lg font-semibold mb-2">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-base font-semibold mb-2">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-sm font-semibold mb-1">{children}</h3>
                ),
                code: ({ children }) => (
                  <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">
                    {children}
                  </code>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-gray-300 pl-3 italic mb-2">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>

          {message.image && typeof message.image === "string" && (
            <div className="mt-3">
              <img
                src={message.image}
                alt="Uploaded content"
                className="max-w-full h-auto rounded-lg shadow-sm"
                style={{ maxHeight: "200px" }}
              />
            </div>
          )}

          {message.pdfText && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">📄</span>
                <span className="text-sm font-medium text-gray-700">
                  PDF Content
                </span>
              </div>
              <p className="text-xs text-gray-600 line-clamp-3">
                {message.pdfText.length > 200
                  ? `${message.pdfText.substring(0, 200)}...`
                  : message.pdfText}
              </p>
            </div>
          )}
        </div>

        <div
          className={`text-xs text-gray-500 mt-1 ${
            isUser ? "text-right" : "text-left"
          }`}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-white text-lg">
          👤
        </div>
      )}
    </div>
  );
};

export default Message;
