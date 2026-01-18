import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Mail, Phone, MapPin, Hash } from 'lucide-react';
import type { CompanyDetail } from '@/types/company';

interface CompanyInfoTabProps {
  company: CompanyDetail;
}

export default function CompanyInfoTab({ company }: CompanyInfoTabProps) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <InfoRow label="Company Name" value={company.name} />
          <InfoRow label="URL Slug" value={`/${company.slug}`} />
          <InfoRow label="Status" value={company.status} />
          <InfoRow label="Timezone" value={company.timezone} />
          {company.ein && <InfoRow label="EIN" value={company.ein} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <InfoRow label="Email" value={company.email || '—'} />
          <InfoRow label="Phone" value={company.phone || '—'} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {company.address_line1 || company.city ? (
            <>
              {company.address_line1 && <InfoRow label="Address Line 1" value={company.address_line1} />}
              {company.address_line2 && <InfoRow label="Address Line 2" value={company.address_line2} />}
              {company.city && <InfoRow label="City" value={company.city} />}
              {company.state && <InfoRow label="State" value={company.state} />}
              {company.zip && <InfoRow label="ZIP" value={company.zip} />}
            </>
          ) : (
            <p className="text-muted-foreground">No address provided</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Hash className="w-4 h-4" />
            Branding
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Primary Color</span>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded border" style={{ backgroundColor: company.primary_color }} />
              <span className="text-sm font-mono">{company.primary_color}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Logo</span>
            <span className="text-sm">{company.logo_url ? 'Uploaded' : 'None'}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
