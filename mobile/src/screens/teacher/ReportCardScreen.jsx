import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { reportsService } from '../../services/reportsService';
import Card from '../../components/common/Card';
import StatusPill from '../../components/common/StatusPill';
import { fontSize, fontWeight, spacing } from '../../theme';

export default function TeacherReportCardScreen({ route, navigation }) {
  const { reportId } = route.params;
  const { colors } = useTheme();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  const fetchReport = useCallback(() => {
    setLoading(true);
    reportsService.getById(reportId)
      .then((res) => setReport(res.data.data ?? null))
      .finally(() => setLoading(false));
  }, [reportId]);

  // Re-fetch every time this screen gains focus (e.g. returning from GradeEntry)
  useFocusEffect(fetchReport);

  async function handleSubmit() {
    Alert.alert(
      'Soumettre pour révision',
      'Envoyer ce bulletin en révision avant publication ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Soumettre', onPress: async () => {
          setPublishing(true);
          try {
            await reportsService.submit(reportId);
            fetchReport();
          } catch (err) {
            Alert.alert('Erreur', err.response?.data?.message ?? 'Impossible de soumettre.');
          } finally { setPublishing(false); }
        }},
      ],
    );
  }

  async function handlePublish() {
    Alert.alert(
      'Publier le bulletin',
      'Le bulletin sera visible par les parents (si les frais sont réglés). Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Publier', onPress: async () => {
          setPublishing(true);
          try {
            await reportsService.publish(reportId);
            fetchReport();
          } catch (err) {
            Alert.alert('Erreur', err.response?.data?.message ?? 'Impossible de publier.');
          } finally { setPublishing(false); }
        }},
      ],
    );
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgSubtle }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!report) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgSubtle }]}>
        <Text style={{ color: colors.textMuted }}>Bulletin introuvable.</Text>
      </View>
    );
  }

  const avg = report.overallAverage?.toFixed(2) ?? '—';
  const canEdit = ['DRAFT', 'REVIEW'].includes(report.status);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bgSubtle }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Student info */}
        <Card>
          <View style={styles.summaryRow}>
            <View>
              <Text style={[styles.studentName, { color: colors.text }]}>
                {report.student?.user?.name ?? report.student?.admissionNumber ?? '—'}
              </Text>
              <Text style={[styles.termName, { color: colors.textMuted }]}>
                {report.termName} · {report.academicYear}
              </Text>
            </View>
            <StatusPill status={report.status} />
          </View>

          {report.overallAverage != null && (
            <View style={[styles.avgBox, { backgroundColor: colors.primary + '10' }]}>
              <Text style={[styles.avgValue, { color: colors.primary }]}>
                {avg}
                <Text style={{ fontSize: fontSize.lg }}>/20</Text>
              </Text>
              <Text style={[styles.avgLabel, { color: colors.textMuted }]}>Moyenne générale</Text>
              {report.mention && (
                <Text style={[styles.mention, { color: colors.primary }]}>
                  Mention : {report.mention}
                </Text>
              )}
            </View>
          )}

          {report.classRank && report.classSize && (
            <Text style={[styles.rank, { color: colors.textMuted }]}>
              Rang : {report.classRank}e / {report.classSize} élèves
            </Text>
          )}
        </Card>

        {/* Edit metadata button — always visible for editable reports */}
        {canEdit && (
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.metaBtn, { backgroundColor: colors.bgMuted, borderColor: colors.border }]}
            onPress={() => navigation.navigate('EditReportMetadata', { reportId: report.id })}
          >
            <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
            <Text style={[styles.metaBtnText, { color: colors.textMuted }]}>
              Modifier les appréciations & absences
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Action buttons for editable reports */}
        {canEdit && (
          <View style={styles.actions}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.editBtn, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('GradeEntry', { reportId: report.id, classId: report.classId ?? report.class?.id })}
            >
              <Ionicons name="create-outline" size={18} color="#fff" />
              <Text style={styles.editBtnText}>Modifier</Text>
            </TouchableOpacity>

            {report.status === 'DRAFT' && (
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={publishing}
                style={[styles.publishBtn, { backgroundColor: '#f59e0b' }]}
                onPress={handleSubmit}
              >
                {publishing ? <ActivityIndicator size="small" color="#fff" /> : (
                  <>
                    <Ionicons name="eye-outline" size={18} color="#fff" />
                    <Text style={styles.editBtnText}>Soumettre</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {(report.status === 'REVIEW' || report.status === 'DRAFT') && (
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={publishing}
                style={[styles.publishBtn, { backgroundColor: colors.success }]}
                onPress={handlePublish}
              >
                {publishing ? <ActivityIndicator size="small" color="#fff" /> : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={styles.editBtnText}>Publier</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Grades table */}
        {report.grades?.length > 0 && (
          <Card padded={false}>
            <Text style={[styles.sectionTitle, { color: colors.text, padding: spacing.md }]}>
              Notes par matière
            </Text>
            <View style={[styles.tableHeader, { backgroundColor: colors.bgMuted }]}>
              <Text style={[styles.colMatiere, styles.headerCell, { color: colors.textMuted }]}>Matière</Text>
              <Text style={[styles.colNote, styles.headerCell, { color: colors.textMuted }]}>Note</Text>
              <Text style={[styles.colCoef, styles.headerCell, { color: colors.textMuted }]}>Coef</Text>
              <Text style={[styles.colPoints, styles.headerCell, { color: colors.textMuted }]}>Pts</Text>
            </View>
            {report.grades.map((g, i) => (
              <View
                key={g.id}
                style={[
                  styles.tableRow,
                  { borderTopColor: colors.border },
                  i % 2 !== 0 ? { backgroundColor: colors.bgSubtle } : {},
                ]}
              >
                <Text style={[styles.colMatiere, styles.cell, { color: colors.text }]}>
                  {g.subject?.nameFr ?? '—'}
                </Text>
                <Text
                  style={[
                    styles.colNote,
                    styles.cell,
                    { color: (g.score ?? 0) >= 10 ? colors.success : colors.danger, fontWeight: fontWeight.semibold },
                  ]}
                >
                  {g.score?.toFixed(2) ?? '—'}
                </Text>
                <Text style={[styles.colCoef, styles.cell, { color: colors.textMuted }]}>
                  {g.coefficient}
                </Text>
                <Text style={[styles.colPoints, styles.cell, { color: colors.text }]}>
                  {g.weightedScore?.toFixed(2) ?? '—'}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {/* Comments */}
        {report.teacherComment && (
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Appréciation</Text>
            <Text style={[styles.comment, { color: colors.textMuted }]}>{report.teacherComment}</Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: spacing.lg },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  studentName: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
  termName: { fontSize: fontSize.sm, marginTop: 2 },
  avgBox: { alignItems: 'center', padding: spacing.lg, borderRadius: 10, marginBottom: spacing.md },
  avgValue: { fontSize: 40, fontWeight: fontWeight.bold },
  avgLabel: { fontSize: fontSize.sm, marginTop: spacing.xs },
  mention: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, marginTop: spacing.xs },
  rank: { fontSize: fontSize.sm, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: 10,
    paddingVertical: spacing.md,
  },
  publishBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: 10,
    paddingVertical: spacing.md,
  },
  editBtnText: { color: '#fff', fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  metaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderRadius: radius.md, borderWidth: 1,
    paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md, marginBottom: spacing.sm,
  },
  metaBtnText: { flex: 1, fontSize: fontSize.sm },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, marginBottom: spacing.sm },
  tableHeader: { flexDirection: 'row', paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  tableRow: { flexDirection: 'row', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderTopWidth: 1 },
  headerCell: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  cell: { fontSize: fontSize.sm },
  colMatiere: { flex: 3 },
  colNote: { flex: 1, textAlign: 'center' },
  colCoef: { flex: 1, textAlign: 'center' },
  colPoints: { flex: 1, textAlign: 'right' },
  comment: { fontSize: fontSize.sm, lineHeight: 22 },
});
