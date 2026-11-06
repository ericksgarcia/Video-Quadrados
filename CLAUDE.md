# Corrida dos Quadrados — instruções para o Claude

Projeto do canal de TikTok do usuário: vídeos verticais (1080x1920, 60fps, ~60s) de corrida de
quadrados **só de cor** (vermelho, azul, amarelo, verde...), no estilo flat dos vídeos de
referência que o usuário mandou. Bandeiras/escudos ainda existem como opção (`--category`). Fale sempre em **português do Brasil**.

## ▶ "Faça o próximo vídeo" (procedimento COMPLETO e automático)

Quando o usuário escrever algo como **"faça o próximo vídeo"**, "próximo", "gera o próximo da pendente",
"pega um da fila": siga **todos** os passos abaixo, em ordem, **sem pedir confirmação** (ele já autorizou
tudo, inclusive excluir o vídeo da fila e publicar no branch padrão). Fale em português do Brasil. Uma
janela por vez (duas ao mesmo tempo pegariam o mesmo vídeo).

**0. Preparo.** `git fetch origin`. Vídeo da vez = `ls pendente/*.mp4 | sort | head -1`. Se `pendente/`
não tiver nenhum `.mp4`: avise e faça o fluxo "vídeo novo" (`npm run novo`, mais abaixo). Confirme as
ferramentas: `ffmpeg -version`, `node -e "require('playwright')"`
(se faltar Playwright: `npm install && npx playwright install chromium`).

**1. Ver o vídeo.** Copie o `.mp4` para uma pasta nova do scratchpad e extraia quadros com `ffmpeg` (primeiro quadro,
contact sheet `fps=1/3 ... tile`); **olhe** (Read mostra imagens) para ler o mapa, a ordem da quebra dos tijolos, o
caminho da massa, os pistões e a posição inicial. Veja também os prints parecidos em `referencias/` e as fases já
feitas em `src/levels.js`. (Não há mais analisador automático.)

**2. Criar a fase** (copie a estrutura de uma parecida):
- função nova em `tools/levelgen.py` (helper `unitmap(U, code, R0, C0)`; `R0=(48-2·alturaU)/2`,
  `C0=(36-2·larguraU)/2`) e o mapa gerado vira `map:` em `src/levels.js` (rode o `levelgen` e cole, ou
  gere com Python como nas fases anteriores);
- **donos dos tijolos**: tijolo de cor = dígito `'1'..'8'` = (índice do quadrado da MESMA cor)+1; os
  quadrados são numerados na ordem das células `S` do mapa **varrendo linha por linha (cima→baixo,
  esquerda→direita)**; `--teams` no render segue essa ordem dos índices (ex.: amarelo, azul, verde, vermelho
  da esquerda para a direita → `--teams amarelo,azul,verde,vermelho`). Tijolo escuro = `B`, chegada = `F`;
- `massTrack` seguindo o mapa de chegada da massa (um trecho por faixa, com velocidade em blocos/s);
  `pistons` com os números do relatório; `racerSize` = tamanho(unid)×56; `racerSpeed` = vel(unid/s)×56;
  `zoom` ≈ 0,9×1080 / (largura do mapa em px do jogo); `homing:0, steer:0, snap:0` nas cópias;
- **REGRA DE JUSTIÇA (obrigatória)**: rode `node tools/justica.mjs <id>`. O quadrado que nasce MAIS LONGE da saída tem de ser o
  dono da parede que libera todos (a parede de cor entre a prisão e o resto do caminho). Se o script sugerir `ownerPerm: [...]`,
  coloque na fase (o mapa continua igual ao vídeo; o motor troca os donos na leitura) e confira se `flood.stage2After` (que é o
  dígito-1 ORIGINAL do mapa) ainda aponta para a parede certa — em geral a massa só deve varrer a prisão depois que a SAÍDA abre;
- registre o id em `tools/novo.mjs` (listas `pick([...])`) e documente a fase aqui (seção Regras);
- **elementos que o motor ainda NÃO tem** (martelo, portais, quadrado lilás, bloco verde na chegada…):
  se aparecerem no vídeo, aproxime com o que existe (ou implemente no motor se for simples) e **diga
  claramente ao usuário o que foi aproximado**.

**3. Validar.** `npm test` e `npm run fisica` (e o histograma de esmagados se houver); prints com o
script Playwright (`?render=1`, veja `tools/render.mjs`/`src/main.js`: `__studio.setup/frame`) e compare
com `an/inicio.png` e `an/folha.png`: mapa, ordem de quebra, massa, pistões. Ajuste até ficar igual.

**4. Renderizar** (em segundo plano, ~2–4 min): `node tools/render.mjs --level <id> --teams <cores na ordem
dos índices> --theme concreto --best 30 --seed <n> --out videos/<id>-concreto.mp4`. Confira com um contact
sheet (`ffmpeg ... fps=1/5 ... tile`) e o final (sem placar, ~0,5s após o 1º chegar).

