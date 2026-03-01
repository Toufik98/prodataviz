/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';

export default function Explorer() {
    const t = useTranslations('Explorer');
    const [data, setData] = useState(null);
    const [filters, setFilters] = useState({
        annee: '', discipline: '', academie: '', situation: '', domaine: '',
    });
    const [disciplines, setDisciplines] = useState([]);
    const [academies, setAcademies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const LIMIT = 50;

    useEffect(() => {
        Promise.all([
            apiFetch('/api/disciplines'),
            apiFetch('/api/academies'),
        ]).then(([d, a]) => {
            setDisciplines(d);
            setAcademies(a);
        });
    }, []);

    useEffect(() => {
        setLoading(true);
        const params = new URLSearchParams();
        if (filters.annee) params.set('annee', filters.annee);
        if (filters.discipline) params.set('discipline', filters.discipline);
        if (filters.academie) params.set('academie', filters.academie);
        if (filters.situation) params.set('situation', filters.situation);
        if (filters.domaine) params.set('domaine', filters.domaine);
        params.set('limit', LIMIT);
        params.set('offset', page * LIMIT);
        params.set('exclude_fragile', 'true');

        apiFetch(`/api/statistiques?${params}`)
            .then(setData)
            .finally(() => setLoading(false));
    }, [filters, page]);

    const updateFilter = (key, val) => {
        setFilters(f => ({ ...f, [key]: val }));
        setPage(0);
    };

    const years = ['2010', '2011', '2012', '2013', '2014', '2015', '2016', '2017', '2018', '2019', '2020'];

    const COLUMNS = [
        { key: 'etablissement_nom', label: t('col_university') },
        { key: 'discipline_nom', label: t('col_discipline') },
        { key: 'annee', label: t('col_year') },
        { key: 'situation', label: t('col_situation') },
        { key: 'taux_insertion', label: t('col_insertion'), num: true },
        { key: 'salaire_net_median', label: t('col_salary'), num: true },
        { key: 'emplois_cadre', label: t('col_executive'), num: true },
        { key: 'emplois_stables', label: t('col_stable'), num: true },
        { key: 'nombre_reponses', label: t('col_responses'), num: true },
    ];

    return (
        <>
            <div className="page-header">
                <h1><Search className="page-header-icon" /> {t('title')}</h1>
                <p>{t('subtitle', { total: data?.total?.toLocaleString() || '…' })}</p>
            </div>

            <div className="filters glass-panel" style={{ padding: '16px 24px' }}>
                <select className="select-input" value={filters.annee} onChange={e => updateFilter('annee', e.target.value)}>
                    <option value="">{t('all_years')}</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select className="select-input" value={filters.discipline} onChange={e => updateFilter('discipline', e.target.value)}>
                    <option value="">{t('all_disciplines')}</option>
                    {disciplines.map(d => <option key={d.code} value={d.code}>{d.nom}</option>)}
                </select>
                <select className="select-input" value={filters.academie} onChange={e => updateFilter('academie', e.target.value)}>
                    <option value="">{t('all_academies')}</option>
                    {academies.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}
                </select>
                <select className="select-input" value={filters.situation} onChange={e => updateFilter('situation', e.target.value)}>
                    <option value="">{t('all_situations')}</option>
                    <option value="18 mois après le diplôme">18 mois</option>
                    <option value="30 mois après le diplôme">30 mois</option>
                </select>
            </div>

            {loading ? (
                <div className="loading"><div className="spinner" /> {t('loading')}</div>
            ) : (
                <>
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    {COLUMNS.map(c => <th key={c.key}>{c.label}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {data?.data?.map((row, i) => (
                                    <tr key={i}>
                                        {COLUMNS.map(c => (
                                            <td key={c.key} className={c.num ? 'num' : ''}>
                                                {row[c.key] != null ? (
                                                    c.num ? (
                                                        c.key === 'salaire_net_median'
                                                            ? `${row[c.key]?.toLocaleString()} €`
                                                            : row[c.key]
                                                    ) : row[c.key]
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, padding: '16px 24px', background: 'var(--glass-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                            {t('page_info', {
                                start: page * LIMIT + 1,
                                end: Math.min((page + 1) * LIMIT, data?.total || 0),
                                total: data?.total?.toLocaleString()
                            })}
                        </span>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button className="btn btn-secondary btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← {t('prev')}</button>
                            <button className="btn btn-secondary btn-sm" disabled={(page + 1) * LIMIT >= (data?.total || 0)} onClick={() => setPage(p => p + 1)}>{t('next')} →</button>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
