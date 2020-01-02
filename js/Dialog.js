function Delegate(){
	this.db = {};
}

Delegate.prototype = {
	addEvent: function(name){
		this.db[name] = [];
	},
	//--DEPRECATED--
	makeSignal: function(name){
		if(!this.db[name])
			this.db[name] = [];
		var signal = this.db[name];
		return function(){
			var l = this.length/2;
			for(var i=0;i<l;i++){
				this[i*2].apply(this[i*2+1],arguments);
			}
		}.bind(signal);
	},
	subscribe: function(name,f,ctx){
		if(!this.db[name])
			this.db[name] = [];
		this.db[name].push(f);
		this.db[name].push(ctx);
		return this.db[name][this.db[name].length-2];
	},
	removeEvents: function(name){
		this.db[name] = undefined;
	},
	clear: function(){
		this.db = {};
	},
	removeEvent: function(name,f){
		var funcs = this.db[name];
		if(funcs){
			for(var i=0;i<funcs.length;i+=2)
				if(funcs[i]===f){
					funcs.splice(i,2);
				}
		}
	},
	containEvent: function(name,f){
		var funcs = this.db[name];
		if(funcs){
			for(var i=0;i<funcs.length;i+=2)
				if(funcs[i]===f){
					return true;
				}
		}
		return false;
	},
	fireEvent: function(name){
		var funcs = this.db[name];
		if(funcs){
			var i, l = funcs.length/2;
			
			//Avoid #Function.apply calls as they can be slow in some environments
			switch(arguments.length-1){
				case 0:
					for(i=0;i<l;i++){
						funcs[i*2].call(funcs[i*2+1]);
					}
					return;
				case 1:
					for(i=0;i<l;i++){
						funcs[i*2].call(funcs[i*2+1],arguments[1]);
					}
					return;
				case 2:
					for(i=0;i<l;i++){
						funcs[i*2].call(funcs[i*2+1],arguments[1],arguments[2]);
					}
					return;
				default:
					var args = [];
					
					for(i=1;i<arguments.length;i++)
						args.push(arguments[i]);
					
					for(i=0;i<l;i++){
						funcs[i*2].apply(funcs[i*2+1],args);
					}
					return;
			}
		}
	}
};

