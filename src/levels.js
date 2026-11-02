// Fases em ASCII — 18 colunas x 24 linhas. Fácil de criar/editar.
//
//  #  parede              .  chão                 F  chegada (xadrez)
//  S  ponto de largada    ~  fonte da inundação   B  tijolo comum (2 batidas, qualquer um quebra)
//  1-8 tijolo colorido: só o competidor nº N quebra (os outros quicam)
//  D  portão/pistão que abre e fecha
//  ^ v < >  acelerador (empurra na direção da seta)
//  O  bumper (rebate com força, estilo pinball)
//  *  hélice giratória (centro)
//  P/p  Q/q  portais (pares: P <-> p, Q <-> q)
//  !  espada (quebra qualquer tijolo de 1 batida e empurra rivais)
//  z  raio (velocidade extra)
//  ?  caixa surpresa (espada, raio ou gelo — congela os rivais)
//
// Cada fase pode ajustar a inundação: delay (s até começar), rate (linhas/s), accel (aceleração/s).

export const LEVELS = [
  {
    id: 'subida',
    name: 'A Subida',
    maxRacers: 4,
    flood: { delay: 8, rate: 0.16, accel: 0.007 },
    map: [
      '##################',
      '#FFFF#...........#',
      '#FFFFB..O....O...#',
      '#FFFFB...........#',
      '#BBBB###..#####..#',
      '#....#....#.?.#..#',
      '#.z..D....#...#..#',
      '#....D....##D##..#',
      '#....#...........#',
      '#....#....*......#',
      '##..###.......####',
      '#.......####.....#',
      '#..O....#..#..O..#',
      '#.......#!.#.....#',
      '#...^...##D#..^..#',
      '#................#',
      '#111#222#333#444##',
      '#111#222#333#444##',
      '#^^^#^^^#^^^#^^^##',
      '#...#...#...#...##',
      '#.S.#.S.#.S.#.S.##',
      '#...#...#...#...##',
      '#~~~#~~~#~~~#~~~##',
      '##################',
    ],
  },
  {
    id: 'pinball',
    name: 'Pinball',
    maxRacers: 4,
    flood: { delay: 8, rate: 0.14, accel: 0.006 },
    map: [
      '##################',
      '#...#..FFFF..#...#',
      '#.z.#..FFFF..#.?.#',
      '#...#..BBBB..#...#',
      '#...#........#...#',
      '#...#.O.pq.O.#...#',
      '#...#........#...#',
      '#...####..####...#',
      '#................#',
      '#......*....*....#',
      '#................#',
      '####..O....O..####',
      '#P..............Q#',
      '#......O..O......#',
      '#..O..........O..#',
      '#.......^^.......#',
      '#111#222#333#444##',
      '#111#222#333#444##',
      '#^^^#^^^#^^^#^^^##',
      '#...#...#...#...##',
      '#.S.#.S.#.S.#.S.##',
      '#...#...#...#...##',
      '#~~~#~~~#~~~#~~~##',
      '##################',
    ],
  },
  {
    id: 'serpente',
    name: 'Serpente',
    maxRacers: 4,
    flood: { delay: 8, rate: 0.16, accel: 0.007 },
    map: [
      '##################',
      '#FFF#............#',
      '#FFF#..O.....O...#',
      '#BBB#............#',
      '#...D..#####D#####',
      '#...#............#',
      '#.!.#..>>....O...#',
      '#...#............#',
      '#...######D####..#',
      '#................#',
      '#..O....*.....O..#',
      '#................#',
      '#..####D#######..#',
      '#..#..........#..#',
      '#..#....?.....#..#',
      '#..#..........#..#',
      '#..######..####..#',
      '#................#',
      '#111#222#333#444##',
      '#^^^#^^^#^^^#^^^##',
      '#...#...#...#...##',
      '#.S.#.S.#.S.#.S.##',
      '#~~~#~~~#~~~#~~~##',
      '##################',
    ],
  },
  {
    id: 'arena8',
    name: 'Arena 8',
    maxRacers: 8,
    flood: { delay: 7, rate: 0.16, accel: 0.009 },
    brickHp: 7,
    homing: 0.35,
    map: [
      '##################',
      '#FFFFFF##FFFFFF###',
      '#BBBBBB##BBBBBB###',
      '#................#',
      '#..O....*.....O..#',
      '#................#',
      '###D######..####D#',
      '#.......#....#...#',
      '#..?....P....#.z.#',
      '#.......#....#...#',
      '#####..##..###...#',
      '#................#',
      '#...*......O.....#',
      '#................#',
      '#..BBBB####BBBB..#',
      '#..#..........#..#',
      '#..#....!.....#..#',
      '#..#..........#..#',
      '#..######..##p##.#',
      '#................#',
      '#.S.S.S.S.S.S.S.S#',
      '#^^^^^^^^^^^^^^^^#',
      '#~~~~~~~~~~~~~~~~#',
      '##################',
    ],
  },
];

export function getLevel(idOrIndex) {
  if (typeof idOrIndex === 'number') return LEVELS[idOrIndex % LEVELS.length];
  const n = Number(idOrIndex);
  if (Number.isInteger(n) && String(n) === String(idOrIndex)) return LEVELS[(n - 1 + LEVELS.length) % LEVELS.length];
  return LEVELS.find((l) => l.id === idOrIndex) || LEVELS[0];
}
