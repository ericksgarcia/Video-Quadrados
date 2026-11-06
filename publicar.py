#!/usr/bin/env python3
"""Publicação dos vídeos prontos: Cloudflare R2 -> Buffer (TikTok + Instagram, mesmo horário).

Só publica o que já existe; não gera vídeo, voz, imagem nem roteiro.

Uso:
  python3 publicar.py --fila                      posts agendados no TikTok + próximo horário livre
  python3 publicar.py VIDEO.mp4 --legenda L.txt   agenda (padrão: as duas redes, próximo horário livre)
      [--capa-s 1.2] [--quando AAAA-MM-DDTHH:MM] [--agora] [--redes tiktok,instagram]
  python3 publicar.py --status SLUG               status dos posts do vídeo
  python3 publicar.py --lista                     o que está em pendentes/ e enviados/ no R2
  python3 publicar.py --arruma                    move para enviados/ o que já foi publicado
  python3 publicar.py --cancela SLUG              apaga os posts AGENDADOS do vídeo e o tira de pendentes/

Chaves: NUNCA neste arquivo. O proxy do ambiente injeta "Authorization: Bearer ..." em api.buffer.com e
api.cloudflare.com; se as variáveis BUFFER_TOKEN / CLOUDFLARE_API_TOKEN não existirem, vai um valor fictício.
"""
import argparse
import json
import os
import re
import sys
import urllib.parse
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import requests

# ------------------------------------------------------------------ configuração fixa
TZ = ZoneInfo('America/Sao_Paulo')
HORARIOS = ['07:50', '11:50', '16:50', '20:30']           # horários de postagem (Brasília)
CF_CONTA = '255764ef4414e924c3f8b3e571f7435e'
R2_BUCKET = 'xlaudebuffer'
R2_PUBLICO = 'https://pub-cd071ac800384b009eaf3ddab42583fe.r2.dev'
PASTA_PEND = 'aprendendo-facil/pendentes/'
PASTA_ENV = 'aprendendo-facil/enviados/'
CF_API = f'https://api.cloudflare.com/client/v4/accounts/{CF_CONTA}/r2/buckets/{R2_BUCKET}/objects'
BUFFER_API = 'https://api.buffer.com'
BUFFER_ORG = '6ae886087fd694bcfd819a92'
CANAIS = {  # rede -> (service, nome do canal). Os NOMES são a referência; os ids são descobertos por consulta.
    'tiktok': ('tiktok', 'aprendendo.facil99'),
    'instagram': ('instagram', 'disputadostimes'),
}
REGISTRO = Path(__file__).with_name('publicados.json')
MARGEM = timedelta(minutes=5)

H_BUFFER = {'Authorization': 'Bearer ' + os.environ.get('BUFFER_TOKEN', 'dummy'), 'Content-Type': 'application/json'}
H_CF = {'Authorization': 'Bearer ' + os.environ.get('CLOUDFLARE_API_TOKEN', 'dummy')}


def falha(msg):
    print('ERRO:', msg, file=sys.stderr)
    sys.exit(1)


def checa_http(r, qual):
    if r.status_code in (401, 403):
        falha(f'{qual} respondeu {r.status_code}: falta o segredo de {qual} no ambiente (ou ele não cobre este caminho). Parei.')
    if r.status_code == 407 or (r.status_code == 403 and 'proxy' in r.text.lower()):
        falha(f'host de {qual} bloqueado pela rede do ambiente. Parei.')


# ------------------------------------------------------------------ Buffer (GraphQL)
def gql(query, variables=None):
    try:
        r = requests.post(BUFFER_API, json={'query': query, 'variables': variables or {}}, headers=H_BUFFER, timeout=60)
    except requests.RequestException as e:
        falha(f'sem conexão com api.buffer.com: {e}')
    checa_http(r, 'Buffer')
    try:
        d = r.json()
    except ValueError:
        falha(f'Buffer respondeu {r.status_code} sem JSON: {r.text[:300]}')
    return d


def gql_ok(query, variables=None):
    d = gql(query, variables)
    if d.get('errors'):
        falha('Buffer: ' + '; '.join(e.get('message', str(e)) for e in d['errors']))
    return d['data']


