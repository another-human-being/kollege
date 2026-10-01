# UI-Prüfung „Kollege“-Prototyp

Stand 01.10.2026 · drei Prüf-Agenten parallel, nur lesend; Abläufe im Node-Harness nachgespielt. Kein Browser-Rendering (die Canvas-Laufzeit ist lokal nicht verfügbar).

1. **Gesamtprüfung** aller 18 Boards: Fehler, Abläufe, Daten, Wortwahl, Barrierefreiheit, Design-Regeln → 81 Befunde (1 kritisch, 22 mittel, 58 klein)
2. **Mail + Kalender** gegen Outlook, Gmail, Apple Mail, Front / Apple, Google, Outlook Kalender
3. **CRM (Kontakte + Gründungsteams) + Aufgaben** gegen HubSpot, Pipedrive, Attio, Apple Kontakte / Asana, Todoist, To Do, Planner, Trello, Linear, Things

Überschneidungen zwischen den Berichten sind bewusst stehen gelassen (gleicher Fehler, andere Perspektive).

---

## Die dringendsten Punkte

| # | Schwere | Wo | Was |
|---|---|---|---|
| 1 | kritisch | Mail | Enter in „An“ oder „Betreff“ verschickt die Mail sofort (Formular-Submit) |
| 2 | kritisch | Mail | Entwürfe lassen sich nicht bearbeiten oder senden; „Antworten“ erzeugt „Hallo Entwurf,“ |
| 3 | kritisch | Kalender | Monatsraster um einen Tag verschoben (31.08. doppelt, 30.09. auf Donnerstag) |
| 4 | kritisch | Kalender | Termine mit eingeladenen Externen lassen sich ohne „Änderung senden“ verschieben |
| 5 | mittel | alle Seitenfenster | „Kollege fragen“ antwortet fest verdrahtet, auch zum falschen Eintrag (Tom → Antwort über Lisa) |
| 6 | mittel | alle Seitenfenster | Notizen aus dem Chat landen nirgends; Karte verspricht „im Verlauf abgelegt“ und „Aufgabe angelegt“ |
| 7 | mittel | Chat | Gesperrter Entwurf per Tastatur sendbar; „Gesendet“-Karte meldet bei jedem Entwurf „Kontakt vermitteln erledigt“ |
| 8 | mittel | Bereiche | „Übergeben an“ wirkt sofort, ohne Annahme (widerspricht E17) |
| 9 | mittel | Aufgaben ↔ Akte | Zusagen doppelt gepflegt und nicht synchron; Überfälliges in der Akte nicht markiert |
| 10 | mittel | Kontakte | Organisation umbenennen trennt alle Personen ab (Name als Schlüssel); Zusammenführen kann abstürzen |
| 11 | mittel | Heute | Bei Bereichsfilter steht „Alles geprüft.“ obwohl z. B. 31 Events ungeprüft sind; Leertext sagt noch „Vorgänge“ |
| 12 | mittel | Zahlen | 214 ungeprüft ohne die 31 Organisationen; Mail-Zähler 4 (Navigation) vs. 3 (Seite) |

## Top 10 fehlende Funktionen (zusammengeführt aus beiden Abgleichen)

1. **Gemeinsame Datenbasis für Zusagen, Aufgaben und Beratungsakte** – sonst bricht „Record ist Wahrheit“.
2. **Entwürfe öffnen, bearbeiten, senden, automatisch speichern** – Kernablauf „Kollege bereitet vor, Mensch sendet“.
3. **Zuweisen im StartHub-Postfach** (Zuständig, Status, „Julia antwortet gerade“, interne Kommentare) – Hauptrisiko bei drei Personen in einem Postfach; Outlook kann es nicht.
4. **Einladungen: Änderungen bewusst senden, Antwortstatus je Person, eingehende Einladungen beantworten.**
5. **Echte Fälligkeitsdaten mit Datumsauswahl, Erinnerung und Nachfassen bei „an uns“; Nächster Schritt als Aufgabe mit Datum.**
6. **Buchungsseite für Sprechstunden** (wie Bookings / Google-Terminplanung) – Erstanfragen ohne Mail-Pingpong.
7. **Gespräch strukturiert erfassen** (Datum, Art, Teilnehmende, Ergebnis → Zusagen).
8. **Verfügbarkeit des Teams und Raumbuchung beim Planen.**
9. **Wiederkehrende Aufgaben, Unteraufgaben/Checklisten (auch in „Aus Vorjahr“), Vorlagen und Signaturen je Postfach.**
10. **Kalender-Grundstandard:** Ziehen und Größe ändern, Überlappungen nebeneinander, Ende statt Dauer, mehrtägige Termine.

