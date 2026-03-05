# Task: Fix Theme Color Bleeding

## Context

The app has a multi-layer theme system that causes colors from different themes to bleed into each other. Admin and driver users for "Coreys Test Company" see green-tinted cards and backgrounds mixed with gold/orange accents because multiple theme sources compete for the same CSS variables on `document.documentElement`.

### Root Cause

Three things combine to produce the bleeding:

1. **A stale `company_theme` database row** for "Coreys Test Company" contains a full set of Sage Forest (green) theme tokens. This row was written during development on Jan 18, 2026 and never cleaned up. There is no UI to manage company themes.

2. **`ThemeContext` merges platform + company themes** for non-super-admin users. Since the company_theme row has every field populated, it completely overwrites the platform theme with green tokens. These merged tokens become `serverTokens` and get cached to localStorage.

3. **The localStorage cache (`driverly-theme-cache`) is not preset-aware.** The `index.html` inline script applies cached tokens before React mounts. If the cache contains green tokens from the server merge, they flash on screen before the user's chosen preset takes over. The cache also only sets ~15 of the 40+ CSS variables, leaving the rest as stale defaults.

### Current Architecture (Broken)

```
Page Load:
  index.html script → reads "driverly-theme-cache" → applies ~15 CSS vars to :root
  React mounts → ThemeContext initializes with getCachedTheme()
  ThemeContext.loadTheme():
    1. Fetch platform_theme from DB (currently ACME gold)
    2. If user has company_id AND is not super_admin:
       Fetch company_theme from DB → mergeThemeTokens(platform, company)
    3. Set result as serverTokens, cache to localStorage
  Token resolution:
    - If user selected a preset → use preset tokens
    - Else if light mode → use hardcoded grey
    - Else → use serverTokens (the merged green mess)
```

### Target Architecture (Fixed)

```
Page Load:
  index.html script → reads preset-specific cache → applies full token set to :root
  React mounts → ThemeContext initializes
  ThemeContext.loadTheme():
    1. Fetch platform_theme from DB (kept for super admin use only)
    2. Set as serverTokens (no company merge)
  Token resolution:
    - Always resolve to a preset (user's choice or ACME Cursor Dark default)
    - serverTokens only used as fallback if preset lookup fails
```

## Database State

### `company_theme` table - HAS 1 STALE ROW TO DELETE

```
id:         997c3c25-610e-4e2e-a1c3-39329b04b8c3
company_id: 687805c7-57a7-41f7-85e3-c2eb4ff4e59d  (Coreys Test Company)
primary:    142 71% 45%    (green - Sage Forest)
accent:     84 81% 44%     (lime green)
background: 150 20% 5%     (dark green-tinted black)
card:       145 18% 9%     (dark green surface)
... all other fields populated with Sage Forest values
```

### `platform_theme` table - NO CHANGES NEEDED

Currently set to ACME Cursor Dark (gold/brown). This is correct and stays as-is.

### `companies` table - NO CHANGES NEEDED

`primary_color: #21c45d` for Coreys Test Company. This is used only for monogram badges (inline `style={{ backgroundColor }}`) in sidebars and settings pages. It is completely separate from the theme system.

## Implementation Steps

### Step 1: Delete the stale `company_theme` row

Run this against the production Supabase database. You can use the REST API with the service role key from `.env.local`:

```
DELETE from company_theme WHERE company_id = '687805c7-57a7-41f7-85e3-c2eb4ff4e59d';
```

Using the REST API (PowerShell):

```powershell
$headers = @{
  "apikey" = "<SUPABASE_SERVICE_ROLE_KEY from .env.local>"
  "Authorization" = "Bearer <SUPABASE_SERVICE_ROLE_KEY from .env.local>"
}
Invoke-RestMethod -Method DELETE -Uri "https://jgpdehfrqkigivtbuznn.supabase.co/rest/v1/company_theme?company_id=eq.687805c7-57a7-41f7-85e3-c2eb4ff4e59d" -Headers $headers
```

