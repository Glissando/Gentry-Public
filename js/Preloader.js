BasicGame.Preloader = function (game) {

	this.background = null;
	this.preloadBar = null;
	this.assets = null;//The asset pack that this state will load
	this.next = null;//The next event that will be jumped to
	this.ready = false;

};

var currentMission, currentScene;//uris
BasicGame.Preloader.prototype = {
	/**Sets the assets and next state to transition
	*@assets{string} - A string id matching an asset pack
	*@next{string} - The next state to load
	*/
	init: function (assets,next) {
		this.assets = assets;
		this.next = next;
	},
	
	preload: function () {
	
		this.load.pack(this.assets,'assets/asset_manifest.json');
		//this.background = this.add.sprite(0, 0, 'preloaderBackground');
		this.preloadBar = this.add.sprite(60, 320, 'preloaderBar');
		
		this.load.setPreloadSprite(this.preloadBar);
	},

	create: function () {

		//	Once the load has finished we disable the crop because we're going to sit in the update loop for a short while as the music decodes
		this.preloadBar.cropEnabled = false;

	},

	update: function () {		
		if (this.cache.isSoundDecoded('funky') && this.ready == false)
		{
			this.ready = true;
			this.state.start(this.next);
		}

	}

};