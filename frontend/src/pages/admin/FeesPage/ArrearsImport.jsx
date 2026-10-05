import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import OffCanvas from '../../../components/common/OffCanvas/OffCanvas';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import { feesService } from '../../../services/feesService';

function currentYear() {
  const now = new Date();
  const y = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}-${y + 1}`;
}

/**
 * Lignes « matricule ; montant » collées depuis Excel (tabulation) ou un CSV (; ou ,).
 * La ligne d'en-tête et les lignes sans montant valide sont ignorées.
 */
function parseRows(text) {
  const rows = [];
  const skipped = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const cells = line.split(/\t|;|,(?=\s*[\d\s]+$)/).map((c) => c.trim());
    const admissionNumber = cells[0];
    const amount = Number(String(cells[1] ?? '').replace(/[\s ]/g, '').replace(/fcfa|xof/i, '').replace(',', '.'));
    // Montant absent : ligne ignorée (sinon elle vaudrait 0 et annulerait l'arriéré)
    if (!admissionNumber || !cells[1] || !/\d/.test(cells[1]) || !Number.isFinite(amount)) { skipped.push(line); continue; }
    rows.push({ admissionNumber, amount });
  }
  return { rows, skipped };
}

export default function ArrearsImport({ open, onClose }) {
  const qc = useQueryClient();
  const [year, setYear] = useState(currentYear());
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const { rows, skipped } = useMemo(() => parseRows(text), [text]);
  const total = rows.reduce((s, r) => s + r.amount, 0);

  const loadFile = async (file) => {
    if (!file) return;
    setText(await file.text());
    setResult(null);
  };

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const { data } = await feesService.importArrears({ academicYear: year, rows });
      setResult(data);
      qc.invalidateQueries();
    } catch (err) {
      const m = err?.response?.data?.message;
      setError(m ? [].concat(m).join(' · ') : "L'import a échoué. Réessayez.");
    } finally {
      setBusy(false);
    }
  };

  const close = () => { setText(''); setResult(null); setError(''); onClose(); };

  return (
    <OffCanvas
      open={open}
      onClose={close}
      title="Importer les soldes antérieurs (arriérés)"
      size="md"
      footer={(
        <>
          <Button variant="ghost" onClick={close} disabled={busy}>Fermer</Button>
          {!result && (
            <Button onClick={submit} disabled={busy || rows.length === 0}>
              {busy ? 'Import…' : `Importer ${rows.length} ligne(s)`}
            </Button>
          )}
        </>
      )}
    >
      <div className="arrears">
        <p className="arrears__intro">
          Reprenez ce que les familles doivent encore d'une période ou d'une année précédente.
          Chaque montant s'ajoute au solde de l'élève : il apparaît chez le parent, dans les rappels
          automatiques et dans le suivi du recouvrement. Réimporter remplace l'ancien montant ;
          un montant à 0 annule l'arriéré.
        </p>
        <Input label="Année scolaire où l'arriéré est dû" value={year} onChange={(e) => setYear(e.target.value)} />
        <label className="arrears__label" htmlFor="arrears-text">
          Matricule et montant, une ligne par élève — copiez deux colonnes depuis Excel, ou chargez un fichier CSV
        </label>
        <textarea
          id="arrears-text"
          className="arrears__text"
          rows={9}
          value={text}
          onChange={(e) => { setText(e.target.value); setResult(null); }}
          placeholder={'ECO-2026-001\t25000\nECO-2026-002\t40000\nECO-2026-007\t12500'}
        />
        <input type="file" accept=".csv,.txt" onChange={(e) => loadFile(e.target.files?.[0])} />

        {text && (
          <div className="arrears__summary">
            {rows.length} élève(s) · total {total.toLocaleString('fr-FR')} FCFA
            {skipped.length > 0 && <> · {skipped.length} ligne(s) ignorée(s) (en-tête ou montant illisible)</>}
          </div>
        )}
        {error && <div className="arrears__error">{error}</div>}
        {result && (
          <div className="arrears__result">
            ✅ {result.imported} arriéré(s) enregistré(s){result.cleared ? `, ${result.cleared} annulé(s)` : ''}.
            {result.notFound?.length > 0 && (
              <div className="arrears__notfound">
                ⚠️ Matricule(s) introuvable(s) : {result.notFound.join(', ')}
              </div>
            )}
          </div>
        )}
      </div>
    </OffCanvas>
  );
}
