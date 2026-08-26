import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function SummerShutDownPage() {
  redirect('/planes-pasados?weekend=2026-07-11');
}
