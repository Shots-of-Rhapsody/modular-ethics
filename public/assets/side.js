// assets/site.js — tiny, dependency-free helpers
// Uses only DOM APIs. Safe for GitHub Pages.

// Run when DOM is ready
(function () {
  "use strict";

  // ---------- Utilities ----------
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // Normalize path for matching nav links (treat "/" and "/index.html" as same)
  function normalizePath(p) {
    try {
      // If given a relative like "", make it absolute using current origin
      var url = new URL(p, location.origin);
      var path = url.pathname;
      if (path === "/index.html") path = "/";
      // Remove trailing "index.html"
      path = path.replace(/\/index\.html$/i, "/");
      // Ensure directories end with "/"
      if (!path.includes(".") && !path.endsWith("/")) path += "/";
      // Keep project pages compatibility (root-relative links already used in your HTML)
      return path;
    } catch (_) {
      return p;
    }
  }

  // ---------- Footer year ----------
  (function setYear() {
    var y = $("#y");
    if (y) y.textContent = new Date().getFullYear();
  })();

  // ---------- Theme toggle (persistent + accessible) ----------
  (function themeToggle() {
    var KEY = "et.theme";
    var root = document.documentElement;
    var btn = $("#themeBtn") || document.querySelector("[data-theme-toggle]");

    // Apply stored theme (if any)
    var stored = localStorage.getItem(KEY);
    if (stored === "dark") root.classList.add("theme-dark");
    if (stored === "light") root.classList.remove("theme-dark");

    function applyAria() {
      if (!btn) return;
      var isDark = root.classList.contains("theme-dark");
      btn.setAttribute("aria-pressed", String(isDark));
      btn.setAttribute("title", isDark ? "Switch to light theme" : "Switch to dark theme");
    }

    function toggle() {
      var isDark = root.classList.toggle("theme-dark");
      localStorage.setItem(KEY, isDark ? "dark" : "light");
      applyAria();
    }

    if (btn) {
      btn.addEventListener("click", toggle);
      applyAria();
    }
  })();

  // ---------- Mobile menu (matches CSS .is-open) ----------
  (function mobileMenu() {
    var menuBtn = $("#menuBtn");
    var list = document.querySelector(".site-nav ul") || document.querySelector(".nav-links");
    if (!menuBtn || !list) return;

    function openMenu() {
      list.classList.add("is-open");
      menuBtn.setAttribute("aria-expanded", "true");
      menuBtn.setAttribute("aria-label", "Close menu");
    }

    function closeMenu() {
      list.classList.remove("is-open");
      menuBtn.setAttribute("aria-expanded", "false");
      menuBtn.setAttribute("aria-label", "Open menu");
    }

    function toggleMenu() {
      if (list.classList.contains("is-open")) closeMenu(); else openMenu();
    }

    menuBtn.addEventListener("click", toggleMenu);

    // Close on escape
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });

    // Close when clicking a nav link (use capture to beat SPA-ish behavior)
    list.addEventListener("click", function (e) {
      var a = e.target.closest("a");
      if (a) closeMenu();
    }, true);

    // Close when resizing to desktop
    var DESKTOP_MIN = 861; // matches CSS breakpoint
    window.addEventListener("resize", function () {
      if (window.innerWidth >= DESKTOP_MIN) closeMenu();
    });

    // Initialize ARIA
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.setAttribute("aria-controls", "primary-nav");
    list.id = list.id || "primary-nav";
  })();

  // ---------- Mark current page link ----------
  (function markCurrent() {
    var here = normalizePath(location.pathname);
    $all(".site-nav a, .nav-links a").forEach(function (a) {
      var target = normalizePath(a.getAttribute("href") || "");
      if (target === here) {
        a.classList.add("current");
        a.setAttribute("aria-current", "page");
      }
      // Special-case: treat "/" as current for any index page
      if (here === "/" && (target === "/" || target === "/index.html")) {
        a.classList.add("current");
        a.setAttribute("aria-current", "page");
      }
    });
  })();

})();
