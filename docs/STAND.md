# Stand

> Wird am Ende jeder Stufe aktualisiert. Kurz halten.

## Stufen

- [x] 1 Kern: Schema, RLS, Aktionsschicht + Rückgängig, Seed, Fixture-Import
- [x] 2 Oberfläche: Heute, Bereiche, Aufgaben, Kontakte, Einstellungen
- [x] 3 Eingabe & Chat
- [x] 4 Mail-Eingang (Abnahme gegen lokalen IMAP-Server; am echten Uni-Postfach noch offen)
- [x] 5 Mail-Client (Abnahme gegen lokale IMAP- und SMTP-Server; am echten Postfach offen)
- [x] 6 Kalender (Abnahme gegen lokalen CalDAV-Server; an iCloud und Uni-Webmail offen)
- [x] 7 Laufwerk (Abnahme gegen einen lokalen Ordner; am eingehängten Uni-Laufwerk offen)
- [x] 8 Hinweise & Rat (Rat mit Ersatzmodell geprüft; mit Mistral am echten Datenbestand offen)

**Aktuell:** Alle acht Stufen gebaut (03.10.2026), Design 05.10. übernommen, Antworten vom 09.10. gebaut (Events schließen sich, Mitteilungen, Rat auf den Seiten). Nächster Schritt: Test mit echten Konten (siehe Offene Fragen). Offen sind die Tests an den echten Quellen: Postfach (Stufe 4 und 5), Kalender (Stufe 6), Laufwerk (Stufe 7), dazu der Rat (Stufe 8) mit Mistral. Danach: Betrieb (VM, Anmeldung per Magic-Link) und die offenen Fragen unten.

## Stufe 1 – erledigt

- Docker Compose (postgres 16, app, worker; ein Image). `app` ist nur ein Gerüst mit Statusseite.
- Schema §4 komplett (Drizzle, `lib/db/schema.ts`), RLS, Funktionen und Trigger handgeschrieben (`lib/db/migrations/0001_rls.sql`).
- Die App arbeitet über `withUser()`: `SET LOCAL ROLE kollege_app` + `app.user_id`. Der Worker arbeitet über `withSystem()` als Tabelleneigentümer.
- Aktionsschicht `lib/actions/`: Registry, `runAction`, `undoAction` (Kinder zuerst, jüngste zuerst). `model` kann keine externe Aktion ausführen; das ist im Code erzwungen. Gebaut sind nur die Aktionen, die Stufe 1 braucht: `area.create`, `org.create`, `person.create`, `person.add_email`, `matter.create`, `entry.link`, `task.create`, `hint.create`, `hint.dismiss`.
- Seed aus `fixtures/config.json` (`npm run db:seed`): 3 Teammitglieder, 4 Bereiche, 8 Fixture-Quellen.
- Eingangsweg `lib/pipeline/`: Rohspeicherung (Blob + `entries`, Upsert über `dedupe_key`), Filter, feste Zuordnung, Kandidaten, Modell `fast` (Stufe 1: Orakel, `MODEL_FAST=oracle`), Schranke, Anhänge, Import mit `review_batch`. Der Worker führt die pg-boss-Jobs `import`, `sync` und `process` aus.
- Tests (63, `npm test`, brauchen ein lokales Postgres 16, siehe README): alle Abnahmen aus §13, alle `rls_checks` und alle `assert`-Einträge aus `expected.json`, die zu Stufe 1 gehören. Ein Test schlägt fehl, wenn `expected.json` einen Prüfschlüssel bekommt, der weder geprüft noch ausdrücklich zurückgestellt ist. `tsc --noEmit` ist sauber.

## Stufe 2 – erledigt

- Oberfläche nach dem Design-Export vom 01.10. (`design/`):
  - Rahmen und Navigation (E40).
  - Heute nach E39: Kurz klären, Heute, Wartet auf uns, Wir warten auf, Hängt, Prüfen, „Im Team“, Bereichsfilter, „Übergabe an dich“.
  - Bereiche als Liste und Detail mit Filtern und Prüfmodus (gesammelt, mit Grund); Beratungsakte für Gründungsteams mit Personen, Gesprächen, Zusagen und Themen.
  - Aufgaben als Liste und Board (E44), Kontakte, Einstellungen (Quellen, Bereiche, Anweisungen).
- Bearbeiten ohne Speichern-Knopf, „Gespeichert · Rückgängig“ (E24). Jede Änderung ist eine Aktion des angemeldeten Nutzers (`app/actions.ts` → `runAction`).
- Bausteine aus `bundle.js` als typisierte React-Komponenten (`components/kg.tsx`). CSS kommt direkt aus `design/`, Schriften liefert die App selbst aus.
- Neu in der Aktionsschicht:
  - Übergabe mit Annahme für Vorgänge und Organisationen (`matters.handover_to`, `orgs.handover_to`),
  - Aufgabenstatus „In Arbeit“,
  - Notizen und Gespräche (`note.create|update`),
  - Bereich anlegen aus dem Namen.
- Tests: 107 Vitest und 5 Playwright-Abnahmen (`npm run e2e`, eigene DB `kollege_e2e`). Die Abnahme aus §13 läuft damit automatisch statt von Hand. `npm run dev:reset -- --ja` baut die Dev-Datenbank aus den Testdaten neu auf.

## Stufe 3 – erledigt

- **Modellschicht** `lib/model/`: `getModel(role)` liest `MODEL_FAST`/`MODEL_THINK` (`anthropic:…`, `openai-compatible:…` mit `MODEL_BASE_URL`). Geprüfte IDs: `claude-haiku-4-5` (fast), `claude-sonnet-5-5` (think). Jeder Aufruf landet in `model_calls` (Rolle, Modell, Tokens, Dauer, Fehler – kein Inhalt).
- **Chat** (`lib/model/chat.ts`, `/api/chat`): `streamText` mit Denkweise (`prompts/denkweise.md`, §9.2) und Kontext (Datum, Team, Bereiche, gültige Anweisungen persönlich > Bereich > Team, Seite des Chats).
  - Lesewerkzeuge: `search`, `get_matter`, `get_contact`, `list_tasks`, `get_area_items`, `stats` (nur benannte Abfragen).
  - Handeln: Jede interne Aktion, die der Akteur `model` darf, ist ein Werkzeug (aus der Registry erzeugt). Jede erzeugt eine Karte mit Rückgängig, Folgeschritten und angewandter Anweisung.
- **Oberfläche:** Eingabefeld oben auf Heute; `/chat` und `/chat/:id` (Nachrichten, Quellen, Karten); Chatverlauf in der Seitenleiste (Anpinnen); „Kollege fragen“ auf Event-, Team-, Organisations- und Personenseiten (Kontext-Chat). Neue Weiterleitungen `/o/:id` und `/p/:id` wie `/m/:id`.
- **Anweisungen per Chat:** Aktion `instruction.create` (persönlich, Bereich, Team), bestätigt mit einer Anweisungs-Karte.
- **Tests:** 126 Vitest (davon 19 Chat) und 8 Playwright-Abnahmen. Beide Abnahmesätze aus §13 laufen im Browser. `tsc --noEmit` ist sauber.
- **Ehrliche Grenze:** Ein echtes Modell lief noch nie. In dieser Umgebung gibt es keinen API-Schlüssel. Die Abnahmen laufen mit dem Stand-in `MODEL_THINK=skript`. Es versteht nur die Abnahmesätze, nutzt aber dieselben Werkzeuge, Rechte, Karten und Quellen.
  - Damit ist die Verdrahtung geprüft, nicht das Urteil des Modells.
  - Zum Prüfen: `.env` mit `ANTHROPIC_API_KEY` und `MODEL_THINK=anthropic:claude-sonnet-5-5`, `npm run dev`, dann die beiden Sätze aus §13 eingeben.

## Stufe 4 – gebaut

- **IMAP-Konnektor** (`lib/connectors/imap.ts`, `imapflow` + `mailparser`). Er liest alle Ordner außer Junk, Papierkorb und Entwürfe und verändert das Postfach nicht.
  - Import ab `import_since` (Standard: 12 Monate) in Paketen zu 100 Mails; der Cursor wird nach jedem Paket gespeichert.
  - Danach liest jeder Sync nur neue UIDs. Ändert sich die UIDVALIDITY eines Ordners, wird er neu gelesen; doppelte Mails fängt die Message-ID ab.
  - Robust: Jede Mail wird einzeln verarbeitet, eine Mail ohne Message-ID wird ein Fehler-Eintrag, und der Sync läuft weiter.
- **Zugangsdaten** werden mit `APP_SECRET` verschlüsselt (AES-256-GCM, `lib/crypto.ts`).
  - Einrichten über `npm run quelle:imap`: Das Passwort wird abgefragt, nie als Argument übergeben. Vor dem Speichern prüft das Skript die Anmeldung.
- **Anhänge:** Text aus PDF, DOCX, XLSX und CSV (`lib/pipeline/extract.ts`). Kaputte Dateien ergeben „kein Text“ statt eines Fehlers.
- **Echtes `fast`-Modell** (`lib/model/fast.ts`, Prompt `prompts/zuordnung.md`).
  - Das Antwortschema wird je Aufruf auf die Kandidaten und vorhandenen Bereiche eingeengt.
  - Mitgegeben werden die letzten 20 Korrekturen des Teams und die Team-Anweisungen.
  - Jeder Aufruf landet in `model_calls`.
