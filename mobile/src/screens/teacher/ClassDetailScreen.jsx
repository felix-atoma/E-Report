import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { classesService } from '../../services/classesService';
import { reportsService } from '../../services/reportsService';
import Card from '../../components/common/Card';
import StatusPill from '../../components/common/StatusPill';
import { fontSize, fontWeight, radius, shadow, spacing } from '../../theme';

export default function ClassDetailScreen({ route, navigation }) {
  const { classId } = route.params;
  const { colors } = useTheme();
  const [classData, setClassData] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchData() {
    try {
      const [classRes, reportsRes] = await Promise.all([
        classesService.getById(classId),
        reportsService.getAll({ classId }),
      ]);
      setClassData(classRes.data.data ?? null);
      setReports(reportsRes.data.data ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { fetchData(); }, [classId]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgSubtle }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const students = classData?.students ?? [];
  const published = reports.filter((r) => r.status === 'PUBLISHED').length;
  const drafts = reports.filter((r) => r.status === 'DRAFT').length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bgSubtle }]}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(); }}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.scroll}
      >
        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{students.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Élèves</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.success }]}>{published}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Publiés</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.accent }]}>{drafts}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Brouillons</Text>
          </View>
        </View>

        {/* Students */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Élèves ({students.length})
        </Text>

        {students.length === 0 ? (
          <Card>
            <Text style={[styles.empty, { color: colors.textMuted }]}>Aucun élève inscrit.</Text>
          </Card>
        ) : (
          <Card padded={false} style={{ marginBottom: spacing.xl }}>
            {students.map((student, i) => (
              <View
                key={student.id}
                style={[
                  styles.studentRow,
                  { borderTopColor: colors.border },
                  i === 0 ? { borderTopWidth: 0 } : {},
                ]}
              >
                <View style={[styles.avatar, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={[styles.avatarText, { color: colors.primary }]}>
                    {(student.user?.name ?? student.admissionNumber ?? '?')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.studentInfo}>
                  <Text style={[styles.studentName, { color: colors.text }]}>
                    {student.user?.name ?? student.admissionNumber}
                  </Text>
                  <Text style={[styles.studentMeta, { color: colors.textMuted }]}>
                    N° {student.admissionNumber}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Report cards */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Bulletins ({reports.length})
        </Text>

        {reports.length === 0 ? (
          <Card>
            <Text style={[styles.empty, { color: colors.textMuted }]}>Aucun bulletin créé.</Text>
          </Card>
        ) : (
          reports.map((report) => (
            <TouchableOpacity
              key={report.id}
              activeOpacity={0.85}
              style={[styles.reportCard, shadow.sm, { backgroundColor: colors.bg, borderColor: colors.border }]}
              onPress={() => navigation.navigate('TeacherReportCard', { reportId: report.id })}
            >
              <View style={styles.reportMain}>
                <View style={styles.reportInfo}>
                  <Text style={[styles.reportTerm, { color: colors.text }]}>{report.termName}</Text>
                  <Text style={[styles.reportStudent, { color: colors.textMuted }]}>
                    {report.student?.user?.name ?? report.student?.admissionNumber ?? '—'}
                  </Text>
                  {report.overallAverage != null && (
                    <Text style={[styles.reportAvg, { color: colors.primary }]}>
                      Moy : {report.overallAverage.toFixed(2)}/20
                    </Text>
                  )}
                </View>
                <View style={styles.reportRight}>
                  <StatusPill status={report.status} />
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={{ marginTop: spacing.xs }} />
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: spacing.lg },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  statCard: { flex: 1, borderRadius: radius.md, borderWidth: 1, padding: spacing.md, alignItems: 'center' },
  statValue: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  statLabel: { fontSize: fontSize.xs, marginTop: 2 },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, marginBottom: spacing.md },
  empty: { fontSize: fontSize.sm, textAlign: 'center', paddingVertical: spacing.sm },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderTopWidth: 1,
    gap: spacing.md,
  },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: fontWeight.bold, fontSize: fontSize.sm },
  studentInfo: { flex: 1 },
  studentName: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  studentMeta: { fontSize: fontSize.xs, marginTop: 2 },
  reportCard: { borderRadius: radius.md, borderWidth: 1, padding: spacing.md, marginBottom: spacing.md },
  reportMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reportInfo: { flex: 1 },
  reportTerm: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  reportStudent: { fontSize: fontSize.sm, marginTop: 2 },
  reportAvg: { fontSize: fontSize.sm, marginTop: 4, fontWeight: fontWeight.medium },
  reportRight: { alignItems: 'flex-end', gap: 4 },
});
