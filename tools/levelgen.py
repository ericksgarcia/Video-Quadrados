#!/usr/bin/env python3
"""Gera os mapas ASCII (36x48) das fases a partir de retângulos — imprime o JS das fases.
Uso: python3 tools/levelgen.py   (cole a saída em src/levels.js ou adapte à vontade)
Coordenadas: (linha, coluna), inclusivas. Tudo começa como parede '#'."""
COLS, ROWS = 36, 48

class M:
    def __init__(s): s.g = [['#'] * COLS for _ in range(ROWS)]
    def carve(s, r0, c0, r1, c1, ch='.'):
        for r in range(r0, r1 + 1):
            for c in range(c0, c1 + 1): s.g[r][c] = ch
        return s
    def put(s, r, c, ch): s.g[r][c] = ch; return s
    def lanes(s, starts, width, brick_rows, floor_rows, src_row, spawn_row):
        for i, c0 in enumerate(starts):
            c1 = c0 + width - 1
            for r in brick_rows: s.carve(r, c0, r, c1, str(i + 1))
            s.carve(floor_rows[0], c0, floor_rows[1], c1, '.')
            s.carve(src_row, c0, src_row, c1, '~')
            s.put(spawn_row, (c0 + c1) // 2, 'S')
        return s
    def slit_v(s, c, r0, r1, open0, open1, thick=2):
        """divisória vertical (colunas c..c+thick-1, linhas r0..r1) com uma fresta em open0..open1"""
        s.carve(r0, c, r1, c + thick - 1, '#'); s.carve(open0, c, open1, c + thick - 1, '.'); return s
    def lines(s): return [''.join(r) for r in s.g]

# Estilo dos vídeos de referência: corredores largos (5 blocos = 140px) em serpentina, paredes de
# 2 blocos, tijolos coloridos ALTOS que prendem todo mundo na largada, chegada quadriculada atrás
# de tijolos escuros e UMA faca num nicho de entrada estreita.

def derby():
    """Largada em corrente (igual ao 2º vídeo): cada raia é presa à direita pelo tijolo da SUA cor;
    quebrou, junta com a raia vizinha. A última raia abre a saída. Todo mundo começa preso."""
    m = M()
    lanes = [1, 8, 15, 22]
    for i, c0 in enumerate(lanes):
        m.carve(29, c0, 45, c0 + 4)                 # baia (salão + raia)
        m.carve(29, c0 + 5, 37, c0 + 6, str(i + 1)) # coluna de tijolo da cor (lado direito)
        m.carve(46, c0, 46, c0 + 4, '~')
        m.put(41, c0 + 2, 'S')
    m.carve(1, 29, 44, 33)                          # corredor de saída (sobe pela direita)
    m.carve(40, 29, 41, 30, '#')                    # nicho da faca no fundo do corredor (entrada de 3)
    m.put(43, 31, '!')
    m.carve(1, 1, 6, 33)                            # A: topo, para a esquerda
    m.carve(1, 1, 15, 6)                            # desce
    m.carve(10, 1, 15, 26)                          # B: para a direita
    m.carve(10, 21, 24, 26)                         # desce
    m.carve(19, 1, 24, 26)                          # C: para a esquerda até a chegada
    m.carve(19, 9, 24, 10, 'B'); m.carve(19, 1, 24, 8, 'F')
    m.carve(1, 14, 2, 15, 'B'); m.carve(5, 14, 6, 15, 'B')   # tijolinhos escuros no caminho
    m.carve(14, 13, 15, 14, 'B')
    return m.lines()

def serpente():
    """Baias empilhadas à esquerda (igual ao 3º vídeo), cada uma fechada pelo tijolo da sua cor;
    depois três curvas em U bem altas até a chegada embaixo, à direita."""
    m = M()
    for i, r0 in enumerate([20, 27, 34, 41]):
        m.carve(r0, 1, r0 + 4, 6)                   # baia
        m.carve(r0, 7, r0 + 4, 8, str(i + 1))       # porta da cor
        m.carve(r0, 1, r0 + 4, 1, '~')
        m.put(r0 + 2, 4, 'S')
    m.carve(1, 9, 45, 13)                           # sobe
    m.carve(1, 9, 5, 20)                            # vira
    m.carve(1, 16, 45, 20)                          # desce
    m.carve(41, 16, 45, 27)                         # vira embaixo
    m.carve(1, 23, 45, 27)                          # sobe
    m.carve(1, 23, 5, 34)                           # vira
    m.carve(1, 30, 45, 34)                          # desce até a chegada
    m.carve(38, 30, 40, 34, 'B'); m.carve(41, 30, 45, 34, 'F')
    m.carve(9, 1, 14, 6); m.carve(11, 7, 12, 8)     # nicho da faca (entrada de 2)
    m.put(11, 3, '!')
    m.carve(6, 14, 7, 15, 'B'); m.carve(39, 21, 40, 22, 'B'); m.carve(6, 28, 7, 29, 'B')  # pontas escuras
    return m.lines()

def arena8():
    """8 raias, cada uma tampada por uma coluna alta da sua cor; sobe pelos lados, volta pelo meio
    e termina em duas chegadas (esquerda e direita) no alto."""
    m = M()
    for i in range(8):
        c0 = 1 + 4 * i
        m.carve(31, c0, 45, c0 + 2)
        m.carve(31, c0, 34, c0 + 2, str(i + 1))     # tampa alta da cor
        m.carve(46, c0, 46, c0 + 2, '~')
        m.put(41, c0 + 1, 'S')
    m.carve(25, 1, 30, 33)                          # coletor
    m.carve(1, 1, 30, 5); m.carve(1, 29, 30, 33)    # sobe pelos dois lados
    m.carve(1, 1, 5, 33)                            # topo
    m.carve(6, 15, 17, 19)                          # desce pelo meio
    m.carve(13, 8, 17, 26)                          # abre para os lados
    m.carve(8, 8, 17, 12); m.carve(8, 22, 17, 26)   # sobe de novo
    m.carve(8, 8, 10, 12, 'F'); m.carve(11, 8, 12, 12, 'B')
    m.carve(8, 22, 10, 26, 'F'); m.carve(11, 22, 12, 26, 'B')
    m.carve(18, 15, 21, 19); m.carve(18, 15, 18, 15, '#'); m.carve(18, 19, 18, 19, '#')  # nicho da faca
    m.put(20, 17, '!')
    return m.lines()

def gaiola():
    """Cópia do vídeo de referência (square_derby): mapa de 16x21 unidades (1 unidade = 2x2 blocos).
    4 baias empilhadas à direita, presas em corrente: a barra de saída tem a cor do ÚLTIMO preso
    (baia de baixo) e a barra que solta o último tem a cor do PRIMEIRO (baia de cima); as do meio
    são da cor de quem está logo abaixo. A massa nasce no fundo (direita) de cada baia."""
    U = [  # 16 colunas x 21 linhas.  a=saída(cor 4)  y=barra 1-2 (cor 2)  g=barra 2-3 (cor 3)  b=barra 3-4 (cor 1)
        '.............###',  # 0
        '.............###',  # 1
        '..##########.###',  # 2  (lacuna de 1 na coluna 3 -> sala da faca; L da coluna 8)
        '..#.....#....###',  # 3
        '..#..k..#aaaa###',  # 4  k = faca
        '..#.....#......~',  # 5  baia 1
        '..#####.#......~',  # 6
        '..#.....#yyyy###',  # 7
        '..#.....#......~',  # 8  baia 2
        '..#..#..#......~',  # 9
        '..#..#..#gggg###',  # 10
        '..#..#..#......~',  # 11 baia 3
        '..#..#..#......~',  # 12
        '..#..#..#bbbb###',  # 13
        '..#..#..#......~',  # 14 baia 4
        '..#..#..#......~',  # 15
        '..#..#..########',  # 16
        '.....#..#FF.....',  # 17 chegada
        '.....#..#FF.....',  # 18
        '.....#..#####...',  # 19
        '.....#..........',  # 20
    ]
    # conserta a linha 2: pilar esquerdo (col 2), lacuna (col 3), braço do L (cols 4-8)
    U[2] = '..#.#####....###'
    m = M()
    R0, C0 = 3, 2  # deslocamento em blocos (centraliza 32x42 no grid 36x48)
    code = {'#': '#', '.': '.', 'a': '4', 'y': '2', 'g': '3', 'b': '1', 'F': 'F', 'k': '.', '~': '.'}
    for r, line in enumerate(U):
        for c, ch in enumerate(line):
            for dr in range(2):
                for dc in range(2):
                    m.g[R0 + 2 * r + dr][C0 + 2 * c + dc] = code[ch]
    for r, line in enumerate(U):
        for c, ch in enumerate(line):
            if ch == 'k': m.put(R0 + 2 * r + 1, C0 + 2 * c, '!')
            if ch == '~': m.put(R0 + 2 * r, C0 + 2 * c + 1, '~'); m.put(R0 + 2 * r + 1, C0 + 2 * c + 1, '~')
    # 1ª etapa da massa: nasce na parede direita de cada baia e anda 3 unidades (zona '%')
    for r in [5, 6, 8, 9, 11, 12, 14, 15]:
        for c in range(C0 + 26, C0 + 32):
            m.g[R0 + 2 * r][c] = m.g[R0 + 2 * r + 1][c] = '%'
        m.g[R0 + 2 * r][C0 + 31] = m.g[R0 + 2 * r + 1][C0 + 31] = '~'
    # 2ª etapa: sobe do fundo da sala (linha de baixo da baia 4)
    for c in range(C0 + 18, C0 + 26): m.put(R0 + 2 * 15 + 1, c, '=')
    for k, r in enumerate([5, 8, 11, 14]):       # largada no fundo (direita) de cada baia
        m.put(R0 + 2 * r + 1, C0 + 2 * 15 - 1, 'S')
    return m.lines()

def unitmap(U, code, R0=3, C0=2):
    """Converte um mapa em unidades (1 unidade = 2x2 blocos) para o grid de blocos."""
    m = M()
    for r, line in enumerate(U):
        for c, ch in enumerate(line):
            for dr in range(2):
                for dc in range(2):
                    m.g[R0 + 2 * r + dr][C0 + 2 * c + dc] = code.get(ch, ch)
    return m

def cofre():
    """Cópia do 5º vídeo de referência (square_derby): baias empilhadas à ESQUERDA, presas em corrente
    (saída = cor do último; a barra que solta o último = cor do primeiro). Sobe, vai pelo topo para a
    direita, desce o corredor da direita, volta por baixo e sobe até a chegada (no meio), protegida
    por tijolos escuros. Barra escura no meio = atalho entre os dois corredores (a massa não entra)."""
    U = [  # 16 x 21.  g=saída (cor 4)  r=barra 1-2 (cor 2)  b=barra 2-3 (cor 3)  y=barra 3-4 (cor 1)  k=tijolo escuro
        '###.............',  # 0
        '###.............',  # 1
        '###....#######..',  # 2
        '###....#FF####..',  # 3  chegada
        '###gggg#FF####..',  # 4
        '~......#kk####..',  # 5  baia 1 (+ tijolos escuros da chegada)
        '~......#kk####..',  # 6
        '###rrrr#..####..',  # 7
        '~......#..####..',  # 8  baia 2
        '~......#..kkkk..',  # 9  barra escura (atalho)
        '###bbbb#..kkkk..',  # 10
        '~......#..####..',  # 11 baia 3
        '~......#..####..',  # 12
        '###yyyy#..####..',  # 13
        '~......#..####..',  # 14 baia 4
        '~......#..####..',  # 15
        '########..####..',  # 16
        '########..####..',  # 17
        '########..####..',  # 18
        '########........',  # 19
        '########........',  # 20
    ]
    R0, C0 = 3, 2
    m = unitmap(U, {'g': '4', 'r': '2', 'b': '3', 'y': '1', 'k': 'B', '~': '.'}, R0, C0)
    for r, line in enumerate(U):            # fonte da massa: borda esquerda de cada baia
        if line[0] == '~': m.put(R0 + 2 * r, C0, '~'); m.put(R0 + 2 * r + 1, C0, '~')
    for r in [5, 8, 11, 14]:                # largada encostada na esquerda de cada baia
        m.put(R0 + 2 * r + 1, C0 + 1, 'S')
    return m.lines()

if __name__ == '__main__':
    for name, fn in [('gaiola', gaiola), ('cofre', cofre), ('derby', derby), ('serpente', serpente), ('arena8', arena8)]:
        print(f'// {name}')
        print('    map: [\n' + ''.join(f"      '{l}',\n" for l in fn()) + '    ],')
