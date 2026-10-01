class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = Object.assign(this.basisState(), this.kcState(), { modus: 'Woche', scope: 'Meins', sel: null, neu: null, wasText: '' });
  }
  kcCfg() { var e = this.aktuell(); return { name: e ? this.wert(e.id, 'titel', e.titel) : 'Kalender', anzahl: 'Termine, Teilnehmende, letzte Mails', platzhalter: 'Frag etwas zu diesem Termin', antwort: 'Karin Vogt hat nach dem Gespräch die Rahmenvereinbarung geschickt (Mail 29.09.). Offen ist, wer sie prüft.', belege: [{ art: 'belegt', text: 'Rahmenvereinbarung als Vorschlag', quelle: 'Mail 29.09.' }], luecke: 'Dazu steht im Termin nichts, was ich auswerten könnte.' }; }
  team() { return ['Andreas', 'Julia', 'Mehmet']; }
  tagLabel(k) {
    var W = ['Mo 28.09.', 'Di 29.09.', 'Mi 30.09.', 'Do 01.10.', 'Fr 02.10.', 'Sa 03.10.', 'So 04.10.'];
    if (/^\d$/.test(k)) return W[+k];
    var m = /^d(\d+)$/.exec(k); return m ? m[1] + '.09.' : k;
  }
  basis() {
    var T = [
      { id: 'j1', tag: '0', start: '10:00', dauer: '1', titel: 'Jour fixe Team', ort: 'Raum 2.14', leute: 'Andreas, Julia, Mehmet', vorgang: '– (ohne Bereich)', wer: 'Andreas' },
      { id: 'v1', tag: '0', start: '14:00', dauer: '1', titel: 'Vorbesprechung Entrepreneurship Basics', ort: 'Büro Hartmann', leute: 'Prof. Dr. Martin Hartmann', vorgang: 'Lehre · Entrepreneurship Basics', wer: 'Andreas', ergebnis: 'Raum für Sitzung 3 fehlt noch; Folien kommen bis 06.10.' },
      { id: 'sw', tag: '1', start: '11:00', dauer: '1', titel: 'Gespräch Stadtwerke', ort: 'Stadtwerke, Hoher Weg 1', leute: 'Karin Vogt', vorgang: '– (ohne Bereich)', wer: 'Andreas' },
      { id: 'eb', tag: '1', start: '16:00', dauer: '1.5', titel: 'Entrepreneurship Basics, Sitzung 1', ort: 'Hörsaal 1004', leute: '', vorgang: 'Lehre · Entrepreneurship Basics', wer: 'Andreas' },
      { id: 'kl', tag: '2', start: '10:00', dauer: '1', titel: 'Beratung Kitchen Loop', ort: 'Raum 2.14', leute: 'Sara Yilmaz, Ben Hofer', vorgang: 'Gründungsteams · Kitchen Loop', wer: 'Andreas' },
      { id: 'so', tag: '2', start: '13:30', dauer: '1', titel: 'Beratung Solaro', ort: 'Raum 2.14', leute: 'Lisa Meier, Tom Kraus', vorgang: 'Gründungsteams · Solaro', wer: 'Andreas', ergebnis: 'Pitchdeck final bis Fr 02.10.; wir vermitteln Frau Weber.' },
      { id: 'gb', tag: '3', start: '14:00', dauer: '1', titel: 'Erstberatung Greenbyte', ort: 'Raum 2.14', leute: 'Nora Kim', vorgang: 'Gründungsteams · Greenbyte', wer: 'Andreas' },
      { id: 'ma', tag: '3', start: '15:30', dauer: '0.5', titel: 'Sprechstunde Max Brandt', ort: 'Raum 2.14', leute: 'Max Brandt', vorgang: 'Gründungsteams · Lern-App (Max Brandt)', wer: 'Andreas', status: 'entwurf' },
      { id: 'nl', tag: '4', start: '09:00', dauer: '1.5', titel: 'Mentoring Nordlicht', ort: 'online', leute: 'Dr. Kerstin Albrecht, Jonas Berg', vorgang: 'Gründungsteams · Nordlicht Analytics', wer: 'Andreas', status: 'eingeladen' },
      { id: 'pa', tag: '2', start: '16:00', dauer: '1', titel: 'Orga Pitch-Abend', ort: 'Raum 2.12', leute: 'Julia', vorgang: 'Events · Pitch-Abend', wer: 'Julia' },
      { id: 'kf', tag: '3', start: '10:00', dauer: '1', titel: 'Förderberatung Kitchen Loop', ort: 'Raum 2.12', leute: 'Ben Hofer', vorgang: 'Gründungsteams · Kitchen Loop', wer: 'Mehmet' },
      { id: 'rs', tag: '4', start: '11:00', dauer: '1', titel: 'Redaktion Social Media', ort: 'Büro', leute: 'Mehmet', vorgang: 'Social Media · Pitch-Abend ankündigen', wer: 'Mehmet' }
    ];
    return T.concat(this.wert('_neu', 'termine', []));
  }
  v(e, f) { return this.wert(e.id, f, e[f]); }
  externe(e) { var t = this.team(); return String(this.v(e, 'leute') || '').split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s && t.indexOf(s) < 0; }); }
  vorbei(e) { var tag = this.v(e, 'tag'); if (!/^\d$/.test(tag)) return /^d/.test(tag); var i = +tag; return i < 2 || (i === 2 && this.v(e, 'start') < '14:40'); }
  sichtbar() {
    var self = this;
    return this.basis().filter(function (e) { return self.state.scope === 'Team' || self.v(e, 'wer') === 'Andreas'; });
  }
  aktuell() {
    var self = this, st = this.state;
    if (st.neu) return st.neu;
    return this.basis().filter(function (e) { return e.id === st.sel; })[0];
  }
  renderVals() {
    var self = this, st = this.state, T = this.sichtbar();
    var px = function (zeit) { var p = zeit.split(':'); return (+p[0] - 8 + (+p[1]) / 60) * 48; };
    var ende = function (e) { var p = self.v(e, 'start').split(':'), m = +p[0] * 60 + +p[1] + parseFloat(self.v(e, 'dauer')) * 60; return Math.floor(m / 60) + ':' + ('0' + m % 60).slice(-2); };
    var oeffne = function (e) { return function () { self.setState({ sel: e.id, neu: null, wasText: '', kcOffen: false }); }; };
    var neuAn = function (tag, start) { return function () { self.setState({ neu: { id: 'n' + Date.now(), istNeu: true, tag: tag, start: start, dauer: '1', titel: '', ort: 'Raum 2.14', leute: '', vorgang: '– (ohne Bereich)', wer: 'Andreas' }, sel: null, wasText: '' }); }; };
    var fragt = function (e) { return self.vorbei(e) && self.externe(e).length > 0 && !self.v(e, 'ergebnis') && self.v(e, 'status') !== 'abgesagt' && self.v(e, 'status') !== 'entwurf'; };
    var klasse = function (e) { var s = self.v(e, 'status'); return 'r-t' + (s === 'abgesagt' ? ' r-t--ab' : s === 'entwurf' ? ' r-t--entwurf' : self.vorbei(e) ? ' r-t--vorbei' : ''); };
    var stunden = []; for (var h = 8; h < 19; h++) stunden.push({ label: h + ':00', top: 'top: ' + ((h - 8) * 48) + 'px' });
    var fristen = { '2': ['Finanzplan-Feedback an Tom'], '4': ['Pitchdeck Solaro (an uns)'] };
    var tage = [0, 1, 2, 3, 4].map(function (i) {
      var k = String(i);
      return {
        kopf: self.tagLabel(k) + (i === 2 ? ' · heute' : ''), kopfKlasse: 'r-kopf' + (i === 2 ? ' r-kopf--heute' : ''), istHeute: i === 2,
        fristen: fristen[k] || [],
        slots: stunden.map(function (s, j) { var z = (8 + j) + ':00'; z = z.length < 5 ? '0' + z : z; return { top: 'top: ' + (j * 48) + 'px', label: 'Neuer Termin ' + self.tagLabel(k) + ' ' + z, los: neuAn(k, z) }; }),
        termine: T.filter(function (e) { return self.v(e, 'tag') === k; }).map(function (e) {
          var hgt = Math.max(22, parseFloat(self.v(e, 'dauer')) * 48 - 2);
          var s = self.v(e, 'status');
          return { titel: self.v(e, 'titel') || '(ohne Titel)', zeit: self.v(e, 'start') + '–' + ende(e) + (st.scope === 'Team' && self.v(e, 'wer') !== 'Andreas' ? ' · ' + self.v(e, 'wer') : ''),
            unter: s === 'entwurf' ? 'Einladung nicht verschickt' : s === 'eingeladen' ? 'eingeladen · wartet' : s === 'abgesagt' ? 'abgesagt' : (self.v(e, 'leute') || self.v(e, 'ort')),
            klasse: klasse(e), pos: 'top: ' + (px(self.v(e, 'start')) + 1) + 'px; height: ' + hgt + 'px',
            aktiv: e.id === st.sel ? 'true' : 'false', fragen: fragt(e), los: oeffne(e) };
        })
      };
    });
    // Monat September 2026 (1.9. = Dienstag), 35 Zellen ab Mo 31.08.
    var zellen = [];
    for (var d = 0; d < 35; d++) {
      var nr = d - 1, fremd = nr < 1 || nr > 30, wochenIdx = nr >= 28 ? nr - 28 : -1;
      var key = wochenIdx >= 0 ? String(wochenIdx) : (!fremd ? 'd' + nr : null);
      var label = fremd ? (nr < 1 ? '31.08.' : (nr - 30) + '.10.') : nr + '.';
      var es = key ? T.filter(function (e) { return self.v(e, 'tag') === key; }) : [];
      var generisch = [];
      if (!fremd && wochenIdx < 0 && (nr % 7 === 0)) generisch.push('10:00 Jour fixe Team');
      if (!fremd && (nr === 8 || nr === 22)) generisch.push('13:30 Beratung Solaro');
      if (!fremd && (nr === 15)) generisch.push('11:00 Gespräch IHK');
      if (nr > 30) es = T.filter(function (e) { return self.v(e, 'tag') === String(nr - 28); });
      zellen.push({ tag: label, klasse: 'zelle' + (fremd && nr < 1 ? ' zelle--fremd' : '') + (nr === 30 ? ' zelle--heute' : ''),
        neuLabel: 'Neuer Termin am ' + label, neu: key || nr > 30 ? neuAn(key || String(nr - 28), '10:00') : function () { self.aendere([], 'August ist im Prototyp nicht ausgearbeitet', true); },
        termine: es.map(function (e) { return { text: self.v(e, 'start') + ' ' + (self.v(e, 'titel') || '(ohne Titel)'), stil: self.v(e, 'status') === 'abgesagt' ? 'text-decoration: line-through; color: var(--ink-faint)' : self.v(e, 'status') === 'entwurf' ? 'color: var(--ink-muted)' : '', los: oeffne(e) }; })
          .concat(generisch.map(function (g) { return { text: g, stil: 'color: var(--ink-muted)', los: function () { self.aendere([], 'Ältere Termine sind im Prototyp nur angedeutet', true); } }; }))
      });
    }
    // ——— Formular ———
    var e = this.aktuell(), ev = {};
    if (e) {
      var ext = this.externe(e), s = this.v(e, 'status') || 'fest', istNeu = !!e.istNeu;
      var titel = this.v(e, 'titel');
      ev = {
        f: istNeu ? {
          fokus: function () {}, fertig: function () {},
          tippen: function (x) { var n = Object.assign({}, self.state.neu); n[x.target.getAttribute('data-feld')] = x.target.value; self.setState({ neu: n }); },
          wahl: function (x) { var n = Object.assign({}, self.state.neu); n[x.target.getAttribute('data-feld')] = x.target.value; self.setState({ neu: n }); }
        } : this.feld(e.id, e, 'Termin'),
        titel: titel, tag: this.v(e, 'tag'), start: this.v(e, 'start'), dauer: this.v(e, 'dauer'), ort: this.v(e, 'ort'), leute: this.v(e, 'leute'), vorgang: this.v(e, 'vorgang'),
        hatExterne: ext.length > 0, externe: ext.join(', '),
        istNeu: istNeu, istAbgesagt: s === 'abgesagt',
        statusText: istNeu ? (ext.length ? 'Wird erst gespeichert, dann lädst du ein – nichts geht automatisch raus.' : 'Nur Team – steht nach dem Speichern direkt im Kalender.')
          : s === 'entwurf' ? 'Steht vorläufig im Kalender. Einladung an ' + ext.join(', ') + ' ist noch nicht verschickt.'
          : s === 'eingeladen' ? 'Einladung verschickt über dein Postfach · wartet auf Zusage.'
          : s === 'abgesagt' ? '' : (ext.length ? 'Fest im Kalender.' : 'Interner Termin.'),
        anlegenLabel: 'Speichern',
        anlegen: function () {
          var n = Object.assign({}, self.state.neu); delete n.istNeu;
          if (!n.titel.trim()) n.titel = 'Neuer Termin';
          if (self.externe(n).length) n.status = 'entwurf';
          self.setState({ neu: null, sel: n.id });
          self.aendere([{ id: '_neu', feld: 'termine', wert: self.wert('_neu', 'termine', []).concat([n]), basis: [] }], self.externe(n).length ? 'Termin gespeichert – Einladung noch nicht verschickt' : 'Termin gespeichert');
        },
        kannEinladen: !istNeu && s === 'entwurf' && ext.length > 0,
        einladen: function () { self.aendere([{ id: e.id, feld: 'status', wert: 'eingeladen', basis: e.status }], 'Einladung an ' + ext.join(', ') + ' über dein Postfach gesendet'); },
        kannAbsagen: !istNeu && s !== 'abgesagt',
        absagenLabel: s === 'eingeladen' || (s === 'fest' && ext.length && !self.vorbei(e)) ? 'Absagen' : (s === 'entwurf' ? 'Verwerfen' : 'Absagen'),
        absagen: function () {
          var mitMail = (s === 'eingeladen' || s === 'fest') && ext.length > 0 && !self.vorbei(e);
          self.aendere([{ id: e.id, feld: 'status', wert: 'abgesagt', basis: e.status }], mitMail ? 'Abgesagt – Absage an ' + ext.join(', ') + ' liegt als Entwurf in Mail' : 'Termin abgesagt');
        },
        wiederherstellen: function () { self.aendere([{ id: e.id, feld: 'status', wert: e.status || 'fest', basis: e.status }], 'Termin wiederhergestellt'); },
        hatVorgangLink: !istNeu && this.v(e, 'vorgang').indexOf('–') !== 0, gehoertHref: this.bereichHref(this.v(e, 'vorgang')),
        zeigeWasKam: !istNeu && fragt(e),
        wasKamSpeichern: function (x) { if (x && x.preventDefault) x.preventDefault(); var t = self.state.wasText.trim(); if (!t) return; self.setState({ wasText: '' }); self.aendere([{ id: e.id, feld: 'ergebnis', wert: t, basis: e.ergebnis || '' }], 'Im Verlauf von „' + self.v(e, 'vorgang').split(' · ').pop() + '“ abgelegt'); },
        hatErgebnis: !istNeu && !!this.v(e, 'ergebnis'), ergebnis: this.v(e, 'ergebnis') || ''
      };
    }
    var nach = this.basis().filter(function (x) { return self.v(x, 'wer') === 'Andreas' && fragt(x); });
    var entw = this.basis().filter(function (x) { return self.v(x, 'wer') === 'Andreas' && self.v(x, 'status') === 'entwurf'; });
    var tagOpt = ['0', '1', '2', '3', '4', '5', '6'];
    if (e && tagOpt.indexOf(this.v(e, 'tag')) < 0) tagOpt.push(this.v(e, 'tag'));
    var zeiten = []; for (var hh = 8; hh < 19; hh++) { ['00', '30'].forEach(function (mm) { zeiten.push((hh < 10 ? '0' : '') + hh + ':' + mm); }); }
    if (e && zeiten.indexOf(this.v(e, 'start')) < 0) zeiten.push(this.v(e, 'start'));
    return Object.assign(this.kcVals(), this.toastVals(), {
      sidebarChats: this.kgChats(),
      modi: ['Woche', 'Monat'], modus: st.modus, setModus: function (w) { self.setState({ modus: w }); },
      scopes: ['Meins', 'Team'], scope: st.scope, setScope: function (w) { self.setState({ scope: w }); },
      istWoche: st.modus === 'Woche', istMonat: st.modus === 'Monat',
      zeitraum: st.modus === 'Woche' ? 'KW 40 · 28.09.–04.10.2026' : 'September 2026',
      quellenZeile: st.scope === 'Team' ? 'Kalender: Andreas (Outlook) · Julia (Outlook) · Mehmet (Outlook) · Teamkalender' : 'Kalender: Andreas (Outlook) · Teamkalender Gründungszentrum',
      neuerTermin: neuAn('3', '10:00'), wochenendeTermin: neuAn('5', '10:00'),
      rasterSpalten: 'grid-template-columns: 44px repeat(5, minmax(0, 1fr)) 72px; grid-template-rows: auto 528px',
      stunden: stunden, tage: tage, jetztTop: 'top: ' + px('14:40') + 'px', zellen: zellen,
      zeigeForm: !!e, zeigeUebersicht: !e, formTitel: e && e.istNeu ? 'Neuer Termin' : 'Termin', e: ev,
      schliessen: function () { self.setState({ sel: null, neu: null }); },
      tagOptionen: tagOpt.map(function (k) { return { wert: k, label: self.tagLabel(k) }; }),
      zeitOptionen: zeiten,
      vorgaenge: this.zuordnungen(),
      wasText: st.wasText, wasTippen: function (x) { self.setState({ wasText: x.target.value }); },
      nachtragen: nach.map(function (x) { return { titel: self.v(x, 'titel'), wann: self.tagLabel(self.v(x, 'tag')) + ' ' + self.v(x, 'start'), los: oeffne(x) }; }),
      nichtsNachzutragen: nach.length === 0,
      entwuerfe: entw.map(function (x) { return { titel: self.v(x, 'titel'), wann: self.tagLabel(self.v(x, 'tag')) + ' ' + self.v(x, 'start') + ' · noch nicht verschickt', los: oeffne(x) }; }),
      keineEntwuerfe: entw.length === 0
    });
  }
}
