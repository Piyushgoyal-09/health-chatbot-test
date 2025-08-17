import React from "react";
import { specialists } from "../specialists";
import { getSpecialist } from "../utils/specialistUtils";
import { Users, Clock } from "lucide-react";

interface SidebarProps {
  currentSpecialist?: string;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentSpecialist,
  isOpen,
  onClose,
}) => {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-80 bg-white border-r border-gray-200 
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        flex flex-col
      `}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
              <Users size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Your Health Team
              </h2>
              <p className="text-xs text-gray-600">Available 24/7</p>
            </div>
          </div>

          {currentSpecialist && (
            <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
              <Clock size={16} />
              <span>
                Currently with {getSpecialist(currentSpecialist)?.displayName}
              </span>
            </div>
          )}
        </div>

        {/* Specialists List */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            Meet Your Specialists
          </h3>

          <div className="space-y-4">
            {Object.values(specialists).map((specialist) => (
              <div
                key={specialist.name}
                className={`
                  p-4 rounded-xl border transition-all duration-200
                  ${
                    currentSpecialist === specialist.name
                      ? "border-blue-200 bg-blue-50 shadow-sm"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`
                    w-12 h-12 rounded-full flex items-center justify-center text-xl font-semibold
                    ${
                      currentSpecialist === specialist.name
                        ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                        : "bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700"
                    }
                  `}
                  >
                    {specialist.emoji}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">
                      {specialist.displayName}
                    </h4>
                    <p className="text-xs text-gray-600 mb-2 leading-relaxed">
                      {specialist.description}
                    </p>

                    <div className="flex flex-wrap gap-1">
                      {specialist.expertise.slice(0, 3).map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700"
                        >
                          {skill}
                        </span>
                      ))}
                      {specialist.expertise.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{specialist.expertise.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-white text-xl">💊</span>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              Elyx Health Concierge
            </h3>
            <p className="text-xs text-gray-600">
              Personalized healthcare at your fingertips
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
