# TurnoDoc BPM — Pronto Express

Aplicación web para registros BPM de tiendas de conveniencia en estaciones de servicio.

---

## Pasos para poner en producción

### Paso 1: Crear cuenta en Supabase
1. Ir a https://supabase.com y crear cuenta gratuita
2. Crear nuevo proyecto (nombre: `turnodoc-bpm`)
3. Guardar la contraseña del proyecto
4. Esperar que termine de configurarse (1-2 minutos)

### Paso 2: Crear las tablas en Supabase
1. En el panel de Supabase, ir a **SQL Editor**
2. Abrir el archivo `supabase_schema.sql` de este proyecto
3. Copiar todo el contenido y pegarlo en el SQL Editor
4. Hacer clic en **Run**
5. Verificar que aparezcan las tablas en **Table Editor**

### Paso 3: Obtener las credenciales de Supabase
1. En Supabase ir a **Settings → API**
2. Copiar:
   - **Project URL** (algo como `https://xxxx.supabase.co`)
   - **anon public key** (clave larga)

### Paso 4: Crear cuenta en Vercel
1. Ir a https://vercel.com y crear cuenta gratuita (usar cuenta GitHub)
2. Si no tienes GitHub, crear cuenta en https://github.com primero

### Paso 5: Subir el código a GitHub
1. Crear repositorio nuevo en GitHub (nombre: `turnodoc-bpm`)
2. Subir todos los archivos de este proyecto al repositorio

### Paso 6: Conectar Vercel con GitHub
1. En Vercel, hacer clic en **Add New Project**
2. Seleccionar el repositorio `turnodoc-bpm`
3. En **Environment Variables** agregar:
   - `VITE_SUPABASE_URL` → pegar el Project URL de Supabase
   - `VITE_SUPABASE_ANON_KEY` → pegar el anon key de Supabase
4. Hacer clic en **Deploy**
5. En 2-3 minutos tendrás la URL de la aplicación

---

## Estructura del proyecto

```
turnoDoc-bpm/
├── index.html              # Entrada principal
├── vite.config.js          # Configuración de build
├── supabase_schema.sql     # Tablas de base de datos
├── .env.example            # Variables de entorno de ejemplo
└── src/
    ├── main.js             # Lógica principal de la app
    ├── db.js               # Conexión y operaciones con Supabase
    ├── supabase.js         # Cliente Supabase
    └── style.css           # Estilos
```

## Módulos incluidos

- **Manipuladores:** Control de higiene por persona en turno
- **Temperatura:** Equipos, vienesas y 4 salsas con validación automática
- **Superficies:** Limpieza, desechos y químicos
- **Recepción:** Materias primas con fecha de vencimiento obligatoria
- **Historial:** Últimos 3 meses filtrable por tipo de registro

## Personal configurado (EDS 40533)

- María Luisa Acuña (Supervisora)
- Zoila Caimanque
- Vianca Rivera
- Ivonne Rojas
- Gabriela Lara
- Vanessa Guerrero
