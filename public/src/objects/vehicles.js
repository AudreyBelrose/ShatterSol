class Vehicle extends Phaser.Physics.Matter.Sprite{
    constructor(scene,x,y) {
        super(scene.matter.world, x, y, 'minecart', 0)
        this.scene = scene;
        scene.matter.world.add(this);
        scene.add.existing(this); 

        this.setActive(true);

        const { Body, Bodies } = Phaser.Physics.Matter.Matter; // Native Matter modules
        const { width: w, height: h } = this;
        const lWall =  Bodies.rectangle(w*0.20,h*0.10,w*0.10,h*0.40);
        const mWall =  Bodies.rectangle(w*0.50,h*0.20,w*0.50,h*0.15, {chamfer: {radius: 2}});
        const rWall =  Bodies.rectangle(w*0.80,h*0.10,w*0.10,h*0.40);
        const lbumper = Bodies.rectangle(0,0,w*0.20,h*1.50, {isSensor:true});
        const rbumper = Bodies.rectangle(w,0,w*0.20,h*1.50, {isSensor:true});

        const compoundBody = Body.create({
            parts: [lWall,mWall,rWall,lbumper,rbumper],
            frictionStatic: 0.01,
            frictionAir: 0.01,
            friction: 0.01,
            density: 0.1,
            label: "VEHICLE"
        });

        compoundBody.render.sprite.yOffset = 0.5;
        this
        .setExistingBody(compoundBody)
        .setCollisionCategory(CATEGORY.VEHICLE)
        .setCollidesWith([CATEGORY.GROUND,CATEGORY.SOLID,CATEGORY.SOLANA,CATEGORY.DARK,CATEGORY.BRIGHT,CATEGORY.BARRIER])
        .setPosition(x, y) 

        this.wA = scene.matter.add.image(this.x,this.y,'minecart_wheel');
        this.wA.setBody({type: 'circle',radius:6},{friction: 0.9, density: 0.04, frictionAir: 0.01, frictionStatic: 0.01});       
        this.wB = scene.matter.add.image(this.x,this.y,'minecart_wheel')
        this.wB.setBody({type: 'circle',radius:6},{friction: 0.9, density: 0.04, frictionAir: 0.01, frictionStatic: 0.01}); 
        this.wA.setCollisionCategory(CATEGORY.VEHICLE);
        this.wB.setCollisionCategory(CATEGORY.VEHICLE);
        this.wA.setCollidesWith([CATEGORY.GROUND,CATEGORY.SOLID]);
        this.wB.setCollidesWith([CATEGORY.GROUND,CATEGORY.SOLID]);
        let axelA = scene.matter.add.constraint(this.body, this.wA, 0, 0.0, {
            pointA: { x: -w*0.25, y: h*0.31 },//0.24
            length: 0.0,
            stiffness: 0.0
          })
        let axelB = scene.matter.add.constraint(this.body, this.wB, 0, 0.0, {
            pointA: { x: w*0.25, y: h*0.31 },
            length: 0.0,
            stiffness: 0.0
        })
        this.drive_left = false;
        this.drive_right = false;
        this.path = -1;
        this.pathRunning = false;
        this.max_speed = 15;

        this.scene.matterCollision.addOnCollideActive({
            objectA: [this],
            callback: eventData => {
                const { bodyB, gameObjectB,bodyA,gameObjectA } = eventData;
                
                if (gameObjectB !== undefined && gameObjectB instanceof Solana) {
                    // let angVel = -0.5;
                    // gameObjectA.applyForce({x:-0.4,y:0.0});
                    // gameObjectA.wA.setAngularVelocity(angVel);
                    // gameObjectA.wB.setAngularVelocity(angVel);
                    let bVelX = gameObjectA.body.velocity.x;
                    let bVelY = gameObjectA.body.velocity.y;
                    let minX = bVelX < 0 ? bVelX : 0;
                    let maxX = bVelX > 0 ? bVelX : 0;
                    let minY = bVelY < 0 ? bVelY : 0;
                    let maxY = bVelY > 0 ? bVelY : 0;
                    gameObjectB.setMaxMoveSpeed(minX,maxX,minY,maxY);

                    gameObjectA.drive_left = gameObjectB.getControllerAction('left');
                    gameObjectA.drive_right = gameObjectB.getControllerAction('right');

                    if(gameObjectA.path != -1 && gameObjectA.pathRunning == false && (gameObjectA.drive_left || gameObjectA.drive_right)){
                        //gameObjectA.runPath();
                    }
 
                    
                }
                if(gameObjectB instanceof BreakableTile){
                    //3 Speed seems to look good
                    if(gameObjectA.body.speed > 0){
                        gameObjectB.doCrush();
                    }
                }
            }
        });
        this.scene.matterCollision.addOnCollideEnd({
            objectA: [this],
            callback: eventData => {
                const { bodyB, gameObjectB,bodyA,gameObjectA } = eventData;
                
                if (gameObjectB !== undefined && gameObjectB instanceof Solana) {
                    gameObjectB.setMaxMoveSpeed(0,0,0,0);
                    this.drive_left = false;
                    this.drive_right = false;
                }
            }
        });
        //Up to date queue
        this.scene.events.on("update", this.update, this);
        this.scene.events.on("shutdown", this.remove, this);
        this.active = true;
    }
    update(time, delta)
    {       
        if(this.active){
            if(this.drive_left){
                this.applyForce({x:-0.005,y:0});
            }
            if(this.drive_right){
                this.applyForce({x:0.005,y:0});
            }
            //Velocity Limit
            if(this.body.velocity.x > this.max_speed){this.setVelocityX(this.max_speed)};
            if(this.body.velocity.x < -this.max_speed){this.setVelocityX(-this.max_speed)};
            if(this.body.velocity.y > this.max_speed){this.setVelocityY(this.max_speed);};
            if(this.body.velocity.y < -this.max_speed){this.setVelocityY(-this.max_speed)};
            //Body Impulse Limit
            if(this.body.positionImpulse.x > this.max_speed){this.body.positionImpulse.x = this.max_speed};
            if(this.body.positionImpulse.x < -this.max_speed){this.body.positionImpulse.x = -this.max_speed};
            if(this.body.positionImpulse.y > this.max_speed){this.body.positionImpulse.y = this.max_speed};
            if(this.body.positionImpulse.y < -this.max_speed){this.body.positionImpulse.y = -this.max_speed};
        }
    }

    remove(){
        this.active = false;
    }
    runPath(){  
        this.solanaRider = true;      
        this.pathRunning = true;
        this.timeline = this.scene.tweens.createTimeline();
        this.timeline.setCallback('onComplete',this.pathComplete,[this],this.timeline);       
        this.path.forEach(function(e){
            let dis = Phaser.Math.Distance.Between(this.x,this.y,e.x,e.y);
            let t = (dis / 20)*100;
            this.timeline.add({
                targets: this,
                x: e.x,
                y: e.y,
                ease: 'Linear',
                duration: t,
                hold: 0,
                onUpdate: function(tween,targets, cart){
                    if(cart.solanaRider){
                        solana.setPosition(cart.x,cart.y);
                        if(solana.getControllerAction('jump')){
                            solana.jump(solana.jump_speed,0);
                            this.solanaRider = false;
                        }
                    }
                },
                onUpdateParams: [this]
            });
        
        },this);

        this.timeline.play();
        
    }
    pathComplete(cart){
        console.log("Minecart Path Complete");        
        //cart.pathRunning = false;
    }
};