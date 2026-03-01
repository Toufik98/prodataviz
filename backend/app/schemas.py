"""
Pydantic response schemas for the API.
"""
from typing import Optional, List
from pydantic import BaseModel


# ──────────────────────────────────────────────
# Dimension schemas
# ──────────────────────────────────────────────

class AcademieSchema(BaseModel):
    id: str
    nom: str
    nb_etablissements: Optional[int] = None

    class Config:
        from_attributes = True


class EtablissementSchema(BaseModel):
    id: str
    nom: str
    nom_actuel: Optional[str] = None
    id_paysage: Optional[str] = None
    id_academie: str
    academie_nom: Optional[str] = None

    class Config:
        from_attributes = True


class DomaineSchema(BaseModel):
    code: str
    nom: str
    nb_disciplines: Optional[int] = None

    class Config:
        from_attributes = True


class DisciplineSchema(BaseModel):
    code: str
    nom: str
    code_domaine: str
    domaine_nom: Optional[str] = None

    class Config:
        from_attributes = True


class EnqueteSchema(BaseModel):
    id: int
    annee: str
    situation: str
    diplome: str

    class Config:
        from_attributes = True


# ──────────────────────────────────────────────
# Fact schemas
# ──────────────────────────────────────────────

class StatistiqueSchema(BaseModel):
    id: int
    id_etablissement: str
    etablissement_nom: Optional[str] = None
    code_discipline: str
    discipline_nom: Optional[str] = None
    annee: Optional[str] = None
    situation: Optional[str] = None
    diplome: Optional[str] = None
    nombre_reponses: Optional[int] = None
    taux_reponse: Optional[float] = None
    poids_discipline: Optional[float] = None
    taux_insertion: Optional[float] = None
    emplois_cadre: Optional[float] = None
    emplois_cadre_ou_prof_inter: Optional[float] = None
    emplois_stables: Optional[float] = None
    emplois_temps_plein: Optional[float] = None
    emplois_hors_region: Optional[float] = None
    salaire_net_median: Optional[float] = None
    salaire_brut_annuel: Optional[float] = None
    taux_chomage_regional: Optional[float] = None
    salaire_median_regional: Optional[float] = None
    salaire_regional_q1: Optional[float] = None
    salaire_regional_q3: Optional[float] = None
    pct_femmes: Optional[float] = None
    pct_boursiers: Optional[float] = None
    taux_emploi: Optional[float] = None
    taux_emploi_salarie: Optional[float] = None
    remarque: Optional[str] = None

    class Config:
        from_attributes = True


# ──────────────────────────────────────────────
# Analytics schemas
# ──────────────────────────────────────────────

class TopSalaireSchema(BaseModel):
    rang: int
    etablissement: str
    discipline: str
    annee: str
    situation: str
    salaire_net_median: float


class TopInsertionSchema(BaseModel):
    rang: int
    etablissement: str
    discipline: str
    annee: str
    situation: str
    taux_insertion: float


class EvolutionPointSchema(BaseModel):
    annee: str
    valeur: Optional[float] = None
    nb_reponses: Optional[int] = None


class ComparaisonSchema(BaseModel):
    etablissement: str
    taux_insertion: Optional[float] = None
    salaire_net_median: Optional[float] = None
    emplois_cadre: Optional[float] = None
    emplois_stables: Optional[float] = None
    emplois_temps_plein: Optional[float] = None
    emplois_hors_region: Optional[float] = None


# ──────────────────────────────────────────────
# SQL Lab schemas
# ──────────────────────────────────────────────

class SqlQuery(BaseModel):
    sql: str


class SqlResultSchema(BaseModel):
    columns: List[str]
    rows: List[dict]
    row_count: int
    execution_time_ms: float
    truncated: bool


class SqlExplainSchema(BaseModel):
    plan: List[dict]
    score: int
    grade: str
    feedback: List[str]
    uses_index: bool
    estimated_cost: int


class ColumnSchema(BaseModel):
    name: str
    type: str
    pk: bool
    nullable: bool


class ForeignKeySchema(BaseModel):
    from_col: str
    to_table: str
    to_col: str


class TableSchemaInfo(BaseModel):
    columns: List[ColumnSchema]
    foreign_keys: List[ForeignKeySchema]
    indexes: List[str]
    row_count: int


class ChallengeSchema(BaseModel):
    id: int
    level: int
    title: str
    question: str
    expected_columns: List[str]
    expected_row_count: Optional[int] = None
    hints: List[str]


class ChallengeSubmitSchema(BaseModel):
    sql: str


class ChallengeResultSchema(BaseModel):
    correct: bool
    user_rows: List[dict]
    expected_rows: List[dict]
    user_score: int
    user_grade: str
    optimal_score: int
    optimal_grade: str
    user_time_ms: float
    optimal_time_ms: float
    user_feedback: List[str]
    optimal_feedback: List[str]
    explanation: Optional[str] = None
