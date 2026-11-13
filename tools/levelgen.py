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

def portais():
    """Cópia do vídeo 12 (0aed7916): mapa 16x20 unidades. 4 baias à esquerda (ciano, verde, amarelo, vermelho de cima p/ baixo),
    cada uma com 3 unidades de 'fundo' + 4 unidades de barras horizontais em corrente: barra ciano (entre baias 1-2), amarelo (2-3),
    vermelho (3-4) e verde (teto da baia 1 = saída p/ a sala de cima). A sala de cima sai por 2 tijolos escuros p/ o corredor de cima
    da serpentina (desce em zigue-zague até a chegada embaixo à esquerda, atrás de 2 tijolos escuros). Portal de mão única
    no canto de cima à direita -> corredor de baixo. Faca no meio da serpentina."""
    U = [
        '###....B........',  # 0  sala de cima (cols 3-6); corredor de cima (portal P no canto direito)
        '###....B........',  # 1
        '###....######...',  # 2  parede; vão à direita (cols 13-15)
        '###....#........',  # 3
        '###2222#........',  # 4  barra verde (saída da baia 1)
        '.......#........',  # 5  baia 1
        '.......#...#####',  # 6  (parede da serpentina: vão à esquerda cols 8-10)
        '###1111#........',  # 7  barra ciano
        '.......#........',  # 8  baia 2
        '.......#........',  # 9
        '###3333######...',  # 10 barra amarela; vão à direita
        '.......#........',  # 11 baia 3
        '.......#........',  # 12
        '###4444#........',  # 13 barra vermelha
        '.......#...#####',  # 14 baia 4; vão à esquerda
        '.......#........',  # 15
        '########........',  # 16 corredor de baixo (portal p no canto esquerdo)
        '#############...',  # 17 vão à direita
        '########FB......',  # 18 chegada (col 8) atrás de 2 tijolos escuros (col 9)
        '########FB......',  # 19
    ]
    R0, C0 = 4, 2
    m = unitmap(U, {}, R0, C0)
    for r in (5, 8, 11, 14): m.put(R0 + 2 * r + 1, C0 + 2, 'S')   # largada: 1 quadrado por baia (ciano, verde, amarelo, vermelho)
    m.put(R0 + 0, C0 + 30, 'P')                                 # portal de entrada (canto de cima à direita)
    m.put(R0 + 32, C0 + 16, 'p')                                # portal de saída (corredor de baixo, à esquerda)
    m.put(R0 + 24, C0 + 18, '!')                                # faca no corredor do meio
    return m.lines()

def grade():
    """Cópia do vídeo 13 (0c2d8f83): mapa 16x21 unidades (variação da Gaiola). 4 baias horizontais à direita (verde, amarelo,
    vermelho, ciano de cima p/ baixo) com barras de 4 unidades em corrente: verde (1-2), amarelo (2-3), vermelho (3-4) e
    ciano em cima (saída, do último = mais longe). Saída -> faixa de cima p/ a esquerda -> coluna da esquerda desce -> embaixo
    -> sobe cols 3-4 (pistão horizontal na linha 16) -> atravessa -> desce cols 6-7 -> corredor de baixo -> sobe à direita ->
    tijolo escuro -> chegada (cols 9-10, linhas 17-18). Ilha no topo do "H" (sala sem saída). Sem faca."""
    U = [
        '.............###',  # 0  faixa de cima
        '.............###',  # 1
        '..#.###.#....###',  # 2  ilha (cols 4-6) no topo do H
        '..#.....#....###',  # 3
        '..#.....#4444###',  # 4  barra ciano (saída)
        '..#.....#.......',  # 5  baia 1 (verde)
        '..#######.......',  # 6  travessa do H
        '..#.....#1111###',  # 7  barra verde
        '..#.....#.......',  # 8  baia 2 (amarelo)
        '..#..#..#.......',  # 9
        '..#..#..#2222###',  # 10 barra amarela
        '..#..#..#.......',  # 11 baia 3 (vermelho)
        '..#..#..#.......',  # 12
        '..#..#..#3333###',  # 13 barra vermelha
        '..#..#..#.......',  # 14 baia 4 (ciano)
        '..#..#..#.......',  # 15
        '..#..#..########',  # 16 (pistão na linha 16, cols 3-4)
        '.....#..#FFB....',  # 17 chegada (cols 9-10) atrás de 1 tijolo escuro (col 11)
        '.....#..#FFB....',  # 18
        '.....#..#####...',  # 19
        '.....#..........',  # 20 corredor de baixo
    ]
    R0, C0 = 3, 2
    m = unitmap(U, {}, R0, C0)
    for r in (5, 8, 11, 14): m.put(R0 + 2 * r + 1, C0 + 28, 'S')   # largada: 1 quadrado por baia, encostado na borda direita
    return m.lines()

def trilha():
    """Cópia do vídeo 14 (0e02eeee): mapa 14x18 unidades. 4 baias embaixo (verde, azul, amarelo, vermelho da esq. p/ dir.)
    separadas por tijolos de cor de 3 unidades: azul (1-2), verde (2-3), vermelho (3-4), amarelo (saída pela direita).
    Saída -> corredor da direita sobe -> corredor de 1 unidade (linha 10) p/ a esquerda -> sala da esquerda sobe -> faixa de
    cima -> desce cols 4-5 -> sobe a coluna 7 (1 unidade) -> desce cols 9-10 -> sobe cols 12-13 -> 3 tijolos escuros ->
    chegada no canto de cima à direita. Pistões: P1 sobe do topo do pilar da col 3; P2 desce do pé da parede da col 11."""
    U = [
        '......#....#FF',  # 0  chegada (cols 12-13)
        '......#.#..#FF',  # 1
        '...#..#.#..#BB',  # 2  P1 no topo do pilar da col 3; 3 tijolos escuros (2x... 2 colunas) antes da chegada
        '...#..#.#..#BB',  # 3
        '...#..#.#..#BB',  # 4
        '...#..#.#..#..',  # 5
        '...#..#.#.....',  # 6  P2 desce do pé da parede da col 11 (linhas 6-8)
        '...#....#.....',  # 7
        '...#....#.....',  # 8
        '...###########',  # 9
        '..............',  # 10 corredor de 1 unidade
        '############..',  # 11
        '..2..1..4..3..',  # 12 tijolos de cor (3 linhas): azul, verde, vermelho, amarelo
        '..2..1..4..3..',  # 13
        '..2..1..4..3..',  # 14
        '..#..#..#..###',  # 15 baias (a massa nasce no fundo)
        '..#..#..#..###',  # 16
        '..#..#..#..###',  # 17
    ]
    R0, C0 = 6, 4
    m = unitmap(U, {}, R0, C0)
    for c in (1, 4, 7, 10): m.put(R0 + 32, C0 + 2 * c, 'S')   # largada: 1 quadrado por baia
    return m.lines()

