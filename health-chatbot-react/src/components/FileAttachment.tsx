import React from "react";
import { X, Image, FileText } from "lucide-react";
import { FileAttachment as FileAttachmentType } from "../types";
import { formatFileSize } from "../utils/fileHandlers";

interface FileAttachmentProps {
  attachment: FileAttachmentType;
  onRemove: () => void;
}

const FileAttachment: React.FC<FileAttachmentProps> = ({
  attachment,
  onRemove,
}) => {
  return (
    <div className="relative bg-white border border-gray-200 rounded-lg p-3 shadow-sm animate-slide-up">
      <button
        onClick={onRemove}
        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors z-10"
        aria-label="Remove attachment"
      >
        <X size={12} />
      </button>

      {attachment.type === "image" && attachment.preview ? (
        <div className="flex items-start gap-3">
          <img
            src={attachment.preview}
            alt={attachment.file.name}
            className="w-16 h-16 object-cover rounded-md border"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Image size={16} className="text-blue-500 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-900 truncate">
                {attachment.file.name}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {formatFileSize(attachment.file.size)}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-red-100 rounded-md flex items-center justify-center">
            <FileText size={20} className="text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <FileText size={16} className="text-red-500 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-900 truncate">
                {attachment.file.name}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {formatFileSize(attachment.file.size)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileAttachment;