Bewusst beibehalten (Alleinstellung): „Was kam raus?“, Richtung „von uns / an uns“, Bezüge über Bereiche mit KI-Vermutung, Platzhalter für fremde Postfächer, „Kollege fragen“ mit Belegen.

---

## Bericht 1 · Gesamtprüfung (alle Boards)

Ohne Befund: Tags in allen 18 Boards ausgeglichen; alle `href`-Ziele existieren (außer Anker `#verlauf`); alle `x-import`-Props existieren in `bundle.js`; 52+31+14+21+88+5+3 = 214; Wochentage und Abstände stimmen (außer Monatsansicht). Pfade relativ zu `prototyp/quellen/`.

### A. Übergreifend

- **Ü1 · mittel** – `kcCfg()` ist pro Screen fest verdrahtet (Mail.js:9, Kalender.js:6, Kontakte.js:9–10, Aufgaben.js:6, Dateien.js:6, Bereich.js:95). Kalender „Beratung Kitchen Loop“ → Antwort über Karin Vogt; Kontakte Tom → „Lisa hat zuletzt …“; Lehre/Nordlicht → „Stand Solaro“. *Vorschlag:* Antwort/Belege je Eintrag hinterlegen, sonst Wissenslücke.
- **Ü2 · mittel** – Vorschläge „Fass den Verlauf zusammen“ / „Schlag eine Antwort vor“ ohne „?“ werden als Notiz behandelt (Mail.js:8, _shared.js:14,23–28). *Vorschlag:* Vorschläge typisieren.
- **Ü3 · mittel** – Karte verlinkt „Im Verlauf ansehen“ auf `#verlauf` (existiert nirgends); `kcNotizen` wird nie gerendert (_shared.js:28–29). Widerspricht E4. *Vorschlag:* `id="verlauf"` setzen, Notizen in den Verlauf mischen.
- **Ü4 · klein** – Chat im Seitenfenster bleibt beim Wechsel des Eintrags stehen (Tom-Überschrift, Lisa-Gespräch). *Vorschlag:* `kcMsgs` je Eintrag speichern.
- **Ü5 · klein** – Gelöschte/zusammengeführte ungeprüfte Einträge senken den Zähler nicht (_shared.js:113–116).
- **Ü6 · mittel** – `--ink-faint` (~3,5:1) auf lesbarem Text: Navigationsgruppen, „+ Bereich“, Prototyp-Hinweis, Kontaktzeilen ≥ 30 T., Stundenlabels. *Vorschlag:* `--ink-muted`.
- **Ü7 · klein** – `attention` auf Nicht-Überfälligem: Fristen, Jetzt-Linie, „Antwort offen“, offene Einrichtungsschritte (E3).
- **Ü8 · klein** – `kg-aktion--primaer` auf internen Aktionen („Speichern“, „Öffnen in …“, „Passt“, „Verbinden“, „Import starten“, „→“). README: primär nur Senden/Merken.
- **Ü9 · klein** – Knöpfe heißen „bestätigen“ (Mail.html:33, Bereich.html:50,128); README verbietet „Bestätigen“. *Vorschlag:* „Stimmt“ / „Übernehmen“.
- **Ü10 · klein** – Schloss beim ersten Auftreten ohne Wort „privat“; Tooltip „nur für dich“ auch an „Inhalt nur für Julia“.
- **Ü11 · klein** – `Kollege.Quelle` ohne Ziel rendert fokussierbaren Knopf ohne Funktion.
- **Ü12 · klein** – „seit 5 T.“ statt ausgeschrieben („seit 5 Tagen“) in berechneten Aussagen.
- **Ü13 · klein** – Gerahmte Kästen außerhalb Eingabe/Entwurf (Prüf-Banner, Zusammenführen, „Was kam raus?“, „Wie lief’s?“, „Kollege weiß dazu“) – E2 erweitern oder rahmenlos.
- **Ü14 · klein** – `design-system/README.md` und Grenzen in ENTSCHEIDUNGEN veraltet (ChatListe in Seitenleiste, Meins/Team-Umschalter, Chat-Zeitspalte, „/klärung“ mobil, „Neu, niemand zuständig nur in Team-Ansicht“).

