# Final setup for the Construction Project Management Code App

This ZIP contains the original Vibe Apps React/TypeScript/Vite project plus the SharePoint document upload feature.

## 1. Install

```powershell
npm install
```

## 2. Add SharePoint and Office 365 Users data sources

Microsoft Code Apps generates typed connector files when you add a data source.

```powershell
pac auth list
pac connection list

pac code add-data-source `
  -a "shared_sharepointonline" `
  -c "<SharePointConnectionId>" `
  -t "<LibraryName>" `
  -d "https://<tenant>.sharepoint.com/sites/<site>"

pac code add-data-source `
  -a "shared_office365users" `
  -c "<Office365UsersConnectionId>"
```

Or use `scripts/setup-sharepoint.ps1`.

## 3. Configure the library

Edit:

`src/features/document-upload/types.ts`

Set:

```ts
SHAREPOINT_LIBRARY_NAME
SHAREPOINT_SITE_URL
```

Verify the SharePoint INTERNAL names for all custom columns and update `SHAREPOINT_COLUMNS` if needed.

## 4. Upload rules

- Hard limit: 4 MB.
- One CreateFile request only.
- Raw binary Blob body.
- No chunking.
- No createUploadSession.
- No Power Automate fallback.
- No Graph upload.
- No secrets in source.

The public Code Apps connector API serializes connector request payloads, while SharePoint CreateFile requires binary content. The binary CreateFile call therefore uses the Power Apps runtime internal connector HTTP bridge. Metadata is updated through the same connector runtime.

## 5. Dataverse update

After SharePoint succeeds, the existing `CTSDocumentService` updates the Dataverse Documents record with:

- `documentURL`
- `sharePointFileID`
- `documentName`
- `fileSizeMB`
- `comments`

The Dataverse GUID is also stored in SharePoint's `Dataverse Document ID` column.

## 6. Add the component

```tsx
import DocumentUpload from "@/features/document-upload/DocumentUpload";

<DocumentUpload
  dataverseDocumentId={document.id}
  projectCode={projectCode}
  taskReference={taskReference}
/>
```

## 7. Build and deploy

```powershell
npm run typecheck
npm run build
pac code push
```

## 8. CSP

The browser should not call SharePoint directly. If the published app reports a CSP `connect-src` violation, configure the Code Apps CSP at the Power Platform environment level and allow only the connector/runtime origin reported by the browser. Do not replace the platform defaults or add arbitrary SharePoint origins.

## Important

The final ZIP cannot contain your environment-specific SharePoint connection ID, tenant URL, or library internal schema. Those values must be generated/configured by PAC CLI in the target environment. This is intentional and avoids embedding environment credentials or identifiers in the source package.
