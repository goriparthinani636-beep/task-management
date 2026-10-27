import { api } from './api';

export type EmployeePayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  status: string;
  resumeUrl: string | null;
  resumeFileName: string | null;
};

export async function removeEmployeeResume(id: number) {
  const response = await api.delete(`/employees/${id}/resume`);
  if (response.data?.success === false) {
    throw new Error(response.data.message || 'The server could not remove the resume.');
  }
  const saved = (await api.get(`/employees/${id}`)).data;
  if (!saved || saved.id !== id || saved.resumeUrl || saved.resumeFileName) {
    throw new Error('Resume removal could not be verified. Refresh the employee before retrying.');
  }
  return saved;
}

export async function saveEmployee(payload: EmployeePayload, id?: number, onAccepted?: (id: number) => void, password?: string) {
  const request = password ? { ...payload, password } : payload;
  const result = id !== undefined
    ? await api.put(`/employees/${id}`, request)
    : await api.post('/employees', request);
  if (result.data?.success === false) {
    throw new Error(result.data.message || 'The server rejected the employee changes.');
  }
  const savedId = id ?? result.data?.id;
  if (typeof savedId !== 'number') {
    throw new Error('The server did not confirm the saved employee. Refresh before adding again.');
  }
  onAccepted?.(savedId);
  let saved;
  try {
    saved = (await api.get(`/employees/${savedId}`)).data;
  } catch {
    throw new Error('The save was accepted, but could not be verified. Refresh before saving again.');
  }
  for (const key of Object.keys(payload) as (keyof EmployeePayload)[]) {
    if ((saved?.[key] ?? null) !== (payload[key] ?? null)) {
      if (key === 'resumeUrl' || key === 'resumeFileName') {
        throw new Error('Employee details were saved, but the backend did not save the resume. The employee API and database need the resume update.');
      }
      throw new Error('The server did not retain all employee changes. Refresh and try again.');
    }
  }
  return saved;
}
