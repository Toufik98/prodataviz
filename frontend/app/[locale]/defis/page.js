'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement,
    LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { apiFetch, apiPost } from '@/lib/api';
import { useTranslations, useLocale } from 'next-intl';
import { Star, Target, Lightbulb, Play, Loader2, XCircle, CheckCircle2, LockOpen, BarChart3, TrendingUp } from 'lucide-react';

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

ChartJS.register(
    CategoryScale, LinearScale, BarElement, LineElement,
    PointElement, ArcElement, Title, Tooltip, Legend, Filler
);

const VIZ_COLORS = [
    '#6366f1', '#a855f7', '#ec4899', '#f59e0b',
    '#10b981', '#3b82f6', '#ef4444', '#8b5cf6',
    '#06b6d4', '#84cc16',
];

/* Chart component for visualization challenges */
function ResultChart({ vizType, vizConfig, rows }) {
    if (!rows || rows.length === 0) return null;
    const cfg = vizConfig || {};
    const xKey = cfg.x;
    const yKey = cfg.y;
    const chartLabel = cfg.label || '';

    const baseChartOpts = {
        responsive: true,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(17, 24, 39, 0.9)',
                titleFont: { family: "'Inter', sans-serif", size: 13 },
                bodyFont: { family: "'Inter', sans-serif", size: 12 },
                padding: 10, cornerRadius: 8,
                borderColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1,
            },
        },
        scales: {
            x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        },
    };

    if (vizType === 'bar') {
        return (
            <Bar
                data={{
                    labels: rows.map(r => r[xKey]),
                    datasets: [{ label: chartLabel, data: rows.map(r => r[yKey]), backgroundColor: VIZ_COLORS, borderRadius: 8, borderSkipped: false }],
                }}
                options={baseChartOpts}
            />
        );
    }

    if (vizType === 'horizontal_bar') {
        return (
            <Bar
                data={{
                    labels: rows.map(r => r[cfg.y]),
                    datasets: [{ label: chartLabel, data: rows.map(r => r[cfg.x]), backgroundColor: VIZ_COLORS, borderRadius: 8, borderSkipped: false }],
                }}
                options={{ ...baseChartOpts, indexAxis: 'y', scales: { ...baseChartOpts.scales, y: { ...baseChartOpts.scales.y, ticks: { ...baseChartOpts.scales.y.ticks, font: { size: 11 } }, grid: { display: false } } } }}
            />
        );
    }

    if (vizType === 'line') {
        return (
            <Line
                data={{
                    labels: rows.map(r => r[xKey]),
                    datasets: [{
                        label: chartLabel, data: rows.map(r => r[yKey]),
                        borderColor: '#6366f1', backgroundColor: 'rgba(99, 102, 241, 0.15)',
                        fill: true, tension: 0.4, pointRadius: 5,
                        pointBackgroundColor: '#6366f1', pointBorderColor: '#fff', pointBorderWidth: 2,
                    }],
                }}
                options={baseChartOpts}
            />
        );
    }

    if (vizType === 'multi_line') {
        const yKeys = Array.isArray(yKey) ? yKey : [yKey];
        const lineColors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];
        return (
            <Line
                data={{
                    labels: rows.map(r => r[xKey]),
                    datasets: yKeys.map((k, i) => ({
                        label: k, data: rows.map(r => r[k]),
                        borderColor: lineColors[i % lineColors.length],
                        backgroundColor: `${lineColors[i % lineColors.length]}20`,
                        fill: false, tension: 0.4, pointRadius: 4,
                        pointBackgroundColor: lineColors[i % lineColors.length],
                        pointBorderColor: '#fff', pointBorderWidth: 2,
                    })),
                }}
                options={{ ...baseChartOpts, plugins: { ...baseChartOpts.plugins, legend: { display: true, labels: { color: '#e2e8f0', font: { size: 12, family: 'Inter' } } } } }}
            />
        );
    }

    if (vizType === 'doughnut') {
        return (
            <div style={{ maxWidth: 350, margin: '0 auto' }}>
                <Doughnut
                    data={{
                        labels: rows.map(r => r[xKey]),
                        datasets: [{ data: rows.map(r => r[yKey]), backgroundColor: VIZ_COLORS, borderWidth: 2, borderColor: 'rgba(5,7,13,0.8)' }],
                    }}
                    options={{
                        responsive: true,
                        plugins: {
                            legend: { position: 'bottom', labels: { color: '#e2e8f0', font: { size: 12, family: 'Inter' }, padding: 16 } },
                            tooltip: baseChartOpts.plugins.tooltip,
                        },
                    }}
                />
            </div>
        );
    }

    return null;
}

