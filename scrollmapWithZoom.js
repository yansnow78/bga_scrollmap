/* Scrollmap: a scrollable map
 *
 * Code by yannsnow
 * */

define([
    "dojo", "dojo/_base/declare" , "./long-press-event"
],
    function (dojo, declare) {
        return declare("ebg.scrollmapWithZoom", null, {
            constructor: function () {
                this.board_x = 0;
                this.board_y = 0;
                this.defaultPosition = null; //{x: 0,y: 0};
                
                // set via create
                this.container_div = null;
                this.scrollable_div = null;
                this.surface_div = null;
                this.onsurface_div = null;
                this.clipped_div = null;
                this.animation_div = null;
                this.btnInfo = null;
                this.page = null;

                // zoom properties
                this.zoom = 1;
                this.maxZoom = 2;
                this.minZoom = 0.1;
                this.defaultZoom = null;
                this._prevZoom = 1;
                this.zoomPinchDelta = 0.005;
                this.zoomWheelDelta = 0.001;
                this.wheelZoomingKeys = {
                    Disabled: 0,
                    Any: 1, 
                    None: 2,
                    Ctrl: 4,
                    Alt: 8,
                    Shift: 16,
                    AnyOrNone: 32
                  };
                this.zoomingOptions = {wheelZoming: this.wheelZoomingKeys.Any, pinchZooming:true};
                this.zoomChangeHandler = null;
                this._bEnableZooming = false;
                Object.defineProperty(this, 'bEnableZooming', {
                    get() {
                      return this._bEnableZooming;
                    },
                    set(value) {
                        this._bEnableZooming = value;
                        if (!this.container_div)
                            return;
                        var warning_touch =  _("Use two fingers to begin moving the board. ");
                        if (this._bEnableZooming)
                            warning_touch += _("Pinch fingers to zoom");
                        this.container_div.setAttribute("warning_touch", warning_touch);
                        this.container_div.setAttribute("warning_scroll", _("Use ctrl or alt or shift + scroll to zoom the board"));
                        if (this.btnInfo && (this.btnInfo.style.display== 'block')){
                            this.setInfoButtonTooltip();
                        }
                    }
                });

                // scroll properties
                this.bEnableScrolling = true;
                this.scrollingOptions = {oneFingerScrolling: false};
                this.bScrollDeltaAlignWithZoom = true;
                this.scrollDelta = 0;
                this._scrollDeltaAlignWithZoom = 0;

                // buttons properties
                this.bEnableLongPress = true;

                // internal private properties
                this._pointers = new Map();
                this._classNameSuffix = '';
                this._longPress =  null;
                this._bEnlargeReduceButtonsInsideMap=false;
                this._resizeObserver = null;
                if (typeof ResizeObserver !== 'undefined')
                    this._resizeObserver = new ResizeObserver(this.onResize.bind(this));
                this._onpointermove_handler = this.onPointerMove.bind(this);
                this._onpointerup_handler = this.onPointerUp.bind(this);
                this._onpointerup_handled=false;
                this._interacting = false;
                this._setupDone = false;
                this._bConfigurableInUserPreference = false;
                this._btnMoveRight = null;
                this._btnMoveLeft = null;
                this._btnMoveTop = null;
                this._btnMoveDown = null;
                this._btnZoomPlus = null;
                this._btnZoomMinus = null;
                this._btnZoomPlusNames = 'zoomplus,zoom_plus,zoomin,zoom_in';
                this._btnZoomMinusNames = 'zoomminus,zoom_minus,zoomout,zoom_out';
                this._btnReset = null;
                this._btnResetNames = 'reset,back_to_center,reset_map,map_reset';
                this._btnBackToCenter = null;
                this._btnIncreaseHeight = null;
                this._btnDecreaseHeight = null;
                /* Feature detection */

                // Test via a getter in the options object to see if the passive property is accessed
                let passiveEventListener = false;
                let notPassiveEventListener = false;
                try {
                    var opts = Object.defineProperty({}, 'passive', {
                        get: function() {
                            passiveEventListener = { passive: true };
                            notPassiveEventListener = { passive: false };
                            return true;
                        }
                    });
                    window.addEventListener("testPassive", null, opts);
                    window.removeEventListener("testPassive", null, opts);
                    this.passiveEventListener = passiveEventListener;
                    this.notPassiveEventListener = notPassiveEventListener;
                } catch (e) {/**/}
            },

            create: function (container_div, scrollable_div, surface_div, onsurface_div, clipped_div=null, animation_div=null, page=null, create_extra=null) {
                console.log("ebg.scrollmapWithZoom create");

                container_div.classList.add("scrollmap_container");
                if (this.scrollable_div)
                    scrollable_div.classList.add("scrollmap_scrollable");
                if (this.surface_div)
                    surface_div.classList.add("scrollmap_surface");
                if (this.onsurface_div)
                    onsurface_div.classList.add("scrollmap_onsurface");
                if (this.clipped_div)
                    clipped_div.classList.add("scrollmap_overflow_clipped");
                this.page = page;
                this.container_div = container_div;
                this.scrollable_div = scrollable_div;
                this.surface_div = surface_div;
                this.onsurface_div = onsurface_div;
                this.clipped_div = clipped_div;
                this.animation_div = animation_div;

                var styleElt = document.createElement("style");
                if (!$("css-scrollmap")){
                    const css = String.raw;
                    const styleSheetContent = css`

                        @keyframes scrollmap_warning_fadein {
                            0% {
                            opacity: 0; }
                            100% {
                            opacity: 1; } }

                        :root {
                            --scrollmap_zoomed_transform: ;
                            --z_index_anim: 10;
                        }

                        .scrollmap_container {
                            z-index: var(--z_index_anim);
                            touch-action: initial !important;
                        }

                        .scrollmap_container *{
                            touch-action: unset !important;
                        }

                        .scrollmap_overflow_clipped {
                            position: relative;
                            width: 100%;
                            height: 100%;
                            overflow: hidden;
                        }

                        .scrollmap_scrollable, .scrollmap_onsurface, .scrollmap_anim {
                            position: absolute;
                        }

                        .scrollmap_surface {
                            position: absolute;
                            top: 0px;
                            left: 0px;
                            width: 100%;
                            height: 100%;
                            cursor: move;
                        }

                        .scrollable_oversurface {
                            pointer-events: none;
                        }

                        .scrollable_oversurface > *{
                            pointer-events: initial;
                        }

                        .scrollmap_zoomed{
                            transform: var(--scrollmap_zoomed_transform);
                        }

                        .scrollmap_container:after {
                            animation: scrollmap_warning_fadein 0.8s backwards;
                            color: #fff;
                            font-family: "Roboto", Arial, sans-serif;
                            font-size: 22px;
                            justify-content: center;
                            display: flex;
                            align-items: center;
                            padding: 15px;
                            position: absolute;
                            top: 0;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            background: rgba(0, 0, 0, 0.5);
                            z-index: 461;
                            pointer-events: none; 
                        }

                        .scrollmap_warning_touch:after,
                        .scrollmap_warning_scroll:after {
                                animation: scrollmap_warning_fadein 0.8s forwards; }

                        .scrollmap_warning_touch:after {
                        content: attr(warning_touch); }

                        .scrollmap_warning_scroll:after {
                        content: attr(warning_scroll); }

                        .scrollmap_container.enable_zoom_interaction.enable_pan_interaction {
                            touch-action: none !important;
                        }
                        .scrollmap_container.enable_zoom_interaction {
                            touch-action: pan-x pan-y !important;
                        }
                        .scrollmap_container.enable_pan_interaction {
                        	/* Fallback for FF which doesn't support pinch-zoom */
                        	touch-action: none !important;
                            touch-action: pinch-zoom !important;
                        }
                        .scrollmap_btn_disabled {
                            filter: brightness(70%);
                            opacity: 0.3;
                            cursor: not-allowed !important;
                            pointer-events: none;
                        }`;
                    // styleElt.type = "text/css";
                    styleElt.id = 'css-scrollmap';
                    styleElt.appendChild(document.createTextNode(styleSheetContent));
                    document.head.appendChild(styleElt);
                }
                if (create_extra !== null)
                    create_extra(this);

                var onPointerDown =this.onPointerDown.bind(this);
                if (window.PointerEvent)
                    this.surface_div.addEventListener('pointerdown', onPointerDown, this.passiveEventListener);
                else {
                    this.surface_div.addEventListener('mousedown', onPointerDown, this.passiveEventListener);
                    this.surface_div.addEventListener('touchstart', onPointerDown, this.passiveEventListener);
                }

                this.container_div.addEventListener('wheel', this.onWheel.bind(this), this.notPassiveEventListener);
                var _handleTouch=this._handleTouch.bind(this);
                this.container_div.addEventListener("touchstart", _handleTouch, this.passiveEventListener );
                this.container_div.addEventListener("touchmove", _handleTouch, this.notPassiveEventListener);
                document.addEventListener("touchend", _handleTouch, this.passiveEventListener );
                document.addEventListener("touchcancel", _handleTouch, this.passiveEventListener );

                this.bEnableZooming = this._bEnableZooming;
                if (this.defaultZoom === null)
                    this.defaultZoom=this.zoom;
                this.setMapZoom(this.zoom);
                this.scrollto(0, 0, 0, 0);
                if  (this._resizeObserver)
                    this._resizeObserver.observe(this.container_div);

                this.setupOnScreenArrows(100, true);
                this.setupOnScreenZoomButtons(0.2);
                this.setupOnScreenResetButtons();
                this.setupEnlargeReduceButtons(100, true, 300);
                this.setupInfoButton();
            },

            createCompletely: function (container_div, page=null, create_extra=null, bEnlargeReduceButtonsInsideMap=true) {
                console.log("createCompletely");
                const LABEL_ENLARGE_DISPLAY = _("Enlarge display");
                const LABEL_REDUCE_DISPLAY = _("Reduce display");
                this._bEnlargeReduceButtonsInsideMap = bEnlargeReduceButtonsInsideMap;

                var tmplDisplayButtons = String.raw`
                    <a class="scrollmap_enlargedisplay">↓  ${LABEL_ENLARGE_DISPLAY}  ↓</a>
                    <a class="scrollmap_reducedisplay">↑ ${LABEL_REDUCE_DISPLAY} ↑</a>
                `;
                var info_id=container_div.id +"_info";

                var tmpl = String.raw`
                    <div class="scrollmap_overflow_clipped">
                        <div class="scrollmap_scrollable"></div>
                        <div class="scrollmap_surface" ></div>
                        <div class="scrollmap_onsurface"></div>
                    </div>
                    <i class="scrollmap_movetop fa fa-chevron-up scrollmap_icon"></i>
                    <i class="scrollmap_moveleft fa fa-chevron-left scrollmap_icon"></i>
                    <i class="scrollmap_moveright fa fa-chevron-right scrollmap_icon"></i>
                    <i class="scrollmap_movedown fa fa-chevron-down scrollmap_icon"></i>
                    <i class="scrollmap_zoomplus fa fa-search-plus scrollmap_icon"></i>
                    <i class="scrollmap_zoomminus fa fa-search-minus scrollmap_icon"></i>
                    <i class="scrollmap_reset fa fa-refresh scrollmap_icon"></i>
                    <i id=${info_id} class="scrollmap_info fa fa-info scrollmap_icon"></i>
                    ${bEnlargeReduceButtonsInsideMap?tmplDisplayButtons:``}
                    <div class="scrollmap_anim"></div>
                `;
                this._classNameSuffix = 'scrollmap_';
                container_div.innerHTML = tmpl;
                this.btnInfo = $(info_id);
                var scrollable_div = container_div.querySelector('.scrollmap_scrollable');
                var surface_div = container_div.querySelector('.scrollmap_surface');
                var onsurface_div = container_div.querySelector('.scrollmap_onsurface');
                var clipped_div = container_div.querySelector('.scrollmap_overflow_clipped');
                var animation_div = container_div.querySelector('.scrollmap_anim');

                if (!bEnlargeReduceButtonsInsideMap){
                    tmpl = String.raw`
                    <div id="${container_div.id}_footer" class="whiteblock scrollmap_footer">
                        ${tmplDisplayButtons}
                    </div>`;
                    var parent = container_div.parentNode;
                    var tmplNode = document.createElement("div");
                    if(parent){
                        parent.insertBefore(tmplNode, container_div);
                    }
                    tmplNode.outerHTML = tmpl;
                }

                this.create(container_div, scrollable_div, surface_div, onsurface_div, clipped_div, animation_div, page, create_extra);
            },

            _init: function () {
            },

            onResize: function () {
                if (!this._setupDone) {
                    console.log("1st onResize after setup");
                    this.scrollToCenter();
                } else 
                    this.scrollto(this.board_x, this.board_y, 0, 0);
                this._setupDone = true;
            },

            _updatePointers: function (event) {
                var prevEv;
                if (event.changedTouches) { // TouchEvent
                    Array.from(event.changedTouches).forEach( touch => {
                        const id =  touch.identifier;
                        prevEv = this._pointers.get(id);
                        this._pointers.set(id, touch);
                    });
                    return prevEv; 
                } else {
                    const id =  (event.pointerId) ? event.pointerId : 0;
                    prevEv = this._pointers.get(id);
                    this._pointers.set(id, event);
                    return prevEv;
                } 
            },

            _removePointers: function (event) {
                if (event.changedTouches) { // TouchEvent
                    Array.from(event.changedTouches).forEach( touch => {
                        const id =  touch.identifier;
                        this._pointers.delete(id, touch);
                    });
                } else {
                    const id =  (event.pointerId) ? event.pointerId : 0;
                    this._pointers.delete(id);
                } 
            },

            _getPageZoom: function () {
                var pageZoom = 1;
                if  ((this.page === null) || (typeof this.page.gameinterface_zoomFactor === 'undefined' ))  {
                    var pageZoomStr = $("page-content").style.getPropertyValue("zoom");
                    pageZoom = 1;
                    if (pageZoomStr !== "")
                        pageZoom=parseFloat($("page-content").style.getPropertyValue("zoom"));
                } else
                    pageZoom = this.page.gameinterface_zoomFactor;
                return pageZoom;
            },

            _getXYCoord: function (ev, ev2) {
                var clientX = ev.clientX;
                var clientY = ev.clientY;
                if (typeof ev2 !== 'undefined') {
                    clientX = (clientX + ev2.clientX) / 2;
                    clientY = (clientY + ev2.clientY) / 2;
                }
                const pageZoom = this._getPageZoom();
                var x, y;
                if ((this.page !== null) && (typeof this.page.calcNewLocation === "function")) {
                    [,,x, y]= this.page.calcNewLocation(this.surface_div, null, clientX/pageZoom, clientY/pageZoom, false, true);
                } else {
                    const containerRect = this.container_div.getBoundingClientRect();
                    x = (clientX/pageZoom - containerRect.x - containerRect.width / 2);
                    y = (clientY/pageZoom - containerRect.y - containerRect.height / 2);
                }
                return [x, y];
            },

            _enableInteractions: function() {
                if (this._bEnableZooming && this.zoomingOptions.pinchZooming)
                    this.container_div.classList.add("enable_zoom_interaction");
                if (this.bEnableScrolling)
                    this.container_div.classList.add("enable_pan_interaction");
                // if (this.zoomingOptions.pinchZooming)
                //     this.container_div.style.touchAction = "none";
                // else
                //     this.container_div.style.touchAction = "pinch-zoom";
            },


            _disableInteractions: function() {
                this.container_div.classList.remove("enable_zoom_interaction");
                this.container_div.classList.remove("enable_pan_interaction");
                // this.container_div.style.touchAction = "auto";
            },

            _getTouchesDist: function(e) {
                if (e.touches.length==1)
                    return 0;
                else
                    return Math.hypot(
                        e.touches[0].clientX - e.touches[1].clientX,
                        e.touches[0].clientY - e.touches[1].clientY
                    );
            },

            _getTouchesMiddle: function(e) {
                if (e.touches.length==1)
                    return new DOMPoint(e.touches[0].clientX , e.touches[0].clientY);
                else
                    return new DOMPoint(
                        (e.touches[0].clientX + e.touches[1].clientX)/2,
                        (e.touches[0].clientY + e.touches[1].clientY)/2
                    );
            },

            _handleTouch: function (e) {
                // var i, touch;
                if (e.type !== "touchmove" && e.type !== "touchstart"){
                    // if (e.touches.length === 1 && !(this.bEnableScrolling && this.scrollingOptions.oneFingerScrolling)) {
                    //     this._interacting = true;
                    //     console.log(e.touches.length);
                    // }
                    if (e.touches.length === 0)
                        this._interacting = false;
                    //console.log(e.touches.length);
                }
                if ((e.type !== "touchmove" && e.type !== "touchstart") || 
                   !((this.bEnableScrolling) || (this._bEnableZooming   && this.zoomingOptions.pinchZooming)))
                {
                    this._disableInteractions();
                    this.container_div.classList.remove("scrollmap_warning_touch");
                    return;
                }
                if (e.type === "touchstart") {
                    this._prevTouchesDist = this._getTouchesDist(e);
                    this._prevTouchesMiddle = this._getTouchesMiddle(e);
                    //this._firstTouchMove = true;
                    if (e.touches.length === 1)
                        this._interacting = false;
                    this._gestureStart = true;
                    Array.from(e.touches).forEach( touch => {
                        if (!this.container_div.contains(touch.target))
                            this._gestureStart = false;
                    });                    
                    // if (!this._gestureStart)
                    //     console.log( this._gestureStart, e.touches.length, e.targetTouches.length);
                    // const date = Date.now();
                    // let currentDate = null;
                    // do {
                    //     currentDate = Date.now();
                    // } while (currentDate - date < 40);
                }
                if (e.type === "touchmove")  {
                    if (this._interacting) {
                        // this._enableInteractions();
                        // e.stopImmediatePropagation();
                        e.preventDefault();
                    } else if (e.touches.length === 1 && !(this.bEnableScrolling && this.scrollingOptions.oneFingerScrolling)) {
                        this._disableInteractions();
                        this.container_div.classList.add("scrollmap_warning_touch");
                    } else {
                        if (this._gestureStart) {
                            this._gestureStart = false;
                            this._interacting = true;
                            e.preventDefault();
                            //this._firstTouchMove = false;
                            // var touchesMiddle = this._getTouchesMiddle(e);
                            // var scrollX = Math.abs(touchesMiddle.x-this._prevTouchesMiddle.x);
                            // var scrollY = Math.abs(touchesMiddle.y-this._prevTouchesMiddle.y);
                            // var touchesDist = this._getTouchesDist(e);
                            // var touchesDistDiff = Math.abs(touchesDist-this._prevTouchesDist);
                            // var zooming = /* touchesDistDiff > 5 &&  */((scrollX + scrollY)<touchesDistDiff);
                            // // var scrolling = /* (scrollX + scrollY) > 5 &&  */(5*(scrollX + scrollY)>touchesDistDiff);
                            // var scrolling = /* (scrollX + scrollY) > 5 &&  */(Math.hypot(scrollX + scrollY)>touchesDistDiff);
                            //  console.log("touchmove", scrollX+scrollY, scrolling, "   ", touchesDistDiff, zooming);
                        //     if ((scrolling && this.bEnableScrolling) || 
                        //         (zooming && this._bEnableZooming && this.zoomingOptions.pinchZooming)) {
                        //         this.container_div.classList.remove("scrollmap_warning_touch");
                        //         this._interacting = true;
                        //         console.log('start interacting');
                        //     }
                            this._enableInteractions();
                            // e.stopImmediatePropagation();
                            // e.preventDefault();
                        }
                        // console.log(this._interacting);
                        //this._prevTouchesDist = touchesDist;
                        //this._prevTouchesMiddle = touchesMiddle;
                    }
                }
            },

            onPointerDown: function (ev) {
                // ev.preventDefault();
                if (!this.bEnableScrolling && !(this._bEnableZooming   && this.zoomingOptions.pinchZooming))
                    return;
                if ((ev.pointerType =="mouse") && (ev.button != 0)) //for mouse only accept left button
                    return;

                if (this._onpointerup_handled == false) {
                    this._onpointerup_handled = true;
                    if (window.PointerEvent) {
                        document.addEventListener( "pointermove", this._onpointermove_handler/* , this.passiveEventListener */);
                        document.addEventListener( "pointerup", this._onpointerup_handler, this.passiveEventListener);
                        document.addEventListener( "pointercancel", this._onpointerup_handler, this.passiveEventListener);
                    } else {
                        document.addEventListener( "mousemove", this._onpointermove_handler, this.passiveEventListener);
                        document.addEventListener( "touchmove", this._onpointermove_handler, this.passiveEventListener);
                        document.addEventListener( "mouseup", this._onpointerup_handler, this.passiveEventListener);
                        document.addEventListener( "touchend", this._onpointerup_handler, this.passiveEventListener);
                        document.addEventListener( "touchcancel", this._onpointerup_handler, this.passiveEventListener);
                    }
                }
                this._updatePointers(ev);
            },

            onPointerMove: function (ev) {
                console.log("pointer move");
                const prevEv = this._updatePointers(ev);

                // If one pointer is move, drag the map
                if (this._pointers.size === 1) {
                    if (!this.bEnableScrolling || 
                        ((ev.pointerType =='touch' || ev.changedTouches) && !this._interacting))
                        return;

                    if ((typeof prevEv !== 'undefined')) {
                        const [x, y] = this._getXYCoord(ev);
                        const [xPrev, yPrev] = this._getXYCoord(prevEv);
                        this.scroll(x - xPrev, y - yPrev, 0, 0);
                    }
                    ev.preventDefault();
                }
                // If two _pointers are move, check for pinch gestures
                else if (this._pointers.size === 2) {

                    // Calculate the distance between the two _pointers
                    const it = this._pointers.values();
                    const ev1 = it.next().value;
                    const ev2 = it.next().value;
                    const curDist = Math.sqrt(
                        Math.pow(Math.abs(ev2.clientX - ev1.clientX), 2) +
                        Math.pow(Math.abs(ev2.clientY - ev1.clientY), 2)
                    );
                    const [x, y] = this._getXYCoord(ev1, ev2);
                    // console.log(x, y);
                    if (this._prevDist > 0.0) {
                        // const diff = curDist - this._prevDist;
                        // newZoom = this.zoom * (1 + this.zoomPinchDelta * diff);
                        const newZoom = this.zoom * (curDist / this._prevDist);
                        if (this._bEnableZooming && this.zoomingOptions.pinchZooming)
                            this.setMapZoom(newZoom, x, y);
                        if (this.bEnableScrolling)
                            this.scroll(x - this._xPrev, y - this._yPrev, 0, 0);
                    }

                    // Cache the distance for the next move event
                    this._prevDist = curDist;
                    this._xPrev = x;
                    this._yPrev = y;
                    ev.preventDefault();
                }
            },

            onPointerUp: function (ev) {
                this._removePointers(ev);
                // If no pointer left, stop drag or zoom the map
                if (this._pointers.size === 0) {
                    this._onpointerup_handled = false;
                    if (window.PointerEvent) {
                        document.removeEventListener( "pointermove", this._onpointermove_handler/* , this.passiveEventListener */);
                        document.removeEventListener( "pointerup", this._onpointerup_handler, this.passiveEventListener);
                        document.removeEventListener( "pointercancel", this._onpointerup_handler, this.passiveEventListener);
                    } else {
                        document.removeEventListener( "mousemove", this._onpointermove_handler, this.passiveEventListener);
                        document.removeEventListener( "touchmove", this._onpointermove_handler, this.passiveEventListener);
                        document.removeEventListener( "mouseup", this._onpointerup_handler, this.passiveEventListener);
                        document.removeEventListener( "touchend", this._onpointerup_handler, this.passiveEventListener);
                        document.removeEventListener( "touchcancel", this._onpointerup_handler, this.passiveEventListener);
                    }
                }

                // If the number of _pointers down is less than two then reset diff tracker
                if (this._pointers.size < 2) {
                    this._prevDist = -1;
                }

            },

            onWheel: function (evt) {
                if (!this._bEnableZooming)
                    return;
                var wheelZoom = true;
                switch (this.zoomingOptions.wheelZoming) {
                    // Zoom with scroll wheel
                    case this.wheelZoomingKeys.Disabled:
                        wheelZoom = false;
                        return;

                    case this.wheelZoomingKeys.None:
                        wheelZoom = !(evt.ctrlKey || evt.altKey || evt.metaKey || evt.shiftKey);
                        break;

                    case this.wheelZoomingKeys.AnyOrNone:
                        break;

                    case this.wheelZoomingKeys.Any:
                        wheelZoom = (evt.ctrlKey || evt.altKey || evt.metaKey || evt.shiftKey);
                        break;
                        
                    case this.wheelZoomingKeys.Ctrl:
                        wheelZoom = evt.ctrlKey;
                        break;

                    case this.wheelZoomingKeys.Shift:
                        wheelZoom = evt.shiftKey;
                        break;

                    case this.wheelZoomingKeys.Alt:
                        wheelZoom = evt.altKey;
                        break;

                    // case this.wheelZoomingKeys.Meta:
                    //     if (evt.metaKey)
                    //         break;
                    //     return;
            
                    }
                if (!wheelZoom){
                    clearTimeout(this._isScrolling);
                    // Set a timeout to run after scrolling ends
                    this._isScrolling = setTimeout( () => {
                        this.container_div.classList.remove("scrollmap_warning_scroll");
                    }, 1000);

                    this.container_div.classList.add("scrollmap_warning_scroll");
                    return;
                }
                this.container_div.classList.remove("scrollmap_warning_scroll");
                evt.preventDefault();
                const [x, y] = this._getXYCoord(evt);
                // console.log("onwheel", evt.clientX, evt.clientY, x, y);
                this.changeMapZoom(evt.deltaY * -this.zoomWheelDelta, x, y);
            },

            scroll: function (dx, dy, duration, delay) {
                // console.log("scroll", this.board_x, dx, this.board_y, dy);
                this.scrollto(this.board_x + dx, this.board_y + dy, duration, delay);
            },
            
            // Scroll the board to make it centered on given position
            scrollto: function (x, y, duration, delay) {
                // console.log("scrollto", this.board_x, this.board_y);
                if (typeof duration == 'undefined') {
                    duration = 350; // Default duration
                }
                if (typeof delay == 'undefined') {
                    delay = 0; // Default delay
                }
                if (!this._setupDone) {
                    duration =0; delay=0;
                }
                const s = window.getComputedStyle(this.container_div);
                const width = parseFloat(s.width);
                const height = parseFloat(s.height);

                const board_x = toint(x + width / 2);
                const board_y = toint(y + height / 2);

                this.board_x = x;
                this.board_y = y;

                if ((duration == 0) && (delay == 0)) {
                    if (this.animation_div!==null){
                        this.animation_div.style.left =  board_x + "px";
                        this.animation_div.style.top =  board_y + "px";
                    }
                    this.scrollable_div.style.left =  board_x + "px";
                    this.onsurface_div.style.left =  board_x + "px";
                    this.scrollable_div.style.top =  board_y + "px";
                    this.onsurface_div.style.top =  board_y + "px";
                    // dojo.body().style.backgroundPosition =  board_x+"px "+board_y+"px" ;
                    return;
                }
                var anim1 = dojo.fx.slideTo({
                    node: this.scrollable_div,
                    top: board_y,
                    left: board_x,
                    unit: "px",
                    duration: duration,
                    delay: delay
                });
                var anim2 = dojo.fx.slideTo({
                    node: this.onsurface_div,
                    top: board_y,
                    left: board_x,
                    unit: "px",
                    duration: duration,
                    delay: delay
                });
                var anims = null;
                if (this.animation_div!==null){
                    var anim3 = dojo.fx.slideTo({
                        node: this.animation_div,
                        top: board_y,
                        left: board_x,
                        unit: "px",
                        duration: duration,
                        delay: delay
                    });
                    anims = [anim1,anim2,anim3];
                } else
                    anims = [anim1,anim2];
                var anim = dojo.fx.combine(anims);
                anim.play();
            },

            // Scroll map in order to center everything
            // By default, take all elements in movable_scrollmap
            //  you can also specify (optional) a custom CSS query to get all concerned DOM elements
            scrollToCenter: function (custom_css_query,  duration, delay) {
                const center = this.getMapCenter(custom_css_query);
                this.scrollto(-center.x * this.zoom, -center.y * this.zoom, duration, delay);
                console.log("scrollToCenter",center.x, center.y);
                return {
                    x: -center.x,
                    y: -center.y
                };
            },

            getMapCenter: function (custom_css_query) {
                if (custom_css_query)
                    this._custom_css_query = custom_css_query;
                // Get all elements inside and get their max x/y/w/h
                var max_x = 0;
                var max_y = 0;
                var min_x = 0;
                var min_y = 0;

                var css_query = ":scope > *";
                var css_query_div = this.scrollable_div;
                if ((typeof this._custom_css_query != 'undefined') && (this._custom_css_query !== null)) {
                    css_query = this._custom_css_query;
                    css_query_div = document;
                }
                // console.log("getMapCenter", css_query, css_query_div);
                var scales = new Map();

                let scrollable_div = this.scrollable_div;
                function calcMaxMin(node){
                    // console.log(node);
                    let s = window.getComputedStyle(node);
                    if (s.left=="auto") {
                        Array.from(node.children).forEach((node) => {calcMaxMin(node);}); 
                        return;
                    }
                    let directParent = node.parentNode;
                    let parent = directParent;
                    let scaleTotal = scales.get(parent);
                    if (!scaleTotal){
                        scaleTotal = 1;
                        while (!parent.isEqualNode(scrollable_div)){
                            let transform = window.getComputedStyle(parent).transform;
                            let scale = 1;
                            if (transform !== "none"){
                                let matrix = new DOMMatrix(transform);
                                scale = Math.hypot(matrix.m11, matrix.m21, matrix.m31);
                            }
                            scaleTotal *= scale;
                            parent = parent.parentNode;
                        }
                        scales.set(directParent, scaleTotal);
                        // console.log("scaleTotal",scaleTotal);
                    }
                    let left = (parseFloat(s.left)  * scaleTotal) || 0; let width = (parseFloat(s.width) * scaleTotal) || (node.offsetWidth * scaleTotal);
                    max_x = Math.max(max_x, left + width);
                    min_x = Math.min(min_x, left);

                    let top = (parseFloat(s.top) * scaleTotal) || 0;  let height = (parseFloat(s.height) * scaleTotal) || (node.offsetHeight * scaleTotal);
                    max_y = Math.max(max_y, top + height);
                    min_y = Math.min(min_y, top);
                }
                css_query_div.querySelectorAll(css_query).forEach((node) => {
                    calcMaxMin(node);
                    // console.log("getMapCenter node rect",  s.left,  s.width, s.top, s.height);
                    // console.log("getMapCenter min lax",  min_x,  max_x, min_y, max_y);

                    //                alert( node.id );
                    //                alert( min_x+','+min_y+' => '+max_x+','+max_y );
                });
                var center =  {
                    x: (min_x + max_x) / 2,
                    y: (min_y + max_y) / 2
                };
                // console.log("getMapCenter",  min_x,  max_x, min_y, max_y);
                // console.log("getMapCenter",  center);

                return center;
            },

            changeMapZoom: function (diff, x = 0, y = 0) {
                const newZoom = this.zoom + diff;
                this.setMapZoom(newZoom, x, y);
            },

            setMapZoom: function (zoom, x = 0, y = 0) {
                if (zoom  >= this.maxZoom){
                    zoom = this.maxZoom;
                    if (this._btnZoomPlus)
                        this._btnZoomPlus.classList.add("scrollmap_btn_disabled");
                } else if (zoom  <= this.minZoom){
                    zoom = this.minZoom;
                    if (this._btnZoomMinus)
                        this._btnZoomMinus.classList.add("scrollmap_btn_disabled");
                } else {
                    if (this._btnZoomMinus && (this._prevZoom <= this.minZoom))
                        this._btnZoomMinus.classList.remove("scrollmap_btn_disabled");
                    if (this._btnZoomPlus && (this._prevZoom >= this.maxZoom))
                        this._btnZoomPlus.classList.remove("scrollmap_btn_disabled");
                }
                this.zoom = zoom;
                if (this._prevZoom == this.zoom)
                    return;

                if (this.bScrollDeltaAlignWithZoom)
                    this._scrollDeltaAlignWithZoom = this.scrollDelta * zoom;
                else
                    this._scrollDeltaAlignWithZoom = this.scrollDelta;
                this.setScale(this.scrollable_div, this.zoom);
                this.setScale(this.onsurface_div, this.zoom);
                if (this.animation_div!==null)
                    this.setScale(this.animation_div, this.zoom);
                this.container_div.style.setProperty("--scrollmap_zoomed_transform", `scale(${this.zoom})`);
                if (this.zoomChangeHandler)
                    this.zoomChangeHandler(this.zoom);
                const zoomDelta = this.zoom / this._prevZoom;
                //console.log(x+' '+ y+' '+ zoomDelta+' '+ this.zoom);
                this.scrollto((this.board_x * zoomDelta) + x * (1 - zoomDelta), (this.board_y * zoomDelta) + y * (1 - zoomDelta), 0, 0);
                this._prevZoom = this.zoom;
            },

            setScale: function (elemId, scale) {
                $(elemId).style.transform =  'scale(' + scale + ')';
            },

            _getButton: function (btnNames, idSuffix=""){
                btnNames = btnNames.split(",");
                for(let i in btnNames){
                    let btnName = btnNames[i];
                    var $btn = document.querySelector('#' + this.container_div.id+idSuffix + ' .'+this._classNameSuffix+btnName);
                    //console.log($btn);
                    //console.log('#' + this.container_div.id+idSuffix + ' .'+this._classNameSuffix+btnName);
                    if ($btn === null)
                        $btn = $(btnName);
                    if ($btn) {
                        console.log(btnName+" found");
                        return $btn;
                    }
                }
                console.log(btnNames+" not found");
            },

            _hideButton: function (btnName, idSuffix=""){
                var $btn = this._getButton(btnName, idSuffix);
                if ($btn === null)
                    $btn.style.display = 'none';
            },

            _showButton: function (btnName, idSuffix="", display='block'){
                var $btn = this._getButton(btnName, idSuffix);
                if ($btn === null)
                    $btn.style.display = display;
            },

            _initButton: function (btnName, onClick, onLongPressedAnim = null, idSuffix="", display='block'){
                var $btn = this._getButton(btnName, idSuffix);
                if (!$btn)
                    return null;
                onClick = onClick.bind(this);
                $btn.addEventListener( 'click', (e) => {onClick(e); e.stopImmediatePropagation();}, true);
                $btn.style.cursor =  'pointer';
                $btn.style.display =  display;
                if (this.bEnableLongPress && onLongPressedAnim != null){
                    $btn.removeAttribute("href");
                    $btn.setAttribute("data-long-press-delay", 500);
                    $btn.addEventListener('long-press', this._onButtonLongPress.bind(this,onLongPressedAnim));
                    $btn.addEventListener('long-press-end', this._onButtonLongPressEnd.bind(this));
                }
                return $btn;
            },

            //////////////////////////////////////////////////
            //// Long press handling on buttons

            _onButtonLongPress: function (onLongPressedAnim, evt) {
                // console.log("onButtonLongPress");
                this._longPressAnim = (time, anim=onLongPressedAnim) => {
                    anim();
                    if (this._longPress)
                        requestAnimationFrame(this._longPressAnim);
                };
                this._longPress = true;
                evt.preventDefault();
                requestAnimationFrame(this._longPressAnim);
            },

            _onButtonLongPressEnd: function (evt) {
                //this.onMoveTop();
                //console.log("onButtonLongPressEnd");
                this._longPress = false;
            },

            //////////////////////////////////////////////////
            //// Scroll with buttons

            // Optional: setup on screen arrows to scroll the board
            setupOnScreenArrows: function (scrollDelta, bScrollDeltaAlignWithZoom = true) {
                console.log("setupOnScreenArrows");
                this.scrollDelta = scrollDelta;
                this.bScrollDeltaAlignWithZoom = bScrollDeltaAlignWithZoom;
                if (this.bScrollDeltaAlignWithZoom)
                    this._scrollDeltaAlignWithZoom = scrollDelta * this.zoom;
                else
                    this._scrollDeltaAlignWithZoom = scrollDelta;
                if (!this._btnMoveTop)
                    this._btnMoveTop = this._initButton('movetop', this.onMoveTop, ()=> {this.scroll(0, 3, 0, 0);});
                if (!this._btnMoveDown)
                    this._btnMoveDown = this._initButton('movedown', this.onMoveDown, ()=> {this.scroll(0, -3, 0, 0);});
                if (!this._btnMoveLeft)
                    this._btnMoveLeft = this._initButton('moveleft', this.onMoveLeft, ()=> {this.scroll(3, 0, 0, 0 );});
                if (!this._btnMoveRight)
                    this._btnMoveRight = this._initButton('moveright', this.onMoveRight,()=> {this.scroll(-3, 0, 0, 0 );});
            },

            showOnScreenArrows: function () {
               this._showButton('movetop');
               this._showButton('moveleft');
               this._showButton('moveright');
               this._showButton('movedown');
            },

            hideOnScreenArrows: function () {
               this._hideButton('movetop');
               this._hideButton('moveleft');
               this._hideButton('moveright');
               this._hideButton('movedown');
            },

            onMoveTop: function (evt) {
                //console.log("onMoveTop");
                this.scroll(0, this._scrollDeltaAlignWithZoom);
            },

            onMoveLeft: function (evt) {
                // console.log("onMoveLeft");
                evt.preventDefault();
                this.scroll(this._scrollDeltaAlignWithZoom, 0);
            },

            onMoveRight: function (evt) {
                // console.log("onMoveRight");
                evt.preventDefault();
                this.scroll(-this._scrollDeltaAlignWithZoom, 0);
            },

            onMoveDown: function (evt) {
                // console.log("onMoveDown");
                evt.preventDefault();
                this.scroll(0, -this._scrollDeltaAlignWithZoom);
            },

            isVisible: function (x, y) {
                const s = window.getComputedStyle(this.container_div);
                const width = parseFloat(s.width);
                const height = parseFloat(s.height);

                if (x >= (-this.board_x - width / 2) && x <= (-this.board_x + width / 2)) {
                    if (y >= (-this.board_y - height / 2) && y < (-this.board_y + height / 2)) {
                        return true;
                    }
                }

                return false;
            },

            ///////////////////////////////////////////////////
            ///// Enable / disable scrolling
            enableScrolling: function () {
                if (!this.bEnableScrolling) {
                    this.bEnableScrolling = true;
                }
                this.showOnScreenArrows();
            },

            disableScrolling: function () {
                if (this.bEnableScrolling) {
                    this.bEnableScrolling = false;
                }
                // hide arrows
                this.hideOnScreenArrows();
            },

            //////////////////////////////////////////////////
            //// Zoom with buttons
            setupOnScreenZoomButtons: function (zoomDelta = 0.2) {
                console.log("setupOnScreenZoomButtons");
                this.zoomDelta = zoomDelta;

                if (!this._btnZoomPlus)
                    this._btnZoomPlus = this._initButton(this._btnZoomPlusNames, this.onZoomIn, ()=> {this.changeMapZoom(0.02);});
                if (!this._btnZoomMinus)
                    this._btnZoomMinus = this._initButton(this._btnZoomMinusNames, this.onZoomOut, ()=> {this.changeMapZoom(-0.02);});

                //this.showOnScreenZoomButtons();

            },

            showOnScreenZoomButtons: function () {
               this._showButton(this._btnZoomPlusNames);
               this._showButton(this._btnZoomMinusNames);
            },

            hideOnScreenZoomButtons: function () {
                this._hideButton(this._btnZoomPlusNames);
                this._hideButton(this._btnZoomMinusNames);
            },

            onZoomIn: function (evt) {
                evt.preventDefault();
                this.changeMapZoom(this.zoomDelta);
            },

            onZoomOut: function (evt) {
                evt.preventDefault();
                this.changeMapZoom(-this.zoomDelta);
            },

            //////////////////////////////////////////////////
            //// Reset with buttons
            setupOnScreenResetButtons: function (resetZoom = false) {
                this._resetZoom = resetZoom;
                console.log("setupOnScreenResetButtons");
                if (!this._btnReset)
                    this._btnReset = this._initButton(this._btnResetNames, this.onReset);
                // this.showOnScreenResetButtons();
            },

            showOnScreenResetButtons: function () {
                this._showButton(this._btnResetNames);
            },

            hideOnScreenResetButtons: function () {
                this._hideButton(this._btnResetNames);
            },

            onReset: function (evt) {
                if (this._resetZoom)
                    this.setMapZoom(this.defaultZoom);
                if (this.defaultPosition)
                    this.scrollto(this.defaultPosition.x * this.zoom, this.defaultPosition.y * this.zoom);
                else
                    this.scrollToCenter();
            },

            //////////////////////////////////////////////////
            //// Increase/decrease display height with buttons
            _getpEnlargeReduceButtonsProps: function() {
                var idSuffix="", display='block';
                if (!this._bEnlargeReduceButtonsInsideMap){
                    idSuffix="_footer", display='contents';
                }
                return {idSuffix, display};
            },

            setupEnlargeReduceButtons: function (incrHeightDelta, incrHeightKeepInPos, minHeight) {
                console.log("setupEnlargeReduceButtons");
                var btnsProps = this._getpEnlargeReduceButtonsProps();
                if (!this._btnIncreaseHeight)
                    this._btnIncreaseHeight = this._initButton('enlargedisplay', this.onIncreaseDisplayHeight, ()=> {this.changeDisplayHeight(5);}, btnsProps.idSuffix, btnsProps.display);

                if (!this._btnDecreaseHeight)
                    this._btnDecreaseHeight =  this._initButton('reducedisplay', this.onDecreaseDisplayHeight, ()=> {this.changeDisplayHeight(-5);}, btnsProps.idSuffix, btnsProps.display);

                this.incrHeightDelta = incrHeightDelta;
                this.incrHeightKeepInPos = incrHeightKeepInPos;
                this.minHeight = minHeight;
            },

            showEnlargeReduceButtons: function () {
                var btnsProps = this._getpEnlargeReduceButtonsProps();
                this._showButton("enlargedisplay", btnsProps.idSuffix, btnsProps.display);
                this._showButton("reducedisplay", btnsProps.idSuffix, btnsProps.display);
            },

            hideEnlargeReduceButtons: function () {
                var btnsProps = this._getpEnlargeReduceButtonsProps();
                this._hideButton("enlargedisplay", btnsProps.idSuffix);
                this._hideButton("reducedisplay", btnsProps.idSuffix);
            },

            onIncreaseDisplayHeight: function(evt) {
                evt.preventDefault();
                this.changeDisplayHeight(this.incrHeightDelta);
            },

            onDecreaseDisplayHeight: function(evt) {
                evt.preventDefault();
                this.changeDisplayHeight(- this.incrHeightDelta);
            },

            changeDisplayHeight: function(delta) {
                var current_height = parseFloat(window.getComputedStyle(this.container_div).height);
                var new_height = Math.max((current_height + delta), this.minHeight);
                if (this.incrHeightKeepInPos)
                    this.board_y += (current_height-new_height)/2;
                this.container_div.style.height =  new_height + 'px';
            },
            //////////////////////////////////////////////////
            //// Info button
            setupInfoButton: function (bConfigurableInUserPreference = false) {
                if (!this.btnInfo)
                    return;
                console.log("setupEnlargeReduceButtons");
                this.btnInfo.style.cursor= 'pointer';
                this.btnInfo.style.display= 'block';
                this._bConfigurableInUserPreference = bConfigurableInUserPreference;
                return this.setInfoButtonTooltip();
            },

            setInfoButtonTooltip: function () {
                var info = _('To scroll/pan: maintain the mouse button or 2 fingers pressed and move.');
                if (this._bEnableZooming)
                    info += '<BR><BR>'+_('To zoom: use the scroll wheel (with alt or ctrl or shift key) or pinch fingers.');
                if (this._bConfigurableInUserPreference)
                    info += _('This is configurable in user preference.');
                if (this.page!=null)
                    this.page.addTooltip( this.btnInfo.id, info, '' );
                else
                    return info;
            },

        });
    });