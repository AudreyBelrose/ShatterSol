//When enemies are hit, they lose globs of oily shadow, of varying size, that fly off of them.
//let testbody = playScene.matter.add.softBody(solana.x+32,solana.y-64,2,2,-4,0,true,8,{ignoreGravity: false,collisionFilter: {mask: 130 }},{})
var ENEMY_WEAPONS = [
    {name: 'slime_lob',aimmed:false,prjTexture:'bullet',prjLife:600,prjVec:{x:1,y:-1},range:256,onDeath:[]},//0
    {name: 'slime_melee',aimmed:false,prjTexture:'bullet',prjLife:32,prjVec:{x:1,y:0},range:32,onDeath:[]},
    {name: 'slime_shoot',aimmed:false,prjTexture:'bullet',prjLife:600,prjVec:{x:1,y:0},range:256,onDeath:[]},
    {name: 'slime_bomb',aimmed:false,prjTexture:'bullet',prjLife:600,prjVec:{x:1,y:-1},range:128,onDeath:[{effect:'explode',count:5,damage:1}]},
    {name: 'claw',aimmed:false,prjTexture:'bullet',prjLife:16,prjVec:{x:2,y:0},range:64,onDeath:[]},
    {name: 'darkblip_shoot',aimmed:true,prjTexture:'bullet',prjLife:900,prjVec:{x:1,y:0},range:400,onDeath:[]}//5
]
class PathingNode{
    constructor(name,points,x,y){
        this.name = name;
        this.points = points;
        this.x = x;
        this.y = y;
        this.worldpoints = [];
        points.forEach(e=>{
            this.worldpoints.push({x:e.x+x,y:e.y+y});
        },this)
    }
}
class Enemy extends Phaser.Physics.Matter.Sprite{
    constructor(scene,x,y,texture) {
        super(scene.matter.world, x, y, texture, 0)
        this.scene = scene;       
        scene.matter.world.add(this);
        scene.add.existing(this); 
        this.setActive(true);
        //console.log("Enemy Created",x,y, texture,this.texture.key);
        const { Body, Bodies } = Phaser.Physics.Matter.Matter; // Native Matter modules
        
        const { width: w, height: h } = this;
        //const mainBody = Bodies.rectangle(0, 0, w * 0.6, h, { chamfer: { radius: 10 } });
        

        const mainBody = Bodies.rectangle(0, 0, w * 0.6, h-12, { chamfer: { radius: 1 } });
        this.sensors = {
          bottom: Bodies.rectangle(0, h*0.5-6, w * 0.25, 6, { isSensor: true }),
          left: Bodies.rectangle(-w * 0.35, 0, 6, h * 0.75, { isSensor: true }),
          right: Bodies.rectangle(w * 0.35, 0, 6, h * 0.75, { isSensor: true })
        };
        this.sensors.bottom.label = "ENEMY_BOTTOM";
        this.sensors.left.label = "ENEMY_LEFT";
        this.sensors.right.label = "ENEMY_RIGHT";
        this.touching = {up:0,down:0,left:0,right:0};

        const compoundBody = Body.create({
          parts: [mainBody, this.sensors.bottom, this.sensors.left, this.sensors.right],
          //parts: [mainBody],
          frictionStatic: 0,
          frictionAir: 0.02,
          friction: 0.10,
          restitution: 0.00,
          density: 0.03,
        });
       //Fix the draw offsets for the compound sprite.
        compoundBody.render.sprite.xOffset = .50;
        compoundBody.render.sprite.yOffset = .50;
        compoundBody.label = "ENEMY";

        this
        .setExistingBody(compoundBody)
        .setCollisionCategory(CATEGORY.ENEMY)
        .setFixedRotation() // Sets inertia to infinity so the player can't rotate
        .setPosition(x, y);
          //Custom Properties
        this.hp = 1;
        this.mv_speed = 1;
        this.patrolDirection = -1;
        this.patrolRange = {min:0,max:0};
        this.aggroRange = 400;
        this.gun = new Gun(120,3,240);//ROF,MAGSIZE,RELOADTIME
        this.dead = false;
        this.debug = scene.add.text(this.x, this.y-16, 'debug', { resolution: 2, fontSize: '12px', fill: '#00FF00' });
        this.groundhull = {obj: null, updated: false};//Current Ground Hull

        //Setup Collision
        this.scene.matter.world.on('beforeupdate', function (event) {
            this.touching.left = 0;
            this.touching.right = 0;
            this.touching.up = 0;
            this.touching.down = 0;    
        },this);
        this.scene.matterCollision.addOnCollideStart({
            objectA: [this.sensors.left,this.sensors.right],
            callback: eventData => {
                const { bodyB, gameObjectB,bodyA,gameObjectA } = eventData;
                if (gameObjectB !== undefined && gameObjectB instanceof TMXGate) {
                    if(bodyA.label == "ENEMY_LEFT"){
                        this.touching.left++;
                    }
                    if(bodyA.label == "ENEMY_RIGHT"){
                        this.touching.right++;
                    }
                  }
            }
        });
        this.scene.matterCollision.addOnCollideStart({
            objectA: [this.sensors.bottom],
            callback: eventData => {
                const { bodyB, gameObjectB,bodyA,gameObjectA } = eventData;
                
              if (gameObjectB !== undefined && bodyB.label == 'GROUND') {

                if(bodyA.label == "ENEMY_BOTTOM"){
                    if(this.groundhull == null){this.groundhull.obj = gameObjectB};

                    if(this.groundhull.x != gameObjectB.x || this.groundhull.y != gameObjectB.y){
                        this.groundhull.obj = gameObjectB;
                        this.groundhull.updated = true;
                    }
                }
                if(bodyA.label == "ENEMY_LEFT"){
                    this.touching.left++;
                }
                if(bodyA.label == "ENEMY_RIGHT"){
                    this.touching.right++;
                }
                
              }
            }
        });

        this.behavior = {passive:'patrol',aggressive:'attack', weapon: -1};
        this.setPatrolRange(64);//Default fixed patrol width is width of sprite.
        this.waypoints = [Phaser.Math.Vector2(this.x,this.y)];
        this.waypointsIndex = 0;
        this.distanceToSolana = 99999;
        this.wpSpeedMod = {x:2,y:1};

    }
    update(time, delta)
    {
        if(!this.dead && solana.alive){

            this.distanceToSolana = Phaser.Math.Distance.Between(solana.x,solana.y,this.x,this.y);

            this.rotation = 0;//Temp since the fixed rotation is not working.

            if(this.behavior.passive == 'patrol'){
                this.patrol();
            }else if(this.behavior.passive == 'patrolFixed'){
                this.patrolFixed();
            }else if(this.behavior.passive == 'patrolWaypoints'){
                this.patrolWaypoints();
            }

            if(this.behavior.aggressive == 'attack'){
                this.attack();
            }

            //Idle Vs Move Animations
            if(this.body.velocity.x != 0){
                this.flipX = this.body.velocity.x < 0 ? false : true;
                this.anims.play(this.texture.key+'-move', true);
            }else{
                this.anims.play(this.texture.key+'-idle', true);
            }
        }

        // this.debug.setPosition(this.x, this.y-64);
        // this.debug.setText("BehavPass:"+this.behavior.passive
        // +"\nX:"+String(this.x>>0)+", Y:"+String(this.y>>0)
        // +"\nPatrolPath:"+waypointString);
    }
    setPath(path){
        this.waypoints = path;
    }
    changeWeapon(speedVec,index,gun){
        this.wpSpeedMod = speedVec;//{x:4,y:1}
        this.gun = gun;//new Gun(60,4,70);
        this.behavior.weapon=ENEMY_WEAPONS[index];//See top of ENEMY.JS
    }
    aim(target){
        //Aimed shot with weapon.
        let angle = Phaser.Math.Angle.Between(this.x,this.y,target.x,target.y);
        let vecX = Math.cos(angle);
        let vecY = Math.sin(angle); 
        return {x:vecX,y:vecY};
    }
    barrage(){
        //Shoot Ranged Weapon
        let bullet = bullets.get(-1000,-1000,'bullet');
        if (bullet && this.gun.ready)//ROF(MS)
        {
            this.anims.play(this.texture.key+'-shoot', true);            
            
            bullet.setCollidesWith([ CATEGORY.GROUND, CATEGORY.SOLID, CATEGORY.SOLANA, CATEGORY.MIRROR, CATEGORY.SHIELD ]);
            bullet.setBounce(0.95);
            if(this.behavior.weapon.aimmed){
                let aimVec = this.aim(solana); //Just use X value for now. Probably want to have adjustable weapon speed later.
                bullet.fire(this.x, this.y, aimVec.x*this.wpSpeedMod.x, aimVec.y*this.wpSpeedMod.x, this.behavior.weapon.prjLife);
            }else{
                if(this.flipX){
                    bullet.fire(this.x, this.y, this.behavior.weapon.prjVec.x*this.wpSpeedMod.x, this.behavior.weapon.prjVec.y*this.wpSpeedMod.y, this.behavior.weapon.prjLife);
                }else{
                    bullet.fire(this.x, this.y, -this.behavior.weapon.prjVec.x*this.wpSpeedMod.x, this.behavior.weapon.prjVec.y*this.wpSpeedMod.y, this.behavior.weapon.prjLife);
                }
            }
            this.gun.shoot();//Decrease mag size. Can leave this out for a constant ROF.
        }
        if(this.gun){
            this.gun.update();
        }
    }
    attack(){
        let atkRng = this.width/2;

        if(this.behavior.weapon != -1){
            atkRng = this.behavior.weapon.range;
            if(this.distanceToSolana < this.behavior.weapon.range){           
                if(this.gun){this.barrage();}
            }
        }
    }  
    hunt(speedMod){
        //Move towards solana if within aggro.  

        if(this.distanceToSolana > this.width/2 && this.distanceToSolana < this.aggroRange){
            
            if(solana.x < this.x){
                this.setVelocityX(this.mv_speed*-1*speedMod);
                this.flipX = false;
            }else{
                this.setVelocityX(this.mv_speed*speedMod);
                this.flipX = true;
            }
        }else{
            this.setVelocityX(0);
        }
    }
    setPatrolRange(width){
        this.patrolRange = {min:this.x-width,max:this.x+width};
    }
    patrolFixed(){
        //A fixed distace patrol
        if((this.patrolDirection == -1 && (this.x) < (this.patrolRange.min))
        || (this.patrolDirection == 1 && (this.x) > (this.patrolRange.max))){
            this.patrolDirection = this.patrolDirection*-1;//Toggle
        }

        this.setVelocityX(this.mv_speed*this.patrolDirection);
    }
    patrol(){
        if(this.groundhull.updated){
            //Phaser.Physics.Matter.Matter.Query.point(this.scene.matter.world.localWorld.bodies, {x:this.x, y:this.y})
            //groundhull
            //METHOD 2
            let leftCenter = this.getLeftCenter();
            let rightCenter = this.getRightCenter();
            let leftCenterGrd = this.groundhull.obj.getLeftCenter();
            let rightCenterGrd = this.groundhull.obj.getRightCenter(); 

            if((this.patrolDirection == -1 && (leftCenter.x < leftCenterGrd.x))
            || (this.patrolDirection == 1 && (rightCenter.x > rightCenterGrd.x))){

                this.patrolDirection = this.patrolDirection*-1;
            }
                
            if(this.touching.left > 0 || this.touching.right > 0){
                this.patrolDirection = this.patrolDirection*-1;
            }
            this.setVelocityX(this.mv_speed*this.patrolDirection);
        }
    }
    patrolWaypoints(){
        let destPoint = this.waypoints[this.waypointsIndex];
        if(this.x < destPoint.x){
            this.setVelocityX(this.mv_speed);
        }else if(this.x > destPoint.x){
            this.setVelocityX(this.mv_speed*-1);
        }

        if(this.body.ignoreGravity){
            if(this.y < destPoint.y){
                this.setVelocityY(this.mv_speed);
            }else if(this.y > destPoint.y){
                this.setVelocityY(this.mv_speed*-1);
            }
        }
        let distanceToDestination = Phaser.Math.Distance.Between(this.x,this.y,destPoint.x,destPoint.y);
        if(distanceToDestination < this.width){
            this.waypointsIndex++;
            if(this.waypointsIndex >= this.waypoints.length){this.waypointsIndex=0;}
        }
    }
    charge(){
        //Enemy Rushes at double speed towards solana and attempts to touch
        this.hunt(2);//Hunt at twice speed
    }
    defend(){
        //Stand ground and attack when within range.
        let distanceToSolana = this.distanceToSolana;
        let atkRng = this.width/2;

        if(this.behavior.weapon != -1){
            atkRng = this.behavior.weapon.range;
            if(distanceToSolana < this.behavior.weapon.range){           
                if(this.gun){this.barrage();}
            }
        }
    }
    flee(){
        //Flee Away from Solana until outside aggro.
        this.hunt(-1);//Just hunt in the opposite direction
    }
    setBehavior(p,a,wp){
        this.behavior = {passive:p,aggressive:a,weapon:ENEMY_WEAPONS[wp]};
        //console.log("Enemy Set Behavior",this.behavior);
    }
    death(animation, frame){
        for(let i=0;i < Phaser.Math.Between(1,5);i++){
            let ls = light_shards.get();
            ls.spawn(this.x,this.y,300,solana);
        }
        if(animation.key == this.texture.key+'-death'){
            this.setActive(false);
            this.setVisible(false);
            this.debug.setVisible(false);
            this.hp = 1;
            this.dead = false;
            this.destroy(); 
        }
    }
    receiveDamage(damage) {
        this.hp -= damage;           
        
        // if hp drops below 0 we deactivate this enemy
        if(this.hp <= 0 && !this.dead ) {
            this.dead = true; 
                     
            this.on('animationcomplete',this.death,this);            
            this.anims.play(this.texture.key+'-death', false);
            
        }
    }
};

class EnemyFlying extends Enemy{

    constructor(scene,x,y,texture) {
        super(scene, x, y, texture);

        this.setIgnoreGravity(true);
        this.behavior = {passive:'patrolFixed',aggressive:'patrolFixed'};
    }
}
//Credits
/* 
Slime Monster
https://www.artstation.com/artwork/Xvzz3 
Jari Hirvikoski
2D & 3D Artist | Animator
*/

