param(
  [Parameter(Mandatory=$true)][string]$SharePointConnectionId,
  [Parameter(Mandatory=$true)][string]$LibraryName,
  [Parameter(Mandatory=$true)][string]$SiteUrl,
  [Parameter(Mandatory=$true)][string]$Office365UsersConnectionId
)
$ErrorActionPreference = "Stop"
pac code add-data-source -a "shared_sharepointonline" -c $SharePointConnectionId -t $LibraryName -d $SiteUrl
pac code add-data-source -a "shared_office365users" -c $Office365UsersConnectionId
Write-Host "Data sources added. Update SHAREPOINT_LIBRARY_NAME and SHAREPOINT_SITE_URL in src/features/document-upload/types.ts and verify SharePoint internal column names." -ForegroundColor Green
