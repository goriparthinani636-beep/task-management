import { Layout } from '../theme/layout';
import React, { useState, useCallback, useContext, useRef } from 'react';
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
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { loadMyEmployee, loadScopedTasks } from '../services/employeeScope';
import { AuthContext } from '../context/AuthContext';
import { api } from '../services/api';
import { Colors } from '../theme/colors';

interface EmployeeSimple {
  id: number;
  firstName: string;
  lastName: string;
}

export interface TaskItem {
  id: number;
  title: string;
  description?: string;
  employeeId: number;
  priority: string;
  status: string;
  dueDate?: string;
  employee?: {
    id: number;
    firstName: string;
    lastName: string;
    department: string;
  };
}

const STATUS_FILTERS = ['All', 'Pending', 'InProgress', 'Completed'];
const PRIORITIES = ['Low', 'Medium', 'High'];

export const TasksScreen = () => {
  const router = useRouter();
  const { taskId } = useLocalSearchParams<{ taskId?: string }>();
  const focusedTaskId = Number.isSafeInteger(Number(taskId)) && Number(taskId) > 0 ? Number(taskId) : null;
  const { user } = useContext(AuthContext);
  const isManager = user?.role === 'Manager';
  const generation = useRef(0);
  const [loadError, setLoadError] = useState('');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeSimple[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [priority, setPriority] = useState('Medium');
  const [status, setStatus] = useState('Pending');

  const loadData = useCallback(async () => {
    const current = ++generation.current;
    setLoadError('');
    try {
      if (!user) return;
      const [assigned, employeeList] = await Promise.all([
        loadScopedTasks(user),
        user.role === 'Manager' ? api.get('/employees').then(response => response.data) : loadMyEmployee(user).then(employee => [employee]),
      ]);
      if (generation.current !== current) return;
      setTasks(assigned);
      setEmployees(employeeList);
    } catch (error: any) {
      if (generation.current !== current) return;
      setTasks([]); setEmployees([]);
      setLoadError(error?.response?.status === 404
        ? 'The employee tasks endpoint is missing. Deploy the updated EmployeeApi backend.'
        : error?.message ?? 'Unable to load tasks. Pull down to retry.');
    } finally {
      if (generation.current === current) { setLoading(false); setRefreshing(false); }
    }
  }, [user]);
  useFocusEffect(useCallback(() => {
    if (focusedTaskId !== null) setSelectedStatus('All');
    void loadData();
    return () => { generation.current++; };
  }, [loadData, focusedTaskId]));
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadData();
  }, [loadData]);

  const filteredTasks = tasks.filter((t) => {
    if (focusedTaskId !== null) return t.id === focusedTaskId;
    if (selectedStatus === 'All') return true;
    return t.status.toLowerCase() === selectedStatus.toLowerCase();
  });

  const openAddModal = () => {
    setEditingTaskId(null);
    setTitle('');
    setDescription('');
    setEmployeeId(employees.length > 0 ? employees[0].id : null);
    setPriority('Medium');
    setStatus('Pending');
    setModalVisible(true);
  };

  const openEditModal = (task: TaskItem) => {
    setEditingTaskId(task.id);
    setTitle(task.title);
    setDescription(task.description || '');
    setEmployeeId(task.employeeId);
    setPriority(task.priority);
    setStatus(task.status);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (formSubmitting) return;
    if (!title.trim()) {
      Alert.alert('Validation', 'Please provide a task title.');
      return;
    }
    if (!employeeId) {
      Alert.alert('Validation', 'Please select an assigned employee.');
      return;
    }

    setFormSubmitting(true);
    const payload = {
      title,
      description,
      employeeId,
      priority,
      status,
    };

    try {
      if (editingTaskId) {
        const response = await api.put(`/tasks/${editingTaskId}`, payload);
        Alert.alert('Task saved', response.data?.notificationWarning ?? 'Task updated successfully.');
      } else {
        const response = await api.post('/tasks', payload);
        Alert.alert('Task saved', response.data?.notificationWarning ?? 'Task created successfully.');
      }
      setModalVisible(false);
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save task.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleQuickStatusChange = async (task: TaskItem) => {
    let nextStatus = 'Pending';
    if (task.status.toLowerCase() === 'pending') nextStatus = 'InProgress';
    else if (task.status.toLowerCase() === 'inprogress') nextStatus = 'Completed';
    else nextStatus = 'Pending';

    try {
      await api.patch(`/tasks/${task.id}/status`, { status: nextStatus });
      loadData();
    } catch {
      Alert.alert('Error', 'Unable to update status.');
    }
  };

  const handleDelete = (id: number, taskTitle: string) => {
    Alert.alert('Delete Task', `Are you sure you want to remove "${taskTitle}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/tasks/${id}`);
            loadData();
          } catch {
            Alert.alert('Error', 'Unable to delete task.');
          }
        },
      },
    ]);
  };

  const getPriorityColor = (p: string) => {
    switch (p.toLowerCase()) {
      case 'high':
        return Colors.error;
      case 'medium':
        return Colors.warning;
      default:
        return Colors.success;
    }
  };

  const getStatusColor = (s: string) => {
    switch (s.toLowerCase()) {
      case 'completed':
        return { bg: Colors.successSoft, text: Colors.success };
      case 'inprogress':
        return { bg: Colors.warningSoft, text: Colors.warning };
      default:
        return { bg: Colors.surface, text: '#4B5563' };
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
      {focusedTaskId !== null && <View style={{ padding: 12 }}>
        <Text>Task opened from notification</Text>
        <TouchableOpacity onPress={() => router.setParams({ taskId: undefined })}><Text style={{ color: Colors.primary }}>Show all tasks</Text></TouchableOpacity>
      </View>}
      {/* Top Header Row */}
      <View style={styles.topRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {STATUS_FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, selectedStatus === f && styles.filterChipActive]}
              onPress={() => setSelectedStatus(f)}
            >
              <Text style={[styles.filterChipText, selectedStatus === f && styles.filterChipTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {isManager && <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>}
      </View>

      {/* Task List */}
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{loadError || (isManager ? 'No tasks found for this filter.' : 'No tasks assigned to you for this filter. Your manager can assign tasks from their login.')}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const statusStyle = getStatusColor(item.status);
          const priorityColor = getPriorityColor(item.priority);

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.priorityTag, { backgroundColor: priorityColor }]}>
                  <Text style={styles.priorityText}>{item.priority}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}
                  onPress={() => handleQuickStatusChange(item)}
                >
                  <Text style={[styles.statusText, { color: statusStyle.text }]}>
                    {item.status} ↻
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.title}>{item.title}</Text>
              {item.description ? (
                <Text style={styles.description}>{item.description}</Text>
              ) : null}

              <View style={styles.assigneeRow}>
                <Text style={styles.assigneeLabel}>Assigned to:</Text>
                <Text style={styles.assigneeName}>
                  {item.employee
                    ? `${item.employee.firstName} ${item.employee.lastName}`
                    : `Employee #${item.employeeId}`}
                </Text>
              </View>

              {isManager && <View style={styles.actionRow}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(item.id, item.title)}
                >
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>}
            </View>
          );
        }}
      />

      {/* Add / Edit Task Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editingTaskId ? 'Edit Task' : 'Add New Task'}
              </Text>

              <Text style={styles.label}>Title *</Text>
              <TextInput style={styles.input} value={title} onChangeText={setTitle} />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>Assign To Employee *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectScroll}>
                {employees.map((emp) => (
                  <TouchableOpacity
                    key={emp.id}
                    style={[
                      styles.empSelectChip,
                      employeeId === emp.id && styles.empSelectChipActive,
                    ]}
                    onPress={() => setEmployeeId(emp.id)}
                  >
                    <Text
                      style={[
                        styles.empSelectText,
                        employeeId === emp.id && styles.empSelectTextActive,
                      ]}
                    >
                      {emp.firstName} {emp.lastName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Priority</Text>
              <View style={styles.rowChoices}>
                {PRIORITIES.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.choiceBtn, priority === p && styles.choiceBtnActive]}
                    onPress={() => setPriority(p)}
                  >
                    <Text style={[styles.choiceText, priority === p && styles.choiceTextActive]}>
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Status</Text>
              <View style={styles.rowChoices}>
                {['Pending', 'InProgress', 'Completed'].map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.choiceBtn, status === s && styles.choiceBtnActive]}
                    onPress={() => setStatus(s)}
                  >
                    <Text style={[styles.choiceText, status === s && styles.choiceTextActive]}>
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
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  filterScroll: { flex: 1 },
  filterChip: { minHeight: 44, justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.card,
    marginRight: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  filterChipTextActive: { color: '#fff' },
  addBtn: { minHeight: 44, justifyContent: 'center',
    backgroundColor: Colors.primary,
    marginLeft: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  card: { ...Layout.card,
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: Colors.textDark,
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priorityTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  priorityText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '700' },
  title: { fontSize: 16, fontWeight: '700', color: Colors.textDark, marginTop: 8 },
  description: { lineHeight: 21, fontSize: 14, color: Colors.textMuted, marginTop: 4 },
  assigneeRow: { flexDirection: 'row', marginTop: 10, alignItems: 'center' },
  assigneeLabel: { fontSize: 12, color: Colors.textMuted },
  assigneeName: { fontSize: 12, fontWeight: '600', color: Colors.textDark, marginLeft: 4 },
  actionRow: { flexWrap: 'wrap', rowGap: 8, flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  editBtn: { minHeight: 44, justifyContent: 'center',
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
  },
  editBtnText: { color: Colors.primary, fontWeight: '600', fontSize: 12 },
  deleteBtn: { minHeight: 44, justifyContent: 'center',
    backgroundColor: Colors.errorSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  deleteBtnText: { color: Colors.error, fontWeight: '600', fontSize: 12 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: { ...Layout.card, width: '100%', maxWidth: 560, alignSelf: 'center',
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textDark, marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '600', color: Colors.textDark, marginTop: 10, marginBottom: 4 },
  input: { ...Layout.input,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.textDark,
  },
  multilineInput: { height: 70, textAlignVertical: 'top' },
  selectScroll: { flexDirection: 'row', marginBottom: 4 },
  empSelectChip: { minHeight: 44, justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 6,
    backgroundColor: Colors.surface,
  },
  empSelectChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  empSelectText: { fontSize: 12, color: Colors.textDark },
  empSelectTextActive: { color: '#fff', fontWeight: '600' },
  rowChoices: { flexDirection: 'row', marginTop: 4 },
  choiceBtn: { minHeight: 44, justifyContent: 'center',
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    marginRight: 6,
  },
  choiceBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  choiceText: { fontSize: 12, color: Colors.textDark, fontWeight: '600' },
  choiceTextActive: { color: '#fff' },
  modalActions: { flexWrap: 'wrap', rowGap: 8, flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  cancelBtn: { minHeight: 44, justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 16, marginRight: 8 },
  cancelBtnText: { color: Colors.textMuted, fontWeight: '600' },
  saveBtn: { minHeight: 44, justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  saveBtnText: { color: '#fff', fontWeight: '700' },
});
