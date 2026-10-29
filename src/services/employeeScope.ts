// Manager and employee access rules: correct employee profile and tasks select chesthundi.
import { api } from './api';
import type { Employee } from '../screens/EmployeesScreen';
import type { TaskItem } from '../screens/TasksScreen';

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: 'Manager' | 'Employee';
  employeeId: number | null;
};

export function validateSessionUser(
  value: unknown,
  email?: string,
  role?: SessionUser['role'],
): SessionUser {
  const user = value as Partial<SessionUser> | null;
  if (
    !user ||
    !Number.isInteger(user.id) ||
    (user.id ?? 0) <= 0 ||
    typeof user.email !== 'string' ||
    typeof user.name !== 'string' ||
    !['Manager', 'Employee'].includes(user.role ?? '') ||
    (user.role === 'Employee' &&
      (!Number.isInteger(user.employeeId) || (user.employeeId ?? 0) <= 0))
  ) {
    throw new Error(
      'The server is missing employee login details. Deploy the updated EmployeeApi backend, then sign in again.',
    );
  }
  if (
    (email && user.email.trim().toLowerCase() !== email.trim().toLowerCase()) ||
    (role && user.role !== role)
  ) {
    throw new Error(
      'The server returned a different login account. Sign out and try again.',
    );
  }
  return user as SessionUser;
}

export async function loadMyEmployee(user: SessionUser): Promise<Employee> {
  if (user.role !== 'Employee' || !user.employeeId)
    throw new Error('An employee login is required.');
  let data: Employee;
  try {
    data = (await api.get<Employee>('/employees/me')).data;
  } catch (error: any) {
    if (error?.response?.status === 404)
      throw new Error(
        'Your employee profile endpoint is unavailable. Deploy the updated backend and check your employee account link.',
      );
    throw error;
  }
  if (
    data?.id !== user.employeeId ||
    data.email?.trim().toLowerCase() !== user.email.trim().toLowerCase()
  ) {
    throw new Error(
      'The server returned a different employee profile. No details were displayed. Contact your manager to check the account link.',
    );
  }
  return data;
}

export async function loadScopedTasks(user: SessionUser): Promise<TaskItem[]> {
  const path = user.role === 'Manager' ? '/tasks' : '/employees/me/tasks';
  const data: TaskItem[] = (await api.get(path)).data;
  if (
    !Array.isArray(data) ||
    (user.role === 'Employee' && data.some((task) => task.employeeId !== user.employeeId))
  ) {
    throw new Error(
      'The server returned tasks for a different employee. Contact your manager to update the backend.',
    );
  }
  return data;
}
