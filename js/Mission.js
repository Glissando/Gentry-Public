BasicGame.Mission = function (game) {
	this.cameraSpeed = 6;
	this.tileSpeed = Phaser.Timer.HALF;
	this.pads = [];
	this.activePad = null; //the gamepad controlling the current actor
	this.landscapeWarning = null;
	this.selectedTile = [];
	this.verticalEvent = null;
	this.horizontalEvent = null;
	this.dragPos = new Phaser.Point(0,0);//The starting position of the drag
	this.isDrag = false;
	this.actor = null;
	this.target = null;
	this.root = rpg.root;
	
	this.rightDown = false;
	this.buttons = [];
	this.keyZ = null;
	this.keyX = null;
};

var isoGroup, cursorPos, cursor, camerPos;
var cursors;

BasicGame.Mission.prototype =
{
    preload: function () {
        //game.load.image('tile', '../assets/tile.png');
		game.load.json('mission','assets/data/missions/'+next,true);

        //game.iso.anchor.setTo(0.5, 0.2);
    },
    create: function () {

        //this.spawnTiles();
		rpg.map.setMap(this.cache.getJSON('mission'));
		
        // Provide a 3D position for the cursor
        cursorPos = new Phaser.Plugin.Isometric.Point3();
      
      	cameraPos = new Phaser.Plugin.Isometric.Point3();
      	cursors = game.input.keyboard.createCursorKeys();
		
		//Setup cursor
		game.input.addMoveCallback(this.cursorMove,this);
		
		this.addPointers();
		
		//Setup keyboard
		this.addKeys();
		
		//Setup gamepad(s)		
		this.pads[0] = game.input.gamepad.pad1;
		this.pads[1] = game.input.gamepad.pad2;
		this.pads[2] = game.input.gamepad.pad3;
		this.pads[3] = game.input.gamepad.pad4;
		
		if(game.input.gamepad.supported && game.input.gamepad.active && this.pads[0].connected){
			this.addButtons(0);
		}
		
		if(game.input.gamepad.supported && game.input.gamepad.active && this.pads[1].connected){
			this.addButtons(1);
		}
		
		if(game.input.gamepad.supported && game.input.gamepad.active && this.pads[2].connected){
			this.addButtons(2);
		}
		
		if(game.input.gamepad.supported && game.input.gamepad.active && this.pads[3].connected){
			this.addButtons(3);
		}
		
		if(game.input.gamepad.supported){
			for(var i=0;i<this.pads.length;i++){
				this.pads[i].addCallbacks(this, { onConnect: this['registerGamepad'+(i+1)] });
			}
		}
		//Setup callbacks for screen orientation if we're on mobile
		if(!this.game.device.desktop){
			this.scale.enterIncorrectOrientation.add(this.handleIncorrect,this);
			this.scale.leaveIncorrectOrientation.add(this.handleCorrect,this);
			this.landscapeWarning = game.add.image(0,0,'melinda_warning');
			this.landscapeWarning.renderable = false;
			this.landscapeWarning.width = this.landscapeWarning.width*1.8;
			this.landscapeWarning.height = this.landscapeWarning.height/1.75;
		}
		
		//Create UI
		EZGUI.create(this.cache.getJSON('mission_menu'),'mission_theme');
		
		//Start game
		rpg.tm.start();
		
		this.onBlur.add(this.mute,this);
		this.onFocus.add(this.unMute,this);
    },
    update: function () {
      	var gamepad = this.activePad;
		if(!this.root.paused){
			if (cursors.up.isDown)
			{
				game.camera.y -= this.cameraSpeed);
			}
			else if (cursors.down.isDown)
			{
				game.camera.y += this.cameraSpeed;
			}

			if (cursors.left.isDown)
			{
				game.camera.x -= this.cameraSpeed;
			}
			else if (cursors.right.isDown)
			{
				game.camera.x += this.cameraSpeed;
			}
			
			if(gamepad.connected && this.actor){
				//Gamepad
				if(this.game.device.firefox){
					this.camera.x += this.cameraSpeed*gamepad.axis(Phaser.Gamepad.XBOX360_STICK_LEFT_X);
					this.camera.y += this.cameraSpeed*gamepad.axis(Phaser.Gamepad.XBOX360_STICK_LEFT_Y);
					//Hack for dpad input on Firefox
					if(gamepad._axes[4] > -1 && rightDown){
						this.onDown({buttonCode:16},gamepad.index-1);
						rightDown = false;
					}
					else if(gamepad._axes[4] === -1){
						rightDown = true;
					}
				}
				else{
					this.camera.x += this.cameraSpeed*gamepad.axis(Phaser.Gamepad.XBOX360_STICK_LEFT_X);
					this.camera.y += this.cameraSpeed*gamepad.axis(Phaser.Gamepad.XBOX360_STICK_LEFT_Y);
				}
			}
		}
		//Update camera pos
		game.iso.unproject(game.camera.position, cameraPos);
    },
	
	shutdown: function() {
		this.keyZ.onDown.removeAll();
		this.keyX.onDown.removeAll();
		
		this.keyZ = null;
		this.keyX = null;
		
		this.landscapeWarning = null;
		//TODO: remove move callback?
		//Remove event listeners
		for(var i=0;i<this.pads.length;i++){
			this.pads[i].onConnect.removeAll();
		}
		for(var i=0;i<this.buttons.length;i++){
			this.buttons[i].onDown.removeAll();
			this.buttons[i].onUp.removeAll();
		}
		this.scale.enterIncorrectOrientation.removeAll();
		this.scale.leaveIncorrectOrientation.removeAll();
		this.time.events.removeAll();
		this.input.keyboard.reset();
		this.input.onDown.removeAll();
		this.input.onUp.removeAll();
		this.pads[0].reset();
		this.pads[1].reset();
		this.pads[2].reset();
		this.pads[3].reset();
		
		this.pads = [];
		this.buttons = [];
		
		EZGUI.destroy();
		
		this.actor = null;
		this.target = null;
		
		rpg.tm.off();
		rpg.map.destroy();
	},
	
    render: function () {
        //game.debug.text("Move your mouse around!", 2, 36, "#ffffff");
		//game.debug.text("Currently selecting tile at position:"+ " x: " +Math.floor(cursorPos.x/38)+ " y: "+Math.floor(cursorPos.y/38), 2, 56, "#ffffff");
        //game.debug.text(game.time.fps || '--', 2, 14, "#a7aebe");
		game.debug.text("camera position: x: " + Math.floor(cameraPos.x/38) + " y: " + Math.floor(cameraPos.y/38),2,80, "#ffffff");
    },
	
	snapCamera: function(){
		var map = rpg.map;
		var tile = this.selectedTile;
		var x = map.pivot.x+(map.tilewidth/2)*(tile[0]-1);
		var y = map.pivot.y+(map.tileheight/2)*tile[1];
		var maxX = x+map.tilewidth;
		var maxY = y+map.tileheight;
		var camera = this.camera;
		
		//Check if the tile's bounding box lies out the viewport and snap when necessary
		if(camera.x > x)
			camera.x += x-camera.x;
		if(camera.y > y)
			camera.y += y-camera.y;
		if(camera.width+camera.x < maxX)
			camera.x -= maxX-(camera.width+camera.x);
		if(camera.height+camera.y < maxY)
			camera.y -= maxY-(camera.height+camera.y)
	},
	
	handleIncorrect: function(){
		this.root.pause();
		this.landscapeWarning.renderable = true;
	},
	
	handleCorrect: function(){
		this.root.resume();
		this.landscapeWarning.renderable = false;
		this.scale.refresh();
	},
	
	mute: function(){
		this.sound.mute = true;
	},
	
	unMute: function(){
		this.sound.mute = false;
	},
	
	pause: function(){
		this.isDrag = false;
		this.root.pause();
	},
	
	resume: function(){
		this.root.resume();
	},
	
	//Trigger the currently selected action(skill or movement) on the selected tile; used for button selections
	select: function(){
		if(this.target){
			this.actor.useRange(this.skill,this.range,this.target.pos);
		}
		else{
			this.actor.move(this.selectedTile);
		}
	},
	
	selectCursor: function(){
		if(!this.root.paused){
			this.isDrag = false;
			//Did the user drag? if not, let's select the tile!
			if(this.input.activePointer.position.distance(this.dragPos) < 20){
				this.updateCursor();
				//Tile selection stuff
			}
		}
	},
	
	//Exits submenus in the main list widget
	exit: function(){
		
	},
	
	cursorMove: function(pointer,x,y,state){
		if(!this.root.paused){
			//Cursor
			if(this.isDrag){
				this.camera.position.x -= pointer.movementX;
				this.camera.position.y -= pointer.movementY;
			}
			else{
				this.updateCursor();
			}
		}
	},
	
	updateCursor: function(){
		// Update the cursor position.
		game.iso.unproject(game.input.activePointer.position, cursorPos);
		
		var tilePos = rpg.map.mapIndex(cursorPos.x,cursorPos.y);
		if(rpg.map.isBounds(tilePos[0],tilePos[1])){
			this.selectedTile = tilePos;
		}
	},
	
	selectDown: function(){
		var gamepad = this.activePad;
		if(this.device.firefox && gamepad.isDown(Phaser.Gamepad.BUTTON_14)){
			this.selectedTile[1] = Math.min(rpg.map.height,this.selectedTile[1]+1);
			this.snapCamera();
			this.verticalEvent = game.time.events.add(this.tileSpeed,this.selectDown,this);
		}
		else if(gamepad.isDown(Phaser.Gamepad.XBOX360_DPAD_DOWN)){
			this.selectedTile[1] = Math.min(rpg.map.height,this.selectedTile[1]+1);
			this.snapCamera();
			this.verticalEvent = game.time.events.add(this.tileSpeed,this.selectDown,this);
		}
		this.verticalEvent = null;
	},
	
	selectUp: function(){
		var gamepad = this.activePad;
		if(this.device.firefox && gamepad.isDown(Phaser.Gamepad.BUTTON_13)){
			this.selectedTile[1] = Math.max(0,this.selectedTile[1]-1);
			this.snapCamera();
			this.verticalEvent = game.time.events.add(this.tileSpeed,this.selectUp,this);
		}
		else if(gamepad.isDown(Phaser.Gamepad.XBOX360_DPAD_UP)){
			this.selectedTile[1] = Math.max(0,this.selectedTile[1]-1);
			this.snapCamera();
			this.verticalEvent = game.time.events.add(this.tileSpeed,this.selectUp,this);
		}
		this.verticalEvent = null;
	},
	
	selectLeft: function(){
		var gamepad = this.activePad;
		if(this.device.firefox && gamepad.isDown(Phaser.Gamepad.BUTTON_15)){
			this.selectedTile[0] = Math.max(0,this.selectedTile[0]-1);
			this.snapCamera();
			this.horizontalEvent = game.time.events.add(this.tileSpeed,this.selectLeft,this);
		}
		else if(gamepad.isDown(Phaser.Gamepad.XBOX360_DPAD_LEFT)){
			this.selectedTile[0] = Math.max(0,this.selectedTile[0]-1);
			this.snapCamera();
			this.horizontalEvent = game.time.events.add(this.tileSpeed,this.selectLeft,this);
		}
		this.horizontalEvent = null;
	},
	
	selectRight: function(){
		if(this.device.firefox && this.rightDown){
			this.selectedTile[0] = Math.min(rpg.map.width,this.selectedTile[0]+1);
			this.snapCamera();
			this.horizontalEvent = game.time.events.add(this.tileSpeed,this.selectRight,this);
		}
		else if(gamepad.isDown(Phaser.Gamepad.XBOX360_DPAD_LEFT)){
			this.selectedTile[0] = Math.min(rpg.map.width,this.selectedTile[0]+1);
			this.snapCamera();
			this.horizontalEvent = game.time.events.add(this.tileSpeed,this.selectRight,this);
		}
		this.horizontalEvent = null;
	},
	
	drag: function(){
		if(!this.root.paused){
			this.dragPos.x = game.input.activePointer.position.x;
			this.dragPos.y = game.input.activePointer.position.y;
			this.isDrag = true;
		}
	},
	
	registerGamepad1: function(){
		this.addButtons(0);
	},
	
	registerGamepad2: function(){
		this.addButtons(1);
	},
	
	registerGamepad3: function(){
		this.addButtons(2);
	},
	
	registerGamepad4: function(){
		this.addButtons(3);
	},
	
	addKeys: function(){
		//Reset keys
		game.input.keyboard.reset();
		
		//Confirm
		this.keyZ = game.input.keyboard.addKey(Phaser.Keyboard.Z);
		this.keyZ.onDown.add(this.select, this);
		
		//Deny
		this.keyX = game.input.keyboard.addKey(Phaser.Keyboard.X);
		this.keyX.onDown.add(this.exit, this);
	},
	
	addPointers: function(){
		game.input.onUp.add(this.selectCursor,this);
		game.input.onDown.add(this.drag,this);
	},
	
	addButtons: function(index){
		var state = game.state.getCurrentState();
		var pad = state['pad'+index];
		var buttons = state.buttons;
		
		pad.reset();
		//  We can't do this until we know that the gamepad has been connected and is started
		//I hate firefox...
		if(game.device.firefox){
		
			var buttonA = pad.getButton(Phaser.Gamepad.BUTTON_1);
			var buttonB = pad.getButton(Phaser.Gamepad.BUTTON_2);
			var buttonX = pad.getButton(Phaser.Gamepad.BUTTON_0);
			var buttonY = pad.getButton(Phaser.Gamepad.BUTTON_3);
		
			var buttonDPadLeft = pad.getButton(Phaser.Gamepad.BUTTON_15);
			var buttonDPadUp = pad.getButton(Phaser.Gamepad.BUTTON_13);
			var buttonDPadDown = pad.getButton(Phaser.Gamepad.BUTTON_14);
			
			var buttonStart = pad.getButton(Phaser.Gamepad.BUTTON_9);
			
			var offset = this.index*8;
		
			buttons[offset] = buttonA;
			buttons[offset+1] = buttonB;
			buttons[offset+2] = buttonX;
			buttons[offset+3] = buttonY);
			
			buttons[offset+4] = buttonDPadLeft;
			buttons[offset+5] = buttonDPadRight;
			buttons[offset+6] = buttonDPadUp;
			buttons[ofset+7] = buttonDPadDown;
			
			buttons[offset+8] = buttonStart;
			
			var onDown = state.onDown;
			var onUp = state.onUp;
			
			buttonA.onDown.add(onDown, state);
			buttonB.onDown.add(onDown, state);
			buttonX.onDown.add(onDown, state);
			buttonY.onDown.add(onDown, state);

			buttonA.onUp.add(onUp, state);
			buttonB.onUp.add(onUp, state);
			buttonX.onUp.add(onUp, state);
			buttonY.onUp.add(onUp, state);
			
			buttonDPadLeft.onDown.add(onDown, state);
			buttonDPadUp.onDown.add(onDown, state);
			buttonDPadDown.onDown.add(onDown, state);

			buttonDPadLeft.onUp.add(onUp, state);
			buttonDPadUp.onUp.add(onUp, state);
			buttonDPadDown.onUp.add(onUp, state);
			
			buttonStart.onDown.add(onDown, state);
			
			buttonStart.onDown.add(Up, state);
		}
		else{
		
			var buttonDPadLeft = pad.getButton(Phaser.Gamepad.XBOX360_DPAD_LEFT);
			var buttonDPadRight = pad.getButton(Phaser.Gamepad.XBOX360_DPAD_RIGHT);
			var buttonDPadUp = pad.getButton(Phaser.Gamepad.XBOX360_DPAD_UP);
			var buttonDPadDown = pad.getButton(Phaser.Gamepad.XBOX360_DPAD_DOWN);
			
			var buttonA = pad.getButton(Phaser.Gamepad.XBOX360_A);
			var buttonB = pad.getButton(Phaser.Gamepad.XBOX360_B);
			var buttonX = pad.getButton(Phaser.Gamepad.XBOX360_X);
			var buttonY = pad.getButton(Phaser.Gamepad.XBOX360_Y);
			
			var buttonStart = pad.getButton(Phaser.Gamepad.XBOX360_START);
			
			var offset = this.index*9;
			
			buttons[offset] = buttonA;
			buttons[offset+1] = buttonB;
			buttons[offset+2] = buttonX;
			buttons[offset+3] = buttonY);
			
			buttons[offset+4] = buttonDPadLeft;
			buttons[offset+5] = buttonDPadRight;
			buttons[offset+6] = buttonDPadUp;
			buttons[ofset+7] = buttonDPadDown;
			
			buttons[offset+8] = buttonStart;
			
			var onDown = state.onDown;
			var onUp = state.onUp;
			
			buttonA.onDown.add(onDown, state);
			buttonB.onDown.add(onDown, state);
			buttonX.onDown.add(onDown, state);
			buttonY.onDown.add(onDown, state);

			buttonA.onUp.add(onUp, state);
			buttonB.onUp.add(onUp, state);
			buttonX.onUp.add(onUp, state);
			buttonY.onUp.add(onUp, state);
			
			buttonDPadLeft.onDown.add(onDown, state);
			buttonDPadRight.onDown.add(onDown, state);
			buttonDPadUp.onDown.add(onDown, state);
			buttonDPadDown.onDown.add(onDown, state);

			buttonDPadLeft.onUp.add(onUp, state);
			buttonDPadRight.onUp.add(onUp, state);
			buttonDPadUp.onUp.add(onUp, state);
			buttonDPadDown.onUp.add(onUp, state);
			
			buttonStart.onDown.add(onDown, state);
			
			buttonStart.onDown.add(Up, state);
		}
	},
	
	onUp: function(button,value){
		
	},
	
	onDown: function(button,value){
		if(this.activePad.index+1===value && !this.root.paused){
			if(this.game.device.firefox){
				if (button.buttonCode === Phaser.Gamepad.BUTTON_1){
					this.select();
				}
				else if (button.buttonCode === Phaser.Gamepad.BUTTON_2){
				}
				else if (button.buttonCode === Phaser.Gamepad.BUTTON_0){
				}
				else if (button.buttonCode === Phaser.Gamepad.BUTTON_3){
				}
				else if (button.buttonCode === Phaser.Gamepad.BUTTON_15){
					this.selectLeft();
					this.horizontalEvent = game.time.events.add(this.tileSpeed,this.selectLeft,this);
				}
				else if (button.buttonCode === 16){
					this.selectRight();
					this.horizontalEvent = game.time.events.add(this.tileSpeed,this.selectRight,this);
				}
				else if (button.buttonCode === Phaser.Gamepad.BUTTON_13){
					this.selectUp();
					this.verticalEvent = game.time.events.add(this.tileSpeed,this.selectUp,this);
				}
				else if (button.buttonCode === Phaser.Gamepad.BUTTON_14){
					this.selectDown();
					this.verticalEvent = game.time.events.add(this.tileSpeed,this.selectDown,this);
				}
			}
			else{
				if (button.buttonCode === Phaser.Gamepad.XBOX360_DPAD_LEFT){
					this.selectLeft();
					this.horizontalEvent = game.time.events.add(this.tileSpeed,this.selectLeft,this);
				}
				else if (button.buttonCode === Phaser.Gamepad.XBOX360_DPAD_RIGHT){
					this.selectRight();
					this.horizontalEvent = game.time.events.add(this.tileSpeed,this.selectRight,this);
				}
				else if (button.buttonCode === Phaser.Gamepad.XBOX360_DPAD_UP){
					this.selectUp();
					this.verticalEvent = game.time.events.add(this.tileSpeed,this.selectUp,this);
				}
				else if (button.buttonCode === Phaser.Gamepad.XBOX360_DPAD_DOWN){
					this.selectDown();
					this.verticalEvent = game.time.events.add(this.tileSpeed,this.selectDown,this);
				}
				else if (button.buttonCode === Phaser.Gamepad.XBOX360_A){
					this.select();
				}
				else if (button.buttonCode === Phaser.Gamepad.XBOX360_B){
				}
				else if (button.buttonCode === Phaser.Gamepad.XBOX360_X){
				}
				else if (button.buttonCode === Phaser.Gamepad.XBOX360_Y){
					
				}
			}
		}
		if(button.buttonCode === Phaser.Gamepad.XBOX360_START){
			if(this.root.pause)
				this.resume();
			else
				this.pause();
		}
	},
	
	reset: function(){
		rpg.party.resetActors();
		this.state.start('Mission');
	},
	
	endMission: function(){
		this.cache.removeJSON('mission');
		next = rpg.map.properties.next;
		rpg.party.nextEvent.push(rpg.map.properties.nextEvent ? rpg.map.properties.nextEvent : rpg.party.nextEvent);
		
		if(next && next.includes('.dlz')){
			this.state.start('Preloader',true,false,'novel','Scene');
		}
		else if(next && next.includes('.json')){
			this.state.start('Mission');
		}
		else{
			this.state.start('Hub');
		}
	}
};