//Abilities Library
//Items have a primary and secondary ability for each.
//Items are normal, and then charged. Once charged, they get their secondary ability.

//Solarblast - Solana : Fire a blast of solar energy. Can defeat enemies and light up crystals

//Halo of Light - Solana : Persists for several seconds, and gives light. 

//Search for the Light - Solana : Solana Teleports to Bright, instantly taking the light and turning him to dark.

//Super Nova - Solana: Sends a blast of small suns out in all directions.

//Wings of the Phoenix - Solana: Allows her to second jump, surging forward and slightly up.

//Pillar of the Sun - Solana: Calls down a pillar of light that blocks all enemeies and damages them in a close area.

//Bright Bump - Bright: Bumps Solana in a direction. Can toss her up.

//Bright Beam - Bright: Fires a beam that can be walked on by Solana and persists for a short time.
class BrightBeam {
    constructor(scene, x,y, angle){
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.rects = [];
        this.angle = angle;
        this.width = 10;//Pixel size of a default chunk
        this.height = 4;//Pixel size of default chunk
        this.ready = true;
        //NOT WORKING
        // var graphics = this.scene.make.graphics().fillStyle(0xFFFF00).fillRect(this.x, this.y, this.width, this.height);

        // graphics.generateTexture('beamRect',this.width, this.height);
        // let newRect = this.scene.matter.add.image(this.x, this.y, 'beamRect');
        // graphics.destroy();

        //WORKING
        if(this.scene.textures.get("beam1").key != "__MISSING"){  
            let oldShadow = this.scene.textures.get("beam1");
            oldShadow.destroy();
        }
        this.texture = this.scene.textures.createCanvas('beam1', this.width, this.height);

        //  We can access the underlying Canvas context like this:
        var grd = this.texture.context.createLinearGradient(0, 0, this.width, this.height);
    
        grd.addColorStop(0, '#CCCC00');
        grd.addColorStop(1, '#FFFF33');
    
        this.texture.context.fillStyle = grd;
        this.texture.context.fillRect(0, 0, this.width, this.height);
    
        //  Call this if running under WebGL, or you'll see nothing change
        this.texture.refresh();

        //COMPONSITE MATTERJS
        //Matter.Composite.allBodies(this.matter.world.engine.world)
        //console.log(this.matter.world.engine.world.bodies); // All Bodies in the world
        //Matter.Query.point(bodies, point)
        //Query every X pixels along the length. Once it hits a body of the unallowed type, stop and measure distance. Keep 
        //reducing by half until it does not hit. Then walk it out 1 pixel at a time. Or just walk it out 1 pixel from the begining.
        //Once length is set, make the bridge, scaleing the bodies to best fit.

        let spark1 = this.scene.add.particles('lightburst-1');
        this.sparker = spark1.createEmitter({
            active:true,
            x: 0,
            y: 0,
            angle: 300,
            speed: { min: 50, max: -50 },
            gravityY: -400,
            scale: { start: 0.2, end: 0.0 },
            lifespan: 500,
            blendMode: 'ADD'
        });
        this.sparker.setVisible(true);
        

    }
    create(x,y,angle){
        this.x = x;
        this.y = y;
        this.angle = angle;

        this.rects.forEach(function(e){
            e.destroy();
        });
        this.blast = ab_solarblasts.get();
        let bulletSpeed = 5;
        let vecX = Math.cos(angle)*bulletSpeed;
        let vecY = Math.sin(angle)*bulletSpeed;  
        
        this.blast.fire(this.x,this.y, vecX, vecY, 35);

        //Fire a project that is moving and "creates" the light beam
        //The walkway will slowly fade and die from the oldest to the newest.
        //It gives off sparks of light, and lights up the area as well.

        //Phaser.Physics.Matter.Matter.Query.point(this.matter.world.localWorld.bodies, {x:pointer.worldX, y:pointer.worldY})
        //Phaser.Physics.Matter.Matter.Query.collides(this.body, this.matter.world.localWorld.bodies)
        //Run until a collision
        let doMake = true;
        let r=0;
        while(doMake){

            let dX = Math.cos(angle)*(this.width*r)+this.x;
            let dY = Math.sin(angle)*(this.width*r)+this.y;  
            
            let beamblock = ab_brightbeams.get(dX, dY, 'beam1')  
            beamblock.setup(this,angle);

            r++;
            let ck = Phaser.Physics.Matter.Matter.Query.collides(beamblock.body, this.scene.matter.world.localWorld.bodies);
            //console.log(ck);
            this.rects.push(beamblock);
            if(ck.length > 2 || r > 15){
                doMake = false;

                //Try just killing the last one
                beamblock.destroy();

            //     //Start a new loop to rescale the body until it no longer collides.
            //     //rescale method Phaser.Physics.Matter.Matter.Body.scale(body,x,y,worldpoint)


            //     let newScale = 1;
            //     while(ck.length > 2){
            //         newScale = newScale*.5;
            //         console.log("Scaleing beam body", newScale);
            //         // let tX = Math.cos(angle)*((this.width*newScale))*(r-1)+this.x;
            //         // let tY = Math.sin(angle)*((this.width*newScale))*(r-1)+this.y;
            //         // newRect2.setPosition(tX,tY);
            //         Phaser.Physics.Matter.Matter.Body.scale(newRect2.body,newScale,1)
            //         newRect2.setScale(newScale,1);
            //         ck = Phaser.Physics.Matter.Matter.Query.collides(newRect2.body, this.scene.matter.world.localWorld.bodies);
            //     }
            }

        }

    }
    setReady(){
        this.ready = true;
    }
    

}
class BrightBeamBlock extends Phaser.Physics.Matter.Image{
    constructor(scene,x,y,texture) {
        super(scene.matter.world, x, y, texture,0)
        this.scene = scene;
        scene.matter.world.add(this);
        scene.add.existing(this);
        //Bodies
        const { Body, Bodies } = Phaser.Physics.Matter.Matter; 
        const { width: w, height: h } = this;
        const mainBody =  Bodies.rectangle(0,0,w,h);
        const compoundBody = Body.create({
            parts: [mainBody],
            frictionStatic: 0,
            frictionAir: 0.00,
            friction: 0.1,
            restitution : 0.0,
            label: "BRIGHTBEAM"
        });
        this
        .setExistingBody(compoundBody)
        .setCollisionCategory(CATEGORY.BULLET)
        .setCollidesWith([ CATEGORY.SOLANA, CATEGORY.DARK, CATEGORY.SOLID])
        .setPosition(x,y)
        .setStatic(true);  
        console.log("block created");

    }
    setup(parent,angle){
        //Custom Props 
        this.setActive(true);
        this.rotation = angle;
        this.particleEffect = parent.sparker;
        this.source = parent.blast; 
        this.decayAlpha = {l:1,r:1}
        this.beginDecay = false;
        this.delayDecay = {i:0,m:300};
        this.setAlpha(0);
        this.decayRate = .05;
    }
    update(time, delta)
    {
        
        if(this.source){
            let srcVelX = this.source.body.velocity.x;
            let srcVelY = this.source.body.velocity.y;
            let srcPosX = this.source.x;
            let srcPosY = this.source.y;
            if((srcVelX > 0 && srcPosX > this.x || srcVelX < 0 && srcPosX < this.x) 
            && (srcVelY > 0 && srcPosY > this.y || srcVelY < 0 && srcPosY < this.y)
            && this.beginDecay == false){
                this.beginDecay = true;
                this.setAlpha(1);
            }
        }
        if(this.beginDecay && this.delayDecay.i >= this.delayDecay.m){
            this.decayAlpha.r = this.decayAlpha.r > 0 ? this.decayAlpha.r - this.decayRate : 0;
            //this.decayAlpha.l = this.decayAlpha.l > 0 ? this.decayAlpha.l - this.decayRate*2 : 0;
            // this.setAlpha(this.decayAlpha.l,this.decayAlpha.r,this.decayAlpha.l,this.decayAlpha.r);  
            this.setAlpha(this.decayAlpha.r);
            if(this.decayAlpha.r == 0){this.cleanUp()};
        }
        if(this.beginDecay && this.delayDecay.i < this.delayDecay.m){
            this.delayDecay.i++;
            this.particleEffect.emitParticleAt(this.x,this.y,1);
        };
    }
    cleanUp(tween, targets, beam){
        this.destroy();
    }

}