**5. Entregar.** `SendUserFile` do `.mp4` + legenda de TikTok pronta (sem revelar o vencedor) e um resumo
curto do que foi copiado/aproximado.

**6. Fechar (obrigatório, não esqueça).**
- print do início em `referencias/NN-nome.png` se ainda não existir (os 58 primeiros já existem; o nome traz
  os 8 primeiros caracteres do arquivo de vídeo) e linha da tabela de `referencias/LEIA-ME.md` →
  `feito (<id da fase>)`;
- **excluir o vídeo da fila**: `git rm pendente/<arquivo>.mp4`;
- atualizar este `CLAUDE.md` (regras da fase nova), `README.md` se preciso;
- `git add -A && git commit` (mensagem em português, com as linhas de atribuição pedidas no sistema);
- **publicar**: `git push -u origin <branch da sessão>` **e** `git push origin HEAD:claude/affectionate-albattani-ox3ava`
  (esse é o **branch padrão** do repositório — é de onde as janelas novas partem; o usuário autorizou
  publicar nele). Se for rejeitado (não é fast-forward): `git pull --rebase origin
  claude/affectionate-albattani-ox3ava` e repita.

## Referência rápida: config de uma fase (`src/levels.js`)

- `id, name, maxRacers, racers` (nº de quadrados; padrão 4), `zoom` (câmera), `racerSize` (px; 44), `racerSpeed`
  (px/s; 210), `homing/steer/snap` (instinto; 0 = quique livre), `endScreen` (true = tela de vencedor).
- `brickBlock: 2` (cada tijolo 2x2 blocos quebra sozinho), `colorBrickHp` (batidas do tijolo de cor),
  `brickHp` (do escuro), `knifeKeep: true` (faca não se gasta; `!` no mapa).
- `flood: { delay, zoneRate (blocos/s do stage1), delay2, stage2After (índice do dono cujo 1º tijolo quebrado
  dispara o stage2), stage2Gap (s), rate (blocos/s padrão dos trechos), accel, maxRate }`.
- `massTrack: { unit (1=blocos, 2=unidades), origin: [linha, coluna] do mapa no grid 36x48, stage1: [...] (em
  paralelo), stage2: [...] (em sequência), lanes: [[...],[...]] (sequências em paralelo) }`; trecho =
  `[linha0, col0, linha1, col1, dir, velocidade?]` (coordenadas DO MAPA ×unit; `dir`: `'up'` enche de baixo p/
  cima, `'down'`, `'left'`, `'right'`; frente sempre reta; não pinta parede/tijolo inteiro/`noFlood`; pistão
  fechado na frente segura).
- `pistons: [{ c, r, w, max, period, phase, dir }]` em coordenadas ABSOLUTAS de blocos (bloco do mapa + origin):
  `dir:'up'` (padrão) base na linha `r`, cresce p/ cima nas colunas `c..c+w-1`; `'down'` base na linha `r` (borda de cima), cresce p/ baixo; `'left'/'right'` base na coluna
  `c`, cresce nas linhas `r..r+w-1`; `max` em blocos; `period` s.
- `noFlood: [[r0,c0,r1,c1]]` (absolutos) áreas que a massa nunca preenche (nicho da faca, atalho).
- `map`: 48 strings de 36: `#` parede, `.` chão, `F` chegada, `B` escuro, `1`–`8` tijolo do quadrado índice+1,
  `S` largada, `!` faca. Exemplos prontos: Poços (14x18 u, 4 poços), Ponte (lanes+pistões), Escada (blocos,
  trechos com velocidade), Colunas (original, 5 quadrados).

## Bug de física corrigido (importante)

`squeeze()` (quadrado espremido pela massa/pistão escapa para o espaço livre mais próximo) agora só
escolhe destino com **caminho reto livre** (`clearPath`): antes podia teleportar o quadrado através de
paredes finas (apareceu como "todo mundo no nicho da faca aos 50s" na fase Colunas).

**Consequência**: depois dessa correção, `npm test` mostra ~15–30% de corridas sem vencedor em algumas
fases (quadrados que a massa prensa no teto da sala antes de a saída abrir morrem de verdade; antes o
teleporte os "salvava"). Tudo bem: o `novo`/`render --best 30` escolhe a melhor corrida e
`dramaScore` agora **penaliza esmagados** (−14 cada) e prefere ~55s. Se o usuário reclamar de mortes
por esmagamento, deixe a massa mais lenta ou pare a subida antes do teto. Há 0,6s de graça: a massa
segura (`massWait`) e o quadrado prensado pode quebrar o tijolo em que encosta (`pinT`).