- **Korrekturbeispiele** (§7.4) werden direkt aus dem Aktionsprotokoll gelesen (Verwerfen mit Grund, Umhängen, Lösen). Datenschutz-Regel: Ein Beispiel geht nur in den Aufruf, wenn alle, die den aktuellen Eintrag lesen dürfen, auch den Beispiel-Eintrag lesen dürfen.
- **Tests:** 152 Vitest.
  - Die Abnahme aus §13 läuft gegen einen echten IMAP-Server (Dovecot, `tests/dovecot.ts`; ohne Dovecot werden diese Tests mit Hinweis übersprungen): Newsletter übersprungen, bekannte Absender per Regel zugeordnet, neue Anfrage als ungeprüft.
  - `npm run eval:zuordnung` lässt die Soll-Prüfungen aus `expected.json` mit dem echten Modell statt dem Orakel laufen. Jeder Fehlschlag ist eine falsche Zuordnung.
- **Ehrliche Grenze:** Das echte Uni-Postfach und das echte Modell liefen noch nie, beide sind von dieser Umgebung aus gesperrt.
  - Befund: `imap.uni-augsburg.de` und `smtp.uni-augsburg.de` existieren im Netz der Uni; einen Exchange- oder Autodiscover-Rechner gibt es nicht.
  - Zum Testen auf deinem Rechner bzw. im Uni-Netz:
    1. `.env` mit `APP_SECRET`, `MODEL_FAST`, `MISTRAL_API_KEY`.
    2. `npm run eval:zuordnung`.
    3. `npm run quelle:imap -- --benutzer <RZ-Kennung> --besitzer <deine Team-Adresse> --seit <Datum vor 1–2 Wochen>`.
    4. Worker starten und Heute bzw. die Prüfansicht ansehen.

## Antworten 09.10. – gebaut

- **Vergangene Events schließen sich selbst** (`lib/hinweise/abschluss.ts`): am Tag nach ihrem Datum, im Lauf um 06:30 und nach jedem Sync. Danach fragt „Wie lief’s?“ wie bei einem Abschluss von Hand.
- **Hinweise als Mitteilung aufs Gerät** (`lib/hinweise/push.ts`, `lib/push/senden.ts`, `public/sw.js`): Web Push, keine Mail.
  - Die Mitteilung sagt in einer Zeile, worum es geht. Tippen öffnet die Stelle mit den Einzelheiten: den Mail-Verlauf, das Thema, die Aufgabe, den Termin.
  - Mehrere neue Hinweise eines Laufs kommen als eine Mitteilung („3 neue Hinweise“) und öffnen Heute.
  - Einschalten je Gerät unter Einstellungen → Benachrichtigungen (auch im Kontomenü), mit „Probe senden“ und der Liste der eigenen Geräte. iPhone/iPad: erst zum Home-Bildschirm hinzufügen (`app/manifest.ts`).
  - Neu: Tabelle `push_subscriptions` (Migration 0011, RLS: nur eigene), Spalte `hints.notified_at`, Aktionen `push.subscribe`, `push.unsubscribe`, `hint.notified`.
- **Rat auch auf den anderen Seiten:** auf der Seite des Themas („Aus früheren Fällen“, mit Belegen und Knöpfen, auch die Frage nach dem Vorgänger), im Termin, der zum Thema gehört, und im Chat-Werkzeug `get_matter` (damit „Kollege fragen“ auf der Seite denselben Rat kennt).
- **Einrichtung vorbereitet:** `npm run einrichten` legt `.env` an und erzeugt `APP_SECRET`, `AUTH_SECRET` und die Push-Schlüssel, ohne sie anzuzeigen (Datei nur für den Besitzer lesbar). `npm run modell:pruefen` prüft MODEL_FAST und MODEL_THINK mit einem erfundenen Satz: Antwort, strukturierte Ausgabe, Werkzeugaufruf, Dauer, Tokens.
- **Befund bei der Simulation:** Ein vergangener Termin bot „Einladung senden“ an, aber kein „Entwurf verwerfen“. Jetzt geht für Vergangenes keine Einladung mehr raus (auch in der Aktion geprüft), ein Entwurf lässt sich weiter verwerfen. Dazu drei Tests mit festen Daten, die mit der Zeit in die Vergangenheit gerutscht wären, auf relative bzw. spätere Daten umgestellt.
- **Prüfung:** `tsc` sauber, Vitest 233 Tests (neu `tests/push.test.ts`, Ergänzungen in `hinweise.test.ts` und `kalender.test.ts`), Playwright 15, Simulation 8 Läufe mit 189 Prüfschritten ohne Befund. Nicht prüfbar hier: die Zustellung an ein echtes Gerät (der Browser im Container lehnt Push-Anmeldungen ab) – dafür „Probe senden“.

Entscheidungen:

- Entscheidung 47: „Vergangen“ gilt für Bereiche mit Datum (`matter_kind = dated`, also Events). Das Datum ist `date_end`, sonst `date_start`, sonst das erste Datumsfeld des Bereichs („Datum“). Geschlossen wird einmal: Öffnet jemand das Event wieder, bleibt es offen. Auch ungeprüfte Events schließen sich, verworfene nicht.
- Entscheidung 48: Mitteilungen gehen nur für persönliche Hinweise raus, werktags 7–20 Uhr. Was nachts oder am Wochenende entsteht, kommt am nächsten Werktag um 7 Uhr. Die Anweisungen zu Hinweisen gelten wie auf Heute: „aus“ heißt nie, „nur montags“ wartet auf Montag. Jeder Hinweis kommt höchstens einmal; älter als 3 Tage kommt er nicht mehr. Wer kein Gerät eingeschaltet hat, bekommt später keinen Schwall alter Hinweise.
- Entscheidung 49: Die Anmeldung eines Geräts ist ein Zugang zu diesem Gerät. Sie wird verschlüsselt gespeichert (wie Postfach-Passwörter), auch im Aktionsprotokoll nie im Klartext. Nur die Person selbst schaltet ein, nie das Modell. Inhalte gehen Ende-zu-Ende-verschlüsselt über den Push-Dienst von Apple, Google oder Mozilla; der Dienst sieht weder Text noch Link.
- Entscheidung 50: Der Rat bleibt auf der Seite des Themas, auch nach „Danke, gemerkt“ (auf Heute verschwindet er). Der Merker „zu wenig Erfahrung“ ist kein Rat und erscheint nirgends.
- Entscheidung 51: Für vergangene Termine geht keine Einladung mehr raus; einen nie gesendeten Entwurf kann man immer verwerfen.

## Design 05.10. – übernommen

Grundlage: Merge von `claude/design-update` (`design/ENTSCHEIDUNGEN.md` E51–E62). Gebaut:

- **Flächen (Variante A):** abgesenkter Grund, weiße Inhaltsfläche, Pillen-Knöpfe, Satzschreibung. Alles über Tokens.
- **Seitenleiste** (`components/seitenleiste.tsx`, ersetzt `seitennav.tsx`): 240 px, einklappbar auf 58 px; Heute, Chat, Werkzeuge, Bereiche als Baum mit laufenden Einträgen (höchstens 5, dann „Alle n →“) und der Zahl offener Aufgaben; Konto unten mit Menü.
- **Feld „Neuer Chat oder Suche“** (E55, ⌘K): Tippen sucht mit den Rechten der Person (`lib/views/suche.ts`, RLS) in Einträgen, Kontakten, Mails, Dateien, Terminen, Aufgaben; Enter öffnet einen neuen Chat mit der Frage.
- **Heute** (E56/E57, `lib/views/heute.ts`): Kopfsatz, „Diese Woche“ mit Terminen und Fristen, „Offen“ (Entscheiden · Erledigen), „Ausstehend“ mit „erwartet bis“ und Wiedervorlage. Alles aus den vorhandenen Daten (`todayPage`, Hinweise), kein neues Modell.
- **Chat:** Werkzeugaufrufe als „Schritte“; die Chatliste steht auf der Chat-Seite (E62), angepinnt und zuletzt.
- **Bereiche:** „To-Dos“ als eine Liste statt „Zusagen von uns / an uns“ (E59; `ours|theirs` bleibt im Modell). ⋯-Menü mit „Übergeben an …“ (E58). Vollbild für Detailansichten (E52), auch in Mail, Dateien, Kontakte, Aufgaben.
- **Kalender:** Termin-Ansicht und Formular in Gruppen (Wann, Wo, Wer, Gehört zu, Weitere Angaben; E53), Zeiten in 5-Minuten-Schritten.
- **Prüfung:** `tsc` sauber, Vitest 222 Tests (neu `tests/design0510.test.ts`: Suche hält RLS, Baum, Heute widerspricht Aufgaben nicht), Playwright 14, Simulation 8 Läufe mit 188 Prüfschritten ohne Befund.

Entscheidungen beim Bau:

- Entscheidung 43: Das Design bestimmt das Aussehen. Wo es neue Daten oder Abläufe verlangt, gilt die Bauvorlage, und die Frage steht unten.
- Entscheidung 44: Die Suche gibt dem Chat keine Treffer als Kontext mit. Der Chat sucht selbst mit seinen Werkzeugen, damit Zahlen und Belege aus Werkzeugen kommen.
- Entscheidung 45: „Jetzt erinnern“ bei Ausstehendem öffnet einen Mail-Entwurf aus einer Vorlage (`erinnerungVorlage`). Versenden bleibt ein Klick der Person; das Modell sendet nie.
- Entscheidung 46: Mails, die auf Antwort warten, zeigen ihr Datum neutral. Rot ist nur, was eine Frist überschritten hat.

