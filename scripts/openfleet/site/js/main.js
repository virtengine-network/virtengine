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
})();
