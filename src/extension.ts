import * as vscode from 'vscode';
import { SidebarProvider } from './sidebar';

export function activate(context: vscode.ExtensionContext) {
  console.log('Salesforce Object Explorer activated');

  // Create a SidebarProvider to handle the webview
  const sidebarProvider = new SidebarProvider(context.extensionUri);

  // Register the Webview View provider for the sidebar
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'salesforceObjectExplorerSidebar', // Match package.json
      sidebarProvider
    )
  );

  // Register the command that will open the sidebar
  const disposable = vscode.commands.registerCommand('salesforceObjectExplorer.showSidebar', () => {
    console.log('Show Sidebar command executed');
    vscode.commands.executeCommand('salesforceObjectExplorerSidebar.focus'); // Focus the sidebar
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {
  console.log('Salesforce Object Explorer deactivated');
}