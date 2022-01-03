"""
Autors : Toufik FERHAT, Asma DAGMOUNE
This script is used to clean the store data in mysqldb.
"""

# Import modules
import pandas as pd
import mysql.connector
from tqdm import tqdm

## Connect to database
mydb = mysql.connector.connect(
  host="localhost",
  user="root",
  passwd="SadikaSydney99",
  database="insertion_pro",
  auth_plugin='mysql_native_password'
)

## Read the csv file
df = pd.read_csv('../data/fr-esr-insertion_professionnelle-master.csv', sep=';')

## Clean the data

# Replace all values which are equal to "ns" or "np" by None
df = df.where((df != 'ns') & (df != 'nd'), None)
# Replace all values wich are eaquel to "." by None
df = df.where((df != '.'), None)
# Replace all null values by null
df = df.where((pd.notnull(df)), None)
# Remove all the rows where the column "remarque" is not empty
df = df[df['remarque'].isnull()]

# Delete all rows where id_etablissement is null or id_academie is null
df = df[df['numero_de_l_etablissement'].notnull()]
df = df[df['code_de_l_academie'].notnull()]

## Insert values to Academie table
# Fetch the needed columns
id_academie = df['code_de_l_academie']
nom_academie = df['academie']

# Delete all duplicates id academies using panda's drop_duplicates function
id_academie = id_academie.drop_duplicates()
nom_academie = nom_academie.drop_duplicates()

# Delete null values
id_academie = id_academie.dropna()
nom_academie = nom_academie.dropna()

# Fetch only values
id_academie = id_academie.values
nom_academie = nom_academie.values

print("Inserting values to Academie table...")
# Insert values to Academie table
# If value is nan then insert null
# Check if the value is already in the table
# If not insert it
for i in tqdm(range(len(id_academie))):
    mycursor = mydb.cursor()
    sql = "SELECT * FROM Academie WHERE id_academie = %s"
    val = (id_academie[i],)
    mycursor.execute(sql, val)
    myresult = mycursor.fetchall()
    if len(myresult) == 0:
        sql = "INSERT INTO Academie (id_academie, nom_academie) VALUES (%s, %s)"
        val = (id_academie[i], nom_academie[i])
        mycursor.execute(sql, val)
        mydb.commit()

## Insert values to Etablisement table
# Fetch the needed columns
# Delete all rows where numero_d_etablissement is duplicated
df_id_etablissement = df.drop_duplicates(subset='numero_de_l_etablissement')

# Delete all rows where id_academie is null
df_id_etablissement = df_id_etablissement[df_id_etablissement['code_de_l_academie'].notnull()]

# Replace all null values by None
df_id_etablissement = df_id_etablissement.where((pd.notnull(df_id_etablissement)), None)

# Fetch the needed columns
id_etablissement = df_id_etablissement['numero_de_l_etablissement'].values
id_academie = df_id_etablissement['code_de_l_academie'].values
nom_etablissement = df_id_etablissement['etablissement'].values
nom_etablissement_actuel = df_id_etablissement['etablissementactuel'].values


# Insert values to Etablissement table
# If value is nan then insert null
# Check if the value is already in the table
print("Inserting values to Etablissement table...")
for i in tqdm(range(len(id_etablissement))):
    sql = "SELECT * FROM etablissement WHERE id_etablissement = %s"
    val = (id_etablissement[i],)
    mycursor = mydb.cursor()
    mycursor.execute(sql, val)
    myresult = mycursor.fetchall()
    if len(myresult) == 0:
        sql = "INSERT INTO etablissement (id_etablissement, id_academie, nom_etablissement, nom_etablissement_actuel) VALUES (%s, %s, %s, %s)"
        val = (id_etablissement[i], id_academie[i], nom_etablissement[i], nom_etablissement_actuel[i])
        mycursor = mydb.cursor()
        mycursor.execute(sql, val)
        mydb.commit()

## Insert values to Domaine table
# Fetch the needed columns
code_domaine = df['code_du_domaine']
nom_domaine = df['domaine']

