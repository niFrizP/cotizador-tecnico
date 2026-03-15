import { SC, SL } from "../constants/ui";
import { calcTotals, fmtDate, fmtNum, fmtQuoteNumber, pad, today } from "./format";

export function generatePDF(q, iss) {
  return new Promise((resolve) => {
    const { sub, shp, total } = calcTotals(q.items);
    const sc = SC[q.status];
    const exp = q.status === "sent" && q.validUntil < today();
    const hasShp = q.items.some((i) => parseFloat(i.shipping) > 0);
    const logo = iss.logoDataUrl;
    const initials =
      (iss.name || "")
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2) || "N!";
    const quoteNumberLabel = fmtQuoteNumber(q.number);
    const fileNumber = q.number != null ? pad(q.number) : "sin_numero";
    const filename = `Cotizacion_${fileNumber}_${(q.client?.name || "").replace(/\s+/g, "_") || "cliente"
      }`;

    const logoHtml = logo
      ? `<img src="${logo}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;display:block"/>`
      : `<div style="width:52px;height:52px;border-radius:50%;background:#000;display:table-cell;text-align:center;vertical-align:middle;flex-shrink:0"><span style="color:#fff;font-size:16px;font-weight:700">${initials}</span></div>`;

    const equipmentRows = q.equipment?.enabled
      ? [
        ["Marca", q.equipment.brand],
        ["Modelo", q.equipment.model],
        ["N° Serie", q.equipment.serial],
        ["Año", q.equipment.year],
        ["Obs.", q.equipment.extra],
      ]
        .filter(([, v]) => v)
        .map(
          ([l, v]) =>
            `<tr><td style="font-size:9pt;color:#535353;font-weight:600;padding-right:8px;padding-bottom:2px;white-space:nowrap">${l}:</td><td style="font-size:9pt;color:#000;padding-bottom:2px">${v}</td></tr>`,
        )
        .join("")
      : "";

    const itemRowsHtml = q.items
      .filter((i) => i.description.trim())
      .map((item) => {
        const sv = (parseFloat(item.unitPrice) || 0) * (parseFloat(item.qty) || 0);
        return `<tr>
        <td style="padding:8px 0;font-size:9pt;color:#000;vertical-align:top;border-bottom:0.5pt solid #535353">
          <strong>${item.description}</strong>
          ${item.link
            ? `<br/><a href="${item.link}" style="color:#2563eb;font-size:8pt">${item.link}</a>`
            : ""
          }
        </td>
        <td style="padding:8px 6px;font-size:9pt;color:#000;text-align:center;vertical-align:top;border-bottom:0.5pt solid #535353">${item.qty
          } ${parseFloat(item.qty) === 1 ? "Unidad" : "Unidades"}</td>
        <td style="padding:8px 6px;font-size:9pt;color:#000;text-align:center;vertical-align:top;border-bottom:0.5pt solid #535353">${fmtNum(
            item.unitPrice,
            q.currency,
          )}</td>
        ${hasShp
            ? `<td style="padding:8px 6px;font-size:9pt;color:#000;text-align:center;vertical-align:top;border-bottom:0.5pt solid #535353">${item.shipping ? fmtNum(item.shipping, q.currency) : "—"
            }</td>`
            : ""
          }
        <td style="padding:8px 0;font-size:9pt;color:#000;text-align:right;vertical-align:top;border-bottom:0.5pt solid #535353">${fmtNum(
            sv,
            q.currency,
          )}</td>
      </tr>`;
      })
      .join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${filename}</title>
  <link href="https://fonts.googleapis.com/css2?family=Barlow:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Barlow',sans-serif;background:#fff;color:#000;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    @page{size:A4;margin:0}
    @media print{html,body{width:210mm}body{margin:0;padding:0}}
    .doc{width:210mm;margin:0 auto;background:#fff}
    .hdr{background:#f5f5f5;padding:20px 32px 18px;display:table;width:100%;table-layout:fixed}
    .hdr-l{display:table-cell;vertical-align:top}
    .hdr-r{display:table-cell;vertical-align:top;text-align:right;white-space:nowrap;padding-left:16px;width:180px}
    .logo-row{display:flex;align-items:flex-start;gap:12px}
    .body{padding:24px 32px 20px}
    .cli-tbl{display:table;width:100%;margin-bottom:20px}
    .cli-l{display:table-cell;vertical-align:top;width:50%}
    .cli-r{display:table-cell;vertical-align:top;width:50%;padding-left:18px;border-left:1pt solid #e0e0e0}
    .badge{display:inline-block;padding:2px 10px;border-radius:20px;font-size:8pt;font-weight:700;letter-spacing:.5px;background:${sc.bg};color:${sc.color};border:1pt solid ${sc.bd}}
    table.items{width:100%;border-collapse:collapse;margin-bottom:14px}
    .ftr{border-top:0.5pt solid #ccc;padding:10px 32px;text-align:center;margin-top:6px}
    .tot-wrap{display:table;margin-left:auto;margin-bottom:20px}
    .tot-row{display:table-row}
    .tot-lbl{display:table-cell;font-size:9pt;color:#535353;padding-right:24px;padding-bottom:1px}
    .tot-val{display:table-cell;font-size:9pt;color:#535353;text-align:right;padding-bottom:1px}
    .tot-final-lbl{display:table-cell;font-size:12pt;font-weight:700;color:#535353;padding-right:16px;padding-top:3px}
    .tot-final-val{display:table-cell;font-size:12pt;font-weight:700;color:#535353;text-align:right;padding-top:3px}
  </style>
</head>
<body>
<div class="doc">
  <div class="hdr">
    <div class="hdr-l">
      <div class="logo-row">
        ${logoHtml}
        <div style="line-height:1.55">
          <div style="font-size:13pt;font-weight:600;color:#000">${iss.name || ""}</div>
          ${iss.title ? `<div style="font-size:9pt;color:#000">${iss.title}</div>` : ""}
          ${iss.website ? `<div style="font-size:9pt;color:#000">${iss.website}</div>` : ""}
          ${iss.phone ? `<div style="font-size:9pt;color:#000">${iss.phone}</div>` : ""}
          ${iss.email ? `<div style="font-size:9pt;color:#000">${iss.email}</div>` : ""}
        </div>
      </div>
    </div>
    <div class="hdr-r">
      <div style="font-size:11pt;font-weight:600;color:#000">Cotización Nro: <strong>${quoteNumberLabel}</strong></div>
      <div style="font-size:8pt;color:#535353;margin-top:5px">Emisión: ${fmtDate(
      q.issueDate,
    )}</div>
      <div style="font-size:8pt;color:${exp ? "#dc2626" : "#535353"}">Válida hasta: ${fmtDate(
      q.validUntil,
    )}${exp ? " ⚠" : ""}</div>
      <div style="margin-top:7px"><span class="badge">${SL[q.status].toUpperCase()}</span></div>
    </div>
  </div>

  <div class="body">
    <div class="cli-tbl">
      <div class="cli-l">
        ${q.client.name ? `<div style="font-size:13pt;font-weight:700;color:#000">${q.client.name}</div>` : ""}
        ${q.client.contact
        ? `<div style="font-size:9pt;color:#000;margin-top:2px">${q.client.contact}</div>`
        : ""
      }
        ${q.client.rut ? `<div style="font-size:9pt;color:#000">RUT: ${q.client.rut}</div>` : ""}
        ${q.client.phone ? `<div style="font-size:9pt;color:#000">Tel: ${q.client.phone}</div>` : ""}
        ${q.client.website ? `<div style="font-size:9pt;color:#000">${q.client.website}</div>` : ""}
      </div>
      ${q.equipment?.enabled && equipmentRows
        ? `<div class="cli-r">
            <div style="font-size:8pt;font-weight:700;color:#535353;text-transform:uppercase;letter-spacing:.8px;margin-bottom:5px">Detalle del equipo</div>
            <table style="border-collapse:collapse"><tbody>${equipmentRows}</tbody></table>
          </div>`
        : `<div class="cli-r" style="border:none"></div>`
      }
    </div>

    <table class="items">
      <thead>
        <tr>
          <th style="padding:0 0 7px 0;text-align:left;font-size:10pt;font-weight:600;color:#000;width:40%">Articulo</th>
          <th style="padding:0 6px 7px;text-align:center;font-size:10pt;font-weight:600;color:#000">Cantidad</th>
          <th style="padding:0 6px 7px;text-align:center;font-size:10pt;font-weight:600;color:#000">Precio Uni.</th>
          ${hasShp
        ? `<th style="padding:0 6px 7px;text-align:center;font-size:10pt;font-weight:600;color:#000">Envío</th>`
        : ""
      }
          <th style="padding:0 0 7px;text-align:right;font-size:10pt;font-weight:600;color:#000">SUBTOTAL</th>
        </tr>
        <tr><td colspan="${hasShp ? 5 : 4}" style="padding:0"><div style="height:0.5pt;background:#535353"></div></td></tr>
      </thead>
      <tbody>${itemRowsHtml}</tbody>
    </table>

    <div class="tot-wrap">
      ${shp > 0
        ? `
      <div class="tot-row"><div class="tot-lbl">Subtotal</div><div class="tot-val">${fmtNum(sub, q.currency)}</div></div>
      <div class="tot-row"><div class="tot-lbl">Envío</div><div class="tot-val">${fmtNum(shp, q.currency)}</div></div>`
        : ""
      }
      <div class="tot-row"><div class="tot-final-lbl">Total:</div><div class="tot-final-val">${fmtNum(
        total,
        q.currency,
      )}</div></div>
    </div>

    ${q.notes
        ? `
    <div style="margin-bottom:18px">
      <div style="font-size:9pt;font-weight:700;color:#535353;text-transform:uppercase;letter-spacing:.8px;margin-bottom:5px">Notas y condiciones</div>
      <div style="height:0.5pt;background:#535353;margin-bottom:7px"></div>
      <div style="font-size:9pt;color:#535353;line-height:1.7;white-space:pre-line">${q.notes}</div>
    </div>`
        : ""
      }

    ${iss.bank || iss.accountNumber
        ? `
    <div style="margin-bottom:14px">
      <div style="font-size:9pt;font-weight:600;color:#535353;text-transform:uppercase;letter-spacing:.8px;margin-bottom:7px">Información de pago</div>
      <div style="font-size:8.5pt;color:#535353;line-height:1.9">
        ${iss.bank ? `<div><span style="font-weight:500">Banco:</span> ${iss.bank}</div>` : ""}
        ${iss.accountName
          ? `<div><span style="font-weight:500">Nombre:</span> ${iss.accountName}</div>`
          : ""
        }
        ${iss.accountNumber
          ? `<div><span style="font-weight:500">Número de cuenta:</span> ${iss.accountNumber}</div>`
          : ""
        }
        ${iss.accountType
          ? `<div><span style="font-weight:500">Tipo de cuenta:</span> ${iss.accountType}</div>`
          : ""
        }
      </div>
    </div>`
        : ""
      }
  </div>

  <div class="ftr">
    <div style="font-size:7.5pt;color:#535353;font-weight:500;line-height:1.8">${iss.name || ""}${iss.title ? ` · ${iss.title}` : ""
      }</div>
    <div style="font-size:7.5pt;color:#535353;line-height:1.8">${iss.email ? `Correo electrónico: ${iss.email}` : ""
      }${iss.email && iss.phone ? "  │  " : ""}${iss.phone ? `Teléfono: ${iss.phone}` : ""
      }</div>
  </div>
</div>
<script>
  window.onload = function() {
    setTimeout(function() {
      document.title = "${filename}";
      window.print();
      setTimeout(function(){ window.close(); }, 1500);
    }, 1200);
  };
</script>
</body>
</html>`;

    const w = window.open("", "_blank");
    if (!w) {
      resolve(false);
      return;
    }

    w.document.open();
    w.document.write(html);
    w.document.close();
    resolve(true);
  });
}
