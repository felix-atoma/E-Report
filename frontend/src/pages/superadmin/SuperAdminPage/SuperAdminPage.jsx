import { useState, useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { institutionsService } from '../../../services/institutionsService';
import api from '../../../services/api';
import AppShell from '../../../components/layout/AppShell/AppShell';
import './SuperAdminPage.css';

const STATUS_CONFIG = {
  PENDING:   { label: 'En attente',  cls: 'sa-badge--pending'   },
  ACTIVE:    { label: 'Active',      cls: 'sa-badge--active'    },
  SUSPENDED: { label: 'Suspendue',   cls: 'sa-badge--suspended' },
  REJECTED:  { label: 'Rejetée',     cls: 'sa-badge--rejected'  },
};

const PLANS = ['', 'STARTER', 'BASIC', 'PRO', 'ENTERPRISE'];

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, cls: '' };
  return <span className={`sa-badge ${cfg.cls}`}>{cfg.label}</span>;
}

function StatCard({ label, value, cls, sub }) {
  return (
    <div className={`sa-stat ${cls}`}>
      <span className="sa-stat__value">{value}</span>
      <span className="sa-stat__label">{label}</span>
      {sub && <span className="sa-stat__sub">{sub}</span>}
    </div>
  );
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="sa-info-row">
      <span className="sa-info-label">{label}</span>
      <span className="sa-info-value">{value}</span>
    </div>
  );
}

function CountChip({ icon, label, value, alert }) {
  return (
    <div className={`sa-chip${alert ? ' sa-chip--alert' : ''}`}>
      <span className="sa-chip__icon">{icon}</span>
      <div>
        <div className="sa-chip__value">{value ?? 0}</div>
        <div className="sa-chip__label">{label}</div>
      </div>
    </div>
  );
}

