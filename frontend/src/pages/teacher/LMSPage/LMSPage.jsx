import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import OffCanvas from '../../../components/common/OffCanvas/OffCanvas';
import ConfirmDialog from '../../../components/common/ConfirmDialog/ConfirmDialog';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import Textarea from '../../../components/common/Textarea/Textarea';
import Select from '../../../components/common/Select/Select';
import { lmsService, uploadLmsFile } from '../../../services/lmsService';
import { classesService } from '../../../services/classesService';
import { subjectsService } from '../../../services/subjectsService';
import './LMSPage.css';

const TAB_KEYS = ['announcements', 'materials', 'assignments', 'quizzes'];
const AUDIENCE_KEYS   = ['ALL', 'CLASS', 'TEACHERS', 'STUDENTS', 'PARENTS'];
const MATERIAL_TYPE_KEYS = ['DOCUMENT', 'VIDEO', 'LINK', 'IMAGE'];
const QUESTION_TYPE_KEYS = ['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER'];

function Badge({ variant, children }) {
  return <span className={`lms__badge lms__badge--${variant?.toLowerCase()}`}>{children}</span>;
}

function fmt(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── File picker field ─────────────────────────────────────────────────────────

function FilePickerField({ label, value, onChange }) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const fieldLabel = label ?? t('lms.file.attachment');

  async function handlePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadLmsFile(file);
      onChange(res.data.url, res.data.filename);
      toast.success(t('lms.file.toast.uploaded'));
    } catch (err) {
      toast.error(err?.response?.data?.message ?? t('lms.file.toast.error'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  const name = value ? decodeURIComponent(value.split('/').pop()) : null;

  return (
    <div className="lms__file-field">
      <span className="form-field__label" style={{ marginBottom: '0.35rem', display: 'block' }}>{fieldLabel}</span>
      {name ? (
        <div className="lms__file-chip">
          <span className="lms__file-chip-name" title={name}>📎 {name}</span>
          <button type="button" className="lms__file-chip-remove" onClick={() => onChange('', '')}>✕</button>
        </div>
      ) : (
        <button type="button" className="lms__file-btn" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? t('lms.file.uploading') : t('lms.file.attach')}
        </button>
      )}
      <input ref={inputRef} type="file" style={{ display: 'none' }} onChange={handlePick} />
    </div>
  );
}

// ── Announcements tab ─────────────────────────────────────────────────────────

function AnnouncementsTab({ classes }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [panel, setPanel]     = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [form, setForm]       = useState({ title: '', body: '', audience: 'ALL', classId: '', isPinned: false });

  const classOptions    = classes.map((c) => ({ value: c.id, label: c.name }));
  const audienceOptions = AUDIENCE_KEYS.map((k) => ({ value: k, label: t(`lms.audience.${k}`) }));

  const { data: items = [] } = useQuery({
    queryKey: ['lms-announcements'],
    queryFn: () => lmsService.announcements.list().then((r) => r.data),
  });

  const upsert = useMutation({
    mutationFn: (data) => panel?.id
      ? lmsService.announcements.update(panel.id, data)
      : lmsService.announcements.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lms-announcements'] }); toast.success(t('lms.announcements.toast.saved')); setPanel(null); },
    onError: (e) => toast.error(e?.response?.data?.message ?? t('lms.actions.save')),
  });

  const del = useMutation({
    mutationFn: (id) => lmsService.announcements.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lms-announcements'] }); toast.success(t('lms.announcements.toast.deleted')); setConfirm(null); },
  });

  function openCreate() {
    setForm({ title: '', body: '', audience: 'ALL', classId: '', isPinned: false });
    setPanel({});
  }
  function openEdit(a) {
    setForm({ title: a.title, body: a.body, audience: a.audience, classId: a.classId ?? '', isPinned: a.isPinned });
    setPanel(a);
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
        <Button icon="+" onClick={openCreate}>{t('lms.announcements.new')}</Button>
      </div>

      {items.length === 0 ? (
        <div className="lms__empty">{t('lms.empty.announcements')}</div>
      ) : (
        <div className="lms__grid">
          {items.map((a) => (
            <div key={a.id} className="lms__card">
              <div className="lms__card-header">
                <div className="lms__card-title">{a.title}</div>
                <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                  {a.isPinned && <Badge variant="pinned">{t('lms.announcements.pinned')}</Badge>}
                  <Badge variant={a.audience}>{t(`lms.audience.${a.audience}`, a.audience)}</Badge>
                </div>
              </div>
              <div className="lms__card-body">{a.body}</div>
              <div className="lms__card-meta">
                <span>Par {a.author?.name}</span>
                {a.publishedAt && <span>· {fmt(a.publishedAt)}</span>}
                {a.expiresAt && <span>· expire {fmt(a.expiresAt)}</span>}
              </div>
              <div className="lms__card-actions">
                <Button size="sm" variant="ghost" onClick={() => openEdit(a)}>{t('lms.actions.modify')}</Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirm(a)}>{t('lms.actions.delete')}</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <OffCanvas
        open={!!panel}
        onClose={() => setPanel(null)}
        title={panel?.id ? t('lms.announcements.editTitle') : t('lms.announcements.newTitle')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPanel(null)}>{t('lms.actions.cancel')}</Button>
            <Button onClick={() => upsert.mutate(form)} disabled={upsert.isPending}>
              {upsert.isPending ? t('lms.actions.saving') : t('lms.actions.save')}
            </Button>
          </>
        }
      >
        <div className="lms__form">
          <Input
            label={t('lms.announcements.fields.title')}
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <Textarea
            label={t('lms.announcements.fields.body')}
            required
            rows={5}
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
          />
          <Select
            label={t('lms.announcements.fields.audience')}
            value={form.audience}
            options={audienceOptions}
            onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))}
          />
          {form.audience === 'CLASS' && (
            <Select
              label={t('lms.announcements.fields.class')}
              value={form.classId}
              placeholder={t('lms.announcements.fields.classPlaceholder')}
              options={classOptions}
              onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
            />
          )}
          <label className="form-field__checkbox">
            <input
              type="checkbox"
              checked={form.isPinned}
              onChange={(e) => setForm((f) => ({ ...f, isPinned: e.target.checked }))}
            />
            {t('lms.announcements.pin')}
          </label>
        </div>
      </OffCanvas>

      <ConfirmDialog
        open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={() => del.mutate(confirm.id)} loading={del.isPending}
        title={t('lms.announcements.confirmDelete')}
        message={t('lms.announcements.confirmDeleteMsg', { title: confirm?.title })}
        confirmLabel={t('lms.actions.delete')} variant="danger"
      />
    </>
  );
}

// ── Materials tab ─────────────────────────────────────────────────────────────

function MaterialsTab({ classes, subjects }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [panel, setPanel]         = useState(false);
  const [confirm, setConfirm]     = useState(null);
  const [classId, setClassId]     = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [form, setForm] = useState({
    title: '', description: '', type: 'DOCUMENT', url: '',
    classId: '', subjectId: '', academicYear: String(new Date().getFullYear()), termNumber: '',
  });

  const classOptions    = classes.map((c) => ({ value: c.id, label: c.name }));
  const subjectOptions  = subjects.map((s) => ({ value: s.id, label: s.nameFr }));
  const matTypeOptions  = MATERIAL_TYPE_KEYS.map((k) => ({ value: k, label: t(`lms.materialTypes.${k}`) }));

  const { data: items = [] } = useQuery({
    queryKey: ['lms-materials', classId, subjectId],
    queryFn: () => lmsService.materials.list({ classId: classId || undefined, subjectId: subjectId || undefined }).then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data) => lmsService.materials.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lms-materials'] }); toast.success(t('lms.materials.toast.added')); setPanel(false); },
    onError: (e) => toast.error(e?.response?.data?.message ?? t('lms.actions.save')),
  });

  const del = useMutation({
    mutationFn: (id) => lmsService.materials.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lms-materials'] }); toast.success(t('lms.materials.toast.deleted')); setConfirm(null); },
  });

  return (
    <>
      <div className="lms__filters">
        <select className="lms__filter-select" value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">{t('lms.materials.allClasses')}</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="lms__filter-select" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          <option value="">{t('lms.materials.allSubjects')}</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.nameFr}</option>)}
        </select>
        <Button icon="+" onClick={() => setPanel(true)}>{t('lms.materials.add')}</Button>
      </div>

      {items.length === 0 ? (
        <div className="lms__empty">{t('lms.empty.materials')}</div>
      ) : (
        <div className="lms__grid">
          {items.map((m) => (
            <div key={m.id} className="lms__card">
              <div className="lms__card-header">
                <div className="lms__card-title">{m.title}</div>
                <Badge variant={m.type}>{t(`lms.materialTypes.${m.type}`, m.type)}</Badge>
              </div>
              {m.description && <div className="lms__card-body">{m.description}</div>}
              <div className="lms__card-meta">
                <span>{m.class?.name}</span> · <span>{m.subject?.nameFr}</span> · <span>{m.academicYear}</span>
              </div>
              <div className="lms__card-actions">
                <a href={m.url} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="ghost">{t('lms.materials.open')}</Button>
                </a>
                <Button size="sm" variant="ghost" onClick={() => setConfirm(m)}>{t('lms.actions.delete')}</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <OffCanvas
        open={panel}
        onClose={() => setPanel(false)}
        title={t('lms.materials.addTitle')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPanel(false)}>{t('lms.actions.cancel')}</Button>
            <Button
              onClick={() => create.mutate({ ...form, termNumber: form.termNumber ? Number(form.termNumber) : undefined })}
              disabled={create.isPending}
            >
              {create.isPending ? t('lms.actions.saving') : t('lms.actions.save')}
            </Button>
          </>
        }
      >
        <div className="lms__form">
          <Input
            label={t('lms.materials.fields.title')}
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <Textarea
            label={t('lms.materials.fields.description')}
            rows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <div className="lms__form-row">
            <Select
              label={t('lms.materials.fields.type')}
              value={form.type}
              options={matTypeOptions}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            />
            <Input
              label={t('lms.materials.fields.year')}
              value={form.academicYear}
              onChange={(e) => setForm((f) => ({ ...f, academicYear: e.target.value }))}
            />
          </div>
          <Input
            label={t('lms.materials.fields.url')}
            placeholder="https://…"
            value={form.url}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
          />
          <div className="lms__url-or">{t('lms.materials.fields.urlOr')}</div>
          <FilePickerField
            label={t('lms.materials.fields.upload')}
            value={form.url?.startsWith('http://localhost') || form.url?.includes('/uploads/lms') ? form.url : ''}
            onChange={(url) => setForm((f) => ({ ...f, url }))}
          />
          <div className="lms__form-row">
            <Select
              label={t('lms.materials.fields.class')}
              required
              value={form.classId}
              placeholder="—"
              options={classOptions}
              onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
            />
            <Select
              label={t('lms.materials.fields.subject')}
              required
              value={form.subjectId}
              placeholder="—"
              options={subjectOptions}
              onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}
            />
          </div>
        </div>
      </OffCanvas>

      <ConfirmDialog
        open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={() => del.mutate(confirm.id)} loading={del.isPending}
        title={t('lms.materials.confirmDelete')}
        message={t('lms.materials.confirmDeleteMsg', { title: confirm?.title })}
        confirmLabel={t('lms.actions.delete')} variant="danger"
      />
    </>
  );
}

// ── Assignments tab ───────────────────────────────────────────────────────────

function AssignmentsTab({ classes, subjects }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [panel, setPanel]       = useState(null);
  const [confirm, setConfirm]   = useState(null);
  const [subPanel, setSubPanel] = useState(null);
  const [classId, setClassId]   = useState('');
  const [grades, setGrades]     = useState({});
  const [feedback, setFeedback] = useState({});

  const EMPTY = {
    title: '', instructions: '', dueDate: '', maxScore: 20,
    classId: '', subjectId: '', academicYear: String(new Date().getFullYear()),
    termNumber: '', attachmentUrl: '', attachmentName: '',
  };
  const [form, setForm] = useState(EMPTY);

  const classOptions   = classes.map((c) => ({ value: c.id, label: c.name }));
  const subjectOptions = subjects.map((s) => ({ value: s.id, label: s.nameFr }));

  const { data: items = [] } = useQuery({
    queryKey: ['lms-assignments', classId],
    queryFn: () => lmsService.assignments.list({ classId: classId || undefined }).then((r) => r.data),
  });

  const { data: submissions = [], refetch: refetchSubs } = useQuery({
    queryKey: ['lms-submissions', subPanel?.id],
    queryFn: () => lmsService.assignments.submissions(subPanel.id).then((r) => r.data),
    enabled: !!subPanel?.id,
  });

  const upsert = useMutation({
    mutationFn: (data) => panel?.id
      ? lmsService.assignments.update(panel.id, data)
      : lmsService.assignments.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lms-assignments'] }); toast.success(t('lms.assignments.toast.saved')); setPanel(null); },
    onError: (e) => toast.error(e?.response?.data?.message ?? t('lms.actions.save')),
  });

  const publishMut = useMutation({
    mutationFn: (id) => lmsService.assignments.publish(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lms-assignments'] }); toast.success(t('lms.assignments.toast.statusUpdated')); },
  });

  const del = useMutation({
    mutationFn: (id) => lmsService.assignments.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lms-assignments'] }); toast.success(t('lms.assignments.toast.deleted')); setConfirm(null); },
  });

  const gradeMut = useMutation({
    mutationFn: ({ assignmentId, subId, score, fb }) =>
      lmsService.assignments.grade(assignmentId, subId, { score: Number(score), feedback: fb }),
    onSuccess: () => { refetchSubs(); toast.success(t('lms.assignments.toast.graded')); },
  });

  return (
    <>
      <div className="lms__filters">
        <select className="lms__filter-select" value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">{t('lms.assignments.allClasses')}</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <Button icon="+" onClick={() => { setForm(EMPTY); setPanel({}); }}>{t('lms.assignments.new')}</Button>
      </div>

      {items.length === 0 ? (
        <div className="lms__empty">{t('lms.empty.assignments')}</div>
      ) : (
        <div className="lms__grid">
          {items.map((a) => (
            <div key={a.id} className="lms__card">
              <div className="lms__card-header">
                <div className="lms__card-title">{a.title}</div>
                <Badge variant={a.status.toLowerCase()}>{a.status}</Badge>
              </div>
              <div className="lms__card-meta">
                <span>{a.class?.name}</span> · <span>{a.subject?.nameFr}</span>
                {a.dueDate && <span>· {t('lms.assignments.dueDate')} {fmt(a.dueDate)}</span>}
                <span>· {t('lms.assignments.submissions', { count: a._count?.submissions ?? 0 })}</span>
              </div>
              {a.instructions && (
                <div className="lms__card-body" style={{ WebkitLineClamp: 2, overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical' }}>
                  {a.instructions}
                </div>
              )}
              {a.attachmentUrl && (
                <a href={a.attachmentUrl} target="_blank" rel="noreferrer" className="lms__attach-link">
                  📎 {decodeURIComponent(a.attachmentUrl.split('/').pop())}
                </a>
              )}
              <div className="lms__card-actions">
                <Button size="sm" variant="ghost" onClick={() => {
                  setForm({ title: a.title, instructions: a.instructions ?? '', dueDate: a.dueDate ? a.dueDate.slice(0, 10) : '', maxScore: a.maxScore, classId: a.classId, subjectId: a.subjectId, academicYear: a.academicYear, termNumber: a.termNumber ?? '', attachmentUrl: a.attachmentUrl ?? '', attachmentName: '' });
                  setPanel(a);
                }}>{t('lms.actions.modify')}</Button>
                <Button size="sm" variant="ghost" onClick={() => publishMut.mutate(a.id)}>
                  {a.status === 'PUBLISHED' ? t('lms.assignments.close') : t('lms.assignments.publish')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSubPanel(a)}>{t('lms.assignments.submissions')}</Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirm(a)}>{t('lms.actions.delete')}</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <OffCanvas
        open={!!panel}
        onClose={() => setPanel(null)}
        title={panel?.id ? t('lms.assignments.editTitle') : t('lms.assignments.newTitle')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPanel(null)}>{t('lms.actions.cancel')}</Button>
            <Button
              onClick={() => upsert.mutate({ ...form, termNumber: form.termNumber ? Number(form.termNumber) : undefined, maxScore: Number(form.maxScore), attachmentUrl: form.attachmentUrl || undefined })}
              disabled={upsert.isPending}
            >
              {upsert.isPending ? t('lms.actions.saving') : t('lms.actions.save')}
            </Button>
          </>
        }
      >
        <div className="lms__form">
          <Input
            label={t('lms.assignments.fields.title')}
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <Textarea
            label={t('lms.assignments.fields.instructions')}
            rows={4}
            value={form.instructions}
            onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
          />
          <FilePickerField
            label={t('lms.assignments.fields.attachment')}
            value={form.attachmentUrl}
            onChange={(url, name) => setForm((f) => ({ ...f, attachmentUrl: url, attachmentName: name }))}
          />
          <div className="lms__form-row">
            <Input
              label={t('lms.assignments.fields.dueDate')}
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
            />
            <Input
              label={t('lms.assignments.fields.maxScore')}
              type="number"
              value={form.maxScore}
              onChange={(e) => setForm((f) => ({ ...f, maxScore: e.target.value }))}
            />
          </div>
          <div className="lms__form-row">
            <Select
              label={t('lms.assignments.fields.class')}
              required
              value={form.classId}
              placeholder="—"
              options={classOptions}
              onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
            />
            <Select
              label={t('lms.assignments.fields.subject')}
              required
              value={form.subjectId}
              placeholder="—"
              options={subjectOptions}
              onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}
            />
          </div>
          <Input
            label={t('lms.assignments.fields.year')}
            value={form.academicYear}
            onChange={(e) => setForm((f) => ({ ...f, academicYear: e.target.value }))}
          />
        </div>
      </OffCanvas>

      <OffCanvas
        open={!!subPanel}
        onClose={() => setSubPanel(null)}
        title={t('lms.assignments.submissionsTitle', { title: subPanel?.title ?? '' })}
        size="lg"
      >
        <div style={{ overflowX: 'auto' }}>
          {submissions.length === 0 ? (
            <div className="lms__empty">{t('lms.empty.submissions')}</div>
          ) : (
            <table className="lms__sub-table">
              <thead>
                <tr>
                  <th>{t('lms.assignments.columns.student')}</th>
                  <th>{t('lms.assignments.columns.status')}</th>
                  <th>{t('lms.assignments.columns.submittedAt')}</th>
                  <th>{t('lms.assignments.columns.work')}</th>
                  <th>{t('lms.assignments.columns.grade')} /{subPanel?.maxScore ?? 20}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.id}>
                    <td>{s.student?.user?.name ?? s.student?.admissionNumber}</td>
                    <td><Badge variant={s.status.toLowerCase()}>{s.status}</Badge></td>
                    <td>{fmt(s.submittedAt)}</td>
                    <td style={{ maxWidth: 200, fontSize: '0.8rem' }}>
                      {s.content && <div style={{ whiteSpace: 'pre-wrap', maxHeight: 60, overflow: 'hidden' }}>{s.content}</div>}
                      {s.attachmentUrl && <a href={s.attachmentUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontSize: '0.78rem' }}>{t('lms.file.attachment')}</a>}
                    </td>
                    <td>
                      <div className="lms__sub-score">
                        <input
                          type="number" min={0} max={subPanel?.maxScore ?? 20} step={0.5}
                          value={grades[s.id] ?? s.score ?? ''}
                          onChange={(e) => setGrades((g) => ({ ...g, [s.id]: e.target.value }))}
                        />
                        <span style={{ color: '#6b7280', fontSize: '0.78rem' }}>/{subPanel?.maxScore ?? 20}</span>
                      </div>
                    </td>
                    <td>
                      <Button size="sm" onClick={() => gradeMut.mutate({ assignmentId: subPanel.id, subId: s.id, score: grades[s.id] ?? s.score, fb: feedback[s.id] ?? s.feedback })}>
                        {t('lms.assignments.gradeBtn')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </OffCanvas>

      <ConfirmDialog
        open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={() => del.mutate(confirm.id)} loading={del.isPending}
        title={t('lms.assignments.confirmDelete')}
        message={t('lms.assignments.confirmDeleteMsg', { title: confirm?.title })}
        confirmLabel={t('lms.actions.delete')} variant="danger"
      />
    </>
  );
}

// ── Quizzes tab ───────────────────────────────────────────────────────────────

function QuizzesTab({ classes, subjects }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [panel, setPanel]             = useState(null);
  const [confirm, setConfirm]         = useState(null);
  const [builderQuiz, setBuilderQuiz] = useState(null);
  const [resultsQuiz, setResultsQuiz] = useState(null);
  const [classId, setClassId]         = useState('');

  const EMPTY = {
    title: '', description: '', durationMinutes: '', maxAttempts: 1,
    classId: '', subjectId: '', academicYear: String(new Date().getFullYear()),
    termNumber: '', showResults: true, attachmentUrl: '',
  };
  const [form, setForm] = useState(EMPTY);
  const [qForm, setQForm] = useState({
    text: '', type: 'MCQ', points: 1,
    options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }],
  });

  const classOptions    = classes.map((c) => ({ value: c.id, label: c.name }));
  const subjectOptions  = subjects.map((s) => ({ value: s.id, label: s.nameFr }));
  const qTypeOptions    = QUESTION_TYPE_KEYS.map((k) => ({ value: k, label: t(`lms.questionTypes.${k}`) }));

  const { data: items = [] } = useQuery({
    queryKey: ['lms-quizzes', classId],
    queryFn: () => lmsService.quizzes.list({ classId: classId || undefined }).then((r) => r.data),
  });

  const { data: builderData, refetch: refetchBuilder } = useQuery({
    queryKey: ['lms-quiz-detail', builderQuiz?.id],
    queryFn: () => lmsService.quizzes.get(builderQuiz.id).then((r) => r.data),
    enabled: !!builderQuiz?.id,
  });

  const { data: results = [] } = useQuery({
    queryKey: ['lms-quiz-results', resultsQuiz?.id],
    queryFn: () => lmsService.quizzes.results(resultsQuiz.id).then((r) => r.data),
    enabled: !!resultsQuiz?.id,
  });

  const upsert = useMutation({
    mutationFn: (data) => panel?.id
      ? lmsService.quizzes.update(panel.id, data)
      : lmsService.quizzes.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lms-quizzes'] }); toast.success(t('lms.quizzes.toast.saved')); setPanel(null); },
    onError: (e) => toast.error(e?.response?.data?.message ?? t('lms.quizzes.toast.saved')),
  });

  const publishMut = useMutation({
    mutationFn: (id) => lmsService.quizzes.publish(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lms-quizzes'] }); toast.success(t('lms.quizzes.toast.statusUpdated')); },
  });

  const del = useMutation({
    mutationFn: (id) => lmsService.quizzes.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lms-quizzes'] }); toast.success(t('lms.quizzes.toast.deleted')); setConfirm(null); },
  });

  const addQ = useMutation({
    mutationFn: (data) => lmsService.quizzes.addQuestion(builderQuiz.id, data),
    onSuccess: () => {
      refetchBuilder();
      toast.success(t('lms.quizzes.toast.questionAdded'));
      setQForm({ text: '', type: 'MCQ', points: 1, options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }] });
    },
  });

  const delQ = useMutation({
    mutationFn: ({ qId }) => lmsService.quizzes.deleteQuestion(builderQuiz.id, qId),
    onSuccess: () => refetchBuilder(),
  });

  const questions      = builderData?.questions ?? [];
  const hasShortAnswer = qForm.type === 'SHORT_ANSWER';

  return (
    <>
      <div className="lms__filters">
        <select className="lms__filter-select" value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">{t('lms.quizzes.allClasses')}</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <Button icon="+" onClick={() => { setForm(EMPTY); setPanel({}); }}>{t('lms.quizzes.new')}</Button>
      </div>

      {items.length === 0 ? (
        <div className="lms__empty">{t('lms.empty.quizzes')}</div>
      ) : (
        <div className="lms__grid">
          {items.map((q) => (
            <div key={q.id} className="lms__card">
              <div className="lms__card-header">
                <div className="lms__card-title">{q.title}</div>
                <Badge variant={q.status.toLowerCase()}>{q.status}</Badge>
              </div>
              <div className="lms__card-meta">
                <span>{q.class?.name}</span> · <span>{q.subject?.nameFr}</span>
                <span>· {t('lms.quizzes.questions', { count: q._count?.questions ?? 0 })}</span>
                <span>· {t('lms.quizzes.attempts', { count: q._count?.attempts ?? 0 })}</span>
                {q.durationMinutes && <span>· {q.durationMinutes} min</span>}
              </div>
              {q.attachmentUrl && (
                <a href={q.attachmentUrl} target="_blank" rel="noreferrer" className="lms__attach-link">
                  📎 {decodeURIComponent(q.attachmentUrl.split('/').pop())}
                </a>
              )}
              <div className="lms__card-actions">
                <Button size="sm" variant="ghost" onClick={() => {
                  setForm({ title: q.title, description: q.description ?? '', durationMinutes: q.durationMinutes ?? '', maxAttempts: q.maxAttempts, classId: q.classId, subjectId: q.subjectId, academicYear: q.academicYear, termNumber: q.termNumber ?? '', showResults: q.showResults, attachmentUrl: q.attachmentUrl ?? '' });
                  setPanel(q);
                }}>{t('lms.actions.modify')}</Button>
                <Button size="sm" variant="ghost" onClick={() => publishMut.mutate(q.id)}>
                  {q.status === 'OPEN' ? t('lms.quizzes.close') : t('lms.quizzes.open')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setBuilderQuiz(q)}>{t('lms.quizzes.questions')}</Button>
                <Button size="sm" variant="ghost" onClick={() => setResultsQuiz(q)}>{t('lms.quizzes.results')}</Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirm(q)}>{t('lms.actions.delete')}</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / edit quiz */}
      <OffCanvas
        open={!!panel}
        onClose={() => setPanel(null)}
        title={panel?.id ? t('lms.quizzes.editTitle') : t('lms.quizzes.newTitle')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPanel(null)}>{t('lms.actions.cancel')}</Button>
            <Button
              onClick={() => upsert.mutate({ ...form, durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : undefined, maxAttempts: Number(form.maxAttempts), termNumber: form.termNumber ? Number(form.termNumber) : undefined, attachmentUrl: form.attachmentUrl || undefined })}
              disabled={upsert.isPending}
            >
              {upsert.isPending ? t('lms.actions.saving') : t('lms.actions.save')}
            </Button>
          </>
        }
      >
        <div className="lms__form">
          <Input
            label={t('lms.quizzes.fields.title')}
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <Textarea
            label={t('lms.quizzes.fields.description')}
            rows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <FilePickerField
            label={t('lms.quizzes.fields.attachment')}
            value={form.attachmentUrl}
            onChange={(url) => setForm((f) => ({ ...f, attachmentUrl: url }))}
          />
          <div className="lms__form-row">
            <Input
              label={t('lms.quizzes.fields.duration')}
              type="number"
              placeholder={t('lms.quizzes.fields.durationPlaceholder')}
              value={form.durationMinutes}
              onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))}
            />
            <Input
              label={t('lms.quizzes.fields.attempts')}
              type="number"
              min="1"
              value={form.maxAttempts}
              onChange={(e) => setForm((f) => ({ ...f, maxAttempts: e.target.value }))}
            />
          </div>
          <div className="lms__form-row">
            <Select
              label={t('lms.quizzes.fields.class')}
              required
              value={form.classId}
              placeholder="—"
              options={classOptions}
              onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
            />
            <Select
              label={t('lms.quizzes.fields.subject')}
              required
              value={form.subjectId}
              placeholder="—"
              options={subjectOptions}
              onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}
            />
          </div>
          <Input
            label={t('lms.quizzes.fields.year')}
            value={form.academicYear}
            onChange={(e) => setForm((f) => ({ ...f, academicYear: e.target.value }))}
          />
          <label className="form-field__checkbox">
            <input
              type="checkbox"
              checked={form.showResults}
              onChange={(e) => setForm((f) => ({ ...f, showResults: e.target.checked }))}
            />
            {t('lms.quizzes.fields.showResults')}
          </label>
        </div>
      </OffCanvas>

      {/* Question builder */}
      <OffCanvas
        open={!!builderQuiz}
        onClose={() => setBuilderQuiz(null)}
        title={t('lms.quizzes.questionsTitle', { title: builderQuiz?.title ?? '' })}
        size="lg"
      >
        <div className="lms__qbuilder">
          {questions.length === 0 && <div className="lms__empty">{t('lms.empty.questions')}</div>}
          {questions.map((q, i) => (
            <div key={q.id} className="lms__question-card">
              <div className="lms__question-card-header">
                <strong style={{ fontSize: '0.85rem' }}>Q{i + 1} · {q.type} · {q.points} pt{q.points > 1 ? 's' : ''}</strong>
                <Button size="sm" variant="ghost" onClick={() => delQ.mutate({ qId: q.id })}>{t('lms.actions.delete')}</Button>
              </div>
              <div style={{ fontSize: '0.9rem' }}>{q.text}</div>
              {q.options?.map((o) => (
                <div key={o.id} style={{ fontSize: '0.82rem', paddingLeft: '0.75rem', color: o.isCorrect ? '#15803d' : '#374151' }}>
                  {o.isCorrect ? '✔' : '○'} {o.text}
                </div>
              ))}
            </div>
          ))}

          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
            <strong style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.75rem' }}>{t('lms.quizzes.qBuilder.newQuestion')}</strong>
            <div className="lms__form" style={{ gap: '0.75rem' }}>
              <Textarea
                label={t('lms.quizzes.qBuilder.fields.text')}
                required
                rows={2}
                value={qForm.text}
                onChange={(e) => setQForm((f) => ({ ...f, text: e.target.value }))}
              />
              <div className="lms__form-row">
                <Select
                  label={t('lms.quizzes.qBuilder.fields.type')}
                  value={qForm.type}
                  options={qTypeOptions}
                  onChange={(e) => setQForm((f) => ({
                    ...f,
                    type: e.target.value,
                    options: e.target.value === 'TRUE_FALSE'
                      ? [{ text: t('lms.quizzes.trueFalse.true'), isCorrect: false }, { text: t('lms.quizzes.trueFalse.false'), isCorrect: false }]
                      : f.options,
                  }))}
                />
                <Input
                  label={t('lms.quizzes.qBuilder.fields.points')}
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={qForm.points}
                  onChange={(e) => setQForm((f) => ({ ...f, points: Number(e.target.value) }))}
                />
              </div>
              {!hasShortAnswer && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <strong style={{ fontSize: '0.8rem', color: '#374151' }}>{t('lms.quizzes.qBuilder.answersLabel')}</strong>
                  {qForm.options.map((o, i) => (
                    <div key={i} className="lms__option-row">
                      <input
                        type="checkbox"
                        className="lms__correct-check"
                        checked={o.isCorrect}
                        onChange={(e) => setQForm((f) => {
                          const opts = [...f.options];
                          opts[i] = { ...opts[i], isCorrect: e.target.checked };
                          return { ...f, options: opts };
                        })}
                      />
                      <input
                        type="text"
                        placeholder={`Option ${i + 1}`}
                        value={o.text}
                        onChange={(e) => setQForm((f) => {
                          const opts = [...f.options];
                          opts[i] = { ...opts[i], text: e.target.value };
                          return { ...f, options: opts };
                        })}
                      />
                      {qForm.type === 'MCQ' && qForm.options.length > 2 && (
                        <Button size="sm" variant="ghost" onClick={() => setQForm((f) => ({ ...f, options: f.options.filter((_, j) => j !== i) }))}>✕</Button>
                      )}
                    </div>
                  ))}
                  {qForm.type === 'MCQ' && qForm.options.length < 6 && (
                    <Button size="sm" variant="ghost" onClick={() => setQForm((f) => ({ ...f, options: [...f.options, { text: '', isCorrect: false }] }))}>{t('lms.quizzes.qBuilder.addOption')}</Button>
                  )}
                </div>
              )}
              <Button
                onClick={() => addQ.mutate({ text: qForm.text, type: qForm.type, points: qForm.points, options: hasShortAnswer ? undefined : qForm.options })}
                disabled={addQ.isPending || !qForm.text}
              >
                {addQ.isPending ? t('lms.actions.saving') : t('lms.quizzes.qBuilder.addBtn')}
              </Button>
            </div>
          </div>
        </div>
      </OffCanvas>

      {/* Results panel */}
      <OffCanvas
        open={!!resultsQuiz}
        onClose={() => setResultsQuiz(null)}
        title={t('lms.quizzes.resultsTitle', { title: resultsQuiz?.title ?? '' })}
        size="lg"
      >
        {results.length === 0 ? (
          <div className="lms__empty">{t('lms.empty.attempts')}</div>
        ) : (
          <table className="lms__sub-table">
            <thead>
              <tr><th>{t('lms.quizzes.resultsColumns.student')}</th><th>{t('lms.quizzes.resultsColumns.score')}</th><th>{t('lms.quizzes.resultsColumns.max')}</th><th>{t('lms.quizzes.resultsColumns.pct')}</th><th>{t('lms.quizzes.resultsColumns.submittedAt')}</th></tr>
            </thead>
            <tbody>
              {results.map((a) => (
                <tr key={a.id}>
                  <td>{a.student?.user?.name ?? a.student?.admissionNumber}</td>
                  <td style={{ fontWeight: 700 }}>{a.score ?? '—'}</td>
                  <td>{a.maxScore ?? '—'}</td>
                  <td>{a.score != null && a.maxScore ? `${Math.round((a.score / a.maxScore) * 100)}%` : '—'}</td>
                  <td>{fmt(a.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </OffCanvas>

      <ConfirmDialog
        open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={() => del.mutate(confirm.id)} loading={del.isPending}
        title={t('lms.quizzes.confirmDelete')} message={t('lms.quizzes.confirmDeleteMsg', { title: confirm?.title })}
        confirmLabel={t('lms.actions.delete')} variant="danger"
      />
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LMSPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('announcements');

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesService.list().then((r) => r.data),
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectsService.list().then((r) => r.data),
  });

  return (
    <AppShell title={t('lms.title')}>
      <PageHeader title={t('lms.pageTitle')} subtitle={t('lms.subtitle')} />

      <div className="lms">
        <div className="lms__tabs">
          {TAB_KEYS.map((key) => (
            <button key={key} className={`lms__tab${tab === key ? ' lms__tab--active' : ''}`} onClick={() => setTab(key)}>
              {t(`lms.tabs.${key}`)}
            </button>
          ))}
        </div>

        {tab === 'announcements' && <AnnouncementsTab classes={classes} />}
        {tab === 'materials'     && <MaterialsTab classes={classes} subjects={subjects} />}
        {tab === 'assignments'   && <AssignmentsTab classes={classes} subjects={subjects} />}
        {tab === 'quizzes'       && <QuizzesTab classes={classes} subjects={subjects} />}
      </div>
    </AppShell>
  );
}
