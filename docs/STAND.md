# Stand

> Wird am Ende jeder Stufe aktualisiert. Kurz halten.

## Stufen

- [x] 1 Kern: Schema, RLS, Aktionsschicht + Rückgängig, Seed, Fixture-Import
- [ ] 2 Oberfläche: Heute, Bereiche, Aufgaben, Kontakte, Einstellungen
- [ ] 3 Eingabe & Chat
- [ ] 4 Mail-Eingang
- [ ] 5 Mail-Client
- [ ] 6 Kalender
- [ ] 7 Laufwerk
- [ ] 8 Hinweise & Rat

**Aktuell:** Stufe 1 abgeschlossen (01.10.2026). Als Nächstes Stufe 2.

## Stufe 1 – erledigt

- Docker Compose (postgres 16, app, worker; ein Image). `app` ist nur ein Gerüst mit Statusseite.
- Schema §4 komplett (Drizzle, `lib/db/schema.ts`), RLS, Funktionen und Trigger handgeschrieben (`lib/db/migrations/0001_rls.sql`).
- Die App arbeitet über `withUser()`: `SET LOCAL ROLE kollege_app` + `app.user_id`. Der Worker arbeitet über `withSystem()` als Tabelleneigentümer.
- Aktionsschicht `lib/actions/`: Registry, `runAction`, `undoAction` (Kinder zuerst, jüngste zuerst). `model` kann keine externe Aktion ausführen; das ist im Code erzwungen. Gebaut sind nur die Aktionen, die Stufe 1 braucht: `area.create`, `org.create`, `person.create`, `person.add_email`, `matter.create`, `entry.link`, `task.create`, `hint.create`, `hint.dismiss`.
- Seed aus `fixtures/config.json` (`npm run db:seed`): 3 Teammitglieder, 4 Bereiche, 8 Fixture-Quellen.
- Eingangsweg `lib/pipeline/`: Rohspeicherung (Blob + `entries`, Upsert über `dedupe_key`), Filter, feste Zuordnung, Kandidaten, Modell `fast` (Stufe 1: Orakel, `MODEL_FAST=oracle`), Schranke, Anhänge, Import mit `review_batch`. Der Worker führt die pg-boss-Jobs `import`, `sync` und `process` aus.
- Tests (59, `npm test`, brauchen ein lokales Postgres 16, siehe README): alle Abnahmen aus §13, alle `rls_checks` und alle `assert`-Einträge aus `expected.json`, die zu Stufe 1 gehören. Ein Test schlägt fehl, wenn `expected.json` einen Prüfschlüssel bekommt, der weder geprüft noch ausdrücklich zurückgestellt ist. `tsc --noEmit` ist sauber.

## Entscheidungen (mit Andreas, 01.10.2026)

1. **Infrastruktur-Ausnahme:** Diese Schreibvorgänge laufen direkt, nicht über `runAction`: Rohspeicherung, `visible_to` erweitern, Verarbeitungsstand (`processing_state`, `summary`, `author_person_id`, `meta.skip_reason`), Cursor, Seed von `users`/`connections`. Alles mit Bedeutung läuft über Aktionen.
2. **Klärungsknöpfe** leitet die Pipeline ab, das Schema bleibt. Beispiel: Absender unbekannt + genau ein Kandidat mit gleichem Vornamen → „Ja, das ist X“ (`person.add_email`), dazu immer „Nein/Verwerfen“.
3. **`actions` sieht die App-Rolle nur für eigene Aktionen.** `reason` kann aus eingeschränkten Mails zitieren.
4. **app-Container** in Stufe 1 nur als Gerüst.
5. **Filter „rein intern“ gilt nur für Mails.** Interne Termine bewertet das Modell (e3 → `relevant:false`, Grund `irrelevant`). `expected.json` ist entsprechend angepasst. Grund: Bei Terminen sind die Eingeladenen nicht das Publikum (Gründungsnacht).

## Befunde aus dem Bau

- **§7.2.1 weicht ab** (Entscheidung 5). Die Bauvorlage sollte „Rein intern (nur Mails)“ sagen.
- **`relevant:false`** führt zu `skipped` (Grund `irrelevant`) ohne Verknüpfung. Das betrifft m11 und e3.
- **Reihenfolge beim Import:** f3 (Datei, 29.09.) verweist auf die Gründungsnacht 2026, die erst e5 (Termin am 20.11.) anlegt. Der Import verarbeitet deshalb erst Mails, dann Termine, dann Dateien, jeweils chronologisch. Mit echtem Modell würde die Datei in umgekehrter Reihenfolge einen neuen Vorgang vorschlagen, und es entstünde ein Duplikat. Merge-Fälle sind also zu erwarten.
- **Kandidatensuche:** `plainto_tsquery` verlangt alle Wörter des Titels. Bei f3 fehlte deshalb „Gründungsnacht 2026“ unter den Kandidaten, weil „20.11.2026“ nicht als „2026“ zählt. Das Orakel stört das nicht, für Stufe 4 ist es aber wichtig. Die Pipeline meldet solche Fälle als `notInCandidates`.
- **Soll-Endzustand in `expected.json`:** Der Teil `matters`/`people` ist nicht vollständig aus dem Eingangsweg ableitbar. Zuständige, Personenrollen (founder/partner/…), Felder (Datum, Plätze), `status=done` (gn_2025) und Vorgänger liefert weder das Schema §7.2.4 noch eine Regel. Stand jetzt:
  - Vorgänge des Systems haben keinen Zuständigen. Das passt zu m10 („niemand zuständig“), widerspricht aber `matters[].owner`.
  - Personen haben die Rolle `other`.
  - Die Tests prüfen Namen, Bereiche, Org-Zuordnung, Domains und E-Mails, nicht aber die übrigen Angaben.
