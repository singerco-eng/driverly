import type { ThemeName } from "@/lib/themes";

interface ThemeRoute {
  theme: ThemeName;
  match: (path: string) => boolean;
  priority?: number;
}

const normalizePath = (path: string) => path.replace(/\/+/g, "/").toLowerCase();

const createPathMatcher = (pattern: RegExp) => {
  return (path: string) => pattern.test(path);
};

export const themeRoutes: ThemeRoute[] = [
  {
    theme: "agentic-mapping",
    priority: 100,
    match: createPathMatcher(/agentic(-| )?mapping/),
  },
  {
    theme: "agentic-dispatch",
    priority: 90,
    match: createPathMatcher(/(agentic(-| )?dispatch|agentically-ai-dispatch)/),
  },
  {
    theme: "moodbloom",
    priority: 80,
    match: createPathMatcher(/moodbloom/),
  },
  {
    theme: "acculynx",
    priority: 70,
    match: createPathMatcher(/acculynx/),
  },
  {
    theme: "vasion",
    priority: 60,
    match: createPathMatcher(/vasion/),
  },
  {
    theme: "aryv",
    priority: 50,
    match: createPathMatcher(/aryv/),
  },
];

export const getThemeForPath = (rawPath: string): ThemeName => {
  const path = normalizePath(rawPath);
  const sorted = [...themeRoutes].sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
  );

  for (const route of sorted) {
    if (route.match(path)) {
      return route.theme;
    }
  }

  return "none";
};

export const pathHasAutoTheme = (rawPath: string) => getThemeForPath(rawPath) !== "none";
