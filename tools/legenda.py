#!/usr/bin/env python3
"""Legenda do post (público da ÍNDIA, pedido do dono em 22/11/2026): Hinglish (hindi em letras latinas, como se escreve nos
Reels indianos) + uma linha em hindi (devanágari) + resumo em inglês. Sem revelar o vencedor.

Uso: python3 tools/legenda.py <ids,dos,escudos> "<descrição da fase (linha do CLAUDE.md) ou palavras-chave>" [saida.txt] [--seed N]
Palavras que mudam o texto: 'sem prisão'/'juntos', 'faca', 'portal', 'lilás', 'martelo', 'pistão'.
"""
import json
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

GANCHOS = [
    '{times} — kaun jeetega? 🤔🔥',
    'Sirf EK team finish line tak pahunchegi 🏁 {times}',
    '{times}: कौन जीतेगा? 👀🏁',
    'Is race ka winner kaun? {times} 🔥',
]
MECANICA = [  # (palavra na descrição, texto)
    ('faca', 'Raaste mein CHAAKU 🔪 hai... jisne uthaya, wo sabko OUT kar dega!'),
    ('portal', 'Ek PORTAL 🌀 poori race badal sakta hai...'),
    ('lilás', 'Purple block 🟪 ko chhua to team BADI ho jaati hai 😳'),
    ('martelo', 'HAMMER 🔨 mila to koi bhi deewar tod sakte ho!'),
    ('pistão', 'PISTON baar-baar raasta BAND kar dete hain 😬'),
]
LARGADA_PRESA = 'Sab andar BAND hain 🔒 sirf CHAABI 🔑 wali team sabko azaad karegi!'
LARGADA_JUNTOS = 'Sab saath start... aur peeche se deewar aa rahi hai 😱'
CTA = [
    'End se pehle apni team COMMENT karo 👇',
    'Apna guess COMMENT karo, end dekhne se pehle! 👇',
]
EN = 'Which club wins? Comment before the end! ⚽'
FOLLOW = 'Follow karo — roz nayi race 🔔'
TAGS = ('#football #footballreels #ucl #premierleague #satisfying #oddlysatisfying #race #reelsindia '
        '#trending #viral #explore #instareels')


def nomes(ids):
    lib = {e['id']: e['name'] for e in json.load(open(ROOT / 'src' / 'escudos.json'))}
    return [lib.get(i, i.replace('-', ' ').upper()) for i in ids]


def legenda(ids, desc, rnd=random):
    n = nomes(ids)
    times = ', '.join(n[:-1]) + ' ya ' + n[-1] if len(n) > 1 else n[0]
    juntos = 'sem prisão' in desc or 'juntos' in desc
    linhas = [rnd.choice(GANCHOS).format(times=times), LARGADA_JUNTOS if juntos else LARGADA_PRESA]
    for chave, txt in MECANICA:
        if chave in desc:
            linhas.append(txt)
            break
    linhas += [rnd.choice(CTA), EN, FOLLOW, '', TAGS]
    return '\n'.join(linhas) + '\n'


if __name__ == '__main__':
    a = [x for x in sys.argv[1:] if not x.startswith('--seed')]
    seed = next((int(x.split('=')[1]) for x in sys.argv[1:] if x.startswith('--seed=')), None)
    rnd = random.Random(seed)
    t = legenda(a[0].split(','), a[1] if len(a) > 1 else '', rnd)
    if len(a) > 2:
        Path(a[2]).write_text(t)
    print(t)
