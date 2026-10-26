
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../services/api';
import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE, deleteUploadedFile, openFile, uploadedFiles as parseUploadedFiles, type UploadedFile } from '../services/files';

type SelectedFile = {
  id: string;
  name: string;
  uri: string;
  size: number;
  mimeType: string | null;
  remark: string;
};

const MAX_FILES = 5;

export const FileUploadScreen = () => {
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const deleting = useRef(false);

  const confirmDelete = (file: UploadedFile) => {
    Alert.alert('Delete file?', `Permanently delete "${file.fileName}" from uploads and storage? If it is an employee resume, remove it from the employee profile first.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        if (deleting.current) return;
        deleting.current = true;
        setDeletingId(file.id);
        try {
          await deleteUploadedFile(file.id);
          setUploadedFiles(previous => previous.filter(item => item.id !== file.id));
          Alert.alert('Deleted', 'The file was deleted.');
        } catch (error: any) {
          Alert.alert('Delete failed', error?.response?.data?.message ?? error?.message ?? 'Could not delete the file. Please retry.');
        } finally {
          deleting.current = false;
          setDeletingId(null);
        }
      } },
    ]);
  };

  const loadUploadedFiles = useCallback(async (refresh = false, reportError = true) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const response = await api.get<UploadedFile[]>('/FileUploads');
      setUploadedFiles(parseUploadedFiles(response.data));
      return true;
    } catch (error: any) {
      console.error(
        'LOAD FILES ERROR:',
        error?.response?.status,
        error?.response?.data ?? error?.message,
      );

      if (reportError) Alert.alert(
        'Unable to load files',
        error?.response?.status === 401
          ? 'Please log in again.'
          : 'Could not load uploaded files. Check your connection and try again.',
      );
      return false;
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadUploadedFiles();
    }, [loadUploadedFiles]),
  );

  const pickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const invalidFiles: string[] = [];
      const existingUris = new Set(files.map(file => file.uri));
      const newFiles: SelectedFile[] = [];

      for (const file of result.assets) {
        if (files.length + newFiles.length >= MAX_FILES) {
          invalidFiles.push(`${file.name}: Maximum 5 files per upload.`);
          continue;
        }

        const extension = file.name.split('.').pop()?.toLowerCase();

        if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
          invalidFiles.push(`${file.name}: Unsupported format.`);
          continue;
        }

        if (typeof file.size !== 'number' || file.size <= 0) {
          invalidFiles.push(`${file.name}: File size unavailable or empty.`);
          continue;
        }

        if (file.size > MAX_FILE_SIZE) {
          invalidFiles.push(`${file.name}: Maximum size is 5 MB.`);
          continue;
        }

        if (existingUris.has(file.uri)) {
          invalidFiles.push(`${file.name}: Already selected.`);
          continue;
        }

        existingUris.add(file.uri);

        newFiles.push({
          id: `${file.uri}-${Date.now()}-${newFiles.length}`,
          name: file.name,
          uri: file.uri,
          size: file.size,
          mimeType: file.mimeType ?? null,
          remark: '',
        });
      }

      setFiles(previous => [...previous, ...newFiles]);

      if (invalidFiles.length > 0) {
        Alert.alert(
          'Some files were not added',
          invalidFiles.slice(0, 5).join('\n') +
            (invalidFiles.length > 5
              ? `\nAnd ${invalidFiles.length - 5} more file(s).`
              : ''),
        );
      }
    } catch (error) {
      console.error('FILE PICKER ERROR:', error);
      Alert.alert('Error', 'Unable to select files.');
    }
  };

  const updateRemark = (id: string, remark: string) => {
    setFiles(previous =>
      previous.map(file => (file.id === id ? { ...file, remark } : file)),
    );
  };

  const removeFile = (id: string) => {
    setFiles(previous => previous.filter(file => file.id !== id));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (value: string) => {
    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleString();
  };

  const uploadFiles = async () => {
    if (isUploading) return;

    if (files.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one file.');
      return;
    }

    const invalidFiles = files.filter(
      file =>
        !file.remark.trim() ||
        file.remark.trim().length > 1000 ||
        file.size > MAX_FILE_SIZE ||
        !ALLOWED_EXTENSIONS.includes(
          file.name.split('.').pop()?.toLowerCase() ?? '',
        ),
    );

    if (invalidFiles.length > 0) {
      Alert.alert(
        'Validation Error',
        'Check file format, size and required remark (maximum 1000 characters) for:\n' +
          invalidFiles.map(file => file.name).join('\n'),
      );
      return;
    }

    const formData = new FormData();

    files.forEach(file => {
      formData.append(
        'files',
        {
          uri: file.uri,
          name: file.name,
          type: file.mimeType ?? 'application/octet-stream',
        } as any,
      );

      // Backend expects a List<string> named "remarks".
      formData.append('remarks', file.remark.trim());
    });

    setIsUploading(true);

    try {
      const response = await api.post('/FileUploads', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000,
      });

      const savedFiles = parseUploadedFiles(response.data, files.length);
      setUploadedFiles(previous => [...savedFiles, ...previous.filter(item => !savedFiles.some(saved => saved.id === item.id))]);
      setFiles([]);
      const refreshed = await loadUploadedFiles(false, false);
      Alert.alert('Upload complete', refreshed
        ? 'Files uploaded successfully.'
        : 'Files were uploaded, but the list could not be refreshed. Your uploaded files are shown; refresh again when connected.');
    } catch (error: any) {
      console.error(
        'FILE UPLOAD ERROR:',
        error?.response?.status,
        error?.response?.data ?? error?.message,
      );

      const message =
        error?.response?.data?.message ??
        error?.response?.data?.title ??
        error?.message ??
        'Upload failed. Check your internet connection and server configuration.';

      Alert.alert('Upload Failed', String(message));
    } finally {
      setIsUploading(false);
    }
  };

  const openUploadedFile = async (url: string) => {
    try {
      await openFile(url);
    } catch (error) {
      console.error('OPEN FILE ERROR:', error);
      Alert.alert(
        'Cannot Open File',
        error instanceof Error ? error.message : 'Unable to open the saved file link.',
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>File Uploads</Text>
      <Text style={styles.help}>
        PDF, JPG, JPEG, PNG and DOCX. Maximum 5 files per upload, 5 MB each.
        Every file requires a remark.
      </Text>

      <Button
        title="Select Files"
        onPress={pickFiles}
        disabled={isUploading || deletingId !== null || files.length >= MAX_FILES}
      />

      {files.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Files ready to upload</Text>

          <FlatList
            style={styles.list}
            data={files}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.fileCard}>
                <Text style={styles.fileName}>{item.name}</Text>
                <Text>Size: {formatSize(item.size)}</Text>

                <TextInput
                  style={styles.input}
                  placeholder="Enter required remark"
                  value={item.remark}
                  onChangeText={text => updateRemark(item.id, text)}
                  editable={!isUploading}
                  maxLength={1000}
                />

                <Button
                  title="Remove File"
                  color="red"
                  onPress={() => removeFile(item.id)}
                  disabled={isUploading}
                />
              </View>
            )}
          />

          <Button
            title={isUploading ? 'Uploading...' : 'Upload Files'}
            onPress={uploadFiles}
            disabled={isUploading || deletingId !== null}
          />
        </>
      )}

      <Text style={styles.sectionTitle}>Uploaded Files</Text>

      {isLoading ? (
        <ActivityIndicator
          size="large"
          color="#2563EB"
          style={styles.loader}
        />
      ) : (
        <FlatList
          style={styles.uploadedList}
          data={uploadedFiles}
          keyExtractor={item => String(item.id)}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void loadUploadedFiles(true)}
            />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>No uploaded files found.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.fileCard}>
              <Text style={styles.fileName}>{item.fileName}</Text>
              <Text>Format: {item.fileFormat}</Text>
              <Text>Size: {formatSize(item.fileSize)}</Text>
              <Text>Remark: {item.remark}</Text>
              <Text>Uploaded: {formatDate(item.uploadedAt)}</Text>

              <View style={styles.openButton}>
                <Button
                  title="Open File"
                  onPress={() => void openUploadedFile(item.fileUrl)}
                  disabled={deletingId === item.id}
                />
              </View>
              <View style={styles.openButton}>
                <Button
                  title={deletingId === item.id ? 'Deleting...' : 'Delete File'}
                  color="#DC2626"
                  onPress={() => confirmDelete(item)}
                  disabled={deletingId !== null || isUploading || isRefreshing}
                />
              </View>
            </View>
          )}
        />
      )}

      <View style={styles.refreshButton}>
        <Button
          title="Refresh Uploaded Files"
          onPress={() => void loadUploadedFiles(true)}
          disabled={isLoading || isRefreshing || deletingId !== null}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  help: {
    color: '#555555',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  list: {
    maxHeight: 260,
  },
  uploadedList: {
    flex: 1,
    marginTop: 4,
  },
  empty: {
    marginVertical: 20,
    color: '#666666',
  },
  fileCard: {
    padding: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#BBBBBB',
    borderRadius: 6,
    padding: 10,
    marginVertical: 10,
  },
  loader: {
    marginVertical: 24,
  },
  openButton: {
    marginTop: 8,
  },
  refreshButton: {
    marginTop: 8,
    marginBottom: 4,
  },
});
