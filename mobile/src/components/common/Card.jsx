import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { radius, shadow, spacing } from '../../theme';

export default function Card({ children, style, padded = true }) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        shadow.sm,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          padding: padded ? spacing.lg : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
});
