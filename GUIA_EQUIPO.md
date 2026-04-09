# Guía del equipo — App de Peluquería

Esta guía es para entender cómo está montado el proyecto y por qué.
No es documentación técnica — es para que todos partamos del mismo punto.

---

## La gran foto — cómo funciona todo junto

Nuestra app usa tres piezas principales:

**React Native + Expo** es el motor de la app. Escribimos código en TypeScript y Expo lo convierte en una app real de iOS y Android. No es una web disfrazada — es código nativo de verdad.

**Supabase** es nuestro backend completo. Nos da base de datos, autenticación de usuarios, almacenamiento de fotos y chat en tiempo real. No necesitamos montar ningún servidor — Supabase ya lo tiene todo.

**n8n** gestiona los flujos de inteligencia artificial. Cuando la app necesita recomendaciones o el chatbot, llama a un webhook de n8n que ejecuta el flujo y devuelve la respuesta.

---

## Cómo está organizado el código

El proyecto sigue una estructura en capas. Cada capa tiene una responsabilidad y solo habla con la que tiene justo al lado.

```
Pantalla  →  Hook  →  Servicio  →  Supabase
```

**Las pantallas** solo se encargan de mostrar cosas. Reciben datos de un hook, muestran un spinner si está cargando y muestran un error si algo falla. No saben nada de Supabase ni de bases de datos.

**Los hooks** son la capa intermedia. Gestionan si algo está cargando (`loading`), si hubo un error (`error`) y qué datos hay (`data`). Llaman a los servicios para obtener o guardar datos.

**Los servicios** son la única parte del código que habla con Supabase. Están en `src/services/`. Si mañana cambiamos Supabase por otra base de datos, solo tocamos estos ficheros. El resto de la app no se entera.

---

## La regla más importante

> Supabase solo se puede importar en `src/services/`. En ningún otro sitio.

Si ves código así en una pantalla o en un hook, está mal:

```typescript
// ❌ MAL — supabase directo en una pantalla
import { supabase } from '@/lib/supabase'
supabase.from('bookings').select('*')
```

Así es como tiene que hacerse:

```typescript
// ✅ BIEN — la pantalla usa el hook, el hook usa el servicio
const { data, loading, error } = useBookings()
```

---

## Las carpetas — quién toca qué

Hay carpetas compartidas y carpetas de dominio. Es importante no pisarse.

**Carpetas compartidas** — las toca solo quien hizo el boilerplate:
- `src/components/ui/` — botones, inputs, cards... Si necesitas un componente nuevo aquí, avisa.
- `src/lib/supabase.ts` — el cliente de Supabase. No se toca.
- `src/store/` — el estado global. Hablar antes de añadir algo.

**Carpetas de dominio** — cada persona es dueña de la suya:
- `src/components/salon/` + `src/services/salons.service.ts`
- `src/components/booking/` + `src/services/bookings.service.ts`
- `src/components/chat/` + `src/services/chat.service.ts`

Si necesitas tocar algo fuera de tu carpeta, avisa primero al grupo.

---

## Cómo trabajar con Git

Nadie trabaja directamente en `main` ni en `dev`.

Cada funcionalidad tiene su propia rama. El flujo es:

```
1. Sincronizar con dev antes de empezar
   git checkout dev
   git pull origin dev

2. Crear tu rama
   git checkout -b feat/nombre-de-lo-que-haces

3. Trabajar y hacer commits pequeños
   git add .
   git commit -m "feat: descripción corta de lo que hiciste"

4. Subir tu rama
   git push origin feat/nombre-de-lo-que-haces

5. Abrir un Pull Request hacia dev en GitHub
```

**Sobre los commits:** un commit por cada cosa que funciona. No acumules todo en un commit gigante al final del día. Es difícil de revisar y hace los merges imposibles.

**Nombres de ramas:**
- `feat/booking-flow` — nueva funcionalidad
- `fix/salon-card-crash` — corrección de bug
- `chore/update-dependencies` — tareas de mantenimiento

---

## Los tres tipos de almacenamiento

Hay tres lugares donde se guardan cosas y cada uno tiene su uso:

