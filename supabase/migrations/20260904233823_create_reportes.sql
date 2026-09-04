create table reportes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  problema text not null,
  descripcion text,
  nombre text,
  telefono text,
  correo text,
  domicilio text,
  referencias text,
  foto_url text,
  created_at timestamp default now()
);
