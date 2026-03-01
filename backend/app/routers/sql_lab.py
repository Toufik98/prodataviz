"""
SQL Lab router — DBeaver-inspired SQL editor backend.

Endpoints:
  - POST /api/sql/execute   — run SELECT queries (read-only)
  - POST /api/sql/explain    — EXPLAIN QUERY PLAN + complexity scoring
  - GET  /api/sql/schema     — database schema for TreeView
  - GET  /api/sql/challenges — list challenges
  - GET  /api/sql/challenges/{id} — get a challenge
  - POST /api/sql/challenges/{id}/submit — submit solution + score
"""
import time
import re
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session
from ..database import get_db
from ..schemas import SqlQuery

router = APIRouter(prefix="/api/sql", tags=["SQL Lab"])

# ──────────────────────────────────────────────
# Security: forbidden keywords
# ──────────────────────────────────────────────

FORBIDDEN_KEYWORDS = [
    "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE",
    "ATTACH", "DETACH", "PRAGMA", "VACUUM", "REINDEX",
    "REPLACE", "MERGE", "TRUNCATE", "GRANT", "REVOKE",
]

def validate_sql(sql: str) -> str:
    """Validate that the SQL is a read-only SELECT statement."""
    # Remove inline comments (--) and block comments (/*...*/)
    plain_sql = re.sub(r'--.*', '', sql)
    plain_sql = re.sub(r'/\*.*?\*/', '', plain_sql, flags=re.DOTALL)
    
    cleaned = plain_sql.strip()
    if not cleaned:
        raise HTTPException(400, "Requête vide")

    # Must start with SELECT or WITH (CTE)
    upper = cleaned.upper()
    if not (upper.startswith("SELECT") or upper.startswith("WITH") or upper.startswith("EXPLAIN")):
        raise HTTPException(400, "Seules les requêtes SELECT (ou WITH...SELECT) sont autorisées")

    # Block forbidden keywords (check word boundaries)
    for kw in FORBIDDEN_KEYWORDS:
        pattern = r'\b' + kw + r'\b'
        if re.search(pattern, upper):
            raise HTTPException(400, f"Mot-clé interdit : {kw}")

    # Block semicolons that could allow injection of multiple statements
    if cleaned.rstrip(";").count(";") > 0:
        raise HTTPException(400, "Plusieurs instructions ne sont pas autorisées")

    return cleaned


# ──────────────────────────────────────────────
# Complexity scoring algorithm
# ──────────────────────────────────────────────

def compute_complexity_score(sql: str, plan_rows: list, lang: str = "fr") -> dict:
    """
    Analyze an EXPLAIN QUERY PLAN output and score the query 0-100.
    Higher is better. Grade: A(≥90), B(≥75), C(≥60), D(≥40), F(<40).
    """
    score = 100
    feedback = []
    uses_index = False
    sql_upper = sql.upper()

    # --- Analyze execution plan ---
    for step in plan_rows:
        detail = step.get("detail", "")

        # Full table scan = bad
        if "SCAN" in detail and "USING" not in detail:
            score -= 25
            table_match = re.search(r"SCAN (\w+)", detail)
            table_name = table_match.group(1) if table_match else "table"
            feedback.append(f"❌ Full table scan sur `{table_name}` → ajoutez un WHERE indexé" if lang == "fr" else f"❌ Full table scan on `{table_name}` → add an indexed WHERE")

        # Using index = good
        if "USING INDEX" in detail:
            uses_index = True
            idx_match = re.search(r"USING (?:COVERING )?INDEX (\w+)", detail)
            idx_name = idx_match.group(1) if idx_match else "index"
            feedback.append(f"✅ Index utilisé : `{idx_name}`" if lang == "fr" else f"✅ Index used: `{idx_name}`")

        # Covering index = great (no table lookup needed)
        if "USING COVERING INDEX" in detail:
            score += 5
            feedback.append("🌟 Covering index → pas de lookup table, optimal !" if lang == "fr" else "🌟 Covering index → no table lookup, optimal!")

        # TEMP B-TREE = sorting without appropriate index
        if "TEMP B-TREE" in detail:
            score -= 10
            if "ORDER BY" in detail:
                feedback.append("⚠️ Tri temporaire (ORDER BY sans index adapté)" if lang == "fr" else "⚠️ Temporary sort (ORDER BY without suitable index)")
            elif "GROUP BY" in detail:
                feedback.append("⚠️ Regroupement temporaire (GROUP BY sans index adapté)" if lang == "fr" else "⚠️ Temporary grouping (GROUP BY without suitable index)")
            elif "DISTINCT" in detail:
                feedback.append("⚠️ Dédoublonnage temporaire (DISTINCT coûteux)" if lang == "fr" else "⚠️ Temporary deduplication (expensive DISTINCT)")
            else:
                feedback.append("⚠️ TEMP B-TREE détecté → opération non indexée" if lang == "fr" else "⚠️ TEMP B-TREE detected → unindexed operation")

        # SEARCH with PK = optimal
        if "SEARCH" in detail and "PRIMARY KEY" in detail:
            uses_index = True
            feedback.append(f"✅ Recherche par clé primaire (optimal)" if lang == "fr" else f"✅ Primary key search (optimal)")

    # --- SQL syntax analysis ---
    if "SELECT *" in sql_upper:
        score -= 15
        feedback.append("⚠️ `SELECT *` → spécifiez uniquement les colonnes nécessaires" if lang == "fr" else "⚠️ `SELECT *` → specify only the necessary columns")

    if "LIMIT" not in sql_upper and "COUNT" not in sql_upper and "AVG" not in sql_upper:
        score -= 10
        feedback.append("⚠️ Pas de LIMIT → risque de résultat volumineux" if lang == "fr" else "⚠️ No LIMIT → risk of large result set")

    join_count = sql_upper.count("JOIN")
    if join_count > 3:
        score -= 5 * (join_count - 3)
        feedback.append(f"⚠️ {join_count} JOINs → envisagez de décomposer la requête" if lang == "fr" else f"⚠️ {join_count} JOINs → consider breaking down the query")

    if "WHERE" not in sql_upper and "JOIN" in sql_upper:
        score -= 15
        feedback.append("❌ JOIN sans WHERE → potentiel produit cartésien" if lang == "fr" else "❌ JOIN without WHERE → potential Cartesian product")
    elif "WHERE" not in sql_upper and join_count == 0:
        score -= 10
        feedback.append("⚠️ Pas de clause WHERE → scan complet probable" if lang == "fr" else "⚠️ No WHERE clause → full scan probable")

    if re.search(r"LIKE\s+'%", sql_upper):
        score -= 10
        feedback.append("⚠️ `LIKE '%...'` → empêche l'utilisation d'index (wildcard en début)" if lang == "fr" else "⚠️ `LIKE '%...'` → prevents index use (leading wildcard)")

    # Check for subqueries in WHERE (could be inefficient)
    if sql_upper.count("SELECT") > 2:
        feedback.append("💡 Sous-requêtes multiples détectées → vérifiez si un JOIN serait plus efficace" if lang == "fr" else "💡 Multiple subqueries detected → check if a JOIN is more efficient")

    # Check for DISTINCT (often a sign of a bad join)
    if "DISTINCT" in sql_upper and join_count > 1:
        score -= 5
        feedback.append("⚠️ DISTINCT avec JOINs multiples → vérifiez la cardinalité des jointures" if lang == "fr" else "⚠️ DISTINCT with multiple JOINs → check join cardinality")

    if not feedback:
        feedback.append("✅ Requête bien optimisée !" if lang == "fr" else "✅ Query well optimized!")

    # Clamp and grade
    score = max(0, min(100, score))
    if score >= 90:
        grade = "A"
    elif score >= 75:
        grade = "B"
    elif score >= 60:
        grade = "C"
    elif score >= 40:
        grade = "D"
    else:
        grade = "F"

    return {
        "score": score,
        "grade": grade,
        "feedback": feedback,
        "uses_index": uses_index,
        "cost": len(plan_rows),
    }


