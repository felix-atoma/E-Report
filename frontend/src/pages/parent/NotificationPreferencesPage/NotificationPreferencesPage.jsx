import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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

const CHANNEL_KEYS = ['whatsapp', 'email', 'sms'];
const CHANNEL_LABELS = { whatsapp: 'WhatsApp', email: 'Email', sms: 'SMS' };
const EVENT_KEYS = ['bulletinPublished', 'paymentConfirmed', 'announcementPosted', 'paymentReminder'];

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
  const { t } = useTranslation();
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const [loading, setLoading] = useState(false);

  const supported = typeof Notification !== 'undefined' && 'serviceWorker' in navigator;

  const statusMap = {
    granted:     { label: t('notifPrefs.push.granted'),    color: '#15803d', bg: '#dcfce7' },
    denied:      { label: t('notifPrefs.push.denied'),     color: '#b91c1c', bg: '#fee2e2' },
    default:     { label: t('notifPrefs.push.default'),    color: '#a16207', bg: '#fef3c7' },
    unsupported: { label: t('notifPrefs.push.unsupported'),color: '#6b7280', bg: '#f3f4f6' },
  };
  const status = statusMap[permission] ?? statusMap.unsupported;

  async function requestPush() {
    if (!supported) return;
    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        toast.success(t('notifPrefs.toast.granted'));
        new Notification('NovaBulletin', {
          body: t('notifPrefs.push.testBody'),
          icon: '/pwa-192.svg',
        });
      } else {
        toast.error(t('notifPrefs.toast.denied'));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="np-section">
      <h3 className="np-section__title">{t('notifPrefs.push.title')}</h3>
      <p className="np-section__desc">{t('notifPrefs.push.desc')}</p>
      <div className="np-push-row">
        <span className="np-push-badge" style={{ color: status.color, background: status.bg }}>
          {status.label}
        </span>
        {permission !== 'granted' && permission !== 'denied' && supported && (
          <Button size="sm" onClick={requestPush} disabled={loading}>
            {loading ? t('notifPrefs.push.activating') : t('notifPrefs.push.activate')}
          </Button>
        )}
        {permission === 'granted' && (
          <Button size="sm" variant="ghost" onClick={() => new Notification('NovaBulletin', { body: t('notifPrefs.push.testBody'), icon: '/pwa-192.svg' })}>
            {t('notifPrefs.push.test')}
          </Button>
        )}
        {permission === 'denied' && (
          <p className="np-push-hint">{t('notifPrefs.push.deniedHint')}</p>
        )}
      </div>
    </Card>
  );
}

function NotificationPreferencesPage() {
  const { t } = useTranslation();
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
    onSuccess: () => toast.success(t('notifPrefs.toast.saved')),
    onError: (err) => toast.error(err?.response?.data?.message ?? t('notifPrefs.toast.error')),
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
      setWhatsappError(t('notifPrefs.whatsappError'));
      return;
    }
    setWhatsappError('');
    mutation.mutate({
      whatsappNumber: whatsappNumber.trim() || undefined,
      notificationPreferences: prefs,
    });
  }

  return (
    <AppShell title={t('notifPrefs.title')}>
      <PageHeader
        title={t('notifPrefs.title')}
        subtitle={t('notifPrefs.subtitle')}
        actions={
          <Button onClick={handleSave} disabled={mutation.isPending}>
            {mutation.isPending ? t('action.saving') : t('action.save')}
          </Button>
        }
      />

      <div className="np-layout">
        <Card className="np-section">
          <h3 className="np-section__title">{t('notifPrefs.whatsappSection')}</h3>
          <p className="np-section__desc">{t('notifPrefs.whatsappDesc')}</p>
          <div className="np-whatsapp-row">
            <Input
              id="whatsapp"
              label={t('notifPrefs.whatsappLabel')}
              value={whatsappNumber}
              onChange={(e) => {
                setWhatsappNumber(e.target.value);
                setWhatsappError('');
              }}
              placeholder="+228 90 00 00 00"
              error={whatsappError}
              hint={t('notifPrefs.whatsappHint')}
            />
          </div>
          {user?.whatsappVerified && (
            <p className="np-verified">{t('notifPrefs.whatsappVerified')}</p>
          )}
        </Card>

        <Card className="np-section">
          <h3 className="np-section__title">{t('notifPrefs.channelsSection')}</h3>
          <p className="np-section__desc">{t('notifPrefs.channelsDesc')}</p>
          <div className="np-list">
            {CHANNEL_KEYS.map((ch) => (
              <div key={ch} className="np-row">
                <div className="np-row__info">
                  <span className="np-row__label">{CHANNEL_LABELS[ch]}</span>
                  {ch === 'whatsapp' && !user?.whatsappVerified && (
                    <span className="np-row__badge np-row__badge--warn">{t('notifPrefs.unverified')}</span>
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

        <Card className="np-section">
          <h3 className="np-section__title">{t('notifPrefs.eventsSection')}</h3>
          <p className="np-section__desc">{t('notifPrefs.eventsDesc')}</p>
          <div className="np-list">
            {EVENT_KEYS.map((ev) => (
              <div key={ev} className="np-row">
                <span className="np-row__label">{t(`notifPrefs.events.${ev}`)}</span>
                <Toggle
                  id={`ev-${ev}`}
                  checked={prefs.events[ev] ?? false}
                  onChange={() => toggleEvent(ev)}
                />
              </div>
            ))}
          </div>
        </Card>

        <PushNotificationsCard />

        <Card className="np-section np-section--info">
          <p className="np-info-text">
            {t('notifPrefs.infoNote')}
          </p>
        </Card>
      </div>
    </AppShell>
  );
}

export default NotificationPreferencesPage;
