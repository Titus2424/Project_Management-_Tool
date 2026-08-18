import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import { Archive, Bell, BriefcaseBusiness, Building2, CalendarDays, CalendarIcon, Check, CheckCircle2, ChevronsUpDown, ClipboardList, Edit, Eye, FileText, KeyRound, Plus, RotateCcw, Search, Send, ShieldCheck, Trash2, Upload, UserPlus, Users, X } from 'lucide-react';
import { toast } from 'sonner';

import { InMemoryDataBanner } from '@/generated/components/in-memory-data-banner';
import { HAS_IN_MEMORY_TABLES } from '@/generated/hooks';
import { useCreateCTSProject, useCTSProjectList, useUpdateCTSProject } from '@/generated/hooks/use-ctsproject';
import { useCreateCTSTask, useCTSTaskList, useUpdateCTSTask } from '@/generated/hooks/use-ctstask';
import { useCreateCTSDocument, useCTSDocumentList, useUpdateCTSDocument } from '@/generated/hooks/use-ctsdocument';
import { useCreateSystemUser, useSystemUserList, useUpdateSystemUser } from '@/generated/hooks/use-system-user';
import { useCreateCTSDocumentApproval, useCTSDocumentApprovalList, useUpdateCTSDocumentApproval } from '@/generated/hooks/use-ctsdocument-approval';
import { useUserList } from '@/generated/hooks/use-user';
import type { CTSProject, CTSProjectStatusKey } from '@/generated/models/cts-project-model';
import type { CTSTask, CTSTaskPriorityKey, CTSTaskStatusKey } from '@/generated/models/cts-task-model';
import type { SystemUser, SystemUserRoleKey } from '@/generated/models/system-user-model';
import type { User } from '@/generated/models/user-model';
import type { CTSDocument, CTSDocumentStatusKey } from '@/generated/models/cts-document-model';
import type { CTSDocumentApproval } from '@/generated/models/cts-document-approval-model';
import { useUser } from '@/hooks/use-user';
import { useCurrentUserRole } from '@/contexts/current-user-role-context';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';

const navItems = ['Dashboard', 'Projects', 'Project Workspace', 'Tasks', 'My Tasks', 'Documents', 'Upload Document', 'Approval Center', 'Inactive Records', 'Access Management'] as const;
type Screen = (typeof navItems)[number];
type Status = 'Planning' | 'Active' | 'On Hold' | 'Completed' | 'Cancelled' | 'Archived' | 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Revision Required' | 'Not Started' | 'In Progress' | 'Pending';
type Priority = 'Low' | 'Medium' | 'High' | 'Critical';
type IsActiveValue = 'Active' | 'Inactive';
type Role = 'Admin' | 'Project Manager' | 'Employee' | 'Approver';
type Project = { id: string; name: string; code?: string; manager: string; managerId: string; status: Status; progress: number; location: string; start: string; end: string; description: string; isActive: boolean };
type Task = { id: string; name: string; taskCode: string; project: string; projectId: string; assignedTo: string; assignedToId: string; assignedToEmail: string; dueDate: string; status: Status; priority: Priority; description: string; isActive: boolean };
type Doc = { id: string; name: string; documentCode: string; version: string; project: string; projectId: string; task: string; taskId: string; uploadedBy: string; date: string; status: Status; size: string; url: string; comments: string; isActive: boolean };
type ManagedUser = { id: string; fullName: string; email: string; isActive: boolean; role: Role; userLookupName: string; userLookupId: string };
type Approval = { id: string; name: string; documentId: string; documentName: string; approver: string; decision: Status; decisionDate: string; comments: string; isActive: boolean };
type DataverseUserOption = { id: string; fullName: string; email?: string; lookup: { id: string; fullName: string } };
type SystemUserPermissionFields = {
  createProjects?: boolean;
  assignTasks?: boolean;
  uploadDocuments?: boolean;
  reviewApprovals?: boolean;
  dmeo_createprojects?: boolean;
  dmeo_assigntasks?: boolean;
  dmeo_uploaddocuments?: boolean;
  dmeo_reviewapprovals?: boolean;
};
type FormMode = 'create' | 'edit';
type DialogState = { type: 'project'; mode: FormMode; item?: Project } | { type: 'task'; mode: FormMode; item?: Task } | { type: 'document'; mode: FormMode; item?: Doc } | null;
type DeleteTarget = { type: 'project' | 'task' | 'document'; id: string; name: string } | null;
type ProjectDeleteDependencies = { relatedTasks: Task[]; relatedDocuments: Doc[]; relatedApprovals: Approval[] };

const initialProjects: Project[] = [];
const initialTasks: Task[] = [];
const initialDocuments: Doc[] = [];

const getEmployeeOptions = (users: ManagedUser[]): ManagedUser[] => users.filter((user: ManagedUser) => user.isActive && user.fullName && (user.role === 'Employee' || user.role === 'Project Manager' || user.role === 'Admin'));
const getProjectManagerOptions = (users: ManagedUser[]): ManagedUser[] => users.filter((user: ManagedUser) => user.isActive && (user.role === 'Project Manager' || user.role === 'Admin') && user.fullName);
const projectStatuses: Status[] = ['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled', 'Archived'];
const roles: Role[] = ['Admin', 'Project Manager', 'Employee', 'Approver'];
const isActiveOptions: IsActiveValue[] = ['Active', 'Inactive'];
const permissionOptions = ['Create projects', 'Assign tasks', 'Upload documents', 'Review approvals', 'Manage users'];

const taskStatuses: Status[] = ['Not Started', 'In Progress', 'Submitted', 'Approved', 'Completed', 'Archived'];
const documentStatuses: Status[] = ['Draft', 'Submitted', 'Approved', 'Rejected', 'Revision Required', 'Archived'];
const priorities: Priority[] = ['Low', 'Medium', 'High', 'Critical'];

const statusLabels: Record<string, Status> = { OnHold: 'On Hold', NotStarted: 'Not Started', InProgress: 'In Progress', RevisionRequired: 'Revision Required' };
const statusFromKey = (key: string | undefined, fallback: Status): Status => key ? statusLabels[key] ?? key as Status : fallback;
const userLookup = (fullName: string) => ({ id: fullName.toLowerCase().replaceAll(' ', '-'), fullName });
const projectLookup = (projectName: string, projectId: string | undefined, projects: Project[]) => {
  const linkedProject = projects.find((project: Project) => project.id === projectId) ?? projects.find((project: Project) => project.name === projectName);
  if (!linkedProject) return undefined;
  return { id: linkedProject.id, projectName: linkedProject.name };
};
const taskLookup = (taskName: string, taskId: string | undefined, tasks: Task[]) => {
  const linkedTask = tasks.find((task: Task) => task.id === taskId) ?? tasks.find((task: Task) => task.name === taskName);
  if (!linkedTask) return undefined;
  return { id: linkedTask.id, taskName: linkedTask.name };
};
const projectStatusKey = (status: Status): CTSProjectStatusKey => status === 'On Hold' ? 'OnHold' : status as CTSProjectStatusKey;
const taskStatusKey = (status: Status): CTSTaskStatusKey => status === 'Not Started' ? 'NotStarted' : status === 'In Progress' ? 'InProgress' : status as CTSTaskStatusKey;
const documentStatusKey = (status: Status): CTSDocumentStatusKey => status === 'Revision Required' ? 'RevisionRequired' : status as CTSDocumentStatusKey;
const activeRecordQueryOptions = { filter: "statusKey ne 'Archived'" } as const;
const isArchivedStatus = (status: Status): boolean => status === 'Archived';
const filterActiveProjects = (rows: Project[]): Project[] => rows.filter((project: Project) => !isArchivedStatus(project.status));
const filterActiveTasks = (rows: Task[]): Task[] => rows.filter((task: Task) => !isArchivedStatus(task.status));
const filterActiveDocuments = (rows: Doc[]): Doc[] => rows.filter((doc: Doc) => !isArchivedStatus(doc.status));
const filterActiveApprovals = (rows: Approval[]): Approval[] => rows;
const archivedProjectFields = { statusKey: 'Archived' as CTSProjectStatusKey };
const archivedTaskFields = { statusKey: 'Archived' as CTSTaskStatusKey };
const archivedDocumentFields = { statusKey: 'Archived' as CTSDocumentStatusKey };
const toCTSProject = (project: Project): Omit<CTSProject, 'id'> => ({ projectName: project.name, projectCode: project.code ?? '', description: project.description, projectManager: { id: project.managerId || project.manager.toLowerCase().replaceAll(' ', '-'), fullName: project.manager }, statusKey: projectStatusKey(project.status), progress: project.progress, location: project.location, startDate: project.start, endDate: project.end });
const toCreateCTSProject = (project: Project): Omit<CTSProject, 'id'> => ({ projectName: project.name, projectCode: '', description: project.description, projectManager: { id: project.managerId || project.manager.toLowerCase().replaceAll(' ', '-'), fullName: project.manager }, statusKey: projectStatusKey(project.status), progress: project.progress, location: project.location, startDate: project.start, endDate: project.end });
const toCTSTask = (task: Task, projects: Project[]): Omit<CTSTask, 'id'> => {
  const linkedProject = projectLookup(task.project, task.projectId, projects);
  if (!linkedProject) throw new Error('Task must be linked to a valid project before saving.');
  return { taskName: task.name, project: linkedProject, assignedTo: { id: task.assignedToId || task.assignedTo.toLowerCase().replaceAll(' ', '-'), fullName: task.assignedTo }, dueDate: task.dueDate, statusKey: taskStatusKey(task.status), priorityKey: task.priority as CTSTaskPriorityKey, taskDescription: task.description };
};
const toCTSTaskStatusUpdate = (task: Task, status: Status): Partial<Omit<CTSTask, 'id'>> => ({ statusKey: taskStatusKey(status) });
const fromCTSProject = (project: CTSProject): Project => { const status = statusFromKey(project.statusKey, 'Planning'); return { id: project.id, name: project.projectName, code: project.projectCode, manager: project.projectManager?.fullName ?? '', managerId: project.projectManager?.id ?? '', status, progress: project.progress ?? 0, location: project.location ?? '', start: project.startDate ?? '', end: project.endDate ?? '', description: project.description ?? '', isActive: !isArchivedStatus(status) }; };
const fromCTSTask = (task: CTSTask, projects: Project[]): Task => {
  const mappedStatus = statusFromKey(task.statusKey, 'Not Started');
  const status = taskStatuses.includes(mappedStatus) ? mappedStatus : 'Not Started';
  const projectById = projects.find((project: Project) => project.id === task.project?.id);
  return { id: task.id, name: task.taskName, taskCode: task.id, project: task.project?.projectName ?? projectById?.name ?? 'General', projectId: task.project?.id ?? projectById?.id ?? '', assignedTo: task.assignedTo?.fullName ?? 'Unassigned', assignedToId: task.assignedTo?.id ?? '', assignedToEmail: '', dueDate: task.dueDate ?? '', status, priority: task.priorityKey ?? 'Medium', description: task.taskDescription ?? '', isActive: !isArchivedStatus(status) };
};
const toCTSDocument = (doc: Doc, projects: Project[], tasks: Task[]): Omit<CTSDocument, 'id'> => {
  const linkedProject = projectLookup(doc.project, doc.projectId, projects);
  const linkedTask = taskLookup(doc.task, doc.taskId, tasks);
  if (!linkedProject) throw new Error('Document must be linked to a valid project before saving.');
  if (!linkedTask) throw new Error('Document must be linked to a valid task before saving.');
  return { documentName: doc.name, versionNumber: doc.version, project: linkedProject, task: linkedTask, uploadedBy: userLookup(doc.uploadedBy), uploadedDate: doc.date, statusKey: documentStatusKey(doc.status), fileSizeMB: Number(doc.size) || 0, documentURL: doc.url, comments: doc.comments, sharePointFileID: doc.documentCode || doc.id };
};
const fromCTSDocument = (doc: CTSDocument, projects: Project[], tasks: Task[]): Doc => { const status = statusFromKey(doc.statusKey, 'Draft'); const projectById = projects.find((project: Project) => project.id === doc.project?.id); const taskById = tasks.find((task: Task) => task.id === doc.task?.id); return { id: doc.id, name: doc.documentName, documentCode: doc.sharePointFileID, version: doc.versionNumber ?? 'V1.0', project: doc.project?.projectName ?? projectById?.name ?? 'General', projectId: doc.project?.id ?? projectById?.id ?? '', task: doc.task?.taskName ?? taskById?.name ?? 'General', taskId: doc.task?.id ?? taskById?.id ?? '', uploadedBy: doc.uploadedBy?.fullName ?? 'Unassigned', date: doc.uploadedDate ?? '', status, size: String(doc.fileSizeMB ?? 0), url: doc.documentURL ?? 'https://example.com/documents/document', comments: doc.comments ?? '', isActive: !isArchivedStatus(status) }; };
const fromCTSDocumentApproval = (approval: CTSDocumentApproval): Approval => ({ id: approval.id, name: approval.approvalName, documentId: approval.document?.id ?? '', documentName: approval.document?.documentName ?? 'Unlinked document', approver: approval.approver?.fullName ?? 'Unassigned', decision: statusFromKey(approval.decisionKey, 'Pending'), decisionDate: approval.decisionDate ?? '', comments: approval.comments ?? '', isActive: true });

const getDataverseUserName = (user: DataverseUserOption): string => user.fullName || 'Unnamed User';
const getDataverseUserEmail = (user: DataverseUserOption): string => user.email ?? '';
const getDataverseUserId = (user: DataverseUserOption): string => user.id;
const roleKeyToRole = (key: SystemUserRoleKey | undefined): Role => {
  const value = key as string | undefined;
  return value === 'ProjectManager' ? 'Project Manager' : value === 'Approver' ? 'Approver' : value === 'Admin' || value === 'Employee' ? value : 'Employee';
};
const roleToRoleKey = (value: Role): SystemUserRoleKey => value === 'Project Manager' ? 'ProjectManager' : value as SystemUserRoleKey;
const fromSystemUser = (user: SystemUser): ManagedUser => ({ id: user.id, fullName: user.fullName, email: user.email ?? '', isActive: user.isActive ?? false, role: roleKeyToRole(user.roleKey), userLookupName: user.user?.fullName ?? 'Unlinked', userLookupId: user.user?.id ?? '' });
const toSystemUser = (user: ManagedUser, selectedDataverseUser: DataverseUserOption): Omit<SystemUser, 'id'> => ({ fullName: user.fullName, email: user.email || undefined, isActive: user.isActive, roleKey: roleToRoleKey(user.role), user: selectedDataverseUser.lookup });
const normalize = (value: unknown): string => (value || '').toString().trim().toLowerCase();
const isActiveAdmin = (currentAccessUser: ManagedUser | undefined): boolean => Boolean(currentAccessUser?.isActive) && normalize(currentAccessUser?.role) === 'admin';
const isProjectAssignedToCurrentUser = (project: Project, currentAccessUser: ManagedUser | undefined): boolean => {
  if (!currentAccessUser?.isActive) return false;
  const currentIds = [currentAccessUser.id, currentAccessUser.userLookupId].map(normalizeGuid).filter(Boolean);
  if (currentIds.some((id: string) => id === normalizeGuid(project.managerId))) return true;
  return isSamePerson(project.manager, currentAccessUser.fullName) || isSamePerson(project.manager, currentAccessUser.userLookupName) || isSamePerson(project.manager, currentAccessUser.email);
};
const isProjectVisibleToCurrentUser = (project: Project, currentAccessUser: ManagedUser | undefined): boolean => {
  if (!currentAccessUser?.isActive) return false;
  return normalize(currentAccessUser.role) === 'admin' || normalize(currentAccessUser.role) === 'approver' || isProjectAssignedToCurrentUser(project, currentAccessUser);
};
const normalizeGuid = (value: string | undefined): string => (value ?? '').trim().replace(/^\{/, '').replace(/\}$/, '').toLowerCase();
const normalizeIdentity = (value: string | undefined): string => (value ?? '').trim().toLowerCase();
const isSamePerson = (left: string | undefined, right: string | undefined): boolean => Boolean(normalizeIdentity(left)) && normalizeIdentity(left) === normalizeIdentity(right);
const taskMatchesProject = (task: Task, project: Project): boolean => {
  const taskProjectId = normalizeGuid(task.projectId);
  const projectId = normalizeGuid(project.id);
  if (taskProjectId && projectId) return taskProjectId === projectId;
  return Boolean(normalize(task.project)) && normalize(task.project) === normalize(project.name);
};

