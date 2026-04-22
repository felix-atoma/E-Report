import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { reportsService } from '../../services/reportsService';
import { paymentsService } from '../../services/paymentsService';
import ReportCardSummary from '../../components/reports/ReportCardSummary';
import PaywallNotice from '../../components/parent/PaywallNotice';
import Card from '../../components/common/Card';
import { fontSize, fontWeight, spacing } from '../../theme';

export default function ChildReportsScreen({ route, navigation }) {
  const { studentId, studentName } = route.params;
  const { colors } = useTheme();
  const [reports, setReports] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [reportsRes, paymentRes] = await Promise.all([
          reportsService.getForStudent(studentId),
          paymentsService.getStudentStatus(studentId),
        ]);
        setReports(reportsRes.data.data ?? []);
        setPaymentStatus(paymentRes.data.data ?? null);
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
        <Text style={[styles.title, { color: colors.text }]}>{studentName}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Bulletins de notes</Text>

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
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  subtitle: { fontSize: fontSize.sm, marginBottom: spacing.lg },
  empty: { fontSize: fontSize.sm, textAlign: 'center', paddingVertical: spacing.md },
});
