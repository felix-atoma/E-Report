import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authService } from '../../services/authService';
import { useTheme } from '../../context/ThemeContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { fontSize, fontWeight, spacing } from '../../theme';

export default function ForgotPasswordScreen({ navigation }) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    if (!email.trim()) return;
    setLoading(true);
    try {
      await authService.forgotPassword(email.trim());
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bgSubtle }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: colors.text }]}>Mot de passe oublié</Text>

        {sent ? (
          <View style={[styles.successBox, { backgroundColor: colors.success + '15', borderColor: colors.success }]}>
            <Text style={[styles.successText, { color: colors.success }]}>
              Si cet e-mail existe, un lien de réinitialisation vous a été envoyé.
            </Text>
          </View>
        ) : (
          <>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Entrez votre adresse e-mail pour recevoir un lien de réinitialisation.
            </Text>
            <Input
              label="Adresse e-mail"
              placeholder="exemple@ecole.tg"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <Button title="Envoyer le lien" onPress={handleSubmit} loading={loading} fullWidth />
          </>
        )}

        <Button
          title="Retour à la connexion"
          variant="ghost"
          onPress={() => navigation.navigate('Login')}
          fullWidth
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1, padding: spacing.lg, justifyContent: 'center' },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.semibold, marginBottom: spacing.sm },
  subtitle: { fontSize: fontSize.sm, marginBottom: spacing.lg },
  successBox: { borderWidth: 1, borderRadius: 8, padding: spacing.md, marginBottom: spacing.lg },
  successText: { fontSize: fontSize.sm },
});
