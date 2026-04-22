import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}) {
  const { colors } = useTheme();

  const variantStyles = {
    primary: { bg: colors.primary, text: colors.textInverse, border: colors.primary },
    secondary: { bg: colors.bgMuted, text: colors.text, border: colors.border },
    danger: { bg: colors.danger, text: colors.textInverse, border: colors.danger },
    ghost: { bg: 'transparent', text: colors.primary, border: 'transparent' },
    outline: { bg: 'transparent', text: colors.primary, border: colors.primary },
  };

  const sizeStyles = {
    sm: { py: spacing.xs, px: spacing.sm, font: fontSize.sm },
    md: { py: spacing.sm + 2, px: spacing.md, font: fontSize.md },
    lg: { py: spacing.md, px: spacing.lg, font: fontSize.lg },
  };

  const v = variantStyles[variant] ?? variantStyles.primary;
  const s = sizeStyles[size] ?? sizeStyles.md;
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.base,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          paddingVertical: s.py,
          paddingHorizontal: s.px,
          opacity: isDisabled ? 0.5 : 1,
          width: fullWidth ? '100%' : undefined,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.text} />
      ) : (
        <Text style={[styles.label, { color: v.text, fontSize: s.font }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  label: {
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
});
