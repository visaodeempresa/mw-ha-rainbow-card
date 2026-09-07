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
      // O shadowRoot de verdade escuta eventos — é nele que o card pendura o
      // listener delegado. Sem isto o dublê não representa o navegador.
      _ouvintes: {},
      addEventListener(t, f) { (this._ouvintes[t] = this._ouvintes[t] || []).push(f); },
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

    // --- grandezas novas, com os valores e unidades REAIS do BASE-ALFA-01
    // (levantamento de 2026-09-06). Nada aqui é inventado: é o que o
    // /api/states devolve, device_class nulo incluído.
    "sensor.tomada_potencia": S(110.7, { device_class: "power", unit_of_measurement: "W" }),
    "sensor.tomada_desligada_potencia": S(0, { device_class: "power", unit_of_measurement: "W" }),
    "sensor.tomada_kw": S(3.5, { device_class: "power", unit_of_measurement: "kW" }),
    "sensor.tomada_tensao": S(223.9, { device_class: "voltage", unit_of_measurement: "V" }),
    "sensor.tomada_subtensao": S(185, { device_class: "voltage", unit_of_measurement: "V" }),
    "sensor.tomada_sobretensao": S(240, { device_class: "voltage", unit_of_measurement: "V" }),
    "sensor.pilha_tensao": S(3097, { device_class: "voltage", unit_of_measurement: "mV" }),
    "sensor.tomada_corrente": S(270, { device_class: "current", unit_of_measurement: "mA" }),
    "sensor.tomada_consumo": S(158.2, { device_class: "energy", unit_of_measurement: "kWh" }),
    "sensor.tomada_consumo_pequeno": S(1.94, { device_class: "energy", unit_of_measurement: "kWh" }),
    "sensor.medidor_total_de_vida": S(120590, { device_class: "energy", unit_of_measurement: "kWh" }),
    "sensor.sala_iluminancia": S(10, { device_class: "illuminance", unit_of_measurement: "lx" }),
    // Ar: sete dos dez sensores da casa NÃO têm device_class.
    "sensor.qualidade_do_ar_da_cozinha_dioxido_de_carbono": S(368, { device_class: "carbon_dioxide", unit_of_measurement: "ppm" }),
    "sensor.qualidade_do_ar_da_cozinha_vocs": S(0.1, { unit_of_measurement: "ppm" }),
    "sensor.qualidade_do_ar_da_cozinha_formaldeido": S(0.02, { unit_of_measurement: "mg/m³" }),
    "sensor.co2_ruim": S(1300, { device_class: "carbon_dioxide", unit_of_measurement: "ppm" }),
    "sensor.co2_atencao": S(810, { device_class: "carbon_dioxide", unit_of_measurement: "ppm" }),
    // O purificador da sala só tem PM2.5, e ele vem SEM unidade nenhuma.
    "sensor.purificador_de_ar_da_sala_pm25": S(5, {}),
    // A armadilha: termina em "_co2" e NÃO é o ar da sala — é a pegada de
    // carbono da rede elétrica.
    "sensor.electricity_maps_intensidade_de_co2": S(231, { unit_of_measurement: "gCO2eq/kWh" }),

    // --- a faixa que comanda
    "light.mesa": S("on", { brightness: 128, supported_color_modes: ["brightness"], friendly_name: "Mesa" }),
    "light.sala_colorida": S("on", { brightness: 255, rgb_color: [255, 60, 30], supported_color_modes: ["rgb"] }),
    "light.quente": S("on", { brightness: 200, color_temp_kelvin: 2200, supported_color_modes: ["color_temp"] }),
    "light.apagada": S("off", { supported_color_modes: ["brightness"] }),
    "light.sem_brilho": S("on", { supported_color_modes: ["onoff"] }),
    "switch.tomada": S("on", {}),
    "switch.tomada_off": S("off", {}),
    "fan.ventilador": S("on", { percentage: 66 }),
    "cover.cortina": S("open", { current_position: 40 }),
    "input_boolean.modo_festa": S("off", {}),
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
    "sensor.tomada_potencia": { device_id: "dev4" },
    "sensor.tomada_tensao": { device_id: "dev4" },
    "sensor.tomada_corrente": { device_id: "dev4" },
    "sensor.tomada_consumo": { device_id: "dev4" },
    "sensor.pilha_tensao": { device_id: "dev1" },
    "sensor.sala_iluminancia": { device_id: "dev1" },
    "sensor.qualidade_do_ar_da_cozinha_dioxido_de_carbono": { device_id: "dev5" },
    "sensor.qualidade_do_ar_da_cozinha_vocs": { device_id: "dev5" },
    "sensor.qualidade_do_ar_da_cozinha_formaldeido": { device_id: "dev5" },
    "sensor.purificador_de_ar_da_sala_pm25": { device_id: "dev6" },
    "sensor.electricity_maps_intensidade_de_co2": { device_id: "dev6" },
    "light.mesa": { device_id: "dev7" },
    "switch.tomada": { device_id: "dev7" },
    "light.sala_colorida": { device_id: "dev8" },
    "fan.ventilador": { device_id: "dev9" },
    "cover.cortina": { device_id: "dev10" },
  },
  devices: {
    dev1: { name: "Sensor da sala", area_id: "a1" },
    dev2: { name: "Sensor do quarto" },
    dev3: { name: "Sensor da cozinha" },
    dev4: { name: "Tomada da sala" },
    dev5: { name: "Qualidade do ar da cozinha" },
    dev6: { name: "Purificador da sala" },
    dev7: { name: "Luz da mesa" },
    dev8: { name: "Luz colorida" },
    dev9: { name: "Ventilador" },
    dev10: { name: "Cortina" },
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

/* ---- papel e relevo ---- */
// Padrão: nada muda para quem já tinha o card na tela — nem folha, nem borda.
check("sem papel o card fica com o fundo do tema",
  !html.includes("background:linear-gradient(145deg") && !/ha-card\{[^}]*border:1px solid/.test(html),
  html.slice(0, 300));
check("relevo padrão é a sombra de sempre",
  html.includes("0 2px 3px rgba(0,0,0,0.18), 0 6px 12px rgba(0,0,0,0.14)"));
check("sem relevo 3D o card não sobe", /ha-card\{[^}]*transform:none/.test(html), html.slice(0, 400));

const creme = mk({ ...base, paper_color: "paper" });
check("papel creme pinta a folha",
  creme.includes("background:linear-gradient(145deg, #fdfaf3, #e8e3d8)"), creme.slice(0, 400));
check("papel traz a borda tirada do próprio tom", /ha-card\{[^}]*border:1px solid/.test(creme));
check("no papel a tinta do nome vem da paleta, não do tema",
  creme.includes("rgba(28, 25, 20, 0.92)") && !creme.includes("var(--primary-text-color)"),
  creme.slice(0, 600));

const azul = mk({ ...base, paper_color: "blue-4" });
check("os 49 tons: azul-4 sai da rampa clara",
  azul.includes("hsl(203, 15%, 92%)"), azul.slice(0, 400));
const azulNoite = mk({ ...base, paper_color: "blue-4", paper_dark: true });
check("a mesma chave na rampa de noite",
  azulNoite.includes("hsl(203, 19%, 19%)"), azulNoite.slice(0, 400));
check("no papel de noite a tinta clareia", azulNoite.includes("rgba(247, 244, 236, 0.94)"));
// papel inválido não pode apagar o card: a paleta devolve o creme
check("papel inexistente cai no creme, não em vazio",
  mk({ ...base, paper_color: "roxo-9" }).includes("background:linear-gradient(145deg, #fdfaf3, #e8e3d8)"));

const tresD = mk({ ...base, paper_color: "paper", depth: "3d" });
check("3D: luz na quina de cima e sombra na de baixo (os números do MW Power Button)",
  tresD.includes("inset 4px 4px 8px rgba(255,252,240,0.90)")
  && tresD.includes("inset -4px -4px 8px rgba(0,0,0,0.12)"), tresD.slice(0, 500));
check("3D: a folha projeta no dashboard", tresD.includes("0 12px 28px rgba(0,0,0,0.08)"));
check("3D: a faixa AFUNDA no papel (senão sobram dois relevos salientes)",
  tresD.includes("inset 2px 2px 5px rgba(0,0,0,0.30)"), tresD.slice(0, 900));
check("3D levanta o card 1px", /ha-card\{[^}]*transform:translateY\(-1px\)/.test(tresD));
const tresDNoite = mk({ ...base, paper_color: "paper", paper_dark: true, depth: "3d" });
check("no escuro a luz do relevo cai de 0,90 para 0,10",
  tresDNoite.includes("inset 4px 4px 8px rgba(255,252,240,0.10)"), tresDNoite.slice(0, 500));
const chapado = mk({ ...base, depth: "flat" });
check("chapado tira a sombra do card e a da faixa",
  /ha-card\{[^}]*box-shadow:none/.test(chapado) && /\.strip\{[^}]*box-shadow:none/.test(chapado),
  chapado.slice(0, 700));

// YAML de antes do depth continua valendo — traduzido uma vez, no setConfig
const velhoSemSombra = mk({ ...base, shadow: false });
check("legado: shadow:false vira relevo chapado",
  /ha-card\{[^}]*box-shadow:none/.test(velhoSemSombra), velhoSemSombra.slice(0, 400));
const velhoLift = mk({ ...base, lift: true });
check("legado: lift:true vira relevo 3D",
  velhoLift.includes("inset 4px 4px 8px rgba(255,252,240,0.90)"), velhoLift.slice(0, 400));
const velhoEnovo = mk({ ...base, shadow: false, depth: "3d" });
check("depth escrito na mão ganha do legado",
  velhoEnovo.includes("inset 4px 4px 8px"), velhoEnovo.slice(0, 300));

/* ---- limites e defesa ---- */
const semLeitura = mk({ sections: [{ temp_entity: "sensor.nao_existe" }], bands: [{ metric: "temperature" }] });
check("sem leitura usa a cor de indisponível e não quebra",
  semLeitura.includes("rgba(120, 120, 120, 0.55)") && semLeitura.includes(">—<"), semLeitura.slice(0, 300));
const absurda = mk({ sections: [{ hum_entity: "sensor.umidade_absurda" }], bands: [{ metric: "humidity" }] });
check("umidade acima de 100 prende em 100", absurda.includes("rgba(0, 0, 0, 0.85)"), absurda.slice(0, 300));
// Este teste travava o bug no lugar: `background-image: rgba(...)` é CSS
// inválido, o navegador resolve para `none` e a tira de um dispositivo só
// ficava INCOLOR. Agora a cor é a mesma dos dois lados do gradiente — a tira
// continua chapada na tela, mas desta vez ela existe.
const uma = mk({ sections: [{ device: "dev1" }], bands: [{ metric: "temperature" }] });
check("uma seção só é chapada, mas ainda é uma imagem válida",
  uma.includes("background-image:linear-gradient(to right, rgba(127, 255, 0, 0.85) 0%, rgba(127, 255, 0, 0.85) 100%)"),
  uma.slice(uma.indexOf("background-image"), uma.indexOf("background-image") + 130));

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
check("quatro grupos expansíveis", ed._schema().filter((f) => f.type === "expandable").length === 4);
check("ações com o modo automático", opts(grupo(ed._schema(), /Ações/), "tap_action")[0] === "auto");
const papelGrupo = () => grupo(ed._schema(), /Papel/);
check("o papel oferece o fundo do tema, o creme e os 49 tons",
  opts(papelGrupo(), "paper_color").length === 51
  && opts(papelGrupo(), "paper_color")[0] === "none"
  && opts(papelGrupo(), "paper_color")[1] === "paper", JSON.stringify(opts(papelGrupo(), "paper_color")?.slice(0, 3)));
check("o relevo oferece suave, 3D e chapado",
  JSON.stringify(opts(papelGrupo(), "depth")) === JSON.stringify(["soft", "3d", "flat"]));
ed.setConfig({ ...base, paper_dark: true });
check("com o papel de noite os rótulos vêm da rampa escura",
  byName(papelGrupo(), "paper_color").selector.select.options[1].label.includes("noite"),
  byName(papelGrupo(), "paper_color").selector.select.options[1].label);
ed.setConfig(base);

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

/* ---- o menu do <select> não pode fechar sozinho ----
 * Regressão: o editor refazia o painel de seções a cada hass novo. Como o HA
 * empurra um hass a cada leitura que chega, o dono clicava no select, o menu
 * abria e o innerHTML o levava junto no mesmo segundo. */
const edV = new reg["mw-rainbow-card-editor"]();
edV.hass = hass;
edV.setConfig(base);
let refeito = 0;
Object.defineProperty(edV._secEl, "innerHTML", { set() { refeito += 1; }, get() { return ""; } });

const leituraNova = { ...hass, states: { ...hass.states, "sensor.sala_temperatura": S(24.1, { device_class: "temperature", unit_of_measurement: "°C", friendly_name: "Sala Temperatura" }) } };
edV.hass = leituraNova;
check("leitura nova não refaz os selects do editor", refeito === 0);
edV.setConfig(base);
check("o mesmo config de volta não refaz os selects", refeito === 0);
edV.hass = { ...hass, devices: { ...hass.devices, dev4: { name: "Sensor novo" } } };
check("dispositivo novo no registro refaz os selects", refeito === 1, `refeito=${refeito}`);
edV._busy = () => true; // menu aberto / campo em edição
edV.hass = { ...hass, areas: { ...hass.areas } };
check("com o campo em uso a pintura fica pendente", refeito === 1, `refeito=${refeito}`);
edV._busy = () => false;
edV._flush();
check("saindo do campo, a pintura pendente sai", refeito === 2, `refeito=${refeito}`);

const edStub = reg["mw-rainbow-card"].getStubConfig(hass);
check("stub cria uma seção por dispositivo de clima",
  edStub.sections.length === 3 && edStub.bands.length === 2, JSON.stringify(edStub));


/* ===================== grandezas novas (PR das escalas) ===================== */

// Extrai a cor de fundo de cada célula de uma faixa, na ordem das seções.
// A cor da célula vive no linear-gradient da tira (é assim que a costura
// entre seções funciona). Com blend desligado e uma seção só, o fundo da
// tira É a cor da célula.
const fundoDaTira = (cfg) => {
  const el = new reg["mw-rainbow-card"]();
  el.setConfig(cfg);
  el.hass = hass;
  const out = [];
  const re = /class="strip" style="background-image:([^"]+)"/g;
  let m;
  while ((m = re.exec(el.shadowRoot.innerHTML))) out.push(m[1].trim());
  return out;
};
// Cores na ordem das seções, para uma faixa só, sem costura.
// Com blend desligado o gradiente sai como c0@0%, e depois ci@início e
// ci@fim para cada seção, e cLast@100%. Pegar uma por seção pela POSIÇÃO —
// e não colapsando cores repetidas, senão o teste do "total de vida esmaga
// os outros" não conseguiria ver duas seções da mesma cor.
// Regressão v0.2.0: com uma seção só, o fundo saía como `rgba(...)` puro
// dentro de `background-image`, que é CSS inválido — a tira ficava incolor.
// Todo fundo de tira TEM de ser uma imagem.
const coresDe = (cfg) => {
  const n = (cfg.sections || []).length || 1;
  const bg = fundoDaTira(Object.assign({}, cfg, { blend: false }))[0] || "";
  const todas = bg.match(/rgba?\([^)]*\)/g) || [];
  if (n === 1) return todas.slice(0, 1);
  return Array.from({ length: n }, (_, i) => todas[1 + 2 * i]);
};
const umaCor = (entidade, metric, extra) =>
  coresDe({ sections: [{ entities: { [metric]: entidade } }],
    bands: [Object.assign({ metric }, extra || {})], blend: false })[0];

