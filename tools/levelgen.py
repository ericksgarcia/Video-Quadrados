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

def ponte():
    """Cópia do 6º vídeo de referência (square_derby): duas metades simétricas. Em cada sala de baixo
    uma dupla (vermelho+amarelo / verde+azul); a coluna acima tem tijolos que ALTERNAM as cores da
    dupla (um precisa abrir para o outro). Em cima, a chegada cercada por um mosaico das cores da
    dupla. Barra em T com pistões nas pontas. A massa sobe devagar pelas duas salas de baixo."""
    U = [  # 14 x 18.  r=vermelho(1) y=amarelo(2) g=verde(3) b=azul(4)
        '....yrFFgb....',  # 0
        '....ryFFbg....',  # 1
        '....yrFFgb....',  # 2
        '..##########..',  # 3  barra em T (pistões nas pontas)
        '......##......',  # 4
        '......##......',  # 5
        '......##......',  # 6
        '##yy######bb##',  # 7
        '##..######..##',  # 8
        '##rr######gg##',  # 9
        '##..######..##',  # 10
        '##yy######bb##',  # 11
        '##..######..##',  # 12
        '##rr######gg##',  # 13
        '......##......',  # 14
        '......##......',  # 15
        '......##......',  # 16
        '......##......',  # 17
    ]
    R0, C0 = 6, 4
    m = unitmap(U, {'r': '1', 'y': '2', 'g': '3', 'b': '4'}, R0, C0)
    m.g = [row[:] for row in m.g]
    for c in (12, 14, 21, 23):              # largada: vermelho, amarelo | verde, azul (longe das paredes)
        m.put(R0 + 2 * 17, c, 'S')
    return m.lines()

def escada():
    """Cópia do 7º vídeo de referência (square_derby): mapa de 32x42 BLOCOS. Baias empilhadas à
    esquerda (4 quadrados presos em corrente: a barra de baixo da baia k é da cor de quem está nela;
    a saída, em cima, é da cor do último; a que solta o último é da cor do primeiro). Sobe pelo eixo,
    corre pelo topo para a direita, desce pelo corredor e depois por uma ESCADA em zigue-zague com
    tijolos escuros, até a chegada no canto inferior esquerdo (atrás de 4 tijolos escuros)."""
    g = [['#'] * 32 for _ in range(42)]
    def carve(r0, c0, r1, c1, ch='.'):
        for r in range(r0, r1 + 1):
            for c in range(c0, c1 + 1): g[r][c] = ch
    carve(0, 6, 3, 31)                      # corredor do topo
    carve(4, 6, 7, 13)                      # eixo esquerdo (acima da barra de saída)
    carve(4, 26, 9, 31)                     # eixo direito
    carve(8, 26, 9, 27, 'B')                # tijolo escuro no pé do eixo direito
    carve(8, 6, 9, 13, '4')                 # barra de saída (cor do 4º)
    for r0 in (10, 16, 22, 28): carve(r0, 0, r0 + 3, 13)   # as 4 baias
    carve(14, 6, 15, 13, '2'); carve(20, 6, 21, 13, '3'); carve(26, 6, 27, 13, '1')   # barras
    # escada em zigue-zague (par de tijolos escuros por degrau)
    carve(10, 24, 11, 27); carve(10, 28, 11, 29, 'B')
    carve(12, 24, 13, 29)
    carve(14, 24, 15, 25, 'B'); carve(14, 26, 15, 29)
    carve(16, 22, 17, 25); carve(16, 26, 17, 27, 'B')
    carve(18, 22, 19, 27)
    carve(20, 22, 21, 23, 'B'); carve(20, 24, 21, 27)
    carve(22, 20, 23, 23); carve(22, 24, 23, 25, 'B')
    carve(24, 20, 25, 25)
    carve(26, 20, 27, 21, 'B'); carve(26, 22, 27, 25)
    carve(28, 18, 29, 21); carve(28, 22, 29, 23, 'B')
    carve(30, 18, 31, 23)
    carve(32, 18, 33, 19, 'B'); carve(32, 20, 33, 23)
    carve(34, 16, 35, 19); carve(34, 20, 35, 21, 'B')
    carve(36, 16, 37, 17, 'B'); carve(36, 18, 37, 21)
    carve(38, 8, 39, 17); carve(38, 18, 39, 19, 'B'); carve(38, 20, 39, 21)
    carve(40, 8, 41, 19)
    carve(38, 4, 41, 7, 'B')                # 4 tijolos escuros na frente da chegada
    carve(38, 0, 41, 3, 'F')                # chegada
    for r in (12, 18, 24, 30): g[r][2] = 'S'  # largada: baia 1..4, perto da borda esquerda
    m = M()
    for r in range(42):
        for c in range(32): m.g[3 + r][2 + c] = g[r][c]
    return m.lines()