## Criar fase do zero: lições (fase Colunas)

- Janelas/barras em corrente: cada quadrado encosta nas barras dos dois lados da sua coluna; só a
  cor do dono quebra. Calcule a ordem por busca (script em Python) para ter 1–2 começos e o menor
  deslocamento entre colunas; a ordem "óbvia" costuma ser a pior.
- A massa **nunca** deve selar a saída antes de os quadrados presos conseguirem sair; e não deve
  esmagar quem está no fundo: pare a subida antes do teto do cômodo (`massTrack` com trecho curto).
- Corredores estreitos (2 unidades) e longos com quique 100% livre demoram demais (difusão): use
  `homing` leve (0.1–0.2) em fases originais.
- Verifique sempre: `npm test`, `npm run fisica`, e o histograma de esmagamentos por tempo/lugar.

## Pasta `referencias/` (biblioteca de exemplos)

Prints do **início** de cada vídeo de referência (`01-…58-…png`, mais 2 folhas de contato `_folha-*.png`) + `LEIA-ME.md` com a tabela
(arquivo → fase → grade → resumo) e o **vocabulário de elementos** (prisões da largada, tijolos,
massa por trilho, pistões, atalho escuro, chegada, escala dos quadrados). Use essa pasta como
inspiração quando o usuário pedir para **criar uma fase do zero** (sem vídeo de referência):
olhe os prints, combine os elementos e registre a fase nova como nas outras.

## Quando o usuário pedir "um vídeo novo" (ou "faz outro vídeo", "gera mais um"...)

(Isto é **diferente** de "faça o próximo vídeo": aqui NÃO se usa a fila `pendente/`; sorteia-se uma fase que
já existe. "Próximo vídeo" / "da pendente" = procedimento completo no topo deste arquivo.)

1. Confirme as ferramentas (já vêm no ambiente de nuvem): `ffmpeg -version` e
   `node -e "require('playwright')"`. Se o Playwright faltar: `npm install` e
   `npx playwright install chromium`.
2. Rode **`npm run novo -- --handle "@seucanal"`** (rode em segundo plano; leva ~6 min). Ele sorteia
   fase, ordem das cores nas baias e a
   corrida mais emocionante entre 30 — **sem repetir** combinações já registradas em
   `historico.json`.
   - Fase padrão: sorteia **SÓ entre as cópias dos vídeos de referência** (pedido do usuário): `gaiola`, `cofre`, `ponte`,
     `escada`, `pocos`, `pente`, `pilares`, `meandro`, `portais`. A original `colunas` (5 quadrados, com "instinto") NÃO entra
     no sorteio; só com `--level colunas` se o usuário pedir. Se o usuário pedir algo
     específico, repasse: `--level gaiola|cofre|ponte|escada|pocos|colunas|derby|serpente|arena8`,
     `--teams vermelho,azul,amarelo,verde`, `--category clubes|selecoes` (bandeiras/escudos),
     `--theme concreto|pedra|geleira|roxo` (padrão: concreto), `--no-music`.
3. Envie o `.mp4` gerado em `videos/` ao usuário (SendUserFile) e mostre a legenda do `.txt` ao lado
   (sem revelar o vencedor). Ofereça 2–3 variações de legenda se ele pedir.
4. Faça commit **só do `historico.json`** (os vídeos ficam fora do git) e dê push na branch da sessão.

Não mude as regras do jogo abaixo sem o usuário pedir — elas foram definidas com ele, iteração por
iteração. Se ele pedir mudança, atualize esta lista.

## Regras do jogo (decididas com o usuário)

- **Quadrados só de cor** (categoria `cores`, título "QUAL COR VENCE?"; **com escudos**: ver abaixo). 4 cores clássicas
  (vermelho, azul, amarelo, verde) nas fases de 4; 8 cores na Arena 8.
- **Mapas no estilo das referências**: corredores largos (5 blocos = 140px) em serpentina/U,
  paredes de 2 blocos, alguns tijolos escuros comuns no caminho.
- **Fase principal: Gaiola** — cópia do 4º vídeo de referência (mapa de 16x21 unidades, 1 unidade =
  2x2 blocos). 4 baias empilhadas à direita, presas **em corrente**: cada barra é da cor de quem
  está logo abaixo dela; a barra de **saída** (em cima) é da cor do **último** preso (baia de baixo)
  e a barra que solta o último é da cor do **primeiro** (baia de cima). Cada tijolo (2x2) quebra
  sozinho, com 1 batida ("quebram 1 a 1").
