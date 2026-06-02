import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

export default function Input({
  label,
  error,
  secureTextEntry,
  value,
  onChangeText,
  placeholder,
  autoCapitalize = 'none',
  keyboardType = 'default',
  ...rest
}) {
  const { colors } = useTheme();
  const hasError = !!error;

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textLight ?? colors.textMuted}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        style={[
          styles.input,
          {
            borderColor: hasError ? colors.danger : colors.border,
            color: colors.text,
            backgroundColor: colors.bgSubtle,
          },
          hasError && styles.inputError,
        ]}
        {...rest}
      />
      {hasError && (
        <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
    color: '#374151',
  },
  input: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.md,
  },
  inputError: {
    borderWidth: 1.5,
  },
  errorText: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
});
