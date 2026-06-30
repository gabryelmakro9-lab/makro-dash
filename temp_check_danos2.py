from supabase import create_client
url = "https://lxdszgtcrqpjczjehwhy.supabase.co"
anon = "sb_publishable_LH64S5vndisCw7XJHlIbrg_pZdlOCXY"
supabase = create_client(url, anon)
try:
    resp = supabase.table("danos").select("id", count="exact").execute()
    print("Danos salvos no Supabase:", len(resp.data), "registros")
except Exception as e:
    print("Erro:", e)
