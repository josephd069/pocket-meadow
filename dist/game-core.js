export const COIN_POSITIONS = [
  [0, 4.6], [-2.1, 4.7], [-4.4, 3], [-6, .2], [-4.2, -3.3], [-1.5, -5.3],
  [1.8, -5.1], [5.5, -3.1], [6.4, .3], [4.5, 3.4], [2.3, 1.6], [-.5, .4],
];
export const TREE_POSITIONS = [
  [-8,-3,1],[-6.3,-6.7,0],[-3.5,-8,1],[3,-7.8,0],[7.7,-4.7,1],
  [8.8,1.7,0],[6.5,6.4,1],[-7.3,5.7,0],[-8.6,1.1,1],[-3.4,8,0],[2,8.6,1],
];
export const ROCK_POSITIONS = [[-3,1.6,.85],[4,-.4,.9],[-7.1,-1.5,.7],[6.8,4.8,.6],[-.8,-7.7,.7]];
export const OBSTACLES = [
  { type:'box', x:-1, z:-2.4, halfX:1.44, halfZ:1.36 },
  ...TREE_POSITIONS.map(([x,z])=>({type:'circle',x,z,radius:.26})),
  ...ROCK_POSITIONS.map(([x,z,s])=>({type:'circle',x,z,radius:.60*s})),
  {type:'box',x:2.65,z:-3.2,halfX:.40,halfZ:.40},
  {type:'box',x:3.35,z:-3.3,halfX:.32,halfZ:.32},
  {type:'box',x:-3,z:-5.2,halfX:1.02,halfZ:.12},
];

export function createGame({coins=COIN_POSITIONS,obstacles=OBSTACLES,timeLimit=60,boundary=10.22,start=[0,6.3]}={}) {
  const state = {status:'ready',player:{x:start[0],z:start[1]},coins:[],collected:0,timeRemaining:timeLimit,elapsed:0};
  function reset(){
    state.status='ready'; state.player={x:start[0],z:start[1]};
    state.coins=coins.map(([x,z],id)=>({id,x,z,collected:false}));
    state.collected=0;state.timeRemaining=timeLimit;state.elapsed=0;
  }
  reset();
  function blocked(x,z,radius=.26){
    if(Math.hypot(x,z)>boundary-radius) return true;
    return obstacles.some(o=>o.type==='circle'
      ? Math.hypot(x-o.x,z-o.z)<o.radius+radius
      : Math.hypot(x-Math.max(o.x-o.halfX,Math.min(o.x+o.halfX,x)),z-Math.max(o.z-o.halfZ,Math.min(o.z+o.halfZ,z)))<radius);
  }
  function step(dt,input={x:0,z:0}){
    if(state.status!=='playing'||!Number.isFinite(dt)||dt<=0) return [];
    const events=[];
    const duration=Math.min(dt,state.timeRemaining);
    const length=Math.hypot(input.x||0,input.z||0);
    const speed=input.sprint?5.1:3.55;
    const vx=length>0?(input.x||0)/Math.max(1,length)*speed:0;
    const vz=length>0?(input.z||0)/Math.max(1,length)*speed:0;
    const count=Math.max(1,Math.ceil(duration/.02));
    const slice=duration/count;
    for(let i=0;i<count;i++){
      const x=state.player.x+vx*slice;
      if(!blocked(x,state.player.z))state.player.x=x;
      const z=state.player.z+vz*slice;
      if(!blocked(state.player.x,z))state.player.z=z;
      state.elapsed+=slice;
      state.timeRemaining=Math.max(0,timeLimit-state.elapsed);
      for(const coin of state.coins){
        if(!coin.collected&&Math.hypot(state.player.x-coin.x,state.player.z-coin.z)<.64){
          coin.collected=true;state.collected++;events.push({type:'coin',id:coin.id,x:coin.x,z:coin.z});
        }
      }
      if(state.collected===state.coins.length){state.status='won';events.push({type:'won'});break;}
    }
    if(state.timeRemaining<=1e-8&&state.status==='playing'){
      state.timeRemaining=0;state.status='lost';events.push({type:'lost'});
    }
    return events;
  }
  return {state,step,blocked,reset,start(){if(state.status==='ready')state.status='playing';},
    pause(){if(state.status==='playing')state.status='paused';},
    resume(){if(state.status==='paused')state.status='playing';}};
}
