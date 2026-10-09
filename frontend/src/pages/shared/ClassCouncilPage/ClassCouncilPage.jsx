import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { reportsService } from '../../../services/reportsService';
import { classesService } from '../../../services/classesService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Select from '../../../components/common/Select/Select';
import Input from '../../../components/common/Input/Input';
import Button from '../../../components/common/Button/Button';
import Loading from '../../../components/common/Loading/Loading';
import './ClassCouncilPage.css';

const ADMIS = 'Admis(e) en classe supérieure';
const REDOUBLE = 'Redoublant(e)';
const CHOICES = [ADMIS, REDOUBLE, 'Admis(e) sous réserve', 'Exclu(e)'];

function currentSchoolYear() {
  const d = new Date();
  const y = d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1;
  return `${y}-${y + 1}`;
}
const fmt = (v) => (v == null ? '—' : Number(v).toFixed(2).replace('.', ','));

/**
 * Conseil de classe de fin d'année : toute la classe sur un écran (moyennes des périodes, moyenne et
 * rang annuels, décision proposée modifiable), validation en une fois, puis procès-verbal imprimable.
 */
export default function ClassCouncilPage() {
  const qc = useQueryClient();
  const [classId, setClassId] = useState('');
  const [academicYear, setYear] = useState(currentSchoolYear());
  const [edits, setEdits] = useState({});       // studentId → décision saisie pendant la séance
  const [onlyBorderline, setOnlyBorderline] = useState(false);

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesService.list().then((r) => r.data),
  });

  const queryKey = ['council', classId, academicYear];
  const { data: sheet, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => reportsService.councilSheet(classId, academicYear).then((r) => r.data),
    enabled: !!classId && /^\d{4}-\d{4}$/.test(academicYear),
  });
  useEffect(() => { setEdits({}); }, [classId, academicYear]);

  const save = useMutation({
    mutationFn: (decisions) => reportsService.saveCouncil(classId, academicYear, decisions).then((r) => r.data),
    onSuccess: (res) => {
      qc.setQueryData(queryKey, res.sheet);
      setEdits({});
      const extra = [res.locked && `${res.locked} bulletin(s) déjà publié(s)`, res.missing && `${res.missing} élève(s) sans bulletin de fin d'année`].filter(Boolean).join(' · ');
      toast.success(`Conseil validé : ${res.saved} décision(s) enregistrée(s)${extra ? ` (${extra})` : ''}`);
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? "Impossible d'enregistrer le conseil"),
  });

  const isPrimary = sheet?.isPrimary;
  const denom = isPrimary ? 10 : 20;
  const scaled = (v) => (v == null ? null : isPrimary ? v / 2 : v);
  const threshold = sheet?.promotionThreshold ?? 10;
  const termLabel = (n) => `${sheet?.termType === 'SEMESTRE' ? 'S' : 'T'}${n}`;
  const decisionOf = (r) => (r.studentId in edits ? edits[r.studentId] : r.councilDecision) ?? '';

  const rows = useMemo(() => {
    const all = sheet?.rows ?? [];
    // Cas limites : moyenne annuelle à moins d'un point du seuil, ou décision différente de la proposition
    return onlyBorderline
      ? all.filter((r) => (r.annualAverage != null && Math.abs(r.annualAverage - threshold) < 1) || decisionOf(r) !== r.proposedDecision)
      : all;
  }, [sheet, onlyBorderline, edits, threshold]); // eslint-disable-line react-hooks/exhaustive-deps

  const summary = useMemo(() => {
    const counts = {};
    for (const r of sheet?.rows ?? []) {
      const d = decisionOf(r) || 'Sans décision';
      counts[d] = (counts[d] ?? 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [sheet, edits]); // eslint-disable-line react-hooks/exhaustive-deps

  const editable = (sheet?.rows ?? []).filter((r) => !r.locked && r.lastReportId);
  const lockedCount = (sheet?.rows ?? []).filter((r) => r.locked).length;
  const missingCount = (sheet?.rows ?? []).filter((r) => !r.lastReportId).length;
  const dirty = Object.keys(edits).length > 0;

  const validate = () => save.mutate(editable.map((r) => ({ studentId: r.studentId, decision: decisionOf(r) || null })));
  const resetToProposals = () => {
    const next = {};
    for (const r of editable) next[r.studentId] = r.proposedDecision ?? '';
    setEdits(next);
  };

  const classOptions = [{ value: '', label: '— Choisir une classe —' }, ...classes.map((c) => ({ value: c.id, label: c.name }))];
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <AppShell>
      <div className="no-print">
        <PageHeader
          title="Conseil de classe"
          subtitle="Fin d'année : moyennes, rang annuel et décision de chaque élève, puis procès-verbal"
        />

        <Card className="council-filters">
          <Select id="council-class" label="Classe" value={classId} options={classOptions} onChange={(e) => setClassId(e.target.value)} />
          <Input id="council-year" label="Année scolaire" value={academicYear} placeholder="2026-2027" onChange={(e) => setYear(e.target.value.trim())} />
        </Card>
      </div>

      {!classId && <p className="council-empty no-print">Choisissez une classe pour ouvrir le conseil.</p>}
      {classId && isLoading && <Loading />}
      {classId && error && <p className="council-empty no-print">{error?.response?.data?.message ?? 'Impossible de charger le conseil de cette classe.'}</p>}

      {sheet && (
        <>
          <div className="council-toolbar no-print">
            <div className="council-toolbar__info">
              {sheet.rows.length} élève(s) · seuil de passage {fmt(scaled(threshold))}/{denom}
              {sheet.weighting === 'LAST_DOUBLE' && ' · dernière période comptée double'}
              {lockedCount > 0 && ` · ${lockedCount} bulletin(s) publié(s) (décision verrouillée)`}
              {missingCount > 0 && ` · ${missingCount} élève(s) sans bulletin de fin d'année`}
            </div>
            <label className="council-toolbar__check">
              <input type="checkbox" checked={onlyBorderline} onChange={(e) => setOnlyBorderline(e.target.checked)} />
              Cas limites seulement
            </label>
            <Button variant="ghost" size="sm" onClick={resetToProposals} disabled={!editable.length}>Tout remettre aux propositions</Button>
            <Button variant="ghost" size="sm" onClick={() => window.print()}>Imprimer le procès-verbal</Button>
            <Button size="sm" onClick={validate} disabled={!editable.length || save.isPending}>
              {save.isPending ? 'Enregistrement…' : dirty ? 'Valider le conseil (modifié)' : 'Valider le conseil'}
            </Button>
          </div>

          {/* Procès-verbal : en-tête visible à l'impression uniquement */}
          <div className="council-pv-head print-only">
            {sheet.institution.logo && <img src={sheet.institution.logo} alt="" className="council-pv-head__logo" />}
            <div>
              <div className="council-pv-head__school">{sheet.institution.name}</div>
              {sheet.institution.address && <div className="council-pv-head__sub">{sheet.institution.address}</div>}
            </div>
          </div>
          <h2 className="council-pv-title print-only">
            Procès-verbal du conseil de classe — {sheet.class.name} — Année scolaire {sheet.academicYear}
          </h2>

          <div className="council-table-wrap">
            <table className="council-table">
              <thead>
                <tr>
                  <th>N°</th>
                  <th className="council-table__name">Nom et prénom</th>
                  {Array.from({ length: sheet.termCount }, (_, i) => <th key={i}>{termLabel(i + 1)}</th>)}
                  <th>Moy. annuelle</th>
                  <th>Rang</th>
                  <th className="no-print">Abs. (h)</th>
                  <th className="council-table__decision">Décision du conseil</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const decision = decisionOf(r);
                  const changed = decision !== (r.proposedDecision ?? '');
                  const failing = r.annualAverage != null && r.annualAverage < threshold;
                  return (
                    <tr key={r.studentId} className={r.locked ? 'council-row--locked' : ''}>
                      <td>{i + 1}</td>
                      <td className="council-table__name">
                        {r.name}
                        <span className="council-table__sub">{r.admissionNumber}</span>
                      </td>
                      {r.terms.map((t) => (
                        <td key={t.termNumber} className={t.published ? '' : 'council-provisional'} title={t.published ? '' : 'Bulletin non publié : moyenne calculée à partir des notes'}>
                          {fmt(scaled(t.average))}
                        </td>
                      ))}
                      <td className={`council-annual ${failing ? 'council-fail' : 'council-pass'}`}>{fmt(scaled(r.annualAverage))}</td>
                      <td>{r.annualRank ?? '—'}</td>
                      <td className="no-print">{r.absences || '—'}</td>
                      <td className="council-table__decision">
                        {r.locked || !r.lastReportId ? (
                          <span>{decision || '—'}{!r.lastReportId && <em className="council-table__sub no-print">pas de bulletin de fin d'année</em>}</span>
                        ) : (
                          <>
                            <input
                              className={`council-decision no-print ${changed ? 'council-decision--changed' : ''}`}
                              list="council-choices" value={decision} maxLength={200}
                              onChange={(e) => setEdits((prev) => ({ ...prev, [r.studentId]: e.target.value }))}
                            />
                            <span className="print-only">{decision || '—'}</span>
                            {changed && r.proposedDecision && <em className="council-table__sub no-print">proposé : {r.proposedDecision}</em>}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <datalist id="council-choices">{CHOICES.map((c) => <option key={c} value={c} />)}</datalist>
          </div>

          <div className="council-summary">
            <strong>Bilan :</strong>{' '}
            {summary.map(([d, n]) => <span key={d} className="council-summary__item">{d} : {n}</span>)}
          </div>

          {/* Signatures du procès-verbal */}
          <div className="council-pv-sign print-only">
            <div>Fait le {today}</div>
            <div className="council-pv-sign__row">
              <div><span>Le professeur principal</span><em>{sheet.class.teacher?.name ?? ''}</em></div>
              <div><span>Le chef d'établissement</span><em>&nbsp;</em></div>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
