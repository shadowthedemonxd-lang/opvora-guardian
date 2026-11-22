// EN/ES. Static English lives in the HTML and is captured on first switch; ES strings and all JS strings live here.
const ES_STATIC = {
  'skip': 'Saltar a la consola',
  'nav.console': 'Consola', 'nav.identify': 'Identificar', 'nav.lookalikes': 'Imitaciones', 'nav.habitats': 'Hábitats', 'nav.method': 'Método',
  'nav.ask': 'Pregúntale a OPVORA', 'plate.short': 'Espécimen',
  'hero.title': 'Toda estafa deja marcas. OPVORA las lee por ti.',
  'hero.lede': 'Pega un enlace, un mensaje o una alerta. OPVORA lo examina como lo haría un analista de seguridad: qué tan grave es, por qué, y qué hacer primero.',
  'hero.label': 'Pega un enlace o un mensaje',
  'hero.placeholder': 'https://… o el texto del mensaje',
  'hero.submit': 'Identificar',
  'hero.demo': 'Ver la consola en vivo',
  'hero.note': 'No se guarda nada. Nunca pegues contraseñas.',
  'plate.cap': 'Lámina I · Mensaje de amenaza',
  'plate.from': 'Número desconocido',
  'plate.msg': '<mark class="mk" data-n="1">Sé dónde vives&#8288;<i class="pin" aria-hidden="true">1</i></mark>. Mándame <mark class="mk" data-n="2">tu dirección y una foto de tu INE&#8288;<i class="pin" aria-hidden="true">2</i></mark> <mark class="mk" data-n="3">antes de esta noche&#8288;<i class="pin" aria-hidden="true">3</i></mark> o te vas a arrepentir.',
  'plate.marks': 'Marcas',
  'plate.found': '3 marcas encontradas',
  'plate.m1': 'Amenaza de daño', 'plate.m2': 'Exige domicilio e identificación', 'plate.m3': 'Plazo límite: hoy en la noche',
  'plate.sev': 'Crítico',
  'plate.first': 'Haz esto primero',
  'plate.s1': 'No respondas ni mandes nada', 'plate.s2': 'Guarda el mensaje como evidencia', 'plate.s3': 'Bloquea, reporta y avísale a alguien de confianza',
  'plate.foot': 'Traducido y resumido de un veredicto real de Llama 3.3 70B en nuestro set de pruebas',
  'facts.rules': 'reglas revisan cada elemento', 'facts.layers': 'capas independientes deciden', 'facts.eval': 'casos de prueba reales aprobados', 'facts.stored': 'elementos guardados',
  'console.title': 'Mira cómo se desarrolla un robo de cuenta',
  'console.lede': 'Doce alertas de un robo de cuenta simulado llegan en orden. Cada una va al analista de IA como texto crudo, y la IA decide la gravedad por su cuenta.',
  'console.reset': 'Reiniciar la simulación',
  'console.notice': 'Estas alertas son datos de muestra. OPVORA no está conectado a tu equipo ni a tus cuentas. El análisis de cada alerta es real.',
  'tag.sim': 'Datos simulados', 'tag.live': 'Análisis en vivo', 'tag.liveScanner': 'Escáner en vivo', 'tag.liveMsg': 'En vivo para mensajes',
  'score.label': 'Puntaje Guardian',
  'area.browsing': 'Navegación', 'area.device': 'Seguridad del PC', 'area.accounts': 'Cuentas',
  'feed.title': 'Registro de alertas',
  'feed.emptyTitle': 'Aún no hay alertas',
  'feed.emptyBody': 'Envía las doce alertas de muestra al analista y mira cómo reacciona el puntaje.',
  'detail.emptyTitle': 'Nada seleccionado',
  'detail.emptyBody': 'Elige una alerta del registro para leer el veredicto de la IA, las señales de alerta y los pasos a seguir.',
  'scan.title': 'Identifica un espécimen antes de confiar en él',
  'scan.lede': 'Pega una dirección web, un correo, un SMS o un mensaje de chat. Primero lo revisa el motor de reglas y luego el analista de IA lo explica. No se guarda nada. Nunca pegues contraseñas.',
  'scan.link': 'Enlace', 'scan.message': 'Mensaje',
  'scan.inputLabel': 'Enlace o mensaje a analizar',
  'scan.try': 'Prueba un ejemplo', 'scan.kbd': 'o presiona <kbd>/</kbd> para escribir',
  'scan.submit': 'Analizar',
  'scan.emptyTitle': 'Aquí aparece el veredicto',
  'scan.emptyBody': 'Verás la gravedad, las coincidencias del motor de reglas y la explicación de la IA lado a lado.',
  'look.title': 'Imitaciones peligrosas',
  'look.lede': 'La falsa está a un carácter de la real. Estos son ejemplos del propio escáner y de la consola.',
  'look.real': 'Real', 'look.fake': 'Falsa', 'look.check': 'Identificar esta',
  'look.n1': 'Un cero en lugar de una “o”, palabras de seguridad y una terminación .top. El banco real usa banconova.com.mx.',
  'look.n2': 'Empieza con paypal.com, pero el dominio real es lo que va al final: account-review.xyz.',
  'look.n3': 'Parece un PDF. La terminación .exe al final lo convierte en un programa que se ejecuta.',
  'hab.title': 'Dónde viven las amenazas',
  'hab.lede': 'Tres áreas donde empiezan la mayoría de los ataques personales. Esta demo dice con claridad qué partes están en vivo y cuáles son simuladas.',
  'hab.colArea': 'Área', 'hab.colLooks': 'Qué busca', 'hab.colDemo': 'En esta demo', 'hab.colReal': 'Lo que haría falta para protección real',
  'hab.b.looks': 'Páginas bancarias imitadas, dominios punycode, acortadores de enlaces, descargas falsas, extensiones que piden acceso a todos los sitios',
  'hab.b.real': 'Una extensión de navegador que vea las páginas que abres',
  'hab.d.looks': 'PowerShell codificado, documentos con macros, renombrado masivo tipo ransomware, programas de inicio, antivirus desactivado',
  'hab.d.real': 'Un agente de Windows que lea los registros de seguridad',
  'hab.a.looks': 'Inicios de sesión desde otros países, reglas de reenvío ocultas, ataques de fuerza bruta, apps con acceso total, amenazas y extorsión',
  'hab.a.real': 'Conexiones de solo lectura a tus cuentas que tú apruebes (OAuth)',
  'method.title': 'Cómo se decide un veredicto',
  'method.lede': 'Dos capas independientes revisan cada elemento. Cuando no coinciden, gana la más estricta.',
  'method.1t': 'Recolectar', 'method.1': 'Llega una alerta del navegador, del PC o de una cuenta, o pegas algo en el escáner.',
  'method.2t': 'Motor de reglas', 'method.2': '29 revisiones deterministas detectan trucos conocidos en milisegundos: dominios imitados, comandos codificados, amenazas, peticiones de tu identificación.',
  'method.3t': 'Analista de IA', 'method.3': 'El modelo pondera el contexto que las reglas no ven, califica el riesgo de 0 a 100 y escribe la explicación.',
  'method.4t': 'Conciliar', 'method.4': 'El servidor revisa la respuesta en busca de contradicciones. Las coincidencias fuertes de las reglas ponen un piso que la IA no puede bajar.',
  'cta.title': '¿Tienes un mensaje que te preocupa?',
  'cta.body': 'Pégalo en el escáner o pregúntale al asistente. Recibirás una respuesta clara en segundos.',
  'cta.scan': 'Revisar un mensaje', 'cta.ask': 'Preguntar al asistente',
  'feed.start': 'Iniciar simulación',
  'method.cap': 'Las etiquetas bajo cada paso siguen a la Lámina I, el mensaje de amenaza, por todo el proceso. Los pesos de las reglas son los valores reales del motor.',
  'sos.title': '¿En peligro ahora? (México)', 'sos.911': 'Emergencias', 'sos.088': 'Policía Cibernética, amenazas y extorsión en línea',
  'footer.body': 'Demo para una competencia. El texto que escaneas o envías al asistente lo procesa Cloudflare Workers AI y OPVORA no lo guarda. Si alguien amenaza tu seguridad, llama al 911.',
  'chat.title': 'Asistente OPVORA', 'chat.status': 'En línea, puede ver tu consola',
  'chat.clear': 'Nueva conversación', 'chat.close': 'Cerrar el asistente',
  'chat.try': 'Prueba preguntar',
  'chat.q1': '¿Cuál es mi mayor riesgo ahora?', 'chat.q2': 'Alguien me está amenazando en línea. ¿Qué hago?', 'chat.q3': '¿Cómo activo la verificación en dos pasos?',
  'chat.inputLabel': 'Escribe al asistente', 'chat.placeholder': 'Pregunta sobre una alerta o un mensaje…', 'chat.send': 'Enviar',
  'chat.hint': 'Las alertas de la consola son simuladas. Nunca compartas contraseñas ni códigos aquí.',
  'theme.label': 'Tema de color', 'theme.auto': 'Auto', 'theme.light': 'Claro', 'theme.dark': 'Oscuro',
};

