import { ReactNode } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Home, CalendarDays, Target, Settings, Plus, LogOut, ArrowLeftRight, LineChart } from 'lucide-react';
import { useState } from 'react';
import AddTransactionDialog from './AddTransactionDialog';
import PuntLogo from './PuntLogo';

const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { path: '/portfolio', label: 'Portfolio', icon: LineChart },
  { path: '/calendar', label: 'Calendar', icon: CalendarDays },
  { path: '/goals', label: 'Goals', icon: Target },
  { path: '/settings', label: 'Settings', icon: Settings },
];

const AppLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const { signOut } = useAuth();
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-[240px] flex-col border-r border-border bg-sidebar p-6">
        <Link to="/" className="text-2xl font-bold tracking-[-0.05em] text-primary mb-10">
          LF
        </Link>
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? 'bg-sidebar-accent text-primary'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={signOut}
          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        <div className="mx-auto max-w-5xl p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* FAB */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-gold-glow active:scale-95 transition-all"
      >
        <Plus size={24} />
      </button>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-border bg-background md:hidden">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 text-xs transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <AddTransactionDialog open={showAdd} onOpenChange={setShowAdd} />
    </div>
  );
};

export default AppLayout;
