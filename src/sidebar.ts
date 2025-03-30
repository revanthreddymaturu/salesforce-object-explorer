import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getAllObjects, getObjectMetadata, runSOQLQuery, getUserAndOrgInfo } from './salesforce';

export class SidebarProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {
    console.log('SidebarProvider constructed with URI:', this._extensionUri.fsPath);
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    console.log('resolveWebviewView called');
    this._view = webviewView;

    webviewView.webview.options = { enableScripts: true, localResourceRoots: [this._extensionUri] };
    console.log('Webview options set:', webviewView.webview.options);
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    let currentObject: string | null = null;

    Promise.all([getAllObjects(), getUserAndOrgInfo()])
      .then(([objects, userOrgInfo]) => {
        console.log('Sending initial data to webview:', objects.length, 'objects', userOrgInfo);
        webviewView.webview.postMessage({
          command: 'loadObjects',
          objects,
          userName: userOrgInfo.userName,
          orgName: userOrgInfo.orgName,
          currentObject,
        });
      })
      .catch(error => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Failed to load initial data:', errorMessage);
        webviewView.webview.postMessage({ command: 'error', message: 'Failed to initialize extension' });
      });

    webviewView.webview.onDidReceiveMessage(async (message) => {
      console.log('Received message from webview:', message);
      switch (message.command) {
        case 'selectObject':
          currentObject = message.objectName;
          const metadata = await getObjectMetadata(message.objectName);
          if (metadata) {
            console.log('Sending metadata:', metadata.apiName);
            console.log('Child Relationships:', metadata.childRelationships.map((cr: any) => ({
              childSObject: cr.childSObject,
              relationshipName: cr.relationshipName,
            })));
            webviewView.webview.postMessage({ command: 'displayMetadata', data: metadata });
          }
          break;
        case 'runSOQLQuery':
          const queryResult = await runSOQLQuery(message.query);
          if (queryResult) {
            console.log('Sending SOQL results:', queryResult.length, 'records');
            webviewView.webview.postMessage({ command: 'displaySOQLResults', data: queryResult });
          }
          break;
      }
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    try {
      const htmlPath = vscode.Uri.joinPath(this._extensionUri, 'webview', 'sidebar.html');
      console.log('Attempting to load HTML from:', htmlPath.fsPath);
      const htmlContent = fs.readFileSync(htmlPath.fsPath, 'utf8');
      console.log('HTML loaded successfully, length:', htmlContent.length);
      return htmlContent;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error loading sidebar.html:', errorMessage);
      return `<h1>Error</h1><p>${errorMessage}</p>`;
    }
  }
}