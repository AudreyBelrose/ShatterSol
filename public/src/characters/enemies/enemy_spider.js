
class EnemySpider extends Phaser.Physics.Matter.Sprite{
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
            left: Bodies.rectangle(-w * 0.25, 0, 2, h * 0.30, { isSensor: true }),
            right: Bodies.rectangle(w * 0.25, 0, 2, h * 0.30, { isSensor: true })
          };
        this.sensors.bottom.label = "SPIDER_BOTTOM";
        this.sensors.top.label = "SPIDER_TOP";
        this.sensors.left.label = "SPIDER_LEFT";
        this.sensors.right.label = "SPIDER_RIGHT";

        const mainBody = Body.create({
            parts: [coreArea, this.sensors.top, this.sensors.bottom, this.sensors.left, this.sensors.right],
            frictionStatic: 0,
            frictionAir: 0.00,
            friction: 0.10,
            restitution: 0.00,
            label: "Boss"
        });

        mainBody.render.sprite.xOffset = .51;
        mainBody.render.sprite.yOffset = .80;

        this
        .setCollisionCategory(CATEGORY.ENEMY)
        .setCollidesWith([ CATEGORY.BULLET, CATEGORY.SOLANA, CATEGORY.GROUND ])
        .setExistingBody(mainBody)
        .setFixedRotation() 
        .setIgnoreGravity(true);  

        //Custom Props
        this.hp = 1;
        this.touching = {up:0,down:0,left:0,right:0};
        this.mv_speed = .5;
        this.fall_speed = 2;
        this.jump_speed = 2;
        this.gun = new Gun(60,1,120);
        this.aggroDis = 600;
        this.groundTile = {x:0,y:0, updated: false};//Current Ground Tile
        this.tilePos = {x:0,y:0,px:0,py:0};

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
                
              if (gameObjectB !== undefined && (bodyB.label == 'GROUND' 
              || gameObjectB instanceof TMXPlatform
              || gameObjectB instanceof Barrier
              || gameObjectB instanceof TMXGate)) {                
                
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

        //Draw Point area debug
        this.debugTargetTile = this.scene.add.graphics();
        var thickness = 2;
        var alpha = 1;
        this.debugTargetTile.lineStyle(thickness, 0xffff00, alpha);
        this.debugTargetTile.strokeRect(0,0,32,32);

        this.debugTargetTileSelf = this.scene.add.graphics();
        this.debugTargetTileSelf.lineStyle(thickness, 0xff00ff, alpha);
        this.debugTargetTileSelf.strokeRect(0,0,32,32);

        this.debugScanTile = this.scene.add.graphics();
        this.debugScanTile.lineStyle(thickness, 0x00ffff, alpha);
        this.debugScanTile.strokeRect(0,0,32,32);

        

        //AI
        
        this.wanderDirections = {
            right:{x:1,y:0},
            left:{x:-1,y:0},
            up:{x:0,y:-1},
            down:{x:0,y:1}
        };
        this.wanderDirection = 1;//Clockwise
        this.falltime = 0;
        this.attackDelay = this.scene.time.addEvent({ delay: 4000, callback: this.startAttack, callbackScope: this, loop: true });
        this.silking = false;
        this.climbing = false;
        this.climbDelay = this.scene.time.addEvent({ delay: 3000, callback: this.shootSilk, callbackScope: this, loop: true });
        this.jumping = false;
        //Tile AI
        this.targetMoveTile = null;
        this.prevTargetMoveTile = null;
        this.firstTouchGround = false;

        //Climbing
        this.silkshot = new SpiderSilk(this.scene,-1000,0,'bullet');
        this.silkshot.setFrame(16);
        this.silkshot.setCollidesWith([ CATEGORY.GROUND,CATEGORY.SOLID]);
        this.silkshot.owner = this;        
        this.silkthread = {sX:this.x,sY:this.y,eX:this.x,eY:this.y,color:0xEEEEEE,active:false};;
        this.silkDraw = false;
        this.silkGraphic = this.scene.add.graphics(0, 0);

        //Hive
        this.hive = -1;
        this.id = -1;
    }
    update(time, delta)
    {       
        //Update Position in Tiles for AI
        let tpX = this.tilePos.x = (this.x/32 << 0);
        let tpY = this.tilePos.y = (this.y/32 << 0);
        
        let prevtpX = this.tilePos.px;
        let prevtpY = this.tilePos.py;

        let tileChanged = false;

        if(prevtpX != tpX || prevtpY != tpY){tileChanged = true;};

        //Easy Access Variables
        let mv_speed = this.mv_speed;
        //Movement
        let tLeft = (this.touching.left > 0);
        let tRight = (this.touching.right > 0);
        let tDown = (this.touching.down > 0);
        let tUp = (this.touching.up > 0);
        let noTouch = (!tLeft && !tRight && !tUp && !tDown);
        //Position
        let bodyMin = this.body.bounds.min;
        let bodyMax = this.body.bounds.max;
        let bodyWidth = bodyMax.x - bodyMin.x;
        let bodyHeight = bodyMax.y - bodyMin.y;
        //Body Velocities
        let bodyVelX = this.body.velocity.x;
        let bodyVelY = this.body.velocity.y;
        //Target Tile
        let onTargeTile = false;

        //Play Animation
        this.anims.play('boss-spider', true);

        //Write Debug Information
        this.debug.setPosition(this.x, this.y-64);
        let debugString = "L:"+String(this.touching.left)+" R:"+String(this.touching.right)+" U:"+String(this.touching.up)+" D:"+String(this.touching.down)
        +"\n wd:"+String(this.wanderDirection)+" vX:"+String(bodyVelX) + " vY:"+String(bodyVelY);
       
        ////////////////////////////////////////////////////////////
        //Debug target draw
        if(this.targetMoveTile != null){            
            this.debugTargetTile.x = this.targetMoveTile.x*mapTileSize.tw;
            this.debugTargetTile.y = this.targetMoveTile.y*mapTileSize.tw;

            debugString+="\n MTT:x"+String(this.targetMoveTile.x)+":"+String(this.targetMoveTile.y);      
        }else{
            this.debugTargetTile.x = -32;
            this.debugTargetTile.y = -32;
        }


        debugString+="\n TPT:x"+String(tpX)+":"+String(tpY);  
        
        
        this.debugTargetTileSelf.x = tpX*mapTileSize.tw;
        this.debugTargetTileSelf.y = tpY*mapTileSize.tw;

        this.debug.setText(debugString);
        ////////////////////////////////////////////////////////////

        //Check for Player to attack
        let disToSolana = Phaser.Math.Distance.Between(this.x,this.y,solana.x,solana.y);
        if(disToSolana < this.aggroDis){
            //Update Gun
            if(this.gun){
                
                let bullet = bullets.get(-1000,-1000,'bullet');
                if (bullet && this.gun.ready)//ROF(MS)
                {                
                    bullet.setCollidesWith([ CATEGORY.GROUND,CATEGORY.SOLID, CATEGORY.SOLANA, CATEGORY.MIRROR, CATEGORY.SHIELD ]);
                    bullet.setIgnoreGravity(false);
                    bullet.setFrame(16);
                    let effs = [(new bulletEffect('Stunned',1.0,60,1,'Anim','solana-webbed'))];
                    bullet.setEffects(effs);
                    
                    let bVelY = tDown ? -4 : 0;
                    let bVelX = bodyVelX > 0 || tLeft ? 4 : -4;

                    bullet.fire(this.x, this.y, bVelX, bVelY, 400);                    
                    
                    this.gun.shoot();//Decrease mag size. Can leave this out for a constant ROF.
                }
                this.gun.update();
            }
        }


        //Am I touching my target tile?
        if(this.targetMoveTile != null){
            if(this.targetMoveTile.x == tpX && this.targetMoveTile.y == tpY){
                onTargeTile = true;
                //This is never being triggered because of the else statement and the fall/no sensor touch detection.

                //console.log("L:"+(bodyMin.x),"R:"+(bodyMax.x),"U:"+(bodyMin.y),"D:"+(bodyMax.y),(this.targetMoveTile.x)*mapTileSize.tw,(this.targetMoveTile.y)*mapTileSize.tw,this.wanderDirection,bodyVelX,bodyVelY);
                
                if(this.wanderDirection > 0){
                    if(bodyVelY == 0){
                        if(bodyVelX > 0){
                            if(bodyMin.x + bodyVelX >= (this.targetMoveTile.x)*mapTileSize.tw){
                                //console.log("On Target Tile: Y:0",bodyVelX,bodyVelY);
                                this.setPosition(bodyWidth/2+(this.targetMoveTile.x)*mapTileSize.tw-2,this.y);
                                this.setVelocity(0,1*mv_speed);
                                this.clearTargetMoveTile();
                            }
                        }else if(bodyVelX < 0){
                            if(bodyMax.x + bodyVelX <= (this.targetMoveTile.x+1)*mapTileSize.tw){
                                //console.log("On Target Tile: Y:0",bodyVelX,bodyVelY);
                                this.setPosition((this.targetMoveTile.x+1)*mapTileSize.tw+2-bodyWidth/2,this.y);
                                this.setVelocity(0,-1*mv_speed);
                                this.clearTargetMoveTile();
                            }
                        }

                    }else if(bodyVelX == 0){
                        if(bodyVelY > 0){                                
                            if(bodyMin.y + bodyVelY >= (this.targetMoveTile.y)*mapTileSize.tw){
                                //console.log("On Target Tile: X:0",bodyVelX,bodyVelY);
                                this.setPosition(this.x,bodyHeight/2+(this.targetMoveTile.y)*mapTileSize.tw-2);
                                this.setVelocity(-1*mv_speed,0);
                                this.clearTargetMoveTile();
                            }
                        }else if(bodyVelY < 0){
                            if(bodyMax.y + bodyVelY <= (this.targetMoveTile.y+1)*mapTileSize.tw){
                                //console.log("On Target Tile: X:0",bodyVelX,bodyVelY);
                                this.setPosition(this.x,(this.targetMoveTile.y+1)*mapTileSize.tw+2-bodyHeight/2);
                                this.setVelocity(1*mv_speed,0);
                                this.clearTargetMoveTile();
                            }
                        }
                    }

                }else if(this.wanderDirection < 0){
                    if(bodyMax.x + bodyVelX <= (this.targetMoveTile.x+1)*mapTileSize.tw && bodyMax.y + bodyVelY <= (this.targetMoveTile.y+1)*mapTileSize.tw){
                        //console.log("On Target Tile",bodyVelX,bodyVelY);

                        if(bodyVelX > 0 && bodyVelY == 0){this.setVelocityY(0,-1*mv_speed);}
                        if(bodyVelX < 0 && bodyVelY == 0){this.setVelocityY(0,1*mv_speed);}

                        if(bodyVelY > 0 && bodyVelX == 0){this.setVelocityX(1*mv_speed,0);}
                        if(bodyVelY < 0 && bodyVelX == 0){this.setVelocityX(-1*mv_speed,0);}

                        this.clearTargetMoveTile();
                        
                    }
                }

                //this.findDestinationTile(tpX+OriginX_TileOffSet,tpY+OriginY_TileOffset,this.wanderDirection,0);

                //For this check, it needs to check the opposite movement side against the backside of the tile.
                //For example, if the spider is moving right (+X), he needs to check his left side to be equal/greater than
                //the tile left side. 

                //I also need to check and adjust the velocity(Mv_speed) dynamically to make sure the spider stops on the correct spot.
                //This might resolve the stopping issue, as I can check for if I am one frame away from the final movement required to be left to left sides
                //and then adjust the speed to make that happen

            }
        }
        if(this.silking){
            this.setVelocityX(0);
        }else if(this.climbing){
            //Climbing to Tile
            this.setVelocityX(0);
            this.setVelocityY(this.mv_speed*-1.5);
            if(tUp){
                this.climbing = false;
                this.silking = false;
            }
        }else{
            //ON PLATFORM BEHAVIOR
            if(noTouch && !onTargeTile){
                //Airborne                
                this.falltime++;
                

            }else{
                if(!this.firstTouchGround){this.firstTouchGround =true;};
                if(this.jumping){
                    this.jumping = false;
                    this.setIgnoreGravity(true);
                }
                this.falltime = 0;

                //Now, check for corners to adjust wander direction. Add timer to keep it from spamming
                let cornerCheck = false;
                let dirChoice = 'none';                
                let dirOffset = {x:0,y:0};

                if(tLeft && tUp){
                    if(this.wanderDirection > 0){
                        dirChoice = 'down';
                    }else if(this.wanderDirection < 0){
                        dirChoice = 'right';
                    }
                    cornerCheck = true;
                };//UL
                if(tRight && tUp){
                    if(this.wanderDirection > 0){
                        dirChoice = 'down'
                    }else if(this.wanderDirection < 0){
                        dirChoice = 'left';
                    }
                    cornerCheck = true;
                };//UR
                if(tLeft && tDown){
                    if(this.wanderDirection > 0){
                        dirChoice = 'right';
                    }else if(this.wanderDirection < 0){
                        dirChoice = 'up';
                    }
                    cornerCheck = true;
                };//DL
                if(tRight && tDown){
                    if(this.wanderDirection > 0){
                        dirChoice = 'up';
                    }else if(this.wanderDirection < 0){
                        dirChoice = 'left';
                    }
                    cornerCheck = true;
                };//DR
                
                if(cornerCheck == false){
                    //Touch Left Directions
                    if(tLeft && this.wanderDirection > 0){dirChoice = 'down';dirOffset={x:-1,y:0};};
                    if(tLeft && this.wanderDirection < 0){dirChoice = 'up';dirOffset={x:-1,y:0};};
                    //Touch Right Directions
                    if(tRight && this.wanderDirection > 0){dirChoice = 'up';dirOffset={x:1,y:0};};
                    if(tRight && this.wanderDirection < 0){dirChoice = 'down';dirOffset={x:1,y:0};};
                    //Touch Up Directions
                    if(tUp && this.wanderDirection > 0){dirChoice = 'left';dirOffset={x:0,y:-1};};
                    if(tUp && this.wanderDirection < 0){dirChoice = 'right';dirOffset={x:0,y:-1};};
                    //Touch Down Directions
                    if(tDown && this.wanderDirection > 0){dirChoice = 'right';dirOffset={x:0,y:1};};
                    if(tDown && this.wanderDirection < 0){dirChoice = 'left';dirOffset={x:0,y:1};};
                }
                if(dirChoice != 'none'){
                    //local choice directions
                    let dV = this.setDirectionalArrayVelocity(dirChoice,mv_speed);

                    if(this.targetMoveTile == null){
                        //Pick new Target Tile  
                        this.findDestinationTile(tpX,tpY,dV.vX,dV.vY,dirOffset.x,dirOffset.y);                    
                        
                    }
                }


            }

            //Set fall time
            if(this.falltime > 15){
                //this.setIgnoreGravity(false); 
                if(this.targetMoveTile != null){this.clearTargetMoveTile();};
                //this.setVelocityY(this.fall_speed);
                this.body.force.y += this.body.mass * 0.001;
            }
        }
        //Update Thread
        this.drawSilkThreads();

        //Load TileData for Prev
        this.tilePos.px = (this.x/32 << 0);
        this.tilePos.py = (this.y/32 << 0);
    }
    clearTargetMoveTile (){
        this.prevTargetMoveTile = this.targetMoveTile;
        this.targetMoveTile = null;
    }
    setDirectionalArrayVelocity(dir,ms){
        let dVelX = this.wanderDirections[dir].x;
        let dVelY = this.wanderDirections[dir].y;
        //Set Velocity        
        this.setVelocity(dVelX*ms,dVelY*ms);
        //console.log(dir,this.body.velocity,dVelX*ms,dVelY*ms);
        return {vX:dVelX,vY:dVelY};
    }
    findDestinationTile(oX,oY,velX,velY,dOsX,dOsY){
        //Velocity should be set here.
        let checkTile = map.getTileAt(oX+velX+dOsX,oY+velY+dOsY, true, this.scene.fglayer)
        if(checkTile != null){  
            if(checkTile.index == -1){
                //Negate the offset, Adjusted Offset X and Y
               
                let adOsX = dOsX*-1;
                let adOsY = dOsY*-1;  
                   


                this.targetMoveTile = {x:checkTile.x+adOsX,y:checkTile.y+adOsY};//Hard coding offset for ground touch here. Need to check touching 
                if(this.prevTargetMoveTile != null){
                    if(this.targetMoveTile.x == this.prevTargetMoveTile.x && this.targetMoveTile.y == this.prevTargetMoveTile.y){
                        console.log("NO TARGET PROGRESS")
                        //BUG on 1 velocity movement speed. Skips by the tile.
                    }
                }
                //console.log("Found target:",this.targetMoveTile,this.prevTargetMoveTile);
            }
            this.debugScanTile.x = checkTile.x*mapTileSize.tw;
            this.debugScanTile.y = checkTile.y*mapTileSize.tw;            
        }


        
    }
    drawSilkThreads(){
        
        //Update Thread end position to the active shot.
        if(this.silkshot.active){
            this.silkthread.eX = this.silkshot.x;
            this.silkthread.eY = this.silkshot.y;
        }
        if(this.climbing){
            this.silkthread.sY = this.y;

            this.silkGraphic.clear();          
            this.silkGraphic.lineStyle(5, this.silkthread.color, 1.0);
            this.silkGraphic.beginPath();
            this.silkGraphic.moveTo(this.silkthread.sX, this.silkthread.sY);
            this.silkGraphic.lineTo(this.silkthread.eX, this.silkthread.eY);
            this.silkGraphic.closePath();
            this.silkGraphic.strokePath();
        }else{
            this.silkGraphic.clear();
        }
        
        
    }
    shootSilk(){
        if(!this.jumping){
            //Random Chance to Climb
            let rClimb = Phaser.Math.Between(0,10);
            if(rClimb < 2){ // 20% chance?
                this.silkshot.fire(this.x, this.y, 0, -4, 400);
                this.silking = true;
                //Create silk line
                this.silkthread = {sX:this.x,sY:this.y,eX:this.x,eY:this.y,color:0xEEEEEE};        
            }
        }
    }
    climbToTile(){
        //Fire Projectile at ceiling. If hits a tile, then drawn line, and start climb.    
        this.silking = false;  
        this.climbing = true;
        this.setIgnoreGravity(true);
    }
    doAttack(){
        //After attack telegraphed, perform the attack
    }
    startAttack(){
        //Give Random chance to attack.
        if(!this.jumping && !this.climbing){
            let tUp = (this.touching.up > 0);
            let jDirY = tUp ? this.jump_speed : -this.jump_speed;
            let jDirX = this.jump_speed;

            if(this.canSee(solana)){
                if(solana.x < this.x){
                    this.wanderDirection = -1;
                }else{
                    this.wanderDirection = 1;
                }
            }
            jDirX = jDirX*this.wanderDirection;
            this.setVelocity(jDirX,jDirY);
            this.jumping = true;
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