import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

const ROLE_LABELS = {
  ADMIN: 'Administrateur', TEACHER: 'Enseignant(e)',
  PARENT: 'Parent', STUDENT: 'Élève', BURSAR: 'Comptable',
};

const ROLE_COLORS = {
  ADMIN: '#6366f1', TEACHER: '#0ea5e9',
  PARENT: '#10b981', STUDENT: '#f59e0b', BURSAR: '#f97316',
};

function InfoRow({ icon, label, value, colors }) {
  if (!value) return null;
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.infoIcon, { backgroundColor: colors.primary + '12' }]}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { colors } = useTheme();

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const roleColor = ROLE_COLORS[user?.role] ?? colors.primary;

  function confirmLogout() {
    Alert.alert('Se déconnecter', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safe, { backgroundColor: colors.bgSubtle }]}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Avatar card */}
        <View style={[styles.avatarCard, { backgroundColor: colors.bg }]}>
          <View style={[styles.avatarRing, { borderColor: roleColor + '40' }]}>
            <View style={[styles.avatar, { backgroundColor: roleColor }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>
          <Text style={[styles.name, { color: colors.text }]}>{user?.name}</Text>
          <View style={[styles.rolePill, { backgroundColor: roleColor + '15' }]}>
            <Text style={[styles.roleText, { color: roleColor }]}>
              {ROLE_LABELS[user?.role] ?? user?.role}
            </Text>
          </View>
        </View>

        {/* Info */}
        <View style={[styles.section, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Informations</Text>
          <InfoRow icon="mail-outline"    label="E-mail"          value={user?.email}           colors={colors} />
          <InfoRow icon="call-outline"    label="Téléphone"       value={user?.phone}           colors={colors} />
          <InfoRow icon="school-outline"  label="Établissement"   value={user?.institutionName} colors={colors} />
        </View>

        {/* Parent quick links */}
        {user?.role === 'PARENT' && navigation && (
          <View style={[styles.section, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Mes services</Text>
            {[
              { icon: 'receipt-outline',     label: 'Historique des paiements',    screen: 'PaymentHistory' },
              { icon: 'notifications-outline', label: 'Préférences de notification', screen: 'NotificationPrefs' },
            ].map((link) => (
              <TouchableOpacity key={link.screen} onPress={() => navigation.navigate(link.screen)}
                style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.infoIcon, { backgroundColor: colors.primary + '12' }]}>
                  <Ionicons name={link.icon} size={16} color={colors.primary} />
                </View>
                <Text style={[styles.infoValue, { color: colors.text, flex: 1 }]}>{link.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Logout */}
        <TouchableOpacity onPress={confirmLogout} activeOpacity={0.8}
          style={[styles.logoutBtn, { backgroundColor: colors.danger + '10', borderColor: colors.danger + '30' }]}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={[styles.logoutText, { color: colors.danger }]}>Se déconnecter</Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: colors.textMuted }]}>NovaBulletin v0.1.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { padding: spacing.lg, gap: spacing.md },

  avatarCard: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatarRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  name: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  rolePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  roleText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },

  section: {
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  infoIcon: { width: 34, height: 34, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: fontSize.xs },
  infoValue: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, marginTop: 1 },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingVertical: spacing.md + 2,
  },
  logoutText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  version: { fontSize: fontSize.xs, textAlign: 'center' },
});
