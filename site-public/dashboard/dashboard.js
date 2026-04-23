const STORAGE_KEYS = {
  url: "gg_dashboard_supabase_url",
  anonKey: "gg_dashboard_supabase_anon_key",
  email: "gg_dashboard_email",
  includeTestData: "gg_dashboard_include_test_data",
};

const EMBEDDED_CONFIG = window.GG_DASHBOARD_CONFIG ?? null;

const DEFAULT_STATE = {
  filters: {
    period: 30,
    platform: "all",
    feedbackType: "all",
    appVersion: "all",
    eventName: "all",
    game: "all",
    proStatus: "all",
    region: "all",
    includeTestData: true,
  },
  growthGranularity: "daily",
};

const state = {
  client: null,
  session: null,
  metadata: null,
  summary: null,
  growth: null,
  operations: null,
  feedback: null,
  advanced: null,
  funnel: null,
  retention: null,
  alerts: null,
  ...DEFAULT_STATE,
};

const els = {
  connectionForm: document.getElementById("connection-form"),
  accessCopy: document.getElementById("access-copy"),
  supabaseUrlField: document.getElementById("supabase-url-field"),
  supabaseAnonKeyField: document.getElementById("supabase-anon-key-field"),
  supabaseUrl: document.getElementById("supabase-url"),
  supabaseAnonKey: document.getElementById("supabase-anon-key"),
  email: document.getElementById("email"),
  password: document.getElementById("password"),
  loginButton: document.getElementById("login-button"),
  logoutButton: document.getElementById("logout-button"),
  testDataToggle: document.getElementById("test-data-toggle"),
  authStatus: document.getElementById("auth-status"),
  generatedAt: document.getElementById("generated-at"),
  periodFilter: document.getElementById("period-filter"),
  platformFilter: document.getElementById("platform-filter"),
  feedbackTypeFilter: document.getElementById("feedback-type-filter"),
  appVersionFilter: document.getElementById("app-version-filter"),
  eventNameFilter: document.getElementById("event-name-filter"),
  gameFilter: document.getElementById("game-filter"),
  proStatusFilter: document.getElementById("pro-status-filter"),
  regionFilter: document.getElementById("region-filter"),
  dataQualityPanel: document.getElementById("data-quality-panel"),
  executiveKpis: document.getElementById("executive-kpis"),
  usersGrowthChart: document.getElementById("users-growth-chart"),
  meetupsGrowthChart: document.getElementById("meetups-growth-chart"),
  usersComparison: document.getElementById("users-comparison"),
  meetupsComparison: document.getElementById("meetups-comparison"),
  operationsStatus: document.getElementById("operations-status"),
  operationsRegionBars: document.getElementById("operations-region-bars"),
  operationsGameBars: document.getElementById("operations-game-bars"),
  topCreatorsTable: document.getElementById("top-creators-table"),
  operationsHourChart: document.getElementById("operations-hour-chart"),
  feedbackKpis: document.getElementById("feedback-kpis"),
  feedbackChart: document.getElementById("feedback-chart"),
  feedbackTypeBars: document.getElementById("feedback-type-bars"),
  feedbackPlatformBars: document.getElementById("feedback-platform-bars"),
  recentFeedbackTable: document.getElementById("recent-feedback-table"),
  proKpis: document.getElementById("pro-kpis"),
  advancedKpis: document.getElementById("advanced-kpis"),
  featureActivityBars: document.getElementById("feature-activity-bars"),
  liquidityTable: document.getElementById("liquidity-table"),
  platformComparisonTable: document.getElementById("platform-comparison-table"),
  versionComparisonTable: document.getElementById("version-comparison-table"),
  funnelTable: document.getElementById("funnel-table"),
  retentionKpis: document.getElementById("retention-kpis"),
  cohortsTable: document.getElementById("cohorts-table"),
  alertsList: document.getElementById("alerts-list"),
  growthGranularity: document.getElementById("growth-granularity"),
  platformBanner: document.getElementById("platform-banner"),
  limitationsBanner: document.getElementById("limitations-banner"),
};

const palette = {
  accent: "#d86c2a",
  accentStrong: "#b65214",
  teal: "#0f766e",
  blue: "#2346a6",
  rose: "#a7464f",
  sand: "#c39f6a",
  neutral: "#817669",
};

function saveConfig() {
  localStorage.setItem(STORAGE_KEYS.url, els.supabaseUrl.value.trim());
  localStorage.setItem(STORAGE_KEYS.anonKey, els.supabaseAnonKey.value.trim());
  localStorage.setItem(STORAGE_KEYS.email, els.email.value.trim());
}

function loadConfig() {
  els.supabaseUrl.value =
    EMBEDDED_CONFIG?.supabaseUrl ?? localStorage.getItem(STORAGE_KEYS.url) ?? "";
  els.supabaseAnonKey.value =
    EMBEDDED_CONFIG?.supabaseAnonKey ?? localStorage.getItem(STORAGE_KEYS.anonKey) ?? "";
  els.email.value = localStorage.getItem(STORAGE_KEYS.email) ?? "";
  state.filters.includeTestData =
    localStorage.getItem(STORAGE_KEYS.includeTestData) !== "false";
}

