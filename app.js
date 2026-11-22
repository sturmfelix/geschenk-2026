(() => {
  "use strict";

  // ============================================================
  // TEXTE FÜR DIE DESSERT-AUSWAHL
  // msg     = Nachricht, die über "Mir Bescheid sagen" geteilt wird
  // confirm = Bestätigung unter den Karten
  // handover = wie das Dessert in Schritt 4 genannt wird
  // ============================================================
  const DESSERTS = {
    "Cheesecake": {
      msg: "Ich nehme Cheesecake! 🍰",
      confirm: "Cheesecake, sehr gute Wahl.",
      handover: "deinen Cheesecake",
    },
    "Mousse au Chocolat": {
      msg: "Ich nehme Mousse au Chocolat! 🍫",
      confirm: "Mousse au Chocolat, ausgezeichnete Wahl.",
      handover: "deine Mousse au Chocolat",
    },
    "Tiramisu": {
      msg: "Ich nehme Tiramisu! ☕️",
      confirm: "Tiramisu, sehr gute Wahl.",
      handover: "dein Tiramisu",
    },
  };
  const WISH = {
    msg: (text) => `Mein Dessert-Wunsch: ${text} ✨`,
    confirm: (text) => `Notiert: „${text}“`,
    empty: "Schreib einfach rein, worauf du Lust hast.",
    handover: "dein Wunsch-Dessert",
  };
  const HANDOVER_DEFAULT = "dein Dessert";

  const STORAGE_KEY = "geschenk-dessert";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const dur = () => (reduceMotion.matches ? 300 : 700);

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const slides = $$(".slide");
  const dotsEl = $("#dots");
  const backBtn = $("#back");
  let current = 0;
  let busy = false;

  // ---------- Setup ----------
  slides.forEach((slide) => {
    $$(".stagger", slide).forEach((el, i) => el.style.setProperty("--i", i));
  });

  const dots = slides.map(() => {
    const d = document.createElement("span");
    d.className = "dot";
    dotsEl.appendChild(d);
    return d;
  });

  function updateChrome() {
    dots.forEach((d, i) => {
      d.classList.toggle("is-current", i === current);
      d.classList.toggle("is-done", i < current);
    });
    dotsEl.setAttribute("aria-valuenow", String(current + 1));
    dotsEl.setAttribute("aria-valuetext", `Schritt ${current + 1} von ${slides.length}`);
    backBtn.hidden = current === 0;
  }

  // ---------- Navigation ----------
  function go(index) {
    if (busy || index === current || index < 0 || index >= slides.length) return;
    busy = true;

    const dir = index > current ? 1 : -1;
    const from = slides[current];
    const to = slides[index];

    // Einfahrrichtung setzen, ohne dass das versteckte Slide animiert
    to.style.transition = "none";
    to.style.setProperty("--from", dir > 0 ? "6%" : "-6%");
    void to.offsetWidth;
    to.style.transition = "";

    from.style.setProperty("--from", dir > 0 ? "-6%" : "6%");
    from.classList.add("is-leaving");
    from.classList.remove("is-active");
    to.classList.add("is-active");
    to.scrollTop = 0;

    onLeave(current);
    current = index;
    updateChrome();
    onEnter(current);

    window.setTimeout(() => {
      from.classList.remove("is-leaving");
      busy = false;
      // Fokus für VoiceOver/Tastatur auf die neue Überschrift (bzw. den Reveal-Button)
      const target = $$(".headline", to).find((h) => h.offsetParent !== null) || $("#reveal:not([hidden])", to);
      if (target) {
        if (target.matches(".headline")) target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      }
    }, dur());
  }

  const next = () => {
    // Auf Schritt 2 deckt der erste Wisch nach vorn erst das Geschenk auf
    if (current === 1 && !revealed) return openReveal();
    go(current + 1);
  };
  const prev = () => go(current - 1);

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-next]")) next();
  });
  backBtn.addEventListener("click", prev);

  document.addEventListener("keydown", (e) => {
    if (e.target.closest?.("textarea, input[type='text']")) return;
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
  });

  // Swipe (Touch/Stift); vertikales Scrollen bleibt erhalten
  let start = null;
  const deck = $("#deck");
  deck.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" || e.target.closest("textarea")) return;
    start = { x: e.clientX, y: e.clientY, t: performance.now() };
  });
  deck.addEventListener("pointerup", (e) => {
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const dt = performance.now() - start.t;
    start = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4 && dt < 800) {
      dx < 0 ? next() : prev();
    }
  });
  deck.addEventListener("pointercancel", () => (start = null));

  // ---------- Geschenk 1: Reveal ----------
  const revealBtn = $("#reveal");
  const revealBody = $("#reveal-body");
  const revealStage = $("#reveal-stage");
  let revealed = false;

  function openReveal() {
    if (revealed) return;
    revealed = true;
    revealBtn.setAttribute("aria-expanded", "true");
    revealBtn.classList.add("is-opening");
    revealStage.classList.add("is-open");
    const fast = reduceMotion.matches;
    window.setTimeout(() => {
      revealBtn.hidden = true;
      revealBody.hidden = false;
      const h = $(".headline", revealBody);
      h.setAttribute("tabindex", "-1");
      h.focus({ preventScroll: true });
    }, fast ? 200 : 520);
  }

  function resetReveal() {
    revealed = false;
    revealBtn.hidden = false;
    revealBtn.classList.remove("is-opening");
    revealStage.classList.remove("is-open");
    revealBtn.setAttribute("aria-expanded", "false");
    revealBody.hidden = true;
  }

  revealBtn.addEventListener("click", openReveal);

  // ---------- Geschenk 2: Dessert ----------
  const choicesEl = $("#choices");
  const radios = $$("input[name='dessert']", choicesEl);
  const wishBox = $("#wish");
  const wishInput = $("#wish-input");
  const confirmEl = $("#confirm");
  const shareBtn = $("#share");
  const toast = $("#toast");
  const handoverEl = $("#handover-dessert");

  function selection() {
    const r = radios.find((x) => x.checked);
    if (!r) return null;
    if (r.value === "wish") {
      const text = wishInput.value.trim();
      return { wish: true, text };
    }
    return { wish: false, key: r.value };
  }

  function render() {
    const sel = selection();
    radios.forEach((r) => r.closest(".choice").classList.toggle("is-selected", r.checked));
    choicesEl.classList.toggle("has-choice", !!sel);
    wishBox.hidden = !(sel && sel.wish);

    let confirmText = "";
    let ready = false;
    let handover = HANDOVER_DEFAULT;

    if (sel && sel.wish) {
      ready = sel.text.length > 0;
      confirmText = ready ? WISH.confirm(sel.text) : WISH.empty;
      if (ready) handover = WISH.handover;
    } else if (sel) {
      const d = DESSERTS[sel.key];
      ready = true;
      confirmText = d.confirm;
      handover = d.handover;
    }

    confirmEl.hidden = !confirmText;
    confirmEl.textContent = confirmText;
    confirmEl.classList.toggle("is-hint", !!sel && !ready);
    shareBtn.disabled = !ready;
    handoverEl.textContent = handover;
  }

  function save() {
    const sel = selection();
    try {
      if (sel) localStorage.setItem(STORAGE_KEY, JSON.stringify(sel));
    } catch (_) { /* privater Modus o. ä. – egal */ }
  }

  function restore() {
    try {
      const sel = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!sel) return;
      const value = sel.wish ? "wish" : sel.key;
      const r = radios.find((x) => x.value === value);
      if (!r) return;
      r.checked = true;
      if (sel.wish) wishInput.value = sel.text || "";
    } catch (_) { /* ignorieren */ }
  }

  choicesEl.addEventListener("change", (e) => {
    render();
    save();
    if (e.target.value === "wish") {
      window.setTimeout(() => wishInput.focus(), 60);
    }
  });
  wishInput.addEventListener("input", () => {
    render();
    save();
  });

  function message() {
    const sel = selection();
    if (!sel) return "";
    return sel.wish ? WISH.msg(sel.text) : DESSERTS[sel.key].msg;
  }

  let toastTimer;
  function showToast(text) {
    toast.textContent = text;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 4000);
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (_) { ok = false; }
      ta.remove();
      return ok;
    }
  }

  shareBtn.addEventListener("click", async () => {
    const text = message();
    if (!text) return;

    if (navigator.share) {
      try {
        await navigator.share({ text });
        showToast("Danke! Ich freu mich schon. 💌");
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return; // Teilen abgebrochen
      }
    }

    if (await copy(text)) {
      showToast("Kopiert! Schick’s mir einfach per WhatsApp oder iMessage.");
    } else {
      showToast(`Schick mir einfach: „${text}“`);
    }
  });

  // ---------- Outro: Lasagne ----------
  const layersEl = $("#layers");
  const countEl = $("#layer-count");
  const SEQUENCE = [
    "pasta", "sauce", "veg",
    "pasta", "sauce", "veg",
    "pasta", "sauce", "veg",
    "pasta", "cheese",
  ];
  const COUNT_LABEL = (n) => (n < 3 ? `Schicht ${n}` : "Schicht 3, neuer Rekord!");
  let timers = [];

  function buildLasagna() {
    clearLasagna();
    const add = (type) => {
      const el = document.createElement("div");
      el.className = `layer ${type}`;
      layersEl.appendChild(el);
    };

    if (reduceMotion.matches) {
      SEQUENCE.forEach(add);
      countEl.textContent = COUNT_LABEL(3);
      return;
    }

    let schicht = 0;
    SEQUENCE.forEach((type, i) => {
      timers.push(window.setTimeout(() => {
        add(type);
        if (type === "veg") {
          schicht += 1;
          countEl.textContent = COUNT_LABEL(schicht);
        }
      }, 500 + i * 240));
    });
  }

  function clearLasagna() {
    timers.forEach(window.clearTimeout);
    timers = [];
    layersEl.textContent = "";
    countEl.innerHTML = "&nbsp;";
  }

  // ---------- Intro: Konfetti beim Öffnen ----------
  function confetti(originEl) {
    if (reduceMotion.matches) return;
    const canvas = document.createElement("canvas");
    canvas.className = "confetti";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const r = originEl.getBoundingClientRect();
    const ox = r.left + r.width / 2;
    const oy = r.top + r.height / 2;
    const colors = ["#ff453a", "#ff9f0a", "#ffd60a", "#f5f5f7", "#ff375f"];
    const parts = Array.from({ length: 90 }, () => {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
      const speed = 7 + Math.random() * 9;
      return {
        x: ox, y: oy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        w: 5 + Math.random() * 5,
        h: 8 + Math.random() * 8,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        color: colors[(Math.random() * colors.length) | 0],
      };
    });

    const t0 = performance.now();
    const LIFE = 1900;
    (function frame(now) {
      const t = now - t0;
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, t - LIFE * 0.55) / (LIFE * 0.45));
      parts.forEach((p) => {
        p.vy += 0.32;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, Math.cos(p.rot * 2)); // leichtes "Flattern"
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (t < LIFE) requestAnimationFrame(frame);
      else canvas.remove();
    })(t0);
  }

  $("#open-gift").addEventListener("click", (e) => {
    confetti(e.currentTarget);
    window.setTimeout(() => go(1), reduceMotion.matches ? 0 : 280);
  });

  // ---------- Abschluss: Schreibmaschine ----------
  const typedEl = $("#typed");
  const typedText = typedEl.dataset.text;
  const graphemes = window.Intl && Intl.Segmenter
    ? [...new Intl.Segmenter("de", { granularity: "grapheme" }).segment(typedText)].map((x) => x.segment)
    : Array.from(typedText);
  // Voller Text für VoiceOver, sichtbarer Text wird getippt; "ghost" hält die Höhe stabil
  typedEl.innerHTML =
    '<span class="visually-hidden"></span>' +
    '<span class="typed-ghost" aria-hidden="true"></span>' +
    '<span class="typed-out" aria-hidden="true"><span class="typed-text"></span><span class="caret"></span></span>';
  $(".visually-hidden", typedEl).textContent = typedText;
  $(".typed-ghost", typedEl).textContent = typedText;
  const typedOut = $(".typed-text", typedEl);
  let typeTimer;

  function startTyping() {
    window.clearTimeout(typeTimer);
    typedEl.classList.remove("is-done");
    if (reduceMotion.matches) {
      typedOut.textContent = typedText;
      typedEl.classList.add("is-done");
      return;
    }
    typedOut.textContent = "";
    let i = 0;
    const step = () => {
      typedOut.textContent += graphemes[i++];
      if (i < graphemes.length) {
        const ch = graphemes[i - 1];
        typeTimer = window.setTimeout(step, /[.,!]/.test(ch) ? 320 : 38 + Math.random() * 40);
      } else {
        typeTimer = window.setTimeout(() => typedEl.classList.add("is-done"), 1600);
      }
    };
    typeTimer = window.setTimeout(step, 900);
  }

  $("#restart").addEventListener("click", () => {
    resetReveal();
    go(0);
  });

  // ---------- Lifecycle ----------
  let leaveTimer;
  function onEnter(i) {
    if (i === 4) {
      window.clearTimeout(leaveTimer);
      buildLasagna();
    }
    if (i === 5) startTyping();
  }
  function onLeave(i) {
    if (i === 4) leaveTimer = window.setTimeout(clearLasagna, dur());
    if (i === 5) window.clearTimeout(typeTimer);
  }

  restore();
  render();
  updateChrome();
})();
