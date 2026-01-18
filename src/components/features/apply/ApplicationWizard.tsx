import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useApplicationDraft, useSubmitApplication } from '@/hooks/useApplications';
import { useDriverByUserId } from '@/hooks/useDrivers';
import { useAutoSave } from '@/hooks/useAutoSave';
import { ApplicationProgress, ApplicationStep } from '@/components/features/apply/ApplicationProgress';
import { ApplicationAutoSave } from '@/components/features/apply/ApplicationAutoSave';
import { AccountStep } from '@/components/features/apply/steps/AccountStep';
import { PersonalInfoStep } from '@/components/features/apply/steps/PersonalInfoStep';
import { EmploymentStep } from '@/components/features/apply/steps/EmploymentStep';
import { LicenseStep } from '@/components/features/apply/steps/LicenseStep';
import { VehicleStep } from '@/components/features/apply/steps/VehicleStep';
import { ReviewStep } from '@/components/features/apply/steps/ReviewStep';
import {
  accountStepSchema,
  employmentSchema,
  licenseSchema,
  personalInfoSchema,
  reviewSchema,
  vehicleSchema,
} from '@/lib/schemas/application';
import type { Company } from '@/types/company';
import type { ApplicationFormData } from '@/types/application';

interface ApplicationWizardProps {
  company: Company;
}

const STEPS_W2: ApplicationStep[] = [
  { id: 1, label: 'Account' },
  { id: 2, label: 'Personal' },
  { id: 3, label: 'Employment' },
  { id: 4, label: 'License' },
  { id: 5, label: 'Review' },
];

const STEPS_1099: ApplicationStep[] = [
  { id: 1, label: 'Account' },
  { id: 2, label: 'Personal' },
  { id: 3, label: 'Employment' },
  { id: 4, label: 'License' },
  { id: 5, label: 'Vehicle' },
  { id: 6, label: 'Review' },
];

function buildErrorMap(issues: { path: (string | number)[]; message: string }[], prefix = '') {
  const errors: Record<string, string> = {};
  issues.forEach((issue) => {
    const key = `${prefix}${issue.path.join('.')}`;
    errors[key] = issue.message;
  });
  return errors;
}