function applyEmbeddedConfig() {
  if (!EMBEDDED_CONFIG?.supabaseUrl || !EMBEDDED_CONFIG?.supabaseAnonKey) {
    return;
  }

  document.body.classList.add("embedded-config");
  els.supabaseUrl.readOnly = true;
  els.supabaseAnonKey.readOnly = true;
  els.supabaseUrl.setAttribute("aria-readonly", "true");
  els.supabaseAnonKey.setAttribute("aria-readonly", "true");
  els.supabaseUrl.title = "Configurado automaticamente pelo ambiente local.";
  els.supabaseAnonKey.title = "Configurado automaticamente pelo ambiente local.";
  if (els.accessCopy) {
    els.accessCopy.textContent =
      "Painel privado com dados reais do Supabase. A conexao ja foi preenchida automaticamente; entre apenas com uma conta autorizada no allowlist dashboard_admin_users.";
  }
  setAuthStatus("Supabase configurado automaticamente. Entre apenas com e-mail e senha.");
}

function setAuthStatus(message, type = "info") {
  els.authStatus.textContent = message;
  els.authStatus.className = `status-card subtle ${type}`;
}

function persistTestDataPreference() {
  localStorage.setItem(STORAGE_KEYS.includeTestData, String(state.filters.includeTestData));
}

function renderTestDataToggle() {
  if (!els.testDataToggle) {
    return;
  }

  els.testDataToggle.textContent = state.filters.includeTestData
    ? "Ocultar dados de teste"
    : "Mostrar dados de teste";
  els.testDataToggle.classList.toggle("primary", !state.filters.includeTestData);
  els.testDataToggle.classList.toggle("ghost", state.filters.includeTestData);
}

function createClientFromInputs() {
  const supabaseUrl = els.supabaseUrl.value.trim();
  const supabaseAnonKey = els.supabaseAnonKey.value.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Preencha a URL e a anon key do Supabase.");
  }

  saveConfig();

  state.client = window.supabase.createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return state.client;
}

async function ensureClient() {
  if (state.client) {
    return state.client;
  }

  return createClientFromInputs();
}

async function signIn(event) {
  event.preventDefault();

  try {
    const client = await ensureClient();
    const email = els.email.value.trim();
    const password = els.password.value;

    if (!email || !password) {
      throw new Error("Informe e-mail e senha para autenticar.");
    }

    setAuthStatus("Autenticando no Supabase...");
    els.loginButton.disabled = true;
    saveConfig();

    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }

    state.session = data.session ?? null;
    els.password.value = "";
    setAuthStatus("Sessao autenticada. Carregando metricas...", "success");
    await bootstrapData();
  } catch (error) {
    setAuthStatus(resolveErrorMessage(error), "error");
  } finally {
    els.loginButton.disabled = false;
  }
}

async function signOut() {
  if (!state.client) {
    state.session = null;
    setAuthStatus("Sessao encerrada.");
    return;
  }

  const { error } = await state.client.auth.signOut();
  if (error) {
    setAuthStatus(resolveErrorMessage(error), "error");
    return;
  }

  state.session = null;
  state.metadata = null;
  state.summary = null;
  state.growth = null;
  state.operations = null;
  state.feedback = null;
  state.advanced = null;
  state.funnel = null;
  state.retention = null;
  state.alerts = null;
  renderAll();
  setAuthStatus("Sessao encerrada.");
}

function resolveErrorMessage(error) {
  const message = String(error?.message ?? error ?? "Erro inesperado.");

  if (message.includes("dashboard_forbidden")) {
    return "Conta autenticada, mas sem acesso ao dashboard. Adicione o user_id em dashboard_admin_users.";
  }

  if (message.includes("dashboard_not_authenticated")) {
    return "Sua sessao expirou. Entre novamente para acessar o dashboard.";
  }

  if (message.toLowerCase().includes("invalid login credentials")) {
    return "Credenciais invalidas. Confira e-mail e senha.";
  }

  return message;
}

function fillSelect(selectEl, options, selectedValue = "all") {
  selectEl.innerHTML = "";
  for (const option of options) {
    const opt = document.createElement("option");
    opt.value = String(option.value);
    opt.textContent = option.label;
    opt.selected = String(option.value) === String(selectedValue);
    selectEl.appendChild(opt);
  }
}

function hydrateFilters(metadata) {
  const filters = metadata?.filters ?? {};

  fillSelect(
    els.periodFilter,
    (filters.period_options ?? []).map((days) => ({
      value: days,
      label: `${days} dias`,
    })),
    state.filters.period
  );

  fillSelect(
    els.platformFilter,
    [
      { value: "all", label: "Todas as plataformas" },
      { value: "ios", label: "iOS" },
      { value: "android", label: "Android" },
    ],
    state.filters.platform
  );

  fillSelect(
    els.feedbackTypeFilter,
    [{ value: "all", label: "Todos os tipos" }].concat(
      (filters.feedback_types ?? []).map((type) => ({
        value: type,
        label: feedbackTypeLabel(type),
      }))
    ),
    state.filters.feedbackType
  );

  fillSelect(
    els.appVersionFilter,
    [{ value: "all", label: "Todas as versoes" }].concat(
      (filters.app_versions ?? []).map((version) => ({
        value: version,
        label: version,
      }))
    ),
    state.filters.appVersion
  );

  fillSelect(
    els.eventNameFilter,
    [{ value: "all", label: "Todos os eventos" }].concat(
      (filters.event_names ?? []).map((eventName) => ({
        value: eventName,
        label: eventName,
      }))
    ),
    state.filters.eventName
  );

  fillSelect(
    els.gameFilter,
    [{ value: "all", label: "Todos os jogos" }].concat(
      (filters.games ?? []).map((game) => ({
        value: game.slug,
        label: game.name,
      }))
    ),
    state.filters.game
  );

  fillSelect(
    els.proStatusFilter,
    [
      { value: "all", label: "Todos" },
      { value: "pro", label: "Somente Pro" },
      { value: "non_pro", label: "Somente nao Pro" },
    ],
    state.filters.proStatus
  );

  fillSelect(
    els.regionFilter,
    [{ value: "all", label: "Todas as regioes" }].concat(
      (filters.regions ?? []).map((region) => ({
        value: region.value,
        label: region.label,
      }))
    ),
    state.filters.region
  );
}

