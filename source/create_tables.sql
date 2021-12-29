#------------------------------------------------------------
#        Script MySQL.
#------------------------------------------------------------


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
        id_etablissement         Varchar (30) NOT NULL ,
        nom_etablissement        Varchar (256) NOT NULL ,
        nom_etablissement_actuel Varchar (256) ,
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
        poids          Int ,
        code_domaine   Varchar (10) NOT NULL
	,CONSTRAINT Discipline_PK PRIMARY KEY (id_discipline)

	,CONSTRAINT Discipline_Domaine_FK FOREIGN KEY (code_domaine) REFERENCES Domaine(code_domaine)
)ENGINE=InnoDB;


#------------------------------------------------------------
# Table: Enquete
#------------------------------------------------------------

CREATE TABLE Enquete(
        annee     Varchar (4) NOT NULL ,
        situation Varchar (50) NOT NULL ,
        diplome   Varchar (50) NOT NULL
	,CONSTRAINT Enquete_PK PRIMARY KEY (annee,situation,diplome)
)ENGINE=InnoDB;


#------------------------------------------------------------
# Table: Statistiques
#------------------------------------------------------------

CREATE TABLE Statistiques(
        id_etablissement                              Varchar (30) NOT NULL ,
        id_discipline                                 Varchar (10) NOT NULL ,
        annee                                         Varchar (4) NOT NULL ,
        situation                                     Varchar (50) NOT NULL ,
        diplome                                       Varchar (50) NOT NULL ,
        taux_dinsertion                               Int ,
        emplois_cadre_ou_professions_intermediaires   Int ,
        emplois_stables                               Int ,
        emplois_a_temps_plein                         Int ,
        salaire_net_median_des_emplois_a_temps_plein  Int ,
        salaire_brut_annuel_estime                    Int ,
        de_diplomes_boursiers                         Int ,
        taux_de_chomage_regional                      Int ,
        salaire_net_mensuel_median_regional           Int ,
        emplois_cadre                                 Int ,
        emplois_exterieurs_a_la_region_de_luniversite Int NOT NULL ,
        femmes                                        Int NOT NULL
	,CONSTRAINT Statistiques_PK PRIMARY KEY (id_etablissement,id_discipline,annee,situation,diplome)

	,CONSTRAINT Statistiques_Etablissement_FK FOREIGN KEY (id_etablissement) REFERENCES Etablissement(id_etablissement)
	,CONSTRAINT Statistiques_Discipline0_FK FOREIGN KEY (id_discipline) REFERENCES Discipline(id_discipline)
	,CONSTRAINT Statistiques_Enquete1_FK FOREIGN KEY (annee,situation,diplome) REFERENCES Enquete(annee,situation,diplome)
)ENGINE=InnoDB;

