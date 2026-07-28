import sys
import re

filepath = "js/laudo-materiais.js"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

pattern = re.compile(r'function gerarPDFLaudoMateriais\(\) \{.*?^\}', re.MULTILINE | re.DOTALL)

replacement = r"""function gerarPDFLaudoMateriais() {
  const data = getFormData();
  if (!data.acessorios || data.acessorios.length === 0) return alert("Adicione pelo menos um acessório.");
  const win = window.open("", "_blank");
  if (!win) return alert("Permita pop-ups.");

  const emissaoData = data;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Laudo Técnico - Acessórios de Içamento</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @media print {
      @page { size: A4 portrait; margin: 10mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: sans-serif; }
      .page-break-before-always { page-break-before: always; }
      .page-break-inside-avoid { page-break-inside: avoid; }
      .print-m-0 { margin: 0 !important; }
      .print-p-0 { padding: 0 !important; }
      .print-pt-0 { padding-top: 0 !important; }
      .print-mt-0 { margin-top: 0 !important; }
    }
    body { font-family: sans-serif; background: #fff; color: #000; }
  </style>
</head>
<body class="bg-white w-full text-black print-m-0 print-p-0 text-xs">
  
  <div class="page-break-inside-avoid">
    <table class="w-full mb-4 border-collapse border-2 border-black">
      <tbody>
        <tr>
          <td class="w-1/4 border-r-2 border-black p-4 align-middle text-center">
            <img src="./assets/LOGO AZUL (1).png" alt="Makro" class="max-h-14 mx-auto object-contain grayscale-0" onerror="this.src='../assets/LOGO AZUL (1).png'; this.onerror=null;" />
          </td>
          <td class="w-2/4 border-r-2 border-black p-2 align-middle text-center">
            <h1 class="font-bold text-lg uppercase" style="color: #034C8C;">LAUDO TÉCNICO DE INSPEÇÃO</h1>
            <h2 class="font-bold text-sm mt-1">ACESSÓRIOS DE IÇAMENTO - RESUMO</h2>
          </td>
          <td class="w-1/4 p-2 align-middle text-xs bg-gray-50 leading-tight">
            <div class="font-bold border-b border-gray-300 pb-1 mb-1">CONTROLE: <span class="font-normal text-red-600">${emissaoData.numeroLaudo || ''}</span></div>
            <div class="font-bold border-b border-gray-300 pb-1 mb-1">DATA: <span class="font-normal">${emissaoData.dataInspecao || ''}</span></div>
            <div class="font-bold border-b border-gray-300 pb-1 mb-1">ART: <span class="font-normal">${emissaoData.art || 'N/A'}</span></div>
            <div class="font-bold">UNIDADE: <span class="font-normal">${emissaoData.local || ''}</span></div>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="border-2 border-black mb-4">
      <div class="bg-slate-200 border-b-2 border-black p-1 font-bold text-sm text-center uppercase text-black">
        CONTRATANTE
      </div>
      <table class="w-full text-xs text-left border-collapse">
        <tbody>
          <tr class="border-b border-black">
            <td class="w-[15%] font-bold p-1.5 border-r border-black bg-gray-100 uppercase">RAZÃO SOCIAL</td>
            <td class="w-[45%] p-1.5 border-r border-black uppercase">MAKRO ENGENHARIA LTDA</td>
            <td class="w-[15%] font-bold p-1.5 border-r border-black bg-gray-100 uppercase">CNPJ</td>
            <td class="w-[25%] p-1.5 uppercase">05.325.014/0001-07</td>
          </tr>
          <tr class="border-b border-black">
            <td class="font-bold p-1.5 border-r border-black bg-gray-100 uppercase">ENDEREÇO</td>
            <td colspan="3" class="p-1.5 uppercase">RODOVIA BR-116, 4921, KM 14, PAUPINA - FORTALEZA (CE)</td>
          </tr>
          <tr>
            <td class="font-bold p-1.5 border-r border-black bg-gray-100 uppercase">MÁQUINA</td>
            <td class="p-1.5 border-r border-black text-slate-700 uppercase">MODELO: ${emissaoData.equipamentoAtrelado || 'N/A'}</td>
            <td class="font-bold p-1.5 border-r border-black bg-gray-100 uppercase">FROTA</td>
            <td class="p-1.5 text-slate-700 uppercase">${emissaoData.frotaAtrelada || 'N/A'}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="border-2 border-black mb-4">
      <div class="bg-slate-200 border-b-2 border-black p-1.5 font-bold text-sm text-center uppercase text-black">
        NORMATIVAS
      </div>
      <table class="w-full text-xs font-semibold text-slate-800 border-collapse text-center">
        <tbody>
          <tr class="border-b border-black">
            <td class="w-1/3 p-2 border-r border-black">NBR 13541-1</td>
            <td class="w-1/3 p-2 border-r border-black">NBR 15637-1:2023</td>
            <td class="w-1/3 p-2">NBR 13545</td>
          </tr>
          <tr>
            <td class="w-1/3 p-2 border-r border-black">NR 11</td>
            <td class="w-1/3 p-2 border-r border-black">NBR ISO 4309 / 2009</td>
            <td class="w-1/3 p-2">NBR 8400</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="border-2 border-black mb-4">
      <div class="bg-slate-200 border-b-2 border-black p-1 font-bold text-sm text-center uppercase text-black">
        OBJETIVO
      </div>
      <div class="p-2 text-xs text-justify text-slate-800 leading-relaxed">
        Verificar e avaliar o funcionamento, as condições físicas e a segurança dos acessórios de içamento relacionados neste laudo, certificando que não houve alterações nas suas características originais de fabricação. Confirmar que todos se apresentam em conformidade com as exigências técnicas e registros legais aplicáveis, estando dentro da normativa estabelecida e aptos para uso seguro nas operações previstas.
      </div>
    </div>
  </div>

  <div class="border-2 border-black mb-4">
    <div class="bg-slate-200 border-b-2 border-black p-1.5 font-bold text-sm text-center uppercase text-black">
      RELAÇÃO DE ACESSÓRIOS DE IÇAMENTO INSPECIONADOS
    </div>
    <table class="w-full text-xs text-left border-collapse">
      <thead class="bg-gray-100 border-b border-black font-bold">
        <tr>
          <th class="p-1.5 border-r border-black text-center">ITEM</th>
          <th class="p-1.5 border-r border-black">TIPO</th>
          <th class="p-1.5 border-r border-black">CAPACIDADE</th>
          <th class="p-1.5 border-r border-black">FABRICANTE</th>
          <th class="p-1.5 border-r border-black">DIMENSÃO</th>
          <th class="p-1.5 border-r border-black">TAG</th>
          <th class="p-1.5 border-r border-black">CERT/SÉRIE</th>
          <th class="p-1.5">STATUS</th>
        </tr>
      </thead>
      <tbody>
        ${emissaoData.acessorios.map((ac, i) => `
          <tr class="border-b border-gray-300 last:border-b-0">
            <td class="p-1.5 border-r border-black text-center">${i + 1}</td>
            <td class="p-1.5 border-r border-black font-semibold">${ac.tipo}</td>
            <td class="p-1.5 border-r border-black">${ac.capacidade || ''}</td>
            <td class="p-1.5 border-r border-black">${ac.fabricante || 'N/I'}</td>
            <td class="p-1.5 border-r border-black">${ac.tamanho || ''}</td>
            <td class="p-1.5 border-r border-black font-bold">${ac.tag || ''}</td>
            <td class="p-1.5 border-r border-black">${ac.certificado || 'ILEGÍVEL'}</td>
            <td class="p-1.5 font-bold ${ac.parecer === 'Aprovado' ? 'text-green-700' : 'text-red-700'}">${(ac.parecer||'').toUpperCase()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="flex justify-center mt-16 mb-4 page-break-inside-avoid">
    <div class="w-1/2 text-center">
      <div class="border-b border-black w-4/5 mx-auto mb-1"></div>
      <div class="font-bold text-sm uppercase">${emissaoData.inspetor || 'INSPETOR TÉCNICO RESPONSÁVEL'}</div>
      <div class="text-xs mt-1 font-semibold">Engenheiro Mecânico</div>
      <div class="text-xs mt-0.5">CREA: ${emissaoData.crea || '___________'} | ART: ${emissaoData.art || '___________'}</div>
      <div class="text-xs mt-1 font-bold">MAKRO ENGENHARIA LTDA</div>
    </div>
  </div>

  ${emissaoData.acessorios.map((ac, i) => {
    const isManilha = ['Manilha Curva', 'Manilha Reta'].includes(ac.tipo);
    let checklistList = CHECKLIST_CINTA || [];
    if (isManilha) checklistList = CHECKLIST_MANILHA || [];
    else if (ac.tipo === 'Slingas de Cabo de Aço') checklistList = CHECKLIST_CABO_ACO || [];
    
    const renderStatus = (item) => {
        if(!item) return '';
        const statusVal = ac.checklist && ac.checklist[item.id] ? ac.checklist[item.id] : 'C';
        let text = 'N/A', col = 'text-gray-500';
        if (statusVal === 'C') { text = 'Conforme'; col = 'text-green-700'; }
        if (statusVal === 'NC') { text = 'Inconforme'; col = 'text-red-700'; }
        return `<span class="font-bold uppercase ${col}">${text}</span>`;
    };

    let checklistRowsHtml = '';
    const numRows = Math.ceil(checklistList.length / 2);
    for(let rowIndex = 0; rowIndex < numRows; rowIndex++){
      const item1 = checklistList[rowIndex * 2];
      const item2 = checklistList[rowIndex * 2 + 1];
      checklistRowsHtml += `
        <tr class="border-b border-gray-300 last:border-b-0">
          <td class="p-1 border-r border-black font-semibold">${item1?.label || ''}</td>
          <td class="p-1 border-r-2 border-black">${renderStatus(item1)}</td>
          <td class="p-1 border-r border-black font-semibold">${item2?.label || ''}</td>
          <td class="p-1">${renderStatus(item2)}</td>
        </tr>
      `;
    }

    let dimensoesHtml = '';
    if (isManilha) {
       let wVal = parseFloat(String(ac.dimensoes?.w || "").replace(',','.'));
       let pVal = parseFloat(String(ac.dimensoes?.p || "").replace(',','.'));
       let dxpVal = parseFloat(String(ac.dimensoes?.dxp || "").replace(',','.'));
       let nom = ac.padraoManilha && DIMENSOES_MANILHAS ? DIMENSOES_MANILHAS[ac.padraoManilha] : null;
       
       dimensoesHtml = `
         <div class="border-2 border-black mb-2 shrink-0">
           <div class="bg-slate-200 border-b-2 border-black p-0.5 font-bold text-[9px] text-center uppercase text-black">
             ANÁLISE DIMENSIONAL - ABNT NBR 13545 (Desgaste Máx 10% | Abertura Máx 10%)
           </div>
           <table class="w-full text-[9px] text-left border-collapse">
             <thead class="bg-gray-100 border-b border-black font-bold">
               <tr>
                 <th class="w-2/5 p-1 border-r border-black">Parâmetro de Medição</th>
                 <th class="w-1/5 p-1 border-r border-black">Abertura Inferior (W)</th>
                 <th class="w-1/5 p-1 border-r border-black">Diâmetro Pino (P)</th>
                 <th class="w-1/5 p-1">Diâm. Corpo (DxP)</th>
               </tr>
             </thead>
             <tbody>
               ${nom ? `
               <tr class="border-b border-gray-300 text-gray-600">
                 <td class="p-1 border-r border-black font-semibold">Valores Nominais (Padrão):</td>
                 <td class="p-1 border-r border-black">${nom.w} mm</td>
                 <td class="p-1 border-r border-black">${nom.p} mm</td>
                 <td class="p-1">${nom.dxp} mm</td>
               </tr>` : ''}
               <tr class="border-b border-gray-300 bg-white">
                 <td class="p-1 border-r border-black font-bold text-black">Valor Encontrado na Inspeção:</td>
                 <td class="p-1 border-r border-black font-bold text-black">${ac.dimensoes?.w ? `${ac.dimensoes.w} mm` : '-'}</td>
                 <td class="p-1 border-r border-black font-bold text-black">${ac.dimensoes?.p ? `${ac.dimensoes.p} mm` : '-'}</td>
                 <td class="p-1 font-bold text-black">${ac.dimensoes?.dxp ? `${ac.dimensoes.dxp} mm` : '-'}</td>
               </tr>
               ${nom ? `
               <tr class="border-b border-gray-300 font-bold uppercase bg-gray-50 text-[8px]">
                 <td class="p-1 border-r border-black text-gray-600 text-right pr-2">Status por Medida:</td>
                 <td class="p-1 border-r border-black ${ac.dimensoes?.w ? (!(wVal <= nom.w * 1.1 && wVal >= nom.w * 0.9) ? 'text-red-600' : 'text-green-600') : ''}">
                     ${ac.dimensoes?.w ? (!(wVal <= nom.w * 1.1 && wVal >= nom.w * 0.9) ? 'REPROVADO' : 'APROVADO') : '-'}
                 </td>
                 <td class="p-1 border-r border-black ${ac.dimensoes?.p ? (!(pVal >= nom.p * 0.9) ? 'text-red-600' : 'text-green-600') : ''}">
                     ${ac.dimensoes?.p ? (!(pVal >= nom.p * 0.9) ? 'REPROVADO' : 'APROVADO') : '-'}
                 </td>
                 <td class="p-1 ${ac.dimensoes?.dxp ? (!(dxpVal >= nom.dxp * 0.9) ? 'text-red-600' : 'text-green-600') : ''}">
                     ${ac.dimensoes?.dxp ? (!(dxpVal >= nom.dxp * 0.9) ? 'REPROVADO' : 'APROVADO') : '-'}
                 </td>
               </tr>` : ''}
             </tbody>
           </table>
         </div>
       `;
    }

    let fotosHtml = '';
    if (ac.fotos && ac.fotos.length > 0) {
      const nf = ac.fotos.length;
      let gridClass = 'grid-cols-3 grid-rows-2';
      if(nf === 1) gridClass = 'grid-cols-1 grid-rows-1';
      else if(nf === 2) gridClass = 'grid-cols-2 grid-rows-1';
      else if(nf <= 4) gridClass = 'grid-cols-2 grid-rows-2';

      fotosHtml = `
        <div class="border-2 border-black mb-2 flex flex-col shrink-0">
           <div class="bg-slate-200 border-b-2 border-black p-0.5 font-bold text-[10px] text-center uppercase text-black">
             REGISTRO FOTOGRÁFICO
           </div>
           <div class="p-1.5 grid gap-1.5 bg-white ${gridClass}" style="height: 240px;">
              ${ac.fotos.map((foto, idx) => `
                <div class="flex justify-center items-center h-full w-full overflow-hidden border border-gray-200 rounded bg-slate-100">
                  <img src="${foto}" alt="Foto ${idx+1} do TAG ${ac.tag}" class="max-w-full max-h-full object-contain" />
                </div>
              `).join('')}
           </div>
        </div>
      `;
    }

    return `
      <div class="page-break-before-always pt-4 print-pt-0 print-mt-0 flex flex-col h-full" style="page-break-before: always; display: flex; flex-direction: column; min-height: 95vh;">
        <table class="w-full mb-2 border-collapse border-2 border-black shrink-0">
          <tbody>
            <tr>
              <td class="w-1/4 border-r-2 border-black p-2 align-middle text-center">
                <img src="./assets/LOGO AZUL (1).png" alt="Makro" class="max-h-12 mx-auto object-contain grayscale-0" onerror="this.src='../assets/LOGO AZUL (1).png'; this.onerror=null;" />
              </td>
              <td class="w-2/4 border-r-2 border-black p-1 align-middle text-center">
                <h1 class="font-bold text-sm uppercase" style="color: #034C8C;">LAUDO TÉCNICO DE INSPEÇÃO</h1>
                <h2 class="font-bold text-[10px] mt-0.5">ACESSÓRIO DE IÇAMENTO - ANEXO TÉCNICO</h2>
              </td>
              <td class="w-1/4 p-1 align-middle text-[9px] bg-gray-50 leading-tight">
                <div class="font-bold border-b border-gray-300 pb-0.5 mb-0.5">CONTROLE: <span class="font-normal text-red-600">${emissaoData.numeroLaudo}-${i+1}</span></div>
                <div class="font-bold border-b border-gray-300 pb-0.5 mb-0.5">DATA: <span class="font-normal">${emissaoData.dataInspecao}</span></div>
                <div class="font-bold border-b border-gray-300 pb-0.5 mb-0.5">ART: <span class="font-normal">${emissaoData.art || 'N/A'}</span></div>
                <div class="font-bold">PÁGINA: <span class="font-normal">1 DE 1</span></div>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="border-2 border-black mb-2 shrink-0">
          <table class="w-full text-[9px] text-left border-collapse">
            <tbody>
              <tr class="border-b border-black">
                <td class="w-[15%] font-bold p-1 border-r border-black bg-gray-100 uppercase">CONTRATANTE</td>
                <td class="w-[35%] p-1 border-r border-black uppercase">MAKRO ENGENHARIA LTDA</td>
                <td class="w-[15%] font-bold p-1 border-r border-black bg-gray-100 uppercase">CNPJ</td>
                <td class="w-[35%] p-1 uppercase">05.325.014/0001-07</td>
              </tr>
              <tr class="border-b border-black">
                <td class="font-bold p-1 border-r border-black bg-gray-100 uppercase">ENDEREÇO</td>
                <td colspan="3" class="p-1 uppercase">RODOVIA BR-116, 4921, KM 14, PAUPINA - FORTALEZA (CE)</td>
              </tr>
              <tr class="border-b border-black">
                <td class="font-bold p-1 border-r border-black bg-gray-100 uppercase">MÁQUINA/FROTA</td>
                <td class="p-1 border-r border-black uppercase">${emissaoData.equipamentoAtrelado || 'N/A'} ${emissaoData.frotaAtrelada ? `/ ${emissaoData.frotaAtrelada}` : ''}</td>
                <td class="font-bold p-1 border-r border-black bg-gray-100 uppercase">NORMATIVAS</td>
                <td class="p-1 font-semibold">NBR 13541-1, NBR 15637-1, NBR 13545, NR 11, ISO 4309</td>
              </tr>
              <tr>
                <td class="font-bold p-1 border-r border-black bg-gray-100 uppercase text-center align-middle">OBJETIVO</td>
                <td colspan="3" class="p-1 text-justify leading-tight">
                  Verificar e avaliar o funcionamento, as condições físicas e a segurança do acessório individualmente, certificando a ausência de alterações nas características originais e a conformidade com as exigências técnicas e normativas para uso seguro nas operações de içamento.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="border-2 border-black mb-2 shrink-0">
          <div class="bg-slate-200 border-b-2 border-black p-0.5 font-bold text-[10px] text-center uppercase text-black">
            RASTREABILIDADE - ${(ac.tipo||'').toUpperCase()}
          </div>
          <table class="w-full text-[9px] text-left border-collapse">
            <thead class="bg-gray-100 border-b border-black font-bold">
              <tr>
                <th class="w-1/4 p-1 border-r border-black">TAG</th>
                <th class="w-1/4 p-1 border-r border-black">FABRICANTE</th>
                <th class="w-1/4 p-1 border-r border-black">CÓD / SÉRIE</th>
                <th class="w-1/4 p-1">CAPAC. / TAMANHO</th>
              </tr>
            </thead>
            <tbody class="font-bold text-[10px]">
              <tr>
                <td class="p-1 border-r border-black">${ac.tag || ''}</td>
                <td class="p-1 border-r border-black">${ac.fabricante || 'N/C'}</td>
                <td class="p-1 border-r border-black">${ac.certificado || 'N/C'}</td>
                <td class="p-1">${ac.capacidade || ''} - ${ac.tamanho || ''}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="border-2 border-black mb-2 shrink-0">
          <div class="bg-slate-200 border-b-2 border-black p-0.5 font-bold text-[10px] text-center uppercase text-black">
            INSPEÇÃO FÍSICA E OPERACIONAL
          </div>
          <table class="w-full text-[9px] text-left border-collapse">
            <thead class="bg-gray-100 border-b border-black font-bold">
              <tr>
                <th class="w-[33%] p-1 border-r border-black">ITEM DE VERIFICAÇÃO</th>
                <th class="w-[17%] p-1 border-r-2 border-black">STATUS</th>
                <th class="w-[33%] p-1 border-r border-black">ITEM DE VERIFICAÇÃO</th>
                <th class="w-[17%] p-1">STATUS</th>
              </tr>
            </thead>
            <tbody>
              ${checklistRowsHtml}
            </tbody>
          </table>
        </div>

        ${dimensoesHtml}

        ${fotosHtml}

        <div class="border-2 border-black mb-2 shrink-0">
          <table class="w-full text-left border-collapse">
            <tbody>
              <tr>
                <td class="w-1/2 p-2 border-r-2 border-black align-top">
                  <div class="font-bold text-[10px] uppercase mb-1">Observações Específicas:</div>
                  <div class="text-[9px] min-h-[40px] whitespace-pre-wrap">${ac.observacao || "Sem observações impeditivas registradas para este item."}</div>
                </td>
                <td class="w-1/2 p-2 bg-gray-50 align-middle text-center">
                  <div class="font-bold text-[10px] uppercase mb-0.5">CONCLUSÃO DO ITEM</div>
                  <div class="inline-block font-bold text-xs uppercase px-4 py-1 border-2 my-1 ${ac.parecer === 'Aprovado' ? 'border-green-600 text-green-700' : 'border-red-600 text-red-700'}">
                    ${ac.parecer || ''}
                  </div>
                  <div class="font-bold text-[9px] uppercase block">Ação Recomendada: <span class="font-normal">${ac.recomendacao || ''}</span></div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex justify-center mt-auto mb-1 shrink-0">
          <div class="w-2/3 text-center">
            <div class="border-b border-black w-full mx-auto mb-1"></div>
            <div class="font-bold text-[10px] uppercase">${emissaoData.inspetor || 'INSPETOR TÉCNICO RESPONSÁVEL'}</div>
            <div class="text-[9px] mt-0.5 font-semibold">Engenheiro Mecânico</div>
            <div class="text-[9px] mt-0.5">CREA: ${emissaoData.crea || '___________'} | ART: ${emissaoData.art || '___________'}</div>
            <div class="text-[9px] mt-0.5 font-bold">MAKRO ENGENHARIA LTDA</div>
          </div>
        </div>
      </div>
    `;
  }).join('')}

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        // window.close(); // opcional
      }, 500);
    };
  </script>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
}"""

content = pattern.sub(replacement, content)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

print("Replacement successful without escape sequences.")
