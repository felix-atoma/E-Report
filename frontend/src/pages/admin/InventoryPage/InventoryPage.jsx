import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '../../../services/inventoryService';
import { downloadCSV } from '../../../utils/csvExport';
import './InventoryPage.css';

const CATEGORIES = [
  { value: 'FURNITURE', label: 'Mobilier', icon: '🪑' },
  { value: 'EQUIPMENT', label: 'Équipement', icon: '⚙️' },
  { value: 'BOOK', label: 'Livres', icon: '📚' },
  { value: 'SPORT', label: 'Sport', icon: '⚽' },
  { value: 'LAB', label: 'Labo', icon: '🔬' },
  { value: 'IT', label: 'Informatique', icon: '💻' },
  { value: 'OTHER', label: 'Autre', icon: '📦' },
];

const CONDITIONS = [
  { value: 'EXCELLENT', label: 'Excellent', color: '#15803d' },
  { value: 'GOOD', label: 'Bon', color: '#16a34a' },
  { value: 'FAIR', label: 'Passable', color: '#d97706' },
  { value: 'POOR', label: 'Mauvais', color: '#dc2626' },
  { value: 'DAMAGED', label: 'Endommagé', color: '#7f1d1d' },
];

const EMPTY_FORM = {
  name: '',
  category: 'FURNITURE',
  quantity: 1,
  condition: 'GOOD',
  location: '',
  serialNumber: '',
  purchaseDate: '',
  purchaseValue: '',
  supplier: '',
  notes: '',
  isActive: true,
};

function ConditionBadge({ condition }) {
  const c = CONDITIONS.find((x) => x.value === condition) ?? CONDITIONS[1];
  return (
    <span className="inv-condition" style={{ color: c.color, background: c.color + '18' }}>
      {c.label}
    </span>
  );
}