### B. Heute und Chat

- **H1 · mittel** – Leertext „Hängt“ sagt „Vorgänge ohne Bewegung …“ (Main.js:163).
- **H2 · mittel** – Mit Bereichsfilter fällt der Prüfen-Punkt weg → „Alles geprüft.“ (Main.js:164–166, 198).
- **H3 · mittel** – Vorschlag „Was steht heute an?“ führt zur Wissenslücke (Main.js:261, 80–81).
- **H4 · mittel** – Jede gesendete Entwurfs-Karte meldet „Kontakt vermitteln erledigt“, auch bei Verteiler-Einladung und interner Frage; „Julia fragen“ hängt bei jedem Klick einen weiteren Entwurf an (Main.js:248).
- **H5 · mittel** – c4: „Versand für 09.10. eingeplant“, aber „Über mein Postfach senden“ sendet sofort.
- **H6 · mittel** – Klärung „Ja“ → Rückgängig: Frage kommt zurück, Entwurf bleibt aktiv (Main.html:178). *Vorschlag:* `Klaerung` um `onRueckgaengig` erweitern.
- **H7 · klein** – Auch „Neu anlegen“ lässt den Entwurf verschwinden.
- **H8 · mittel** – Wartender Entwurf nur per `opacity`/`pointer-events` gesperrt, per Tab + Enter sendbar (Main.html:182, MobilEingabe.html:20). *Vorschlag:* `inert` bzw. `disabled`.
- **H9 · klein** – „Als Notiz ergänzen“ ohne Funktion (Main.html:192).
- **H10 · klein** – Chat-Löschen-Toast ohne Timer, ohne ×, weicht vom gemeinsamen Toast ab.
- **H11 · klein** – „6 offene Punkte“ und Abschnittszahlen ändern sich nach „Erledigt“/„Später“ nicht.
- **H12 · klein** – „Im Team 2“ vs. „Neu, niemand zuständig · 3“ bei Bereichsfilter.
- **H13 · klein** – Status „steht jetzt unter ‚Meins‘“ – „Meins“ gibt es seit E39 nicht mehr.
- **H14 · klein** – „Kurz klären“ zeigt fest 2.
- **H15 · klein** – Blatt „Entwurf ansehen“: fester Kopf „Mail“, Änderungen gehen beim Senden verloren (`defaultValue`), „Ton wie in deinen letzten Mails an diese Person“ auch beim Verteiler.
- **H16 · klein** – Chat c3 „gestern“ zitiert Zusage von heute 14:32.
- **H17 · klein** – „Jury unvollständig“ unter „Hängt“ mit 9 T. (E14: hängt = 21 T.).
- **H18 · klein** – „Bei Tom nachhaken“ heute vs. Aufgabe Mo 05.10.; Save-the-Date fehlt auf Desktop-Heute.
- **H19 · klein** – Etikett „Solaro“ führt mal zu Gründungsteams, mal zu Kontakte.
- **H20 · klein** – Hackathon/Presse auf Heute mit Bereich, in Mail „ohne Bereich“; „belegte“ Zitate weichen vom Mailtext ab.
- **H21 · klein** – Heute und offener Chat ohne Hauptüberschrift.
- **H22 · klein** – Hinweis „Rechnungen tauchen gehäuft auf“, obwohl Anweisung a6 schon existiert.
- **H23 · klein** – „Solarmodule für Balkone“ vs. „Solarspeicher für Balkonkraftwerke“.
- **H24 · klein** – Beratung Kitchen Loop 10:00 auf Heute als anstehend, obwohl vorbei; Mobil 10:00–10:45 vs. Kalender 1 Std.

### C. Mail

