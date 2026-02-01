'use strict';

import { commands, workspace, ExtensionContext, Range, window } from 'vscode';
import { processText, LangConfig } from './utils';
import { spawn } from 'child_process';
import { rustyWindPath } from 'rustywind';

const config = workspace.getConfiguration();
const langConfig: { [key: string]: LangConfig | LangConfig[] } =
    config.get('headwind.classRegex') || {};

const customTailwindPrefixConfig = config.get('headwind.customTailwindPrefix');
const customTailwindPrefix =
    typeof customTailwindPrefixConfig === 'string'
        ? customTailwindPrefixConfig
        : '';

const shouldRemoveDuplicatesConfig = config.get('headwind.removeDuplicates');
const shouldRemoveDuplicates =
    typeof shouldRemoveDuplicatesConfig === 'boolean'
        ? shouldRemoveDuplicatesConfig
        : true;

const shouldPrependCustomClassesConfig = config.get(
    'headwind.prependCustomClasses'
);
const shouldPrependCustomClasses =
    typeof shouldPrependCustomClassesConfig === 'boolean'
        ? shouldPrependCustomClassesConfig
        : false;

export function activate(context: ExtensionContext) {
    let disposable = commands.registerCommand(
        'headwind.sortTailwindClasses',
        async () => {
            const editor = window.activeTextEditor;
            if (!editor) return;

            const editorText = editor.document.getText();
            const editorLangId = editor.document.languageId;

            const options = {
                shouldRemoveDuplicates,
                shouldPrependCustomClasses,
                customTailwindPrefix,
            };

            const langCfg = langConfig[editorLangId] || langConfig['html'];

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
                    console.log('Failed to apply edits!');
                } else {
                    console.log('Edits applied successfully!');
                }
            }
        }
    );

    let runOnProject = commands.registerCommand(
        'headwind.sortTailwindClassesOnWorkspace',
        async () => {
            let workspaceFolder = workspace.workspaceFolders || [];
            for (const folder of workspaceFolder) {

                // Call sortTailwindClasses for all workspace files with extensions ['jade', 'haml']
                const extensionFiles = await workspace.findFiles('**/*.{jade,haml}');

                window.showInformationMessage(
                    `Running Headwind on: ${folder.uri.fsPath}, ${extensionFiles.length} files found.`
                );

                let rustyWindArgs = [
                    folder.uri.fsPath,
                    '--write',
                    shouldRemoveDuplicates ? '' : '--allow-duplicates',
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

                for (const file of extensionFiles) {
                    const document = await workspace.openTextDocument(file);
                    const editor = await window.showTextDocument(document);
                    await commands.executeCommand('headwind.sortTailwindClasses');
                }
            }
        }
    );

    context.subscriptions.push(runOnProject);
    context.subscriptions.push(disposable);

    // if runOnSave is enabled organize tailwind classes before saving
    if (config.get('headwind.runOnSave')) {
        context.subscriptions.push(
            workspace.onWillSaveTextDocument((_e) => {
                commands.executeCommand('headwind.sortTailwindClasses');
            })
        );
    }
}