- **Fase Cofre** — cópia do 5º vídeo de referência (mesma grade 16x21, espelhada): baias à
  **esquerda** com a mesma prisão em corrente; massa nasce na borda esquerda de cada baia; sobe,
  vai pelo topo para a direita, desce o corredor da direita, volta por baixo e sobe até a chegada
  (no meio, protegida por tijolos escuros de 2 batidas). Barra escura no meio = atalho entre os
  corredores (a massa não entra). **Sem faca.** 3 pistões **horizontais** (`dir: 'right'`).
- **Fase Ponte** — cópia do 6º vídeo (mapa 14x18 unidades, `zoom: 1.2`, quadrados menores
  `racerSize: 34`, ~4 unidades/s): duas metades simétricas; em cada sala de baixo uma dupla
  (vermelho+amarelo / verde+azul) e a coluna acima tem tijolos que **alternam as cores da dupla**
  (um abre para o outro). Chegada no topo cercada por um mosaico das cores das duplas. Barra em T
  com 2 pistões nas pontas (esquerda 8s, direita 10s). Massa sobe **bem devagar** (~0,12 unidade/s)
  pelas duas salas ao mesmo tempo (`massTrack.lanes`).
- **Fase Escada** — cópia do 7º vídeo (mapa de 32x42 **blocos**, `zoom: 1.08`, quadrados
  `racerSize: 34`, ~3,4 unidades/s): baias à esquerda na mesma prisão em corrente (verde, azul,
  vermelho, amarelo de cima para baixo; barra de saída em cima = cor do último; a que solta o
  último = cor do primeiro). A massa nasce na borda esquerda das baias (0,75 bloco/s, 6 blocos),
  depois **sobe** pelas baias (2,4 blocos/s), corre pelo **topo para a direita** (2,7), desce o
  eixo direito e uma **escada em zigue-zague** com 12 tijolos escuros de 1 batida (0,95 bloco/s,
  frente horizontal) e termina no corredor de baixo até a chegada (canto inferior esquerdo,
  atrás de 4 tijolos escuros). Sem pistões, sem faca. Cada trecho do `massTrack` pode ter
  velocidade própria (6º item, blocos/s). A massa não pinta por cima de tijolo ainda inteiro.
- **Fase Poços** — cópia do 8º vídeo (mapa 14x18 unidades, `zoom: 1.24`, `racerSize: 36`, ~4,2
  unidades/s): os **4 quadrados começam juntos** na sala de baixo (amarelo, azul, verde, vermelho
  da esquerda para a direita). 4 poços estreitos (1 unidade) sobem até uma sala grande; cada poço
  é fechado em cima por **UM tijolo da cor de um quadrado** (só ele quebra). Quem entra no poço
  errado fica esperando o dono do tijolo (o amarelo abre o seu primeiro e libera a subida para
  todos). A massa **sobe devagar e igual** (~0,13 unidade/s = 0,265 bloco/s, começa em ~1,2s) pela
  sala de baixo e pelos 4 poços. Chegada no canto de cima à esquerda atrás de 4 tijolos escuros
  (1 batida), num corredor sobre uma lingueta de parede com **1 pistão vertical** (8s, 2
  unidades). Sem faca. Duração varia muito (40–115s; referência ~63s) — a corrida depende de
  quem acerta o poço certo.
- **Fase Pente** — cópia do vídeo 09 (`07c1f66c`; mapa 19x22 **blocos**, 1 célula = 1 bloco, `brickBlock: 1`, `zoom 1.83`,
  `racerSpeed 170`, `racerSize 26` — no vídeo ~16px, aumentado para o escudo caber): 4 baias de 2 blocos no topo (verde,
  vermelho, ciano, amarelo da esquerda para a direita) presas em corrente por tijolos de 1 bloco x 4: vermelho (entre baias 1-2),
  ciano (2-3), verde (3-4) e por fim o **amarelo** (parede da esquerda, a saída). Depois serpentina de corredores de 3 blocos
  (1 **pistão** vertical de 10s no 1º corredor), tijolo escuro no meio (2 pontos) e 2 tijolos escuros + 2 antes da chegada
  (embaixo à esquerda). Massa: topo das baias desce 4 linhas (1s), e a **varredura da direita para a esquerda só começa
  1,5s depois que o verde quebra o 1º tijolo** (`stage2After: 0`) — senão prensa o amarelo antes da corrente abrir e todos
  morrem; depois percorre a serpentina (1,3–2,6 blocos/s). Sim.: ~27/30 com vencedor, ~64s (referência 63s).
