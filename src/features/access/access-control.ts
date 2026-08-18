export type AccessRole =
  | "Admin"
  | "Project Manager"
  | "Lead"
  | "Employee"
  | "Approver";

export type AccessUser = {
  id: string;
  userLookupId: string;
  fullName: string;
  userLookupName: string;
  email: string;
  isActive: boolean;
  role: AccessRole;
};

export type AccessProject = {
  id: string;
  name: string;
  managerId: string;
  manager: string;
  managerEmail: string;
};

export type AccessTask = {
  id: string;
  name: string;
  project: string;
  projectId: string;
  assignedTo: string;
  assignedToId: string;
  assignedToEmail: string;
};

export type AccessDocument = {
  id: string;
  project: string;
  projectId: string;
  uploadedBy: string;
};

export type AccessScreen =
  | "Dashboard"
  | "Projects"
  | "Project Workspace"
  | "Tasks"
  | "My Tasks"
  | "Documents"
  | "Upload Document"
  | "Approval Center"
  | "Inactive Records"
  | "Access Management"
  | "Data Repair";

const roleScreenRules: Record<AccessRole, readonly AccessScreen[]> = {
  Admin: [
    "Dashboard",
    "Projects",
    "Project Workspace",
    "Tasks",
    "My Tasks",
    "Documents",
    "Upload Document",
    "Approval Center",
    "Inactive Records",
    "Access Management",
    "Data Repair",
  ],
  "Project Manager": [
    "Dashboard",
    "Projects",
    "Project Workspace",
    "Tasks",
    "My Tasks",
    "Documents",
    "Upload Document",
    "Approval Center",
  ],
  Lead: ["Dashboard", "Tasks", "My Tasks", "Documents", "Upload Document"],
  Employee: ["Dashboard", "My Tasks", "Documents", "Upload Document"],
  Approver: ["Dashboard", "Documents", "Approval Center"],
};

export const normalizeGuid = (value: string | undefined): string =>
  (value ?? "").trim().replace(/^\{/, "").replace(/\}$/, "").toLowerCase();

const normalizeIdentity = (value: string | undefined): string =>
  (value ?? "").trim().toLowerCase();

export const isSamePerson = (
  left: string | undefined,
  right: string | undefined,
): boolean =>
  Boolean(normalizeIdentity(left)) &&
  normalizeIdentity(left) === normalizeIdentity(right);

export const canViewScreen = (
  role: AccessRole | undefined,
  isActive: boolean,
  screen: AccessScreen,
): boolean => {
  if (!isActive || !role) return false;
  return roleScreenRules[role]?.includes(screen) ?? false;
};

export const getAccessibleScreens = (
  role: AccessRole | undefined,
  isActive: boolean,
): readonly AccessScreen[] => {
  if (!role || !isActive) return ["Dashboard"];
  return roleScreenRules[role] ?? ["Dashboard"];
};

export const isTaskAssignedToCurrentUser = (
  task: AccessTask,
  currentAccessUser: AccessUser | undefined,
): boolean => {
  if (!currentAccessUser?.isActive) return false;
  const currentIds = [currentAccessUser.id, currentAccessUser.userLookupId]
    .map(normalizeGuid)
    .filter(Boolean);
  const taskAssigneeId = normalizeGuid(task.assignedToId);
  if (currentIds.some((id: string) => id === taskAssigneeId)) return true;
  if (
    Boolean(task.assignedToEmail) &&
    isSamePerson(task.assignedToEmail, currentAccessUser.email)
  ) {
    return true;
  }
  return (
    isSamePerson(task.assignedTo, currentAccessUser.fullName) ||
    isSamePerson(task.assignedTo, currentAccessUser.userLookupName) ||
    isSamePerson(task.assignedTo, currentAccessUser.email)
  );
};

