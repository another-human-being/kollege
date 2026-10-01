class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = Object.assign(this.basisState(), { postfach: 'Mein Postfach', suche: '', aktiv: 't1', gelesen: { t1: true }, zitat: {}, schreiben: null });
  }
  daten() {
    return [
      { id: 't1', pf: 'mein', von: 'Lisa Meier', betreff: 'Pitchdeck Solaro – Entwurf', zeit: 'gestern 17:40', vorgang: 'Gründungsteams · Solaro', kontakt: 'Lisa Meier', adresse: 'lisa@solaro.de', cc: 'tom@solaro.de',
        nachrichten: [{ von: 'Lisa Meier', an: 'Andreas · CC Tom Kraus', zeit: 'gestern 17:40', text: 'Hallo Andreas,\n\nanbei wie versprochen der Entwurf vom Pitchdeck. Der Finanzteil fehlt noch – den machen wir fertig, sobald Tom den Plan überarbeitet hat.\n\nLiebe Grüße\nLisa', zitat: '> Am 22.09. schrieb Andreas:\n> Schickt mir das Pitchdeck gern bis zum 29.09., dann schaue ich drüber.', anhaenge: [{ name: 'Pitchdeck_Solaro_v1.pdf', groesse: '2,4 MB' }] }],
        wissen: [{ art: 'belegt', text: 'Finanzteil fehlt noch – Tom überarbeitet den Plan', quelle: 'diese Mail' }, { art: 'berechnet', text: 'Deine Zusage „Feedback zum Finanzplan“ ist heute fällig' }] },
      { id: 't2', pf: 'mein', von: 'Tom Kraus', betreff: 'Finanzplan v2 – kurzer Blick?', zeit: '26.09.', vorgang: 'Gründungsteams · Solaro', kontakt: 'Tom Kraus', adresse: 'tom@solaro.de',
        nachrichten: [{ von: 'Tom Kraus', an: 'Andreas', zeit: '26.09. 10:02', text: 'Hi Andreas,\n\nhier die zweite Version vom Finanzplan. Könnt ihr bis Mitte der Woche drüberschauen? Vor allem die Personalkosten sind noch wackelig.\n\nDanke dir!\nTom', anhaenge: [{ name: 'Finanzplan_Solaro_v2.xlsx', groesse: '180 KB' }] }],
        wissen: [{ art: 'belegt', text: 'Solaro hat gestern das Pitchdeck geschickt (ohne Finanzteil)', quelle: 'Mail 29.09.' }, { art: 'berechnet', text: '„bis Mitte der Woche“ = heute' }, { art: 'einschaetzung', text: 'Tom braucht vor allem Rückmeldung zu den Personalkosten' }] },
      { id: 't3', pf: 'starthub', ungelesen: true, von: 'Max Brandt', betreff: 'Beratung Gründungsstipendium?', zeit: 'gestern', vorgang: 'Gründungsteams · Lern-App (Max Brandt)', kontakt: 'Max Brandt', adresse: 'max.brandt@student.uni-augsburg.de', ungeprueft: true,
        nachrichten: [{ von: 'Max Brandt', an: 'starthub@uni-augsburg.de', zeit: 'gestern 16:12', text: 'Hallo StartHub-Team,\n\nwir sind zu dritt und wollen mit einer Lern-App gründen. Wann gibt es Sprechstunden zum EXIST-Gründungsstipendium?\n\nViele Grüße\nMax Brandt' }],
        wissen: [{ art: 'belegt', text: 'Sprechstunde dienstags 14–16 Uhr, Raum 2.14', quelle: 'Anweisung Team' }] },
      { id: 't4', pf: 'starthub', ungelesen: true, von: 'Redaktion Augsburger Allgemeine', betreff: 'Porträt Gründerinnen', zeit: 'heute 08:05', vorgang: '– (ohne Bereich)', kontakt: '–', adresse: 'redaktion@augsburger-allgemeine.de',
        nachrichten: [{ von: 'Redaktion Augsburger Allgemeine', an: 'starthub@uni-augsburg.de', zeit: 'heute 08:05', text: 'Guten Tag,\n\nkönnten Sie uns zwei Gründerinnen für ein Porträt im November vermitteln?\n\nMit freundlichen Grüßen\nRedaktion' }], wissen: [{ art: 'belegt', text: 'Mehmet plant bereits ein Porträt über Lisa Meier', quelle: 'Notiz Mehmet 15.09.' }] },
      { id: 't5', pf: 'mein', ungelesen: true, von: 'Prof. Hartmann', betreff: 'Raum für Sitzung 3', zeit: '28.09.', vorgang: 'Lehre · Entrepreneurship Basics', kontakt: 'Prof. Dr. Martin Hartmann', adresse: 'hartmann@uni-augsburg.de',
        nachrichten: [{ von: 'Prof. Hartmann', an: 'Andreas', zeit: '28.09. 11:30', text: 'Lieber Herr Rawein,\n\nfür Sitzung 3 bräuchten wir einen Raum mit Beamer für etwa 40 Personen. Die Folien schicke ich bis 06.10.\n\nBeste Grüße\nMartin Hartmann' }], wissen: [{ art: 'berechnet', text: 'Raumbuchung ist seit gestern überfällig' }] },
      { id: 't6', pf: 'starthub', von: 'Fachschaft Informatik', betreff: 'Hackathon im Januar', zeit: '28.09.', vorgang: '– (ohne Bereich)', kontakt: '–', adresse: 'fs-info@uni-augsburg.de',
        nachrichten: [{ von: 'Fachschaft Informatik', an: 'starthub@uni-augsburg.de', zeit: '28.09. 09:14', text: 'Hallo zusammen,\n\nhättet ihr Lust, beim Hackathon im Januar eine Challenge zu stellen und Mentoring anzubieten?\n\nViele Grüße\nFachschaft Informatik' }], wissen: [] },
      { id: 't7', pf: 'mein', von: 'Sara Yilmaz', betreff: 'Hygieneschulung – Termin?', zeit: '28.09.', vorgang: 'Gründungsteams · Kitchen Loop', kontakt: 'Sara Yilmaz', adresse: 'sara@kitchenloop.de',
        nachrichten: [{ von: 'Sara Yilmaz', an: 'Andreas, Julia', zeit: '28.09. 15:20', text: 'Hallo ihr beiden,\n\nwisst ihr, wo wir die Hygieneschulung machen können? Das Studierendenwerk verlangt sie vor dem Pilot.\n\nSara', zitat: '> Am 24.09. schrieb Julia:\n> Ich kläre das mit dem Studierendenwerk.' }], wissen: [{ art: 'belegt', text: 'Julia klärt das mit dem Studierendenwerk', quelle: 'Mail 24.09.' }] },
      { id: 't8', pf: 'mein', von: 'Karin Vogt', betreff: 'Kooperation – Unterlagen', zeit: '29.09.', vorgang: '– (ohne Bereich)', kontakt: 'Karin Vogt', adresse: 'k.vogt@stadtwerke-augsburg.de',
        nachrichten: [{ von: 'Karin Vogt', an: 'Andreas', zeit: '29.09. 13:05', text: 'Hallo Herr Rawein,\n\ndanke für das Gespräch gestern. Anbei unsere Rahmenvereinbarung als Vorschlag.\n\nFreundliche Grüße\nKarin Vogt', anhaenge: [{ name: 'Rahmenvereinbarung_Entwurf.docx', groesse: '64 KB' }] }], wissen: [] }
    ];
  }
  renderVals() {
    var self = this, st = this.state;
    var neueThreads = this.wert('_mail', 'neue', []);
    var alle = neueThreads.concat(this.daten());
    var q = st.suche.trim().toLowerCase();
    var sicht = alle.filter(function (t) {
      if (self.wert(t.id, 'archiv', false)) return false;
      if (st.postfach === 'Mein Postfach' && t.pf !== 'mein') return false;
      if (st.postfach === 'StartHub-Postfach' && t.pf !== 'starthub') return false;
      return !q || (t.von + ' ' + t.betreff + ' ' + self.wert(t.id, 'vorgang', t.vorgang)).toLowerCase().indexOf(q) >= 0;
    });
    var ungelesen = alle.filter(function (t) { return t.ungelesen && !st.gelesen[t.id] && !self.wert(t.id, 'archiv', false); }).length;
    var akt = alle.filter(function (t) { return t.id === st.aktiv && !self.wert(t.id, 'archiv', false); })[0];
    var th = {};
    if (akt) {
      var f = this.feld(akt.id, akt, 'Zuordnung');
      var gesendet = this.wert(akt.id, 'gesendet', []);
      var vg = this.wert(akt.id, 'vorgang', akt.vorgang);
      th = {
        betreff: akt.betreff, vorgang: vg, kontakt: this.wert(akt.id, 'kontakt', akt.kontakt), feld: f,
        zuordnungUngeprueft: !!akt.ungeprueft && !this.wert(akt.id, 'geprueft', ''),
        zuordnungOk: function () { self.aendere([{ id: akt.id, feld: 'geprueft', wert: 'ok', basis: '' }], 'Zuordnung bestätigt: ' + vg); },
        postfachText: akt.pf === 'starthub' ? 'StartHub-Postfach · für alle sichtbar' : 'dein Postfach',
        vorgangHref: this.bereichHref(vg), hatVorgangLink: vg.indexOf('–') !== 0,
        nachrichten: akt.nachrichten.concat(gesendet).map(function (n, i) {
          var k = akt.id + i, offen = !!st.zitat[k];
          return Object.assign({ anhaenge: [], zitat: '', herkunft: '' }, n, {
            hatZitat: !!n.zitat, zitatOffen: offen, zitatLabel: offen ? 'Zitat ausblenden' : '… Zitat anzeigen',
            zitatToggle: function () { var z = Object.assign({}, self.state.zitat); z[k] = !z[k]; self.setState({ zitat: z }); },
            hatHerkunft: !!n.herkunft,
            anhaenge: (n.anhaenge || []).map(function (a) { return Object.assign({}, a, { oeffnen: function () { self.aendere([], a.name + ' wird in ' + (/\.xlsx$/.test(a.name) ? 'Excel' : /\.docx$/.test(a.name) ? 'Word' : 'der Vorschau') + ' geöffnet', true); } }); })
          });
        })
      };
    }
    var sw = st.schreiben;
    var starten = function (modus) {
      if (!akt) return;
      var re = modus === 'weiter' ? 'WG: ' : 'AW: ';
      self.setState({ schreiben: { modus: modus, tid: akt.id, an: modus === 'weiter' ? '' : akt.adresse, cc: modus === 'allen' ? (akt.cc || 'julia@gruendung.uni-augsburg.de') : '', betreff: re + akt.betreff, text: modus === 'weiter' ? '\n\n---------- Weitergeleitet ----------\n' + akt.nachrichten[0].text : 'Hallo ' + akt.von.split(' ')[0] + ',\n\n\n\nViele Grüße\nAndreas', anhaenge: modus === 'weiter' ? (akt.nachrichten[0].anhaenge || []) : [], von: akt.pf === 'starthub' ? 'starthub@uni-augsburg.de' : 'andreas@gruendung.uni-augsburg.de' } });
    };
    var wissen = sw && sw.tid ? (alle.filter(function (t) { return t.id === sw.tid; })[0] || {}).wissen || [] : [{ art: 'belegt', text: 'Solaro hat gestern das Pitchdeck geschickt (ohne Finanzteil)', quelle: 'Mail 29.09.' }];
    return Object.assign(this.toastVals(), {
      sidebarChats: this.kgChats(),
      ungelesenZeile: ungelesen + ' ungelesen',
      postfaecher: ['Mein Postfach', 'StartHub-Postfach', 'Alle'], postfach: st.postfach,
      setPostfach: function (w) { self.setState({ postfach: w }); },
      suche: st.suche, sucheTippen: function (e) { self.setState({ suche: e.target.value }); },
      threads: sicht.map(function (t) {
        var fett = t.ungelesen && !st.gelesen[t.id];
        return { von: t.von, zeit: t.zeit, betreff: t.betreff, vorschau: t.nachrichten[t.nachrichten.length - 1].text.replace(/\n+/g, ' ').slice(0, 90),
          meta: (t.pf === 'starthub' ? 'StartHub · ' : '') + self.wert(t.id, 'vorgang', t.vorgang).replace(' · ', ': ') + (t.nachrichten.some(function (n) { return n.anhaenge && n.anhaenge.length; }) ? ' · Anhang' : ''),
          stil: fett ? 'font-weight: 600' : '', betreffStil: fett ? 'font-weight: 600; color: var(--ink)' : 'color: var(--ink)',
          aktiv: t.id === st.aktiv ? 'true' : 'false',
          los: function () { var g = Object.assign({}, self.state.gelesen); g[t.id] = true; self.setState({ aktiv: t.id, gelesen: g, schreiben: null }); } };
      }),
      keineThreads: sicht.length === 0,
      zeigeThread: !!akt,
      th: th,
      vorgangOptionen: this.zuordnungen(),
      kontaktOptionen: ['Lisa Meier', 'Tom Kraus', 'Max Brandt', 'Prof. Dr. Martin Hartmann', 'Sara Yilmaz', 'Karin Vogt', '–'],
      antworten: function () { starten('antwort'); },
      allenAntworten: function () { starten('allen'); },
      weiterleiten: function () { starten('weiter'); },
      archivieren: function () { if (!akt) return; self.aendere([{ id: akt.id, feld: 'archiv', wert: true, basis: false }], 'Archiviert: ' + akt.betreff); },
      neueMail: function () { self.setState({ schreiben: { modus: 'neu', tid: null, an: '', cc: '', betreff: '', text: '', anhaenge: [], von: 'andreas@gruendung.uni-augsburg.de' }, aktiv: null }); },
      zeigeSchreiben: !!sw,
      schreibTitel: sw ? ({ neu: 'Neue Mail', antwort: 'Antworten', allen: 'Allen antworten', weiter: 'Weiterleiten' })[sw.modus] : '',
      sAn: sw ? sw.an : '', sCc: sw ? sw.cc : '', sBetreff: sw ? sw.betreff : '', sText: sw ? sw.text : '', sVon: sw ? sw.von : '',
      sTippen: function (e) { var s = Object.assign({}, self.state.schreiben); s[e.target.getAttribute('data-feld')] = e.target.value; self.setState({ schreiben: s }); },
      sAnhaenge: sw ? sw.anhaenge.map(function (a, i) { return Object.assign({}, a, { weg: function () { var s = Object.assign({}, self.state.schreiben); s.anhaenge = s.anhaenge.filter(function (x, j) { return j !== i; }); self.setState({ schreiben: s }); } }); }) : [],
      anhangDazu: function () { var s = Object.assign({}, self.state.schreiben); s.anhaenge = s.anhaenge.concat([{ name: 'Merkblatt_EXIST.pdf', groesse: '310 KB · Netzlaufwerk' }]); self.setState({ schreiben: s }); },
      hatWissen: !!sw && wissen.length > 0, wissen: wissen,
      schreibenZu: function () { self.setState({ schreiben: null }); },
      senden: function (e) {
        if (e && e.preventDefault) e.preventDefault();
        var s = self.state.schreiben; if (!s || !s.an.trim()) return;
        var msg = { von: 'Andreas', an: s.an + (s.cc ? ' · CC ' + s.cc : ''), zeit: 'gerade eben', text: s.text, anhaenge: s.anhaenge, herkunft: 'über Kollege gesendet · liegt in „Gesendet“ von ' + s.von };
        if (s.tid) {
          var alt = self.wert(s.tid, 'gesendet', []);
          self.setState({ schreiben: null, aktiv: s.tid });
          self.aendere([{ id: s.tid, feld: 'gesendet', wert: alt.concat([msg]), basis: [] }], 'Gesendet an ' + s.an);
        } else {
          var neu = { id: 'n' + Date.now(), pf: 'mein', von: 'An ' + s.an, betreff: s.betreff || '(ohne Betreff)', zeit: 'gerade eben', vorgang: '– (ohne Bereich)', kontakt: '–', adresse: s.an, nachrichten: [msg], wissen: [] };
          self.setState({ schreiben: null, aktiv: neu.id });
          self.aendere([{ id: '_mail', feld: 'neue', wert: [neu].concat(self.wert('_mail', 'neue', [])), basis: [] }], 'Gesendet an ' + s.an);
        }
      },
      nichtsOffen: !akt && !sw
    });
  }
}