- **Fase Pilares** — cópia do vídeo 10 (`08babe70`; mapa 14x18 unidades, `zoom 1.24`, `racerSize 40`, ~4,2 unidades/s, `brickBlock 2`,
  `knifeKeep`): 4 baias embaixo (vermelho, verde, ciano, amarelo da esquerda para a direita; `--teams vermelho,verde,ciano,amarelo`)
  separadas por tijolos de cor de 4 unidades: ciano (entre baias 1-2), verde (2-3), vermelho (3-4) e amarelo (saída pela direita).
  O amarelo já nasce junto do seu tijolo e sai primeiro; verde abre p/ ciano, ciano abre p/ vermelho. Depois: corredor da direita
  sobe → sala de cima → passagem de baixo → coluna do meio → sala da esquerda (**faca**) → chegada atrás de 3 tijolos escuros.
  2 **pistões horizontais** medidos no vídeo: A (linha 2, nasce na parede esquerda da sala da direita, 8s, 3 unid.) e B (linha 5,
  nasce na parede direita da coluna do meio, 10s, 3 unid.). Massa: sobe pelas 4 baias (0,4 unid/s) e **só varre a sala das baias
  1s depois que o vermelho quebra o 1º tijolo** (`stage2After: 0`; sem isso prensava quem ainda estava preso: 24 esmagados em 30
  corridas, agora 1); depois corredor da direita, faixa de cima, sala da direita, passagem de baixo e coluna do meio.
  Sim.: 0/30 sem vencedor, ~68s (referência 57s).
- **Fase Meandro** — cópia do vídeo 11 (`099c992e`; mapa 14x18 unidades, `zoom 1.24`, `racerSize 40`, ~4,2 unidades/s, `brickBlock 2`, sem faca):
  4 baias embaixo (ciano, vermelho, amarelo, verde da esquerda para a direita; `--teams ciano,vermelho,amarelo,verde`) separadas por
  tijolos de cor de 4 unidades: vermelho (1-2), ciano (2-3), verde (3-4) e amarelo (saída pela direita). Vermelho abre 1-2, verde abre
  3-4, ciano abre o meio e o amarelo sai. Depois: corredor da direita sobe → 2 tijolos escuros → desce pela coluna 9-10 → passagem
  inferior (pistão P2 **desce** da parede) → sobe pela coluna 6-7 → faixa de cima (pistão P1 sobe da col 5) → desce pela coluna 3-4
  → 2 tijolos escuros → coluna da esquerda sobe → 4 tijolos escuros → chegada no canto de cima. Pistões medidos: ambos 6s, pico em 3s,
  máx 2 unidades. **Novo no motor: pistão `dir: 'down'`** (base na linha `r`, cresce para baixo). Massa: sobe pelas baias (0,33 unid/s),
  varre a sala das baias (começa em 10s, ~0,9 unid/s), sobe o corredor da direita, faixa de cima, desce, passagem, sobe, faixa, desce
  (tempos medidos no vídeo). Sim.: 0/30 sem vencedor, ~75s (referência ~80s), nenhum esmagado.
- **Fase Portais** — cópia do vídeo 12 (`0aed7916`; mapa 16x20 unidades, `zoom 1.085`, `racerSize 50` (~0,9 unid.), ~4,2 unidades/s, `brickBlock 2`,
  `knifeKeep`): 4 baias horizontais à esquerda (ciano, verde, amarelo, vermelho de cima para baixo; `--teams ciano,verde,amarelo,vermelho`),
  cada uma com 3 unidades de fundo e, à direita, **barras horizontais de 4 unidades** em corrente: ciano (entre baias 1-2), amarelo (2-3),
  vermelho (3-4) e verde (teto da baia 1 = saída para a sala de cima). Sala de cima → 2 tijolos escuros → corredor de cima da serpentina
  (em zigue-zague, vãos alternando direita/esquerda, 6 corredores) → chegada embaixo à esquerda atrás de 2 tijolos escuros. **Portal de mão
  única** (`P` no canto de cima à direita → `p` no corredor de baixo, à esquerda; atalho que pula o meio da serpentina) e **faca** no corredor
  do meio. Massa: cresce da borda esquerda de cada baia (3 unid., 0,33 unid/s), depois **sobe pelo eixo das baias** (~1 unid/s, só começa
  depois que o verde quebra a barra dele: `stage2After: 1`) e corre pelo corredor de cima; o resto da serpentina é extrapolado (~1 unid/s,
  o vídeo acaba antes). Sem pistões. Largada centralizada na baia (quadrado grande). Os dois portais são desenhados roxos (como no vídeo).
  Sim.: 0/30 sem vencedor, ~66s (referência 43s), a faca elimina em média ~2,5 dos 4 (o best-of-40 escolhe a melhor).
