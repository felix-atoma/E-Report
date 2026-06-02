import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

const CONFIG = {
  PAID:      { label: 'À jour',        color: '#10b981' },
  PARTIAL:   { label: 'Partiel',       color: '#f59e0b' },
  UNPAID:    { label: 'Non payé',      color: '#ef4444' },
  EXEMPT:    { label: 'Exonéré',       color: '#64748b' },
  PUBLISHED: { label: 'Publié',        color: '#10b981' },
  DRAFT:     { label: 'Brouillon',     color: '#94a3b8' },
  REVIEW:    { label: 'En révision',   color: '#f59e0b' },
};

export default function StatusPill({ status }) {
  const { colors } = useTheme();
  const cfg = CONFIG[status];
  if (!cfg) return null;
  const color = cfg.color;

  return (
    <View style={[styles.pill, { backgroundColor: color + '18', borderColor: color + '50' }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
});
