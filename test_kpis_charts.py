import subprocess, time, sys, os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE_DIR = Path(__file__).parent

server_proc = subprocess.Popen(
    [sys.executable, str(BASE_DIR / "server.py"), "8899"],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
)

try:
    time.sleep(2)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1920, "height": 1080})
        page.goto("http://localhost:8899", wait_until="networkidle")
        page.wait_for_timeout(3000)

        assert page.locator("#loginOverlay").is_visible(), "Tela de login não apareceu"

        page.fill("#loginEmail", "joao.silva@makroengenharia.com")
        page.fill("#loginPassword", "makro123")
        page.click("#loginBtn")
        page.wait_for_timeout(1500)

        assert page.locator("#loginOverlay").is_hidden(), "Login não fechou o overlay"

        page.wait_for_timeout(4000)

        kpi_sa = page.locator("#kpiSA")
        kpi_sc = page.locator("#kpiSC")
        kpi_gap = page.locator("#kpiGap")
        kpi_os = page.locator("#kpiOs")
        kpi_ticket = page.locator("#kpiTicket")
        kpi_sem_sc = page.locator("#kpiSemSC")

        sa_text = kpi_sa.inner_text()
        sc_text = kpi_sc.inner_text()
        gap_text = kpi_gap.inner_text()
        os_text = kpi_os.inner_text()
        ticket_text = kpi_ticket.inner_text()
        sem_sc_text = kpi_sem_sc.inner_text()

        print("=" * 60)
        print("VALIDAÇÃO DE KPIs")
        print("=" * 60)
        print(f"Valor SA Total:     {sa_text}")
        print(f"Valor SC Total:     {sc_text}")
        print(f"Gap Financeiro:     {gap_text}")
        print(f"Total OS:           {os_text}")
        print(f"Ticket Médio:       {ticket_text}")
        print(f"OS sem SC:          {sem_sc_text}")

        assert "R$" in sa_text, f"KPI SA inválido: {sa_text}"
        assert "R$" in sc_text, f"KPI SC inválido: {sc_text}"
        assert "R$" in gap_text, f"KPI Gap inválido: {gap_text}"
        assert os_text.replace(".", "").isdigit(), f"KPI OS inválido: {os_text}"
        assert "R$" in ticket_text, f"KPI Ticket inválido: {ticket_text}"
        try:
            int(sem_sc_text.replace(".", ""))
        except ValueError:
            assert False, f"KPI OS sem SC inválido: {sem_sc_text}"

        print("\nTodos os KPIs estão preenchidos e formatados corretamente.\n")

        chart_mensal = page.locator("#chartMensal")
        chart_tipo = page.locator("#chartTipo")
        chart_filial = page.locator("#chartFilial")
        chart_unidade = page.locator("#chartUnidade")

        print("=" * 60)
        print("VALIDACAO DE GRAFICOS (Canvas)")  
        print("=" * 60)
        for name, el in [("Evolução Mensal", chart_mensal),
                        ("Distribuição por Tipo", chart_tipo),
                        ("Custos por Filial", chart_filial),
                        ("Custos por Unidade", chart_unidade)]:
            is_visible = el.is_visible()
            print(f"  {name}: {'OK Presente' if is_visible else 'FALTA Ausente'}")
            assert is_visible, f"Grafico {name} nao esta visivel"

        chart_data = page.evaluate("""
            () => {
                const charts = {};
                if (window.chartMensal && window.chartMensal.data)
                    charts.mensal = { labels: window.chartMensal.data.labels, datasets: window.chartMensal.data.datasets.map(d => ({label: d.label, data: d.data})) };
                if (window.chartTipo && window.chartTipo.data)
                    charts.tipo = { labels: window.chartTipo.data.labels, datasets: window.chartTipo.data.datasets.map(d => ({label: d.label, data: d.data})) };
                if (window.chartFilial && window.chartFilial.data)
                    charts.filial = { labels: window.chartFilial.data.labels, datasets: window.chartFilial.data.datasets.map(d => ({label: d.label, data: d.data})) };
                if (window.chartUnidade && window.chartUnidade.data)
                    charts.unidade = { labels: window.chartUnidade.data.labels, datasets: window.chartUnidade.data.datasets.map(d => ({label: d.label, data: d.data})) };
                return charts;
            }
        """)

        print()
        for key, name in [("mensal", "Evolucao Mensal"),
                          ("tipo", "Distribuicao por Tipo"),
                          ("filial", "Custos por Filial"),
                          ("unidade", "Custos por Unidade")]:
            if key in chart_data:
                ds = chart_data[key]["datasets"]
                total = sum(ds[0]["data"]) if ds and ds[0]["data"] else 0
                labels = chart_data[key]["labels"]
                print(f"  {name}: {len(labels)} categorias, {sum(ds[0]['data']) if ds else 0:.2f} total")

        page.screenshot(path=str(BASE_DIR / "dashboard_screenshot.png"), full_page=True)
        print(f"\nScreenshot salva: {BASE_DIR / 'dashboard_screenshot.png'}")

        ranking_equip = page.locator("#rankingEquipamentos .ranking-item")
        ranking_filiais = page.locator("#rankingFiliais .ranking-item")
        print(f"\nRanking Equipamentos: {ranking_equip.count()} itens")
        print(f"Ranking Filiais: {ranking_filiais.count()} itens")

        insights = page.locator("#insightsContainer .insight")
        print(f"Insights: {insights.count()} cards")

        table_rows = page.locator("#mainTable tbody tr")
        print(f"Tabela: {table_rows.count()} linhas")

        print("\n" + "=" * 60)
        print("RESULTADO: TODAS AS VALIDACOES PASSARAM OK")
        print("=" * 60)

        browser.close()

finally:
    server_proc.terminate()
    server_proc.wait()
