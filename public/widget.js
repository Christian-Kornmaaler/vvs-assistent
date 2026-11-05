/*!
 * vvsfittings.dk produktassistent – indlejringsscript
 * Brug: <script src="https://<assistent-domæne>/widget.js" defer></script>
 * Valgfrit: data-color="#218ec5" data-label="Find produkt"
 *
 * TESTTILSTAND (standard): knappen vises KUN for dem, der har åbnet en side på shoppen
 * med ?assistent=1 i adressen (huskes i browseren). ?assistent=0 slår den fra igen.
 * Når assistenten skal vises for alle kunder: tilføj data-public="true" på script-tagget.
 */
(function () {
  if (window.__vvsAssistent) return;

  var script =
    document.currentScript ||
    document.querySelector('script[src*="widget.js"]');
  if (!script) return;

  // Testtilstand
  if (script.getAttribute("data-public") !== "true") {
    var flag = null;
    try {
      var param = new URLSearchParams(location.search).get("assistent");
      if (param === "1") localStorage.setItem("vvs-assistent", "1");
      if (param === "0") localStorage.removeItem("vvs-assistent");
      flag = localStorage.getItem("vvs-assistent");
    } catch (e) {}
    if (flag !== "1") return;
  }
  window.__vvsAssistent = true;
  var origin = new URL(script.src).origin;
  var color = script.getAttribute("data-color") || "#218ec5";
  var label = script.getAttribute("data-label") || "Find produkt";

  var host = document.createElement("div");
  host.id = "vvs-assistent";
  host.style.cssText = "all:initial;position:fixed;z-index:2147483000;";
  var root = host.attachShadow({ mode: "open" });

  root.innerHTML =
    "<style>" +
    ":host{all:initial}" +
    ".btn{position:fixed;right:20px;bottom:20px;display:flex;align-items:center;gap:10px;height:52px;padding:0 18px 0 16px;" +
    "background:" + color + ";color:#fff;border:0;border-radius:999px;cursor:pointer;font:600 15px/1 Poppins,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;" +
    "box-shadow:0 6px 20px rgba(10,40,80,.25);transition:transform .2s,opacity .2s}" +
    ".btn:hover{transform:translateY(-2px)}" +
    ".btn svg{flex:none}" +
    ".open .btn{opacity:0;pointer-events:none;transform:translateY(8px)}" +
    ".backdrop{position:fixed;inset:0;background:rgba(10,25,45,.28);opacity:0;pointer-events:none;transition:opacity .25s}" +
    ".open .backdrop{opacity:1;pointer-events:auto}" +
    ".panel{position:fixed;top:0;right:0;height:100%;width:min(860px,100vw);background:#f2f6f6;border-radius:16px 0 0 16px;overflow:hidden;" +
    "box-shadow:-10px 0 40px rgba(10,40,80,.2);transform:translateX(105%);transition:transform .3s cubic-bezier(.2,.8,.2,1);visibility:hidden}" +
    ".open .panel{transform:none;visibility:visible}" +
    ".panel iframe{border:0;width:100%;height:100%;display:block}" +
    "@media (max-width:700px){.btn{right:14px;bottom:14px;height:52px;width:52px;padding:0;justify-content:center}.btn span{display:none}.panel{border-radius:0}}" +
    "@media (prefers-reduced-motion:reduce){.btn,.panel,.backdrop{transition:none}}" +
    "</style>" +
    '<div class="wrap">' +
    '<div class="backdrop"></div>' +
    '<div class="panel" role="dialog" aria-label="Produktassistent" aria-modal="true"></div>' +
    '<button class="btn" type="button" aria-label="Åbn produktassistent">' +
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
    "<span>" + label.replace(/</g, "&lt;") + "</span>" +
    "</button></div>";

  var wrap = root.querySelector(".wrap");
  var btn = root.querySelector(".btn");
  var panel = root.querySelector(".panel");
  var backdrop = root.querySelector(".backdrop");
  var frame = null;
  var lastFocus = null;

  function preconnect() {
    if (document.querySelector('link[data-vvs-preconnect]')) return;
    var l = document.createElement("link");
    l.rel = "preconnect";
    l.href = origin;
    l.setAttribute("data-vvs-preconnect", "");
    document.head.appendChild(l);
  }

  function open() {
    lastFocus = document.activeElement;
    if (!frame) {
      frame = document.createElement("iframe");
      frame.src = origin + "/embed";
      frame.title = "Produktassistent";
      frame.allow = "clipboard-write";
      panel.appendChild(frame);
    }
    wrap.classList.add("open");
    document.documentElement.style.overflow = window.innerWidth <= 700 ? "hidden" : "";
    setTimeout(function () {
      try { frame.focus(); } catch (e) {}
    }, 320);
  }

  function close() {
    wrap.classList.remove("open");
    document.documentElement.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  btn.addEventListener("mouseenter", preconnect, { once: true });
  btn.addEventListener("click", open);
  backdrop.addEventListener("click", close);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && wrap.classList.contains("open")) close();
  });
  window.addEventListener("message", function (e) {
    if (e.origin === origin && e.data && e.data.type === "vvs-assistent:close") close();
  });

  // Gør det muligt at åbne assistenten fra egne knapper/links på shoppen.
  window.vvsAssistent = { open: open, close: close };

  function mount() {
    document.body.appendChild(host);
  }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
