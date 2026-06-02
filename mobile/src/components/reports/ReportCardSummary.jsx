import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { fontSize, fontWeight, radius, shadow, spacing } from '../../theme';
import StatusPill from '../common/StatusPill';

function scoreColor(avg, colors) {
  if (avg == null) return colors.textMuted;
  if (avg >= 16) return '#10b981';
  if (avg >= 10) return '#3b82f6';
  return '#ef4444';
}

export default function ReportCardSummary({ report, onPress }) {
  const { colors } = useTheme();
  const avg  = report.overallAverage?.toFixed(2) ?? null;
  const rank = report.classRank && report.classSize
    ? `${report.classRank}/${report.classSize}`
    : null;
  const color = scoreColor(report.overallAverage, colors);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}
      style={[styles.card, shadow.sm, { backgroundColor: colors.bg }]}>

      {/* Left accent bar colored by performance */}
      <View style={[styles.accentBar, { backgroundColor: report.status === 'PUBLISHED' ? color : colors.border }]} />

      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={styles.termGroup}>
            <Text style={[styles.termName, { color: colors.text }]}>{report.termName}</Text>
            <Text style={[styles.year, { color: colors.textMuted }]}>{report.academicYear}</Text>
          </View>
          <StatusPill status={report.status} />
        </View>

        {report.status === 'PUBLISHED' && avg && (
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color }]}>{avg}</Text>
              <Text style={[styles.statDen, { color: colors.textMuted }]}>/20</Text>
            </View>
            {rank && (
              <>
                <View style={[styles.dot, { backgroundColor: colors.border }]} />
                <View style={styles.stat}>
                  <Ionicons name="trophy-outline" size={12} color={colors.textMuted} />
                  <Text style={[styles.rankText, { color: colors.textMuted }]}>{rank}</Text>
                </View>
              </>
            )}
            {report.mention && (
              <View style={[styles.mentionBadge, { backgroundColor: color + '18' }]}>
                <Text style={[styles.mentionText, { color }]}>{report.mention}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={styles.chevron} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  accentBar: { width: 4, alignSelf: 'stretch' },
  body: { flex: 1, padding: spacing.md },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xs },
  termGroup: {},
  termName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  year: { fontSize: fontSize.xs, marginTop: 1 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  stat: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  statValue: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  statDen: { fontSize: fontSize.xs },
  dot: { width: 4, height: 4, borderRadius: 2 },
  rankText: { fontSize: fontSize.xs, marginLeft: 2 },
  mentionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginLeft: 'auto',
  },
  mentionText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  chevron: { marginRight: spacing.md },
});
