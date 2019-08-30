//When enemies are hit, they lose globs of oily shadow, of varying size, that fly off of them.
class Firefly extends Phaser.Physics.Matter.Sprite{
    constructor(scene,x,y) {
        super(scene.matter.world, x, y, 'fireflies', 0)
        this.scene = scene;       
        scene.matter.world.add(this);
        scene.add.existing(this); 
        this.setActive(true);
        this.sprite = this;

        const { Body, Bodies } = Phaser.Physics.Matter.Matter; // Native Matter modules
        
        const { width: w, height: h } = this.sprite;
        //const mainBody = Bodies.rectangle(0, 0, w * 0.6, h, { chamfer: { radius: 10 } });
        

        const mainBody = Bodies.rectangle(0, 0, w * 0.6, h-12, { isSensor: true });  

        const compoundBody = Body.create({
          parts: [mainBody],
          //parts: [mainBody],
          frictionStatic: 0,
          frictionAir: 0.00,
          friction: 0.00,
          restitution: 0.00,
          label: "FIREFLY"
        });

        this
        .setExistingBody(compoundBody)
        .setScale(1)
        .setFixedRotation(true) // Sets inertia to infinity so the player can't rotate
        .setIgnoreGravity(true)
        .setPosition(x, y);
        //Custom Properties
        this.anims.play('firefly-move', true); 
        this.flashTimer = this.scene.time.addEvent({ delay: Phaser.Math.Between(3000, 5000), callback: this.startFlash, callbackScope: this, loop: false });
        this.wanderAllowance = 16;
        this.wanderRange = {minX: this.x-this.wanderAllowance, maxX: this.x+this.wanderAllowance, minY: this.y - this.wanderAllowance, maxY: this.y+this.wanderAllowance};
        this.wanderVec = new Phaser.Math.Vector2(Phaser.Math.Between(-1,1),Phaser.Math.Between(-1,1));
        
        this.debug = this.scene.add.text(this.x, this.y-16, '', { fontSize: '10px', fill: '#00FF00' }); 
        //Move Fireflies to the front
        this.setDepth(DEPTH_LAYERS.FRONT);
    }
    update(time, delta)
    {
       
        this.setVelocity(this.wanderVec.x,this.wanderVec.y);           
        this.newWander();
        //this.debug.setText("Vel: x:"+String(this.wanderVec.x)+" y:"+String(this.wanderVec.y));
        this.rotation = this.wanderVec.angle();
    }
    startFlash(){        
        this.sprite.anims.play('firefly-flash', true); 
        this.sprite.once('animationcomplete',this.stopFlash,this);  
        
    }
    stopFlash(){
        this.anims.play('firefly-move', true);
        this.flashTimer = this.scene.time.addEvent({ delay: Phaser.Math.Between(3000, 5000), callback: this.startFlash, callbackScope: this, loop: false });
    }
    newWander(){

        if(this.x < this.wanderRange.minX || this.x > this.wanderRange.maxX){       
            this.wanderVec.x = this.x < this.wanderRange.minX ?  Phaser.Math.Between(1,5)/10: Phaser.Math.Between(-1,-5)/10;
        }    
        if(this.y > this.wanderRange.maxY || this.y < this.wanderRange.minY){            
            this.wanderVec.y = this.y < this.wanderRange.minY ?  Phaser.Math.Between(1,5)/10: Phaser.Math.Between(-1,-5)/10;
        }
        if(this.wanderVec.x == 0){this.wanderVec.x = Phaser.Math.Between(-1,1)};
        if(this.wanderVec.y == 0){this.wanderVec.y = Phaser.Math.Between(-1,1)};
    }
    collect(){
        
    }
    spawn(){

    }
};
class NPC extends Phaser.Physics.Matter.Sprite{
    constructor(scene,x,y,texture) {
        super(scene.matter.world, x, y, texture, 0)
        this.scene = scene;       
        scene.matter.world.add(this);
        scene.add.existing(this); 
        this.setActive(true);
        this.sprite = this;

        const { Body, Bodies } = Phaser.Physics.Matter.Matter; // Native Matter modules
        
        const { width: w, height: h } = this.sprite;

        this.sensor = new NPCSensor(this);

        const mainBody = Bodies.rectangle(0, 0, w, h);  

        const compoundBody = Body.create({
          parts: [mainBody],
          //parts: [mainBody],
          frictionStatic: 0,
          frictionAir: 0.00,
          friction: 0.80,
          restitution: 0.00,
          label: "NPC"
        });

        this
        .setExistingBody(compoundBody)
        .setCollisionCategory(CATEGORY.SOLID)
        .setCollidesWith([ CATEGORY.SOLID, CATEGORY.GROUND ])
        .setScale(1)
        .setFixedRotation(true) // Sets inertia to infinity so the player can't rotate 
        .setPosition(x, y);

        this.stage = 0; // Where is the NPC at in it's timeline.
        this.dialogueEnabled = true;
        this.dialogueIndex = 0;
        this.dialogueFlow = 'random';
        this.dialogueTriggered = false;
        this.dialogueReady = false;
        let diaDelay = 0;
        this.dialogTarget = this;
        this.dialogLoop = false;
        this.dialogueDB = JSON.parse(JSON.stringify(npcDialogues));;
        if(this.checkDialogueType('delay')){
            diaDelay = this.dialogueDB[this.dialogueIndex].startAction.value;
        };
        this.readyTimer = this.scene.time.addEvent({ delay: diaDelay, callback: this.dialogueStartReady, callbackScope: this, loop: false });
        //Wander Movement Stuff
        this.wanderRange = Phaser.Math.Between(12,32);
        this.wander = {distanceX:{min:this.x-this.wanderRange,max:this.x+this.wanderRange},direction:1};
        this.moveSpeed = Phaser.Math.Between(1,20) / 10;
    }
    update(time, delta)
    {
        if(this.dialogueEnabled){
            if(this.checkDialogueType('auto') || this.checkDialogueType('delay')){
                this.triggerDialogue();
            }else if(this.checkDialogueType('distance')){
                if(Phaser.Math.Distance.Between(solana.x,solana.y,this.x,this.y) < this.dialogueDB[this.dialogueIndex].startAction.value){
                    this.dialogTarget = solana;
                    this.triggerDialogue();
                }
            }
            if(this.dialogue != undefined){
                if(this.dialogue.isComplete){
                    this.resetDialogue();
                }else if(this.dialogue.isRunning){
                    this.dialogue.update();
                }
            }
        }
        this.sensor.setPosition(this.x,this.y);
        this.setVelocityX(this.moveSpeed*this.wander.direction);
        if(this.x <= this.wander.distanceX.min){this.wander.direction = 1;}        
        if(this.x >= this.wander.distanceX.max){this.wander.direction = -1}

    }
    resetDialogue(){
        console.log("resetDialogue",this.dialogueIndex, this.dialogueDB.length)
        //Dialogue Completed, Move to next.
        if(this.dialogueIndex < this.dialogueDB.length-1){  
            this.incrementDialogue();
        }else{
            if(this.dialogLoop){
                this.dialogueIndex = 0;     
            }else{
                this.dialogueIndex = 0;
                this.dialogueEnabled = false;
            }
        }
        //Add additional delay for tween here.          
        this.dialogue = undefined;
        this.dialogueTriggered = false;        
        let diaDelay = 0;
        if(this.checkDialogueType('delay')){
            diaDelay = this.dialogueDB[this.dialogueIndex].startAction.value;
        };
        this.dialogueReady = false;
        this.readyTimer = this.scene.time.addEvent({ delay: diaDelay, callback: this.dialogueStartReady, callbackScope: this, loop: false });

    }
    incrementDialogue(){
        this.dialogueIndex++;
    }
    dialogueStartReady(){
        this.dialogueReady = true;
    }
    triggerDialogue(){
        if(this.dialogueTriggered == false && this.dialogueReady == true){
            this.dialogueTriggered = true;
            //Start Dialogue
            let dialogueChain = this.dialogueDB[this.dialogueIndex].data;

            for(let i=0;i<dialogueChain.length;i++){
                let e = dialogueChain[i];
                if (e.speaker == 'src') {
                    e.speaker = this;
                } else if (e.speaker == 'trg') {
                    e.speaker = this.dialogTarget;
                };
            }
            this.dialogue = new Dialogue(this.scene,dialogueChain,54,-40);
            this.dialogue.start();
            //Start Tween.
            let dialogueTween = this.dialogueDB[this.dialogueIndex].tween;
            if(dialogueTween){
                let npcTween = this.scene.tweens.add({
                    targets: this,
                    props: dialogueTween,
                    onComplete: this.tweenComplete,
                    onCompleteParams: [this],
                });
                // npcTween.on('complete', function(tween, targets){

                // }, scope);
            }
        }
    }
    tweenComplete(tween, targets, npc){

    }
    interact(obj){
        if(this.checkDialogueType('interact')){
            this.dialogTarget = obj;
            this.triggerDialogue();
        }     
    }
    checkDialogueType(type){
        if(this.dialogueDB[this.dialogueIndex].startAction.type == type){
            return true;
        }
        return false;
    }
};
class NPCSensor extends Phaser.Physics.Matter.Image{
    constructor(parent) {
        super(parent.scene.matter.world, parent.x, parent.y, 'npc1', 0)        
        parent.scene.matter.world.add(this);
        parent.scene.add.existing(this); 
        this.setActive(true);
        this.parent = parent;
        const { Body, Bodies } = Phaser.Physics.Matter.Matter; // Native Matter modules
        //Set Control Sensor - Player can't collide with mirrors, but bullets can. Sensor can detect player inputs.
        const controlSensor =  Bodies.rectangle(0, 0, this.width, this.height, { isSensor: true });
        const controlBody = Body.create({
            parts: [controlSensor],
            frictionStatic: 0,
            frictionAir: 0.00,
            friction: 0.00,
            restitution: 0.00,
            label: "NPCSensor"
        });

        this
        .setExistingBody(controlBody)
        .setStatic(true)
        .setFixedRotation() 
        .setIgnoreGravity(true)  
        .setVisible(false);
    }
    update(time, delta)
    {       

    }
}
class Polaris extends NPC{
    constructor(scene,x,y) {
        super(scene, x, y, 'polaris', 0);
        this.setIgnoreGravity(true);
        this.dialogueIndex = guideDialogueIndex;
        this.dialogueDB = JSON.parse(JSON.stringify(polarisDialogues));

        //Wander Movement Stuff
        this.wanderRange = 0;
        this.wander = {distanceX:{min:this.x-this.wanderRange,max:this.x+this.wanderRange},direction:1};
        this.moveSpeed = 0;
    }
    incrementDialogue(){
        this.dialogueIndex++;
        guideDialogueIndex =  this.dialogueIndex;
    }
};

