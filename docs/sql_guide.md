# ProDataViz — SQL Learning Guide & Challenges

> 🇫🇷 [Version française ci-dessous](#-prodataviz--guide-des-requêtes-pédagogiques-sql-lab)

This file contains the 15 core SQL challenges available in the **Gamified Challenges** module of the application. These queries were carefully selected to cover the full spectrum of SQL data analysis skills, from basic exploration to advanced window functions.

The goal of this module is to let students use the built-in `SQL Lab` to practice in real time. The heuristic grader validates:
1. **Returned columns**
2. **Exact row count** (rows dynamically generated during hidden verification)
3. **Algorithmic complexity** (index traversal, `EXPLAIN QUERY PLAN` execution plan).

---

## ⭐ Level 1 — Beginner Explorer (Filters & Sorting)

These queries cover the fundamentals: SELECT, WHERE, ORDER BY, LIMIT, and basic arithmetic operations.

### Challenge 1: Cream of the Crop Salary
**Question**: Find the top 10 highest median salaries (across all years and disciplines) along with the associated institution name.
<details>
<summary><b>Optimal Solution</b></summary>

```sql
SELECT e.nom, s.salaire_net_median 
FROM statistique s
JOIN etablissement e ON s.id_etablissement = e.id
WHERE s.salaire_net_median IS NOT NULL
ORDER BY s.salaire_net_median DESC
LIMIT 10;
```
</details>

### Challenge 2: Perfect Integration
**Question**: List institutions and survey IDs where the employment integration rate is exactly 100%, sorted alphabetically by institution name.
<details>
<summary><b>Optimal Solution</b></summary>

```sql
SELECT e.nom, s.id_enquete
FROM statistique s
JOIN etablissement e ON s.id_etablissement = e.id
WHERE s.taux_insertion = 100
ORDER BY e.nom ASC;
```
</details>

### Challenge 3: Women in Engineering
**Question**: Display the rows with the highest proportion of female graduates (`femmes`) in the "Engineering" discipline (`disc18`).
<details>
<summary><b>Optimal Solution</b></summary>

```sql
SELECT id, code_discipline, femmes
FROM statistique
WHERE code_discipline = 'disc18' AND femmes IS NOT NULL
ORDER BY femmes DESC
LIMIT 5;
```
</details>

### Challenge 4: The Stable Elite
**Question**: Compute the global arithmetic mean of the stable employment rate for the entire "Paris" academy in 2020.
<details>
<summary><b>Optimal Solution</b></summary>

```sql
SELECT AVG(s.emplois_stables) as moyenne_stable
FROM statistique s
JOIN etablissement e ON s.id_etablissement = e.id
JOIN academie a ON e.id_academie = a.id
JOIN enquete eq ON s.id_enquete = eq.id
WHERE a.nom = 'Paris' AND eq.annee = 2020;
```
</details>

### Challenge 5: Brain Drain
**Question**: Find the institution and survey where the rate of graduates working *outside their home region* is the highest.
<details>
<summary><b>Optimal Solution</b></summary>

```sql
SELECT e.nom, s.id_enquete, s.emplois_hors_region
FROM statistique s
JOIN etablissement e ON s.id_etablissement = e.id
WHERE s.emplois_hors_region IS NOT NULL
ORDER BY s.emplois_hors_region DESC
LIMIT 1;
```
</details>

---

## ⭐⭐ Level 2 — Intermediate Analyst (Joins, Groups & Aggregations)

These queries cover the analytical core: multi-`JOIN`, `GROUP BY`, `HAVING`, and aggregate functions (`AVG`, `MAX`, `SUM`).

### Challenge 6: Regional Champions
**Question**: For each academy, compute the average integration rate (all years and disciplines) and sort by descending average (only averages > 90%).
<details>
<summary><b>Optimal Solution</b></summary>

```sql
SELECT a.nom, AVG(s.taux_insertion) as moyenne_insertion
FROM statistique s
JOIN etablissement e ON s.id_etablissement = e.id
JOIN academie a ON e.id_academie = a.id
GROUP BY a.nom
HAVING AVG(s.taux_insertion) > 90
ORDER BY moyenne_insertion DESC;
```
</details>

### Challenge 7: Who Pays the Most?
**Question**: Find the highest-paying discipline on average (average median net salary) across all years and universities.
<details>
<summary><b>Optimal Solution</b></summary>

```sql
SELECT d.nom, AVG(s.salaire_net_median) as salaire_moyen
FROM statistique s
JOIN discipline d ON s.code_discipline = d.code
WHERE s.salaire_net_median IS NOT NULL
GROUP BY d.nom
ORDER BY salaire_moyen DESC
LIMIT 1;
```
</details>

### Challenge 8: Situation Contrast
**Question**: Compare the average proportion of executive-level jobs between the "18 months after" and "30 months after" situations for the year 2018 only.
<details>
<summary><b>Optimal Solution</b></summary>

```sql
SELECT eq.situation, AVG(s.emplois_cadre) as moy_cadre
FROM statistique s
JOIN enquete eq ON s.id_enquete = eq.id
WHERE eq.annee = 2018 AND s.emplois_cadre IS NOT NULL
GROUP BY eq.situation;
```
</details>

### Challenge 9: Domain Diversity
**Question**: How many unique disciplines (with at least one statistical row containing an integration rate) does each Domain group?
<details>
<summary><b>Optimal Solution</b></summary>

```sql
SELECT dom.nom, COUNT(DISTINCT s.code_discipline) as nb_disciplines
FROM statistique s
JOIN discipline d ON s.code_discipline = d.code
JOIN domaine dom ON d.code_domaine = dom.code
WHERE s.taux_insertion IS NOT NULL
GROUP BY dom.nom;
```
</details>

### Challenge 10: National Differential
**Question**: For the Computer Science discipline (disc16) in 2020 (30 months after), find the gap between institution median salaries and the corresponding "donnees_nationales" salary. List the 5 universities that exceed the national average the most.
<details>
<summary><b>Optimal Solution</b></summary>

```sql
SELECT e.nom, s.salaire_net_median - dn.salaire_net_median as bonus_salarial
FROM statistique s
JOIN etablissement e ON s.id_etablissement = e.id
JOIN enquete eq ON s.id_enquete = eq.id
JOIN donneesnationales dn ON s.code_discipline = dn.code_discipline AND s.id_enquete = dn.id_enquete
WHERE s.code_discipline = 'disc16' AND eq.annee = 2020 AND eq.situation = '30 mois après le diplôme'
  AND s.salaire_net_median > dn.salaire_net_median
ORDER BY bonus_salarial DESC
LIMIT 5;
```
</details>

---

## ⭐⭐⭐ Level 3 — SQL Expert (Window Functions & Complex Subqueries)

Learning the concepts that distinguish a modern "Data" profile: window functions (`RANK()`, `ROW_NUMBER()`), `CTE` (Common Table Expressions), and complex derived queries.

### Challenge 11: Top of the Top (Windowing)
**Question**: Use the `RANK()` function to rank universities within each discipline based on the integration rate in 2019 (18 months). Return only #1 ranks (the best university in each discipline).
<details>
<summary><b>Optimal Solution</b></summary>

```sql
WITH RankedStats AS (
    SELECT e.nom as universite, d.nom as discipline, s.taux_insertion,
           RANK() OVER(PARTITION BY d.code ORDER BY s.taux_insertion DESC) as rang
    FROM statistique s
    JOIN etablissement e ON s.id_etablissement = e.id
    JOIN discipline d ON s.code_discipline = d.code
    JOIN enquete eq ON s.id_enquete = eq.id
    WHERE eq.annee = 2019 AND eq.situation = '18 mois après le diplôme'
      AND s.taux_insertion IS NOT NULL
)
SELECT universite, discipline, taux_insertion
FROM RankedStats
WHERE rang = 1;
```
</details>

### Challenge 12: Meteoric Rise
**Question**: Calculate the salary evolution (difference) for "Toulouse 1" University in Law (disc09) between year N-1 and year N, using the `LAG()` window function. (Target: year 2018).
<details>
<summary><b>Optimal Solution</b></summary>

```sql
WITH SalairesAnnuels AS (
    SELECT eq.annee, s.salaire_net_median,
           LAG(s.salaire_net_median) OVER (ORDER BY eq.annee ASC) as salaire_passe
    FROM statistique s
    JOIN enquete eq ON s.id_enquete = eq.id
    JOIN etablissement e ON s.id_etablissement = e.id
    WHERE e.nom LIKE '%Toulouse 1%' AND s.code_discipline = 'disc09' AND eq.situation = '30 mois après le diplôme'
)
SELECT annee, salaire_net_median, salaire_passe, (salaire_net_median - salaire_passe) as evolution
FROM SalairesAnnuels
WHERE annee = 2018;
```
</details>

### Challenge 13: Education Pareto
**Question**: Compute the cumulative proportion of responses (`nombre_reponses`) grouped by overall discipline (across all universities and years) relative to the absolute total, to simulate a Pareto curve.
<details>
<summary><b>Optimal Solution</b></summary>

```sql
WITH Totaux AS (
    SELECT d.nom, SUM(s.nombre_reponses) as total_rep
    FROM statistique s
    JOIN discipline d ON s.code_discipline = d.code
    GROUP BY d.nom
),
GrandTotal AS (
    SELECT SUM(total_rep) as sum_abs FROM Totaux
)
SELECT t.nom, 
       t.total_rep, 
       ROUND((CAST(t.total_rep AS FLOAT) / g.sum_abs) * 100, 2) as pourcentage_total
FROM Totaux t
CROSS JOIN GrandTotal g
ORDER BY t.total_rep DESC;
```
</details>

### Challenge 14: The Privileged Club
**Question**: Find all academies whose average median salary is consistently above the national global average, by embedding a subquery in the `HAVING` clause.
<details>
<summary><b>Optimal Solution</b></summary>

```sql
SELECT a.nom, AVG(s.salaire_net_median) as moyenne_academie
FROM statistique s
JOIN etablissement e ON s.id_etablissement = e.id
JOIN academie a ON e.id_academie = a.id
WHERE s.salaire_net_median IS NOT NULL
GROUP BY a.nom
HAVING AVG(s.salaire_net_median) > (SELECT AVG(salaire_net_median) FROM statistique WHERE salaire_net_median IS NOT NULL)
ORDER BY moyenne_academie DESC;
```
</details>

### Challenge 15: Improvised Correlation Matrix
**Question**: Determine if a global (trend-based) correlation exists by grouping the percentage of female graduates into 3 tiers — "Low", "Medium", "High" — and displaying the average executive-level employment rate for each tier. (Using `CASE WHEN`).
<details>
<summary><b>Optimal Solution</b></summary>

```sql
SELECT 
    CASE 
        WHEN femmes < 33 THEN '1-Bas (<33%)'
        WHEN femmes BETWEEN 33 AND 66 THEN '2-Moyen (33-66%)'
        ELSE '3-Haut (>66%)'
    END as categorie_femmes,
    AVG(emplois_cadre) as moyenne_emplois_cadres,
    COUNT(*) as echantillons
FROM statistique
WHERE femmes IS NOT NULL AND emplois_cadre IS NOT NULL
GROUP BY categorie_femmes
ORDER BY categorie_femmes;
```
</details>

---
---

# 🇫🇷 ProDataViz — Guide des requêtes pédagogiques (SQL Lab)

Ce fichier regroupe les 15 défis SQL disponibles dans le module **Défis Gamifiés** de l'application. Ces requêtes ont été soigneusement sélectionnées pour couvrir l'éventail complet des compétences requises en analyse de données SQL, de l'exploration de base au partitionnement avancé.

L'objectif de ce module est de permettre aux étudiants d'utiliser le `SQL Lab` intégré pour s'entrainer en direct. Le correcteur heuristique valide :
1. Les **colonnes retournées**
2. Le **nombre de lignes exact** (lignes générées dynamiquement lors du correctif caché)
3. La **complexité algorithmique** (index traversés, plan d'exécution `EXPLAIN QUERY PLAN`).

---

## ⭐ Niveau 1 — Explorateur Débutant (Filtres & Tris)

Ces requêtes couvrent les fondations (SELECT, WHERE, ORDER BY, LIMIT, opérations arithmétiques basiques).

### Défi 1 : La crème du salaire
**Question** : Trouver le top 10 des salaires médians les plus élevés (toutes années et disciplines confondues) et le nom de l'établissement associé.
<details>
<summary><b>Solution Optimale</b></summary>

```sql
SELECT e.nom, s.salaire_net_median 
FROM statistique s
JOIN etablissement e ON s.id_etablissement = e.id
WHERE s.salaire_net_median IS NOT NULL
ORDER BY s.salaire_net_median DESC
LIMIT 10;
```
</details>

### Défi 2 : Insertion infaillible
**Question** : Lister les établissements et l'id enquête où le taux d'insertion est exactement de 100%, trié par nom d'établissement alphabétique.
<details>
<summary><b>Solution Optimale</b></summary>

```sql
SELECT e.nom, s.id_enquete
FROM statistique s
JOIN etablissement e ON s.id_etablissement = e.id
WHERE s.taux_insertion = 100
ORDER BY e.nom ASC;
```
</details>

### Défi 3 : Femmes ingénieures
**Question** : Afficher les lignes avec la plus forte proportion de diplômées femmes (`femmes`) dans la discipline "Ingénierie" (`disc18`).
<details>
<summary><b>Solution Optimale</b></summary>

```sql
SELECT id, code_discipline, femmes
FROM statistique
WHERE code_discipline = 'disc18' AND femmes IS NOT NULL
ORDER BY femmes DESC
LIMIT 5;
```
</details>

### Défi 4 : Les stables du Top
**Question** : Obtenir la moyenne arithmétique globale du taux d'emplois stables pour toute l'académie de "Paris" en 2020.
<details>
<summary><b>Solution Optimale</b></summary>

```sql
SELECT AVG(s.emplois_stables) as moyenne_stable
FROM statistique s
JOIN etablissement e ON s.id_etablissement = e.id
JOIN academie a ON e.id_academie = a.id
JOIN enquete eq ON s.id_enquete = eq.id
WHERE a.nom = 'Paris' AND eq.annee = 2020;
```
</details>

### Défi 5 : Fuite des cerveaux
**Question** : Trouver l'établissement et l'enquête où le taux de diplômés travaillant *hors région* est le plus élevé.
<details>
<summary><b>Solution Optimale</b></summary>

```sql
SELECT e.nom, s.id_enquete, s.emplois_hors_region
FROM statistique s
JOIN etablissement e ON s.id_etablissement = e.id
WHERE s.emplois_hors_region IS NOT NULL
ORDER BY s.emplois_hors_region DESC
LIMIT 1;
```
</details>

---

## ⭐⭐ Niveau 2 — Analyste Intermédiaire (Jointures, Groupes & Agrégations)

Ces requêtes couvrent le cœur analytique usuel : multi-`JOIN`, `GROUP BY`, `HAVING`, fonctions d'agrégation (`AVG`, `MAX`, `SUM`).

### Défi 6 : Championnes régionales
**Question** : Pour chaque académie, calculer le taux d'insertion moyen (toutes années et disciplines) et trier par la moyenne décroissante (uniquement les moyennes > 90%).
<details>
<summary><b>Solution Optimale</b></summary>

```sql
SELECT a.nom, AVG(s.taux_insertion) as moyenne_insertion
FROM statistique s
JOIN etablissement e ON s.id_etablissement = e.id
JOIN academie a ON e.id_academie = a.id
GROUP BY a.nom
HAVING AVG(s.taux_insertion) > 90
ORDER BY moyenne_insertion DESC;
```
</details>

### Défi 7 : Qui paie le plus ?
**Question** : Trouver la discipline moyenne la plus lucrative en moyenne (salaire net médian moyen), toutes années et universités confondues.
<details>
<summary><b>Solution Optimale</b></summary>

```sql
SELECT d.nom, AVG(s.salaire_net_median) as salaire_moyen
FROM statistique s
JOIN discipline d ON s.code_discipline = d.code
WHERE s.salaire_net_median IS NOT NULL
GROUP BY d.nom
ORDER BY salaire_moyen DESC
LIMIT 1;
```
</details>

### Défi 8 : Contraste de situation
**Question** : Comparer la moyenne proportion d'emplois cadres entre la situation "18 mois après" et "30 mois après" pour l'année 2018 uniquement.
<details>
<summary><b>Solution Optimale</b></summary>

```sql
SELECT eq.situation, AVG(s.emplois_cadre) as moy_cadre
FROM statistique s
JOIN enquete eq ON s.id_enquete = eq.id
WHERE eq.annee = 2018 AND s.emplois_cadre IS NOT NULL
GROUP BY eq.situation;
```
</details>

### Défi 9 : Diversité des domaines
**Question** : Combien de disciplines uniques (ayant au moins une ligne statistique de taux d'insertion) chaque Domaine regroupe-t-il ?
<details>
<summary><b>Solution Optimale</b></summary>

```sql
SELECT dom.nom, COUNT(DISTINCT s.code_discipline) as nb_disciplines
FROM statistique s
JOIN discipline d ON s.code_discipline = d.code
JOIN domaine dom ON d.code_domaine = dom.code
WHERE s.taux_insertion IS NOT NULL
GROUP BY dom.nom;
```
</details>

### Défi 10 : Différentiel national
**Question** : Pour la discipline Informatique (disc16) en 2020 (30 mois après), trouver l'écart entre le salaire médian des établissements et le salaire des "donnees_nationales" correspondantes. Lister les 5 universités qui dépassent le plus la moyenne nationale.
<details>
<summary><b>Solution Optimale</b></summary>

```sql
SELECT e.nom, s.salaire_net_median - dn.salaire_net_median as bonus_salarial
FROM statistique s
JOIN etablissement e ON s.id_etablissement = e.id
JOIN enquete eq ON s.id_enquete = eq.id
JOIN donneesnationales dn ON s.code_discipline = dn.code_discipline AND s.id_enquete = dn.id_enquete
WHERE s.code_discipline = 'disc16' AND eq.annee = 2020 AND eq.situation = '30 mois après le diplôme'
  AND s.salaire_net_median > dn.salaire_net_median
ORDER BY bonus_salarial DESC
LIMIT 5;
```
</details>

---

## ⭐⭐⭐ Niveau 3 — Expert SQL (Fonctions de fenêtrage & Sous-requêtes complexes)

L'apprentissage des concepts qui distinguent un profil "Data" moderne. Fonctions de fenêtrage (`RANK()`, `ROW_NUMBER()`), `CTE` (Common Table Expressions) et dérivées complexes.

### Défi 11 : Le Top du Top (Fenêtrage)
**Question** : Utilisez la fonction `RANK()` pour attribuer un rang aux universités au sein de chaque discipline, basé sur le taux d'insertion en 2019 (18 mois). Retournez uniquement les numéros 1 (les meilleures universités de leur discipline).
<details>
<summary><b>Solution Optimale</b></summary>

```sql
WITH RankedStats AS (
    SELECT e.nom as universite, d.nom as discipline, s.taux_insertion,
           RANK() OVER(PARTITION BY d.code ORDER BY s.taux_insertion DESC) as rang
    FROM statistique s
    JOIN etablissement e ON s.id_etablissement = e.id
    JOIN discipline d ON s.code_discipline = d.code
    JOIN enquete eq ON s.id_enquete = eq.id
    WHERE eq.annee = 2019 AND eq.situation = '18 mois après le diplôme'
      AND s.taux_insertion IS NOT NULL
)
SELECT universite, discipline, taux_insertion
FROM RankedStats
WHERE rang = 1;
```
</details>

### Défi 12 : L'évolution Fulgurante
**Question** : Calculez l'évolution (différence) du salaire médian de l'Université "Toulouse 1" en Droit (disc09) entre l'année N-1 et l'année N, en utilisant la fonction de fenêtrage `LAG()`. (Recherche de l'année 2018).
<details>
<summary><b>Solution Optimale</b></summary>

```sql
WITH SalairesAnnuels AS (
    SELECT eq.annee, s.salaire_net_median,
           LAG(s.salaire_net_median) OVER (ORDER BY eq.annee ASC) as salaire_passe
    FROM statistique s
    JOIN enquete eq ON s.id_enquete = eq.id
    JOIN etablissement e ON s.id_etablissement = e.id
    WHERE e.nom LIKE '%Toulouse 1%' AND s.code_discipline = 'disc09' AND eq.situation = '30 mois après le diplôme'
)
SELECT annee, salaire_net_median, salaire_passe, (salaire_net_median - salaire_passe) as evolution
FROM SalairesAnnuels
WHERE annee = 2018;
```
</details>

### Défi 13 : Pareto de l'Enseignement
**Question** : Calculez la proportion cumulée des réponses (`nombre_reponses`) regroupées par discipline globale (toutes universités et années confondues) par rapport au total absolu, pour simuler une courbe de Pareto.
<details>
<summary><b>Solution Optimale</b></summary>

```sql
WITH Totaux AS (
    SELECT d.nom, SUM(s.nombre_reponses) as total_rep
    FROM statistique s
    JOIN discipline d ON s.code_discipline = d.code
    GROUP BY d.nom
),
GrandTotal AS (
    SELECT SUM(total_rep) as sum_abs FROM Totaux
)
SELECT t.nom, 
       t.total_rep, 
       ROUND((CAST(t.total_rep AS FLOAT) / g.sum_abs) * 100, 2) as pourcentage_total
FROM Totaux t
CROSS JOIN GrandTotal g
ORDER BY t.total_rep DESC;
```
</details>

### Défi 14 : Le Club des Privilégiés
**Question** : Trouver toutes les académies dont le salaire médian moyen est systématiquement supérieur à la moyenne globale nationale, en encapsulant une sous-requête dans le `HAVING`.
<details>
<summary><b>Solution Optimale</b></summary>

```sql
SELECT a.nom, AVG(s.salaire_net_median) as moyenne_academie
FROM statistique s
JOIN etablissement e ON s.id_etablissement = e.id
JOIN academie a ON e.id_academie = a.id
WHERE s.salaire_net_median IS NOT NULL
GROUP BY a.nom
HAVING AVG(s.salaire_net_median) > (SELECT AVG(salaire_net_median) FROM statistique WHERE salaire_net_median IS NOT NULL)
ORDER BY moyenne_academie DESC;
```
</details>

### Défi 15 : Matrice de Corrélation Improvisée
**Question** : Déterminez s'il existe une corrélation globale (tendancielle) en regroupant en 3 tiers "Bas", "Moyen", "Haut" le pourcentage de femmes diplômées, et en affichant pour chaque tiers la moyenne d'emplois cadres. (Utilisation de `CASE WHEN`).
<details>
<summary><b>Solution Optimale</b></summary>

```sql
SELECT 
    CASE 
        WHEN femmes < 33 THEN '1-Bas (<33%)'
        WHEN femmes BETWEEN 33 AND 66 THEN '2-Moyen (33-66%)'
        ELSE '3-Haut (>66%)'
    END as categorie_femmes,
    AVG(emplois_cadre) as moyenne_emplois_cadres,
    COUNT(*) as echantillons
FROM statistique
WHERE femmes IS NOT NULL AND emplois_cadre IS NOT NULL
GROUP BY categorie_femmes
ORDER BY categorie_femmes;
```
</details>
