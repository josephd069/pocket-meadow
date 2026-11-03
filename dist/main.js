import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createGame, COIN_POSITIONS, TREE_POSITIONS, ROCK_POSITIONS } from './game-core.js';

const $ = id => document.getElementById(id);
const canvas=$('game'), stage=$('stage'), game=createGame();
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
let motionOverride=null;
try{const saved=localStorage.getItem('pocket-meadow-motion-v1');if(saved==='on'||saved==='off')motionOverride=saved==='on';}catch{}
let motionEnabled=motionOverride??!motionPreference.matches;
const keys=new Set(), touch={x:0,y:0};
let ready=false, renderer, player, coins=[], legs=[], arms=[], particleMesh;
let frame=0,last=0,visualTime=0,stride=0,dirty=true,soundOn=false,audio;
let best=null,toastUntil=0,previousStatus='loading',helpWasRunning=false;
let viewWidth=1,viewHeight=1;
const projectedPlayer=new THREE.Vector3();
try{const saved=Number(localStorage.getItem('pocket-meadow-best-v1'));if(saved>0&&Number.isFinite(saved))best=saved;}catch{}
const formatTime=n=>`${String(Math.floor(Math.ceil(n)/60)).padStart(2,'0')}:${String(Math.ceil(n)%60).padStart(2,'0')}`;
const formatLap=n=>`${n.toFixed(1)}s`;
$('best').textContent=best===null?'—':formatLap(best);
$('progress-dots').innerHTML='<i></i>'.repeat(12);
const dots=[...$('progress-dots').children];
const world=new THREE.Scene();
world.fog=new THREE.Fog('#b7dad8',60,125);
const camera=new THREE.OrthographicCamera(-20,20,12,-12,.1,160);
camera.position.set(19,25,19);camera.lookAt(0,0,0);camera.updateMatrixWorld();
const sun=new THREE.DirectionalLight('#fff1cf',3.1);
const azimuth=THREE.MathUtils.degToRad(125),elevation=THREE.MathUtils.degToRad(55);
sun.position.set(Math.cos(azimuth)*Math.cos(elevation),Math.sin(elevation),Math.sin(azimuth)*Math.cos(elevation)).multiplyScalar(28);
sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-15,right:15,top:15,bottom:-15,near:1,far:65});
sun.shadow.bias=-.0001;sun.shadow.normalBias=.025;sun.shadow.radius=3;
world.add(sun,new THREE.HemisphereLight('#cee9ef','#6a8151',1.05));
const terrain=new THREE.Group();world.add(terrain);
const temp=new THREE.Object3D();
const particlePool=Array.from({length:72},()=>({life:0,x:0,y:0,z:0,vx:0,vy:0,vz:0}));
const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.93,flatShading:true,...extra});

function cylinder(radiusTop,radiusBottom,height,y,mat,segments=48){
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radiusTop,radiusBottom,height,segments,1),mat);
  mesh.position.y=y;mesh.receiveShadow=true;terrain.add(mesh);return mesh;
}
function terrainBuild(){
  cylinder(11.22,9.52,1.60,-.78,material('#a58061'),32);
  cylinder(11.44,11.15,.22,-.05,material('#d4bf87'),48);
  cylinder(10.94,11.1,.14,.09,material('#a2bf78'),48);
  const water=new THREE.Mesh(new THREE.PlaneGeometry(300,300),new THREE.MeshBasicMaterial({color:'#b9dcdb'}));
  water.rotation.x=-Math.PI/2;water.position.y=-.94;world.add(water);
  for(let i=0;i<3;i++){
    const ring=new THREE.Mesh(new THREE.RingGeometry(12.3+i*2.7,12.32+i*2.7,96),new THREE.MeshBasicMaterial({color:'#eef7ee',transparent:true,opacity:.30-i*.06,depthWrite:false,side:THREE.DoubleSide}));
    ring.rotation.x=-Math.PI/2;ring.position.y=-.92+i*.002;world.add(ring);
  }
}

function wake(){dirty=true;if(!frame){last=performance.now();frame=requestAnimationFrame(tick);}}
function resize(){
  if(!renderer)return;
  const {width,height}=stage.getBoundingClientRect();const aspect=width/height;
  viewWidth=width;viewHeight=height;
  const span=Math.max(width>760&&width<=1100?28.5:24,28/aspect),half=span/2;
  const shift=width>1100?3.4:width>760?5:0,vertical=width<=760&&game.state.status==='ready'?4.7:width<=760?1.1:.2;
  camera.left=-half*aspect-shift;camera.right=half*aspect-shift;
  camera.top=half+vertical;camera.bottom=-half+vertical;
  camera.updateProjectionMatrix();renderer.setSize(width,height,false);wake();
}

