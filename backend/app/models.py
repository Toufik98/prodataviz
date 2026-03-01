"""
SQLAlchemy ORM models for ProDataViz.
7 tables normalized to 3NF reflecting the ER diagram.
"""
from sqlalchemy import (
    Column, Integer, Text, Float, ForeignKey, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from .database import Base


# ──────────────────────────────────────────────
# Dimension tables
# ──────────────────────────────────────────────

class Academie(Base):
    """
    29 académies françaises (métropole + outre-mer).
    PK naturelle = code administratif (A01…A70).
    """
    __tablename__ = "academie"

    id = Column(Text, primary_key=True, doc="Code académie (ex: A01)")
    nom = Column(Text, nullable=False, doc="Nom (ex: Paris)")

    # Relationships
    etablissements = relationship("Etablissement", back_populates="academie")

    def __repr__(self):
        return f"<Academie {self.id}: {self.nom}>"


class Etablissement(Base):
    """
    101 universités et établissements assimilés.
    PK naturelle = numéro UAI (identifiant national officiel).
    nom_actuel capture les changements de nom (22.7% des records).
    """
    __tablename__ = "etablissement"

    id = Column(Text, primary_key=True, doc="N° UAI (ex: 0751717J)")
    id_academie = Column(Text, ForeignKey("academie.id"), nullable=False)
    nom = Column(Text, nullable=False, doc="Nom historique")
    nom_actuel = Column(Text, nullable=True, doc="Nom actuel si renommé")
    id_paysage = Column(Text, nullable=True, doc="Identifiant Paysage ESR")

    # Relationships
    academie = relationship("Academie", back_populates="etablissements")
    statistiques = relationship("Statistique", back_populates="etablissement")

    # Indexes
    __table_args__ = (
        Index("idx_etab_academie", "id_academie"),
    )

    def __repr__(self):
        return f"<Etablissement {self.id}: {self.nom}>"


class Domaine(Base):
    """
    5 grands domaines de formation.
    PK naturelle = code court lisible (DEG, LLA, SHS, STS, MEEF).
    """
    __tablename__ = "domaine"

    code = Column(Text, primary_key=True, doc="DEG|LLA|SHS|STS|MEEF")
    nom = Column(Text, nullable=False, doc="Libellé complet")

    # Relationships
    disciplines = relationship("Discipline", back_populates="domaine")

    def __repr__(self):
        return f"<Domaine {self.code}: {self.nom}>"


class Discipline(Base):
    """
    20 disciplines rattachées chacune à un domaine unique.
    PK naturelle = code du jeu de données (disc01…disc20).
    """
    __tablename__ = "discipline"

    code = Column(Text, primary_key=True, doc="disc01…disc20")
    code_domaine = Column(Text, ForeignKey("domaine.code"), nullable=False)
    nom = Column(Text, nullable=False, doc="Libellé (ex: Informatique)")

    # Relationships
    domaine = relationship("Domaine", back_populates="disciplines")
    statistiques = relationship("Statistique", back_populates="discipline")
    donnees_nationales = relationship("DonneesNationales", back_populates="discipline")

    # Indexes
    __table_args__ = (
        Index("idx_disc_domaine", "code_domaine"),
    )

    def __repr__(self):
        return f"<Discipline {self.code}: {self.nom}>"


class Enquete(Base):
    """
    Dimension enquête : 22 combinaisons (année × situation × diplôme).
    PK auto-increment pour des JOINs performants.
    Contrainte UNIQUE sur la clé naturelle composite.
    """
    __tablename__ = "enquete"

    id = Column(Integer, primary_key=True, autoincrement=True)
    annee = Column(Text, nullable=False, doc="2010…2020")
    situation = Column(Text, nullable=False, doc="18 ou 30 mois après le diplôme")
    diplome = Column(Text, nullable=False, doc="MASTER LMD ou MASTER ENS")

    # Relationships
    statistiques = relationship("Statistique", back_populates="enquete")
    donnees_nationales = relationship("DonneesNationales", back_populates="enquete")

    # Constraints & Indexes
    __table_args__ = (
        UniqueConstraint("annee", "situation", "diplome", name="uq_enquete_natural"),
    )

    def __repr__(self):
        return f"<Enquete {self.id}: {self.annee} {self.situation} {self.diplome}>"


# ──────────────────────────────────────────────
# Fact tables
# ──────────────────────────────────────────────

class Statistique(Base):
    """
    Table de faits principale (~17 500 lignes).
    Chaque ligne = observation pour un (établissement, discipline, enquête).
    PK auto-increment pour des JOINs performants.
    """
    __tablename__ = "statistique"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Foreign keys
    id_etablissement = Column(Text, ForeignKey("etablissement.id"), nullable=False)
    code_discipline = Column(Text, ForeignKey("discipline.code"), nullable=False)
    id_enquete = Column(Integer, ForeignKey("enquete.id"), nullable=False)

    # Survey metadata
    nombre_reponses = Column(Integer, nullable=True)
    taux_reponse = Column(Float, nullable=True)
    poids_discipline = Column(Float, nullable=True)

    # Employment indicators (%)
    taux_insertion = Column(Float, nullable=True, doc="% en emploi")
    emplois_cadre = Column(Float, nullable=True, doc="% cadre")
    emplois_cadre_ou_prof_inter = Column(Float, nullable=True, doc="% cadre ou PI")
    emplois_stables = Column(Float, nullable=True, doc="% CDI/fonctionnaire")
    emplois_temps_plein = Column(Float, nullable=True, doc="% temps plein")
    emplois_hors_region = Column(Float, nullable=True, doc="% hors région")

    # Salary (€)
    salaire_net_median = Column(Float, nullable=True, doc="€ net mensuel médian")
    salaire_brut_annuel = Column(Float, nullable=True, doc="€ brut annuel estimé")

    # Regional context
    taux_chomage_regional = Column(Float, nullable=True, doc="% chômage INSEE")
    salaire_median_regional = Column(Float, nullable=True, doc="€ net régional médian")
    salaire_regional_q1 = Column(Float, nullable=True, doc="€ Q1 régional")
    salaire_regional_q3 = Column(Float, nullable=True, doc="€ Q3 régional")

    # Demographics
    pct_femmes = Column(Float, nullable=True, doc="% femmes")
    pct_boursiers = Column(Float, nullable=True, doc="% boursiers")

    # New fields (2020+)
    taux_emploi = Column(Float, nullable=True, doc="% emploi (2020+)")
    taux_emploi_salarie = Column(Float, nullable=True, doc="% emploi salarié FR (2020+)")

    # Quality flag
    remarque = Column(Text, nullable=True, doc="Flag qualité (nullable)")

    # Relationships
    etablissement = relationship("Etablissement", back_populates="statistiques")
    discipline = relationship("Discipline", back_populates="statistiques")
    enquete = relationship("Enquete", back_populates="statistiques")

    # Indexes
    __table_args__ = (
        Index("idx_stat_etab", "id_etablissement"),
        Index("idx_stat_disc", "code_discipline"),
        Index("idx_stat_enquete", "id_enquete"),
        Index("idx_stat_enquete_disc", "id_enquete", "code_discipline"),
        Index("idx_stat_etab_enquete", "id_etablissement", "id_enquete"),
    )

    def __repr__(self):
        return f"<Statistique {self.id}: {self.id_etablissement}/{self.code_discipline}>"


class DonneesNationales(Base):
    """
    361 agrégats nationaux (UNIV = toutes universités confondues).
    Séparés car PAS d'académie ni d'établissement individuel.
    Mélanger fausserait les AVG() par établissement.
    """
    __tablename__ = "donnees_nationales"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Foreign keys (pas d'établissement!)
    code_discipline = Column(Text, ForeignKey("discipline.code"), nullable=False)
    id_enquete = Column(Integer, ForeignKey("enquete.id"), nullable=False)

    # Same indicators as Statistique
    nombre_reponses = Column(Integer, nullable=True)
    taux_reponse = Column(Float, nullable=True)
    poids_discipline = Column(Float, nullable=True)
    taux_insertion = Column(Float, nullable=True)
    emplois_cadre = Column(Float, nullable=True)
    emplois_cadre_ou_prof_inter = Column(Float, nullable=True)
    emplois_stables = Column(Float, nullable=True)
    emplois_temps_plein = Column(Float, nullable=True)
    emplois_hors_region = Column(Float, nullable=True)
    salaire_net_median = Column(Float, nullable=True)
    salaire_brut_annuel = Column(Float, nullable=True)
    taux_chomage_regional = Column(Float, nullable=True)
    salaire_median_regional = Column(Float, nullable=True)
    salaire_regional_q1 = Column(Float, nullable=True)
    salaire_regional_q3 = Column(Float, nullable=True)
    pct_femmes = Column(Float, nullable=True)
    pct_boursiers = Column(Float, nullable=True)
    taux_emploi = Column(Float, nullable=True)
    taux_emploi_salarie = Column(Float, nullable=True)

    # Relationships
    discipline = relationship("Discipline", back_populates="donnees_nationales")
    enquete = relationship("Enquete", back_populates="donnees_nationales")

    # Indexes
    __table_args__ = (
        Index("idx_nat_enquete", "id_enquete"),
        Index("idx_nat_disc", "code_discipline"),
    )

    def __repr__(self):
        return f"<DonneesNationales {self.id}: {self.code_discipline}>"
