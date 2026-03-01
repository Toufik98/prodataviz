/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
} from 'chart.js';
import { apiFetch } from '@/lib/api';
import { useTranslations } from 'next-intl';
import { Trophy, Banknote, TrendingUp } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];

export default function Classements() {
    const t = useTranslations('Classements');
    const [topSalaires, setTopSalaires] = useState(null);
    const [topInsertion, setTopInsertion] = useState(null);
    const [disciplines, setDisciplines] = useState([]);
    const [discipline, setDiscipline] = useState('');
    const [annee, setAnnee] = useState('2020');
    const [loading, setLoading] = useState(true);
    const years = ['2010', '2011', '2012', '2013', '2014', '2015', '2016', '2017', '2018', '2019', '2020'];

    useEffect(() => {
        apiFetch('/api/disciplines').then(setDisciplines);
    }, []);

    useEffect(() => {
        setLoading(true);
        const params = new URLSearchParams();
        params.set('limit', '15');
        params.set('situation', '30 mois après le diplôme');
        if (annee) params.set('annee', annee);
        if (discipline) params.set('discipline', discipline);

        Promise.all([
            apiFetch(`/api/analytics/top-salaires?${params}`),
            apiFetch(`/api/analytics/top-insertion?${params}`),
        ]).then(([s, i]) => {
            setTopSalaires(s);
            setTopInsertion(i);
            setLoading(false);
        });
    }, [annee, discipline]);

    const truncLabel = (s, max = 30) => s.length > max ? s.substring(0, max) + '…' : s;

    const chartOptions = {
        indexAxis: 'y',
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
            x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { ticks: { color: '#e2e8f0', font: { size: 12, weight: '500' } }, grid: { display: false } },
        },
    };

    return (
        <>
            <div className="page-header">
                <h1><Trophy className="page-header-icon" /> {t('title')}</h1>
                <p>{t('subtitle')}</p>
            </div>

            <div className="filters glass-panel" style={{ padding: '16px 24px' }}>
                <select className="select-input" value={annee} onChange={e => setAnnee(e.target.value)}>
                    <option value="">{t('all_years')}</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select className="select-input" value={discipline} onChange={e => setDiscipline(e.target.value)}>
                    <option value="">{t('all_disciplines')}</option>
                    {disciplines.map(d => <option key={d.code} value={d.code}>{d.nom}</option>)}
                </select>
            </div>

            {loading ? (
                <div className="loading"><div className="spinner" /> Chargement...</div>
            ) : (
                <div className="grid-2">
                    {topSalaires && (
                        <div className="chart-container">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Banknote size={20} /> {t('chart_salary')}</h3>
                            <Bar
                                data={{
                                    labels: topSalaires.map(d => truncLabel(`${d.etablissement}`)),
                                    datasets: [{
                                        label: t('y_axis_salary'),
                                        data: topSalaires.map(d => d.salaire_net_median),
                                        backgroundColor: COLORS,
                                        borderRadius: 8,
                                    }],
                                }}
                                options={{
                                    ...chartOptions,
                                    plugins: { ...chartOptions.plugins, tooltip: { ...chartOptions.plugins.tooltip, callbacks: { label: c => `${c.parsed.x?.toLocaleString()} €` } } },
                                    scales: { ...chartOptions.scales, x: { ...chartOptions.scales.x, ticks: { ...chartOptions.scales.x.ticks, callback: v => `${v} €` } } }
                                }}
                            />
                        </div>
                    )}

                    {topInsertion && (
                        <div className="chart-container">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><TrendingUp size={20} /> {t('chart_insertion')}</h3>
                            <Bar
                                data={{
                                    labels: topInsertion.map(d => truncLabel(`${d.etablissement}`)),
                                    datasets: [{
                                        label: t('y_axis_insertion'),
                                        data: topInsertion.map(d => d.taux_insertion),
                                        backgroundColor: COLORS,
                                        borderRadius: 8,
                                    }],
                                }}
                                options={{
                                    ...chartOptions,
                                    plugins: { ...chartOptions.plugins, tooltip: { ...chartOptions.plugins.tooltip, callbacks: { label: c => `${c.parsed.x} %` } } },
                                    scales: { ...chartOptions.scales, x: { ...chartOptions.scales.x, max: 100, ticks: { ...chartOptions.scales.x.ticks, callback: v => `${v} %` } } }
                                }}
                            />
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
