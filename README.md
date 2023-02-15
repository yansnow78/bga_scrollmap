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
- 
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
  this.scrollmap.bEnablePinchZooming = true;
  this.scrollmap.bEnableWheelZooming = true;
  this.scrollmap.bEnableLongPress = true;
  this.scrollmap.setupOnScreenArrows(this.tile_size, true);
  this.scrollmap.minZoom = 0.2;
  this.scrollmap.setupOnScreenZoomButtons(0.2);
  this.scrollmap.setupOnScreenResetButtons();
  this.scrollmap.setupEnlargeReduceButtons(300, true, 300);}
  ...
}
```

