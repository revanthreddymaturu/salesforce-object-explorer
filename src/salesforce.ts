import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch'; // Use node-fetch instead of native fetch

const execPromise = promisify(exec);

// Interface for Salesforce authentication
interface SalesforceAuth {
  accessToken: string;
  instanceUrl: string;
}

// Interface for the response from /sobjects (getAllObjects)
interface SObjectsResponse {
  sobjects: Array<{
    label: string;
    name: string;
  }>;
}

// Interface for the user info response from /chatter/users/me (getUserAndOrgInfo)
interface UserInfoResponse {
  username: string;
}

// Interface for the object metadata response from /sobjects/{objectName}/describe (getObjectMetadata)
interface ObjectMetadataResponse {
  name: string;
  label: string;
  fields: Array<{
    name: string;
    label: string;
    type: string;
    nillable: boolean;
    picklistValues?: Array<{ value: string; label: string }>;
    referenceTo: string[];
    relationshipName?: string;
    custom: boolean;
  }>;
  childRelationships: Array<{
    childSObject: string;
    relationshipName: string;
    field: string;
  }>;
}

// Interface for the record types response from /query (getObjectMetadata)
interface RecordTypesResponse {
  records: Array<{
    Name: string;
  }>;
}

// Interface for the layouts response from /tooling/sobjects/Layout (getObjectMetadata)
interface LayoutsResponse {
  records: Array<{
    FullName: string;
  }>;
}

// Interface for the SOQL query response from /query (runSOQLQuery)
interface SOQLQueryResponse {
  records: Array<any>;
}

let cachedAuth: SalesforceAuth | null = null;

async function authenticateSalesforce(): Promise<SalesforceAuth> {
  if (cachedAuth) return cachedAuth;
  try {
    const { stdout } = await execPromise('sfdx force:org:display --json');
    const orgInfo = JSON.parse(stdout).result;
    cachedAuth = {
      accessToken: orgInfo.accessToken,
      instanceUrl: orgInfo.instanceUrl,
    };
    const response = await fetch(`${cachedAuth.instanceUrl}/services/data/v59.0/`, {
      headers: { Authorization: `Bearer ${cachedAuth.accessToken}` },
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    console.log('Salesforce connection successful');
    return cachedAuth;
  } catch (error) {
    console.error('Auth error:', error);
    const action = await vscode.window.showWarningMessage(
      'No authenticated Salesforce org found. Authenticate now?',
      'Yes',
      'No'
    );
    if (action === 'Yes') {
      await execPromise('sfdx force:auth:web:login --json');
      const { stdout } = await execPromise('sfdx force:org:display --json');
      const orgInfo = JSON.parse(stdout).result;
      cachedAuth = {
        accessToken: orgInfo.accessToken,
        instanceUrl: orgInfo.instanceUrl,
      };
      return cachedAuth;
    }
    throw new Error('Salesforce authentication required.');
  }
}

export async function getAllObjects(): Promise<{ label: string; apiName: string }[]> {
  try {
    const auth = await authenticateSalesforce();
    const response = await fetch(`${auth.instanceUrl}/services/data/v59.0/sobjects`, {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    const data = (await response.json()) as SObjectsResponse;
    return data.sobjects.map((sobject) => ({
      label: sobject.label,
      apiName: sobject.name,
    }));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in getAllObjects:', errorMessage);
    vscode.window.showErrorMessage(`Error fetching objects: ${errorMessage}`);
    return [];
  }
}

export async function getUserAndOrgInfo(): Promise<{ userName: string; orgName: string }> {
  try {
    const auth = await authenticateSalesforce();
    const userResponse = await fetch(`${auth.instanceUrl}/services/data/v59.0/chatter/users/me`, {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      throw new Error(`HTTP ${userResponse.status}: ${errorText}`);
    }
    const userData = (await userResponse.json()) as UserInfoResponse;
    const { stdout } = await execPromise('sfdx force:org:display --json');
    const orgInfo = JSON.parse(stdout).result;
    return {
      userName: userData.username,
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
    const auth = await authenticateSalesforce();
    const [metadataResponse, recordTypesResponse, layoutsResponse] = await Promise.all([
      fetch(`${auth.instanceUrl}/services/data/v59.0/sobjects/${objectName}/describe`, {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
        signal: undefined,
      }),
      fetch(`${auth.instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(`SELECT Name FROM RecordType WHERE SobjectType = '${objectName}'`)}`, {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
        signal: undefined,
      }),
      fetch(`${auth.instanceUrl}/services/data/v59.0/tooling/sobjects/Layout`, {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
        signal: undefined,
      }),
    ]);

    if (!metadataResponse.ok) {
      const errorText = await metadataResponse.text();
      throw new Error(`HTTP ${metadataResponse.status}: ${errorText}`);
    }
    if (!recordTypesResponse.ok) {
      const errorText = await recordTypesResponse.text();
      throw new Error(`HTTP ${recordTypesResponse.status}: ${errorText}`);
    }
    if (!layoutsResponse.ok) {
      const errorText = await layoutsResponse.text();
      throw new Error(`HTTP ${layoutsResponse.status}: ${errorText}`);
    }

    const metadata = (await metadataResponse.json()) as ObjectMetadataResponse;
    const recordTypes = (await recordTypesResponse.json()) as RecordTypesResponse;
    const layouts = (await layoutsResponse.json()) as LayoutsResponse;

    // Log the layouts response for debugging
    console.log('Layouts response:', layouts);

    // Handle cases where layouts.records is undefined or null
    const pageLayouts = layouts.records && Array.isArray(layouts.records)
      ? layouts.records
          .filter((pl) => pl.FullName.startsWith(`${objectName}-`))
          .map((pl) => ({
            label: decodeURIComponent(pl.FullName.split('-')[1]),
            apiName: pl.FullName,
          }))
      : [];

    return {
      apiName: metadata.name,
      label: metadata.label,
      fields: metadata.fields.map((field) => ({
        apiName: field.name,
        label: field.label,
        type: field.type,
        required: !field.nillable,
        picklistValues: field.picklistValues || [],
        referenceTo: field.type === 'reference' ? field.referenceTo : [],
        relationshipName: field.relationshipName || null,
        custom: field.custom,
      })),
      childRelationships: metadata.childRelationships.map((cr) => ({
        childSObject: cr.childSObject,
        relationshipName: cr.relationshipName,
        field: cr.field,
      })),
      recordTypes: recordTypes.records.map((rt) => ({
        label: rt.Name,
        apiName: rt.Name,
      })),
      pageLayouts: pageLayouts,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in getObjectMetadata:', errorMessage);
    vscode.window.showErrorMessage(`Error fetching metadata: ${errorMessage}`);
    return null;
  }
}
export async function runSOQLQuery(query: string): Promise<any> {
  try {
    if (!query || typeof query !== 'string' || !query.toLowerCase().startsWith('select')) {
      throw new Error('Invalid SOQL query');
    }
    const auth = await authenticateSalesforce();
    const response = await fetch(`${auth.instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    const data = (await response.json()) as SOQLQueryResponse;
    return data.records;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in runSOQLQuery:', errorMessage);
    vscode.window.showErrorMessage(`Error running SOQL query: ${errorMessage}`);
    return [];
  }
}