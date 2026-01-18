
import * as React from "react"
import { Check, ChevronDown, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export interface MultiSelectOption {
  value: string
  label: string
  description?: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  value: string[]
  onValueChange: (value: string[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  maxItems?: number
  variant?: "default" | "secondary"
}

const MultiSelect = React.forwardRef<HTMLButtonElement, MultiSelectProps>(
  ({
    options,
    value = [],
    onValueChange,
    placeholder = "Select items...",
    className,
    disabled = false,
    maxItems,
    variant = "default",
    ...props
  }, ref) => {
    const [open, setOpen] = React.useState(false)

    const selectedOptions = options.filter(option => value.includes(option.value))
    const unselectedOptions = options.filter(option => !value.includes(option.value))

    const handleSelect = (optionValue: string) => {
      if (value.includes(optionValue)) {
        onValueChange(value.filter(v => v !== optionValue))
      } else {
        if (maxItems && value.length >= maxItems) {
          return
        }
        onValueChange([...value, optionValue])
      }
    }

    const handleRemove = (optionValue: string, event?: React.MouseEvent) => {
      event?.preventDefault()
      event?.stopPropagation()
      onValueChange(value.filter(v => v !== optionValue))
    }

    const handleClear = () => {
      onValueChange([])
    }

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-start min-h-10 h-auto px-3 py-2",
              variant === "secondary" && "bg-secondary/50",
              className
            )}
            disabled={disabled}
            {...props}
          >
            <div className="flex flex-wrap gap-1 flex-1">
              {selectedOptions.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                selectedOptions.map((option) => (
                  <Badge 
                    key={option.value} 
                    variant="secondary" 
                    className="text-xs gap-1 pr-1"
                  >
                    {option.label}
                    <button
                      type="button"
                      className="ml-1 hover:bg-destructive/20 rounded-sm p-0.5"
                      onClick={(e) => handleRemove(option.value, e)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
            <div className="flex items-center gap-2 ml-2">
              {selectedOptions.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  
                  className="h-4 w-4 p-0 hover:bg-destructive/20"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleClear()
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
              <ChevronDown className="h-4 w-4 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-glass-intense backdrop-blur-md shadow-glow border-border/50" align="start">
          <Command className="bg-transparent">
            <CommandInput placeholder="Search options..." className="h-9" />
            <CommandList>
              <CommandEmpty>No options found.</CommandEmpty>
              <CommandGroup className="max-h-64 overflow-auto">
                {unselectedOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => handleSelect(option.value)}
                    className="cursor-pointer text-white mb-1"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value.includes(option.value) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{option.label}</div>
                      {option.description && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {option.description}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                ))}
                {selectedOptions.length > 0 && (
                  <>
                    <div className="px-2 py-2 mt-2 text-xs font-medium text-muted-foreground border-t border-border/30">
                      Selected ({selectedOptions.length})
                    </div>
                    {selectedOptions.map((option) => (
                      <CommandItem
                        key={`selected-${option.value}`}
                        value={option.value}
                        onSelect={() => handleSelect(option.value)}
                        className="cursor-pointer text-white mb-1 bg-glass-subtle/30 border border-border/30 border-l-2 border-l-primary/50 backdrop-blur-sm"
                      >
                        <Check className="mr-2 h-4 w-4 opacity-100" />
                        <div className="flex-1">
                          <div className="font-medium">{option.label}</div>
                          {option.description && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {option.description}
                            </div>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    )
  }
)

MultiSelect.displayName = "MultiSelect"

export { MultiSelect }
