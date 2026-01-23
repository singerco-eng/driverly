# Archived Documentation

This folder contains documentation that has been archived after completion or deprecation.

## Structure

```
archive/
├── codex-tasks/      # Completed CODEX implementation tasks
└── README.md         # This file
```

## CODEX Tasks Archive

The `codex-tasks/` folder contains the original implementation specifications (CODEX tasks) that were used during the initial build phase. These documents served as AI agent task tickets.

**Why archived:**
- The codebase has evolved beyond these initial specifications
- They document *planning* but the code is the source of truth
- Keeping them in the main docs folder created noise

**When to reference:**
- If you need to understand the *original intent* behind a feature
- If investigating why something was built a certain way
- Historical context for design decisions

## Note

These documents are kept for historical reference only. For current system behavior, always refer to:
1. The actual source code
2. Active feature specs in `docs/features/`
3. Current CODEX tasks in the main `docs/` folder
