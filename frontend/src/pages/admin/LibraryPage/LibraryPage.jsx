import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

function ReturnDialog({ loan, onClose, onConfirm, isPending }) {
  const [conditionIn, setConditionIn] = useState('');
  return (
    <div className="lib-dialog-overlay" onClick={onClose}>
      <div className="lib-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="lib-dialog__title">Retour du livre</h3>
        <p className="lib-dialog__book">{loan.item?.name}</p>
        <div className="form-field" style={{ marginBottom: '1rem' }}>
          <label className="form-field__label">État au retour</label>
          <input
            className="lib-dialog__input"
            value={conditionIn}
            onChange={(e) => setConditionIn(e.target.value)}
            placeholder="ex : Bon état, pages cornées…"
          />
        </div>
        <div className="lib-dialog__footer">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={() => onConfirm(conditionIn)} disabled={isPending}>
            {isPending ? 'Traitement…' : 'Confirmer le retour'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function LibraryPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('active');
  const [search, setSearch]       = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [returnLoan, setReturnLoan] = useState(null);
  const [form, setForm]   = useState(EMPTY_FORM);
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
      toast.success('Prêt créé');
      closePanel();
    },
    onError: () => toast.error('Erreur lors de la création du prêt'),
  });

  const returnMutation = useMutation({
    mutationFn: ({ id, conditionIn }) => libraryService.returnLoan(id, conditionIn),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['library-loans'] });
      toast.success('Retour enregistré');
      setReturnLoan(null);
    },
    onError: () => toast.error('Erreur lors du retour'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => libraryService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['library-loans'] });
      toast.success('Prêt supprimé');
    },
    onError: () => toast.error('Impossible de supprimer ce prêt'),
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
    if (!form.itemId.trim()) e.itemId   = 'Ce champ est requis';
    if (!form.loanDate)      e.loanDate = 'Ce champ est requis';
    if (!form.dueDate)       e.dueDate  = 'Ce champ est requis';
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

  const subtitle = `${activeLoans.length} prêt(s) en cours${overdueCount > 0 ? ` · ${overdueCount} en retard` : ''}`;

  return (
    <AppShell>
      <PageHeader
        title="Bibliothèque"
        subtitle={subtitle}
        actions={<Button size="sm" onClick={openPanel}>+ Nouveau prêt</Button>}
      />

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
        <Card>
          <div className="lib-page__empty">
            <span className="lib-page__empty-icon">📚</span>
            <p>Aucun prêt {activeTab === 'active' ? 'en cours' : 'trouvé'}.</p>
            {activeTab === 'active' && (
              <Button size="sm" onClick={openPanel} style={{ marginTop: '1rem' }}>
                + Enregistrer un prêt
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
                        {loan.isReturned
                          ? <span className="lib-badge lib-badge--returned">Rendu</span>
                          : <span className="lib-badge lib-badge--active">En cours</span>}
                      </td>
                      <td className="lib-table__condition">{loan.conditionOut ?? '—'}</td>
                      <td>
                        <div className="lib-table__actions">
                          {!loan.isReturned && (
                            <button className="lib-table__btn-return" onClick={() => setReturnLoan(loan)}>
                              Rendre
                            </button>
                          )}
                          <button
                            className="lib-table__btn-del"
                            onClick={() => { if (window.confirm('Supprimer ce prêt ?')) deleteMutation.mutate(loan.id); }}
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

      {/* Return dialog */}
      {returnLoan && (
        <ReturnDialog
          loan={returnLoan}
          onClose={() => setReturnLoan(null)}
          onConfirm={(conditionIn) => returnMutation.mutate({ id: returnLoan.id, conditionIn })}
          isPending={returnMutation.isPending}
        />
      )}

      {/* New loan OffCanvas */}
      <OffCanvas
        open={panelOpen}
        onClose={closePanel}
        title="Nouveau prêt"
        subtitle="Enregistrez un emprunt de document ou de matériel"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={closePanel} disabled={saveMutation.isPending}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Enregistrement…' : 'Créer le prêt'}
            </Button>
          </>
        }
      >
        <div className="lib-form">
          <Input
            label="ID de l'article"
            required
            placeholder="UUID de l'article inventaire"
            value={form.itemId}
            onChange={(e) => set('itemId', e.target.value)}
            error={errors.itemId}
          />

          <Input
            label="ID Élève"
            placeholder="UUID de l'élève (optionnel)"
            value={form.studentId}
            onChange={(e) => set('studentId', e.target.value)}
          />

          <Input
            label="Nom de l'emprunteur"
            placeholder="Pour un emprunteur non-élève"
            value={form.borrowerName}
            onChange={(e) => set('borrowerName', e.target.value)}
          />

          <div className="lib-form__row2">
            <Input
              label="Date de prêt"
              required
              type="date"
              value={form.loanDate}
              onChange={(e) => set('loanDate', e.target.value)}
              error={errors.loanDate}
            />
            <Input
              label="Date d'échéance"
              required
              type="date"
              value={form.dueDate}
              onChange={(e) => set('dueDate', e.target.value)}
              error={errors.dueDate}
            />
          </div>

          <Input
            label="État à la sortie"
            placeholder="ex : Très bon état, couverture légèrement usée…"
            value={form.conditionOut}
            onChange={(e) => set('conditionOut', e.target.value)}
          />

          <Textarea
            label="Notes"
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
