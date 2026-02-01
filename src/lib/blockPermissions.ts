import type { BlockType } from '@/types/instructionBuilder';

export interface BlockPermissions {
  canDelete: boolean;
  canReorder: boolean;
  editableFields: string[];
  restrictedActions: {
    action: string;
    message: string;
    suggestion: string;
  }[];
}

export function getBlockPermissions(
  blockType: BlockType,
  mode: 'ai' | 'edit'
): BlockPermissions {
  if (mode === 'ai') {
    return {
      canDelete: true,
      canReorder: true,
      editableFields: ['*'],
      restrictedActions: [],
    };
  }

  if (blockType === 'document') {
    return {
      canDelete: true,
      canReorder: true,
      editableFields: [
        'content.uploadLabel',
        'content.uploadDescription',
        'content.required',
        'content.extractionFields.*.label',
        'content.extractionFields.*.required',
      ],
      restrictedActions: [
        {
          action: 'add_field',
          message: 'Use AI mode to add extraction fields.',
          suggestion: 'Switch to AI mode to add or remove fields.',
        },
        {
          action: 'edit_hints',
          message: 'Use AI mode to modify extraction configuration.',
          suggestion: 'Switch to AI mode to update extraction hints or context.',
        },
      ],
    };
  }

  return {
    canDelete: true,
    canReorder: true,
    editableFields: ['*'],
    restrictedActions: [],
  };
}
