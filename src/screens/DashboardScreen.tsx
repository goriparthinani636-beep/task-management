//Backend nundi employee statistics teesukoni screen meeda display chestundi.
import React, { useEffect, useState, useCallback } from 'react';
//react = component ne create chayadheneke
//useState = Data/state ne store chayadheneke -> data  store
//useEffect = screen open ayinappudhu Api call chayadhaneke -> automatic action
//useCallback = Refresh function ni memoize cheyyadaniki. -> funtion memory
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { api } from '../services/api';
import { Colors } from '../theme/colors';

interface DepartmentStat {
  department: string;
  count: number;
}

interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  departments: DepartmentStat[];
}

export const DashboardScreen = () => {
  //react component start 
  //export valla vere file import cheyyagaladu.
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    //Idi dashboard data fetch cheyyadaniki main function.
    try {
      //try use to api request sucess aa failed aa handle chyadhaneke
      setError(null);
      //pevious errors remove start with fresh request
      const response = await api.get('/dashboard/stats'); // entire page this line is most important
      //Backend lo /dashboard/stats endpoint ki GET request pampu.
      //const BASE_URL = 'http://192.168.1.17:5299/api';
      //result = http://192.168.1.17:5299/api/dashboard/stats
      //Backend nundi vachina complete HTTP response ni response lo store chestunnam.
      setStats(response.data);
      //Backend data ni React state lo store chestunnam.
    } catch (err: any) {   //API request fail ayithe catch block.
      setError('Unable to load dashboard data. Pull down to retry.');
    } finally { //Success ayina failure ayina finally execute avtundi.
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats();
  }, []);
 
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.heading}>Overview</Text>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Metric Cards Row */}
      <View style={styles.metricsRow}>
        <View style={[styles.card, { borderLeftColor: Colors.primary }]}>
          <Text style={styles.cardLabel}>Total</Text>
          <Text style={styles.cardNumber}>{stats?.totalEmployees ?? 0}</Text>
        </View>

        <View style={[styles.card, { borderLeftColor: '#10B981' }]}>
          <Text style={styles.cardLabel}>Active</Text>
          <Text style={styles.cardNumber}>{stats?.activeEmployees ?? 0}</Text>
        </View>

        <View style={[styles.card, { borderLeftColor: '#EF4444' }]}>
          <Text style={styles.cardLabel}>Inactive</Text>
          <Text style={styles.cardNumber}>{stats?.inactiveEmployees ?? 0}</Text>
        </View>
      </View>

      {/* Departments Section */}
      <Text style={styles.sectionTitle}>Departments</Text>
      <View style={styles.departmentList}>
        {stats?.departments && stats.departments.length > 0 ? (
          stats.departments.map((item, index) => (
            <View key={index} style={styles.deptItem}>
              <Text style={styles.deptName}>{item.department}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.count} staff</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No departments found</Text>
        )}
      </View>
    </ScrollView>
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
    backgroundColor: Colors.background,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
  },
  cardLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  cardNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textDark,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 12,
  },
  departmentList: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    padding: 8,
    elevation: 2,
  },
  deptItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  deptName: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textDark,
  },
  badge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
  },
  emptyText: {
    color: Colors.textMuted,
    padding: 12,
    textAlign: 'center',
  },
});