import { api } from './api';

export type AadhaarVerificationStatus = {
  isEnrolled: boolean;
  isVerified: boolean;
};

export async function getAadhaarVerificationStatus() {
  const response = await api.get<AadhaarVerificationStatus>(
    '/employees/me/aadhaar-status',
  );
  return response.data;
}

export async function verifyAadhaarLastFour(lastFour: string) {
  const response = await api.post<{ isVerified: boolean; message: string }>(
    '/employees/me/aadhaar-verification',
    { lastFour },
  );
  return response.data;
}