def pocos():
    """Cópia do 8º vídeo de referência (square_derby): mapa 14x18 unidades. Os 4 quadrados começam
    juntos na sala de baixo; 4 poços estreitos (1 unidade) sobem até uma sala grande, cada poço fechado
    em cima por UM tijolo da cor de um quadrado (só ele quebra). A chegada fica no canto de cima à
    esquerda, atrás de 4 tijolos escuros, num corredor acima de uma lingueta de parede (com um pistão)."""
    U = [  # 14 x 18.  F=chegada  B=tijolo escuro  1..4=tijolo de cor (dono = quadrado 1..4)
        'FFBB..........',  # 0
        'FFBB..........',  # 1
        '###########...',  # 2  lingueta (abertura de 3 unidades à direita)
        '..............',  # 3  sala grande
        '..............',  # 4
        '..............',  # 5
        '##1##2##3##4##',  # 6  tijolo no alto de cada poço
        '##.##.##.##.##',  # 7
        '##.##.##.##.##',  # 8
        '##.##.##.##.##',  # 9
        '##.##.##.##.##',  # 10
        '##.##.##.##.##',  # 11
        '##.##.##.##.##',  # 12
        '##.##.##.##.##',  # 13
        '..............',  # 14 sala de baixo
        '..............',  # 15
        '..............',  # 16
        '..............',  # 17
    ]
    R0, C0 = 6, 4
    m = unitmap(U, {}, R0, C0)
    for c in (11, 13, 15, 17):             # largada: 4 quadrados lado a lado no fundo da sala de baixo
        m.put(R0 + 34, C0 + c, 'S')
    return m.lines()

def colunas():
    """Fase ORIGINAL (criada a partir do padrão dos prints de referência): 5 colunas na base, 1 quadrado em
    cada. A parede entre colunas tem uma janela de 4 tijolos de cor (só o dono quebra); as cores abrem
    a janela de OUTRA coluna: o 2º e o 4º abrem as primeiras (ao mesmo tempo), depois o 1º e o 5º abrem
    as do meio e por fim o 3º abre a saída. Janelas (esq.→dir.): cores 2,1,5,4,3. Depois: corredor da direita, corredor de baixo (pistão e
    nicho com faca), subida pela esquerda e corredor de cima (pistão) até a chegada, atrás de 4 tijolos
    escuros. Um atalho de 4 tijolos escuros liga o corredor de baixo ao de cima."""
    U = [  # 17 x 20 unidades.  1..5 = tijolo do quadrado 1..5   B = tijolo escuro   F = chegada
        '###..........BBFF',  # 0  corredor de cima (pistão em cima da parede)
        '###..........BBFF',  # 1
        '###..######B#####',  # 2  parede; sobe pela esquerda (cols 3-4); atalho escuro (col 11)
        '###..######B#####',  # 3
        '###..######B#####',  # 4
        '###..######B#####',  # 5
        '###..............',  # 6  corredor de baixo (pistão em cima da parede)
        '###..............',  # 7
        '######.########..',  # 8  entrada do nicho da faca (col 6, 2 unidades de comprimento); corredor da direita
        '######.########..',  # 9
        '#####...#######..',  # 10 nicho (1x3)
        '###############..',  # 11
        '..2..1..5..4..3..',  # 12 janelas (6 tijolos de altura): cols 2,5,8,11 e saída (col 14)
        '..2..1..5..4..3..',  # 13
        '..2..1..5..4..3..',  # 14
        '..2..1..5..4..3..',  # 15
        '..2..1..5..4..3..',  # 16
        '..2..1..5..4..3..',  # 17
        '..#..#..#..#..#..',  # 18
        '..#..#..#..#..#..',  # 19
    ]
    R0, C0 = 4, 1
    m = unitmap(U, {}, R0, C0)
    m.put(R0 + 21, C0 + 12, '!')              # faca no fundo do nicho
    for c in (2, 8, 14, 20, 26):               # largada: 1 quadrado no fundo de cada coluna
        m.put(R0 + 37, C0 + c, 'S')
    return m.lines()

