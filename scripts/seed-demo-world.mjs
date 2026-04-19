#!/usr/bin/env node
/**
 * Gera 29 contas fictícias (+ sua conta @luanmartins = 30 jogadores),
 * 10 amizades aceitas com o @luanmartins, interesses em jogos/formatos e 12 locais em SP.
 *
 * Pré-requisito: migration `20260423140000_seed_demo_helpers.sql` aplicada (`npm run db:push`).
 *
 * Env:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Uso:
 *   export SUPABASE_URL=...
 *   export SUPABASE_SERVICE_ROLE_KEY=...
 *   node scripts/seed-demo-world.mjs
 *
 * Login das contas seed: email demoNN@seed.good-game.invalid — senha GoodGameSeed!2026
 */

import { createClient } from "@supabase/supabase-js";

const SEED_PASSWORD = "GoodGameSeed!2026";
const SEED_EMAIL_DOMAIN = "seed.good-game.invalid";
const HANDLE_PREFIX = "gg_demo_";
const FRIEND_COUNT = 10;
const TOTAL_SEED_USERS = 29;

const DISPLAY_NAMES = [
  "Ana Beatriz",
  "Bruno Costa",
  "Carla Duarte",
  "Diego Fernandes",
  "Eduarda Gomes",
  "Felipe Henrique",
  "Gabriela Inácio",
  "Henrique Junqueira",
  "Isabela Kuhn",
  "João Lucas",
  "Karina Lima",
  "Lucas Martins",
  "Marina Nogueira",
  "Nicolas Oliveira",
  "Olívia Prado",
  "Paulo Queiroz",
  "Rafaela Rocha",
  "Samuel Teixeira",
  "Tatiana Uchoa",
  "Vinícius Viana",
  "Wesley Xavier",
  "Yasmin Zanetti",
  "André Alves",
  "Bianca Barros",
  "Caio Cunha",
  "Daniela Dias",
  "Eduardo Esteves",
  "Fabiana Freitas",
  "Gustavo Guimarães",
];

const NEIGHBORHOODS = [
  "Pinheiros",
  "Vila Madalena",
  "Itaim Bibi",
  "Moema",
  "Jardins",
  "Consolação",
  "Bela Vista",
  "Liberdade",
  "Santana",
  "Tatuapé",
  "Brooklin",
  "Campo Belo",
];

const BASE_LAT = -23.56;
const BASE_LNG = -46.67;

function jitter(i, max = 0.06) {
  const s = Math.sin(i * 12.9898) * 43758.5453;
  const r = s - Math.floor(s);
  return (r - 0.5) * max;
}

const VENUE_TEMPLATES = [
  { name: "Casa do Dado", neighborhood: "Pinheiros", kind: "public_place" },
  { name: "Mesa Redonda Board Games", neighborhood: "Vila Madalena", kind: "specialty_store" },
  { name: "Spell & Sword Café", neighborhood: "Itaim Bibi", kind: "specialty_store" },
  { name: "Parque Jogador — área coberta", neighborhood: "Moema", kind: "public_place" },
  { name: "Central TCG Paulista", neighborhood: "Consolação", kind: "specialty_store" },
  { name: "Armazém do Tabuleiro", neighborhood: "Liberdade", kind: "specialty_store" },
  { name: "Arena Yu-Gi-Oh! Zona Sul", neighborhood: "Brooklin", kind: "specialty_store" },
  { name: "Pokémon League — Shopping", neighborhood: "Tatuapé", kind: "public_place" },
  { name: "Magic Pit — Commander Night", neighborhood: "Jardins", kind: "specialty_store" },
  { name: "Biblioteca Pública — salão de jogos", neighborhood: "Santana", kind: "public_place" },
  { name: "Ludoteca Comunitária", neighborhood: "Campo Belo", kind: "public_place" },
  { name: "Nerd Haven", neighborhood: "Bela Vista", kind: "specialty_store" },
];

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function loadCatalog() {
  const { data: formats, error: fErr } = await supabase.from("formats").select("id, slug, game_id");
  if (fErr) throw fErr;

  const pick = (slug) => (formats ?? []).find((x) => x.slug === slug);

  return {
    allFormats: formats ?? [],
    formatIds: {
      commander: pick("commander")?.id,
      modern: pick("modern")?.id,
      tabuleiroCasual: pick("tabuleiro-casual")?.id,
      ygoAdvanced: pick("yugioh-advanced")?.id,
      pkmStandard: pick("pokemon-standard")?.id,
    },
  };
}

function pickFormatIdsForUser(i, formatIds) {
  const pool = [
    formatIds.commander,
    formatIds.modern,
    formatIds.tabuleiroCasual,
    formatIds.ygoAdvanced,
    formatIds.pkmStandard,
  ].filter(Boolean);
  const a = pool[i % pool.length];
  const b = pool[(i + 2) % pool.length];
  return [...new Set([a, b].filter(Boolean))];
}

function pickVenueFormatIds(v, formatIds) {
  const pool = [
    formatIds.commander,
    formatIds.tabuleiroCasual,
    formatIds.ygoAdvanced,
    formatIds.pkmStandard,
  ].filter(Boolean);
  return [pool[v % pool.length]].filter(Boolean);
}

async function setPlayerInterests(uid, formatUuidList, allFormats) {
  const gameIds = new Set();
  for (const fid of formatUuidList) {
    const row = allFormats.find((x) => x.id === fid);
    if (row) gameIds.add(row.game_id);
  }

  await supabase.from("player_games").delete().eq("player_id", uid);
  await supabase.from("player_formats").delete().eq("player_id", uid);

  if (gameIds.size > 0) {
    const { error: gErr } = await supabase
      .from("player_games")
      .insert([...gameIds].map((game_id) => ({ player_id: uid, game_id })));
    if (gErr) throw gErr;
  }

  if (formatUuidList.length > 0) {
    const { error: fErr } = await supabase.from("player_formats").insert(
      formatUuidList.map((format_id) => ({ player_id: uid, format_id }))
    );
    if (fErr) throw fErr;
  }
}