const JS = {
  en: {
    'sev.critical': 'Critical', 'sev.high': 'High', 'sev.medium': 'Medium', 'sev.low': 'Low', 'sev.none': 'Safe', 'sev.unverified': 'Unverified',
    'area.browsing': 'Browsing', 'area.device': 'PC security', 'area.accounts': 'Accounts',
    'status.online': 'AI online', 'status.fallback': 'AI fallback: rules',
    'an.ask': 'Ask OPVORA about this', 'an.rules': 'Rule engine only', 'an.risk': 'Risk',
    'an.note': 'The AI analyst did not answer, so this is a rule-based result. Try again in a minute.',
    'an.noticed': 'What the AI noticed', 'an.todo': 'What to do', 'an.ruleScore': 'Rule engine score {n}/100', 'an.noRule': 'No rule matched', 'an.raw': 'Raw event (simulated sample)',
    'an.askPrompt': 'Explain this alert and what I should do first: "{title}" ({sev}). {summary}',
    'sim.start': 'Start simulation', 'sim.pause': 'Pause', 'sim.resume': 'Resume', 'sim.replay': 'Replay',
    'meta.idle': 'Idle', 'meta.count': '{n} of {total} alerts, {state}', 'meta.analyzing': '{n} analyzing', 'meta.listening': 'listening', 'meta.paused': 'paused',
    'feed.handled': 'Handled', 'feed.retry': 'Retry',
    'detail.reading': 'AI analyst reading "{title}"…', 'detail.failed': 'Analysis failed', 'detail.retry': 'Retry analysis',
    'detail.emptyTitle': 'Nothing selected', 'detail.emptyBody': "Pick an alert from the log to read the AI's verdict, the red flags it found and the steps to take.",
    'handled.mark': 'Mark as handled', 'handled.undo': 'Handled, undo', 'handled.title': 'Handled events stop counting against your score',
    'score.clear': 'All clear', 'score.attention': 'Needs attention', 'score.attack': 'Under attack',
    'area.none': 'No threats', 'area.open': '{n} open, worst {sev}',
    'scan.urlPh': 'https://example.com/login', 'scan.msgPh': 'Paste the email, SMS or chat message here…',
    'scan.thinking': 'Rule engine done. AI analyst is reading it…', 'scan.link': 'Link', 'scan.message': 'Message',
    'scan.readout': '{kind} · {n}/{max} characters · not stored',
    'scan.askPrompt': 'I scanned this {what} and you rated it {sev}. What exactly should I do now?',
    'chat.greeting': "Hi, I'm OPVORA. Ask me about any alert on your console, a message that worries you, or how to lock down an account.",
    'chat.typing': 'OPVORA is typing', 'chat.empty': 'The assistant returned an empty answer. Try again.', 'chat.down': 'The assistant is unavailable.',
  },
  es: {
    'sev.critical': 'Crítico', 'sev.high': 'Alto', 'sev.medium': 'Medio', 'sev.low': 'Bajo', 'sev.none': 'Seguro', 'sev.unverified': 'Sin verificar',
    'area.browsing': 'Navegación', 'area.device': 'Seguridad del PC', 'area.accounts': 'Cuentas',
    'status.online': 'IA en línea', 'status.fallback': 'IA no disponible: reglas',
    'an.ask': 'Pregúntale a OPVORA', 'an.rules': 'Solo motor de reglas', 'an.risk': 'Riesgo',
    'an.note': 'El analista de IA no respondió, así que este resultado viene de las reglas. Intenta de nuevo en un minuto.',
    'an.noticed': 'Lo que notó la IA', 'an.todo': 'Qué hacer', 'an.ruleScore': 'Puntaje del motor de reglas {n}/100', 'an.noRule': 'Ninguna regla coincidió', 'an.raw': 'Evento crudo (muestra simulada)',
    'an.askPrompt': 'Explícame esta alerta y qué debo hacer primero: "{title}" ({sev}). {summary}',
    'sim.start': 'Iniciar simulación', 'sim.pause': 'Pausar', 'sim.resume': 'Reanudar', 'sim.replay': 'Repetir',
    'meta.idle': 'En espera', 'meta.count': '{n} de {total} alertas, {state}', 'meta.analyzing': '{n} en análisis', 'meta.listening': 'escuchando', 'meta.paused': 'en pausa',
    'feed.handled': 'Atendida', 'feed.retry': 'Reintentar',
    'detail.reading': 'El analista de IA está leyendo "{title}"…', 'detail.failed': 'El análisis falló', 'detail.retry': 'Reintentar análisis',
    'detail.emptyTitle': 'Nada seleccionado', 'detail.emptyBody': 'Elige una alerta del registro para leer el veredicto de la IA, las señales de alerta y los pasos a seguir.',
    'handled.mark': 'Marcar como atendida', 'handled.undo': 'Atendida, deshacer', 'handled.title': 'Las alertas atendidas dejan de restar a tu puntaje',
    'score.clear': 'Todo en orden', 'score.attention': 'Requiere atención', 'score.attack': 'Bajo ataque',
    'area.none': 'Sin amenazas', 'area.open': '{n} abiertas, la peor: {sev}',
    'scan.urlPh': 'https://ejemplo.com/login', 'scan.msgPh': 'Pega aquí el correo, SMS o mensaje de chat…',
    'scan.thinking': 'Motor de reglas listo. El analista de IA lo está leyendo…', 'scan.link': 'Enlace', 'scan.message': 'Mensaje',
    'scan.readout': '{kind} · {n}/{max} caracteres · no se guarda',
    'scan.askPrompt': 'Escaneé este {what} y lo calificaste como {sev}. ¿Qué debo hacer exactamente ahora?',
    'chat.greeting': 'Hola, soy OPVORA. Pregúntame sobre cualquier alerta de tu consola, un mensaje que te preocupe o cómo proteger una cuenta.',
    'chat.typing': 'OPVORA está escribiendo', 'chat.empty': 'El asistente devolvió una respuesta vacía. Intenta de nuevo.', 'chat.down': 'El asistente no está disponible.',
  },
};

