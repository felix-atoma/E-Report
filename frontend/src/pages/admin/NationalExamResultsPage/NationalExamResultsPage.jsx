import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { nationalExamResultsService } from '../../../services/nationalExamResultsService';
import { downloadCSV } from '../../../utils/csvExport';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import OffCanvas from '../../../components/common/OffCanvas/OffCanvas';
import Input from '../../../components/common/Input/Input';
import Textarea from '../../../components/common/Textarea/Textarea';
import Select from '../../../components/common/Select/Select';
import Button from '../../../components/common/Button/Button';
import Card from '../../../components/common/Card/Card';
import './NationalExamResultsPage.css';

const EXAM_TYPE_KEYS = ['CEPD', 'BEPC', 'BAC', 'BTS', 'CAP', 'OTHER'];

const RESULT_STATUS_KEYS = ['ADMIS', 'AJOURNE', 'ABSENT', 'ELIMINE'];
const RESULT_STATUS_STYLE = {
  ADMIS:   { color: '#15803d', bg: '#dcfce7' },
  AJOURNE: { color: '#b45309', bg: '#fef3c7' },
  ABSENT:  { color: '#6b7280', bg: '#f3f4f6' },
  ELIMINE: { color: '#b91c1c', bg: '#fee2e2' },
};

const EMPTY_FORM = {
  studentId: '', examType: 'BEPC', session: '', academicYear: '',
  result: 'ADMIS', series: '', mention: '', totalScore: '',
  center: '', registrationNumber: '', notes: '',
};

function ResultBadge({ result, t }) {
  const style = RESULT_STATUS_STYLE[result] ?? RESULT_STATUS_STYLE.ADMIS;
  return (
    <span className="ner-badge" style={{ color: style.color, background: style.bg }}>
      {t(`nationalExamPage.status.${result}`, result)}
    </span>
  );
}