def canais():
    data = gql_ok('query($o: OrganizationId!){ channels(input:{organizationId:$o}) { id name service isDisconnected } }', {'o': BUFFER_ORG})
    out = {}
    for rede, (service, nome) in CANAIS.items():
        achados = [c for c in data['channels'] if c['service'] == service and c['name'] == nome]
        if not achados:
            falha(f'canal {rede} "{nome}" não existe no Buffer. Parei (não posto em outro canal).')
        c = achados[0]
        if c['isDisconnected']:
            falha(f'canal {rede} "{nome}" está DESCONECTADO no Buffer. Reconecte e rode de novo.')
        out[rede] = c['id']
    return out


POST_CAMPOS = 'id status dueAt channelService externalLink error { message }'


def posts_agendados(canal_id):
    q = '''query($o: OrganizationId!, $c: [ChannelId!], $after: String){
      posts(first: 50, after: $after, input:{organizationId:$o, filter:{channelIds:$c, status:[scheduled]}, sort:[{field:dueAt, direction:asc}]}) {
        edges { node { %s text } } pageInfo { hasNextPage endCursor } } }''' % POST_CAMPOS
    out, after = [], None
    while True:
        d = gql_ok(q, {'o': BUFFER_ORG, 'c': [canal_id], 'after': after})['posts']
        out += [e['node'] for e in d['edges']]
        if not d['pageInfo']['hasNextPage']:
            return out
        after = d['pageInfo']['endCursor']


def post_por_id(pid):
    """Devolve o post, ou None se o Buffer responder 'Post not found'."""
    d = gql('query($i: PostId!){ post(input:{id:$i}) { %s } }' % POST_CAMPOS, {'i': pid})
    if d.get('errors'):
        msgs = '; '.join(e.get('message', '') for e in d['errors'])
        if any((e.get('extensions') or {}).get('code') == 'NOT_FOUND' or 'not found' in e.get('message', '').lower() for e in d['errors']):
            return None
        falha('Buffer: ' + msgs)
    return d['data']['post']


CRIA = '''mutation($input: CreatePostInput!){ createPost(input:$input){
  __typename
  ... on PostActionSuccess { post { id status dueAt channelService } }
  ... on NotFoundError { message } ... on UnauthorizedError { message } ... on UnexpectedError { message }
  ... on RestProxyError { message } ... on LimitReachedError { message } ... on InvalidInputError { message } } }'''


def cria_post(rede, canal_id, texto, link, capa_ms, quando_utc):
    meta = {'tiktok': {'tiktok': {'isAiGenerated': False}},
            'instagram': {'instagram': {'type': 'reel', 'shouldShareToFeed': True, 'isAiGenerated': False}}}[rede]
    inp = {
        'channelId': canal_id, 'text': texto,
        'assets': [{'video': {'url': link, 'metadata': {'thumbnailOffset': capa_ms}}}],
        'metadata': meta, 'schedulingType': 'automatic', 'needsApproval': False,
        'mode': 'shareNow' if quando_utc is None else 'customScheduled',
    }
    if quando_utc is not None:
        inp['dueAt'] = quando_utc.strftime('%Y-%m-%dT%H:%M:%S.000Z')
    res = gql_ok(CRIA, {'input': inp})['createPost']
    if res['__typename'] != 'PostActionSuccess':
        falha(f'{rede}: Buffer recusou o post ({res["__typename"]}): {res.get("message")}')
    return res['post']


# ------------------------------------------------------------------ Cloudflare R2
def r2_url(chave):
    return f'{CF_API}/{urllib.parse.quote(chave, safe="")}'


def r2_put(chave, dados, tipo='video/mp4'):
    try:
        r = requests.put(r2_url(chave), data=dados, headers={**H_CF, 'Content-Type': tipo}, timeout=600)
    except requests.RequestException as e:
        falha(f'sem conexão com api.cloudflare.com: {e}')
    checa_http(r, 'Cloudflare')
    if not r.ok or not r.json().get('success', False):
        falha(f'R2 recusou o envio de {chave}: {r.status_code} {r.text[:300]}')


def r2_get(chave):
    r = requests.get(r2_url(chave), headers=H_CF, timeout=600)
    checa_http(r, 'Cloudflare')
    if not r.ok:
        falha(f'R2 não devolveu {chave}: {r.status_code} {r.text[:200]}')
    return r.content


