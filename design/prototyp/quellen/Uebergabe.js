class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { phase: 'offen' };
  }
  renderVals() {
    var self = this, st = this.state;
    return {
      sidebarChats: this.kgChats().slice(3),
      letzte: [
        { monat: 'September 2026', datum: '30.09.', art: 'Notiz', text: 'Beratung: Pitchdeck bis Freitag; wir vermitteln Frau Weber.', quelle: 'Andreas' },
        { monat: 'September 2026', datum: '28.09.', art: 'Mail', text: 'An Lisa: Rückfrage zum Pitchdeck-Format', quelle: 'Mail', herkunft: 'über Kollege' },
        { monat: 'September 2026', datum: '26.09.', art: 'Mail', text: 'Tom Kraus: Finanzplan v2 mit Bitte um Feedback', quelle: 'Mail' }
      ],
      offen: st.phase === 'offen',
      fragt: st.phase === 'fragt',
      gefragt: st.phase === 'gefragt',
      uebernommen: st.phase === 'uebernommen',
      uebernehmen: function () { self.setState({ phase: 'uebernommen' }); },
      rueckfrage: function () { self.setState({ phase: 'fragt' }); },
      fragen: function (e) { if (e && e.preventDefault) e.preventDefault(); self.setState({ phase: 'gefragt' }); },
      zurueck: function () { self.setState({ phase: 'offen' }); },
      punkte: ['Du bist jetzt zuständig für „Solaro – EXIST-Antrag“', '2 offene Zusagen von uns liegen jetzt bei dir', 'Erinnerung Fr 02.10., 17:00 geht jetzt an dich', 'Andreas bleibt informiert']
    };
  }
}
