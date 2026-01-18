import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/hooks/useCompanies';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LayoutDashboard,
  Users,
  Car,
  Settings,
  LogOut,
  ChevronsUpDown,
  FileText,
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
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/admin/drivers', label: 'Drivers', icon: Users },
  { path: '/admin/applications', label: 'Applications', icon: FileText },
  { path: '/admin/vehicles', label: 'Vehicles', icon: Car },
  { path: '/admin/settings/credentials', label: 'Credentials', icon: FileText },
];

export default function AdminLayout() {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Fetch company data for branding
  const companyId = profile?.company_id ?? '';
  const { data: company, isLoading: companyLoading } = useCompany(companyId);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  // Company branding - use company primary_color or fallback
  const primaryColor = company?.primary_color || '#3B82F6';
  const companyName = company?.name || 'Admin';
  const companyInitial = companyName.charAt(0).toUpperCase();

  return (
    <SidebarProvider>
      <Sidebar>
        {/* Sidebar Header - Company Branding */}
        <SidebarHeader className="border-b border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <Link to="/admin" className="flex items-center gap-2 px-2 py-1.5">
                {companyLoading ? (
                  <>
                    <Skeleton className="w-8 h-8 rounded-lg" />
                    <Skeleton className="w-24 h-5" />
                  </>
                ) : company?.logo_url ? (
                  <>
                    <img
                      src={company.logo_url}
                      alt={companyName}
                      className="w-8 h-8 rounded-lg object-cover"
                    />
                    <span className="font-semibold text-base truncate">
                      {companyName}
                    </span>
                  </>
                ) : (
                  <>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {companyInitial}
                    </div>
                    <span className="font-semibold text-base truncate">
                      {companyName}
                    </span>
                  </>
                )}
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        {/* Sidebar Content - Navigation */}
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.path, item.exact)}
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

        {/* Sidebar Footer - User Menu */}
        <SidebarFooter className="border-t border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 text-left text-sm leading-tight">
                      <span className="font-semibold truncate block">
                        {profile?.full_name || 'Admin'}
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
                  <DropdownMenuItem onClick={() => navigate('/admin/settings')}>
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

      {/* Main Content Area */}
      <SidebarInset>
        {/* Mobile Header with Trigger */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border/40 px-4 md:hidden">
          <SidebarTrigger className="-ml-1" />
          <div className="flex items-center gap-2">
            {companyLoading ? (
              <Skeleton className="w-20 h-5" />
            ) : (
              <span className="font-semibold truncate">{companyName}</span>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
