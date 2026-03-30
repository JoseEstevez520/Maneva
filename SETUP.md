# Guía de Setup para Desarrolladores — Maneva 🚀

Esta guía cubre cómo arrancar el proyecto desde cero.  
Lee el `CLAUDE.md` para entender la arquitectura completa.

---

## Requisitos Previos

- **Node.js** ≥ 18 ([descargar](https://nodejs.org/))
- **Expo Go** instaldo en tu móvil ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
- O un **emulador Android/iOS** configurado localmente

---

## 1. Clonar y Configurar

```bash
# Clonar el repositorio
git clone <URL_DEL_REPO>
cd Maneva/maneva

# Instalar dependencias
npm install
```

---

## 2. Variables de Entorno ⚠️

Crea el fichero `.env` en `maneva/` (nunca se sube a Git):

```bash
# maneva/.env
EXPO_PUBLIC_SUPABASE_URL=https://gewrcjwbuctdcdzybvza.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_MWdBIzsV8n-5GQb4bS3T_A_DB8foR03
EXPO_PUBLIC_N8N_WEBHOOK_URL=   # Dejar vacío por ahora
```

> ⚠️ **IMPORTANTE**: Pide la Anon Key al líder del proyecto si no la tienes.  
> Nunca hardcodees credenciales en el código.

---

## 3. Arrancar el Servidor de Desarrollo

```bash
# Desde la carpeta maneva/
npx expo start -c    # El flag -c limpia la caché (recomendado la primera vez)

# O sin limpiar caché (más rápido en arranques normales)
npx expo start
```

Después escanea el **código QR** con Expo Go desde tu móvil, o presiona:
- `a` → abrir en emulador Android
- `i` → abrir en simulador iOS
- `w` → abrir en el navegador (web)

---

## 4. Si el Emulador Android da Problemas

Si el emulador se queda bloqueado o da errores de caché, limpia con:

```powershell
# PowerShell — limpia el emulador desde cero
& "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -avd "Medium_Phone_API_36.1" -wipe-data
```

---

## 5. Regenerar Tipos de Base de Datos

Cada vez que alguien cambie algo en Supabase, regenera los tipos:

```bash
npx supabase gen types typescript --project-id gewrcjwbuctdcdzybvza > src/types/database.types.ts
```

> Necesitas `supabase` CLI instalado: `npm install -g supabase`

---

## 6. Estructura del Proyecto (Resumen)

```
maneva/
├── app/              ← Rutas (Expo Router). El nombre del fichero ES la ruta.
│   ├── _layout.tsx   ← Auth Guard + carga de fuentes
│   ├── login.tsx
│   ├── register.tsx
│   └── (tabs)/       ← Pantallas principales (logged in)
│
├── src/
│   ├── components/ui/  ← Componentes reutilizables (Button, Input, Card...)
│   ├── hooks/          ← Un hook por dominio (useAuth, useSalons...)
│   ├── services/       ← ÚNICA capa que habla con Supabase
│   ├── store/          ← Estado global (authStore, uiStore)
│   ├── lib/
│   │   └── supabase.ts ← ÚNICA instancia del cliente Supabase
│   └── types/
│       └── database.types.ts ← Tipos generados. NO editar a mano.
│
├── global.css          ← Estilos globales NativeWind
├── tailwind.config.js  ← Paleta de colores y fuentes premium
└── .env                ← Variables de entorno (NO en Git)
```

---

## 7. Flujo de Autenticación

```
App arranca
    │
    ↓
_layout.tsx (Auth Guard)
    │
    ├── ¿Sesión activa? → redirige a /(tabs)/home
    │
    └── ¿Sin sesión?   → redirige a /login
```

La sesión se persiste automáticamente con AsyncStorage — el usuario no tiene que hacer login cada vez que cierra la app.

---

## 8. Paleta de Colores Premium

| Token              | Valor       | Uso                          |
|--------------------|-------------|------------------------------|
| `gold`             | `#D4AF37`   | Botones primarios, acento    |
| `gold-light`       | `#F4E0A0`   | Fondos sutiles, decoración   |
| `premium-black`    | `#000000`   | Texto principal              |
| `premium-black-soft` | `#121212` | Fondos oscuros               |
| `premium-white`    | `#FFFFFF`   | Fondo base                   |
| `premium-white-soft` | `#FAFAFA` | Fondo ligeramente gris       |
| `premium-gray`     | `#737373`   | Texto secundario             |

### Fuentes
```tsx
// Regular — cuerpo
className="font-manrope"

// SemiBold — subtítulos
className="font-manrope-semibold"

// ExtraBold — títulos
className="font-manrope-extrabold"
```

---

## 9. Añadir un Módulo Nuevo

Sigue siempre este orden (ver `CLAUDE.md` para detalles):

1. `src/services/nuevo.service.ts` — lógica de Supabase
2. `src/hooks/useNuevo.ts` — gestión de loading/error
3. `src/components/nuevo/` — componentes específicos
4. `app/pantalla.tsx` — pantalla que consume el hook
5. Regenerar tipos si se cambió la DB

---

## 10. Commits

```bash
# Un commit por funcionalidad que funciona
git add .
git commit -m "feat(auth): implementar login con email y password"
```

Formato: `tipo(módulo): descripción en minúsculas`  
Tipos: `feat`, `fix`, `refactor`, `docs`, `style`