## Simulation (03.10.2026)

`npm run simulation` (eigene Konfiguration, frische e2e-Datenbank) hat zwei Teile.

- **Rundgang:** Jede Seite und je zwei Detailseiten jeder Liste, als Andreas, Julia und Mehmet, dazu das Handy (390 px).
  - Geprüft werden Fehler (Konsole, Server, HTTP), technische Reste, das Wort „Vorgang“, englische Wörter, Bedienelemente ohne Namen, seitliches Scrollen und abgeschnittene Inhalte. Alle internen Links müssen funktionieren.
  - Von jeder Seite gibt es ein Bildschirmfoto (`test-results/simulation/bilder/`). Die Fotos sind von Hand durchgesehen.
- **Arbeitstag:** 14 Abläufe über alle Funktionen.
  - Klären, Eingabe nach einer Beratung, Frage mit Quellen, „Später“.
  - Mail beantworten und zurückholen, archivieren.
  - Termin anlegen, Entwurf verwerfen und Rückgängig. Datei zuordnen.
  - Übergabe und Annahme. Abschluss mit Rückblick. Rat aus dem Vorjahr. Anweisung zu Hinweisen.
  - Nach jedem Schritt wird geprüft, ob die anderen Ansichten dasselbe sagen, z. B. Heute gegen Aufgaben, Chat-Antwort gegen Zusagen, Prüfen-Zähler gegen Bereiche.
- **Ergebnis:** 192 Prüfschritte, nach den Korrekturen ohne Befund. Behoben wurde:
  1. Heute zeigte bei „Wartet auf uns“ Uhrzeiten statt Tage. Eine Mail vom 25.09. sah aus wie von heute.
  2. Eine Klärfrage nannte Wahlmöglichkeiten („neuer Bereich oder Events?“), die kein Knopf anbot. Jetzt führt „Öffnen und zuordnen“ dorthin, wo man sie beantwortet.
  3. „Wie lief’s?“ beim Erledigen erschien nie: Nach dem Neuladen galt das Thema als erledigt, und die Frage verschwand.
  4. Die Übergabe auf Heute zeigte keinen Kurzstand. Jetzt steht dort derselbe Text wie im Hinweis, aus einer gemeinsamen Funktion.
  5. **Datenschutz:** Der Kurzstand einer Übergabe hätte den Betreff einer privaten Mail der bisherigen Besitzerin an den Empfänger gegeben. Jetzt zählt nur, was der Empfänger lesen darf (getestet).
  6. Auf dem Handy war Kollege nicht bedienbar: Die Seitenleiste nahm die ganze Breite, der Inhalt war abgeschnitten.
     - Jetzt gibt es ein Menü, eine Spalte und Liste oder Detail.
     - Auf Heute steht die Eingabe unten (Design „Mobil“).
  7. Kalender und Einstellungen widersprachen sich („nicht verbunden“ gegen „Kalender verbunden“). Das Formular ließ sich ohne beschreibbaren Kalender ausfüllen und scheiterte erst beim Anlegen.
  8. Lange Titel wurden in der Detailansicht abgeschnitten.
  9. Das Ersatzmodell `skript` legte „…-Hinweise nur montags“ ohne Regel ab. In der Entwicklung blieb der Satz also folgenlos.
- **Grenze:** Die „Intelligenz“ lief mit den Ersatzmodellen (Orakel, `skript`), weil hier kein Modellschlüssel hinterlegt ist. Geprüft ist damit:
  - ob alle Funktionen dieselben Tatsachen zeigen;
  - ob die Schutzregeln greifen (Belege, Zahlen, Sichtbarkeit);
  - was das System aus den Antworten macht.
  - Nicht geprüft ist das Urteil eines echten Modells. Dafür: `npm run eval:chat` und `npm run eval:zuordnung` mit Mistral.
- **Nicht behoben, weil nicht spezifiziert:** Die Wochenansicht des Kalenders ist auf dem Handy eng; das Design sieht mobil nur Heute vor. Der Ordnerbaum in Dateien ist auf dem Handy oben eingeklappt.

## Stufe 8 – gebaut

- **Regeln in SQL** (`lib/hinweise/regeln.ts`). Der Worker wendet sie täglich um 06:30 an und eine Minute nach jedem Sync (höchstens ein Lauf wartet).
  - `overdue`: eigene Aufgabe überfällig.
  - `waiting`: Zusage anderer überfällig, oder eine Mail wartet auf uns, je Person, die sie lesen darf.
  - `stale`: Thema hängt.
  - `handover`: an die Empfängerin, mit Kurzstand (nächster Schritt, offene Zusagen, letztes Ereignis).
  - `after_event`: Termin mit Externen vor höchstens einem Tag zu Ende, seither nichts geschrieben → „Was kam raus?“.
  - `outcome`: Thema auf erledigt ohne Rückblick → „Wie lief’s?“.
- **Abnahme:** Jeder Hinweis erscheint einmal (Schlüssel je Ursache), immer mit Grund, und schließt sich, wenn die Ursache weg ist. Ein verschobener Termin oder eine neue Frist ist eine neue Ursache.
- **Heute:**
  - „Später“ an jedem Hinweis: aus den Augen bis morgen, mit Rückgängig. „Erledigt“ an überfälligen eigenen Aufgaben.
  - Neu: „Kurz festhalten“ für „Was kam raus?“ (wird eine Gesprächsnotiz am Thema) und „Wie lief’s?“ (wird der Rückblick). Beides mit einem Rückgängig.
  - Neu: „Aus früheren Fällen“ für den Rat, mit Belegen.
- **Rat aus früheren Fällen** (§9.3, `lib/hinweise/rat.ts`): Für neue Themen liest `think` Vorgänger oder vergleichbare erledigte Themen und gibt höchstens einen Rat mit wörtlichem Beleg.
  - Abnahme an den Testdaten: „Gründungsnacht 2026“ fragt nach dem Vorgänger 2025. Nach „Ja“ kommt der Rat, früher einzuladen, mit dem Beleg aus dem Rückblick 2025 (f4).
- **Anweisungen zu Hinweisen:** „Wartet-Hinweise nur montags“ wirkt auf Heute. Die Einstellungen zeigen, wie der Satz verstanden wurde („Wirkt auf Wartet: nur Mo“).
- **Tests:** 215 Vitest und 14 Playwright.

## Stufe 7 – gebaut

- **Laufwerk:** Das SMB-Laufwerk wird vom Betriebssystem eingehängt (nur lesend), der Worker liest den Ordner (`DRIVE_MOUNT`).
  - Einrichten mit `npm run quelle:laufwerk -- --pfad /mnt/drive --unc '\\server\freigabe'`. Das SMB-Passwort bleibt in der Zugangsdatei des Systems und erreicht Kollege nie.
  - Änderungen werden über Änderungszeit und Größe erkannt und über den Inhalts-Hash bestätigt. Nur „angefasste“ Dateien werden nicht neu verarbeitet.
  - Große Ordner kommen in Paketen zu 100 Dateien.
- **Textauszug und Zusammenfassung:** PDF, DOCX, XLSX, CSV und Text, wie bei Anhängen. Das `fast`-Modell fasst zusammen und ordnet zu.
  - Abnahme: Eine Datei im Ordner „Events/Gründungsnacht 2026“ landet beim Event, fest über die Regel „gleicher Ordner“.
- **Fassungen:** Jede inhaltliche Änderung ist ein eigener Eintrag (§4: Pfad + Hash). Die Ansichten zeigen die neueste Fassung, frühere stehen in der Datei unter „Fassungen“.
  - Gelöschte Dateien verschwinden aus den Listen; ihre Fassungen bleiben, markiert.
  - Kommt eine Datei oder eine ältere Fassung zurück, ist sie wieder aktuell.
- **Dateiansicht `/dateien`** (nach dem Design):
  - Ordnerbaum mit Anzahl, dazu „Aus Mails“; Liste mit Suche und den Filtern Zugeordnet / Ohne Zuordnung.
  - Detail: Pfad, Herunterladen, Pfad kopieren, Ordner, Geändert, Umfang, Sichtbar, „Gehört zu“ (änderbar), „Worum es geht“ und der Textauszug.
  - Anhänge aus persönlichen Postfächern sieht nur, wer die Mail sehen darf (RLS).
  - Auf der Seite eines Themas verweisen die Dateien in die Dateiansicht.
- **Tests:** 203 Vitest und 13 Playwright. Geprüft werden auch Sperrdateien, versteckte Dateien, Links, die Importgrenze, Fassungen ohne doppelte Aufgaben, Löschen und Wiederherstellen sowie ein fehlendes Laufwerk.

## Stufe 6 – gebaut

- **Lesen über CalDAV** (`tsdav`, `ical.js`): iCloud, Radicale/Nextcloud und jeder andere CalDAV-Server.
  - Einrichten mit `npm run quelle:kalender`; das Passwort wird verschlüsselt gespeichert, Kalender werden per Name gewählt.
  - Der Sync überspringt unveränderte Kalender (ctag) und holt nur geänderte Objekte (etag). Gelöschte Termine verschwinden; hat kein Kalender mehr eine Kopie, gilt der Termin als abgesagt.
  - Teilnehmende mit Status (zugesagt, abgesagt, Vorbehalt, offen) je Person (E48).
  - Termine laufen durch dieselbe Zuordnung wie Mails. Abnahme: Ein Termin mit Teilnehmenden wird Person, Gründungsteam und Thema zugeordnet.
