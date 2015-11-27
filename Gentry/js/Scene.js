BasicGame.Scene = function (game) {
	this.nextEvent = null;
	this.text = null;
	this.nameText = null;
	this.line = '';
	this.content = '';
	this.textSpeed = 1;
	this.auto = false;
	this.autoEvent = null;
	this.selected = 0;//Currently selected choice
	this.choiceCount = 0;//Number of choices
	this.pencilAnim = null;
	this.textUpdate = null;
	this.skip = false;
	this.skipEvent = null;
	//keys
	this.key1 = null;
	this.key2 = null;
	this.key3 = null;
	this.key4 = null;
	this.down = null;
	this.up = null;
	this.pad = null;
	this.buttonA = null;
	this.buttonB = null;
	this.buttonX = null;
	this.buttonY = null;
	this.buttonDPadLeft = null;
	this.buttonDPadRight = null;
	this.buttonDPadUp = null;
	this.buttonDPadDown = null;
	//Sprites
	this.choices = [];
	this.choicesText = [];
	this.pencil = null;
	this.choicePencil = null;
	this.namebox = null;
	//Sounds
	this.page = null;
	//Mobile stuff
	this.landscapeWarning = null;
};

//var dia = new Dialog();

BasicGame.Scene.prototype = {
	
	preload: function(){
		this.load.json('dlz','assets/data/scripts/'+next,true);
	},
	
    create: function () {
		var choices = this.choices;
		var pencil = this.pencil;
		var choicesText = this.choicesText;
		
		var style = { font: '24pt Arial', fill: 'black', align: 'left', wordWrap: true, wordWrapWidth: 800 };
		var nameStyle = { font: '32pt Arial', fill: 'white', align: 'left', wordWrap: false };
		var choiceStyle = { font: '24pt Arial', fill: 'black', align: 'center', wordWrap: false, wordWrapWidth: 900 };
		
		//Setup Dialog			
		dia.setScene(this.cache.getJSON('dlz'));
		
		//Setup choices
		for(var i=0;i<4;i++){
			choices.push(game.add.button(151, 300, 'choicebox'));
			choices[i].index = i;
			choices[i].renderable = false;
			choices[i].inputEnabled = false;
			choices[i].smoothed = false;
			choicesText.push(game.add.text(game.camera.width/2, 500, '', choiceStyle));
			choicesText[i].anchor.setTo(0.5,0.5);
			choicesText[i].renderable = false;
		}
		
		//Setup choicePencil
		this.choicePencil = game.add.sprite(1100,126,'pencil');
		this.choicePencil.anchor.setTo(0.5,0.5);
		this.choicePencil.renderable = false;
		
		//Setup text-box
		this.textbox = game.add.sprite(205,480,'textbox');
		this.text = game.add.text(260, 515, '', style);
		
		//Setup name-box
		this.namebox = game.add.sprite(190,430,'name');
		this.nameText = game.add.text(205,440,'',nameStyle);
		
		//Setup pencil
		this.pencil = game.add.sprite(1037,595,'pencil');
		this.pencil.angle = 0;
		this.pencil.anchor.setTo(0.5,0.5);
		game.time.events.add(Phaser.Timer.SECOND,this.pencilDown,this);
		
		//Setup sound
		this.page = game.add.audio('page');
		
		//Setup input
		this.addKeys();
		this.addPointers();
		
		//Setup gamepad
		game.input.gamepad.start();//Move to Boot
		
		this.pad = game.input.gamepad.pad1;
		
		if(game.input.gamepad.supported && game.input.gamepad.active && this.pad.connected){
			this.addButtons();
		}
		
		if(game.input.gamepad.supported){
			this.pad.addCallbacks(this, { onConnect: this.addButtons});
		}
		//Setup callbacks for screen orientation if we're on mobile
		if(!this.game.device.desktop){
			this.scale.enterIncorrectOrientation.add(this.handleIncorrect,this);
			this.scale.leaveIncorrectOrientation.add(this.handleCorrect,this);
			this.landscapeWarning = game.add.image(0,0,'iris_warning');
			this.landscapeWarning.renderable = false;
			this.landscapeWarning.width = this.landscapeWarning.width*1.8;
			this.landscapeWarning.height = this.landscapeWarning.height/1.75;
		}
		
		//Setup dialog events
		dia.on('text',this.nextLine,this);
		dia.on('choice',this.choice,this);
		dia.on('delay',this.clear,this);
		
		//Start dialog
		dia.next();
		
		//Lock the screen if it's not in landscape
		if(!this.scale.isGameLandscape && !this.game.device.desktop){
			this.handleIncorrect();
		}
		
		//Mute the game when the player switches tabs
		this.onBlur.add(this.mute,this);
		this.onFocus.add(this.unMute,this);
    },

    update: function () {},
	
	shutdown: function() {
		if(this.skipEvent){
			this.time.events.remove(skipEvent);
		}
		
		//Free up memory
		this.autoEvent = null;
		this.textUpdate = null;
		this.skipEvent = null;
		this.pencilAnim = null;
		
		this.nameText = null;
		this.pencil = null;
		this.text = null;
		this.namebox = null;
		this.textbox = null;
		this.choicePencil = null;
		this.choices = [];
		this.choicesText = [];
		
		this.key1.onDown.removeAll();
		this.key2.onDown.removeAll();
		this.key3.onDown.removeAll();
		this.key4.onDown.removeAll();
		if(this.pad.connected){
			this.buttonA.onDown.removeAll();
			this.buttonB.onDown.removeAll();
			this.buttonX.onDown.removeAll();
			this.buttonY.onDown.removeAll();
			this.buttonDPadLeft.onDown.removeAll();
			this.buttonDPadRight.onDown.removeAll();
			this.buttonDPadUp.onDown.removeAll();
			this.buttonDPadDown.onDown.removeAll();
			
			this.buttonA.onUp.removeAll();
			this.buttonB.onUp.removeAll();
			this.buttonX.onUp.removeAll();
			this.buttonY.onUp.removeAll();
			this.buttonDPadLeft.onUp.removeAll();
			this.buttonDPadRight.onUp.removeAll();
			this.buttonDPadUp.onUp.removeAll();
			this.buttonDPadDown.onUp.removeAll();
		}
		
		this.key1 = null;
		this.key2 = null;
		this.key3 = null;
		this.key4 = null;
		this.down = null;
		this.up = null;
		this.pad = null;
		this.buttonA = null;
		this.buttonB = null;
		this.buttonX = null;
		this.buttonY = null;
		this.buttonDPadLeft = null;
		this.buttonDPadRight = null;
		this.buttonDPadUp = null;
		this.buttonDPadDown = null;
		
		this.page = null;
		this.landscapeWarning = null;
		
		//Remove event listeners
		this.pad.onConnect.removeAll();
		this.scale.enterIncorrectOrientation.removeAll();
		this.scale.leaveIncorrectOrientation.removeAll();
		this.time.events.removeAll();
		this.input.keyboard.reset();
		this.input.onDown.removeAll();
		this.input.onUp.removeAll();
		this.pad.reset();
		//this.input.reset();
		dia.off();
		
		//Deallocate memory in dialog
		dia.destroy();
		dia.mute = false;
		this.skip = false;
	},
	
	clear: function(){
		this.text.setText('');
		this.nameText.setText('');
	},
	
	toggleTextbox: function(){
		if(!this.isChoices() && !this.skip){
			this.pencil.renderable = !this.pencil.renderable;
			this.textbox.renderable = !this.textbox.renderable;
			this.text.renderable = !this.text.renderable;
			
			if(this.namebox.renderable)
				this.hideName();
			else
				this.showName();
			if(this.textbox.renderable){
				if(textUpdate)
					this.textUpdate.pause();
				if(autoEvent)
					this.autoEvent.pause();
			}
			else{
				if(textUpdate)
					this.textUpdate.resume();
				if(autoEvent)
					this.autoEvent.resume();
			}
		}
	},
	
	showTextbox: function(){
		if(!this.isChoices()){
			this.pencil.renderable = true;
			this.textbox.renderable = true;
			this.text.renderable = true;
			this.showName();
		}
	},
	
	hideTextbox: function(){
		this.pencil.renderable = false;
		this.textbox.renderable = false;
		this.text.renderable = false;
		this.hideName();
	},
	
	showName: function(){
		if(this.nameText.text.length > 0){
			this.namebox.renderable = true;
			this.nametext.renderable = true;
		}
	},
	
	hideName: function(){
		this.namebox.renderable = false;
		this.nametext.renderable = false;
	},
	
	updateLine: function() {
		var text = this.text;
		
		if (this.line.length < this.content.length){
			this.line = this.content.substring(0, this.line.length + 2);
			// text.text = line;
			text.setText(this.line);
		}
		else if(this.auto){
			//  Wait 2 seconds then invoke the dialog
			this.autoEvent = this.time.events.add(1000 + this.content.length * 70, this.nextNode,this);
			//game.time.events.add(this.content.length * 10, this.clear, this);
		}
	},
	
	nextLine: function(name,text) {
		this.content = text;
		this.nameText.setText(name);
		this.line = '';
		this.text.setText(this.line);
		this.textUpdate = game.time.events.repeat(50, Math.ceil((this.content.length + 1)/2), this.updateLine, this);
		this.autoEvent = null;
		
		if(name.length === 0){
			this.hideName();
		}
		else{
			this.showName();
		}
	},
	
	//display and set-up choices
	choice: function(choices) {
		//Hide textbox
		this.hideTextbox();
		
		//Render choices
		this.choicePencil.renderable = true;
		for(var i=0;i<choices.length;i++){
			this.choices[i].y = this.choicePos(i);
			this.choices[i].renderable = true;
			this.choices[i].inputEnabled = true;
			this.choicesText[i].y = this.choicePos(i)+36;
			this.choicesText[i].renderable = true;
			this.choicesText[i].setText(choices[i]);
			//Delay event adds to stop the user from attaching events after text has been exited
			this.time.events.add(Phaser.Timer.HALF,this.setupChoice,this,i);
		}
		
		this.changeChoice(0);
		
		this.choiceCount = choices.length;
	},
	
	setupChoice: function(index){
		this.choices[index].onInputUp.add(this.onButtonUp,this);
		this.choices[index].onInputOver.add(this.over,this);
		this.choices[index].onInputDown.add(this.onButtonDown,this);
	},
	
	choicePos: function(index,padding){
		var padding = padding || 25;
		var height = this.choices[0].height;
		var d = (height+padding)/2;
		return game.height/2-(this.choices.length-(index+1))*d+index*d;
	},
	
	pencilDown: function(){
		this.pencil.angle = -25;
		game.time.events.add(Phaser.Timer.SECOND,this.pencilUp,this);
	},
	
	pencilUp: function(){
		this.pencil.angle = 10;
		game.time.events.add(Phaser.Timer.SECOND,this.pencilDown,this);
	},
	
	//change choice selection
	changeChoice: function(index){
		this.selected = index;
		var to = this.choicePos(index)+this.choicePencil.height/2;
		//Stop currently running tween if there is one
		if(this.pencilAnim)
			this.pencilAnim.manager.remove(this.pencilAnim);
		this.pencilAnim = game.add.tween(this.choicePencil).to({y:to},Phaser.Timer.HALF,Phaser.Easing.Quadratic.InOut,true,0,0,false);
	},
	
	selectChoice: function(){
		this.choicePencil.renderable = false;
		for(var i=0;i<this.choiceCount;i++){
			this.choices[i].renderable = false;
			this.choices[i].inputEnabled = false;
			this.choicesText[i].renderable = false;
			this.choices[i].onInputUp.removeAll();
			this.choices[i].onInputOver.removeAll();
			this.choices[i].onInputDown.removeAll();
		}
		//show textbox
		this.showTextbox();
		
		this.choiceCount = -1;
		dia.next(this.selected);
		
		//Continue skipping if the player has skip on
		if(this.skip){
			this.skipEvent.resume();
		}
	},
	
	//Moves the selected choice up
	selectUp: function(){
		this.changeChoice(this.selected === 0 ? this.choiceCount-1 : this.selected-1);
	},
	
	//Moves the selected choice down
	selectDown: function(){
		this.changeChoice(this.selected === this.choiceCount-1 ? 0 : this.selected+1);
	},
	
	isChoices: function(){
		return this.choices[0].renderable;
	},
	
	//Jumps to the next node
	nextNode: function(){
		if(!dia.paused && !this.skip){
			//Make sure textbox is displayed
			this.showTextbox();
		
			if(this.autoEvent){
				this.time.events.remove(this.autoEvent);
				this.autoEvent = null;
			}
			if(this.isChoices()){
				this.selectChoice();
				this.page.play();
			}
			else if(this.line.length < this.content.length){
				this.line = this.content;
				this.text.setText(this.line);
				game.time.events.remove(this.textUpdate);
				this.textUpdate = null;
				this.updateLine();
			}
			else{
				dia.next();
				this.page.play();
			}
		}
	},
	
	endScene: function() {
		this.cache.removeJSON('dlz');
		//Grab next pointers from dialog
		next = dia.getVariable('next');
		if(dia.isVariable('nextEvent'))
			rpg.party.nextEvent.push(dia.getVariable('nextEvent'));
		dia.deleteVariable('next');
		dia.deleteVariable('nextEvent');
		
		//Set active members from dialog state
		for(var i=0;i<rpg.party.actorCount;i++){
			var bool = dia.getBoolean(rpg.party.actor(i).name);
			if(bool !== i < party.activeCount){
				rpg.party.setIndexActive(i,bool);
			}
		}
		
		//Check if an item was given during the scene
		if(dia.getVariable('item')){
			rpg.party.addItem(itemGenerator.generateItemFromString(dia.getVariable('item')));
			dia.deleteVariable('item');
		}
		
		//Jump to the next state
		if(next && next.includes('.dlz')){
			this.state.start('Scene');
		}
		else if(next && next.includes('.json')){
			this.state.start('Preloader',true,false,'mission','Mission');
		}
		else{
			this.state.start('Hub');
		}
	},
	
	onSkip: function(){
		this.skip =! this.skip;
		
		this.showTextbox();
		//Start skipping
		if(this.skip){
			this.skipEvent = this.time.events.repeat(150, Number.POSITIVE_INFINITY, this.skip, this);
			dia.mute = true;
		}
		//Stop skipping
		else{
			this.time.events.remove(this.skipEvent);
			this.skipEvent = null;
			dia.mute = false;
		}
	},
	
	skip: function(){
		if(this.autoEvent){
			this.time.events.remove(this.autoEvent);
			this.autoEvent = null;
		}
		if(this.isChoices()){
			this.skipEvent.pause();
		}
		else if(this.line.length < this.content.length){
			this.line = this.content;
			this.text.setText(this.line);
			this.time.events.remove(this.textUpdate);
			this.textUpdate = null;
			this.updateLine();
		}
		else{
			dia.next();
		}
	},
	
	onAuto: function(){
		this.auto =! this.auto;
	},
	
	mute: function(){
		if(!this.skip){
			dia.mute = true;
		}
	},
	
	unMute: function(){
		if(!this.skip){
			dia.mute = false;
		}
	},
	
	handleIncorrect: function(){
		dia.paused = true;
		this.landscapeWarning.renderable = true;
	},
	
	handleCorrect: function(){
		dia.paused = false;
		this.landscapeWarning.renderable = false;
		this.scale.refresh();
	},
	
	over: function(button){
		this.changeChoice(button.index);
	},
	
	onButtonDown: function(button,pointer){},
	
	onButtonUp: function(button,pointer,isOver){
		if(isOver){
			this.selected = button.index;
			this.nextNode();
		}
	},
	
	addKeys: function(){
		//Reset keys
		game.input.keyboard.reset();
		
		//Confirm
		this.key1 = game.input.keyboard.addKey(Phaser.Keyboard.Z);
		this.key1.onDown.add(this.nextNode, this);
		
		this.key3 = game.input.keyboard.addKey(Phaser.Keyboard.ENTER);
		this.key3.onDown.add(this.nextNode, this);
		
		this.key4 = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
		this.key4.onDown.add(this.nextNode, this);
		
		//Hide textbox
		this.key2 = game.input.keyboard.addKey(Phaser.Keyboard.X);
		this.key2.onDown.add(this.toggleTextbox, this);
		
		this.up = game.input.keyboard.addKey(Phaser.Keyboard.UP);
		this.up.onDown.add(this.selectUp, this);
		
		this.down = game.input.keyboard.addKey(Phaser.Keyboard.DOWN);
		this.down.onDown.add(this.selectDown, this);
	},
	
	addButtons: function(){
		var state = game.state.getCurrentState();
		var pad = state.pad;
		pad.reset();
		//  We can't do this until we know that the gamepad has been connected and is started
		//I hate firefox...
		if(state.game.device.firefox){
		
			state.buttonA = pad.getButton(Phaser.Gamepad.BUTTON_1);
			state.buttonB = pad.getButton(Phaser.Gamepad.BUTTON_2);
			state.buttonX = pad.getButton(Phaser.Gamepad.BUTTON_0);
			state.buttonY = pad.getButton(Phaser.Gamepad.BUTTON_3);
		
			state.buttonDPadLeft = pad.getButton(Phaser.Gamepad.BUTTON_15);
			state.buttonDPadRight = pad.getButton(Phaser.Gamepad.XBOX360_DPAD_RIGHT);
			state.buttonDPadUp = pad.getButton(Phaser.Gamepad.BUTTON_13);
			state.buttonDPadDown = pad.getButton(Phaser.Gamepad.BUTTON_14);
		}
		else{
		
			state.buttonDPadLeft = pad.getButton(Phaser.Gamepad.XBOX360_DPAD_LEFT);
			state.buttonDPadRight = pad.getButton(Phaser.Gamepad.XBOX360_DPAD_RIGHT);
			state.buttonDPadUp = pad.getButton(Phaser.Gamepad.XBOX360_DPAD_UP);
			state.buttonDPadDown = pad.getButton(Phaser.Gamepad.XBOX360_DPAD_DOWN);
			
			state.buttonA = pad.getButton(Phaser.Gamepad.XBOX360_A);
			state.buttonB = pad.getButton(Phaser.Gamepad.XBOX360_B);
			state.buttonX = pad.getButton(Phaser.Gamepad.XBOX360_X);
			state.buttonY = pad.getButton(Phaser.Gamepad.XBOX360_Y);
		}
		
		var onDown = state.onDown;
		var onUp = state.onUp;
		
		state.buttonA.onDown.add(onDown, state);
		state.buttonB.onDown.add(onDown, state);
		state.buttonX.onDown.add(onDown, state);
		state.buttonY.onDown.add(onDown, state);

		state.buttonA.onUp.add(onUp, state);
		state.buttonB.onUp.add(onUp, state);
		state.buttonX.onUp.add(onUp, state);
		state.buttonY.onUp.add(onUp, state);
		
		state.buttonDPadLeft.onDown.add(onDown, state);
		state.buttonDPadRight.onDown.add(onDown, state);
		state.buttonDPadUp.onDown.add(onDown, state);
		state.buttonDPadDown.onDown.add(onDown, state);

		state.buttonDPadLeft.onUp.add(onUp, state);
		state.buttonDPadRight.onUp.add(onUp, state);
		state.buttonDPadUp.onUp.add(onUp, state);
		state.buttonDPadDown.onUp.add(onUp, state);
	},
	
	addPointers: function(){
		//Left click
		if (this.game.device.desktop){
			game.input.onDown.add(function(){
				if(!this.isChoices())
					this.nextNode();
			},this);
		}
		//Touch
		else{
			game.input.onTap.add(function(){
				if(!this.isChoices())
					this.nextNode();
			},this);
		}
	},
	
	onDown: function(button,value){
		if(this.game.device.firefox){
			if (button.buttonCode === Phaser.Gamepad.BUTTON_1){
				this.nextNode();
			}
			else if (button.buttonCode === Phaser.Gamepad.BUTTON_2){
				this.toggleTextbox();
			}
			else if (button.buttonCode === Phaser.Gamepad.BUTTON_0){
			}
			else if (button.buttonCode === Phaser.Gamepad.BUTTON_3){
				this.onAuto();
			}
			else if (button.buttonCode === Phaser.Gamepad.BUTTON_15){
			}
			else if (button.buttonCode === Phaser.Gamepad.XBOX360_DPAD_RIGHT){
			}
			else if (button.buttonCode === Phaser.Gamepad.BUTTON_13){
				this.selectUp();
			}
			else if (button.buttonCode === Phaser.Gamepad.BUTTON_14){
				this.selectDown();
			}
		}
		else{
			if (button.buttonCode === Phaser.Gamepad.XBOX360_DPAD_LEFT){
			}
			else if (button.buttonCode === Phaser.Gamepad.XBOX360_DPAD_RIGHT){
			}
			else if (button.buttonCode === Phaser.Gamepad.XBOX360_DPAD_UP){
				this.selectUp();
			}
			else if (button.buttonCode === Phaser.Gamepad.XBOX360_DPAD_DOWN){
				this.selectDown();
			}
			else if (button.buttonCode === Phaser.Gamepad.XBOX360_A){
				this.nextNode();
			}
			else if (button.buttonCode === Phaser.Gamepad.XBOX360_B){
				this.toggleTextbox();
			}
			else if (button.buttonCode === Phaser.Gamepad.XBOX360_X){
				this.onAuto();
			}
			else if (button.buttonCode === Phaser.Gamepad.XBOX360_Y){
				
			}
		}
	},
	
	onUp: function(button,value) {
		
	},
	
    quitGame: function (pointer) {
        this.state.start('MainMenu');
    }

};