def r2_delete(chave):
    if not (chave.startswith(PASTA_PEND) or chave.startswith(PASTA_ENV)):
        falha(f'recusei apagar {chave}: fora das pastas deste canal')
    r = requests.delete(r2_url(chave), headers=H_CF, timeout=60)
    checa_http(r, 'Cloudflare')
    if not r.ok:
        falha(f'R2 não apagou {chave}: {r.status_code} {r.text[:200]}')


def r2_lista(prefixo):
    out, cursor = [], None
    while True:
        params = {'prefix': prefixo, 'per_page': 1000}
        if cursor:
            params['cursor'] = cursor
        r = requests.get(CF_API, params=params, headers=H_CF, timeout=60)
        checa_http(r, 'Cloudflare')
        d = r.json()
        if not d.get('success'):
            falha(f'R2 não listou {prefixo}: {d.get("errors")}')
        out += d.get('result') or []
        cursor = (d.get('result_info') or {}).get('cursor')
        if not cursor or not (d.get('result_info') or {}).get('is_truncated'):
            return out


def link_publico(chave):
    return f'{R2_PUBLICO}/{chave}'


def confere_link(link, tamanho):
    try:
        r = requests.get(link, timeout=600)
    except requests.RequestException as e:
        falha(f'link público inacessível ({e}); host *.r2.dev bloqueado?')
    tam = len(r.content)
    cl = r.headers.get('Content-Length')
    if r.status_code != 200 or tam != tamanho or (cl is not None and int(cl) != tamanho):
        falha(f'link público não devolveu o arquivo completo: HTTP {r.status_code}, Content-Length {cl}, recebido {tam}, local {tamanho}. Parei.')
    return cl


# ------------------------------------------------------------------ registro e horários
def le_registro():
    return json.loads(REGISTRO.read_text()) if REGISTRO.exists() else []


def grava_registro(reg):
    REGISTRO.write_text(json.dumps(reg, ensure_ascii=False, indent=2) + '\n')


def slug_de(caminho):
    s = Path(caminho).stem.lower()
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s or 'video'


def proximo_horario(ultimo_utc):
    """Próximo horário da lista (Brasília), depois do último agendado e >= agora + 5 min."""
    agora = datetime.now(timezone.utc)
    piso = agora + MARGEM
    dia = (max(piso, ultimo_utc) if ultimo_utc else piso).astimezone(TZ).date()
    for k in range(0, 60):
        d = dia + timedelta(days=k)
        for h in HORARIOS:
            hh, mm = map(int, h.split(':'))
            t = datetime(d.year, d.month, d.day, hh, mm, tzinfo=TZ).astimezone(timezone.utc)
            if t >= piso and (ultimo_utc is None or t > ultimo_utc):
                return t
    falha('não achei horário livre nos próximos 60 dias')


def dt(s):
    return datetime.fromisoformat(s.replace('Z', '+00:00'))


def br(t):
    return t.astimezone(TZ).strftime('%d/%m/%Y %H:%M (Brasília)')


# ------------------------------------------------------------------ comandos
def cmd_fila():
    ids = canais()
    fila = posts_agendados(ids['tiktok'])
    print(f'TikTok "{CANAIS["tiktok"][1]}": {len(fila)} post(s) agendado(s)')
    for p in fila:
        print(f'  {br(dt(p["dueAt"]))}  post {p["id"]}  {p["status"]}  {p["text"][:60]!r}')
    ultimo = max((dt(p['dueAt']) for p in fila if p.get('dueAt')), default=None)
    print('Próximo horário livre:', br(proximo_horario(ultimo)))


def cmd_status(slug):
    reg = [x for x in le_registro() if x['slug'] == slug]
    if not reg:
        falha(f'nenhum post registrado para o slug "{slug}" em publicados.json')
    for x in reg:
        p = post_por_id(x['post_id'])
        if p is None:
            print(f'{x["rede"]}: post {x["post_id"]} NÃO ENCONTRADO no Buffer (não confirmado)')
            continue
        quando = br(dt(p['dueAt'])) if p.get('dueAt') else '-'
        extra = f'  erro: {p["error"]["message"]}' if p.get('error') else ''
        extra += f'  link: {p["externalLink"]}' if p.get('externalLink') else ''
        print(f'{x["rede"]}: post {p["id"]} {p["status"]}  {quando}{extra}')


