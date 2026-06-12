import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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

const CATEGORY_KEYS  = ['FURNITURE', 'EQUIPMENT', 'BOOK', 'SPORT', 'LAB', 'IT', 'OTHER'];
const CATEGORY_ICONS = { FURNITURE:'🪑', EQUIPMENT:'⚙️', BOOK:'📚', SPORT:'⚽', LAB:'🔬', IT:'💻', OTHER:'📦' };

const CONDITION_KEYS = ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'];
const CONDITION_COLORS = {
  EXCELLENT: '#15803d', GOOD: '#16a34a', FAIR: '#d97706', POOR: '#dc2626', DAMAGED: '#7f1d1d',
};

const EMPTY_FORM = {
  name: '', category: 'FURNITURE', quantity: 1, condition: 'GOOD',
  location: '', serialNumber: '', purchaseDate: '', purchaseValue: '',
  supplier: '', notes: '', isActive: true,
};

function ConditionBadge({ condition, t }) {
  const color = CONDITION_COLORS[condition] ?? CONDITION_COLORS.GOOD;
  return (
    <span className="inv-condition" style={{ color, background: color + '18' }}>
      {t(`inventory.conditions.${condition}`, condition)}
    </span>
  );
}

export default function InventoryPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [catFilter, setCatFilter] = useState('');
  const [search, setSearch]       = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [editId, setEditId]       = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [errors, setErrors]       = useState({});

  const conditionOptions = CONDITION_KEYS.map((k) => ({
    value: k, label: t(`inventory.conditions.${k}`),
  }));

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
      toast.success(editId ? t('inventory.toast.updated') : t('inventory.toast.created'));
      closePanel();
    },
    onError: () => toast.error(t('inventory.toast.error')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => inventoryService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['inventory-summary'] });
      toast.success(t('inventory.toast.deleted'));
    },
    onError: () => toast.error(t('inventory.toast.deleteError')),
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
    if (!form.name.trim()) e.name     = t('inventory.errors.required');
    if (form.quantity < 0) e.quantity = t('inventory.errors.qtyPositive');
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
      ? t('inventory.subtitleItems', { count: summary.totalItems, value: Number(summary.totalValue).toLocaleString('fr-FR') })
      : t('inventory.subtitleEmpty')
    : t('inventory.subtitleLoading');

  return (
    <AppShell>
      <PageHeader
        title={t('inventory.title')}
        subtitle={subtitleText}
        actions={
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const rows = items.map((i) => ({
                  [t('inventory.form.name')]:         i.name,
                  [t('inventory.columns.category')]:  t(`inventory.categories.${i.category}`, i.category),
                  [t('inventory.columns.qty')]:       i.quantity,
                  [t('inventory.columns.condition')]: t(`inventory.conditions.${i.condition}`, i.condition),
                  [t('inventory.columns.location')]:  i.location ?? '',
                  'N° série':                          i.serialNumber ?? '',
                  Fournisseur:                         i.supplier ?? '',
                  [t('inventory.form.purchaseDate')]: i.purchaseDate ? new Date(i.purchaseDate).toLocaleDateString('fr-FR') : '',
                  [t('inventory.form.purchaseValue')]:i.purchaseValue ?? '',
                }));
                downloadCSV(rows, `inventaire-${new Date().toISOString().slice(0, 10)}.csv`);
              }}
            >
              ↓ CSV
            </Button>
            <Button size="sm" onClick={() => openPanel()}>{t('inventory.add')}</Button>
          </div>
        }
      />

      {summary && Object.keys(summary.byCategory ?? {}).length > 0 && (
        <div className="inv-page__summary">
          {Object.entries(summary.byCategory).map(([cat, info]) => (
            <div key={cat} className="inv-summary-card">
              <span className="inv-summary-card__icon">{CATEGORY_ICONS[cat] ?? '📦'}</span>
              <strong>{info.totalQty}</strong>
              <span>{t(`inventory.categories.${cat}`, cat)}</span>
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
            {t('inventory.all')}
          </button>
          {CATEGORY_KEYS.map((key) => (
            <button
              key={key}
              className={`inv-page__cat-tab${catFilter === key ? ' active' : ''}`}
              onClick={() => setCatFilter(key)}
            >
              {CATEGORY_ICONS[key]} {t(`inventory.categories.${key}`)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="inv-page__loading">{t('inventory.loading')}</p>
      ) : items.length === 0 ? (
        <Card>
          <div className="inv-page__empty">
            <span className="inv-page__empty-icon">📦</span>
            <p>{t('inventory.empty')}</p>
            <Button size="sm" onClick={() => openPanel()} style={{ marginTop: '1rem' }}>
              {t('inventory.addFirst')}
            </Button>
          </div>
        </Card>
      ) : (
        <Card style={{ padding: 0 }}>
          <div className="inv-page__table-wrap">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>{t('inventory.columns.item')}</th>
                  <th>{t('inventory.columns.category')}</th>
                  <th>{t('inventory.columns.qty')}</th>
                  <th>{t('inventory.columns.condition')}</th>
                  <th>{t('inventory.columns.location')}</th>
                  <th>{t('inventory.columns.value')}</th>
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
                      <span className="inv-table__cat">
                        {CATEGORY_ICONS[item.category] ?? '📦'} {t(`inventory.categories.${item.category}`, item.category)}
                      </span>
                    </td>
                    <td className="inv-table__qty">{item.quantity}</td>
                    <td><ConditionBadge condition={item.condition} t={t} /></td>
                    <td className="inv-table__loc">{item.location ?? '—'}</td>
                    <td className="inv-table__val">
                      {item.purchaseValue != null
                        ? `${Number(item.purchaseValue).toLocaleString('fr-FR')} F`
                        : '—'}
                    </td>
                    <td>
                      <div className="inv-table__actions">
                        <button className="inv-table__btn-edit" onClick={() => openPanel(item)}>
                          {t('inventory.edit')}
                        </button>
                        <button
                          className="inv-table__btn-del"
                          onClick={() => { if (window.confirm(t('inventory.confirmDelete'))) deleteMutation.mutate(item.id); }}
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

      <OffCanvas
        open={panelOpen}
        onClose={closePanel}
        title={editId ? t('inventory.form.editTitle') : t('inventory.form.newTitle')}
        subtitle={editId ? t('inventory.form.editSubtitle') : t('inventory.form.newSubtitle')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={closePanel} disabled={saveMutation.isPending}>
              {t('action.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? t('action.saving') : t('action.save')}
            </Button>
          </>
        }
      >
        <div className="inv-form">
          <Input
            label={t('inventory.form.name')}
            required
            placeholder={t('inventory.form.namePlaceholder')}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            error={errors.name}
          />

          <div className="form-field">
            <label className="form-field__label">{t('inventory.form.category')}</label>
            <div className="inv-form__cat-grid">
              {CATEGORY_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`inv-form__cat-btn${form.category === key ? ' active' : ''}`}
                  onClick={() => set('category', key)}
                >
                  <span>{CATEGORY_ICONS[key]}</span>
                  <small>{t(`inventory.categories.${key}`)}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="inv-form__row2">
            <Input
              label={t('inventory.form.qty')}
              type="number"
              min="0"
              value={form.quantity}
              onChange={(e) => set('quantity', e.target.value)}
              error={errors.quantity}
            />
            <Select
              label={t('inventory.form.condition')}
              value={form.condition}
              options={conditionOptions}
              onChange={(e) => set('condition', e.target.value)}
            />
          </div>

          <Input
            label={t('inventory.form.location')}
            placeholder={t('inventory.form.locationPlaceholder')}
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
          />

          <div className="inv-form__row2">
            <Input
              label={t('inventory.form.serial')}
              placeholder={t('inventory.form.serialPlaceholder')}
              value={form.serialNumber}
              onChange={(e) => set('serialNumber', e.target.value)}
            />
            <Input
              label={t('inventory.form.supplier')}
              placeholder={t('inventory.form.supplierPlaceholder')}
              value={form.supplier}
              onChange={(e) => set('supplier', e.target.value)}
            />
          </div>

          <div className="inv-form__row2">
            <Input
              label={t('inventory.form.purchaseDate')}
              type="date"
              value={form.purchaseDate}
              onChange={(e) => set('purchaseDate', e.target.value)}
            />
            <Input
              label={t('inventory.form.purchaseValue')}
              type="number"
              min="0"
              placeholder="0"
              value={form.purchaseValue}
              onChange={(e) => set('purchaseValue', e.target.value)}
            />
          </div>

          <Textarea
            label={t('inventory.form.notes')}
            rows={3}
            placeholder={t('inventory.form.notesPlaceholder')}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
          />

          <label className="form-field__checkbox">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => set('isActive', e.target.checked)}
            />
            {t('inventory.form.isActive')}
          </label>
        </div>
      </OffCanvas>
    </AppShell>
  );
}
