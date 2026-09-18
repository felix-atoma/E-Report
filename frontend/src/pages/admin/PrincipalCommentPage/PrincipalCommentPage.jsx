import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { classesService } from '../../../services/classesService';
import { reportsService } from '../../../services/reportsService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Loading from '../../../components/common/Loading/Loading';
import './PrincipalCommentPage.css';

const TERMS = [
  { value: 1, label: 'Trimestre 1' },
  { value: 2, label: 'Trimestre 2' },
  { value: 3, label: 'Trimestre 3' },
];

export default function PrincipalCommentPage() {
  const { classId } = useParams();
  const qc = useQueryClient();

  const [term, setTerm] = useState(1);
  const [comments, setComments] = useState({});
  const [initialized, setInitialized] = useState(new Set());

  useEffect(() => {
    setComments({});
    setInitialized(new Set());
  }, [term]);

  const { data: cls, isLoading: clsLoading } = useQuery({
    queryKey: ['class', classId],
    queryFn: () => classesService.get(classId).then((r) => r.data),
    enabled: !!classId,
  });

  const academicYear = cls?.academicYear ?? '';

  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ['reports', classId, academicYear, term],
    queryFn: () => reportsService.list({ classId, academicYear, termNumber: term }).then((r) => r.data),
    enabled: !!classId && !!academicYear,
  });

  const students = useMemo(() => {
    return [...(cls?.students ?? [])].sort((a, b) => {
      const na = a.student?.user?.name ?? a.student?.admissionNumber ?? '';
      const nb = b.student?.user?.name ?? b.student?.admissionNumber ?? '';
      return na.localeCompare(nb, 'fr');
    });
  }, [cls]);

  const reportsByStudentId = useMemo(
    () => new Map(reports.map((r) => [r.studentId, r])),
    [reports],
  );

  students.forEach((cs) => {
    const studentId = cs.student?.id;
    if (!studentId) return;
    const key = `${studentId}-${term}`;
    if (initialized.has(key)) return;

    const rc = reportsByStudentId.get(studentId);
    setInitialized((prev) => new Set([...prev, key]));
    setComments((prev) => ({
      ...prev,
      [studentId]: rc?.principalComment ?? '',
    }));
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = students
        .map((cs) => {
          const studentId = cs.student?.id;
          const rc = reportsByStudentId.get(studentId);
          const value = comments[studentId] ?? '';
          if (!rc?.id) return null;
          if ((rc.principalComment ?? '') === value) return null;
          return reportsService.update(rc.id, { principalComment: value });
        })
        .filter(Boolean);

      if (updates.length === 0) return { count: 0 };
      await Promise.all(updates);
      return { count: updates.length };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['reports', classId, academicYear, term] });
      if (res.count === 0) {
        toast('Aucune modification a enregistrer.');
      } else {
        toast.success(`${res.count} appreciation(s) enregistree(s).`);
      }
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur lors de l enregistrement'),
  });

  const missingReportCount = useMemo(
    () => students.filter((cs) => !reportsByStudentId.get(cs.student?.id)?.id).length,
    [students, reportsByStudentId],
  );

  if (clsLoading) return <Loading />;

  return (
    <AppShell>
      <PageHeader
        title="Appreciation du Directeur"
        subtitle={cls ? `${cls.name} - ${academicYear}` : ''}
      />

      <div className="pc__toolbar">
        <label htmlFor="pc-term">Trimestre :</label>
        <select id="pc-term" value={term} onChange={(e) => setTerm(Number(e.target.value))}>
          {TERMS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <button
          className="pc__save-btn"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || reportsLoading}
        >
          {saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>

      {missingReportCount > 0 && (
        <div className="pc__notice">
          {missingReportCount} eleve(s) n'ont pas encore de bulletin cree pour ce trimestre -
          leur appreciation ne pourra etre enregistree qu'une fois le bulletin genere.
        </div>
      )}

      {reportsLoading ? (
        <Loading />
      ) : (
        <div className="pc__table-wrap">
          <table className="pc__table">
            <thead>
              <tr>
                <th>Eleve</th>
                <th>Appreciation du Directeur</th>
              </tr>
            </thead>
            <tbody>
              {students.map((cs) => {
                const studentId = cs.student?.id;
                const rc = reportsByStudentId.get(studentId);
                const hasReport = !!rc?.id;
                return (
                  <tr key={studentId} className={!hasReport ? 'pc__row--disabled' : ''}>
                    <td>{cs.student?.user?.name ?? cs.student?.admissionNumber}</td>
                    <td>
                      <input
                        type="text"
                        className="pc__comment-input"
                        placeholder={hasReport ? 'Appreciation...' : 'Bulletin non cree'}
                        value={comments[studentId] ?? ''}
                        disabled={!hasReport}
                        onChange={(e) =>
                          setComments((prev) => ({ ...prev, [studentId]: e.target.value }))
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
