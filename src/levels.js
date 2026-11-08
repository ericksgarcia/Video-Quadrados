// Fases em ASCII — 36 colunas x 48 linhas (cada caractere = 28px). Fácil de criar/editar.
// Dica: tools/levelgen.py monta os mapas (corredores largos em serpentina, baias presas por tijolos da cor).
// Elementos extras (portões, bumpers, hélices, portais, raio, caixa) continuam disponíveis, mas
// as fases padrão usam só tijolos + uma faca.
//
//  #  parede              .  chão                 F  chegada (xadrez)
//  S  ponto de largada    ~  fonte da inundação   B  tijolo comum (2 batidas, qualquer um quebra)
//  1-8 tijolo colorido: só o competidor nº N quebra (os outros quicam)
//  D  portão/pistão que abre e fecha
//  ^ v < >  acelerador (empurra na direção da seta) — use com moderação
//  O  bumper (rebate com força, estilo pinball)
//  *  hélice giratória (centro)
//  P/p  Q/q  portais de mão única (entra no maiúsculo, sai no minúsculo: P -> p, Q -> q)
//  !  FACA (uma só, num nicho difícil): quem pega elimina o primeiro boneco que encostar
//  z  raio (velocidade extra)
//  ?  caixa surpresa (espada, raio ou gelo — congela os rivais)
//
// Cada fase pode ajustar a água:
//   flood: { delay (s até começar), rate (blocos/s que a correnteza avança), accel (aceleração/s), mode }
//   mode 'path' (padrão) = a água segue os túneis atrás dos bonecos; 'gravity' = enche de baixo pra cima.
// A água NÃO elimina: ela arrasta quem alcança. Use floodKills: true para eliminar.
// O vídeo termina quando o 1º chega (endOnWin: false para esperar os outros).

