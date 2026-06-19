/* PetaFinds site interactions — vanilla JS, no build step.
   Scroll reveals, count-up stats, hide-on-scroll header, billing toggle.
   Fully degrades: if JS is off or reduced-motion is on, everything shows. */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasIO = "IntersectionObserver" in window;

  /* ---------- Header: scrolled state + hide on scroll down ---------- */
  var header = document.querySelector(".header");
  var lastY = window.scrollY;
  function onScroll() {
    var y = window.scrollY;
    if (!header) return;
    header.classList.toggle("scrolled", y > 8);
    if (y > 160 && y > lastY + 5) header.classList.add("hide");
    else if (y < lastY - 5 || y < 160) header.classList.remove("hide");
    lastY = y;
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Count-up numbers ([data-count]) ---------- */
  function fmt(n) { return n.toLocaleString("en-US"); }
  function runCount(el) {
    if (el._done) return;
    el._done = true;
    var target = parseFloat(el.getAttribute("data-count")) || 0;
    var suffix = el.getAttribute("data-suffix") || "";
    if (reduce) { el.textContent = fmt(target) + suffix; return; }
    var dur = 1200, t0 = performance.now();
    (function tick(now) {
      var p = Math.min((now - t0) / dur, 1);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(target * e)) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    })(performance.now());
  }

  /* ---------- Scroll reveal (auto-applied to below-the-fold blocks) ---------- */
  var SELECTORS = [
    ".section-head", ".cards > .card", ".spotlight-copy", ".an-card",
    ".spotlight-list > li", ".teaser > .teaser-tier", ".pay-steps > .pay-step",
    ".how-col", ".plans > .plan", ".bank-box", ".form-card",
    ".finalcta-inner", ".proofbar-row", ".portal-hero > .container",
    ".split-copy", ".map-mock", ".ws-card"
  ];
  var nodes = [];
  SELECTORS.forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (el) { nodes.push(el); });
  });

  function indexInParent(el) {
    var i = 0, n = el;
    while ((n = n.previousElementSibling)) i++;
    return i;
  }

  if (reduce || !hasIO) {
    // Show everything; still run counters.
    document.querySelectorAll("[data-count]").forEach(runCount);
  } else {
    var fold = window.innerHeight * 0.86;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        el.style.transitionDelay = Math.min(indexInParent(el), 6) * 60 + "ms";
        el.classList.add("in");
        el.querySelectorAll && el.querySelectorAll("[data-count]").forEach(runCount);
        if (el.hasAttribute("data-count")) runCount(el);
        io.unobserve(el);
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -40px 0px" });

    nodes.forEach(function (el) {
      // Don't hide what's already on screen at load (no flash above the fold).
      if (el.getBoundingClientRect().top > fold) {
        el.classList.add("reveal");
        io.observe(el);
      }
    });

    // Counters that live above the fold (e.g., none now) or weren't wrapped:
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { runCount(e.target); cio.unobserve(e.target); }
      });
    }, { threshold: 0.5 });
    document.querySelectorAll("[data-count]").forEach(function (el) {
      if (!el._done && el.getBoundingClientRect().top <= fold) cio.observe(el);
    });
  }

  /* ---------- Billing toggle (Monthly / Annual) ---------- */
  var billing = document.querySelector("[data-billing-toggle]");
  if (billing) {
    billing.addEventListener("click", function (ev) {
      var btn = ev.target.closest("[data-billing]");
      if (!btn) return;
      var annual = btn.getAttribute("data-billing") === "annual";
      billing.querySelectorAll("[data-billing]").forEach(function (b) {
        b.classList.toggle("active", b === btn);
      });
      document.querySelectorAll("[data-monthly]").forEach(function (p) {
        var v = p.getAttribute(annual ? "data-annual" : "data-monthly");
        if (v != null) p.textContent = v;
        p.classList.remove("pulse");
        void p.offsetWidth; // restart animation
        p.classList.add("pulse");
      });
      document.querySelectorAll("[data-period]").forEach(function (s) {
        s.textContent = annual ? "/ year" : "/ month";
      });
    });
  }
})();
