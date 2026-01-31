# Extract Tailwind CSS Sorter to NPM Package Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract the Tailwind CSS class sorting logic from the Headwind VS Code extension into a standalone, reusable npm package that can be published and imported by the extension.

**Architecture:** Create a new npm package (`tailwind-class-sorter`) in `/mnt/data/code/aio/tailwind-class-sorter` containing the core sorting utilities. The package will export the sorting functions and types, while the VS Code extension will import and use them.

**Tech Stack:** TypeScript, Jest (for testing), npm (for publishing)

---

## Task 1: Initialize the NPM Package Structure

**Files:**
- Create: `/mnt/data/code/aio/tailwind-class-sorter/package.json`
- Create: `/mnt/data/code/aio/tailwind-class-sorter/tsconfig.json`
- Create: `/mnt/data/code/aio/tailwind-class-sorter/.gitignore`
- Create: `/mnt/data/code/aio/tailwind-class-sorter/README.md`
- Create: `/mnt/data/code/aio/tailwind-class-sorter/.npmignore`

**Step 1: Create the package directory**

Run: `mkdir -p /mnt/data/code/aio/tailwind-class-sorter`

**Step 2: Initialize package.json**

Create `/mnt/data/code/aio/tailwind-class-sorter/package.json`:

```json
{
  "name": "tailwind-class-sorter",
  "version": "1.0.0",
  "description": "A standalone Tailwind CSS class sorter utility for sorting, deduplicating, and organizing Tailwind classes",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "prepublishOnly": "npm run build && npm test"
  },
  "keywords": [
    "tailwind",
    "tailwindcss",
    "css",
    "sort",
    "sorter",
    "class-sorter"
  ],
  "author": "Murilo <muriloime@gmail.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/muriloime/tailwind-class-sorter"
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/node": "^20.0.0",
    "jest": "^29.5.0",
    "ts-jest": "^29.1.0",
    "typescript": "^5.0.0"
  }
}
```

**Step 3: Create TypeScript configuration**

Create `/mnt/data/code/aio/tailwind-class-sorter/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.spec.ts"]
}
```

**Step 4: Create .gitignore**

Create `/mnt/data/code/aio/tailwind-class-sorter/.gitignore`:

```
node_modules/
dist/
*.log
.DS_Store
coverage/
```

**Step 5: Create .npmignore**

Create `/mnt/data/code/aio/tailwind-class-sorter/.npmignore`:

```
src/
tsconfig.json
jest.config.js
*.spec.ts
.git/
node_modules/
coverage/
```

**Step 6: Create README.md**

Create `/mnt/data/code/aio/tailwind-class-sorter/README.md`:

```markdown
# Tailwind Class Sorter

A standalone utility for sorting, deduplicating, and organizing Tailwind CSS classes according to a configurable order.

## Installation

\`\`\`bash
npm install tailwind-class-sorter
\`\`\`

## Usage

\`\`\`typescript
import { sortClassString, buildMatchers, getTextMatch } from 'tailwind-class-sorter';

const sortOrder = ['container', 'flex', 'p-4', 'm-2'];
const options = {
  shouldRemoveDuplicates: true,
  shouldPrependCustomClasses: false,
  customTailwindPrefix: ''
};

const sorted = sortClassString('m-2 flex p-4', sortOrder, options);
console.log(sorted); // 'flex p-4 m-2'
\`\`\`

## API

### sortClassString(classString, sortOrder, options)

Sorts a string of CSS classes according to a predefined order.

### buildMatchers(langConfig)

Builds regex matchers from language configuration.

### getTextMatch(regexes, text, callback, startPosition)

Extracts class strings from text using regex patterns.

## License

MIT
```

**Step 7: Commit initial structure**

Run: `cd /mnt/data/code/aio/tailwind-class-sorter && git init && git add . && git commit -m "feat: initialize tailwind-class-sorter package structure"`

---

## Task 2: Extract Core Sorting Logic

**Files:**
- Create: `/mnt/data/code/aio/tailwind-class-sorter/src/index.ts`
- Create: `/mnt/data/code/aio/tailwind-class-sorter/src/types.ts`
- Copy from: `/mnt/data/code/aio/headwind/src/utils.ts`

**Step 1: Create types file**

