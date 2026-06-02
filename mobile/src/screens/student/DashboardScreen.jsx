import { useCallback, useState } from 'react';
import {
  ActivityIndicator, RefreshControl, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { reportsService } from '../../services/reportsService';
import { bulletinsService } from '../../services/bulletinsService';
import HeroHeader from '../../components/common/HeroHeader';
import ReportCardSummary from '../../components/reports/ReportCardSummary';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

function getMention(avg) {
  if (avg == null) return null;
  if (avg >= 18) return { label: 'Excellent',   color: '#15803d' };
  if (avg >= 16) return { label: 'Très Bien',   color: '#1d4ed8' };
  if (avg >= 14) return { label: 'Bien',         color: '#7c3aed' };
  if (avg >= 12) return { label: 'Assez Bien',   color: '#d97706' };
  if (avg >= 10) return { label: 'Passable',     color: '#d97706' };
  return               { label: 'Insuffisant',  color: '#dc2626' };
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour 👋';
  if (h < 18) return 'Bon après-midi 👋';
  return 'Bonsoir 👋';
}

export default function StudentDashboardScreen({ navigation }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [reports, setReports]     = useState([]);
  const [bulletins, setBulletins] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [rpRes, bulRes] = await Promise.all([
        reportsService.getAll(),
        bulletinsService.list().catch(() => ({ data: { data: [] } })),
      ]);
      setReports(rpRes.data.data ?? []);
      setBulletins(bulRes.data.data ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(fetchAll);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgSubtle }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const published = reports.filter((r) => r.status === 'PUBLISHED');
  const latestReport = [...published].sort((a, b) => {
    if (a.academicYear !== b.academicYear) return b.academicYear.localeCompare(a.academicYear);
    return (b.termNumber ?? 0) - (a.termNumber ?? 0);
  })[0] ?? null;

  const mention = getMention(latestReport?.overallAverage);
  const recentBulletins = bulletins.filter((b) => b.publishedAt).slice(0, 3);

  const globalAvg = published.length > 0
    ? (published.reduce((s, r) => s + (r.overallAverage ?? 0), 0) / published.length).toFixed(2)
    : null;

  const avgColor = globalAvg
    ? Number(globalAvg) >= 14 ? '#10b981'
    : Number(globalAvg) >= 10 ? '#f59e0b'
    : '#ef4444'
    : '#fff';

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.primary }]}>
      <ScrollView
        style={{ backgroundColor: colors.bgSubtle }}
        refreshControl={
          <RefreshControl refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchAll(); }}
            tintColor={colors.primary} />
        }
      >
        <HeroHeader greeting={greeting()} name={user?.name ?? ''}>
          {globalAvg && (
            <View style={styles.avgRow}>
              <View style={[styles.avgBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <Text style={[styles.avgNum, { color: avgColor === '#fff' ? '#fff' : avgColor }]}>
                  {globalAvg}
                </Text>
                <Text style={styles.avgDen}>/20</Text>
                <Text style={styles.avgLabel}>Moyenne générale</Text>
              </View>
            </View>
          )}
        </HeroHeader>

        <View style={styles.body}>
          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.bg }]}>
              <Text style={[styles.statNum, { color: '#10b981' }]}>{published.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Bulletins</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.bg }]}>
              <Text style={[styles.statNum, { color: colors.primary }]}>{recentBulletins.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Annonces</Text>
            </View>
            <TouchableOpacity
              style={[styles.statCard, { backgroundColor: colors.bg }]}
              onPress={() => navigation.navigate('Progress')}
              activeOpacity={0.8}
            >
              <Ionicons name="trending-up" size={22} color={colors.primary} />
              <Text style={[styles.statLabel, { color: colors.primary }]}>Progression</Text>
            </TouchableOpacity>
          </View>

          {/* Featured latest report */}
          {latestReport && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Dernier bulletin</Text>
              <View style={[styles.featuredCard, { backgroundColor: colors.bg }]}>
                <View style={styles.featuredTop}>
                  <View>
                    <Text style={[styles.featuredTerm, { color: colors.text }]}>
                      {latestReport.termName ?? `Trimestre ${latestReport.termNumber}`}
                    </Text>
                    <Text style={[styles.featuredYear, { color: colors.textMuted }]}>
                      {latestReport.academicYear}
                    </Text>
                  </View>
                  {latestReport.overallAverage != null && (
                    <View style={styles.featuredAvgGroup}>
                      <Text style={[styles.featuredAvg, { color: mention?.color ?? colors.primary }]}>
                        {latestReport.overallAverage.toFixed(2).replace('.', ',')}
                        <Text style={{ fontSize: fontSize.sm }}>/20</Text>
                      </Text>
                      {mention && (
                        <View style={[styles.mentionBadge, { backgroundColor: mention.color + '15' }]}>
                          <Text style={[styles.mentionText, { color: mention.color }]}>{mention.label}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
                {latestReport.teacherComment && (
                  <Text style={[styles.comment, { color: colors.textMuted }]} numberOfLines={2}>
                    « {latestReport.teacherComment} »
                  </Text>
                )}
                <TouchableOpacity
                  onPress={() => navigation.navigate('ReportCardDetail', { reportId: latestReport.id })}
                  style={[styles.viewBtn, { borderColor: colors.primary }]}
                >
                  <Text style={[styles.viewBtnText, { color: colors.primary }]}>Voir le bulletin</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Annual report link */}
          <TouchableOpacity
            onPress={() => navigation.navigate('AnnualReport', { studentId: user?.id, studentName: user?.name })}
            style={[styles.quickLink, { backgroundColor: colors.bg, borderColor: colors.border }]}
          >
            <Ionicons name="bar-chart-outline" size={18} color={colors.primary} />
            <Text style={[styles.quickLinkText, { color: colors.text }]}>Voir mon rapport annuel</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </TouchableOpacity>

          {/* All bulletins */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Tous mes bulletins
            <Text style={[styles.sectionCount, { color: colors.textMuted }]}> ({reports.length})</Text>
          </Text>

          {reports.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              <Ionicons name="document-text-outline" size={40} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Aucun bulletin disponible pour le moment.
              </Text>
            </View>
          ) : (
            reports.map((report) => (
              <ReportCardSummary
                key={report.id}
                report={report}
                onPress={() => navigation.navigate('ReportCardDetail', { reportId: report.id })}
              />
            ))
          )}

          {/* Recent announcements */}
          {recentBulletins.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text, marginTop: spacing.lg }]}>
                Annonces récentes
              </Text>
              {recentBulletins.map((b) => (
                <View key={b.id} style={[styles.bulletinCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <Text style={[styles.bulletinTitle, { color: colors.text }]} numberOfLines={2}>{b.title}</Text>
                  <Text style={[styles.bulletinDate, { color: colors.textMuted }]}>
                    {new Date(b.publishedAt).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
              ))}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avgRow: { marginTop: spacing.md },
  avgBadge: {
    flexDirection: 'row', alignItems: 'baseline', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, alignSelf: 'flex-start',
  },
  avgNum:   { color: '#fff', fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  avgDen:   { color: 'rgba(255,255,255,0.75)', fontSize: fontSize.sm },
  avgLabel: { color: 'rgba(255,255,255,0.75)', fontSize: fontSize.sm, marginLeft: spacing.xs },
  body: { padding: spacing.lg },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  statCard: { flex: 1, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', gap: 2 },
  statNum:  { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  statLabel:{ fontSize: fontSize.xs, textAlign: 'center' },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, marginBottom: spacing.md },
  sectionCount: { fontWeight: fontWeight.regular },
  featuredCard: { borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md },
  featuredTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  featuredTerm: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  featuredYear: { fontSize: fontSize.xs, marginTop: 2 },
  featuredAvgGroup: { alignItems: 'flex-end', gap: spacing.xs },
  featuredAvg:  { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  mentionBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  mentionText:  { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  comment:      { fontSize: fontSize.sm, fontStyle: 'italic', marginBottom: spacing.md },
  viewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, borderRadius: radius.md, borderWidth: 1.5,
    paddingVertical: spacing.sm,
  },
  viewBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  quickLink: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderRadius: radius.lg, borderWidth: 1,
    padding: spacing.md, marginBottom: spacing.lg,
  },
  quickLinkText: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  emptyCard: {
    borderRadius: radius.lg, borderWidth: 1,
    padding: spacing.xl, alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg,
  },
  emptyText: { fontSize: fontSize.sm, textAlign: 'center' },
  bulletinCard: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    borderRadius: radius.lg, borderWidth: 1,
    padding: spacing.md, marginBottom: spacing.sm, gap: spacing.md,
  },
  bulletinTitle: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  bulletinDate:  { fontSize: fontSize.xs },
});
