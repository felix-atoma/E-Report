import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../../services/api';
import './BulletinVerifyPage.css';

function fmt(v) {
  if (v == null) return '—';
  return Number(v).toFixed(2).replace('.', ',');
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function BulletinVerifyPage() {
  const [searchParams] = useSearchParams();
  const [code, setCode]       = useState(searchParams.get('code') ?? '');
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleVerify = async (e) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await api.get(`/reports/verify/${encodeURIComponent(trimmed)}`);
      setResult(res.data);
    } catch {
      setError('Erreur de connexion. Vérifiez votre réseau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bv-page">
      <div className="bv-card">
        <div className="bv-header">
          <div className="bv-header__icon">🔐</div>
          <div className="bv-header__title">Vérification de bulletin</div>
          <div className="bv-header__sub">
            Entrez le numéro de sécurité imprimé sur le bulletin pour confirmer son authenticité.
          </div>
        </div>

        <form className="bv-form" onSubmit={handleVerify}>
          <input
            className="bv-input"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Ex : 2425T1-AB3K-MNPQ"
            maxLength={16}
            autoFocus
            spellCheck={false}
          />
          <button className="bv-btn" type="submit" disabled={loading || !code.trim()}>
            {loading ? 'Vérification…' : 'Vérifier'}
          </button>
        </form>

        {error && <div className="bv-error">{error}</div>}

        {result && (
          result.valid ? (
            <div className="bv-valid">
              <div className="bv-valid__badge">✅ Bulletin authentique</div>
              <div className="bv-valid__grid">
                <div className="bv-valid__row">
                  <span className="bv-valid__label">Élève</span>
                  <span className="bv-valid__val bv-valid__val--big">{result.studentName}</span>
                </div>
                <div className="bv-valid__row">
                  <span className="bv-valid__label">Matricule</span>
                  <span className="bv-valid__val">{result.admissionNumber ?? '—'}</span>
                </div>
                <div className="bv-valid__row">
                  <span className="bv-valid__label">Classe</span>
                  <span className="bv-valid__val">{result.className}</span>
                </div>
                <div className="bv-valid__row">
                  <span className="bv-valid__label">Année scolaire</span>
                  <span className="bv-valid__val">{result.academicYear}</span>
                </div>
                <div className="bv-valid__row">
                  <span className="bv-valid__label">Période</span>
                  <span className="bv-valid__val">{result.termName}</span>
                </div>
                <div className="bv-valid__row">
                  <span className="bv-valid__label">Moyenne générale</span>
                  <span className={`bv-valid__val bv-valid__val--avg ${(result.overallAverage ?? 0) >= 10 ? 'bv-pass' : 'bv-fail'}`}>
                    {fmt(result.overallAverage)} / 20
                  </span>
                </div>
                <div className="bv-valid__row">
                  <span className="bv-valid__label">Mention</span>
                  <span className="bv-valid__val">{result.mention ?? '—'}</span>
                </div>
                <div className="bv-valid__row">
                  <span className="bv-valid__label">Rang</span>
                  <span className="bv-valid__val">{result.classRank ?? '—'} / {result.classSize ?? '—'}</span>
                </div>
                <div className="bv-valid__row">
                  <span className="bv-valid__label">Publié le</span>
                  <span className="bv-valid__val">{fmtDate(result.publishedAt)}</span>
                </div>
                <div className="bv-valid__row">
                  <span className="bv-valid__label">Code sécurité</span>
                  <span className="bv-valid__val bv-valid__val--code">{result.securityCode}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bv-invalid">
              <div className="bv-invalid__icon">❌</div>
              <div className="bv-invalid__msg">{result.message}</div>
              <div className="bv-invalid__hint">
                Ce code ne correspond à aucun bulletin publié dans le système. Le document pourrait être un faux ou le code mal saisi.
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