Create `/mnt/data/code/aio/tailwind-class-sorter/src/types.ts`:

```typescript
export interface Options {
  shouldRemoveDuplicates: boolean;
  shouldPrependCustomClasses: boolean;
  customTailwindPrefix: string;
  separator?: RegExp;
  replacement?: string;
}

export type LangConfig =
  | string
  | string[]
  | { regex?: string | string[]; separator?: string; replacement?: string }
  | undefined;

export type Matcher = {
  regex: RegExp[];
  separator?: RegExp;
  replacement?: string;
};
```

**Step 2: Extract sorting utilities**

Create `/mnt/data/code/aio/tailwind-class-sorter/src/index.ts`:

```typescript
import { Options, LangConfig, Matcher } from './types';

/**
 * Sorts a string of CSS classes according to a predefined order.
 * @param classString The string to sort
 * @param sortOrder The default order to sort the array at
 * @param options Sorting options
 * @returns The sorted string
 */
export function sortClassString(
  classString: string,
  sortOrder: string[],
  options: Options
): string {
  const default_separator = classString.includes(' ') ? /\s+/g : '.';
  const default_replacement = classString.includes(' ') ? ' ' : '.';

  let classArray = classString.split(options.separator || default_separator);

  classArray = classArray.filter((el) => el !== '');

  if (options.shouldRemoveDuplicates) {
    classArray = removeDuplicates(classArray);
  }

  // prepend custom tailwind prefix to all tailwind sortOrder-classes
  const sortOrderClone = [...sortOrder];

  if (options.customTailwindPrefix.length > 0) {
    for (let i = 0; i < sortOrderClone.length; i++) {
      sortOrderClone[i] = options.customTailwindPrefix + sortOrderClone[i];
    }
  }

  classArray = sortClassArray(
    classArray,
    sortOrderClone,
    options.shouldPrependCustomClasses
  );

  const result = classArray.join(options.replacement || default_replacement).trim();

  if (default_separator === '.' && classString.startsWith('.')) {
    return '.' + result;
  } else {
    return result;
  }
}

function sortClassArray(
  classArray: string[],
  sortOrder: string[],
  shouldPrependCustomClasses: boolean
): string[] {
  return [
    ...classArray.filter(
      (el) => shouldPrependCustomClasses && sortOrder.indexOf(el) === -1
    ),
    ...classArray
      .filter((el) => sortOrder.indexOf(el) !== -1)
      .sort((a, b) => sortOrder.indexOf(a) - sortOrder.indexOf(b)),
    ...classArray.filter(
      (el) => !shouldPrependCustomClasses && sortOrder.indexOf(el) === -1
    ),
  ];
}

function removeDuplicates(classArray: string[]): string[] {
  return [...new Set(classArray)];
}

function isArrayOfStrings(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

function buildMatcher(value: LangConfig): Matcher {
  if (typeof value === 'string') {
    return {
      regex: [new RegExp(value, 'gi')],
    };
  } else if (isArrayOfStrings(value)) {
    return {
      regex: value.map((v) => new RegExp(v, 'gi')),
    };
  } else if (value == undefined) {
    return {
      regex: [],
    };
  } else {
    return {
      regex:
        typeof value.regex === 'string'
          ? [new RegExp(value.regex, 'gi')]
          : isArrayOfStrings(value.regex)
          ? value.regex.map((v) => new RegExp(v, 'gi'))
          : [],
      separator:
        typeof value.separator === 'string'
          ? new RegExp(value.separator, 'g')
          : undefined,
      replacement: value.replacement || value.separator,
    };
  }
}

export function buildMatchers(value: LangConfig | LangConfig[]): Matcher[] {
  if (value == undefined) {
    return [];
  } else if (Array.isArray(value)) {
    if (!value.length) {
      return [];
    } else if (!isArrayOfStrings(value)) {
      return value.map((v) => buildMatcher(v));
    }
  }
  return [buildMatcher(value)];
}

export function getTextMatch(
  regexes: RegExp[],
  text: string,
  callback: (text: string, startPosition: number) => void,
  startPosition: number = 0
): void {
  if (regexes.length >= 1) {
    let wrapper: RegExpExecArray | null;
    while ((wrapper = regexes[0].exec(text)) !== null) {
      const wrapperMatch = wrapper[0];
      const valueMatchIndex = wrapper.findIndex(
        (match, idx) => idx !== 0 && match
      );
      const valueMatch = wrapper[valueMatchIndex];

      const newStartPosition =
        startPosition + wrapper.index + wrapperMatch.lastIndexOf(valueMatch);

      if (regexes.length === 1) {
        callback(valueMatch, newStartPosition);
      } else {
        getTextMatch(regexes.slice(1), valueMatch, callback, newStartPosition);
      }
    }
  }
}

// Export types
export type { Options, LangConfig, Matcher } from './types';
```

