class Boss extends Phaser.Physics.Matter.Sprite{
    constructor(scene,x,y) {
        super(scene.matter.world, x, y, 'spider', 0)        
        scene.matter.world.add(this);
        scene.add.existing(this); 
        this.setActive(true);
        const { Body, Bodies } = Phaser.Physics.Matter.Matter; // Native Matter modules
        const { width: w, height: h } = this;
        //Set Control Sensor - Player can't collide with mirrors, but bullets can. Sensor can detect player inputs.
        const coreArea =  Bodies.rectangle(0, 0, this.width*.5, this.height*.35, { chamfer: {radius: 5}, isSensor: false });
        this.sensors = {
            bottom: Bodies.rectangle(0, h * 0.18, w * 0.40, 2, { isSensor: true }),
            top: Bodies.rectangle(0, -h * 0.18, w * 0.40, 2, { isSensor: true }),
            left: Bodies.rectangle(-w * 0.25, 0, 2, h * 0.20, { isSensor: true }),
            right: Bodies.rectangle(w * 0.25, 0, 2, h * 0.20, { isSensor: true })
          };
        this.sensors.bottom.label = "SPIDER_BOTTOM";
        this.sensors.top.label = "SPIDER_TOP";
        this.sensors.left.label = "SPIDER_LEFT";
        this.sensors.right.label = "SPIDER_RIGHT";

        const mainBody = Body.create({
            parts: [coreArea, this.sensors.top, this.sensors.bottom, this.sensors.left, this.sensors.right],
            frictionStatic: 0,
            frictionAir: 0.00,
            friction: 0.00,
            restitution: 0.00,
            label: "Boss"
        });

        mainBody.render.sprite.xOffset = .51;
        mainBody.render.sprite.yOffset = .80;

        this
        .setExistingBody(mainBody)
        .setFixedRotation() 
        .setIgnoreGravity(true);  

        //Custom Props
        this.touching = {up:0,down:0,left:0,right:0};
        this.mv_speed = 1;
        this.fall_speed = 6;
        this.jump_speed = 2;
        //Collision
        this.scene.matter.world.on('beforeupdate', function (event) {
            this.touching.left = 0;
            this.touching.right = 0;
            this.touching.up = 0;
            this.touching.down = 0;
        },this);

        this.scene.matterCollision.addOnCollideActive({
            objectA: [this.sensors.bottom,this.sensors.left,this.sensors.right,this.sensors.top],
            callback: eventData => {
                const { bodyB, gameObjectB,bodyA,gameObjectA } = eventData;
                
              if (gameObjectB !== undefined && gameObjectB instanceof Phaser.Tilemaps.Tile) {
                // Now you know that gameObjectB is a Tile, so you can check the index, properties, etc.
                
                if (gameObjectB.properties.collides){
                    if(bodyA.label == "SPIDER_BOTTOM"){
                        gameObjectA.touching.down++;
                    }
                    if(bodyA.label == "SPIDER_RIGHT"){
                        gameObjectA.touching.right++;
                    }
                    if(bodyA.label == "SPIDER_LEFT"){
                        gameObjectA.touching.left++;
                    }
                    if(bodyA.label == "SPIDER_TOP"){
                        gameObjectA.touching.up++;
                    }
                } 
              }
              if (gameObjectB !== undefined &&
                (gameObjectB instanceof TMXPlatform
                || gameObjectB instanceof Barrier
                || gameObjectB instanceof TMXGate)) {   
                
                //handle plaform jumping allowance             
                if(bodyA.label == "SPIDER_BOTTOM"){
                    gameObjectA.touching.down++;
                }
                if(bodyA.label == "SPIDER_RIGHT"){
                    gameObjectA.touching.right++;
                }
                if(bodyA.label == "SPIDER_LEFT"){
                    gameObjectA.touching.left++;
                }
                if(bodyA.label == "SPIDER_TOP"){
                    gameObjectA.touching.up++;
                }                         
              } 
            }
        });

        //DEBUG
        
        this.debug = this.scene.add.text(this.x, this.y-16, 'bright', { resolution: 2,fontSize: '8px', fill: '#00FF00' });
        
        //AI
        this.wanderDirection = 1;//Clockwise
        this.falltime = 0;
        this.attackDelay = this.scene.time.addEvent({ delay: 3000, callback: this.startAttack, callbackScope: this, loop: true });
        this.jumping = false;
    }
    update(time, delta)
    {       
        this.anims.play('boss-spider', true);
        this.debug.setPosition(this.x, this.y-64);
        this.debug.setText("L:"+String(this.touching.left)+" R:"+String(this.touching.right)+" U:"+String(this.touching.up)+" D:"+String(this.touching.down)
        +"\n wd:"+String(this.wanderDirection));

        //Check for Player to attack
        let disToSolana = Phaser.Math.Distance.Between(this.x,this.y,solana.x,solana.y);
        if(disToSolana < 256){
           
        }
        //ON PLATFORM BEHAVIOR
        if(this.touching.left == 0 &&  this.touching.right == 0 && this.touching.up == 0 && this.touching.down == 0){
            //Airborne
            this.falltime++;
        }else{
            if(this.jumping){
                this.jumping = false;
                this.setIgnoreGravity(true);
            }
            this.falltime = 0;
            //Touching Single Direction
            if(this.touching.left > 0 && this.touching.right == 0 && this.touching.up == 0 && this.touching.down == 0){
                this.setVelocityY(this.mv_speed*this.wanderDirection);
                this.setVelocityX(this.mv_speed*this.wanderDirection*-1);
            }else if(this.touching.left == 0 && this.touching.right > 0 && this.touching.up == 0 && this.touching.down == 0){
                this.setVelocityY(this.mv_speed*this.wanderDirection*-1);
                this.setVelocityX(this.mv_speed*this.wanderDirection);
            }

            if(this.touching.left == 0 && this.touching.right == 0 && this.touching.up > 0 && this.touching.down == 0){
                this.setVelocityX(this.mv_speed*this.wanderDirection*-1);
                //this.setVelocityY(this.mv_speed*this.wanderDirection*-1);
            }else if(this.touching.left == 0 && this.touching.right == 0 && this.touching.up == 0 && this.touching.down > 0){
                this.setVelocityX(this.mv_speed*this.wanderDirection);
                //this.setVelocityY(this.mv_speed*this.wanderDirection);
            }
            //Touching corner on ground or ceiling
            if(this.touching.left > 0 && (this.touching.down > 0 || this.touching.up > 0)){
                this.wanderDirection = 1;
                console.log("T-L: Change to 1");
            }else if(this.touching.right > 0 && (this.touching.down > 0 || this.touching.up > 0)){
                this.wanderDirection = -1;
                console.log("T-R: Change to -1");
            }
            
        }

        //Set fall time
        if(this.falltime > 15){
            this.setIgnoreGravity(false); 
            //this.setVelocityY(this.fall_speed);
        }
    }
    climbToTile(){
        //If a tile is directly above the spider, they will stop, and spit a thread of silk at the platform and climb up to it to begin patrolling again.
        //If the player is above them, but not within LOS, they will do this as well.
    }
    startAttack(){
        if(!this.jumping){
            this.jumping = true;
            if(this.touching.up > 0){
                this.setVelocityY(this.jump_speed);
            }else{
                this.setVelocityY(-this.jump_speed);
            }
            if(this.canSee(solana)){
                if(solana.x < this.x){
                    this.wanderDirection = -1;
                    this.setVelocityX(-this.jump_speed*2);
                }else{
                    this.wanderDirection = 1;
                    this.setVelocityX(this.jump_speed*2);
                }
            }else{
                this.setVelocityX(this.jump_speed*this.wanderDirection);
            }
        }
    }
    canSee(target){
        let rayTo = Phaser.Physics.Matter.Matter.Query.ray(this.scene.matter.world.localWorld.bodies,{x:this.x,y:this.y},{x:target.x,y:target.y});
        if(rayTo.length < 3){
            //LOS Not Blocked
            //this.setIgnoreGravity(true); 
            
            //Check Ground, or Ceiling and jump accordingly.
            //Move left/right and then apply up or down. The falltime will take over and cause the fall after time.
            return true;
        }else{
            return false;
        }
        
    }
}