Verify it returns empty results after:

```powershell
Invoke-RestMethod -Uri "https://jgpdehfrqkigivtbuznn.supabase.co/rest/v1/company_theme?select=*" -Headers $headers
```

### Step 2: Update `DEFAULT_PRESET_ID` in `src/lib/theme-presets.ts`

Change line 288:

```typescript
// BEFORE
export const DEFAULT_PRESET_ID = 'midnight-blue';

// AFTER
export const DEFAULT_PRESET_ID = 'acme-cursor-dark';
```

This sets ACME Cursor Dark as the default theme for users who have never chosen a preset.

### Step 3: Simplify `src/contexts/ThemeContext.tsx`

This is the main file to change. The goals are:

1. Remove the company theme loading and merge logic
2. Make preset selection the single source of truth (always resolve to a preset)
3. Make the cache preset-aware
4. Clear the old stale cache key on first run

Here is what each section should look like after changes:

#### 3a. Update imports

```typescript
// BEFORE
import { DEFAULT_THEME_TOKENS } from '@/lib/theme-tokens';
import { applyThemeTokens, mergeThemeTokens, deriveTokensForMode } from '@/lib/theme-utils';
import { getCompanyTheme, getPlatformTheme } from '@/services/theme';
import { THEME_PRESETS, getPresetById } from '@/lib/theme-presets';

// AFTER
import { DEFAULT_THEME_TOKENS } from '@/lib/theme-tokens';
import { applyThemeTokens, deriveTokensForMode } from '@/lib/theme-utils';
import { getPlatformTheme } from '@/services/theme';
import { THEME_PRESETS, getPresetById, DEFAULT_PRESET_ID } from '@/lib/theme-presets';
```

Remove `mergeThemeTokens` and `getCompanyTheme` - they are no longer used here.

#### 3b. Update cache key constants and cache functions

```typescript
// BEFORE
const THEME_CACHE_KEY = 'driverly-theme-cache';

// AFTER
const THEME_CACHE_KEY_PREFIX = 'driverly-theme-cache-';
const LEGACY_CACHE_KEY = 'driverly-theme-cache';
```

Update `getCachedTheme` to read from a preset-specific cache key. It needs to know the current preset ID:

```typescript
function getCachedTheme(presetId: string | null): ThemeTokens {
  const effectiveId = presetId ?? DEFAULT_PRESET_ID;
  try {
    const cached = localStorage.getItem(THEME_CACHE_KEY_PREFIX + effectiveId);
    if (cached) {
      return JSON.parse(cached) as ThemeTokens;
    }
  } catch {
    // Ignore errors
  }
  return DEFAULT_THEME_TOKENS;
}
```

Update `cacheTheme` to write to a preset-specific key:

```typescript
function cacheTheme(tokens: ThemeTokens, presetId: string | null) {
  const effectiveId = presetId ?? DEFAULT_PRESET_ID;
  try {
    localStorage.setItem(THEME_CACHE_KEY_PREFIX + effectiveId, JSON.stringify(tokens));
  } catch {
    // Ignore errors
  }
}
```

Add a one-time cleanup function to remove the old cache key:

```typescript
function cleanupLegacyCache() {
  try {
    localStorage.removeItem(LEGACY_CACHE_KEY);
  } catch {
    // Ignore errors
  }
}
```

#### 3c. Update ThemeProvider state initialization

```typescript
// BEFORE
const [serverTokens, setServerTokens] = useState<ThemeTokens>(getCachedTheme);

// AFTER  
const storedPresetId = getStoredPresetId();
const [serverTokens, setServerTokens] = useState<ThemeTokens>(() => getCachedTheme(storedPresetId));
```

Note: `getStoredPresetId()` is already called for `selectedPresetId` init on the next line. You can extract it to avoid calling twice:

