'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { apiPost } from '@/lib/api';
import { useTranslations, useLocale } from 'next-intl';
import {
    BookOpen, CheckCircle2, ChevronRight, Play, Loader2,
    Lightbulb, Code, GraduationCap, AlertCircle, RotateCcw,
    Lock, ArrowRight, Eye, EyeOff, Sparkles, Database
} from 'lucide-react';

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

/* ============================================================
   10 progressive SQL lessons using the ProDataViz database
   ============================================================ */
const LESSONS = [
    {
        id: 1,
        icon: '1',
        title: { fr: 'SELECT — Votre premiere requete', en: 'SELECT — Your First Query' },
        concepts: {
            fr: ['SELECT choisit les colonnes a afficher', 'FROM indique la table source', '* selectionne toutes les colonnes (a eviter en production)'],
            en: ['SELECT chooses which columns to display', 'FROM indicates the source table', '* selects all columns (avoid in production)'],
        },
        theory: {
            fr: 'La commande SELECT est le fondement de SQL. Elle permet de lire des donnees dans une table. Chaque requete commence par SELECT (quelles colonnes ?) suivi de FROM (quelle table ?).\n\nLa base ProDataViz contient 7 tables : academie, etablissement, domaine, discipline, enquete, statistique, et donnees_nationales.',
            en: 'The SELECT command is the foundation of SQL. It reads data from a table. Every query starts with SELECT (which columns?) followed by FROM (which table?).\n\nThe ProDataViz database contains 7 tables: academie, etablissement, domaine, discipline, enquete, statistique, and donnees_nationales.',
        },
        syntax: 'SELECT column1, column2\nFROM table_name;',
        example: {
            description: { fr: 'Afficher les 5 premieres academies', en: 'Display the first 5 academies' },
            query: "SELECT id, nom\nFROM academie\nLIMIT 5;",
        },
        practice: {
            prompt: { fr: 'Affichez le code et le nom de tous les domaines de formation', en: 'Display the code and name of all training domains' },
            hint: { fr: 'La table s\'appelle "domaine" et les colonnes sont "code" et "nom"', en: 'The table is named "domaine" and the columns are "code" and "nom"' },
            solution: "SELECT code, nom FROM domaine;",
            startSql: "SELECT ",
        },
    },
    {
        id: 2,
        icon: '2',
        title: { fr: 'WHERE — Filtrer les donnees', en: 'WHERE — Filtering Data' },
        concepts: {
            fr: ['WHERE filtre les lignes selon une condition', 'Operateurs : =, !=, <, >, <=, >=', 'LIKE permet la recherche par motif (% = joker)'],
            en: ['WHERE filters rows based on a condition', 'Operators: =, !=, <, >, <=, >=', 'LIKE enables pattern matching (% = wildcard)'],
        },
        theory: {
            fr: 'La clause WHERE filtre les lignes retournees. Elle s\'ajoute apres FROM et accepte des conditions avec des operateurs de comparaison. Vous pouvez combiner plusieurs conditions avec AND et OR.',
            en: 'The WHERE clause filters the returned rows. It comes after FROM and accepts conditions with comparison operators. You can combine multiple conditions with AND and OR.',
        },
        syntax: "SELECT column1, column2\nFROM table_name\nWHERE condition;",
        example: {
            description: { fr: 'Academies dont le nom commence par "P"', en: 'Academies whose name starts with "P"' },
            query: "SELECT id, nom\nFROM academie\nWHERE nom LIKE 'P%';",
        },
        practice: {
            prompt: { fr: 'Trouvez toutes les disciplines du domaine "STS" (Sciences, Technologies, Sante)', en: 'Find all disciplines in the "STS" domain (Science, Technology, Health)' },
            hint: { fr: 'Filtrez la table "discipline" avec WHERE code_domaine = \'STS\'', en: 'Filter the "discipline" table with WHERE code_domaine = \'STS\'' },
            solution: "SELECT code, nom FROM discipline WHERE code_domaine = 'STS';",
            startSql: "SELECT code, nom\nFROM discipline\nWHERE ",
        },
    },
    {
        id: 3,
        icon: '3',
        title: { fr: 'ORDER BY & LIMIT', en: 'ORDER BY & LIMIT' },
        concepts: {
            fr: ['ORDER BY trie les resultats (ASC = croissant, DESC = decroissant)', 'LIMIT restreint le nombre de lignes retournees', 'IS NOT NULL filtre les valeurs manquantes'],
            en: ['ORDER BY sorts results (ASC = ascending, DESC = descending)', 'LIMIT restricts the number of returned rows', 'IS NOT NULL filters out missing values'],
        },
        theory: {
            fr: 'ORDER BY trie le resultat final. Par defaut, le tri est croissant (ASC). Ajoutez DESC pour un tri decroissant. LIMIT restreint le nombre de lignes — indispensable pour les classements et la performance.',
            en: 'ORDER BY sorts the final result. By default, sorting is ascending (ASC). Add DESC for descending order. LIMIT restricts the number of rows — essential for rankings and performance.',
        },
        syntax: "SELECT column1, column2\nFROM table_name\nWHERE condition\nORDER BY column1 DESC\nLIMIT 10;",
        example: {
            description: { fr: 'Top 5 salaires les plus eleves', en: 'Top 5 highest salaries' },
            query: "SELECT id, salaire_net_median\nFROM statistique\nWHERE salaire_net_median IS NOT NULL\nORDER BY salaire_net_median DESC\nLIMIT 5;",
        },
        practice: {
            prompt: { fr: 'Listez les 10 enquetes les plus recentes, triees par annee decroissante. Affichez annee, situation et diplome.', en: 'List the 10 most recent surveys, sorted by descending year. Display annee, situation and diplome.' },
            hint: { fr: 'Table "enquete", ORDER BY annee DESC', en: 'Table "enquete", ORDER BY annee DESC' },
            solution: "SELECT annee, situation, diplome FROM enquete ORDER BY annee DESC LIMIT 10;",
            startSql: "SELECT annee, situation, diplome\nFROM enquete\n",
        },
    },
    {
        id: 4,
        icon: '4',
        title: { fr: 'Fonctions d\'agregation', en: 'Aggregate Functions' },
        concepts: {
            fr: ['COUNT(*) compte le nombre de lignes', 'AVG() calcule la moyenne, SUM() la somme', 'MAX() et MIN() trouvent les extremes', 'ROUND() arrondit un nombre decimal'],
            en: ['COUNT(*) counts the number of rows', 'AVG() calculates the mean, SUM() the sum', 'MAX() and MIN() find the extremes', 'ROUND() rounds a decimal number'],
        },
        theory: {
            fr: 'Les fonctions d\'agregation calculent une valeur a partir de plusieurs lignes. Elles sont souvent utilisees avec GROUP BY (lecon 5). Sans GROUP BY, elles s\'appliquent a toute la table.',
            en: 'Aggregate functions compute a value from multiple rows. They are often used with GROUP BY (lesson 5). Without GROUP BY, they apply to the entire table.',
        },
        syntax: "SELECT COUNT(*) AS total,\n       ROUND(AVG(column), 2) AS moyenne,\n       MAX(column) AS maximum\nFROM table_name\nWHERE condition;",
        example: {
            description: { fr: 'Statistiques globales sur les salaires', en: 'Global salary statistics' },
            query: "SELECT\n  COUNT(*) AS nb_observations,\n  ROUND(AVG(salaire_net_median)) AS salaire_moyen,\n  MAX(salaire_net_median) AS salaire_max,\n  MIN(salaire_net_median) AS salaire_min\nFROM statistique\nWHERE salaire_net_median IS NOT NULL;",
        },
        practice: {
            prompt: { fr: 'Comptez le nombre de statistiques avec un taux d\'insertion superieur a 90%. Nommez la colonne "nb".', en: 'Count the number of statistics with a placement rate above 90%. Name the column "nb".' },
            hint: { fr: 'WHERE taux_insertion > 90, COUNT(*) AS nb', en: 'WHERE taux_insertion > 90, COUNT(*) AS nb' },
            solution: "SELECT COUNT(*) AS nb FROM statistique WHERE taux_insertion > 90;",
            startSql: "SELECT COUNT(*) AS nb\nFROM statistique\nWHERE ",
        },
    },
    {
        id: 5,
        icon: '5',
        title: { fr: 'GROUP BY — Regrouper', en: 'GROUP BY — Grouping' },
        concepts: {
            fr: ['GROUP BY regroupe les lignes par valeur commune', 'Chaque groupe produit une ligne de resultat', 'Les colonnes non agreges doivent etre dans GROUP BY'],
            en: ['GROUP BY groups rows with the same values', 'Each group produces one result row', 'Non-aggregated columns must be in GROUP BY'],
        },
        theory: {
            fr: 'GROUP BY divise les donnees en groupes. Chaque groupe est resume par les fonctions d\'agregation. C\'est la base de toute analyse de donnees : "Par categorie, quelle est la moyenne ?"',
            en: 'GROUP BY divides data into groups. Each group is summarized by aggregate functions. This is the basis of all data analysis: "By category, what is the average?"',
        },
        syntax: "SELECT category, COUNT(*) AS nb,\n       AVG(value) AS moyenne\nFROM table_name\nGROUP BY category\nORDER BY moyenne DESC;",
        example: {
            description: { fr: 'Salaire moyen par discipline (top 5)', en: 'Average salary per discipline (top 5)' },
            query: "SELECT code_discipline,\n       COUNT(*) AS nb,\n       ROUND(AVG(salaire_net_median)) AS salaire_moyen\nFROM statistique\nWHERE salaire_net_median IS NOT NULL\nGROUP BY code_discipline\nORDER BY salaire_moyen DESC\nLIMIT 5;",
        },
        practice: {
            prompt: { fr: 'Comptez le nombre d\'universites par academie. Affichez id_academie et le nombre (nb). Triez par nombre decroissant.', en: 'Count the number of universities per academy. Display id_academie and the count (nb). Sort by descending count.' },
            hint: { fr: 'Table "etablissement", GROUP BY id_academie', en: 'Table "etablissement", GROUP BY id_academie' },
            solution: "SELECT id_academie, COUNT(*) AS nb FROM etablissement GROUP BY id_academie ORDER BY nb DESC;",
            startSql: "SELECT id_academie, COUNT(*) AS nb\nFROM etablissement\n",
        },
    },
    {
        id: 6,
        icon: '6',
        title: { fr: 'HAVING — Filtrer les groupes', en: 'HAVING — Filtering Groups' },
        concepts: {
            fr: ['HAVING filtre apres GROUP BY (sur les resultats agreges)', 'WHERE filtre avant GROUP BY (sur les lignes individuelles)', 'HAVING peut utiliser COUNT(), AVG(), etc.'],
            en: ['HAVING filters after GROUP BY (on aggregated results)', 'WHERE filters before GROUP BY (on individual rows)', 'HAVING can use COUNT(), AVG(), etc.'],
        },
        theory: {
            fr: 'WHERE filtre les lignes AVANT le regroupement. HAVING filtre les groupes APRES. Utilisez HAVING quand la condition porte sur un resultat d\'agregation (ex: "les groupes ayant plus de 100 observations").',
            en: 'WHERE filters rows BEFORE grouping. HAVING filters groups AFTER. Use HAVING when the condition is on an aggregated result (e.g., "groups having more than 100 observations").',
        },
        syntax: "SELECT category, COUNT(*) AS nb\nFROM table_name\nWHERE individual_condition\nGROUP BY category\nHAVING COUNT(*) > threshold;",
        example: {
            description: { fr: 'Disciplines avec plus de 200 observations et bon taux d\'insertion', en: 'Disciplines with more than 200 observations and good placement rate' },
            query: "SELECT code_discipline,\n       COUNT(*) AS nb,\n       ROUND(AVG(taux_insertion), 1) AS taux_moyen\nFROM statistique\nWHERE taux_insertion IS NOT NULL\nGROUP BY code_discipline\nHAVING COUNT(*) > 200\nORDER BY taux_moyen DESC;",
        },
        practice: {
            prompt: { fr: 'Trouvez les academies ayant plus de 5 universites. Affichez id_academie et le nombre (nb), tries par nombre decroissant.', en: 'Find academies with more than 5 universities. Display id_academie and the count (nb), sorted by descending count.' },
            hint: { fr: 'GROUP BY id_academie HAVING COUNT(*) > 5', en: 'GROUP BY id_academie HAVING COUNT(*) > 5' },
            solution: "SELECT id_academie, COUNT(*) AS nb FROM etablissement GROUP BY id_academie HAVING COUNT(*) > 5 ORDER BY nb DESC;",
            startSql: "SELECT id_academie, COUNT(*) AS nb\nFROM etablissement\nGROUP BY id_academie\n",
        },
    },
    {
        id: 7,
        icon: '7',
        title: { fr: 'JOIN — Combiner les tables', en: 'JOIN — Combining Tables' },
        concepts: {
            fr: ['JOIN combine les lignes de 2+ tables liees', 'ON precise la condition de jointure (souvent FK = PK)', 'Les alias (a, e, s) simplifient l\'ecriture'],
            en: ['JOIN combines rows from 2+ related tables', 'ON specifies the join condition (often FK = PK)', 'Aliases (a, e, s) simplify writing'],
        },
        theory: {
            fr: 'Les donnees relationnelles sont reparties dans plusieurs tables. JOIN les recombine grace aux cles etrangeres. Dans ProDataViz, statistique reference etablissement (via id_etablissement), discipline (via code_discipline) et enquete (via id_enquete).',
            en: 'Relational data is spread across multiple tables. JOIN recombines them using foreign keys. In ProDataViz, statistique references etablissement (via id_etablissement), discipline (via code_discipline) and enquete (via id_enquete).',
        },
        syntax: "SELECT a.column1, b.column2\nFROM table_a a\nJOIN table_b b ON a.fk = b.pk;",
        example: {
            description: { fr: 'Universites avec leur academie', en: 'Universities with their academy' },
            query: "SELECT e.nom AS universite,\n       a.nom AS academie\nFROM etablissement e\nJOIN academie a ON e.id_academie = a.id\nORDER BY a.nom, e.nom\nLIMIT 10;",
        },
        practice: {
            prompt: { fr: 'Listez les disciplines avec le nom de leur domaine. Affichez "discipline" et "domaine". Triez par domaine puis discipline.', en: 'List disciplines with their domain name. Display "discipline" and "domaine". Sort by domain then discipline.' },
            hint: { fr: 'JOIN domaine dom ON d.code_domaine = dom.code', en: 'JOIN domaine dom ON d.code_domaine = dom.code' },
            solution: "SELECT d.nom AS discipline, dom.nom AS domaine FROM discipline d JOIN domaine dom ON d.code_domaine = dom.code ORDER BY dom.nom, d.nom;",
            startSql: "SELECT d.nom AS discipline, dom.nom AS domaine\nFROM discipline d\nJOIN ",
        },
    },
    {
        id: 8,
        icon: '8',
        title: { fr: 'JOINs multiples', en: 'Multi-table JOINs' },
        concepts: {
            fr: ['Enchainez plusieurs JOIN pour traverser le schema', 'Chaque JOIN ajoute les colonnes d\'une nouvelle table', 'LEFT JOIN garde les lignes sans correspondance (NULL)'],
            en: ['Chain multiple JOINs to traverse the schema', 'Each JOIN adds columns from a new table', 'LEFT JOIN keeps rows without matches (NULL)'],
        },
        theory: {
            fr: 'Pour afficher le nom de l\'universite, la discipline ET l\'annee d\'une statistique, il faut joindre 4 tables : statistique → etablissement, statistique → discipline, statistique → enquete. C\'est le coeur de l\'analyse relationnelle.',
            en: 'To display the university name, discipline AND year of a statistic, you need to join 4 tables: statistique → etablissement, statistique → discipline, statistique → enquete. This is the core of relational analysis.',
        },
        syntax: "SELECT e.nom, d.nom, q.annee, s.salaire_net_median\nFROM statistique s\nJOIN etablissement e ON s.id_etablissement = e.id\nJOIN discipline d ON s.code_discipline = d.code\nJOIN enquete q ON s.id_enquete = q.id;",
        example: {
            description: { fr: 'Top 5 salaires avec universite et discipline', en: 'Top 5 salaries with university and discipline' },
            query: "SELECT e.nom AS universite,\n       d.nom AS discipline,\n       s.salaire_net_median\nFROM statistique s\nJOIN etablissement e ON s.id_etablissement = e.id\nJOIN discipline d ON s.code_discipline = d.code\nWHERE s.salaire_net_median IS NOT NULL\nORDER BY s.salaire_net_median DESC\nLIMIT 5;",
        },
        practice: {
            prompt: { fr: 'Affichez universite, discipline et annee pour l\'Informatique (disc16) en 2020. Limitez a 10 resultats.', en: 'Display university, discipline and year for Computer Science (disc16) in 2020. Limit to 10 results.' },
            hint: { fr: 'Joignez statistique, etablissement, discipline et enquete. Filtrez avec WHERE.', en: 'Join statistique, etablissement, discipline and enquete. Filter with WHERE.' },
            solution: "SELECT e.nom AS universite, d.nom AS discipline, q.annee FROM statistique s JOIN etablissement e ON s.id_etablissement = e.id JOIN discipline d ON s.code_discipline = d.code JOIN enquete q ON s.id_enquete = q.id WHERE s.code_discipline = 'disc16' AND q.annee = '2020' LIMIT 10;",
            startSql: "SELECT e.nom AS universite,\n       d.nom AS discipline,\n       q.annee\nFROM statistique s\n",
        },
    },
    {
        id: 9,
        icon: '9',
        title: { fr: 'Sous-requetes', en: 'Subqueries' },
        concepts: {
            fr: ['Une sous-requete est un SELECT imbrique dans un autre', 'Scalaire : retourne une valeur (dans WHERE ou HAVING)', 'Table : retourne un ensemble (dans FROM ou IN)'],
            en: ['A subquery is a SELECT nested inside another', 'Scalar: returns a single value (in WHERE or HAVING)', 'Table: returns a set (in FROM or IN)'],
        },
        theory: {
            fr: 'Les sous-requetes permettent de comparer des valeurs a des statistiques calculees dynamiquement. Par exemple : "les universites dont le salaire est superieur a la moyenne nationale" necessite une sous-requete pour calculer cette moyenne.',
            en: 'Subqueries allow comparing values to dynamically calculated statistics. For example: "universities whose salary is above the national average" requires a subquery to calculate that average.',
        },
        syntax: "SELECT column1\nFROM table_name\nWHERE column2 > (\n    SELECT AVG(column2)\n    FROM table_name\n);",
        example: {
            description: { fr: 'Universites au-dessus du salaire moyen national (Informatique)', en: 'Universities above the national average salary (Computer Science)' },
            query: "SELECT e.nom, s.salaire_net_median\nFROM statistique s\nJOIN etablissement e ON s.id_etablissement = e.id\nWHERE s.salaire_net_median > (\n    SELECT AVG(salaire_net_median)\n    FROM statistique\n    WHERE salaire_net_median IS NOT NULL\n)\nAND s.code_discipline = 'disc16'\nORDER BY s.salaire_net_median DESC\nLIMIT 10;",
        },
        practice: {
            prompt: { fr: 'Trouvez les disciplines dont le salaire moyen est superieur a la moyenne globale. Affichez "discipline" et "salaire_moyen" (arrondi).', en: 'Find disciplines whose average salary is above the global average. Display "discipline" and "salaire_moyen" (rounded).' },
            hint: { fr: 'GROUP BY avec HAVING AVG(...) > (SELECT AVG(...) FROM ...)', en: 'GROUP BY with HAVING AVG(...) > (SELECT AVG(...) FROM ...)' },
            solution: "SELECT d.nom AS discipline, ROUND(AVG(s.salaire_net_median)) AS salaire_moyen FROM statistique s JOIN discipline d ON s.code_discipline = d.code WHERE s.salaire_net_median IS NOT NULL GROUP BY d.code, d.nom HAVING AVG(s.salaire_net_median) > (SELECT AVG(salaire_net_median) FROM statistique WHERE salaire_net_median IS NOT NULL) ORDER BY salaire_moyen DESC;",
            startSql: "SELECT d.nom AS discipline,\n       ROUND(AVG(s.salaire_net_median)) AS salaire_moyen\nFROM statistique s\nJOIN discipline d ON s.code_discipline = d.code\nWHERE s.salaire_net_median IS NOT NULL\nGROUP BY d.code, d.nom\nHAVING ",
        },
    },
    {
        id: 10,
        icon: '10',
        title: { fr: 'Fonctions de fenetrage', en: 'Window Functions' },
        concepts: {
            fr: ['RANK() attribue un rang avec ex-aequo', 'ROW_NUMBER() attribue un numero unique', 'LAG()/LEAD() accedent aux lignes precedentes/suivantes', 'OVER(ORDER BY ...) definit la fenetre de calcul'],
            en: ['RANK() assigns a rank with ties', 'ROW_NUMBER() assigns a unique number', 'LAG()/LEAD() access previous/next rows', 'OVER(ORDER BY ...) defines the calculation window'],
        },
        theory: {
            fr: 'Les fonctions de fenetrage (window functions) calculent des valeurs sur un ensemble de lignes SANS les regrouper. Contrairement a GROUP BY, chaque ligne garde son individualite. RANK(), ROW_NUMBER() et LAG() sont les plus courantes.',
            en: 'Window functions compute values across a set of rows WITHOUT grouping them. Unlike GROUP BY, each row keeps its individuality. RANK(), ROW_NUMBER() and LAG() are the most common.',
        },
        syntax: "SELECT column1,\n       RANK() OVER (ORDER BY column2 DESC) AS rang,\n       LAG(column2) OVER (ORDER BY column3) AS precedent\nFROM table_name;",
        example: {
            description: { fr: 'Classement des disciplines par salaire moyen avec rang', en: 'Discipline ranking by average salary with rank' },
            query: "WITH avg_sal AS (\n  SELECT d.nom AS discipline,\n         ROUND(AVG(s.salaire_net_median)) AS salaire_moyen\n  FROM statistique s\n  JOIN discipline d ON s.code_discipline = d.code\n  WHERE s.salaire_net_median IS NOT NULL\n  GROUP BY d.code, d.nom\n)\nSELECT discipline,\n       salaire_moyen,\n       RANK() OVER (ORDER BY salaire_moyen DESC) AS rang\nFROM avg_sal;",
        },
        practice: {
            prompt: { fr: 'Classez les academies par nombre d\'universites avec RANK(). Affichez "academie", "nb_universites" et "rang".', en: 'Rank academies by number of universities using RANK(). Display "academie", "nb_universites" and "rang".' },
            hint: { fr: 'CTE avec COUNT puis RANK() OVER (ORDER BY nb DESC)', en: 'CTE with COUNT then RANK() OVER (ORDER BY nb DESC)' },
            solution: "WITH counts AS (SELECT a.nom AS academie, COUNT(e.id) AS nb_universites FROM academie a LEFT JOIN etablissement e ON a.id = e.id_academie GROUP BY a.id, a.nom) SELECT academie, nb_universites, RANK() OVER (ORDER BY nb_universites DESC) AS rang FROM counts;",
            startSql: "WITH counts AS (\n  SELECT a.nom AS academie,\n         COUNT(e.id) AS nb_universites\n  FROM academie a\n  LEFT JOIN etablissement e ON a.id = e.id_academie\n  GROUP BY a.id, a.nom\n)\nSELECT ",
        },
    },
];