const isProjectAssignedToCurrentUser = (
  project: AccessProject,
  currentAccessUser: AccessUser | undefined,
): boolean => {
  if (!currentAccessUser?.isActive) return false;
  const currentIds = [currentAccessUser.id, currentAccessUser.userLookupId]
    .map(normalizeGuid)
    .filter(Boolean);
  if (currentIds.some((id: string) => id === normalizeGuid(project.managerId))) {
    return true;
  }
  if (
    Boolean(project.managerEmail) &&
    isSamePerson(project.managerEmail, currentAccessUser.email)
  ) {
    return true;
  }
  return (
    isSamePerson(project.manager, currentAccessUser.fullName) ||
    isSamePerson(project.manager, currentAccessUser.userLookupName) ||
    isSamePerson(project.manager, currentAccessUser.email)
  );
};

export const taskMatchesProject = (
  task: AccessTask,
  project: AccessProject,
): boolean => {
  const taskProjectId = normalizeGuid(task.projectId);
  const projectId = normalizeGuid(project.id);
  if (taskProjectId && projectId) return taskProjectId === projectId;
  return (
    Boolean(task.project?.trim()) &&
    task.project.trim().toLowerCase() === project.name.trim().toLowerCase()
  );
};

export const getRoleScopedProjects = (
  projects: AccessProject[],
  tasks: AccessTask[],
  currentAccessUser: AccessUser | undefined,
): AccessProject[] => {
  if (!currentAccessUser?.isActive) return [];
  if (currentAccessUser.role === "Admin") return projects;
  if (currentAccessUser.role === "Approver") return [];
  if (currentAccessUser.role === "Project Manager") {
    return projects.filter((project: AccessProject) =>
      isProjectAssignedToCurrentUser(project, currentAccessUser),
    );
  }
  const assignedProjectIds = new Set(
    tasks
      .filter((task: AccessTask) =>
        isTaskAssignedToCurrentUser(task, currentAccessUser),
      )
      .map((task: AccessTask) => normalizeGuid(task.projectId))
      .filter(Boolean),
  );
  const assignedProjectNames = new Set(
    tasks
      .filter((task: AccessTask) =>
        isTaskAssignedToCurrentUser(task, currentAccessUser),
      )
      .map((task: AccessTask) => task.project.trim().toLowerCase())
      .filter(Boolean),
  );
  return projects.filter(
    (project: AccessProject) =>
      assignedProjectIds.has(normalizeGuid(project.id)) ||
      assignedProjectNames.has(project.name.trim().toLowerCase()),
  );
};

export const getRoleScopedTasks = (
  tasks: AccessTask[],
  scopedProjects: AccessProject[],
  currentAccessUser: AccessUser | undefined,
): AccessTask[] => {
  if (!currentAccessUser?.isActive) return [];
  if (currentAccessUser.role === "Approver") return [];
  if (currentAccessUser.role === "Admin" || currentAccessUser.role === "Project Manager") {
    return tasks.filter((task: AccessTask) =>
      scopedProjects.some((project: AccessProject) =>
        taskMatchesProject(task, project),
      ),
    );
  }
  return tasks.filter((task: AccessTask) =>
    isTaskAssignedToCurrentUser(task, currentAccessUser),
  );
};

export const getRoleScopedDocuments = (
  documents: AccessDocument[],
  scopedProjects: AccessProject[],
  currentAccessUser: AccessUser | undefined,
): AccessDocument[] => {
  if (!currentAccessUser?.isActive) return [];
  if (currentAccessUser.role === "Admin" || currentAccessUser.role === "Approver") {
    return documents;
  }
  if (currentAccessUser.role === "Project Manager") {
    return documents.filter((doc: AccessDocument) =>
      scopedProjects.some(
        (project: AccessProject) =>
          normalizeGuid(doc.projectId) === normalizeGuid(project.id) ||
          doc.project.trim().toLowerCase() === project.name.trim().toLowerCase(),
      ),
    );
  }
  return documents.filter((doc: AccessDocument) =>
    isSamePerson(doc.uploadedBy, currentAccessUser.fullName),
  );
};
