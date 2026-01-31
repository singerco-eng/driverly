import { Moon, Sun } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/contexts/ThemeContext";

export function ColorModeToggle() {
  const { colorMode, toggleColorMode } = useTheme();
  const isDark = colorMode === 'dark';
  
  return (
    <div className="flex items-center justify-between px-2 py-1.5 w-full">
      <div className="flex items-center gap-2">
        {isDark ? (
          <Moon className="w-4 h-4 text-muted-foreground" />
        ) : (
          <Sun className="w-4 h-4 text-muted-foreground" />
        )}
        <span className="text-sm">Dark Mode</span>
      </div>
      <Switch 
        checked={isDark} 
        onCheckedChange={toggleColorMode}
        aria-label="Toggle dark mode"
      />
    </div>
  );
}
