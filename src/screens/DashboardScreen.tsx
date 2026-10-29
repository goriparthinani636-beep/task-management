// Manager dashboard: API data load chesi summary cards and quick actions chupisthundi.
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { useAppSelector } from '../store/hooks';
import { selectCurrentUser } from '../store/authSlice';
import { api } from '../services/api';
import { taskSummary, todayAttendanceCount } from '../services/workspaceSummary';
import type { TaskItem } from './TasksScreen';
import { Colors } from '../theme/colors';
import { Layout } from '../theme/layout';
import { AppIcon, type IconName } from '../components/AppIcon';
import { EmptyState, SectionTitle } from '../components/ScreenUI';
import { ElementFlags } from 'typescript';
import { unstable_hasStaticViewConfig } from 'react-native/Libraries/NativeComponent/NativeComponentRegistry';

type DashboardStats = {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  departments: { department: string; count: number }[];
};
type Attendance = { employeeId: number; workDate: string };

export const DashboardScreen = () => {
  const user = useAppSelector(selectCurrentUser);
  const router = useRouter();
  const generation = useRef(0);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tasks, setTasks] = useState<TaskItem[] | null>(null);
  const [present, setPresent] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [updated, setUpdated] = useState<Date | null>(null);
  const load = useCallback(async () => {
    const current = ++generation.current;
    const results = await Promise.allSettled([
      api.get<DashboardStats>('/dashboard/stats'),
      api.get<TaskItem[]>('/tasks'),
      api.get<Attendance[]>('/attendance'),
    ]);
    if (current !== generation.current) return;
    setStats(results[0].status === 'fulfilled' ? results[0].value.data : null);
    setTasks(results[1].status === 'fulfilled' ? results[1].value.data : null);
    setPresent(
      results[2].status === 'fulfilled'
        ? todayAttendanceCount(results[2].value.data)
        : null,
    );
    const failures = results.filter((r) => r.status === 'rejected').length;
    setError(
      failures ? 'Some workspace data could not load. Pull down to try again.' : '',
    );
    if (failures < 3) setUpdated(new Date());
    setLoading(false);
    setRefreshing(false);
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        generation.current++;
      };
    }, [load]),
  );
  const summary = tasks ? taskSummary(tasks) : null;
  const latest = tasks ? [...tasks].sort((a, b) => b.id - a.id).slice(0, 3) : [];
  const date = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  });
  const quick: {
    label: string;
    detail: string;
    icon: IconName;
    path: '/(tabs)/employees' | '/(tabs)/tasks' | '/(tabs)/attendance' | '/(tabs)/files';
  }[] = [
    { label: 'Team', detail: 'Manage people', icon: 'users', path: '/(tabs)/employees' },
    { label: 'Tasks', detail: 'Plan your work', icon: 'task', path: '/(tabs)/tasks' },
    {
      label: 'Attendance',
      detail: 'View check-ins',
      icon: 'pin',
      path: '/(tabs)/attendance',
    },
    {
      label: 'Documents',
      detail: 'Shared uploads',
      icon: 'folder',
      path: '/(tabs)/files',
    },
  ];
  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.muted}>Preparing your workspace…</Text>
      </View>
    );
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          tintColor={Colors.primary}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load();
          }}
        />
      }
    >
      <View style={styles.hero}>
        <View style={styles.heroOrb} />
        <View style={styles.heroTop}>
          <Text style={styles.heroEyebrow}>YOUR WORKSPACE, AT A GLANCE</Text>
          <View style={styles.heroLogo}>
            <AppIcon name="grid" color={Colors.mint} size={19} />
          </View>
        </View>
        <Text style={styles.heroTitle}>
          Hello, {user?.name.split(' ')[0] || 'Manager'}.
        </Text>
        <Text style={styles.heroSubtitle}>A little clarity for a productive day.</Text>
        <View style={styles.heroFooter}>
          <View style={styles.dateTag}>
            <AppIcon name="clock" color={Colors.onInk} size={14} />
            <Text style={styles.dateText}>{date}</Text>
          </View>
          <View style={styles.liveDot} />
        </View>
      </View>
      {error ? (
        <View style={styles.error}>
          <Text style={{ color: Colors.error, lineHeight: 20 }}>{error}</Text>
        </View>
      ) : null}
      <View style={styles.metricGrid}>
        {(
          [
            [
              'Total employees',
              stats?.totalEmployees,
              'users',
              Colors.primarySoft,
              Colors.primary,
            ],
            [
              'Active employees',
              stats?.activeEmployees,
              'shield',
              Colors.accentSoft,
              Colors.accent,
            ],
            ['Checked in today', present, 'pin', Colors.successSoft, Colors.success],
            [
              'Open tasks',
              summary ? summary.total - summary.completed : null,
              'task',
              Colors.warningSoft,
              Colors.warning,
            ],
          ] as const
        ).map(([label, value, icon, soft, color]) => (
          <View style={styles.metric} key={label}>
            <View style={[styles.metricIcon, { backgroundColor: soft }]}>
              <AppIcon name={icon} color={color} size={20} />
            </View>
            <Text style={styles.metricNumber}>{value ?? '—'}</Text>
            <Text style={styles.metricLabel}>{label}</Text>
          </View>
        ))}
      </View>
      <View>
        <SectionTitle title="Make your next move" detail="QUICK ACTIONS" />
        <View style={styles.quickGrid}>
          {quick.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.quickCard}
              accessibilityRole="button"
              onPress={() => router.push(item.path)}
              activeOpacity={0.75}
            >
              <AppIcon name={item.icon} size={24} />
              <Text style={styles.quickTitle}>{item.label}</Text>
              <Text style={styles.quickDetail}>{item.detail}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={styles.progressCard}>
        <View style={styles.progressTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionLabel}>WORK IN MOTION</Text>
            <Text style={styles.cardTitle}>Task overview</Text>
            <Text style={styles.muted}>
              {summary
                ? `${summary.completed} of ${summary.total} tasks completed`
                : 'Task data is unavailable'}
            </Text>
          </View>
          <View style={styles.ring}>
            <Svg width={88} height={88} viewBox="0 0 88 88">
              <Circle
                cx={44}
                cy={44}
                r={36}
                stroke={Colors.primarySoft}
                strokeWidth={7}
                fill="none"
              />
              <Circle
                cx={44}
                cy={44}
                r={36}
                stroke={Colors.primary}
                strokeWidth={7}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 36}`}
                strokeDashoffset={
                  2 * Math.PI * 36 * (1 - (summary?.completionPercent ?? 0) / 100)
                }
                rotation={-90}
                origin="44,44"
              />
            </Svg>
            <Text style={styles.ringValue}>
              {summary ? `${summary.completionPercent}%` : '—'}
            </Text>
          </View>
        </View>
        <View style={styles.progressStats}>
          {[
            ['Pending', summary?.pending],
            ['In progress', summary?.inProgress],
            ['Completed', summary?.completed],
          ].map(([label, count]) => (
            <View key={label} style={styles.progressStat}>
              <Text style={styles.smallNumber}>{count ?? '—'}</Text>
              <Text style={styles.tiny}>{label}</Text>
            </View>
          ))}
        </View>
        {summary !== null && (
          <View style={styles.insight}>
            <AppIcon name="clock" size={17} color={Colors.warning} />
            <Text style={styles.insightText}>
              {summary.urgent
                ? `${summary.urgent} high-priority ${summary.urgent === 1 ? 'task needs' : 'tasks need'} your attention.`
                : 'No high-priority tasks are waiting on your team.'}
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.createButton}
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: '/(tabs)/tasks',
              params: { compose: String(Date.now()) },
            })
          }
        >
          <AppIcon name="plus" color={Colors.card} size={20} />
          <Text style={styles.createText}>Create a task</Text>
          <AppIcon name="arrow" color={Colors.card} size={19} />
        </TouchableOpacity>
      </View>
      <View>
        <SectionTitle
          title="Team by department"
          detail={stats ? `${stats.departments.length} DEPARTMENTS` : 'UNAVAILABLE'}
        />
        {stats?.departments.length ? (
          <View style={styles.departmentCard}>
            {stats.departments.map((department, index) => {
              const percent =
                stats.totalEmployees > 0
                  ? Math.min(
                      100,
                      Math.max(0, (department.count / stats.totalEmployees) * 100),
                    )
                  : 0;
              return (
                <View key={department.department} style={styles.departmentRow}>
                  <View style={styles.departmentMeta}>
                    <Text style={styles.departmentName}>{department.department}</Text>
                    <Text style={styles.departmentCount}>{department.count} people</Text>
                  </View>
                  <View style={styles.track}>
                    <View
                      style={[
                        styles.bar,
                        {
                          width: `${percent}%`,
                          backgroundColor: index % 2 ? Colors.accent : Colors.primary,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <EmptyState
            icon="users"
            title={stats ? 'Your team starts here' : 'Team data unavailable'}
            message={
              stats
                ? 'Add employees to see your department breakdown.'
                : 'Pull down to retry the connection.'
            }
          />
        )}
      </View>
      <View>
        <SectionTitle title="Recently created tasks" detail="LATEST FIRST" />
        {latest.length ? (
          <View style={styles.departmentCard}>
            {latest.map((task) => (
              <TouchableOpacity
                style={styles.recentRow}
                key={task.id}
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/tasks',
                    params: { taskId: String(task.id) },
                  })
                }
              >
                <View style={styles.recentIcon}>
                  <AppIcon name="task" size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recentTitle} numberOfLines={1}>
                    {task.title}
                  </Text>
                  <Text style={styles.tiny}>
                    {task.status === 'InProgress' ? 'In progress' : task.status} ·{' '}
                    {task.priority} priority
                  </Text>
                </View>
                <AppIcon name="chevron" size={17} color={Colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <EmptyState
            icon="task"
            title={tasks ? 'Room for your next idea' : 'Tasks unavailable'}
            message={
              tasks
                ? 'Create a task and give your team a clear next step.'
                : 'Pull down to reload your tasks.'
            }
          />
        )}
      </View>
      <Text style={styles.footer}>
        {updated
          ? `Updated ${updated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · Pull down to refresh`
          : 'Pull down to refresh your workspace'}
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { ...Layout.page },
  center: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  hero: {
    backgroundColor: Colors.ink,
    borderRadius: 26,
    padding: 24,
    overflow: 'hidden',
  },
  heroOrb: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 38,
    borderColor: '#24534B',
    top: -90,
    right: -90,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroEyebrow: {
    fontSize: 9,
    letterSpacing: 1.8,
    color: Colors.onInk,
    fontWeight: '700',
    flex: 1,
  },
  heroLogo: {
    backgroundColor: '#24534B',
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.card,
    marginTop: 14,
    letterSpacing: -1,
  },
  heroSubtitle: { color: Colors.onInk, lineHeight: 22, fontSize: 13, marginTop: 8 },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  dateTag: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  dateText: { color: Colors.onInk, fontSize: 11 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.mint },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metric: { ...Layout.card, flexGrow: 1, flexBasis: '45%', padding: 18 },
  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  metricNumber: {
    color: Colors.textDark,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -1,
  },
  metricLabel: { color: Colors.textMuted, fontSize: 12, marginTop: 5 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickCard: { ...Layout.card, flexBasis: '45%', flexGrow: 1, padding: 16, gap: 7 },
  quickTitle: { color: Colors.textDark, fontWeight: '700', fontSize: 14, marginTop: 4 },
  quickDetail: { color: Colors.textMuted, fontSize: 11 },
  progressCard: { ...Layout.card, padding: 22, gap: 18 },
  progressTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  cardTitle: { fontSize: 21, fontWeight: '700', color: Colors.textDark },
  muted: { color: Colors.textMuted, fontSize: 12, lineHeight: 20, marginTop: 5 },
  ring: { width: 88, height: 88, alignItems: 'center', justifyContent: 'center' },
  ringValue: {
    position: 'absolute',
    fontWeight: '800',
    color: Colors.textDark,
    fontSize: 21,
  },
  progressStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 16,
  },
  progressStat: { flex: 1, alignItems: 'center', gap: 5 },
  smallNumber: { fontSize: 23, fontWeight: '800', color: Colors.textDark },
  tiny: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  insight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  insightText: { flex: 1, color: Colors.textMuted, fontSize: 12, lineHeight: 19 },
  createButton: {
    minHeight: 48,
    paddingHorizontal: 16,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
  },
  createText: { color: Colors.card, fontSize: 14, fontWeight: '700', flex: 1 },
  departmentCard: { ...Layout.card, padding: 18 },
  departmentRow: { paddingVertical: 12, gap: 10 },
  departmentMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  departmentName: { color: Colors.textDark, fontSize: 14, fontWeight: '600', flex: 1 },
  departmentCount: { color: Colors.textMuted, fontSize: 11 },
  track: {
    height: 6,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  bar: { height: 6, borderRadius: 3 },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 68,
    paddingVertical: 10,
  },
  recentIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentTitle: { fontSize: 14, color: Colors.textDark, fontWeight: '600' },
  footer: { textAlign: 'center', fontSize: 10, color: Colors.textMuted, marginBottom: 8 },
  error: { backgroundColor: Colors.errorSoft, borderRadius: 14, padding: 14 },
});