- **Fase Colunas** (ORIGINAL, criada a partir do padrão dos 58 prints; **5 quadrados**, `racers: 5`, mapa
  17x20 unidades, `zoom 1.08`, `racerSize 36`, ~4,6 unidades/s, `homing 0.2 / steer 0.1 / snap 0.05`
  levemente guiado, senão os corredores estreitos demoram demais): 5 colunas na base, 1 quadrado em cada
  (vermelho, azul, amarelo, verde, ciano). A parede entre colunas tem uma **janela de 6 tijolos de cor**
  (só o dono quebra); janelas da esquerda para a direita: cores 2,1,5,4,3 (azul, vermelho, ciano, verde,
  amarelo): o 2º e o 4º abrem as primeiras ao mesmo tempo, depois o 1º e o 5º abrem as do meio e o 3º
  abre a **saída pela direita** (ordem escolhida por busca: deslocamento máximo de 2 colunas — a ordem
  "reversa" que parece óbvia é o pior caso). Depois: corredor da direita → corredor de baixo (**pistão** 8s +
  nicho com **faca** permanente, bem fundo) → sobe pela esquerda → corredor de cima (**pistão** 10s) → chegada
  atrás de 4 tijolos escuros; **atalho de 4 tijolos escuros** liga o corredor de baixo ao de cima. Massa
  (`massTrack`): 1) sobe pelas colunas e pelo fundo do corredor da direita a 0,22 bloco/s **só até 2
  unidades abaixo do topo das colunas** (sempre sobra faixa livre: sem esmagamento), 2) corredor da
  direita, 3) corredor de baixo, 4) esquerda, 5) topo a 0,6 bloco/s. `noFlood` protege o nicho da faca.
  Sim.: 23/30 com vencedor (os que travam são descartados pelo best-of-30), ~50–100s.
- **Massa sólida (não é água)**: cinza-chumbo de concreto (paleta Concreto), firme — ninguém entra nela; a frente **empurra os
  quadrados na hora**. Se prensar alguém contra a parede, ele escorrega no sentido do caminho; sem
  saída nenhuma, é esmagado. Na Gaiola a massa anda por um **trilho de trechos** (`massTrack`):
  cada trecho enche numa direção fixa, frente sempre reta, e só passa ao próximo quando o atual
  termina (ex.: sobe no canto até o teto e **só então** vai da direita para a esquerda) — nunca
  aparece de cima prensando. 1ª etapa nasce no fundo de cada baia e anda 3 unidades; 2ª etapa sobe
  do fundo da sala depois que a barra que solta o último abre; depois segue o caminho longo
  (~1,2 unidade/s); pistão fechado na frente segura a massa. A massa **não entra no atalho da faca**.
- **Pistões**: blocos escuros que crescem e recolhem (8s; no pico fecham a passagem por completo e
  seguram a massa). Verticais na Gaiola (pontas dos pilares), horizontais no Cofre. Quem ficar
  prensado sem espaço (massa + pistão) é esmagado, como o azul no vídeo de referência.
- **Faca permanente** (`knifeKeep`): quem pega elimina **todo mundo** em que encostar. Eliminado
  mostra um X e some.
- Largada imediata (sem 3-2-1). Quique livre, sem "instinto" (homing/steer 0). Quadrados ~275 px/s.
- **Quique PERFEITO** (pedido do usuário: "o quadrado muda o curso do nada ao bater"): ao bater em parede/tijolo/chão a
  velocidade só inverte o eixo da batida (ângulo de saída = de entrada), SEM desvio aleatório (`bounceJitter` padrão 0; antes era
  ±0,14 rad). Colisão entre quadrados só troca as velocidades (`hitJitter` padrão 0; antes ±0,2). Testado nas 9 cópias: igual ou
  melhor (menos corridas sem vencedor/esmagados), exceto a Pente (8/30 sem vencedor; o best-of-30 escolhe uma boa).
- Fases antigas (derby/serpente/arena8) continuam disponíveis, agora também com massa sólida.
- **Chegada**: na Gaiola é um nicho quadriculado sem tijolos (igual ao vídeo); nas fases antigas,
  tijolos duros (`finishBrickHp`).
- **Final sem placar**: o vídeo acaba ~0,5s depois que o 1º chega (sem comemoração, sem tela de
  vencedor) — o TikTok volta para o começo e a corrida "reinicia", como no vídeo de referência.
  (`endScreen: true` numa fase traz de volta a tela de vencedor.)
- **Física verificada** (`npm run fisica`): ninguém dentro de parede/tijolo/massa/pistão, ninguém
  um dentro do outro, ninguém travado. Quadrados empurrados pela massa não voltam para trás na
  colisão (o vizinho sai da frente); a separação nunca entra em parede/pistão; se a pilha estiver
  compactada, a massa segura um instante (pressão) em vez de enfiar um quadrado no outro.
- **Duração**: Gaiola ~65–80s (referência 78s); Cofre ~58–74s (referência 58s); Ponte ~55–105s
  (referência 82s); Escada ~60–85s (referência 58s); Poços 40–115s (referência 63s); fases
  antigas ~60s.
- Categorias opcionais com bandeira/escudo: Seleções x Times (clubes), cada uma com título próprio
  ("QUAL SELEÇÃO VENCE?" / "QUAL TIME VENCE?").
