import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { useSystemUserList } from '@/generated/hooks/use-system-user';
import type { SystemUser } from '@/generated/models/system-user-model';
import { useUser } from '@/hooks/use-user';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';

export type CurrentUserPermissions = {
  createProjects: boolean;
  assignTasks: boolean;
  uploadDocuments: boolean;
  reviewApprovals: boolean;
};

type CurrentUserRoleContextValue = {
  role: string | undefined;
  permissions: CurrentUserPermissions;
  isActive: boolean;
  isLoading: boolean;
  isProvisioned: boolean;
  email: string | undefined;
  fullName: string | undefined;
  systemUser: SystemUser | undefined;
};

const defaultPermissions: CurrentUserPermissions = {
  createProjects: false,
  assignTasks: false,
  uploadDocuments: false,
  reviewApprovals: false,
};
const standalonePermissions: CurrentUserPermissions = {
  createProjects: true,
  assignTasks: true,
  uploadDocuments: true,
  reviewApprovals: true,
};

const CurrentUserRoleContext = createContext<CurrentUserRoleContextValue | undefined>(undefined);

const normalizeIdentity = (value: string | undefined): string => (value ?? '').trim().toLowerCase();

// The System User Dataverse table has no permission columns; permissions are derived from Role.
const getPermissionsFromSystemUser = (record: SystemUser | undefined): CurrentUserPermissions => {
  if (!record) return defaultPermissions;
  const roleValue = (record.roleKey as string | undefined) ?? '';
  switch (roleValue) {
    case 'Admin':
      return { createProjects: true, assignTasks: true, uploadDocuments: true, reviewApprovals: true };
    case 'ProjectManager':
      return { createProjects: true, assignTasks: true, uploadDocuments: true, reviewApprovals: false };
    case 'Lead':
      return { createProjects: false, assignTasks: false, uploadDocuments: true, reviewApprovals: false };
    case 'Approver':
      return { createProjects: false, assignTasks: false, uploadDocuments: false, reviewApprovals: true };
    case 'Employee':
      return { createProjects: false, assignTasks: false, uploadDocuments: true, reviewApprovals: false };
    default:
      return defaultPermissions;
  }
};

const getRoleLabel = (record: SystemUser | undefined): string | undefined => {
  if (!record) return undefined;
  const roleValue = (record.roleKey as string | undefined) ?? '';
  if (roleValue === 'ProjectManager') return 'Project Manager';
  if (roleValue === 'Lead') return 'Lead';
  return roleValue || undefined;
};

const getAccessBlockedMessage = (isProvisioned: boolean, isActive: boolean): string => {
  if (!isProvisioned) return 'Account not provisioned.';
  if (!isActive) return 'Account inactive, contact Admin.';
  return '';
};

function AccessBlockedScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <Card className="w-full max-w-lg border shadow-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 rounded-lg bg-accent p-3 text-accent-foreground">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <CardTitle>Access blocked</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          {message}
        </CardContent>
      </Card>
    </div>
  );
}

export function CurrentUserRoleProvider({ children }: { children: ReactNode }) {
  const isStandaloneRuntime =
    typeof window !== 'undefined' && window.self === window.top;
  const currentUserQuery = useUser();
  const systemUserQuery = useSystemUserList(undefined, {
    enabled: !isStandaloneRuntime,
  });
  const email = currentUserQuery.data?.userPrincipalName;
  const fullName = currentUserQuery.data?.fullName;

  const systemUser = useMemo(() => {
    const normalizedEmail = normalizeIdentity(email);
    const normalizedFullName = normalizeIdentity(fullName);
    return (systemUserQuery.data ?? []).find((record: SystemUser) => {
      const recordEmail = normalizeIdentity(record.email);
      const recordName = normalizeIdentity(record.fullName);
      if (Boolean(normalizedEmail) && recordEmail === normalizedEmail) return true;
      return Boolean(normalizedFullName) && recordName === normalizedFullName;
    });
  }, [email, fullName, systemUserQuery.data]);

  const value = useMemo<CurrentUserRoleContextValue>(() => {
    if (isStandaloneRuntime) {
      return {
        role: 'Admin',
        permissions: standalonePermissions,
        isActive: true,
        isLoading: currentUserQuery.isLoading,
        isProvisioned: true,
        email,
        fullName,
        systemUser: undefined,
      };
    }

    return {
      role: getRoleLabel(systemUser),
      permissions: getPermissionsFromSystemUser(systemUser),
      isActive: systemUser?.isActive === true,
      isLoading: currentUserQuery.isLoading || systemUserQuery.isLoading,
      isProvisioned: Boolean(systemUser),
      email,
      fullName,
      systemUser,
    };
  }, [
    currentUserQuery.isLoading,
    email,
    fullName,
    isStandaloneRuntime,
    systemUser,
    systemUserQuery.isLoading,
  ]);

  if (value.isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-foreground">Loading access...</div>;
  }

  if (!value.isProvisioned || !value.isActive) {
    return <AccessBlockedScreen message={getAccessBlockedMessage(value.isProvisioned, value.isActive)} />;
  }

  return <CurrentUserRoleContext.Provider value={value}>{children}</CurrentUserRoleContext.Provider>;
}

export function useCurrentUserRole() {
  const context = useContext(CurrentUserRoleContext);
  if (!context) throw new Error('useCurrentUserRole must be used within CurrentUserRoleProvider');
  return context;
}
