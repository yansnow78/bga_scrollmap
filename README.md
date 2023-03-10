# bga_scrollmap
Improved version of scrollmap used in multiple bga game

# improvements
- add zoom capabilities 
- add possibility to adjust pan delta to tile size when clicking on arrows
- allow zoom with scroll wheel
- allow pan/scrool and pinch zoom on smartphone
- make clickable area of buttons a bit bigger on smartphone
- zooming with buttons doesn't drift the board anymore
- improve animation between game board and player bards tanks to an animation_div
- add support to long click on buttons (continuous scroll or zoom or enlarge/reduce until button released)
- add possibility to select which key need to be pressed when zooming with wheel
- only allow 2 fingers scrolling by default, one finger is for page scrolling
- only allow zoom with wheel if alt or ctrl or shift are pressed by default, wheel+no key pressed scroll the page as usual.

# usage
```javascript
return declare("mygame", [ebg.core.gamegui, ebg.core.core_patch], {
constructor: function () {
  ...
  this.scrollmap = new ebg.scrollmapWithZoom(); // Scrollable area
  this.scrollmap.zoom = 0.8;
  ...
}

setup: function (gamedatas) {
  ...
  /*
    Create scrollmap
  */
  const scrollmapCreateExtra = (scrollmap) => {
    dojo.place(dojo.eval("jstpl_map_onsurface"), scrollmap.onsurface_div);
    dojo.place(dojo.eval("jstpl_map_clipped"), scrollmap.clipped_div);
    scrollmap.zoomChangeHandler = this.handleMapZoomChange.bind(this);
  };
  this.scrollmap.createCompletely($('map_container'), this, scrollmapCreateExtra);

  /*
    Make map draggable, scrollable and zoomable
  */
  this.scrollmap.bEnableZooming = true;
  this.scrollmap.bEnableLongPress = true;
  this.scrollmap.setupOnScreenArrows(this.tile_size, true);
  this.scrollmap.minZoom = 0.2;
  this.scrollmap.setupOnScreenZoomButtons(0.2);
  this.scrollmap.setupOnScreenResetButtons();
  this.scrollmap.setupEnlargeReduceButtons(300, true, 300);}
  ...
}
```