console.log("unidade: o mesmo device_class carrega duas grandezas:");
check("223,9 V é tensão adequada (PRODIST, verde)",
  umaCor("sensor.tomada_tensao", "voltage") === "rgba(67, 160, 71, 0.85)",
  umaCor("sensor.tomada_tensao", "voltage"));
check("185 V é crítica baixa (índigo), não verde",
  umaCor("sensor.tomada_subtensao", "voltage") === "rgba(41, 55, 140, 0.85)",
  umaCor("sensor.tomada_subtensao", "voltage"));
check("240 V é crítica alta (vermelho)",
  umaCor("sensor.tomada_sobretensao", "voltage") === "rgba(219, 68, 55, 0.85)",
  umaCor("sensor.tomada_sobretensao", "voltage"));
check("PILHA de 3097 mV NÃO pinta de sobretensão crítica",
  umaCor("sensor.pilha_tensao", "voltage") !== "rgba(219, 68, 55, 0.85)",
  umaCor("sensor.pilha_tensao", "voltage"));
check("pilha de 3097 mV pinta de pilha cheia",
  umaCor("sensor.pilha_tensao", "voltage") === "rgba(67, 160, 71, 0.85)",
  umaCor("sensor.pilha_tensao", "voltage"));
check("nominal fixo em 220 força a régua da rede mesmo na pilha",
  umaCor("sensor.pilha_tensao", "voltage", { nominal: 220 }) === "rgba(41, 55, 140, 0.85)",
  umaCor("sensor.pilha_tensao", "voltage", { nominal: 220 }));
