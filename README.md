# bga_scrollmap
Improved version of scrollmap used in multiple bga game

# improvements
- add zoom capabilities 
- add possibility to adjust pan delta to tile size when clicking on arrows
- allow zoom with scroll wheel
- allow pan/scrool and pinch zoom on smartphone
- allow control of scrollmap with keys
- make clickable area of buttons a bit bigger on smartphone
- zooming with buttons doesn't drift the board anymore
- improve animation between game board and player bards tanks to an animation_div
- add support to long click on buttons (continuous scroll or zoom or enlarge/reduce until button released)
- add possibility to select which key need to be pressed when zooming with wheel
- only allow 2 fingers scrolling by default, one finger is for page scrolling
- only allow zoom with wheel if alt or ctrl or shift are pressed by default, wheel+no key pressed scroll the page as usual.
- keep in memory zoom, pos for each game table between sessions via localStore
- adapt height automatically when bAdaptHeightAuto is set
- allow tooltips on any scrollmap layer
- ...

# usage in bga
you need to copy to moudles/js or modules all the js files (currently core_patch_slideto.js, scrollmapWithZoom.js et long-press-event.js) from the main directory

in tpl file:
```html
<div id="map_container" class="scrollmap_container">
</div>
```

in your css file
```css
#map_container {
  position: relative;
  width: 100%;
  height: 600px;
}
```

in your js file
```
  settings you can change :
	zoom, maxZoom, minZoom, defaultZoom, zoomPinchDelta, zoomWheelDelta, zoomDelta, bEnableZooming, zoomingOptions, zoomChangeHandler
	scrollDelta, bScrollDeltaAlignWithZoom, bEnableScrolling, crollingOptions
	minHeight, incrHeightDelta, incrHeightKeepInPos, bAdaptHeightAuto, adaptHeightCorr
```

```javascript
define([
    ...
        "./modules/scrollmapWithZoom",
],
```
```javascript
setup: function (gamedatas) {
  ...
  this.scrollmap = new ebg.scrollmapWithZoom(); // Scrollable area
  this.scrollmap.zoom = 0.8;

  this.scrollmap.createCompletely($('map_container'));

  // if needed
  //scrollable elements above surface that you can click
  dojo.place(dojo.eval("jstpl_map_onsurface"), this.scrollmap.onsurface_div);
  //elements fix on the scrollmap
  // if you wnat that they also zoom, add class="scrollmap_zoomed" style="transform-origin: 0px 0px;">
  dojo.place(dojo.eval("jstpl_map_clipped"), this.scrollmap.clipped_div);
  //scrollable elements below surface you can not click
  dojo.place(dojo.eval("jstpl_map_scrollable"), this.scrollmap.scrollable_div);
}
```
alternative
```javascript
setup: function (gamedatas) {
  ...
  this.scrollmap = new ebg.scrollmapWithZoom(); // Scrollable area
  this.scrollmap.zoom = 0.8;

  this.scrollmap.create( $('map_container'),$('map_scrollable'),$('map_surface'),$('map_scrollable_oversurface') );

}
```
```javascript
setup: function (gamedatas) {
  ...
  // if needed
  const scrollmapCreateExtra = (scrollmap) => {
    //scrollable elements above surface that you can click
    dojo.place(dojo.eval("jstpl_map_onsurface"), scrollmap.onsurface_div);
    //elements fix on the scrollmap
    // if you wnat that they also zoom, add class="scrollmap_zoomed" style="transform-origin: 0px 0px;">
    dojo.place(dojo.eval("jstpl_map_clipped"), scrollmap.clipped_div);
  //scrollable elements below surface you can not click
    dojo.place(dojo.eval("jstpl_map_scrollable"), scrollmap.scrollable_div);
  };

  this.scrollmap = new ebg.scrollmapWithZoom(); // Scrollable area
  this.scrollmap.zoom = 0.8;

  this.scrollmap.createCompletely($('map_container'), this, scrollmapCreateExtra);
}
```

This project is tested with BrowserStack.
