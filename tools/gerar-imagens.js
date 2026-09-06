#!/usr/bin/env node
/* Gera as imagens do README a partir do PRÓPRIO card, headless.
 *
 * Por que assim, e não com print de tela: a imagem passa a ser saída do
 * código, não uma foto dele. Mexeu numa escala? `node tools/gerar-imagens.js`
 * e o README já conta a verdade nova. Print envelhece calado — e a regra 140
 * diz que número de doc não pode ser inventado nem velho.
 *
 * SVG porque o gradiente do card É um linear-gradient CSS: dá para reproduzir
 * fielmente, fica nítido em qualquer zoom, pesa poucos KB e o GitHub renderiza.
 *
 * Uso:  node tools/gerar-imagens.js   →  docs/img/*.svg
 */
"use strict";
const fs = require("fs");
const path = require("path");

/* ---- dublê de DOM, o mesmo do probe ---- */
const mkStyle = () => { const s = {}; s.setProperty = (k, v) => { s[k] = v; }; return s; };
const stub = {
  style: mkStyle(), dataset: {}, classList: { add() {}, remove() {}, toggle() {} },
  addEventListener() {}, appendChild() {}, querySelector() { return stub; },
  querySelectorAll() { return []; }, dispatchEvent() {}, setAttribute() {}, remove() {},
};
global.HTMLElement = class {
  constructor() { this.style = mkStyle(); this.dataset = {}; }
  attachShadow() { this.shadowRoot = { innerHTML: "", querySelector: () => stub, querySelectorAll: () => [] }; return this.shadowRoot; }
  addEventListener() {} dispatchEvent() {} appendChild() {} remove() {}
};
global.document = { createElement: () => ({ ...stub, style: mkStyle(), dataset: {} }) };
const reg = {};
global.customElements = { define: (n, c) => { reg[n] = c; }, get: (n) => reg[n] };
global.window = {};
global.CustomEvent = class { constructor(t, d) { this.type = t; Object.assign(this, d); } };
console.info = () => {};
eval(fs.readFileSync(path.join(__dirname, "..", "dist", "mw-rainbow-card.js"), "utf8"));

/* ---- a casa medida em 2026-09-06 ---- */
const S = (state, attrs) => ({ state: String(state), attributes: attrs || {} });
const states = {}, entities = {}, devices = {};
const dev = (id, nome, sensores) => {
  devices[id] = { name: nome };
  Object.entries(sensores).forEach(([eid, st]) => { states[eid] = st; entities[eid] = { device_id: id }; });
};
const AMB = [
  ["Sala", 23.4, 58, 92, 110.7, 223.9, 0.27, 158.2, 10, 368, 0.1, 0.02, 5],
  ["Cozinha", 27.1, 51, 74, 8.2, 221.4, 0.04, 42.6, 96, 812, 0.35, 0.06, 14],
  ["Escritório", 30.8, 44, 38, 0, 219.6, 0, 3.1, 180, 1310, 0.72, 0.11, 41],
  ["Suíte", 21.2, 66, 12, 474, 216.0, 1.884, 5767, 0, 640, 0.18, 0.03, 8],
];
AMB.forEach(([nome, t, h, b, w, v, a, kwh, lx, co2, voc, hcho, pm], i) => {
  const k = `dev${i}`, p = `sensor.${nome.toLowerCase().replace(/[^a-z]/g, "")}`;
  dev(k, nome, {
    [`${p}_temperatura`]: S(t, { device_class: "temperature", unit_of_measurement: "°C" }),
    [`${p}_umidade`]: S(h, { device_class: "humidity", unit_of_measurement: "%" }),
    [`${p}_bateria`]: S(b, { device_class: "battery", unit_of_measurement: "%" }),
    [`${p}_potencia`]: S(w, { device_class: "power", unit_of_measurement: "W" }),
    [`${p}_tensao`]: S(v, { device_class: "voltage", unit_of_measurement: "V" }),
    [`${p}_corrente`]: S(a, { device_class: "current", unit_of_measurement: "A" }),
    [`${p}_consumo`]: S(kwh, { device_class: "energy", unit_of_measurement: "kWh" }),
    [`${p}_iluminancia`]: S(lx, { device_class: "illuminance", unit_of_measurement: "lx" }),
    [`${p}_dioxido_de_carbono`]: S(co2, { device_class: "carbon_dioxide", unit_of_measurement: "ppm" }),
    [`${p}_vocs`]: S(voc, { unit_of_measurement: "ppm" }),
    [`${p}_formaldeido`]: S(hcho, { unit_of_measurement: "mg/m³" }),
    [`${p}_pm25`]: S(pm, {}),
  });
});
// A faixa que comanda: luzes com brilho e cor de verdade.
const LUZES = [
  ["light.mesa", "on", { brightness: 128, supported_color_modes: ["brightness"] }],
  ["light.sala", "on", { brightness: 230, rgb_color: [255, 70, 40], supported_color_modes: ["rgb"] }],
  ["light.suite", "on", { brightness: 90, color_temp_kelvin: 2200, supported_color_modes: ["color_temp"] }],
  ["light.varanda", "off", { supported_color_modes: ["brightness"] }],
];
LUZES.forEach(([id, st, at], i) => {
  states[id] = S(st, { ...at, friendly_name: AMB[i][0] });
  entities[id] = { device_id: `luz${i}` };
  devices[`luz${i}`] = { name: AMB[i][0] };
});

