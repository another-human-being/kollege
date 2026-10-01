class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = Object.assign(this.basisState(), this.kcState(), { scope: 'Meins', filter: 'alle', sel: 'fin', neuText: '', status: 'Offen', ansicht: 'Liste' });
  }
  kcCfg() { var a = this.aktuell(); return { name: a ? this.wert(a.id, 'titel', a.titel) : 'Aufgaben', anzahl: 'Aufgabe, Bereich, Verlauf', platzhalter: 'Frag etwas zu dieser Aufgabe', antwort: 'Tom hat am 26.09. um Feedback „bis Mitte der Woche“ gebeten, vor allem zu den Personalkosten. Das ist heute.', belege: [{ art: 'belegt', text: 'Bitte um Feedback zum Finanzplan v2', quelle: 'Mail 26.09.' }], luecke: 'Dazu habe ich nichts Belastbares.' }; }
  daten() { return this.wert('_neu', 'liste', []).concat(this.aufgabenDaten()); }
  aktuell() { var self = this; return this.daten().filter(function (a) { return a.id === self.state.sel && !self.wert(a.id, 'geloescht', false) && self.wert(a.id, 'geprueft', '') !== 'weg'; })[0]; }
  renderVals() {
    var self = this, st = this.state;
    var gr = function (a) { return self.faelligGruppe(self.wert(a.id, 'faellig', a.faellig)); };
    var ft = function (a) { return self.datumText(self.wert(a.id, 'faellig', a.faellig), a.zeit); };
    var erlAm = function (a) { return self.wert(a.id, 'erledigtAm', a.erledigtAm || self.heuteIso()); };
    var istErl = function (a) { return self.wert(a.id, 'erledigt', !!a.erledigt); };
    var setzeErl = function (a, wert, label) { self.aendere([{ id: a.id, feld: 'erledigt', wert: wert, basis: !!a.erledigt }, { id: a.id, feld: 'erledigtAm', wert: wert ? self.heuteIso() : undefined, basis: a.erledigtAm }], label); };
    var roh = this.daten();
    var sichtbar = roh.filter(function (a) { return !self.wert(a.id, 'geloescht', false) && self.wert(a.id, 'geprueft', '') !== 'weg'; });
    var pruef = st.filter === 'ungeprüft';
    var P = this.pruefVals(roh, 5, 'Aufgaben');
    var ung = function (a) { return !!a.ungeprueft && !self.wert(a.id, 'geprueft', ''); };
    var liste = sichtbar.filter(function (a) {
      if (pruef) return ung(a);
      if (ung(a)) return false;
      var r = self.wert(a.id, 'richtung', a.richtung), wer = self.wert(a.id, 'wer', a.wer), privat = self.wert(a.id, 'privat', !!a.privat);
      if (st.scope === 'Meins' && wer !== 'Andreas') return false;
      if (st.scope === 'Team' && privat && wer !== 'Andreas') return false;
      if (st.filter === 'von uns' && r !== 'von uns') return false;
      if (st.filter === 'an uns' && r !== 'an uns') return false;
      return true;
    });
    var offen = liste.filter(function (a) { return !istErl(a); });
    var erledigte = liste.filter(function (a) { return istErl(a); });
    var zeile = function (a) {
      var r = self.wert(a.id, 'richtung', a.richtung), erl = istErl(a);
      var ueber = gr(a) === 'ueber' && !erl, inArbeit = r === 'von uns' && self.wert(a.id, 'status', a.status) === 'in Arbeit' && !erl;
      return { titel: self.wert(a.id, 'titel', a.titel), faellig: ft(a), privat: self.wert(a.id, 'privat', !!a.privat),
        faelligStil: ueber ? 'color: var(--attention)' : '',
        unter: (r === 'an uns' ? 'wartet auf ' + self.wert(a.id, 'von', a.von) : inArbeit ? 'in Arbeit' : 'von uns') + ' · ' + self.wert(a.id, 'vorgang', a.vorgang).replace(' · ', ': ') + (st.scope === 'Team' ? ' · ' + self.wert(a.id, 'wer', a.wer) : '') + (pruef ? ' · ' + a.grund : ''),
        klasse: 'pz' + (erl ? ' pz--erl' : ''),
        aktiv: a.id === st.sel ? 'true' : 'false',
        haken: pruef ? P.pruefIstGewaehlt(a.id) : erl,
        hakenLabel: (pruef ? 'Auswählen: ' : 'Erledigt: ') + self.wert(a.id, 'titel', a.titel),
        hakenLos: pruef ? P.pruefWaehle(a.id) : function () { setzeErl(a, !erl, (erl ? 'Wieder offen: ' : 'Erledigt: ') + self.wert(a.id, 'titel', a.titel)); },
        los: function () { self.setState({ zu: false, sel: a.id, kcOffen: false }); } };
    };
    var defs = pruef ? [['alle', 'Ungeprüft']] : [['ueber', 'Überfällig'], ['heute', 'Heute'], ['woche', 'Diese Woche'], ['spaeter', 'Später'], ['ohne', 'Ohne Datum']];
    var gruppen = defs.map(function (d) {
      var items = offen.filter(function (a) { return pruef || gr(a) === d[0]; }).sort(function (a, b) { var x = self.wert(a.id, 'faellig', a.faellig) || '9', y = self.wert(b.id, 'faellig', b.faellig) || '9'; return x < y ? -1 : x > y ? 1 : 0; });
      return { titel: d[1], anzahl: items.length, items: items.map(zeile), stil: d[0] === 'ueber' ? 'color: var(--attention)' : '' };
    }).filter(function (g) { return g.anzahl > 0; });
    if (st.status === 'Erledigt' && !pruef) gruppen = [];
    if (st.status !== 'Offen' && erledigte.length && !pruef) gruppen.push({ titel: 'Erledigt', anzahl: erledigte.length, items: erledigte.map(zeile), stil: '' });
    // Board: Offen / In Arbeit gelten für „von uns“; „Wartet auf andere“ ergibt sich aus der Richtung „an uns“ (E27, E44)
    var statusVon = function (a) { if (istErl(a)) return 'erledigt'; if (self.wert(a.id, 'richtung', a.richtung) === 'an uns') return 'wartet'; return self.wert(a.id, 'status', a.status) === 'in Arbeit' ? 'in Arbeit' : 'offen'; };
    var SP = [['offen', 'Offen'], ['in Arbeit', 'In Arbeit'], ['wartet', 'Wartet auf andere'], ['erledigt', 'Erledigt']];
    var setzeStatus = function (a, s) {
      var r = self.wert(a.id, 'richtung', a.richtung), titel = self.wert(a.id, 'titel', a.titel);
      if (s === 'wartet' && r !== 'an uns') return self.aendere([], '„Wartet auf andere“ heißt: jemand hat uns etwas zugesagt. Dafür im Detail die Richtung auf „an uns“ stellen.', true);
      if ((s === 'offen' || s === 'in Arbeit') && r === 'an uns') return self.aendere([], 'Das ist eine Zusage an uns – sie bleibt bei „Wartet auf andere“, bis sie da ist.', true);
      var ch = [{ id: a.id, feld: 'erledigt', wert: s === 'erledigt', basis: !!a.erledigt }, { id: a.id, feld: 'erledigtAm', wert: s === 'erledigt' ? self.heuteIso() : undefined, basis: a.erledigtAm }];
      if (s === 'offen' || s === 'in Arbeit') ch.push({ id: a.id, feld: 'status', wert: s, basis: a.status || 'offen' });
      self.aendere(ch, '„' + titel + '“ → ' + SP.filter(function (x) { return x[0] === s; })[0][1]);
    };
    var vor14 = '2026-09-16';
    var spalten = SP.map(function (sp) {
      var karten = liste.filter(function (a) { return !ung(a) && statusVon(a) === sp[0] && (sp[0] !== 'erledigt' || erlAm(a) >= vor14); });
      return { titel: sp[1], anzahl: karten.length, hinweis: sp[0] === 'wartet' ? 'ergibt sich aus „an uns“' : sp[0] === 'erledigt' ? 'letzte 14 Tage' : '',
        ueber: function (e) { e.preventDefault(); }, ablegen: function (e) { e.preventDefault(); var id = self._zieh; self._zieh = null; var a = liste.filter(function (x) { return x.id === id; })[0]; if (a && statusVon(a) !== sp[0]) setzeStatus(a, sp[0]); },
        karten: karten.map(function (a) { return { titel: self.wert(a.id, 'titel', a.titel), faellig: ft(a), faelligStil: gr(a) === 'ueber' && sp[0] !== 'erledigt' ? 'color: var(--attention)' : '', unter: self.wert(a.id, 'vorgang', a.vorgang).replace(' · ', ': '), wer: self.wert(a.id, 'richtung', a.richtung) === 'an uns' ? 'von ' + self.wert(a.id, 'von', a.von) : self.wert(a.id, 'wer', a.wer),
          klasse: 'karte' + (a.id === st.sel && !st.zu ? ' karte--aktiv' : '') + (sp[0] === 'erledigt' ? ' karte--erl' : ''),
          ziehen: function (e) { self._zieh = a.id; try { e.dataTransfer.setData('text/plain', a.id); } catch (x) {} },
          los: function () { self.setState({ zu: false, sel: a.id, kcOffen: false }); } }; }) };
    });

    var a = this.aktuell(), d = {};
    if (a) {
      var r = this.wert(a.id, 'richtung', a.richtung), erl = istErl(a), f = this.wert(a.id, 'faellig', a.faellig), priv = this.wert(a.id, 'privat', !!a.privat), g = gr(a);
      var ber = g === 'ueber' ? 'überfällig seit ' + this.tageSeit(f) + (this.tageSeit(f) === 1 ? ' Tag' : ' Tagen') : g === 'heute' ? 'heute fällig' : g === 'ohne' ? '' : this.datumText(f);
      d = {
        f: this.feld(a.id, a, 'Aufgabe'),
        titel: this.wert(a.id, 'titel', a.titel), richtung: r, anUns: r === 'an uns',
        von: this.wert(a.id, 'von', a.von || ''), wer: this.wert(a.id, 'wer', a.wer),
        werLabel: r === 'an uns' ? 'Im Blick' : 'Zuständig',
        faellig: f || '', faelligOhne: !f, vorgang: this.wert(a.id, 'vorgang', a.vorgang), gehoertHref: this.bereichHref(this.wert(a.id, 'vorgang', a.vorgang)), notiz: this.wert(a.id, 'notiz', a.notiz || ''),
        hatBerechnet: !!ber && !erl, berechnet: ber + (r === 'an uns' && g === 'ueber' ? ' · nachfassen?' : ''), berechnetStil: g === 'ueber' ? 'color: var(--attention)' : '',
        datumWeg: function () { self.aendere([{ id: a.id, feld: 'faellig', wert: '', basis: a.faellig }], 'Fälligkeit entfernt'); },
        herkunft: a.herkunft, quelle: a.quelle,
        statusWert: statusVon(a), statusWahl: function (e) { setzeStatus(a, e.target.value); },
        statusOptionen: r === 'an uns' ? [{ w: 'wartet', l: 'Wartet auf andere' }, { w: 'erledigt', l: 'Erledigt' }] : [{ w: 'offen', l: 'Offen' }, { w: 'in Arbeit', l: 'In Arbeit' }, { w: 'erledigt', l: 'Erledigt' }],
        erledigt: erl, erledigtText: erl ? 'erledigt · Haken entfernen öffnet wieder' : (r === 'an uns' ? 'offen · abhaken, wenn es da ist' : 'offen · abhaken, wenn erledigt'),
        toggle: function () { setzeErl(a, !erl, erl ? 'Wieder offen' : 'Erledigt: ' + self.wert(a.id, 'titel', a.titel)); },
        privat: priv, sichtbarText: priv ? 'nur für dich' : 'für das Team', privatKnopf: priv ? 'fürs Team freigeben' : 'privat machen',
        privatToggle: function () { self.aendere([{ id: a.id, feld: 'privat', wert: !priv, basis: !!a.privat }], priv ? 'Fürs Team sichtbar' : 'Privat – nur für dich'); },
        loeschen: function () { self.aendere([{ id: a.id, feld: 'geloescht', wert: true, basis: false }], 'Gelöscht: ' + self.wert(a.id, 'titel', a.titel)); },
        istUngeprueft: ung(a), grund: a.grund || '',
        uebernehmen: function () { self.aendere([{ id: a.id, feld: 'geprueft', wert: 'ok', basis: '' }], 'Übernommen: ' + a.titel); },
        verwerfen: function () { self.aendere([{ id: a.id, feld: 'geprueft', wert: 'weg', basis: '' }], 'Verworfen: ' + a.titel); }
      };
    }
    var fl = function (label, key) { return { label: label, an: st.filter === key ? 'true' : 'false', los: function () { self.setState({ filter: key, pAuswahl: {}, pAlle: false }); } }; };
    var vg = this.zuordnungen();
    var DV = this.detailVals(); if (st.ansicht === 'Board' && !pruef) DV.ldKlasse += ' ld--board';
    return Object.assign(this.kcVals(), this.toastVals(), DV, P, {
      sidebarChats: this.kgChats(),
      zaehler: pruef ? P.pruefGesamt + ' ungeprüft' : offen.length + ' offen',
      scopes: ['Meins', 'Team'], scope: st.scope, setScope: function (w) { self.setState({ scope: w }); },
      filter: [fl('alle', 'alle'), fl('von uns', 'von uns'), fl('an uns', 'an uns'), fl('ungeprüft · ' + P.pruefGesamt, 'ungeprüft')],
      pruefModus: pruef,
      neuText: st.neuText, neuTippen: function (e) { self.setState({ neuText: e.target.value }); },
      neuPlatzhalter: st.filter === 'an uns' ? 'Was hat uns jemand zugesagt?' : 'Neue Aufgabe, Enter legt an',
      anlegen: function (e) {
        if (e && e.preventDefault) e.preventDefault();
        var t = self.state.neuText.trim(); if (!t) return;
        var id = 'n' + Date.now(), anUns = self.state.filter === 'an uns';
        var neu = { id: id, richtung: anUns ? 'an uns' : 'von uns', von: anUns ? '' : undefined, titel: t, vorgang: '– (ohne Bereich)', wer: 'Andreas', faellig: '', herkunft: 'von Hand angelegt', quelle: 'gerade eben' };
        self.setState({ neuText: '', sel: id, zu: false, filter: anUns ? 'an uns' : 'alle', status: 'Offen' });
        self.aendere([{ id: '_neu', feld: 'liste', wert: [neu].concat(self.wert('_neu', 'liste', [])), basis: [] }], 'Aufgabe angelegt – Fälligkeit und „Gehört zu“ rechts setzen');
      },
      gruppen: gruppen, keine: gruppen.length === 0,
      statusOptionen: ['Offen', 'Erledigt', 'Alle'], status: st.status, setStatus: function (w) { self.setState({ status: w }); },
      ansichten: ['Liste', 'Board'], ansicht: st.ansicht, setAnsicht: function (w) { self.setState({ ansicht: w, zu: w === 'Board' ? true : self.state.zu }); },
      istListe: st.ansicht !== 'Board' || pruef, istBoard: st.ansicht === 'Board' && !pruef, spalten: spalten,
      erledigtZaehler: erledigte.length + ' erledigt',
      zeigeStatusUmschalter: st.ansicht !== 'Board' || pruef,
      hatDetail: !!a, keinDetail: !a, d: d,
      personen: ['Andreas', 'Julia', 'Mehmet'], vorgaenge: vg
    });
  }
}
