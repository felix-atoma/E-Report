import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { programsService } from '../../../services/programsService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Loading from '../../../components/common/Loading/Loading';
import './TeacherRoadmapPage.css';

function currentAcademicYear() {
  const y = new Date().getMonth() >= 8 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  return `${y}-${y + 1}`;
}

function ProgressBar({ done, total }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="roadmap__progress">
      <div className="roadmap__progress-track">
        <div className="roadmap__progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="roadmap__progress-label">{done}/{total} chapitres ({pct}%)</span>
    </div>
  );
}

function TeacherRoadmapPage() {
  const [year, setYear] = useState(currentAcademicYear);
  const [collapsed, setCollapsed] = useState({});

  const { data: roadmap = [], isLoading } = useQuery({
    queryKey: ['my-roadmap', year],
    queryFn: () => programsService.getMyRoadmap(year).then(r => r.data),
    enabled: !!year,
  });

  const byClass = roadmap.reduce((acc, item) => {
    if (!acc[item.classId]) acc[item.classId] = { className: item.className, subjects: [] };
    acc[item.classId].subjects.push(item);
    return acc;
  }, {});

  const totalSubjects  = roadmap.length;
  const withProgram    = roadmap.filter(i => i.program != null).length;
  const totalChapters  = roadmap.reduce((n, i) => n + (i.program?.chapters?.length ?? 0), 0);
  const doneChapters   = roadmap.reduce((n, i) => n + (i.program?.chapters?.filter(c => c.isCompleted).length ?? 0), 0);

  return (
    <AppShell title="Feuille de route">
      <PageHeader
        title="Feuille de route de l'année"
        subtitle="Programmes, chapitres et progression par matière"
      />

      <div className="roadmap__toolbar">
        <label className="roadmap__year-label">Année scolaire :</label>
        <input
          type="text"
          value={year}
          onChange={e => setYear(e.target.value)}
          className="roadmap__year-input"
        />
      </div>

      {isLoading ? (
        <Loading />
      ) : roadmap.length === 0 ? (
        <Card>
          <div className="roadmap__empty">
            <span>📋</span>
            <p>Aucune matière assignée pour {year}.</p>
            <p className="roadmap__empty-sub">L'administrateur doit vous assigner à des classes et matières.</p>
          </div>
        </Card>
      ) : (
        <>
          <div className="roadmap__summary">
            <div className="roadmap__summary-stat">
              <span className="roadmap__summary-val">{totalSubjects}</span>
              <span className="roadmap__summary-lbl">Matières</span>
            </div>
            <div className="roadmap__summary-stat roadmap__summary-stat--ok">
              <span className="roadmap__summary-val">{withProgram}/{totalSubjects}</span>
              <span className="roadmap__summary-lbl">Avec programme</span>
            </div>
            <div className="roadmap__summary-stat">
              <span className="roadmap__summary-val">{totalChapters}</span>
              <span className="roadmap__summary-lbl">Chapitres prévus</span>
            </div>
            <div className="roadmap__summary-stat roadmap__summary-stat--green">
              <span className="roadmap__summary-val">{doneChapters}</span>
              <span className="roadmap__summary-lbl">Terminés</span>
            </div>
          </div>

          {Object.entries(byClass).map(([classId, { className, subjects }]) => {
            const isOpen = collapsed[classId] !== true;
            return (
              <Card key={classId} className="roadmap__class-card">
                <button
                  type="button"
                  className="roadmap__class-header"
                  onClick={() => setCollapsed(c => ({ ...c, [classId]: !c[classId] }))}
                >
                  <span className="roadmap__class-icon">🏫</span>
                  <strong className="roadmap__class-name">{className}</strong>
                  <span className="roadmap__class-count">{subjects.length} matière{subjects.length > 1 ? 's' : ''}</span>
                  <span className="roadmap__chevron">{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div className="roadmap__subjects">
                    {subjects.map(item => {
                      const chapters = item.program?.chapters ?? [];
                      const done     = chapters.filter(c => c.isCompleted).length;
                      return (
                        <div key={item.subjectId} className="roadmap__subject">
                          <div className="roadmap__subject-top">
                            <div className="roadmap__subject-info">
                              <span className="roadmap__subject-name">{item.subjectName}</span>
                              <span className="roadmap__subject-code">{item.subjectCode}</span>
                            </div>
                            <Link
                              to={`/teacher/classes/${classId}/subjects/${item.subjectId}/program`}
                              className="roadmap__edit-btn"
                            >
                              {item.program ? '✏️ Modifier' : '+ Créer le programme'}
                            </Link>
                          </div>

                          {item.program ? (
                            <>
                              {item.program.description && (
                                <p className="roadmap__description">{item.program.description}</p>
                              )}
                              {chapters.length > 0 ? (
                                <>
                                  <ProgressBar done={done} total={chapters.length} />
                                  <div className="roadmap__chapters">
                                    {chapters.map(ch => (
                                      <div key={ch.id} className={`roadmap__chapter${ch.isCompleted ? ' roadmap__chapter--done' : ''}`}>
                                        <span className="roadmap__chapter-check">{ch.isCompleted ? '✅' : '○'}</span>
                                        <span className="roadmap__chapter-title">{ch.title}</span>
                                        {ch.duration != null && (
                                          <span className="roadmap__chapter-dur">{ch.duration}h</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </>
                              ) : (
                                <p className="roadmap__no-chapters">Programme sans chapitres — cliquez Modifier pour en ajouter.</p>
                              )}
                            </>
                          ) : (
                            <p className="roadmap__no-program">Aucun programme défini — cliquez pour créer.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </>
      )}
    </AppShell>
  );
}

export default TeacherRoadmapPage;
