import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useDriverByUserId } from '@/hooks/useDrivers';
import { useDriverPaymentInfo, useSaveDriverPaymentInfo } from '@/hooks/useOnboarding';
import { useToast } from '@/hooks/use-toast';
import type { PaymentInfoFormData } from '@/types/onboarding';
import { cardVariants } from '@/lib/design-system';
import { cn } from '@/lib/utils';
import { CreditCard, Building2, Mail, Check, Shield } from 'lucide-react';

const ACCOUNT_TYPES = ['checking', 'savings'] as const;

const PAYMENT_METHODS = [
  {
    value: 'direct_deposit',
    label: 'Direct Deposit',
    description: 'Fastest option - funds deposited to your bank',
    icon: Building2,
  },
  {
    value: 'check',
    label: 'Check',
    description: 'Mailed to your address',
    icon: Mail,
  },
  {
    value: 'paycard',
    label: 'Paycard',
    description: 'Prepaid card provided by company',
    icon: CreditCard,
  },
] as const;

export default function PaymentSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: driver } = useDriverByUserId(user?.id);
  const { data: paymentInfo } = useDriverPaymentInfo(driver?.id);
  const saveMutation = useSaveDriverPaymentInfo();
  const [formData, setFormData] = useState<PaymentInfoFormData>({
    payment_method: 'direct_deposit',
  });

  useEffect(() => {
    if (!paymentInfo) return;
    setFormData({
      payment_method: paymentInfo.payment_method,
      bank_name: paymentInfo.bank_name || '',
      account_type: paymentInfo.account_type || undefined,
      routing_number: '',
      account_number: '',
      check_address_line1: paymentInfo.check_address_line1 || '',
      check_address_line2: paymentInfo.check_address_line2 || '',
      check_city: paymentInfo.check_city || '',
      check_state: paymentInfo.check_state || '',
      check_zip: paymentInfo.check_zip || '',
    });
  }, [paymentInfo]);

  const isValid = useMemo(() => {
    if (formData.payment_method === 'direct_deposit') {
      return (
        !!formData.bank_name &&
        !!formData.account_type &&
        !!formData.routing_number &&
        !!formData.account_number
      );
    }
    if (formData.payment_method === 'check') {
      return (
        !!formData.check_address_line1 &&
        !!formData.check_city &&
        !!formData.check_state &&
        !!formData.check_zip
      );
    }
    return true;
  }, [formData]);

  const handleSave = () => {
    if (!driver) return;
    saveMutation.mutate(
      { driverId: driver.id, formData },
      {
        onSuccess: () => {
          toast({
            title: 'Payment info saved',
            description: 'Your payment preferences have been updated.',
          });
        },
        onError: (error) => {
          toast({
            title: 'Failed to save',
            description: error.message,
            variant: 'destructive',
          });
        },
      }
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Payment Settings</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Choose how you'd like to receive your payments.
        </p>
      </div>

      {/* Security Notice */}
      <Card className={cn(cardVariants({ variant: 'stats' }), 'p-4')}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Your information is secure</p>
            <p className="text-xs text-muted-foreground">
              Bank account numbers are encrypted. Only the last 4 digits are displayed after saving.
            </p>
          </div>
        </div>
      </Card>

      {/* Main Form Card */}
      <Card className={cn(cardVariants({ variant: 'default' }))}>
        <CardHeader>
          <CardTitle className="text-lg">Payment Method</CardTitle>
          <CardDescription>Select your preferred payment method below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Payment Method Selection */}
          <RadioGroup
            value={formData.payment_method}
            onValueChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                payment_method: value as PaymentInfoFormData['payment_method'],
              }))
            }
            className="grid gap-3 md:grid-cols-3"
          >
            {PAYMENT_METHODS.map((method) => {
              const Icon = method.icon;
              const isSelected = formData.payment_method === method.value;

              return (
                <label
                  key={method.value}
                  className={cn(
                    'flex flex-col gap-2 rounded-lg border p-4 cursor-pointer transition-all',
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border/60 hover:border-border'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value={method.value} className="sr-only" />
                    <Icon className={cn('w-5 h-5', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                    <span className={cn('text-sm font-medium', isSelected && 'text-primary')}>
                      {method.label}
                    </span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-primary ml-auto" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{method.description}</p>
                </label>
              );
            })}
          </RadioGroup>

          {/* Direct Deposit Fields */}
          {formData.payment_method === 'direct_deposit' && (
            <div className="space-y-4 pt-4 border-t border-border/40">
              <h3 className="text-sm font-medium text-muted-foreground">Bank Account Details</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bank_name">Bank name</Label>
                  <Input
                    id="bank_name"
                    placeholder="e.g. Chase, Bank of America"
                    value={formData.bank_name || ''}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, bank_name: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account type</Label>
                  <Select
                    value={formData.account_type || ''}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, account_type: value as 'checking' | 'savings' }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type === 'checking' ? 'Checking' : 'Savings'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="routing_number">Routing number</Label>
                  <Input
                    id="routing_number"
                    placeholder="9 digits"
                    value={formData.routing_number || ''}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, routing_number: event.target.value }))
                    }
                  />
                  {paymentInfo?.routing_number_last4 && (
                    <p className="text-xs text-muted-foreground">
                      On file: •••• {paymentInfo.routing_number_last4}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account_number">Account number</Label>
                  <Input
                    id="account_number"
                    placeholder="Your account number"
                    value={formData.account_number || ''}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, account_number: event.target.value }))
                    }
                  />
                  {paymentInfo?.account_number_last4 && (
                    <p className="text-xs text-muted-foreground">
                      On file: •••• {paymentInfo.account_number_last4}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Check Fields */}
          {formData.payment_method === 'check' && (
            <div className="space-y-4 pt-4 border-t border-border/40">
              <h3 className="text-sm font-medium text-muted-foreground">Mailing Address</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="check_address_line1">Street address</Label>
                  <Input
                    id="check_address_line1"
                    placeholder="123 Main St"
                    value={formData.check_address_line1 || ''}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, check_address_line1: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="check_address_line2">Apt, suite, etc. (optional)</Label>
                  <Input
                    id="check_address_line2"
                    placeholder="Apt 4B"
                    value={formData.check_address_line2 || ''}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, check_address_line2: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="check_city">City</Label>
                  <Input
                    id="check_city"
                    placeholder="City"
                    value={formData.check_city || ''}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, check_city: event.target.value }))
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="check_state">State</Label>
                    <Input
                      id="check_state"
                      placeholder="CA"
                      value={formData.check_state || ''}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, check_state: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="check_zip">ZIP code</Label>
                    <Input
                      id="check_zip"
                      placeholder="90210"
                      value={formData.check_zip || ''}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, check_zip: event.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Paycard Notice */}
          {formData.payment_method === 'paycard' && (
            <div className="pt-4 border-t border-border/40">
              <div className="rounded-lg bg-muted/30 border border-border/40 p-4">
                <div className="flex items-start gap-3">
                  <CreditCard className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Paycard Information</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your paycard details will be provided by the company after confirmation.
                      Contact your administrator for more information.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending || !driver || !isValid}
              className="gap-2"
            >
              {saveMutation.isPending ? (
                'Saving...'
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save Payment Info
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
