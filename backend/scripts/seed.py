"""
Seed script: reads the JSON data, cleans it, and populates the SQLite database.

Pipeline:
  1. Read JSON (19,603 records)
  2. Separate UNIV (national aggregates) from per-establishment records
  3. Exclude "N'ayant pas participé" records (26)
  4. Convert ns/nd/. → None, str → int/float
  5. Insert into 7 normalized tables
  6. Create analytical indexes
  7. VACUUM for optimal file size
"""
import json
import sys
import os
import time
from pathlib import Path

# Add parent dir so we can import app modules
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text
from app.database import engine, SessionLocal, Base
from app.models import (
    Academie, Etablissement, Domaine, Discipline,
    Enquete, Statistique, DonneesNationales,
)

# ──────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
JSON_PATH = DATA_DIR / "fr-esr-insertion_professionnelle-master.json"
DB_PATH = DATA_DIR / "prodataviz.db"

# Special values that should be converted to None
NULL_VALUES = {"ns", "nd", ".", "", "fe"}


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def safe_int(val):
    """Convert a string to int, or None if it's a null value."""
    if val is None or val in NULL_VALUES:
        return None
    try:
        return int(val)
    except (ValueError, TypeError):
        return None


def safe_float(val):
    """Convert a string to float, or None if it's a null value."""
    if val is None or val in NULL_VALUES:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def safe_text(val):
    """Return text or None."""
    if val is None or val in NULL_VALUES:
        return None
    return str(val).strip() or None


def extract_fields(record):
    """Extract the 'fields' dict from a data.gouv.fr JSON record."""
    return record.get("fields", {})


# ──────────────────────────────────────────────
# Main seed logic
# ──────────────────────────────────────────────

