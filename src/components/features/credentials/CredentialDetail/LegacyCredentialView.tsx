import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileUp, Send, Loader2 } from 'lucide-react';
import type { CredentialType, DriverCredential, VehicleCredential } from '@/types/credential';
import { useState } from 'react';

interface LegacyCredentialViewProps {
  credentialType: CredentialType;
  credential: DriverCredential | VehicleCredential;
  onSubmit: (data: {
    document_url?: string;
    form_data?: Record<string, unknown>;
    notes?: string;
  }) => void;
  disabled?: boolean;
  isSubmitting?: boolean;
  submitLabel?: string;
}

/**
 * Fallback view for credentials without instruction_config
 * Uses the legacy submission_type field
 */
export function LegacyCredentialView({
  credentialType,
  credential,
  onSubmit,
  disabled = false,
  isSubmitting = false,
  submitLabel = 'Submit for Review',
}: LegacyCredentialViewProps) {
  const [notes, setNotes] = useState(credential.notes || '');
  const [formData, setFormData] = useState<Record<string, string>>(
    (credential.form_data as Record<string, string>) || {}
  );

  const handleSubmit = () => {
    onSubmit({
      form_data: formData,
      notes: notes || undefined,
    });
  };

  const renderFormFields = () => {
    if (!credentialType.form_schema?.fields?.length) return null;

    return (
      <div className="space-y-4">
        {credentialType.form_schema.fields.map((field) => (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.validation?.required && (
                <span className="text-destructive ml-1">*</span>
              )}
            </Label>
            {field.type === 'textarea' ? (
              <Textarea
                id={field.name}
                value={formData[field.name] || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, [field.name]: e.target.value }))
                }
                placeholder={field.placeholder}
                disabled={disabled}
              />
            ) : (
              <Input
                id={field.name}
                type={field.type === 'date' ? 'date' : 'text'}
                value={formData[field.name] || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, [field.name]: e.target.value }))
                }
                placeholder={field.placeholder}
                disabled={disabled}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderBySubmissionType = () => {
    switch (credentialType.submission_type) {
      case 'document_upload':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upload Document</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <FileUp className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Drag and drop your document here, or click to browse
                </p>
                <Button variant="outline" disabled={disabled}>
                  Choose File
                </Button>
                {credential.document_url && (
                  <p className="mt-4 text-sm text-green-600 dark:text-green-400">
                    ✓ Document uploaded
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'form_input':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Complete Form</CardTitle>
            </CardHeader>
            <CardContent>
              {renderFormFields() || (
                <p className="text-muted-foreground">No form fields configured.</p>
              )}
            </CardContent>
          </Card>
        );

      case 'signature':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Signature Required</CardTitle>
            </CardHeader>
            <CardContent>
              {credentialType.signature_document_url ? (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Please review the document and provide your signature.
                  </p>
                  <Button variant="outline" disabled={disabled}>
                    View Document & Sign
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground">No signature document configured.</p>
              )}
            </CardContent>
          </Card>
        );

      case 'document_and_signature':
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upload Document</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <FileUp className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <Button variant="outline" size="sm" disabled={disabled}>
                    Choose File
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Signature</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" disabled={disabled}>
                  Sign Document
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      case 'acknowledgement':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Acknowledgement</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Please read and acknowledge the following.
              </p>
              <Button variant="outline" disabled={disabled}>
                I Acknowledge
              </Button>
            </CardContent>
          </Card>
        );

      case 'external_verification':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">External Verification</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                This credential requires external verification. An administrator will verify your credentials.
              </p>
            </CardContent>
          </Card>
        );

      default:
        return (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                Unknown submission type: {credentialType.submission_type}
              </p>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Description */}
      {credentialType.description && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">{credentialType.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Submission content */}
      {renderBySubmissionType()}

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notes (Optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional notes..."
            disabled={disabled}
          />
        </CardContent>
      </Card>

      {/* Submit button - always shown when not disabled (drivers can always submit new versions) */}
      {!disabled && (
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                {submitLabel}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
