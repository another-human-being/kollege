# UI-Prüfung: Mockup-Fehler, Design-Fehler, fehlende Funktionen

Stand 01.10.2026 · Grundlage: `docs/UI-PRUEFUNG.md` (drei Prüfberichte). IDs verweisen auf diesen Bericht; Doppelfunde aus mehreren Berichten sind zusammengelegt.

## Kriterium

| Klasse | Frage | Folge |
|---|---|---|
| **Design-Fehler** | Wäre es auch falsch, wenn jemand die App **genau so** baut, wie der Prototyp sie zeigt? (Ablauf, Regel, Datenmodell, Text, Baustein, Barrierefreiheit) | Muss im Entwurf geändert werden, bevor gebaut wird |
| **Mockup-Fehler** | Entsteht es nur, weil der Prototyp Verhalten vortäuscht (geskriptete Antworten, feste Zahlen, Beispieldaten, vereinfachte Logik)? Eine echte Umsetzung des gemeinten Designs hätte ihn nicht. | Für die echte App egal; im Prototyp beheben, wenn er für Nutzertests taugen soll |
| **Fehlende Funktion** | Gibt es dafür im Entwurf noch gar nichts? | Separate Liste, priorisieren |

Wo ein Mockup-Fehler eine **offene Designfrage** sichtbar macht, steht das in der letzten Spalte (◇). Diese Fragen müssen beim Bauen beantwortet werden, auch wenn der Fehler selbst ein Mockup-Artefakt ist.

**Bilanz** (Zeilen, verwandte Befunde teils zusammengefasst): 59 Design-Fehler, davon 3 kritisch · 63 Mockup-Fehler, davon 1 kritisch und 4 mit offener Designfrage (31 Logik, 11 vorgetäuschtes Verhalten, 21 widersprüchliche Beispieldaten) · 45 fehlende Funktionen, davon 22 mit hohem Nutzen.

---

## 1 · Design-Fehler

> **Stand 01.10.2026: umgesetzt.** Alle Zeilen dieses Abschnitts sind im Prototyp und im Design System behoben; die Regeln dahinter stehen in `ENTSCHEIDUNGEN.md` als E42–E50. MO3b ist nur zur Hälfte erledigt: Mobil heißt der Link jetzt ehrlich „+ Neuer Chat“, eine mobile Chatliste fehlt noch (→ Abschnitt 3). Nebenbei behoben, obwohl als Mockup-Fehler geführt: KA1 (Monat um einen Tag verschoben), KA3, KA5a, KA6, Kal-X4, Kal-X7b, B3, H4.

### 1a · Versand und Entwürfe (Grenze nach außen)

| ID | Schwere | Fehler | Was im Entwurf zu ändern ist |
|---|---|---|---|
| Mail-X1 | **kritisch** | Enter in „An“ oder „Betreff“ sendet die Mail | Senden nur über den Knopf; leerer Text/Betreff → Rückfrage |
| M3a | **kritisch** | Von Kollege vorbereitete Entwürfe lassen sich nicht öffnen, bearbeiten, senden – nur „Antworten“ | Eigener Zustand „Entwurf“: öffnet im Schreibfeld mit Bearbeiten · Senden · Verwerfen |
| Kal-X1 | **kritisch** | Termin mit eingeladenen Externen lässt sich verschieben, ohne dass die Änderung verschickt wird | Status „Änderung nicht verschickt“ + Knopf „Änderung senden“ (analog E28) |
| H5 | mittel | Chat-Entwurf „für 09.10. eingeplant“ wird mit „Senden“ sofort verschickt | Baustein `Entwurf` braucht Zustand „geplant“ mit „Jetzt senden statt 09.10.“ |
| H6, H7 | mittel | Klärung zurücknehmen lässt den abhängigen Entwurf aktiv; „Neu anlegen“ lässt ihn verschwinden | `Klaerung` braucht Rückgängig-Wirkung auf abhängige Entwürfe; Ablauf „Neu anlegen“ festlegen |
| H8 | mittel | Gesperrter Entwurf ist per Tastatur sendbar | Gesperrt heißt `inert`/`disabled`, nicht nur blass |
| Mail-X5 | mittel | „Gesendet · Rückgängig“ wirkt wie Senden-rückgängig, ist es aber nicht | Entscheiden: echte Versandverzögerung (z. B. 10 s) oder kein Rückgängig nach Senden |
| Mail-X4, M7 | mittel | Schreibfeld geht beim Thread-Wechsel oder „Verwerfen“ ohne Rückfrage verloren | Automatisch als Entwurf speichern; Verwerfen mit Rückgängig |
| Mail-X7c | klein | „Entwurf mit Kollege“ springt in den Chat, Text geht verloren | Übergabe des angefangenen Texts an den Chat festlegen |
| M8 | klein | Senden ohne Empfänger: keine Rückmeldung | Fehlermeldung am Feld |
| H15a | klein | Blatt „Entwurf ansehen“: Kopf immer „Mail“, Hinweis „Ton wie in deinen letzten Mails an diese Person“ auch beim Verteiler | Kopf aus Kanal; Tonhinweis nur bei Einzelempfängern |

