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
× **N faixas** (uma por grandeza), cada célula pintada pela escala canônica da
casa — a mesma dos `button-card`, do
[MW Temperature / Humidity Card](https://github.com/visaodeempresa/mw-ha-temp-humidity-card)
e do [MW State Color Element](https://github.com/visaodeempresa/mw-ha-state-color-element).

**Quatorze grandezas** — temperatura, umidade, CO₂, TVOC, formaldeído, PM2.5,
potência, consumo, tensão, corrente, iluminância, bateria, RSSI e LQI — **e uma
faixa que comanda**: luz, tomada, ventilador e cortina, com toque para
ligar e arrasto para ajustar o nível.

![A casa inteira numa tira só](https://mayconsoftware.github.io/mw-ha-rainbow-card/docs/img/arco-iris-completo.svg)

<sub>Quatro ambientes × dez grandezas. Esta imagem é **gerada pelo próprio
card** (`node tools/gerar-imagens.js`) com as leituras reais da casa — ela não
pode divergir do código.</sub>

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
  sensores dele que servem às faixas do card — das quatorze grandezas. Dá para
  apontar cada entidade na mão quando a descoberta erra.
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

## As grandezas e a régua de cada uma

Cada grandeza usa uma escala canônica que vive fora deste repositório, num
lugar só para a casa inteira. O card é **consumidor** das escalas, não dono
delas — é o que faz o arco-íris bater com os `button-card`, com a planta e com
os gauges na mesma tela.

| Grandeza | `metric` | Régua | Onde a régua mora |
|---|---|---|---|
| Temperatura | `temperature` | 19 faixas, °C | escala canônica de clima (regra 40) |
| Umidade | `humidity` | 101 faixas, %UR | idem |
| CO₂ | `co2` | 800 / 1200 ppm | qualidade do ar (regra 90) |
| TVOC | `tvoc` | 0,3 / 0,6 ppm | idem |
| Formaldeído | `hcho` | 0,08 / 0,1 mg/m³ | idem |
| PM2.5 | `pm25` | 12 / 35 µg/m³ | idem |
| Potência | `power` | 0 / 1 / 10 / 50 / 200 / 1000 W | grandezas elétricas (regra 180) |
| Consumo | `energy` | relativa ao card | idem |
| Tensão | `voltage` | **PRODIST módulo 8** | idem |
| Corrente | `current` | relativa ao circuito | idem |
| **Comando** | `control` | — | o estado da própria entidade |
| Iluminância | `illuminance` | 7 degraus, lx | escala de nível |
| Bateria | `battery` | duas réguas (ver abaixo) | idem |
| RSSI | `rssi` | −90 … −50 dBm | rampa local do card |
| LQI | `lqi` | 50 … 240 | idem |

### Clima

![Clima](https://mayconsoftware.github.io/mw-ha-rainbow-card/docs/img/arco-iris-clima.svg)

### Qualidade do ar

![Qualidade do ar](https://mayconsoftware.github.io/mw-ha-rainbow-card/docs/img/arco-iris-ar.svg)

Os degraus do ar são **limite inferior**: 800 ppm de CO₂ **já é** atenção. E
semáforo não se interpola — faixas de ar ignoram o `scale_blend` de propósito.

> Numa faixa de ar, considere `blend: false`. A costura entre seções é bonita
> num degradê de temperatura, mas entre um ambiente verde e um vermelho ela
> desenha um âmbar que não é a leitura de ambiente nenhum.

**Descoberta:** sete dos dez sensores de ar de uma casa Tuya típica **não têm
`device_class`** — VOC, formaldeído e PM2.5 chegam com a classe nula. O card
descobre esses pela terminação do `entity_id` (`_vocs`, `_formaldeido`,
`_pm25`) **e só aceita se a unidade bater**. Sem a trava da unidade, um
`sensor.electricity_maps_intensidade_de_co2` (gCO2eq/kWh — a pegada de carbono
da *rede elétrica*) entraria numa faixa de CO₂ e pintaria "ar excelente" com um
número que não é do ar.

### Elétrico

![Elétrico](https://mayconsoftware.github.io/mw-ha-rainbow-card/docs/img/arco-iris-eletrico.svg)

**Tensão segue o PRODIST módulo 8 (ANEEL)** — são **quatro** zonas, não cinco:
acima da faixa adequada a norma vai direto para crítica, não existe "precária
alta" em baixa tensão.

| nominal | crítica baixa | precária | **adequada** | crítica alta |
|---|---|---|---|---|
| 220 V | < 191 | 191–201 | **202–231** | > 231 |
| 127 V | < 110 | 110–116 | **117–133** | > 133 |

```yaml
bands:
  - metric: voltage
    nominal: 220        # ou 127, ou "cell", ou omitido = automático
```

Com `nominal` omitido a régua é escolhida **por célula**: abaixo de 60 V não é
rede, é célula de pilha (3 V nominais), e ganha régua própria. Sem isso toda
pilha Zigbee cheia da casa pintaria de "sobretensão crítica" — no mesmo
`device_class: voltage` convivem `V` e `mV`.

**Consumo** não tem faixa absoluta (acumulado vai de 0 a centenas de milhares
de kWh). A régua é o **maior valor da própria faixa** — o arco-íris vira uma
comparação entre ambientes. `max:` fixa a escala quando você quiser valor
absoluto:

```yaml
bands:
  - metric: energy
    max: 200            # kWh — sem isso, o maior da faixa manda
  - metric: current
    max: 20             # A — o limite do disjuntor daquele circuito
```

⚠️ Um sensor de *total de vida* na mesma faixa que sensores diários esmaga
todos os outros. Sintoma: a faixa de kWh inteira da mesma cor. Correção:
`max:` explícito, ou não misturar as duas coisas na mesma faixa.

### Nível — iluminância e as duas réguas de bateria

![Nível](https://mayconsoftware.github.io/mw-ha-rainbow-card/docs/img/arco-iris-nivel.svg)

Bateria tem **duas réguas nomeadas**, e isso é decisão, não bagunça:

| `scale` | limites | quem usa |
|---|---|---|
| `fina` (padrão daqui) | 5 / 20 / 40 / 60 / 80 | este card |
| `canonica` | 10 / 20 / 40 / 60 | MW State Color Element, na planta |

A `fina` separa *quase morta* (≤5 %) de *morrendo* e enxerga o topo da carga —
num arco-íris com 8 dispositivos lado a lado, é o que deixa ver qual pilha vai
cair primeiro.

```yaml
bands:
  - metric: battery
    scale: canonica     # para bater com a planta
```

### Unidade: a tela mostra uma coisa, a cor usa outra

A célula escreve **o que a entidade reporta, na unidade dela** (3097 mV).
A cor usa o valor convertido para a unidade-base da grandeza (3,097 V). No
mesmo `device_class` convivem `V`/`mV`, `A`/`mA`, `Wh`/`kWh` — e sem converter,
a cor sai errada por três ordens de grandeza.


## A faixa que comanda

O arco-íris deixou de ser só leitura. Uma faixa `control` põe **luz, tomada,
ventilador, cortina e input_boolean** na mesma tira das grandezas — e a célula
vira o próprio cursor.

![A faixa que comanda](https://mayconsoftware.github.io/mw-ha-rainbow-card/docs/img/arco-iris-controle.svg)

```yaml
type: custom:mw-rainbow-card
sections:
  - entities: {control: light.mesa}
  - entities: {control: light.sala}
  - entities: {control: light.suite}
bands:
  - metric: control
  - metric: temperature      # comando e leitura na mesma tira
```

| Gesto | O que faz |
|---|---|
| **Toque** | Liga / desliga |
| **Arrastar** ao longo da célula | Ajusta brilho, velocidade ou posição |
| **Segurar** parado | Abre o `more-info` |

- **A cor é a cor real da luz.** `rgb_color` quando ela informa um; senão a
  temperatura de cor convertida em RGB. Com `blend: true`, uma fileira de
  luzes vira uma fita com as cores que a casa está fazendo agora.
- **A célula é o nível.** A parte não acesa fica sob um véu; o aceso mostra a
  cor. De longe, o arco-íris lê como um equalizador da casa.
- **Quem não tem nível não arrasta.** Tomada e `input_boolean` só respondem ao
  toque — arrastar neles seria mentira. E, por não arrastarem, eles **não**
  recebem `touch-action`: a tela continua rolando por cima deles no celular.

### Confirmação, para o que não se liga por engano

```yaml
bands:
  - metric: control
    confirm: true
    # ou o texto: confirm: "Vai mesmo {acao} o {nome}?"
```

Usa o balão de papel padrão da casa (bloco canônico `touch-feedback v2`), que
acompanha o `depth` e o `paper_color` do card.

### Por que isto não deixou o card pesado

O comando **pagou dívida em vez de criar**:

| | antes | agora |
|---|---|---|
| listeners | um `click` **por célula**, refeitos a cada leitura | **quatro no total**, no shadow root, pendurados uma vez |
| durante o arrasto | — | **zero** re-render e **zero** chamada de serviço |
| ao soltar | — | **uma** chamada |

- O nível se move por `transform`, nunca por `width`/`left` — não força
  layout, e respeita o guarda de CI da família (animação só em `transform` e
  `opacity`).
- O `pointermove` **só existe durante o gesto**, capturado no elemento: fora
  dele não há handler escutando o ponteiro.
- A pintura é coalescida em `requestAnimationFrame` — no máximo uma por quadro.
- Com o dedo na tela o card **não repinta**: o eco do Home Assistant não briga
  com o gesto (é o que faz o cursor "voltar sozinho" em sliders mal feitos).
  Passados 700 ms do soltar, a verdade do HA volta a mandar.
- A chave de estado ganha **um** atributo por célula de controle (o nível) —
  precisa dele porque mudar o brilho de uma luz não muda o `state` dela, que
  continua `on`.
- Célula de leitura não ganha véu, nem `position`, nem `touch-action`.


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

> `device_filter` (padrão `clima`) também é opção de card, mas só afeta a
> lista do editor — veja [O filtro da lista de dispositivos](#o-filtro-da-lista-de-dispositivos).

### Seção

| Opção | O que faz |
|---|---|
| `device` | Dispositivo — de onde saem as entidades por descoberta |
| `name` | Nome mostrado; vazio = nome do dispositivo |
| `entities` | Mapa `{<grandeza>: <entity_id>}` — entidade explícita, quando a descoberta não serve |
| `temp_entity`, `hum_entity`, `battery_entity`, `rssi_entity`, `lqi_entity` | Forma antiga, ainda válida (equivale a `entities`) |

```yaml
sections:
  - device: 1a2b3c…
    entities:
      power: sensor.tomada_da_sala_potencia
      co2: sensor.qualidade_do_ar_da_sala_dioxido_de_carbono
```

O mapa `entities` existe porque com quatorze grandezas seriam quatorze chaves
de topo por seção. As cinco chaves antigas continuam funcionando — YAML que já
está no ar não precisa ser reescrito. Quando as duas existem, o mapa ganha.

### O filtro da lista de dispositivos

A lista do editor não despeja a casa inteira: ela vem filtrada, e o padrão é
**Clima — temperatura e/ou umidade**, que é o que torna a montagem prática
(quase toda seção nasce de um sensor de ambiente).

```yaml
device_filter: clima     # padrão · também: card | ar | eletrico | nivel | radio | controle | todos
```

| filtro | mostra |
|---|---|
| `clima` **(padrão)** | dispositivos com temperatura e/ou umidade |
| `card` | os que servem às grandezas **deste** card |
| `ar` · `eletrico` · `nivel` · `radio` · `controle` | atalhos por família |
| `todos` | todo dispositivo com alguma entidade que o card saiba usar |

Duas garantias que o editor dá:

- **Trocar o filtro nunca apaga a sua escolha.** Dispositivo já usado numa
  seção continua na lista, marcado *«fora do filtro»* — sem isso, mudar o
  filtro esvaziaria o select de uma seção montada.
- **O editor avisa o que está escondendo.** Num card de potência com o filtro
  de clima, ele conta quantos dispositivos servem às faixas e diz para trocar
  o filtro — em vez de trocar sozinho por baixo de você.

`device_filter` é **só do editor**: não muda nada do que o card desenha.

**A descoberta é estrita.** Dispositivo sem sensor de uma grandeza não empresta
outro: a célula fica cinza e honesta. Um purificador que só mede PM2.5 mostra
célula cinza nas faixas de CO₂ e de VOC — nunca a leitura do vizinho.

Atalho: `sections: [dev1, dev2]` equivale a `[{device: dev1}, {device: dev2}]`.

### Faixa

| Opção | O que faz |
|---|---|
| `metric` | A grandeza — veja a tabela das quatorze acima, ou `control` |
| `height` | Altura só desta faixa |
| `label` / `icon` | Sobrescreve o rótulo e o ícone da grandeza |
| `show_values` | Sobrescreve o global, só nesta faixa |
| `alpha` | Opacidade só desta faixa |
| `nominal` | **Só em `voltage`** — `220`, `127`, `cell`, ou omitido = automático |
| `max` | **Só em `current`** (limite do circuito, A) e **`energy`** (teto da régua, kWh) |
| `scale` | **Só em `battery`** — `fina` (padrão) ou `canonica` |
| `confirm` | **Só em `control`** — `true`, ou o texto do balão (`{nome}`, `{acao}`) |

O editor visual mostra o campo extra só na grandeza que o usa, e trocar a
grandeza de uma faixa apaga o parâmetro que era da anterior — um `max` de
circuito não quer dizer nada numa faixa de tensão.

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
node tools/probe.js          # 188 verificações, card e editor, sem navegador
node tools/gerar-imagens.js  # regera as imagens do README a partir do card
```

O probe é a bancada de testes de verdade. Ele roda com as **entidades reais**
do BASE-ALFA-01 (levantamento de 2026-09-06), incluindo os casos que só
aparecem numa casa de verdade: sensor de ar sem `device_class`, PM2.5 sem
unidade nenhuma, pilha Zigbee em mV no mesmo `device_class` da rede, e o
`sensor.electricity_maps_intensidade_de_co2` — que termina em `_co2`, não é o
ar da sala, e **tem de ser recusado** por uma faixa de CO₂.

Bancada visual (não abre por `file://` — o navegador recusa o módulo vizinho):

```bash
python3 -m http.server 8765
```

- `tools/bancada-editor.html` — **o editor**, com o filtro da lista de
  dispositivos nos quatro casos que importam: o padrão, o card de potência com
  o filtro de clima (que avisa o que esconde), a rede de segurança do
  dispositivo já escolhido, e o filtro de comandáveis
- `tools/bancada-controle.html` — **o fader, dirigível com o mouse**: as
  chamadas de serviço são escritas na tela em vez de enviadas, e o estado local
  responde como a casa responderia (com atraso de propósito, para exercitar o
  respiro de 700 ms). Prova o gesto sem acender lâmpada nenhuma às três da manhã
- `tools/bancada-escalas.html` — **todas as escalas, degrau a degrau**, mais os
  quatro erros que elas existem para não cometer (pilha em mV, unidades
  misturadas, descoberta estrita, semáforo do ar), claro e escuro
- `tools/bancada-papel.html` — os 49 papéis × os três relevos, claro e escuro
- `tools/bancada.html` — o `<select>` do editor sob enxurrada de `hass`

As imagens do README **não são print de tela**: `tools/gerar-imagens.js` roda o
card headless, lê o `linear-gradient` que ele mesmo produziu e escreve o SVG.
Mexeu numa escala, rode o script e o README já conta a verdade nova — print
envelhece calado.

Sete blocos canônicos são embutidos byte a byte entre marcadores:
`paper-palette`, `paper-dark-palette`, `mw-climate-scale` (regra 40),
`mw-air-quality-scale` (regra 90), `mw-level-scale`, `mw-electrical-scale`
(regra 180) e `touch-feedback v2` (a vibração e o balão de confirmação). Antes de commitar o `dist`: `IA/tools/check-embeds.sh`.
As escalas se editam **na fonte canônica**, nunca na cópia local.

Fluxo `feature → develop → release → main`; o merge na `main` dispara o bump
semântico, a tag e a release que o HACS enxerga.

## Licença

MIT © MAYCON WILLIAN OLIVEIRA
