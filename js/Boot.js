var BasicGame = {};

BasicGame.Boot = function (game) {
	
};

BasicGame.Boot.prototype = {

    init: function () {

        this.input.maxPointers = 1;

        //  pause game if the tab loses focus
        this.stage.disableVisibilityChange = true;
		
		//game.time.advancedTiming = true;
		
		// Add and enable plug-ins.
        game.plugins.add(new Phaser.Plugin.Isometric(game));
		
        if (this.game.device.desktop)
        {
			this.scale.scaleMode = Phaser.ScaleManager.USER_SCALE;
			//this.scale.fullScreenScaleMode = Phaser.ScaleManager.SHOW_ALL;
            this.scale.pageAlignHorizontally = true;
			this.scale.pageAlignVertically = true;
			this.scale.setMinMax(640, 360, 1920, 1080);
			
			this.scale.setResizeCallback(function(){
				var scale = Math.min(window.innerWidth / this.game.width, window.innerHeight / this.game.height);
				this.scale.setUserScale(scale,scale,0,0);
				EZGUI.rebuild();
			},this);
			this.scale.refresh();
        }
        else
        {
            this.scale.scaleMode = Phaser.ScaleManager.USER_SCALE;
            this.scale.setMinMax(640, 360, 1920, 1080);
            //this.scale.forceLandscape = true;
			this.scale.forceOrientation(true);
            this.scale.pageAlignHorizontally = true;
			this.scale.pageAlignVertically = true;
			this.time.desiredFps = 25;
			
			this.scale.setResizeCallback(function(){
				var scale = Math.min(window.innerWidth / this.game.width, window.innerHeight / this.game.height);
				this.scale.setUserScale(scale,scale,0,0);
				EZGUI.rebuild();
			},this);
			this.scale.refresh();
        }
    },

    preload: function () {

        //  Load assets necessary for preloader
		//this.load.image('preloaderBackground', 'images/preloader_background.jpg');
        
		//Load mobile specific assets
		if(!this.game.device.desktop){
			this.load.pack('mobile','assets/asset_manifest.json');
		}
		else{
			this.load.pack('desktop', 'assets/asset_manifest.json');
		}
    },

    create: function () {
        //this.state.start('Preloader',true,false,'MainMenu','MainMenu');
		next = 'demo.dlz';
		this.state.start('Preloader',true,false,'novel','Scene');
    }

};