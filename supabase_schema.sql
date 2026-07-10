-- ============================================================
-- TurnoDoc BPM — Schema Supabase
-- Ejecutar en el SQL Editor de tu proyecto Supabase
-- ============================================================

-- Tabla de EDS (estaciones de servicio)
create table if not exists eds (
  id uuid default gen_random_uuid() primary key,
  codigo text not null unique,
  nombre text not null,
  direccion text,
  created_at timestamptz default now()
);

-- Insertar EDS piloto
insert into eds (codigo, nombre, direccion)
values ('40533', 'Pronto Express Ovalle', 'Gobernadora Laura Pizarro N°111, Ovalle')
on conflict (codigo) do nothing;

-- Tabla de personal
create table if not exists personal (
  id uuid default gen_random_uuid() primary key,
  eds_id uuid references eds(id),
  nombre text not null,
  rol text not null default 'tienda', -- 'supervisora', 'tienda', 'combustible'
  activo boolean default true,
  created_at timestamptz default now()
);

-- Insertar personal Pronto Express
insert into personal (eds_id, nombre, rol)
select id, 'María Luisa Acuña', 'supervisora' from eds where codigo = '40533'
union all
select id, 'Zoila Caimanque', 'tienda' from eds where codigo = '40533'
union all
select id, 'Vianca Rivera', 'tienda' from eds where codigo = '40533'
union all
select id, 'Ivonne Rojas', 'tienda' from eds where codigo = '40533'
union all
select id, 'Gabriela Lara', 'tienda' from eds where codigo = '40533'
union all
select id, 'Vanessa Guerrero', 'tienda' from eds where codigo = '40533';

-- Tabla principal de registros BPM (cabecera)
create table if not exists registros_bpm (
  id uuid default gen_random_uuid() primary key,
  eds_id uuid references eds(id),
  tipo text not null, -- 'manipuladores', 'temperatura', 'superficies', 'recepcion'
  fecha date not null default current_date,
  turno text not null, -- 'Mañana', 'Tarde', 'Noche'
  responsable text not null,
  tiene_nc boolean default false,
  created_at timestamptz default now()
);

-- Tabla de ítems de manipuladores
create table if not exists registro_manipuladores (
  id uuid default gen_random_uuid() primary key,
  registro_id uuid references registros_bpm(id) on delete cascade,
  persona text not null,
  item text not null,
  resultado text not null, -- 'C', 'NC', 'NA'
  accion_correctiva text,
  created_at timestamptz default now()
);

-- Tabla de temperaturas
create table if not exists registro_temperaturas (
  id uuid default gen_random_uuid() primary key,
  registro_id uuid references registros_bpm(id) on delete cascade,
  equipo text not null,
  rango_min numeric,
  rango_max numeric,
  temperatura numeric,
  resultado text, -- 'OK', 'FUERA_RANGO'
  accion_correctiva text,
  created_at timestamptz default now()
);

-- Tabla de superficies
create table if not exists registro_superficies (
  id uuid default gen_random_uuid() primary key,
  registro_id uuid references registros_bpm(id) on delete cascade,
  item text not null,
  seccion text not null, -- 'limpieza', 'desechos', 'quimicos'
  resultado text not null, -- 'C', 'NC', 'NA'
  accion_correctiva text,
  created_at timestamptz default now()
);

-- Tabla de recepción de materias primas
create table if not exists registro_recepcion (
  id uuid default gen_random_uuid() primary key,
  registro_id uuid references registros_bpm(id) on delete cascade,
  proveedor text,
  n_factura text,
  patente_camion text,
  higiene_camion text,
  producto text not null,
  temperatura numeric,
  fecha_elaboracion date,
  fecha_vencimiento date not null,
  estado_empaque text,
  decision text not null, -- 'Acepta', 'Rechaza'
  created_at timestamptz default now()
);

-- Vista para historial de últimos 3 meses (útil para SEREMI)
create or replace view historial_bpm as
select
  r.id,
  e.nombre as eds,
  r.tipo,
  r.fecha,
  r.turno,
  r.responsable,
  r.tiene_nc,
  r.created_at
from registros_bpm r
join eds e on e.id = r.eds_id
where r.fecha >= current_date - interval '90 days'
order by r.fecha desc, r.created_at desc;

-- Política de acceso (Row Level Security)
alter table registros_bpm enable row level security;
alter table registro_manipuladores enable row level security;
alter table registro_temperaturas enable row level security;
alter table registro_superficies enable row level security;
alter table registro_recepcion enable row level security;
alter table personal enable row level security;
alter table eds enable row level security;

-- Permitir lectura y escritura pública por ahora (ajustar con auth después)
create policy "acceso publico" on registros_bpm for all using (true);
create policy "acceso publico" on registro_manipuladores for all using (true);
create policy "acceso publico" on registro_temperaturas for all using (true);
create policy "acceso publico" on registro_superficies for all using (true);
create policy "acceso publico" on registro_recepcion for all using (true);
create policy "acceso publico" on personal for all using (true);
create policy "acceso publico" on eds for all using (true);
