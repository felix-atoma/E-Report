import { useQuery } from '@tanstack/react-query';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Loading from '../../../components/common/Loading/Loading';
import { institutionsService } from '../../../services/institutionsService';
import DirectorSignatureCard from '../BrandingPage/DirectorSignatureCard';
import '../BrandingPage/BrandingPage.css';

/** Page directe « Signature du directeur » (aussi présente dans Apparence). */
export default function DirectorSignaturePage() {
  const { data: institution, isLoading } = useQuery({ queryKey: ['institution-me'], queryFn: () => institutionsService.me().then((r) => r.data) });
  return (
    <AppShell title="Signature du directeur">
      <PageHeader title="Signature du directeur" subtitle="Signée ou importée une seule fois, elle s'imprime sur les bulletins publiés, les relevés et les cartes d'élève." />
      {isLoading ? <Loading /> : <DirectorSignatureCard institution={institution} />}
    </AppShell>
  );
}
