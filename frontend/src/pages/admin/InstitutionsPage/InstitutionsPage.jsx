import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { institutionsService } from '../../../services/institutionsService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Input from '../../../components/common/Input/Input';
import Select from '../../../components/common/Select/Select';
import Button from '../../../components/common/Button/Button';
import Loading from '../../../components/common/Loading/Loading';
import './InstitutionsPage.css';

const SCHOOL_TYPES = [
  { value: 'MATERNELLE',  label: 'Maternelle' },
  { value: 'PRIMAIRE',    label: 'École primaire' },
  { value: 'COLLEGE',     label: 'Collège' },
  { value: 'LYCEE',       label: 'Lycée' },
  { value: 'MIXTE',       label: 'Établissement multi-cycles' },
  { value: 'UNIVERSITE',  label: 'Université / Supérieur' },
  { value: 'PRIVE',       label: 'Établissement privé' },
  { value: 'AUTRE',       label: 'Autre' },
];

const COUNTRIES = [
  { value: 'TG', label: 'Togo' },
  { value: 'BJ', label: 'Bénin' },
  { value: 'CI', label: "Côte d'Ivoire" },
  { value: 'GH', label: 'Ghana' },
  { value: 'SN', label: 'Sénégal' },
  { value: 'ML', label: 'Mali' },
  { value: 'BF', label: 'Burkina Faso' },
  { value: 'NE', label: 'Niger' },
  { value: 'CM', label: 'Cameroun' },
  { value: 'GA', label: 'Gabon' },
  { value: 'OTHER', label: 'Autre pays' },
];

const DEFAULT_FORM = {
  name: '', type: '', country: 'TG', region: '',
  directorName: '', email: '', phone: '', address: '',
};

function InstitutionsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState({});

  const { data: institution, isLoading } = useQuery({
    queryKey: ['institution-me'],
    queryFn: () => institutionsService.me().then((r) => r.data),
  });

  useEffect(() => {
    if (!institution) return;
    setForm({
      name:         institution.name         ?? '',
      type:         institution.type         ?? '',
      country:      institution.country      ?? 'TG',
      region:       institution.region       ?? '',
      directorName: institution.directorName ?? '',
      email:        institution.email        ?? '',
      phone:        institution.phone        ?? '',
      address:      institution.address      ?? '',
    });
  }, [institution]);

  const mutation = useMutation({
    mutationFn: (data) => institutionsService.update(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['institution-me'] });
      toast.success('Informations enregistrées');
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur de sauvegarde'),
  });

  function set(field) {
    return (e) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
      if (errors[field]) setErrors((err) => ({ ...err, [field]: undefined }));
    };
  }

  function handleSave() {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Nom de l\'établissement requis';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    mutation.mutate({
      name:         form.name,
      type:         form.type         || undefined,
      country:      form.country      || undefined,
      region:       form.region       || undefined,
      directorName: form.directorName || undefined,
      email:        form.email        || undefined,
      phone:        form.phone        || undefined,
      address:      form.address      || undefined,
    });
  }

  if (isLoading) return <AppShell title="Établissement"><Loading /></AppShell>;

  return (
    <AppShell title="Établissement">
      <PageHeader
        title="Mon établissement"
        subtitle="Informations générales"
        actions={
          <Button onClick={handleSave} disabled={mutation.isPending}>
            {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        }
      />

      <div className="institutions-page__grid">
        {/* Identity */}
        <Card className="institution-section">
          <h3 className="institution-section__title">Identité</h3>
          <div className="institution-section__body">
            <Input
              id="inst-name" label="Nom officiel de l'établissement" required
              value={form.name} error={errors.name}
              placeholder="ex: Lycée de Tokoin"
              onChange={set('name')}
            />
            <div className="institution-row">
              <Select
                id="inst-type" label="Type d'établissement"
                value={form.type}
                placeholder="Sélectionner"
                options={SCHOOL_TYPES}
                onChange={set('type')}
              />
              <Input
                id="inst-director" label="Nom du directeur / proviseur"
                value={form.directorName}
                placeholder="ex: M. Koffi Agbeko"
                onChange={set('directorName')}
              />
            </div>
          </div>
        </Card>

        {/* Location */}
        <Card className="institution-section">
          <h3 className="institution-section__title">Localisation</h3>
          <div className="institution-section__body">
            <div className="institution-row">
              <Select
                id="inst-country" label="Pays"
                value={form.country}
                options={COUNTRIES}
                onChange={set('country')}
              />
              <Input
                id="inst-region" label="Région / Ville"
                value={form.region}
                placeholder="ex: Lomé, Maritime"
                onChange={set('region')}
              />
            </div>
            <Input
              id="inst-address" label="Adresse complète"
              value={form.address}
              placeholder="ex: Quartier Tokoin, Rue des Écoles, Lomé"
              onChange={set('address')}
            />
          </div>
        </Card>

        {/* Contact */}
        <Card className="institution-section">
          <h3 className="institution-section__title">Contact officiel</h3>
          <div className="institution-section__body">
            <Input
              id="inst-email" label="Email de l'établissement" type="email"
              value={form.email}
              placeholder="ex: direction@lycee-tokoin.tg"
              onChange={set('email')}
            />
            <Input
              id="inst-phone" label="Téléphone principal"
              value={form.phone}
              placeholder="+228 XX XX XX XX"
              onChange={set('phone')}
            />
          </div>
        </Card>

        {/* Read-only summary */}
        <Card className="institution-section institution-section--summary">
          <h3 className="institution-section__title">Récapitulatif</h3>
          <dl className="institution-summary">
            <div className="institution-summary__row">
              <dt>Établissement</dt>
              <dd>{institution?.name ?? '—'}</dd>
            </div>
            <div className="institution-summary__row">
              <dt>Type</dt>
              <dd>{SCHOOL_TYPES.find((t) => t.value === institution?.type)?.label ?? '—'}</dd>
            </div>
            <div className="institution-summary__row">
              <dt>Pays</dt>
              <dd>{COUNTRIES.find((c) => c.value === institution?.country)?.label ?? institution?.country ?? '—'}</dd>
            </div>
            <div className="institution-summary__row">
              <dt>Année scolaire</dt>
              <dd>{institution?.academicYear ?? '—'}</dd>
            </div>
            <div className="institution-summary__row">
              <dt>Abonnement</dt>
              <dd>{institution?.plan ?? 'Standard'}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </AppShell>
  );
}

export default InstitutionsPage;
