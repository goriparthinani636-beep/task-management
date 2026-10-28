export function notificationTaskId(data: Record<string, unknown> | undefined, user: {
  id: number; employeeId: number | null;
} | null): number | null {
  if (!user || !data || data.type !== 'task-assigned' || data.recipientUserId !== user.id ||
      data.employeeId !== user.employeeId || typeof data.taskId !== 'number' ||
      !Number.isSafeInteger(data.taskId) || data.taskId <= 0) return null;
  return data.taskId;
}
