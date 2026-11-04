#!/usr/bin/env python3
"""Analisa um vídeo de referência (square_derby etc.) e gera um relatório para COPIAR a fase.

Uso:
    python3 -I tools/analisar_video.py <video.mp4> <pasta-de-saida> [--fps 10]

A <pasta-de-saida> deve ser nova/vazia (use o scratchpad). Gera:
    analise.md   relatório (grade, mapa em ASCII, quebra dos tijolos, ritmo da massa, pistões,
                 velocidade/tamanho dos quadrados, fim útil do vídeo)
    inicio.png   primeiro quadro      folha.png  contact sheet (1 quadro a cada 3s)
    massa.png    mapa colorido com o instante em que a massa chega a cada ponto
    frames/      todos os quadros (PNG, --fps por segundo)

O relatório usa SÓ numpy + PIL. Depois de rodar: confira a grade e o mapa ASCII olhando `inicio.png`,
escreva a função da fase em tools/levelgen.py e a config em src/levels.js (ver CLAUDE.md).
"""
import argparse, math, os, subprocess, sys
import numpy as np
from PIL import Image

# códigos de classificação de pixel/célula
CH = '?#.MkwrygbcovP'  # 0 ?  1 # parede/fundo  2 . chão  3 M massa  4 k tijolo escuro  5 w branco(xadrez)
#                        6 r vermelho 7 y amarelo 8 g verde 9 b azul 10 c ciano 11 o laranja 12 v roxo 13 p rosa
CH = '?#.Mkwrygbcovp'   # na grade em unidades, 'w' = chegada (xadrez)
COLORS = 'rygbcovp'
NAMES = {'r': 'vermelho', 'y': 'amarelo', 'g': 'verde', 'b': 'azul', 'c': 'ciano', 'o': 'laranja', 'v': 'roxo', 'p': 'rosa'}


def load(path):
    return np.asarray(Image.open(path).convert('RGB'), dtype=np.int16)


