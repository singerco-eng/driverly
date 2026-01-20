import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateCredentialTypeSimple, useBrokers } from '@/hooks/useCredentialTypes';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  category: z.enum(['driver', 'vehicle']),
  scope: z.enum(['global', 'broker']),
  broker_id: z.string().nullable(),
  template_id: z.string().nullable(),
});

type FormData = z.infer<typeof schema>;

interface CreateCredentialTypeSimpleModalProps {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateCredentialTypeSimpleModal({
  companyId,
  open,
  onOpenChange,
}: CreateCredentialTypeSimpleModalProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createMutation = useCreateCredentialTypeSimple();
  const { data: brokers } = useBrokers(companyId);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      category: 'driver',
      scope: 'global',
      broker_id: null,
      template_id: 'document_upload',
    },
  });

  const watchScope = watch('scope');

  async function onSubmit(data: FormData) {
    if (!user?.id) return;

    try {
      const id = await createMutation.mutateAsync({
        companyId,
        data: {
          ...data,
          template_id: 'document_upload',
        },
        createdBy: user.id,
      });

      reset();
      onOpenChange(false);
      navigate(`/admin/settings/credentials/${id}`);
    } catch {
      // Error handled by mutation
    }
  }

  function handleClose() {
    reset();
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      handleClose();
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Credential Type</DialogTitle>
          <DialogDescription>
            Set up the basics, then configure detailed instructions on the next screen.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="e.g., Drug Screening, Background Check"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category *</Label>
            <RadioGroup
              value={watch('category')}
              onValueChange={(value) => setValue('category', value as 'driver' | 'vehicle')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="driver" id="cat-driver" />
                <Label htmlFor="cat-driver">Driver Credential</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="vehicle" id="cat-vehicle" />
                <Label htmlFor="cat-vehicle">Vehicle Credential</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Scope */}
          <div className="space-y-2">
            <Label>Scope *</Label>
            <RadioGroup
              value={watch('scope')}
              onValueChange={(value) => setValue('scope', value as 'global' | 'broker')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="global" id="scope-global" />
                <Label htmlFor="scope-global">Global (All drivers)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="broker" id="scope-broker" />
                <Label htmlFor="scope-broker">Broker-Specific</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Broker Select (conditional) */}
          {watchScope === 'broker' && (
            <div className="space-y-2">
              <Label>Broker *</Label>
              <Select
                value={watch('broker_id') || ''}
                onValueChange={(value) => setValue('broker_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select broker" />
                </SelectTrigger>
                <SelectContent>
                  {brokers?.map((broker) => (
                    <SelectItem key={broker.id} value={broker.id}>
                      {broker.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create & Configure'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
