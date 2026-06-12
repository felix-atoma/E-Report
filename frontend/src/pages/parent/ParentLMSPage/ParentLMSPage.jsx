import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import { lmsService } from '../../../services/lmsService';

function fmt(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

const css = {
  tabs: { display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: '1.25rem' },
  tab: (active) => ({ padding: '0.6rem 1.25rem', fontSize: '0.875rem', fontWeight: 600, color: active ? '#2563eb' : '#6b7280', border: 'none', background: 'none', cursor: 'pointer', borderBottom: active ? '2px solid #2563eb' : '2px solid transparent', marginBottom: -2 }),
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: '1rem' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', boxShadow: '0 1px 3px rgba(0,0,0,.04)' },
  title: { fontSize: '0.95rem', fontWeight: 700, color: '#111' },
  meta: { fontSize: '0.78rem', color: '#6b7280' },
  body: { fontSize: '0.85rem', color: '#374151', lineHeight: 1.55 },
  empty: { textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem', padding: '2.5rem' },
};

const PARENT_TAB_KEYS = ['announcements', 'assignments'];

export default function ParentLMSPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('announcements');

  const { data: announcements = [] } = useQuery({
    queryKey: ['lms-announcements-parent'],
    queryFn: () => lmsService.announcements.list().then((r) => r.data),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['lms-assignments-parent'],
    queryFn: () => lmsService.assignments.list({}).then((r) => r.data),
  });

  return (
    <AppShell title={t('lms.pageTitle')}>
      <PageHeader title={t('lms.pageTitle')} subtitle={t('lms.parentSubtitle')} />

      <div style={css.tabs}>
        {PARENT_TAB_KEYS.map((key) => (
          <button key={key} style={css.tab(tab === key)} onClick={() => setTab(key)}>
            {t(`lms.tabs.${key}`)}
          </button>
        ))}
      </div>

      {tab === 'announcements' && (
        announcements.length === 0 ? (
          <div style={css.empty}>{t('lms.empty.announcements')}</div>
        ) : (
          <div style={css.grid}>
            {announcements.map((a) => (
              <div key={a.id} style={css.card}>
                <div style={css.title}>{a.isPinned ? '📌 ' : ''}{a.title}</div>
                <div style={css.body}>{a.body}</div>
                <div style={css.meta}>{t('lms.by')} {a.author?.name}{a.publishedAt ? ` · ${fmt(a.publishedAt)}` : ''}</div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'assignments' && (
        assignments.length === 0 ? (
          <div style={css.empty}>{t('lms.empty.assignments')}</div>
        ) : (
          <div style={css.grid}>
            {assignments.map((a) => (
              <div key={a.id} style={css.card}>
                <div style={css.title}>{a.title}</div>
                <div style={css.meta}>
                  {a.class?.name} · {a.subject?.nameFr}
                  {a.dueDate ? ` · ${t('lms.assignments.dueDate')} ${fmt(a.dueDate)}` : ''}
                </div>
                {a.instructions && <div style={css.body}>{a.instructions}</div>}
              </div>
            ))}
          </div>
        )
      )}
    </AppShell>
  );
}
