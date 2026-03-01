"""Router for analytics endpoints — rankings, evolution, comparisons."""
from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ..database import get_db
from .. import crud

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/top-salaires")
def top_salaires(
    limit: int = Query(10, ge=1, le=50),
    annee: str = Query(None),
    discipline: str = Query(None),
    situation: str = Query(None),
    db: Session = Depends(get_db),
):
    """Top N établissements par salaire net médian."""
    return crud.get_top_salaires(db, limit=limit, annee=annee,
                                  discipline=discipline, situation=situation)


@router.get("/top-insertion")
def top_insertion(
    limit: int = Query(10, ge=1, le=50),
    annee: str = Query(None),
    discipline: str = Query(None),
    situation: str = Query(None),
    db: Session = Depends(get_db),
):
    """Top N établissements par taux d'insertion (≥30 répondants)."""
    return crud.get_top_insertion(db, limit=limit, annee=annee,
                                   discipline=discipline, situation=situation)


@router.get("/evolution")
def evolution(
    indicateur: str = Query("salaire_net_median",
        description="salaire_net_median|taux_insertion|emplois_cadre|emplois_stables|emplois_temps_plein|pct_femmes"),
    discipline: str = Query(None),
    etablissement: str = Query(None),
    situation: str = Query("30 mois après le diplôme"),
    db: Session = Depends(get_db),
):
    """Évolution d'un indicateur par année."""
    return crud.get_evolution(db, indicateur=indicateur, discipline=discipline,
                               etablissement=etablissement, situation=situation)


@router.get("/comparer")
def comparer(
    ids: List[str] = Query(..., description="IDs d'établissements à comparer"),
    annee: str = Query(None),
    discipline: str = Query(None),
    situation: str = Query("30 mois après le diplôme"),
    db: Session = Depends(get_db),
):
    """Comparer plusieurs établissements sur tous les indicateurs."""
    return crud.get_comparaison(db, etablissement_ids=ids, annee=annee,
                                  discipline=discipline, situation=situation)
