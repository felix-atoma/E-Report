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

  const variants = {
    primary:   { bg: colors.primary,   text: '#fff',          border: colors.primary },
    secondary: { bg: colors.bgMuted,   text: colors.text,     border: colors.border },
    danger:    { bg: colors.danger,    text: '#fff',          border: colors.danger },
    success:   { bg: colors.success,   text: '#fff',          border: colors.success },
    ghost:     { bg: 'transparent',    text: colors.primary,  border: 'transparent' },
    outline:   { bg: 'transparent',    text: colors.primary,  border: colors.primary },
  };

  const sizes = {
    sm: { py: spacing.xs + 2, px: spacing.md, font: fontSize.sm, radius: radius.md },
    md: { py: spacing.sm + 4, px: spacing.lg, font: fontSize.md, radius: radius.md },
    lg: { py: spacing.md,     px: spacing.xl, font: fontSize.lg, radius: radius.lg },
  };

  const v = variants[variant] ?? variants.primary;
  const s = sizes[size] ?? sizes.md;
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          paddingVertical: s.py,
          paddingHorizontal: s.px,
          borderRadius: s.radius,
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
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  label: {
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
});
