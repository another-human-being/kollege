import sys, re, os
# Baut artboards/<Name>.dc.html aus quellen/<Name>.html + quellen/<Name>.js
# Aufruf: python3 build.py Main Chat Vorgang ...
# Body line 1: "title|width|height|extra-css". Body may start with @@SIDE:<key>@@ (sidebar layout).
# Tokens: @@KC@@ (context-chat drawer markup), JS gets shared methods injected (kgChats, kc*).
ROOT = os.path.dirname(os.path.abspath(__file__))
NAV = [('Main.dc.html', 'heute', 'main'), ('Chat.dc.html', 'chat', 'chat'),
       ('#', 'Werkzeuge', None),
       ('Mail.dc.html', 'mail', 'mail'), ('Kalender.dc.html', 'kalender', 'kalender'), ('Aufgaben.dc.html', 'aufgaben', 'aufgaben'), ('Dateien.dc.html', 'dateien', 'dateien'), ('Kontakte.dc.html', 'kontakte', 'kontakte'),
       ('#', 'Bereiche', None),
       ('Gruendungsteams.dc.html', 'gründungsteams', 'gruendungsteams'), ('Events.dc.html', 'events', 'events'), ('Lehre.dc.html', 'lehre', 'lehre'), ('SocialMedia.dc.html', 'social media', 'socialmedia'),
       ('Einstellungen.dc.html', '+ Bereich', 'plus'),
       ('#', '', None),
       ('Einstellungen.dc.html', 'einstellungen', 'einstellungen')]
ZAHLEN = {'mail': '4'}
# Bereich-Vorlage: eine Quelle (Bereich.html/.js), vier Artboards
BEREICHE = {'Gruendungsteams': ('gruendungsteams', 'Gründungsteams'), 'Events': ('events', 'Events'), 'Lehre': ('lehre', 'Lehre'), 'SocialMedia': ('socialmedia', 'Social Media')}

def nav_html(active, buttons=None):
    links = ''
    for h, l, k in NAV:
        if k is None:
            links += ('<span class="nav-gruppe">' + l + '</span>\n') if l else '<span class="nav-luecke" aria-hidden="true"></span>\n'
            continue
        cur = ' aria-current="page"' if k == active else ''
        if k == 'plus':
            links += '<a href="' + h + '" class="nav-plus">' + l + '</a>\n'; continue
        zahl = ('<span class="kg-nav-zahl" style="color: var(--ink-muted)">' + ZAHLEN[k] + '</span>') if k in ZAHLEN else ''
        if buttons and k in buttons:
            links += '<button type="button" aria-current="{{' + buttons[k][0] + '}}" onClick="{{' + buttons[k][1] + '}}"><span class="kg-nav-slash">/</span>' + l + '</button>\n'
        else:
            links += '<a href="' + h + '"' + cur + '><span class="kg-nav-slash">/</span>' + l + zahl + '</a>\n'
    return '<nav class="kg-seitennav" aria-label="Hauptnavigation">\n' + links + '</nav>'

def side(active):
    return """<aside style="width: 264px; flex-shrink: 0; box-sizing: border-box; height: 100%; border-right: 1px solid var(--rule); padding: 20px 16px; display: flex; flex-direction: column; gap: 20px; overflow-y: auto">
<div style="font-weight: 600; padding: 0 8px">Kollege</div>
""" + nav_html(active) + """
<x-import component-from-global-scope="Kollege.ChatListe" chats="{{sidebarChats}}" neu-href="Main.dc.html"></x-import>
<div style="margin-top: auto; font-size: 13px; color: var(--ink-muted); padding: 0 8px">@@WER@@ · Gründungszentrum</div>
</aside>
<div style="flex-grow: 1; min-width: 0; height: 100%; position: relative; overflow: hidden">
"""

KC_HTML = open(f'{ROOT}/quellen/_kc.html').read()
KCIN_HTML = open(f'{ROOT}/quellen/_kcin.html').read()
TOAST_HTML = open(f'{ROOT}/quellen/_toast.html').read()
PRUEF_HTML = open(f'{ROOT}/quellen/_pruef.html').read()
LD_CSS = open(f'{ROOT}/quellen/_ld.css').read()
SHARED_JS = open(f'{ROOT}/quellen/_shared.js').read()

