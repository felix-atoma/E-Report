import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { institutionsService } from '../../../services/institutionsService';
import { uploadService } from '../../../services/uploadService';
import { useInstitution } from '../../../context/InstitutionContext';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import ColorPicker from '../../../components/common/ColorPicker/ColorPicker';
import FileUpload from '../../../components/common/FileUpload/FileUpload';
import Button from '../../../components/common/Button/Button';
import OffCanvas from '../../../components/common/OffCanvas/OffCanvas';
import './BrandingPage.css';

/* ── Font helpers ── */
const FONT_PRESETS = [
  'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Garamond',
  'Palatino Linotype', 'Trebuchet MS', 'Verdana', 'Courier New', 'Impact',
  'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Raleway',
  'Nunito', 'Ubuntu', 'Oswald', 'Inter', 'Noto Sans', 'PT Sans',
  'Source Sans 3', 'Barlow', 'Exo 2', 'Fira Sans', 'Jost',
  'Playfair Display', 'Merriweather', 'Libre Baskerville', 'Noto Serif',
  'PT Serif', 'Cormorant Garamond', 'EB Garamond', 'Crimson Text',
  'Dancing Script', 'Pacifico', 'Lobster', 'Caveat', 'Satisfy',
];

const SYSTEM_FONTS = new Set([
  'Arial', 'Helvetica', 'Times New Roman', 'Times', 'Georgia', 'Garamond',
  'Palatino Linotype', 'Palatino', 'Trebuchet MS', 'Verdana', 'Geneva',
  'Courier New', 'Courier', 'Impact', 'Comic Sans MS',
]);

function loadGoogleFont(name) {
  if (!name || SYSTEM_FONTS.has(name)) return;
  const id = `gf-${name.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id; link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:wght@400;700&display=swap`;
  document.head.appendChild(link);
}

const FONT_SIZES = [
  { value: '8px',  label: '8px — Très petit' },
  { value: '9px',  label: '9px — Petit' },
  { value: '10px', label: '10px — Normal' },
  { value: '11px', label: '11px — Grand' },
  { value: '12px', label: '12px — Très grand' },
];

const FONT_SIZES_EM = [
  '0.70em','0.75em','0.80em','0.85em','0.90em',
  '1.00em','1.10em','1.20em','1.30em','1.40em',
  '1.50em','1.60em','1.80em','2.00em',
];

const FONT_WEIGHTS = ['400','500','600','700','800','900'];

const HEADING_LEVELS = [
  { key: 'H1', label: 'H1 — Nom de l\'établissement', defaultSize: '1.3em', defaultWeight: '900' },
  { key: 'H2', label: 'H2 — Titre du bulletin',       defaultSize: '1.1em', defaultWeight: '900' },
  { key: 'H3', label: 'H3 — Titres de sections',      defaultSize: '0.8em', defaultWeight: '800' },
];

const DEFAULT_FORM = {
  primaryColor:     '#1e40af',
  secondaryColor:   '#f59e0b',
  logoUrl:          '',
  crestUrl:         '',
  stampUrl:         '',
  faviconUrl:       '',
  bulletinFontFamily: 'Arial',
  bulletinFontSize:   '10px',
  bulletinH1Size:   '1.3em', bulletinH1Weight: '900',
  bulletinH2Size:   '1.1em', bulletinH2Weight: '900',
  bulletinH3Size:   '0.8em', bulletinH3Weight: '800',
};