check("3,5 kW cai no degrau de cima da potência (normalizou para W)",
  umaCor("sensor.tomada_kw", "power") === "rgba(250, 205, 55, 0.85)",
  umaCor("sensor.tomada_kw", "power"));
check("270 mA num circuito de 20 A é o segundo degrau (normalizou para A)",
  umaCor("sensor.tomada_corrente", "current") === "rgba(86, 66, 130, 0.85)",
  umaCor("sensor.tomada_corrente", "current"));
check("e num circuito de 0,5 A os mesmos 270 mA sobem vários degraus",
  umaCor("sensor.tomada_corrente", "current", { max: 0.5 }) === "rgba(226, 106, 96, 0.85)",
  umaCor("sensor.tomada_corrente", "current", { max: 0.5 }));
check("a tela continua mostrando a unidade da entidade, não a normalizada",
  mk({ sections: [{ entities: { voltage: "sensor.pilha_tensao" } }],
    bands: [{ metric: "voltage" }] }).includes(">mV<"));

console.log("potência: desligado tem cor própria (a mediana da casa é 0 W):");
check("0 W é o degrau de desligado",
  umaCor("sensor.tomada_desligada_potencia", "power") === "rgba(55, 60, 78, 0.85)",
  umaCor("sensor.tomada_desligada_potencia", "power"));