### 1b · Übergabe, Zuständigkeit, Rechte

| ID | Schwere | Fehler | Änderung |
|---|---|---|---|
| B1 / CRM6 | mittel | „Übergeben an“ wirkt sofort; „betreut von“ ist zusätzlich frei wählbar | Zustand „Übergabe an Julia – wartet auf Annahme“; Zuständigkeit nur über Übergabe (E17) |
| Kal-X5 | mittel | Termine von Kolleg:innen frei bearbeitbar, Feld „Kalender“ zeigt „Persönlich“ | Besitzer:in anzeigen; Bearbeiten nach Freigaberecht |
| A6 | klein | „Team“ blendet die eigenen privaten Aufgaben aus | Eigene Privates mit Schloss zeigen, nur fremdes Privates ausblenden |

### 1c · Datenmodell

| ID | Schwere | Fehler | Änderung |
|---|---|---|---|
| CRM7 / B3-Ursache | mittel | Zusagen in Akte und Aufgaben sind zwei Datenbestände | Zusagen = Aufgaben; die Akte zeigt sie gefiltert, Status berechnet |
| CRM1 | mittel | Organisation über den Namen verknüpft; Umbenennen trennt Personen ab | Verknüpfung über IDs |
| CRM17 | klein | Personen der Akte sind eine Kopie; neues Team legt keine Organisation an | Akte zeigt die Personen der verknüpften Organisation; „Neues Team“ legt sie mit an |
| Kal-X2 | mittel | Antwortstatus gilt für den ganzen Termin; neu hinzugefügte Externe gelten als „zugesagt“ | Status je Teilnehmer:in; neue Personen „nicht eingeladen“ |
| A3 | mittel | Fälligkeit nur aus festen Texten; „ohne Datum“ unter „Später“ | Echte Datumswerte, Gruppe „Ohne Datum“ |
| Kal-X6 | mittel | Dauer max. 3 Std., kein Ende, keine mehrtägigen Termine | Beginn/Ende mit Datum statt Dauer |
| CRM3b | klein | Zusammenführen: was passiert bei widersprüchlichen Feldern? | Feldweise Auswahl bei Konflikten |
| K1 | mittel | 214 ungeprüft enthält die 31 Organisationen nicht | Zählregel festlegen (Organisationen eigene Zeile oder in „Kontakte“) |

### 1d · Abläufe und Zustände

