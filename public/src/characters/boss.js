//SPIDER HIVE - BOSS # 1
//Spawns up to three spiders to chase player.
//Spawns every 15 seconds if there is room.
//Sprays webbing and acid every 5-10 seconds after a pulsating charge up.
//How to defeat?
class SpiderHive extends Phaser.Physics.Matter.Sprite{
    constructor(scene,x,y) {
        super(scene.matter.world, x, y, 'boss_spiderhive', 0)        
        scene.matter.world.add(this);
        scene.add.existing(this); 
        this.setActive(true);
        const { Body, Bodies } = Phaser.Physics.Matter.Matter; // Native Matter modules
        const { width: w, height: h } = this;

        const coreArea =  Bodies.rectangle(0, 0, this.width*.80, this.height*.60, { chamfer: {radius: 5}, isSensor: false });

        const mainBody = Body.create({
            parts: [coreArea],
            frictionStatic: 0,
            frictionAir: 0.00,
            friction: 0.90,
            restitution: 0.00,
            label: "BossSpiderHive"
        });

        // mainBody.render.sprite.xOffset = .51;
        // mainBody.render.sprite.yOffset = .80;

        this
        .setExistingBody(mainBody)
        .setFixedRotation() 
        .setIgnoreGravity(false);  

        console.log("BOSS: SPIDERHIVE SPAWNED",x,y);

        //Custom Properties
        this.gun = new Gun(60,1,70);
        this.spawnGlob = new SpiderSpawnOrb(this.scene,-1000,0,'bullet');
        this.spawnGlob.setFrame(17);
        this.spawnGlob.setCollidesWith([ CATEGORY.GROUND,CATEGORY.SOLID]);
        this.spawnGlob.owner = this;          
        this.spawnGlob.setIgnoreGravity(false);
        this.spiderlings = [];
        
    }
    update(time,delta){
        this.anims.play('boss-hive', true);
        this.spew();
    }
    spew(){
        if(spiders.countActive(true) < 3){
            if (this.gun.ready)//ROF(MS)
            {    
                this.spawnGlob.fire(this.x, this.y-(this.height*1/4), 2, -6, 300);
                this.gun.shoot();//Decrease mag size. Can leave this out for a constant ROF.
            }
            if(this.gun){
                this.gun.update();
            }
        }
    }
    //Could check the amount of active spiders? If there is less than three, just spawn more.
    spawnSpider(x,y){
        console.log("trying to spawn spiders",spiders.countActive(true));
        if(spiders.countActive(true) < 3){
            let tpX = (x/32 << 0);
            let tpY = (y/32 << 0);

            let newSpider = spiders.get(tpX*32-16,tpY*32-16);
            newSpider.setPosition(tpX*32-16,tpY*32-16);
            newSpider.hive = this;
            newSpider.id = Phaser.Math.Between(0,999);
        }
    }
    // removeSpider(id){
    //     let q = -1;
    //     for(let i=0;i < this.spiderlings.length;i++){
    //         if(this.spiderlings[i].id == id){
    //             q = i;
    //         }
    //     }   
    //     if(q != -1){
    //         this.spiderlings.splice(q,1);
    //     }   
        
    // }
}