def floor_color(a):
    """cor dominante do chão: pixel claro, pouco saturado, que não é branco puro."""
    mn, mx = a.min(2), a.max(2)
    m = (mn > 195) & (mx - mn < 22) & (mn < 245)
    px = a[m]
    if len(px) == 0:
        return (224, 224, 217)
    q = (px // 4).astype(np.int32)
    key = q[:, 0] * 4096 + q[:, 1] * 64 + q[:, 2]
    v = np.bincount(key).argmax()
    sel = px[key == v]
    return tuple(int(x) for x in np.median(sel, axis=0))


def classify(a, fc):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(2), a.min(2)
    out = np.zeros(r.shape, np.uint8)
    out[(mx - mn < 18) & (r > 90) & (r < 205)] = 1                                   # parede/fundo
    out[(abs(r - fc[0]) < 14) & (abs(g - fc[1]) < 14) & (abs(b - fc[2]) < 14)] = 2  # chão
    out[(mn > 235)] = 5                                                              # branco
    out[(r < 80) & (g < 80) & (b < 100) & (mx - mn < 45)] = 4                       # escuro
    out[(r > 170) & (g < 80) & (b < 80)] = 6                                         # vermelho
    out[(r > 200) & (g > 170) & (b < 130)] = 7                                       # amarelo
    out[(g > 90) & (r < 60) & (b < 120) & (g > r + 40)] = 8                         # verde
    out[(b > 200) & (r < 100) & (g > 60) & (g < 150)] = 9                           # azul
    out[(r < 70) & (g > 150) & (b > 170)] = 10                                       # ciano
    out[(r > 220) & (g > 100) & (g < 175) & (b < 70)] = 11                          # laranja
    out[(r > 110) & (r < 175) & (g < 110) & (b > 200)] = 12                         # roxo
    out[(r > 220) & (g < 110) & (b > 120) & (b < 200)] = 13                         # rosa
    out[(r > 35) & (r < 100) & (g > 25) & (g < 85) & (b > 105) & (b < 180) & (b - r > 50)] = 3  # massa
    return out


def find_bbox(a):
    """caixa do mapa: linhas/colunas com traço escuro longo (contorno preto do mapa)."""
    H, W = a.shape[:2]
    dark = (a.max(2) < 70)
    cols = np.where(dark.sum(0) >= 0.08 * H)[0]
    rows = np.where(dark.sum(1) >= 0.10 * W)[0]
    return int(cols.min()), int(rows.min()), int(cols.max()) + 1, int(rows.max()) + 1


def candidates(bw, bh, W):
    res = []
    for wu in range(8, 41):
        for hu in range(8, 52):
            u = bw / wu
            if not (0.020 * W <= u <= 0.095 * W):
                continue
            err = abs(bw / wu - bh / hu) / u
            res.append((err, wu, hu, u))
    res.sort(key=lambda z: (round(z[0], 2), -z[3]))   # erro ~igual -> prefere a unidade maior (menos células)
    return res[:6]


def squares(a, cls, unit):
    """quadrados (peças pequenas, lisas, de cor viva): usa erosão para separar de tijolos texturizados."""
    out = []
    k = max(7, int(unit * 0.28)) | 1
    for code in range(6, 14):
        m = (cls == code).astype(np.int32)
        if m.sum() < k * k:
            continue
        ii = np.pad(m, ((1, 0), (1, 0))).cumsum(0).cumsum(1)
        H, W = m.shape
        s = ii[k:, k:] - ii[:-k, k:] - ii[k:, :-k] + ii[:-k, :-k]
        ys, xs = np.where(s == k * k)
        if len(ys) == 0:
            continue
        # agrupa em blobs por proximidade
        pts = sorted(zip(ys.tolist(), xs.tolist()))
        seen = set(); cells = {}
        for y, x in pts:
            cells.setdefault((y // 4, x // 4), []).append((y, x))
        comp = {}
        for key in cells:
            comp[key] = None
        lab = 0
        for key in cells:
            if comp[key] is not None:
                continue
            lab += 1; stack = [key]; comp[key] = lab
            while stack:
                cy, cx = stack.pop()
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        nk = (cy + dy, cx + dx)
                        if nk in comp and comp[nk] is None:
                            comp[nk] = lab; stack.append(nk)
        groups = {}
        for key, l in comp.items():
            groups.setdefault(l, []).extend(cells[key])
        for l, g in groups.items():
            ys_ = [p[0] for p in g]; xs_ = [p[1] for p in g]
            w = max(xs_) - min(xs_) + k; h = max(ys_) - min(ys_) + k
            if 0.35 * unit <= w <= 1.0 * unit and 0.35 * unit <= h <= 1.0 * unit and 0.75 < w / h < 1.33:
                out.append((CH[code], (min(xs_) + max(xs_)) / 2 + k / 2, (min(ys_) + max(ys_)) / 2 + k / 2, (w + h) / 2))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('video'); ap.add_argument('saida')
    ap.add_argument('--fps', type=int, default=10)
    A = ap.parse_args()
    out = A.saida
    fdir = os.path.join(out, 'frames')
    os.makedirs(fdir, exist_ok=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', A.video, '-vf', f'fps={A.fps}', os.path.join(fdir, '%04d.png')], check=True)
    files = sorted(os.listdir(fdir))
    n_all = len(files)
    dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', A.video]).strip())
    a0 = load(os.path.join(fdir, files[0]))
    H, W = a0.shape[:2]
    Image.open(os.path.join(fdir, files[0])).save(os.path.join(out, 'inicio.png'))
    fc = floor_color(a0)
    x0, y0, x1, y1 = find_bbox(a0)
    bw, bh = x1 - x0, y1 - y0
    cand = candidates(bw, bh, W)
    err, wu, hu, unit = cand[0]
    rep = []
    P = rep.append
    P(f'# Análise de {os.path.basename(A.video)}\n')
    P(f'- vídeo: {W}x{H}, {dur:.1f}s, {n_all} quadros a {A.fps} fps')
    P(f'- cor do chão: {fc}')
    P(f'- caixa do mapa (px): x {x0}..{x1}, y {y0}..{y1}  ({bw}x{bh})')
    P('- candidatos de grade (erro, largura x altura em unidades, px/unidade): ' + '; '.join(f'({e:.3f}, {w}x{h}, {u:.1f})' for e, w, h, u in cand[:4]))
    P(f'- **grade adotada**: {wu}x{hu} unidades (1 unidade = 2x2 blocos de 28px no jogo), {unit:.1f} px/unidade — CONFIRA no inicio.png\n')

    # classificação de todos os quadros (centros de meia-unidade)
    hw, hh = wu * 2, hu * 2
    hs = unit / 2
    cxs = (x0 + (np.arange(hw) + 0.5) * hs).astype(int)
    cys = (y0 + (np.arange(hh) + 0.5) * hs).astype(int)
    gy, gx = np.meshgrid(cys, cxs, indexing='ij')
    d = max(2, int(hs * 0.3))
    offs = [(dy, dx) for dy in (-d, -d // 2, 0, d // 2, d) for dx in (-d, -d // 2, 0, d // 2, d)]
    T = []          # T[t] -> (hh,hw) códigos
    mass_cnt = []
    bright = []
    sq_tracks = {}  # cor -> lista (t, x, y)
    sizes = {}
    step_sq = max(1, A.fps // 5)
    for t, f in enumerate(files):
        a = load(os.path.join(fdir, f))
        bright.append(float(a.mean()))
        cls = classify(a, fc)
        votes = np.zeros((hh, hw, 14), np.int16)
        for dy, dx in offs:
            v = cls[np.clip(gy + dy, 0, H - 1), np.clip(gx + dx, 0, W - 1)]
            np.add.at(votes, (np.arange(hh)[:, None].repeat(hw, 1), np.arange(hw)[None, :].repeat(hh, 0), v), 1)
        # cor viva (tijolo/quadrado) ou massa vence as linhas escuras do desenho de tijolinho
        best = votes.argmax(2)
        col_votes = votes[..., [3, 6, 7, 8, 9, 10, 11, 12, 13]]
        cbest = col_votes.argmax(2)
        cmap = np.array([3, 6, 7, 8, 9, 10, 11, 12, 13])[cbest]
        cmax = col_votes.max(2)
        use = (cmax >= 0.28 * len(offs)) & ((best == 4) | (best == 0))
        best = np.where(use, cmap, best)
        # cantos de xadrez: tem preto e branco na mesma célula -> branco/escuro conforme maioria já basta
        T.append(best.astype(np.uint8))
        mass_cnt.append(int((T[-1] == 3).sum()))
        if t % step_sq == 0:
            for c, x, y, s in squares(a, cls, unit):
                sq_tracks.setdefault(c, []).append((t / A.fps, x, y))
                sizes.setdefault(c, []).append(s)
    T = np.array(T)

    # fim útil: antes do cartão escuro final ou do reinício do mapa (massa some)
    end = n_all
    for t in range(n_all):
        if bright[t] < 45:
            end = t; break
    pk = max(mass_cnt) if mass_cnt else 0
    if pk > 20:
        tpk = int(np.argmax(mass_cnt))
        for t in range(tpk, end):
            if mass_cnt[t] < 0.2 * pk:
                end = t; break
    P(f'- **fim útil do vídeo**: ~{end / A.fps:.1f}s (antes do cartão escuro / do reinício). O 1º a chegar vence nesse instante.\n')
    T = T[:end]

    # mapa ASCII
    def dump(grid, title, scale):
        P(f'## {title}\n')
        P('```')
        P('    ' + ''.join(str(c % 10) for c in range(grid.shape[1])))
        for r in range(grid.shape[0]):
            P(f'{r:3d} ' + ''.join(CH[v] for v in grid[r]))
        P('```\n')
    # início: usa quadro 0 (antes de a massa aparecer)
    t0 = 0
    ug = np.zeros((hu, wu), np.uint8)
    for r in range(hu):
        for c in range(wu):
            blk = T[t0][2 * r:2 * r + 2, 2 * c:2 * c + 2].ravel()
            ug[r, c] = 5 if (5 in blk and 4 in blk) else np.bincount(blk, minlength=14).argmax()
    dump(ug, f'Mapa inicial em UNIDADES ({wu}x{hu}). `#`=parede `.`=chão `k`=tijolo escuro `w`=chegada (xadrez preto/branco) letras=tijolo/quadrado de cor (r vermelho, y amarelo, g verde, b azul, c ciano, o laranja, v roxo, p rosa)', 1)
    dump(T[t0], f'Mapa inicial em MEIAS-UNIDADES = BLOCOS ({hw}x{hh})', 2)

    # tijolos de cor: quando somem
    bricks = []
    for r in range(hu):
        for c in range(wu):
            ch0 = CH[ug[r, c]]
            if ch0 in COLORS:
                # a unidade é um tijolo se as 4 meias-células tinham a cor
                if all(CH[T[0][2 * r + i, 2 * c + j]] == ch0 for i in (0, 1) for j in (0, 1)):
                    bt = None
                    for t in range(1, len(T) - 2):
                        cells = [CH[T[t][2 * r + i, 2 * c + j]] for i in (0, 1) for j in (0, 1)]
                        if sum(1 for x in cells if x != ch0) >= 3 and all(CH[T[t + k][2 * r, 2 * c]] != ch0 for k in (1, 2)):
                            bt = t / A.fps; break
                    bricks.append((bt if bt is not None else 1e9, NAMES[ch0], r, c))
    bricks.sort()
    P('## Tijolos de cor (1 unidade) e quando quebraram\n')
    if bricks:
        P('| tempo | cor | linha,col (unidades) |\n|---|---|---|')
        for bt, nm, r, c in bricks:
            P(f'| {"não quebrou" if bt > 1e8 else f"{bt:.1f}s"} | {nm} | ({r},{c}) |')
    else:
        P('(nenhum)')
    dark_bricks = sum(1 for r in range(hu) for c in range(wu) if CH[ug[r, c]] == 'k')
    P(f'\n- unidades de tijolo escuro no início: {dark_bricks}\n')

    # massa
    P('## Massa (concreto/índigo)\n')
    first = np.full((hh, hw), -1.0)
    for t in range(len(T)):
        new = (T[t] == 3) & (first < 0)
        first[new] = t / A.fps
    ever = first >= 0
    if ever.sum() == 0:
        P('Não há massa neste vídeo.')
    else:
        t_start = float(first[ever].min())
        P(f'- a massa aparece em **{t_start:.1f}s**; área máxima ≈ {pk} meias-células ({pk / 4:.0f} unidades²)')
        P('- área da massa (meias-células) a cada 5s: ' + ', '.join(f'{(i / A.fps):.0f}s={mass_cnt[i]}' for i in range(0, len(T), 5 * A.fps)))
        P('\nMapa do **instante de chegada da massa** (1 char = 5s em base 36: `0`=0–5s, `1`=5–10s … `a`=50–55s; `.`=nunca; `#`=parede):')
        P('```')
        P('    ' + ''.join(str(c % 10) for c in range(hw)))
        for r in range(hh):
            row = ''
            for c in range(hw):
                if first[r, c] >= 0:
                    k = int(first[r, c] // 5)
                    row += '0123456789abcdefghijklmnopqrstuvwxyz'[min(k, 35)]
                else:
                    row += '#' if CH[T[0][r, c]] == '#' else '.'
            P(f'{r:3d} ' + row)
        P('```')
        # imagem colorida
        img = np.zeros((hh, hw, 3), np.uint8) + 40
        mx = max(1.0, first.max())
        for r in range(hh):
            for c in range(hw):
                if first[r, c] >= 0:
                    v = first[r, c] / mx
                    img[r, c] = (int(255 * v), int(255 * (1 - abs(v - .5) * 2)), int(255 * (1 - v)))
                elif CH[T[0][r, c]] != '#':
                    img[r, c] = (235, 235, 225)
        Image.fromarray(img).resize((hw * 14, hh * 14), Image.NEAREST).save(os.path.join(out, 'massa.png'))
        # velocidade da frente: mediana do instante por linha e por coluna + inclinação (blocos/s)
        def fit(vals):
            xs_ = np.array([i for i, v in enumerate(vals) if v is not None], float)
            ys_ = np.array([v for v in vals if v is not None], float)
            if len(xs_) < 4:
                return None
            A_ = np.polyfit(ys_, xs_, 1)
            r2 = np.corrcoef(ys_, xs_)[0, 1] ** 2
            return A_[0], r2
        rows_t = [float(np.median(first[r][first[r] >= 0])) if (first[r] >= 0).sum() >= 3 else None for r in range(hh)]
        cols_t = [float(np.median(first[:, c][first[:, c] >= 0])) if (first[:, c] >= 0).sum() >= 3 else None for c in range(hw)]
        fr, fc_ = fit(rows_t), fit(cols_t)
        P('\n- velocidade média da frente (inclinação linha×tempo e coluna×tempo; só vale se R² alto = trecho único): ' +
          (f'vertical {abs(fr[0]):.2f} blocos/s (R²={fr[1]:.2f}); ' if fr else '') + (f'horizontal {abs(fc_[0]):.2f} blocos/s (R²={fc_[1]:.2f})' if fc_ else ''))
        P('- para trechos separados: divida o mapa acima em faixas e use (nº de linhas ou colunas)/(5 s × diferença de chars) blocos/s.')

    # pistões: grupos de meias-células escuras que alternam muitas vezes (sem contar o contorno dos quadrados)
    P('\n## Pistões (blocos escuros que crescem e recolhem)\n')
    nT = len(T)
    dark = (T == 4)
    toggles = (dark[1:] != dark[:-1]).sum(0)
    frac = dark.mean(0)
    pc = (toggles >= 6) & (frac > 0.08) & (frac < 0.92)
    seen = np.zeros_like(pc)
    clusters = []
    for r0_, c0_ in zip(*np.where(pc)):
        if seen[r0_, c0_]:
            continue
        st = [(r0_, c0_)]; seen[r0_, c0_] = True; cells_ = []
        while st:
            y_, x_ = st.pop(); cells_.append((y_, x_))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y_ + dy, x_ + dx
                    if 0 <= yy < hh and 0 <= xx < hw and pc[yy, xx] and not seen[yy, xx]:
                        seen[yy, xx] = True; st.append((yy, xx))
        if len(cells_) >= 4:
            clusters.append(cells_)
    if not clusters:
        P('Nenhum pistão detectado.')
    for k_, cells_ in enumerate(clusters, 1):
        ys_ = [c[0] for c in cells_]; xs_ = [c[1] for c in cells_]
        r0_, r1_, c0_, c1_ = min(ys_), max(ys_), min(xs_), max(xs_)
        box = dark[:, r0_:r1_ + 1, c0_:c1_ + 1]
        vertical = (r1_ - r0_) >= (c1_ - c0_)
        ext = (box.sum(1).max(1) if vertical else box.sum(2).max(1)).astype(float)   # extensão (meias-células) ao longo do tempo
        mid = (ext.max() + ext.min()) / 2
        ups = [t / A.fps for t in range(1, nT) if ext[t - 1] < mid <= ext[t]]
        per = float(np.median(np.diff(ups))) if len(ups) >= 3 else float('nan')
        if vertical:
            top, bot = box[:, 0, :].mean(), box[:, -1, :].mean()
            base = 'embaixo (cresce para CIMA, dir "up")' if bot > top else 'em cima (cresce para BAIXO)'
        else:
            lef, rig = box[:, :, 0].mean(), box[:, :, -1].mean()
            base = 'à esquerda (cresce para a DIREITA, dir "right")' if lef > rig else 'à direita (cresce para a ESQUERDA, dir "left")'
        P(f'- **pistão {k_}**: blocos linhas {r0_}–{r1_}, colunas {c0_}–{c1_}; largura {((c1_ - c0_ + 1) if vertical else (r1_ - r0_ + 1))} blocos; '
          f'extensão máx ≈ {ext.max():.0f} blocos ({ext.max() / 2:.1f} unid.); período ≈ **{per:.1f}s**; base {base}; 1ª subida em {ups[0] if ups else float("nan"):.1f}s')
    P('\nNo jogo: `{ c: <col absoluta do 1º bloco>, r: <linha absoluta da BASE>, w: <largura em blocos>, max: <extensão em blocos>, period: <s>, dir: "up"|"left"|"right" }` (coordenadas absolutas = bloco + deslocamento do mapa).')

    # quadrados
    P('\n## Quadrados\n')
    P('| cor | tamanho (unid.) | velocidade mediana (unid/s) | amostras |\n|---|---|---|---|')
    for c, tr in sq_tracks.items():
        sp = []
        for (t1, x1_, y1_), (t2, x2_, y2_) in zip(tr, tr[1:]):
            if 0 < t2 - t1 < 0.35:
                sp.append(math.hypot(x2_ - x1_, y2_ - y1_) / (t2 - t1) / unit)
        if len(sp) < 5:
            continue
        P(f'| {NAMES[c]} | {np.median(sizes[c]) / unit:.2f} | {np.median(sp):.2f} (p75 {np.percentile(sp, 75):.2f}) | {len(sp)} |')
    P('\n- no jogo: `racerSize` ≈ tamanho × 56 px; `racerSpeed` ≈ velocidade × 56 px/s (1 unidade = 56 px).')
    # posições iniciais dos quadrados
    t_first = [(c, tr[0]) for c, tr in sq_tracks.items() if tr]
    P('\nPosição inicial dos quadrados (unidades, relativa ao mapa): ' + '; '.join(f'{NAMES[c]}=({(p[1] - x0) / unit:.1f},{(p[2] - y0) / unit:.1f})' for c, p in sorted(t_first, key=lambda z: z[1][1])))

    # folha de contato
    idx = list(range(0, min(end, n_all), 3 * A.fps))[:40]
    if idx:
        tw = 180; th = int(tw * H / W)
        cols = 8; rows = (len(idx) + cols - 1) // cols
        sheet = Image.new('RGB', (cols * tw, rows * th), (20, 20, 20))
        for i, k in enumerate(idx):
            im = Image.open(os.path.join(fdir, files[k])).convert('RGB').resize((tw, th))
            sheet.paste(im, ((i % cols) * tw, (i // cols) * th))
        sheet.save(os.path.join(out, 'folha.png'))
    open(os.path.join(out, 'analise.md'), 'w').write('\n'.join(rep) + '\n')
    print('\n'.join(rep[:14]))
    print(f'\n[ok] relatório completo em {os.path.join(out, "analise.md")}')


if __name__ == '__main__':
    main()
