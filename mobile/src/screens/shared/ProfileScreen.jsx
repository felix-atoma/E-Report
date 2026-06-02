import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

const ROLE_LABELS = {
  ADMIN: 'Administrateur',
  TEACHER: 'Enseignant(e)',
  PARENT: 'Parent',
  STUDENT: 'Élève',
  BURSAR: 'Comptable',
};

function ProfileRow({ icon, label, value, colors }) {
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={[styles.rowIcon, { backgroundColor: colors.primary + '15' }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[styles.rowValue, { color: colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { colors } = useTheme();

  function confirmLogout() {
    Alert.alert(
      'Se déconnecter',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Déconnecter', style: 'destructive', onPress: logout },
      ],
    );
  }

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safe, { backgroundColor: colors.bgSubtle }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={[styles.name, { color: colors.text }]}>{user?.name}</Text>
          <View style={[styles.rolePill, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.roleText, { color: colors.primary }]}>
              {ROLE_LABELS[user?.role] ?? user?.role}
            </Text>
          </View>
        </View>

        {/* Info */}
        <View style={[styles.card, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <ProfileRow icon="mail-outline" label="E-mail" value={user?.email ?? '—'} colors={colors} />
          {user?.phone && (
            <ProfileRow icon="call-outline" label="Téléphone" value={user.phone} colors={colors} />
          )}
          {user?.institutionName && (
            <ProfileRow icon="school-outline" label="Établissement" value={user.institutionName} colors={colors} />
          )}
        </View>

        {/* Logout */}
        <TouchableOpacity
          onPress={confirmLogout}
          activeOpacity={0.8}
          style={[styles.logoutBtn, { backgroundColor: colors.danger + '10', borderColor: colors.danger }]}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={[styles.logoutText, { color: colors.danger }]}>Se déconnecter</Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: colors.textMuted }]}>NovaBulletin v0.1.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg },
  avatarSection: { alignItems: 'center', marginBottom: spacing.xl },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { color: '#fff', fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  name: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, marginBottom: spacing.sm },
  rolePill: {
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  roleText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: fontSize.xs },
  rowValue: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, marginTop: 1 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  logoutText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  version: { fontSize: fontSize.xs, textAlign: 'center', marginTop: spacing.md },
});