let templates={};
function asset(name){
  const source=templates[name];if(!source)throw new Error(`Missing Blender asset: ${name}`);
  const clone=source.clone(true);clone.position.set(0,0,0);
  clone.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  return clone;
}
function place(name,x,z,scale=1,rotation=0){
  const clone=asset(name);clone.position.set(x,.16,z);clone.scale.setScalar(scale);clone.rotation.y=rotation;world.add(clone);return clone;
}
function instances(name,placements,{castShadow=true}={}){
  const source=asset(name);source.updateMatrixWorld(true);
  source.traverse(child=>{
    if(!child.isMesh)return;
    const geometry=child.geometry.clone().applyMatrix4(child.matrixWorld);
    const mesh=new THREE.InstancedMesh(geometry,child.material,placements.length);
    for(let i=0;i<placements.length;i++){
      const p=placements[i];temp.position.set(p.x,p.y??.16,p.z);
      temp.rotation.set(0,p.angle??0,0);
      if(Array.isArray(p.scale))temp.scale.set(...p.scale);else temp.scale.setScalar(p.scale??1);
      temp.updateMatrix();mesh.setMatrixAt(i,temp.matrix);
    }
    mesh.castShadow=castShadow;mesh.receiveShadow=true;world.add(mesh);
  });
}
let seed=41;
function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
function sceneBuild(gltf){
  for(const node of gltf.scene.children)if(node.name.startsWith('Asset_'))templates[node.name]=node;
  if(Object.keys(templates).length!==10)throw new Error('The Blender asset kit is incomplete.');
  terrainBuild();
  place('Asset_Cottage',-1,-2.4);
  place('Asset_Crate',2.65,-3.2,1,.10);place('Asset_Crate',3.35,-3.3,.8,-.15);
  place('Asset_Fence',-3,-5.2,1,.05);
  for(const kind of [0,1])instances(kind?'Asset_Pine':'Asset_Tree',TREE_POSITIONS.filter(p=>p[2]===kind).map(([x,z],i)=>({x,z,scale:.88+(i%3)*.1,angle:i*1.2})));
  instances('Asset_Rock',ROCK_POSITIONS.map(([x,z,scale],i)=>({x,z,scale,angle:i*2})));
  const flowers=[],tufts=[];
  for(let i=0;i<190;i++){
    const angle=random()*Math.PI*2,r=Math.sqrt(random())*9.8;
    const x=Math.cos(angle)*r,z=Math.sin(angle)*r;
    if(game.blocked(x,z,.6)||COIN_POSITIONS.some(([cx,cz])=>Math.hypot(x-cx,z-cz)<.9))continue;
    const entry={x,z,scale:.65+random()*.55,angle:random()*6.28};
    if(i%4===0)flowers.push(entry);else tufts.push(entry);
  }
  instances('Asset_Grass',tufts,{castShadow:false});instances('Asset_Flower',flowers,{castShadow:false});
  const curve=new THREE.CatmullRomCurve3(COIN_POSITIONS.map(([x,z])=>new THREE.Vector3(x,0,z)),true,'catmullrom',.2);
  const path=curve.getPoints(80).filter(p=>!game.blocked(p.x,p.z,.35)).map((p,i)=>({x:p.x,z:p.z,y:.14,scale:[.36,.06,.30],angle:i*.4}));
  instances('Asset_Rock',path,{castShadow:false});
  player=place('Asset_Player',0,6.3,1);
  legs=['Part_Leg_L','Part_Leg_R'].map(name=>player.getObjectByName(name));
  arms=['Part_Arm_L','Part_Arm_R'].map(name=>player.getObjectByName(name));
  if([...legs,...arms].some(o=>!o))throw new Error('Player articulation is missing from the asset export.');
  coins=COIN_POSITIONS.map(([x,z],i)=>{
    const coin=place('Asset_Coin',x,z,1);coin.position.y=.62;coin.rotation.y=i*.7;
    return coin;
  });
  particleMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(.075,.075,.075),new THREE.MeshBasicMaterial({color:'#f7cf64'}),particlePool.length);
  particleMesh.frustumCulled=false;world.add(particleMesh);
  particlePool.forEach((_,i)=>{temp.scale.setScalar(0);temp.updateMatrix();particleMesh.setMatrixAt(i,temp.matrix);});
  canvas.dataset.assets='10';
}

