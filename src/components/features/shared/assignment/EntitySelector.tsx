import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { RadioGroup } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Users, Car, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAvailableDrivers, useAvailableVehicles } from '@/hooks/useVehicleAssignments';
import { useBrokers } from '@/hooks/useBrokers';
import { useDrivers } from '@/hooks/useDrivers';
import { DriverListItem } from './DriverListItem';
import { VehicleListItem } from './VehicleListItem';
import { BrokerListItem } from './BrokerListItem';
import type { EntitySelectorProps } from './types';

export function EntitySelector({
  mode,
  targetEntity,
  context,
  selectedIds,
  onSelectionChange,
  onDriverSelect,
}: EntitySelectorProps) {
  const { profile } = useAuth();
  const [search, setSearch] = useState('');

  const { data: availableDrivers, isLoading: driversLoading } = useAvailableDrivers(
    targetEntity === 'driver' ? profile?.company_id : undefined
  );
  const { data: allDrivers, isLoading: allDriversLoading } = useDrivers();
  const { data: availableVehicles, isLoading: vehiclesLoading } = useAvailableVehicles(
    targetEntity === 'vehicle' ? profile?.company_id : undefined
  );
  const { data: brokers, isLoading: brokersLoading } = useBrokers(
    targetEntity === 'broker' ? profile?.company_id : undefined
  );

  const drivers = context.type === 'broker' ? allDrivers : availableDrivers;
  const isLoading =
    (targetEntity === 'driver' && (context.type === 'broker' ? allDriversLoading : driversLoading)) ||
    (targetEntity === 'vehicle' && vehiclesLoading) ||
    (targetEntity === 'broker' && brokersLoading);

  const filteredEntities = useMemo(() => {
    let entities: any[] = [];

    if (targetEntity === 'driver') {
      entities = drivers || [];
      if (context.type === 'assignment') {
        entities = entities.filter((d: any) => d.id !== context.currentDriverId);
      }
      if (context.type === 'location') {
        entities = entities.filter((d: any) => d.location_id !== context.locationId);
      }
    } else if (targetEntity === 'vehicle') {
      entities = availableVehicles || [];
      if (context.type === 'location') {
        entities = entities.filter((v: any) => v.location_id !== context.locationId);
      }
    } else if (targetEntity === 'broker') {
      entities = brokers || [];
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      entities = entities.filter((entity: any) => {
        if (targetEntity === 'driver') {
          return `${entity.user?.full_name} ${entity.user?.email}`.toLowerCase().includes(term);
        }
        if (targetEntity === 'vehicle') {
          return `${entity.year} ${entity.make} ${entity.model} ${entity.license_plate}`
            .toLowerCase()
            .includes(term);
        }
        if (targetEntity === 'broker') {
          return entity.name.toLowerCase().includes(term);
        }
        return true;
      });
    }

    return entities;
  }, [drivers, availableVehicles, brokers, targetEntity, context, search]);

  const handleSingleSelect = (id: string) => {
    onSelectionChange([id]);
    if (targetEntity === 'driver' && onDriverSelect) {
      const driver = filteredEntities.find((d: any) => d.id === id);
      onDriverSelect(driver);
    }
  };

  const handleMultiSelect = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(filteredEntities.map((entity: any) => entity.id));
    } else {
      onSelectionChange([]);
    }
  };

  const getSearchPlaceholder = () => {
    switch (targetEntity) {
      case 'driver':
        return 'Search by name or email...';
      case 'vehicle':
        return 'Search by make, model, or plate...';
      case 'broker':
        return 'Search by name...';
      default:
        return 'Search...';
    }
  };

  const EmptyIcon = targetEntity === 'driver' ? Users : targetEntity === 'vehicle' ? Car : Building2;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={getSearchPlaceholder()}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border p-3 max-h-64 overflow-auto space-y-2">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))
        ) : filteredEntities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <EmptyIcon className="w-8 h-8 mb-2" />
            <p className="text-sm">{search ? 'No matches found' : `No ${targetEntity}s available`}</p>
          </div>
        ) : mode === 'single' ? (
          <RadioGroup value={selectedIds[0] || ''} onValueChange={handleSingleSelect}>
            {filteredEntities.map((entity: any) => (
              <div key={entity.id}>
                {targetEntity === 'driver' && (
                  <DriverListItem driver={entity} context={context} />
                )}
                {targetEntity === 'vehicle' && <VehicleListItem vehicle={entity} />}
                {targetEntity === 'broker' && <BrokerListItem broker={entity} />}
              </div>
            ))}
          </RadioGroup>
        ) : (
          <>
            <div className="flex items-center gap-2 pb-2 border-b mb-2">
              <Checkbox
                checked={selectedIds.length === filteredEntities.length && filteredEntities.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                Select all ({filteredEntities.length})
              </span>
            </div>
            {filteredEntities.map((entity: any) => (
              <div
                key={entity.id}
                className="flex items-start gap-3 rounded-md border p-3 hover:bg-muted/30 cursor-pointer"
                onClick={() => handleMultiSelect(entity.id, !selectedIds.includes(entity.id))}
              >
                <Checkbox
                  checked={selectedIds.includes(entity.id)}
                  onCheckedChange={(checked) => handleMultiSelect(entity.id, checked === true)}
                  onClick={(event) => event.stopPropagation()}
                />
                {targetEntity === 'driver' && (
                  <DriverListItem driver={entity} context={context} isMultiSelect />
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {mode === 'multi' && selectedIds.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {selectedIds.length} {targetEntity}
          {selectedIds.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
}