// ─── Expanded school profile panel ────────────────────────────────────────────
function SchoolProfile({ inst, notesMap, setNotesMap, savingNotes, saveNotes, savingPlan, savePlan, planMap, setPlanMap }) {
  const overQuota =
    inst.declaredStudentCount &&
    inst.actualStudentCount > inst.declaredStudentCount * 1.1;

  return (
    <div className="sa-profile">

      {/* ── Row 1: Identity + Admin contact + Counts ─────────── */}
      <div className="sa-profile__grid">

        {/* School identity */}
        <div className="sa-profile__section">
          <div className="sa-profile__section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Établissement
          </div>
          {inst.logo && (
            <img src={inst.logo} alt="logo" className="sa-profile__logo" />
          )}
          <InfoRow label="Nom"            value={inst.name} />
          <InfoRow label="Ville"          value={inst.city} />
          <InfoRow label="Pays"           value={inst.country} />
          <InfoRow label="Circonscription" value={inst.circonscription} />
          <InfoRow label="Téléphone"      value={inst.phone} />
          <InfoRow label="Email officiel" value={inst.email} />
          <InfoRow label="Site web"       value={inst.website} />
          <InfoRow label="Devise"         value={inst.motto} />
        </div>

        {/* Admin contact */}
        <div className="sa-profile__section">
          <div className="sa-profile__section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Administrateur
          </div>
          {inst.admin ? (
            <>
              <InfoRow label="Nom"       value={inst.admin.name} />
              <InfoRow label="Email"     value={inst.admin.email} />
              <InfoRow label="WhatsApp"  value={inst.admin.whatsappNumber} />
              <InfoRow label="Inscrit le" value={fmtDate(inst.admin.createdAt)} />
              <div className="sa-info-row">
                <span className="sa-info-label">Compte admin</span>
                <span className={`sa-badge ${inst.admin.isActive ? 'sa-badge--active' : 'sa-badge--suspended'}`} style={{ fontSize: '0.7rem' }}>
                  {inst.admin.isActive ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </>
          ) : (
            <p className="sa-profile__no-admin">Aucun administrateur enregistré</p>
          )}

          <div className="sa-profile__section-title" style={{ marginTop: '1rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Dates
          </div>
          <InfoRow label="Inscription" value={fmtDate(inst.createdAt)} />
          <InfoRow label="Mise à jour"  value={fmtDate(inst.updatedAt)} />
        </div>

        {/* Counts */}
        <div className="sa-profile__section">
          <div className="sa-profile__section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Activité
          </div>
          <div className="sa-chips">
            <CountChip icon="🎓" label="Élèves réels"    value={inst.actualStudentCount} alert={overQuota} />
            <CountChip icon="📋" label="Élèves déclarés" value={inst.declaredStudentCount ?? '—'} />
            <CountChip icon="🏫" label="Classes"          value={inst.classCount} />
            <CountChip icon="👥" label="Utilisateurs"     value={inst.userCount} />
            <CountChip icon="📄" label="Bulletins"        value={inst.bulletinCount} />
            <CountChip icon="💳" label="Paiements"        value={inst.paymentCount} />
          </div>
          {overQuota && (
            <div className="sa-overquota-alert">
              ⚠️ Le nombre d'élèves réels dépasse de plus de 10 % le nombre déclaré.
            </div>
          )}
        </div>
      </div>

      {/* ── Row 2: Subscription + Notes ──────────────────────── */}
      <div className="sa-profile__footer">

        {/* Plan */}
        <div className="sa-profile__plan-block">
          <label className="sa-profile__field-label" htmlFor={`plan-${inst.id}`}>
            Abonnement / Plan tarifaire
          </label>
          <div className="sa-profile__plan-row">
            <select
              id={`plan-${inst.id}`}
              className="sa-plan-select"
              value={planMap[inst.id] ?? (inst.subscriptionPlan || '')}
              onChange={(e) => setPlanMap((prev) => ({ ...prev, [inst.id]: e.target.value }))}
            >
              <option value="">— Aucun —</option>
              {PLANS.filter(Boolean).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <button
              className="sa-save-btn"
              onClick={() => savePlan(inst.id)}
              disabled={savingPlan[inst.id]}
            >
              {savingPlan[inst.id] ? '...' : 'Enregistrer'}
            </button>
          </div>
        </div>

        {/* Notes */}
        <div className="sa-profile__notes-block">
          <label className="sa-profile__field-label" htmlFor={`notes-${inst.id}`}>
            Notes internes (visibles uniquement par vous)
          </label>
          <textarea
            id={`notes-${inst.id}`}
            className="sa-notes-textarea"
            rows={3}
            value={notesMap[inst.id] ?? ''}
            onChange={(e) =>
              setNotesMap((prev) => ({ ...prev, [inst.id]: e.target.value }))
            }
            placeholder="Ex : Contacté le 12/05, en attente de devis..."
          />
          <button
            className="sa-save-btn"
            onClick={() => saveNotes(inst.id)}
            disabled={savingNotes[inst.id]}
          >
            {savingNotes[inst.id] ? 'Sauvegarde...' : 'Sauvegarder les notes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
function SuperAdminPage() {
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [notesMap, setNotesMap] = useState({});
  const [planMap, setPlanMap] = useState({});
  const [savingNotes, setSavingNotes] = useState({});
  const [savingPlan, setSavingPlan] = useState({});
  const [actionLoading, setActionLoading] = useState({});

  // ── Real-time new-registration alert ──────────────────────────────────────
  const [newAlert, setNewAlert] = useState(null); // { name, city, adminEmail, registeredAt }
  const loadRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const BASE = api.defaults.baseURL ?? 'https://e-report-y4g9.onrender.com/api';
    let active = true;
    const ctrl = new AbortController();

    const connect = async () => {
      try {
        const res = await fetch(`${BASE}/superadmin/events`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) return;

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';

        while (active) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          const parts = buf.split('\n\n');
          buf = parts.pop() ?? '';

          for (const part of parts) {
            const line = part.split('\n').find((l) => l.startsWith('data: '));
            if (!line) continue;
            try {
              const msg = JSON.parse(line.slice(6));
              if (msg.type === 'school.registered') {
                const p = msg.payload;
                setNewAlert(p);
                toast.success(
                  `🏫 Nouvelle inscription : ${p.name} — ${p.city}`,
                  { duration: 8000 },
                );
                loadRef.current?.();
              }
            } catch { /* ignore parse errors */ }
          }
        }
      } catch {
        if (active) setTimeout(connect, 5000); // reconnect after 5 s
      }
    };

    connect();
    return () => { active = false; ctrl.abort(); };
  }, []);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await institutionsService.listAllInstitutions();
      const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setInstitutions(data);
      const nm = {};
      const pm = {};
      data.forEach((i) => {
        nm[i.id] = i.ownerNotes ?? '';
        pm[i.id] = i.subscriptionPlan ?? '';
      });
      setNotesMap(nm);
      setPlanMap(pm);
    } catch {
      setError('Impossible de charger les institutions. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRef.current = load; });
  useEffect(() => { load(); }, []);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:        institutions.length,
    pending:      institutions.filter((i) => i.status === 'PENDING').length,
    active:       institutions.filter((i) => i.status === 'ACTIVE').length,
    suspended:    institutions.filter((i) => i.status === 'SUSPENDED').length,
    totalStudents: institutions.reduce((s, i) => s + (i.actualStudentCount ?? 0), 0),
    totalBulletins: institutions.reduce((s, i) => s + (i.bulletinCount ?? 0), 0),
  }), [institutions]);

  // ── Filtered + searched list ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = filter === 'ALL' ? institutions : institutions.filter((i) => i.status === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (i) =>
          i.name?.toLowerCase().includes(q) ||
          i.city?.toLowerCase().includes(q) ||
          i.admin?.email?.toLowerCase().includes(q) ||
          i.admin?.name?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [institutions, filter, search]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const doAction = async (id, action) => {
    setActionLoading((prev) => ({ ...prev, [id]: action }));
    try {
      if (action === 'approve') await institutionsService.approveInstitution(id);
      if (action === 'suspend') await institutionsService.suspendInstitution(id);
      if (action === 'reject')  await institutionsService.rejectInstitution(id);
      await load();
    } catch {
      alert('Action échouée. Réessayez.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: null }));
    }
  };

  const saveNotes = async (id) => {
    setSavingNotes((prev) => ({ ...prev, [id]: true }));
    try {
      await institutionsService.updateInstitutionNotes(id, notesMap[id] ?? '');
      setInstitutions((prev) =>
        prev.map((i) => (i.id === id ? { ...i, ownerNotes: notesMap[id] } : i)),
      );
    } catch {
      alert('Impossible de sauvegarder les notes.');
    } finally {
      setSavingNotes((prev) => ({ ...prev, [id]: false }));
    }
  };

  const savePlan = async (id) => {
    setSavingPlan((prev) => ({ ...prev, [id]: true }));
    try {
      await institutionsService.updateSubscriptionPlan(id, planMap[id] ?? '');
      setInstitutions((prev) =>
        prev.map((i) => (i.id === id ? { ...i, subscriptionPlan: planMap[id] || null } : i)),
      );
    } catch {
      alert('Impossible de mettre à jour le plan.');
    } finally {
      setSavingPlan((prev) => ({ ...prev, [id]: false }));
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AppShell title="Super-Admin — Tableau de bord">
      <div className="sa-page">

        {/* Real-time new-registration banner */}
        {newAlert && (
          <div className="sa-alert-banner">
            <div className="sa-alert-banner__icon">🏫</div>
            <div className="sa-alert-banner__body">
              <strong>Nouvelle inscription reçue !</strong>
              <span>{newAlert.name} — {newAlert.city}</span>
              <span className="sa-alert-banner__email">{newAlert.adminEmail}</span>
            </div>
            <div className="sa-alert-banner__actions">
              <button
                className="sa-alert-banner__btn"
                onClick={() => {
                  setFilter('PENDING');
                  setNewAlert(null);
                }}
              >
                Voir les demandes en attente →
              </button>
              <button className="sa-alert-banner__close" onClick={() => setNewAlert(null)} aria-label="Fermer">✕</button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="sa-header">
          <h1 className="sa-title">Gestion des établissements</h1>
          <button className="sa-refresh-btn" onClick={load} disabled={loading} aria-label="Actualiser">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            Actualiser
          </button>
        </div>

        {/* Stats row */}
        <div className="sa-stats-row">
          <StatCard label="Total écoles"   value={stats.total}          cls="sa-stat--total" />
          <StatCard label="En attente"     value={stats.pending}        cls="sa-stat--pending" />
          <StatCard label="Actives"        value={stats.active}         cls="sa-stat--active" />
          <StatCard label="Suspendues"     value={stats.suspended}      cls="sa-stat--suspended" />
          <StatCard label="Élèves (total)" value={stats.totalStudents}  cls="sa-stat--students" />
          <StatCard label="Bulletins émis" value={stats.totalBulletins} cls="sa-stat--bulletins" />
        </div>

        {/* Filters + search */}
        <div className="sa-toolbar">
          <div className="sa-filters" role="tablist" aria-label="Filtrer par statut">
            {[
              { key: 'ALL',       label: 'Toutes' },
              { key: 'PENDING',   label: 'En attente' },
              { key: 'ACTIVE',    label: 'Actives' },
              { key: 'SUSPENDED', label: 'Suspendues' },
              { key: 'REJECTED',  label: 'Rejetées' },
            ].map(({ key, label }) => (
              <button
                key={key}
                role="tab"
                aria-selected={filter === key}
                className={`sa-filter-btn${filter === key ? ' sa-filter-btn--active' : ''}`}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            type="search"
            className="sa-search"
            placeholder="Rechercher école, ville, admin…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Content states */}
        {loading && (
          <div className="sa-loading">
            <div className="sa-spinner" /><span>Chargement...</span>
          </div>
        )}

        {error && !loading && (
          <div className="sa-error">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="sa-empty">Aucun établissement pour ce filtre.</div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="sa-table-wrapper">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>École</th>
                  <th>Statut</th>
                  <th>Élèves déclarés / Réels</th>
                  <th>Inscription</th>
                  <th>Plan</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inst) => {
                  const isExpanded = expandedId === inst.id;
                  const aL = actionLoading[inst.id];
                  const overQuota =
                    inst.declaredStudentCount &&
                    inst.actualStudentCount > inst.declaredStudentCount * 1.1;

                  return (
                    <>
                      <tr
                        key={inst.id}
                        className={`sa-row${isExpanded ? ' sa-row--expanded' : ''}`}
                        onClick={() => setExpandedId(isExpanded ? null : inst.id)}
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && setExpandedId(isExpanded ? null : inst.id)}
                        aria-expanded={isExpanded}
                      >
                        {/* École */}
                        <td className="sa-cell sa-cell--school">
                          {inst.logo && (
                            <img src={inst.logo} alt="" className="sa-school-logo" />
                          )}
                          <span className="sa-cell--school-text">
                            <span className="sa-school-name">{inst.name}</span>
                            <span className="sa-school-city">{inst.city || '—'}{inst.country ? ` · ${inst.country}` : ''}</span>
                            {inst.admin && (
                              <span className="sa-school-admin">{inst.admin.name} — {inst.admin.email}</span>
                            )}
                          </span>
                          <span className="sa-expand-icon">{isExpanded ? '▲' : '▼'}</span>
                        </td>

                        {/* Statut */}
                        <td className="sa-cell"><StatusBadge status={inst.status} /></td>

                        {/* Élèves */}
                        <td className="sa-cell sa-cell--students">
                          <span className={overQuota ? 'sa-overquota' : ''}>
                            {inst.declaredStudentCount ?? '—'} / {inst.actualStudentCount ?? 0}
                            {overQuota && <span className="sa-warn-icon" title="Dépassement de quota"> ⚠️</span>}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="sa-cell sa-cell--date">{fmtDate(inst.createdAt)}</td>

                        {/* Plan */}
                        <td className="sa-cell">
                          {inst.subscriptionPlan
                            ? <span className="sa-plan">{inst.subscriptionPlan}</span>
                            : <span className="sa-no-plan">—</span>}
                        </td>

                        {/* Actions */}
                        <td className="sa-cell sa-cell--actions" onClick={(e) => e.stopPropagation()}>
                          {inst.status !== 'ACTIVE' && (
                            <button className="sa-action-btn sa-action-btn--approve"
                              onClick={() => doAction(inst.id, 'approve')} disabled={!!aL}>
                              {aL === 'approve' ? '...' : 'Approuver'}
                            </button>
                          )}
                          {inst.status !== 'SUSPENDED' && inst.status !== 'REJECTED' && (
                            <button className="sa-action-btn sa-action-btn--suspend"
                              onClick={() => doAction(inst.id, 'suspend')} disabled={!!aL}>
                              {aL === 'suspend' ? '...' : 'Suspendre'}
                            </button>
                          )}
                          {inst.status !== 'REJECTED' && (
                            <button className="sa-action-btn sa-action-btn--reject"
                              onClick={() => doAction(inst.id, 'reject')} disabled={!!aL}>
                              {aL === 'reject' ? '...' : 'Rejeter'}
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Expanded school profile */}
                      {isExpanded && (
                        <tr key={`${inst.id}-profile`} className="sa-profile-row">
                          <td colSpan={6}>
                            <SchoolProfile
                              inst={inst}
                              notesMap={notesMap}
                              setNotesMap={setNotesMap}
                              savingNotes={savingNotes}
                              saveNotes={saveNotes}
                              savingPlan={savingPlan}
                              savePlan={savePlan}
                              planMap={planMap}
                              setPlanMap={setPlanMap}
                            />
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default SuperAdminPage;
