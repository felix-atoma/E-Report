import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { libraryService } from '../../../services/libraryService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import './LibraryPage.css';

const EMPTY_FORM = {
  itemId: '',
  studentId: '',
  borrowerName: '',
  loanDate: '',
  dueDate: '',
  conditionOut: '',
  notes: '',
};

function isOverdue(loan) {
  return !loan.isReturned && new Date(loan.dueDate) < new Date();
}

function ReturnDialog({ loan, onClose, onConfirm, isPending }) {
  const [conditionIn, setConditionIn] = useState('');
  return (
    <div className="lib-dialog-overlay" onClick={onClose}>
      <div className="lib-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="lib-dialog__title">Retour du livre</h3>
        <p className="lib-dialog__book">{loan.item?.name}</p>
        <div className="lib-dialog__group">
          <label>État au retour</label>
          <input
            value={conditionIn}
            onChange={(e) => setConditionIn(e.target.value)}
            placeholder="ex: Bon état, Pages cornées…"
          />
        </div>
        <div className="lib-dialog__footer">
          <button className="lib-dialog__btn-cancel" onClick={onClose}>Annuler</button>
          <button
            className="lib-dialog__btn-confirm"
            onClick={() => onConfirm(conditionIn)}
            disabled={isPending}
          >
            {isPending ? 'Traitement…' : 'Confirmer le retour'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LibraryPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('active');
  const [search, setSearch] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [returnLoan, setReturnLoan] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const queryParams = {
    search: search || undefined,
    isReturned: activeTab === 'active' ? false : undefined,
  };

  const { data: loans = [], isLoading } = useQuery({
    queryKey: ['library-loans', activeTab, search],
    queryFn: () => libraryService.list(queryParams).then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => libraryService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['library-loans'] });
      closePanel();
    },
  });

  const returnMutation = useMutation({
    mutationFn: ({ id, conditionIn }) => libraryService.returnLoan(id, conditionIn),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['library-loans'] });
      setReturnLoan(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => libraryService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['library-loans'] }),
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
    if (!form.itemId.trim()) e.itemId = 'Requis';
    if (!form.loanDate) e.loanDate = 'Requis';
    if (!form.dueDate) e.dueDate = 'Requis';
    setErrors(e);
    return !Object.keys(e).length;
  }

  function handleSubmit(ev) {
    ev.preventDefault();
    if (!validate()) return;
    saveMutation.mutate({
      itemId: form.itemId,
      studentId: form.studentId || undefined,
      borrowerName: form.borrowerName || undefined,
      loanDate: form.loanDate,
      dueDate: form.dueDate,
      conditionOut: form.conditionOut || undefined,
      notes: form.notes || undefined,
    });
  }

  const borrowerLabel = (loan) => {
    if (loan.student?.user?.name) return loan.student.user.name;
    if (loan.student?.admissionNumber) return loan.student.admissionNumber;
    return loan.borrowerName ?? '—';
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const activeLoans = loans.filter((l) => !l.isReturned);
  const overdueCount = activeLoans.filter(isOverdue).length;

  return (
    <AppShell title="Bibliothèque">
      <div className="lib-page">
        <div className="lib-page__header">
          <div>
            <h1 className="lib-page__title">Bibliothèque</h1>
            <p className="lib-page__subtitle">
              {activeLoans.length} prêt(s) en cours
              {overdueCount > 0 && <span className="lib-page__overdue-hint"> · {overdueCount} en retard</span>}
            </p>
          </div>
          <button className="lib-page__btn-add" onClick={openPanel}>+ Nouveau prêt</button>
        </div>

        {/* Tabs + Search */}
        <div className="lib-page__filters">
          <div className="lib-page__tabs">
            <button
              className={`lib-page__tab${activeTab === 'active' ? ' active' : ''}`}
              onClick={() => setActiveTab('active')}
            >
              Prêts en cours
            </button>
            <button
              className={`lib-page__tab${activeTab === 'all' ? ' active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              Historique
            </button>
          </div>
          <input
            className="lib-page__search"
            placeholder="Rechercher par livre, emprunteur…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <p className="lib-page__loading">Chargement…</p>
        ) : loans.length === 0 ? (
          <div className="lib-page__empty">
            <span className="lib-page__empty-icon">📚</span>
            <p>Aucun prêt {activeTab === 'active' ? 'en cours' : 'trouvé'}.</p>
          </div>
        ) : (
          <div className="lib-page__table-wrap">
            <table className="lib-table">
              <thead>
                <tr>
                  <th>Livre</th>
                  <th>Emprunteur</th>
                  <th>Date prêt</th>
                  <th>Échéance</th>
                  <th>Statut</th>
                  <th>État sortie</th>
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
                        {overdue && <span className="lib-table__overdue-badge">En retard</span>}
                      </td>
                      <td>
                        {loan.isReturned ? (
                          <span className="lib-badge lib-badge--returned">Rendu</span>
                        ) : (
                          <span className="lib-badge lib-badge--active">En cours</span>
                        )}
                      </td>
                      <td className="lib-table__condition">{loan.conditionOut ?? '—'}</td>
                      <td>
                        <div className="lib-table__actions">
                          {!loan.isReturned && (
                            <button
                              className="lib-table__btn-return"
                              onClick={() => setReturnLoan(loan)}
                            >
                              Rendre
                            </button>
                          )}
                          <button
                            className="lib-table__btn-del"
                            onClick={() => {
                              if (window.confirm('Supprimer ce prêt ?')) deleteMutation.mutate(loan.id);
                            }}
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
        )}
      </div>

      {/* Return dialog */}
      {returnLoan && (
        <ReturnDialog
          loan={returnLoan}
          onClose={() => setReturnLoan(null)}
          onConfirm={(conditionIn) => returnMutation.mutate({ id: returnLoan.id, conditionIn })}
          isPending={returnMutation.isPending}
        />
      )}

      {/* OffCanvas Panel */}
      {panelOpen && (
        <div className="lib-panel-overlay" onClick={closePanel}>
          <div className="lib-panel" onClick={(e) => e.stopPropagation()}>
            <div className="lib-panel__header">
              <h2>Nouveau prêt</h2>
              <button className="lib-panel__close" onClick={closePanel}>✕</button>
            </div>

            <form className="lib-panel__form" onSubmit={handleSubmit}>
              <div className="lib-panel__group">
                <label>ID de l'article *</label>
                <input
                  value={form.itemId}
                  onChange={(e) => set('itemId', e.target.value)}
                  placeholder="UUID de l'article inventaire"
                />
                {errors.itemId && <span className="lib-panel__error">{errors.itemId}</span>}
              </div>

              <div className="lib-panel__group">
                <label>ID Élève (optionnel)</label>
                <input
                  value={form.studentId}
                  onChange={(e) => set('studentId', e.target.value)}
                  placeholder="UUID de l'élève si connu"
                />
              </div>

              <div className="lib-panel__group">
                <label>Nom de l'emprunteur</label>
                <input
                  value={form.borrowerName}
                  onChange={(e) => set('borrowerName', e.target.value)}
                  placeholder="Pour emprunteur non-élève"
                />
              </div>

              <div className="lib-panel__row2">
                <div className="lib-panel__group">
                  <label>Date de prêt *</label>
                  <input
                    type="date"
                    value={form.loanDate}
                    onChange={(e) => set('loanDate', e.target.value)}
                  />
                  {errors.loanDate && <span className="lib-panel__error">{errors.loanDate}</span>}
                </div>
                <div className="lib-panel__group">
                  <label>Date d'échéance *</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => set('dueDate', e.target.value)}
                  />
                  {errors.dueDate && <span className="lib-panel__error">{errors.dueDate}</span>}
                </div>
              </div>

              <div className="lib-panel__group">
                <label>État à la sortie</label>
                <input
                  value={form.conditionOut}
                  onChange={(e) => set('conditionOut', e.target.value)}
                  placeholder="ex: Très bon état, couverture légèrement usée…"
                />
              </div>

              <div className="lib-panel__group">
                <label>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  rows={2}
                  placeholder="Observations…"
                />
              </div>

              <div className="lib-panel__footer">
                <button type="button" className="lib-panel__btn-cancel" onClick={closePanel}>Annuler</button>
                <button type="submit" className="lib-panel__btn-save" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Enregistrement…' : 'Créer le prêt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
