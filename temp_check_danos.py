import urllib.request, json

headers = {
    "apikey": "sb_publishable_LH64S5vndisCw7XJHlIbrg_pZdlOCXY",
    "Authorization": "Bearer sb_publishable_LH64S5vndisCw7XJHlIbrg_pZdlOCXY"
}
r = urllib.request.Request("https://lxdszgtcrqpjczjehwhy.supabase.co/rest/v1/danos?select=id", headers=headers)
with urllib.request.urlopen(r) as resp:
    data = json.loads(resp.read())
    print("Danos salvos no Supabase:", len(data), "registros")
