import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { inventoryService } from '../../../services/inventoryService';
import { downloadCSV } from '../../../utils/csvExport';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import OffCanvas from '../../../components/common/OffCanvas/OffCanvas';
import Input from '../../../components/common/Input/Input';
import Textarea from '../../../components/common/Textarea/Textarea';
import Select from '../../../components/common/Select/Select';
import Button from '../../../components/common/Button/Button';
import Card from '../../../components/common/Card/Card';
import './InventoryPage.css';

const CATEGORIES = [
  { value: 'FURNITURE', label: 'Mobilier',      icon: '🪑' },
  { value: 'EQUIPMENT', label: 'Équipement',    icon: '⚙️' },
  { value: 'BOOK',      label: 'Livres',         icon: '📚' },
  { value: 'SPORT',     label: 'Sport',          icon: '⚽' },
  { value: 'LAB',       label: 'Labo',           icon: '🔬' },
  { value: 'IT',        label: 'Informatique',   icon: '💻' },
  { value: 'OTHER',     label: 'Autre',          icon: '📦' },
];

const CONDITIONS = [
  { value: 'EXCELLENT', label: 'Excellent',    color: '#15803d' },
  { value: 'GOOD',      label: 'Bon',          color: '#16a34a' },
  { value: 'FAIR',      label: 'Passable',     color: '#d97706' },
  { value: 'POOR',      label: 'Mauvais',      color: '#dc2626' },
  { value: 'DAMAGED',   label: 'Endommagé',    color: '#7f1d1d' },
];

const EMPTY_FORM = {
  name: '', category: 'FURNITURE', quantity: 1, condition: 'GOOD',
  location: '', serialNumber: '', purchaseDate: '', purchaseValue: '',
  supplier: '', notes: '', isActive: true,
};

function ConditionBadge({ condition }) {
  const c = CONDITIONS.find((x) => x.value === condition) ?? CONDITIONS[1];
  return (
    <span className="inv-condition" style={{ color: c.color, background: c.color + '18' }}>
      {c.label}
    </span>
  );
}

const catIcon  = (val) => CATEGORIES.find((c) => c.value === val)?.icon  ?? '📦';
const catLabel = (val) => CATEGORIES.find((c) => c.value === val)?.label ?? val;

