import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { institutionsService } from '../../../services/institutionsService';
import { uploadService } from '../../../services/uploadService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Input from '../../../components/common/Input/Input';
import ColorPicker from '../../../components/common/ColorPicker/ColorPicker';
import FileUpload from '../../../components/common/FileUpload/FileUpload';
import Button from '../../../components/common/Button/Button';
import './BrandingPage.css';

const DEFAULT_FORM = {
  primaryColor: '#1e40af',
  secondaryColor: '#f59e0b',
  logoUrl: '',
  faviconUrl: '',
  schoolMotto: '',
  address: '',
  phone: '',
  website: '',
};

function BrandingPage() {
  const qc = useQueryClient();
  const [form, setForm]     = useState(DEFAULT_FORM);
  const [logoFile, setLogo] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data: institution, isLoading } = useQuery({
    queryKey: ['institution-me'],
    queryFn: () => institutionsService.me().then((r) => r.data),
  });

  useEffect(() => {
    if (!institution) return;
    setForm({
      primaryColor:   institution.branding?.primaryColor   ?? DEFAULT_FORM.primaryColor,
      secondaryColor: institution.branding?.secondaryColor ?? DEFAULT_FORM.secondaryColor,
      logoUrl:        institution.branding?.logoUrl        ?? '',
      faviconUrl:     institution.branding?.faviconUrl     ?? '',
      schoolMotto:    institution.schoolMotto ?? '',
      address:        institution.address     ?? '',
      phone:          institution.phone       ?? '',
      website:        institution.website     ?? '',
    });
  }, [institution]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      let logoUrl = form.logoUrl;
      if (logoFile) {
        const res = await uploadService.upload(logoFile, 'logo');
        logoUrl = res.data.url;
      }
      await institutionsService.updateBranding({
        primaryColor:   form.primaryColor,
        secondaryColor: form.secondaryColor,
        logoUrl,
        faviconUrl:     form.faviconUrl || undefined,
        schoolMotto:    form.schoolMotto || undefined,
        address:        form.address     || undefined,
        phone:          form.phone       || undefined,
        website:        form.website     || undefined,
      });
      qc.invalidateQueries({ queryKey: ['institution-me'] });
      setLogo(null);
      toast.success('Identité visuelle enregistrée');
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <AppShell title="Identité visuelle"><div className="branding-page__loading">Chargement…</div></AppShell>;

  const previewLogo = logoFile ?? (form.logoUrl || null);

  return (
    <AppShell title="Identité visuelle">
      <PageHeader
        title="Identité visuelle"
        subtitle={institution?.name}
        actions={
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        }
      />

      <div className="branding-page__grid">
        {/* Logo */}
        <Card className="branding-section">
          <h3 className="branding-section__title">Logo</h3>
          <FileUpload
            id="logo"
            label="Logo de l'établissement"
            value={previewLogo}
            onChange={setLogo}
            preview
            hint="PNG ou SVG recommandé. Max 2 Mo."
          />
          {form.logoUrl && !logoFile && (
            <p className="branding-section__current">
              Logo actuel : <a href={form.logoUrl} target="_blank" rel="noreferrer">voir</a>
            </p>
          )}
        </Card>

        {/* Colors */}
        <Card className="branding-section">
          <h3 className="branding-section__title">Couleurs</h3>
          <div className="branding-colors">
            <ColorPicker
              id="primaryColor"
              label="Couleur principale"
              value={form.primaryColor}
              onChange={(v) => set('primaryColor', v)}
              hint="Utilisée pour les en-têtes et boutons du bulletin"
            />
            <ColorPicker
              id="secondaryColor"
              label="Couleur secondaire"
              value={form.secondaryColor}
              onChange={(v) => set('secondaryColor', v)}
              hint="Utilisée pour les accents et sous-titres"
            />
          </div>
          <div className="branding-preview">
            <div
              className="branding-preview__bar"
              style={{ background: form.primaryColor }}
            />
            <div
              className="branding-preview__accent"
              style={{ background: form.secondaryColor }}
            />
            <span className="branding-preview__label">Aperçu</span>
          </div>
        </Card>

        {/* Info */}
        <Card className="branding-section branding-section--wide">
          <h3 className="branding-section__title">Informations de l'établissement</h3>
          <div className="branding-info-grid">
            <Input
              id="schoolMotto" label="Devise / Slogan"
              value={form.schoolMotto}
              placeholder="ex: L'excellence au service de la nation"
              onChange={(e) => set('schoolMotto', e.target.value)}
            />
            <Input
              id="address" label="Adresse"
              value={form.address}
              placeholder="ex: Lomé, Togo"
              onChange={(e) => set('address', e.target.value)}
            />
            <Input
              id="phone" label="Téléphone"
              value={form.phone}
              placeholder="+228 XX XX XX XX"
              onChange={(e) => set('phone', e.target.value)}
            />
            <Input
              id="website" label="Site web"
              value={form.website}
              placeholder="https://…"
              onChange={(e) => set('website', e.target.value)}
            />
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

export default BrandingPage;
