import { useState } from 'react';
import { useCompanyAdmins } from '@/hooks/useCompanies';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UserPlus, Users } from 'lucide-react';
import InviteAdminModal from './InviteAdminModal';

interface CompanyAdminsTabProps {
  companyId: string;
  companyName: string;
}

export default function CompanyAdminsTab({ companyId, companyName }: CompanyAdminsTabProps) {
  const { data: admins, isLoading } = useCompanyAdmins(companyId);
  const [showInviteModal, setShowInviteModal] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Company Admins</CardTitle>
        <Button onClick={() => setShowInviteModal(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Admin
        </Button>
      </CardHeader>
      <CardContent>
        {admins?.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No admins yet</h3>
            <p className="text-muted-foreground mb-4">Invite an admin to manage this company</p>
            <Button onClick={() => setShowInviteModal(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Admin
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins?.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell className="font-medium">{admin.full_name}</TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {admin.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        admin.status === 'active'
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                      }
                    >
                      {admin.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(admin.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <InviteAdminModal
        companyId={companyId}
        companyName={companyName}
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
      />
    </Card>
  );
}
