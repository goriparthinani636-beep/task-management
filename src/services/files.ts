// Document API requests and upload data preparation.
import { Linking } from 'react-native';
import { api } from './api';

export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'docx'];

export async function deleteUploadedFile(id: number) {
  const response = await api.delete(`/FileUploads/${id}`);
  if (response.data?.success === false) {
    throw new Error(response.data.message || 'The server could not delete the file.');
  }
}

export type UploadedFile = {
  id: number;
  fileName: string;
  remark: string;
  fileFormat: string;
  fileSize: number;
  fileUrl: string;
  uploadedAt: string;
};

export function fileUrl(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('No file link was saved. Please upload the file again.');
  }
  const url = new URL(value.trim(), `${new URL(api.defaults.baseURL!).origin}/`);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('The server returned an invalid file link.');
  }
  return url.href;
}

export function uploadedFiles(data: unknown, expectedCount?: number): UploadedFile[] {
  const body = data as { files?: unknown; success?: boolean; message?: string } | null;
  if (body?.success === false)
    throw new Error(body.message || 'The server rejected the upload.');
  const records = Array.isArray(data) ? data : body?.files;
  if (
    !Array.isArray(records) ||
    (expectedCount !== undefined && records.length !== expectedCount)
  ) {
    throw new Error(
      'The server did not confirm all uploaded files. Refresh the list before retrying.',
    );
  }
  return records.map((record) => {
    if (!record || typeof record.id !== 'number' || typeof record.fileName !== 'string') {
      throw new Error('The server returned an invalid file record.');
    }
    return { ...record, fileUrl: fileUrl(record.fileUrl) } as UploadedFile;
  });
}

export function validateFile(name: string, size: number | undefined, resume = false) {
  const extensions = resume ? ['pdf', 'docx'] : ALLOWED_EXTENSIONS;
  if (!extensions.includes(name.split('.').pop()?.toLowerCase() ?? '')) {
    throw new Error(resume ? 'Choose a PDF or DOCX resume.' : 'Unsupported file format.');
  }
  if (typeof size !== 'number' || size <= 0 || size > MAX_FILE_SIZE) {
    throw new Error('Choose a non-empty file of 5 MB or less.');
  }
}

export async function openFile(value: unknown) {
  // Opening a web link directly avoids Android package-visibility false negatives
  // from canOpenURL. It does not send the app's bearer token to a file host.
  const url = fileUrl(value);
  if (new URL(url).hostname === 'res.cloudinary.com') {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(url, { method: 'HEAD', signal: controller.signal });
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          'The file host denied access. The server administrator needs to check this file’s delivery permissions.',
        );
      }
      if (response.status === 404) {
        throw new Error(
          'This saved file link no longer exists. Please upload the document again.',
        );
      }
      if (!response.ok && response.status !== 405) {
        throw new Error('The file host is unavailable. Please try again later.');
      }
    } finally {
      clearTimeout(timer);
    }
  }
  await Linking.openURL(url);
}
