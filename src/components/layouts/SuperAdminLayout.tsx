import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Building2,
  DollarSign,
  Settings,
  LogOut,
  ChevronsUpDown,
  ToggleLeft,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';

const navItems = [
  { path: '/super-admin/companies', label: 'Companies', icon: Building2 },
  { path: '/super-admin/billing', label: 'Billing', icon: DollarSign },
  { path: '/super-admin/feature-flags', label: 'Feature Flags', icon: ToggleLeft },
  { path: '/super-admin/settings', label: 'Settings', icon: Settings },
];

export default function SuperAdminLayout() {
  const { signOut, profile, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname.startsWith(path);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="border-b border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <Link to="/super-admin/companies" className="flex items-center gap-2 px-2 py-1.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm bg-primary">
                  D
                </div>
                <span className="font-semibold text-base truncate">Driverly</span>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.path)}
                      tooltip={item.label}
                    >
                      <Link to={item.path}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="hover:bg-transparent hover:text-sidebar-foreground data-[state=open]:bg-transparent data-[state=open]:text-sidebar-foreground"
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0 bg-primary">
                      {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'S'}
                    </div>
                    <div className="flex-1 text-left text-sm leading-tight">
                      <span className="font-semibold truncate block">
                        {profile?.full_name || 'Super Admin'}
                      </span>
                      <span className="text-xs text-muted-foreground truncate block">
                        {user?.email}
                      </span>
                    </div>
                    <ChevronsUpDown className="w-4 h-4 text-muted-foreground ml-auto" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="top"
                  align="start"
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
                >
                  <DropdownMenuItem onClick={() => navigate('/super-admin/settings')}>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border/40 px-4 md:hidden">
          <SidebarTrigger className="-ml-1" />
          <div className="flex items-center gap-2">
            <span className="font-semibold truncate">Driverly</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
