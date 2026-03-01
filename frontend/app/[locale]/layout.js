import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import '../globals.css';
import SidebarNavItem from '@/components/SidebarNavItem';
import LanguageSwitcher from '@/components/LanguageSwitcher';

import {
    LayoutDashboard,
    Search,
    Trophy,
    Scale,
    Database,
    Target,
    Info,
    Sparkles,
    TableProperties
} from 'lucide-react';

export async function generateMetadata({ params }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'Dashboard' });
    return {
        title: `ProDataViz — ${t('title')}`,
        description: t('subtitle')
    };
}

export default async function LocaleLayout({ children, params }) {
    const { locale } = await params;
    // Ensure that the incoming `locale` is valid
    if (!['en', 'fr'].includes(locale)) notFound();

    // Providing all messages to the client
    // side is the easiest way to get started
    const messages = await getMessages();

    return (
        <html lang={locale}>
            <body>
                <NextIntlClientProvider messages={messages} locale={locale}>
                    <div className="app-layout">
                        <aside className="sidebar glass-panel">
                            <div className="sidebar-logo">
                                <img src="/logo.png" alt="ProDataViz Logo" style={{ width: 36, height: 36, borderRadius: '8px', boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)' }} />
                                <div>
                                    <h1>ProDataViz</h1>
                                    <p>Insertion Masters</p>
                                </div>
                            </div>

                            <nav className="sidebar-nav">
                                <SidebarNavItem section="Nav.visualisation" />
                                <SidebarNavItem href="/" label="Nav.dashboard" icon={<LayoutDashboard size={18} />} />
                                <SidebarNavItem href="/explorer" label="Nav.explorer" icon={<Search size={18} />} />
                                <SidebarNavItem href="/classements" label="Nav.classements" icon={<Trophy size={18} />} />
                                <SidebarNavItem href="/comparer" label="Nav.comparer" icon={<Scale size={18} />} />

                                <SidebarNavItem section="Nav.sql" />
                                <SidebarNavItem href="/apprendre-sql" label="Nav.learn_sql" icon={<Sparkles size={18} />} />
                                <SidebarNavItem href="/sql-lab" label="Nav.sql_lab" icon={<Database size={18} />} />
                                <SidebarNavItem href="/defis" label="Nav.challenges" icon={<Target size={18} />} />

                                <SidebarNavItem section="Nav.info" />
                                <SidebarNavItem href="/schema" label="Nav.schema" icon={<TableProperties size={18} />} />
                                <SidebarNavItem href="/a-propos" label="Nav.about" icon={<Info size={18} />} />
                            </nav>

                            <div className="sidebar-footer">
                                <LanguageSwitcher currentLocale={locale} />
                            </div>
                        </aside>
                        <main className="main-content">
                            {children}
                        </main>
                    </div>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