**Step 3: Verify files are created**

Run: `ls -la /mnt/data/code/aio/tailwind-class-sorter/src/`

Expected: See `index.ts` and `types.ts`

**Step 4: Commit extracted logic**

Run: `cd /mnt/data/code/aio/tailwind-class-sorter && git add . && git commit -m "feat: extract core sorting logic from headwind"`

---

## Task 3: Set Up Jest Testing

**Files:**
- Create: `/mnt/data/code/aio/tailwind-class-sorter/jest.config.js`
- Create: `/mnt/data/code/aio/tailwind-class-sorter/src/index.spec.ts`

**Step 1: Create Jest configuration**

Create `/mnt/data/code/aio/tailwind-class-sorter/jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.d.ts'
  ]
};
```

**Step 2: Create basic test file**

Create `/mnt/data/code/aio/tailwind-class-sorter/src/index.spec.ts`:

```typescript
import { sortClassString, buildMatchers, getTextMatch } from './index';
import { Options, LangConfig } from './types';

describe('sortClassString', () => {
  const sortOrder = ['flex', 'p-4', 'm-2', 'bg-blue-500'];

  it('should sort classes according to sort order', () => {
    const options: Options = {
      shouldRemoveDuplicates: true,
      shouldPrependCustomClasses: false,
      customTailwindPrefix: '',
    };

    const result = sortClassString('m-2 flex p-4', sortOrder, options);
    expect(result).toBe('flex p-4 m-2');
  });

  it('should remove duplicate classes', () => {
    const options: Options = {
      shouldRemoveDuplicates: true,
      shouldPrependCustomClasses: false,
      customTailwindPrefix: '',
    };

    const result = sortClassString('flex m-2 flex p-4', sortOrder, options);
    expect(result).toBe('flex p-4 m-2');
  });

  it('should keep duplicate classes when configured', () => {
    const options: Options = {
      shouldRemoveDuplicates: false,
      shouldPrependCustomClasses: false,
      customTailwindPrefix: '',
    };

    const result = sortClassString('flex m-2 flex p-4', sortOrder, options);
    expect(result).toBe('flex flex p-4 m-2');
  });

  it('should prepend custom classes when configured', () => {
    const options: Options = {
      shouldRemoveDuplicates: true,
      shouldPrependCustomClasses: true,
      customTailwindPrefix: '',
    };

    const result = sortClassString('custom-class flex m-2', sortOrder, options);
    expect(result).toBe('custom-class flex m-2');
  });

  it('should append custom classes by default', () => {
    const options: Options = {
      shouldRemoveDuplicates: true,
      shouldPrependCustomClasses: false,
      customTailwindPrefix: '',
    };

    const result = sortClassString('custom-class flex m-2', sortOrder, options);
    expect(result).toBe('flex m-2 custom-class');
  });
});

describe('buildMatchers', () => {
  it('should return empty array for undefined config', () => {
    const result = buildMatchers(undefined);
    expect(result).toEqual([]);
  });

  it('should build matcher from string regex', () => {
    const result = buildMatchers('test');
    expect(result).toHaveLength(1);
    expect(result[0].regex).toHaveLength(1);
  });

  it('should build matchers from array of strings', () => {
    const result = buildMatchers(['test1', 'test2']);
    expect(result).toHaveLength(1);
    expect(result[0].regex).toHaveLength(2);
  });
});

describe('getTextMatch', () => {
  it('should extract text matches using regex', () => {
    const regex = /class="([^"]+)"/gi;
    const text = 'div class="flex m-2"';
    const callback = jest.fn();

    getTextMatch([regex], text, callback);

    expect(callback).toHaveBeenCalledWith('flex m-2', 11);
  });

  it('should handle multiple matches', () => {
    const regex = /class="([^"]+)"/gi;
    const text = 'div class="flex" span class="m-2"';
    const callback = jest.fn();

    getTextMatch([regex], text, callback);

    expect(callback).toHaveBeenCalledTimes(2);
  });
});
```

