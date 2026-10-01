# Design System und Prototyp (Referenz)

Stand 01.10.2026 aus Claude Design: nach der Umstellung auf Bereiche (Gründungsteams, Events, Lehre, Social Media), mit Mail-Client, Kalender und den Korrekturen aus der UI-Prüfung (Entscheidungen E42–E50). Maßgeblich für Verhalten und Datenmodell ist `docs/BAUVORLAGE.md`; maßgeblich für Aussehen und Sprache ist dieser Ordner. Wo beide sich widersprechen, steht es in `docs/STAND.md` unter „Offene Fragen“.

- `design-system/` – Tokens, Bausteine (README je Baustein), Referenz-Implementierung (`components/bundle.js`)
- `prototyp/` – klickbarer Prototyp (läuft nur im Claude-Design-Canvas), nur als Referenz. Artboards entstehen aus `prototyp/quellen/` über `python3 prototyp/build.py <Name> …`
- `ENTSCHEIDUNGEN.md` – Design-Entscheidungen E1–E50 mit Begründung, offene Fragen, Grenzen des Prototyps
- `docs/UI-PRUEFUNG.md` – Prüfbericht zur Oberfläche (Vergleich mit gängiger Mail-, Kalender-, CRM- und Aufgaben-Software)
- `docs/UI-PRUEFUNG-EINORDNUNG.md` – Befunde getrennt nach Design-Fehler (alle behoben), Mockup-Fehler und fehlenden Funktionen
- `docs/KALENDER-ABGLEICH.md` – Kalender im Vergleich zu Apple Kalender
- `vorschau/index.html` – alle Bausteine auf einer Seite (lokal im Browser öffnen)
