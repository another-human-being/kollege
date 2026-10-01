class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = {
      view: 'uebersicht', chatId: null, scope: 'Meins', bereichFilter: 'Alle',
      offen: {}, gesendet: {}, spaeter: {}, erledigt: {}, sheet: null,
      chats: this.startChats(), conv: this.startConv(), zaehler: 0,
      stream: null, laedt: null, geloescht: null, msgGesendet: {}, klaert: {}, teamNeu: {}, teamWer: null
    };
  }
  startChats() {
    return [
      { id: 'c1', titel: 'Beratung Solaro, Pitchdeck', datum: 'heute', etikett: 'Solaro', etikettHref: 'Gruendungsteams.dc.html', angepinnt: true },
      { id: 'c2', titel: 'Social Media nur montags', datum: 'heute' },
      { id: 'c3', titel: 'Was haben wir Solaro versprochen?', datum: 'gestern', etikett: 'Solaro', etikettHref: 'Kontakte.dc.html' },
      { id: 'c4', titel: 'Einladung Gründungsnacht', datum: '28.09.', etikett: 'Gründungsnacht 2026', etikettHref: 'Events.dc.html' },
      { id: 'c5', titel: 'Wie lange dauert EXIST?', datum: '25.09.' },
      { id: 'c6', titel: 'Notiz zu Tom', datum: '24.09.', etikett: 'Tom Kraus', etikettHref: 'Kontakte.dc.html' }
    ];
  }
  solaroAntwort() {
    return {
      voll: 'Verstanden: Beratung mit Solaro (Lisa Meier, Tom Kraus) zum EXIST-Antrag. Den Pitchdeck-Entwurf hat Lisa gestern geschickt, noch ohne Finanzteil – ich habe die Zusage auf „final inkl. Finanzteil bis Fr 02.10.“ aktualisiert.',
      quelle: 'Mail 29.09.',
      rest: [
        { typ: 'aussage', art: 'einschaetzung', text: '„Frau Weber“ ist vermutlich Anna Weber von der IHK Schwaben' },
        { typ: 'karte', punkte: ['Beratung in der Akte von Solaro abgelegt', 'Zusage bei Solaro aktualisiert: Pitchdeck final bis Fr 02.10.', 'Aufgabe für dich angelegt: Kontakt zu Frau Weber vermitteln'], anweisung: 'EXIST-Anträge: Pitchdeck spätestens 4 Wochen vor Einreichung anfordern', folgen: 'entfernt auch 1 Erinnerung (Fr 17:00)', linkText: 'Zur Beratungsakte: Solaro', linkHref: 'Gruendungsteams.dc.html' },
        { typ: 'klaerung', kid: 'weber', frage: 'Ist „Frau Weber“ Anna Weber (IHK Schwaben)?', grund: 'Einzige Frau Weber in euren Kontakten, letzter Kontakt am 21.09.', quelle: 'Mail 21.09.', antworten: ['Ja', 'Andere Person', 'Neu anlegen'] },
        { typ: 'kollege', text: 'Sobald du das bestätigst, bereite ich die Vorstellung vor:' },
        { typ: 'entwurf', wartetAuf: 'weber', zusage: 'Kontakt zu Frau Weber vermitteln', kanal: 'Mail', an: 'Anna Weber, IHK Schwaben', betreff: 'Vorstellung: Solaro (Solar-Startup, EXIST)', auszug: 'Liebe Frau Weber, darf ich Ihnen Lisa Meier und Tom Kraus von Solaro vorstellen? Die beiden bereiten gerade einen EXIST-Antrag vor und würden sich über ein kurzes Gespräch zur Finanzierung freuen.', text: 'Liebe Frau Weber,\n\ndarf ich Ihnen Lisa Meier und Tom Kraus von Solaro vorstellen? Die beiden entwickeln Solarmodule für Balkone und bereiten gerade einen EXIST-Antrag vor. Sie würden sich über ein kurzes Gespräch zur Finanzierung freuen.\n\nIch setze die beiden in Kopie.\nHerzliche Grüße\nAndreas', quelle: 'Chat 14:32', grund: '„wir vermitteln Kontakt zu Frau Weber“' }
      ]
    };
  }
  startConv() {
    var s = this.solaroAntwort();
    return {
      c1: [{ typ: 'du', zeit: '14:32', text: 'Gerade Beratung mit Solaro gehabt, sie schicken bis Freitag das Pitchdeck, wir vermitteln Kontakt zu Frau Weber.' }, { typ: 'kollege', zeit: '14:32', text: s.voll, quelle: s.quelle }].concat(s.rest),
      c2: [
        { typ: 'du', zeit: '11:05', text: 'Hinweise zu Social Media bitte nur montags.' },
        { typ: 'kollege', zeit: '11:05', text: 'Verstanden. Ab jetzt sammle ich Hinweise zu Beiträgen und zeige sie dir montags früh. Das gilt nur für dich – Mehmet sieht sie weiter täglich.' },
        { typ: 'karte', art: 'anweisung', geltung: 'persoenlich', punkte: ['„Hinweise zu Social Media nur montags.“'], linkText: 'Zur Anweisungsliste', linkHref: 'Einstellungen.dc.html' }
      ],
      c3: [
        { typ: 'du', zeit: '16:20', text: 'Was haben wir Solaro versprochen?' },
        { typ: 'kollege', zeit: '16:20', text: 'Drei Zusagen, zwei davon offen:' },
        { typ: 'aussage', art: 'belegt', text: 'Kontakt zu Frau Weber (IHK) vermitteln – offen', quelle: 'Chat 30.09.' },
        { typ: 'aussage', art: 'belegt', text: 'Feedback zum Finanzplan „bis Mitte der Woche“ – offen', quelle: 'Mail 26.09.' },
        { typ: 'aussage', art: 'belegt', text: 'EXIST-Merkblatt schicken – erledigt am 24.09.', quelle: 'Mail 24.09.' },
        { typ: 'aussage', art: 'berechnet', text: 'Finanzplan-Feedback ist heute fällig', dringend: true },
        { typ: 'aussage', art: 'einschaetzung', text: 'Tom wartet vermutlich darauf, bevor er den Antrag weiterschreibt' }
      ],
      c4: [
        { typ: 'du', zeit: '10:12', text: 'Bereite die Einladung zur Gründungsnacht vor.' },
        { typ: 'kollege', zeit: '10:12', text: 'Die Einladung ist als Entwurf fertig. Verschicken würde ich sie am 09.10. – sechs Wochen vorher.' },
        { typ: 'karte', punkte: ['Einladung als Entwurf bei Events · Gründungsnacht 2026 abgelegt', 'Versand für Fr 09.10., 9:00 eingeplant'], anweisung: 'Gründungsnacht: Einladung 6 Wochen vorher – gilt vor „Events: 4 Wochen vorher“ (spezieller)', folgen: 'entfernt auch 1 geplanten Versand und 1 Erinnerung', linkText: 'Zu Events: Gründungsnacht 2026', linkHref: 'Events.dc.html' },
        { typ: 'entwurf', geplant: 'Fr 09.10., 9:00', kanal: 'Einladung', an: 'Verteiler Gründungsinteressierte (214)', betreff: 'Einladung: Gründungsnacht am 20. November', auszug: 'Hallo zusammen, am Freitag, 20. November, ist wieder Gründungsnacht im Gründungszentrum – mit Pitches, Workshops und viel Zeit zum Kennenlernen.', text: 'Hallo zusammen,\n\nam Freitag, 20. November, ist wieder Gründungsnacht im Gründungszentrum – mit Pitches, Workshops und viel Zeit zum Kennenlernen. Anmeldung bis 13.11.\n\nBis bald!\nEuer Gründungszentrum', quelle: 'Anweisung Julia', grund: 'Gründungsnacht: Einladung 6 Wochen vorher' }
      ],
      c5: [
        { typ: 'du', zeit: '09:40', text: 'Wie lange dauert es bei EXIST bis zur Bewilligung?' },
        { typ: 'luecke', bekannt: 'Ich kenne zwei EXIST-Anträge aus euren Mails, aber keinen bis zur Bewilligung. Eine Dauer kann ich daraus nicht ableiten – und raten will ich nicht.' },
        { typ: 'aussage', art: 'einschaetzung', text: 'Julia hat 2024 zwei Anträge betreut und weiß es wahrscheinlich' }
      ],
      c6: [
        { typ: 'du', zeit: '17:48', text: 'Notiz, privat: Tom wirkt unter Druck wegen der Finanzierung. Nächste Woche nachfragen.' },
        { typ: 'kollege', zeit: '17:48', text: 'Notiert – nur für dich sichtbar.' },
        { typ: 'karte', privat: true, punkte: ['Private Notiz bei Tom Kraus abgelegt', 'Aufgabe für dich: Mo 05.10. bei Tom nachfragen'], folgen: 'entfernt auch 1 Aufgabe', linkText: 'Zu Solaro', linkHref: 'Kontakte.dc.html' }
      ]
    };
  }
  antwortFuer(text) {
    if (/nur montags|ab jetzt|ab sofort|in zukunft|bitte nie|immer wenn/i.test(text)) {
      var team = /team|alle|für uns/i.test(text);
      return { voll: 'Verstanden. Das gilt ab jetzt ' + (team ? 'für das ganze Team.' : 'nur für dich.'), rest: [
        { typ: 'karte', art: 'anweisung', geltung: team ? 'team' : 'persoenlich', punkte: ['„' + text.replace(/\s+$/, '') + '“'], linkText: 'Zur Anweisungsliste', linkHref: 'Einstellungen.dc.html' }] };
    }
    if (text.indexOf('?') >= 0 && /solaro/i.test(text)) {
      var c = this.startConv().c3.slice(1);
      return { voll: c[0].text, rest: c.slice(1) };
    }
    if (text.indexOf('?') >= 0) {
      return { voll: '', rest: [{ typ: 'luecke', bekannt: 'Dazu finde ich in euren Mails, Terminen und Notizen nichts Belastbares. Ich rate lieber nicht.' }] };
    }
    if (/solaro|pitchdeck/i.test(text)) return this.solaroAntwort();
    return { voll: 'Notiert. Ich konnte es noch keinem Bereich zuordnen.', rest: [
      { typ: 'karte', punkte: ['Notiz abgelegt, noch ohne Bereich'], linkText: 'Zu Heute', linkHref: 'Main.dc.html' },
      { typ: 'klaerung', frage: 'Zu welchem Bereich gehört die Notiz?', grund: 'Kein Team oder Event im Text erkannt', antworten: ['Events · Pitch-Abend', 'Gründungsteams · Kitchen Loop', 'Ohne Bereich'] }] };
  }
  titelAus(text) {
    var w = text.replace(/[.,!?:;„“"]/g, '').split(/\s+/).filter(Boolean).slice(0, 5).join(' ');
    return w.charAt(0).toUpperCase() + w.slice(1);
  }
  senden(text, chatId) {
    var self = this, st = this.state, id = chatId, chats = st.chats.slice(), conv = Object.assign({}, st.conv);
    if (!id) {
      id = 'n' + (st.zaehler + 1);
      var a0 = this.antwortFuer(text);
      var neu = { id: id, titel: this.titelAus(text), datum: 'gerade' };
      if (/solaro|pitchdeck/i.test(text)) { neu.etikett = 'Solaro'; neu.etikettHref = 'Gruendungsteams.dc.html'; }
      chats.unshift(neu);
      conv[id] = [];
    }
    conv[id] = conv[id].concat([{ typ: 'du', zeit: 'jetzt', text: text }]);
    this.setState({ chats: chats, conv: conv, zaehler: st.zaehler + 1, view: 'chat', chatId: id, laedt: id });
    var a = this.antwortFuer(text);
    setTimeout(function () {
      if (!a.voll) { var c2 = Object.assign({}, self.state.conv); c2[id] = c2[id].concat(a.rest); self.setState({ conv: c2, laedt: null }); return; }
      self.setState({ laedt: null, stream: { id: id, voll: a.voll, quelle: a.quelle, rest: a.rest, n: 0 } });
      var t = setInterval(function () {
        var s = self.state.stream;
        if (!s) { clearInterval(t); return; }
        var n = Math.min(s.voll.length, s.n + 5);
        if (n >= s.voll.length) {
          clearInterval(t);
          var c3 = Object.assign({}, self.state.conv);
          c3[s.id] = (c3[s.id] || []).concat([{ typ: 'kollege', zeit: 'jetzt', text: s.voll, quelle: s.quelle }], s.rest);
          self.setState({ stream: null, conv: c3 });
        } else self.setState({ stream: { id: s.id, voll: s.voll, quelle: s.quelle, rest: s.rest, n: n } });
      }, 28);
    }, 900);
  }
  daten(scope) {
    var heute = [
      { id: 'kl', zeit: '10:00', vor: '', kern: 'Beratung Kitchen Loop', nach: ' in Raum 2.14.', art: 'beratung', vorgang: 'Gründungsteams · Kitchen Loop', href: 'AUTO', wer: 'Andreas',
        gruende: [{ art: 'belegt', text: 'Termin im Teamkalender', quelle: 'Kalender' }, { art: 'belegt', text: 'Offene Frage aus letzter Mail: Hygieneschulung', quelle: 'Mail 28.09.' }],
        knoepfe: [{ label: 'Termin öffnen', href: 'Kalender.dc.html' }, { label: 'Mail von Sara', href: 'Mail.dc.html', text: true }, { label: 'Später', aktion: 'spaeter' }] },
      { id: 'tom', zeit: 'heute', privat: true, vor: 'Bei Tom Kraus wegen der ', kern: 'Finanzierungssorge', nach: ' nachhaken.', art: 'beratung', vorgang: 'Gründungsteams · Solaro', href: 'AUTO', wer: 'nur du',
        gruende: [{ art: 'belegt', text: 'Deine private Notiz', quelle: 'Chat 24.09.' }],
        knoepfe: [{ label: 'Erledigt', aktion: 'erledigt' }, { label: 'Später', aktion: 'spaeter' }] }
    ];
    var wartetAufUns = [
      { id: 'fin', zeit: 'seit 4 Tagen', vor: 'Tom Kraus wartet auf ', kern: 'Feedback zum Finanzplan', nach: '.', art: 'beratung', vorgang: 'Gründungsteams · Solaro', href: 'AUTO', wer: 'Andreas',
        gruende: [{ art: 'belegt', text: '„Könnt ihr bis Mitte der Woche drüberschauen?“', quelle: 'Mail 26.09.' }, { art: 'berechnet', text: 'Mitte der Woche = heute' }],
        knoepfe: [{ label: 'Finanzplan öffnen', href: 'Dateien.dc.html' }, { label: 'Antworten', href: 'Mail.dc.html', text: true }, { label: 'Später', aktion: 'spaeter' }] },
      { id: 'raum', zeit: 'seit 2 Tagen', vor: 'Prof. Hartmann wartet auf die ', kern: 'Raumbuchung', nach: ' für Sitzung 3.', art: 'lehre', vorgang: 'Lehre · Entrepreneurship Basics', href: 'AUTO', wer: 'Andreas',
        gruende: [{ art: 'belegt', text: 'Bitte um Raum mit Beamer für 40 Personen', quelle: 'Mail 28.09.' }, { art: 'berechnet', text: 'Aufgabe seit gestern überfällig', dringend: true }],
        knoepfe: [{ label: 'Erledigt', aktion: 'erledigt' }, { label: 'Antworten', href: 'Mail.dc.html', text: true }, { label: 'Später', aktion: 'spaeter' }] }
    ];
    var wirWarten = [
      { id: 'pitch', zeit: 'bis Fr', vor: 'Solaro schickt das ', kern: 'finale Pitchdeck', nach: ' bis Freitag.', art: 'beratung', vorgang: 'Gründungsteams · Solaro', href: 'AUTO', wer: 'Andreas',
        gruende: [{ art: 'belegt', text: 'Entwurf kam gestern, noch ohne Finanzteil', quelle: 'Mail 29.09.' }, { art: 'belegt', text: 'Final zugesagt bis Fr 02.10.', quelle: 'Chat 30.09.' }, { art: 'berechnet', text: 'noch 2 Tage' }],
        knoepfe: [{ label: 'Entwurf ansehen', href: 'Mail.dc.html' }, { label: 'Später', aktion: 'spaeter' }] }
    ];
    var haengt = [
      { id: 'nord', zeit: 'seit 23 Tagen', vor: 'Nordlicht Analytics: ', kern: 'kein Folgetermin', nach: ' nach der Erstberatung.', art: 'beratung', vorgang: 'Gründungsteams · Nordlicht Analytics', href: 'AUTO', wer: 'Andreas',
        gruende: [{ art: 'belegt', text: 'Erstberatung', quelle: 'Termin 07.09.' }, { art: 'berechnet', text: 'seit 23 Tagen kein Kontakt' }, { art: 'einschaetzung', text: 'möglicherweise eingeschlafen – die letzte Mail klang unentschlossen' }],
        knoepfe: [{ label: 'Nachfassen', aktion: 'entwurf' }, { label: 'Erledigt', aktion: 'erledigt' }, { label: 'Später', aktion: 'spaeter' }],
        entwurf: { an: 'Jonas Berg (Nordlicht Analytics)', betreff: 'Wie geht es bei euch weiter?', quelle: 'Termin 07.09.', grund: 'Erstberatung am 07.09., seitdem kein Kontakt',
          text: 'Hallo Jonas,\n\nseit unserer Erstberatung Anfang September habe ich nichts mehr von euch gehört. Wie geht es mit Nordlicht weiter? Wenn ihr mögt, finden wir einen Termin für ein zweites Gespräch.\n\nViele Grüße\nAndreas' } }
    ];
    if (scope === 'Team') {
      heute = heute.filter(function (h) { return !h.privat; });
      heute.push({ id: 'insta', zeit: 'bis 17:00', vor: '', kern: 'Instagram-Beitrag', nach: ' zum Pitch-Abend freigeben.', art: 'beitrag', vorgang: 'Social Media · Pitch-Abend ankündigen', href: 'AUTO', wer: 'Mehmet',
        gruende: [{ art: 'belegt', text: 'Freigabe angefragt', quelle: 'Notiz 29.09.' }], knoepfe: [{ label: 'Öffnen', href: 'AUTO' }, { label: 'Später', aktion: 'spaeter' }] });
      wartetAufUns.push({ id: 'mensa', zeit: 'seit 6 Tagen', vor: 'Kitchen Loop wartet auf ', kern: 'Rückmeldung zur Mensa', nach: '.', art: 'beratung', vorgang: 'Gründungsteams · Kitchen Loop', href: 'AUTO', wer: 'Julia',
        gruende: [{ art: 'belegt', text: 'Julia: „Ich kläre das mit dem Studierendenwerk.“', quelle: 'Mail 24.09.' }], knoepfe: [{ label: 'Zur Aufgabe', href: 'Aufgaben.dc.html' }, { label: 'Später', aktion: 'spaeter' }] });
      haengt.push({ id: 'sommer', zeit: 'seit 25 Tagen', vor: 'Rückblick Sommerfest: ', kern: 'Entwurf liegt', nach: ' seit 25 Tagen.', art: 'beitrag', vorgang: 'Social Media · Rückblick Sommerfest', href: 'AUTO', wer: 'Mehmet',
        gruende: [{ art: 'belegt', text: 'Letzte Änderung am Entwurf', quelle: 'Datei 05.09.' }, { art: 'einschaetzung', text: 'vermutlich zurückgestellt wegen Pitch-Abend' }], knoepfe: [{ label: 'Öffnen', href: 'AUTO' }, { label: 'Später', aktion: 'spaeter' }] });
    }
    return [
      { titel: 'Heute', items: heute, leerTitel: 'Heute steht nichts an.', leerText: 'Termine und Fristen für heute erscheinen hier.' },
      { titel: 'Wartet auf uns', items: wartetAufUns, leerTitel: 'Nichts wartet auf euch.', leerText: 'Wenn jemand eine Antwort von euch erwartet, steht es hier.' },
      { titel: 'Wir warten auf', items: wirWarten, leerTitel: 'Ihr wartet auf nichts.', leerText: 'Zusagen anderer mit Frist erscheinen hier.' },
      { titel: 'Hängt', items: haengt, leerTitel: 'Nichts hängt.', leerText: 'Einträge ohne Bewegung seit drei Wochen erscheinen hier.' },
      { titel: 'Prüfen', items: [{ id: 'pruef', zeit: 'Import', vor: '', kern: '214 ungeprüft', nach: ' – Vorschläge aus dem Import der letzten 12 Monate.', art: 'sonstiges', vorgang: 'Alle Bereiche · Filter „ungeprüft“', href: 'AUTO', wer: 'Team',
        gruende: [{ art: 'berechnet', text: 'Gründungsteams 52 · Events 31 · Lehre 14 · Social Media 21 · Kontakte 88 (57 Personen, 31 Organisationen) · Aufgaben 5 · Dateien 3' }, { art: 'einschaetzung', text: 'Rechnungen tauchen gehäuft als Gründungsteams auf – gesammelt verwerfen spart Zeit' }],
        knoepfe: [{ label: 'Gründungsteams prüfen', href: 'Gruendungsteams.dc.html' }, { label: 'Kontakte', href: 'Kontakte.dc.html', text: true }, { label: 'Später', aktion: 'spaeter' }] }], leerTitel: 'Alles geprüft.', leerText: '' }
    ];
  }
  teamNeuListe() {
    var self = this, st = this.state;
    var T = [
      { id: 'tn1', zeit: 'gestern', titel: 'Anfrage: Beratung zum Gründungsstipendium', von: 'Max Brandt (Student Informatik)', auszug: '„Wir sind zu dritt und wollen gründen – wann gibt es Sprechstunden?“', quelle: 'Mail 29.09.', vorschlag: 'passt vermutlich zu Andreas (EXIST-Erfahrung)', bereich: 'Gründungsteams' },
      { id: 'tn2', zeit: '28.09.', titel: 'Kooperationsanfrage: Hackathon im Januar', von: 'Fachschaft Informatik', auszug: '„Hättet ihr Lust, eine Challenge zu stellen und Mentoring anzubieten?“', quelle: 'Mail 28.09.', vorschlag: 'passt vermutlich zu Julia (Events)', bereich: 'Events' },
      { id: 'tn3', zeit: 'heute', titel: 'Presseanfrage: Porträt über Gründerinnen', von: 'Redaktion Augsburger Allgemeine', auszug: '„Könnten Sie uns zwei Gründerinnen für ein Porträt vermitteln?“', quelle: 'Mail 30.09.', vorschlag: 'passt vermutlich zu Mehmet (Kommunikation)', bereich: 'Social Media' }
    ];
    return T.map(function (t) {
      var w = st.teamNeu[t.id];
      return Object.assign({}, t, {
        offen: !w, vergeben: !!w,
        status: w === 'Andreas' ? '✓ Von dir übernommen · steht jetzt in deiner Liste auf Heute' : (w ? '✓ Zugewiesen an ' + w + ' · steht jetzt auf ' + w + 's Heute' : ''),
        zeigeWer: st.teamWer === t.id,
        uebernehmen: function () { var m = Object.assign({}, self.state.teamNeu); m[t.id] = 'Andreas'; self.setState({ teamNeu: m, teamWer: null }); },
        zuweisenAuf: function () { self.setState({ teamWer: self.state.teamWer === t.id ? null : t.id }); },
        personen: ['Julia', 'Mehmet'].map(function (n) { return { name: n, los: function () { var m = Object.assign({}, self.state.teamNeu); m[t.id] = n; self.setState({ teamNeu: m, teamWer: null }); } }; }),
        rueck: function () { var m = Object.assign({}, self.state.teamNeu); delete m[t.id]; self.setState({ teamNeu: m }); }
      });
    });
  }
  toggleMap(key, id) {
    var m = Object.assign({}, this.state[key]); m[id] = !m[id];
    var p = {}; p[key] = m; this.setState(p);
  }
  renderVals() {
    var self = this, st = this.state;
    var gesamt = 0, prueft = 0;
    var BF = st.bereichFilter || 'Alle';
    var PZ = { 'Gründungsteams': 52, 'Events': 31, 'Lehre': 14, 'Social Media': 21 };
    var abschnitte = this.daten('Meins').map(function (s) {
      var quelle = s.items;
      if (s.titel === 'Prüfen' && BF !== 'Alle') quelle = PZ[BF] ? [{ id: 'pruef-' + BF, zeit: 'Import', vor: '', kern: PZ[BF] + ' ungeprüft', nach: ' in ' + BF + ' – Vorschläge aus dem Import.', art: 'sonstiges', vorgang: BF + ' · Filter „ungeprüft“', href: 'AUTO', wer: 'Team', gruende: [{ art: 'berechnet', text: 'Nur ' + BF + ' – über alle Bereiche sind es 214' }], knoepfe: [{ label: BF + ' prüfen', href: 'AUTO' }, { label: 'Später', aktion: 'spaeter' }] }] : [];
      var items = quelle.filter(function (h) { return BF === 'Alle' || h.vorgang.split(' · ')[0] === BF; }).map(function (h) {
        var gesendet = !!st.gesendet[h.id], verschoben = !!st.spaeter[h.id], offen = !!st.offen[h.id];
        var erledigt = !!st.erledigt[h.id];
        var teile = h.vorgang.split(' · '), hr = self.bereichHref(h.vorgang);
        return Object.assign({}, h, {
          bereich: teile[0], eintrag: teile.slice(1).join(' · '), href: teile[0] === 'Alle Bereiche' ? 'Gruendungsteams.dc.html' : hr,
          privat: !!h.privat,
          klasse: 'kg-hinweis' + (h.dringend ? ' kg-hinweis--dringend' : ''),
          hatEntwurf: !!h.entwurf, entwurf: h.entwurf || {},
          zeigeAktionen: !gesendet && !verschoben && !erledigt,
          knoepfe: (h.knoepfe || []).slice(0, 3).map(function (b, i) {
            var kl = 'kg-aktion ' + (i === 0 && !b.text && b.aktion !== 'spaeter' ? 'kg-aktion--sekundaer' : 'kg-aktion--text');
            var los = function () {};
            if (b.aktion === 'spaeter') los = function () { self.toggleMap('spaeter', h.id); };
            if (b.aktion === 'erledigt') los = function () { self.toggleMap('erledigt', h.id); };
            if (b.aktion === 'entwurf') los = function () { self.toggleMap('offen', h.id); };
            return { label: b.aktion === 'entwurf' && offen ? 'Entwurf ausblenden' : b.label, istLink: !!b.href, istKnopf: !b.href, href: b.href === 'AUTO' ? self.bereichHref(h.vorgang) : (b.href || '#'), klasse: kl, los: los };
          }),
          zeigeEntwurf: offen && !gesendet && !verschoben && !erledigt,
          istGesendet: gesendet, istVerschoben: verschoben || erledigt,
          erledigtText: erledigt ? 'Erledigt' : 'Verschoben auf morgen, 9:00',
          zurueck: function () { if (erledigt) self.toggleMap('erledigt', h.id); else self.toggleMap('spaeter', h.id); },
          gesendetPunkte: h.entwurf ? ['Mail an ' + h.entwurf.an + ' über dein Postfach gesendet – liegt in „Gesendet“', 'Im Verlauf von „' + h.vorgang.split(' · ').pop() + '“ abgelegt'] : [],
          senden: function () { self.toggleMap('gesendet', h.id); },
          unsend: function () { self.toggleMap('gesendet', h.id); },
          ansehen: function () { self.setState({ sheet: Object.assign({ id: h.id }, h.entwurf) }); }
        });
      });
      if (s.titel === 'Prüfen') prueft = items.length; else gesamt += items.length;
      return { titel: s.titel, anzahl: items.length, aside: '', items: items, leer: items.length === 0, leerTitel: s.leerTitel, leerText: s.leerText };
    });
    abschnitte[0].aside = st.scope === 'Team' ? 'Andreas, Julia, Mehmet – ohne Privates' : 'nur deine';
    abschnitte[3].aside = '= seit 21 Tagen nichts passiert (berechnet, kein Status)';
    abschnitte[4].aside = 'je Bereich über den Filter „ungeprüft“';

    var aktiv = st.chats.filter(function (c) { return c.id === st.chatId; })[0];
    var msgs = (st.chatId && st.conv[st.chatId]) ? st.conv[st.chatId].slice() : [];
    if (st.stream && st.stream.id === st.chatId) msgs.push({ typ: 'kollege', zeit: 'jetzt', text: st.stream.voll.slice(0, st.stream.n), streamt: true });
    var nachrichten = msgs.map(function (m, i) {
      var key = st.chatId + ':' + i, gesendet = !!st.msgGesendet[key];
      var antwort = m.wartetAuf ? st.klaert[st.chatId + ':' + m.wartetAuf] : null;
      var neuAnlegen = !!m.wartetAuf && antwort === 'Neu anlegen';
      var wartet = !!m.wartetAuf && (!antwort || neuAnlegen), entfallen = !!m.wartetAuf && antwort === 'Andere Person';
      return Object.assign({ art: 'quittung', titel: '', geltung: '', privat: false, punkte: [], anweisung: '', folgen: '', linkText: '', linkHref: '', quelle: '', dringend: false, streamt: false, zeit: '' }, m, {
        istDu: m.typ === 'du', istKollege: m.typ === 'kollege', istAussage: m.typ === 'aussage', istKarte: m.typ === 'karte',
        istKlaerung: m.typ === 'klaerung', istEntwurf: m.typ === 'entwurf' && !gesendet && !entfallen, istGesendet: m.typ === 'entwurf' && gesendet, istLuecke: m.typ === 'luecke',
        istEntfallen: entfallen,
        wartet: wartet, gesperrtText: neuAnlegen ? 'Wartet, bis „Frau Weber“ als Kontakt angelegt ist – dann trage ich die Adresse ein.' : 'Wartet auf deine Antwort oben – erst dann lässt er sich senden.',
        istNeuAnlegen: m.typ === 'klaerung' && st.klaert[st.chatId + ':' + m.kid] === 'Neu anlegen',
        beantworten: function (a) { var k = Object.assign({}, self.state.klaert); k[st.chatId + ':' + m.kid] = a; self.setState({ klaert: k }); },
        zuruecknehmen: function () { var k = Object.assign({}, self.state.klaert); delete k[st.chatId + ':' + m.kid]; self.setState({ klaert: k }); },
        hinweis: m.geplant ? 'Geht am ' + m.geplant + ' über dein Postfach raus – bis dahin änderbar.' : '',
        sendenText: m.geplant ? 'Jetzt senden statt ' + m.geplant.split(',')[0].slice(3) : 'Über mein Postfach senden',
        hatQuelle: !!m.quelle && m.typ === 'kollege',
        art: m.typ === 'karte' ? (m.art || 'quittung') : (m.art || 'belegt'),
        gesendetPunkte: m.typ === 'entwurf' ? ['Mail an ' + m.an + ' über dein Postfach gesendet – liegt in „Gesendet“'].concat(m.zusage ? ['Zusage „' + m.zusage + '“ als erledigt markiert'] : []).concat(m.geplant ? ['Geplanter Versand am ' + m.geplant + ' entfällt'] : []) : [],
        senden: function () { self.toggleMap('msgGesendet', key); },
        unsend: function () { self.toggleMap('msgGesendet', key); },
        ansehen: function () { self.setState({ sheet: { id: null, msgKey: key, kanal: m.kanal, geplant: m.geplant, an: m.an, betreff: m.betreff, text: m.text || m.auszug, quelle: m.quelle, grund: m.grund } }); },
        fragJulia: function () {
          var c = Object.assign({}, self.state.conv);
          c[self.state.chatId] = c[self.state.chatId].concat([
            { typ: 'kollege', zeit: 'jetzt', text: 'Ich habe Julia eine kurze Frage vorbereitet:' },
            { typ: 'entwurf', kanal: 'Mail', an: 'Julia (Team)', betreff: 'Kurze Frage: Dauer EXIST-Bewilligung', auszug: 'Hi Julia, weißt du aus deinen EXIST-Anträgen 2024, wie lange es bis zur Bewilligung gedauert hat?', quelle: 'Chat', grund: 'Deine Frage von eben' }]);
          self.setState({ conv: c });
        }
      });
    });
    var vorschlaege = ['Was steht heute an?', 'Was haben wir Solaro versprochen?', 'Ab jetzt: Hinweise zu Social Media nur montags.'].map(function (t) {
      return { text: t, los: function () { self.senden(t, null); } };
    });
    var HA = [{ id: 'sommer', zeit: 'seit 25 Tagen', vor: 'Rückblick Sommerfest: ', kern: 'Entwurf liegt', nach: ' seit 25 Tagen.', vorgang: 'Social Media · Rückblick Sommerfest', wer: 'Mehmet', gruende: [{ art: 'belegt', text: 'Letzte Änderung am Entwurf', quelle: 'Datei 05.09.' }, { art: 'einschaetzung', text: 'vermutlich zurückgestellt wegen Pitch-Abend' }] },
      { id: 'jury2', zeit: 'seit 9 Tagen', vor: 'Pitch-Abend: ', kern: 'Jury unvollständig', nach: ' – Frau Weber hat nicht geantwortet.', vorgang: 'Events · Pitch-Abend', wer: 'Julia', gruende: [{ art: 'belegt', text: 'Juryanfrage an Anna Weber', quelle: 'Mail 21.09.' }, { art: 'berechnet', text: 'zugesagte Antwort seit 5 Tagen überfällig' }] }]
      .filter(function (h) { return BF === 'Alle' || h.vorgang.split(' · ')[0] === BF; })
      .map(function (h) { var t = h.vorgang.split(' · '); var gefragt = !!(st.nachgefragt || {})[h.id]; return Object.assign({}, h, { bereich: t[0], eintrag: t[1], href: self.bereichHref(h.vorgang), nachfragenLabel: gefragt ? '✓ ' + h.wer + ' gefragt · Rückgängig' : h.wer + ' fragen', nachfragen: function () { var m = Object.assign({}, self.state.nachgefragt); m[h.id] = !m[h.id]; self.setState({ nachgefragt: m }); } }); });
    var CG = (function () {
        var q = (st.chatSuche || '').trim().toLowerCase(), F = st.chatFilterW || 'Alle';
        var cs = st.chats.filter(function (c) {
          if (F === 'Angepinnt' && !c.angepinnt) return false;
          if (F === 'Mit Bereich' && !c.etikett) return false;
          if (F === 'Ohne Bereich' && c.etikett) return false;
          var inhalt = (st.conv[c.id] || []).map(function (m) { return m.text || ''; }).join(' ');
          return !q || (c.titel + ' ' + (c.etikett || '') + ' ' + inhalt).toLowerCase().indexOf(q) >= 0;
        });
        var gruppe = function (c) { return c.angepinnt ? 'Angepinnt' : c.datum === 'heute' || c.datum === 'gerade' ? 'Heute' : c.datum === 'gestern' ? 'Gestern' : (c.datum >= '28.09.' ? 'Diese Woche' : 'Älter'); };
        return ['Angepinnt', 'Heute', 'Gestern', 'Diese Woche', 'Älter'].map(function (g) {
          return { titel: g, chats: cs.filter(function (c) { return gruppe(c) === g; }).map(function (c) { var n = (st.conv[c.id] || []).length; return { titel: c.titel, datum: c.datum, unter: (c.etikett ? c.etikett + ' · ' : '') + n + ' Nachrichten', los: function () { self.setState({ view: 'chat', chatId: c.id }); }, pinLabel: c.angepinnt ? 'Lösen' : 'Anpinnen', pin: function () { self.setState({ chats: self.state.chats.map(function (x) { return x.id === c.id ? Object.assign({}, x, { angepinnt: !x.angepinnt }) : x; }) }); } }; }) };
        }).filter(function (g) { return g.chats.length; });
      })();
    return {
      navUebersicht: st.view === 'uebersicht' ? 'page' : 'false',
      navChat: st.view === 'chat' ? 'page' : 'false',
      zumChat: function () { self.setState({ view: 'chat', chatId: self.state.chatId || 'c1' }); },
      istUebersicht: st.view === 'uebersicht',
      istChat: st.view === 'chat',
      zurUebersicht: function () { self.setState({ view: 'uebersicht', chatId: null }); },
      chatListe: st.chats.map(function (c) { return Object.assign({}, c, { aktiv: st.view === 'chat' && c.id === st.chatId }); }),
      neuerChat: function () { self.setState({ view: 'chat', chatId: null }); },
      oeffnen: function (id) { self.setState({ view: 'chat', chatId: id }); },
      pin: function (id) { self.setState({ chats: self.state.chats.map(function (c) { return c.id === id ? Object.assign({}, c, { angepinnt: !c.angepinnt }) : c; }) }); },
      loeschen: function (id) {
        var cs = self.state.chats, idx = cs.map(function (c) { return c.id; }).indexOf(id);
        var patch = { chats: cs.filter(function (c) { return c.id !== id; }), geloescht: { chat: cs[idx], idx: idx } };
        if (self.state.chatId === id) { patch.view = 'uebersicht'; patch.chatId = null; }
        self.setState(patch);
        clearTimeout(self.toastT); self.toastT = setTimeout(function () { self.setState({ geloescht: null }); }, 8000);
      },
      zeigeToast: !!st.geloescht,
      toastTitel: st.geloescht ? st.geloescht.chat.titel : '',
      loeschenZurueck: function () {
        var g = self.state.geloescht; if (!g) return;
        var cs = self.state.chats.slice(); cs.splice(g.idx, 0, g.chat);
        self.setState({ chats: cs, geloescht: null });
      },
      teamOffen: !!st.teamOffen, teamOffenAria: st.teamOffen ? 'true' : 'false', teamPfeil: st.teamOffen ? '▾' : '▸',
      teamToggle: function () { self.setState({ teamOffen: !self.state.teamOffen }); },
      haengtAndere: HA, haengtAndereAnzahl: HA.length,
      imTeamAnzahl: self.teamNeuListe().filter(function (t) { return t.offen && (BF === 'Alle' || t.bereich === BF); }).length + HA.length,
      teamNeu: self.teamNeuListe().filter(function (t) { return BF === 'Alle' || t.bereich === BF; }),
      teamNeuAnzahl: self.teamNeuListe().filter(function (t) { return t.offen; }).length,
      scope: st.scope,
      setScope: function (w) { self.setState({ scope: w }); },
      zaehlzeile: gesamt + ' offene Punkte',
      bereichFilter: ['Alle', 'Gründungsteams', 'Events', 'Lehre', 'Social Media'].map(function (b) { return { label: b, an: BF === b ? 'true' : 'false', los: function () { self.setState({ bereichFilter: b }); } }; }),
      startChat: function (t) { self.senden(t, null); },
      chatSenden: function (t) { self.senden(t, self.state.chatId); },
      klaerungen: [
        { frage: 'Ist „Lisa“ aus der Mail vom 28.09. Lisa Meier von Solaro?', grund: 'Neue Absenderadresse (l.meier@gmx.de), aber Signatur „Lisa – Solaro“', quelle: 'Mail 28.09.', antworten: ['Ja', 'Andere Person', 'Neu anlegen'], bestaetigt: function (a) { return a === 'Ja' ? 'Adresse zu Lisa Meier hinzugefügt' : 'Gemerkt: ' + a; } },
        { frage: 'Gehört „Jury-Briefing“ am 04.11. zum Pitch-Abend oder zur Gründungsnacht?', grund: 'Beide Events im November, beide mit Jury', quelle: 'Termin 04.11.', antworten: ['Pitch-Abend', 'Gründungsnacht', 'Keins davon'], bestaetigt: function (a) { return 'Zugeordnet: ' + a; } }
      ],
      abschnitte: abschnitte,
      chatTitel: aktiv ? aktiv.titel : 'Neuer Chat',
      chatPinLabel: aktiv && aktiv.angepinnt ? 'Lösen' : 'Anpinnen',
      chatPin: function () { if (aktiv) self.setState({ chats: self.state.chats.map(function (x) { return x.id === aktiv.id ? Object.assign({}, x, { angepinnt: !x.angepinnt }) : x; }) }); },
      chatLoeschen: function () { if (!aktiv) return; var cs = self.state.chats, idx = cs.indexOf(aktiv); self.setState({ chats: cs.filter(function (x) { return x !== aktiv; }), geloescht: { chat: aktiv, idx: idx }, chatId: null }); },
      chatHatEtikett: !!(aktiv && aktiv.etikett),
      chatEtikett: aktiv ? (aktiv.etikett || '') : '',
      chatEtikettHref: aktiv ? (aktiv.etikettHref || '#') : '#',
      chatLeer: !st.chatId, chatNichtLeer: !!st.chatId,
      chatSuche: st.chatSuche || '', chatSucheTippen: function (e) { self.setState({ chatSuche: e.target.value }); },
      chatFilter: ['Alle', 'Angepinnt', 'Mit Bereich', 'Ohne Bereich'].map(function (f) { return { label: f, an: (st.chatFilterW || 'Alle') === f ? 'true' : 'false', los: function () { self.setState({ chatFilterW: f }); } }; }),
      keineChats: CG.length === 0,
      chatGruppen: CG,
      chatAnzahl: st.chats.length + ' Chats',
      nachrichten: nachrichten,
      chatLaedt: !!st.laedt && st.laedt === st.chatId,
      vorschlaege: vorschlaege,
      zeigeSheet: !!st.sheet,
      sheet: st.sheet || {}, sheetKopf: 'Entwurf · ' + ((st.sheet || {}).kanal || 'Mail') + ' · von deinem Uni-Postfach →', sheetEinzeln: !!st.sheet && !/Verteiler|\(\d+\)/.test(st.sheet.an || ''), sheetSendenText: st.sheet && st.sheet.geplant ? 'Jetzt senden statt ' + st.sheet.geplant.split(',')[0].slice(3) : 'Über mein Postfach senden', sheetHinweis: st.sheet && st.sheet.geplant ? 'Geht am ' + st.sheet.geplant + ' über dein Postfach raus und liegt danach in „Gesendet“.' : 'Geht über dein Postfach und liegt danach ganz normal in „Gesendet“.',
      sheetZu: function () { self.setState({ sheet: null }); },
      sheetSenden: function () {
        var s = self.state.sheet;
        if (s && s.id) { var g = Object.assign({}, self.state.gesendet); g[s.id] = true; self.setState({ sheet: null, gesendet: g }); }
        else if (s && s.msgKey) { var m = Object.assign({}, self.state.msgGesendet); m[s.msgKey] = true; self.setState({ sheet: null, msgGesendet: m }); }
        else self.setState({ sheet: null });
      }
    };
  }
}