# ──────────────────────────────────────────────
# SQL Challenges
# ──────────────────────────────────────────────

CHALLENGES = [
    {
        "id": 1,
        "level": 1,
        "title": {"fr": "Lister les académies", "en": "List academies"},
        "question": {"fr": "Listez toutes les académies par ordre alphabétique. Retournez leurs colonnes 'id' et 'nom'.", "en": "List all academies in alphabetical order. Return their 'id' and 'nom' columns."},
        "expected_columns": ["id", "nom"],
        "expected_row_count": 29,
        "hints": {"fr": ["Utilisez SELECT et ORDER BY", "La table s'appelle 'academie'"], "en": ["Use SELECT and ORDER BY", "The table is named 'academie'"]},
        "optimal_query": "SELECT id, nom FROM academie ORDER BY nom",
        "optimal_score": 95,
        "explanation": {"fr": "Requête simple sans JOIN ni filtre. L'ORDER BY sur 29 lignes est instantané.", "en": "Simple query without JOIN or filter. ORDER BY on 29 rows is instantaneous."},
    },
    {
        "id": 2,
        "level": 1,
        "title": {"fr": "Universités par académie", "en": "Universities by academy"},
        "question": {"fr": "Combien d'universités y a-t-il dans chaque académie ? Retournez le nom de l'académie ('academie') et le nombre ('nb_universites'), trié par nombre décroissant.", "en": "How many universities are there in each academy? Return the academy name ('academie') and the count ('nb_universites'), sorted by descending count."},
        "expected_columns": ["academie", "nb_universites"],
        "expected_row_count": 29,
        "hints": {"fr": ["Joignez 'academie' et 'etablissement'", "Utilisez COUNT() et GROUP BY"], "en": ["Join 'academie' and 'etablissement'", "Use COUNT() and GROUP BY"]},
        "optimal_query": "SELECT a.nom AS academie, COUNT(e.id) AS nb_universites FROM academie a LEFT JOIN etablissement e ON a.id = e.id_academie GROUP BY a.id, a.nom ORDER BY nb_universites DESC",
        "optimal_score": 90,
        "explanation": {"fr": "LEFT JOIN pour inclure les académies sans établissement. GROUP BY sur la PK est optimal.", "en": "LEFT JOIN to include academies without establishments. GROUP BY on the PK is optimal."},
    },
    {
        "id": 3,
        "level": 1,
        "title": {"fr": "Statistiques Informatique", "en": "Computer Science Stats"},
        "question": {"fr": "Trouvez toutes les statistiques pour l'Informatique (code 'disc16') avec plus de 50 répondants. Retournez les colonnes 'id', 'id_etablissement', 'nombre_reponses', 'taux_insertion'. Triez par taux d'insertion décroissant.", "en": "Find all statistics for Computer Science (code 'disc16') with more than 50 respondents. Return 'id', 'id_etablissement', 'nombre_reponses', 'taux_insertion'. Sort by descending placement rate."},
        "expected_columns": ["id", "id_etablissement", "nombre_reponses", "taux_insertion"],
        "expected_row_count": None,
        "hints": {"fr": ["Filtrez avec WHERE sur code_discipline et nombre_reponses", "N'oubliez pas que taux_insertion peut être NULL"], "en": ["Filter with WHERE on code_discipline and nombre_reponses", "Don't forget taux_insertion can be NULL"]},
        "optimal_query": "SELECT id, id_etablissement, nombre_reponses, taux_insertion FROM statistique WHERE code_discipline = 'disc16' AND nombre_reponses > 50 AND taux_insertion IS NOT NULL ORDER BY taux_insertion DESC",
        "optimal_score": 90,
        "explanation": {"fr": "L'index idx_stat_disc accélère le filtre sur code_discipline. Le WHERE élimine les NULL.", "en": "The idx_stat_disc index speeds up filtering on code_discipline. The WHERE clause eliminates NULLs."},
    },
    {
        "id": 4,
        "level": 1,
        "title": {"fr": "Salaire maximal", "en": "Maximum Salary"},
        "question": {"fr": "Quel est le salaire net médian le plus élevé de toute la base ? Retournez une seule colonne 'max_salaire'.", "en": "What is the highest median net salary in the entire database? Return a single column 'max_salaire'."},
        "expected_columns": ["max_salaire"],
        "expected_row_count": 1,
        "hints": {"fr": ["Utilisez la fonction MAX()", "Colonne : salaire_net_median dans la table statistique"], "en": ["Use the MAX() function", "Column: salaire_net_median in the statistique table"]},
        "optimal_query": "SELECT MAX(salaire_net_median) AS max_salaire FROM statistique",
        "optimal_score": 85,
        "explanation": {"fr": "MAX() avec l'index idx_stat_salaire est très rapide (dernier élément du B-tree).", "en": "MAX() with the idx_stat_salaire index is extremely fast (last element of the B-tree)."},
    },
    {
        "id": 5,
        "level": 1,
        "title": {"fr": "Top 10 insertions", "en": "Top 10 Placements"},
        "question": {"fr": "Listez les 10 enregistrements avec le meilleur taux d'insertion (hors NULL). Retournez 'id', 'id_etablissement', 'code_discipline', 'taux_insertion'.", "en": "List the 10 records with the best placement rate (excluding NULL). Return 'id', 'id_etablissement', 'code_discipline', 'taux_insertion'."},
        "expected_columns": ["id", "id_etablissement", "code_discipline", "taux_insertion"],
        "expected_row_count": 10,
        "hints": {"fr": ["Filtrez les NULL avec WHERE ... IS NOT NULL", "Utilisez ORDER BY ... DESC LIMIT 10"], "en": ["Filter NULLs with WHERE ... IS NOT NULL", "Use ORDER BY ... DESC LIMIT 10"]},
        "optimal_query": "SELECT id, id_etablissement, code_discipline, taux_insertion FROM statistique WHERE taux_insertion IS NOT NULL ORDER BY taux_insertion DESC LIMIT 10",
        "optimal_score": 95,
        "explanation": {"fr": "L'index idx_stat_insertion couvre exactement cette requête. Pas de scan nécessaire.", "en": "The idx_stat_insertion index covers this query exactly. No scan is needed."},
    },
    {
        "id": 6,
        "level": 2,
        "title": {"fr": "Top 5 salaires en Informatique", "en": "Top 5 salaries in CS"},
        "question": {"fr": "Trouvez les 5 universités avec le meilleur salaire net médian en Informatique (disc16) à 30 mois. Retournez 'universite' (nom de l'établissement) et 'salaire_net_median'.", "en": "Find the 5 universities with the best median net salary in Computer Science (disc16) at 30 months. Return 'universite' (establishment name) and 'salaire_net_median'."},
        "expected_columns": ["universite", "salaire_net_median"],
        "expected_row_count": 5,
        "hints": {"fr": ["Joignez statistique, etablissement et enquete (3 tables)", "Filtrez sur code_discipline = 'disc16' et situation = '30 mois après le diplôme'", "N'oubliez pas WHERE salaire_net_median IS NOT NULL"], "en": ["Join statistique, etablissement and enquete (3 tables)", "Filter on code_discipline = 'disc16' and situation = '30 mois après le diplôme'", "Don't forget WHERE salaire_net_median IS NOT NULL"]},
        "optimal_query": "SELECT e.nom AS universite, s.salaire_net_median FROM statistique s JOIN etablissement e ON s.id_etablissement = e.id JOIN enquete q ON s.id_enquete = q.id WHERE s.code_discipline = 'disc16' AND q.situation = '30 mois après le diplôme' AND s.salaire_net_median IS NOT NULL ORDER BY s.salaire_net_median DESC LIMIT 5",
        "optimal_score": 90,
        "explanation": {"fr": "3 JOINs sur clés primaires (O(1) chacun). L'index sur salaire accélère le tri.", "en": "3 JOINs on primary keys (O(1) each). The index on salary speeds up sorting."},
    },
    {
        "id": 7,
        "level": 2,
        "title": {"fr": "Salaire moyen par domaine", "en": "Average salary by domain"},
        "question": {"fr": "Calculez le salaire net médian moyen par domaine de formation, trié du plus élevé au plus bas. Retournez 'domaine' et 'salaire_moyen' (arrondi à l'entier).", "en": "Calculate the average median net salary by training domain, sorted from highest to lowest. Return 'domaine' and 'salaire_moyen' (rounded to integer)."},
        "expected_columns": ["domaine", "salaire_moyen"],
        "expected_row_count": 5,
        "hints": {"fr": ["Joignez statistique → discipline → domaine", "Utilisez AVG() et GROUP BY", "Fonction ROUND() pour arrondir"], "en": ["Join statistique → discipline → domaine", "Use AVG() and GROUP BY", "ROUND() function to round"]},
        "optimal_query": "SELECT d.nom AS domaine, ROUND(AVG(s.salaire_net_median)) AS salaire_moyen FROM statistique s JOIN discipline disc ON s.code_discipline = disc.code JOIN domaine d ON disc.code_domaine = d.code WHERE s.salaire_net_median IS NOT NULL GROUP BY d.code, d.nom ORDER BY salaire_moyen DESC",
        "optimal_score": 85,
        "explanation": {"fr": "Double JOIN efficace grâce aux clés naturelles. GROUP BY sur la PK du domaine.", "en": "Efficient double JOIN thanks to natural keys. GROUP BY on the domain PK."},
    },
    {
        "id": 8,
        "level": 2,
        "title": {"fr": "Universités performantes", "en": "High-performing universities"},
        "question": {"fr": "Trouvez les universités qui ont un taux d'insertion > 95% dans au moins 3 disciplines différentes (toutes années, toutes situations confondues). Retournez 'universite' (nom) et 'nb_disciplines'.", "en": "Find universities that have a placement rate > 95% in at least 3 different disciplines (all years, all situations combined). Return 'universite' (name) and 'nb_disciplines'."},
        "expected_columns": ["universite", "nb_disciplines"],
        "expected_row_count": None,
        "hints": {"fr": ["Utilisez GROUP BY et HAVING avec COUNT(DISTINCT ...)", "Le filtre sur le nombre de disciplines doit être dans HAVING, pas WHERE"], "en": ["Use GROUP BY and HAVING with COUNT(DISTINCT ...)", "The filter on the number of disciplines must be in HAVING, not WHERE"]},
        "optimal_query": "SELECT e.nom AS universite, COUNT(DISTINCT s.code_discipline) AS nb_disciplines FROM statistique s JOIN etablissement e ON s.id_etablissement = e.id WHERE s.taux_insertion > 95 AND s.taux_insertion IS NOT NULL GROUP BY e.id, e.nom HAVING COUNT(DISTINCT s.code_discipline) >= 3 ORDER BY nb_disciplines DESC",
        "optimal_score": 80,
        "explanation": {"fr": "HAVING filtre après le GROUP BY. COUNT(DISTINCT) est nécessaire pour éviter les doublons par année.", "en": "HAVING filters after the GROUP BY. COUNT(DISTINCT) is necessary to avoid duplicates by year."},
    },
    {
        "id": 9,
        "level": 2,
        "title": {"fr": "Paris vs Province", "en": "Paris vs Provinces"},
        "question": {"fr": "Comparez le salaire net médian moyen entre les universités de Paris (académie A01) et le reste de la France, pour le Droit (disc02) à 30 mois. Retournez 'zone' ('Paris' ou 'Province') et 'salaire_moyen'.", "en": "Compare the average median net salary between universities in Paris (academy A01) and the rest of France, for Law (disc02) at 30 months. Return 'zone' ('Paris' or 'Province') and 'salaire_moyen'."},
        "expected_columns": ["zone", "salaire_moyen"],
        "expected_row_count": 2,
        "hints": {"fr": ["Utilisez CASE WHEN sur id_academie pour créer la colonne 'zone'", "Joignez etablissement pour accéder à l'académie"], "en": ["Use CASE WHEN on id_academie to create the 'zone' column", "Join etablissement to access the academy"]},
        "optimal_query": "SELECT CASE WHEN e.id_academie = 'A01' THEN 'Paris' ELSE 'Province' END AS zone, ROUND(AVG(s.salaire_net_median)) AS salaire_moyen FROM statistique s JOIN etablissement e ON s.id_etablissement = e.id JOIN enquete q ON s.id_enquete = q.id WHERE s.code_discipline = 'disc02' AND q.situation = '30 mois après le diplôme' AND s.salaire_net_median IS NOT NULL GROUP BY zone ORDER BY salaire_moyen DESC",
        "optimal_score": 85,
        "explanation": {"fr": "CASE WHEN dans le SELECT crée un champ calculé. GROUP BY sur la zone agrège correctement.", "en": "CASE WHEN in SELECT creates a calculated field. GROUP BY on the zone aggregates correctly."},
    },
    {
        "id": 10,
        "level": 2,
        "title": {"fr": "Au-dessus de la moyenne nationale", "en": "Above national average"},
        "question": {"fr": "Trouvez les disciplines dont le taux d'insertion moyen (30 mois, MASTER LMD) est supérieur à la moyenne nationale tous confondus. Retournez 'discipline' et 'taux_moyen'.", "en": "Find disciplines whose average placement rate (30 months, MASTER LMD) is higher than the national average combined. Return 'discipline' and 'taux_moyen'."},
        "expected_columns": ["discipline", "taux_moyen"],
        "expected_row_count": None,
        "hints": {"fr": ["Utilisez une sous-requête (SELECT AVG(...)) dans la clause HAVING", "Ou bien utilisez une CTE (WITH ...)"], "en": ["Use a subquery (SELECT AVG(...)) in the HAVING clause", "Or use a CTE (WITH ...)"]},
        "optimal_query": "SELECT d.nom AS discipline, ROUND(AVG(s.taux_insertion), 1) AS taux_moyen FROM statistique s JOIN discipline d ON s.code_discipline = d.code JOIN enquete q ON s.id_enquete = q.id WHERE q.situation = '30 mois après le diplôme' AND q.diplome = 'MASTER LMD' AND s.taux_insertion IS NOT NULL GROUP BY d.code, d.nom HAVING AVG(s.taux_insertion) > (SELECT AVG(taux_insertion) FROM statistique WHERE taux_insertion IS NOT NULL) ORDER BY taux_moyen DESC",
        "optimal_score": 80,
        "explanation": {"fr": "Sous-requête scalaire dans HAVING. SQLite évalue la sous-requête une seule fois (pas de corrélation).", "en": "Scalar subquery in HAVING. SQLite evaluates the subquery only once (no correlation)."},
    },
    {
        "id": 11,
        "level": 3,
        "title": {"fr": "Classement par rang", "en": "Ranking by rank"},
        "question": {"fr": "Classez les universités par salaire net médian en Informatique (disc16, 30 mois, MASTER LMD), le plus récent (2020), en ajoutant un rang. Retournez 'rang', 'universite', 'salaire_net_median'.", "en": "Rank universities by median net salary in Computer Science (disc16, 30 months, MASTER LMD), the most recent (2020), adding a rank. Return 'rang', 'universite', 'salaire_net_median'."},
        "expected_columns": ["rang", "universite", "salaire_net_median"],
        "expected_row_count": None,
        "hints": {"fr": ["Utilisez RANK() ou ROW_NUMBER() avec OVER(ORDER BY ...)", "Ce sont des fonctions de fenêtrage (window functions)"], "en": ["Use RANK() or ROW_NUMBER() with OVER(ORDER BY ...)", "These are window functions"]},
        "optimal_query": "SELECT RANK() OVER (ORDER BY s.salaire_net_median DESC) AS rang, e.nom AS universite, s.salaire_net_median FROM statistique s JOIN etablissement e ON s.id_etablissement = e.id JOIN enquete q ON s.id_enquete = q.id WHERE s.code_discipline = 'disc16' AND q.annee = '2020' AND q.situation = '30 mois après le diplôme' AND q.diplome = 'MASTER LMD' AND s.salaire_net_median IS NOT NULL ORDER BY rang",
        "optimal_score": 85,
        "explanation": {"fr": "RANK() gère automatiquement les ex-aequo. OVER() définit la fenêtre de tri.", "en": "RANK() automatically handles ties. OVER() defines the sort window."},
    },
    {
        "id": 12,
        "level": 3,
        "title": {"fr": "Évolution annuelle", "en": "Yearly evolution"},
        "question": {"fr": "Montrez l'évolution du salaire net médian moyen en Informatique (disc16) par année (30 mois), avec la variation par rapport à l'année précédente. Retournez 'annee', 'salaire_moyen', 'variation' (différence N vs N-1).", "en": "Show the evolution of the average median net salary in CS (disc16) by year (30 months), with the variation compared to the previous year. Return 'annee', 'salaire_moyen', 'variation' (difference N vs N-1)."},
        "expected_columns": ["annee", "salaire_moyen", "variation"],
        "expected_row_count": None,
        "hints": {"fr": ["Utilisez LAG() OVER (ORDER BY annee) pour obtenir l'année précédente", "La variation = valeur actuelle - LAG()", "Encapsulez dans une CTE pour calculer la différence"], "en": ["Use LAG() OVER (ORDER BY annee) to get the previous year", "Variation = current value - LAG()", "Wrap in a CTE to calculate the difference"]},
        "optimal_query": "WITH yearly AS (SELECT q.annee, ROUND(AVG(s.salaire_net_median)) AS salaire_moyen FROM statistique s JOIN enquete q ON s.id_enquete = q.id WHERE s.code_discipline = 'disc16' AND q.situation = '30 mois après le diplôme' AND s.salaire_net_median IS NOT NULL GROUP BY q.annee) SELECT annee, salaire_moyen, salaire_moyen - LAG(salaire_moyen) OVER (ORDER BY annee) AS variation FROM yearly ORDER BY annee",
        "optimal_score": 85,
        "explanation": {"fr": "CTE 'yearly' calcule les moyennes. LAG() accède à la ligne précédente dans la fenêtre.", "en": "CTE 'yearly' calculates the averages. LAG() accesses the previous row in the ordered window."},
    },
    {
        "id": 13,
        "level": 3,
        "title": {"fr": "Top 3 par académie", "en": "Top 3 by academy"},
        "question": {"fr": "Pour chaque académie, trouvez les 3 meilleures disciplines par taux d'insertion moyen (30 mois, 2020). Retournez 'academie', 'discipline', 'taux_moyen', 'rang'.", "en": "For each academy, find the top 3 disciplines by average placement rate (30 months, 2020). Return 'academie', 'discipline', 'taux_moyen', 'rang'."},
        "expected_columns": ["academie", "discipline", "taux_moyen", "rang"],
        "expected_row_count": None,
        "hints": {"fr": ["Utilisez ROW_NUMBER() avec PARTITION BY académie ORDER BY taux DESC", "Filtrez ensuite avec WHERE rang <= 3 dans une requête englobante"], "en": ["Use ROW_NUMBER() with PARTITION BY académie ORDER BY taux DESC", "Then filter with WHERE rang <= 3 in an enclosing query"]},
        "optimal_query": "WITH ranked AS (SELECT a.nom AS academie, d.nom AS discipline, ROUND(AVG(s.taux_insertion), 1) AS taux_moyen, ROW_NUMBER() OVER (PARTITION BY a.id ORDER BY AVG(s.taux_insertion) DESC) AS rang FROM statistique s JOIN etablissement e ON s.id_etablissement = e.id JOIN academie a ON e.id_academie = a.id JOIN discipline d ON s.code_discipline = d.code JOIN enquete q ON s.id_enquete = q.id WHERE q.annee = '2020' AND q.situation = '30 mois après le diplôme' AND s.taux_insertion IS NOT NULL GROUP BY a.id, a.nom, d.code, d.nom) SELECT academie, discipline, taux_moyen, rang FROM ranked WHERE rang <= 3 ORDER BY academie, rang",
        "optimal_score": 75,
        "explanation": {"fr": "PARTITION BY crée une fenêtre par académie. ROW_NUMBER est préféré à RANK ici.", "en": "PARTITION BY creates a window per academy. ROW_NUMBER is preferred to RANK here."},
    },
    {
        "id": 14,
        "level": 3,
        "title": {"fr": "Au-dessus de la médiane académique", "en": "Above the academic median"},
        "question": {"fr": "Trouvez les universités dont le salaire net médian moyen (toutes disciplines, 30 mois) est supérieur à la médiane de leur propre académie. Retournez 'universite', 'academie', 'salaire_moyen', 'mediane_academie'.", "en": "Find universities whose average median net salary (all disciplines, 30 months) is higher than the median of their own academy. Return 'universite', 'academie', 'salaire_moyen', 'mediane_academie'."},
        "expected_columns": ["universite", "academie", "salaire_moyen", "mediane_academie"],
        "expected_row_count": None,
        "hints": {"fr": ["Calculez la médiane par académie avec une CTE (AVG du milieu ou PERCENTILE)", "SQLite n'a pas de MEDIAN native, une approximation avec AVG suffit", "Comparez le salaire de chaque université à la moyenne de son académie"], "en": ["Calculate the median per academy with a CTE (mid AVG or PERCENTILE)", "SQLite has no native MEDIAN, an approximation with AVG is enough", "Compare the salary of each university to the average of its academy"]},
        "optimal_query": "WITH etab_avg AS (SELECT s.id_etablissement, e.nom AS universite, a.nom AS academie, a.id AS id_academie, ROUND(AVG(s.salaire_net_median)) AS salaire_moyen FROM statistique s JOIN etablissement e ON s.id_etablissement = e.id JOIN academie a ON e.id_academie = a.id JOIN enquete q ON s.id_enquete = q.id WHERE q.situation = '30 mois après le diplôme' AND s.salaire_net_median IS NOT NULL GROUP BY s.id_etablissement, e.nom, a.nom, a.id), acad_avg AS (SELECT id_academie, ROUND(AVG(salaire_moyen)) AS mediane_academie FROM etab_avg GROUP BY id_academie) SELECT ea.universite, ea.academie, ea.salaire_moyen, aa.mediane_academie FROM etab_avg ea JOIN acad_avg aa ON ea.id_academie = aa.id_academie WHERE ea.salaire_moyen > aa.mediane_academie ORDER BY ea.salaire_moyen DESC",
        "optimal_score": 75,
        "explanation": {"fr": "Deux CTEs chaînées : une pour le salaire moyen par établissement, une pour la moyenne par académie.", "en": "Two chained CTEs: one for the average salary by establishment, one for the average per academy."},
    },
    {
        "id": 15,
        "level": 3,
        "title": {"fr": "Rapport complet par domaine", "en": "Comprehensive domain report"},
        "question": {"fr": "Pour chaque domaine, indiquez : le meilleur établissement (par salaire moyen), sa meilleure discipline, et le salaire moyen global. Basé sur 2020, 30 mois, MASTER LMD. Retournez 'domaine', 'meilleur_etablissement', 'meilleure_discipline', 'salaire_moyen'.", "en": "For each domain, indicate: the best establishment (by average salary), its best discipline, and the overall average salary. Based on 2020, 30 months, MASTER LMD. Return 'domaine', 'meilleur_etablissement', 'meilleure_discipline', 'salaire_moyen'."},
        "expected_columns": ["domaine", "meilleur_etablissement", "meilleure_discipline", "salaire_moyen"],
        "expected_row_count": None,
        "hints": {"fr": ["Commencez par calculer le salaire moyen par (domaine, établissement, discipline)", "Puis utilisez ROW_NUMBER() PARTITION BY domaine pour prendre le meilleur", "Vous aurez besoin de JOIN sur 5 tables"], "en": ["Start by calculating the average salary by (domain, establishment, discipline)", "Then use ROW_NUMBER() PARTITION BY domain to take the best", "You will need JOIN on 5 tables"]},
        "optimal_query": "WITH detail AS (SELECT dom.nom AS domaine, dom.code AS code_domaine, e.nom AS etablissement, d.nom AS discipline, ROUND(AVG(s.salaire_net_median)) AS salaire_moyen, ROW_NUMBER() OVER (PARTITION BY dom.code ORDER BY AVG(s.salaire_net_median) DESC) AS rang FROM statistique s JOIN etablissement e ON s.id_etablissement = e.id JOIN discipline d ON s.code_discipline = d.code JOIN domaine dom ON d.code_domaine = dom.code JOIN enquete q ON s.id_enquete = q.id WHERE q.annee = '2020' AND q.situation = '30 mois après le diplôme' AND q.diplome = 'MASTER LMD' AND s.salaire_net_median IS NOT NULL GROUP BY dom.code, dom.nom, e.id, e.nom, d.code, d.nom) SELECT domaine, etablissement AS meilleur_etablissement, discipline AS meilleure_discipline, salaire_moyen FROM detail WHERE rang = 1 ORDER BY salaire_moyen DESC",
        "optimal_score": 70,
        "explanation": {"fr": "Requête complexe justifiée : 5 JOINs nécessaires pour traverser tout le schéma. CTE + ROW_NUMBER par domaine.", "en": "Complex query justified: 5 JOINs needed to traverse the entire schema. CTE + ROW_NUMBER by domain."},
    },
    # ── Visualization challenges (16-20) ────────────
    {
        "id": 16,
        "level": 2,
        "title": {"fr": "Salaire par domaine (graphique)", "en": "Salary by domain (chart)"},
        "question": {"fr": "Creez un resultat visualisable : le salaire net median moyen par domaine de formation (30 mois). Retournez 'domaine' et 'salaire_moyen' (arrondi), trie du plus eleve au plus bas.", "en": "Create a visualizable result: the average median net salary by training domain (30 months). Return 'domaine' and 'salaire_moyen' (rounded), sorted highest to lowest."},
        "expected_columns": ["domaine", "salaire_moyen"],
        "expected_row_count": 5,
        "hints": {"fr": ["Joignez statistique -> discipline -> domaine et enquete", "Filtrez sur situation = '30 mois apres le diplome'", "GROUP BY domaine, ORDER BY salaire_moyen DESC"], "en": ["Join statistique -> discipline -> domaine and enquete", "Filter on situation = '30 mois apres le diplome'", "GROUP BY domain, ORDER BY salaire_moyen DESC"]},
        "optimal_query": "SELECT dom.nom AS domaine, ROUND(AVG(s.salaire_net_median)) AS salaire_moyen FROM statistique s JOIN discipline d ON s.code_discipline = d.code JOIN domaine dom ON d.code_domaine = dom.code JOIN enquete q ON s.id_enquete = q.id WHERE q.situation = '30 mois apres le diplome' AND s.salaire_net_median IS NOT NULL GROUP BY dom.code, dom.nom ORDER BY salaire_moyen DESC",
        "optimal_score": 80,
        "explanation": {"fr": "Triple JOIN efficace. GROUP BY sur la PK du domaine.", "en": "Efficient triple JOIN. GROUP BY on the domain PK."},
        "viz_type": "bar",
        "viz_config": {"x": "domaine", "y": "salaire_moyen", "label": {"fr": "Salaire moyen (EUR)", "en": "Average salary (EUR)"}},
    },
    {
        "id": 17,
        "level": 2,
        "title": {"fr": "Evolution du taux d'insertion (graphique)", "en": "Placement rate evolution (chart)"},
        "question": {"fr": "Montrez l'evolution du taux d'insertion moyen par annee pour l'Informatique (disc16) a 30 mois. Retournez 'annee' et 'taux_moyen' (arrondi a 1 decimale), trie par annee.", "en": "Show the evolution of the average placement rate per year for Computer Science (disc16) at 30 months. Return 'annee' and 'taux_moyen' (rounded to 1 decimal), sorted by year."},
        "expected_columns": ["annee", "taux_moyen"],
        "expected_row_count": None,
        "hints": {"fr": ["Joignez statistique et enquete", "Filtrez : code_discipline, situation, taux_insertion IS NOT NULL", "GROUP BY annee, ORDER BY annee"], "en": ["Join statistique and enquete", "Filter: code_discipline, situation, taux_insertion IS NOT NULL", "GROUP BY annee, ORDER BY annee"]},
        "optimal_query": "SELECT q.annee, ROUND(AVG(s.taux_insertion), 1) AS taux_moyen FROM statistique s JOIN enquete q ON s.id_enquete = q.id WHERE s.code_discipline = 'disc16' AND q.situation = '30 mois apres le diplome' AND s.taux_insertion IS NOT NULL GROUP BY q.annee ORDER BY q.annee",
        "optimal_score": 85,
        "explanation": {"fr": "Requete simple avec index sur code_discipline. GROUP BY annee est optimal.", "en": "Simple query with index on code_discipline. GROUP BY year is optimal."},
        "viz_type": "line",
        "viz_config": {"x": "annee", "y": "taux_moyen", "label": {"fr": "Taux d'insertion (%)", "en": "Placement rate (%)"}},
    },
    {
        "id": 18,
        "level": 2,
        "title": {"fr": "Top 10 universites 2020 (graphique)", "en": "Top 10 universities 2020 (chart)"},
        "question": {"fr": "Classement visuel : les 10 universites avec le meilleur salaire net median en 2020 (30 mois, toutes disciplines). Retournez 'universite' et 'salaire', trie par salaire decroissant.", "en": "Visual ranking: the 10 universities with the best median net salary in 2020 (30 months, all disciplines). Return 'universite' and 'salaire', sorted by descending salary."},
        "expected_columns": ["universite", "salaire"],
        "expected_row_count": 10,
        "hints": {"fr": ["Joignez statistique, etablissement et enquete", "Filtrez annee='2020', situation='30 mois...'", "GROUP BY universite avec AVG, ORDER BY DESC LIMIT 10"], "en": ["Join statistique, etablissement and enquete", "Filter annee='2020', situation='30 mois...'", "GROUP BY university with AVG, ORDER BY DESC LIMIT 10"]},
        "optimal_query": "SELECT e.nom AS universite, ROUND(AVG(s.salaire_net_median)) AS salaire FROM statistique s JOIN etablissement e ON s.id_etablissement = e.id JOIN enquete q ON s.id_enquete = q.id WHERE q.annee = '2020' AND q.situation = '30 mois apres le diplome' AND s.salaire_net_median IS NOT NULL GROUP BY e.id, e.nom ORDER BY salaire DESC LIMIT 10",
        "optimal_score": 85,
        "explanation": {"fr": "GROUP BY sur la PK de l'etablissement. L'index idx_stat_etab accelere le JOIN.", "en": "GROUP BY on the establishment PK. The idx_stat_etab index speeds up the JOIN."},
        "viz_type": "horizontal_bar",
        "viz_config": {"x": "salaire", "y": "universite", "label": {"fr": "Salaire median (EUR)", "en": "Median salary (EUR)"}},
    },
    {
        "id": 19,
        "level": 3,
        "title": {"fr": "Parite par domaine (graphique)", "en": "Gender ratio by domain (chart)"},
        "question": {"fr": "Visualisez le pourcentage moyen de femmes par domaine de formation (toutes annees, 30 mois, MASTER LMD). Retournez 'domaine' et 'pct_femmes' (arrondi a 1 decimale), trie par pourcentage decroissant.", "en": "Visualize the average percentage of women by training domain (all years, 30 months, MASTER LMD). Return 'domaine' and 'pct_femmes' (rounded to 1 decimal), sorted by descending percentage."},
        "expected_columns": ["domaine", "pct_femmes"],
        "expected_row_count": 5,
        "hints": {"fr": ["Joignez statistique, discipline, domaine et enquete", "Filtrez sur situation, diplome et pct_femmes IS NOT NULL", "GROUP BY domaine"], "en": ["Join statistique, discipline, domaine and enquete", "Filter on situation, diplome and pct_femmes IS NOT NULL", "GROUP BY domain"]},
        "optimal_query": "SELECT dom.nom AS domaine, ROUND(AVG(s.pct_femmes), 1) AS pct_femmes FROM statistique s JOIN discipline d ON s.code_discipline = d.code JOIN domaine dom ON d.code_domaine = dom.code JOIN enquete q ON s.id_enquete = q.id WHERE q.situation = '30 mois apres le diplome' AND q.diplome = 'MASTER LMD' AND s.pct_femmes IS NOT NULL GROUP BY dom.code, dom.nom ORDER BY pct_femmes DESC",
        "optimal_score": 80,
        "explanation": {"fr": "Analyse sociologique par domaine. 4 JOINs necessaires pour traverser le schema.", "en": "Sociological analysis by domain. 4 JOINs needed to traverse the schema."},
        "viz_type": "doughnut",
        "viz_config": {"x": "domaine", "y": "pct_femmes", "label": {"fr": "% Femmes", "en": "% Women"}},
    },
    {
        "id": 20,
        "level": 3,
        "title": {"fr": "Stabilite de l'emploi par annee (graphique)", "en": "Employment stability by year (chart)"},
        "question": {"fr": "Montrez l'evolution de 3 indicateurs d'emploi par annee (30 mois, toutes disciplines) : taux d'insertion moyen, emplois stables moyens, et emplois cadre moyens. Retournez 'annee', 'taux_insertion', 'emplois_stables', 'emplois_cadre' (tous arrondis a 1 decimale), tries par annee.", "en": "Show the evolution of 3 employment indicators per year (30 months, all disciplines): average placement rate, average stable employment, and average executive employment. Return 'annee', 'taux_insertion', 'emplois_stables', 'emplois_cadre' (all rounded to 1 decimal), sorted by year."},
        "expected_columns": ["annee", "taux_insertion", "emplois_stables", "emplois_cadre"],
        "expected_row_count": None,
        "hints": {"fr": ["Joignez statistique et enquete", "Utilisez AVG() pour chaque indicateur", "Un seul GROUP BY annee suffit pour les 3 metriques"], "en": ["Join statistique and enquete", "Use AVG() for each indicator", "A single GROUP BY annee is enough for all 3 metrics"]},
        "optimal_query": "SELECT q.annee, ROUND(AVG(s.taux_insertion), 1) AS taux_insertion, ROUND(AVG(s.emplois_stables), 1) AS emplois_stables, ROUND(AVG(s.emplois_cadre), 1) AS emplois_cadre FROM statistique s JOIN enquete q ON s.id_enquete = q.id WHERE q.situation = '30 mois apres le diplome' AND s.taux_insertion IS NOT NULL GROUP BY q.annee ORDER BY q.annee",
        "optimal_score": 85,
        "explanation": {"fr": "Une seule requete calcule 3 indicateurs en parallele. GROUP BY annee est tres efficace.", "en": "A single query calculates 3 indicators in parallel. GROUP BY year is very efficient."},
        "viz_type": "multi_line",
        "viz_config": {"x": "annee", "y": ["taux_insertion", "emplois_stables", "emplois_cadre"], "label": {"fr": "Indicateurs (%)", "en": "Indicators (%)"}},
    },
]


