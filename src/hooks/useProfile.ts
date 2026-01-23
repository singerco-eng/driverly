import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as profileService from '@/services/profile';
import { getDriverByUserId } from '@/services/drivers';
import type {
  PersonalInfoFormData,
  ContactInfoFormData,
  AddressFormData,
  LicenseFormData,
  EmergencyContactFormData,
  NotificationPreferences,
} from '@/types/profile';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function useProfileCompletion(driver: any) {
  return profileService.calculateProfileCompletion(driver);
}

export function useDriverProfile(userId?: string) {
  const { user } = useAuth();
  const resolvedUserId = userId || user?.id;

  return useQuery({
    queryKey: ['driver-profile', resolvedUserId],
    queryFn: () => getDriverByUserId(resolvedUserId!),
    enabled: !!resolvedUserId,
  });
}

export function useUpdatePersonalInfo() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: {
      userId: string;
      driverId: string;
      companyId: string;
      data: PersonalInfoFormData;
      oldData: PersonalInfoFormData;
    }) =>
      profileService.updatePersonalInfo(
        params.userId,
        params.driverId,
        params.companyId,
        params.data,
        params.oldData
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
      toast({ title: 'Personal info updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateContactInfo() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: {
      userId: string;
      driverId: string;
      companyId: string;
      data: ContactInfoFormData;
      oldData: ContactInfoFormData;
    }) =>
      profileService.updateContactInfo(
        params.userId,
        params.driverId,
        params.companyId,
        params.data,
        params.oldData
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
      toast({ title: 'Contact info updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useInitiateEmailChange() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (newEmail: string) => profileService.initiateEmailChange(newEmail),
    onSuccess: () => {
      toast({
        title: 'Verification email sent',
        description: 'Check your new email to confirm the change.',
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Email change failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: {
      userId: string;
      driverId: string;
      companyId: string;
      data: AddressFormData;
      oldData: AddressFormData;
    }) =>
      profileService.updateAddress(
        params.userId,
        params.driverId,
        params.companyId,
        params.data,
        params.oldData
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
      toast({ title: 'Address updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateLicense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: {
      userId: string;
      driverId: string;
      companyId: string;
      data: LicenseFormData;
      oldData: LicenseFormData;
    }) =>
      profileService.updateLicense(
        params.userId,
        params.driverId,
        params.companyId,
        params.data,
        params.oldData
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
      toast({ title: 'License info updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateEmergencyContact() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: {
      userId: string;
      driverId: string;
      companyId: string;
      data: EmergencyContactFormData;
      oldData: EmergencyContactFormData;
    }) =>
      profileService.updateEmergencyContact(
        params.userId,
        params.driverId,
        params.companyId,
        params.data,
        params.oldData
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
      toast({ title: 'Emergency contact updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRemoveEmergencyContact() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: { userId: string; driverId: string; companyId: string }) =>
      profileService.removeEmergencyContact(params.userId, params.driverId, params.companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
      toast({ title: 'Emergency contact removed' });
    },
  });
}

export function useChangePassword() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: { currentPassword: string; newPassword: string }) =>
      profileService.changePassword(params.currentPassword, params.newPassword),
    onSuccess: () => {
      toast({ title: 'Password changed successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Password change failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useNotificationPreferences(userId: string | undefined) {
  return useQuery({
    queryKey: ['notification-preferences', userId],
    queryFn: () => profileService.getNotificationPreferences(userId!),
    enabled: !!userId,
  });
}

export function useSaveNotificationPreferences() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: { userId: string; prefs: Partial<NotificationPreferences> }) =>
      profileService.saveNotificationPreferences(params.userId, params.prefs),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences', userId] });
      toast({ title: 'Preferences saved' });
    },
  });
}

export function useUploadProfilePhoto() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: { userId: string; file: File }) =>
      profileService.uploadProfilePhoto(params.userId, params.file),
    onSuccess: () => {
      // Invalidate all queries that might show the user's avatar
      queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['driver'] });
      toast({ title: 'Profile photo updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRemoveProfilePhoto() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (userId: string) => profileService.removeProfilePhoto(userId),
    onSuccess: () => {
      // Invalidate all queries that might show the user's avatar
      queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['driver'] });
      toast({ title: 'Profile photo removed' });
    },
  });
}

export function useProfileChangeHistory(driverId: string | undefined) {
  return useQuery({
    queryKey: ['profile-change-history', driverId],
    queryFn: () => profileService.getProfileChangeHistory(driverId!),
    enabled: !!driverId,
  });
}