const hass = { states, entities, devices, areas: {}, locale: { language: "pt-BR" }, callService() {} };

/* ---- lê o que o card REALMENTE produziu ---- */
const lerCard = (cfg) => {
  const el = new reg["mw-rainbow-card"]();
  el.setConfig(cfg);
  el.hass = hass;
  const html = el.shadowRoot.innerHTML;
  const tiras = [];
  const re = /class="strip" style="background-image:([^"]+)"/g;
  let m;
  while ((m = re.exec(html))) tiras.push(m[1]);
  const textos = [];
  // A célula de controle é `class="cell ctl arr"` e a marcação dela quebra
  // linha (o <i> do véu vem antes do texto) — o casador precisa dos dois.
  const reC = /class="cell[^"]*"[\s\S]*?>([\s\S]*?)<\/div>/g;
  let c;
  while ((c = reC.exec(html))) {
    const lbl = /class="lbl">([^<]*)</.exec(c[1]);
    const val = /class="val">([^<]*)/.exec(c[1]);
    const un = /class="u">([^<]*)</.exec(c[1]);
    // O véu do nível, quando a faixa comanda: é ele que faz a célula ser o
    // próprio cursor, então a imagem tem de mostrá-lo.
    const veu = /class="veu" style="transform:scale[XY]\(([\d.]+)\)/.exec(c[1]);
    textos.push({ lbl: lbl ? lbl[1] : "", val: val ? val[1] : "", un: un ? un[1] : "",
      veu: veu ? Number(veu[1]) : null });
  }
  return { tiras, textos, cfg };
};

/* ---- CSS linear-gradient -> <linearGradient> do SVG ---- */
const paradas = (grad) => {
  const corpo = grad.slice(grad.indexOf("(") + 1, grad.lastIndexOf(")"));
  return corpo.split(/,(?![^(]*\))/).slice(1).map((p) => {
    const t = p.trim();
    const i = t.lastIndexOf(" ");
    const cor = t.slice(0, i).trim();
    const pos = t.slice(i + 1).trim();
    const rgba = /rgba?\(([^)]+)\)/.exec(cor);
    const n = rgba ? rgba[1].split(",").map((x) => x.trim()) : ["0", "0", "0", "1"];
    return { cor: `rgb(${n[0]}, ${n[1]}, ${n[2]})`, alfa: n[3] === undefined ? "1" : n[3], pos };
  });
};

const esc = (s) => String(s).replace(/[&<>]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[ch]));

