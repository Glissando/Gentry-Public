var itemGenerator = (function(){

	var ig = {};
	//ig.maxlvl = rpg.maxlvl;
	rarityBonus = {
		Common: 0.9,
		Rare: 1.15,
		Unique: 1.25
	};

	roots = ['anthrop','chron','dem','morph','path','pedo','ped','philo','phil',
			 'phon'];

	suffixes = ['ism','ist','ize','gram','graph','logue','log','logy','meter',
				'meter','metery','oid','phile','phobe','phobia','phone'];

	prefixes = ['a','an','anti','ant','auto','bio','bi','geo','hyper','micro',
				'mono','neo','pan','thermo','therm'];
	items =
		[{
			type: "Sword",
			attack: {
				iattackrange: 0,
				oattackrange: 1,
				itargetrange: 0,
				otargetrange: 0,
				layer:"All",
				range:"Cross",
				pow: 10,
				spcost:0,
				type:1
			},
	   subTypes:[{type:"katana",minAttack:8,maxAttack:20,minDefence:2,maxDefence:6,minIntelligence:2,maxIntelligence:6,minAgility:6,maxAgility:14,minHit:4,maxHit:10},
				 {type:"broadsword",minAttack:10,maxAttack:25,minDefence:3,maxDefence:11,minIntelligence:2,maxIntelligence:8,minAgility:1,maxAgility:5,minHit:2,maxHit:7}]
		},
		{
			type:"Dagger",
			attack:{
				iattackrange: 0,
				oattackrange: 1,
				itargetrange: 0,
				otargetrange: 0,
				layer:"All",
				range:"Cross",
				pow: 10,
				spcost:0,
				type:1
			},
			subTypes:[{type:"dirk",minAttack:4,maxAttack:12,minDefence:1,maxDefence:4,minIntelligence:2,maxIntelligence:6,minAgility:6,maxAgility:25,minHit:3,maxHit:9}]
		},
		{
			type:"Handgun",
			attack:{
				iattackrange: 0,
				oattackrange: 3,
				itargetrange: 0,
				otargetrange: 0,
				layer:"Collide",
				range:"Manhattan",
				pow: 10,
				spcost:0,
				type:1
			},
			subTypes:[{type:"dirk",minAttack:4,maxAttack:12,minDefence:1,maxDefence:4,minIntelligence:2,maxIntelligence:6,minAgility:6,maxAgility:25,minHit:3,maxHit:9}]
		},
		{
			type:"Rifle",
			attack:{
				iattackrange: 0,
				oattackrange: 3,
				itargetrange: 0,
				otargetrange: 0,
				layer:"Collide",
				range:"Manhattan",
				pow: 10,
				spcost:0,
				type:1
			},
			subTypes:[{type:"dirk",minAttack:4,maxAttack:12,minDefence:1,maxDefence:4,minIntelligence:2,maxIntelligence:6,minAgility:6,maxAgility:25,minHit:3,maxHit:9}]
		},
		{
			type:"Uniform",
			subTypes:[{type:"Attack",minAttack:4,maxAttack:8,minDefence:4,maxDefence:5,minIntelligence:2,maxIntelligence:6,minAgility:4,maxAgility:10,minHit:5,maxHit:15},
		{type:"Defence",minAttack:1,maxAttack:4,minDefence:5,maxDefence:20,minIntelligence:3,maxIntelligence:9,minAgility:2,maxAgility:8,minHit:1,maxHit:5},    {type:"Support",minAttack:1,maxAttack:3,minDefence:3,maxDefence:11,minIntelligence:4,maxIntelligence:15,minAgility:2,maxAgility:8,minHit:3,maxHit:12}]
		},
		{
			type:"ID",
			subTypes:[{type:"Move",mp:1, agility:3},
				{type:"Expert",attack:2,defence:2,intelligence:2,agility:2,hit:2},    {type:"Assault",attack:4,agility:3,hit:3},
				{type:"Physician",defence:2,intelligence:5,hit:1},
				{type:"Sniper",attack:2,hit:5},
				{type:"Invincible",defence:4,intelligence:2,agility:1}]
		}
	];

	//Returns a reference to the weapon type's attack construct
	ig.weaponAttack = function(type){
		for(var i=0;i<items.length;i++){
			if(items[i].type==type){
				return items[i].attack;
			}
		}
	};

	ig.weaponAttacks = function(type){
		var a = [];
		for(var i=0;i<items.length;i++){
			if(items[i].type!="Uniform"||items[i].type!="ID")
				a.push(items[i].attack);
		}
	};
	/**Generates a random item around a given level
	*@lvl{integer} - The level that weapon should be generated around
	*@type{string} - The type of weapon that should be generated(optional)
	*@return{item} - Returns an item object
	*/
	ig.randomItem = function(lvl,itype,rarity){
		var type;
		if(itype){
			for(var i=0;i<items.length;i++)
				if(items[i].type==itype)
					type = items[i];
		}
		else{
			type = items[[1,2,3,4,5,5,6,6][Math.range(0,7)]];
		}
		
		var sub = type.subTypes[Math.range(0,type.subTypes.length-1)];
		lvl = Math.clamp(1,rpg.maxlvl,Math.range(lvl-2,lvl+2));
		var r = lvl/rpg.maxlvl;
		var overall = 0;
		var item = {};
		//determine rarity
		if(rarity)
			item.rarity = rarity;
		else{
			item.rarity = Math.range(0,99);
			if(item.rarity<60){
				item.rarity = "Common";
			}
			else if(item.rarity<85){
				item.rarity = "Rare";
			}
			else{
				item.rarity = "Unique";
			}
		}
	  //Handle item types
		if(type.type=="Uniform"){
			item.name = randomName()+' '+sub.type;
			item.attack = Math.lerp(sub.minAttack,sub.maxAttack,r);
			item.defence = Math.lerp(sub.minDefence,sub.maxDefence,r);
			item.intelligence = Math.lerp(sub.minIntelligence,sub.maxIntelligence,r);
			item.agility = Math.lerp(sub.minAgility,sub.maxAgility,r);
			item.hit = Math.lerp(sub.minHit,sub.maxHit,r);
			item.type = type.type;
			item.subType = sub.type;

			overall = item.attack+item.defence+item.intelligence+item.agility+item.hit;
			item.cost = Math.fastRound(overall*Math.log(lvl)*Math.pow(rarityBonus[item.rarity],2));
			overall = overall*rarityBonus[item.rarity]-overall;
			var c = Math.range(overall/6,overall/4);
			item.attack = Math.fastRound(item.attack+c);
			c = Math.range(overall/6,overall/4);
			item.defence = Math.fastRound(item.defence+c);
			c = Math.range(overall/6,overall/4);
			item.agility = Math.fastRound(item.agility+c);
			c = Math.range(overall/6,overall/4);
			item.hit = Math.fastRound(item.hit+c);
			c = Math.range(overall/6,overall/4);
			item.intelligence = Math.fastRound(item.intelligence+c);
		}
		else if(type.type=="ID"){
			item.name = sub.type;
			var overall = 0;
			var c;
			item.type = type.type;
			item.subType = sub.type;
			for(var k in sub){
				if(k!=="type"){
					item[k] = k == "mp" ? item[k] : Math.lerp(sub[k],sub[k]*5,r);
					c = (Math.range(80,120)/100)*Math.pow(rarityBonus[item.rarity],2);
					overall += item[k]*c;
					item[k] = Math.fastRound(item[k]*c);
			  }
			}
			item.cost = Math.fastRound(50+overall*Math.log(lvl));
		}
	  else{
		item.name = randomName()+' '+sub.type;
		item.skill = type.attack;
		item.attack = Math.lerp(sub.minAttack,sub.maxAttack,r);
		item.defence = Math.lerp(sub.minDefence,sub.maxDefence,r);
		item.intelligence = Math.lerp(sub.minIntelligence,sub.maxIntelligence,r);
		item.agility = Math.lerp(sub.minAgility,sub.maxAgility,r);
		item.hit = Math.lerp(sub.minHit,sub.maxHit,r);
		item.type = type.type;
		item.subType = sub.type;

			overall = item.attack+item.defence+item.intelligence+item.agility+item.hit;
			item.cost = Math.fastRound(overall*Math.log(lvl)*Math.pow(rarityBonus[item.rarity],2));
			overall = overall*rarityBonus[item.rarity]-overall;
			var c = Math.range(overall/6,overall/4);
			item.attack = Math.fastRound(item.attack+c);
			c = Math.range(overall/6,overall/4);
			item.defence = Math.fastRound(item.defence+c);
			c = Math.range(overall/6,overall/4);
			item.agility = Math.fastRound(item.agility+c);
			c = Math.range(overall/6,overall/4);
			item.hit = Math.fastRound(item.hit+c);
			c = Math.range(overall/6,overall/4);
			item.intelligence = Math.fastRound(item.intelligence+c);
		}
	  return item;
	};
	//RARITY-TYPE-LVL
	ig.itemFromString = function(str){
		str = str.split('-');
		return ig.randomItem(+str[2],str[1],str[0]);
	};

	function randomName(){
		var l = Math.range(2,3);
		var str = '';
		str = str.concat(prefixes[Math.range(0,prefixes.length-1)]);
		str = str.concat(roots[Math.range(0,roots.length-1)]);
		if(l==3)
			str = str.concat(suffixes[Math.range(0,suffixes.length-1)]);
		return str;
	}

	return ig;
}());
//itemFromString('Rare-Katana-16');
/*
var item = itemGenerator.randomItem(27);
console.log('Name: '+item.name);
console.log('Lvl: '+lvl);
console.log('Type: '+item.subType);
console.log('Rarity: '+item.rarity);
console.log('Cost: '+item.cost);
console.log('Attack: '+item.attack);
console.log('Defence: '+item.defence);
console.log('Intelligence: '+item.intelligence);
console.log('Hit: '+item.hit);
console.log('Agility: '+item.agility);
*/
//console.log(randomName());