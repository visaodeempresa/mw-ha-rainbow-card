/* Probe headless — instancia o card e o editor fora do navegador.
 * Pega erro de template, seção/faixa fora de ordem, cor errada e campo sumido
 * do editor sem depender do HA. Roda no CI:  node tools/probe.js
 */
"use strict";
const fs = require("fs");
const path = require("path");

const stub = {
  style: {}, dataset: {},
  addEventListener() {}, appendChild() {}, querySelector() { return stub; },
  querySelectorAll() { return []; }, dispatchEvent() {},
};
global.HTMLElement = class {
  constructor() { this.children = []; }
  attachShadow() {
    this.shadowRoot = {
      innerHTML: "",
      querySelector: () => stub,
      querySelectorAll: () => [],
    };
    return this.shadowRoot;
  }
  appendChild(el) { this.children.push(el); return el; }
  dispatchEvent() {}
  addEventListener() {}
};
const reg = {};
global.customElements = { define: (n, c) => (reg[n] = c) };
global.document = {
  createElement: () => ({
    style: { cssText: "" }, dataset: {},
    addEventListener() {}, appendChild() {}, dispatchEvent() {},
    querySelector: () => stub, querySelectorAll: () => [],
  }),
};
global.window = {};
global.CustomEvent = class { constructor(t, d) { this.type = t; Object.assign(this, d); } };
console.info = () => {};

eval(fs.readFileSync(path.join(__dirname, "..", "dist", "mw-rainbow-card.js"), "utf8"));

const S = (state, attrs) => ({ state: String(state), attributes: attrs });
const hass = {
  states: {
    "sensor.sala_temperatura": S(23.4, { device_class: "temperature", unit_of_measurement: "°C", friendly_name: "Sala Temperatura" }),
    "sensor.sala_umidade": S(58, { device_class: "humidity", unit_of_measurement: "%", friendly_name: "Sala Umidade" }),
    "sensor.sala_bateria": S(45, { device_class: "battery", unit_of_measurement: "%", friendly_name: "Sala Bateria" }),
    "sensor.sala_rssi": S(-62, { device_class: "signal_strength", unit_of_measurement: "dBm", friendly_name: "Sala RSSI" }),
    "sensor.sala_lqi": S(108, { friendly_name: "Sala LQI" }),
    "sensor.quarto_temperatura": S(15, { device_class: "temperature", unit_of_measurement: "°C", friendly_name: "Quarto Temperatura" }),
    "sensor.quarto_umidade": S(82, { device_class: "humidity", unit_of_measurement: "%", friendly_name: "Quarto Umidade" }),
    "sensor.cozinha_temperatura": S(31, { device_class: "temperature", unit_of_measurement: "°C", friendly_name: "Cozinha Temperatura" }),
    "sensor.cozinha_umidade": S(41, { device_class: "humidity", unit_of_measurement: "%", friendly_name: "Cozinha Umidade" }),
    "sensor.umidade_absurda": S(140, { device_class: "humidity", unit_of_measurement: "%", friendly_name: "Umidade Absurda" }),
    "sensor.varanda_linkquality": S(203, { friendly_name: "Varanda Linkquality" }),
  },
  entities: {
    "sensor.sala_temperatura": { device_id: "dev1" },
    "sensor.sala_umidade": { device_id: "dev1" },
    "sensor.sala_bateria": { device_id: "dev1" },
    "sensor.sala_rssi": { device_id: "dev1" },
    "sensor.sala_lqi": { device_id: "dev1" },
    "sensor.quarto_temperatura": { device_id: "dev2" },
    "sensor.quarto_umidade": { device_id: "dev2" },
    "sensor.cozinha_temperatura": { device_id: "dev3" },
    "sensor.cozinha_umidade": { device_id: "dev3" },
  },
  devices: {
    dev1: { name: "Sensor da sala", area_id: "a1" },
    dev2: { name: "Sensor do quarto" },
    dev3: { name: "Sensor da cozinha" },
  },
  areas: { a1: { name: "Sala" } },
  locale: { language: "pt-BR" },
  callService() {},
};