def corredor():
    """Cópia do vídeo 15 (1528db85): mapa 14x18 unidades (parente da Trilha). 4 baias embaixo (ciano, verde, amarelo,
    vermelho da esq. p/ dir.) com tijolos de cor de 3 unidades: ciano (1-2), verde (2-3), amarelo (3-4), vermelho (saída à
    direita). Saída -> corredor da direita sobe -> corredor de 2 unidades (linhas 10-11) p/ a esquerda -> sala da esquerda
    sobe -> faixa de cima -> desce cols 4-5 -> sobe col 7 -> desce cols 9-10 -> sobe cols 12-13 -> 2 tijolos escuros ->
    chegada no canto de cima à direita. 2 pistões horizontais na linha 5 (nascem nos pilares das cols 3 e 8).
    (O quadrado lilás parado no canto de cima à esquerda do vídeo NÃO foi copiado: o motor não tem esse elemento.)"""
    U = [
        '......#....#FF',  # 0  chegada (cols 12-13)
        '......#.#..#FF',  # 1
        '...#..#.#..#BB',  # 2  2 linhas de tijolos escuros
        '...#..#.#..#BB',  # 3
        '...#..#.#..#..',  # 4
        '...#..#.#..#..',  # 5  pistões A (cols 4-5) e B (cols 9-10)
        '...#..#.#.....',  # 6
        '...#....#.....',  # 7
        '...#....#.....',  # 8
        '...###########',  # 9
        '..............',  # 10 corredor de 2 unidades
        '..............',  # 11
        '############..',  # 12
        '..1..2..3..4..',  # 13 tijolos de cor (3 linhas): ciano, verde, amarelo, vermelho (saída)
        '..1..2..3..4..',  # 14
        '..1..2..3..4..',  # 15
        '..#..#..#..###',  # 16 baias (a massa nasce no fundo)
        '..#..#..#..###',  # 17
    ]
    R0, C0 = 6, 4
    m = unitmap(U, {}, R0, C0)
    for c in (1, 4, 7, 10): m.put(R0 + 32, C0 + 2 * c, 'S')
    return m.lines()

def salao():
    """Cópia do vídeo 16 (21ea1037): mapa 14x18 unidades. 4 baias embaixo (vermelho, verde, ciano, amarelo da esq. p/ dir.)
    com tijolos de cor de 3 unidades: verde (1-2), vermelho (2-3), amarelo (3-4), ciano (saída à direita). Saída -> corredor
    da direita sobe -> salão (linhas 8-10, faca no meio) p/ a esquerda -> sobe pela esquerda -> corredor das linhas 4-6 p/ a
    direita (pistão sobe da parede na col 4) -> sobe à direita -> faixa de cima p/ a esquerda -> 6 tijolos escuros -> chegada
    no canto de cima à esquerda."""
    U = [
        'FFBB..........',  # 0  chegada (cols 0-1) atrás de tijolos escuros (cols 2-3)
        'FFBB..........',  # 1
        'FFBB..........',  # 2
        '##########....',  # 3
        '..............',  # 4  corredor (pistão na col 4, sobe da parede da linha 7)
        '..............',  # 5
        '..............',  # 6
        '....##########',  # 7
        '..............',  # 8  salão (faca)
        '..............',  # 9
        '..............',  # 10
        '############..',  # 11
        '..2..1..4..3..',  # 12 tijolos de cor (3 linhas): verde, vermelho, amarelo, ciano (saída)
        '..2..1..4..3..',  # 13
        '..2..1..4..3..',  # 14
        '..#..#..#..###',  # 15 baias (a massa nasce no fundo)
        '..#..#..#..###',  # 16
        '..#..#..#..###',  # 17
    ]
    R0, C0 = 6, 4
    m = unitmap(U, {}, R0, C0)
    for c in (1, 4, 7, 10): m.put(R0 + 32, C0 + 2 * c, 'S')
    m.put(R0 + 19, C0 + 13, '!')   # faca no meio do salão (linha 9, col 6)
    return m.lines()

def teto():
    """Cópia do vídeo 17 (21fe3eb7): mapa 15x18 unidades. 4 baias penduradas no TOPO (vermelho, ciano, amarelo, verde da esq.
    p/ dir.), tijolos de cor de 3 unidades à direita de cada baia: vermelho (1-2), ciano (2-3), amarelo (3-4), verde (saída p/ o
    corredor da direita). Saída -> desce a direita -> corredor largo (linhas 7-10) p/ a esquerda -> desce a esquerda -> corredor
    de baixo p/ a direita -> sobe à direita -> 1 tijolo escuro -> chegada (col 10, linhas 12-13). Sala em U sem saída com ilha
    no meio. Faca no canto de baixo à esquerda. Sem pistões."""
    U = [
        '#..#..#..#..###',  # 0  baias (a massa desce do topo delas)
        '#..#..#..#..###',  # 1
        '#..#..#..#..###',  # 2
        '#..1..2..3..4..',  # 3  tijolos de cor (3 linhas): vermelho, ciano, amarelo, verde (saída)
        '#..1..2..3..4..',  # 4
        '#..1..2..3..4..',  # 5
        '#############..',  # 6
        '...............',  # 7  corredor largo
        '...............',  # 8
        '...............',  # 9
        '...............',  # 10
        '...############',  # 11
        '...#.....#FB...',  # 12 sala em U (cols 4-8) | chegada (col 10) atrás de 1 tijolo escuro (col 11)
        '...#.....#FB...',  # 13
        '...#.###.####..',  # 14 ilha (cols 5-7)
        '...............',  # 15 corredor de baixo
        '...............',  # 16 (faca)
        '...............',  # 17
    ]
    R0, C0 = 6, 3
    m = unitmap(U, {}, R0, C0)
    for c in (2, 5, 8, 11): m.put(R0 + 2, C0 + 2 * c, 'S')   # largada: no alto de cada baia, junto da parede da direita
    m.put(R0 + 33, C0 + 3, '!')                              # faca (linha 16, col 1)
    return m.lines()

def xadrez():
    """Cópia do vídeo 18 (243a6531): mapa de 19x22 BLOCOS (1 célula = 1 bloco, como a Pente). 4 baias no topo (ciano, verde,
    vermelho, amarelo da esq. p/ dir.) com tijolos de cor de 1x4 à direita de cada baia: verde (1-2), ciano (2-3), amarelo (3-4),
    vermelho (saída p/ a direita). Saída -> corredor de 2 blocos com tijolos escuros em XADREZ p/ a esquerda -> desce a esquerda
    -> corredor do meio (colunas de tijolos escuros nas duas pontas) p/ a direita -> desce a direita -> corredor de baixo (faca;
    tijolos escuros nas pontas) p/ a esquerda -> desce a esquerda -> corredor final -> 6 tijolos escuros -> chegada (col 17).
    (O bloco verde-limão à direita da chegada no vídeo virou parede: o motor não tem esse elemento.)"""
    U = [
        '####..#..#..#..####',  # 0  baias (a massa desce do topo)
        '####..#..#..#..####',  # 1
        '####..#..#..#..####',  # 2
        '####..2..1..4..3...',  # 3  tijolos de cor (4 linhas): verde, ciano, amarelo, vermelho (saída)
        '####..2..1..4..3...',  # 4
        '####..2..1..4..3...',  # 5
        '####..2..1..4..3...',  # 6
        '################...',  # 7
        '....B...B...B......',  # 8  corredor com tijolos escuros em xadrez
        '......B...B...B....',  # 9
        '...################',  # 10
        '...B...........B...',  # 11 corredor do meio (colunas de tijolos escuros nas pontas)
        '...B...........B...',  # 12
        '...B...........B...',  # 13
        '################...',  # 14
        '...B...........B...',  # 15 corredor de baixo (faca no meio)
        '...B...........B...',  # 16
        '...B...........B...',  # 17
        '...################',  # 18
        '...............BBF#',  # 19 corredor final -> 2x3 tijolos escuros -> chegada (col 17); bloco verde do vídeo = parede
        '...............BBF#',  # 20
        '...............BBF#',  # 21
    ]
    R0, C0 = 13, 8
    m = M()
    for r, row in enumerate(U):
        for c, ch in enumerate(row): m.put(R0 + r, C0 + c, ch)
    for c in (5, 8, 11, 14): m.put(R0 + 1, C0 + c, 'S')   # largada: 1 quadrado por baia
    m.put(R0 + 16, C0 + 8, '!')                           # faca
    return m.lines()

