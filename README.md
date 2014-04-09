Artmix v 0.1
======

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