export const LEVELS = [
  {
    // cópia do vídeo 20 (2ac9f100): 4 baias embaixo com tijolos de cor (saída amarela à direita), corredor da direita com bolsão
    // sem saída, U com 2 pistões horizontais, sala da faca e chegada no canto esquerdo atrás de tijolos escuros
    id: 'bolsao',
    name: 'Bolsão',
    maxRacers: 4,
    racers: 4,
    ownerPerm: [1, 0, 2, 3], // REGRA DE JUSTIÇA: a saída (col 11) passa ao quadrado da baia 1 (mais longe); o tijolo 1-2 passa ao da baia 2
    racerSize: 44,      // ~0,8 unidade
    racerSpeed: 235, homing: 0, steer: 0, snap: 0,
    brickBlock: 2,
    colorBrickHp: 1,
    brickHp: 1,
    knifeKeep: true,
    flood: { delay: 0.5, zoneRate: 1.0, delay2: 10, stage2After: 1, stage2Gap: 1, rate: 2.0, accel: 0 }, // a varredura só começa 1s depois que a SAÍDA abre
    massTrack: {
      unit: 2, origin: [6, 4], // unidades (mapa 14x18); velocidades em blocos/s (medidas no vídeo)
      stage1: [ // sobe pelo fundo das 4 baias (~0,5 unid/s)
        [14, 0, 17, 1, 'up'], [14, 3, 17, 4, 'up'], [14, 6, 17, 7, 'up'], [14, 9, 17, 10, 'up'],
      ],
      stage2: [
        [10, 0, 13, 11, 'right', 2.0],  // varre a sala das baias para a direita
        [0, 12, 13, 13, 'up', 1.8],     // sobe o corredor da direita (o bolsão de baixo fica livre)
        [0, 8, 1, 11, 'left', 2.5],     // topo, para a esquerda
        [2, 8, 8, 10, 'down', 2.4],     // desce a sala da direita (o pistão B segura)
        [6, 4, 8, 7, 'left', 3.0],      // travessa do U
        [2, 4, 5, 6, 'up', 1.8],        // sobe a sala do meio (o pistão A segura)
        [0, 3, 1, 6, 'left', 2.0],      // topo
        [0, 0, 5, 2, 'down', 2.0],      // sala da faca (extrapolado: o vídeo acaba)
      ],
    },
    pistons: [
      { c: 12, r: 12, w: 2, max: 6, period: 6, phase: 0, dir: 'right' }, // A: linha 3, nasce na parede da col 3
      { c: 26, r: 12, w: 2, max: 6, period: 6, phase: 0, dir: 'left' },  // B: linha 3, nasce na parede da col 11
    ],
    map: [
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####......BB......##......BB....####',
      '####......BB......##......BB....####',
      '####......BB......##......BB....####',
      '####......BB......##......BB....####',
      '####......##......##......##....####',
      '####......##......##......##....####',
      '####......##......##......##....####',
      '####...!..##......##......##....####',
      '####......##......##......##....####',
      '####......##......##......##....####',
      '####......##......##......##....####',
      '####......##......##......##....####',
      '####BBBBBB##..............##....####',
      '####BBBBBB##..............##....####',
      '####FFFFFF##..............##....####',
      '####FFFFFF##..............##....####',
      '####FFFFFF##..............##....####',
      '####FFFFFF##..............##....####',
      '############################....####',
      '############################....####',
      '####....11....33....44....22....####',
      '####....11....33....44....22....####',
      '####....11....33....44....22....####',
      '####....11....33....44....22....####',
      '####....11....33....44....22....####',
      '####....11....33....44....22....####',
      '####....11....33....44....22....####',
      '####....11....33....44....22....####',
      '####....##....##....##....##..######',
      '####....##....##....##....##..######',
      '####....##....##....##....##....####',
      '####....##....##....##....##....####',
      '####..S.##..S.##..S.##..S.##....####',
      '####....##....##....##....##....####',
      '####....##....##....##....####..####',
      '####....##....##....##....####..####',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
    ],
  },
  {
    // cópia do vídeo 19 (263d8cf4): 4 baias embaixo com tijolos de cor (saída vermelha à direita, já do mais longe), corredores
    // de 3 unidades com tijolos de cor SOLTOS (só o dono quebra), chegada num corredor interno atrás de 2 tijolos escuros
    id: 'portoes',
    name: 'Portões',
    maxRacers: 4,
    racers: 4,
    racerSize: 42,      // ~0,78 unidade
    racerSpeed: 235, homing: 0, steer: 0, snap: 0,
    brickBlock: 2,
    colorBrickHp: 1,
    brickHp: 1,
    flood: { delay: 0.5, zoneRate: 1.3, delay2: 10, stage2After: 0, stage2Gap: 1, rate: 2.0, accel: 0 }, // a varredura só começa 1s depois que a SAÍDA abre
    massTrack: {
      unit: 2, origin: [6, 4], // unidades (mapa 14x18); velocidades em blocos/s (medidas no vídeo)
      stage1: [ // sobe pelo fundo das 4 baias (~0,65 unid/s)
        [14, 0, 17, 1, 'up'], [14, 3, 17, 4, 'up'], [14, 6, 17, 7, 'up'], [14, 9, 17, 10, 'up'],
      ],
      stage2: [
        [10, 0, 13, 11, 'right', 2.0],  // varre a sala das baias para a direita
        [6, 12, 13, 13, 'up', 2.0],     // sobe o corredor da direita
        [6, 0, 8, 11, 'left', 2.2],     // corredor do meio, para a esquerda
        [0, 0, 5, 1, 'up', 3.0],        // sobe a esquerda
        [0, 2, 2, 12, 'right', 2.6],    // corredor de cima, para a direita (para uma coluna antes: a col 13 é a saída de quem foge)
        [0, 13, 4, 13, 'down', 2.0],    // desce pela passagem ao lado do bloco lilás
        [4, 7, 4, 12, 'left', 2.0],     // corredor da chegada
      ],
    },
    map: [
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####..........11..........44....####',
      '####..........11..........44....####',
      '####............................####',
      '####............................####',
      '####....33..........22..........####',
      '####....33..........22..........####',
      '####....######################..####',
      '####....######################..####',
      '####....##FFFFBBBB..............####',
      '####....##FFFFBBBB..............####',
      '####....############################',
      '####....############################',
      '####....11..........33..........####',
      '####....11..........33..........####',
      '####............................####',
      '####............................####',
      '####..........44..........22....####',
      '####..........44..........22....####',
      '############################....####',
      '############################....####',
      '####....22....33....44....11....####',
      '####....22....33....44....11....####',
      '####....22....33....44....11....####',
      '####....22....33....44....11....####',
      '####....22....33....44....11....####',
      '####....22....33....44....11....####',
      '####....22....33....44....11....####',
      '####....22....33....44....11....####',
      '####....##....##....##....##########',
      '####....##....##....##....##########',
      '####....##....##....##....##########',
      '####....##....##....##....##########',
      '####..S.##..S.##..S.##..S.##########',
      '####....##....##....##....##########',
      '####....##....##....##....##########',
      '####....##....##....##....##########',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
    ],
  },
  {
    // cópia do vídeo 18 (243a6531): mapa em BLOCOS; 4 baias no topo com tijolos de cor (saída vermelha à direita), corredor com
    // tijolos escuros em xadrez, corredores fechados por colunas de tijolos escuros, faca, chegada embaixo à direita
    id: 'xadrez',
    name: 'Xadrez',
    maxRacers: 4,
    racers: 4,
    ownerPerm: [2, 1, 0, 3], // REGRA DE JUSTIÇA: a saída (col 15) passa ao quadrado da baia 1 (mais longe); o tijolo 2-3 passa ao da baia 3
    racerSize: 26,      // no vídeo ~0,7 bloco; um pouco maior para o escudo (como a Pente)
    racerSpeed: 170, homing: 0, steer: 0, snap: 0,
    brickBlock: 1,      // tijolos de 1 bloco, cada um quebra sozinho
    colorBrickHp: 1,
    brickHp: 1,
    knifeKeep: true,
    flood: { delay: 0.5, zoneRate: 0.5, delay2: 9, stage2After: 2, stage2Gap: 1, rate: 1.5, accel: 0 }, // a varredura só começa 1s depois que a SAÍDA abre
    massTrack: {
      unit: 1, origin: [13, 8], // blocos (mapa 19x22); velocidades em blocos/s (medidas no vídeo até o fim)
      stage1: [ // desce do topo das 4 baias
        [0, 4, 2, 5, 'down'], [0, 7, 2, 8, 'down'], [0, 10, 2, 11, 'down'], [0, 13, 2, 14, 'down'],
      ],
      stage2: [
        [3, 4, 6, 15, 'right', 1.3],    // varre a sala dos tijolos para a direita
        [3, 16, 9, 18, 'down', 3.0],    // desce a direita
        [8, 0, 9, 15, 'left', 2.3],     // corredor em xadrez, para a esquerda
        [10, 0, 13, 2, 'down', 1.0],    // desce a esquerda
        [11, 3, 13, 15, 'right', 1.6],  // corredor do meio
        [11, 16, 17, 18, 'down', 1.2],  // desce a direita
        [15, 3, 17, 15, 'left', 1.9],   // corredor de baixo
        [15, 0, 21, 2, 'down', 3.0],    // desce a esquerda
        [19, 3, 21, 14, 'right', 1.9],  // corredor final
      ],
    },
    map: [
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '############..#..#..#..#############',
      '############.S#.S#.S#.S#############',
      '############..#..#..#..#############',
      '############..2..1..4..3...#########',
      '############..2..1..4..3...#########',
      '############..2..1..4..3...#########',
      '############..2..1..4..3...#########',
      '########################...#########',
      '########....B...B...B......#########',
      '########......B...B...B....#########',
      '########...#########################',
      '########...B...........B...#########',
      '########...B...........B...#########',
      '########...B...........B...#########',
      '########################...#########',
      '########...B...........B...#########',
      '########...B....!......B...#########',
      '########...B...........B...#########',
      '########...#########################',
      '########...............BBF##########',
      '########...............BBF##########',
      '########...............BBF##########',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
    ],
  },
  {
    // cópia do vídeo 17 (21fe3eb7): baias penduradas no topo com tijolos de cor (saída verde à direita), corredor largo,
    // chegada no meio atrás de 1 tijolo escuro, sala em U sem saída, faca no canto de baixo
    id: 'teto',
    name: 'Teto',
    maxRacers: 4,
    racers: 4,
    ownerPerm: [1, 2, 3, 0], // REGRA DE JUSTIÇA: a saída (col 12) passa ao quadrado da baia 1 (mais longe); cada tijolo entre baias passa ao vizinho da direita
    racerSize: 38,      // ~0,6 unidade no vídeo (um pouco maior para o escudo)
    racerSpeed: 235, homing: 0, steer: 0, snap: 0,
    brickBlock: 2,
    colorBrickHp: 1,
    brickHp: 1,
    knifeKeep: true,
    flood: { delay: 0.5, zoneRate: 0.8, delay2: 8, stage2After: 3, stage2Gap: 1, rate: 2.0, accel: 0 }, // a varredura só começa 1s depois que a SAÍDA abre
    massTrack: {
      unit: 2, origin: [6, 3], // unidades (mapa 15x18); velocidades em blocos/s (medidas no vídeo)
      stage1: [ // desce do topo das 4 baias (~0,4 unid/s)
        [0, 1, 2, 2, 'down'], [0, 4, 2, 5, 'down'], [0, 7, 2, 8, 'down'], [0, 10, 2, 11, 'down'],
      ],
      stage2: [
        [3, 1, 5, 12, 'right', 3.2],   // varre a sala dos tijolos da esquerda para a direita
        [3, 13, 10, 14, 'down', 2.8],  // desce o corredor da direita
        [7, 0, 10, 12, 'left', 4.0],   // corredor largo, rápido, para a esquerda
        [11, 0, 17, 2, 'down', 3.0],   // desce a esquerda
        [15, 3, 17, 14, 'right', 4.0], // corredor de baixo
        [12, 12, 14, 14, 'up', 2.0],   // (extrapolado: o vídeo acaba antes)
      ],
    },
    map: [
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '#####....##....##....##....#########',
      '#####....##....##....##....#########',
      '#####..S.##..S.##..S.##..S.#########',
      '#####....##....##....##....#########',
      '#####....##....##....##....#########',
      '#####....##....##....##....#########',
      '#####....11....22....33....44....###',
      '#####....11....22....33....44....###',
      '#####....11....22....33....44....###',
      '#####....11....22....33....44....###',
      '#####....11....22....33....44....###',
      '#####....11....22....33....44....###',
      '#############################....###',
      '#############################....###',
      '###..............................###',
      '###..............................###',
      '###..............................###',
      '###..............................###',
      '###..............................###',
      '###..............................###',
      '###..............................###',
      '###..............................###',
      '###......###########################',
      '###......###########################',
      '###......##..........##FFBB......###',
      '###......##..........##FFBB......###',
      '###......##..........##FFBB......###',
      '###......##..........##FFBB......###',
      '###......##..######..########....###',
      '###......##..######..########....###',
      '###..............................###',
      '###..............................###',
      '###..............................###',
      '###...!..........................###',
      '###..............................###',
      '###..............................###',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
    ],
  },
  {
    // cópia do vídeo 16 (21ea1037): 4 baias embaixo com tijolos de cor (saída ciano à direita), salão com faca, corredor com
    // pistão que sobe, chegada no canto de cima à esquerda atrás de 6 tijolos escuros
    id: 'salao',
    name: 'Salão',
    maxRacers: 4,
    racers: 4,
    ownerPerm: [2, 1, 0, 3], // REGRA DE JUSTIÇA: a saída (col 11) passa ao quadrado da baia 1 (mais longe); o tijolo 2-3 passa ao da baia 3
    racerSize: 40,      // ~0,73 unidade
    racerSpeed: 235, homing: 0, steer: 0, snap: 0,
    brickBlock: 2,
    colorBrickHp: 1,
    brickHp: 1,
    knifeKeep: true,
    flood: { delay: 0.8, zoneRate: 0.67, delay2: 10, stage2After: 2, stage2Gap: 1, rate: 2.0, accel: 0 }, // a varredura só começa 1s depois que a SAÍDA abre
    massTrack: {
      unit: 2, origin: [6, 4], // unidades (mapa 14x18); velocidades em blocos/s (medidas no vídeo)
      stage1: [ // sobe pelo fundo das 4 baias (~0,33 unid/s)
        [15, 0, 17, 1, 'up'], [15, 3, 17, 4, 'up'], [15, 6, 17, 7, 'up'], [15, 9, 17, 10, 'up'],
      ],
      stage2: [
        [12, 0, 14, 11, 'right', 2.0],  // varre a sala das baias da esquerda para a direita
        [8, 12, 14, 13, 'up', 2.0],     // sobe o corredor da direita
        [8, 0, 10, 11, 'left', 2.6],    // salão, para a esquerda
        [4, 0, 7, 3, 'up', 2.0],        // sobe pela esquerda
        [4, 4, 6, 13, 'right', 2.0],    // corredor das linhas 4-6 (o pistão segura)
        [0, 10, 3, 13, 'up', 2.0],      // (extrapolado daqui em diante: o vídeo acaba antes)
        [0, 4, 2, 9, 'left', 2.0],
      ],
    },
    pistons: [
      { c: 12, r: 20, w: 2, max: 6, period: 6, phase: 0, dir: 'up' },   // col 4: sobe da parede da linha 7 até 3 unidades
    ],
    map: [
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####FFFFBBBB....................####',
      '####FFFFBBBB....................####',
      '####FFFFBBBB....................####',
      '####FFFFBBBB....................####',
      '####FFFFBBBB....................####',
      '####FFFFBBBB....................####',
      '########################........####',
      '########################........####',
      '####............................####',
      '####............................####',
      '####............................####',
      '####............................####',
      '####............................####',
      '####............................####',
      '####........########################',
      '####........########################',
      '####............................####',
      '####............................####',
      '####............................####',
      '####.............!..............####',
      '####............................####',
      '####............................####',
      '############################....####',
      '############################....####',
      '####....22....11....44....33....####',
      '####....22....11....44....33....####',
      '####....22....11....44....33....####',
      '####....22....11....44....33....####',
      '####....22....11....44....33....####',
      '####....22....11....44....33....####',
      '####....##....##....##....##########',
      '####....##....##....##....##########',
      '####..S.##..S.##..S.##..S.##########',
      '####....##....##....##....##########',
      '####....##....##....##....##########',
      '####....##....##....##....##########',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
    ],
  },
  {
    // cópia do vídeo 15 (1528db85): parente da Trilha — 4 baias embaixo com tijolos de cor (saída vermelha à direita),
    // corredor do meio de 2 unidades, 2 pistões horizontais na linha 5, chegada no canto de cima à direita
    id: 'corredor',
    name: 'Corredor',
    maxRacers: 4,
    racers: 4,
    ownerPerm: [1, 2, 3, 0], // REGRA DE JUSTIÇA: a saída (col 11) passa ao quadrado da baia 1 (mais longe); cada tijolo entre baias passa ao vizinho da direita (corrente: 4 abre 3-4, 3 abre 2-3, 2 abre 1-2)
    racerSize: 42,      // ~0,78 unidade
    racerSpeed: 235, homing: 0, steer: 0, snap: 0,
    brickBlock: 2,
    colorBrickHp: 1,
    brickHp: 1,
    flood: { delay: 1.5, zoneRate: 0.5, delay2: 10, stage2After: 3, stage2Gap: 1, rate: 2.0, accel: 0 }, // a varredura só começa 1s depois que a SAÍDA abre
    massTrack: {
      unit: 2, origin: [6, 4], // unidades (mapa 14x18); velocidades em blocos/s (medidas no vídeo)
      stage1: [ // sobe devagar pelo fundo das 4 baias
        [16, 0, 17, 1, 'up'], [16, 3, 17, 4, 'up'], [16, 6, 17, 7, 'up'], [16, 9, 17, 10, 'up'],
      ],
      stage2: [
        [13, 0, 15, 11, 'right', 2.4],  // varre a sala das baias da esquerda para a direita
        [10, 12, 15, 13, 'up', 2.6],    // sobe o corredor da direita
        [10, 0, 11, 11, 'left', 4.0],   // corredor de 2 unidades, para a esquerda
        [2, 0, 9, 2, 'up', 2.0],        // sobe a sala da esquerda
        [0, 0, 1, 5, 'right', 2.0],     // faixa de cima
        [2, 4, 8, 5, 'down', 2.0],      // desce cols 4-5 (o pistão A segura)
        [7, 4, 8, 7, 'right', 2.0],     // (extrapolado daqui em diante: o vídeo acaba antes)
        [0, 7, 6, 7, 'up', 2.0],
        [0, 8, 0, 10, 'right', 2.0],
        [1, 9, 8, 10, 'down', 2.0],     // o pistão B segura
        [6, 11, 8, 13, 'right', 2.0],
        [4, 12, 5, 13, 'up', 2.0],
      ],
    },
    pistons: [
      { c: 12, r: 16, w: 2, max: 4, period: 6, phase: 0, dir: 'right' },  // A: linha 5, nasce no pilar da col 3, fecha cols 4-5
      { c: 22, r: 16, w: 2, max: 4, period: 10, phase: 7, dir: 'right' }, // B: linha 5, nasce no pilar da col 8, fecha cols 9-10
    ],
    map: [
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####............##........##FFFF####',
      '####............##........##FFFF####',
      '####............##..##....##FFFF####',
      '####............##..##....##FFFF####',
      '####......##....##..##....##BBBB####',
      '####......##....##..##....##BBBB####',
      '####......##....##..##....##BBBB####',
      '####......##....##..##....##BBBB####',
      '####......##....##..##....##....####',
      '####......##....##..##....##....####',
      '####......##....##..##....##....####',
      '####......##....##..##....##....####',
      '####......##....##..##..........####',
      '####......##....##..##..........####',
      '####......##........##..........####',
      '####......##........##..........####',
      '####......##........##..........####',
      '####......##........##..........####',
      '####......##########################',
      '####......##########################',
      '####............................####',
      '####............................####',
      '####............................####',
      '####............................####',
      '############################....####',
      '############################....####',
      '####....11....22....33....44....####',
      '####....11....22....33....44....####',
      '####....11....22....33....44....####',
      '####....11....22....33....44....####',
      '####....11....22....33....44....####',
      '####....11....22....33....44....####',
      '####..S.##..S.##..S.##..S.##########',
      '####....##....##....##....##########',
      '####....##....##....##....##########',
      '####....##....##....##....##########',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
    ],
  },
  {
    // cópia do vídeo 14 (0e02eeee): 4 baias embaixo presas por tijolos de cor (saída amarela à direita), serpentina com
    // corredores de 1 unidade, 2 pistões (um sobe, um desce) e chegada no canto de cima à direita atrás de tijolos escuros
    id: 'trilha',
    name: 'Trilha',
    maxRacers: 4,
    racers: 4,
    ownerPerm: [2, 1, 0, 3], // REGRA DE JUSTIÇA: a saída (col 11) passa ao quadrado da baia 1 (mais longe); o tijolo 2-3 passa ao da baia 3
    racerSize: 38,      // ~0,7 unidade
    racerSpeed: 235, homing: 0, steer: 0, snap: 0,
    brickBlock: 2,
    colorBrickHp: 1,
    brickHp: 1,
    flood: { delay: 1.0, zoneRate: 0.67, delay2: 10, stage2After: 2, stage2Gap: 1, rate: 2.0, accel: 0 }, // a varredura só começa 1s depois que a SAÍDA (dígito 3 -> ownerPerm) abre
    massTrack: {
      unit: 2, origin: [6, 4], // unidades (mapa 14x18); velocidades em blocos/s (medidas no vídeo)
      stage1: [ // sobe pelo fundo das 4 baias (~0,33 unid/s)
        [15, 0, 17, 1, 'up'], [15, 3, 17, 4, 'up'], [15, 6, 17, 7, 'up'], [15, 9, 17, 10, 'up'],
      ],
      stage2: [
        [12, 0, 14, 11, 'right', 2.4],  // varre a sala das baias da esquerda para a direita
        [10, 12, 14, 13, 'up', 2.6],    // sobe o corredor da direita
        [10, 0, 10, 11, 'left', 5.0],   // corredor de 1 unidade, rápido, para a esquerda
        [2, 0, 9, 2, 'up', 2.0],        // sobe a sala da esquerda
        [0, 0, 1, 5, 'right', 2.0],     // faixa de cima
        [2, 4, 8, 5, 'down', 2.4],      // desce cols 4-5
        [7, 4, 8, 7, 'right', 2.0],
        [0, 7, 6, 7, 'up', 2.0],        // sobe a coluna 7
        [0, 8, 0, 10, 'right', 2.0],    // (extrapolado daqui em diante: o vídeo acaba antes)
        [1, 9, 8, 10, 'down', 2.0],
        [6, 11, 8, 13, 'right', 2.0],   // o pistão P2 segura
        [5, 12, 5, 13, 'up', 2.0],
      ],
    },
    pistons: [
      { c: 10, r: 10, w: 2, max: 4, period: 8, phase: 0, dir: 'up' },    // P1: topo do pilar da col 3, sobe 2 unidades
      { c: 26, r: 18, w: 2, max: 6, period: 8, phase: 0, dir: 'down' },  // P2: pé da parede da col 11, desce 3 unidades
    ],
    map: [
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####............##........##FFFF####',
      '####............##........##FFFF####',
      '####............##..##....##FFFF####',
      '####............##..##....##FFFF####',
      '####......##....##..##....##BBBB####',
      '####......##....##..##....##BBBB####',
      '####......##....##..##....##BBBB####',
      '####......##....##..##....##BBBB####',
      '####......##....##..##....##BBBB####',
      '####......##....##..##....##BBBB####',
      '####......##....##..##....##....####',
      '####......##....##..##....##....####',
      '####......##....##..##..........####',
      '####......##....##..##..........####',
      '####......##........##..........####',
      '####......##........##..........####',
      '####......##........##..........####',
      '####......##........##..........####',
      '####......##########################',
      '####......##########################',
      '####............................####',
      '####............................####',
      '############################....####',
      '############################....####',
      '####....22....11....44....33....####',
      '####....22....11....44....33....####',
      '####....22....11....44....33....####',
      '####....22....11....44....33....####',
      '####....22....11....44....33....####',
      '####....22....11....44....33....####',
      '####....##....##....##....##########',
      '####....##....##....##....##########',
      '####..S.##..S.##..S.##..S.##########',
      '####....##....##....##....##########',
      '####....##....##....##....##########',
      '####....##....##....##....##########',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
    ],
  },
  {
    // cópia do vídeo 13 (0c2d8f83): variação da Gaiola — baias à direita com barras em corrente (a saída é do último),
    // "H" com ilha no topo, 1 pistão horizontal, chegada atrás de 1 tijolo escuro
    id: 'grade',
    name: 'Grade',
    maxRacers: 4,
    racers: 4,
    racerSize: 38,      // ~0,7 unidade
    racerSpeed: 235, homing: 0, steer: 0, snap: 0, // ~4,2 unidades/s, quique livre
    brickBlock: 2,
    colorBrickHp: 1,
    brickHp: 1,
    flood: { delay: 0.5, zoneRate: 0.8, delay2: 10, stage2After: 3, stage2Gap: 1, rate: 2.0, accel: 0 }, // sobe pelas baias só depois que a SAÍDA abre
    massTrack: {
      unit: 2, origin: [3, 2], // unidades (mapa 16x21); velocidades em blocos/s (medidas no vídeo)
      stage1: [ // entra pela borda direita de cada baia e anda 3 unidades (~0,4 unid/s)
        [5, 13, 6, 15, 'left'], [8, 13, 9, 15, 'left'], [11, 13, 12, 15, 'left'], [14, 13, 15, 15, 'left'],
      ],
      stage2: [
        [0, 9, 15, 12, 'up', 2.0],      // sobe pelo eixo das baias até o topo (~1 unid/s)
        [0, 0, 1, 12, 'left', 4.0],     // faixa de cima, rápido, para a esquerda
        [2, 0, 16, 1, 'down', 2.2],     // desce a coluna da esquerda
        [17, 0, 20, 2, 'right', 1.0],   // canto de baixo à esquerda
        [7, 3, 20, 4, 'up', 2.4],       // sobe as colunas 3-4 (o pistão segura)
        [7, 3, 8, 7, 'right', 2.0],     // atravessa por cima do pilar do meio
        [9, 6, 19, 7, 'down', 2.8],     // desce as colunas 6-7
        [20, 6, 20, 15, 'right', 2.0],  // corredor de baixo (extrapolado: o vídeo acaba antes)
        [17, 12, 19, 15, 'up', 2.0],
      ],
    },
    pistons: [
      { c: 8, r: 35, w: 2, max: 4, period: 8, phase: 0, dir: 'right' }, // linha 16, nasce na lateral do pilar (col 2), fecha as cols 3-4
    ],
    map: [
      '####################################',
      '####################################',
      '####################################',
      '##..........................########',
      '##..........................########',
      '##..........................########',
      '##..........................########',
      '##....##..######..##........########',
      '##....##..######..##........########',
      '##....##..........##........########',
      '##....##..........##........########',
      '##....##..........##44444444########',
      '##....##..........##44444444########',
      '##....##..........##..............##',
      '##....##..........##..........S...##',
      '##....##############..............##',
      '##....##############..............##',
      '##....##..........##11111111########',
      '##....##..........##11111111########',
      '##....##..........##..............##',
      '##....##..........##..........S...##',
      '##....##....##....##..............##',
      '##....##....##....##..............##',
      '##....##....##....##22222222########',
      '##....##....##....##22222222########',
      '##....##....##....##..............##',
      '##....##....##....##..........S...##',
      '##....##....##....##..............##',
      '##....##....##....##..............##',
      '##....##....##....##33333333########',
      '##....##....##....##33333333########',
      '##....##....##....##..............##',
      '##....##....##....##..........S...##',
      '##....##....##....##..............##',
      '##....##....##....##..............##',
      '##....##....##....##################',
      '##....##....##....##################',
      '##..........##....##FFFFBB........##',
      '##..........##....##FFFFBB........##',
      '##..........##....##FFFFBB........##',
      '##..........##....##FFFFBB........##',
      '##..........##....##########......##',
      '##..........##....##########......##',
      '##..........##....................##',
      '##..........##....................##',
      '####################################',
      '####################################',
      '####################################',
    ],
  },
  {
    // cópia do vídeo 12 (0aed7916): 4 baias à esquerda com barras horizontais em corrente (ciano, amarelo, vermelho; o verde abre a
    // saída), serpentina em zigue-zague, portal de mão única (canto de cima -> corredor de baixo), faca e chegada embaixo à esquerda
    id: 'portais',
    name: 'Portais',
    maxRacers: 4,
    racers: 4,
    ownerPerm: [0, 3, 2, 1], // REGRA DE JUSTIÇA: quem nasce mais longe da saída é o dono da parede que libera todos (barra de saída (verde, teto da baia 1) passa ao quadrado da baia 4 (mais longe); a barra 3-4 passa ao da baia 2)
    zoom: 1.085,        // mapa 16x20 unidades
    racerSize: 50,      // ~0,9 unidade
    racerSpeed: 235, homing: 0, steer: 0, snap: 0, // ~4,2 unidades/s, quique livre
    brickBlock: 2,
    colorBrickHp: 1,
    brickHp: 1,
    knifeKeep: true,
    flood: { delay: 1.0, zoneRate: 0.67, delay2: 10, stage2After: 1, stage2Gap: 1, rate: 2.0, accel: 0 }, // a subida só começa depois que o verde abre a saída
    massTrack: {
      unit: 2, origin: [4, 2], // coordenadas em unidades (mapa 16x20); velocidades em blocos/s
      stage1: [ // cresce da borda esquerda de cada baia (3 unidades, ~0,33 unid/s)
        [5, 0, 6, 2, 'right'], [8, 0, 9, 2, 'right'], [11, 0, 12, 2, 'right'], [14, 0, 15, 2, 'right'],
      ],
      stage2: [
        [0, 3, 15, 6, 'up', 2.0],        // sobe pelo eixo das baias (~1 unid/s) até a sala de cima
        [0, 7, 1, 15, 'right', 2.0],     // corredor de cima
        [2, 13, 5, 15, 'down', 1.6],     // desce pelo vão
        [3, 8, 5, 12, 'left', 2.0],
        [6, 8, 9, 10, 'down', 2.0],
        [7, 11, 9, 15, 'right', 2.0],
        [10, 13, 13, 15, 'down', 2.0],
        [11, 8, 13, 12, 'left', 2.0],
        [14, 8, 16, 10, 'down', 2.0],
        [15, 11, 16, 15, 'right', 2.0],
        [17, 13, 19, 15, 'down', 2.0],
        [18, 10, 19, 12, 'left', 2.0],
      ],
    },
    map: [
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '########........BB..............P.##',
      '########........BB................##',
      '########........BB................##',
      '########........BB................##',
      '########........############......##',
      '########........############......##',
      '########........##................##',
      '########........##................##',
      '########22222222##................##',
      '########22222222##................##',
      '##..............##................##',
      '##..S...........##................##',
      '##..............##......############',
      '##..............##......############',
      '########11111111##................##',
      '########11111111##................##',
      '##..............##................##',
      '##..S...........##................##',
      '##..............##................##',
      '##..............##................##',
      '########33333333############......##',
      '########33333333############......##',
      '##..............##................##',
      '##..S...........##................##',
      '##..............##..!.............##',
      '##..............##................##',
      '########44444444##................##',
      '########44444444##................##',
      '##..............##......############',
      '##..S...........##......############',
      '##..............##................##',
      '##..............##................##',
      '##################p...............##',
      '##################................##',
      '############################......##',
      '############################......##',
      '##################FFBB............##',
      '##################FFBB............##',
      '##################FFBB............##',
      '##################FFBB............##',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
    ],
  },
  {
    // cópia do vídeo 11 (099c992e): 4 baias embaixo presas por tijolos de cor (vermelho, ciano, verde; amarelo sai pela direita),
    // serpentina com tijolos escuros, 2 pistões (um sobe, um desce) e chegada no canto de cima à esquerda
    id: 'meandro',
    name: 'Meandro',
    maxRacers: 4,
    racers: 4,
    ownerPerm: [2, 1, 0, 3], // REGRA DE JUSTIÇA: quem nasce mais longe da saída é o dono da parede que libera todos (saída (col 11) passa ao quadrado da baia 1 (mais longe); o tijolo entre baias 2-3 passa ao da baia 3)
    zoom: 1.24,         // mapa 14x18 unidades
    racerSize: 40,      // ~0,75 unidade
    racerSpeed: 235, homing: 0, steer: 0, snap: 0, // ~4,2 unidades/s, quique livre
    brickBlock: 2,
    colorBrickHp: 1,
    brickHp: 1,
    flood: { delay: 1.2, zoneRate: 0.67, delay2: 10, rate: 1.8, accel: 0 },
    massTrack: {
      unit: 2, origin: [6, 4], // coordenadas em unidades (mapa 14x18); velocidades em blocos/s
      stage1: [ // sobe pelo fundo das 4 baias (~0,33 unidade/s)
        [15, 0, 17, 1, 'up'], [15, 3, 17, 4, 'up'], [15, 6, 17, 7, 'up'], [15, 9, 17, 10, 'up'],
      ],
      stage2: [
        [11, 0, 14, 11, 'right', 1.8],  // varre a sala das baias da esquerda para a direita
        [0, 12, 14, 13, 'up', 1.65],    // sobe pelo corredor da direita
        [0, 9, 1, 13, 'left', 2.0],     // faixa de cima, para a esquerda
        [2, 9, 7, 10, 'down', 3.0],     // desce pela coluna 9-10
        [8, 6, 9, 10, 'left', 1.6],     // passagem de baixo (o pistão P2 segura quando fecha)
        [0, 6, 7, 7, 'up', 3.0],        // sobe pela coluna 6-7
        [0, 3, 1, 5, 'left', 2.0],      // faixa de cima (o pistão P1 segura)
        [2, 3, 9, 4, 'down', 3.0],      // desce pela coluna 3-4
      ],
    },
    pistons: [
      { c: 14, r: 10, w: 2, max: 4, period: 6, phase: 0, dir: 'up' },    // P1: base no topo da parede da col 5, sobe 2 unidades
      { c: 20, r: 22, w: 2, max: 4, period: 6, phase: 0, dir: 'down' },  // P2: base no pé da parede da col 8, desce 2 unidades
    ],
    map: [
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####FFFF##..........##....BB....####',
      '####FFFF##..........##....BB....####',
      '####FFFF##..........##....BB....####',
      '####FFFF##..........##....BB....####',
      '####BBBB##....##....##....##....####',
      '####BBBB##....##....##....##....####',
      '####BBBB##....##....##....##....####',
      '####BBBB##....##....##....##....####',
      '####....##....##....##....##....####',
      '####....##....##....##....##....####',
      '####....##....##....##....##....####',
      '####....##....##....##....##....####',
      '####....##....##....##....##....####',
      '####....##....##....##....##....####',
      '####....##....##....##....##....####',
      '####....##....##....##....##....####',
      '####....BB....##..........##....####',
      '####....BB....##..........##....####',
      '####....BB....##..........##....####',
      '####....BB....##..........##....####',
      '############################....####',
      '############################....####',
      '####....22....11....44....33....####',
      '####....22....11....44....33....####',
      '####....22....11....44....33....####',
      '####....22....11....44....33....####',
      '####....22....11....44....33....####',
      '####....22....11....44....33....####',
      '####....22....11....44....33....####',
      '####....22....11....44....33....####',
      '####....##....##....##....##########',
      '####....##....##....##....##########',
      '####....##....##....##....##########',
      '####....##....##....##....##########',
      '####..S.##..S.##..S.##..S.##########',
      '####....##....##....##....##########',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
    ],
  },
  {
    // cópia do vídeo 10 (08babe70): 4 baias embaixo presas por tijolos de cor (verde abre p/ ciano, ciano abre p/ vermelho,
    // amarelo sai direto), massa sobe pelas baias e varre tudo, 2 pistões horizontais, faca, chegada atrás de 3 tijolos escuros
    id: 'pilares',
    name: 'Pilares',
    maxRacers: 4,
    racers: 4,
    ownerPerm: [3, 1, 2, 0], // REGRA DE JUSTIÇA: quem nasce mais longe da saída é o dono da parede que libera todos (saída (amarelo, col 11) passa ao quadrado da baia 1 (mais longe); o tijolo entre baias 3-4 passa ao da baia 4)
    zoom: 1.24,         // mapa 14x18 unidades
    racerSize: 40,      // ~0,75 unidade
    racerSpeed: 235, homing: 0, steer: 0, snap: 0, // ~4,2 unidades/s, quique livre
    brickBlock: 2,
    colorBrickHp: 1,
    brickHp: 1,
    knifeKeep: true,
    flood: { delay: 0.8, zoneRate: 0.8, delay2: 9.5, stage2After: 3, stage2Gap: 1, rate: 1.8, accel: 0 }, // a varredura só começa 1s depois que a SAÍDA (col 11; dígito 4 -> ownerPerm) abre (senão prensa quem ainda está nas baias)
    massTrack: {
      unit: 2, origin: [6, 4], // coordenadas em unidades (mapa 14x18); velocidades em blocos/s
      stage1: [ // sobe pelo fundo das 4 baias (~0,4 unidade/s)
        [14, 0, 17, 1, 'up'], [14, 3, 17, 4, 'up'], [14, 6, 17, 7, 'up'], [14, 9, 17, 10, 'up'],
      ],
      stage2: [
        [10, 0, 13, 11, 'right', 1.5],  // varre a sala das baias da esquerda para a direita
        [2, 12, 13, 13, 'up', 1.65],    // sobe pelo corredor da direita
        [0, 8, 1, 13, 'left', 2.0],     // faixa de cima, da direita para a esquerda
        [2, 8, 5, 10, 'down', 1.4],     // desce pela sala da direita (o pistão A segura)
        [6, 4, 8, 10, 'left', 2.0],     // passagem de baixo, para a esquerda
        [0, 4, 8, 6, 'up', 1.2],        // sobe pela coluna do meio (o pistão B segura)
      ],
    },
    pistons: [
      { c: 20, r: 10, w: 2, max: 6, period: 8, phase: 0, dir: 'right' },  // A: linha 2, nasce na parede esquerda da sala da direita
      { c: 18, r: 16, w: 2, max: 6, period: 10, phase: 0, dir: 'left' },  // B: linha 5, nasce na parede direita da coluna do meio
    ],
    map: [
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####..............##............####',
      '####..............##............####',
      '####..............##............####',
      '####...!..........##............####',
      '####......##......##......##....####',
      '####......##......##......##....####',
      '####......##......##......##....####',
      '####......##......##......##....####',
      '####......##......##......##....####',
      '####......##......##......##....####',
      '####......##......##......##....####',
      '####......##......##......##....####',
      '####BBBBBB##..............##....####',
      '####BBBBBB##..............##....####',
      '####FFFFFF##..............##....####',
      '####FFFFFF##..............##....####',
      '####FFFFFF##..............##....####',
      '####FFFFFF##..............##....####',
      '############################....####',
      '############################....####',
      '####....33....22....11....44....####',
      '####....33....22....11....44....####',
      '####....33....22....11....44....####',
      '####....33....22....11....44....####',
      '####....33....22....11....44....####',
      '####....33....22....11....44....####',
      '####....33....22....11....44....####',
      '####....33....22....11....44....####',
      '####....##....##....##....##..######',
      '####....##....##....##....##..######',
      '####....##....##....##....##....####',
      '####....##....##....##....##....####',
      '####....##....##....##....##....####',
      '####....##....##....##....##....####',
      '####..S.##..S.##..S.##..S.##########',
      '####....##....##....##....##########',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
    ],
  },
  {
    // cópia do vídeo 09 (07c1f66c): 4 baias no topo presas em corrente (tijolos vermelho, ciano, verde e por fim amarelo),
    // serpentina de corredores de 3 blocos, 1 pistão, tijolos escuros no meio e na chegada
    id: 'pente',
    name: 'Pente',
    maxRacers: 4,
    racers: 4,
    zoom: 1.83,         // mapa 19x22 blocos
    racerSize: 26,      // no vídeo ~16px; maior aqui para o escudo aparecer dentro do quadrado
    racerSpeed: 170, homing: 0, steer: 0, snap: 0, // ~6 blocos/s, quique livre
    brickBlock: 1,      // tijolos de 1 bloco, cada um quebra sozinho
    colorBrickHp: 1,
    brickHp: 1,
    flood: { delay: 1.0, zoneRate: 0.7, delay2: 5, stage2After: 0, stage2Gap: 1.5, rate: 1.3, accel: 0 }, // a varredura começa 1,5s depois que o verde quebra o 1º tijolo dele
    massTrack: {
      unit: 1, origin: [13, 8], // coordenadas em blocos (mapa 19x22)
      stage1: [ // nasce no topo de cada baia e desce 4 linhas
        [0, 4, 3, 5, 'down'], [0, 7, 3, 8, 'down'], [0, 10, 3, 11, 'down'], [0, 13, 3, 14, 'down'],
      ],
      stage2: [ // [linha0, col0, linha1, col1, direção, blocos/s]
        [3, 0, 6, 14, 'left', 0.9],     // varre a sala das baias da direita para a esquerda
        [7, 0, 10, 2, 'down', 2.0],     // desce pela esquerda
        [8, 3, 10, 18, 'right', 1.3],   // corredor 1 (o pistão segura a frente quando fecha)
        [11, 16, 14, 18, 'down', 1.3],  // desce pela direita
        [12, 0, 14, 15, 'left', 2.6],   // corredor 2
        [15, 0, 18, 2, 'down', 2.0],    // desce pela esquerda
        [16, 3, 18, 18, 'right', 2.4],  // corredor 3
        [19, 16, 21, 18, 'down', 1.5],  // desce pela direita
        [20, 4, 21, 15, 'left', 1.6],   // corredor da chegada
      ],
    },
    pistons: [
      { c: 21, r: 23, w: 1, max: 3, period: 10, phase: 0 }, // corredor 1 (coluna 13 do mapa, base na linha 10)
    ],
    map: [
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '############S.#S.#S.#S.#############',
      '############..#..#..#..##..#########',
      '############..#..#..#..##..#########',
      '########...4..2..3..1..##..#########',
      '########...4..2..3..1..##..#########',
      '########...4..2..3..1..##..#########',
      '########...4..2..3..1..##..#########',
      '########...##############..#########',
      '########...................#########',
      '########...................#########',
      '########...................#########',
      '########################...#########',
      '########...................#########',
      '########...................#########',
      '########...................#########',
      '########...#########################',
      '########...............B...#########',
      '########...............B...#########',
      '########...............B...#########',
      '########################...#########',
      '########FFBB...........B...#########',
      '########FFBB...........B...#########',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
    ],
  },
  {
    // fase ORIGINAL (criada a partir do padrão dos prints): 5 colunas na base com janelas de tijolos de cor
    // em corrente (2º e 4º abrem primeiro; a saída é do 3º), corredores com 2 pistões, nicho com faca e atalho de tijolos escuros
    id: 'colunas',
    name: 'Colunas',
    maxRacers: 5,
    racers: 5,          // quantos quadrados a fase usa
    zoom: 1.08,
    racerSize: 36,
    racerSpeed: 255, homing: 0.2, steer: 0.1, snap: 0.05,
    brickBlock: 2,
    colorBrickHp: 1,
    brickHp: 1,
    knifeKeep: true,    // a faca não gasta: elimina todo mundo em que encostar
    flood: { delay: 1.5, delay2: 1.5, rate: 0.22, accel: 0 }, // sobe devagar (~0,11 unidade/s), como nos Poços
    massTrack: {
      unit: 1, origin: [4, 1], // blocos (mapa 34x40)
      stage1: [],
      stage2: [
        [28, 0, 39, 33, 'up', 0.22],    // 1) sobe pelas colunas e pelo fundo do corredor da direita (para 2 unidades abaixo do topo das colunas)
        [12, 30, 27, 33, 'up', 0.6],    // 2) sobe pelo corredor da direita
        [12, 6, 15, 33, 'left', 0.6],   // 3) corredor de baixo, da direita para a esquerda
        [0, 6, 15, 9, 'up', 0.6],       // 4) sobe pela esquerda
        [0, 6, 3, 25, 'right', 0.6],    // 5) corredor de cima, até a chegada
      ],
    },
    noFlood: [[20, 11, 25, 16]], // nicho da faca: a massa nunca entra
    pistons: [
      { c: 19, r: 20, w: 2, max: 4, period: 8, phase: 0 },   // corredor de baixo
      { c: 13, r: 8, w: 2, max: 4, period: 10, phase: 3 },   // corredor de cima
    ],
    map: [
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '#######....................BBBBFFFF#',
      '#######....................BBBBFFFF#',
      '#######....................BBBBFFFF#',
      '#######....................BBBBFFFF#',
      '#######....############BB###########',
      '#######....############BB###########',
      '#######....############BB###########',
      '#######....############BB###########',
      '#######....############BB###########',
      '#######....############BB###########',
      '#######....############BB###########',
      '#######....############BB###########',
      '#######............................#',
      '#######............................#',
      '#######............................#',
      '#######............................#',
      '#############..################....#',
      '#############..################....#',
      '#############..################....#',
      '#############..################....#',
      '###########......##############....#',
      '###########..!...##############....#',
      '###############################....#',
      '###############################....#',
      '#....22....11....55....44....33....#',
      '#....22....11....55....44....33....#',
      '#....22....11....55....44....33....#',
      '#....22....11....55....44....33....#',
      '#....22....11....55....44....33....#',
      '#....22....11....55....44....33....#',
      '#....22....11....55....44....33....#',
      '#....22....11....55....44....33....#',
      '#....22....11....55....44....33....#',
      '#....22....11....55....44....33....#',
      '#....22....11....55....44....33....#',
      '#....22....11....55....44....33....#',
      '#....##....##....##....##....##....#',
      '#..S.##..S.##..S.##..S.##..S.##....#',
      '#....##....##....##....##....##....#',
      '#....##....##....##....##....##....#',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
    ],
  },
  {
    // cópia do 8º vídeo de referência: os 4 começam juntos na sala de baixo; 4 poços fechados por um
    // tijolo de cor cada; massa sobe devagar (igual para todos os poços); 1 pistão sobre a lingueta
    id: 'pocos',
    name: 'Poços',
    maxRacers: 4,
    zoom: 1.24,         // mapa 14x18 unidades: aproxima a câmera
    racerSize: 36,      // ~0,65 unidade, igual ao vídeo
    racerSpeed: 230, homing: 0, steer: 0, snap: 0, // ~4,2 unidades/s, quique livre
    brickBlock: 2,      // cada tijolo (1 unidade = 2x2 blocos) quebra sozinho
    colorBrickHp: 1,
    brickHp: 1,         // tijolos escuros da chegada: 1 batida
    flood: { delay: 1.2, delay2: 1.2, rate: 0.265, accel: 0 }, // ~0,13 unidade/s, bem devagar
    massTrack: {
      unit: 1, origin: [6, 4], // blocos
      stage1: [],
      stage2: [[6, 0, 35, 27, 'up', 0.265]], // sobe pela sala de baixo e pelos 4 poços ao mesmo tempo
    },
    pistons: [ // sobre a lingueta, no corredor da chegada: cresce 2 unidades para cima e recolhe (8s)
      { c: 22, r: 10, w: 2, max: 4, period: 8 },
    ],
    map: [
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####FFFFBBBB....................####',
      '####FFFFBBBB....................####',
      '####FFFFBBBB....................####',
      '####FFFFBBBB....................####',
      '##########################......####',
      '##########################......####',
      '####............................####',
      '####............................####',
      '####............................####',
      '####............................####',
      '####............................####',
      '####............................####',
      '########11####22####33####44########',
      '########11####22####33####44########',
      '########..####..####..####..########',
      '########..####..####..####..########',
      '########..####..####..####..########',
      '########..####..####..####..########',
      '########..####..####..####..########',
      '########..####..####..####..########',
      '########..####..####..####..########',
      '########..####..####..####..########',
      '########..####..####..####..########',
      '########..####..####..####..########',
      '########..####..####..####..########',
      '########..####..####..####..########',
      '########..####..####..####..########',
      '########..####..####..####..########',
      '####............................####',
      '####............................####',
      '####............................####',
      '####............................####',
      '####............................####',
      '####............................####',
      '####...........S.S.S.S..........####',
      '####............................####',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
    ],
  },
  {
    // cópia do 7º vídeo de referência: baias à esquerda presas em corrente, massa sobe pelas baias,
    // corre pelo topo e desce uma escada em zigue-zague com tijolos escuros até a chegada
    id: 'escada',
    name: 'Escada',
    maxRacers: 4,
    zoom: 1.08,
    racerSize: 34,      // quadrados pequenos (~0,6 unidade), igual ao vídeo
    racerSpeed: 195, homing: 0, steer: 0, snap: 0, // ~3,4 unidades/s, quique livre
    brickBlock: 2,
    colorBrickHp: 1,
    brickHp: 1,         // tijolos escuros: 2 batidas
    flood: { delay: 0.2, zoneRate: 0.75, delay2: 8, stage2After: 0, stage2Gap: 1.5, rate: 2.3, accel: 0 },
    massTrack: {
      unit: 1, origin: [3, 2], // coordenadas em blocos (mapa 32x42)
      stage1: [ // nasce na borda esquerda de cada baia e anda 6 blocos (3 unidades)
        [10, 0, 13, 5, 'right'], [16, 0, 19, 5, 'right'], [22, 0, 25, 5, 'right'], [28, 0, 31, 5, 'right'],
      ],
      stage2: [ // [linha0, col0, linha1, col1, direção, blocos/s]
        [8, 0, 31, 13, 'up', 2.4],      // sobe pelas baias (de baixo para cima)
        [4, 6, 7, 13, 'up', 1.9],       // eixo esquerdo
        [0, 6, 3, 31, 'right', 2.7],    // corre pelo topo, da esquerda para a direita
        [4, 26, 9, 31, 'down', 0.95],   // desce pelo eixo direito
        [10, 14, 37, 31, 'down', 0.95], // desce a escada (frente horizontal)
        [38, 8, 41, 21, 'left', 0.95],  // corredor final até a chegada
      ],
    },
    map: [
      '####################################',
      '####################################',
      '####################################',
      '########..........................##',
      '########..........................##',
      '########..........................##',
      '########..........................##',
      '########........############......##',
      '########........############......##',
      '########........############......##',
      '########........############......##',
      '########44444444############BB....##',
      '########44444444############BB....##',
      '##..............##########....BB####',
      '##..............##########....BB####',
      '##..S...........##########......####',
      '##..............##########......####',
      '########22222222##########BB....####',
      '########22222222##########BB....####',
      '##..............########....BB######',
      '##..............########....BB######',
      '##..S...........########......######',
      '##..............########......######',
      '########33333333########BB....######',
      '########33333333########BB....######',
      '##..............######....BB########',
      '##..............######....BB########',
      '##..S...........######......########',
      '##..............######......########',
      '########11111111######BB....########',
      '########11111111######BB....########',
      '##..............####....BB##########',
      '##..............####....BB##########',
      '##..S...........####......##########',
      '##..............####......##########',
      '####################BB....##########',
      '####################BB....##########',
      '##################....BB############',
      '##################....BB############',
      '##################BB....############',
      '##################BB....############',
      '##FFFFBBBB..........BB..############',
      '##FFFFBBBB..........BB..############',
      '##FFFFBBBB............##############',
      '##FFFFBBBB............##############',
      '####################################',
      '####################################',
      '####################################',
    ],
  },
  {
    // cópia do 6º vídeo de referência: duas metades, duplas presas por colunas de tijolos que
    // alternam as cores da dupla, chegada cercada por mosaico, massa sobe devagar, 2 pistões
    id: 'ponte',
    name: 'Ponte',
    maxRacers: 4,
    zoom: 1.2,          // mapa menor (14x18 unidades): aproxima a câmera
    racerSize: 34,      // quadrados menores (~0,6 unidade), igual ao vídeo
    racerSpeed: 227, homing: 0, steer: 0, snap: 0, // ~4 unidades/s, quique livre
    brickBlock: 2,
    colorBrickHp: 1,
    flood: { delay: 1.2, rate: 0.246, accel: 0 }, // ~0,12 unidade/s, bem devagar
    massTrack: {
      unit: 2, origin: [6, 4],
      lanes: [ // as duas metades sobem ao mesmo tempo
        [[14, 0, 17, 5, 'up'], [7, 2, 13, 3, 'up'], [4, 0, 6, 5, 'up'], [3, 0, 3, 1, 'up'], [0, 0, 2, 3, 'up']],
        [[14, 8, 17, 13, 'up'], [7, 10, 13, 11, 'up'], [4, 8, 6, 13, 'up'], [3, 12, 3, 13, 'up'], [0, 10, 2, 13, 'up']],
      ],
    },
    pistons: [ // nas pontas da barra em T: o da esquerda cresce para a esquerda (8s), o da direita para a direita (10s)
      { dir: 'left', c: 8, r: 12, w: 2, max: 4, period: 8 },
      { dir: 'right', c: 28, r: 12, w: 2, max: 4, period: 10 },
    ],
    map: [
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####........2211FFFF3344........####',
      '####........2211FFFF3344........####',
      '####........1122FFFF4433........####',
      '####........1122FFFF4433........####',
      '####........2211FFFF3344........####',
      '####........2211FFFF3344........####',
      '####....####################....####',
      '####....####################....####',
      '####............####............####',
      '####............####............####',
      '####............####............####',
      '####............####............####',
      '####............####............####',
      '####............####............####',
      '########2222############4444########',
      '########2222############4444########',
      '########....############....########',
      '########....############....########',
      '########1111############3333########',
      '########1111############3333########',
      '########....############....########',
      '########....############....########',
      '########2222############4444########',
      '########2222############4444########',
      '########....############....########',
      '########....############....########',
      '########1111############3333########',
      '########1111############3333########',
      '####............####............####',
      '####............####............####',
      '####............####............####',
      '####............####............####',
      '####............####............####',
      '####............####............####',
      '####........S.S.####.S.S........####',
      '####............####............####',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
      '####################################',
    ],
  },
  {
    // cópia do 5º vídeo de referência: baias à esquerda presas em corrente, massa sólida,
    // 3 pistões horizontais, chegada protegida por tijolos escuros, atalho escuro no meio, sem faca
    id: 'cofre',
    name: 'Cofre',
    maxRacers: 4,
    racerSpeed: 275, homing: 0, steer: 0, snap: 0, // quique livre, sem "instinto" (igual ao vídeo)
    brickBlock: 2,      // cada tijolo (2x2) quebra sozinho
    colorBrickHp: 1,
    brickHp: 2,         // tijolos escuros: 2 batidas
    flood: { delay: 0.2, zoneRate: 0.75, delay2: 9.0, stage2After: 0, stage2Gap: 1.5, rate: 2.4, accel: 0 },
    massTrack: {
      unit: 2, origin: [3, 2],
      stage1: [ // nasce na borda esquerda de cada baia e anda 3 unidades para a direita
        [5, 0, 6, 2, 'right'], [8, 0, 9, 2, 'right'], [11, 0, 12, 2, 'right'], [14, 0, 15, 2, 'right'],
      ],
      stage2: [
        [4, 3, 15, 6, 'up'],      // sobe pela sala das baias
        [0, 3, 3, 6, 'up'],       // sobe até o teto
        [0, 7, 1, 15, 'right'],   // vai pelo topo para a direita
        [2, 14, 20, 15, 'down'],  // desce o corredor da direita
        [19, 8, 20, 13, 'left'],  // volta por baixo
        [7, 8, 18, 9, 'up'],      // sobe o corredor da esquerda
        [5, 8, 6, 9, 'up'],       // chega nos tijolos da chegada
      ],
    },
    // atalho da barra escura do meio: a massa nunca entra
    noFlood: [[21, 22, 24, 29]],
    pistons: [ // horizontais, crescem para a direita (8s, fecham o corredor no pico)
      { dir: 'right', c: 30, r: 7, w: 2, max: 4, period: 8 },  // corredor da direita, em cima
      { dir: 'right', c: 30, r: 39, w: 2, max: 4, period: 8 }, // corredor da direita, embaixo
      { dir: 'right', c: 18, r: 39, w: 2, max: 4, period: 8 }, // corredor da esquerda, embaixo
    ],
    map: [
      '####################################',
      '####################################',
      '####################################',
      '########..........................##',
      '########..........................##',
      '########..........................##',
      '########..........................##',
      '########........##############....##',
      '########........##############....##',
      '########........##FFFF########....##',
      '########........##FFFF########....##',
      '########44444444##FFFF########....##',
      '########44444444##FFFF########....##',
      '##~.............##BBBB########....##',
      '##~S............##BBBB########....##',
      '##~.............##BBBB########....##',
      '##~.............##BBBB########....##',
      '########22222222##....########....##',
      '########22222222##....########....##',
      '##~.............##....########....##',
      '##~S............##....########....##',
      '##~.............##....BBBBBBBB....##',
      '##~.............##....BBBBBBBB....##',
      '########33333333##....BBBBBBBB....##',
      '########33333333##....BBBBBBBB....##',
      '##~.............##....########....##',
      '##~S............##....########....##',
      '##~.............##....########....##',
      '##~.............##....########....##',
      '########11111111##....########....##',
      '########11111111##....########....##',
      '##~.............##....########....##',
      '##~S............##....########....##',
      '##~.............##....########....##',
      '##~.............##....########....##',
      '##################....########....##',
      '##################....########....##',
      '##################....########....##',
      '##################....########....##',
      '##################....########....##',
      '##################....########....##',
      '##################................##',
      '##################................##',
      '##################................##',
      '##################................##',
      '####################################',
      '####################################',
      '####################################',
    ],
  },
  {
    // cópia do vídeo de referência: baias presas em corrente, massa sólida, 2 pistões, faca permanente
    id: 'gaiola',
    name: 'Gaiola',
    maxRacers: 4,
    racerSpeed: 275, homing: 0, steer: 0, snap: 0, // quique livre, sem "instinto" (igual ao vídeo)
    brickBlock: 2,      // cada tijolo (2x2) quebra sozinho, com 1 batida
    colorBrickHp: 1,
    knifeKeep: true,    // a faca não gasta: quem pega elimina todo mundo em que encostar
    flood: { delay: 0.2, zoneRate: 0.75, delay2: 9.7, stage2After: 0, stage2Gap: 1.5, rate: 2.4, accel: 0 },
    // trilho da massa (unidades do mapa 16x21): cada trecho enche numa direção, como no vídeo
    massTrack: {
      unit: 2, origin: [3, 2],
      stage1: [ // nasce no fundo de cada baia e anda 3 unidades para a esquerda
        [5, 13, 6, 15, 'left'], [8, 13, 9, 15, 'left'], [11, 13, 12, 15, 'left'], [14, 13, 15, 15, 'left'],
      ],
      stage2: [
        [4, 9, 15, 12, 'up'],     // sobe pela sala das baias
        [0, 9, 3, 12, 'up'],      // sobe no canto de cima até o teto
        [0, 0, 1, 8, 'left'],     // aí vai da direita para a esquerda pelo topo
        [2, 0, 20, 1, 'down'],    // desce pelo corredor da esquerda
        [17, 2, 20, 4, 'right'],  // passa por baixo do pilar
        [7, 3, 16, 4, 'up'],      // sobe
        [7, 5, 8, 7, 'right'],    // passa pela ponta do pilar do meio (pistão)
        [9, 6, 20, 7, 'down'],    // desce
        [20, 8, 20, 12, 'right'], // corredor de baixo
        [17, 13, 20, 15, 'up'],   // sobe à direita
        [17, 9, 18, 12, 'left'],  // entra na chegada
      ],
    },
    // sala da faca (atalho): a massa nunca entra, igual ao vídeo
    noFlood: [[9, 8, 14, 17], [7, 8, 8, 9], [15, 16, 16, 17]],
    pistons: [
      { c: 6, w: 2, r: 7, max: 4, period: 8 },   // ponta do pilar esquerdo (fecha a curva de cima)
      { c: 12, w: 2, r: 21, max: 4, period: 8 }, // ponta do pilar do meio
    ],
    map: [
      '####################################',
      '####################################',
      '####################################',
      '##..........................########',
      '##..........................########',
      '##..........................########',
      '##..........................########',
      '##....##..##########........########',
      '##....##..##########........########',
      '##....##..........##........########',
      '##....##..........##........########',
      '##....##..........##44444444########',
      '##....##....!.....##44444444########',
      '##....##..........##........%%%%%~##',
      '##....##..........##........%%%S%~##',
      '##....##########..##........%%%%%~##',
      '##....##########..##........%%%%%~##',
      '##....##..........##22222222########',
      '##....##..........##22222222########',
      '##....##..........##........%%%%%~##',
      '##....##..........##........%%%S%~##',
      '##....##....##....##........%%%%%~##',
      '##....##....##....##........%%%%%~##',
      '##....##....##....##33333333########',
      '##....##....##....##33333333########',
      '##....##....##....##........%%%%%~##',
      '##....##....##....##........%%%S%~##',
      '##....##....##....##........%%%%%~##',
      '##....##....##....##........%%%%%~##',
      '##....##....##....##11111111########',
      '##....##....##....##11111111########',
      '##....##....##....##........%%%%%~##',
      '##....##....##....##........%%%S%~##',
      '##....##....##....##........%%%%%~##',
      '##....##....##....##========%%%%%~##',
      '##....##....##....##################',
      '##....##....##....##################',
      '##..........##....##FFFF..........##',
      '##..........##....##FFFF..........##',
      '##..........##....##FFFF..........##',
      '##..........##....##FFFF..........##',
      '##..........##....##########......##',
      '##..........##....##########......##',
      '##..........##....................##',
      '##..........##....................##',
      '####################################',
      '####################################',
      '####################################',
    ],
  },
  {
    id: 'derby',
    name: 'Derby',
    maxRacers: 4,
    flood: { delay: 3, rate: 1.6, accel: 0.02 },
    map: [
      '####################################',
      '#.............BB..................##',
      '#.............BB..................##',
      '#.................................##',
      '#.................................##',
      '#.............BB..................##',
      '#.............BB..................##',
      '#......######################.....##',
      '#......######################.....##',
      '#......######################.....##',
      '#..........................##.....##',
      '#..........................##.....##',
      '#..........................##.....##',
      '#..........................##.....##',
      '#............BB............##.....##',
      '#............BB............##.....##',
      '#####################......##.....##',
      '#####################......##.....##',
      '#####################......##.....##',
      '#FFFFFFFFBB................##.....##',
      '#FFFFFFFFBB................##.....##',
      '#FFFFFFFFBB................##.....##',
      '#FFFFFFFFBB................##.....##',
      '#FFFFFFFFBB................##.....##',
      '#FFFFFFFFBB................##.....##',
      '#############################.....##',
      '#############################.....##',
      '#############################.....##',
      '#############################.....##',
      '#.....11.....22.....33.....44.....##',
      '#.....11.....22.....33.....44.....##',
      '#.....11.....22.....33.....44.....##',
      '#.....11.....22.....33.....44.....##',
      '#.....11.....22.....33.....44.....##',
      '#.....11.....22.....33.....44.....##',
      '#.....11.....22.....33.....44.....##',
      '#.....11.....22.....33.....44.....##',
      '#.....11.....22.....33.....44.....##',
      '#.....##.....##.....##.....##.....##',
      '#.....##.....##.....##.....##.....##',
      '#.....##.....##.....##.....####...##',
      '#..S..##..S..##..S..##..S..####...##',
      '#.....##.....##.....##.....##.....##',
      '#.....##.....##.....##.....##..!..##',
      '#.....##.....##.....##.....##.....##',
      '#.....##.....##.....##.....#########',
      '#~~~~~##~~~~~##~~~~~##~~~~~#########',
      '####################################',
    ],
  },
  {
    id: 'serpente',
    name: 'Serpente',
    maxRacers: 4,
    finishBrickHp: 9,
    flood: { delay: 3, rate: 1.6, accel: 0.02 },
    map: [
      '####################################',
      '#########............##............#',
      '#########............##............#',
      '#########............##............#',
      '#########............##............#',
      '#########............##............#',
      '#########.....BB.....##.....BB.....#',
      '#########.....BB.....##.....BB.....#',
      '#########.....##.....##.....##.....#',
      '#......##.....##.....##.....##.....#',
      '#......##.....##.....##.....##.....#',
      '#..!..........##.....##.....##.....#',
      '#.............##.....##.....##.....#',
      '#......##.....##.....##.....##.....#',
      '#......##.....##.....##.....##.....#',
      '#########.....##.....##.....##.....#',
      '#########.....##.....##.....##.....#',
      '#########.....##.....##.....##.....#',
      '#########.....##.....##.....##.....#',
      '#########.....##.....##.....##.....#',
      '#~.....11.....##.....##.....##.....#',
      '#~.....11.....##.....##.....##.....#',
      '#~..S..11.....##.....##.....##.....#',
      '#~.....11.....##.....##.....##.....#',
      '#~.....11.....##.....##.....##.....#',
      '#########.....##.....##.....##.....#',
      '#########.....##.....##.....##.....#',
      '#~.....22.....##.....##.....##.....#',
      '#~.....22.....##.....##.....##.....#',
      '#~..S..22.....##.....##.....##.....#',
      '#~.....22.....##.....##.....##.....#',
      '#~.....22.....##.....##.....##.....#',
      '#########.....##.....##.....##.....#',
      '#########.....##.....##.....##.....#',
      '#~.....33.....##.....##.....##.....#',
      '#~.....33.....##.....##.....##.....#',
      '#~..S..33.....##.....##.....##.....#',
      '#~.....33.....##.....##.....##.....#',
      '#~.....33.....##.....##.....##BBBBB#',
      '#########.....##.....BB.....##BBBBB#',
      '#########.....##.....BB.....##BBBBB#',
      '#~.....44.....##............##FFFFF#',
      '#~.....44.....##............##FFFFF#',
      '#~..S..44.....##............##FFFFF#',
      '#~.....44.....##............##FFFFF#',
      '#~.....44.....##............##FFFFF#',
      '####################################',
      '####################################',
    ],
  },
  {
    id: 'arena8',
    name: 'Arena 8',
    maxRacers: 8,
    flood: { delay: 5, rate: 0.8, accel: 0.01 },
    finishBrickHp: 14,
    racerSpeed: 170,
    map: [
      '####################################',
      '#.................................##',
      '#.................................##',
      '#.................................##',
      '#.................................##',
      '#.................................##',
      '#.....#########.....#########.....##',
      '#.....#########.....#########.....##',
      '#.....##FFFFF##.....##FFFFF##.....##',
      '#.....##FFFFF##.....##FFFFF##.....##',
      '#.....##FFFFF##.....##FFFFF##.....##',
      '#.....##BBBBB##.....##BBBBB##.....##',
      '#.....##BBBBB##.....##BBBBB##.....##',
      '#.....##...................##.....##',
      '#.....##...................##.....##',
      '#.....##...................##.....##',
      '#.....##...................##.....##',
      '#.....##...................##.....##',
      '#.....##########...##########.....##',
      '#.....#########.....#########.....##',
      '#.....#########..!..#########.....##',
      '#.....#########.....#########.....##',
      '#.....#######################.....##',
      '#.....#######################.....##',
      '#.....#######################.....##',
      '#.................................##',
      '#.................................##',
      '#.................................##',
      '#.................................##',
      '#.................................##',
      '#.................................##',
      '#111#222#333#444#555#666#777#888####',
      '#111#222#333#444#555#666#777#888####',
      '#111#222#333#444#555#666#777#888####',
      '#111#222#333#444#555#666#777#888####',
      '#...#...#...#...#...#...#...#...####',
      '#...#...#...#...#...#...#...#...####',
      '#...#...#...#...#...#...#...#...####',
      '#...#...#...#...#...#...#...#...####',
      '#...#...#...#...#...#...#...#...####',
      '#...#...#...#...#...#...#...#...####',
      '#.S.#.S.#.S.#.S.#.S.#.S.#.S.#.S.####',
      '#...#...#...#...#...#...#...#...####',
      '#...#...#...#...#...#...#...#...####',
      '#...#...#...#...#...#...#...#...####',
      '#...#...#...#...#...#...#...#...####',
      '#~~~#~~~#~~~#~~~#~~~#~~~#~~~#~~~####',
      '####################################',
    ],
  },
];

export function getLevel(idOrIndex) {
  if (typeof idOrIndex === 'number') return LEVELS[idOrIndex % LEVELS.length];
  const n = Number(idOrIndex);
  if (Number.isInteger(n) && String(n) === String(idOrIndex)) return LEVELS[(n - 1 + LEVELS.length) % LEVELS.length];
  return LEVELS.find((l) => l.id === idOrIndex) || LEVELS[0];
}
