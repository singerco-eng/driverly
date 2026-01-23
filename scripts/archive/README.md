# Archived Scripts

This folder contains debugging and one-time migration scripts that are no longer needed for day-to-day operations.

## Contents

| Script | Purpose | Why Archived |
|--------|---------|--------------|
| `debug-credentials.mjs` | Investigated credential visibility issues | Bug fixed |
| `debug-vehicle-creation.mjs` | Debugged vehicle creation failures | Bug fixed |
| `debug-vehicle-issues.mjs` | Investigated vehicle page issues | Bug fixed |
| `fix-vehicle-credential-types.mjs` | One-time data migration | Migration complete |
| `fix-credentials-rpc.sql` | SQL patch for credential RPCs | Applied to production |
| `fix-credentials-rpc-only.sql` | Alternate version of RPC patch | Applied to production |

## When to Reference

These scripts are kept for:
- Understanding how previous bugs were diagnosed
- Reference patterns for future debugging scripts
- Historical context on database fixes

## Note

Do **not** run these scripts without understanding their purpose. They may contain hardcoded UUIDs or make destructive changes that were appropriate only during development.
