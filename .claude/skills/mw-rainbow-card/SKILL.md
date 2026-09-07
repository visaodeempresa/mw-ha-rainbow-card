---
name: mw-rainbow-card
description: Mexer no MW Rainbow Card do Home Assistant (custom:mw-rainbow-card) — o arco-íris de ambientes, com seções por dispositivo × faixas de temperatura, umidade, qualidade do ar (CO₂, TVOC, formaldeído, PM2.5), potência, consumo, tensão, corrente, iluminância, bateria, RSSI e LQI, mais a faixa que COMANDA luz, tomada, ventilador e cortina. Use quando o Maycon falar em "arco-íris", "régua de ambientes", "a faixa da casa inteira", "cor de papel no arco-íris", "aspecto 3D nesse card", "o card não bate com os button-card", "o menu do editor fecha sozinho", "quero comandar pelo arco-íris", "arrastar para regular o brilho", "a pilha aparece como sobretensão", "a faixa de VOC está toda cinza", ou quando pedir grandeza nova, sentido novo ou papel novo neste card.
---

# MW Rainbow Card

Arco-íris de ambientes: **N seções** (uma por dispositivo) × **N faixas**
(uma por grandeza) — e, desde 06/09/2026, uma faixa que **comanda**. Arquivo
único, sem build: `dist/mw-rainbow-card.js` é fonte **e** artefato.

Para o ciclo de fábrica de card em geral (geometria, `ha-form`, deploy de
teste, cache do HACS) a skill é a `ha-lovelace-card-factory`. Aqui é só o que
é deste card.

## Pré-condições

| Preciso de | Como conferir | Se faltar |
|---|---|---|
| `node` ≥ 18 | `node -v` | o `--check` e o probe não rodam |
| `IA/` montado | `ls /Volumes/SSD-T1-01/CLAUDE-SSD/IA` | não commite o `dist`: as paletas de papel são blocos embutidos e não dá para conferir |
| `gh` autenticado | `gh auth status` | faça só a parte local e **declare** que o lado GitHub não foi conferido |

## Fluxo

```bash
node --check dist/mw-rainbow-card.js     # sintaxe
node tools/probe.js                      # card + editor fora do navegador
node tools/gerar-imagens.js              # regera as imagens do README do card
IA/tools/check-embeds.sh                 # blocos de IA/lib/ batem byte a byte
python3 -m http.server 8765              # bancadas (ver abaixo)
```

Depois: branch `feature/*` → commit assinado, em inglês, com emoji →
`gh pr create` → **merge é do dono** → o push na `main` tocando `dist/**`
dispara o auto-release → o HACS enxerga.

Bancadas (nenhuma abre por `file://` — o navegador recusa o módulo vizinho):

- `tools/bancada-editor.html` — o editor e o **filtro da lista de
  dispositivos** nos quatro casos que importam.
- `tools/bancada-escalas.html` — todas as escalas degrau a degrau **e os quatro
  erros que elas existem para não cometer** (pilha em mV, unidades misturadas,
  descoberta estrita, semáforo do ar).
- `tools/bancada-controle.html` — o fader dirigível com o mouse; as chamadas de
  serviço são **escritas na tela**, não enviadas.
- `tools/bancada-papel.html` — os papéis × os três relevos, em página clara e
  escura. É o que responde "ficou bom?" sem subir nada.
- `tools/bancada.html` — o `<select>` do editor sob enxurrada de `hass`.

⚠️ **O navegador cacheia o `dist` e a bancada mente:** você edita, recarrega e
continua vendo o código velho. Todas as bancadas carregam o módulo com carimbo
de tempo desde 07/09 — se uma nova for criada sem ele, este é o sintoma.
Conferir sempre no destino: `curl -s localhost:8765/dist/... | grep <marcador>`.

⚠️ **Bancada em aba oculta engana:** o `requestAnimationFrame` congela quando a
página não desenha, então a pintura otimista do arrasto não acontece e o toque
longo dispara. Não é bug do card — é a aba. Conferir com a aba visível, ou por
evento sintético (`new PointerEvent(...)`), que foi como o fader foi provado.

## As quatorze grandezas, e de onde vem a régua de cada uma

**O card é consumidor das escalas, não dono delas.** Escala se edita na fonte
canônica em `IA/lib/`, nunca na cópia local — depois `check-embeds.sh --fix`.

| grandeza | régua | fonte |
|---|---|---|
| `temperature` `humidity` | clima | `mw-climate-scale v1` · regra 40 |
| `co2` `tvoc` `hcho` `pm25` | semáforo | `mw-air-quality-scale v1` · regra 90 |
| `power` `energy` `voltage` `current` | elétrico | `mw-electrical-scale v1` · regra **180** |
| `illuminance` `battery` | nível | `mw-level-scale v1` |
| `rssi` `lqi` | rampa local | só aqui (não é canônica) |
| `control` | o estado da entidade | — |