function currentRpcArgs() {
  return {
    p_days: Number(state.filters.period),
    p_game_slug: state.filters.game === "all" ? null : state.filters.game,
    p_game_type: state.filters.game === "all" ? null : state.filters.game,
    p_region: state.filters.region === "all" ? null : state.filters.region,
    p_platform: state.filters.platform === "all" ? null : state.filters.platform,
    p_app_version: state.filters.appVersion === "all" ? null : state.filters.appVersion,
    p_event_name: state.filters.eventName === "all" ? null : state.filters.eventName,
    p_pro_status: state.filters.proStatus,
    p_feedback_type: state.filters.feedbackType === "all" ? null : state.filters.feedbackType,
    p_include_test_data: state.filters.includeTestData,
  };
}

async function bootstrapData() {
  const client = await ensureClient();
  const { data: sessionData } = await client.auth.getSession();
  state.session = sessionData.session ?? state.session;

  if (!state.session) {
    setAuthStatus("Configure a conexao e autentique-se para carregar o dashboard.");
    return;
  }

  setAuthStatus("Carregando metricas e metadados...", "info");

  try {
    const metadataResponse = await client.rpc("dashboard_product_metadata");
    if (metadataResponse.error) {
      throw metadataResponse.error;
    }

    state.metadata = metadataResponse.data ?? null;
    hydrateFilters(state.metadata);

    await refreshDashboard();
    setAuthStatus("Dashboard conectado com sucesso.", "success");
  } catch (error) {
    setAuthStatus(resolveErrorMessage(error), "error");
  }
}

async function refreshDashboard() {
  const client = await ensureClient();
  const args = currentRpcArgs();

  const requests = await Promise.all([
    client.rpc("dashboard_product_summary", {
      p_game_slug: args.p_game_slug,
      p_region: args.p_region,
      p_pro_status: args.p_pro_status,
      p_feedback_type: args.p_feedback_type,
      p_include_test_data: args.p_include_test_data,
    }),
    client.rpc("dashboard_product_growth", {
      p_days: args.p_days,
      p_game_slug: args.p_game_slug,
      p_region: args.p_region,
      p_pro_status: args.p_pro_status,
      p_include_test_data: args.p_include_test_data,
    }),
    client.rpc("dashboard_product_operations", {
      p_days: args.p_days,
      p_game_slug: args.p_game_slug,
      p_region: args.p_region,
      p_include_test_data: args.p_include_test_data,
    }),
    client.rpc("dashboard_product_feedback", {
      p_days: args.p_days,
      p_feedback_type: args.p_feedback_type,
      p_platform: args.p_platform,
      p_app_version: args.p_app_version,
      p_include_test_data: args.p_include_test_data,
    }),
    client.rpc("dashboard_product_advanced_metrics", {
      p_days: args.p_days,
      p_platform: args.p_platform,
      p_app_version: args.p_app_version,
      p_event_name: args.p_event_name,
      p_region: args.p_region,
      p_game_type: args.p_game_type,
      p_pro_status: args.p_pro_status,
      p_include_test_data: args.p_include_test_data,
    }),
    client.rpc("dashboard_product_funnel", {
      p_days: args.p_days,
      p_platform: args.p_platform,
      p_app_version: args.p_app_version,
      p_include_test_data: args.p_include_test_data,
    }),
    client.rpc("dashboard_product_retention", {
      p_platform: args.p_platform,
      p_app_version: args.p_app_version,
      p_include_test_data: args.p_include_test_data,
    }),
    client.rpc("dashboard_product_alerts", {
      p_days: args.p_days,
      p_platform: args.p_platform,
      p_app_version: args.p_app_version,
      p_region: args.p_region,
      p_game_type: args.p_game_type,
      p_include_test_data: args.p_include_test_data,
    }),
  ]);

  for (const response of requests) {
    if (response.error) {
      throw response.error;
    }
  }

  state.summary = requests[0].data ?? null;
  state.growth = requests[1].data ?? null;
  state.operations = requests[2].data ?? null;
  state.feedback = requests[3].data ?? null;
  state.advanced = requests[4].data ?? null;
  state.funnel = requests[5].data ?? null;
  state.retention = requests[6].data ?? null;
  state.alerts = requests[7].data ?? null;
  renderAll();
}

