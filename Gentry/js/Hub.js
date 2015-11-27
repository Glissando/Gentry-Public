BasicGame.Hub = function (game) {
};

var next = ''; //The next mission map/scene script to load

BasicGame.Hub.prototype = {
	
    create: function () {
		game.load.onfileComplete(this.fileComplete,this);
		game.load.onLoadComplete(this.loadComplete,this);
		game.load.pack('background','assets/asset-manifest.json');
		game.load.start();
	},

    update: function () {

    },
	
	//Background loading while player is in hub
	fileComplete: function(progress, cacheKey, success, totalLoaded, totalFiles){
		
	},
	
	//Background loading while player is in hub
	loadComplete: function(){
	
	},
	/**Starts the scene for the next event
	*@return{boolean} - Returns true if the next event was started successfully if there is no current event
	*/
	nextEvent: function(){
		if(rpg.party.nextEvent){
			next = rpg.party.nextEvent;
			rpg.party.nextEvent = null;
			this.startScene(next);
			return true;
		}
		return false;
	},
	isEvent: function(){
		if(rpg.party.nextEvent)
			return true;
		return false;
	},
	/**Starts a scene
	*@scene{string} - uri matching the scene script
	*/
	startScene: function(scene){
		next = scene;
		this.state.start('Scene',true,false);
	},
	/**Starts a mission
	*@mission{string} - uri matching the map file
	*/
	startMission: function(mission){
		next = mission;
		if(!mission.includes('.json')){
			this.state.start('Scene',true,false);
		}
		else{
			this.state.start('Preloader',true,false,'mission','Mission');
		}
	},
	
	save: function(index){
		rpg.party.save(index);
		dia.save(index);
	},
	
    quitGame: function (pointer) {
        this.state.start('MainMenu');
    }

};