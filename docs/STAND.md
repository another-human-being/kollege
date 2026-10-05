# Stand

> Wird am Ende jeder Stufe aktualisiert. Kurz halten.

## Stufen

- [ ] 1 Kern: Schema, RLS, Aktionsschicht + Rückgängig, Seed, Fixture-Import
- [ ] 2 Oberfläche: Heute, Bereiche, Aufgaben, Kontakte, Einstellungen
- [ ] 3 Eingabe & Chat
- [ ] 4 Mail-Eingang
- [ ] 5 Mail-Client
- [ ] 6 Kalender
- [ ] 7 Laufwerk
- [ ] 8 Hinweise & Rat

**Aktuell:** Stufe 1, noch nicht begonnen.

## Befunde aus dem Bau

_(was beim Bauen aufgefallen ist und die Bauvorlage betrifft)_

## Offene Fragen an Andreas

- Design-Stand 01.10. (`design/ENTSCHEIDUNGEN.md` E42–E50) geht an einigen Stellen über die Bauvorlage hinaus. Übernehmen in die Bauvorlage? (bis Stufe 2)
  - Aufgaben: Status „In Arbeit“ für `ours` (Bauvorlage: `open|done`); „wartet“ bleibt berechnet aus `theirs` (E44)
  - Übergabe wartet auf Annahme, bisherige Person bleibt bis dahin zuständig (E45; passt zu Hinweis `handover`)
  - Mail: Versand 10 s verzögert und so lange zurückholbar; angefangene Mails automatisch als Entwurf (E43)
  - Kalender: Teilnahme je Person, „Änderung nicht verschickt“ bis „Änderung senden“, Termine anderer nur lesbar (E48; bis Stufe 6)
  - Gründungsteams: Phase „ruht“; Gespräche mit Datum, Art, Teilnehmenden (E50)
- Design-Stand 05.10. (`design/ENTSCHEIDUNGEN.md` E51–E62, Details unter „Hinweise für den Bau“) geht weiter über die Bauvorlage hinaus. Übernehmen?
  - Seitenleiste: ein Feld für „Neuer Chat“ und Suche (Suche beim Tippen, Enter = neuer Chat); Bereiche als Baum mit laufenden Einträgen und Zahl offener Aufgaben (E55)
  - Heute: „Diese Woche · Offen · Ausstehend“; „Offen“ umfasst neben Aufgaben auch Freigeben, Klären, Zuordnen, Antworten, Nachfassen, Prüfen – braucht ein gemeinsames Modell „wartet auf mich“ (E56)
  - Wiedervorlage für Ausstehendes: Werktag nach der Frist bzw. 5 Werktage Stille → „Nachfassen“ mit Entwurf (E57)
  - „To-Dos“ statt „Zusagen von uns / an uns“ in den Bereichen (E59; Bauvorlage: `ours|theirs` bleibt im Modell, nur die Darstellung ändert sich)
  - Events: Mitwirkende mit Rolle und Teilnehmende mit Excel-Import (E60); Social Media: Beitrag mit Fassungen je Kanal (E61)
- Mailzugang der Uni: IMAP oder Microsoft Graph? (bis Stufe 4)
- Betrieb: VM im Uni-Netz oder EU-Cloud + Laufwerks-Worker? (bis Stufe 7)
- EU-Modell für den Betrieb (parallel zum Test)

## Verbrauch

_(nach jeder Stufe: ungefährer Verbrauch an Nutzungsguthaben, damit absehbar ist, wie weit es reicht)_
