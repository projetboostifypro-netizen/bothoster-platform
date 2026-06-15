import { Outlet } from "react-router-dom";
import DashboardSidebar from "./DashboardSidebar";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`${
          isMobile
            ? `fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ${
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
              }`
            : ""
        }`}
      >
        <DashboardSidebar onNavigate={() => isMobile && setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-6 overflow-auto">
        {isMobile && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="mb-4 p-2 rounded-lg border border-border bg-card text-foreground hover:bg-secondary transition-colors"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        )}
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
