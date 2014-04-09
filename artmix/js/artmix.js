/*

Artmix v 0.1

A simple and secure MP3 visualization written in JavaScript and CSS.
Artmix has no dependencies and shouldn't conflict with libraries like jQuery

Install:
	1. Put the /artmix directory on your site.
	2. On the page where you're going to install Artmix, add the following to the <head> (adjusting the path if necessary)
		<link rel="stylesheet" href="artmix/css/artmix.css" />
		<script src="artmix/js/config.js"></script>
		<script src="artmix/js/artmix.js"></script>
	3. On the page where you're going to install Artmix, add an empty div#artmix (this is where the action is)
		<div id="artmix"></div>
	4. When you've entered all the Settings and LinesAndTimes click "Download" and save the popup to config.js
		Don't reload without saving this file! Artmix doesn't have autosave or access to your drives on the client or server

	When you load the page you should see a black square in a gray box in the upper left corner.
	Clicking on this will open the interface.
	If you don't see the black square then maybe "editmode":false in config.js

Developed by: Tone Milazzo (http://tonemilazzo.com)

Homepage: http://artmix.tonemilazzo.com

The MIT License (MIT)

Copyright (c) 2014 Tone Milazzo

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/


window.onload = function start(){
	artmix = new ArtMix();
	artmix.LoadConfig();
	artmix.MinMaxButton();
	artmix.InjectDrawArea();
	artmix.SquareGen();
	artmix.FillSquare();
}

var ArtMix;

function ArtMix(){
	// Constructor
	this.settingsOpen = false; //if editor panel is open or not
	this.Settings; // object that holds settings
	this.LinesAndTimes; // array of objects that hold line information
	this.charIDs; // 2d array of id's generated for characters in matrix
	this.divContent; //drawing area
	this.doneTime; // when the last line is processed
	this.Times = new Array(); //for calculating the Differential
	this.Differential = 0; //average time between frames
	this.AudioTime = 0; //time taken from audio element
	this.MicroLoop; //To hold the interval
	this.DeletedLines = new Array(); //stores... deleted lines! surprise!
}

ArtMix.prototype.LoadConfig = function(){
	// config.js contains to array declarations, Settings and LineaAndTimes
	if(typeof Settings != 'undefined'){
		this.Settings = Settings;
	}else{
		//defaults
		this.Settings = {"xwidth":26,"yheight":10,"charSpacing":28,"editmode":true,"audioSrc1":"","audioSrc2":"","audioSrc3":"","BGFont":"ArtMixLucidaSansUnicode","FGFont":"ArtMixVerdana","BGColor":"ArtMix8B008B","FGColor":"ArtMixDC143C"};
	}
	if(typeof LinesAndTimes != 'undefined'){
		this.LinesAndTimes = LinesAndTimes;
	}else{
		this.LinesAndTimes = new Array();
	}

}

ArtMix.prototype.InjectDrawArea = function(){
	// inject controls and such into div#artmix
	document.getElementById("artmix").innerHTML = '<div id="content">' +
			'<p id="loading">Loading</p>' +
		'</div>' +
	'<audio controls id="controlbox" preload="auto" onplay="artmix.startArtMix()" onpause="artmix.stopArtMix()" ' +
	' onended="artmix.stopArtMix()">' +
  	'<source id="ArtMixSrc1" src="' + this.Settings.audioSrc1 + '" type="audio/mp3">' +
  	'<source id="ArtMixSrc2" src="' + this.Settings.audioSrc2 + '" type="audio/mp3">' +
  	'<source id="ArtMixSrc3" src="' + this.Settings.audioSrc3 + '" type="audio/mp3">' +
		'Your browser does not support the audio element.' +
	'</audio>';
}


ArtMix.prototype.SquareGen = function (){
	// create the char matrix inside div#content
	// called whenever the array is resized
	var charString = "";

	this.charIDs = this.createArray();
	this.divContent = document.getElementById("content");

	//set content CSS and controls CSS
	var contentCSS = "height: "+(this.Settings.yheight * this.Settings.charSpacing)+"px; width: "+(this.Settings.xwidth * this.Settings.charSpacing)+"px; "
	this.divContent.style.cssText = contentCSS;

	for(var i=0; i<this.Settings.yheight; ++i){
		for(var j=0; j<this.Settings.xwidth; ++j){
			var id = String.fromCharCode(i+65) + String.fromCharCode(j+65);
			//create this.charIDs opject and assign the id
			this.charIDs[i][j] = new Object();
			this.charIDs[i][j].ID = id;
			this.charIDs[i][j].TOP = (i)*this.Settings.charSpacing;
			this.charIDs[i][j].LEFT = (j)*this.Settings.charSpacing;
			this.charIDs[i][j].timecodeExpire = new Number(0);

			var style = 'top: ' + this.charIDs[i][j].TOP + 'px; left: ' + this.charIDs[i][j].LEFT + 'px;';
			charString += '<div id="' + id + '" class="Characters" style="' + style + '"></div>\n';
		}
	}
	this.divContent.innerHTML = charString;
}


ArtMix.prototype.createArray = function() {
	//Simple helper function, creates a 2d array
    var arr = new Array(this.Settings.yheight);
    for(var i=0; i<this.Settings.yheight; ++i){
    	arr[i] = new Array(this.Settings.xwidth);
    	for(var j = 0; j<=this.Settings.xwidth; ++j){
    		arr[i][j] = new Object();
    	}
    }
    return arr;
}


ArtMix.prototype.FillSquare = function(){
	// identifies character cells with expired contents and injects new characters
	for(var i = 0; i<this.Settings.yheight; ++i){
		for(var j = 0; j<this.Settings.xwidth; ++j){
			var char = this.charIDs[i][j].ID;
			if(this.charIDs[i][j].timecodeExpire <= this.AudioTime){
				document.getElementById(this.charIDs[i][j].ID).innerHTML = this.randomCharacter();
				this.charIDs[i][j].timecodeExpire = this.AudioTime + (Math.random()*2);
			}
		}
	}
}

ArtMix.prototype.randomCharacter = function(){
	// ten percent of the characters have a chance of being a symbol
	var letter;
	if(Math.random() > .10){
		var letter =  Math.floor((Math.random()*52)+65);
		if(letter > 90){
			letter += 6;
		}
	}else{
		var letter =  Math.floor((Math.random()*89)+33);
		if(letter > 90){
			letter += 6;
		}
	}
	if(letter == 127) ++letter; // 127 is 'Delete' prints as a box
	return '<span class="regChar ' + this.Settings.BGFont + " " + this.Settings.BGColor + '" alt="' + letter + '">' + String.fromCharCode(letter) + '</span>';
}


ArtMix.prototype.startArtMix = function(){
	// Starts the internal at 20 times a second
	this.MicroLoop = setInterval(
		(function(self) {         //Self-executing func which takes 'this' as self
		    return function() {   //Return a function in the context of 'self'
		        self.refresh();  //Thing you wanted to run as non-window 'this'
		    }
		})(this),50);
}

ArtMix.prototype.stopArtMix = function(){
	// stops the interval
	window.clearInterval(this.MicroLoop);
}

ArtMix.prototype.eraseLine = function(line){
	switch(line.align){
		case "horizontal":
			for( var j=0; j<line.line.length; ++j){
				if((line.y >= (this.Settings.yheight)) || ((+line.x + +j) >= (this.Settings.xwidth)))
					continue;
				var nextChar = line.line.charAt(j);
				if(nextChar == "_") continue;
				document.getElementById(this.charIDs[line.y][+line.x + +j].ID).innerHTML= this.randomCharacter();
				this.charIDs[line.y][+line.x + +j].timecodeExpire = this.AudioTime+line.duration;
			}
		break;
		case "vertical":
			for( var j=0; j<line.line.length; ++j){
			if(((line.y + j) >= (this.Settings.yheight)) || (line.x >= (this.Settings.xwidth)))
					continue;
				var nextChar = line.line.charAt(j);
				if(nextChar == "_") continue;
				document.getElementById(this.charIDs[line.y + j][line.x].ID).innerHTML= this.randomCharacter();
				this.charIDs[+line.y + +j][line.x].timecodeExpire = this.AudioTime+line.duration;
			}
		break;
		case "diagonalDown":
			for( var j=0; j<line.line.length; ++j){
				if(((line.y + j) >= (this.Settings.yheight)) || ((+line.x + +j) >= (this.Settings.xwidth)))
					continue;
				var nextChar = line.line.charAt(j);
				if(nextChar == "_") continue;
				document.getElementById(this.charIDs[line.y + j][+line.x + +j].ID).innerHTML= this.randomCharacter();
				this.charIDs[+line.y + +j][+line.x + +j].timecodeExpire = this.AudioTime+line.duration;
			}
		break;
		case "diagonalUp":
			for( var j=0; j<line.line.length; ++j){
				if(((line.y - j) >= (this.Settings.yheight)) || ((+line.x + +j) >= (this.Settings.xwidth)))
					continue;
				var nextChar = line.line.charAt(j);
				if(nextChar == "_") continue;
				document.getElementById(this.charIDs[+line.y - +j][+line.x + +j].ID).innerHTML= this.randomCharacter();
				this.charIDs[+line.y - +j][+line.x + +j].timecodeExpire = this.AudioTime+line.duration;
			}
		break;
	}
}

ArtMix.prototype.drawLine = function(line){
	switch(line.align){
		case "horizontal":
			for( var j=0; j<line.line.length; ++j){
				if((line.y >= (this.Settings.yheight)) || ((+line.x + +j) >= (this.Settings.xwidth)))
					continue;
				var nextChar = line.line.charAt(j);
				if(nextChar == "_") continue;
				document.getElementById(this.charIDs[line.y][+line.x + +j].ID).innerHTML= ''+
				'<span class="lineChar ' + this.Settings.FGFont + " " + this.Settings.FGColor + '"" style="' +
				line.style+'">'+ nextChar + '</span>';
				this.charIDs[line.y][+line.x + +j].timecodeExpire = this.AudioTime+line.duration;
			}
		break;
		case "vertical":
			for( var j=0; j<line.line.length; ++j){
			if(((line.y + j) >= (this.Settings.yheight)) || (line.x >= (this.Settings.xwidth)))
					continue;
				var nextChar = line.line.charAt(j);
				if(nextChar == "_") continue;
				document.getElementById(this.charIDs[line.y + j][line.x].ID).innerHTML= ''+
				'<span class="lineChar ' + this.Settings.FGFont + " " + this.Settings.FGColor + '"" style="' +
				line.style+'">'+ nextChar + '</span>';
				this.charIDs[+line.y + +j][line.x].timecodeExpire = this.AudioTime+line.duration;
			}
		break;
		case "diagonalDown":
			for( var j=0; j<line.line.length; ++j){
				if(((line.y + j) >= (this.Settings.yheight)) || ((+line.x + +j) >= (this.Settings.xwidth)))
					continue;
				var nextChar = line.line.charAt(j);
				if(nextChar == "_") continue;
				document.getElementById(this.charIDs[+line.y + +j][+line.x + +j].ID).innerHTML= ''+
				'<span class="lineChar ' + this.Settings.FGFont + " " + this.Settings.FGColor + '"" style="' +
				line.style+'">'+ nextChar + '</span>';
				this.charIDs[+line.y + +j][line.x + j].timecodeExpire = this.AudioTime+line.duration;
			}
		break;
		case "diagonalUp":
			for( var j=0; j<line.line.length; ++j){
				if(((line.y - j) >= (this.Settings.yheight)) || ((+line.x + +j) >= (this.Settings.xwidth)))
					continue;
				var nextChar = line.line.charAt(j);
				if(nextChar == "_") continue;
				document.getElementById(this.charIDs[+line.y - +j][+line.x + +j].ID).innerHTML= ''+
				'<span class="lineChar ' + this.Settings.FGFont + " " + this.Settings.FGColor + '"" style="' +
				line.style+'">'+ nextChar + '</span>';
				this.charIDs[line.y - j][+line.x + +j].timecodeExpire = this.AudioTime+line.duration;
			}
		break;
	}
}


ArtMix.prototype.refresh = function(){
	// every 20th of a second (or so, time is funny in javaScript) refresh will pull the time form the Audio element
	// and check to see if it's time to draw a new line of text, and how to draw it

	this.AudioTime = document.getElementById("controlbox").currentTime;
	// If there's a new line to display, process
	for(var i=0; i<this.LinesAndTimes.length; ++i){
		var openWindow = this.AudioTime - this.Differential;
		if(openWindow < 0 ) openWindow = 0;
		var closedWindow = this.AudioTime + this.Differential;
		if( (this.LinesAndTimes[i].time > openWindow ) && (this.LinesAndTimes[i].time < closedWindow ) ){
			this.drawLine(this.LinesAndTimes[i]);
		}
	}
	this.Times.push(Number(this.AudioTime));
	this.Differential = this.CalcDifferential();
	document.getElementById("ArtMixTime").value = this.AudioTime;
	document.getElementById("ArtMixDiff").value = this.Differential;
	//fill the square
	this.FillSquare();
}

ArtMix.prototype.CalcDifferential = function(){
	// takes an average of the interval between the last 20 frames
	var AMSum = 0;

	if(this.Times.length == 1) return this.Times[0];

	if(this.Times.length >= 20) this.Times.splice(0,1);

	for(var i = 1; i < this.Times.length; ++i){
		AMSum += this.Times[i] - this.Times[i-1];
	}
	return Number(AMSum/(this.Times.length-1));
}

ArtMix.prototype.MinMaxButton = function (){
	// Injects the editor interface if in edit mode
	var ArtMixBody = document.getElementsByTagName("body")[0];

	if(this.Settings.editmode == false){
		return;
	}
	this.settingsOpen = false;
	ArtMixBody.innerHTML += '<div id="ArtMixMinMax" onClick="artmix.ToggleSettings();">'+
		'<span id="ArtMixLeftX" class="box left">&mdash;</span>'+
		'<span id="ArtMixRightX" class="box right">&mdash;</span>'+
		'<span id="ArtMixTopX" class="box top">&mdash;</span>'+
		'<span id="ArtMixBottomX" class="box bottom">&mdash;</span></div>'+
		'<div id="ArtMixSettings" class="ArtMixSettingsClosed">'+
			'<label for="ArtMixWidth" class="ArtMixSettingForm ArtMixFormClosed">Width </label>'+
			'<input id="ArtMixWidth" onblur="artmix.ErrorCheck()" onchange="artmix.SettingChanged(this.id, this.value)" class="ArtMixSettingForm  ArtMixFormClosed" type="number" value="' + this.Settings.xwidth + '"/> '+
			'<label for="ArtMixHeight" class="ArtMixSettingForm ArtMixFormClosed">Height </label>'+
			'<input id="ArtMixHeight" onblur="artmix.ErrorCheck()" onchange="artmix.SettingChanged(this.id, this.value)" class="ArtMixSettingForm  ArtMixFormClosed" type="number" value="' + this.Settings.yheight + '"/> '+
			'<label for="ArtMixSpacing" class="ArtMixSettingForm ArtMixFormClosed">Spacing </label>'+
			'<input id="ArtMixSpacing" onchange="artmix.SettingChanged(this.id, this.value)" class="ArtMixSettingForm  ArtMixFormClosed" type="number" value="' + this.Settings.charSpacing + '"/> '+
			'<label for="ArtMixBGFont" class="ArtMixSettingForm ArtMixFormClosed">BG Font </label>'+
			'<select id="ArtMixBGFont" onchange="artmix.SettingChanged(this.id, this.value)" class="ArtMixSettingForm  ArtMixFormClosed" value="' + this.Settings.BGFont + '">' +
				'<option class="ArtMixArial" value="ArtMixArial">Arial</option>' +
				'<option class="ArtMixArialBlack" value="ArtMixArialBlack">Arial Black</option>' +
				'<option class="ArtMixImpact" value="ArtMixImpact">Impact</option>' +
				'<option class="ArtMixLucidaSansUnicode" value="ArtMixLucidaSansUnicode">Lucida Sans</option>' +
				'<option class="ArtMixTahoma" value="ArtMixTahoma">Tahoma</option>' +
				'<option class="ArtMixTrebuchetMS" value="ArtMixTrebuchetMS">Trebuchet</option>' +
				'<option class="ArtMixVerdana" value="ArtMixVerdana">Verdana</option>' +
				'<option class="ArtMixCourierNew" value="ArtMixCourierNew">Courier New</option>' +
				'<option class="ArtMixLucidaConsole" value="ArtMixLucidaConsole">Lucida Console</option>' +
				'<option class="ArtMixManual" value="ArtMixManual">Manual (by CSS)</option>' +
			'</select>' +
			'<label for="ArtMixFGFont" class="ArtMixSettingForm ArtMixFormClosed">FG Font </label>'+
			'<select id="ArtMixFGFont" onchange="artmix.SettingChanged(this.id, this.value)" class="ArtMixSettingForm  ArtMixFormClosed" value="' + this.Settings.FGFont + '">' +
				'<option class="ArtMixArial" value="ArtMixArial">Arial</option>' +
				'<option class="ArtMixArialBlack" value="ArtMixArialBlack">Arial Black</option>' +
				'<option class="ArtMixImpact" value="ArtMixImpact">Impact</option>' +
				'<option class="ArtMixLucidaSansUnicode" value="ArtMixLucidaSansUnicode">Lucida Sans</option>' +
				'<option class="ArtMixTahoma" value="ArtMixTahoma">Tahoma</option>' +
				'<option class="ArtMixTrebuchetMS" value="ArtMixTrebuchetMS">Trebuchet</option>' +
				'<option class="ArtMixVerdana" value="ArtMixVerdana">Verdana</option>' +
				'<option class="ArtMixCourierNew" value="ArtMixCourierNew">Courier New</option>' +
				'<option class="ArtMixLucidaConsole" value="ArtMixLucidaConsole">Lucida Console</option>' +
				'<option class="ArtMixManual" value="ArtMixManual">Manual (by CSS)</option>' +
			'</select>' +
			'<label for="ArtMixBGColor" class="ArtMixSettingForm ArtMixFormClosed">BG Color </label>'+
			'<select id="ArtMixBGColor" onchange="artmix.SettingChanged(this.id, this.value)" class="ArtMixSettingForm  ArtMixFormClosed" value="' + this.Settings.BGColor + '">' +
				'<option class="ArtMixF0F8FF" value="ArtMixF0F8FF">Alice Blue</option>' +
				'<option class="ArtMix000000" value="ArtMix000000">Black</option>' +
				'<option class="ArtMix8A2BE2" value="ArtMix8A2BE2">Blue Violet </option>' +
				'<option class="ArtMixFF7F50" value="ArtMixFF7F50">Coral</option>' +
				'<option class="ArtMixDC143C" value="ArtMixDC143C">Crimson</option>' +
				'<option class="ArtMixB8860B" value="ArtMixB8860B">Dark Golden Rod</option>' +
				'<option class="ArtMix8B008B" value="ArtMix8B008B">Dark Magenta</option>' +
				'<option class="ArtMix2F4F4F" value="ArtMix2F4F4F">Dark Slate Gray</option>' +
				'<option class="ArtMixDAA520" value="ArtMixDAA520">Golden Rod</option>' +
				'<option class="ArtMixManual" value="ArtMixManual">Manual (by CSS)</option>' +
			'</select>' +
			'<label for="ArtMixFGColor" class="ArtMixSettingForm ArtMixFormClosed">FG Color </label>'+
			'<select id="ArtMixFGColor" onchange="artmix.SettingChanged(this.id, this.value)" class="ArtMixSettingForm  ArtMixFormClosed" value="' + this.Settings.FGColor + '">' +
				'<option class="ArtMixF0F8FF" value="ArtMixF0F8FF">Alice Blue</option>' +
				'<option class="ArtMix000000" value="ArtMix000000">Black</option>' +
				'<option class="ArtMix8A2BE2" value="ArtMix8A2BE2">Blue Violet </option>' +
				'<option class="ArtMixFF7F50" value="ArtMixFF7F50">Coral</option>' +
				'<option class="ArtMixDC143C" value="ArtMixDC143C">Crimson</option>' +
				'<option class="ArtMixB8860B" value="ArtMixB8860B">Dark Golden Rod</option>' +
				'<option class="ArtMix8B008B" value="ArtMix8B008B">Dark Magenta</option>' +
				'<option class="ArtMix2F4F4F" value="ArtMix2F4F4F">Dark Slate Gray</option>' +
				'<option class="ArtMixDAA520" value="ArtMixDAA520">Golden Rod</option>' +
				'<option class="ArtMixManual" value="ArtMixManual">Manual (by CSS)</option>' +
			'</select>' +
			'<br/>' +
			'<label for="ArtMixAudioSrc1" class="ArtMixSettingForm ArtMixFormClosed">Source 1: </label>'+
			'<input id="ArtMixAudioSrc1" placeholder="Path to streaming MP3" onchange="artmix.SettingChanged(this.id, this.value)"  class="ArtMixSettingForm  ArtMixFormClosed" type="text" value="' + this.Settings.audioSrc1 + '"/> '+
			'<label for="ArtMixAudioSrc2" class="ArtMixSettingForm ArtMixFormClosed">Source 2: </label>'+
			'<input id="ArtMixAudioSrc2" placeholder="Path to streaming MP3" onchange="artmix.SettingChanged(this.id, this.value)"  class="ArtMixSettingForm  ArtMixFormClosed" type="text" value="' + this.Settings.audioSrc2 + '"/> '+
			'<label for="ArtMixAudioSrc3" class="ArtMixSettingForm ArtMixFormClosed">Source 3: </label>'+
			'<input id="ArtMixAudioSrc3" placeholder="Path to streaming MP3" onchange="artmix.SettingChanged(this.id, this.value)"  class="ArtMixSettingForm  ArtMixFormClosed" type="text" value="' + this.Settings.audioSrc3 + '"/> '+
			'</div>'+
		'<div id="ArtMixlines" class="ArtMixlinesClosed">'+
		'</div>' +
		'<input id="ArtMixDownload" class="ArtMixFormClosed" type="button" value="Download" onclick="artmix.downloadConfig();" />' +
		'<input id="ArtMixTime" class="ArtMixFormClosed ArtMixLineForm" placeholder="Time"/>' +
		'<input id="ArtMixDiff" class="ArtMixFormClosed ArtMixLineForm" placeholder="Differential"/>' +
		'<input id="ArtMixRestore" class="ArtMixFormClosed" type="button" value="Restore (0)" onclick="artmix.RestoreLine();" />';

		//now that the selects exist we can pick the options
		var select = document.getElementById("ArtMixBGFont");
		for(var i = 0; i < select.length; ++i){
			if(select.options[i].value == this.Settings.BGFont){
				select.selectedIndex = i;
				break;
			}
		}
		select = document.getElementById("ArtMixFGFont");
		for(var i = 0; i < select.length; ++i){
			if(select.options[i].value == this.Settings.FGFont){
				select.selectedIndex = i;
				break;
			}
		}
		select = document.getElementById("ArtMixBGColor");
		for(var i = 0; i < select.length; ++i){
			if(select.options[i].value == this.Settings.BGColor){
				select.selectedIndex = i;
				break;
			}
		}
		select = document.getElementById("ArtMixFGColor");
		for(var i = 0; i < select.length; ++i){
			if(select.options[i].value == this.Settings.FGColor){
				select.selectedIndex = i;
				break;
			}
		}
}

ArtMix.prototype.SettingChanged = function (ArtMixSetting, ArtMixValue){
	// In edit mode, if the colors or fonts are changed this will change all the element currently in play

	switch(ArtMixSetting){
		case "ArtMixBGFont":
			var oldsetting = this.Settings.BGFont;
			this.Settings.BGFont = ArtMixValue;
			var regCharByClass = document.querySelectorAll(".regChar");
			for(var i = 0; i<regCharByClass.length; ++i){
				this.SwitchClass(regCharByClass[i], oldsetting, ArtMixValue);
			}

			break;
		case "ArtMixFGFont":
			var oldsetting = this.Settings.FGFont;
			this.Settings.FGFont = ArtMixValue;
			var lineCharByClass = document.querySelectorAll(".lineChar");
			for(var i = 0; i<lineCharByClass.length; ++i){
				this.SwitchClass(lineCharByClass[i], oldsetting, ArtMixValue);
			}
			break;
		case "ArtMixBGColor":
			var oldsetting = this.Settings.BGColor;
			this.Settings.BGColor = ArtMixValue;
			var regCharByClass = document.querySelectorAll(".regChar");
			for(var i = 0; i<regCharByClass.length; ++i){
				this.SwitchClass(regCharByClass[i], oldsetting, ArtMixValue);
			}
			break;
		case "ArtMixFGColor":
			var oldsetting = this.Settings.FGColor;
			this.Settings.FGColor = ArtMixValue;
			var lineCharByClass = document.querySelectorAll(".lineChar");
			for(var i = 0; i<lineCharByClass.length; ++i){
				this.SwitchClass(lineCharByClass[i], oldsetting, ArtMixValue);
			}
			break;
		case "ArtMixWidth":
			this.Settings.xwidth = ArtMixValue;
			this.SquareGen();
			this.FillSquare();
			break;
		case "ArtMixHeight":
			this.Settings.yheight = ArtMixValue;
			this.SquareGen();
			this.FillSquare();
			break;
		case "ArtMixSpacing":
			this.Settings.charSpacing = ArtMixValue;
			this.SquareGen();
			this.FillSquare();
			break;
		case "ArtMixAudioSrc1":
			this.Settings.audioSrc1 = ArtMixValue;
			document.getElementById("ArtMixSrc1").src=ArtMixValue;
			break;
		case "ArtMixAudioSrc2":
			this.Settings.audioSrc2 = ArtMixValue;
			document.getElementById("ArtMixSrc2").src=ArtMixValue;
			break;
		case "ArtMixAudioSrc3":
			this.Settings.audioSrc3 = ArtMixValue;
			document.getElementById("ArtMixSrc3").src=ArtMixValue;
			break;
		default:
			console.debug( ArtMixSetting+" unsupported class passed to SettingChanged()")
	}
}

ArtMix.prototype.PopulateArtMixlines = function (){
	// Pulls information from the LinesAndTimes array and creates the setting from for editing such
	//called when the interface opens, or when a line is edited

	var ArtMixlinesInnards = '<div class="ArtMixAddButton" onClick="artmix.AddLine(0)" alt="Add new line like one below">+</div><br clear="all">';
	var ArtMixEvenOdd;
	var ArtMixSelectedOptions;

	if(typeof LinesAndTimes == 'undefined'){
		this.LinesAndTimes = new Array();
	}

	for(var i = 0; i< this.LinesAndTimes.length; ++i){
		if(i % 2 == 1) {
			ArtMixEvenOdd = "ArtMixOdd";
		}else{
			ArtMixEvenOdd = "ArtMixEven";
		}		//figure which option is selected
		switch(this.LinesAndTimes[i].align){
			case "vertical":
				ArtMixSelectedOptions = ["selected","","",""];
				break;
			case "horizontal":
				ArtMixSelectedOptions = ["","selected","",""];
				break;
			case "diagonalDown":
				ArtMixSelectedOptions = ["","","selected",""];
				break;
			case "diagonalUp":
				ArtMixSelectedOptions = ["","","","selected"];
				break;
		}
		ArtMixlinesInnards+= '<div class="ArtMixLineDiv '+ ArtMixEvenOdd + '"">' +
			'<label class="ArtMixLineNumber ArtMixLineForm">' + (i+1) + '</label>' +
			'<div class="ArtMixDeleteButton" onClick="artmix.DeleteLine(' + i + ')" alt="Remove this line">X</div>' +
			'<div class="ArtMixPreviewButton" onClick="artmix.PreviewLine(' + i + ', this)">Preview</div>' +
			'<br/>' +
			'<input class="ArtMixString ArtMixLineForm ArtMixLine" type="text" placeholder="(line)" value="' + this.LinesAndTimes[i].line +
			'" oninput="artmix.EditLine(' + i + ',\'line\',this.value)" />' +
			'<br/>' +

			'<label for="ArtMixTime" class="ArtMixLineForm">Time:</label>' +
			'<input class="ArtMixTime ArtMixLineForm ArtMixNumber" type="number" value="' + this.LinesAndTimes[i].time +
			'" oninput="artmix.EditLine(' + i + ',\'time\',this.value)" onblur="artmix.PopulateArtMixlines()" />' +
			'<label for="ArtMixDuration" class="ArtMixLineForm">Dur:</label>' +
			'<input class="ArtMixDuration ArtMixLineForm ArtMixNumber" type="number" value="' + this.LinesAndTimes[i].duration +
			'" oninput="artmix.EditLine(' + i + ',\'duration\',this.value)" />' +

			'<label for="ArtMixX" class="ArtMixLineForm">X:</label>' +
			'<input class="ArtMixX ArtMixLineForm ArtMixNumber" type="number" value="' + this.LinesAndTimes[i].x +
			'" oninput="artmix.EditLine(' + i + ',\'x\',this.value)" />' +
			'<label for="ArtMixY" class="ArtMixLineForm">Y:</label>' +
			'<input class="ArtMixY ArtMixLineForm ArtMixNumber" type="number" value="' + this.LinesAndTimes[i].y +
			'" oninput="artmix.EditLine(' + i + ',\'y\',this.value)" />' +
			'<br/>' +
			'<label for="ArtMixOrientation" class="ArtMixLineForm">Align:</label>' +
			'<select class="ArtMixOrientation ArtMixLineForm" value="" ' +
			' onchange="artmix.EditLine(' + i + ',\'align\',this.options[this.selectedIndex].value)">' +
				'<option value="vertical" ' + ArtMixSelectedOptions[0] + '>Vertical</option>' +
				'<option value="horizontal" ' + ArtMixSelectedOptions[1] + '>Horizontal</option>' +
				'<option value="diagonalDown" ' + ArtMixSelectedOptions[2] + '>Diagonal Down</option>' +
				'<option value="diagonalUp" ' + ArtMixSelectedOptions[3] + '>Diagonal Up</option>' +
			'</select>' +
			'<textarea class="ArtMixStyle ArtMixLineForm ArtMixNumber" type="text" placeholder="CSS (Optional)" ' +
				' onblur="artmix.EditLine(' + i + ',\'style\',this.value) " >' + this.LinesAndTimes[i].style + '</textarea>' +

			'</div>' +
			'<div class="ArtMixAddButton" onClick="artmix.AddLine(' + (i) + ')" alt="Add new line like one above">+</div><br clear="all">';
	}
	document.getElementById("ArtMixlines").innerHTML = ArtMixlinesInnards;
	//this.ErrorCheck(); //TODO: this isn't working here

}


ArtMix.prototype.PreviewLine = function (index, div){
	if( div.getAttribute("class").indexOf("ArtMixPreviewButtonOn") < 0){
		this.AddClass(div, "ArtMixPreviewButtonOn");
		this.drawLine(this.LinesAndTimes[index]);
	}else{
		this.RemoveClass(div, "ArtMixPreviewButtonOn");
		this.eraseLine(this.LinesAndTimes[index]);
	}
}

ArtMix.prototype.DeleteLine = function (index){
	// Deletes a line from the LinesandTimes array and redraws setting form
	if( index < 0 || index > this.LinesAndTimes.length){
		console.debug( "index sent to DeleteLine(), " + index + " out of range.");
		return;
	}
	//save deleted line for possible restore
	this.DeletedLines.unshift(this.LinesAndTimes.splice(index, 1)[0]);
	document.getElementById("ArtMixRestore").value = "Restore (" + this.DeletedLines.length +")";
	this.PopulateArtMixlines();
}

ArtMix.prototype.RestoreLine = function(){
	this.LinesAndTimes.push(this.DeletedLines.pop());
	document.getElementById("ArtMixRestore").value = "Restore (" + this.DeletedLines.length +")";
	this.LinesAndTimes.sort(
		function(a,b){
			if(a.time < b.time)
				return -1;
			if(a.time > b.time)
				return 1;
			return 0;
		});
	this.PopulateArtMixlines();
}

ArtMix.prototype.AddLine = function (index){
	// adds a line to the LinesandTimes array and redraws setting form
	var newLine;
	if( index < 0 ){
		console.debug( "index sent to AddLine(), " + index +" out of range.");
		return;
	}
	if(index>0){
		newLine = JSON.parse(JSON.stringify(this.LinesAndTimes[index]));
	}else{
		//todo: change to blank element
		newLine = {"line":"","time":0,"duration":0,"align":"horizontal","x":0,"y":0,"style":""};
		//newLine = JSON.parse(JSON.stringify(this.LinesAndTimes[0]));
	}
	this.LinesAndTimes.splice(index, 0, newLine);
	this.PopulateArtMixlines();
}


ArtMix.prototype.EditLine = function (index, key, value){
	//Edits a line currently in play

	if( index < 0 || index > this.LinesAndTimes.length){
		console.debug( "index sent to EditLine(), " + index +" out of range.");
		return;
	}
	if( (key == "time") || (key == "duration")){
		value == parseFloat(value);
	} else if ((key == "x") || (key == "y")){
		value == parseInt(value);
	}
	if(index>this.LinesAndTimes.length) return false;
	this.LinesAndTimes[index][key] = value;
	this.ErrorCheck();
	this.LinesAndTimes.sort(
		function(a,b){
			if(a.time < b.time)
				return -1;
			if(a.time > b.time)
				return 1;
			return 0;
		});
	return true;
}


ArtMix.prototype.ErrorCheck = function (){
	var ArtMixLineDivs;
	var checking;

	ArtMixLineDiv = document.querySelectorAll(".ArtMixLineDiv");

	for(var i = 0 ; i < ArtMixLineDiv.length; ++i){
		var children = ArtMixLineDiv[i].childNodes;
		var lineInput;
		var timeInput;
		var durationInput;
		var XInput;
		var YInput;
		var alignSelect;

		var children = ArtMixLineDiv[i].childNodes;
		for( var j = 0; j < children.length; ++j){
			if( children[j].className.indexOf("ArtMixString") > -1 ){
				lineInput = children[j];
				continue;
			}
			else if( children[j].className.indexOf("ArtMixTime") > -1 ){
				timeInput = children[j];
				continue;
			}
			else if( children[j].className.indexOf("ArtMixDuration") > -1 ){
				durationInput = children[j];
				continue;
			}
			else if( children[j].className.indexOf("ArtMixX") > -1 ){
				XInput = children[j];
				continue;
			}
			else if( children[j].className.indexOf("ArtMixY") > -1 ){
				YInput =children[j];
				continue;
			}
			else if( children[j].className.indexOf("ArtMixOrientation") > -1 ){
				alignSelect = children[j].options[children[j].selectedIndex].value;
				continue;
			}
		}
		// check Duration
		if( parseFloat(durationInput.value) < 0.1){
			this.AddClass(durationInput, 'ArtMixProblem');s
		}else{
			this.RemoveClass(durationInput, 'ArtMixProblem');
		}

		// Check X position
		if((alignSelect != "vertical") && ((lineInput.value.length + parseInt(XInput.value)) > this.Settings.xwidth)){
			this.AddClass(XInput, 'ArtMixProblem');
		}else{
			this.RemoveClass(XInput, 'ArtMixProblem');
		}

		// Check Y position down
		if(((alignSelect == "vertical") || (alignSelect == "diagonalDown")) && ((lineInput.value.length + parseInt(YInput.value)) > this.Settings.yheight)){
			this.AddClass(YInput, 'ArtMixProblem');
		}else{
			this.RemoveClass(YInput, 'ArtMixProblem');
		}

		// Check Y position up
		if((alignSelect == "diagonalUp") && ((parseInt(YInput.value) - lineInput.value.length) < 0)){
			this.AddClass(YInput, 'ArtMixProblem');
		}else{
			this.RemoveClass(YInput, 'ArtMixProblem');
		}
	}
}


ArtMix.prototype.ToggleSettings = function (){
	// open or close the setting forms

	if(this.settingsOpen == false){
		//opening
 		this.SwitchClass(document.getElementById("ArtMixLeftX"), "left","flat");
 		this.SwitchClass(document.getElementById("ArtMixRightX"), "right","flat");
 		this.SwitchClass(document.getElementById("ArtMixTopX"), "top","flat");
 		this.SwitchClass(document.getElementById("ArtMixBottomX"), "bottom","flat");
 		this.SwitchClass(document.getElementById("ArtMixSettings"), "ArtMixSettingsClosed","ArtMixSettingsOpen");
 		this.SwitchClass(document.getElementById("ArtMixlines"), "ArtMixlinesClosed","ArtMixlinesOpen");
 		this.SwitchClass(document.getElementById("ArtMixDownload"), "ArtMixFormClosed","ArtMixFormOpen");
 		this.SwitchClass(document.getElementById("ArtMixTime"), "ArtMixFormClosed","ArtMixFormOpen");
 		this.SwitchClass(document.getElementById("ArtMixDiff"), "ArtMixFormClosed","ArtMixFormOpen");
 		this.SwitchClass(document.getElementById("ArtMixRestore"), "ArtMixFormClosed","ArtMixFormOpen");
 		var ArtMixSettingElements = document.querySelectorAll(".ArtMixSettingForm");
 		for(var i = 0; i< ArtMixSettingElements.length; ++i){
 			this.SwitchClass(ArtMixSettingElements[i], "ArtMixFormClosed","ArtMixFormOpen");
 			ArtMixSettingElements[i].style.transitionDelay = (4+i)/20 + "s";
 		}
 		//lines form
		setTimeout(this.PopulateArtMixlines, 990);
		this.settingsOpen = true;
	}else{
		//closing
 		this.SwitchClass(document.getElementById("ArtMixLeftX"), "flat","left");
 		this.SwitchClass(document.getElementById("ArtMixRightX"), "flat","right");
 		this.SwitchClass(document.getElementById("ArtMixTopX"), "flat","top");
 		this.SwitchClass(document.getElementById("ArtMixBottomX"), "flat","bottom");
 		this.SwitchClass(document.getElementById("ArtMixSettings"), "ArtMixSettingsOpen","ArtMixSettingsClosed");
 		this.SwitchClass(document.getElementById("ArtMixlines"), "ArtMixlinesOpen","ArtMixlinesClosed");
 		this.SwitchClass(document.getElementById("ArtMixDownload"), "ArtMixFormOpen","ArtMixFormClosed");
 		this.SwitchClass(document.getElementById("ArtMixTime"), "ArtMixFormOpen","ArtMixFormClosed");
 		this.SwitchClass(document.getElementById("ArtMixDiff"), "ArtMixFormOpen","ArtMixFormClosed");
 		this.SwitchClass(document.getElementById("ArtMixRestore"), "ArtMixFormOpen","ArtMixFormClosed");
 		var ArtMixSettingElements = document.querySelectorAll(".ArtMixSettingForm");
 		for(var i = 0; i< ArtMixSettingElements.length; ++i){
 			ArtMixSettingElements[i].style.transitionDelay = "0s";
 			this.SwitchClass(ArtMixSettingElements[i], "ArtMixFormOpen","ArtMixFormClosed");
 		}
 		//lines form
 		document.getElementById("ArtMixlines").innerHTML = "";
		this.settingsOpen = false;
	}
}

ArtMix.prototype.SwitchClass = function (element, oldClass, newClass){
	// helper class to swap classes on an element, since I can't use jQuery

	if(element.getAttribute("class").search(oldClass) >= 0){
		element.setAttribute("class", element.getAttribute("class").replace(oldClass,newClass));
	}else{
		element.setAttribute("class", element.getAttribute("class") + " " + newClass);
	}
}

ArtMix.prototype.AddClass = function (element, className){
	// helper class to add classes to an element, since I can't use jQuery
	if( element.getAttribute("class").indexOf(className) < 0){
		element.setAttribute("class", element.getAttribute("class") + " " + className);
	}
}

ArtMix.prototype.RemoveClass = function (element, className){
	// helper class to remove classes from an element, since I can't use jQuery
	element.setAttribute("class", element.getAttribute("class").replace(className, ""));
}

ArtMix.prototype.isNumber = function(n){
  return !isNaN(parseFloat(n)) && isFinite(n);
}

ArtMix.prototype.downloadConfig = function (){
	// But it's the first way I thought of to get the settings from the data without creating a file on the server
	var output = "/* **** Save this as \"config.js\" in the artmix directory *****/    \nvar Settings = " + JSON.stringify(this.Settings) + ";\nvar LinesAndTimes = " + JSON.stringify(this.LinesAndTimes) +";";
	window.open('data:text/html;charset=utf-8,' + encodeURIComponent( output ));
}
