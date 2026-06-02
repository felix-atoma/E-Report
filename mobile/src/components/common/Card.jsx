import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { radius, shadow, spacing } from '../../theme';

export default function Card({ children, style, padded = true, accent }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        shadow.sm,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
        },
        accent && { borderLeftWidth: 4, borderLeftColor: accent },
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  padded: {
    padding: spacing.lg,
  },
});
