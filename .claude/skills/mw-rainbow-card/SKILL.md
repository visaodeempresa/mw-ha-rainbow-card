---
name: mw-rainbow-card
description: Mexer no MW Rainbow Card do Home Assistant (custom:mw-rainbow-card) — o arco-íris de ambientes, com seções por dispositivo × faixas de temperatura, umidade, bateria, RSSI e LQI. Use quando o Maycon falar em "arco-íris", "régua de ambientes", "a faixa da casa inteira", "cor de papel no arco-íris", "aspecto 3D nesse card", "o card não bate com os button-card", "o menu do editor fecha sozinho", ou quando pedir grandeza nova, sentido novo ou papel novo neste card.
---

# MW Rainbow Card

Arco-íris de ambientes: **N seções** (uma por dispositivo) × **N faixas**
(uma por grandeza). Arquivo único, sem build: `dist/mw-rainbow-card.js` é
fonte **e** artefato.

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
IA/tools/check-embeds.sh                 # blocos de IA/lib/ batem byte a byte
python3 -m http.server 8765              # bancadas (ver abaixo)
```

Depois: branch `feature/*` → commit assinado, em inglês, com emoji →
`gh pr create` → **merge é do dono** → o push na `main` tocando `dist/**`
dispara o auto-release → o HACS enxerga.

Bancadas (nenhuma abre por `file://` — o navegador recusa o módulo vizinho):

- `tools/bancada-papel.html` — os papéis × os três relevos, em página clara e
  escura. É o que responde "ficou bom?" sem subir nada.
- `tools/bancada.html` — o `<select>` do editor sob enxurrada de `hass`.

## O que é próprio deste card

- **Seção = dispositivo.** As entidades saem por descoberta a partir do
  `device`, e a descoberta é **estrita**: dispositivo sem LQI não empresta a
  temperatura para a faixa de LQI. Existe teste para isso no probe.
- **Cor = escala canônica da casa** (`mw-climate-scale v1`, regra global 40).
  Faixa **seca** por padrão — é assim que os `button-card` pintam, e é o que
  faz o arco-íris bater com o resto da tela. `scale_blend` interpola dentro da
  escala; `blend` costura uma seção na vizinha. São coisas diferentes.
- **Papel e relevo** (desde 25/08/2026): `paper_color` (49 tons + creme +
  `none`), `paper_dark` (a mesma chave na rampa de noite) e `depth`
  (`flat` | `soft` | `3d`). Os números do `3d` são os do MW Power Button
  ligado.

## Armadilhas (com sintoma observável)

| Sintoma | Causa | Correção |
|---|---|---|
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

Esperado: a última linha é `tudo ok` e o `exit 0`. Qualquer `FAIL` imprime o
começo do HTML gerado — leia o HTML antes de mexer no teste.

E, no destino (regra 30), depois da release:

```bash
curl -s "$HA_URL/hacsfiles/mw-ha-rainbow-card/mw-rainbow-card.js" | grep -ao '%c [0-9.]* '
```
