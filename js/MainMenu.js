BasicGame.MainMenu = function (game) {

	this.music = null;
	this.playButton = null;
	this.gui = null;
	//List assets that will be loaded
	this.assetsToLoad = [
	
	];
};

BasicGame.MainMenu.prototype = {

	create: function () {
	
		game.load.onfileComplete(this.fileComplete,this);
		game.load.onLoadComplete(this.loadComplete,this);
		this.load.pack('hub','assets/asset_manifest');
		this.load.start();
		this.music = this.add.audio('titleMusic');
		this.music.play();

		//this.add.sprite(0, 0, 'titlepage');

		//this.playButton = this.add.button(400, 600, 'playButton', this.startGame, this, 'buttonOver', 'buttonOut', 'buttonOver');
		this.setupGUI();
		
		this.onBlur.add(this.mute,this);
		this.onFocus.add(this.unMute,this);
	},

	update: function () {

	},
	
	shutdown: function() {
		
		this.music = null;
		this.gui = null;
		
		EZGUI.destroy();
	},
	
	mute: function(){
		this.sound.mute = true;
	},
	
	unMute: function(){
		this.sound.mute = false;
	},
	
	setupGUI: function() {
		EZGUI.Theme.load(['assets/data/menu_theme.json'],function(){
			var gui = EZGUI.create(this.cache.getJSON('main_menu'),'menu_theme');
			this.gui = gui;
			
			gui.on('new',this.startGame,this);
			gui.on('load',this.loadGame,this);
		});
	},
	
	startGame: function (pointer) {
		this.music.stop();

		this.state.start('Preloader',true,false,'hub','Hub');

	},
	
	loadGame: function(event, btn){
	
	},
	
	//Background loading while player is in hub
	fileComplete: function(progress, cacheKey, success, totalLoaded, totalFiles){
		
	},
	
	loadComplete: function(){
	
	}
};