export default function InventoryPage() {
  const qc = useQueryClient();
  const [catFilter, setCatFilter] = useState('');
  const [search, setSearch] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory', catFilter, search],
    queryFn: () =>
      inventoryService.list({ category: catFilter || undefined, search: search || undefined }).then((r) => r.data),
  });

  const { data: summary } = useQuery({
    queryKey: ['inventory-summary'],
    queryFn: () => inventoryService.summary().then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => (editId ? inventoryService.update(editId, data) : inventoryService.create(data)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['inventory-summary'] });
      closePanel();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => inventoryService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['inventory-summary'] });
    },
  });

  function openPanel(item = null) {
    if (item) {
      setEditId(item.id);
      setForm({
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        condition: item.condition,
        location: item.location ?? '',
        serialNumber: item.serialNumber ?? '',
        purchaseDate: item.purchaseDate?.slice(0, 10) ?? '',
        purchaseValue: item.purchaseValue ?? '',
        supplier: item.supplier ?? '',
        notes: item.notes ?? '',
        isActive: item.isActive,
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
    if (!form.name.trim()) e.name = 'Requis';
    if (form.quantity < 0) e.quantity = 'Doit être ≥ 0';
    setErrors(e);
    return !Object.keys(e).length;
  }

  function handleSubmit(ev) {
    ev.preventDefault();
    if (!validate()) return;
    saveMutation.mutate({
      ...form,
      quantity: Number(form.quantity),
      purchaseValue: form.purchaseValue !== '' ? Number(form.purchaseValue) : undefined,
    });
  }

  const catIcon = (val) => CATEGORIES.find((c) => c.value === val)?.icon ?? '📦';
  const catLabel = (val) => CATEGORIES.find((c) => c.value === val)?.label ?? val;

  return (
    <div className="inv-page">
      <div className="inv-page__header">
        <div>
          <h1 className="inv-page__title">Inventaire Scolaire</h1>
          <p className="inv-page__subtitle">
            {summary ? `${summary.totalItems} article(s) · Valeur estimée : ${summary.totalValue.toLocaleString('fr-FR')} FCFA` : '—'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button
            className="inv-page__btn-csv"
            onClick={() => {
              const rows = items.map((i) => ({
                Désignation: i.name,
                Catégorie: catLabel(i.category),
                Quantité: i.quantity,
                État: CONDITIONS.find((c) => c.value === i.condition)?.label ?? i.condition,
                Emplacement: i.location ?? '',
                'N° série': i.serialNumber ?? '',
                Fournisseur: i.supplier ?? '',
                "Date d'achat": i.purchaseDate ? new Date(i.purchaseDate).toLocaleDateString('fr-FR') : '',
                'Valeur unitaire (FCFA)': i.purchaseValue ?? '',
                Actif: i.isActive ? 'Oui' : 'Non',
              }));
              downloadCSV(rows, `inventaire-${new Date().toISOString().slice(0,10)}.csv`);
            }}
          >
            ↓ CSV
          </button>
          <button className="inv-page__btn-add" onClick={() => openPanel()}>+ Ajouter</button>
        </div>
      </div>

      {/* Summary stats */}
      {summary && Object.keys(summary.byCategory).length > 0 && (
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

      {isLoading ? (
        <p className="inv-page__loading">Chargement…</p>
      ) : items.length === 0 ? (
        <div className="inv-page__empty">
          <span className="inv-page__empty-icon">📦</span>
          <p>Aucun article dans l'inventaire.</p>
        </div>
      ) : (
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
                    {item.serialNumber && <div className="inv-table__serial">N/S: {item.serialNumber}</div>}
                  </td>
                  <td>
                    <span className="inv-table__cat">{catIcon(item.category)} {catLabel(item.category)}</span>
                  </td>
                  <td className="inv-table__qty">{item.quantity}</td>
                  <td><ConditionBadge condition={item.condition} /></td>
                  <td className="inv-table__loc">{item.location ?? '—'}</td>
                  <td className="inv-table__val">
                    {item.purchaseValue != null ? `${item.purchaseValue.toLocaleString('fr-FR')} F` : '—'}
                  </td>
                  <td>
                    <div className="inv-table__actions">
                      <button className="inv-table__btn-edit" onClick={() => openPanel(item)}>Modifier</button>
                      <button
                        className="inv-table__btn-del"
                        onClick={() => { if (window.confirm('Supprimer cet article ?')) deleteMutation.mutate(item.id); }}
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
      )}

      {panelOpen && (
        <div className="inv-panel-overlay" onClick={closePanel}>
          <div className="inv-panel" onClick={(e) => e.stopPropagation()}>
            <div className="inv-panel__header">
              <h2>{editId ? 'Modifier l\'article' : 'Nouvel article'}</h2>
              <button className="inv-panel__close" onClick={closePanel}>✕</button>
            </div>

            <form className="inv-panel__form" onSubmit={handleSubmit}>
              <div className="inv-panel__group">
                <label>Désignation *</label>
                <input
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="ex: Table d'élève, Chaise, Microscope…"
                />
                {errors.name && <span className="inv-panel__error">{errors.name}</span>}
              </div>

              <div className="inv-panel__group">
                <label>Catégorie</label>
                <div className="inv-panel__cat-grid">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      className={`inv-panel__cat-btn${form.category === c.value ? ' active' : ''}`}
                      onClick={() => set('category', c.value)}
                    >
                      <span>{c.icon}</span>
                      <small>{c.label}</small>
                    </button>
                  ))}
                </div>
              </div>

              <div className="inv-panel__row2">
                <div className="inv-panel__group">
                  <label>Quantité</label>
                  <input
                    type="number"
                    value={form.quantity}
                    onChange={(e) => set('quantity', e.target.value)}
                    min="0"
                  />
                  {errors.quantity && <span className="inv-panel__error">{errors.quantity}</span>}
                </div>
                <div className="inv-panel__group">
                  <label>État</label>
                  <select value={form.condition} onChange={(e) => set('condition', e.target.value)}>
                    {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="inv-panel__group">
                <label>Emplacement</label>
                <input
                  value={form.location}
                  onChange={(e) => set('location', e.target.value)}
                  placeholder="ex: Salle 3, Bibliothèque, Labo de physique…"
                />
              </div>

              <div className="inv-panel__row2">
                <div className="inv-panel__group">
                  <label>N° de série</label>
                  <input
                    value={form.serialNumber}
                    onChange={(e) => set('serialNumber', e.target.value)}
                    placeholder="Optionnel"
                  />
                </div>
                <div className="inv-panel__group">
                  <label>Fournisseur</label>
                  <input
                    value={form.supplier}
                    onChange={(e) => set('supplier', e.target.value)}
                    placeholder="Nom du fournisseur"
                  />
                </div>
              </div>

              <div className="inv-panel__row2">
                <div className="inv-panel__group">
                  <label>Date d'achat</label>
                  <input
                    type="date"
                    value={form.purchaseDate}
                    onChange={(e) => set('purchaseDate', e.target.value)}
                  />
                </div>
                <div className="inv-panel__group">
                  <label>Valeur unitaire (FCFA)</label>
                  <input
                    type="number"
                    value={form.purchaseValue}
                    onChange={(e) => set('purchaseValue', e.target.value)}
                    min="0"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="inv-panel__group">
                <label>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  rows={2}
                  placeholder="Observations, réparations effectuées…"
                />
              </div>

              <div className="inv-panel__group inv-panel__group--inline">
                <label>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => set('isActive', e.target.checked)}
                  />
                  Article actif (en service)
                </label>
              </div>

              <div className="inv-panel__footer">
                <button type="button" className="inv-panel__btn-cancel" onClick={closePanel}>Annuler</button>
                <button type="submit" className="inv-panel__btn-save" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
