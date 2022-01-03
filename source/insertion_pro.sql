select * from etablissement;

-- afficher  toutes les enquetes en supprimant les doublons
select distinct * from enquete;
-- afficher toutes les academies
select distinct * from academie;
-- afficher toutes les disciplines
select distinct * from discipline;
-- afficher toutes les etablissements
select distinct * from etablissement;
-- afficher toutes les domaines
select distinct * from domaine;
-- afficher toutes les disciplines
select distinct * from discipline;
-- afficher toutes les statistiques
select distinct * from statistiques;
-- afficher toutes les enquêtes
select distinct * from enquete;

-- afficher le salaire_net_median_des_emplois_a_temps_plein le plus élevé et la discpline correspondante et l'établissement
select max(salaire_net_median_des_emplois_a_temps_plein) from statistiques;
-- afficher le salaire_net_median_des_emplois_a_temps_plein le plus bas et le nom de  discpline correspondante et  le nom de l'établissement en utilisant un JOIN
select min(salaire_net_median_des_emplois_a_temps_plein), nom_etablissement, nom_discipline from statistiques
 join discipline on statistiques.id_discipline = discipline.id_discipline 
 join etablissement on statistiques.id_etablissement = etablissement.id_etablissement;

--afficher le salaire_net_median_des_emplois_a_temps_plein le plus élevé et le nom de  discpline correspondante et  le nom de l'établissement en utilisant un JOIN
select max(salaire_net_median_des_emplois_a_temps_plein), nom_etablissement, nom_discipline from statistiques
 join discipline on statistiques.id_discipline = discipline.id_discipline 
 join etablissement on statistiques.id_etablissement = etablissement.id_etablissement;

 -- afficher les salaire_net_mensuel_median_regional et de nom_académie correspondante en utilisant deux fois JOIN une fois avec 
 --etablissement et un deuxieme join avec academie par ordre décroissant en éliminant les doublons
select distinct salaire_net_mensuel_median_regional, nom_academie from statistiques join etablissement
    on statistiques.id_etablissement = etablissement.id_etablissement join academie on etablissement.id_academie = academie.id_academie 
    ORDER BY salaire_net_mensuel_median_regional DESC;


-- afficher le taux_insertion par academie
select distinct taux_dinsertion, nom_academie from statistiques join etablissement
    on statistiques.id_etablissement = etablissement.id_etablissement join academie on etablissement.id_academie = academie.id_academie 
    ORDER BY taux_dinsertion DESC;

--afficher toutes les université qui ont changé de nom
select distinct nom_etablissement, nom_etablissement_actuel from etablissement where nom_etablissement_actuel IS NOT NULL ;

--afficher toutes les informations de l'établissement dont le nom est "Pierre et Marie Curie" en utilisant un JOIN avec la table etablissement
select distinct * from statistiques join etablissement on statistiques.id_etablissement = etablissement.id_etablissement
    where etablissement.nom_etablissement = "Pierre et Marie Curie";