```typescript
export function ThemeProvider({ children }: ThemeProviderProps) {
  const { profile, isLoading } = useAuth();
  const [selectedPresetId, setSelectedPresetIdState] = useState<string | null>(getStoredPresetId);
  const [serverTokens, setServerTokens] = useState<ThemeTokens>(() => getCachedTheme(selectedPresetId));
  const [colorMode, setColorModeState] = useState<ColorMode>(getStoredColorMode);
  const [isThemeLoading, setIsThemeLoading] = useState(true);
```

Note: `useState` with a function initializer will call `getStoredPresetId` once. The `selectedPresetId` state value is available for the `getCachedTheme` call since they're initialized in order within the same render.

Actually, since `useState` initializers run during the first render and `selectedPresetId` is a state variable, it won't be available as a value to pass to another `useState` initializer directly. Instead, use the same approach:

```typescript
const initialPresetId = getStoredPresetId();
const [selectedPresetId, setSelectedPresetIdState] = useState<string | null>(initialPresetId);
const [serverTokens, setServerTokens] = useState<ThemeTokens>(() => getCachedTheme(initialPresetId));
```

But `getStoredPresetId` is cheap (one localStorage read), so calling it twice is also fine. Pick whichever is cleaner. The important thing is `getCachedTheme` receives the preset ID.

#### 3d. Update token resolution (THE KEY CHANGE)

Replace the current token computation (lines 108-116):

```typescript
// BEFORE
const selectedPreset = selectedPresetId ? getPresetById(selectedPresetId) : null;

const tokens = selectedPreset
  ? deriveTokensForMode(selectedPreset, colorMode)
  : colorMode === 'light'
    ? deriveTokensForMode({ colors: { primary: '#808080', accent: '#666666', background: '#f5f5f5', destructive: '#ef4444' } } as any, 'light')
    : serverTokens;

// AFTER
const effectivePresetId = selectedPresetId ?? DEFAULT_PRESET_ID;
const effectivePreset = getPresetById(effectivePresetId);

const tokens = effectivePreset
  ? deriveTokensForMode(effectivePreset, colorMode)
  : serverTokens;
```

