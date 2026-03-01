'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { apiFetch, apiPost } from '@/lib/api';
import { useTranslations, useLocale } from 'next-intl';
import { Database, ClipboardList, Table, Loader2, Play, Activity, AlertCircle, List, Zap, Clock, CheckCircle2, AlertTriangle, TrendingUp, ChevronDown, ChevronRight, Cpu } from 'lucide-react';

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export default function SqlLab() {
    const t = useTranslations('SqlLab');
    const locale = useLocale();
    const common = useTranslations('Common');

    const DEFAULT_SQL = t('comment_default') + `\n\nSELECT e.nom AS universite,
       d.nom AS discipline,
       s.salaire_net_median,
       s.taux_insertion
FROM statistique s
JOIN etablissement e ON s.id_etablissement = e.id
JOIN discipline d ON s.code_discipline = d.code
WHERE s.code_discipline = 'disc16'
  AND s.salaire_net_median IS NOT NULL
ORDER BY s.salaire_net_median DESC
LIMIT 10;`;

    const [schema, setSchema] = useState(null);
    const [sql, setSql] = useState(DEFAULT_SQL);
    const [result, setResult] = useState(null);
    const [explain, setExplain] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [expandedTables, setExpandedTables] = useState({});
    const [activeTab, setActiveTab] = useState('results');

    useEffect(() => {
        apiFetch('/api/sql/schema').then(s => {
            setSchema(s);
            const expanded = {};
            Object.keys(s).forEach(tbl => { expanded[tbl] = false; });
            setExpandedTables(expanded);
        });
    }, []);

    const executeQuery = useCallback(async () => {
        setLoading(true);
        setError(null);
        setExplain(null);
        try {
            const [res, exp] = await Promise.all([
                apiPost(`/api/sql/execute?lang=${locale}`, { sql }),
                apiPost(`/api/sql/explain?lang=${locale}`, { sql }),
            ]);
            setResult(res);
            setExplain(exp);
            setActiveTab('results');
        } catch (e) {
            setError(e.message);
            setResult(null);
            setExplain(null);
        }
        setLoading(false);
    }, [sql]);

    const handleEditorMount = (editor) => {
        editor.addAction({
            id: 'execute-query',
            label: 'Execute',
            keybindings: [2048 | 3], // Ctrl+Enter
            run: () => executeQuery(),
        });
    };

    const toggleTable = (name) => {
        setExpandedTables(prev => ({ ...prev, [name]: !prev[name] }));
    };

    const gradeColor = (grade) => {
        const map = { A: 'var(--success)', B: 'var(--info)', C: 'var(--warning)', D: '#fb923c', F: 'var(--danger)' };
        return map[grade] || 'var(--text-secondary)';
    };

    return (
        <>
            <div className="page-header">
                <h1><Database className="page-header-icon" /> {t('title')}</h1>
                <p>{t('subtitle')}</p>
            </div>

            <div className="sql-lab-layout">
                {/* Schema Panel */}
                <div className="schema-panel">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ClipboardList size={22} /> {t('schema_title')}</h3>
                    {schema && Object.entries(schema).map(([tableName, tableInfo]) => (
                        <div key={tableName} className="schema-table">
                            <div
                                className="schema-table-name"
                                onClick={() => toggleTable(tableName)}
                            >
                                <span style={{ width: 20, textAlign: 'center' }}>{expandedTables[tableName] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Table size={16} /> {tableName}</span>
                                <span className="row-count">{tableInfo.row_count.toLocaleString()}</span>
                            </div>
                            {expandedTables[tableName] && (
                                <div className="schema-columns" style={{ maxHeight: expandedTables[tableName] ? '500px' : '0' }}>
                                    {tableInfo.columns.map(col => {
                                        const fk = tableInfo.foreign_keys.find(f => f.from_col === col.name);
                                        return (
                                            <div key={col.name} className="schema-col">
                                                {col.pk && <span className="pk-badge badge badge-warning" style={{ fontSize: '0.6rem' }}>PK</span>}
                                                {fk && <span className="fk-badge badge badge-info" style={{ fontSize: '0.6rem' }}>FK</span>}
                                                <span className="col-name">{col.name}</span>
                                                <span className="col-type">{col.type}</span>
                                                {fk && (
                                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                                        → {fk.to_table}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Editor + Results */}
                <div className="editor-area">
                    <div className="editor-toolbar">
                        <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={executeQuery} disabled={loading}>
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} {loading ? t('btn_executing') : t('btn_execute')}
                        </button>
                        <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => setActiveTab('explain')}>
                            <Activity size={16} /> {t('btn_explain')}
                        </button>
                        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {t('shortcut_hint')}
                        </span>
                    </div>

                    <div className="editor-wrapper">
                        <Editor
                            height="280px"
                            defaultLanguage="sql"
                            value={sql}
                            onChange={v => setSql(v || '')}
                            onMount={handleEditorMount}
                            theme="vs-dark"
                            options={{
                                fontSize: 14,
                                fontFamily: "'JetBrains Mono', monospace",
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                lineNumbers: 'on',
                                renderWhitespace: 'none',
                                wordWrap: 'on',
                                padding: { top: 16 },
                                suggestOnTriggerCharacters: true,
                                cursorBlinking: "smooth",
                                cursorSmoothCaretAnimation: "on",
                                formatOnPaste: true,
                            }}
                        />
                    </div>

                    {/* Results Area */}
                    <div className="results-area" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                        {error && (
                            <div style={{ padding: 16, color: 'var(--danger)', background: 'var(--danger-bg)', borderBottom: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <AlertCircle size={16} /> {error}
                            </div>
                        )}

                        {result && (
                            <>
                                <div className="results-header">
                                    <div style={{ display: 'flex', gap: 16 }}>
                                        <button
                                            className={`btn btn-sm ${activeTab === 'results' ? 'btn-primary' : 'btn-secondary'}`}
                                            onClick={() => setActiveTab('results')}
                                        >
                                            <List size={16} /> {t('tab_results')} ({result.row_count})
                                        </button>
                                        <button
                                            className={`btn btn-sm ${activeTab === 'explain' ? 'btn-primary' : 'btn-secondary'}`}
                                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                            onClick={() => setActiveTab('explain')}
                                        >
                                            <Zap size={16} /> {t('btn_complexity')}
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <span style={{ fontWeight: 600 }}>
                                            <Clock size={16} style={{ marginBottom: '-3px', marginRight: '4px' }} /> {t('time_ms', { time: result.execution_time_ms })}
                                        </span>
                                        {result.truncated && <span className="badge badge-warning">{t('badge_truncated')}</span>}
                                    </div>
                                </div>

                                {activeTab === 'results' && (
                                    <div className="results-table-wrapper" style={{ flex: 1, overflow: 'auto', background: 'transparent' }}>
                                        <table className="data-table" style={{ border: 'none' }}>
                                            <thead>
                                                <tr>
                                                    {result.columns.map(c => <th key={c} style={{ background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid var(--glass-border)' }}>{c}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {result.rows.map((row, i) => (
                                                    <tr key={i}>
                                                        {result.columns.map(c => (
                                                            <td key={c} className={typeof row[c] === 'number' ? 'num' : ''} style={{ padding: '10px 24px' }}>
                                                                {row[c] != null ? String(row[c]) : <span style={{ color: 'var(--text-muted)' }}>NULL</span>}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {activeTab === 'explain' && explain && (
                                    <div className="complexity-panel" style={{ overflow: 'auto', flex: 1 }}>
                                        <div className="complexity-header">
                                            <div className={`grade-badge grade-${explain.grade}`}>{explain.grade}</div>
                                            <div className="score-display">
                                                <span className="score-value" style={{ color: gradeColor(explain.grade) }}>{explain.score}</span>
                                                <span className="score-max">/100</span>
                                            </div>
                                            <div style={{ marginLeft: 'auto' }}>
                                                {explain.uses_index
                                                    ? <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={14} /> {t('complexity_index_ok')}</span>
                                                    : <span className="badge badge-danger" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={14} /> {t('complexity_no_index')}</span>
                                                }
                                            </div>
                                        </div>

                                        <ul className="feedback-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                                            {explain.feedback.map((f, i) => (
                                                <li key={i} className="feedback-item">{f}</li>
                                            ))}
                                        </ul>

                                        {explain.plan && explain.plan.length > 0 && (
                                            <div style={{ marginTop: 24 }}>
                                                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                                    <TrendingUp size={16} /> {t('complexity_plan')}
                                                </h4>
                                                {explain.plan.map((step, i) => (
                                                    <div key={i} style={{
                                                        fontFamily: 'var(--font-mono)', fontSize: '0.85rem',
                                                        padding: '8px 16px', background: 'rgba(0,0,0,0.2)',
                                                        borderRadius: 'var(--radius-sm)', marginBottom: 6,
                                                        borderLeft: '4px solid var(--accent)',
                                                    }}>
                                                        {step.detail}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {!result && !error && (
                            <div className="empty-state" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <div className="icon"><Database size={48} /></div>
                                <p>{t('empty_state')}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