- **M1 · mittel** – „Neueste zuerst“ ist nur Array-Reihenfolge (Mail.js:61–62).
- **M2 · klein** – Navigation „/mail 4“ vs. „3 ungelesen“; Navigation-README verbietet Neuigkeitszähler.
- **M3 · mittel** – Entwurf e1 an Anna Weber existiert, obwohl der Chat ihn bis zur Klärung sperrt (E18); nicht bearbeitbar/sendbar; Kontakt-Select ohne „Anna Weber“.
- **M4 · mittel** – „Allen antworten“ setzt Julia in CC, wenn das Original kein CC hat.
- **M5 · klein** – Anrede „Hallo Prof.,“ / „Hallo Redaktion,“ / „Hallo Entwurf,“.
- **M6 · klein** – Geänderte Zuordnung bleibt KI-Vermutung (E32).
- **M7 · klein** – „Verwerfen“ ohne Rückgängig (E24).
- **M8 · klein** – Senden mit leerem „An“ ohne Rückmeldung.
- **M9 · klein** – Karin Vogt: „Gespräch gestern“ (28.09.) vs. Kalender 29.09.

### D. Kalender

- **KA1 · kritisch** – Monatsraster um einen Tag verschoben (`nr = d - 1`, Kalender.js:78–81).
- **KA2 · mittel** – Nordlicht: Mentoring eingeladen vs. „Hängt: kein Folgetermin“.
- **KA3 · klein** – ‹/› im Monat ändern unsichtbar die Woche.
- **KA4 · klein** – Suchtreffer unsichtbar, solange ein Termin offen ist.
- **KA5 · klein** – Absagen → Wiederherstellen setzt „eingeladen“ auf „nicht verschickt“; „Verwerfen“ vs. „abgesagt“; vergangene Termine absagbar.
- **KA6 · klein** – „außerhalb 7–21 Uhr“ zählt in anderen Wochen Termine aus KW 40.
- **KA7 · klein** – Team-Ansicht nennt Mehmet (Outlook), Einstellungen sagen „nicht verbunden“.
- **KA8 · klein** – Seitenfenster eingebaut, aber kein Knopf „Kollege fragen“.
- **KA9 · klein** – Sprechstunde Max Do 15:30 vs. „dienstags 14–16 Uhr“; Max steht weiter unter „Neu, niemand zuständig“.
- **KA10 · klein** – Eingeklappte Leiste als `<nav>` ohne Navigation.

### E. Aufgaben

- **AU1 · mittel** – Board: „an uns“-Karte ziehen → Rückgängig landet in „Offen“ statt „Wartet“ (Aufgaben.js:82).
- **AU2 · mittel** – Save-the-Date: Aufgabe heute (Quelle 24.09.), Anweisung 7 Wochen vorher = 02.10. (datiert 03.09.), Social-Beitrag 09.10.; Quelle „Anweisung 15.09.“ vs. a3 vom 01.09.
- **AU3 · klein** – u3 zitiert einen Satz, der nicht in der Mail steht.
- **AU4 · klein** – Board-Spalten ohne Rolle, werden nicht angesagt.

### F. Kontakte

- **K1 · mittel** – 31 ungeprüfte Organisationen fehlen in der Summe 214.
- **K2 · klein** – gmx-Adresse „bestätigt 30.09.“, Klärung dazu auf Heute noch offen.
- **K3 · klein** – „letzter Kontakt“ widerspricht anderen Screens (Weber, Lisa, Sara, Ben).
- **K4 · klein** – Neuer Kontakt zeigt „Letzter Kontakt · Mail“ im Verlauf; alte Kontakte unter „September 2026“.
- **K5 · klein** – Organisationen zusammenführen nicht ausführbar.
- **K6 · klein** – Kandidaten-Einschätzungen mit `marke={false}` ohne Marke in der Zeile.

### G. Dateien

- **D1 · mittel** – Sammel-Verwerfen lässt Dateien verschwinden, Einzel-Verwerfen nur die Zuordnung.
- **D2 · klein** – Monatskopf im Verlauf falsch (28.08., 20.03. unter „September“).
- **D3 · klein** – Folien Sitzung 3 existieren schon, Zusage „Folien bis 06.10.“ ist noch offen.
- **D4 · klein** – „synchronisiert vor 4 Min.“ vs. „Zuletzt 10:42“.

### H. Bereiche