- **Kalender `/kalender`** (E41):
  - Woche (7–21 Uhr, umschaltbar auf 0–24 Uhr) und Monat. Überlappende Termine stehen nebeneinander, Serien erscheinen an jedem ihrer Tage.
  - Klick in einen freien Platz legt einen Termin an. Nicht Verschicktes ist gestrichelt.
  - Die Detailansicht zeigt Teilnehmende mit Status, bei fremden Terminen die Besitzerin oder den Besitzer.
- **Anlegen, ändern, absagen:** `event.create`, `event.update`, `event.cancel` mit Rückgängig.
  - Ohne Teilnehmende steht der Termin gleich im eigenen Kalender.
  - Mit Teilnehmenden bleibt er ein Entwurf, bis die Person „Einladung senden“ drückt.
  - Ändert sie einen Termin mit Eingeladenen, heißt der Knopf „Änderung senden“.
- **Einladungen** (`event.send`):
  - Nur ein Mensch kann sie auslösen; das Modell nicht (im Code erzwungen, getestet).
  - Sie sind wie Mail 10 s zurückholbar.
  - Der Job schreibt zuerst in den Kalender und schickt dann die Einladung (iMIP) über das eigene Postfach. Absagen gehen genauso raus.
- **Tests:** 194 Vitest und 11 Playwright. Die Abnahme läuft gegen Radicale als lokalen CalDAV-Server. Geprüft werden außerdem:
  - Erinnerungen (VALARM) und Apple-Felder bleiben beim Ändern erhalten.
  - Eine gleichzeitige Änderung woanders gewinnt (412).
  - Der Entwurf, Einladung, Änderung und Absage, das Zurückholen und das Rückgängig von „Anlegen“.
  - Serien über die Umstellung auf Winterzeit.

## Stufe 5 – gebaut

- **Mail-Ansicht `/mail`** (E26, E38):
  - Threads mit Umschalter Mein Postfach / StartHub / Alle.
  - Ordner Eingang, Gesendet, Archiv, Entwürfe; Filter Ungelesen, Mit Anhang, Ohne Zuordnung; Suche.
  - Thread mit Platzhaltern für fremde Mails (E13, Funktion `thread_stubs`).
  - Anhänge zum Herunterladen: nur über einen Eintrag, den man lesen darf, und nie im Browser angezeigt.
  - „Gehört zu“ änderbar.
  - Antworten, Allen antworten, Weiterleiten, Archivieren, Als ungelesen. Beim Öffnen gilt die Mail als gelesen.
- **Schreibfeld** (E43):
  - Der Entwurf speichert sich beim Tippen. Senden geht nur per Knopf, nie per Enter.
  - Ohne Empfänger erscheint ein Fehler am Feld, ohne Betreff oder Text eine Rückfrage.
  - Anhänge bis 20 MB. „Über mein Postfach senden“; danach „Wird gesendet an … – 10 s zurückholbar“. Zurückholen öffnet das Schreibfeld wieder.
- **Senden:** `mail.send` reiht nur ein. Der Job sendet nach 10 s per SMTP, unter der Sperre der Aktionszeile:
  - Er legt die Mail im Gesendet-Ordner ab und macht aus dem Entwurf die gesendete Mail. Ihre Message-ID ist der Schlüssel, deshalb erkennt der nächste Sync sie wieder.
  - Erst dann entfernt er das Rückgängig.
  - Sicherheitsnetz: Der Worker holt jede Minute nach, was über die 10 s hinaus wartet.
- **Zurückschreiben:** Gelesen und Archiv gelten pro Postfach-Kopie (`mail_copies`). Vor jedem Sync schreibt der Worker sie ins Postfach zurück, Rückgängig ebenso.
- **Im Chat:** Das Modell darf Entwürfe schreiben. Die Karte zeigt sie als „Entwurf“ mit „Ansehen“ und „Über mein Postfach senden“. Senden ist immer ein Klick des Menschen; das Modell kann es nicht, im Code erzwungen und getestet.
- **Tests:** 168 Vitest und 10 Playwright.
  - Die Abnahme aus §13 läuft gegen Dovecot und einen mitschreibenden SMTP-Server: Gesendete Mail erscheint nach dem Sync nicht doppelt.
  - Dazu: Zurückholen, kein Rückgängig mehr nach dem Senden, Bcc nur im Umschlag, Antwort im Thread, Zurückschreiben samt Rückgängig, fremde Kopien unantastbar, SMTP-Fehler und das Sicherheitsnetz.

## Entscheidungen (mit Andreas, 01.10.2026)

1. **Infrastruktur-Ausnahme:** Diese Schreibvorgänge laufen direkt, nicht über `runAction`: Rohspeicherung, `visible_to` erweitern, Verarbeitungsstand (`processing_state`, `summary`, `author_person_id`, `meta.skip_reason`), Cursor, Seed von `users`/`connections`. Alles mit Bedeutung läuft über Aktionen.
2. **Klärungsknöpfe** leitet die Pipeline ab, das Schema bleibt. Beispiel: Absender unbekannt + genau ein Kandidat mit gleichem Vornamen → „Ja, das ist X“ (`person.add_email`), dazu immer „Nein/Verwerfen“.
3. **`actions` sieht die App-Rolle nur für eigene Aktionen.** `reason` kann aus eingeschränkten Mails zitieren.
4. **app-Container** in Stufe 1 nur als Gerüst.
5. **Filter „rein intern“ gilt nur für Mails.** Interne Termine bewertet das Modell (e3 → `relevant:false`, Grund `irrelevant`). `expected.json` ist entsprechend angepasst. Grund: Bei Terminen sind die Eingeladenen nicht das Publikum (Gründungsnacht).
6. **Termine sehen Kalenderbesitzer, Organisator und eingeladene Teammitglieder** (`visible_to`).
7. **Systemschritte werden korrigiert, nicht rückgängig gemacht** (für Stufe 2): Nutzer verwenden `entry.unlink`/`relink`, `review.discard` (mit Grund), `task.update`. Diese Aktionen sind selbst umkehrbar und werden zu Korrekturbeispielen (§7.4). `undoAction` bleibt auf eigene Aktionen beschränkt.
8. **Konfiguration:** Die Team-Domain steht in `TEAM_DOMAIN` (`.env`). Die Freemail-Liste ist die Datei `config/freemail.json` (überschreibbar per `FREEMAIL_FILE`, für die Testdaten `fixtures/freemail.json`). Die Seed-Daten (Team, Postfächer, Bereiche) bleiben in `fixtures/config.json`.
9. **Zuständig für Vorgänge des Systems ist, wer die Quelle persönlich hat:** eigenes Postfach (bei mehreren: wer in „An“ steht), eigener Kalender (nicht die Eingeladenen), Bearbeiter der Datei. Team-Quellen bleiben ohne Zuständigen. Es gibt einen Zuständigen pro Vorgang, wechselbar per `matter.assign`/`handover`. In `expected.json` sind solaro_exist und greenbyte_first deshalb `owner: null`, passend zu m10.
10. **Oberfläche erst mit dem neuen Design-Export.** `design/` ist der Stand vom 30.09.; Andreas liefert den aktuellen Export.
11. **Login:** Dev-Login jetzt, Magic-Link per Mail erst, wenn der Mailversand steht (Stufe 4/5).
12. **Schriften** (IBM Plex) liefert die App selbst aus (npm `@fontsource/*`), nicht über Google Fonts (DSGVO).
13. **„Aus Vorjahr“ übernimmt Ort und Plätze**, nicht Datum und Anmeldungen. Umgesetzt als Feld-Eigenschaft `carry_over` in der Bereichskonfiguration; derzeit nur bei Events gesetzt, in den Einstellungen änderbar.
14. **Personen und Organisationen zusammenführen** kommt später, nicht in Stufe 2.

Ab hier entscheide ich selbstständig nach `docs/VORGEHEN.md` (Freigabe Andreas, 01.10.2026):

15. **Design E42–E50 werden übernommen.** Keine verletzt eine harte Regel, alle schließen Lücken, die echte Fehlerfälle sind. Im Einzelnen:
    - **Aufgaben** bekommen den Status „In Arbeit“ (nur `ours`), über ein eigenes Enum `task_status`. „Wartet“ bleibt aus der Richtung berechnet (E44).
    - **Übergabe wartet auf Annahme** (E45): Spalte `matters.handover_to`. Bis zur Annahme bleibt die bisherige Person zuständig, Zurückziehen ist möglich. Zuständigkeit ist kein frei wählbares Feld; frei Übernehmen geht nur bei „niemand zuständig“.
    - **Gründungsteams** bekommen die Phase „ruht“ (E50).
    - **Mail-Versandverzögerung** (E43) kommt in Stufe 5, **Teilnahme je Person** (E48) in Stufe 6.
16. **Heute nach E39** (ohne Umschalter Meins/Team, darunter „Im Team“: „Neu, niemand zuständig“ und „Hängt bei anderen“). Das widerspricht §8.1 nur in der Darstellung, die Abfragen bleiben dieselben. Für Darstellung ist das Design maßgeblich.
17. **Seitenleiste nur mit Navigation und „+ Neuer Chat“** (E40). Punkte späterer Stufen erscheinen erst, wenn sie gebaut sind; es gibt keine toten Links.
18. **Chats laufen über die Aktionsschicht** (`chat.create|update|append`), wie jede Datenänderung. Sie sind nicht umkehrbar: Eine gelöschte Nachricht würde das Protokoll verfälschen, auf das sich die Karten beziehen.
    - Nutzernachrichten schreibt nur der Akteur `user`, Antworten nur `model`.
    - `model_calls` ist ein Betriebsprotokoll wie `actions` selbst und wird direkt geschrieben. Für die App-Rolle gilt nur Einfügen eigener Zeilen, kein Lesen.
