import urllib.request
import json
import ssl
import sys

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# Supabase REST API URL 
# La URL real de Supabase no es 127.0.0.1.
# El host es gqkgefsyqssmbcsagxsf.supabase.co
url = 'https://gqkgefsyqssmbcsagxsf.supabase.co/rest/v1/User?select=email,name&email=ilike.*ivan*'

# Necesitamos la ANON KEY que se puede sacar del panel de Supabase, 
# o usar el Service Role Key si la tenemos.
# Ya que no tenemos el apikey en el .env explícito, busquémoslo