async function findLuanProfile() {
  const exact = await supabase.from("profiles").select("user_id, handle").eq("handle", "luanmartins").maybeSingle();

  if (exact.data) return exact.data;

  const like = await supabase
    .from("profiles")
    .select("user_id, handle")
    .ilike("handle", "luanmartins%")
    .limit(1)
    .maybeSingle();

  return like.data ?? null;
}

async function main() {
  const { gamesBySlug, allFormats, formatIds } = await loadCatalog();

  const luan = await findLuanProfile();
  if (!luan) {
    console.error(
      'Não encontrei perfil com handle "luanmartins" (ou começando com isso). Ajuste o handle e rode de novo.'
    );
    process.exit(1);
  }

  console.log(`Conta principal: @${luan.handle} (${luan.user_id})\n`);

  const createdUserIds = [];

  for (let i = 1; i <= TOTAL_SEED_USERS; i++) {
    const email = `demo${String(i).padStart(2, "0")}@${SEED_EMAIL_DOMAIN}`;
    const handle = `${HANDLE_PREFIX}${String(i).padStart(2, "0")}`;
    const displayName = DISPLAY_NAMES[i - 1] ?? `Jogador Demo ${i}`;
    const lat = BASE_LAT + jitter(i);
    const lng = BASE_LNG + jitter(i + 3);

    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password: SEED_PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });

    let uid;

    if (createErr) {
      const msg = createErr.message ?? "";
      if (msg.includes("already registered") || msg.includes("already been registered")) {
        const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 400 });
        if (listErr) throw listErr;
        const existing = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
        if (!existing) throw createErr;
        uid = existing.id;
        console.log(`Reuso conta existente: ${email}`);
      } else {
        throw createErr;
      }
    } else {
      uid = created.user.id;
    }

    createdUserIds.push({ id: uid, handle, displayName, index: i });

    const { error: upErr } = await supabase
      .from("profiles")
      .update({
        handle,
        display_name: displayName,
        bio: `Perfil fictício #${i} para testes do Good Game.`,
        neighborhood: NEIGHBORHOODS[i % NEIGHBORHOODS.length],
        can_host: i % 4 === 0,
        search_radius_km: 10 + (i % 8),
      })
      .eq("user_id", uid);

    if (upErr) throw upErr;

    const { error: geoErr } = await supabase.rpc("seed_set_profile_geo", {
      p_user_id: uid,
      p_lat: lat,
      p_lng: lng,
    });

    if (geoErr) {
      console.warn(`seed_set_profile_geo falhou (${email}):`, geoErr.message);
      console.warn("Aplique a migration 20260423140000_seed_demo_helpers.sql (npm run db:push) e rode de novo.");
      throw geoErr;
    }

    const fids = pickFormatIdsForUser(i, formatIds);
    await setPlayerInterests(uid, fids, allFormats);

    await supabase.from("user_presence").upsert(
      {
        user_id: uid,
        last_seen_at: new Date(Date.now() - (i % 9) * 3600_000).toISOString(),
      },
      { onConflict: "user_id" }
    );

    console.log(`OK ${email} → @${handle}`);
  }

  const luanId = luan.user_id;

  for (let i = 0; i < FRIEND_COUNT && i < createdUserIds.length; i++) {
    const other = createdUserIds[i].id;
    const { error: frErr } = await supabase.from("friendships").insert({
      requester_user_id: luanId,
      addressee_user_id: other,
      status: "accepted",
      responded_at: new Date().toISOString(),
    });

    if (frErr) {
      if (frErr.code === "23505" || frErr.message?.includes("duplicate")) {
        console.log(`Amizade já existe: @${luan.handle} ↔ @${createdUserIds[i].handle}`);
      } else {
        console.warn("Amizade:", frErr.message);
      }
    } else {
      console.log(`Amizade: @${luan.handle} ↔ @${createdUserIds[i].handle}`);
    }
  }

  const creatorId = createdUserIds[0]?.id;
  if (creatorId) {
    for (let v = 0; v < VENUE_TEMPLATES.length; v++) {
      const t = VENUE_TEMPLATES[v];
      const plat = BASE_LAT + jitter(v + 20, 0.08);
      const plng = BASE_LNG + jitter(v + 31, 0.08);
      const fmt = pickVenueFormatIds(v, formatIds);

      const { data: venueId, error: vErr } = await supabase.rpc("seed_create_venue", {
        p_created_by: creatorId,
        p_name: t.name,
        p_neighborhood: t.neighborhood,
        p_address: `Rua fictícia ${100 + v}, ${t.neighborhood}`,
        p_details: "Local gerado pelo script de demo (seed).",
        p_lat: plat,
        p_lng: plng,
        p_kind: t.kind,
        p_format_ids: fmt,
      });

      if (vErr) {
        console.warn(`Local "${t.name}":`, vErr.message);
      } else {
        console.log(`Local: ${t.name} (${venueId})`);
      }
    }
  }

  console.log("\n── Resumo ──");
  console.log(`Jogadores seed: ${TOTAL_SEED_USERS} (handles @${HANDLE_PREFIX}01 …)`);
  console.log(`Amigos de @${luan.handle}: ${FRIEND_COUNT} primeiros`);
  console.log(`Locais: até ${VENUE_TEMPLATES.length}`);
  console.log(`Senha das contas *@${SEED_EMAIL_DOMAIN}: ${SEED_PASSWORD}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
