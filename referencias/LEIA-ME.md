# Referências (quadro inicial de cada vídeo)

Um print do **início** de cada vídeo de referência do canal (`square_derby` e similares), para servir de
biblioteca de exemplos quando for **criar uma fase do zero**. Os vídeos originais não ficam no git; o
que importa (mapa, massa, pistões…) está documentado no `CLAUDE.md` e implementado em `src/levels.js`.

| Arquivo | Fase no jogo | Grade | Resumo |
|---|---|---|---|
| `01-tunel-estilo-antigo.png` | (`tunel`, removida) | ~12x12 | Estilo antigo (fundo preto, mapa branco, faca ciano); só serviu de ponto de partida |
| `02-derby-agua.png` | `derby` | 14x18 | Largada em raias na base; barras de cor em corrente; serpentina; água índigo |
| `03-serpente-agua.png` | `serpente` | 14x18 | Baias à esquerda; curvas em U; 2 tijolos escuros; chegada embaixo à direita |
| `04-gaiola.png` | `gaiola` | 16x21 | 4 baias à direita presas em corrente; faca; massa por trilho; 2 pistões verticais |
| `05-cofre.png` | `cofre` | 16x21 | Baias à esquerda; chegada no meio atrás de tijolos escuros; atalho escuro; 3 pistões horizontais |
| `06-ponte.png` | `ponte` | 14x18 | Duas metades simétricas; duplas presas por tijolos que alternam cores; barra em T com 2 pistões |
| `07-escada.png` | `escada` | 32x42 blocos | Baias à esquerda; massa sobe, corre pelo topo e desce escada de tijolos escuros |
| `08-pocos.png` | `pocos` | 14x18 | 4 quadrados juntos; 4 poços fechados por 1 tijolo de cor cada; massa lenta; 1 pistão |

Resolução dos prints: 576x1024 ou 720x1280 (o mapa ocupa ~90% da largura; 1 unidade ≈ 37–46 px).

## Vocabulário para montar uma fase nova

- **Grade**: 14x18 ou 16x21 *unidades* (1 unidade = 2x2 blocos de 28px); corredores de 1 a 4 unidades;
  paredes = cor do fundo (não são desenhadas); tudo no `tools/levelgen.py` (`unitmap`) ou em blocos.
- **Prisão da largada**: *baias empilhadas em corrente* (gaiola/cofre/escada: a barra de saída tem a cor do
  último preso e a que solta o último tem a cor do primeiro), *raias* (derby/serpente), *poços com 1 tijolo
  de cor* (poços), *duplas que alternam cores* (ponte).
- **Tijolos**: de cor (só o dono quebra, 1 batida), escuros (comuns, 1–2 batidas) e o mosaico de cores ao
  redor da chegada. Cada tijolo = 1 unidade (2x2 blocos).
- **Massa de concreto** (`massTrack`): trechos retangulares em sequência (`up/down/left/right`, velocidade
  em blocos/s por trecho, `lanes` para frentes em paralelo). Típico: 0,25–0,75 bloco/s na largada, 2–2,7 nas
  subidas/corridas, ~1 nas escadas. Sempre empurra, frente reta.
- **Pistões** (`pistons`): 1–3, período 8–10s, 2 unidades de altura, nas pontas de pilares/linguetas.
- **Atalho escuro** (barra de tijolos escuros que a massa nunca preenche, `noFlood`) e **faca** (só na gaiola).
- **Chegada**: nicho quadriculado (2x2 unidades), às vezes atrás de 4 tijolos escuros; o vídeo termina
  ~0,5s depois do 1º chegar (sem placar).
- **Escala dos quadrados**: ~0,6–0,7 unidade (`racerSize` 34–44), 3,4–4,8 unidades/s.
