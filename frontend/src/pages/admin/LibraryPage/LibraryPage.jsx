import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { libraryService } from '../../../services/libraryService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import OffCanvas from '../../../components/common/OffCanvas/OffCanvas';
import Input from '../../../components/common/Input/Input';
import Textarea from '../../../components/common/Textarea/Textarea';
import Button from '../../../components/common/Button/Button';
import Card from '../../../components/common/Card/Card';
import './LibraryPage.css';

const EMPTY_FORM = {
  itemId: '', studentId: '', borrowerName: '',
  loanDate: '', dueDate: '', conditionOut: '', notes: '',
};

function isOverdue(loan) {
  return !loan.isReturned && new Date(loan.dueDate) < new Date();
}

function ReturnDialog({ loan, onClose, onConfirm, isPending, t }) {
  const [conditionIn, setConditionIn] = useState('');
  return (
    <div className="lib-dialog-overlay" onClick={onClose}>
      <div className="lib-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="lib-dialog__title">{t('library.returnDialog.title')}</h3>
        <p className="lib-dialog__book">{loan.item?.name}</p>
        <div className="form-field" style={{ marginBottom: '1rem' }}>
          <label className="form-field__label">{t('library.returnDialog.condition')}</label>
          <input
            className="lib-dialog__input"
            value={conditionIn}
            onChange={(e) => setConditionIn(e.target.value)}
            placeholder={t('library.returnDialog.conditionPlaceholder')}
          />
        </div>
        <div className="lib-dialog__footer">
          <Button variant="ghost" onClick={onClose}>{t('action.cancel')}</Button>
          <Button onClick={() => onConfirm(conditionIn)} disabled={isPending}>
            {isPending ? t('library.returnDialog.processing') : t('library.returnDialog.confirm')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function LibraryPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('active');
  const [search, setSearch]       = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [returnLoan, setReturnLoan] = useState(null);
  const [form, setForm]   = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const { data: loans = [], isLoading } = useQuery({
    queryKey: ['library-loans', activeTab, search],
    queryFn: () =>
      libraryService.list({
        search: search || undefined,
        isReturned: activeTab === 'active' ? false : undefined,
      }).then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => libraryService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['library-loans'] });
      toast.success(t('library.toast.created'));
      closePanel();
    },
    onError: () => toast.error(t('library.toast.error')),
  });

  const returnMutation = useMutation({
    mutationFn: ({ id, conditionIn }) => libraryService.returnLoan(id, conditionIn),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['library-loans'] });
      toast.success(t('library.toast.returned'));
      setReturnLoan(null);
    },
    onError: () => toast.error(t('library.toast.returnError')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => libraryService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['library-loans'] });
      toast.success(t('library.toast.deleted'));
    },
    onError: () => toast.error(t('library.toast.deleteError')),
  });

  function openPanel() {
    setForm(EMPTY_FORM);
    setErrors({});
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
    setForm(EMPTY_FORM);
    setErrors({});
  }

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate() {
    const e = {};
    if (!form.itemId.trim()) e.itemId   = t('library.errors.required');
    if (!form.loanDate)      e.loanDate = t('library.errors.required');
    if (!form.dueDate)       e.dueDate  = t('library.errors.required');
    setErrors(e);
    return !Object.keys(e).length;
  }

  function handleSubmit() {
    if (!validate()) return;
    saveMutation.mutate({
      itemId:       form.itemId,
      studentId:    form.studentId    || undefined,
      borrowerName: form.borrowerName || undefined,
      loanDate:     form.loanDate,
      dueDate:      form.dueDate,
      conditionOut: form.conditionOut || undefined,
      notes:        form.notes        || undefined,
    });
  }

  const borrowerLabel = (loan) => {
    if (loan.student?.user?.name)      return loan.student.user.name;
    if (loan.student?.admissionNumber) return loan.student.admissionNumber;
    return loan.borrowerName ?? '—';
  };

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const activeLoans  = loans.filter((l) => !l.isReturned);
  const overdueCount = activeLoans.filter(isOverdue).length;

  const subtitle = t('library.activeTab') + ': ' + activeLoans.length
    + (overdueCount > 0 ? ` · ${overdueCount} ${t('library.overdue').toLowerCase()}` : '');

  return (
    <AppShell>
      <PageHeader
        title={t('library.title')}
        subtitle={subtitle}
        actions={<Button size="sm" onClick={openPanel}>{t('library.newLoan')}</Button>}
      />

      <div className="lib-page__filters">
        <div className="lib-page__tabs">
          <button
            className={`lib-page__tab${activeTab === 'active' ? ' active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            {t('library.activeTab')}
          </button>
          <button
            className={`lib-page__tab${activeTab === 'all' ? ' active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            {t('library.historyTab')}
          </button>
        </div>
        <input
          className="lib-page__search"
          placeholder={t('library.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="lib-page__loading">{t('library.loading')}</p>
      ) : loans.length === 0 ? (
        <Card>
          <div className="lib-page__empty">
            <span className="lib-page__empty-icon">📚</span>
            <p>{activeTab === 'active' ? t('library.emptyActive') : t('library.emptyAll')}</p>
            {activeTab === 'active' && (
              <Button size="sm" onClick={openPanel} style={{ marginTop: '1rem' }}>
                {t('library.newFirstLoan')}
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <Card style={{ padding: 0 }}>
          <div className="lib-page__table-wrap">
            <table className="lib-table">
              <thead>
                <tr>
                  <th>{t('library.columns.book')}</th>
                  <th>{t('library.columns.borrower')}</th>
                  <th>{t('library.columns.loanDate')}</th>
                  <th>{t('library.columns.dueDate')}</th>
                  <th>{t('library.columns.status')}</th>
                  <th>{t('library.columns.conditionOut')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loans.map((loan) => {
                  const overdue = isOverdue(loan);
                  return (
                    <tr key={loan.id} className={overdue ? 'lib-table__row--overdue' : ''}>
                      <td className="lib-table__book">{loan.item?.name ?? loan.itemId}</td>
                      <td>{borrowerLabel(loan)}</td>
                      <td>{fmtDate(loan.loanDate)}</td>
                      <td className={overdue ? 'lib-table__due--late' : ''}>
                        {fmtDate(loan.dueDate)}
                        {overdue && <span className="lib-table__overdue-badge">{t('library.overdue')}</span>}
                      </td>
                      <td>
                        {loan.isReturned
                          ? <span className="lib-badge lib-badge--returned">{t('library.returned')}</span>
                          : <span className="lib-badge lib-badge--active">{t('library.active')}</span>}
                      </td>
                      <td className="lib-table__condition">{loan.conditionOut ?? '—'}</td>
                      <td>
                        <div className="lib-table__actions">
                          {!loan.isReturned && (
                            <button className="lib-table__btn-return" onClick={() => setReturnLoan(loan)}>
                              {t('library.return')}
                            </button>
                          )}
                          <button
                            className="lib-table__btn-del"
                            onClick={() => { if (window.confirm(t('library.confirmDelete'))) deleteMutation.mutate(loan.id); }}
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {returnLoan && (
        <ReturnDialog
          loan={returnLoan}
          onClose={() => setReturnLoan(null)}
          onConfirm={(conditionIn) => returnMutation.mutate({ id: returnLoan.id, conditionIn })}
          isPending={returnMutation.isPending}
          t={t}
        />
      )}

      <OffCanvas
        open={panelOpen}
        onClose={closePanel}
        title={t('library.form.title')}
        subtitle={t('library.form.subtitle')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={closePanel} disabled={saveMutation.isPending}>{t('action.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? t('action.saving') : t('library.form.create')}
            </Button>
          </>
        }
      >
        <div className="lib-form">
          <Input
            label={t('library.form.itemId')}
            required
            placeholder={t('library.form.itemIdPlaceholder')}
            value={form.itemId}
            onChange={(e) => set('itemId', e.target.value)}
            error={errors.itemId}
          />
          <Input
            label={t('library.form.studentId')}
            placeholder={t('library.form.studentIdPlaceholder')}
            value={form.studentId}
            onChange={(e) => set('studentId', e.target.value)}
          />
          <Input
            label={t('library.form.borrowerName')}
            placeholder={t('library.form.borrowerNamePlaceholder')}
            value={form.borrowerName}
            onChange={(e) => set('borrowerName', e.target.value)}
          />
          <div className="lib-form__row2">
            <Input
              label={t('library.form.loanDate')}
              required
              type="date"
              value={form.loanDate}
              onChange={(e) => set('loanDate', e.target.value)}
              error={errors.loanDate}
            />
            <Input
              label={t('library.form.dueDate')}
              required
              type="date"
              value={form.dueDate}
              onChange={(e) => set('dueDate', e.target.value)}
              error={errors.dueDate}
            />
          </div>
          <Input
            label={t('library.form.conditionOut')}
            placeholder={t('library.form.conditionOutPlaceholder')}
            value={form.conditionOut}
            onChange={(e) => set('conditionOut', e.target.value)}
          />
          <Textarea
            label={t('library.form.notes')}
            rows={3}
            placeholder="Observations…"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </div>
      </OffCanvas>
    </AppShell>
  );
}
