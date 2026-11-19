import { notFound } from 'next/navigation';
import { allChecks, getCheck } from '@/data/source';
import { Shell } from '@/ui/shell';
import { Report } from '@/ui/report';

export async function generateStaticParams() {
  if (process.env['STATIC'] !== '1') return [];
  return (await allChecks()).map((c) => ({ id: c.id }));
}

export default async function CheckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const check = await getCheck(id);
  if (!check) notFound();
  return (
    <Shell crumbs={[{ label: 'Release checks', href: '/' }, { label: `${check.agentName} · ${check.base.label} → ${check.candidate.label}` }]}>
      <Report check={check} />
    </Shell>
  );
}