- **„medium → als ungeprüft markieren“:** `links` haben keinen `review_state`. Neue Objekte sind ohnehin ungeprüft. Wird mit `medium` einem bestehenden Vorgang zugeordnet, steht nur `confidence=medium` am Link.
- **Anhänge:** Ein Link Anhang→Mail ist in `links` nicht vorgesehen (nur matter/person/org), er steht deshalb in `meta.mail_entry_id`. Eine Zusammenfassung gibt es nicht, weil das Orakel keine liefert.
- **Org-Domains** werden aus den Adressen der neuen Personen derselben Org abgeleitet (ohne Freemail, ohne Team). Das ist nötig für die feste Zuordnung, steht aber nicht ausdrücklich in §7.
- **Fristen:** Das Modell liefert ein Datum, gespeichert wird `due_at` = 23:59:59 Berlin an diesem Tag.
- **Konnektor-Interface:** `sync` liefert zusätzlich `errors` (nicht lesbare Elemente → Eintrag `kind=system`, Cursor läuft weiter, §12).
- **Mails ohne Message-ID** werden als Fehler-Eintrag abgelehnt. Die Formulierung „Message-ID ohne Quelle“ in §12 ist so ausgelegt.
- **Rückgängig** wirkt nur auf eigene Aktionen (Entscheidung 3). Folgeschritte anderer Akteure unter einer Nutzeraktion sähe `undoAction` nicht. In Stufe 1 kommt das nicht vor, für Stufe 2 ist es zu klären (siehe Fragen).
- **`created_by_type`** kennt nur `user|system`. Was der Akteur `model` anlegt, zählt als `system` und ist ungeprüft.
- **Rollen:** Es gibt eine Login-Rolle (eine `DATABASE_URL`, §14), die App wechselt per `SET LOCAL ROLE`. Strenger wäre ein eigener Login für die App ohne Mitgliedschaft in der Eigentümerrolle.
- **Noch nicht gebaut**, weil in Stufe 1 nicht gebraucht:
  - Verschlüsselung von `connections.config` mit `APP_SECRET`: Fixture-Quellen haben keine Geheimnisse, das kommt mit Stufe 4.
  - Tabelle `model_calls` (§9): kommt mit dem echten Modell.
  - Ausschluss-Anweisungen im Filter: Anweisungen gibt es erst ab Stufe 3.
- **Termine** sieht nur, wem der Kalender gehört. Das ist die restriktive Wahl, siehe Fragen.
- **Docker** ist hier nicht gelaufen, weil die Umgebung keinen Daemon hat. `docker compose config` ist gültig. Seed, Worker (Import, 8 Zeitpläne) und App (`next start`) habe ich lokal mit denselben Befehlen gefahren.
- **`npm audit`** meldet 4 Fälle „moderate“ in `drizzle-kit` (esbuild-Dev-Server). Das betrifft nur die Entwicklung.

## Offene Fragen an Andreas

- Mailzugang der Uni: IMAP oder Microsoft Graph? (bis Stufe 4)
- Betrieb: VM im Uni-Netz oder EU-Cloud + Laufwerks-Worker? (bis Stufe 7)
- EU-Modell für den Betrieb (parallel zum Test)
- Wo liegt die Team-Konfiguration (Team-Domain, Freemail-Liste) im Betrieb? Stufe 1 liest `fixtures/config.json`.
- Termine: nur für den Kalenderbesitzer sichtbar (jetzt) oder auch für eingeladene Teammitglieder?
- Klärungshinweis zu einer eingeschränkten Mail mit mehreren Berechtigten: Wer bekommt ihn? Jetzt geht er an die erste Person in `visible_to`.
- Zuständige für Vorgänge, die das System anlegt: leer lassen (jetzt, wie m10) oder Besitzer des Postfachs?
- Rolle neuer Personen (founder/partner/…) aus der Rolle der Org ableiten?
- f5 (Folien ohne Text, allein im Ordner): Soll „Ordnername ≈ Vorgangstitel“ als feste Zuordnung gelten, oder soll das Modell auch ohne Textauszug mit den Metadaten gefragt werden?
- e5 → gn_2025: An welcher Stelle wird der Vorgänger vorgeschlagen (Eingangsweg oder erst Rat in Stufe 8)?
- f3 (Plätze 60): Soll das Modell Feldwerte für bestehende Vorgänge vorschlagen können? Das Schema §7.2.4 sieht das nicht vor.
- Rückgängig von Systemschritten durch Nutzer (Stufe 2): über eine geprüfte `SECURITY DEFINER`-Funktion?
- Ausschluss-Anweisungen im Filter (§7.2.1): Wie werden Anweisungen in Alltagssprache vor dem Modellaufruf angewendet? (ab Stufe 3)

## Verbrauch

- Stufe 1: in dieser Sitzung nicht gemessen. Für eine Zahl bitte im Konto ablesen.
