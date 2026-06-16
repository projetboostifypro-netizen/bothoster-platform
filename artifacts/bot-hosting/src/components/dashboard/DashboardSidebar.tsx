import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Bot, PlusCircle, ScrollText, Cpu, Coins, HelpCircle, Settings, LogOut, Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const menuItems = [
  { icon: LayoutDashboard, label: 'Tableau de bord', path: '/dashboard' },
  { icon: Bot, label: 'Mes Bots', path: '/dashboard/bots' },
  { icon: PlusCircle, label: 'Créer un bot', path: '/dashboard/bots/new' },
  { icon: ScrollText, label: 'Logs', path: '/dashboard/logs' },
  { icon: Cpu, label: 'Ressources', path: '/dashboard/resources' },
  { icon: Coins, label: 'Crédits', path: '/dashboard/credits' },
  { icon: HelpCircle, label: 'Support', path: '/dashboard/support' },
  { icon: Settings, label: 'Paramètres', path: '/dashboard/settings' },
];

interface DashboardSidebarProps {
  onNavigate?: () => void;
}

const DashboardSidebar = ({ onNavigate }: DashboardSidebarProps) => {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <aside className="w-64 min-h-screen border-r border-border bg-sidebar flex flex-col">
      <div className="p-4 border-b border-border">
        <Link to="/" className="flex items-center gap-2" onClick={onNavigate}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill="#16a34a"/>
            <circle cx="16" cy="11" r="3" fill="white"/>
            <rect x="9" y="16" width="14" height="9" rx="4" fill="white"/>
            <circle cx="12" cy="20" r="1.5" fill="#16a34a"/>
            <circle cx="20" cy="20" r="1.5" fill="#16a34a"/>
            <rect x="14" y="7" width="4" height="2" rx="1" fill="white"/>
            <line x1="16" y1="7" x2="16" y2="5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="16" cy="4.5" r="1" fill="white"/>
          </svg>
          <span className="font-bold font-heading text-sidebar-foreground">Bot<span className="text-primary">Hoster</span></span>
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
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-sidebar-accent text-primary font-medium'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground'
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
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                location.pathname === '/dashboard/admin'
                  ? 'bg-sidebar-accent text-primary font-medium'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground'
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
