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

# Paredes internas GROSSAS (2 blocos = 56px, ~ a largura de um quadrado) como nos vídeos,
# corredores de 4-5 blocos e passagens estreitas de 2-3 blocos (os quadrados batem e voltam).

def zigue():
    m = M()
    m.lanes([1, 9, 17, 25], 6, [37, 38], (39, 45), 46, 42)
    m.carve(30, 1, 36, 30)                 # A (7 linhas)
    m.carve(28, 28, 29, 30)                # A->B (3, direita)
    m.carve(21, 1, 27, 34)                 # B
    m.slit_v(17, 21, 27, 23, 25)           # divisória com fresta
    m.carve(19, 1, 20, 3)                  # B->C (3, esquerda)
    m.carve(12, 1, 18, 34)                 # C
    m.carve(12, 18, 18, 19, 'B')           # barreira de tijolos
    m.carve(10, 31, 11, 34, 'D')           # portão C->F
    m.carve(1, 1, 9, 34)                   # F (chegada à esquerda)
    m.carve(1, 1, 9, 5, 'F'); m.carve(1, 6, 9, 7, 'B')
    m.slit_v(20, 1, 9, 4, 6)
    m.put(35, 10, 'O'); m.put(31, 22, 'O'); m.put(33, 16, '*')
    m.put(24, 9, '*'); m.put(25, 27, 'z'); m.put(21, 12, 'O'); m.put(27, 24, 'O'); m.put(23, 31, '?')
    m.put(15, 8, '!'); m.put(12, 26, 'O'); m.put(18, 12, 'O'); m.put(15, 29, '?')
    m.put(1, 13, 'O'); m.put(9, 26, 'O'); m.put(5, 28, '*'); m.put(8, 12, 'z')
    return m.lines()

def colunas():
    m = M()
    m.lanes([1, 7, 13, 19], 4, [36, 37], (38, 45), 46, 42)
    m.carve(30, 1, 35, 34)                 # corredor de baixo
    m.carve(28, 1, 29, 3)                  # sobe pela coluna 1 (3)
    cols = [(1, 10), (13, 22), (25, 34)]   # 3 colunas largas
    for c0, c1 in cols: m.carve(1, c0, 27, c1)
    m.carve(1, 11, 3, 12, 'D')             # c1 -> c2 (portão no topo, 3)
    m.carve(24, 23, 26, 24)                # c2 -> c3 (embaixo, 3)
    m.carve(1, 25, 4, 34, 'F'); m.carve(5, 25, 6, 34, 'B')
    m.carve(13, 1, 14, 10, '#'); m.carve(13, 6, 14, 8, '.')      # fresta na coluna 1
    m.carve(15, 25, 16, 34, '#'); m.carve(15, 26, 16, 28, '.')   # fresta na coluna 3
    m.put(34, 9, 'O'); m.put(32, 26, '*'); m.put(32, 17, 'z'); m.put(30, 31, 'O')
    m.put(20, 2, 'O'); m.put(19, 8, '*'); m.put(7, 5, '?')
    m.put(9, 17, '*'); m.put(18, 14, 'O'); m.put(20, 21, 'O'); m.put(25, 17, '!')
    m.carve(12, 13, 13, 22, 'B')
    m.put(22, 30, '*'); m.put(10, 26, 'O'); m.put(9, 33, 'z'); m.put(25, 32, 'O')
    return m.lines()

def labirinto():
    m = M()
    m.lanes([1, 9, 17, 25], 6, [37, 38], (39, 45), 46, 42)
    m.carve(32, 1, 36, 34)                 # A
    m.carve(20, 1, 29, 4); m.carve(20, 31, 29, 34)   # subidas laterais
    m.carve(30, 3, 31, 4); m.carve(30, 31, 31, 32)   # entradas estreitas (2)
    m.carve(20, 1, 24, 34)                 # H2
    m.carve(27, 13, 29, 22); m.carve(25, 16, 26, 19, 'D')  # sala da espada
    m.put(28, 17, '!')
    m.carve(18, 16, 19, 19, 'D')           # portão central
    m.carve(18, 31, 19, 34, 'B')           # tijolos à direita
    m.carve(13, 1, 17, 34)                 # H3
    m.slit_v(10, 13, 17, 15, 16); m.slit_v(24, 13, 17, 13, 14)
    m.carve(11, 1, 12, 3); m.carve(11, 32, 12, 34)        # subidas finais (3)
    m.carve(1, 1, 10, 34)                  # H4
    m.carve(1, 14, 3, 21, 'F'); m.carve(4, 14, 5, 21, 'B')
    m.carve(1, 12, 5, 13, '#'); m.carve(1, 22, 5, 23, '#')
    m.put(36, 9, 'O'); m.put(32, 26, 'O'); m.put(34, 17, 'z')
    m.put(22, 17, '*'); m.put(20, 8, 'O'); m.put(24, 27, 'O')
    m.put(15, 17, '?'); m.put(17, 6, 'O'); m.put(13, 29, 'O')
    m.put(9, 8, 'O'); m.put(9, 27, 'O'); m.put(3, 5, 'z'); m.put(3, 30, '?')
    return m.lines()

def arena8():
    m = M()
    m.lanes([2 + 4 * i for i in range(8)], 3, [36, 37], (38, 45), 46, 42)
    m.carve(31, 1, 35, 34)                 # A
    m.carve(29, 1, 30, 3); m.carve(29, 32, 30, 34)
    m.carve(22, 1, 28, 34)                 # B
    m.carve(20, 16, 21, 19, 'D')
    m.carve(13, 1, 19, 34)                 # C
    m.carve(11, 1, 12, 3, 'B'); m.carve(11, 32, 12, 34, 'B'); m.carve(11, 17, 12, 18, 'B')
    m.carve(1, 1, 10, 34)                  # D
    m.carve(1, 12, 3, 23, 'F'); m.carve(4, 12, 5, 23, 'B')
    m.carve(1, 10, 5, 11, '#'); m.carve(1, 24, 5, 25, '#')
    m.put(33, 9, 'O'); m.put(33, 26, 'O'); m.put(33, 17, '?')
    m.put(25, 8, '*'); m.put(25, 27, '*'); m.put(25, 17, 'z'); m.put(27, 3, 'O')
    m.put(16, 9, 'O'); m.put(16, 26, 'O'); m.put(17, 17, '!')
    m.put(7, 6, 'O'); m.put(7, 29, 'O'); m.put(8, 17, '*'); m.put(3, 4, '?'); m.put(3, 31, 'z')
    return m.lines()

if __name__ == '__main__':
    import json
    for name, fn in [('zigue', zigue), ('colunas', colunas), ('labirinto', labirinto), ('arena8', arena8)]:
        print(f'// {name}')
        print('    map: [\n' + ''.join(f"      '{l}',\n" for l in fn()) + '    ],')
