<!-- MW-BRAND:BEGIN — gerado por IA/tools/mw-brand.sh · não editar à mão -->
<p align="center">
  <a href="https://github.com/visaodeempresa">
    <img src="docs/brand/logo.png" alt="Visão de Empresa — MAYCON WILLIAN OLIVEIRA" width="96">
  </a>
  <br>
  <sub><b>Visão de Empresa</b> · componente de Home Assistant por MAYCON WILLIAN OLIVEIRA</sub>
</p>
<!-- MW-BRAND:END -->

# MW Rainbow Card

Arco-íris de ambientes para o Home Assistant: **N seções** (uma por dispositivo)
× **N faixas** (Temperatura · Umidade · Bateria · RSSI · LQI), cada célula
pintada pela escala canônica da casa — a mesma dos `button-card` e do
[MW Temperature / Humidity Card](https://github.com/visaodeempresa/mw-ha-temp-humidity-card).

Horizontal ou vertical, em qualquer sentido, com ou sem degradê de transição
entre as seções.

```yaml
type: custom:mw-rainbow-card
name: A casa inteira
sections:
  - device: 1a2b3c…        # sensor da sala
  - device: 4d5e6f…        # sensor do quarto
  - device: 7g8h9i…        # sensor da cozinha
bands:
  - metric: temperature
  - metric: humidity
    height: 24
```

## O que ele faz

- **Seção = dispositivo.** Escolha o dispositivo e o card acha sozinho os
  sensores de temperatura, umidade, bateria, RSSI e LQI dele. Dá para apontar
  cada entidade na mão quando a descoberta erra.
- **Faixa = grandeza.** Cada faixa é uma tira colorida com uma seção por
  ambiente, na ordem que você definiu. Pelo menos uma seção e uma faixa.
- **Sentido na tela.** Horizontal → `ltr` / `rtl`; vertical → `ttb` / `btt`.
  O sentido inverte tanto os rótulos quanto as cores — a leitura não mente.
- **Degradê opcional.** `blend: true` costura uma seção na vizinha;
  `blend_amount` decide a largura da costura (100 % = arco-íris contínuo,
  0 % = ladrilho).
- **Mesmas ações da família MW:** toque, toque longo e toque duplo, com
  `more-info`, navegar, abrir link ou nada. No modo `auto`, cada célula abre
  o `more-info` do seu próprio sensor.
- **Papel e relevo, como no [MW Power Button](https://github.com/visaodeempresa/mw-ha-power-button-card).**
  O arco-íris pode descansar numa folha de papel encardido — as mesmas 49
  cores da família, mais o creme original — e ganhar o relevo 3D do botão de
  tomada: luz presa na quina de cima, sombra na de baixo, faixas afundadas na
  folha.

## Papel e relevo

```yaml
type: custom:mw-rainbow-card
paper_color: yellow-3      # creme original: paper · fundo do tema: none
depth: 3d                  # soft (padrão) · 3d · flat
sections: [dev1, dev2, dev3]
bands: [temperature, humidity]
```

| Opção | Padrão | O que faz |
|---|---|---|
| `paper_color` | `none` | `none` = fundo do tema · `paper` = creme original · `<matiz>-<1..7>` nas 7 matizes do arco-íris (`red`, `orange`, `yellow`, `green`, `blue`, `indigo`, `violet`), tom 1 quase branco e 7 mais encardido |
| `paper_dark` | `false` | Lê a **mesma chave** na rampa de noite. Manda também no relevo: sem folha, quem dá o tom da luz é o fundo do tema |
| `depth` | `soft` | `soft` = a sombra de sempre · `3d` = o relevo de papel do MW Power Button · `flat` = chapado |

Três detalhes que valem saber:

- **O padrão não mexe em nada.** `paper_color: none` e `depth: soft` são
  exatamente o card de antes — quem já tem um arco-íris na tela não acorda com
  uma folha nova por baixo dele.
- **A tinta acompanha o papel.** Com papel, o nome do card e a identificação
  da faixa passam a usar a tinta da paleta (escura no papel claro, clara no de
  noite) — a menos que você tenha escolhido as suas em `color_name` /
  `color_band_label`. As **células** continuam com o `text_mode`, porque elas
  estão em cima da faixa colorida, não do papel.
- **`shadow` e `lift` viraram `depth`.** YAML antigo continua valendo: o card
  traduz sozinho (`shadow: false` → `flat`, `lift: true` → `3d`). Se os dois
  aparecerem, o `depth` escrito na mão ganha.

No `orientation: vertical` a folha ocupa a largura toda da coluna do
dashboard, e as faixas ficam encostadas num canto dela — é a geometria de
sempre do modo vertical, que o papel só torna visível. Use `length` e o
tamanho da coluna para acertar.

## Instalação

HACS → ⋮ → Repositórios personalizados →
`visaodeempresa/mw-ha-rainbow-card`, categoria **Dashboard** → instalar →
recarregar a página com ⌘⇧R.

## Opções

### Card

| Opção | Padrão | O que faz |
|---|---|---|
| `sections` | — | **Obrigatório.** Lista de seções (veja abaixo) |
| `bands` | `[{metric: temperature}]` | Lista de faixas (veja abaixo) |
| `name` | `""` | Título do card; vazio = sem título |
| `orientation` | `horizontal` | `horizontal` \| `vertical` |
| `direction` | `ltr` | `ltr`/`rtl` no horizontal · `ttb`/`btt` no vertical |
| `blend` | `true` | Degradê de transição entre as seções |
| `blend_amount` | `100` | Largura da costura, em % da seção |
| `scale_blend` | `false` | Suaviza também **dentro** da escala; desligado = faixa seca, como os `button-card` |
| `scale_alpha` | `0.85` | Opacidade das cores |
| `band_height` | `34` | Altura da faixa (largura da coluna, no vertical) |
| `length` | `260` | Comprimento do arco-íris — só no vertical |
| `band_gap` / `band_radius` | `4` / `8` | Folga e arredondamento das faixas |
| `section_labels` | `first` | `none` \| `first` \| `all` |
| `show_values` / `show_units` | `true` | Números e unidades nas células |
| `band_labels` | `icon` | `icon` \| `text` \| `none` — a identificação da faixa |
| `text_mode` | `auto` | `auto` (contraste) \| `theme` \| `fixed` |
| `divider` | `false` | Risco separando as seções |
| `gradient` | `true` | Brilho de vidro sobre as faixas |
| `paper_color` / `paper_dark` / `depth` | `none`/`false`/`soft` | Papel e relevo — veja acima |
| `tap_action` | `auto` | `auto` \| `more-info` \| `navigate` \| `url` \| `none` |
| `hold_action` / `double_tap_action` | `none` | Idem, sem o `auto` |

### Seção

| Opção | O que faz |
|---|---|
| `device` | Dispositivo — de onde saem as entidades por descoberta |
| `name` | Nome mostrado; vazio = nome do dispositivo |
| `temp_entity`, `hum_entity`, `battery_entity`, `rssi_entity`, `lqi_entity` | Entidade explícita, quando a descoberta não serve |

Atalho: `sections: [dev1, dev2]` equivale a `[{device: dev1}, {device: dev2}]`.

### Faixa

| Opção | O que faz |
|---|---|
| `metric` | `temperature` \| `humidity` \| `battery` \| `rssi` \| `lqi` |
| `height` | Altura só desta faixa |
| `label` / `icon` | Sobrescreve o rótulo e o ícone da grandeza |
| `show_values` | Sobrescreve o global, só nesta faixa |
| `alpha` | Opacidade só desta faixa |

Atalho: `bands: [temperature, humidity]`.

## Cores

Temperatura e umidade usam a **escala canônica da casa** (a fonte é o template
`temp_sensor_style`/`umid_sensor_style` dos `button-card`, documentada em
`IA/rules/global/40-cores-de-temperatura-e-umidade.md`): 20 faixas de °C e uma
por ponto percentual de umidade. Bateria, RSSI e LQI usam a rampa
vermelho → verde da família MW.

Sensor sem leitura cai em `color_unavailable`, e não na ponta fria da escala.

## Desenvolvimento

Arquivo único, sem build: `dist/mw-rainbow-card.js` é fonte **e** artefato.

```bash
node --check dist/mw-rainbow-card.js
node tools/probe.js      # instancia card e editor fora do navegador
```

Bancada visual (não abre por `file://` — o navegador recusa o módulo vizinho):

```bash
python3 -m http.server 8765
```

- `tools/bancada-papel.html` — os 49 papéis × os três relevos, claro e escuro
- `tools/bancada.html` — o `<select>` do editor sob enxurrada de `hass`

As cores de papel vêm de `IA/lib/paper-palette` e `IA/lib/paper-dark-palette`,
embutidas byte a byte entre marcadores. Antes de commitar o `dist`:
`IA/tools/check-embeds.sh`.

Fluxo `feature → develop → release → main`; o merge na `main` dispara o bump
semântico, a tag e a release que o HACS enxerga.

## Licença

MIT © MAYCON WILLIAN OLIVEIRA