let lang = 'en';
try { lang = localStorage.getItem('opvora-lang') === 'es' ? 'es' : 'en'; } catch { /* storage blocked */ }
const listeners = [];

export const getLang = () => lang;
export function t(key, vars = {}) {
  const s = JS[lang][key] ?? JS.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}
export const onLang = (fn) => listeners.push(fn);

function applyStatic() {
  document.documentElement.lang = lang === 'es' ? 'es-MX' : 'en';
  for (const el of document.querySelectorAll('[data-i18n]')) {
    el.dataset.en ??= el.innerHTML; // our own markup, captured once
    const es = ES_STATIC[el.dataset.i18n];
    el.innerHTML = lang === 'es' && es ? es : el.dataset.en;
  }
  for (const el of document.querySelectorAll('[data-i18n-attr]')) {
    for (const pair of el.dataset.i18nAttr.split(';')) {
      const [attr, key] = pair.split(':');
      const store = `en${attr.replace(/[^a-z]/gi, '')}`;
      el.dataset[store] ??= el.getAttribute(attr) ?? '';
      el.setAttribute(attr, lang === 'es' && ES_STATIC[key] ? ES_STATIC[key] : el.dataset[store]);
    }
  }
  document.querySelectorAll('[data-lang-set]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.langSet === lang)));
}

export function setLang(next) {
  lang = next === 'es' ? 'es' : 'en';
  try { localStorage.setItem('opvora-lang', lang); } catch { /* storage blocked */ }
  applyStatic();
  listeners.forEach((fn) => fn(lang));
}

if (lang === 'es') applyStatic();
else document.querySelectorAll('[data-lang-set]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.langSet === lang)));
