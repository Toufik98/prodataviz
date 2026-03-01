"""Routers for dimensions: academies, etablissements."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ..database import get_db
from .. import crud

router = APIRouter(prefix="/api", tags=["Dimensions"])


@router.get("/academies")
def list_academies(db: Session = Depends(get_db)):
    """Liste des 29 académies avec le nombre d'établissements."""
    return crud.get_academies(db)


@router.get("/etablissements")
def list_etablissements(
    academie: str = Query(None, description="Filtrer par code académie (ex: A01)"),
    search: str = Query(None, description="Recherche par nom"),
    db: Session = Depends(get_db),
):
    """Liste des établissements avec filtres optionnels."""
    return crud.get_etablissements(db, academie=academie, search=search)


@router.get("/domaines")
def list_domaines(db: Session = Depends(get_db)):
    """Les 5 grands domaines de formation."""
    return crud.get_domaines(db)


@router.get("/disciplines")
def list_disciplines(
    domaine: str = Query(None, description="Filtrer par code domaine (DEG, STS…)"),
    db: Session = Depends(get_db),
):
    """Les 20 disciplines, filtrables par domaine."""
    return crud.get_disciplines(db, domaine=domaine)