| ID | Schwere | Fehler | Änderung |
|---|---|---|---|
| H2 | mittel | Mit Bereichsfilter verschwindet der Prüfen-Punkt → „Alles geprüft.“ | Prüfen-Punkt je Bereich mit dessen Zahl |
| D1 | mittel | „Verwerfen“ bei Dateien: einzeln nur Zuordnung weg, gesammelt Datei weg | Verwerfen heißt bei Dateien immer „Zuordnung verwerfen“ |
| CRM2 / K5 | mittel | Organisationen zusammenführen: Ablauf nicht zu Ende gedacht | Kandidatenliste + Vorschau wie bei Personen |
| A8 | mittel | Zwei Wege zum Erledigen; „In Arbeit/Wartet“ in der Liste unsichtbar; Widerspruch E27 (wartet berechnet) ↔ E37 (wartet ziehbar) | Entscheiden: „wartet“ = Richtung „an uns“ (berechnet) oder Status; Status in der Listenzeile zeigen |
| A7 | klein | Board ignoriert Umschalter Offen/Erledigt; „Erledigt“ wächst unbegrenzt | Umschalter im Board ausblenden; Erledigt auf 14 Tage begrenzen |
| A5 / CRM12 | klein | Neu Angelegtes ist unter aktivem Filter unsichtbar | Filter lösen oder Hinweis „1 ausgeblendet“ |
| CRM11 | klein | Gründungsteams ohne Endphase („ruht/abgebrochen“); „Wie lief’s?“ nur bei Events | Endphase ergänzen; Frage auch bei Teams |
| CRM10 | klein | Gespräch nur als Freitext „heute · Notiz“ | Datum, Art, Teilnehmende wählbar |
| CRM4a | klein | Knopf „Notiz“ öffnet den Chat statt des Notizfelds | Knopf führt ins Notizfeld |
| Mail-X3 | klein | Detail zeigt eine Mail, die durch Filter/Postfach nicht mehr in der Liste steht | Auswahl folgt dem Filter |
| Mail-X8 | mittel | Archiv ohne „Zurück in den Posteingang“ | Knopf je Ordner beschriften |
| KA4 | klein | Suchtreffer im Kalender nur in der Übersicht, unsichtbar bei offenem Termin | Treffer immer sichtbar (über dem Raster) |
| KA5b | klein | Entwurf heißt „Verwerfen“, Ergebnis „abgesagt“; vergangene Termine absagbar | Wortwahl angleichen; Absagen nur für zukünftige |
| Kal-X3 | mittel | Überschneidende Termine liegen übereinander | Nebeneinander darstellen |
| Kal-X7 | klein | Neue Termine fest „Raum 2.14“; Klick nur je volle Stunde; Uhrzeiten-Umschalter auch im Monat | Ort leer lassen; Halbstunden-Raster; Umschalter nur in Tag/Woche |
| KA8 | klein | Kalender hat als einziges Werkzeug kein „Kollege fragen“ | Knopf ergänzen |
| E4a | klein | Einrichtung: Schritt „Bereiche“ ✓ und zugleich offene Frage | Frage nur, solange der Schritt offen ist |
| E6 | klein | Einstellungen ohne × (E34) | × ergänzen |
| CRM13, CRM15, CRM16 | klein | Listenfilter bei Organisationen sichtbar ohne Wirkung; Chips decken nicht alle Rollen ab; Organisation ohne Löschen/Telefon/Verlauf | Filter je Ansicht; Rollen vollständig; Organisationsdatensatz angleichen |
| CRM18a | klein | Kontakte-Tabelle: Kopf nicht sortierbar, aktive Zeile nicht markiert | Sortieren per Klick, Markierung |
| H17 | klein | „Hängt bei anderen“ enthält Überfälliges (9 T.), „hängt“ heißt aber 21 T. (E14) | Abschnitt „Hängt oder überfällig bei anderen“ oder zweite Zeile |

### 1e · Design-Regeln, Text, Bausteine

