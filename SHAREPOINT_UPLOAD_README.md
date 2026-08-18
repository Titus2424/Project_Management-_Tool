# Code App SharePoint Document Upload Feature

## Important architecture note

The uploaded Vibe Apps export is already a Power Apps Code App scaffold. It already contains:

- Vite + React + TypeScript
- `@microsoft/power-apps`
- `power.config.json`
- generated Dataverse models/services
- `initialize()` and `getContext()`
- generated Dataverse CRUD services

The feature in this folder adds SharePoint document-library upload and metadata.

### Why the CreateFile call uses the runtime HTTP bridge

The requested pattern was:

`getClient(dataSourcesInfo).executeAsync(...)` + raw `ArrayBuffer` + SharePoint `CreateFile`.

The public Code Apps SDK exposes `executeAsync` for connector operations, but Microsoft documents SharePoint `CreateFile` as a `binary` operation. In practice, the public connector operation path serializes connector request payloads and is not a reliable raw-binary transport for this operation. Therefore this implementation does **not** pretend that a `Uint8Array` passed to `executeAsync` is guaranteed to remain raw bytes.

Instead:

1. The SharePoint connector is still registered in `power.config.json`.
2. The signed-in-user connector runtime is still used.
3. The one `CreateFile` request is sent through the Power Apps runtime HTTP bridge with a raw `Blob`.
4. No Graph token, client secret, hard-coded secret, chunking, upload session, or Power Automate flow is used.
5. Metadata is updated through the generated SharePoint connector operation `PatchFileItem`.

This is the production-oriented path for the exact 4 MB/single-request constraint. The runtime bridge is an internal SDK surface, so pin/test the SDK version used by your organization before production deployment.

## Files

- `types.ts` — strict types, 4 MB limit, editable Choice values, SharePoint internal-name constants.
- `SharePointUploadService.ts` — single CreateFile + metadata update.
- `useDocumentUpload.ts` — validation, busy state, cancellation state, retry support.
- `DocumentUpload.tsx` — picker, drag/drop, metadata form, toast handling, Dataverse update.

## 1. Add SharePoint

From the Code App root:

```powershell
pac auth list
pac auth create
pac connection list

pac code add-data-source `
  -a shared_sharepointonline `
  -c <connectionId> `
  -t "<LibraryName>" `
  -d "https://<tenant>.sharepoint.com/sites/<site>"
```

The CLI generates the typed SharePoint service/model files and updates `power.config.json`.

## 2. Add Office 365 Users

```powershell
pac code add-data-source `
  -a shared_office365users `
  -c <office365UsersConnectionId>
```

The generated data-source name is expected to be `Office365Users`. If your CLI generates a different name, update `OFFICE365_USERS_DATA_SOURCE_NAME` in `SharePointUploadService.ts`.

## 3. Verify generated SharePoint operation names

The generated `.power/appschemas/dataSourcesInfo.ts` must contain these SharePoint operations:

- `CreateFile`
- `PatchFileItem`

The service uses `PatchFileItem` for file properties because the target is a document-library item.

## 4. Configure the constants

In `types.ts`, replace:

```ts
export const SHAREPOINT_LIBRARY_NAME = "<SET_LIBRARY_NAME>";
export const SHAREPOINT_SITE_URL =
  "https://<tenant>.sharepoint.com/sites/<site>";
```

with your actual values.

Also verify every internal SharePoint column name in `SHAREPOINT_COLUMNS`. Display names and internal names are not guaranteed to be identical.

## 5. Connect the upload component to your existing document screen

Example:

```tsx
<DocumentUpload
  dataverseDocumentId={document.id}
  projectCode={projectCode}
  taskReference={taskReference}
/>
```

Your existing Dataverse record is updated after SharePoint succeeds:

- `documentURL` = SharePoint file URL
- `sharePointFileID` = SharePoint file identifier
- `documentName` = uploaded file name
- `fileSizeMB` = file size
- `comments` = description
- `statusKey` = selected document status

The Dataverse table in the supplied project is `dmeo_ctsdocument`, represented by `CTSDocumentService`.

## 6. Build and run

```powershell
npm install
npm run dev
```

or:

```powershell
pac code run
```

For deployment:

```powershell
npm run build
pac code push
```

## CSP

Code Apps CSP is configured at the Power Platform environment level.

Microsoft's Code Apps default `connect-src` is restrictive. If your environment's CSP blocks the connector runtime request, configure the Code Apps `connect-src` directive in Power Platform admin center rather than adding arbitrary SharePoint URLs to the application source.

Do not blindly replace the platform defaults. Preserve the platform-required sources and add the SharePoint/runtime host only if the browser reports a CSP violation.

Admin path:

Power Platform admin center
-> Environment
-> Settings
-> Product
-> Privacy + Security
-> Content security policy
-> App

The Code Apps CSP documentation should be treated as the authoritative list of platform sources.

## 7. 4 MB rule

The feature deliberately has no:

- chunking
- `createUploadSession`
- resumable upload
- retry of partial chunks
- Power Automate fallback
- Graph direct upload
- base64 conversion

The client rejects files above exactly 4 MiB before CreateFile is attempted.

## 8. Important SharePoint person-field note

Person/group columns are sent as membership claims:

`i:0#.f|membership|user@tenant.com`

The service resolves the current user through Office 365 Users and falls back to the Power Apps host context if needed.

Approver is optional. If supplied, its email is converted to the same claims format.

## 9. Security

No secrets are stored in source code.

Authentication is handled by the Power Apps connector runtime for the signed-in user.

Do not add:

- SharePoint client IDs
- client secrets
- Graph access tokens
- tenant secrets
- hard-coded bearer tokens

to the project.
