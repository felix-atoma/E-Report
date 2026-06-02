import { useCallback, useState } from 'react';
import {
  ActivityIndicator, FlatList, RefreshControl,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { classesService } from '../../services/classesService';
import { reportsService } from '../../services/reportsService';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

const TERMS = [
  { n: 1, label: 'T1' },
  { n: 2, label: 'T2' },
  { n: 3, label: 'T3' },
];

const CONDUCT_COLORS = {
  TRES_BIEN: '#10b981',
  BIEN:      '#3b82f6',
  PASSABLE:  '#f59e0b',
  MEDIOCRE:  '#ef4444',
};

function currentAcademicYear() {
  const m = new Date().getMonth();
  const y = new Date().getFullYear();
  return m >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

export default function TitulaireListScreen({ route, navigation }) {
  const { classId, className } = route.params;
  const { colors } = useTheme();
  const [termNum, setTermNum]   = useState(1);
  const [students, setStudents] = useState([]);
  const [reportMap, setReportMap] = useState({});  // studentId → report
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const academicYear = currentAcademicYear();

  const load = useCallback(async () => {
    try {
      const [classRes, reportsRes] = await Promise.all([
        classesService.getById(classId),
        reportsService.getAll({ classId, academicYear, termNumber: termNum }),
      ]);
      setStudents(classRes.data.data?.students ?? []);
      const map = {};
      (reportsRes.data.data ?? []).forEach((r) => { map[r.studentId] = r; });
      setReportMap(map);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [classId, termNum, academicYear]);

  useFocusEffect(load);

  const filled = students.filter((s) => reportMap[s.id]?.conductRating).length;

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safe, { backgroundColor: colors.bgSubtle }]}>
      {/* Term selector */}
      <View style={[styles.termBar, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        {TERMS.map((t) => (
          <TouchableOpacity key={t.n} onPress={() => setTermNum(t.n)}
            style={[styles.termBtn, {
              backgroundColor: termNum === t.n ? colors.primary : colors.bgMuted,
              borderColor: termNum === t.n ? colors.primary : colors.border,
            }]}>
            <Text style={[styles.termBtnText, { color: termNum === t.n ? '#fff' : colors.textMuted }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={[styles.progress, { color: colors.textMuted }]}>
          {filled}/{students.length} remplis
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(s) => s.id}
          refreshControl={
            <RefreshControl refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={colors.primary} />
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Aucun élève dans cette classe.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const report = reportMap[item.id];
            const conduct = report?.conductRating;
            const conductColor = CONDUCT_COLORS[conduct] ?? colors.border;
            const hasData = !!(conduct || report?.teacherComment || report?.attendanceDays);

            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate('TitulaireStudent', {
                  studentId: item.id,
                  studentName: item.user?.name ?? item.admissionNumber,
                  reportId: report?.id ?? null,
                  classId,
                  academicYear,
                  termNumber: termNum,
                })}
                style={[styles.card, { backgroundColor: colors.bg }]}
              >
                <View style={[styles.conductBar, { backgroundColor: conductColor }]} />
                <View style={[styles.avatar, { backgroundColor: conductColor + '20' }]}>
                  <Text style={[styles.avatarText, { color: conductColor }]}>
                    {(item.user?.name ?? item.admissionNumber ?? '?')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.studentInfo}>
                  <Text style={[styles.studentName, { color: colors.text }]}>
                    {item.user?.name ?? item.admissionNumber}
                  </Text>
                  <Text style={[styles.studentMeta, { color: colors.textMuted }]}>
                    N° {item.admissionNumber}
                  </Text>
                </View>
                <View style={styles.statusCol}>
                  {hasData ? (
                    <View style={[styles.statusBadge, { backgroundColor: conductColor + '20' }]}>
                      <Text style={[styles.statusText, { color: conductColor }]}>
                        {conduct ?? 'Partiel'}
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.empty2, { color: colors.textMuted }]}>—</Text>
                  )}
                  <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  termBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.md, borderBottomWidth: 1,
  },
  termBtn: {
    paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.md,
    borderRadius: radius.full, borderWidth: 1.5,
  },
  termBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  progress: { marginLeft: 'auto', fontSize: fontSize.xs },
  list: { padding: spacing.lg },
  card: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.lg, marginBottom: spacing.sm,
    overflow: 'hidden', gap: spacing.md, paddingRight: spacing.md,
  },
  conductBar: { width: 4, alignSelf: 'stretch' },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginLeft: 0 },
  avatarText: { fontWeight: fontWeight.bold, fontSize: fontSize.sm },
  studentInfo: { flex: 1, paddingVertical: spacing.md },
  studentName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  studentMeta: { fontSize: fontSize.xs, marginTop: 2 },
  statusCol: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  statusText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  empty: { padding: spacing.xl, alignItems: 'center' },
  empty2: { fontSize: fontSize.sm },
  emptyText: { fontSize: fontSize.sm, textAlign: 'center' },
});
