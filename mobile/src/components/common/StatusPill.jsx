import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

const STATUS_CONFIG = {
  PAID: { labelFr: 'À jour', labelEn: 'Paid', colorKey: 'statusPaid' },
  PARTIAL: { labelFr: 'Partiel', labelEn: 'Partial', colorKey: 'statusPartial' },
  UNPAID: { labelFr: 'Non payé', labelEn: 'Unpaid', colorKey: 'statusUnpaid' },
  EXEMPT: { labelFr: 'Exonéré', labelEn: 'Exempt', colorKey: 'statusExempt' },
  PUBLISHED: { labelFr: 'Publié', labelEn: 'Published', colorKey: 'success' },
  DRAFT: { labelFr: 'Brouillon', labelEn: 'Draft', colorKey: 'textMuted' },
  REVIEW: { labelFr: 'En révision', labelEn: 'Review', colorKey: 'accent' },
};

export default function StatusPill({ status, lang = 'fr' }) {
  const { colors } = useTheme();
  const config = STATUS_CONFIG[status];
  if (!config) return null;

  const label = lang === 'fr' ? config.labelFr : config.labelEn;
  const color = colors[config.colorKey] ?? colors.textMuted;

  return (
    <View style={[styles.pill, { backgroundColor: color + '20', borderColor: color }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
});
