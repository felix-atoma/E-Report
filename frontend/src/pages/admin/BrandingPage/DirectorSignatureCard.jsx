import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { institutionsService } from '../../../services/institutionsService';
import { useInstitution } from '../../../context/InstitutionContext';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import OffCanvas from '../../../components/common/OffCanvas/OffCanvas';
import SignaturePad from '../../../components/common/SignaturePad/SignaturePad';

const CYCLES = [
  {
    key: 'secondary', title: 'Collège / lycée', hint: '6ème à Terminale — ou toute l\'école si elle n\'a qu\'un seul cycle',
    sig: 'directorSignature', name: 'directorName', school: 'schoolNameSecondary', schoolPlaceholder: 'ex. Collège St Pierre Claver',
  },
  {
    key: 'primary', title: 'Cours primaire', hint: 'CI à CM2 — à remplir seulement si le primaire a son propre nom et son propre directeur',
    sig: 'directorSignaturePrimary', name: 'directorNamePrimary', school: 'schoolNamePrimary', schoolPlaceholder: 'ex. École St Pierre Claver',
  },
];

/**
 * Signature du directeur, enregistrée une seule fois puis imprimée automatiquement dans le cadre
 * « Le Directeur » des bulletins publiés, des relevés et des cartes d'élève. Deux cycles possibles :
 * collège / lycée et cours primaire, chacun avec le nom de l'établissement et son directeur.
 */
export default function DirectorSignatureCard({ institution }) {
  const qc = useQueryClient();
  const { refreshInstitution } = useInstitution() ?? {};
  const branding = institution?.brandingSettings ?? {};
  const [edit, setEdit] = useState(null);       // cycle en cours de modification
  const [sig, setSig] = useState(null);
  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  const [saving, setSaving] = useState(false);

  const open = (c) => { setEdit(c); setSig(null); setName(branding[c.name] ?? ''); setSchool(branding[c.school] ?? ''); };
  const save = async (payload, okMsg) => {
    setSaving(true);
    try {
      await institutionsService.updateBranding(payload);
      qc.invalidateQueries({ queryKey: ['institution-me'] });
      refreshInstitution?.();
      toast.success(okMsg);
      setEdit(null); setSig(null);
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
            « Le Directeur » des bulletins publiés, des relevés de notes et des cartes d'élève. Si le primaire et le
            collège ont chacun leur nom et leur directeur, remplissez les deux : chaque document prend celui de sa classe.
          </p>
        </div>
      </div>

      <div className="branding-cycles">
        {CYCLES.map((c) => (
          <div key={c.key} className="branding-cycle">
            <div className="branding-cycle__head">
              <div>
                <div className="branding-cycle__title">{c.title}</div>
                <div className="branding-cycle__hint">{c.hint}</div>
              </div>
              <Button size="sm" onClick={() => open(c)}>{branding[c.sig] || branding[c.name] || branding[c.school] ? 'Modifier' : 'Ajouter'}</Button>
            </div>
            <div className="branding-cycle__school">{branding[c.school] || (c.key === 'secondary' ? institution?.name : '—')}</div>
            {branding[c.sig]
              ? <img src={branding[c.sig]} alt="Signature" className="branding-dirsig__img" />
              : <div className="branding-images-preview__placeholder">Aucune signature</div>}
            {branding[c.name] && <div className="branding-dirsig__name">{branding[c.name]}</div>}
          </div>
        ))}
      </div>

      <OffCanvas
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit ? `Directeur — ${edit.title}` : ''}
        size="md"
        footer={edit && (
          <>
            {branding[edit.sig] && (
              <Button variant="ghost" disabled={saving}
                onClick={() => { if (window.confirm('Retirer cette signature des bulletins, relevés et cartes ?')) save({ [edit.sig]: '' }, 'Signature retirée.'); }}>
                Retirer la signature
              </Button>
            )}
            <Button variant="ghost" onClick={() => setEdit(null)} disabled={saving}>Annuler</Button>
            <Button disabled={saving}
              onClick={() => save({ ...(sig ? { [edit.sig]: sig } : {}), [edit.name]: name, [edit.school]: school }, 'Enregistré.')}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </>
        )}
      >
        {edit && (
          <div className="branding-section" style={{ gap: '1rem' }}>
            <label className="branding-field__label" htmlFor="cycleSchool">Nom de l'établissement imprimé</label>
            <input id="cycleSchool" className="branding-dirsig__input" value={school} placeholder={edit.schoolPlaceholder}
              onChange={(e) => setSchool(e.target.value)} />
            <label className="branding-field__label" htmlFor="cycleDirector">Nom imprimé sous la signature</label>
            <input id="cycleDirector" className="branding-dirsig__input" value={name} placeholder="ex. M. KOFFI Mensah, Directeur"
              onChange={(e) => setName(e.target.value)} />
            {branding[edit.sig] && !sig && (
              <div>
                <p className="branding-section__desc" style={{ marginBottom: '.4rem' }}>Signature actuelle :</p>
                <img src={branding[edit.sig]} alt="" className="branding-dirsig__img" />
              </div>
            )}
            <p className="branding-section__desc">
              {branding[edit.sig] ? 'Pour la remplacer, dessinez-la ou importez-la ci-dessous :' : 'Dessinez la signature ou importez-la (PNG, JPG ou PDF) :'}
            </p>
            <SignaturePad onChange={setSig} width={460} height={180} />
          </div>
        )}
      </OffCanvas>
    </Card>
  );
}
