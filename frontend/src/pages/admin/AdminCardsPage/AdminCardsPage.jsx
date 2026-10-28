import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Loading from '../../../components/common/Loading/Loading';
import { classesService } from '../../../services/classesService';
import { institutionsService } from '../../../services/institutionsService';
import '../AdminFichesPage/AdminFichesPage.css';

/** Cartes d'élève : choisir une classe pour imprimer ses cartes (QR code, photo, signature du directeur). */
export default function AdminCardsPage() {
  const { data: classes = [], isLoading } = useQuery({ queryKey: ['classes'], queryFn: () => classesService.list().then((r) => r.data) });
  const { data: inst } = useQuery({ queryKey: ['institution-me'], queryFn: () => institutionsService.me().then((r) => r.data) });
  const hasSig = !!inst?.brandingSettings?.directorSignature;
  return (
    <AppShell title="Cartes d'élèves">
      <PageHeader
        title="Cartes d'identité scolaire"
        subtitle="Choisissez une classe : les cartes de tous ses élèves s'affichent, prêtes à imprimer (10 par feuille A4)."
      />
      {inst && !hasSig && (
        <p className="afp-warn">
          ✍️ La signature du directeur n'est pas encore enregistrée : elle sera absente des cartes.{' '}
          <Link to="/admin/signature-directeur">Ajouter la signature →</Link>
        </p>
      )}
      {isLoading ? <Loading /> : (
        <div className="afp-classes">
          {classes.map((c) => (
            <Link key={c.id} to={`/classes/${c.id}/cartes`} className="afp-class">🪪 {c.name}</Link>
          ))}
          {!classes.length && <p className="afp-empty">Aucune classe.</p>}
        </div>
      )}
    </AppShell>
  );
}
