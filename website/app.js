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

  /* ---------- Map "Discover Pettah" game ---------- */
  var map = document.getElementById("mapGame");
  if (map) {
    var pins = map.querySelectorAll(".map-pin");
    var chip = document.getElementById("mapChip");
    var score = document.getElementById("mapScore");
    var found = 0, total = pins.length;
    if (score) score.textContent = "0 / " + total + " discovered";
    pins.forEach(function (pin) {
      pin.addEventListener("click", function () {
        var d = {};
        try { d = JSON.parse(pin.getAttribute("data-shop")); } catch (e) {}
        pins.forEach(function (p) { p.classList.remove("active"); });
        pin.classList.add("active");
        if (chip) {
          chip.innerHTML = "<b>" + (d.name || "Shop") + "</b><span>" + (d.meta || "") + "</span>";
          chip.classList.remove("pop"); void chip.offsetWidth; chip.classList.add("pop");
        }
        if (!pin.classList.contains("found")) {
          pin.classList.add("found");
          found++;
          if (score) score.textContent = found + " / " + total + " discovered";
          if (found === total) {
            if (score) score.textContent = "Pettah unlocked!";
            if (chip) chip.innerHTML = "<b>You found every shop.</b><span>Now do it for real — get the app.</span>";
            burst(map);
          }
        }
      });
    });
  }

  function burst(host) {
    if (reduce) return;
    var r = host.getBoundingClientRect();
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var colors = ["#0d6e6e", "#e8821a", "#2dd4bf", "#ffffff"];
    for (var i = 0; i < 38; i++) {
      var el = document.createElement("div");
      el.className = "confetti-piece";
      el.style.left = cx + "px";
      el.style.top = cy + "px";
      el.style.background = colors[i % colors.length];
      var a = Math.random() * Math.PI * 2, dist = 70 + Math.random() * 180;
      el.style.setProperty("--tx", Math.cos(a) * dist + "px");
      el.style.setProperty("--ty", Math.sin(a) * dist - 60 + "px");
      el.style.animationDelay = Math.random() * 0.12 + "s";
      document.body.appendChild(el);
      (function (n) { setTimeout(function () { n.remove(); }, 1700); })(el);
    }
  }

  /* ---------- Wholesale bulk-savings slider ---------- */
  var slider = document.getElementById("bulkSlider");
  if (slider) {
    var RETAIL = 950;
    var tier = function (q) { return q >= 200 ? 540 : q >= 50 ? 620 : q >= 10 ? 780 : 950; };
    var upd = function () {
      var q = +slider.value, unit = tier(q), save = q * (RETAIL - unit);
      var qEl = document.getElementById("bulkQty");
      var uEl = document.getElementById("bulkUnit");
      var sEl = document.getElementById("bulkSave");
      if (qEl) qEl.textContent = q;
      if (uEl) {
        uEl.textContent = "LKR " + fmt(unit);
        uEl.classList.toggle("hot", unit < RETAIL);
        uEl.classList.remove("pulse"); void uEl.offsetWidth; uEl.classList.add("pulse");
      }
      if (sEl) sEl.textContent = "LKR " + fmt(save);
      slider.style.setProperty("--fill", (q - slider.min) / (slider.max - slider.min) * 100 + "%");
    };
    slider.addEventListener("input", upd);
    upd();
  }

  /* ---------- Scroll progress bar ---------- */
  var bar = document.getElementById("scrollProgress");
  if (bar) {
    var updBar = function () {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + "%";
    };
    window.addEventListener("scroll", updBar, { passive: true });
    updBar();
  }

  /* ---------- Pointer ambience (hover + fine pointer only) ---------- */
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (fine && !reduce) {
    var hero = document.querySelector(".hx");
    if (hero) {
      hero.addEventListener("mousemove", function (e) {
        var r = hero.getBoundingClientRect();
        hero.style.setProperty("--mx", ((e.clientX - r.left) / r.width) * 100 + "%");
        hero.style.setProperty("--my", ((e.clientY - r.top) / r.height) * 100 + "%");
      });
    }
    document.querySelectorAll(".card, .plan, .an-card").forEach(function (card) {
      var raf = null;
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        card.style.setProperty("--mx", px * 100 + "%");
        card.style.setProperty("--my", py * 100 + "%");
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = null;
          card.style.transform =
            "perspective(820px) rotateX(" + (0.5 - py) * 8 + "deg) rotateY(" +
            (px - 0.5) * 8 + "deg) translateY(-4px)";
        });
      });
      card.addEventListener("mouseleave", function () { card.style.transform = ""; });
    });
  }
})();
