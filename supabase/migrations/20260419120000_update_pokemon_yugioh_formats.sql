-- Catálogo: formatos específicos para Pokémon TCG e Yu-Gi-Oh!
-- Substitui Torneio/Casual; remapeia meetups, perfis e locais para os novos slugs.

-- Novos formatos (upsert por game_id + slug)
with ygo as (select id from public.games where slug = 'yugioh')
insert into public.formats (game_id, slug, name)
select ygo.id, seed.slug, seed.name
from ygo
cross join (
  values
    ('yugioh-advanced', 'Advanced'),
    ('yugioh-speed-duel', 'Speed Duel'),
    ('yugioh-traditional', 'Traditional'),
    ('yugioh-outros', 'Outros')
) as seed(slug, name)
on conflict (game_id, slug) do update
set name = excluded.name;

with pkm as (select id from public.games where slug = 'pokemon-tcg')
insert into public.formats (game_id, slug, name)
select pkm.id, seed.slug, seed.name
from pkm
cross join (
  values
    ('pokemon-standard', 'Standard'),
    ('pokemon-expanded', 'Expanded'),
    ('pokemon-unlimited', 'Unlimited'),
    ('pokemon-glc', 'Gym Leader Challenge (GLC)'),
    ('pokemon-draft-limited', 'Draft/Limited'),
    ('pokemon-outros', 'Outros')
) as seed(slug, name)
on conflict (game_id, slug) do update
set name = excluded.name;

-- Remapeamento legado → novo (torneio/competitivo → opção “principal”; casual → tradicional / outros)
-- Yu-Gi-Oh!: torneio → Advanced; casual → Traditional
-- Pokémon: torneio → Standard; casual → Outros

do $$
declare
  y_torneio uuid;
  y_casual uuid;
  y_advanced uuid;
  y_traditional uuid;
  p_torneio uuid;
  p_casual uuid;
  p_standard uuid;
  p_outros uuid;