function applyFilterEvents() {
  const filterMap = [
    ["period", els.periodFilter],
    ["platform", els.platformFilter],
    ["feedbackType", els.feedbackTypeFilter],
    ["appVersion", els.appVersionFilter],
    ["eventName", els.eventNameFilter],
    ["game", els.gameFilter],
    ["proStatus", els.proStatusFilter],
    ["region", els.regionFilter],
  ];

  for (const [key, element] of filterMap) {
    element.addEventListener("change", async () => {
      state.filters[key] = element.value;
      if (state.session) {
        await refreshDashboard().catch((error) => {
          setAuthStatus(resolveErrorMessage(error), "error");
        });
      }
    });
  }

  els.testDataToggle?.addEventListener("click", async () => {
    state.filters.includeTestData = !state.filters.includeTestData;
    persistTestDataPreference();
    renderTestDataToggle();

    if (state.session) {
      await refreshDashboard().catch((error) => {
        setAuthStatus(resolveErrorMessage(error), "error");
      });
    }
  });
}

function feedbackTypeLabel(type) {
  return (
    {
      bug: "Bug",
      suggestion: "Sugestao",
      praise: "Elogio",
      question: "Pergunta",
    }[type] ?? type
  );
}

function platformLabel(platform) {
  return (
    {
      ios: "iOS",
      android: "Android",
      unknown: "Nao informado",
      other: "Outras origens",
      all: "Todas",
      mobile: "Mobile",
    }[platform] ?? platform
  );
}

function formatNumber(value) {
  return new Intl.NumberFormat("pt-BR").format(Number(value ?? 0));
}

