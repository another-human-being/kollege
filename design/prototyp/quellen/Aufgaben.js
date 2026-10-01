class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = Object.assign(this.basisState(), this.kcState(), { scope: 'Meins', filter: 'alle', sel: 'fin', neuText: '', zeigeErledigte: false });
  }
  kcCfg() { var a = this.aktuell(); return { name: a ? this.wert(a.id, 'titel', a.titel) : 'Aufgaben', anzahl: 'Aufgabe, Bereich, Verlauf', platzhalter: 'Frag etwas zu dieser Aufgabe', antwort: 'Tom hat am 26.09. um Feedback „bis Mitte der Woche“ gebeten, vor allem zu den Personalkosten. Das ist heute.', belege: [{ art: 'belegt', text: 'Bitte um Feedback zum Finanzplan v2', quelle: 'Mail 26.09.' }], luecke: 'Dazu habe ich nichts Belastbares.' }; }
  // bucket: ueber | heute | woche | spaeter
  termine() { return { '25.09.': 'ueber', 'Di 29.09.': 'ueber', 'heute': 'heute', 'heute 17:00': 'heute', 'Do 01.10.': 'woche', 'Fr 02.10.': 'woche', 'Mo 05.10.': 'spaeter', '06.10.': 'spaeter', '15.10.': 'spaeter', '04.11.': 'spaeter', 'ohne Datum': 'spaeter' }; }
  daten() {
    var A = [
      { id: 'raum', richtung: 'von uns', titel: 'Raum für Sitzung 3 buchen', vorgang: 'Lehre · Entrepreneurship Basics', wer: 'Andreas', faellig: 'Di 29.09.', herkunft: 'Bitte von Prof. Hartmann', quelle: 'Mail 28.09.' },
      { id: 'fin', richtung: 'von uns', titel: 'Feedback zum Finanzplan an Tom Kraus', vorgang: 'Gründungsteams · Solaro', wer: 'Andreas', faellig: 'heute', herkunft: 'Tom bittet um Feedback „bis Mitte der Woche“', quelle: 'Mail 26.09.', notiz: 'Vor allem Personalkosten ansehen – Tom sagt selbst, die sind noch wackelig.' },
      { id: 'std', richtung: 'von uns', titel: 'Save-the-Date Gründungsnacht verschicken', vorgang: 'Events · Gründungsnacht 2026', wer: 'Andreas', faellig: 'heute', herkunft: 'nach Anweisung von Julia', quelle: 'Anweisung 24.09.' },
      { id: 'weber', richtung: 'von uns', titel: 'Kontakt zu Frau Weber (IHK) vermitteln', vorgang: 'Gründungsteams · Solaro', wer: 'Andreas', faellig: 'Fr 02.10.', herkunft: 'in der Beratung zugesagt', quelle: 'Chat 30.09.' },
      { id: 'nord', richtung: 'von uns', titel: 'Bei Nordlicht nachfassen', vorgang: 'Gründungsteams · Nordlicht Analytics', wer: 'Andreas', faellig: 'Do 01.10.', herkunft: 'nach Anweisung von Mehmet', quelle: 'Anweisung 15.09.' },
      { id: 'tom', richtung: 'von uns', titel: 'Bei Tom wegen Finanzierung nachfragen', vorgang: 'Gründungsteams · Solaro', wer: 'Andreas', faellig: 'Mo 05.10.', herkunft: 'eigene Notiz', quelle: 'Chat 24.09.', privat: true },
      { id: 'jb', richtung: 'von uns', titel: 'Jury-Briefing vorbereiten', vorgang: 'Events · Pitch-Abend', wer: 'Andreas', faellig: '04.11.', herkunft: 'aus dem Termin abgeleitet', quelle: 'Kalender 04.11.' },
      { id: 'sommer', richtung: 'von uns', titel: 'Rückblick Sommerfest fertigstellen', vorgang: 'Social Media · Rückblick Sommerfest', wer: 'Mehmet', faellig: '25.09.', herkunft: 'eigene Notiz', quelle: 'Notiz 12.09.' },
      { id: 'insta', richtung: 'von uns', titel: 'Instagram-Beitrag Pitch-Abend freigeben', vorgang: 'Social Media · Pitch-Abend ankündigen', wer: 'Mehmet', faellig: 'heute 17:00', herkunft: 'eigene Notiz', quelle: 'Notiz 29.09.' },
      { id: 'jury', richtung: 'von uns', titel: 'Jury vollständig machen', vorgang: 'Events · Pitch-Abend', wer: 'Julia', faellig: 'Fr 02.10.', herkunft: 'Teamrunde', quelle: 'Mail 21.09.' },
      { id: 'hyg', richtung: 'von uns', titel: 'Hygieneschulung für Kitchen Loop klären', vorgang: 'Gründungsteams · Kitchen Loop', wer: 'Julia', faellig: 'Do 01.10.', herkunft: 'Julia: „Ich kläre das mit dem Studierendenwerk.“', quelle: 'Mail 24.09.' },
      // an uns: Zusagen anderer
      { id: 'pd', richtung: 'an uns', von: 'Lisa Meier (Solaro)', titel: 'Pitchdeck final inkl. Finanzteil', vorgang: 'Gründungsteams · Solaro', wer: 'Andreas', faellig: 'Fr 02.10.', herkunft: 'Entwurf kam gestern, Finanzteil fehlt noch', quelle: 'Mail 29.09.' },
      { id: 'fp', richtung: 'an uns', von: 'Tom Kraus (Solaro)', titel: 'Finanzplan überarbeiten (Personalkosten)', vorgang: 'Gründungsteams · Solaro', wer: 'Andreas', faellig: '15.10.', herkunft: 'in der Beratung vereinbart', quelle: 'Notiz 22.09.' },
      { id: 'folien', richtung: 'an uns', von: 'Prof. Dr. Martin Hartmann', titel: 'Folien für Sitzung 3 schicken', vorgang: 'Lehre · Entrepreneurship Basics', wer: 'Andreas', faellig: '06.10.', herkunft: '„Die Folien schicke ich bis 06.10.“', quelle: 'Mail 28.09.' },
      { id: 'aw', richtung: 'an uns', von: 'Anna Weber (IHK Schwaben)', titel: 'Rückmeldung: Jurorin beim Pitch-Abend?', vorgang: 'Events · Pitch-Abend', wer: 'Julia', faellig: '25.09.', herkunft: 'Anfrage von Julia; Antwort zugesagt „bis Ende der Woche“', quelle: 'Mail 21.09.' },
      { id: 'sw', richtung: 'an uns', von: 'Studierendenwerk', titel: 'Termin für Pilotstart Mensa nennen', vorgang: 'Gründungsteams · Kitchen Loop', wer: 'Julia', faellig: 'Fr 02.10.', herkunft: 'Telefonnotiz Julia', quelle: 'Notiz 23.09.' },
      // ungeprüft aus dem Import
      { id: 'u1', ungeprueft: true, richtung: 'von uns', titel: 'Presseanfrage Porträt Gründerinnen beantworten', vorgang: '– (ohne Bereich)', wer: 'Mehmet', faellig: 'Fr 02.10.', grund: 'Frage in einer Mail ans StartHub-Postfach', herkunft: 'Anfrage der Augsburger Allgemeinen', quelle: 'Mail heute 08:05' },
      { id: 'u2', ungeprueft: true, richtung: 'von uns', titel: 'Max Brandt Sprechstunde anbieten', vorgang: 'Gründungsteams · Lern-App (Max Brandt)', wer: 'Andreas', faellig: 'Do 01.10.', grund: 'unbeantwortete Frage im StartHub-Postfach', herkunft: 'Anfrage Gründungsstipendium', quelle: 'Mail 29.09.' },
      { id: 'u3', ungeprueft: true, richtung: 'an uns', von: 'Karin Vogt (Stadtwerke)', titel: 'Unterschriebene Rahmenvereinbarung', vorgang: '– (ohne Bereich)', wer: 'Andreas', faellig: 'ohne Datum', grund: '„schicken wir Ihnen dann unterschrieben zu“', herkunft: 'Kooperationsgespräch', quelle: 'Mail 29.09.' },
      { id: 'u4', ungeprueft: true, richtung: 'von uns', titel: 'Hackathon-Challenge zusagen oder absagen', vorgang: '– (ohne Bereich)', wer: 'Julia', faellig: 'ohne Datum', grund: 'Frage in einer Mail ans StartHub-Postfach', herkunft: 'Anfrage Fachschaft Informatik', quelle: 'Mail 28.09.' },
      { id: 'u5', ungeprueft: true, richtung: 'von uns', titel: 'Rechnung Raumtechnik weiterleiten', vorgang: '– (ohne Bereich)', wer: 'Julia', faellig: 'ohne Datum', grund: 'Rechnung im Netzlaufwerk ohne Vermerk', herkunft: 'Rechnung_0326.pdf', quelle: 'Netzlaufwerk' }
    ];
    return this.wert('_neu', 'liste', []).concat(A);
  }
  aktuell() { var self = this; return this.daten().filter(function (a) { return a.id === self.state.sel && !self.wert(a.id, 'geloescht', false) && self.wert(a.id, 'geprueft', '') !== 'weg'; })[0]; }
  renderVals() {
    var self = this, st = this.state, T = this.termine();
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
      if (st.scope === 'Team' && privat) return false;
      if (st.filter === 'von uns' && r !== 'von uns') return false;
      if (st.filter === 'an uns' && r !== 'an uns') return false;
      return true;
    });
    var offen = liste.filter(function (a) { return !self.wert(a.id, 'erledigt', false); });
    var erledigte = liste.filter(function (a) { return self.wert(a.id, 'erledigt', false); });
    var zeile = function (a) {
      var r = self.wert(a.id, 'richtung', a.richtung), f = self.wert(a.id, 'faellig', a.faellig), erl = self.wert(a.id, 'erledigt', false);
      var ueber = T[f] === 'ueber' && !erl;
      return { titel: self.wert(a.id, 'titel', a.titel), faellig: f,
        faelligStil: ueber ? 'color: var(--attention)' : '',
        unter: (r === 'an uns' ? 'an uns · ' + self.wert(a.id, 'von', a.von) : 'von uns') + ' · ' + self.wert(a.id, 'vorgang', a.vorgang).replace(' · ', ': ') + (st.scope === 'Team' ? ' · ' + self.wert(a.id, 'wer', a.wer) : '') + (pruef ? ' · ' + a.grund : ''),
        klasse: 'pz' + (erl ? ' pz--erl' : ''),
        aktiv: a.id === st.sel ? 'true' : 'false',
        haken: pruef ? P.pruefIstGewaehlt(a.id) : erl,
        hakenLabel: (pruef ? 'Auswählen: ' : 'Erledigt: ') + self.wert(a.id, 'titel', a.titel),
        hakenLos: pruef ? P.pruefWaehle(a.id) : function () { self.aendere([{ id: a.id, feld: 'erledigt', wert: !erl, basis: false }], (erl ? 'Wieder offen: ' : 'Erledigt: ') + self.wert(a.id, 'titel', a.titel)); },
        los: function () { self.setState({ sel: a.id, kcOffen: false }); } };
    };
    var defs = pruef ? [['alle', 'Ungeprüft']] : [['ueber', 'Überfällig'], ['heute', 'Heute'], ['woche', 'Diese Woche'], ['spaeter', 'Später']];
    var gruppen = defs.map(function (d) {
      var items = offen.filter(function (a) { return pruef || T[self.wert(a.id, 'faellig', a.faellig)] === d[0]; });
      return { titel: d[1], anzahl: items.length, items: items.map(zeile), stil: d[0] === 'ueber' ? 'color: var(--attention)' : '' };
    }).filter(function (g) { return g.anzahl > 0; });
    if (st.zeigeErledigte && erledigte.length && !pruef) gruppen.push({ titel: 'Erledigt', anzahl: erledigte.length, items: erledigte.map(zeile), stil: '' });

    var a = this.aktuell(), d = {};
    if (a) {
      var r = this.wert(a.id, 'richtung', a.richtung), erl = this.wert(a.id, 'erledigt', false), f = this.wert(a.id, 'faellig', a.faellig), priv = this.wert(a.id, 'privat', !!a.privat);
      var ber = { ueber: 'überfällig', heute: 'heute fällig' }[T[f]] || '';
      d = {
        f: this.feld(a.id, a, 'Aufgabe'),
        titel: this.wert(a.id, 'titel', a.titel), richtung: r, anUns: r === 'an uns',
        von: this.wert(a.id, 'von', a.von || ''), wer: this.wert(a.id, 'wer', a.wer),
        werLabel: r === 'an uns' ? 'Im Blick' : 'Zuständig',
        faellig: f, vorgang: this.wert(a.id, 'vorgang', a.vorgang), gehoertHref: this.bereichHref(this.wert(a.id, 'vorgang', a.vorgang)), notiz: this.wert(a.id, 'notiz', a.notiz || ''),
        hatBerechnet: !!ber && !erl, berechnet: ber + (r === 'an uns' && T[f] === 'ueber' ? ' · nachfassen?' : ''), berechnetStil: T[f] === 'ueber' ? 'color: var(--attention)' : '',
        herkunft: a.herkunft, quelle: a.quelle,
        erledigt: erl, erledigtText: erl ? 'erledigt · Haken entfernen öffnet wieder' : (r === 'an uns' ? 'offen · abhaken, wenn es da ist' : 'offen · abhaken, wenn erledigt'),
        toggle: function () { self.aendere([{ id: a.id, feld: 'erledigt', wert: !erl, basis: false }], erl ? 'Wieder offen' : 'Erledigt: ' + self.wert(a.id, 'titel', a.titel)); },
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
    return Object.assign(this.kcVals(), this.toastVals(), P, {
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
        var neu = { id: id, richtung: anUns ? 'an uns' : 'von uns', von: anUns ? '' : undefined, titel: t, vorgang: '– (ohne Bereich)', wer: 'Andreas', faellig: 'ohne Datum', herkunft: 'von Hand angelegt', quelle: 'gerade eben' };
        self.setState({ neuText: '', sel: id, filter: self.state.filter === 'ungeprüft' ? 'alle' : self.state.filter });
        self.aendere([{ id: '_neu', feld: 'liste', wert: [neu].concat(self.wert('_neu', 'liste', [])), basis: [] }], 'Aufgabe angelegt – Fälligkeit und „Gehört zu“ rechts setzen');
      },
      gruppen: gruppen, keine: gruppen.length === 0,
      hatErledigte: erledigte.length > 0 && !pruef,
      erledigteZeile: (st.zeigeErledigte ? 'Erledigte ausblenden' : erledigte.length + ' erledigt · anzeigen'),
      erledigteToggle: function () { self.setState({ zeigeErledigte: !self.state.zeigeErledigte }); },
      hatDetail: !!a, keinDetail: !a, d: d,
      personen: ['Andreas', 'Julia', 'Mehmet'], termine: Object.keys(T), vorgaenge: vg
    });
  }
}
