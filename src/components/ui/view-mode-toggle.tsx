import React from 'react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { LayoutGrid, List } from 'lucide-react';

export type ViewMode = 'card' | 'table';

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  cardLabel?: string;
  tableLabel?: string;
  className?: string;
  showLabels?: boolean;
}

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  viewMode,
  onViewModeChange,
  cardLabel = 'Cards',
  tableLabel = 'Table',
  className = '',
  showLabels = true,
}) => {
  return (
    <Tabs value={viewMode} onValueChange={(v) => onViewModeChange(v as ViewMode)} className={className}>
      <TabsList>
        <TabsTrigger value="card" className="gap-1.5">
          <LayoutGrid className="w-4 h-4" />
          {showLabels && cardLabel}
        </TabsTrigger>
        <TabsTrigger value="table" className="gap-1.5">
          <List className="w-4 h-4" />
          {showLabels && tableLabel}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};
