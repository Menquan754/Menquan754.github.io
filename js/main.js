(function () {
  'use strict';

  /* 站内页面预取：悬停/聚焦/触摸时预取目标页，空闲时预取其余页面 */
  var prefetched = Object.create(null);
  function prefetch(url) {
    if (!url || prefetched[url]) return;
    prefetched[url] = true;
    var link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'document';
    link.href = url;
    document.head.appendChild(link);
  }
  function isLocalPage(href) {
    return !!href && /\.html(?:[?#]|$)/.test(href) && !/^https?:\/\//i.test(href);
  }
  document.querySelectorAll('a[href]').forEach(function (a) {
    var href = a.getAttribute('href');
    if (!isLocalPage(href)) return;
    a.addEventListener('mouseenter', function () { prefetch(href); }, { passive: true });
    a.addEventListener('focus', function () { prefetch(href); });
    a.addEventListener('touchstart', function () { prefetch(href); }, { passive: true });
  });
  var currentPage = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var otherPages = ['index.html', 'projects.html', 'about.html'].filter(function (p) {
    return p !== currentPage;
  });
  function prefetchOthers() { otherPages.forEach(prefetch); }
  if ('requestIdleCallback' in window) {
    requestIdleCallback(prefetchOthers, { timeout: 2000 });
  } else {
    window.setTimeout(prefetchOthers, 1200);
  }

  var header = document.querySelector('.site-header');
  var toggle = document.querySelector('.nav-toggle');
  var mobileNav = document.getElementById('mobile-nav');
  var toast = document.getElementById('toast');
  var toastTimer;

  function updateHeader() {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  }

  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  function setMenu(open) {
    if (!toggle || !mobileNav) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? '关闭导航菜单' : '打开导航菜单');
    toggle.classList.toggle('is-open', open);
    mobileNav.hidden = !open;
  }

  if (toggle && mobileNav) {
    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });

    mobileNav.addEventListener('click', function (event) {
      if (event.target.closest('a')) setMenu(false);
    });

    window.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') setMenu(false);
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 880) setMenu(false);
    });
  }

  var revealItems = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    var viewportH = window.innerHeight || document.documentElement.clientHeight;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    revealItems.forEach(function (item) {
      var rect = item.getBoundingClientRect();
      // 已在首屏的内容立即显示，不等 IO 回调，避免首屏出现空白等待
      if (rect.top < viewportH && rect.bottom > 0) {
        item.classList.add('is-in', 'is-above');
      } else {
        observer.observe(item);
      }
    });
  } else {
    revealItems.forEach(function (item) {
      item.classList.add('is-in');
    });
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove('is-visible');
    }, 2200);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }

    return new Promise(function (resolve, reject) {
      var textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.top = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();

      try {
        if (document.execCommand('copy')) {
          resolve();
        } else {
          reject(new Error('copy failed'));
        }
      } catch (error) {
        reject(error);
      } finally {
        document.body.removeChild(textarea);
      }
    });
  }

  document.querySelectorAll('[data-copy]').forEach(function (button) {
    button.addEventListener('click', function () {
      var value = button.getAttribute('data-copy');
      if (!value) return;

      copyText(value)
        .then(function () {
          showToast('微信号已复制：' + value);
          button.textContent = '已复制';
          window.setTimeout(function () {
            button.textContent = '复制';
          }, 1800);
        })
        .catch(function () {
          showToast('复制失败，请手动选择：' + value);
        });
    });
  });

  document.querySelectorAll('[data-year]').forEach(function (element) {
    element.textContent = String(new Date().getFullYear());
  });

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function () {});
    });
  }
})();
