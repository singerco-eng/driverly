import { useParams } from 'react-router-dom';
import { ApplicationWizard } from '@/components/features/apply/ApplicationWizard';
import { Card } from '@/components/ui/card';
import { useCompanyBySlug } from '@/hooks/useCompanies';

export default function ApplicationPage() {
  const { companySlug = '' } = useParams();
  const { data: company, isLoading, error } = useCompanyBySlug(companySlug);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Card className="p-8 text-center text-muted-foreground">Loading application...</Card>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Card className="p-8 text-center text-muted-foreground">
          We could not find that company application link.
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <ApplicationWizard company={company} />
    </div>
  );
}
