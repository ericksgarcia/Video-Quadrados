# 🟥 Corrida dos Quadrados

Gerador de vídeos verticais (1080x1920) de **corrida de quadrados** para TikTok / Reels / Shorts.
Cada competidor é um **quadrado de cor** (ou, opcionalmente, bandeira/escudo) que começa **preso
atrás de tijolos da sua cor**, quebra a saída e quica por um labirinto em serpentina enquanto a
água avança atrás dele. Visual flat, igual aos vídeos de referência. Quem chegar primeiro na bandeira quadriculada vence.
A onda não elimina: ela arrasta quem ficou para trás (dá para ligar o modo "água elimina").

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

### Jeito mais rápido: um vídeo novo com um comando

```bash
npm run novo -- --handle "@seucanal"
```

Sorteia fase, ordem das cores nas baias e a corrida mais emocionante,
sem repetir o que já está em `historico.json`. Gera `videos/<data>-<fase>.mp4` e uma legenda pronta
em `.txt`. Dá para fixar qualquer coisa: `--level serpente`, `--teams verde,azul,vermelho,amarelo`,
`--category clubes` (bandeiras/escudos), `--theme lava`, `--no-music`.

### 1. Jogar e testar no navegador

```bash
npm start
```

Abra `http://localhost:5173`. No painel lateral você escolhe a fase, os times, o tema da
inundação, os textos e a seed. Aperte **▶ Jogar** (ou Espaço).

- **✨ Achar corrida emocionante**: simula 40 corridas em segundos e escolhe a mais disputada
  (final apertado, viradas na liderança, facada, ~60s).
- **⏺ Gravar vídeo**: grava a tela do jogo com áudio direto do navegador (MP4 no Chrome
  recente, WebM nos outros). Prático, mas pode ter pequenas travadas se o PC for lento.

### 2. Exportar MP4 perfeito (recomendado)

O renderizador gera o vídeo **quadro a quadro** a 60fps, com o áudio sincronizado ao milissegundo,
independente da velocidade do seu computador:

```bash
npm run render -- --level derby --teams vermelho,azul,amarelo,verde --best 40
```

O arquivo sai em `videos/`. O painel do navegador mostra o comando pronto com as suas configurações.

| Opção | O que faz |
|---|---|
| `--level` | `derby`, `serpente`, `arena8` (ou `1`..`3`) |
| `--category` | `cores` (padrão), `selecoes` ou `clubes` (sem `--teams`, usa os padrões da categoria) |
| `--count` | quantos competidores (com `--category`) |
| `--teams` | ids separados por vírgula (ex.: `vermelho,azul,amarelo,verde` ou `fla,cor,pal,sao`) |
| `--preset` | atalho da categoria, ex.: `--category clubes --preset "Grandes do Rio"` |
| `--seed` | número da corrida (mesma seed = mesma corrida, sempre) |
| `--best N` | testa N seeds e renderiza a mais emocionante |
| `--theme` | `roxo`, `agua`, `lava`, `acido` |
| `--title` `--subtitle` `--cta` `--handle` | textos na tela |
| `--no-music` | sem música (para usar um som em alta do TikTok) |
| `--kill` | modo difícil: a água elimina quem encosta |
| `--fps` | `60` (padrão) ou `30` |
| `--batch N` | gera N vídeos diferentes de uma vez |
| `--out` | caminho do arquivo de saída |

Exemplo de lote para a semana inteira:

```bash
npm run render -- --level arena8 --count 8 --best 30 --batch 7
```

## Como funciona

- **Corredores largos em serpentina** (5 blocos = 140px), paredes de 2 blocos, como nas referências.
- **Todo mundo começa preso**: cada quadrado fica numa baia fechada por tijolos altos e só ele
  quebra o tijolo da sua cor. No `derby` é em corrente: a baia de cada um é fechada pelo tijolo da
  sua cor e, quebrando, junta com a vizinha — a última abre a saída.
- **Correnteza**: a água nasce nas raias e **avança pelo caminho dos túneis**, atrás dos bonecos.
  Ela não elimina: arrasta para a frente quem alcança (dá para ligar o modo "água elimina").