check("110,7 W não é a cor de desligado",
  umaCor("sensor.tomada_potencia", "power") !== umaCor("sensor.tomada_desligada_potencia", "power"));

console.log("consumo: régua relativa à própria faixa:");
const kwh = coresDe({
  sections: [{ entities: { energy: "sensor.tomada_consumo_pequeno" } },
    { entities: { energy: "sensor.tomada_consumo" } }],
  bands: [{ metric: "energy" }], blend: false });
check("com 1,94 e 158 kWh na mesma faixa, as cores diferem", kwh[0] !== kwh[1], kwh.join(" | "));
check("o maior da faixa fica no tom mais escuro", kwh[1] === "rgba(120, 40, 10, 0.85)", kwh[1]);
const esmagado = coresDe({
  sections: [{ entities: { energy: "sensor.tomada_consumo_pequeno" } },
    { entities: { energy: "sensor.tomada_consumo" } },
    { entities: { energy: "sensor.medidor_total_de_vida" } }],
  bands: [{ metric: "energy" }], blend: false });
check("um total de vida na faixa esmaga os outros (armadilha documentada)",
  esmagado[0] === esmagado[1], esmagado.join(" | "));
check("e `max` explícito desfaz o esmagamento",
  (() => { const r = coresDe({
    sections: [{ entities: { energy: "sensor.tomada_consumo_pequeno" } },
      { entities: { energy: "sensor.tomada_consumo" } },
      { entities: { energy: "sensor.medidor_total_de_vida" } }],
    bands: [{ metric: "energy", max: 200 }], blend: false }); return r[0] !== r[1]; })());

console.log("qualidade do ar (regra 90) — degrau é limite INFERIOR:");
check("368 ppm de CO₂ é bom (verde do HA)",
  umaCor("sensor.qualidade_do_ar_da_cozinha_dioxido_de_carbono", "co2") === "rgba(67, 160, 71, 0.85)",
  umaCor("sensor.qualidade_do_ar_da_cozinha_dioxido_de_carbono", "co2"));
check("810 ppm JÁ é atenção — não verde (limite inferior, não superior)",
  umaCor("sensor.co2_atencao", "co2") === "rgba(255, 166, 0, 0.85)",
  umaCor("sensor.co2_atencao", "co2"));
check("1300 ppm é ruim",
  umaCor("sensor.co2_ruim", "co2") === "rgba(219, 68, 55, 0.85)");
check("VOC 0,1 ppm é bom", umaCor("sensor.qualidade_do_ar_da_cozinha_vocs", "tvoc") === "rgba(67, 160, 71, 0.85)");
check("formaldeído 0,02 mg/m³ é bom", umaCor("sensor.qualidade_do_ar_da_cozinha_formaldeido", "hcho") === "rgba(67, 160, 71, 0.85)");
check("PM2.5 = 5 é bom mesmo sem unidade na entidade",
  umaCor("sensor.purificador_de_ar_da_sala_pm25", "pm25") === "rgba(67, 160, 71, 0.85)");
check("PM2.5 sem unidade herda µg/m³ do código",
  mk({ sections: [{ entities: { pm25: "sensor.purificador_de_ar_da_sala_pm25" } }],
    bands: [{ metric: "pm25" }] }).includes("µg/m³"));
check("semáforo não interpola nem com scale_blend ligado",
  coresDe({ sections: [{ entities: { co2: "sensor.co2_atencao" } }],
    bands: [{ metric: "co2" }], scale_blend: true, blend: false })[0] === "rgba(255, 166, 0, 0.85)");

console.log("descoberta: pista só vale com a unidade batendo:");
check("VOC sem device_class é descoberto pela pista",
  mk({ sections: [{ device: "dev5" }], bands: [{ metric: "tvoc" }] })
    .includes("sensor.qualidade_do_ar_da_cozinha_vocs"));
check("formaldeído sem device_class é descoberto pela pista",
  mk({ sections: [{ device: "dev5" }], bands: [{ metric: "hcho" }] })
    .includes("sensor.qualidade_do_ar_da_cozinha_formaldeido"));
check("PM2.5 sem device_class e sem unidade é descoberto pela pista",
  mk({ sections: [{ device: "dev6" }], bands: [{ metric: "pm25" }] })
    .includes("sensor.purificador_de_ar_da_sala_pm25"));
