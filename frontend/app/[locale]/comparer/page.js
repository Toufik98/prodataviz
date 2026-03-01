'use client';

import { useEffect, useState } from 'react';
import { Radar } from 'react-chartjs-2';
import {
    Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend,
} from 'chart.js';
import { apiFetch } from '@/lib/api';
import { useTranslations } from 'next-intl';
import { Scale, Loader2 } from 'lucide-react';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#a855f7'];

export default function Comparer() {
    const t = useTranslations('Comparer');
    const [etabs, setEtabs] = useState([]);
    const [selected, setSelected] = useState([]);
    const [search, setSearch] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        apiFetch('/api/etablissements').then(setEtabs);
    }, []);

    const filtered = etabs.filter(e =>
        e.nom.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 10);

    const toggleEtab = (id) => {
        setSelected(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 5 ? [...prev, id] : prev
        );
    };

    const compare = () => {
        if (selected.length < 2) return;
        setLoading(true);
        const params = new URLSearchParams();
        selected.forEach(id => params.append('ids', id));
        apiFetch(`/api/analytics/comparer?${params}`)
            .then(setResult)
            .finally(() => setLoading(false));
    };

    const chartData = result ? {
        labels: [t('col_insertion'), t('col_salary'), t('col_executive'), t('col_stable'), t('col_fulltime')],
        datasets: result.map((r, i) => ({
            label: r.etablissement,
            data: [
                r.taux_insertion || 0,
                r.salaire_net_median ? (r.salaire_net_median / 30) : 0, // normalize
                r.emplois_cadre || 0,
                r.emplois_stables || 0,
                r.emplois_temps_plein || 0,
            ],
            borderColor: COLORS[i],
            backgroundColor: `${COLORS[i]}30`,
            pointBackgroundColor: COLORS[i],
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: COLORS[i],
        })),
    } : null;

    return (
        <>
            <div className="page-header">
                <h1><Scale className="page-header-icon" /> {t('title')}</h1>
                <p>{t('subtitle')}</p>
            </div>

            <div className="grid-2" style={{ marginBottom: 32 }}>
                <div className="card">
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 16 }}>{t('select_title')}</h3>
                    <input
                        className="text-input"
                        placeholder={t('search_placeholder')}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ width: '100%', marginBottom: 16 }}
                    />
                    <div style={{ maxHeight: 220, overflow: 'auto', background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8, border: '1px solid var(--glass-border)' }}>
                        {filtered.map(e => (
                            <label key={e.id} style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
                                borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.9rem',
                                border: '1px solid transparent',
                                background: selected.includes(e.id) ? 'var(--glass-bg-hover)' : 'transparent',
                                borderColor: selected.includes(e.id) ? 'var(--glass-border-strong)' : 'transparent',
                                transition: 'all 0.2s',
                                marginBottom: 4
                            }}>
                                <input
                                    type="checkbox"
                                    checked={selected.includes(e.id)}
                                    onChange={() => toggleEtab(e.id)}
                                    style={{ accentColor: 'var(--accent)' }}
                                />
                                <span style={{ fontWeight: 500 }}>{e.nom}</span>
                                <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {e.academie_nom}
                                </span>
                            </label>
                        ))}
                    </div>
                    <button
                        className="btn btn-primary"
                        style={{ marginTop: 24, width: '100%' }}
                        disabled={selected.length < 2 || loading}
                        onClick={compare}
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Scale size={16} />} {t('btn_compare', { count: selected.length })}
                    </button>
                </div>

                {chartData && (
                    <div className="chart-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <h3 style={{ width: '100%' }}>{t('chart_radar')}</h3>
                        <div style={{ width: '100%', maxWidth: '400px' }}>
                            <Radar
                                data={chartData}
                                options={{
                                    responsive: true,
                                    scales: {
                                        r: {
                                            ticks: { color: '#94a3b8', backdropColor: 'transparent' },
                                            grid: { color: 'rgba(255,255,255,0.1)' },
                                            pointLabels: { color: '#e2e8f0', font: { size: 12, family: 'Inter' } },
                                            angleLines: { color: 'rgba(255,255,255,0.1)' }
                                        },
                                    },
                                    plugins: {
                                        legend: { labels: { color: '#e2e8f0', font: { size: 12, family: 'Inter' } } },
                                        tooltip: {
                                            backgroundColor: 'rgba(17, 24, 39, 0.9)',
                                            titleFont: { family: "'Inter', sans-serif" },
                                            bodyFont: { family: "'Inter', sans-serif" },
                                            padding: 12,
                                            cornerRadius: 8,
                                            borderColor: 'rgba(255, 255, 255, 0.1)',
                                            borderWidth: 1,
                                        }
                                    },
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {result && (
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>{t('col_university')}</th>
                                <th>{t('col_insertion')}</th>
                                <th>{t('col_salary')}</th>
                                <th>{t('col_executive')}</th>
                                <th>{t('col_stable')}</th>
                                <th>{t('col_fulltime')}</th>
                                <th>{t('col_out_region')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {result.map((r, i) => (
                                <tr key={i}>
                                    <td><strong>{r.etablissement}</strong></td>
                                    <td className="num">{r.taux_insertion ?? '—'}</td>
                                    <td className="num">{r.salaire_net_median != null ? `${r.salaire_net_median.toLocaleString()} €` : '—'}</td>
                                    <td className="num">{r.emplois_cadre ?? '—'}</td>
                                    <td className="num">{r.emplois_stables ?? '—'}</td>
                                    <td className="num">{r.emplois_temps_plein ?? '—'}</td>
                                    <td className="num">{r.emplois_hors_region ?? '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}
