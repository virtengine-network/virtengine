/* ─────────────────────────────────────────────────────────────
 *  VirtEngine Control Center – Preact + HTM Entry Point
 *  Modular SPA for Telegram Mini App (no build step)
 * ────────────────────────────────────────────────────────────── */

import { h, render as preactRender } from "preact";
import { useState, useEffect, useCallback, useRef } from "preact/hooks";
import { signal } from "@preact/signals";
import htm from "htm";

const html = htm.bind(h);

// Backend health tracking
const backendDown = signal(false);
const backendError = signal("");
const backendLastSeen = signal(null);
const backendRetryCount = signal(0);

/* ── Module imports ── */
import { ICONS } from "./modules/icons.js";
import {
  initTelegramApp,
  onThemeChange,
  getTg,
  isTelegramContext,
  showSettingsButton,
  getTelegramUser,
  colorScheme,
} from "./modules/telegram.js";
import {
  connectWebSocket,
  disconnectWebSocket,
  wsConnected,
} from "./modules/api.js";
import {
  connected,
  refreshTab,
  toasts,
  initWsInvalidationListener,
  loadNotificationPrefs,
  applyStoredDefaults,
} from "./modules/state.js";
import { activeTab, navigateTo, TAB_CONFIG } from "./modules/router.js";
import { formatRelative } from "./modules/utils.js";

/* ── Component imports ── */
import { ToastContainer } from "./components/shared.js";
import { PullToRefresh } from "./components/forms.js";
import {
  CommandPalette,
  useCommandPalette,
} from "./components/command-palette.js";

/* ── Tab imports ── */
import { DashboardTab } from "./tabs/dashboard.js";
import { TasksTab } from "./tabs/tasks.js";
import { ChatTab } from "./tabs/chat.js";
import { AgentsTab } from "./tabs/agents.js";
import { InfraTab } from "./tabs/infra.js";
import { ControlTab } from "./tabs/control.js";
import { LogsTab } from "./tabs/logs.js";
import { SettingsTab } from "./tabs/settings.js";

/* ── Placeholder signals for connection quality (may be provided by api.js) ── */
let wsLatency = signal(null);
let wsReconnectIn = signal(null);
let dataFreshness = signal(null);
try {
  const apiMod = await import("./modules/api.js");
  if (apiMod.wsLatency) wsLatency = apiMod.wsLatency;
  if (apiMod.wsReconnectIn) wsReconnectIn = apiMod.wsReconnectIn;
} catch { /* use placeholder signals */ }
try {
  const stateMod = await import("./modules/state.js");
  if (stateMod.dataFreshness) dataFreshness = stateMod.dataFreshness;
} catch { /* use placeholder signals */ }

/* ── Backend health helpers ── */

function formatTimeAgo(ts) {
  return formatRelative(ts);
}

// Inject offline-banner CSS once
if (typeof document !== "undefined" && !document.getElementById("offline-banner-styles")) {
  const style = document.createElement("style");
  style.id = "offline-banner-styles";
  style.textContent = `
.offline-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin: 8px 16px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  backdrop-filter: blur(8px);
  animation: slideDown 0.3s ease-out;
}
.offline-banner-icon { font-size: 24px; }
.offline-banner-content { flex: 1; }
.offline-banner-title { font-weight: 600; font-size: 14px; color: #ef4444; }
.offline-banner-meta { font-size: 12px; opacity: 0.7; margin-top: 2px; }
`;
  document.head.appendChild(style);
}

function useBackendHealth() {
  const intervalRef = useRef(null);

  const checkHealth = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch("/api/health", { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      backendDown.value = false;
      backendError.value = "";
      backendLastSeen.value = Date.now();
      backendRetryCount.value = 0;
    } catch (err) {
      backendDown.value = true;
      backendError.value = err?.message || "Connection lost";
      backendRetryCount.value = backendRetryCount.value + 1;
    }
  }, []);

  useEffect(() => {
    checkHealth();
    intervalRef.current = setInterval(checkHealth, 10000);
    return () => clearInterval(intervalRef.current);
  }, [checkHealth]);

  // If WS reconnects, consider backend up
  useEffect(() => {
    if (wsConnected.value && backendDown.value) {
      backendDown.value = false;
      backendError.value = "";
      backendLastSeen.value = Date.now();
      backendRetryCount.value = 0;
    }
  }, [wsConnected.value]);

  return {
    isDown: backendDown.value,
    error: backendError.value,
    lastSeen: backendLastSeen.value,
    retryCount: backendRetryCount.value,
    retry: checkHealth,
  };
}

