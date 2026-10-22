# ¡Hay peña! — Roadmap

App del grupo Estaqueros. Deja de ser "la lista de juntadas" y pasa a ser el lugar
del grupo: juntadas, cuentas, juegos, votaciones y estadísticas.

## Hecho

- Login por PIN de 4 dígitos (avatar + PIN), sesión en cookie firmada, bloqueo tras 5 intentos.
- Dashboard: próxima juntada destacada, próximas y pasadas según la fecha real.
- Crear juntada, detalle con RSVP (voy / no voy / en duda).
- Checklist grupal (asignar; solo el asignado tilda) e individual (recordatorios).
- Aviso in-app 1h antes si tenés ítems grupales sin completar.
- Integrantes: alta con PIN inicial, cambiar mi PIN.
- Seed de usuarios de prueba (`npm run seed`, ver `.env.example`).
- PWA: manifest e íconos.

## Próximos pasos (en orden)

### 1. Deploy a Vercel
- Conectar el repo, cargar `DATABASE_URL` y un `SESSION_SECRET` nuevo.
- Asegurar `prisma generate` en el build (`app/generated/prisma` está en `.gitignore`).
- Verificar HTTPS, instalación como PWA en el celular y el login.
- Usar `sslmode=verify-full` en `DATABASE_URL` (sin el warning SSL de `pg`).

### 2. Nueva estructura de la app
- Inicio: próxima juntada destacada con el RSVP ahí mismo + grilla de cards
  (Juntadas · Cuentas · Juegos · Votaciones · Estadísticas · Calculadora · Ajustes).
- Barra fija abajo en el celular (Inicio, Juntadas, Cuentas, Juegos, Yo).
- **Invitados por juntada**: alguien que suma un integrante, solo con nombre y sin login.
  Participa en cuentas y juegos.
- Editar y borrar juntadas e integrantes; archivar juntadas (estado "archivada", sin borrar).
- Anfitrión de cada juntada (integrante), para las estadísticas.

### 3. Cuentas claras + calculadora
- Cada gasto: quién pagó, monto, concepto y **entre quiénes se divide**
  (reemplaza el modelo de exclusiones por uno de participantes).
  - Por defecto: los que confirmaron + invitados.
  - "Se llevó su bebida": se lo saca de ese gasto.
  - "Promo de fernet entre 3": el gasto se divide solo entre esos 3.
  - **Invitado de honor** (cumpleaños, anda corto): no paga; su parte se reparte
    entre el resto o la absorbe alguien en particular.
- Todo editable.
- Resumen de saldos con el mínimo de transferencias y botón para copiar alias/CVU.
- Calculadora rápida (suma, resta, multiplicación, división) sin salir de la app.

### 4. Ajustes / mi perfil
- Fecha de cumpleaños + aviso en pantalla (24h antes) y botón "Vaca para el regalo".
- Alias/CVU para las transferencias.
- Foto de perfil: cada uno sube la suya, y cualquiera puede **proponerle** una foto a otro;
  queda pendiente hasta que el dueño la acepta o la rechaza.
- Imágenes en Cloudflare R2 (ver "Decisiones").

### 5. Juegos
- Anotador de truco: NOS / ELLOS, fósforos (4 rayas + diagonal = 5), malas/buenas a los 15,
  switch "a 30 / a 15", botones + y −, reglas de envido/truco y reiniciar.
- **¿Quién soy? (el de la frente)**: se elige quiénes juegan (confirmados + invitados),
  a cada uno se le asigna un personaje; cada celular muestra los personajes de los demás
  pero no el propio. Las preguntas de sí/no se hacen en voz alta; la app marca quién adivinó.
- Herramientas: dado, ruleta de castigos (elige un integrante), armar equipos.

### 6. Votaciones
- Una temporada por año con categorías configurables ("el más tomador",
  "el que más veces se quedó dormido", ...).
- Voto secreto, uno por categoría por integrante.
- Resultados bloqueados hasta la fecha de la despedida de año; ese día se "abren" en la app.

### 7. Estadísticas
- Mayor anfitrión, el que más fue, el que más se encargó del checklist, el que más puso, etc.
- Salen de los datos que ya se cargan; tienen sentido cuando haya varias juntadas.

### 8. Después
- Fotos que se borran a las 12h (flashes) y pantalla FOMO para los que no fueron.
- Juego de preguntas y respuestas (hace falta armar el banco de preguntas).
- Notificaciones push reales con la app cerrada.

## Decisiones

- **Imágenes en Cloudflare R2** en vez de Vercel Blob: más capacidad gratis, sin costo de
  salida y con reglas de vida para borrar solas las fotos efímeras. Requiere una cuenta de
  Cloudflare con un medio de pago cargado (aunque no se pase del plan gratis).
  Las fotos se achican en el celular antes de subirlas.
- Schema sincronizado con `prisma db push`, sin carpeta de migraciones.
- Sin librerías nuevas sin proponerlas antes.
