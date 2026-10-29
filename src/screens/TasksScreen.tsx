import { AppIcon } from '../components/AppIcon';
import { ScreenHeading, SearchField, EmptyState } from '../components/ScreenUI';
import { searchTaskList, taskSummary } from '../services/workspaceSummary';
import { Layout } from '../theme/layout';
import React, { useState, useCallback, useRef } from 'react';
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
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { loadMyEmployee, loadScopedTasks } from '../services/employeeScope';
import { useAppSelector } from '../store/hooks';
import { selectCurrentUser } from '../store/authSlice';
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
  const { taskId, compose } = useLocalSearchParams<{ taskId?: string; compose?: string }>();
  const focusedTaskId = Number.isSafeInteger(Number(taskId)) && Number(taskId) > 0 ? Number(taskId) : null;
  const user = useAppSelector(selectCurrentUser);
  const isManager = user?.role === 'Manager';
  const generation = useRef(0);
  const [loadError, setLoadError] = useState('');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeSimple[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [query, setQuery] = useState('');
  const [employeeQuery, setEmployeeQuery] = useState('');
  const [highOnly, setHighOnly] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
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
    if (focusedTaskId !== null) { setSelectedStatus('All'); setQuery(''); setHighOnly(false); }
    void loadData();
    return () => { generation.current++; };
  }, [loadData, focusedTaskId]));
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadData();
  }, [loadData]);

  const filteredTasks = searchTaskList(tasks, employees, query, selectedStatus, highOnly, focusedTaskId);
  const summary = taskSummary(tasks);
  const filteredEmployees = employees.filter(employee =>
    (employee.firstName + ' ' + employee.lastName + ' ' + employee.id).toLowerCase().includes(employeeQuery.trim().toLowerCase()));

  const openAddModal = useCallback(() => {
    setEmployeeQuery('');
    setEditingTaskId(null);
    setTitle('');
    setDescription('');
    setEmployeeId(null);
    setPriority('Medium');
    setStatus('Pending');
    setModalVisible(true);
  }, []);
  useFocusEffect(useCallback(() => {
    if (compose && isManager && !loading) {
      router.setParams({ compose: undefined });
      openAddModal();
    }
  }, [compose, isManager, loading, openAddModal, router]));

  const openEditModal = (task: TaskItem) => {
    setEmployeeQuery('');
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
      title: title.trim(),
      description: description.trim(),
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
    if (updatingId !== null) return;
    setUpdatingId(task.id);
    let nextStatus = 'Pending';
    if (task.status.toLowerCase() === 'pending') nextStatus = 'InProgress';
    else if (task.status.toLowerCase() === 'inprogress') nextStatus = 'Completed';
    else nextStatus = 'Pending';

    try {
      await api.patch(`/tasks/${task.id}/status`, { status: nextStatus });
      loadData();
    } catch {
      Alert.alert('Error', 'Unable to update status.');
    } finally { setUpdatingId(null); }
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

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  const closeForm = () => { if (!formSubmitting) setModalVisible(false); };
  return <View style={styles.container}>
    <FlatList data={filteredTasks} keyExtractor={item => String(item.id)} showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={Colors.primary} onRefresh={onRefresh} />}
      ListHeaderComponent={<>
        <ScreenHeading eyebrow={isManager ? 'WORKSPACE / TASKS' : 'YOUR WORKSPACE'} title={isManager ? 'Team tasks' : 'My tasks'}
          subtitle={isManager ? 'Turn plans into progress, together.' : 'Your next steps, all in one place.'}
          action={isManager && <TouchableOpacity style={styles.addBtn} accessibilityRole="button" accessibilityLabel="Add task" onPress={openAddModal}>
            <AppIcon name="plus" size={18} color={Colors.card} /><Text style={styles.addBtnText}>Add task</Text></TouchableOpacity>} />
        <View style={styles.overview}>{[['Open', summary.total - summary.completed], ['In progress', summary.inProgress], ['Done', summary.completed]].map(([label, count], i) =>
          <View style={styles.overviewItem} key={label}><View style={[styles.overviewDot, { backgroundColor: [Colors.warning, Colors.accent, Colors.primary][i] }]} />
            <Text style={styles.overviewCount}>{count}</Text><Text style={styles.overviewLabel}>{label}</Text></View>)}</View>
        {focusedTaskId !== null && <View style={styles.focusNotice}><Text style={styles.noticeText}>Opened from task link</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => router.setParams({ taskId: undefined })}><Text style={styles.link}>Show all tasks</Text></TouchableOpacity></View>}
        <SearchField value={query} onChangeText={value => { setQuery(value); router.setParams({ taskId: undefined }); }} placeholder="Search tasks or employee name…" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {STATUS_FILTERS.map(filter => <TouchableOpacity key={filter} accessibilityRole="button" accessibilityState={{ selected: selectedStatus === filter }}
            style={[styles.filterChip, selectedStatus === filter && styles.filterChipActive]} onPress={() => { setSelectedStatus(filter); router.setParams({ taskId: undefined }); }}>
            <Text style={[styles.filterChipText, selectedStatus === filter && styles.filterChipTextActive]}>{filter === 'InProgress' ? 'In progress' : filter}</Text>
          </TouchableOpacity>)}
        </ScrollView>
        <View style={styles.results}><Text style={styles.resultsText}>{filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'} found</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: highOnly }} onPress={() => { setHighOnly(!highOnly); router.setParams({ taskId: undefined }); }} style={styles.priorityFilter}>
            <View style={[styles.priorityDot, { backgroundColor: highOnly ? Colors.error : Colors.border }]} /><Text style={[styles.resultsText, highOnly && { color: Colors.error }]}>High priority</Text></TouchableOpacity></View>
        {!!loadError && <View style={styles.error}><Text style={{ color: Colors.error }}>{loadError}</Text></View>}
      </>}
      ListEmptyComponent={<EmptyState icon="task" title={query || highOnly || selectedStatus !== 'All' ? 'No matching tasks' : 'A fresh start'}
        message={query || highOnly || selectedStatus !== 'All' ? 'Try another search or switch your filters.' : isManager ? 'Tap Add task to give your team their next step.' : 'Your assigned tasks will appear here.'} />}
      renderItem={({ item }) => {
        const statusStyle = getStatusColor(item.status);
        const assignee = item.employee ?? employees.find(employee => employee.id === item.employeeId);
        const name = assignee ? `${assignee.firstName} ${assignee.lastName}` : `Employee #${item.employeeId}`;
        return <View style={styles.card}>
          <View style={styles.cardHeader}><Text style={styles.taskNumber}>TASK #{item.id}</Text>
            <View style={styles.priorityTag}><View style={[styles.priorityDot, { backgroundColor: getPriorityColor(item.priority) }]} /><Text style={styles.priorityText}>{item.priority}</Text></View></View>
          <Text style={styles.title}>{item.title}</Text>
          {!!item.description && <Text style={styles.description}>{item.description}</Text>}
          <View style={styles.cardFooter}><View style={styles.assigneeRow}><View style={styles.avatar}><Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text></View>
            <View style={{ flex: 1 }}><Text style={styles.assigneeLabel}>ASSIGNED TO</Text><Text style={styles.assigneeName} numberOfLines={1}>{name}</Text></View></View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Change status for ${item.title}. Current status ${item.status}`}
              accessibilityHint="Cycles through pending, in progress and completed" disabled={updatingId !== null}
              style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]} onPress={() => handleQuickStatusChange(item)}>
              <Text style={[styles.statusText, { color: statusStyle.text }]}>{updatingId === item.id ? 'Updating…' : item.status === 'InProgress' ? 'In progress' : item.status}</Text>
              <AppIcon name="chevron" color={statusStyle.text} size={13} /></TouchableOpacity></View>
          {isManager && <View style={styles.actionRow}><TouchableOpacity accessibilityRole="button" style={styles.editBtn} onPress={() => openEditModal(item)}><Text style={styles.editBtnText}>Edit task</Text></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" style={styles.deleteBtn} onPress={() => handleDelete(item.id, item.title)}><Text style={styles.deleteBtnText}>Delete</Text></TouchableOpacity></View>}
        </View>;
      }} />
    <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeForm}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}><View style={{ flex: 1 }}><Text style={styles.modalEyebrow}>LET’S GET THINGS MOVING</Text><Text style={styles.modalTitle}>{editingTaskId ? 'Edit task' : 'Create a task'}</Text></View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close task form" disabled={formSubmitting} onPress={closeForm} style={styles.closeButton}><AppIcon name="close" color={Colors.textMuted} /></TouchableOpacity></View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContent}>
            <Text style={styles.label}>Task title *</Text><TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="What needs to be done?" placeholderTextColor={Colors.textMuted} accessibilityLabel="Task title" editable={!formSubmitting} />
            <Text style={styles.label}>Description</Text><TextInput style={[styles.input, styles.multilineInput]} value={description} onChangeText={setDescription}
              placeholder="Add the details your team needs…" placeholderTextColor={Colors.textMuted} multiline accessibilityLabel="Task description" editable={!formSubmitting} />
            <View style={styles.assignmentHeader}><Text style={styles.label}>Assign to employee *</Text><Text style={styles.resultsText}>{employees.length} people</Text></View>
            <SearchField value={employeeQuery} onChangeText={setEmployeeQuery} placeholder="Search employee name or ID…" label="Search employees to assign task" />
            <ScrollView style={styles.employeeList} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
              {!filteredEmployees.length && <Text style={styles.noPeople}>{employees.length ? 'No employees match this search.' : 'No employees available. Add an employee first.'}</Text>}
              {filteredEmployees.map(employee => <TouchableOpacity key={employee.id} accessibilityRole="radio" accessibilityState={{ checked: employeeId === employee.id }}
                disabled={formSubmitting} style={[styles.employeeOption, employeeId === employee.id && styles.employeeSelected]} onPress={() => setEmployeeId(employee.id)}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{employee.firstName.charAt(0).toUpperCase()}</Text></View><View style={{ flex: 1 }}>
                  <Text style={styles.employeeName}>{employee.firstName} {employee.lastName}</Text><Text style={styles.resultsText}>Employee #{employee.id}</Text></View>
                <View style={[styles.radio, employeeId === employee.id && styles.radioSelected]}>{employeeId === employee.id && <AppIcon name="check" size={13} color={Colors.card} />}</View>
              </TouchableOpacity>)}
            </ScrollView>
            {employeeId !== null && <Text style={styles.selectedHint}>Selected: {employees.find(employee => employee.id === employeeId)?.firstName ?? 'Employee'} · #{employeeId}</Text>}
            <Text style={styles.label}>Priority</Text><View style={styles.rowChoices}>{PRIORITIES.map(choice => <TouchableOpacity key={choice} accessibilityRole="radio" accessibilityState={{ checked: priority === choice }} disabled={formSubmitting}
              style={[styles.choiceBtn, priority === choice && styles.choiceBtnActive]} onPress={() => setPriority(choice)}><Text style={[styles.choiceText, priority === choice && styles.choiceTextActive]}>{choice}</Text></TouchableOpacity>)}</View>
            <Text style={styles.label}>Status</Text><View style={styles.rowChoices}>{['Pending', 'InProgress', 'Completed'].map(choice => <TouchableOpacity key={choice} accessibilityRole="radio" accessibilityState={{ checked: status === choice }} disabled={formSubmitting}
              style={[styles.choiceBtn, status === choice && styles.choiceBtnActive]} onPress={() => setStatus(choice)}><Text style={[styles.choiceText, status === choice && styles.choiceTextActive]}>{choice === 'InProgress' ? 'In progress' : choice}</Text></TouchableOpacity>)}</View>
          </ScrollView>
          <View style={styles.modalActions}><TouchableOpacity style={styles.cancelBtn} disabled={formSubmitting} onPress={closeForm}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, formSubmitting && { opacity: 0.6 }]} disabled={formSubmitting || !employees.length} accessibilityRole="button" onPress={handleSave}>
              {formSubmitting ? <ActivityIndicator color={Colors.card} /> : <><AppIcon name="check" size={18} color={Colors.card} /><Text style={styles.saveBtnText}>{editingTaskId ? 'Save changes' : 'Create task'}</Text></>}</TouchableOpacity></View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </View>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background }, center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  list: { ...Layout.page, gap: 0, flexGrow: 1 }, addBtn: { backgroundColor: Colors.primary, minHeight: 46, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  addBtnText: { color: Colors.card, fontSize: 12, fontWeight: '700' }, overview: { ...Layout.card, flexDirection: 'row', marginBottom: 18, paddingVertical: 18 },
  overviewItem: { flex: 1, alignItems: 'center', gap: 6 }, overviewDot: { width: 6, height: 6, borderRadius: 3 }, overviewCount: { fontSize: 24, fontWeight: '800', color: Colors.textDark }, overviewLabel: { color: Colors.textMuted, fontSize: 11 },
  filters: { flexDirection: 'row', gap: 8, paddingTop: 16, paddingBottom: 12 }, filterChip: { minHeight: 40, borderRadius: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.ink, borderColor: Colors.ink }, filterChipText: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' }, filterChipTextActive: { color: Colors.card },
  results: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8 }, resultsText: { fontSize: 11, color: Colors.textMuted }, priorityFilter: { flexDirection: 'row', alignItems: 'center', minHeight: 40, gap: 6 },
  card: { ...Layout.card, padding: 20, marginBottom: 14 }, cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskNumber: { fontSize: 9, fontWeight: '700', letterSpacing: 1.2, color: Colors.textMuted }, priorityTag: { flexDirection: 'row', gap: 5, alignItems: 'center' }, priorityDot: { width: 6, height: 6, borderRadius: 3 }, priorityText: { fontSize: 11, color: Colors.textMuted },
  title: { color: Colors.textDark, fontSize: 18, lineHeight: 25, fontWeight: '700', marginTop: 12 }, description: { color: Colors.textMuted, fontSize: 13, lineHeight: 21, marginTop: 6 },
  cardFooter: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 18, marginTop: 18, borderTopWidth: 1, borderColor: Colors.border },
  assigneeRow: { flexDirection: 'row', alignItems: 'center', gap: 9, flexGrow: 1, flexBasis: '45%' }, avatar: { width: 34, height: 34, borderRadius: 12, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Colors.primary, fontSize: 13, fontWeight: '800' }, assigneeLabel: { fontSize: 8, letterSpacing: 1, color: Colors.textMuted, marginBottom: 4 }, assigneeName: { fontSize: 12, fontWeight: '600', color: Colors.textDark },
  statusBadge: { minHeight: 36, borderRadius: 10, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }, statusText: { fontSize: 10, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 10 }, editBtn: { minHeight: 40, justifyContent: 'center', paddingRight: 12 }, editBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 12 }, deleteBtn: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 8 }, deleteBtnText: { color: Colors.error, fontSize: 12, fontWeight: '600' },
  focusNotice: { backgroundColor: Colors.primarySoft, borderRadius: 12, padding: 14, gap: 8, marginBottom: 14 }, noticeText: { color: Colors.textDark, fontSize: 12 }, link: { color: Colors.primary, fontWeight: '700', fontSize: 12 }, error: { backgroundColor: Colors.errorSoft, padding: 12, borderRadius: 12, marginBottom: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(8,30,29,0.6)', justifyContent: 'center', padding: 18, paddingVertical: 38 },
  modalContent: { ...Layout.card, maxHeight: '100%', width: '100%', maxWidth: 560, alignSelf: 'center', borderRadius: 26, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 22, paddingBottom: 18, borderBottomWidth: 1, borderColor: Colors.border }, modalEyebrow: { fontSize: 9, letterSpacing: 1.4, color: Colors.primary, fontWeight: '700' }, modalTitle: { fontSize: 24, fontWeight: '800', color: Colors.textDark, marginTop: 7 }, closeButton: { width: 44, height: 44, backgroundColor: Colors.surface, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  formContent: { padding: 22, paddingTop: 4, paddingBottom: 20 }, label: { fontSize: 12, color: Colors.textDark, fontWeight: '700', marginTop: 18, marginBottom: 10 }, input: { ...Layout.input }, multilineInput: { minHeight: 90, textAlignVertical: 'top' },
  assignmentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, employeeList: { maxHeight: 190, marginTop: 10, borderWidth: 1, borderColor: Colors.border, borderRadius: 14 },
  employeeOption: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, minHeight: 64, borderBottomWidth: 1, borderBottomColor: Colors.border }, employeeSelected: { backgroundColor: Colors.primarySoft }, employeeName: { color: Colors.textDark, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' }, radioSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary }, selectedHint: { color: Colors.primary, fontSize: 11, marginTop: 9 }, noPeople: { color: Colors.textMuted, padding: 18, fontSize: 12 },
  rowChoices: { flexDirection: 'row', gap: 7 }, choiceBtn: { flex: 1, minHeight: 43, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 4 }, choiceBtnActive: { backgroundColor: Colors.primarySoft, borderColor: Colors.primary }, choiceText: { color: Colors.textMuted, fontSize: 11, fontWeight: '600', textAlign: 'center' }, choiceTextActive: { color: Colors.primary },
  modalActions: { padding: 18, flexDirection: 'row', gap: 12, borderTopWidth: 1, borderColor: Colors.border }, cancelBtn: { minHeight: 48, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }, cancelBtnText: { color: Colors.textMuted, fontWeight: '600', fontSize: 13 },
  saveBtn: { flex: 1, minHeight: 48, flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primary, borderRadius: 14 }, saveBtnText: { color: Colors.card, fontSize: 13, fontWeight: '700' },
});