- **B1 · mittel** – „Übergeben an“ setzt `wer` sofort (E17).
- **B2 · klein** – „So sieht es {{wer}}“ führt immer auf Julias Solaro-Übergabe.
- **B3 · klein** – Überfällige Zusagen nicht markiert.
- **B4 · klein** – „Wie lief’s?“ bleibt nach Rückgängig der Phase stehen.
- **B5 · klein** – „Hackathon 2026“ mit Datum „Jan.“ (gemeint 2027).
- **B6 · klein** – `<label for>` zeigt auf `<span>`.
- **B7 · klein** – Jury-Briefing fest zugeordnet, Heute fragt trotzdem in „Kurz klären“.

### I. Einstellungen

- **E1 · mittel** – „+ Bereich“ öffnet „Quellen“, nicht „Bereiche“.
- **E2 · klein** – Spalte umbenennen speichert je Tastendruck mit Toast.
- **E3 · klein** – Nach Rückgängig beim Löschen zeigt das Detail „Nichts gewählt.“
- **E4 · klein** – Schritt „Bereiche festlegen“ ✓ und gleichzeitig offene Frage; Rückgängig nach „Passt“ wirkungslos; Zähler Liste vs. Detail weichen ab.
- **E5 · klein** – Herkunft von a6 steht unter „Vorrang“.
- **E6 · klein** – Einstellungen ohne × (E34).

### J. Übergabe

- **U1 · klein** – „Status wartet“ statt Phase bzw. berechnetem „= wartet“.
- **U2 · klein** – „2 offene Zusagen“, 3 aufgelistet; alte Benennung „Solaro – EXIST-Antrag“; Fälligkeit „offen“.
- **U3 · klein** – Ereignis „28.09. Rückfrage zum Pitchdeck-Format“ gibt es sonst nirgends; Mail vom 29.09. fehlt.

### K. Mobil und Zustände

- **MO1 · mittel** – Mobil-Heute hat noch den Umschalter Meins/Team (E39).
- **MO2 · klein** – Klärungsantworten mobil anders benannt; „Andere Person“ lässt Entwurf kommentarlos verschwinden.
- **MO3 · klein** – Mobil-Heute weicht inhaltlich vom Desktop ab; „Chats“ öffnet neuen Chat statt Liste.
- **MO4 · klein** – Alte Benennung „Kitchen Loop – Mensa-Kooperation“.
- **Z1 · klein** – „88 Termine“ vs. „760 Termine“.

---

## Bericht 2 · Mail und Kalender im Funktionsabgleich

### Mail – zusätzliche Fehler

- **kritisch** – Enter in „An“/„Betreff“ sendet (Mail.html:68, 71, 73). *Vorschlag:* kein `onSubmit`, bei leerem Text/Betreff nachfragen.
- **kritisch** – Entwurf nicht bearbeitbar/sendbar (s. M3).
- **mittel** – „+ Neue Mail“ bei geschlossenem Detail unsichtbar (`zu` bleibt true).
- **mittel** – Detail zeigt Mail, die nicht in der Liste steht (nach Postfach-/Filterwechsel).
- **mittel** – Thread-Wechsel verwirft Entwurf ohne Rückfrage und ohne Autospeichern.
- **mittel** – Toast „Gesendet … Rückgängig“ suggeriert Senden-rückgängig ohne Verzögerung.
- **mittel** – Kein „Von“ (StartHub-Postfach) und kein BCC bei neuer Mail.
- **mittel** – Im Archiv kein „In Posteingang“, kein Löschen/Papierkorb.
- **klein** – Neue Mail zeigt Solaro-Hinweis ohne Bezug; Antwort ohne Zitat; Weiterleiten nimmt erste statt letzte Nachricht; „+ Anhang“ immer Merkblatt; „⚑“ als Piktogramm (E7); Suche nur in 3 Feldern; „Entwurf mit Kollege“ verliert den Text.

### Mail – Funktionsabgleich

