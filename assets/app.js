/* 꼬꼬무 · 특허 이야기 — interactions */
(function () {
  "use strict";

  var doc = document;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Pull the Korean serif subsets in right away so the display type never
     flashes in the sans fallback. */
  if (doc.fonts && doc.fonts.load) {
    var headSample = "꼬꼬무 특허 이야기 스타벅스 레고 브랜드 비화";
    ["400", "700", "800"].forEach(function (weight) {
      try {
        doc.fonts.load(weight + ' 1em "Nanum Myeongjo"', headSample);
      } catch (error) {
        /* older browsers simply keep the fallback */
      }
    });
  }

  /* ---------------- toast ---------------- */
  var toastEl = doc.getElementById("toast");
  var toastTimer = null;

  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toastEl.classList.remove("is-visible");
    }, 2400);
  }

  /* ---------------- sticky header shadow ---------------- */
  var header = doc.getElementById("siteHeader");
  /* header shadow */
  if (header) {
    var onScrollHeader = function () {
      header.classList.toggle("is-stuck", window.scrollY > 6);
    };
    onScrollHeader();
    window.addEventListener("scroll", onScrollHeader, { passive: true });
  }

  /* ---------------- helpers ---------------- */
  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  /* Site-root prefix ("", "../") worked out from the script tag that loads
     assets/search-index.js, so links stay correct on every page depth. */
  function basePrefix() {
    var tag = doc.querySelector('script[src$="search-index.js"]');
    if (tag) {
      var src = tag.getAttribute("src") || "";
      var cut = src.indexOf("assets/");
      if (cut !== -1) return src.slice(0, cut);
    }
    return /\/stories\//.test(window.location.pathname) ? "../" : "";
  }

  /* ---------------- mobile search ---------------- */
  var searchToggle = doc.querySelector(".js-search-toggle");
  var mobileSearch = doc.getElementById("mobileSearch");

  if (searchToggle && mobileSearch) {
    searchToggle.addEventListener("click", function () {
      var open = mobileSearch.hasAttribute("hidden");
      if (open) {
        mobileSearch.removeAttribute("hidden");
        var input = mobileSearch.querySelector("input");
        if (input) window.setTimeout(function () { input.focus(); }, 30);
      } else {
        mobileSearch.setAttribute("hidden", "");
      }
      searchToggle.setAttribute("aria-expanded", String(open));
      searchToggle.setAttribute("aria-label", open ? "검색 닫기" : "검색 열기");
    });
  }

  /* ---------------- mobile menu ---------------- */
  var headerMain = doc.querySelector(".header-main");

  if (headerMain) {
    var menuBtn = doc.createElement("button");
    menuBtn.type = "button";
    menuBtn.className = "icon-btn js-menu-toggle";
    menuBtn.setAttribute("aria-label", "메뉴 열기");
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.setAttribute("aria-controls", "mobileMenu");
    menuBtn.innerHTML = '<span class="menu-bars" aria-hidden="true"><i></i><i></i><i></i></span>';
    (headerMain.querySelector(".header-tools") || headerMain).appendChild(menuBtn);

    var panel = doc.createElement("nav");
    panel.className = "mobile-menu";
    panel.id = "mobileMenu";
    panel.setAttribute("aria-label", "모바일 메뉴");
    panel.hidden = true;
    panel.innerHTML =
      '<a href="' + basePrefix() + 'index.html">홈</a>' +
      '<a href="' + basePrefix() + 'index.html#stories">이야기 전체</a>' +
      '<a href="' + basePrefix() + 'about.html">소개</a>' +
      '<a href="' + basePrefix() + 'contact.html">문의</a>';
    headerMain.parentNode.insertBefore(panel, headerMain.nextSibling);

    var setMenu = function (open) {
      panel.hidden = !open;
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
    };

    menuBtn.addEventListener("click", function () {
      setMenu(panel.hidden);
    });

    panel.addEventListener("click", function (event) {
      if (event.target.closest("a")) setMenu(false);
    });

    doc.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !panel.hidden) setMenu(false);
    });
  }

  /* ================================================================
     Search — full-text across every story, on every page
     index data: assets/search-index.js  (window.KKOKKOMU_SEARCH)
     ================================================================ */
  var INDEX = window.KKOKKOMU_SEARCH || [];
  var byId = {};
  INDEX.forEach(function (item) {
    byId[item.id] = item;
  });

  var list = doc.getElementById("storyList");
  var cards = [].slice.call(doc.querySelectorAll(".js-story"));
  var chips = [].slice.call(doc.querySelectorAll("[data-filter]"));
  var empty = doc.getElementById("storyEmpty");
  var hero = doc.querySelector("[data-hero]");
  var state = { cat: "all", query: "" };

  /* lowercase alphanumerics only — "US 6,285,999" and "us6285999" meet here */
  function plainKey(value) {
    return String(value == null ? "" : value).toLowerCase().replace(/[^0-9a-z]/g, "");
  }

  function prepare(item) {
    if (item._hay) return;
    item._hay = [item.title, item.subtitle, item.patent, item.text]
      .join(" ")
      .toLowerCase();
    item._hayKey = plainKey(item._hay);
    item._title = (item.title || "").toLowerCase();
    item._subtitle = (item.subtitle || "").toLowerCase();
    item._patent = (item.patent || "").toLowerCase();
    item._patentKey = item.patentKey || plainKey(item.patent);
  }

  /* 0 = no match; higher is a better hit. */
  function scoreToken(item, token) {
    prepare(item);
    var t = token.toLowerCase();
    var score = 0;

    if (item._title.indexOf(t) !== -1) score = 120;
    else if (item._subtitle && item._subtitle.indexOf(t) !== -1) score = 100;
    else if (t.length >= 3 && item._patent.indexOf(t) !== -1) score = 95;
    else if (item._hay.indexOf(t) !== -1) score = 60;

    if (!score) {
      var key = plainKey(t);
      if (key.length >= 3) {
        if (item._patentKey.indexOf(key) !== -1) score = 95;
        else if (key.indexOf(item._patentKey) === 0 && key.length <= item._patentKey.length + 2) score = 90;
        else if (item._hayKey.indexOf(key) !== -1) score = 50;
      }
    }
    return score;
  }

  function searchIndex(query) {
    var q = (query || "").trim();
    if (!q) return [];
    var tokens = q.split(/\s+/).filter(Boolean);
    var hits = [];

    INDEX.forEach(function (item) {
      var total = 0;
      for (var i = 0; i < tokens.length; i += 1) {
        var part = scoreToken(item, tokens[i]);
        if (!part) {
          total = 0;
          break;
        }
        total += part;
      }
      if (total > 0) hits.push({ item: item, score: total });
    });

    hits.sort(function (a, b) {
      return b.score - a.score || a.item.no - b.item.no;
    });
    return hits;
  }

  /* ---- dropdown menu of matching stories ---- */
  var dropSeq = 0;

  function makeDrop(input) {
    var field = input.closest(".search-field");
    var host = field ? field.parentNode : null;
    if (!host) return null;

    var drop = doc.createElement("div");
    drop.className = "search-drop";
    drop.id = "searchDrop" + (dropSeq += 1);
    drop.hidden = true;
    drop.setAttribute("role", "listbox");
    drop.setAttribute("aria-controls", "storyList");
    host.classList.add("has-search-drop");
    host.appendChild(drop);
    return drop;
  }

  function mark(text, tokens) {
    var out = escapeHtml(text);
    tokens.forEach(function (token) {
      if (token.length < 2 || token.indexOf("&") !== -1) return;
      var safe = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      try {
        out = out.replace(new RegExp(safe, "gi"), function (hit) {
          return "\u0001" + hit + "\u0002";
        });
      } catch (error) {
        /* an unparsable query never breaks the rendering */
      }
    });
    return out.replace(/\u0001/g, "<mark>").replace(/\u0002/g, "</mark>");
  }

  function renderDrop(drop, input, tokens) {
    var q = input.value.trim();
    if (!q || !drop) {
      if (drop) {
        drop.hidden = true;
        drop.innerHTML = "";
      }
      return [];
    }

    var results = searchIndex(q);
    var shown = results.slice(0, 6);
    var prefix = basePrefix();
    var html = '<p class="search-drop__head">' +
      (results.length ? "이야기 <strong>" + results.length + "</strong>편에서 찾았습니다" : "일치하는 이야기가 없습니다") +
      "</p>";

    if (shown.length) {
      html += shown
        .map(function (hit) {
          var item = hit.item;
          return (
            '<a class="search-drop__item" role="option" aria-selected="false" href="' + prefix + item.url + '">' +
            '<span class="search-drop__eyebrow">' + escapeHtml(item.label + " · " + item.catLabel) + "</span>" +
            '<span class="search-drop__title">' + mark(item.title, tokens) + "</span>" +
            '<span class="search-drop__meta">' + mark(item.patent, tokens) + " · " + escapeHtml(item.minutes + "분") + "</span>" +
            "</a>"
          );
        })
        .join("");
      html +=
        '<a class="search-drop__all" role="option" aria-selected="false" href="' +
        prefix + "index.html?q=" + encodeURIComponent(q) + '#stories">' +
        (results.length > shown.length
          ? "나머지 " + (results.length - shown.length) + "편 포함, 목록에서 전체 보기"
          : "목록에서 전체 보기") +
        "</a>";
    }

    drop.innerHTML = html;
    drop.hidden = false;
    return [].slice.call(drop.querySelectorAll(".search-drop__item, .search-drop__all"));
  }

  function closeDrops() {
    [].slice.call(doc.querySelectorAll(".search-drop")).forEach(function (drop) {
      drop.hidden = true;
    });
    [].slice.call(doc.querySelectorAll(".search-drop__item, .search-drop__all")).forEach(function (el) {
      el.classList.remove("is-active");
      el.setAttribute("aria-selected", "false");
    });
  }

  var searchInputs = [].slice.call(doc.querySelectorAll("[data-search]"));

  searchInputs.forEach(function (input) {
    var drop = makeDrop(input);
    var active = -1;

    var goAll = function (value) {
      var q = (value || "").trim();
      if (!q) return;
      closeDrops();
      if (list) {
        scrollToStories();
        return;
      }
      window.location.href = basePrefix() + "index.html?q=" + encodeURIComponent(q) + "#stories";
    };

    input.addEventListener("input", function () {
      state.query = input.value;
      searchInputs.forEach(function (other) {
        if (other !== input) other.value = input.value;
      });
      if (list) applyFilter(input.value);
      var tokens = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      renderDrop(drop, input, tokens);
      active = -1;
    });

    input.addEventListener("focus", function () {
      if (input.value.trim()) {
        var tokens = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
        renderDrop(drop, input, tokens);
      }
    });

    input.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeDrops();
        active = -1;
        return;
      }
      if (event.key === "Enter") {
        var items = drop ? [].slice.call(drop.querySelectorAll(".search-drop__item")) : [];
        var target = active >= 0 ? items[active] : null;
        event.preventDefault();
        if (target) {
          window.location.href = target.getAttribute("href");
          return;
        }
        goAll(input.value);
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

      var options = drop && !drop.hidden ? [].slice.call(drop.querySelectorAll(".search-drop__item")) : [];
      if (!options.length) return;
      event.preventDefault();
      active += event.key === "ArrowDown" ? 1 : -1;
      if (active < 0) active = options.length - 1;
      if (active >= options.length) active = 0;
      options.forEach(function (el, i) {
        el.classList.toggle("is-active", i === active);
        el.setAttribute("aria-selected", String(i === active));
      });
    });
  });

  doc.addEventListener("click", function (event) {
    if (!event.target.closest(".search-field") && !event.target.closest(".search-drop")) closeDrops();
  });

  /* ---- story cards on the home page ---- */
  function scrollToStories() {
    var target = doc.getElementById("stories");
    if (!target) return;
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  function legacyMatch(el, q) {
    var hay = ((el.getAttribute("data-title") || "") + " " + el.textContent).toLowerCase();
    var needle = q.toLowerCase();
    if (hay.indexOf(needle) !== -1) return true;
    var key = plainKey(needle);
    return key.length >= 3 && plainKey(hay).indexOf(key) !== -1;
  }

  function matchesId(id, q, hits) {
    if (!q) return true;
    if (INDEX.length) return !!hits[id];
    return null;
  }

  var note = doc.getElementById("storySearchNote");
  var noteQ = doc.getElementById("storySearchQ");
  var noteCount = doc.getElementById("storySearchCount");

  function applyFilter(rawQuery) {
    if (!list) return;
    if (typeof rawQuery === "string") state.query = rawQuery;
    var q = state.query.trim();
    var hits = {};
    if (q && INDEX.length) {
      searchIndex(q).forEach(function (hit) {
        hits[hit.item.id] = true;
      });
    }

    var visible = 0;
    cards.forEach(function (card) {
      var catOk = state.cat === "all" || card.getAttribute("data-cat") === state.cat;
      var id = card.getAttribute("data-id");
      var qOk = matchesId(id, q, hits);
      if (qOk === null) qOk = legacyMatch(card, q);
      var show = catOk && qOk;
      card.hidden = !show;
      if (show) visible += 1;
    });

    if (empty) empty.hidden = visible !== 0;

    if (note) {
      note.hidden = !q;
      if (q) {
        if (noteQ) noteQ.textContent = "‘" + q + "’";
        if (noteCount) noteCount.textContent = String(visible);
      }
    }

    if (hero) {
      var heroCat = hero.getAttribute("data-cat") || "brand";
      var heroCatOk = state.cat === "all" || state.cat === heroCat;
      var heroId = hero.getAttribute("data-id") || "s1";
      var heroQueryOk = matchesId(heroId, q, hits);
      if (heroQueryOk === null) heroQueryOk = legacyMatch(hero, q);
      hero.hidden = !(heroCatOk && heroQueryOk);
    }

    syncUrl(q);
  }

  function syncUrl(q) {
    if (!list) return;
    try {
      var url = new URL(window.location.href);
      if (q) url.searchParams.set("q", q);
      else url.searchParams.delete("q");
      window.history.replaceState(null, "", url.toString());
    } catch (error) {
      /* file:// and older browsers — the filter still works */
    }
  }

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      state.cat = chip.getAttribute("data-filter");
      chips.forEach(function (c) {
        c.setAttribute("aria-pressed", String(c === chip));
      });
      applyFilter();
    });
  });

  var resetBtns = [].slice.call(doc.querySelectorAll(".js-reset, .js-clear-q"));
  resetBtns.forEach(function (resetBtn) {
    resetBtn.addEventListener("click", function () {
      state.cat = "all";
      state.query = "";
      chips.forEach(function (c) {
        c.setAttribute("aria-pressed", String(c.getAttribute("data-filter") === "all"));
      });
      searchInputs.forEach(function (input) {
        input.value = "";
      });
      closeDrops();
      applyFilter();
    });
  });

  if (list) {
    var incoming = "";
    try {
      incoming = new URLSearchParams(window.location.search).get("q") || "";
    } catch (error) {
      incoming = "";
    }
    if (incoming) {
      state.query = incoming;
      searchInputs.forEach(function (input) {
        input.value = incoming;
      });
      applyFilter(incoming);
      window.setTimeout(scrollToStories, 80);
    } else {
      applyFilter();
    }
  }

  /* ---------------- reading progress ---------------- */
  var bar = doc.getElementById("progressBar");
  if (bar) {
    var onScrollProgress = function () {
      var el = doc.documentElement;
      var max = el.scrollHeight - el.clientHeight;
      var ratio = max > 0 ? el.scrollTop / max : 0;
      bar.style.width = (Math.min(1, Math.max(0, ratio)) * 100).toFixed(2) + "%";
    };
    onScrollProgress();
    window.addEventListener("scroll", onScrollProgress, { passive: true });
    window.addEventListener("resize", onScrollProgress);
  }

  /* ---------------- guess / spoiler card ---------------- */
  var guess = doc.querySelector("[data-guess]");
  if (guess) {
    var result = doc.getElementById("guessResult");
    var statusEl = doc.querySelector("[data-guess-status]");
    var statusBox = doc.querySelector("[data-guess-state]");
    var rightOpt = guess.querySelector('.guess__opt[data-correct="true"]');
    var rightKey = rightOpt
      ? (rightOpt.querySelector(".guess__opt-key") || {}).textContent || ""
      : "";

    guess.addEventListener("click", function (event) {
      var btn = event.target.closest(".guess__opt");
      if (!btn) return;

      var isRight = btn.getAttribute("data-correct") === "true";

      [].slice.call(guess.querySelectorAll(".guess__opt")).forEach(function (option) {
        if (option.getAttribute("data-correct") === "true") {
          option.setAttribute("data-state", "right");
        } else if (option === btn) {
          option.setAttribute("data-state", "wrong");
        }
      });

      if (statusEl) {
        statusEl.textContent = isRight
          ? "정답입니다"
          : "아쉽습니다 — 정답은 " + (rightKey.trim() || "?");
      }
      if (statusBox) {
        statusBox.setAttribute("data-guess-state", isRight ? "right" : "wrong");
      }
      if (result) result.classList.add("is-open");
    });
  }

  /* ---------------- sharing ---------------- */
  function pageUrl() {
    return window.location.href.split("#")[0];
  }

  function copyLink() {
    var url = pageUrl();
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(function () {
        toast("링크가 복사되었습니다");
      }, fallbackCopy);
    } else {
      fallbackCopy();
    }
  }

  function fallbackCopy() {
    try {
      var input = doc.createElement("textarea");
      input.value = pageUrl();
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.opacity = "0";
      doc.body.appendChild(input);
      input.select();
      doc.execCommand("copy");
      doc.body.removeChild(input);
      toast("링크가 복사되었습니다");
    } catch (error) {
      toast("주소창의 링크를 복사해 주세요");
    }
  }

  function shareKakao() {
    var payload = {
      objectType: "feed",
      content: {
        title: doc.title.replace(" — 꼬꼬무", ""),
        description: "꼬리에 꼬리를 무는 특허 이야기 · 꼬꼬무",
        imageUrl: "https://kkokkomu.com/assets/og-story.png",
        link: { mobileWebUrl: pageUrl(), webUrl: pageUrl() }
      },
      buttons: [{ title: "이야기 읽기", link: { mobileWebUrl: pageUrl(), webUrl: pageUrl() } }]
    };

    if (window.Kakao && window.Kakao.Share && window.Kakao.Share.sendDefault) {
      try {
        window.Kakao.Share.sendDefault(payload);
        return;
      } catch (error) {
        /* fall through to the device share sheet */
      }
    }

    if (navigator.share) {
      navigator
        .share({ title: doc.title, text: "꼬꼬무 · 특허 이야기", url: pageUrl() })
        .catch(function () {});
      return;
    }

    copyLink();
  }

  var shareButton = doc.querySelector('[data-share="kakao"]');
  if (shareButton) shareButton.addEventListener("click", shareKakao);

  var copyButton = doc.querySelector('[data-share="copy"]');
  if (copyButton) copyButton.addEventListener("click", copyLink);
})();