def portoes():
    """Cópia do vídeo 19 (263d8cf4): mapa 14x18 unidades. 4 baias embaixo (vermelho, verde, azul, amarelo da esq. p/ dir.) com
    tijolos de cor de 4 unidades: verde (1-2), azul (2-3), amarelo (3-4) e vermelho (saída à direita: já é do quadrado mais longe).
    Corredores de 3 unidades com TIJOLOS DE COR SOLTOS (1 unidade, só o dono quebra; não fecham a passagem). Saída -> corredor da
    direita sobe -> corredor do meio (linhas 6-8) p/ a esquerda -> sobe a esquerda -> corredor de cima (linhas 0-2) p/ a direita ->
    desce ao lado do bloco lilás -> corredor da chegada (linha 4) p/ a esquerda -> 2 tijolos escuros -> chegada.
    (O quadrado lilás do vídeo virou parede: o motor não tem esse elemento; a passagem ao lado dele continua livre.)"""
    U = [
        '.....1.....4..',  # 0  corredor de cima (3 linhas) com tijolos soltos: vermelho, amarelo
        '..............',  # 1
        '..3.....2.....',  # 2  azul, verde
        '..###########.',  # 3  col 12 = bloco lilás do vídeo (parede); col 13 = passagem
        '..#FFBB.......',  # 4  corredor da chegada: chegada (cols 3-4) atrás de 2 tijolos escuros
        '..############',  # 5
        '..1.....3.....',  # 6  corredor do meio (3 linhas): vermelho, azul
        '..............',  # 7
        '.....4.....2..',  # 8  amarelo, verde
        '############..',  # 9
        '..2..3..4..1..',  # 10 tijolos de cor (4 linhas): verde, azul, amarelo, vermelho (saída)
        '..2..3..4..1..',  # 11
        '..2..3..4..1..',  # 12
        '..2..3..4..1..',  # 13
        '..#..#..#..###',  # 14 baias (a massa nasce no fundo)
        '..#..#..#..###',  # 15
        '..#..#..#..###',  # 16
        '..#..#..#..###',  # 17
    ]
    R0, C0 = 6, 4
    m = unitmap(U, {}, R0, C0)
    for c in (1, 4, 7, 10): m.put(R0 + 32, C0 + 2 * c, 'S')
    return m.lines()

def bolsao():
    """Cópia do vídeo 20 (2ac9f100): mapa 14x18 unidades. 4 baias embaixo (vermelho, amarelo, verde, azul da esq. p/ dir.) com
    tijolos de cor de 4 unidades: vermelho (1-2), verde (2-3), azul (3-4), amarelo (saída à direita). Saída -> corredor da direita
    sobe (embaixo dele, um BOLSÃO sem saída) -> 2 tijolos escuros -> desce a sala da direita -> atravessa por baixo -> sobe a sala
    do meio -> 2 tijolos escuros -> sala da faca -> 3 tijolos escuros -> chegada (canto esquerdo). 2 pistões horizontais na linha 3,
    um de cada parede do U (6s, 3 unid.). (O quadrado lilás no fundo do bolsão virou parede: o motor não tem esse elemento.)"""
    U = [
        '...B...#...B..',  # 0  sala da faca (cols 0-2) | escuros (col 3) | sala do meio | escuros (col 11) | corredor da direita
        '...B...#...B..',  # 1
        '...#...#...#..',  # 2
        '...#...#...#..',  # 3  pistões A (nasce na col 3, cresce p/ a direita) e B (nasce na col 11, cresce p/ a esquerda)
        '...#...#...#..',  # 4
        '...#...#...#..',  # 5
        'BBB#.......#..',  # 6  3 tijolos escuros antes da chegada; travessa do U (linhas 6-8)
        'FFF#.......#..',  # 7  chegada
        'FFF#.......#..',  # 8
        '############..',  # 9
        '..1..3..4..2..',  # 10 tijolos de cor (4 linhas): vermelho, verde, azul, amarelo (saída)
        '..1..3..4..2..',  # 11
        '..1..3..4..2..',  # 12
        '..1..3..4..2..',  # 13
        '..#..#..#..#.#',  # 14 baias | bolsão (cols 12-13) com dente
        '..#..#..#..#..',  # 15
        '..#..#..#..#..',  # 16
        '..#..#..#..##.',  # 17 (col 12 = quadrado lilás do vídeo -> parede)
    ]
    R0, C0 = 6, 4
    m = unitmap(U, {}, R0, C0)
    for c in (1, 4, 7, 10): m.put(R0 + 32, C0 + 2 * c, 'S')
    m.put(R0 + 7, C0 + 3, '!')   # faca na sala de cima à esquerda
    return m.lines()

def escadaria():
    """Cópia do vídeo 21 (2c710cfe): mapa 16x20 unidades (família da Portais). 4 baias horizontais à esquerda (verde, ciano,
    vermelho, amarelo de cima p/ baixo) com barras de 4 unidades em corrente: verde (1-2), ciano (2-3), vermelho (3-4) e amarela
    em cima (saída, do último = mais longe). Saída -> sala de cima -> faixa do topo p/ a direita (bolsinho sem saída no canto de
    cima à esquerda) -> serpentina descendo, alternando sala da direita e sala do meio, ligadas por 7 colunas de tijolos escuros
    -> chegada embaixo no meio. Sem pistões, sem faca."""
    U = [
        '............B...',  # 0  faixa do topo (escuros na col 12)
        '............B...',  # 1
        '..#....######...',  # 2  bolsinho (cols 0-1) | sala da saída (cols 3-6)
        '..#....#...B....',  # 3  sala do meio (cols 8-10) | escuros col 11 | sala da direita
        '###4444#...B....',  # 4  barra amarela (saída)
        '.......#...B....',  # 5  baia 1 (verde)
        '.......#...#####',  # 6
        '###1111#....B...',  # 7  barra verde
        '.......#....B...',  # 8  baia 2 (ciano)
        '.......#....B...',  # 9
        '###2222######...',  # 10 barra ciano
        '.......#...B....',  # 11 baia 3 (vermelho)
        '.......#...B....',  # 12
        '###3333#...B....',  # 13 barra vermelha
        '.......#...#####',  # 14 baia 4 (amarelo)
        '.......#....B...',  # 15
        '########....B...',  # 16
        '#############...',  # 17
        '########FF.B....',  # 18 chegada (cols 8-9) atrás de escuros (col 11)
        '########FF.B....',  # 19
    ]
    R0, C0 = 4, 2
    m = unitmap(U, {}, R0, C0)
    for r in (5, 8, 11, 14): m.put(R0 + 2 * r + 1, C0 + 2, 'S')
    return m.lines()

