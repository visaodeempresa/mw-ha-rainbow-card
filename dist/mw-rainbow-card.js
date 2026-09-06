/* mw-ha-rainbow-card — custom:mw-rainbow-card
 * Arco-íris de ambientes: N seções (uma por dispositivo) × N faixas
 * (Temperatura · Umidade · Bateria · RSSI · LQI), cada célula pintada pela
 * escala canônica da casa. Horizontal ou vertical, em qualquer sentido,
 * com ou sem degradê de transição entre as seções.
 * Da mesma família do mw-ha-temp-humidity-card, mw-ha-door-window-card e
 * mw-ha-occupancy-motion-card — e como eles: código próprio (ADR 0002).
 * JS puro + <ha-form>, arquivo único, sem build.
 * Repo: https://github.com/visaodeempresa/mw-ha-rainbow-card
 * Releases automáticas: merge na main → bump semântico → tag → HACS.
 */
(() => {
  "use strict";

  const DEFAULTS = {
    // --- conteúdo ---
    name: "",
    show_name: true,
    // --- geometria do arco-íris ---
    orientation: "horizontal", // horizontal | vertical
    direction: "ltr",          // ltr | rtl (horizontal) · ttb | btt (vertical)
    band_height: 34,           // altura da faixa (largura da coluna, se vertical)
    length: 260,               // comprimento do arco-íris — só vale no vertical
    band_gap: 4,               // folga entre faixas
    band_radius: 8,            // arredondamento de cada faixa
    // --- cor ---
    scale_alpha: 0.85,         // opacidade das cores da escala canônica (0..1)
    blend: true,               // degradê de transição entre as seções
    blend_amount: 100,         // largura da transição, em % da seção (0 = corte seco)
    // A cor da célula nasce da faixa seca da escala canônica — é assim que os
    // button-cards da casa pintam, e é o que faz o arco-íris bater com eles.
    // scale_blend interpola dentro da escala; não confundir com o blend acima,
    // que é a costura entre uma seção e a vizinha.
    scale_blend: false,
    color_unavailable: "rgba(120, 120, 120, 0.55)",
    // --- rótulos ---
    section_labels: "first",   // none | first | all
    show_values: true,
    show_units: true,
    band_labels: "icon",       // none | icon | text
    label_size: 10,
    value_size: 13,
    name_size: 12,
    band_label_size: 14,
    // --- texto ---
    text_mode: "auto",         // auto | theme | contrast | fixed
    color_text_dark: "#1a1a1a",
    color_text_light: "#ffffff",
    color_name: "var(--primary-text-color)",
    color_band_label: "var(--secondary-text-color)",
    // --- moldura ---
    border_radius: 10,
    padding: 8,
    gradient: true,            // brilho de vidro sobre as faixas
    divider: false,            // risco separando as seções
    // --- papel e relevo ---
    // O card nasce com o fundo do tema (paper_color: none) — quem já tinha um
    // arco-íris na tela não acorda com uma folha nova por baixo dele.
    paper_color: "none",       // none | paper | <matiz>-<1..7>
    paper_dark: false,         // a mesma chave, lida na rampa de noite
    depth: "soft",             // flat | soft | 3d — substitui shadow/lift
    // --- ações ---
    tap_action: "auto",        // auto = cada célula abre o seu sensor
    hold_action: "none",
    double_tap_action: "none",
    navigation_path: "",
    url_path: "",
  };

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const px = (v) => {
    if (v === "" || v === null || v === undefined) return "";
    const s = String(v).trim();
    return /^-?\d+(\.\d+)?$/.test(s) ? `${s}px` : s;
  };

  const num = (v, fb) => (Number.isFinite(Number(v)) ? Number(v) : fb);

  /* ------------------------------ papel ------------------------------ */

  // A folha por baixo do arco-íris. Mesmo vocabulário do MW Power Button e do
  // MW Window / Curtain: uma chave de papel (`paper` + 49 tons), a rampa de
  // noite no mesmo jogo de chaves, e o relevo em três degraus.

  // >>> paper-palette v1 — fonte canônica: /Volumes/SSD-T1-01/CLAUDE-SSD/IA/lib/paper-palette/paper-palette.js
  // 49 papéis encardidos: 7 matizes do arco-íris × 7 tons (1 = quase branco,
  // 7 = mais encardido). Saturação baixa de propósito — papel descansa a vista.
  const PAPER_HUES = [
    ["red", "Vermelho", 6], ["orange", "Laranja", 27], ["yellow", "Amarelo", 47],
    ["green", "Verde", 96], ["blue", "Azul", 203], ["indigo", "Anil", 236],
    ["violet", "Violeta", 283],
  ];
  const PAPER_TONES = [[97, 6], [96, 9], [94, 12], [92, 15], [90, 18], [88, 21], [85, 24]];
  const PAPER_DEFAULT = "linear-gradient(145deg, #fdfaf3, #e8e3d8)";
  const paperGradient = (key) => {
    const m = /^([a-z]+)-([1-7])$/.exec(String(key || "").trim());
    if (!m) return PAPER_DEFAULT;
    const hue = PAPER_HUES.find((h) => h[0] === m[1]);
    if (!hue) return PAPER_DEFAULT;
    const [l, s] = PAPER_TONES[+m[2] - 1];
    return `linear-gradient(145deg, hsl(${hue[2]}, ${s}%, ${l}%), hsl(${hue[2]}, ${s + 4}%, ${l - 7}%))`;
  };
  const paperOptions = () => [{ value: "paper", label: "Papel original (creme)" }].concat(
    ...PAPER_HUES.map((h) => PAPER_TONES.map((t, i) => ({
      value: `${h[0]}-${i + 1}`,
      label: `${h[1]} · tom ${i + 1}${i === 0 ? " (mais claro)" : i === 6 ? " (mais encardido)" : ""}`,
    }))));
  // <<< paper-palette v1

  // >>> paper-dark-palette v1 — fonte canônica: /Volumes/SSD-T1-01/CLAUDE-SSD/IA/lib/paper-dark-palette/paper-dark-palette.js
  // 49 papéis de noite: as mesmas 7 matizes do paper-palette v1 × 7 tons
  // (1 = papel escuro mais claro, 7 = mais encardido). A saturação sobe mais
  // rápido que na rampa clara porque matiz em luminosidade baixa desaparece.
  const PAPER_DARK_HUES = [
    ["red", "Vermelho", 6], ["orange", "Laranja", 27], ["yellow", "Amarelo", 47],
    ["green", "Verde", 96], ["blue", "Azul", 203], ["indigo", "Anil", 236],
    ["violet", "Violeta", 283],
  ];
  const PAPER_DARK_TONES = [[26, 10], [24, 13], [21, 16], [19, 19], [16, 22], [14, 25], [11, 28]];
  const PAPER_DARK_DEFAULT = "linear-gradient(145deg, #2b2825, #161411)";
  const paperDarkGradient = (key) => {
    const m = /^([a-z]+)-([1-7])$/.exec(String(key || "").trim());
    if (!m) return PAPER_DARK_DEFAULT;
    const hue = PAPER_DARK_HUES.find((h) => h[0] === m[1]);
    if (!hue) return PAPER_DARK_DEFAULT;
    const [l, s] = PAPER_DARK_TONES[+m[2] - 1];
    return `linear-gradient(145deg, hsl(${hue[2]}, ${s}%, ${l}%), hsl(${hue[2]}, ${s + 6}%, ${Math.max(4, l - 6)}%))`;
  };
  const paperDarkOptions = () => [{ value: "paper", label: "Papel de noite (grafite)" }].concat(
    ...PAPER_DARK_HUES.map((h) => PAPER_DARK_TONES.map((t, i) => ({
      value: `${h[0]}-${i + 1}`,
      label: `${h[1]} · tom ${i + 1}${i === 0 ? " (mais claro)" : i === 6 ? " (mais escuro)" : ""}`,
    }))));
  // Tinta que se lê sobre o papel do modo pedido. Não é contraste calculado:
  // é o par fixo que a casa usa, para dois cards lado a lado combinarem.
  const paperInk = (dark) => (dark
    ? { text: "rgba(247, 244, 236, 0.94)", dim: "rgba(247, 244, 236, 0.62)", line: "rgba(255, 255, 255, 0.14)" }
    : { text: "rgba(28, 25, 20, 0.92)", dim: "rgba(28, 25, 20, 0.58)", line: "rgba(0, 0, 0, 0.14)" });
  // <<< paper-dark-palette v1

  // A borda do papel: uma linha tirada do próprio tom, não uma cor inventada.
  // Cópia local (não é bloco canônico) — o mesmo cálculo do
  // mw-ha-window-curtain-card, que foi onde ele nasceu.
  const paperEdge = (key, dark) => {
    const m = /^([a-z]+)-([1-7])$/.exec(String(key || "").trim());
    const table = dark ? PAPER_DARK_TONES : PAPER_TONES;
    if (!m) return dark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.20)";
    const hue = (dark ? PAPER_DARK_HUES : PAPER_HUES).find((h) => h[0] === m[1]);
    if (!hue) return dark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.20)";
    const [l, s] = table[+m[2] - 1];
    return dark
      ? `hsl(${hue[2]}, ${Math.min(60, s + 14)}%, ${Math.min(72, l + 26)}%)`
      : `hsl(${hue[2]}, ${Math.min(60, s + 10)}%, ${Math.max(30, l - 26)}%)`;
  };

  const hasPaper = (c) => !!c.paper_color && c.paper_color !== "none";
  const paperOf = (c) => (c.paper_dark === true
    ? paperDarkGradient(c.paper_color) : paperGradient(c.paper_color));

  // O relevo. `flat` = nada · `soft` = a sombra de sempre · `3d` = o papel do
  // MW Power Button ligado: luz presa na quina de cima e sombra na de baixo,
  // com a folha projetando no dashboard. Os números do modo claro são os do
  // botão de tomada; os do escuro seguem a leitura do papel de noite, onde
  // 0,90 de branco vira risco de giz em vez de luz.
  const cardRelief = (depth, dark) => {
    if (depth === "flat") return "none";
    if (depth !== "3d") return "0 2px 3px rgba(0,0,0,0.18), 0 6px 12px rgba(0,0,0,0.14)";
    return `inset 4px 4px 8px rgba(255,252,240,${dark ? "0.10" : "0.90"}),`
      + ` inset -4px -4px 8px rgba(0,0,0,${dark ? "0.50" : "0.12"}),`
      + ` 0 2px 6px rgba(0,0,0,${dark ? "0.55" : "0.18"}),`
      + ` 0 6px 16px rgba(0,0,0,${dark ? "0.42" : "0.14"}),`
      + ` 0 12px 28px rgba(0,0,0,${dark ? "0.30" : "0.08"})`;
  };

  // A faixa é o oposto da folha: ela AFUNDA no papel. Sem isso o arco-íris
  // fica boiando em cima de uma folha em relevo — duas coisas salientes, e o
  // olho não sabe qual está por cima de qual.
  const stripRelief = (depth, dark) => {
    if (depth === "flat") return "none";
    if (depth !== "3d") return "inset 1px 1px 0 rgba(255,255,255,0.24), inset -1px -1px 0 rgba(0,0,0,0.12)";
    return `inset 2px 2px 5px rgba(0,0,0,${dark ? "0.55" : "0.30"}),`
      + ` inset -1px -1px 3px rgba(255,255,255,${dark ? "0.05" : "0.45"}),`
      + ` 0 1px 0 rgba(255,255,255,${dark ? "0.06" : "0.55"})`;
  };

  // shadow/lift viraram um controle só. YAML antigo continua valendo — é
  // traduzido aqui, uma vez, em vez de o render carregar os dois vocabulários.
  const migrateDepth = (cfg) => {
    if (cfg.depth) return cfg;
    if (cfg.shadow === false) return { ...cfg, depth: "flat" };
    if (cfg.lift === true) return { ...cfg, depth: "3d" };
    return cfg;
  };

  /* --------------------------- escala canônica --------------------------- */

  // >>> mw-climate-scale v1 — fonte canônica: /Volumes/SSD-T1-01/CLAUDE-SSD/IA/lib/mw-climate-scale/mw-climate-scale.js
  // Escala canônica de cor por temperatura (°C) e umidade relativa (%).
  // Regra: IA/rules/global/40-cores-de-temperatura-e-umidade.md.
  const MW_CLIMATE_SCALE_ALPHA = 0.5;

  // 19 limites superiores inclusivos → 20 cores (a última vale de 46 °C para cima).
  const MW_TEMP_STOPS = [
    3.99, 6.99, 8.99, 13.99, 15.99, 17.99, 18.99, 20.99, 21.99, 22.99,
    23.99, 24.99, 25.99, 26.99, 29.99, 32.99, 35.99, 39.99, 45.99,
  ];
  const MW_TEMP_RGB = (
    "0,0,0 0,0,139 0,0,255 70,130,180 0,206,209 64,224,208 0,255,255 144,238,144 0,255,0 50,205,50 " +
    "127,255,0 154,205,50 255,255,0 255,215,0 255,165,0 255,99,71 255,69,0 178,34,34 139,0,0 139,0,0"
  ).split(" ");

  // Uma faixa por ponto percentual: índice n cobre [n, n+1); 100 é faixa própria.
  // O template original fecha a faixa em n.99 e deixa (n.99, n+1) sem dono — o
  // laço cai no fallback, que é a cor de 100% (preto). Sensor que reporte
  // 58,995 % pisca preto. Aqui o vão é fechado de propósito.
  const MW_HUM_RGB = (
    "0,0,0 51,0,0 102,0,0 153,0,0 204,0,0 255,0,0 255,11,0 255,22,0 255,33,0 255,45,0 " +
    "255,56,0 255,67,0 255,78,0 255,89,0 255,100,0 255,111,0 255,122,0 255,133,0 255,144,0 255,155,0 " +
    "255,165,0 255,170,0 255,174,0 255,179,0 255,183,0 255,188,0 255,192,0 255,197,0 255,201,0 255,206,0 " +
    "255,210,0 255,215,0 255,219,0 255,224,0 255,228,0 255,233,0 255,237,0 255,242,0 255,246,0 255,251,0 " +
    "255,255,0 170,255,85 85,255,170 0,255,255 12,252,253 24,249,251 36,246,249 48,243,247 60,240,245 72,237,243 " +
    "84,234,241 96,231,239 108,228,237 120,225,235 132,222,234 144,219,231 156,216,229 173,216,230 115,144,238 58,72,246 " +
    "0,0,255 0,0,249 0,0,243 0,0,237 0,0,231 0,0,225 0,0,219 0,0,213 0,0,207 0,0,201 " +
    "0,0,195 0,0,189 0,0,183 0,0,177 0,0,171 0,0,165 0,0,159 0,0,153 0,0,147 0,0,141 " +
    "0,0,139 0,0,132 0,0,125 0,0,118 0,0,111 0,0,104 0,0,97 0,0,90 0,0,83 0,0,76 " +
    "0,0,69 0,0,62 0,0,55 0,0,48 0,0,41 0,0,34 0,0,27 0,0,20 0,0,13 0,0,6 " +
    "0,0,0"
  ).split(" ");
  const MW_HUM_STOPS = MW_HUM_RGB.slice(1).map((_, i) => i + 0.99);

  const mwClimateRgba = (triplet, alpha) => `rgba(${triplet.split(",").join(", ")}, ${alpha})`;

  // Faixas + cores no formato do algoritmo de faixa comum: a cor é a primeira
  // cujo limite superior não foi ultrapassado. `clamp` existe porque umidade
  // fora de 0..100 é ruído de sensor, não frio.
  const mwClimateScale = (kind, alpha) => {
    const a = Number.isFinite(Number(alpha)) ? Number(alpha) : MW_CLIMATE_SCALE_ALPHA;
    const hum = kind === "hum" || kind === "humidity" || kind === "umidade";
    return {
      stops: hum ? MW_HUM_STOPS : MW_TEMP_STOPS,
      colors: (hum ? MW_HUM_RGB : MW_TEMP_RGB).map((t) => mwClimateRgba(t, a)),
      clamp: hum ? [0, 100] : null,
    };
  };

  // Cor seca (sem degradê), do jeito que o button-card faz.
  const mwClimateColor = (kind, value, alpha) => {
    const s = mwClimateScale(kind, alpha);
    let v = Number(value);
    if (!Number.isFinite(v)) return null;
    if (s.clamp) v = Math.min(s.clamp[1], Math.max(s.clamp[0], v));
    const i = s.stops.findIndex((stop) => v <= stop);
    return s.colors[i === -1 ? s.stops.length : i];
  };
  // <<< mw-climate-scale v1

  // >>> mw-air-quality-scale v1 — fonte canônica: /Volumes/SSD-T1-01/CLAUDE-SSD/IA/lib/mw-air-quality-scale/mw-air-quality-scale.js
  // Escala canônica de cor para qualidade do ar (CO₂, TVOC, HCHO, PM).
  // Regra: IA/rules/global/90-cores-de-qualidade-do-ar.md.
  // As três cores são as do próprio HA, para que um gauge nativo e um
  // componente nosso na mesma tela não discordem.
  const MW_AQ_GREEN = "#43a047";   // --success-color  · bom
  const MW_AQ_AMBER = "#ffa600";   // --warning-color  · atenção
  const MW_AQ_RED = "#db4437";     // --error-color    · ruim

  // grandeza → { nome, unidade, min, max, degraus [valor de início, cor] }.
  // `min`/`max` existem para quem desenha mostrador (gauge, régua, barra);
  // quem só quer a cor usa os degraus.
  const MW_AQ_SCALE = {
    co2:  { name: "CO₂", unit: "ppm", min: 350, max: 2000,
            steps: [[350, MW_AQ_GREEN], [800, MW_AQ_AMBER], [1200, MW_AQ_RED]] },
    tvoc: { name: "TVOC", unit: "ppm", min: 0, max: 2,
            steps: [[0, MW_AQ_GREEN], [0.3, MW_AQ_AMBER], [0.6, MW_AQ_RED]] },
    hcho: { name: "Formaldeído", unit: "mg/m³", min: 0, max: 0.3,
            steps: [[0, MW_AQ_GREEN], [0.08, MW_AQ_AMBER], [0.1, MW_AQ_RED]] },
    pm25: { name: "PM2.5", unit: "µg/m³", min: 0, max: 150,
            steps: [[0, MW_AQ_GREEN], [12, MW_AQ_AMBER], [35, MW_AQ_RED]] },
  };
  // apelidos: o que o dono e as integrações chamam a mesma grandeza
  const MW_AQ_ALIAS = {
    carbon_dioxide: "co2", dioxido_de_carbono: "co2", co2: "co2",
    voc: "tvoc", vocs: "tvoc", tvoc: "tvoc", volatile_organic_compounds: "tvoc",
    formaldeido: "hcho", formaldehyde: "hcho", hcho: "hcho", ch2o: "hcho",
    pm25: "pm25", "pm2_5": "pm25", "pm2.5": "pm25", particulate_matter: "pm25",
  };

  const mwAirKind = (kind) => {
    const k = String(kind || "").toLowerCase().trim();
    return MW_AQ_ALIAS[k] || (MW_AQ_SCALE[k] ? k : null);
  };

  // Cor do degrau: o último degrau cujo valor de início já foi alcançado.
  // Abaixo do primeiro degrau ainda é "bom" (0 ppm de CO₂ não existe na
  // prática, mas sensor mudo reportando 0 não deve pintar de vermelho).
  const mwAirColor = (kind, value, alpha) => {
    const k = mwAirKind(kind);
    if (!k) return null;
    const v = Number(value);
    if (!Number.isFinite(v)) return null;
    const steps = MW_AQ_SCALE[k].steps;
    let hex = steps[0][1];
    for (const [from, color] of steps) { if (v >= from) hex = color; }
    return mwAirRgba(hex, alpha);
  };

  // "bom" | "atencao" | "ruim" — para quem precisa do nível, não da cor
  // (ícone, texto, ordenação, automação).
  const MW_AQ_LEVELS = ["bom", "atencao", "ruim"];
  const mwAirLevel = (kind, value) => {
    const k = mwAirKind(kind);
    if (!k) return null;
    const v = Number(value);
    if (!Number.isFinite(v)) return null;
    const steps = MW_AQ_SCALE[k].steps;
    let i = 0;
    steps.forEach(([from], idx) => { if (v >= from) i = idx; });
    return MW_AQ_LEVELS[i];
  };

  // #rrggbb → rgba(...) quando pedem alfa; sem alfa devolve o hex intacto,
  // que é o que os gauges nativos já usam.
  const mwAirRgba = (hex, alpha) => {
    const a = Number(alpha);
    if (!Number.isFinite(a)) return hex;
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex));
    if (!m) return hex;
    const n = parseInt(m[1], 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  };

  // Degraus no formato do custom:modern-circular-gauge (e do type: gauge
  // nativo, que lê `severity`). Mesma saída do `segmentos()` do Python.
  const mwAirSegments = (kind) => {
    const k = mwAirKind(kind);
    if (!k) return null;
    return MW_AQ_SCALE[k].steps.map(([from, color]) => ({ from, color }));
  };
  // <<< mw-air-quality-scale v1

  // >>> mw-level-scale v1 — fonte canônica: /Volumes/SSD-T1-01/CLAUDE-SSD/IA/lib/mw-level-scale/mw-level-scale.js
  // Escalas de nível: iluminância (lx) e bateria (%).
  // Doc: IA/knowledge/escala-de-iluminancia.md.
  const MW_LEVEL_ALPHA = 0.5;

  // --- ILUMINÂNCIA -------------------------------------------------------
  // Limites SUPERIORES inclusivos, do mais escuro para o mais claro. Os
  // degraus crescem em razão ~3-4x porque a percepção de luz é logarítmica:
  // a diferença entre 0 e 20 lx muda a vida do morador, a diferença entre
  // 800 e 1200 lx não muda nada. Os números saíram do que os sensores da
  // casa realmente reportam (medição de 2026-09-02: 0, 4, 6, 8, 10, 20, 31,
  // 35 lx; remedição de 2026-09-06 com 15 sensores: p50 = 10, p90 = 96,
  // max = 180) — a vida útil da escala está toda abaixo de 200 lx, e uma
  // escala linear até 1000 pintaria a casa inteira da mesma cor.
  // A cor é azul-noite -> âmbar de sol, e NÃO é a rampa de temperatura de
  // propósito: quem olha a planta térmica e a planta de luz lado a lado não
  // pode confundir as duas.
  const MW_LUX_STOPS = [0.9, 5, 20, 80, 250, 800];
  const MW_LUX_RGB = [
    "10, 14, 30",     // escuro — noite, olho adaptado
    "40, 48, 90",     // penumbra — dá para andar
    "70, 90, 150",    // luz fraca — TV, abajur
    "120, 160, 210",  // luz de ambiente
    "190, 215, 235",  // claro — leitura confortável
    "245, 235, 170",  // muito claro — luz de tarefa
    "255, 214, 90",   // sol entrando
  ];

  // --- BATERIA -----------------------------------------------------------
  // Limites SUPERIORES inclusivos, em %. Ruim -> bom, vermelho -> verde.
  // `canonica`: a régua documentada na página de iluminância, usada pelo
  // mw-ha-state-color-element. Quatro degraus.
  const MW_BAT_CANON_STOPS = [10, 20, 40, 60];
  const MW_BAT_CANON_RGB = [
    "219, 68, 55",   // <=10 % — troque hoje
    "255, 140, 0",   // <=20 % — troque esta semana
    "255, 166, 0",   // <=40 % — de olho
    "154, 205, 50",  // <=60 % — tranquilo
    "67, 160, 71",   // acima — cheia
  ];
  // `fina`: a régua do mw-ha-rainbow-card. Cinco degraus — separa "quase
  // morta" (<=5 %) de "morrendo" (<=20 %) e ainda enxerga o topo da carga
  // (<=80 %), que num arco-íris de 8 dispositivos lado a lado é o que deixa
  // ver qual pilha vai cair primeiro.
  const MW_BAT_FINA_STOPS = [5, 20, 40, 60, 80];
  const MW_BAT_FINA_RGB = [
    "139, 0, 0",     // <=5 %  — quase morta
    "229, 57, 53",   // <=20 % — morrendo
    "255, 152, 0",   // <=40 % — de olho
    "253, 216, 53",  // <=60 % — ainda dá
    "156, 204, 101", // <=80 % — tranquilo
    "67, 160, 71",   // acima  — cheia
  ];

  const MW_LEVEL_ALIAS = {
    lux: "lux", lx: "lux", illuminance: "lux", iluminancia: "lux", luz: "lux",
    battery: "battery", bateria: "battery", bat: "battery",
    battery_fina: "battery_fina", bateria_fina: "battery_fina", fina: "battery_fina",
    battery_canonica: "battery", bateria_canonica: "battery", canonica: "battery",
  };

  const mwLevelRgba = (triplet, alpha) =>
    `rgba(${triplet}, ${alpha === undefined || alpha === null ? MW_LEVEL_ALPHA : alpha})`;

  const MW_LEVEL_TABLES = {
    lux: { stops: MW_LUX_STOPS, rgb: MW_LUX_RGB, clamp: null, unit: "lx", decimals: 0 },
    battery: { stops: MW_BAT_CANON_STOPS, rgb: MW_BAT_CANON_RGB, clamp: [0, 100], unit: "%", decimals: 0 },
    battery_fina: { stops: MW_BAT_FINA_STOPS, rgb: MW_BAT_FINA_RGB, clamp: [0, 100], unit: "%", decimals: 0 },
  };

  const mwLevelKind = (kind) => {
    const k = String(kind || "").toLowerCase().trim();
    return MW_LEVEL_ALIAS[k] || (MW_LEVEL_TABLES[k] ? k : null);
  };

  // Devolve {stops, colors, clamp} — a mesma forma que mwClimateScale, para
  // que o consumidor tenha um caminho de pintura só. Limite SUPERIOR
  // inclusivo: a cor é a da primeira faixa cujo limite não foi ultrapassado.
  const mwLevelScale = (kind, alpha) => {
    const k = mwLevelKind(kind);
    if (!k) return null;
    const t = MW_LEVEL_TABLES[k];
    return {
      stops: t.stops.slice(),
      colors: t.rgb.map((c) => mwLevelRgba(c, alpha)),
      clamp: t.clamp ? t.clamp.slice() : null,
    };
  };

  // Vazio/nulo NÃO é zero. Number("") e Number(null) devolvem 0, e um sensor
  // sem leitura acabaria pintado como 0 lx (o degrau mais escuro) ou 0 % de
  // pilha (o mais vermelho) em vez de cair na cor de "sem leitura" do
  // consumidor. A guarda mora aqui para nenhum consumidor ter de lembrar.
  const mwLevelNum = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const v = Number(value);
    return Number.isFinite(v) ? v : null;
  };

  const mwLevelColor = (kind, value, alpha) => {
    const s = mwLevelScale(kind, alpha);
    if (!s) return null;
    let v = mwLevelNum(value);
    if (v === null) return null;
    if (s.clamp) v = Math.min(Math.max(v, s.clamp[0]), s.clamp[1]);
    const i = s.stops.findIndex((stop) => v <= stop);
    return s.colors[i === -1 ? s.stops.length : i];
  };
  // <<< mw-level-scale v1

  // >>> mw-electrical-scale v1 — fonte canônica: /Volumes/SSD-T1-01/CLAUDE-SSD/IA/lib/mw-electrical-scale/mw-electrical-scale.js
  // Escala canônica de cor para potência, consumo, tensão e corrente.
  // Regra: IA/rules/global/180-cores-de-grandezas-eletricas.md.
  const MW_EL_ALPHA = 0.85;

  // --- unidades ----------------------------------------------------------
  // Normaliza para a unidade-base da grandeza: W, kWh, V, A. Devolve
  // {value, unit, kind}; `kind` é null quando a unidade não é elétrica.
  // Sem este passo, sensor em mV/mA/Wh cai na régua errada em silêncio.
  const MW_EL_UNITS = {
    w: ["power", 1, "W"], kw: ["power", 1e3, "W"],
    va: ["power", 1, "W"], kva: ["power", 1e3, "W"],
    wh: ["energy", 1e-3, "kWh"], kwh: ["energy", 1, "kWh"], mwh: ["energy", 1e3, "kWh"],
    v: ["voltage", 1, "V"], mv: ["voltage", 1e-3, "V"], kv: ["voltage", 1e3, "V"],
    a: ["current", 1, "A"], ma: ["current", 1e-3, "A"],
  };
  // Fora da tabela de propósito: "MW" e "mW" viram a mesma chave ao baixar a
  // caixa (megawatt × miliwatt, fator 1e9 de diferença) e nenhuma casa tem as
  // duas para desempatar. Unidade ambígua fica com kind null — o consumidor
  // pinta como "sem escala" em vez de errar por 9 ordens de grandeza.
  // Vazio/nulo NÃO é zero: Number("") e Number(null) devolvem 0, e um sensor
  // sem leitura acabaria pintado como "0 W, desligado" ou "0 V, crítica" em
  // vez de cair na cor de "sem leitura" do consumidor.
  const mwElNum = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const v = Number(value);
    return Number.isFinite(v) ? v : null;
  };
  const mwElectricalUnit = (unit, value) => {
    const u = String(unit || "").trim().toLowerCase();
    const hit = MW_EL_UNITS[u];
    const v = mwElNum(value);
    if (!hit || v === null) return { value: v, unit: unit || "", kind: null };
    return { value: v * hit[1], unit: hit[2], kind: hit[0] };
  };

  // --- TENSÃO: PRODIST módulo 8 (ANEEL) ----------------------------------
  // Pontos de conexão em tensão nominal igual ou inferior a 1 kV. São
  // QUATRO zonas, não cinco: acima da faixa adequada a norma vai direto para
  // crítica — não existe "precária alta" nesta faixa de tensão.
  //
  //   220 V  adequada 202..231 · precária 191..201 · crítica <191 ou >231
  //   127 V  adequada 117..133 · precária 110..116 · crítica <110 ou >133
  //
  // Limites SUPERIORES inclusivos (a forma que os consumidores já usam), com
  // o mesmo truque de .99 do mw-climate-scale para não deixar vão sem dono
  // entre 190,99 e 191.
  const MW_EL_BLUE = "41, 55, 140";    // crítica baixa — afundou
  const MW_EL_AMBER = "255, 166, 0";   // precária — atenção (cor de atenção da casa)
  const MW_EL_GREEN = "67, 160, 71";   // adequada — cor de "tudo bem" da casa
  const MW_EL_RED = "219, 68, 55";     // crítica alta — cor de problema da casa
  const MW_PRODIST = {
    220: { stops: [190.99, 201.99, 231], adequada: [202, 231] },
    127: { stops: [109.99, 116.99, 133], adequada: [117, 133] },
  };
  const MW_PRODIST_RGB = [MW_EL_BLUE, MW_EL_AMBER, MW_EL_GREEN, MW_EL_RED];

  // Célula de pilha (CR2032, AA, AAA num nó Zigbee): 3 V nominais. Não é
  // rede elétrica e não se mede pelo PRODIST — mas chega no mesmo
  // device_class `voltage`, então precisa de régua própria.
  const MW_CELL_STOPS = [2.4, 2.6, 2.8, 3.0];
  const MW_CELL_RGB = ["219, 68, 55", "255, 140, 0", "255, 166, 0", "154, 205, 50", "67, 160, 71"];

  // Escolhe a régua pelo próprio valor já normalizado em V. Abaixo de 60 V
  // não é rede de casa nenhuma: é pilha. Entre as duas nominais, ganha a
  // mais próxima.
  const mwVoltageNominal = (volts) => {
    const v = Number(volts);
    if (!Number.isFinite(v)) return null;
    if (v < 60) return "cell";
    return Math.abs(v - 127) <= Math.abs(v - 220) ? 127 : 220;
  };

  const mwElRgba = (triplet, alpha) =>
    `rgba(${triplet}, ${alpha === undefined || alpha === null ? MW_EL_ALPHA : alpha})`;

  const mwVoltageScale = (nominal, alpha) => {
    if (String(nominal) === "cell") {
      return { stops: MW_CELL_STOPS.slice(), colors: MW_CELL_RGB.map((c) => mwElRgba(c, alpha)), clamp: null };
    }
    const t = MW_PRODIST[Number(nominal)] || MW_PRODIST[220];
    return { stops: t.stops.slice(), colors: MW_PRODIST_RGB.map((c) => mwElRgba(c, alpha)), clamp: null };
  };

  // --- POTÊNCIA (W) ------------------------------------------------------
  // Degraus logarítmicos, pela mesma razão da iluminância: a casa vive
  // embaixo (medição de 2026-09-06 em 63 sensores: p50 = 0 W, p90 = 111 W,
  // max = 474 W) e uma régua linear até 5 kW pintaria tudo da mesma cor.
  // O degrau `<= 0` existe para desligado ter cor própria — com p50 = 0,
  // metade da casa cai nele, e distinguir "apagado" de "quase nada" é a
  // informação mais útil da faixa.
  const MW_POWER_STOPS = [0, 1, 10, 50, 200, 1000];
  const MW_POWER_RGB = [
    "55, 60, 78",     // 0 W — desligado
    "86, 66, 130",    // <=1 W — vampiro de tomada
    "128, 71, 158",   // <=10 W — LED, carregador
    "186, 78, 145",   // <=50 W — TV, notebook
    "226, 106, 96",   // <=200 W — geladeira, bomba pequena
    "243, 156, 53",   // <=1 kW — ferro, cafeteira
    "250, 205, 55",   // acima — chuveiro, forno
  ];
  const mwPowerScale = (alpha) => ({
    stops: MW_POWER_STOPS.slice(),
    colors: MW_POWER_RGB.map((c) => mwElRgba(c, alpha)),
    clamp: null,
  });

  // --- CORRENTE (A) ------------------------------------------------------
  // Sem faixa absoluta possível: 2 A é muito num circuito de iluminação e
  // pouco num de chuveiro. A régua é RELATIVA ao limite do circuito (`max`,
  // em A), nas mesmas frações da rampa de potência.
  const MW_CURRENT_FRACTIONS = [0, 0.02, 0.1, 0.3, 0.6, 0.85];
  const mwCurrentScale = (max, alpha) => {
    const m = Number(max) > 0 ? Number(max) : 20;
    return {
      stops: MW_CURRENT_FRACTIONS.map((f) => f * m),
      colors: MW_POWER_RGB.map((c) => mwElRgba(c, alpha)),
      clamp: null,
    };
  };

  // --- CONSUMO (kWh) -----------------------------------------------------
  // Acumulado não tem faixa natural: na casa há sensores de 0 a 120.590 kWh
  // no mesmo instante. A régua é RELATIVA a um máximo — por padrão o maior
  // valor entre as leituras da própria tela, o que transforma a faixa numa
  // comparação entre ambientes em vez de num julgamento absoluto.
  // Rampa sequencial de um tom só (claro -> escuro), que é o desenho certo
  // para grandeza acumulada e não colide com nenhuma das outras rampas.
  const MW_ENERGY_FRACTIONS = [0, 0.2, 0.4, 0.6, 0.8];
  const MW_ENERGY_RGB = [
    "255, 236, 179",
    "255, 213, 79",
    "255, 179, 0",
    "239, 124, 0",
    "191, 74, 0",
    "120, 40, 10",
  ];
  const mwEnergyScale = (max, alpha) => {
    const m = Number(max) > 0 ? Number(max) : 1;
    return {
      stops: MW_ENERGY_FRACTIONS.map((f) => f * m),
      colors: MW_ENERGY_RGB.map((c) => mwElRgba(c, alpha)),
      clamp: null,
    };
  };

  // Atalho: cor direta, para quem não quer a tabela. `opts` aceita
  // {nominal, max, alpha}. Sempre normaliza a unidade antes.
  const mwElectricalColor = (kind, value, unit, opts) => {
    const o = opts || {};
    const n = mwElectricalUnit(unit, value);
    const k = n.kind || String(kind || "").toLowerCase();
    if (n.value === null) return null;
    let s = null;
    if (k === "voltage") s = mwVoltageScale(o.nominal || mwVoltageNominal(n.value), o.alpha);
    else if (k === "power") s = mwPowerScale(o.alpha);
    else if (k === "current") s = mwCurrentScale(o.max, o.alpha);
    else if (k === "energy") s = mwEnergyScale(o.max, o.alpha);
    if (!s) return null;
    const i = s.stops.findIndex((stop) => n.value <= stop);
    return s.colors[i === -1 ? s.stops.length : i];
  };
  // <<< mw-electrical-scale v1

  /* ---------------------------- cor por faixa ---------------------------- */

  const parseColor = (str) => {
    const s = String(str || "").trim();
    let m = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i);
    if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
    m = s.match(/^#([0-9a-f]{6})$/i);
    if (m) { const n = parseInt(m[1], 16); return { r: n >> 16, g: (n >> 8) & 255, b: n & 255, a: 1 }; }
    m = s.match(/^#([0-9a-f]{3})$/i);
    if (m) { const [r, g, b] = m[1].split("").map((x) => parseInt(x + x, 16)); return { r, g, b, a: 1 }; }
    return { r: 128, g: 128, b: 128, a: 1 };
  };
  const toHex = ({ r, g, b }) => "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
  const toRgba = ({ r, g, b, a }) => `rgba(${r}, ${g}, ${b}, ${a})`;
  const mix = (c1, c2, t) => toRgba({
    r: Math.round(c1.r + (c2.r - c1.r) * t),
    g: Math.round(c1.g + (c2.g - c1.g) * t),
    b: Math.round(c1.b + (c2.b - c1.b) * t),
    a: +(c1.a + (c2.a - c1.a) * t).toFixed(3),
  });

  // Uma escala é { stops, colors, clamp }: N limites superiores → N+1 cores.
  // Com blend, o valor caminha entre as cores âncora (o centro de cada faixa);
  // sem blend, cada faixa é uma cor seca — como no button-card.
  const bandColor = (value, scale, blend) => {
    // `Number(null)` é 0 — sem esta guarda, sensor sem leitura viraria 0 °C e
    // pintaria de preto (a ponta fria da escala) em vez de cair no cinza de
    // indisponível. Vale para "" e para null/undefined.
    if (value === null || value === undefined || value === "") return null;
    let v = Number(value);
    if (!Number.isFinite(v)) return null;
    const { stops, colors } = scale;
    if (scale.clamp) v = Math.min(scale.clamp[1], Math.max(scale.clamp[0], v));
    // Duas semânticas de degrau convivem na casa. Clima, iluminância, bateria
    // e as elétricas usam limite SUPERIOR inclusivo (`v <= s`). A escala de
    // qualidade do ar (regra 90) usa limite INFERIOR (`v >= from`): 800 ppm de
    // CO₂ JÁ é atenção. Tratar as duas igual faria 810 ppm pintar de verde.
    let band;
    if (scale.lower) {
      band = 0;
      for (let i = 0; i < stops.length; i += 1) if (v >= stops[i]) band = i + 1;
      // Semáforo não se interpola: entre "bom" e "atenção" não existe meio
      // termo que signifique alguma coisa, e a regra 90 é ternária de
      // propósito. Faixa de ar ignora o blend da escala e fica seca.
      return colors[band];
    }
    band = stops.findIndex((s) => v <= s);
    if (band === -1) band = stops.length;
    if (!blend) return colors[band];
    const widths = [];
    for (let i = 1; i < stops.length; i += 1) widths.push(stops[i] - stops[i - 1]);
    const w = widths.length ? widths.reduce((a, b) => a + b, 0) / widths.length : 1;
    const anchors = colors.map((_, i) => {
      if (i === 0) return stops[0] - w / 2;
      if (i === colors.length - 1) return stops[stops.length - 1] + w / 2;
      return (stops[i - 1] + stops[i]) / 2;
    });
    if (v <= anchors[0]) return colors[0];
    if (v >= anchors[anchors.length - 1]) return colors[colors.length - 1];
    for (let i = 1; i < anchors.length; i += 1) {
      if (v <= anchors[i]) {
        const t = (v - anchors[i - 1]) / (anchors[i] - anchors[i - 1] || 1);
        return mix(parseColor(colors[i - 1]), parseColor(colors[i]), t);
      }
    }
    return colors[colors.length - 1];
  };

  // A escala canônica não muda: monta uma vez por opacidade e reusa.
  const scaleCache = {};
  const cached = (key, build) => scaleCache[key] || (scaleCache[key] = build());

  // Rampa comum de "ruim → bom" para bateria, RSSI e LQI. Não é escala
  // canônica da casa (essa só existe para clima) — é a mesma paleta de bateria
  // dos outros cards MW, esticada em seis degraus.
  const RAMP = ["139,0,0", "229,57,53", "255,152,0", "253,216,53", "156,204,101", "67,160,71"];
  const rampScale = (stops, clamp, alpha) => ({
    stops,
    colors: RAMP.map((t) => mwClimateRgba(t, alpha)),
    clamp,
  });

  /* ------------------------------ grandezas ------------------------------ */

  const METRICS = {
    temperature: {
      label: "Temperatura", icon: "mdi:thermometer", dc: "temperature",
      unit: "°C", decimals: 1,
      scale: (a) => cached(`temp:${a}`, () => mwClimateScale("temp", a)),
    },
    humidity: {
      label: "Umidade", icon: "mdi:water-percent", dc: "humidity",
      unit: "%", decimals: 0,
      scale: (a) => cached(`hum:${a}`, () => mwClimateScale("hum", a)),
    },
    battery: {
      label: "Bateria", icon: "mdi:battery", dc: "battery",
      unit: "%", decimals: 0,
      // Duas réguas, nomeadas (ver IA/lib/mw-level-scale): a `fina` é a deste
      // card desde sempre — separa "quase morta" (<=5 %) de "morrendo" e
      // enxerga o topo da carga, que num arco-íris de 8 dispositivos é o que
      // deixa ver qual pilha cai primeiro. A `canonica` é a do
      // mw-ha-state-color-element. O padrão continua `fina` para não mudar a
      // cor de nenhuma tela que já está no ar.
      scale: (a, b) => {
        const k = String((b && b.scale) || "fina") === "canonica" ? "battery" : "battery_fina";
        return cached(`bat:${k}:${a}`, () => mwLevelScale(k, a));
      },
    },
    rssi: {
      label: "RSSI", icon: "mdi:wifi", dc: "signal_strength", hint: ["_rssi", "_signal_strength"],
      unit: "dBm", decimals: 0,
      scale: (a) => cached(`rssi:${a}`, () => rampScale([-90, -80, -70, -60, -50], [-120, -20], a)),
    },
    lqi: {
      label: "LQI", icon: "mdi:access-point", dc: null,
      hint: ["_lqi", "_linkquality", "_link_quality", "_qualidade_do_link"],
      unit: "", decimals: 0,
      scale: (a) => cached(`lqi:${a}`, () => rampScale([50, 100, 150, 200, 240], [0, 255], a)),
    },
  };
  // --- qualidade do ar (regra 90) -----------------------------------------
  // Adapta os degraus do bloco canônico, que são limite INFERIOR, para a
  // forma {stops, colors} que o bandColor consome — marcados com `lower`.
  const airScale = (kind, alpha) => cached(`air:${kind}:${alpha}`, () => {
    const steps = MW_AQ_SCALE[kind].steps;
    return {
      stops: steps.slice(1).map(([from]) => from),
      colors: steps.map(([, hex]) => mwAirRgba(hex, alpha)),
      clamp: null,
      lower: true,
    };
  });
  const airMetric = (kind, label, icon, dc, hint, decimals) => ({
    label, icon, dc, hint, unit: MW_AQ_SCALE[kind].unit, decimals, air: true,
    scale: (a) => airScale(kind, a),
  });

  // Sete dos dez sensores de ar da casa NÃO têm device_class (medição de
  // 2026-09-06): VOC e formaldeído dos Tuya 3-em-1 e o PM2.5 do purificador
  // chegam com device_class nulo. Descoberta por classe acharia só o CO₂ —
  // por isso estas grandezas se descobrem por PISTA no fim do id, e a pista
  // só vale com a unidade batendo (ver `servesMetric`).
  Object.assign(METRICS, {
    illuminance: {
      label: "Iluminância", icon: "mdi:brightness-5", dc: "illuminance",
      unit: "lx", decimals: 0,
      scale: (a) => cached(`lux:${a}`, () => mwLevelScale("lux", a)),
    },
    power: {
      label: "Potência", icon: "mdi:flash", dc: "power",
      unit: "W", decimals: 1,
      scale: (a) => cached(`pow:${a}`, () => mwPowerScale(a)),
    },
    energy: {
      label: "Consumo", icon: "mdi:lightning-bolt", dc: "energy",
      unit: "kWh", decimals: 2, relative: true,
      // Acumulado não tem faixa: a régua é o maior valor da própria faixa
      // (ou `max:` no YAML). Construída UMA vez por render, não por célula.
      scale: (a, b, st) => mwEnergyScale(num(b && b.max, (st && st.max) || 1), a),
    },
    voltage: {
      label: "Tensão", icon: "mdi:sine-wave", dc: "voltage",
      unit: "V", decimals: 1,
      scale: (a, b) => cached(`v:${a}:${volNominal(b) || 220}`,
        () => mwVoltageScale(volNominal(b) || 220, a)),
      // Com nominal automático a régua é escolhida por CÉLULA: no mesmo
      // device_class `voltage` convivem a rede (220 V) e a célula de pilha
      // Zigbee (3 V). Sem isso toda pilha cheia pinta de sobretensão crítica.
      cellScale: (a, b, v) => (volNominal(b) || v === null ? null
        : cached(`v:${a}:${mwVoltageNominal(v)}`,
          () => mwVoltageScale(mwVoltageNominal(v), a))),
    },
    current: {
      label: "Corrente", icon: "mdi:current-ac", dc: "current",
      unit: "A", decimals: 2, relative: true,
      scale: (a, b) => cached(`cur:${a}:${num(b && b.max, 20)}`,
        () => mwCurrentScale(num(b && b.max, 20), a)),
    },
    co2: airMetric("co2", "CO₂", "mdi:molecule-co2", "carbon_dioxide",
      ["_dioxido_de_carbono", "_carbon_dioxide", "_co2"], 0),
    tvoc: airMetric("tvoc", "TVOC", "mdi:air-filter", "volatile_organic_compounds_parts",
      ["_vocs", "_voc", "_tvoc"], 2),
    hcho: airMetric("hcho", "Formaldeído", "mdi:flask-outline", null,
      ["_formaldeido", "_formaldehyde", "_hcho", "_ch2o"], 2),
    pm25: airMetric("pm25", "PM2.5", "mdi:blur", "pm25",
      ["_pm25", "_pm2_5", "_pm2"], 0),
  });

  // Tensão nominal declarada na faixa; vazio ou "auto" devolve null e manda
  // escolher por célula.
  function volNominal(band) {
    const n = band && band.nominal;
    if (n === undefined || n === null || n === "" || String(n) === "auto") return null;
    return String(n) === "cell" ? "cell" : (Number(n) || null);
  }

  // Unidades que cada grandeza aceita quando a descoberta é por pista. A
  // pista sozinha é perigosa: a casa tem
  // `sensor.electricity_maps_intensidade_de_co2` (gCO2eq/kWh), que é a pegada
  // de carbono da REDE ELÉTRICA e não o ar da sala.
  const METRIC_UNITS = {
    co2: ["ppm"], tvoc: ["ppm", "ppb", "mg/m³"], hcho: ["mg/m³", "ppm", "ppb"],
    pm25: ["µg/m³", "ug/m³", "μg/m³", ""],
    illuminance: ["lx", "lux"], power: ["w", "kw", "va", "kva"],
    energy: ["wh", "kwh", "mwh"], voltage: ["v", "mv", "kv"], current: ["a", "ma"],
  };

  const METRIC_KEYS = Object.keys(METRICS);
  // Chaves antigas de entidade por seção. Continuam válidas: quem já tem
  // `temp_entity` no YAML não precisa reescrever nada. O jeito novo é o mapa
  // `entities: {<grandeza>: <entity_id>}`, que não cresce uma chave de topo
  // por grandeza nova.
  const ENTITY_KEY = { temperature: "temp_entity", humidity: "hum_entity", battery: "battery_entity", rssi: "rssi_entity", lqi: "lqi_entity" };

  // luminância relativa (sRGB) — decide texto escuro ou claro sobre a faixa
  const isLight = (color) => {
    const { r, g, b } = parseColor(color);
    const ch = [r, g, b].map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2] > 0.45;
  };

  /* ------------- descoberta de entidades (card e editor usam) ------------- */

  const hasClass = (hass, id, dc) => hass.states[id]?.attributes?.device_class === dc;
  const friendly = (hass, id) => hass.states[id]?.attributes?.friendly_name || id;
  const deviceOf = (hass, id) => hass?.entities?.[id]?.device_id || "";

  const deviceName = (hass, devId) => {
    const d = hass?.devices?.[devId];
    if (!d) return devId;
    const area = d.area_id && hass.areas?.[d.area_id]?.name;
    return (d.name_by_user || d.name || devId) + (area ? ` · ${area}` : "");
  };

  // Dispositivos que servem a alguma das grandezas pedidas — a fonte natural
  // de uma seção. Antes eram só os de temperatura/umidade, e uma tomada com
  // medição de potência não aparecia na lista do editor.
  const metricDevices = (hass, metrics) => {
    if (!hass?.entities || !hass?.devices) return [];
    const ms = (metrics && metrics.length) ? metrics : ["temperature", "humidity"];
    const ids = new Set();
    for (const id of Object.keys(hass.states)) {
      if (!id.startsWith("sensor.")) continue;
      if (!ms.some((m) => servesMetric(hass, id, m))) continue;
      const d = deviceOf(hass, id);
      if (d) ids.add(d);
    }
    return [...ids]
      .map((d) => ({ value: d, label: deviceName(hass, d) }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  };
  const climateDevices = (hass) => metricDevices(hass, ["temperature", "humidity"]);

  // Uma entidade serve à grandeza se a classe bate ou se o id termina numa das
  // pistas. Nada de "qualquer sensor do dispositivo": um dispositivo sem LQI
  // acabaria exibindo a temperatura dele como se fosse LQI.
  const ownSensors = (hass, devId) => (devId && hass.entities
    ? Object.keys(hass.entities).filter((id) => hass.entities[id].device_id === devId
      && id.startsWith("sensor.") && hass.states[id])
    : []);

  const unitOf = (hass, id) =>
    String(hass.states?.[id]?.attributes?.unit_of_measurement ?? "").trim().toLowerCase();

  // A pista sozinha é perigosa. A casa tem
  // `sensor.electricity_maps_intensidade_de_co2`, que termina em "_co2" e é a
  // pegada de carbono da REDE ELÉTRICA (gCO2eq/kWh), não o ar da sala. Ele
  // entraria numa faixa de CO₂ e pintaria "ar excelente" com 231 — um número
  // que não é do ar. A unidade é o que separa os dois.
  const unitServes = (hass, id, metric) => {
    const allowed = METRIC_UNITS[metric];
    if (!allowed) return true;
    const u = unitOf(hass, id);
    return allowed.some((a) => String(a).toLowerCase() === u);
  };

  const servesMetric = (hass, id, metric) => {
    const m = METRICS[metric] || {};
    if (m.dc && hasClass(hass, id, m.dc)) return true;
    const hints = m.hint ? [].concat(m.hint) : [];
    if (!hints.some((h) => id.endsWith(h))) return false;
    return unitServes(hass, id, metric);
  };

  // Lista para o select do editor: a do dispositivo primeiro; se ele não tem
  // nenhuma daquela grandeza, mostra o que houver para não deixar o campo vazio
  // — mas essa queda é só da interface, nunca da descoberta automática.
  const sensorsFor = (hass, devId, metric) => {
    const own = ownSensors(hass, devId);
    let list = own.filter((id) => servesMetric(hass, id, metric));
    if (!list.length) {
      list = Object.keys(hass.states)
        .filter((id) => id.startsWith("sensor.") && servesMetric(hass, id, metric));
    }
    if (!list.length) list = own.length ? own : Object.keys(hass.states).filter((id) => id.startsWith("sensor."));
    return list
      .map((id) => ({ value: id, label: `${friendly(hass, id)} (${id})` }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  };

  // Descoberta automática: estrita. Sem entidade que sirva à grandeza naquele
  // dispositivo, devolve vazio — a célula fica cinza e honesta.
  const autoEntity = (hass, devId, metric) => {
    if (!hass || !devId) return "";
    return ownSensors(hass, devId)
      .filter((id) => servesMetric(hass, id, metric))
      .sort()[0] || "";
  };

  // O HA troca o objeto hass a cada leitura que chega, mas mantém as mesmas
  // referências de registro. As listas do editor só mudam quando o registro
  // muda — é isso que separa "chegou uma temperatura nova" de "nasceu um
  // dispositivo novo".
  const sameRegistry = (a, b) => !!a && !!b
    && a.entities === b.entities && a.devices === b.devices && a.areas === b.areas
    && Object.keys(a.states || {}).length === Object.keys(b.states || {}).length;

  const normSections = (raw) => (Array.isArray(raw) ? raw : []).map((s) =>
    (typeof s === "string" ? { device: s } : { ...(s || {}) }));

  const normBands = (raw) => {
    const list = (Array.isArray(raw) ? raw : []).map((b) =>
      (typeof b === "string" ? { metric: b } : { ...(b || {}) }))
      .filter((b) => METRICS[b.metric]);
    return list.length ? list : [{ metric: "temperature" }];
  };

  /* ------------------------------- CARD ------------------------------- */

  class MwRainbowCard extends HTMLElement {
    setConfig(config) {
      const sections = normSections(config?.sections);
      if (!sections.length) {
        throw new Error("mw-rainbow-card: informe ao menos uma seção em 'sections'");
      }
      const bands = normBands(config?.bands);
      if (!bands.length) {
        throw new Error("mw-rainbow-card: informe ao menos uma faixa em 'bands'");
      }
      this._user = { ...config };
      this._config = { ...DEFAULTS, ...migrateDepth(config || {}), sections, bands };
      this._key = null;
      if (this._hass) this._render();
    }

    set hass(hass) {
      this._hass = hass;
      if (!this._config) return;
      const key = this._cells().map((c) => (c.id && hass.states[c.id] ? hass.states[c.id].state : "·")).join("|");
      if (key !== this._key) { this._key = key; this._render(); }
    }

    getCardSize() {
      const c = this._config || DEFAULTS;
      if (c.orientation === "vertical") return Math.max(1, Math.ceil(num(c.length, 260) / 50));
      return Math.max(1, Math.ceil((c.bands || []).length * (num(c.band_height, 34) + num(c.band_gap, 4)) / 50));
    }

    static getConfigElement() { return document.createElement("mw-rainbow-card-editor"); }

    static getStubConfig(hass) {
      const devs = climateDevices(hass).slice(0, 3);
      return {
        sections: devs.length ? devs.map((d) => ({ device: d.value })) : [{ device: "" }],
        bands: [{ metric: "temperature" }, { metric: "humidity" }],
      };
    }

    // entidade de uma seção para uma grandeza: explícita > descoberta pelo device
    _entityOf(section, metric) {
      const explicit = (section.entities && section.entities[metric])
        || (ENTITY_KEY[metric] ? section[ENTITY_KEY[metric]] : "");
      if (explicit) return explicit;
      if (!section.device || !this._hass) return "";
      const k = `${section.device}|${metric}`;
      this._auto = this._auto || {};
      if (!(k in this._auto)) this._auto[k] = autoEntity(this._hass, section.device, metric);
      return this._auto[k];
    }

    // todas as entidades em jogo — usado para decidir se vale re-renderizar
    _cells() {
      const c = this._config;
      const out = [];
      for (const b of c.bands) {
        for (const s of c.sections) out.push({ id: this._entityOf(s, b.metric) });
      }
      return out;
    }

    _sectionName(section, i) {
      if (section.name) return section.name;
      if (section.device && this._hass?.devices?.[section.device]) {
        const d = this._hass.devices[section.device];
        return d.name_by_user || d.name || `Seção ${i + 1}`;
      }
      const id = METRIC_KEYS.map((m) => this._entityOf(section, m)).find(Boolean);
      const fn = id ? friendly(this._hass, id) : "";
      return String(fn).replace(/\s*(temperatura|temperature|umidade|humidity|bateria|battery|rssi|lqi|ilumin[aâ]ncia|illuminance|pot[eê]ncia|power|consumo|energy|tens[aã]o|voltage|corrente|current|co2|di[oó]xido de carbono|vocs?|tvoc|formalde[ií]do|pm2\\.?5)\s*$/i, "").trim()
        || fn || `Seção ${i + 1}`;
    }

    // Devolve o texto que vai na tela E o número que vai na escala — que
    // NÃO são a mesma coisa. A tela mostra o que a entidade reporta, na
    // unidade dela (é regra da família: unidade vem da entidade, nunca do
    // código). A cor usa o valor convertido para a unidade-base da grandeza,
    // porque no mesmo device_class convivem V e mV, mA e A, Wh e kWh — e sem
    // converter, uma pilha Zigbee de 3097 mV entra na régua da rede e pinta
    // de sobretensão crítica.
    _value(entityId, metric) {
      const m = METRICS[metric];
      const st = entityId ? this._hass.states[entityId] : null;
      if (!st) return { text: "—", num: null, snum: null, unit: m.unit };
      const n = Number.parseFloat(st.state);
      const unit = st.attributes?.unit_of_measurement ?? m.unit;
      if (!Number.isFinite(n)) return { text: "—", num: null, snum: null, unit };
      const conv = mwElectricalUnit(unit, n);
      const snum = conv.kind ? conv.value : n;
      const d = num(m.decimals, 0);
      let text;
      try {
        text = new Intl.NumberFormat(this._hass?.locale?.language || "pt-BR",
          { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
      } catch (e) {
        text = n.toFixed(d);
      }
      return { text, num: n, snum, unit };
    }

    // fundo da faixa: cortes secos ou degradê, conforme blend/blend_amount
    _strip(colors, axis) {
      const c = this._config;
      const n = colors.length;
      if (!n) return "transparent";
      // Uma seção só ainda tem de sair como IMAGEM: este valor vai para
      // `background-image`, e `background-image: rgba(...)` é CSS inválido —
      // o navegador resolve para `none` e a tira fica sem cor nenhuma. Era
      // assim até a v0.2.0: arco-íris de um dispositivo só nascia incolor.
      if (n === 1) return `linear-gradient(${axis}, ${colors[0]} 0%, ${colors[0]} 100%)`;
      const f = c.blend === false ? 0 : Math.max(0, Math.min(1, num(c.blend_amount, 100) / 100));
      const pct = (x) => `${(x * 100 / n).toFixed(3)}%`;
      const parts = [`${colors[0]} 0%`];
      colors.forEach((col, i) => {
        parts.push(`${col} ${pct(i + f / 2)}`);
        parts.push(`${col} ${pct(i + 1 - f / 2)}`);
      });
      parts.push(`${colors[n - 1]} 100%`);
      return `linear-gradient(${axis}, ${parts.join(", ")})`;
    }

    _render() {
      const c = this._config;
      const vertical = c.orientation === "vertical";
      const dir = c.direction || (vertical ? "ttb" : "ltr");
      const reversed = dir === "rtl" || dir === "btt";
      const axis = vertical ? "to bottom" : "to right";
      const alpha = num(c.scale_alpha, DEFAULTS.scale_alpha);

      const order = c.sections.map((s, i) => ({ s, i }));
      if (reversed) order.reverse();

      const theme = c.text_mode === "theme";
      const fixed = c.text_mode === "fixed";
      const textFor = (bg) => (theme ? "var(--primary-text-color)"
        : fixed ? c.color_text_light
        : isLight(bg) ? c.color_text_dark : c.color_text_light);

      const bandsHtml = c.bands.map((b, bi) => {
        const m = METRICS[b.metric];
        const a = num(b.alpha, alpha);
        const showVals = b.show_values !== undefined ? b.show_values !== false : c.show_values !== false;
        const labelsHere = c.section_labels === "all"
          || (c.section_labels === "first" && bi === 0);

        // Duas passadas, e a ordem importa: consumo (kWh) não tem faixa
        // absoluta — a régua dele é o maior valor DESTA faixa. Só dá para
        // montar a escala depois de ler todas as células. Construída uma vez
        // por render, nunca por célula.
        const raw = order.map(({ s, i }) => {
          const id = this._entityOf(s, b.metric);
          return { id, v: this._value(id, b.metric), name: this._sectionName(s, i) };
        });
        const stats = m.relative
          ? { max: raw.reduce((mx, x) => (x.v.snum > mx ? x.v.snum : mx), 0) || 1 }
          : null;
        const scale = m.scale(a, b, stats);

        const cells = raw.map((x) => {
          // Tensão com nominal automático troca de régua por célula: rede e
          // pilha chegam no mesmo device_class.
          const sc = (m.cellScale && m.cellScale(a, b, x.v.snum)) || scale;
          const color = bandColor(x.v.snum, sc, c.scale_blend === true) || c.color_unavailable;
          return { ...x, color };
        });

        const bg = this._strip(cells.map((x) => x.color), axis);
        const cellsHtml = cells.map((x) => {
          const txt = textFor(x.color);
          const unit = c.show_units !== false && x.v.unit ? `<span class="u">${esc(x.v.unit)}</span>` : "";
          const nameHtml = labelsHere ? `<span class="lbl">${esc(x.name)}</span>` : "";
          const valHtml = showVals ? `<span class="val">${esc(x.v.text)}${unit}</span>` : "";
          return `<div class="cell" style="color:${esc(txt)}" data-entity="${esc(x.id)}"
            title="${esc(x.name)} · ${esc(m.label)}">${nameHtml}${valHtml}</div>`;
        }).join("");

        const h = px(b.height || c.band_height) || "34px";
        const gut = c.band_labels === "none" ? ""
          : c.band_labels === "text"
            ? `<div class="gut">${esc(b.label || m.label)}</div>`
            : `<div class="gut"><ha-icon icon="${esc(b.icon || m.icon)}" title="${esc(m.label)}"></ha-icon></div>`;

        return `<div class="band" style="--bh:${h}">
          ${gut}
          <div class="strip" style="background-image:${bg}">
            <div class="cells">${cellsHtml}</div>
          </div>
        </div>`;
      }).join("");

      // --- a folha e o relevo ---
      const dark = c.paper_dark === true;
      const paper = hasPaper(c);
      const ink = paperInk(dark);
      const depth = c.depth || DEFAULTS.depth;
      // `paper_dark` manda no relevo mesmo sem papel: quem escolhe o tom da luz
      // é o fundo, e sem folha o fundo é o cartão do tema. Branco a 0,90 num
      // tema escuro não é luz, é giz.
      const shadow = cardRelief(depth, dark);
      const stripShadow = stripRelief(depth, dark);
      // Sem papel o card é o card do tema: fundo e borda ficam com quem sempre
      // mandou neles. Escrever "transparent" aqui apagaria o cartão do tema.
      const cardBg = paper ? `background:${paperOf(c)};` : "";
      const cardBorder = paper ? `border:1px solid ${paperEdge(c.paper_color, dark)};` : "";
      // A tinta só entra quando o dono não escolheu a dele: papel claro em tema
      // escuro deixaria o nome do card branco sobre creme.
      const nameColor = paper && c.color_name === DEFAULTS.color_name ? ink.text : c.color_name;
      const bandLabelColor = paper && c.color_band_label === DEFAULTS.color_band_label
        ? ink.dim : c.color_band_label;

      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `
        <style>
          ha-card{box-sizing:border-box;padding:${px(c.padding) || "8px"};
            border-radius:${px(c.border_radius) || "10px"};
            ${cardBg}${cardBorder}
            transform:${depth === "3d" ? "translateY(-1px)" : "none"};
            box-shadow:${shadow};overflow:hidden;
            -webkit-tap-highlight-color:transparent;touch-action:manipulation;user-select:none;}
          .nm{font-size:${px(c.name_size) || "12px"};color:${esc(nameColor)};
            font-weight:600;line-height:1.2;padding-bottom:4px;text-align:center;}
          .bands{display:flex;gap:${px(c.band_gap) || "4px"};
            flex-direction:${vertical ? "row" : "column"};
            ${vertical ? `height:${px(c.length) || "260px"};align-items:stretch;` : ""}}
          .band{display:flex;gap:4px;align-items:center;
            flex-direction:${vertical ? "column" : "row"};
            ${vertical ? "width:var(--bh);flex:0 0 var(--bh);" : "height:var(--bh);"}}
          .gut{flex:0 0 auto;display:flex;align-items:center;justify-content:center;
            color:${esc(bandLabelColor)};font-size:${px(c.band_label_size) || "14px"};
            ${vertical ? "" : `min-width:${px(c.band_label_size) || "14px"};`}}
          .gut ha-icon{--mdc-icon-size:${px(c.band_label_size) || "14px"};
            width:${px(c.band_label_size) || "14px"};height:${px(c.band_label_size) || "14px"};display:flex;}
          .strip{flex:1 1 auto;position:relative;min-width:0;min-height:0;
            align-self:stretch;border-radius:${px(c.band_radius) || "8px"};
            box-shadow:${stripShadow};overflow:hidden;
            transition:background-image 250ms ease;}
          .glass{position:absolute;inset:0;pointer-events:none;
            background-image:linear-gradient(145deg, rgba(255,255,255,0.20) 0%,
              rgba(255,255,255,0.06) 42%, rgba(0,0,0,0.08) 100%);}
          .cells{position:absolute;inset:0;display:flex;
            flex-direction:${vertical ? "column" : "row"};}
          .cell{flex:1 1 0;min-width:0;min-height:0;display:flex;flex-direction:column;
            align-items:center;justify-content:center;gap:0;overflow:hidden;
            text-shadow:${theme ? "none" : "0 1px 1px rgba(0,0,0,0.28)"};
            cursor:pointer;padding:0 2px;
            ${c.divider ? `border-${vertical ? "bottom" : "right"}:1px solid rgba(0,0,0,0.18);` : ""}}
          .cell:last-child{border:none;}
          .lbl{font-size:${px(c.label_size) || "10px"};line-height:1.1;font-weight:600;
            max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.95;}
          .val{font-size:${px(c.value_size) || "13px"};line-height:1.15;font-weight:700;
            font-variant-numeric:tabular-nums;font-feature-settings:"tnum" 1;}
          .u{font-size:0.66em;font-weight:600;opacity:.8;padding-left:1px;}
        </style>
        <ha-card>
          ${c.show_name !== false && c.name ? `<div class="nm">${esc(c.name)}</div>` : ""}
          <div class="bands">${bandsHtml}</div>
        </ha-card>`;

      // o vidro é por faixa: injetado depois para não brigar com o gradiente
      if (c.gradient !== false) {
        this.shadowRoot.querySelectorAll(".strip").forEach((el) => {
          const g = document.createElement("div");
          g.className = "glass";
          el.appendChild(g);
        });
      }

      this._wire();
    }

    _moreInfo(entityId) {
      if (!entityId) return;
      this.dispatchEvent(new CustomEvent("hass-more-info",
        { bubbles: true, composed: true, detail: { entityId } }));
    }

    _wire() {
      const c = this._config;
      const root = this.shadowRoot;
      if ((c.tap_action || "auto") === "auto") {
        root.querySelectorAll("[data-entity]").forEach((el) =>
          el.addEventListener("click", (ev) => {
            ev.stopPropagation();
            this._moreInfo(el.dataset.entity);
          }));
      }
      const card = root.querySelector("ha-card");
      if (!card) return;
      let holdTimer = null, held = false;
      card.addEventListener("pointerdown", () => {
        held = false;
        holdTimer = setTimeout(() => { held = true; holdTimer = null; this._run(c.hold_action); }, 500);
      });
      ["pointerleave", "pointercancel"].forEach((t) => card.addEventListener(t, () => {
        if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
      }));
      card.addEventListener("pointerup", () => {
        if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
        if (!held && (c.tap_action || "auto") !== "auto") this._run(c.tap_action);
      });
      card.addEventListener("dblclick", () => this._run(c.double_tap_action));
    }

    _run(action) {
      const c = this._config;
      switch (action) {
        case "none": case undefined: return;
        case "navigate":
          if (!c.navigation_path) return;
          history.pushState(null, "", c.navigation_path);
          window.dispatchEvent(new CustomEvent("location-changed", { bubbles: true, composed: true }));
          return;
        case "url":
          if (c.url_path) window.open(c.url_path, "_blank", "noopener"); return;
        case "more-info": default: {
          const first = this._cells().map((x) => x.id).find(Boolean);
          this._moreInfo(first);
        }
      }
    }
  }

  /* ------------------------------ EDITOR ------------------------------ */

  const LABELS = {
    name: "Nome do card (vazio = sem título)",
    show_name: "Mostrar o nome",
    orientation: "Orientação",
    direction: "Sentido",
    band_height: "Altura da faixa (largura, se vertical)",
    length: "Comprimento do arco-íris (só no vertical)",
    band_gap: "Folga entre as faixas",
    band_radius: "Arredondamento das faixas",
    scale_alpha: "Opacidade das cores",
    blend: "Degradê de transição entre as seções",
    blend_amount: "Largura da transição",
    scale_blend: "Suavizar também dentro da escala (desligado = faixa seca, como os button-cards)",
    section_labels: "Nomes das seções",
    show_values: "Mostrar os valores",
    show_units: "Mostrar as unidades",
    band_labels: "Identificação da faixa",
    label_size: "Tamanho do nome da seção",
    value_size: "Tamanho dos valores",
    name_size: "Tamanho do nome do card",
    band_label_size: "Tamanho da identificação da faixa",
    text_mode: "Cor do texto",
    border_radius: "Arredondamento do card",
    padding: "Folga interna",
    gradient: "Brilho de vidro nas faixas",
    divider: "Risco separando as seções",
    paper_color: "Cor do papel",
    paper_dark: "Papel de noite (e o relevo lido no escuro)",
    depth: "Relevo",
    tap_action: "Toque",
    hold_action: "Toque longo",
    double_tap_action: "Toque duplo",
    navigation_path: "Caminho para navegar (ação Navegar)",
    url_path: "Endereço para abrir (ação Abrir link)",
    color_unavailable: "Sem leitura: cor",
    color_text_dark: "Texto escuro (fundo claro)",
    color_text_light: "Texto claro (fundo escuro)",
    color_name: "Nome do card: texto",
    color_band_label: "Identificação da faixa: texto",
  };

  const COLOR_FIELDS = ["color_unavailable", "color_text_dark", "color_text_light"];

  // Grandezas agrupadas pela RÉGUA que cada uma usa. O agrupamento não é
  // enfeite: ele diz de onde vem a cor, que é a pergunta que o dono faz
  // quando um número pinta diferente do que ele esperava.
  const METRIC_GROUPS = [
    ["Clima (regra 40)", ["temperature", "humidity"]],
    ["Qualidade do ar (regra 90)", ["co2", "tvoc", "hcho", "pm25"]],
    ["Elétrico (regra 180)", ["power", "energy", "voltage", "current"]],
    ["Nível", ["illuminance", "battery"]],
    ["Rádio", ["rssi", "lqi"]],
  ];

  // As grandezas que este card realmente usa, na ordem das faixas.
  const usedMetrics = (config) => {
    const out = [];
    for (const b of (config && config.bands) || []) {
      if (METRICS[b.metric] && !out.includes(b.metric)) out.push(b.metric);
    }
    return out.length ? out : ["temperature"];
  };

  // Campo extra da faixa, só para as grandezas que precisam de um parâmetro.
  // Faixa que não precisa não ganha linha nenhuma — o painel continua magro.
  const bandExtra = (b, i) => {
    const m = b.metric;
    if (m === "voltage") {
      const cur = b.nominal === undefined || b.nominal === null ? "" : String(b.nominal);
      const op = (v, t) => `<option value="${v}"${v === cur ? " selected" : ""}>${t}</option>`;
      return `<div class="xtra"><label><span>Tensão nominal</span>
        <select data-band="${i}" data-field="nominal">
          ${op("", "Automático (rede ou pilha, pelo valor)")}
          ${op("220", "220 V — PRODIST")}
          ${op("127", "127 V — PRODIST")}
          ${op("cell", "Célula de pilha (3 V)")}
        </select></label></div>`;
    }
    if (m === "current") {
      return `<div class="xtra"><label><span>Limite do circuito (A)</span>
        <input type="number" min="0.1" step="0.1" data-band="${i}" data-field="max"
          placeholder="20" value="${b.max ?? ""}"></label></div>`;
    }
    if (m === "energy") {
      return `<div class="xtra"><label><span>Máximo da régua (kWh)</span>
        <input type="number" min="0.1" step="0.1" data-band="${i}" data-field="max"
          placeholder="o maior da faixa" value="${b.max ?? ""}"></label></div>`;
    }
    if (m === "battery") {
      const cur = String(b.scale || "fina");
      const op = (v, t) => `<option value="${v}"${v === cur ? " selected" : ""}>${t}</option>`;
      return `<div class="xtra"><label><span>Régua da bateria</span>
        <select data-band="${i}" data-field="scale">
          ${op("fina", "Fina — 5/20/40/60/80 (padrão deste card)")}
          ${op("canonica", "Canônica — 10/20/40/60 (como na planta)")}
        </select></label></div>`;
    }
    return "";
  };

  const ORIENTATIONS = [
    { value: "horizontal", label: "Horizontal (faixas empilhadas)" },
    { value: "vertical", label: "Vertical (faixas lado a lado)" },
  ];
  const DIRECTIONS_H = [
    { value: "ltr", label: "Da esquerda para a direita" },
    { value: "rtl", label: "Da direita para a esquerda" },
  ];
  const DIRECTIONS_V = [
    { value: "ttb", label: "De cima para baixo" },
    { value: "btt", label: "De baixo para cima" },
  ];
  const SECTION_LABELS = [
    { value: "first", label: "Só na primeira faixa" },
    { value: "all", label: "Em todas as faixas" },
    { value: "none", label: "Não mostrar" },
  ];
  const BAND_LABELS = [
    { value: "icon", label: "Ícone da grandeza" },
    { value: "text", label: "Nome da grandeza" },
    { value: "none", label: "Nada" },
  ];
  const PAPERS = (dark) => [{ value: "none", label: "Fundo do tema (sem papel)" }]
    .concat(dark ? paperDarkOptions() : paperOptions());
  const DEPTHS = [
    { value: "soft", label: "Suave (sombra de sempre)" },
    { value: "3d", label: "3D (relevo de papel)" },
    { value: "flat", label: "Chapado (sem sombra)" },
  ];
  const TEXT_MODES = [
    { value: "auto", label: "Contraste com a faixa (automático)" },
    { value: "theme", label: "Cor do tema" },
    { value: "fixed", label: "Sempre a cor clara" },
  ];
  const ACTIONS = [
    { value: "auto", label: "Automático (cada célula abre o seu sensor)" },
    { value: "more-info", label: "Abrir detalhes (more-info)" },
    { value: "navigate", label: "Navegar para uma tela" },
    { value: "url", label: "Abrir um link" },
    { value: "none", label: "Nada" },
  ];

  class MwRainbowCardEditor extends HTMLElement {
    setConfig(config) {
      this._config = { ...config };
      this._config.sections = normSections(config.sections);
      this._config.bands = normBands(config.bands);
      this._watchFocus();
      this._paint("sections", "bands", "form", "colors");
    }

    set hass(hass) {
      const antes = this._hass;
      this._hass = hass;
      if (this._form) this._form.hass = hass;
      if (!this._secEl) return;
      // Refazer os <select> a cada leitura que chega fechava o menu na mão do
      // dono: o hass novo chega várias vezes por segundo e o innerHTML levava
      // junto o campo aberto. Só o registro muda as opções.
      if (sameRegistry(antes, hass)) return;
      this._sigSec = null;
      this._paint("sections");
    }

    /* ---- pintura: porta única para o DOM, e ela respeita quem está mexendo ---- */

    _paint(...oque) {
      this._todo = this._todo || new Set();
      for (const o of oque) this._todo.add(o);
      if (this._busy()) return; // fica pendente e sai no focusout
      this._flush();
    }

    _flush() {
      const todo = this._todo || new Set();
      this._todo = new Set();
      if (todo.has("sections")) this._paintSections();
      if (todo.has("bands")) this._paintBands();
      if (todo.has("form")) this._paintForm();
      if (todo.has("colors")) this._paintColors();
    }

    // o elemento com foco dentro deste editor — getRootNode() atravessa o shadow
    // root do diálogo, onde document.activeElement só devolve o hospedeiro
    _focused() {
      const root = this.getRootNode ? this.getRootNode() : null;
      const el = root && root.activeElement;
      return el && this.contains && this.contains(el) ? el : null;
    }

    // menu de <select> aberto ou campo sendo digitado: não mexer no DOM agora
    _busy() {
      const el = this._focused();
      return !!el && (el.tagName === "SELECT" || el.tagName === "INPUT");
    }

    _watchFocus() {
      if (this._watching) return;
      this._watching = true;
      this.addEventListener("focusout", () => {
        // o foco só assenta no tique seguinte — sem a espera, pular de um campo
        // para o vizinho passaria por "editor ocioso"
        setTimeout(() => { if (!this._busy()) this._flush(); }, 0);
      });
    }

    // o DOM já mostra o que o usuário acabou de escolher — marcar como pintado
    // evita uma reconstrução inútil quando o config voltar pelo setConfig
    _seal() {
      this._sigSec = JSON.stringify(this._config.sections || []);
      this._sigBand = JSON.stringify(this._config.bands || []);
    }

    _emit() {
      this.dispatchEvent(new CustomEvent("config-changed",
        { bubbles: true, composed: true, detail: { config: this._config } }));
    }

    _schema() {
      const cfg = this._config || {};
      const vertical = cfg.orientation === "vertical";
      const n = (min, max, unit, step) => ({ number: { min, max, step: step || 1, mode: "box", unit_of_measurement: unit } });
      const sel = (opts) => ({ select: { mode: "dropdown", options: opts } });
      return [
        { name: "name", selector: { text: {} } },
        { name: "orientation", selector: sel(ORIENTATIONS) },
        { name: "direction", selector: sel(vertical ? DIRECTIONS_V : DIRECTIONS_H) },
        { name: "blend", selector: { boolean: {} } },
        ...(cfg.blend === false ? [] : [{ name: "blend_amount", selector: n(0, 100, "%") }]),
        { name: "scale_blend", selector: { boolean: {} } },
        {
          name: "", type: "expandable", title: "Tamanhos e forma", schema: [
            { name: "band_height", selector: n(6, 200, "px") },
            ...(vertical ? [{ name: "length", selector: n(40, 900, "px") }] : []),
            { name: "band_gap", selector: n(0, 40, "px") },
            { name: "band_radius", selector: n(0, 60, "px") },
            { name: "border_radius", selector: n(0, 60, "px") },
            { name: "padding", selector: n(0, 40, "px") },
            { name: "divider", selector: { boolean: {} } },
          ],
        },
        {
          name: "", type: "expandable", title: "Papel e relevo", schema: [
            { name: "paper_color", selector: sel(PAPERS(cfg.paper_dark === true)) },
            { name: "paper_dark", selector: { boolean: {} } },
            { name: "depth", selector: sel(DEPTHS) },
            { name: "gradient", selector: { boolean: {} } },
          ],
        },
        {
          name: "", type: "expandable", title: "Rótulos e cores", schema: [
            { name: "show_name", selector: { boolean: {} } },
            { name: "section_labels", selector: sel(SECTION_LABELS) },
            { name: "show_values", selector: { boolean: {} } },
            { name: "show_units", selector: { boolean: {} } },
            { name: "band_labels", selector: sel(BAND_LABELS) },
            { name: "text_mode", selector: sel(TEXT_MODES) },
            { name: "scale_alpha", selector: { number: { min: 0.1, max: 1, step: 0.05, mode: "slider" } } },
            { name: "label_size", selector: n(6, 40, "px") },
            { name: "value_size", selector: n(6, 40, "px") },
            { name: "name_size", selector: n(6, 40, "px") },
            { name: "band_label_size", selector: n(6, 40, "px") },
          ],
        },
        {
          name: "", type: "expandable", title: "Ações", schema: [
            { name: "tap_action", selector: sel(ACTIONS) },
            { name: "hold_action", selector: sel(ACTIONS.filter((a) => a.value !== "auto")) },
            { name: "double_tap_action", selector: sel(ACTIONS.filter((a) => a.value !== "auto")) },
            { name: "navigation_path", selector: { text: {} } },
            { name: "url_path", selector: { text: {} } },
          ],
        },
      ];
    }

    /* ---- seções: uma por dispositivo, com as entidades por grandeza ---- */

    _paintSections() {
      const sig = JSON.stringify(this._config.sections || []);
      if (this._secEl && sig === this._sigSec) return; // nada mudou: não mexer
      this._sigSec = sig;
      if (!this._secEl) {
        this._secEl = document.createElement("details");
        this._secEl.open = true;
        this._secEl.style.cssText = panelCss;
        this.appendChild(this._secEl);
      }
      const hass = this._hass;
      // A lista de dispositivos segue as grandezas do card: uma tomada com
      // medição de potência não aparecia aqui quando só clima contava.
      const devs = hass ? metricDevices(hass, usedMetrics(this._config)) : [];
      const secs = this._config.sections || [];
      const rows = secs.map((s, i) => {
        const opts = [`<option value="">— escolher dispositivo —</option>`].concat(
          devs.map((d) => `<option value="${esc(d.value)}"${d.value === s.device ? " selected" : ""}>${esc(d.label)}</option>`),
        ).join("");
        // Só as grandezas que este card realmente usa. Antes eram cinco
        // fixas; com quatorze no registro, desenhar todas seria um paredão de
        // selects — e quase todos vazios.
        const usadas = usedMetrics(this._config);
        const extras = usadas.map((m) => {
          const key = ENTITY_KEY[m];
          const cur = (s.entities && s.entities[m]) || (key ? s[key] : "") || "";
          const list = hass ? sensorsFor(hass, s.device, m) : [];
          const o = [`<option value="">— automático —</option>`].concat(
            list.map((e) => `<option value="${esc(e.value)}"${e.value === cur ? " selected" : ""}>${esc(e.label)}</option>`),
          ).join("");
          return `<label class="ent"><span>${esc(METRICS[m].label)}</span>
            <select data-sec="${i}" data-metric="${esc(m)}">${o}</select></label>`;
        }).join("");
        return `<div class="row">
          <div class="head">
            <b>${i + 1}</b>
            <select data-sec="${i}" data-field="device">${opts}</select>
            <input type="text" data-sec="${i}" data-field="name" placeholder="nome (opcional)"
              value="${esc(s.name || "")}">
            <button data-up="${i}" title="subir">▲</button>
            <button data-down="${i}" title="descer">▼</button>
            <button data-del="${i}" title="remover">✕</button>
          </div>
          <details class="adv"><summary>entidades desta seção</summary><div class="ents">${extras}</div></details>
        </div>`;
      }).join("");
      // o que estava aberto continua aberto depois da reconstrução
      const abertos = Array.from(this._secEl.querySelectorAll("details.adv")).map((d) => d.open);
      this._secEl.innerHTML = `
        <summary>Seções (${secs.length}) — cada seção é um dispositivo</summary>
        <style>${editorCss}</style>
        ${rows}
        <button class="add" data-add-sec="1">+ adicionar seção</button>`;
      this._secEl.querySelectorAll("details.adv").forEach((d, i) => { d.open = !!abertos[i]; });
      this._secEl.querySelectorAll("select[data-sec], input[data-sec]").forEach((el) => {
        el.addEventListener("change", () =>
          this._secFieldChanged(Number(el.dataset.sec), el.dataset.field, el.dataset.metric, el.value));
      });
      this._secEl.querySelectorAll("button[data-up],button[data-down],button[data-del],button[data-add-sec]")
        .forEach((b) => b.addEventListener("click", (ev) => {
          ev.preventDefault();
          const secs2 = this._config.sections.map((x) => ({ ...x }));
          if (b.dataset.addSec) secs2.push({});
          else if (b.dataset.del !== undefined) secs2.splice(Number(b.dataset.del), 1);
          else if (b.dataset.up !== undefined) {
            const i = Number(b.dataset.up);
            if (i > 0) secs2.splice(i - 1, 0, secs2.splice(i, 1)[0]);
          } else if (b.dataset.down !== undefined) {
            const i = Number(b.dataset.down);
            if (i < secs2.length - 1) secs2.splice(i + 1, 0, secs2.splice(i, 1)[0]);
          }
          if (!secs2.length) secs2.push({});
          this._config = { ...this._config, sections: secs2 };
          this._emit();
          this._paint("sections");
        }));
    }

    /* ---- faixas: grandeza + altura ---- */

    _paintBands() {
      const sig = JSON.stringify(this._config.bands || []);
      if (this._bandEl && sig === this._sigBand) return;
      this._sigBand = sig;
      if (!this._bandEl) {
        this._bandEl = document.createElement("details");
        this._bandEl.open = true;
        this._bandEl.style.cssText = panelCss;
        this.appendChild(this._bandEl);
      }
      const bands = this._config.bands || [];
      const rows = bands.map((b, i) => {
        // Quatorze grandezas numa lista chapada viram um paredão. Agrupadas
        // pela régua que cada uma usa, a lista também ENSINA de onde vem a cor.
        const opts = METRIC_GROUPS.map(([grupo, chaves]) => {
          const inner = chaves.filter((m) => METRICS[m]).map((m) =>
            `<option value="${m}"${m === b.metric ? " selected" : ""}>${esc(METRICS[m].label)}</option>`).join("");
          return inner ? `<optgroup label="${esc(grupo)}">${inner}</optgroup>` : "";
        }).join("");
        return `<div class="row"><div class="head">
          <b>${i + 1}</b>
          <select data-band="${i}" data-field="metric">${opts}</select>
          <input type="number" min="6" max="200" step="1" data-band="${i}" data-field="height"
            placeholder="altura" value="${b.height ?? ""}">
          <button data-bup="${i}" title="subir">▲</button>
          <button data-bdown="${i}" title="descer">▼</button>
          <button data-bdel="${i}" title="remover">✕</button>
        </div>${bandExtra(b, i)}</div>`;
      }).join("");
      this._bandEl.innerHTML = `
        <summary>Faixas (${bands.length}) — grandeza e altura</summary>
        <style>${editorCss}</style>
        ${rows}
        <button class="add" data-add-band="1">+ adicionar faixa</button>`;
      this._bandEl.querySelectorAll("select[data-band], input[data-band]").forEach((el) => {
        el.addEventListener("change", () =>
          this._bandFieldChanged(Number(el.dataset.band), el.dataset.field, el.value));
      });
      this._bandEl.querySelectorAll("button[data-bup],button[data-bdown],button[data-bdel],button[data-add-band]")
        .forEach((b) => b.addEventListener("click", (ev) => {
          ev.preventDefault();
          const bands2 = this._config.bands.map((x) => ({ ...x }));
          if (b.dataset.addBand) {
            const used = new Set(bands2.map((x) => x.metric));
            bands2.push({ metric: METRIC_KEYS.find((m) => !used.has(m)) || "temperature" });
          } else if (b.dataset.bdel !== undefined) bands2.splice(Number(b.dataset.bdel), 1);
          else if (b.dataset.bup !== undefined) {
            const i = Number(b.dataset.bup);
            if (i > 0) bands2.splice(i - 1, 0, bands2.splice(i, 1)[0]);
          } else if (b.dataset.bdown !== undefined) {
            const i = Number(b.dataset.bdown);
            if (i < bands2.length - 1) bands2.splice(i + 1, 0, bands2.splice(i, 1)[0]);
          }
          // ao menos uma faixa — é o mínimo que o card aceita
          if (!bands2.length) bands2.push({ metric: "temperature" });
          this._config = { ...this._config, bands: bands2 };
          this._emit();
          this._paint("bands");
        }));
    }

    _paintForm() {
      if (!this._form) {
        this._form = document.createElement("ha-form");
        this._form.computeLabel = (f) => LABELS[f.name] || f.name;
        this._form.addEventListener("value-changed", (ev) => this._onChange(ev));
        this.appendChild(this._form);
      }
      this._form.hass = this._hass;
      // esquema novo = campos refeitos pelo lit; só quando ele realmente muda
      const sigEsq = `${this._config.orientation}|${this._config.blend}|${this._config.paper_dark}`;
      if (sigEsq !== this._sigEsq) { this._sigEsq = sigEsq; this._form.schema = this._schema(); }
      const data = { ...DEFAULTS, ...this._config };
      delete data.sections;
      delete data.bands;
      for (const k of Object.keys(data)) if (data[k] === "") delete data[k];
      this._form.data = data;
    }

    // A decisão de um campo de faixa, separada do DOM: é ela que o probe
    // consegue exercitar (o dublê de DOM da bancada não devolve elementos).
    _bandFieldChanged(i, campo, v) {
      const bands2 = this._config.bands.map((x) => ({ ...x }));
      if (!bands2[i]) return;
      if (v === "") delete bands2[i][campo];
      else bands2[i][campo] = (campo === "height" || campo === "max") ? Number(v) : v;
      // Grandeza nova zera os parâmetros da antiga: o `max` de um circuito de
      // corrente não quer dizer nada numa faixa de tensão, e ficaria no YAML
      // sem ninguém ver.
      if (campo === "metric") {
        delete bands2[i].max;
        delete bands2[i].nominal;
        delete bands2[i].scale;
      }
      this._config = { ...this._config, bands: bands2 };
      this._emit();
      this._seal(); // a linha já mostra a escolha — repintar só fecharia o menu
      // Grandeza nova muda o campo extra da faixa E a lista de entidades das
      // seções (que agora só mostra as grandezas em uso). Repintar é preciso,
      // mas `_paint` respeita o `_busy`: com o menu ainda aberto a pintura
      // fica pendente e só sai no focusout — que é a guarda que existe desde
      // o PR #1 para o select não fechar sozinho na mão do dono.
      if (campo === "metric") {
        this._sigBand = null;
        this._sigSec = null;
        this._paint("bands", "sections");
      }
    }

    // Idem para um campo de seção. `metric` preenchido = escolha de entidade
    // (grava no mapa `entities`); senão é `device` ou `name`.
    _secFieldChanged(i, field, metric, v) {
      const secs2 = this._config.sections.map((x) => ({ ...x }));
      if (!secs2[i]) return;
      if (metric) {
        // O jeito novo grava em `entities`; a chave antiga é apagada para não
        // ficarem duas verdades sobre a mesma célula no mesmo YAML.
        const ents = { ...(secs2[i].entities || {}) };
        if (v === "") delete ents[metric]; else ents[metric] = v;
        if (ENTITY_KEY[metric]) delete secs2[i][ENTITY_KEY[metric]];
        if (Object.keys(ents).length) secs2[i].entities = ents;
        else delete secs2[i].entities;
      } else if (v === "") delete secs2[i][field];
      else secs2[i][field] = v;
      // trocar de dispositivo invalida as entidades do dispositivo antigo
      if (field === "device") {
        const ents = { ...(secs2[i].entities || {}) };
        for (const m of METRIC_KEYS) {
          const k = ENTITY_KEY[m];
          if (k && secs2[i][k] && deviceOf(this._hass, secs2[i][k]) !== v) delete secs2[i][k];
          if (ents[m] && deviceOf(this._hass, ents[m]) !== v) delete ents[m];
        }
        if (Object.keys(ents).length) secs2[i].entities = ents;
        else delete secs2[i].entities;
      }
      this._config = { ...this._config, sections: secs2 };
      this._emit();
      this._seal();
      // só a troca de dispositivo muda as listas de entidades; repintar por um
      // nome digitado tiraria o foco do campo à toa
      if (field === "device") { this._sigSec = null; this._paint("sections"); }
    }

    _paintColors() {
      const sig = JSON.stringify(COLOR_FIELDS.map((n) => this._config[n] ?? null));
      if (this._colorsEl && sig === this._sigCor) return;
      this._sigCor = sig;
      if (!this._colorsEl) {
        this._colorsEl = document.createElement("details");
        this._colorsEl.style.cssText = panelCss;
        this.appendChild(this._colorsEl);
      }
      const rows = COLOR_FIELDS.map((name) => {
        const cur = this._config[name] ?? DEFAULTS[name] ?? "";
        const c = parseColor(cur || "rgba(128,128,128,1)");
        return `<div class="crow" data-name="${name}">
          <span class="lbl">${LABELS[name] || name}</span>
          <input type="color" value="${toHex(c)}" title="cor">
          <input type="range" min="0" max="1" step="0.01" value="${c.a}" title="transparência (alfa)">
          <code>${cur || "—"}</code>
        </div>`;
      }).join("");
      this._colorsEl.innerHTML = `
        <summary>Cores fixas (sem leitura e texto)</summary>
        <style>${editorCss}</style>${rows}`;
      this._colorsEl.querySelectorAll(".crow").forEach((rowEl) => {
        const name = rowEl.dataset.name;
        const apply = () => {
          const hex = rowEl.querySelector("input[type=color]").value;
          const a = parseFloat(rowEl.querySelector("input[type=range]").value);
          const { r, g, b } = parseColor(hex);
          const value = a >= 1 ? hex : toRgba({ r, g, b, a });
          const clean = { ...this._config };
          if (value === DEFAULTS[name]) delete clean[name]; else clean[name] = value;
          this._config = clean;
          rowEl.querySelector("code").textContent = clean[name] || "—";
          this._sigCor = JSON.stringify(COLOR_FIELDS.map((n) => clean[n] ?? null));
          this._emit();
        };
        rowEl.querySelector("input[type=color]").addEventListener("input", apply);
        rowEl.querySelector("input[type=range]").addEventListener("input", apply);
      });
    }

    _onChange(ev) {
      ev.stopPropagation();
      const v = { ...ev.detail.value };
      const clean = { sections: this._config.sections, bands: this._config.bands };
      for (const [k, val] of Object.entries(v)) {
        if (val === undefined || val === null || val === "") continue;
        if (val !== DEFAULTS[k]) clean[k] = val;
      }
      // campo escondido pelo esquema não vem no evento — sem isto sumiria do YAML
      for (const [k, val] of Object.entries(this._config)) {
        if (k === "sections" || k === "bands") continue;
        if (!(k in v) && clean[k] === undefined && (COLOR_FIELDS.includes(k) || !(k in DEFAULTS))) clean[k] = val;
      }
      for (const k of COLOR_FIELDS) {
        if (this._config[k] !== undefined) clean[k] = this._config[k];
      }
      this._config = clean;
      this._emit();
      this._paint("form");
    }
  }

  const panelCss =
    "margin-top:12px;border:1px solid var(--divider-color);border-radius:8px;padding:8px 12px;display:block;";

  const editorCss = `
    summary{cursor:pointer;font-weight:500;}
  .xtra{display:flex;gap:6px;margin:4px 0 2px 26px;}
  .xtra label{display:flex;align-items:center;gap:6px;flex:1;font-size:12px;
    color:var(--secondary-text-color);}
  .xtra label span{white-space:nowrap;}
  .xtra select,.xtra input{flex:1;min-width:0;}
    .row{border-top:1px solid var(--divider-color);padding:6px 0;}
    .row:first-of-type{border-top:none;}
    .head{display:flex;gap:6px;align-items:center;}
    .head b{opacity:.6;font-size:12px;min-width:14px;}
    .head select{flex:2 1 0;min-width:0;}
    .head input[type=text]{flex:1 1 0;min-width:0;}
    .head input[type=number]{width:74px;}
    select,input{background:var(--card-background-color);color:var(--primary-text-color);
      border:1px solid var(--divider-color);border-radius:6px;padding:4px 6px;font-size:13px;}
    button{background:none;border:1px solid var(--divider-color);border-radius:6px;
      color:var(--primary-text-color);cursor:pointer;padding:3px 7px;font-size:12px;}
    button.add{margin-top:8px;width:100%;padding:6px;}
    .adv{margin:4px 0 0 20px;}
    .adv summary{font-size:12px;opacity:.7;font-weight:400;}
    .ents{display:grid;grid-template-columns:1fr;gap:4px;padding:4px 0;}
    .ent{display:grid;grid-template-columns:110px 1fr;gap:6px;align-items:center;font-size:12px;}
    .ent select{min-width:0;}
    .crow{display:grid;grid-template-columns:1fr 44px 110px minmax(110px,1fr);gap:10px;
      align-items:center;padding:6px 0;}
    .crow .lbl{font-size:13px;}
    .crow input[type=color]{width:40px;height:28px;border:none;background:none;cursor:pointer;padding:0;}
    .crow code{font-size:11px;opacity:.7;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}`;

  customElements.define("mw-rainbow-card", MwRainbowCard);
  customElements.define("mw-rainbow-card-editor", MwRainbowCardEditor);

  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "mw-rainbow-card",
    name: "MW Rainbow Card",
    description: "Arco-íris de ambientes: seções por dispositivo × faixas de temperatura, umidade, bateria, RSSI ou LQI.",
    preview: true,
    documentationURL: "https://github.com/visaodeempresa/mw-ha-rainbow-card",
  });

  console.info("%c MW-RAINBOW-CARD %c 0.3.0 ",
    "background:#1a1a1a;color:#fdfaf3;font-weight:700;",
    "background:#e4572e;color:#1a1a1a;font-weight:700;");
})();