def cmd_lista():
    for pasta in (PASTA_PEND, PASTA_ENV):
        objs = r2_lista(pasta)
        print(f'{pasta}  ({len(objs)} arquivo(s))')
        for o in objs:
            print(f'  {o["key"]}  {o.get("size", "?")} bytes  {o.get("last_modified", "")}')


def cmd_arruma():
    reg = le_registro()
    slugs = sorted({x['slug'] for x in reg if (x.get('chave_r2') or '').startswith(PASTA_PEND) and not x.get('cancelado')})
    if not slugs:
        print('Nada em pendentes/ registrado para arrumar.')
    for slug in slugs:
        itens = [x for x in reg if x['slug'] == slug and not x.get('cancelado')]
        estados, faltou = [], False
        for x in itens:
            p = post_por_id(x['post_id'])
            if p is None:
                print(f'AVISO {slug}: {x["rede"]} post {x["post_id"]} não encontrado no Buffer (não confirmado); fica em pendentes/.')
                faltou = True
                continue
            estados.append(p['status'])
            x['status'] = p['status']
        if faltou or not estados or any(s != 'sent' for s in estados):
            if not faltou:
                print(f'{slug}: ainda não saiu em todas as redes ({", ".join(estados)}); fica em pendentes/.')
            continue
        velha = itens[0]['chave_r2']
        nova = PASTA_ENV + velha[len(PASTA_PEND):]
        dados = r2_get(velha)
        r2_put(nova, dados)
        if not any(o['key'] == nova and int(o.get('size', -1)) == len(dados) for o in r2_lista(nova)):
            falha(f'cópia de {velha} para {nova} não confirmada; nada apagado')
        r2_delete(velha)
        for x in itens:
            x['chave_r2'] = nova
            x['link_atual'] = link_publico(nova)
        grava_registro(reg)
        print(f'{slug}: publicado em todas as redes -> movido para {nova}')
    grava_registro(reg)


APAGA = '''mutation($i: PostId!){ deletePost(input:{id:$i}){ __typename ... on DeletePostSuccess { id } ... on VoidMutationError { message } } }'''


def cmd_cancela(slug):
    """Apaga os posts AGENDADOS do vídeo no Buffer, tira o vídeo de pendentes/ e marca 'cancelado' no registro."""
    reg = le_registro()
    itens = [x for x in reg if x['slug'] == slug and not x.get('cancelado')]
    if not itens:
        falha(f'nenhum post ativo registrado para "{slug}"')
    for x in itens:
        p = post_por_id(x['post_id'])
        if p is None:
            print(f'{x["rede"]}: post {x["post_id"]} não encontrado no Buffer (já apagado?)')
        elif p['status'] != 'scheduled':
            falha(f'{x["rede"]}: post {x["post_id"]} está "{p["status"]}" (não agendado); não cancelo post que já saiu')
        else:
            res = gql_ok(APAGA, {'i': x['post_id']})['deletePost']
            if res['__typename'] != 'DeletePostSuccess':
                falha(f'{x["rede"]}: Buffer não apagou o post: {res.get("message")}')
            print(f'{x["rede"]}: post {x["post_id"]} apagado do Buffer')
        x['cancelado'] = True
        x['status'] = 'cancelado'
        grava_registro(reg)
    chave = itens[0].get('chave_r2')
    if chave and chave.startswith(PASTA_PEND) and not any(x['chave_r2'] == chave and not x.get('cancelado') for x in reg):
        if any(o['key'] == chave for o in r2_lista(chave)):
            r2_delete(chave)
            print(f'R2: {chave} apagado')


