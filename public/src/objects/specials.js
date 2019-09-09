//Setup a special construct for barriers. 
//Barriers block some items, but allow others.
//Barriers can be set toa one way movement, or two way movement.

class Barrier extends Phaser.Physics.Matter.Sprite{
    constructor(scene,x,y,texture) {
        super(scene.matter.world, x, y, texture, 0)
        this.scene = scene;
        // Create the physics-based sprite that we will move around and animate
        scene.matter.world.add(this);
        // config.scene.sys.displayList.add(this);
        // config.scene.sys.updateList.add(this);
        scene.add.existing(this); // This adds to the two listings of update and display.

        this.setActive(true);

        this.sprite = this;

        const { Body, Bodies } = Phaser.Physics.Matter.Matter; // Native Matter modules
        const { width: w, height: h } = this.sprite;
        const mainBody =  Bodies.rectangle(0, 0, w, h);

        const compoundBody = Body.create({
            parts: [mainBody],
            frictionStatic: 0,
            frictionAir: 0.02,
            friction: 0.1
        });

        this.sprite
        .setExistingBody(compoundBody)
        .setCollisionCategory(CATEGORY.BARRIER)
        .setCollidesWith([ ~CATEGORY.BULLET ]) // 0 Is nothing, 1 is everything, ~ is the inverse, so everything but the category
        .setPosition(x, y)
        .setFixedRotation() // Sets inertia to infinity so the player can't rotate
        .setStatic(true)
        .setIgnoreGravity(true);    

        this.debug = scene.add.text(this.x, this.y-16, 'Zone', { fontSize: '10px', fill: '#00FF00' });   
        
        //Make an animation effect that teleports bright to the other side of the barrier as he passes through.


    }
    setBarrierType(){
        //Setup the barrier based on type.
        //This will determine what it collides with, and how it interacts with the players
    }
    setup(x,y,angle){
        this.setActive(true);
        this.setPosition(x,y); 
        this.angle = angle;
    }
    update(time, delta)
    {       

        this.debug.setPosition(this.x, this.y-16);
        this.debug.setText("Zone Status:"+String(this.name));
    }
};

class Crate extends Phaser.Physics.Matter.Sprite{
    constructor(scene,x,y) {
        super(scene.matter.world, x, y, 'crate', 0)
        this.scene = scene;
        scene.matter.world.add(this);
        scene.add.existing(this); 
        this.setActive(true);

        //Scale crate down
        let newScale = 0.08;
        this.setScale((newScale+0.04));

        const { Body, Bodies } = Phaser.Physics.Matter.Matter; // Native Matter modules
        const { width: w, height: h } = this;
        const mainBody =  Bodies.rectangle(0, 0, w*newScale, h*newScale);

        const compoundBody = Body.create({
            parts: [mainBody],
            frictionStatic: 0,
            frictionAir: 0.02,
            friction: 0.1,
            label: "CRATE"
        });

        this
        .setExistingBody(compoundBody)
        .setCollisionCategory(CATEGORY.SOLID)
        .setPosition(x, y) 
    }
    setup(x,y){
        this.setActive(true);
        this.setPosition(x,y); 
    }
    update(time, delta)
    {       

    }
};

class Rock extends Phaser.Physics.Matter.Sprite{
    constructor(scene,x,y) {
        super(scene.matter.world, x, y, 'rocks', 0)
        this.scene = scene;
        scene.matter.world.add(this);
        scene.add.existing(this); 

        this.setActive(true);

        const { Body, Bodies } = Phaser.Physics.Matter.Matter; // Native Matter modules
        const { width: w, height: h } = this;
        const mainBody =  Bodies.circle(0,0,w*.50);

        const compoundBody = Body.create({
            parts: [mainBody],
            frictionStatic: 0.1,
            frictionAir: 0.05,
            friction: 0.3,
            label: "ROCK"
        });

        this
        .setExistingBody(compoundBody)
        .setCollisionCategory(CATEGORY.SOLID)
        .setPosition(x, y) 

        //Setup Collision
        this.scene.matterCollision.addOnCollideStart({
            objectA: [this],
            callback: eventData => {
                const { bodyB, gameObjectB,bodyA,gameObjectA } = eventData;
                
                if (gameObjectB !== undefined && gameObjectB instanceof Bright) {
                    this.impact(gameObjectB);
                }
            }
        });
        this.max_speed = 8;
    }
    setup(x,y,scale){
        this.setActive(true);
        this.setPosition(x,y); 
        this.setScale(scale);
        //Crush Timer
        this.readyCrush = false;
        this.crushTimer = this.scene.time.addEvent({ delay: 300, callback: this.setReadyCrush, callbackScope: this, loop: false });
    }
    update(time, delta)
    {       
        if(this.body.velocity.x > this.max_speed){this.setVelocityX(this.max_speed)};
        if(this.body.velocity.x < -this.max_speed){this.setVelocityX(-this.max_speed)};
        if(this.body.velocity.y > this.max_speed){this.setVelocityY(this.max_speed)};
        if(this.body.velocity.y < -this.max_speed){this.setVelocityY(-this.max_speed)};
    }
    setReadyCrush(){
        this.readyCrush = true;
    }
    impact(obj){
        if(this.readyCrush){
            let fromBody = obj.body;
            let speed = Math.sqrt(Math.pow(fromBody.velocity.x,2)+Math.pow(fromBody.velocity.y,2));
            let force = speed*fromBody.density*100;
            if(force >= 2){                
                console.log("Rock Impact", force >> 0,speed >> 0,fromBody.density);
                if(this.scale > .25){
                    for(let r=0;r< Phaser.Math.Between(1,3);r++){
                        let newRock = rocks.get();
                        newRock.setup(this.x,this.y,this.scale*.75);                        
                    }
                }
                this.destroy();
            }
        }
    }
};