begin
  select f.id into y_torneio
  from public.formats f
  join public.games g on g.id = f.game_id
  where g.slug = 'yugioh' and f.slug = 'yugioh-torneio';

  select f.id into y_casual
  from public.formats f
  join public.games g on g.id = f.game_id
  where g.slug = 'yugioh' and f.slug = 'yugioh-casual';

  select f.id into y_advanced
  from public.formats f
  join public.games g on g.id = f.game_id
  where g.slug = 'yugioh' and f.slug = 'yugioh-advanced';

  select f.id into y_traditional
  from public.formats f
  join public.games g on g.id = f.game_id
  where g.slug = 'yugioh' and f.slug = 'yugioh-traditional';

  select f.id into p_torneio
  from public.formats f
  join public.games g on g.id = f.game_id
  where g.slug = 'pokemon-tcg' and f.slug = 'pokemon-torneio';

  select f.id into p_casual
  from public.formats f
  join public.games g on g.id = f.game_id
  where g.slug = 'pokemon-tcg' and f.slug = 'pokemon-casual';

  select f.id into p_standard
  from public.formats f
  join public.games g on g.id = f.game_id
  where g.slug = 'pokemon-tcg' and f.slug = 'pokemon-standard';

  select f.id into p_outros
  from public.formats f
  join public.games g on g.id = f.game_id
  where g.slug = 'pokemon-tcg' and f.slug = 'pokemon-outros';

  -- Evita violação de unique em player_formats / venue_formats ao remapear
  if y_torneio is not null and y_advanced is not null then
    delete from public.player_formats pf
    where pf.format_id = y_torneio
      and exists (
        select 1
        from public.player_formats pf2
        where pf2.player_id = pf.player_id
          and pf2.format_id = y_advanced
      );

    delete from public.venue_formats vf
    where vf.format_id = y_torneio
      and exists (
        select 1
        from public.venue_formats vf2
        where vf2.venue_id = vf.venue_id
          and vf2.format_id = y_advanced
      );

    delete from public.venue_suggestion_formats sf
    where sf.format_id = y_torneio
      and exists (
        select 1
        from public.venue_suggestion_formats sf2
        where sf2.suggestion_id = sf.suggestion_id
          and sf2.format_id = y_advanced
      );

    update public.meetup_posts set desired_format_id = y_advanced where desired_format_id = y_torneio;
    update public.player_formats set format_id = y_advanced where format_id = y_torneio;
    update public.venue_formats set format_id = y_advanced where format_id = y_torneio;
    update public.venue_suggestion_formats set format_id = y_advanced where format_id = y_torneio;
  end if;

  if y_casual is not null and y_traditional is not null then
    delete from public.player_formats pf
    where pf.format_id = y_casual
      and exists (
        select 1
        from public.player_formats pf2
        where pf2.player_id = pf.player_id
          and pf2.format_id = y_traditional
      );

    delete from public.venue_formats vf
    where vf.format_id = y_casual
      and exists (
        select 1
        from public.venue_formats vf2
        where vf2.venue_id = vf.venue_id
          and vf2.format_id = y_traditional
      );

    delete from public.venue_suggestion_formats sf
    where sf.format_id = y_casual
      and exists (
        select 1
        from public.venue_suggestion_formats sf2
        where sf2.suggestion_id = sf.suggestion_id
          and sf2.format_id = y_traditional
      );

    update public.meetup_posts set desired_format_id = y_traditional where desired_format_id = y_casual;
    update public.player_formats set format_id = y_traditional where format_id = y_casual;
    update public.venue_formats set format_id = y_traditional where format_id = y_casual;
    update public.venue_suggestion_formats set format_id = y_traditional where format_id = y_casual;
  end if;

  if p_torneio is not null and p_standard is not null then
    delete from public.player_formats pf
    where pf.format_id = p_torneio
      and exists (
        select 1
        from public.player_formats pf2
        where pf2.player_id = pf.player_id
          and pf2.format_id = p_standard
      );

    delete from public.venue_formats vf
    where vf.format_id = p_torneio
      and exists (
        select 1
        from public.venue_formats vf2
        where vf2.venue_id = vf.venue_id
          and vf2.format_id = p_standard
      );

    delete from public.venue_suggestion_formats sf
    where sf.format_id = p_torneio
      and exists (
        select 1
        from public.venue_suggestion_formats sf2
        where sf2.suggestion_id = sf.suggestion_id
          and sf2.format_id = p_standard
      );

    update public.meetup_posts set desired_format_id = p_standard where desired_format_id = p_torneio;
    update public.player_formats set format_id = p_standard where format_id = p_torneio;
    update public.venue_formats set format_id = p_standard where format_id = p_torneio;
    update public.venue_suggestion_formats set format_id = p_standard where format_id = p_torneio;
  end if;

  if p_casual is not null and p_outros is not null then
    delete from public.player_formats pf
    where pf.format_id = p_casual
      and exists (
        select 1
        from public.player_formats pf2
        where pf2.player_id = pf.player_id
          and pf2.format_id = p_outros
      );

    delete from public.venue_formats vf
    where vf.format_id = p_casual
      and exists (
        select 1
        from public.venue_formats vf2
        where vf2.venue_id = vf.venue_id
          and vf2.format_id = p_outros
      );

    delete from public.venue_suggestion_formats sf
    where sf.format_id = p_casual
      and exists (
        select 1
        from public.venue_suggestion_formats sf2
        where sf2.suggestion_id = sf.suggestion_id
          and sf2.format_id = p_outros
      );

    update public.meetup_posts set desired_format_id = p_outros where desired_format_id = p_casual;
    update public.player_formats set format_id = p_outros where format_id = p_casual;
    update public.venue_formats set format_id = p_outros where format_id = p_casual;
    update public.venue_suggestion_formats set format_id = p_outros where format_id = p_casual;
  end if;
end $$;

delete from public.formats
where slug in (
  'yugioh-torneio',
  'yugioh-casual',
  'pokemon-torneio',
  'pokemon-casual'
);