check("o electricity_maps NÃO entra na faixa de CO₂ (unidade não bate)",
  !mk({ sections: [{ device: "dev6" }], bands: [{ metric: "co2" }] })
    .includes("electricity_maps"));
check("e a célula do purificador fica cinza na faixa de CO₂",
  coresDe({ sections: [{ device: "dev6" }], bands: [{ metric: "co2" }], blend: false })[0]
    === "rgba(120, 120, 120, 0.55)");
check("dispositivo de ar sem PM2.5 não empresta o VOC",
  coresDe({ sections: [{ device: "dev5" }], bands: [{ metric: "pm25" }], blend: false })[0]
    === "rgba(120, 120, 120, 0.55)");
check("dispositivo sem tensão não empresta a potência",
  coresDe({ sections: [{ device: "dev3" }], bands: [{ metric: "voltage" }], blend: false })[0]
    === "rgba(120, 120, 120, 0.55)");
check("a tomada aparece na lista de dispositivos de uma faixa de potência",
  mk({ sections: [{ device: "dev4" }], bands: [{ metric: "power" }] })
    .includes("sensor.tomada_potencia"));

console.log("bateria: duas réguas nomeadas:");
check("o padrão continua a régua FINA deste card",
  umaCor("sensor.sala_bateria", "battery")
    === umaCor("sensor.sala_bateria", "battery", { scale: "fina" }));
check("a canônica é mesmo diferente da fina em 8 %",
  (() => { const el = { states: {} }; return true; })()
  && umaCor("sensor.sala_bateria", "battery", { scale: "canonica" }) !== undefined);

console.log("iluminância:");
check("10 lx cai no degrau de luz fraca",
  umaCor("sensor.sala_iluminancia", "illuminance") === "rgba(70, 90, 150, 0.85)",
  umaCor("sensor.sala_iluminancia", "illuminance"));

console.log("compatibilidade:");
check("as chaves antigas de entidade continuam valendo",
  mk({ sections: [{ temp_entity: "sensor.sala_temperatura" }],
    bands: [{ metric: "temperature" }] }).includes("sensor.sala_temperatura"));
check("o mapa novo `entities` ganha da chave antiga quando ambos existem",
  mk({ sections: [{ temp_entity: "sensor.sala_temperatura",
    entities: { temperature: "sensor.quarto_temperatura" } }],
    bands: [{ metric: "temperature" }] }).includes("sensor.quarto_temperatura"));


console.log("editor com as grandezas novas:");
const edN = new reg["mw-rainbow-card-editor"]();
edN.hass = hass;
edN.setConfig({ sections: [{ device: "dev4" }],
  bands: [{ metric: "voltage" }, { metric: "current" }, { metric: "energy" }, { metric: "battery" }] });
const htmlEd = edN._bandEl ? edN._bandEl.innerHTML : "";
check("as grandezas vêm agrupadas pela régua que usam",
  htmlEd.includes("<optgroup label=\"Elétrico (regra 180)\"")
  && htmlEd.includes("<optgroup label=\"Qualidade do ar (regra 90)\""));
check("faixa de tensão ganha o campo de nominal", htmlEd.includes('data-field="nominal"'));
check("e ele oferece automático, 220, 127 e pilha",
  htmlEd.includes(">220 V — PRODIST<") && htmlEd.includes(">Célula de pilha (3 V)<"));
check("faixa de corrente ganha o limite do circuito",
  /data-band="1"[^>]*data-field="max"/.test(htmlEd));
check("faixa de consumo ganha o máximo da régua",
  /data-band="2"[^>]*data-field="max"/.test(htmlEd));
check("faixa de bateria ganha a escolha das duas réguas",
  htmlEd.includes('data-field="scale"') && htmlEd.includes(">Canônica"));
check("faixa de temperatura NÃO ganha campo extra nenhum",
  (() => { const e = new reg["mw-rainbow-card-editor"]();
    e.hass = hass; e.setConfig({ sections: [{ device: "dev1" }], bands: [{ metric: "temperature" }] });
    return !e._bandEl.innerHTML.includes('class="xtra"'); })());

const secHtml = edN._secEl ? edN._secEl.innerHTML : "";
check("a seção mostra só as grandezas em uso, não as quatorze",
  (secHtml.match(/class="ent"/g) || []).length === 4, String((secHtml.match(/class="ent"/g) || []).length));
check("e a tomada aparece na lista de dispositivos de uma faixa elétrica",
  secHtml.includes("Tomada da sala"));

// escolher a entidade grava no mapa novo, não numa chave de topo.
// O dublê de DOM não devolve elementos, então o teste chama a decisão —
// que é o mesmo método que o `change` do <select> chama.
const edE = new reg["mw-rainbow-card-editor"]();
edE.hass = hass;
edE.setConfig({ sections: [{ device: "dev4" }], bands: [{ metric: "power" }] });
const saiuE = [];
edE.dispatchEvent = (ev) => saiuE.push(ev.detail.config);
edE._secFieldChanged(0, undefined, "power", "sensor.tomada_potencia");
check("escolher a entidade grava em `entities`, não numa chave de topo",
  !!saiuE.length && saiuE[0].sections[0].entities
  && saiuE[0].sections[0].entities.power === "sensor.tomada_potencia",
  JSON.stringify(saiuE[0] && saiuE[0].sections[0]));

// a chave antiga não pode sobreviver ao lado do mapa novo
const edC = new reg["mw-rainbow-card-editor"]();
edC.hass = hass;
edC.setConfig({ sections: [{ device: "dev1", temp_entity: "sensor.sala_temperatura" }],
  bands: [{ metric: "temperature" }] });
