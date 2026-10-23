import {LEVELS,makeLevel} from './levels.js';

const $=id=>document.getElementById(id);
const screens=['menu','pause','result','gameover'];
const show=id=>{for(const name of screens) $(name).classList.toggle('hidden',name!==id);};
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const assetNames=['sky','island','island-medium','island-small','coin','mushroom','ladder','bridge','sign','checkpoint','portal','pip','bramble','mallow'];

class Orchard extends Phaser.Scene {
  constructor(){super('Orchard');this.levelIndex=0;this.phase='menu';this.coinsTotal=0;this.health=3;this.held={left:false,right:false,jump:false};this.lastGround=0;this.lastJumpPress=-1000;this.jumps=0;this.invulnerableUntil=0;this.soundContext=null;}
  preload(){
    for(const name of assetNames) this.load.image(name,`./assets/${name}.png`);
    for(const spec of LEVELS.slice(1)){
      this.load.image(`sky-${spec.slug}`,`./assets/worlds/${spec.slug}-sky.png`);
      for(const size of ['large','medium','small'])this.load.image(`island-${spec.slug}-${size}`,`./assets/worlds/${spec.slug}-${size}.png`);
    }
    for(const spec of LEVELS.slice(2))this.load.image(`landmark-${spec.slug}`,`./assets/worlds/${spec.slug}-landmark.png`);
    for(const key of ['pip-idle','pip-walk','bramble-walk','mallow-idle']){
      this.load.atlas(key,`./assets/animations/${key}.png`,`./assets/animations/${key}.json`);
      this.load.json(key+'-data',`./assets/animations/${key}.json`);
    }
    for(const key of ['pip','bramble','mallow'])this.load.json(key+'-export',`./assets/animations/${key}-export.json`);
    this.load.on('loaderror',file=>console.warn('Art unavailable:',file.key));
  }
  create(){
    this.makeFallbacks();
    this.registerAnimations();
    this.keys=this.input.keyboard.addKeys('A,D,W,SPACE,UP,LEFT,RIGHT,ESC');
    this.input.keyboard.on('keydown-ESC',()=>{if(this.phase==='playing')this.pause();else if(this.phase==='paused')this.resume();});
    this.bindUI();
    this.buildLevel(0);
    this.physics.pause();
    this.phase='menu';show('menu');$('hud').classList.add('hidden');
    this.input.addPointer(2);
  }
  registerAnimations(){
    for(const key of ['pip-idle','pip-walk','bramble-walk','mallow-idle']){
      const data=this.cache.json.get(key+'-data');
      if(!data||!this.textures.exists(key))continue;
      for(const [name,def] of Object.entries(data.animations||{})){
        const animKey=key.replace('-',':');
        if(!this.anims.exists(animKey))this.anims.create({key:animKey,frames:def.frames.map(frame=>({key,frame})),frameRate:def.fps,repeat:def.loop?-1:0});
      }
    }
  }
  applyExportBody(sprite,character,animation){
    const exportData=this.cache.json.get(character+'-export');
    const body=exportData?.payload?.animations?.[animation]?.collisionBody;
    if(body?.kind!=='rect')return false;
    const size=exportData.payload.frameSize;
    sprite.body.setSize(body.hw*2*size,body.hh*2*size).setOffset((body.cx-body.hw)*size,(body.cy-body.hh)*size);
    return true;
  }
  makeFallbacks(){
    const g=this.make.graphics({x:0,y:0,add:false});
    g.fillStyle(0xffffff).fillRect(0,0,4,4).generateTexture('pixel',4,4);g.clear();
    const colors={sky:0x9ce4fa,island:0x69452e,'island-medium':0x69452e,'island-small':0x69452e,coin:0xffc23f,mushroom:0xf26755,ladder:0xb2763e,bridge:0xb2763e,sign:0xae7b49,checkpoint:0xffd44b,portal:0xffd258,pip:0xe79051,bramble:0x9e63ba,mallow:0xffffff};
    for(const name of assetNames){
      if(this.textures.exists(name))continue;
      g.fillStyle(colors[name]).fillRoundedRect(5,5,54,54,18);
      if(name==='pip'){g.fillTriangle(10,16,18,0,28,18).fillTriangle(36,18,48,0,55,18);g.fillStyle(0xffffff).fillCircle(41,29,8);}
      g.generateTexture(name,64,64);g.clear();
    }
    g.destroy();
  }
  bindUI(){
    $('startButton').onclick=()=>{this.coinsTotal=0;this.start(0);};
    $('continueButton').onclick=()=>{this.coinsTotal=0;this.start(Math.min(9,Number(localStorage.getItem('skyOrchardUnlocked')||0)));};
    $('pauseButton').onclick=()=>this.pause();
    $('resumeButton').onclick=()=>this.resume();
    $('restartButton').onclick=()=>{this.coinsTotal=this.levelStartCoins;this.start(this.levelIndex);};
    $('retryButton').onclick=()=>{this.coinsTotal=this.levelStartCoins;this.start(this.levelIndex);};
    $('nextButton').onclick=()=>{if(this.levelIndex===9)this.toMenu();else this.start(this.levelIndex+1);};
    for(const id of ['menuButton','resultMenuButton','overMenuButton']) $(id).onclick=()=>this.toMenu();
    const bind=(id,key)=>{
      const el=$(id);
      el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture(e.pointerId);this.held[key]=true;if(key==='jump')this.lastJumpPress=this.time.now;});
      for(const type of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(type,()=>this.held[key]=false);
    };
    bind('leftButton','left');bind('rightButton','right');bind('jumpButton','jump');
    if(Number(localStorage.getItem('skyOrchardUnlocked')||0)>0)$('continueButton').classList.remove('hidden');
  }
  start(index){
    this.levelStartCoins=this.coinsTotal;
    this.levelIndex=index;this.health=3;this.seeds=0;this.jumps=0;this.invulnerableUntil=0;this.lastSpringAt=0;this.springBoostUntil=0;
    this.buildLevel(index);
    this.phase='playing';this.physics.resume();show(null);
    $('hud').classList.remove('hidden');
    $('touchControls').classList.toggle('hidden',!window.matchMedia('(pointer: coarse)').matches);
    this.updateHud();
    this.toast(`${String(index+1).padStart(2,'0')} · ${LEVELS[index].name}\n${LEVELS[index].subtitle}`,2200);
  }
  clearLevel(){
    for(const collider of this.colliders||[])collider.destroy();
    this.colliders=[];
    this.player?.destroy();this.player=null;
    this.exit?.destroy();this.exit=null;
    for(const key of ['scenery','platforms','coins','enemies','hazards','checkpoints','springPads','bridges','actors','effects','particles']){
      if(this[key]){this[key].destroy(true);this[key]=null;}
    }
    this.tweens.killAll();
  }
  buildLevel(index){
    this.clearLevel();
    const level=this.level=makeLevel(index), spec=level.spec;
    this.cameras.main.setBackgroundColor(spec.sky);
    this.physics.world.setBounds(0,0,level.width,level.height);
    this.scenery=this.add.group();
    this.particles=this.add.group();
    const themedSky=`sky-${spec.slug}`;
    const backdrop=this.add.image(480,270,this.textures.exists(themedSky)?themedSky:'sky').setDisplaySize(960,540).setScrollFactor(0).setDepth(-100);
    this.scenery.add(backdrop);
    this.addAtmosphere(index);
    this.platforms=this.physics.add.staticGroup();
    this.springPads=this.physics.add.staticGroup();
    this.bridges=this.add.group();
    this.effects=this.add.group();
    level.platforms.forEach((p,i)=>{
      const size=p.w>345?'large':p.w<250?'small':'medium';
      const themedIsland=`island-${spec.slug}-${size}`;
      const islandKey=this.textures.exists(themedIsland)?themedIsland:size==='large'?'island':size==='small'?'island-small':'island-medium';
      const artHeight=clamp(p.w*.36,92,153);
      const art=this.add.image(p.x+p.w*.5,p.y-27+artHeight/2,islandKey).setDisplaySize(p.w,artHeight).setDepth(-1);
      this.effects.add(art);
      const body=this.platforms.create(p.x+p.w/2,p.y+7,'pixel').setVisible(false).setDisplaySize(p.w,18).refreshBody();
      if(p.moving){
        // Short, slow horizontal movement; the same displacement is applied to art and collider.
        const motion={value:0};
        this.tweens.add({targets:motion,value:36,duration:1700,yoyo:true,repeat:-1,ease:'Sine.easeInOut',onUpdate:()=>{
          const x=p.x+p.w/2+motion.value;body.x=x;body.refreshBody();art.x=x;
        }});
      }
      if(i>0&&i%3===1){
        if(index===0 || spec.surface==='spring'){
          const m=this.add.image(p.x+Math.min(p.w*.28,86),p.y-16,'mushroom').setDisplaySize(spec.surface==='spring'?43:35,spec.surface==='spring'?47:39).setDepth(1);this.effects.add(m);
          if(spec.surface==='spring')this.springPads.create(m.x,p.y-38,'pixel').setVisible(false).setDisplaySize(41,14).refreshBody();
        }
      }
      if(index>0&&!p.moving&&(i===0||i%3===1))this.addLandmark(index,p,i);
      if(index===0&&i>0&&i%4===0){
        const ladder=this.add.image(p.x+32,p.y+57,'ladder').setDisplaySize(26,98).setDepth(0);this.effects.add(ladder);
      }
      if(index===0&&i>0&&i<level.platforms.length-1&&i%5===0){
        const sign=this.add.image(p.x+p.w-45,p.y-25,'sign').setDisplaySize(50,60).setDepth(2);this.effects.add(sign);
      }
      if(i>0 && p.bridge && Math.abs(p.y-level.platforms[i-1].y)<28){
        const prev=level.platforms[i-1],gap=p.x-(prev.x+prev.w);
        const bx=prev.x+prev.w+gap/2,by=(prev.y+p.y)/2;
        const bridge=this.add.image(bx,by+1,'bridge').setDisplaySize(gap+12,28).setDepth(1);this.bridges.add(bridge);
        this.platforms.create(bx,by+5,'pixel').setVisible(false).setDisplaySize(gap,13).refreshBody();
      }
    });
    this.coins=this.physics.add.staticGroup();
    for(const c of level.coins){
      const coin=this.coins.create(c.x,c.y,'coin').setDisplaySize(c.seed?43:29,c.seed?43:29).refreshBody();
      coin.setData('seed',c.seed);coin.setDepth(3);
      if(c.seed){coin.setTint(0xfff095);this.tweens.add({targets:coin,angle:8,yoyo:true,repeat:-1,duration:900});}
      else this.tweens.add({targets:coin,scaleX:coin.scaleX*.88,scaleY:coin.scaleY*1.06,yoyo:true,repeat:-1,duration:800+Math.floor(c.x)%300});
    }
    this.checkpoints=this.physics.add.staticGroup();
    for(const c of level.checkpoints){
      const check=this.checkpoints.create(c.x,c.y-34,'checkpoint').setDisplaySize(55,68).refreshBody().setDepth(2);
      check.setData('active',false);
    }
    this.hazards=this.physics.add.staticGroup();
    for(const h of level.thorns){
      const thorn=this.hazards.create(h.x,h.y-12,'bramble').setDisplaySize(35,28).refreshBody().setDepth(2).setTint(0xc06aae);
      thorn.body.setSize(thorn.width*.65,thorn.height*.5).setOffset(thorn.width*.175,thorn.height*.5).updateFromGameObject();
    }
    this.enemies=this.physics.add.group({allowGravity:true});
    for(const e of level.enemies){
      const animated=this.textures.exists('bramble-walk');
      const foe=this.enemies.create(e.x,e.y,animated?'bramble-walk':'bramble').setDisplaySize(53,53).setDepth(3);
      // A compact feet-first body keeps the animated sprite standing on its island.
      if(animated){foe.play('bramble:walk');foe.body.setSize(62,62).setOffset(33,55);}
      else foe.body.setSize(foe.width*.59,foe.height*.64).setOffset(foe.width*.205,foe.height*.3);
      foe.setData('patrol',e);foe.setData('direction',1);foe.setVelocityX(57+index*5);foe.setBounce(0);
    }
    const pipAnimated=this.textures.exists('pip-idle');
    const startY=level.platforms[0].y-64;
    this.player=this.physics.add.sprite(98,startY,pipAnimated?'pip-idle':'pip').setDisplaySize(73,76).setDepth(5);
    if(pipAnimated){this.player.play('pip:idle');this.applyExportBody(this.player,'pip','idle');}
    else this.player.body.setSize(this.player.width*.42,this.player.height*.7).setOffset(this.player.width*.29,this.player.height*.25);
    this.player.setMaxVelocity(spec.surface==='honey'?285:310,900).setDragX(spec.surface==='ice'?120:spec.surface==='honey'?1850:1400);
    this.colliders.push(this.physics.add.collider(this.player,this.platforms));
    this.colliders.push(this.physics.add.collider(this.enemies,this.platforms));
    this.colliders.push(this.physics.add.overlap(this.player,this.coins,(_player,coin)=>this.takeCoin(coin)));
    this.colliders.push(this.physics.add.overlap(this.player,this.checkpoints,(_player,check)=>this.touchCheckpoint(check)));
    this.colliders.push(this.physics.add.overlap(this.player,this.springPads,(_player,pad)=>this.springFrom(pad)));
    this.colliders.push(this.physics.add.overlap(this.player,this.hazards,()=>this.hurt()));
    this.colliders.push(this.physics.add.overlap(this.player,this.enemies,(_player,enemy)=>this.touchEnemy(enemy)));
    this.exit=this.physics.add.staticImage(level.exit.x,level.exit.y-54,'portal').setDisplaySize(99,112).refreshBody().setDepth(3);
    this.colliders.push(this.physics.add.overlap(this.player,this.exit,()=>this.atExit()));
    const mallowAnimated=this.textures.exists('mallow-idle');
    this.mallow=mallowAnimated?this.add.sprite(180,195,'mallow-idle').play('mallow:idle'):this.add.image(180,195,'mallow');
    this.mallow.setDisplaySize(47,47).setDepth(4).setAlpha(.92);
    this.effects.add(this.mallow);
    this.respawn={x:98,y:startY};
    this.cameras.main.setBounds(0,0,level.width,540);
    this.cameras.main.startFollow(this.player,true,.075,0);
    this.cameras.main.setDeadzone(175,540);
    this.seedGoal=level.needed;this.seeds=0;
    $('levelNumber').textContent=String(index+1).padStart(2,'0');$('levelName').textContent=spec.name;
    this.updateHud();
  }
  update(_time,delta){
    if(this.phase!=='playing'||!this.player?.active)return;
    const p=this.player,now=this.time.now;
    const onGround=p.body.blocked.down||p.body.touching.down;
    const wind=this.level.spec.wind||0;
    const groundSpeed=this.level.spec.surface==='honey'?285:310;
    p.setMaxVelocity(!onGround&&wind<0?265:!onGround&&wind>0?330:groundSpeed,900);
    if(onGround){this.lastGround=now;this.jumps=0;}
    const left=this.held.left||this.keys.A.isDown||this.keys.LEFT.isDown;
    const right=this.held.right||this.keys.D.isDown||this.keys.RIGHT.isDown;
    const stride=this.level.spec.surface==='honey'?1450:1700;
    let acceleration=left&&!right?-stride:right&&!left?stride:0;
    if(!onGround)acceleration+=wind;
    p.setAccelerationX(acceleration);
    if(left&&!right)p.setFlipX(true);
    else if(right&&!left)p.setFlipX(false);
    if(this.anims.exists('pip:walk')){
      const target=(left!==right&&onGround)?'pip:walk':'pip:idle';
      if(p.anims.currentAnim?.key!==target){p.play(target);this.applyExportBody(p,'pip',target==='pip:walk'?'walk_2':'idle');}
    }
    const jumpDown=this.held.jump||this.keys.SPACE.isDown||this.keys.UP.isDown||this.keys.W.isDown;
    if(jumpDown&&!this.jumpWasDown)this.lastJumpPress=now;
    this.jumpWasDown=jumpDown;
    if(now-this.lastJumpPress<145 && (now-this.lastGround<115||this.jumps<2)){
      p.setVelocityY(this.jumps===0?-660:-610);
      this.jumps++;this.lastJumpPress=-1000;this.lastGround=-1000;
      this.burst(p.x,p.y+20,0xffe088,5);this.tone(this.jumps===1?470:650,.08);
    }
    if(!jumpDown&&now>this.springBoostUntil&&p.body.velocity.y< -185)p.setVelocityY(Math.max(p.body.velocity.y,-410));
    if(p.y>605)this.hurt(true);
    for(const enemy of this.enemies.getChildren()){
      const patrol=enemy.getData('patrol');if(!patrol)continue;
      let direction=enemy.getData('direction');
      if(enemy.x>=patrol.to)direction=-1;if(enemy.x<=patrol.from)direction=1;
      enemy.setData('direction',direction);enemy.setVelocityX(direction*(57+this.levelIndex*5));enemy.setFlipX(direction<0);
    }
    this.mallow.x=p.x-49+Math.sin(now*.0018)*14;
    this.mallow.y=p.y-95+Math.sin(now*.003)*12;
    this.exit.setAlpha(this.seeds>=this.seedGoal?1:.6);
    p.setAlpha(now<this.invulnerableUntil && Math.floor(now/90)%2? .35:1);
    if(this.toastUntil && now>this.toastUntil){$('toast').classList.add('hidden');this.toastUntil=0;}
  }
  takeCoin(coin){
    if(!coin.active)return;
    const seed=coin.getData('seed');
    this.burst(coin.x,coin.y,seed?0xffed7a:0xffc340,seed?13:6);
    coin.destroy();
    if(seed){this.seeds++;this.tone(700+this.seeds*110,.13);this.toast(`${this.seeds} / ${this.seedGoal} sun seeds found`,1300);}
    else{this.coinsTotal++;this.tone(770,.05);}
    this.updateHud();
  }
  touchCheckpoint(check){
    if(check.getData('active'))return;
    check.setData('active',true);check.setTint(0xfff8b2);this.respawn={x:check.x,y:check.y-65};
    this.burst(check.x,check.y,0xffe177,16);this.toast('Checkpoint lit!',1500);this.tone(590,.16);
  }
  springFrom(pad){
    if(this.phase!=='playing'||this.player.body.velocity.y<80||this.player.body.bottom>pad.body.center.y+16||this.time.now<(this.lastSpringAt||0)+300)return;
    this.player.setVelocityY(-770);this.jumps=1;this.lastGround=-1000;this.lastSpringAt=this.time.now;this.springBoostUntil=this.time.now+170;
    this.burst(pad.x,pad.y,0xffc184,12);this.tone(720,.14);this.toast('Mushroom boost!',1000);
  }
  addLandmark(index,p,i){
    const x=p.x+p.w*(i===0?.69:.2),y=p.y-5;
    if(index===1){
      for(const [dx,scale] of [[-25,.8],[0,1.15],[29,.7]])this.effects.add(this.add.image(x+dx,y-18*scale,'mushroom').setDisplaySize(37*scale,41*scale).setDepth(1));
      return;
    }
    const artKey=`landmark-${LEVELS[index].slug}`;
    if(this.textures.exists(artKey)){
      const height=[0,0,87,91,88,93,103,94,91,102][index];
      const art=this.add.image(x,y,artKey).setOrigin(.5,1).setDepth(1);
      art.setScale(height/art.height);
      this.effects.add(art);
      return;
    }
    const g=this.add.graphics({x,y}).setDepth(1);
    if(index===2){
      g.lineStyle(4,0x577f91).lineBetween(0,0,0,-79);
      g.fillStyle(0xfdf7e1).fillTriangle(2,-76,55,-63,2,-50);
      g.fillStyle(0x63d6d7).fillTriangle(2,-59,36,-49,2,-40);
      g.lineStyle(2,0xffffff,.8).lineBetween(12,-30,62,-30).lineBetween(29,-21,71,-21);
    }else if(index===3){
      g.fillStyle(0xa25b2d).fillRoundedRect(-16,-43,34,39,8);
      g.fillStyle(0xffcf5a).fillCircle(1,-29,17).fillCircle(1,-11,12);
      g.fillStyle(0xffed9d).fillCircle(-7,-35,4).fillCircle(8,-22,3);
      g.fillStyle(0xd9952c).fillRoundedRect(12,-8,8,23,4);
    }else if(index===4){
      g.fillStyle(0x735ab5).fillTriangle(-29,0,-16,-56,-2,0).fillTriangle(-2,0,16,-79,33,0);
      g.fillStyle(0xbb9af2).fillTriangle(-17,-1,-8,-44,1,-1).fillTriangle(7,-1,19,-62,29,-1);
      g.lineStyle(2,0xf2dcff,.8).lineBetween(16,-72,16,-13);
    }else if(index===5){
      g.lineStyle(5,0x46616c).lineBetween(0,0,0,-71);
      g.fillStyle(0xffde7d,.16).fillCircle(0,-70,32);
      g.fillStyle(0xffd77e).fillRoundedRect(-12,-85,24,30,5);
      g.fillStyle(0xfff0aa).fillCircle(0,-70,7);
      g.lineStyle(3,0x314e61).strokeRoundedRect(-12,-85,24,30,5);
    }else if(index===6){
      g.lineStyle(9,0x77553b).lineBetween(0,0,0,-82);
      g.fillStyle(0x4baf83).fillCircle(-23,-83,28).fillCircle(13,-100,34).fillCircle(39,-77,22);
      g.fillStyle(0x9ee2a5,.75).fillCircle(15,-112,10).fillCircle(-30,-91,8);
      g.lineStyle(2,0x4d9e84).lineBetween(24,-75,27,-20);
    }else if(index===7){
      g.fillStyle(0x3a466e).fillTriangle(-23,0,2,-76,28,0);
      g.lineStyle(5,0xa7b6d4).lineBetween(2,-72,2,-116);
      g.lineStyle(5,0xe7e0ff).lineBetween(14,-112,-4,-88).lineBetween(-4,-88,10,-88).lineBetween(10,-88,-7,-58);
      g.fillStyle(0xad75d6).fillCircle(-19,-4,5).fillCircle(25,-4,4);
    }else if(index===8){
      g.fillStyle(0x8cbbd3).fillTriangle(-33,0,-19,-67,-5,0).fillTriangle(-8,0,13,-92,30,0).fillTriangle(21,0,38,-54,51,0);
      g.fillStyle(0xe6f8ff).fillTriangle(-17,-9,-18,-62,-5,-9).fillTriangle(12,-12,14,-81,29,-12);
      g.fillStyle(0xffffff,.8).fillCircle(-34,-12,4).fillCircle(46,-19,3);
    }else if(index===9){
      g.lineStyle(8,0x826044).lineBetween(0,0,0,-77).lineBetween(0,-48,-27,-70).lineBetween(0,-55,24,-78);
      for(const [dx,dy,r] of [[-24,-78,16],[0,-95,22],[24,-84,17],[5,-70,13]]){g.fillStyle(0xf8b2b8).fillCircle(dx,dy,r);g.fillStyle(0xfff1ca).fillCircle(dx+3,dy-3,3);}
    }
    this.effects.add(g);
  }
  addAtmosphere(index){
    const moods={1:[0xffe9cd,18,2,8],4:[0xffd7ff,20,2,12],5:[0xffd277,20,1,7],6:[0xd7ffcf,18,2,8],7:[0xcad8ff,24,2,17],8:[0xffffff,28,3,12],9:[0xffeeaa,22,2,9]};
    const mood=moods[index];if(!mood)return;
    const [color,count,radius,length]=mood;
    for(let i=0;i<count;i++){
      const x=(i*73+index*29)%960,y=(i*131+index*37)%540;
      const particle=index===7?this.add.rectangle(x,y,2,length,color,.36).setAngle(16):this.add.circle(x,y,radius+(i%3),color,.3+(i%4)*.08);
      particle.setScrollFactor(0).setDepth(-40);this.scenery.add(particle);
      this.tweens.add({targets:particle,x:x+(index===7?-80:24),y:y+(index===7?210:55),alpha:index===7?.1:.05,duration:index===7?1200:2400+i*60,delay:i*30,repeat:-1});
    }
  }
  touchEnemy(enemy){
    if(!enemy.active)return;
    const p=this.player;
    const descending=p.body.velocity.y>100 && p.body.bottom<enemy.body.center.y+14;
    if(descending){this.burst(enemy.x,enemy.y,0xb78bd4,10);enemy.destroy();p.setVelocityY(-455);this.jumps=1;this.coinsTotal+=2;this.updateHud();this.tone(290,.1);}
    else this.hurt();
  }
  hurt(fell=false){
    if(this.phase!=='playing'||this.time.now<this.invulnerableUntil)return;
    this.health--;this.invulnerableUntil=this.time.now+1600;
    this.cameras.main.shake(180,.005);
    this.tone(160,.16);this.updateHud();
    if(this.health<=0){this.phase='over';this.physics.pause();show('gameover');$('touchControls').classList.add('hidden');return;}
    const x=this.respawn.x,y=this.respawn.y;
    this.player.setPosition(x,y);this.player.setVelocity(0,0);this.player.setAccelerationX(0);
    this.toast(fell?'A soft landing, one heart lighter':'Ouch! Back to safety',1300);
  }
  atExit(){
    if(this.phase!=='playing')return;
    if(this.seeds<this.seedGoal){if(!this.exitNotice||this.time.now-this.exitNotice>2500){this.toast(`Find ${this.seedGoal-this.seeds} more sun seed${this.seedGoal-this.seeds===1?'':'s'}`,1300);this.exitNotice=this.time.now;}return;}
    this.phase='complete';this.physics.pause();this.tone(880,.18);this.time.delayedCall(130,()=>this.tone(1180,.22));
    const unlocked=Math.max(Number(localStorage.getItem('skyOrchardUnlocked')||0),Math.min(9,this.levelIndex+1));
    localStorage.setItem('skyOrchardUnlocked',String(unlocked));
    $('continueButton').classList.remove('hidden');
    const final=this.levelIndex===9;
    $('resultKicker').textContent=final?'THE ORCHARD IS SAVED':'ISLAND COMPLETE';
    $('resultTitle').textContent=final?'Sunshine returns!':'A brighter sky!';
    $('resultText').textContent=final?'Pip and Mallow brought every sun seed home. The floating isles shine again.':`${LEVELS[this.levelIndex+1].name} is waiting beyond the clouds.`;
    $('resultLevel').textContent=`${String(this.levelIndex+1).padStart(2,'0')} / 10`;
    $('resultCoins').textContent=this.coinsTotal;
    $('resultHearts').textContent=this.health;
    $('nextButton').innerHTML=final?'PLAY FROM START <span>↻</span>':'NEXT ISLAND <span>➜</span>';
    $('touchControls').classList.add('hidden');show('result');
  }
  pause(){if(this.phase!=='playing')return;this.phase='paused';this.physics.pause();show('pause');$('touchControls').classList.add('hidden');}
  resume(){if(this.phase!=='paused')return;this.phase='playing';this.physics.resume();show(null);$('touchControls').classList.toggle('hidden',!window.matchMedia('(pointer: coarse)').matches);}
  toMenu(){this.phase='menu';this.physics.pause();this.buildLevel(0);show('menu');$('hud').classList.add('hidden');$('touchControls').classList.add('hidden');$('toast').classList.add('hidden');this.toastUntil=0;}
  toast(message,duration=1600){const toast=$('toast');toast.textContent=message;toast.style.whiteSpace='pre-line';toast.style.textAlign='center';toast.style.maxWidth='calc(100% - 30px)';toast.classList.remove('hidden');this.toastUntil=this.time.now+duration;}
  updateHud(){$('seedCount').textContent=`${this.seeds||0} / ${this.seedGoal||3}`;$('coinCount').textContent=this.coinsTotal;$('heartCount').textContent='♥ '.repeat(this.health).trim()+' ♡'.repeat(3-this.health);}
  burst(x,y,color,count){
    for(let i=0;i<count;i++){
      const dot=this.add.circle(x,y,2+Math.random()*3,color).setDepth(10);
      this.particles.add(dot);
      this.tweens.add({targets:dot,x:x+(Math.random()-.5)*80,y:y+(Math.random()-.5)*70,alpha:0,scale:0,duration:360+Math.random()*300,onComplete:()=>dot.destroy()});
    }
  }
  tone(frequency,duration){
    try{this.soundContext??=new (window.AudioContext||window.webkitAudioContext)();const ctx=this.soundContext,o=ctx.createOscillator(),gain=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(frequency,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(frequency*.72,ctx.currentTime+duration);gain.gain.setValueAtTime(.075,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);o.connect(gain).connect(ctx.destination);o.start();o.stop(ctx.currentTime+duration);}catch{}
  }
}

window.skyOrchard=new Phaser.Game({
  type:Phaser.AUTO,parent:'game',width:960,height:540,backgroundColor:'#9ce4fa',
  scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},
  physics:{default:'arcade',arcade:{gravity:{y:1580},debug:false}},
  render:{antialias:true,pixelArt:false},scene:[Orchard]
});
