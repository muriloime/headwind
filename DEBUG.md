# Debugging Headwind Extension Issues

## If the extension is "not working" after the refactoring:

### 1. Reload the Extension Host in VS Code

After changing dependencies or code:
- Press `F5` to start debugging the extension (this will open a new Extension Development Host window)
- Or press `Ctrl+Shift+P` → "Developer: Reload Window"

### 2. Check for Errors in Developer Console

1. Open VS Code Developer Tools: `Help` → `Toggle Developer Tools`
2. Go to the `Console` tab
3. Look for any red error messages when you try to sort classes
4. Common errors:
   - `Cannot find module 'tailwind-sort'` - means node_modules isn't installed correctly
   - `TypeError` or `undefined` - means configuration or function call issue

### 3. Verify the Extension is Loaded

1. Press `Ctrl+Shift+P`
2. Type "Headwind"
3. You should see:
   - "Headwind: Sort Tailwind CSS Classes"
   - "Headwind: Sort Tailwind CSS Classes on Entire Workspace"

### 4. Test with a Simple HTML File

Create a test file:

```html
<!DOCTYPE html>
<html>
<body>
    <div class="px-4 container mx-auto text-center">Test</div>
</body>
</html>
```

1. Save as `test.html`
2. Place cursor inside the file
3. Press `Ctrl+Shift+P` → "Headwind: Sort Tailwind CSS Classes"
4. The classes should be reordered

### 5. Check Configuration

Open VS Code settings (`Ctrl+,`) and search for "headwind":

Required settings:
- `headwind.classRegex` - should have configuration for your file types
- `headwind.removeDuplicates` - default: true
- `headwind.runOnSave` - default: false

### 6. Verify Dependencies are Installed

In the terminal, from the extension directory:

```bash
npm list tailwind-sort
```

Should show:
```
headwind-haml-fork@2.1.6
└── tailwind-sort@2.0.1
```

If not installed:
```bash
npm install
```

### 7. Check File Language Mode

The extension only works for specific file types. Check:
1. Look at the bottom-right corner of VS Code
2. You should see the language mode (HTML, JavaScript, HAML, etc.)
3. Make sure your file type is configured in `headwind.classRegex`

### 8. Manual Test Script

Run this from the extension directory to verify functionality:

```bash
node test-extension.js
```

If this passes but VS Code doesn't work, the issue is with VS Code loading the extension.

### 9. Reinstall Extension in VS Code

If developing locally:
1. Close VS Code
2. Delete `~/.vscode/extensions/headwind-*` (or wherever your extension is installed)
3. Reinstall: `npm run compile` then press `F5` to debug

### 10. Check Extension Manifest

Verify `package.json`:
- `"main": "./out/extension"` - points to compiled extension
- `"activationEvents"` - includes your file types
- `"dependencies"` includes `"tailwind-sort": "^2.0.1"`

## Common Fixes

### Fix 1: Extension Not Reloaded
**Solution:** Press `Ctrl+Shift+P` → "Developer: Reload Window"

### Fix 2: node_modules Missing
**Solution:**
```bash
cd /mnt/data/code/aio/headwind
npm install
npm run compile
```

### Fix 3: Configuration Not Set
**Solution:** Add to VS Code settings.json:
```json
{
    "headwind.classRegex": {
        "html": "\\bclass\\s*=\\s*[\\\"\\']([\\._a-zA-Z0-9\\s\\-\\:\\/]+)[\\\"\\']",
        "javascript": [
            "(?:\\b(?:class(?:Name)?|tw)\\s*=\\s*(?:(?:{([\\w\\d\\s!?_\\-:/${}()[\\]\"'`,]+)})|([\"'`][\\.\\w\\d\\s_\\-:/]+[\"'`])))",
            "(?:[\"'`]([\\.\\w\\d\\s_\\-:/${}()[\\]]+)[\"'`])"
        ]
    }
}
```

### Fix 4: Outdated Compiled Code
**Solution:**
```bash
npm run compile
# Then reload VS Code
```

## Still Not Working?

If none of the above fixes work:

1. Check the extension host console:
   - `Help` → `Toggle Developer Tools`
   - Go to `Console` tab
   - Try to sort classes and look for errors

2. Enable extension host logging:
   - Add to your settings: `"extensions.experimental.enableLogging": true`
   - Restart VS Code
   - Check logs in `Help` → `Toggle Developer Tools`

3. Provide the error message from the console when asking for help

## Testing the Compiled Extension

You can test if the compiled code works:

```javascript
const { processText } = require('./out/utils');

processText(
    '<div class="px-4 container mx-auto">Test</div>',
    '\\bclass\\s*=\\s*[\\"\\\']([\\._a-zA-Z0-9\\s\\-\\:\\/]+)[\\"\\\']',
    {
        shouldRemoveDuplicates: true,
        shouldPrependCustomClasses: false,
        customTailwindPrefix: ''
    }
).then(console.log);
```

This should output the sorted HTML.
