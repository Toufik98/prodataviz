'use client';

import { usePathname, useRouter } from 'next/navigation';

export default function LanguageSwitcher({ currentLocale }) {
    const router = useRouter();
    const pathname = usePathname();

    const switchLocale = (newLocale) => {
        let pathWithoutLocale = pathname;
        if (pathname.startsWith('/fr/') || pathname === '/fr') {
            pathWithoutLocale = pathname.replace(/^\/fr/, '');
        } else if (pathname.startsWith('/en/') || pathname === '/en') {
            pathWithoutLocale = pathname.replace(/^\/en/, '');
        }

        if (pathWithoutLocale === '') pathWithoutLocale = '/';

        const newPath = `/${newLocale}${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`;

        router.push(newPath);
        router.refresh(); // Force client refetch with new locale cookie
    };

    return (
        <div className="lang-switcher">
            <button
                className={`lang-btn ${currentLocale === 'fr' ? 'active' : ''}`}
                onClick={() => switchLocale('fr')}
            >
                FR
            </button>
            <button
                className={`lang-btn ${currentLocale === 'en' ? 'active' : ''}`}
                onClick={() => switchLocale('en')}
            >
                EN
            </button>
        </div>
    );
}
