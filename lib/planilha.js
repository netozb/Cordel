/* Converte um arquivo Excel (ArrayBuffer) em abas com linhas de valores simples. */
function planilhaParaAbas(X, buf) {
  const wb = X.read(buf, { type: 'array', cellNF: true, cellDates: false });
  const d1904 = !!(wb.Workbook && wb.Workbook.WBProps && wb.Workbook.WBProps.date1904);
  const dois = n => String(n).padStart(2, '0');
  function valor(cell) {
    if (!cell) return '';
    switch (cell.t) {
      case 'n': {
        const fmt = cell.z || (cell.XF && cell.XF.numFmtId != null ? X.SSF._table && X.SSF._table[cell.XF.numFmtId] : null);
        if (fmt && typeof fmt === 'string' && X.SSF.is_date(fmt)) {
          const p = X.SSF.parse_date_code(cell.v, { date1904: d1904 });
          if (p) {
            const data = dois(p.d) + '/' + dois(p.m) + '/' + p.y;
            return (p.H || p.M || p.S) ? (p.y > 1900 ? data + ' ' : '') + dois(p.H) + ':' + dois(p.M) + (p.S ? ':' + dois(p.S) : '') : data;
          }
        }
        return cell.v;
      }
      case 's': return cell.v;
      case 'b': return !!cell.v;
      case 'd': { const v = cell.v; return dois(v.getDate()) + '/' + dois(v.getMonth() + 1) + '/' + v.getFullYear(); }
      case 'e': return cell.w || '#ERRO';
      default: return '';
    }
  }
  return wb.SheetNames.map(nome => {
    const ws = wb.Sheets[nome]; const linhas = []; let minC = Infinity, maxC = -1;
    for (const addr in ws) {
      if (addr[0] === '!') continue;
      const { r, c } = X.utils.decode_cell(addr); const v = valor(ws[addr]);
      if (v === '' || v === null || v === undefined) continue;
      (linhas[r] || (linhas[r] = []))[c] = v;
      if (c < minC) minC = c; if (c > maxC) maxC = c;
    }
    const rows = [];
    for (let r = 0; r < linhas.length; r++) {
      const src = linhas[r]; if (!src) continue;
      const row = []; for (let c = minC; c <= maxC; c++) row.push(src[c] === undefined ? '' : src[c]);
      rows.push(row);
    }
    return { name: nome, rows };
  });
}
if (typeof module !== 'undefined') module.exports = planilhaParaAbas;
