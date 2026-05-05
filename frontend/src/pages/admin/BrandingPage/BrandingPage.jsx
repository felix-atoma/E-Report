import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { institutionsService } from '../../../services/institutionsService';
import { uploadService } from '../../../services/uploadService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import ColorPicker from '../../../components/common/ColorPicker/ColorPicker';
import FileUpload from '../../../components/common/FileUpload/FileUpload';
import Button from '../../../components/common/Button/Button';
import './BrandingPage.css';

const DEFAULT_FORM = {
  primaryColor:   '#1e40af',
  secondaryColor: '#f59e0b',
  logoUrl:        '',
  crestUrl:       '',
  stampUrl:       '',
  faviconUrl:     '',
};

function BrandingPage() {
  const qc = useQueryClient();
  const [form, setForm]         = useState(DEFAULT_FORM);
  const [logoFile, setLogo]     = useState(null);
  const [crestFile, setCrest]   = useState(null);
  const [stampFile, setStamp]   = useState(null);
  const [saving, setSaving]     = useState(false);

  const { data: institution, isLoading } = useQuery({
    queryKey: ['institution-me'],
    queryFn: () => institutionsService.me().then((r) => r.data),
  });

  useEffect(() => {
    if (!institution) return;
    const bs = institution.brandingSettings ?? {};
    setForm({
      primaryColor:   bs.primaryColor   ?? DEFAULT_FORM.primaryColor,
      secondaryColor: bs.secondaryColor ?? DEFAULT_FORM.secondaryColor,
      logoUrl:        institution.logo  ?? bs.logoUrl ?? '',
      crestUrl:       institution.crest ?? '',
      stampUrl:       institution.stamp ?? '',
      faviconUrl:     bs.faviconUrl     ?? '',
    });
  }, [institution]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      let logoUrl   = form.logoUrl;
      let crestUrl  = form.crestUrl;
      let stampUrl  = form.stampUrl;

      const uploads = await Promise.all([
        logoFile  ? uploadService.upload(logoFile,  'logo')  : null,
        crestFile ? uploadService.upload(crestFile, 'crest') : null,
        stampFile ? uploadService.upload(stampFile, 'stamp') : null,
      ]);
      if (uploads[0]) logoUrl  = uploads[0].data.url;
      if (uploads[1]) crestUrl = uploads[1].data.url;
      if (uploads[2]) stampUrl = uploads[2].data.url;

      await institutionsService.updateBranding({
        primaryColor:   form.primaryColor,
        secondaryColor: form.secondaryColor,
        logoUrl,
        crest:          crestUrl  || undefined,
        stamp:          stampUrl  || undefined,
        faviconUrl:     form.faviconUrl || undefined,
      });

      qc.invalidateQueries({ queryKey: ['institution-me'] });
      setLogo(null);
      setCrest(null);
      setStamp(null);
      toast.success('Identité visuelle enregistrée');
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <AppShell title="Identité visuelle"><div className="branding-page__loading">Chargement…</div></AppShell>;

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
            <div className="branding-preview__bar"   style={{ background: form.primaryColor }} />
            <div className="branding-preview__accent" style={{ background: form.secondaryColor }} />
            <span className="branding-preview__label">Aperçu</span>
          </div>
        </Card>

        {/* Logo */}
        <Card className="branding-section">
          <h3 className="branding-section__title">Logo</h3>
          <p className="branding-section__desc">Affiché dans l'en-tête des bulletins et dans la barre latérale.</p>
          <FileUpload
            id="logo"
            label="Logo de l'établissement"
            value={logoFile ?? (form.logoUrl || null)}
            onChange={setLogo}
            preview
            hint="PNG ou SVG recommandé · Max 2 Mo"
          />
          {form.logoUrl && !logoFile && (
            <p className="branding-section__current">
              Logo actuel : <a href={form.logoUrl} target="_blank" rel="noreferrer">voir</a>
            </p>
          )}
        </Card>

        {/* Crest */}
        <Card className="branding-section">
          <h3 className="branding-section__title">Blason / Armoiries</h3>
          <p className="branding-section__desc">Affiché à droite du logo sur les bulletins.</p>
          <FileUpload
            id="crest"
            label="Blason de l'établissement"
            value={crestFile ?? (form.crestUrl || null)}
            onChange={setCrest}
            preview
            hint="PNG ou SVG recommandé · Max 2 Mo"
          />
          {form.crestUrl && !crestFile && (
            <p className="branding-section__current">
              Blason actuel : <a href={form.crestUrl} target="_blank" rel="noreferrer">voir</a>
            </p>
          )}
        </Card>

        {/* Stamp */}
        <Card className="branding-section">
          <h3 className="branding-section__title">Tampon officiel</h3>
          <p className="branding-section__desc">Tampon ou cachet apposé en bas à droite du bulletin (semi-transparent).</p>
          <FileUpload
            id="stamp"
            label="Tampon de l'établissement"
            value={stampFile ?? (form.stampUrl || null)}
            onChange={setStamp}
            preview
            hint="PNG avec fond transparent recommandé · Max 2 Mo"
          />
          {form.stampUrl && !stampFile && (
            <p className="branding-section__current">
              Tampon actuel : <a href={form.stampUrl} target="_blank" rel="noreferrer">voir</a>
            </p>
          )}
        </Card>

      </div>
    </AppShell>
  );
}

export default BrandingPage;
