import { useRef, useState } from 'react';
import {
  ActivityIndicator, Image, Modal, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SignatureScreen from 'react-native-signature-canvas';
import { useTheme } from '../../context/ThemeContext';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

// Le serveur exige une signature manuscrite pour qu'un professeur signe une fiche de notes.
// La signature dessinée est envoyée en image PNG (data URL), comme sur le site.
const CANVAS_STYLE = `
  .m-signature-pad { box-shadow: none; border: none; margin: 0; }
  .m-signature-pad--body { border: none; }
  .m-signature-pad--footer { display: none; }
  body, html { height: 100%; background: #ffffff; }
`;

/**
 * Fenêtre de signature : dessiner au doigt, ou reprendre la dernière signature enregistrée.
 * `onConfirm(dataUrl)` reçoit l'image ; la fenêtre reste ouverte pendant `busy`.
 */
export default function SignatureModal({ visible, title, message, savedSignature, busy, onConfirm, onClose }) {
  const { colors } = useTheme();
  const ref = useRef(null);
  const [empty, setEmpty] = useState(true);
  const [error, setError] = useState('');

  function handleOK(dataUrl) {
    setError('');
    onConfirm(dataUrl);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={busy ? undefined : onClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bgSubtle }]}>
        <View style={[styles.header, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>{title ?? 'Signer la fiche'}</Text>
          {!!message && <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>}
        </View>

        {!!savedSignature && (
          <View style={[styles.saved, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <Image source={{ uri: savedSignature }} style={styles.savedImg} resizeMode="contain" />
            <TouchableOpacity
              disabled={busy}
              onPress={() => handleOK(savedSignature)}
              style={[styles.btn, styles.btnPrimary, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.btnPrimaryText}>Utiliser ma signature</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={[styles.hint, { color: colors.textMuted }]}>
          {savedSignature ? 'Ou signez ci-dessous avec le doigt :' : 'Signez ci-dessous avec le doigt :'}
        </Text>
        <View style={[styles.canvasWrap, { borderColor: colors.borderStrong }]}>
          <SignatureScreen
            ref={ref}
            onOK={handleOK}
            onEmpty={() => setError('Dessinez votre signature avant de valider.')}
            onBegin={() => { setEmpty(false); setError(''); }}
            webStyle={CANVAS_STYLE}
            penColor="#0f172a"
            backgroundColor="#ffffff"
            trimWhitespace
            autoClear={false}
            imageType="image/png"
          />
        </View>
        {!!error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}

        <View style={[styles.footer, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
          <TouchableOpacity disabled={busy} onPress={onClose} style={[styles.btn, { borderColor: colors.border }]}>
            <Text style={[styles.btnText, { color: colors.text }]}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={busy || empty}
            onPress={() => { ref.current?.clearSignature(); setEmpty(true); }}
            style={[styles.btn, { borderColor: colors.border, opacity: empty ? 0.5 : 1 }]}
          >
            <Text style={[styles.btnText, { color: colors.text }]}>Effacer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={busy}
            onPress={() => ref.current?.readSignature()}
            style={[styles.btn, styles.btnPrimary, { backgroundColor: colors.primary, opacity: busy ? 0.6 : 1 }]}
          >
            {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnPrimaryText}>Valider</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { padding: spacing.lg, borderBottomWidth: 1 },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  message: { fontSize: fontSize.sm, marginTop: spacing.xs },
  saved: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    margin: spacing.md, marginBottom: 0, padding: spacing.sm, borderWidth: 1, borderRadius: radius.md,
  },
  savedImg: { flex: 1, height: 56, backgroundColor: '#fff' },
  hint: { fontSize: fontSize.sm, marginHorizontal: spacing.md, marginTop: spacing.md, marginBottom: spacing.xs },
  canvasWrap: {
    flex: 1, marginHorizontal: spacing.md, borderWidth: 1.5, borderStyle: 'dashed',
    borderRadius: radius.md, overflow: 'hidden', minHeight: 220, backgroundColor: '#fff',
  },
  error: { fontSize: fontSize.sm, marginHorizontal: spacing.md, marginTop: spacing.xs },
  footer: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, marginTop: spacing.md },
  btn: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md,
    borderRadius: radius.md, borderWidth: 1.5, minHeight: 48,
  },
  btnText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  btnPrimary: { borderWidth: 0 },
  btnPrimaryText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.semibold },
});