| Funktion | Outlook | Gmail | Apple Mail | Prototyp | Nutzen | Hinweis |
|---|---|---|---|---|---|---|
| Unterhaltungsansicht | ja | ja | ja | teilweise | hoch | ohne Zitat, Weiterleiten unvollständig |
| Ordner / Labels | ja | Labels | ja | teilweise | mittel | 4 feste Ordner, kein Papierkorb |
| Zuordnung zu Bereichen | Kategorien | Labels | Kategorien | ja | hoch | Stärke; Mehrfachzuordnung fehlt |
| Suchoperatoren | ja | ja | teilweise | nein | mittel | |
| Regeln/Filter automatisch | ja | ja | ja | nein | mittel | passt als „Anweisung“ |
| Später erinnern (Snooze) | ja | ja | ja | nein | hoch | |
| Markieren/Anpinnen | ja | Stern | Flag | teilweise | mittel | |
| Senden planen | ja | ja | ja | nein | mittel | passt zu E28 |
| Senden rückgängig | ja | ja | ja | nur Anschein | hoch | |
| Vorlagen | ja | ja | nein | nein | hoch | EXIST-/Sprechstunden-Antworten |
| Signaturen je Postfach | ja | ja | ja | nein | hoch | |
| Anhangvorschau | ja | ja | Quick Look | nein | mittel | |
| Anhang vom Netzlaufwerk | OneDrive | Drive | iCloud | angedeutet | hoch | |
| Zuweisen im geteilten Postfach | nein | nein | nein | nein | hoch | Front-Kernfunktion |
| Interne Kommentare am Thread | nein | nein | nein | teilweise | hoch | Front |
| Kollisionswarnung | nein | nein | nein | nein | hoch | Front |
| Abwesenheitsnotiz | ja | ja | Server | nein | mittel | Exchange liefert |
| Fokussierter Posteingang | ja | ja | Kategorien | teilweise | mittel | |
| Mehrfachauswahl | ja | ja | ja | nein | hoch | |
| Tastaturkürzel | ja | ja | ja | nein | mittel | |
| Entwürfe automatisch speichern | ja | ja | ja | nein | hoch | |
| CC/BCC | ja | ja | ja | nur CC | mittel | |
| Hinweis bei externen Empfängern | MailTips | Workspace | nein | nein | mittel | |
| KI-Zusammenfassung/-Antwort | Copilot | Gemini | Apple Intelligence | ja | hoch | „Kollege fragen“ mit Belegen |

### Kalender – zusätzliche Fehler

- **kritisch** – Termine mit eingeladenen Externen ändern ohne „Änderung senden“ (Kalender.js:104).
- **mittel** – Neu hinzugefügte Externe gelten als „zugesagt“; Antwortstatus nur je Termin statt je Person.
- **mittel** – Überschneidende Termine liegen deckungsgleich übereinander.
- **mittel** – „+ Termin“ legt immer Do 01.10., 10:00 an.
- **mittel** – Termine von Kolleg:innen frei bearbeitbar, Feld „Kalender“ zeigt „Persönlich“.
- **mittel** – Dauer max. 3 Std., kein Ende, keine mehrtägigen Termine; späte Termine ragen aus dem Raster.
- **klein** – Monatsansicht: Oktober-Tage nicht ausgegraut, Uhrzeiten-Umschalter ohne Wirkung; neue Termine fest „Raum 2.14“; Ganztägig ohne Wirkung; Klickflächen nur je volle Stunde; kein Ziehen.

### Kalender – Funktionsabgleich

| Funktion | Apple | Google | Outlook | Prototyp | Nutzen |
|---|---|---|---|---|---|
| Tag/Woche/Monat | ja | ja | ja | ja (Monat nur Sept.) | hoch |
| Jahresansicht | ja | ja | – | nein | niedrig |
| Agenda/Liste | Liste | ja | ja | nein | mittel |
| Arbeitswoche | einstellbar | ja | ja | nein | mittel |
| Kalender ein-/ausblenden | ja | ja | ja | teilweise | hoch |
| Verfügbarkeit Kolleg:innen | Exchange | ja | ja | nein | hoch |
| Raumbuchung | Exchange | Workspace | ja | nein | hoch |
| Einladungen beantworten | ja | ja | ja | nein | hoch |
| Änderungen an Teilnehmende senden | ja | ja | ja | nein | hoch |
| Antwortstatus je Person | ja | ja | ja | teilweise | hoch |
| Serien mit Ausnahmen | ja | ja | ja | teilweise | hoch |
| Erinnerungen | ja | ja | ja | Feld ohne Wirkung | mittel |
| Ganztägig/mehrtägig | ja | ja | ja | teilweise/nein | hoch |
| Ziehen und Größe ändern | ja | ja | ja | nein | hoch |
| Überlappungen nebeneinander | ja | ja | ja | nein | hoch |
| Videokonferenz-Link | FaceTime | Meet | Teams | nein | hoch |
| Buchungsseiten / Terminslots | nein | ja | Bookings | nein | hoch |
| Arbeitszeiten | nein | ja | ja | nein | mittel |
| Feiertage / Vorlesungszeiten | ja | ja | ja | nein | mittel |
| Teilen / Berechtigungen | ja | ja | ja | nein | mittel |
| ICS abonnieren | ja | ja | ja | nein | mittel |
| Mini-Monat | ja | ja | ja | nein | mittel |
| „Was kam raus?“ | nein | nein | nein | ja | hoch |

