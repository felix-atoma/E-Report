import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { useInstitution } from '../../../context/InstitutionContext';
import { reportsService } from '../../../services/reportsService';
import { classesService } from '../../../services/classesService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Select from '../../../components/common/Select/Select';
import Button from '../../../components/common/Button/Button';
import './ClassPalmaresPage.css';

const MEDALS = ['🥇', '🥈', '🥉'];

const MENTION_CFG = {
  'Excellent':    { color: '#7c3aed', bg: '#ede9fe' },
  'Très Bien':    { color: '#1d4ed8', bg: '#dbeafe' },
  'Bien':         { color: '#15803d', bg: '#dcfce7' },
  'Assez Bien':   { color: '#a16207', bg: '#fef3c7' },
  'Passable':     { color: '#b45309', bg: '#ffedd5' },
  'Insuffisant':  { color: '#b91c1c', bg: '#fee2e2' },
};

function MentionBadge({ mention }) {
  const cfg = MENTION_CFG[mention];
  if (!cfg) return <span>{mention ?? '—'}</span>;
  return (
    <span className="pal-mention" style={{ color: cfg.color, background: cfg.bg }}>
      {mention}
    </span>
  );
}

export default function ClassPalmaresPage() {
  const { user } = useAuth();
  const { institution } = useInstitution();
  const isAdmin = user?.role === 'ADMIN';

  const currentYear = institution?.academicSettings?.currentYear ?? '';

  const [classId, setClassId]       = useState('');
  const [academicYear, setYear]     = useState(currentYear);
  const [termName, setTerm]         = useState('');

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesService.list().then((r) => r.data),
  });

  const { data: allReports = [], isLoading, isFetching } = useQuery({
    queryKey: ['palmares', classId, academicYear, termName],
    queryFn: () =>
      reportsService.palmares({
        classId:      classId      || undefined,
        academicYear: academicYear || undefined,
        termName:     termName     || undefined,
        status:       'PUBLISHED',
      }).then((r) => r.data),
    enabled: !!(classId && academicYear),
  });

  // Derive available terms from loaded reports
  const terms = useMemo(() => {
    const s = new Set(allReports.map((r) => r.termName).filter(Boolean));
    return [...s].sort();
  }, [allReports]);

  // Filter to selected term if set, then sort by classRank
  const ranked = useMemo(() => {
    let list = allReports;
    if (termName) list = list.filter((r) => r.termName === termName);
    return [...list]
      .filter((r) => r.classRank != null)
      .sort((a, b) => a.classRank - b.classRank);
  }, [allReports, termName]);

  const classOptions  = classes.map((c) => ({ value: c.id, label: c.name }));
  const selectedClass = classes.find((c) => c.id === classId);

  function printPalmares() {
    const rows = ranked.map((r, i) => {
      const name = r.student?.user?.name ?? r.student?.admissionNumber ?? '—';
      const avg  = r.overallAverage != null ? Number(r.overallAverage).toFixed(2).replace('.', ',') : '—';
      const medal = i < 3 ? MEDALS[i] : '';
      return `<tr class="${i < 3 ? 'top3' : ''}">
        <td class="rank">${r.classRank}${medal}</td>
        <td>${name}</td>
        <td class="avg">${avg} / 20</td>
        <td>${r.mention ?? '—'}</td>
      </tr>`;
    }).join('');

    const schoolName = institution?.name ?? 'Établissement';
    const title = `Palmarès — ${selectedClass?.name ?? ''} — ${termName || academicYear}`;

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>${title}</title>
<style>
  body{font-family:Arial,sans-serif;margin:0;padding:24px;font-size:12px}
  h1{text-align:center;font-size:16px;color:#1e2a78;margin-bottom:4px}
  h2{text-align:center;font-size:12px;font-weight:normal;color:#6b7280;margin-bottom:20px}
  table{width:100%;border-collapse:collapse}
  th{background:#1e2a78;color:#fff;padding:8px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px}
  td{padding:7px 8px;border-bottom:1px solid #f3f4f6}
  tr.top3 td{background:#fffbf0;font-weight:700}
  .rank{font-weight:800;color:#1e2a78;width:50px}
  .avg{font-weight:700;color:#1e2a78}
  @media print{body{padding:0}}
</style></head><body>
<h1>${schoolName}</h1>
<h2>${title}</h2>
<table><thead><tr><th>Rang</th><th>Élève</th><th>Moyenne</th><th>Mention</th></tr></thead>
<tbody>${rows}</tbody></table>
<script>window.onload=function(){window.print();window.close();}<\/script>
</body></html>`;

    const w = window.open('', '_blank', 'width=700,height=900');
    w.document.write(html);
    w.document.close();
  }

  return (
    <AppShell>
      <PageHeader
        title="Palmarès de la Classe"
        subtitle={
          ranked.length > 0
            ? `${ranked.length} élève${ranked.length !== 1 ? 's' : ''} classé${ranked.length !== 1 ? 's' : ''} — ${selectedClass?.name ?? ''}`
            : 'Sélectionnez une classe et une année pour afficher le classement'
        }
        actions={
          ranked.length > 0 && (
            <Button size="sm" onClick={printPalmares}>🖨️ Imprimer le palmarès</Button>
          )
        }
      />

      {/* Filters */}
      <Card className="pal-filters">
        <div className="pal-filters__row">
          <Select
            id="pal-class"
            label="Classe"
            value={classId}
            placeholder="Sélectionner une classe"
            options={classOptions}
            onChange={(e) => { setClassId(e.target.value); setTerm(''); }}
          />
          <div className="form-field">
            <label className="form-field__label">Année scolaire</label>
            <input
              className="pal-filters__input"
              value={academicYear}
              onChange={(e) => setYear(e.target.value)}
              placeholder="ex : 2024-2025"
            />
          </div>
          {terms.length > 0 && (
            <Select
              id="pal-term"
              label="Trimestre / Période"
              value={termName}
              placeholder="Tous les trimestres"
              options={terms.map((t) => ({ value: t, label: t }))}
              onChange={(e) => setTerm(e.target.value)}
            />
          )}
        </div>
      </Card>

      {/* Results */}
      {!classId || !academicYear ? (
        <Card>
          <div className="pal-empty">
            <span className="pal-empty__icon">🏆</span>
            <p>Sélectionnez une classe et une année scolaire pour afficher le palmarès.</p>
          </div>
        </Card>
      ) : isLoading || isFetching ? (
        <Card><div className="pal-empty"><p>Chargement…</p></div></Card>
      ) : ranked.length === 0 ? (
        <Card>
          <div className="pal-empty">
            <span className="pal-empty__icon">📋</span>
            <p>Aucun bulletin publié trouvé pour cette sélection.</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Podium — top 3 */}
          <div className="pal-podium">
            {ranked.slice(0, 3).map((r, i) => {
              const name = r.student?.user?.name ?? r.student?.admissionNumber ?? '—';
              const avg  = r.overallAverage != null ? Number(r.overallAverage).toFixed(2).replace('.', ',') : '—';
              return (
                <div key={r.id} className={`pal-podium__card pal-podium__card--${i + 1}`}>
                  <div className="pal-podium__medal">{MEDALS[i]}</div>
                  <div className="pal-podium__rank">{i + 1}er rang</div>
                  <div className="pal-podium__name">{name}</div>
                  <div className="pal-podium__avg">{avg} / 20</div>
                  <MentionBadge mention={r.mention} />
                </div>
              );
            })}
          </div>

          {/* Full ranking table */}
          <Card style={{ padding: 0 }}>
            <table className="pal-table">
              <thead>
                <tr>
                  <th>Rang</th>
                  <th>Élève</th>
                  <th>Moyenne</th>
                  <th>Mention</th>
                  <th>Absences</th>
                  <th>Conseil d'honneur</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((r, i) => {
                  const name = r.student?.user?.name ?? r.student?.admissionNumber ?? '—';
                  const avg  = r.overallAverage != null ? Number(r.overallAverage).toFixed(2).replace('.', ',') : '—';
                  return (
                    <tr key={r.id} className={i < 3 ? 'pal-table__row--top3' : ''}>
                      <td className="pal-table__rank">
                        {i < 3 ? MEDALS[i] : ''} {r.classRank}
                      </td>
                      <td className="pal-table__name">{name}</td>
                      <td className="pal-table__avg">{avg} / 20</td>
                      <td><MentionBadge mention={r.mention} /></td>
                      <td className="pal-table__muted">
                        {r.attendanceAbsent != null ? r.attendanceAbsent : '—'}
                      </td>
                      <td>
                        {r.honorCouncil
                          ? <span className="pal-table__honor">⭐ Oui</span>
                          : <span className="pal-table__muted">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </AppShell>
  );
}
