import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transfersService } from '../../../services/transfersService';
import './TransfersPage.css';

const DIRECTIONS = [
  { value: 'IN', label: 'Entrée', desc: 'Vient d\'une autre école' },
  { value: 'OUT', label: 'Sortie', desc: 'Part vers une autre école' },
];

const TRANSFER_REASONS = [
  'Déménagement familial',
  'Problèmes financiers',
  'Orientation pédagogique',
  'Rapprochement scolaire',
  'Exclusion définitive',
  'Demande des parents',
  'Autre',
];

const EMPTY_FORM = {
  studentId: '',
  direction: 'OUT',
  otherSchool: '',
  transferDate: new Date().toISOString().slice(0, 10),
  academicYear: '',
  reason: '',
  documentUrl: '',
  notes: '',
};

function DirectionBadge({ direction }) {
  return (
    <span className={`transfer-badge transfer-badge--${direction.toLowerCase()}`}>
      {direction === 'IN' ? '↓ Entrée' : '↑ Sortie'}
    </span>
  );
}

export default function TransfersPage() {
  const qc = useQueryClient();
  const [dirFilter, setDirFilter] = useState('');
  const [search, setSearch] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ['transfers', dirFilter, search],
    queryFn: () =>
      transfersService.list({ direction: dirFilter || undefined, search: search || undefined }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => (editId ? transfersService.update(editId, data) : transfersService.create(data)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transfers'] });
      closePanel();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => transfersService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transfers'] }),
  });

  function openPanel(transfer = null) {
    if (transfer) {
      setEditId(transfer.id);
      setForm({
        studentId: transfer.studentId,
        direction: transfer.direction,
        otherSchool: transfer.otherSchool,
        transferDate: transfer.transferDate?.slice(0, 10) ?? '',
        academicYear: transfer.academicYear ?? '',
        reason: transfer.reason ?? '',
        documentUrl: transfer.documentUrl ?? '',
        notes: transfer.notes ?? '',
      });
    } else {
      setEditId(null);
      setForm(EMPTY_FORM);
    }
    setErrors({});
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
    setEditId(null);
    setForm(EMPTY_FORM);
    setErrors({});
  }

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate() {
    const e = {};
    if (!form.studentId.trim()) e.studentId = 'Requis';
    if (!form.otherSchool.trim()) e.otherSchool = 'Requis';
    if (!form.transferDate) e.transferDate = 'Requis';
    setErrors(e);
    return !Object.keys(e).length;
  }

  function handleSubmit(ev) {
    ev.preventDefault();
    if (!validate()) return;
    createMutation.mutate(form);
  }

  const inCount  = transfers.filter((t) => t.direction === 'IN').length;
  const outCount = transfers.filter((t) => t.direction === 'OUT').length;

  return (
    <div className="transfers-page">
      <div className="transfers-page__header">
        <div>
          <h1 className="transfers-page__title">Transferts d'Élèves</h1>
          <p className="transfers-page__subtitle">
            <span className="transfers-page__stat transfers-page__stat--in">{inCount} entrées</span>
            <span className="transfers-page__sep"> · </span>
            <span className="transfers-page__stat transfers-page__stat--out">{outCount} sorties</span>
          </p>
        </div>
        <button className="transfers-page__btn-add" onClick={() => openPanel()}>
          + Nouveau transfert
        </button>
      </div>

      <div className="transfers-page__filters">
        <input
          className="transfers-page__search"
          placeholder="Rechercher par école ou élève…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="transfers-page__dir-tabs">
          {['', 'IN', 'OUT'].map((d) => (
            <button
              key={d}
              className={`transfers-page__dir-tab${dirFilter === d ? ' active' : ''}`}
              onClick={() => setDirFilter(d)}
            >
              {d === '' ? 'Tous' : d === 'IN' ? 'Entrées' : 'Sorties'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="transfers-page__loading">Chargement…</p>
      ) : transfers.length === 0 ? (
        <div className="transfers-page__empty">
          <span className="transfers-page__empty-icon">🔄</span>
          <p>Aucun transfert enregistré.</p>
        </div>
      ) : (
        <div className="transfers-page__list">
          {transfers.map((t) => (
            <div key={t.id} className={`transfer-card transfer-card--${t.direction.toLowerCase()}`}>
              <div className="transfer-card__left">
                <DirectionBadge direction={t.direction} />
                <div className="transfer-card__school">{t.otherSchool}</div>
                <div className="transfer-card__date">
                  {new Date(t.transferDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  {t.academicYear && <span className="transfer-card__year"> · {t.academicYear}</span>}
                </div>
              </div>
              <div className="transfer-card__student">
                <div className="transfer-card__student-name">
                  {t.student?.user?.name ?? t.student?.admissionNumber ?? '—'}
                </div>
                <div className="transfer-card__student-num">{t.student?.admissionNumber}</div>
                {t.reason && <div className="transfer-card__reason">{t.reason}</div>}
              </div>
              <div className="transfer-card__actions">
                <button className="transfer-card__btn-edit" onClick={() => openPanel(t)}>Modifier</button>
                <button
                  className="transfer-card__btn-del"
                  onClick={() => { if (window.confirm('Supprimer ce transfert ?')) deleteMutation.mutate(t.id); }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {panelOpen && (
        <div className="transfers-panel-overlay" onClick={closePanel}>
          <div className="transfers-panel" onClick={(e) => e.stopPropagation()}>
            <div className="transfers-panel__header">
              <h2>{editId ? 'Modifier le transfert' : 'Nouveau transfert'}</h2>
              <button className="transfers-panel__close" onClick={closePanel}>✕</button>
            </div>

            <form className="transfers-panel__form" onSubmit={handleSubmit}>
              <div className="transfers-panel__dir-choice">
                {DIRECTIONS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    className={`transfers-panel__dir-btn${form.direction === d.value ? ' active' : ''}`}
                    onClick={() => set('direction', d.value)}
                  >
                    <strong>{d.label}</strong>
                    <small>{d.desc}</small>
                  </button>
                ))}
              </div>

              <div className="transfers-panel__group">
                <label>ID Élève *</label>
                <input
                  value={form.studentId}
                  onChange={(e) => set('studentId', e.target.value)}
                  placeholder="Identifiant de l'élève"
                />
                {errors.studentId && <span className="transfers-panel__error">{errors.studentId}</span>}
              </div>

              <div className="transfers-panel__group">
                <label>{form.direction === 'IN' ? 'École d\'origine *' : 'École de destination *'}</label>
                <input
                  value={form.otherSchool}
                  onChange={(e) => set('otherSchool', e.target.value)}
                  placeholder="Nom de l'école"
                />
                {errors.otherSchool && <span className="transfers-panel__error">{errors.otherSchool}</span>}
              </div>

              <div className="transfers-panel__row2">
                <div className="transfers-panel__group">
                  <label>Date de transfert *</label>
                  <input
                    type="date"
                    value={form.transferDate}
                    onChange={(e) => set('transferDate', e.target.value)}
                  />
                  {errors.transferDate && <span className="transfers-panel__error">{errors.transferDate}</span>}
                </div>
                <div className="transfers-panel__group">
                  <label>Année scolaire</label>
                  <input
                    value={form.academicYear}
                    onChange={(e) => set('academicYear', e.target.value)}
                    placeholder="ex: 2024-2025"
                  />
                </div>
              </div>

              <div className="transfers-panel__group">
                <label>Motif</label>
                <select value={form.reason} onChange={(e) => set('reason', e.target.value)}>
                  <option value="">Sélectionner…</option>
                  {TRANSFER_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div className="transfers-panel__group">
                <label>URL du document</label>
                <input
                  value={form.documentUrl}
                  onChange={(e) => set('documentUrl', e.target.value)}
                  placeholder="Lien vers la lettre de transfert…"
                />
              </div>

              <div className="transfers-panel__group">
                <label>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  rows={3}
                  placeholder="Observations…"
                />
              </div>

              <div className="transfers-panel__footer">
                <button type="button" className="transfers-panel__btn-cancel" onClick={closePanel}>Annuler</button>
                <button type="submit" className="transfers-panel__btn-save" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
