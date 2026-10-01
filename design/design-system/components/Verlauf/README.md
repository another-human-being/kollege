# Verlauf

Chronik eines Eintrags, einer Person oder eines Teams: Datum, Art, ein Satz, Quelle. Neueste oben.

- Konsument gibt `eintraege` (`[{monat, datum, art, text, quelle, onRueckgaengig}]`); `art` ∈ Mail · Termin · Notiz · Datei · System.
- Datumsspalte in Mono (`col-date`), Monatsköpfe als leise Trenner. Das Datum steht vorn – der Verlauf ist ein Logbuch.
- Einträge mit `art: 'System'` (was das System selbst getan hat) stehen in `ink-muted` und haben immer ↶ Rückgängig.
- Mails, die außerhalb des Systems geschrieben wurden, sehen genauso aus. Einziger Unterschied: `herkunft` als kleiner Mono-Hinweis („aus Outlook“, „über Kollege“).
- `privat: true` setzt das Schloss vor den Text; nur die Besitzerin sieht den Eintrag. `privatFuer: 'Julia'` für Platzhalter aus fremden Postfächern („Inhalt nur für Julia“).
- Ein Satz pro Eintrag, Klick öffnet den Beleg. Keine Mail-Vorschauen im Verlauf.
- Auf Person/Team-Seiten zusätzlich der Eintrag als `Bezug` am Satzanfang.
