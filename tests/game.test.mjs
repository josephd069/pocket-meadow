import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,COIN_POSITIONS,OBSTACLES} from '../dist/game-core.js';
test('the timer and player stay still until the adventure starts',()=>{
  const g=createGame();g.step(4,{x:1,z:0});assert.equal(g.state.timeRemaining,60);assert.deepEqual(g.state.player,{x:0,z:6.3});
});
test('diagonal movement has the same speed as straight movement',()=>{
  const a=createGame({obstacles:[],coins:[[8,8]],start:[0,0]}),b=createGame({obstacles:[],coins:[[8,8]],start:[0,0]});
  a.start();b.start();a.step(.3,{x:1,z:0});b.step(.3,{x:1,z:1});
  assert.ok(Math.abs(Math.hypot(a.state.player.x,a.state.player.z)-Math.hypot(b.state.player.x,b.state.player.z))<1e-8);
});
test('circle and cottage collisions stop a sprint without tunnelling',()=>{
  for(const obstacle of [{type:'circle',x:1,z:0,radius:.4},{type:'box',x:1,z:0,halfX:.4,halfZ:1}]){
    const g=createGame({obstacles:[obstacle],coins:[[8,8]],start:[0,0]});g.start();g.step(1,{x:1,z:0,sprint:true});assert.ok(g.state.player.x<.35);
  }
});
test('the island edge contains the player',()=>{
  const g=createGame({obstacles:[],coins:[[8,8]],start:[0,0],boundary:2});g.start();g.step(2,{x:1,z:0});assert.ok(g.state.player.x<=1.74);
});
test('a coin is collected once and the final collection wins immediately',()=>{
  const g=createGame({coins:[[0,0],[1,0]],obstacles:[],start:[0,0]});g.start();
  assert.equal(g.step(.02).filter(e=>e.type==='coin').length,1);assert.equal(g.step(.02).length,0);
  const events=g.step(.3,{x:1,z:0});assert.ok(events.some(e=>e.type==='won'));assert.equal(g.state.collected,2);
  const elapsed=g.state.elapsed;g.step(2,{x:1,z:0});assert.equal(g.state.elapsed,elapsed);
});
test('pause freezes both movement and time; reset restores every coin',()=>{
  const g=createGame();g.start();g.step(.3,{x:1,z:0});g.pause();const snapshot=JSON.stringify(g.state);g.step(5,{x:1,z:0});assert.equal(JSON.stringify(g.state),snapshot);
  g.resume();g.step(.1);g.reset();assert.equal(g.state.status,'ready');assert.equal(g.state.timeRemaining,60);assert.equal(g.state.collected,0);assert.ok(g.state.coins.every(c=>!c.collected));
});
test('time expiry produces one loss event and then freezes',()=>{
  const g=createGame({timeLimit:.1});g.start();assert.equal(g.step(.5).filter(e=>e.type==='lost').length,1);assert.equal(g.state.timeRemaining,0);assert.equal(g.step(1).length,0);
});
test('all twelve level coins have an unobstructed collection position',()=>{
  const g=createGame();assert.equal(COIN_POSITIONS.length,12);for(const [x,z] of COIN_POSITIONS)assert.equal(g.blocked(x,z),false,`Coin at ${x},${z} is obstructed`);assert.ok(OBSTACLES.length>10);
});
