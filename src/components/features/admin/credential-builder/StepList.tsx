import { useMemo, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Layers } from 'lucide-react';
import { SortableStepItem } from './SortableStepItem';
import { AddStepSheet } from './AddStepSheet';
import type { InstructionStep, StepType } from '@/types/instructionBuilder';
import { createStep } from '@/types/instructionBuilder';

interface StepListProps {
  steps: InstructionStep[];
  selectedStepId: string | null;
  onSelectStep: (stepId: string | null) => void;
  onStepsChange: (steps: InstructionStep[]) => void;
}

export function StepList({
  steps,
  selectedStepId,
  onSelectStep,
  onStepsChange,
}: StepListProps) {
  const [showAddSheet, setShowAddSheet] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const stepIds = useMemo(() => steps.map((s) => s.id), [steps]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = steps.findIndex((s) => s.id === active.id);
    const newIndex = steps.findIndex((s) => s.id === over.id);

    const reordered = arrayMove(steps, oldIndex, newIndex).map((step, idx) => ({
      ...step,
      order: idx + 1,
    }));

    onStepsChange(reordered);
  }

  function handleAddStep(type: StepType, title: string) {
    const newStep = createStep(title, type);
    newStep.order = steps.length + 1;
    onStepsChange([...steps, newStep]);
    onSelectStep(newStep.id);
    setShowAddSheet(false);
  }

  function handleDeleteStep(stepId: string) {
    const filtered = steps
      .filter((s) => s.id !== stepId)
      .map((step, idx) => ({ ...step, order: idx + 1 }));
    onStepsChange(filtered);
    if (selectedStepId === stepId) {
      onSelectStep(filtered[0]?.id ?? null);
    }
  }

  function handleDuplicateStep(stepId: string) {
    const stepToDupe = steps.find((s) => s.id === stepId);
    if (!stepToDupe) return;

    const duped: InstructionStep = {
      ...stepToDupe,
      id: crypto.randomUUID(),
      title: `${stepToDupe.title} (Copy)`,
      order: steps.length + 1,
      blocks: stepToDupe.blocks.map((b) => ({ ...b, id: crypto.randomUUID() })),
    };

    onStepsChange([...steps, duped]);
    onSelectStep(duped.id);
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Steps
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowAddSheet(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Step
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {steps.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed rounded-lg">
              <Layers className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-sm font-medium mb-1">No steps yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add steps to build your credential workflow.
              </p>
              <Button variant="outline" size="sm" onClick={() => setShowAddSheet(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Add First Step
              </Button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={stepIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {steps.map((step, index) => (
                    <SortableStepItem
                      key={step.id}
                      step={step}
                      index={index}
                      isSelected={selectedStepId === step.id}
                      onSelect={() => onSelectStep(step.id)}
                      onDelete={() => handleDeleteStep(step.id)}
                      onDuplicate={() => handleDuplicateStep(step.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      <AddStepSheet
        open={showAddSheet}
        onOpenChange={setShowAddSheet}
        onAdd={handleAddStep}
      />
    </>
  );
}
