// =========================================================
// Portfolio interactions — scripted "chat" navigation
// =========================================================
(() => {
  const body = document.body;
  const screens = Array.from(document.querySelectorAll('[data-screen-name]'));
  const screensByName = new Map(screens.map(s => [s.dataset.screenName, s]));
  const defaultScreenName = screens.find(screen => screen.hasAttribute('data-default-screen'))
    ?.dataset.screenName || screens[0]?.dataset.screenName;
  const viewportBoundaryElement = document.querySelector('.chatbox-wrap');
  const navStack = defaultScreenName ? [defaultScreenName] : [];
  const usesHashRouting = body.dataset.routing !== 'document';
  const isDesignSystemPreview = new URLSearchParams(window.location.search).has('ds-preview');
  const rootStyles = getComputedStyle(document.documentElement);

  function readCssNumber(name, fallback) {
    const value = parseFloat(rootStyles.getPropertyValue(name));
    return Number.isFinite(value) ? value : fallback;
  }

  function readCssValue(name, fallback) {
    return rootStyles.getPropertyValue(name).trim() || fallback;
  }

  // Small chip positions captured at the last openMenu — reused as the
  // target rects when reversing the FLIP on close.
  const savedSmallChipRects = new Map();
  let savedClosedWrapRect = null;
  let savedClosedInnerRect = null;
  let savedClosedOptionsRect = null;
  let savedClosedOptionsScrollLeft = 0;
  let savedClosedOptionsMaxScroll = 0;
  const menuTimers = new Set();
  let openMenuFrame = null;
  let openingShellAnimation = null;
  let isClosingMenu = false;
  let isProgrammaticCollapsedScroll = false;
  let menuLeetTexts = [];
  let contentLeetTexts = [];
  let topbarLeetTexts = [];
  let cardLeetTexts = [];
  let tokenCounter = null;
  let shellIntro = null;
  let pageRevealScheduler = null;
  let pageSequenceVersion = 0;
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;
  const pageLeetTimingPlans = new Map();
  const pageLeetTiming = Object.freeze({
    minimumTotalDuration: readCssNumber('--page-intro-duration-min', 1200),
    maximumTotalDuration: readCssNumber('--page-intro-duration-max', 4000),
    writeBaseDuration: readCssNumber('--page-intro-write-base', 60),
    writeCharacterFactor: readCssNumber('--page-intro-write-character-factor', 22),
    minimumWriteDuration: readCssNumber('--page-intro-write-duration-min', 90),
    maximumWriteDuration: readCssNumber('--page-intro-write-duration-max', 650),
    correctionBaseDuration: readCssNumber('--page-intro-correction-base', 80),
    correctionCharacterFactor: readCssNumber('--page-intro-correction-character-factor', 16),
    minimumCorrectionDuration: readCssNumber('--page-intro-correction-duration-min', 140),
    maximumCorrectionDuration: readCssNumber('--page-intro-correction-duration-max', 600),
    fontReferenceSize: readCssNumber('--page-intro-font-reference', 16),
    minimumFontFactor: readCssNumber('--page-intro-font-factor-min', 0.85),
    maximumFontFactor: readCssNumber('--page-intro-font-factor-max', 2.2)
  });
  const viewportTopFade = Object.freeze({
    startY: readCssNumber('--content-fade-out-start-y', 80),
    endY: readCssNumber('--content-fade-out-end-y', 0)
  });
  const menuMotion = Object.freeze({
    duration: readCssNumber('--duration-spring', 380),
    easing: readCssValue('--easing-flip', 'cubic-bezier(0.32, 0.72, 0, 1)')
  });
  const expandedChipLayoutMotion = Object.freeze({
    duration: readCssNumber('--duration-chip-layout-shift', 280),
    easing: readCssValue('--easing-default', 'cubic-bezier(0.2, 0.8, 0.2, 1)')
  });

  function animateShellHeight(element, fromHeight, toHeight) {
    if (!element || !Number.isFinite(fromHeight) || !Number.isFinite(toHeight)) return null;
    return element.animate(
      [
        { height: fromHeight + 'px' },
        { height: toHeight + 'px' }
      ],
      { duration: menuMotion.duration, easing: menuMotion.easing, fill: 'both' }
    );
  }
  const tokenCounterDuration = readCssNumber('--token-counter-duration', 1400);
  const tokenStorageKey = 'lkc-portfolio:token-balance:v1';
  const tokenPersistDelay = readCssNumber('--token-persist-delay', 120);
  const menuLabelRevealDelay = readCssNumber('--delay-menu-label-reveal', 220);
  const menuLeetCascadeStep = readCssNumber('--menu-leet-cascade-step', 70);
  const menuLeetTimingScale = readCssNumber('--menu-leet-timing-scale', 0.75);
  const firstPageTextStartDelay = readCssNumber('--page-first-load-delay', 400);
  const shellIntroDuration = readCssNumber('--shell-intro-duration', 900);
  const pageRevealRowTolerance = 2;
  const pageRevealComponentDuration = readCssNumber('--duration-fast', 150);
  const projectCardRevealDuration = readCssNumber('--project-card-reveal-duration', 480);

  function setupViewportTopFade() {
    const selector = [
      '.screen :is(.h1, .lede, .answer) .leet-word',
      '.screen[data-page-layout="hero"] .page-logo--mobile',
      '.screen [data-viewport-fade]',
      '.screen .message-actions',
      '.screen .suggestion'
    ].join(', ');
    let targets = [];
    let frame = null;

    const refreshTargets = () => {
      targets = [...document.querySelectorAll(selector)];
    };

    const render = () => {
      frame = null;
      const distance = Math.max(1, viewportTopFade.startY - viewportTopFade.endY);
      targets.forEach(element => {
        if (!element.getClientRects().length) return;
        const top = element.getBoundingClientRect().top;
        const opacity = Math.max(
          0,
          Math.min(1, (top - viewportTopFade.endY) / distance)
        );
        element.style.setProperty('--content-viewport-top-opacity', opacity.toFixed(4));
      });
    };

    const schedule = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(render);
    };

    refreshTargets();
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    new MutationObserver(() => {
      refreshTargets();
      schedule();
    }).observe(body, {
      attributes: true,
      attributeFilter: ['data-screen'],
      childList: true,
      subtree: true
    });
  }

  function setupMobileHeaderVisibility() {
    const header = document.querySelector('[data-shell-header]');
    if (!header) return;

    const triggerY = 50;
    const directionThreshold = 2;
    let lastY = window.scrollY;
    let frame = null;

    const setHidden = hidden => {
      header.toggleAttribute('data-scroll-hidden', hidden);
    };

    const render = () => {
      frame = null;
      const nextY = window.scrollY;
      const delta = nextY - lastY;

      if (nextY <= triggerY) setHidden(false);
      else if (delta > directionThreshold) setHidden(true);
      else if (delta < -directionThreshold) setHidden(false);

      lastY = nextY;
    };

    // Keep the initial state honest: only a real downward scroll hides the
    // header. Restored positions and fragment navigation must not masquerade
    // as a user scroll during testing.
    setHidden(false);
    window.addEventListener('scroll', () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(render);
    }, { passive: true });
  }

  function clearMenuTimers() {
    menuTimers.forEach(id => clearTimeout(id));
    menuTimers.clear();
    if (openMenuFrame !== null) {
      cancelAnimationFrame(openMenuFrame);
      openMenuFrame = null;
    }
  }

  function setMenuTimer(fn, delay) {
    const id = setTimeout(() => {
      menuTimers.delete(id);
      fn();
    }, delay);
    menuTimers.add(id);
    return id;
  }

  function invalidatePageSequences() {
    pageSequenceVersion += 1;
    pageRevealScheduler?.destroy();
    pageRevealScheduler = null;
  }

  function getCurrentChipKey() {
    return body.dataset.screen || navStack[navStack.length - 1];
  }

  function createExpandedChipLayoutAnimator() {
    const container = document.querySelector(
      ".chatbox__options[data-state='expanded']"
    );
    const chips = container
      ? [...container.querySelectorAll('.chip--bg')]
      : [];
    const observedCopies = chips
      .map(chip => chip.querySelector('.chip__copy'))
      .filter(Boolean);
    const targetHeights = new Map();
    const activeAnimations = new Map();
    let observer = null;
    let layoutFrame = null;
    let enabled = false;

    function getNaturalHeight(chip) {
      const copy = chip.querySelector('.chip__copy');
      const style = getComputedStyle(chip);
      const contentHeight = copy ? copy.getBoundingClientRect().height : 0;
      const verticalChrome =
        parseFloat(style.paddingTop)
        + parseFloat(style.paddingBottom)
        + parseFloat(style.borderTopWidth)
        + parseFloat(style.borderBottomWidth);
      const minimumHeight = parseFloat(style.minHeight) || 0;
      return Math.max(minimumHeight, contentHeight + verticalChrome);
    }

    function measure() {
      chips.forEach(chip => {
        targetHeights.set(chip, getNaturalHeight(chip));
      });
    }

    function cancelAnimations() {
      activeAnimations.forEach(animation => animation.cancel());
      activeAnimations.clear();
    }

    function animateLayoutChanges() {
      layoutFrame = null;
      if (!enabled || body.dataset.menu !== 'open' || isClosingMenu) {
        measure();
        return;
      }

      chips.forEach(chip => {
        const previousTarget = targetHeights.get(chip);
        const nextTarget = getNaturalHeight(chip);
        targetHeights.set(chip, nextTarget);
        if (previousTarget === undefined || Math.abs(previousTarget - nextTarget) < 0.5) return;

        const currentHeight = chip.getBoundingClientRect().height;
        if (Math.abs(currentHeight - nextTarget) < 0.5) return;

        activeAnimations.get(chip)?.cancel();
        const animation = chip.animate(
          [
            { height: currentHeight + 'px' },
            { height: nextTarget + 'px' }
          ],
          {
            duration: expandedChipLayoutMotion.duration,
            easing: expandedChipLayoutMotion.easing,
            fill: 'both'
          }
        );
        activeAnimations.set(chip, animation);
        animation.finished
          .then(() => {
            if (activeAnimations.get(chip) !== animation) return;
            activeAnimations.delete(chip);
            animation.cancel();
          })
          .catch(() => {});
      });
    }

    function scheduleLayoutAnimation() {
      if (layoutFrame !== null) cancelAnimationFrame(layoutFrame);
      layoutFrame = requestAnimationFrame(animateLayoutChanges);
    }

    function start() {
      if (!container || !chips.length) return;
      stop();
      enabled = true;
      measure();
      if (
        typeof ResizeObserver === 'undefined'
        || window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        return;
      }
      observer = new ResizeObserver(scheduleLayoutAnimation);
      observedCopies.forEach(copy => observer.observe(copy));
    }

    function stop() {
      enabled = false;
      observer?.disconnect();
      observer = null;
      if (layoutFrame !== null) {
        cancelAnimationFrame(layoutFrame);
        layoutFrame = null;
      }
      cancelAnimations();
      targetHeights.clear();
    }

    return { start, stop };
  }

  const expandedChipLayoutAnimator = createExpandedChipLayoutAnimator();

  function getCurrentClosedOptionsScroll() {
    const key = getCurrentChipKey();
    const activeRect = savedSmallChipRects.get(key);
    if (!activeRect || !savedClosedOptionsRect) return savedClosedOptionsScrollLeft;
    const nextScroll = savedClosedOptionsScrollLeft + activeRect.left - savedClosedOptionsRect.left;
    return Math.max(0, Math.min(nextScroll, savedClosedOptionsMaxScroll));
  }

  function scrollCollapsedOptionsToCurrent() {
    const collapsedOptions = document.querySelector(".chatbox__options[data-state='collapsed']");
    if (!collapsedOptions) return 0;
    const maxScroll = Math.max(0, collapsedOptions.scrollWidth - collapsedOptions.clientWidth);
    const nextScroll = Math.max(0, Math.min(getCurrentClosedOptionsScroll(), maxScroll));
    isProgrammaticCollapsedScroll = true;
    collapsedOptions.removeAttribute('data-user-scrolled');
    collapsedOptions.scrollLeft = nextScroll;
    syncScrollEdges(collapsedOptions);
    requestAnimationFrame(() => {
      isProgrammaticCollapsedScroll = false;
    });
    return nextScroll;
  }

  function getScreenNameFromLocation() {
    if (!usesHashRouting) return defaultScreenName;
    const route = decodeURIComponent(window.location.hash.slice(1));
    return screensByName.has(route) ? route : defaultScreenName;
  }

  function syncRoute(name, { replace = false } = {}) {
    if (!usesHashRouting) return;
    if (!screensByName.has(name)) return;
    const method = replace ? 'replaceState' : 'pushState';
    window.history[method]({ screen: name }, '', `#${encodeURIComponent(name)}`);
  }

  function showScreen(name, {
    animate = true,
    scroll = true,
    preservePendingState = false
  } = {}) {
    const activeScreen = screensByName.get(name);
    if (!activeScreen) return false;
    screens.forEach(s => {
      const match = s.dataset.screenName === name;
      s.hidden = !match;
    });
    body.dataset.screen = name;
    body.dataset.pageLayout = activeScreen.dataset.pageLayout || 'content';
    if (!preservePendingState) delete body.dataset.pageTextPending;
    invalidatePageSequences();
    updateActiveChips(name);
    stampMessageTimes(activeScreen);
    if (scroll) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
    if (animate) playScreenLeetTexts(name);
    return true;
  }

  function updateActiveChips(name) {
    document.querySelectorAll('.chip[data-target]').forEach(chip => {
      if (chip.dataset.target === name) chip.setAttribute('aria-current', 'page');
      else chip.removeAttribute('aria-current');
    });
  }

  function navigate(target, fallbackHref = '') {
    if (!screensByName.has(target)) {
      closeMenu();
      if (fallbackHref) {
        const url = new URL(fallbackHref, document.baseURI);
        window.location.assign(url.href);
      }
      return;
    }
    if (target === body.dataset.screen) {
      closeMenu();
      return;
    }
    if (target !== navStack[navStack.length - 1]) navStack.push(target);
    syncRoute(target);
    showScreen(target);
    closeMenu();
  }

  function goBack(fallbackHref = '') {
    if (navStack.length > 1) {
      navStack.pop();
      window.history.back();
      closeMenu();
      return;
    }
    if (window.history.length > 1 && document.referrer) {
      window.history.back();
      closeMenu();
      return;
    }
    if (fallbackHref) {
      window.location.assign(new URL(fallbackHref, document.baseURI).href);
      closeMenu();
      return;
    }
    if (usesHashRouting && defaultScreenName) {
      syncRoute(defaultScreenName, { replace: true });
      showScreen(defaultScreenName);
    }
    closeMenu();
  }

  window.addEventListener('popstate', () => {
    if (!usesHashRouting) return;
    const name = getScreenNameFromLocation();
    if (!name) return;
    if (navStack[navStack.length - 1] !== name) navStack.push(name);
    showScreen(name);
    closeMenu();
  });

  // --- Menu open / close ---------------------------------
  function openMenu() {
    if (body.dataset.menu === 'open' || isClosingMenu) return;
    clearMenuTimers();
    menuLeetTexts
      .filter(effect => !effect.el.classList.contains('chip__keyword'))
      .forEach(effect => effect.prepareHidden({ reserveSpace: false }));

    // FLIP capture: each small chip's position before the menu opens.
    // Persist these so closeMenu can use them as its FLIP targets.
    savedSmallChipRects.clear();
    document.querySelectorAll(".chatbox__options[data-state='collapsed'] .chip").forEach(c => {
      const key = c.dataset.target || c.dataset.action;
      if (key) savedSmallChipRects.set(key, c.getBoundingClientRect());
    });
    const inner = document.querySelector('.chatbox__inner');
    const wrap = document.querySelector('.chatbox-wrap');
    const collapsedOptions = document.querySelector(".chatbox__options[data-state='collapsed']");
    const expandedOptions = document.querySelector(".chatbox__options[data-state='expanded']");
    savedClosedWrapRect = wrap ? wrap.getBoundingClientRect() : null;
    savedClosedInnerRect = inner ? inner.getBoundingClientRect() : null;
    savedClosedOptionsRect = collapsedOptions ? collapsedOptions.getBoundingClientRect() : null;
    savedClosedOptionsScrollLeft = collapsedOptions ? collapsedOptions.scrollLeft : 0;
    savedClosedOptionsMaxScroll = collapsedOptions
      ? Math.max(0, collapsedOptions.scrollWidth - collapsedOptions.clientWidth)
      : 0;
    const startRects = savedSmallChipRects;
    const startOptionsWidth = savedClosedOptionsRect ? savedClosedOptionsRect.width : null;

    if (expandedOptions && startOptionsWidth !== null) {
      expandedOptions.style.width = '100%';
      expandedOptions.style.maxWidth = startOptionsWidth + 'px';
      expandedOptions.style.overflow = 'hidden';
      expandedOptions.style.transition = 'none';
    }

    body.dataset.menu = 'open';
    expandedChipLayoutAnimator.start();
    const btn = document.querySelector('.menu-btn');
    if (btn) {
      btn.setAttribute('aria-expanded', 'true');
      btn.setAttribute('aria-label', 'Close suggestions');
    }

    // FLIP play: each big chip animates directly from its twin's small
    // rect to its full text rect so movement, scale, and text are one
    // synchronized transition.
    openMenuFrame = requestAnimationFrame(() => {
      openMenuFrame = null;
      if (body.dataset.menu !== 'open') return;

      const expanded = document.querySelectorAll(".chatbox__options[data-state='expanded'] .chip");

      if (inner && savedClosedInnerRect) {
        const targetHeight = inner.getBoundingClientRect().height;
        openingShellAnimation?.cancel();
        const animation = animateShellHeight(
          inner,
          savedClosedInnerRect.height,
          targetHeight
        );
        openingShellAnimation = animation;
        animation?.finished
          .then(() => {
            if (openingShellAnimation !== animation) return;
            openingShellAnimation = null;
            animation.cancel();
          })
          .catch(() => {});
      }
      if (expandedOptions && startOptionsWidth !== null) {
        const innerRect = inner ? inner.getBoundingClientRect() : null;
        const innerStyle = inner ? getComputedStyle(inner) : null;
        const targetOptionsWidth = innerRect && innerStyle
          ? innerRect.width - parseFloat(innerStyle.paddingLeft) - parseFloat(innerStyle.paddingRight)
          : expandedOptions.scrollWidth;
        expandedOptions.getBoundingClientRect();
        expandedOptions.style.transition = 'max-width var(--duration-spring) var(--easing-spring)';
        expandedOptions.style.maxWidth = targetOptionsWidth + 'px';
        setMenuTimer(() => {
          if (body.dataset.menu === 'open' && !isClosingMenu) {
            expandedOptions.style.width = '';
            expandedOptions.style.maxWidth = '';
            expandedOptions.style.overflow = '';
            expandedOptions.style.transition = '';
          }
        }, menuMotion.duration);
      }

      expanded.forEach((big, i) => {
        const key = big.dataset.target || big.dataset.action;
        const from = startRects.get(key);
        if (!from) return;
        const to = big.getBoundingClientRect();

        const dx = from.left - to.left;
        const dy = from.top - to.top;
        const sx = from.width  / to.width;
        const sy = from.height / to.height;

        big.animate(
          [
            { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, transformOrigin: '0 0' },
            { transform: 'none',                                            transformOrigin: '0 0' }
          ],
          { duration: menuMotion.duration, easing: menuMotion.easing }
        );

      });

      if (body.dataset.menu === 'open' && !isClosingMenu) {
        playMenuLeetTexts();
      }
    });
  }

  function closeMenu() {
    if (body.dataset.menu !== 'open' || isClosingMenu) return;
    isClosingMenu = true;
    body.dataset.menuClosing = 'true';
    expandedChipLayoutAnimator.stop();
    clearMenuTimers();

    // Close strategy: animate the real expanded buttons into the collapsed
    // row. During the transition the expanded options container becomes the
    // collapsed row's clipping box, then normal CSS takes back over.
    //
    // Timeline:
    //   • Wrap / chatbox / inner CSS springs fire at t=0.
    //   • Each expanded chip animates width/height/padding + translate.
    //     Only the keyword text scales, so the pill radius is not warped.
    //   • All chips animate together so movement, scale, and text hiding
    //     read as one synchronized transition.
    //   • Expanded green text is removed before the first frame,
    //     so text, spacing, movement, and scale change together.
    //   • Total close = DURATION.
    const DURATION = menuMotion.duration;
    // The chatbox itself keeps its spring, but chip positions must not
    // overshoot horizontally before the collapsed row takes over.
    const EASING = menuMotion.easing;

    const expandedChips = [...document.querySelectorAll(".chatbox__options[data-state='expanded'] .chip")];
    const collapsedChips = new Map(
      [...document.querySelectorAll(".chatbox__options[data-state='collapsed'] .chip")]
        .map(chip => [chip.dataset.target || chip.dataset.action, chip])
    );
    const expandedOptions = document.querySelector(".chatbox__options[data-state='expanded']");
    const wrap  = document.querySelector('.chatbox-wrap');
    const cb    = document.querySelector('.chatbox');
    const inner = document.querySelector('.chatbox__inner');

    openingShellAnimation?.cancel();
    openingShellAnimation = null;

    // Snapshot every chip's open rect BEFORE any layout shift so the pin
    // captures the true open position (not a value already drifting due
    // to inner.height changing).
    const openRects = expandedChips.map(c => c.getBoundingClientRect());
    const expandedOptionsOpenRect = expandedOptions ? expandedOptions.getBoundingClientRect() : null;
    const targetClosedScrollLeft = getCurrentClosedOptionsScroll();
    const closedScrollDelta = targetClosedScrollLeft - savedClosedOptionsScrollLeft;

    const innerOpenRect = inner ? inner.getBoundingClientRect() : null;
    const closedInnerRect = savedClosedInnerRect || innerOpenRect;
    const closedOptionsRect = savedClosedOptionsRect;
    const closedOptionsBounds = innerOpenRect && closedInnerRect && closedOptionsRect
      ? {
          left: closedOptionsRect.left - closedInnerRect.left,
          top: closedOptionsRect.top - closedInnerRect.top,
          width: closedOptionsRect.width,
          height: closedOptionsRect.height
        }
      : null;
    const openOptionsBounds = innerOpenRect && expandedOptionsOpenRect
      ? {
          left: expandedOptionsOpenRect.left - innerOpenRect.left,
          top: expandedOptionsOpenRect.top - innerOpenRect.top,
          width: expandedOptionsOpenRect.width,
          height: expandedOptionsOpenRect.height
        }
      : null;

    if (expandedOptions && openOptionsBounds && closedOptionsBounds) {
      expandedOptions.style.position = 'absolute';
      expandedOptions.style.left = openOptionsBounds.left + 'px';
      expandedOptions.style.top = openOptionsBounds.top + 'px';
      expandedOptions.style.width = openOptionsBounds.width + 'px';
      expandedOptions.style.height = openOptionsBounds.height + 'px';
      expandedOptions.style.display = 'block';
      expandedOptions.style.overflow = 'hidden';
      expandedOptions.style.zIndex = '1';
      expandedOptions.style.pointerEvents = 'none';
    }

    const animatedChipStyles = new Map();
    const animatedChips = expandedChips.map((big, i) => {
      big.getAnimations().forEach(a => a.cancel());
      const open = openRects[i];
      const key = big.dataset.target || big.dataset.action;
      const collapsedChip = collapsedChips.get(key);
      const openStyle = getComputedStyle(big);
      const collapsedStyle = collapsedChip ? getComputedStyle(collapsedChip) : openStyle;
      const openFontSize = parseFloat(openStyle.fontSize);
      animatedChipStyles.set(big, {
        openPadding: `${openStyle.paddingTop} ${openStyle.paddingRight} ${openStyle.paddingBottom} ${openStyle.paddingLeft}`,
        closedPadding: `${collapsedStyle.paddingTop} ${collapsedStyle.paddingRight} ${collapsedStyle.paddingBottom} ${collapsedStyle.paddingLeft}`,
        keywordScale: openFontSize
          ? parseFloat(collapsedStyle.fontSize) / openFontSize
          : 1
      });
      big.style.position = 'absolute';
      big.style.top      = (expandedOptionsOpenRect ? open.top - expandedOptionsOpenRect.top : open.top) + 'px';
      big.style.left     = (expandedOptionsOpenRect ? open.left - expandedOptionsOpenRect.left : open.left) + 'px';
      big.style.width    = open.width + 'px';
      big.style.height   = open.height + 'px';
      big.style.minHeight = '0';
      big.style.margin   = '0';
      big.style.overflow = 'hidden';
      big.style.justifyContent = 'center';
      big.style.gap = '0';
      big.style.pointerEvents = 'none';
      const copy = big.querySelector('.chip__copy');
      if (copy) {
        // Keep a real box and pin it to the pill's geometric center while
        // width and height animate. This avoids Safari's transient flex
        // alignment pass that otherwise places the small label too far left.
        copy.style.display = 'block';
        copy.style.position = 'absolute';
        copy.style.left = '50%';
        copy.style.top = '50%';
        copy.style.transform = 'translate(-50%, -50%)';
        copy.style.width = 'max-content';
        copy.style.maxWidth = 'none';
        copy.style.whiteSpace = 'nowrap';
      }
      const keyword = big.querySelector('.chip__keyword');
      if (keyword) {
        keyword.style.display = 'inline-block';
        keyword.style.marginRight = '0';
        keyword.style.transformOrigin = 'center';
      }
      big.querySelectorAll('.chip__muted').forEach(el => {
        el.style.display = 'none';
      });
      return big;
    });

    body.dataset.menu = 'closed';
    scrollCollapsedOptionsToCurrent();
    const btn = document.querySelector('.menu-btn');
    if (btn) {
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', 'Open suggestions');
    }

    // Keep steady states intrinsic. Explicit heights exist only for this
    // transition so the shell and its content interpolate as one component.
    const shellAnimations = [];
    if (savedClosedWrapRect) {
      const closedBottom = window.innerHeight - savedClosedWrapRect.bottom;
      wrap.style.bottom = closedBottom + 'px';
      wrap.style.width = savedClosedWrapRect.width + 'px';
      wrap.style.maxWidth = savedClosedWrapRect.width + 'px';
    }
    cb.style.padding    = 'var(--space-3)';
    if (innerOpenRect && closedInnerRect) {
      const animation = animateShellHeight(
        inner,
        innerOpenRect.height,
        closedInnerRect.height
      );
      if (animation) shellAnimations.push(animation);
    }

    const parentDx = innerOpenRect && closedInnerRect ? closedInnerRect.left - innerOpenRect.left : 0;
    const parentDy = innerOpenRect && closedInnerRect ? closedInnerRect.top  - innerOpenRect.top  : 0;
    const optionsDx = openOptionsBounds && closedOptionsBounds ? closedOptionsBounds.left - openOptionsBounds.left : 0;
    const optionsDy = openOptionsBounds && closedOptionsBounds ? closedOptionsBounds.top - openOptionsBounds.top : 0;

    if (expandedOptions && openOptionsBounds && closedOptionsBounds) {
      expandedOptions.animate(
        [
          {
            left: openOptionsBounds.left + 'px',
            top: openOptionsBounds.top + 'px',
            width: openOptionsBounds.width + 'px',
            height: openOptionsBounds.height + 'px'
          },
          {
            left: closedOptionsBounds.left + 'px',
            top: closedOptionsBounds.top + 'px',
            width: closedOptionsBounds.width + 'px',
            height: closedOptionsBounds.height + 'px'
          }
        ],
        { duration: DURATION, easing: EASING, fill: 'both' }
      );
    }

    animatedChips.forEach((big, i) => {
      const key = big.dataset.target || big.dataset.action;
      const savedTarget = savedSmallChipRects.get(key);
      if (!savedTarget) return;
      const target = {
        left: savedTarget.left - closedScrollDelta,
        top: savedTarget.top,
        width: savedTarget.width,
        height: savedTarget.height
      };

      const open = openRects[i];
      const dx = target.left - open.left - parentDx - optionsDx;
      const dy = target.top  - open.top  - parentDy - optionsDy;
      const keyword = big.querySelector('.chip__keyword');
      const transitionStyle = animatedChipStyles.get(big);

      big.animate(
        [
          {
            width:      open.width + 'px',
            height:     open.height + 'px',
            padding:    transitionStyle.openPadding,
            transform:  'translate(0, 0)',
            transformOrigin: '0 0'
          },
          {
            width:      target.width + 'px',
            height:     target.height + 'px',
            padding:    transitionStyle.closedPadding,
            transform:  `translate(${dx}px, ${dy}px)`,
            transformOrigin: '0 0'
          }
        ],
        { duration: DURATION, easing: EASING, fill: 'both' }
      );

      if (keyword) {
        keyword.animate(
          [
            { transform: 'scale(1)' },
            { transform: `scale(${transitionStyle.keywordScale})` }
          ],
          { duration: DURATION, easing: EASING, fill: 'both' }
        );
      }

    });

    // After the last chip lands, strip every inline override so chips
    // re-join normal flow as their small twins.
    const totalDuration = DURATION;
    setMenuTimer(() => {
      isClosingMenu = false;
      delete body.dataset.menuClosing;

      shellAnimations.forEach(animation => animation.cancel());
      wrap.style.bottom = '';
      wrap.style.width = '';
      wrap.style.maxWidth = '';
      cb.style.padding = '';

      animatedChips.forEach(big => {
        big.getAnimations().forEach(a => a.cancel());
        big.removeAttribute('style');
        const keyword = big.querySelector('.chip__keyword');
        if (keyword) {
          keyword.getAnimations().forEach(a => a.cancel());
          keyword.removeAttribute('style');
        }
        big.querySelectorAll('.chip__muted').forEach(el => el.removeAttribute('style'));
        const copy = big.querySelector('.chip__copy');
        if (copy) copy.removeAttribute('style');
      });

      if (expandedOptions) {
        expandedOptions.getAnimations().forEach(a => a.cancel());
        expandedOptions.removeAttribute('style');
      }
    }, totalDuration);
  }
  function toggleMenu() {
    body.dataset.menu === 'open' ? closeMenu() : openMenu();
  }

  // --- Dark mode (no-op stub for now) --------------------
  function toggleDark() {
    const isDark = body.classList.toggle('is-dark');
    body.dataset.theme = isDark ? 'dark' : 'light';
  }

  function stampMessageTime(time) {
    if (!time || time.dateTime) return;
    const generatedAt = new Date();
    time.dateTime = generatedAt.toISOString();
    time.textContent = new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).format(generatedAt);
    time.setAttribute('aria-label', `Message generated at ${time.textContent}`);
  }

  function stampMessageTimes(scope = document) {
    scope.querySelectorAll('[data-message-generated-at]').forEach(stampMessageTime);
  }

  async function shareMessage(actionEl) {
    const message = actionEl.closest('[data-message]');
    const text = message?.querySelector('[data-message-body]')?.textContent.trim() || '';
    if (!text) return;
    const shareData = {
      title: document.title,
      text,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${text}\n\n${window.location.href}`);
        actionEl.title = 'Copied';
        window.setTimeout(() => { actionEl.title = 'Share'; }, 1200);
      }
    } catch (error) {
      if (error?.name !== 'AbortError') console.error('Unable to share message', error);
    }
  }

  function rateMessage(actionEl) {
    const isPressed = actionEl.getAttribute('aria-pressed') === 'true';
    const actions = actionEl.closest('[data-message-actions]') || actionEl.parentElement;
    actions?.querySelectorAll('[data-action="rate-message"]').forEach(button => {
      button.setAttribute('aria-pressed', 'false');
    });
    actionEl.setAttribute('aria-pressed', String(!isPressed));
  }

  // --- Click delegation ----------------------------------
  document.addEventListener('click', (e) => {
    const actionEl = e.target.closest('[data-action]');
    if (actionEl) {
      e.preventDefault();
      switch (actionEl.dataset.action) {
        case 'back':
          goBack(
            actionEl.dataset.fallbackHref
              || actionEl.getAttribute('href')
              || ''
          );
          return;
        case 'toggle-menu':  toggleMenu(); return;
        case 'close-menu':   closeMenu(); return;
        case 'toggle-dark':  toggleDark(); closeMenu(); return;
        case 'share-message': shareMessage(actionEl); return;
        case 'rate-message':  rateMessage(actionEl); return;
      }
    }

    const targetEl = e.target.closest('[data-target]');
    if (targetEl) {
      e.preventDefault();
      navigate(
        targetEl.dataset.target,
        targetEl.dataset.href || targetEl.getAttribute('href') || ''
      );
      return;
    }

    const chatboxInnerEl = e.target.closest('.chatbox__inner');
    if (chatboxInnerEl) {
      toggleMenu();
    }
  });

  // --- Esc closes menu -----------------------------------
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && body.dataset.menu === 'open') closeMenu();
  });

  // --- Fade indicators on horizontally-scrollable chip rows -
  // Toggles [data-at-start] / [data-at-end] on the scroll container so
  // the CSS mask gradient on each edge can fade in/out smoothly.
  function syncScrollEdges(el) {
    const isOverflowing = el.scrollWidth > el.clientWidth + 1;
    const isAtStart = !isOverflowing || el.scrollLeft <= 1;
    const isAtEnd   = !isOverflowing || el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
    el.toggleAttribute('data-at-start', isAtStart);
    el.toggleAttribute('data-at-end',   isAtEnd);
  }

  document.querySelectorAll('.chatbox__options:not(.chatbox__options--expanded)').forEach(el => {
    syncScrollEdges(el);
    el.addEventListener('scroll', () => {
      syncScrollEdges(el);
      if (el.scrollLeft <= 1) {
        el.removeAttribute('data-user-scrolled');
        return;
      }
      if (!isProgrammaticCollapsedScroll && body.dataset.menu !== 'open' && body.dataset.menuClosing !== 'true') {
        el.setAttribute('data-user-scrolled', '');
      }
    }, { passive: true });
    if ('ResizeObserver' in window) {
      new ResizeObserver(() => syncScrollEdges(el)).observe(el);
    } else {
      window.addEventListener('resize', () => syncScrollEdges(el));
    }
  });

  // --- Leetspeak text effect ------------------------------
  const leetMap = {
    a: ['∆', '4', '@', 'Д'],
    b: ['8', '6', 'ß', 'в', 'ь'],
    c: ['<', '{', '[', '(', '©', '¢', 'с'],
    d: ['Đ'],
    e: ['3', '&', '£', '₤', '€'],
    f: ['7', 'ƒ'],
    g: ['6', '9', '[', '-'],
    h: ['#', '4', 'н'],
    i: ['1', '|', '!'],
    j: ['√', '9', '♪'],
    k: ['к'],
    l: ['|', '1'],
    m: ['м'],
    n: ['И', 'и', 'п', '№'],
    o: ['0', 'Ø', 'Θ', 'о', 'ө'],
    p: ['р', '?', '¶', '₱'],
    q: ['9', '0', 'Ω'],
    r: ['Я', '®'],
    s: ['5', '2', '$', '§'],
    t: ['7', '+', 'т', '†'],
    u: ['μ'],
    v: ['√', '✓'],
    w: ['Ш'],
    x: ['×', '%', '*', 'Ж'],
    y: ['¥', 'Ч', 'ү', 'у'],
    z: ['2', '5'],
    ',': ['‘'],
    "'": [','],
    '/': ['\\'],
    ':': [';'],
    '!': ['i'],
    '.': ['°'],
    '?': ['2']
  };

  const numericLeetMap = {
    0: 'O',
    1: 'I',
    2: 'Z',
    3: 'E',
    4: 'A',
    5: 'S',
    6: 'G',
    7: 'T',
    8: 'B',
    9: 'Q'
  };

  function toLeetChar(char) {
    if (numericLeetMap[char]) return numericLeetMap[char];
    const variants = leetMap[char.toLowerCase()];
    if (!variants) return char;
    return variants[Math.floor(Math.random() * variants.length)];
  }

  function createLeetText(el) {
    const timers = new Set();
    const accentTimers = new Map();
    const hoverResetTimers = new Map();
    const pendingOperations = new Set();
    let isHiding = false;
    let hoveredIndices = new Set();
    let interactionTokenConsumer = null;
    const TYPE_STEP = readCssNumber('--leet-type-step', 18);
    const CORRECTION_DELAY = readCssNumber('--leet-correction-delay', 280);
    const CORRECTION_STEP = readCssNumber('--leet-correction-step', 18);
    const FULL_HOVER_DELAY = readCssNumber('--leet-hover-delay', 70);
    const FULL_HOVER_LEET_STEP = readCssNumber('--leet-hover-write-step', 10);
    const FULL_HOVER_CORRECTION_STEP = readCssNumber('--leet-hover-correction-step', 10);
    const ACCENT_DURATION = readCssNumber('--leet-accent-duration', 80);
    const HOVER_RESET_DELAY = readCssNumber('--leet-hover-reset-delay', 420);
    const HOVER_RESET_STEP = readCssNumber('--leet-hover-reset-step', 14);
    const LINE_DELAY = readCssNumber('--leet-line-delay', 180);
    const LINE_CORRECTION_DELAY = readCssNumber('--leet-line-correction-delay', 260);
    const LINE_CORRECTION_STEP = readCssNumber('--leet-line-correction-step', 16);
    const HIDE_STEP = readCssNumber('--leet-hide-step', 18);
    const growOwner = el.closest('[data-leet-grow="intrinsic"]');
    const growsFromEmpty = Boolean(growOwner);
    const suggestionRow = el.closest('.suggestion');
    if (suggestionRow) {
      const siblingSuggestions = [...suggestionRow.parentElement.children]
        .filter(child => child.classList.contains('suggestion'));
      const suggestionIndex = Math.max(0, siblingSuggestions.indexOf(suggestionRow));
      const cascadeStep = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--suggestion-line-cascade-step')
      ) || 100;
      const iconCascadeStep = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--suggestion-icon-cascade-step')
      ) || 120;
      suggestionRow.style.setProperty(
        '--suggestion-line-end-delay',
        `${(suggestionIndex + 1) * cascadeStep}ms`
      );
      suggestionRow.style.setProperty(
        '--suggestion-icon-delay',
        `${suggestionIndex * iconCascadeStep}ms`
      );
    }

    el.dataset.leetState = 'idle';
    const textNodes = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const text = node.textContent.replace(/\s+/g, ' ');
      if (text) textNodes.push({ node, text });
    }
    if (textNodes[0]) textNodes[0].text = textNodes[0].text.trimStart();
    if (textNodes[textNodes.length - 1]) {
      textNodes[textNodes.length - 1].text = textNodes[textNodes.length - 1].text.trimEnd();
    }

    const spans = [];
    textNodes.forEach(({ node, text }) => {
      const fragment = document.createDocumentFragment();
      text.split(/(\s+)/).forEach(token => {
        if (!token) return;
        if (/^\s+$/.test(token)) {
          fragment.appendChild(document.createTextNode(token));
          return;
        }
        const word = document.createElement('span');
        word.className = 'leet-word';
        [...token].forEach(char => {
          const span = createLeetCharSpan(char, spans.length);
          spans.push(span);
          word.appendChild(span);
        });
        fragment.appendChild(word);
      });
      node.replaceWith(fragment);
    });
    const sequenceStates = spans.map(() => 'pending');
    const sequenceOperations = new Set();
    let activeSequenceWrites = 0;
    let activeSequenceCorrections = 0;

    function createLeetCharSpan(char, index) {
      const span = document.createElement('span');
      span.className = 'leet-char';
      span.dataset.index = String(index);
      span.dataset.char = char;
      span.dataset.leet = toLeetChar(char);
      span.textContent = '';
      return span;
    }

    function setTimer(fn, delay) {
      const id = setTimeout(() => {
        timers.delete(id);
        fn();
      }, delay);
      timers.add(id);
      return id;
    }

    function createOperation() {
      let isSettled = false;
      let resolvePromise;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      const settle = completed => {
        if (isSettled) return;
        isSettled = true;
        pendingOperations.delete(cancel);
        resolvePromise({ completed });
      };
      const cancel = () => settle(false);
      pendingOperations.add(cancel);
      return {
        promise,
        complete: () => settle(true)
      };
    }

    function clearTimers() {
      timers.forEach(id => clearTimeout(id));
      timers.clear();
      hoverResetTimers.forEach(id => clearTimeout(id));
      hoverResetTimers.clear();
      [...pendingOperations].forEach(cancel => cancel());
    }

    function setTone(index, tone = 'default') {
      const span = spans[index];
      if (!span) return;
      if (tone === 'default') delete span.dataset.leetTone;
      else span.dataset.leetTone = tone;
    }

    function clearAccentTimers({ resetTone = true } = {}) {
      accentTimers.forEach(id => clearTimeout(id));
      accentTimers.clear();
      if (resetTone) spans.forEach((_, index) => setTone(index));
    }

    function pulseAccent(index, { duration = ACCENT_DURATION, onComplete } = {}) {
      const activeTimer = accentTimers.get(index);
      if (activeTimer) clearTimeout(activeTimer);
      setTone(index, 'accent');
      const id = setTimeout(() => {
        accentTimers.delete(index);
        setTone(index);
        onComplete?.();
      }, duration);
      accentTimers.set(index, id);
    }

    function setChar(index, mode) {
      const span = spans[index];
      if (!span) return;
      span.textContent = mode === 'leet' ? span.dataset.leet : span.dataset.char;
    }

    function syncSequenceElementState() {
      if (activeSequenceWrites > 0) {
        el.dataset.leetState = 'typing';
        return;
      }
      if (activeSequenceCorrections > 0) {
        el.dataset.leetState = 'correcting';
        return;
      }
      el.dataset.leetState = sequenceStates.every(state => state === 'corrected')
        ? 'ready'
        : 'idle';
    }

    function setSequenceIndexPlain(index, { corrected = true, visible = true } = {}) {
      const span = spans[index];
      if (!span) return;
      sequenceStates[index] = corrected ? 'corrected' : 'pending';
      setChar(index, 'plain');
      setTone(index);
      if (visible) {
        span.style.minWidth = '';
        span.style.opacity = '1';
      } else if (growsFromEmpty) {
        span.textContent = '';
        span.style.minWidth = '0';
        span.style.opacity = '0';
        delete span.dataset.typed;
      } else {
        span.style.minWidth = '';
        span.style.opacity = '0';
        delete span.dataset.typed;
      }
    }

    function finalizeSequenceIndices(indices) {
      indices.forEach(index => setSequenceIndexPlain(index));
      syncSequenceElementState();
    }

    function requeueSequenceIndices(indices) {
      indices.forEach(index => setSequenceIndexPlain(index, {
        corrected: false,
        visible: false
      }));
      syncSequenceElementState();
    }

    function cancelSequenceOperations({ finalize = false } = {}) {
      [...sequenceOperations].forEach(operation => {
        operation.cancel({ finalize });
      });
      sequenceOperations.clear();
      activeSequenceWrites = 0;
      activeSequenceCorrections = 0;
    }

    function prepareSequenceHidden({ reserveSpace = !growsFromEmpty } = {}) {
      clearTimers();
      clearAccentTimers();
      cancelSequenceOperations();
      isHiding = false;
      hoveredIndices = new Set();
      delete el.dataset.leetCollapsed;
      if (!reserveSpace) el.dataset.leetCollapsed = 'true';
      if (suggestionRow) suggestionRow.dataset.suggestionState = 'hidden';
      spans.forEach((span, index) => {
        sequenceStates[index] = 'pending';
        delete span.dataset.typed;
        setTone(index);
        if (reserveSpace) {
          setChar(index, 'plain');
          span.style.minWidth = '';
        } else {
          span.textContent = '';
          span.style.minWidth = '0';
        }
        span.style.opacity = '0';
      });
      syncSequenceElementState();
    }

    function getSequenceRect(indices) {
      if (growsFromEmpty) return growOwner.getBoundingClientRect();
      const rects = indices
        .map(index => spans[index]?.getBoundingClientRect())
        .filter(rect => rect && (rect.width || rect.height));
      if (!rects.length) return el.getBoundingClientRect();
      const top = Math.min(...rects.map(rect => rect.top));
      const right = Math.max(...rects.map(rect => rect.right));
      const bottom = Math.max(...rects.map(rect => rect.bottom));
      const left = Math.min(...rects.map(rect => rect.left));
      return {
        top,
        right,
        bottom,
        left,
        width: Math.max(0, right - left),
        height: Math.max(0, bottom - top)
      };
    }

    function isRectInsideSequenceViewport(rect, viewport) {
      return rect.width >= 0
        && rect.height > 0
        && rect.top >= viewport.top - 0.5
        && rect.bottom <= viewport.bottom + 0.5
        && rect.right > viewport.left
        && rect.left < viewport.right;
    }

    function getPendingSequenceChunk(viewport, { allVisibleLines = false } = {}) {
      const pendingIndices = sequenceStates
        .map((state, index) => ({ state, index }))
        .filter(item => item.state === 'pending')
        .map(item => item.index);
      if (!pendingIndices.length) return null;

      if (growsFromEmpty) {
        const rect = growOwner.getBoundingClientRect();
        if (!isRectInsideSequenceViewport(rect, viewport)) return null;
        return { indices: pendingIndices, rect };
      }

      const lineMap = new Map();
      pendingIndices.forEach(index => {
        const rect = spans[index].getBoundingClientRect();
        const key = Math.round(rect.top);
        if (!lineMap.has(key)) lineMap.set(key, []);
        lineMap.get(key).push(index);
      });
      const visibleLines = [...lineMap.values()]
        .map(indices => ({ indices, rect: getSequenceRect(indices) }))
        .filter(line => isRectInsideSequenceViewport(line.rect, viewport))
        .sort((first, second) => (
          first.rect.top - second.rect.top || first.rect.left - second.rect.left
        ));
      if (!visibleLines.length) return null;
      if (allVisibleLines) {
        const indices = visibleLines.flatMap(line => line.indices);
        return { indices, rect: getSequenceRect(indices) };
      }
      return visibleLines[0];
    }

    function finalizeSequenceBefore(viewportTop) {
      if (growsFromEmpty) {
        const rect = growOwner.getBoundingClientRect();
        const pendingIndices = sequenceStates
          .map((state, index) => ({ state, index }))
          .filter(item => item.state === 'pending')
          .map(item => item.index);
        if (pendingIndices.length && rect.height > 0 && rect.bottom <= viewportTop) {
          finalizeSequenceIndices(pendingIndices);
          return pendingIndices.length;
        }
        return 0;
      }
      const indices = sequenceStates
        .map((state, index) => ({ state, index }))
        .filter(item => item.state === 'pending')
        .filter(item => spans[item.index].getBoundingClientRect().bottom <= viewportTop)
        .map(item => item.index);
      if (indices.length) finalizeSequenceIndices(indices);
      return indices.length;
    }

    function finalizeActiveSequenceOutside(viewport) {
      if (growsFromEmpty) {
        const rect = growOwner.getBoundingClientRect();
        if (isRectInsideSequenceViewport(rect, viewport)) return 0;
      }
      const indices = sequenceStates
        .map((state, index) => ({ state, index }))
        .filter(item => item.state === 'writing' || item.state === 'typed')
        .filter(item => !isRectInsideSequenceViewport(
          spans[item.index].getBoundingClientRect(),
          viewport
        ))
        .map(item => item.index);
      if (indices.length) finalizeSequenceIndices(indices);
      return indices.length;
    }

    function getPendingSequenceCount() {
      return sequenceStates.filter(state => state === 'pending').length;
    }

    function playSequenceChunk(indices, {
      writeDuration = getLeetWriteDuration(),
      correctionDuration = getCorrectionDuration(),
      onType,
      onCorrect
    } = {}) {
      const activeIndices = [...new Set(indices)]
        .filter(index => sequenceStates[index] === 'pending');
      let writeSettled = false;
      let correctionSettled = false;
      let correctionStarted = false;
      let resolveWrite;
      let resolveCorrection;
      const write = new Promise(resolve => { resolveWrite = resolve; });
      const correction = new Promise(resolve => { resolveCorrection = resolve; });
      const operationTimers = new Set();
      const setOperationTimer = (fn, delay) => {
        const id = window.setTimeout(() => {
          operationTimers.delete(id);
          fn();
        }, Math.max(0, delay));
        operationTimers.add(id);
      };
      const settleWrite = completed => {
        if (writeSettled) return;
        writeSettled = true;
        activeSequenceWrites = Math.max(0, activeSequenceWrites - 1);
        syncSequenceElementState();
        resolveWrite({ completed });
      };
      const settleCorrection = completed => {
        if (correctionSettled) return;
        correctionSettled = true;
        if (correctionStarted) {
          activeSequenceCorrections = Math.max(0, activeSequenceCorrections - 1);
        }
        sequenceOperations.delete(operation);
        syncSequenceElementState();
        resolveCorrection({ completed });
      };
      const startCorrection = () => {
        if (correctionStarted || correctionSettled) return;
        correctionStarted = true;
        activeSequenceCorrections += 1;
        syncSequenceElementState();
        const accentDuration = Math.min(ACCENT_DURATION, correctionDuration);
        const correctionWindow = Math.max(0, correctionDuration - accentDuration);
        const correctionStep = activeIndices.length > 1
          ? correctionWindow / (activeIndices.length - 1)
          : 0;
        activeIndices.forEach((index, chunkIndex) => {
          setOperationTimer(() => {
            if (sequenceStates[index] === 'typed' || sequenceStates[index] === 'writing') {
              setSequenceIndexPlain(index);
              pulseAccent(index, { duration: accentDuration });
              if (onCorrect && spans[index].dataset.char.trim()) {
                onCorrect({
                  effect: api,
                  index,
                  characterCount: activeIndices.length,
                  span: spans[index]
                });
              }
            }
            if (chunkIndex === activeIndices.length - 1) settleCorrection(true);
          }, chunkIndex * correctionStep);
        });
      };
      const operation = {
        write,
        correction,
        completed: Promise.all([write, correction])
          .then(results => results.every(result => result.completed)),
        cancel({ finalize = false } = {}) {
          operationTimers.forEach(id => window.clearTimeout(id));
          operationTimers.clear();
          if (finalize) finalizeSequenceIndices(activeIndices);
          else {
            finalizeSequenceIndices(activeIndices.filter(index => (
              sequenceStates[index] === 'typed'
            )));
            requeueSequenceIndices(activeIndices.filter(index => (
              sequenceStates[index] === 'writing'
            )));
          }
          settleWrite(false);
          settleCorrection(false);
        }
      };

      if (!activeIndices.length) {
        writeSettled = true;
        correctionSettled = true;
        resolveWrite({ completed: true });
        resolveCorrection({ completed: true });
        return operation;
      }

      sequenceOperations.add(operation);
      activeSequenceWrites += 1;
      isHiding = false;
      delete el.dataset.leetCollapsed;
      if (suggestionRow) suggestionRow.dataset.suggestionState = 'appearing';
      activeIndices.forEach(index => { sequenceStates[index] = 'writing'; });
      syncSequenceElementState();
      const typeStep = activeIndices.length > 1
        ? writeDuration / (activeIndices.length - 1)
        : 0;
      activeIndices.forEach((index, chunkIndex) => {
        setOperationTimer(() => {
          if (sequenceStates[index] === 'writing') {
            const span = spans[index];
            span.style.minWidth = '';
            span.style.opacity = '1';
            setChar(index, 'leet');
            setTone(index, 'muted');
            span.dataset.typed = 'true';
            sequenceStates[index] = 'typed';
            if (onType && span.dataset.char.trim()) {
              onType({
                effect: api,
                index,
                characterCount: activeIndices.length,
                span
              });
            }
          }
          if (chunkIndex === activeIndices.length - 1) {
            settleWrite(true);
            startCorrection();
          }
        }, chunkIndex * typeStep);
      });
      return operation;
    }

    function prepareHidden({ reserveSpace = !growsFromEmpty } = {}) {
      clearTimers();
      clearAccentTimers();
      cancelSequenceOperations();
      isHiding = false;
      el.dataset.leetState = 'idle';
      if (reserveSpace) delete el.dataset.leetCollapsed;
      else el.dataset.leetCollapsed = 'true';
      if (suggestionRow) suggestionRow.dataset.suggestionState = 'hidden';
      spans.forEach((span, index) => {
        sequenceStates[index] = 'pending';
        delete span.dataset.typed;
        if (reserveSpace) {
          setChar(index, 'plain');
          span.style.minWidth = '';
        } else {
          span.textContent = '';
          span.style.minWidth = '0';
        }
        span.style.opacity = '0';
      });
    }

    function playIn({ growFromEmpty = growsFromEmpty, timingScale = 1, correctionAfterWrite = false, deferCorrection = false, onType, onCorrect } = {}) {
      clearTimers();
      clearAccentTimers();
      const operation = createOperation();
      isHiding = false;
      el.dataset.leetState = 'typing';
      delete el.dataset.leetCollapsed;
      if (suggestionRow) suggestionRow.dataset.suggestionState = 'appearing';
      spans.forEach(span => {
        delete span.dataset.typed;
        if (growFromEmpty) {
          span.textContent = '';
          span.style.minWidth = '0';
        }
        span.style.opacity = '0';
      });

      const lastTypeDelay = Math.max(0, spans.length - 1) * TYPE_STEP * timingScale;
      const correctionStart = correctionAfterWrite
        ? lastTypeDelay
        : CORRECTION_DELAY * timingScale;

      if (!spans.length) {
        el.dataset.leetState = deferCorrection ? 'typed' : 'ready';
        operation.complete();
        return operation.promise;
      }

      spans.forEach((span, index) => {
        const typeDelay = index * TYPE_STEP * timingScale;
        setTimer(() => {
          span.style.minWidth = '';
          setChar(index, 'leet');
          setTone(index, 'muted');
          span.style.opacity = '1';
          span.dataset.typed = 'true';
          if (onType && span.dataset.char.trim()) {
            onType({ effect: api, index, characterCount: spans.length, span });
          }
          if (index === spans.length - 1) {
            if (deferCorrection) el.dataset.leetState = 'typed';
            operation.complete();
          }
        }, typeDelay);
        if (!deferCorrection) {
          setTimer(() => {
            setChar(index, 'plain');
            pulseAccent(index, {
              duration: ACCENT_DURATION * timingScale,
              onComplete: index === spans.length - 1
                ? () => { el.dataset.leetState = 'ready'; }
                : undefined
            });
            if (onCorrect && span.dataset.char.trim()) {
              onCorrect({ effect: api, index, characterCount: spans.length, span });
            }
          }, correctionStart + index * CORRECTION_STEP * timingScale);
        }
      });
      return operation.promise;
    }

    function correct({ timingScale = 1, duration, onCorrect } = {}) {
      clearTimers();
      clearAccentTimers({ resetTone: false });
      const operation = createOperation();
      el.dataset.leetState = 'correcting';
      const targetDuration = Number.isFinite(duration) && duration >= 0
        ? duration
        : getCorrectionDuration(timingScale);
      const accentDuration = Math.min(ACCENT_DURATION, targetDuration);
      const correctionWindow = Math.max(0, targetDuration - accentDuration);
      const correctionStep = spans.length > 1 ? correctionWindow / (spans.length - 1) : 0;
      if (!spans.length) {
        el.dataset.leetState = 'ready';
        operation.complete();
        return operation.promise;
      }
      spans.forEach((span, index) => {
        setTimer(() => {
          setChar(index, 'plain');
          pulseAccent(index, {
            duration: accentDuration,
            onComplete: index === spans.length - 1
              ? () => {
                  el.dataset.leetState = 'ready';
                  operation.complete();
                }
              : undefined
          });
          if (onCorrect && span.dataset.char.trim()) {
            onCorrect({ effect: api, index, characterCount: spans.length, span });
          }
        }, index * correctionStep);
      });
      return operation.promise;
    }

    function getCorrectionDuration(timingScale = 1) {
      if (!spans.length) return 0;
      return (Math.max(0, spans.length - 1) * CORRECTION_STEP + ACCENT_DURATION) * timingScale;
    }

    function getLineGroups() {
      const lineMap = new Map();
      el.querySelectorAll('.leet-word').forEach(word => {
        const rect = word.getBoundingClientRect();
        const key = Math.round(rect.top);
        if (!lineMap.has(key)) lineMap.set(key, []);
        lineMap.get(key).push(...word.querySelectorAll('.leet-char'));
      });
      return [...lineMap.entries()]
        .sort(([a], [b]) => a - b)
        .map(([, lineSpans]) => lineSpans);
    }

    function playLinesAsLeet({
      lineDelay = LINE_DELAY,
      correctionDelay = LINE_CORRECTION_DELAY,
      correctionStep = LINE_CORRECTION_STEP
    } = {}) {
      clearTimers();
      clearAccentTimers();
      isHiding = false;
      el.dataset.leetState = 'typing';
      if (suggestionRow) suggestionRow.dataset.suggestionState = 'appearing';
      spans.forEach(span => {
        span.style.opacity = '0';
        setChar(Number(span.dataset.index), 'plain');
        setTone(Number(span.dataset.index));
      });

      const lines = getLineGroups();
      let cursor = 0;
      lines.forEach((lineSpans, lineIndex) => {
        setTimer(() => {
          lineSpans.forEach(span => {
            span.style.minWidth = '';
            span.style.opacity = '1';
            setChar(Number(span.dataset.index), 'leet');
            setTone(Number(span.dataset.index), 'muted');
          });
        }, cursor);

        lineSpans.forEach((span, charIndex) => {
          const index = Number(span.dataset.index);
          setTimer(() => {
            setChar(index, 'plain');
            const isLast = lineIndex === lines.length - 1 && charIndex === lineSpans.length - 1;
            pulseAccent(index, {
              onComplete: isLast ? () => { el.dataset.leetState = 'ready'; } : undefined
            });
          }, cursor + correctionDelay + charIndex * correctionStep);
        });

        cursor += lineDelay;
      });
    }

    function getLinesPlayDuration({
      lineDelay = LINE_DELAY,
      correctionDelay = LINE_CORRECTION_DELAY,
      correctionStep = LINE_CORRECTION_STEP
    } = {}) {
      const lines = getLineGroups();
      if (!lines.length) return 0;
      const lastLine = lines[lines.length - 1];
      return (lines.length - 1) * lineDelay
        + correctionDelay
        + Math.max(0, lastLine.length - 1) * correctionStep
        + ACCENT_DURATION;
    }

    function getPlayInDuration(timingScale = 1, correctionAfterWrite = false) {
      if (!spans.length) return 0;
      const lastIndex = spans.length - 1;
      const correctionStart = correctionAfterWrite
        ? lastIndex * TYPE_STEP
        : CORRECTION_DELAY;
      return (correctionStart + lastIndex * CORRECTION_STEP + ACCENT_DURATION) * timingScale;
    }

    function getLeetWriteDuration(timingScale = 1) {
      if (!spans.length) return 0;
      return (spans.length - 1) * TYPE_STEP * timingScale;
    }

    function getCharacterCount() {
      return spans.length;
    }

    function getLastCharacterIndexBefore(cutoffY) {
      let lastIndex = -1;
      spans.forEach((span, index) => {
        const rect = span.getBoundingClientRect();
        if (rect.top < cutoffY) lastIndex = index;
      });
      return lastIndex;
    }

    function scheduleHoverCorrection(index, delay = HOVER_RESET_DELAY) {
      const activeTimer = hoverResetTimers.get(index);
      if (activeTimer) clearTimeout(activeTimer);
      const id = setTimeout(() => {
        hoverResetTimers.delete(index);
        if (!hoveredIndices.has(index)) return;
        hoveredIndices.delete(index);
        setChar(index, 'plain');
        pulseAccent(index);
        interactionTokenConsumer?.();
      }, delay);
      hoverResetTimers.set(index, id);
    }

    function hoverAround(clientX, clientY) {
      if (isHiding || el.dataset.leetState !== 'ready') return;
      let closestIndex = 0;
      let closestDistance = Infinity;
      let closestRect = null;
      spans.forEach((span, index) => {
        const rect = span.getBoundingClientRect();
        const dx = clientX < rect.left ? rect.left - clientX : clientX > rect.right ? clientX - rect.right : 0;
        const dy = clientY < rect.top ? rect.top - clientY : clientY > rect.bottom ? clientY - rect.bottom : 0;
        const distance = Math.hypot(dx, dy);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
          closestRect = rect;
        }
      });

      const lineIndices = spans
        .map((span, index) => ({ index, rect: span.getBoundingClientRect() }))
        .filter(({ rect }) => Math.abs(rect.top - closestRect.top) <= Math.max(2, closestRect.height * 0.35))
        .sort((a, b) => a.rect.left - b.rect.left)
        .map(({ index }) => index);
      const closestLinePosition = Math.max(0, lineIndices.indexOf(closestIndex));
      const groupStart = Math.max(
        0,
        Math.min(closestLinePosition - 2, lineIndices.length - 5)
      );
      const nextHoveredIndices = lineIndices
        .slice(groupStart, groupStart + 5)
        .filter(index => {
          const span = spans[index];
          return span.dataset.char.trim() && span.dataset.leet !== span.dataset.char;
        });

      nextHoveredIndices.forEach((index, groupIndex) => {
        if (!hoveredIndices.has(index)) {
          hoveredIndices.add(index);
          setChar(index, 'leet');
          interactionTokenConsumer?.();
        }
        scheduleHoverCorrection(
          index,
          HOVER_RESET_DELAY + groupIndex * HOVER_RESET_STEP
        );
      });
    }

    function clearHover({ stagger = false } = {}) {
      if (isHiding || el.dataset.leetState !== 'ready') return;
      const indices = [...hoveredIndices];
      hoverResetTimers.forEach(id => clearTimeout(id));
      hoverResetTimers.clear();
      hoveredIndices = new Set();
      indices.forEach((index, staggerIndex) => {
        const correct = () => {
          setChar(index, 'plain');
          if (stagger) pulseAccent(index);
          interactionTokenConsumer?.();
        };
        if (stagger) setTimer(correct, staggerIndex * HOVER_RESET_STEP);
        else correct();
      });
    }

    function replayAllLeet({ writeOffset = 0, correctionStartDelay, correctionOffset = 0 } = {}) {
      if (isHiding || el.dataset.leetState !== 'ready') return;
      clearTimers();
      clearAccentTimers();
      hoveredIndices = new Set();
      const animatedIndices = spans
        .map((span, index) => ({ span, index }))
        .filter(({ span }) => span.dataset.char.trim() && span.dataset.leet !== span.dataset.char)
        .map(({ index }) => index);

      if (!animatedIndices.length) return;
      el.dataset.leetState = 'hovering';
      animatedIndices.forEach((index, leetIndex) => {
        setTimer(() => {
          setChar(index, 'leet');
          interactionTokenConsumer?.();
        }, writeOffset + leetIndex * FULL_HOVER_LEET_STEP);
      });

      const correctionStart = Number.isFinite(correctionStartDelay)
        ? correctionStartDelay
        : writeOffset + Math.max(0, animatedIndices.length - 1) * FULL_HOVER_LEET_STEP + FULL_HOVER_DELAY;
      setTimer(() => {
        el.dataset.leetState = 'correcting';
        animatedIndices.forEach((index, correctionIndex) => {
          setTimer(() => {
            setChar(index, 'plain');
            pulseAccent(index, {
              onComplete: correctionIndex === animatedIndices.length - 1
                ? () => { el.dataset.leetState = 'ready'; }
                : undefined
            });
            interactionTokenConsumer?.();
          }, correctionOffset + correctionIndex * FULL_HOVER_CORRECTION_STEP);
        });
      }, correctionStart);
    }

    function showPlain() {
      clearTimers();
      clearAccentTimers();
      cancelSequenceOperations({ finalize: true });
      isHiding = false;
      hoveredIndices = new Set();
      el.dataset.leetState = 'ready';
      delete el.dataset.leetCollapsed;
      spans.forEach((span, index) => {
        sequenceStates[index] = 'corrected';
        setChar(index, 'plain');
        setTone(index);
        span.style.minWidth = '';
        span.style.opacity = '1';
      });
    }

    function getAnimatedCharacterCount() {
      return spans.filter(span => (
        span.dataset.char.trim() && span.dataset.leet !== span.dataset.char
      )).length;
    }

    function setInteractionTokenConsumer(consumer) {
      interactionTokenConsumer = consumer;
    }

    function hide() {
      clearTimers();
      clearAccentTimers();
      cancelSequenceOperations();
      isHiding = true;
      el.dataset.leetState = 'hidden';
      if (suggestionRow) suggestionRow.dataset.suggestionState = 'hidden';
      spans.forEach((span, index) => {
        sequenceStates[index] = 'pending';
        setTimer(() => {
          delete span.dataset.typed;
          span.textContent = '';
          span.style.opacity = '0';
        }, index * HIDE_STEP);
      });
    }

    const fullRolloverTarget = el.closest('.suggestion, .project-card');
    const groupedRolloverTarget = el.closest('.chat-bubble');
    if (fullRolloverTarget) {
      fullRolloverTarget.addEventListener('pointerenter', replayAllLeet);
    } else if (!groupedRolloverTarget) {
      el.addEventListener('pointermove', e => hoverAround(e.clientX, e.clientY));
    }

    const api = {
      el,
      playIn,
      correct,
      playLinesAsLeet,
      replayAllLeet,
      prepareHidden,
      prepareSequenceHidden,
      showPlain,
      hide,
      clearHover,
      setInteractionTokenConsumer,
      getPlayInDuration,
      getLeetWriteDuration,
      getCorrectionDuration,
      getCharacterCount,
      getAnimatedCharacterCount,
      getLastCharacterIndexBefore,
      getLinesPlayDuration,
      getPendingSequenceChunk,
      getPendingSequenceCount,
      getSequenceRect,
      playSequenceChunk,
      finalizeSequenceBefore,
      finalizeActiveSequenceOutside,
      finalizeSequenceIndices,
      requeueSequenceIndices,
      cancelSequenceOperations
    };
    return api;
  }

  stampMessageTimes(document);
  const leetTexts = [...document.querySelectorAll('[data-leet-text]')].map(createLeetText);
  const leetEffectsByRole = {
    ambient: [],
    card: [],
    content: [],
    menu: [],
    topbar: []
  };

  leetTexts.forEach(effect => {
    const role = effect.el.dataset.leetRole
      || (effect.el.closest(".chatbox__options[data-state='expanded']") ? 'menu' : null)
      || (effect.el.closest('.screen') ? 'content' : 'ambient');
    leetEffectsByRole[role].push(effect);
  });

  menuLeetTexts = leetEffectsByRole.menu;
  topbarLeetTexts = leetEffectsByRole.topbar;
  contentLeetTexts = leetEffectsByRole.content;
  cardLeetTexts = leetEffectsByRole.card;
  [...menuLeetTexts, ...topbarLeetTexts, ...contentLeetTexts, ...cardLeetTexts]
    .forEach(effect => effect.setInteractionTokenConsumer(consumeToken));
  [...menuLeetTexts, ...topbarLeetTexts, ...contentLeetTexts]
    .forEach(effect => effect.prepareHidden());
  menuLeetTexts
    .filter(effect => effect.el.classList.contains('chip__keyword'))
    .forEach(effect => effect.showPlain());
  const leetTextByElement = new Map(leetTexts.map(effect => [effect.el, effect]));

  const bubbleHoverWriteStep = readCssNumber('--leet-hover-write-step', 10);
  const bubbleHoverDelay = readCssNumber('--leet-hover-delay', 70);
  const bubbleHoverCorrectionStep = readCssNumber('--leet-hover-correction-step', 10);
  document.querySelectorAll('.chat-bubble').forEach(bubble => {
    const effects = [...bubble.querySelectorAll('.chip__copy > [data-leet-text]')]
      .map(element => leetTextByElement.get(element))
      .filter(Boolean);
    bubble.addEventListener('pointerenter', () => {
      const counts = effects.map(effect => effect.getAnimatedCharacterCount());
      const totalCount = counts.reduce((total, count) => total + count, 0);
      if (!totalCount) return;
      const correctionStartDelay = Math.max(0, totalCount - 1) * bubbleHoverWriteStep
        + bubbleHoverDelay;
      let characterOffset = 0;
      effects.forEach((effect, index) => {
        effect.replayAllLeet({
          writeOffset: characterOffset * bubbleHoverWriteStep,
          correctionStartDelay,
          correctionOffset: characterOffset * bubbleHoverCorrectionStep
        });
        characterOffset += counts[index];
      });
    });
  });

  function playShellLeetTexts() {
    const longestAnimation = Math.max(
      0,
      ...topbarLeetTexts.map(effect => effect.getLeetWriteDuration() + effect.getCorrectionDuration())
    );
    const timingScale = longestAnimation > shellIntroDuration
      ? shellIntroDuration / longestAnimation
      : 1;

    topbarLeetTexts.forEach(effect => {
      effect.playIn({
        timingScale,
        correctionAfterWrite: true,
        onType: consumeToken,
        onCorrect: consumeToken
      });
    });
  }

  function createShellIntro() {
    let state = body.dataset.shellIntro || 'done';

    function play() {
      if (state !== 'playing') return;
      playShellLeetTexts();
      window.setTimeout(() => {
        state = 'done';
        body.dataset.shellIntro = state;
      }, shellIntroDuration);
    }

    return {
      get state() { return state; },
      play
    };
  }

  function playMenuLeetTexts() {
    const sequences = [...document.querySelectorAll(".chatbox__options[data-state='expanded'] .chip")]
      .map(chip => {
        const segments = [...chip.querySelectorAll('.chip__muted[data-leet-text]')]
          .map(el => leetTextByElement.get(el))
          .filter(Boolean);
        return segments.length ? { segments } : null;
      })
      .filter(Boolean);
    const closeLabel = document.querySelector('.menu-btn__label[data-leet-text]');
    const closeLabelEffect = closeLabel ? leetTextByElement.get(closeLabel) : null;
    const isActive = () => body.dataset.menu === 'open' && !isClosingMenu;
    const waitForCascadeStep = () => new Promise(resolve => {
      window.setTimeout(resolve, menuLeetCascadeStep);
    });

    async function writeBubble({ segments }) {
      if (!isActive()) return false;
      for (const effect of segments) {
        const result = await effect.playIn({
          growFromEmpty: true,
          deferCorrection: true,
          timingScale: menuLeetTimingScale,
          onType: consumeToken
        });
        if (!result.completed || !isActive()) return false;
      }
      return true;
    }

    async function correctBubble({ segments }) {
      if (!isActive()) return false;
      for (const effect of segments) {
        const result = await effect.correct({
          timingScale: menuLeetTimingScale,
          onCorrect: consumeToken
        });
        if (!result.completed || !isActive()) return false;
      }
      return true;
    }

    async function runCascade(operation) {
      const pending = [];
      for (const [index, item] of sequences.entries()) {
        if (!isActive()) return false;
        pending.push(operation(item));
        if (index < sequences.length - 1) await waitForCascadeStep();
      }
      const results = await Promise.all(pending);
      return results.every(Boolean) && isActive();
    }

    const sequence = (async () => {
      const writingCompleted = await runCascade(writeBubble);
      if (!writingCompleted) return false;
      return runCascade(correctBubble);
    })();

    if (closeLabelEffect) {
      setMenuTimer(() => {
        if (!isActive()) return;
        closeLabelEffect.playIn({
          growFromEmpty: true,
          correctionAfterWrite: true,
          onType: consumeToken,
          onCorrect: consumeToken
        });
      }, menuLabelRevealDelay);
    }

    return sequence;
  }

  function clampPageTiming(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function compareDocumentOrder(first, second) {
    if (first === second) return 0;
    return first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING
      ? -1
      : 1;
  }

  function getPageRevealViewport() {
    const shellHeader = document.querySelector('.site-header');
    const headerRect = shellHeader?.getBoundingClientRect();
    const chatboxRect = viewportBoundaryElement?.getBoundingClientRect();
    const top = headerRect && headerRect.bottom > 0
      ? Math.min(window.innerHeight, Math.max(0, headerRect.bottom))
      : 0;
    const bottom = chatboxRect
      && chatboxRect.top > top
      && chatboxRect.top < window.innerHeight
      ? chatboxRect.top
      : window.innerHeight;
    return {
      top,
      bottom: Math.max(top, bottom),
      left: 0,
      right: window.innerWidth
    };
  }

  function isPageRevealRectVisible(rect, viewport, { fully = false } = {}) {
    if (!rect || rect.height <= 0 || rect.width < 0) return false;
    const verticallyVisible = fully
      ? rect.top >= viewport.top - 0.5 && rect.bottom <= viewport.bottom + 0.5
      : rect.bottom > viewport.top && rect.top < viewport.bottom;
    return verticallyVisible
      && rect.right > viewport.left
      && rect.left < viewport.right;
  }

  function comparePageRevealCandidates(first, second) {
    const topDifference = first.orderTop - second.orderTop;
    if (Math.abs(topDifference) > pageRevealRowTolerance) return topDifference;
    const leftDifference = first.orderLeft - second.orderLeft;
    if (Math.abs(leftDifference) > 1) return leftDifference;
    return compareDocumentOrder(first.anchor, second.anchor);
  }

  function getDocumentLayoutPoint(element) {
    let top = 0;
    let left = 0;
    let current = element;
    while (current instanceof HTMLElement) {
      top += current.offsetTop;
      left += current.offsetLeft;
      current = current.offsetParent;
    }
    let ancestor = element.parentElement;
    while (ancestor && ancestor !== document.body && ancestor !== document.documentElement) {
      top -= ancestor.scrollTop;
      left -= ancestor.scrollLeft;
      ancestor = ancestor.parentElement;
    }
    return { top, left };
  }

  function getTextChunkTiming(effect, characterCount) {
    const fontSize = parseFloat(getComputedStyle(effect.el).fontSize)
      || pageLeetTiming.fontReferenceSize;
    const count = Math.max(1, characterCount);
    const fontFactor = clampPageTiming(
      Math.sqrt(fontSize / pageLeetTiming.fontReferenceSize),
      pageLeetTiming.minimumFontFactor,
      pageLeetTiming.maximumFontFactor
    );
    const contentFactor = Math.sqrt(count) * fontFactor;
    return {
      characterCount: count,
      fontSize,
      writeDuration: clampPageTiming(
        pageLeetTiming.writeBaseDuration
          + contentFactor * pageLeetTiming.writeCharacterFactor,
        pageLeetTiming.minimumWriteDuration,
        pageLeetTiming.maximumWriteDuration
      ),
      correctionDuration: clampPageTiming(
        pageLeetTiming.correctionBaseDuration
          + contentFactor * pageLeetTiming.correctionCharacterFactor,
        pageLeetTiming.minimumCorrectionDuration,
        pageLeetTiming.maximumCorrectionDuration
      )
    };
  }

  function getPageRevealComponentElements(activeScreen) {
    if (!activeScreen) return [];
    const selectors = [
      '.project-card',
      '[data-reveal-in-sequence]',
      '.page-logo--mobile',
      '.top-bar--conversation .back-button',
      '[data-assistant-avatar]',
      '[data-message-actions]',
      '.suggestion'
    ].join(', ');
    return [...new Set(activeScreen.querySelectorAll(selectors))];
  }

  function getPageRevealComponentDuration(element) {
    if (element.matches('.project-card, [data-reveal-in-sequence]')) {
      return projectCardRevealDuration;
    }
    if (element.matches('[data-message-actions]')) return 480;
    if (element.matches('[data-assistant-avatar]')) return 250;
    return pageRevealComponentDuration;
  }

  function createPageRevealScheduler(screenName, activeScreen, activeEffects) {
    const sequenceVersion = pageSequenceVersion;
    const componentElements = getPageRevealComponentElements(activeScreen);
    const components = componentElements.map((element, index) => ({
      element,
      index,
      effects: [],
      imageHandles: new Set(),
      state: 'pending'
    }));
    const componentsByElement = new Map(
      components.map(component => [component.element, component])
    );
    const effectOwners = new Map();
    activeEffects.forEach(effect => {
      const ownerElement = effect.el.closest(
        '.project-card, [data-reveal-in-sequence], .suggestion, [data-message-actions]'
      );
      const owner = componentsByElement.get(ownerElement);
      if (!owner) return;
      owner.effects.push(effect);
      effectOwners.set(effect, owner);
    });

    const timingPlan = {
      screenName,
      mode: 'ordered-cascade',
      items: [],
      get characterCount() {
        return this.items.reduce((total, item) => (
          total + (item.characterCount || 0)
        ), 0);
      },
      get writeDuration() {
        return this.items.reduce((total, item) => (
          total + (item.writeDuration || item.entryDuration || 0)
        ), 0);
      },
      get correctionDuration() {
        return this.items.reduce((total, item) => (
          total + (item.correctionDuration || 0)
        ), 0);
      },
      get totalDuration() {
        return this.writeDuration + this.correctionDuration;
      }
    };
    const schedulerTimers = new Map();
    const imageHandles = new Set();
    const carouselListeners = new Map();
    let destroyed = false;
    let frame = null;
    let current = null;
    let lastScrollY = window.scrollY;

    const isActive = () => !destroyed
      && body.dataset.screen === screenName
      && pageSequenceVersion === sequenceVersion;

    function waitForEntry(duration) {
      return new Promise(resolve => {
        const id = window.setTimeout(() => {
          schedulerTimers.delete(id);
          resolve(true);
        }, Math.max(0, duration));
        schedulerTimers.set(id, resolve);
      });
    }

    function setComponentState(component, state) {
      component.state = state;
      component.element.dataset.revealState = state;
    }

    function revealComponentUi(component) {
      const { element } = component;
      if (element.matches('[data-assistant-avatar]')) {
        element.dataset.assistantAvatarState = 'visible';
      }
      if (element.matches('[data-message-actions]')) {
        element.dataset.messageActionsState = 'visible';
        element.dataset.messageActionsCorrected = 'false';
        element.querySelectorAll('.message-action').forEach(action => {
          delete action.dataset.messageActionCorrected;
        });
      }
      if (element.matches('.suggestion')) {
        element.dataset.suggestionState = 'appearing';
        delete element.dataset.suggestionIconCorrected;
      }
    }

    function completeComponentTextUi(component) {
      const { element } = component;
      if (element.matches('[data-message-actions]')) {
        element.dataset.messageActionsCorrected = 'true';
        element.querySelectorAll('.message-action').forEach(action => {
          action.dataset.messageActionCorrected = 'true';
        });
      }
      if (element.matches('.suggestion')) {
        element.dataset.suggestionIconCorrected = 'true';
      }
    }

    function registerImageHandle(component, handle) {
      if (!handle?.cancel) return;
      component.imageHandles.add(handle);
      imageHandles.add(handle);
      handle.completed?.finally(() => {
        component.imageHandles.delete(handle);
        imageHandles.delete(handle);
      });
    }

    function startVisibleComponentImages(component, viewport = getPageRevealViewport()) {
      const images = [...component.element.querySelectorAll('img[data-pixel-reveal]')];
      images.forEach(imageElement => {
        if (imageElement.dataset.pixelState === 'revealing'
          || imageElement.dataset.pixelState === 'complete') return;
        if (component.element.matches('[data-media-carousel]')) {
          const rect = imageElement.getBoundingClientRect();
          const visibleWidth = Math.max(
            0,
            Math.min(rect.right, viewport.right) - Math.max(rect.left, viewport.left)
          );
          const horizontalRatio = rect.width > 0 ? visibleWidth / rect.width : 0;
          if (!isPageRevealRectVisible(rect, viewport) || horizontalRatio < 0.6) {
            return;
          }
        }
        const handle = globalThis.portfolioProjectImages?.start(imageElement, {
          stagger: false
        });
        registerImageHandle(component, handle);
      });
    }

    function finalizeComponentPlain(component) {
      if (component.state === 'revealed') return;
      setComponentState(component, 'revealed');
      revealComponentUi(component);
      component.effects.forEach(effect => effect.showPlain());
      completeComponentTextUi(component);
      const handle = globalThis.portfolioProjectImages?.start(
        component.element,
        { stagger: false }
      );
      handle?.cancel?.();
    }

    function prepareComponent(component) {
      const { element } = component;
      element.dataset.pageRevealComponent = '';
      setComponentState(component, 'pending');
      if (element.matches('[data-assistant-avatar]')) {
        element.dataset.assistantAvatarState = 'hidden';
      }
      if (element.matches('[data-message-actions]')) {
        element.dataset.messageActionsState = 'hidden';
        element.dataset.messageActionsCorrected = 'false';
        element.querySelectorAll('.message-action').forEach(action => {
          delete action.dataset.messageActionCorrected;
        });
      }
      if (element.matches('.suggestion')) {
        element.dataset.suggestionState = 'hidden';
        delete element.dataset.suggestionIconCorrected;
      }
    }

    function getCandidateRecord(kind, anchor, rect, details = {}) {
      return {
        kind,
        anchor,
        rect,
        orderTop: rect.top + window.scrollY,
        orderLeft: rect.left + window.scrollX,
        ...details
      };
    }

    function finalizePassedContent(viewport, scrollingDown) {
      if (!scrollingDown) return;
      components.forEach(component => {
        if (component.state !== 'pending') return;
        const rect = component.element.getBoundingClientRect();
        if (rect.height > 0 && rect.bottom <= viewport.top) {
          finalizeComponentPlain(component);
        }
      });
      activeEffects.forEach(effect => {
        const owner = effectOwners.get(effect);
        if (owner?.state === 'pending') return;
        effect.finalizeSequenceBefore(viewport.top);
      });
    }

    function collectCandidates(viewport) {
      const candidates = [];
      components.forEach(component => {
        if (component.state !== 'pending') return;
        const rect = component.element.getBoundingClientRect();
        if (!isPageRevealRectVisible(rect, viewport)) return;
        const orderPoint = getDocumentLayoutPoint(component.element);
        candidates.push(getCandidateRecord(
          'component',
          component.element,
          rect,
          {
            component,
            orderTop: orderPoint.top,
            orderLeft: orderPoint.left
          }
        ));
      });
      activeEffects.forEach(effect => {
        const owner = effectOwners.get(effect);
        if (owner && owner.state !== 'revealed') return;
        const chunk = effect.getPendingSequenceChunk(viewport);
        if (!chunk) return;
        candidates.push(getCandidateRecord(
          'text',
          effect.el,
          chunk.rect,
          { effect, indices: chunk.indices, owner }
        ));
      });
      return candidates.sort(comparePageRevealCandidates);
    }

    function recordTextTiming(candidate, timing, owner = null) {
      const item = {
        type: owner ? 'component-text' : 'text',
        element: candidate.effect.el,
        owner: owner?.element || null,
        top: candidate.rect.top + window.scrollY,
        left: candidate.rect.left,
        characterCount: timing.characterCount,
        fontSize: timing.fontSize,
        writeDuration: timing.writeDuration,
        correctionDuration: timing.correctionDuration,
        state: 'writing'
      };
      timingPlan.items.push(item);
      return item;
    }

    function startTextOperation(effect, indices, rect, owner = null) {
      const timing = getTextChunkTiming(effect, indices.length);
      const item = recordTextTiming({ effect, rect }, timing, owner);
      const operation = effect.playSequenceChunk(indices, {
        writeDuration: timing.writeDuration,
        correctionDuration: timing.correctionDuration,
        onType: consumeToken,
        onCorrect: consumeToken
      });
      operation.write.then(result => {
        item.state = result.completed ? 'written' : 'cancelled';
      });
      operation.correction.then(result => {
        item.state = result.completed ? 'corrected' : item.state;
        if (owner && result.completed) completeComponentTextUi(owner);
      });
      return operation;
    }

    async function runTextCandidate(candidate) {
      const operation = startTextOperation(
        candidate.effect,
        candidate.indices,
        candidate.rect,
        candidate.owner
      );
      current = { ...candidate, operation };
      await operation.write;
      if (!isActive() || current?.operation !== operation) return;
      current = null;
      requestRefresh();
    }

    async function runComponentCandidate(candidate) {
      const { component } = candidate;
      setComponentState(component, 'revealing');
      revealComponentUi(component);
      startVisibleComponentImages(component);
      const entryDuration = getPageRevealComponentDuration(component.element);
      const item = {
        type: 'component',
        element: component.element,
        top: candidate.orderTop,
        left: candidate.orderLeft,
        entryDuration,
        state: 'revealing'
      };
      timingPlan.items.push(item);
      const viewport = getPageRevealViewport();
      const textOperations = component.effects
        .map(effect => ({
          effect,
          chunk: effect.getPendingSequenceChunk(viewport, {
            allVisibleLines: true
          })
        }))
        .filter(entry => entry.chunk)
        .sort((first, second) => comparePageRevealCandidates(
          getCandidateRecord('text', first.effect.el, first.chunk.rect),
          getCandidateRecord('text', second.effect.el, second.chunk.rect)
        ))
        .map(entry => startTextOperation(
          entry.effect,
          entry.chunk.indices,
          entry.chunk.rect,
          component
        ));
      current = { ...candidate, textOperations };
      await Promise.all([
        waitForEntry(entryDuration),
        ...textOperations.map(operation => operation.write)
      ]);
      if (!isActive() || current?.component !== component) return;
      setComponentState(component, 'revealed');
      item.state = 'revealed';
      if (!textOperations.length) completeComponentTextUi(component);
      current = null;
      requestRefresh();
    }

    function pump() {
      if (!isActive() || current) return;
      const viewport = getPageRevealViewport();
      const candidates = collectCandidates(viewport);
      const candidate = candidates[0];
      if (!candidate) return;
      if (candidate.kind === 'component') runComponentCandidate(candidate);
      else runTextCandidate(candidate);
    }

    function refresh() {
      frame = null;
      if (!isActive()) return;
      const viewport = getPageRevealViewport();
      const scrollingDown = window.scrollY >= lastScrollY;
      finalizePassedContent(viewport, scrollingDown);
      if (current?.kind === 'text') {
        const rect = current.effect.getSequenceRect(current.indices);
        if (!isPageRevealRectVisible(rect, viewport, { fully: true })) {
          const passed = scrollingDown && rect.bottom <= viewport.top;
          current.operation.cancel({ finalize: passed });
          current = null;
        }
      }
      activeEffects.forEach(effect => {
        effect.finalizeActiveSequenceOutside(viewport);
      });
      lastScrollY = window.scrollY;
      pump();
    }

    function requestRefresh() {
      if (!isActive() || frame !== null) return;
      frame = window.requestAnimationFrame(refresh);
    }

    function onCarouselScroll(component) {
      if (!['revealing', 'revealed'].includes(component.state)) return;
      startVisibleComponentImages(component);
    }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null;
      window.removeEventListener('scroll', requestRefresh);
      window.removeEventListener('resize', requestRefresh);
      schedulerTimers.forEach((resolve, id) => {
        window.clearTimeout(id);
        resolve(false);
      });
      schedulerTimers.clear();
      carouselListeners.forEach((listener, track) => {
        track.removeEventListener('scroll', listener);
      });
      carouselListeners.clear();
      current?.operation?.cancel({ finalize: false });
      current?.textOperations?.forEach(operation => {
        operation.cancel({ finalize: false });
      });
      activeEffects.forEach(effect => effect.cancelSequenceOperations());
      imageHandles.forEach(handle => handle.cancel());
      imageHandles.clear();
    }

    components.forEach(prepareComponent);
    activeScreen.querySelectorAll('[data-reveal-on-scroll]').forEach(group => {
      if (!componentsByElement.has(group)) delete group.dataset.revealState;
    });
    components.forEach(component => {
      const track = component.element.querySelector('[data-media-carousel-track]');
      if (!track) return;
      const listener = () => onCarouselScroll(component);
      carouselListeners.set(track, listener);
      track.addEventListener('scroll', listener, { passive: true });
    });
    window.addEventListener('scroll', requestRefresh, { passive: true });
    window.addEventListener('resize', requestRefresh);
    document.fonts?.ready?.then(requestRefresh);
    requestRefresh();

    return {
      destroy,
      refresh: requestRefresh,
      timingPlan
    };
  }

  function playScreenLeetTexts(screenName) {
    invalidatePageSequences();
    const activeScreen = screensByName.get(screenName);
    if (!activeScreen) return null;
    const activeEffects = [...contentLeetTexts, ...cardLeetTexts]
      .filter(effect => (
        effect.el.closest('.screen')?.dataset.screenName === screenName
      ));
    [...contentLeetTexts, ...cardLeetTexts].forEach(effect => {
      if (activeEffects.includes(effect)) effect.prepareSequenceHidden();
      else effect.prepareHidden();
    });

    if (prefersReducedMotion) {
      activeEffects.forEach(effect => effect.showPlain());
      activeScreen.querySelectorAll(
        '[data-reveal-on-scroll], .project-card, [data-reveal-in-sequence]'
      ).forEach(group => {
        group.dataset.revealState = 'revealed';
      });
      activeScreen.querySelectorAll('[data-page-reveal-component]').forEach(component => {
        component.dataset.revealState = 'revealed';
      });
      activeScreen.querySelectorAll('[data-message-actions]').forEach(actions => {
        actions.dataset.messageActionsState = 'visible';
        actions.dataset.messageActionsCorrected = 'true';
        actions.querySelectorAll('.message-action').forEach(action => {
          action.dataset.messageActionCorrected = 'true';
        });
      });
      activeScreen.querySelectorAll('[data-suggestion-state]').forEach(suggestion => {
        suggestion.dataset.suggestionState = 'appearing';
        suggestion.dataset.suggestionIconCorrected = 'true';
      });
      activeScreen.querySelectorAll('[data-assistant-avatar]').forEach(avatar => {
        avatar.dataset.assistantAvatarState = 'visible';
      });
      pageLeetTimingPlans.set(screenName, {
        screenName,
        mode: 'reduced-motion',
        items: []
      });
      return null;
    }

    pageRevealScheduler = createPageRevealScheduler(
      screenName,
      activeScreen,
      activeEffects
    );
    pageLeetTimingPlans.set(screenName, pageRevealScheduler.timingPlan);
    return pageRevealScheduler;
  }

  function consumeToken(amount = 1) {
    if (isDesignSystemPreview) return;
    tokenCounter?.spend(Number.isFinite(amount) ? amount : 1);
  }

  function createTokenCounter(el) {
    if (!el) return null;

    const target = Number(el.dataset.tokenTarget);
    let persistTimer = null;
    let queuedSpend = 0;
    let hasStarted = false;
    let shouldPersist = true;

    function readStoredBalance() {
      try {
        const storedValue = localStorage.getItem(tokenStorageKey);
        if (storedValue === null) return null;
        const parsedValue = Number(storedValue);
        if (!Number.isFinite(parsedValue) || parsedValue < 0) return null;
        return Math.min(target, Math.floor(parsedValue));
      } catch {
        return null;
      }
    }

    const storedBalance = readStoredBalance();
    const wasRestored = storedBalance !== null;
    let balance = storedBalance ?? 0;
    let isReady = wasRestored;

    const format = value => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const render = () => {
      el.textContent = format(balance);
    };

    function persist() {
      if (persistTimer !== null) {
        window.clearTimeout(persistTimer);
        persistTimer = null;
      }
      if (!shouldPersist) return;
      try {
        localStorage.setItem(tokenStorageKey, String(balance));
      } catch {
        // Storage can be unavailable in restricted or private contexts.
      }
    }

    function schedulePersist() {
      if (persistTimer !== null) window.clearTimeout(persistTimer);
      persistTimer = window.setTimeout(persist, tokenPersistDelay);
    }

    function spend(amount = 1) {
      const spendAmount = Math.max(0, Math.floor(amount));
      if (!isReady) {
        queuedSpend += spendAmount;
        return;
      }
      shouldPersist = true;
      balance = Math.max(0, balance - spendAmount);
      render();
      schedulePersist();
    }

    function start({ onComplete } = {}) {
      if (hasStarted) {
        if (onComplete) onComplete({ restored: wasRestored });
        return;
      }
      hasStarted = true;
      if (isReady) {
        render();
        if (onComplete) onComplete({ restored: true });
        return;
      }
      balance = target;
      const startTime = performance.now();
      const easeOut = progress => 1 - Math.pow(1 - progress, 3);

      const tick = now => {
        const progress = Math.min(1, (now - startTime) / tokenCounterDuration);
        el.textContent = format(Math.round(target * easeOut(progress)));
        if (progress < 1) {
          requestAnimationFrame(tick);
          return;
        }
        isReady = true;
        spend(queuedSpend);
        queuedSpend = 0;
        persist();
        if (onComplete) onComplete({ restored: false });
      };

      requestAnimationFrame(tick);
    }

    function reset() {
      if (persistTimer !== null) window.clearTimeout(persistTimer);
      persistTimer = null;
      queuedSpend = 0;
      balance = target;
      isReady = true;
      shouldPersist = false;
      render();
      try {
        localStorage.removeItem(tokenStorageKey);
      } catch {
        // Keep the in-memory reset when storage is unavailable.
      }
    }

    if (isReady) render();
    window.addEventListener('pagehide', persist);

    return {
      get balance() { return balance; },
      get isReady() { return isReady; },
      reset,
      spend,
      start
    };
  }

  tokenCounter = createTokenCounter(document.querySelector('[data-token-counter]'));
  shellIntro = createShellIntro();
  setupViewportTopFade();
  setupMobileHeaderVisibility();

  requestAnimationFrame(() => {
    leetTexts
      .filter(effect => !menuLeetTexts.includes(effect) && !contentLeetTexts.includes(effect) && !topbarLeetTexts.includes(effect) && !cardLeetTexts.includes(effect))
      .forEach(effect => effect.playIn());

    const initialScreenName = getScreenNameFromLocation();
    const initialScreen = screensByName.get(initialScreenName);
    const usesShellIntro = initialScreen?.dataset.pageIntro === 'shell';
    navStack.splice(0, navStack.length, initialScreenName);
    syncRoute(initialScreenName, { replace: true });
    showScreen(initialScreenName, {
      animate: false,
      scroll: false,
      preservePendingState: usesShellIntro
    });

    const startInitialPage = ({ restored = true } = {}) => {
      const startDelay = usesShellIntro && !restored
        ? firstPageTextStartDelay
        : 0;
      window.setTimeout(() => {
        if (body.dataset.screen !== initialScreenName) return;
        delete body.dataset.pageTextPending;
        playScreenLeetTexts(initialScreenName);
      }, startDelay);
    };

    shellIntro.play();
    if (usesShellIntro) {
      if (tokenCounter) tokenCounter.start({ onComplete: startInitialPage });
      else startInitialPage();
    } else {
      startInitialPage();
      tokenCounter?.start();
    }
  });

  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    const screenName = getScreenNameFromLocation();
    const activeScreen = screensByName.get(screenName);
    invalidatePageSequences();
    if (activeScreen?.querySelector('[data-pixel-reveal]')) {
      globalThis.portfolioProjectImages?.replay(activeScreen);
    }
    window.requestAnimationFrame(() => {
      if (body.dataset.screen === screenName) playScreenLeetTexts(screenName);
    });
  });

  globalThis.portfolioTextEffects = {
    leetTexts,
    roles: leetEffectsByRole,
    defaultPageTiming: pageLeetTiming,
    getTimingPlan(screenName = body.dataset.screen) {
      return pageLeetTimingPlans.get(screenName) || null;
    },
    playScreen: playScreenLeetTexts,
    hideAllLeetText() {
      leetTexts.forEach(effect => effect.hide());
    }
  };
  globalThis.portfolioExperience = {
    tokenCounter,
    shellIntro,
    spendTokens: consumeToken
  };
})();