Parâmetros por faixa: `nominal` (tensão), `max` (corrente/consumo),
`scale` (bateria: `fina` padrão ou `canonica`), `confirm` (controle).

## A faixa que comanda (`metric: control`)

Toque liga/desliga · arrastar ajusta o nível · segurar parado abre o
`more-info`. Domínios: `light`, `switch`, `fan`, `cover`, `input_boolean`.

O que **não** se mexe sem entender:

- **`_grab`** trava o `set hass` enquanto o dedo está na tela, e o `_respirar()`
  segura 700 ms depois de soltar. Sem os dois, o eco do HA desfaz o gesto no
  meio (é o "o cursor volta sozinho").
- **Serviço só no soltar.** Durante o arrasto não sai chamada nenhuma.
- **Um listener por evento, no shadow root**, pendurado uma vez. Nunca voltar a
  pendurar por célula — eram 48 recriados a cada leitura que chegava.
- **O véu anda por `transform`.** `width`/`left` forçam layout a cada quadro.
- **Só a célula que arrasta leva `touch-action: none`.**

## O que é próprio deste card

- **Seção = dispositivo.** As entidades saem por descoberta a partir do
  `device`, e a descoberta é **estrita**: dispositivo sem LQI não empresta a
  temperatura para a faixa de LQI. Existe teste para isso no probe.
- **Entidade explícita mora em `entities: {<grandeza>: <id>}`.** As cinco
  chaves antigas (`temp_entity`…) continuam lidas, mas não nascem mais.
- **Duas semânticas de degrau.** Clima, nível e elétrico usam limite
  **superior** (`v <= s`); qualidade do ar usa limite **inferior**
  (`v >= from`) — 800 ppm de CO₂ **já é** atenção. O `bandColor` conhece as
  duas, e a de ar nunca interpola.
- **Unidade: a tela mostra uma coisa, a cor usa outra.** A célula escreve o que
  a entidade reporta (3097 mV); a cor usa a unidade-base (3,097 V).
- **Cor = escala canônica da casa.** Faixa **seca** por padrão — é assim que os
  `button-card` pintam. `scale_blend` interpola dentro da escala; `blend`
  costura uma seção na vizinha. São coisas diferentes.
- **Os selects de entidade são preguiçosos.** Seção com o painel fechado não
  monta select nenhum; eles nascem no `toggle`. Medido na casa real (2.931
  estados): antes eram 2.469 `<option>` e 317 KB refeitos a cada repintura
  (28,7 ms); agora são 472 e 37 KB (3,3 ms). O que está aberto mora em
  `this._abertos` — **na instância, não no DOM**, porque o DOM é refeito por
  `innerHTML` e ler o estado de lá depois seria ler o que já se perdeu.
- **O «automático» diz o que achou.** A opção mostra a entidade que a
  descoberta resolveu, ou «nada neste dispositivo» — e o rótulo da grandeza
  fica âmbar com «· sem sensor». Antes, a diferença entre uma célula pintada e
  uma cinza só aparecia depois de salvar.
- **`device_filter` é só do editor** (padrão `clima`, que é o que o card
  sempre fez e o que torna a montagem prática). Duas garantias que não se
  quebram: dispositivo **já escolhido** numa seção fica na lista mesmo fora do
  filtro (marcado «fora do filtro»), e o editor **conta e avisa** o que está
  escondendo em vez de trocar o filtro sozinho. Filtro cuja grandeza não
  existe no build **não vira opção** — resolveria para lista vazia e pareceria
  bug (é assim que «comandáveis» aparece só quando a faixa de comando existe).
- **Papel e relevo** (desde 25/08/2026): `paper_color` (49 tons + creme +
  `none`), `paper_dark` (a mesma chave na rampa de noite) e `depth`
  (`flat` | `soft` | `3d`). Os números do `3d` são os do MW Power Button
  ligado.

## Armadilhas (com sintoma observável)

