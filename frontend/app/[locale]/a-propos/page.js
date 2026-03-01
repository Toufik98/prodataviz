'use client';

import { useTranslations } from 'next-intl';
import { Info, BarChart3, Wrench, Zap, Palette, Package, Database, FolderOpen, Users } from 'lucide-react';

export default function APropos() {
    const t = useTranslations('About');

    return (
        <>
            <div className="page-header">
                <h1><Info className="page-header-icon" /> {t('title')}</h1>
                <p>{t('subtitle')}</p>
            </div>

            <div className="grid-2">
                <div className="card">
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 16, color: 'var(--accent-light)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BarChart3 size={24} /> {t('card_project')}
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '0.95rem' }}>
                        {t('desc_project')}
                    </p>
                    <div style={{ marginTop: 24, padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Wrench size={18} /> {t('tech_stack')}
                        </h4>
                        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <li style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}><Zap size={16} /> <strong>Backend</strong> : FastAPI + SQLAlchemy + SQLite</li>
                            <li style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}><Palette size={16} /> <strong>Frontend</strong> : Next.js 14 + Chart.js + Monaco Editor</li>
                            <li style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}><Package size={16} /> <strong>Tools</strong> : uv, npm, next-intl</li>
                            <li style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}><Database size={16} /> <strong>Database</strong> : SQLite (7 tables normalized, 3NF)</li>
                        </ul>
                    </div>
                </div>

                <div className="card">
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 16, color: 'var(--accent-light)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FolderOpen size={24} /> {t('card_source')}
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '0.95rem' }}>
                        {t('desc_source')}
                    </p>
                    <div style={{ marginTop: 24 }}>
                        <div className="kpi-grid" style={{ marginBottom: 0, gap: 16, gridTemplateColumns: 'repeat(2, 1fr)' }}>
                            <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{t('kpi_period')}</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>2010 — 2020</div>
                            </div>
                            <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{t('kpi_records')}</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>19,603</div>
                            </div>
                            <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{t('kpi_universities')}</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>100</div>
                            </div>
                            <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{t('kpi_disciplines')}</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>20</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginTop: 24, textAlign: 'center', padding: '40px 24px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><Users size={24} /> {t('card_authors')}</h3>
                <p style={{ color: 'var(--text-primary)', fontSize: '1.1rem' }}>
                    <strong>{t('desc_authors')}</strong>
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 8, fontWeight: 500 }}>
                    {t('desc_context')}
                </p>
            </div>
        </>
    );
}
