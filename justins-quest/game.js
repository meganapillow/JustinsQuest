'use strict';
/* ================================================================
   GAME CONFIGURATION — edit these values to personalize the adventure.
   All distances are pixels; all durations are seconds. No assets or
   libraries are downloaded. Artwork and sounds are created locally.
   ================================================================ */
const CONFIG = {
  playerName: 'Justin', princessName: 'Megan', maxHearts: 5,
  speed: 175, jumpSpeed: 530, gravity: 1350,
  invulnerableSeconds: 2.2, enemySpeed: 27, enemyDamage: 1,
  swordCooldown: .38, swordReach: 84,
  bossHealth: { ogre: 6, necromancer: 8, knight: 8, king: 8, dragon: 10 },
  // Each boss telegraphs, attacks, then rests. Only one hit per rest.
  bossCycle: 4.8, bossRestStarts: 2.5,
  levels: [
    {name:'THE ENCHANTED FOREST', length:16000, theme:'forest', boss:'ogre',
      enemies:['slime','mushroom','goblin','slime','mushroom','goblin','slime'],
      checkpoints:[.5,.91], pits:[3100,6100,10200,13200],
      platforms:[[1200,360,180],[2600,345,220],[4500,360,210],[7300,350,200],[9100,360,220],[11500,350,230],[13800,360,200]]},
    {name:'THE HAUNTED CAVERNS', length:17500, theme:'cave', boss:'necromancer',
      enemies:['bat','skeleton','ghost','mimic','bat','skeleton','ghost','mimic'],
      checkpoints:[.5,.91], pits:[3000,6300,10400,14000],
      platforms:[[1400,360,220],[4100,340,210],[5500,360,200],[7900,350,230],[9400,360,210],[12200,340,220],[15000,360,200]]},
    {name:'THE DARK CASTLE', length:18500, theme:'castle', boss:'knight',
      enemies:['guard','imp','armor','dragonling','guard','imp','armor','dragonling','guard'],
      checkpoints:[.5,.91], pits:[3300,7100,11300,15000],
      platforms:[[1300,360,200],[2800,345,220],[4800,360,200],[6100,350,220],[8600,360,200],[10100,345,220],[12800,360,200],[15900,350,220]]}
  ],
  enemyHealth: {slime:1,mushroom:2,goblin:2,bat:1,skeleton:2,ghost:2,mimic:2,guard:2,imp:1,armor:3,dragonling:2},
  dialogue: {
    intro:["The peaceful Kingdom of Pillowvale has fallen into chaos.","The evil King Maldrake has kidnapped Princess Megan and locked her away in the highest tower of the Dark Castle.","Only one hero can save her.","Unfortunately, it's Justin."],
    forest:["Somewhere in the distance, Megan is probably wondering what's taking so long."],
    cave:["The Dark Castle is near.", 'Megan: “JUSTIN?”', 'Justin: “I\'M COMING!”', 'Megan: “OKAY WELL HURRY.”'],
    rescue:[['Megan','“OH THANK GOD.”'],['Justin','“I came to save you.”'],['Megan','“Did you bring the car?”'],['Justin','“...yes.”'],['Megan','“Perfect. Let\'s go.”']],
    signs:[
      ['Pillowvale trail. Scenic route. Very scenic.','Tina has already been here. Naturally.','Ogre ahead. Small talk not recommended.'],
      ['Please do not feed the haunted furniture.','Ghosts are shy. Their transparency is personal.','Necromancer ahead. Terrible at parties.'],
      ['Royal dress code: absolutely no heroes.','Megan has filed a complaint about the wait.','Throne room ahead. Wipe your boots.']
    ]
  }
};
const canvas=document.querySelector('#game'), ctx=canvas.getContext('2d');
ctx.imageSmoothingEnabled=false;
const $=s=>document.querySelector(s), W=960,H=540,GROUND=440;
const keys={left:false,right:false,jump:false,attack:false};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let audio, muted=false;
function sound(kind){
  if(muted)return;
  try{audio ||= new (window.AudioContext||window.webkitAudioContext)(); if(audio.state==='suspended')audio.resume();
    const notes={jump:[260,510,.12],sword:[190,65,.09],coin:[750,1200,.1],hit:[150,55,.2],defeat:[370,150,.18],win:[440,880,.5],heart:[520,800,.2]};
    const [a,b,d]=notes[kind]||notes.coin,o=audio.createOscillator(),g=audio.createGain();o.type=kind==='sword'?'sawtooth':'square';o.frequency.setValueAtTime(a,audio.currentTime);o.frequency.exponentialRampToValueAtTime(b,audio.currentTime+d);g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+d);
  }catch{} // Sound is optional on browsers without Web Audio.
}
let scene='title', levelIndex=0, world, player, boss, camera=0, elapsed=0, anim=0;
let stats={coins:0,kills:0,deaths:0}, checkpoint=60, safeX=60, toastTime=0, jumpHeld=false, bossTitleSeen=false;
let particles=[], shots=[], floating=[], stateBeforePause='play', lastTime=0, introIndex=0, rescueIndex=0;
function toast(text,duration=3){$('#toast').textContent=text;$('#toast').classList.add('show');toastTime=duration;}
function personalize(html){return html.replace(/JUSTIN|Justin|MEGAN|Megan/g, name=>{const value=/justin/i.test(name)?CONFIG.playerName:CONFIG.princessName;return escapeHTML(name===name.toUpperCase()?value.toUpperCase():value);});}
function panel(html){html=personalize(html);$('#overlay').innerHTML='<div class="panel '+(scene==='title'?'':'story')+'">'+html+'</div>';}
function button(label,fn){const b=document.createElement('button');b.className='primary';b.textContent=label;b.onclick=()=>{sound('coin');fn();};$('#overlay .panel').appendChild(b);b.focus({preventScroll:true});}
function clearInput(){Object.keys(keys).forEach(k=>keys[k]=false);jumpHeld=false;}
function resume(){scene='play';$('#overlay').innerHTML='';clearInput();canvas.focus({preventScroll:true});}
function title(){scene='title';world=null;boss=null;$('#hud').hidden=true;$('#boss-hud').hidden=true;$('#toast').classList.remove('show');panel('<div class="eyebrow">A TALE FROM THE KINGDOM OF PILLOWVALE</div><h1 class="title">JUSTIN’S<em>QUEST</em></h1><p class="subtitle">A completely serious adventure to rescue Megan.</p>');button('START ADVENTURE  →',start);$('#overlay .panel').insertAdjacentHTML('beforeend','<p class="blurb">Three dangerous lands.<br>One kidnapped princess.<br>One mildly underqualified hero.</p><span class="badge">AN ORIGINAL LITTLE LOVE STORY</span>');}
function start(){stats={coins:0,kills:0,deaths:0};elapsed=0;levelIndex=0;particles=[];shots=[];floating=[];introIndex=0;showIntro();}
function showIntro(){scene='intro';panel('<div class="eyebrow">THE STORY SO FAR</div><h1>Pillowvale needs a hero.</h1><p>'+escapeHTML(CONFIG.dialogue.intro[introIndex])+'</p><p class="fine">'+(introIndex+1)+' / '+CONFIG.dialogue.intro.length+'</p>');button(introIndex===CONFIG.dialogue.intro.length-1?'BEGIN QUEST  →':'CONTINUE  →',()=>{if(++introIndex<CONFIG.dialogue.intro.length)showIntro();else loadLevel(0);});}
// Build a level from the editable layout. Pits are only 90px wide;
// a normal jump covers about 135px, and a short coyote window helps.
function loadLevel(index,final=false){
  levelIndex=index;const cfg=CONFIG.levels[index];
  world={...cfg,length:final?1800:cfg.length,final,platforms:[],enemies:[],pickups:[],chests:[],flags:[],signs:[],cats:[]};
  let startX=0;
  for(const pit of final?[]:cfg.pits){world.platforms.push({x:startX,y:GROUND,w:pit-startX,h:160,ground:true});startX=pit+90;}
  world.platforms.push({x:startX,y:GROUND,w:world.length-startX,h:160,ground:true});
  if(!final){
    cfg.platforms.forEach(([x,y,w])=>world.platforms.push({x,y,w,h:22}));
    cfg.enemies.forEach((type,i)=>{let x=900+i*(cfg.length-2300)/cfg.enemies.length;x=groundSafe(x);world.enemies.push(makeEnemy(type,x));});
    for(let x=320;x<world.length-1000;x+=155){const plat=world.platforms.find(p=>!p.ground&&x>p.x&&x<p.x+p.w);world.pickups.push({x,y:plat?plat.y-26:GROUND-28,w:16,h:20,type:'coin'});}
    for(let x=1600;x<world.length-900;x+=1600)world.pickups.push({x:groundSafe(x),y:GROUND-25,w:20,h:20,type:'heart'});
    cfg.platforms.forEach(([x,y,w],i)=>{if(i%2===0)world.chests.push({x:x+w/2,y:y-27,w:30,h:27,opened:false,loot:['boost','coins','star'][i%3]});});
    cfg.checkpoints.forEach(p=>world.flags.push({x:groundSafe(cfg.length*p),y:GROUND,active:false}));
    [550,cfg.length*.4,cfg.length*.85].forEach((x,i)=>world.signs.push({x:groundSafe(x),text:CONFIG.dialogue.signs[index][i],read:false}));
    [1900,cfg.length*.51,cfg.length-680].forEach(x=>world.cats.push({x:groundSafe(x),y:GROUND,met:false}));
  }
  checkpoint=60;safeX=60;player={x:60,y:GROUND-46,w:28,h:46,vx:0,vy:0,facing:1,health:CONFIG.maxHearts,inv:0,attack:0,cooldown:0,grounded:true,coyote:.12,boost:0,star:0};
  shots=[];particles=[];floating=[];camera=0;bossTitleSeen=false;
  boss=makeBoss(final?'king':cfg.boss,world.length-300);$('#hud').hidden=false;$('#hero-name').textContent=CONFIG.playerName.toUpperCase();
  $('#chapter').textContent=final?'THE THRONE ROOM':String(index+1).padStart(2,'0')+' / '+cfg.name;
  resume();toast(final?'The king is expecting you. How thoughtful.':'Chapter '+(index+1)+' · '+cfg.name,4);updateHUD();
}
function groundSafe(x){return CONFIG.levels[levelIndex].pits.some(p=>x>p-70&&x<p+140)?x+210:x;}
function makeEnemy(type,x){return {type,x,y:GROUND-36,w:32,h:36,origin:x,hp:CONFIG.enemyHealth[type]||2,dir:-1,t:0,shot:2.8,hit:0,dead:false};}
function makeBoss(type,x){return {type,x,y:GROUND-86,w:type==='dragon'?135:70,h:type==='dragon'?140:86,max:CONFIG.bossHealth[type],hp:CONFIG.bossHealth[type],t:0,cycle:-1,hitCycle:-1,hit:0,active:false,attackDone:false,extraDone:false,phase:0,base:x};}
const bossNames={ogre:'THE GIANT OGRE',necromancer:'THE NECROMANCER',knight:'THE DRAGON KNIGHT',king:'KING MALDRAKE',dragon:'KING MALDRAKE · DRAGON FORM'};
function updateHUD(){if(!player)return;$('#hearts').innerHTML=Array.from({length:CONFIG.maxHearts},(_,i)=>i<player.health?'♥':'<span class="empty-heart">♥</span>').join('');$('#hearts').setAttribute('aria-label',player.health+' hearts remaining');$('#coins').textContent=stats.coins;$('#progress').style.width=clamp(player.x/world.length*100,0,100)+'%';$('#boss-hud').hidden=!(boss&&boss.active&&scene==='play');if(boss&&boss.active){$('#boss-name').textContent=bossNames[boss.type];$('#boss-health').style.width=(boss.hp/boss.max*100)+'%';$('#boss-hint').textContent=boss.t%CONFIG.bossCycle>CONFIG.bossRestStarts?(boss.type==='dragon'?'HEAD LOWERED · STRIKE!':'CATCHING HIS BREATH · STRIKE!'):'WATCH THE WARNING · MAKE SOME SPACE';}}
function hurt(){if(player.inv>0||player.star>0||scene!=='play')return;player.health=Math.max(0,player.health-CONFIG.enemyDamage);player.inv=CONFIG.invulnerableSeconds;sound('hit');burst(player.x+14,player.y+20,'#f39b99',12);if(player.health<=0)die();updateHUD();}
function die(){stats.deaths++;scene='dead';clearInput();panel('<div class="eyebrow">A SMALL SETBACK</div><h1>JUSTIN HAS FALLEN.</h1><p>Megan is still waiting.</p><p class="fine">Your checkpoint is safe. So is your dignity. Mostly.</p>');button('TRY AGAIN  ↻',retry);}
function retry(){player.x=checkpoint;player.y=GROUND-player.h;player.vy=0;player.health=CONFIG.maxHearts;player.inv=3;safeX=checkpoint;shots=[];if(boss&&boss.active){boss.hp=boss.max;boss.active=false;boss.t=0;boss.hitCycle=-1;boss.cycle=-1;boss.x=boss.base;}resume();updateHUD();toast('Back on your feet. Full hearts. You’ve got this.');}
function fall(){player.x=safeX;player.y=GROUND-player.h;player.vy=0;player.inv=2;toast('A scenic detour. Back to solid ground!');}
function burst(x,y,color,n=10){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*180,vy:-Math.random()*160,life:.5+Math.random()*.5,color});}
function label(text,x,y,color='#ffe3a1'){floating.push({text,x,y,life:1.2,color});}
function attack(){if(player.cooldown>0)return;player.attack=.2;player.cooldown=CONFIG.swordCooldown;sound('sword');const box={x:player.facing===1?player.x:player.x-CONFIG.swordReach,y:player.y-9,w:CONFIG.swordReach+player.w,h:player.h+18};
  world.enemies.forEach(e=>{if(!e.dead&&overlap(box,e)){e.hp-=player.boost>0?2:1;e.hit=.2;if(e.hp<=0){e.dead=true;stats.kills++;stats.coins+=2;burst(e.x+16,e.y+16,'#ebcb82');sound('defeat');label('+2',e.x,e.y);if(player.health<3)world.pickups.push({x:e.x,y:GROUND-25,w:20,h:20,type:'heart'});}}});
  world.chests.forEach(c=>{if(!c.opened&&overlap(box,c))openChest(c);});
  if(boss&&boss.active&&boss.t%CONFIG.bossCycle>=CONFIG.bossRestStarts&&boss.hitCycle!==boss.cycle){let target=boss.type==='dragon'?{x:boss.x-28,y:GROUND-64,w:64,h:64}:boss;if(overlap(box,target)){boss.hp--;boss.hit=.3;boss.hitCycle=boss.cycle;burst(target.x+target.w/2,target.y+30,'#ffdf8e',18);sound('defeat');if(boss.hp<=0)bossDefeated();}}
  updateHUD();
}
function openChest(c){c.opened=true;sound('heart');if(c.loot==='boost'){player.boost=20;toast('Sword boost! Double damage to small enemies for 20 seconds.');}else if(c.loot==='star'){player.star=12;toast('A lucky star! Invincible for 12 seconds.');}else{stats.coins+=15;player.health=Math.min(CONFIG.maxHearts,player.health+1);toast('Treasure! 15 coins and a little pick-me-up.');}burst(c.x,c.y,'#f9d980',18);}
function bossDefeated(){stats.kills++;sound('win');burst(boss.x,boss.y,'#ffd284',65);shots=[];$('#boss-hud').hidden=true;
  const type=boss.type;boss.active=false;
  if(type==='king'){scene='transform';panel('<div class="eyebrow">KING MALDRAKE</div><h1>“YOU FOOL.”</h1><p>Of course he has a second phase.</p>');button('OH, COME ON.  →',()=>{boss=makeBoss('dragon',world.length-320);boss.y=GROUND-boss.h;player.health=CONFIG.maxHearts;player.inv=3;resume();toast('Aim for his head when he lowers it. Full hearts, on the house!',4);});}
  else if(type==='dragon'){scene='victory';panel('<div class="eyebrow">THE KINGDOM CAN EXHALE</div><h1>KING MALDRAKE DEFEATED!</h1><p>One last staircase. One very patient princess.</p>');button('CLIMB TO THE TOWER  →',()=>{scene='climb';$('#overlay').innerHTML='';rescueIndex=0;anim=0;});}
  else if(type==='knight'){scene='cleared';panel('<div class="eyebrow">THE DRAGON KNIGHT DEFEATED</div><h1>The throne room opens.</h1><p>Megan is just one deeply unpleasant king away.</p>');button('ENTER THE THRONE ROOM  →',()=>loadLevel(2,true));}
  else {scene='cleared';panel('<div class="eyebrow">ANOTHER LAND, SLIGHTLY LESS EVIL</div><h1>'+(type==='ogre'?'FOREST CLEARED!':'CAVERNS CLEARED!')+'</h1>'+CONFIG.dialogue[type==='ogre'?'forest':'cave'].map(t=>'<p>'+escapeHTML(t)+'</p>').join(''));button('CONTINUE  →',()=>loadLevel(levelIndex+1));}
}
function showRescue(){scene='rescue';const [who,line]=CONFIG.dialogue.rescue[rescueIndex];panel('<div class="eyebrow">THE HIGHEST TOWER · AT LAST</div><div class="speaker">'+escapeHTML(who.toUpperCase())+'</div><h1 style="margin-top:18px">'+escapeHTML(line)+'</h1>');button('CONTINUE  →',()=>{if(++rescueIndex<CONFIG.dialogue.rescue.length)showRescue();else win();});}
function win(){scene='win';const time=Math.floor(elapsed/60)+':'+String(Math.floor(elapsed%60)).padStart(2,'0');panel('<div class="eyebrow">♥ MEGAN RESCUED ♥</div><h1>YOU WIN!</h1><div class="stats">'+[['Enemies defeated',stats.kills],['Coins collected',stats.coins],['Times Justin died',stats.deaths],['Total time',time],['Hearts remaining',player.health],['Boyfriend Points','+100']].map(([k,v])=>'<div><strong>'+v+'</strong><span>'+k+'</span></div>').join('')+'</div><p class="bonus">A completely successful adventure.</p>');button('ONE LAST THING…  →',()=>{scene='cat';anim=0;panel('<div class="eyebrow">AN IMPORTANT CORRECTION</div><h1>Tina defeated 0 enemies.</h1><p id="cat-credit">…</p>');});}
function end(){scene='end';panel('<div class="eyebrow">TINA DEFEATED 0 ENEMIES.</div><h1>Tina receives 100% of the credit.</h1><p>THE END</p>');button('PLAY AGAIN  ↻',start);}
function pause(){if(scene==='play'){stateBeforePause=scene;scene='paused';clearInput();panel('<div class="eyebrow">EVEN HEROES NEED A SNACK</div><h1>Adventure paused.</h1><p>Megan can wait another minute.</p>');button('KEEP GOING  →',()=>{scene=stateBeforePause;resume();});}else if(scene==='paused')resume();}
function projectile(x,y,vx,vy=0,color='#b28de0',size=13){shots.push({x,y,w:size,h:size,vx,vy,life:7,color});}
function update(dt){
  anim+=dt;if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('#toast').classList.remove('show');}
  particles=particles.filter(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=300*dt;p.life-=dt;return p.life>0;});
  floating=floating.filter(p=>{p.y-=28*dt;p.life-=dt;return p.life>0;});
  if(scene==='climb'){if(anim>2.5)showRescue();return;}if(scene==='cat'){if(anim>2.8)end();return;}if(scene!=='play')return;
  elapsed+=dt;const p=player;
  p.inv=Math.max(0,p.inv-dt);p.cooldown=Math.max(0,p.cooldown-dt);p.attack=Math.max(0,p.attack-dt);p.boost=Math.max(0,p.boost-dt);p.star=Math.max(0,p.star-dt);
  p.vx=((keys.right?1:0)-(keys.left?1:0))*CONFIG.speed;if(p.vx)p.facing=Math.sign(p.vx);
  if(p.grounded)p.coyote=.13;else p.coyote-=dt;
  if(keys.jump&&!jumpHeld&&p.coyote>0){p.vy=-CONFIG.jumpSpeed;p.grounded=false;p.coyote=0;sound('jump');}jumpHeld=keys.jump;
  const arenaStart=world.length-920;
  p.x=clamp(p.x+p.vx*dt,boss&&boss.active?arenaStart:0,world.length-p.w-20);
  const oldBottom=p.y+p.h;p.vy+=CONFIG.gravity*dt;p.y+=p.vy*dt;p.grounded=false;
  world.platforms.forEach(s=>{if(p.vy>=0&&oldBottom<=s.y+2&&p.y+p.h>=s.y&&p.x+p.w>s.x&&p.x<s.x+s.w){p.y=s.y-p.h;p.vy=0;p.grounded=true;if(s.ground&&p.x>s.x+35&&p.x<s.x+s.w-55)safeX=p.x;}});
  if(p.y>H+80)fall();
  if(keys.attack)attack();if(scene!=='play')return;
  world.flags.forEach(f=>{if(!f.active&&p.x>f.x-20){f.active=true;checkpoint=f.x+25;p.health=CONFIG.maxHearts;sound('heart');toast('CHECKPOINT · Full hearts. A fresh start.');}});
  world.signs.forEach(s=>{if(!s.read&&Math.abs(p.x-s.x)<85){s.read=true;toast(s.text,4);}});
  world.cats.forEach(c=>{if(!c.met&&Math.abs(p.x-c.x)<65){c.met=true;toast('Tina: “mrrp.”',2.5);}});
  world.pickups=world.pickups.filter(c=>{if(overlap(p,c)){if(c.type==='coin'){stats.coins++;sound('coin');}else{if(p.health>=CONFIG.maxHearts)return true;p.health++;sound('heart');label('+1 ♥',c.x,c.y,'#ff9b9b');}burst(c.x,c.y,c.type==='coin'?'#edcc79':'#ff9b9b',5);return false;}return true;});
  world.chests.forEach(c=>{if(!c.opened&&Math.abs(p.x-c.x)<40&&Math.abs(p.y-c.y)<55)openChest(c);});
  updateEnemies(dt);
  if(boss&&boss.hp>0&&p.x>arenaStart+50&&!boss.active){
    if(world.final&&boss.type==='king'&&!bossTitleSeen){bossTitleSeen=true;scene='bossTitle';panel('<div class="eyebrow">YOU HAVE AN APPOINTMENT WITH</div><h1>KING MALDRAKE</h1><p>Ruler of the Dark Kingdom<br>Stealer of Princesses<br>Generally Kind of a Dick</p>');button('LET’S GET THIS OVER WITH  →',()=>{resume();boss.active=true;p.health=CONFIG.maxHearts;});return;}
    boss.active=true;p.health=CONFIG.maxHearts;toast('Watch the warning. Strike when the boss rests!',4);
  }
  if(boss&&boss.active)updateBoss(dt);
  shots=shots.filter(s=>{s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;if(overlap(p,s)){hurt();return false;}return s.life>0&&s.x>camera-200&&s.x<camera+W+500&&s.y<580;});
  world.enemies.forEach(e=>{if(!e.dead&&overlap(p,e))hurt();});
  if(boss&&boss.active&&overlap(p,boss)&&boss.t%CONFIG.bossCycle<CONFIG.bossRestStarts)hurt();
  camera=clamp(p.x-310,0,world.length-W);updateHUD();
}
function updateEnemies(dt){world.enemies.forEach(e=>{if(e.dead||Math.abs(e.x-player.x)>850)return;e.t+=dt;e.hit=Math.max(0,e.hit-dt);e.shot-=dt;
  const dist=player.x-e.x,fly=['bat','ghost','dragonling'].includes(e.type);
  if(e.type==='mimic'&&Math.abs(dist)>170){e.y=GROUND-e.h;return;}
  let speed=CONFIG.enemySpeed*(e.type==='armor'?.65:1);
  if(['mushroom','mimic'].includes(e.type)&&Math.abs(dist)<230)e.dir=Math.sign(dist);
  if(fly){e.x+=Math.sign(dist)*speed*.7*dt;e.y=GROUND-65+Math.sin(e.t*2)*22;}else{e.x+=e.dir*speed*dt;e.y=GROUND-e.h-(e.type==='slime'?Math.max(0,Math.sin(e.t*3))*20:0);if(Math.abs(e.x-e.origin)>85)e.dir*=-1;const floor=world.platforms.find(s=>s.ground&&e.x>s.x+8&&e.x+e.w<s.x+s.w-8);if(!floor){e.dir*=-1;e.x+=e.dir*speed*dt*3;}}
  if(['goblin','imp','dragonling'].includes(e.type)&&e.shot<=0&&Math.abs(dist)<450){projectile(e.x,e.y+15,Math.sign(dist)*100,0,e.type==='goblin'?'#bbb195':'#f3a172',11);e.shot=4;}
});}
function updateBoss(dt){const b=boss;b.t+=dt;b.hit=Math.max(0,b.hit-dt);const cycle=Math.floor(b.t/CONFIG.bossCycle),t=b.t%CONFIG.bossCycle;
  if(cycle!==b.cycle){b.cycle=cycle;b.attackDone=false;b.extraDone=false;if(b.type==='necromancer'){b.x=world.length-[240,500,720][cycle%3];burst(b.x,b.y,'#c28dff',20);}else b.x=b.base;}
  if(t>=1.5&&!b.attackDone){b.attackDone=true;const dir=Math.sign(player.x-b.x)||-1;
    if(b.type==='ogre'){if(cycle%2===0){if(Math.abs(player.x-b.x)<240&&player.grounded)hurt();burst(b.x,GROUND,'#c9b98d',24);}else projectile(b.x,b.y+20,dir*125,45,'#a3a9ac',23);}
    if(b.type==='necromancer'){projectile(b.x,b.y+40,dir*100,0,'#b69bff',20);if(cycle%3===2){const skeleton=makeEnemy('skeleton',b.x-100);world.enemies.push(skeleton);}}
    if(b.type==='knight'||b.type==='king'){if(cycle%3===2&&b.type==='king')projectile(b.x,b.y+35,dir*120,0,'#e3a1ff',18);else if(cycle%2===0&&Math.abs(player.x-b.x)<130)hurt();}
    if(b.type==='dragon'){if(cycle%3===2){if(player.grounded&&Math.abs(player.x-b.x)<300)hurt();burst(b.x,GROUND,'#e2b58b',30);}else projectile(b.x-28,GROUND-55,-115,0,'#ffb36f',22);}
  }
  if(['knight','king'].includes(b.type)&&cycle%2===1&&t>1.5&&t<2.4)b.x-=110*dt;
  if(b.type==='dragon'&&cycle%3===1&&t>1.8&&t<2.3&&Math.abs(player.x-b.x)<220&&player.x<b.x&&player.y>GROUND-110)hurt();
  if(t>=CONFIG.bossRestStarts&&!b.extraDone){b.extraDone=true;if(player.health<=2)world.pickups.push({x:clamp(player.x+12,world.length-850,world.length-180),y:GROUND-24,w:22,h:22,type:'heart'});}
}
// ORIGINAL PIXEL ART. Integer rectangles keep all characters consistent.
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function poly(points,c){ctx.fillStyle=c;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
function text(t,x,y,size=14,color='#fff0c7',align='left'){ctx.fillStyle=color;ctx.font=`bold ${size}px monospace`;ctx.textAlign=align;ctx.fillText(t,x,y);}
function hero(x,y,scale=1,face=1,walking=false,attacking=false,princess=false){ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(scale*face,scale);if(face<0)ctx.translate(-28,0);const skin='#e9b88b',hair='#5f3d2c';
  if(princess){rect(3,0,22,35,hair);rect(7,5,15,15,skin);rect(17,10,3,3,'#79bdf0');rect(9,18,11,15,'#31578b');poly([[10,26],[20,26],[29,46],[1,46]],'#31578b');rect(5,42,20,3,'#d6b96c');rect(9,24,12,3,'#d6b96c');rect(3,21,5,13,skin);rect(23,21,4,13,skin);rect(5,-4,18,5,'#dbc677');rect(5,-7,4,6,'#dbc677');rect(12,-9,4,7,'#dbc677');rect(20,-7,3,6,'#dbc677');}
  else {const leg=walking?Math.round(Math.sin(anim*13)*3):0;rect(5,33,7,11+leg,'#293b38');rect(18,33,7,11-leg,'#293b38');rect(3,42+leg,10,5,'#75503a');rect(18,42-leg,11,5,'#75503a');rect(4,18,21,17,'#31563f');rect(2,19,6,12,'#467353');rect(21,19,6,12,'#467353');rect(1,29,6,6,skin);rect(22,29,6,6,skin);rect(1,27,6,3,'#76563d');rect(22,27,6,3,'#76563d');rect(4,31,21,4,'#8f6942');rect(14,31,4,4,'#dcb766');rect(6,2,18,16,skin);rect(4,0,21,6,hair);rect(4,5,4,6,hair);rect(17,8,3,3,'#7d8050');rect(7,12,17,7,'#8a4933');rect(10,17,11,4,'#8a4933');rect(14,12,6,2,skin);rect(25,27,4,18,'#a5b2ad');rect(22,31,10,3,'#d6b263');
    if(attacking){poly([[26,23],[77,7],[81,13],[30,30]],'#e3ece2');rect(28,22,7,13,'#d9b56d');}}
  ctx.restore();}
function cat(x,y,scale=1){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);rect(0,-14,22,13,'#999fa8');rect(10,-24,15,16,'#b1b5bf');poly([[10,-21],[10,-30],[17,-24]],'#a5a9b4');poly([[20,-24],[26,-30],[26,-18]],'#a5a9b4');rect(12,-18,4,4,'#8bd4ff');rect(21,-18,4,4,'#8bd4ff');rect(17,-13,3,2,'#e3afb4');rect(13,-24,3,5,'#626b7d');rect(20,-25,3,5,'#626b7d');rect(4,-12,3,8,'#626b7d');rect(10,-11,3,7,'#626b7d');rect(-5,-10,7,5,'#929aa5');rect(-8,-20,5,14,'#929aa5');rect(0,-3,8,3,'#bcc3c7');rect(15,-3,8,3,'#bcc3c7');ctx.restore();}
function tree(x,y,s=1,dark=false){const trunk=dark?'#214c47':'#58604a',leaf=dark?'#285e52':'#488463';rect(x-9*s,y-120*s,18*s,120*s,trunk);poly([[x-78*s,y-60*s],[x-48*s,y-102*s],[x-66*s,y-102*s],[x-28*s,y-146*s],[x-43*s,y-146*s],[x,y-205*s],[x+43*s,y-146*s],[x+28*s,y-146*s],[x+66*s,y-102*s],[x+48*s,y-102*s],[x+78*s,y-60*s]],leaf);rect(x-18*s,y-113*s,36*s,7*s,dark?'#316e5b':'#689b69');}
function castle(x,y,s=1){ctx.save();ctx.translate(x,y);ctx.scale(s,s);rect(0,-125,180,125,'#728782');rect(25,-168,130,168,'#82968c');for(const xx of [-18,142]){rect(xx,-195,56,195,'#647e7a');poly([[xx-8,-195],[xx+28,-250],[xx+64,-195]],'#3a6464');rect(xx+21,-170,13,30,'#29484d');rect(xx+20,-100,14,30,'#29484d');}for(let i=0;i<7;i++)rect(i*27,-140,15,20,'#8fa294');rect(70,-73,42,73,'#314d50');rect(76,-69,30,69,'#233e46');rect(161,-249,3,38,'#cabd89');rect(164,-247,25,14,'#b96e79');ctx.restore();}
function background(theme='forest',offset=0,titleMode=false){
  rect(0,0,W,H,theme==='forest'?'#82b7b5':theme==='cave'?'#242c4c':'#243a53');
  if(theme==='forest'){
    rect(0,185,W,240,'#a7c8b1');rect(735,55,50,50,'#f3dfa2');rect(745,47,30,67,'#f3dfa2');
    for(let i=0;i<7;i++){const x=((i*190-offset*.08)%1250+1250)%1250-140;rect(x,55+(i%3)*28,95,12,'#d3e2c7');rect(x+20,45+(i%3)*28,45,16,'#d3e2c7');}
    for(let i=-1;i<7;i++){let x=i*230-(offset*.12)%230;poly([[x-70,330],[x+90,150],[x+230,330]],'#73a69d');poly([[x,350],[x+130,220],[x+270,350]],'#679b90');}
    castle(670-offset*.025,326,.65);
    for(let i=-1;i<13;i++)tree(i*115-(offset*.26)%115,400,.8+(i%3)*.12,true);
    if(titleMode){rect(0,424,W,116,'#224e42');rect(0,424,W,8,'#82a465');for(let i=0;i<10;i++)tree(i<5?i*45-35:W+(i-9)*42,465,1.15+(i%2)*.2,true);}
  }else if(theme==='cave'){
    for(let i=0;i<14;i++){const x=i*95-(offset*.18)%95;poly([[x,0],[x+35,85+(i%3)*35],[x+65,0]],'#354061');poly([[x,GROUND],[x+50,270],[x+100,GROUND]],'#343e60');}
    for(let i=0;i<9;i++){const x=i*145-(offset*.28)%145;poly([[x,400],[x+13,285],[x+35,260],[x+42,390]],'#566e91');poly([[x+15,395],[x+35,278],[x+36,391]],'#7d9eaf');rect(x-5,330,5,5,'#b7d5df');}
  }else{rect(760,46,65,65,'#e5dcbc');rect(743,39,60,57,'#243a53');for(let i=0;i<9;i++)castle(i*210-(offset*.12)%210,400,.5);for(let i=-1;i<7;i++){const x=i*200-(offset*.3)%200;rect(x,130,42,310,'#405263');rect(x+5,130,32,310,'#465967');rect(x-7,124,56,16,'#62777b');rect(x+72,164,40,105,'#9a5566');poly([[x+72,269],[x+92,288],[x+112,269]],'#9a5566');rect(x+87,175,10,53,'#d2a976');} }
  if(theme!=='forest')for(let i=0;i<10;i++){let x=i*190-(offset*.5)%190;rect(x,350,8,32,'#79717b');rect(x-4,341,16,12,'#d69c66');rect(x,331+Math.sin(anim*9)*2,8,17,'#fbe3a4');}
}
function drawGround(s){let x=s.x-camera;if(x+s.w<0||x>W)return;let left=Math.max(-10,x),right=Math.min(W+10,x+s.w);const forest=world.theme==='forest';rect(left,s.y,right-left,s.h,forest?'#675c45':world.theme==='cave'?'#3a3e5b':'#495260');rect(left,s.y,right-left,8,forest?'#9bbc78':'#82818b');rect(left,s.y+8,right-left,10,forest?'#547a4f':'#656679');for(let xx=Math.floor(left/32)*32;xx<right;xx+=32){for(let yy=s.y+27;yy<Math.min(H,s.y+s.h);yy+=27){rect(xx+((yy%2)*10),yy,19,3,forest?'#827154':'#596172');rect(xx+8,yy+8,4,4,forest?'#4c4f3e':'#303e51');}}}
function drawEnemy(e){let x=e.x-camera,y=e.y;ctx.save();if(e.hit>0)ctx.globalAlpha=.5;if(e.type==='ghost')ctx.globalAlpha=.5+Math.sin(e.t*2)*.22;
  if(e.type==='slime'){rect(x,y+12,32,24,'#89b873');rect(x+5,y+5,23,24,'#a5cf86');rect(x+7,y+17,4,5,'#29494a');rect(x+23,y+17,4,5,'#29494a');rect(x+13,y+26,7,3,'#e3e4a1');}
  else if(e.type==='mushroom'){rect(x+8,y+17,18,20,'#e5d0aa');rect(x,y+6,34,16,'#bb7275');rect(x+7,y,20,12,'#bb7275');rect(x+8,y+5,6,6,'#f4dcb6');rect(x+25,y+12,6,5,'#f4dcb6');rect(x+11,y+25,3,4,'#3e4247');rect(x+22,y+25,3,4,'#3e4247');}
  else if(e.type==='mimic'){rect(x,y+7,32,29,'#9c734b');rect(x,y+7,32,5,'#e0b96e');rect(x+4,y+18,24,12,'#433746');for(let i=0;i<4;i++)rect(x+5+i*6,y+18,3,5,'#f6e8bf');rect(x+8,y+10,4,4,'#e4ba91');rect(x+23,y+10,4,4,'#e4ba91');}
  else if(['bat','dragonling'].includes(e.type)){const color=e.type==='bat'?'#a98db4':'#b97788',flap=Math.sin(anim*8)*9;poly([[x+15,y+18],[x-19,y+flap],[x-10,y+27],[x+12,y+25]],color);poly([[x+19,y+18],[x+53,y+flap],[x+44,y+27],[x+20,y+25]],color);rect(x+8,y+7,20,25,color);rect(x+11,y+14,4,4,'#f9e6b0');rect(x+23,y+14,4,4,'#f9e6b0');}
  else if(e.type==='ghost'){rect(x+4,y+3,25,31,'#b6c4e1');rect(x+8,y-1,17,8,'#b6c4e1');rect(x+9,y+12,4,6,'#415170');rect(x+21,y+12,4,6,'#415170');for(let i=0;i<3;i++)rect(x+4+i*10,y+32,5,6,'#b6c4e1');}
  else{const col=e.type==='goblin'?'#83a96b':e.type==='imp'?'#d28b73':e.type==='skeleton'?'#cfceb9':'#87929e';rect(x+7,y,20,18,col);rect(x+4,y+18,25,14,e.type==='goblin'?'#826250':'#6c758d');rect(x+5,y+31,8,7,col);rect(x+21,y+31,8,7,col);rect(x+9,y+7,5,4,'#353c4e');rect(x+22,y+7,4,4,'#353c4e');if(e.type==='armor'||e.type==='guard'){rect(x+5,y,25,6,'#c0bac0');rect(x+16,y-7,6,9,'#b5687b');rect(x+32,y+8,4,24,'#c3c9bf');}if(e.type==='imp'){poly([[x+7,y+4],[x+3,y-8],[x+16,y+1]],col);}}
  ctx.restore();}