function burst(x,z,large=false){
  let used=0;
  for(const p of particlePool){
    if(p.life>0)continue;
    const angle=Math.random()*6.28,speed=1+Math.random()*2;
    Object.assign(p,{life:.65+Math.random()*.3,x,y:large?1.6:.9,z,vx:Math.cos(angle)*speed,vy:2+Math.random()*2,vz:Math.sin(angle)*speed});
    if(++used>=(large?40:14))break;
  }
}
function updateParticles(dt){
  let any=false;
  particlePool.forEach((p,i)=>{
    if(p.life>0){p.life-=dt;p.vy-=6*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;any=true;
      temp.position.set(p.x,p.y,p.z);temp.rotation.set(p.life*3,p.life*6,0);temp.scale.setScalar(Math.max(0,p.life)*1.4);
    }else temp.scale.setScalar(0);
    temp.updateMatrix();particleMesh.setMatrixAt(i,temp.matrix);
  });particleMesh.instanceMatrix.needsUpdate=true;return any;
}
function tone(frequency,delay=0){
  if(!soundOn||!audio||audio.state!=='running')return;
  const osc=audio.createOscillator(),gain=audio.createGain(),at=audio.currentTime+delay;
  osc.type='sine';osc.frequency.setValueAtTime(frequency,at);
  gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(.09,at+.01);gain.gain.exponentialRampToValueAtTime(.0001,at+.26);
  osc.connect(gain);gain.connect(audio.destination);osc.start(at);osc.stop(at+.27);
}
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');toastUntil=performance.now()+1700;}
function setResult(kind){
  const won=kind==='won',paused=kind==='paused';
  toastUntil=0;$('toast').textContent='';$('toast').classList.remove('visible');
  $('result').hidden=false;document.querySelector('.topbar').inert=true;
  $('result-eyebrow').textContent=paused?'A MOMENT IN THE SHADE':won?'A POCKET FULL OF SUNSHINE':'THE MEADOW WILL BE HERE';
  $('result-title').textContent=paused?'Take a little breather.':won?'You found them all!':'One more little lap?';
  $('result-copy').textContent=paused?'Your adventure is paused. The coins can wait.':won?'Twelve golden moments, tucked safely away. Nicely wandered.':`Time slipped by. You found ${game.state.collected} of 12 coins — try a little dash next time.`;
  $('result-stats').innerHTML=paused?'':`<div><strong>${game.state.collected} / 12</strong><span>COINS FOUND</span></div><div><strong>${won?formatLap(game.state.elapsed):'60.0s'}</strong><span>${won?'YOUR LAP':'TIME EXPLORED'}</span></div>`;
  $('play-again').firstElementChild.textContent=paused?'Back to the meadow':'Another little adventure';
  $('result-footnote').textContent=paused?'Press Escape to hop back in.':won&&best!==null&&Math.abs(best-game.state.elapsed)<.01?'Your fastest lap yet. A little gold star for you.':'There’s always time for one more lap.';
  $('play-again').focus();
}
function closeResult(){ $('result').hidden=true;document.querySelector('.topbar').inert=false; }
function sync(){
  const s=game.state;
  stage.dataset.state=s.status;canvas.dataset.gameStatus=s.status;
  canvas.dataset.coinsCollected=String(s.collected);canvas.dataset.playerX=s.player.x.toFixed(3);canvas.dataset.playerZ=s.player.z.toFixed(3);
  $('count').innerHTML=`${s.collected} <span>/ 12</span>`;
  $('timer').textContent=formatTime(s.timeRemaining);
  document.querySelector('.timer-stat').classList.toggle('urgent',s.timeRemaining<=10);
  dots.forEach((dot,i)=>dot.classList.toggle('found',i<s.collected));
  $('mission').hidden=s.status==='ready';$('intro').inert=s.status!=='ready';
  $('pause').disabled=s.status!=='playing';$('joystick').disabled=s.status!=='playing';
  if(previousStatus!==s.status){previousStatus=s.status;resize();}
}
function startRun(){if(!ready)return;closeResult();game.start();sync();canvas.focus({preventScroll:true});wake();}
function resetRun(){
  if(!ready)return;
  keys.clear();touch.x=touch.y=0;$('joystick-knob').style.transform='';
  game.reset();coins.forEach(c=>c.visible=true);particlePool.forEach(p=>p.life=0);
  toastUntil=0;$('toast').textContent='';$('toast').classList.remove('visible');
  closeResult();game.start();sync();canvas.focus({preventScroll:true});wake();
}
function pauseRun(){if(game.state.status!=='playing')return;game.pause();keys.clear();touch.x=touch.y=0;sync();setResult('paused');wake();}
function resumeRun(){closeResult();game.resume();sync();canvas.focus({preventScroll:true});wake();}
function onGameEvents(events){
  for(const event of events){
    if(event.type==='coin'){
      coins[event.id].visible=false;if(motionEnabled)burst(event.x,event.z);
      tone(740+game.state.collected*45);tone(1110+game.state.collected*30,.075);
      if(game.state.collected===1)toast('A little treasure! 11 to go.');
      else if(game.state.collected===6)toast('Half a pocket full. Keep wandering.');
      else if(game.state.collected===11)toast('One last golden moment…');
    }
    if(event.type==='won'){
      if(best===null||game.state.elapsed<best){best=game.state.elapsed;try{localStorage.setItem('pocket-meadow-best-v1',String(best));}catch{}}
      $('best').textContent=formatLap(best);if(motionEnabled)burst(game.state.player.x,game.state.player.z,true);
      [880,1108,1318,1760].forEach((f,i)=>tone(f,i*.10));setResult('won');
    }
    if(event.type==='lost')setResult('lost');
  }
}
function tick(now){
  frame=0;if(!ready)return;const elapsed=Math.max(0,(now-last)/1000),dt=Math.min(elapsed,.05);last=now;
  const active=game.state.status==='playing';
  const beforeX=game.state.player.x,beforeZ=game.state.player.z;
  if(active){
    const right=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+touch.x;
    const up=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)+touch.y;
    onGameEvents(game.step(elapsed,{x:(right-up)*Math.SQRT1_2,z:(-right-up)*Math.SQRT1_2,sprint:keys.has('ShiftLeft')||keys.has('ShiftRight')}));
  }
  const moved=Math.hypot(game.state.player.x-beforeX,game.state.player.z-beforeZ)>.0002;
  player.position.set(game.state.player.x,.16,game.state.player.z);
  projectedPlayer.set(player.position.x,1.63,player.position.z).project(camera);
  $('player-label').hidden=false;
  $('player-label').style.left=`${(projectedPlayer.x*.5+.5)*viewWidth}px`;
  $('player-label').style.top=`${(-projectedPlayer.y*.5+.5)*viewHeight}px`;
  if(moved){
    const target=Math.atan2(game.state.player.x-beforeX,game.state.player.z-beforeZ);
    const delta=Math.atan2(Math.sin(target-player.rotation.y),Math.cos(target-player.rotation.y));
    player.rotation.y+=delta*Math.min(1,dt*15);stride+=dt*(keys.has('ShiftLeft')?15:11);
  }
  const swing=moved?Math.sin(stride)*.58:0;
  legs[0].rotation.x=swing;legs[1].rotation.x=-swing;arms[0].rotation.x=-swing*.65;arms[1].rotation.x=swing*.65;
  const ambient=motionEnabled&&(active||game.state.status==='ready');
  if(ambient){visualTime+=dt;coins.forEach((coin,i)=>{coin.rotation.y=visualTime*2.4+i*.7;coin.position.y=.62+Math.sin(visualTime*2.1+i*.8)*.18;});}
  const particles=updateParticles(dt);
  if(now>toastUntil)$('toast').classList.remove('visible');
  sync();renderer.render(world,camera);dirty=false;
  window.__sceneReady=true;
  if(active||ambient||particles||now<toastUntil)frame=requestAnimationFrame(tick);
}