function OfflineBanner() {
  const { retry: manualRetry } = useBackendHealth();
  return html`
    <div class="offline-banner">
      <div class="offline-banner-icon">⚠️</div>
      <div class="offline-banner-content">
        <div class="offline-banner-title">Backend Unreachable</div>
        <div class="offline-banner-meta">${backendError.value || "Connection lost"}</div>
        ${backendLastSeen.value
          ? html`<div class="offline-banner-meta">Last connected: ${formatTimeAgo(backendLastSeen.value)}</div>`
          : null}
        <div class="offline-banner-meta">Retry attempt #${backendRetryCount.value}</div>
      </div>
      <button class="btn btn-ghost btn-sm" onClick=${manualRetry}>
        Retry Now
      </button>
    </div>
  `;
}

/* ── Tab component map ── */
const TAB_COMPONENTS = {
  dashboard: DashboardTab,
  tasks: TasksTab,
  chat: ChatTab,
  agents: AgentsTab,
  infra: InfraTab,
  control: ControlTab,
  logs: LogsTab,
  settings: SettingsTab,
};

/* ═══════════════════════════════════════════════
 *  Header
 * ═══════════════════════════════════════════════ */
function Header() {
  const isConn = connected.value;
  const wsConn = wsConnected.value;
  const user = getTelegramUser();
  const latency = wsLatency.value;
  const reconnect = wsReconnectIn.value;
  const freshnessRaw = dataFreshness.value;
  let freshness = null;
  if (typeof freshnessRaw === "number") {
    freshness = freshnessRaw;
  } else if (freshnessRaw && typeof freshnessRaw === "object") {
    const vals = Object.values(freshnessRaw).filter((v) => typeof v === "number");
    freshness = vals.length ? Math.max(...vals) : null;
  }

  // Connection quality label
  let connLabel = "Offline";
  let connClass = "disconnected";
  if (isConn && latency != null) {
    connLabel = `${latency}ms`;
    connClass = "connected";
  } else if (isConn) {
    connLabel = "Live";
    connClass = "connected";
  } else if (reconnect != null && reconnect > 0) {
    connLabel = `Reconnecting in ${reconnect}s…`;
    connClass = "reconnecting";
  }

  // Freshness label
  let freshnessLabel = "";
  if (freshness != null && Number.isFinite(freshness)) {
    const ago = Math.round((Date.now() - freshness) / 1000);
    if (ago < 5) freshnessLabel = "Updated just now";
    else if (ago < 60) freshnessLabel = `Updated ${ago}s ago`;
    else freshnessLabel = `Updated ${Math.round(ago / 60)}m ago`;
  }

  return html`
    <header class="app-header">
      <div class="app-header-left">
        <div class="app-header-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        </div>
        <div>
          <div class="app-header-title">VirtEngine</div>
          ${user
            ? html`<div class="app-header-user">${user.first_name}</div>`
            : null}
        </div>
      </div>
      <div class="header-actions">
        <div class="connection-pill ${connClass}">
          <span class="connection-dot"></span>
          ${connLabel}
        </div>
        ${freshnessLabel
          ? html`<div class="header-freshness" style="font-size:11px;opacity:0.55;margin-top:2px">${freshnessLabel}</div>`
          : null}
      </div>
    </header>
  `;
}

/* ═══════════════════════════════════════════════
 *  Bottom Navigation
 * ═══════════════════════════════════════════════ */
