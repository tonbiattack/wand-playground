import React from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import { byId, cast, presets, spells, type Wand } from './engine';
import { decodeWand, encodeWand, fromShareHash, toShareUrl } from './storage';
import { damageSummary, type DamageEvent } from './damage';
import { Application, Graphics } from 'pixi.js';

function App() {
  const [wand, setWand] = React.useState<Wand>(() => structuredClone(presets[0]));
  const [query, setQuery] = React.useState('');
  const [mana, setMana] = React.useState(wand.maxMana);
  const [hp, setHp] = React.useState(1000);
  const [summary, setSummary] = React.useState({total:0,hits:0,dps:0});
  const [message, setMessage] = React.useState('');
  React.useEffect(() => {
    try {
      const shared = fromShareHash(location.hash);
      if (shared) { setWand(shared); setMessage('共有された杖を読み込みました'); }
    } catch { setMessage('共有データが不正です。初期プリセットを表示しています'); }
  }, []);
  const canvas = React.useRef<HTMLCanvasElement>(null);
  const state = React.useRef({ wand, mana, hp, index: 0, cooldown: 0, firing: false, x: 700, y: 180, events: [] as DamageEvent[], bullets: [] as {x:number;y:number;vx:number;vy:number;damage:number;color:number;life:number;bounce:number;explosive:boolean;size:number}[], particles: [] as {x:number;y:number;vx:number;vy:number;life:number;maxLife:number;color:number;size:number}[], flash:0 });
  state.current.wand = wand;
  React.useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let frame = 0, last = performance.now();
    let disposed = false;
    const app = new Application();
    const graphics = new Graphics();
    const tick = (now:number) => {
      const s = state.current, dt = Math.min((now-last)/1000, .05); last = now;
      if (document.hidden) { s.firing = false; frame = requestAnimationFrame(tick); return; }
      s.mana = Math.min(s.wand.maxMana, s.mana + s.wand.regen * dt);
      s.cooldown -= dt * 1000;
      if (s.firing && s.cooldown <= 0) {
        const result = cast(s.wand,s.index,s.mana); s.index=result.next; s.mana=result.mana;
        for (const p of result.projectiles) {
          const angle = Math.atan2(s.y-180,s.x-70) + (Math.random()-.5)*(s.wand.spread+(p.spreadAdd ?? 0))*Math.PI/180;
          if (s.bullets.length < 300) s.bullets.push({x:70,y:180,vx:Math.cos(angle)*(p.speed ?? 0),vy:Math.sin(angle)*(p.speed ?? 0),damage:p.damage ?? 0,color:p.color,life:p.id === 'blade' ? .35 : 3,bounce:p.bounce ?? 0,explosive:p.explosive ?? false,size:p.id === 'orb' || p.explosive ? 8 : p.id === 'blade' ? 12 : 5});
          for (let i=0;i<4 && s.particles.length<500;i++) s.particles.push({x:70,y:180,vx:Math.cos(angle)*80+(Math.random()-.5)*120,vy:Math.sin(angle)*80+(Math.random()-.5)*120,life:.18,maxLife:.18,color:p.color,size:2+Math.random()*3});
        }
        s.cooldown = Math.max(30,s.wand.delay+(result.wrapped ? s.wand.recharge : 0));
      }
      s.flash = Math.max(0,s.flash-dt);
      graphics.clear().rect(0,0,800,360).fill(0x171d30)
        .rect(0,0,800,42).fill(0x20293a)
        .rect(0,42,12,278).fill(0x344153)
        .rect(788,42,12,278).fill(0x344153)
        .rect(0,320,800,40).fill(0x344153)
        .rect(0,320,800,4).fill(0x70867f)
        .rect(680,120,35,90).fill(0x546c80)
        .rect(680,110,35*Math.max(0,s.hp)/1000,5).fill(0xa6e0d7)
        .rect(35,174,40,12).fill(0xf4ddae);
      for (let x=45;x<780;x+=80) graphics.rect(x,48,2,270).fill({color:0x314154,alpha:.3});
      const burst = (x:number,y:number,color:number,count:number) => {
        for (let i=0;i<count && s.particles.length<500;i++) {
          const a=Math.random()*Math.PI*2, speed=45+Math.random()*180, life=.2+Math.random()*.4;
          s.particles.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life,maxLife:life,color,size:2+Math.random()*5});
        }
      };
      s.bullets = s.bullets.filter(b => {
        const previousX=b.x, previousY=b.y;
        b.x+=b.vx*dt; b.y+=b.vy*dt; b.life-=dt;
        const hit = Math.max(previousX,b.x)>=680 && Math.min(previousX,b.x)<=715 && Math.max(previousY,b.y)>=120 && Math.min(previousY,b.y)<=210;
        if (hit) { const damage=b.damage+(b.explosive ? 20 : 0); s.hp=Math.max(0,s.hp-damage); s.events.push({time:now/1000,amount:damage}); s.flash=.12; burst(b.x,b.y,b.color,b.explosive?36:12); return false; }
        const wall=b.x<12||b.x>788, floor=b.y<42||b.y>320;
        if (wall || floor) {
          if (b.bounce>0) { b.bounce--; if(wall)b.vx=-b.vx;if(floor)b.vy=-b.vy;b.x=Math.max(12,Math.min(788,b.x));b.y=Math.max(42,Math.min(320,b.y));burst(b.x,b.y,b.color,5); }
          else { burst(b.x,b.y,b.color,b.explosive?36:6); return false; }
        }
        graphics.moveTo(previousX,previousY).lineTo(b.x,b.y).stroke({width:b.size*1.2,color:b.color,alpha:.45});
        graphics.circle(b.x,b.y,b.size*1.8).fill({color:b.color,alpha:.15}).circle(b.x,b.y,b.size).fill(b.color).circle(b.x-1,b.y-1,Math.max(1,b.size*.35)).fill(0xffffff);
        if (b.life<=0 && b.explosive) burst(b.x,b.y,b.color,36);
        return b.life>0;
      });
      s.particles=s.particles.filter(p=>{p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=180*dt;if(p.life<=0)return false;graphics.rect(p.x,p.y,p.size,p.size).fill({color:p.color,alpha:p.life/p.maxLife});return true});
      if(s.flash>0) graphics.rect(676,116,43,98).fill({color:0xffffff,alpha:s.flash*2});
      setMana(Math.floor(s.mana)); setHp(s.hp); setSummary(damageSummary(s.events,now/1000)); frame=requestAnimationFrame(tick);
    };
    app.init({canvas:element,width:800,height:360,backgroundColor:0x171d30,autoStart:false,resolution:Math.min(window.devicePixelRatio || 1, 2),autoDensity:true}).then(() => {
      if (disposed) { app.destroy(false, {children:true}); return; }
      app.stage.addChild(graphics);
      last = performance.now();
      const draw = (now:number) => { tick(now); app.render(); };
      // The simulation schedules its next tick; Pixi renders each ticker frame independently.
      app.ticker.add(() => app.render());
      app.ticker.start();
      frame=requestAnimationFrame(draw);
    }).catch(() => setMessage('描画を初期化できませんでした。対応ブラウザで開き直してください'));
    return () => { disposed = true; cancelAnimationFrame(frame); if (app.renderer) app.destroy(false, {children:true}); };
  },[]);
  const aim = (e:React.PointerEvent<HTMLCanvasElement>) => {
    const r=e.currentTarget.getBoundingClientRect(); state.current.x=(e.clientX-r.left)/r.width*800; state.current.y=(e.clientY-r.top)/r.height*360;
  };
  const add = (id:string) => setWand(w => ({...w,slots:w.slots.length<w.capacity?[...w.slots,id]:w.slots}));
  return <main>
    <header><div><h1>Wand Playground</h1><p>組んで、撃って、また組み直す。</p></div><small>非公式ファン制作 / 原作とは挙動が異なります</small></header>
    <div className="layout"><section className="range"><div className="heading"><h2>試射場</h2><span>マウス長押しで発射</span></div>
      <canvas ref={canvas} width="800" height="360" onPointerDown={e=>{aim(e);state.current.firing=true;e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={aim} onPointerUp={()=>state.current.firing=false} onPointerCancel={()=>state.current.firing=false}/>
      <div className="hud"><span>マナ {mana} / {wand.maxMana}</span><span>ダミー HP {hp} / 1000</span><span>DPS {summary.dps.toFixed(1)} / 累計 {summary.total} / {summary.hits} ヒット</span><button onClick={()=>{state.current.hp=1000;state.current.bullets=[];state.current.particles=[];state.current.events=[];state.current.mana=wand.maxMana;state.current.index=0;state.current.cooldown=0;state.current.firing=false}}>リセット</button><button onPointerDown={()=>state.current.firing=true} onPointerUp={()=>state.current.firing=false} onPointerLeave={()=>state.current.firing=false} onPointerCancel={()=>state.current.firing=false}>射撃</button></div>
    </section><aside><h2>呪文</h2><input placeholder="呪文を検索" value={query} onChange={e=>setQuery(e.target.value)} /><div className="spell-list">{spells.filter(s=>s.name.includes(query)).map(s=><button key={s.id} onClick={()=>add(s.id)}><b>{s.name}</b><small>{s.description} / マナ {s.mana}</small></button>)}</div></aside>
    <section className="editor"><div className="heading"><h2>杖を編集</h2><select value={wand.name} onChange={e=>{const p=presets.find(p=>p.name===e.target.value);if(p){setWand(structuredClone(p));state.current.index=0}}}>{presets.map(p=><option key={p.name}>{p.name}</option>)}</select></div>
      <p>呪文を選んで追加。スロットを押すと削除します。</p><div className="slots">{wand.slots.map((id,i)=><button key={i} onClick={()=>setWand(w=>({...w,slots:w.slots.filter((_,j)=>i!==j)}))}><small>{i+1}</small>{byId[id]?.name ?? '不明な呪文'}<span>×</span></button>)}{Array.from({length:Math.max(0,wand.capacity-wand.slots.length)},(_,i)=><div className="empty" key={i}>＋</div>)}</div>
      <div className="stats">{([['capacity','容量',1,20],['maxMana','最大マナ',1,1000],['regen','回復 / 秒',0,500],['delay','詠唱遅延 ms',0,3000],['recharge','リチャージ ms',0,3000],['spread','拡散 °',0,180]] as const).map(([key,label,min,max])=><label key={key}>{label}<input type="number" min={min} max={max} value={wand[key]} onChange={e=>setWand(w=>({...w,[key]:Math.max(min,Math.min(max,Number(e.target.value)))}))}/></label>)}</div>
      <label><input type="checkbox" checked={wand.shuffle} onChange={e=>{state.current.index=0;setWand(w=>({...w,shuffle:e.target.checked}))}} /> シャッフル（固定シード）</label>
      <div className="hud"><button onClick={()=>{try { localStorage.setItem('wand',encodeWand(wand));setMessage('保存しました'); } catch { setMessage('保存できませんでした'); }}}>保存</button><button onClick={()=>{try{const data=localStorage.getItem('wand');if(data){setWand(decodeWand(data));setMessage('読み込みました')}else setMessage('保存データがありません')}catch{setMessage('保存データを読み込めません')}}}>読み込み</button><button onClick={async()=>{try{await navigator.clipboard.writeText(toShareUrl(wand));setMessage('共有URLをコピーしました')}catch{setMessage('URLをコピーできませんでした')}}}>共有URLをコピー</button><span role="status">{message}</span></div>
    </section></div>
  </main>;
}
createRoot(document.getElementById('root')!).render(<App />);