const moveCodes=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight']);
window.addEventListener('keydown',event=>{
  if(!$('result').hidden&&event.key==='Tab'){event.preventDefault();$('play-again').focus();return;}
  if($('help-dialog').open||event.ctrlKey||event.metaKey||event.altKey)return;
  if(event.code==='Escape'&&!event.repeat){if(game.state.status==='paused')resumeRun();else pauseRun();return;}
  if(moveCodes.has(event.code)){event.preventDefault();keys.add(event.code);wake();}
});
window.addEventListener('keyup',event=>{keys.delete(event.code);});
window.addEventListener('blur',()=>{keys.clear();if(ready&&game.state.status==='playing')pauseRun();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseRun();});
canvas.addEventListener('pointerdown',()=>canvas.focus({preventScroll:true}));
$('start').addEventListener('click',startRun);$('restart').addEventListener('click',resetRun);
$('pause').addEventListener('click',pauseRun);
$('play-again').addEventListener('click',()=>game.state.status==='paused'?resumeRun():resetRun());
$('retry').addEventListener('click',()=>location.reload());
$('sound').addEventListener('click',async()=>{
  soundOn=!soundOn;
  if(soundOn){try{audio??=new (window.AudioContext||window.webkitAudioContext)();await audio.resume();tone(880);}catch{soundOn=false;}}
  $('sound').setAttribute('aria-pressed',String(soundOn));$('sound').setAttribute('aria-label',`Turn sound ${soundOn?'off':'on'}`);
  $('sound-waves').setAttribute('d',soundOn?'M17 8c2 2 2 6 0 8m3-11c4 4 4 10 0 14':'m17 9 5 6m0-6-5 6');
});
function updateMotionControl(){
  $('motion-label').textContent=`Motion ${motionEnabled?'on':'off'}`;
  $('motion').setAttribute('aria-pressed',String(motionEnabled));
  $('motion').setAttribute('aria-label',`Turn coin motion ${motionEnabled?'off':'on'}`);
  $('motion').title=`Turn coin motion ${motionEnabled?'off':'on'}`;
}
$('motion').addEventListener('click',()=>{
  motionEnabled=!motionEnabled;motionOverride=motionEnabled;
  try{localStorage.setItem('pocket-meadow-motion-v1',motionEnabled?'on':'off');}catch{}
  if(!motionEnabled)particlePool.forEach(p=>p.life=0);
  updateMotionControl();if(ready)wake();
});
motionPreference.addEventListener('change',()=>{if(motionOverride===null){motionEnabled=!motionPreference.matches;updateMotionControl();if(ready)wake();}});
updateMotionControl();
$('help').addEventListener('click',()=>{helpWasRunning=game.state.status==='playing';if(helpWasRunning){game.pause();keys.clear();sync();} $('help-dialog').showModal();wake();});
function closeHelp(){$('help-dialog').close();}
$('close-help').addEventListener('click',closeHelp);$('help-done').addEventListener('click',closeHelp);
$('help-dialog').addEventListener('close',()=>{if(helpWasRunning&&game.state.status==='paused'){game.resume();sync();wake();}helpWasRunning=false;});