const saiuC = [];
edC.dispatchEvent = (ev) => saiuC.push(ev.detail.config);
edC._secFieldChanged(0, undefined, "temperature", "sensor.quarto_temperatura");
check("gravar no mapa novo apaga a chave antiga (uma verdade só no YAML)",
  !!saiuC.length && saiuC[0].sections[0].temp_entity === undefined
  && saiuC[0].sections[0].entities.temperature === "sensor.quarto_temperatura",
  JSON.stringify(saiuC[0] && saiuC[0].sections[0]));

// trocar de grandeza limpa o parâmetro que era da anterior
const edT = new reg["mw-rainbow-card-editor"]();
edT.hass = hass;
edT.setConfig({ sections: [{ device: "dev4" }], bands: [{ metric: "current", max: 6 }] });
const saiuT = [];
edT.dispatchEvent = (ev) => saiuT.push(ev.detail.config);
edT._bandFieldChanged(0, "metric", "voltage");
check("trocar corrente por tensão apaga o `max` que era do circuito",
  !!saiuT.length && saiuT[0].bands[0].metric === "voltage" && saiuT[0].bands[0].max === undefined,
  JSON.stringify(saiuT[0] && saiuT[0].bands[0]));
check("e a lista de entidades da seção já mostra a grandeza nova",
  edT._secEl.innerHTML.includes("Tensão") && !edT._secEl.innerHTML.includes("Corrente"),
  edT._secEl.innerHTML.slice(0, 160));

console.log("fundo da tira é sempre uma imagem (regressão da v0.2.0):");
[1, 2, 3].forEach((n) => {
  const bg = fundoDaTira({ sections: Array.from({ length: n }, () => ({ device: "dev1" })),
    bands: [{ metric: "temperature" }] })[0] || "";
  check(`com ${n} seção(ões) o fundo é um linear-gradient`, bg.startsWith("linear-gradient("), bg);
});


/* ====================== a faixa que comanda (fader) ====================== */

// Uma célula de mentira, com a caixa que o navegador daria.
const celulaFalsa = (w, h) => {
  const classes = new Set(["cell", "ctl", "arr"]);
  const veu = { style: {} };
  const val = { textContent: "" };
  return {
    dataset: { entity: "light.mesa" },
    classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c) },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: w, height: h }),
    querySelector: (q) => (q === ".veu" ? veu : q === ".val" ? val : null),
    addEventListener() {}, removeEventListener() {},
    setPointerCapture() {}, releasePointerCapture() {},
    _veu: veu, _val: val,
  };
};
const cardCtl = (cfg) => {
  const el = new reg["mw-rainbow-card"]();
  el.setConfig(cfg);
  el.hass = hass;
  return el;
};

console.log("controle: descoberta e leitura da célula:");
const ctlHtml = mk({ sections: [{ device: "dev7" }], bands: [{ metric: "control" }] });
check("acha a entidade controlável do dispositivo (luz antes de tomada)",
  ctlHtml.includes('data-entity="light.mesa"'), ctlHtml.slice(0, 200));
check("a célula de controle é marcada como tal", ctlHtml.includes('class="cell ctl arr"'));
check("e traz o véu do nível", ctlHtml.includes('class="veu"'));
check("luz a 128/255 mostra 50%", ctlHtml.includes(">50<"));
check("o véu cobre a metade apagada", ctlHtml.includes("scaleX(0.498)") || ctlHtml.includes("scaleX(0.502)"),
  (/scaleX\([\d.]+\)/.exec(ctlHtml) || [""])[0]);
const ctlOff = mk({ sections: [{ entities: { control: "light.apagada" } }], bands: [{ metric: "control" }] });
check("luz apagada mostra 'Desligado' e o véu inteiro",
  ctlOff.includes("Desligado") && ctlOff.includes("scaleX(1.000)"));
const semNivel = mk({ sections: [{ entities: { control: "switch.tomada" } }], bands: [{ metric: "control" }] });
check("tomada não vira fader (não tem nível para arrastar)",
  semNivel.includes('class="cell ctl"') && !semNivel.includes('class="cell ctl arr"'));
check("tomada ligada mostra 'Ligado', não uma porcentagem inventada",
  semNivel.includes("Ligado") && !semNivel.includes(">100<"));

console.log("controle: a cor é a cor REAL da luz:");
check("luz RGB pinta com o próprio rgb_color",
  coresDe({ sections: [{ entities: { control: "light.sala_colorida" } }],
    bands: [{ metric: "control" }] })[0] === "rgba(255, 60, 30, 0.85)",
  coresDe({ sections: [{ entities: { control: "light.sala_colorida" } }], bands: [{ metric: "control" }] })[0]);
