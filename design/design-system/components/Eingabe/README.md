# Eingabe

Das zentrale Eingabefeld und zugleich der Chat: man schreibt in eigenen Worten, was passiert ist, fragt etwas oder gibt eine Anweisung. Wichtigste Bedienung der App.

- Eine Eingabe öffnet eine Gesprächsansicht (`Nachricht`, `Karte`). Das Feld bleibt unten im Gespräch stehen und leert sich nach dem Abschicken (`leeren={false}` verhindert das).
- `kontext` zeigt über dem Text, womit der Chat vorgeladen ist („Solaro – EXIST-Antrag · 14 Einträge“) – auf Vorgangs- und Personenseiten mit Platzhalter „Frag oder notiere etwas zu diesem Vorgang“.
- Der Knopf ist ein Pfeil (→, `aria-label` „Abschicken“). „Senden“ bleibt dem Versand über das Postfach vorbehalten.

- Steht oben auf der Übersicht, über allem anderen, in voller Breite der Hauptspalte (`measure`). Auf jeder anderen Seite erreichbar über `/` oder `N`.
- Schrift `input` (18/28) – größer als der Rest, damit es sich wie Schreiben anfühlt, nicht wie Suchen.
- Zustände: `leer` (Platzhalter, Knopf aus), `bereit` (Text, Knopf „Merken“ an), `verarbeitet` (Text grau, „Lese mit, ordne zu…“). Danach ersetzt die `Quittung` die Eingabe-Ansicht darunter.
- ⏎ schickt ab, ⇧⏎ neue Zeile. Nichts verlässt hier das Haus.
- Weiße Karte (`surface`, Haarlinie, Radius 14) mit Kontext-Chip („@ Kontext …“) und rundem Senden-Knopf in Tinte (E54). Bleibt eines der Grenzobjekte (Rahmen = Grenze).
- Mobil: klebt unten am Bildschirm über der Tastatur, volle Breite, Knopf 44px hoch.
- Jede Antwort, die etwas im Record ändert, endet mit einer `Karte` (Rückgängig inklusive).