function BottomNav() {
  return html`
    <nav class="bottom-nav">
      ${TAB_CONFIG.filter((t) => t.id !== "settings").map(
        (tab) => {
          const isHome = tab.id === "dashboard";
          const isActive = activeTab.value === tab.id;
          return html`
          <button
            key=${tab.id}
            class="nav-item ${activeTab.value === tab.id ? "active" : ""}"
            onClick=${() =>
              navigateTo(tab.id, {
                resetHistory: isHome,
                forceRefresh: isHome && isActive,
              })}
          >
            ${ICONS[tab.icon]}
            <span class="nav-label">${tab.label}</span>
          </button>
        `;
        },
      )}
    </nav>
  `;
}

/* ═══════════════════════════════════════════════
 *  App Root
 * ═══════════════════════════════════════════════ */
function App() {
  useBackendHealth();
  const { open: paletteOpen, onClose: paletteClose } = useCommandPalette();
  const mainRef = useRef(null);

  useEffect(() => {
    // Initialize Telegram Mini App SDK
    initTelegramApp();

    // Theme change monitoring
    const unsub = onThemeChange(() => {
      colorScheme.value = getTg()?.colorScheme || "dark";
    });

    // Show settings button in Telegram header
    showSettingsButton(() => navigateTo("settings"));

    // Connect WebSocket + invalidation auto-refresh
    connectWebSocket();
    initWsInvalidationListener();

    // Load notification preferences early (non-blocking)
    loadNotificationPrefs();

    // Load initial data for the default tab, then apply stored executor defaults
    refreshTab("dashboard").then(() => applyStoredDefaults());

    // Global keyboard shortcuts (1-7 for tabs, Escape for modals)
    function handleGlobalKeys(e) {
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (document.activeElement?.isContentEditable) return;

      // Number keys 1-8 to switch tabs
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 8 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tabCfg = TAB_CONFIG[num - 1];
        if (tabCfg) {
          e.preventDefault();
          navigateTo(tabCfg.id);
        }
        return;
      }

      // Escape to close modals/palette
      if (e.key === "Escape") {
        globalThis.dispatchEvent(new CustomEvent("ve:close-modals"));
      }
    }
    document.addEventListener("keydown", handleGlobalKeys);

    return () => {
      unsub();
      disconnectWebSocket();
      document.removeEventListener("keydown", handleGlobalKeys);
    };
  }, []);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const swipeTabs = TAB_CONFIG.filter((t) => t.id !== "settings");
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let tracking = false;
    let blocked = false;

    const shouldBlockSwipe = (target) => {
      if (!target || typeof target.closest !== "function") return false;
      return Boolean(
        target.closest(".kanban-board") ||
        target.closest(".kanban-cards") ||
        target.closest(".chat-messages"),
      );
    };

    const onTouchStart = (e) => {
      if (e.touches.length !== 1) return;
      const target = e.target;
      blocked = shouldBlockSwipe(target);
      if (blocked) return;
      tracking = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startTime = Date.now();
    };

    const onTouchMove = (e) => {
      if (!tracking || blocked) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) {
        e.preventDefault();
      }
    };

    const onTouchEnd = (e) => {
      if (!tracking || blocked) return;
      tracking = false;
      const touch = e.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      const dt = Date.now() - startTime;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) || dt > 700) return;

      const currentIndex = swipeTabs.findIndex(
        (tab) => tab.id === activeTab.value,
      );
      if (currentIndex < 0) return;
      const direction = dx < 0 ? 1 : -1;
      const nextIndex = currentIndex + direction;
      if (nextIndex < 0 || nextIndex >= swipeTabs.length) return;
      navigateTo(swipeTabs[nextIndex].id);
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  const CurrentTab = TAB_COMPONENTS[activeTab.value] || DashboardTab;

  return html`
    <${Header} />
    ${backendDown.value ? html`<${OfflineBanner} />` : null}
    <${ToastContainer} />
    <${CommandPalette} open=${paletteOpen} onClose=${paletteClose} />
    <${PullToRefresh} onRefresh=${() => refreshTab(activeTab.value)}>
      <main class="main-content" ref=${mainRef}>
        <${CurrentTab} />
      </main>
    <//>
    <${BottomNav} />
  `;
}

/* ─── Mount ─── */
preactRender(html`<${App} />`, document.getElementById("app"));