export default function NationalExamResultsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [examFilter, setExamFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [search, setSearch]         = useState('');
  const [panelOpen, setPanelOpen]   = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [errors, setErrors]         = useState({});

  const examTypeOptions = EXAM_TYPE_KEYS.map((k) => ({
    value: k,
    label: k === 'OTHER' ? t('nationalExamPage.examTypes.OTHER') : k,
  }));

  const resultOptions = RESULT_STATUS_KEYS.map((k) => ({
    value: k, label: t(`nationalExamPage.status.${k}`),
  }));

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['national-exam-results', examFilter, yearFilter, search],
    queryFn: () =>
      nationalExamResultsService
        .list({ examType: examFilter || undefined, academicYear: yearFilter || undefined, search: search || undefined })
        .then((r) => r.data),
  });

  const { data: summary } = useQuery({
    queryKey: ['national-exam-summary', examFilter, yearFilter],
    queryFn: () =>
      nationalExamResultsService
        .summary({ examType: examFilter || undefined, academicYear: yearFilter || undefined })
        .then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => nationalExamResultsService.upsert(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['national-exam-results'] });
      qc.invalidateQueries({ queryKey: ['national-exam-summary'] });
      toast.success(t('nationalExamPage.toast.saved'));
      closePanel();
    },
    onError: () => toast.error(t('nationalExamPage.toast.saveError')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => nationalExamResultsService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['national-exam-results'] });
      qc.invalidateQueries({ queryKey: ['national-exam-summary'] });
      toast.success(t('nationalExamPage.toast.deleted'));
    },
    onError: () => toast.error(t('nationalExamPage.toast.deleteError')),
  });

  function openPanel() { setForm(EMPTY_FORM); setErrors({}); setPanelOpen(true); }
  function closePanel() { setPanelOpen(false); setForm(EMPTY_FORM); setErrors({}); }

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate() {
    const e = {};
    const req = t('nationalExamPage.errors.required');
    if (!form.studentId.trim())    e.studentId   = req;
    if (!form.session.trim())      e.session     = req;
    if (!form.academicYear.trim()) e.academicYear = req;
    setErrors(e);
    return !Object.keys(e).length;
  }

  function handleSubmit() {
    if (!validate()) return;
    saveMutation.mutate({
      ...form,
      totalScore:         form.totalScore !== '' ? Number(form.totalScore) : undefined,
      series:             form.series             || undefined,
      mention:            form.mention            || undefined,
      center:             form.center             || undefined,
      registrationNumber: form.registrationNumber || undefined,
      notes:              form.notes              || undefined,
    });
  }

  const exportCSV = () => {
    const rows = results.map((r) => ({
      [t('nationalExamPage.columns.student')]: r.student?.user?.name ?? r.student?.admissionNumber ?? '',
      [t('nationalExamPage.columns.exam')]:    r.examType,
      [t('nationalExamPage.columns.session')]: r.session,
      [t('nationalExamPage.columns.year')]:    r.academicYear,
      [t('nationalExamPage.columns.series')]:  r.series ?? '',
      [t('nationalExamPage.columns.result')]:  r.result,
      [t('nationalExamPage.columns.mention')]: r.mention ?? '',
      [t('nationalExamPage.columns.score')]:   r.totalScore ?? '',
      [t('nationalExamPage.columns.center')]:  r.center ?? '',
    }));
    downloadCSV(rows, `examens-nationaux-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const studentName = (r) => r.student?.user?.name ?? r.student?.admissionNumber ?? r.studentId;

  const subtitle = results.length > 0
    ? t('nationalExamPage.subtitleResults', { count: results.length })
    : t('nationalExamPage.subtitleEmpty');

  const summaryItems = summary ? [
    { label: t('nationalExamPage.summary.total'),    num: summary.total,    cls: '' },
    { label: t('nationalExamPage.summary.admis'),    num: summary.admis,    cls: 'ner-summary__stat--admis' },
    { label: t('nationalExamPage.summary.ajourne'),  num: summary.ajourne,  cls: 'ner-summary__stat--ajourne' },
    { label: t('nationalExamPage.summary.absent'),   num: summary.absent,   cls: 'ner-summary__stat--absent' },
    { label: t('nationalExamPage.summary.passRate'), num: `${summary.passRate}%`, cls: 'ner-summary__stat--rate' },
  ] : [];

  return (
    <AppShell>
      <PageHeader
        title={t('nationalExamPage.title')}
        subtitle={subtitle}
        actions={
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <Button variant="ghost" size="sm" onClick={exportCSV}>{t('nationalExamPage.exportCsv')}</Button>
            <Button size="sm" onClick={openPanel}>{t('nationalExamPage.addResult')}</Button>
          </div>
        }
      />

      {summary && (
        <div className="ner-summary">
          {summaryItems.map(({ label, num, cls }) => (
            <div key={label} className={`ner-summary__stat ${cls}`}>
              <span className="ner-summary__num">{num}</span>
              <span className="ner-summary__lbl">{label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="ner-page__filters">
        <input
          className="ner-page__search"
          placeholder={t('nationalExamPage.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="ner-page__tabs">
          <button className={`ner-page__tab${examFilter === '' ? ' active' : ''}`} onClick={() => setExamFilter('')}>
            {t('nationalExamPage.all')}
          </button>
          {EXAM_TYPE_KEYS.map((k) => (
            <button
              key={k}
              className={`ner-page__tab${examFilter === k ? ' active' : ''}`}
              onClick={() => setExamFilter(k)}
            >
              {k === 'OTHER' ? t('nationalExamPage.examTypes.OTHER') : k}
            </button>
          ))}
        </div>
        <input
          className="ner-page__year"
          placeholder={t('nationalExamPage.yearPlaceholder')}
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="ner-page__loading">{t('nationalExamPage.loading')}</p>
      ) : results.length === 0 ? (
        <Card>
          <div className="ner-page__empty">
            <span className="ner-page__empty-icon">🎓</span>
            <p>{t('nationalExamPage.empty')}</p>
            <Button size="sm" onClick={openPanel} style={{ marginTop: '1rem' }}>
              {t('nationalExamPage.addFirst')}
            </Button>
          </div>
        </Card>
      ) : (
        <Card style={{ padding: 0 }}>
          <div className="ner-page__table-wrap">
            <table className="ner-table">
              <thead>
                <tr>
                  <th>{t('nationalExamPage.columns.student')}</th>
                  <th>{t('nationalExamPage.columns.exam')}</th>
                  <th>{t('nationalExamPage.columns.session')}</th>
                  <th>{t('nationalExamPage.columns.year')}</th>
                  <th>{t('nationalExamPage.columns.series')}</th>
                  <th>{t('nationalExamPage.columns.result')}</th>
                  <th>{t('nationalExamPage.columns.mention')}</th>
                  <th>{t('nationalExamPage.columns.score')}</th>
                  <th>{t('nationalExamPage.columns.center')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id}>
                    <td className="ner-table__name">{studentName(r)}</td>
                    <td><span className="ner-table__exam">{r.examType}</span></td>
                    <td>{r.session}</td>
                    <td>{r.academicYear}</td>
                    <td>{r.series ?? '—'}</td>
                    <td><ResultBadge result={r.result} t={t} /></td>
                    <td>{r.mention ?? '—'}</td>
                    <td>{r.totalScore != null ? r.totalScore : '—'}</td>
                    <td className="ner-table__center">{r.center ?? '—'}</td>
                    <td>
                      <button
                        className="ner-table__btn-del"
                        onClick={() => { if (window.confirm(t('nationalExamPage.confirmDelete'))) deleteMutation.mutate(r.id); }}
                      >✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <OffCanvas
        open={panelOpen}
        onClose={closePanel}
        title={t('nationalExamPage.form.title')}
        subtitle={t('nationalExamPage.form.subtitle')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={closePanel} disabled={saveMutation.isPending}>{t('action.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? t('action.saving') : t('action.save')}
            </Button>
          </>
        }
      >
        <div className="ner-form">
          <Input
            label={t('nationalExamPage.form.studentId')}
            required
            placeholder={t('nationalExamPage.form.studentIdPlaceholder')}
            value={form.studentId}
            onChange={(e) => set('studentId', e.target.value)}
            error={errors.studentId}
          />
          <div className="ner-form__row2">
            <Select
              label={t('nationalExamPage.form.examType')}
              value={form.examType}
              options={examTypeOptions}
              onChange={(e) => set('examType', e.target.value)}
            />
            <Select
              label={t('nationalExamPage.form.result')}
              value={form.result}
              options={resultOptions}
              onChange={(e) => set('result', e.target.value)}
            />
          </div>
          <div className="ner-form__row2">
            <Input
              label={t('nationalExamPage.form.session')}
              required
              placeholder={t('nationalExamPage.form.sessionPlaceholder')}
              value={form.session}
              onChange={(e) => set('session', e.target.value)}
              error={errors.session}
            />
            <Input
              label={t('nationalExamPage.form.academicYear')}
              required
              placeholder={t('nationalExamPage.form.yearPlaceholder')}
              value={form.academicYear}
              onChange={(e) => set('academicYear', e.target.value)}
              error={errors.academicYear}
            />
          </div>
          <div className="ner-form__row2">
            <Input
              label={t('nationalExamPage.form.series')}
              placeholder={t('nationalExamPage.form.seriesPlaceholder')}
              value={form.series}
              onChange={(e) => set('series', e.target.value)}
            />
            <Input
              label={t('nationalExamPage.form.mention')}
              placeholder={t('nationalExamPage.form.mentionPlaceholder')}
              value={form.mention}
              onChange={(e) => set('mention', e.target.value)}
            />
          </div>
          <div className="ner-form__row2">
            <Input
              label={t('nationalExamPage.form.score')}
              type="number"
              placeholder={t('nationalExamPage.form.scorePlaceholder')}
              value={form.totalScore}
              onChange={(e) => set('totalScore', e.target.value)}
            />
            <Input
              label={t('nationalExamPage.form.center')}
              placeholder={t('nationalExamPage.form.centerPlaceholder')}
              value={form.center}
              onChange={(e) => set('center', e.target.value)}
            />
          </div>
          <Input
            label={t('nationalExamPage.form.regNumber')}
            placeholder="Optionnel"
            value={form.registrationNumber}
            onChange={(e) => set('registrationNumber', e.target.value)}
          />
          <Textarea
            label={t('nationalExamPage.form.notes')}
            rows={3}
            placeholder={t('nationalExamPage.form.notesPlaceholder')}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </div>
      </OffCanvas>
    </AppShell>
  );
}