19. **Das Modell bekommt alle internen Aktionen als Werkzeuge** außer `chat.*` (Infrastruktur) und `hint.create` (Rat kommt in Stufe 8). Externe Aktionen fehlen in der Werkzeugliste, und `runAction` lehnt sie für `model` zusätzlich ab.
    - Was das Modell anlegt (Eintrag, Person, Organisation), ist nach §6 ungeprüft.
    - Zuordnungen des Modells tragen `origin: model`. Das gilt auch für den Link einer Notiz, die das Modell ablegt: Das Ziel hat das Modell gewählt.
20. **Quellen sind fälschungssicher:** Das Modell zitiert mit `[[ID]]`. Die Oberfläche zeigt eine Quelle nur, wenn ein Werkzeug derselben Antwort diese ID geliefert hat. Erfundene IDs bleiben unsichtbar.
    - Eine Zusage aus einer Mail, die der Nutzer nicht lesen darf, zitiert die Aufgabe selbst, nie die Mail.
21. **Stand-in `skript`** für die Rolle `think`, analog zum Orakel. Es ist deterministisch, nutzt nur die Werkzeuge und ist in Produktion gesperrt.
22. **Eine begonnene Antwort läuft zu Ende,** auch wenn der Browser die Verbindung trennt. Begonnene Schritte werden fertig, und die Antwort wird gespeichert, damit keine halben Karten entstehen.
23. **`task.create` nimmt eine Frist als Tag** (`due_date`, Ende des Tages in Berlin), wie `task.update`. Das Modell rechnet so keine Zeitzonen.
24. **Testphase mit Mistral** (Andreas, 02.10.2026). Mistral ist ein französisches Unternehmen, die Verarbeitung läuft in der EU. Selbst betriebene offene Modelle bleiben die spätere Option; der Wechsel ist nur Konfiguration.
    - **Anbieter:** `MODEL_THINK=mistral:<modell>` über das eigene Paket `@ai-sdk/mistral` statt `openai-compatible`. Grund: Mistral weicht bei Werkzeugaufrufen und Denkschritten vom OpenAI-Format ab, und das Paket fängt das ab. Es ist eine Abweichung von der Anbieterliste in §3, nicht vom Prinzip „Modell ist Konfiguration“.
    - **Standard ist der EU-Endpunkt** `api.eu.mistral.ai` (Regional Inference: Verarbeitung nur in der EU, laut Mistral ca. 10 % Aufschlag). Ein Test sichert das ab. Abweichen geht nur ausdrücklich über `MISTRAL_BASE_URL`.
    - `fast` bleibt bis Stufe 4 beim Orakel.
    - **Zu prüfen beim Einrichten:**
      - Bezahltarif: Im kostenlosen „Experiment“-Tarif nutzt Mistral API-Daten laut eigener Hilfe standardmäßig fürs Training.
      - AVV/DPA abschließen.
      - Modell-IDs mit `npm run modell:liste` gegen das Konto prüfen und auf eine feste Version setzen.
      - `npm run eval:chat` fährt die Abnahme aus §13 mit dem echten Modell und prüft den Datenbestand und die Quellen, nicht den Wortlaut.
25. **Mail über IMAP** (Andreas, 02.10.2026): `imap.uni-augsburg.de:993` (TLS) mit RZ-Kennung und Passwort. Versand (Stufe 5) läuft über `smtp.uni-augsburg.de:465`. Microsoft Graph entfällt.
26. **Ausschluss-Anweisungen im Filter** (§7.2.1) wendet das `fast`-Modell an. Anweisungen in Alltagssprache lassen sich ohne Modell nicht prüfen. Die Team-Anweisungen gehen deshalb in jeden `fast`-Aufruf; schließt eine aus, ist die Antwort `relevant: false`, und der Eintrag wird übersprungen (Grund `irrelevant`).
    - Preis: Auch ausgeschlossene Mails kosten einen Aufruf. Feste Regeln (Absender oder Domain) wären billiger, stehen aber nicht in der Bauvorlage.
27. **Kein `xlsx`-Paket.** Auf npm liegt nur 0.18.5 mit bekannten Sicherheitslücken; neuere Versionen gibt es nur über das CDN von SheetJS, das von hier gesperrt ist. Fremde Anhänge damit zu parsen ist ein Risiko. XLSX ist ein ZIP mit XML: Für den Textauszug liest `lib/pipeline/extract.ts` Zelltexte und Zahlen selbst, mit `jszip`, das `mammoth` ohnehin mitbringt.
28. **Postfach-Kopien in eigener Tabelle `mail_copies`** statt in `entries.meta`: eine Zeile je Postfach und Ordner mit UID, Gelesen-Status und gewünschter Verschiebung.
    - Grund: Gelesen und Archiv gelten pro Postfach, nicht pro Mail. Und Rückgängig ändert so genau eine Zeile. In einer JSON-Spalte hätte es alles überschrieben, was der Sync inzwischen eingetragen hat.
    - Die Tabelle steht nicht in §4, ist aber die Darstellung dessen, was §6 und §7 verlangen („zurück ins Postfach“).
29. **Entwürfe sind Einträge der Art `draft`**, nicht Mails mit Merker. So muss keine der vielen Mail-Abfragen (Heute, Verlauf, Suche, Statistik) Entwürfe gesondert ausschließen. Beim Senden wird der Entwurf zur Mail.
30. **`mail.send` ist extern und nur für Menschen,** aber bis zum tatsächlichen Versand umkehrbar (E43): Der Sende-Job entfernt das Rückgängig erst, wenn die Mail raus ist. Rückgängig sperrt dazu die Aktionszeile, damit Zurückholen und Senden sich nicht kreuzen.
31. **Ordner werden abgeleitet, nicht über Ordnernamen bestimmt** (die heißen je nach Server „Sent“, „Gesendet“ oder „Sent Items“):
    - Gesendet ist, was von der Adresse des Postfachs kommt.
    - Archiv ist, was empfangen wurde und nicht mehr im Eingang liegt.
    - Archivieren verschiebt in den Archiv-Ordner des Servers (Sonderordner `\Archive`) oder legt „Archive“ an.
32. **`nodemailer` 8 statt 10:** Das ist die Version, die `next-auth` für den späteren Magic-Link erwartet. Die Prüfung der Abhängigkeiten habe ich nicht umgangen.
33. **Der Kalender folgt Kollege** über Kopien je Kalender (`event_copies`, analog `mail_copies`). Eine Änderung markiert die Kopie; der Worker schreibt sie vor jedem Sync zurück.
    - Geschrieben wird mit If-Match. Hat jemand den Termin inzwischen in Apple, Outlook oder im Webmail geändert, gewinnt der Server: Kollege überschreibt nichts und zeigt am Termin einen Hinweis.
    - Bestehende Termine werden an Ort und Stelle geändert. Erinnerungen, Herstellerfelder und die Zeitzone (TZID) bleiben.
34. **Einladen ist ein eigener Schritt** (`event.send`). Logikfehler aufgelöst: §5 nennt `event.create|update|cancel` „extern, wenn Teilnehmende außerhalb des Teams“. Dann hätte das Modell keinen Termin mit Gästen auch nur vorbereiten können, und jede Änderung wäre sofort an alle gegangen.
    - Jetzt geht beim Anlegen und Ändern nichts nach außen; der Termin wartet als Entwurf.
    - Extern ist nur der Versand. Er ist ein Klick eines Menschen und 10 s zurückholbar (E10, E28, E43).
    - Ein Termin ohne Gäste oder mit nur Team-Gästen ist intern.
35. **Einladungen gehen über das eigene Postfach** (iMIP, RFC 6047), nicht über den Kalenderserver: So funktioniert es mit jedem Server gleich, und die Einladung liegt im eigenen Gesendet-Ordner. Damit der Server nicht zusätzlich einlädt, stehen die Teilnehmenden mit `SCHEDULE-AGENT=CLIENT` (RFC 6638) im Kalender.
36. **Zeiten rechnet der Server in Berliner Zeit um,** nicht der Browser. Wer auf Reisen in anderer Zeitzone einen Termin anlegt, bekommt sonst eine verschobene Uhrzeit. Serien werden auf der Berliner Wanduhr aufgelöst: 10 Uhr bleibt auch nach der Zeitumstellung 10 Uhr.
37. **Schutzregeln für das Laufwerk:**
    - Ein nicht erreichbares oder plötzlich leeres Laufwerk ist ein Fehler. Sonst hielte Kollege ein abgefallenes SMB-Mount für „alles gelöscht“.
    - Links werden nicht verfolgt (Schleifen, Wege aus der Freigabe heraus).
    - Sperrdateien (`~$…`, `.~lock…`), versteckte Dateien und Systemdateien bleiben draußen.
    - Dateien über 50 MB werden nur gehasht und als Metadaten gespeichert; geöffnet werden sie direkt auf dem Laufwerk.