export function ApplicationWizard({ company }: ApplicationWizardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ApplicationFormData>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { data: draft } = useApplicationDraft(company.id);
  const { data: existingDriver } = useDriverByUserId(user?.id);
  const submitApplication = useSubmitApplication();

  // Redirect if user already has a valid application (not rejected with reapply allowed)
  useEffect(() => {
    if (!existingDriver) return;
    
    const status = existingDriver.application_status;
    // Allow reapplication only if rejected and can_reapply_at has passed
    const canReapply = 
      status === 'rejected' && 
      existingDriver.can_reapply_at && 
      new Date(existingDriver.can_reapply_at) <= new Date();
    
    // If they have any active application status (not withdrawn, not eligible to reapply), redirect
    if (status && status !== 'withdrawn' && !canReapply) {
      navigate('/driver/application-status', { replace: true });
    }
  }, [existingDriver, navigate]);

  const steps = useMemo(
    () => (formData.employmentType === '1099' ? STEPS_1099 : STEPS_W2),
    [formData.employmentType]
  );

  // Only load draft on initial mount to avoid overwriting local changes
  const [draftLoaded, setDraftLoaded] = useState(false);
  useEffect(() => {
    if (draft?.form_data && !draftLoaded) {
      setFormData(draft.form_data as ApplicationFormData);
      if (draft.current_step) {
        setCurrentStep(draft.current_step);
      }
      setDraftLoaded(true);
    }
  }, [draft, draftLoaded]);

  useEffect(() => {
    if (currentStep > steps.length) {
      setCurrentStep(steps.length);
    }
  }, [currentStep, steps.length]);

  useEffect(() => {
    if (user && currentStep === 1) {
      setCurrentStep(2);
    }
  }, [currentStep, user]);

  const { saveDraft, isSaving, lastSavedAt } = useAutoSave(
    formData,
    currentStep,
    company.id,
    user?.id
  );

  const updateFormData = (update: Partial<ApplicationFormData>) => {
    setFormData((prev) => ({ ...prev, ...update }));
  };

  const validateStep = (step: number) => {
    setErrors({});

    if (step === 1) {
      const account = formData.account || { email: '', password: '', confirmPassword: '' };
      const result = accountStepSchema.safeParse(account);
      if (!result.success) {
        setErrors(buildErrorMap(result.error.issues, 'account.'));
        return false;
      }
    }

    if (step === 2) {
      const result = personalInfoSchema.safeParse(formData.personalInfo);
      if (!result.success) {
        setErrors(buildErrorMap(result.error.issues, 'personalInfo.'));
        return false;
      }
    }

    if (step === 3) {
      const result = employmentSchema.safeParse({ employmentType: formData.employmentType });
      if (!result.success) {
        setErrors(buildErrorMap(result.error.issues));
        return false;
      }
    }

    if (step === 4) {
      const result = licenseSchema.safeParse(formData.license);
      if (!result.success) {
        setErrors(buildErrorMap(result.error.issues, 'license.'));
        return false;
      }
    }

    if (step === 5 && formData.employmentType === '1099') {
      const result = vehicleSchema.safeParse(formData.vehicle);
      if (!result.success) {
        setErrors(buildErrorMap(result.error.issues, 'vehicle.'));
        return false;
      }
    }

    const reviewStepNumber = formData.employmentType === '1099' ? 6 : 5;
    if (step === reviewStepNumber) {
      const result = reviewSchema.safeParse({
        experienceNotes: formData.experienceNotes,
        referralSource: formData.referralSource,
        eulaAccepted: formData.eulaAccepted,
      });
      if (!result.success) {
        setErrors(buildErrorMap(result.error.issues));
        return false;
      }
    }

    return true;
  };

  const handleAccountCreation = async () => {
    const account = formData.account;
    if (!account) return false;

    try {
      const { data, error } = await supabase.auth.signUp({
        email: account.email,
        password: account.password,
      });

      if (error) throw error;

      if (!data.session) {
        const signInResult = await supabase.auth.signInWithPassword({
          email: account.email,
          password: account.password,
        });
        if (signInResult.error) throw signInResult.error;
      }

      await saveDraft({
        formData,
        currentStep,
      });

      return true;
    } catch (error: any) {
      toast({
        title: 'Account creation failed',
        description: error.message || 'Unable to create account',
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleNext = async () => {
    if (!validateStep(currentStep)) return;

    if (currentStep === 1 && !user) {
      const ok = await handleAccountCreation();
      if (!ok) return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, steps.length));
  };

  const handleSubmit = async () => {
    const reviewStepNumber = formData.employmentType === '1099' ? 6 : 5;
    if (!validateStep(reviewStepNumber)) return;

    if (!user?.id) {
      toast({
        title: 'Please sign in',
        description: 'You must create an account before submitting.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.personalInfo || !formData.employmentType || !formData.license) {
      toast({
        title: 'Missing details',
        description: 'Please complete all required steps before submitting.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await submitApplication.mutateAsync({
        companyId: company.id,
        personalInfo: formData.personalInfo,
        employmentType: formData.employmentType,
        license: formData.license,
        vehicle: formData.vehicle,
        experienceNotes: formData.experienceNotes,
        referralSource: formData.referralSource,
        eulaVersion: formData.eulaVersion || 'v1',
      });

      // Redirect to application status page after successful submission
      navigate('/driver/application-status');
    } catch (error) {
      // If application already exists, redirect to status page
      if (error instanceof Error && error.message.includes('already exists')) {
        navigate('/driver/application-status', { replace: true });
      }
      // Other errors are handled by the mutation's onError callback
    }
  };

  const currentStepId = steps[currentStep - 1]?.id ?? 1;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle>Driver Application</CardTitle>
          <p className="text-sm text-muted-foreground">
            Apply to drive with {company.name}. Your progress is saved automatically.
          </p>
          <ApplicationProgress steps={steps} currentStep={currentStepId} />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <ApplicationAutoSave isSaving={isSaving} lastSavedAt={lastSavedAt} />
            <span className="text-xs text-muted-foreground">
              Step {currentStep} of {steps.length}
            </span>
          </div>

          {currentStep === 1 && (
            <div className="space-y-4">
              <AccountStep
                data={formData}
                errors={errors}
                onChange={updateFormData}
                onFieldBlur={() => void saveDraft()}
              />
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="text-primary underline">
                  Log in
                </Link>
              </p>
            </div>
          )}
          {currentStep === 2 && (
            <PersonalInfoStep
              data={formData}
              errors={errors}
              onChange={updateFormData}
              onFieldBlur={() => void saveDraft()}
            />
          )}
          {currentStep === 3 && (
            <EmploymentStep data={formData} errors={errors} onChange={updateFormData} />
          )}
          {currentStep === 4 &&
            (user?.id ? (
              <LicenseStep
                data={formData}
                errors={errors}
                userId={user.id}
                onChange={updateFormData}
                onFieldBlur={() => void saveDraft()}
                onPhotoSaved={(field, newPath) => {
                  // Build updated form data with the new photo path to avoid stale closure
                  const updatedLicense = {
                    ...(formData.license || {}),
                    [field]: newPath,
                  };
                  const updatedFormData = {
                    ...formData,
                    license: updatedLicense,
                  };
                  void saveDraft({ formData: updatedFormData });
                }}
              />
            ) : (
              <div className="text-sm text-muted-foreground">
                Signing you in to enable photo uploads...
              </div>
            ))}
          {currentStep === 5 && formData.employmentType === '1099' && (
            <VehicleStep
              data={formData}
              errors={errors}
              onChange={updateFormData}
              onFieldBlur={() => void saveDraft()}
            />
          )}
          {currentStep === (formData.employmentType === '1099' ? 6 : 5) && (
            <ReviewStep data={formData} errors={errors} onChange={updateFormData} />
          )}

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              disabled={currentStep === 1}
              onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 1))}
            >
              Back
            </Button>
            {currentStep < steps.length ? (
              <Button onClick={handleNext}>Continue</Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitApplication.isPending}>
                {submitApplication.isPending ? 'Submitting...' : 'Submit Application'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