//Auto - Just starts ASAP
//Delay - Starts with delay
//Interact - Requires solana button
//Distance - Triggers based on Solana distance.

var npcDialogues = [{startAction:{type:"distance",value:128},data:
[{speaker:"src",ttl:2000,text:"Good to see you up and about Princess."},
{speaker:"src",ttl:2000,text:"Praise be to the sun!"}]},
];

var polarisDialogues = [{startAction:{type:"distance",value:64},data:
[{speaker:"src",ttl:2000,text:"Good to see you up and about Princess."},
{speaker:"src",ttl:2000,text:"Move left and right with your left stick or the A/D keys."},
{speaker:"trg",ttl:1000,text:"On my way master Polaris!"}]},
{startAction:{type:"auto",value:64},data:
[{speaker:"src",ttl:1000,text:"You can talk to me with your interact button"},
{speaker:"src",ttl:2000,text:"Move to me and press interact!"},
{speaker:"trg",ttl:1000,text:"Of course master Polaris!"}],tween:{x: { value: '+=50', duration: 5000, ease: 'Bounce.easeOut' },y: { value: '+=0', duration: 1500, ease: 'Bounce.easeOut' }}},
{startAction:{type:"interact",value:64},data:
[{speaker:"src",ttl:2000,text:"Well done! Lets prepare you for the journey ahead."},
{speaker:"src",ttl:1000,text:"Follow me!"},
{speaker:"trg",ttl:1000,text:"Can do!"}],tween:{x: { value: '+=200', duration: 5000, ease: 'Bounce.easeOut' },y: { value: '-=50', duration: 1500, ease: 'Bounce.easeOut' }}}
];