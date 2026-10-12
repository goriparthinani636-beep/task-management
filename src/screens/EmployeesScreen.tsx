import React, { useEffect, useState, useCallback } from 'react';
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
} from 'react-native';
import { api } from '../services/api';
import { Colors } from '../theme/colors';
//employee object structure
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
}

export const EmployeesScreen = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [status, setStatus] = useState('Active');

  const fetchEmployees = async () => {
    //Backend nundi employees teesukune function.
    try {
      const response = await api.get('/employees');
      setEmployees(response.data);
      setFilteredEmployees(response.data);
    } catch (error) {
      Alert.alert('Error', 'Unable to fetch employees from server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEmployees();
  }, []);

  const handleSearch = (text: string) => {
    //Search box lo user type chesina every text change ki idi run avutundi.
    setSearch(text);//Search state update. "venkat" -> venkat
    if (!text.trim()) {
      setFilteredEmployees(employees);
      return;
      //Search clear ayithe complete employee list malli show cheyyi.
    }
    const query = text.toLowerCase();
    const filtered = employees.filter(
      (emp) =>
        emp.firstName.toLowerCase().includes(query) ||
        emp.lastName.toLowerCase().includes(query) ||
        emp.department.toLowerCase().includes(query) ||
        emp.designation.toLowerCase().includes(query)
    );
    setFilteredEmployees(filtered);
  };

  const openAddModal = () => {
    setEditingEmployee(null);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setDepartment('');
    setDesignation('');
    setStatus('Active');
    setModalVisible(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setFirstName(emp.firstName);
    setLastName(emp.lastName);
    setEmail(emp.email);
    setPhone(emp.phone || '');
    setDepartment(emp.department);
    setDesignation(emp.designation);
    setStatus(emp.status);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !department.trim()) {
      Alert.alert('Validation', 'Please fill in all required fields.');
      return;
    }

    setFormSubmitting(true);
    const payload = {
      firstName,
      lastName,
      email,
      phone,
      department,
      designation,
      status,
    };

    try {
      if (editingEmployee) {
        await api.put(`/employees/${editingEmployee.id}`, payload);
        Alert.alert('Success', 'Employee updated successfully.');
      } else {
        await api.post('/employees', payload);
        Alert.alert('Success', 'Employee created successfully.');
      }
      setModalVisible(false);
      fetchEmployees();
    } catch (err: any) {
      Alert.alert('Save Failed', err.response?.data?.message || 'Unable to save record.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = (id: number, name: string) => {
    Alert.alert('Delete Confirmation', `Are you sure you want to remove ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/employees/${id}`);
            Alert.alert('Success', 'Employee deleted.');
            fetchEmployees();
          } catch {
            Alert.alert('Error', 'Unable to delete employee.');
          }
        },
      },
    ]);
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
      {/* Search Bar + Add Button */}
      <View style={styles.topBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, role, dept..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={handleSearch}
        />
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Employee List */}
      <FlatList
        data={filteredEmployees}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No employees found.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.firstName[0]}
                  {item.lastName[0]}
                </Text>
              </View>
              <View style={styles.nameBlock}>
                <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
                <Text style={styles.designation}>{item.designation} • {item.department}</Text>
              </View>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: item.status.toLowerCase() === 'active' ? '#DCFCE7' : '#FEE2E2' },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: item.status.toLowerCase() === 'active' ? '#16A34A' : '#DC2626' },
                  ]}
                >
                  {item.status}
                </Text>
              </View>
            </View>

            <View style={styles.contactRow}>
              <Text style={styles.contactText}>📧 {item.email}</Text>
              {item.phone ? <Text style={styles.contactText}>📞 {item.phone}</Text> : null}
            </View>

            {/* Actions */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(item.id, `${item.firstName} ${item.lastName}`)}
              >
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
              </Text>

              <Text style={styles.label}>First Name *</Text>
              <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} />

              <Text style={styles.label}>Last Name *</Text>
              <TextInput style={styles.input} value={lastName} onChangeText={setLastName} />

              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Phone</Text>
              <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

              <Text style={styles.label}>Department *</Text>
              <TextInput style={styles.input} value={department} onChangeText={setDepartment} placeholder="e.g. IT, HR, Finance" />

              <Text style={styles.label}>Designation *</Text>
              <TextInput style={styles.input} value={designation} onChangeText={setDesignation} placeholder="e.g. Developer, Lead" />

              <Text style={styles.label}>Status</Text>
              <View style={styles.statusToggleRow}>
                {['Active', 'Inactive'].map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.statusToggleBtn, status === s && styles.statusToggleBtnActive]}
                    onPress={() => setStatus(s)}
                  >
                    <Text style={[styles.statusToggleText, status === s && styles.statusToggleTextActive]}>
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
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSave}
                  disabled={formSubmitting}
                >
                  {formSubmitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save</Text>
                  )}
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
  container: { flex: 1, backgroundColor: Colors.background, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBar: { flexDirection: 'row', marginBottom: 12 },
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
  addBtnText: { color: '#fff', fontWeight: '700' },
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
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#eef9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
  nameBlock: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: Colors.textDark },
  designation: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  contactRow: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 8 },
  contactText: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  editBtn: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  editBtnText: { color: Colors.primary, fontWeight: '600', fontSize: 12 },
  deleteBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteBtnText: { color: '#DC2626', fontWeight: '600', fontSize: 12 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textDark, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: Colors.textDark, marginTop: 10, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.textDark,
  },
  statusToggleRow: { flexDirection: 'row', marginTop: 6, marginBottom: 16 },
  statusToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  statusToggleBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  statusToggleText: { color: Colors.textDark, fontSize: 13, fontWeight: '600' },
  statusToggleTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16, marginRight: 8 },
  cancelBtnText: { color: Colors.textMuted, fontWeight: '600' },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  saveBtnText: { color: '#fff', fontWeight: '700' },
});