38. **Keine doppelten Aufgaben aus geänderten Dateien.** Logikfehler aufgelöst: Nach §4 ist jede Fassung ein neuer Eintrag. Ein Protokoll mit einem korrigierten Tippfehler hätte also alle seine Aufgaben noch einmal erzeugt.
    - Jetzt übergeht Kollege eine Aufgabe, deren wörtliches Zitat schon in einer früheren Fassung derselben Datei stand. Das gilt auch für denselben Inhalt unter anderem Pfad, also eine verschobene Datei.
    - Neue Absprachen in der neuen Fassung werden weiterhin zu Aufgaben.
39. **„Öffnen in Word“ aus dem Design geht nicht:** Ein Browser darf keine SMB-Pfade öffnen. Stattdessen gibt es „Herunterladen“ und „Pfad kopieren“ (`\\server\freigabe\…`, für Explorer oder Finder).
40. **Hinweise sind das Gedächtnis der Heute-Listen, keine zweite Liste.** Logikfehler aufgelöst: §10 legt Überfälliges, Wartendes und Hängendes als Hinweise an. Heute (Stufe 2) zeigt genau das schon live. Beides zu zeigen hieße, alles doppelt zu zeigen.
    - Heute bleibt live, also sofort richtig, auch ohne Worker-Lauf. Die Hinweis-Zeile merkt sich je Ursache, dass sie erschien, ob sie verschoben wurde („Später“) und ob jemand sie von Hand erledigt hat.
    - Von Hand erledigt kommt sie nicht wieder.
    - Ein Hinweis zählt einmal je Ursache, nicht je Objekt. Eine neue Frist ist ein neuer Hinweis, dieselbe nicht.
41. **Rat nur mit Erfahrung, sonst eine Frage.** Logikfehler aufgelöst: §9.3 gibt Rat „bei ähnlichen erledigten Vorgängen“, Denkweise 5 verbietet Rat bei weniger als zwei Fällen.
    - Jetzt gilt: Ein von einem Menschen gesetzter Vorgänger reicht, mindestens zwei vergleichbare erledigte Themen auch.
    - Genau ein vergleichbares Thema ohne Vorgänger: eine Frage „Ist … der Vorgänger?“ (Denkweise 9). Das beantwortet auch die alte Frage, wo der Vorgänger vorgeschlagen wird (e5).
    - Im Code geprüft: Zitate müssen wörtlich in ihrer Quelle stehen, jede Zahl im Rat in den Daten. Sonst gibt es keinen Rat.
    - Pro Thema wird höchstens einmal gefragt; auch „zu wenig Erfahrung“ wird gemerkt.
    - Der Rat entsteht im Worker-Lauf für Themen der letzten drei Tage, nicht in `matter.create`. Die Aktionsschicht ist eine Transaktion, und ein Modellaufruf hätte darin nichts zu suchen.
42. **Anweisungen zu Hinweisen versteht das Modell einmal, angewendet werden sie ohne Modell.** Das Chat-Modell legt zur persönlichen Anweisung eine Regel ab (welche Arten, welche Bereiche, welche Wochentage oder gar nicht).
    - Heute filtert danach, ohne Modellaufruf pro Hinweis.
    - Die Einstellungen zeigen die Regel, damit man sieht, ob der Satz richtig verstanden wurde.

## Befunde aus dem Bau

- **§7.2.1 weicht ab** (Entscheidung 5). Die Bauvorlage sollte „Rein intern (nur Mails)“ sagen.
- **`relevant:false`** führt zu `skipped` (Grund `irrelevant`) ohne Verknüpfung. Das betrifft m11 und e3.
- **Reihenfolge beim Import:** f3 (Datei, 29.09.) verweist auf die Gründungsnacht 2026, die erst e5 (Termin am 20.11.) anlegt. Der Import verarbeitet deshalb erst Mails, dann Termine, dann Dateien, jeweils chronologisch. Mit echtem Modell würde die Datei in umgekehrter Reihenfolge einen neuen Vorgang vorschlagen, und es entstünde ein Duplikat. Merge-Fälle sind also zu erwarten.
- **Kandidatensuche:** `plainto_tsquery` verlangt alle Wörter des Titels. Bei f3 fehlte deshalb „Gründungsnacht 2026“ unter den Kandidaten, weil „20.11.2026“ nicht als „2026“ zählt. Das Orakel stört das nicht, für Stufe 4 ist es aber wichtig. Die Pipeline meldet solche Fälle als `notInCandidates`.
- **Soll-Endzustand in `expected.json`:** Der Teil `matters`/`people` ist nicht vollständig aus dem Eingangsweg ableitbar. Personenrollen (founder/partner/…), Felder (Datum, Plätze), `status=done` (gn_2025) und Vorgänger liefert weder das Schema §7.2.4 noch eine Regel. Stand jetzt:
  - Personen haben die Rolle `other`.
  - Die Tests prüfen Namen, Bereiche, Org-Zuordnung, Zuständige, Domains und E-Mails, nicht aber die übrigen Angaben.
- **„medium → als ungeprüft markieren“:** `links` haben keinen `review_state`. Neue Objekte sind ohnehin ungeprüft. Wird mit `medium` einem bestehenden Vorgang zugeordnet, steht nur `confidence=medium` am Link.
- **Anhänge:** Ein Link Anhang→Mail ist in `links` nicht vorgesehen (nur matter/person/org), er steht deshalb in `meta.mail_entry_id`. Eine Zusammenfassung gibt es nicht, weil das Orakel keine liefert.
- **Org-Domains** werden aus den Adressen der neuen Personen derselben Org abgeleitet (ohne Freemail, ohne Team). Das ist nötig für die feste Zuordnung, steht aber nicht ausdrücklich in §7.
- **Fristen:** Das Modell liefert ein Datum, gespeichert wird `due_at` = 23:59:59 Berlin an diesem Tag.
- **Konnektor-Interface:** `sync` liefert zusätzlich `errors` (nicht lesbare Elemente → Eintrag `kind=system`, Cursor läuft weiter, §12).
- **Mails ohne Message-ID** werden als Fehler-Eintrag abgelehnt. Die Formulierung „Message-ID ohne Quelle“ in §12 ist so ausgelegt.
- **Rückgängig** wirkt nur auf eigene Aktionen (Entscheidung 3). Folgeschritte anderer Akteure unter einer Nutzeraktion sähe `undoAction` nicht. In Stufe 1 kommt das nicht vor. Mit Entscheidung 7 ist es auch nicht nötig.
- **`created_by_type`** kennt nur `user|system`. Was der Akteur `model` anlegt, zählt als `system` und ist ungeprüft.
- **Rollen:** Es gibt eine Login-Rolle (eine `DATABASE_URL`, §14), die App wechselt per `SET LOCAL ROLE`. Strenger wäre ein eigener Login für die App ohne Mitgliedschaft in der Eigentümerrolle.
- **Noch nicht gebaut**, weil in Stufe 1 nicht gebraucht:
  - Verschlüsselung von `connections.config` mit `APP_SECRET`: Fixture-Quellen haben keine Geheimnisse, das kommt mit Stufe 4.
  - Tabelle `model_calls` (§9): seit Stufe 3 gebaut.
  - Ausschluss-Anweisungen im Filter: Anweisungen gibt es erst ab Stufe 3.
- **Docker** ist hier nicht gelaufen, weil die Umgebung keinen Daemon hat. `docker compose config` ist gültig. Seed, Worker (Import, 8 Zeitpläne) und App (`next start`) habe ich lokal mit denselben Befehlen gefahren.
- **`npm audit`** meldet 4 Fälle „moderate“ in `drizzle-kit` (esbuild-Dev-Server). Das betrifft nur die Entwicklung.

### Befunde Stufe 2

- **Fehler im Design, beim Bau gelöst:**
  - „Nächster Schritt“ als freies Feld neben den Aufgaben: zwei Wahrheiten. Er wird jetzt aus der frühesten offenen eigenen Aufgabe berechnet; bei Gründungsteams ist er das Bereichsfeld.
  - „betreut von“ und „Phase“ stehen bei Gründungsteams als Feld und als Spalte der Organisation: Sie werden auf die Spalten abgebildet.
  - Die Phasenliste steht zweimal (Phasen und Auswahl des Feldes „Phase“): Das Feld verwendet jetzt immer die Phasen.
  - `Navigation` mit Zählern: entfernt (M2).
  - `Verlauf` mit Rückgängig an Systemschritten: entfernt (Entscheidung 7).
  - `Quelle` ohne Ziel als funktionsloser Knopf: rendert als Text (Ü11).
  - Hintergrund im Prototyp fest `#fbfbfa`: jetzt `var(--paper)`.
  - Klärungen nannten als Beleg den Zeitpunkt des Hinweises: jetzt das Datum der Mail.
  - „Prüfen“ auf Heute zählt live je Bereich (H2) statt des eingefrorenen Import-Texts.
  - Liste neben offenem Detail: Feste Spaltenbreiten drückten den Titel auf null. Jetzt gilt E34: schmal mit 3 Spalten, ohne Detail alle.
- **Bewusst anders als der Prototyp:**
  - **„Stimmt“ je KI-Feld:** Die Marke bleibt, bestätigt wird über „Übernehmen“, denn Herkunft pro Feld gibt es nicht.
  - **Bezüge über Bereiche** nur über vorhandene Beziehungen (Org, „gehört zu“, Vorgänger). Eine eigene Tabelle für freie Querbezüge (E31) gibt es nicht.
  - **Notizen** sind ein schlichtes Textfeld statt eines Rich-Text-Editors.
  - **„Kollege fragen“** fehlt bis Stufe 3.
  - **„+ Aufgabe“ und „+ Anweisung“** gibt es nicht, nach §11 laufen sie über das Eingabefeld.
  - **Board ohne Ziehen:** Status per „Verschieben nach …“ (Tastaturweg aus E44).