| Sintoma | Causa | Correção |
|---|---|---|
| **Toda pilha Zigbee cheia** pintando de «sobretensão crítica» | 3097 **mV** lidos como 3097 V | normalizar a unidade antes da escala (`mwElectricalUnit`); abaixo de 60 V a régua é de **pilha** |
| Faixa de **VOC / formaldeído / PM2.5 toda cinza** | sete dos dez sensores de ar da casa **não têm `device_class`** | esses se descobrem por **pista no fim do id + unidade**, nunca por classe |
| Faixa de CO₂ marcando **231 gCO2eq/kWh** | o `sensor.electricity_maps_intensidade_de_co2` termina em `_co2` e é a pegada de carbono da **rede** | a pista só vale com a unidade batendo (`ppm`). Há teste no probe com esse entity_id |
| **810 ppm de CO₂ pintando verde** | os degraus de ar são limite **inferior** | `scale.lower`; não "uniformizar" com as outras escalas |
| Faixa de **kWh toda da mesma cor** | um sensor de *total de vida* (120.590 kWh) esmaga os outros na normalização | `max:` explícito, ou não misturar total de vida com consumo do dia |
| O **cursor volta sozinho** ao soltar | `_grab`/`_respirar` não seguram o `set hass` | os dois são obrigatórios; o eco do HA chega depois da chamada |
| **A tela para de rolar** em cima do card no celular | `touch-action: none` vazou para as células de leitura | ele mora só em `.cell.ctl.arr` |
| Arrasto **lento** abrindo o `more-info` em vez de regular | o toque longo disparava aos 500 ms antes do movimento chegar | o hold morre no **primeiro** movimento, antes do limiar de 5 px |
| Arco-íris de **um dispositivo só saindo sem cor** | `background-image: rgba(...)` é CSS inválido → `none` | corrigido em 06/09/2026; havia teste **fixando o bug** como esperado |
| A **tomada não aparece** na lista de dispositivos do editor | o filtro padrão é `clima` | trocar para «As grandezas deste card» — o editor já avisa quantos está escondendo |
| Trocar o filtro **esvaziou o select** de uma seção montada | não é para acontecer: há rede de segurança | dispositivo em uso entra na lista marcado «fora do filtro»; se sumiu, o `_dispositivos()` regrediu |
| O menu do `<select>` do editor **fecha sozinho** enquanto o dono escolhe o dispositivo | o HA empurra um `hass` a cada leitura que chega, e o painel de seções era refeito por `innerHTML` em cima do campo aberto | o editor só repinta quando o **registro** muda (`sameRegistry`) e nunca com campo em foco (`_busy`); pintura pendente sai no `focusout`. Há teste no probe — não mexa nisso sem rodá-lo |
| Faixa de LQI mostrando a **temperatura** do ambiente | descoberta "qualquer sensor do dispositivo" | a descoberta é por grandeza, e falta de sensor é célula cinza. Teste: "dispositivo sem LQI/bateria/RSSI não empresta a temperatura" |
| Sensor com 58,995 % piscando **preto** | a escala de umidade do template original fecha a faixa em `n.99` e deixa `(n.99, n+1)` sem dono, caindo no fallback (a cor de 100 %) | o vão está fechado de propósito no `mw-climate-scale v1`; não "simplifique" os limites |
| Papel novo no card e o `check-embeds.sh` **reprova** | a paleta é bloco embutido byte a byte; editar a cópia local diverge da fonte | edite `IA/lib/paper-palette` (ou `paper-dark-palette`) e rode `IA/tools/check-embeds.sh --fix`; consumidor novo entra na lista **dentro do `check-embeds.sh`** |
| Com papel claro num tema escuro, o **nome do card some** | `color_name` nasce como `var(--primary-text-color)` — texto claro em cima de folha creme | com papel o card troca para a tinta do `paperInk()`, **só** se o dono não tiver escolhido a dele. Se escolheu, é escolha dele |
| Card com `paper_color` e `depth: 3d` num tema escuro parecendo **riscado de giz** | o relevo claro usa branco a 0,90, que é luz no papel claro e giz no escuro | `paper_dark: true` — ele manda no relevo mesmo sem folha |
| `shadow`/`lift` no YAML e o card ignorando | viraram `depth` | são traduzidos no `setConfig` (`shadow: false` → `flat`, `lift: true` → `3d`); `depth` escrito na mão ganha dos dois |
| No `orientation: vertical` o papel fica com um **vazio enorme** à direita | as faixas não esticam na largura da coluna — geometria de sempre do modo vertical, que a folha só tornou visível | acerte `length` e a largura da coluna do dashboard; não é regressão |
| Mudei o `dist` e o HACS **não oferece** versão nova | o auto-release só dispara em push na `main` tocando `dist/**` | mergear o PR (é do dono). Se a release saiu e o HA continua velho: `hacs/repository/refresh` pelo WebSocket, depois `curl` no que o servidor entrega |

## Verificação

```bash
node tools/probe.js
```

Esperado: **203** `ok`, a última linha `tudo ok` e o `exit 0`. Qualquer `FAIL` imprime o
começo do HTML gerado — leia o HTML antes de mexer no teste.

O probe também prova **o que a casa recebeu**, não só o que está no repositório:

```bash
curl -s "$HA_URL/hacsfiles/mw-ha-rainbow-card/mw-rainbow-card.js" -o /tmp/x.js
MW_CARD=/tmp/x.js node tools/probe.js
```

É a diferença entre «o meu arquivo passa» e «o que chega na casa passa».

E, no destino (regra 30), depois da release:

```bash
curl -s "$HA_URL/hacsfiles/mw-ha-rainbow-card/mw-rainbow-card.js" | grep -ao '%c [0-9.]* '
```