HEAD = '''<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
<link rel="stylesheet" href="ds/kollege/tokens.css">
<link rel="stylesheet" href="ds/kollege/components/bundle.css">
<script src="ds/kollege/components/bundle.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&amp;family=IBM+Plex+Sans:wght@400;500;600&amp;family=IBM+Plex+Serif:ital,wght@1,400&amp;display=swap">
<style>
body{{margin:0;background:#fbfbfa}}
a:not([class]){{color:inherit}}
a.kg-aktion--primaer,a.kg-aktion--sekundaer{{text-decoration:none}}
.kg-seitennav{{display:flex;flex-direction:column;gap:2px}}
.kg-seitennav a{{padding:4px 8px;border-radius:2px;color:var(--ink-muted);text-decoration:none;font-size:14px;line-height:20px}}
.kg-seitennav a:hover{{color:var(--ink)}}
.kg-seitennav a[aria-current="page"]{{color:var(--ink);background:var(--paper-sunk)}}
.nav-luecke{{display:block;height:12px}}
.nav-gruppe{{display:block;padding:14px 8px 4px;font-size:11px;line-height:16px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-faint)}}
.kg-seitennav a.nav-plus{{color:var(--ink-faint);font-size:13px}}
.h1{{margin:0;font-size:28px;line-height:34px;font-weight:500;letter-spacing:-0.01em}}
.label{{font-size:12px;line-height:16px;font-weight:500;letter-spacing:.06em;text-transform:uppercase}}
.mono{{font-family:var(--font-mono);font-size:12px;line-height:16px;color:var(--ink-muted)}}
{extra}
</style>
</helmet>
<div class="kg" style="width: {w}px; height: {h}px; box-sizing: border-box; position: relative; display: flex; background: var(--paper); color: var(--ink); font-family: var(--font-sans); overflow: hidden">
'''
TAIL = '''</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{w},"height":{h}}}}}'>
{js}
</script>
</body>
</html>
'''
for name in sys.argv[1:]:
    quelle = 'Bereich' if name in BEREICHE else name
    body = open(f'{ROOT}/quellen/{quelle}.html').read()
    if name in BEREICHE:
        key, titel = BEREICHE[name]
        body = body.replace('@@BEREICH@@', key).replace('@@BTITEL@@', titel)
    first, body = body.split('\n', 1)
    parts = first.split('|')
    title, w, h = parts[:3]
    extra = parts[3] if len(parts) > 3 else ''
    m = re.match(r'@@SIDE:(\w+)@@\n', body)
    close = ''
    if m:
        body = side(m.group(1)) + body[m.end():]
        close = '</div>\n'
    else:
        body = '<div style="flex-grow: 1; min-width: 0; height: 100%; position: relative">\n' + body
        close = '</div>\n'
    wer = 'Andreas'
    mm = re.search(r'@@ALS:(\w+)@@\n?', body)
    if mm:
        wer = mm.group(1); body = body.replace(mm.group(0), '')
    body = body.replace('@@WER@@', wer)
    body = body.replace('@@KC@@', KC_HTML).replace('@@KCIN@@', KCIN_HTML).replace('@@TOAST@@', TOAST_HTML).replace('@@PRUEF@@', PRUEF_HTML)
    js = open(f'{ROOT}/quellen/{quelle}.js').read()
    if name in BEREICHE: js = js.replace('@@BEREICH@@', BEREICHE[name][0])
    mn = re.search(r'@@NAV:(\w+)@@', body)
    if mn: body = body.replace(mn.group(0), nav_html(mn.group(1), {'main': ('navUebersicht', 'zurUebersicht'), 'chat': ('navChat', 'zumChat')}))
    js = js.replace('class Component extends DCLogic {', 'class Component extends DCLogic {\n' + SHARED_JS, 1)
    extra = LD_CSS + extra
    out = HEAD.format(title=title, w=w, h=h, extra=extra) + body.rstrip() + '\n' + close + TAIL.format(w=w, h=h, js=js.rstrip())
    open(f'{ROOT}/artboards/{name}.dc.html', 'w').write(out)
    print(name, len(out))
