drop function if exists public.seed_set_profile_geo(uuid, double precision, double precision);

drop function if exists public.seed_create_venue(
  uuid,
  text,
  text,
  text,
  text,
  double precision,
  double precision,
  public.venue_kind,
  uuid[]
);
