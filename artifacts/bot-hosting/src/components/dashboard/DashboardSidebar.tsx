import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Bot, PlusCircle, ScrollText, Cpu, Coins, HelpCircle, Settings, LogOut, Home, Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const menuItems = [
  { icon: Home, label: "Accueil", path: "/" },
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Bot, label: "Mes Bots", path: "/dashboard/bots" },
  { icon: PlusCircle, label: "Créer un Bot", path: "/dashboard/bots/new" },
  { icon: ScrollText, label: "Logs", path: "/dashboard/logs" },
  { icon: Cpu, label: "Ressources", path: "/dashboard/resources" },
  { icon: Coins, label: "Crédits", path: "/dashboard/credits" },
  { icon: HelpCircle, label: "Support", path: "/dashboard/support" },
  { icon: Settings, label: "Paramètres", path: "/dashboard/settings" },
];

interface DashboardSidebarProps {
  onNavigate?: () => void;
}

const DashboardSidebar = ({ onNavigate }: DashboardSidebarProps) => {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <aside className="w-64 min-h-screen border-r border-border bg-sidebar flex flex-col">
      <div className="p-4 border-b border-border">
        <Link to="/" className="flex items-center gap-2" onClick={onNavigate}>
          <img src="/logo.png" alt="BotHoster" className="h-8 w-8 rounded-md object-contain" />
          <span className="font-bold font-heading">Bot<span className="text-primary">Hoster</span></span>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-primary font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="pt-3 pb-1 px-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Administration</p>
            </div>
            <Link
              to="/dashboard/admin"
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                location.pathname === "/dashboard/admin"
                  ? "bg-sidebar-accent text-primary font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
              )}
            >
              <Shield className="h-4 w-4" />
              Panneau Admin
            </Link>
          </>
        )}
      </nav>

      <div className="p-3 border-t border-border space-y-1">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors w-full"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