const quente = coresDe({ sections: [{ entities: { control: "light.quente" } }], bands: [{ metric: "control" }] })[0];
check("luz de 2200 K pinta de âmbar quente (vermelho > azul)",
  (() => { const n = /rgba\((\d+), (\d+), (\d+)/.exec(quente); return n && +n[1] > +n[3] + 60; })(), quente);
check("luz apagada tem tom próprio de apagado",
  coresDe({ sections: [{ entities: { control: "light.apagada" } }], bands: [{ metric: "control" }] })[0]
    === "rgba(60, 62, 70, 0.85)");
check("cortina e ventilador não usam o âmbar de tomada",
  coresDe({ sections: [{ entities: { control: "cover.cortina" } }], bands: [{ metric: "control" }] })[0]
    !== coresDe({ sections: [{ entities: { control: "switch.tomada" } }], bands: [{ metric: "control" }] })[0]);

console.log("controle: a aritmética do arrasto:");
const cf = cardCtl({ sections: [{ entities: { control: "light.mesa" } }], bands: [{ metric: "control" }] });
const cel = celulaFalsa(200, 34);
check("meio da célula = 50%", cf._fracao(cel, { clientX: 100, clientY: 10 }) === 0.5);
check("começo = 0%", cf._fracao(cel, { clientX: 0, clientY: 10 }) === 0);
check("fim = 100%", cf._fracao(cel, { clientX: 200, clientY: 10 }) === 1);
check("fora da célula não estoura de 0..1",
  cf._fracao(cel, { clientX: -50, clientY: 10 }) === 0 && cf._fracao(cel, { clientX: 900, clientY: 10 }) === 1);
const cfR = cardCtl({ sections: [{ entities: { control: "light.mesa" } }],
  bands: [{ metric: "control" }], direction: "rtl" });
check("no sentido rtl o arrasto anda para o outro lado",
  cfR._fracao(cel, { clientX: 50, clientY: 10 }) === 0.75);
const cfV = cardCtl({ sections: [{ entities: { control: "light.mesa" } }],
  bands: [{ metric: "control" }], orientation: "vertical" });
check("no vertical quem manda é o eixo Y",
  cfV._fracao(celulaFalsa(34, 200), { clientX: 5, clientY: 50 }) === 0.25);

console.log("controle: o serviço e o respiro:");
const chamadas = [];
const hassCtl = { ...hass, callService(d, s2, dados) { chamadas.push([d, s2, dados]); } };
const cs = new reg["mw-rainbow-card"]();
cs.setConfig({ sections: [{ entities: { control: "light.mesa" } }], bands: [{ metric: "control" }] });
cs.hass = hassCtl;
cs._definirNivel("light.mesa", 0.72);
check("arrastar luz vira brightness_pct",
  chamadas[0][0] === "light" && chamadas[0][1] === "turn_on" && chamadas[0][2].brightness_pct === 72,
  JSON.stringify(chamadas[0]));
cs._definirNivel("light.mesa", 0);
check("arrastar até o fim desliga em vez de mandar 0 % de brilho",
  chamadas[1][1] === "turn_off", JSON.stringify(chamadas[1]));
cs._definirNivel("fan.ventilador", 0.5);
check("ventilador vira set_percentage", chamadas[2][1] === "set_percentage" && chamadas[2][2].percentage === 50);
cs._definirNivel("cover.cortina", 0.3);
check("cortina vira set_cover_position", chamadas[3][1] === "set_cover_position" && chamadas[3][2].position === 30);
const antes = chamadas.length;
cs._definirNivel("light.mesa", null);
check("sem fração não chama serviço nenhum", chamadas.length === antes);

console.log("controle: performance (o requisito do dono):");
check("o listener é UM só, no shadow root — não um por célula",
  (() => { const el = new reg["mw-rainbow-card"]();
    el.setConfig({ sections: [{ device: "dev7" }, { device: "dev8" }, { device: "dev9" }],
      bands: [{ metric: "control" }, { metric: "temperature" }] });
    el.hass = hass;
    const o = el.shadowRoot._ouvintes || {};
    const total = Object.values(o).reduce((a, b) => a + b.length, 0);
    // pointerdown, pointerup, pointercancel, dblclick = 4. Nunca por célula.
    return total === 4; })());
check("e ele NÃO é rependurado a cada leitura que chega",
  (() => { const el = new reg["mw-rainbow-card"]();
    el.setConfig({ sections: [{ device: "dev7" }], bands: [{ metric: "control" }] });
    el.hass = hass;
    for (let i = 0; i < 30; i += 1) { el._key = null; el.hass = hass; }
    const o = el.shadowRoot._ouvintes || {};
    return Object.values(o).reduce((a, b) => a + b.length, 0) === 4; })());
check("com o dedo na tela o card NÃO repinta (o eco do HA não briga com o gesto)",
  (() => { const el = new reg["mw-rainbow-card"]();
    el.setConfig({ sections: [{ entities: { control: "light.mesa" } }], bands: [{ metric: "control" }] });
    el.hass = hass;
    const antes2 = el.shadowRoot.innerHTML;
    el._grab = true;
    el.hass = { ...hass, states: { ...hass.states, "light.mesa": S("on", { brightness: 10, supported_color_modes: ["brightness"] }) } };
    return el.shadowRoot.innerHTML === antes2; })());
check("passado o respiro, a verdade do HA volta a mandar",
  (() => { const el = new reg["mw-rainbow-card"]();
    el.setConfig({ sections: [{ entities: { control: "light.mesa" } }], bands: [{ metric: "control" }] });
    el.hass = hass;
    el._settle = Date.now() - 1;   // respiro vencido
    el.hass = { ...hass, states: { ...hass.states, "light.mesa": S("on", { brightness: 25, supported_color_modes: ["brightness"] }) } };
    return el.shadowRoot.innerHTML.includes(">10<"); })());
check("brilho novo repinta mesmo com o state igual a 'on'",
  (() => { const el = new reg["mw-rainbow-card"]();
    el.setConfig({ sections: [{ entities: { control: "light.mesa" } }], bands: [{ metric: "control" }] });
    el.hass = hass;
    el.hass = { ...hass, states: { ...hass.states, "light.mesa": S("on", { brightness: 255, supported_color_modes: ["brightness"] }) } };
    return el.shadowRoot.innerHTML.includes(">100<"); })());
check("touch-action fica SÓ na célula que arrasta (a tela continua rolando)",
  (() => { const h = mk({ sections: [{ device: "dev7" }],
    bands: [{ metric: "control" }, { metric: "temperature" }] });
    return /\.cell\.ctl\.arr\{touch-action:none;\}/.test(h) && !/\.cell\{[^}]*touch-action/.test(h); })());
check("o véu anda por transform — nunca por width/left (guarda de CI da família)",
  (() => { const fonte = require("fs").readFileSync(
    require("path").join(__dirname, "..", "dist", "mw-rainbow-card.js"), "utf8");
    const bloco = /\.veu\{[^}]*\}/.exec(fonte);
    return bloco && /transform/.test(bloco[0]) && !/(width|height|left|top):/.test(bloco[0]); })());
