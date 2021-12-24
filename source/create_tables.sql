#------------------------------------------------------------
#        Script MySQL.
#------------------------------------------------------------


#------------------------------------------------------------
# Table: Statistiques
#------------------------------------------------------------

CREATE TABLE Statistiques(
        annee                                         Smallint NOT NULL ,
        situation                                     Varchar (256) NOT NULL ,
        nombre_de_reponses                            Int NOT NULL ,
        taux_de_reponse                               Smallint NOT NULL ,
        taux_dinsertion                               Smallint NOT NULL ,
        emplois_cadre_ou_professions_intermediaires   Smallint NOT NULL ,
        emplois_stables                               Smallint NOT NULL ,
        emplois_a_temps_plein                         Smallint NOT NULL ,
        salaire_net_median_des_emplois_a_temps_plein  Int NOT NULL ,
        diplomes_boursiers                            Smallint NOT NULL ,
        taux_de_chomage_regional                      Smallint NOT NULL ,
        salaire_net_mensuel_median_regional           Int NOT NULL ,
        emplois_cadre                                 Int NOT NULL ,
        emplois_exterieurs_a_la_region_de_luniversite Int NOT NULL ,
        femmes                                        Smallint NOT NULL
	,CONSTRAINT Statistiques_PK PRIMARY KEY (annee,situation)
)ENGINE=InnoDB;


#------------------------------------------------------------
# Table: Academie
#------------------------------------------------------------

CREATE TABLE Academie(
        id_academie  Varchar (3) NOT NULL ,
        nom_academie Varchar (50) NOT NULL
	,CONSTRAINT Academie_PK PRIMARY KEY (id_academie)
)ENGINE=InnoDB;


#------------------------------------------------------------
# Table: Etablissement
#------------------------------------------------------------

CREATE TABLE Etablissement(
        id_etablissement         Varchar (50) NOT NULL ,
        nom_etablissement        Varchar (256) NOT NULL ,
        nom_etablissement_actuel Varchar (256) NOT NULL ,
        id_academie              Varchar (3) NOT NULL
	,CONSTRAINT Etablissement_PK PRIMARY KEY (id_etablissement)

	,CONSTRAINT Etablissement_Academie_FK FOREIGN KEY (id_academie) REFERENCES Academie(id_academie)
)ENGINE=InnoDB;


#------------------------------------------------------------
# Table: Domaine
#------------------------------------------------------------

CREATE TABLE Domaine(
        code_domaine Varchar (10) NOT NULL ,
        nom_domaine  Varchar (256) NOT NULL
	,CONSTRAINT Domaine_PK PRIMARY KEY (code_domaine)
)ENGINE=InnoDB;


#------------------------------------------------------------
# Table: Discipline
#------------------------------------------------------------

CREATE TABLE Discipline(
        id_discipline  Varchar (10) NOT NULL ,
        nom_discipline Varchar (256) NOT NULL ,
        poids          Int NOT NULL ,
        code_domaine   Varchar (10) NOT NULL
	,CONSTRAINT Discipline_PK PRIMARY KEY (id_discipline)

	,CONSTRAINT Discipline_Domaine_FK FOREIGN KEY (code_domaine) REFERENCES Domaine(code_domaine)
)ENGINE=InnoDB;


#------------------------------------------------------------
# Table: Enquete
#------------------------------------------------------------

CREATE TABLE Enquete(
        annee            Smallint NOT NULL ,
        situation        Varchar (256) NOT NULL ,
        id_etablissement Varchar (50) NOT NULL ,
        id_discipline    Varchar (10) NOT NULL ,
        diplome          Varchar (256) NOT NULL
	,CONSTRAINT Enquete_PK PRIMARY KEY (annee,situation,id_etablissement,id_discipline)

	,CONSTRAINT Enquete_Statistiques_FK FOREIGN KEY (annee,situation) REFERENCES Statistiques(annee,situation)
	,CONSTRAINT Enquete_Etablissement0_FK FOREIGN KEY (id_etablissement) REFERENCES Etablissement(id_etablissement)
	,CONSTRAINT Enquete_Discipline1_FK FOREIGN KEY (id_discipline) REFERENCES Discipline(id_discipline)
)ENGINE=InnoDB;

