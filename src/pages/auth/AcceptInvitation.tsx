import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Invitation {
  id: string;
  email: string;
  role: string;
  company_id: string;
  company?: {
    name: string;
    logo_url: string | null;
    primary_color: string | null;
  } | null;
}

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setError('No invitation token provided');
        setLoading(false);
        return;
      }

      try {
        // Hash the token for lookup
        const encoder = new TextEncoder();
        const data = encoder.encode(token);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Look up invitation by token hash
        const { data: inv, error: fetchError } = await supabase
          .from('invitations')
          .select(`
            id,
            email,
            role,
            company_id,
            status,
            expires_at,
            company:companies(name, logo_url, primary_color)
          `)
          .eq('token_hash', tokenHash)
          .single();

        if (fetchError || !inv) {
          setError('Invalid invitation link');
          setLoading(false);
          return;
        }

        if (inv.status !== 'pending') {
          setError('This invitation has already been used or expired');
          setLoading(false);
          return;
        }

        if (new Date(inv.expires_at) < new Date()) {
          setError('This invitation has expired');
          setLoading(false);
          return;
        }

        setInvitation(inv as Invitation);
      } catch (err) {
        console.error('Error validating invitation:', err);
        setError('Failed to validate invitation');
      } finally {
        setLoading(false);
      }
    }

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: 'Password must be at least 8 characters',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data, error: acceptError } = await supabase.functions.invoke('accept-invitation', {
        body: {
          token,
          password,
          fullName,
        },
      });

      if (acceptError) throw acceptError;
      if (data?.error) throw new Error(data.error);

      toast({
        title: 'Account created successfully!',
        description: 'You can now sign in with your email and password.',
      });

      navigate('/login');
    } catch (err: any) {
      console.error('Error accepting invitation:', err);
      toast({
        title: 'Failed to create account',
        description: err.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Validating invitation...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate('/login')}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  const companyName = invitation.company?.name || 'Driverly';
  const companyLogoUrl = invitation.company?.logo_url || null;
  const companyColor = invitation.company?.primary_color || '#3B82F6';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          {companyLogoUrl ? (
            <img
              src={companyLogoUrl}
              alt={companyName}
              className="w-16 h-16 mx-auto rounded-lg object-cover"
            />
          ) : (
            <div
              className="w-16 h-16 mx-auto rounded-lg flex items-center justify-center"
              style={{ backgroundColor: companyColor }}
            >
              <span className="text-white text-2xl font-bold">
                {companyName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <CardTitle>Join {companyName}</CardTitle>
            <CardDescription>
              You've been invited as an <strong>{invitation.role}</strong>. Create your account to get started.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={invitation.email}
                disabled
                className="bg-muted"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            
            <Button
              type="submit"
              className="w-full"
              disabled={submitting}
              style={{ backgroundColor: companyColor }}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
