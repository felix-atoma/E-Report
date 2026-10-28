import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { institutionsService } from '../../../services/institutionsService';
import { useInstitution } from '../../../context/InstitutionContext';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import OffCanvas from '../../../components/common/OffCanvas/OffCanvas';
import SignaturePad from '../../../components/common/SignaturePad/SignaturePad';

/**
 * Signature du directeur : dessinée ou importée une seule fois, puis imprimée automatiquement dans le
 * cadre « Le Directeur » des bulletins publiés, des relevés de notes et des cartes d'élève.
 */
export default function DirectorSignatureCard({ institution }) {
  const qc = useQueryClient();
  const { refreshInstitution } = useInstitution() ?? {};
  const branding = institution?.brandingSettings ?? {};
  const current = branding.directorSignature || null;
  const [open, setOpen] = useState(false);
  const [sig, setSig] = useState(null);
  const [name, setName] = useState(branding.directorName ?? '');
  const [saving, setSaving] = useState(false);

  const save = async (payload, okMsg) => {
    setSaving(true);
    try {
      await institutionsService.updateBranding(payload);
      qc.invalidateQueries({ queryKey: ['institution-me'] });
      refreshInstitution?.();
      toast.success(okMsg);
      setOpen(false); setSig(null);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "L'enregistrement a échoué.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="branding-section">
      <div className="branding-section__header">
        <div>
          <h3 className="branding-section__title">Signature du directeur</h3>
          <p className="branding-section__desc">
            Signez (ou importez votre signature) une seule fois : elle apparaît ensuite automatiquement dans le cadre
            « Le Directeur » des bulletins publiés, des relevés de notes et des cartes d'élève.
          </p>
        </div>
        <Button size="sm" onClick={() => { setName(branding.directorName ?? ''); setOpen(true); }}>
          {current ? 'Modifier' : 'Ajouter la signature'}
        </Button>
      </div>
      <div className="branding-dirsig">
        {current
          ? <img src={current} alt="Signature du directeur" className="branding-dirsig__img" />
          : <div className="branding-images-preview__placeholder">Aucune signature</div>}
        {branding.directorName && <div className="branding-dirsig__name">{branding.directorName}</div>}
      </div>

      <OffCanvas
        open={open}
        onClose={() => setOpen(false)}
        title="Signature du directeur"
        size="md"
        footer={
          <>
            {current && (
              <Button variant="ghost" disabled={saving}
                onClick={() => { if (window.confirm('Retirer la signature du directeur des bulletins et relevés ?')) save({ directorSignature: '' }, 'Signature retirée.'); }}>
                Retirer
              </Button>
            )}
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Annuler</Button>
            <Button disabled={saving || (!sig && name === (branding.directorName ?? ''))}
              onClick={() => save({ ...(sig ? { directorSignature: sig } : {}), directorName: name }, 'Signature du directeur enregistrée.')}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </>
        }
      >
        <div className="branding-section" style={{ gap: '1rem' }}>
          <label className="branding-field__label" htmlFor="directorName">Nom imprimé sous la signature</label>
          <input id="directorName" className="branding-dirsig__input" value={name} placeholder="ex. M. KOFFI Mensah, Directeur"
            onChange={(e) => setName(e.target.value)} />
          {current && !sig && (
            <div>
              <p className="branding-section__desc" style={{ marginBottom: '.4rem' }}>Signature actuelle :</p>
              <img src={current} alt="" className="branding-dirsig__img" />
            </div>
          )}
          <p className="branding-section__desc">
            {current ? 'Pour la remplacer, dessinez-la ou importez-la ci-dessous :' : 'Dessinez votre signature ou importez-la (PNG, JPG ou PDF) :'}
          </p>
          <SignaturePad onChange={setSig} width={460} height={180} />
        </div>
      </OffCanvas>
    </Card>
  );
}