//SolarBlast

class SolarBlast extends Phaser.Physics.Matter.Sprite{

    constructor(scene,x,y) {
        super(scene.matter.world, x, y, 'ability_solarblast', 0)
        this.scene = scene;
        scene.matter.world.add(this);
        scene.add.existing(this);
        //Bodies
        const { Body, Bodies } = Phaser.Physics.Matter.Matter; 
        const { width: w, height: h } = this;
        const mainBody =  Bodies.circle(0,0,w*.40);
        const compoundBody = Body.create({
            parts: [mainBody],
            frictionStatic: 0,
            frictionAir: 0.00,
            friction: 0.1,
            restitution : 0.7,
            label: "ABILITY-SOLAR-BLAST"
        });
        this.setExistingBody(compoundBody).setCollisionCategory(CATEGORY.BULLET)
        .setCollidesWith([ CATEGORY.MIRROR, CATEGORY.GROUND, CATEGORY.SOLID, CATEGORY.ENEMY ]).setPosition(x, y)
        .setScale(.5).setIgnoreGravity(true);
        //Custom Props
        this.damage = 1;    
        this.lifespan = 0;
        this.bounced = false;
    }
    fire(x, y, xV, yV, life)
    {       
        this.setPosition(x,y);
        this.setActive(true);
        this.setVisible(true);

        this.lifespan = life;
        this.setVelocity(xV,yV);
        this.anims.play('ability-solar-blast-shoot', true); 

    }
    hit(){
        this.lifespan = 0;
        this.kill();
    }
    kill(){       
        this.setVelocity(0,0);
        this.setPosition(-1000,-1000);
        this.setActive(false);
        this.setVisible(false); 
    }
    update(time, delta)
    {
        if(this.active){
        this.lifespan--;
            if (this.lifespan <= 0)
            {
                this.kill();
            }
        }

    }

};