'use client';

import { useEffect, useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement,
    LineElement, PointElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { apiFetch } from '@/lib/api';
import { useTranslations } from 'next-intl';
import {
    BarChart3,
    TrendingUp,
    Building2,
    MapPin,
    GraduationCap,
    Trophy,
    BookOpen
} from 'lucide-react';

ChartJS.register(
    CategoryScale, LinearScale, BarElement, LineElement,
    PointElement, Title, Tooltip, Legend, Filler
);

const CHART_COLORS = [
    '#6366f1', '#a855f7', '#ec4899', '#f59e0b',
    '#10b981', '#3b82f6', '#ef4444', '#8b5cf6',
];

export default function DashboardClient() {
    const t = useTranslations('Dashboard');
    const [stats, setStats] = useState(null);
    const [evolution, setEvolution] = useState(null);
    const [topSalaires, setTopSalaires] = useState(null);
    const [domaines, setDomaines] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            apiFetch('/api/sql/schema'),
            apiFetch('/api/analytics/evolution?indicateur=salaire_net_median&discipline=disc16'),
            apiFetch('/api/analytics/top-salaires?limit=10&situation=30+mois+après+le+diplôme'),
            apiFetch('/api/domaines'),
        ]).then(([schema, evo, top, dom]) => {
            setStats(schema);
            setEvolution(evo);
            setTopSalaires(top);
            setDomaines(dom);
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return <div className="loading"><div className="spinner" /> {t('loading')}</div>;
    }

    const totalStats = stats?.statistique?.row_count || 0;
    const totalEtabs = stats?.etablissement?.row_count || 0;
    const totalAcademies = stats?.academie?.row_count || 0;
    const totalDisciplines = stats?.discipline?.row_count || 0;

    const evoChart = evolution ? {
        labels: evolution.map(d => d.annee),
        datasets: [{
            label: t('chart_evolution'),
            data: evolution.map(d => d.valeur),
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.15)',
            fill: true,
            tension: 0.4,
            pointRadius: 6,
            pointBackgroundColor: '#6366f1',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
        }],
    } : null;

    const topChart = topSalaires ? {
        labels: topSalaires.map(d => `${d.etablissement} (${d.discipline})`).map(l => l.length > 35 ? l.substring(0, 35) + '…' : l),
        datasets: [{
            label: 'Salaire',
            data: topSalaires.map(d => d.salaire_net_median),
            backgroundColor: CHART_COLORS.slice(0, topSalaires.length),
            borderRadius: 8,
            borderSkipped: false,
        }],
    } : null;

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(17, 24, 39, 0.9)',
                titleFont: { family: "'Inter', sans-serif", size: 14 },
                bodyFont: { family: "'Inter', sans-serif", size: 13 },
                padding: 12,
                cornerRadius: 8,
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
            },
        },
        scales: {
            x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
            y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
        },
    };

    return (
        <>
            <div className="page-header">
                <h1><BarChart3 className="page-header-icon" /> {t('title')}</h1>
                <p>{t('subtitle')}</p>
            </div>

            <div className="kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-icon"><TrendingUp size={32} /></div>
                    <div className="kpi-label">{t('kpi_observations')}</div>
                    <div className="kpi-value">{totalStats.toLocaleString()}</div>
                    <div className="card-subtitle">{t('kpi_observations_desc')}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon"><Building2 size={32} /></div>
                    <div className="kpi-label">{t('kpi_universities')}</div>
                    <div className="kpi-value">{totalEtabs}</div>
                    <div className="card-subtitle">{t('kpi_universities_desc')}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon"><MapPin size={32} /></div>
                    <div className="kpi-label">{t('kpi_academies')}</div>
                    <div className="kpi-value">{totalAcademies}</div>
                    <div className="card-subtitle">{t('kpi_academies_desc')}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon"><GraduationCap size={32} /></div>
                    <div className="kpi-label">{t('kpi_disciplines')}</div>
                    <div className="kpi-value">{totalDisciplines}</div>
                    <div className="card-subtitle">{t('kpi_disciplines_desc', { count: domaines?.length || 5 })}</div>
                </div>
            </div>

            <div className="grid-2" style={{ marginBottom: 32 }}>
                {evoChart && (
                    <div className="chart-container">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><TrendingUp size={20} /> {t('chart_evolution')}</h3>
                        <Line
                            data={evoChart}
                            options={{
                                ...chartOptions,
                                plugins: { ...chartOptions.plugins, tooltip: { ...chartOptions.plugins.tooltip, callbacks: { label: ctx => `${ctx.parsed.y?.toLocaleString()} €` } } },
                                scales: { ...chartOptions.scales, y: { ...chartOptions.scales.y, ticks: { ...chartOptions.scales.y.ticks, callback: v => `${v} €` } } }
                            }}
                        />
                    </div>
                )}

                {topChart && (
                    <div className="chart-container">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Trophy size={20} /> {t('chart_top_salaries')}</h3>
                        <Bar
                            data={topChart}
                            options={{
                                ...chartOptions,
                                indexAxis: 'y',
                                plugins: { ...chartOptions.plugins, tooltip: { ...chartOptions.plugins.tooltip, callbacks: { label: ctx => `${ctx.parsed.x?.toLocaleString()} €` } } },
                                scales: {
                                    x: { ticks: { color: '#94a3b8', callback: v => `${v} €` }, grid: { color: 'rgba(255,255,255,0.05)' } },
                                    y: { ticks: { color: '#e2e8f0', font: { size: 12, weight: '500' } }, grid: { display: false } },
                                },
                            }}
                        />
                    </div>
                )}
            </div>

            {domaines && (
                <div className="chart-container">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><BookOpen size={20} /> {t('chart_domains')}</h3>
                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                        {domaines.map((d, i) => (
                            <div key={d.code} style={{
                                flex: 1,
                                minWidth: 160,
                                padding: '20px',
                                background: 'rgba(0,0,0,0.2)',
                                borderRadius: 'var(--radius-md)',
                                borderLeft: `4px solid ${CHART_COLORS[i % CHART_COLORS.length]}`,
                                boxShadow: 'var(--shadow-sm)'
                            }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '1px' }}>{d.code}</div>
                                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 8, color: 'var(--text-primary)' }}>{d.nom}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{d.nb_disciplines} {t('d_disciplines')}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}