/* ============================================================
   Component
   ============================================================ */
export default function ApprendreSql() {
    const t = useTranslations('SqlLearn');
    const locale = useLocale();

    const [activeIdx, setActiveIdx] = useState(0);
    const [completed, setCompleted] = useState({});

    // Example state
    const [exampleResult, setExampleResult] = useState(null);
    const [exampleLoading, setExampleLoading] = useState(false);
    const [exampleError, setExampleError] = useState(null);

    // Practice state
    const [practiceSql, setPracticeSql] = useState('');
    const [practiceResult, setPracticeResult] = useState(null);
    const [practiceLoading, setPracticeLoading] = useState(false);
    const [practiceError, setPracticeError] = useState(null);
    const [practiceCorrect, setPracticeCorrect] = useState(null);
    const [showHint, setShowHint] = useState(false);
    const [showSolution, setShowSolution] = useState(false);

    const lesson = LESSONS[activeIdx];
    const lang = locale === 'en' ? 'en' : 'fr';
    const totalCompleted = Object.keys(completed).length;

    const selectLesson = (idx) => {
        setActiveIdx(idx);
        setExampleResult(null);
        setExampleError(null);
        setPracticeResult(null);
        setPracticeError(null);
        setPracticeCorrect(null);
        setShowHint(false);
        setShowSolution(false);
        setPracticeSql(LESSONS[idx].practice.startSql);
    };

    const runExample = useCallback(async () => {
        setExampleLoading(true);
        setExampleError(null);
        try {
            const res = await apiPost(`/api/sql/execute?lang=${lang}`, { sql: lesson.example.query });
            setExampleResult(res);
        } catch (e) {
            setExampleError(e.message);
        }
        setExampleLoading(false);
    }, [lesson, lang]);

    const runPractice = useCallback(async () => {
        if (!practiceSql.trim()) return;
        setPracticeLoading(true);
        setPracticeError(null);
        setPracticeCorrect(null);
        try {
            const [userRes, solRes] = await Promise.all([
                apiPost(`/api/sql/execute?lang=${lang}`, { sql: practiceSql }),
                apiPost(`/api/sql/execute?lang=${lang}`, { sql: lesson.practice.solution }),
            ]);
            setPracticeResult(userRes);

            // Compare results
            const userVals = JSON.stringify(userRes.rows.map(r => Object.values(r)));
            const solVals = JSON.stringify(solRes.rows.map(r => Object.values(r)));
            const isCorrect = userVals === solVals;
            setPracticeCorrect(isCorrect);

            if (isCorrect) {
                setCompleted(prev => ({ ...prev, [lesson.id]: true }));
            }
        } catch (e) {
            setPracticeError(e.message);
        }
        setPracticeLoading(false);
    }, [practiceSql, lesson, lang]);

    const resetPractice = () => {
        setPracticeSql(lesson.practice.startSql);
        setPracticeResult(null);
        setPracticeError(null);
        setPracticeCorrect(null);
        setShowHint(false);
        setShowSolution(false);
    };

    return (
        <>
            <div className="page-header">
                <h1><GraduationCap className="page-header-icon" /> {t('title')}</h1>
                <p>{t('subtitle')}</p>
            </div>

            {/* Progress bar */}
            <div className="card" style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 24, padding: '20px 28px' }}>
                <Sparkles size={20} style={{ color: 'var(--accent-light)' }} />
                <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                    {t('progress', { count: totalCompleted, total: LESSONS.length })}
                </span>
                <div className="progress-bar" style={{ flex: 1 }}>
                    <div className="progress-fill" style={{ width: `${(totalCompleted / LESSONS.length) * 100}%` }} />
                </div>
            </div>

            <div className="learn-layout">
                {/* Lesson sidebar */}
                <div className="learn-sidebar">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-secondary)', marginBottom: 16, fontWeight: 700 }}>
                        <BookOpen size={16} /> {t('lessons')}
                    </h3>
                    {LESSONS.map((l, idx) => (
                        <button
                            key={l.id}
                            className={`learn-lesson-btn ${idx === activeIdx ? 'active' : ''} ${completed[l.id] ? 'completed' : ''}`}
                            onClick={() => selectLesson(idx)}
                        >
                            <span className="learn-lesson-num">
                                {completed[l.id] ? <CheckCircle2 size={16} /> : l.icon}
                            </span>
                            <span className="learn-lesson-title">{l.title[lang]}</span>
                            {idx === activeIdx && <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.6 }} />}
                        </button>
                    ))}
                </div>

                {/* Lesson content */}
                <div className="learn-content">
                    {/* Theory */}
                    <div className="learn-section">
                        <div className="learn-section-header">
                            <BookOpen size={18} />
                            <h2>{t('section_concept')}</h2>
                        </div>
                        <p className="learn-theory">{lesson.theory[lang]}</p>
                        <div className="learn-concepts">
                            {lesson.concepts[lang].map((c, i) => (
                                <div key={i} className="learn-concept-item">
                                    <CheckCircle2 size={14} style={{ color: 'var(--success)', flexShrink: 0, marginTop: 2 }} />
                                    <span>{c}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Syntax */}
                    <div className="learn-section">
                        <div className="learn-section-header">
                            <Code size={18} />
                            <h2>{t('section_syntax')}</h2>
                        </div>
                        <pre className="learn-syntax">{lesson.syntax}</pre>
                    </div>

                    {/* Interactive example */}
                    <div className="learn-section">
                        <div className="learn-section-header">
                            <Play size={18} />
                            <h2>{t('section_example')}</h2>
                        </div>
                        <p style={{ marginBottom: 16, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                            {lesson.example.description[lang]}
                        </p>
                        <div className="learn-editor-block">
                            <pre className="learn-example-sql">{lesson.example.query}</pre>
                            <button className="btn btn-primary btn-sm" onClick={runExample} disabled={exampleLoading} style={{ marginTop: 12 }}>
                                {exampleLoading
                                    ? <><Loader2 size={14} className="animate-spin" /> {t('running')}</>
                                    : <><Play size={14} /> {t('run_example')}</>}
                            </button>
                        </div>
                        {exampleError && (
                            <div className="learn-error">
                                <AlertCircle size={16} /> {exampleError}
                            </div>
                        )}
                        {exampleResult && (
                            <div className="learn-result-table">
                                <div className="learn-result-meta">
                                    <span>{t('rows', { count: exampleResult.row_count })}</span>
                                    <span>{exampleResult.execution_time_ms} ms</span>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table className="data-table" style={{ fontSize: '0.85rem' }}>
                                        <thead>
                                            <tr>
                                                {exampleResult.columns.map(c => <th key={c}>{c}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {exampleResult.rows.slice(0, 20).map((row, i) => (
                                                <tr key={i}>
                                                    {exampleResult.columns.map(c => (
                                                        <td key={c} className={typeof row[c] === 'number' ? 'num' : ''}>
                                                            {row[c] != null ? String(row[c]) : <span style={{ color: 'var(--text-muted)' }}>NULL</span>}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Practice */}
                    <div className="learn-section learn-practice">
                        <div className="learn-section-header">
                            <GraduationCap size={18} />
                            <h2>{t('section_practice')}</h2>
                            {practiceCorrect === true && (
                                <span className="badge badge-success" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <CheckCircle2 size={12} /> {t('correct')}
                                </span>
                            )}
                        </div>
                        <div className="learn-practice-prompt">
                            <p>{lesson.practice.prompt[lang]}</p>
                        </div>

                        <div style={{ border: '1px solid var(--glass-border-strong)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: 16 }}>
                            <Editor
                                height="180px"
                                defaultLanguage="sql"
                                value={practiceSql || lesson.practice.startSql}
                                onChange={v => setPracticeSql(v || '')}
                                theme="vs-dark"
                                options={{
                                    fontSize: 14,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    minimap: { enabled: false },
                                    scrollBeyondLastLine: false,
                                    padding: { top: 12 },
                                    lineNumbers: 'on',
                                    wordWrap: 'on',
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                            <button className="btn btn-primary btn-sm" onClick={runPractice} disabled={practiceLoading}>
                                {practiceLoading
                                    ? <><Loader2 size={14} className="animate-spin" /> {t('checking')}</>
                                    : <><Play size={14} /> {t('submit_answer')}</>}
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => setShowHint(!showHint)}>
                                <Lightbulb size={14} /> {t('hint')}
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => setShowSolution(!showSolution)}>
                                {showSolution ? <EyeOff size={14} /> : <Eye size={14} />} {t('solution')}
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={resetPractice}>
                                <RotateCcw size={14} /> {t('reset')}
                            </button>
                        </div>

                        {showHint && (
                            <div className="learn-hint">
                                <Lightbulb size={16} style={{ color: '#fbbf24', flexShrink: 0 }} />
                                <span>{lesson.practice.hint[lang]}</span>
                            </div>
                        )}

                        {showSolution && (
                            <div className="learn-solution">
                                <pre>{lesson.practice.solution}</pre>
                            </div>
                        )}

                        {practiceError && (
                            <div className="learn-error">
                                <AlertCircle size={16} /> {practiceError}
                            </div>
                        )}

                        {practiceCorrect === true && (
                            <div className="learn-feedback learn-feedback-correct">
                                <CheckCircle2 size={20} />
                                <div>
                                    <strong>{t('correct')}</strong>
                                    <p>{t('correct_msg')}</p>
                                </div>
                                {activeIdx < LESSONS.length - 1 && (
                                    <button className="btn btn-primary btn-sm" onClick={() => selectLesson(activeIdx + 1)} style={{ marginLeft: 'auto' }}>
                                        {t('next_lesson')} <ArrowRight size={14} />
                                    </button>
                                )}
                            </div>
                        )}

                        {practiceCorrect === false && (
                            <div className="learn-feedback learn-feedback-wrong">
                                <AlertCircle size={20} />
                                <div>
                                    <strong>{t('incorrect')}</strong>
                                    <p>{t('incorrect_msg')}</p>
                                </div>
                            </div>
                        )}

                        {practiceResult && practiceCorrect !== null && (
                            <div className="learn-result-table" style={{ marginTop: 16 }}>
                                <div className="learn-result-meta">
                                    <span>{t('your_result')}: {t('rows', { count: practiceResult.row_count })}</span>
                                    <span>{practiceResult.execution_time_ms} ms</span>
                                </div>
                                <div style={{ overflowX: 'auto', maxHeight: 300 }}>
                                    <table className="data-table" style={{ fontSize: '0.85rem' }}>
                                        <thead>
                                            <tr>
                                                {practiceResult.columns.map(c => <th key={c}>{c}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {practiceResult.rows.slice(0, 15).map((row, i) => (
                                                <tr key={i}>
                                                    {practiceResult.columns.map(c => (
                                                        <td key={c} className={typeof row[c] === 'number' ? 'num' : ''}>
                                                            {row[c] != null ? String(row[c]) : <span style={{ color: 'var(--text-muted)' }}>NULL</span>}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