This ensures:
- Users always resolve to a preset (their choice, or ACME Cursor Dark)
- The hardcoded grey light-mode fallback is removed (presets handle light mode via `deriveTokensForMode`)
- `serverTokens` is only a last-resort fallback if `getPresetById` returns undefined (shouldn't happen)

#### 3e. Remove company theme loading from `loadTheme`

Replace the entire `loadTheme` effect (lines 162-202):

```typescript
// BEFORE
useEffect(() => {
  let isActive = true;

  const loadTheme = async () => {
    if (isLoading) return;
    setIsThemeLoading(true);

    try {
      const platformTokens = await getPlatformTheme();

      if (profile?.company_id && profile.role !== 'super_admin') {
        const companyOverrides = await getCompanyTheme(profile.company_id);
        const merged = mergeThemeTokens(platformTokens, companyOverrides);
        if (isActive) {
          setServerTokens(merged);
          cacheTheme(merged);
        }
      } else if (isActive) {
        setServerTokens(platformTokens);
        cacheTheme(platformTokens);
      }
    } catch {
      if (isActive) {
        setServerTokens(DEFAULT_THEME_TOKENS);
        cacheTheme(DEFAULT_THEME_TOKENS);
      }
    } finally {
      if (isActive) {
        setIsThemeLoading(false);
        markThemeReady();
      }
    }
  };

  loadTheme();

  return () => {
    isActive = false;
  };
}, [isLoading, profile?.company_id, profile?.role]);

// AFTER
useEffect(() => {
  let isActive = true;

  const loadTheme = async () => {
    if (isLoading) return;
    setIsThemeLoading(true);

    try {
      const platformTokens = await getPlatformTheme();
      if (isActive) {
        setServerTokens(platformTokens);
        cacheTheme(platformTokens, null);
      }
    } catch {
      if (isActive) {
        setServerTokens(DEFAULT_THEME_TOKENS);
        cacheTheme(DEFAULT_THEME_TOKENS, null);
      }
    } finally {
      if (isActive) {
        setIsThemeLoading(false);
        markThemeReady();
      }
    }
  };

  cleanupLegacyCache();
  loadTheme();

  return () => {
    isActive = false;
  };
}, [isLoading]);
```

Changes:
- Removed the `profile?.company_id` / `profile.role` branching and `getCompanyTheme()` call
- Simplified to just fetch platform theme and set it (used as fallback only)
- Removed `profile?.company_id` and `profile?.role` from the dependency array
- Call `cleanupLegacyCache()` to remove the old `driverly-theme-cache` key
- Pass `null` for presetId in `cacheTheme` (this is the server/platform cache, not a preset cache)

#### 3f. Update `setSelectedPresetId` to also cache the preset's resolved tokens

When the user picks a new preset, cache its tokens so `index.html` can use them on next load:

```typescript
const setSelectedPresetId = useCallback((presetId: string | null) => {
  setSelectedPresetIdState(presetId);
  try {
    if (presetId) {
      localStorage.setItem(THEME_PRESET_KEY, presetId);
      const preset = getPresetById(presetId);
      if (preset) {
        cacheTheme(preset.tokens, presetId);
      }
    } else {
      localStorage.removeItem(THEME_PRESET_KEY);
    }
  } catch {
    // Ignore localStorage errors
  }
}, []);
```

#### 3g. Update the `serverTokens` comment

```typescript
// BEFORE
// Base tokens from server (platform + company overrides)
const [serverTokens, setServerTokens] = ...

// AFTER  
// Base tokens from server (platform theme, used as fallback only)
const [serverTokens, setServerTokens] = ...
```

#### 3h. Update the JSDoc comments on the interface

```typescript
// BEFORE
/** Currently selected preset ID (null = use server theme) */
selectedPresetId: string | null;
/** Select a preset by ID (null = reset to server theme) */
setSelectedPresetId: (presetId: string | null) => void;

// AFTER
/** Currently selected preset ID (null = use default preset) */
selectedPresetId: string | null;
/** Select a preset by ID (null = reset to default preset) */
setSelectedPresetId: (presetId: string | null) => void;
```

### Step 4: Update `index.html` inline script

Replace the current inline script with a preset-aware version:

```html
<script>
  (function() {
    try {
      var root = document.documentElement;
      
      var colorMode = localStorage.getItem('driverly-color-mode') || 'dark';
      root.dataset.colorMode = colorMode;
      
      var presetId = localStorage.getItem('driverly-theme-preset') || 'acme-cursor-dark';
      var cached = localStorage.getItem('driverly-theme-cache-' + presetId);
      if (cached) {
        var tokens = JSON.parse(cached);
        
        if (tokens.primary) root.style.setProperty('--primary', tokens.primary);
        if (tokens.primary_foreground) root.style.setProperty('--primary-foreground', tokens.primary_foreground);
        if (tokens.secondary) root.style.setProperty('--secondary', tokens.secondary);
        if (tokens.secondary_foreground) root.style.setProperty('--secondary-foreground', tokens.secondary_foreground);
        if (tokens.accent) root.style.setProperty('--accent', tokens.accent);
        if (tokens.accent_foreground) root.style.setProperty('--accent-foreground', tokens.accent_foreground);
        if (tokens.background) root.style.setProperty('--background', tokens.background);
        if (tokens.foreground) root.style.setProperty('--foreground', tokens.foreground);
        if (tokens.card) root.style.setProperty('--card', tokens.card);
        if (tokens.card_foreground) root.style.setProperty('--card-foreground', tokens.card_foreground);
        if (tokens.muted) root.style.setProperty('--muted', tokens.muted);
        if (tokens.muted_foreground) root.style.setProperty('--muted-foreground', tokens.muted_foreground);
        if (tokens.border) root.style.setProperty('--border', tokens.border);
        if (tokens.ring) root.style.setProperty('--ring', tokens.ring);
        if (tokens.destructive) root.style.setProperty('--destructive', tokens.destructive);
        if (tokens.destructive_foreground) root.style.setProperty('--destructive-foreground', tokens.destructive_foreground);
        
        if (tokens.primary) {
          root.style.setProperty('--shadow-glow-subtle', '0 0 6px hsl(' + tokens.primary + ' / 0.03)');
          root.style.setProperty('--shadow-glow', '0 0 10px hsl(' + tokens.primary + ' / 0.05)');
          root.style.setProperty('--shadow-glow-intense', '0 0 15px hsl(' + tokens.primary + ' / 0.08)');
        }
        if (tokens.primary && tokens.accent) {
          root.style.setProperty('--gradient-primary', 'linear-gradient(135deg, hsl(' + tokens.primary + '), hsl(' + tokens.accent + '))');
        }
      }
    } catch (e) {
      // Ignore errors - React will apply theme anyway
    }
  })();
</script>
```

The only changes from the original:
1. Read `driverly-theme-preset` to determine which cache key to use
2. Default to `'acme-cursor-dark'` if no preset is stored
3. Read from `'driverly-theme-cache-' + presetId` instead of `'driverly-theme-cache'`

### Step 5: Clean up `src/services/theme.ts`

Keep all functions (they'll be used for white-labeling later), but add a comment at the top of the company theme functions:

```typescript
// Reserved for future white-label feature. Not currently called from the app.
export async function getCompanyTheme(companyId: string): Promise<ThemeOverrides> {
```

```typescript
// Reserved for future white-label feature. Not currently called from the app.
export async function upsertCompanyTheme(
```

Also keep `mergeThemeTokens` in `src/lib/theme-utils.ts` since it's a utility that may be used elsewhere. Just remove its import from ThemeContext.

## Files to Change (Summary)

| File | Change |
|------|--------|
| `src/lib/theme-presets.ts` | Change `DEFAULT_PRESET_ID` from `'midnight-blue'` to `'acme-cursor-dark'` |
| `src/contexts/ThemeContext.tsx` | Remove company theme loading, make preset the default, preset-aware caching |
| `index.html` | Read preset-specific cache key instead of global cache key |
| `src/services/theme.ts` | Add "reserved for white-label" comments to company theme functions |

## Files NOT to Change

| File | Why |
|------|-----|
| `src/lib/theme-utils.ts` | `mergeThemeTokens` stays (general utility). `applyThemeTokens` unchanged. |
| `src/lib/theme-tokens.ts` | `DEFAULT_THEME_TOKENS` unchanged |
| `src/components/features/driver/ThemePresetSelector.tsx` | Works correctly, no changes needed |
| `src/pages/admin/Settings.tsx` | No changes needed |
| `src/pages/driver/AccountSettings.tsx` | No changes needed |
| `src/pages/super-admin/Settings.tsx` | No changes needed |
| `src/components/website/demo/DemoThemeWrapper.tsx` | Out of scope (marketing site only) |
| `src/components/layouts/AdminLayout.tsx` | `primary_color` usage is branding, not theming |
| `src/components/layouts/DriverLayout.tsx` | Same as above |

## Verification

After implementation, verify:

1. **Admin dashboard**: Log in as admin for Coreys Test Company. Should see ACME Cursor Dark (gold/brown) with no green tint anywhere.
2. **Theme picker**: Go to Admin Settings, pick Ember Glow. Entire UI should turn orange. No green remnants.
3. **Page reload**: After picking a theme, reload the page. Theme should persist with no flash of wrong colors.
4. **Light mode**: Toggle to light mode. Should derive correctly from the selected preset.
5. **Super admin**: Log in as super admin. Platform theme management should still work in Settings.
6. **Driver portal**: Log in as a driver. Should see ACME Cursor Dark by default, theme picker should work.
7. **LocalStorage**: Check that `driverly-theme-cache` (old key) is gone, and `driverly-theme-cache-<presetId>` exists.
