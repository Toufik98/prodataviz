"""
CRUD functions for optimized database queries.
"""
from sqlalchemy import func, text
from sqlalchemy.orm import Session
from .models import (
    Academie, Etablissement, Domaine, Discipline,
    Enquete, Statistique, DonneesNationales,
)


# ──────────────────────────────────────────────
# Academies
# ──────────────────────────────────────────────

def get_academies(db: Session):
    """List all académies with count of établissements."""
    results = (
        db.query(
            Academie.id,
            Academie.nom,
            func.count(Etablissement.id).label("nb_etablissements"),
        )
        .outerjoin(Etablissement, Etablissement.id_academie == Academie.id)
        .group_by(Academie.id, Academie.nom)
        .order_by(Academie.nom)
        .all()
    )
    return [{"id": r[0], "nom": r[1], "nb_etablissements": r[2]} for r in results]


# ──────────────────────────────────────────────
# Etablissements
# ──────────────────────────────────────────────

def get_etablissements(db: Session, academie: str = None, search: str = None):
    """List établissements with optional filters."""
    query = (
        db.query(
            Etablissement.id,
            Etablissement.nom,
            Etablissement.nom_actuel,
            Etablissement.id_paysage,
            Etablissement.id_academie,
            Academie.nom.label("academie_nom"),
        )
        .join(Academie, Etablissement.id_academie == Academie.id)
    )
    if academie:
        query = query.filter(Etablissement.id_academie == academie)
    if search:
        query = query.filter(Etablissement.nom.ilike(f"%{search}%"))
    results = query.order_by(Etablissement.nom).all()
    return [
        {
            "id": r[0], "nom": r[1], "nom_actuel": r[2],
            "id_paysage": r[3], "id_academie": r[4], "academie_nom": r[5],
        }
        for r in results
    ]


# ──────────────────────────────────────────────
# Domaines & Disciplines
# ──────────────────────────────────────────────

def get_domaines(db: Session):
    results = (
        db.query(
            Domaine.code, Domaine.nom,
            func.count(Discipline.code).label("nb_disciplines"),
        )
        .outerjoin(Discipline, Discipline.code_domaine == Domaine.code)
        .group_by(Domaine.code, Domaine.nom)
        .order_by(Domaine.nom)
        .all()
    )
    return [{"code": r[0], "nom": r[1], "nb_disciplines": r[2]} for r in results]


def get_disciplines(db: Session, domaine: str = None):
    query = (
        db.query(
            Discipline.code, Discipline.nom,
            Discipline.code_domaine, Domaine.nom.label("domaine_nom"),
        )
        .join(Domaine, Discipline.code_domaine == Domaine.code)
    )
    if domaine:
        query = query.filter(Discipline.code_domaine == domaine)
    results = query.order_by(Discipline.code).all()
    return [
        {"code": r[0], "nom": r[1], "code_domaine": r[2], "domaine_nom": r[3]}
        for r in results
    ]


# ──────────────────────────────────────────────
# Statistiques
# ──────────────────────────────────────────────

def get_statistiques(
    db: Session,
    annee: str = None,
    discipline: str = None,
    domaine: str = None,
    etablissement: str = None,
    academie: str = None,
    situation: str = None,
    diplome: str = None,
    min_reponses: int = None,
    exclude_fragile: bool = False,
    limit: int = 100,
    offset: int = 0,
):
    """Multi-filter query on statistiques with JOINs."""
    query = (
        db.query(
            Statistique.id,
            Statistique.id_etablissement,
            Etablissement.nom.label("etablissement_nom"),
            Statistique.code_discipline,
            Discipline.nom.label("discipline_nom"),
            Enquete.annee,
            Enquete.situation,
            Enquete.diplome,
            Statistique.nombre_reponses,
            Statistique.taux_reponse,
            Statistique.poids_discipline,
            Statistique.taux_insertion,
            Statistique.emplois_cadre,
            Statistique.emplois_cadre_ou_prof_inter,
            Statistique.emplois_stables,
            Statistique.emplois_temps_plein,
            Statistique.emplois_hors_region,
            Statistique.salaire_net_median,
            Statistique.salaire_brut_annuel,
            Statistique.taux_chomage_regional,
            Statistique.salaire_median_regional,
            Statistique.salaire_regional_q1,
            Statistique.salaire_regional_q3,
            Statistique.pct_femmes,
            Statistique.pct_boursiers,
            Statistique.taux_emploi,
            Statistique.taux_emploi_salarie,
            Statistique.remarque,
        )
        .join(Etablissement, Statistique.id_etablissement == Etablissement.id)
        .join(Discipline, Statistique.code_discipline == Discipline.code)
        .join(Enquete, Statistique.id_enquete == Enquete.id)
    )

    if annee:
        query = query.filter(Enquete.annee == annee)
    if discipline:
        query = query.filter(Statistique.code_discipline == discipline)
    if domaine:
        query = query.join(Domaine, Discipline.code_domaine == Domaine.code)
        query = query.filter(Domaine.code == domaine)
    if etablissement:
        query = query.filter(Statistique.id_etablissement == etablissement)
    if academie:
        query = query.filter(Etablissement.id_academie == academie)
    if situation:
        query = query.filter(Enquete.situation == situation)
    if diplome:
        query = query.filter(Enquete.diplome == diplome)
    if min_reponses:
        query = query.filter(Statistique.nombre_reponses >= min_reponses)
    if exclude_fragile:
        query = query.filter(Statistique.remarque.is_(None))

    total = query.count()
    results = query.offset(offset).limit(limit).all()

    columns = [
        "id", "id_etablissement", "etablissement_nom", "code_discipline",
        "discipline_nom", "annee", "situation", "diplome",
        "nombre_reponses", "taux_reponse", "poids_discipline",
        "taux_insertion", "emplois_cadre", "emplois_cadre_ou_prof_inter",
        "emplois_stables", "emplois_temps_plein", "emplois_hors_region",
        "salaire_net_median", "salaire_brut_annuel",
        "taux_chomage_regional", "salaire_median_regional",
        "salaire_regional_q1", "salaire_regional_q3",
        "pct_femmes", "pct_boursiers",
        "taux_emploi", "taux_emploi_salarie", "remarque",
    ]
    return {
        "total": total,
        "data": [dict(zip(columns, r)) for r in results],
    }


