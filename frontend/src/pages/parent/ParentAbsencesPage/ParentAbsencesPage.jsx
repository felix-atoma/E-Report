import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { attendanceService } from '../../../services/attendanceService';
import { studentsService } from '../../../services/studentsService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import './ParentAbsencesPage.css';

export default function ParentAbsencesPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { data: children = [], isLoading: loadingChildren } = useQuery({
    queryKey: ['parent-children'],
    queryFn: () => studentsService.myChildren().then((r) => r.data),
  });

  const [justifyId, setJustifyId]     = useState(null);
  const [reason, setReason]           = useState('');
  const [selectedChild, setChild]     = useState('');

  const firstChildId = children[0]?.id ?? '';
  const activeChild  = selectedChild || firstChildId;

  const { data: absences = [], isLoading: loadingAbs } = useQuery({
    queryKey: ['absences-parent', activeChild],
    queryFn: () =>
      attendanceService.listByStudent(activeChild).then((r) =>
        (r.data ?? []).filter((a) => a.status === 'ABSENT' || a.status === 'EXCUSED')
      ),
    enabled: !!activeChild,
  });

  const justifyMutation = useMutation({
    mutationFn: ({ id, reason }) => attendanceService.justifyAbsence(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['absences-parent'] });
      toast.success(t('absences.toast.sent'));
      setJustifyId(null);
      setReason('');
    },
    onError: () => toast.error(t('absences.toast.error')),
  });

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const pending    = absences.filter((a) => a.status === 'ABSENT' && a.note?.startsWith('JUSTIFY_PENDING:'));
  const excused    = absences.filter((a) => a.status === 'EXCUSED');
  const unjustified = absences.filter((a) => a.status === 'ABSENT' && !a.note?.startsWith('JUSTIFY_PENDING:'));
  const absentCount = absences.filter((a) => a.status === 'ABSENT').length;

  return (
    <AppShell>
      <PageHeader
        title={t('absences.title')}
        subtitle={t('absences.subtitle', { absent: absentCount, excused: excused.length })}
      />

      {children.length > 1 && (
        <div className="pabs-child-tabs">
          {children.map((c) => (
            <button
              key={c.id}
              className={`pabs-child-tab${activeChild === c.id ? ' active' : ''}`}
              onClick={() => setChild(c.id)}
            >
              {c.user?.name ?? c.admissionNumber}
            </button>
          ))}
        </div>
      )}

      {loadingChildren || loadingAbs ? (
        <Card><p className="pabs-empty">{t('action.loading')}</p></Card>
      ) : absences.length === 0 ? (
        <Card>
          <div className="pabs-empty">
            <span className="pabs-empty__icon">✅</span>
            <p>{t('absences.empty')}</p>
          </div>
        </Card>
      ) : (
        <>
          {unjustified.length > 0 && (
            <div className="pabs-section">
              <h3 className="pabs-section__title">
                <span className="pabs-dot pabs-dot--red" /> {t('absences.unjustifiedSection', { count: unjustified.length })}
              </h3>
              <div className="pabs-list">
                {unjustified.map((a) => (
                  <div key={a.id} className="pabs-card pabs-card--absent">
                    <div className="pabs-card__info">
                      <span className="pabs-card__date">{fmtDate(a.date)}</span>
                      {a.class?.name && <span className="pabs-card__class">{a.class.name}</span>}
                    </div>
                    {justifyId === a.id ? (
                      <div className="pabs-justify-form">
                        <textarea
                          className="pabs-justify-form__input"
                          rows={2}
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder={t('absences.reasonPlaceholder')}
                        />
                        <div className="pabs-justify-form__btns">
                          <Button variant="ghost" size="sm" onClick={() => { setJustifyId(null); setReason(''); }}>{t('action.cancel')}</Button>
                          <Button
                            size="sm"
                            disabled={!reason.trim() || justifyMutation.isPending}
                            onClick={() => justifyMutation.mutate({ id: a.id, reason })}
                          >
                            {justifyMutation.isPending ? t('absences.sending') : t('action.confirm')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => { setJustifyId(a.id); setReason(''); }}>
                        {t('absences.justify')}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {pending.length > 0 && (
            <div className="pabs-section">
              <h3 className="pabs-section__title">
                <span className="pabs-dot pabs-dot--yellow" /> {t('absences.pendingSection', { count: pending.length })}
              </h3>
              <div className="pabs-list">
                {pending.map((a) => (
                  <div key={a.id} className="pabs-card pabs-card--pending">
                    <div className="pabs-card__info">
                      <span className="pabs-card__date">{fmtDate(a.date)}</span>
                      {a.class?.name && <span className="pabs-card__class">{a.class.name}</span>}
                    </div>
                    <span className="pabs-card__note">{a.note?.replace('JUSTIFY_PENDING:', '').trim()}</span>
                    <span className="pabs-status pabs-status--pending">{t('absences.pendingStatus')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {excused.length > 0 && (
            <div className="pabs-section">
              <h3 className="pabs-section__title">
                <span className="pabs-dot pabs-dot--green" /> {t('absences.excusedSection', { count: excused.length })}
              </h3>
              <div className="pabs-list">
                {excused.map((a) => (
                  <div key={a.id} className="pabs-card pabs-card--excused">
                    <div className="pabs-card__info">
                      <span className="pabs-card__date">{fmtDate(a.date)}</span>
                      {a.class?.name && <span className="pabs-card__class">{a.class.name}</span>}
                    </div>
                    {a.note && <span className="pabs-card__note">{a.note.replace('JUSTIFIED:', '').trim()}</span>}
                    <span className="pabs-status pabs-status--excused">{t('absences.excusedStatus')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
