// Documents page: file select, remarks add, upload and saved files display.
import { AppIcon } from '../components/AppIcon';
import { ScreenHeading, EmptyState, SectionTitle } from '../components/ScreenUI';
import { Button } from '../components/Button';
import { Layout } from '../theme/layout';
import { Colors } from '../theme/colors';

import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from 'expo-router';
import { api } from '../services/api';
import {
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
  deleteUploadedFile,
  openFile,
  uploadedFiles as parseUploadedFiles,
  type UploadedFile,
} from '../services/files';

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
    Alert.alert(
      'Delete file?',
      `Permanently delete "${file.fileName}" from uploads and storage? If it is an employee resume, remove it from the employee profile first.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (deleting.current) return;
            deleting.current = true;
            setDeletingId(file.id);
            try {
              await deleteUploadedFile(file.id);
              setUploadedFiles((previous) =>
                previous.filter((item) => item.id !== file.id),
              );
              Alert.alert('Deleted', 'The file was deleted.');
            } catch (error: any) {
              Alert.alert(
                'Delete failed',
                error?.response?.data?.message ??
                  error?.message ??
                  'Could not delete the file. Please retry.',
              );
            } finally {
              deleting.current = false;
              setDeletingId(null);
            }
          },
        },
      ],
    );
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

      if (reportError)
        Alert.alert(
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
      const existingUris = new Set(files.map((file) => file.uri));
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

      setFiles((previous) => [...previous, ...newFiles]);

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
    setFiles((previous) =>
      previous.map((file) => (file.id === id ? { ...file, remark } : file)),
    );
  };

  const removeFile = (id: string) => {
    setFiles((previous) => previous.filter((file) => file.id !== id));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (value: string) => {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  };

  const uploadFiles = async () => {
    if (isUploading) return;

    if (files.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one file.');
      return;
    }

    const invalidFiles = files.filter(
      (file) =>
        !file.remark.trim() ||
        file.remark.trim().length > 1000 ||
        file.size > MAX_FILE_SIZE ||
        !ALLOWED_EXTENSIONS.includes(file.name.split('.').pop()?.toLowerCase() ?? ''),
    );

    if (invalidFiles.length > 0) {
      Alert.alert(
        'Validation Error',
        'Check file format, size and required remark (maximum 1000 characters) for:\n' +
          invalidFiles.map((file) => file.name).join('\n'),
      );
      return;
    }

    const formData = new FormData();

    files.forEach((file) => {
      formData.append('files', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType ?? 'application/octet-stream',
      } as any);

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
      setUploadedFiles((previous) => [
        ...savedFiles,
        ...previous.filter((item) => !savedFiles.some((saved) => saved.id === item.id)),
      ]);
      setFiles([]);
      const refreshed = await loadUploadedFiles(false, false);
      Alert.alert(
        'Upload complete',
        refreshed
          ? 'Files uploaded successfully.'
          : 'Files were uploaded, but the list could not be refreshed. Your uploaded files are shown; refresh again when connected.',
      );
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
      <FlatList
        data={uploadedFiles}
        keyExtractor={(item) => String(item.id)}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void loadUploadedFiles(true)}
            tintColor={Colors.primary}
          />
        }
        ListHeaderComponent={
          <>
            <ScreenHeading
              eyebrow="WORKSPACE / DOCUMENTS"
              title="Files & documents"
              subtitle="Keep your work organised and within reach."
            />
            <View style={styles.uploadPanel}>
              <View style={styles.uploadIcon}>
                <AppIcon name="folder" size={28} />
              </View>
              <Text style={styles.uploadTitle}>A place for your important files</Text>
              <Text style={styles.help}>
                PDF, JPG, PNG or DOCX · Up to 5 MB each{'\n'}Choose up to 5 files per
                upload.
              </Text>
              <Button
                title="+  Choose files"
                onPress={pickFiles}
                disabled={isUploading || deletingId !== null || files.length >= MAX_FILES}
              />
            </View>
            {!!files.length && (
              <View style={{ marginTop: 24 }}>
                <SectionTitle
                  title="Ready to upload"
                  detail={files.length + ' SELECTED'}
                />
                {files.map((item) => (
                  <View style={styles.fileCard} key={item.id}>
                    <View style={styles.fileTop}>
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeText}>
                          {item.name.split('.').pop()?.toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fileName}>{item.name}</Text>
                        <Text style={styles.meta}>{formatSize(item.size)}</Text>
                      </View>
                    </View>
                    <Text style={styles.remarkLabel}>REMARK *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Add a short note about this file"
                      placeholderTextColor={Colors.textMuted}
                      accessibilityLabel={'Remark for ' + item.name}
                      value={item.remark}
                      onChangeText={(text) => updateRemark(item.id, text)}
                      editable={!isUploading}
                      maxLength={1000}
                    />
                    <Button
                      title="Remove from selection"
                      color={Colors.error}
                      variant="ghost"
                      onPress={() => removeFile(item.id)}
                      disabled={isUploading}
                    />
                  </View>
                ))}
                <Button
                  title={
                    isUploading
                      ? 'Uploading your files…'
                      : 'Upload ' +
                        files.length +
                        (files.length === 1 ? ' file' : ' files')
                  }
                  onPress={uploadFiles}
                  disabled={isUploading || deletingId !== null}
                />
              </View>
            )}
            <View style={styles.libraryHeading}>
              <SectionTitle
                title="Document library"
                detail={uploadedFiles.length + ' FILES'}
              />
            </View>
          </>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 30 }} />
          ) : (
            <EmptyState
              icon="folder"
              title="Make room for good work"
              message="Your uploaded documents will appear here. Choose a file above to get started."
            />
          )
        }
        renderItem={({ item }) => (
          <View style={styles.fileCard}>
            <View style={styles.fileTop}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeText}>
                  {(item.fileFormat || item.fileName.split('.').pop() || 'FILE')
                    .toUpperCase()
                    .replace('.', '')}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fileName}>{item.fileName}</Text>
                <Text style={styles.meta}>
                  {formatSize(item.fileSize)} · {formatDate(item.uploadedAt)}
                </Text>
              </View>
            </View>
            <View style={styles.remarkBox}>
              <Text style={styles.remarkLabel}>NOTE</Text>
              <Text style={styles.remarkText}>
                {item.remark || 'No remark provided.'}
              </Text>
            </View>
            <View style={styles.actions}>
              <View style={{ flex: 1 }}>
                <Button
                  title="Open document"
                  variant="secondary"
                  onPress={() => void openUploadedFile(item.fileUrl)}
                  disabled={deletingId === item.id}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title={deletingId === item.id ? 'Deleting…' : 'Delete'}
                  variant="ghost"
                  color={Colors.error}
                  onPress={() => confirmDelete(item)}
                  disabled={deletingId !== null || isUploading || isRefreshing}
                />
              </View>
            </View>
          </View>
        )}
        ListFooterComponent={
          <Button
            title="Refresh library"
            variant="ghost"
            onPress={() => void loadUploadedFiles(true)}
            disabled={isLoading || isRefreshing || deletingId !== null}
          />
        }
      />
    </View>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { ...Layout.page, gap: 0, flexGrow: 1 },
  uploadPanel: {
    backgroundColor: Colors.primarySoft,
    borderColor: '#B8DCD1',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 22,
    padding: 24,
    alignItems: 'stretch',
  },
  uploadIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: Colors.card,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  uploadTitle: {
    color: Colors.textDark,
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 17,
    lineHeight: 24,
  },
  help: {
    color: Colors.textMuted,
    fontSize: 11,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 14,
  },
  libraryHeading: { marginTop: 28 },
  fileCard: { ...Layout.card, padding: 18, marginBottom: 14 },
  fileTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  typeBadge: {
    minWidth: 46,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  typeText: { color: Colors.accent, fontSize: 10, fontWeight: '800' },
  fileName: { fontSize: 14, fontWeight: '700', color: Colors.textDark, lineHeight: 21 },
  meta: { fontSize: 10, color: Colors.textMuted, marginTop: 5, lineHeight: 17 },
  remarkBox: {
    padding: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginTop: 16,
  },
  remarkLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 6,
  },
  remarkText: { fontSize: 12, color: Colors.textDark, lineHeight: 20 },
  input: { ...Layout.input, marginTop: 3 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
});
