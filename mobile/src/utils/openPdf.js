import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import api from '../services/api';
import SecureStore from './secureStorage';

/**
 * Télécharge un PDF de l'API avec la connexion de l'utilisateur, puis l'ouvre avec la feuille de partage
 * du téléphone (lecteur PDF, Enregistrer, WhatsApp…). `path` : chemin de l'API, ex. `/reports/<id>/pdf-download`.
 */
export async function openPdf(path, fileName) {
  const target = `${FileSystem.cacheDirectory}${fileName.replace(/[^\w.-]+/g, '_')}`;
  const download = async () => {
    const token = await SecureStore.getItemAsync('accessToken');
    return FileSystem.downloadAsync(`${api.defaults.baseURL}${path}`, target, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  };

  let res = await download();
  if (res.status === 401) {
    // Jeton expiré : un appel par le client API le renouvelle, puis on réessaie une fois
    await api.get('/auth/me').catch(() => {});
    res = await download();
  }
  if (res.status !== 200) {
    await FileSystem.deleteAsync(target, { idempotent: true }).catch(() => {});
    throw new Error(res.status === 404 ? 'Bulletin introuvable ou pas encore publié.' : 'Téléchargement impossible.');
  }
  if (!(await Sharing.isAvailableAsync())) throw new Error('Ouverture des fichiers indisponible sur cet appareil.');
  await Sharing.shareAsync(res.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: fileName });
}
