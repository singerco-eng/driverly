import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users, Search } from 'lucide-react';
import { useDrivers } from '@/hooks/useDrivers';
import { useAssignDriverToBroker, useBrokerAssignments } from '@/hooks/useBrokers';
import { useToast } from '@/hooks/use-toast';
import type { Broker } from '@/types/broker';
import type { DriverWithUser } from '@/types/driver';

interface AssignDriversModalProps {
  broker: Broker;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AssignDriversModal({ broker, open, onOpenChange }: AssignDriversModalProps) {
  const { toast } = useToast();
  const assignDriver = useAssignDriverToBroker();
  const { data: drivers, isLoading: driversLoading } = useDrivers();
  const { data: assignments } = useBrokerAssignments(broker.id);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) {
      setSelectedIds([]);
      setSearch('');
    }
  }, [open]);

  const assignedIds = useMemo(() => {
    return new Set(
      (assignments || [])
        .filter((assignment) => assignment.status !== 'removed')
        .map((assignment) => assignment.driver_id),
    );
  }, [assignments]);

  const availableDrivers = useMemo(() => {
    return (drivers || []).filter((driver) => !assignedIds.has(driver.id));
  }, [drivers, assignedIds]);

  const filteredDrivers = useMemo(() => {
    if (!search.trim()) return availableDrivers;
    const term = search.toLowerCase();
    return availableDrivers.filter(
      (driver) =>
        driver.user.full_name.toLowerCase().includes(term) ||
        driver.user.email.toLowerCase().includes(term),
    );
  }, [availableDrivers, search]);

  const toggleSelection = (driverId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, driverId]);
    } else {
      setSelectedIds((prev) => prev.filter((id) => id !== driverId));
    }
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredDrivers.map((d) => d.id));
    } else {
      setSelectedIds([]);
    }
  };

  const isEligible = (driver: DriverWithUser) => {
    if (driver.status !== 'active') return false;
    if (broker.accepted_employment_types.length === 0) return true;
    return broker.accepted_employment_types.includes(driver.employment_type);
  };

  const handleAssign = async () => {
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(
        selectedIds.map((driverId) =>
          assignDriver.mutateAsync({ driverId, brokerId: broker.id }),
        ),
      );
      toast({
        title: 'Drivers assigned',
        description: `${selectedIds.length} driver${selectedIds.length === 1 ? '' : 's'} assigned.`,
      });
      onOpenChange(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to assign drivers';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const allSelected = filteredDrivers.length > 0 && selectedIds.length === filteredDrivers.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < filteredDrivers.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Assign Drivers</DialogTitle>
          <DialogDescription>
            Select drivers to assign to {broker.name}. Eligibility is based on status and employment
            type.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search drivers by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected}
                      ref={(el) => {
                        if (el) {
                          (el as unknown as HTMLInputElement).indeterminate = someSelected;
                        }
                      }}
                      onCheckedChange={(checked) => toggleSelectAll(checked === true)}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Employment Type</TableHead>
                  <TableHead>Eligibility</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {driversLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={4}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredDrivers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="w-8 h-8 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          {search
                            ? 'No matching drivers found'
                            : availableDrivers.length === 0
                              ? 'All drivers are already assigned'
                              : 'No available drivers'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDrivers.map((driver) => {
                    const eligible = isEligible(driver);
                    return (
                      <TableRow
                        key={driver.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleSelection(driver.id, !selectedIds.includes(driver.id))}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            id={`driver-${driver.id}`}
                            checked={selectedIds.includes(driver.id)}
                            onCheckedChange={(checked) => toggleSelection(driver.id, checked === true)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                              <span className="text-primary text-sm">
                                {driver.user.full_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium">{driver.user.full_name}</div>
                              <div className="text-sm text-muted-foreground">{driver.user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="uppercase">
                            {driver.employment_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={eligible ? 'default' : 'outline'}
                            className={
                              eligible
                                ? 'bg-green-500/20 text-green-600 border-green-500/30'
                                : 'text-muted-foreground'
                            }
                          >
                            {eligible ? 'Eligible' : 'Not Eligible'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Selection count */}
          {selectedIds.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {selectedIds.length} driver{selectedIds.length === 1 ? '' : 's'} selected
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleAssign}
            disabled={selectedIds.length === 0 || assignDriver.isPending}
          >
            {assignDriver.isPending ? 'Assigning...' : `Assign ${selectedIds.length > 0 ? selectedIds.length : ''} Driver${selectedIds.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
