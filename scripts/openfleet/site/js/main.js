/* ═══════════════════════════════════════════════════════════════════════════
   OpenFleet Landing Page — Main JavaScript
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Scroll-linked nav background ────────────────────────────────────── */
  const nav = document.querySelector('.nav');
  if (nav) {
    const onScroll = () => {
      nav.classList.toggle('nav--scrolled', window.scrollY > 40);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ── Mobile nav toggle ───────────────────────────────────────────────── */
  const toggle = document.querySelector('.nav__toggle');
  const links = document.querySelector('.nav__links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('nav__links--open');
      toggle.textContent = links.classList.contains('nav__links--open') ? '✕' : '☰';
    });
    // Close on link click
    links.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        links.classList.remove('nav__links--open');
        toggle.textContent = '☰';
      });
    });
  }

  /* ── Copy install command ────────────────────────────────────────────── */
  document.querySelectorAll('.install-cmd').forEach((el) => {
    el.addEventListener('click', () => {
      const text = el.querySelector('.install-cmd__text')?.textContent;
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        const tip = el.querySelector('.install-cmd__tooltip');
        if (tip) {
          tip.classList.add('install-cmd__tooltip--visible');
          setTimeout(() => tip.classList.remove('install-cmd__tooltip--visible'), 1500);
        }
      });
    });
  });

  /* ── Intersection Observer for scroll reveals ────────────────────────── */
  const reveals = document.querySelectorAll('.reveal');
  if (reveals.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal--visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    reveals.forEach((el) => observer.observe(el));
  }

  /* ── Terminal initialization (lazy, on scroll into view) ─────────────── */
  const terminalBody = document.querySelector('.terminal-window__body');
  if (terminalBody && typeof $ !== 'undefined' && $.fn.terminal) {
    let termInit = false;
    const termObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !termInit) {
          termInit = true;
          window.initOpenFleetTerminal('.terminal-window__body', {
            autoDemo: true,
            greeting: true,
          });
          termObserver.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    termObserver.observe(terminalBody);
  }

  /* ── Smooth scroll for anchor links ──────────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ── Animated counters for stats ─────────────────────────────────────── */
  const statValues = document.querySelectorAll('.stat__value[data-target]');
  if (statValues.length && 'IntersectionObserver' in window) {
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const target = parseInt(el.dataset.target, 10);
            const suffix = el.dataset.suffix || '';
            const prefix = el.dataset.prefix || '';
            const duration = 1500;
            const start = performance.now();

            function animate(now) {
              const elapsed = now - start;
              const progress = Math.min(elapsed / duration, 1);
              const eased = 1 - Math.pow(1 - progress, 3);
              const current = Math.round(eased * target);
              el.textContent = prefix + current.toLocaleString() + suffix;
              if (progress < 1) requestAnimationFrame(animate);
            }
            requestAnimationFrame(animate);
            counterObserver.unobserve(el);
          }
        });
      },
      { threshold: 0.5 }
    );
    statValues.forEach((el) => counterObserver.observe(el));
  }

  /* ── Docs sidebar toggle (mobile) ────────────────────────────────────── */
  const sidebarToggle = document.querySelector('.docs-sidebar-toggle');
  const sidebar = document.querySelector('.docs-sidebar');
  const backdrop = document.querySelector('.docs-sidebar-backdrop');
  if (sidebarToggle && sidebar) {
    const toggleSidebar = () => {
      sidebar.classList.toggle('docs-sidebar--open');
      if (backdrop) backdrop.classList.toggle('docs-sidebar-backdrop--visible');
    };
    sidebarToggle.addEventListener('click', toggleSidebar);
    if (backdrop) backdrop.addEventListener('click', toggleSidebar);
  }

  /* ── PR Showcase — fetch real PRs from VirtEngine repo ───────────────── */
  const prContainer = document.getElementById('pr-showcase');
  if (prContainer) {
    const API = 'https://api.github.com/repos/virtengine/virtengine/pulls';
    const MAX_PRS = 8;

    function timeAgo(dateStr) {
      const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
      if (seconds < 60) return 'just now';
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return minutes + 'm ago';
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return hours + 'h ago';
      const days = Math.floor(hours / 24);
      if (days < 30) return days + 'd ago';
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function labelColor(color) {
      return `background: #${color}22; color: #${color}; border-color: #${color}44;`;
    }

    function prStateIcon(pr) {
      if (pr.merged_at) return { cls: 'merged', icon: '⇄' };
      if (pr.state === 'closed') return { cls: 'closed', icon: '✕' };
      return { cls: 'open', icon: '⬆' };
    }

    async function fetchPRs() {
      try {
        // Fetch both open and recently closed/merged
        const [openRes, closedRes] = await Promise.all([
          fetch(`${API}?state=open&sort=updated&direction=desc&per_page=${MAX_PRS}`),
          fetch(`${API}?state=closed&sort=updated&direction=desc&per_page=${MAX_PRS}`),
        ]);

        if (!openRes.ok && !closedRes.ok) throw new Error('GitHub API rate limited');

        const openPRs = openRes.ok ? await openRes.json() : [];
        const closedPRs = closedRes.ok ? await closedRes.json() : [];

        // Merge and sort by updated_at, take top N
        const all = [...openPRs, ...closedPRs]
          .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
          .slice(0, MAX_PRS);

        if (all.length === 0) {
          prContainer.innerHTML = '<div class="pr-showcase__error">No PRs found. Check back later.</div>';
          return;
        }

        prContainer.innerHTML = all.map((pr) => {
          const state = prStateIcon(pr);
          const labels = (pr.labels || [])
            .slice(0, 3)
            .map((l) => `<span class="pr-card__label" style="${labelColor(l.color)}">${l.name}</span>`)
            .join('');
          const updatedAt = pr.merged_at || pr.closed_at || pr.updated_at;
          return `
            <a class="pr-card" href="${pr.html_url}" target="_blank" rel="noopener">
              <div class="pr-card__state pr-card__state--${state.cls}">${state.icon}</div>
              <div class="pr-card__body">
                <div class="pr-card__title">${pr.title}</div>
                <div class="pr-card__meta">
                  <span>#${pr.number}</span>
                  <span>by ${pr.user?.login || 'unknown'}</span>
                  <span>${timeAgo(updatedAt)}</span>
                </div>
                ${labels ? `<div class="pr-card__labels">${labels}</div>` : ''}
              </div>
            </a>`;
        }).join('');

      } catch (err) {
        console.warn('[pr-showcase]', err);
        prContainer.innerHTML =
          '<div class="pr-showcase__error">Unable to load PRs. <a href="https://github.com/virtengine/virtengine/pulls" target="_blank" rel="noopener">View on GitHub →</a></div>';
      }
    }

    // Lazy-load PRs when section scrolls into view
    const showcaseSection = document.getElementById('showcase');
    if (showcaseSection && 'IntersectionObserver' in window) {
      const prObserver = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            fetchPRs();
            prObserver.disconnect();
          }
        },
        { threshold: 0.1 }
      );
      prObserver.observe(showcaseSection);
    } else {
      fetchPRs();
    }
  }
})();