function Dialog(g){

	var dialog = [];
	var sprites = {};
	var sounds = {};
	var tweens = [];
	var game = g;//local game reference
	var group; //= game.add.group();
	var parser = new Parser("0");
	var current;
	var previous;
	var dirty = false;//Choices flag
	var semaphore;//Resource lock
	var block = false;//Exited a blocking node(Choice/Text)
	var paused = false;
	var mute = false;
	var delegate = new Delegate();
	
	var tweenData = [];
	
	//Mutators and Accessors
	this.__defineGetter__("group", function(){
		return group;
	});
	
	this.__defineGetter__("current", function(){
		return current;
	});
	
	this.__defineGetter__("paused", function(){
		return paused;
	});
	
	this.__defineSetter__("paused", function(val){
		if(val)
			this.pause();
		else
			this.resume();
	});
	
	this.__defineGetter__("mute", function(){
		return mute;
	});
	
	this.__defineSetter__("mute", function(val){
		mute = val;
		for(var k in sounds){
			sounds[k].mute = mute;
		}
	});
	
	for(var i=1;i<arguments.length;i++){
		delegate.subscribe('root',arguments[i]);
	}
	
	/**Jumps to the next blocking state(text/choice branch)
	*@param id - Takes an integer value representing the selected choice when a branch is hit
	*@return{boolean} - Returns true if a blocking statement was successfully reached
	*/
	this.next = function(id){
		
		previous = current;
		
		//Check if paused
		if(paused){
			return false;
		}
		//Check if blocking node was exited, end all running animations
		if(block){
			endAnimations();
			block = false;
		}
		//Check if dialog thread is currently delayed
		if(semaphore){
			endAnimations();
			game.time.events.remove(semaphore);
			semaphore = null;
		}
		//Check if dead node reached
		if(!current){
			delegate.fireEvent("finish");
			return false;
		}
		//Iterate over set nodes
		else if(current.type=="Set" && !dirty){
			var variable = parse(current.variable);
			parser.setVariable(variable,parse(current.value));
			delegate.fireEvent("set",variable);
			if(!current.choices){
				current = dialog[current.next];
				return this.next();
			}
		}
		//Iterate over branch nodes
		else if(current.type=="Branch"){
			var b = current.branches;
			var variable = parse(current.variable);
			
			for(var k in b)
				if(parse(k)==variable||k=="_default"){
					current = dialog[b[k]];
					return this.next();
				}
			//current = this.dialog[b["_default"]];
			//return this.next();
		}
		//Check if there is another node
		else if(current.type=="Text" && !dirty){
			var tmp = current;
			if(!tmp.choices){
				current = dialog[current.next];
			}
			else{
				dirty = true;
			}
			var name = parse(tmp.name);
			var text = parse(tmp.value);
			delegate.fireEvent("text",name,text);
			block = true;
			return true;
		}
		else if(current.type=="Link" && !dirty){
			delegate.fireEvent("link",parse(current.name));
			
			if(!current.choices){
				current = dialog[current.next];
				return this.next();
			}
			dirty = true;
		}
		//Iterate over choices
		else if(current.choices){
			//Check if an answer was chosen
			if(Number.isInteger(id)){
				dirty = false;
				current = dialog[dialog[current.choices[id]].next];
				block = true;
				return this.next();
			}
			else{
				dirty = true;
				var a = [];
				for(var i=0;i<current.choices.length;i++){
					a.push(parse(dialog[current.choices[i]].name));
				}
				
				delegate.fireEvent("choice",a);
				return true;
			}
		}
		else if(current.type=="Delay"){
			var delay = (+parse(current.name))*Phaser.Timer.SECOND;
			delegate.fireEvent("delay",delay);
			current = dialog[current.next];
			semaphore = game.time.events.add(delay,function(){
				this.removeSemaphore();
				return this.next();
			},this);
			return true;
		}
		/**Sprite node properties
		*@property name - variable identifier
		*@property texture - texture cache key
		*@property frame - the currently rendered frame(optional)
		*@property z - depth value(optional)
		*@property
		*/
		else if(current.type=="Sprite"){
			var name = parse(current.name);
			var sprite = sprites[name];
			//Sprite under this name already exists, reset it instead of allocating/deallocating memory
			if(sprite){
				sprite.alpha = 1;
				sprite.angle = 0;
				sprite.x = 0;
				sprite.y = 0;
				sprite.scale.x = 1;
				sprite.scale.y = 1;
				if(sprite.key!=current.texture)
					sprite.loadTexture(current.texture,current.frame);
				else
					sprite.frameName = current.frame;
			}
			else{
				sprites[name] = current.frame.length > 0 ? group.create(0,0,current.texture,current.frame) :
				group.create(0,0,current.texture);
				sprite = sprites[name];
				//group.fixedToCamera = true;
				sprite.anchor.setTo(0.5, 0.5);
				sprite.name = name;
				//sprites[current.name].fixedToCamera = true;
			}
			
			sprite.renderable = false;
			sprite.depth = +parse(current.z);
			group.sort('depth');
			
			current = dialog[current.next];
			return this.next();
		}
		/**Show node properties
		*@property name - sprite to render
		*@property x - x position to render the sprite(optional)
		*@property y - y position to render the sprite(optional)
		*@property frame - the frame of the atlas to render(optional)
		*/
		else if(current.type=="Show"){
			var name = parse(current.name);
			var s = sprites[name];
			
			if(!s) { throw "Invalid tween on sprite "+name+" doesn't exist. Node Index: "+current.id; }
			
			s.renderable = true;
			s.x = current.x.length === 0 ? s.x : screenX(current.x);
			s.y = current.y.length === 0 ? s.y : screenY(current.y);
			
			if(current.frame.length > 0){
				s.frameName = current.frame;
			}
			
			current = dialog[current.next];
			return this.next();
		}
		/**Hide node properties
		*@property name - the name of the sprite to hide
		*/
		else if(current.type=="Hide"){
			var name = parse(current.name);
			var s = sprites[name];
			
			if(!s) { throw "Invalid Hide on sprite "+name+" doesn't exist. Node Index: "+current.id; }
			
			s.renderable = false;
			
			current = dialog[current.next];
			return this.next();
		}
		/**Tween node properties
		*@property name - the sprite to tween
		*@property property - the property to be interpolated
		*@property to - the value to transition to
		*@property duration - duration of the tween
		*@property from - the value to transition from(optional)
		*@property ease - the interpolation function to use(optional)
		*/
		else if(current.type=="Tween"){
			var duration = +parse(current.duration)*1000;
			//var to = +parse(current.to);
			var name = parse(current.name);
			var ease = getEasing(parse(current.ease));
			var sprite = sprites[name];
			
			if(!sprite){ throw "Invalid Tween on sprite "+name+" doesn't exist. Node Index: "+current.id; }			
			
			var property = {};
			var p = parse(current.property);
			
			tweenData.push({
				sprite: name,
				target: null
			});
			
			//Apply Tween
			if(p=="x"){
				property[p] = screenX(current.to);
				//Set sprite property to initial value
				if(current.from.length > 0){
					sprite[p] = screenX(current.from);
				}
			}
			else if(p=="y"){
				property[p] = screenY(current.to);
				if(current.from.length > 0){
					sprite[p] = screenY(current.from);
				}
			}
			else if(p=="sx"){
				property.x = +parse(current.to);
				if(current.from.length > 0){
					sprite.scale.x = +parse(current.from);
				}
				tweens.push(game.add.tween(sprite.scale).to(property, duration, ease, true, 0, 0, false));
				//Store tween data for serialization
				tweenData[tweenData.length-1].target = 'scale';
				
				current = dialog[current.next];
				return this.next();
			}
			else if(p=="sy"){				
				property.y = +parse(current.to);
				
				if(current.from.length > 0){
					sprite.scale.y = +parse(current.from);
				}
				tweens.push(game.add.tween(sprite.scale).to(property, duration, ease, true, 0, 0, false));
				//Store tween data for serialization
				tweenData[tweenData.length-1].target = 'scale';
				
				current = dialog[current.next];
				return this.next();
			}
			else if(p=="scale"){
				var to = +parse(current.to);
				property.y = to;
				property.x = to;

				if(current.from.length > 0){
					sprite.scale.x = +parse(current.from);
					sprite.scale.y = +parse(current.from);
				}
				
				tweens.push(game.add.tween(sprite.scale).to(property, duration, ease, true, 0, 0, false));
				//Store tween data for serialization
				tweenData[tweenData.length-1].target = 'scale';
				
				current = dialog[current.next];
				return this.next();
			}
			else{
				property[p] = +parse(current.to);
				if(current.from.length > 0){
					sprite[p] = +parse(current.from);
				}
			}
			
			tweens.push(game.add.tween(sprite).to(property, duration, ease, true, 0, 0, false));
			
			current = dialog[current.next];
			return this.next();
		}
		/**Audio node properties
		*@property name - the name of the new audio clip
		*@property sound - the cache key
		*/
		else if(current.type=="Audio"){
			var name = parse(current.name);
			
			if(sounds[name]){
				if(sounds[name].key==current.sound)
					sounds[name].stop();
				else
					sounds[name].destroy();
			}
			else
				sounds[name] = game.add.audio(current.sound);
			
			sounds[name].mute = mute;
			/*sounds[current.name].onLoop.add(function(s){
				s.play();
			},this,sounds[current.name]);*/
			current = dialog[current.next];
			return this.next();
		}
		/**Play node properties
		*@property name - the audio to play
		*@property value - whether the sound should loop
		*/
		else if(current.type=="Play"){
			var name = parse(current.name);
			var sound = sounds[name];
			
			if(!sound) { throw "Invalid play on sound "+name+"doesn't exist Node index: "+current.id; }
			
			sound.loop = booleanValue(parse(current.value));
			sound.play();
			//I hate Chrome
			sound.onLoop.remove(playSound);
			sound.onLoop.add(playSound,sound);
			
			delegate.fireEvent("play",sounds[name]);
			
			current = dialog[current.next];
			return this.next();
		}
		/**Stop node properties
		*@property name - the audio to stop
		*/
		else if(current.type=="Stop"){
			sounds[parse(current.name)].stop();
			current = dialog[current.next];
			return this.next();
		}
		else{
			throw "Invalid node stored in scene.";
		}
	};
	/**Adds a function to the specified event 
	*@name{string} - the event
	*@f{object} - the function
	*@return - the function that was added
	*/
	this.on = function(name,f,ctx){
		return delegate.subscribe(name,f,ctx);
	};
	
	this.off = function(name,f){
		if(f)
			delegate.removeEvent(name,f);
		else if(name)
			delegate.removeEvents(name);
		else
			delegate.clear();
	};
	
	this.isFunction = function(name,f){
		return delegate.containEvent(name,f);
	};
	
	this.save = function(key,properties){
		var state = {
			sprites: [],
			sounds: [],
			tweens: [],
			properties:properties,
			global: parser.global,
			current: previous.id,
			paused: paused,
			mute: mute,
			dirty: dirty,
			block: block
		};
		
		state.current = current ? current.id : null;
		for(var k in sprites){
			state.sprites.push({
				name: sprites[i].name,
				key: sprites[i].key,
				frame: sprites[i].frame,
				renderable: spites[i].renderable,
				x: sprites[i].x,
				y: sprites[i].y,
				depth: sprites[i].depth,
				angle: sprites[i].rotation,
				sx: sprites[i].scale.x,
				sy: sprites[i].scale.y,
				alpha: sprites[i].alpha
			});
		}
		for(var k in sounds){
			state.sounds.push({
				name: k,
				key: sounds[k].key,
				isPlaying: sounds[k].isPlaying,
				paused: sounds[k].paused,
				loop: sounds[k].loop,
				position: sounds[k].position,
				mute: sounds[k].mute
			});
		}
		for(var k in tweens){
			state.tweens.push({
				name: tweenData[k].name,
				paused: tweens[k].isPaused,
				properties: tweens[k].properties,
				easing: tweens[k].totalDuration.easingFunction,
				duration: tweens[k].totalDuration.duration,
				dt: tweens[k].totalDuration.dt,
				vStart: tweens[k].timeline[0].vStart,
				target: tweenData[k].target
			});
		}
		
		localStorage[key] = LZString.compressToUTF16(JSON.stringify(state));
	};
	
	this.load = function(key,scene){
		var state = JSON.parse(LZString.decrompressFromUTF16(localStorage[key]));
		parser.global = state.global;
		
		block = false;
		dirty = state.dirty;
		
		if(!group){
			group = game.add.group();
			group.fixedToCamera = true;
		}
		
		//Create sprites
		for(var i=0;i<state.sprites.length;i++){
			var sprite = state.sprites[i];
			var s = group.create(sprite.x,sprite.y,sprite.key,sprite.frame);
			s.depth = sprite.depth;
			s.name = sprite.name;
			s.frame = sprite.frame;
			s.renderable = sprite.renderable;
			s.alpha = sprite.alpha;
			s.rotation = sprite.angle;
			s.scale.x = sprite.sx;
			s.scale.y = sprite.sy;
			sprites[s.name] = s;
		}
		group.sort('depth');
		
		//Create sounds
		for(var i=0;i<state.sounds.length;i++){
			var sound = state.sounds[i];
			var s = game.add.sound(sound.key);
			s.loop = sound.loop;
			s.mute = sounds.mute;
			
			if(sound.isPlaying){
				s.play();
			}
			else if(sound.paused){
				s.pause();
			}
			
			sounds[sound.name] = s;
		}
		
		this.mute = state.mute;
		
		//Create Tweens
		for(var i=0;i<state.tweens.length;i++){
			var tween = state.tweens[i];
			var target = tween.target ? sprites[tween.name][tween.target] : tween.target;
			
			var t = game.add.tween(target).to(tween.properties,tween.duration,tween.easing,true,0,0,false);
			
			t.timeline[0].vStart = tween.vStart;
			t.timeline[0].dt = tween.dt;
			
			if(tween.paused) { t.pause(); }
			
			//Store the tweens
			tweens.push(t);
			tweenData.push({
				sprite: tween.name,
				target: tween.target
			});
		}
		
		if(scene){
			this.setScene(scene);
			if(state.current!==null){
				current = dialog[state.current];
				previous = dialog[state.current];
			}
		}
		
		if(state.pause){
			this.pause();
		}
		return state.properties;
	};
	
	this.pause = function(){
		paused = true;
		for(var i=0;i<tweens.length;i++){
			tweens[i].pause();
		}
		for(var k in sounds){
			if(sounds[k].isPlaying)
				sounds[k].pause();
		}
		game.time.events.pause();
	};
	
	this.resume = function(){
		paused = false;
		for(var i=0;i<tweens.length;i++){
			tweens[i].resume();
		}
		for(var k in sounds){
			if(sounds[k].paused)
				sounds[k].resume();
		}
		game.time.events.resume();
	};
	/**Inserts a sprite for use in Dialog
	*@param name{string} - the name of the sprite
	*@param sprite{Phaser.sprite} - a phaser sprite object
	*@param z{number}(optional) - the sprite's depth
	*@param sort{boolean}(optional) - sort flag
	*/
	this.insertSprite = function(name,sprite,z,sort){
		if(!group){
			group = game.add.group();
			group.fixedToCamera = true;
		}
		sprite.depth = z || 0;
		this.sprites[name] = sprite;
		group.add(sprite);
		
		sort = sort===null ? true : sort;
		if(sort){
			group.sort('depth');
		}
	};
	
	this.getSprite = function(name){
		return sprites[name];
	};
	
	this.deleteSprite = function(name){
		if(sprites[name]){
			group.removeChild(sprites[name]).destroy();
			delete sprites[name];
		}
	};
	
	this.deleteScene = function(){
		dialog = [];
		current = null;
		previous = null;
	};
	
	this.deleteSprites = function(){
		if(group){
			group.destroy();
			group = null;
		}
		
		sprites = {};
		tweens = [];
		tweenData =[];
	};
	
	this.deleteSounds = function(){
		for(var k in sounds){
			sounds[k].destroy();
		}
		sounds = {};
	};
	
	this.destroy = function(){
		this.deleteSprites();
		this.deleteSounds();
	};
	
	this.rebuild = function(){
		this.destroy();
		group = game.add.group();
		group.fixedToCamera = true;
	};
	//Removes the blocking Semaphore<internal>
	this.removeSemaphore = function(){
		semaphore = null;
	};
	
	//Sets the group z index
	this.setLayer = function(z){
		group.z = z;
	};
	
	this.isVariable = function(variable){
		return parser.getValue(variable)===null;
	};
	
	this.getVariable = function(variable){
		return parser.getValue(variable);
	};
	
	this.getNumber = function(variable){
		return +parser.getValue(variable);
	};
	
	this.getBoolean = function(variable){
		var x = parser.getValue(variable);
		return x ? booleanValue(x) : false;
	};
	
	this.setVariable = function(variable,value){
		parser.setVariable(variable,value);
	};
	
	this.deleteVariable = function(variable){
		parser.deleteVariable(variable);
	};
	
	function playSound(){
		this.play();
	}
	
	function endAnimations(){
		var i;
		//Sort the tweens
		for(i=1;i<tweens.length;i++){
			var j, t = tweens[i];
			
			for(j=i;j>0;j--){
				if(t.timeline[0].duration-t.timeline[0].dt >= tweens[j-1].timeline[0].duration-tweens[j-1].timeline[0].dt){
					break;
				}
				
				tweens[j] = tweens[j-1];
				tweens[j-1] = t;
			}
		}
		//If there's still tweens running then force end them
		if(tweens.length>0 && tweens[tweens.length-1].isRunning){
			for(i=0;i<tweens.length;i++){
				if(tweens[i].isRunning){
					for(var k in tweens[i].properties){
						tweens[i].target[k] = tweens[i].properties[k];
						//console.log('Property '+k+' has been set to ' + tweens[i].properties[k]);
					}
					tweens[i].manager.remove(tweens[i]);
				}
			}
		}
		tweens = [];
		tweenData = [];
	}
	
	function getEasing(f){
		if(f=="linear"){
			return Phaser.Easing.Linear.None;
		}
		else if(f=="ease"){
			return Phaser.Easing.Quadratic.InOut;
		}
		else if(f=="easein"){
			return Phaser.Easing.Quadratic.In;
		}
		else if(f=="easeout"){
			return Phaser.Easing.Quadratic.Out;
		}
		else if(f=="bounce"){
			return Phaser.Easing.Bounce.InOut;
		}
		else if(f=="bouncein"){
			return Phaser.Easing.Bounce.In;
		}
		else if(f=="bounceout"){
			return Phaser.Easing.Bounce.InOut;
		}
		//default fallback
		else{
			return Phaser.Easing.Linear.None;
		}
	}
	
	function booleanValue(value){
		if(value=="0"||value=="false"||value.length===0)
			return false;
		else
			return true;
	}
	
	function screenX(x){
		return game.camera.width*((+parse(x))/100);
	}
	
	function screenY(y){
		return game.camera.height*((+parse(y))/100);
	}
	
	function parse(value){
		//Check if the expression contains any variables before replacing
		//if(value.includes('$'))
		value = replaceValues(value);
		
		while(value.search(/{([^}{]*)}/)!==-1)
			value = value.replace(/{([^}{]*)}/,evaluate);
		
		return value;
	}
	
	function evaluate(exp){
		parser.changeExpression(exp.substring(1,exp.length-1));
		return parser.evaluate();		
	}
	
	function replaceValues(exp){
		var result = exp;
		var key;
		
		var regex = new RegExp(/\[([^\]\[]*)\]/);
		
		while(regex.test(result)){
			result = result.replace(regex,globalValue);
		}
		/*
		//substitute variable values
		var globals = parser.getGlobals();
		for(key in globals){
			regex = new RegExp("\\$"+key+"\\s{0,1}", "g");
			result = result.replace(regex, globals[key]);
		}
		var constants = parser.getConstants();
		
		//substitute constant values
		for(key in constants){
			regex = new RegExp("\\$"+key+"\\b", "g");
			result = result.replace(regex, constants[key]);
		}*/
		return result;
	}
	
	function globalValue(key){
		key = key.subtring(1,key.length-1);
		return parser.global[key];
	}
	/**Initializes the scene and loads necessary resources
	*@param scene the .dlz file
	*@param game the game instance
	*/
	this.setScene = function(scene){
		scene = typeof scene == 'object' ? scene : JSON.parse(scene);
		
		if(!group){
			group = game.add.group();
			group.fixedToCamera = true;
		}
		//dialog = {};
		current = null;
		/*Setup the scene
		for(var i=0;i<scene.length;i++){
			dialog[scene[i].id] = scene[i];
			if(dialog[scene[i].id].type == "Root"){
				current = dialog[scene[i].id];
			}
		}*/
		var lut = {};
		dialog = scene;
		
		//Initialize indexes
		for(var i=0;i<dialog.length;i++){
			lut[dialog[i].id] = i;
			dialog[i].id = i;
		}
		
		//Setup id pointers
		for(var i=0;i<dialog.length;i++){
			if(dialog[i].type == "Root"){
				current = dialog[i];
				dialog[i].next = lut[dialog[i].next];
			}
			else if(dialog[i].type=="Branch"){
				for(var k in dialog[i].branches){
					dialog[i].branches[k] = lut[dialog[i].branches[k]];
				}
			}
			else if(dialog[i].choices){
				for(var k in dialog[i].choices){
					dialog[i].choices[k] = lut[dialog[i].choices[k]];
				}
			}
			else{
				dialog[i].next = lut[dialog[i].next];
			}
		}
		
		if(!current){
			throw "Missing root node in the scene.";
		}
		
		delegate.fireEvent("main",parse(current.name));
		previous = current;
		current = dialog[current.next];
	};
}
//Place value types in prototype
Dialog.prototype = {


};

