# Papel e relevo 3D no MW Rainbow Card — 25/08/2026

**Estado:** código pronto, CI verde, **PR #4 aberto aguardando o seu merge**.
<https://github.com/visaodeempresa/mw-ha-rainbow-card/pull/4>

**Decisão pendente para você:** duas, no fim deste arquivo.

---

## 1. O que o card ganhou

As duas opções que o **MW Power Button** já tinha:

| Opção | Padrão | O que faz |
|---|---|---|
| `paper_color` | `none` | `none` = fundo do tema · `paper` = creme original · `<matiz>-<1..7>` = as 49 cores de papel encardido da família (`red`, `orange`, `yellow`, `green`, `blue`, `indigo`, `violet` × 7 tons) |
| `paper_dark` | `false` | A **mesma chave**, lida na rampa de noite. Manda também no tom da luz do relevo |
| `depth` | `soft` | `soft` = a sombra de sempre · `3d` = o relevo do botão de tomada · `flat` = chapado |

```yaml
type: custom:mw-rainbow-card
paper_color: yellow-3
depth: 3d
sections: [dev1, dev2, dev3]
bands: [temperature, humidity]
```

### As três decisões de desenho que valem saber

1. **A folha sobe, as faixas afundam.** No `3d` a folha leva o relevo saliente
   do MW Power Button ligado (`inset 4px 4px 8px rgba(255,252,240,0.90)` no
   claro) e as faixas levam o relevo **afundado**. Dar relevo saliente aos dois
   deixaria duas coisas salientes e o olho não decide qual está por cima de
   qual — vira adesivo colado, não objeto. Isso foi para
   `IA/knowledge/ha-lovelace-cards.md`.

2. **Quem manda no tom da luz é o fundo, não a folha.** Branco a 0,90 é luz no
   papel creme e **risco de giz** no escuro. Por isso `paper_dark` governa o
   relevo **mesmo com `paper_color: none`** — sem folha, o fundo é o cartão do
   tema.

3. **A tinta acompanha o papel.** Com papel, o nome do card e a identificação
   da faixa passam ao `paperInk()` da paleta — mas **só** se você não tiver
   escolhido as suas em `color_name` / `color_band_label`, senão a opção do
   editor viraria decoração.

### Compatibilidade

- **O padrão não mexe em nada:** `paper_color: none` + `depth: soft` é o card
  de ontem, byte por byte na tela.
- `shadow` e `lift` se recolheram para dentro do `depth`. YAML antigo continua
  valendo — a tradução acontece uma vez, no `setConfig` (`shadow: false` →
  `flat`, `lift: true` → `3d`). `depth` escrito na mão ganha dos dois.

## 2. Como isso foi conferido

- `node --check` e `node tools/probe.js` → **tudo ok**, com **22 checagens
  novas** (papel claro, papel de noite, os três relevos, a tinta, o legado
  `shadow`/`lift`, e os campos novos no editor).
- `IA/tools/check-embeds.sh` → as duas paletas batem byte a byte com `IA/lib/`.
- CI do PR #4: **pass** nas duas execuções.
- **Bancada visual nova** — `tools/bancada-papel.html`, aberta e olhada em
  página clara e escura antes do PR. Ela mostra, em grade: os três relevos sem
  papel; seis papéis claros × relevo; quatro papéis de noite × relevo; e dois
  no modo vertical. O que a imagem contou: a folha e a tinta trocam certo nos
  dois temas, o `3d` se distingue do `soft` sem exagero, e o modo **vertical
  deixa um vazio grande à direita da folha** — as faixas não esticam na largura
  da coluna. Isso é a geometria de sempre do vertical, que o papel só tornou
  visível; não é regressão. Está documentado no README e na skill.

```bash
python3 -m http.server 8765
# http://localhost:8765/tools/bancada-papel.html
```

## 3. O que foi para o harness

- `IA/knowledge/ha-lovelace-cards.md` — seção nova «Papel com conteúdo em cima:
  a folha sobe, o conteúdo afunda», ao lado da irmã de mesma raiz.
- `IA/tools/check-embeds.sh` — `mw-ha-rainbow-card` registrado como consumidor
  de `paper-palette v1` e `paper-dark-palette v1`.
- **As duas libs pararam de enumerar consumidores.** O README do
  `paper-palette` dizia *dois* quando o `check-embeds.sh` já conhecia *nove*.
  Lista que mente é pior que lista nenhuma: agora as duas apontam para o
  script, que é a lista viva.
- `IA/lib/mw-devops/repos.tsv` — o que o `check` deste repo realmente diz hoje.
- `IA/CHANGELOG.md` + `make check` verde.
- **Skill do repositório escrita** — `.claude/skills/mw-rainbow-card/SKILL.md`.
  A pasta existia **vazia** desde 02/08/2026. São sete armadilhas com sintoma
  observável, incluindo o `<select>` que fechava sozinho e o vão da escala de
  umidade.
- Três arquivos de `knowledge/` que o CHANGELOG de 24/08 anunciava e que nunca
  tinham sido commitados foram para dentro do repo do harness.

## 4. As duas decisões que são suas

### a) O merge do PR #4

É o que dispara o auto-release → tag → release com asset → o HACS mostrar a
atualização no HA. Eu não mergeio (é regra da casa, e a ação foi barrada aqui
de qualquer forma). Use **Create a merge commit** — *rebase* e *squash*
reescrevem os commits e derrubam a sua assinatura GPG.

Depois do merge, se o HA continuar servindo a versão velha, o problema **não é
cache do navegador**: é o retrato que o HACS guarda do repositório. Pelo
WebSocket, `hacs/repository/refresh`, e depois conferir no destino:

```bash
curl -s "$HA_URL/hacsfiles/mw-ha-rainbow-card/mw-rainbow-card.js" | grep -ao '%c [0-9.]* '
```

### b) O «instalar sozinho no HA» — que nunca foi ligado em repo nenhum

Você pediu que o DevOps instalasse automaticamente no HA. A esteira padrão tem
exatamente isso (`deploy-ha.yml` + `tools/publicar-no-ha.py`: o runner fala com
o HA pela Nabu Casa e manda o HACS baixar), **mas ela precisa dos segredos
`HA_URL` e `HA_TOKEN` no repositório do GitHub** — e, em 25/08/2026,
**nenhum** dos repos MW tem esses segredos. Conferido em três deles; a lista
que o `mw-devops.sh check` cospe para este repo tem 12 itens, e dois são
justamente os segredos.

Ou seja: essa automação existe no template e nunca foi ativada. Ativar
significa **subir um token de longa duração do seu HA para os segredos do
GitHub**. Isso é decisão sua, não minha — por isso parei aqui em vez de fazer.

- **Se quiser ligar:** eu aplico o padrão de DevOps neste repo (workflows do
  template, `deploy-ha.yml`, `publicar-no-ha.py`, `develop` como branch padrão,
  ruleset) e você cadastra os dois segredos — ou me autoriza a cadastrá-los a
  partir do `.env` do `ha-dashboards`.
- **Se não quiser:** o fluxo continua o de hoje — merge → release → HACS avisa
  no HA → você clica em atualizar. Funciona; só não é automático até o disco da
  casa.

Enquanto isso o repo fica como está: a padronização de DevOps **não** entrou
neste PR de propósito, para não misturar esteira com feature (é exatamente a
armadilha «mergeie a esteira primeiro» da skill `mw-devops-repo`).
