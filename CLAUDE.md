# Corrida dos Quadrados — instruções para o Claude

Projeto do canal de TikTok do usuário: vídeos verticais (1080x1920, 60fps, ~60s) de corrida de
quadrados **só de cor** (vermelho, azul, amarelo, verde...), no estilo flat dos vídeos de
referência que o usuário mandou. Bandeiras/escudos ainda existem como opção (`--category`). Fale sempre em **português do Brasil**.

## Quando o usuário pedir "um vídeo novo" (ou "faz outro vídeo", "gera mais um"...)

1. Confirme as ferramentas (já vêm no ambiente de nuvem): `ffmpeg -version` e
   `node -e "require('playwright')"`. Se o Playwright faltar: `npm install` e
   `npx playwright install chromium`.
2. Rode **`npm run novo -- --handle "@seucanal"`** (rode em segundo plano; leva ~6 min). Ele sorteia
   fase, ordem das cores nas baias e a
   corrida mais emocionante entre 30 — **sem repetir** combinações já registradas em
   `historico.json`.
   - Fase padrão: sorteia entre **`gaiola`** e **`cofre`** (cópias dos vídeos de referência). Se o
     usuário pedir algo específico, repasse: `--level gaiola|cofre|derby|serpente|arena8`,
     `--teams vermelho,azul,amarelo,verde`, `--category clubes|selecoes` (bandeiras/escudos),
     `--theme concreto|pedra|geleira|roxo` (padrão: concreto), `--no-music`.
3. Envie o `.mp4` gerado em `videos/` ao usuário (SendUserFile) e mostre a legenda do `.txt` ao lado
   (sem revelar o vencedor). Ofereça 2–3 variações de legenda se ele pedir.
4. Faça commit **só do `historico.json`** (os vídeos ficam fora do git) e dê push na branch da sessão.

Não mude as regras do jogo abaixo sem o usuário pedir — elas foram definidas com ele, iteração por
iteração. Se ele pedir mudança, atualize esta lista.

## Regras do jogo (decididas com o usuário)

- **Quadrados só de cor** (categoria `cores`, título "QUAL COR VENCE?"). 4 cores clássicas
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
- Fases antigas (derby/serpente/arena8) continuam disponíveis, agora também com massa sólida.
- **Chegada**: na Gaiola é um nicho quadriculado sem tijolos (igual ao vídeo); nas fases antigas,
  tijolos duros (`finishBrickHp`).
- **O vídeo termina assim que o 1º chega** (~1,3s de comemoração + 3,8s de tela de vencedor).
  Ninguém fica esperando os outros.
- **Duração**: Gaiola ~65–80s (referência 78s); Cofre ~58–74s (referência 58s); fases antigas ~60s.
- Categorias opcionais com bandeira/escudo: Seleções x Times (clubes), cada uma com título próprio
  ("QUAL SELEÇÃO VENCE?" / "QUAL TIME VENCE?").
- Áudio todo sintetizado, ~-14 LUFS.

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
- Sem HUD: nada de contagem 3-2-1, popups, faixas, chips, cronômetro, tremida ou flash. Só o
  título discreto em cima (cor da paleta, sem contorno).
- Sem zoom no final (o vídeo da Gaiola não tem). Quando o 1º chega: ~1,3s e tela de vencedor no
  mesmo estilo chapado.

## Como o projeto funciona

- `src/game.js` simulação determinística (mesma seed = mesma corrida); `src/render.js` visual;
  `src/audio.js` sons/música; `src/teams.js` cores/bandeiras/escudos; `src/levels.js` mapas ASCII 36x48.
- `tools/render.mjs` renderiza MP4 quadro a quadro (Playwright + ffmpeg); `tools/novo.mjs` sorteia
  e chama o render; `tools/levelgen.py` gera os mapas (`derby()`, `serpente()`, `arena8()`) cavando retângulos; `gaiola()` e `cofre()` são desenhadas em unidades (texto 16x21, helper `unitmap`).
- Ao mexer em fases/física, rode `npm test` (simula corridas) e mire: 100% com vencedor e vídeo
  médio de ~60s. Use prints (Playwright em `?render=1`) para conferir o visual antes de renderizar.
- `npm start` abre o painel interativo em http://localhost:5173.
