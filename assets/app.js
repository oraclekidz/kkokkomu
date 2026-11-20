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
        doc.fonts.load(weight + " 1em \"Nanum Myeongjo\"", headSample);
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
      '<a href="index.html">홈</a>' +
      '<a href="index.html#stories">이야기 전체</a>' +
      '<a href="about.html">소개</a>' +
      '<a href="contact.html">문의</a>';
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

  /* ---------------- story list: category filter + search ---------------- */
  var list = doc.getElementById("storyList");
  var cards = [].slice.call(doc.querySelectorAll(".js-story"));
  var chips = [].slice.call(doc.querySelectorAll("[data-filter]"));
  var empty = doc.getElementById("storyEmpty");
  var hero = doc.querySelector("[data-hero]");
  var state = { cat: "all", query: "" };

  function applyFilter() {
    var qn = state.query.trim().toLowerCase();
    var visible = 0;

    cards.forEach(function (card) {
      var catOk = state.cat === "all" || card.getAttribute("data-cat") === state.cat;
      var hay = (card.getAttribute("data-title") || "") + " " + card.textContent;
      var qOk = !qn || hay.toLowerCase().indexOf(qn) !== -1;
      var show = catOk && qOk;
      card.hidden = !show;
      if (show) visible += 1;
    });

    if (empty) empty.hidden = visible !== 0;

    if (hero) {
      var heroCat = hero.getAttribute("data-cat") || "brand";
      var heroCatOk = state.cat === "all" || state.cat === heroCat;
      var heroTitle = (hero.textContent || "").toLowerCase();
      var heroQueryOk = !qn || heroTitle.indexOf(qn) !== -1;
      var showHero = heroCatOk && heroQueryOk;
      hero.hidden = !showHero;
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

  var searchInputs = [].slice.call(doc.querySelectorAll("[data-search]"));
  searchInputs.forEach(function (input) {
    input.addEventListener("input", function () {
      state.query = input.value;
      searchInputs.forEach(function (other) {
        if (other !== input) other.value = input.value;
      });
      applyFilter();
    });
  });

  var resetBtn = doc.querySelector(".js-reset");
  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      state.cat = "all";
      state.query = "";
      chips.forEach(function (c) {
        c.setAttribute("aria-pressed", String(c.getAttribute("data-filter") === "all"));
      });
      searchInputs.forEach(function (input) { input.value = ""; });
      applyFilter();
    });
  }

  if (list) applyFilter();

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
        statusEl.textContent = isRight ? "정답입니다" : "아쉽습니다 — 정답은 B";
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