function Parser(exp){

	var variableValues = {};
	variableValues.pi = Math.PI;
	variableValues.e = Math.E;
	variableValues.infinity = Number.POSITIVE_INFINITY;
	variableValues.neg_infinity = Number.NEGATIVE_INFINITY;
	var expression;
	var iElement;

	//Constants
	/*var CONSTANTS = {};
	CONSTANTS.pi = Math.PI;
	CONSTANTS.e = Math.E;
	CONSTANTS.infinity = Number.MAX_SAFE_INTEGER;*/
	var RESERVED_NAMES = new Array	(	//Operations
										//"sin",
										//"cos",
										//"tan",
										//"log",
										//"min",
										//"max",
										//"abs",
										//"rnd",
										//"ran",
										//"sgn",
										//constants
										"pi",
										"e",
										"infinity",
										"neg_infinity"
									);

	Parser(exp);
	/**
	 *Creates the object with the expression to be evaluated
	 *@param 	exp		The expression to be evaluated.
	*/
	function Parser(exp){
		if(typeof(exp) == "string"){
			expression = exp;
		}else{
			throw "String expected for expression, but "+typeof(exp)+" received.";
		}
	}
	
	this.__defineProperty__('global', {
	
		get:this.getGlobals,
		set:function(val){
			variableValues = val;
		}
	});
	/*this.__defineGetter__('constant', function(){
		return CONSTANTS;
	});*/
	/**
	 *Set a variable value, if the variable already exists, changes its value, else creates the variable with the passed value.
	 *Similar to variable = value.
	 *
	 *@param 	variable 	Variable name (type: string)
	 *@param 	value 		Variable value (type: int or float)
	*/
	this.setVariable = function(variable, value){
		if(typeof(variable) != "string"){
			throw "String expected for variable, but "+typeof(exp)+" received.";
		}
		if(!__verifyVariable(variable)){
			throw "Invalid characters in variable name.";
		}
		if(__isReservedName(variable)){
			throw "This name is a function or a constant.";
		}
		if(typeof(value) == "number"){
			throw "Invalid value.";
		}
		variableValues[variable] = value.toString();
		return true;
	};
	
	this.deleteVariable = function(variable){
		delete variableValues[variable];
	};
	
	this.getGlobals = function(){
		return variableValues;
	};

	/*this.getConstants = function(){
		return CONSTANTS;
	};*/
	/**
	 *Changes the expression to be evaluated
	 *@param	newExp		The new expression(type: string)
	*/
	this.changeExpression = function(newExp){
		if(typeof(newExp) == "string"){
			expression = newExp;
		}else{
			throw "String expected for expression, but "+typeof(newExp)+" received.";
		}
	};

	this.evaluate = function(){
		var exp = expression;
		exp = exp.replace(/\s/g, "");
		if(/^[^0-9\^\-\+\*\\\(\)><%]$/g.test(exp)){
			throw "Some illegal characters or unset variables in the expression.";
		}
		return __expressionResult(exp);
	};

	//DEBUG PROPOSE
	/**
	 *Gives the variable value.
	 *@param	variable	The variable name.
	*/
	this.getValue = function(variable){
		if(!(variable in variableValues)){
			console.log("Invalid variable");
		}else{
			console.log(variable + " = " + variableValues[variable]);
		}
		return variableValues[variable];
	};

	/**
	 *Verify if the variable exists.
	 *@param	variable	The variable name.
	*/
	this.variableExists = function(variable){
		return variable in variableValues;
	};

	//PRIVATE METHODS
	/**
	 *Verify if the variable respects name rules
	 *@param	name	The name to be verified.
	*/
	function __verifyVariable(name){
		var rule = new RegExp("^[A-Za-z_][0-9A-Za-z_]*$");
		return rule.test(name);
	}

	/**
	 *Verify if this name is used for some operations
	 *@param	name	The name to be verified.
	*/
	function __isReservedName(name){
		return RESERVED_NAMES.indexOf(name) > -1;
	}

	/**
	 *Replace variables with their respective values
	*/
	function __replaceValues(){
		var result = expression;
		var key;
		var regex;
		//substitute variable values
		for(key in variableValues){
			regex = new RegExp("\\b"+key+"\\b", "g");
			result = result.replace(regex, variableValues[key]);
		}
		//substitute constant values
		for(key in CONSTANTS){
			regex = new RegExp("\\b"+key+"\\b", "g");
			result = result.replace(regex, CONSTANTS[key]);
		}
		return result;
	}

	function __replaceKeys(exp){
		var result = exp;
		var key;
		var regex;
		//substitute variable values
		for(key in variableValues){
			regex = new RegExp("\\b"+key+"\\b", "g");
			result = result.replace(regex, variableValues[key]);
		}
		return result;
	}

	/**
	 *Compile and get the value of the expression
	 *@param	exp		The expression to be calculated.
	*/
	function __expressionResult(exp){
		iElement = 0;
		return __logical(exp);
	}
	//PARSER RULES
	/*
		number     	= {"0"|"1"|"2"|"3"|"4"|"5"|"6"|"7"|"8"|"9"|"."}
		factor  	= number | "(" expression ")" | wordInFunctionsArray"(" factor ["," factor] ")"
		element 	= factor [{"^" factor}]
		component  	= element [{("*" | "/" | "%") element}]
		expression 	= component [{("+" | "-") component}]
		logical     = expression [{("<" | ">") expression}]
	*/
	function __logical(exp){
		var result = 0;
		var expression = 0;
		var proposition = false;
		result = __expression(exp);
		while(iElement < exp.length){
			if(exp[iElement] ==  ">"){
				iElement++;
				expression = __expression(exp);
				proposition = result > expression;
				result = expression;
				if(!proposition)
					return proposition;
				
			}else if(exp[iElement] == "<"){
				iElement++;
				expression = __expression(exp);
				proposition = result < expression;
				result = expression;
				if(!proposition)
					return proposition;
			}
		}
		return proposition ? proposition : result;
	}
	
	function __expression(exp){
		var result = 0;
		result = __component(exp);
		while(iElement < exp.length){
			if(exp[iElement] == "+"){
				iElement++;
				result += __component(exp);
			}else if(exp[iElement] == "-"){
				iElement++;
				result -= __component(exp);
			}else if(exp[iElement] == ")" || exp[iElement] == "," || exp[iElement] == "<" || exp[iElement] == ">"){
				break;
			}
		}
		return result;
	}

	function __component(exp){
		var result = 0;
		result = __element(exp);
		while((exp[iElement] == '*' || exp[iElement] == '/' || exp[iElement] == '%') && (iElement < exp.length)){
			if(exp[iElement] == "*"){
				iElement++;
				result *= __element(exp);
			} else if(exp[iElement] == "/"){
				iElement++;
				result /= __element(exp);
			}
			else if(exp[iElement] == "%"){
				iElement++;
				result %= __element(exp);
			}
		}
		return result;
	}

	function __element(exp){
		var result = 0;
		result = __factor(exp);
		while (exp[iElement] == '^' && iElement < exp.length){
			if(exp[iElement] == "^"){
				iElement++;
				result = Math.pow(result,__factor(exp));
			}
		}
		return result;
	}

	function __factor(exp){
		var result = 0;
		var functions = new Array("sin", "cos", "tan","log","max","min","abs","rnd","ran","sgn");
		if(exp[iElement] == "("){
			iElement++;
			result = __expression(exp);
			if(exp[iElement] != ")") throw "Missing ')' in column "+iElement.toString()+".";
			iElement++;
		}else if(functions.indexOf(exp[iElement]+exp[iElement+1]+exp[iElement+2]) > -1 && exp[iElement+3] == "("){
			//function verify
			var f = exp[iElement]+exp[iElement+1]+exp[iElement+2];
			iElement += 4;
			var num1, num2;
			var verifyNum2 = false;
			num1 = __expression(exp);
			if(exp[iElement] == ","){
				if(parseFloat(num1) != parseFloat(num1)) throw "Expected a number in column "+iElement-1+".";
				iElement++;
				verifyNum2 = true;
				num2 = __expression(exp);
			}
			if(exp[iElement] != ")") throw "Missing ')' in column "+iElement.toString()+".";
			iElement++;
			if(verifyNum2){
				if(parseFloat(num2) != parseFloat(num2)) throw "Expected a number in column "+iElement-2+".";
			}else{
				if(parseFloat(num1) != parseFloat(num1)) throw "Expected a number in column "+iElement-2+".";
			}
			if(f == "sin"){
				result = Math.sin(num1);
			}else if(f == "cos"){
				result = Math.cos(num1);
			}else if(f == "tan"){
				result = Math.tan(num1);
			}else if(f == "log"){
				result = Math.log(num1)/Math.log(num2);
			}else if(f == "min"){
				result = Math.min(num1,num2);
			}else if(f == "max"){
				result = Math.max(num1,num2);
			}else if(f == "abs"){
				result = Math.abs(num1);
			}else if(f == "rnd"){
				if(!num2||num2===0)
					result = Math.fastRound(num1);
				else
					result = Math.roundTo(num1,num2);
			}else if(f == "ran"){
				result = Math.range(num1,num2);
			}else if(f == "sgn"){
				result = -num1;
			}
		}else {
			result = __number(exp);
		}
		return result;
	}

	function __number(exp){
		var values = new Array("0","1","2","3","4","5","6","7","8","9",".");
		var s = "";
		var pointCount = 0;
		if((values.indexOf(exp[iElement-1]) > -1 || exp[iElement-1] == ')' || exp[iElement-1] == '(') && (exp[iElement] == '-' || exp[iElement] == '+')){
			s += exp[iElement++];
		}
		while(values.indexOf(exp[iElement]) > -1 && iElement < exp.length){
			if(exp[iElement] == "."){
				if(pointCount == 1) throw "Invalid element in column "+iElement.toString()+".";
				pointCount++;
			}
			s+= exp[iElement++];
		}
		if(parseFloat(s) != parseFloat(s)) throw "Invalid element in column "+iElement.toString()+".";
		return parseFloat(s);
	}

	function __verifyFunction(f, a, b){
		if(f == "sin"){
			return Math.sin(a);
		}else if(f == "cos"){
			return Math.cos(a);
		}else if(f == "tan"){
			return Math.tan(a);
		}else if(f == "log"){
			return Math.log(a)/Math.log(b);
		}else if(f == "min"){
			return Math.min(a,b);
		}else if(f == "max"){
			return Math.max(a,b);
		}else if(f == "abs"){
			return Math.abs(a);
		}else if(f == "rnd"){
			if(!a||a===0)
				return Math.fastRound(a);
			else
				return Math.roundTo(a,b);
		}else if(f == "ran"){
			return Math.range(a,b);
		}else if(f == "sgn"){
			return -a;
		}
	}

}