def cortina():
    """Cópia do vídeo 22 (34170bc5): mapa de 19x22 BLOCOS. 4 baias no topo (vermelho, azul, amarelo, verde da esq. p/ dir.) com
    tijolos de cor 1x4: azul (col 3 = SAÍDA à esquerda, p/ a sala da esquerda), vermelho (1-2), verde (2-3), amarelo (3-4). Saída ->
    sala da esquerda -> corredor 1 p/ a direita -> 3 escuros -> corredor 2 p/ a esquerda -> 3 escuros -> corredor 3 p/ a direita ->
    3 escuros -> corredor final (faca) p/ a esquerda -> 1 escuro -> chegada (cols 0-1). Bolsinho sem saída à direita das baias."""
    U = [
        '####..#..#..#..####',  # 0  baias (a massa desce do topo)
        '####..#..#..#..####',  # 1
        '####..#..#..#..####',  # 2
        '...2..1..4..3..####',  # 3  tijolos de cor (4 linhas): azul (saída), vermelho, verde, amarelo
        '...2..1..4..3..#...',  # 4  bolsinho (cols 16-18)
        '...2..1..4..3..#...',  # 5
        '...2..1..4..3..#...',  # 6
        '...##############..',  # 7
        '...................',  # 8  corredor 1
        '...................',  # 9
        '################BBB',  # 10
        '...................',  # 11 corredor 2
        '...................',  # 12
        '...................',  # 13
        'BBB################',  # 14
        '...................',  # 15 corredor 3
        '...................',  # 16
        '...................',  # 17
        '################BBB',  # 18
        'FFB................',  # 19 corredor final (faca) -> 1 escuro -> chegada
        'FFB................',  # 20
        'FFB................',  # 21
    ]
    R0, C0 = 13, 8
    m = M()
    for r, row in enumerate(U):
        for c, ch in enumerate(row): m.put(R0 + r, C0 + c, ch)
    for c in (5, 8, 11, 14): m.put(R0 + 1, C0 + c, 'S')
    m.put(R0 + 20, C0 + 16, '!')
    return m.lines()

def mirante():
    """Cópia do vídeo 23 (36054105): mapa 16x21 unidades (família da Escadaria). 4 baias horizontais à esquerda (azul, verde,
    amarelo, vermelho de cima p/ baixo) com barras de 4 unidades: azul em cima (saída), verde (1-2), amarela (2-3), vermelha (3-4).
    Saída -> sala de cima -> topo p/ a direita (pistão sobe do pilar da col 13 e fecha a passagem) -> corredor da direita desce ->
    sala de baixo -> sobe cols 11-12 -> 2 tijolos escuros -> sala do meio -> desce cols 8-9 -> corredor de baixo -> sobe à
    esquerda -> 1 tijolo escuro -> chegada (cols 5-6). Sala sem saída no alto (cols 8-12). Os 2 quadrados lilás viraram parede."""
    U = [
        '####............',  # 0  topo (col 3 = lilás -> parede)
        '###.............',  # 1
        '###....#.###.#..',  # 2  pistão no topo do pilar da col 13
        '###....#.....#..',  # 3
        '###1111#.....#..',  # 4  barra azul (saída)
        '.......#.....#..',  # 5  baia 1 (azul)
        '.......#######..',  # 6
        '###2222##....#..',  # 7  barra verde; col 8 = lilás -> parede
        '.......#.....#..',  # 8  baia 2 (verde)
        '.......#..#BB#..',  # 9  2 tijolos escuros (cols 11-12)
        '###3333#..#..#..',  # 10 barra amarela
        '.......#..#..#..',  # 11 baia 3 (amarelo)
        '.......#..#..#..',  # 12
        '###4444#..#..#..',  # 13 barra vermelha
        '.......#..#..#..',  # 14 baia 4 (vermelho)
        '.......#..#..#..',  # 15
        '########..#..#..',  # 16
        '....BFF#..#.....',  # 17 sala da chegada: 1 escuro (col 4) + chegada (cols 5-6)
        '....BFF#..#.....',  # 18
        '..######..#.....',  # 19
        '..........#.....',  # 20 corredor de baixo
    ]
    R0, C0 = 3, 2
    m = unitmap(U, {}, R0, C0)
    for r in (5, 8, 11, 14): m.put(R0 + 2 * r + 1, C0 + 2, 'S')
    return m.lines()

def lilas():
    """Cópia do vídeo 24 (3b8f8bdd): mapa 15x18 unidades (planta da Teto). 4 baias penduradas no topo (verde, amarelo, azul,
    vermelho) com tijolos de cor à direita de cada uma (vermelho = saída). Corredor largo -> desce a esquerda -> corredor de baixo
    com 3 tijolos escuros (col 3) e PISTÃO que desce (col 9) -> sobe à direita -> 3 tijolos escuros -> chegada (col 10, 3 linhas).
    Sala em U com ilha e o QUADRADO LILÁS (quem encosta cresce). Sem faca."""
    U = [
        '#..#..#..#..###',  # 0  baias (a massa desce do topo)
        '#..#..#..#..###',  # 1
        '#..#..#..#..###',  # 2
        '#..1..2..3..4..',  # 3  tijolos de cor (3 linhas): verde, amarelo, azul, vermelho (saída)
        '#..1..2..3..4..',  # 4
        '#..1..2..3..4..',  # 5
        '#############..',  # 6
        '...............',  # 7  corredor largo
        '...............',  # 8
        '...............',  # 9
        '...############',  # 10
        '...#.....#FB...',  # 11 sala em U (quadrado lilás na col 4) | chegada (col 10) atrás de 3 escuros (col 11)
        '...#.....#FB...',  # 12
        '...#.....#FB...',  # 13
        '...#.###.####..',  # 14 ilha (cols 5-7)
        '...B...........',  # 15 corredor de baixo: 3 escuros (col 3); pistão desce na col 9
        '...B...........',  # 16
        '...B...........',  # 17
    ]
    R0, C0 = 6, 3
    m = unitmap(U, {}, R0, C0)
    for c in (2, 5, 8, 11): m.put(R0 + 2, C0 + 2 * c, 'S')
    m.put(R0 + 22, C0 + 8, 'L')   # quadrado lilás (unidade 11,4)
    return m.lines()

def martelo():
    """Cópia do vídeo 25 (3cd48485): mapa 14x18 unidades. 4 baias embaixo (azul, vermelho, amarelo, verde) com tijolos de cor de
    4 unidades: vermelho (1-2), azul (2-3), verde (3-4), amarelo (saída à direita). Saída -> corredor da direita sobe -> sala da
    direita desce -> travessa do U -> sala do meio sobe -> topo à esquerda (MARTELO) -> sala da esquerda -> 3 tijolos escuros ->
    chegada. 4 pistões horizontais na linha 2, dois em cada pilar (um p/ cada lado), 6s."""
    U = [
        '.......#......',  # 0  topo (martelo na col 3)
        '.......#......',  # 1
        '...#...#...#..',  # 2  pistões: pilar col 3 (esq. e dir.) e pilar col 11 (esq. e dir.)
        '...#...#...#..',  # 3
        '...#...#...#..',  # 4
        '...#...#...#..',  # 5
        'BBB#.......#..',  # 6  3 tijolos escuros antes da chegada; travessa do U
        'FFF#.......#..',  # 7  chegada
        'FFF#.......#..',  # 8
        '############..',  # 9
        '..2..1..4..3..',  # 10 tijolos de cor (4 linhas): vermelho, azul, verde, amarelo (saída)
        '..2..1..4..3..',  # 11
        '..2..1..4..3..',  # 12
        '..2..1..4..3..',  # 13
        '..#..#..#..###',  # 14 baias (a massa nasce no fundo)
        '..#..#..#..###',  # 15
        '..#..#..#..###',  # 16
        '..#..#..#..###',  # 17
    ]
    R0, C0 = 6, 4
    m = unitmap(U, {}, R0, C0)
    for c in (1, 4, 7, 10): m.put(R0 + 32, C0 + 2 * c, 'S')
    m.put(R0 + 0, C0 + 6, 'H')   # martelo (unidade 0,3)
    return m.lines()