| ID | Schwere | Fehler | Änderung |
|---|---|---|---|
| Ü6 | mittel | `ink-faint` auf lesbarem Text (Kontrast ~3,5:1) | `ink-muted` |
| Ü7 | klein | `attention` auf Nicht-Überfälligem (Fristen, Jetzt-Linie, „Antwort offen“) | `ink`/`accent` |
| Ü8 | klein | `primaer` auf internen Aktionen | `sekundaer`; primär nur Senden/Merken |
| Ü13 | klein | Gerahmte Kästen außerhalb Eingabe/Entwurf | E2 erweitern oder Linie oben statt Rahmen |
| Ü9 | klein | Knöpfe „bestätigen“ (README verbietet es) | „Stimmt“ / „Übernehmen“ |
| Ü12 | klein | Abkürzungen „T.“ in Aussagen | „seit 5 Tagen“ |
| Ü10 | klein | Schloss ohne Wort beim ersten Auftreten; Tooltip „nur für dich“ auch bei „nur für Julia“ | Baustein `Privat` um fremde Besitzer:in erweitern |
| Ü11 | klein | `Quelle` ohne Ziel ist ein fokussierbarer, funktionsloser Knopf | Baustein: ohne Ziel als Text rendern; im Design: jede Quelle hat ein Ziel |
| M2 | klein | Ungelesen-Zähler in der Navigation widerspricht der Navigationsregel (keine Neuigkeitszähler) | Entscheiden; Empfehlung: Zahl entfernen |
| Mail-X7d | klein | „⚑“ als Piktogramm (E7/E36) | Wort „markiert“ |
| H1, H13, U1, MO4 | klein | Alte Begriffe: „Vorgänge“, „Meins“, „Status wartet“, „Kitchen Loop – Mensa-Kooperation“ | Begriffe nach E29/E39 |
| K6, E5 | klein | Einschätzung ohne KI-Marke; Herkunft unter „Vorrang“ | Marke setzen; eigenes Feld „Herkunft“ |
| H21, KA10, AU4/A9, B6 | klein | Barrierefreiheit: fehlende Hauptüberschriften, `<nav>` ohne Navigation, Board-Spalten ohne Rolle, `label` auf `span` | Überschriften, Rollen, Tastaturweg „Verschieben nach …“ |

### 1f · Mobil

| ID | Schwere | Fehler | Änderung |
|---|---|---|---|
| MO1 | mittel | Mobil-Heute hat noch den Umschalter Meins/Team | Variante B übernehmen |
| MO2, MO3b | klein | Andere Klärungsantworten; Entwurf verschwindet kommentarlos; „Chats“ öffnet neuen Chat statt Liste | An Desktop angleichen; mobile Chatliste |

### 1g · Dokumentation

| ID | Fehler |
|---|---|
| Ü14 | `design-system/README.md` und Grenzen in ENTSCHEIDUNGEN beschreiben noch ChatListe in der Seitenleiste, Meins/Team, Chat-Zeitspalte, „/klärung“ mobil |

---

## 2 · Mockup-Fehler

Für die echte App ohne Bedeutung. Im Prototyp beheben, wenn er in Nutzertests eingesetzt wird – vor allem die fett markierten, weil sie Testpersonen in die Irre führen.

### 2a · Vorgetäuschtes Verhalten (geskriptet, Stub)

| ID | Fehler | ◇ offene Designfrage |
|---|---|---|
| **Ü1 / CRM5** | „Kollege fragen“ antwortet fest verdrahtet, oft zum falschen Eintrag | – |
| **Ü3 / CRM4b / A10** | Chat-Notizen landen nirgends; „Im Verlauf ansehen“ ist ein toter Link; „Aufgabe angelegt“ ohne Aufgabe | – |
| Ü2 | Vorschläge ohne „?“ werden als Notiz behandelt | ◇ Wie unterscheidet Kollege Notiz, Frage und Auftrag – und fragt er nach, wenn unklar? |
| Ü4 | Seitenfenster behält den Chat beim Wechsel des Eintrags | ◇ Gehört ein Kontext-Chat zum Eintrag (wiederauffindbar) oder ist er flüchtig? |
| H3 | „Was steht heute an?“ → Wissenslücke | – |
| **H4** | Jede „Gesendet“-Karte meldet „Kontakt vermitteln erledigt“; „Julia fragen“ hängt Entwürfe an | – |
| H9 | „Als Notiz ergänzen“ ohne Funktion | – |
| M5 | Anrede aus erstem Wort des Absenders („Hallo Prof.,“) | ◇ Anrede und Sie/du je Kontakt hinterlegen (Anweisung a5)? |
| M4 | „Allen antworten“ setzt Julia in CC | – |
| Mail-X7a | Neue Mail zeigt Solaro-Hinweis; Antwort ohne Zitat; Weiterleiten der ersten statt letzten Nachricht; „+ Anhang“ immer Merkblatt; Suche nur in 3 Feldern | – |
| E1 | „+ Bereich“ öffnet den falschen Reiter (Canvas kann nicht tief verlinken) | – |

