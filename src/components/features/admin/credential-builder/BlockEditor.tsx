import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  ContentBlock,
  HeadingBlockContent,
  ParagraphBlockContent,
  ImageBlockContent,
  VideoBlockContent,
  ExternalLinkBlockContent,
  AlertBlockContent,
  DividerBlockContent,
  FormFieldBlockContent,
  FileUploadBlockContent,
  SignaturePadBlockContent,
  ButtonBlockContent,
} from '@/types/instructionBuilder';

interface BlockEditorProps {
  block: ContentBlock;
  onChange: (block: ContentBlock) => void;
}

export function BlockEditor({ block, onChange }: BlockEditorProps) {
  function updateContent<T extends object>(updates: Partial<T>) {
    onChange({
      ...block,
      content: { ...block.content, ...updates } as typeof block.content,
    });
  }

  switch (block.type) {
    case 'heading': {
      const content = block.content as HeadingBlockContent;
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Text</Label>
            <Input
              value={content.text}
              onChange={(e) => updateContent<HeadingBlockContent>({ text: e.target.value })}
              placeholder="Heading text"
            />
          </div>
          <div className="space-y-2">
            <Label>Level</Label>
            <RadioGroup
              value={String(content.level)}
              onValueChange={(value) =>
                updateContent<HeadingBlockContent>({ level: Number(value) as 1 | 2 | 3 })
              }
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="1" id="h1" />
                <Label htmlFor="h1" className="text-lg font-bold">
                  H1
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="2" id="h2" />
                <Label htmlFor="h2" className="text-base font-bold">
                  H2
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="3" id="h3" />
                <Label htmlFor="h3" className="text-sm font-bold">
                  H3
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      );
    }

    case 'paragraph': {
      const content = block.content as ParagraphBlockContent;
      return (
        <div className="space-y-2">
          <Label>Text</Label>
          <Textarea
            value={content.text}
            onChange={(e) => updateContent<ParagraphBlockContent>({ text: e.target.value })}
            placeholder="Paragraph text..."
            rows={4}
          />
        </div>
      );
    }

    case 'image': {
      const content = block.content as ImageBlockContent;
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Image URL</Label>
            <Input
              value={content.url}
              onChange={(e) => updateContent<ImageBlockContent>({ url: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label>Alt Text</Label>
            <Input
              value={content.alt}
              onChange={(e) => updateContent<ImageBlockContent>({ alt: e.target.value })}
              placeholder="Image description"
            />
          </div>
          <div className="space-y-2">
            <Label>Caption (optional)</Label>
            <Input
              value={content.caption || ''}
              onChange={(e) => updateContent<ImageBlockContent>({ caption: e.target.value })}
              placeholder="Image caption"
            />
          </div>
        </div>
      );
    }

    case 'video': {
      const content = block.content as VideoBlockContent;
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Video Source</Label>
            <Select
              value={content.source}
              onValueChange={(value) =>
                updateContent<VideoBlockContent>({
                  source: value as 'youtube' | 'vimeo' | 'upload',
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="vimeo">Vimeo</SelectItem>
                <SelectItem value="upload">Uploaded</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Video URL</Label>
            <Input
              value={content.url}
              onChange={(e) => updateContent<VideoBlockContent>({ url: e.target.value })}
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>
          <div className="space-y-2">
            <Label>Title (optional)</Label>
            <Input
              value={content.title || ''}
              onChange={(e) => updateContent<VideoBlockContent>({ title: e.target.value })}
              placeholder="Video title"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="requireWatch"
              checked={content.requireWatch}
              onCheckedChange={(value) =>
                updateContent<VideoBlockContent>({ requireWatch: !!value })
              }
            />
            <Label htmlFor="requireWatch">Require watching to proceed</Label>
          </div>
        </div>
      );
    }

    case 'external_link': {
      const content = block.content as ExternalLinkBlockContent;
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>URL</Label>
            <Input
              value={content.url}
              onChange={(e) =>
                updateContent<ExternalLinkBlockContent>({ url: e.target.value })
              }
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={content.title}
              onChange={(e) =>
                updateContent<ExternalLinkBlockContent>({ title: e.target.value })
              }
              placeholder="Link title"
            />
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Input
              value={content.description || ''}
              onChange={(e) =>
                updateContent<ExternalLinkBlockContent>({
                  description: e.target.value,
                })
              }
              placeholder="Brief description"
            />
          </div>
          <div className="space-y-2">
            <Label>Button Text</Label>
            <Input
              value={content.buttonText}
              onChange={(e) =>
                updateContent<ExternalLinkBlockContent>({
                  buttonText: e.target.value,
                })
              }
              placeholder="Open Link"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="trackVisit"
                checked={content.trackVisit}
                onCheckedChange={(value) =>
                  updateContent<ExternalLinkBlockContent>({ trackVisit: !!value })
                }
              />
              <Label htmlFor="trackVisit">Track when user visits link</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="requireVisit"
                checked={content.requireVisit}
                onCheckedChange={(value) =>
                  updateContent<ExternalLinkBlockContent>({ requireVisit: !!value })
                }
              />
              <Label htmlFor="requireVisit">Require visit to proceed</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="opensInNewTab"
                checked={content.opensInNewTab}
                onCheckedChange={(value) =>
                  updateContent<ExternalLinkBlockContent>({ opensInNewTab: !!value })
                }
              />
              <Label htmlFor="opensInNewTab">Open in new tab</Label>
            </div>
          </div>
        </div>
      );
    }

    case 'alert': {
      const content = block.content as AlertBlockContent;
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Variant</Label>
            <Select
              value={content.variant}
              onValueChange={(value) =>
                updateContent<AlertBlockContent>({
                  variant: value as 'info' | 'warning' | 'success' | 'error',
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={content.title}
              onChange={(e) => updateContent<AlertBlockContent>({ title: e.target.value })}
              placeholder="Alert title"
            />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={content.message}
              onChange={(e) =>
                updateContent<AlertBlockContent>({ message: e.target.value })
              }
              placeholder="Alert message..."
              rows={3}
            />
          </div>
        </div>
      );
    }

    case 'divider': {
      const content = block.content as DividerBlockContent;
      return (
        <div className="space-y-2">
          <Label>Style</Label>
          <Select
            value={content.style}
            onValueChange={(value) =>
              updateContent<DividerBlockContent>({
                style: value as 'solid' | 'dashed' | 'dotted',
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="solid">Solid</SelectItem>
              <SelectItem value="dashed">Dashed</SelectItem>
              <SelectItem value="dotted">Dotted</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    case 'form_field': {
      const content = block.content as FormFieldBlockContent;
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Field Key</Label>
              <Input
                value={content.key}
                onChange={(e) =>
                  updateContent<FormFieldBlockContent>({ key: e.target.value })
                }
                placeholder="field_name"
              />
            </div>
            <div className="space-y-2">
              <Label>Field Type</Label>
              <Select
                value={content.type}
                onValueChange={(value) =>
                  updateContent<FormFieldBlockContent>({
                    type: value as FormFieldBlockContent['type'],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="textarea">Textarea</SelectItem>
                  <SelectItem value="select">Select</SelectItem>
                  <SelectItem value="checkbox">Checkbox</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Label</Label>
            <Input
              value={content.label}
              onChange={(e) =>
                updateContent<FormFieldBlockContent>({ label: e.target.value })
              }
              placeholder="Field label"
            />
          </div>
          <div className="space-y-2">
            <Label>Placeholder (optional)</Label>
            <Input
              value={content.placeholder || ''}
              onChange={(e) =>
                updateContent<FormFieldBlockContent>({
                  placeholder: e.target.value,
                })
              }
              placeholder="Placeholder text"
            />
          </div>
          <div className="space-y-2">
            <Label>Help Text (optional)</Label>
            <Input
              value={content.helpText || ''}
              onChange={(e) =>
                updateContent<FormFieldBlockContent>({ helpText: e.target.value })
              }
              placeholder="Additional guidance"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="fieldRequired"
              checked={content.required}
              onCheckedChange={(value) =>
                updateContent<FormFieldBlockContent>({ required: !!value })
              }
            />
            <Label htmlFor="fieldRequired">Required field</Label>
          </div>
        </div>
      );
    }

    case 'file_upload': {
      const content = block.content as FileUploadBlockContent;
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Label</Label>
            <Input
              value={content.label}
              onChange={(e) =>
                updateContent<FileUploadBlockContent>({ label: e.target.value })
              }
              placeholder="Upload label"
            />
          </div>
          <div className="space-y-2">
            <Label>Accepted File Types</Label>
            <Input
              value={content.accept}
              onChange={(e) =>
                updateContent<FileUploadBlockContent>({ accept: e.target.value })
              }
              placeholder=".pdf,.jpg,.png"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated extensions or MIME types
            </p>
          </div>
          <div className="space-y-2">
            <Label>Max File Size (MB)</Label>
            <Input
              type="number"
              value={content.maxSizeMB}
              onChange={(e) =>
                updateContent<FileUploadBlockContent>({
                  maxSizeMB: Number(e.target.value),
                })
              }
              min={1}
              max={100}
            />
          </div>
          <div className="space-y-2">
            <Label>Help Text (optional)</Label>
            <Input
              value={content.helpText || ''}
              onChange={(e) =>
                updateContent<FileUploadBlockContent>({ helpText: e.target.value })
              }
              placeholder="Additional guidance"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="uploadMultiple"
                checked={content.multiple}
                onCheckedChange={(value) =>
                  updateContent<FileUploadBlockContent>({ multiple: !!value })
                }
              />
              <Label htmlFor="uploadMultiple">Allow multiple files</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="uploadRequired"
                checked={content.required}
                onCheckedChange={(value) =>
                  updateContent<FileUploadBlockContent>({ required: !!value })
                }
              />
              <Label htmlFor="uploadRequired">Required</Label>
            </div>
          </div>
        </div>
      );
    }

    case 'signature_pad': {
      const content = block.content as SignaturePadBlockContent;
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Label</Label>
            <Input
              value={content.label}
              onChange={(e) =>
                updateContent<SignaturePadBlockContent>({ label: e.target.value })
              }
              placeholder="Your Signature"
            />
          </div>
          <div className="space-y-2">
            <Label>Agreement Text (optional)</Label>
            <Textarea
              value={content.agreementText || ''}
              onChange={(e) =>
                updateContent<SignaturePadBlockContent>({
                  agreementText: e.target.value,
                })
              }
              placeholder="By signing, I agree to..."
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="allowTyped"
                checked={content.allowTyped}
                onCheckedChange={(value) =>
                  updateContent<SignaturePadBlockContent>({
                    allowTyped: !!value,
                  })
                }
              />
              <Label htmlFor="allowTyped">Allow typed signature</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="allowDrawn"
                checked={content.allowDrawn}
                onCheckedChange={(value) =>
                  updateContent<SignaturePadBlockContent>({
                    allowDrawn: !!value,
                  })
                }
              />
              <Label htmlFor="allowDrawn">Allow drawn signature</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="sigRequired"
                checked={content.required}
                onCheckedChange={(value) =>
                  updateContent<SignaturePadBlockContent>({ required: !!value })
                }
              />
              <Label htmlFor="sigRequired">Required</Label>
            </div>
          </div>
        </div>
      );
    }

    case 'button': {
      const content = block.content as ButtonBlockContent;
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Button Text</Label>
            <Input
              value={content.text}
              onChange={(e) => updateContent<ButtonBlockContent>({ text: e.target.value })}
              placeholder="Continue"
            />
          </div>
          <div className="space-y-2">
            <Label>Variant</Label>
            <Select
              value={content.variant}
              onValueChange={(value) =>
                updateContent<ButtonBlockContent>({
                  variant: value as 'default' | 'outline' | 'ghost',
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default (Filled)</SelectItem>
                <SelectItem value="outline">Outline</SelectItem>
                <SelectItem value="ghost">Ghost</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Action</Label>
            <Select
              value={content.action}
              onValueChange={(value) =>
                updateContent<ButtonBlockContent>({
                  action: value as 'next_step' | 'external_url' | 'submit',
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="next_step">Go to Next Step</SelectItem>
                <SelectItem value="submit">Submit</SelectItem>
                <SelectItem value="external_url">Open URL</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {content.action === 'external_url' && (
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                value={content.url || ''}
                onChange={(e) =>
                  updateContent<ButtonBlockContent>({ url: e.target.value })
                }
                placeholder="https://..."
              />
            </div>
          )}
        </div>
      );
    }

    case 'rich_text':
      return (
        <div className="text-sm text-muted-foreground">
          Rich text editor coming in future phase.
        </div>
      );

    case 'checklist':
      return (
        <div className="text-sm text-muted-foreground">
          Checklist editor coming in future phase.
        </div>
      );

    case 'quiz_question':
      return (
        <div className="text-sm text-muted-foreground">
          Quiz question editor coming in future phase.
        </div>
      );

    default:
      return (
        <div className="text-sm text-muted-foreground">
          No editor available for this block type.
        </div>
      );
  }
}
