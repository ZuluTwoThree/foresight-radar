import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import {
  Radar,
  LayoutDashboard,
  Zap,
  TrendingUp,
  Network,
  Settings,
  LogOut,
  ChevronDown,
  Plus,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Zap, label: 'Signals', href: '/signals' },
  { icon: TrendingUp, label: 'Trends', href: '/trends' },
  { icon: Radar, label: 'Trend Radar', href: '/radar' },
  { icon: Network, label: 'Network', href: '/network' },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, signOut } = useAuth();
  const { currentWorkspace, workspaces, setCurrentWorkspace } = useWorkspace();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-sidebar-border">
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Radar className="w-5 h-5 text-primary" />
              </div>
              <span className="font-display text-lg font-semibold text-sidebar-foreground">
                Foresight
              </span>
            </Link>
          </div>

          {/* Workspace Selector */}
          <div className="p-4 border-b border-sidebar-border">
            <div className="relative">
              <button
                onClick={() => setWorkspaceDropdownOpen(!workspaceDropdownOpen)}
                className="w-full p-3 rounded-lg bg-sidebar-accent text-sidebar-foreground flex items-center justify-between hover:bg-sidebar-accent/80 transition-colors"
              >
                <span className="text-sm font-medium truncate">
                  {currentWorkspace?.name || 'Select Workspace'}
                </span>
                <ChevronDown className={cn('w-4 h-4 transition-transform', workspaceDropdownOpen && 'rotate-180')} />
              </button>

              {workspaceDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 p-2 rounded-lg bg-popover border border-border shadow-xl z-10">
                  {workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => {
                        setCurrentWorkspace(ws);
                        setWorkspaceDropdownOpen(false);
                      }}
                      className={cn(
                        'w-full p-2 rounded-md text-left text-sm hover:bg-secondary transition-colors',
                        currentWorkspace?.id === ws.id && 'bg-secondary'
                      )}
                    >
                      {ws.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-sidebar-border space-y-2">
            <Link
              to="/settings"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              <Settings className="w-5 h-5" />
              Settings
            </Link>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 lg:pl-64">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 lg:hidden border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="flex items-center justify-between p-4">
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-secondary">
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-display font-semibold">{currentWorkspace?.name}</span>
            <div className="w-9" />
          </div>
        </header>

        {/* Page content */}
        <main className="min-h-screen">{children}</main>
      </div>
    </div>
  );
}