### 2b · Logikfehler im Prototyp

| ID | Fehler | ◇ |
|---|---|---|
| **KA1** (kritisch) | Monatsraster um einen Tag verschoben | – |
| KA3 | ‹/› im Monat ändert unsichtbar die Woche | – |
| KA5a | Wiederherstellen nach Absage setzt „eingeladen“ zurück auf „nicht verschickt“ | – |
| KA6 | „außerhalb 7–21 Uhr“ zählt Termine anderer Wochen | – |
| Kal-X4 | „+ Termin“ immer Do 01.10., 10:00 | – |
| Kal-X7b | Oktober-Tage im Monat nicht ausgegraut; Ganztägig ohne Wirkung | – |
| M1 | Sortierung ist nur Datenreihenfolge | – |
| M6 | Geänderte Zuordnung bleibt KI-Vermutung (E32 sagt anders) | – |
| M3b | Kontakt-Auswahl kennt „Anna Weber“ nicht | – |
| Mail-X2 | „+ Neue Mail“ bei geschlossenem Detail unsichtbar | – |
| AU1 / A1 | Board-Rückgängig bei „an uns“-Karten landet in „Offen“ | – |
| A2 | „undefined“ nach Richtungswechsel | – |
| A4 | Innerhalb der Gruppen nicht nach Datum sortiert | – |
| CRM3a | Absturz beim Zusammenführen ohne Adresse; Rohdaten statt bearbeiteter Werte | – |
| CRM8 | Doppelte Themen; × entfernt alle | – |
| CRM9 | Übernommene Einträge nicht als Bezug wählbar | – |
| CRM14 | Sortierung nach Vorname, Umlaute hinter Z | ◇ Nach Nach- oder Vorname sortieren? |
| B3 | Überfällige Zusagen fest als „offen“ (Ursache: Datenmodell, s. CRM7) | – |
| B2 | „So sieht es …“ führt immer zu Julias Solaro-Übergabe | – |
| B4 | „Wie lief’s?“ bleibt nach Rückgängig stehen | – |
| Ü5 | Ungeprüft-Zähler sinkt nicht bei Löschen/Zusammenführen | – |
| H10 | Chat-Löschen nutzt eigenen Toast ohne Timer | – |
| H11, H12, H14 | Zähler auf Heute ändern sich nicht bzw. widersprechen sich unter Filter | – |
| H15b | Änderungen im Blatt „Entwurf ansehen“ gehen beim Senden verloren | – |
| E2 | Spalte umbenennen speichert je Tastendruck | – |
| E3 | Nach Rückgängig beim Löschen ist das Detail leer | – |
| E4b | Rückgängig nach „Passt“ wirkungslos; Zähler Liste/Detail weichen ab | – |
| D2 | Monatskopf im Datei-Verlauf falsch | – |
| B5 | Vorlage „Hackathon 2026“ statt 2027 | – |
| K4 | Neuer Kontakt zeigt erfundenen „letzten Kontakt“ | – |

### 2c · Widersprüchliche Beispieldaten

Alle sichtbar nur beim Wechsel zwischen Screens. Für Nutzertests trotzdem angleichen, weil Testpersonen sie für Systemfehler halten.