class Fallplat extends Phaser.Physics.Matter.Sprite{
    constructor(scene,x,y,texture,frame) {
        super(scene.matter.world, x, y, texture, frame)
        this.scene = scene;
        scene.matter.world.add(this);
        scene.add.existing(this); 

        this.setActive(true);

        const { Body, Bodies } = Phaser.Physics.Matter.Matter; // Native Matter modules
        const { width: w, height: h } = this;
        const mainBody =  Bodies.rectangle(0,0,w,h);

        const compoundBody = Body.create({
            parts: [mainBody],
            frictionStatic: 0,
            frictionAir: 0.02,
            friction: 0.1,
            label: "FALLPLAT"
        });

        this
        .setExistingBody(compoundBody)
        .setCollisionCategory(CATEGORY.SOLID)
        .setPosition(x, y)
        .setFixedRotation() 
        .setStatic(true);
        //Custom Props
        this.ready = true;
    }
    setup(x,y){
        this.setActive(true);
        this.setPosition(x,y); 
    }
    update(time, delta)
    {       

    }
    touched(){
        //Gradual Wobble and then fall
        //this.setStatic(false);
        if(this.ready){
            this.ready = false;
            let tween = this.scene.tweens.add({
                targets: this,
                x: this.x+1,               // '+=100'
                y: this.y+1,               // '+=100'
                ease: 'Bounce.InOut',       // 'Cubic', 'Elastic', 'Bounce', 'Back'
                duration: 150,
                repeat: 3,            // -1: infinity
                yoyo: true,
                onComplete: this.openComplete,
                onCompleteParams: [this],
            });
        }
    }
    openComplete(tween, targets, myPlat){
        myPlat.setStatic(false);
        myPlat.setVelocityY(6);//Fall faster than player
    }
};

class BreakableTile extends Phaser.Physics.Matter.Sprite{
    constructor(scene,x,y) {
        super(scene.matter.world, x, y, 'breakables', 0)
        this.scene = scene;
        scene.matter.world.add(this);
        scene.add.existing(this); 

        this.setActive(true);

        const { Body, Bodies } = Phaser.Physics.Matter.Matter; // Native Matter modules
        const { width: w, height: h } = this;
        const mainBody =  Bodies.rectangle(0,0,w,h);

        const compoundBody = Body.create({
            parts: [mainBody],
            frictionStatic: 0.1,
            frictionAir: 0.05,
            friction: 0.3,
            label: "BREAKABLE"
        });

        this
        .setExistingBody(compoundBody)
        .setCollisionCategory(CATEGORY.SOLID)
        .setStatic(true)
        .setPosition(x, y) 

        //Setup Collision
        this.scene.matterCollision.addOnCollideStart({
            objectA: [this],
            callback: eventData => {
                const { bodyB, gameObjectB,bodyA,gameObjectA } = eventData;
                
                if (gameObjectB !== undefined && gameObjectB instanceof Bright) {
                    this.impact(gameObjectB);
                }
            }
        });
        this.max_speed = 8;
        this.breakFrame = 0;
        this.breakFrames = [0,1,2,3];
        this.crushTimer = this.scene.time.addEvent({ delay: 300, callback: this.setReadyCrush, callbackScope: this, loop: false });
    }
    setup(x,y,scale,frames){
        this.breakFrames = JSON.parse(frames);
        this.setFrame(this.breakFrames[this.breakFrame]);
        this.setActive(true);
        this.setPosition(x,y); 
        this.setScale(scale);
        //Crush Timer
        this.readyCrush = false;
        
    }
    update(time, delta)
    {       
        if(this.body.velocity.x > this.max_speed){this.setVelocityX(this.max_speed)};
        if(this.body.velocity.x < -this.max_speed){this.setVelocityX(-this.max_speed)};
        if(this.body.velocity.y > this.max_speed){this.setVelocityY(this.max_speed)};
        if(this.body.velocity.y < -this.max_speed){this.setVelocityY(-this.max_speed)};
    }
    setReadyCrush(){
        this.readyCrush = true;
    }
    impact(obj){
        if(this.readyCrush){
            this.readyCrush = false;
            this.crushTimer = this.scene.time.addEvent({ delay: 300, callback: this.setReadyCrush, callbackScope: this, loop: false });
            let fromBody = obj.body;
            let speed = Math.sqrt(Math.pow(fromBody.velocity.x,2)+Math.pow(fromBody.velocity.y,2));
            let force = speed*fromBody.density*100;
            if(force >= 2){                
                this.breakFrame++;
                console.log("setting to frame:",this.breakFrames[this.breakFrame],this.breakFrame);
                if(this.breakFrame < this.breakFrames.length){
                    this.setFrame(this.breakFrames[this.breakFrame]);
                }else{
                    this.destroy();
                }
                
                
            }
        }
    }
};
