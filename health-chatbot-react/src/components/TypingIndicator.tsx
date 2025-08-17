import React from "react";
import {
  getSpecialist,
  getSpecialistDisplayName,
  getSpecialistEmoji,
} from "../utils/specialistUtils";

interface TypingIndicatorProps {
  specialistName?: string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  specialistName,
}) => {
  return (
    <div className="flex gap-3 p-4 animate-fade-in">
      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center text-white text-lg font-semibold">
        {getSpecialistEmoji(specialistName)}
      </div>

      <div className="max-w-[80%]">
        <div className="text-sm font-medium text-gray-700 mb-1">
          {getSpecialistDisplayName(specialistName)}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {getSpecialist(specialistName)
                ? "Analyzing your request"
                : "Routing to the right specialist"}
            </span>
            <div className="flex gap-1">
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              ></div>
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              ></div>
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
