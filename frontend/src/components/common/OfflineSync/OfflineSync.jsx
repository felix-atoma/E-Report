import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { syncAttendanceQueue } from '../../../utils/offlineAttendanceQueue';

/**
 * Envoie automatiquement ce qui a été saisi sans internet (appels) dès que le réseau revient,
 * et au démarrage de l'application, quelle que soit la page ouverte.
 */
export default function OfflineSync() {
  const qc = useQueryClient();
  useEffect(() => {
    const sync = async () => {
      if (!navigator.onLine || !localStorage.getItem('accessToken')) return;
      const sent = await syncAttendanceQueue();
      if (sent > 0) {
        qc.invalidateQueries({ queryKey: ['attendance'] });
        toast.success(`📶 Internet revenu : ${sent} appel(s) fait(s) hors ligne envoyé(s).`);
      }
    };
    sync();
    window.addEventListener('online', sync);
    return () => window.removeEventListener('online', sync);
  }, [qc]);
  return null;
}
