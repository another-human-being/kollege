import sys, re, os
# Baut artboards/<Name>.dc.html aus quellen/<Name>.html + quellen/<Name>.js
# Aufruf: python3 build.py Main Chat Vorgang ...
# Body line 1: "title|width|height|extra-css". Body may start with @@SIDE:<key>@@ (sidebar layout).
# Tokens: @@KC@@ (context-chat drawer markup), JS gets shared methods injected (kgChats, kc*).
ROOT = os.path.dirname(os.path.abspath(__file__))
# Seitenleiste (E51, E55): ein Feld „Neuer Chat oder Suche“ · Heute/Chat · Werkzeuge · Bereiche als Baum · Einstellungen · Konto unten
NAV_OBEN = [('Main.dc.html', 'Heute', 'main'), ('Chat.dc.html', 'Chat', 'chat')]
NAV_WERKZEUGE = [('Mail.dc.html', 'Mail', 'mail'), ('Kalender.dc.html', 'Kalender', 'kalender'), ('Aufgaben.dc.html', 'Aufgaben', 'aufgaben'), ('Dateien.dc.html', 'Dateien', 'dateien'), ('Kontakte.dc.html', 'Kontakte', 'kontakte')]
NAV_BEREICHE = [('Gruendungsteams.dc.html', 'Gründungsteams', 'gruendungsteams'), ('Events.dc.html', 'Events', 'events'), ('Lehre.dc.html', 'Lehre', 'lehre'), ('SocialMedia.dc.html', 'Social Media', 'socialmedia')]
NAV_UNTEN = [('Einstellungen.dc.html', 'Einstellungen', 'einstellungen')]
# Baum (E55): laufende Einträge je Bereich (geprüft, nicht archiviert, nicht in Endphase), höchstens 5, dann „Alle N →“.
# Zahl = offene Aufgaben je Eintrag (Bestand, kein Neuigkeitszähler). Statisch aus aufgabenDaten (_shared.js) übernommen;
# auf den Bereichsseiten selbst rechnet Bereich.js sbBaum() live. Bei Datenänderung hier nachziehen.
BAUM = {
 'gruendungsteams': [('Solaro', 6), ('Kitchen Loop', 2), ('Nordlicht Analytics', 1)],
 'events': [('Gründungsnacht 2026', 2), ('Pitch-Abend', 3)],
 'lehre': [('Entrepreneurship Basics', 2), ('Design Thinking Workshop', 0), ('Gründungsseminar', 0)],
 'socialmedia': [('Instagram', 0), ('LinkedIn', 0), ('Newsletter', 0)],  # Kanäle statt Beiträge (Kommentar 05.10.)
}
BAUM_START_OFFEN = 'gruendungsteams'
ZAHLEN = {}
# Bereich-Vorlage: eine Quelle (Bereich.html/.js), vier Artboards
BEREICHE = {'Gruendungsteams': ('gruendungsteams', 'Gründungsteams'), 'Events': ('events', 'Events'), 'Lehre': ('lehre', 'Lehre'), 'SocialMedia': ('socialmedia', 'Social Media')}