def degraus():
    """Cópia do vídeo 26 (46b15019): mapa 16x21 unidades (família da Escadaria). 4 baias horizontais à esquerda (verde, vermelho,
    amarelo, ciano de cima p/ baixo) com barras de 4 unidades: ciano em cima (saída, do último = mais longe), verde (1-2), amarela
    (2-3), vermelha (3-4). Saída -> sala de cima -> topo p/ a direita (pistão sobe do pilar da col 7) -> desce cols 8-9 -> fundo do U
    -> sobe cols 11-12 -> topo (pistão do pilar da col 13) -> desce cols 14-15 -> sala com DEGRAUS de tijolos escuros nos cantos ->
    desce -> corredor de baixo p/ a esquerda (degraus no canto) -> 1 escuro -> chegada (cols 0-1). Bolsinho sem saída em cima à
    esquerda. Sem faca."""
    U = [
        '..........#.....',  # 0  bolsinho (cols 0-2) | topo
        '..#.......#.....',  # 1
        '..#....#..#..#..',  # 2  pistões no topo dos pilares das cols 7 e 13
        '###....#..#..#..',  # 3
        '###4444#..#..#..',  # 4  barra ciano (saída)
        '.......#..#..#..',  # 5  baia 1 (verde)
        '.......#..#..#..',  # 6
        '###1111#..#..#..',  # 7  barra verde
        '.......#..#..#..',  # 8  baia 2 (vermelho)
        '.......#..#..#..',  # 9
        '###3333#..#..#..',  # 10 barra amarela
        '.......#.....#..',  # 11 baia 3 (amarelo) | fundo do U
        '.......#.....#..',  # 12
        '###2222#.....#..',  # 13 barra vermelha
        '.......#######..',  # 14 baia 4 (ciano)
        '.......##BB.....',  # 15 sala dos degraus
        '#########B.....B',  # 16
        '#########.....BB',  # 17
        '#########...####',  # 18
        'FFB........B####',  # 19 corredor de baixo -> 1 escuro -> chegada
        'FFB.......BB####',  # 20
    ]
    R0, C0 = 3, 2
    m = unitmap(U, {}, R0, C0)
    for r in (5, 8, 11, 14): m.put(R0 + 2 * r + 1, C0 + 2, 'S')
    return m.lines()

def jaula():
    """Cópia do vídeo 27 (4ab7ab02): mapa 16x21 unidades (família da Degraus). 4 baias horizontais à esquerda (amarelo, ciano,
    verde, vermelho de cima p/ baixo) com barras de 4 unidades: ciano em cima (saída), amarela (1-2), verde (2-3), vermelha (3-4).
    Saída -> sala de cima -> faixa do topo p/ a direita -> desce cols 14-15 (porta da sala do QUADRADO LILÁS) -> corredor das linhas
    7-8 p/ a esquerda (pistão sobe do pilar da col 10 e fecha) -> desce cols 8-9 -> corredor das linhas 13-14 p/ a direita (em cima,
    a JAULA com piso de 4 tijolos de cor) -> desce cols 14-15 -> corredor de baixo p/ a esquerda -> sobe cols 6-7 -> 8 tijolos
    escuros -> sala da chegada (canto de baixo à esquerda). O quadrado roxo preso na jaula do vídeo NÃO foi copiado."""
    U = [
        '###.............',  # 0  faixa do topo
        '###.............',  # 1
        '###....#######..',  # 2
        '###....#.....#..',  # 3  sala do lilás (cols 8-12)
        '###2222#........',  # 4  barra ciano (saída) | porta da sala do lilás (col 13)
        '.......#.....#..',  # 5  baia 1 (amarelo)
        '.......#######..',  # 6
        '###1111#........',  # 7  barra amarela | corredor p/ a esquerda
        '.......#........',  # 8  baia 2 (ciano)
        '.......#..######',  # 9  pistão no topo do pilar da col 10
        '###3333#..#....#',  # 10 barra verde | jaula (cols 11-14)
        '.......#..#....#',  # 11 baia 3 (verde)
        '.......#..#1234#',  # 12 piso da jaula: amarelo, ciano, verde, vermelho
        '###4444#........',  # 13 barra vermelha | corredor p/ a direita
        '.......#........',  # 14 baia 4 (vermelho)
        '.......#######..',  # 15
        '##############..',  # 16
        '..BBBB..######..',  # 17 8 tijolos escuros
        '..BBBB..######..',  # 18
        '..####..........',  # 19 corredor de baixo
        'FF####..........',  # 20 chegada (cols 0-1)
    ]
    R0, C0 = 3, 2
    m = unitmap(U, {}, R0, C0)
    for r in (5, 8, 11, 14): m.put(R0 + 2 * r + 1, C0 + 2, 'S')
    m.put(R0 + 8, C0 + 20, 'L')   # quadrado lilás (unidade 4,10)
    return m.lines()

def serra():
    """Cópia do vídeo 28 (542e6ec4): mapa 14x18 unidades. 4 baias embaixo (amarelo, verde, ciano, vermelho da esq. p/ dir.) com
    tijolos de cor de 3 unidades: amarelo (1-2), ciano (2-3), verde (3-4) e vermelho (saída à direita). Saída -> corredor da direita
    sobe (embaixo, um bolsinho sem saída) -> corredor da linha 10 p/ a esquerda -> sobe a esquerda -> topo -> desce cols 4-5 -> sobe
    a coluna 7 (4 tijolos escuros) -> topo do meio -> desce cols 9-10 -> sobe cols 12-13 -> 2 tijolos escuros -> chegada no canto de
    cima à direita. Sem pistões, sem faca."""
    U = [
        '......#....#FF',  # 0  chegada (cols 12-13)
        '......#.#..#FF',  # 1
        '...#..#B#..#BB',  # 2  escuros: coluna 7 (4) e linha 2 (2)
        '...#..#B#..#..',  # 3
        '...#..#B#..#..',  # 4
        '...#..#B#..#..',  # 5
        '...#..#.#.....',  # 6
        '...#....#.....',  # 7
        '...#....#.....',  # 8
        '...###########',  # 9
        '..............',  # 10 corredor p/ a esquerda
        '############..',  # 11
        '..1..3..2..4..',  # 12 tijolos de cor (3 linhas): amarelo, ciano, verde, vermelho (saída)
        '..1..3..2..4..',  # 13
        '..1..3..2..4..',  # 14
        '..#..#..#..##.',  # 15 bolsinho (cols 12-13, linhas 15-17)
        '..#..#..#..#..',  # 16
        '..#..#..#..#..',  # 17
    ]
    R0, C0 = 6, 4
    m = unitmap(U, {}, R0, C0)
    for c in (0, 3, 6, 9): m.put(R0 + 2 * 16, C0 + 2 * c + 1, 'S')
    return m.lines()

def lamina():
    """Cópia do vídeo 29 (5bc64a9d): mapa 18x22 unidades. 4 baias horizontais à esquerda (ciano, vermelho, amarelo, verde de cima
    p/ baixo) com barras de 3 unidades: verde em cima (saída, do último = mais longe), ciano (1-2), vermelha (2-3), amarela (3-4).
    Saída -> sala de cima -> desce o corredor da esquerda (cols 7-9, 3 tijolos escuros soltos nas paredes) -> 4 tijolos escuros no pé
    da parede da col 10 -> sobe o corredor do meio (cols 11-13, 3 escuros soltos) -> faixa do topo com a FACA -> desce o corredor
    da direita -> 2 linhas de tijolos escuros -> chegada (linha 21). Sem pistões."""
    U = [
        '###.......#.......',  # 0  sala de cima | faixa do topo (faca na col 14)
        '###.......#.......',  # 1
        '###.......#.......',  # 2
        '###444#...#...#...',  # 3  barra verde (saída)
        '......#...#...#...',  # 4  baia 1 (ciano)
        '......#B..#...#...',  # 5  escuro solto (col 7)
        '......#...#...#...',  # 6
        '###111#...#B..#...',  # 7  barra ciano | escuro solto (col 11)
        '......#...#...#...',  # 8  baia 2 (vermelho)
        '......#..B#...#...',  # 9  escuro solto (col 9)
        '......#...#...#...',  # 10
        '###222#...#..B#...',  # 11 barra vermelha | escuro solto (col 13)
        '......#...#...#...',  # 12 baia 3 (amarelo)
        '......#B..#...#...',  # 13 escuro solto (col 7)
        '......#...#...#...',  # 14
        '###333#...#B..#...',  # 15 barra amarela | escuro solto (col 11)
        '......#...#...#...',  # 16 baia 4 (verde)
        '......#...#...#...',  # 17
        '......#...B...#...',  # 18 4 tijolos escuros (col 10) ligam os dois corredores
        '#######...B...#BBB',  # 19 2 linhas de escuros antes da chegada
        '#######...B...#BBB',  # 20
        '#######...B...#FFF',  # 21 chegada
    ]
    R0, C0 = 2, 0
    m = unitmap(U, {}, R0, C0)
    for r in (4, 8, 12, 16): m.put(R0 + 2 * r + 2, C0 + 2, 'S')
    m.put(R0 + 2, C0 + 28, '!')   # faca (unidade 1,14)
    return m.lines()