def seed():
    start = time.time()

    # ── 1. Load JSON ──
    print(f"📥  Loading {JSON_PATH.name}...")
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        raw_data = json.load(f)
    print(f"    → {len(raw_data):,} records loaded\n")

    # ── 2. Separate UNIV from per-establishment ──
    univ_records = []
    etab_records = []
    excluded = 0

    for rec in raw_data:
        fields = extract_fields(rec)
        num_etab = fields.get("numero_de_l_etablissement", "")
        remarque = fields.get("remarque", "")

        # Exclude universities that didn't participate at all
        if "n'ayant pas participé" in remarque.lower():
            excluded += 1
            continue

        if num_etab == "UNIV":
            univ_records.append(fields)
        else:
            etab_records.append(fields)

    print(f"🔀  Separated: {len(etab_records):,} per-establishment, "
          f"{len(univ_records)} national, {excluded} excluded\n")

    # ── 3. Create database ──
    if DB_PATH.exists():
        DB_PATH.unlink()
        print(f"🗑️   Removed existing {DB_PATH.name}")

    print(f"🏗️   Creating database schema...")
    Base.metadata.create_all(bind=engine)
    print(f"    → 7 tables created\n")

    session = SessionLocal()

    try:
        # ── 4. Insert Academies ──
        print("📍  Inserting Academies...")
        academies = {}
        for fields in etab_records:
            code = fields.get("code_de_l_academie")
            nom = fields.get("academie")
            if code and code not in academies:
                academies[code] = nom
        for code, nom in academies.items():
            session.add(Academie(id=code, nom=nom))
        session.flush()
        print(f"    → {len(academies)} académies\n")

        # ── 5. Insert Domaines ──
        print("📚  Inserting Domaines...")
        domaines = {}
        for fields in raw_data:
            f = extract_fields(fields)
            code = f.get("code_du_domaine")
            nom = f.get("domaine")
            if code and code not in domaines:
                domaines[code] = nom
        for code, nom in domaines.items():
            session.add(Domaine(code=code, nom=nom))
        session.flush()
        print(f"    → {len(domaines)} domaines\n")

        # ── 6. Insert Disciplines ──
        print("🎓  Inserting Disciplines...")
        disciplines = {}
        for fields in raw_data:
            f = extract_fields(fields)
            code = f.get("code_de_la_discipline")
            code_dom = f.get("code_du_domaine")
            nom = f.get("discipline")
            if code and code not in disciplines:
                disciplines[code] = (code_dom, nom)
        for code, (code_dom, nom) in disciplines.items():
            session.add(Discipline(code=code, code_domaine=code_dom, nom=nom))
        session.flush()
        print(f"    → {len(disciplines)} disciplines\n")

        # ── 7. Insert Etablissements ──
        print("🏫  Inserting Etablissements...")
        etablissements = {}
        for fields in etab_records:
            etab_id = fields.get("numero_de_l_etablissement")
            if etab_id and etab_id not in etablissements:
                etablissements[etab_id] = {
                    "id_academie": fields.get("code_de_l_academie"),
                    "nom": fields.get("etablissement"),
                    "nom_actuel": safe_text(fields.get("etablissementactuel")),
                    "id_paysage": safe_text(fields.get("id_paysage")),
                }
        for etab_id, info in etablissements.items():
            session.add(Etablissement(id=etab_id, **info))
        session.flush()
        print(f"    → {len(etablissements)} établissements\n")

        # ── 8. Insert Enquetes ──
        print("📊  Inserting Enquetes...")
        enquetes = {}  # (annee, situation, diplome) → id
        for fields in raw_data:
            f = extract_fields(fields)
            key = (f.get("annee"), f.get("situation"), f.get("diplome"))
            if all(key) and key not in enquetes:
                enq = Enquete(annee=key[0], situation=key[1], diplome=key[2])
                session.add(enq)
                session.flush()
                enquetes[key] = enq.id
        print(f"    → {len(enquetes)} enquêtes\n")

        # ── 9. Insert Statistiques ──
        print("📈  Inserting Statistiques...")
        stat_count = 0
        batch = []
        for fields in etab_records:
            enq_key = (fields.get("annee"), fields.get("situation"), fields.get("diplome"))
            enq_id = enquetes.get(enq_key)
            etab_id = fields.get("numero_de_l_etablissement")
            disc_code = fields.get("code_de_la_discipline")

            if not enq_id or not etab_id or not disc_code:
                continue

            stat = Statistique(
                id_etablissement=etab_id,
                code_discipline=disc_code,
                id_enquete=enq_id,
                nombre_reponses=safe_int(fields.get("nombre_de_reponses")),
                taux_reponse=safe_float(fields.get("taux_de_reponse")),
                poids_discipline=safe_float(fields.get("poids_de_la_discipline")),
                taux_insertion=safe_float(fields.get("taux_dinsertion")),
                emplois_cadre=safe_float(fields.get("emplois_cadre")),
                emplois_cadre_ou_prof_inter=safe_float(
                    fields.get("emplois_cadre_ou_professions_intermediaires")
                ),
                emplois_stables=safe_float(fields.get("emplois_stables")),
                emplois_temps_plein=safe_float(fields.get("emplois_a_temps_plein")),
                emplois_hors_region=safe_float(
                    fields.get("emplois_exterieurs_a_la_region_de_luniversite")
                ),
                salaire_net_median=safe_float(
                    fields.get("salaire_net_median_des_emplois_a_temps_plein")
                ),
                salaire_brut_annuel=safe_float(fields.get("salaire_brut_annuel_estime")),
                taux_chomage_regional=safe_float(fields.get("taux_de_chomage_regional")),
                salaire_median_regional=safe_float(
                    fields.get("salaire_net_mensuel_median_regional")
                ),
                salaire_regional_q1=safe_float(
                    fields.get("salaire_net_mensuel_regional_1er_quartile")
                ),
                salaire_regional_q3=safe_float(
                    fields.get("salaire_net_mensuel_regional_3eme_quartile")
                ),
                pct_femmes=safe_float(fields.get("femmes")),
                pct_boursiers=safe_float(fields.get("de_diplomes_boursiers")),
                taux_emploi=safe_float(fields.get("taux_d_emploi")),
                taux_emploi_salarie=safe_float(
                    fields.get("taux_d_emploi_salarie_en_france")
                ),
                remarque=safe_text(fields.get("remarque")),
            )
            batch.append(stat)
            stat_count += 1

            # Batch insert every 1000 rows
            if len(batch) >= 1000:
                session.add_all(batch)
                session.flush()
                batch = []

        if batch:
            session.add_all(batch)
            session.flush()
        print(f"    → {stat_count:,} statistiques\n")

        # ── 10. Insert Donnees Nationales ──
        print("🌍  Inserting Données Nationales...")
        nat_count = 0
        batch = []
        for fields in univ_records:
            enq_key = (fields.get("annee"), fields.get("situation"), fields.get("diplome"))
            enq_id = enquetes.get(enq_key)
            disc_code = fields.get("code_de_la_discipline")

            if not enq_id or not disc_code:
                continue

            nat = DonneesNationales(
                code_discipline=disc_code,
                id_enquete=enq_id,
                nombre_reponses=safe_int(fields.get("nombre_de_reponses")),
                taux_reponse=safe_float(fields.get("taux_de_reponse")),
                poids_discipline=safe_float(fields.get("poids_de_la_discipline")),
                taux_insertion=safe_float(fields.get("taux_dinsertion")),
                emplois_cadre=safe_float(fields.get("emplois_cadre")),
                emplois_cadre_ou_prof_inter=safe_float(
                    fields.get("emplois_cadre_ou_professions_intermediaires")
                ),
                emplois_stables=safe_float(fields.get("emplois_stables")),
                emplois_temps_plein=safe_float(fields.get("emplois_a_temps_plein")),
                emplois_hors_region=safe_float(
                    fields.get("emplois_exterieurs_a_la_region_de_luniversite")
                ),
                salaire_net_median=safe_float(
                    fields.get("salaire_net_median_des_emplois_a_temps_plein")
                ),
                salaire_brut_annuel=safe_float(fields.get("salaire_brut_annuel_estime")),
                taux_chomage_regional=safe_float(fields.get("taux_de_chomage_regional")),
                salaire_median_regional=safe_float(
                    fields.get("salaire_net_mensuel_median_regional")
                ),
                salaire_regional_q1=safe_float(
                    fields.get("salaire_net_mensuel_regional_1er_quartile")
                ),
                salaire_regional_q3=safe_float(
                    fields.get("salaire_net_mensuel_regional_3eme_quartile")
                ),
                pct_femmes=safe_float(fields.get("femmes")),
                pct_boursiers=safe_float(fields.get("de_diplomes_boursiers")),
                taux_emploi=safe_float(fields.get("taux_d_emploi")),
                taux_emploi_salarie=safe_float(
                    fields.get("taux_d_emploi_salarie_en_france")
                ),
            )
            batch.append(nat)
            nat_count += 1

            if len(batch) >= 500:
                session.add_all(batch)
                session.flush()
                batch = []

        if batch:
            session.add_all(batch)
            session.flush()
        print(f"    → {nat_count} données nationales\n")

        # ── 11. Create analytical indexes ──
        print("🔧  Creating analytical indexes...")
        analytical_indexes = [
            "CREATE INDEX IF NOT EXISTS idx_stat_insertion ON statistique(taux_insertion DESC)",
            "CREATE INDEX IF NOT EXISTS idx_stat_salaire ON statistique(salaire_net_median DESC)",
        ]
        for idx_sql in analytical_indexes:
            session.execute(text(idx_sql))
        print(f"    → {len(analytical_indexes)} analytical indexes\n")

        # ── 12. Commit ──
        session.commit()
        print("✅  All data committed successfully!")

    except Exception as e:
        session.rollback()
        print(f"\n❌  Error: {e}")
        raise
    finally:
        session.close()

    # ── 13. VACUUM ──
    print("🧹  VACUUM for optimal file size...")
    with engine.connect() as conn:
        conn.execute(text("VACUUM"))

    elapsed = time.time() - start
    db_size = DB_PATH.stat().st_size / (1024 * 1024)
    print(f"\n🎉  Done in {elapsed:.1f}s — Database: {db_size:.1f} MB")
    print(f"    {DB_PATH}")

    # ── Summary ──
    session = SessionLocal()
    tables = ["academie", "etablissement", "domaine", "discipline",
              "enquete", "statistique", "donnees_nationales"]
    print("\n📋  Summary:")
    for table in tables:
        count = session.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
        print(f"    {table:.<30} {count:>6}")
    session.close()


if __name__ == "__main__":
    seed()