export default function Defis() {
    const t = useTranslations('Defis');
    const locale = useLocale();
    const [challenges, setChallenges] = useState([]);
    const [active, setActive] = useState(null);
    const [detail, setDetail] = useState(null);
    const [sql, setSql] = useState('');
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showSolution, setShowSolution] = useState(false);
    const [showHints, setShowHints] = useState(0);
    const [solved, setSolved] = useState({});

    useEffect(() => {
        apiFetch(`/api/sql/challenges?lang=${locale}`).then(setChallenges);
    }, [locale]);

    const openChallenge = async (id) => {
        setActive(id);
        setResult(null);
        setError(null);
        setShowSolution(false);
        setShowHints(0);
        setSql(t('comment_default'));
        const d = await apiFetch(`/api/sql/challenges/${id}?lang=${locale}`);
        setDetail(d);
    };

    const submit = useCallback(async () => {
        if (!active) return;
        setLoading(true);
        setError(null);
        try {
            const res = await apiPost(`/api/sql/challenges/${active}/submit?lang=${locale}`, { sql });
            setResult(res);
            if (res.correct) {
                setSolved(prev => ({ ...prev, [active]: Math.max(prev[active] || 0, res.user_score) }));
            }
        } catch (e) {
            setError(e.message);
        }
        setLoading(false);
    }, [active, sql]);

    const gradeColor = (grade) => {
        const map = { A: 'var(--success)', B: 'var(--info)', C: 'var(--warning)', D: '#fb923c', F: 'var(--danger)' };
        return map[grade] || 'var(--text-muted)';
    };

    const solvedCount = Object.keys(solved).length;

    if (active && detail) {
        return (
            <>
                <div className="page-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setActive(null); setDetail(null); setResult(null); }}>
                            ← {t('btn_back')}
                        </button>
                        <h1 style={{ margin: 0 }}>#{detail.id} — {detail.title}</h1>
                        <div className="challenge-level" style={{ marginLeft: 'auto', background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: 999 }}>
                            {Array(detail.level).fill(0).map((_, i) => <Star key={i} size={14} fill="currentColor" style={{ color: '#fbbf24', margin: '0 2px' }} />)}
                        </div>
                    </div>
                </div>

                {/* Question */}
                <div className="card" style={{ marginBottom: 24 }}>
                    <h3 style={{ fontWeight: 700, marginBottom: 12, fontSize: '1.05rem', color: 'var(--accent-light)' }}>
                        <Target size={18} /> {t('question')}
                    </h3>
                    <p style={{ fontSize: '1rem', lineHeight: 1.7 }}>{detail.question}</p>

                    {detail.expected_columns && (
                        <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('expected_cols')}</span>
                            {detail.expected_columns.map(c => (
                                <span key={c} className="badge badge-info" style={{ fontFamily: 'var(--font-mono)' }}>{c}</span>
                            ))}
                            {detail.expected_row_count && (
                                <span className="badge badge-warning">{t('expected_rows', { count: detail.expected_row_count })}</span>
                            )}
                        </div>
                    )}

                    {/* Hints */}
                    {showHints > 0 && (
                        <div style={{ marginTop: 20, padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
                            {detail.hints.slice(0, showHints).map((h, i) => (
                                <div key={i} style={{ fontSize: '0.9rem', marginBottom: i < showHints - 1 ? 8 : 0, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                    <span style={{ marginTop: 2 }}><Lightbulb size={16} style={{ color: '#fbbf24' }} /></span> <span>{h}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {showHints < detail.hints.length && (
                        <button className="btn btn-secondary btn-sm" style={{ marginTop: 16 }}
                            onClick={() => setShowHints(h => h + 1)}>
                            <Lightbulb size={16} /> {t('hint_reveal', { current: showHints, total: detail.hints.length })}
                        </button>
                    )}
                </div>

                {/* Editor */}
                <div style={{ border: '1px solid var(--glass-border-strong)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: 24, boxShadow: 'var(--shadow-md)' }}>
                    <div className="editor-toolbar" style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--glass-border)' }}>
                        <button className="btn btn-primary btn-sm" onClick={submit} disabled={loading}>
                            {loading ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Loader2 size={16} className="animate-spin" /> {t('btn_submitting')}</span> : <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Play size={16} /> {t('btn_submit')}</span>}
                        </button>
                    </div>
                    <Editor
                        height="250px"
                        defaultLanguage="sql"
                        value={sql}
                        onChange={v => setSql(v || '')}
                        theme="vs-dark"
                        options={{
                            fontSize: 15,
                            fontFamily: "'JetBrains Mono', monospace",
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            padding: { top: 16 },
                            cursorSmoothCaretAnimation: "on"
                        }}
                    />
                </div>

                {error && (
                    <div className="card" style={{ borderColor: 'var(--danger)', marginBottom: 24, background: 'rgba(239, 68, 68, 0.1)' }}>
                        <p style={{ color: 'var(--danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}><XCircle size={16} /> {error}</p>
                    </div>
                )}

                {/* Result */}
                {result && (
                    <>
                        {/* Correct / Incorrect */}
                        <div className="card" style={{
                            borderColor: result.correct ? 'var(--success)' : 'var(--danger)',
                            borderWidth: 2,
                            marginBottom: 24,
                            boxShadow: result.correct ? '0 0 20px rgba(16, 185, 129, 0.2)' : '0 0 20px rgba(239, 68, 68, 0.2)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                                <span style={{ display: 'flex' }}>{result.correct ? <CheckCircle2 size={32} /> : <XCircle size={32} />}</span>
                                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: result.correct ? 'var(--success)' : 'var(--danger)' }}>
                                    {result.correct ? t('result_correct') : t('result_incorrect')}
                                </span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>
                                    {t('result_rows_matched', { user: result.user_row_count, expected: result.expected_row_count })}
                                </span>
                            </div>

                            {/* Score comparison */}
                            <div className="score-comparison">
                                <div className="score-box">
                                    <div className="score-box-title">{t('score_yours')}</div>
                                    <div className={`grade-badge grade-${result.user_grade}`} style={{ margin: '12px auto', width: 64, height: 64, fontSize: '2rem' }}>
                                        {result.user_grade}
                                    </div>
                                    <div className="score-display" style={{ justifyContent: 'center' }}>
                                        <span className="score-value" style={{ color: gradeColor(result.user_grade), fontSize: '2rem' }}>{result.user_score}</span>
                                        <span className="score-max">/100</span>
                                    </div>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: 8, fontWeight: 500 }}>
                                        {result.user_time_ms} ms
                                    </div>
                                </div>

                                <div className="score-box">
                                    <div className="score-box-title">{t('score_optimal')}</div>
                                    <div className={`grade-badge grade-${result.optimal_grade}`} style={{ margin: '12px auto', width: 64, height: 64, fontSize: '2rem' }}>
                                        {result.optimal_grade}
                                    </div>
                                    <div className="score-display" style={{ justifyContent: 'center' }}>
                                        <span className="score-value" style={{ color: gradeColor(result.optimal_grade), fontSize: '2rem' }}>{result.optimal_score}</span>
                                        <span className="score-max">/100</span>
                                    </div>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: 8, fontWeight: 500 }}>
                                        {result.optimal_time_ms} ms
                                    </div>
                                </div>
                            </div>

                            {/* Feedback */}
                            <div style={{ marginTop: 24 }}>
                                <h4 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    {t('feedback_title')}
                                </h4>
                                <ul className="feedback-list" style={{ listStyle: 'none', padding: 0 }}>
                                    {result.user_feedback.map((f, i) => (
                                        <li key={i} className="feedback-item">{f}</li>
                                    ))}
                                </ul>
                            </div>

                            {/* Explanation */}
                            {result.explanation && (
                                <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--glass-border)' }}>
                                    <button className="btn btn-secondary btn-sm" onClick={() => setShowSolution(!showSolution)}>
                                        {showSolution ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><LockOpen size={16} /> {t('btn_hide_solution')}</span> : <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Lightbulb size={16} /> {t('btn_show_solution')}</span>}
                                    </button>
                                    {showSolution && (
                                        <div style={{ marginTop: 16, padding: '20px', background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-md)', fontSize: '0.95rem', border: '1px solid var(--glass-border-strong)' }}>
                                            <div style={{ margin: 0, lineHeight: 1.7, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                                <Lightbulb size={18} style={{ color: '#fbbf24', flexShrink: 0, marginTop: 2 }} />
                                                <strong>{result.explanation}</strong>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Visualization chart for viz challenges */}
                        {result.correct && result.viz_type && result.user_rows && result.user_rows.length > 0 && (
                            <div className="chart-container" style={{ marginBottom: 24 }}>
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                                    <BarChart3 size={20} /> {t('viz_title')}
                                </h3>
                                <ResultChart
                                    vizType={result.viz_type}
                                    vizConfig={result.viz_config}
                                    rows={result.user_rows}
                                />
                            </div>
                        )}
                    </>
                )}
            </>
        );
    }

    // Challenge list view
    return (
        <>
            <div className="page-header">
                <h1><Target className="page-header-icon" /> {t('title')}</h1>
                <p>{t('subtitle')}</p>
            </div>

            {/* Progress */}
            <div className="card" style={{ marginBottom: 40, display: 'flex', alignItems: 'center', gap: 24, padding: '24px 32px' }}>
                <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {t('progress', { count: solvedCount })}
                </span>
                <div className="progress-bar" style={{ flex: 1 }}>
                    <div className="progress-fill" style={{ width: `${(solvedCount / 20) * 100}%` }} />
                </div>
            </div>

            {/* Level sections */}
            {[
                { level: 1, label: t('level_1_title'), desc: t('level_1_desc') },
                { level: 2, label: t('level_2_title'), desc: t('level_2_desc') },
                { level: 3, label: t('level_3_title'), desc: t('level_3_desc') },
            ].map(section => (
                <div key={section.level} style={{ marginBottom: 48 }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>{section.label}</h2>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 24 }}>{section.desc}</p>
                    <div className="challenge-grid">
                        {challenges.filter(c => c.level === section.level).map(c => (
                            <div key={c.id} className="challenge-card" onClick={() => openChallenge(c.id)}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: 4 }}>
                                        #{c.id}
                                    </span>
                                    {solved[c.id] && (
                                        <span className="badge badge-success" style={{ boxShadow: '0 0 10px rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <CheckCircle2 size={12} /> {solved[c.id]}/100
                                        </span>
                                    )}
                                </div>
                                <div className="challenge-title">{c.title}</div>
                                <p className="challenge-question">{c.question.substring(0, 100)}...</p>
                                {c.has_viz && (
                                    <span className="badge badge-info" style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.7rem' }}>
                                        <BarChart3 size={10} /> {t('viz_badge')}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </>
    );
}