# ──────────────────────────────────────────────
# Analytics
# ──────────────────────────────────────────────

def get_top_salaires(
    db: Session, limit: int = 10, annee: str = None,
    discipline: str = None, situation: str = None,
):
    query = (
        db.query(
            Etablissement.nom,
            Discipline.nom,
            Enquete.annee,
            Enquete.situation,
            Statistique.salaire_net_median,
        )
        .join(Etablissement, Statistique.id_etablissement == Etablissement.id)
        .join(Discipline, Statistique.code_discipline == Discipline.code)
        .join(Enquete, Statistique.id_enquete == Enquete.id)
        .filter(Statistique.salaire_net_median.isnot(None))
    )
    if annee:
        query = query.filter(Enquete.annee == annee)
    if discipline:
        query = query.filter(Statistique.code_discipline == discipline)
    if situation:
        query = query.filter(Enquete.situation == situation)

    results = query.order_by(Statistique.salaire_net_median.desc()).limit(limit).all()
    return [
        {
            "rang": i + 1, "etablissement": r[0], "discipline": r[1],
            "annee": r[2], "situation": r[3], "salaire_net_median": r[4],
        }
        for i, r in enumerate(results)
    ]


def get_top_insertion(
    db: Session, limit: int = 10, annee: str = None,
    discipline: str = None, situation: str = None,
):
    query = (
        db.query(
            Etablissement.nom,
            Discipline.nom,
            Enquete.annee,
            Enquete.situation,
            Statistique.taux_insertion,
        )
        .join(Etablissement, Statistique.id_etablissement == Etablissement.id)
        .join(Discipline, Statistique.code_discipline == Discipline.code)
        .join(Enquete, Statistique.id_enquete == Enquete.id)
        .filter(Statistique.taux_insertion.isnot(None))
        .filter(Statistique.nombre_reponses >= 30)
    )
    if annee:
        query = query.filter(Enquete.annee == annee)
    if discipline:
        query = query.filter(Statistique.code_discipline == discipline)
    if situation:
        query = query.filter(Enquete.situation == situation)

    results = query.order_by(Statistique.taux_insertion.desc()).limit(limit).all()
    return [
        {
            "rang": i + 1, "etablissement": r[0], "discipline": r[1],
            "annee": r[2], "situation": r[3], "taux_insertion": r[4],
        }
        for i, r in enumerate(results)
    ]


def get_evolution(
    db: Session, indicateur: str = "salaire_net_median",
    discipline: str = None, etablissement: str = None,
    situation: str = "30 mois après le diplôme",
):
    """Evolution of an indicator over years."""
    ALLOWED = {
        "salaire_net_median", "taux_insertion", "emplois_cadre",
        "emplois_stables", "emplois_temps_plein", "pct_femmes",
    }
    if indicateur not in ALLOWED:
        indicateur = "salaire_net_median"

    col = getattr(Statistique, indicateur)

    query = (
        db.query(
            Enquete.annee,
            func.avg(col).label("valeur"),
            func.sum(Statistique.nombre_reponses).label("nb_reponses"),
        )
        .join(Enquete, Statistique.id_enquete == Enquete.id)
        .filter(col.isnot(None))
    )

    if discipline:
        query = query.filter(Statistique.code_discipline == discipline)
    if etablissement:
        query = query.filter(Statistique.id_etablissement == etablissement)
    if situation:
        query = query.filter(Enquete.situation == situation)

    results = (
        query.group_by(Enquete.annee)
        .order_by(Enquete.annee)
        .all()
    )
    return [
        {"annee": r[0], "valeur": round(r[1], 1) if r[1] else None, "nb_reponses": r[2]}
        for r in results
    ]


def get_comparaison(
    db: Session, etablissement_ids: list,
    annee: str = None, discipline: str = None,
    situation: str = "30 mois après le diplôme",
):
    """Compare multiple établissements."""
    query = (
        db.query(
            Etablissement.nom,
            func.avg(Statistique.taux_insertion),
            func.avg(Statistique.salaire_net_median),
            func.avg(Statistique.emplois_cadre),
            func.avg(Statistique.emplois_stables),
            func.avg(Statistique.emplois_temps_plein),
            func.avg(Statistique.emplois_hors_region),
        )
        .join(Etablissement, Statistique.id_etablissement == Etablissement.id)
        .join(Enquete, Statistique.id_enquete == Enquete.id)
        .filter(Statistique.id_etablissement.in_(etablissement_ids))
    )
    if annee:
        query = query.filter(Enquete.annee == annee)
    if discipline:
        query = query.filter(Statistique.code_discipline == discipline)
    if situation:
        query = query.filter(Enquete.situation == situation)

    results = query.group_by(Etablissement.nom).all()

    return [
        {
            "etablissement": r[0],
            "taux_insertion": round(r[1], 1) if r[1] else None,
            "salaire_net_median": round(r[2], 0) if r[2] else None,
            "emplois_cadre": round(r[3], 1) if r[3] else None,
            "emplois_stables": round(r[4], 1) if r[4] else None,
            "emplois_temps_plein": round(r[5], 1) if r[5] else None,
            "emplois_hors_region": round(r[6], 1) if r[6] else None,
        }
        for r in results
    ]
