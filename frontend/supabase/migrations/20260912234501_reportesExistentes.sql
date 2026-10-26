create table reportesExistentes (
  folio text not null,
  estado text not null,
  departamentoActual integer not null references departamentos(id),
  created_at timestamp default now(),
  constraint fk_folio foreign key (folio) references reportes(folio) on delete cascade
);
