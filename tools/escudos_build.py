#!/usr/bin/env python3
"""Monta a biblioteca assets/escudos/ (PNG sem fundo, quadrado 256x256) + src/escudos.json.

Fontes (GitHub, públicas):
  BR : Lobobinho/Escudos-dos-Clubes-do-Brasileirao-2026  (20 clubes da Série A 2026, 500x500 RGBA)
  EU : luukhopman/football-logos  (logos/<liga>/<time>.png, 139x181 RGBA)
Uso: python3 -I tools/escudos_build.py <pasta_br> <pasta_eu_logos> <saida_assets/escudos>
"""
import json, os, sys
from PIL import Image

BR = [  # id, nome de exibição, arquivo
 ('flamengo','FLAMENGO','Flamengo'),('palmeiras','PALMEIRAS','Palmeiras'),('corinthians','CORINTHIANS','Corinthians'),
 ('sao-paulo','SÃO PAULO','São Paulo'),('santos','SANTOS','Santos'),('fluminense','FLUMINENSE','Fluminense'),
 ('botafogo','BOTAFOGO','Botafogo'),('vasco','VASCO','Vasco da Gama'),('cruzeiro','CRUZEIRO','Cruzeiro'),
 ('atletico-mg','ATLÉTICO-MG','Atlético Mineiro'),('gremio','GRÊMIO','Grêmio'),('internacional','INTERNACIONAL','Internacional'),
 ('bahia','BAHIA','Bahia'),('vitoria','VITÓRIA','Vitória'),('bragantino','BRAGANTINO','Red Bull Bragantino'),
 ('athletico-pr','ATHLETICO-PR','Athletico Paranaense'),('mirassol','MIRASSOL','Mirassol'),('chapecoense','CHAPECOENSE','Chapecoense'),
 ('coritiba','CORITIBA','Coritiba'),('remo','REMO','Remo'),
]
EU = [  # id, nome, liga, arquivo
 ('arsenal','ARSENAL','England - Premier League','Arsenal FC'),('chelsea','CHELSEA','England - Premier League','Chelsea FC'),
 ('liverpool','LIVERPOOL','England - Premier League','Liverpool FC'),('man-city','MAN. CITY','England - Premier League','Manchester City'),
 ('man-united','MAN. UNITED','England - Premier League','Manchester United'),('tottenham','TOTTENHAM','England - Premier League','Tottenham Hotspur'),
 ('newcastle','NEWCASTLE','England - Premier League','Newcastle United'),('aston-villa','ASTON VILLA','England - Premier League','Aston Villa'),
 ('real-madrid','REAL MADRID','Spain - LaLiga','Real Madrid'),('barcelona','BARCELONA','Spain - LaLiga','FC Barcelona'),
 ('atletico-madrid','ATLÉTICO MADRID','Spain - LaLiga','Atlético de Madrid'),('sevilla','SEVILLA','Spain - LaLiga','Sevilla FC'),
 ('valencia','VALENCIA','Spain - LaLiga','Valencia CF'),('villarreal','VILLARREAL','Spain - LaLiga','Villarreal CF'),
 ('athletic-bilbao','ATHLETIC BILBAO','Spain - LaLiga','Athletic Bilbao'),('real-sociedad','REAL SOCIEDAD','Spain - LaLiga','Real Sociedad'),
 ('milan','MILAN','Italy - Serie A','AC Milan'),('inter','INTER','Italy - Serie A','Inter Milan'),
 ('juventus','JUVENTUS','Italy - Serie A','Juventus FC'),('roma','ROMA','Italy - Serie A','AS Roma'),
 ('napoli','NAPOLI','Italy - Serie A','SSC Napoli'),('lazio','LAZIO','Italy - Serie A','SS Lazio'),
 ('atalanta','ATALANTA','Italy - Serie A','Atalanta BC'),('fiorentina','FIORENTINA','Italy - Serie A','ACF Fiorentina'),
 ('bayern','BAYERN','Germany - Bundesliga','Bayern Munich'),('dortmund','DORTMUND','Germany - Bundesliga','Borussia Dortmund'),
 ('leverkusen','LEVERKUSEN','Germany - Bundesliga','Bayer 04 Leverkusen'),('leipzig','RB LEIPZIG','Germany - Bundesliga','RB Leipzig'),
 ('frankfurt','EINTRACHT','Germany - Bundesliga','Eintracht Frankfurt'),('stuttgart','STUTTGART','Germany - Bundesliga','VfB Stuttgart'),
 ('psg','PSG','France - Ligue 1','Paris Saint-Germain'),('marseille','MARSEILLE','France - Ligue 1','Olympique Marseille'),
 ('lyon','LYON','France - Ligue 1','Olympique Lyon'),('monaco','MONACO','France - Ligue 1','AS Monaco'),
 ('lille','LILLE','France - Ligue 1','LOSC Lille'),('lens','LENS','France - Ligue 1','RC Lens'),
]
S = 256

def conv(src, dst):
    im = Image.open(src).convert('RGBA')
    bb = im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    im = im.crop(bb)
    k = (S - 8) / max(im.size)  # margem de 4px
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    out = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    out.paste(im, ((S - im.width) // 2, (S - im.height) // 2), im)
    out.save(dst, optimize=True)

def main(br, eu, out):
    os.makedirs(out, exist_ok=True)
    lib = []
    for i, n, f in BR:
        conv(f'{br}/{f}.png', f'{out}/{i}.png'); lib.append({'id': i, 'name': n, 'group': 'br', 'src': f'assets/escudos/{i}.png'})
    for i, n, lg, f in EU:
        conv(f'{eu}/{lg}/{f}.png', f'{out}/{i}.png'); lib.append({'id': i, 'name': n, 'group': 'eu', 'league': lg.split(' - ')[1], 'src': f'assets/escudos/{i}.png'})
    json.dump(lib, open(os.path.join(os.path.dirname(out.rstrip('/')), '..', 'src', 'escudos.json'), 'w'), ensure_ascii=False, indent=1)
    print(len(lib), 'escudos')

main(*sys.argv[1:4])
