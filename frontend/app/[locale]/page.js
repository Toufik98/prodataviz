import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import DashboardClient from './DashboardClient';
import { apiFetch } from '@/lib/api';

export default function Dashboard() {
  return <DashboardClient />;
}
