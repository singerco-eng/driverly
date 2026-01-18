import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Building2, LogOut, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuperAdminLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/super-admin/companies', label: 'Companies', icon: Building2 },
  { path: '/super-admin/settings', label: 'Settings', icon: Settings },
];

export default function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  const { signOut, profile } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="flex items-center justify-between h-16 px-6">
          <div className="flex items-center gap-6">
            <Link to="/super-admin" className="text-xl font-bold">
              Driverly
            </Link>
            <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
              Super Admin
            </span>
          </div>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <Button
                  variant="ghost"
                  className={cn(
                    'gap-2',
                    location.pathname.startsWith(item.path) && 'bg-accent'
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {profile?.full_name || profile?.email}
            </span>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
