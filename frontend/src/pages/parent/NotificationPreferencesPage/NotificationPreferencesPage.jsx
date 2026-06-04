import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import { usersService } from '../../../services/usersService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Input from '../../../components/common/Input/Input';
import Button from '../../../components/common/Button/Button';
import './NotificationPreferencesPage.css';

const CHANNEL_LABELS = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  sms: 'SMS',
};

const EVENT_LABELS = {
  bulletinPublished: 'Bulletin publié',
  paymentConfirmed: 'Paiement confirmé',
  announcementPosted: 'Nouvelle annonce',
  paymentReminder: 'Rappel de paiement',
};

function Toggle({ checked, onChange, id }) {
  return (
    <label className="np-toggle" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        className="np-toggle__input"
        checked={checked}
        onChange={onChange}
      />
      <span className="np-toggle__track">
        <span className="np-toggle__thumb" />
      </span>
    </label>
  );
}

function PushNotificationsCard() {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const [loading, setLoading] = useState(false);

  const supported = typeof Notification !== 'undefined' && 'serviceWorker' in navigator;

  async function requestPush() {
    if (!supported) return;
    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        toast.success('Notifications activées !');
        // Send a test notification
        new Notification('NovaBulletin', {
          body: 'Vous recevrez désormais les alertes importantes ici.',
          icon: '/pwa-192.svg',
        });
      } else {
        toast.error('Notifications refusées par le navigateur');
      }
    } finally {
      setLoading(false);
    }
  }

  const statusMap = {
    granted:     { label: 'Activées',    color: '#15803d', bg: '#dcfce7' },
    denied:      { label: 'Bloquées',    color: '#b91c1c', bg: '#fee2e2' },
    default:     { label: 'Non activées', color: '#a16207', bg: '#fef3c7' },
    unsupported: { label: 'Non supporté', color: '#6b7280', bg: '#f3f4f6' },
  };
  const status = statusMap[permission] ?? statusMap.unsupported;

  return (
    <Card className="np-section">
      <h3 className="np-section__title">Notifications du navigateur (PWA)</h3>
      <p className="np-section__desc">Recevez des alertes directement dans votre navigateur, même quand l'application est fermée.</p>
      <div className="np-push-row">
        <span className="np-push-badge" style={{ color: status.color, background: status.bg }}>
          {status.label}
        </span>
        {permission !== 'granted' && permission !== 'denied' && supported && (
          <Button size="sm" onClick={requestPush} disabled={loading}>
            {loading ? 'Activation…' : 'Activer les notifications'}
          </Button>
        )}
        {permission === 'granted' && (
          <Button size="sm" variant="ghost" onClick={() => new Notification('NovaBulletin', { body: 'Test notification', icon: '/pwa-192.svg' })}>
            Tester
          </Button>
        )}
        {permission === 'denied' && (
          <p className="np-push-hint">Autorisez les notifications dans les paramètres de votre navigateur.</p>
        )}
      </div>
    </Card>
  );
}

function NotificationPreferencesPage() {
  const { user } = useAuth();

  const defaultPrefs = {
    channels: { whatsapp: true, email: true, sms: false },
    events: {
      bulletinPublished: true,
      paymentConfirmed: true,
      announcementPosted: true,
      paymentReminder: true,
    },
  };

  const [prefs, setPrefs] = useState(defaultPrefs);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappError, setWhatsappError] = useState('');

  useEffect(() => {
    if (!user) return;
    setWhatsappNumber(user.whatsappNumber ?? '');
    if (user.notificationPreferences) {
      setPrefs((p) => ({ ...p, ...user.notificationPreferences }));
    }
  }, [user]);

  const mutation = useMutation({
    mutationFn: (data) => usersService.update(user.id, data),
    onSuccess: () => toast.success('Préférences enregistrées'),
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur de sauvegarde'),
  });

  function toggleChannel(ch) {
    setPrefs((p) => ({
      ...p,
      channels: { ...p.channels, [ch]: !p.channels[ch] },
    }));
  }

  function toggleEvent(ev) {
    setPrefs((p) => ({
      ...p,
      events: { ...p.events, [ev]: !p.events[ev] },
    }));
  }

  function handleSave() {
    if (prefs.channels.whatsapp && !whatsappNumber.trim()) {
      setWhatsappError('Numéro WhatsApp requis pour activer ce canal');
      return;
    }
    setWhatsappError('');
    mutation.mutate({
      whatsappNumber: whatsappNumber.trim() || undefined,
      notificationPreferences: prefs,
    });
  }

  return (
    <AppShell title="Notifications">
      <PageHeader
        title="Préférences de notification"
        subtitle="Choisissez comment vous souhaitez être informé"
        actions={
          <Button onClick={handleSave} disabled={mutation.isPending}>
            {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        }
      />

      <div className="np-layout">
        {/* WhatsApp number */}
        <Card className="np-section">
          <h3 className="np-section__title">Contact WhatsApp</h3>
          <p className="np-section__desc">
            Entrez votre numéro pour recevoir les notifications par WhatsApp.
          </p>
          <div className="np-whatsapp-row">
            <Input
              id="whatsapp"
              label="Numéro WhatsApp"
              value={whatsappNumber}
              onChange={(e) => {
                setWhatsappNumber(e.target.value);
                setWhatsappError('');
              }}
              placeholder="+228 90 00 00 00"
              error={whatsappError}
              hint="Format international requis (ex : +228…)"
            />
          </div>
          {user?.whatsappVerified && (
            <p className="np-verified">✓ Numéro vérifié</p>
          )}
        </Card>

        {/* Channels */}
        <Card className="np-section">
          <h3 className="np-section__title">Canaux de notification</h3>
          <p className="np-section__desc">Activez ou désactivez chaque canal.</p>
          <div className="np-list">
            {Object.entries(CHANNEL_LABELS).map(([ch, label]) => (
              <div key={ch} className="np-row">
                <div className="np-row__info">
                  <span className="np-row__label">{label}</span>
                  {ch === 'whatsapp' && !user?.whatsappVerified && (
                    <span className="np-row__badge np-row__badge--warn">Non vérifié</span>
                  )}
                  {ch === 'email' && (
                    <span className="np-row__sub">{user?.email}</span>
                  )}
                </div>
                <Toggle
                  id={`ch-${ch}`}
                  checked={prefs.channels[ch] ?? false}
                  onChange={() => toggleChannel(ch)}
                />
              </div>
            ))}
          </div>
        </Card>

        {/* Events */}
        <Card className="np-section">
          <h3 className="np-section__title">Événements à notifier</h3>
          <p className="np-section__desc">Choisissez pour quels événements vous souhaitez recevoir des alertes.</p>
          <div className="np-list">
            {Object.entries(EVENT_LABELS).map(([ev, label]) => (
              <div key={ev} className="np-row">
                <span className="np-row__label">{label}</span>
                <Toggle
                  id={`ev-${ev}`}
                  checked={prefs.events[ev] ?? false}
                  onChange={() => toggleEvent(ev)}
                />
              </div>
            ))}
          </div>
        </Card>

        {/* PWA Push Notifications */}
        <PushNotificationsCard />

        {/* Info note */}
        <Card className="np-section np-section--info">
          <p className="np-info-text">
            Les bulletins retenus pour défaut de paiement ne sont pas concernés par ces préférences — ils sont automatiquement libérés dès régularisation.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}

export default NotificationPreferencesPage;
