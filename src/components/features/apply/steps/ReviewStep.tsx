import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ApplicationFormData } from '@/types/application';

interface ReviewStepProps {
  data: ApplicationFormData;
  errors: Record<string, string>;
  onChange: (data: Partial<ApplicationFormData>) => void;
}

export function ReviewStep({ data, errors, onChange }: ReviewStepProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4">
        <h3 className="text-sm font-semibold mb-2">Review Summary</h3>
        <div className="text-sm text-muted-foreground space-y-1">
          <div>Name: {data.personalInfo?.fullName || '—'}</div>
          <div>Email: {data.account?.email || '—'}</div>
          <div>Employment: {data.employmentType?.toUpperCase() || '—'}</div>
          <div>License: {data.license?.number || '—'}</div>
          <div>Vehicle: {data.vehicle ? `${data.vehicle.year} ${data.vehicle.make}` : 'Skipped'}</div>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="experienceNotes">Experience Notes (optional)</Label>
        <Textarea
          id="experienceNotes"
          value={data.experienceNotes || ''}
          onChange={(e) => onChange({ experienceNotes: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="referralSource">Referral Source (optional)</Label>
        <Select
          value={data.referralSource || ''}
          onValueChange={(value) => onChange({ referralSource: value as any })}
        >
          <SelectTrigger id="referralSource">
            <SelectValue placeholder="Select source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="job_board">Job Board</SelectItem>
            <SelectItem value="friend">Friend</SelectItem>
            <SelectItem value="social_media">Social Media</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-start gap-2">
        <Checkbox
          id="eulaAccepted"
          checked={data.eulaAccepted === true}
          onCheckedChange={(checked) => onChange({ eulaAccepted: checked === true })}
        />
        <Label htmlFor="eulaAccepted" className="leading-5">
          I agree to the Driverly Terms of Service and Privacy Policy.
        </Label>
      </div>
      {errors['eulaAccepted'] && (
        <p className="text-sm text-destructive">{errors['eulaAccepted']}</p>
      )}
    </div>
  );
}