**AsyncStorage** — el cajón del móvil. Guarda el token de sesión de Supabase para que el usuario no tenga que hacer login cada vez que abre la app. Usamos `src/lib/storage.ts` (`safeStorage`) para que sea compatible con Web/SSR sin dar errores de `window is not defined`.

**Supabase Storage** — la nube. Aquí van las fotos del portfolio de los salones, las imágenes de perfil... Se sube un fichero y Supabase devuelve una URL pública para mostrarlo. El servicio para esto está en `src/services/storage.service.ts`.

**Zustand y useState** — la memoria de trabajo. Datos que solo necesitas mientras la app está abierta. Zustand es para cosas que varias pantallas necesitan (el usuario logado, su rol). useState es para cosas que solo usa una pantalla.

---

## Variables de entorno

Las variables de configuración no van en el código — van en un fichero `.env` que cada uno tiene en su ordenador y que nunca se sube a GitHub.

Cuando clones el proyecto, copia el `.env.example` y renómbralo a `.env`. Luego pide las claves reales al compañero que montó el proyecto.

```bash
cp .env.example .env
# Edita .env y añade las claves reales
```

Las variables en Expo tienen el prefijo `EXPO_PUBLIC_` para las que son públicas. Nunca pongas claves secretas con ese prefijo — irían al código del cliente.

---

## Cómo usar Claude Code

Si usas Claude Code para desarrollar, hay una cosa crítica que hacer antes de empezar cada sesión:

**Claude Code lee el fichero `CLAUDE.md` automáticamente.** No hace falta decirle nada. Solo asegúrate de estar en la raíz del proyecto cuando lo abras.

Lo que sí tienes que hacer tú manualmente antes de pedirle que cree algo:

1. Busca si el componente ya existe en `src/components/ui/`
2. Busca si el servicio ya existe en `src/services/`
3. Busca si el hook ya existe en `src/hooks/`

Claude Code no sabe lo que ha creado otra persona. Si no compruebas esto, acabarás con componentes duplicados y merges dolorosos.

---

## Fechas y horas

Las reservas tienen fecha y hora. Para evitar bugs imposibles de encontrar, seguimos una regla simple:

- **En la base de datos:** siempre UTC en formato ISO 8601 — `"2026-04-15T10:30:00Z"`
- **Al mostrar al usuario:** convertir a hora local con `date-fns`
- **Nunca** guardar strings formateados como `"15 de abril"` en la base de datos

---

## Los roles de usuario

La app tiene tres tipos de usuarios. El rol de cada usuario está guardado en la tabla `profiles` de Supabase.

- **Cliente** — puede buscar salones, reservar citas, ver su historial y usar el chat
- **Dueño del salón** — puede gestionar su salón, ver todas las reservas del salón y usar el chat
- **Estilista** — puede ver su agenda y gestionar su disponibilidad

El rol se carga al hacer login y se guarda en el estado global de Zustand. Desde cualquier pantalla puedes acceder a él con `useAuthStore()`.

---

## Lo que NO hacer

- No crear componentes UI base nuevos sin avisar — se duplican y nadie sabe cuál usar
- No llamar a Supabase fuera de `src/services/`
- No guardar datos sensibles (claves, contraseñas) en AsyncStorage ni en el código
- No hardcodear colores, spacing ni fuentes — todo está en `tailwind.config.js`
- No hardcodear strings que se repiten — todo en `src/lib/constants.ts`
- No hacer commits con 500 líneas de cambios — commits pequeños y frecuentes

---

## Si algo no funciona

Antes de preguntar al grupo, comprueba en orden:

1. ¿Tienes el `.env` con las claves correctas?
2. ¿Has ejecutado `npm install` después del último `git pull`?
3. ¿Has regenerado los tipos de Supabase si cambiaste algo en la base de datos?
4. **¿Has tocado `babel.config.js` o `metro.config.js`?** Si alguien del equipo modificó esto, **el servidor explota silenciosamente o la app se queda en blanco**. Debes reiniciar expo con el comando mágico de limpiar caché: `npx expo start -c`.
5. ¿Da un error raro de ADB (Android) o no arranca el simulador? Vete a Android Studio, haz *Wipe Data* al simulador y arráncalo en limpio.
6. ¿La consola del simulador o dispositivo muestra algún error importante?

Si después de eso sigue sin funcionar, comparte el error exacto de la consola en el grupo.