function drawBoss(){if(!boss||boss.hp<=0)return;const b=boss,x=b.x-camera,y=b.type==='dragon'?GROUND-140:b.y,t=b.t%CONFIG.bossCycle,rest=t>=CONFIG.bossRestStarts;ctx.save();if(b.hit>0)ctx.globalAlpha=.55;
  if(b.type==='dragon'){
    poly([[x+65,y+75],[x+10,y-55],[x+107,y+10],[x+154,y-27],[x+141,y+96]],'#865a77');poly([[x+66,y+52],[x+42,y-19],[x+100,y+26]],'#b17b90');rect(x+30,y+42,102,83,'#a16b88');rect(x+54,y+74,55,54,'#d49d9b');rect(x+38,GROUND-21,34,21,'#815978');rect(x+102,GROUND-21,34,21,'#815978');let hy=rest?GROUND-62:y+26;rect(x-22,hy,75,46,'#ae7890');rect(x-40,hy+20,52,28,'#ae7890');rect(x-13,hy+11,9,8,'#f2d780');rect(x-7,hy+13,3,5,'#3d3e4b');poly([[x+9,hy],[x+24,hy-27],[x+29,hy]],'#e3c192');rect(x-30,hy+42,42,4,'#4c425c');if(rest){text('↓',x-1,hy-13,24,'#f3dc9a','center');}if(!rest&&Math.floor(b.t/CONFIG.bossCycle)%3===1&&t>1.5&&t<2.5){poly([[x-36,hy+30],[x-235,GROUND-5],[x-220,GROUND-70]],'#efb776');}}
  else if(b.type==='ogre'){rect(x+5,y+25,64,50,'#95ad7d');rect(x+9,y-6,53,40,'#a9bd8d');rect(x+3,y+64,65,14,'#8c6d59');rect(x+8,y+75,19,13,'#8fa879');rect(x+47,y+75,19,13,'#8fa879');rect(x-13,y+31,20,35,'#95ad7d');rect(x+66,y+31,18,35,'#95ad7d');rect(x+17,y+7,7,7,'#384952');rect(x+45,y+7,7,7,'#384952');rect(x+25,y+24,21,5,'#ebd7b0');rect(x+34,y-13,12,10,'#6a795e');}
  else if(b.type==='necromancer'){poly([[x+32,y-22],[x-8,y+32],[x+69,y+32]],'#9e79b4');poly([[x+16,y+18],[x+53,y+18],[x+79,y+86],[x-5,y+86]],'#765e98');rect(x+19,y+10,32,25,'#c0bec0');rect(x+25,y+16,6,7,'#624d85');rect(x+42,y+16,6,7,'#624d85');rect(x-12,y+21,5,66,'#b8a47e');rect(x-19,y+9,20,17,'#bd9bdb');}
  else{rect(x+6,y+28,61,46,'#76818c');rect(x+12,y,45,34,'#a3a9ab');rect(x+16,y+12,37,8,'#354757');rect(x+12,y+72,18,15,'#6d737f');rect(x+45,y+72,18,15,'#6d737f');rect(x-5,y+36,14,30,'#8c959c');rect(x+65,y+36,13,30,'#8c959c');rect(x-12,y+13,6,58,'#d1d6c8');rect(x-19,y+51,21,6,'#dbb879');if(b.type==='king'){rect(x+10,y-9,50,10,'#e1be76');for(let i=0;i<3;i++)rect(x+10+i*20,y-20,9,13,'#e1be76');rect(x+23,y+30,28,45,'#ac6578');}else{poly([[x+16,y],[x+6,y-18],[x+32,y-3]],'#ae8294');poly([[x+41,y],[x+63,y-18],[x+57,y+9]],'#ae8294');}}
  if(b.active){if(t<1.5){text('!',x+30,y-35,28,'#ffdc84','center');const cycle=Math.floor(b.t/CONFIG.bossCycle);let warning=b.type==='ogre'?(cycle%2===0?'JUMP!':'ROCK!'):b.type==='necromancer'?'MAGIC!':b.type==='dragon'?['FIREBALL!','FIRE BREATH!','JUMP!'][cycle%3]:cycle%2?'CHARGE!':'SWORD!';text(warning,x+30,y-57,13,'#ffe1a2','center');}else if(rest)text('PUFF…',x+34,y-20,13,'#d2edc1','center');}
  ctx.restore();}