# Linien-Icons der Navigation (E54): 16 px, Strich 1,6 – immer mit Wort, eingeklappt mit Tooltip
ICON = {
 'main': '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
 'chat': '<path d="M4 5h16v11H9l-5 4z"/>',
 'mail': '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
 'kalender': '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
 'aufgaben': '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 12l3 3 5-6"/>',
 'dateien': '<path d="M3.5 6.5a1.5 1.5 0 0 1 1.5-1.5h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5V18a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z"/>',
 'kontakte': '<circle cx="9" cy="9" r="3.2"/><path d="M3.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5"/><path d="M15.5 6.2a3 3 0 0 1 0 5.6M17.5 14.8c1.4.6 2.4 1.9 2.9 4.2"/>',
 'gruendungsteams': '<path d="M12 20v-8"/><path d="M12 12c0-4 3-6 7-6 0 4-3 6-7 6z"/><path d="M12 14c0-3-2.5-5-6-5 0 3 2.5 5 6 5z"/>',
 'events': '<path d="M4 9a2 2 0 0 0 0 4v4h16v-4a2 2 0 0 0 0-4V6H4z"/><path d="M14 7v12" stroke-dasharray="2 2"/>',
 'lehre': '<path d="M2.5 9.5L12 5l9.5 4.5L12 14z"/><path d="M6.5 11.5V16c1.5 1.5 3.5 2 5.5 2s4-.5 5.5-2v-4.5"/>',
 'socialmedia': '<path d="M4 10v4h3l7 4V6L7 10z"/><path d="M17.5 9.5a3.5 3.5 0 0 1 0 5"/>',
 'einstellungen': '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
 'neu': '<path d="M12 20h8"/><path d="M15.5 4.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/>',
 'leiste': '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M9 4.5v15"/>',
 'suche': '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
 'pfeil': '<path d="M9 6l6 6-6 6"/>',
 'runter': '<path d="M6 9l6 6 6-6"/>',
 'plus': '<path d="M12 5v14M5 12h14"/>',
}
def icon(k, cls='nav-ic'):
    return '<svg class="' + cls + '" viewBox="0 0 24 24" aria-hidden="true">' + ICON[k] + '</svg>'

def nav_links(liste, active, buttons=None):
    out = ''
    for h, l, k in liste:
        cur = ' aria-current="page"' if k == active else ''
        inner = icon(k) + '<span class="sb-text">' + l + '</span>'
        if buttons and k in buttons:
            out += '<button type="button" title="' + l + '" aria-current="{{' + buttons[k][0] + '}}" onClick="{{' + buttons[k][1] + '}}">' + inner + '</button>\n'
        else:
            out += '<a href="' + h + '" title="' + l + '"' + cur + '>' + inner + '</a>\n'
    return out

def baum_html(active):
    out = ''
    for h, l, k in NAV_BEREICHE:
        cur = ' aria-current="page"' if k == active else ''
        offen = ' open="open"' if (k == active or (active not in BAUM and k == BAUM_START_OFFEN)) else ''
        out += ('<details class="sb-ast"' + offen + '><summary><a href="' + h + '" title="' + l + '"' + cur + '>' + icon(k) + '<span class="sb-text">' + l + '</span></a>'
            + '<span class="sb-auf sb-text" title="Einträge ein- oder ausklappen">' + icon('runter', 'nav-ic sb-pfeil') + '</span></summary>\n<div class="sb-baum">')
        if k == active:
            out += ('<sc-for list="{{sbBaum}}" as="e" hint-placeholder-count="3"><button type="button" class="sb-kind" aria-current="{{e.aktiv}}" onClick="{{e.los}}" title="{{e.tip}}">'
                '<span class="sb-text">{{e.titel}}</span><sc-if value="{{e.hatZahl}}" hint-placeholder-val="{{ true }}"><span class="sb-zahl sb-text">{{e.zahl}}</span></sc-if></button></sc-for>')
        else:
            for t, n in BAUM[k][:5]:
                tip = t + (' · ' + str(n) + ' offene Aufgabe' + ('n' if n != 1 else '') if n else '')
                out += '<a class="sb-kind" href="' + h + '" title="' + tip + '"><span class="sb-text">' + t + '</span>' + ('<span class="sb-zahl sb-text">' + str(n) + '</span>' if n else '') + '</a>'
        out += '</div>\n</details>\n'
    return out