def prensa():
    """Cópia do vídeo 30 (66ad3ff5): mapa de 20x23 BLOCOS. Os 4 quadrados nascem juntos no corredor de baixo (vermelho, azul,
    amarelo, verde da esq. p/ dir.). Coluna central de 8 blocos com 3 pares de braços laterais (3 blocos de altura); de cada braço sai
    uma PRENSA (pistão horizontal) que atravessa o braço e entra na coluna até deixar só 0,6 bloco de vão: quem estiver na faixa é
    esmagado. Chegada no topo (cols 9-10) atrás de 1 linha de tijolos escuros. Sem prisão, sem massa."""
    U = [
        '####################',  # 0  (bloco verde-limão do vídeo -> parede)
        '#########FF#########',  # 1  chegada
        '#########BB#########',  # 2  tijolos escuros
        '....................',  # 3  braços 1 (prensas)
        '....................',  # 4
        '....................',  # 5
        '######........######',  # 6
        '######........######',  # 7
        '######........######',  # 8
        '....................',  # 9  braços 2
        '....................',  # 10
        '....................',  # 11
        '######........######',  # 12
        '######........######',  # 13
        '######........######',  # 14
        '....................',  # 15 braços 3
        '....................',  # 16
        '....................',  # 17
        '######........######',  # 18
        '######........######',  # 19
        '######........######',  # 20
        '.........SSSS.......',  # 21 largada (os 4 juntos)
        '....................',  # 22
    ]
    R0, C0 = 12, 8
    m = M()
    for r, row in enumerate(U):
        for c, ch in enumerate(row): m.put(R0 + r, C0 + c, ch)
    return m.lines()

def cruz():
    """Cópia do vídeo 31 (6f20aceb): mapa 16x21 unidades (planta da Degraus). 4 baias horizontais à esquerda (amarelo, azul,
    vermelho, verde de cima p/ baixo) com barras de 4 unidades: verde em cima (saída, do último = mais longe), amarela (1-2), azul
    (2-3), vermelha (3-4). Saída -> sala de cima -> topo -> desce cols 8-9 -> fundo do U -> sobe cols 11-12 -> topo -> desce cols
    14-15 -> sala de baixo (pistão sobe do chão na col 12) -> desce cols 9-11 -> corredor de baixo (pistão desce do teto na col 8)
    -> 4 tijolos escuros -> chegada (cols 0-1). Tijolos escuros em "T" nas pontas dos 3 pilares. Sem faca."""
    U = [
        '###.......#.....',  # 0  sala de cima | topo
        '###....B..#..B..',  # 1  "T" de escuros nas pontas dos pilares das cols 7 e 13
        '###...B#B.#.B#B.',  # 2
        '###....#..#..#..',  # 3
        '###4444#..#..#..',  # 4  barra verde (saída)
        '.......#..#..#..',  # 5  baia 1 (amarelo)
        '.......#..#..#..',  # 6
        '###1111#..#..#..',  # 7  barra amarela
        '.......#..#..#..',  # 8  baia 2 (azul)
        '.......#..#..#..',  # 9
        '###2222#.B#B.#..',  # 10 barra azul | "T" invertido no pé do pilar da col 10
        '.......#..B..#..',  # 11 baia 3 (vermelho) | fundo do U
        '.......#.....#..',  # 12
        '###3333#.....#..',  # 13 barra vermelha
        '.......#######..',  # 14 baia 4 (verde)
        '.......##.......',  # 15 sala de baixo (pistão sobe do chão na col 12)
        '#########.......',  # 16
        '#########.......',  # 17
        '#########...####',  # 18
        'FFBB........####',  # 19 corredor de baixo (pistão desce do teto na col 8) -> 4 escuros -> chegada
        'FFBB........####',  # 20
    ]
    R0, C0 = 3, 2
    m = unitmap(U, {}, R0, C0)
    for r in (5, 8, 11, 14): m.put(R0 + 2 * r + 1, C0 + 2, 'S')
    return m.lines()

def bigorna():
    """Cópia do vídeo 32 (6f324bf3): mapa 14x18 unidades. 4 baias embaixo (vermelho, verde, azul, amarelo da esq. p/ dir.) com
    tijolos de cor de 4 unidades: amarelo (1-2), verde (2-3), azul (3-4) e vermelho (saída à direita: o dono é o da baia 1, já
    cumpre a justiça). Saída -> corredor da direita sobe -> corredor das linhas 7-8 p/ a esquerda (pistão sobe da parede na col 6;
    QUADRADO LILÁS na ponta esquerda) -> sobe a esquerda -> faixa do topo (pistão sobe do pilar da col 3) -> desce à direita (MARTELO)
    -> sala da chegada -> 1 coluna de tijolos escuros -> chegada (cols 3-4). Sem faca."""
    U = [
        '..............',  # 0  faixa do topo
        '..............',  # 1
        '..............',  # 2
        '..#######.....',  # 3  pistão sobe do topo da parede na col 3 | martelo (col 11)
        '..#FFB........',  # 4  sala da chegada: chegada (cols 3-4) atrás de escuros (col 5)
        '..#FFB........',  # 5
        '..############',  # 6
        '..............',  # 7  corredor p/ a esquerda (lilás na col 0); pistão sobe da parede na col 6
        '..............',  # 8
        '############..',  # 9
        '..1..2..3..4..',  # 10 tijolos de cor (4 linhas): amarelo, verde, azul, vermelho (saída)
        '..1..2..3..4..',  # 11
        '..1..2..3..4..',  # 12
        '..1..2..3..4..',  # 13
        '..#..#..#..###',  # 14 baias
        '..#..#..#..###',  # 15
        '..#..#..#..###',  # 16
        '..#..#..#..###',  # 17
    ]
    R0, C0 = 6, 4
    # donos: vermelho 0, verde 1, azul 2, amarelo 3 -> amarelo '4', verde '2', azul '3', vermelho '1'
    U = [row.replace('1', 'y').replace('2', 'g').replace('3', 'b').replace('4', 'r') for row in U]
    U = [row.replace('y', '4').replace('g', '2').replace('b', '3').replace('r', '1') for row in U]
    m = unitmap(U, {}, R0, C0)
    for c in (0, 3, 6, 9): m.put(R0 + 2 * 16, C0 + 2 * c + 1, 'S')
    m.put(R0 + 16, C0 + 0, 'L')    # quadrado lilás (unidade 8,0)
    m.put(R0 + 6, C0 + 22, 'H')    # martelo (unidade 3,11)
    return m.lines()

