class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = Object.assign(this.basisState(), this.kcState(), { ordner: 'Posteingang', mf: 'Alle', sortierung: 'Neueste zuerst', postfach: 'Mein Postfach', suche: '', aktiv: 't1', gelesen: { t1: true }, zitat: {}, schreiben: null });
  }
  kcCfg() {
    var t = this.daten().filter(function (x) { return x.id === this.state.aktiv; }, this)[0];
    return { name: t ? t.betreff : 'Mail', anzahl: 'Thread, Absender, frühere Mails', platzhalter: 'Frag etwas zu dieser Mail', vorschlaege: ['Fass den Verlauf zusammen', 'Was wird von mir erwartet?', 'Schlag eine Antwort vor'],
      antwort: t && t.id === 't1' ? 'Lisa schickt den Entwurf ohne Finanzteil; erwartet wird nichts Konkretes, aber Toms Finanzplan-Feedback ist heute fällig – das blockiert den Finanzteil.' : 'Kurz: Die Mail bittet um eine Rückmeldung; eine Frist nennt sie nicht.', belege: [{ art: 'belegt', text: 'Finanzteil folgt nach Toms Überarbeitung', quelle: 'diese Mail' }], luecke: 'Dazu steht in diesem Thread nichts.' };
  }
  daten() {
    return [
      { id: 't1', pf: 'mein', von: 'Lisa Meier', betreff: 'Pitchdeck Solaro – Entwurf', zeit: 'gestern 17:40', vorgang: 'Gründungsteams · Solaro', kontakt: 'Lisa Meier', adresse: 'lisa@solaro.de', cc: 'tom@solaro.de',
        nachrichten: [{ von: 'Lisa Meier', an: 'Andreas · CC Tom Kraus', zeit: 'gestern 17:40', text: 'Hallo Andreas,\n\nanbei wie versprochen der Entwurf vom Pitchdeck. Der Finanzteil fehlt noch – den machen wir fertig, sobald Tom den Plan überarbeitet hat.\n\nLiebe Grüße\nLisa', zitat: '> Am 22.09. schrieb Andreas:\n> Schickt mir das Pitchdeck gern bis zum 29.09., dann schaue ich drüber.', anhaenge: [{ name: 'Pitchdeck_Solaro_v1.pdf', groesse: '2,4 MB' }] }],
        wissen: [{ art: 'belegt', text: 'Finanzteil fehlt noch – Tom überarbeitet den Plan', quelle: 'diese Mail' }, { art: 'berechnet', text: 'Deine Zusage „Feedback zum Finanzplan“ ist heute fällig' }] },
      { id: 'e1', pf: 'mein', entwurf: true, von: 'Entwurf an Anna Weber', betreff: 'Vorstellung: Solaro (Solar-Startup, EXIST)', zeit: 'heute 14:33', vorgang: 'Gründungsteams · Solaro', kontakt: 'Anna Weber', adresse: 'anna.weber@schwaben.ihk.de', nachrichten: [{ von: 'Andreas (Entwurf)', an: 'Anna Weber · CC Lisa Meier, Tom Kraus', zeit: 'heute 14:33', text: 'Liebe Frau Weber,\n\ndarf ich Ihnen Lisa Meier und Tom Kraus von Solaro vorstellen? …', herkunft: 'von Kollege vorbereitet – noch nicht gesendet' }], wissen: [] },
      { id: 't2', pf: 'mein', markiert: true, von: 'Tom Kraus', betreff: 'Finanzplan v2 – kurzer Blick?', zeit: '26.09.', vorgang: 'Gründungsteams · Solaro', kontakt: 'Tom Kraus', adresse: 'tom@solaro.de',
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
    var hatAnhang = function (t) { return t.nachrichten.some(function (n) { return n.anhaenge && n.anhaenge.length; }); };
    var istUngelesen = function (t) { return self.wert(t.id, 'ungelesen', !!t.ungelesen && !st.gelesen[t.id]); };
    var istMarkiert = function (t) { return self.wert(t.id, 'markiert', !!t.markiert); };
    var imOrdner = function (t) {
      var weg = self.wert(t.id, 'geloescht', false); if (st.ordner === 'Papierkorb') return weg; if (weg) return false;
      if (t.entwurf && self.wert(t.id, 'versendet', false)) return st.ordner === 'Gesendet';
      var arch = self.wert(t.id, 'archiv', false), ges = self.wert(t.id, 'gesendet', []).length > 0 || /^n/.test(t.id);
      if (st.ordner === 'Archiv') return arch;
      if (arch) return false;
      if (st.ordner === 'Gesendet') return ges;
      if (st.ordner === 'Entwürfe') return !!t.entwurf;
      return !t.entwurf && !/^n/.test(t.id);
    };
    var sicht = alle.filter(function (t) {
      if (!imOrdner(t)) return false;
      if (st.mf === 'Ungelesen' && !istUngelesen(t)) return false;
      if (st.mf === 'Markiert' && !istMarkiert(t)) return false;
      if (st.mf === 'Mit Anhang' && !hatAnhang(t)) return false;
      if (st.mf === 'Ohne Zuordnung' && self.wert(t.id, 'vorgang', t.vorgang).indexOf('–') !== 0) return false;
      if (st.postfach === 'Mein Postfach' && t.pf !== 'mein') return false;
      if (st.postfach === 'StartHub-Postfach' && t.pf !== 'starthub') return false;
      return !q || (t.von + ' ' + t.betreff + ' ' + self.wert(t.id, 'vorgang', t.vorgang)).toLowerCase().indexOf(q) >= 0;
    });
    if (st.sortierung === 'Älteste zuerst') sicht = sicht.slice().reverse();
    if (st.sortierung === 'nach Absender') sicht = sicht.slice().sort(function (a, b) { return a.von < b.von ? -1 : 1; });
    var ungelesen = alle.filter(function (t) { return istUngelesen(t) && !self.wert(t.id, 'archiv', false); }).length;
    var akt = sicht.filter(function (t) { return t.id === st.aktiv; })[0] || (st.aktiv && !st.schreiben ? sicht[0] : null);
    var th = {};
    if (akt) {
      var f = this.feld(akt.id, akt, 'Zuordnung');
      var gesendet = this.wert(akt.id, 'gesendet', []);
      var vg = this.wert(akt.id, 'vorgang', akt.vorgang);
      th = {
        istEntwurf: !!akt.entwurf && !self.wert(akt.id, 'versendet', false), keinEntwurf: !(akt.entwurf && !self.wert(akt.id, 'versendet', false)),
        betreff: akt.betreff, vorgang: vg, kontakt: this.wert(akt.id, 'kontakt', akt.kontakt), feld: f,
        zuordnungUngeprueft: !!akt.ungeprueft && !this.wert(akt.id, 'geprueft', '') && vg === akt.vorgang,
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
      self.setState({ schreiben: { modus: modus, tid: akt.id, an: modus === 'weiter' ? '' : akt.adresse, cc: modus === 'allen' ? (akt.cc || '') : '', betreff: re + akt.betreff, text: modus === 'weiter' ? '\n\n---------- Weitergeleitet ----------\n' + akt.nachrichten[akt.nachrichten.length - 1].text : (akt.anrede || (/^(Prof|Redaktion|Fachschaft|Dr)/.test(akt.von) ? 'Guten Tag' : 'Hallo ' + akt.von.split(' ')[0])) + ',\n\n\n\nViele Grüße\nAndreas', anhaenge: modus === 'weiter' ? (akt.nachrichten[0].anhaenge || []) : [], von: akt.pf === 'starthub' ? 'starthub@uni-augsburg.de' : 'andreas@gruendung.uni-augsburg.de' } });
    };
    var wissen = sw && sw.tid ? (alle.filter(function (t) { return t.id === sw.tid; })[0] || {}).wissen || [] : [];
    var leerText = function (s) { return !s.text.replace(/^(Hallo|Guten Tag)[^\n]*,|Viele Grüße|Andreas/g, '').trim(); };
    var wirklichSenden = function () {
      var s = self.state.schreiben;
      var msg = { von: 'Andreas', an: s.an + (s.cc ? ' · CC ' + s.cc : ''), zeit: 'gerade eben', text: s.text, anhaenge: s.anhaenge, herkunft: 'gesendet über ' + s.von + ' · liegt in „Gesendet“' };
      var ordnerVorher = self.state.ordner, aktivVorher = self.state.aktiv;
      var zurueck = function () { self.setState({ ordner: ordnerVorher, aktiv: aktivVorher, schreiben: Object.assign({}, s, { rueckfrage: false, fehler: false }) }); };
      if (s.tid && s.modus === 'entwurf') {
        self.setState({ schreiben: null, aktiv: s.tid });
        self.aendere([{ id: s.tid, feld: 'versendet', wert: true, basis: false }, { id: s.tid, feld: 'gesendet', wert: [msg], basis: [] }], 'Wird gesendet an ' + s.an + ' – 10 s zurückholbar', false, zurueck);
      } else if (s.tid) {
        var alt = self.wert(s.tid, 'gesendet', []);
        self.setState({ schreiben: null, aktiv: s.tid });
        self.aendere([{ id: s.tid, feld: 'gesendet', wert: alt.concat([msg]), basis: [] }], 'Wird gesendet an ' + s.an + ' – 10 s zurückholbar', false, zurueck);
      } else {
        var neu = { id: 'n' + Date.now(), pf: 'mein', von: 'An ' + s.an, betreff: s.betreff || '(ohne Betreff)', zeit: 'gerade eben', vorgang: '– (ohne Bereich)', kontakt: '–', adresse: s.an, nachrichten: [msg], wissen: [] };
        self.setState({ schreiben: null, aktiv: neu.id, ordner: 'Gesendet' });
        self.aendere([{ id: '_mail', feld: 'neue', wert: [neu].concat(self.wert('_mail', 'neue', [])), basis: [] }], 'Wird gesendet an ' + s.an + ' – 10 s zurückholbar', false, zurueck);
      }
    };
    var alsEntwurfSichern = function () {
      var s = self.state.schreiben; if (!s || (leerText(s) && !s.an.trim())) return;
      var d = { id: 'd' + Date.now(), pf: 'mein', entwurf: true, von: 'Entwurf an ' + (s.an || '…'), betreff: s.betreff || '(ohne Betreff)', zeit: 'gerade eben', vorgang: s.tid ? self.wert(s.tid, 'vorgang', '– (ohne Bereich)') : '– (ohne Bereich)', kontakt: '–', adresse: s.an, cc: s.cc, entwurfText: s.text, nachrichten: [{ von: 'Andreas (Entwurf)', an: s.an, zeit: 'gerade eben', text: s.text, herkunft: 'automatisch gespeichert' }], wissen: [] };
      self.aendere([{ id: '_mail', feld: 'neue', wert: [d].concat(self.wert('_mail', 'neue', [])), basis: [] }], 'Als Entwurf gespeichert – liegt in „Entwürfe“');
    };
    return Object.assign(this.kcVals(), this.toastVals(), this.detailVals(), {
      sidebarChats: this.kgChats(),
      ungelesenZeile: ungelesen + ' ungelesen',
      postfaecher: ['Mein Postfach', 'StartHub-Postfach', 'Alle'], postfach: st.postfach,
      setPostfach: function (w) { self.setState({ postfach: w }); },
      suche: st.suche, sucheTippen: function (e) { self.setState({ suche: e.target.value }); },
      threads: sicht.map(function (t) {
        var fett = istUngelesen(t);
        return { von: t.von, zeit: t.zeit, betreff: t.betreff, vorschau: t.nachrichten[t.nachrichten.length - 1].text.replace(/\n+/g, ' ').slice(0, 90),
          meta: (istMarkiert(t) ? 'markiert · ' : '') + (t.entwurf ? 'Entwurf · ' : '') + (t.pf === 'starthub' ? 'StartHub · ' : '') + self.wert(t.id, 'vorgang', t.vorgang).replace(' · ', ': ') + (t.nachrichten.some(function (n) { return n.anhaenge && n.anhaenge.length; }) ? ' · Anhang' : ''),
          stil: fett ? 'font-weight: 600' : '', betreffStil: fett ? 'font-weight: 600; color: var(--ink)' : 'color: var(--ink)',
          aktiv: t.id === st.aktiv ? 'true' : 'false',
          los: function () { alsEntwurfSichern(); var g = Object.assign({}, self.state.gelesen); g[t.id] = true; if (self.wert(t.id, 'ungelesen', null)) { var ed = Object.assign({}, self.state.edits); ed[t.id] = Object.assign({}, ed[t.id], { ungelesen: false }); self.state.edits = ed; } self.setState({ zu: false, aktiv: t.id, gelesen: g, schreiben: null }); } };
      }),
      keineThreads: sicht.length === 0,
      zeigeThread: !!akt,
      th: th,
      vorgangOptionen: this.zuordnungen(),
      kontaktOptionen: ['Lisa Meier', 'Tom Kraus', 'Max Brandt', 'Prof. Dr. Martin Hartmann', 'Sara Yilmaz', 'Karin Vogt', '–'],
      antworten: function () { starten('antwort'); },
      allenAntworten: function () { starten('allen'); },
      weiterleiten: function () { starten('weiter'); },
      ordnerListe: ['Posteingang', 'Entwürfe', 'Gesendet', 'Archiv', 'Papierkorb'], ordnerWahl: st.ordner, setOrdner: function (e) { self.setState({ ordner: e.target.value }); },
      mailFilter: ['Alle', 'Ungelesen', 'Markiert', 'Mit Anhang', 'Ohne Zuordnung'].map(function (f) { return { label: f, an: st.mf === f ? 'true' : 'false', los: function () { self.setState({ mf: f }); } }; }),
      sortierungen: ['Neueste zuerst', 'Älteste zuerst', 'nach Absender'], sortierung: st.sortierung, setSortierung: function (e) { self.setState({ sortierung: e.target.value }); },
      markiertLabel: akt && istMarkiert(akt) ? 'Markierung entfernen' : 'Markieren',
      markieren: function () { if (!akt) return; var m = istMarkiert(akt); self.aendere([{ id: akt.id, feld: 'markiert', wert: !m, basis: !!akt.markiert }], m ? 'Markierung entfernt' : 'Markiert'); },
      alsUngelesen: function () { if (!akt) return; self.aendere([{ id: akt.id, feld: 'ungelesen', wert: true, basis: false }], 'Als ungelesen markiert'); },
      archivLabel: st.ordner === 'Archiv' ? 'In Posteingang' : 'Archivieren',
      archivieren: function () { if (!akt) return; var a = self.wert(akt.id, 'archiv', false); self.aendere([{ id: akt.id, feld: 'archiv', wert: !a, basis: false }], a ? 'Zurück im Posteingang: ' + akt.betreff : 'Archiviert: ' + akt.betreff); },
      loeschenLabel: st.ordner === 'Papierkorb' ? 'Wiederherstellen' : 'Löschen',
      loeschen: function () { if (!akt) return; var w = self.wert(akt.id, 'geloescht', false); self.aendere([{ id: akt.id, feld: 'geloescht', wert: !w, basis: false }], w ? 'Wiederhergestellt: ' + akt.betreff : 'In den Papierkorb: ' + akt.betreff); },
      entwurfOeffnen: function () { if (!akt) return; self.setState({ zu: false, schreiben: { modus: 'entwurf', tid: akt.id, an: akt.adresse || '', cc: akt.cc || '', betreff: akt.betreff, text: akt.entwurfText || akt.nachrichten[0].text, anhaenge: [], von: 'andreas@gruendung.uni-augsburg.de' } }); },
      keinEnter: function (e) { if (e.key === 'Enter') e.preventDefault(); },
      mitKollege: function () { self.setState({ kcOffen: true }); },
      neueMail: function () { alsEntwurfSichern(); self.setState({ zu: false, schreiben: { modus: 'neu', tid: null, an: '', cc: '', betreff: '', text: '', anhaenge: [], von: 'andreas@gruendung.uni-augsburg.de' }, aktiv: null }); },
      zeigeSchreiben: !!sw,
      schreibTitel: sw ? ({ neu: 'Neue Mail', antwort: 'Antworten', allen: 'Allen antworten', weiter: 'Weiterleiten', entwurf: 'Entwurf bearbeiten' })[sw.modus] : '',
      zeigeAnFehler: !!(sw && sw.fehler), sAnFehlt: sw && sw.fehler ? 'true' : 'false',
      zeigeRueckfrage: !!(sw && sw.rueckfrage), rueckfrageText: sw && sw.rueckfrage ? (sw.betreff.trim() ? 'Die Mail hat keinen Text.' : 'Die Mail hat keinen Betreff.') + ' Trotzdem senden?' : '',
      trotzdemSenden: function () { wirklichSenden(); }, rueckfrageZu: function () { self.setState({ schreiben: Object.assign({}, self.state.schreiben, { rueckfrage: false }) }); },
      sAn: sw ? sw.an : '', sCc: sw ? sw.cc : '', sBetreff: sw ? sw.betreff : '', sText: sw ? sw.text : '', sVon: sw ? sw.von : '',
      sTippen: function (e) { var s = Object.assign({}, self.state.schreiben); s[e.target.getAttribute('data-feld')] = e.target.value; s.fehler = false; s.rueckfrage = false; self.setState({ schreiben: s }); },
      sAnhaenge: sw ? sw.anhaenge.map(function (a, i) { return Object.assign({}, a, { weg: function () { var s = Object.assign({}, self.state.schreiben); s.anhaenge = s.anhaenge.filter(function (x, j) { return j !== i; }); self.setState({ schreiben: s }); } }); }) : [],
      anhangDazu: function () { var s = Object.assign({}, self.state.schreiben); s.anhaenge = s.anhaenge.concat([{ name: 'Merkblatt_EXIST.pdf', groesse: '310 KB · Netzlaufwerk' }]); self.setState({ schreiben: s }); },
      hatWissen: !!sw && wissen.length > 0, wissen: wissen,
      verwerfenLabel: sw && sw.modus === 'entwurf' ? 'Entwurf löschen' : 'Verwerfen',
      schreibenZu: function () { var s = self.state.schreiben; self.setState({ schreiben: null }); if (s.modus === 'entwurf' && s.tid) self.aendere([{ id: s.tid, feld: 'geloescht', wert: true, basis: false }], 'Entwurf in den Papierkorb', false, function () { self.setState({ schreiben: s }); }); else self.aendere([], 'Mail verworfen', false, function () { self.setState({ schreiben: s }); }); },
      senden: function () {
        var s = self.state.schreiben; if (!s) return;
        if (!s.an.trim()) { self.setState({ schreiben: Object.assign({}, s, { fehler: true }) }); return; }
        if (!s.betreff.trim() || leerText(s)) { self.setState({ schreiben: Object.assign({}, s, { rueckfrage: true, fehler: false }) }); return; }
        wirklichSenden();
      },
      nichtsOffen: !akt && !sw
    });
  }
}
