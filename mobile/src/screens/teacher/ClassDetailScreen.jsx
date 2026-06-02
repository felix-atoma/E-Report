import { useCallback, useState } from 'react';
import {
  ActivityIndicator, RefreshControl, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { classesService } from '../../services/classesService';
import { reportsService } from '../../services/reportsService';
import Card from '../../components/common/Card';
import StatusPill from '../../components/common/StatusPill';
import { fontSize, fontWeight, radius, shadow, spacing } from '../../theme';

function QuickAction({ icon, label, color, onPress, colors }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}
      style={[styles.quickAction, { backgroundColor: color + '12', borderColor: color + '30' }]}>
      <View style={[styles.qaIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.qaLabel, { color: colors.text }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

export default function ClassDetailScreen({ route, navigation }) {
  const { classId, className } = route.params;
  const { colors } = useTheme();
  const [classData, setClassData] = useState(null);
  const [reports, setReports]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [classRes, reportsRes] = await Promise.all([
        classesService.getById(classId),
        reportsService.getAll({ classId }),
      ]);
      setClassData(classRes.data.data ?? null);
      setReports(reportsRes.data.data ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [classId]);

  useFocusEffect(fetchData);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgSubtle }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const students  = classData?.students ?? [];
  const published = reports.filter((r) => r.status === 'PUBLISHED').length;
  const drafts    = reports.filter((r) => r.status === 'DRAFT').length;

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safe, { backgroundColor: colors.bgSubtle }]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.primary} />}
        contentContainerStyle={styles.scroll}
      >
        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { num: students.length, label: 'Élèves',    color: colors.primary },
            { num: published,       label: 'Publiés',   color: '#10b981' },
            { num: drafts,          label: 'Brouillons', color: '#f59e0b' },
          ].map((s) => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: colors.bg }]}>
              <Text style={[styles.statNum, { color: s.color }]}>{s.num}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick actions */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Actions</Text>
        <QuickAction icon="add-circle-outline"  label="Créer des bulletins"  color="#6366f1"
          onPress={() => navigation.navigate('CreateReportCard', { classId, className })} colors={colors} />
        <QuickAction icon="checkmark-done-outline" label="Registre des présences" color="#10b981"
          onPress={() => navigation.navigate('Attendance', { classId, className })} colors={colors} />
        <QuickAction icon="list-outline" label="Fiches de notes (par matière)" color="#f59e0b"
          onPress={() => navigation.navigate('FichesList', { classId, className })} colors={colors} />
        <QuickAction icon="clipboard-outline" label="Registre titulaire" color="#8b5cf6"
          onPress={() => navigation.navigate('TitulaireList', { classId, className })} colors={colors} />
        <QuickAction icon="bar-chart-outline" label="Statistiques de classe" color="#0ea5e9"
          onPress={() => navigation.navigate('ClassStats', { classId, className })} colors={colors} />

        {/* Students */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Élèves ({students.length})
        </Text>
        <Card padded={false}>
          {students.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textMuted, padding: spacing.lg }]}>Aucun élève inscrit.</Text>
          ) : (
            students.map((s, i) => (
              <TouchableOpacity
                key={s.id}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('StudentProfile', {
                  studentId: s.id,
                  studentName: s.user?.name ?? s.admissionNumber,
                })}
                style={[
                  styles.studentRow,
                  { borderTopColor: colors.border },
                  i === 0 ? { borderTopWidth: 0 } : {},
                ]}
              >
                <View style={[styles.avatar, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={[styles.avatarText, { color: colors.primary }]}>
                    {(s.user?.name ?? s.admissionNumber ?? '?')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.studentInfo}>
                  <Text style={[styles.studentName, { color: colors.text }]}>
                    {s.user?.name ?? s.admissionNumber}
                  </Text>
                  <Text style={[styles.studentMeta, { color: colors.textMuted }]}>N° {s.admissionNumber}</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </TouchableOpacity>
            ))
          )}
        </Card>

        {/* Report cards */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Bulletins ({reports.length})
        </Text>
        {reports.length === 0 ? (
          <Card>
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={36} color={colors.border} />
              <Text style={[styles.empty, { color: colors.textMuted }]}>Aucun bulletin créé.</Text>
            </View>
          </Card>
        ) : (
          reports.map((report) => (
            <TouchableOpacity
              key={report.id}
              activeOpacity={0.8}
              style={[styles.reportCard, shadow.sm, { backgroundColor: colors.bg }]}
              onPress={() => navigation.navigate('TeacherReportCard', { reportId: report.id })}
            >
              <View style={[styles.reportAccent, {
                backgroundColor: report.status === 'PUBLISHED' ? '#10b981'
                  : report.status === 'REVIEW' ? '#f59e0b' : colors.border,
              }]} />
              <View style={styles.reportBody}>
                <View style={styles.reportTopRow}>
                  <Text style={[styles.reportTerm, { color: colors.text }]}>{report.termName}</Text>
                  <StatusPill status={report.status} />
                </View>
                <Text style={[styles.reportStudent, { color: colors.textMuted }]}>
                  {report.student?.user?.name ?? report.student?.admissionNumber ?? '—'}
                </Text>
                {report.overallAverage != null && (
                  <Text style={[styles.reportAvg, {
                    color: report.overallAverage >= 10 ? '#10b981' : '#ef4444',
                  }]}>
                    {report.overallAverage.toFixed(2)}/20
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginRight: spacing.md }} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: spacing.lg },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  statCard: { flex: 1, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center' },
  statNum:  { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  statLabel:{ fontSize: fontSize.xs, marginTop: 2 },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, marginBottom: spacing.md, marginTop: spacing.sm },
  quickAction: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderRadius: radius.lg, borderWidth: 1,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  qaIcon:  { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  qaLabel: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  studentRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.md, borderTopWidth: 1, gap: spacing.md,
  },
  avatar:    { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText:{ fontWeight: fontWeight.bold, fontSize: fontSize.sm },
  studentInfo: { flex: 1 },
  studentName: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  studentMeta: { fontSize: fontSize.xs, marginTop: 2 },
  empty:     { fontSize: fontSize.sm, textAlign: 'center' },
  emptyState:{ alignItems: 'center', gap: spacing.sm },
  reportCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.lg, marginBottom: spacing.sm, overflow: 'hidden',
  },
  reportAccent: { width: 4, alignSelf: 'stretch' },
  reportBody:   { flex: 1, padding: spacing.md },
  reportTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reportTerm:   { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  reportStudent:{ fontSize: fontSize.sm, marginTop: 2 },
  reportAvg:    { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginTop: 4 },
});
