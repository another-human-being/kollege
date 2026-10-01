class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = Object.assign(this.basisState(), this.kcState(), { ordner: 'solaro', filter: 'alle', suche: '', sel: 'f0' });
  }
  kcCfg() { var d = this.aktuell(); return { name: d ? this.wert(d.id, 'name', d.name) : 'Dateien', anzahl: 'Dateiinhalt, Zuordnungen', platzhalter: 'Frag etwas zu dieser Datei', antwort: 'Im Pitchdeck-Entwurf fehlt der Finanzteil; Folie 11 verweist auf den Finanzplan v2, der noch überarbeitet wird.', belege: [{ art: 'belegt', text: 'Folie 11: „Finanzen folgen“', quelle: 'Pitchdeck_Solaro_v1.pdf' }], luecke: 'Dazu steht in der Datei nichts.' }; }
  baum() {
    return [
      ['alle', 'Alle Dateien', 0, ''], ['bera', 'Beratungen', 0, 'Beratungen'], ['solaro', 'Solaro', 1, 'Beratungen\\Solaro'], ['kl', 'Kitchen Loop', 1, 'Beratungen\\Kitchen Loop'], ['nord', 'Nordlicht Analytics', 1, 'Beratungen\\Nordlicht Analytics'],
      ['events', 'Events', 0, 'Events'], ['gn', 'Gründungsnacht 2026', 1, 'Events\\Gruendungsnacht 2026'], ['pa', 'Pitch-Abend', 1, 'Events\\Pitch-Abend'],
      ['lehre', 'Lehre', 0, 'Lehre'], ['eb', 'Entrepreneurship Basics', 1, 'Lehre\\Entrepreneurship Basics'], ['sm', 'Social Media', 0, 'Social Media'], ['verw', 'Verwaltung', 0, 'Verwaltung'], ['pers', 'Persönlich (nur du)', 0, 'persoenlich\\andreas']
    ];
  }
  bezugOptionen() {
    return { solaro: { name: 'Gründungsteams · Solaro', href: 'Gruendungsteams.dc.html' }, lisa: { name: 'Lisa Meier', href: 'Kontakte.dc.html' }, tom: { name: 'Tom Kraus', href: 'Kontakte.dc.html' }, kl: { name: 'Gründungsteams · Kitchen Loop', href: 'Gruendungsteams.dc.html' }, sara: { name: 'Sara Yilmaz', href: 'Kontakte.dc.html' }, gn: { name: 'Events · Gründungsnacht 2026', href: 'Events.dc.html' }, eb: { name: 'Lehre · Entrepreneurship Basics', href: 'Lehre.dc.html' }, pa: { name: 'Events · Pitch-Abend', href: 'Events.dc.html' }, nord: { name: 'Gründungsteams · Nordlicht Analytics', href: 'Gruendungsteams.dc.html' }, hartmann: { name: 'Prof. Dr. Martin Hartmann', href: 'Kontakte.dc.html' }, smpa: { name: 'Social Media · Pitch-Abend ankündigen', href: 'SocialMedia.dc.html' } };
  }
  daten() {
    var D = [
      { id: 'f0', ordner: 'solaro', name: 'Pitchdeck_Solaro_v1.pdf', datum: 'gestern', zeit: 'gestern 17:40 · Lisa Meier (Mail-Anhang)', fakten: '12 Folien · 2,4 MB', kurz: 'Pitchdeck-Entwurf von Solaro: Problem, Lösung, Team und Technik sind ausgearbeitet.', lang: 'Der Finanzteil fehlt noch; Folie 11 verweist auf den Finanzplan, den Tom überarbeitet. Die finale Version ist bis Fr 02.10. zugesagt.', bezuege: ['solaro', 'lisa'], verlauf: [['29.09.', 'Mail', 'Als Anhang von Lisa Meier gespeichert', 'Mail 29.09.']] },
      { id: 'f1', ordner: 'solaro', name: 'Finanzplan_Solaro_v2.xlsx', datum: '26.09.', zeit: '26.09. · Tom Kraus', fakten: '3 Tabellenblätter · 180 KB', kurz: 'Finanzplan über 36 Monate, Break-even im Monat 28, Personalkosten als größter Posten.', lang: 'Drei Szenarien. Die Personalplanung setzt zwei EXIST-Stipendien voraus; ohne Bewilligung fehlen rund 9 Monate Finanzierung.', bezuege: ['solaro', 'tom'], verlauf: [['26.09.', 'Mail', 'Als Anhang von Tom Kraus gespeichert', 'Mail 26.09.']] },
      { id: 'f2', ordner: 'solaro', name: 'Businessplan_Entwurf.pdf', datum: '28.08.', zeit: '28.08. · Lisa Meier', fakten: '14 Seiten · 1,1 MB', kurz: 'Erster Entwurf des Businessplans; Markt- und Wettbewerbsteil fehlen noch.', lang: 'Idee, Team, Technik, Finanzierung. Markt- und Wettbewerbsanalyse sind als Platzhalter markiert.', bezuege: ['solaro', 'lisa'], verlauf: [['28.08.', 'Datei', 'Auf dem Netzlaufwerk abgelegt', 'Netzlaufwerk']] },
      { id: 'f3', ordner: 'solaro', name: 'Beratungsprotokoll_22-09.docx', datum: '22.09.', zeit: '22.09. · Andreas', fakten: '2 Seiten · 40 KB', kurz: 'Protokoll der Beratung: Pitchdeck bis 29.09., Finanzplan bis 15.10.', lang: 'Kontakt zur IHK prüfen. EXIST-Voraussetzungen durchgesprochen.', bezuege: ['solaro'], verlauf: [['22.09.', 'Datei', 'Von Andreas angelegt', 'Netzlaufwerk']] },
      { id: 'f4', ordner: 'kl', name: 'Konzept_Mensa-Kooperation.pdf', datum: '24.09.', zeit: '24.09. · Sara Yilmaz', fakten: '6 Seiten · 900 KB', kurz: 'Resteverwertung aus der Mensa als Mittagsbox, Pilot im Wintersemester.', lang: 'Pilot mit 200 Boxen pro Woche; Abstimmung mit dem Studierendenwerk offen, Hygieneschulung nötig.', bezuege: ['kl', 'sara'], verlauf: [['24.09.', 'Mail', 'Als Anhang gespeichert', 'Mail 24.09.']] },
      { id: 'f5', ordner: 'nord', name: 'Nordlicht_Onepager.pdf', datum: '05.09.', zeit: '05.09. · Jonas Berg', fakten: '1 Seite · 200 KB', kurz: 'Datenanalyse für Kommunen; Zielgruppe und Preismodell noch unklar.', lang: 'Produktidee und zwei Pilotgemeinden. Kein Finanzteil.', bezuege: ['nord'], verlauf: [['05.09.', 'Mail', 'Als Anhang gespeichert', 'Mail 05.09.']] },
      { id: 'f6', ordner: 'gn', name: 'Ablaufplan_Gruendungsnacht.docx', datum: '29.09.', zeit: '29.09. · Julia', fakten: '3 Seiten · 60 KB', kurz: 'Ablauf 18–23 Uhr, 6 Pitches, zwei Workshops.', lang: 'Offene Punkte: Catering, Moderation, Technik im Foyer.', bezuege: ['gn'], verlauf: [['29.09.', 'Datei', 'Von Julia geändert', 'Netzlaufwerk']] },
      { id: 'f7', ordner: 'pa', name: 'Jury_Anfragen.xlsx', datum: '21.09.', zeit: '21.09. · Julia', fakten: '4 Zeilen · 20 KB', kurz: 'Angefragte Jurymitglieder: 2 Zusagen, 1 offen, 1 Absage.', lang: 'Frau Weber (IHK) offen; Dr. Albrecht und Prof. Hartmann haben zugesagt.', bezuege: ['pa'], verlauf: [['21.09.', 'Datei', 'Von Julia geändert', 'Netzlaufwerk']] },
      { id: 'f8', ordner: 'eb', name: 'Sitzung_03_Folien.pptx', datum: '28.09.', zeit: '28.09. · Prof. Hartmann', fakten: '32 Folien · 5,8 MB', kurz: 'Folien zu Geschäftsmodellen, noch ohne Fallbeispiel aus dem Gründungszentrum.', lang: 'Business Model Canvas, zwei Übungen, Platzhalter für ein Fallbeispiel.', bezuege: ['eb', 'hartmann'], verlauf: [['28.09.', 'Mail', 'Als Anhang gespeichert', 'Mail 28.09.']] },
      { id: 'f10', ordner: 'sm', name: 'Redaktionsplan_Q4.xlsx', datum: '29.09.', zeit: '29.09. · Mehmet', fakten: '18 Zeilen · 30 KB', kurz: 'Beiträge bis Dezember, Schwerpunkt Pitch-Abend und Gründungsnacht.', lang: '18 geplante Beiträge, 4 davon mit Freigabe offen.', bezuege: ['smpa', 'gn'], verlauf: [['29.09.', 'Datei', 'Von Mehmet geändert', 'Netzlaufwerk']] },
      { id: 'f11', ordner: 'pers', privat: true, name: 'Notizen_Tom.txt', datum: '24.09.', zeit: '24.09. · Andreas', fakten: '1 KB', kurz: 'Persönliche Notiz zur Finanzierungssituation.', lang: 'Nur für dich sichtbar – liegt in deinem persönlichen Ordner.', bezuege: ['tom'], verlauf: [['24.09.', 'Notiz', 'Von Andreas angelegt', 'Netzlaufwerk']] },
      { id: 'u1', ungeprueft: true, ordner: 'verw', name: 'Rechnung_0923.pdf', datum: '23.09.', zeit: '23.09. · Mail-Anhang', fakten: '1 Seite · 90 KB', grund: 'Absender „Kitchen Loop Catering“ ähnelt Kitchen Loop', kurz: 'Rechnung von „Kitchen Loop Catering“ (Sven Ott) über ein Catering am 19.09.', lang: 'Absender weicht vom bekannten Team Kitchen Loop ab – möglicherweise eine andere Firma.', bezuege: ['kl'], verlauf: [['23.09.', 'Mail', 'Als Anhang gespeichert', 'Mail 23.09.']] },
      { id: 'u2', ungeprueft: true, ordner: 'verw', name: 'Rechnung_0326.pdf', datum: '20.03.', zeit: '20.03. · Import', fakten: '1 Seite · 70 KB', grund: 'erwähnt „Gründungsnacht“ im Verwendungszweck', kurz: 'Rechnung über Beamer-Miete.', lang: 'Verwendungszweck nennt die Gründungsnacht 2025, nicht 2026.', bezuege: ['gn'], verlauf: [['20.03.', 'Datei', 'Beim Import gefunden', 'Netzlaufwerk']] },
      { id: 'u3', ungeprueft: true, ordner: 'lehre', name: 'Teilnehmerliste_WS25.xlsx', datum: '14.10.2025', zeit: '14.10.2025 · Import', fakten: '38 Zeilen · 25 KB', grund: 'liegt im Ordner Lehre, Titel passt zum Kurs', kurz: 'Teilnehmende des Kurses im letzten Wintersemester.', lang: 'Enthält Namen und Matrikelnummern – ältere Kursrunde, nicht WS 26/27.', bezuege: ['eb'], verlauf: [['14.10.25', 'Datei', 'Beim Import gefunden', 'Netzlaufwerk']] }
    ];
    return this.wert('_neu', 'liste', []).concat(D);
  }
  aktuell() { var self = this; return this.daten().filter(function (d) { return d.id === self.state.sel && self.wert(d.id, 'geprueft', '') !== 'weg'; })[0]; }
  renderVals() {
    var self = this, st = this.state, B = this.baum(), V = this.bezugOptionen();
    var roh = this.daten();
    var alle = roh.filter(function (d) { return self.wert(d.id, 'geprueft', '') !== 'weg'; });
    var pruef = st.filter === 'ungeprüft';
    var P = this.pruefVals(roh, 3, 'Dateien', { verwerfenLabel: 'Zuordnung verwerfen', verworfenText: ': Zuordnung verworfen – die Dateien bleiben im Ordner', verwerfen: function (i) { return [{ id: i.id, feld: 'geprueft', wert: 'ok', basis: '' }, { id: i.id, feld: 'bezuege', wert: [], basis: i.bezuege }]; } });
    var ung = function (d) { return !!d.ungeprueft && !self.wert(d.id, 'geprueft', ''); };
    var eltern = function (k) { var i = B.map(function (b) { return b[0]; }).indexOf(k); if (i < 0 || !B[i][2]) return k; for (var j = i; j >= 0; j--) if (!B[j][2]) return B[j][0]; return k; };
    var imOrdner = function (d, k) { var o = self.wert(d.id, 'ordner', d.ordner); return k === 'alle' || o === k || eltern(o) === k; };
    var q = st.suche.trim().toLowerCase();
    var liste = alle.filter(function (d) {
      if (pruef) return ung(d);
      if (!imOrdner(d, st.ordner)) return false;
      if (st.filter === 'zugeordnet' && !self.wert(d.id, 'bezuege', d.bezuege).length) return false;
      return !q || (self.wert(d.id, 'name', d.name) + ' ' + d.kurz).toLowerCase().indexOf(q) >= 0;
    });
    var bName = function (k) { return (B.filter(function (b) { return b[0] === k; })[0] || [k, k])[1]; };
    var bPfad = function (k) { return (B.filter(function (b) { return b[0] === k; })[0] || [0, 0, 0, ''])[3]; };
    var zeilen = liste.map(function (d) {
      var bz = self.wert(d.id, 'bezuege', d.bezuege);
      return { name: self.wert(d.id, 'name', d.name), datum: d.datum, pruef: pruef, normal: !pruef,
        unter: (st.ordner === 'alle' || pruef ? bName(self.wert(d.id, 'ordner', d.ordner)) + ' · ' : '') + (pruef ? d.grund : (bz.length ? bz.map(function (k) { return V[k] ? V[k].name : k; }).join(', ') : 'nicht zugeordnet')),
        aktiv: d.id === st.sel ? 'true' : 'false', gewaehlt: P.pruefIstGewaehlt(d.id), waehlen: P.pruefWaehle(d.id),
        los: function () { self.setState({ zu: false, sel: d.id, kcOffen: false }); } };
    });
    var d = this.aktuell(), dv = {};
    if (d) {
      var bz = this.wert(d.id, 'bezuege', d.bezuege), ord = this.wert(d.id, 'ordner', d.ordner), nm = this.wert(d.id, 'name', d.name);
      var endung = (nm.split('.').pop() || '').toLowerCase();
      var app = { xlsx: 'Excel', docx: 'Word', pptx: 'PowerPoint', pdf: 'der PDF-Vorschau', txt: 'dem Editor' }[endung] || 'der Standard-App';
      var pfad = '\\\\fs.uni-augsburg.de\\gruendung\\' + bPfad(ord) + '\\' + nm;
      var setBz = function (neu, label) { self.aendere([{ id: d.id, feld: 'bezuege', wert: neu, basis: d.bezuege }], label); };
      dv = {
        f: this.feld(d.id, d, 'Datei'), name: nm, ordner: ord, pfad: pfad, zeit: d.zeit, fakten: d.fakten, kurz: d.kurz, lang: d.lang,
        privat: !!d.privat, sichtbar: d.privat ? 'nur für dich (persönlicher Ordner)' : 'für das Team',
        oeffnenLabel: 'Öffnen in ' + app.replace('der ', '').replace('dem ', ''),
        oeffnen: function () { self.aendere([], nm + ' wird in ' + app + ' geöffnet – Änderungen landen direkt auf dem Netzlaufwerk', true); },
        pfadKopieren: function () { self.aendere([], 'Pfad kopiert', true); },
        bezuege: bz.map(function (k) { var v = V[k] || { name: k, href: 'Main.dc.html' }; return { name: v.name, href: v.href, wegLabel: 'Zuordnung entfernen: ' + v.name, weg: function () { setBz(bz.filter(function (x) { return x !== k; }), 'Zuordnung entfernt: ' + v.name); } }; }),
        moeglich: Object.keys(V).filter(function (k) { return bz.indexOf(k) < 0; }).map(function (k) { return { key: k, name: V[k].name }; }),
        zuordnen: function (e) { var k = e.target.value; if (!k) return; setBz(bz.concat([k]), 'Zugeordnet: ' + V[k].name); },
        verlauf: d.verlauf.map(function (v) { return { monat: v[0].length > 6 ? 'früher' : 'September 2026', datum: v[0], art: v[1], text: v[2], quelle: v[3] }; }),
        istUngeprueft: ung(d), grund: d.grund || '',
        uebernehmen: function () { self.aendere([{ id: d.id, feld: 'geprueft', wert: 'ok', basis: '' }], 'Zuordnung übernommen: ' + nm); },
        verwerfen: function () { self.aendere([{ id: d.id, feld: 'geprueft', wert: 'ok', basis: '' }, { id: d.id, feld: 'bezuege', wert: [], basis: d.bezuege }], 'Zuordnung verworfen – Datei bleibt, ohne Bereich'); }
      };
    }
    var fl = function (label, key) { return { label: label, an: st.filter === key ? 'true' : 'false', los: function () { self.setState({ filter: key, pAuswahl: {}, pAlle: false }); } }; };
    return Object.assign(this.kcVals(), this.toastVals(), this.detailVals(), P, {
      sidebarChats: this.kgChats(),
      ordner: B.map(function (b) { var n = alle.filter(function (d) { return !ung(d) && imOrdner(d, b[0]); }).length; return { name: b[1], zahl: n ? String(n) : '', an: st.ordner === b[0] && !pruef ? 'true' : 'false', einzug: b[2] ? 'padding-left: 24px' : '', los: function () { self.setState({ ordner: b[0], filter: self.state.filter === 'ungeprüft' ? 'alle' : self.state.filter }); } }; }),
      ordnerOptionen: B.filter(function (b) { return b[0] !== 'alle'; }).map(function (b) { return { key: b[0], name: (b[2] ? '— ' : '') + b[1] }; }),
      ordnerName: pruef ? 'Ungeprüft' : bName(st.ordner),
      zaehler: pruef ? P.pruefGesamt + ' ungeprüft' : zeilen.length + (zeilen.length === 1 ? ' Datei' : ' Dateien'),
      suche: st.suche, sucheTippen: function (e) { self.setState({ suche: e.target.value }); },
      filter: [fl('alle', 'alle'), fl('zugeordnet', 'zugeordnet'), fl('ungeprüft · ' + P.pruefGesamt, 'ungeprüft')],
      pruefModus: pruef,
      zeilen: zeilen, keine: zeilen.length === 0,
      hochladen: function () {
        var ziel = st.ordner === 'alle' || st.ordner === 'bera' ? 'solaro' : st.ordner;
        var id = 'n' + Date.now();
        var neu = { id: id, ordner: ziel, name: 'Protokoll_30-09.docx', datum: 'gerade', zeit: 'gerade eben · Andreas (hochgeladen)', fakten: '1 Seite · 30 KB', kurz: 'Protokoll der heutigen Beratung.', lang: 'Kollege liest die Datei gerade – Zusammenfassung folgt in wenigen Sekunden.', bezuege: ziel === 'solaro' ? ['solaro'] : [], verlauf: [['30.09.', 'Datei', 'Von Andreas hochgeladen', 'Netzlaufwerk']] };
        self.setState({ zu: false, sel: id });
        self.aendere([{ id: '_neu', feld: 'liste', wert: [neu].concat(self.wert('_neu', 'liste', [])), basis: [] }], 'Hochgeladen nach ' + bName(ziel) + ' · liegt auf dem Netzlaufwerk');
      },
      hatDetail: !!d, keinDetail: !d, d: dv
    });
  }
}
