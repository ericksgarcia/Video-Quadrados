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
    def slit_v(s, c, r0, r1, open0, open1):
        """divisória vertical (coluna c, linhas r0..r1) com uma fresta em open0..open1"""
        s.carve(r0, c, r1, c, '#'); s.carve(open0, c, open1, c, '.'); return s
    def lines(s): return [''.join(r) for r in s.g]

# Passagens de propósito estreitas (2-3 blocos = 56-84px para um quadrado de 44px):
# os quadrados batem, voltam e só passam "de vez em quando".

def zigue():
    m = M()
    m.lanes([1, 9, 17, 25], 7, [38, 39], (40, 45), 46, 43)
    m.carve(33, 1, 37, 34)                 # A
    m.carve(32, 32, 32, 34)                # A->B (3, direita)
    m.carve(27, 1, 31, 34)                 # B
    m.slit_v(18, 27, 31, 28, 29)           # divisória com fresta
    m.carve(26, 1, 26, 2)                  # B->C (2, esquerda)
    m.carve(21, 1, 25, 34)                 # C
    m.carve(20, 31, 20, 34, 'D')           # portão C->D
    m.carve(15, 1, 19, 34)                 # D
    m.slit_v(16, 15, 19, 18, 19)
    m.carve(14, 1, 14, 3)                  # D->E (3, esquerda)
    m.carve(9, 1, 13, 34)                  # E
    m.carve(9, 17, 13, 18, 'B')            # barreira de tijolos
    m.carve(8, 33, 8, 34)                  # E->F (2, direita)
    m.carve(1, 1, 7, 34)                   # F
    m.carve(1, 1, 7, 5, 'F'); m.carve(1, 6, 7, 7, 'B')
    m.slit_v(20, 1, 7, 2, 4)
    m.put(37, 10, 'O'); m.put(33, 22, 'O')
    m.put(29, 9, '*'); m.put(29, 27, 'z'); m.put(31, 30, 'P'); m.put(17, 29, 'p')
    m.put(21, 12, 'O'); m.put(25, 22, 'O'); m.put(23, 26, '?')
    m.put(17, 8, '!'); m.put(19, 24, 'O')
    m.put(13, 26, 'O'); m.put(11, 6, '?')
    m.put(1, 14, 'O'); m.put(7, 26, 'O'); m.put(4, 29, '*')
    return m.lines()

def colunas():
    m = M()
    m.lanes([1, 6, 11, 16], 4, [36, 37], (38, 45), 46, 42)
    m.carve(31, 1, 35, 34)                 # corredor de baixo
    m.carve(30, 1, 30, 3)                  # sobe pela coluna 1 (3)
    cols = [(1, 6), (8, 13), (15, 20), (22, 27), (29, 34)]
    for c0, c1 in cols: m.carve(1, c0, 29, c1)
    m.carve(1, 7, 3, 7, 'D')               # c1 -> c2 (portão, 3)
    m.carve(27, 14, 28, 14)                # c2 -> c3 (2)
    m.carve(1, 21, 2, 21)                  # c3 -> c4 (2)
    m.carve(26, 28, 28, 28)                # c4 -> c5 (3)
    m.carve(1, 29, 4, 34, 'F'); m.carve(5, 29, 6, 34, 'B')
    m.carve(14, 1, 14, 6, '#'); m.carve(14, 3, 14, 4, '.')      # fresta na coluna 1
    m.carve(18, 29, 18, 34, '#'); m.carve(18, 33, 18, 34, '.')  # fresta na coluna 5
    m.put(35, 9, 'O'); m.put(33, 26, '*'); m.put(33, 17, 'z'); m.put(31, 31, 'O')
    m.put(20, 1, 'O'); m.put(8, 4, '?')
    m.put(20, 13, 'O'); m.put(27, 11, 'P')
    m.carve(14, 15, 15, 20, 'B'); m.put(22, 17, '!'); m.put(8, 20, 'O')
    m.put(4, 25, 'p'); m.put(16, 22, 'O')
    m.put(10, 34, 'O'); m.put(24, 31, 'z')
    return m.lines()

