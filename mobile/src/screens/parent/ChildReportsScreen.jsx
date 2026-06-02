import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { reportsService } from '../../services/reportsService';
import { feesService } from '../../services/feesService';
import ReportCardSummary from '../../components/reports/ReportCardSummary';
import PaywallNotice from '../../components/parent/PaywallNotice';
import Card from '../../components/common/Card';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

export default function ChildReportsScreen({ route, navigation }) {
  const { studentId, studentName } = route.params;
  const { colors } = useTheme();
  const [reports, setReports] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [reportsRes, feeRes] = await Promise.all([
          reportsService.getAll({ studentId }),
          feesService.getStudentSummary(studentId).catch(() => ({ data: { data: null } })),
        ]);
        setReports(reportsRes.data.data ?? []);
        setPaymentStatus(feeRes.data.data ?? null);
      } catch {
        // TODO: error state
      } finally {
        setLoading(false);
      }
    })();
  }, [studentId]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgSubtle }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const isBlocked = paymentStatus && ['UNPAID', 'PARTIAL'].includes(paymentStatus.status);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bgSubtle }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.titleRow}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>{studentName}</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>Bulletins de notes</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('AnnualReport', { studentId, studentName })}
            style={[styles.annualBtn, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}
          >
            <Ionicons name="bar-chart-outline" size={14} color={colors.primary} />
            <Text style={[styles.annualBtnText, { color: colors.primary }]}>Annuel</Text>
          </TouchableOpacity>
        </View>

        {/* Fee-gate paywall notice */}
        {isBlocked && paymentStatus && (
          <PaywallNotice
            studentName={studentName}
            termName={paymentStatus.termName ?? 'ce trimestre'}
            balance={Number(paymentStatus.balance ?? 0)}
            onContact={() => {/* TODO: link to contacts */}}
            style={{ marginBottom: spacing.lg }}
          />
        )}

        {/* Report cards list */}
        {reports.length === 0 ? (
          <Card>
            <Text style={[styles.empty, { color: colors.textMuted }]}>
              Aucun bulletin disponible.
            </Text>
          </Card>
        ) : (
          reports.map((report) => (
            <ReportCardSummary
              key={report.id}
              report={report}
              onPress={() => {
                if (isBlocked && report.status === 'PUBLISHED') return; // blocked
                navigation.navigate('ReportCardDetail', { reportId: report.id });
              }}
            />
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
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  subtitle: { fontSize: fontSize.sm, marginTop: 2 },
  annualBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, borderWidth: 1,
  },
  annualBtnText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  empty: { fontSize: fontSize.sm, textAlign: 'center', paddingVertical: spacing.md },
});