| ID | Widerspruch |
|---|---|
| KA2 | Nordlicht: Mentoring eingeladen ↔ „hängt, kein Folgetermin“ |
| AU2 | Save-the-Date: Aufgabe heute ↔ Anweisung „7 Wochen“ (= 02.10.) ↔ Beitrag 09.10.; Quellen-Datum der Anweisungen |
| KA9 | Sprechstunde Max Do 15:30 ↔ „dienstags 14–16 Uhr“; Max weiter „niemand zuständig“ |
| M9 | Karin Vogt „Gespräch gestern“ (28.09.) ↔ Kalender 29.09. |
| K2 | gmx-Adresse „bestätigt“ ↔ Klärung dazu offen |
| K3 | „letzter Kontakt“ bei Weber, Lisa, Sara, Ben passt nicht zu Kalender/Mail |
| H16 | Chat „gestern“ zitiert Zusage von heute |
| H18 | „Bei Tom nachhaken“ heute ↔ Aufgabe Mo 05.10.; Save-the-Date fehlt auf Desktop-Heute |
| H19 | Etikett „Solaro“ führt mal zur Akte, mal zu Kontakten |
| H20 | Hackathon/Presse mit Bereich auf Heute ↔ „ohne Bereich“ in Mail; Zitate weichen vom Mailtext ab |
| H22 | Hinweis „Rechnungen gehäuft“, obwohl Anweisung a6 existiert |
| H23 | „Solarmodule für Balkone“ ↔ „Solarspeicher für Balkonkraftwerke“ |
| H24 | Beratung Kitchen Loop 10:00 als anstehend, obwohl vorbei; 45 Min. ↔ 1 Std. |
| B7 | Jury-Briefing fest zugeordnet ↔ „Kurz klären“ fragt danach |
| KA7 | Mehmets Kalender in Team-Ansicht ↔ „nicht verbunden“ |
| D3 | Folien Sitzung 3 vorhanden ↔ Zusage „bis 06.10.“ offen |
| D4 | „synchronisiert vor 4 Min.“ ↔ „zuletzt 10:42“ |
| AU3 | Zitat in u3 steht nicht in der Mail |
| U2, U3 | Übergabe: „2 Zusagen“ bei 3; alte Benennung; Ereignis, das es sonst nicht gibt |
| MO3a | Mobil-Heute zeigt anderen Inhalt als Desktop |
| Z1 | „88 Termine“ ↔ „760 Termine“ |

---

## 3 · Fehlende Funktionen

Nutzen für ein 3-Personen-Gründungszentrum: **hoch** · mittel · niedrig. Referenz = wer es hat.

### Übergreifend

| # | Funktion | Nutzen | Referenz |
|---|---|---|---|
| F1 | Kontext-Chats je Eintrag speichern und im Verlauf wiederfinden | **hoch** | – (folgt aus E4) |
| F2 | Mehrfachauswahl und Massenaktionen in allen Listen (nicht nur „ungeprüft“) | mittel | alle |
| F3 | Tastaturkürzel (neu, erledigt, archivieren, Navigation) | mittel | Linear, Gmail, Todoist |
| F4 | Einfache Auswertung: Beratungen pro Monat, Teams je Phase, Gründungen pro Jahr | mittel | HubSpot, Pipedrive, AcceleratorApp |

### Mail

| # | Funktion | Nutzen | Referenz |
|---|---|---|---|
| F5 | Zuweisen im StartHub-Postfach: Zuständig, Status, interne Kommentare, „Julia antwortet gerade“ | **hoch** | Front |
| F6 | Absender wählen (eigenes Postfach / starthub@) und BCC | **hoch** | alle |
| F7 | Vorlagen/Textbausteine (EXIST, Sprechstunde) | **hoch** | Outlook, Gmail |
| F8 | Signaturen je Postfach | **hoch** | alle |
| F9 | Später erinnern (Snooze) | **hoch** | alle |
| F10 | Senden planen | mittel | alle |
| F11 | Anhang vom Netzlaufwerk wählen, Anhangvorschau | **hoch** | OneDrive/Drive-Anbindung |
| F12 | Regeln/Filter automatisch (als Anweisung, z. B. „Presse → Mehmet“) | mittel | alle |
| F13 | Suchoperatoren (von:, hat:Anhang, Zeitraum) | mittel | Outlook, Gmail |
| F14 | Hinweis bei externen Empfängern / „Allen antworten“ | mittel | Outlook MailTips |
| F15 | Papierkorb, Löschen, eigene Ordner | mittel | alle |
| F16 | Abwesenheitsnotiz anzeigen/setzen | mittel | Exchange |
| F17 | Mehrfachzuordnung einer Mail zu mehreren Bereichs-Einträgen | mittel | Labels |

