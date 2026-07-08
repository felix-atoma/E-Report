import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { libraryService } from '../../../services/libraryService';
import { inventoryService } from '../../../services/inventoryService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import OffCanvas from '../../../components/common/OffCanvas/OffCanvas';
import Input from '../../../components/common/Input/Input';
import Textarea from '../../../components/common/Textarea/Textarea';
import Button from '../../../components/common/Button/Button';
import Card from '../../../components/common/Card/Card';
import './LibraryPage.css';

const EMPTY_LOAN = {
  itemId: '', studentId: '', borrowerName: '',
  loanDate: '', dueDate: '', conditionOut: '', notes: '',
};

const EMPTY_BOOK = {
  name: '', quantity: 1, condition: 'GOOD',
  location: '', serialNumber: '', supplier: '', notes: '',
};

const CONDITIONS = ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'];

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
  const [returnLoan, setReturnLoan] = useState(null);

  // Loan panel state
  const [loanPanelOpen, setLoanPanelOpen] = useState(false);
  const [loanForm, setLoanForm]   = useState(EMPTY_LOAN);
  const [loanErrors, setLoanErrors] = useState({});
  const [bookSearch, setBookSearch] = useState('');

  // Book panel state
  const [bookPanelOpen, setBookPanelOpen] = useState(false);
  const [editBook, setEditBook]   = useState(null);
  const [bookForm, setBookForm]   = useState(EMPTY_BOOK);
  const [bookErrors, setBookErrors] = useState({});

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: loans = [], isLoading: loansLoading } = useQuery({
    queryKey: ['library-loans', activeTab, search],
    queryFn: () =>
      libraryService.list({
        search: search || undefined,
        isReturned: activeTab === 'active' ? false : undefined,
      }).then((r) => r.data),
    enabled: activeTab !== 'catalog',
  });

  const { data: books = [], isLoading: booksLoading } = useQuery({
    queryKey: ['library-catalog', search],
    queryFn: () =>
      inventoryService.list({ category: 'BOOK', search: search || undefined })
        .then((r) => r.data),
    enabled: activeTab === 'catalog',
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['library-catalog-all'],
    queryFn: () => inventoryService.list({ category: 'BOOK', isActive: true }).then((r) => r.data),
    staleTime: 2 * 60 * 1000,
  });

  // ── Loan mutations ────────────────────────────────────────────────────────────
  const saveLoanMutation = useMutation({
    mutationFn: (data) => libraryService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['library-loans'] });
      toast.success(t('library.toast.created'));
      closeLoanPanel();
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

  const deleteLoanMutation = useMutation({
    mutationFn: (id) => libraryService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['library-loans'] });
      toast.success(t('library.toast.deleted'));
    },
    onError: () => toast.error(t('library.toast.deleteError')),
  });

  // ── Book mutations ────────────────────────────────────────────────────────────
  const saveBookMutation = useMutation({
    mutationFn: (data) =>
      editBook ? inventoryService.update(editBook.id, data) : inventoryService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['library-catalog'] });
      qc.invalidateQueries({ queryKey: ['library-catalog-all'] });
      toast.success(editBook ? t('library.catalog.toast.updated') : t('library.catalog.toast.created'));
      closeBookPanel();
    },
    onError: () => toast.error(t('library.catalog.toast.error')),
  });

  const deleteBookMutation = useMutation({
    mutationFn: (id) => inventoryService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['library-catalog'] });
      qc.invalidateQueries({ queryKey: ['library-catalog-all'] });
      toast.success(t('library.catalog.toast.deleted'));
    },
    onError: () => toast.error(t('library.catalog.toast.error')),
  });

  // ── Loan panel helpers ────────────────────────────────────────────────────────
  function openLoanPanel() {
    setLoanForm(EMPTY_LOAN);
    setLoanErrors({});
    setBookSearch('');
    setLoanPanelOpen(true);
  }

  function closeLoanPanel() {
    setLoanPanelOpen(false);
    setLoanForm(EMPTY_LOAN);
    setLoanErrors({});
    setBookSearch('');
  }

  function setLoan(field, value) {
    setLoanForm((f) => ({ ...f, [field]: value }));
    if (loanErrors[field]) setLoanErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validateLoan() {
    const e = {};
    if (!loanForm.itemId.trim()) e.itemId   = t('library.errors.required');
    if (!loanForm.loanDate)      e.loanDate = t('library.errors.required');
    if (!loanForm.dueDate)       e.dueDate  = t('library.errors.required');
    setLoanErrors(e);
    return !Object.keys(e).length;
  }

  function handleLoanSubmit() {
    if (!validateLoan()) return;
    saveLoanMutation.mutate({
      itemId:       loanForm.itemId,
      studentId:    loanForm.studentId    || undefined,
      borrowerName: loanForm.borrowerName || undefined,
      loanDate:     loanForm.loanDate,
      dueDate:      loanForm.dueDate,
      conditionOut: loanForm.conditionOut || undefined,
      notes:        loanForm.notes        || undefined,
    });
  }

  // ── Book panel helpers ────────────────────────────────────────────────────────
  function openBookPanel(book = null) {
    setEditBook(book);
    setBookForm(book ? {
      name: book.name, quantity: book.quantity, condition: book.condition,
      location: book.location ?? '', serialNumber: book.serialNumber ?? '',
      supplier: book.supplier ?? '', notes: book.notes ?? '',
    } : EMPTY_BOOK);
    setBookErrors({});
    setBookPanelOpen(true);
  }

  function closeBookPanel() {
    setBookPanelOpen(false);
    setEditBook(null);
    setBookForm(EMPTY_BOOK);
    setBookErrors({});
  }

  function setBook(field, value) {
    setBookForm((f) => ({ ...f, [field]: value }));
    if (bookErrors[field]) setBookErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validateBook() {
    const e = {};
    if (!bookForm.name.trim()) e.name = t('library.errors.required');
    setBookErrors(e);
    return !Object.keys(e).length;
  }

  function handleBookSubmit() {
    if (!validateBook()) return;
    saveBookMutation.mutate({
      name: bookForm.name,
      category: 'BOOK',
      quantity: Number(bookForm.quantity) || 1,
      condition: bookForm.condition || 'GOOD',
      location: bookForm.location || undefined,
      serialNumber: bookForm.serialNumber || undefined,
      supplier: bookForm.supplier || undefined,
      notes: bookForm.notes || undefined,
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const borrowerLabel = (loan) => {
    if (loan.student?.user?.name)      return loan.student.user.name;
    if (loan.student?.admissionNumber) return loan.student.admissionNumber;
    return loan.borrowerName ?? '—';
  };

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const conditionColor = { EXCELLENT: '#16a34a', GOOD: '#3b82f6', FAIR: '#d97706', POOR: '#ef4444', DAMAGED: '#dc2626' };

  const activeLoans  = loans.filter((l) => !l.isReturned);
  const overdueCount = activeLoans.filter(isOverdue).length;

  const subtitle = activeTab !== 'catalog'
    ? (t('library.activeTab') + ': ' + activeLoans.length
      + (overdueCount > 0 ? ` · ${overdueCount} ${t('library.overdue').toLowerCase()}` : ''))
    : `${books.length} ${t('library.catalog.titlePlural')}`;

  const filteredBooks = allBooks.filter((b) =>
    !bookSearch || b.name.toLowerCase().includes(bookSearch.toLowerCase())
  );

  return (
    <AppShell>
      <PageHeader
        title={t('library.title')}
        subtitle={subtitle}
        actions={
          activeTab === 'catalog'
            ? <Button size="sm" onClick={() => openBookPanel()}>{t('library.catalog.addBook')}</Button>
            : <Button size="sm" onClick={openLoanPanel}>{t('library.newLoan')}</Button>
        }
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
          <button
            className={`lib-page__tab${activeTab === 'catalog' ? ' active' : ''}`}
            onClick={() => setActiveTab('catalog')}
          >
            {t('library.catalog.tab')}
          </button>
        </div>
        <input
          className="lib-page__search"
          placeholder={activeTab === 'catalog' ? t('library.catalog.searchPlaceholder') : t('library.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ── Loans view ── */}
      {activeTab !== 'catalog' && (
        loansLoading ? (
          <p className="lib-page__loading">{t('library.loading')}</p>
        ) : loans.length === 0 ? (
          <Card>
            <div className="lib-page__empty">
              <span className="lib-page__empty-icon">📚</span>
              <p>{activeTab === 'active' ? t('library.emptyActive') : t('library.emptyAll')}</p>
              {activeTab === 'active' && (
                <Button size="sm" onClick={openLoanPanel} style={{ marginTop: '1rem' }}>
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
                              onClick={() => { if (window.confirm(t('library.confirmDelete'))) deleteLoanMutation.mutate(loan.id); }}
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
        )
      )}

      {/* ── Catalog view ── */}
      {activeTab === 'catalog' && (
        booksLoading ? (
          <p className="lib-page__loading">{t('library.loading')}</p>
        ) : books.length === 0 ? (
          <Card>
            <div className="lib-page__empty">
              <span className="lib-page__empty-icon">📖</span>
              <p>{t('library.catalog.empty')}</p>
              <Button size="sm" onClick={() => openBookPanel()} style={{ marginTop: '1rem' }}>
                {t('library.catalog.addFirstBook')}
              </Button>
            </div>
          </Card>
        ) : (
          <Card style={{ padding: 0 }}>
            <div className="lib-page__table-wrap">
              <table className="lib-table">
                <thead>
                  <tr>
                    <th>{t('library.catalog.cols.name')}</th>
                    <th>{t('library.catalog.cols.quantity')}</th>
                    <th>{t('library.catalog.cols.condition')}</th>
                    <th>{t('library.catalog.cols.location')}</th>
                    <th>{t('library.catalog.cols.supplier')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {books.map((book) => (
                    <tr key={book.id}>
                      <td className="lib-table__book">{book.name}</td>
                      <td>{book.quantity}</td>
                      <td>
                        <span className="lib-cond-dot" style={{ background: conditionColor[book.condition] ?? '#6b7280' }} />
                        {t(`library.catalog.condition.${book.condition}`) || book.condition}
                      </td>
                      <td className="lib-table__condition">{book.location ?? '—'}</td>
                      <td className="lib-table__condition">{book.supplier ?? '—'}</td>
                      <td>
                        <div className="lib-table__actions">
                          <button className="lib-table__btn-return" onClick={() => openBookPanel(book)}>
                            {t('action.edit')}
                          </button>
                          <button
                            className="lib-table__btn-del"
                            onClick={() => { if (window.confirm(t('library.catalog.confirmDelete'))) deleteBookMutation.mutate(book.id); }}
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      )}

      {/* ── Return dialog ── */}
      {returnLoan && (
        <ReturnDialog
          loan={returnLoan}
          onClose={() => setReturnLoan(null)}
          onConfirm={(conditionIn) => returnMutation.mutate({ id: returnLoan.id, conditionIn })}
          isPending={returnMutation.isPending}
          t={t}
        />
      )}

      {/* ── New loan panel ── */}
      <OffCanvas
        open={loanPanelOpen}
        onClose={closeLoanPanel}
        title={t('library.form.title')}
        subtitle={t('library.form.subtitle')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={closeLoanPanel} disabled={saveLoanMutation.isPending}>{t('action.cancel')}</Button>
            <Button onClick={handleLoanSubmit} disabled={saveLoanMutation.isPending}>
              {saveLoanMutation.isPending ? t('action.saving') : t('library.form.create')}
            </Button>
          </>
        }
      >
        <div className="lib-form">
          {/* Book selector */}
          <div className="lib-form__field">
            <label className="lib-form__label">{t('library.form.itemId')} *</label>
            <input
              className="lib-form__book-search"
              placeholder={t('library.catalog.searchPlaceholder')}
              value={bookSearch}
              onChange={(e) => setBookSearch(e.target.value)}
            />
            {loanErrors.itemId && <span className="lib-form__error">{loanErrors.itemId}</span>}
            <div className="lib-form__book-list">
              {filteredBooks.length === 0 && (
                <div className="lib-form__book-empty">{t('library.catalog.noBooks')}</div>
              )}
              {filteredBooks.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={`lib-form__book-option${loanForm.itemId === b.id ? ' lib-form__book-option--selected' : ''}`}
                  onClick={() => setLoan('itemId', b.id)}
                >
                  <span className="lib-form__book-name">{b.name}</span>
                  <span className="lib-form__book-qty">x{b.quantity}</span>
                </button>
              ))}
            </div>
          </div>

          <Input
            label={t('library.form.studentId')}
            placeholder={t('library.form.studentIdPlaceholder')}
            value={loanForm.studentId}
            onChange={(e) => setLoan('studentId', e.target.value)}
          />
          <Input
            label={t('library.form.borrowerName')}
            placeholder={t('library.form.borrowerNamePlaceholder')}
            value={loanForm.borrowerName}
            onChange={(e) => setLoan('borrowerName', e.target.value)}
          />
          <div className="lib-form__row2">
            <Input
              label={t('library.form.loanDate')}
              required
              type="date"
              value={loanForm.loanDate}
              onChange={(e) => setLoan('loanDate', e.target.value)}
              error={loanErrors.loanDate}
            />
            <Input
              label={t('library.form.dueDate')}
              required
              type="date"
              value={loanForm.dueDate}
              onChange={(e) => setLoan('dueDate', e.target.value)}
              error={loanErrors.dueDate}
            />
          </div>
          <Input
            label={t('library.form.conditionOut')}
            placeholder={t('library.form.conditionOutPlaceholder')}
            value={loanForm.conditionOut}
            onChange={(e) => setLoan('conditionOut', e.target.value)}
          />
          <Textarea
            label={t('library.form.notes')}
            rows={3}
            placeholder="Observations…"
            value={loanForm.notes}
            onChange={(e) => setLoan('notes', e.target.value)}
          />
        </div>
      </OffCanvas>

      {/* ── Add/edit book panel ── */}
      <OffCanvas
        open={bookPanelOpen}
        onClose={closeBookPanel}
        title={editBook ? t('library.catalog.editTitle') : t('library.catalog.addTitle')}
        subtitle={t('library.catalog.formSubtitle')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={closeBookPanel} disabled={saveBookMutation.isPending}>{t('action.cancel')}</Button>
            <Button onClick={handleBookSubmit} disabled={saveBookMutation.isPending}>
              {saveBookMutation.isPending ? t('action.saving') : (editBook ? t('action.save') : t('library.catalog.addBook'))}
            </Button>
          </>
        }
      >
        <div className="lib-form">
          <Input
            label={t('library.catalog.cols.name')}
            required
            placeholder={t('library.catalog.namePlaceholder')}
            value={bookForm.name}
            onChange={(e) => setBook('name', e.target.value)}
            error={bookErrors.name}
          />
          <div className="lib-form__row2">
            <div className="lib-form__field">
              <label className="lib-form__label">{t('library.catalog.cols.quantity')}</label>
              <input
                type="number"
                min="1"
                className="lib-form__input"
                value={bookForm.quantity}
                onChange={(e) => setBook('quantity', e.target.value)}
              />
            </div>
            <div className="lib-form__field">
              <label className="lib-form__label">{t('library.catalog.cols.condition')}</label>
              <select
                className="lib-form__input"
                value={bookForm.condition}
                onChange={(e) => setBook('condition', e.target.value)}
              >
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>{t(`library.catalog.condition.${c}`) || c}</option>
                ))}
              </select>
            </div>
          </div>
          <Input
            label={t('library.catalog.cols.location')}
            placeholder={t('library.catalog.locationPlaceholder')}
            value={bookForm.location}
            onChange={(e) => setBook('location', e.target.value)}
          />
          <Input
            label={t('library.catalog.cols.supplier')}
            placeholder={t('library.catalog.supplierPlaceholder')}
            value={bookForm.supplier}
            onChange={(e) => setBook('supplier', e.target.value)}
          />
          <Input
            label={t('library.catalog.cols.serialNumber')}
            placeholder="ISBN / N° série"
            value={bookForm.serialNumber}
            onChange={(e) => setBook('serialNumber', e.target.value)}
          />
          <Textarea
            label={t('library.form.notes')}
            rows={3}
            placeholder="Observations…"
            value={bookForm.notes}
            onChange={(e) => setBook('notes', e.target.value)}
          />
        </div>
      </OffCanvas>
    </AppShell>
  );
}
