# Entwurf

Alles, was die Organisation verlässt – Mail, Einladung, Post – erscheint nur als fertiger Entwurf mit „Ansehen“ und „Senden“.

- Konsument gibt `kanal` (Mail/Einladung/Beitrag), `an`, `betreff`, `auszug` (zwei Zeilen), `grund` (eine `Aussage`), `onAnsehen`, `onSenden`.
- Gerahmt (`line-control`, `radius-2`, `paper-sunk`): Grenzobjekt, „geht nach außen“. Außer der Eingabe hat nichts sonst einen Rahmen.
- Der Primärknopf heißt „Über mein Postfach senden“: die Mail geht vom eigenen Konto (`von`) und liegt danach im normalen Gesendet-Ordner. Die Zeile darunter sagt das (`hinweis`). „Ansehen“ ist `sekundaer`.
- Später erscheint die Mail im Verlauf wie jede andere, nur mit Herkunft „über Kollege“.
- „Ansehen“ öffnet ein Blatt (`shadow-sheet`) mit dem vollen Text, editierbar, gleiche zwei Knöpfe.
- Nach dem Senden: Zeile „Gesendet 14:32 · Rückgängig (30 s)“. Danach nur noch im Verlauf.
- Absender ist immer ein Mensch; der Entwurf schreibt in dessen Namen und Ton.