export default function InventoryPage() {
  const qc = useQueryClient();
  const [catFilter, setCatFilter] = useState('');
  const [search, setSearch]       = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [editId, setEditId]       = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [errors, setErrors]       = useState({});

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory', catFilter, search],
    queryFn: () =>
      inventoryService
        .list({ category: catFilter || undefined, search: search || undefined })
        .then((r) => r.data),
  });

  const { data: summary } = useQuery({
    queryKey: ['inventory-summary'],
    queryFn:  () => inventoryService.summary().then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (data) =>
      editId ? inventoryService.update(editId, data) : inventoryService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['inventory-summary'] });
      toast.success(editId ? 'Article modifié' : 'Article ajouté');
      closePanel();
    },
    onError: () => toast.error('Une erreur est survenue'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => inventoryService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['inventory-summary'] });
      toast.success('Article supprimé');
    },
    onError: () => toast.error('Impossible de supprimer cet article'),
  });

  function openPanel(item = null) {
    if (item) {
      setEditId(item.id);
      setForm({
        name:          item.name,
        category:      item.category,
        quantity:      item.quantity,
        condition:     item.condition,
        location:      item.location      ?? '',
        serialNumber:  item.serialNumber  ?? '',
        purchaseDate:  item.purchaseDate?.slice(0, 10) ?? '',
        purchaseValue: item.purchaseValue ?? '',
        supplier:      item.supplier      ?? '',
        notes:         item.notes         ?? '',
        isActive:      item.isActive,
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
    if (!form.name.trim())  e.name     = 'Ce champ est requis';
    if (form.quantity < 0)  e.quantity = 'Doit être ≥ 0';
    setErrors(e);
    return !Object.keys(e).length;
  }

  function handleSubmit() {
    if (!validate()) return;
    saveMutation.mutate({
      ...form,
      quantity:      Number(form.quantity),
      purchaseValue: form.purchaseValue !== '' ? Number(form.purchaseValue) : undefined,
    });
  }

  const subtitleText = summary
    ? summary.totalItems > 0
      ? `${summary.totalItems} article(s) · Valeur estimée : ${Number(summary.totalValue).toLocaleString('fr-FR')} FCFA`
      : 'Aucun article enregistré — ajoutez votre premier article'
    : 'Chargement…';

  return (
    <AppShell>
      <PageHeader
        title="Inventaire Scolaire"
        subtitle={subtitleText}
        actions={
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const rows = items.map((i) => ({
                  Désignation:            i.name,
                  Catégorie:              catLabel(i.category),
                  Quantité:               i.quantity,
                  État:                   CONDITIONS.find((c) => c.value === i.condition)?.label ?? i.condition,
                  Emplacement:            i.location ?? '',
                  'N° série':             i.serialNumber ?? '',
                  Fournisseur:            i.supplier ?? '',
                  "Date d'achat":         i.purchaseDate ? new Date(i.purchaseDate).toLocaleDateString('fr-FR') : '',
                  'Valeur unitaire (FCFA)': i.purchaseValue ?? '',
                  Actif:                  i.isActive ? 'Oui' : 'Non',
                }));
                downloadCSV(rows, `inventaire-${new Date().toISOString().slice(0, 10)}.csv`);
              }}
            >
              ↓ CSV
            </Button>
            <Button size="sm" onClick={() => openPanel()}>+ Ajouter</Button>
          </div>
        }
      />

      {/* Category summary cards */}
      {summary && Object.keys(summary.byCategory ?? {}).length > 0 && (
        <div className="inv-page__summary">
          {Object.entries(summary.byCategory).map(([cat, info]) => (
            <div key={cat} className="inv-summary-card">
              <span className="inv-summary-card__icon">{catIcon(cat)}</span>
              <strong>{info.totalQty}</strong>
              <span>{catLabel(cat)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="inv-page__filters">
        <input
          className="inv-page__search"
          placeholder="Rechercher par nom, emplacement…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="inv-page__cat-tabs">
          <button
            className={`inv-page__cat-tab${catFilter === '' ? ' active' : ''}`}
            onClick={() => setCatFilter('')}
          >
            Tous
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              className={`inv-page__cat-tab${catFilter === c.value ? ' active' : ''}`}
              onClick={() => setCatFilter(c.value)}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="inv-page__loading">Chargement…</p>
      ) : items.length === 0 ? (
        <Card>
          <div className="inv-page__empty">
            <span className="inv-page__empty-icon">📦</span>
            <p>Aucun article dans l'inventaire.</p>
            <Button size="sm" onClick={() => openPanel()} style={{ marginTop: '1rem' }}>
              + Ajouter le premier article
            </Button>
          </div>
        </Card>
      ) : (
        <Card style={{ padding: 0 }}>
          <div className="inv-page__table-wrap">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Article</th>
                  <th>Catégorie</th>
                  <th>Qté</th>
                  <th>État</th>
                  <th>Emplacement</th>
                  <th>Valeur unitaire</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className={!item.isActive ? 'inv-table__row--inactive' : ''}>
                    <td>
                      <div className="inv-table__name">{item.name}</div>
                      {item.serialNumber && (
                        <div className="inv-table__serial">N/S: {item.serialNumber}</div>
                      )}
                    </td>
                    <td>
                      <span className="inv-table__cat">{catIcon(item.category)} {catLabel(item.category)}</span>
                    </td>
                    <td className="inv-table__qty">{item.quantity}</td>
                    <td><ConditionBadge condition={item.condition} /></td>
                    <td className="inv-table__loc">{item.location ?? '—'}</td>
                    <td className="inv-table__val">
                      {item.purchaseValue != null
                        ? `${Number(item.purchaseValue).toLocaleString('fr-FR')} F`
                        : '—'}
                    </td>
                    <td>
                      <div className="inv-table__actions">
                        <button className="inv-table__btn-edit" onClick={() => openPanel(item)}>
                          Modifier
                        </button>
                        <button
                          className="inv-table__btn-del"
                          onClick={() => {
                            if (window.confirm('Supprimer cet article ?'))
                              deleteMutation.mutate(item.id);
                          }}
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
      )}

      {/* Add / Edit panel */}
      <OffCanvas
        open={panelOpen}
        onClose={closePanel}
        title={editId ? 'Modifier l\'article' : 'Nouvel article'}
        subtitle={editId ? 'Mettez à jour les informations de cet article' : 'Renseignez les informations de l\'article à ajouter'}
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
        <div className="inv-form">
          {/* Désignation */}
          <Input
            label="Désignation"
            required
            placeholder="ex : Table d'élève, Chaise, Microscope…"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            error={errors.name}
          />

          {/* Catégorie */}
          <div className="form-field">
            <label className="form-field__label">Catégorie</label>
            <div className="inv-form__cat-grid">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className={`inv-form__cat-btn${form.category === c.value ? ' active' : ''}`}
                  onClick={() => set('category', c.value)}
                >
                  <span>{c.icon}</span>
                  <small>{c.label}</small>
                </button>
              ))}
            </div>
          </div>

          {/* Quantité + État */}
          <div className="inv-form__row2">
            <Input
              label="Quantité"
              type="number"
              min="0"
              value={form.quantity}
              onChange={(e) => set('quantity', e.target.value)}
              error={errors.quantity}
            />
            <Select
              label="État"
              value={form.condition}
              options={CONDITIONS}
              onChange={(e) => set('condition', e.target.value)}
            />
          </div>

          {/* Emplacement */}
          <Input
            label="Emplacement"
            placeholder="ex : Salle 3, Bibliothèque, Labo de physique…"
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
          />

          {/* N° série + Fournisseur */}
          <div className="inv-form__row2">
            <Input
              label="N° de série"
              placeholder="Optionnel"
              value={form.serialNumber}
              onChange={(e) => set('serialNumber', e.target.value)}
            />
            <Input
              label="Fournisseur"
              placeholder="Nom du fournisseur"
              value={form.supplier}
              onChange={(e) => set('supplier', e.target.value)}
            />
          </div>

          {/* Date d'achat + Valeur */}
          <div className="inv-form__row2">
            <Input
              label="Date d'achat"
              type="date"
              value={form.purchaseDate}
              onChange={(e) => set('purchaseDate', e.target.value)}
            />
            <Input
              label="Valeur unitaire (FCFA)"
              type="number"
              min="0"
              placeholder="0"
              value={form.purchaseValue}
              onChange={(e) => set('purchaseValue', e.target.value)}
            />
          </div>

          {/* Notes */}
          <Textarea
            label="Notes"
            rows={3}
            placeholder="Observations, réparations effectuées…"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
          />

          {/* Actif */}
          <label className="form-field__checkbox">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => set('isActive', e.target.checked)}
            />
            Article actif (en service)
          </label>
        </div>
      </OffCanvas>
    </AppShell>
  );
}