# ──────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────

@router.get("/schema")
def get_schema(db: Session = Depends(get_db)):
    """Retourne le schéma complet de la base (tables, colonnes, FK, index, row counts)."""
    tables = db.execute(text(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    )).fetchall()

    schema = {}
    for (table_name,) in tables:
        cols = db.execute(text(f"PRAGMA table_info('{table_name}')")).fetchall()
        fks = db.execute(text(f"PRAGMA foreign_key_list('{table_name}')")).fetchall()
        indexes = db.execute(text(f"PRAGMA index_list('{table_name}')")).fetchall()
        count = db.execute(text(f"SELECT COUNT(*) FROM \"{table_name}\"")).scalar()

        schema[table_name] = {
            "columns": [
                {"name": c[1], "type": c[2] or "TEXT", "pk": bool(c[5]), "nullable": not c[3]}
                for c in cols
            ],
            "foreign_keys": [
                {"from_col": fk[3], "to_table": fk[2], "to_col": fk[4]}
                for fk in fks
            ],
            "indexes": [idx[1] for idx in indexes if idx[1]],
            "row_count": count,
        }

    return schema


@router.post("/execute")
def execute_sql(query: SqlQuery, db: Session = Depends(get_db)):
    """
    Exécute une requête SELECT en lecture seule.
    Retourne colonnes, lignes (max 1000), temps d'exécution.
    """
    sql = validate_sql(query.sql)

    start = time.perf_counter()
    try:
        result = db.execute(text(sql))
    except Exception as e:
        raise HTTPException(400, f"Erreur SQL : {str(e)}")
    elapsed = time.perf_counter() - start

    columns = list(result.keys())
    rows = [dict(zip(columns, row)) for row in result.fetchmany(1000)]
    total = len(rows)

    # Try to check if there are more rows
    truncated = False
    if total == 1000:
        extra = result.fetchone()
        truncated = extra is not None

    return {
        "columns": columns,
        "rows": rows,
        "row_count": total,
        "execution_time_ms": round(elapsed * 1000, 2),
        "truncated": truncated,
    }


