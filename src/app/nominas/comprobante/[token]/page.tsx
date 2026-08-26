import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { ComprobanteClient } from './ComprobanteClient';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ token: string }>;
}

export default async function ComprobantePage({ params }: Props) {
  const { token } = await params;

  if (!token) {
    notFound();
  }

  const log = await prisma.payrollLog.findUnique({
    where: { tokenHash: token },
  });

  if (!log) {
    notFound();
  }

  const logSerialized = {
    id: log.id,
    companyName: log.companyName,
    periodNumber: log.periodNumber,
    totalAmount: log.totalAmount,
    employeeCount: log.employeeCount,
    bankBreakdown: log.bankBreakdown,
    signedBy: log.signedBy,
    signedAt: log.signedAt ? log.signedAt.toISOString() : null,
    ipAddress: log.ipAddress,
    tokenHash: log.tokenHash,
    status: log.status,
    createdAt: log.createdAt.toISOString(),
  };

  return <ComprobanteClient log={logSerialized} />;
}
