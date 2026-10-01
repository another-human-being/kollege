# Stand

> Wird am Ende jeder Stufe aktualisiert. Kurz halten.

## Stufen

- [x] 1 Kern: Schema, RLS, Aktionsschicht + Rückgängig, Seed, Fixture-Import
- [x] 2 Oberfläche: Heute, Bereiche, Aufgaben, Kontakte, Einstellungen
- [ ] 3 Eingabe & Chat
- [ ] 4 Mail-Eingang
- [ ] 5 Mail-Client
- [ ] 6 Kalender
- [ ] 7 Laufwerk
- [ ] 8 Hinweise & Rat

**Aktuell:** Stufe 2 abgeschlossen (02.10.2026). Als Nächstes Stufe 3.

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
  - Tabelle `model_calls` (§9): kommt mit dem echten Modell.
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
- **„Heute“ zeigt Serientermine nur an ihrem ersten Tag** (e6, RRULE). Das Auflösen von Serien gehört zu Stufe 6.
- **Gründungsteams-Liste:** Ob ein Team „offen“ oder „erledigt“ ist, wird aus seinen Themen abgeleitet: offen, solange ein Thema offen ist oder es noch keins gibt.
- **E23 („alles, was der Chat kann, geht auch von Hand“) widerspricht §11** („keine eigenen Felder für … neue Anweisung“). Es gilt die Bauvorlage: Anweisungen entstehen per Chat (Stufe 3), die Einstellungen können sie ändern und löschen.
- **Auth.js v5** ist weiterhin Beta. Die Version ist exakt gepinnt (`next-auth@5.0.0-beta.32`). Der Magic-Link wird Tabellen für Verifizierungs-Tokens brauchen, die nicht in §4 stehen.
- **`next dev` schreibt** in CLAUDE.md einen eigenen Regelblock, sobald es einen KI-Agenten erkennt. Ich habe ihn zurückgenommen und nicht committet; für Rauchtests nutze ich `next start`.
- **Noch nicht gebaut**, weil es zu späteren Stufen gehört bzw. nicht in der Abnahme steht:
  - `matter.handover` (der Hinweis gehört zu Stufe 8),
  - `person.merge` und `org.merge` (später, Entscheidung 14),
  - Notizen anlegen (läuft per Chat, Stufe 3).

## Offene Fragen an Andreas

- Mailzugang der Uni: IMAP oder Microsoft Graph? (bis Stufe 4)
- Betrieb: VM im Uni-Netz oder EU-Cloud + Laufwerks-Worker? (bis Stufe 7)
- EU-Modell für den Betrieb (parallel zum Test)
- Klärungshinweis zu einer eingeschränkten Mail mit mehreren Berechtigten: Wer bekommt ihn? Jetzt geht er an die erste Person in `visible_to`.
- Rolle neuer Personen (founder/partner/…) aus der Rolle der Org ableiten?
- f5 (Folien ohne Text, allein im Ordner): Soll „Ordnername ≈ Vorgangstitel“ als feste Zuordnung gelten, oder soll das Modell auch ohne Textauszug mit den Metadaten gefragt werden?
- e5 → gn_2025: An welcher Stelle wird der Vorgänger vorgeschlagen (Eingangsweg oder erst Rat in Stufe 8)?
- f3 (Plätze 60): Soll das Modell Feldwerte für bestehende Vorgänge vorschlagen können? Das Schema §7.2.4 sieht das nicht vor.
- Ausschluss-Anweisungen im Filter (§7.2.1): Wie werden Anweisungen in Alltagssprache vor dem Modellaufruf angewendet? (ab Stufe 3)

## Verbrauch

- Stufe 1: in dieser Sitzung nicht gemessen. Für eine Zahl bitte im Konto ablesen.