**Step 3: Install dependencies**

Run: `cd /mnt/data/code/aio/tailwind-class-sorter && npm install`

Expected: Dependencies installed successfully

**Step 4: Run tests to verify they pass**

Run: `cd /mnt/data/code/aio/tailwind-class-sorter && npm test`

Expected: All tests pass

**Step 5: Commit test setup**

Run: `cd /mnt/data/code/aio/tailwind-class-sorter && git add . && git commit -m "test: add jest configuration and basic tests"`

---

## Task 4: Build and Verify Package

**Files:**
- Modify: `/mnt/data/code/aio/tailwind-class-sorter/package.json` (add LICENSE copy script)
- Create: `/mnt/data/code/aio/tailwind-class-sorter/LICENSE`

**Step 1: Copy LICENSE from headwind**

Run: `cp /mnt/data/code/aio/headwind/LICENSE /mnt/data/code/aio/tailwind-class-sorter/LICENSE`

**Step 2: Build the package**

Run: `cd /mnt/data/code/aio/tailwind-class-sorter && npm run build`

Expected: TypeScript compiles successfully, `dist/` directory created with `.js` and `.d.ts` files

**Step 3: Verify build output**

Run: `ls -la /mnt/data/code/aio/tailwind-class-sorter/dist/`

Expected: See `index.js`, `index.d.ts`, `types.js`, `types.d.ts`

**Step 4: Test the built package**

Run: `cd /mnt/data/code/aio/tailwind-class-sorter && node -e "const {sortClassString} = require('./dist/index.js'); console.log(sortClassString('m-2 flex p-4', ['flex', 'p-4', 'm-2'], {shouldRemoveDuplicates: true, shouldPrependCustomClasses: false, customTailwindPrefix: ''}));"`

Expected: Output shows `flex p-4 m-2`

**Step 5: Commit build artifacts**

Run: `cd /mnt/data/code/aio/tailwind-class-sorter && git add . && git commit -m "build: add license and verify package builds correctly"`

---

## Task 5: Update Headwind Extension to Use the Package

**Files:**
- Modify: `/mnt/data/code/aio/headwind/package.json` (add dependency)
- Modify: `/mnt/data/code/aio/headwind/src/extension.ts` (update imports)
- Modify: `/mnt/data/code/aio/headwind/src/utils.ts` (remove extracted code, re-export from package)
- Modify: `/mnt/data/code/aio/headwind/tests/utils.spec.ts` (update imports if needed)

**Step 1: Add local package dependency to headwind**

Add to `/mnt/data/code/aio/headwind/package.json` dependencies:

```json
"dependencies": {
  "rustywind": "^0.9.1",
  "tailwind-class-sorter": "file:../tailwind-class-sorter"
}
```

**Step 2: Install the local package**

Run: `cd /mnt/data/code/aio/headwind && npm install`

Expected: Package installs from local path

**Step 3: Update utils.ts to re-export from package**

Modify `/mnt/data/code/aio/headwind/src/utils.ts`:

```typescript
// Re-export everything from the tailwind-class-sorter package
export {
  sortClassString,
  buildMatchers,
  getTextMatch,
  type Options,
  type LangConfig,
  type Matcher
} from 'tailwind-class-sorter';
```

**Step 4: Verify extension.ts imports still work**

Run: `cd /mnt/data/code/aio/headwind && npm run compile`

Expected: TypeScript compiles without errors

**Step 5: Run headwind tests**

Run: `cd /mnt/data/code/aio/headwind && npm test`

Expected: All tests pass

**Step 6: Commit headwind changes**

Run: `cd /mnt/data/code/aio/headwind && git add . && git commit -m "refactor: use tailwind-class-sorter package for core logic"`

---

## Task 6: Prepare Package for NPM Publishing

