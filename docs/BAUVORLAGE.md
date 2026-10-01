# Kollege – Bauvorlage

> **Stand:** 01.10.2026 · **Arbeitsname:** Kollege · **Zielgruppe:** StartHub (Gründungszentrum Uni Augsburg), 5–8 Personen
> **Diese Datei ist die maßgebliche Spezifikation.** Bei Widerspruch gilt sie vor allem anderen im Repo. Was hier nicht steht, wird nicht gebaut, sondern als Frage in `docs/STAND.md` notiert.

---

## 1. Worum es geht

Kollege ist ein ruhiger, mitdenkender Kollege für ein kleines Team. Er liest mit, was in Mail, Kalender und Dateien passiert, verknüpft es mit Personen, Gründungsteams, Events, Lehrveranstaltungen und Beiträgen, erinnert an Zusagen und bereitet nächste Schritte vor. Man kann **im System arbeiten** (Mails lesen und schreiben, Termine, Aufgaben, Kontakte, Dateien) – oder weiter in Outlook. Das System sieht beides.

**Das Kernversprechen:** Niemand muss dokumentieren. Kontext entsteht nebenbei, ist überall dort sichtbar, wo man arbeitet, und das System meldet sich, wenn etwas liegen bleibt.

### Die vier Architektur-Sätze (jede neue Funktion muss hineinpassen)

1. **Alles ist ein Eintrag.** Mail, Termin, Datei, Notiz, Anweisung – alles kommt über denselben Weg herein und liegt in `entries`.
2. **Jede Änderung ist eine Aktion.** Alles, was Daten verändert, läuft über die Aktionsschicht, wird protokolliert und ist, wo möglich, umkehrbar. UI-Knöpfe und das Modell benutzen **dieselben** Aktionen.
3. **Jede Ansicht ist eine Abfrage.** Heute, Bereiche, Aufgaben, Kontakte, Kalender sind Abfragen auf dieselben Tabellen – keine Module.
4. **Jedes Denken ist ein Modellaufruf mit Kontext aus Sicht des Nutzers.** Kontext wird mit den Rechten des fragenden Nutzers geladen; das Modell sieht nie mehr als der Mensch, für den es arbeitet.

### Bauregel

Feste Struktur nur dort, wo Code sie braucht: um zu **verknüpfen**, um zu **wissen, wann** etwas fällig ist, und um Handlungen **erlauben und rückgängig machen** zu können. Alles andere bleibt Text, den das Modell liest.

### Nicht-Ziele (V1)

Keine Regel-Engine, keine Workflow-Engine, keine Module pro Ablauf, kein eigener Kalender-Sync zwischen Anbietern, keine Vektordatenbank (Volltextsuche reicht vorerst), kein Agenten-Framework, keine Microservices, kein Veröffentlichen auf Social Media, kein Bearbeiten von Office-Dateien im Browser, keine Sprachnotizen.

---

## 2. Begriffe (Oberfläche ↔ Code)

| Oberfläche (deutsch) | Code | Bedeutung |
|---|---|---|
| Bereich (Gründungsteams, Events, Lehre, Social Media) | `areas` | konfigurierbare Sicht + Art eines Vorgangs |
| Event, Lehrveranstaltung, Beitrag, Thema | `matters` | der eine Behälter; heißt in der UI so wie sein Bereich ihn nennt. **Das Wort „Vorgang" erscheint nie in der UI.** |
| Kontakt (Person / Organisation) | `people`, `orgs` | Gründungsteams sind `orgs` mit `role='founding_team'` |
| Aufgabe / Zusage | `tasks` | ein Objekt mit Richtung: `ours` (wir schulden) oder `theirs` (uns wird geschuldet) |
| Eintrag (Mail, Termin, Datei, Notiz) | `entries` | alles, was passiert ist |
| Anweisung | `entries` mit `kind='instruction'` | Regeln in Alltagssprache, inkl. Ausschlüsse |
| Hinweis | `hints` | alles, was das System von sich aus sagt (inkl. Klärungsfragen) |
| Ungeprüft | `review_state='unreviewed'` | vom System angelegt, noch nicht übernommen |

---

## 3. Technik

