export const isMoodbloomDebug =
  typeof import.meta !== "undefined"
    ? import.meta.env.VITE_MOODBLOOM_DEBUG === "true" || import.meta.env.DEV
    : false;