function BrandingPage() {
  const qc = useQueryClient();
  const { refreshInstitution } = useInstitution();

  const [form, setForm]         = useState(DEFAULT_FORM);
  const [logoFile, setLogo]     = useState(null);
  const [crestFile, setCrest]   = useState(null);
  const [stampFile, setStamp]   = useState(null);
  const [saving, setSaving]     = useState(false);

  const [colorsOpen, setColorsOpen] = useState(false);
  const [imagesOpen, setImagesOpen] = useState(false);
  const [typoOpen, setTypoOpen]     = useState(false);

  const { data: institution, isLoading } = useQuery({
    queryKey: ['institution-me'],
    queryFn: () => institutionsService.me().then((r) => r.data),
  });

  useEffect(() => {
    if (!institution) return;
    const bs = institution.brandingSettings ?? {};
    setForm({
      primaryColor:       bs.primaryColor        ?? DEFAULT_FORM.primaryColor,
      secondaryColor:     bs.secondaryColor       ?? DEFAULT_FORM.secondaryColor,
      logoUrl:            institution.logo        ?? bs.logoUrl ?? '',
      crestUrl:           institution.crest       ?? '',
      stampUrl:           institution.stamp       ?? '',
      faviconUrl:         bs.faviconUrl           ?? '',
      bulletinFontFamily: bs.bulletinFontFamily   ?? DEFAULT_FORM.bulletinFontFamily,
      bulletinFontSize:   bs.bulletinFontSize     ?? DEFAULT_FORM.bulletinFontSize,
      bulletinH1Size:     bs.bulletinH1Size       ?? DEFAULT_FORM.bulletinH1Size,
      bulletinH1Weight:   bs.bulletinH1Weight     ?? DEFAULT_FORM.bulletinH1Weight,
      bulletinH2Size:     bs.bulletinH2Size       ?? DEFAULT_FORM.bulletinH2Size,
      bulletinH2Weight:   bs.bulletinH2Weight     ?? DEFAULT_FORM.bulletinH2Weight,
      bulletinH3Size:     bs.bulletinH3Size       ?? DEFAULT_FORM.bulletinH3Size,
      bulletinH3Weight:   bs.bulletinH3Weight     ?? DEFAULT_FORM.bulletinH3Weight,
    });
  }, [institution]);

  /* Live color preview on the admin UI itself */
  useEffect(() => {
    const root = document.documentElement;
    if (form.primaryColor)   root.style.setProperty('--color-primary',   form.primaryColor);
    if (form.secondaryColor) root.style.setProperty('--color-secondary', form.secondaryColor);
    if (form.primaryColor) {
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(form.primaryColor);
      if (m) {
        let r = parseInt(m[1], 16) / 255, g = parseInt(m[2], 16) / 255, b = parseInt(m[3], 16) / 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0;
        if (max !== min) {
          const d = max - min;
          switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
          }
        }
        const hDeg = Math.round(h * 360);
        root.style.setProperty('--sidebar-bg',        `hsl(${hDeg},30%,9%)`);
        root.style.setProperty('--sidebar-bg-subtle',  `hsl(${hDeg},25%,13%)`);
        root.style.setProperty('--sidebar-bg-muted',   `hsl(${hDeg},20%,18%)`);
      }
    }
  }, [form.primaryColor, form.secondaryColor]);

  /* Load Google Font for typography preview */
  useEffect(() => { loadGoogleFont(form.bulletinFontFamily?.trim()); }, [form.bulletinFontFamily]);

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  async function handleColorsSave() {
    setSaving(true);
    try {
      await institutionsService.updateBranding({
        primaryColor:  form.primaryColor,
        secondaryColor: form.secondaryColor,
      });
      qc.invalidateQueries({ queryKey: ['institution-me'] });
      refreshInstitution();
      toast.success('Couleurs enregistrées');
      setColorsOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Erreur de sauvegarde');
    } finally { setSaving(false); }
  }

  async function handleImagesSave() {
    setSaving(true);
    try {
      let logoUrl  = form.logoUrl;
      let crestUrl = form.crestUrl;
      let stampUrl = form.stampUrl;
      const uploads = await Promise.all([
        logoFile  ? uploadService.upload(logoFile,  'logo')  : null,
        crestFile ? uploadService.upload(crestFile, 'crest') : null,
        stampFile ? uploadService.upload(stampFile, 'stamp') : null,
      ]);
      if (uploads[0]) logoUrl  = uploads[0].data.url;
      if (uploads[1]) crestUrl = uploads[1].data.url;
      if (uploads[2]) stampUrl = uploads[2].data.url;
      await institutionsService.updateBranding({
        logoUrl,
        crest:     crestUrl  || undefined,
        stamp:     stampUrl  || undefined,
        faviconUrl: form.faviconUrl || undefined,
      });
      qc.invalidateQueries({ queryKey: ['institution-me'] });
      refreshInstitution();
      setLogo(null); setCrest(null); setStamp(null);
      toast.success('Images enregistrées');
      setImagesOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Erreur de sauvegarde');
    } finally { setSaving(false); }
  }

  async function handleTypographySave() {
    setSaving(true);
    try {
      await institutionsService.updateBranding({
        bulletinFontFamily: form.bulletinFontFamily || undefined,
        bulletinFontSize:   form.bulletinFontSize   || undefined,
        bulletinH1Size:     form.bulletinH1Size     || undefined,
        bulletinH1Weight:   form.bulletinH1Weight   || undefined,
        bulletinH2Size:     form.bulletinH2Size     || undefined,
        bulletinH2Weight:   form.bulletinH2Weight   || undefined,
        bulletinH3Size:     form.bulletinH3Size     || undefined,
        bulletinH3Weight:   form.bulletinH3Weight   || undefined,
      });
      qc.invalidateQueries({ queryKey: ['institution-me'] });
      refreshInstitution();
      toast.success('Typographie enregistrée');
      setTypoOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Erreur de sauvegarde');
    } finally { setSaving(false); }
  }

  if (isLoading) return <AppShell title="Identité visuelle"><div className="branding-page__loading">Chargement…</div></AppShell>;

  const bs = institution?.brandingSettings ?? {};

  return (
    <AppShell title="Identité visuelle">
      <PageHeader title="Identité visuelle" subtitle={institution?.name} />

      <div className="branding-page__grid">

        {/* ── Colors card ── */}
        <Card className="branding-section">
          <div className="branding-section__header">
            <div>
              <h3 className="branding-section__title">Couleurs</h3>
              <p className="branding-section__desc">Couleurs principales appliquées aux bulletins et à l'interface.</p>
            </div>
            <Button size="sm" onClick={() => setColorsOpen(true)}>Modifier</Button>
          </div>
          <div className="branding-colors-preview">
            <div className="branding-colors-preview__swatch" style={{ background: bs.primaryColor ?? DEFAULT_FORM.primaryColor }}>
              <span>Principale</span>
            </div>
            <div className="branding-colors-preview__swatch branding-colors-preview__swatch--secondary" style={{ background: bs.secondaryColor ?? DEFAULT_FORM.secondaryColor }}>
              <span>Secondaire</span>
            </div>
          </div>
        </Card>

        {/* ── Images card ── */}
        <Card className="branding-section">
          <div className="branding-section__header">
            <div>
              <h3 className="branding-section__title">Images</h3>
              <p className="branding-section__desc">Logo, blason et tampon affichés sur les bulletins.</p>
            </div>
            <Button size="sm" onClick={() => setImagesOpen(true)}>Modifier</Button>
          </div>
          <div className="branding-images-preview">
            {institution?.logo
              ? <img src={institution.logo} alt="Logo" className="branding-images-preview__img" />
              : <div className="branding-images-preview__placeholder">Logo</div>}
            {institution?.crest
              ? <img src={institution.crest} alt="Blason" className="branding-images-preview__img" />
              : <div className="branding-images-preview__placeholder">Blason</div>}
            {institution?.stamp
              ? <img src={institution.stamp} alt="Tampon" className="branding-images-preview__img" />
              : <div className="branding-images-preview__placeholder">Tampon</div>}
          </div>
        </Card>

        {/* ── Typography card ── */}
        <Card className="branding-section">
          <div className="branding-section__header">
            <div>
              <h3 className="branding-section__title">Typographie</h3>
              <p className="branding-section__desc">Police et styles de titres du bulletin imprimé.</p>
            </div>
            <Button size="sm" onClick={() => setTypoOpen(true)}>Modifier</Button>
          </div>
          <div
            className="branding-typo-preview-card"
            style={{
              fontFamily: `'${bs.bulletinFontFamily ?? 'Arial'}', sans-serif`,
              fontSize: bs.bulletinFontSize ?? '10px',
            }}
          >
            <div style={{ fontSize: bs.bulletinH1Size ?? '1.3em', fontWeight: bs.bulletinH1Weight ?? '900', textTransform: 'uppercase' }}>
              {institution?.name ?? 'Nom de l\'établissement'}
            </div>
            <div style={{ fontSize: bs.bulletinH2Size ?? '1.1em', fontWeight: bs.bulletinH2Weight ?? '900', marginTop: '3px' }}>
              BULLETIN DE NOTES
            </div>
            <div style={{ fontSize: bs.bulletinH3Size ?? '0.8em', fontWeight: bs.bulletinH3Weight ?? '800', marginTop: '4px', color: '#6b7280', textTransform: 'uppercase' }}>
              RÉSULTATS DU TRIMESTRE
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '6px' }}>
              Police : {bs.bulletinFontFamily ?? 'Arial'} · Base : {bs.bulletinFontSize ?? '10px'}
            </div>
          </div>
        </Card>

      </div>

      {/* ════ OffCanvas: Couleurs ════ */}
      <OffCanvas
        open={colorsOpen}
        onClose={() => setColorsOpen(false)}
        title="Couleurs du bulletin"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setColorsOpen(false)} disabled={saving}>Annuler</Button>
            <Button onClick={handleColorsSave} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </>
        }
      >
        <div className="branding-section" style={{ gap: '1.25rem' }}>
          <ColorPicker
            id="primaryColor" label="Couleur principale"
            value={form.primaryColor}
            onChange={(v) => set('primaryColor', v)}
            hint="En-têtes, barres et boutons du bulletin"
          />
          <ColorPicker
            id="secondaryColor" label="Couleur secondaire"
            value={form.secondaryColor}
            onChange={(v) => set('secondaryColor', v)}
            hint="Accents et sous-titres"
          />
          <div className="branding-preview">
            <div className="branding-preview__bar"    style={{ background: form.primaryColor }} />
            <div className="branding-preview__accent" style={{ background: form.secondaryColor }} />
            <span className="branding-preview__label">Aperçu</span>
          </div>
        </div>
      </OffCanvas>

      {/* ════ OffCanvas: Images ════ */}
      <OffCanvas
        open={imagesOpen}
        onClose={() => setImagesOpen(false)}
        title="Images de l'établissement"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setImagesOpen(false)} disabled={saving}>Annuler</Button>
            <Button onClick={handleImagesSave} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </>
        }
      >
        <div className="branding-section" style={{ gap: '1.5rem' }}>
          <div>
            <p className="branding-section__title" style={{ marginBottom: '0.5rem' }}>Logo</p>
            <p className="branding-section__desc">Affiché dans l'en-tête des bulletins et dans la barre latérale.</p>
            <FileUpload
              id="logo" label="Logo de l'établissement"
              value={logoFile ?? (form.logoUrl || null)}
              onChange={setLogo} preview
              hint="PNG ou SVG recommandé · Max 2 Mo"
            />
            {form.logoUrl && !logoFile && (
              <p className="branding-section__current">Logo actuel : <a href={form.logoUrl} target="_blank" rel="noreferrer">voir</a></p>
            )}
          </div>
          <div>
            <p className="branding-section__title" style={{ marginBottom: '0.5rem' }}>Blason / Armoiries</p>
            <p className="branding-section__desc">Affiché à droite du logo sur les bulletins.</p>
            <FileUpload
              id="crest" label="Blason de l'établissement"
              value={crestFile ?? (form.crestUrl || null)}
              onChange={setCrest} preview
              hint="PNG ou SVG recommandé · Max 2 Mo"
            />
            {form.crestUrl && !crestFile && (
              <p className="branding-section__current">Blason actuel : <a href={form.crestUrl} target="_blank" rel="noreferrer">voir</a></p>
            )}
          </div>
          <div>
            <p className="branding-section__title" style={{ marginBottom: '0.5rem' }}>Tampon officiel</p>
            <p className="branding-section__desc">Tampon apposé en bas à droite du bulletin (semi-transparent).</p>
            <FileUpload
              id="stamp" label="Tampon de l'établissement"
              value={stampFile ?? (form.stampUrl || null)}
              onChange={setStamp} preview
              hint="PNG avec fond transparent · Max 2 Mo"
            />
            {form.stampUrl && !stampFile && (
              <p className="branding-section__current">Tampon actuel : <a href={form.stampUrl} target="_blank" rel="noreferrer">voir</a></p>
            )}
          </div>
        </div>
      </OffCanvas>

      {/* ════ OffCanvas: Typographie ════ */}
      <OffCanvas
        open={typoOpen}
        onClose={() => setTypoOpen(false)}
        title="Typographie du bulletin"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setTypoOpen(false)} disabled={saving}>Annuler</Button>
            <Button onClick={handleTypographySave} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </>
        }
      >
        <div className="branding-typo-canvas">

          {/* Font family */}
          <div className="branding-field">
            <label className="branding-field__label" htmlFor="bulletinFontFamily">Police de caractères</label>
            <input
              id="bulletinFontFamily"
              list="font-presets-list"
              className="branding-field__input branding-field__input--font"
              placeholder="ex : Roboto, Open Sans, Lato…"
              value={form.bulletinFontFamily}
              onChange={(e) => set('bulletinFontFamily', e.target.value)}
              style={{ fontFamily: form.bulletinFontFamily }}
              autoComplete="off"
            />
            <datalist id="font-presets-list">
              {FONT_PRESETS.map((f) => <option key={f} value={f} />)}
            </datalist>
            <p className="branding-field__hint">Tapez n'importe quelle police Google Fonts ou système — chargement automatique.</p>
          </div>

          {/* Base size */}
          <div className="branding-field">
            <label className="branding-field__label" htmlFor="bulletinFontSize">Taille de base</label>
            <select
              id="bulletinFontSize"
              className="branding-field__select"
              value={form.bulletinFontSize}
              onChange={(e) => set('bulletinFontSize', e.target.value)}
            >
              {FONT_SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <p className="branding-field__hint">Toutes les tailles ci-dessous sont relatives à cette valeur.</p>
          </div>

          {/* Heading levels table */}
          <div className="branding-typo__headings">
            <p className="branding-typo__headings-title">Styles des titres</p>
            <table className="branding-typo__table">
              <thead>
                <tr>
                  <th>Niveau</th>
                  <th>Taille</th>
                  <th>Graisse</th>
                </tr>
              </thead>
              <tbody>
                {HEADING_LEVELS.map(({ key, label }) => {
                  const sizeKey   = `bulletin${key}Size`;
                  const weightKey = `bulletin${key}Weight`;
                  return (
                    <tr key={key}>
                      <td className="branding-typo__level-label">{label}</td>
                      <td>
                        <select
                          className="branding-typo__select"
                          value={form[sizeKey]}
                          onChange={(e) => set(sizeKey, e.target.value)}
                          aria-label={`Taille ${key}`}
                        >
                          {FONT_SIZES_EM.map((v) => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </td>
                      <td>
                        <select
                          className="branding-typo__select"
                          value={form[weightKey]}
                          onChange={(e) => set(weightKey, e.target.value)}
                          aria-label={`Graisse ${key}`}
                        >
                          {FONT_WEIGHTS.map((v) => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Live preview */}
          <div
            className="branding-typo__preview"
            style={{ fontFamily: `'${form.bulletinFontFamily}', sans-serif`, fontSize: form.bulletinFontSize }}
          >
            <div style={{ fontSize: form.bulletinH1Size, fontWeight: form.bulletinH1Weight, textTransform: 'uppercase', letterSpacing: '1px' }}>
              LYCÉE EXEMPLE
            </div>
            <div style={{ fontSize: form.bulletinH2Size, fontWeight: form.bulletinH2Weight, letterSpacing: '0.5px', marginTop: '3px' }}>
              BULLETIN DE NOTES — 1ER TRIMESTRE
            </div>
            <div style={{ fontSize: form.bulletinH3Size, fontWeight: form.bulletinH3Weight, textTransform: 'uppercase', marginTop: '6px', color: '#6b7280' }}>
              RÉSULTATS DU TRIMESTRE
            </div>
          </div>

        </div>
      </OffCanvas>

    </AppShell>
  );
}

export default BrandingPage;
