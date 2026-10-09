(() => {
  /* Board-locked Contour hero WebGL — mechanical from Jan devpilot-hero.html (630400016). */
  const RH  = 212.5 / 640;
  const A   = 187   / 640;
  const SP  = 0.04263;
  const OFF = 0.02342;
  const FADE = 0.73;

  const stage = document.getElementById('board-stage');
  const hero  = document.getElementById('hero');
  const canvas = document.getElementById('field');
  const altEl = document.getElementById('alt');
  const lvlEl = document.getElementById('lvl');
  if (!stage || !hero || !canvas) return;
  const fades = [...hero.querySelectorAll('.fade')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  let W, H, base = {cx:0, cy:0, R:0}, view = {cx:0, cy:0, R:0};

  function layout(){
    W = stage.clientWidth; H = stage.clientHeight;
    let R, cx, cy;
    if (W > 760){
      R  = Math.min(0.2452 * W, 0.4041 * H);
      cx = W - 0.045 * W - R;
      cy = 0.059 * H + R;
    } else {
      R  = Math.min(0.40 * W, 0.26 * H);
      cx = W - 18 - R;
      cy = 96 + R;
    }
    base = {cx, cy, R};
    stage.style.setProperty('--cx', cx + 'px');
    stage.style.setProperty('--cy', cy + 'px');
    stage.style.setProperty('--R',  R  + 'px');
    hero.style.setProperty('--cx', cx + 'px');
    hero.style.setProperty('--cy', cy + 'px');
    hero.style.setProperty('--R',  R  + 'px');
  }

  function sdBox(px, py, bx, by){ const dx=Math.abs(px)-bx, dy=Math.abs(py)-by;
    return Math.hypot(Math.max(dx,0),Math.max(dy,0)) + Math.min(Math.max(dx,dy),0); }
  function field(x, y){
    const outer = Math.min(sdBox(x+0.5, y, 0.5, 1), Math.hypot(x,y)-1);
    const hole  = Math.min(Math.hypot(x,y)-RH, sdBox(x+RH/2, y-RH/2, RH/2, RH/2));
    const cxq = x + A, cyq = A - y;
    const cut = Math.hypot(Math.max(cxq,0),Math.max(cyq,0)) + Math.min(Math.max(cxq,cyq),0);
    return Math.max(outer, -hole, -cut);
  }

  const gl = canvas.getContext('webgl', {antialias:false, premultipliedAlpha:false});
  let prog, loc = {};
  if (!gl){ stage.classList.add('no-gl'); hero.classList.add('no-gl'); }
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
    }catch(e){ console.warn(e); stage.classList.add('no-gl'); hero.classList.add('no-gl'); prog=null; }
  }

  function draw(){
    if (!prog) return;
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

  const ease = t => t*t*(3-2*t);
  const sstep = (a,b,t) => { t=Math.min(Math.max((t-a)/(b-a),0),1); return t*t*(3-2*t); };
  function update(){
    let p = 0;
    if (!reduce.matches){
      const run = hero.offsetHeight - innerHeight;
      p = run > 0 ? Math.min(Math.max(-hero.getBoundingClientRect().top / run, 0), 1) : 0;
    }
    const e = ease(p), z = 1 + 13*e;
    view.R  = base.R * z;
    view.cx = base.cx + (W/2 - base.cx) * e;
    view.cy = base.cy + (H/2 - base.cy) * e;
    const o = 1 - sstep(0, .3, p);
    fades.forEach(el => el.style.opacity = o);
    if (altEl) altEl.textContent = String(Math.round(e*120)).padStart(3,'0');
    const d = field((W/2 - view.cx)/view.R, (H/2 - view.cy)/view.R);
    const lvl = d < OFF ? 0 : Math.floor((d - OFF)/SP) + 1;
    if (lvlEl) lvlEl.textContent = String(lvl).padStart(2,'0');
    draw();
  }

  let queued = false;
  const request = () => { if (!queued){ queued = true; requestAnimationFrame(()=>{ queued=false; update(); }); } };
  addEventListener('scroll', request, {passive:true});
  addEventListener('resize', () => { layout(); request(); });
  reduce.addEventListener?.('change', request);
  layout(); update();

  const fmt = new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Ljubljana',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
  const clocks = hero.querySelectorAll('[data-clock]');
  const tick = () => { const t = fmt.format(new Date()); clocks.forEach(c => c.textContent = t); };
  tick(); setInterval(tick, 1000);
})();