function draw(){ctx.clearRect(0,0,W,H);
  if(['title','intro'].includes(scene)){background('forest',0,true);rect(0,0,W,H,'#123c3926');hero(170,415,1.8,1,false);cat(785,481,1.5);for(let i=0;i<25;i++){let x=(i*173)%W,y=475+(i%4)*15;rect(x,y,3,7,'#759569');rect(x-2,y-3,7,4,i%2?'#e6bb91':'#a9c797');}return;}
  if(['rescue','win','cat','end','climb'].includes(scene)){background('castle');rect(0,451,W,89,'#5d6370');rect(0,451,W,9,'#a9a299');castle(395,450,1.2);hero(scene==='climb'?250+anim*45:350,scene==='climb'?443-anim*12:405,1.2,1,scene==='climb');hero(590,397,1.3,-1,false,false,true);if(['cat','end'].includes(scene))cat(Math.min(520,220+anim*100),454,1.4);return;}
  if(!world)return;background(world.theme,camera);
  // Nearby scenery is deterministic, so exploring never changes the map.
  for(let i=Math.floor(camera/220)-1;i<(camera+W)/220+1;i++){let x=i*220-camera;if(world.theme==='forest'){if(i%3===0)tree(x,GROUND,.68);else{rect(x,GROUND-12,3,12,'#66925b');rect(x-3,GROUND-17,10,6,i%2?'#e6bd94':'#c6cee0');if(i%4===0){rect(x+55,GROUND-36,22,36,'#8fa397');rect(x+48,GROUND-42,36,8,'#a8b6a0');}}}else if(world.theme==='cave'&&i%2===0){poly([[x,GROUND],[x+12,GROUND-45],[x+27,GROUND]],'#7e84bc');poly([[x+20,GROUND],[x+32,GROUND-32],[x+45,GROUND]],'#b0a2d4');}else if(world.theme==='castle'&&i%3===0){rect(x,GROUND-36,38,36,'#606d77');rect(x+5,GROUND-40,28,5,'#8c9092');}}
  world.platforms.forEach(drawGround);
  world.signs.forEach(s=>{let x=s.x-camera;rect(x+11,GROUND-28,5,28,'#947752');rect(x,GROUND-50,37,25,'#bfaa7a');text('→',x+8,GROUND-32,16,'#405546');});
  world.flags.forEach(f=>{let x=f.x-camera;rect(x,GROUND-80,5,80,'#dcc996');poly([[x+5,GROUND-79],[x+46,GROUND-72],[x+5,GROUND-54]],f.active?'#edd083':'#8cab99');rect(x-8,GROUND-5,22,5,'#879b7c');});
  world.pickups.forEach(c=>{let x=c.x-camera,y=c.y+Math.sin(anim*3+c.x)*3;if(x<-30||x>W+30)return;if(c.type==='coin'){rect(x+4,y,9,18,'#e0aa52');rect(x+1,y+3,15,12,'#e6bd68');rect(x+6,y+3,4,11,'#fff0a4');}else{poly([[x,y+4],[x+5,y],[x+10,y+4],[x+15,y],[x+20,y+4],[x+20,y+11],[x+10,y+21],[x,y+11]],'#ee9c9b');}});
  world.chests.forEach(c=>{let x=c.x-camera;rect(x,c.y+(c.opened?10:0),30,c.opened?17:27,'#99704c');rect(x,c.y+(c.opened?10:0),30,5,'#dec581');rect(x+12,c.y+12,6,8,'#f0d99d');if(c.opened)rect(x,c.y-5,30,7,'#b48e5b');});
  world.cats.forEach(c=>cat(c.x-camera,c.y));
  world.enemies.forEach(e=>{if(!e.dead&&e.x>camera-100&&e.x<camera+W+100)drawEnemy(e);});drawBoss();
  shots.forEach(s=>{rect(s.x-camera,s.y,s.w,s.h,s.color);rect(s.x-camera+3,s.y+3,s.w-6,s.h-6,'#f5dcc2');});
  if(player){ctx.save();if(player.inv>0&&Math.floor(anim*12)%2)ctx.globalAlpha=.4;if(player.star>0){rect(player.x-camera-6,player.y-6,40,58,'#ffe89855');}hero(player.x-camera,player.y,1,player.facing,player.vx!==0,player.attack>0);ctx.restore();if(player.boost>0)text('⚔',player.x-camera+14,player.y-15,18,'#ffda85','center');}
  particles.forEach(p=>rect(p.x-camera,p.y,4,4,p.color));floating.forEach(p=>text(p.text,p.x-camera,p.y,14,p.color));
  if(boss&&boss.active){rect(world.length-930-camera,GROUND-96,5,96,'#d4b88b');}
  if(scene==='transform')rect(0,0,W,H,Math.floor(anim*5)%2?'#eedcef33':'#fff0');
}
// Keyboard and touch share the same input state. Losing focus releases
// held buttons and pauses the adventure, preventing accidental damage.
const mapping={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Space:'jump',ArrowUp:'jump',KeyW:'jump',KeyX:'attack',KeyJ:'attack'};
window.addEventListener('keydown',e=>{if(mapping[e.code]&&scene==='play'){e.preventDefault();keys[mapping[e.code]]=true;}if((e.code==='KeyP'||e.code==='Escape')&&!e.repeat)pause();});
window.addEventListener('keyup',e=>{if(mapping[e.code])keys[mapping[e.code]]=false;});
window.addEventListener('blur',()=>{clearInput();if(scene==='play')pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&scene==='play')pause();});
document.querySelectorAll('[data-key]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);if(scene==='play')keys[b.dataset.key]=true;});['pointerup','pointercancel','lostpointercapture'].forEach(event=>b.addEventListener(event,()=>keys[b.dataset.key]=false));});
$('#pause').onclick=pause;$('#mute').onclick=()=>{muted=!muted;$('#mute').innerHTML=muted?'♪ <span>Sound off</span>':'♫ <span>Sound on</span>';$('#mute').setAttribute('aria-pressed',String(muted));if(!muted)sound('coin');};
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('#game-shell').requestFullscreen();}catch{toast('Fullscreen is unavailable here. Try rotating your phone.');}};
function frame(now){const dt=Math.min((now-lastTime)/1000||0,1/30);lastTime=now;update(dt);draw();requestAnimationFrame(frame);}
document.title=CONFIG.playerName+'’s Quest';
title();requestAnimationFrame(frame);