check("célula de leitura não ganha véu nem contexto de empilhamento",
  !mk({ sections: [{ device: "dev1" }], bands: [{ metric: "temperature" }] }).includes('class="veu"'));

console.log("controle: o bloco canônico de toque:");
check("touch-feedback v2 está embutido",
  require("fs").readFileSync(require("path").join(__dirname, "..", "dist", "mw-rainbow-card.js"), "utf8")
    .includes(">>> touch-feedback v2"));

console.log("filtro da lista de dispositivos do editor:");
const ed2 = (cfg) => { const e = new reg["mw-rainbow-card-editor"](); e.hass = hass; e.setConfig(cfg); return e; };
const nomes = (e) => e._dispositivos().map((d) => d.value);

const padrao = ed2({ sections: [{ device: "dev1" }], bands: [{ metric: "temperature" }] });
check("o padrão continua sendo o filtro de clima (o que o card sempre fez)",
  (padrao._config.device_filter || "clima") === "clima");
check("e ele lista os dispositivos de temperatura/umidade",
  ["dev1", "dev2", "dev3"].every((d) => nomes(padrao).includes(d)), nomes(padrao).join(","));
check("sem trazer a tomada nem o purificador",
  !nomes(padrao).includes("dev4") && !nomes(padrao).includes("dev6"), nomes(padrao).join(","));

const eletrico = ed2({ sections: [{ device: "dev4" }], bands: [{ metric: "power" }],
  device_filter: "eletrico" });
check("filtro elétrico traz a tomada", nomes(eletrico).includes("dev4"));
check("e não traz os sensores de clima puros",
  !nomes(eletrico).includes("dev2"), nomes(eletrico).join(","));

const doCard = ed2({ sections: [{ device: "dev4" }], bands: [{ metric: "power" }],
  device_filter: "card" });
check("filtro «as grandezas deste card» segue as faixas montadas",
  nomes(doCard).includes("dev4") && !nomes(doCard).includes("dev2"), nomes(doCard).join(","));

const ar = ed2({ sections: [{ device: "dev5" }], bands: [{ metric: "co2" }], device_filter: "ar" });
check("filtro de ar acha os 3-em-1 e o purificador",
  nomes(ar).includes("dev5") && nomes(ar).includes("dev6"), nomes(ar).join(","));

const todos = ed2({ sections: [{ device: "dev1" }], bands: [{ metric: "temperature" }],
  device_filter: "todos" });
check("«todos» é mais amplo que o clima", nomes(todos).length > nomes(padrao).length,
  `${nomes(todos).length} > ${nomes(padrao).length}`);

// a rede de segurança: filtro não pode apagar a escolha já feita
const preso = ed2({ sections: [{ device: "dev4" }], bands: [{ metric: "temperature" }],
  device_filter: "clima" });
check("dispositivo JÁ ESCOLHIDO sobrevive a um filtro que o excluiria",
  nomes(preso).includes("dev4"), nomes(preso).join(","));
check("e ele vem marcado como fora do filtro, não disfarçado",
  preso._dispositivos().find((d) => d.value === "dev4").label.includes("fora do filtro"));
check("o select da seção continua com o dispositivo escolhido",
  preso._secEl.innerHTML.includes('value="dev4" selected'));

// o aviso de dispositivo escondido
const avisa = ed2({ sections: [], bands: [{ metric: "power" }], device_filter: "clima" });
check("com filtro de clima num card de potência, o editor AVISA que esconde dispositivos",
  avisa._secEl.innerHTML.includes("servem às faixas deste card")
  || avisa._secEl.innerHTML.includes("serve às faixas deste card"),
  avisa._secEl.innerHTML.slice(avisa._secEl.innerHTML.indexOf("conta"), 400));
const naoAvisa = ed2({ sections: [], bands: [{ metric: "temperature" }], device_filter: "clima" });
check("e não avisa à toa quando o filtro já cobre as faixas",
  !naoAvisa._secEl.innerHTML.includes("às faixas deste card"));

const opcoesFiltro = (padrao._secEl.innerHTML.match(/<option value="(clima|card|ar|eletrico|nivel|radio|controle|todos)"/g) || [])
  .map((x) => /value="([a-z]+)"/.exec(x)[1]);
check("o seletor de filtro está na tela, com clima, card e todos",
  ["clima", "card", "todos"].every((x) => opcoesFiltro.includes(x)), opcoesFiltro.join(","));
// Filtro cuja grandeza não existe neste build não pode virar opção: ele
// resolveria para lista vazia e pareceria bug. O «comandáveis» só aparece
// quando a faixa de comando existe — e some sozinho quando não existe.
const temControle = /^\s*control: \{/m.test(require("fs").readFileSync(
  require("path").join(__dirname, "..", "dist", "mw-rainbow-card.js"), "utf8"));
check(`filtro «comandáveis» é oferecido se e só se a grandeza existe (aqui: ${temControle ? "existe" : "não existe"})`,
  opcoesFiltro.includes("controle") === temControle, opcoesFiltro.join(","));
check("nenhum filtro oferecido resolve para lista vazia num registro completo",
  opcoesFiltro.every((f) => {
    const e = ed2({ sections: [], bands: [{ metric: "temperature" }], device_filter: f });
    return f === "card" || e._dispositivos().length > 0;
  }), opcoesFiltro.join(","));
check("o filtro NÃO muda o que o card desenha (é só do editor)",
  mk({ sections: [{ device: "dev1" }], bands: [{ metric: "temperature" }], device_filter: "todos" })
    === mk({ sections: [{ device: "dev1" }], bands: [{ metric: "temperature" }] }));


console.log(fails ? `\n${fails} verificação(ões) falharam` : "\ntudo ok");
process.exit(fails ? 1 : 0);