- **Chegada**: protegida por tijolos bem duros, então o pelotão alcança o líder no final.
  O vídeo termina assim que o 1º chega.
- **Faca**: só uma por fase, escondida num nicho de entrada estreita. Quem pega elimina o
  primeiro boneco que encostar (a faca é gasta).

Fases: `derby` (largada em corrente + serpentina, igual ao 2º vídeo), `serpente` (baias empilhadas
à esquerda + curvas em U bem altas, igual ao 3º vídeo) e `arena8` (8 cores, sobe pelos lados e
volta pelo meio até duas chegadas). Todas dão vídeos de ~60s.

Elementos extras (portões, bumpers, hélices, portais, raio, caixa surpresa, aceleradores) ainda
existem no motor — a legenda está no topo de `src/levels.js` — mas as fases padrão não usam.

## Personalizar

### Times com imagem própria (escudo oficial, logo etc.)

Coloque o arquivo em `assets/badges/` e registre em `src/teams.js`:

```js
export const CUSTOM_TEAMS = [
  { id: 'meutime', name: 'Meu Time', type: 'image', category: 'clubes', src: 'assets/badges/meutime.png', color: '#e11d48' },
];
```

O campo `category` (`clubes` ou `selecoes`) define em qual lista ele aparece. Depois é só usar
`--teams meutime,fla,...` ou escolher no painel.
As bandeiras e os escudos estilizados (cores + sigla) já vêm prontos — veja `FLAGS` e `CLUBS`
em `src/teams.js` para a lista de ids.

### Times x Seleções

No painel, escolha a **Categoria** (Seleções ou Times): a lista de competidores, os atalhos
e o título padrão ("QUAL SELEÇÃO VENCE?" / "QUAL TIME VENCE?") mudam juntos. Os atalhos de cada
categoria ficam em `PRESETS` no `src/teams.js`.

### Criar fases

As fases ficam em `src/levels.js`, como mapas de texto de 36 colunas x 48 linhas (cada caractere
é um bloco de 28px; a legenda está no topo do arquivo). O jeito mais fácil é usar o
`tools/levelgen.py`: o mapa começa todo como parede e você cava retângulos com `m.carve(...)`
(corredores de 5 blocos, paredes de 2). Rode `python3 tools/levelgen.py` e cole o
mapa gerado no `src/levels.js`. Cada fase também ajusta:

```js
flood: { delay: 3, rate: 1.6, accel: 0.02 }, // quando começa, blocos/s da correnteza, aceleração
finishBrickHp: 10, // batidas para abrir a chegada
endOnWin: true,    // o vídeo acaba quando o 1º chega
floodKills: false, // true = a água elimina
floodPush: 5,      // força do empurrão da onda
racerSpeed: 210,   // velocidade dos quadrados (px/s)
homing: 0.15,      // força do "instinto" (0 = totalmente aleatório)
snap: 0.1,         // chance de, num quique, mirar no caminho certo
brickHp: 4,        // batidas para quebrar um bloco de tijolos
```

Depois de editar, rode `npm test`: ele simula 20 corridas por fase e mostra duração média,
quantos chegam e quantos são eliminados — ótimo para balancear.

## Estrutura

```
index.html          interface (painel + canvas)
src/game.js         simulação determinística (física, elementos, inundação)
src/render.js       todo o visual, estilo flat (arena, tijolos, água, rastros, zoom final, tela de vencedor)
src/audio.js        efeitos sonoros e música procedural (Web Audio)
src/teams.js        cores, bandeiras, escudos e times personalizados
src/levels.js       fases em ASCII
tools/render.mjs    exportação MP4 quadro a quadro (Playwright + ffmpeg)
tools/simtest.mjs   simulação em massa para balancear fases
tools/levelgen.py   gerador dos mapas a partir de retângulos
```

Dicas para o TikTok: corridas de 35–60s performam melhor; use o subtítulo para pedir palpites
nos comentários e poste a mesma fase com seeds diferentes como série ("Dia 1", "Dia 2"...).
