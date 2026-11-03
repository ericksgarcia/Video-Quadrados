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
   - Fase padrão: **`gaiola`** (cópia do vídeo de referência). Se o usuário pedir algo específico,
     repasse: `--level gaiola|derby|serpente|arena8`,
     `--teams vermelho,azul,amarelo,verde`, `--category clubes|selecoes` (bandeiras/escudos),
     `--theme roxo|agua|lava|acido`, `--no-music`.
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
- **Massa sólida (não é água)**: índigo, firme — ninguém entra nela; a frente **empurra os
  quadrados na hora**. Se prensar alguém contra a parede, ele escorrega no sentido do caminho; sem
  saída nenhuma, é esmagado. Na Gaiola: 1ª etapa nasce no fundo de cada baia e anda 3 unidades;
  2ª etapa sobe do fundo da sala depois que a barra que solta o último abre; depois segue o caminho
  longo (~1,2 unidade/s). A massa **não entra no atalho da faca** (`noFlood`).
- **Pistões**: blocos escuros nas pontas dos pilares que sobem e descem (8s; no pico fecham a curva
  por completo e seguram a massa).
- **Faca permanente** (`knifeKeep`): quem pega elimina **todo mundo** em que encostar. Eliminado
  mostra um X e some.
- Largada imediata (sem 3-2-1). Quique livre, sem "instinto" (homing/steer 0). Quadrados ~275 px/s.
- Fases antigas (derby/serpente/arena8) continuam disponíveis, agora também com massa sólida.
- **Chegada**: na Gaiola é um nicho quadriculado sem tijolos (igual ao vídeo); nas fases antigas,
  tijolos duros (`finishBrickHp`).
- **O vídeo termina assim que o 1º chega** (~1,3s de comemoração + 3,8s de tela de vencedor).
  Ninguém fica esperando os outros.
- **Duração**: Gaiola ~65–80s (o vídeo de referência tem 78s); fases antigas ~60s.
- Categorias opcionais com bandeira/escudo: Seleções x Times (clubes), cada uma com título próprio
  ("QUAL SELEÇÃO VENCE?" / "QUAL TIME VENCE?").
- Áudio todo sintetizado, ~-14 LUFS.

## Visual (estilo flat, copiado dos 3 vídeos de referência que o usuário mandou)

- Fundo cinza chapado `#adadad`; paredes têm a mesma cor do fundo (não são desenhadas).
- Corredores `#e0e0d9` com contorno preto fino (~3,5px). Mapa centralizado na tela.
- Tijolos: cor sólida + desenho de "tijolinho" em linhas escuras, contorno preto. Tijolo comum/da
  chegada é cinza-escuro `#2e2e2e`. Chegada quadriculada preto/branco.
- Massa chapada índigo `#3d328c` (sem gradiente), frente reta de parede a parede. Pistões `#2b2e3f`.
- Quadrados: cor chapada com contorno preto, sem sombra/brilho; rastro em cunha semitransparente
  da mesma cor. Paleta: vermelho `#d50000`, azul `#265ef3`, amarelo `#ffd839`, verde `#007d53`,
  ciano, laranja, roxo, rosa.
- Eliminado fica parado com um X. Faca: lâmina ciano + cabo roxo.
- Sem HUD: nada de contagem 3-2-1, popups, faixas, chips, cronômetro, tremida ou flash. Só o
  título discreto em cima (texto escuro, sem contorno).
- Sem zoom no final (o vídeo da Gaiola não tem). Quando o 1º chega: ~1,3s e tela de vencedor no
  mesmo estilo chapado.

## Como o projeto funciona

- `src/game.js` simulação determinística (mesma seed = mesma corrida); `src/render.js` visual;
  `src/audio.js` sons/música; `src/teams.js` cores/bandeiras/escudos; `src/levels.js` mapas ASCII 36x48.
- `tools/render.mjs` renderiza MP4 quadro a quadro (Playwright + ffmpeg); `tools/novo.mjs` sorteia
  e chama o render; `tools/levelgen.py` gera os mapas (`derby()`, `serpente()`, `arena8()`) cavando retângulos; `gaiola()` é desenhada em unidades (texto 16x21).
- Ao mexer em fases/física, rode `npm test` (simula corridas) e mire: 100% com vencedor e vídeo
  médio de ~60s. Use prints (Playwright em `?render=1`) para conferir o visual antes de renderizar.
- `npm start` abre o painel interativo em http://localhost:5173.
