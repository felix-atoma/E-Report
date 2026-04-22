import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { fontSize, fontWeight, radius, shadow, spacing } from '../../theme';
import StatusPill from '../common/StatusPill';

function MentionBadge({ mention, colors }) {
  if (!mention) return null;
  return (
    <View style={[styles.mentionBadge, { backgroundColor: colors.primary + '15' }]}>
      <Text style={[styles.mentionText, { color: colors.primary }]}>{mention}</Text>
    </View>
  );
}

export default function ReportCardSummary({ report, onPress }) {
  const { colors } = useTheme();

  const avg = report.overallAverage?.toFixed(2) ?? '—';
  const rank = report.classRank && report.classSize
    ? `${report.classRank}e / ${report.classSize}`
    : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.card, shadow.sm, { backgroundColor: colors.bg, borderColor: colors.border }]}
    >
      <View style={styles.topRow}>
        <Text style={[styles.termName, { color: colors.text }]}>{report.termName}</Text>
        <StatusPill status={report.status} />
      </View>

      <Text style={[styles.year, { color: colors.textMuted }]}>{report.academicYear}</Text>

      {report.status === 'PUBLISHED' && (
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{avg}<Text style={styles.statUnit}>/20</Text></Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Moyenne</Text>
          </View>

          {rank && (
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          )}

          {rank && (
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.text }]}>{rank}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Rang</Text>
            </View>
          )}

          <MentionBadge mention={report.mention} colors={colors} />
        </View>
      )}

      <View style={[styles.arrow, { borderColor: colors.border }]}>
        <Text style={{ color: colors.textMuted }}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  termName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  year: {
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  statUnit: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.regular,
  },
  statLabel: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 32,
  },
  mentionBadge: {
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginLeft: 'auto',
  },
  mentionText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  arrow: {
    position: 'absolute',
    right: spacing.lg,
    top: '50%',
  },
});