function formatPercent(value) {
  return `${Number(value ?? 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;
}

function formatDateTime(value) {
  if (!value) return "Sem dado";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function formatDayLabel(value, granularity) {
  const date = new Date(value);

  if (granularity === "monthly") {
    return new Intl.DateTimeFormat("pt-BR", {
      month: "short",
      year: "2-digit",
      timeZone: "UTC",
    }).format(date);
  }

  if (granularity === "weekly") {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      timeZone: "UTC",
    }).format(date);
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

function renderKpis(container, cards) {
  if (!cards.length) {
    container.innerHTML = `<div class="empty-state">Nenhuma metrica disponivel para os filtros atuais.</div>`;
    return;
  }

  container.innerHTML = cards
    .map(
      (card) => `
        <article class="kpi-card">
          <div class="kpi-label">${card.label}</div>
          <strong class="kpi-value">${card.value}</strong>
          ${
            card.badges?.length
              ? `<div class="kpi-badges">${card.badges
                  .map((badge) => `<span class="pill">${badge}</span>`)
                  .join("")}</div>`
              : ""
          }
          ${card.foot ? `<div class="kpi-foot">${card.foot}</div>` : ""}
        </article>
      `
    )
    .join("");
}

function lineChartMarkup(series, options = {}) {
  const width = 960;
  const height = options.height ?? 260;
  const padding = { top: 14, right: 20, bottom: 34, left: 16 };
  const maxValue = Math.max(
    1,
    ...series.flatMap((line) => line.points.map((point) => Number(point.total ?? 0)))
  );
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const labels = series[0]?.points ?? [];

  if (!labels.length) {
    return `<div class="chart-empty">Sem serie temporal para os filtros atuais.</div>`;
  }

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const y = padding.top + chartHeight - chartHeight * ratio;
    return `<line x1="${padding.left}" x2="${width - padding.right}" y1="${y}" y2="${y}" stroke="rgba(28,25,22,0.08)" stroke-width="1" />`;
  });

  const paths = series
    .map((line) => {
      const coords = line.points.map((point, index) => {
        const x =
          padding.left + (index / Math.max(1, line.points.length - 1)) * chartWidth;
        const y =
          padding.top + chartHeight - (Number(point.total ?? 0) / maxValue) * chartHeight;
        return { x, y, total: point.total };
      });

      const path = coords
        .map((coord, index) => `${index === 0 ? "M" : "L"} ${coord.x} ${coord.y}`)
        .join(" ");

      return `
        <path d="${path}" fill="none" stroke="${line.color}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"></path>
        ${coords
          .map(
            (coord) =>
              `<circle cx="${coord.x}" cy="${coord.y}" r="3.5" fill="${line.color}"><title>${line.label}: ${formatNumber(
                coord.total
              )}</title></circle>`
          )
          .join("")}
      `;
    })
    .join("");

  const labelStep = Math.max(1, Math.ceil(labels.length / 6));
  const xLabels = labels
    .map((point, index) => {
      if (index % labelStep !== 0 && index !== labels.length - 1) {
        return "";
      }

      const x = padding.left + (index / Math.max(1, labels.length - 1)) * chartWidth;
      return `<text x="${x}" y="${height - 8}" text-anchor="middle" fill="#817669" font-size="12">${formatDayLabel(
        point.bucket_start,
        options.granularity
      )}</text>`;
    })
    .join("");

  return `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${options.ariaLabel ?? ""}">
      ${gridLines.join("")}
      ${paths}
      ${xLabels}
    </svg>
    <div class="legend-row">
      ${series
        .map(
          (line) => `
            <span class="legend-item">
              <span class="legend-swatch" style="background:${line.color};"></span>
              ${line.label}
            </span>
          `
        )
        .join("")}
    </div>
  `;
}

function renderBars(container, items, itemLabelKey, valueLabelKey = "total", color = palette.accent) {
  if (!items?.length) {
    container.innerHTML = `<div class="empty-state">Sem dados suficientes para este recorte.</div>`;
    return;
  }

  const maxValue = Math.max(1, ...items.map((item) => Number(item[valueLabelKey] ?? 0)));

  container.innerHTML = `
    <div class="bar-list">
      ${items
        .map((item) => {
          const value = Number(item[valueLabelKey] ?? 0);
          const label = item[itemLabelKey];
          const width = (value / maxValue) * 100;
          return `
            <div class="bar-row">
              <div class="bar-meta">
                <span>${label}</span>
                <strong>${formatNumber(value)}</strong>
              </div>
              <div class="bar-track">
                <div class="bar-fill" style="width:${width}%; background:linear-gradient(135deg, ${color}, ${color}cc);"></div>
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderStatsStack(container, stats) {
  container.innerHTML = `
    <div class="stat-row"><span>Total de partidas no periodo</span><strong>${formatNumber(
      stats.total_meetups
    )}</strong></div>
    <div class="stat-row"><span>Partidas abertas/ativas</span><strong>${formatNumber(
      stats.active_meetups
    )}</strong></div>
    <div class="stat-row"><span>Status open</span><strong>${formatNumber(stats.open_meetups)}</strong></div>
    <div class="stat-row"><span>Status filled</span><strong>${formatNumber(
      stats.filled_meetups
    )}</strong></div>
    <div class="stat-row"><span>Status closed</span><strong>${formatNumber(
      stats.closed_meetups
    )}</strong></div>
    <div class="stat-row"><span>Status cancelled</span><strong>${formatNumber(
      stats.cancelled_meetups
    )}</strong></div>
  `;
}

function renderTable(container, columns, rows, mapper) {
  if (!rows?.length) {
    container.innerHTML = `<div class="empty-state">Nenhuma linha disponivel para este filtro.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="table-shell">
      <table>
        <thead>
          <tr>${columns.map((column) => `<th>${column}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows.map((row) => `<tr>${mapper(row)}</tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderQualityPanel() {
  const metadata = state.metadata;

  if (!metadata) {
    els.dataQualityPanel.textContent = "Sem metadados carregados.";
    return;
  }

  const platformTracking = metadata.platform_tracking ?? {};
  const knownCoverage = platformTracking.known_user_platform_coverage ?? {};
  const trackingStage = metadata.tracking_stage ?? {};

  els.dataQualityPanel.innerHTML = `
    <strong>O que ja esta medido hoje</strong><br />
    Feedback com tipo, plataforma e versao; usuarios e meetups com datas de criacao; Pro via
    flags em profiles/app_config; eventos oficiais em product_events para analytics avancado.<br /><br />
    <strong>Dados de teste no dashboard</strong><br />
    ${state.filters.includeTestData ? "Incluidos na leitura atual." : "Ocultos na leitura atual para as contas internas configuradas."}<br /><br />
    <strong>Segmentacao por plataforma disponivel com confianca</strong><br />
    Feedback: sim. Analytics avancado: sim a partir do rollout da ETAPA 2.<br /><br />
    <strong>Cobertura observavel de plataforma via push</strong><br />
    ${formatNumber(knownCoverage.known_users)} usuarios com plataforma inferida a partir do ultimo
    push device entre ${formatNumber(knownCoverage.users_with_active_device)} usuarios com device ativo.<br /><br />
    <strong>Stage de tracking</strong><br />
    ETAPA ${trackingStage.stage ?? 1}. Retencao e cohorts dependem de acumulo temporal dos novos eventos.
  `;

  els.platformBanner.querySelector("p").textContent =
    state.filters.platform === "all"
      ? "O filtro de plataforma agora atua tambem sobre os product_events oficiais. KPIs historicos da ETAPA 1 continuam preservados."
      : `Filtro atual: ${platformLabel(
          state.filters.platform
        )}. As metricas avancadas passam a respeitar essa segmentacao a partir da instrumentacao da ETAPA 2.`;
}

function summaryFeedbackTotal() {
  const feedback = state.feedback;
  if (!feedback) {
    return 0;
  }

  if (state.filters.platform === "all") {
    return feedback.totals?.all_time ?? 0;
  }

  const platformEntry = (feedback.by_platform ?? []).find(
    (entry) => entry.platform === state.filters.platform
  );
  return platformEntry?.total ?? 0;
}

function feedbackSelectedPeriodTotal() {
  const feedback = state.feedback;
  if (!feedback) {
    return 0;
  }

  if (state.filters.platform === "all") {
    return feedback.totals?.selected_period ?? 0;
  }

  return (feedback.timeline ?? []).reduce(
    (sum, point) => sum + Number(point[state.filters.platform] ?? 0),
    0
  );
}

function renderExecutiveSection() {
  const summary = state.summary;

  if (!summary) {
    els.executiveKpis.innerHTML = `<div class="empty-state">Autentique-se para visualizar os KPIs.</div>`;
    return;
  }

  const cards = [
    {
      label: "Usuarios cadastrados",
      value: formatNumber(summary.users?.total),
      badges: [
        `Hoje ${formatNumber(summary.users?.today)}`,
        `7 dias ${formatNumber(summary.users?.last_7_days)}`,
        `30 dias ${formatNumber(summary.users?.last_30_days)}`,
      ],
      foot:
        state.filters.platform === "all"
          ? "Consolidado do produto. Segmentacao por plataforma ainda nao existe de forma nativa para usuarios."
          : `Mantido consolidado mesmo com filtro ${platformLabel(
              state.filters.platform
            )} porque o cadastro base ainda nao registra plataforma de origem.`,
    },
    {
      label: "Partidas criadas",
      value: formatNumber(summary.meetups?.total),
      badges: [
        `Hoje ${formatNumber(summary.meetups?.today)}`,
        `7 dias ${formatNumber(summary.meetups?.last_7_days)}`,
        `30 dias ${formatNumber(summary.meetups?.last_30_days)}`,
      ],
      foot:
        "Baseado em meetup_posts.created_at. Ainda sem segmentacao direta por iOS/Android para criacao de partidas.",
    },
    {
      label: "Feedbacks recebidos",
      value: formatNumber(summaryFeedbackTotal()),
      badges: [
        `${state.filters.period} dias ${formatNumber(feedbackSelectedPeriodTotal())}`,
        `Filtro de tipo ${state.filters.feedbackType === "all" ? "todos" : feedbackTypeLabel(state.filters.feedbackType)}`,
        `Plataforma ${platformLabel(state.filters.platform)}`,
      ],
      foot:
        "Aqui o filtro de plataforma tem efeito real, porque app_feedback ja salva platform e app_version.",
    },
    {
      label: "Usuarios Pro ativos",
      value: formatNumber(summary.pro?.total),
      badges: [`${formatPercent(summary.pro?.percent_of_base)} da base`],
      foot:
        summary.quality?.pro_is_affected_by_global_grant
          ? "O flag global grant_pro_to_all_users esta ligado. O percentual reflete essa configuracao do backend."
          : "Calculado com base em profiles.is_pro, pro_expires_at e app_config.",
    },
  ];

  renderKpis(els.executiveKpis, cards);
}

function comparisonChipMarkup(comparison) {
  if (!comparison) {
    return "Sem comparacao";
  }

  const delta = Number(comparison.delta ?? 0);
  const deltaPercent = comparison.delta_percent;
  const tone = delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral";
  const prefix = delta > 0 ? "+" : "";
  return `<span class="comparison-chip ${tone}">${prefix}${formatNumber(delta)} vs periodo anterior${
    deltaPercent == null ? "" : ` (${prefix}${formatPercent(deltaPercent)})`
  }</span>`;
}

function seriesForGrowth(sectionKey) {
  const growth = state.growth?.[sectionKey] ?? {};
  const series = growth[state.growthGranularity] ?? [];
  return Array.isArray(series) ? series : [];
}

function renderGrowthSection() {
  if (!state.growth) {
    els.usersGrowthChart.innerHTML = `<div class="chart-empty">Sem dados de crescimento.</div>`;
    els.meetupsGrowthChart.innerHTML = `<div class="chart-empty">Sem dados de crescimento.</div>`;
    return;
  }

  const userSeries = seriesForGrowth("users");
  const meetupSeries = seriesForGrowth("meetups");

  els.usersGrowthChart.innerHTML = lineChartMarkup(
    [{ label: "Novos usuarios", color: palette.accent, points: userSeries }],
    {
      granularity: state.growthGranularity,
      ariaLabel: "Grafico de crescimento de usuarios",
    }
  );

  els.meetupsGrowthChart.innerHTML = lineChartMarkup(
    [{ label: "Partidas criadas", color: palette.teal, points: meetupSeries }],
    {
      granularity: state.growthGranularity,
      ariaLabel: "Grafico de crescimento de partidas",
    }
  );

  els.usersComparison.innerHTML = comparisonChipMarkup(state.growth.users?.comparison);
  els.meetupsComparison.innerHTML = comparisonChipMarkup(state.growth.meetups?.comparison);
}

function renderOperationsSection() {
  const operations = state.operations;

  if (!operations) {
    return;
  }

  renderStatsStack(els.operationsStatus, operations.status ?? {});
  renderBars(els.operationsRegionBars, operations.meetups_by_region ?? [], "region", "total", palette.blue);
  renderBars(els.operationsGameBars, operations.meetups_by_game ?? [], "game_name", "total", palette.teal);

  renderTable(
    els.topCreatorsTable,
    ["Jogador", "Handle", "Partidas"],
    operations.top_creators ?? [],
    (row) => `
      <td>${row.display_name}</td>
      <td>${row.handle ?? "Sem handle"}</td>
      <td>${formatNumber(row.total)}</td>
    `
  );

  renderBars(
    els.operationsHourChart,
    (operations.distribution_by_hour ?? []).map((entry) => ({
      label: `${String(entry.hour).padStart(2, "0")}h`,
      total: entry.total,
    })),
    "label",
    "total",
    palette.rose
  );
}

function filteredFeedbackTimeline() {
  const timeline = state.feedback?.timeline ?? [];

  if (state.filters.platform === "all") {
    return timeline.map((point) => ({
      bucket_start: point.bucket_start,
      total: point.total,
    }));
  }

  return timeline.map((point) => ({
    bucket_start: point.bucket_start,
    total: Number(point[state.filters.platform] ?? 0),
  }));
}

function filteredFeedbackRecent() {
  const rows = state.feedback?.recent_feedback ?? [];

  if (state.filters.platform === "all") {
    return rows;
  }

  return rows.filter((row) => row.platform === state.filters.platform);
}

function filteredFeedbackPlatforms() {
  const rows = state.feedback?.by_platform ?? [];

  if (state.filters.platform === "all") {
    return rows;
  }

  return rows.filter((row) => row.platform === state.filters.platform);
}

function renderFeedbackSection() {
  const feedback = state.feedback;

  if (!feedback) {
    return;
  }

  const byPlatform = filteredFeedbackPlatforms();

  renderKpis(els.feedbackKpis, [
    {
      label: "Feedback total",
      value: formatNumber(summaryFeedbackTotal()),
      badges: [`${platformLabel(state.filters.platform)}`],
      foot: "All time, respeitando o filtro de tipo. Plataforma aplicada quando selecionada.",
    },
    {
      label: "Feedback no periodo",
      value: formatNumber(feedbackSelectedPeriodTotal()),
      badges: [`Janela ${feedback.window_days} dias`],
      foot: "Serie temporal do periodo selecionado.",
    },
    {
      label: "Plataformas com dado real",
      value: formatNumber(
        byPlatform.filter((entry) => ["ios", "android"].includes(entry.platform)).length
      ),
      badges: byPlatform
        .filter((entry) => ["ios", "android"].includes(entry.platform))
        .map((entry) => `${platformLabel(entry.platform)} ${formatNumber(entry.total)}`),
      foot: "Baseado diretamente em app_feedback.platform.",
    },
  ]);

  els.feedbackChart.innerHTML = lineChartMarkup(
    [{ label: "Feedbacks", color: palette.accent, points: filteredFeedbackTimeline() }],
    {
      granularity: "daily",
      ariaLabel: "Grafico de feedbacks",
    }
  );

  renderBars(
    els.feedbackTypeBars,
    (feedback.by_type ?? []).map((entry) => ({
      label: feedbackTypeLabel(entry.feedback_type),
      total: entry.total,
    })),
    "label",
    "total",
    palette.gold
  );

  renderBars(
    els.feedbackPlatformBars,
    byPlatform.map((entry) => ({
      label: platformLabel(entry.platform),
      total: entry.total,
    })),
    "label",
    "total",
    palette.blue
  );

  renderTable(
    els.recentFeedbackTable,
    ["Data", "Tipo", "Plataforma", "Versao", "Area", "Mensagem"],
    filteredFeedbackRecent(),
    (row) => `
      <td>${formatDateTime(row.created_at)}</td>
      <td>${feedbackTypeLabel(row.feedback_type)}</td>
      <td>${platformLabel(row.platform)}</td>
      <td>${row.app_version ?? "Sem versao"}</td>
      <td>${row.app_area ?? "Sem area"}</td>
      <td class="message-cell">${escapeHtml(row.message)}</td>
    `
  );
}

function renderProSection() {
  const summary = state.summary;

  if (!summary) {
    return;
  }

  renderKpis(els.proKpis, [
    {
      label: "Usuarios Pro ativos",
      value: formatNumber(summary.pro?.total),
      badges: [`${formatPercent(summary.pro?.percent_of_base)} da base`],
      foot: "Baseado no backend atual, com vencimento e flag global de Pro considerados.",
    },
    {
      label: "Segmentacao por plataforma",
      value: "Nao disponivel",
      badges: [`Filtro atual ${platformLabel(state.filters.platform)}`],
      foot: "Ainda nao existe origem estruturada por iOS/Android para Pro na modelagem principal.",
    },
    {
      label: "Estado do grant global",
      value: summary.quality?.pro_is_affected_by_global_grant ? "Ligado" : "Desligado",
      badges: ["Fonte: app_config.grant_pro_to_all_users"],
      foot:
        "Se ligado, todo o calculo de Pro reflete a configuracao global temporaria do produto.",
    },
  ]);
}

function renderAdvancedSection() {
  const advanced = state.advanced;

  if (!advanced) {
    els.advancedKpis.innerHTML = `<div class="empty-state">Sem dados avancados disponiveis.</div>`;
    return;
  }

  renderKpis(els.advancedKpis, [
    {
      label: "DAU",
      value: formatNumber(advanced.overview?.dau),
      badges: [`Ativos diarios`],
      foot: "Usuarios unicos com eventos oficiais nas ultimas 24h.",
    },
    {
      label: "WAU",
      value: formatNumber(advanced.overview?.wau),
      badges: [`Ativos 7 dias`],
      foot: "Usuarios unicos com eventos oficiais nos ultimos 7 dias.",
    },
    {
      label: "MAU",
      value: formatNumber(advanced.overview?.mau),
      badges: [`Ativos 30 dias`],
      foot: "Usuarios unicos com eventos oficiais nos ultimos 30 dias.",
    },
    {
      label: "Stickiness",
      value: formatPercent(advanced.overview?.stickiness),
      badges: [`Janela ${advanced.overview?.window_days ?? state.filters.period} dias`],
      foot: "DAU / MAU. Pode demorar para estabilizar logo apos o rollout.",
    },
  ]);

  renderBars(
    els.featureActivityBars,
    (advanced.feature_activity ?? []).map((entry) => ({
      label: `${entry.event_name} · ${entry.unique_users} usuarios`,
      total: entry.total_events,
    })),
    "label",
    "total",
    palette.accent
  );

  renderTable(
    els.liquidityTable,
    ["Regiao", "Partidas", "Intencoes de entrada", "Usuarios engajados", "Liquidez"],
    advanced.liquidity ?? [],
    (row) => `
      <td>${row.region}</td>
      <td>${formatNumber(row.games_created)}</td>
      <td>${formatNumber(row.join_intents)}</td>
      <td>${formatNumber(row.engaged_users)}</td>
      <td>${row.join_intents_per_game == null ? "Sem base" : row.join_intents_per_game}</td>
    `
  );

  renderTable(
    els.platformComparisonTable,
    ["Plataforma", "Eventos", "Ativos", "Signups", "Partidas", "Feedbacks"],
    advanced.platform_comparison ?? [],
    (row) => `
      <td>${platformLabel(row.platform)}</td>
      <td>${formatNumber(row.total_events)}</td>
      <td>${formatNumber(row.active_users)}</td>
      <td>${formatNumber(row.signups)}</td>
      <td>${formatNumber(row.games_created)}</td>
      <td>${formatNumber(row.feedback_submitted)}</td>
    `
  );

  renderTable(
    els.versionComparisonTable,
    ["Versao", "Eventos", "Ativos", "Signups", "Partidas", "Bugs"],
    advanced.version_comparison ?? [],
    (row) => `
      <td>${row.app_version}</td>
      <td>${formatNumber(row.total_events)}</td>
      <td>${formatNumber(row.active_users)}</td>
      <td>${formatNumber(row.signups)}</td>
      <td>${formatNumber(row.games_created)}</td>
      <td>${formatNumber(row.bug_feedbacks)}</td>
    `
  );
}

function renderFunnelRetentionSection() {
  renderTable(
    els.funnelTable,
    ["Etapa", "Usuarios", "Conversao"],
    state.funnel?.steps ?? [],
    (row) => `
      <td>${row.label}</td>
      <td>${formatNumber(row.users_count)}</td>
      <td>${row.conversion_from_previous == null ? "Sem base" : formatPercent(row.conversion_from_previous)}</td>
    `
  );

  renderKpis(els.retentionKpis, [
    {
      label: "Retencao D1",
      value:
        state.retention?.overall?.d1 == null ? "Sem base" : formatPercent(state.retention.overall.d1),
      badges: [`Elegiveis ${formatNumber(state.retention?.overall?.eligible_d1)}`],
      foot: "Exige cohorts com pelo menos 1 dia de maturacao.",
    },
    {
      label: "Retencao D7",
      value:
        state.retention?.overall?.d7 == null ? "Sem base" : formatPercent(state.retention.overall.d7),
      badges: [`Elegiveis ${formatNumber(state.retention?.overall?.eligible_d7)}`],
      foot: "Exige cohorts com pelo menos 7 dias de maturacao.",
    },
    {
      label: "Retencao D30",
      value:
        state.retention?.overall?.d30 == null ? "Sem base" : formatPercent(state.retention.overall.d30),
      badges: [`Elegiveis ${formatNumber(state.retention?.overall?.eligible_d30)}`],
      foot: "Exige cohorts com pelo menos 30 dias de maturacao.",
    },
  ]);

  renderTable(
    els.cohortsTable,
    ["Cohort", "Base", "D1", "D7", "D30"],
    state.retention?.cohorts ?? [],
    (row) => `
      <td>${row.cohort_month}</td>
      <td>${formatNumber(row.cohort_size)}</td>
      <td>${row.d1 == null ? "Sem base" : formatPercent(row.d1)}</td>
      <td>${row.d7 == null ? "Sem base" : formatPercent(row.d7)}</td>
      <td>${row.d30 == null ? "Sem base" : formatPercent(row.d30)}</td>
    `
  );
}

function renderAlertsSection() {
  const alerts = state.alerts?.alerts ?? [];

  if (!alerts.length) {
    els.alertsList.innerHTML = `<div class="empty-state">Nenhum alerta acionado nas regras atuais.</div>`;
    return;
  }

  els.alertsList.innerHTML = alerts
    .map(
      (alert) => `
        <article class="alert-card ${alert.severity}">
          <div class="alert-head">
            <span class="pill">${alert.severity}</span>
            <strong>${alert.title}</strong>
          </div>
          <p>${alert.description}</p>
        </article>
      `
    )
    .join("");
}

function renderMeta() {
  const now = new Date();
  els.generatedAt.textContent = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(now);

  if (state.metadata?.notes?.length) {
    els.limitationsBanner.querySelector("p").textContent = state.metadata.notes.join(" ");
  }
}

function renderAll() {
  renderTestDataToggle();
  renderMeta();
  renderQualityPanel();
  renderExecutiveSection();
  renderAdvancedSection();
  renderGrowthSection();
  renderFunnelRetentionSection();
  renderOperationsSection();
  renderFeedbackSection();
  renderProSection();
  renderAlertsSection();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setupGrowthControls() {
  els.growthGranularity.addEventListener("click", (event) => {
    const button = event.target.closest("[data-granularity]");
    if (!button) {
      return;
    }

    state.growthGranularity = button.dataset.granularity;
    els.growthGranularity
      .querySelectorAll(".segmented-button")
      .forEach((item) => item.classList.toggle("active", item === button));
    renderGrowthSection();
  });
}

async function restoreSessionIfPossible() {
  if (!els.supabaseUrl.value.trim() || !els.supabaseAnonKey.value.trim()) {
    return;
  }

  try {
    const client = await ensureClient();
    const { data } = await client.auth.getSession();
    state.session = data.session ?? null;

    client.auth.onAuthStateChange((_event, session) => {
      state.session = session;
    });

    if (state.session) {
      setAuthStatus("Sessao restaurada. Carregando metricas...", "success");
      await bootstrapData();
    }
  } catch (error) {
    setAuthStatus(resolveErrorMessage(error), "error");
  }
}

function init() {
  loadConfig();
  applyEmbeddedConfig();
  applyFilterEvents();
  setupGrowthControls();
  els.connectionForm.addEventListener("submit", signIn);
  els.logoutButton.addEventListener("click", signOut);
  renderAll();
  void restoreSessionIfPossible();
}

init();
