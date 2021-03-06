var MainMenu = new Phaser.Class({

    Extends: Phaser.Scene,

    initialize:

    function MainMenu ()
    {
        Phaser.Scene.call(this, { key: 'mainmenu' });
    },

    preload: function ()
    {
        initGamePads(this,this.showMenuSelect);
    },

    create: function ()
    {
        //Background Effects
        this.particle_flame_fall = this.add.particles('shapes',  this.cache.json.get('effect-flame-fall'));          
        this.particle_flame_fall.createEmitter((this.cache.json.get('effect-flame-fall'))[0]);
        this.particle_flame_fall.createEmitter((this.cache.json.get('effect-flame-fall'))[0]); 
        this.particle_flame_fall.createEmitter((this.cache.json.get('effect-flame-fall'))[0]);
        //console.log(this.particle_flame_fall)
        //Emmitter List      
        this.particle_flame_fall.emitters.list[0].setPosition(50,Phaser.Math.Between(-450,150));
        this.particle_flame_fall.emitters.list[1].setPosition(525,Phaser.Math.Between(-450,150));
        this.particle_flame_fall.emitters.list[2].setPosition(700,Phaser.Math.Between(-450,150));
        this.particle_flame_fall.emitters.list[3].setPosition(900,Phaser.Math.Between(-450,150));

        //Selection Box for Gamepad
        this.selectionRect = this.add.rectangle(game.canvas.width/2,300,195,55,0xFFD700,1);
        this.selectionRect.setStrokeStyle(5, 0xFFFFFF, .8);
        this.selectionRect.setVisible(false);
        //noClick, noClick Hover, Click, Click Hover
        this.btnstartSP = this.addButton(0, 0, 'button_yellow', this.doStartSingle, this, 0, 1, 0, 1);
        this.btnstartSP.setPosition(game.canvas.width/2,300);
        this.btnstartMPlocal = this.addButton(0, 0, 'button_yellow', this.doStartLocalMP, this, 0, 1, 0, 1);
        this.btnstartMPlocal.setPosition(game.canvas.width/2,400);
        this.btnOptions= this.addButton(0, 0, 'button_yellow', this.doStartOnlineMP, this, 0, 1, 0, 1);
        this.btnOptions.setPosition(game.canvas.width/2,500);

        this.menuArray = [this.btnstartSP,this.btnstartMPlocal,this.btnOptions];
        this.menuSelectionIndex = 0;
        
        this.sceneTransitionReady = false;
        this.time.addEvent({ delay: 500, callback: this.transitionSet, callbackScope: this, loop: false });

       //Gamepad management 
       //console.log(this.input.gamepad,this.input.gamepad.total,this.input.gamepad.gamepads.length);
       //console.log(Object.keys(this.input.gamepad.gamepads).length)
        // if(this.input.gamepad.gamepads.length > 0) {
        //     console.log("GamePads already connected, merging");
        //     for(let g=0;g<this.input.gamepad.gamepads.length;g++){
        //         gamePad[g] = this.input.gamepad.gamepads[g];
        //     };
        // }else{
        //     //initGamePads(this,function(){});
        // };

        //Text rendering
        let style = { 
            fontFamily: 'visitorTT1',
            fontSize: '16px', 
            fill: '#FFFFFF', 
            stroke: '#000000', 
            strokeThickness: 4,
            align: 'center' 
        };
        this.btnTextSP = this.add.text(game.canvas.width/2,300, 'SINGLE PLAYER', style).setOrigin(0.5);
        this.btnTextMPLocal = this.add.text(game.canvas.width/2,400, 'LOCAL MULTIPLAYER', style).setOrigin(0.5);
        this.btnTextOptions = this.add.text(game.canvas.width/2,500, 'OPTIONS', style).setOrigin(0.5);
        
        this.stickChoke = {c:0,m:5};

    },
    showMenuSelect(scene,navIndex){
        scene.selectionRect.setVisible(true);
    },
    transitionSet(){
        this.sceneTransitionReady = true;
    },
    selectMenuItem(change){

        this.menuSelectionIndex = this.menuSelectionIndex+change;
        if(this.menuSelectionIndex < 0){this.menuSelectionIndex = this.menuArray.length-1;}
        if(this.menuSelectionIndex >= this.menuArray.length){this.menuSelectionIndex = 0;}

        let selectionObj = this.menuArray[this.menuSelectionIndex];
        this.selectionRect.setPosition(selectionObj.x,selectionObj.y);
    },
    update: function(){
        updateGamePads();

        if(gamePad[0].getStickLeft(.1).y == 1 || gamePad[1].getStickLeft(.1).y == 1){
            if(this.stickChoke.c < this.stickChoke.m){
                this.stickChoke.c++;
            }else{
                this.stickChoke.c=0;
                this.selectMenuItem(1);
                console.log("Menu Down");
            }
        }
        if(gamePad[0].getStickLeft(.1).y == -1 || gamePad[1].getStickLeft(.1).y == -1){
            if(this.stickChoke.c < this.stickChoke.m){
                this.stickChoke.c++;
            }else{
                this.stickChoke.c=0;
                this.selectMenuItem(-1);
                console.log("Menu Up");
            }
        }
        if(gamePad[0].checkButtonState('A') == 1 || gamePad[1].checkButtonState('A') == 1){
            switch(this.menuSelectionIndex){
                case 1:
                    this.doStartLocalMP();
                break;
                case 2:
                    this.doStartOnlineMP();
                break;
                default:
                    this.doStartSingle();
            }
          
        }
        //Rain Particles
        let pEmitList = this.particle_flame_fall.emitters.list;
        pEmitList.forEach(function(e){

            e.setPosition(e.x.propertyValue,e.y.propertyValue+3);
            if(e.y.propertyValue > game.canvas.height){
                e.setPosition(Phaser.Math.Between(e.x.propertyValue-50,e.x.propertyValue+50),0);
            }
        })
    },
    doStartOnlineMP:function ()
    {
        playerMode = 2;
		//this.scene.start('lobby');
    }, 	
    doStartLocalMP:function ()
    {        
        playerMode = 1;
        this.scene.start('lobby');
    },
	doStartSingle: function ()
    {        
        playerMode = 0;
		this.scene.start('lobby');
    }

});