@router.post("/explain")
def explain_sql(query: SqlQuery, lang: str = "fr", db: Session = Depends(get_db)):
    """
    Exécute EXPLAIN QUERY PLAN et retourne le plan + score de complexité.
    """
    sql = validate_sql(query.sql)
    # Remove any EXPLAIN prefix the user might have added
    clean_sql = sql
    if clean_sql.upper().startswith("EXPLAIN"):
        clean_sql = re.sub(r'^EXPLAIN\s+(QUERY\s+PLAN\s+)?', '', clean_sql, flags=re.IGNORECASE)

    try:
        plan = db.execute(text(f"EXPLAIN QUERY PLAN {clean_sql}"))
        plan_rows = [dict(zip(plan.keys(), row)) for row in plan.fetchall()]
    except Exception as e:
        raise HTTPException(400, f"Erreur EXPLAIN : {str(e)}")

    scoring = compute_complexity_score(clean_sql, plan_rows, lang)

    return {
        "plan": plan_rows,
        **scoring,
    }


@router.get("/challenges")
def list_challenges(level: Optional[int] = Query(None, ge=1, le=3), lang: str = "fr"):
    """Liste des défis SQL (filtrable par niveau)."""
    challenges = CHALLENGES
    if level is not None:
        challenges = [c for c in challenges if c["level"] == level]

    return [
        {
            "id": c["id"],
            "level": c["level"],
            "title": c["title"].get(lang, c["title"].get("fr")),
            "question": c["question"].get(lang, c["question"].get("fr")),
            "has_viz": "viz_type" in c,
        }
        for c in challenges
    ]


