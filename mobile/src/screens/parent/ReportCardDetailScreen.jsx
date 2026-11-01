import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { reportsService } from '../../services/reportsService';
import StatusPill from '../../components/common/StatusPill';
import Card from '../../components/common/Card';
import { openPdf } from '../../utils/openPdf';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

export default function ReportCardDetailScreen({ route }) {
  const { reportId } = route.params;
  const { colors } = useTheme();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    reportsService.getById(reportId)
      .then((res) => setReport(res.data.data))
      .finally(() => setLoading(false));
  }, [reportId]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgSubtle }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!report) return null;

  const avg = report.overallAverage?.toFixed(2) ?? '—';

  // Bulletin officiel (PDF signé, avec code de vérification) : ouvert, enregistré ou partagé depuis le téléphone
  async function downloadPdf() {
    setDownloading(true);
    try {
      await openPdf(`/reports/${report.id}/pdf-download`, `Bulletin-${report.termName}-${report.academicYear}.pdf`);
    } catch (err) {
      Alert.alert('Bulletin PDF', err.message ?? 'Téléchargement impossible.');
    } finally { setDownloading(false); }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bgSubtle }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header summary */}
        <Card>
          <View style={styles.summaryRow}>
            <View>
              <Text style={[styles.termName, { color: colors.text }]}>{report.termName}</Text>
              <Text style={[styles.year, { color: colors.textMuted }]}>{report.academicYear}</Text>
            </View>
            <StatusPill status={report.status} />
          </View>

          <View style={[styles.avgBox, { backgroundColor: colors.primary + '10' }]}>
            <Text style={[styles.avgValue, { color: colors.primary }]}>{avg}<Text style={{ fontSize: fontSize.lg }}>/20</Text></Text>
            <Text style={[styles.avgLabel, { color: colors.textMuted }]}>Moyenne générale</Text>
            {report.mention && (
              <Text style={[styles.mention, { color: colors.primary }]}>Mention : {report.mention}</Text>
            )}
          </View>

          {report.classRank && report.classSize && (
            <Text style={[styles.rank, { color: colors.textMuted }]}>
              Rang : {report.classRank}e sur {report.classSize} élèves
            </Text>
          )}
        </Card>

        {report.status === 'PUBLISHED' && (
          <TouchableOpacity
            onPress={downloadPdf}
            disabled={downloading}
            style={[styles.pdfBtn, { backgroundColor: colors.primary, opacity: downloading ? 0.7 : 1 }]}
          >
            {downloading
              ? <ActivityIndicator color="#fff" />
              : <><Ionicons name="document-text-outline" size={18} color="#fff" /><Text style={styles.pdfBtnText}>Télécharger le bulletin (PDF)</Text></>}
          </TouchableOpacity>
        )}

        {/* Grades table */}
        {report.grades?.length > 0 && (
          <Card padded={false}>
            <Text style={[styles.sectionTitle, { color: colors.text, padding: spacing.md }]}>Notes par matière</Text>
            <View style={[styles.tableHeader, { backgroundColor: colors.bgMuted }]}>
              <Text style={[styles.colMatiere, styles.headerCell, { color: colors.textMuted }]}>Matière</Text>
              <Text style={[styles.colNote, styles.headerCell, { color: colors.textMuted }]}>Note</Text>
              <Text style={[styles.colCoef, styles.headerCell, { color: colors.textMuted }]}>Coef.</Text>
              <Text style={[styles.colPoints, styles.headerCell, { color: colors.textMuted }]}>Points</Text>
            </View>
            {report.grades.map((g, i) => (
              <View
                key={g.id}
                style={[
                  styles.tableRow,
                  { borderTopColor: colors.border },
                  i % 2 === 0 ? {} : { backgroundColor: colors.bgSubtle },
                ]}
              >
                <Text style={[styles.colMatiere, styles.cell, { color: colors.text }]}>
                  {g.subject?.nameFr ?? '—'}
                </Text>
                <Text style={[styles.colNote, styles.cell, { color: g.score >= 10 ? colors.success : colors.danger, fontWeight: fontWeight.semibold }]}>
                  {g.score?.toFixed(2) ?? '—'}
                </Text>
                <Text style={[styles.colCoef, styles.cell, { color: colors.textMuted }]}>{g.coefficient}</Text>
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
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Appréciation du professeur</Text>
            <Text style={[styles.comment, { color: colors.textMuted }]}>{report.teacherComment}</Text>
          </Card>
        )}

        {report.principalComment && (
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Appréciation du directeur</Text>
            <Text style={[styles.comment, { color: colors.textMuted }]}>{report.principalComment}</Text>
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
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  termName: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
  year: { fontSize: fontSize.sm, marginTop: 2 },
  avgBox: { alignItems: 'center', padding: spacing.lg, borderRadius: 10, marginBottom: spacing.md },
  avgValue: { fontSize: 40, fontWeight: fontWeight.bold },
  avgLabel: { fontSize: fontSize.sm, marginTop: spacing.xs },
  mention: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, marginTop: spacing.xs },
  rank: { fontSize: fontSize.sm, textAlign: 'center' },
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
  pdfBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    paddingVertical: spacing.md, borderRadius: radius.md, marginBottom: spacing.md, minHeight: 48,
  },
  pdfBtnText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.semibold },
});
