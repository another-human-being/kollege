# Design System und Prototyp (Referenz)

Stand 05.10.2026 aus Claude Design: Bereiche (Gründungsteams, Events, Lehre, Social Media), Mail-Client, Kalender, Korrekturen aus der UI-Prüfung (E42–E50), Design Variante A mit Flächen und Icons (E54), neue Seitenleiste mit gemeinsamem Feld „Neuer Chat oder Suche“ und Baum (E55), neue Heute-Seite mit Wiedervorlage (E56–E57), To-Dos, Event-Detailseite mit Teilnehmenden-Import, Social Media nach Kanälen, Chat-Liste (E58–E62). Maßgeblich für Verhalten und Datenmodell ist `docs/BAUVORLAGE.md`; maßgeblich für Aussehen und Sprache ist dieser Ordner. Wo beide sich widersprechen, steht es in `docs/STAND.md` unter „Offene Fragen“.

- `design-system/` – Tokens, Bausteine (README je Baustein), Referenz-Implementierung (`components/bundle.js`)
- `prototyp/` – klickbarer Prototyp (läuft nur im Claude-Design-Canvas), nur als Referenz. Artboards entstehen aus `prototyp/quellen/` über `python3 prototyp/build.py <Name> …`
- `ENTSCHEIDUNGEN.md` – Design-Entscheidungen E1–E62 mit Begründung, offene Fragen, Grenzen des Prototyps und **Hinweise für den Bau** (Backend: Feld „Neuer Chat oder Suche“, Baum, Teilnehmenden-Import, Social-Media-Fassungen)
- `docs/UI-PRUEFUNG.md` – Prüfbericht zur Oberfläche (Vergleich mit gängiger Mail-, Kalender-, CRM- und Aufgaben-Software)
- `docs/UI-PRUEFUNG-EINORDNUNG.md` – Befunde getrennt nach Design-Fehler (alle behoben), Mockup-Fehler und fehlenden Funktionen
- `docs/KALENDER-ABGLEICH.md` – Kalender im Vergleich zu Apple Kalender
- `docs/STRUKTUR-PRUEFUNG.md` – Strukturprüfung aller Seiten (Cluster je Seite, seitenübergreifende Regeln)
- `vorschau/index.html` – alle Bausteine auf einer Seite (lokal im Browser öffnen)