def pente():
    """Cópia do vídeo 09 (07c1f66c): mapa de 19x22 BLOCOS (1 célula = 1 bloco = 28px; baias de 2 blocos, paredes e tijolos de 1).
    4 baias no topo (verde, vermelho, ciano, amarelo da esq. p/ dir.) presas em corrente: tijolo vermelho (entre baias 1-2),
    ciano (2-3), verde (3-4) e, por fim, o amarelo (parede da esquerda). Depois: serpentina em corredores de 3 blocos
    (pistão no 1º corredor), 2 tijolos escuros no meio e 2 antes da chegada (embaixo à esquerda)."""
    U = [
        '####..#..#..#..####',  # 0  baias (largada em S)
        '####..#..#..#..##..',  # 1  corredor da direita (cols 17-18) desce até a linha 10
        '####..#..#..#..##..',  # 2
        '...4..2..3..1..##..',  # 3  tijolos de cor (4 linhas): amarelo(4) vermelho(2) ciano(3) verde(1)
        '...4..2..3..1..##..',  # 4
        '...4..2..3..1..##..',  # 5
        '...4..2..3..1..##..',  # 6
        '...##############..',  # 7  piso das baias
        '...................',  # 8  corredor 1 (pistão na col 13)
        '...................',  # 9
        '...................',  # 10
        '################...',  # 11 língua de parede
        '...................',  # 12 corredor 2 (volta p/ a esquerda)
        '...................',  # 13
        '...................',  # 14
        '...################',  # 15
        '...............B...',  # 16 corredor 3 (vai p/ a direita) + tijolo escuro na col 15
        '...............B...',  # 17
        '...............B...',  # 18
        '################...',  # 19
        'FFBB...........B...',  # 20 corredor de chegada (volta p/ a esquerda)
        'FFBB...........B...',  # 21
    ]
    R0, C0 = 13, 8
    m = M()
    for r, row in enumerate(U):
        for c, ch in enumerate(row): m.put(R0 + r, C0 + c, ch)
    for c in (4, 7, 10, 13): m.put(R0, C0 + c, 'S')   # largada: 1 quadrado por baia (verde, vermelho, ciano, amarelo)
    return m.lines()

