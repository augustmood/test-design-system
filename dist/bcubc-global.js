/*
 * Blockchain@UBC -- UBC CMS "Global Javascript Editor" contents.
 *
 * Paste this file into the CMS panel: wp-admin top bar -> (site settings) ->
 * Global Javascript Editor. Save. No Delete Cache needed for JS (not page-
 * cached).
 *
 * What this script does:
 *   1. Rebuilds Research Talks listing rows from a pipe-delimited plain-text
 *      excerpt into 3 classed <span>s (UBC CMS strips HTML from excerpts).
 *   2. Rebuilds Research Papers listing rows from a 5-field pipe-delimited
 *      excerpt into 5 classed <span>s with explicit grid-column placement.
 *   3. Auto-marks the active item in any per-section sidebar nav based on
 *      the current URL, so each landing page highlights its own item in
 *      the "OUR RESEARCH" / "ABOUT" / etc. widget.
 *
 * Each block self-scopes -- it short-circuits if its target selectors
 * aren't on the page, so it's safe to run site-wide on every URL.
 *
 * --------------------------------------------------------------------
 * Excerpt formats:
 *
 * Research Talks (each child of /research/research-talks/):
 *   Name(s)|/people/slug/|Mar 24, 2026|https://youtu.be/VIDEO_ID
 *     Field 1 -- researcher name(s)
 *     Field 2 -- researcher detail page URL (empty = no link)
 *     Field 3 -- date of talk
 *     Field 4 -- external talk URL (empty = no Link cell)
 *
 * Research Papers (each child of /research/research-papers/):
 *   ID|Researchers|Date|Tags|PaperURL
 *     Field 1 -- ID number (e.g. "153")
 *     Field 2 -- researcher names, comma-joined (plain text, no per-name link)
 *     Field 3 -- date of publication (e.g. "Apr 22, 2024")
 *     Field 4 -- research area tags, comma-joined (or empty)
 *     Field 5 -- external paper URL (empty = no Link cell)
 * --------------------------------------------------------------------
 */

