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

# Paredes GIGANTES com túneis cavados dentro (estilo dos vídeos de referência).
# Túneis de 4 blocos (112px); passagens que estreitam para 2-3 blocos de vez em quando.
# Só tijolos (raias coloridas + chegada) e UMA faca escondida num nicho.

def tunnel(m, pts, w=4):
    """cava um túnel de largura w passando pelos pontos (linha, coluna) — canto superior esquerdo"""
    for (r0, c0), (r1, c1) in zip(pts, pts[1:]):
        m.carve(min(r0, r1), min(c0, c1), max(r0, r1) + w - 1, max(c0, c1) + w - 1)
    return m

def tunel():
    m = M()
    m.lanes([2, 10, 18, 26], 5, [36, 37], (38, 45), 46, 42)
    m.carve(31, 2, 35, 30)                                   # coletor sobre as raias
    tunnel(m, [(31, 30), (21, 30), (21, 6), (11, 6), (11, 27), (2, 27), (2, 12)])
    m.carve(2, 2, 5, 9, 'F'); m.carve(2, 10, 5, 11, 'B')     # chegada (esquerda/topo)
    m.carve(16, 6, 17, 7, '#')                               # estreitamento (fica 2)
    m.carve(11, 18, 14, 18, '#'); m.carve(12, 18, 13, 18, '.')  # fresta
    m.carve(25, 17, 28, 20); m.carve(25, 17, 25, 17, '#'); m.carve(25, 20, 25, 20, '#')  # nicho da faca (entrada 2)
    m.put(27, 18, '!')
    return m.lines()

def caracol():
    m = M()
    m.lanes([6, 13, 20, 27], 5, [36, 37], (38, 45), 46, 42)
    m.carve(31, 1, 35, 31)                                   # coletor
    tunnel(m, [(31, 1), (1, 1), (1, 31), (23, 31), (23, 9), (9, 9), (9, 23), (15, 23)])
    m.carve(16, 15, 19, 20, 'F'); m.carve(16, 21, 19, 22, 'B')  # chegada no centro
    m.carve(15, 15, 15, 22, '#')
    m.carve(12, 1, 13, 2, '#')                               # estreitamento na subida
    m.carve(1, 25, 4, 25, '#'); m.carve(2, 25, 3, 25, '.')   # fresta no topo
    m.carve(5, 16, 7, 19); m.carve(5, 16, 5, 16, '#'); m.carve(5, 19, 5, 19, '#')  # nicho da faca (entrada 2)
    m.put(7, 17, '!')
    return m.lines()

def arena8():
    m = M()
    m.lanes([2 + 4 * i for i in range(8)], 3, [36, 37], (38, 45), 46, 42)
    m.carve(31, 1, 35, 34)                                   # coletor
    tunnel(m, [(31, 1), (14, 1), (14, 15)])                  # ramo esquerdo
    tunnel(m, [(31, 31), (14, 31), (14, 17)])                # ramo direito
    m.carve(6, 15, 17, 20)                                   # subida central
    m.carve(1, 11, 3, 24, 'F'); m.carve(4, 11, 5, 24, 'B')   # chegada
    m.carve(6, 11, 6, 14, '#'); m.carve(6, 21, 6, 24, '#')
    m.carve(22, 1, 23, 2, '#'); m.carve(22, 33, 23, 34, '#') # estreitamentos
    m.carve(25, 16, 30, 19); m.carve(25, 16, 26, 16, '#'); m.carve(25, 19, 26, 19, '#')  # nicho da faca
    m.put(26, 17, '!')
    return m.lines()

if __name__ == '__main__':
    import json
    for name, fn in [('tunel', tunel), ('caracol', caracol), ('arena8', arena8)]:
        print(f'// {name}')
        print('    map: [\n' + ''.join(f"      '{l}',\n" for l in fn()) + '    ],')