const svg = (titulo, cards, largura = 900) => {
  const M = 16, ALT_TIRA = 34, GAP = 4, TIT = 26, ESP = 22;
  let y = M, defs = "", corpo = "", g = 0;
  cards.forEach(({ nome, dados }) => {
    corpo += `<text x="${M}" y="${y + 14}" class="t">${esc(nome)}</text>`;
    y += TIT;
    const nSec = dados.cfg.sections.length;
    dados.tiras.forEach((grad, bi) => {
      const id = `g${g++}`;
      defs += `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0">${
        paradas(grad).map((p) => `<stop offset="${p.pos}" stop-color="${p.cor}" stop-opacity="${p.alfa}"/>`).join("")
      }</linearGradient>`;
      corpo += `<rect x="${M}" y="${y}" width="${largura - 2 * M}" height="${ALT_TIRA}" rx="8" fill="url(#${id})"/>`;
      const w = (largura - 2 * M) / nSec;
      for (let i = 0; i < nSec; i += 1) {
        const cel = dados.textos[bi * nSec + i] || {};
        const cx = M + w * i + w / 2;
        if (cel.veu !== null && cel.veu !== undefined && cel.veu > 0) {
          const lw = w * cel.veu;
          corpo += `<rect x="${(M + w * i + w - lw).toFixed(2)}" y="${y}" width="${lw.toFixed(2)}" height="${ALT_TIRA}" fill="rgba(0,0,0,0.55)"/>`;
        }
        if (cel.lbl) corpo += `<text x="${cx}" y="${y + 14}" class="l">${esc(cel.lbl)}</text>`;
        // O card separa valor e unidade por CSS; aqui é texto puro, então o
        // espaço tem de ser explícito — e "%" cola, como na tela.
        if (cel.val) {
          const un = cel.un ? (cel.un === "%" ? cel.un : ` ${cel.un}`) : "";
          corpo += `<text x="${cx}" y="${y + (cel.lbl ? 27 : 22)}" class="v">${esc(cel.val)}${esc(un)}</text>`;
        }
      }
      y += ALT_TIRA + GAP;
    });
    y += ESP;
  });
  const alt = y - ESP + M;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${alt}" viewBox="0 0 ${largura} ${alt}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">
<title>${esc(titulo)}</title>
<defs>${defs}</defs>
<style>
  .t{font-size:12px;font-weight:600;fill:#8a8a8a;letter-spacing:.04em}
  .l{font-size:9px;fill:#fff;text-anchor:middle;opacity:.92}
  .v{font-size:12px;font-weight:600;fill:#fff;text-anchor:middle}
</style>
<rect width="100%" height="100%" fill="none"/>
${corpo}
</svg>`;
};

const secs = AMB.map((_, i) => ({ device: `dev${i}` }));
const cfg = (bands, extra) => Object.assign({
  sections: secs, bands, section_labels: "first", band_height: 34, blend: true,
}, extra || {});

const SAIDA = path.join(__dirname, "..", "docs", "img");
fs.mkdirSync(SAIDA, { recursive: true });

const arquivos = [
  ["arco-iris-clima.svg", "Clima — a escala canônica da casa (regra 40)", [
    { nome: "TEMPERATURA E UMIDADE", dados: lerCard(cfg([{ metric: "temperature" }, { metric: "humidity" }])) },
  ]],
  ["arco-iris-ar.svg", "Qualidade do ar — regra 90", [
    { nome: "CO₂ · TVOC · FORMALDEÍDO · PM2.5", dados: lerCard(cfg([
      { metric: "co2" }, { metric: "tvoc" }, { metric: "hcho" }, { metric: "pm25" }])) },
  ]],
  ["arco-iris-eletrico.svg", "Elétrico — regra 180 (PRODIST para tensão)", [
    { nome: "POTÊNCIA · TENSÃO · CORRENTE · CONSUMO", dados: lerCard(cfg([
      { metric: "power" }, { metric: "voltage" }, { metric: "current" }, { metric: "energy" }])) },
  ]],
  ["arco-iris-nivel.svg", "Nível — iluminância e bateria", [
    { nome: "ILUMINÂNCIA · BATERIA (RÉGUA FINA) · BATERIA (RÉGUA CANÔNICA)", dados: lerCard(cfg([
      { metric: "illuminance" }, { metric: "battery", scale: "fina" }, { metric: "battery", scale: "canonica" }])) },
  ]],
  ["arco-iris-controle.svg", "A faixa que comanda", [
    { nome: "TOQUE LIGA · ARRASTAR AJUSTA · A COR É A DA PRÓPRIA LUZ", dados: lerCard({
      sections: LUZES.map(([id]) => ({ entities: { control: id } })),
      bands: [{ metric: "control" }], section_labels: "all", band_height: 46, blend: false }) },
  ]],
  ["arco-iris-completo.svg", "A casa inteira numa tira só", [
    { nome: "QUATRO AMBIENTES × DEZ GRANDEZAS", dados: lerCard(cfg([
      { metric: "temperature" }, { metric: "humidity" }, { metric: "co2" }, { metric: "tvoc" },
      { metric: "pm25" }, { metric: "illuminance" }, { metric: "power" }, { metric: "voltage" },
      { metric: "energy" }, { metric: "battery" }], { band_height: 26 })) },
  ]],
];

arquivos.forEach(([nome, titulo, cards]) => {
  fs.writeFileSync(path.join(SAIDA, nome), svg(titulo, cards));
  console.log(`  ${nome}`);
});
console.log(`\n${arquivos.length} imagens em docs/img/ — geradas do próprio card.`);
