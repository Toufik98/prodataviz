'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
    Database, Table2, Key, Link2, ArrowRight, Layers,
    Hash, Type, Calendar, BarChart3, Users, Globe, GraduationCap,
    ChevronDown, ChevronRight, Info, Zap
} from 'lucide-react';

/* ============================================================
   Full database schema definition — 7 tables, 3NF
   ============================================================ */
const SCHEMA = [
    {
        name: 'academie',
        icon: <Globe size={18} />,
        color: '#6366f1',
        type: 'dimension',
        description: {
            fr: "29 academies francaises (metropole + outre-mer). Dimension geographique de plus haut niveau.",
            en: "29 French academies (mainland + overseas). Highest-level geographic dimension."
        },
        columns: [
            { name: 'id', type: 'TEXT', pk: true, desc: { fr: 'Code academie (ex: A01)', en: 'Academy code (e.g. A01)' } },
            { name: 'nom', type: 'TEXT', nullable: false, desc: { fr: 'Nom (ex: Paris)', en: 'Name (e.g. Paris)' } },
        ],
        relations: [],
        rowEstimate: '29',
    },
    {
        name: 'etablissement',
        icon: <GraduationCap size={18} />,
        color: '#8b5cf6',
        type: 'dimension',
        description: {
            fr: "101 universites et etablissements. Relie a une academie via id_academie.",
            en: "101 universities and institutions. Linked to an academy via id_academie."
        },
        columns: [
            { name: 'id', type: 'TEXT', pk: true, desc: { fr: 'N UAI (ex: 0751717J)', en: 'UAI number (e.g. 0751717J)' } },
            { name: 'id_academie', type: 'TEXT', fk: 'academie.id', nullable: false, desc: { fr: 'FK vers academie', en: 'FK to academie' } },
            { name: 'nom', type: 'TEXT', nullable: false, desc: { fr: 'Nom historique', en: 'Historical name' } },
            { name: 'nom_actuel', type: 'TEXT', nullable: true, desc: { fr: 'Nom actuel si renomme', en: 'Current name if renamed' } },
            { name: 'id_paysage', type: 'TEXT', nullable: true, desc: { fr: 'Identifiant Paysage ESR', en: 'Paysage ESR identifier' } },
        ],
        relations: [{ from: 'id_academie', to: 'academie', toCol: 'id', label: 'N:1' }],
        rowEstimate: '101',
    },
    {
        name: 'domaine',
        icon: <Layers size={18} />,
        color: '#ec4899',
        type: 'dimension',
        description: {
            fr: "5 grands domaines de formation (DEG, LLA, SHS, STS, MEEF).",
            en: "5 major training domains (DEG, LLA, SHS, STS, MEEF)."
        },
        columns: [
            { name: 'code', type: 'TEXT', pk: true, desc: { fr: 'DEG|LLA|SHS|STS|MEEF', en: 'DEG|LLA|SHS|STS|MEEF' } },
            { name: 'nom', type: 'TEXT', nullable: false, desc: { fr: 'Libelle complet', en: 'Full label' } },
        ],
        relations: [],
        rowEstimate: '5',
    },
    {
        name: 'discipline',
        icon: <Table2 size={18} />,
        color: '#f59e0b',
        type: 'dimension',
        description: {
            fr: "20 disciplines rattachees chacune a un domaine unique.",
            en: "20 disciplines, each attached to a single domain."
        },
        columns: [
            { name: 'code', type: 'TEXT', pk: true, desc: { fr: 'disc01 a disc20', en: 'disc01 to disc20' } },
            { name: 'code_domaine', type: 'TEXT', fk: 'domaine.code', nullable: false, desc: { fr: 'FK vers domaine', en: 'FK to domaine' } },
            { name: 'nom', type: 'TEXT', nullable: false, desc: { fr: 'Libelle (ex: Informatique)', en: 'Label (e.g. Computer Science)' } },
        ],
        relations: [{ from: 'code_domaine', to: 'domaine', toCol: 'code', label: 'N:1' }],
        rowEstimate: '20',
    },
    {
        name: 'enquete',
        icon: <Calendar size={18} />,
        color: '#10b981',
        type: 'dimension',
        description: {
            fr: "22 combinaisons (annee x situation x diplome). Dimension temporelle et contexte.",
            en: "22 combinations (year x situation x diploma). Temporal & context dimension."
        },
        columns: [
            { name: 'id', type: 'INTEGER', pk: true, desc: { fr: 'Auto-increment', en: 'Auto-increment' } },
            { name: 'annee', type: 'TEXT', nullable: false, desc: { fr: '2010 a 2020', en: '2010 to 2020' } },
            { name: 'situation', type: 'TEXT', nullable: false, desc: { fr: '18 ou 30 mois apres', en: '18 or 30 months after' } },
            { name: 'diplome', type: 'TEXT', nullable: false, desc: { fr: 'MASTER LMD ou ENS', en: 'MASTER LMD or ENS' } },
        ],
        relations: [],
        rowEstimate: '22',
    },
    {
        name: 'statistique',
        icon: <BarChart3 size={18} />,
        color: '#ef4444',
        type: 'fact',
        description: {
            fr: "Table de faits principale (~17 500 lignes). Chaque ligne = observation pour un (etablissement, discipline, enquete).",
            en: "Main fact table (~17,500 rows). Each row = observation for one (institution, discipline, survey)."
        },
        columns: [
            { name: 'id', type: 'INTEGER', pk: true, desc: { fr: 'Auto-increment', en: 'Auto-increment' } },
            { name: 'id_etablissement', type: 'TEXT', fk: 'etablissement.id', nullable: false, desc: { fr: 'FK vers etablissement', en: 'FK to etablissement' } },
            { name: 'code_discipline', type: 'TEXT', fk: 'discipline.code', nullable: false, desc: { fr: 'FK vers discipline', en: 'FK to discipline' } },
            { name: 'id_enquete', type: 'INTEGER', fk: 'enquete.id', nullable: false, desc: { fr: 'FK vers enquete', en: 'FK to enquete' } },
            { name: 'nombre_reponses', type: 'INTEGER', nullable: true, desc: { fr: 'Nombre de reponses', en: 'Response count' } },
            { name: 'taux_insertion', type: 'FLOAT', nullable: true, desc: { fr: '% en emploi', en: '% employed' } },
            { name: 'emplois_cadre', type: 'FLOAT', nullable: true, desc: { fr: '% cadre', en: '% executive' } },
            { name: 'emplois_stables', type: 'FLOAT', nullable: true, desc: { fr: '% CDI/fonctionnaire', en: '% permanent' } },
            { name: 'emplois_temps_plein', type: 'FLOAT', nullable: true, desc: { fr: '% temps plein', en: '% full-time' } },
            { name: 'emplois_hors_region', type: 'FLOAT', nullable: true, desc: { fr: '% hors region', en: '% out of region' } },
            { name: 'salaire_net_median', type: 'FLOAT', nullable: true, desc: { fr: 'Salaire net median', en: 'Median net salary' } },
            { name: 'salaire_brut_annuel', type: 'FLOAT', nullable: true, desc: { fr: 'Salaire brut annuel', en: 'Annual gross salary' } },
            { name: 'pct_femmes', type: 'FLOAT', nullable: true, desc: { fr: '% femmes', en: '% women' } },
            { name: 'pct_boursiers', type: 'FLOAT', nullable: true, desc: { fr: '% boursiers', en: '% scholarship' } },
        ],
        relations: [
            { from: 'id_etablissement', to: 'etablissement', toCol: 'id', label: 'N:1' },
            { from: 'code_discipline', to: 'discipline', toCol: 'code', label: 'N:1' },
            { from: 'id_enquete', to: 'enquete', toCol: 'id', label: 'N:1' },
        ],
        rowEstimate: '~17,500',
    },
    {
        name: 'donnees_nationales',
        icon: <Users size={18} />,
        color: '#06b6d4',
        type: 'fact',
        description: {
            fr: "361 agregats nationaux. Separee car pas d'etablissement individuel.",
            en: "361 national aggregates. Separate because no individual institution."
        },
        columns: [
            { name: 'id', type: 'INTEGER', pk: true, desc: { fr: 'Auto-increment', en: 'Auto-increment' } },
            { name: 'code_discipline', type: 'TEXT', fk: 'discipline.code', nullable: false, desc: { fr: 'FK vers discipline', en: 'FK to discipline' } },
            { name: 'id_enquete', type: 'INTEGER', fk: 'enquete.id', nullable: false, desc: { fr: 'FK vers enquete', en: 'FK to enquete' } },
            { name: 'taux_insertion', type: 'FLOAT', nullable: true, desc: { fr: '% en emploi', en: '% employed' } },
            { name: 'salaire_net_median', type: 'FLOAT', nullable: true, desc: { fr: 'Salaire net median', en: 'Median net salary' } },
            { name: 'emplois_cadre', type: 'FLOAT', nullable: true, desc: { fr: '% cadre', en: '% executive' } },
            { name: 'emplois_stables', type: 'FLOAT', nullable: true, desc: { fr: '% CDI/fonctionnaire', en: '% permanent' } },
        ],
        relations: [
            { from: 'code_discipline', to: 'discipline', toCol: 'code', label: 'N:1' },
            { from: 'id_enquete', to: 'enquete', toCol: 'id', label: 'N:1' },
        ],
        rowEstimate: '361',
    },
];

