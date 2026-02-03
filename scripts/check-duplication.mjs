#!/usr/bin/env node
/**
 * CI Duplication Gate
 * 
 * Fails if known anti-patterns are found in the codebase.
 * Run: node scripts/check-duplication.mjs
 * 
 * Add to CI: "check:duplication": "node scripts/check-duplication.mjs"
 */

import fs from 'fs';
import path from 'path';

const ANTI_PATTERNS = [
  {
    name: 'Local formatDate function',
    pattern: 'function formatDate',
    allowedFiles: ['src/lib/formatters.ts'],
    message: 'Use `import { formatDate } from "@/lib/formatters"` instead of defining locally',
  },
  {
    name: 'Local statusConfig object',
    pattern: 'const statusConfig\\s*=\\s*\\{',
    allowedFiles: ['src/lib/status-configs.ts', 'src/lib/status-styles.ts'],
    message: 'Use imports from "@/lib/status-configs" instead of defining locally',
  },
];

let hasErrors = false;

const SOURCE_DIR = path.join(process.cwd(), 'src');
const ALLOWED_EXTENSIONS = new Set(['.ts', '.tsx']);

function collectSourceFiles(rootDir) {
  const files = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const currentDir = stack.pop();
    if (!currentDir) continue;
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!ALLOWED_EXTENSIONS.has(path.extname(entry.name))) continue;
      files.push(fullPath);
    }
  }

  return files;
}

const sourceFiles = collectSourceFiles(SOURCE_DIR);

for (const rule of ANTI_PATTERNS) {
  const regex = new RegExp(rule.pattern);
  const violations = [];

  for (const filePath of sourceFiles) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    if (rule.allowedFiles.some((allowed) => normalizedPath.includes(allowed))) {
      continue;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    if (regex.test(content)) {
      violations.push(normalizedPath);
    }
  }

  if (violations.length > 0) {
    hasErrors = true;
    console.error(`\n❌ ${rule.name}`);
    console.error(`   ${rule.message}`);
    console.error(`   Found in:`);
    violations.forEach((file) => console.error(`     - ${file}`));
  }
}

if (hasErrors) {
  console.error('\n🚫 Duplication check failed. Fix the issues above before committing.\n');
  process.exit(1);
} else {
  console.log('✅ No duplication anti-patterns found.');
  process.exit(0);
}
