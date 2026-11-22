import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import OffCanvas from '../../../components/common/OffCanvas/OffCanvas';
import { useAuth } from '../../../context/AuthContext';
import { aiService } from '../../../services/aiService';
import { assistedCorrectionStore, gradeResponse } from '../../../utils/assistedCorrection';
import './AssistedCorrectionPage.css';

const blankQuestion = (index = 1) => ({
  id: crypto.randomUUID(),
  prompt: `Question ${index}`,
  type: 'short',
  points: 1,
  answer: '',
  alternatives: '',
  keywords: '',
  options: '',
  criteriaText: 'Compréhension|1',
});

function parseCriteria(text, maxPoints) {
  const criteria = text
    .split('\n')
    .map((line) => {
      const separator = line.lastIndexOf('|');
      if (separator < 1) return null;
      return { label: line.slice(0, separator).trim(), points: Number(line.slice(separator + 1).trim()) };
    })
    .filter((criterion) => criterion?.label && Number.isFinite(criterion.points) && criterion.points > 0);
  return criteria.length && Math.abs(criteria.reduce((sum, criterion) => sum + criterion.points, 0) - maxPoints) < 0.001
    ? criteria
    : null;
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(reader.error || new Error('Lecture du fichier impossible.'));
    reader.readAsDataURL(file);
  });
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function exportResults(assessment, submissions) {
  const rows = [['Élève', 'Note', 'Barème', 'État', 'Source']];
  submissions.forEach((submission) => rows.push([
    submission.studentName,
    submission.totalScore,
    assessment.questions.reduce((sum, question) => sum + Number(question.points), 0),
    submission.validated ? 'Validée' : 'À relire',
    submission.answers.map((answer) => answer?.source || 'enseignant').join(' / '),
  ]));
  const blob = new Blob([`\uFEFF${rows.map((row) => row.map(csvCell).join(';')).join('\n')}`], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${assessment.title.replace(/[^\p{L}\p{N}-]+/gu, '-')}-notes.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function AssistedCorrectionPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const ownerId = user?.id || user?.userId;
  const [assessments, setAssessments] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [showCreator, setShowCreator] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    title: '',
    className: '',
    subject: '',
    aiCallLimit: 20,
    questions: [blankQuestion()],
  });
  const [studentName, setStudentName] = useState('');
  const [answers, setAnswers] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [busyQuestionId, setBusyQuestionId] = useState('');

  const activeAssessment = assessments.find((assessment) => assessment.id === selectedId);
  const maxScore = useMemo(
    () => activeAssessment?.questions.reduce((sum, question) => sum + Number(question.points), 0) || 0,
    [activeAssessment],
  );
  const stats = useMemo(() => {
    const scored = submissions.filter((submission) => submission.totalScore !== null);
    return {
      validated: submissions.filter((submission) => submission.validated).length,
      average: scored.length
        ? (scored.reduce((sum, submission) => sum + submission.totalScore, 0) / scored.length).toFixed(1)
        : '—',
    };
  }, [submissions]);

  const loadAssessments = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);
    try {
      const saved = await assistedCorrectionStore.listAssessments(ownerId);
      setAssessments(saved.sort((a, b) => b.createdAt - a.createdAt));
      setSelectedId((current) => saved.some((assessment) => assessment.id === current) ? current : saved[0]?.id || '');
    } catch (error) {
      toast.error(error.message || 'Impossible de charger les évaluations locales.');
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => { loadAssessments(); }, [loadAssessments]);

  useEffect(() => {
    if (!ownerId || !selectedId) {
      setSubmissions([]);
      return;
    }
    assistedCorrectionStore.listSubmissions(ownerId, selectedId)
      .then((rows) => setSubmissions(rows.sort((a, b) => b.updatedAt - a.updatedAt)))
      .catch((error) => toast.error(error.message || 'Impossible de charger les copies.'));
    setShowCorrection(false);
    setEditingId(null);
    setAnswers({});
    setStudentName('');
  }, [ownerId, selectedId]);

  const updateQuestion = (questionId, key, value) => {
    setDraft((current) => ({
      ...current,
      questions: current.questions.map((question) => question.id === questionId ? { ...question, [key]: value } : question),
    }));
  };

  const createAssessment = async (event) => {
    event.preventDefault();
    const validQuestions = draft.questions.filter((question) => question.prompt.trim() && Number(question.points) > 0);
    if (!draft.title.trim() || !draft.className.trim() || !draft.subject.trim() || validQuestions.length !== draft.questions.length) {
      toast.error('Complétez le titre, la classe, la matière et chaque question avec un barème positif.');
      return;
    }
    if (validQuestions.some((question) =>
      question.type === 'written' && !parseCriteria(question.criteriaText, Number(question.points)),
    )) {
      toast.error('Pour chaque réponse rédigée, les critères doivent être renseignés au format libellé|points et totaliser exactement le barème.');
      return;
    }
    const assessment = {
      ...draft,
      id: crypto.randomUUID(),
      ownerId,
      questions: validQuestions.map((question) => ({
        ...question,
        points: Number(question.points),
        criteria: question.type === 'written' ? parseCriteria(question.criteriaText, Number(question.points)) : [],
      })),
      aiCallsUsed: 0,
      createdAt: Date.now(),
    };
    try {
      await assistedCorrectionStore.saveAssessment(assessment);
      setAssessments((current) => [assessment, ...current]);
      setSelectedId(assessment.id);
      setShowCreator(false);
      setDraft({ title: '', className: '', subject: '', aiCallLimit: 20, questions: [blankQuestion()] });
      toast.success('Évaluation enregistrée sur cet appareil.');
    } catch (error) {
      toast.error(error.message || 'Impossible d’enregistrer cette évaluation.');
    }
  };

  const startNewSubmission = () => {
    setEditingId(null);
    setStudentName('');
    setAnswers({});
    setShowCorrection(true);
  };

  const editSubmission = (submission) => {
    setEditingId(submission.id);
    setStudentName(submission.studentName);
    setAnswers(Object.fromEntries(activeAssessment.questions.map((question) => [
      question.id,
      submission.answers.find((answer) => answer?.questionId === question.id) || { text: '' },
    ])));
    setShowCorrection(true);
  };

  const updateAnswerText = (question, text) => {
    const suggestion = gradeResponse(question, text);
    setAnswers((current) => ({
      ...current,
      [question.id]: {
        ...current[question.id],
        questionId: question.id,
        text,
        ...(suggestion ? {
          score: suggestion.score,
          source: suggestion.source,
          feedback: suggestion.feedback,
          needsReview: suggestion.needsReview,
        } : { score: null, source: null, feedback: '', needsReview: true }),
      },
    }));
  };

  const updateAnswerScore = (question, score) => {
    const numericScore = score === '' ? null : Number(score);
    setAnswers((current) => ({
      ...current,
      [question.id]: {
        ...current[question.id],
        questionId: question.id,
        score: numericScore === null ? null : Math.max(0, Math.min(Number(question.points), numericScore)),
        source: 'teacher',
        needsReview: true,
      },
    }));
  };

  const attachAnswerImage = async (question, file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      toast.error('Choisissez une image JPG, PNG ou WebP de 2 Mo maximum, cadrée sur la réponse.');
      return;
    }
    try {
      const imageBase64 = await toBase64(file);
      setAnswers((current) => ({
        ...current,
        [question.id]: {
          ...current[question.id],
          questionId: question.id,
          imageBase64,
          imageMime: file.type,
          imageName: file.name,
        },
      }));
    } catch (error) {
      toast.error(error.message || 'Impossible de lire cette image.');
    }
  };

  const requestAiSuggestion = async (question) => {
    const answer = answers[question.id];
    if (!answer?.text?.trim() && !answer?.imageBase64) {
      toast.error('Saisissez une réponse ou ajoutez une image recadrée de cette seule réponse.');
      return;
    }
    if (activeAssessment.aiCallsUsed >= activeAssessment.aiCallLimit) {
      toast.error('Le plafond d’appels IA de cette évaluation est atteint.');
      return;
    }
    setBusyQuestionId(question.id);
    try {
      const updatedAssessment = await assistedCorrectionStore.reserveAiCall(ownerId, activeAssessment.id);
      if (!updatedAssessment) {
        toast.error('Le plafond d’appels IA est atteint pour cette évaluation.');
        return;
      }
      setAssessments((current) => current.map((assessment) =>
        assessment.id === updatedAssessment.id ? updatedAssessment : assessment,
      ));
      const response = await aiService.assistedCorrection({
        question: question.prompt,
        maxPoints: question.points,
        criteria: question.criteria?.length ? question.criteria : [{ label: 'Réponse attendue', points: question.points }],
        expectedAnswer: question.answer,
        acceptedVariants: question.alternatives,
        responseText: answer.text,
        imageMime: answer.imageMime,
        imageBase64: answer.imageBase64,
      });
      const suggestion = response.data;
      if (suggestion.confidence < 0.65) {
        setAnswers((current) => ({
          ...current,
          [question.id]: {
            ...current[question.id],
            score: suggestion.score,
            source: 'ai',
            feedback: suggestion.feedback,
            transcription: suggestion.transcription,
            confidence: suggestion.confidence,
            needsReview: true,
          },
        }));
        toast('Confiance faible : cette réponse est à relire en priorité.', { icon: '⚠️' });
        return;
      }
      setAnswers((current) => ({
        ...current,
        [question.id]: {
          ...current[question.id],
          score: suggestion.score,
          source: 'ai',
          feedback: suggestion.feedback,
          transcription: suggestion.transcription,
          confidence: suggestion.confidence,
          needsReview: true,
        },
      }));
      toast.success(`Proposition IA reçue${suggestion.confidence < 0.65 ? ' — confiance faible, relecture prioritaire' : ''}.`);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'La correction IA a échoué. Le mode local reste disponible.');
    } finally {
      setBusyQuestionId('');
    }
  };

  const saveSubmission = async (event, validated = false) => {
    event.preventDefault();
    if (!studentName.trim()) {
      toast.error('Indiquez le nom de l’élève pour retrouver sa copie.');
      return;
    }
    if (validated && activeAssessment.questions.some((question) => answers[question.id]?.score == null)) {
      toast.error('Attribuez une note à chaque question avant de valider la copie.');
      return;
    }
    const totalScore = activeAssessment.questions.reduce((sum, question) =>
      sum + (Number(answers[question.id]?.score) || 0), 0);
    const submission = {
      id: editingId || crypto.randomUUID(),
      ownerId,
      assessmentId: activeAssessment.id,
      studentName: studentName.trim(),
      answers: activeAssessment.questions.map((question) => ({
        questionId: question.id,
        text: answers[question.id]?.text || '',
        imageBase64: answers[question.id]?.imageBase64 || '',
        imageMime: answers[question.id]?.imageMime || '',
        score: answers[question.id]?.score ?? null,
        source: answers[question.id]?.source || 'teacher',
        feedback: answers[question.id]?.feedback || '',
        transcription: answers[question.id]?.transcription || '',
        confidence: answers[question.id]?.confidence ?? null,
        needsReview: answers[question.id]?.needsReview ?? true,
      })),
      totalScore: Math.round(totalScore * 100) / 100,
      validated,
      updatedAt: Date.now(),
    };
    setSaving(true);
    try {
      await assistedCorrectionStore.saveSubmission(submission);
      setSubmissions((current) => [submission, ...current.filter((item) => item.id !== submission.id)]);
      setShowCorrection(false);
      setEditingId(null);
      toast.success(validated ? 'Note validée et enregistrée localement.' : 'Copie enregistrée ; elle reste à relire.');
    } catch (error) {
      toast.error(error.message || 'Impossible d’enregistrer cette copie.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title={t('nav.assistedCorrection')}>
      <div className="ac-page">
        <PageHeader
          title="Correction assistée"
          subtitle="Un noyau local pour les réponses objectives, l’IA en renfort pour les réponses rédigées."
          actions={(
            <button type="button" className="ac-button ac-button--primary" onClick={() => setShowCreator((value) => !value)}>
              {showCreator ? 'Fermer' : '+ Préparer une évaluation'}
            </button>
          )}
        />

        <div className="ac-privacy">
          <strong>Vos notes restent sur cet appareil.</strong>
          <span>Seule la réponse choisie est envoyée à l’IA, sans nom d’élève. Toute proposition doit être vérifiée par l’enseignant.</span>
        </div>

        {showCreator && (
          <OffCanvas
            open
            onClose={() => setShowCreator(false)}
            title="Préparer une évaluation"
            subtitle="1 / Préparation du corrigé, du barème et des critères"
            size="lg"
          >
          <form className="ac-creator" onSubmit={createAssessment}>
            <div className="ac-section-heading">
              <div><h2>Préparer le corrigé et le barème</h2><p>Ajoutez les réponses acceptées et les critères avant de commencer.</p></div>
              <span className="ac-step">1 / Préparation</span>
            </div>
            <div className="ac-fields ac-fields--three">
              <label>Titre de l’évaluation<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required placeholder="Ex. Devoir de mathématiques" /></label>
              <label>Classe<input value={draft.className} onChange={(event) => setDraft({ ...draft, className: event.target.value })} required placeholder="Ex. 3e A" /></label>
              <label>Matière<input value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} required placeholder="Ex. Mathématiques" /></label>
            </div>
            <label className="ac-limit">Plafond d’appels IA pour cette évaluation
              <input type="number" min="0" max="500" value={draft.aiCallLimit} onChange={(event) => setDraft({ ...draft, aiCallLimit: Math.max(0, Math.min(500, Number(event.target.value))) })} />
              <small>Chaque demande est comptée, même si le service échoue. Le tarif dépend du fournisseur configuré.</small>
            </label>

            <div className="ac-question-list">
              {draft.questions.map((question, index) => (
                <section className="ac-question-editor" key={question.id}>
                  <div className="ac-question-editor__top"><strong>Question {index + 1}</strong>
                    <button type="button" className="ac-link-button" disabled={draft.questions.length === 1} onClick={() => setDraft({ ...draft, questions: draft.questions.filter((item) => item.id !== question.id) })}>Supprimer</button>
                  </div>
                  <div className="ac-fields">
                    <label className="ac-field--wide">Énoncé<input value={question.prompt} onChange={(event) => updateQuestion(question.id, 'prompt', event.target.value)} required /></label>
                    <label>Type
                      <select value={question.type} onChange={(event) => updateQuestion(question.id, 'type', event.target.value)}>
                        <option value="short">Réponse courte (locale)</option>
                        <option value="qcm">QCM / vrai-faux (local)</option>
                        <option value="written">Réponse rédigée (IA / mots-clés)</option>
                      </select>
                    </label>
                    <label>Points<input type="number" min="0.1" max="100" step="0.1" value={question.points} onChange={(event) => updateQuestion(question.id, 'points', event.target.value)} required /></label>
                  </div>
                  {question.type === 'qcm' && <label>Choix proposés (un par ligne)<textarea value={question.options} onChange={(event) => updateQuestion(question.id, 'options', event.target.value)} rows="3" placeholder={'A. ...\nB. ...\nC. ...'} /></label>}
                  <div className="ac-fields">
                    <label>Réponse attendue<input value={question.answer} onChange={(event) => updateQuestion(question.id, 'answer', event.target.value)} placeholder="Réponse exacte ou choix correct" /></label>
                    <label>Variantes acceptées<input value={question.alternatives} onChange={(event) => updateQuestion(question.id, 'alternatives', event.target.value)} placeholder="Séparées par des virgules ou retours à la ligne" /></label>
                  </div>
                  {question.type === 'written' && (
                    <label>Critères (un par ligne : libellé|points)
                      <textarea value={question.criteriaText} onChange={(event) => updateQuestion(question.id, 'criteriaText', event.target.value)} rows="3" placeholder={'Idée principale|2\nJustification|2'} />
                      <small>Mots-clés de secours, séparés par des virgules (indication à relire)</small>
                      <input value={question.keywords} onChange={(event) => updateQuestion(question.id, 'keywords', event.target.value)} placeholder="Ex. photosynthèse, lumière, chlorophylle" />
                    </label>
                  )}
                </section>
              ))}
            </div>
            <div className="ac-form-actions">
              <button type="button" className="ac-button ac-button--secondary" onClick={() => setDraft({ ...draft, questions: [...draft.questions, blankQuestion(draft.questions.length + 1)] })}>+ Ajouter une question</button>
              <button type="submit" className="ac-button ac-button--primary">Enregistrer le corrigé sur cet appareil</button>
            </div>
          </form>
          </OffCanvas>
        )}

        {loading ? <div className="ac-empty">Chargement des évaluations locales…</div> : assessments.length === 0 ? (
          <div className="ac-card ac-empty"><div className="ac-empty__icon">✓</div><h2>Préparez votre première évaluation</h2><p>Le corrigé et les copies seront enregistrés localement et resteront accessibles hors connexion sur cet appareil.</p>
            {!showCreator && <button className="ac-button ac-button--primary" onClick={() => setShowCreator(true)}>Créer une évaluation</button>}
          </div>
        ) : (
          <>
            <div className="ac-toolbar">
              <label>Évaluation
                <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
                  {assessments.map((assessment) => <option key={assessment.id} value={assessment.id}>{assessment.title} · {assessment.className}</option>)}
                </select>
              </label>
              {activeAssessment && <div className="ac-toolbar__meta"><span>{activeAssessment.subject}</span><span>{activeAssessment.questions.length} question(s)</span><span>Barème : {maxScore} pts</span></div>}
            </div>

            {activeAssessment && (
              <>
                <div className="ac-stats">
                  <div className="ac-stat"><span>Copies enregistrées</span><strong>{submissions.length}</strong></div>
                  <div className="ac-stat"><span>Notes validées</span><strong>{stats.validated}</strong></div>
                  <div className="ac-stat"><span>Moyenne provisoire</span><strong>{stats.average}{stats.average !== '—' ? ` / ${maxScore}` : ''}</strong></div>
                  <div className="ac-stat"><span>Appels IA utilisés</span><strong>{activeAssessment.aiCallsUsed} / {activeAssessment.aiCallLimit}</strong></div>
                </div>

                <div className="ac-workspace">
                  <section className="ac-card ac-copies">
                    <div className="ac-section-heading"><div><h2>Copies</h2><p>Les réponses sont corrigées localement dès la saisie.</p></div>
                      <button className="ac-button ac-button--primary" onClick={startNewSubmission}>+ Nouvelle copie</button>
                    </div>
                    {submissions.length === 0 ? <p className="ac-list-empty">Aucune copie pour cette évaluation.</p> : (
                      <div className="ac-submission-list">
                        {submissions.map((submission) => (
                          <button key={submission.id} className={`ac-submission${submission.validated ? ' ac-submission--validated' : ''}`} onClick={() => editSubmission(submission)}>
                            <span className="ac-submission__name">{submission.studentName}</span>
                            <span className="ac-submission__score">{submission.totalScore} / {maxScore}</span>
                            <span className="ac-submission__status">{submission.validated ? 'Validée' : 'À relire'}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {submissions.length > 0 && <button className="ac-export" onClick={() => exportResults(activeAssessment, submissions)}>Exporter les résultats CSV</button>}
                  </section>

                  {showCorrection && (
                    <OffCanvas
                      open
                      onClose={() => setShowCorrection(false)}
                      title={editingId ? 'Relire la copie' : 'Saisir une copie'}
                      subtitle="Les notes proposées restent modifiables avant validation"
                      size="xl"
                    >
                    <form className="ac-correction" onSubmit={(event) => saveSubmission(event, false)}>
                      <label>Nom de l’élève (conservé uniquement sur cet appareil)
                        <input value={studentName} onChange={(event) => setStudentName(event.target.value)} required placeholder="Nom et prénom" />
                      </label>
                      {activeAssessment.questions.map((question, index) => {
                        const answer = answers[question.id] || {};
                        return (
                          <div className="ac-answer" key={question.id}>
                            <div className="ac-answer__heading"><strong>Q{index + 1}. {question.prompt}</strong><span>{question.points} pt(s)</span></div>
                            {question.type === 'qcm' && question.options?.trim() ? (
                              <fieldset className="ac-qcm-options">
                                <legend>Choisissez une réponse</legend>
                                {question.options.split('\n').filter((option) => option.trim()).map((option) => (
                                  <label key={option} className="ac-qcm-option">
                                    <input
                                      type="radio"
                                      name={`answer-${question.id}`}
                                      value={option.trim()}
                                      checked={answer.text === option.trim()}
                                      onChange={() => updateAnswerText(question, option.trim())}
                                    />
                                    <span>{option.trim()}</span>
                                  </label>
                                ))}
                              </fieldset>
                            ) : (
                              <label>Réponse de l’élève
                                <textarea value={answer.text || ''} onChange={(event) => updateAnswerText(question, event.target.value)} rows={question.type === 'written' ? 4 : 2} />
                              </label>
                            )}
                            {question.type === 'written' && (
                              <div className="ac-ai-actions">
                                <label className="ac-image-upload">Ajouter une photo cadrée de cette réponse
                                  <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => attachAnswerImage(question, event.target.files?.[0])} />
                                </label>
                                {answer.imageName && <span className="ac-file-name">{answer.imageName}</span>}
                                <button type="button" className="ac-button ac-button--ai" disabled={busyQuestionId === question.id || activeAssessment.aiCallsUsed >= activeAssessment.aiCallLimit} onClick={() => requestAiSuggestion(question)}>
                                  {busyQuestionId === question.id ? 'Évaluation IA…' : 'Proposer une note IA'}
                                </button>
                                <small>Seule cette réponse recadrée (et son barème) sera envoyée au service d’IA configuré.</small>
                              </div>
                            )}
                            {answer.transcription && <div className="ac-transcription"><strong>Lecture proposée :</strong> {answer.transcription}</div>}
                            <div className="ac-score-row">
                              <label>Note proposée / modifiée<input type="number" min="0" max={question.points} step="0.1" value={answer.score ?? ''} onChange={(event) => updateAnswerScore(question, event.target.value)} /></label>
                              <span className={`ac-source ac-source--${answer.source || 'none'}`}>{answer.source === 'ai' ? 'Proposition IA' : answer.source === 'local' ? 'Noyau local' : answer.source === 'teacher' ? 'Enseignant' : 'À corriger'}</span>
                              {answer.confidence != null && <span className={answer.confidence < 0.65 ? 'ac-confidence ac-confidence--low' : 'ac-confidence'}>Confiance IA : {Math.round(answer.confidence * 100)}%</span>}
                            </div>
                            {answer.feedback && <p className="ac-feedback">{answer.feedback}</p>}
                          </div>
                        );
                      })}
                      <div className="ac-total">Total proposé : <strong>{activeAssessment.questions.reduce((sum, question) => sum + (Number(answers[question.id]?.score) || 0), 0).toFixed(1)} / {maxScore}</strong></div>
                      <div className="ac-form-actions">
                        <button className="ac-button ac-button--secondary" type="submit" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer pour relecture'}</button>
                        <button className="ac-button ac-button--primary" type="button" disabled={saving} onClick={(event) => saveSubmission(event, true)}>Valider la note</button>
                      </div>
                    </form>
                    </OffCanvas>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

export default AssistedCorrectionPage;