---

## Bericht 3 · CRM und Aufgaben im Funktionsabgleich

### CRM – Fehler

1. **mittel** – Organisationsname als Schlüssel; Umbenennen trennt Personen und Bezüge ab (Kontakte.js:100,123,156–157). *Vorschlag:* `orgId`.
2. **mittel** – Organisationen zusammenführen nicht ausführbar (Klick links schließt den Dialog).
3. **mittel** – Absturz beim Zusammenführen, wenn der Kandidat keine Adresse hat; Rohdaten statt bearbeiteter Werte; Telefon, Notiz, Listen gehen verloren.
4. **mittel** – „Notiz“ öffnet den Chat statt das Notizfeld; Chat-Notizen landen nirgends.
5. **mittel** – Chat-Antwort ignoriert den geöffneten Datensatz (widerspricht E8).
6. **mittel** – Zuständigkeit auf zwei Wegen änderbar; Übergabe wirkt ohne Annahme (E17).
7. **mittel** – Zusagen in der Akte nie überfällig markiert; weichen von Aufgaben ab („Pitch-Slot bestätigen“ fehlt in Aufgaben).
8. **klein** – Doppelte Themen möglich; × entfernt alle Kopien.
9. **klein** – Übernommene Einträge nicht als Bezug wählbar (Filter prüft rohes `ungeprueft`).
10. **klein** – Gespräch nur mit „heute“ und als „Notiz“ erfassbar.
11. **klein** – Keine Endphase „ruht/abgebrochen“; „Wie lief’s?“ nur bei Events.
12. **klein** – Neu angelegte/angesprungene Einträge in gefilterter Liste unsichtbar.
13. **klein** – Listenfilter bleibt bei Organisationen sichtbar ohne Wirkung.
14. **klein** – Sortierung nach Vorname, ohne `localeCompare`, Umlaute hinter Z; „Zuletzt kontaktiert“ bei Organisationen wirkungslos.
15. **klein** – Filterchips decken nicht alle Rollen/Arten ab.
16. **klein** – Organisation ohne Löschen, Telefon, E-Mail, Verlauf; Dubletten ohne Kennzeichnung unter Personen.
17. **klein** – Personen der Akte sind eine getrennte, nicht bearbeitbare Kopie; neues Team legt keine Organisation an.
18. **klein** – Tabellenansicht: keine Sortierung per Kopf, keine Markierung der aktiven Zeile, keine Spaltenwahl.
19. **klein** – Gründungsteams ohne Sortierung und ohne Filter „Meine Teams“.

### CRM – Funktionsabgleich