**Files:**
- Create: `/mnt/data/code/aio/tailwind-class-sorter/CHANGELOG.md`
- Modify: `/mnt/data/code/aio/tailwind-class-sorter/README.md` (add publishing instructions)

**Step 1: Create CHANGELOG**

Create `/mnt/data/code/aio/tailwind-class-sorter/CHANGELOG.md`:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-01-31

### Added
- Initial release of tailwind-class-sorter
- Core sorting functionality extracted from Headwind VS Code extension
- `sortClassString` function for sorting Tailwind CSS classes
- `buildMatchers` function for building regex matchers
- `getTextMatch` function for extracting class strings
- Full TypeScript support with type definitions
- Comprehensive Jest test suite
```

**Step 2: Update README with publishing instructions**

Append to `/mnt/data/code/aio/tailwind-class-sorter/README.md`:

```markdown

## Development

\`\`\`bash
# Install dependencies
npm install

# Build the package
npm run build

# Run tests
npm test
\`\`\`

## Publishing

This package can be published to npm. Before publishing:

1. Ensure all tests pass: \`npm test\`
2. Build the package: \`npm run build\`
3. Update version in package.json if needed
4. Login to npm: \`npm login\`
5. Publish: \`npm publish\`

Note: The \`prepublishOnly\` script will automatically run build and tests before publishing.
```

**Step 3: Verify package is ready**

Run: `cd /mnt/data/code/aio/tailwind-class-sorter && npm run prepublishOnly`

Expected: Build succeeds and all tests pass

**Step 4: Commit documentation**

Run: `cd /mnt/data/code/aio/tailwind-class-sorter && git add . && git commit -m "docs: add changelog and publishing instructions"`

---

## Task 7: Manual Publishing Steps (Document Only)

**This task documents the manual steps required to publish the package to npm.**

### Manual Step 1: Create npm Account (if needed)

If you don't have an npm account:
1. Go to https://www.npmjs.com/signup
2. Create an account
3. Verify your email address

### Manual Step 2: Login to npm CLI

In terminal:
```bash
cd /mnt/data/code/aio/tailwind-class-sorter
npm login
```

Enter your npm credentials when prompted.

### Manual Step 3: Check Package Name Availability

```bash
npm search tailwind-class-sorter
```

If the name is taken, update the package name in `package.json` to something unique like:
- `@your-username/tailwind-class-sorter`
- `tailwind-css-class-sorter`
- Another available variant

### Manual Step 4: Verify Package Contents

```bash
npm pack --dry-run
```

This shows what will be included in the published package. Verify that:
- `dist/` directory is included
- Source files (`src/`) are excluded
- `README.md` and `LICENSE` are included

### Manual Step 5: Publish to npm

```bash
npm publish
```

Or for scoped packages:
```bash
npm publish --access public
```

### Manual Step 6: Verify Publication

1. Visit https://www.npmjs.com/package/tailwind-class-sorter
2. Check that the package page displays correctly
3. Verify the README renders properly
4. Check the version number

### Manual Step 7: Update Headwind to Use Published Package

Once published, update `/mnt/data/code/aio/headwind/package.json`:

Change from:
```json
"tailwind-class-sorter": "file:../tailwind-class-sorter"
```

To:
```json
"tailwind-class-sorter": "^1.0.0"
```

Then run:
```bash
cd /mnt/data/code/aio/headwind
npm install
npm test
```

### Manual Step 8: Commit Final Changes

```bash
cd /mnt/data/code/aio/headwind
git add package.json package-lock.json
git commit -m "chore: use published tailwind-class-sorter package from npm"
```

---

## Summary

After completing all tasks:

1. ✅ New package structure created in `/mnt/data/code/aio/tailwind-class-sorter`
2. ✅ Core sorting logic extracted and tested
3. ✅ Jest tests passing in new package
4. ✅ Package builds successfully with TypeScript
5. ✅ Headwind extension updated to use the package locally
6. ✅ All headwind tests still passing
7. ✅ Documentation and changelog created
8. 📝 Manual publishing steps documented

**Next Steps (Manual):**
- Follow Task 7 manual steps to publish to npm
- Update headwind to use published package version
- Test headwind extension with published package
- Create GitHub repository for the new package (optional)
- Set up CI/CD for automated testing and publishing (optional)