def cmd_publicar(a):
    video = Path(a.video)
    if not video.is_file():
        falha(f'vídeo não encontrado: {video}')
    # legenda: --legenda (arquivo .txt ou texto) ou VIDEO.txt ao lado do vídeo
    if a.legenda:
        texto = Path(a.legenda).read_text().strip() if Path(a.legenda).is_file() else a.legenda.strip()
    elif video.with_suffix('.txt').is_file():
        texto = video.with_suffix('.txt').read_text().strip()
    else:
        falha('falta a legenda: passe --legenda ARQUIVO.txt (ou o texto), ou deixe VIDEO.txt ao lado do vídeo')
    if not texto:
        falha('a legenda está vazia')
    redes = [r.strip() for r in a.redes.split(',') if r.strip()]
    for r in redes:
        if r not in CANAIS:
            falha(f'rede desconhecida: {r} (use tiktok,instagram)')
    capa_ms = int(round(a.capa_s * 1000))
    slug = slug_de(video)
    chave = PASTA_PEND + slug + '.mp4'
    link = link_publico(chave)
    reg = le_registro()
    ja = {x['rede']: x for x in reg if x['slug'] == slug and not x.get('cancelado')}
    faltam = [r for r in redes if r not in ja]
    for r in redes:
        if r in ja:
            print(f'{r}: já existe post {ja[r]["post_id"]} para "{slug}" ({ja[r]["agendado"]}); pulei (sem duplicar).')
    if not faltam:
        return

    ids = canais()

    # horário
    agora = datetime.now(timezone.utc)
    if a.agora:
        quando = None
    elif a.quando:
        q = datetime.fromisoformat(a.quando)
        quando = (q if q.tzinfo else q.replace(tzinfo=TZ)).astimezone(timezone.utc)
        if quando < agora + MARGEM:
            falha(f'--quando {a.quando} não está pelo menos 5 minutos no futuro')
    elif 'tiktok' in ja:  # Instagram avulso: mesmo horário do TikTok já registrado
        quando = dt(ja['tiktok']['agendado'])
        if quando < agora + MARGEM:
            falha(f'o horário do TikTok ({br(quando)}) já passou; use --quando para escolher outro')
    else:
        fila = posts_agendados(ids['tiktok'])
        quando = proximo_horario(max((dt(p['dueAt']) for p in fila if p.get('dueAt')), default=None))
    print(f'Vídeo: {video}  slug: {slug}  capa: {capa_ms} ms')
    print('Horário:', 'AGORA' if quando is None else br(quando))

    # 1) R2: envia (se ainda não estiver lá inteiro) e confere o link público
    tamanho = video.stat().st_size
    no_r2 = [o for o in r2_lista(chave) if o['key'] == chave]
    if no_r2 and int(no_r2[0].get('size', -1)) == tamanho:
        print(f'R2: {chave} já está lá ({tamanho} bytes); não reenviei.')
    else:
        print(f'R2: enviando {tamanho} bytes para {chave} ...')
        with open(video, 'rb') as f:
            r2_put(chave, f)
    cl = confere_link(link, tamanho)
    print(f'R2: link público OK (HTTP 200, Content-Length {cl} = {tamanho}): {link}')

    # 2) Buffer: um post por rede, mesmo horário/vídeo/legenda/capa
    for r in faltam:
        p = cria_post(r, ids[r], texto, link, capa_ms, quando)
        item = {'slug': slug, 'rede': r, 'post_id': p['id'], 'canal': CANAIS[r][1],
                'agendado': p.get('dueAt') or (quando.isoformat() if quando else agora.isoformat()),
                'link': link, 'chave_r2': chave, 'capa_ms': capa_ms, 'status': p.get('status')}
        reg.append(item)
        grava_registro(reg)  # grava a cada post: se o próximo falhar, este não é duplicado depois
        print(f'{r}: post {p["id"]} {p.get("status")}  {br(dt(item["agendado"]))}')


def main():
    ap = argparse.ArgumentParser(description='Publica vídeos prontos: R2 -> Buffer (TikTok + Instagram).')
    ap.add_argument('video', nargs='?')
    ap.add_argument('--legenda')
    ap.add_argument('--capa-s', type=float, default=1.2)
    ap.add_argument('--agora', action='store_true')
    ap.add_argument('--quando')
    ap.add_argument('--redes', default='tiktok,instagram')
    ap.add_argument('--fila', action='store_true')
    ap.add_argument('--status')
    ap.add_argument('--lista', action='store_true')
    ap.add_argument('--arruma', action='store_true')
    ap.add_argument('--cancela', metavar='SLUG')
    a = ap.parse_args()
    if a.fila:
        cmd_fila()
    elif a.status:
        cmd_status(a.status)
    elif a.lista:
        cmd_lista()
    elif a.arruma:
        cmd_arruma()
    elif a.cancela:
        cmd_cancela(a.cancela)
    elif a.video:
        cmd_publicar(a)
    else:
        ap.print_help()


if __name__ == '__main__':
    main()
