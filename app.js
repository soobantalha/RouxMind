/* RouxMind App - Ethereal Luxury Interactions */
(() => {
  'use strict';

  /* ---------- Preloader ---------- */
  const preloader = document.getElementById('preloader');
  const MIN_PRELOAD = 650;
  const start = Date.now();

  function hidePreloader() {
    const elapsed = Date.now() - start;
    const remaining = Math.max(0, MIN_PRELOAD - elapsed);
    setTimeout(() => {
      if (!preloader) return;
      preloader.classList.add('hidden');
      document.body.style.overflow = '';
      // Trigger initial reveals after preloader
      requestAnimationFrame(() => {
        document.querySelectorAll('.reveal').forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.top < window.innerHeight * 0.92) el.classList.add('active');
        });
      });
    }, remaining);
  }

  // Ensure body doesn't scroll during preloader
  document.body.style.overflow = 'hidden';
  if (document.readyState === 'complete') hidePreloader();
  else window.addEventListener('load', hidePreloader);
  // Fallback
  setTimeout(hidePreloader, 1800);

  /* ---------- Mouse Glow (RAF 60fps) ---------- */
  const glow = document.getElementById('mouse-glow');
  if (glow) {
    let mouseX = -500, mouseY = -500;
    let currentX = -500, currentY = -500;
    let rafId = null;
    let visible = false;

    const lerp = (a, b, n) => (1 - n) * a + n * b;

    function animate() {
      currentX = lerp(currentX, mouseX, 0.08);
      currentY = lerp(currentY, mouseY, 0.08);
      glow.style.left = `${currentX}px`;
      glow.style.top = `${currentY}px`;
      rafId = requestAnimationFrame(animate);
    }

    animate();

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!visible) {
        visible = true;
        glow.classList.add('visible');
      }
    }, { passive: true });

    window.addEventListener('mouseleave', () => {
      visible = false;
      glow.classList.remove('visible');
    });

    // Optimize for reduced motion / mobile
    if (window.matchMedia('(pointer: coarse)').matches) {
      glow.style.display = 'none';
      if (rafId) cancelAnimationFrame(rafId);
    }
  }

  /* ---------- Header Scroll ---------- */
  const header = document.getElementById('header');
  if (header) {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (window.scrollY > 50) header.classList.add('scrolled');
          else header.classList.remove('scrolled');
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Mobile Menu ---------- */
  const toggle = document.getElementById('navToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  if (toggle && mobileMenu) {
    const closeMenu = () => {
      toggle.classList.remove('active');
      toggle.setAttribute('aria-expanded', 'false');
      mobileMenu.classList.remove('open');
      mobileMenu.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    };
    const openMenu = () => {
      toggle.classList.add('active');
      toggle.setAttribute('aria-expanded', 'true');
      mobileMenu.classList.add('open');
      mobileMenu.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    };

    toggle.addEventListener('click', () => {
      if (mobileMenu.classList.contains('open')) closeMenu();
      else openMenu();
    });

    // Close on link click
    mobileMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', closeMenu);
    });

    // Close on outside / escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('open')) closeMenu();
    });
    document.addEventListener('click', (e) => {
      if (!mobileMenu.contains(e.target) && !toggle.contains(e.target) && mobileMenu.classList.contains('open')) {
        closeMenu();
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 1024 && mobileMenu.classList.contains('open')) closeMenu();
    });
  }

  /* ---------- Scroll Reveal ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -8% 0px',
      threshold: 0.08
    });

    revealEls.forEach(el => observer.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('active'));
  }

  /* ---------- FAQ Accordion ---------- */
  const faqItems = document.querySelectorAll('[data-faq]');
  faqItems.forEach(item => {
    const btn = item.querySelector('.faq-question');
    const toggleIcon = item.querySelector('.faq-toggle');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');

      // Close all
      faqItems.forEach(other => {
        if (other !== item) {
          other.classList.remove('open');
          const ic = other.querySelector('.faq-toggle');
          if (ic) ic.textContent = '+';
        }
      });

      // Toggle current
      if (isOpen) {
        item.classList.remove('open');
        if (toggleIcon) toggleIcon.textContent = '+';
      } else {
        item.classList.add('open');
        if (toggleIcon) toggleIcon.textContent = '−';
      }
    });
  });

  // Open first FAQ by default for premium feel
  if (faqItems.length) {
    faqItems[0].classList.add('open');
    const firstIcon = faqItems[0].querySelector('.faq-toggle');
    if (firstIcon) firstIcon.textContent = '−';
  }

  /* ---------- Smooth Anchor Scroll Offset ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const headerOffset = 80;
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
      }
    });
  });

  /* ---------- Parallax subtle for hero logo ---------- */
  const heroLogoWrap = document.querySelector('.hero-logo-wrap');
  const heroVisual = document.querySelector('.hero-visual');
  if (heroLogoWrap && heroVisual && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    heroVisual.addEventListener('mousemove', (e) => {
      const rect = heroVisual.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
      const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
      heroLogoWrap.style.transform = `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateZ(0)`;
    });
    heroVisual.addEventListener('mouseleave', () => {
      heroLogoWrap.style.transform = 'perspective(900px) rotateY(0) rotateX(0) translateZ(0)';
    });
  }

  /* ---------- Subtle card hover glow follow ---------- */
  document.querySelectorAll('.glass-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mx', `${x}px`);
      card.style.setProperty('--my', `${y}px`);
    });
  });

})();
