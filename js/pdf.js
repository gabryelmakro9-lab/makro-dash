import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatarMoeda } from "./utils.js";
import { METAS } from "./dashboard.js";

export function gerarRelatorioPDF(dados) {
    const doc = new jsPDF("p", "mm", "a4");
    const pageW = 210;
    const margin = 14;
    const colW = (pageW - 2 * margin) / 2;

    let y = 20;

    function titulo(texto) {
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text(texto, margin, y);
        y += 8;
    }

    function subtitulo(texto) {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(texto, margin, y);
        y += 6;
    }

    function linha() {
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, pageW - margin, y);
        y += 4;
    }

    function kpi(label, valor, meta) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.text(label, margin, y);
        doc.setFontSize(13);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.text(String(valor), margin + 2, y + 6);
        if (meta !== undefined) {
            doc.setFontSize(7);
            const acimaMeta = valor >= meta;
            if (meta >= 0) {
                doc.setTextColor(acimaMeta ? 0 : 200, acimaMeta ? 150 : 50, acimaMeta ? 0 : 50);
            } else {
                doc.setTextColor(136, 136, 136);
            }
            doc.text(`Meta: ${meta}`, margin + 2, y + 12);
        }
        doc.setFont("helvetica", "normal");
        y += meta !== undefined ? 20 : 14;
    }

    titulo("Makro Executive Dashboard");
    subtitulo(`Relatório gerado em ${new Date().toLocaleString("pt-BR")}`);
    linha();

    if (dados?.kpis) {
        titulo("Indicadores");
        for (const [k, v] of Object.entries(dados.kpis)) {
            kpi(k, v, null);
        }
        linha();
    }

    if (dados?.metas) {
        titulo("Metas");
        for (const [k, v] of Object.entries(METAS)) {
            kpi(k, v, null);
        }
        linha();
    }

    if (dados?.tabela?.length > 0) {
        titulo("Tabela de Dados");
        const headers = Object.keys(dados.tabela[0]);
        const rows = dados.tabela.map(r => headers.map(h => r[h]));
        autoTable(doc, {
            startY: y,
            head: [headers],
            body: rows,
            margin: { left: margin, right: margin },
            styles: { fontSize: 7, cellPadding: 2 },
            headStyles: { fillColor: [212, 175, 55], textColor: [0, 0, 0], fontStyle: "bold" },
            alternateRowStyles: { fillColor: [245, 245, 245] },
        });
        y = (doc.lastAutoTable?.finalY || y) + 10;
    }

    if (dados?.insights?.length > 0) {
        if (y > 250) { doc.addPage(); y = 20; }
        titulo("Insights");
        doc.setFontSize(9);
        dados.insights.forEach((ins, i) => {
            if (y > 275) { doc.addPage(); y = 20; }
            doc.setTextColor(40, 40, 40);
            doc.text(`${i + 1}. ${ins}`, margin, y);
            y += 5;
        });
    }

    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text("Makro Executive Dashboard — Confidencial", margin, 290);

    doc.save("relatorio_dashboard.pdf");
}
