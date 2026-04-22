import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { fontSize, fontWeight, radius, spacing } from '../../theme';
import Button from '../common/Button';

export default function PaywallNotice({ studentName, termName, balance, currency = 'FCFA', onContact }) {
  const { colors } = useTheme();

  const formattedBalance = balance?.toLocaleString('fr-FR') ?? '—';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bgSubtle,
          borderColor: colors.border,
          borderLeftColor: colors.warning,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.icon}>📋</Text>
        <Text style={[styles.title, { color: colors.text }]}>Bulletin disponible</Text>
      </View>

      <Text style={[styles.message, { color: colors.textMuted }]}>
        Le bulletin de{' '}
        <Text style={{ fontWeight: fontWeight.semibold, color: colors.text }}>{studentName}</Text>
        {' '}pour le{' '}
        <Text style={{ fontWeight: fontWeight.semibold, color: colors.text }}>{termName}</Text>
        {' '}est disponible. Veuillez régler les frais de scolarité pour y accéder.
      </Text>

      <View style={[styles.balanceBox, { backgroundColor: colors.bg }]}>
        <Text style={[styles.balanceLabel, { color: colors.textMuted }]}>Solde restant</Text>
        <Text style={[styles.balanceAmount, { color: colors.danger }]}>
          {formattedBalance} {currency}
        </Text>
      </View>

      <Button
        title="Contacter la comptabilité"
        onPress={onContact}
        fullWidth
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    fontSize: fontSize.xl,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  message: {
    fontSize: fontSize.sm,
    lineHeight: 22,
  },
  balanceBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.sm,
  },
  balanceLabel: {
    fontSize: fontSize.sm,
  },
  balanceAmount: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
});