- Áudio todo sintetizado, ~-14 LUFS.

## Regra de justiça e área segura do TikTok (pedidos do usuário)

- **Justiça**: quem nasce mais longe da saída é o dono da parede que libera todos. `tools/justica.mjs` acha a parede de saída,
  mede a distância de cada largada e propõe a troca mínima de donos (`ownerPerm` na fase) que mantém a corrente solucionável.
  Aplicado: **Pilares** `[3,1,2,0]` (saída passa à baia 1; `stage2After: 3` = a massa só varre depois que a saída abre),
  **Meandro** `[2,1,0,3]` (saída passa à baia 1), **Portais** `[0,3,2,1]` (barra de saída passa à baia 4). Já cumpriam: Gaiola,
  Cofre, Escada, Pente. Não se aplica: Poços (todos nascem juntos, 4 poços) e Ponte (chegada cercada pelas 4 cores).
  Sim. (30): Pilares 0 sem vencedor/0 esmagados, vitórias por baia 6/7/11/6; Meandro 0/0, 15/5/5/5 (a baia 1 vence mais);
  Portais 0/0, ~85s.
- **Área segura do TikTok** (`SAFE` em `src/render.js`): nada importante em y<150 (barra de status + abas), x>945 entre y 700–1500
  (ícones da direita) nem y>1500 (@, legenda, música). O mapa ocupa x 24–945 / y 160–1500 no **maior zoom que cabe** (ignora o
  `zoom` da fase). `safe: false` nas opções do Renderer volta ao enquadramento antigo.