def nav_html(active, buttons=None):
    return ('<nav class="kg-seitennav" aria-label="Hauptnavigation">\n'
        + '<div class="sb-block">\n' + nav_links(NAV_OBEN, active, buttons) + '</div>\n'
        + '<details class="sb-gruppe" open="open"><summary><span class="sb-text">Werkzeuge</span>' + icon('runter', 'nav-ic sb-pfeil') + '</summary>\n' + nav_links(NAV_WERKZEUGE, active) + '</details>\n'
        + '<details class="sb-gruppe" open="open"><summary><span class="sb-text">Bereiche</span>' + icon('runter', 'nav-ic sb-pfeil') + '</summary>\n' + baum_html(active) + '<a href="Einstellungen.dc.html" class="nav-plus" title="Bereich anlegen">' + icon('plus') + '<span class="sb-text">Bereich</span></a>\n</details>\n'
        + '<div class="sb-block">\n' + nav_links(NAV_UNTEN, active) + '</div>\n</nav>')

def side_inner(active, wer, buttons=None, neu=None):
    # E55: Neuer Chat und Suche sind ein Feld. Tippen sucht (Treffer zum Öffnen), Enter fragt Kollege in einem neuen Chat,
    # leeres Feld + Enter = leerer neuer Chat. Backend siehe docs/ENTSCHEIDUNGEN.md → „Hinweise für den Bau“.
    neu_attr = ('type="button" onClick="{{' + neu + '}}"') if neu else 'href="Chat.dc.html"'
    neu_tag = 'button' if neu else 'a'
    feld_html = ('<div class="sb-frage">\n<label class="sb-feld" title="Neuer Chat oder Suche (⌘K)">' + icon('suche') + '<input class="sb-eingabe sb-text" type="text" placeholder="Neuer Chat oder Suche" aria-label="Neuer Chat oder Suche" autocomplete="off"><kbd class="sb-text">⌘K</kbd></label>\n'
        + '<' + neu_tag + ' class="sb-frage-zu" ' + neu_attr + ' title="Neuer Chat">' + icon('neu') + '</' + neu_tag + '>\n'
        + '<div class="sb-vorschlag" role="listbox" aria-label="Vorschläge">'
        + '<' + neu_tag + ' class="sb-v sb-v-erst" ' + neu_attr + '>' + icon('neu') + '<span>Neuer Chat</span><kbd>↵</kbd></' + neu_tag + '>'
        + '<span class="sb-v-k">Zuletzt geöffnet</span>'
        + '<a class="sb-v" href="Gruendungsteams.dc.html">' + icon('gruendungsteams') + '<span>Solaro</span><span class="sb-v-art">Gründungsteam</span></a>'
        + '<a class="sb-v" href="Mail.dc.html">' + icon('mail') + '<span>Re: Finanzplan</span><span class="sb-v-art">Mail</span></a>'
        + '<a class="sb-v" href="Dateien.dc.html">' + icon('dateien') + '<span>Finanzplan_v3.xlsx</span><span class="sb-v-art">Datei</span></a>'
        + '<span class="sb-v-fuss">Tippen sucht in Akten, Mails, Kontakten, Dateien und Terminen · ↵ fragt Kollege. Im Prototyp ohne Suche.</span></div>\n</div>\n')
    kuerzel = wer[:1]
    return """<input type="checkbox" id="sb-zu" class="sb-zu kg-sr" aria-label="Seitenleiste einklappen">
<aside class="sb" aria-label="Seitenleiste">
<div class="sb-kopf"><span class="sb-marke">Kollege</span><label for="sb-zu" class="sb-knopf" title="Seitenleiste ein- oder ausklappen">""" + icon('leiste') + """</label></div>
""" + feld_html + nav_html(active, buttons) + '\n<details class="sb-konto">\n<summary title="' + wer + ' · Konto"><span class="sb-avatar" aria-hidden="true">' + kuerzel + '</span><span class="sb-text sb-konto-name"><b>' + wer + """</b><span>Gründungszentrum</span></span>""" + icon('pfeil', 'nav-ic sb-text') + """</summary>
<div class="sb-menue" role="menu">
<a role="menuitem" href="Einstellungen.dc.html">Mein Profil</a>
<a role="menuitem" href="Einstellungen.dc.html">Benachrichtigungen</a>
<a role="menuitem" href="Einstellungen.dc.html">Meine Postfächer und Kalender</a>
<a role="menuitem" href="Einstellungen.dc.html">Abmelden</a>
</div>
</details>
</aside>
"""

