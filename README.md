# 🟥 Corrida dos Quadrados

Gerador de vídeos verticais (1080x1920) de **corrida de quadrados** para TikTok / Reels / Shorts.
Cada competidor é uma **bandeira** ou **escudo de time** que quica pelo labirinto enquanto uma
inundação sobe atrás dele. Quem chegar primeiro na bandeira quadriculada vence; quem encostar
na água é eliminado.

Tudo é desenhado em código (Canvas) e **todo o áudio é sintetizado** (Web Audio): não precisa
de nenhum arquivo de imagem ou som.

## Como usar

Requisitos: [Node.js 18+](https://nodejs.org) e [ffmpeg](https://ffmpeg.org) (para exportar MP4).

```bash
npm install
```

```bash
npx playwright install chromium
```

### 1. Jogar e testar no navegador

```bash
npm start
```

Abra `http://localhost:5173`. No painel lateral você escolhe a fase, os times, o tema da
inundação, os textos e a seed. Aperte **▶ Jogar** (ou Espaço).

- **✨ Achar corrida emocionante**: simula 40 corridas em segundos e escolhe a mais disputada
  (chegada apertada, eliminações, duração ~50s).
- **⏺ Gravar vídeo**: grava a tela do jogo com áudio direto do navegador (MP4 no Chrome
  recente, WebM nos outros). Prático, mas pode ter pequenas travadas se o PC for lento.

### 2. Exportar MP4 perfeito (recomendado)

O renderizador gera o vídeo **quadro a quadro** a 60fps, com o áudio sincronizado ao milissegundo,
independente da velocidade do seu computador:

```bash
npm run render -- --level subida --teams br,ar,fr,pt --best 40 --title "QUAL SELEÇÃO VENCE?"
```

O arquivo sai em `videos/`. O painel do navegador mostra o comando pronto com as suas configurações.

| Opção | O que faz |
|---|---|
| `--level` | `subida`, `pinball`, `serpente`, `arena8` (ou `1`..`4`) |
| `--teams` | ids separados por vírgula (ex.: `fla,cor,pal,sao`) |
| `--preset` | atalho de times, ex.: `--preset "Clássicos BR"` |
| `--seed` | número da corrida (mesma seed = mesma corrida, sempre) |
| `--best N` | testa N seeds e renderiza a mais emocionante |
| `--theme` | `roxo`, `agua`, `lava`, `acido` |
| `--title` `--subtitle` `--cta` `--handle` | textos na tela |
| `--no-music` | sem música (para usar um som em alta do TikTok) |
| `--fps` | `60` (padrão) ou `30` |
| `--batch N` | gera N vídeos diferentes de uma vez |
| `--out` | caminho do arquivo de saída |

Exemplo de lote para a semana inteira:

```bash
npm run render -- --level arena8 --preset "Clubes (8)" --best 30 --batch 7 --theme lava
```

## Elementos do jogo

| Símbolo | Elemento |
|---|---|
| 🟫 Tijolo comum (`B`) | qualquer um quebra; o bloco inteiro explode quando a vida acaba |
| 🟩 Tijolo colorido (`1`-`8`) | só o dono (com o escudo/bandeira desenhado) consegue quebrar |
| 🚧 Portão (`D`) | abre e fecha sozinho |
| ⏫ Acelerador (`^ v < >`) | lança o quadrado na direção da seta |
| 🔴 Bumper (`O`) | rebate com força, estilo pinball |
| ➖ Hélice (`*`) | barra giratória que arremessa quem encosta |
| 🌀 Portais (`P/p`, `Q/q`) | teletransporte entre o par |
| ⚔️ Espada (`!`) | quebra qualquer tijolo em 1 batida e arremessa rivais |
| ⚡ Raio (`z`) | turbo de velocidade |
| ❓ Caixa surpresa (`?`) | espada, raio ou **gelo** (congela todos os rivais) |
| 🌊 Inundação (`~`) | sobe como água de verdade: sempre enche o ponto mais baixo alcançável |

Os quadrados quicam de forma imprevisível, mas têm um leve "instinto" de ir em direção à
chegada — assim a corrida sempre progride e o resultado continua imprevisível.

## Personalizar

### Times com imagem própria (escudo oficial, logo etc.)

Coloque o arquivo em `assets/badges/` e registre em `src/teams.js`:

```js
export const CUSTOM_TEAMS = [
  { id: 'meutime', name: 'Meu Time', type: 'image', src: 'assets/badges/meutime.png', color: '#e11d48' },
];
```

Depois é só usar `--teams meutime,fla,...` ou escolher no painel ("Personalizados").
As bandeiras e os escudos estilizados (cores + sigla) já vêm prontos — veja `FLAGS` e `CLUBS`
em `src/teams.js` para a lista de ids.

### Criar fases

As fases ficam em `src/levels.js`, como mapas de texto de 18 colunas x 24 linhas (a legenda
dos símbolos está no topo do arquivo). Cada fase também ajusta:

```js
flood: { delay: 8, rate: 0.16, accel: 0.007 }, // quando começa, velocidade e aceleração
racerSpeed: 270,   // velocidade dos quadrados (px/s)
homing: 0.5,       // força do "instinto" (0 = totalmente aleatório)
brickHp: 4,        // batidas para quebrar um bloco de tijolos
```

Depois de editar, rode `npm test`: ele simula 20 corridas por fase e mostra duração média,
quantos chegam e quantos são eliminados — ótimo para balancear.

## Estrutura

```
index.html          interface (painel + canvas)
src/game.js         simulação determinística (física, elementos, inundação)
src/render.js       todo o visual (arena, efeitos, partículas, HUD, tela de vencedor)
src/audio.js        efeitos sonoros e música procedural (Web Audio)
src/teams.js        bandeiras, escudos e times personalizados
src/levels.js       fases em ASCII
tools/render.mjs    exportação MP4 quadro a quadro (Playwright + ffmpeg)
tools/simtest.mjs   simulação em massa para balancear fases
```

Dicas para o TikTok: corridas de 35–60s performam melhor; use o subtítulo para pedir palpites
nos comentários e poste a mesma fase com seeds diferentes como série ("Dia 1", "Dia 2"...).
