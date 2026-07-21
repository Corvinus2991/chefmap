# ChefMap — guía de despliegue

Sigue estos pasos en orden. No hace falta escribir código, solo copiar y pegar.

## 1. Crear las tablas en Supabase

1. Abre tu proyecto en https://supabase.com/dashboard
2. En el menú lateral, ve a **SQL Editor**
3. Pulsa **New query**, pega este bloque completo y dale a **Run**:

```sql
create table professionals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  restaurant text not null,
  city text not null,
  years int not null default 0,
  specialties text[] not null default '{}',
  bio text,
  email text,
  created_at timestamptz not null default now()
);

create table recommendations (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid references professionals(id) on delete cascade,
  place text not null,
  zone text not null,
  cuisine text,
  text text not null,
  tags text[] not null default '{}',
  conflict boolean not null default false,
  created_at timestamptz not null default now()
);

alter table professionals enable row level security;
alter table recommendations enable row level security;

-- Nota: estas políticas permiten lectura y escritura pública, suficiente
-- para el lanzamiento inicial. Antes de abrir la app a mucho público,
-- hay que sustituirlas por políticas ligadas a autenticación real.
create policy "public read professionals" on professionals for select using (true);
create policy "public insert professionals" on professionals for insert with check (true);
create policy "public read recommendations" on recommendations for select using (true);
create policy "public insert recommendations" on recommendations for insert with check (true);
```

4. Deberías ver "Success. No rows returned" — las dos tablas ya existen.

## 2. Coger las claves de conexión

1. En Supabase, ve a **Project Settings** (icono de engranaje) → **API**
2. Copia el **Project URL** y la clave **anon public**
3. Guárdalas, las necesitas en el paso 4

## 3. Subir el proyecto a GitHub (sin usar la terminal)

1. Ve a https://github.com/new
2. Nombre del repositorio: `chefmap`
3. Déjalo en **Public** o **Private**, como prefieras, y pulsa **Create repository**
4. En la página del repositorio recién creado, pulsa el enlace **uploading an existing file**
5. Arrastra ahí **todos los archivos y carpetas de este proyecto** (manteniendo la estructura de carpetas `app/`, `components/`, `lib/`)
6. Baja y pulsa **Commit changes**

## 4. Desplegar en Vercel

1. Ve a https://vercel.com/new
2. Elige **Import** junto al repositorio `chefmap` que acabas de subir
3. En **Environment Variables**, añade:
   - `NEXT_PUBLIC_SUPABASE_URL` → pega el Project URL de Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → pega la clave anon public
4. Pulsa **Deploy** y espera 1-2 minutos

Al terminar, Vercel te da una URL real (algo como `chefmap.vercel.app`) donde la app ya funciona de verdad, con base de datos real: cualquiera que la abra puede registrarse como profesional y publicar recomendaciones, y quedan guardadas para todo el mundo.

## Siguientes pasos recomendados

- Cargar a mano los primeros perfiles verificados (los de la lista de Barcelona) directamente desde la propia app
- Cuando queramos login real (email/contraseña o Google) en vez del sistema actual de "perfil de sesión", añadimos Supabase Auth — es el siguiente paso natural
- Dominio propio: en Vercel, **Settings → Domains**, se puede añadir `chefmap.com` en cuanto lo compres
