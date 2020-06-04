class EnemySpiker {
    constructor(scene,x,y,angle){
        this.scene = scene;
        //base
        const { Body, Bodies } = Phaser.Physics.Matter.Matter; // Native Matter modules   
        this.base = this.scene.matter.add.image(x, y-16, 'spiker', 2, { shape: {type:'rectangle',width:16,height:16}, chamfer: { radius: 5 }, mass: 200, restitution: 0.0, friction: 0.5, frictionAir: 0.5 });
        this.base.setStatic(true);
        //Arm
        this.armsegements = [];
        for(let s=0;s<4;s++){
            let newSeg = this.scene.matter.add.image(x, y-48-(s*12), 'spiker', 3, { shape: {type:'rectangle',width:12,height:12}, chamfer: { radius: 2 }, mass: 0.3, restitution: 0.0, friction: 0.9, frictionAir: 0.03 });
            //newSeg.setCollidesWith([0]);
            if(s == 0){
                this.scene.matter.add.joint(this.base,newSeg, 2, 1,{
                    pointA: { x: 0, y: (-9) },
                    pointB: { x: 0, y: (6) },
                });
            }else{
                this.scene.matter.add.joint(this.armsegements[s-1],newSeg, 2, 1,{
                    pointA: { x: 0, y: (-6) },
                    pointB: { x: 0, y: (6) },
                });
            }
            this.armsegements.push(newSeg);
        }
        //Stinger
        this.stinger = this.scene.matter.add.image(x, y-48-(this.armsegements.length*12), 'spiker', 0, { shape: {type:'circle', radius: 8} , label: "ENEMY_STINGER",mass: 0.3, restitution: 0.0, friction: 0.5, frictionAir: 0.03 });
        this.scene.matter.add.joint(this.armsegements[this.armsegements.length-1],this.stinger, 8, 0.4,{
            pointA: { x: 0, y: (-6) },
            pointB: { x: 0, y: 4 },
        });
        
        this.scene.events.on("update", this.update, this);        
        this.scene.events.on("shutdown", this.remove, this);
        this.active = true;
        this.stingerForce = 0.0008;
        //Attack timer -Make the attack look correct.
        this.attackTimer = {c:0,f:90}
    }
    update(time,delta){
        if(this.active){
            let target = solana;
            let solDis = distanceBetweenObjects(solana,this.stinger);
            if(solDis < 128){
                let angToPlayer = Phaser.Math.Angle.Between(this.stinger.x,this.stinger.y,target.x,target.y);
                this.stinger.setRotation(angToPlayer+(Math.PI/4));
                let curForce = this.stingerForce;
                if(this.attackTimer.c >= this.attackTimer.f){
                    curForce = 0.10;
                    this.attackTimer.c = 0;
                }
                this.stinger.applyForce({x:Math.cos(angToPlayer)*curForce,y:Math.sin(angToPlayer)*curForce});
                
                this.attackTimer.c++;
            }else{
                this.attackTimer.c = 0;
            }
        }
    } 
    shrink(){
        this.armsegements.forEach(e=>{
            e.setCollidesWith([CATEGORY.SOLID])
        })
        let tween = this.scene.tweens.add({
            targets: this.base,
            y: this.base.y+64,               
            ease: 'Linear',       
            duration: 1000, 
        });
        

    }
    grow(){
        this.armsegements.forEach(e=>{
            e.setCollidesWith([1])
        })
        let tween = this.scene.tweens.add({
            targets: this.base,
            y: this.base.y-64,               
            ease: 'Linear',       
            duration: 1000, 
        });
    }
    remove(){
        this.active = false;
        this.base.destroy();
        this.armsegements.forEach(e=>{
            e.destroy();
        });        
        this.stinger.destroy();
    }
}