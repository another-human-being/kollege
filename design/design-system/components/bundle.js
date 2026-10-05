/* @ds-bundle: {"format":4,"namespace":"Kollege","components":[{"name":"Navigation"},{"name":"Abschnitt"},{"name":"Eingabe"},{"name":"Aussage"},{"name":"Quelle"},{"name":"Bezug"},{"name":"Etikett"},{"name":"Aktion"},{"name":"Umschalter"},{"name":"Hinweis"},{"name":"Entwurf"},{"name":"Quittung"},{"name":"Verlauf"},{"name":"Zusage"},{"name":"Klaerung"},{"name":"Anweisung"},{"name":"Leer"},{"name":"Laden"},{"name":"Nachricht"},{"name":"Karte"},{"name":"Wissensluecke"},{"name":"ChatListe"},{"name":"Privat"},{"name":"Vermutung"},{"name":"Icon"},{"name":"Schritte"}]} */
(function () {
  var R = window.React, h = R.createElement, F = R.Fragment;
  function cx() { return Array.prototype.filter.call(arguments, Boolean).join(' '); }

  var ZEICHEN = { belegt: '▪', berechnet: '=', einschaetzung: '~' };
  var LESBAR = { belegt: 'belegt', berechnet: 'berechnet', einschaetzung: 'KI-Vermutung' };

  function Vermutung(p) { return h('span', { className: 'kg-vermutung', title: 'Ungeprüft: Deutung des Systems, kein Beleg' }, p.children || 'KI-Vermutung'); }

  function Privat(p) {
    var wer = p.fuer ? 'nur für ' + p.fuer : 'nur für dich';
    return h('span', { className: 'kg-privat', title: 'Privat: ' + wer + ' sichtbar' },
      h('svg', { width: 11, height: 12, viewBox: '0 0 11 12', 'aria-hidden': 'true', focusable: 'false' },
        h('rect', { x: 1.5, y: 5.5, width: 8, height: 6, rx: 1, fill: 'none', stroke: 'currentColor' }),
        h('path', { d: 'M3 5.5V3.8a2.5 2.5 0 0 1 5 0v1.7', fill: 'none', stroke: 'currentColor' })),
      p.nurSymbol ? h('span', { className: 'kg-sr' }, 'privat, ' + wer) : h('span', null, p.children || (p.fuer ? 'nur ' + p.fuer : 'privat')));
  }

  function Quelle(p) {
    if (!p.href && !p.onClick) return h('span', { className: cx('kg-quelle', p.className) }, p.children);
    return h(p.href ? 'a' : 'button', { className: cx('kg-quelle', p.className), href: p.href, type: p.href ? undefined : 'button', onClick: p.onClick, title: p.title || 'Quelle öffnen' }, p.children);
  }

  function Bezug(p) {
    return h('a', { className: 'kg-bezug', href: p.href || '#', title: p.art ? p.art : undefined, onClick: p.onClick }, p.children);
  }

  function Aussage(p) {
    var art = p.art || 'belegt';
    return h(p.inline ? 'span' : 'div', { className: cx('kg-aussage', 'kg-aussage--' + art, p.dringend && 'kg-aussage--dringend', p.inline && 'kg-aussage-inline', p.className) },
      h('span', { className: 'kg-glyph', 'aria-hidden': 'true' }, ZEICHEN[art]),
      h('span', { className: 'kg-aussage-text' },
        h('span', { className: 'kg-sr' }, LESBAR[art] + ': '),
        p.children,
        art === 'einschaetzung' && p.marke !== false ? h(F, null, ' ', h(Vermutung, null)) : null,
        p.quelle ? h(F, null, ' \u00a0', h(Quelle, { href: p.quelleHref, onClick: p.onQuelle }, p.quelle)) : null));
  }

  function Aktion(p) {
    var v = p.variante || 'sekundaer';
    var inhalt = p.children;
    if (v === 'rueckgaengig' && inhalt == null) inhalt = 'Rückgängig';
    return h('button', { type: 'button', className: cx('kg-aktion', 'kg-aktion--' + v, p.className), onClick: p.onClick, disabled: p.disabled, 'aria-label': p['aria-label'] },
      v === 'rueckgaengig' ? h('span', { 'aria-hidden': 'true' }, '↶') : null, inhalt);
  }

  var ARTEN = { beratung: 'Beratung', event: 'Event', beitrag: 'Beitrag', lehre: 'Lehre', sonstiges: 'Sonstiges' };
  function Etikett(p) {
    return h('span', { className: 'kg-etikett' }, p.children || ARTEN[p.art] || p.art);
  }

  function Umschalter(p) {
    var opts = p.optionen || ['Meins', 'Team'];
    var st = R.useState(p.wert != null ? p.wert : opts[0]);
    var wert = p.wert != null ? p.wert : st[0];
    return h('div', { className: 'kg-umschalter', role: 'group', 'aria-label': p.label || 'Ansicht' },
      opts.map(function (o) {
        return h('button', { key: o, type: 'button', 'aria-pressed': o === wert ? 'true' : 'false', onClick: function () { st[1](o); p.onWechsel && p.onWechsel(o); } }, o);
      }));
  }

  function Navigation(p) {
    return h('nav', { className: 'kg-nav', 'aria-label': 'Hauptnavigation' },
      h('span', { className: 'kg-nav-marke' }, p.marke || 'Kollege'),
      h('div', { className: 'kg-nav-liste' }, (p.eintraege || []).map(function (e) {
        return h('a', { key: e.label, href: e.href || '#', 'aria-current': e.aktiv ? 'page' : undefined, onClick: e.onClick },
          h('span', { className: 'kg-nav-slash', 'aria-hidden': 'true' }, '/'), e.label,
          e.anzahl ? h('span', { className: 'kg-nav-zahl' }, e.anzahl) : null);
      })),
      p.rechts ? h('span', { className: 'kg-nav-rechts' }, p.rechts) : null);
  }

  function Abschnitt(p) {
    var kinder = R.Children.toArray(p.children);
    return h('section', { className: 'kg-abschnitt', 'aria-label': p.titel },
      h('div', { className: 'kg-abschnitt-kopf' },
        h('h2', { className: 'kg-abschnitt-titel' }, p.titel),
        p.anzahl != null ? h('span', { className: 'kg-abschnitt-zahl' }, p.anzahl) : null,
        p.aside ? h('span', { className: 'kg-abschnitt-aside' }, p.aside) : null),
      kinder.length ? h('div', { className: 'kg-abschnitt-liste' }, kinder) : p.leer || null);
  }

  function Laden(p) {
    if (p.inline) return h('span', { className: 'kg-laden kg-laden-inline', role: 'status' }, h('span', { className: 'kg-laden-punkte' }, p.text || 'Ordne zu'));
    var anteil = p.max ? Math.max(0, Math.min(1, (p.wert || 0) / p.max)) : null;
    var fmt = function (n) { return Number(n).toLocaleString('de-DE'); };
    return h('div', { className: 'kg-laden', role: 'status' },
      h('div', { className: 'kg-laden-zeile' },
        h('span', { className: 'kg-laden-punkte' }, p.text || 'Lese'),
        p.max ? h('span', null, fmt(p.wert || 0) + ' / ' + fmt(p.max)) : null),
      anteil != null ? h('div', { className: 'kg-laden-spur' }, h('div', { className: 'kg-laden-fuellung', style: { width: (anteil * 100) + '%' } })) : null);
  }


  // Linien-Icons (E54): 16 px, Strich 1,6, Farbe wie der Text – nie ohne Wort oder Tooltip
  var ICONS = {"hoch": "<path d=\"M12 19V5M6 11l6-6 6 6\"/>", "lesen": "<path d=\"M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z\"/>", "suche": "<circle cx=\"11\" cy=\"11\" r=\"6\"/><path d=\"M20 20l-4.5-4.5\"/>", "gefunden": "<path d=\"M5 12l4 4 10-10\"/>", "luecke": "<circle cx=\"12\" cy=\"12\" r=\"8\"/><path d=\"M12 8v5M12 16h.01\"/>"};
  function Icon(p) { return h('svg', { className: cx('kg-ic', p.className), viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false', dangerouslySetInnerHTML: { __html: ICONS[p.name] || '' } }); }

  // Arbeitsschritte von Kollege: was gelesen, gesucht, gefunden wurde – Fundstellen als Chips
  function Schritte(p) {
    return h('ol', { className: 'kg-schritte', 'aria-label': 'Was Kollege getan hat', style: { listStyle: 'none', margin: 0, padding: 0 } },
      (p.schritte || []).map(function (s, i) {
        return h('li', { key: i, className: 'kg-schritt' }, h(Icon, { name: s.art || 'lesen' }),
          h('span', null, s.text, s.funde && s.funde.length ? h('span', { style: { display: 'block' } }, s.funde.map(function (f, j) { return h('span', { key: j, className: 'kg-fund' }, f); })) : null));
      }));
  }

  function Eingabe(p) {
    var st = R.useState(p.wert || '');
    var ref = R.useRef(null);
    var zustand = p.zustand || (st[0] ? 'bereit' : 'leer');
    R.useEffect(function () { var t = ref.current; if (t) { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; } }, [st[0]]);
    function senden() { var t = st[0]; if (!t.trim()) return; if (p.onSenden) p.onSenden(t); if (p.leeren !== false) st[1](''); }
    return h('div', { className: 'kg-eingabe', 'data-zustand': zustand },
      p.kontext ? h('div', { className: 'kg-eingabe-kontext' }, h('span', null, 'Kontext'), p.kontext) : null,
      h('label', { className: 'kg-sr', htmlFor: p.id || 'kg-eingabe' }, 'Was ist passiert oder soll passieren?'),
      h('textarea', { id: p.id || 'kg-eingabe', ref: ref, rows: 2, value: st[0], placeholder: p.platzhalter || 'Was ist passiert? Frag oder notiere etwas – in eigenen Worten.', readOnly: zustand === 'verarbeitet',
        onChange: function (e) { st[1](e.target.value); },
        onKeyDown: function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); senden(); } } }),
      h('div', { className: 'kg-eingabe-fuss' },
        zustand === 'verarbeitet'
          ? h('span', { className: 'kg-eingabe-hilfe' }, h(Laden, { inline: true, text: p.ladetext || 'Lese mit, ordne zu' }))
          : h('span', { className: 'kg-eingabe-hilfe' }, p.hilfe || '\u23CE abschicken \u00b7 \u21E7\u23CE neue Zeile \u00b7 Frage oder Notiz'),
        h(Aktion, { variante: 'primaer', onClick: senden, disabled: zustand !== 'bereit', 'aria-label': 'Abschicken', className: 'kg-senden' }, p.knopf || Icon({ name: 'hoch' }))));
  }

  function Hinweis(p) {
    return h('article', { className: cx('kg-hinweis', p.dringend && 'kg-hinweis--dringend') },
      h('div', { className: 'kg-hinweis-zeit' }, p.zeit),
      h('div', { className: 'kg-hinweis-body' },
        h('div', { className: 'kg-hinweis-titel' }, p.titel),
        p.kontext ? h('div', { className: 'kg-hinweis-kontext' }, p.kontext) : null,
        p.gruende && p.gruende.length ? h('div', { className: 'kg-hinweis-gruende' }, p.gruende.map(function (g, i) {
          return h(Aussage, { key: i, art: g.art, quelle: g.quelle, dringend: g.dringend }, g.text);
        })) : null,
        p.frage ? h('div', { className: 'kg-hinweis-frage' }, p.frage) : null,
        p.aktionen ? h('div', { className: 'kg-aktionen kg-hinweis-aktionen' }, p.aktionen) : null,
        p.children));
  }

  function Entwurf(p) {
    var zu = !!p.gesperrt;
    return h('div', { className: cx('kg-entwurf', zu && 'kg-entwurf--gesperrt'), role: 'group', 'aria-label': 'Entwurf, noch nicht gesendet' + (zu ? ', gesperrt' : ''), 'aria-disabled': zu ? 'true' : undefined },
      h('div', { className: 'kg-entwurf-kopf' },
        h('span', null, 'Entwurf \u00b7 ' + (p.kanal || 'Mail') + (p.von ? ' \u00b7 von ' + p.von : '')), h('span', { 'aria-hidden': 'true' }, '\u2192'), h('b', null, p.an)),
      p.betreff ? h('div', { className: 'kg-entwurf-betreff' }, p.betreff) : null,
      p.auszug ? h('div', { className: 'kg-entwurf-auszug' }, p.auszug) : null,
      zu ? h('div', { className: 'kg-entwurf-hinweis' }, p.gesperrtText || 'Wartet auf deine Antwort oben – erst dann lässt er sich senden.') : (p.hinweis !== false ? h('div', { className: 'kg-entwurf-hinweis' }, p.hinweis || 'Geht über dein Postfach und liegt danach ganz normal in \u201EGesendet\u201C.') : null),
      h('div', { className: 'kg-entwurf-fuss' },
        h('div', { className: 'kg-entwurf-grund' }, p.grund || null),
        h(Aktion, { variante: 'sekundaer', onClick: p.onAnsehen, disabled: zu }, 'Ansehen'),
        h(Aktion, { variante: 'primaer', onClick: p.onSenden, disabled: zu }, p.sendenText || '\u00dcber mein Postfach senden')));
  }

  function Quittung(p) {
    function zeile(label, items, inhalt) {
      if (!inhalt && !(items && items.length)) return null;
      return h('div', { className: 'kg-quittung-zeile' },
        h('div', { className: 'kg-quittung-label' }, label),
        h('div', { className: 'kg-quittung-inhalt' }, inhalt || items.map(function (it, i) {
          return h('div', { key: i, className: 'kg-quittung-punkt' }, h('span', null, it.text),
            it.rueckgaengig !== false && label !== 'Verstanden' ? h(Aktion, { variante: 'rueckgaengig', onClick: it.onRueckgaengig }) : null);
        })));
    }
    return h('section', { className: 'kg-quittung', 'aria-label': 'Quittung' },
      h('div', { className: 'kg-quittung-kopf' },
        h('span', null, p.zeit ? 'Quittung · ' + p.zeit : 'Quittung'),
        h('div', { className: 'kg-aktionen' }, h(Aktion, { variante: 'rueckgaengig', onClick: p.onAllesRueckgaengig }, 'Alles rückgängig'))),
      zeile('Verstanden', p.verstanden),
      zeile('Erledigt', p.erledigt),
      zeile('Vorschlag', null, p.vorschlag),
      h('div', { className: 'kg-quittung-fuss kg-aktionen' },
        h(Aktion, { variante: 'text', onClick: p.onFalsch }, 'Falsch zugeordnet?'),
        p.fuss || null));
  }

  function Verlauf(p) {
    var out = [], monat = null;
    (p.eintraege || []).forEach(function (e, i) {
      if (e.monat && e.monat !== monat) { monat = e.monat; out.push(h('li', { key: 'm' + i, className: 'kg-verlauf-monat', 'aria-hidden': 'true' }, e.monat)); }
      out.push(h('li', { key: i, className: cx('kg-verlauf-eintrag', e.art === 'System' && 'kg-verlauf-eintrag--system') },
        h('span', { className: 'kg-verlauf-datum' }, e.datum),
        h('span', { className: 'kg-verlauf-art' }, e.art),
        h('span', { className: 'kg-verlauf-text' },
          h('span', null, e.privat ? h(F, null, h(Privat, { nurSymbol: true, fuer: e.privatFuer }), ' ') : null, e.text, e.quelle ? h(F, null, ' \u00a0', h(Quelle, null, e.quelle)) : null,
            e.herkunft ? h('span', { className: 'kg-verlauf-herkunft' }, e.herkunft) : null),
          e.art === 'System' && e.rueckgaengig !== false ? h(Aktion, { variante: 'rueckgaengig', onClick: e.onRueckgaengig }) : null)));
    });
    return h('ol', { className: 'kg-verlauf', 'aria-label': p.label || 'Verlauf' }, out);
  }

  var ZUSAGE_ZEICHEN = { offen: '○', ueberfaellig: '!', erledigt: '✓' };
  function Zusage(p) {
    var s = p.status || 'offen';
    return h('div', { className: cx('kg-zusage', 'kg-zusage--' + s) },
      h('span', { className: 'kg-zusage-zeichen', 'aria-hidden': 'true' }, ZUSAGE_ZEICHEN[s]),
      h('span', null, h('span', { className: 'kg-zusage-text' }, p.children),
        p.quelle ? h('span', { className: 'kg-zusage-quelle' }, h(Quelle, null, p.quelle)) : null),
      h('span', { className: 'kg-zusage-faellig' }, s === 'ueberfaellig' ? (p.faellig || 'überfällig') : s === 'erledigt' ? 'erledigt' : (p.faellig || '')));
  }

  function Klaerung(p) {
    var st = R.useState(p.antwort || null);
    if (st[0]) {
      return h('div', { className: 'kg-klaerung' },
        h('div', { className: 'kg-klaerung-erledigt' },
          h('span', null, '✓ ' + (p.bestaetigt ? p.bestaetigt(st[0]) : 'Gemerkt: ' + st[0])),
          h(Aktion, { variante: 'rueckgaengig', onClick: function () { var alt = st[0]; st[1](null); p.onRueckgaengig && p.onRueckgaengig(alt); } })));
    }
    return h('div', { className: 'kg-klaerung' },
      h('div', { className: 'kg-klaerung-frage' }, p.frage),
      p.grund ? h(Aussage, { art: 'einschaetzung', quelle: p.quelle }, p.grund) : null,
      h('div', { className: 'kg-aktionen' }, (p.antworten || ['Ja', 'Nein']).map(function (a, i) {
        return h(Aktion, { key: a, variante: i === 0 ? 'sekundaer' : 'sekundaer', onClick: function () { st[1](a); p.onAntwort && p.onAntwort(a); } }, a);
      })));
  }

  function Anweisung(p) {
    return h('div', { className: 'kg-anweisung' },
      h('div', { className: 'kg-anweisung-text' }, '„', p.children, '“'),
      h(Etikett, null, p.geltung === 'team' ? 'Team' : 'Persönlich'),
      h('div', { className: 'kg-anweisung-meta' },
        p.von ? h('span', null, p.von + (p.datum ? ' \u00b7 ' + p.datum : '')) : null,
        p.angewandt ? h('span', null, '= ' + p.angewandt) : null,
        h(Aktion, { variante: 'text', onClick: p.onBearbeiten }, 'Bearbeiten'),
        p.onLoeschen ? h(Aktion, { variante: 'text', onClick: p.onLoeschen }, 'Löschen') : null));
  }

  function Leer(p) {
    return h('div', { className: 'kg-leer' },
      h('div', { className: 'kg-leer-titel' }, p.titel),
      p.text ? h('div', { className: 'kg-leer-text' }, p.text) : null,
      p.aktion ? h('div', { className: 'kg-aktionen' }, p.aktion) : null);
  }

  function Nachricht(p) {
    var du = p.von === 'du';
    return h('div', { className: cx('kg-nachricht', du ? 'kg-nachricht--du' : 'kg-nachricht--kollege') },
      h('div', { className: 'kg-nachricht-wer' }, h('span', null, du ? 'Du' : 'Kollege'), p.zeit ? h('span', null, p.zeit) : null),
      h('div', { className: 'kg-nachricht-text' }, p.children, p.streamt ? h('span', { className: 'kg-caret', 'aria-hidden': 'true' }) : null));
  }

  function Karte(p) {
    var st = R.useState(!!p.zurueck), zurueck = st[0];
    var art = p.art || 'quittung';
    var titel = p.titel || (art === 'anweisung' ? 'Anweisung gespeichert' : 'Erledigt');
    return h('div', { className: cx('kg-karte', zurueck && 'kg-karte--zurueck'), role: 'group', 'aria-label': titel },
      h('div', { className: 'kg-karte-kopf' },
        h('span', { className: 'kg-karte-titel' }, titel),
        p.geltung ? h(Etikett, null, p.geltung === 'team' ? 'Team' : 'Persönlich') : null,
        p.privat ? h(Privat, null) : null,
        p.zeit ? h('span', { className: 'kg-karte-zeit' }, p.zeit) : null),
      p.punkte && p.punkte.length ? h('ul', { className: 'kg-karte-punkte' }, p.punkte.map(function (pt, i) { return h('li', { key: i }, pt); })) : null,
      p.anweisung ? h('div', { className: 'kg-karte-anweisung' }, 'nach Anweisung: „' + p.anweisung + '“') : null,
      h('div', { className: 'kg-karte-fuss' },
        p.linkText ? h('a', { className: 'kg-bezug', href: p.linkHref || '#', onClick: p.onLink }, p.linkText) : null,
        zurueck
          ? h('span', { className: 'kg-karte-status' }, 'Rückgängig gemacht · ', h('button', { type: 'button', className: 'kg-aktion kg-aktion--text', onClick: function () { st[1](false); p.onWiederholen && p.onWiederholen(); } }, 'Wiederholen'))
          : h('span', { className: 'kg-karte-rueck' },
              h(Aktion, { variante: 'rueckgaengig', onClick: function () { st[1](true); p.onRueckgaengig && p.onRueckgaengig(); } }),
              p.folgen ? h('span', { className: 'kg-karte-folgen' }, p.folgen) : null)));
  }

  function Wissensluecke(p) {
    return h('div', { className: 'kg-luecke', role: 'note' },
      h('div', { className: 'kg-luecke-titel' }, h('span', { className: 'kg-glyph', 'aria-hidden': 'true' }, '∅'), h('span', null, p.titel || 'Dazu habe ich noch zu wenig Erfahrung.')),
      p.bekannt ? h('div', { className: 'kg-luecke-text' }, p.bekannt) : null,
      p.aktionen ? h('div', { className: 'kg-aktionen' }, p.aktionen) : null);
  }

  function ChatListe(p) {
    var q = R.useState(''), term = q[0].trim().toLowerCase();
    var chats = (p.chats || []).filter(function (c) { return !term || (c.titel + ' ' + (c.etikett || '')).toLowerCase().indexOf(term) >= 0; });
    var pins = chats.filter(function (c) { return c.angepinnt; }), rest = chats.filter(function (c) { return !c.angepinnt; });
    function item(c) {
      var inhalt = [
        h('span', { key: 't', className: 'kg-chat-titel' }, c.titel),
        h('span', { key: 'm', className: 'kg-chat-meta' }, c.etikett ? h('span', { className: 'kg-chat-etikett' }, c.etikett) : null, h('span', null, c.datum))
      ];
      var haupt = c.href
        ? h('a', { className: 'kg-chat-link', href: c.href, 'aria-current': c.aktiv ? 'page' : undefined }, inhalt)
        : h('button', { type: 'button', className: 'kg-chat-link', 'aria-current': c.aktiv ? 'page' : undefined, onClick: function () { p.onOeffnen && p.onOeffnen(c.id); } }, inhalt);
      return h('li', { key: c.id, className: cx('kg-chat', c.aktiv && 'kg-chat--aktiv') }, haupt,
        h('span', { className: 'kg-chat-aktionen' },
          h('button', { type: 'button', onClick: function () { p.onPin && p.onPin(c.id); } }, c.angepinnt ? 'Lösen' : 'Anpinnen'),
          h('button', { type: 'button', onClick: function () { p.onLoeschen && p.onLoeschen(c.id); } }, 'Löschen')));
    }
    return h('div', { className: 'kg-chatliste' },
      p.neuHref ? h('a', { className: 'kg-aktion kg-aktion--sekundaer kg-chat-neu', href: p.neuHref, style: { textDecoration: 'none' } }, '+ Neuer Chat') : h('button', { type: 'button', className: 'kg-aktion kg-aktion--sekundaer kg-chat-neu', onClick: p.onNeu }, '+ Neuer Chat'),
      h('input', { type: 'search', className: 'kg-chat-suche', placeholder: 'Chats durchsuchen', value: q[0], 'aria-label': 'Chats durchsuchen', onChange: function (e) { q[1](e.target.value); } }),
      pins.length ? h('div', { className: 'kg-chat-gruppe' }, 'Angepinnt') : null,
      pins.length ? h('ul', { className: 'kg-chat-ul' }, pins.map(item)) : null,
      h('div', { className: 'kg-chat-gruppe' }, 'Chats'),
      rest.length ? h('ul', { className: 'kg-chat-ul' }, rest.map(item)) : h('div', { className: 'kg-chat-leer' }, term ? 'Kein Chat passt.' : 'Noch keine Chats.'),
      h('div', { className: 'kg-chat-hinweis' }, h(Privat, null, 'Chats sind persönlich')));
  }

  var K = window.Kollege || (window.Kollege = {});
  Object.assign(K, { Navigation: Navigation, Abschnitt: Abschnitt, Eingabe: Eingabe, Aussage: Aussage, Quelle: Quelle, Bezug: Bezug, Etikett: Etikett, Aktion: Aktion, Umschalter: Umschalter, Hinweis: Hinweis, Entwurf: Entwurf, Quittung: Quittung, Verlauf: Verlauf, Zusage: Zusage, Klaerung: Klaerung, Anweisung: Anweisung, Leer: Leer, Laden: Laden, Nachricht: Nachricht, Karte: Karte, Wissensluecke: Wissensluecke, ChatListe: ChatListe, Privat: Privat, Vermutung: Vermutung, Icon: Icon, Schritte: Schritte });
})();