- **Ein Repo, ein Server, drei Container** (`docker-compose.yml`): `postgres` (16), `app` (Next.js, App Router, TypeScript strict), `worker` (Node, TypeScript, gleicher Code-Baum).
- **Datenbank:** Postgres mit Volltextsuche (`german`), Zeilen-Sicherheit (RLS), **pg-boss** als Warteschlange und Zeitplan. Kein Redis, kein pg_cron.
- **ORM/Migrationen:** Drizzle für Schema und Typen; RLS-Policies, Funktionen und Indizes als handgeschriebene SQL-Migrationen.
- **Login:** Auth.js (Magic-Link per Mail). In Entwicklung zusätzlich ein Dev-Login ohne Mail (nur bei `NODE_ENV=development`).
- **Modelle:** Vercel AI SDK (`ai`), Provider `@ai-sdk/anthropic` und `@ai-sdk/openai-compatible`. Zwei Rollen: `fast` (Lesen, Zuordnen) und `think` (Chat, Rat, Entwürfe). Welches Modell hinter einer Rolle steht, ist **nur Konfiguration** (`.env`). Kein Jev.
- **Dateien:** Rohdaten (Mail-Originale, Anhänge, Dateikopien) im Volume `/data/blobs`, Pfad = SHA-256 des Inhalts. Textauszug: `pdf-parse` (PDF), `mammoth` (DOCX), `xlsx` (XLSX/CSV), sonst nur Metadaten.
- **Tests:** Vitest (Einheiten, Aktionen, RLS gegen echte Test-DB), Playwright nur für 3–4 Kernabläufe.
- **UI:** React-Komponenten nach dem Design System in `design/` (Tokens, Bausteine, Prototyp als Referenz). Farben, Abstände, Schriften nur über Tokens.

Verzeichnisstruktur (Vorschlag):

```
app/            Next.js (Seiten, API-Routen)
components/     UI-Bausteine (nach design/)
lib/db/         Schema, Migrationen, Verbindung mit Nutzer-Kontext
lib/actions/    Aktionsschicht (Registry, Ausführung, Rückgängig)
lib/model/      Modellrollen, Prompts, Schemas
lib/pipeline/   Filter, Zuordnung, Verarbeitung
lib/connectors/ mail/, calendar/, drive/  (je: sync, write)
lib/views/      Abfragen für Heute, Bereiche, Listen
worker/         Job-Definitionen (pg-boss)
fixtures/       erfundene StartHub-Testdaten
design/         Design System (Referenz, nicht anfassen ohne Grund)
docs/           BAUVORLAGE.md, STAND.md
```

---

## 4. Datenmodell

Alle Tabellen: `id uuid pk default gen_random_uuid()`, `created_at`, `updated_at`. Zeitstempel als `timestamptz`, Zeitzone der App `Europe/Berlin`.

### 4.1 `users`
`name`, `email` (unique), `is_admin bool`.

### 4.2 `connections` – verbundene Quellen
`user_id` (null = Team-Quelle, z. B. StartHub-Postfach), `kind` (`mail|calendar|drive`), `provider` (`imap|graph|caldav|smb|fixture`), `label`, `config jsonb` (Geheimnisse verschlüsselt mit `APP_SECRET`, nie im Klartext), `cursor jsonb` (Sync-Stand), `status` (`ok|error|disabled`), `last_sync_at`, `last_error`, `import_since date` (Standard: heute − 12 Monate).

### 4.3 `areas` – Bereiche
`key` (unique, z. B. `founding_teams`), `name_singular`, `name_plural`, `description` (für das Modell: was gehört hierher), `matter_kind` (`org_based|dated|period|item` – steuert nur Darstellung), `fields jsonb` (max. 5: `{key,label,type: text|date|person|number|select, options?}`), `phases text[]` (optional, einfache Auswahl, **kein Workflow**), `sort int`, `actions jsonb` (Knöpfe, z. B. `["new","from_previous"]`).

Start-Bereiche (Seed, vom Team änderbar):

| key | Plural | Felder | Phasen |
|---|---|---|---|
| `founding_teams` | Gründungsteams | Phase, betreut von, nächster Schritt | Idee, Vorgründung, gegründet |
| `events` | Events | Datum, Ort, Plätze, Anmeldungen | Planung, Einladung raus, vorbei |
| `teaching` | Lehre | Semester, Veranstaltungsart | – |
| `social` | Social Media | geplant für, Kanal | Entwurf, geplant, veröffentlicht |

