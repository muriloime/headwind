'use strict';

import { commands, workspace, ExtensionContext, Range, window } from 'vscode';
import { processText, processFile, LangConfig } from './utils';
import { spawn } from 'child_process';
import { rustyWindPath } from 'rustywind';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Finds the directory containing tailwind.config.js
 * Searches workspace root first, then recursively searches subdirectories
 */
async function findTailwindConfigDir(workspaceDir: string | undefined): Promise<string | undefined> {
    if (!workspaceDir) return undefined;

    // Check common config file names
    const configNames = [
        'tailwind.config.js',
        'tailwind.config.cjs',
        'tailwind.config.mjs',
        'tailwind.config.ts'
    ];

    // First, check workspace root
    for (const configName of configNames) {
        const rootConfigPath = path.join(workspaceDir, configName);
        if (fs.existsSync(rootConfigPath)) {
            console.log('[Headwind] Found Tailwind config at workspace root:', rootConfigPath);
            return workspaceDir;
        }
    }

    // If not in root, search recursively using VS Code's findFiles
    // This respects .gitignore and is more efficient than manual traversal
    for (const configName of configNames) {
        const files = await workspace.findFiles(`**/${configName}`, '**/node_modules/**', 1);
        if (files.length > 0) {
            const configDir = path.dirname(files[0].fsPath);
            console.log('[Headwind] Found Tailwind config at:', files[0].fsPath);
            return configDir;
        }
    }

    console.log('[Headwind] No Tailwind config found, using workspace root');
    return workspaceDir;
}

const getConfiguration = () => {
    const config = workspace.getConfiguration('headwind');
    return {
        runOnSave: config.get<boolean>('runOnSave', true),
        classRegex: config.get<{ [key: string]: LangConfig | LangConfig[] }>('classRegex', {}),
        customTailwindPrefix: config.get<string>('customTailwindPrefix', ''),
        removeDuplicates: config.get<boolean>('removeDuplicates', true),
        prependCustomClasses: config.get<boolean>('prependCustomClasses', false),
    };
};

export function activate(context: ExtensionContext) {
    let disposable = commands.registerCommand(
        'headwind.sortTailwindClasses',
        async (showNotification: boolean = true) => {
            const editor = window.activeTextEditor;
            if (!editor) return;

            const editorText = editor.document.getText();
            const editorLangId = editor.document.languageId;

            const config = getConfiguration();

            // Get workspace directory for resolving Tailwind config
            const workspaceDir = workspace.workspaceFolders?.[0]?.uri.fsPath;

            // Find the directory containing tailwind.config.js
            const tailwindConfigDir = await findTailwindConfigDir(workspaceDir);

            const options = {
                shouldRemoveDuplicates: config.removeDuplicates,
                shouldPrependCustomClasses: config.prependCustomClasses,
                customTailwindPrefix: config.customTailwindPrefix,
                baseDir: tailwindConfigDir,  // Pass directory containing tailwind config
            };

            const langCfg = config.classRegex[editorLangId] || config.classRegex['html'];

            console.log('[Headwind DEBUG] Language ID:', editorLangId);
            console.log('[Headwind DEBUG] Has config for language:', !!config.classRegex[editorLangId]);
            console.log('[Headwind DEBUG] Using config:', JSON.stringify(langCfg).substring(0, 100));

            try {
                // Check if we have configuration for this language
                if (!langCfg) {
                    window.showWarningMessage(
                        `Headwind: No configuration found for language "${editorLangId}". ` +
                        `Add configuration in settings under "headwind.classRegex".`
                    );
                    return;
                }

                // Process the text using the new processText function
                const sortedText = await processText(editorText, langCfg, options);

                // If text changed, replace the entire document
                if (sortedText !== editorText) {
                    const fullRange = new Range(
                        editor.document.positionAt(0),
                        editor.document.positionAt(editorText.length)
                    );

                    const success = await editor.edit((editBuilder) => {
                        editBuilder.replace(fullRange, sortedText);
                    });

                    if (!success) {
                        window.showErrorMessage('Headwind: Failed to apply edits!');
                    } else {
                        // Show notification only if manually triggered
                        if (showNotification) {
                            window.showInformationMessage('✓ Headwind: Classes sorted successfully');
                        }
                    }
                } else {
                    // Show notification that no changes were needed
                    if (showNotification) {
                        window.showInformationMessage('ℹ Headwind: Classes are already sorted');
                    }
                }
            } catch (error) {
                console.error('Headwind error:', error);
                window.showErrorMessage(`Headwind error: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    );

    let runOnProject = commands.registerCommand(
        'headwind.sortTailwindClassesOnWorkspace',
        async () => {
            const config = getConfiguration();
            let workspaceFolders = workspace.workspaceFolders || [];
            
            for (const folder of workspaceFolders) {
                // Call sortTailwindClasses for all workspace files with extensions ['jade', 'haml']
                const extensionFiles = await workspace.findFiles(
                    '**/*.{jade,haml}',
                    '**/node_modules/**'
                );

                window.showInformationMessage(
                    `Running Headwind on: ${folder.uri.fsPath}, ${extensionFiles.length} files found.`
                );

                let rustyWindArgs = [
                    folder.uri.fsPath,
                    '--write',
                    config.removeDuplicates ? '' : '--allow-duplicates',
                ].filter((arg) => arg !== '');

                let rustyWindProc = spawn(rustyWindPath, rustyWindArgs);

                rustyWindProc.stderr.on('data', (data) => {
                    if (data && data.toString() !== '') {
                        window.showErrorMessage(`Headwind error: ${data.toString()}`);
                    }
                });

                const options = {
                    shouldRemoveDuplicates: config.removeDuplicates,
                    shouldPrependCustomClasses: config.prependCustomClasses,
                    customTailwindPrefix: config.customTailwindPrefix,
                };

                for (const file of extensionFiles) {
                    const langId = file.fsPath.endsWith('.haml') ? 'haml' : 'jade';
                    const langCfg = config.classRegex[langId] || config.classRegex['html'];
                    
                    try {
                        await processFile(file.fsPath, langCfg, options);
                    } catch (error) {
                        console.error(`Failed to process ${file.fsPath}:`, error);
                    }
                }
            }
        }
    );

    context.subscriptions.push(runOnProject);
    context.subscriptions.push(disposable);

    // if runOnSave is enabled organize tailwind classes before saving
    context.subscriptions.push(
        workspace.onWillSaveTextDocument((_e) => {
            if (getConfiguration().runOnSave) {
                // Don't show notifications on auto-save
                commands.executeCommand('headwind.sortTailwindClasses', false);
            }
        })
    );
}