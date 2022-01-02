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


mycursor = mydb.cursor()

mycursor.execute("SELECT * FROM etablissement")

myresult = mycursor.fetchall()

for x in myresult:
  print(x)