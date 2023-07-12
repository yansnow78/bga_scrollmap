/* Scrollmap: a scrollable map
 *
 * Code by yannsnow
 * */
var isDebug = window.location.host == 'studio.boardgamearena.com' || window.location.hash.indexOf('debug') > -1;
var debug = isDebug ? console.info.bind(window.console) : function () {};
var error = isDebug ? console.error.bind(window.console) : function () {};
/*global gameui*/
define([
    "dojo", "dojo/_base/declare" , "./long-press-event", "./core_patch_slideto"
],
    function (dojo, declare) {
        return declare("ebg.scrollmapWithZoom", null, {
            constructor: function () {              
                this.board_x = 0;
                this.board_y = 0;
                this.defaultPosition = null; //{x: 0,y: 0};
                // this.ControlPosition = {
                //     TOP_CENTER : 0,
                //     TOP_LEFT : 1, 
                //     TOP_RIGHT : 2, 
                //     BOTTOM_CENTER : 3,
                //     BOTTOM_LEFT : 4,
                //     BOTTOM_RIGHT : 5,
                //     LEFT_CENTER : 6,
                //     LEFT_TOP : 7,
                //     LEFT_BOTTOM: 8,
                //     RIGHT_CENTER : 9,
                //     RIGHT_TOP : 10,
                //     RIGHT_BOTTOM: 11,
                //   };
                
                // set via create
                this.container_div = null;
                this.scrollable_div = null;
                this.surface_div = null;
                this.onsurface_div = null;
                this.clipped_div = null;
                this.animation_div = null;
                this._btnInfo = null;
                // this._onClickBtnInfo = null;

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
                //this.zoomControlOptions =  {position: this.ControlPosition.LEFT_CENTER};
                this.zoomChangeHandler = null;
                this._bEnableZooming = null;
                Object.defineProperty(this, 'bEnableZooming', {
                    get() {
                      return this._bEnableZooming;
                    },
                    set(value) {
                        this._bEnableZooming = value;
                        if (!this.container_div)
                            return;
                        if (!this._bEnableZooming) {
                            this.hideOnScreenZoomButtons();
                            debug("bEnableZooming is false, hide zoom buttons");
                        }
                        var warning_touch =  _("Use two fingers to begin moving the board. ");
                        if (this._bEnableZooming)
                            warning_touch += _("Pinch fingers to zoom");
                        this.container_div.setAttribute("warning_touch", warning_touch);
                        this.container_div.setAttribute("warning_scroll", _("Use ctrl or alt or shift + scroll to zoom the board"));
                        if (this._btnInfo && (this._btnInfo.style.display== 'block')){
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

                // size properties
                this.minHeight = 100;
                this.incrHeightKeepInPos = true;
                this.adaptHeightAuto = false;
                this.adaptHeightCorr = 0;

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
                this._resizeHeadersObserver = null;
                if (typeof ResizeObserver !== 'undefined')
                    this._resizeHeadersObserver = new ResizeObserver(this._adaptHeight.bind(this));
                this._onpointermove_handler = this._onPointerMove.bind(this);
                this._onpointerup_handler = this._onPointerUp.bind(this);
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

            create: function (container_div, scrollable_div, surface_div, onsurface_div, clipped_div=null, animation_div=null, page=null, create_extra=null, bEnlargeReduceButtonsInsideMap=false) {
                debug("ebg.scrollmapWithZoom create ", bEnlargeReduceButtonsInsideMap);
                if (typeof gameui.calcScale == "undefined"){
                    dojo.safeMixin(gameui, new ebg.core.core_patch_slideto());
                }

                this._bEnlargeReduceButtonsInsideMap = bEnlargeReduceButtonsInsideMap;
                container_div.classList.add("scrollmap_container");
                if (scrollable_div)
                    scrollable_div.classList.add("scrollmap_scrollable");
                if (surface_div)
                    surface_div.classList.add("scrollmap_surface");
                if (onsurface_div)
                    onsurface_div.classList.add("scrollmap_onsurface");
                if (clipped_div)
                    clipped_div.classList.add("scrollmap_overflow_clipped");
                else
                    container_div.classList.add("scrollmap_overflow_clipped");
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
                            overflow: hidden;
                        }

                        .scrollmap_container .scrollmap_overflow_clipped {
                            position: relative;
                            width: 100%;
                            height: 100%;
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
                        }
                        .scrollmap_container .movetop {
                            top: 0px;
                            left: 50%;
                            margin-left: 0px;
                            transform: translateX(-50%)
                        }

                        .scrollmap_container .movedown {
                            bottom: 0px;
                            left: 50%;
                            margin-left: 0px;
                            transform: translateX(-50%)
                        }

                        .scrollmap_container .moveleft {
                            left: 0px;
                            top: 50%;
                            margin-top: 0px;
                            transform: translateY(-50%)
                        }

                        .scrollmap_container .moveright {
                            right: 0px;
                            top: 50%;
                            margin-top: 0px;
                            transform: translateY(-50%)
                        }
                        `;
                    // styleElt.type = "text/css";
                    styleElt.id = 'css-scrollmap';
                    styleElt.appendChild(document.createTextNode(styleSheetContent));
                    document.head.appendChild(styleElt);
                }
                if (create_extra !== null)
                    create_extra(this);

                var onPointerDown =this._onPointerDown.bind(this);
                if (window.PointerEvent)
                    this.surface_div.addEventListener('pointerdown', onPointerDown, this.passiveEventListener);
                else {
                    this.surface_div.addEventListener('mousedown', onPointerDown, this.passiveEventListener);
                    this.surface_div.addEventListener('touchstart', onPointerDown, this.passiveEventListener);
                }

                this.container_div.addEventListener('wheel', this._onWheel.bind(this), this.notPassiveEventListener);
                var _handleTouch=this._handleTouch.bind(this);
                this.container_div.addEventListener("touchstart", _handleTouch, this.passiveEventListener );
                this.container_div.addEventListener("touchmove", _handleTouch, this.notPassiveEventListener);
                document.addEventListener("touchend", _handleTouch, this.passiveEventListener );
                document.addEventListener("touchcancel", _handleTouch, this.passiveEventListener );

                this.setupOnScreenArrows(100, true);
                this.setupOnScreenZoomButtons(0.2);
                this.setupOnScreenResetButtons();
                this.setupEnlargeReduceButtons(100, true, 300);
                if (this._btnZoomPlus && this._btnZoomPlus.style.display!="none" && this.bEnableZooming === null)
                    this.bEnableZooming = true;
                this.setupInfoButton();

                this.bEnableZooming = this._bEnableZooming;
                if (this.defaultZoom === null)
                    this.defaultZoom=this.zoom;
                this.setMapZoom(this.zoom);
                this.scrollto(0, 0, 0, 0);
                if  (this._resizeObserver)
                    this._resizeObserver.observe(this.container_div);
                if  (this._resizeHeadersObserver){
                    this._resizeHeadersObserver.observe($('log_history_status'));
                    this._resizeHeadersObserver.observe($('page-title'));
                    this._resizeHeadersObserver.observe($('after-page-title'));
                }

                this._localStorageKey = 'scrollmap_'+gameui.table_id+'_'+this.container_div.id;    
                window.addEventListener( 'pagehide', (e) => {this._onbeforeunload_handler(e);});
                document.addEventListener( 'visibilitychange', this._onvisibilty_changehandler.bind(this));
                window.addEventListener( 'load', (e) => {debug("document loaded"); /*this._adaptHeight();*/});
                dojo.connect(gameui, "onGameUiWidthChange", this, dojo.hitch( this, '_adaptHeight' ));
            },

            createCompletely: function (container_div, page=null, create_extra=null, bEnlargeReduceButtonsInsideMap=true) {
                debug("createCompletely");
                const LABEL_ENLARGE_DISPLAY = _("Enlarge");
                const LABEL_REDUCE_DISPLAY = _("Reduce");

                var tmplDisplayButtons = String.raw`
                    <a class="enlargedisplay">↓  ${LABEL_ENLARGE_DISPLAY}  ↓</a>
                    <a class="reducedisplay">↑ ${LABEL_REDUCE_DISPLAY} ↑</a>
                `;
                var info_id=container_div.id +"_info";

                var tmpl = String.raw`
                    <div class="scrollmap_overflow_clipped">
                        <div class="scrollmap_scrollable"></div>
                        <div class="scrollmap_surface" ></div>
                        <div class="scrollmap_onsurface"></div>
                    </div>
                    <i class="movetop fa fa-chevron-up scrollmap_icon"></i>
                    <i class="moveleft fa fa-chevron-left scrollmap_icon"></i>
                    <i class="moveright fa fa-chevron-right scrollmap_icon"></i>
                    <i class="movedown fa fa-chevron-down scrollmap_icon"></i>
                    <i class="zoomplus fa fa-search-plus scrollmap_icon"></i>
                    <i class="zoomminus fa fa-search-minus scrollmap_icon"></i>
                    <i class="reset fa fa-refresh scrollmap_icon"></i>
                    <i class="reset fa6-solid fa6-arrows-to-circle scrollmap_icon"></i>
                    <i id=${info_id} class="info fa fa-info scrollmap_icon"></i>
                    ${bEnlargeReduceButtonsInsideMap?tmplDisplayButtons:``}
                    <div class="scrollmap_anim"></div>
                `;
                this._classNameSuffix = '';
                container_div.innerHTML = tmpl;
                this._btnInfo = $(info_id);
                var scrollable_div = container_div.querySelector('.scrollmap_scrollable');
                var surface_div = container_div.querySelector('.scrollmap_surface');
                var onsurface_div = container_div.querySelector('.scrollmap_onsurface');
                var clipped_div = container_div.querySelector('.scrollmap_overflow_clipped');
                var animation_div = container_div.querySelector('.scrollmap_anim');

                if (!bEnlargeReduceButtonsInsideMap){
                    tmpl = String.raw`
                    <div id="${container_div.id}_header" class="whiteblock scrollmap_header">
                        ${tmplDisplayButtons}
                    </div>`;
                    var parent = container_div.parentNode;
                    var tmplNode = document.createElement("div");
                    if(parent){
                        parent.insertBefore(tmplNode, container_div);
                    }
                    tmplNode.outerHTML = tmpl;
                }

                this.create(container_div, scrollable_div, surface_div, onsurface_div, clipped_div, animation_div, page, create_extra, bEnlargeReduceButtonsInsideMap);
            },

            _init: function () {
            },

            _adaptHeight: function()
            {
                debug("_adaptHeight");
                if (!this.adaptHeightAuto)
                    return;
                var screen_height =window.innerHeight
                    || document.documentElement.clientHeight
                    || document.body.clientHeight;
    
                var container_pos = dojo.coords('map_container', true);
    
                screen_height /= gameui.gameinterface_zoomFactor;
    
                var other_elements_height = this.adaptHeightCorr + container_pos.y;
                // var $log_history_status = $('log_history_status'); 
                // if ($log_history_status)
                //     other_elements_height -= $log_history_status.getBoundingClientRect().height/gameui.gameinterface_zoomFactor;
                var $connect_status = $('connect_status'); 
                if ($connect_status)
                    other_elements_height -= $connect_status.getBoundingClientRect().height/gameui.gameinterface_zoomFactor;
                var $chatwindowavatar = document.querySelector(".chatwindowavatar");
                if ($chatwindowavatar)
                    other_elements_height += $chatwindowavatar.getBoundingClientRect().height/gameui.gameinterface_zoomFactor;
                var map_height = screen_height - other_elements_height;

                this.setDisplayHeight(map_height);
            },

            onResize: function () {
                if (!this._setupDone) {
                    debug("1st onResize after setup");
                    this._clearOldSettings();
                    var loaded = this._loadSettings();
                    if (!loaded) {
                        this.scrollToCenter();
                    }
                } else 
                    this.scrollto(this.board_x, this.board_y, 0, 0);
                this._setupDone = true;
            },

            _clearOldSettings: function (){
                let keys = Object.keys(localStorage);
                let oldKeysCnt = 0; 
                let oldest = null;
                let oldestKey = 0;
                for(let key of keys) {
                    if (key.startsWith('scrollmap')){
                        let oldSetting = JSON.parse(localStorage.getItem(key));
                        if ((oldest == null) || oldSetting.time < oldest){
                            oldestKey = key;
                            oldest = oldSetting.time ;
                        }
                        oldKeysCnt++;
                    }
                    if (oldKeysCnt > 500){
                        localStorage.removeItem(oldestKey);
                    }
                }
            },
            _loadSettings: function (){
                debug("_loadSettings");
                let settings = JSON.parse(localStorage.getItem(this._localStorageKey));
                if (settings != null){
                    this.setMapZoom(settings.zoom);
                    this.board_x = settings.board_x;
                    this.board_y = settings.board_y;
                    this.scrollto(this.board_x, this.board_y, 0, 0);
                    if ((!this.adaptHeightAuto) && (settings.height!=null))
                        this.setDisplayHeight(settings.height);
                    return true;
                }
                return false;
            },
            _saveSettings: function (){
                debug("_saveSettings");
                let settings = {time:Date.now(), zoom:this.zoom, board_x:this.board_x, board_y:this.board_y, height:this.adaptHeightAuto?null:this.getDisplayHeight()};
                localStorage.setItem(this._localStorageKey, JSON.stringify(settings));
            },
            _onvisibilty_changehandler: function (e) {
                if (document.visibilityState === "hidden") {this._saveSettings(e);}
            },

            _onbeforeunload_handler: function (e) {
                this._saveSettings(e);
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
                if  ((gameui === null) || (typeof gameui.gameinterface_zoomFactor === 'undefined' ))  {
                    var pageZoomStr = $("page-content").style.getPropertyValue("zoom");
                    pageZoom = 1;
                    if (pageZoomStr !== "")
                        pageZoom=parseFloat($("page-content").style.getPropertyValue("zoom"));
                } else
                    pageZoom = gameui.gameinterface_zoomFactor;
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
                if ((gameui !== null) && (typeof gameui.calcNewLocation === "function")) {
                    [,,x, y]= gameui.calcNewLocation(this.surface_div, null, clientX/pageZoom, clientY/pageZoom, false, true);
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
                    //     debug(e.touches.length);
                    // }
                    if (e.touches.length === 0)
                        this._interacting = false;
                    //debug(e.touches.length);
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
                    //     debug( this._gestureStart, e.touches.length, e.targetTouches.length);
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
                            //  debug("touchmove", scrollX+scrollY, scrolling, "   ", touchesDistDiff, zooming);
                        //     if ((scrolling && this.bEnableScrolling) || 
                        //         (zooming && this._bEnableZooming && this.zoomingOptions.pinchZooming)) {
                        //         this.container_div.classList.remove("scrollmap_warning_touch");
                        //         this._interacting = true;
                        //         debug('start interacting');
                        //     }
                            this._enableInteractions();
                            // e.stopImmediatePropagation();
                            // e.preventDefault();
                        }
                        // debug(this._interacting);
                        //this._prevTouchesDist = touchesDist;
                        //this._prevTouchesMiddle = touchesMiddle;
                    }
                }
            },

            _onPointerDown: function (ev) {
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

            _onPointerMove: function (ev) {
                // debug("pointer move");
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
                    // debug(x, y);
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

            _onPointerUp: function (ev) {
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

            _onWheel: function (evt) {
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
                // debug("onwheel", evt.clientX, evt.clientY, x, y);
                this.changeMapZoom(evt.deltaY * -this.zoomWheelDelta, x, y);
            },

            scroll: function (dx, dy, duration, delay) {
                // debug("scroll", this.board_x, dx, this.board_y, dy);
                this.scrollto(this.board_x + dx, this.board_y + dy, duration, delay);
            },
            
            // Scroll the board to make it centered on given position
            scrollto: function (x, y, duration, delay) {
                // debug("scrollto", this.board_x, this.board_y);
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
                // debug("scrollto board_x, board_y=",board_x, board_y);

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
                debug("scrollToCenter",center.x, center.y);
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

                var scales = new Map();

                let scrollable_div = this.scrollable_div;
                function calcMaxMin(node, top_div){
                    // debug(node);
                    let s = window.getComputedStyle(node);
                    if (s.left=="auto") {
                        Array.from(node.children).forEach((node) => {calcMaxMin(node, top_div);}); 
                        return;
                    }
                    let directParent = node.parentNode;
                    let parent = directParent;
                    let scaleTotal = scales.get(parent);
                    if (!scaleTotal){
                        scaleTotal = 1;
                        while (!parent.isEqualNode(top_div)){
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
                        // debug("scaleTotal",scaleTotal);
                    }
                    let left = (parseFloat(s.left)  * scaleTotal) || 0; let width = (parseFloat(s.width) * scaleTotal) || (node.offsetWidth * scaleTotal);
                    max_x = Math.max(max_x, left + width);
                    min_x = Math.min(min_x, left);

                    let top = (parseFloat(s.top) * scaleTotal) || 0;  let height = (parseFloat(s.height) * scaleTotal) || (node.offsetHeight * scaleTotal);
                    max_y = Math.max(max_y, top + height);
                    min_y = Math.min(min_y, top);
                    debug(node.id, left, top, left + width, top + height);
                }
                if ((typeof this._custom_css_query != 'undefined') && (this._custom_css_query !== null)) {
                    document.querySelectorAll(this._custom_css_query).forEach((node) => {calcMaxMin(node, this.scrollable_div);});
                } else {
                    var css_query = ":scope > *";
                    this.scrollable_div.querySelectorAll(css_query).forEach((node) => {calcMaxMin(node, this.scrollable_div);});
                    this.onsurface_div.querySelectorAll(css_query).forEach((node) => {calcMaxMin(node, this.onsurface_div);});
                }
                // debug("getMapCenter", css_query, css_query_div);

                var center =  {
                    x: (min_x + max_x) / 2,
                    y: (min_y + max_y) / 2
                };
                // debug("getMapCenter",  min_x,  max_x, min_y, max_y);
                // debug("getMapCenter",  center);

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
                this._setScale(this.scrollable_div, this.zoom);
                this._setScale(this.onsurface_div, this.zoom);
                if (this.animation_div!==null)
                    this._setScale(this.animation_div, this.zoom);
                this.container_div.style.setProperty("--scrollmap_zoomed_transform", `scale(${this.zoom})`);
                if (this.zoomChangeHandler)
                    this.zoomChangeHandler(this.zoom);
                const zoomDelta = this.zoom / this._prevZoom;
                //debug(x+' '+ y+' '+ zoomDelta+' '+ this.zoom);
                this.scrollto((this.board_x * zoomDelta) + x * (1 - zoomDelta), (this.board_y * zoomDelta) + y * (1 - zoomDelta), 0, 0);
                this._prevZoom = this.zoom;
            },

            _setScale: function (elemId, scale) {
                $(elemId).style.transform =  'scale(' + scale + ')';
            },

            _getButton: function (btnNames, idSuffix=""){
                btnNames = btnNames.split(",");
                for(let i in btnNames){
                    let btnName = btnNames[i];
                    var $btn = null;
                    if (idSuffix == "")
                        var $querydiv = this.container_div;
                    else
                        var $querydiv = document.getElementById(this.container_div.id+idSuffix);
                    if ($querydiv !=null) 
                        var $btn = $querydiv.querySelector('.'+this._classNameSuffix+btnName);
                    //debug($btn);
                    //debug('#' + this.container_div.id+idSuffix + ' .'+this._classNameSuffix+btnName);
                    if ($btn === null)
                        $btn = $(btnName);
                    if ($btn) {
                        debug(btnName+" found");
                        return $btn;
                    }
                }
                debug(btnNames+" not found");
                return null;
            },

            _hideButton: function (btnName, idSuffix=""){
                var $btn = this._getButton(btnName, idSuffix);
                if ($btn !== null)
                    $btn.style.display = 'none';
            },

            _showButton: function (btnName, idSuffix="", display='block'){
                var $btn = this._getButton(btnName, idSuffix);
                if ($btn !== null)
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
                // debug("onButtonLongPress");
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
                //debug("onButtonLongPressEnd");
                this._longPress = false;
            },

            //////////////////////////////////////////////////
            //// Scroll with buttons

            // Optional: setup on screen arrows to scroll the board
            setupOnScreenArrows: function (scrollDelta, bScrollDeltaAlignWithZoom = true) {
                debug("setupOnScreenArrows");
                this.scrollDelta = scrollDelta;
                this.bScrollDeltaAlignWithZoom = bScrollDeltaAlignWithZoom;
                if (this.bScrollDeltaAlignWithZoom)
                    this._scrollDeltaAlignWithZoom = scrollDelta * this.zoom;
                else
                    this._scrollDeltaAlignWithZoom = scrollDelta;
                if (!this._btnMoveTop)
                    this._btnMoveTop = this._initButton('movetop', this._onMoveTop, ()=> {this.scroll(0, 3, 0, 0);});
                if (!this._btnMoveDown)
                    this._btnMoveDown = this._initButton('movedown', this._onMoveDown, ()=> {this.scroll(0, -3, 0, 0);});
                if (!this._btnMoveLeft)
                    this._btnMoveLeft = this._initButton('moveleft', this._onMoveLeft, ()=> {this.scroll(3, 0, 0, 0 );});
                if (!this._btnMoveRight)
                    this._btnMoveRight = this._initButton('moveright', this._onMoveRight,()=> {this.scroll(-3, 0, 0, 0 );});
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

            _onMoveTop: function (evt) {
                //debug("onMoveTop");
                this.scroll(0, this._scrollDeltaAlignWithZoom);
            },

            _onMoveLeft: function (evt) {
                // debug("onMoveLeft");
                evt.preventDefault();
                this.scroll(this._scrollDeltaAlignWithZoom, 0);
            },

            _onMoveRight: function (evt) {
                // debug("onMoveRight");
                evt.preventDefault();
                this.scroll(-this._scrollDeltaAlignWithZoom, 0);
            },

            _onMoveDown: function (evt) {
                // debug("onMoveDown");
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
                debug("setupOnScreenZoomButtons");
                this.zoomDelta = zoomDelta;

                if (!this._btnZoomPlus)
                    this._btnZoomPlus = this._initButton(this._btnZoomPlusNames, this._onZoomIn, ()=> {this.changeMapZoom(0.02);});
                if (!this._btnZoomMinus)
                    this._btnZoomMinus = this._initButton(this._btnZoomMinusNames, this._onZoomOut, ()=> {this.changeMapZoom(-0.02);});

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

            _onZoomIn: function (evt) {
                evt.preventDefault();
                this.changeMapZoom(this.zoomDelta);
            },

            _onZoomOut: function (evt) {
                evt.preventDefault();
                this.changeMapZoom(-this.zoomDelta);
            },

            //////////////////////////////////////////////////
            //// Reset with buttons
            setupOnScreenResetButtons: function (resetZoom = false) {
                this._resetZoom = resetZoom;
                debug("setupOnScreenResetButtons");
                if (!this._btnReset)
                    this._btnReset = this._initButton(this._btnResetNames, this._onReset);
                // this.showOnScreenResetButtons();
            },

            showOnScreenResetButtons: function () {
                this._showButton(this._btnResetNames);
            },

            hideOnScreenResetButtons: function () {
                this._hideButton(this._btnResetNames);
            },

            _onReset: function (evt) {
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
                    idSuffix="_header", display='initial';
                }
                return {idSuffix, display};
            },

            setupEnlargeReduceButtons: function (incrHeightDelta, incrHeightKeepInPos, minHeight) {
                debug("setupEnlargeReduceButtons");
                var btnsProps = this._getpEnlargeReduceButtonsProps();
                if (!this._btnIncreaseHeight)
                    this._btnIncreaseHeight = this._initButton('enlargedisplay', this._onIncreaseDisplayHeight, ()=> {this.changeDisplayHeight(5);}, btnsProps.idSuffix, btnsProps.display);

                if (!this._btnDecreaseHeight)
                    this._btnDecreaseHeight =  this._initButton('reducedisplay', this._onDecreaseDisplayHeight, ()=> {this.changeDisplayHeight(-5);}, btnsProps.idSuffix, btnsProps.display);

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

            _onIncreaseDisplayHeight: function(evt) {
                evt.preventDefault();
                this.changeDisplayHeight(this.incrHeightDelta);
            },

            _onDecreaseDisplayHeight: function(evt) {
                evt.preventDefault();
                this.changeDisplayHeight(- this.incrHeightDelta);
            },

            changeDisplayHeight: function(delta) {
                var current_height = this.getDisplayHeight();
                this.setDisplayHeight(current_height+delta);
            },
            setDisplayHeight: function(new_height) {
                var current_height = this.getDisplayHeight();
                new_height = Math.max(new_height, this.minHeight);
                if (this.incrHeightKeepInPos)
                    this.board_y += (current_height-new_height)/2;
                this.container_div.style.height =  new_height + 'px';
            },
            getDisplayHeight: function() {
                return parseFloat(window.getComputedStyle(this.container_div).height);
            },
            //////////////////////////////////////////////////
            //// Info button
            setupInfoButton: function (bConfigurableInUserPreference = false) {
                if (!this._btnInfo)
                    return;
                debug("setupInfoButton");
                this._btnInfo.style.cursor= 'pointer';
                this._btnInfo.style.display= 'block';
                this._bConfigurableInUserPreference = bConfigurableInUserPreference;
                // if (!this._onClickBtnInfo){
                //     this._onClickBtnInfo = (e) => {
                //         debugger;
                //         var tootip = gameui.tooltips[ this._btnInfo.id ];
                //         if (tootip.open) tootip.open(this._btnInfo);
                //     };
                //     this._btnInfo.addEventListener('click', this._onClickBtnInfo);
                // }
                return this.setInfoButtonTooltip();
            },

            setInfoButtonTooltip: function () {
                var info = _('To scroll/pan: maintain the mouse button or 2 fingers pressed and move.');
                if (this._bEnableZooming)
                    info += '<BR><BR>'+_('To zoom: use the scroll wheel (with alt or ctrl or shift key) or pinch fingers.');
                if (this._bConfigurableInUserPreference)
                    info += _('This is configurable in user preference.');
                if (gameui!=null)
                    gameui.addTooltip( this._btnInfo.id, info, '');
                else
                    return info;
            },

        });
    });