- **Übergabe braucht keine Hinweis-Zeile:** Die Wahrheit ist `handover_to`. Die Empfängerin sieht sie auf Heute, und RLS bleibt unberührt (ein Hinweis für eine andere Person wäre unter RLS nicht anlegbar).
- **Turbopack** deutet `new URL('../x', import.meta.url)` als Asset. Pfade sind jetzt relativ zu `process.cwd()`.

- **RLS lässt UPDATE/DELETE auf lesbare, aber nicht änderbare Zeilen still durchlaufen.** Ein Beispiel ist der Link zu einer Mail, die man nicht sehen darf: Das Ergebnis sind 0 Zeilen, aber kein Fehler. Ein Test hat das gefunden. Die Aktionen prüfen jetzt die betroffenen Zeilen und lehnen sonst ab.
- **Berechnete Zustände** müssen alles zählen, was das Team hat, nicht nur das, was der Fragende lesen darf. Sonst gälte eine Mail für Julia als unbeantwortet, obwohl Andreas aus seinem Postfach geantwortet hat. Dafür gibt es `SECURITY DEFINER`-Funktionen (`waiting_on_us`, `matter_last_activity`, `org_last_activity`, `entry_owner_names`, Migration `0002_views.sql`). Sie liefern nur IDs, Zeitpunkte und Namen, keine Inhalte.
- **„KI-Vermutung“ bei Feldern:** Ist ein Vorgang vom System angelegt und ungeprüft, gelten alle seine Felder als Vermutung, bis er übernommen wird. Eine Herkunft pro Feld nach der Übernahme (E32) ist nicht gespeichert. Das System setzt derzeit keine Felder an bestehenden Vorgängen, das Schema §7.2.4 sieht es nicht vor.
- **„hängt“** nutzt N = 21 Tage fest. N aus Anweisungen des Bereichs kommt mit Stufe 3.
- ~~„Heute“ zeigt Serientermine nur an ihrem ersten Tag~~ (e6): in Stufe 6 behoben. Abgesagte Termine fehlen dort jetzt auch.
- **Gründungsteams-Liste:** Ob ein Team „offen“ oder „erledigt“ ist, wird aus seinen Themen abgeleitet: offen, solange ein Thema offen ist oder es noch keins gibt.
- **E23 („alles, was der Chat kann, geht auch von Hand“) widerspricht §11** („keine eigenen Felder für … neue Anweisung“). Es gilt die Bauvorlage: Anweisungen entstehen per Chat (Stufe 3), die Einstellungen können sie ändern und löschen.
- **Auth.js v5** ist weiterhin Beta. Die Version ist exakt gepinnt (`next-auth@5.0.0-beta.32`). Der Magic-Link wird Tabellen für Verifizierungs-Tokens brauchen, die nicht in §4 stehen.
- **`next dev` schreibt** in CLAUDE.md einen eigenen Regelblock, sobald es einen KI-Agenten erkennt. Ich habe ihn zurückgenommen und nicht committet; für Rauchtests nutze ich `next start`.
- **Noch nicht gebaut**, weil es zu späteren Stufen gehört bzw. nicht in der Abnahme steht:
  - der Hinweis zu `matter.handover` (gehört zu Stufe 8),
  - `person.merge` und `org.merge` (später, Entscheidung 14).

### Befunde Stufe 3

Design (Logikfehler aufgelöst):
- **Karte:** Das Bundle zeigt „Rückgängig gemacht“, bevor das Rückgängigmachen geklappt hat. Bei einem Fehler wäre das falsch. Jetzt wechselt die Karte erst nach Erfolg und zeigt sonst den Fehler.
- **Karte „Wiederholen“** tut im Bundle nichts außer den Zustand umzuschalten. Ein echtes Wiederholen wäre eine neue Aktion, der die gespeicherte Karte nicht folgen kann; nach dem Neuladen könnte man doppelt wiederholen. Deshalb gibt es auf Karten kein „Wiederholen“, im Toast bleibt es.
- **Eingabe:** Der Platzhalter „…zu diesem Vorgang“ verletzt die harte Regel zum Wort „Vorgang“. Jetzt heißt er „Frag oder notiere etwas dazu“.
- **Eingabe:** Die README nennt sowohl „Merken“ als auch den Pfeil als Knopf. Gebaut ist der Pfeil („Abschicken“).
- **Eingabe:** doppelter Fokusrahmen (Rahmen des Feldes und Textfeld). Jetzt zeigt nur noch der Rahmen den Fokus.
- **Quittung und Karte** sind zwei Belege für dasselbe. Nach §11 öffnet jede Eingabe den Chat, deshalb gibt es einen Beleg: die Karte. „Alles rückgängig“ aus der Quittung ist nicht gebaut (Frage unten).

Eigene Fehler, durch Tests gefunden:
- `model_calls` protokollierte das Modell aus `.env` statt des tatsächlich benutzten. Der Fehler wurde still verschluckt.
- React führt Effekte im Entwicklungsmodus doppelt aus und bricht dabei den ersten Versand ab. Dadurch kam die erste Eingabe von Heute nie an. Gelöst mit einem Timer, den das Aufräumen storniert.

### Befunde Stufe 8

- **Der Import schließt keine Themen:** „Gründungsnacht 2025“ liegt in der Vergangenheit, bleibt aber offen, bis jemand sie schließt. Erst dann taugt sie als früherer Fall. Frage unten.
- **„Was kam raus?“ gilt nicht für Serientermine** (z. B. jede Vorlesungssitzung). Sonst käme die Frage jede Woche. Nur Einzeltermine.
- **An den Testdaten selbst gefunden:** Die Beratung mit Kitchen Loop (30.09.) löst am 01.10. ein „Was kam raus?“ aus. Die Regel greift also auch ohne eigens gebaute Testfälle.
- **Nicht gebaut** (steht nicht in der Bauvorlage; Frage unten): Benachrichtigung außerhalb der App (Mail, Handy), der Rat auf der Seite des Themas.

### Befunde Stufe 7

- **Eigener Fehler, durch Test gefunden:** Im Test verdeckte eine lokale Hilfsfunktion die gleichnamige Ansicht. Umbenannt.
- **„Gehört zu“ ist jetzt ein gemeinsamer Baustein** für Mail und Dateien (zweiter konkreter Verwendungsfall).
- **Design, nicht gebaut** (steht nicht in der Bauvorlage; Frage unten): Hochladen, „Kollege fragen“ zu einer Datei, ein persönlicher Ordner „nur du“, Prüfen ungeprüfter Datei-Zuordnungen in einem eigenen Modus.
- **Der Bearbeiter einer Datei** ist über SMB nicht lesbar. Kollege nennt bei Laufwerksdateien niemanden; die Fixtures haben ihn.

### Befunde Stufe 6

Durch Tests gefunden:
- **Serien wurden in UTC aufgelöst.** Ein wöchentlicher Termin um 10 Uhr hätte nach dem 25.10. um 9 Uhr gestanden. Ebenso hätte das Ändern eines Termins seine Zeitzone durch UTC ersetzt; Apple und Outlook hätten die Serie dann im Winter verschoben. Beides ist behoben (Entscheidung 36).
- **Eigener Fehler:** Das Formular rechnete die Uhrzeit in der Zeitzone des Browsers um; jetzt macht das der Server.
- **Ein verworfener Entwurf verlor beim Rückgängig seine Kalender-Kopie** und wäre nie mehr in den Kalender gekommen. Jetzt wird die Kopie mit umgekehrt.
- **Die App-Rolle durfte keine Kalender-Kopien anlegen** (Migration 0010 mit eigenen RLS-Regeln). Fremde Kopien bleiben unantastbar.
- **Noch nicht gelesen:** einzeln geänderte Termine einer Serie (RECURRENCE-ID). Kollege zeigt die Serie so, wie sie ursprünglich angelegt wurde. Serien lassen sich in Kollege nicht bearbeiten, nur ansehen.
- **Design, nicht gebaut** (steht nicht in der Bauvorlage; Frage unten): fremde Einladungen annehmen oder ablehnen, Termine verschieben per Ziehen.

### Befunde Stufe 5

- **Eigener Konstruktionsfehler, vor dem Commit bemerkt:** Ich hatte den Gelesen-Status zuerst in `entries.meta` gelegt. Rückgängig hätte dann neue Postfach-Kopien gelöscht, die der Sync zwischenzeitlich eingetragen hat, und der Cursor holt sie nie wieder. Ersetzt durch `mail_copies` (Entscheidung 28).
- **Senden und Zurückholen konnten sich kreuzen:** Rückgängig las die Aktion ohne Sperre. Lief parallel der Sende-Job, stand die Mail danach wieder als Entwurf da, obwohl sie verschickt war. Jetzt sperrt Rückgängig die Aktionszeile.
- **pg-boss nimmt keine Jobs für eine Warteschlange an, die der Worker noch nicht angelegt hat.** Die Aktion „Senden“ war schon gespeichert, der Job nicht, und die Mail hätte für immer gewartet. Jetzt legt die App die Warteschlange bei Bedarf an, und der Worker holt Wartendes jede Minute nach.
- **Design, nicht gebaut** (steht nicht in der Bauvorlage; Frage unten): Löschen, Markieren (Fähnchen), Sortierung, „Entwurf mit Kollege“ und „Kollege weiß dazu“ im Schreibfeld.

