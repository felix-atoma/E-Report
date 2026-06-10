import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { transfersService } from '../../../services/transfersService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import OffCanvas from '../../../components/common/OffCanvas/OffCanvas';
import Input from '../../../components/common/Input/Input';
import Button from '../../../components/common/Button/Button';
import Card from '../../../components/common/Card/Card';
import './TransfersPage.css';

const EMPTY_FORM = {
  studentId:    '',
  direction:    'OUT',
  otherSchool:  '',
  transferDate: new Date().toISOString().slice(0, 10),
  academicYear: '',
  reason:       '',
  documentUrl:  '',
  notes:        '',
};

const DIRECTION_COLORS = {
  IN:  { color: '#15803d', bg: '#dcfce7' },
  OUT: { color: '#dc2626', bg: '#fee2e2' },
};

function DirectionBadge({ direction, t }) {
  const style = DIRECTION_COLORS[direction] ?? {};
  return (
    <span className="transfer-badge" style={{ color: style.color, background: style.bg }}>
      {direction === 'IN' ? t('transfers.directionIn') : t('transfers.directionOut')}
    </span>
  );
}

export default function TransfersPage() {
  const qc = useQueryClient();
  const { t } = useTranslation();

  const DIRECTIONS = [
    { value: 'IN',  label: t('transfers.directionIn'),  desc: t('transfers.directionInDesc'),  color: '#15803d', bg: '#dcfce7' },
    { value: 'OUT', label: t('transfers.directionOut'), desc: t('transfers.directionOutDesc'), color: '#dc2626', bg: '#fee2e2' },
  ];

  const TRANSFER_REASONS = t('transfers.reasons', { returnObjects: true });

  const [dirFilter, setDirFilter] = useState('');
  const [search, setSearch]       = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [editId, setEditId]       = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [errors, setErrors]       = useState({});

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ['transfers', dirFilter, search],
    queryFn: () =>
      transfersService
        .list({ direction: dirFilter || undefined, search: search || undefined })
        .then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (data) =>
      editId ? transfersService.update(editId, data) : transfersService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transfers'] });
      toast.success(editId ? 'Transfert modifié' : 'Transfert enregistré');
      closePanel();
    },
    onError: () => toast.error('Une erreur est survenue'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => transfersService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transfers'] });
      toast.success('Transfert supprimé');
    },
    onError: () => toast.error('Impossible de supprimer ce transfert'),
  });

  function openPanel(transfer = null) {
    if (transfer) {
      setEditId(transfer.id);
      setForm({
        studentId:    transfer.studentId,
        direction:    transfer.direction,
        otherSchool:  transfer.otherSchool,
        transferDate: transfer.transferDate?.slice(0, 10) ?? '',
        academicYear: transfer.academicYear ?? '',
        reason:       transfer.reason       ?? '',
        documentUrl:  transfer.documentUrl  ?? '',
        notes:        transfer.notes        ?? '',
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
    if (!form.studentId.trim())   e.studentId   = 'Ce champ est requis';
    if (!form.otherSchool.trim()) e.otherSchool  = 'Ce champ est requis';
    if (!form.transferDate)       e.transferDate = 'Ce champ est requis';
    setErrors(e);
    return !Object.keys(e).length;
  }

  function handleSubmit() {
    if (!validate()) return;
    saveMutation.mutate(form);
  }

  const inCount  = transfers.filter((t) => t.direction === 'IN').length;
  const outCount = transfers.filter((t) => t.direction === 'OUT').length;

  const subtitle = transfers.length > 0
    ? `${inCount} entrée${inCount !== 1 ? 's' : ''} · ${outCount} sortie${outCount !== 1 ? 's' : ''}`
    : 'Aucun transfert enregistré — ajoutez le premier';

  return (
    <AppShell>
      <PageHeader
        title="Transferts d'Élèves"
        subtitle={subtitle}
        actions={<Button size="sm" onClick={() => openPanel()}>+ Nouveau transfert</Button>}
      />

      {/* Filters */}
      <div className="transfers-page__filters">
        <input
          className="transfers-page__search"
          placeholder="Rechercher par école ou élève…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="transfers-page__dir-tabs">
          {[
            { val: '',    label: 'Tous' },
            { val: 'IN',  label: '↓ Entrées' },
            { val: 'OUT', label: '↑ Sorties' },
          ].map(({ val, label }) => (
            <button
              key={val}
              className={`transfers-page__dir-tab${dirFilter === val ? ' active' : ''}`}
              onClick={() => setDirFilter(val)}
              style={
                dirFilter === val && val === 'IN'  ? { background: '#dcfce7', color: '#15803d', borderColor: '#16a34a' } :
                dirFilter === val && val === 'OUT' ? { background: '#fee2e2', color: '#dc2626', borderColor: '#dc2626' } :
                {}
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <p className="transfers-page__loading">Chargement…</p>
      ) : transfers.length === 0 ? (
        <Card>
          <div className="transfers-page__empty">
            <span className="transfers-page__empty-icon">🔄</span>
            <p>Aucun transfert enregistré.</p>
            <Button size="sm" onClick={() => openPanel()} style={{ marginTop: '1rem' }}>
              + Enregistrer un transfert
            </Button>
          </div>
        </Card>
      ) : (
        <div className="transfers-page__list">
          {transfers.map((transfer) => (
            <div key={transfer.id} className={`transfer-card transfer-card--${transfer.direction.toLowerCase()}`}>
              <div className="transfer-card__left">
                <DirectionBadge direction={transfer.direction} t={t} />
                <div className="transfer-card__school">{transfer.otherSchool}</div>
                <div className="transfer-card__date">
                  {new Date(transfer.transferDate).toLocaleDateString('fr-FR', {
                    day: '2-digit', month: 'long', year: 'numeric',
                  })}
                  {transfer.academicYear && (
                    <span className="transfer-card__year"> · {transfer.academicYear}</span>
                  )}
                </div>
              </div>
              <div className="transfer-card__student">
                <div className="transfer-card__student-name">
                  {transfer.student?.user?.name ?? transfer.student?.admissionNumber ?? '—'}
                </div>
                <div className="transfer-card__student-num">{transfer.student?.admissionNumber}</div>
                {transfer.reason && (
                  <div className="transfer-card__reason">{transfer.reason}</div>
                )}
              </div>
              <div className="transfer-card__actions">
                <button className="transfer-card__btn-edit" onClick={() => openPanel(transfer)}>
                  Modifier
                </button>
                <button
                  className="transfer-card__btn-del"
                  onClick={() => {
                    if (window.confirm('Supprimer ce transfert ?')) deleteMutation.mutate(transfer.id);
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* OffCanvas form */}
      <OffCanvas
        open={panelOpen}
        onClose={closePanel}
        title={editId ? 'Modifier le transfert' : 'Nouveau transfert'}
        subtitle={
          editId
            ? 'Mettez à jour les informations de ce transfert'
            : 'Enregistrez une entrée ou une sortie d\'élève'
        }
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={closePanel} disabled={saveMutation.isPending}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </>
        }
      >
        <div className="transfers-form">
          {/* Direction picker */}
          <div className="form-field">
            <label className="form-field__label">Direction du transfert</label>
            <div className="transfers-form__dir-grid">
              {DIRECTIONS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  className={`transfers-form__dir-btn${form.direction === d.value ? ' active' : ''}`}
                  style={form.direction === d.value ? { borderColor: d.color, background: d.bg, color: d.color } : {}}
                  onClick={() => set('direction', d.value)}
                >
                  <strong>{d.label}</strong>
                  <small>{d.desc}</small>
                </button>
              ))}
            </div>
          </div>

          {/* Student ID */}
          <Input
            label="ID Élève"
            required
            placeholder="Identifiant de l'élève"
            value={form.studentId}
            onChange={(e) => set('studentId', e.target.value)}
            error={errors.studentId}
            disabled={!!editId}
          />

          {/* Other school */}
          <Input
            label={form.direction === 'IN' ? "École d'origine" : 'École de destination'}
            required
            placeholder="Nom de l'école"
            value={form.otherSchool}
            onChange={(e) => set('otherSchool', e.target.value)}
            error={errors.otherSchool}
          />

          {/* Date + Academic year */}
          <div className="transfers-form__row2">
            <Input
              label="Date de transfert"
              required
              type="date"
              value={form.transferDate}
              onChange={(e) => set('transferDate', e.target.value)}
              error={errors.transferDate}
            />
            <Input
              label="Année scolaire"
              placeholder="ex : 2024-2025"
              value={form.academicYear}
              onChange={(e) => set('academicYear', e.target.value)}
            />
          </div>

          {/* Reason */}
          <div className="form-field">
            <label className="form-field__label">Motif</label>
            <select
              className="transfers-form__select"
              value={form.reason}
              onChange={(e) => set('reason', e.target.value)}
            >
              <option value="">Sélectionner un motif…</option>
              {TRANSFER_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Document URL */}
          <Input
            label="Lien vers le document"
            placeholder="URL de la lettre de transfert (optionnel)"
            value={form.documentUrl}
            onChange={(e) => set('documentUrl', e.target.value)}
          />

          {/* Notes */}
          <div className="form-field">
            <label className="form-field__label">Notes</label>
            <textarea
              className="transfers-form__textarea"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              placeholder="Observations…"
            />
          </div>
        </div>
      </OffCanvas>
    </AppShell>
  );
}