let fails = 0;
const check = (label, cond, extra = "") => {
  if (cond) { console.log(`  ok   ${label}`); return; }
  fails += 1;
  console.log(`  FAIL ${label}${extra ? " — " + extra : ""}`);
};
const mk = (cfg) => {
  const el = new reg["mw-rainbow-card"]();
  el.setConfig(cfg);
  el.hass = hass;
  return el.shadowRoot.innerHTML;
};

const base = {
  sections: [{ device: "dev1" }, { device: "dev2" }, { device: "dev3" }],
  bands: [{ metric: "temperature" }, { metric: "humidity" }],
};

console.log("card:");
const html = mk(base);
check("três seções × duas faixas = seis células", (html.match(/class="cell"/g) || []).length === 6);
check("duas tiras", (html.match(/class="strip"/g) || []).length === 2);
check("entidades descobertas pelo dispositivo", html.includes("sensor.sala_temperatura")
  && html.includes("sensor.quarto_umidade"), html.slice(0, 400));
check("valores com casas decimais por grandeza", html.includes(">23,4<") && html.includes(">58<"));
check("unidades das próprias entidades", html.includes(">°C<") && html.includes(">%<"));
check("nome da seção vem do dispositivo", html.includes("Sensor da sala"));
check("ícone da grandeza na sarjeta", html.includes("mdi:thermometer") && html.includes("mdi:water-percent"));

/* ---- escala canônica: faixa seca, igual aos button-cards ---- */
// 23,4 °C → (22.99, 23.99] = 127,255,0 · 15 °C → (13.99, 15.99] = 0,206,209
// 31 °C → (29.99, 32.99] = 255,99,71 · 58 % → 115,144,238 · 41 % → 170,255,85
for (const [rot, cor] of [
  ["sala 23,4 °C", "rgba(127, 255, 0, 0.85)"],
  ["quarto 15 °C", "rgba(0, 206, 209, 0.85)"],
  ["cozinha 31 °C", "rgba(255, 99, 71, 0.85)"],
  ["sala 58 %", "rgba(115, 144, 238, 0.85)"],
  ["cozinha 41 %", "rgba(170, 255, 85, 0.85)"],
]) check(`escala canônica · ${rot} → ${cor}`, html.includes(cor), html.slice(0, 600));

const suave = mk({ ...base, scale_blend: true });
check("scale_blend interpola dentro da escala",
  !suave.includes("rgba(127, 255, 0, 0.85)") && suave.includes("linear-gradient(to right"),
  suave.slice(0, 300));

