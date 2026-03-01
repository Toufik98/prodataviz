"""Router for statistiques — the main data endpoint."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ..database import get_db
from .. import crud

router = APIRouter(prefix="/api", tags=["Statistiques"])


@router.get("/statistiques")
def list_statistiques(
    annee: str = Query(None, description="Filtrer par année (2010…2020)"),
    discipline: str = Query(None, description="Code discipline (disc01…disc20)"),
    domaine: str = Query(None, description="Code domaine (DEG, STS…)"),
    etablissement: str = Query(None, description="N° UAI de l'établissement"),
    academie: str = Query(None, description="Code académie (A01…A70)"),
    situation: str = Query(None, description="18 ou 30 mois après le diplôme"),
    diplome: str = Query(None, description="MASTER LMD ou MASTER ENS"),
    min_reponses: int = Query(None, description="Minimum de répondants"),
    exclude_fragile: bool = Query(False, description="Exclure les résultats fragiles"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """
    Requête multi-filtres sur les statistiques d'insertion professionnelle.
    Retourne les données avec pagination (limit/offset).
    """
    return crud.get_statistiques(
        db, annee=annee, discipline=discipline, domaine=domaine,
        etablissement=etablissement, academie=academie,
        situation=situation, diplome=diplome,
        min_reponses=min_reponses, exclude_fragile=exclude_fragile,
        limit=limit, offset=offset,
    )