let stickPointer=null;
const stick=$('joystick');
function stickMove(event){
  if(event.pointerId!==stickPointer)return;
  const rect=stick.getBoundingClientRect(),r=32;
  const dx=event.clientX-rect.left-rect.width/2,dy=event.clientY-rect.top-rect.height/2;
  const length=Math.hypot(dx,dy),factor=length>r?r/length:1;
  touch.x=dx*factor/r;touch.y=-dy*factor/r;
  $('joystick-knob').style.transform=`translate(${dx*factor}px,${dy*factor}px)`;wake();
}
stick.addEventListener('pointerdown',event=>{if(game.state.status!=='playing')return;event.preventDefault();stickPointer=event.pointerId;stick.setPointerCapture(event.pointerId);stickMove(event);});
stick.addEventListener('pointermove',stickMove);
function stickEnd(event){if(event.pointerId!==stickPointer)return;stickPointer=null;touch.x=touch.y=0;$('joystick-knob').style.transform='';wake();}
stick.addEventListener('pointerup',stickEnd);stick.addEventListener('pointercancel',stickEnd);stick.addEventListener('lostpointercapture',stickEnd);
new ResizeObserver(resize).observe(stage);

async function init(){
  try{
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    const gltf=await new GLTFLoader().loadAsync(new URL('./assets/meadow-kit.glb',import.meta.url).href);
    sceneBuild(gltf);ready=true;$('start').disabled=false;$('start-label').textContent='Let’s wander';
    canvas.dataset.threeRevision=THREE.REVISION;sync();resize();wake();
    window.__viewer={views:['overview'],setView(name){if(name!=='overview')throw new Error('Unknown view');resize();}};
  }catch(error){
    console.error(error);stage.dataset.state='error';$('error').hidden=false;
    $('error-message').textContent='Please try refreshing. If this keeps happening, make sure WebGL is enabled in your browser.';
    $('start-label').textContent='Meadow unavailable';
  }
}
init();