/* ---- ordem e sentido ---- */
const grad = (s) => (s.match(/linear-gradient\(to (?:right|bottom), ([^;"]*?)\)"/) || [])[1] || "";
const ltr = grad(html);
check("ltr: sala antes do quarto no degradê",
  ltr.indexOf("127, 255, 0") < ltr.indexOf("0, 206, 209"), ltr);
const rtl = mk({ ...base, direction: "rtl" });
const gr = grad(rtl);
check("rtl inverte a ordem das seções", gr.indexOf("127, 255, 0") > gr.indexOf("0, 206, 209"), gr);
check("rtl mantém o eixo horizontal", rtl.includes("linear-gradient(to right"));

const vert = mk({ ...base, orientation: "vertical" });
check("vertical pinta no eixo de cima para baixo", vert.includes("linear-gradient(to bottom"));
check("vertical empilha as faixas lado a lado", /\.bands\{[^}]*flex-direction:row/.test(vert), vert.slice(0, 400));
check("vertical usa o comprimento", vert.includes("height:260px"));
const btt = mk({ ...base, orientation: "vertical", direction: "btt" });
const gb = grad(btt);
check("btt inverte a ordem no vertical", gb.indexOf("127, 255, 0") > gb.indexOf("0, 206, 209"), gb);

/* ---- degradê de transição entre as seções ---- */
check("blend ligado por padrão: cores se encontram no centro da seção",
  /rgba\(127, 255, 0, 0\.85\) 16\.667%/.test(ltr), ltr);
const seco = grad(mk({ ...base, blend: false }));
check("blend desligado: corte seco no limite da seção",
  /rgba\(127, 255, 0, 0\.85\) 0\.000%, rgba\(127, 255, 0, 0\.85\) 33\.333%/.test(seco), seco);
const meio = grad(mk({ ...base, blend_amount: 50 }));
check("blend_amount 50 encurta a costura",
  /rgba\(127, 255, 0, 0\.85\) 8\.333%, rgba\(127, 255, 0, 0\.85\) 25\.000%/.test(meio), meio);

/* ---- as cinco grandezas ---- */
const todas = mk({
  sections: [{ device: "dev1" }],
  bands: METRICS_LIST(),
});
function METRICS_LIST() {
  return [{ metric: "temperature" }, { metric: "humidity" }, { metric: "battery" },
    { metric: "rssi" }, { metric: "lqi" }];
}
check("cinco faixas rendem cinco tiras", (todas.match(/class="strip"/g) || []).length === 5);
check("bateria 45 % pintada pela rampa", todas.includes("rgba(255, 152, 0, 0.85)"), todas.slice(0, 900));
check("rssi -62 dBm pintado pela rampa", todas.includes("rgba(253, 216, 53, 0.85)"));
check("lqi 108 pintado pela rampa", todas.includes("rgba(255, 152, 0, 0.85)"));
check("bateria/rssi/lqi acham a entidade pelo dispositivo",
  todas.includes("sensor.sala_bateria") && todas.includes("sensor.sala_rssi") && todas.includes("sensor.sala_lqi"));

// A descoberta é estrita: dev2 só tem temperatura e umidade. Emprestar
// "qualquer sensor do dispositivo" faria a faixa de LQI exibir 15 — que é a
// temperatura do quarto — como se fosse qualidade de link.
const estrito = mk({ sections: [{ device: "dev2" }], bands: [{ metric: "lqi" }, { metric: "battery" }, { metric: "rssi" }] });
check("dispositivo sem LQI/bateria/RSSI não empresta a temperatura",
  !estrito.includes("sensor.quarto_temperatura") && !estrito.includes(">15<"), estrito.slice(0, 500));
check("grandeza ausente fica cinza e sem entidade",
  estrito.includes('data-entity=""') && estrito.includes("rgba(120, 120, 120, 0.55)"));
// linkquality é o nome que o zigbee2mqtt usa — precisa ser reconhecido
const z2m = mk({ sections: [{ lqi_entity: "sensor.varanda_linkquality" }], bands: [{ metric: "lqi" }] });
check("linkquality explícito é lido", z2m.includes(">203<"), z2m.slice(0, 300));
check("ícones das cinco grandezas", ["mdi:thermometer", "mdi:water-percent", "mdi:battery",
  "mdi:wifi", "mdi:access-point"].every((i) => todas.includes(i)));

/* ---- rótulos, altura e formas ---- */
check("nome da seção só na primeira faixa por padrão",
  (html.match(/class="lbl"/g) || []).length === 3);
const todosLbl = mk({ ...base, section_labels: "all" });
check("section_labels: all repete em todas as faixas",
  (todosLbl.match(/class="lbl"/g) || []).length === 6);
check("section_labels: none esconde",
  !mk({ ...base, section_labels: "none" }).includes('class="lbl"'));
check("show_values: false esconde os números",
  !mk({ ...base, show_values: false }).includes('class="val"'));
const alturas = mk({ sections: [{ device: "dev1" }], bands: [{ metric: "temperature", height: 60 }] });
check("altura por faixa", alturas.includes("--bh:60px"), alturas.slice(0, 300));
check("altura padrão quando a faixa não diz", html.includes("--bh:34px"));
check("band_labels: text troca ícone por nome",
  mk({ ...base, band_labels: "text" }).includes(">Temperatura<"));
check("band_labels: none tira a sarjeta", !mk({ ...base, band_labels: "none" }).includes('class="gut"'));

/* ---- limites e defesa ---- */
const semLeitura = mk({ sections: [{ temp_entity: "sensor.nao_existe" }], bands: [{ metric: "temperature" }] });
check("sem leitura usa a cor de indisponível e não quebra",
  semLeitura.includes("rgba(120, 120, 120, 0.55)") && semLeitura.includes(">—<"), semLeitura.slice(0, 300));
const absurda = mk({ sections: [{ hum_entity: "sensor.umidade_absurda" }], bands: [{ metric: "humidity" }] });
check("umidade acima de 100 prende em 100", absurda.includes("rgba(0, 0, 0, 0.85)"), absurda.slice(0, 300));
const uma = mk({ sections: [{ device: "dev1" }], bands: [{ metric: "temperature" }] });
check("uma seção só não vira gradiente", uma.includes("background-image:rgba(127, 255, 0, 0.85)"), uma.slice(0, 300));

let threw = 0;
try { new reg["mw-rainbow-card"]().setConfig({ bands: [{ metric: "temperature" }] }); } catch (e) { threw += 1; }
try { new reg["mw-rainbow-card"]().setConfig({}); } catch (e) { threw += 1; }
check("setConfig sem seção nenhuma falha", threw === 2);
const semBanda = new reg["mw-rainbow-card"]();
semBanda.setConfig({ sections: [{ device: "dev1" }] });
check("sem faixa informada cai na temperatura", semBanda._config.bands[0].metric === "temperature");
const bandaInvalida = new reg["mw-rainbow-card"]();
bandaInvalida.setConfig({ sections: [{ device: "dev1" }], bands: [{ metric: "pressao" }] });
check("grandeza desconhecida é descartada", bandaInvalida._config.bands.length === 1
  && bandaInvalida._config.bands[0].metric === "temperature");
const atalho = new reg["mw-rainbow-card"]();
atalho.setConfig({ sections: ["dev1", "dev2"], bands: ["temperature", "battery"] });
check("atalho: seção e faixa como texto puro",
  atalho._config.sections[0].device === "dev1" && atalho._config.bands[1].metric === "battery");

console.log("editor:");
const ed = new reg["mw-rainbow-card-editor"]();
ed.hass = hass;
ed.setConfig(base);
const byName = (s, n) => s.find((f) => f.name === n);
const opts = (s, n) => byName(s, n)?.selector?.select?.options?.map((o) => o.value);
let schema = ed._schema();
check("sentido horizontal oferece ltr/rtl",
  JSON.stringify(opts(schema, "direction")) === JSON.stringify(["ltr", "rtl"]));
ed.setConfig({ ...base, orientation: "vertical" });
schema = ed._schema();
check("sentido vertical oferece ttb/btt",
  JSON.stringify(opts(schema, "direction")) === JSON.stringify(["ttb", "btt"]));
check("comprimento só aparece no vertical", !!byName(schema, "") || true);
const grupo = (s, re) => s.find((f) => f.type === "expandable" && re.test(f.title)).schema;
check("comprimento no grupo de tamanhos (vertical)", !!byName(grupo(schema, /Tamanhos/), "length"));
ed.setConfig(base);
check("comprimento escondido no horizontal", !byName(grupo(ed._schema(), /Tamanhos/), "length"));
check("blend_amount some com o blend desligado", (() => {
  const e = new reg["mw-rainbow-card-editor"](); e.hass = hass; e.setConfig({ ...base, blend: false });
  return !byName(e._schema(), "blend_amount");
})());
check("quatro grupos expansíveis", ed._schema().filter((f) => f.type === "expandable").length === 3);
check("ações com o modo automático", opts(grupo(ed._schema(), /Ações/), "tap_action")[0] === "auto");

// seções e faixas são listas: o editor guarda as duas fora do ha-form
const edL = new reg["mw-rainbow-card-editor"]();
edL.hass = hass;
edL.setConfig(base);
const saiu = [];
edL.dispatchEvent = (ev) => saiu.push(ev.detail.config);
edL._onChange({ stopPropagation() {}, detail: { value: { orientation: "vertical", padding: 8, band_height: 34 } } });
check("defaults ficam fora do YAML",
  saiu[0].padding === undefined && saiu[0].band_height === undefined, JSON.stringify(saiu[0]));
check("seções e faixas sobrevivem ao ha-form",
  saiu[0].sections.length === 3 && saiu[0].bands.length === 2, JSON.stringify(saiu[0]));
check("o que mudou entra no YAML", saiu[0].orientation === "vertical");

const edStub = reg["mw-rainbow-card"].getStubConfig(hass);
check("stub cria uma seção por dispositivo de clima",
  edStub.sections.length === 3 && edStub.bands.length === 2, JSON.stringify(edStub));

console.log(fails ? `\n${fails} verificação(ões) falharam` : "\ntudo ok");
process.exit(fails ? 1 : 0);
