/* =========================================
   NieR: AUTOMATA — CREDITS BATTLE v6
   ========================================= */
'use strict';
(function () {

  let active=false, animId=null, canvas, ctx, W, H;
  let frame=0, gameOver=false, gameWon=false, gameOverTimer=0;
  let totalKilled=0, totalDestroyed=0;

  const C={
    white:'#e8e8d8',gold:'#c8a96e',accent:'#ff4655',
    blue:'#7fa7d8',orange:'#ff8c32',purple:'#9b5de5',purpleGlow:'#c77dff',
    dimWhite:'rgba(232,232,216,0.55)',
  };

  const ship={x:0,y:0,angle:0,lives:3,invTimer:0,trail:[]};
  let playerShootTimer=0;
  const playerBullets=[],enemies=[],blocks=[],enemyBullets=[],particles=[];

  // Wave system
  const WAVE_UNLOCK_PCT=0.65, SPAWN_INTERVAL=42;
  let waves=[],currentWave=0,waveSpawnQueue=[],spawnTimer=0;
  let waveKillCount=0,waveTotal=0,waveAnnounce=0,waveNumber=0;

  const keys={};
  let mouseX=0,mouseY=0;

  // ════════════════════════════════════════════
  // CANVAS
  // ════════════════════════════════════════════
  function buildCanvas(){
    canvas=document.createElement('canvas');
    canvas.id='nier-battle-canvas';
    canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:99999;pointer-events:auto;';
    document.body.appendChild(canvas);
    resize(); window.addEventListener('resize',resize);
  }
  function resize(){W=canvas.width=window.innerWidth;H=canvas.height=window.innerHeight;}

  // ════════════════════════════════════════════
  // DOM SCRAPING v6
  //
  // Approach: explicit whitelist selectors (no TreeWalker over root containers)
  // Scan the WHOLE document (not just viewport) for all pages.
  // All matched elements → hidden immediately.
  // Size-adaptive label fitting.
  // ════════════════════════════════════════════

  // Elements we NEVER want (root containers, overlays, decorative)
  const SKIP_IDS = new Set([
    'nier-battle-canvas','nier-scan-overlay','cursor','toast',
    'lightbox','app','nav','mobile-nav','hero-particles','hero-grid-bg',
  ]);
  const SKIP_CLASSES = /^(page|hero-grid-bg|hero-particles|section-line|carousel-track|carousel-dots|carousel-outer|lightbox|mobile-nav|overlay|modal|backdrop|scroll-hint)$/;

  // ── Tier definitions ──
  // Boss: important headings and key labels
  const BOSS_SEL = [
    'h1','h2',
    '.hero-title','.hero-sub','.hero-tagline',
    '.section-title','.section-label',
    '.nav-logo','.nav-cta',
    '.footer-logo',
    '.about-title','.contact-title','.page-title',
    '.projects-group-title',
    '.cv-title',
    '.about-mini-text h2, .about-mini-text h3',
  ];
  // Mini: smaller labels, buttons, links, stats, tags
  const MINI_SEL = [
    'h3','h4','h5','h6',
    '.stat-num','.stat-label',
    '.skill-pill','.skill-pill-name','.skill-pill-lvl',
    '.project-card-title','.project-list-item-title',
    '.project-card-cat','.project-card-role','.project-card-year',
    '.meta-key','.meta-val',
    '.hero-badge',
    '.filter-tab',
    '.nav-links a',
    'button:not(.hamburger):not(.carousel-arrow):not(.lightbox-close)',
    '.cv-year','.cv-role','.cv-org',
    '.contact-card-label','.contact-card-value',
    '.skill-bar-label span:first-child',
    '.footer-links a',
    '.about-name',
    'label',
  ];
  // Block: cards, paragraphs, list items, visual containers
  const BLOCK_SEL = [
    '.project-card','.project-list-item',
    '.stat-box','.contact-card',
    '.cv-item','.cv-entry',
    '.about-card','.meta-box',
    '.skill-bar-item',
    'p',
    'li:not(.nav-links li)',
    '.tag','.gallery-item',
    '.hero-scroll-hint',
    '.about-mini-cv',
    'img[src]:not([aria-hidden])',
    '.section-header',
  ];

  function getLabel(el){
    // Prefer direct text nodes first
    let t='';
    for(const n of el.childNodes){
      if(n.nodeType===Node.TEXT_NODE) t+=n.textContent;
    }
    t=t.trim();
    if(t) return t;
    // aria/alt
    const a=el.getAttribute('aria-label')||el.getAttribute('alt')||
             el.getAttribute('placeholder')||el.getAttribute('title')||'';
    if(a) return a.trim();
    // full text (short)
    return el.textContent.trim().replace(/\s+/g,' ').slice(0,32)||el.tagName;
  }

  function elVisible(el){
    const s=getComputedStyle(el);
    if(s.display==='none'||s.visibility==='hidden') return false;
    if(parseFloat(s.opacity)<0.01) return false;
    const r=el.getBoundingClientRect();
    // Include off-screen elements (other pages) — check size only
    if(r.width<6||r.height<4) return false;
    return true;
  }

  function shouldSkip(el){
    if(SKIP_IDS.has(el.id)) return true;
    const cls=(el.className&&typeof el.className==='string')?el.className.trim():'';
    if(cls && SKIP_CLASSES.test(cls.split(' ')[0])) return true;
    // Never capture full-page/full-width wrappers (more than 80% of viewport)
    const r=el.getBoundingClientRect();
    if(r.width>W*0.85&&r.height>H*0.6) return true;
    return false;
  }

  function makeEnemy(el,tier){
    if(!el||!elVisible(el)||shouldSkip(el)) return null;
    const r=el.getBoundingClientRect();
    if(r.width<8||r.height<4) return null;
    const label=getLabel(el);
    const hp=tier==='boss'
      ? Math.max(6,Math.min(16,Math.ceil(label.length/3)))
      : Math.max(3,Math.min(8, Math.ceil(label.length/6)));
    return{
      el,tier,label,
      x:-999,y:-999,
      w:Math.max(r.width,40),h:Math.max(r.height,18),
      hp,maxHp:hp,vx:0,vy:0,
      wanderAngle:Math.random()*Math.PI*2,
      shootTimer:120+Math.random()*100,
      shootPhase:0,
      shootPattern:Math.floor(Math.random()*6),
      dead:false,deathTimer:0,flashTimer:0,active:false,
    };
  }

  function makeBlock(el,seenEls){
    if(!el||seenEls.has(el)||!elVisible(el)||shouldSkip(el)) return null;
    const r=el.getBoundingClientRect();
    if(r.width<20||r.height<10) return null;
    if(r.width>W*0.85&&r.height>H*0.6) return null;
    seenEls.add(el);
    const label=getLabel(el);
    return{
      el,label,
      x:r.left,y:r.top,w:r.width,h:r.height,
      hp:Math.max(1,Math.floor((r.width*r.height)/12000)),
      dead:false,flashTimer:0,
    };
  }

  function scrapeDOM(){
    waves.length=0; blocks.length=0; enemies.length=0;

    const seenEls=new Set();
    const allBosses=[],allMinis=[];

    // Collect enemies first (they take priority; mark as seen)
    function addEnemies(sels,tier){
      sels.forEach(sel=>{
        document.querySelectorAll(sel).forEach(el=>{
          if(seenEls.has(el)) return;
          const e=makeEnemy(el,tier);
          if(!e) return;
          seenEls.add(el);
          if(tier==='boss') allBosses.push(e); else allMinis.push(e);
        });
      });
    }
    addEnemies(BOSS_SEL,'boss');
    addEnemies(MINI_SEL,'mini');

    // Blocks — skip anything that is or contains an enemy el
    const enemyElSet=new Set(seenEls);
    BLOCK_SEL.forEach(sel=>{
      document.querySelectorAll(sel).forEach(el=>{
        if(seenEls.has(el)) return;
        // Skip if a direct child is already an enemy
        if([...el.children].some(c=>enemyElSet.has(c))) return;
        const bl=makeBlock(el,seenEls);
        if(bl) blocks.push(bl);
      });
    });

    // ── Hide everything collected immediately ──
    const allEls=[...allBosses,...allMinis].map(e=>e.el).concat(blocks.map(b=>b.el));
    allEls.forEach(el=>{
      el.dataset.nierOpacity=el.style.opacity;
      el.dataset.nierVisibility=el.style.visibility;
      el.style.opacity='0';
      el.style.visibility='hidden';
    });

    // ── Build waves ──
    shuffle(allBosses); shuffle(allMinis);
    const BOSSES_PER_WAVE=3, MINIS_PER_WAVE=5;
    const totalW=Math.max(1,Math.ceil(allBosses.length/BOSSES_PER_WAVE));
    const bPool=[...allBosses], mPool=[...allMinis];
    for(let w=0;w<totalW;w++){
      const bCount=BOSSES_PER_WAVE+Math.floor(w*0.5);
      const mCount=MINIS_PER_WAVE+w;
      waves.push({bosses:bPool.splice(0,bCount),minis:mPool.splice(0,mCount)});
    }
    if(bPool.length) waves[waves.length-1].bosses.push(...bPool);
    if(mPool.length) waves[waves.length-1].minis.push(...mPool);

    launchWave(0);
  }

  function shuffle(a){
    for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  }

  // ════════════════════════════════════════════
  // WAVE MANAGEMENT
  // ════════════════════════════════════════════
  function launchWave(idx){
    if(idx>=waves.length) return;
    currentWave=idx; waveNumber=idx+1; waveAnnounce=180;
    const w=waves[idx];
    const combined=[];
    const bL=w.bosses.length,mL=w.minis.length;
    for(let i=0;i<Math.max(bL,mL);i++){
      if(i<bL) combined.push(w.bosses[i]);
      if(i<mL) combined.push(w.minis[i]);
    }
    waveSpawnQueue=combined;
    waveKillCount=0; waveTotal=combined.length;
    spawnTimer=SPAWN_INTERVAL; // spawn first immediately
  }

  function updateWaves(){
    if(waveAnnounce>0) waveAnnounce--;
    spawnTimer++;
    if(spawnTimer>=SPAWN_INTERVAL&&waveSpawnQueue.length>0){
      spawnTimer=0;
      const e=waveSpawnQueue.shift();
      spawnEnemy(e);
      enemies.push(e);
    }
    if(waveSpawnQueue.length===0&&currentWave<waves.length-1){
      const wE=[...waves[currentWave].bosses,...waves[currentWave].minis];
      const pct=waveTotal>0?wE.filter(e=>e.dead).length/waveTotal:0;
      if(pct>=WAVE_UNLOCK_PCT&&enemies.filter(e=>!e.dead&&e.active).length===0) launchWave(currentWave+1);
    }
  }

  function spawnEnemy(e){
    const side=Math.floor(Math.random()*4), m=0.12;
    if(side===0){e.x=-e.w/2;e.y=lerp(H*m,H*(1-m),Math.random());e.vx=0.9+Math.random()*0.5;e.vy=(Math.random()-.5)*0.5;}
    else if(side===1){e.x=W+e.w/2;e.y=lerp(H*m,H*(1-m),Math.random());e.vx=-(0.9+Math.random()*0.5);e.vy=(Math.random()-.5)*0.5;}
    else if(side===2){e.x=lerp(W*m,W*(1-m),Math.random());e.y=-e.h/2;e.vx=(Math.random()-.5)*0.5;e.vy=0.9+Math.random()*0.5;}
    else{e.x=lerp(W*m,W*(1-m),Math.random());e.y=H+e.h/2;e.vx=(Math.random()-.5)*0.5;e.vy=-(0.9+Math.random()*0.5);}
    e.wanderAngle=Math.atan2(e.vy,e.vx);
    e.dead=false;e.active=true;
    e.shootTimer=130+Math.random()*80;
  }

  function lerp(a,b,t){return a+(b-a)*t;}

  // ════════════════════════════════════════════
  // INPUT
  // ════════════════════════════════════════════
  function onKeyDown(e){
    keys[e.key]=true;
    if(e.key==='Escape') stopGame();
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','w','a','s','d'].includes(e.key)) e.preventDefault();
  }
  function onKeyUp(e){keys[e.key]=false;}
  function onMouseMove(e){mouseX=e.clientX;mouseY=e.clientY;}
  function bindInput(){document.addEventListener('keydown',onKeyDown);document.addEventListener('keyup',onKeyUp);canvas.addEventListener('mousemove',onMouseMove);}
  function unbindInput(){document.removeEventListener('keydown',onKeyDown);document.removeEventListener('keyup',onKeyUp);canvas.removeEventListener('mousemove',onMouseMove);}

  // ════════════════════════════════════════════
  // PLAYER BULLETS
  // ════════════════════════════════════════════
  function fireBullet(){
    const cos=Math.cos(ship.angle),sin=Math.sin(ship.angle),spd=14;
    playerBullets.push({x:ship.x+cos*14,y:ship.y+sin*14,vx:cos*spd,vy:sin*spd,dead:false});
    for(const da of[-0.18,0.18]){const a=ship.angle+da;playerBullets.push({x:ship.x+Math.cos(a)*10,y:ship.y+Math.sin(a)*10,vx:Math.cos(a)*(spd-2),vy:Math.sin(a)*(spd-2),dead:false});}
  }

  // ════════════════════════════════════════════
  // BULLET PATTERNS
  // ════════════════════════════════════════════
  function pushBullet(x,y,vx,vy,type){
    const p=type==='purple';
    enemyBullets.push({x,y,vx,vy,r:p?10:8,col:p?C.purple:C.orange,glowCol:p?C.purpleGlow:'#ffb86c',type,dead:false});
  }

  function enemyShoot(e){
    const aimAng=Math.atan2(ship.y-e.y,ship.x-e.x);
    const isBoss=e.tier==='boss';
    const wm=1+currentWave*0.09;
    const spd=(isBoss?1.7:1.35)*wm;
    e.shootPhase=(e.shootPhase||0)+1;
    const ph=e.shootPhase,pat=e.shootPattern%6;
    if(pat===0){const n=isBoss?7:5;for(let i=0;i<n;i++){const a=aimAng+(i-(n-1)/2)*0.26;pushBullet(e.x,e.y,Math.cos(a)*spd,Math.sin(a)*spd,'orange');}}
    else if(pat===1){const arms=4,base=ph*0.35;for(let i=0;i<arms;i++){const a=base+(i/arms)*Math.PI*2;pushBullet(e.x,e.y,Math.cos(a)*spd,Math.sin(a)*spd,'orange');}}
    else if(pat===2){const n=isBoss?12:8,rot=ph*0.18;for(let i=0;i<n;i++){const a=(i/n)*Math.PI*2+rot;pushBullet(e.x,e.y,Math.cos(a)*(spd*0.85),Math.sin(a)*(spd*0.85),'orange');}}
    else if(pat===3){for(let i=0;i<3;i++){const a1=ph*0.42+(i/3)*Math.PI*2,a2=-ph*0.42+(i/3)*Math.PI*2;pushBullet(e.x,e.y,Math.cos(a1)*spd,Math.sin(a1)*spd,'orange');pushBullet(e.x,e.y,Math.cos(a2)*spd,Math.sin(a2)*spd,'orange');}}
    else if(pat===4){if(isBoss){const base=ph*0.5;for(let i=0;i<2;i++){const a=base+i*Math.PI;pushBullet(e.x,e.y,Math.cos(a)*spd*0.95,Math.sin(a)*spd*0.95,'purple');pushBullet(e.x,e.y,Math.cos(a+0.14)*spd*0.78,Math.sin(a+0.14)*spd*0.78,'purple');}for(const da of[-0.22,0,0.22])pushBullet(e.x,e.y,Math.cos(aimAng+da)*spd,Math.sin(aimAng+da)*spd,'orange');}else{for(const da of[-0.12,0,0.12])pushBullet(e.x,e.y,Math.cos(aimAng+da)*spd,Math.sin(aimAng+da)*spd,'orange');}}
    else{if(isBoss){for(const da of[-0.07,0,0.07])pushBullet(e.x,e.y,Math.cos(aimAng+da)*spd*0.95,Math.sin(aimAng+da)*spd*0.95,'purple');for(const da of[-0.55,0.55])pushBullet(e.x,e.y,Math.cos(aimAng+da)*spd,Math.sin(aimAng+da)*spd,'orange');}else{for(const da of[-0.15,0.15])pushBullet(e.x,e.y,Math.cos(aimAng+da)*spd,Math.sin(aimAng+da)*spd,'orange');}}
  }

  // ════════════════════════════════════════════
  // PARTICLES
  // ════════════════════════════════════════════
  function explode(x,y,n,col,big){
    for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=0.5+Math.random()*4.5;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:25+Math.random()*55,maxLife:80,col:col||C.gold,size:big?(2+Math.random()*4):(1+Math.random()*2)});}
  }

  // ════════════════════════════════════════════
  // UPDATE
  // ════════════════════════════════════════════
  function updateShip(){
    const spd=5;
    if(keys['a']||keys['ArrowLeft'])ship.x-=spd;
    if(keys['d']||keys['ArrowRight'])ship.x+=spd;
    if(keys['w']||keys['ArrowUp'])ship.y-=spd;
    if(keys['s']||keys['ArrowDown'])ship.y+=spd;
    ship.x=Math.max(14,Math.min(W-14,ship.x));
    ship.y=Math.max(14,Math.min(H-14,ship.y));
    ship.angle=Math.atan2(mouseY-ship.y,mouseX-ship.x);
    playerShootTimer++;
    if(playerShootTimer>=8){playerShootTimer=0;fireBullet();}
    if(ship.invTimer>0)ship.invTimer--;
    ship.trail.push({x:ship.x,y:ship.y});
    if(ship.trail.length>14)ship.trail.shift();
  }

  function updatePlayerBullets(){
    for(const b of playerBullets){if(b.dead)continue;b.x+=b.vx;b.y+=b.vy;if(b.x<-10||b.x>W+10||b.y<-10||b.y>H+10)b.dead=true;}
    cull(playerBullets);
  }

  function updateEnemies(){
    for(const e of enemies){
      if(e.dead){e.deathTimer++;continue;}
      if(!e.active)continue;
      e.wanderAngle+=(Math.random()-.5)*0.07;
      const ep=90;
      if(e.x<ep)      e.wanderAngle=lerp(e.wanderAngle,0,0.1);
      if(e.x>W-ep)    e.wanderAngle=lerp(e.wanderAngle,Math.PI,0.1);
      if(e.y<ep)      e.wanderAngle=lerp(e.wanderAngle,Math.PI/2,0.1);
      if(e.y>H-ep)    e.wanderAngle=lerp(e.wanderAngle,-Math.PI/2,0.1);
      e.vx+=Math.cos(e.wanderAngle)*0.05;e.vy+=Math.sin(e.wanderAngle)*0.05;
      const maxS=e.tier==='boss'?1.4:1.9,s=Math.hypot(e.vx,e.vy);
      if(s>maxS){e.vx=e.vx/s*maxS;e.vy=e.vy/s*maxS;}
      e.x+=e.vx;e.y+=e.vy;
      const mx=e.w/2+20,my=e.h/2+20;
      if(e.x<mx){e.x=mx;e.vx=Math.abs(e.vx)*0.8;}if(e.x>W-mx){e.x=W-mx;e.vx=-Math.abs(e.vx)*0.8;}
      if(e.y<my){e.y=my;e.vy=Math.abs(e.vy)*0.8;}if(e.y>H-my){e.y=H-my;e.vy=-Math.abs(e.vy)*0.8;}
      e.shootTimer--;
      if(e.shootTimer<=0){enemyShoot(e);const base=(e.tier==='boss'?100:160)/(1+currentWave*0.1);e.shootTimer=(base+Math.random()*60);if(e.hp<e.maxHp*0.45)e.shootTimer*=0.55;}
      if(e.flashTimer>0)e.flashTimer--;
    }
    for(let i=enemies.length-1;i>=0;i--){if(enemies[i].dead&&enemies[i].deathTimer>50)enemies.splice(i,1);}
  }

  function updateEnemyBullets(){
    for(const b of enemyBullets){if(b.dead)continue;b.x+=b.vx;b.y+=b.vy;if(b.x<-40||b.x>W+40||b.y<-40||b.y>H+40)b.dead=true;}
    cull(enemyBullets);
  }
  function updateBlocks(){for(const b of blocks){if(b.flashTimer>0)b.flashTimer--;}}
  function updateParticles(){for(const p of particles){p.x+=p.vx;p.y+=p.vy;p.vx*=0.93;p.vy*=0.93;p.life--;}for(let i=particles.length-1;i>=0;i--){if(particles[i].life<=0)particles.splice(i,1);}}
  function cull(arr){for(let i=arr.length-1;i>=0;i--){if(arr[i].dead)arr.splice(i,1);}}

  // ════════════════════════════════════════════
  // COLLISIONS
  // ════════════════════════════════════════════
  function checkCollisions(){
    for(const b of playerBullets){
      if(b.dead)continue;
      for(const e of enemies){
        if(e.dead||!e.active)continue;
        if(b.x>e.x-e.w/2&&b.x<e.x+e.w/2&&b.y>e.y-e.h/2&&b.y<e.y+e.h/2){
          b.dead=true;e.hp--;e.flashTimer=6;explode(b.x,b.y,5,C.gold);
          if(e.hp<=0)killEnemy(e);break;
        }
      }
    }
    for(const b of playerBullets){
      if(b.dead)continue;
      for(const bl of blocks){
        if(bl.dead)continue;
        if(b.x>bl.x&&b.x<bl.x+bl.w&&b.y>bl.y&&b.y<bl.y+bl.h){
          b.dead=true;bl.hp--;bl.flashTimer=7;explode(b.x,b.y,3,C.white);
          if(bl.hp<=0)killBlock(bl);break;
        }
      }
    }
    for(const pb of playerBullets){
      if(pb.dead)continue;
      for(const eb of enemyBullets){
        if(eb.dead||eb.type!=='orange')continue;
        const dx=pb.x-eb.x,dy=pb.y-eb.y;
        if(dx*dx+dy*dy<(eb.r+2)*(eb.r+2)){pb.dead=true;eb.dead=true;explode(eb.x,eb.y,5,C.orange);break;}
      }
    }
    if(ship.invTimer>0)return;
    const SR=6;
    for(const b of enemyBullets){
      if(b.dead)continue;
      const dx=b.x-ship.x,dy=b.y-ship.y;
      if(dx*dx+dy*dy<(SR+b.r-5)*(SR+b.r-5)){
        if(b.type==='orange')b.dead=true;
        ship.lives--;ship.invTimer=100;explode(ship.x,ship.y,25,'#ffffff',true);
        if(ship.lives<=0){gameOver=true;gameOverTimer=0;explode(ship.x,ship.y,60,C.accent,true);}
        break;
      }
    }
    for(const b of enemyBullets){
      if(b.dead||b.type==='purple')continue;
      for(const bl of blocks){
        if(bl.dead)continue;
        if(b.x>bl.x&&b.x<bl.x+bl.w&&b.y>bl.y&&b.y<bl.y+bl.h){b.dead=true;bl.flashTimer=3;break;}
      }
    }
  }

  function killEnemy(e){
    e.dead=true;totalKilled++;waveKillCount++;
    explode(e.x,e.y,35,C.gold,true);explode(e.x,e.y,12,C.white);
  }
  function killBlock(bl){
    bl.dead=true;totalDestroyed++;
    explode(bl.x+bl.w/2,bl.y+bl.h/2,8,'rgba(232,232,216,0.9)');
  }
  function checkWin(){
    if(gameWon)return;
    const allDead=waves.every(w=>[...w.bosses,...w.minis].every(e=>e.dead));
    if(allDead&&waveSpawnQueue.length===0&&currentWave>=waves.length-1&&totalKilled>0){gameWon=true;gameOverTimer=0;}
  }

  // ════════════════════════════════════════════
  // DRAW
  // ════════════════════════════════════════════

  // Fit text inside maxW, truncating with … if needed
  function fitLabel(txt,maxW,font){
    if(!txt)return'';
    ctx.font=font;
    if(ctx.measureText(txt).width<=maxW)return txt;
    while(txt.length>1&&ctx.measureText(txt+'…').width>maxW)txt=txt.slice(0,-1);
    return txt+'…';
  }

  function drawAll(){
    ctx.clearRect(0,0,W,H);
    drawBlocks();drawEnemyBullets();drawEnemies();drawParticles();drawPlayerBullets();drawShip();drawHUD();
  }

  function drawBlocks(){
    for(const bl of blocks){
      if(bl.dead)continue;
      const fl=bl.flashTimer>0;
      ctx.save();
      ctx.fillStyle='rgba(0,0,0,0.3)';ctx.globalAlpha=fl?0.7:0.18;
      ctx.fillRect(bl.x,bl.y,bl.w,bl.h);
      ctx.strokeStyle=fl?'#ffffff':'rgba(232,232,216,0.28)';ctx.lineWidth=fl?1.5:0.5;
      ctx.globalAlpha=fl?0.85:0.22;ctx.strokeRect(bl.x,bl.y,bl.w,bl.h);
      if(bl.label&&bl.w>40&&bl.h>14){
        const fs=Math.min(8,Math.max(5,Math.floor(bl.h*0.35)));
        const font=`${fs}px "Press Start 2P",monospace`;
        const lbl=fitLabel(bl.label.toUpperCase(),bl.w-10,font);
        ctx.font=font;ctx.fillStyle=C.white;ctx.globalAlpha=fl?0.5:0.14;
        ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(lbl,bl.x+bl.w/2,bl.y+bl.h/2);
      }
      ctx.restore();
    }
  }

  function drawEnemies(){
    for(const e of enemies){
      if(e.dead){
        if(e.deathTimer<18){const a=1-e.deathTimer/18,s=1+e.deathTimer*0.28;ctx.save();ctx.globalAlpha=a;ctx.strokeStyle=C.gold;ctx.lineWidth=2;ctx.strokeRect(e.x-e.w/2*s,e.y-e.h/2*s,e.w*s,e.h*s);ctx.restore();}
        continue;
      }
      if(!e.active)continue;
      const hpR=e.hp/e.maxHp;
      const col=hpR>0.6?C.gold:hpR>0.3?'#e89050':C.accent;
      const isBoss=e.tier==='boss';
      ctx.save();

      // Background fill
      ctx.fillStyle='rgba(0,0,0,0.55)';ctx.globalAlpha=1;
      ctx.fillRect(e.x-e.w/2,e.y-e.h/2,e.w,e.h);

      // Flash
      if(e.flashTimer>0){ctx.fillStyle='rgba(255,255,255,0.15)';ctx.fillRect(e.x-e.w/2,e.y-e.h/2,e.w,e.h);}

      // Box stroke
      ctx.strokeStyle=e.flashTimer>0?'#ffffff':col;ctx.lineWidth=isBoss?1.5:1;ctx.globalAlpha=0.95;
      ctx.strokeRect(e.x-e.w/2,e.y-e.h/2,e.w,e.h);

      // Corner brackets
      const cs=isBoss?9:5;ctx.lineWidth=isBoss?2:1.5;ctx.strokeStyle=col;ctx.globalAlpha=0.95;
      [[e.x-e.w/2,e.y-e.h/2,1,1],[e.x+e.w/2,e.y-e.h/2,-1,1],[e.x-e.w/2,e.y+e.h/2,1,-1],[e.x+e.w/2,e.y+e.h/2,-1,-1]].forEach(([cx,cy,sx,sy])=>{ctx.beginPath();ctx.moveTo(cx+sx*cs,cy);ctx.lineTo(cx,cy);ctx.lineTo(cx,cy+sy*cs);ctx.stroke();});

      // ── LABEL — adaptive font size, always fits inside box ──
      if(e.label){
        // Choose font size to fill the box nicely (not too big, not too small)
        const availW=e.w-14, availH=e.h-18;
        // Start from ideal size and shrink until it fits
        let fs=isBoss?Math.min(12,Math.max(7,Math.floor(availH*0.45))):Math.min(9,Math.max(6,Math.floor(availH*0.4)));
        let font=`${fs}px "Press Start 2P",monospace`;
        let lbl=fitLabel(e.label.toUpperCase(),availW,font);
        // If still too tall, shrink font
        while(fs>5&&(fs*1.4)>availH){fs--;font=`${fs}px "Press Start 2P",monospace`;lbl=fitLabel(e.label.toUpperCase(),availW,font);}
        ctx.font=font;
        ctx.fillStyle=e.flashTimer>0?'#ffffff':col;
        ctx.globalAlpha=e.flashTimer>0?1:0.88;
        ctx.textAlign='center';ctx.textBaseline='middle';
        // Show HP only if there's room
        const showHP=availH>fs*2.8;
        ctx.fillText(lbl,e.x,showHP?e.y-fs*0.6:e.y);
        if(showHP){
          ctx.font=`5px "Press Start 2P",monospace`;
          ctx.fillStyle=col;ctx.globalAlpha=0.5;
          ctx.fillText(`HP ${e.hp}/${e.maxHp}`,e.x,e.y+fs*0.8+4);
        }
      }

      // HP bar (always shown)
      ctx.fillStyle='rgba(0,0,0,0.6)';ctx.globalAlpha=1;
      ctx.fillRect(e.x-e.w/2,e.y+e.h/2+3,e.w,4);
      ctx.fillStyle=col;ctx.fillRect(e.x-e.w/2,e.y+e.h/2+3,e.w*hpR,4);

      // Pre-shoot warning
      if(e.shootTimer<40){ctx.globalAlpha=(40-e.shootTimer)/40*0.3;ctx.fillStyle=C.accent;ctx.fillRect(e.x-e.w/2,e.y-e.h/2,e.w,e.h);}
      ctx.restore();
    }
  }

  function drawEnemyBullets(){
    for(const b of enemyBullets){
      if(b.dead)continue;
      const ip=b.type==='purple';
      ctx.save();ctx.shadowBlur=ip?18:12;ctx.shadowColor=b.glowCol;
      ctx.beginPath();ctx.arc(b.x-b.vx*4,b.y-b.vy*4,b.r*0.4,0,Math.PI*2);ctx.fillStyle=b.col;ctx.globalAlpha=0.28;ctx.fill();
      ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fillStyle=b.col;ctx.globalAlpha=0.9;ctx.fill();
      ctx.beginPath();ctx.arc(b.x,b.y,b.r*0.38,0,Math.PI*2);ctx.fillStyle='#ffffff';ctx.globalAlpha=0.6;ctx.fill();
      if(ip){ctx.strokeStyle=C.purpleGlow;ctx.lineWidth=1.5;ctx.globalAlpha=0.5;ctx.beginPath();ctx.arc(b.x,b.y,b.r+3,frame*0.06,frame*0.06+Math.PI*1.5);ctx.stroke();}
      ctx.restore();
    }
  }

  function drawPlayerBullets(){
    for(const b of playerBullets){
      if(b.dead)continue;
      const ang=Math.atan2(b.vy,b.vx);
      ctx.save();ctx.translate(b.x,b.y);ctx.rotate(ang);
      ctx.fillStyle=C.white;ctx.globalAlpha=0.95;ctx.fillRect(-8,-1.5,16,3);
      ctx.fillStyle=C.gold;ctx.globalAlpha=0.75;ctx.fillRect(4,-1,6,2);
      ctx.restore();
    }
  }

  function drawParticles(){
    for(const p of particles){ctx.save();ctx.globalAlpha=(p.life/p.maxLife)*0.88;ctx.fillStyle=p.col;ctx.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size);ctx.restore();}
  }

  function drawShip(){
    for(let i=0;i<ship.trail.length;i++){const t=ship.trail[i],a=(i/ship.trail.length)*0.38;ctx.save();ctx.globalAlpha=a;ctx.fillStyle=C.gold;ctx.fillRect(t.x-1.5,t.y-1.5,3,3);ctx.restore();}
    if(ship.invTimer>0&&Math.floor(ship.invTimer/5)%2===0)return;
    ctx.save();ctx.translate(ship.x,ship.y);ctx.rotate(ship.angle);
    ctx.strokeStyle=C.white;ctx.lineWidth=1.5;ctx.globalAlpha=1;
    ctx.beginPath();ctx.moveTo(14,0);ctx.lineTo(4,-5);ctx.lineTo(-6,-10);ctx.lineTo(-10,-6);ctx.lineTo(-6,0);ctx.lineTo(-10,6);ctx.lineTo(-6,10);ctx.lineTo(4,5);ctx.closePath();
    ctx.fillStyle='rgba(200,169,110,0.1)';ctx.fill();ctx.stroke();
    ctx.strokeStyle=C.gold;ctx.lineWidth=1;ctx.globalAlpha=0.55;
    ctx.beginPath();ctx.moveTo(0,-4);ctx.lineTo(-8,-8);ctx.stroke();
    ctx.beginPath();ctx.moveTo(0,4);ctx.lineTo(-8,8);ctx.stroke();
    ctx.beginPath();ctx.arc(0,0,2.5,0,Math.PI*2);ctx.fillStyle=C.white;ctx.globalAlpha=1;ctx.fill();
    ctx.beginPath();ctx.arc(-8,0,3+Math.sin(frame*.25)*1.5,0,Math.PI*2);ctx.fillStyle=C.accent;ctx.globalAlpha=0.75;ctx.fill();
    ctx.restore();
  }

  function drawHUD(){
    ctx.save();ctx.textBaseline='top';
    ctx.font='10px "Press Start 2P",monospace';ctx.fillStyle=C.white;ctx.globalAlpha=0.8;ctx.fillText('LIVES',18,18);
    for(let i=0;i<3;i++){ctx.globalAlpha=i<ship.lives?0.9:0.18;ctx.fillStyle=i<ship.lives?C.gold:C.white;ctx.fillText('▲',76+i*22,18);}
    ctx.font='7px "Press Start 2P",monospace';ctx.globalAlpha=0.6;
    ctx.fillStyle=C.orange;ctx.fillText('● DESTROYABLE',18,46);
    ctx.fillStyle=C.purple;ctx.fillText('● INVINCIBLE',18,60);
    ctx.fillStyle=C.blue;ctx.globalAlpha=0.7;ctx.fillText(`WAVE ${waveNumber} / ${waves.length}`,18,80);
    if(waveSpawnQueue.length>0){ctx.fillStyle=C.white;ctx.globalAlpha=0.5;ctx.fillText(`INCOMING: ${waveSpawnQueue.length}`,18,96);}

    if(waveAnnounce>0){
      const a=waveAnnounce>100?Math.min(1,(waveAnnounce-100)/30):waveAnnounce/100;
      ctx.save();ctx.font='13px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillStyle=C.gold;ctx.globalAlpha=a;ctx.fillText(`— WAVE ${waveNumber} —`,W/2,H/2-16);
      if(waveAnnounce>100){ctx.font='8px "Press Start 2P",monospace';ctx.fillStyle=C.white;ctx.globalAlpha=a*0.7;const lb=['INITIALIZING...','HOSTILES DETECTED','THREAT LEVEL RISING','CRITICAL MASS','ALL SYSTEMS FAILING'];ctx.fillText(lb[Math.min(waveNumber-1,lb.length-1)],W/2,H/2+14);}
      ctx.restore();
    }
    ctx.fillStyle=C.white;ctx.globalAlpha=0.75;ctx.font='9px "Press Start 2P",monospace';ctx.textAlign='right';
    const an=enemies.filter(e=>!e.dead&&e.active).length;
    ctx.fillText(`TARGETS  ${an+waveSpawnQueue.length}`,W-18,18);
    ctx.fillText(`DESTROYED  ${totalKilled+totalDestroyed}`,W-18,36);
    ctx.font='7px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillStyle=C.white;ctx.globalAlpha=0.27;
    ctx.fillText('WASD MOVE  ·  MOUSE AIM  ·  AUTO-FIRE  ·  ESC ABORT',W/2,H-20);
    ctx.restore();
  }

  // ════════════════════════════════════════════
  // END SCREEN
  // ════════════════════════════════════════════
  function drawEndScreen(){
    updateParticles();drawParticles();
    ctx.save();ctx.fillStyle='rgba(0,0,0,0.76)';ctx.fillRect(0,0,W,H);ctx.textAlign='center';
    if(gameWon){
      const lines=[
        {t:'— SYSTEM DESTRUCTION COMPLETE —',y:H/2-92,sz:12,c:C.gold,d:0},
        {t:'YOU CHOSE TO DESTROY EVERYTHING.',y:H/2-58,sz:8,c:C.white,d:25},
        {t:'THE DATA OF THIS PORTFOLIO HAS BEEN LOST.',y:H/2-38,sz:8,c:C.white,d:45},
        {t:'BUT PERHAPS...',y:H/2+4,sz:8,c:C.dimWhite,d:85},
        {t:'THAT IS NOT SUCH A BAD THING.',y:H/2+24,sz:8,c:C.dimWhite,d:108},
        {t:'THANK YOU, INDIEMANU.',y:H/2+72,sz:11,c:C.gold,d:155},
        {t:'[ PRESS ESC TO RESTORE ]',y:H/2+108,sz:7,c:C.white,d:205},
      ];
      lines.forEach(l=>{if(gameOverTimer<l.d)return;ctx.globalAlpha=Math.min(1,(gameOverTimer-l.d)/32);ctx.font=`${l.sz}px "Press Start 2P",monospace`;ctx.fillStyle=l.c;ctx.fillText(l.t,W/2,l.y);});
      if(gameOverTimer>8){const a=Math.min(1,(gameOverTimer-8)/22)*0.42;ctx.globalAlpha=a;ctx.strokeStyle=C.gold;ctx.lineWidth=1;[H/2-106,H/2+48].forEach(y=>{ctx.beginPath();ctx.moveTo(W/2-260,y);ctx.lineTo(W/2+260,y);ctx.stroke();});}
    }else{
      const a=Math.min(1,gameOverTimer/32);ctx.globalAlpha=a;
      ctx.font='13px "Press Start 2P",monospace';ctx.fillStyle=C.accent;ctx.fillText('MISSION FAILED',W/2,H/2-44);
      ctx.font='8px "Press Start 2P",monospace';ctx.fillStyle=C.white;ctx.globalAlpha=a*0.7;ctx.fillText('THE PORTFOLIO SURVIVED YOUR ASSAULT.',W/2,H/2+2);
      ctx.font='7px "Press Start 2P",monospace';ctx.globalAlpha=a*0.42;ctx.fillText('[ PRESS ESC TO RETREAT ]',W/2,H/2+44);
    }
    ctx.restore();
  }

  // ════════════════════════════════════════════
  // MAIN LOOP
  // ════════════════════════════════════════════
  function loop(){
    if(!active)return;
    frame++;
    if(gameOver||gameWon){ctx.clearRect(0,0,W,H);drawEndScreen();gameOverTimer++;if(gameOverTimer>340)stopGame();animId=requestAnimationFrame(loop);return;}
    updateWaves();updateShip();updatePlayerBullets();updateEnemies();updateEnemyBullets();updateBlocks();updateParticles();checkCollisions();checkWin();drawAll();
    animId=requestAnimationFrame(loop);
  }

  // ════════════════════════════════════════════
  // START / STOP
  // ════════════════════════════════════════════
  function startGame(){
    if(active)return;
    active=true;gameOver=false;gameWon=false;gameOverTimer=0;
    totalKilled=0;totalDestroyed=0;frame=0;
    waves.length=0;waveSpawnQueue.length=0;currentWave=0;waveNumber=0;

    buildCanvas();
    ctx=canvas.getContext('2d');
    mouseX=window.innerWidth/2;mouseY=window.innerHeight/2;
    bindInput();

    // Scrape AFTER canvas exists
    enemies.length=0;blocks.length=0;
    playerBullets.length=0;enemyBullets.length=0;particles.length=0;
    scrapeDOM();

    ship.x=W/2;ship.y=H*0.75;ship.lives=3;ship.invTimer=80;ship.trail.length=0;

    document.body.style.cursor='none';
    const cur=document.getElementById('cursor');if(cur)cur.style.display='none';

    const scan=document.createElement('div');
    scan.id='nier-scan-overlay';
    scan.style.cssText='position:fixed;inset:0;z-index:99998;pointer-events:none;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.03) 2px,rgba(0,0,0,0.03) 4px);';
    document.body.appendChild(scan);

    animId=requestAnimationFrame(loop);
  }

  function stopGame(){
    active=false;
    if(animId){cancelAnimationFrame(animId);animId=null;}
    unbindInput();
    window.removeEventListener('resize',resize);
    if(canvas){canvas.remove();canvas=null;}
    const scan=document.getElementById('nier-scan-overlay');if(scan)scan.remove();
    document.body.style.cursor='';
    const cur=document.getElementById('cursor');if(cur)cur.style.display='';
    // Restore all DOM elements
    document.querySelectorAll('[data-nier-opacity]').forEach(el=>{
      el.style.opacity=el.dataset.nierOpacity||'';
      el.style.visibility=el.dataset.nierVisibility||'';
      delete el.dataset.nierOpacity;delete el.dataset.nierVisibility;
    });
  }

  window.startNierBattle=startGame;
  window.stopNierBattle=stopGame;
})();
