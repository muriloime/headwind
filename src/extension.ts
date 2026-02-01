'use strict';

import { commands, workspace, ExtensionContext, Range, window } from 'vscode';
import { processText, processFile, LangConfig } from './utils';
import { spawn } from 'child_process';
import { rustyWindPath } from 'rustywind';

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
        async () => {
            const editor = window.activeTextEditor;
            if (!editor) return;

            const editorText = editor.document.getText();
            const editorLangId = editor.document.languageId;

            const config = getConfiguration();

            const options = {
                shouldRemoveDuplicates: config.removeDuplicates,
                shouldPrependCustomClasses: config.prependCustomClasses,
                customTailwindPrefix: config.customTailwindPrefix,
            };

            const langCfg = config.classRegex[editorLangId] || config.classRegex['html'];

            try {
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

                rustyWindProc.stdout.on(
                    'data',
                    (data) =>
                        data &&
                        data.toString() !== '' &&
                        console.log('rustywind stdout:\n', data.toString())
                );

                rustyWindProc.stderr.on('data', (data) => {
                    if (data && data.toString() !== '') {
                        console.log('rustywind stderr:\n', data.toString());
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
                commands.executeCommand('headwind.sortTailwindClasses');
            }
        })
    );
}