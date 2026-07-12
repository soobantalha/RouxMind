/* RouxMind — ULTRA RICH PRO MAX 7D LUXURY JS
   Layers: grain, aurora, gold dust, mouse glow, cursor, magnetic, spotlight, tilt
   Built by Sooban Talha Technologies × Mesh API
*/
(() => {
  'use strict';

  const $ = (s, sc=document) => sc.querySelector(s);
  const $$ = (s, sc=document) => [...sc.querySelectorAll(s)];

  /* ---------- Scroll Progress ---------- */
  const progress = $('#scrollProgress');
  const onScrollProgress = () => {
    if (!progress) return;
    const h = document.documentElement;
    const scrolled = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
    progress.style.width = `${scrolled}%`;
  };
  window.addEventListener('scroll', onScrollProgress, {passive:true});
  onScrollProgress();

  /* ---------- Preloader Pro Max with Counter ---------- */
  const preloader = $('#preloader');
  const preBar = $('.preloader-bar-fill');
  const preCounter = $('.preloader-counter');
  if (preloader) {
    let p = 0;
    document.body.style.overflow = 'hidden';
    const int = setInterval(() => {
      p += Math.random()*11 + 4;
      if (p >= 100) p = 100;
      if (preBar) preBar.style.width = `${p}%`;
      if (preCounter) preCounter.textContent = `${Math.floor(p).toString().padStart(2,'0')}% — RouxMind Atelier`;
      if (p >= 100) clearInterval(int);
    }, 55);

    const hide = () => {
      const elapsed = performance.now();
      const min = 1200;
      const wait = Math.max(0, min - elapsed);
      setTimeout(() => {
        preloader.classList.add('hidden');
        document.body.style.overflow = '';
        // reveal initial
        $$('.reveal').forEach(el => {
          const r = el.getBoundingClientRect();
          if (r.top < innerHeight * 0.92) el.classList.add('active');
        });
      }, wait);
    };
    if (document.readyState === 'complete') setTimeout(hide, 600);
    else window.addEventListener('load', () => setTimeout(hide, 400));
    setTimeout(hide, 2600);
  }

  /* ---------- Custom Cursor 7D ---------- */
  const dot = $('#cursorDot');
  const ring = $('#cursorRing');
  if (dot && ring && !matchMedia('(pointer: coarse)').matches) {
    let mx = -100, my = -100, rx = -100, ry = -100;
    let raf = null;
    const lerp = (a,b,n) => (1-n)*a + n*b;
    const animate = () => {
      rx = lerp(rx, mx, 0.16); ry = lerp(ry, my, 0.16);
      dot.style.left = `${mx}px`; dot.style.top = `${my}px`;
      ring.style.left = `${rx}px`; ring.style.top = `${ry}px`;
      raf = requestAnimationFrame(animate);
    };
    animate();
    window.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; }, {passive:true});
    $$('a, button, .glass-card, .btn-gold, .btn-outline, .drop-zone').forEach(el => {
      el.addEventListener('mouseenter', () => { dot.classList.add('hover'); ring.classList.add('hover'); });
      el.addEventListener('mouseleave', () => { dot.classList.remove('hover'); ring.classList.remove('hover'); });
    });
  }

  /* ---------- Gold Dust Canvas — 7D Particle Luxury ---------- */
  const canvas = $('#goldDust');
  if (canvas && canvas.getContext && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const ctx = canvas.getContext('2d', {alpha:true});
    let w, h, particles = [], rafId;
    const count = Math.min(72, Math.floor((innerWidth * innerHeight) / 18000));
    const resize = () => {
      w = canvas.width = innerWidth * devicePixelRatio;
      h = canvas.height = innerHeight * devicePixelRatio;
      canvas.style.width = innerWidth + 'px';
      canvas.style.height = innerHeight + 'px';
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };
    class P {
      constructor(){ this.reset(true); }
      reset(initial=false){
        this.x = Math.random()*innerWidth;
        this.y = initial ? Math.random()*innerHeight : innerHeight + Math.random()*40;
        this.vx = (Math.random()-0.5)*0.22;
        this.vy = -0.18 - Math.random()*0.55;
        this.r = 0.6 + Math.random()*1.8;
        this.alpha = 0.12 + Math.random()*0.5;
        this.tw = Math.random()*Math.PI*2;
        this.tws = 0.006 + Math.random()*0.012;
      }
      update(){
        this.x += this.vx + Math.sin(this.tw)*0.08;
        this.y += this.vy;
        this.tw += this.tws;
        if (this.y < -10 || this.x < -20 || this.x > innerWidth+20) this.reset(false);
      }
      draw(){
        const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r*3);
        g.addColorStop(0, `rgba(249,217,118,${this.alpha})`);
        g.addColorStop(0.3, `rgba(212,175,55,${this.alpha*0.6})`);
        g.addColorStop(1, `rgba(212,175,55,0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r*3, 0, Math.PI*2); ctx.fill();
      }
    }
    const init = () => {
      particles = []; for(let i=0;i<count;i++) particles.push(new P());
    };
    const loop = () => {
      ctx.clearRect(0,0,innerWidth, innerHeight);
      particles.forEach(p=>{ p.update(); p.draw(); });
      rafId = requestAnimationFrame(loop);
    };
    resize(); init(); loop();
    window.addEventListener('resize', () => { resize(); init(); }, {passive:true});
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(rafId);
      else loop();
    });
  }

  /* ---------- Mouse Glow Pro Max ---------- */
  const glow = $('#mouse-glow');
  if (glow) {
    let mx=-600, my=-600, cx=-600, cy=-600, vis=false;
    const lerp=(a,b,n)=>(1-n)*a+n*b;
    (function tick(){ cx=lerp(cx,mx,0.07); cy=lerp(cy,my,0.07); glow.style.left=cx+'px'; glow.style.top=cy+'px'; requestAnimationFrame(tick);})();
    window.addEventListener('mousemove', e=>{ mx=e.clientX; my=e.clientY; if(!vis){vis=true; glow.classList.add('visible');}}, {passive:true});
    window.addEventListener('mouseleave', ()=>{vis=false; glow.classList.remove('visible');});
    if (matchMedia('(pointer: coarse)').matches) glow.style.display='none';
  }

  /* ---------- Header Scroll ---------- */
  const header = $('#header');
  if (header) {
    let tick=false;
    const upd=()=>{ if(!tick){ requestAnimationFrame(()=>{ if(scrollY>54) header.classList.add('scrolled'); else header.classList.remove('scrolled'); tick=false;}); tick=true; }};
    window.addEventListener('scroll', upd, {passive:true}); upd();
  }

  /* ---------- Mobile Menu ---------- */
  const toggle = $('#navToggle'), menu = $('#mobileMenu');
  if (toggle && menu) {
    const close=()=>{ toggle.classList.remove('active'); toggle.setAttribute('aria-expanded','false'); menu.classList.remove('open'); menu.setAttribute('aria-hidden','true'); document.body.style.overflow=''; };
    const open=()=>{ toggle.classList.add('active'); toggle.setAttribute('aria-expanded','true'); menu.classList.add('open'); menu.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; };
    toggle.addEventListener('click', ()=> menu.classList.contains('open')?close():open());
    $$('a', menu).forEach(a=>a.addEventListener('click',close));
    document.addEventListener('keydown', e=>{ if(e.key==='Escape' && menu.classList.contains('open')) close();});
    document.addEventListener('click', e=>{ if(!menu.contains(e.target) && !toggle.contains(e.target) && menu.classList.contains('open')) close();});
    window.addEventListener('resize', ()=>{ if(innerWidth>1024 && menu.classList.contains('open')) close();});
  }

  /* ---------- Spotlight + Magnetic ---------- */
  const spotlightCards = $$('.glass-card, .btn-outline, .drop-zone');
  spotlightCards.forEach(card=>{
    card.addEventListener('mousemove', e=>{
      const r=card.getBoundingClientRect();
      const x=e.clientX - r.left, y=e.clientY - r.top;
      card.style.setProperty('--spot-x', `${(x/r.width)*100}%`);
      card.style.setProperty('--spot-y', `${(y/r.height)*100}%`);
      card.style.setProperty('--mx', `${x}px`);
      card.style.setProperty('--my', `${y}px`);
    });
  });

  const magneticBtns = $$('.magnetic');
  if (!matchMedia('(pointer: coarse)').matches) {
    magneticBtns.forEach(btn=>{
      btn.addEventListener('mousemove', e=>{
        const r=btn.getBoundingClientRect();
        const x=e.clientX - r.left - r.width/2, y=e.clientY - r.top - r.height/2;
        btn.style.transform = `translate(${x*0.18}px, ${y*0.28}px)`;
      });
      btn.addEventListener('mouseleave', ()=>{ btn.style.transform='translate(0,0)'; });
    });
  }

  /* ---------- 3D Tilt Hero ---------- */
  const heroWrap = $('.hero-logo-wrap'), heroVisual = $('.hero-visual');
  if (heroWrap && heroVisual && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    heroVisual.addEventListener('mousemove', e=>{
      const r=heroVisual.getBoundingClientRect();
      const cx=r.left+r.width/2, cy=r.top+r.height/2;
      const dx=(e.clientX-cx)/r.width, dy=(e.clientY-cy)/r.height;
      heroWrap.style.transform = `perspective(1000px) rotateY(${dx*10}deg) rotateX(${-dy*10}deg) translateZ(0)`;
    });
    heroVisual.addEventListener('mouseleave', ()=>{ heroWrap.style.transform='perspective(1000px) rotateY(0) rotateX(0)'; });
  }

  /* ---------- Scroll Reveal Pro Max (with blur) ---------- */
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(ent=>{
        if (ent.isIntersecting){
          ent.target.classList.add('active');
          io.unobserve(ent.target);
        }
      });
    }, {rootMargin:'0px 0px -10% 0px', threshold:0.08});
    reveals.forEach(el=>io.observe(el));
  } else reveals.forEach(el=>el.classList.add('active'));

  /* ---------- FAQ Accordion ---------- */
  const faqs = $$('[data-faq]');
  faqs.forEach(item=>{
    const btn=$('.faq-question', item), icon=$('.faq-toggle', item);
    if(!btn) return;
    btn.addEventListener('click', ()=>{
      const open=item.classList.contains('open');
      faqs.forEach(o=>{ if(o!==item){ o.classList.remove('open'); const ic=$('.faq-toggle',o); if(ic) ic.textContent='+'; }});
      if(open){ item.classList.remove('open'); if(icon) icon.textContent='+';}
      else { item.classList.add('open'); if(icon) icon.textContent='−'; }
    });
  });
  if (faqs[0]) { faqs[0].classList.add('open'); const ic=$('.faq-toggle', faqs[0]); if(ic) ic.textContent='−'; }

  /* ---------- Smooth Anchor with header offset ---------- */
  $$('a[href^="#"]').forEach(a=>{
    a.addEventListener('click', e=>{
      const href=a.getAttribute('href');
      if(!href || href==='#') return;
      const t=$(href);
      if(t){ e.preventDefault(); const off=82; const top=t.getBoundingClientRect().top + scrollY - off; scrollTo({top, behavior:'smooth'}); }
    });
  });

  /* ---------- Global Stats Live Fetch (Sheets) ---------- */
  const statNums = $$('.stat-num');
  if (statNums.length && location.hostname !== 'localhost') {
    // try fetch real stats, fallback to static
    (async ()=>{
      try {
        const r = await fetch('/api/recipe?action=global-stats');
        if (!r.ok) return;
        const data = await r.json();
        if (data.total) {
          // mutate first stat if exists
          if (statNums[0]) statNums[0].textContent = (data.total > 1000 ? Math.floor(data.total/1000)+'K+' : data.total+'+');
          if (statNums[1]) statNums[1].textContent = '99%'; // keep
        }
      } catch{}
    })();
  }

  /* ---------- Perf: Reduce motion respect ---------- */
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    $$('*').forEach(el=>{ el.style.animationDuration='0.01ms'; el.style.transitionDuration='0.12s'; });
  }

})();
