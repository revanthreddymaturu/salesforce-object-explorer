import * as vscode from 'vscode';
import * as jsforce from 'jsforce';
import { exec } from 'child_process';
import { promisify } from 'util';
const execPromise = promisify(exec);

let cachedConnection: jsforce.Connection | null = null;

async function authenticateSalesforce(): Promise<jsforce.Connection> {
  if (cachedConnection) return cachedConnection;
  try {
    const { stdout } = await execPromise('sfdx force:org:display --json');
    const orgInfo = JSON.parse(stdout).result;
    cachedConnection = new jsforce.Connection({
      accessToken: orgInfo.accessToken,
      instanceUrl: orgInfo.instanceUrl,
    });
    return cachedConnection;
  } catch (error) {
    const action = await vscode.window.showWarningMessage(
      'No authenticated Salesforce org found. Authenticate now?',
      'Yes',
      'No'
    );
    if (action === 'Yes') {
      await execPromise('sfdx force:auth:web:login --json');
      const { stdout } = await execPromise('sfdx force:org:display --json');
      const orgInfo = JSON.parse(stdout).result;
      cachedConnection = new jsforce.Connection({
        accessToken: orgInfo.accessToken,
        instanceUrl: orgInfo.instanceUrl,
      });
      return cachedConnection;
    }
    throw new Error('Salesforce authentication required.');
  }
}

export async function getAllObjects(): Promise<{ label: string; apiName: string }[]> {
  try {
    const conn = await authenticateSalesforce();
    const result = await conn.describeGlobal();
    return result.sobjects.map((sobject: any) => ({
      label: sobject.label,
      apiName: sobject.name,
    }));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Error fetching objects: ${errorMessage}`);
    return [];
  }
}

export async function getUserAndOrgInfo(): Promise<{ userName: string; orgName: string }> {
  try {
    const conn = await authenticateSalesforce();
    const userInfo = await conn.identity();
    const { stdout } = await execPromise('sfdx force:org:display --json');
    const orgInfo = JSON.parse(stdout).result;
    return {
      userName: userInfo.username,
      orgName: orgInfo.name || 'Unknown Org',
    };
  } catch (error) {
    console.error(`Error fetching user/org info: ${error instanceof Error ? error.message : error}`);
    return { userName: 'Unknown User', orgName: 'Unknown Org' };
  }
}

export async function getObjectMetadata(objectName: string): Promise<any> {
  try {
    if (!objectName || typeof objectName !== 'string' || objectName.includes("'")) {
      throw new Error('Invalid object name');
    }

    const conn = await authenticateSalesforce();
    const metadata = await conn.sobject(objectName).describe();
    const recordTypes = await conn.query(
      `SELECT Name FROM RecordType WHERE SobjectType = '${sanitizeSOQLInput(objectName)}'`
    );
    const pageLayouts = await conn.metadata.list({ type: 'Layout' }, '57.0');

    return {
      apiName: metadata.name,
      label: metadata.label,
      fields: metadata.fields.map((field: any) => ({
        apiName: field.name,
        label: field.label,
        type: field.type,
        required: !field.nillable,
        picklistValues: field.picklistValues || [],
        referenceTo: field.type === 'reference' ? field.referenceTo : [],
        relationshipName: field.relationshipName || null,
        custom: field.custom,
      })),
      childRelationships: metadata.childRelationships.map((cr: any) => ({
        childSObject: cr.childSObject,
        relationshipName: cr.relationshipName,
        field: cr.field,
      })),
      recordTypes: recordTypes.records.map((rt: any) => ({
        label: rt.Name,
        apiName: rt.Name,
      })),
      pageLayouts: pageLayouts
        ? pageLayouts
            .filter((pl: any) => pl.fullName.startsWith(`${objectName}-`))
            .map((pl: any) => ({
              label: decodeURIComponent(pl.fullName.split('-')[1]), // Decode the layout name
              apiName: pl.fullName,
            }))
        : [],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Error fetching metadata: ${errorMessage}`);
    return null;
  }
}

export async function runSOQLQuery(query: string): Promise<any> {
  try {
    if (!query || typeof query !== 'string' || !query.toLowerCase().startsWith('select')) {
      throw new Error('Invalid SOQL query');
    }

    const conn = await authenticateSalesforce();
    const result = await conn.query(query);
    return result.records;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Error running SOQL query: ${errorMessage}`);
    return null;
  }
}

function sanitizeSOQLInput(input: string): string {
  return input.replace(/['";]/g, '');
}