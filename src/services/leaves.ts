// Leave API: employee applications and manager decisions use separate server permissions.
import { api } from './api';
import { isAxiosError } from 'axios';

export const LEAVE_TYPES = ['Casual', 'Sick', 'Annual', 'Unpaid'] as const;
export interface LeaveItem {
  id: number;
  employeeId: number;
  employeeName: string | null;
  startDate: string;
  endDate: string;
  days: number;
  leaveType: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  managerComment: string | null;
  notificationWarning?: string | null;
}
export function validateLeave(
  startDate: string,
  endDate: string,
  reason: string,
  today: string,
): string | null {
  const validDate = (value: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value;
  if (!validDate(startDate) || !validDate(endDate))
    return 'Enter valid dates in YYYY-MM-DD format.';
  if (startDate < today) return 'Start date must be today or a future date.';
  if (endDate < startDate) return 'End date must be on or after the start date.';
  if ((Date.parse(endDate) - Date.parse(startDate)) / 86400000 > 365)
    return 'Choose a leave period of at most 366 days.';
  if (!reason.trim()) return 'Enter a reason for your leave.';
  if (reason.trim().length > 1000) return 'Reason must be 1000 characters or fewer.';
  return null;
}
export const listLeaves = async () => (await api.get<LeaveItem[]>('/leaves')).data;
export const applyLeave = async (values: {
  startDate: string;
  endDate: string;
  leaveType: string;
  reason: string;
}) => (await api.post<LeaveItem>('/leaves', values)).data;
export const reviewLeave = async (
  id: number,
  status: 'Approved' | 'Rejected',
  comment: string,
) => (await api.patch<LeaveItem>(`/leaves/${id}/decision`, { status, comment })).data;

export function leaveErrorMessage(error: unknown): string {
  if (!isAxiosError(error))
    return 'Unable to complete the leave request. Please try again.';
  const status = error.response?.status;
  const serverMessage = error.response?.data?.message;
  if (typeof serverMessage === 'string' && serverMessage.trim()) return serverMessage;
  if (status === 404)
    return 'The server does not have the leave feature yet. Deploy the updated EmployeeApi backend, then try again.';
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403)
    return 'Your account does not have permission for this leave action.';
  if (status && status >= 500)
    return 'The leave server could not complete the request. Ask your manager to check the LeaveRequests database table and backend logs.';
  if (!error.response)
    return 'Unable to reach the server. Check your internet connection and try again.';
  return 'Unable to complete the leave request. Please try again.';
}