# Delete all duplicates id academies using panda's drop_duplicates function
code_domaine = code_domaine.drop_duplicates()
nom_domaine = nom_domaine.drop_duplicates()

# Delete null values
code_domaine = code_domaine.dropna()
nom_domaine = nom_domaine.dropna()

# Fetch only values
code_domaine = code_domaine.values
nom_domaine = nom_domaine.values


# Insert values to Domaine table
print("Inserting values to Domaine table...")
for i in tqdm(range(len(code_domaine))):
    sql = "INSERT INTO domaine (code_domaine, nom_domaine) VALUES (%s, %s)"
    val = (code_domaine[i], nom_domaine[i])
    mycursor = mydb.cursor()
    mycursor.execute(sql, val)
    mydb.commit()


# Insert values to Discipline table
# Fetch the needed columns
# Delete all rows where code_de_la_discipline is duplicated
df_code_discipline = df.drop_duplicates(subset='code_de_la_discipline')

# Delete all rows where Domaine is null
df_code_discipline = df_code_discipline[df_code_discipline['code_du_domaine'].notnull()]

# Replace all null values by None
df_code_discipline = df_code_discipline.where((pd.notnull(df_code_discipline)), None)

# Fetch the needed columns
id_discipline = df_code_discipline['code_de_la_discipline'].values
code_domaine = df_code_discipline['code_du_domaine'].values
nom_discipline = df_code_discipline['discipline'].values
poids = df_code_discipline['poids_de_la_discipline'].values


# Insert values to Discipline table
# If value is nan then insert null
# Check if the value is already in the table
print("Inserting values to Discipline table...")
for i in tqdm(range(len(id_discipline))):
    sql = "SELECT * FROM discipline WHERE id_discipline = %s"
    val = (id_discipline[i],)
    mycursor = mydb.cursor()
    mycursor.execute(sql, val)
    myresult = mycursor.fetchall()
    if len(myresult) == 0:
        sql = "INSERT INTO discipline (id_discipline, code_domaine, nom_discipline, poids) VALUES (%s, %s, %s, %s)"
        val = (id_discipline[i], code_domaine[i], nom_discipline[i], poids[i])
        mycursor = mydb.cursor()
        mycursor.execute(sql, val)
        mydb.commit()


# Insert values to Enquete table
# Fetch the needed columns
# Delete all rows where annee, situation and diplome are duplicated
df_enquete = df.drop_duplicates(subset=['annee', 'situation', 'diplome'])

# Delete all rows where annee, situation and diplome are null
df_enquete = df_enquete[df_enquete['annee'].notnull()]
df_enquete = df_enquete[df_enquete['situation'].notnull()]
df_enquete = df_enquete[df_enquete['diplome'].notnull()]

# Replace all null values by None
df_enquete = df_enquete.where((pd.notnull(df_enquete)), None)

# Fetch the needed columns
annee = df_enquete['annee'].values
situation = df_enquete['situation'].values
diplome = df_enquete['diplome'].values

# Convert to list
annee = annee.tolist()
situation = situation.tolist()
diplome = diplome.tolist()

# Insert values to Enquete table
# If value is nan then insert null
# Check if the value is already in the table
print("Inserting values to Enquete table...")
for i in tqdm(range(len(annee))):
    sql = "SELECT * FROM enquete WHERE annee = %s AND situation = %s AND diplome = %s"
    val = (annee[i], situation[i], diplome[i])
    mycursor = mydb.cursor()
    mycursor.execute(sql, val)
    myresult = mycursor.fetchall()
    if len(myresult) == 0:
        sql = "INSERT INTO enquete (annee, situation, diplome) VALUES (%s, %s, %s)"
        val = (annee[i], situation[i], diplome[i])
        mycursor = mydb.cursor()
        mycursor.execute(sql, val)
        mydb.commit()


## Insert values to Statistiques table



# Fetch the needed columns

id_etablissement = df['numero_de_l_etablissement']
id_discipline = df['code_de_la_discipline']
annee = df['annee']
situation = df['situation']
diplome = df['diplome']