| Funktion | Referenz | Prototyp | Nutzen | Hinweis |
|---|---|---|---|---|
| Person/Organisation | alle | ja | hoch | Verknüpfung über Namen |
| Mehrere E-Mail-Adressen | Apple, Outlook, HubSpot, Attio | ja | mittel | Hauptadresse nicht wählbar |
| Eigene Felder | HubSpot, Pipedrive, Attio | nein | mittel | |
| Pipeline-Board | Pipedrive, HubSpot, Attio | teilweise | hoch | Board-Muster aus Aufgaben übertragen |
| Stillstand-Warnung | Pipedrive, HubSpot | ja | hoch | Endphase fehlt |
| Aktivitäts-Zeitstrahl | HubSpot, Attio | ja | hoch | nicht filterbar |
| Mail-/Kalender-Sync mit Zuordnung | HubSpot, Pipedrive, Attio | teilweise | hoch | |
| Aktivität erfassen | Pipedrive, HubSpot | teilweise | hoch | nur Freitext |
| Aufgaben am Datensatz | HubSpot, Pipedrive, Attio | teilweise | hoch | getrennte Daten |
| Nächster Schritt mit Datum | Pipedrive | teilweise | hoch | |
| Dubletten zusammenführen | HubSpot, Attio, Apple | teilweise | mittel | |
| Import/Export | alle | angedeutet | mittel | |
| Listen/Segmente | HubSpot, Attio | ja (statisch) | mittel | |
| Gespeicherte Ansichten, Spaltenwahl | HubSpot, Attio, Pipedrive | teilweise | mittel | |
| Massenbearbeitung | HubSpot, Attio, Pipedrive | teilweise | mittel | |
| Wiedervorlage | Attio, HubSpot, Pipedrive | teilweise | hoch | |
| Berichte/Dashboards | HubSpot, Pipedrive, AcceleratorApp | nein | mittel | Berichtspflicht |
| Rechte/Privatsphäre | Salesforce, HubSpot, Attio | teilweise | hoch | |
| Beziehungen über Bereiche | Attio, Salesforce | ja | hoch | Alleinstellung |
| Dokumente am Datensatz | HubSpot, Salesforce, Pipedrive | teilweise | mittel | |
| Startup-spezifisch (Sprechstunden, Förder-Meilensteine) | AcceleratorApp, Incubator Pro | nein | mittel | |

### Aufgaben – Fehler

1. **mittel** – Board-Rückgängig bei „an uns“-Karten landet in „Offen“ (Aufgaben.js:82).
2. **mittel** – „undefined“ in Liste/Karte nach Richtungswechsel auf „an uns“.
3. **mittel** – Fälligkeit nur aus 11 festen Texten; „ohne Datum“ unter „Später“.
4. **klein** – Innerhalb der Gruppen nicht nach Datum sortiert.
5. **klein** – Neue Aufgabe unter Status „Erledigt“ unsichtbar.
6. **klein** – „Team“ blendet eigene private Aufgaben aus.
7. **klein** – Board ignoriert den Status-Umschalter; „Erledigt“ wächst unbegrenzt.
8. **klein** – Zwei Wege zum Erledigen; Liste zeigt „In Arbeit/Wartet“ nicht; Widerspruch E27 vs. E37.
9. **klein** – Board ohne Rollen, Statuswechsel per Tastatur nur über Detail.
10. **klein** – Chat-Notiz mit Frist meldet eine Aufgabe, die nie angelegt wird.

### Aufgaben – Funktionsabgleich

| Funktion | Referenz | Prototyp | Nutzen |
|---|---|---|---|
| Richtung „von uns / an uns“ | keins nativ | ja | hoch |
| Herkunft/Quelle | Asana, Todoist | ja | hoch |
| Unteraufgaben/Checklisten | Asana, Todoist, Things, To Do, Planner | nein | hoch |
| Wiederkehrende Aufgaben | Todoist, Things, To Do, Asana | nein | hoch |
| Prioritäten | Todoist, Asana, Linear | nein | niedrig |
| Erinnerungen | Todoist, To Do, Things, Asana | nein | hoch |
| Schnelleingabe mit Datumserkennung | Todoist, Things, Asana | nein | hoch |
| Liste/Board/Kalender/Zeitleiste | Asana, Planner, Trello | teilweise | mittel |
| Beobachtende | Asana, Planner, Linear | teilweise | mittel |
| Kommentare/Änderungsverlauf | Asana, Trello, Linear | nein | mittel |
| Anhänge | Asana, Trello, Planner | nein | mittel |
| Heute/Mein Tag | To Do, Things, Todoist | teilweise | hoch |
| Massenaktionen | Asana, Todoist, Linear | teilweise | mittel |
| Tastaturkürzel | Linear, Todoist, Things | nein | mittel |
| Vorlagen | Asana, Trello, Planner | teilweise | mittel |
| Suche | alle | nein | mittel |
| Gruppieren nach Wahl | Asana, Todoist, Planner | teilweise | mittel |
| Privat/Team | To Do, Asana | ja | hoch |