const resolveTaskAssignees = (tasks: Task[], users: ManagedUser[]): Task[] => tasks.map((task: Task) => {
  if (!task.assignedToId && !task.assignedTo) return task;
  const assigneeId = normalizeGuid(task.assignedToId);
  const assignee = users.find((user: ManagedUser) => normalizeGuid(user.id) === assigneeId) ?? users.find((user: ManagedUser) => normalizeGuid(user.userLookupId) === assigneeId) ?? users.find((user: ManagedUser) => isSamePerson(user.fullName, task.assignedTo) || isSamePerson(user.userLookupName, task.assignedTo) || isSamePerson(user.email, task.assignedTo));
  return assignee ? { ...task, assignedTo: assignee.fullName, assignedToId: assignee.id, assignedToEmail: normalizeIdentity(assignee.email) } : task;
});
const screenToRoute = (screen: Screen): string => screen.toLowerCase().replaceAll(' ', '-');
const routeToScreen = (route: string): Screen | undefined => navItems.find((item: Screen) => screenToRoute(item) === route.replace(/^#\/?/, '').replace(/^\/?/, ''));
const roleScreenRules: Record<string, readonly Screen[]> = {
  Admin: navItems,
  'Project Manager': ['Dashboard', 'Projects', 'Project Workspace', 'Tasks', 'My Tasks', 'Documents', 'Upload Document', 'Approval Center'],
  Employee: ['Dashboard', 'My Tasks', 'Documents', 'Upload Document'],
  Approver: ['Dashboard', 'Documents', 'Approval Center'],
};
const getAccessibleScreens = (role: string | undefined, isActive: boolean): readonly Screen[] => isActive && role ? roleScreenRules[role] ?? ['Dashboard'] : ['Dashboard'];
const getRoleScopedProjects = (projects: Project[], tasks: Task[], currentAccessUser: ManagedUser | undefined): Project[] => {
  if (!currentAccessUser?.isActive) return [];
  if (currentAccessUser.role === 'Admin' || currentAccessUser.role === 'Approver') return projects;
  if (currentAccessUser.role === 'Project Manager') return projects.filter((project: Project) => isProjectVisibleToCurrentUser(project, currentAccessUser));
  const assignedProjectIds = new Set(tasks.filter((task: Task) => isTaskAssignedToCurrentUser(task, currentAccessUser)).map((task: Task) => normalizeGuid(task.projectId)).filter(Boolean));
  const assignedProjectNames = new Set(tasks.filter((task: Task) => isTaskAssignedToCurrentUser(task, currentAccessUser)).map((task: Task) => normalize(task.project)).filter(Boolean));
  return projects.filter((project: Project) => assignedProjectIds.has(normalizeGuid(project.id)) || assignedProjectNames.has(normalize(project.name)));
};
const isTaskInScopedProjects = (task: Task, scopedProjects: Project[]): boolean => scopedProjects.some((project: Project) => normalizeGuid(task.projectId) === normalizeGuid(project.id) || normalize(task.project) === normalize(project.name));
const isDocumentInScopedProjects = (doc: Doc, scopedProjects: Project[]): boolean => scopedProjects.some((project: Project) => normalizeGuid(doc.projectId) === normalizeGuid(project.id) || normalize(doc.project) === normalize(project.name));
const getRoleScopedTasks = (tasks: Task[], scopedProjects: Project[], currentAccessUser: ManagedUser | undefined): Task[] => {
  if (!currentAccessUser) return [];
  if (currentAccessUser.role === 'Admin') return tasks;
  if (currentAccessUser.role === 'Project Manager') return tasks.filter((task: Task) => isTaskInScopedProjects(task, scopedProjects));
  if (currentAccessUser.role === 'Approver') return tasks.filter((task: Task) => isTaskInScopedProjects(task, scopedProjects));
  return tasks.filter((task: Task) => isTaskAssignedToCurrentUser(task, currentAccessUser));
};
const getRoleScopedDocuments = (documents: Doc[], scopedProjects: Project[], currentAccessUser: ManagedUser | undefined): Doc[] => {
  if (!currentAccessUser) return [];
  if (currentAccessUser.role === 'Admin' || currentAccessUser.role === 'Approver') return documents;
  return documents.filter((doc: Doc) => isDocumentInScopedProjects(doc, scopedProjects));
};
const isTaskAssignedToCurrentUser = (task: Task, currentAccessUser: ManagedUser | undefined): boolean => {
  if (!currentAccessUser) return false;
  const currentIds = [currentAccessUser.id, currentAccessUser.userLookupId].map(normalizeGuid).filter(Boolean);
  const taskAssigneeId = normalizeGuid(task.assignedToId);
  if (currentIds.some((id: string) => id === taskAssigneeId)) return true;
  if (Boolean(task.assignedToEmail) && isSamePerson(task.assignedToEmail, currentAccessUser.email)) return true;
  return isSamePerson(task.assignedTo, currentAccessUser.fullName) || isSamePerson(task.assignedTo, currentAccessUser.userLookupName) || isSamePerson(task.assignedTo, currentAccessUser.email);
};
const sortTasksByDueDateAscending = (tasks: Task[]): Task[] => [...tasks].sort((left: Task, right: Task) => new Date(left.dueDate || '9999-12-31').getTime() - new Date(right.dueDate || '9999-12-31').getTime());
const isOverdueTask = (task: Task): boolean => Boolean(task.dueDate) && new Date(task.dueDate).getTime() < new Date(new Date().toDateString()).getTime() && task.status !== 'Completed';
const hasSubmittedDocumentForTask = (task: Task, documents: Doc[]): boolean => documents.some((doc: Doc) => (doc.taskId === task.id || doc.task === task.name || doc.task === task.id) && doc.status !== 'Draft');
const getPriorityBadgeVariant = (priority: Priority): 'default' | 'secondary' | 'destructive' | 'outline' => priority === 'Critical' ? 'destructive' : priority === 'High' ? 'default' : priority === 'Medium' ? 'secondary' : 'outline';
const sortByUploadedDateAscending = (documents: Doc[]): Doc[] => [...documents].sort((left: Doc, right: Doc) => new Date(left.date).getTime() - new Date(right.date).getTime());
function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm font-medium text-destructive">{message}</p> : null;
}
function StatusBadge({ status }: { status: Status }) {
  const variant = status === 'Rejected' || status === 'Revision Required' || status === 'Cancelled' ? 'destructive' : status === 'Active' || status === 'Approved' || status === 'Completed' ? 'default' : 'secondary';
  return <Badge variant={variant}>{status}</Badge>;
}
function KpiCard({ title, value, icon }: { title: string; value: string; icon: ReactNode }) {
  return <Card className="shadow-sm"><CardContent className="flex items-center gap-4 p-5"><div className="rounded-lg bg-accent p-3 text-accent-foreground">{icon}</div><div><p className="text-sm text-muted-foreground">{title}</p><p className="text-3xl font-semibold">{value}</p></div></CardContent></Card>;
}
function AppHeader({ screen, setScreen, availableScreens, userName, userRole }: { screen: Screen; setScreen: (screen: Screen) => void; availableScreens: readonly Screen[]; userName: string | undefined; userRole: Role | undefined }) {
  const navigateToScreen = (item: Screen) => {
    window.history.replaceState(null, '', `#/${screenToRoute(item)}`);
    setScreen(item);
  };
  return <header className="bg-sidebar text-sidebar-foreground shadow-sm"><div className="flex items-center justify-between px-6 py-3"><div className="flex items-center gap-3"><Building2 className="h-7 w-7" /><div><p className="font-semibold">MNSC</p><p className="text-xs">Construction Project Management System</p></div></div><div className="flex items-center gap-3 rounded-md bg-sidebar-accent px-3 py-2 text-sm text-sidebar-accent-foreground"><Users className="h-4 w-4" /><span className="font-medium">{userName || 'Current user'}</span>{userRole && <Badge variant="secondary" className="bg-sidebar-primary text-sidebar-primary-foreground">{userRole}</Badge>}</div></div><nav className="flex gap-1 overflow-x-auto border-t border-sidebar-border px-6 py-2">{availableScreens.map((item: Screen) => <button key={item} className={`rounded-md px-3 py-2 text-sm ${screen === item ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`} onClick={() => navigateToScreen(item)}>{item}</button>)}</nav></header>;
}
function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <div className="relative w-full max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input value={value} onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value)} placeholder={placeholder} className="pl-9" /></div>;
}
function ProjectProgress({ value }: { value: number }) {
  return <div className="flex items-center gap-3"><Progress value={value} className="h-2" /><span className="w-10 text-sm font-medium">{value}%</span></div>;
}
function ProjectsTable({ rows, tasks, documents, role, currentAccessUser, onOpenWorkspace, onEdit, onDelete, onReactivate }: { rows: Project[]; tasks: Task[]; documents: Doc[]; role: Role | undefined; currentAccessUser: ManagedUser | undefined; onOpenWorkspace: (project: Project) => void; onEdit: (project: Project) => void; onDelete: (project: Project) => void; onReactivate: (project: Project) => void }) {
  return <Table><TableHeader><TableRow><TableHead>Project ID</TableHead><TableHead>Project Name</TableHead><TableHead>Project Manager</TableHead><TableHead>Location</TableHead><TableHead>Status</TableHead><TableHead>Progress</TableHead><TableHead>Start Date</TableHead><TableHead>End Date</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{rows.map((project: Project) => { const canEdit = project.isActive && (role === 'Admin' || (role === 'Project Manager' && isProjectAssignedToCurrentUser(project, currentAccessUser))); return <TableRow key={project.id} className={!project.isActive ? 'bg-muted text-muted-foreground' : ''}><TableCell className="font-medium">{project.code || 'Pending'}</TableCell><TableCell className="font-medium"><div className="flex items-center gap-2"><span>{project.name}</span>{!project.isActive && <Badge variant="secondary">Inactive</Badge>}</div></TableCell><TableCell>{project.manager || 'Unassigned'}</TableCell><TableCell>{project.location || '—'}</TableCell><TableCell><StatusBadge status={project.status} /></TableCell><TableCell><ProjectProgress value={project.progress} /></TableCell><TableCell>{project.start || '—'}</TableCell><TableCell>{project.end || '—'}</TableCell><TableCell className="text-right"><div className="flex justify-end gap-1"><Button variant="outline" size="sm" onClick={() => onOpenWorkspace(project)}><BriefcaseBusiness className="h-4 w-4" /> Workspace</Button>{!project.isActive && role === 'Admin' ? <Button variant="outline" size="sm" onClick={() => onReactivate(project)}><RotateCcw className="h-4 w-4" /> Reactivate</Button> : <>{canEdit ? <Button variant="ghost" size="icon-sm" onClick={() => onEdit(project)}><Edit className="h-4 w-4" /></Button> : role === 'Project Manager' ? <Tooltip><TooltipTrigger asChild><span><Button variant="ghost" size="icon-sm" disabled><Edit className="h-4 w-4" /></Button></span></TooltipTrigger><TooltipContent>You can only edit projects assigned to you.</TooltipContent></Tooltip> : null}{role === 'Admin' && <Button variant="ghost" size="icon-sm" onClick={() => onDelete(project)} aria-label="Deactivate project"><Archive className="h-4 w-4" /></Button>}</>}</div></TableCell></TableRow>; })}</TableBody></Table>;
}
function DocumentsTable({ rows, onEdit, onDelete }: { rows: Doc[]; onEdit: (doc: Doc) => void; onDelete: (doc: Doc) => void }) {
  return <Table><TableHeader><TableRow><TableHead>Document ID</TableHead><TableHead>Document Name</TableHead><TableHead>Version</TableHead><TableHead>Project</TableHead><TableHead>Task</TableHead><TableHead>Uploaded By</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{rows.map((doc: Doc) => <TableRow key={doc.id}><TableCell className="font-medium">{doc.documentCode}</TableCell><TableCell className="font-medium">{doc.name}</TableCell><TableCell>{doc.version}</TableCell><TableCell>{doc.project}</TableCell><TableCell>{doc.task}</TableCell><TableCell>{doc.uploadedBy}</TableCell><TableCell>{doc.date}</TableCell><TableCell><StatusBadge status={doc.status} /></TableCell><TableCell className="text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon-sm" onClick={() => toast.info(`Opening ${doc.name}`)}><Eye className="h-4 w-4" /></Button><Button variant="ghost" size="icon-sm" onClick={() => onEdit(doc)}><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon-sm" onClick={() => onDelete(doc)}><Trash2 className="h-4 w-4" /></Button></div></TableCell></TableRow>)}</TableBody></Table>;
}
function GlobalProjectWorkspacePicker({ projects, role, selectedProjectId, onOpenProject }: { projects: Project[]; role: Role | undefined; selectedProjectId: string; onOpenProject: (project: Project) => void }) {
  const [open, setOpen] = useState(false);
  if (role !== 'Admin' && role !== 'Project Manager') return null;
  const selectedProject = projects.find((project: Project) => project.id === selectedProjectId) ?? projects[0];
  if (!selectedProject) return <Card className="border-dashed"><CardContent className="flex flex-wrap items-center justify-between gap-4 p-4"><div><p className="font-medium">Project Workspace</p><p className="text-sm text-muted-foreground">No accessible projects are available for your role.</p></div></CardContent></Card>;
  const chooseProject = (project: Project) => {
    setOpen(false);
    onOpenProject(project);
  };
  return <Card className="sticky top-0 z-20 border-primary shadow-sm"><CardContent className="flex flex-wrap items-center justify-between gap-4 p-4"><div className="min-w-0"><p className="font-medium">Project Workspace selector</p><p className="text-sm text-muted-foreground">{projects.length} {projects.length === 1 ? 'project' : 'projects'} in your role scope</p></div><div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-96"><Label className="text-sm">Current workspace project</Label><Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between gap-3"><span className="min-w-0 truncate text-left"><span className="font-medium">{selectedProject.code || 'Pending'}</span> · {selectedProject.name}</span><ChevronsUpDown className="h-4 w-4 shrink-0" /></Button></PopoverTrigger><PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command><CommandInput placeholder="Search by project name, ID, manager, or location..." /><CommandList><CommandEmpty>No project found.</CommandEmpty><CommandGroup>{projects.filter((project: Project) => project.id).map((project: Project) => <CommandItem key={project.id} value={`${project.name} ${project.code} ${project.manager} ${project.location} ${project.status}`} onSelect={() => chooseProject(project)}><Check className={`h-4 w-4 ${selectedProject.id === project.id ? 'opacity-100' : 'opacity-0'}`} /><div className="min-w-0"><p className="truncate font-medium">{project.name}</p><p className="text-sm text-muted-foreground">{project.code || 'Pending'} · {project.manager || 'Unassigned'} · {project.location || 'No location'}</p></div><Badge variant="secondary" className="ml-auto">{project.status}</Badge></CommandItem>)}</CommandGroup></CommandList></Command></PopoverContent></Popover></div></CardContent></Card>;
}

function Dashboard({ projects, tasks, documents, role, inactiveRecordCount, totalProjectCount }: { projects: Project[]; tasks: Task[]; documents: Doc[]; role: Role | undefined; inactiveRecordCount: number; totalProjectCount: number }) {
  const activeProjects = projects.filter((project: Project) => project.status === 'Active');
  const activeTasks = tasks.filter((task: Task) => task.status !== 'Completed');
  const pendingDocuments = sortByUploadedDateAscending(documents.filter((doc: Doc) => doc.status === 'Submitted'));
  const isEmployee = role === 'Employee';
  const isApprover = role === 'Approver';
  const kpiCards = isEmployee
    ? [
      <KpiCard key="my-tasks" title="My Assigned Tasks" value={String(tasks.length)} icon={<ClipboardList className="h-6 w-6" />} />,
      <KpiCard key="my-documents" title="My Submitted Documents" value={String(documents.filter((doc: Doc) => doc.status === 'Submitted').length)} icon={<FileText className="h-6 w-6" />} />,
      <KpiCard key="active-tasks" title="Active Tasks" value={String(activeTasks.length)} icon={<CheckCircle2 className="h-6 w-6" />} />,
    ]
    : [
      <KpiCard key="projects" title="Total Projects" value={String(totalProjectCount)} icon={<BriefcaseBusiness className="h-6 w-6" />} />,
      <KpiCard key="tasks" title="Active Tasks" value={String(activeTasks.length)} icon={<ClipboardList className="h-6 w-6" />} />,
      <KpiCard key="approvals" title="Pending Approval" value={String(pendingDocuments.length)} icon={<FileText className="h-6 w-6" />} />,
      ...(role === 'Admin' ? [<KpiCard key="inactive" title="Inactive Records" value={String(inactiveRecordCount)} icon={<Archive className="h-6 w-6" />} />] : []),
    ];
  const orderedKpiCards = isApprover ? [kpiCards[2], kpiCards[0], kpiCards[1]] : kpiCards;
  return <div className="space-y-6"><InMemoryDataBanner show={HAS_IN_MEMORY_TABLES} message="Dashboard counts use generated Dataverse hooks and refresh when records are reloaded." /><div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">{orderedKpiCards}</div><div className="grid gap-4 lg:grid-cols-2">{!isEmployee && !isApprover && <Card><CardHeader><CardTitle>Active Projects</CardTitle></CardHeader><CardContent className="space-y-4">{activeProjects.map((project: Project) => <div key={project.id}><div className="mb-2 flex justify-between text-sm"><span>{project.name}</span><span>{project.progress}%</span></div><Progress value={project.progress} /></div>)}</CardContent></Card>}<Card className={isEmployee || isApprover ? 'lg:col-span-2' : ''}><CardHeader><CardTitle>Pending Approval Documents</CardTitle></CardHeader><CardContent className="space-y-3">{pendingDocuments.map((doc: Doc) => <div key={doc.id} className="flex items-center justify-between rounded-lg border p-3"><div><p className="font-medium">{doc.name}</p><p className="text-sm text-muted-foreground">Uploaded {doc.date}</p></div><StatusBadge status={doc.status} /></div>)}</CardContent></Card></div></div>;
}
function ProjectsScreen({ projects, tasks, documents, role, currentAccessUser, openProject, openCreate, onEdit, onDelete, onReactivate }: { projects: Project[]; tasks: Task[]; documents: Doc[]; role: Role | undefined; currentAccessUser: ManagedUser | undefined; openProject: (project?: Project) => void; openCreate: () => void; onEdit: (project: Project) => void; onDelete: (project: Project) => void; onReactivate: (project: Project) => void }) {
  const [query, setQuery] = useState('');
  const [showInactiveProjects, setShowInactiveProjects] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [managerFilter, setManagerFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const managerOptions = useMemo(() => Array.from(new Set(projects.map((project: Project) => project.manager).filter((manager: string) => Boolean(manager)))).sort((left: string, right: string) => left.localeCompare(right)), [projects]);
  const locationOptions = useMemo(() => Array.from(new Set(projects.map((project: Project) => project.location).filter((location: string) => Boolean(location)))).sort((left: string, right: string) => left.localeCompare(right)), [projects]);
  if (role !== 'Admin' && role !== 'Project Manager') return <Card><CardContent className="p-6"><p className="font-medium">Projects access is restricted.</p><p className="text-sm text-muted-foreground">Only admins and project managers can open this screen.</p></CardContent></Card>;
  const rows = projects.filter((project: Project) => {
    const matchesActive = role === 'Admin' && showInactiveProjects ? true : project.isActive;
    const matchesSearch = project.name.toLowerCase().includes(query.toLowerCase()) || (project.code ?? '').toLowerCase().includes(query.toLowerCase()) || project.id.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    const matchesManager = managerFilter === 'all' || project.manager === managerFilter;
    const matchesLocation = locationFilter === 'all' || project.location === locationFilter;
    return matchesActive && matchesSearch && matchesStatus && matchesManager && matchesLocation;
  });
  const resetFilters = () => {
    setQuery('');
    setStatusFilter('all');
    setManagerFilter('all');
    setLocationFilter('all');
  };
  return <div className="space-y-4"><InMemoryDataBanner show={HAS_IN_MEMORY_TABLES} message="This app uses generated table hooks for project data." /><div className="flex flex-wrap items-center justify-between gap-4"><SearchBox value={query} onChange={setQuery} placeholder="Search project, Project ID, or code..." /><div className="flex flex-wrap items-center gap-3">{role === 'Admin' && <label className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm text-card-foreground"><Switch checked={showInactiveProjects} onCheckedChange={setShowInactiveProjects} /> Show Inactive Projects</label>}{role === 'Admin' && <Button onClick={openCreate}><Plus className="h-4 w-4" /> Add Project</Button>}</div></div><Card><CardContent className="grid gap-3 p-4 md:grid-cols-4"><div className="space-y-2"><Label>Status</Label><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{projectStatuses.map((status: Status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Project Manager</Label><Select value={managerFilter} onValueChange={setManagerFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All managers</SelectItem>{managerOptions.map((manager: string) => <SelectItem key={manager} value={manager}>{manager}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Location</Label><Select value={locationFilter} onValueChange={setLocationFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All locations</SelectItem>{locationOptions.map((location: string) => <SelectItem key={location} value={location}>{location}</SelectItem>)}</SelectContent></Select></div><div className="flex items-end"><Button variant="outline" className="w-full" onClick={resetFilters}>Reset filters</Button></div></CardContent></Card><Card><CardContent className="p-0"><ProjectsTable rows={rows} tasks={tasks} documents={documents} role={role} currentAccessUser={currentAccessUser} onOpenWorkspace={openProject} onEdit={onEdit} onDelete={onDelete} onReactivate={onReactivate} /></CardContent></Card></div>;
}
function Workspace({ projects, tasks, documents, approvals, systemUsers, role, currentAccessUser, selectedProjectId, onProjectChange }: { projects: Project[]; tasks: Task[]; documents: Doc[]; approvals: Approval[]; systemUsers: ManagedUser[]; role: Role | undefined; currentAccessUser: ManagedUser | undefined; selectedProjectId: string; onProjectChange: (projectId: string) => void }) {
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const workspaceProjectOptions = useMemo(() => projects, [projects]);
  const project = workspaceProjectOptions.find((item: Project) => item.id === selectedProjectId) ?? workspaceProjectOptions[0];
  if (role !== 'Admin' && role !== 'Project Manager') return <Card><CardContent className="p-6"><p className="font-medium">Project Workspace access is restricted.</p><p className="text-sm text-muted-foreground">Only admins and assigned project managers can open this workspace.</p></CardContent></Card>;
  if (!project) return <Card><CardContent className="p-6"><p className="font-medium">No accessible project workspace.</p><p className="text-sm text-muted-foreground">No project is available for your current role.</p></CardContent></Card>;
  const projectTasks = tasks.filter((task: Task) => normalizeGuid(task.projectId) === normalizeGuid(project.id) || task.project === project.name);
  const projectDocuments = documents.filter((doc: Doc) => normalizeGuid(doc.projectId) === normalizeGuid(project.id) || doc.project === project.name);
  const projectDocumentIds = new Set(projectDocuments.map((doc: Doc) => doc.id));
  const projectDocumentNames = new Set(projectDocuments.map((doc: Doc) => doc.name));
  const projectApprovals = approvals.filter((approval: Approval) => projectDocumentIds.has(approval.documentId) || projectDocumentNames.has(approval.documentName));
  const assignedNames = new Set<string>([project.manager, ...projectTasks.map((task: Task) => task.assignedTo)].filter((name: string) => Boolean(name) && name !== 'Unassigned'));
  const projectTeam = systemUsers.filter((user: ManagedUser) => assignedNames.has(user.fullName) || assignedNames.has(user.userLookupName));
  const openTasks = projectTasks.filter((task: Task) => task.status !== 'Approved' && task.status !== 'Completed');
  const approvedTasks = projectTasks.filter((task: Task) => task.status === 'Approved');
  const submittedDocuments = projectDocuments.filter((doc: Doc) => doc.status === 'Submitted');
  const approvedDocuments = projectDocuments.filter((doc: Doc) => doc.status === 'Approved');
  const selectWorkspaceProject = (projectId: string) => { onProjectChange(projectId); setProjectPickerOpen(false); };
  return <div className="space-y-5"><InMemoryDataBanner show={HAS_IN_MEMORY_TABLES} message="This workspace filters generated Dataverse hook data to the selected project." /><Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbLink asChild><button type="button" onClick={() => onProjectChange(project.id)}>Project Workspace</button></BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>{project.name}</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-semibold">{project.name}</h1><div className="w-full max-w-md space-y-2 sm:w-80"><Label>{role === 'Admin' ? 'All available projects' : 'Assigned projects'}</Label><Popover open={projectPickerOpen} onOpenChange={setProjectPickerOpen}><PopoverTrigger asChild><Button variant="outline" role="combobox" aria-expanded={projectPickerOpen} className="w-full justify-between">{project.name}<ChevronsUpDown className="h-4 w-4" /></Button></PopoverTrigger><PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command><CommandInput placeholder="Search projects..." /><CommandList><CommandEmpty>No project found.</CommandEmpty><CommandGroup>{workspaceProjectOptions.filter((item: Project) => item.id).map((item: Project) => <CommandItem key={item.id} value={`${item.name} ${item.code} ${item.manager}`} onSelect={() => selectWorkspaceProject(item.id)}><Check className={`h-4 w-4 ${project.id === item.id ? 'opacity-100' : 'opacity-0'}`} /><span>{item.name}</span><span className="ml-auto text-sm text-muted-foreground">{item.code || 'Pending'}</span></CommandItem>)}</CommandGroup></CommandList></Command></PopoverContent></Popover></div></div><Card><CardContent className="grid gap-4 p-5 md:grid-cols-6"><div><p className="text-sm text-muted-foreground">Project ID</p><p className="font-medium">{project.code || 'Pending'}</p></div><div><p className="text-sm text-muted-foreground">Project Manager</p><p className="font-medium">{project.manager || 'Unassigned'}</p></div><div><p className="text-sm text-muted-foreground">Status</p><StatusBadge status={project.status} /></div><div><p className="text-sm text-muted-foreground">Progress</p><ProjectProgress value={project.progress} /></div><div><p className="text-sm text-muted-foreground">End Date</p><p className="font-medium">{project.end || 'TBD'}</p></div></CardContent></Card><div className="grid gap-4 md:grid-cols-4"><KpiCard title="CTS Tasks" value={String(projectTasks.length)} icon={<ClipboardList className="h-5 w-5" />} /><KpiCard title="CTS Documents" value={String(projectDocuments.length)} icon={<FileText className="h-5 w-5" />} /><KpiCard title="Submitted Documents" value={String(submittedDocuments.length)} icon={<CheckCircle2 className="h-5 w-5" />} /><KpiCard title="System Users" value={String(projectTeam.length)} icon={<Users className="h-5 w-5" />} /></div><Tabs defaultValue="tasks"><TabsList><TabsTrigger value="tasks">CTS Tasks</TabsTrigger><TabsTrigger value="documents">CTS Documents</TabsTrigger><TabsTrigger value="approvals">Document Approvals</TabsTrigger><TabsTrigger value="team">System Users</TabsTrigger></TabsList><TabsContent value="tasks"><Card><CardContent className="space-y-4 p-4"><p className="font-medium">Open: {openTasks.length} · Approved: {approvedTasks.length} · Total: {projectTasks.length}</p><Table><TableHeader><TableRow><TableHead>Task ID</TableHead><TableHead>Task</TableHead><TableHead>Assigned To</TableHead><TableHead>Status</TableHead><TableHead>Due Date</TableHead></TableRow></TableHeader><TableBody>{projectTasks.map((task: Task) => <TableRow key={task.id}><TableCell className="font-medium">{task.taskCode}</TableCell><TableCell className="font-medium">{task.name}</TableCell><TableCell>{task.assignedTo}</TableCell><TableCell><StatusBadge status={task.status} /></TableCell><TableCell>{task.dueDate || '—'}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></TabsContent><TabsContent value="documents"><Card><CardContent className="space-y-4 p-4"><p className="font-medium">Submitted: {submittedDocuments.length} · Approved: {approvedDocuments.length} · Total: {projectDocuments.length}</p><Table><TableHeader><TableRow><TableHead>Document ID</TableHead><TableHead>Document</TableHead><TableHead>Version</TableHead><TableHead>Uploaded By</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{projectDocuments.map((doc: Doc) => <TableRow key={doc.id}><TableCell className="font-medium">{doc.documentCode}</TableCell><TableCell className="font-medium">{doc.name}</TableCell><TableCell>{doc.version}</TableCell><TableCell>{doc.uploadedBy}</TableCell><TableCell><StatusBadge status={doc.status} /></TableCell></TableRow>)}</TableBody></Table></CardContent></Card></TabsContent><TabsContent value="approvals"><Card><CardContent className="p-4"><Table><TableHeader><TableRow><TableHead>Approval</TableHead><TableHead>Document</TableHead><TableHead>Approver</TableHead><TableHead>Decision</TableHead><TableHead>Decision Date</TableHead></TableRow></TableHeader><TableBody>{projectApprovals.map((approval: Approval) => <TableRow key={approval.id}><TableCell className="font-medium">{approval.name}</TableCell><TableCell>{approval.documentName}</TableCell><TableCell>{approval.approver}</TableCell><TableCell><StatusBadge status={approval.decision} /></TableCell><TableCell>{approval.decisionDate || '—'}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></TabsContent><TabsContent value="team"><Card><CardContent className="p-4"><Table><TableHeader><TableRow><TableHead>User</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Active</TableHead></TableRow></TableHeader><TableBody>{projectTeam.map((user: ManagedUser) => <TableRow key={user.id}><TableCell className="font-medium">{user.fullName}</TableCell><TableCell>{user.email || '—'}</TableCell><TableCell>{user.role}</TableCell><TableCell><Badge variant={user.isActive ? 'default' : 'secondary'}>{user.isActive ? 'Yes' : 'No'}</Badge></TableCell></TableRow>)}</TableBody></Table></CardContent></Card></TabsContent></Tabs></div>;
}
function TasksScreen({ tasks, projects, role, openCreate, onEdit, onDelete, onMoveTask }: { tasks: Task[]; projects: Project[]; role: Role | undefined; openCreate: () => void; onEdit: (task: Task) => void; onDelete: (task: Task) => void; onMoveTask: (task: Task, status: Status) => void }) {
  const columns: Status[] = ['Not Started', 'In Progress', 'Submitted', 'Approved', 'Completed'];
  const [projectFilter, setProjectFilter] = useState('all');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  if (role !== 'Admin' && role !== 'Project Manager') return <Card><CardContent className="p-6"><p className="font-medium">Tasks access is restricted.</p><p className="text-sm text-muted-foreground">Use My Tasks for employee assignments and Approval Center for reviews.</p></CardContent></Card>;
  const visibleTasks = projectFilter === 'all' ? tasks : tasks.filter((task: Task) => projects.some((project: Project) => project.id === projectFilter && taskMatchesProject(task, project)));
  const handleDrop = (status: Status) => {
    const task = visibleTasks.find((item: Task) => item.id === draggedTaskId);
    setDraggedTaskId(null);
    if (!task) return;
    if (status === 'Approved') { toast.warning('Approved status is set automatically from Approval Center.'); return; }
    if (task.status === status) return;
    onMoveTask(task, status);
  };
  return <div className="space-y-4"><InMemoryDataBanner show={HAS_IN_MEMORY_TABLES} message="This app uses generated table hooks for task data." /><div className="flex items-center justify-between"><Select value={projectFilter} onValueChange={setProjectFilter}><SelectTrigger className="w-64"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All projects</SelectItem>{projects.filter((project: Project) => project.id).map((project: Project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}</SelectContent></Select><Button onClick={openCreate}><Plus className="h-4 w-4" /> Create Task</Button></div><div className="grid gap-4 lg:grid-cols-4">{columns.map((status: Status) => <Card key={status} onDragOver={(event: React.DragEvent<HTMLDivElement>) => { event.preventDefault(); }} onDrop={() => handleDrop(status)} className={status === 'Approved' ? 'border-dashed' : ''}><CardHeader><CardTitle className="text-base">{status}</CardTitle></CardHeader><CardContent className="space-y-3">{visibleTasks.filter((task: Task) => task.status === status).map((task: Task) => <div key={task.id} draggable={task.status !== 'Approved'} onDragStart={() => setDraggedTaskId(task.id)} onDragEnd={() => setDraggedTaskId(null)} className="rounded-lg border bg-card p-3 text-card-foreground shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-muted-foreground">{task.taskCode}</p><p className="font-medium">{task.name}</p><p className="text-sm text-muted-foreground">Assigned To: {task.assignedTo || 'Unassigned'}</p></div><div className="flex gap-1"><Button variant="ghost" size="icon-sm" onClick={() => onEdit(task)}><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon-sm" onClick={() => onDelete(task)}><Trash2 className="h-4 w-4" /></Button></div></div><p className="mt-3 text-sm font-medium">{task.dueDate}</p><StatusBadge status={task.status} /></div>)}</CardContent></Card>)}</div></div>;
}
function MyTasks({ tasks, documents, role, currentAccessUser, onUploadDocument, onSubmitTask }: { tasks: Task[]; documents: Doc[]; role: Role | undefined; currentAccessUser: ManagedUser | undefined; onUploadDocument: (task: Task) => void; onSubmitTask: (task: Task) => void }) {
  if (role !== 'Employee' && role !== 'Project Manager' && role !== 'Admin') return <Card><CardContent className="p-6"><p className="font-medium">My Tasks access is restricted.</p><p className="text-sm text-muted-foreground">Only employees, project managers, and admins can view assigned tasks.</p></CardContent></Card>;
  const mine = sortTasksByDueDateAscending(tasks.filter((task: Task) => isTaskAssignedToCurrentUser(task, currentAccessUser)));
  return <div className="space-y-4"><InMemoryDataBanner show={HAS_IN_MEMORY_TABLES} message="This app uses generated Dataverse hooks for assigned task data." /><h1 className="text-xl font-semibold">My Assigned Tasks{currentAccessUser?.fullName ? ` - ${currentAccessUser.fullName}` : ''}</h1>{mine.length === 0 ? <Card><CardContent className="p-8"><Empty><EmptyHeader><EmptyTitle>No tasks assigned to you yet.</EmptyTitle><EmptyDescription>Assigned work will appear here after a project manager creates tasks for you.</EmptyDescription></EmptyHeader></Empty></CardContent></Card> : <div className="grid gap-4 lg:grid-cols-2">{mine.map((task: Task) => { const overdue = isOverdueTask(task); const canSubmit = hasSubmittedDocumentForTask(task, documents); return <Card key={task.id} className={overdue ? 'border-destructive' : ''}><CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_auto]"><div className="space-y-3"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{task.name}</p>{overdue && <Badge variant="destructive">Overdue</Badge>}</div><p className="text-sm"><span className="font-medium">Project:</span> {task.project}</p><p className="flex items-center gap-2 text-sm"><CalendarDays className="h-4 w-4" /><span className="font-medium">Due:</span> {task.dueDate || 'No due date'}</p><div className="flex flex-wrap gap-2"><StatusBadge status={task.status} /><Badge variant={getPriorityBadgeVariant(task.priority)}>{task.priority}</Badge></div><p className="text-sm text-muted-foreground">{task.description || 'No task description provided.'}</p></div><div className="flex min-w-52 flex-col gap-3"><Button variant="outline" onClick={() => onUploadDocument(task)}><Upload className="h-4 w-4" /> Upload Document</Button><Button disabled={!canSubmit} onClick={() => onSubmitTask(task)}><Send className="h-4 w-4" /> Submit for Approval</Button>{!canSubmit && <p className="text-sm text-muted-foreground">Upload a non-draft document before submitting.</p>}</div></CardContent></Card>; })}</div>}</div>;
}
function DocumentsScreen({ documents, upload, onEdit, onDelete }: { documents: Doc[]; upload: () => void; onEdit: (doc: Doc) => void; onDelete: (doc: Doc) => void }) {
  const [query, setQuery] = useState('');
  const rows = documents.filter((doc: Doc) => doc.name.toLowerCase().includes(query.toLowerCase()) || doc.documentCode.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-4"><InMemoryDataBanner show={HAS_IN_MEMORY_TABLES} message="This app uses generated table hooks for document data." /><div className="flex items-center justify-between gap-4"><SearchBox value={query} onChange={setQuery} placeholder="Search documents or Document ID..." /><Button onClick={upload}><Upload className="h-4 w-4" /> Upload Document</Button></div><Card><CardContent className="p-0"><DocumentsTable rows={rows} onEdit={onEdit} onDelete={onDelete} /></CardContent></Card></div>;
}
const deriveProjectFromTask = (task: Task, projects: Project[]): Project | undefined => {
  const linked = projects.find((project: Project) => taskMatchesProject(task, project));
  if (linked) return linked;
  const projectKey = task.projectId || task.project;
  if (!projectKey || !task.project) return undefined;
  return { id: task.projectId || task.project, name: task.project, code: undefined, manager: '', managerId: '', status: 'Active', progress: 0, location: '', start: '', end: '', description: '', isActive: true };
};
function UploadDocument({ projects, tasks, systemUsers, prefillTask, currentAccessUser, role, onCreate }: { projects: Project[]; tasks: Task[]; systemUsers: ManagedUser[]; prefillTask?: Task; currentAccessUser: ManagedUser | undefined; role: Role | undefined; onCreate: (doc: Doc) => void }) {
  const isEmployee = role === 'Employee';
  const [name, setName] = useState('New_Document.pdf');
  const [projectId, setProjectId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [version, setVersion] = useState('V1.0');
  const [comments, setComments] = useState(prefillTask ? `Document for ${prefillTask.name}` : 'Structural design for review.');
  const [errors, setErrors] = useState<{ name?: string; version?: string; project?: string; task?: string }>({});
  const scopedTasks = useMemo(() => isEmployee ? tasks.filter((task: Task) => isTaskAssignedToCurrentUser(task, currentAccessUser)) : tasks, [isEmployee, tasks, currentAccessUser]);
  const projectOptions = useMemo(() => {
    if (isEmployee) {
      const byKey = new Map<string, Project>();
      scopedTasks.forEach((task: Task) => {
        const projectRecord = deriveProjectFromTask(task, projects);
        if (projectRecord && projectRecord.name) byKey.set(normalizeGuid(projectRecord.id) || normalize(projectRecord.name), projectRecord);
      });
      return Array.from(byKey.values());
    }
    return projects.filter((project: Project) => project.id && project.name);
  }, [isEmployee, scopedTasks, projects]);
  const selectedProject = projectOptions.find((project: Project) => project.id === projectId);
  const tasksForProject = useMemo(() => selectedProject ? scopedTasks.filter((task: Task) => taskMatchesProject(task, selectedProject)) : [], [scopedTasks, selectedProject]);
  useEffect(() => {
    if (!prefillTask) return;
    const linkedProject = deriveProjectFromTask(prefillTask, projects);
    setProjectId(linkedProject?.id ?? prefillTask.projectId ?? '');
    setTaskId(prefillTask.id);
    setComments(`Document for ${prefillTask.name}`);
  }, [prefillTask, projects]);
  useEffect(() => {
    if (tasksForProject.some((task: Task) => task.id === taskId)) return;
    setTaskId('');
  }, [tasksForProject, taskId]);
  const save = () => {
    const project = projectOptions.find((item: Project) => item.id === projectId);
    const selectedTask = tasksForProject.find((item: Task) => item.id === taskId);
    const nextErrors = { name: name.trim() ? undefined : 'Document name is required.', version: version.trim() ? undefined : 'Version is required.', project: project ? undefined : 'Select a project.', task: selectedTask ? undefined : 'Select a task.' };
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.version || nextErrors.project || nextErrors.task || !project || !selectedTask) return;
    onCreate({ id: `doc-${Date.now()}`, name, documentCode: `doc-${Date.now()}`, version, project: project.name, projectId: project.id, task: selectedTask.name, taskId: selectedTask.id, uploadedBy: currentAccessUser?.fullName ?? systemUsers[0]?.fullName ?? 'Unassigned', date: new Date().toISOString(), status: 'Submitted', size: '1.0', url: 'https://example.com/documents/new-document', comments, isActive: true });
  };
  const projectPlaceholder = isEmployee && projectOptions.length === 0 ? 'No projects assigned to you' : 'Select a project';
  const taskPlaceholder = !selectedProject ? 'Select a project first' : (tasksForProject.length === 0 ? (isEmployee ? 'No tasks assigned to you for this project' : 'No tasks available for this project') : 'Select a task');
  return <div className="space-y-4"><InMemoryDataBanner show={HAS_IN_MEMORY_TABLES} message="This app uses generated table hooks for document data." /><Card><CardContent className="grid gap-4 p-6 md:grid-cols-2"><div className="space-y-2"><Label>Project</Label><Select value={projectId} onValueChange={setProjectId} disabled={projectOptions.length === 0}><SelectTrigger><SelectValue placeholder={projectPlaceholder} /></SelectTrigger><SelectContent>{projectOptions.map((item: Project) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select><FieldError message={errors.project} /></div><div className="space-y-2"><Label>Task</Label><Select value={taskId} onValueChange={setTaskId} disabled={!selectedProject || tasksForProject.length === 0}><SelectTrigger><SelectValue placeholder={taskPlaceholder} /></SelectTrigger><SelectContent>{tasksForProject.filter((item: Task) => item.name).map((item: Task) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select><FieldError message={errors.task} /></div><div className="space-y-2"><Label>Document name</Label><Input value={name} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setName(event.target.value)} /><FieldError message={errors.name} /></div><div className="space-y-2"><Label>Version</Label><Input value={version} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setVersion(event.target.value)} /><FieldError message={errors.version} /></div><div className="space-y-2 md:col-span-2"><Label>Comments</Label><Textarea value={comments} onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setComments(event.target.value)} /></div><div className="md:col-span-2"><Button className="w-full" onClick={save} disabled={!selectedProject || tasksForProject.length === 0}><Upload className="h-4 w-4" /> Upload</Button></div></CardContent></Card></div>;
}
function ApprovalCenter({ documents, approvals, role, currentAccessUser, onDecision }: { documents: Doc[]; approvals: Approval[]; role: Role | undefined; currentAccessUser: ManagedUser | undefined; onDecision: (doc: Doc, decision: 'Approved' | 'Rejected', comments: string) => void }) {
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [comments, setComments] = useState('');
  const [error, setError] = useState('');
  if (role !== 'Approver' && role !== 'Admin' && role !== 'Project Manager') return <Card><CardContent className="p-6"><p className="font-medium">Approval Center access is restricted.</p><p className="text-sm text-muted-foreground">Only approvers, admins, and project managers can view approvals.</p></CardContent></Card>;
  const canDecide = role === 'Approver' || role === 'Admin';
  const pending = sortByUploadedDateAscending(documents.filter((doc: Doc) => doc.status === 'Submitted'));
  const selectedDocument = pending.find((doc: Doc) => doc.id === selectedDocumentId) ?? pending[0];
  const submitDecision = (decision: 'Approved' | 'Rejected') => {
    if (!selectedDocument) { toast.warning('Select a submitted document first.'); return; }
    if (!canDecide) { toast.error('You have read-only access to approvals.'); return; }
    if (decision === 'Rejected' && !comments.trim()) { setError('Approval Comments are required when rejecting.'); return; }
    setError('');
    onDecision(selectedDocument, decision, comments.trim());
    setComments('');
    setSelectedDocumentId('');
  };
  return <div className="space-y-4"><InMemoryDataBanner show={HAS_IN_MEMORY_TABLES} message="This app uses generated Dataverse hooks for submitted documents and approval history." /><Card><CardHeader><CardTitle>Pending Documents</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Document</TableHead><TableHead>Project</TableHead><TableHead>Task</TableHead><TableHead>Uploaded Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{pending.map((doc: Doc) => <TableRow key={doc.id} className={selectedDocument?.id === doc.id ? 'bg-muted text-muted-foreground' : ''} onClick={() => setSelectedDocumentId(doc.id)}><TableCell className="font-medium">{doc.name}</TableCell><TableCell>{doc.project}</TableCell><TableCell>{doc.task}</TableCell><TableCell>{doc.date || '—'}</TableCell><TableCell><StatusBadge status={doc.status} /></TableCell></TableRow>)}</TableBody></Table></CardContent></Card><Card><CardHeader><CardTitle>Approval Comments</CardTitle></CardHeader><CardContent className="space-y-4"><Textarea value={comments} onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => { setComments(event.target.value); setError(''); }} placeholder="Enter comments. Required only when rejecting." /><FieldError message={error} /><div className="flex gap-3"><Button disabled={!canDecide || !selectedDocument} onClick={() => submitDecision('Approved')}><CheckCircle2 className="h-4 w-4" /> Approve</Button><Button variant="destructive" disabled={!canDecide || !selectedDocument} onClick={() => submitDecision('Rejected')}><X className="h-4 w-4" /> Reject</Button></div>{!canDecide && <p className="text-sm text-muted-foreground">Project managers have read-only approval access.</p>}</CardContent></Card><Card><CardHeader><CardTitle>Approval History</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Document Name</TableHead><TableHead>Approver</TableHead><TableHead>Decision</TableHead><TableHead>Comments</TableHead><TableHead>Date</TableHead></TableRow></TableHeader><TableBody>{approvals.map((approval: Approval) => <TableRow key={approval.id}><TableCell className="font-medium">{approval.documentName}</TableCell><TableCell>{approval.approver}</TableCell><TableCell><StatusBadge status={approval.decision} /></TableCell><TableCell>{approval.comments || '—'}</TableCell><TableCell>{approval.decisionDate || '—'}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></div>;
}

const defaultPermissionsByRole: Record<Role, string[]> = {
  Admin: permissionOptions,
  'Project Manager': ['Create projects', 'Assign tasks'],
  Employee: ['Upload documents'],
  Approver: ['Review approvals'],
};

const permissionFieldAliases: Record<string, string[]> = {
  'Create projects': ['createProjects', 'create_projects', 'canCreateProjects', 'can_create_projects', 'dmeo_createprojects'],
  'Assign tasks': ['assignTasks', 'assign_tasks', 'canAssignTasks', 'can_assign_tasks', 'dmeo_assigntasks'],
  'Upload documents': ['uploadDocuments', 'upload_documents', 'canUploadDocuments', 'can_upload_documents', 'dmeo_uploaddocuments'],
  'Review approvals': ['reviewApprovals', 'review_approvals', 'canReviewApprovals', 'can_review_approvals', 'dmeo_reviewapprovals'],
};
const hasPermissionFlag = (user: SystemUser | undefined, permission: string): boolean => {
  if (!user) return false;
  const aliases = permissionFieldAliases[permission] ?? [];
  const values = user as unknown as Record<string, unknown>;
  return aliases.some((alias: string) => values[alias] === true || values[alias] === 'true' || values[alias] === 'Yes');
};
const toPermissionFields = (permissions: string[]): SystemUserPermissionFields => ({
  createProjects: permissions.includes('Create projects'),
  assignTasks: permissions.includes('Assign tasks'),
  uploadDocuments: permissions.includes('Upload documents'),
  reviewApprovals: permissions.includes('Review approvals'),
  dmeo_createprojects: permissions.includes('Create projects'),
  dmeo_assigntasks: permissions.includes('Assign tasks'),
  dmeo_uploaddocuments: permissions.includes('Upload documents'),
  dmeo_reviewapprovals: permissions.includes('Review approvals'),
});
const getPermissionsForUser = (user: SystemUser | undefined, role: Role): string[] => {
  if (!user) return defaultPermissionsByRole[role];
  const selected = permissionOptions.filter((permission: string) => hasPermissionFlag(user, permission));
  return selected.length > 0 ? selected : defaultPermissionsByRole[role];
};

function AccessManagement({ role: currentRole, currentAccessUser }: { role: Role | undefined; currentAccessUser: ManagedUser | undefined }) {
  const registeredSystemUserList = useSystemUserList();
  const dataverseUserList = useUserList();
  const createSystemUser = useCreateSystemUser();
  const updateSystemUser = useUpdateSystemUser();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [lookupFilter, setLookupFilter] = useState<'all' | 'linked' | 'unlinked'>('all');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('Employee');
  const [isActive, setIsActive] = useState<IsActiveValue>('Active');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(defaultPermissionsByRole.Employee);
  const [errors, setErrors] = useState<{ user?: string; name?: string; email?: string; role?: string }>({});
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [editRole, setEditRole] = useState<Role>('Employee');
  const [editIsActive, setEditIsActive] = useState<IsActiveValue>('Active');
  const [editPermissions, setEditPermissions] = useState<string[]>(defaultPermissionsByRole.Employee);
  const [pendingInactive, setPendingInactive] = useState(false);

  useEffect(() => {
    if (registeredSystemUserList.data) setUsers(registeredSystemUserList.data.map((user: SystemUser) => fromSystemUser(user)));
  }, [registeredSystemUserList.data]);

  if (currentRole !== 'Admin') return <Card><CardContent className="p-6"><p className="font-medium">Access Management is restricted.</p><p className="text-sm text-muted-foreground">Only admins can manage application access.</p></CardContent></Card>;

  const systemUserOptions = (dataverseUserList.data ?? [])
    .filter((user: User) => user.id)
    .map((user: User): DataverseUserOption => ({ id: user.id, fullName: user.fullName, email: user.primaryEmail, lookup: { id: user.id, fullName: user.fullName } }));
  const selectedSystemUser = systemUserOptions.find((user: DataverseUserOption) => getDataverseUserId(user) === selectedUserId);
  const visibleUsers = users.filter((user: ManagedUser) => {
    const matchesSearch = user.fullName.toLowerCase().includes(query.toLowerCase()) || user.email.toLowerCase().includes(query.toLowerCase()) || user.userLookupName.toLowerCase().includes(query.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesActive = activeFilter === 'all' || (activeFilter === 'active' ? user.isActive : !user.isActive);
    const matchesLookup = lookupFilter === 'all' || (lookupFilter === 'linked' ? Boolean(user.userLookupId) : !user.userLookupId);
    return matchesSearch && matchesRole && matchesActive && matchesLookup;
  });
  const registrationComplete = Boolean(name.trim() && selectedUserId && role);
  const isEditingSelf = Boolean(editingUser && currentAccessUser && (editingUser.id === currentAccessUser.id || isSamePerson(editingUser.email, currentAccessUser.email) || isSamePerson(editingUser.fullName, currentAccessUser.fullName) || isSamePerson(editingUser.userLookupName, currentAccessUser.userLookupName)));
  const togglePermission = (permission: string) => setSelectedPermissions((current: string[]) => current.includes(permission) ? current.filter((item: string) => item !== permission) : [...current, permission]);
  const toggleEditPermission = (permission: string) => setEditPermissions((current: string[]) => current.includes(permission) ? current.filter((item: string) => item !== permission) : [...current, permission]);
  const chooseSystemUser = (user: DataverseUserOption) => {
    setSelectedUserId(getDataverseUserId(user));
    setName(getDataverseUserName(user));
    setEmail(getDataverseUserEmail(user));
    setUserPickerOpen(false);
    setErrors({});
  };
  const handleRoleChange = (value: Role) => { setRole(value); setSelectedPermissions(defaultPermissionsByRole[value]); };
  const handleEditRoleChange = (value: Role) => { setEditRole(value); setEditPermissions(defaultPermissionsByRole[value]); };
  const saveUser = () => {
    const nextErrors = {
      user: selectedUserId ? undefined : 'Select a System User.',
      name: name.trim() ? undefined : 'Full name is required.',
      role: role ? undefined : 'Role is required.',
    };
    setErrors(nextErrors);
    if (nextErrors.user || nextErrors.name || nextErrors.role) return;
    if (!selectedSystemUser) return;
    const nextUser: ManagedUser = { id: `access-${Date.now()}`, userLookupId: selectedUserId, userLookupName: selectedSystemUser.lookup.fullName, fullName: name, email, isActive: isActive === 'Active', role };
    const permissionFields = toPermissionFields(selectedPermissions);
    const existingUser = users.find((user: ManagedUser) => normalizeGuid(user.userLookupId) === normalizeGuid(selectedUserId) || (email && isSamePerson(user.email, email)));
    if (existingUser) {
      const changedFields: Partial<Omit<SystemUser, 'id'>> & SystemUserPermissionFields = { ...toSystemUser(nextUser, selectedSystemUser), ...permissionFields };
      void updateSystemUser.mutateAsync({ id: existingUser.id, changedFields }).then(() => {
        setUsers((current: ManagedUser[]) => current.map((user: ManagedUser) => user.id === existingUser.id ? { ...user, fullName: nextUser.fullName, email: nextUser.email, role: nextUser.role, isActive: nextUser.isActive, userLookupId: nextUser.userLookupId, userLookupName: nextUser.userLookupName } : user));
        void registeredSystemUserList.refetch();
        setSelectedUserId('');
        setName('');
        setEmail('');
        setRole('Employee');
        setSelectedPermissions(defaultPermissionsByRole.Employee);
        setIsActive('Active');
        toast.success('Existing System User updated');
      }).catch((error: unknown) => {
        const message = error instanceof Error && error.message ? error.message : 'System User could not be updated';
        toast.error(message);
      });
      return;
    }
    const input: Omit<SystemUser, 'id'> & SystemUserPermissionFields = { ...toSystemUser(nextUser, selectedSystemUser), ...permissionFields };
    void createSystemUser.mutateAsync(input).then((savedUser: SystemUser) => {
      setUsers((current: ManagedUser[]) => [fromSystemUser(savedUser), ...current.filter((user: ManagedUser) => user.id !== savedUser.id)]);
      void registeredSystemUserList.refetch();
      setSelectedUserId('');
      setName('');
      setEmail('');
      setRole('Employee');
      setSelectedPermissions(defaultPermissionsByRole.Employee);
      setIsActive('Active');
      toast.success('System User registration created');
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'System User could not be created';
      toast.error(message || 'System User could not be created');
    });
  };
  const openEditUser = (user: ManagedUser) => {
    const sourceRecord = registeredSystemUserList.data?.find((record: SystemUser) => record.id === user.id);
    setEditingUser(user);
    setEditRole(user.role);
    setEditIsActive(user.isActive ? 'Active' : 'Inactive');
    setEditPermissions(getPermissionsForUser(sourceRecord, user.role));
  };
  const persistEditedUser = () => {
    if (!editingUser) return;
    const selectedDataverseUser = systemUserOptions.find((option: DataverseUserOption) => getDataverseUserId(option) === editingUser.userLookupId);
    const changedFields: Partial<Omit<SystemUser, 'id'>> & SystemUserPermissionFields = { ...toPermissionFields(editPermissions) };
    if (!isEditingSelf) { changedFields.roleKey = roleToRoleKey(editRole); changedFields.isActive = editIsActive === 'Active'; }
    if (selectedDataverseUser) changedFields.user = selectedDataverseUser.lookup;
    void updateSystemUser.mutateAsync({ id: editingUser.id, changedFields }).then(() => {
      setUsers((current: ManagedUser[]) => current.map((item: ManagedUser) => item.id === editingUser.id ? { ...item, role: isEditingSelf ? item.role : editRole, isActive: isEditingSelf ? item.isActive : editIsActive === 'Active' } : item));
      void registeredSystemUserList.refetch();
      setEditingUser(null);
      setPendingInactive(false);
      toast.success('System User updated');
    }).catch(() => toast.error('System User could not be updated'));
  };
  const saveEditedUser = () => {
    if (!editingUser) return;
    if (!isEditingSelf && editingUser.isActive && editIsActive === 'Inactive') { setPendingInactive(true); return; }
    persistEditedUser();
  };

  return <div className="space-y-4"><div className="grid gap-4 lg:grid-cols-3"><KpiCard title="System Users" value={String(users.length)} icon={<Users className="h-5 w-5" />} /><KpiCard title="Linked User Lookups" value={String(users.filter((user: ManagedUser) => user.userLookupId).length)} icon={<UserPlus className="h-5 w-5" />} /><KpiCard title="Role Profiles" value={String(roles.length)} icon={<ShieldCheck className="h-5 w-5" />} /></div><div className="grid gap-4 lg:grid-cols-3"><Card className="lg:col-span-1"><CardHeader><CardTitle>New System User</CardTitle></CardHeader><CardContent className="space-y-4"><div className="space-y-2"><Label>User</Label><Popover open={userPickerOpen} onOpenChange={setUserPickerOpen}><PopoverTrigger asChild><Button variant="outline" role="combobox" aria-expanded={userPickerOpen} className="w-full justify-between">{selectedSystemUser ? getDataverseUserName(selectedSystemUser) : 'Search Dataverse User...'}<ChevronsUpDown className="h-4 w-4" /></Button></PopoverTrigger><PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command><CommandInput placeholder="Search Dataverse users..." /><CommandList><CommandEmpty>No Dataverse User found.</CommandEmpty><CommandGroup>{systemUserOptions.map((user: DataverseUserOption) => <CommandItem key={getDataverseUserId(user)} value={`${getDataverseUserName(user)} ${getDataverseUserEmail(user)}`} onSelect={() => chooseSystemUser(user)}><Check className={`h-4 w-4 ${selectedUserId === getDataverseUserId(user) ? 'opacity-100' : 'opacity-0'}`} /><span>{getDataverseUserName(user)}</span><span className="ml-auto text-sm text-muted-foreground">{getDataverseUserEmail(user)}</span></CommandItem>)}</CommandGroup></CommandList></Command></PopoverContent></Popover><FieldError message={errors.user} /></div><div className="space-y-2"><Label>Full name</Label><Input value={name} readOnly aria-readonly="true" /><FieldError message={errors.name} /></div><div className="space-y-2"><Label>Email</Label><Input value={email} readOnly aria-readonly="true" placeholder="Selected user's email" /><FieldError message={errors.email} /></div><div className="space-y-2"><Label>Role</Label><Select value={role} onValueChange={(value: Role) => handleRoleChange(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{roles.filter((item: Role) => item).map((item: Role) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select><FieldError message={errors.role} /></div><div className="space-y-2"><Label>Is Active</Label><Select value={isActive} onValueChange={(value: IsActiveValue) => setIsActive(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{isActiveOptions.filter((item: IsActiveValue) => item).map((item: IsActiveValue) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div><Accordion type="single" collapsible className="rounded-lg border px-3"><AccordionItem value="permission-template" className="border-0"><AccordionTrigger>Permission template</AccordionTrigger><AccordionContent><div className="grid gap-2 pt-2">{permissionOptions.map((permission: string) => <label key={permission} className="flex items-center gap-2 rounded-md bg-muted p-2 text-muted-foreground"><input type="checkbox" checked={selectedPermissions.includes(permission)} onChange={() => togglePermission(permission)} />{permission}</label>)}</div></AccordionContent></AccordionItem></Accordion><Button className="w-full" onClick={saveUser} disabled={!registrationComplete}><UserPlus className="h-4 w-4" /> Register user</Button></CardContent></Card><Card className="lg:col-span-2"><CardHeader><CardTitle>System User table records</CardTitle></CardHeader><CardContent className="space-y-4"><div className="rounded-lg border bg-muted p-4 text-muted-foreground"><div className="mb-3 font-medium text-foreground">Filter panes</div><div className="grid gap-3 md:grid-cols-4"><SearchBox value={query} onChange={setQuery} placeholder="Search system users..." /><Select value={roleFilter} onValueChange={(value: Role | 'all') => setRoleFilter(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All roles</SelectItem>{roles.filter((item: Role) => item).map((item: Role) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select><Select value={activeFilter} onValueChange={(value: 'all' | 'active' | 'inactive') => setActiveFilter(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All active states</SelectItem><SelectItem value="active">Active only</SelectItem><SelectItem value="inactive">Inactive only</SelectItem></SelectContent></Select><Select value={lookupFilter} onValueChange={(value: 'all' | 'linked' | 'unlinked') => setLookupFilter(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All lookups</SelectItem><SelectItem value="linked">Linked users</SelectItem><SelectItem value="unlinked">Unlinked users</SelectItem></SelectContent></Select></div></div><div className="rounded-lg border"><Table><TableHeader><TableRow><TableHead>User</TableHead><TableHead>Full Name</TableHead><TableHead>Email</TableHead><TableHead>Is Active</TableHead><TableHead>Role</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{visibleUsers.map((user: ManagedUser) => <TableRow key={user.id}><TableCell><div className="font-medium">{user.userLookupName}</div><div className="text-sm text-muted-foreground">{user.userLookupId}</div></TableCell><TableCell>{user.fullName}</TableCell><TableCell>{user.email || '—'}</TableCell><TableCell><Badge variant={user.isActive ? 'default' : 'secondary'}>{user.isActive ? 'Yes' : 'No'}</Badge></TableCell><TableCell>{user.role}</TableCell><TableCell className="text-right"><Button variant="ghost" size="icon-sm" onClick={() => openEditUser(user)}><Edit className="h-4 w-4" /></Button></TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card></div><Dialog open={Boolean(editingUser)} onOpenChange={(open: boolean) => { if (!open) setEditingUser(null); }}><DialogContent><DialogHeader><DialogTitle>Edit System User</DialogTitle><DialogDescription>Update this access record. Permission checkboxes can be manually adjusted after role defaults are applied.</DialogDescription></DialogHeader><div className="grid gap-4 py-2"><div className="space-y-2"><Label>User</Label><Input value={editingUser?.userLookupName ?? ''} readOnly aria-readonly="true" /></div><div className="space-y-2"><Label>Full Name</Label><Input value={editingUser?.fullName ?? ''} readOnly aria-readonly="true" /></div><div className="space-y-2"><Label>Role</Label>{isEditingSelf ? <Tooltip><TooltipTrigger asChild><div><Select value={editRole} disabled><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{roles.filter((item: Role) => item).map((item: Role) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div></TooltipTrigger><TooltipContent>You cannot modify your own role or active status.</TooltipContent></Tooltip> : <Select value={editRole} onValueChange={(value: Role) => handleEditRoleChange(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{roles.filter((item: Role) => item).map((item: Role) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>}</div><div className="space-y-2"><Label>Is Active</Label>{isEditingSelf ? <Tooltip><TooltipTrigger asChild><div><Select value={editIsActive} disabled><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{isActiveOptions.filter((item: IsActiveValue) => item).map((item: IsActiveValue) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div></TooltipTrigger><TooltipContent>You cannot modify your own role or active status.</TooltipContent></Tooltip> : <Select value={editIsActive} onValueChange={(value: IsActiveValue) => setEditIsActive(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{isActiveOptions.filter((item: IsActiveValue) => item).map((item: IsActiveValue) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>}</div><Accordion type="single" collapsible className="rounded-lg border px-3"><AccordionItem value="permission-template" className="border-0"><AccordionTrigger>Permission template</AccordionTrigger><AccordionContent><div className="grid gap-2 pt-2 md:grid-cols-2">{permissionOptions.map((permission: string) => <label key={permission} className="flex items-center gap-2 rounded-md bg-muted p-2 text-muted-foreground"><input type="checkbox" checked={editPermissions.includes(permission)} onChange={() => toggleEditPermission(permission)} />{permission}</label>)}</div></AccordionContent></AccordionItem></Accordion></div><DialogFooter><Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button><Button onClick={saveEditedUser}>Save changes</Button></DialogFooter></DialogContent></Dialog><AlertDialog open={pendingInactive} onOpenChange={setPendingInactive}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Deactivate user</AlertDialogTitle><AlertDialogDescription>This will immediately revoke this user's access to the application. Continue?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={persistEditedUser}>Continue</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>;
}

function DatePickerField({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  const selectedDate = value ? new Date(value) : undefined;
  return <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{selectedDate && !Number.isNaN(selectedDate.getTime()) ? format(selectedDate, 'PPP') : <span>{placeholder}</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={selectedDate} onSelect={(date: Date | undefined) => onChange(date ? date.toISOString() : '')} initialFocus /></PopoverContent></Popover>;
}

function ProjectForm({ mode, item, systemUsers, onCancel, onSave }: { mode: FormMode; item?: Project; systemUsers: ManagedUser[]; onCancel: () => void; onSave: (project: Project) => void }) {
  const managerOptions = getProjectManagerOptions(systemUsers);
  const [name, setName] = useState(item?.name ?? '');
  const codeDisplay = item?.code ?? 'Auto-generated on save';
  const [managerId, setManagerId] = useState(item?.managerId || managerOptions[0]?.id || 'unassigned');
  const [status, setStatus] = useState<Status>(item?.status ?? 'Planning');
  const [start, setStart] = useState(item?.start ?? '');
  const [end, setEnd] = useState(item?.end ?? '');
  const [location, setLocation] = useState(item?.location ?? '');
  const [progress, setProgress] = useState(String(item?.progress ?? 0));
  const [description, setDescription] = useState(item?.description ?? '');
  const [errors, setErrors] = useState<{ name?: string; progress?: string; manager?: string }>({});
  const save = () => {
    const progressValue = Number(progress);
    const selectedManager = managerOptions.find((user: ManagedUser) => user.id === managerId);
    const nextErrors = { name: name.trim() ? undefined : 'Project name is required.', progress: Number.isFinite(progressValue) && progressValue >= 0 && progressValue <= 100 ? undefined : 'Progress must be between 0 and 100.', manager: selectedManager ? undefined : 'Select a Project Manager or Admin.' };
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.progress || nextErrors.manager) return;
    onSave({ id: item?.id ?? `project-${Date.now()}`, name, code: item?.code, manager: selectedManager?.fullName ?? '', managerId: selectedManager?.id ?? '', status, progress: progressValue, location, start, end, description, isActive: item?.isActive ?? true });
  };
  return <><DialogHeader><DialogTitle>{mode === 'create' ? 'Add Project' : 'Edit Project'}</DialogTitle><DialogDescription>Create or update project details and manager assignment.</DialogDescription></DialogHeader><div className="grid gap-4 py-2 md:grid-cols-2"><div className="space-y-2"><Label>Project Name</Label><Input value={name} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setName(event.target.value)} /><FieldError message={errors.name} /></div><div className="space-y-2"><Label>Project Code</Label><div className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">{codeDisplay}</div><p className="text-sm text-muted-foreground">Dataverse assigns the real autonumber when the project is saved.</p></div><div className="space-y-2"><Label>Manager</Label><Select value={managerId} onValueChange={setManagerId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{managerOptions.filter((person: ManagedUser) => person.id).map((person: ManagedUser) => <SelectItem key={person.id} value={person.id}>{person.fullName}</SelectItem>)}</SelectContent></Select><FieldError message={errors.manager} /></div><div className="space-y-2"><Label>Status</Label><Select value={status} onValueChange={(value: Status) => setStatus(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{projectStatuses.map((itemStatus: Status) => <SelectItem key={itemStatus} value={itemStatus}>{itemStatus}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Start Date</Label><DatePickerField value={start} onChange={setStart} placeholder="Pick start date" /></div><div className="space-y-2"><Label>End Date</Label><DatePickerField value={end} onChange={setEnd} placeholder="Pick end date" /></div><div className="space-y-2"><Label>Location</Label><Input value={location} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setLocation(event.target.value)} /></div><div className="space-y-2"><Label>Progress</Label><Input value={progress} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setProgress(event.target.value)} /><FieldError message={errors.progress} /></div><div className="space-y-2 md:col-span-2"><Label>Description</Label><Textarea value={description} onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(event.target.value)} /></div></div><DialogFooter><Button variant="outline" onClick={onCancel}>Cancel</Button><Button onClick={save}>Save project</Button></DialogFooter></>;
}

function TaskForm({ mode, item, projects, systemUsers, onCancel, onSave }: { mode: FormMode; item?: Task; projects: Project[]; systemUsers: ManagedUser[]; onCancel: () => void; onSave: (task: Task) => void }) {
  const employeeOptions = getEmployeeOptions(systemUsers);
  const [name, setName] = useState(item?.name ?? '');
  const [projectId, setProjectId] = useState(item?.projectId || projects.find((projectItem: Project) => projectItem.name === item?.project)?.id || projects[0]?.id || '');
  const [assignedToId, setAssignedToId] = useState(item?.assignedToId || employeeOptions.find((user: ManagedUser) => isSamePerson(user.fullName, item?.assignedTo))?.id || employeeOptions[0]?.id || 'unassigned');
  const [status, setStatus] = useState<Status>(item?.status ?? 'Not Started');
  const [priority, setPriority] = useState<Priority>(item?.priority ?? 'Medium');
  const [errors, setErrors] = useState<{ name?: string; assignee?: string; project?: string }>({});
  const save = () => {
    const selectedProject = projects.find((projectItem: Project) => projectItem.id === projectId);
    const selectedAssignee = employeeOptions.find((user: ManagedUser) => user.id === assignedToId);
    const nextErrors = { name: name.trim() ? undefined : 'Task name is required.', project: selectedProject ? undefined : 'Select a project.', assignee: selectedAssignee ? undefined : 'Select an employee.' };
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.project || nextErrors.assignee || !selectedProject || !selectedAssignee) return;
    onSave({ id: item?.id ?? `task-${Date.now()}`, name, taskCode: item?.taskCode ?? `task-${Date.now()}`, project: selectedProject.name, projectId: selectedProject.id, assignedTo: selectedAssignee.fullName, assignedToId: selectedAssignee.id, assignedToEmail: selectedAssignee.email ?? '', dueDate: item?.dueDate ?? '30-Aug-2026', status, priority, description: item?.description ?? '', isActive: item?.isActive ?? true });
  };
  return <><DialogHeader><DialogTitle>{mode === 'create' ? 'Create Task' : 'Edit Task'}</DialogTitle><DialogDescription>Create or update task assignment and access.</DialogDescription></DialogHeader><div className="grid gap-4 py-2 md:grid-cols-2"><div className="space-y-2"><Label>Task name</Label><Input value={name} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setName(event.target.value)} /><FieldError message={errors.name} /></div><div className="space-y-2"><Label>Project</Label><Select value={projectId} onValueChange={setProjectId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{projects.filter((projectItem: Project) => projectItem.name).map((projectItem: Project) => <SelectItem key={projectItem.id} value={projectItem.id}>{projectItem.name}</SelectItem>)}</SelectContent></Select><FieldError message={errors.project} /></div><div className="space-y-2"><Label>Assigned to</Label><Select value={assignedToId} onValueChange={setAssignedToId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{employeeOptions.filter((person: ManagedUser) => person.id).map((person: ManagedUser) => <SelectItem key={person.id} value={person.id}>{person.fullName}</SelectItem>)}</SelectContent></Select><FieldError message={errors.assignee} /></div><div className="space-y-2"><Label>Status</Label><Select value={status} onValueChange={(value: Status) => setStatus(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{taskStatuses.filter((itemStatus: Status) => itemStatus !== 'Approved').map((itemStatus: Status) => <SelectItem key={itemStatus} value={itemStatus}>{itemStatus}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Priority</Label><Select value={priority} onValueChange={(value: Priority) => setPriority(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{priorities.map((itemPriority: Priority) => <SelectItem key={itemPriority} value={itemPriority}>{itemPriority}</SelectItem>)}</SelectContent></Select></div></div><DialogFooter><Button variant="outline" onClick={onCancel}>Cancel</Button><Button onClick={save}>Save task</Button></DialogFooter></>;
}

function DocumentForm({ mode, item, projects, tasks, onCancel, onSave }: { mode: FormMode; item?: Doc; projects: Project[]; tasks: Task[]; onCancel: () => void; onSave: (doc: Doc) => void }) {
  const [name, setName] = useState(item?.name ?? '');
  const [version, setVersion] = useState(item?.version ?? 'V1.0');
  const [projectId, setProjectId] = useState(item?.projectId || projects.find((projectItem: Project) => projectItem.name === item?.project)?.id || projects[0]?.id || '');
  const [taskId, setTaskId] = useState(item?.taskId || tasks.find((taskItem: Task) => taskItem.name === item?.task)?.id || tasks[0]?.id || '');
  const [errors, setErrors] = useState<{ name?: string; version?: string; project?: string; task?: string }>({});
  const selectedProjectRecord = projects.find((projectItem: Project) => projectItem.id === projectId);
  const tasksForProject = useMemo(() => selectedProjectRecord ? tasks.filter((taskItem: Task) => taskMatchesProject(taskItem, selectedProjectRecord)) : [], [tasks, selectedProjectRecord]);
  useEffect(() => {
    if (tasksForProject.some((taskItem: Task) => taskItem.id === taskId)) return;
    setTaskId(tasksForProject[0]?.id ?? '');
  }, [tasksForProject, taskId]);
  const save = () => {
    const selectedProject = projects.find((projectItem: Project) => projectItem.id === projectId);
    const selectedTask = tasks.find((taskItem: Task) => taskItem.id === taskId);
    const nextErrors = { name: name.trim() ? undefined : 'Document name is required.', version: version.trim() ? undefined : 'Version is required.', project: selectedProject ? undefined : 'Select a project.', task: selectedTask ? undefined : 'Select a task.' };
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.version || nextErrors.project || nextErrors.task || !selectedProject || !selectedTask) return;
    onSave({ id: item?.id ?? `doc-${Date.now()}`, name, documentCode: item?.documentCode ?? `doc-${Date.now()}`, version, project: selectedProject.name, projectId: selectedProject.id, task: selectedTask.name, taskId: selectedTask.id, uploadedBy: item?.uploadedBy ?? 'Unassigned', date: item?.date ?? '15-Aug-2026', status: item?.status ?? 'Draft', size: item?.size ?? '1.0', url: item?.url ?? 'https://example.com/documents/new-document', comments: item?.comments ?? '', isActive: item?.isActive ?? true });
  };
  return <><DialogHeader><DialogTitle>{mode === 'create' ? 'Add Document' : 'Edit Document'}</DialogTitle><DialogDescription>Create or update document metadata and approval status.</DialogDescription></DialogHeader><div className="grid gap-4 py-2 md:grid-cols-2"><div className="space-y-2"><Label>Document name</Label><Input value={name} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setName(event.target.value)} /><FieldError message={errors.name} /></div><div className="space-y-2"><Label>Version</Label><Input value={version} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setVersion(event.target.value)} /><FieldError message={errors.version} /></div><div className="space-y-2"><Label>Project</Label><Select value={projectId} onValueChange={setProjectId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{projects.filter((projectItem: Project) => projectItem.name).map((projectItem: Project) => <SelectItem key={projectItem.id} value={projectItem.id}>{projectItem.name}</SelectItem>)}</SelectContent></Select><FieldError message={errors.project} /></div><div className="space-y-2"><Label>Task</Label><Select value={taskId} onValueChange={setTaskId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{tasksForProject.filter((taskItem: Task) => taskItem.name).map((taskItem: Task) => <SelectItem key={taskItem.id} value={taskItem.id}>{taskItem.name}</SelectItem>)}</SelectContent></Select><FieldError message={errors.task} /></div></div><DialogFooter><Button variant="outline" onClick={onCancel}>Cancel</Button><Button onClick={save}>Save document</Button></DialogFooter></>;
}

function InactiveRecordsScreen({ projects, tasks, documents, approvals, onRestore }: { projects: Project[]; tasks: Task[]; documents: Doc[]; approvals: Approval[]; onRestore: (type: 'project' | 'task' | 'document' | 'approval', id: string) => void }) {
  const [recordType, setRecordType] = useState<'projects' | 'tasks' | 'documents' | 'approvals'>('projects');
  const inactiveProjects = projects.filter((project: Project) => !project.isActive);
  const inactiveTasks = tasks.filter((task: Task) => !task.isActive);
  const inactiveDocuments = documents.filter((doc: Doc) => !doc.isActive);
  const inactiveApprovals = approvals.filter((approval: Approval) => !approval.isActive);
  return <div className="space-y-4"><InMemoryDataBanner show={HAS_IN_MEMORY_TABLES} message="Restore sets Is Active back to Yes and returns records to normal screens." /><div className="grid gap-4 md:grid-cols-4"><KpiCard title="Inactive Projects" value={String(inactiveProjects.length)} icon={<BriefcaseBusiness className="h-5 w-5" />} /><KpiCard title="Inactive Tasks" value={String(inactiveTasks.length)} icon={<ClipboardList className="h-5 w-5" />} /><KpiCard title="Inactive Documents" value={String(inactiveDocuments.length)} icon={<FileText className="h-5 w-5" />} /><KpiCard title="Inactive Approvals" value={String(inactiveApprovals.length)} icon={<CheckCircle2 className="h-5 w-5" />} /></div><Card><CardHeader><div className="flex items-center justify-between gap-4"><CardTitle>Restore inactive records</CardTitle><Select value={recordType} onValueChange={(value: 'projects' | 'tasks' | 'documents' | 'approvals') => setRecordType(value)}><SelectTrigger className="w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="projects">Projects</SelectItem><SelectItem value="tasks">Tasks</SelectItem><SelectItem value="documents">Documents</SelectItem><SelectItem value="approvals">Document approvals</SelectItem></SelectContent></Select></div></CardHeader><CardContent className="p-0">{recordType === 'projects' && <Table><TableHeader><TableRow><TableHead>Project</TableHead><TableHead>Manager</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{inactiveProjects.map((project: Project) => <TableRow key={project.id}><TableCell className="font-medium">{project.name}</TableCell><TableCell>{project.manager || 'Unassigned'}</TableCell><TableCell><StatusBadge status={project.status} /></TableCell><TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => onRestore('project', project.id)}><RotateCcw className="h-4 w-4" /> Restore</Button></TableCell></TableRow>)}</TableBody></Table>}{recordType === 'tasks' && <Table><TableHeader><TableRow><TableHead>Task</TableHead><TableHead>Project</TableHead><TableHead>Assigned To</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{inactiveTasks.map((task: Task) => <TableRow key={task.id}><TableCell className="font-medium">{task.name}</TableCell><TableCell>{task.project}</TableCell><TableCell>{task.assignedTo}</TableCell><TableCell><StatusBadge status={task.status} /></TableCell><TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => onRestore('task', task.id)}><RotateCcw className="h-4 w-4" /> Restore</Button></TableCell></TableRow>)}</TableBody></Table>}{recordType === 'documents' && <Table><TableHeader><TableRow><TableHead>Document</TableHead><TableHead>Project</TableHead><TableHead>Task</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{inactiveDocuments.map((doc: Doc) => <TableRow key={doc.id}><TableCell className="font-medium">{doc.name}</TableCell><TableCell>{doc.project}</TableCell><TableCell>{doc.task}</TableCell><TableCell><StatusBadge status={doc.status} /></TableCell><TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => onRestore('document', doc.id)}><RotateCcw className="h-4 w-4" /> Restore</Button></TableCell></TableRow>)}</TableBody></Table>}{recordType === 'approvals' && <Table><TableHeader><TableRow><TableHead>Approval</TableHead><TableHead>Document</TableHead><TableHead>Approver</TableHead><TableHead>Decision</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{inactiveApprovals.map((approval: Approval) => <TableRow key={approval.id}><TableCell className="font-medium">{approval.name}</TableCell><TableCell>{approval.documentName}</TableCell><TableCell>{approval.approver}</TableCell><TableCell><StatusBadge status={approval.decision} /></TableCell><TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => onRestore('approval', approval.id)}><RotateCcw className="h-4 w-4" /> Restore</Button></TableCell></TableRow>)}</TableBody></Table>}</CardContent></Card></div>;
}
export default function HomePage() {
  const allProjectList = useCTSProjectList();
  const allTaskList = useCTSTaskList();
  const allDocumentList = useCTSDocumentList();
  const allApprovalList = useCTSDocumentApprovalList();
  const currentUserAccess = useCurrentUserRole();
  const [screen, setScreen] = useState<Screen>('Dashboard');
  const projectList = useCTSProjectList(activeRecordQueryOptions);
  const [uploadPrefillTask, setUploadPrefillTask] = useState<Task | undefined>(undefined);
  const taskList = useCTSTaskList(activeRecordQueryOptions);
  const documentList = useCTSDocumentList(activeRecordQueryOptions);
  const systemUserList = useSystemUserList({ filter: 'isActive eq true' });
  const approvalList = useCTSDocumentApprovalList(activeRecordQueryOptions);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const createApproval = useCreateCTSDocumentApproval();
  const [documents, setDocuments] = useState<Doc[]>(initialDocuments);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [systemUsers, setSystemUsers] = useState<ManagedUser[]>([]);

  const [dialog, setDialog] = useState<DialogState>(null);
  const [selectedWorkspaceProjectId, setSelectedWorkspaceProjectId] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [reassignProjectId, setReassignProjectId] = useState('');
  const createProject = useCreateCTSProject();
  const updateProject = useUpdateCTSProject();
  const allProjects = useMemo(() => (allProjectList.data ?? []).map((project: CTSProject) => fromCTSProject(project)), [allProjectList.data]);
  const allTasks = useMemo(() => resolveTaskAssignees((allTaskList.data ?? []).map((task: CTSTask) => fromCTSTask(task, allProjects)), systemUsers), [allTaskList.data, allProjects, systemUsers]);
  const allDocuments = useMemo(() => (allDocumentList.data ?? []).map((doc: CTSDocument) => fromCTSDocument(doc, allProjects, allTasks)), [allDocumentList.data, allProjects, allTasks]);
  const allApprovals = useMemo(() => (allApprovalList.data ?? []).map((approval: CTSDocumentApproval) => fromCTSDocumentApproval(approval)), [allApprovalList.data]);
  const createTask = useCreateCTSTask();
  const updateTask = useUpdateCTSTask();
  const createDocument = useCreateCTSDocument();
  const updateDocument = useUpdateCTSDocument();
  const updateApproval = useUpdateCTSDocumentApproval();
  const refetchAllRecords = () => {
    void projectList.refetch();
    void taskList.refetch();
    void documentList.refetch();
    void approvalList.refetch();
    void allProjectList.refetch();
    void allTaskList.refetch();
    void allDocumentList.refetch();
    void allApprovalList.refetch();
  };

  const currentSdkUser = useUser();
  const currentUserEmail = currentSdkUser.data?.userPrincipalName ?? currentUserAccess.email;
  const currentAccessUser = useMemo(() => {
    const matchedByEmail = systemUsers.find((systemUser: ManagedUser) => systemUser.isActive && normalize(systemUser.email) === normalize(currentUserEmail));
    if (matchedByEmail) return matchedByEmail;
    const matchedByName = systemUsers.find((systemUser: ManagedUser) => systemUser.isActive && (isSamePerson(systemUser.fullName, currentUserAccess.fullName) || isSamePerson(systemUser.userLookupName, currentUserAccess.fullName)));
    if (matchedByName) return matchedByName;
    return currentUserAccess.systemUser ? fromSystemUser(currentUserAccess.systemUser) : undefined;
  }, [systemUsers, currentUserEmail, currentUserAccess.fullName, currentUserAccess.systemUser]);
  const availableScreens = useMemo<readonly Screen[]>(() => getAccessibleScreens(currentAccessUser?.role, Boolean(currentAccessUser?.isActive)), [currentAccessUser?.role, currentAccessUser?.isActive]);
  const activeProjects = useMemo(() => filterActiveProjects(allProjects), [allProjects]);
  const activeTasks = useMemo(() => filterActiveTasks(allTasks), [allTasks]);
  useEffect(() => {
    console.log('[CTS DEBUG] dashboard source counts', { allProjects: allProjects.length, activeProjects: activeProjects.length, currentUserRole: currentAccessUser?.role, isActiveAdmin: isActiveAdmin(currentAccessUser) });
  }, [allProjects.length, activeProjects.length, currentAccessUser]);
  useEffect(() => {
    console.log('[CTS DEBUG] current user access', { currentUserEmail: normalize(currentUserEmail), currentUserRole: currentAccessUser?.role, currentUserFullName: currentAccessUser?.fullName, isActive: currentAccessUser?.isActive, isActiveAdmin: isActiveAdmin(currentAccessUser) });
    console.log('[CTS DEBUG] loaded custom System User rows', systemUsers.map((user: ManagedUser) => ({ rowId: user.id, dmeo_Email: user.email, dmeo_Role: user.role, dmeo_IsActive: user.isActive ? 'Yes' : 'No', dmeo_FullName: user.fullName, dmeo_UserId: user.userLookupId })));
  }, [currentAccessUser?.role, currentAccessUser?.fullName, currentAccessUser?.isActive, currentUserEmail, systemUsers]);
  const activeDocuments = useMemo(() => filterActiveDocuments(allDocuments), [allDocuments]);
  const activeApprovals = useMemo(() => filterActiveApprovals(allApprovals), [allApprovals]);
  const scopedAllProjects = useMemo(() => getRoleScopedProjects(allProjects, allTasks, currentAccessUser), [allProjects, allTasks, currentAccessUser]);
  const scopedProjects = useMemo(() => filterActiveProjects(scopedAllProjects), [scopedAllProjects]);
  const dashboardProjects = scopedProjects;
  const dashboardTasks = useMemo(() => getRoleScopedTasks(activeTasks, dashboardProjects, currentAccessUser), [activeTasks, dashboardProjects, currentAccessUser]);
  const dashboardDocuments = useMemo(() => getRoleScopedDocuments(activeDocuments, dashboardProjects, currentAccessUser), [activeDocuments, dashboardProjects, currentAccessUser]);
  const scopedTasks = useMemo(() => getRoleScopedTasks(activeTasks, scopedProjects, currentAccessUser), [activeTasks, scopedProjects, currentAccessUser]);
  const scopedDocuments = useMemo(() => getRoleScopedDocuments(activeDocuments, scopedProjects, currentAccessUser), [activeDocuments, scopedProjects, currentAccessUser]);

  const openWorkspaceForProject = (project?: Project) => {
    if (project) setSelectedWorkspaceProjectId(project.id);
    window.history.replaceState(null, '', '#/project-workspace');
    setScreen('Project Workspace');
  };
  const decideDocument = (doc: Doc, decision: 'Approved' | 'Rejected', comments: string) => { if (currentUserAccess.role !== 'Approver' && currentUserAccess.role !== 'Admin') { toast.error('You do not have permission to approve documents'); return; } const relatedTask = tasks.find((task: Task) => task.id === doc.taskId || task.name === doc.task); const nextDocumentStatus: Status = decision === 'Approved' ? 'Approved' : 'Revision Required'; const nextTaskStatus: Status = decision === 'Approved' ? 'Approved' : 'In Progress'; const approvalInput: Omit<CTSDocumentApproval, 'id'> = { approvalName: `${decision} - ${doc.name}`, document: { id: doc.id, documentName: doc.name }, approver: { id: currentAccessUser?.id ?? 'current-user', fullName: currentAccessUser?.fullName ?? 'Current user' }, decisionKey: decision, comments, decisionDate: new Date().toISOString() }; void createApproval.mutateAsync(approvalInput).then((createdApproval: CTSDocumentApproval) => { const updates: Promise<unknown>[] = [updateDocument.mutateAsync({ id: doc.id, changedFields: { statusKey: documentStatusKey(nextDocumentStatus) } })]; if (relatedTask) updates.push(updateTask.mutateAsync({ id: relatedTask.id, changedFields: toCTSTaskStatusUpdate(relatedTask, nextTaskStatus) })); return Promise.all(updates).then(() => createdApproval); }).then((createdApproval: CTSDocumentApproval) => { setApprovals((current: Approval[]) => [fromCTSDocumentApproval(createdApproval), ...current]); setDocuments((current: Doc[]) => current.map((item: Doc) => item.id === doc.id ? { ...item, status: nextDocumentStatus } : item)); if (relatedTask) setTasks((current: Task[]) => current.map((item: Task) => item.id === relatedTask.id ? { ...item, status: nextTaskStatus } : item)); refetchAllRecords(); toast.success(decision === 'Approved' ? 'Document approved' : 'Document rejected'); }).catch(() => toast.error('Approval decision could not be saved')); };
  const submitTaskForApproval = (task: Task) => { if (currentUserAccess.role !== 'Employee' && currentUserAccess.role !== 'Project Manager' && currentUserAccess.role !== 'Admin') { toast.error('You do not have permission to submit tasks'); return; } if (!hasSubmittedDocumentForTask(task, documents)) { toast.warning('Upload a submitted document before submitting this task.'); return; } const nextTask = { ...task, status: 'Submitted' as Status }; void updateTask.mutateAsync({ id: task.id, changedFields: toCTSTaskStatusUpdate(task, 'Submitted') }).then(() => { setTasks((current: Task[]) => current.map((item: Task) => item.id === task.id ? nextTask : item)); refetchAllRecords(); toast.success('Task submitted for approval'); }).catch(() => toast.error('Task could not be submitted')); };
  const openUploadForTask = (task: Task) => { setUploadPrefillTask(task); window.history.replaceState(null, '', '#/upload-document'); setScreen('Upload Document'); };
  useEffect(() => {
    const requestedScreen = routeToScreen(window.location.hash);
    if (!requestedScreen) return;
    if (availableScreens.includes(requestedScreen)) {

      setScreen(requestedScreen);
      return;
    }
    window.history.replaceState(null, '', '#/dashboard');
    setScreen('Dashboard');
    toast.error('You do not have access to this page.');
  }, [availableScreens]);
  const moveTask = (task: Task, status: Status) => { if (currentUserAccess.role !== 'Admin' && currentUserAccess.role !== 'Project Manager') { toast.error('You do not have permission to update tasks'); return; } if (status === 'Approved') { toast.warning('Approved status is set automatically from Approval Center.'); return; } const nextTask = { ...task, status }; void updateTask.mutateAsync({ id: task.id, changedFields: toCTSTaskStatusUpdate(task, status) }).then(() => { setTasks((current: Task[]) => current.map((item: Task) => item.id === task.id ? nextTask : item)); refetchAllRecords(); toast.success('Task status updated'); }).catch(() => toast.error('Task status could not be updated')); };
  useEffect(() => {
    if (!availableScreens.includes(screen)) {
      window.history.replaceState(null, '', '#/dashboard');
      setScreen('Dashboard');
      toast.error('You do not have access to this page.');
    }
  }, [availableScreens, screen]);


  useEffect(() => { if (projectList.data) setProjects(filterActiveProjects(projectList.data.map((project: CTSProject) => fromCTSProject(project)))); }, [projectList.data]);
  useEffect(() => { if (taskList.data) setTasks(resolveTaskAssignees(filterActiveTasks(taskList.data.map((task: CTSTask) => fromCTSTask(task, allProjects))), systemUsers)); }, [taskList.data, allProjects, systemUsers]);
  useEffect(() => { if (approvalList.data) setApprovals(filterActiveApprovals(approvalList.data.map((approval: CTSDocumentApproval) => fromCTSDocumentApproval(approval)))); }, [approvalList.data]);
  useEffect(() => { if (documentList.data) setDocuments(filterActiveDocuments(documentList.data.map((doc: CTSDocument) => fromCTSDocument(doc, allProjects, allTasks)))); }, [documentList.data, allProjects, allTasks]);
  useEffect(() => { if (systemUserList.data) setSystemUsers(systemUserList.data.map((user: SystemUser) => fromSystemUser(user))); }, [systemUserList.data]);

  const closeDialog = () => setDialog(null);
  const saveProject = (project: Project) => { if (dialog?.mode === 'create' && !isActiveAdmin(currentAccessUser)) { toast.error('Only active admins can add projects'); return; } if (currentAccessUser?.role === 'Project Manager' && !isProjectAssignedToCurrentUser(project, currentAccessUser)) { toast.error('You can only edit projects assigned to you.'); return; } if (!isActiveAdmin(currentAccessUser) && currentUserAccess.role !== 'Project Manager') { toast.error('You do not have permission to edit projects'); return; } const persist = dialog?.mode === 'edit' ? updateProject.mutateAsync({ id: project.id, changedFields: toCTSProject(project) }) : createProject.mutateAsync(toCreateCTSProject(project)); void persist.then((savedProject: CTSProject) => { const nextProject = fromCTSProject(savedProject); setProjects((current: Project[]) => dialog?.mode === 'edit' ? current.map((item: Project) => item.id === project.id ? nextProject : item) : [nextProject, ...current]); closeDialog(); refetchAllRecords(); toast.success(dialog?.mode === 'create' ? `Project created successfully. Project Code: ${nextProject.code || 'Pending'}` : 'Project saved'); }).catch(() => toast.error('Project could not be saved')); };
  const saveTask = (task: Task) => { if (!isActiveAdmin(currentAccessUser) && currentUserAccess.role !== 'Project Manager') { toast.error('Admins and project managers can create, edit, reassign, and delete tasks.'); return; } const persist = dialog?.mode === 'edit' ? updateTask.mutateAsync({ id: task.id, changedFields: toCTSTask(task, allProjects) }) : createTask.mutateAsync(toCTSTask(task, allProjects)); void persist.then((savedTask: CTSTask) => { const nextTask = resolveTaskAssignees([dialog?.mode === 'edit' ? task : fromCTSTask(savedTask, allProjects)], systemUsers)[0]; setTasks((current: Task[]) => dialog?.mode === 'edit' ? current.map((item: Task) => item.id === task.id ? nextTask : item) : [nextTask, ...current]); closeDialog(); refetchAllRecords(); toast.success('Task saved'); }).catch((error: unknown) => {
    const message = error instanceof Error && error.message ? error.message : 'Task could not be saved';
    toast.error(message);
  }); };
  const saveDocument = (doc: Doc) => { if (!isActiveAdmin(currentAccessUser) && currentUserAccess.role !== 'Project Manager' && !currentUserAccess.permissions.uploadDocuments) { toast.error('You do not have permission to upload documents'); return; } const persist = dialog?.mode === 'edit' ? updateDocument.mutateAsync({ id: doc.id, changedFields: toCTSDocument(doc, allProjects, allTasks) }) : createDocument.mutateAsync(toCTSDocument(doc, allProjects, allTasks)); void persist.then(() => { setDocuments((current: Doc[]) => dialog?.mode === 'edit' ? current.map((item: Doc) => item.id === doc.id ? doc : item) : [doc, ...current]); closeDialog(); refetchAllRecords(); toast.success('Document saved'); }).catch((error: unknown) => {
    const message = error instanceof Error && error.message ? error.message : 'Document could not be saved';
    toast.error(message);
  }); };
  const confirmDelete = () => {
    if (!deleteTarget) return;
    const action = deleteTarget.type === 'project' ? updateProject.mutateAsync({ id: deleteTarget.id, changedFields: archivedProjectFields }) : deleteTarget.type === 'task' ? updateTask.mutateAsync({ id: deleteTarget.id, changedFields: archivedTaskFields }) : updateDocument.mutateAsync({ id: deleteTarget.id, changedFields: archivedDocumentFields });
    void action.then(() => { if (deleteTarget.type === 'project') setProjects((current: Project[]) => current.filter((project: Project) => project.id !== deleteTarget.id)); if (deleteTarget.type === 'task') setTasks((current: Task[]) => current.filter((task: Task) => task.id !== deleteTarget.id)); if (deleteTarget.type === 'document') setDocuments((current: Doc[]) => current.filter((doc: Doc) => doc.id !== deleteTarget.id)); refetchAllRecords(); toast.success('Record archived'); setDeleteTarget(null); }).catch((error: unknown) => {
      const message = error instanceof Error && error.message ? error.message : 'Record could not be archived';
      toast.error(message);
    });
  };
  const getProjectDeleteDependencies = (target: NonNullable<DeleteTarget>): ProjectDeleteDependencies => {
    const relatedTasks = tasks.filter((task: Task) => normalizeGuid(task.projectId) === normalizeGuid(target.id) || task.project === target.name);
    const relatedTaskIds = new Set(relatedTasks.map((task: Task) => task.id));
    const relatedTaskNames = new Set(relatedTasks.map((task: Task) => task.name));
    const relatedDocuments = documents.filter((doc: Doc) => normalizeGuid(doc.projectId) === normalizeGuid(target.id) || doc.project === target.name || relatedTaskIds.has(doc.taskId) || relatedTaskNames.has(doc.task));
    const relatedDocumentIds = new Set(relatedDocuments.map((doc: Doc) => doc.id));
    const relatedDocumentNames = new Set(relatedDocuments.map((doc: Doc) => doc.name));
    const relatedApprovals = approvals.filter((approval: Approval) => relatedDocumentIds.has(approval.documentId) || relatedDocumentNames.has(approval.documentName));
    return { relatedTasks, relatedDocuments, relatedApprovals };
  };
  const bulkDeleteProjectCleanup = () => {
    if (!deleteTarget || deleteTarget.type !== 'project') return;
    const { relatedTasks, relatedDocuments, relatedApprovals } = getProjectDeleteDependencies(deleteTarget);
    const runCascadeSoftDelete = async () => {
      for (const task of relatedTasks) { await updateTask.mutateAsync({ id: task.id, changedFields: archivedTaskFields }); }
      for (const doc of relatedDocuments) { await updateDocument.mutateAsync({ id: doc.id, changedFields: archivedDocumentFields }); }
      await updateProject.mutateAsync({ id: deleteTarget.id, changedFields: archivedProjectFields });
    };
    void runCascadeSoftDelete().then(() => {
      const deactivatedDocumentIds = new Set(relatedDocuments.map((doc: Doc) => doc.id));
      const deactivatedDocumentNames = new Set(relatedDocuments.map((doc: Doc) => doc.name));
      const deactivatedTaskIds = new Set(relatedTasks.map((task: Task) => task.id));
      setApprovals((current: Approval[]) => current.filter((approval: Approval) => !deactivatedDocumentIds.has(approval.documentId) && !deactivatedDocumentNames.has(approval.documentName)));
      setDocuments((current: Doc[]) => current.filter((doc: Doc) => !deactivatedDocumentIds.has(doc.id)));
      setTasks((current: Task[]) => current.filter((task: Task) => !deactivatedTaskIds.has(task.id)));
      setProjects((current: Project[]) => current.filter((project: Project) => project.id !== deleteTarget.id));
      refetchAllRecords();
      toast.success('Project, tasks, and documents archived');
      setDeleteTarget(null);
    }).catch((error: unknown) => {
      const message = error instanceof Error && error.message ? error.message : 'Deactivate stopped before all project records were updated.';
      toast.error(`Project cleanup stopped: ${message}`);
    });
  };
  const restoreRecord = (type: 'project' | 'task' | 'document' | 'approval', id: string) => {
    const action = type === 'project' ? updateProject.mutateAsync({ id, changedFields: { statusKey: 'Active' as CTSProjectStatusKey } }) : type === 'task' ? updateTask.mutateAsync({ id, changedFields: { statusKey: 'NotStarted' as CTSTaskStatusKey } }) : type === 'document' ? updateDocument.mutateAsync({ id, changedFields: { statusKey: 'Draft' as CTSDocumentStatusKey } }) : Promise.resolve();
    void action.then(() => {
      if (type === 'project') setProjects((current: Project[]) => current.map((project: Project) => project.id === id ? { ...project, status: 'Active', isActive: true } : project));
      if (type === 'task') setTasks((current: Task[]) => current.map((task: Task) => task.id === id ? { ...task, status: 'Not Started', isActive: true } : task));
      if (type === 'document') setDocuments((current: Doc[]) => current.map((doc: Doc) => doc.id === id ? { ...doc, status: 'Draft', isActive: true } : doc));
      refetchAllRecords();
      toast.success('Record restored');
    }).catch((error: unknown) => {
      const message = error instanceof Error && error.message ? error.message : 'Record could not be restored';
      toast.error(message);
    });
  };
  const reactivateProjectCascade = (project: Project) => {
    if (currentUserAccess.role !== 'Admin') { toast.error('Only admins can reactivate inactive projects'); return; }
    const confirmed = window.confirm('This will restore this project along with its tasks and documents. Continue?');
    if (!confirmed) return;
    const relatedTasks = allTasks.filter((task: Task) => normalizeGuid(task.projectId) === normalizeGuid(project.id) || task.project === project.name);
    const relatedTaskIds = new Set(relatedTasks.map((task: Task) => task.id));
    const relatedTaskNames = new Set(relatedTasks.map((task: Task) => task.name));
    const relatedDocuments = allDocuments.filter((doc: Doc) => normalizeGuid(doc.projectId) === normalizeGuid(project.id) || doc.project === project.name || relatedTaskIds.has(doc.taskId) || relatedTaskNames.has(doc.task));
    const relatedDocumentIds = new Set(relatedDocuments.map((doc: Doc) => doc.id));
    const relatedDocumentNames = new Set(relatedDocuments.map((doc: Doc) => doc.name));
    const runReactivate = async () => {
      for (const task of relatedTasks) { await updateTask.mutateAsync({ id: task.id, changedFields: { statusKey: 'NotStarted' as CTSTaskStatusKey } }); }
      for (const doc of relatedDocuments) { await updateDocument.mutateAsync({ id: doc.id, changedFields: { statusKey: 'Draft' as CTSDocumentStatusKey } }); }
      await updateProject.mutateAsync({ id: project.id, changedFields: { statusKey: 'Active' as CTSProjectStatusKey } });
    };
    void runReactivate().then(() => {
      setProjects((current: Project[]) => current.map((item: Project) => item.id === project.id ? { ...item, status: 'Active', isActive: true } : item));
      setTasks((current: Task[]) => current.map((task: Task) => normalizeGuid(task.projectId) === normalizeGuid(project.id) || task.project === project.name ? { ...task, status: 'Not Started', isActive: true } : task));
      setDocuments((current: Doc[]) => current.map((doc: Doc) => normalizeGuid(doc.projectId) === normalizeGuid(project.id) || doc.project === project.name || relatedDocumentIds.has(doc.id) ? { ...doc, status: 'Draft', isActive: true } : doc));
      refetchAllRecords();
      toast.success('Project and related records reactivated');
    }).catch((error: unknown) => {
      const message = error instanceof Error && error.message ? error.message : 'Project could not be reactivated';
      toast.error(message);
    });
  };
  const reassignProjectRecords = () => {
    if (!deleteTarget || deleteTarget.type !== 'project') return;
    const targetProject = projects.find((project: Project) => project.id === reassignProjectId);
    if (!targetProject) { toast.error('Select a project to receive reassigned tasks.'); return; }
    const relatedTasks = tasks.filter((task: Task) => normalizeGuid(task.projectId) === normalizeGuid(deleteTarget.id) || task.project === deleteTarget.name);
    const updatedTasks = relatedTasks.map((task: Task): Task => ({ ...task, project: targetProject.name, projectId: targetProject.id }));
    const reassignActions: Promise<unknown>[] = updatedTasks.map((task: Task) => updateTask.mutateAsync({ id: task.id, changedFields: toCTSTask(task, allProjects) }));
    void Promise.all(reassignActions).then(() => {
      setTasks((current: Task[]) => current.map((task: Task) => normalizeGuid(task.projectId) === normalizeGuid(deleteTarget.id) || task.project === deleteTarget.name ? { ...task, project: targetProject.name, projectId: targetProject.id } : task));
      refetchAllRecords();
      toast.success(`Tasks reassigned to ${targetProject.name}`);
      setReassignProjectId('');
      setDeleteTarget(null);
    }).catch((error: unknown) => {
      const message = error instanceof Error && error.message ? error.message : 'Project tasks could not be reassigned';
      toast.error(message);
    });
  };
  const inactiveRecordCount = useMemo(() => allProjects.filter((project: Project) => !project.isActive).length + allTasks.filter((task: Task) => !task.isActive).length + allDocuments.filter((doc: Doc) => !doc.isActive).length, [allProjects, allTasks, allDocuments]);
  const content = useMemo(() => {
    if (screen === 'Dashboard') return <Dashboard projects={dashboardProjects} tasks={dashboardTasks} documents={dashboardDocuments} role={currentAccessUser?.role} inactiveRecordCount={inactiveRecordCount} totalProjectCount={dashboardProjects.length} />;
    if (screen === 'Projects') return <ProjectsScreen projects={scopedAllProjects} tasks={scopedTasks} documents={scopedDocuments} role={currentAccessUser?.role} currentAccessUser={currentAccessUser} openProject={openWorkspaceForProject} openCreate={() => setDialog({ type: 'project', mode: 'create' })} onEdit={(project: Project) => setDialog({ type: 'project', mode: 'edit', item: project })} onDelete={(project: Project) => setDeleteTarget({ type: 'project', id: project.id, name: project.name })} onReactivate={reactivateProjectCascade} />;
    if (screen === 'Project Workspace') return <Workspace projects={scopedProjects} tasks={scopedTasks} documents={scopedDocuments} approvals={activeApprovals} systemUsers={systemUsers} role={currentAccessUser?.role} currentAccessUser={currentAccessUser} selectedProjectId={selectedWorkspaceProjectId} onProjectChange={setSelectedWorkspaceProjectId} />;
    if (screen === 'Tasks') return <TasksScreen tasks={scopedTasks} projects={scopedProjects} role={currentAccessUser?.role} openCreate={() => setDialog({ type: 'task', mode: 'create' })} onEdit={(task: Task) => setDialog({ type: 'task', mode: 'edit', item: task })} onDelete={(task: Task) => setDeleteTarget({ type: 'task', id: task.id, name: task.name })} onMoveTask={moveTask} />;
    if (screen === 'My Tasks') return <MyTasks tasks={scopedTasks} documents={scopedDocuments} role={currentAccessUser?.role} currentAccessUser={currentAccessUser} onUploadDocument={openUploadForTask} onSubmitTask={submitTaskForApproval} />;
    if (screen === 'Documents') return <DocumentsScreen documents={scopedDocuments} upload={() => { setUploadPrefillTask(undefined); setScreen('Upload Document'); }} onEdit={(doc: Doc) => setDialog({ type: 'document', mode: 'edit', item: doc })} onDelete={(doc: Doc) => setDeleteTarget({ type: 'document', id: doc.id, name: doc.name })} />;
    if (screen === 'Upload Document') return <UploadDocument projects={scopedProjects} tasks={scopedTasks} systemUsers={systemUsers} prefillTask={uploadPrefillTask} currentAccessUser={currentAccessUser} role={currentAccessUser?.role} onCreate={saveDocument} />;
    if (screen === 'Approval Center') return <ApprovalCenter documents={scopedDocuments} approvals={activeApprovals} role={currentAccessUser?.role} currentAccessUser={currentAccessUser} onDecision={decideDocument} />;
    if (screen === 'Inactive Records') return <InactiveRecordsScreen projects={allProjects} tasks={allTasks} documents={allDocuments} approvals={allApprovals} onRestore={restoreRecord} />;
    return <AccessManagement role={currentAccessUser?.role} currentAccessUser={currentAccessUser} />;
  }, [screen, dashboardProjects, dashboardTasks, dashboardDocuments, scopedAllProjects, scopedProjects, scopedTasks, scopedDocuments, activeTasks, activeDocuments, activeApprovals, allProjects, allTasks, allDocuments, allApprovals, inactiveRecordCount, systemUsers, uploadPrefillTask, selectedWorkspaceProjectId, dialog?.mode, currentUserAccess.role, currentUserAccess.permissions, currentAccessUser]);
  const deleteSummary = deleteTarget?.type === 'project' ? getProjectDeleteDependencies(deleteTarget) : undefined;
  return <div className="bg-background"><AppHeader screen={screen} setScreen={setScreen} availableScreens={availableScreens} userName={currentUserAccess.fullName ?? currentAccessUser?.fullName} userRole={currentAccessUser?.role} /><main className="p-6"><div className="mx-auto max-w-7xl space-y-5"><div><h1 className="text-2xl font-semibold tracking-tight">{screen}</h1><p className="text-muted-foreground">Dataverse-optimized construction delivery workspace with generated-hook lists, validation, and role-based project access.</p></div>{screen === 'Project Workspace' && <GlobalProjectWorkspacePicker projects={scopedProjects} role={currentAccessUser?.role} selectedProjectId={selectedWorkspaceProjectId} onOpenProject={(project: Project) => setSelectedWorkspaceProjectId(project.id)} />}{content}</div></main><Dialog open={dialog !== null} onOpenChange={(open: boolean) => { if (!open) closeDialog(); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">{dialog?.type === 'project' && <ProjectForm mode={dialog.mode} item={dialog.item} systemUsers={systemUsers} onCancel={closeDialog} onSave={saveProject} />}{dialog?.type === 'task' && <TaskForm mode={dialog.mode} item={dialog.item} projects={scopedProjects} systemUsers={systemUsers} onCancel={closeDialog} onSave={saveTask} />}{dialog?.type === 'document' && <DocumentForm mode={dialog.mode} item={dialog.item} projects={scopedProjects} tasks={scopedTasks} onCancel={closeDialog} onSave={saveDocument} />}</DialogContent></Dialog><AlertDialog open={deleteTarget !== null} onOpenChange={(open: boolean) => { if (!open) { setDeleteTarget(null); setReassignProjectId(''); } }}><AlertDialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl"><AlertDialogHeader><AlertDialogTitle>{deleteTarget?.type === 'project' ? 'Archive project' : 'Archive record'}</AlertDialogTitle><AlertDialogDescription>{deleteTarget?.type === 'project' && deleteSummary ? `This will archive this project along with ${deleteSummary.relatedTasks.length} ${deleteSummary.relatedTasks.length === 1 ? 'Task' : 'Tasks'} and ${deleteSummary.relatedDocuments.length} ${deleteSummary.relatedDocuments.length === 1 ? 'Document' : 'Documents'}. They will be hidden from all views but the data will be preserved. Continue?` : `Hide ${deleteTarget?.name}? This sets Status to Archived instead of physically deleting the record.`}</AlertDialogDescription></AlertDialogHeader>{deleteTarget?.type === 'project' && deleteSummary && <div className="rounded-lg border bg-card p-4 text-card-foreground"><p className="font-medium">Deactivate project and related records</p><p className="mt-2 text-sm text-muted-foreground">The project cascade archives tasks first, documents second, and the project last. Approval records remain unchanged as historical records. Reassign records only moves tasks to another project and does not change Status on any record.</p></div>}{deleteTarget?.type === 'project' && <div className="space-y-2"><Label>Reassign related tasks to</Label><Select value={reassignProjectId} onValueChange={setReassignProjectId}><SelectTrigger className="w-56"><SelectValue placeholder="Choose project" /></SelectTrigger><SelectContent>{projects.filter((project: Project) => project.id && project.id !== deleteTarget.id).map((project: Project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}</SelectContent></Select></div>}<AlertDialogFooter className="grid gap-2 sm:grid-cols-2"><AlertDialogCancel className="w-full">Cancel</AlertDialogCancel>{deleteTarget?.type === 'project' && <Button variant="outline" className="w-full whitespace-normal text-wrap" onClick={reassignProjectRecords}>Reassign records</Button>}{deleteTarget?.type === 'project' && <Button variant="destructive" className="w-full whitespace-normal text-wrap" onClick={bulkDeleteProjectCleanup}><Archive className="h-4 w-4 shrink-0" /> Deactivate project and related records</Button>}{deleteTarget?.type !== 'project' && <AlertDialogAction onClick={confirmDelete}>Soft delete only</AlertDialogAction>}</AlertDialogFooter></AlertDialogContent></AlertDialog></div>;
}