taux_dinsertion = df['taux_dinsertion']
emplois_cadre_ou_professions_intermediaires = df['emplois_cadre_ou_professions_intermediaires']
emplois_stables = df['emplois_stables']
emplois_a_temps_plein = df['emplois_a_temps_plein']
salaire_net_median_des_emplois_a_temps_plein = df['salaire_net_median_des_emplois_a_temps_plein']
salaire_brut_annuel_estime = df['salaire_brut_annuel_estime']
de_diplomes_boursiers = df['de_diplomes_boursiers']
taux_de_chomage_regional = df['taux_de_chomage_regional']
salaire_net_mensuel_median_regional = df['salaire_net_mensuel_median_regional']
emplois_cadre = df['emplois_cadre']
emplois_exterieurs_a_la_region_de_luniversite = df['emplois_exterieurs_a_la_region_de_luniversite']
femmes = df['femmes']


# Fetch only values and convert them to list
id_etablissement = id_etablissement.values.tolist()
id_discipline = id_discipline.values.tolist()
annee = annee.values.tolist()
situation = situation.values.tolist()
diplome = diplome.values.tolist()

taux_dinsertion = taux_dinsertion.values.tolist()
emplois_cadre_ou_professions_intermediaires = emplois_cadre_ou_professions_intermediaires.values.tolist()
emplois_stables = emplois_stables.values.tolist()
emplois_a_temps_plein = emplois_a_temps_plein.values.tolist()
salaire_net_median_des_emplois_a_temps_plein = salaire_net_median_des_emplois_a_temps_plein.values.tolist()
salaire_brut_annuel_estime = salaire_brut_annuel_estime.values.tolist()
de_diplomes_boursiers = de_diplomes_boursiers.values.tolist()
taux_de_chomage_regional = taux_de_chomage_regional.values.tolist()
salaire_net_mensuel_median_regional = salaire_net_mensuel_median_regional.values.tolist()
emplois_cadre = emplois_cadre.values.tolist()
emplois_exterieurs_a_la_region_de_luniversite = emplois_exterieurs_a_la_region_de_luniversite.values.tolist()
femmes = femmes.values.tolist()


# Insert values to Statistiques table
# If value is nan then insert null
# Check if the value is already in the table
# If The value is None then insert None
print("Inserting values to Statistiques table...")
for i in tqdm(range(len(id_etablissement))):
    sql = "SELECT * FROM statistiques WHERE id_etablissement = %s AND id_discipline = %s AND annee = %s AND situation = %s AND diplome = %s"
    val = (id_etablissement[i], id_discipline[i], annee[i], situation[i], diplome[i])
    mycursor = mydb.cursor()
    mycursor.execute(sql, val)
    myresult = mycursor.fetchall()

    if len(myresult) == 0:
        sql = "INSERT INTO statistiques (id_etablissement, id_discipline, annee, situation, diplome, taux_dinsertion, emplois_cadre_ou_professions_intermediaires, emplois_stables, emplois_a_temps_plein, salaire_net_median_des_emplois_a_temps_plein, salaire_brut_annuel_estime, de_diplomes_boursiers, taux_de_chomage_regional, salaire_net_mensuel_median_regional, emplois_cadre, emplois_exterieurs_a_la_region_de_luniversite, femmes) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
        val = (id_etablissement[i], id_discipline[i], annee[i], situation[i], diplome[i], taux_dinsertion[i], emplois_cadre_ou_professions_intermediaires[i], emplois_stables[i], emplois_a_temps_plein[i], salaire_net_median_des_emplois_a_temps_plein[i], salaire_brut_annuel_estime[i], de_diplomes_boursiers[i], taux_de_chomage_regional[i], salaire_net_mensuel_median_regional[i], emplois_cadre[i], emplois_exterieurs_a_la_region_de_luniversite[i], femmes[i])

        # Execute the SQL command
        mycursor = mydb.cursor()
        mycursor.execute(sql, val)
        mydb.commit()




        
