import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, BarChart3, MessageCircle } from "lucide-react";

interface TopBarProps {
  onMenuClick: () => void;
  backendConnected: boolean | null;
}

const TopBar: React.FC<TopBarProps> = ({ onMenuClick, backendConnected }) => {
  const location = useLocation();
  const isDashboard = location.pathname === "/dashboard";

  return (
    <header className="bg-white border-b border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            style={{ backgroundColor: "transparent", border: "none" }}
          >
            <Menu size={20} className="text-gray-600" />
          </button>

          <div>
            <h1 className="text-xl font-bold text-gray-900 m-0">
              Elyx Health Concierge
            </h1>
            <p className="text-sm text-gray-600 m-0">
              {isDashboard
                ? "Track your wellness journey"
                : "Your personal health team is ready to assist"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Navigation Button */}
          <Link
            to={isDashboard ? "/" : "/dashboard"}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            {isDashboard ? (
              <>
                <MessageCircle className="w-4 h-4" />
                Back to Chat
              </>
            ) : (
              <>
                <BarChart3 className="w-4 h-4" />
                Dashboard
              </>
            )}
          </Link>

          {/* Backend Status Indicator */}
          <div className="flex items-center gap-2">
            <div
              className={`rounded-full ${
                backendConnected === true
                  ? "bg-green-500"
                  : backendConnected === false
                  ? "bg-red-500"
                  : "bg-yellow-500"
              }`}
              style={{ width: "12px", height: "12px" }}
            ></div>
            <span className="text-sm font-medium text-gray-700">
              {backendConnected === true
                ? "Backend Connected"
                : backendConnected === false
                ? "Backend Offline"
                : "Checking..."}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
