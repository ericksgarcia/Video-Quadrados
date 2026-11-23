#!/usr/bin/env python3
"""Legenda do post. Público-alvo atual: **EUA** (pedido do dono em 23/11/2026: "quero que esse conteúdo chegue em pessoas dos EUA,
legendas em inglês"). Inglês americano ("soccer" + "football" nas hashtags). Sem revelar o vencedor.
A versão Hinglish (Índia, 22/11/2026) continua disponível com --lang hi.

Uso: python3 tools/legenda.py <ids,dos,escudos> "<descrição da fase (linha do CLAUDE.md) ou palavras-chave>" [saida.txt]
     [--lang en|hi] [--seed=N]
Palavras que mudam o texto: 'sem prisão'/'juntos', 'faca', 'portal', 'lilás', 'martelo', 'pistão'.
Também define PRIMEIRO_COMENTARIO (o publicar.py põe como 1º comentário do post).
"""
import json
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

TXT = {
    'en': {
        'ganchos': [
            '{times} — who wins? 🤔🔥',
            'Only ONE club makes it to the finish line 🏁 {times}',
            'Pick your club: {times} 👇',
            'Which crest escapes first? {times} 🔥',
        ],
        'mecanica': [
            ('faca', 'There\'s a KNIFE 🔪 on the track... whoever grabs it knocks everyone OUT!'),
            ('portal', 'One PORTAL 🌀 can flip the whole race...'),
            ('lilás', 'Touch the purple block 🟪 and you get BIGGER 😳'),
            ('martelo', 'Grab the HAMMER 🔨 and smash any wall!'),
            ('pistão', 'PISTONS keep slamming the path shut 😬'),
        ],
        'presa': 'Everyone starts LOCKED 🔒 — only the one with the KEY 🔑 can set them all free!',
        'juntos': 'They all start together... and the wall is coming 😱',
        'cta': ['Drop your pick in the comments BEFORE the end 👇', 'Comment your club before it finishes! 👇'],
        'extra': 'Watch till the end 👀',
        'follow': 'Follow for a new race every day 🔔',
        'ou': ' or ',
        'tags': ('#soccer #football #premierleague #championsleague #ucl #mls #satisfying #oddlysatisfying #marblerace '
                 '#race #usa #fyp #viral #explore #reels'),
        'comentario': 'Who\'s your pick? 🏆 Comment below 👇',
    },
    'hi': {
        'ganchos': [
            '{times} — kaun jeetega? 🤔🔥',
            'Sirf EK team finish line tak pahunchegi 🏁 {times}',
            '{times}: कौन जीतेगा? 👀🏁',
            'Is race ka winner kaun? {times} 🔥',
        ],
        'mecanica': [
            ('faca', 'Raaste mein CHAAKU 🔪 hai... jisne uthaya, wo sabko OUT kar dega!'),
            ('portal', 'Ek PORTAL 🌀 poori race badal sakta hai...'),
            ('lilás', 'Purple block 🟪 ko chhua to team BADI ho jaati hai 😳'),
            ('martelo', 'HAMMER 🔨 mila to koi bhi deewar tod sakte ho!'),
            ('pistão', 'PISTON baar-baar raasta BAND kar dete hain 😬'),
        ],
        'presa': 'Sab andar BAND hain 🔒 sirf CHAABI 🔑 wali team sabko azaad karegi!',
        'juntos': 'Sab saath start... aur peeche se deewar aa rahi hai 😱',
        'cta': ['End se pehle apni team COMMENT karo 👇', 'Apna guess COMMENT karo, end dekhne se pehle! 👇'],
        'extra': 'Which club wins? Comment before the end! ⚽',
        'follow': 'Follow karo — roz nayi race 🔔',
        'ou': ' ya ',
        'tags': ('#football #footballreels #ucl #premierleague #satisfying #oddlysatisfying #race #reelsindia '
                 '#trending #viral #explore #instareels'),
        'comentario': 'Kaun jeetega? 🏆 Comment karo 👇',
    },
}
LANG_PADRAO = 'en'
PRIMEIRO_COMENTARIO = TXT[LANG_PADRAO]['comentario']


def nomes(ids):
    lib = {e['id']: e['name'] for e in json.load(open(ROOT / 'src' / 'escudos.json'))}
    return [lib.get(i, i.replace('-', ' ').upper()) for i in ids]


def legenda(ids, desc, rnd=random, lang=LANG_PADRAO):
    t = TXT[lang]
    n = nomes(ids)
    times = ', '.join(n[:-1]) + t['ou'] + n[-1] if len(n) > 1 else n[0]
    juntos = 'sem prisão' in desc or 'juntos' in desc
    linhas = [rnd.choice(t['ganchos']).format(times=times), t['juntos'] if juntos else t['presa']]
    for chave, txt in t['mecanica']:
        if chave in desc:
            linhas.append(txt)
            break
    linhas += [rnd.choice(t['cta']), t['extra'], t['follow'], '', t['tags']]
    return '\n'.join(linhas) + '\n'


if __name__ == '__main__':
    args = sys.argv[1:]
    lang = LANG_PADRAO
    if '--lang' in args:
        i = args.index('--lang'); lang = args[i + 1]; del args[i:i + 2]
    seed = next((int(x.split('=')[1]) for x in args if x.startswith('--seed=')), None)
    a = [x for x in args if not x.startswith('--seed')]
    t = legenda(a[0].split(','), a[1] if len(a) > 1 else '', random.Random(seed), lang)
    if len(a) > 2:
        Path(a[2]).write_text(t)
    print(t)
