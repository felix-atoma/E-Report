import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { reportsService } from '../../services/reportsService';
import ReportCardSummary from '../../components/reports/ReportCardSummary';
import Card from '../../components/common/Card';
import { fontSize, fontWeight, spacing } from '../../theme';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

export default function StudentDashboardScreen({ navigation }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchReports() {
    try {
      const res = await reportsService.getAll();
      setReports(res.data.data ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { fetchReports(); }, []);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgSubtle }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const published = reports.filter((r) => r.status === 'PUBLISHED' && r.overallAverage != null);
  const globalAvg =
    published.length > 0
      ? (published.reduce((sum, r) => sum + r.overallAverage, 0) / published.length).toFixed(2)
      : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bgSubtle }]}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchReports(); }}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.scroll}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: colors.textMuted }]}>{greeting()},</Text>
          <Text style={[styles.name, { color: colors.text }]}>{user?.name}</Text>
        </View>

        {/* Global average */}
        {globalAvg && (
          <Card style={styles.avgCard}>
            <Text style={[styles.avgLabel, { color: colors.textMuted }]}>Moyenne générale</Text>
            <View style={styles.avgRow}>
              <Text style={[styles.avgValue, { color: colors.primary }]}>
                {globalAvg}
                <Text style={[styles.avgDenom, { color: colors.textMuted }]}>/20</Text>
              </Text>
              <Text style={[styles.avgMeta, { color: colors.textMuted }]}>
                sur {published.length} trimestre{published.length > 1 ? 's' : ''}
              </Text>
            </View>
          </Card>
        )}

        {/* Bulletins */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Mes bulletins</Text>

        {reports.length === 0 ? (
          <Card>
            <Text style={[styles.empty, { color: colors.textMuted }]}>
              Aucun bulletin disponible pour le moment.
            </Text>
          </Card>
        ) : (
          reports.map((report) => (
            <ReportCardSummary
              key={report.id}
              report={report}
              onPress={() => navigation.navigate('ReportCardDetail', { reportId: report.id })}
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
  header: { marginBottom: spacing.xl },
  greeting: { fontSize: fontSize.sm },
  name: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  avgCard: { marginBottom: spacing.xl },
  avgLabel: { fontSize: fontSize.xs, marginBottom: spacing.xs },
  avgRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  avgValue: { fontSize: 36, fontWeight: fontWeight.bold },
  avgDenom: { fontSize: fontSize.lg, fontWeight: fontWeight.regular },
  avgMeta: { fontSize: fontSize.sm },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, marginBottom: spacing.md },
  empty: { fontSize: fontSize.sm, textAlign: 'center', paddingVertical: spacing.sm },
});
