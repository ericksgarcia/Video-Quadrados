# Corrida dos Quadrados — instruções para o Claude

Projeto do canal de TikTok do usuário: vídeos verticais (1080x1920, 60fps, ~60s) de corrida de
quadrados com bandeiras de seleções ou escudos de clubes. Fale sempre em **português do Brasil**.

## Quando o usuário pedir "um vídeo novo" (ou "faz outro vídeo", "gera mais um"...)

1. Confirme as ferramentas (já vêm no ambiente de nuvem): `ffmpeg -version` e
   `node -e "require('playwright')"`. Se o Playwright faltar: `npm install` e
   `npx playwright install chromium`.
2. Rode **`npm run novo -- --handle "@seucanal"`** (rode em segundo plano; leva ~6 min). Ele sorteia
   fase, categoria (alterna seleções/clubes em relação ao último vídeo), times, cor da água e a
   corrida mais emocionante entre 30 — **sem repetir** combinações já registradas em
   `historico.json`.
   - Se o usuário pedir algo específico, repasse: `--category clubes|selecoes`,
     `--level tunel|caracol|arena8`, `--teams fla,cor,pal,sao`, `--theme roxo|agua|lava|acido`,
     `--no-music`.
3. Envie o `.mp4` gerado em `videos/` ao usuário (SendUserFile) e mostre a legenda do `.txt` ao lado
   (sem revelar o vencedor). Ofereça 2–3 variações de legenda se ele pedir.
4. Faça commit **só do `historico.json`** (os vídeos ficam fora do git) e dê push na branch da sessão.

Não mude as regras do jogo abaixo sem o usuário pedir — elas foram definidas com ele, iteração por
iteração. Se ele pedir mudança, atualize esta lista.

## Regras do jogo (decididas com o usuário)

- **Paredes gigantes com túneis**: cada fase é um bloco maciço de parede com túneis estreitos
  (4 blocos = 112px) cavados dentro, com estreitamentos de 2–3 blocos. Nada de áreas abertas.
- **Raias de largada** no fundo; cada boneco só quebra o tijolo da sua cor.
- **Água (correnteza)**: nasce nas raias e **avança pelo caminho dos túneis** atrás dos bonecos
  (`flood.mode: 'path'`). **Não elimina** — só empurra/arrasta quem alcança.
- **Sem elementos extras** nas fases (sem bumpers, hélices, portais, raio, caixa, portões,
  aceleradores/linhas que empurram). Só tijolos + **uma faca**.
- **Faca**: uma por fase, num nicho de entrada estreita no meio do caminho (difícil de pegar).
  Quem pega **elimina o primeiro boneco que encostar**; a faca é gasta.
- **Chegada difícil**: tijolos da chegada bem duros (`finishBrickHp`), para o pelotão alcançar o
  líder e o final ficar apertado.
- **O vídeo termina assim que o 1º chega** (~1,3s de comemoração + 3,8s de tela de vencedor).
  Ninguém fica esperando os outros.
- **Duração alvo ~60s**. Quadrados lentos (~210 px/s; 170 na Arena 8).
- **Categorias separadas**: Seleções x Times (clubes), cada uma com título próprio
  ("QUAL SELEÇÃO VENCE?" / "QUAL TIME VENCE?").
- Áudio todo sintetizado, ~-14 LUFS.

## Como o projeto funciona

- `src/game.js` simulação determinística (mesma seed = mesma corrida); `src/render.js` visual;
  `src/audio.js` sons/música; `src/teams.js` bandeiras/escudos; `src/levels.js` mapas ASCII 36x48.
- `tools/render.mjs` renderiza MP4 quadro a quadro (Playwright + ffmpeg); `tools/novo.mjs` sorteia
  e chama o render; `tools/levelgen.py` gera mapas cavando túneis (`tunnel()`).
- Ao mexer em fases/física, rode `npm test` (simula corridas) e mire: 100% com vencedor e vídeo
  médio de ~60s. Use prints (Playwright em `?render=1`) para conferir o visual antes de renderizar.
- `npm start` abre o painel interativo em http://localhost:5173.