(function () {

  // ---------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------
  function makeSpan(cls) {
    var s = document.createElement('span');
    s.className = cls;
    return s;
  }

  function makeLink(href, text) {
    var a = document.createElement('a');
    a.href = href;
    a.textContent = text;
    return a;
  }

  function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  // ---------------------------------------------------------------
  // 1. Research Talks listing -- 3-span rebuild
  // ---------------------------------------------------------------
  function rebuildTalksRows() {
    var excerpts = document.querySelectorAll(
      '.bcubc-talks-list .wp-block-post-excerpt__excerpt'
    );
    if (!excerpts.length) return;

    excerpts.forEach(function (p) {
      var text = (p.textContent || '').trim();
      if (!text || text.indexOf('|') === -1) return;

      var parts = text.split('|').map(function (s) { return s.trim(); });
      var name    = parts[0] || '';
      var nameUrl = parts[1] || '';
      var date    = parts[2] || '';
      var talkUrl = parts[3] || '';

      clear(p);

      var researcherSpan = makeSpan('bcubc-talks-list__researcher');
      if (nameUrl) {
        researcherSpan.appendChild(makeLink(nameUrl, name));
      } else {
        researcherSpan.textContent = name;
      }
      p.appendChild(researcherSpan);

      var dateSpan = makeSpan('bcubc-talks-list__date');
      dateSpan.textContent = date;
      p.appendChild(dateSpan);

      var linkSpan = makeSpan('bcubc-talks-list__link');
      if (talkUrl) linkSpan.appendChild(makeLink(talkUrl, 'Link'));
      p.appendChild(linkSpan);
    });
  }

  // ---------------------------------------------------------------
  // 2. Research Papers listing -- 5-span rebuild
  // ---------------------------------------------------------------
  function rebuildPapersRows() {
    var excerpts = document.querySelectorAll(
      '.bcubc-papers-list .wp-block-post-excerpt__excerpt'
    );
    if (!excerpts.length) return;

    excerpts.forEach(function (p) {
      var text = (p.textContent || '').trim();
      if (!text || text.indexOf('|') === -1) return;

      var parts = text.split('|').map(function (s) { return s.trim(); });
      var id          = parts[0] || '';
      var researchers = parts[1] || '';
      var date        = parts[2] || '';
      var tags        = parts[3] || '';
      var paperUrl    = parts[4] || '';

      clear(p);

      var idSpan = makeSpan('bcubc-papers-list__id');
      idSpan.textContent = id;
      p.appendChild(idSpan);

      var researcherSpan = makeSpan('bcubc-papers-list__researchers');
      researcherSpan.textContent = researchers;
      p.appendChild(researcherSpan);

      var dateSpan = makeSpan('bcubc-papers-list__date');
      dateSpan.textContent = date;
      p.appendChild(dateSpan);

      var tagsSpan = makeSpan('bcubc-papers-list__tags');
      tagsSpan.textContent = tags;
      p.appendChild(tagsSpan);

      var linkSpan = makeSpan('bcubc-papers-list__link');
      if (paperUrl) linkSpan.appendChild(makeLink(paperUrl, 'Read the Research Paper'));
      p.appendChild(linkSpan);
    });
  }

  // ---------------------------------------------------------------
  // 3. Section sidebar nav -- auto-active by URL match
  // ---------------------------------------------------------------
  // For each `.bcubc-page-sidebar-nav__link` and `__sublink`, if its
  // href matches the current pathname (prefix-match so a parent like
  // /research/research-papers/ also wins on child detail pages like
  // /research/research-papers/foo/), add `is-active` so the existing
  // CSS highlights it (navy bg + white text). The longest matching
  // href wins -- prevents "Research" staying active on a "Research
  // Papers" page when both are in the nav, and prevents "Venture
  // Building" staying active when on its child like Find Customer Info.
  //
  // Also clears any pre-existing `is-active` from theme-applied state
  // first, so the theme's prefix-matcher (which highlights any
  // ancestor) doesn't end up co-active with the longest match found
  // here. Targets both the `<a>` and its parent `<li>` since the CSS
  // accepts either.
  function highlightActiveNavItem() {
    var links = document.querySelectorAll(
      '.bcubc-page-sidebar-nav__link[href], .bcubc-page-sidebar-nav__sublink[href]'
    );
    if (!links.length) return;

    var path = window.location.pathname;
    var bestLink = null;
    var bestLen = 0;

    links.forEach(function (a) {
      // Clear any theme- or prior-run-applied active state.
      a.classList.remove('is-active');
      var li = a.closest('li');
      if (li) li.classList.remove('is-active');

      var href = a.getAttribute('href');
      if (!href) return;
      // Normalize -- compare paths only (ignore protocol/host).
      var hrefPath = href;
      if (hrefPath.indexOf('://') !== -1) {
        try { hrefPath = new URL(href, window.location.origin).pathname; }
        catch (e) { return; }
      }
      if (path.indexOf(hrefPath) === 0 && hrefPath.length > bestLen) {
        bestLink = a;
        bestLen = hrefPath.length;
      }
    });

    if (bestLink) bestLink.classList.add('is-active');
  }

  // ---------------------------------------------------------------
  // Latest Updates sidebar widget
  //
  // UBC CMS's Primary widget area only accepts CLF Section widgets
  // (HTML field, no block embedding) so we can't drop a wp:query into
  // it. Instead the widget HTML is a shell:
  //
  //   <section class="bcubc-sidebar-latest"
  //            data-bcubc-latest-updates
  //            data-parents="3360,3363"
  //            data-per-page="3">
  //     <h3 class="bcubc-sidebar-latest__heading">Latest Updates</h3>
  //     <ol class="bcubc-sidebar-latest__list"></ol>
  //   </section>
  //
  // This function fetches the N most recent child Pages of the listed
  // parent IDs via the WP REST API (/wp-json/wp/v2/pages) and injects
  // the rendered <li> rows. data-parents = comma-separated parent post
  // IDs (defaults to 3360,3363 = newsletters + stories); data-per-page
  // = how many items to show (defaults to 3). Self-scopes -- if no
  // matching container is on the page, no fetch happens.
  // ---------------------------------------------------------------
  function populateLatestUpdates() {
    var containers = document.querySelectorAll('[data-bcubc-latest-updates]');
    if (!containers.length) return;

    containers.forEach(function (container) {
      var parents  = (container.dataset.parents  || '3360,3363').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      var perPage  = parseInt(container.dataset.perPage || '3', 10);
      var list     = container.querySelector('.bcubc-sidebar-latest__list');
      if (!list || !parents.length) return;

      var params = new URLSearchParams();
      params.set('per_page', String(perPage));
      params.set('orderby', 'date');
      params.set('order', 'desc');
      params.set('_fields', 'id,date,title,link');
      parents.forEach(function (id) { params.append('parent[]', id); });

      fetch('/wp-json/wp/v2/pages?' + params.toString())
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (items) {
          if (!Array.isArray(items) || !items.length) return;

          clear(list);
          items.forEach(function (item) {
            var li = document.createElement('li');
            li.className = 'bcubc-sidebar-latest__item';

            var date = document.createElement('div');
            date.className = 'bcubc-sidebar-latest__date';
            date.textContent = new Date(item.date).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric'
            });
            li.appendChild(date);

            var h4 = document.createElement('h4');
            h4.className = 'bcubc-sidebar-latest__title';
            var a  = document.createElement('a');
            // Use pathname so the link works on any host (avoid hard-coded
            // staging vs production domain in the rendered href).
            try {
              a.href = new URL(item.link).pathname;
            } catch (e) {
              a.href = item.link;
            }
            // title.rendered is HTML-encoded plain text from WP -- safe to set
            // via innerHTML for the &amp; etc. to render correctly.
            a.innerHTML = item.title && item.title.rendered ? item.title.rendered : '';
            h4.appendChild(a);
            li.appendChild(h4);

            list.appendChild(li);
          });
        })
        .catch(function (err) {
          if (window.console) console.warn('Latest Updates fetch failed:', err);
        });
    });
  }


  // ---------------------------------------------------------------
  // Recent Publications sidebar widget
  //
  // Same shell-based approach as populateLatestUpdates() above, but for
  // the homepage sidebar's Recent Publications block. Fetches the N
  // most recent child Pages of the Research Papers parent (default 3248)
  // and renders one .bcubc-publications__item per paper.
  //
  // Each research paper page's Excerpt field is the 5-field pipe-
  // delimited string used by the Research Papers listing table:
  //   ID|Researchers|Date|Tags|PaperURL
  // For the sidebar widget we only need fields 2 (Researchers), 3 (Date)
  // and 5 (PaperURL); ID and Tags are dropped.
  //
  // Widget HTML shape (in home-sidebar.html):
  //
  //   <section class="bcubc-publications"
  //            data-bcubc-recent-publications
  //            data-parents="3248"
  //            data-per-page="3">
  //     <h3 class="bcubc-section-heading">Recent Publications</h3>
  //     <div class="bcubc-publications__list"></div>
  //     <div class="wp-block-buttons bcubc-publications__cta">...</div>
  //   </section>
  //
  // Self-scopes -- if no [data-bcubc-recent-publications] container is
  // on the page, no fetch happens.
  // ---------------------------------------------------------------
  function populateRecentPublications() {
    var containers = document.querySelectorAll('[data-bcubc-recent-publications]');
    if (!containers.length) return;

    containers.forEach(function (container) {
      var parents  = (container.dataset.parents  || '3248').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      var perPage  = parseInt(container.dataset.perPage || '3', 10);
      var list     = container.querySelector('.bcubc-publications__list');
      if (!list || !parents.length) return;

      var params = new URLSearchParams();
      params.set('per_page', String(perPage));
      params.set('orderby', 'date');
      params.set('order', 'desc');
      params.set('_fields', 'id,date,title,link,excerpt');
      parents.forEach(function (id) { params.append('parent[]', id); });

      fetch('/wp-json/wp/v2/pages?' + params.toString())
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (items) {
          if (!Array.isArray(items) || !items.length) return;

          clear(list);
          items.forEach(function (item) {
            // Strip HTML from excerpt to get the raw pipe-delimited string.
            var rawExcerpt = (item.excerpt && item.excerpt.rendered) || '';
            var tmp = document.createElement('div');
            tmp.innerHTML = rawExcerpt;
            var text = (tmp.textContent || '').trim();
            var parts = text.split('|').map(function (s) { return s.trim(); });
            var researchers = parts[1] || '';
            var date        = parts[2] || '';
            var paperUrl    = parts[4] || '';

            var div = document.createElement('div');
            div.className = 'bcubc-publications__item';

            var titleA = document.createElement('a');
            titleA.className = 'bcubc-publications__title';
            try {
              titleA.href = new URL(item.link).pathname;
            } catch (e) {
              titleA.href = item.link;
            }
            titleA.innerHTML = (item.title && item.title.rendered) || '';
            div.appendChild(titleA);

            if (researchers) {
              var researchersDiv = document.createElement('div');
              researchersDiv.className = 'bcubc-publications__researchers';
              var strong = document.createElement('strong');
              strong.textContent = 'Researchers:';
              researchersDiv.appendChild(strong);
              researchersDiv.appendChild(document.createTextNode(' ' + researchers));
              div.appendChild(researchersDiv);
            }

            var metaDiv = document.createElement('div');
            metaDiv.className = 'bcubc-publications__meta';
            if (date) {
              var time = document.createElement('time');
              time.dateTime = item.date;
              time.textContent = date;
              metaDiv.appendChild(time);
            }
            if (paperUrl) {
              if (date) metaDiv.appendChild(document.createTextNode(' \u00A0 '));
              var paperA = document.createElement('a');
              paperA.className = 'bcubc-publications__paper';
              paperA.href = paperUrl;
              paperA.target = '_blank';
              paperA.rel = 'noopener';
              paperA.textContent = 'Read the Research Paper';
              metaDiv.appendChild(paperA);
            }
            div.appendChild(metaDiv);

            list.appendChild(div);
          });
        })
        .catch(function (err) {
          if (window.console) console.warn('Recent Publications fetch failed:', err);
        });
    });
  }


  // ---------------------------------------------------------------
  // Body-class flag propagation
  //
  // For CSS rules that need to target the whole document (e.g. hiding
  // the theme's entry-title h1 on pages whose hero overlay already shows
  // the title), but where the editor can only attach a class to a block
  // inside the page (Advanced -> Additional CSS class). Any element with
  // a class starting `bcubc-flag-` propagates the same class to <body>,
  // so CSS authored against `body.bcubc-flag-...` "just works".
  //
  // Currently used:
  //   bcubc-flag-hide-entry-title -- /about-us/student-club/
  // ---------------------------------------------------------------
  function propagateBodyFlags() {
    var nodes = document.querySelectorAll('[class*="bcubc-flag-"]');
    if (!nodes.length) return;
    nodes.forEach(function (el) {
      el.classList.forEach(function (cls) {
        if (cls.indexOf('bcubc-flag-') === 0) {
          document.body.classList.add(cls);
        }
      });
    });
  }

  // ---------------------------------------------------------------
  // Homepage hero scroll-down arrow
  //
  // Mirrors the original Drupal homepage hero, which had a chevron-down
  // button at the bottom-center of the masthead that smooth-scrolled the
  // viewport down to the body content (skipping past the hero).
  //
  // Scoped to `body.home` only -- inner pages have content directly below
  // the hero so the affordance isn't needed.
  //
  // Idempotent: re-running won't insert a second arrow.
  // ---------------------------------------------------------------
  function injectHeroScrollArrow() {
    if (!document.body.classList.contains('home')) return;
    var hero = document.querySelector('.home-page-hero');
    if (!hero) return;
    if (hero.querySelector('.bcubc-hero-scroll')) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bcubc-hero-scroll';
    btn.setAttribute('aria-label', 'Scroll to content');
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" width="40" height="40" fill="none" ' +
      'stroke="currentColor" stroke-width="2.5" stroke-linecap="square" ' +
      'stroke-linejoin="miter" aria-hidden="true">' +
      '<polyline points="6 9 12 15 18 9"></polyline></svg>';

    btn.addEventListener('click', function () {
      var rect = hero.getBoundingClientRect();
      var target = window.scrollY + rect.bottom;
      if (typeof window.scrollTo === 'function') {
        try {
          window.scrollTo({ top: target, behavior: 'smooth' });
          return;
        } catch (e) { /* old browsers don't support options object */ }
      }
      window.scrollTo(0, target);
    });

    hero.appendChild(btn);
  }


  // ---------------------------------------------------------------
  // /resources/ link rewrite -> /resources/venture-building/
  //
  // /resources/ is a thin URL-hierarchy anchor page (no real content;
  // exists so child URLs /resources/venture-building/... can resolve).
  // Anywhere a link points at /resources/ -- breadcrumb (auto-generated
  // by the theme from page hierarchy, not editable via wp-admin), main
  // nav, in-page links -- rewrite the href so clicking lands the user
  // on the actual content (Venture Building) instead of the empty
  // anchor page.
  //
  // Doesn't touch links to /resources/venture-building/ or deeper --
  // the path equality check is exact.
  // ---------------------------------------------------------------
  function rewriteResourcesLinks() {
    var anchors = document.querySelectorAll('a[href]');
    anchors.forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href) return;
      var path = href;
      if (path.indexOf('://') !== -1) {
        try { path = new URL(href, window.location.origin).pathname; }
        catch (e) { return; }
      }
      if (path === '/resources/' || path === '/resources') {
        a.setAttribute('href', '/resources/venture-building/');
      }
    });
  }


  // ---------------------------------------------------------------
  // Top nav active-item highlight
  //
  // The CLF/APSC theme highlights the active top-nav item only when
  // the URL EXACTLY matches the item's href. So on /events/ the
  // "Events" item is highlighted, but on /events/past-industry-events/
  // no top-nav item is highlighted at all -- even though the user is
  // conceptually still inside Events.
  //
  // Theme markup (from DevTools):
  //   #ubc7-unit-menu
  //     .dropdown                       <- gets `active` class
  //       .btn-group
  //         a.btn[href]                 <- the visible nav link
  //         button.btn.droptown-toggle  <- caret button (if dropdown)
  //         ul.dropdown-menu            <- sub-items (if dropdown)
  //
  // Active CSS (theme):
  //   #ubc7-unit-menu .dropdown.active .btn-group .btn { color: #002145 }
  //   ...plus background overrides also keyed on `.dropdown.active`.
  //
  // Strategy: find the `a.btn` whose href is the longest URL prefix
  // of the current path, then add `active` to its closest .dropdown
  // ancestor (or .btn-group as a fallback for non-dropdown items
  // like "People"). Trailing-slash normalization prevents false
  // positives like /events matching /events-feed/.
  // ---------------------------------------------------------------
  function highlightActiveTopNavItem() {
    var topNav = document.querySelector('#ubc7-unit-menu');
    if (!topNav) return;

    function withTrailingSlash(p) {
      return p.charAt(p.length - 1) === '/' ? p : p + '/';
    }

    var path = withTrailingSlash(window.location.pathname);

    var bestAncestor = null;
    var bestLen      = 0;

    topNav.querySelectorAll('a.btn[href]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href) return;
      var hrefPath;
      try { hrefPath = new URL(href, window.location.origin).pathname; }
      catch (e) { return; }
      hrefPath = withTrailingSlash(hrefPath);

      if (path.indexOf(hrefPath) === 0 && hrefPath.length > bestLen) {
        bestAncestor = a.closest('.dropdown') || a.closest('.btn-group');
        bestLen      = hrefPath.length;
      }
    });

    if (bestAncestor) bestAncestor.classList.add('active');
  }


  // ---------------------------------------------------------------
  // Auto-hydrated children sublist for sidebar nav
  //
  // Used on the Education sidebar to list Summer Institute year
  // subpages (2019-2026, growing) without hand-editing the widget
  // every season. Pattern: the widget HTML contains an empty
  //
  //   <ul class="bcubc-page-sidebar-nav__sublist"
  //       data-bcubc-auto-children
  //       data-parent-slug="blockchain-summer-institute"
  //       data-bcubc-exclude-slugs="draft-2024,internal-only"></ul>
  //
  // This function:
  //   1. Resolves the parent slug -> page id via /wp-json/wp/v2/pages?slug=
  //   2. Fetches the parent's children, sorted by title desc so the
  //      newest year tops the list
  //   3. Drops any child whose slug appears in data-bcubc-exclude-slugs
  //      (comma-separated list, optional). Used on Microcertificate to
  //      hide the Course 1 / Course 2 detail pages from the sidebar --
  //      they're reached via the Course Details accordion buttons, so
  //      they don't need to clutter the section nav.
  //   4. Renders one <li.bcubc-page-sidebar-nav__subitem> per remaining
  //      child
  //   5. Re-runs highlightActiveNavItem() so the freshly injected
  //      sublink picks up `is-active` if the user is on that year page
  //      (since the DOM didn't exist when the first highlight ran)
  //
  // Title rendering: WP REST returns title.rendered with HTML entities
  // already encoded. We pipe through a temp div + textContent to
  // safely decode them without re-injecting HTML.
  // ---------------------------------------------------------------
  function injectAutoChildrenNav() {
    var slots = document.querySelectorAll('[data-bcubc-auto-children]');
    if (!slots.length) return;

    function withSlash(p) {
      return p.charAt(p.length - 1) === '/' ? p : p + '/';
    }
    var pathWS = withSlash(window.location.pathname);

    slots.forEach(function (slot) {
      // Show this branch's children ONLY when the user is currently on
      // the parent page or one of its descendants. Otherwise the
      // sublist would expand on every Education-sidebar page (including
      // sibling sections like Microcertificate), making the nav noisy.
      // Read the parent's path from the sibling .__link in the same
      // <li> rather than a separate data attribute -- single source of
      // truth, no risk of the path drifting from the link href.
      var parentLi   = slot.closest('li');
      var parentLink = parentLi && parentLi.querySelector('.bcubc-page-sidebar-nav__link');
      if (!parentLink) return;
      var parentPath;
      try { parentPath = new URL(parentLink.getAttribute('href'), window.location.origin).pathname; }
      catch (e) { return; }
      parentPath = withSlash(parentPath);
      if (pathWS.indexOf(parentPath) !== 0) return;

      var slug = slot.getAttribute('data-parent-slug');
      if (!slug) return;

      var excludeAttr = slot.getAttribute('data-bcubc-exclude-slugs') || '';
      var excludeSet  = excludeAttr.split(',')
                                   .map(function (s) { return s.trim(); })
                                   .filter(Boolean);

      fetch('/wp-json/wp/v2/pages?slug=' + encodeURIComponent(slug) + '&_fields=id')
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (parents) {
          if (!Array.isArray(parents) || !parents.length) return null;
          var parentId = parents[0].id;
          return fetch('/wp-json/wp/v2/pages?parent=' + parentId + '&per_page=100&orderby=title&order=desc&_fields=id,title,link,slug');
        })
        .then(function (r) {
          if (!r) return null;
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then(function (items) {
          if (!Array.isArray(items) || !items.length) return;

          var decoder = document.createElement('div');
          items.forEach(function (item) {
            if (excludeSet.indexOf(item.slug) !== -1) return;

            var hrefPath;
            try { hrefPath = new URL(item.link).pathname; }
            catch (e) { hrefPath = item.link; }

            decoder.innerHTML = (item.title && item.title.rendered) || '';
            var titleText = decoder.textContent;

            var li = document.createElement('li');
            li.className = 'bcubc-page-sidebar-nav__subitem';

            var a = document.createElement('a');
            a.className = 'bcubc-page-sidebar-nav__sublink';
            a.href = hrefPath;
            a.textContent = titleText;

            li.appendChild(a);
            slot.appendChild(li);
          });

          // Re-run sidebar highlight so the freshly injected sublink
          // gets `is-active` if it matches the current URL.
          highlightActiveNavItem();
        })
        .catch(function () { /* swallow -- sidebar just stays empty */ });
    });
  }


  // ---------------------------------------------------------------
  // 404 page makeover -- replaces WP's default "Not Found" + search
  // form layout with the Drupal-style minimalist hero (full-bleed
  // navy section, big white "404", "The requested page could not be
  // found." subtitle).
  //
  // Detection: WP adds `body.error404` on any 404 response, so we
  // can match without parsing URL or DOM text. No-op everywhere else.
  //
  // Strategy: hide breadcrumb + entry title + entry content (covers
  // the default page-header/page-content + entry-header/entry-content
  // template variants), then append a `.bcubc-404` block as a sibling.
  // Server still returns HTTP 404 status -- we only swap the visual.
  // ---------------------------------------------------------------
  function transform404Page() {
    if (!document.body.classList.contains('error404')) return;

    var hideSelectors = [
      '.breadcrumb',
      '.entry-header', '.page-header',
      '.entry-title', '.page-title',
      '.entry-content', '.page-content',
      '.search-form'
    ];
    hideSelectors.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        el.style.display = 'none';
      });
    });

    // Anchor the new hero to a stable container that's still visible.
    // Try article -> #content -> main -> body, in that order.
    var anchor = document.querySelector('article')
              || document.querySelector('#content')
              || document.querySelector('main')
              || document.body;
    if (!anchor) return;

    if (anchor.querySelector('.bcubc-404')) return;  // idempotent

    var hero = document.createElement('div');
    hero.className = 'bcubc-404';
    hero.innerHTML =
        '<h1 class="bcubc-404__code">404</h1>'
      + '<p class="bcubc-404__message">The requested page could not be found.</p>';
    anchor.appendChild(hero);
  }


  // ---------------------------------------------------------------
  // Past Conferences / Past Industry Events -- client-side filter.
  // Both listing pages share the same six event cards plus a small
  // filter form (Keywords + Event type). Drupal had this as an exposed
  // Views filter; we replicate the UX client-side so we don't need a
  // CPT or plugin. This handler self-scopes via the data attribute
  // selector below -- on any page without the form, it short-circuits.
  // See wp-assets/pages/events/past-conferences.html for the markup
  // contract (data-type and data-keywords on each card; form fields kw
  // and type; optional data-bcubc-events-empty placeholder).
  // ---------------------------------------------------------------
  function wireEventsFilter() {
    var form = document.querySelector('[data-bcubc-events-filter]');
    var list = document.querySelector('[data-bcubc-events-list]');
    if (!form || !list) return;
    var cards = list.querySelectorAll('.bcubc-event-card');
    if (!cards.length) return;
    var empty = list.querySelector('[data-bcubc-events-empty]');

    function apply() {
      var kw = (form.elements.kw && form.elements.kw.value || '').trim().toLowerCase();
      var type = form.elements.type ? form.elements.type.value : '';
      var visible = 0;
      cards.forEach(function (card) {
        var match = true;
        if (type && card.getAttribute('data-type') !== type) match = false;
        if (kw) {
          var hay = (card.getAttribute('data-keywords') || '') + ' ' + (card.textContent || '');
          if (hay.toLowerCase().indexOf(kw) === -1) match = false;
        }
        card.hidden = !match;
        if (match) visible++;
      });
      if (empty) empty.hidden = visible !== 0;
    }

    form.addEventListener('submit', function (e) { e.preventDefault(); apply(); });
    form.addEventListener('input', apply);
    form.addEventListener('change', apply);
    apply();
  }


  // ---------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------
  function run() {
    propagateBodyFlags();
    rebuildTalksRows();
    rebuildPapersRows();
    rewriteResourcesLinks();
    highlightActiveNavItem();
    highlightActiveTopNavItem();
    injectAutoChildrenNav();
    populateLatestUpdates();
    populateRecentPublications();
    injectHeroScrollArrow();
    transform404Page();
    wireEventsFilter();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