def side(active, wer):
    return side_inner(active, wer) + """<div class="arbeit" style="flex-grow: 1; min-width: 0; height: 100%; position: relative; overflow: hidden">
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
.kg:has(.sb){{background:var(--paper-sunk) !important}}
.arbeit{{--paper:var(--surface);background:var(--surface);margin:8px 8px 8px 0;height:calc(100% - 16px) !important;border:1px solid var(--rule);border-radius:var(--radius-3);box-sizing:border-box}}
.nav-ic{{width:16px;height:16px;flex-shrink:0;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}}
.kg-seitennav{{display:flex;flex-direction:column;gap:18px}}
.kg-seitennav a,.kg-seitennav button{{all:unset;box-sizing:border-box;cursor:pointer;display:flex;align-items:center;gap:10px;padding:5px 8px;border-radius:var(--radius-feld);border:1px solid transparent;color:var(--ink-muted);text-decoration:none;font-size:14px;line-height:20px}}
.kg-seitennav a:hover,.kg-seitennav button:hover{{color:var(--ink);background:var(--tint)}}
.kg-seitennav a[aria-current="page"],.kg-seitennav button[aria-current="page"],.kg-seitennav [aria-current="true"]{{color:var(--ink);background:var(--surface);border-color:var(--rule);font-weight:500}}
.kg-seitennav a:focus-visible,.kg-seitennav button:focus-visible{{outline:2px solid var(--accent)}}
.kg-seitennav a.nav-plus{{font-size:13px}}
.kg-nav-slash{{color:var(--ink-faint)}}
.sb{{width:240px;flex-shrink:0;box-sizing:border-box;height:100%;padding:14px 10px 12px;display:flex;flex-direction:column;gap:12px;overflow-y:auto;overflow-x:hidden;transition:width 120ms}}
.sb-kopf{{display:flex;align-items:center;justify-content:space-between;padding:0 0 0 8px;min-height:30px}}
.sb-marke{{font-weight:600}}
.sb-knopf{{cursor:pointer;width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;border-radius:var(--radius-feld);color:var(--ink-muted)}}
.sb-knopf:hover{{background:var(--tint);color:var(--ink)}}
.sb-zu:focus-visible ~ .sb .sb-knopf{{outline:2px solid var(--accent)}}
.sb-block{{display:flex;flex-direction:column;gap:1px}}
.sb-gruppe > summary{{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:0 8px 4px;font-size:12px;line-height:16px;font-weight:500;color:var(--ink-muted)}}
.sb-gruppe > summary::-webkit-details-marker{{display:none}}
.sb-gruppe > summary:hover{{color:var(--ink)}}
.sb-gruppe > summary:focus-visible{{outline:2px solid var(--accent)}}
.sb-pfeil{{width:14px;height:14px;transition:transform 120ms}}
.sb-gruppe:not([open]) > summary .sb-pfeil{{transform:rotate(-90deg)}}
.sb-gruppe > a,.sb-ast{{margin-top:1px}}
.sb-konto{{margin-top:auto;position:relative}}
.sb-konto summary{{list-style:none;cursor:pointer;display:flex;gap:10px;align-items:center;padding:8px 10px;border-radius:10px;background:var(--surface);border:1px solid var(--rule)}}
.sb-konto summary::-webkit-details-marker{{display:none}}
.sb-konto summary:hover{{border-color:var(--line-control)}}
.sb-konto summary:focus-visible{{outline:2px solid var(--accent)}}
.sb-konto summary .nav-ic{{color:var(--ink-muted);margin-left:auto}}
.sb-konto[open] summary .nav-ic{{transform:rotate(-90deg)}}
.sb-avatar{{flex-shrink:0;width:28px;height:28px;border-radius:50%;background:var(--paper-sunk);border:1px solid var(--rule);box-sizing:border-box;color:var(--ink);display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:500}}
.sb-konto-name{{display:flex;flex-direction:column;min-width:0;font-size:13px;line-height:18px}}
.sb-konto-name b{{font-weight:500}}
.sb-konto-name span{{color:var(--ink-muted);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.sb-menue{{position:absolute;left:0;right:0;bottom:calc(100% + 6px);background:var(--surface);border:1px solid var(--rule);border-radius:10px;box-shadow:var(--shadow-sheet);padding:4px;display:flex;flex-direction:column;z-index:20}}
.sb-menue a{{padding:6px 10px;font-size:14px;color:var(--ink);text-decoration:none;border-radius:var(--radius-feld)}}
.sb-menue a:hover,.sb-menue a:focus-visible{{background:var(--tint);outline:none}}
.sb-zu:checked ~ .sb{{width:58px;padding:14px 8px 12px}}
.sb-zu:checked ~ .sb .sb-marke,.sb-zu:checked ~ .sb .sb-text,.sb-zu:checked ~ .sb .sb-gruppe > summary{{display:none}}
.sb-zu:checked ~ .sb .sb-kopf{{padding:0;justify-content:center}}
.sb-zu:checked ~ .sb .kg-seitennav a,.sb-zu:checked ~ .sb .kg-seitennav button{{justify-content:center;padding-left:0;padding-right:0}}
.sb-zu:checked ~ .sb .kg-seitennav{{gap:10px}}
.sb-zu:checked ~ .sb .sb-konto summary{{padding:6px 0;justify-content:center;background:transparent;border-color:transparent}}
.sb-zu:checked ~ .sb .sb-menue{{right:auto;width:220px}}
.sb-frage{{position:relative}}
.sb-feld{{display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:8px;background:var(--surface);border:1px solid var(--rule);color:var(--ink-muted);cursor:text}}
.sb-feld:hover{{border-color:var(--line-control)}}
.sb-frage:focus-within .sb-feld{{border-color:var(--ink);box-shadow:0 0 0 3px var(--tint)}}
.sb-eingabe{{all:unset;flex:1;min-width:0;font-size:13px;line-height:20px;color:var(--ink)}}
.sb-eingabe:focus{{outline:none}}
.sb-eingabe::placeholder{{color:var(--ink-muted)}}
.sb-feld kbd{{font-family:var(--font-mono);font-size:11px;line-height:16px;color:var(--ink-muted);border:1px solid var(--rule);border-radius:4px;padding:0 4px;background:var(--surface)}}
.sb-frage-zu{{display:none}}
.sb-vorschlag{{display:none;position:absolute;left:0;right:0;top:calc(100% + 6px);z-index:30;background:var(--surface);border:1px solid var(--rule);border-radius:10px;box-shadow:var(--shadow-sheet);padding:4px;flex-direction:column}}
.sb-frage:focus-within .sb-vorschlag{{display:flex}}
.sb-v{{all:unset;box-sizing:border-box;cursor:pointer;display:flex;align-items:center;gap:10px;padding:6px 8px;border-radius:var(--radius-feld);font-size:14px;line-height:20px;color:var(--ink);text-decoration:none}}
.sb-v:hover,.sb-v:focus-visible,.sb-v-erst{{background:var(--tint);outline:none}}
.sb-v .nav-ic{{color:var(--ink-muted)}}
.sb-v kbd,.sb-v-art{{margin-left:auto;font-size:12px;color:var(--ink-muted);font-family:var(--font-mono)}}
.sb-v-art{{font-family:inherit}}
.sb-v-k{{padding:8px 8px 2px;font-size:12px;line-height:16px;font-weight:500;color:var(--ink-muted)}}
.sb-v-fuss{{margin-top:4px;padding:8px 8px 4px;border-top:1px solid var(--rule);font-size:12px;line-height:17px;color:var(--ink-muted)}}
.sb-ast > summary{{list-style:none;display:flex;align-items:center;position:relative}}
.sb-ast > summary::-webkit-details-marker{{display:none}}
.sb-ast > summary > a{{flex:1;min-width:0}}
.sb-auf{{position:absolute;right:2px;top:50%;transform:translateY(-50%);width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;border-radius:var(--radius-feld);color:var(--ink-faint);cursor:pointer}}
.sb-auf:hover{{background:var(--tint);color:var(--ink)}}
.sb-ast:not([open]) .sb-pfeil{{transform:rotate(-90deg)}}
.sb-ast:has(.sb-kind[aria-current="true"]) > summary > a[aria-current="page"]{{background:transparent;border-color:transparent;color:var(--ink);font-weight:500}}
.sb-baum{{display:flex;flex-direction:column;gap:1px;margin:1px 0 2px;--ast:color-mix(in srgb,var(--line-control) 42%,var(--paper-sunk))}}
.kg-seitennav .sb-kind{{position:relative;margin-left:31px;padding:4px 8px;font-size:13px;line-height:20px}}
.sb-kind .sb-text:first-child{{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.sb-kind::before{{content:'';position:absolute;left:-14px;top:-1px;height:calc(50% + 1px);width:9px;border-left:1px solid var(--ast);border-bottom:1px solid var(--ast);border-bottom-left-radius:8px;box-sizing:border-box;pointer-events:none}}
.sb-kind:not(:last-child)::after{{content:'';position:absolute;left:-14px;top:-1px;bottom:-2px;border-left:1px solid var(--ast);pointer-events:none}}
.sb-kind:first-child::before{{top:-6px;height:calc(50% + 6px)}}
.sb-kind:first-child::after{{top:-6px}}
.sb-zahl{{margin-left:auto;font-size:11px;line-height:16px;padding:0 6px;border-radius:999px;background:var(--tint);color:var(--ink-muted);font-variant-numeric:tabular-nums;font-weight:400}}
.kg-seitennav .sb-kind[aria-current="true"]{{color:var(--ink);background:var(--surface);border-color:var(--rule);font-weight:500}}
.sb-kind[aria-current="true"] .sb-zahl{{background:var(--paper-sunk)}}
.sb-zu:checked ~ .sb .sb-baum,.sb-zu:checked ~ .sb .sb-feld,.sb-zu:checked ~ .sb .sb-vorschlag{{display:none}}
.sb-zu:checked ~ .sb .sb-frage-zu{{all:unset;box-sizing:border-box;cursor:pointer;display:flex;align-items:center;justify-content:center;height:34px;border-radius:8px;background:var(--surface);border:1px solid var(--rule);color:var(--ink)}}
.h1{{margin:0;font-size:28px;line-height:34px;font-weight:500;letter-spacing:-0.01em}}
.label{{font-size:12px;line-height:16px;font-weight:500;letter-spacing:0;text-transform:none}}
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
    wer0 = re.search(r'@@ALS:(\w+)@@', body)
    wer0 = wer0.group(1) if wer0 else 'Andreas'
    if m:
        body = side(m.group(1), wer0) + body[m.end():]
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
    mn = re.search(r'@@SIDEBAR:(\w+)@@', body)
    if mn: body = body.replace(mn.group(0), side_inner(mn.group(1), wer, {'main': ('navUebersicht', 'zurUebersicht'), 'chat': ('navChat', 'zumChat')}, 'neuerChat'))
    js = js.replace('class Component extends DCLogic {', 'class Component extends DCLogic {\n' + SHARED_JS, 1)
    extra = LD_CSS + extra
    out = HEAD.format(title=title, w=w, h=h, extra=extra) + body.rstrip() + '\n' + close + TAIL.format(w=w, h=h, js=js.rstrip())
    open(f'{ROOT}/artboards/{name}.dc.html', 'w').write(out)
    print(name, len(out))
