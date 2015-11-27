/*Array.prototype.remove = function(from, to) {
  var rest = this.slice((to || from) + 1 || this.length);
  this.length = from < 0 ? this.length + from : from;
  return this.push.apply(this, rest);
};*/

Math.range = function(min, max) {
	if (max == null) {
	  max = min;
	  min = 0;
	}
	return min + Math.floor(Math.random() * (max - min + 1));
};

Math.clamp = function(min,max,value){
	return Math.max(min,Math.min(max,value));
};

Math.lerp = function(from,to,t){
	if (t < 0.0)
		return from;
	else if (t > 1.0)
		return to;
	return (to - from) * t + from;
};

Math.fastRound = function(value){
	// With a bitwise or.
	rounded = (0.5 + value) | 0;
	// A double bitwise not.
	rounded = ~~ (0.5 + value);
	// Finally, a left bitwise shift.
	rounded = (0.5 + value) << 0;
	return rounded;
};

Math.lerpUnclamped = function(from,to,t){
	return (1.0 - t)*from + t*to;
};

Math.smoothStep = function(from,to,t){
	if(t<0.0)
		return from;
	else if (t > 1.0)
		return to;
	t = t*t*(3.0 - 2.0*t);
	return (1.0 - t)*from + t*to;
};

Math.exponential = function(min,max,x){
    var xx = x*x;
    var xxx = x*xx;
    return min+xx*(max-min);
};

Math.roundTo = function(num, step) { 
	return Math.floor((num / step) + .5) * step; 
};