/* ============================================================
   Relation lines data for the ERD view
   ============================================================ */
const ERD_RELATIONS = [
    { from: 'academie', to: 'etablissement', label: '1:N', desc: { fr: 'contient', en: 'contains' } },
    { from: 'domaine', to: 'discipline', label: '1:N', desc: { fr: 'regroupe', en: 'groups' } },
    { from: 'etablissement', to: 'statistique', label: '1:N', desc: { fr: 'produit', en: 'produces' } },
    { from: 'discipline', to: 'statistique', label: '1:N', desc: { fr: 'concerne', en: 'concerns' } },
    { from: 'enquete', to: 'statistique', label: '1:N', desc: { fr: 'mesure', en: 'measures' } },
    { from: 'discipline', to: 'donnees_nationales', label: '1:N', desc: { fr: 'agrege', en: 'aggregates' } },
    { from: 'enquete', to: 'donnees_nationales', label: '1:N', desc: { fr: 'mesure', en: 'measures' } },
];

/* ============================================================
   Component: TableCard
   ============================================================ */
function TableCard({ table, locale, isSelected, onSelect }) {
    const [expanded, setExpanded] = useState(false);
    const isFact = table.type === 'fact';

    return (
        <div
            className={`schema-table-card ${isSelected ? 'selected' : ''} ${isFact ? 'fact' : 'dimension'}`}
            style={{ '--table-color': table.color }}
            onClick={() => onSelect(table.name)}
        >
            <div className="schema-table-header">
                <div className="schema-table-name">
                    <span className="schema-table-icon" style={{ color: table.color }}>{table.icon}</span>
                    <h3>{table.name}</h3>
                    <span className={`schema-table-badge ${isFact ? 'fact' : 'dimension'}`}>
                        {isFact ? 'FACT' : 'DIM'}
                    </span>
                </div>
                <div className="schema-table-meta">
                    <span className="schema-table-rows">
                        <Hash size={12} /> {table.rowEstimate}
                    </span>
                    <span className="schema-table-cols">
                        {table.columns.length} cols
                    </span>
                </div>
            </div>

            <p className="schema-table-desc">{table.description[locale]}</p>

            <button
                className="schema-expand-btn"
                onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            >
                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {expanded
                    ? (locale === 'fr' ? 'Masquer les colonnes' : 'Hide columns')
                    : (locale === 'fr' ? `Voir les ${table.columns.length} colonnes` : `View ${table.columns.length} columns`)
                }
            </button>

            {expanded && (
                <div className="schema-columns-list">
                    {table.columns.map(col => (
                        <div key={col.name} className={`schema-col-row ${col.pk ? 'pk' : ''} ${col.fk ? 'fk' : ''}`}>
                            <div className="schema-col-icons">
                                {col.pk && <Key size={12} className="schema-icon-pk" />}
                                {col.fk && <Link2 size={12} className="schema-icon-fk" />}
                            </div>
                            <span className="schema-col-name">{col.name}</span>
                            <span className="schema-col-type">{col.type}</span>
                            {col.fk && (
                                <span className="schema-col-fk-ref">
                                    <ArrowRight size={10} /> {col.fk}
                                </span>
                            )}
                            <span className="schema-col-desc">{col.desc[locale]}</span>
                        </div>
                    ))}
                </div>
            )}

            {table.relations.length > 0 && expanded && (
                <div className="schema-relations">
                    <div className="schema-relations-title">
                        <Link2 size={12} /> {locale === 'fr' ? 'Relations' : 'Relations'}
                    </div>
                    {table.relations.map((rel, i) => (
                        <div key={i} className="schema-relation-item">
                            <span className="schema-rel-badge">{rel.label}</span>
                            {table.name}.{rel.from} <ArrowRight size={10} /> {rel.to}.{rel.toCol}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ============================================================
   Component: ERD Diagram (visual)
   ============================================================ */
function ERDDiagram({ locale, selectedTable, onSelect }) {
    /* Position each table box in a star-schema inspired layout */
    const positions = {
        academie:           { x: 60,  y: 30 },
        etablissement:      { x: 60,  y: 200 },
        domaine:            { x: 520, y: 30 },
        discipline:         { x: 520, y: 200 },
        enquete:            { x: 290, y: 30 },
        statistique:        { x: 220, y: 380 },
        donnees_nationales: { x: 520, y: 380 },
    };

    const BOX_W = 170;
    const BOX_H = 52;

    function getAnchor(fromName, toName) {
        const from = positions[fromName];
        const to = positions[toName];
        const fCx = from.x + BOX_W / 2;
        const fCy = from.y + BOX_H / 2;
        const tCx = to.x + BOX_W / 2;
        const tCy = to.y + BOX_H / 2;

        let fx, fy, tx, ty;

        if (Math.abs(fCy - tCy) > Math.abs(fCx - tCx)) {
            // Vertical connection
            if (fCy < tCy) { fy = from.y + BOX_H; ty = to.y; } else { fy = from.y; ty = to.y + BOX_H; }
            fx = fCx; tx = tCx;
        } else {
            // Horizontal connection
            if (fCx < tCx) { fx = from.x + BOX_W; tx = to.x; } else { fx = from.x; tx = to.x + BOX_W; }
            fy = fCy; ty = tCy;
        }
        return { fx, fy, tx, ty };
    }

    return (
        <div className="schema-erd-container">
            <svg className="schema-erd-svg" viewBox="0 0 750 480" preserveAspectRatio="xMidYMid meet">
                <defs>
                    <marker id="arrow" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
                        <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255,255,255,0.4)" />
                    </marker>
                </defs>

                {/* Relation lines */}
                {ERD_RELATIONS.map((rel, i) => {
                    const { fx, fy, tx, ty } = getAnchor(rel.from, rel.to);
                    const mx = (fx + tx) / 2;
                    const my = (fy + ty) / 2;
                    const isHighlight = selectedTable === rel.from || selectedTable === rel.to;
                    return (
                        <g key={i}>
                            <line
                                x1={fx} y1={fy} x2={tx} y2={ty}
                                stroke={isHighlight ? 'rgba(99,102,241,0.7)' : 'rgba(255,255,255,0.15)'}
                                strokeWidth={isHighlight ? 2.5 : 1.5}
                                strokeDasharray={isHighlight ? 'none' : '6 4'}
                                markerEnd="url(#arrow)"
                            />
                            <text x={mx} y={my - 6} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="10" fontWeight="600">
                                {rel.label}
                            </text>
                            <text x={mx} y={my + 8} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9" fontStyle="italic">
                                {rel.desc[locale]}
                            </text>
                        </g>
                    );
                })}

                {/* Table boxes */}
                {SCHEMA.map(table => {
                    const pos = positions[table.name];
                    const isSelected = selectedTable === table.name;
                    const isFact = table.type === 'fact';
                    return (
                        <g key={table.name} onClick={() => onSelect(table.name)} style={{ cursor: 'pointer' }}>
                            <rect
                                x={pos.x} y={pos.y}
                                width={BOX_W} height={BOX_H}
                                rx={10} ry={10}
                                fill={isSelected ? 'rgba(99,102,241,0.25)' : 'rgba(17,24,39,0.7)'}
                                stroke={isSelected ? table.color : 'rgba(255,255,255,0.12)'}
                                strokeWidth={isSelected ? 2.5 : 1.5}
                            />
                            {/* Color accent bar */}
                            <rect
                                x={pos.x} y={pos.y}
                                width={5} height={BOX_H}
                                rx={2} fill={table.color}
                                opacity={isSelected ? 1 : 0.6}
                            />
                            <text
                                x={pos.x + 18} y={pos.y + 22}
                                fill={isSelected ? '#fff' : 'rgba(255,255,255,0.85)'}
                                fontSize="13" fontWeight="700"
                                fontFamily="JetBrains Mono, monospace"
                            >
                                {table.name}
                            </text>
                            <text
                                x={pos.x + 18} y={pos.y + 38}
                                fill="rgba(255,255,255,0.4)" fontSize="10"
                            >
                                {isFact ? 'FACT' : 'DIM'} | {table.rowEstimate} rows | {table.columns.length} cols
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}

/* ============================================================
   Main Page Component
   ============================================================ */
export default function SchemaPage() {
    const t = useTranslations('Schema');
    const locale = useLocale();
    const [selectedTable, setSelectedTable] = useState(null);
    const [viewMode, setViewMode] = useState('erd'); // 'erd' | 'list'

    const dimensions = SCHEMA.filter(t => t.type === 'dimension');
    const facts = SCHEMA.filter(t => t.type === 'fact');

    const handleSelect = (name) => {
        setSelectedTable(prev => prev === name ? null : name);
    };

    return (
        <>
            <div className="page-header">
                <h1><Database className="page-header-icon" /> {t('title')}</h1>
                <p>{t('subtitle')}</p>
            </div>

            {/* Stats bar */}
            <div className="schema-stats-bar">
                <div className="schema-stat">
                    <Table2 size={16} />
                    <span><strong>7</strong> {t('tables')}</span>
                </div>
                <div className="schema-stat">
                    <Layers size={16} />
                    <span><strong>5</strong> {t('dimensions')}</span>
                </div>
                <div className="schema-stat">
                    <BarChart3 size={16} />
                    <span><strong>2</strong> {t('fact_tables')}</span>
                </div>
                <div className="schema-stat">
                    <Link2 size={16} />
                    <span><strong>7</strong> {t('relations')}</span>
                </div>
                <div className="schema-stat">
                    <Zap size={16} />
                    <span>3NF</span>
                </div>

                <div style={{ flex: 1 }} />

                {/* View toggle */}
                <div className="schema-view-toggle">
                    <button
                        className={viewMode === 'erd' ? 'active' : ''}
                        onClick={() => setViewMode('erd')}
                    >
                        {t('view_diagram')}
                    </button>
                    <button
                        className={viewMode === 'list' ? 'active' : ''}
                        onClick={() => setViewMode('list')}
                    >
                        {t('view_details')}
                    </button>
                </div>
            </div>

            {/* ERD View */}
            {viewMode === 'erd' && (
                <div className="card" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        <Info size={14} />
                        {t('erd_hint')}
                    </div>
                    <ERDDiagram locale={locale} selectedTable={selectedTable} onSelect={handleSelect} />

                    {selectedTable && (
                        <div style={{ marginTop: 24 }}>
                            <TableCard
                                table={SCHEMA.find(t => t.name === selectedTable)}
                                locale={locale}
                                isSelected={true}
                                onSelect={handleSelect}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
                <>
                    <div style={{ marginBottom: 12 }}>
                        <h2 className="schema-section-title">
                            <Layers size={18} /> {t('section_dimensions')}
                        </h2>
                    </div>
                    <div className="schema-grid">
                        {dimensions.map(table => (
                            <TableCard
                                key={table.name}
                                table={table}
                                locale={locale}
                                isSelected={selectedTable === table.name}
                                onSelect={handleSelect}
                            />
                        ))}
                    </div>

                    <div style={{ marginTop: 32, marginBottom: 12 }}>
                        <h2 className="schema-section-title">
                            <BarChart3 size={18} /> {t('section_facts')}
                        </h2>
                    </div>
                    <div className="schema-grid">
                        {facts.map(table => (
                            <TableCard
                                key={table.name}
                                table={table}
                                locale={locale}
                                isSelected={selectedTable === table.name}
                                onSelect={handleSelect}
                            />
                        ))}
                    </div>

                    {/* Index info */}
                    <div className="card" style={{ marginTop: 32, padding: 24 }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.05rem', fontWeight: 700, marginBottom: 16, color: 'var(--accent-light)' }}>
                            <Zap size={18} /> {t('index_title')}
                        </h3>
                        <div className="schema-index-grid">
                            <div className="schema-index-card">
                                <code>ix_statistique_recherche</code>
                                <span className="schema-index-on">ON statistique(id_etablissement, code_discipline, id_enquete)</span>
                                <p>{t('index_composite_desc')}</p>
                            </div>
                            <div className="schema-index-card">
                                <code>ix_stat_salaire</code>
                                <span className="schema-index-on">ON statistique(salaire_net_median DESC)</span>
                                <p>{t('index_salary_desc')}</p>
                            </div>
                            <div className="schema-index-card">
                                <code>ix_stat_insertion</code>
                                <span className="schema-index-on">ON statistique(taux_insertion DESC)</span>
                                <p>{t('index_insertion_desc')}</p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