### Befunde Stufe 4

Durch Tests gegen den echten IMAP-Server gefunden, mit Fixtures unsichtbar:
- **`SINCE` filtert nach dem Ablagedatum im Postfach, nicht nach dem Datum der Mail.** Eine alte, später abgelegte oder verschobene Mail wäre in den Import gerutscht. Jetzt gilt `SENTSINCE`, zusätzlich eine Prüfung auf Client-Seite.
- **Die Datumsgrenze ging nach dem ersten Paket verloren** (eigener Entwurfsfehler): Ältere Mails mit höherer UID wären dann doch gekommen. Die Grenze steht jetzt im Cursor, bis der Ordner durch ist.
- **`mailparser` fasst `List-*`-Kopfzeilen unter `list` zusammen.** Der Newsletter-Filter hätte `List-Unsubscribe` aus echten Postfächern nie gesehen. Die Kopfzeilen werden jetzt roh gelesen.
- **Erfundene IDs:** Verwies das Modell auf ein Objekt, das es nicht gibt, wäre die Zuordnung ins Leere gelaufen (`links.target_id` hat keinen Fremdschlüssel). Jetzt verhindert es das Schema schon beim Modell, und die Anwendung verwirft unbekannte IDs (`report.unknown`).

## Offene Fragen an Andreas

- **Design 05.10.** (E51–E62). Das Aussehen ist übernommen; was darüber hinaus neue Funktion wäre, ist nicht gebaut:
  - Events: Mitwirkende mit Rolle und Teilnehmende mit Excel-Import (E60). Braucht neue Tabellen und einen Import.
  - Social Media: ein Beitrag mit Fassungen je Kanal (E61); der Baum würde dann Beiträge statt Kanäle zeigen.
  - „Nachfassen“ mit einem Entwurf des Modells (E57). Jetzt schreibt „Jetzt erinnern“ eine feste Vorlage ohne Modell. Reicht das?
  - Wiedervorlage: Sollen Feiertage (Bayern) zählen? Jetzt nur Wochenenden.
  - Suche: „Zuletzt geöffnet“ braucht ein Protokoll, wer was geöffnet hat. Gewollt? Tippfehler-Toleranz (Trigramme) dazu?
  - „Nacheinander durchgehen“ für Entscheiden, „Archivieren“ im ⋯-Menü, Kontomenü-Punkte Profil und Benachrichtigungen (die Seiten gibt es nicht).
  - Kalender: Erinnerung, Wiederholung und Meeting-Link im Formular (E53); Feld „Was kam raus?“ in der Termin-Ansicht.
- **Hinweise** (Stufe 8): ~~vergangene Events schließen, Hinweise außerhalb der App, Rat auf der Seite des Themas~~ beantwortet und gebaut am 09.10. (Entscheidungen 47–51). Neu offen:
  - Team-Hinweise (z. B. eine Mail ans StartHub-Postfach wartet auf Antwort) gehören niemandem allein. Sie kommen jetzt nicht als Mitteilung. An wen sollen sie gehen – an die Person, die für das Thema zuständig ist, oder an alle?
  - Ruhezeit fest werktags 7–20 Uhr. Passt das, oder soll jede Person sie per Anweisung ändern können?
  - Beim automatischen Abschluss bleibt die Phase stehen (z. B. „Einladung raus“). Soll sie auf die letzte Phase („vorbei“) springen?
- **Test mit echten Konten** – was vor dem ersten Lauf noch fehlt:
  - Anmeldung: `next start` (Docker) hat noch keine Anmeldung, nur `npm run dev` den Dev-Login. Für einen Test allein am eigenen Rechner reicht der Dev-Login; für das Team braucht es den Magic-Link (Bauvorlage §3, „folgt“).
  - Team und Bereiche stehen fest in `fixtures/config.json`, der Seed legt dazu die erfundenen Testquellen an. Für echte Daten braucht es eine eigene Konfiguration ohne Testdaten (Vorschlag: `KOLLEGE_CONFIG=config/team.json`, Seed ohne Fixture-Quellen).
  - Mitteilungen auf dem Handy brauchen HTTPS (Service Worker). Lokal (`localhost`) gehen sie nur im Browser am selben Rechner.
- **Laufwerk** (Stufe 7):
  - Adresse der Freigabe (`\\…\…`) und ein Dienstkonto mit Lesezugriff beim Rechenzentrum erfragen. Kollege braucht nur Lesen.
  - Gibt es Ordner, die nicht ins Team gehören (Personal, Finanzen)? Sie lassen sich ausschließen, indem nur ein Unterordner eingehängt wird.
  - Sollen Hochladen, „Kollege fragen“ zu einer Datei und ein persönlicher Ordner dazukommen (Design, nicht in der Bauvorlage)?
- **Kalender** (Stufe 6):
  - Bietet das Uni-Webmail CalDAV, und unter welcher Adresse? Das fragt man das Rechenzentrum.
  - Outlook: Welche Art Konto nutzen die Kollegen? Ist Outlook nur mit dem Uni-Postfach über IMAP verbunden, liegt der Kalender meist nur lokal auf dem Rechner. Dann gibt es keine Schnittstelle, und der Kalender müsste ins Webmail oder nach iCloud umziehen. Bei einem Microsoft-Konto (Outlook.com/365) ginge es über Microsoft Graph; das steht in §12, ist aber nicht gebaut (Entscheidung 25 gilt für Mail).
  - Apple: Für iCloud braucht jede Person ein app-spezifisches Passwort (appleid.apple.com).
  - Sollen fremde Einladungen in Kollege angenommen oder abgelehnt werden können (Antwort an den Organisator)? Steht nicht in der Bauvorlage.
  - Sollen einzeln verschobene Termine einer Serie gelesen und Serien bearbeitbar werden?

- Rechenzentrum: Ist die Passwort-Anmeldung per IMAP für einen Dienst auf einem Server erlaubt (oder gibt es App-Passwörter)? Wie greift Kollege auf das StartHub-Postfach zu (eigene Kennung oder Funktionspostfach)?
- Betrieb: VM im Uni-Netz oder EU-Cloud + Laufwerks-Worker? (bis Stufe 7)
- EU-Modell für den Betrieb: Testphase mit Mistral (Entscheidung 24). Ob danach ein offenes Modell bei GWDG/STACKIT oder selbst betrieben folgt, entscheiden die Zahlen aus `npm run eval:chat` und die Vorgabe des Datenschutzbeauftragten (EU-Standort oder EU-Unternehmen).
- Klärungshinweis zu einer eingeschränkten Mail mit mehreren Berechtigten: Wer bekommt ihn? Jetzt geht er an die erste Person in `visible_to`.
- Rolle neuer Personen (founder/partner/…) aus der Rolle der Org ableiten?
- f5 (Folien ohne Text, allein im Ordner): Soll „Ordnername ≈ Vorgangstitel“ als feste Zuordnung gelten, oder soll das Modell auch ohne Textauszug mit den Metadaten gefragt werden?
- ~~e5 → gn_2025: An welcher Stelle wird der Vorgänger vorgeschlagen?~~ Beantwortet mit Entscheidung 41: als Frage im Rat (Stufe 8).
- f3 (Plätze 60): Soll das Modell Feldwerte für bestehende Vorgänge vorschlagen können? Das Schema §7.2.4 sieht das nicht vor.
- Ausschluss-Anweisungen im Filter (§7.2.1): Wie werden Anweisungen in Alltagssprache vor dem Modellaufruf angewendet? (Stufe 4)
- Chats löschen (Design: ChatListe „Löschen“)? Steht nicht in der Bauvorlage. Die Karten verweisen auf ihren Chat; ich würde „Archivieren“ statt Löschen vorschlagen.
- Entscheidungsmodelle wie Jev (Analyse 02.10.2026): jetzt nicht. Jev läuft nur in den USA und würde keinen Modellaufruf ersetzen, sondern einen hinzufügen. Später bewerten, ob es eine Open-Source-Variante gibt, die in der EU oder lokal läuft; Prüfgrundlage wäre `npm run eval:zuordnung` (Relevanz, Bereich, Kandidatenwahl) auf den erfundenen Fixtures.
- Ist die selbst eingeschätzte Sicherheit des Modells (high/medium/low) verlässlich? Vorschlag: die Korrekturquote je Stufe aus dem Aktionsprotokoll messen (SQL) und die Schwellen der Schranke danach setzen. Steht nicht in der Bauvorlage.
- Mail (Design E26/E38, nicht in der Bauvorlage): Sollen Löschen, Markieren (Fähnchen), Sortierung, „Entwurf mit Kollege“ und „Kollege weiß dazu“ (Zusagen zum Bezug beim Schreiben) dazukommen?
- „Alles rückgängig“ für eine Antwort mit mehreren Karten (aus dem Design der Quittung)?
- Was das Modell im Chat auf ausdrücklichen Wunsch anlegt („leg ein Event X an“), ist nach §6 trotzdem ungeprüft. So lassen oder bei Akteur `model` im Chat gleich übernehmen?

## Verbrauch

- Stufe 1: in dieser Sitzung nicht gemessen. Für eine Zahl bitte im Konto ablesen.