Gründungsteams sind ein Sonderfall: Die Liste zeigt `orgs` mit `role='founding_team'`; deren Themen (z. B. „EXIST-Antrag") sind `matters` im Bereich `founding_teams` mit `org_id`.

### 4.4 `orgs` – Organisationen
`name`, `role` (`founding_team|partner|university|other`), `domains text[]` (für feste Zuordnung; Freemail-Domains nie), `fields jsonb` (Bereichsfelder für Gründungsteams), `phase`, `owner_user_id` (betreut von), `review_state` (`unreviewed|accepted|discarded`), `discard_reason`, `merged_into_id`.

### 4.5 `people` + `person_emails`
`people`: `name`, `org_id`, `role` (`founder|mentor|partner|speaker|university|other`), `notes`, `review_state`, `discard_reason`, `merged_into_id`.
`person_emails`: `person_id`, `email` (unique, lowercase), `source` (`mail|calendar|manual`), `confirmed bool`.

### 4.6 `matters` – Events, Lehrveranstaltungen, Beiträge, Themen
`area_id`, `title`, `owner_user_id`, `status` (`open|done`), `phase`, `fields jsonb`, `org_id` (gehört zu Kontakt, optional), `parent_id` (gehört zu anderem Vorgang, **genau eine Ebene**: Check, dass der Parent selbst keinen Parent hat), `date_start`, `date_end`, `predecessor_id` (Vorjahr / letztes Semester), `review_state`, `discard_reason`, `created_by_type` (`user|system`), `outcome_note` (Antwort auf „Wie lief's?").
„wartet" und „hängt" werden **berechnet**, nicht gespeichert (siehe 8.2).

### 4.7 `entries` – das Atom
`kind` (`mail|event|file|note|instruction|system`), `connection_id`, `external_id`, `dedupe_key` (unique; Mail: Message-ID; Termin: iCalUID; Datei: Pfad + Inhalts-Hash; Notiz: uuid), `thread_key` (Mail: Graph-conversationId oder aus References/In-Reply-To), `occurred_at`, `author_user_id`, `author_person_id`, `title`, `body_text`, `summary`, `blob_path`, `meta jsonb` (Mail: from/to/cc/flags/folder; Termin: start/end/location/attendees; Datei: path/size/mime), `visibility` (`team|restricted`), `visible_to uuid[]` (bei `restricted`: Nutzer, die das sehen dürfen), `instruction_area_id`, `instruction_user_id` (bei Anweisungen: Geltungsbereich), `historical bool` (aus Import), `processing_state` (`pending|done|error|skipped`), `search tsvector` (generiert aus title, body_text, summary).

### 4.8 `links`
`entry_id`, `target_type` (`matter|person|org`), `target_id`, `origin` (`rule|model|human`), `confidence` (`high|medium|low`), `action_id`. Unique (entry_id, target_type, target_id).

### 4.9 `tasks` – Aufgaben und Zusagen
`title`, `direction` (`ours|theirs`), `owner_user_id` (bei `ours`), `owner_person_id` (bei `theirs`), `due_at`, `status` (`open|done`), `done_at`, `matter_id`, `org_id`, `source_entry_id`, `visibility` (`team|private`), `owner_of_private` (user), `action_id`.

### 4.10 `actions` – Protokoll und Rückgängig
`actor_type` (`user|system|model`), `actor_user_id`, `type`, `payload jsonb`, `inverse jsonb` (null = nicht umkehrbar), `parent_action_id` (Folgeschritte), `reason` (Begründung, z. B. Belegzitat), `applied_instruction_ids uuid[]`, `chat_id`, `undone_at`, `undone_by`.

### 4.11 `hints` – alles, was das System von sich aus sagt
`user_id` (null = Team), `kind` (`clarify|overdue|waiting|stale|after_event|outcome|handover|review_batch|advice`), `text`, `reason`, `area_id`, `target_type`, `target_id`, `options jsonb` (Knöpfe: `{label, action_type, payload}`), `status` (`open|done|dismissed`), `show_from`, `dedupe_key` (unique, damit Hinweise nicht doppelt entstehen).

### 4.12 `chats` + `chat_messages`
`chats`: `user_id`, `title`, `context_type`, `context_id`, `pinned`. **Nur für den Besitzer sichtbar.**
`chat_messages`: `chat_id`, `role` (`user|assistant`), `content jsonb` (Text, Quellenverweise, Aktionskarten).

---

## 5. Sichtbarkeit und Rechte (in Postgres, nicht im App-Code)

**Grundregel:** Jede Datenbankverbindung im App-Kontext setzt `SET LOCAL app.user_id = '<uuid>'`. RLS-Policies lesen diesen Wert. Auch der Kontext für das Modell wird so geladen.

| Objekt | Wer sieht es |
|---|---|
| `matters`, `orgs`, `people`, `areas`, `hints` (Team) | alle Teammitglieder |
| `tasks` | alle; `visibility='private'` nur Besitzer |
| `entries` mit `visibility='team'` | alle (StartHub-Postfach, Team-Notizen, Dateien in geteilten Ordnern) |
| `entries` mit `visibility='restricted'` | nur Nutzer in `visible_to` (Mail im eigenen Postfach, private Notiz) |
| `chats`, `chat_messages`, persönliche Anweisungen, persönliche Hinweise | nur Besitzer |

**Mail-Regel:** Eine Mail sieht, wer sie im verbundenen Postfach hat (Empfänger, CC, Absender). Kommt dieselbe Mail (gleiche Message-ID) in mehreren Postfächern vor, ist es **ein** Eintrag mit mehreren Nutzern in `visible_to`. StartHub-Postfach → `visibility='team'`.

**Abgeleitetes ist Arbeitskoordination und für das Team sichtbar:** Vorgänge, Zuordnungen, Aufgaben und Zusagen, die aus einer eingeschränkten Mail entstehen. Nicht sichtbar ist der Mailtext.

**Platzhalter:** Funktion `entry_stubs(target_type, target_id)` (SECURITY DEFINER) liefert für nicht sichtbare Einträge nur `kind`, `occurred_at` und Besitzer-Namen („Mail von Julia · 21.09. · Inhalt nur für Julia"). Kein Betreff, kein Text.

**Worker** läuft mit einer Rolle, die RLS umgeht (er muss alles verarbeiten), schreibt aber ausschließlich über die Aktionsschicht.

---

## 6. Aktionsschicht

Eine Registry in `lib/actions/`. Jede Aktion hat: `type`, Zod-Schema für `payload`, `apply(tx, payload, ctx) → { result, inverse | null }`, `external: bool`, `allowedActors`.

`runAction(actor, type, payload, opts)` – in einer Transaktion: prüft Schema und Rechte, wendet an, schreibt `actions`-Zeile, gibt Ergebnis + Aktions-ID zurück. Folgeschritte bekommen `parent_action_id`.

`undoAction(actionId, user)` – wendet `inverse` an, rekursiv zuerst alle Kinder (jüngste zuerst), setzt `undone_at`. Externe Aktionen (`inverse = null`) sind nicht umkehrbar; die UI zeigt dann keinen Rückgängig-Knopf.

**Aktionen V1:**
- Vorgänge: `matter.create`, `matter.update` (Titel, Felder, Phase, Daten), `matter.set_status`, `matter.assign`, `matter.handover` (erzeugt Hinweis `handover` für Empfänger), `matter.create_from_previous`
- Kontakte: `person.create|update|merge`, `org.create|update|merge`, `person.add_email`
- Zuordnung: `entry.link`, `entry.unlink`, `entry.relink`
- Prüfen: `review.accept`, `review.discard` (mit optionalem Grund → wird Korrekturbeispiel), jeweils auch als Sammelaktion
- Aufgaben: `task.create|update|complete|reopen|assign`
- Notizen & Anweisungen: `note.create|update`, `instruction.create|update|delete`
- Bereiche: `area.create|update`
- Hinweise: `hint.create|resolve|dismiss`
- Mail: `mail.draft` (intern), `mail.send` (**extern**), `mail.mark_read|archive` (zurück ins Postfach)
- Kalender: `event.create|update|cancel` (**extern**, wenn Teilnehmende außerhalb des Teams)

**Autonomie-Regel (hart im Code, nicht nur im Prompt):**
- Akteur `model` darf **keine** externe Aktion ausführen. Es darf nur `mail.draft` bzw. Termin-Entwürfe anlegen; Senden ist immer ein Klick des Nutzers.
- Akteur `system`/`model` darf intern und umkehrbar handeln (verknüpfen, Aufgabe anlegen, Erinnerung, Person anlegen als ungeprüft).
- Vom System neu angelegte Vorgänge, Personen und Organisationen haben immer `review_state='unreviewed'`.

---

## 7. Eingangsweg (Worker)

Ein Weg für alles. Jobs in pg-boss.

1. **`sync:<connection>`** (Zeitplan, z. B. alle 2 Min. Mail, 10 Min. Kalender, 30 Min. Laufwerk): Konnektor liefert Änderungen seit `cursor`. Jeder Eingang wird zuerst **roh gespeichert** (Blob + `entries` mit `processing_state='pending'`), Upsert über `dedupe_key`. Bereits bekannte Mail aus weiterem Postfach → nur `visible_to` erweitern. Danach `process:<entry>` einreihen.
2. **`process:<entry>`**:
   1. **Filter:** `List-Unsubscribe`, `Precedence: bulk`, noreply-Absender, Ausschluss-Anweisungen → `skipped` (bleibt gespeichert, wird nicht verknüpft). **Rein intern** (alle Beteiligten haben Team-Adressen, keine Externen) → `skipped`, außer jemand ordnet es von Hand zu.
   2. **Feste Zuordnung:** Absender/Empfänger-Adressen → `person_emails`; Domain → `orgs.domains` (Freemail-Liste aus Konfiguration ausgenommen, Team-Domain ausgenommen); `thread_key` → Vorgänge früherer Einträge im selben Thread; Termin-Teilnehmende → Personen; Dateien: liegt im selben Ordner bereits eine zugeordnete Datei, gilt deren Vorgang als fester Kandidat.
   3. **Kandidaten:** Volltextsuche + feste Treffer → bis zu 5 Vorgänge, 5 Personen, 3 Organisationen.
   4. **Modell `fast`, eine strukturierte Antwort** (Zod-Schema, `lib/model/schemas.ts`):
      `{ relevant, area_key?, matter: {id} | {new: {title, area_key, fields}} | null, people: [{id} | {new: {name, email, org?}}], org?, tasks: [{title, direction, owner_hint, due?, quote}], summary, confidence: high|medium|low, question? }` – „keiner davon / neu" ist immer eine erlaubte Option.
   5. **Schranke:** feste Zuordnung oder `confidence=high` → still über Aktionen anwenden (Akteur `system`). `medium` → anwenden + als ungeprüft markieren. `low` → nichts anwenden, Hinweis `clarify` mit der Frage und 2–3 Antwortknöpfen.
   6. Anhänge: Text extrahieren, kurze Zusammenfassung (`fast`), als eigener `file`-Eintrag mit Link zum Mail-Eintrag.
3. **Import** (Erstverbindung, „weitere Vergangenheit"): derselbe Weg mit `historical=true`, gebündelt, niedrige Priorität. Aufgaben nur, wenn das Modell sie als **noch offen** erkennt. Am Ende ein Hinweis `review_batch` („214 ungeprüft – prüfen").
4. **Lernen aus Korrekturen:** `review.discard` mit Grund, `entry.relink`, `person.merge` werden als Korrekturbeispiele gespeichert (letzte 20 relevante) und dem `fast`-Aufruf mitgegeben.

**Rückschreiben:** `mail.mark_read|archive|send` und `event.*` schreiben über den Konnektor zurück. Eine aus Kollege gesendete Mail landet im Gesendet-Ordner und wird beim nächsten Sync über die Message-ID als derselbe Eintrag erkannt.

---

## 8. Ansichten (Abfragen in `lib/views/`)

### 8.1 Heute
Für den Nutzer (Umschalter Meins/Team), sortiert nach Dringlichkeit:
offene Hinweise (`hints`), heute fällige und überfällige Aufgaben, „wartet auf uns" (Mails/Anfragen ohne Antwort von uns), „wir warten auf" (`tasks.direction='theirs'` offen/überfällig), heutige Termine. Jeder Punkt trägt Bereich als Etikett, Grund und Beleg.

### 8.2 Berechnete Zustände (SQL, kein Modell)
- **wartet** = Vorgang offen, keine offene Aufgabe `ours`, mind. eine offene `theirs`.
- **hängt** = Vorgang offen und seit N Tagen kein Eintrag (N aus Anweisung des Bereichs, Standard 21).
- **wartet auf uns** = letzte Mail im Thread kam von extern, ist älter als 2 Werktage, keine Antwort aus Team-Postfächern.

### 8.3 Bereichsliste und Detail
Eine Liste-plus-Detail-Vorlage, Spalten aus `areas.fields`. Filter: Phase, zuständig, offen/erledigt, ungeprüft. Detail: Bereichsfelder (KI-gesetzte Werte als „KI-Vermutung" bis bestätigt), nächster Schritt, Zusagen in zwei Spalten (wir / sie), Notizen & Protokolle, Verlauf (streng chronologisch, Platzhalter für nicht sichtbare Einträge, Systemschritte zusammengefasst), Bezüge, Dateien.

---

## 9. Modellschicht

`lib/model/`: `getModel(role)` liest Provider und Modell-ID aus `.env` (`MODEL_FAST`, `MODEL_THINK`, `MODEL_BASE_URL` für OpenAI-kompatible EU-Anbieter). Jeder Aufruf wird protokolliert (Rolle, Modell, Tokens, Dauer, Zweck) – Tabelle `model_calls` (einfach, nur für Kosten und Fehlersuche).

### 9.1 Chat
`streamText` mit Rolle `think`. Werkzeuge:
- **Lesen:** `search(query, filters)`, `get_matter(id)`, `get_contact(id)`, `list_tasks(filter)`, `get_area_items(area, filter)`, `stats(name, params)` – `stats` führt nur **vordefinierte, benannte** Abfragen aus (z. B. `count_matters_by_phase`), nie freies SQL.
- **Handeln:** alle internen Aktionen aus Abschnitt 6 (Akteur `model`, im Namen des Nutzers, mit dessen Rechten). Jede Aktion erzeugt im Chat eine **Karte** (was eingetragen wurde, Link, Rückgängig, Folgeschritte).
- Kontext vorab: Seite, von der aus gefragt wird (Vorgang/Kontakt), gültige Anweisungen (persönlich > Bereich > Team), heutiges Datum.

### 9.2 Denkweise (System-Prompt, `lib/model/prompts/denkweise.md`)
1. Du bist ein ruhiger Kollege im StartHub. Du sprichst deutsch, duzt, schreibst kurz, ohne Ausrufezeichen und Emojis.
2. Alles Bleibende gehört in den Datenbestand – nicht nur in deine Antwort. Wenn du etwas notierst, zuordnest oder anlegst, tu es über ein Werkzeug, damit eine Karte entsteht.
3. Unterscheide immer: **belegt** (mit Quelle), **berechnet** (aus Daten), **Vermutung** (deine Einschätzung, als solche gekennzeichnet).
4. Zahlen und Daten kommen aus Werkzeugen, nie aus dem Gedächtnis. Jede Tatsachenbehauptung verweist auf ihren Eintrag.
5. Reicht die Erfahrung nicht (weniger als 2 vergleichbare Fälle), sag: „Dazu habe ich noch zu wenig Erfahrung." Rate nicht.
6. Achte auf Zusagen beider Seiten: wer schuldet wem was bis wann.
7. Bei Übergaben mach den Stand explizit: nächster Schritt, offene Zusagen, letzte Ereignisse.
8. Nach außen schreibst du nur Entwürfe. Senden entscheidet der Mensch.
9. Bei Unsicherheit über Personen oder Zuordnung: genau eine konkrete Frage mit Antwortmöglichkeiten.
10. Befolge Anweisungen des Teams; nenne in der Karte, welche Anweisung du angewendet hast. Bei Widerspruch gilt: persönlich vor Bereich vor Team.

### 9.3 Rat aus früheren Fällen (Stufe 8)
Bei `matter.create` in einem Bereich mit `predecessor_id` oder ähnlichen erledigten Vorgängen: `think` liest Vorgänger (Einträge, Zusagen, `outcome_note`, per SQL berechnete Zahlen) und erzeugt höchstens einen Hinweis `advice` mit konkretem Vorschlag und Belegen.

---

## 10. Hinweise und Momente (Stufe 8)

Fast alle Hinweise sind **SQL-Regeln** (billig, vorhersagbar), täglich 06:30 und nach jedem Sync:

| kind | Auslöser |
|---|---|
| `overdue` | Aufgabe `ours` überfällig |
| `waiting` | Zusage `theirs` überfällig oder Mail „wartet auf uns" |
| `stale` | Vorgang „hängt" |
| `after_event` | Termin mit Externen vor ≤ 1 Tag beendet, kein Eintrag danach → „Was kam raus?" |
| `outcome` | Vorgang auf `done` → „Wie lief's?" (Antwort → `outcome_note`) |
| `handover` | `matter.handover` → Hinweis an Empfänger mit Kurzstand |
| `review_batch` | Import fertig / neue ungeprüfte Elemente |
| `clarify` | aus der Pipeline |
| `advice` | Modell (9.3) |

Wie oft und welche Hinweise jemand bekommt, regeln persönliche Anweisungen im Chat („Social-Media-Hinweise nur montags"). Kein fester Deckel im Code.

---

## 11. Oberfläche

Referenz: `design/` (Design System „Kollege": `design-system/README.md`, Tokens, Bausteine, Prototyp). Das Design System ist maßgeblich für Aussehen und Sprache; diese Bauvorlage für Verhalten.

**Navigation:** `/heute`, `/chat` · Werkzeuge: `/mail`, `/kalender`, `/aufgaben`, `/dateien`, `/kontakte` · Bereiche (aus `areas`, anheftbar/ausblendbar) · `/einstellungen` (Reiter: Quellen, Bereiche, Anweisungen). Darunter der Chatverlauf.

**Drei Muster:**
1. **Heute / Chat:** Strom aus Hinweisen bzw. Nachrichten + ein Eingabefeld.
2. **Liste + Detail:** gilt für Mail, Aufgaben, Kontakte, Dateien und alle Bereiche. Detail ist direkt bearbeitbar (ins Feld klicken, ändern, sofort gespeichert, Rückgängig).
3. **Kalender:** Woche/Monat, Termin anlegen/ändern.

**Ein Eingabefeld:** Es gibt keine eigenen Felder für Suche, neue Aufgabe oder neue Anweisung. Überall dasselbe Eingabefeld (Chat), auf Detailseiten mit vorgeladenem Kontext.

**Mail-Client (Stufe 5):** Threads (Umschalter Mein Postfach / StartHub / Alle), lesen, antworten, allen antworten, weiterleiten, neu, Anhänge, archivieren, gelesen-Status zurück ins Postfach. Etiketten für zugeordneten Vorgang/Kontakt (änderbar).

---

## 12. Konnektoren

Gemeinsames Interface (`lib/connectors/types.ts`):
`sync(connection, cursor) → { items: RawItem[], cursor }` und optionale Schreibfunktionen (`send`, `markRead`, `archive`, `createEvent`, …).

| Quelle | V1 | Hinweis |
|---|---|---|
| `fixture` | Stufe 1 | liest `fixtures/` (Mail, Kalender, Laufwerk) – für Entwicklung und Tests; speichert den Fixture-Schlüssel in `meta.fixture_key`, damit das Orakel (`fixtures/expected.json → items[key].model`) statt des Modells antworten kann. Umschaltbar per `MODEL_FAST=oracle`. |
| Mail | IMAP (`imapflow`, `mailparser`, SMTP via `nodemailer`) **oder** Microsoft Graph | Uni-Zugang klären; beide hinter demselben Interface |
| Kalender | Microsoft Graph oder CalDAV (`tsdav`) | lesen + schreiben |
| Laufwerk | SMB-Share, im Container gemountet (`/mnt/drive`) | Worker liest Dateisystem; Änderungserkennung über mtime + Hash |

Robustheit (Lehren aus früherem Bau): kaputte Header dürfen den Sync nie blockieren (pro Element try/catch, Fehler als Eintrag protokollieren, Cursor weiter); Message-ID ohne Quelle ablehnen; Zeitangaben immer mit Zeitzone; jeder Sync idempotent.

---

## 13. Bau-Reihenfolge

Jede Stufe endet lauffähig, getestet, committet, mit aktualisiertem `docs/STAND.md`. **Nicht vorgreifen.**

| Stufe | Inhalt | Abnahme |
|---|---|---|
| **1 Kern** | Docker Compose, Schema + Migrationen, RLS, Aktionsschicht mit Rückgängig, Seed (Team, Bereiche), Fixture-Konnektor + Import der Testdaten über den Eingangsweg (Modell im Test durch Orakel aus `fixtures/expected.json` ersetzt) | Tests grün: RLS (Julia sieht Andreas' Mailtext nicht, aber Platzhalter und Zusagen); Undo mit Folgeschritten; Duplikat-Mail aus 2 Postfächern = 1 Eintrag; Freemail-Domain erzeugt keine Organisation |
| **2 Oberfläche** | Layout, Navigation, Heute, Bereiche (Liste + Detail, bearbeitbar), Aufgaben, Kontakte, Einstellungen (Bereiche, Anweisungen) – auf Testdaten | Von Hand: Event anlegen, Feld ändern, Aufgabe abhaken, Rückgängig, Ungeprüftes übernehmen/verwerfen (auch gesammelt) |
| **3 Eingabe & Chat** | Eingabefeld → Chat (`think`) mit Werkzeugen und Aktionen, Karten, Chatverlauf, Kontext-Chat auf Detailseiten, Anweisungen per Chat | „Gerade Beratung mit Solaro, Pitchdeck bis Freitag, wir vermitteln Frau Weber" erzeugt Notiz, Zusage `theirs`, Aufgabe `ours`, Karte mit Rückgängig. Frage „Was haben wir Solaro versprochen?" antwortet mit Quellen. |
| **4 Mail-Eingang** | echter Mail-Konnektor (lesen), Filter, Zuordnung mit `fast`, Klärung, Import 12 Monate, Korrekturbeispiele | Gegen Testpostfach: Newsletter übersprungen, bekannte Absender fest zugeordnet, neue Anfragen als ungeprüft |
| **5 Mail-Client** | Mail-Ansicht, lesen, antworten, senden, archivieren, Rückschreiben | Gesendete Mail erscheint nach Sync nicht doppelt |
| **6 Kalender** | lesen, anlegen, ändern, Einladungen (extern = bestätigen) | Termin mit Teilnehmenden wird Kontakt und Vorgang zugeordnet |
| **7 Laufwerk** | SMB-Mount, Dateien einlesen, Textauszug, Zusammenfassung, Dateiansicht | Datei in Ordner „Events/Gründungsnacht" landet beim Event |
| **8 Hinweise & Rat** | SQL-Hinweise, Momente, `after_event`, `outcome`, `handover`, `advice` | Hinweise erscheinen einmal (dedupe), mit Grund, erledigen sich |

Stufen 1–3 laufen vollständig mit `fixtures/`. Ab Stufe 4 wird gegen echte Zugänge getestet (auf Andreas' Rechner / Uni-Netz).

---

## 14. Konfiguration (`.env.example`)

```
DATABASE_URL=postgres://kollege:kollege@postgres:5432/kollege
APP_SECRET=            # Verschlüsselung für connections.config
AUTH_SECRET=
APP_URL=http://localhost:3000
MODEL_FAST=anthropic:claude-haiku-4-5
MODEL_THINK=anthropic:claude-sonnet-5-5
ANTHROPIC_API_KEY=
MODEL_BASE_URL=        # optional: OpenAI-kompatibler EU-Anbieter / vLLM
MODEL_API_KEY=
BLOB_DIR=/data/blobs
DRIVE_MOUNT=/mnt/drive
TZ=Europe/Berlin
```

Modell-IDs sind Platzhalter und werden beim Bau auf aktuelle Bezeichnungen geprüft.

---

## 15. Offene Punkte (beim Bau nicht selbst entscheiden, in STAND.md fragen)

- Mailzugang der Uni: IMAP oder Microsoft Graph?
- Endgültiger Produktname (Arbeitsname „Kollege").
- Betrieb: VM im Uni-Netz (empfohlen) oder EU-Cloud + Laufwerks-Worker im Uni-Netz.
- EU-Modell für den Betrieb (wird parallel zum Test mit Claude ausgewählt).
