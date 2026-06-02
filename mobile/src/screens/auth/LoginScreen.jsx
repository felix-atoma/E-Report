import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

const DEMO_ACCOUNTS = [
  { label: 'Admin',      email: 'admin@demo.novabulletin.local',          pw: 'Admin@123'   },
  { label: 'Enseignant', email: 'kofi.agbesi@demo.novabulletin.local',    pw: 'Teacher@123' },
  { label: 'Parent',     email: 'parent.edem@demo.novabulletin.local',    pw: 'Parent@123'  },
  { label: 'Élève',      email: 's.6a.m1@student.demo.novabulletin.local', pw: 'Student@123' },
];

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const { colors } = useTheme();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    setError('');
    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);
    if (!result.success) setError(result.error ?? 'Identifiants invalides');
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.primary }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Hero */}
          <View style={styles.hero}>
            <View style={[styles.logoRing, { borderColor: 'rgba(255,255,255,0.3)' }]}>
              <View style={[styles.logoBox, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={styles.logoText}>NB</Text>
              </View>
            </View>
            <Text style={styles.appName}>NovaBulletin</Text>
            <Text style={styles.tagline}>Bulletins scolaires numériques</Text>
          </View>

          {/* Form card */}
          <View style={[styles.sheet, { backgroundColor: colors.bg }]}>
            <Text style={[styles.formTitle, { color: colors.text }]}>Connexion</Text>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.danger + '12', borderColor: colors.danger + '40' }]}>
                <Text style={[styles.errorText, { color: colors.danger }]}>⚠ {error}</Text>
              </View>
            ) : null}

            <Input
              label="Adresse e-mail"
              placeholder="exemple@ecole.tg"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoComplete="email"
            />
            <Input
              label="Mot de passe"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />

            <Button
              title="Se connecter"
              onPress={handleLogin}
              loading={loading}
              fullWidth
              size="lg"
              style={{ marginTop: spacing.sm }}
            />

            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgotBtn}>
              <Text style={[styles.forgotText, { color: colors.primary }]}>Mot de passe oublié ?</Text>
            </TouchableOpacity>

            {/* Demo accounts */}
            <View style={[styles.divider, { borderColor: colors.border }]}>
              <Text style={[styles.dividerText, { color: colors.textMuted, backgroundColor: colors.bg }]}>
                Comptes démo
              </Text>
            </View>

            <View style={styles.demoGrid}>
              {DEMO_ACCOUNTS.map((d) => (
                <TouchableOpacity
                  key={d.label}
                  onPress={() => { setEmail(d.email); setPassword(d.pw); }}
                  style={[styles.demoChip, { backgroundColor: colors.bgMuted, borderColor: colors.border }]}
                >
                  <Text style={[styles.demoChipText, { color: colors.primary }]}>{d.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.demoHint, { color: colors.textMuted }]}>
              Appuyez sur un rôle pour remplir les identifiants, puis Se connecter.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:  { flex: 1 },
  scroll: { flexGrow: 1 },

  hero: {
    alignItems: 'center',
    paddingTop: spacing['2xl'],
    paddingBottom: spacing['2xl'] + spacing.lg,
  },
  logoRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#fff', fontSize: fontSize['2xl'], fontWeight: fontWeight.extrabold ?? '800' },
  appName:  { color: '#fff', fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, marginBottom: spacing.xs },
  tagline:  { color: 'rgba(255,255,255,0.75)', fontSize: fontSize.sm },

  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    flex: 1,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    minHeight: 500,
  },
  formTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, marginBottom: spacing.lg },
  errorBox: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  errorText: { fontSize: fontSize.sm },

  forgotBtn: { alignItems: 'center', paddingVertical: spacing.md },
  forgotText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },

  divider: {
    borderTopWidth: 1,
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    paddingHorizontal: spacing.md,
    marginTop: -9,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  demoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  demoChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  demoChipText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  demoHint: { fontSize: fontSize.xs, textAlign: 'center', lineHeight: 18 },
});