def pilares():
    """Cópia do vídeo 10 (08babe70): mapa 14x18 unidades. 4 baias embaixo (vermelho, verde, ciano, amarelo da esq. p/ dir.),
    separadas por tijolos de cor de 4 unidades: ciano (col 2), verde (col 5), vermelho (col 8) e amarelo (col 11, a saída da
    direita). Verde abre p/ ciano, ciano abre p/ vermelho; o amarelo já nasce junto do seu tijolo. Depois: corredor da direita
    sobe, sala de cima, volta por baixo (linhas 6-8), sobe de novo e desce pela sala da esquerda (faca) até a chegada atrás de
    3 tijolos escuros. 2 pistões horizontais (linha 2 e linha 5)."""
    U = [
        '.......#......',  # 0  faixa de cima
        '.......#......',  # 1  (faca na sala da esquerda)
        '...#...#...#..',  # 2  piston A nasce na col 8 (cresce p/ a direita)
        '...#...#...#..',  # 3
        '...#...#...#..',  # 4
        '...#...#...#..',  # 5  piston B nasce na col 7 (cresce p/ a esquerda)
        'BBB#.......#..',  # 6  tijolos escuros da chegada; passagem inferior (cols 4-10)
        'FFF#.......#..',  # 7  chegada
        'FFF#.......#..',  # 8
        '############..',  # 9  parede entre a serpentina e as baias
        '..3..2..1..4..',  # 10 tijolos de cor (4 linhas): ciano, verde, vermelho, amarelo
        '..3..2..1..4..',  # 11
        '..3..2..1..4..',  # 12
        '..3..2..1..4..',  # 13
        '..#..#..#..#.#',  # 14 baias (a massa nasce no fundo delas)
        '..#..#..#..#..',  # 15
        '..#..#..#..#..',  # 16
        '..#..#..#..###',  # 17
    ]
    R0, C0 = 6, 4
    m = unitmap(U, {}, R0, C0)
    for c in (1, 4, 7, 10): m.put(R0 + 34, C0 + 2 * c, 'S')   # largada: 1 quadrado no fundo de cada baia
    m.put(R0 + 3, C0 + 3, '!')                                # faca na sala de cima da esquerda
    return m.lines()

def meandro():
    """Cópia do vídeo 11 (099c992e): mapa 14x18 unidades. 4 baias embaixo (ciano, vermelho, amarelo, verde da esq. p/ dir.)
    separadas por tijolos de cor de 4 unidades: vermelho (1-2), ciano (2-3), verde (3-4) e amarelo (saída pela direita).
    Vermelho abre 1-2, verde abre 3-4, ciano abre o meio e o amarelo sai. Depois: corredor da direita sobe -> 2 tijolos escuros ->
    desce pela coluna 9-10 -> passagem (pistão que desce) -> sobe pela coluna 6-7 -> faixa de cima (pistão que sobe) -> desce
    pela coluna 3-4 -> 2 tijolos escuros -> coluna da esquerda sobe -> 4 tijolos escuros -> chegada no canto de cima."""
    U = [
        'FF#.....#..B..',  # 0  chegada (esq.); faixa de cima (cols 3-7, pistão P1 sobe da col 5); escuros na col 11
        'FF#.....#..B..',  # 1
        'BB#..#..#..#..',  # 2  escuros da chegada (2x2)
        'BB#..#..#..#..',  # 3
        '..#..#..#..#..',  # 4
        '..#..#..#..#..',  # 5
        '..#..#..#..#..',  # 6
        '..#..#..#..#..',  # 7
        '..B..#.....#..',  # 8  escuros na col 2; passagem inferior (col 8, pistão P2 desce da parede)
        '..B..#.....#..',  # 9
        '############..',  # 10 parede entre a serpentina e as baias
        '..2..1..4..3..',  # 11 tijolos de cor (4 linhas): vermelho, ciano, verde, amarelo
        '..2..1..4..3..',  # 12
        '..2..1..4..3..',  # 13
        '..2..1..4..3..',  # 14
        '..#..#..#..###',  # 15 baias (a massa nasce no fundo delas)
        '..#..#..#..###',  # 16
        '..#..#..#..###',  # 17
    ]
    R0, C0 = 6, 4
    m = unitmap(U, {}, R0, C0)
    for c in (1, 4, 7, 10): m.put(R0 + 34, C0 + 2 * c, 'S')   # largada: 1 quadrado no fundo de cada baia
    return m.lines()

if __name__ == '__main__':
    for name, fn in [('gaiola', gaiola), ('cofre', cofre), ('ponte', ponte), ('escada', escada), ('pocos', pocos), ('colunas', colunas), ('pente', pente), ('pilares', pilares), ('meandro', meandro), ('derby', derby), ('serpente', serpente), ('arena8', arena8)]:
        print(f'// {name}')
        print('    map: [\n' + ''.join(f"      '{l}',\n" for l in fn()) + '    ],')
