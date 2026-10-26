
import React, { useMemo, useRef, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { api } from '../services/api';
import { Colors } from '../theme/colors';
import { fileUrl, openFile, uploadedFiles, validateFile } from '../services/files';
import { removeEmployeeResume, saveEmployee } from '../services/employees';
export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  department: string;
  designation: string;
  status: string;
  joiningDate?: string;
  resumeUrl?: string | null;
  resumeFileName?: string | null;
}
export const EmployeesScreen = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Add/Edit modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEmployee, setEditingEmployee] =
    useState<Employee | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [removingResume, setRemovingResume] = useState(false);
  const resumeRemoval = useRef(false);
  const confirmRemoveResume = (employee: Employee) => {
    Alert.alert('Remove resume?', 'Remove this resume from the employee profile? The employee details are kept. To permanently delete the uploaded file, use Delete File in File Uploads afterward.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        if (resumeRemoval.current) return;
        resumeRemoval.current = true;
        setRemovingResume(true);
        try {
          const saved: Employee = await removeEmployeeResume(employee.id);
          setEmployees(previous => previous.map(item => item.id === saved.id ? saved : item));
          setProfileEmployee(current => current?.id === saved.id ? saved : current);
          if (editingEmployee?.id === saved.id) {
            setResumeUrl('');
            setResumeFileName('');
            setPickedResume(null);
          }
          Alert.alert('Resume removed', 'The resume was removed from this employee.');
        } catch (error: any) {
          Alert.alert('Remove failed', error?.response?.data?.message ?? error?.message ?? 'Could not remove the resume. Please retry.');
        } finally {
          resumeRemoval.current = false;
          setRemovingResume(false);
        }
      } },
    ]);
  };
  // Employee profile
  const [profileEmployee, setProfileEmployee] =
    useState<Employee | null>(null);
  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [status, setStatus] = useState('Active');
  const [resumeUrl, setResumeUrl] = useState('');
  const [resumeFileName, setResumeFileName] = useState('');
  const [pickedResume, setPickedResume] =
    useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const fetchEmployees = useCallback(async () => {
    try {
      const response = await api.get('/employees');
      const data: Employee[] = response.data;
      if (!Array.isArray(data)) throw new Error('Invalid employee list.');
      setEmployees(data);
    } catch {
      Alert.alert('Error', 'Unable to fetch employees from server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { void fetchEmployees(); }, [fetchEmployees]));
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEmployees();
  }, [fetchEmployees]);
  const filterEmployees = (
    data: Employee[],
    text: string
  ): Employee[] => {
    const query = text.trim().toLowerCase();
    if (!query) return data;
    return data.filter((emp) =>
      [
        emp.firstName,
        emp.lastName,
        emp.email,
        emp.department,
        emp.designation,
      ].some((value) =>
        (value || '').toLowerCase().includes(query)
      )
    );
  };
  const handleSearch = (text: string) => {
    setSearch(text);
  };
  const filteredEmployees = useMemo(() => filterEmployees(employees, search), [employees, search]);
  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setDepartment('');
    setDesignation('');
    setStatus('Active');
    setResumeUrl('');
    setResumeFileName('');
    setPickedResume(null);
  };
  const openAddModal = () => {
    setEditingEmployee(null);
    resetForm();
    setModalVisible(true);
  };
  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setFirstName(emp.firstName || '');
    setLastName(emp.lastName || '');
    setEmail(emp.email || '');
    setPhone(emp.phone || '');
    setDepartment(emp.department || '');
    setDesignation(emp.designation || '');
    setStatus(emp.status || 'Active');
    setResumeUrl(emp.resumeUrl || '');
    setResumeFileName(emp.resumeFileName || '');
    setPickedResume(null);
    setModalVisible(true);
  };
  const pickResume = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (!result.canceled && result.assets.length > 0) {
        const file = result.assets[0];
        validateFile(file.name, file.size, true);
        setPickedResume(file);
        setResumeFileName(file.name);
      }
    } catch (error) {
      Alert.alert('Resume selection', error instanceof Error ? error.message : 'Unable to select the resume file.');
    }
  };
  const uploadResume = async (): Promise<string> => {
    if (!pickedResume) {
      return resumeUrl.trim();
    }
    const formData = new FormData();
    formData.append(
      'files',
      {
        uri: pickedResume.uri,
        name: pickedResume.name,
        type: pickedResume.mimeType ?? 'application/pdf',
      } as any,
    );
    formData.append('remarks', 'Employee resume');
    const response = await api.post('/FileUploads', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000,
    });
    return uploadedFiles(response.data, 1)[0].fileUrl;
  };
  const handleSave = async () => {
    if (formSubmitting) return;
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !department.trim() ||
      !designation.trim()
    ) {
      Alert.alert(
        'Validation',
        'Please fill in all required fields.'
      );
      return;
    }
    if (!pickedResume && resumeUrl.trim()) {
      const validUrl = /^https?:\/\/\S+$/i.test(resumeUrl.trim());
      if (!validUrl) {
        Alert.alert(
          'Invalid Resume URL',
          'Enter a valid URL beginning with https\:// or http\://.'
        );
        return;
      }
    }
    setFormSubmitting(true);
    try {
      let savedResumeUrl = resumeUrl.trim();
      let savedResumeFileName = resumeFileName.trim();
      if (pickedResume) {
        savedResumeUrl = await uploadResume();
        savedResumeFileName = pickedResume.name;
        // Retain the completed upload if saving the employee subsequently fails.
        setResumeUrl(savedResumeUrl);
        setResumeFileName(savedResumeFileName);
        setPickedResume(null);
      }
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        department: department.trim(),
        designation: designation.trim(),
        status,
        resumeUrl: savedResumeUrl ? fileUrl(savedResumeUrl) : null,
        resumeFileName: savedResumeFileName || null,
      };
      const saved: Employee = await saveEmployee(payload, editingEmployee?.id, id => {
        setEditingEmployee({ ...payload, id });
      });
      setEmployees(previous => [saved, ...previous.filter(emp => emp.id !== saved.id)]);
      setModalVisible(false);
      setPickedResume(null);
      setProfileEmployee(saved);
      Alert.alert('Success', 'Employee and resume saved successfully.');
    } catch (error: any) {
      console.error(
        'EMPLOYEE / RESUME SAVE ERROR:',
        error?.response?.status,
        error?.response?.data ?? error?.message,
      );
      Alert.alert(
        'Save Failed',
        error?.response?.data?.message ??
          error?.message ??
          'Unable to upload the resume or save the employee.',
      );
    } finally {
      setFormSubmitting(false);
    }
  };
  const handleDelete = (id: number, name: string) => {
    Alert.alert(
      'Delete Confirmation',
      `Are you sure you want to remove ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/employees/${id}`);
              Alert.alert('Success', 'Employee deleted.');
              if (profileEmployee?.id === id) {
                setProfileEmployee(null);
              }
              await fetchEmployees();
            } catch {
              Alert.alert('Error', 'Unable to delete employee.');
            }
          },
        },
      ]
    );
  };
  const openResume = async (url?: string | null) => {
    if (!url?.trim()) {
      Alert.alert('Resume Not Available', 'No resume URL was saved.');
      return;
    }
    try {
      await openFile(url);
    } catch (error) {
      console.error('OPEN RESUME ERROR:', error);
      Alert.alert(
        'Unable to Open Resume',
        error instanceof Error ? error.message : 'Unable to open the saved resume link.',
      );
    }
  };
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }
  return (
    <View style={styles.container}>
      {/* Search and Add */}
      <View style={styles.topBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, role, dept..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={handleSearch}
        />
        <TouchableOpacity
          style={styles.addBtn}
          onPress={openAddModal}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>
      {/* Employee List */}
      <FlatList
        data={filteredEmployees}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No employees found.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardHeader}
              activeOpacity={0.8}
              onPress={() => setProfileEmployee(item)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(item.firstName || '?')[0]}
                  {(item.lastName || '?')[0]}
                </Text>
              </View>
              <View style={styles.nameBlock}>
                <Text style={styles.name}>
                  {item.firstName} {item.lastName}
                </Text>
                <Text style={styles.designation}>
                  {item.designation} • {item.department}
                </Text>
                <Text style={styles.viewHint}>
                  Tap to view profile
                </Text>
              </View>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor:
                      item.status?.toLowerCase() === 'active'
                        ? '#DCFCE7'
                        : '#FEE2E2',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    {
                      color:
                        item.status?.toLowerCase() === 'active'
                          ? '#16A34A'
                          : '#DC2626',
                    },
                  ]}
                >
                  {item.status}
                </Text>
              </View>
            </TouchableOpacity>
            <View style={styles.contactRow}>
              <Text style={styles.contactText}>
                📧 {item.email}
              </Text>
              {item.phone ? (
                <Text style={styles.contactText}>
                  📞 {item.phone}
                </Text>
              ) : null}
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.profileBtn}
                onPress={() => setProfileEmployee(item)}
              >
                <Text style={styles.profileBtnText}>
                  Profile
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => openEditModal(item)}
              >
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() =>
                  handleDelete(
                    item.id,
                    `${item.firstName} ${item.lastName}`
                  )
                }
              >
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
      {/* Add/Edit Employee Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContent}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              <Text style={styles.modalTitle}>
                {editingEmployee
                  ? 'Edit Employee'
                  : 'Add New Employee'}
              </Text>
              {/* Resume fields */}
              <Text style={styles.sectionTitle}>
                Resume (Optional)
              </Text>
              <Text style={styles.resumeDescription}>Choose a PDF or DOCX (maximum 5 MB), or enter a resume link below.</Text>
              <Text style={styles.label}>Resume URL</Text>
              <TextInput
                style={styles.input}
                value={resumeUrl}
                onChangeText={setResumeUrl}
                placeholder="https://.../resume.pdf"
                autoCapitalize="none"
                keyboardType="url"
              />
              <Text style={styles.label}>Resume File</Text>
              <TouchableOpacity
                style={styles.resumeOpenBtn}
                onPress={pickResume}
                disabled={formSubmitting}
                activeOpacity={0.8}
              >
                <Text style={styles.resumeOpenBtnText}>
                  {pickedResume || resumeFileName
                    ? 'Change Resume File'
                    : 'Choose Resume File'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.resumeDescription}>
                {pickedResume?.name ||
                  resumeFileName ||
                  'No file selected. PDF or DOCX, maximum 5 MB.'}
              </Text>
              {pickedResume ? (
                <Text style={styles.resumeDescription}>
                  This file will be uploaded when you save the employee.
                </Text>
              ) : null}
              {resumeUrl.trim() ? (
                <TouchableOpacity
                  style={styles.previewBtn}
                  onPress={() => openResume(resumeUrl.trim())}
                >
                  <Text style={styles.previewBtnText}>
                    Preview Resume
                  </Text>
                </TouchableOpacity>
              ) : null}
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
              />
              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
              />
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="employee@example.com"
              />
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="Phone number"
              />
              <Text style={styles.label}>Department *</Text>
              <TextInput
                style={styles.input}
                value={department}
                onChangeText={setDepartment}
                placeholder="e.g. IT, HR, Finance"
              />
              <Text style={styles.label}>Designation *</Text>
              <TextInput
                style={styles.input}
                value={designation}
                onChangeText={setDesignation}
                placeholder="e.g. Developer, Lead"
              />
              <Text style={styles.label}>Status</Text>
              <View style={styles.statusToggleRow}>
                {['Active', 'Inactive'].map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.statusToggleBtn,
                      status === s &&
                        styles.statusToggleBtnActive,
                    ]}
                    onPress={() => setStatus(s)}
                  >
                    <Text
                      style={[
                        styles.statusToggleText,
                        status === s &&
                          styles.statusToggleTextActive,
                      ]}
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setModalVisible(false)}
                  disabled={formSubmitting}
                >
                  <Text style={styles.cancelBtnText}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSave}
                  disabled={formSubmitting}
                >
                  {formSubmitting ? (
                    <ActivityIndicator
                      size="small"
                      color="#fff"
                    />
                  ) : (
                    <Text style={styles.saveBtnText}>
                      Save Employee
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* Employee Profile Modal */}
      <Modal
        visible={profileEmployee !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setProfileEmployee(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.profileModalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.profileHeader}>
                <View style={styles.avatarLarge}>
                  <Text style={styles.avatarLargeText}>
                    {(profileEmployee?.firstName || '?')[0]}
                    {(profileEmployee?.lastName || '?')[0]}
                  </Text>
                </View>
                <Text style={styles.profileName}>
                  {profileEmployee?.firstName}{' '}
                  {profileEmployee?.lastName}
                </Text>
                <Text style={styles.profileDesignation}>
                  {profileEmployee?.designation}
                </Text>
                <Text style={styles.profileDepartment}>
                  {profileEmployee?.department}
                </Text>
              </View>
              <Text style={styles.sectionTitle}>
                Employee Information
              </Text>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>
                  {profileEmployee?.email || 'Not provided'}
                </Text>
                <View style={styles.infoDivider} />
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>
                  {profileEmployee?.phone || 'Not provided'}
                </Text>
                <View style={styles.infoDivider} />
                <Text style={styles.infoLabel}>Department</Text>
                <Text style={styles.infoValue}>
                  {profileEmployee?.department || 'Not provided'}
                </Text>
                <View style={styles.infoDivider} />
                <Text style={styles.infoLabel}>Designation</Text>
                <Text style={styles.infoValue}>
                  {profileEmployee?.designation || 'Not provided'}
                </Text>
                <View style={styles.infoDivider} />
                <Text style={styles.infoLabel}>Status</Text>
                <Text style={styles.infoValue}>
                  {profileEmployee?.status || 'Not provided'}
                </Text>
                <View style={styles.infoDivider} />
                <Text style={styles.infoLabel}>Joining Date</Text>
                <Text style={styles.infoValue}>
                  {profileEmployee?.joiningDate
                    ? new Date(
                        profileEmployee.joiningDate
                      ).toLocaleDateString()
                    : 'Not provided'}
                </Text>
              </View>
              {/* Resume section */}
              <Text style={styles.sectionTitle}>
                Employee Resume
              </Text>
              <View style={styles.resumeCard}>
                <Text style={styles.resumeIcon}>📄</Text>
                {profileEmployee?.resumeUrl ? (
                  <>
                    <Text style={styles.resumeFileName}>
                      {profileEmployee.resumeFileName ||
                        'Employee Resume'}
                    </Text>
                    <Text style={styles.resumeDescription}>
                      Resume is available for viewing.
                    </Text>
                    <TouchableOpacity
                      style={styles.resumeOpenBtn}
                      disabled={removingResume}
                      onPress={() =>
                        openResume(profileEmployee.resumeUrl)
                      }
                    >
                      <Text style={styles.resumeOpenBtnText}>
                        View / Download Resume
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.resumeEditBtn}
                      disabled={removingResume}
                      onPress={() => {
                        if (profileEmployee) {
                          openEditModal(profileEmployee);
                          setProfileEmployee(null);
                        }
                      }}
                    >
                      <Text style={styles.resumeEditBtnText}>
                        Replace Resume
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.resumeEditBtn}
                      disabled={removingResume}
                      onPress={() => confirmRemoveResume(profileEmployee)}
                    >
                      <Text style={[styles.resumeEditBtnText, { color: '#DC2626' }]}>
                        {removingResume ? 'Removing...' : 'Remove Resume'}
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.resumeFileName}>
                      No Resume Added
                    </Text>
                    <Text style={styles.resumeDescription}>
                      Choose a resume file or add a link in Edit Employee to show
                      the resume here.
                    </Text>
                    <TouchableOpacity
                      style={styles.resumeOpenBtn}
                      onPress={() => {
                        if (profileEmployee) {
                          openEditModal(profileEmployee);
                          setProfileEmployee(null);
                        }
                      }}
                    >
                      <Text style={styles.resumeOpenBtnText}>
                        Add Resume
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
              <View style={styles.profileActions}>
                <TouchableOpacity
                  style={styles.editProfileBtn}
                  disabled={removingResume}
                  onPress={() => {
                    if (profileEmployee) {
                      openEditModal(profileEmployee);
                      setProfileEmployee(null);
                    }
                  }}
                >
                  <Text style={styles.editProfileBtnText}>
                    Edit Employee
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.closeProfileBtn}
                  onPress={() => setProfileEmployee(null)}
                >
                  <Text style={styles.closeProfileBtnText}>
                    Close Profile
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    color: Colors.textDark,
  },
  addBtn: {
    backgroundColor: Colors.primary,
    marginLeft: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EEF9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  nameBlock: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
  },
  designation: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  viewHint: {
    fontSize: 11,
    color: Colors.primary,
    marginTop: 5,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  contactRow: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
  },
  contactText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  profileBtn: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    marginRight: 8,
  },
  profileBtnText: {
    color: '#0369A1',
    fontWeight: '600',
    fontSize: 12,
  },
  editBtn: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
    marginRight: 8,
  },
  editBtnText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 12,
  },
  deleteBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
  },
  deleteBtnText: {
    color: '#DC2626',
    fontWeight: '600',
    fontSize: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    maxHeight: '90%',
  },
  profileModalContent: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 20,
    maxHeight: '92%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textDark,
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 14,
    color: Colors.textDark,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
    marginTop: 20,
    marginBottom: 10,
  },
  statusToggleRow: {
    flexDirection: 'row',
    marginTop: 6,
    marginBottom: 16,
  },
  statusToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  statusToggleBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  statusToggleText: {
    color: Colors.textDark,
    fontSize: 13,
    fontWeight: '600',
  },
  statusToggleTextActive: {
    color: '#fff',
  },
  previewBtn: {
    alignSelf: 'flex-start',
    marginTop: 10,
    padding: 10,
    borderRadius: 6,
    backgroundColor: '#E0F2FE',
  },
  previewBtnText: {
    color: '#0369A1',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    marginBottom: 8,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  cancelBtnText: {
    color: Colors.textMuted,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 6,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatarLarge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarLargeText: {
    color: Colors.primary,
    fontSize: 24,
    fontWeight: '700',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textDark,
    textAlign: 'center',
  },
  profileDesignation: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 5,
  },
  profileDepartment: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 3,
  },
  infoBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 14,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.textDark,
    fontWeight: '500',
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 10,
  },
  resumeCard: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  resumeIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  resumeFileName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textDark,
    textAlign: 'center',
  },
  resumeDescription: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 12,
  },
  resumeOpenBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 7,
    paddingVertical: 11,
    paddingHorizontal: 16,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  resumeOpenBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  resumeEditBtn: {
    marginTop: 10,
    padding: 10,
  },
  resumeEditBtnText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  profileActions: {
    marginTop: 18,
    gap: 10,
  },
  editProfileBtn: {
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 7,
    alignItems: 'center',
  },
  editProfileBtnText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  closeProfileBtn: {
    padding: 12,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  closeProfileBtnText: {
    color: Colors.textDark,
    fontWeight: '600',
  },
});