def labirinto():
    m = M()
    m.lanes([1, 9, 17, 25], 7, [38, 39], (40, 45), 46, 43)
    m.carve(33, 1, 37, 34)                 # A
    m.carve(22, 1, 31, 5); m.carve(22, 30, 31, 34)   # subidas laterais
    m.carve(32, 4, 32, 5); m.carve(32, 30, 32, 31)   # entradas estreitas (2)
    m.carve(22, 1, 26, 34)                 # H2
    m.carve(28, 13, 31, 22); m.carve(27, 16, 27, 19, 'D')
    m.put(30, 17, '!')
    m.carve(16, 16, 21, 19); m.carve(18, 16, 18, 19, 'D')  # conector central com portão
    m.carve(16, 32, 21, 34); m.carve(18, 32, 19, 34, 'B')  # conector direito com tijolos
    m.carve(11, 1, 15, 34)                 # H3
    m.slit_v(10, 11, 15, 13, 14); m.slit_v(25, 11, 15, 11, 12)
    m.carve(8, 1, 10, 2); m.carve(8, 33, 10, 34)          # subidas finais (2)
    m.carve(1, 1, 7, 34)                   # H4
    m.carve(1, 14, 3, 21, 'F'); m.carve(4, 14, 4, 21, 'B')
    m.carve(4, 13, 4, 13, '#'); m.carve(4, 22, 4, 22, '#'); m.carve(1, 13, 3, 13, '#'); m.carve(1, 22, 3, 22, '#')
    m.put(37, 9, 'O'); m.put(33, 26, 'O'); m.put(35, 17, 'z')
    m.put(24, 17, '*'); m.put(22, 8, 'O'); m.put(26, 27, 'O')
    m.put(13, 17, '?'); m.put(15, 6, 'O'); m.put(11, 29, 'O')
    m.put(7, 8, 'O'); m.put(7, 27, 'O'); m.put(5, 4, 'z'); m.put(5, 31, '?')
    return m.lines()

def arena8():
    m = M()
    m.lanes([2 + 4 * i for i in range(8)], 3, [37, 38], (39, 45), 46, 42)
    m.carve(31, 1, 36, 34)                 # A
    m.carve(30, 1, 30, 2); m.carve(30, 33, 30, 34)
    m.carve(23, 1, 29, 34)                 # B
    m.carve(22, 16, 22, 19, 'D')
    m.carve(14, 1, 21, 34)                 # C
    m.carve(13, 1, 13, 3, 'B'); m.carve(13, 32, 13, 34, 'B'); m.carve(13, 17, 13, 18)
    m.carve(1, 1, 12, 34)                  # D
    m.carve(1, 12, 3, 23, 'F'); m.carve(4, 12, 5, 23, 'B')
    m.carve(1, 11, 5, 11, '#'); m.carve(1, 24, 5, 24, '#')
    m.put(33, 9, 'O'); m.put(33, 26, 'O'); m.put(33, 17, '?')
    m.put(26, 8, '*'); m.put(26, 27, '*'); m.put(26, 17, 'z'); m.put(26, 3, 'P'); m.put(17, 32, 'p')
    m.put(17, 9, 'O'); m.put(17, 26, 'O'); m.put(18, 17, '!')
    m.put(8, 6, 'O'); m.put(8, 29, 'O'); m.put(9, 17, '*'); m.put(4, 4, '?'); m.put(4, 31, 'z')
    return m.lines()

if __name__ == '__main__':
    import json
    for name, fn in [('zigue', zigue), ('colunas', colunas), ('labirinto', labirinto), ('arena8', arena8)]:
        print(f'// {name}')
        print('    map: [\n' + ''.join(f"      '{l}',\n" for l in fn()) + '    ],')
