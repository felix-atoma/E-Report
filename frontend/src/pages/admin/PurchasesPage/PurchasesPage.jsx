import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { purchasesService } from '../../../services/purchasesService';
import { downloadCSV } from '../../../utils/csvExport';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import OffCanvas from '../../../components/common/OffCanvas/OffCanvas';
import Input from '../../../components/common/Input/Input';
import Textarea from '../../../components/common/Textarea/Textarea';
import Button from '../../../components/common/Button/Button';
import Card from '../../../components/common/Card/Card';
import './PurchasesPage.css';

const EMPTY_FORM = { date: '', itemName: '', model: '', price: '', notes: '' };

export default function PurchasesPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [search, setSearch]     = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [editId, setEditId]     = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [errors, setErrors]     = useState({});

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['purchases', search],
    queryFn: () =>
      purchasesService
        .list({ search: search || undefined })
        .then((r) => r.data),
  });

  const { data: summary } = useQuery({
    queryKey: ['purchases-summary'],
    queryFn:  () => purchasesService.summary().then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (data) =>
      editId ? purchasesService.update(editId, data) : purchasesService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['purchases-summary'] });
      toast.success(editId ? t('purchases.toast.updated') : t('purchases.toast.created'));
      closePanel();
    },
    onError: () => toast.error(t('purchases.toast.error')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => purchasesService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['purchases-summary'] });
      toast.success(t('purchases.toast.deleted'));
    },
    onError: () => toast.error(t('purchases.toast.deleteError')),
  });

  function openPanel(item = null) {
    if (item) {
      setEditId(item.id);
      setForm({
        date:     item.date?.slice(0, 10) ?? '',
        itemName: item.itemName,
        model:    item.model ?? '',
        price:    item.price ?? '',
        notes:    item.notes ?? '',
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
    if (!form.date)             e.date     = t('purchases.errors.required');
    if (!form.itemName.trim())  e.itemName = t('purchases.errors.required');
    if (form.price === '' || Number(form.price) < 0) e.price = t('purchases.errors.pricePositive');
    setErrors(e);
    return !Object.keys(e).length;
  }

  function handleSubmit() {
    if (!validate()) return;
    saveMutation.mutate({
      date:     form.date,
      itemName: form.itemName,
      model:    form.model || undefined,
      price:    Number(form.price),
      notes:    form.notes || undefined,
    });
  }

  const subtitleText = summary
    ? t('purchases.subtitle', {
        count: summary.count,
        total: Number(summary.total).toLocaleString('fr-FR'),
      })
    : t('purchases.subtitleLoading');

  return (
    <AppShell>
      <PageHeader
        title={t('purchases.title')}
        subtitle={subtitleText}
        actions={
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const rows = items.map((i) => ({
                  [t('purchases.form.date')]:     i.date ? new Date(i.date).toLocaleDateString('fr-FR') : '',
                  [t('purchases.form.itemName')]: i.itemName,
                  [t('purchases.form.model')]:    i.model ?? '',
                  [t('purchases.form.price')]:    Number(i.price),
                  [t('purchases.form.notes')]:    i.notes ?? '',
                }));
                downloadCSV(rows, `achats-${new Date().toISOString().slice(0, 10)}.csv`);
              }}
            >
              ↓ CSV
            </Button>
            <Button size="sm" onClick={() => openPanel()}>{t('purchases.add')}</Button>
          </div>
        }
      />

      {summary && summary.count > 0 && (
        <div className="pur-page__summary">
          <div className="pur-summary-card">
            <span className="pur-summary-card__icon">🛒</span>
            <strong>{summary.count}</strong>
            <span>{t('purchases.summaryCount')}</span>
          </div>
          <div className="pur-summary-card">
            <span className="pur-summary-card__icon">💰</span>
            <strong>{Number(summary.total).toLocaleString('fr-FR')} F</strong>
            <span>{t('purchases.summaryTotal')}</span>
          </div>
        </div>
      )}

      <div className="pur-page__filters">
        <input
          className="pur-page__search"
          placeholder={t('purchases.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="pur-page__loading">{t('purchases.loading')}</p>
      ) : items.length === 0 ? (
        <Card>
          <div className="pur-page__empty">
            <span className="pur-page__empty-icon">🛒</span>
            <p>{t('purchases.empty')}</p>
            <Button size="sm" onClick={() => openPanel()} style={{ marginTop: '1rem' }}>
              {t('purchases.addFirst')}
            </Button>
          </div>
        </Card>
      ) : (
        <Card style={{ padding: 0 }}>
          <div className="pur-page__table-wrap">
            <table className="pur-table">
              <thead>
                <tr>
                  <th>{t('purchases.columns.date')}</th>
                  <th>{t('purchases.columns.item')}</th>
                  <th>{t('purchases.columns.model')}</th>
                  <th>{t('purchases.columns.price')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="pur-table__date">
                      {item.date ? new Date(item.date).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td>
                      <div className="pur-table__name">{item.itemName}</div>
                      {item.notes && (
                        <div className="pur-table__notes">{item.notes}</div>
                      )}
                    </td>
                    <td className="pur-table__model">{item.model ?? '—'}</td>
                    <td className="pur-table__price">
                      {Number(item.price).toLocaleString('fr-FR')} F
                    </td>
                    <td>
                      <div className="pur-table__actions">
                        <button className="pur-table__btn-edit" onClick={() => openPanel(item)}>
                          {t('purchases.edit')}
                        </button>
                        <button
                          className="pur-table__btn-del"
                          onClick={() => {
                            if (window.confirm(t('purchases.confirmDelete'))) {
                              deleteMutation.mutate(item.id);
                            }
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

      <OffCanvas
        open={panelOpen}
        onClose={closePanel}
        title={editId ? t('purchases.form.editTitle') : t('purchases.form.newTitle')}
        subtitle={editId ? t('purchases.form.editSubtitle') : t('purchases.form.newSubtitle')}
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
        <div className="pur-form">
          <Input
            label={t('purchases.form.date')}
            type="date"
            required
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
            error={errors.date}
          />

          <Input
            label={t('purchases.form.itemName')}
            required
            placeholder={t('purchases.form.itemNamePlaceholder')}
            value={form.itemName}
            onChange={(e) => set('itemName', e.target.value)}
            error={errors.itemName}
          />

          <Input
            label={t('purchases.form.model')}
            placeholder={t('purchases.form.modelPlaceholder')}
            value={form.model}
            onChange={(e) => set('model', e.target.value)}
          />

          <Input
            label={t('purchases.form.price')}
            type="number"
            min="0"
            required
            placeholder="0"
            value={form.price}
            onChange={(e) => set('price', e.target.value)}
            error={errors.price}
          />

          <Textarea
            label={t('purchases.form.notes')}
            rows={3}
            placeholder={t('purchases.form.notesPlaceholder')}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </div>
      </OffCanvas>
    </AppShell>
  );
}
