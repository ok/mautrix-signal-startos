import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.2609.0:0',
  releaseNotes: {
    en_US:
      'Initial release for StartOS.\n\n- Bridges Signal into the Synapse homeserver on this server (mautrix-signal v0.2609.0).\n- Registers itself with Synapse automatically; confirm the Register Appservice task there once.\n- Each user links their Signal account by sending `login` to the bridge bot and scanning a QR code.\n- Encryption, history backfill and bridge admins are set from the Settings action.',
    es_ES:
      'Versión inicial para StartOS.\n\n- Conecta Signal con el servidor Synapse de este servidor (mautrix-signal v0.2609.0).\n- Se registra automáticamente en Synapse; confirma allí una vez la tarea Register Appservice.\n- Cada usuario vincula su cuenta de Signal enviando `login` al bot del puente y escaneando un código QR.\n- El cifrado, el relleno del historial y los administradores del puente se ajustan desde la acción Configuración.',
    de_DE:
      'Erstveröffentlichung für StartOS.\n\n- Bringt Signal in den Synapse-Homeserver auf diesem Server (mautrix-signal v0.2609.0).\n- Registriert sich automatisch bei Synapse; bestätige dort einmalig die Aufgabe Register Appservice.\n- Jeder Nutzer verknüpft sein Signal-Konto, indem er `login` an den Brücken-Bot sendet und einen QR-Code scannt.\n- Verschlüsselung, Verlaufs-Backfill und Brücken-Administratoren werden über die Aktion Einstellungen gesetzt.',
    pl_PL:
      'Pierwsze wydanie dla StartOS.\n\n- Łączy Signal z serwerem Synapse na tym serwerze (mautrix-signal v0.2609.0).\n- Rejestruje się w Synapse automatycznie; potwierdź tam raz zadanie Register Appservice.\n- Każdy użytkownik łączy swoje konto Signal, wysyłając `login` do bota mostu i skanując kod QR.\n- Szyfrowanie, uzupełnianie historii i administratorzy mostu ustawiani są w akcji Ustawienia.',
    fr_FR:
      "Version initiale pour StartOS.\n\n- Relie Signal au serveur Synapse de ce serveur (mautrix-signal v0.2609.0).\n- S'enregistre automatiquement auprès de Synapse ; confirmez-y une fois la tâche Register Appservice.\n- Chaque utilisateur lie son compte Signal en envoyant `login` au bot de la passerelle et en scannant un QR code.\n- Le chiffrement, la récupération de l'historique et les administrateurs de la passerelle se règlent via l'action Paramètres.",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
