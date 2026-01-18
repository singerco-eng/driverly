import { Outlet, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export default function DriverLayout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border/40 px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">Driver Portal</h1>
          <p className="text-sm text-muted-foreground">Manage your application status</p>
        </div>
        <Button variant="outline" onClick={handleSignOut}>
          Sign Out
        </Button>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
