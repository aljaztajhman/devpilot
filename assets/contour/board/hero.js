(() => {
  /* Board-locked Contour hero — mechanical from Jan devpilot-hero.html (Zulip 630402395).
     Adapted only for D's DOM (#board-stage, ALT as [data-hero-alt] so site.js's [data-alt]
     page readout does not grab it) plus the zoom -> #main handoff further down. */

  /* ---------- D geometry (unit R = 1, origin = circle centre, y down) ---------- */
  const RH  = 212.5 / 640;   // hole radius
  const A   = 187   / 640;   // bottom-left cut-out offset
  const SP  = 0.04263;       // contour spacing  (x R)
  const OFF = 0.02342;       // first contour distance from the edge (x R)
  const FADE = 0.73;         // contour falloff length (x R)

  const stage = document.getElementById('board-stage');
  const hero  = document.getElementById('hero');
  const canvas = document.getElementById('field');
  const ink = document.getElementById('ink');
  const dfbPath = document.getElementById('dfbPath');
  const main = document.getElementById('main');
  if (!stage || !hero || !canvas || !ink) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  /* dark copy of every piece of type, clipped to the D */
  const inv = ink.cloneNode(true);
  inv.id = ''; inv.className = 'layer inv'; inv.setAttribute('aria-hidden','true');
  inv.querySelectorAll('a').forEach(a => a.tabIndex = -1);
  inv.querySelectorAll('[aria-label]').forEach(e => e.removeAttribute('aria-label'));
  ink.after(inv);

  const fades  = [...stage.querySelectorAll('.fade')];
  const alts   = stage.querySelectorAll('[data-hero-alt]');
  const lvls   = stage.querySelectorAll('[data-lvl]');
  const clocks = stage.querySelectorAll('[data-clock]');

  let W, H, base = {cx:0, cy:0, R:0}, view = {cx:0, cy:0, R:0};

  /* The whole composition (D + headline + paragraph) scales as one unit,
     so the headline always crosses the D the way it does in the design.
     Reference frame: 1306 x 793 CSS px, D radius 320.2. */
  function layout(){
    W = stage.clientWidth; H = stage.clientHeight;
    const pad = parseFloat(getComputedStyle(stage).getPropertyValue('--pad'));
    let s, R, cx, cy, hx;
    if (W > 760){
      s  = Math.min(W/1306, H/793);
      R  = 320.2*s;
      const dx = Math.max(0, (W - 1306*s)/2);       // very wide screens: centre the composition
      cx = W - dx - 59*s - R;
      cy = Math.max(0, (H - 793*s)/2) + 46.75*s + R;
      hx = dx + pad;
    } else {
      s  = (W - 2*pad) / 870;                       // "that ships." fills the width
      R  = 320.2*s;
      cx = W - pad - R;
      const block = 700*s + 120;                    // D + headline + paragraph
      cy = Math.max(96, (H - block)/2) + R;
      hx = pad;
    }
    const F = 187*s;
    const htop = cy + 0.5403*R - 0.834*F + 4*s;     // first baseline sits 0.54R below the centre
    base = {cx, cy, R};
    const set = (k,v) => stage.style.setProperty(k, v + 'px');
    set('--cx',cx); set('--cy',cy); set('--R',R); set('--F',F); set('--hx',hx); set('--htop',htop);
    stage.classList.toggle('lede-below', R < 250);
  }

  /* D outline in stage pixels (for the clip and the no-WebGL fallback) */
  function dPath(cx, cy, R){
    const k = R/640, x0 = cx - R, y0 = cy - R, r = 212.5*k, n = v => v.toFixed(2);
    return `M${n(x0)} ${n(y0)}H${n(cx)}A${n(R)} ${n(R)} 0 0 1 ${n(cx)} ${n(cy+R)}`
         + `H${n(x0+453*k)}V${n(y0+852.5*k)}H${n(cx)}A${n(r)} ${n(r)} 0 1 0 ${n(x0+427.5*k)} ${n(cy)}`
         + `V${n(y0+827*k)}H${n(x0)}Z`;
  }

  /* JS twin of the shader field, for the (NN) contour readout */
  function sdBox(px, py, bx, by){ const dx=Math.abs(px)-bx, dy=Math.abs(py)-by;
    return Math.hypot(Math.max(dx,0),Math.max(dy,0)) + Math.min(Math.max(dx,dy),0); }
  function field(x, y){
    const outer = Math.min(sdBox(x+0.5, y, 0.5, 1), Math.hypot(x,y)-1);
    const hole  = Math.min(Math.hypot(x,y)-RH, sdBox(x+RH/2, y-RH/2, RH/2, RH/2));
    const cxq = x + A, cyq = A - y;
    const cut = Math.hypot(Math.max(cxq,0),Math.max(cyq,0)) + Math.min(Math.max(cxq,cyq),0);
    return Math.max(outer, -hole, -cut);
  }

  /* ---------- WebGL contour field ---------- */
  const gl = canvas.getContext('webgl', {antialias:false, premultipliedAlpha:false});
  let prog, loc = {};
  if (!gl){ stage.classList.add('no-gl'); }
  else {
    const vs = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
    const fs = `precision highp float;
      uniform vec2 uRes; uniform vec2 uC; uniform float uR; uniform float uDpr;
      const float RH=${RH.toFixed(6)}, A=${A.toFixed(6)}, SP=${SP}, OFF=${OFF}, FADE=${FADE};
      float sdBox(vec2 p, vec2 b){vec2 d=abs(p)-b;return length(max(d,0.))+min(max(d.x,d.y),0.);}
      float field(vec2 q){
        float outer=min(sdBox(q-vec2(-.5,0.),vec2(.5,1.)), length(q)-1.);
        float hole =min(length(q)-RH, sdBox(q-vec2(-RH*.5,RH*.5),vec2(RH*.5)));
        vec2 c=vec2(q.x+A, A-q.y);
        float cut=length(max(c,0.))+min(max(c.x,c.y),0.);
        return max(max(outer,-hole),-cut);
      }
      float h(float n){return fract(sin(n)*43758.5453);}
      float vn(float x){float i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(h(i),h(i+1.),f);}
      void main(){
        vec2 p=vec2(gl_FragCoord.x, uRes.y-gl_FragCoord.y);
        float d=field((p-uC)/uR)*uR;
        float sp=SP*uR, off=OFF*uR;
        float k=abs(fract((d-off)/sp+.5)-.5)*sp;
        float hw=.8*uDpr;
        float line=(1.-smoothstep(hw-.6,hw+.6,k))*step(off-.5*sp,d);
        float a=.125*exp(-max(d,0.)/(FADE*uR))+.012;
        float px=p.x/uDpr;
        vec3 bg=vec3(.049)+(vn(px*.33)-.5)*.022+(vn(px*.045+7.)-.5)*.018
                +(h(dot(p,vec2(12.9898,78.233)))-.5)*.012;
        vec3 ink=vec3(.925,.910,.890);
        vec3 col=mix(bg,ink,line*a);
        col=mix(col,ink,1.-smoothstep(-.7,.7,d));
        gl_FragColor=vec4(col,1.);
      }`;
    const sh = (t,src)=>{const s=gl.createShader(t);gl.shaderSource(s,src);gl.compileShader(s);
      if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw gl.getShaderInfoLog(s);return s;};
    try{
      prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(prog); gl.useProgram(prog);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
      const ap = gl.getAttribLocation(prog,'p'); gl.enableVertexAttribArray(ap);
      gl.vertexAttribPointer(ap,2,gl.FLOAT,false,0,0);
      ['uRes','uC','uR','uDpr'].forEach(n=>loc[n]=gl.getUniformLocation(prog,n));
    }catch(e){ console.warn(e); stage.classList.add('no-gl'); prog=null; }
  }

  function draw(){
    const d = dPath(view.cx, view.cy, view.R);
    inv.style.clipPath = `path('${d}')`;
    inv.style.webkitClipPath = `path('${d}')`;
    if (!prog){ dfbPath.setAttribute('d', d); return; }
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.round(W*dpr), h = Math.round(H*dpr);
    if (canvas.width !== w || canvas.height !== h){ canvas.width = w; canvas.height = h; }
    gl.viewport(0,0,w,h);
    gl.uniform2f(loc.uRes, w, h);
    gl.uniform2f(loc.uC, view.cx*dpr, view.cy*dpr);
    gl.uniform1f(loc.uR, view.R*dpr);
    gl.uniform1f(loc.uDpr, dpr);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /* ---------- zoom -> page handoff ----------
     hero.css pulls #main up over the last screen of the runway, so #main's top reaches the
     top of the viewport exactly when the stage lets go (scrollY = main.offsetTop). Until then
     #main is pinned to the viewport (translateY), clipped to the D's hole and scaled up from
     inside it, while the stage dissolves into the shared #0D0D0D ground. At the end every
     transform is identity, so dropping the styles is invisible and the page simply scrolls on.
     The hole outgrows the viewport at p ~ .5, so the handoff starts while the hole is still
     framed by the D's rim (HAND_P0); a start at p ~ .72 would be a hard cut. */
  const HAND_P0 = 0.30;      // fly-in progress where #main starts to show through the hole
  const S0 = 0.42;           // #main scale when it first shows in the hole
  let handing = false;
  function clearHandoff(){
    if (!handing) return;
    handing = false;
    main.classList.remove('handoff');
    main.style.transform = main.style.transformOrigin = main.style.clipPath = main.style.webkitClipPath = main.style.opacity = '';
    stage.style.opacity = '';
  }
  function handoff(run){
    if (!main) return;
    const endY = main.offsetTop;                    // scrollY where #main's top meets the viewport top
    const nat = endY - scrollY;                     // #main's untransformed top, in viewport px
    if (reduce.matches || run <= 0 || nat <= 0){ clearHandoff(); return; }
    const hand = sstep(hero.offsetTop + HAND_P0 * run, endY, scrollY);
    if (hand <= 0){ clearHandoff(); return; }       // untouched: #main is still below the fold
    handing = true;
    main.classList.add('handoff');
    const s = S0 + (1 - S0) * hand;
    const hx = view.cx, hy = view.cy, hr = RH * view.R;
    const cover = Math.hypot(Math.max(hx, W - hx), Math.max(hy, H - hy));
    main.style.transformOrigin = `${hx}px ${hy}px`;
    main.style.transform = `translateY(${-nat}px) scale(${s})`;
    /* the clip lives in #main's own (pre-scale) coordinates: hole radius / scale, about the same point */
    main.style.clipPath = main.style.webkitClipPath =
      hr >= cover ? 'none' : `circle(${(hr / s).toFixed(1)}px at ${hx.toFixed(1)}px ${hy.toFixed(1)}px)`;
    main.style.opacity = sstep(0, .22, hand);
    stage.style.opacity = 1 - sstep(.35, 1, hand);
  }
  /* keyboard focus landing inside #main mid-flight: finish the flight first */
  main?.addEventListener('focusin', () => {
    if (!reduce.matches && scrollY < main.offsetTop - 1){ scrollTo({top: main.offsetTop, behavior: 'instant'}); update(); }
  });

  /* ---------- scroll: fly into the hole ---------- */
  const ease = t => t*t*(3-2*t);
  const sstep = (a,b,t) => { t=Math.min(Math.max((t-a)/(b-a),0),1); return t*t*(3-2*t); };
  function update(){
    let p = 0, run = 0;
    if (!reduce.matches){
      run = hero.offsetHeight - innerHeight;
      p = run > 0 ? Math.min(Math.max(-hero.getBoundingClientRect().top / run, 0), 1) : 0;
    }
    const e = ease(p), z = 1 + 13*e;
    view.R  = base.R * z;
    view.cx = base.cx + (W/2 - base.cx) * e;
    view.cy = base.cy + (H/2 - base.cy) * e;
    const o = 1 - sstep(0, .3, p);
    fades.forEach(el => el.style.opacity = o);
    const alt = String(Math.round(e*120)).padStart(3,'0');
    alts.forEach(a => a.textContent = alt);
    const d = field((W/2 - view.cx)/view.R, (H/2 - view.cy)/view.R);
    const lvl = String(d < OFF ? 0 : Math.floor((d - OFF)/SP) + 1).padStart(2,'0');
    lvls.forEach(l => l.textContent = lvl);
    handoff(run);
    draw();
  }

  let queued = false;
  const request = () => { if (!queued){ queued = true; requestAnimationFrame(()=>{ queued=false; update(); }); } };
  addEventListener('scroll', request, {passive:true});
  addEventListener('resize', () => { layout(); request(); });
  reduce.addEventListener?.('change', request);
  layout(); update();
  document.fonts?.ready.then(() => { layout(); update(); });

  /* ---------- Ljubljana clock ---------- */
  const fmt = new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Ljubljana',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
  const tick = () => { const t = fmt.format(new Date()); clocks.forEach(c => c.textContent = t); };
  tick(); setInterval(tick, 1000);
})();
