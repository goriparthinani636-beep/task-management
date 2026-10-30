// Notification tap data current user ki belong avuthundha ani validate chesthundi.
export function notificationTaskId(
  data: Record<string, unknown> | undefined,
  user: {
    id: number;
    employeeId: number | null;
  } | null,
): number | null {
  if (
    !user ||
    !data ||
    data.type !== 'task-assigned' ||
    data.recipientUserId !== user.id ||
    data.employeeId !== user.employeeId ||
    typeof data.taskId !== 'number' ||
    !Number.isSafeInteger(data.taskId) ||
    data.taskId <= 0
  )
    return null;
  return data.taskId;
}

// Leave decisions must match both the account and linked employee.
export function notificationLeaveId(
  data: Record<string, unknown> | undefined,
  user: { id: number; employeeId: number | null } | null,
): number | null {
  if (
    !user ||
    user.employeeId === null ||
    !data ||
    data.type !== 'leave-decision' ||
    data.recipientUserId !== user.id ||
    data.employeeId !== user.employeeId ||
    typeof data.leaveId !== 'number' ||
    !Number.isSafeInteger(data.leaveId) ||
    data.leaveId <= 0
  )
    return null;
  return data.leaveId;
}
