  kgChats() {
    return [
      { id: 'c1', titel: 'Beratung Solaro, Pitchdeck', datum: 'heute', etikett: 'Solaro', angepinnt: true, href: 'Chat.dc.html' },
      { id: 'c2', titel: 'Social Media nur montags', datum: 'heute', href: 'Chat.dc.html' },
      { id: 'c3', titel: 'Was haben wir Solaro versprochen?', datum: 'gestern', etikett: 'Solaro', href: 'Chat.dc.html' },
      { id: 'c4', titel: 'Einladung Gründungsnacht', datum: '28.09.', etikett: 'Gründungsnacht 2026', href: 'Chat.dc.html' },
      { id: 'c5', titel: 'Wie lange dauert EXIST?', datum: '25.09.', href: 'Chat.dc.html' },
      { id: 'c6', titel: 'Notiz zu Tom', datum: '24.09.', etikett: 'Tom Kraus', href: 'Chat.dc.html' }
    ];
  }
  kcState() { return { kcOffen: false, kcMsgs: [], kcStream: null, kcLaden: false, kcPrivat: false, kcNotizen: [] }; }
  kcCfg() { return { name: 'Eintrag', anzahl: '0 Einträge', platzhalter: 'Frag oder notiere etwas', antwort: '', belege: [], luecke: '' }; }
  kcSenden(text) {
    var self = this, cfg = this.kcCfg(), frage = text.indexOf('?') >= 0, privat = this.state.kcPrivat;
    this.setState({ kcOffen: true, kcLaden: true, kcMsgs: this.state.kcMsgs.concat([{ typ: 'du', text: text }]) });
    setTimeout(function () {
      var antwort = '', rest = [];
      if (frage && cfg.antwort && !/wie lange|dauer|chance/i.test(text)) {
        antwort = cfg.antwort;
        rest = cfg.belege.map(function (b) { return { typ: 'aussage', art: b.art, text: b.text, quelle: b.quelle }; });
      } else if (frage) {
        rest = [{ typ: 'luecke', bekannt: cfg.luecke }];
      } else {
        antwort = 'Notiert bei ' + cfg.name + (privat ? ' – privat, nur für dich sichtbar.' : '.');
        var punkte = ['Notiz im Verlauf von „' + cfg.name + '“ abgelegt' + (privat ? ' (privat)' : '')];
        var folgen = '';
        if (/ bis |frist|morgen|freitag|montag|nächste woche/i.test(text)) { punkte.push('Aufgabe für dich angelegt: ' + (text.length > 52 ? text.slice(0, 52) + '…' : text)); folgen = 'entfernt auch 1 Aufgabe'; }
        rest = [{ typ: 'karte', punkte: punkte, privat: privat, folgen: folgen, linkText: 'Im Verlauf ansehen', linkHref: '#verlauf' }];
        self.setState({ kcNotizen: [{ text: text, privat: privat }].concat(self.state.kcNotizen) });
      }
      self.kcStreamen(antwort, rest);
    }, 800);
  }
  kcStreamen(voll, rest) {
    var self = this;
    if (!voll) { this.setState({ kcLaden: false, kcMsgs: this.state.kcMsgs.concat(rest) }); return; }
    this.setState({ kcLaden: false, kcStream: { voll: voll, n: 0, rest: rest } });
    var t = setInterval(function () {
      var s = self.state.kcStream;
      if (!s) { clearInterval(t); return; }
      var n = Math.min(s.voll.length, s.n + 4);
      if (n >= s.voll.length) { clearInterval(t); self.setState({ kcStream: null, kcMsgs: self.state.kcMsgs.concat([{ typ: 'kollege', text: s.voll }], s.rest) }); }
      else self.setState({ kcStream: { voll: s.voll, n: n, rest: s.rest } });
    }, 30);
  }
  kcVals() {
    var self = this, st = this.state, cfg = this.kcCfg();
    var msgs = (st.kcMsgs || []).slice();
    if (st.kcStream) msgs.push({ typ: 'kollege', text: st.kcStream.voll.slice(0, st.kcStream.n), streamt: true });
    return {
      sidebarChats: this.kgChats(),
      kcName: cfg.name, kcKontext: cfg.name + ' · ' + cfg.anzahl, kcPlatzhalter: cfg.platzhalter,
      kcOffen: !!st.kcOffen, kcLaden: !!st.kcLaden,
      kcMsgs: msgs.map(function (m) { return Object.assign({ istDu: m.typ === 'du', istKollege: m.typ === 'kollege', istAussage: m.typ === 'aussage', istKarte: m.typ === 'karte', istLuecke: m.typ === 'luecke', streamt: false }, m); }),
      kcSenden: function (t) { self.kcSenden(t); },
      kcZu: function () { self.setState({ kcOffen: false }); },
      kcAuf: function () { self.setState({ kcOffen: true }); },
      kcHatMsgs: (st.kcMsgs || []).length > 0,
      kcPrivat: !!st.kcPrivat,
      kcPrivatToggle: function () { self.setState({ kcPrivat: !self.state.kcPrivat }); },
      kcNotizen: st.kcNotizen || [],
      kcLeer: !(st.kcMsgs || []).length && !st.kcStream && !st.kcLaden,
      kcVorschlaege: (cfg.vorschlaege || ['Was ist der Stand?', 'Was haben wir zugesagt?', 'Was ist offen?']).map(function (t) { return { text: t, los: function () { self.kcSenden(t); } }; })
    };
  }
  // „Gründungsteams · Solaro“ → Seite des Bereichs
  bereichHref(v) { var b = String(v || '').split(' · ')[0]; return ({ 'Gründungsteams': 'Gruendungsteams.dc.html', 'Events': 'Events.dc.html', 'Lehre': 'Lehre.dc.html', 'Social Media': 'SocialMedia.dc.html' })[b] || 'Main.dc.html'; }
  zuordnungen() { return ['Gründungsteams · Solaro', 'Gründungsteams · Kitchen Loop', 'Gründungsteams · Nordlicht Analytics', 'Gründungsteams · Greenbyte', 'Gründungsteams · Lern-App (Max Brandt)', 'Events · Gründungsnacht 2026', 'Events · Pitch-Abend', 'Lehre · Entrepreneurship Basics', 'Lehre · Design Thinking Workshop', 'Social Media · Pitch-Abend ankündigen', 'Social Media · Rückblick Sommerfest', 'Social Media · Porträt: Lisa Meier (Solaro)', '– (ohne Bereich)']; }
  // ——— Aufgaben = Zusagen: ein Datenbestand für Aufgaben und Beratungsakten (E46) ———
  heuteIso() { return '2026-09-30'; }
  datumText(iso, zeit) {
    if (!iso) return 'ohne Datum';
    var h = this.heuteIso(); if (iso === h) return 'heute' + (zeit ? ' ' + zeit : '');
    var p = iso.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]), W = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    return W[d.getDay()] + ' ' + p[2] + '.' + p[1] + '.' + (p[0] !== '2026' ? p[0] : '') + (zeit ? ' ' + zeit : '');
  }
  faelligGruppe(iso) { if (!iso) return 'ohne'; var h = this.heuteIso(); return iso < h ? 'ueber' : iso === h ? 'heute' : iso <= '2026-10-04' ? 'woche' : 'spaeter'; }
  tageSeit(iso) { var a = iso.split('-'), b = this.heuteIso().split('-'); return Math.round((new Date(+b[0], +b[1] - 1, +b[2]) - new Date(+a[0], +a[1] - 1, +a[2])) / 864e5); }
  aufgabenDaten() {
    return [
      { id: 'raum', richtung: 'von uns', titel: 'Raum für Sitzung 3 buchen', vorgang: 'Lehre · Entrepreneurship Basics', wer: 'Andreas', faellig: '2026-09-29', herkunft: 'Bitte von Prof. Hartmann', quelle: 'Mail 28.09.' },
      { id: 'fin', richtung: 'von uns', titel: 'Feedback zum Finanzplan an Tom Kraus', vorgang: 'Gründungsteams · Solaro', wer: 'Andreas', faellig: '2026-09-30', status: 'in Arbeit', herkunft: 'Tom bittet um Feedback „bis Mitte der Woche“', quelle: 'Mail 26.09.', notiz: 'Vor allem Personalkosten ansehen – Tom sagt selbst, die sind noch wackelig.' },
      { id: 'std', richtung: 'von uns', titel: 'Save-the-Date Gründungsnacht verschicken', vorgang: 'Events · Gründungsnacht 2026', wer: 'Andreas', faellig: '2026-09-30', herkunft: 'nach Anweisung von Julia', quelle: 'Anweisung 24.09.' },
      { id: 'weber', richtung: 'von uns', titel: 'Kontakt zu Frau Weber (IHK) vermitteln', vorgang: 'Gründungsteams · Solaro', wer: 'Andreas', faellig: '2026-10-02', herkunft: 'in der Beratung zugesagt', quelle: 'Chat 30.09.' },
      { id: 'nord', richtung: 'von uns', titel: 'Bei Nordlicht nachfassen: Folgetermin anbieten', vorgang: 'Gründungsteams · Nordlicht Analytics', wer: 'Andreas', faellig: '2026-10-01', herkunft: 'nach Anweisung von Mehmet', quelle: 'Anweisung 15.09.' },
      { id: 'tom', richtung: 'von uns', titel: 'Bei Tom wegen Finanzierung nachfragen', vorgang: 'Gründungsteams · Solaro', wer: 'Andreas', faellig: '2026-10-05', herkunft: 'eigene Notiz', quelle: 'Chat 24.09.', privat: true },
      { id: 'merk', richtung: 'von uns', titel: 'EXIST-Merkblatt an Lisa schicken', vorgang: 'Gründungsteams · Solaro', wer: 'Andreas', faellig: '2026-09-24', erledigt: true, erledigtAm: '2026-09-24', herkunft: 'in der Beratung zugesagt', quelle: 'Mail 24.09.' },
      { id: 'slot', richtung: 'von uns', titel: 'Pitch-Slot für Solaro bestätigen', vorgang: 'Gründungsteams · Solaro', wer: 'Julia', faellig: '2026-11-13', herkunft: 'Julias Mail an Tom', quelle: 'Mail 23.09.' },
      { id: 'jb', richtung: 'von uns', titel: 'Jury-Briefing vorbereiten', vorgang: 'Events · Pitch-Abend', wer: 'Andreas', faellig: '2026-11-04', herkunft: 'aus dem Termin abgeleitet', quelle: 'Kalender 04.11.' },
      { id: 'cat', richtung: 'von uns', titel: 'Catering anfragen', vorgang: 'Events · Gründungsnacht 2026', wer: 'Julia', faellig: '2026-10-16', herkunft: 'Ablaufplan', quelle: 'Datei 29.09.' },
      { id: 'sommer', richtung: 'von uns', titel: 'Rückblick Sommerfest fertigstellen', vorgang: 'Social Media · Rückblick Sommerfest', wer: 'Mehmet', faellig: '2026-09-25', herkunft: 'eigene Notiz', quelle: 'Notiz 12.09.' },
      { id: 'insta', richtung: 'von uns', titel: 'Instagram-Beitrag Pitch-Abend freigeben', vorgang: 'Social Media · Pitch-Abend ankündigen', wer: 'Mehmet', faellig: '2026-09-30', zeit: '17:00', herkunft: 'eigene Notiz', quelle: 'Notiz 29.09.' },
      { id: 'jury', richtung: 'von uns', titel: 'Jury vollständig machen', vorgang: 'Events · Pitch-Abend', wer: 'Julia', faellig: '2026-10-02', status: 'in Arbeit', herkunft: 'Teamrunde', quelle: 'Mail 21.09.' },
      { id: 'hyg', richtung: 'von uns', titel: 'Hygieneschulung für Kitchen Loop klären', vorgang: 'Gründungsteams · Kitchen Loop', wer: 'Julia', faellig: '2026-10-01', herkunft: 'Julia: „Ich kläre das mit dem Studierendenwerk.“', quelle: 'Mail 24.09.' },
      // an uns: Zusagen anderer – „wartet“ ergibt sich aus der Richtung (E27)
      { id: 'pd', richtung: 'an uns', von: 'Lisa Meier (Solaro)', titel: 'Pitchdeck final inkl. Finanzteil', vorgang: 'Gründungsteams · Solaro', wer: 'Andreas', faellig: '2026-10-02', herkunft: 'Entwurf kam gestern, Finanzteil fehlt noch', quelle: 'Mail 29.09.' },
      { id: 'fp', richtung: 'an uns', von: 'Tom Kraus (Solaro)', titel: 'Finanzplan überarbeiten (Personalkosten)', vorgang: 'Gründungsteams · Solaro', wer: 'Andreas', faellig: '2026-10-15', herkunft: 'in der Beratung vereinbart', quelle: 'Notiz 22.09.' },
      { id: 'folien', richtung: 'an uns', von: 'Prof. Dr. Martin Hartmann', titel: 'Folien für Sitzung 3 schicken', vorgang: 'Lehre · Entrepreneurship Basics', wer: 'Andreas', faellig: '2026-10-06', herkunft: '„Die Folien schicke ich bis 06.10.“', quelle: 'Mail 28.09.' },
      { id: 'aw', richtung: 'an uns', von: 'Anna Weber (IHK Schwaben)', titel: 'Rückmeldung: Jurorin beim Pitch-Abend?', vorgang: 'Events · Pitch-Abend', wer: 'Julia', faellig: '2026-09-25', herkunft: 'Anfrage von Julia; Antwort zugesagt „bis Ende der Woche“', quelle: 'Mail 21.09.' },
      { id: 'sw', richtung: 'an uns', von: 'Studierendenwerk', titel: 'Termin für Pilotstart Mensa nennen', vorgang: 'Gründungsteams · Kitchen Loop', wer: 'Julia', faellig: '2026-10-02', herkunft: 'Telefonnotiz Julia', quelle: 'Notiz 23.09.' },
      { id: 'por', richtung: 'an uns', von: 'Lisa Meier (Solaro)', titel: 'Freigabe des Porträts', vorgang: 'Social Media · Porträt: Lisa Meier (Solaro)', wer: 'Mehmet', faellig: '2026-10-08', herkunft: 'Porträtreihe Gründerinnen', quelle: 'Notiz 15.09.' },
      // ungeprüft aus dem Import
      { id: 'u1', ungeprueft: true, richtung: 'von uns', titel: 'Presseanfrage Porträt Gründerinnen beantworten', vorgang: '– (ohne Bereich)', wer: 'Mehmet', faellig: '2026-10-02', grund: 'Frage in einer Mail ans StartHub-Postfach', herkunft: 'Anfrage der Augsburger Allgemeinen', quelle: 'Mail heute 08:05' },
      { id: 'u2', ungeprueft: true, richtung: 'von uns', titel: 'Max Brandt Sprechstunde anbieten', vorgang: 'Gründungsteams · Lern-App (Max Brandt)', wer: 'Andreas', faellig: '2026-10-01', grund: 'unbeantwortete Frage im StartHub-Postfach', herkunft: 'Anfrage Gründungsstipendium', quelle: 'Mail 29.09.' },
      { id: 'u3', ungeprueft: true, richtung: 'an uns', von: 'Karin Vogt (Stadtwerke)', titel: 'Unterschriebene Rahmenvereinbarung', vorgang: '– (ohne Bereich)', wer: 'Andreas', faellig: '', grund: '„schicken wir Ihnen dann unterschrieben zu“', herkunft: 'Kooperationsgespräch', quelle: 'Mail 29.09.' },
      { id: 'u4', ungeprueft: true, richtung: 'von uns', titel: 'Hackathon-Challenge zusagen oder absagen', vorgang: '– (ohne Bereich)', wer: 'Julia', faellig: '', grund: 'Frage in einer Mail ans StartHub-Postfach', herkunft: 'Anfrage Fachschaft Informatik', quelle: 'Mail 28.09.' },
      { id: 'u5', ungeprueft: true, richtung: 'von uns', titel: 'Rechnung Raumtechnik weiterleiten', vorgang: '– (ohne Bereich)', wer: 'Julia', faellig: '', grund: 'Rechnung im Netzlaufwerk ohne Vermerk', herkunft: 'Rechnung_0326.pdf', quelle: 'Netzlaufwerk' }
    ];
  }
  // Zusagen eines Eintrags (Beratungsakte, Bereichsdetail): gefiltert aus den Aufgaben, Status berechnet
  zusagenFuer(vorgang) {
    var self = this;
    var z = this.aufgabenDaten().filter(function (a) { return a.vorgang === vorgang && !a.ungeprueft && !a.privat; }).map(function (a) {
      var erl = self.wert(a.id, 'erledigt', !!a.erledigt), g = self.faelligGruppe(a.faellig);
      return { richtung: a.richtung, text: a.titel + (a.richtung === 'an uns' ? ' – ' + a.von.replace(/ \(.*\)$/, '') : a.wer !== 'Andreas' ? ' (' + a.wer + ')' : ''), quelle: a.quelle,
        faellig: erl ? '' : (g === 'ueber' ? 'seit ' + self.datumText(a.faellig) : g === 'ohne' ? 'ohne Datum' : g === 'heute' ? self.datumText(a.faellig, a.zeit) : 'bis ' + self.datumText(a.faellig, a.zeit)),
        status: erl ? 'erledigt' : g === 'ueber' ? 'ueberfaellig' : 'offen' };
    });
    return { vonUns: z.filter(function (x) { return x.richtung === 'von uns'; }), anUns: z.filter(function (x) { return x.richtung === 'an uns'; }) };
  }
  // ——— Kontakte: Personen und Organisationen, verknüpft über orgId (E47) ———
  kontaktDaten() {
    var P = [
      { id: 'lisa', name: 'Lisa Meier', rolle: 'Gründer:in', funktion: 'Produkt', orgId: 'solaro', tage: 1, letzter: 'gestern · Mail', ueber: 'Andreas', mails: 'Andreas 9 Mails · Julia 2 Mails', telefon: '0151 2345 6789',
        adressen: [{ adresse: 'lisa@solaro.de', info: 'Hauptadresse · 9 Mails' }, { adresse: 'l.meier@gmx.de', info: '1 Mail · bestätigt 30.09.' }, { adresse: 'lisa.meier@uni-augsburg.de', info: 'Kalender · 2 Termine' }],
        notiz: 'Ansprechpartnerin für alles rund um den EXIST-Antrag. Antwortet meist abends.' },
      { id: 'tom', name: 'Tom Kraus', rolle: 'Gründer:in', funktion: 'Finanzen', orgId: 'solaro', tage: 4, letzter: 'vor 4 Tagen · Mail', ueber: 'Andreas', mails: 'Andreas 4 Mails · Julia 1 Mail', adressen: [{ adresse: 'tom@solaro.de', info: 'Hauptadresse · 5 Mails' }] },
      { id: 'sara', name: 'Sara Yilmaz', rolle: 'Gründer:in', orgId: 'kl', tage: 2, letzter: 'vor 2 Tagen · Mail', ueber: 'Julia', mails: 'Julia 6 Mails · Andreas 1 Mail', adressen: [{ adresse: 'sara@kitchenloop.de', info: 'Hauptadresse · 7 Mails' }] },
      { id: 'ben', name: 'Ben Hofer', rolle: 'Gründer:in', orgId: 'kl', tage: 6, letzter: 'vor 6 Tagen · Termin', ueber: 'Julia', mails: 'Julia 3 Mails · Mehmet 2 Mails', adressen: [{ adresse: 'ben@kitchenloop.de', info: 'Hauptadresse · 5 Mails' }] },
      { id: 'jonas', name: 'Jonas Berg', rolle: 'Gründer:in', orgId: 'nord', tage: 23, letzter: 'vor 23 Tagen · Termin', ueber: 'Andreas', mails: 'Andreas 2 Mails', adressen: [{ adresse: 'jonas@nordlicht-analytics.de', info: 'Hauptadresse · 2 Mails' }] },
      { id: 'weber', name: 'Anna Weber', rolle: 'Partner', orgId: 'ihk', tage: 12, letzter: 'vor 12 Tagen · Mail', ueber: 'Julia', mails: 'Julia 3 Mails', adressen: [{ adresse: 'anna.weber@schwaben.ihk.de', info: 'Hauptadresse · 3 Mails' }], notiz: 'Soll Jurorin beim Pitch-Abend werden; Rückmeldung steht aus.' },
      { id: 'vogt', name: 'Karin Vogt', rolle: 'Partner', orgId: 'swa', tage: 1, letzter: 'gestern · Mail', ueber: 'Andreas', mails: 'Andreas 2 Mails', adressen: [{ adresse: 'k.vogt@stadtwerke-augsburg.de', info: 'Hauptadresse · 2 Mails' }] },
      { id: 'lang', name: 'Petra Lang', rolle: 'Partner', orgId: 'stw', tage: 12, letzter: 'vor 12 Tagen · Telefon', ueber: 'Julia', mails: 'Julia 4 Mails', adressen: [{ adresse: 'p.lang@studentenwerk-augsburg.de', info: 'Hauptadresse · 4 Mails' }] },
      { id: 'albrecht', name: 'Dr. Kerstin Albrecht', rolle: 'Mentor:in', orgId: 'ac', tage: 34, letzter: 'vor 34 Tagen · Mail', ueber: 'Andreas', mails: 'Andreas 3 Mails', adressen: [{ adresse: 'k.albrecht@albrecht-consulting.de', info: 'Hauptadresse · 3 Mails' }] },
      { id: 'hartmann', name: 'Prof. Dr. Martin Hartmann', rolle: 'Uni-intern', orgId: 'uni', tage: 2, letzter: 'vor 2 Tagen · Mail', ueber: 'Andreas', mails: 'Andreas 6 Mails', adressen: [{ adresse: 'hartmann@uni-augsburg.de', info: 'Hauptadresse · 6 Mails' }] },
      { id: 'lmeier2', dublette: true, ungeprueft: true, name: 'L. Meier', rolle: 'Gründer:in', orgId: 'solaro2', tage: 40, letzter: 'vor 40 Tagen · Termin', ueber: 'Andreas', mails: 'Andreas 1 Mail', adressen: [{ adresse: 'l.meier@solaro-energy.de', info: '2 Termine, 1 Mail' }], grund: 'Absender in 2 Terminen und 1 Mail', quelle: 'Import Kalender' },
      { id: 'nora', ungeprueft: true, name: 'Nora Kim', rolle: 'Gründer:in', orgId: 'green', tage: 1, letzter: 'gestern · Mail', ueber: 'StartHub-Postfach', mails: 'StartHub 1 Mail', adressen: [{ adresse: 'nora@greenbyte.io', info: '1 Mail' }], grund: 'Anfrage über das StartHub-Postfach', quelle: 'Mail 29.09.' },
      { id: 'max', ungeprueft: true, name: 'Max Brandt', rolle: 'Gründer:in', orgId: '', tage: 1, letzter: 'gestern · Mail', ueber: 'StartHub-Postfach', mails: 'StartHub 1 Mail', adressen: [{ adresse: 'max.brandt@student.uni-augsburg.de', info: '1 Mail' }], grund: 'Anfrage Gründungsstipendium', quelle: 'Mail 29.09.' },
      { id: 'ott', ungeprueft: true, name: 'Sven Ott', rolle: 'Partner', orgId: 'klc', tage: 7, letzter: 'vor 7 Tagen · Mail', ueber: 'StartHub-Postfach', mails: 'StartHub 1 Mail', adressen: [{ adresse: 'ott@kl-catering.de', info: '1 Mail' }], grund: 'CC in einer Mail an Kitchen Loop', quelle: 'Mail 23.09.' },
      { id: 'redaktion', ungeprueft: true, name: 'Redaktion Augsburger Allgemeine', rolle: 'Sonstige', orgId: 'aa', tage: 0, letzter: 'heute · Mail', ueber: 'StartHub-Postfach', mails: 'StartHub 1 Mail', adressen: [{ adresse: 'redaktion@augsburger-allgemeine.de', info: '1 Mail' }], grund: 'Presseanfrage', quelle: 'Mail heute 08:05' },
      { id: 'lmeyer', dublette: true, ungeprueft: true, name: 'Lisa Meyer', rolle: 'Sonstige', orgId: '', tage: 90, letzter: 'vor 90 Tagen · Mail', ueber: 'Andreas', mails: 'Andreas 1 Mail', adressen: [{ adresse: 'lisa.meyer@student.uni-augsburg.de', info: '1 Mail' }], grund: 'Absenderin einer Mail zu Sprechzeiten', quelle: 'Import Mail 02.07.' }
    ];
    var O = [
      { id: 'solaro', name: 'Solaro', art: 'Gründungsteam', web: 'solaro.de', ort: 'Augsburg', telefon: '0821 123 45 60', mail: 'hallo@solaro.de', ueber: 'Andreas', notiz: 'Solarspeicher für Balkonkraftwerke. EXIST-Antrag in Arbeit.' },
      { id: 'kl', name: 'Kitchen Loop', art: 'Gründungsteam', web: 'kitchenloop.de', ort: 'Augsburg', ueber: 'Julia' },
      { id: 'nord', name: 'Nordlicht Analytics', art: 'Gründungsteam', web: 'nordlicht-analytics.de', ort: 'Augsburg', ueber: 'Andreas' },
      { id: 'ihk', name: 'IHK Schwaben', art: 'Partner', web: 'ihk.de/schwaben', ort: 'Augsburg', ueber: 'Julia' },
      { id: 'swa', name: 'Stadtwerke Augsburg', art: 'Partner', web: 'sw-augsburg.de', ort: 'Augsburg', ueber: 'Andreas' },
      { id: 'stw', name: 'Studierendenwerk Augsburg', art: 'Partner', web: '', ort: 'Augsburg', ueber: 'Julia' },
      { id: 'ac', name: 'Albrecht Consulting', art: 'Mentor:in', web: '', ort: 'München', ueber: 'Andreas' },
      { id: 'uni', name: 'Universität Augsburg', art: 'Uni-intern', web: 'uni-augsburg.de', ort: 'Augsburg', ueber: 'Andreas' },
      { id: 'solaro2', ungeprueft: true, dublette: true, name: 'Solaro Energy', art: 'Gründungsteam', web: 'solaro-energy.de', ort: '', ueber: 'Andreas', grund: 'Domain aus 2 Terminen von L. Meier' },
      { id: 'green', ungeprueft: true, name: 'Greenbyte', art: 'Gründungsteam', web: 'greenbyte.io', ort: '', ueber: 'StartHub-Postfach', grund: 'aus der Mail von Nora Kim' },
      { id: 'klc', ungeprueft: true, name: 'Kitchen Loop Catering', art: 'Partner', web: '', ort: '', ueber: 'StartHub-Postfach', grund: 'aus einer Mail-Signatur' },
      { id: 'aa', ungeprueft: true, name: 'Augsburger Allgemeine', art: 'Sonstige', web: 'augsburger-allgemeine.de', ort: 'Augsburg', ueber: 'StartHub-Postfach', grund: 'Presseanfrage' }
    ];
    return { personen: P, orgs: O };
  }
  // Detailansicht schließen: Liste nimmt dann die ganze Breite ein; Klick auf eine Zeile öffnet wieder
  detailVals() { var self = this; return { ldKlasse: 'ld' + (this.state.zu ? ' ld--zu' : ''), detailZu: function () { self.setState({ zu: true, kcOffen: false }); }, detailOffen: !this.state.zu, detailIstZu: !!this.state.zu }; }
  // ——— Bearbeiten, Rückgängig, Prüfen (gemeinsam für alle Werkzeuge) ———
  basisState() { return { edits: {}, letzte: null, sel: null, pAuswahl: {}, pAlle: false, pWarumOffen: false, pWarum: '' }; }
  wert(id, feld, fallback) { var e = this.state.edits[id]; return e && e[feld] !== undefined ? e[feld] : fallback; }
  aendere(changes, label, ohneUndo, undoFn) {
    var ed = Object.assign({}, this.state.edits), alt = [], self = this;
    changes.forEach(function (c) { ed[c.id] = Object.assign({}, ed[c.id]); alt.push({ id: c.id, feld: c.feld, vorher: self.wert(c.id, c.feld, c.basis) }); ed[c.id][c.feld] = c.wert; });
    this.setState({ edits: ed, letzte: { changes: alt, label: label, ohneUndo: !!ohneUndo && !undoFn, undoFn: undoFn || null } });
    clearTimeout(this._tt); this._tt = setTimeout(function () { self.setState({ letzte: null }); }, 9000);
  }
  toastVals() {
    var self = this, l = this.state.letzte;
    return {
      zeigeToast: !!l, toastText: l ? l.label : '', toastKannZurueck: !!l && !l.ohneUndo,
      toastZu: function () { self.setState({ letzte: null }); },
      toastUndo: function () {
        var l = self.state.letzte; if (!l) return;
        var ed = Object.assign({}, self.state.edits);
        l.changes.forEach(function (c) { ed[c.id] = Object.assign({}, ed[c.id]); ed[c.id][c.feld] = c.vorher; });
        self.setState({ edits: ed, letzte: null });
        if (l.undoFn) l.undoFn();
      }
    };
  }
  // Direkt bearbeitbare Felder: tippen speichert still, Verlassen des Feldes zeigt „Gespeichert · Rückgängig“
  feld(id, basis, name) {
    var self = this;
    return {
      fokus: function (e) { self._fokusAlt = e.target.value; },
      tippen: function (e) { var f = e.target.getAttribute('data-feld'); var ed = Object.assign({}, self.state.edits); ed[id] = Object.assign({}, ed[id]); ed[id][f] = e.target.value; self.setState({ edits: ed }); },
      fertig: function (e) {
        var f = e.target.getAttribute('data-feld'), neu = e.target.value, alt = self._fokusAlt;
        self._fokusAlt = undefined;
        if (alt === undefined || alt === neu) return;
        var ed = Object.assign({}, self.state.edits); ed[id] = Object.assign({}, ed[id]); ed[id][f] = alt;
        self.state.edits = ed;
        self.aendere([{ id: id, feld: f, wert: neu, basis: basis[f] }], 'Gespeichert' + (name ? ': ' + name : ''));
      },
      wahl: function (e) { var f = e.target.getAttribute('data-feld'); self.aendere([{ id: id, feld: f, wert: e.target.value, basis: basis[f] }], 'Gespeichert'); }
    };
  }
  // Filter „ungeprüft“: Mehrfachauswahl + Übernehmen / Verwerfen (+ optional Warum)
  pruefVals(items, gesamt, art, opt) {
    var self = this, st = this.state; opt = opt || {};
    var offen = items.filter(function (i) { return i.ungeprueft && !self.wert(i.id, 'geprueft', ''); });
    var gewaehlt = st.pAlle ? offen : offen.filter(function (i) { return st.pAuswahl[i.id]; });
    var bulk = self.wert('_pruef', art, false);
    var rest = bulk ? 0 : Math.max(0, gesamt - (items.filter(function (i) { return i.ungeprueft; }).length - offen.length));
    var anzahl = st.pAlle ? rest : gewaehlt.length;
    var anwenden = function (wert) {
      var warum = self.state.pWarum.trim();
      var ch = [];
      gewaehlt.forEach(function (i) { if (wert === 'weg' && opt.verwerfen) ch = ch.concat(opt.verwerfen(i)); else ch.push({ id: i.id, feld: 'geprueft', wert: wert, basis: '' }); });
      if (self.state.pAlle) ch.push({ id: '_pruef', feld: art, wert: true, basis: false });
      self.aendere(ch,
        anzahl + ' ' + art + (wert === 'ok' ? ' übernommen' : (opt.verworfenText || ' verworfen')) + (wert === 'weg' && warum ? ' · gemerkt: „' + warum + '“' : ''));
      self.setState({ pAuswahl: {}, pAlle: false, pWarumOffen: false, pWarum: '' });
    };
    return {
      pruefGesamt: rest, pruefAlle: st.pAlle, pruefVerwerfenLabel: opt.verwerfenLabel || 'Verwerfen',
      pruefAlleToggle: function () { self.setState({ pAlle: !self.state.pAlle, pAuswahl: {} }); },
      pruefZeile: anzahl ? anzahl + ' ausgewählt' : rest + ' ungeprüft · einzeln anhaken oder alle wählen',
      pruefHatAuswahl: anzahl > 0,
      pruefUebernehmen: function () { anwenden('ok'); },
      pruefWarumAuf: function () { self.setState({ pWarumOffen: !self.state.pWarumOffen }); },
      pruefWarumOffen: st.pWarumOffen && anzahl > 0,
      pruefWarum: st.pWarum, pruefWarumTippen: function (e) { self.setState({ pWarum: e.target.value }); },
      pruefVerwerfen: function (e) { if (e && e.preventDefault) e.preventDefault(); anwenden('weg'); },
      pruefWaehle: function (id) { return function () { var m = Object.assign({}, self.state.pAuswahl); m[id] = !m[id]; self.setState({ pAuswahl: m, pAlle: false }); }; },
      pruefIstGewaehlt: function (id) { return st.pAlle || !!st.pAuswahl[id]; }
    };
  }