- **SEM textos no vídeo** (pedido do usuário: "não coloque legendas, mapa o maior possível"): nada de título ("QUAL ESCUDO
  VENCE?") nem lista de escudos no topo; os escudos aparecem só dentro dos quadrados. `texto: true` nas opções do Renderer
  traz o título/legenda de volta. A legenda do POST (TikTok/Instagram) continua normal (`.txt` do `novo`).

## Escudos nos quadrados (pedido do usuário)

- Biblioteca em `assets/escudos/*.png` (PNG sem fundo, 256x256) + `src/escudos.json`, gerada por `tools/escudos_build.py`
  (fontes no cabeçalho do script): 20 clubes da Série A 2026 e 36 grandes de Inglaterra, Espanha, Itália, Alemanha e França.
- **Sorteio só entre 25 escudos** (pedido do usuário): os 20 brasileiros + Real Madrid, Barcelona, Bayern, PSG e Man. City
  (campo `sorteio: true` em `src/escudos.json`; os outros 31 PNGs continuam na biblioteca, fora do sorteio).
- **Cada vídeo sorteia 4 escudos** (`novo` faz isso sozinho; no render manual use `--crests sorteio` ou `--crests id1,id2,id3,id4`
  na ordem dos índices dos quadrados). O `--teams` só define a ordem dos índices; com escudo, a cor vem do clube.
- **Quadrado na COR DO CLUBE** (pedido do usuário): campo `cor` em `src/escudos.json` (preto/branco → preto). O quadrado tem moldura
  grossa na cor do clube + miolo branco com o escudo grande; rastro e tijolos do dono também na cor do clube (a física não depende
  da cor: os tijolos são do dono pelo índice). Tijolo de clube preto ganha "tijolinho" claro (não confunde com o tijolo escuro).
  O sorteio (`pickCrests` em `src/teams.js`) nunca junta duas cores parecidas (ex.: dois vermelhos ou dois pretos).
- **Topo do vídeo**: hoje SEM texto (ver "SEM textos no vídeo"). Com `texto: true`, mostra o título e, para cada quadrado, o
  escudo na moldura da cor do clube, o nome e uma barra na cor do clube.
- No "próximo vídeo" use `--crests sorteio` no passo 4 (e cite os escudos sorteados na legenda).

## Publicação (TikTok + Instagram via R2 e Buffer) — `publicar.py`

Só publica vídeo que JÁ existe e que o dono aprovou (não gera nada). Canais: TikTok **aprendendo.facil99** e Instagram
**disputadostimes**, sempre no MESMO horário. Chaves: nunca no git/chat; o proxy do ambiente injeta o `Authorization: Bearer`
em api.buffer.com e api.cloudflare.com (sem variável: valor fictício). 401/403 = falta o segredo → pare e avise.

Comando para publicar um vídeo novo (próximo horário livre de 07:50, 11:50, 16:50, 20:30 em Brasília, capa no quadro de 1,2s):

    python3 publicar.py videos/<arquivo>.mp4 --legenda videos/<arquivo>.txt

Cancelar um agendado (apaga os posts no Buffer e o vídeo de pendentes/): `python3 publicar.py --cancela <slug>`.
Opções: `--capa-s 1.2`, `--quando 2026-11-07T11:50` (Brasília), `--agora`, `--redes tiktok,instagram` (Instagram avulso usa o
horário já registrado do TikTok, se ainda estiver no futuro). Conferir: `python3 publicar.py --fila`, `--status <slug>`
(slug = nome do arquivo sem `.mp4`), `--lista` (R2). Depois que os posts saírem: `python3 publicar.py --arruma` (move
`aprendendo-facil/pendentes/<slug>.mp4` → `enviados/`; NUNCA antes, quebraria o post agendado).

- R2: bucket `xlaudebuffer` (já existe, público), SÓ as pastas `aprendendo-facil/pendentes/` e `aprendendo-facil/enviados/`.
  O script confere que o link público `https://pub-cd071ac800384b009eaf3ddab42583fe.r2.dev/<chave>` devolve 200 com o
  arquivo inteiro antes de criar os posts.
- Buffer: canais achados pelo NOME (`channels { id name service isDisconnected }`); para se faltar/desconectado. Post por
  rede: `createPost` com `mode: customScheduled`, vídeo = link do R2, `thumbnailOffset` (ms), TikTok `isAiGenerated:false`,
  Instagram `type: reel` + `shouldShareToFeed: true` + `isAiGenerated:false`.
- `publicados.json` (no git) registra cada post (slug, rede, id no Buffer, horário, link, chave no R2, capa em ms) e impede
  duplicata. Os 4 vídeos de escudos de 05–06/11 (pente, pilares, meandro, portais) foram postados fora do script e estão
  registrados lá; pente/meandro/portais saíram só no TikTok.
- Legenda: o `--legenda` aceita um `.txt` ou o próprio texto; sem ele, usa `VIDEO.txt` ao lado do vídeo (o `npm run novo` já
  escreve esse `.txt`). Se faltar vídeo ou legenda, o script para e diz qual.

## Visual (estilo flat, copiado dos 3 vídeos de referência que o usuário mandou)

- **Paleta Concreto (escolhida pelo usuário)**: fundo/paredes cinza `#5b636c` (paredes = fundo,
  não são desenhadas), corredores brancos `#f1efe9` com contorno escuro fino (~3,5px), massa
  concreto cinza-chumbo `#3c434b`, pistões quase pretos `#22262b`, tijolo escuro `#2c3035`, título
  claro `#f6f6f2`. Outras paletas em `THEMES` (render.js): pedra, geleira, roxo (índigo original). A massa nunca é
  vermelha/azul/amarela/verde (não confunde com os quadrados). Mapa centralizado na tela.
- Tijolos: cor sólida + desenho de "tijolinho" em linhas escuras, contorno preto. Tijolo comum/da
  chegada é escuro (da paleta). Chegada quadriculada preto/branco.
- Massa chapada (sem gradiente), frente reta de parede a parede.
- Quadrados: cor chapada com contorno preto, sem sombra/brilho; rastro em cunha semitransparente
  da mesma cor. Paleta: vermelho `#d50000`, azul `#265ef3`, amarelo `#ffd839`, verde `#007d53`,
  ciano, laranja, roxo, rosa.
- Eliminado fica parado com um X. Faca: lâmina ciano + cabo roxo.
- Sem HUD: nada de contagem 3-2-1, popups, faixas, chips, cronômetro, tremida ou flash. E agora também SEM título:
  nenhum texto no vídeo, só o mapa (o maior possível na área segura do TikTok).
- Sem zoom no final. Quando o 1º chega: ~0,5s e o vídeo acaba (sem placar).

## Como o projeto funciona

- `src/game.js` simulação determinística (mesma seed = mesma corrida); `src/render.js` visual;
  `src/audio.js` sons/música; `src/teams.js` cores/bandeiras/escudos; `src/levels.js` mapas ASCII 36x48.
- `tools/render.mjs` renderiza MP4 quadro a quadro (Playwright + ffmpeg); `tools/novo.mjs` sorteia
  e chama o render; `tools/levelgen.py` gera os mapas (`derby()`, `serpente()`, `arena8()`) cavando retângulos; `gaiola()`, `cofre()` e `ponte()` são desenhadas em unidades (helper `unitmap`); `escada()` em blocos; `pocos()` e `colunas()` em unidades.
- Ao mexer em fases/física, rode `npm test` (simula corridas; mire 100% com vencedor) e
  `npm run fisica` (acusa quadrado dentro de parede/massa/pistão/outro quadrado ou travado). Use prints (Playwright em `?render=1`) para conferir o visual antes de renderizar.
- `tools/fisica.mjs` (`npm run fisica`) verifica a física. `tools/levelgen.py` tem uma função por fase.
- `npm start` abre o painel interativo em http://localhost:5173.
