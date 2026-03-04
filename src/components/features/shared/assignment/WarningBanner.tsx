import { AlertTriangle } from 'lucide-react';
import type { WarningBannerProps } from './types';

export function WarningBanner({
  mode,
  context,
  selectedIds,
  selectedDriver,
}: WarningBannerProps) {
  const warnings: string[] = [];

  // Transfer/Unassign: Driver will have no vehicles
  if (
    (mode === 'transfer-vehicle' || mode === 'unassign-vehicle') &&
    context.type === 'assignment' &&
    context.isOnlyVehicle
  ) {
    warnings.push(
      `This is ${context.currentDriverName}'s only active vehicle. They will have no vehicle after this ${
        mode === 'transfer-vehicle' ? 'transfer' : 'unassignment'
      }.`
    );
  }

  // Unassign: Is primary vehicle
  if (
    mode === 'unassign-vehicle' &&
    context.type === 'assignment' &&
    context.isPrimary &&
    !context.isOnlyVehicle
  ) {
    warnings.push(
      'This is the primary vehicle. Another vehicle will be set as primary if available.'
    );
  }

  // 1099 driver selected for vehicle assignment
  if (
    mode === 'assign-driver-to-vehicle' &&
    selectedDriver?.employment_type === '1099'
  ) {
    warnings.push('1099 drivers can only have borrowed (temporary) assignments.');
  }

  if (warnings.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {warnings.map((warning, index) => (
        <div
          key={index}
          className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-200"
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{warning}</span>
        </div>
      ))}
    </div>
  );
}
