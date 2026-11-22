// Plain pages (privacy, terms, 404): header controls only. Long copy ships in both languages as [data-lang] blocks.
import { addStrings } from './i18n.js';
import { initPrefs } from './shared.js';

addStrings({
  esStatic: {
    'pg.skip': 'Saltar al contenido', 'pg.open': 'Abrir la app', 'pg.home': 'Inicio', 'pg.app': 'App', 'pg.privacy': 'Privacidad', 'pg.terms': 'Términos',
    'pg.check': 'Revisar un enlace o mensaje', 'pg.home2': 'Ir a la página de inicio',
  },
});
initPrefs();
