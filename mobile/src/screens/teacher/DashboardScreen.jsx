import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { fontSize, fontWeight, spacing } from '../../theme';

export default function TeacherDashboardScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bgSubtle }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Tableau de bord</Text>
        <Text style={[styles.name, { color: colors.textMuted }]}>Prof. {user?.name}</Text>
        <Text style={[styles.placeholder, { color: colors.textMuted }]}>
          Mes classes et bulletins — à implémenter (Semaine 5)
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flex: 1, padding: spacing.lg },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, marginBottom: spacing.xs },
  name: { fontSize: fontSize.md, marginBottom: spacing.xl },
  placeholder: { fontSize: fontSize.sm, textAlign: 'center', marginTop: spacing['2xl'] },
});
