import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet,
  Switch, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

const CHANNELS = [
  { key: 'whatsapp', label: 'WhatsApp',   icon: 'logo-whatsapp',     color: '#25D366' },
  { key: 'email',    label: 'E-mail',      icon: 'mail-outline',      color: '#3b82f6' },
  { key: 'sms',      label: 'SMS',         icon: 'chatbubble-outline', color: '#f59e0b' },
];

const EVENTS = [
  { key: 'bulletinPublished',   label: 'Bulletin publié',          icon: 'document-text-outline' },
  { key: 'paymentConfirmed',    label: 'Paiement confirmé',         icon: 'checkmark-circle-outline' },
  { key: 'announcement',        label: 'Annonce de l\'école',       icon: 'megaphone-outline' },
  { key: 'paymentReminder',     label: 'Rappel de paiement',        icon: 'alarm-outline' },
];

export default function NotificationPreferencesScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();

  const [prefs, setPrefs]             = useState({ whatsapp: true, email: true, sms: false });
  const [events, setEvents]           = useState({ bulletinPublished: true, paymentConfirmed: true, announcement: true, paymentReminder: false });
  const [whatsappNum, setWhatsappNum] = useState('');
  const [saving, setSaving]           = useState(false);

  useFocusEffect(useCallback(() => {
    if (user?.notificationPreferences) {
      const p = user.notificationPreferences;
      setPrefs({ whatsapp: p.whatsapp ?? true, email: p.email ?? true, sms: p.sms ?? false });
      setEvents({ bulletinPublished: p.bulletinPublished ?? true, paymentConfirmed: p.paymentConfirmed ?? true, announcement: p.announcement ?? true, paymentReminder: p.paymentReminder ?? false });
    }
    if (user?.whatsappNumber) setWhatsappNum(user.whatsappNumber);
  }, [user]));

  async function handleSave() {
    setSaving(true);
    try {
      await api.patch(`/users/${user.id}`, {
        ...(whatsappNum.trim() ? { whatsappNumber: whatsappNum.trim() } : {}),
        notificationPreferences: { ...prefs, ...events },
      });
      Alert.alert('Enregistré', 'Vos préférences ont été mises à jour.');
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.message ?? 'Impossible de sauvegarder.');
    } finally { setSaving(false); }
  }

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safe, { backgroundColor: colors.bgSubtle }]}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* WhatsApp number */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Numéro WhatsApp</Text>
          <Text style={[styles.sectionDesc, { color: colors.textMuted }]}>
            Votre numéro pour recevoir les bulletins et alertes.
          </Text>
          <Input
            label="Numéro (ex. +228 90 12 34 56)"
            placeholder="+228 90 00 00 00"
            value={whatsappNum}
            onChangeText={setWhatsappNum}
            keyboardType="phone-pad"
          />
        </Card>

        {/* Channels */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Canaux de notification</Text>
          {CHANNELS.map((ch) => (
            <View key={ch.key} style={[styles.row, { borderBottomColor: colors.border }]}>
              <View style={[styles.rowIcon, { backgroundColor: ch.color + '15' }]}>
                <Ionicons name={ch.icon} size={18} color={ch.color} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.text }]}>{ch.label}</Text>
              <Switch
                value={prefs[ch.key] ?? false}
                onValueChange={(v) => setPrefs((p) => ({ ...p, [ch.key]: v }))}
                trackColor={{ false: colors.border, true: colors.primary + '60' }}
                thumbColor={prefs[ch.key] ? colors.primary : colors.bgMuted}
              />
            </View>
          ))}
        </Card>

        {/* Events */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Événements</Text>
          <Text style={[styles.sectionDesc, { color: colors.textMuted }]}>
            Choisissez les événements pour lesquels vous souhaitez être notifié.
          </Text>
          {EVENTS.map((ev) => (
            <View key={ev.key} style={[styles.row, { borderBottomColor: colors.border }]}>
              <View style={[styles.rowIcon, { backgroundColor: colors.primary + '12' }]}>
                <Ionicons name={ev.icon} size={18} color={colors.primary} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.text }]}>{ev.label}</Text>
              <Switch
                value={events[ev.key] ?? false}
                onValueChange={(v) => setEvents((e) => ({ ...e, [ev.key]: v }))}
                trackColor={{ false: colors.border, true: colors.primary + '60' }}
                thumbColor={events[ev.key] ? colors.primary : colors.bgMuted}
              />
            </View>
          ))}
        </Card>

        <Button title="Enregistrer" onPress={handleSave} loading={saving} fullWidth size="lg" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { padding: spacing.lg },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, marginBottom: spacing.xs },
  sectionDesc: { fontSize: fontSize.sm, marginBottom: spacing.md, lineHeight: 20 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.md, borderBottomWidth: 1, gap: spacing.md,
  },
  rowIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
});
