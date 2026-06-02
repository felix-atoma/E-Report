import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { studentsService } from '../../services/studentsService';
import { reportsService } from '../../services/reportsService';
import { feesService } from '../../services/feesService';
import Card from '../../components/common/Card';
import StatusPill from '../../components/common/StatusPill';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

const FEE_COLORS = { PAID: '#10b981', PARTIAL: '#f59e0b', UNPAID: '#ef4444', EXEMPT: '#64748b' };

export default function StudentProfileScreen({ route, navigation }) {
  const { studentId } = route.params;
  const { colors } = useTheme();
  const [student, setStudent] = useState(null);
  const [reports, setReports] = useState([]);
  const [fees, setFees]       = useState(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    (async () => {
      setLoading(true);
      try {
        const [sRes, rRes] = await Promise.all([
          studentsService.getById(studentId),
          reportsService.getAll({ studentId }),
        ]);
        setStudent(sRes.data.data);
        setReports(rRes.data.data ?? []);

        feesService.getStudentSummary(studentId)
          .then((r) => setFees(r.data.data))
          .catch(() => {});
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, [studentId]));

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgSubtle }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!student) return null;

  const name = student.user?.name ?? student.admissionNumber;
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  const published = reports.filter((r) => r.status === 'PUBLISHED');
  const avgAll = published.length > 0
    ? (published.reduce((s, r) => s + (r.overallAverage ?? 0), 0) / published.length).toFixed(2)
    : null;

  const feeColor = fees ? FEE_COLORS[fees.status] ?? colors.textMuted : colors.textMuted;

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safe, { backgroundColor: colors.bgSubtle }]}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header card */}
        <Card style={styles.headerCard}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={[styles.studentName, { color: colors.text }]}>{name}</Text>
          <Text style={[styles.admNum, { color: colors.textMuted }]}>N° {student.admissionNumber}</Text>

          <View style={styles.badgeRow}>
            {student.currentClass?.name && (
              <View style={[styles.badge, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[styles.badgeText, { color: colors.primary }]}>{student.currentClass.name}</Text>
              </View>
            )}
            {student.sex && (
              <View style={[styles.badge, { backgroundColor: colors.bgMuted }]}>
                <Text style={[styles.badgeText, { color: colors.textMuted }]}>
                  {student.sex === 'M' ? 'Garçon' : 'Fille'}
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.bg }]}>
            <Text style={[styles.statNum, { color: colors.primary }]}>{reports.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Bulletins</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.bg }]}>
            <Text style={[styles.statNum, { color: avgAll ? (Number(avgAll) >= 10 ? '#10b981' : '#ef4444') : colors.textMuted }]}>
              {avgAll ?? '—'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Moy. générale</Text>
          </View>
          {fees && (
            <View style={[styles.statCard, { backgroundColor: colors.bg }]}>
              <Text style={[styles.statNum, { color: feeColor }]}>
                {fees.status === 'PAID' ? '✓' : fees.status === 'EXEMPT' ? '—' : `${(fees.balance ?? 0).toLocaleString('fr-FR')}`}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                {fees.status === 'PAID' ? 'À jour' : fees.status === 'EXEMPT' ? 'Exonéré' : 'Solde dû (F)'}
              </Text>
            </View>
          )}
        </View>

        {/* Identity info */}
        {student.dateOfBirth && (
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Identité</Text>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.infoText, { color: colors.textMuted }]}>
                Né(e) le {new Date(student.dateOfBirth).toLocaleDateString('fr-FR')}
              </Text>
            </View>
          </Card>
        )}

        {/* Reports */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Bulletins ({reports.length})
        </Text>
        {reports.length === 0 ? (
          <Card>
            <Text style={[styles.empty, { color: colors.textMuted }]}>Aucun bulletin disponible.</Text>
          </Card>
        ) : (
          reports.map((r) => (
            <TouchableOpacity
              key={r.id}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('TeacherReportCard', { reportId: r.id })}
              style={[styles.reportRow, { backgroundColor: colors.bg, borderColor: colors.border }]}
            >
              <View style={styles.reportInfo}>
                <Text style={[styles.reportTerm, { color: colors.text }]}>{r.termName}</Text>
                <Text style={[styles.reportYear, { color: colors.textMuted }]}>{r.academicYear}</Text>
              </View>
              {r.overallAverage != null && (
                <Text style={[styles.reportAvg, {
                  color: r.overallAverage >= 10 ? '#10b981' : '#ef4444',
                }]}>
                  {r.overallAverage.toFixed(2)}/20
                </Text>
              )}
              <StatusPill status={r.status} />
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
  headerCard: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  studentName: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, textAlign: 'center' },
  admNum: { fontSize: fontSize.sm },
  badgeRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
  badge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full },
  badgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statCard: { flex: 1, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center' },
  statNum: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  statLabel: { fontSize: fontSize.xs, marginTop: 2, textAlign: 'center' },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, marginBottom: spacing.md },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoText: { fontSize: fontSize.sm },
  empty: { fontSize: fontSize.sm, textAlign: 'center' },
  reportRow: {
    flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg,
    borderWidth: 1, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.md,
  },
  reportInfo: { flex: 1 },
  reportTerm: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  reportYear: { fontSize: fontSize.xs, marginTop: 2 },
  reportAvg:  { fontSize: fontSize.md, fontWeight: fontWeight.bold },
});