def caracol():
    """Cópia do vídeo 33 (71b4f380): mapa 16x21 unidades em ESPIRAL. 4 baias embaixo (ciano, amarelo, verde, vermelho da esq. p/
    dir.) com tijolos de cor de 4 unidades: vermelho (1-2), amarelo (2-3), verde (3-4) e ciano (saída à direita: o dono é o da
    baia 1, já cumpre a justiça). Saída -> sobe a coluna da direita -> faixa do topo p/ a esquerda -> desce a esquerda -> faixa de
    baixo p/ a direita -> sobe cols 10-11 -> sala de dentro p/ a esquerda (pistão sobe da parede da col 6) -> desce -> chegada no
    centro (cols 7-8). Tijolos escuros soltos nas paredes da espiral; bolsinho sem saída embaixo à direita. Sem faca."""
    U = [
        '.....B...B......',  # 0  faixa do topo
        '................',  # 1
        '.......B........',  # 2
        '...##########...',  # 3
        'B..#........#...',  # 4  sala de dentro (cols 4-11)
        '...#........#..B',  # 5
        '..B#..####..#...',  # 6  pistão sobe do topo da parede na col 6
        '...#...FF#..#B..',  # 7  chegada (cols 7-8)
        'B..#...FF#..#...',  # 8
        '...#######..#..B',  # 9
        '......B.....#...',  # 10 faixa de baixo
        '............#B..',  # 11
        '....B...B...#...',  # 12
        '#############...',  # 13
        '..4..2..3..1....',  # 14 tijolos de cor (4 linhas): vermelho, amarelo, verde, ciano (saída)
        '..4..2..3..1....',  # 15
        '..4..2..3..1....',  # 16
        '..4..2..3..1....',  # 17
        '..#..#..#..###.#',  # 18 baias | gargalo do bolsinho (col 14)
        '..#..#..#..##...',  # 19 bolsinho (cols 13-15)
        '..#..#..#..##...',  # 20
    ]
    R0, C0 = 3, 2
    m = unitmap(U, {}, R0, C0)
    for c in (0, 3, 6, 9): m.put(R0 + 2 * 19, C0 + 2 * c + 1, 'S')
    return m.lines()

def gancho():
    """Cópia do vídeo 34 (73bab6b7): mapa 14x18 unidades (família da Serra). 4 baias embaixo (amarelo, vermelho, verde, ciano da
    esq. p/ dir.) com tijolos de cor de 4 unidades: ciano (1-2), vermelho (2-3), verde (3-4) e amarelo (saída à direita: o dono é
    o da baia 1, já cumpre a justiça). Saída -> corredor da direita sobe (embaixo, bolsinho sem saída) -> corredor das linhas 7-8 p/
    a esquerda (pistão sobe da parede na col 11) -> sobe a esquerda (2 escuros soltos) -> faixa do topo (pistão sobe da parede na
    col 2) -> desce à direita -> sala da chegada p/ a esquerda -> 6 tijolos escuros -> chegada (col 3, 3 linhas). Sem faca."""
    U = [
        '..............',  # 0  faixa do topo
        '..............',  # 1
        '..#######.....',  # 2  pistão sobe do topo da parede na col 2
        'B.#FBB........',  # 3  chegada (col 3) atrás de 6 escuros (cols 4-5)
        '..#FBB........',  # 4
        '.B#FBB........',  # 5
        '..############',  # 6
        '..............',  # 7  corredor p/ a esquerda; pistão sobe da parede na col 11
        '..............',  # 8
        '############..',  # 9
        '..4..2..3..1..',  # 10 tijolos de cor (4 linhas): ciano, vermelho, verde, amarelo (saída)
        '..4..2..3..1..',  # 11
        '..4..2..3..1..',  # 12
        '..4..2..3..1..',  # 13
        '..#..#..#..##.',  # 14 baias | gargalo do bolsinho (col 13)
        '..#..#..#..#..',  # 15 bolsinho (cols 12-13)
        '..#..#..#..#..',  # 16
        '..#..#..#..#..',  # 17
    ]
    R0, C0 = 6, 4
    m = unitmap(U, {}, R0, C0)
    for c in (0, 3, 6, 9): m.put(R0 + 2 * 16, C0 + 2 * c + 1, 'S')
    return m.lines()

def catraca():
    """Cópia do vídeo 35 (76a579e5): mapa 16x20 unidades. 4 baias horizontais à esquerda (vermelho, verde, azul, amarelo de cima p/
    baixo) com barras de 4 unidades: vermelha em cima (saída), amarela (1-2), verde (2-3), azul (3-4). Saída -> sala de cima -> faixa
    do topo -> desce a direita -> zigue-zague com 4 PORTÕES de cor (3 unidades, só o dono quebra): amarelo (col 11) -> sala da esquerda
    -> vermelho (col 12) -> direita -> azul (col 11) -> sala da esquerda -> verde (col 12) -> desce -> chegada (linha 19, cols 8-9).
    Sem pistões, sem faca."""
    U = [
        '###.............',  # 0  faixa do topo
        '###.............',  # 1
        '###....######...',  # 2
        '###....#...4....',  # 3  portão amarelo (col 11)
        '###1111#...4....',  # 4  barra vermelha (saída)
        '.......#...4....',  # 5  baia 1 (vermelho)
        '.......#...#####',  # 6
        '###4444#....1...',  # 7  barra amarela | portão vermelho (col 12)
        '.......#....1...',  # 8  baia 2 (verde)
        '.......#....1...',  # 9
        '###2222######...',  # 10 barra verde
        '.......#...3....',  # 11 baia 3 (azul) | portão azul (col 11)
        '.......#...3....',  # 12
        '###3333#...3....',  # 13 barra azul
        '.......#...#####',  # 14 baia 4 (amarelo)
        '.......#....2...',  # 15 portão verde (col 12)
        '########....2...',  # 16
        '########....2...',  # 17
        '#############...',  # 18
        '########FF......',  # 19 chegada (cols 8-9)
    ]
    R0, C0 = 4, 2
    m = unitmap(U, {}, R0, C0)
    for r in (5, 8, 11, 14): m.put(R0 + 2 * r + 1, C0 + 2, 'S')
    return m.lines()

def coroa():
    """Cópia do vídeo 36 (7792dbe0): mapa 14x18 unidades (família da Serra), um "M" com a FACA no meio. 4 baias embaixo (amarelo,
    azul, verde, vermelho da esq. p/ dir.) com tijolos de cor de 4 unidades: vermelho (1-2), azul (2-3), verde (3-4) e amarelo
    (saída à direita: o dono é o da baia 1, já cumpre a justiça). Saída -> sobe a direita (pistão sai do pilar da col 10 p/ a
    direita) -> topo da direita -> desce cols 7-9 -> fundo do "M" (faca; escuros em "L" nos cantos) -> sobe cols 3-5 -> topo da
    esquerda -> desce cols 0-1 (pistão sai do pilar da col 2 p/ a esquerda) -> 2 escuros -> chegada (linhas 7-8)."""
    U = [
        '....BB#BB.....',  # 0  topo (escuros em "L" nos cantos do pilar do meio)
        '.....B#B......',  # 1
        '......#.......',  # 2
        '..#...#...#...',  # 3  pistões nas linhas 3 (pilares das cols 2 e 10)
        '..#...#...#...',  # 4
        '..#...#...#...',  # 5
        'BB#.......#...',  # 6  2 escuros antes da chegada
        'FF#B.....B#...',  # 7  chegada (cols 0-1) | fundo do "M" (faca na col 6)
        'FF#BB...BB#...',  # 8
        '############..',  # 9
        '..4..2..3..1..',  # 10 tijolos de cor (4 linhas): vermelho, azul, verde, amarelo (saída)
        '..4..2..3..1..',  # 11
        '..4..2..3..1..',  # 12
        '..4..2..3..1..',  # 13
        '..#..#..#..###',  # 14 baias
        '..#..#..#..###',  # 15
        '..#..#..#..###',  # 16
        '..#..#..#..###',  # 17
    ]
    R0, C0 = 6, 4
    m = unitmap(U, {}, R0, C0)
    for c in (0, 3, 6, 9): m.put(R0 + 2 * 16, C0 + 2 * c + 1, 'S')
    m.put(R0 + 14, C0 + 12, '!')   # faca (unidade 7,6)
    return m.lines()