### Kalender

| # | Funktion | Nutzen | Referenz |
|---|---|---|---|
| F18 | Eingehende Einladungen beantworten (zu/ab/vielleicht, neue Zeit vorschlagen) | **hoch** | alle |
| F19 | Verfügbarkeit des Teams beim Planen (Terminplanungs-Assistent) | **hoch** | Outlook, Google |
| F20 | Raumbuchung | **hoch** | Outlook, Google Workspace |
| F21 | Buchungsseite für Sprechstunden | **hoch** | Bookings, Google-Terminplanung |
| F22 | Termine ziehen und Dauer ziehen | **hoch** | alle |
| F23 | Serien mit Ausnahmen („nur dieser / alle folgenden“) | **hoch** | alle |
| F24 | Videokonferenz-Link automatisch | **hoch** | Teams, Meet |
| F25 | Kalender einzeln ein-/ausblenden (Personen, Team, Lehre, Feiertage) | **hoch** | alle |
| F26 | Agenda-/Listenansicht (auch mobil) | mittel | alle |
| F27 | Arbeitszeiten, Arbeitswoche | mittel | Google, Outlook |
| F28 | Feiertage und Vorlesungszeiten (ICS abonnieren) | mittel | alle |
| F29 | Mini-Monat zum Springen | mittel | alle |
| F30 | Kalender teilen / Berechtigungen | mittel | alle |
| F31 | Jahresansicht, Zeitzonen, Drucken | niedrig | Apple, Google |

### CRM (Kontakte + Gründungsteams)

| # | Funktion | Nutzen | Referenz |
|---|---|---|---|
| F32 | Nächster Schritt als Aufgabe mit Datum und Zuständigkeit, Wiedervorlage | **hoch** | Pipedrive, HubSpot |
| F33 | Phasen als Board mit Ziehen (Pipeline) + Filter „Meine Teams“, Sortierung nach letztem Kontakt | **hoch** | Pipedrive, HubSpot, Attio |
| F34 | Mail-/Kalender-Aktivität automatisch in der Akte protokollieren | **hoch** | HubSpot, Attio |
| F35 | Dateien-Abschnitt in der Akte (Pitchdeck, Finanzplan) | mittel | HubSpot, Pipedrive |
| F36 | Eigene Felder (Fachbereich, Förderprogramm, Gründungsdatum) | mittel | HubSpot, Attio |
| F37 | Gespeicherte Ansichten, Spaltenwahl, dynamische Segmente | mittel | HubSpot, Attio |
| F38 | Echter Import/Export (CSV, vCard) mit Spaltenzuordnung | mittel | alle |
| F39 | Förder-Meilensteine (z. B. EXIST-Einreichung 30.10.) | mittel | AcceleratorApp |

### Aufgaben

| # | Funktion | Nutzen | Referenz |
|---|---|---|---|
| F40 | Erinnerungen, auch „nachfassen, wenn bis X nichts kam“ bei „an uns“ | **hoch** | Todoist, To Do, Things |
| F41 | Wiederkehrende Aufgaben | **hoch** | Todoist, Things, To Do, Asana |
| F42 | Unteraufgaben/Checklisten (auch in „Aus Vorjahr“) | **hoch** | Asana, Todoist, Things |
| F43 | Schnelleingabe mit Erkennung („bis Fr“, „@Julia“, „#Solaro“) | **hoch** | Todoist, Things |
| F44 | Suche, Gruppieren nach Bereich/Person, Kalenderansicht | mittel | Asana, Planner |
| F45 | Kommentare, Änderungsverlauf, Anhänge an Aufgaben | mittel | Asana, Trello, Linear |
