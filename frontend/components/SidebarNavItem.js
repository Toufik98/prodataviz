'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function SidebarNavItem({ href, label, icon, section }) {
    const t = useTranslations();
    const pathname = usePathname();

    if (section) {
        return <div className="nav-section">{t(section)}</div>;
    }

    // Handle paths like /fr/explorer to match with /explorer
    const isActive = pathname.endsWith(href) && (pathname === href || pathname === `/fr${href}` || pathname === `/en${href}` || (href === '/' && (pathname === '/fr' || pathname === '/en')));

    return (
        <Link
            href={href}
            className={`nav-link ${isActive ? 'active' : ''}`}
        >
            <span className="icon">{icon}</span>
            {t(label)}
        </Link>
    );
}