def atalho():
    """Cópia do vídeo 37 (82a98258): mapa 14x18 unidades (planta da Coroa, sem escuros nos cantos). 4 baias embaixo (ciano, amarelo,
    vermelho, verde da esq. p/ dir.) com tijolos de cor de 4 unidades: amarelo (1-2), vermelho (2-3), ciano (3-4) e verde (saída à
    direita). Saída -> sobe a direita -> topo da direita -> desce cols 7-9 -> fundo do "M" (pistão DESCE do pilar do meio) -> sobe
    cols 3-5 -> topo da esquerda (FACA; PORTAL de mão única no canto: quem entra sai no bolsinho embaixo da direita, lá atrás) ->
    desce cols 0-1 -> 2 linhas de escuros -> chegada (linha 8)."""
    U = [
        '......#.......',  # 0  topo (portal de entrada no canto, col 0)
        '......#.......',  # 1  faca (col 2)
        '......#.......',  # 2
        '..#...#...#...',  # 3
        '..#...#...#...',  # 4
        '..#...#...#...',  # 5  pistão desce do pé do pilar do meio (col 6)
        'BB#.......#...',  # 6  2 linhas de escuros antes da chegada
        'BB#.......#...',  # 7
        'FF#.......#...',  # 8  chegada (cols 0-1)
        '############..',  # 9
        '..2..3..1..4..',  # 10 tijolos de cor (4 linhas): amarelo, vermelho, ciano, verde (saída)
        '..2..3..1..4..',  # 11
        '..2..3..1..4..',  # 12
        '..2..3..1..4..',  # 13
        '..#..#..#..##.',  # 14 baias | bolsinho do portal de saída (col 13)
        '..#..#..#..###',  # 15
        '..#..#..#..###',  # 16
        '..#..#..#..###',  # 17
    ]
    R0, C0 = 6, 4
    m = unitmap(U, {}, R0, C0)
    for c in (0, 3, 6, 9): m.put(R0 + 2 * 16, C0 + 2 * c + 1, 'S')
    m.put(R0 + 2, C0 + 4, '!')     # faca (unidade 1,2)
    m.put(R0 + 0, C0 + 0, 'P')     # portal de entrada (canto de cima à esquerda)
    m.put(R0 + 28, C0 + 26, 'p')   # portal de saída (bolsinho embaixo à direita)
    return m.lines()

def chamine():
    """Cópia do vídeo 38 (83f2bead): mapa 14x18 unidades, SEM prisão. Os 4 nascem juntos na sala de baixo (vermelho, verde, ciano,
    amarelo da esq. p/ dir.); 2 QUADRADOS LILÁS nos cantos de cima da sala (quem encosta cresce um pouco). 4 chaminés de 1 unidade
    (cols 2, 5, 8, 11) com 1 tijolo escuro no topo sobem até o salão; faixa do topo (pistão sobe da parede na col 8) -> 2 escuros
    -> chegada no canto de cima à esquerda. A massa sobe devagar e igual pela sala e pelas chaminés. Justiça não se aplica."""
    U = [
        'FFB...........',  # 0  chegada (cols 0-1) atrás de escuros (col 2) | faixa do topo
        'FFB...........',  # 1
        '#########.....',  # 2  pistão sobe do topo da parede na col 8
        '..............',  # 3  salão
        '..............',  # 4
        '..............',  # 5
        '##B##B##B##B##',  # 6  1 escuro no topo de cada chaminé
        '##.##.##.##.##',  # 7  chaminés
        '##.##.##.##.##',  # 8
        '##.##.##.##.##',  # 9
        '##.##.##.##.##',  # 10
        '##.##.##.##.##',  # 11
        '##.##.##.##.##',  # 12
        '##.##.##.##.##',  # 13
        '..............',  # 14 sala de baixo (lilás nos cantos, cols 0 e 13)
        '..............',  # 15
        '..............',  # 16 largada (cols 6-9)
        '..............',  # 17
    ]
    R0, C0 = 6, 4
    m = unitmap(U, {}, R0, C0)
    for c in (6, 7, 8, 9): m.put(R0 + 33, C0 + 2 * c, 'S')
    m.put(R0 + 28, C0 + 0, 'L')    # quadrado lilás (unidade 14,0)
    m.put(R0 + 28, C0 + 27, 'L')   # quadrado lilás (unidade 14,13)
    return m.lines()

def zigue():
    """Cópia do vídeo 39 (887cd998): mapa 14x18 unidades, SEM prisão. Os 4 nascem juntos no canto de baixo à esquerda (verde, azul /
    vermelho, amarelo) e a massa vem logo atrás. Serpentina de 5 corredores de 3 unidades com 9 PISTÕES (8s, pico em 4s): em cada
    parede, um sobe, um desce e um sai da ponta, fechando o corredor. Chegada no canto de cima à direita (sem tijolos)."""
    U = [
        '............FF',  # 0  corredor do topo -> chegada (cols 12-13)
        '............FF',  # 1
        '...###########',  # 2  pistões: sobe na col 8; sai da ponta (col 3) p/ a esquerda
        '..............',  # 3
        '..............',  # 4
        '..............',  # 5
        '###########...',  # 6  pistões: sobe na col 5; desce na col 9; sai da ponta (col 10) p/ a direita
        '..............',  # 7
        '..............',  # 8
        '..............',  # 9
        '...###########',  # 10 pistão sai da ponta (col 3) p/ a esquerda
        '..............',  # 11
        '..............',  # 12
        '..............',  # 13
        '###########...',  # 14 pistões: sobe na col 5; desce na col 7; sai da ponta p/ a direita
        '..............',  # 15 largada (cols 1-2, linhas 15-16)
        '..............',  # 16
        '..............',  # 17
    ]
    R0, C0 = 6, 4
    m = unitmap(U, {}, R0, C0)
    for (r, c) in ((15, 1), (15, 2), (16, 1), (16, 2)): m.put(R0 + 2 * r + 1, C0 + 2 * c + 1, 'S')
    return m.lines()

if __name__ == '__main__':
    for name, fn in [('gaiola', gaiola), ('cofre', cofre), ('ponte', ponte), ('escada', escada), ('pocos', pocos), ('colunas', colunas), ('pente', pente), ('pilares', pilares), ('meandro', meandro), ('portais', portais), ('grade', grade), ('trilha', trilha), ('corredor', corredor), ('salao', salao), ('teto', teto), ('xadrez', xadrez), ('portoes', portoes), ('bolsao', bolsao), ('escadaria', escadaria), ('cortina', cortina), ('mirante', mirante), ('lilas', lilas), ('martelo', martelo), ('degraus', degraus), ('jaula', jaula), ('serra', serra), ('lamina', lamina), ('prensa', prensa), ('cruz', cruz), ('bigorna', bigorna), ('caracol', caracol), ('gancho', gancho), ('catraca', catraca), ('coroa', coroa), ('atalho', atalho), ('chamine', chamine), ('zigue', zigue), ('derby', derby), ('serpente', serpente), ('arena8', arena8)]:
        print(f'// {name}')
        print('    map: [\n' + ''.join(f"      '{l}',\n" for l in fn()) + '    ],')