@router.get("/challenges/{challenge_id}")
def get_challenge(challenge_id: int, lang: str = "fr"):
    """Détails d'un défi (question, indices, colonnes attendues)."""
    challenge = next((c for c in CHALLENGES if c["id"] == challenge_id), None)
    if not challenge:
        raise HTTPException(404, f"Défi #{challenge_id} introuvable" if lang == "fr" else f"Challenge #{challenge_id} not found")

    resp = {
        "id": challenge["id"],
        "level": challenge["level"],
        "title": challenge["title"].get(lang, challenge["title"].get("fr")),
        "question": challenge["question"].get(lang, challenge["question"].get("fr")),
        "expected_columns": challenge["expected_columns"],
        "expected_row_count": challenge["expected_row_count"],
        "hints": challenge["hints"].get(lang, challenge["hints"].get("fr")),
    }
    if "viz_type" in challenge:
        resp["viz_type"] = challenge["viz_type"]
        viz_cfg = challenge.get("viz_config", {})
        resp["viz_config"] = {
            **viz_cfg,
            "label": viz_cfg.get("label", {}).get(lang, viz_cfg.get("label", {}).get("fr", "")) if isinstance(viz_cfg.get("label"), dict) else viz_cfg.get("label", ""),
        }
    return resp


@router.post("/challenges/{challenge_id}/submit")
def submit_challenge(challenge_id: int, submission: SqlQuery, lang: str = "fr", db: Session = Depends(get_db)):
    """
    Soumet une solution à un défi SQL.
    Compare le résultat à la requête optimale et calcule les scores.
    """
    challenge = next((c for c in CHALLENGES if c["id"] == challenge_id), None)
    if not challenge:
        raise HTTPException(404, f"Défi #{challenge_id} introuvable" if lang == "fr" else f"Challenge #{challenge_id} not found")

    user_sql = validate_sql(submission.sql)

    # Execute user query
    try:
        start = time.perf_counter()
        user_result = db.execute(text(user_sql))
        user_time = time.perf_counter() - start
        user_columns = list(user_result.keys())
        user_rows = [dict(zip(user_columns, row)) for row in user_result.fetchmany(200)]
    except Exception as e:
        raise HTTPException(400, f"Erreur dans votre requête : {str(e)}" if lang == "fr" else f"Error in your query: {str(e)}")

    # Execute optimal query
    try:
        start = time.perf_counter()
        opt_result = db.execute(text(challenge["optimal_query"]))
        opt_time = time.perf_counter() - start
        opt_columns = list(opt_result.keys())
        opt_rows = [dict(zip(opt_columns, row)) for row in opt_result.fetchmany(200)]
    except Exception as e:
        raise HTTPException(500, f"Erreur interne sur la requête optimale : {str(e)}")

    # Compare results
    correct = False
    if len(user_rows) == len(opt_rows) and len(user_rows) > 0:
        # Compare values (ignoring column names)
        user_vals = [tuple(r.values()) for r in user_rows]
        opt_vals = [tuple(r.values()) for r in opt_rows]
        correct = user_vals == opt_vals
    elif len(user_rows) == 0 and len(opt_rows) == 0:
        correct = True

    # Score user query
    try:
        user_plan = db.execute(text(f"EXPLAIN QUERY PLAN {user_sql}"))
        user_plan_rows = [dict(zip(user_plan.keys(), row)) for row in user_plan.fetchall()]
        user_scoring = compute_complexity_score(user_sql, user_plan_rows, lang)
    except Exception:
        user_scoring = {"score": 50, "grade": "C", "feedback": ["⚠️ Impossible d'analyser le plan" if lang == "fr" else "⚠️ Could not analyze plan"], "uses_index": False, "cost": 0}

    # Score optimal query
    try:
        opt_plan = db.execute(text(f"EXPLAIN QUERY PLAN {challenge['optimal_query']}"))
        opt_plan_rows = [dict(zip(opt_plan.keys(), row)) for row in opt_plan.fetchall()]
        opt_scoring = compute_complexity_score(challenge["optimal_query"], opt_plan_rows, lang)
    except Exception:
        opt_scoring = {"score": challenge["optimal_score"], "grade": "A", "feedback": [], "uses_index": True, "cost": 0}

    base_resp = {
        "correct": correct,
        "user_row_count": len(user_rows),
        "expected_row_count": len(opt_rows),
        "user_rows": user_rows[:20],
        "expected_rows": opt_rows[:20],
        "user_score": user_scoring["score"],
        "user_grade": user_scoring["grade"],
        "optimal_score": opt_scoring["score"],
        "optimal_grade": opt_scoring["grade"],
        "user_time_ms": round(user_time * 1000, 2),
        "optimal_time_ms": round(opt_time * 1000, 2),
        "user_feedback": user_scoring["feedback"],
        "optimal_feedback": opt_scoring["feedback"],
        "explanation": challenge["explanation"].get(lang, challenge["explanation"].get("fr")),
    }
    if "viz_type" in challenge:
        viz_cfg = challenge.get("viz_config", {})
        base_resp["viz_type"] = challenge["viz_type"]
        base_resp["viz_config"] = {
            **viz_cfg,
            "label": viz_cfg.get("label", {}).get(lang, viz_cfg.get("label", {}).get("fr", "")) if isinstance(viz_cfg.get("label"), dict) else viz_cfg.get("label", ""),
        }
    return base_resp
