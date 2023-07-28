/* 
scrollmapWithZoom: Improved version of scrollmap used in multiple bga game
https://github.com/yansnow78/bga_scrollmap.git

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
- keep in memory zoom, pos for each game table between sessions via localStore
- adapt height automatically when adaptHeightAuto is set
- allow tooltips on any scrollmap layer
- ...
 * Coded by yannsnow
 * */
/*global gameui*/
var isDebug = window.location.host == 'studio.boardgamearena.com' || window.location.hash.indexOf('debug') > -1;
var debug = isDebug ? console.info.bind(window.console) : function () {};
// var error = isDebug ? console.error.bind(window.console) : function () {};
declare const define;
declare const ebg;
declare const $;
declare const dojo;
declare const dijit;
declare const _;
declare const g_gamethemeurl;
declare const gameui;
declare const toint
declare const aspect;
interface Position {
    x: number;
    y: number;
  }
class scrollmapWithZoom 
{
    board_x: number = 0;
    board_y: number = 0;
    defaultPosition: Position = null;
    container_div: HTMLElement = null;
    scrollable_div: HTMLElement = null;
    surface_div: HTMLElement = null;
    onsurface_div: HTMLElement = null;
    clipped_div: HTMLElement = null;
    animation_div: HTMLElement = null;
    private _btnInfo: HTMLElement = null;
    zoom: number = 1;
    maxZoom: number = 2;
    minZoom: number = 0.1;
    defaultZoom: number = null;
    private _prevZoom: number = 1;
    zoomPinchDelta: number = 0.005;
    zoomWheelDelta: number = 0.001;
    zoomDelta: number = 0.2;
    wheelZoomingKeys = { Disabled: 0, Any: 1, None: 2, Ctrl: 4, Alt: 8, Shift: 16, AnyOrNone: 32};
    zoomingOptions: { wheelZoming: number; pinchZooming: boolean; } = { wheelZoming: this.wheelZoomingKeys.Any, pinchZooming: true };
    zoomChangeHandler: Function = null;
    private _bEnableZooming: boolean = true;
    public get bEnableZooming(): boolean {
        return this._bEnableZooming;
    }
    public set bEnableZooming(value: boolean) {
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
    bEnableScrolling: boolean = true;
    scrollingOptions: { bOneFingerScrolling: boolean; } = { bOneFingerScrolling: false };;
    bScrollDeltaAlignWithZoom: boolean = true;
    scrollDelta: number = 100;
    private _scrollDeltaAlignWithZoom: number = 0;
    scrollPosInitial: object = null;
    bHeightChanged: boolean = false;
    minHeight: number = 300;
    incrHeightDelta: number = 100;;
    bIncrHeightKeepInPos: boolean = true;
    private _bAdaptHeightAuto: boolean = false;
    public get bAdaptHeightAuto(): boolean {
        return this._bAdaptHeightAuto;
    }
    public set bAdaptHeightAuto(value: boolean) {
        this._bAdaptHeightAuto = value;
        if (!this.container_div)
            return;
        if (!this._bAdaptHeightAuto) {
            this.hideEnlargeReduceButtons();
        }
    }
    private _bIncrHeightGlobally: boolean = false;
    public get bIncrHeightGlobally(): boolean {
        return this._bIncrHeightGlobally;
    }
    public set bIncrHeightGlobally(value: boolean) {
        this._bIncrHeightGlobally = value;
        if (!this.container_div)
            return;
        if (this._bIncrHeightGlobally) {
            if (!document.body.style.getPropertyValue("--scrollmap_height"))
                document.body.style.setProperty("--scrollmap_height", this.getDisplayHeight()+'px');
            this.container_div.style.height =  'var(--scrollmap_height)';
        }
    }
    private _bIncrHeightBtnVisible: boolean = true;
    public get bIncrHeightBtnVisible(): boolean {
        return this._bIncrHeightBtnVisible;
    }
    public set bIncrHeightBtnVisible(value: boolean) {
        this._bIncrHeightBtnVisible = value;
        if (!this.container_div)
            return;
        if (!this._bIncrHeightBtnVisible) {
            this.hideEnlargeReduceButtons();
        }
    }
    adaptHeightCorr: number = 0;
    private _bInfoBtnVisible: boolean = true;
    public get bInfoBtnVisible(): boolean {
        return this._bInfoBtnVisible;
    }
    public set bInfoBtnVisible(value: boolean) {
        this._bInfoBtnVisible = value;
        if (!this.container_div)
            return;
        if (!this._bInfoBtnVisible) {
            this.hideInfoButton();
        }
    }
    bEnableLongPress: boolean = true;
    private _pointers: Map<any, any> = new Map();
    private _classNameSuffix: string = '';
    private _longPress: boolean = false;
    private _enableTooltipsAndClickTimerId: number = null;
    private _enabledTooltips: boolean  = true;
    private _enabledClicks: boolean  = true;
    private _enableTooltipsAndClick_handler: (this: HTMLElement, ev: MouseEvent) => any = this._enableTooltipsAndClick.bind(this);;
    private _resizeObserver: ResizeObserver = (typeof ResizeObserver !== 'undefined')? new ResizeObserver(this.onResize.bind(this)) : null;
    private _resizeHeadersObserver: ResizeObserver  = (typeof ResizeObserver !== 'undefined')? new ResizeObserver(this._adaptHeight.bind(this)) : null;
    private _onpointermove_handler: (this: HTMLElement, ev: MouseEvent) => any = this._onPointerMove.bind(this);
    private _onpointerup_handler: (this: HTMLElement, ev: MouseEvent) => any = this._onPointerUp.bind(this);;
    private _onpointerup_handled: boolean = false;
    private _suppressCLickEvent_handler: (this: HTMLElement, ev: MouseEvent) => any = this._suppressCLickEvent.bind(this);
    private _touchInteracting: boolean = false;
    private _setupDone: boolean = false;
    private _bConfigurableInUserPreference: boolean = false;
    private _btnMoveRight: HTMLElement = null;
    btnMoveRightClasses: string = 'fa fa-chevron-right';
    private _btnMoveLeft: HTMLElement = null;
    btnMoveLeftClasses: string = 'fa fa-chevron-left';
    private _btnMoveTop: HTMLElement = null;
    btnMoveTopClasses: string = 'fa fa-chevron-up';
    private _btnMoveDown: HTMLElement = null;
    btnMoveDownClasses: string = 'fa fa-chevron-down';
    private _btnZoomPlus: HTMLElement = null;
    private _btnZoomMinus: HTMLElement = null;
    private _btnZoomPlusNames: string = 'zoomplus,zoom_plus,zoomin,zoom_in';
    btnZoomPlusClasses: string = 'fa fa-search-plus';
    private _btnZoomMinusNames: string = 'zoomminus,zoom_minus,zoomout,zoom_out';
    btnZoomMinusClasses: string= 'fa fa-search-minus';
    private _btnReset: HTMLElement = null;
    private _btnResetNames: string = 'reset,back_to_center,reset_map,map_reset';
    btnResetClasses: string = 'fa6-solid fa6-arrows-to-dot';
    private _btnBackToCenter: HTMLElement = null;
    private _bEnlargeReduceButtonsInsideMap = true;
    private _btnIncreaseHeight: HTMLElement = null;
    private _btnDecreaseHeight: HTMLElement = null;
    // get LABEL_REDUCE_DISPLAY: string = _("Reduce"): string {
    //     return _("Reduce")`;
    // }
    private _xPrev: number = null;
    private _yPrev: number = null;
    private _xPrevMid: number = null;
    private _yPrevMid: number = null;
    private _scrolling: boolean = false;
    scrollingTresh: number = 30;
    scrolltoBusy: boolean = false;
    startScrollDuration: number = 5;
    passiveEventListener= {};
    notPassiveEventListener= {};
    loadedSettings: boolean;
    startPosition: Position;
    private _localStorageKey: string;
    private _scrolled: boolean =false;
    private _prevDist: number = -1;
    private _gestureStart: boolean = false;
    private _prevTouchesDist: number;
    private _prevTouchesMiddle: DOMPoint;
    private _custom_css_query: string = null;
    private _isScrolling: number = 0;
    // private _longPressAnim: FrameRequestCallback(time: any, anim?: any) => void;
    private _resetZoom: boolean = false;
    public get _btnIncreaseHeightDefault(): string {
        return `<a class="enlargedisplay">↓  ${_("Reduce")}  ↓</a>`;
    }
    public get _btnDecreaseHeightDefault(): string {
        return `<a class="reducedisplay">↓  ${_("Enlarge")}  ↓</a>`;
    }
    public get _btnMoveLeftDefault(): string {
        return `<i class="moveleft ${this.btnMoveLeftClasses} scrollmap_icon"></i>`;;
    }
    public get _btnMoveTopDefault(): string {
        return `<i class="movetop ${this.btnMoveTopClasses} scrollmap_icon"></i>`;
    }
    public get _btnMoveRightDefault(): string {
        return `<i class="moveright ${this.btnMoveRightClasses} scrollmap_icon"></i>`;
    }
    public get _btnMoveDownDefault(): string {
        return `<i class="movedown ${this.btnMoveDownClasses} scrollmap_icon"></i>`;
    }
    public get _btnZoomPlusDefault(): string {
        return `<i class="zoomplus ${this.btnZoomPlusClasses} scrollmap_icon btn_pos_top_right"></i>`;
    }
    public get _btnZoomMinusDefault(): string {
        return `<i class="zoomminus  ${this.btnZoomMinusClasses} scrollmap_icon btn_pos_top_right"></i>`;
    }
    public get _btnResetDefault(): string {
        return `<i class="reset  ${this.btnResetClasses} scrollmap_icon btn_pos_top_right"></i>`;
    }

    constructor() {        

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

        dijit.Tooltip.prototype.onShow = this.onShowTooltip;             
        Object.defineProperty(dijit.Tooltip.prototype, "onShow", {
            writable: false
        });

        /* Feature detection */

        // Test via a getter in the options object to see if the passive property is accessed
        let passiveEventListener = {};
        let notPassiveEventListener = {};
        try {
            var opts = Object.defineProperty({}, 'passive', {
                get: function() {
                    passiveEventListener = { passive: true, capture:true };
                    notPassiveEventListener = { passive: false };
                    return true;
                }
            });
            window.addEventListener("testPassive", null, opts);
            window.removeEventListener("testPassive", null, opts);
            this.passiveEventListener = passiveEventListener;
            this.notPassiveEventListener = notPassiveEventListener;
        } catch (e) {/**/}
    };

    onShowTooltip(this: typeof dijit.Tooltip): void{
        if (gameui.bHideTooltips && !this.bForceOpening)
            setTimeout(()=>{this.set("state", "DORMANT");});
    };

    create(container_div:HTMLElement, scrollable_div:HTMLElement, surface_div:HTMLElement, onsurface_div:HTMLElement, clipped_div:HTMLElement=null, animation_div:HTMLElement=null, page:any=null, create_extra:Function=null) {
        debug("ebg.scrollmapWithZoom create");
        if (typeof gameui.calcScale == "undefined"){
            dojo.safeMixin(gameui, new ebg.core.core_patch_slideto());
        }

        container_div.classList.add("scrollmap_container");
        if (surface_div)
            surface_div.classList.add("scrollmap_surface");
        if (scrollable_div){
            scrollable_div.classList.add("scrollmap_scrollable");
            surface_div.appendChild(scrollable_div);
        }
        if (onsurface_div){
            onsurface_div.classList.add("scrollmap_onsurface");
            surface_div.appendChild(onsurface_div);
        }
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
        var enl_xpos = "calc(50% + var(--icon_size)/2 + 16px)";

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
                    --scrollmap_height: ;
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


                .scrollmap_container {
                    --icon_size:32px;
                    --icon_font_size:1.7em;
                }


                @media (pointer: coarse) {
                    .scrollmap_container{
                        --icon_size:32px;
                        --icon_font_size:32px;
                    }
                }

                .scrollmap_icon {
                    display: none;
                    position: absolute;
                    vertical-align: middle;
                    text-align: center;
                    overflow: hidden;
                    font-size: var(--icon_font_size);
                    line-height: var(--icon_size);
                    width: var(--icon_size);
                    height: var(--icon_size);
                    margin : 0;
                }

                .reset.fa6-arrows-to-circle {
                    font-size: 25px;
                }
                /**************************
                * positioning of buttons  *
                ***************************/
                .scrollmap_icon.btn_pos_top_right{
                    --index_x: 0;
                    --offset_x: 8px;
                    --offset_y: 8px;
                    --margin_x: 8px;
                    --margin_y: 8px;
                    top: calc((var(--icon_size) + var(--margin_y)) * var(--index_y) + var(--offset_y));
                    right: calc((var(--icon_size) + var(--margin_x)) * var(--index_x) + var(--offset_x));
                }

                .scrollmap_container > .zoomminus.btn_pos_top_right {
                    --index_y: 2;
                }

                .scrollmap_container > .zoomplus.btn_pos_top_right  {
                    --index_y: 1;
                }

                .scrollmap_container > .info.btn_pos_top_right {
                    --index_x: 1;
                    --index_y: 0;
                }

                .scrollmap_container > .reset.btn_pos_top_right {
                    --index_y: 0;
                }

                .scrollmap_footer, .scrollmap_header {
                    text-align: center;
                }

                .scrollmap_container .enlargedisplay,
                .scrollmap_container .reducedisplay {
                    position: absolute;
                    background-color: rgba(255,255,255,0.5);
                    font-size: 110%;
                    line-height: 24px;
                }

                .scrollmap_container .enlargedisplay {
                    left : ${enl_xpos};
                    top: 0px;
                }

                .scrollmap_container .reducedisplay {
                    right : ${enl_xpos};
                    top: 0px;
                }

                /**********************************
                * positioning of fontAwesome icon *
                ***********************************/
                .scrollmap_container > .movetop.fa,
                .scrollmap_container > .moveleft.fa,
                .scrollmap_container > .moveright.fa,
                .scrollmap_container > .movedown.fa{
                    background-color: rgba(255,255,255,0.5);
                    border-radius: 100%;
                }

                .scrollmap_container > .movetop.fa {
                    border-radius: 0 0 100% 100%;
                }

                .scrollmap_container > .moveleft.fa {
                    border-radius: 0 100% 100% 0;
                }

                .scrollmap_container > .moveright.fa {
                    border-radius: 100% 0 0 100%;
                }

                .scrollmap_container > .movedown.fa {
                    border-radius: 100% 100% 0 0;
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
        //var onPointerEnter =this._onPointerEnter.bind(this);
        if (window.PointerEvent){
            //this.surface_div.addEventListener('pointerenter', onPointerDown, this.passiveEventListener);
            this.surface_div.addEventListener('pointerdown', onPointerDown, this.passiveEventListener);
        } else {
            this.surface_div.addEventListener('mousedown', onPointerDown, this.passiveEventListener);
            this.surface_div.addEventListener('touchstart', onPointerDown, this.passiveEventListener);
        }

        this.container_div.addEventListener('wheel', this._onWheel.bind(this), this.notPassiveEventListener);
        var _handleTouch=this._handleTouch.bind(this);
        this.container_div.addEventListener("touchstart", _handleTouch, this.passiveEventListener );
        this.container_div.addEventListener("touchmove", _handleTouch, this.notPassiveEventListener);
        document.addEventListener("touchend", _handleTouch, this.passiveEventListener );
        document.addEventListener("touchcancel", _handleTouch, this.passiveEventListener );

        this.setupOnScreenArrows(this.scrollDelta, this.bScrollDeltaAlignWithZoom);
        this.setupOnScreenZoomButtons(this.zoomDelta);
        if (!this._bEnableZooming)
            this.hideOnScreenZoomButtons();
        this.setupOnScreenResetButtons();
        this.setupEnlargeReduceButtons(this.incrHeightDelta, this.bIncrHeightKeepInPos, this.minHeight);
        if (this._bAdaptHeightAuto || !this._bIncrHeightBtnVisible)
            this.hideEnlargeReduceButtons();
        this.bIncrHeightGlobally = this._bIncrHeightGlobally;
        this.setupInfoButton();
        if (!this._bInfoBtnVisible)
            this.hideInfoButton();
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
        dojo.require("dojo.aspect")
        dojo.aspect.after(scrollmapWithZoom,"updateHeight",(new_height) => {
            this.setDisplayHeight(new_height, false);
        }, true);
    };

    createCompletely(container_div, page=null, create_extra=null, bEnlargeReduceButtonsInsideMap=true) {
        debug("createCompletely");
        var tmplDisplayButtons = String.raw`
            <a class="enlargedisplay">↓  ${_("Enlarge")}  ↓</a>
            <a class="reducedisplay">↑ ${_("Reduce")} ↑</a>
        `;
        var info_id=container_div.id +"_info";

        var tmpl = String.raw`
            <div class="scrollmap_overflow_clipped">
                <div class="scrollmap_scrollable"></div>
                <div class="scrollmap_surface" ></div>
                <div class="scrollmap_onsurface"></div>
            </div>
            <i id=${info_id} class="info fa fa-question scrollmap_icon btn_pos_top_right"></i>
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

        this.create(container_div, scrollable_div, surface_div, onsurface_div, clipped_div, animation_div, page, create_extra);
    };

    _init() {
    };

    _adaptHeight()
    {
        debug("_adaptHeight");
        if (!this.bAdaptHeightAuto)
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
    };

    onResize() {
        if (!this._setupDone) {
            debug("1st onResize after setup");
            this._clearOldSettings();
            this.loadedSettings = this._loadSettings();
            if (!this.loadedSettings) {
                if (this.startPosition)
                    this.scrollto(this.startPosition.x * this.zoom, this.startPosition.y * this.zoom);
                else
                    this.scrollToCenter();
            }
        } else 
            this.scrollto(this.board_x, this.board_y, 0, 0);
        this._setupDone = true;
    };

    _clearOldSettings(){
        let keys = Object.keys(localStorage);
        let oldKeysCnt = 0; 
        let oldest = null;
        let oldestKey = '';
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
    };
    _loadSettings(){
        let settings = JSON.parse(localStorage.getItem(this._localStorageKey));
        if (settings != null){
            debug("_loadSettings", settings.board_x, settings.board_y);
            if (!this.bAdaptHeightAuto && (settings.height!=null)){
                this.bHeightChanged = true;
                this.setDisplayHeight(settings.height);
            }
            this.setMapZoom(settings.zoom);
            if (settings.board_x!=null && settings.board_y!=null){
                this._scrolled = true;
                this.scrollto(settings.board_x, settings.board_y, 0, 0);
                return true;
            }
        }
        return false;
    };
    _saveSettings(){
        debug("_saveSettings", this.board_x, this.board_y);
        let settings = {time:Date.now(), zoom:this.zoom, board_x:this._scrolled?this.board_x:null,
            board_y:this._scrolled?this.board_y:null, height:(this.bAdaptHeightAuto || !this.bHeightChanged)?null:this.getDisplayHeight()};
        localStorage.setItem(this._localStorageKey, JSON.stringify(settings));
    };
    _onvisibilty_changehandler(e) {
        if (document.visibilityState === "hidden") {this._saveSettings();}
    };

    _onbeforeunload_handler(e) {
        this._saveSettings();
    };

    _updatePointers(event) {
        var prevEv;
        if (event.changedTouches) { // TouchEvent
            const changedTouches:Touch[] = Array.from(event.changedTouches);
            changedTouches.forEach( touch => {
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
    };

    _removePointers(event) {
        if (event.changedTouches) { // TouchEvent
            const changedTouches:Touch[] = Array.from(event.changedTouches);
            changedTouches.forEach( touch => {
                const id =  touch.identifier;
                this._pointers.delete(id);
            });
        } else {
            const id =  (event.pointerId) ? event.pointerId : 0;
            this._pointers.delete(id);
        } 
    };

    _getPageZoom() {
        var pageZoom = 1;
        try {
            var pageZoomStr = $("page-content").style.getPropertyValue("zoom");
            if (pageZoomStr !== "")
                pageZoom=parseFloat($("page-content").style.getPropertyValue("zoom"));
        } catch (error) {
             /* empty */ }
        return pageZoom;
    };

    _getXYCoord(ev, ev2?) {
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
    };

    _enableInteractions() {
        if (this._bEnableZooming && this.zoomingOptions.pinchZooming)
            this.container_div.classList.add("enable_zoom_interaction");
        if (this.bEnableScrolling)
            this.container_div.classList.add("enable_pan_interaction");
        // if (this.zoomingOptions.pinchZooming)
        //     this.container_div.style.touchAction = "none";
        // else
        //     this.container_div.style.touchAction = "pinch-zoom";
    };


    _disableInteractions() {
        this.container_div.classList.remove("enable_zoom_interaction");
        this.container_div.classList.remove("enable_pan_interaction");
        // this.container_div.style.touchAction = "auto";
    };

    _enableTooltipsAndClick() {
        if (!this._enabledTooltips){
            gameui.switchDisplayTooltips(false);
            this._enabledTooltips = true;
            this._enableTooltipsAndClickTimerId = null;
        }
        this._enabledClicks = true;
        setTimeout(()=> {this.onsurface_div.removeEventListener('click', this._suppressCLickEvent_handler, true);}, 200);
    };

    _disableTooltipsAndClick(setTimer = false) {
        if (setTimer){
            if (this._enableTooltipsAndClickTimerId != null)
                clearInterval(this._enableTooltipsAndClickTimerId);
            this._enableTooltipsAndClickTimerId = setInterval(this._enableTooltipsAndClick_handler, 500);
        }
        if (this._enabledTooltips && !gameui.bHideTooltips){
            gameui.switchDisplayTooltips(true);
            for (var i in gameui.tooltips) {
                gameui.tooltips[i]._setStateAttr("DORMANT");
            }
            this._enabledTooltips = false;
        }
        if (this._enabledClicks){
            this._enabledClicks = false;
            this.onsurface_div.removeEventListener('click', this._suppressCLickEvent_handler, true);                       
            this.onsurface_div.addEventListener('click',this._suppressCLickEvent_handler, true);
        }
    };

    _suppressCLickEvent(e) {
        this.onsurface_div.removeEventListener('click', this._suppressCLickEvent_handler, true);                       
        e.stopImmediatePropagation();
        e.preventDefault();
        e.stopPropagation();
    };

    _getTouchesDist(e) {
        if (e.touches.length==1)
            return 0;
        else
            return Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
    };

    _getTouchesMiddle(e) {
        if (e.touches.length==1)
            return new DOMPoint(e.touches[0].clientX , e.touches[0].clientY);
        else
            return new DOMPoint(
                (e.touches[0].clientX + e.touches[1].clientX)/2,
                (e.touches[0].clientY + e.touches[1].clientY)/2
            );
    };

    _handleTouch(e) {
        // var i, touch;
        if (e.type !== "touchmove" && e.type !== "touchstart"){
            // if (e.touches.length === 1 && !(this.bEnableScrolling && this.scrollingOptions.bOneFingerScrolling)) {
            //     this._touchInteracting = true;
            //     debug(e.touches.length);
            // }
            if (e.touches.length === 0)
                this._touchInteracting = false;
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
                this._touchInteracting = false;
            this._gestureStart = true;
            const touches:Touch[] = Array.from(e.touches);
            touches.forEach( touch => {
                if (!this.container_div.contains(touch.target as Node))
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
            if (this._touchInteracting) {
                // this._enableInteractions();
                // e.stopImmediatePropagation();
                e.preventDefault();
            } else if (e.touches.length === 1 && !(this.bEnableScrolling && this.scrollingOptions.bOneFingerScrolling)) {
                this._disableInteractions();
                this.container_div.classList.add("scrollmap_warning_touch");
            } else {
                if (this._gestureStart) {
                    this._gestureStart = false;
                    this._touchInteracting = true;
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
                //         this._touchInteracting = true;
                //         debug('start interacting');
                //     }
                    this._enableInteractions();
                    // e.stopImmediatePropagation();
                    // e.preventDefault();
                }
                // debug(this._touchInteracting);
                //this._prevTouchesDist = touchesDist;
                //this._prevTouchesMiddle = touchesMiddle;
            }
        }
    };
    _onPointerEnter(ev) {
        // var new_evt = new PointerEvent("pointerenter", ev);
        // var canceled = !this.onsurface_div.dispatchEvent(new_evt);
    };

    _onPointerDown(ev) {
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
    };

    _onPointerMove(ev) {
        // debug("pointer move");
        // var new_evt = new PointerEvent("pointermove", ev);
        // var canceled = !this.scrollable_div.firstElementChild .dispatchEvent(new_evt);
        // debugger

        this._updatePointers(ev);

        // If one pointer is move, drag the map
        if (this._pointers.size === 1) {
            if (!this.bEnableScrolling || 
                ((ev.pointerType =='touch' || ev.changedTouches) && !this._touchInteracting))
                return;
            if (this._xPrev === null)
                [this._xPrev, this._yPrev] = this._getXYCoord(ev);
            else {
                const [x, y] = this._getXYCoord(ev);
                if (((Math.hypot(x - this._xPrev, y - this._yPrev) > this.scrollingTresh) || this._scrolling) && (!this.scrolltoBusy)){
                    this.scroll(x - this._xPrev, y - this._yPrev, this._scrolling?0:this.startScrollDuration, 0);
                    this._scrolling = true;
                    this._xPrev =x ; this._yPrev = y;
                    this._disableTooltipsAndClick();
                }
            }
            ev.preventDefault();
            //ev.stopImmediatePropagation();
            // for (var i in gameui.tooltips) {
            //     gameui.tooltips[i]._setStateAttr("DORMANT");
            // }
        }
        // If two _pointers are move, check for pinch gestures
        else if (this._pointers.size === 2) {

            // Calculate the distance between the two _pointers
            const it = this._pointers.values();
            const ev1 = it.next().value;
            const ev2 = it.next().value;
            const curDist = Math.hypot(ev2.clientX - ev1.clientX, ev2.clientY - ev1.clientY);
            const [x, y] = this._getXYCoord(ev1, ev2);
            // debug(x, y);
            if (this._prevDist > 0.0) {
                // const diff = curDist - this._prevDist;
                // newZoom = this.zoom * (1 + this.zoomPinchDelta * diff);
                const newZoom = this.zoom * (curDist / this._prevDist);
                if (this._bEnableZooming && this.zoomingOptions.pinchZooming)
                    this.setMapZoom(newZoom, x, y);
                if (this._xPrevMid === null){
                    [this._xPrevMid, this._yPrevMid] = this._getXYCoord(ev1, ev2);
                } else {
                    const scrollingDist = Math.hypot(x - this._xPrevMid, y- this._yPrevMid);
                    if ((scrollingDist > this.scrollingTresh) || this._scrolling) 
                    if (((Math.hypot(x - this._xPrevMid, y - this._yPrevMid) > this.scrollingTresh) || this._scrolling) && !this.scrolltoBusy) {
                        if (this.bEnableScrolling){
                            this.scroll(x - this._xPrevMid, y - this._yPrevMid,  this._scrolling?0:this.startScrollDuration, 0);
                            this._xPrevMid =x ; this._yPrevMid = y;
                            this._scrolling = true;
                        }
                    }
                }
            }
            // Cache the distance for the next move event
            this._prevDist = curDist;
            // this._xPrev = x;
            // this._yPrev = y;
            ev.preventDefault();
            this._disableTooltipsAndClick();
            // for (var i in gameui.tooltips) {
            //     gameui.tooltips[i]._setStateAttr("DORMANT");
            // }
            //ev.stopImmediatePropagation();
        }
    };

    _onPointerUp(ev) {
        this._removePointers(ev);
        // ev.preventDefault();
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
            this._enableTooltipsAndClick();
            this._scrolling = false;
        }

        // If the number of _pointers down is less than two then reset diff tracker
        if (this._pointers.size < 2) {
            this._prevDist = -1;
            this._xPrev = null;
            this._yPrev = null;
            this._xPrevMid = null;
            this._yPrevMid = null;
        }

    };

    _onWheel(evt) {
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
        this._disableTooltipsAndClick(true);
    };

    scroll(dx, dy, duration?, delay?) {
        // debug("scroll", this.board_x, dx, this.board_y, dy);
        this.scrollto(this.board_x + dx, this.board_y + dy, duration, delay);
    };
    
    // Scroll the board to make it centered on given position
    scrollto(x, y, duration?, delay?) {
        if (this._setupDone)
            this._scrolled = true;
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
        this.scrolltoBusy = true;
        setTimeout(()=>{ this.scrolltoBusy = false; }, duration + delay);
    };

    // Scroll map in order to center everything
    // By default, take all elements in movable_scrollmap
    //  you can also specify (optional) a custom CSS query to get all concerned DOM elements
    scrollToCenter(custom_css_query?,  duration?, delay?) {
        const center = this.getMapCenter(custom_css_query);
        this.scrollto(-center.x * this.zoom, -center.y * this.zoom, duration, delay);
        debug("scrollToCenter",center.x, center.y);
        return {
            x: -center.x,
            y: -center.y
        };
    };

    getMapCenter(custom_css_query) {
        if (custom_css_query)
            this._custom_css_query = custom_css_query;
        // Get all elements inside and get their max x/y/w/h
        var max_x = 0;
        var max_y = 0;
        var min_x = 0;
        var min_y = 0;

        var scales = new Map();

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
    };

    changeMapZoom(diff, x = 0, y = 0) {
        const newZoom = this.zoom + diff;
        this.setMapZoom(newZoom, x, y);
    };

    setMapZoom(zoom, x = 0, y = 0) {
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
    };

    _setScale(elemId, scale) {
        $(elemId).style.transform =  'scale(' + scale + ')';
    };

    _getButton(btnNames, idSuffix=""){
        btnNames = btnNames.split(",");
        for(let i in btnNames){
            let btnName = btnNames[i];
            var $btn = null;
            var $querydiv;
            if (idSuffix == "")
                $querydiv = this.container_div;
            else
                $querydiv = document.getElementById(this.container_div.id+idSuffix);
            if ($querydiv !=null) 
                $btn = $querydiv.querySelector('.'+this._classNameSuffix+btnName);
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
    };

    _hideButton(btnNames, idSuffix=""){
        var $btn = this._getButton(btnNames, idSuffix);
        if ($btn !== null)
            $btn.style.display = 'none';
    };

    _showButton(btnNames, idSuffix="", display='block'){
        var $btn = this._getButton(btnNames, idSuffix);
        if ($btn !== null)
            $btn.style.display = display;
        
    };

    _initButton(btnName, defaultButton, onClick, onLongPressedAnim = null, idSuffix="", display='block'){
        var $btn = this._getButton(btnName, idSuffix);
        if ($btn === null && defaultButton!==null){
            this.container_div.insertAdjacentHTML("beforeend",defaultButton);
            $btn = this._getButton(btnName, idSuffix);
        }
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
    };

    //////////////////////////////////////////////////
    //// Long press handling on buttons

    _onButtonLongPress(onLongPressedAnim, evt) {
        // debug("onButtonLongPress");
        var _longPressAnim = (time, anim=onLongPressedAnim) => {
            anim();
            if (this._longPress)
                requestAnimationFrame(_longPressAnim);
        };
        this._longPress = true;
        evt.preventDefault();
        requestAnimationFrame(_longPressAnim);
    };

    _onButtonLongPressEnd(evt) {
        //this.onMoveTop();
        //debug("onButtonLongPressEnd");
        this._longPress = false;
    };

    //////////////////////////////////////////////////
    //// Scroll with buttons

    // Optional: setup on screen arrows to scroll the board
    setupOnScreenArrows(scrollDelta, bScrollDeltaAlignWithZoom = true) {
        debug("setupOnScreenArrows");
        this.scrollDelta = scrollDelta;
        this.bScrollDeltaAlignWithZoom = bScrollDeltaAlignWithZoom;
        if (this.bScrollDeltaAlignWithZoom)
            this._scrollDeltaAlignWithZoom = scrollDelta * this.zoom;
        else
            this._scrollDeltaAlignWithZoom = scrollDelta;
        if (!this._btnMoveTop)
            this._btnMoveTop = this._initButton('movetop', this._btnMoveTopDefault, this._onMoveTop, ()=> {this.scroll(0, 3, 0, 0);});
        if (!this._btnMoveDown)
            this._btnMoveDown = this._initButton('movedown', this._btnMoveDownDefault, this._onMoveDown,  ()=> {this.scroll(0, -3, 0, 0);});
        if (!this._btnMoveLeft)
            this._btnMoveLeft = this._initButton('moveleft', this._btnMoveLeftDefault, this._onMoveLeft,  ()=> {this.scroll(3, 0, 0, 0 );});
        if (!this._btnMoveRight)
            this._btnMoveRight = this._initButton('moveright', this._btnMoveRightDefault, this._onMoveRight, ()=> {this.scroll(-3, 0, 0, 0 );});
    };

    showOnScreenArrows() {
       this._showButton('movetop');
       this._showButton('moveleft');
       this._showButton('moveright');
       this._showButton('movedown');
    };

    hideOnScreenArrows() {
       this._hideButton('movetop');
       this._hideButton('moveleft');
       this._hideButton('moveright');
       this._hideButton('movedown');
    };

    _onMoveTop(evt) {
        //debug("onMoveTop");
        this.scroll(0, this._scrollDeltaAlignWithZoom);
    };

    _onMoveLeft(evt) {
        // debug("onMoveLeft");
        evt.preventDefault();
        this.scroll(this._scrollDeltaAlignWithZoom, 0);
    };

    _onMoveRight(evt) {
        // debug("onMoveRight");
        evt.preventDefault();
        this.scroll(-this._scrollDeltaAlignWithZoom, 0);
    };

    _onMoveDown(evt) {
        // debug("onMoveDown");
        evt.preventDefault();
        this.scroll(0, -this._scrollDeltaAlignWithZoom);
    };

    isVisible(x, y) {
        const s = window.getComputedStyle(this.container_div);
        const width = parseFloat(s.width);
        const height = parseFloat(s.height);

        if (x >= (-this.board_x - width / 2) && x <= (-this.board_x + width / 2)) {
            if (y >= (-this.board_y - height / 2) && y < (-this.board_y + height / 2)) {
                return true;
            }
        }

        return false;
    };

    ///////////////////////////////////////////////////
    ///// Enable / disable scrolling
    enableScrolling() {
        if (!this.bEnableScrolling) {
            this.bEnableScrolling = true;
        }
        this.showOnScreenArrows();
    };

    disableScrolling() {
        if (this.bEnableScrolling) {
            this.bEnableScrolling = false;
        }
        // hide arrows
        this.hideOnScreenArrows();
    };

    //////////////////////////////////////////////////
    //// Zoom with buttons
    setupOnScreenZoomButtons(zoomDelta = 0.2) {
        debug("setupOnScreenZoomButtons");
        this.zoomDelta = zoomDelta;

        if (!this._btnZoomPlus)
            this._btnZoomPlus = this._initButton(this._btnZoomPlusNames, this._btnZoomPlusDefault, this._onZoomIn, ()=> {this.changeMapZoom(0.02);});
        if (!this._btnZoomMinus)
            this._btnZoomMinus = this._initButton(this._btnZoomMinusNames, this._btnZoomMinusDefault, this._onZoomOut, ()=> {this.changeMapZoom(-0.02);});

        //this.showOnScreenZoomButtons();

    }

    showOnScreenZoomButtons() {
       this._showButton(this._btnZoomPlusNames);
       this._showButton(this._btnZoomMinusNames);
    };

    hideOnScreenZoomButtons() {
        this._hideButton(this._btnZoomPlusNames);
        this._hideButton(this._btnZoomMinusNames);
    };

    _onZoomIn(evt) {
        evt.preventDefault();
        this.changeMapZoom(this.zoomDelta);
    };

    _onZoomOut(evt) {
        evt.preventDefault();
        this.changeMapZoom(-this.zoomDelta);
    };

    //////////////////////////////////////////////////
    //// Reset with buttons
    setupOnScreenResetButtons(resetZoom = false) {
        this._resetZoom = resetZoom;
        debug("setupOnScreenResetButtons");
        if (!this._btnReset)
            this._btnReset = this._initButton(this._btnResetNames, this._btnResetDefault, this._onReset);
        // this.showOnScreenResetButtons();
    };

    showOnScreenResetButtons() {
        this._showButton(this._btnResetNames);
    };

    hideOnScreenResetButtons() {
        this._hideButton(this._btnResetNames);
    };

    _onReset(evt) {
        if (this._resetZoom)
            this.setMapZoom(this.defaultZoom);
        if (this.defaultPosition)
            this.scrollto(this.defaultPosition.x * this.zoom, this.defaultPosition.y * this.zoom);
        else
            this.scrollToCenter();
    };

    //////////////////////////////////////////////////
    //// Increase/decrease display height with buttons
    _getEnlargeReduceButtonsProps(bInsideMap) {
        var idSuffix="", display='block';
        if (!bInsideMap){
            idSuffix="_header", display='initial';
        }
        return {idSuffix, display};
    };

    _setupEnlargeReduceButtons(bInsideMap) {
        var btnsProps = this._getEnlargeReduceButtonsProps(bInsideMap);
        if (!this._btnIncreaseHeight)
            this._btnIncreaseHeight = this._initButton('enlargedisplay', bInsideMap ? this._btnIncreaseHeightDefault : null, this._onIncreaseDisplayHeight, ()=> {this.changeDisplayHeight(5);}, btnsProps.idSuffix, btnsProps.display);

        if (!this._btnDecreaseHeight)
            this._btnDecreaseHeight =  this._initButton('reducedisplay', bInsideMap ? this._btnDecreaseHeightDefault : null, this._onDecreaseDisplayHeight, ()=> {this.changeDisplayHeight(-5);}, btnsProps.idSuffix, btnsProps.display);    
        if (this._btnDecreaseHeight || this._btnIncreaseHeight){
            this._bEnlargeReduceButtonsInsideMap = true;
            return true;
        }
        return false;
    };


    setupEnlargeReduceButtons(incrHeightDelta, bIncrHeightKeepInPos, minHeight) {
        debug("setupEnlargeReduceButtons");

        if (!this._setupEnlargeReduceButtons(false)){
            this._setupEnlargeReduceButtons(true);
        }

        this.incrHeightDelta = incrHeightDelta;
        this.bIncrHeightKeepInPos = bIncrHeightKeepInPos;
        this.minHeight = minHeight;
    };

    showEnlargeReduceButtons() {
        var btnsProps = this._getEnlargeReduceButtonsProps(this._bEnlargeReduceButtonsInsideMap);
        this._showButton("enlargedisplay", btnsProps.idSuffix, btnsProps.display);
        this._showButton("reducedisplay", btnsProps.idSuffix, btnsProps.display);
    };

    hideEnlargeReduceButtons() {
        var btnsProps = this._getEnlargeReduceButtonsProps(this._bEnlargeReduceButtonsInsideMap);
        this._hideButton("enlargedisplay", btnsProps.idSuffix);
        this._hideButton("reducedisplay", btnsProps.idSuffix);
    };

    _onIncreaseDisplayHeight(evt) {
        evt.preventDefault();
        this.changeDisplayHeight(this.incrHeightDelta);
    };

    _onDecreaseDisplayHeight(evt) {
        evt.preventDefault();
        this.changeDisplayHeight(- this.incrHeightDelta);
    };

    changeDisplayHeight(delta) {
        this.bHeightChanged = true;
        var current_height = this.getDisplayHeight();
        this.setDisplayHeight(current_height+delta);
    };
    setDisplayHeight(new_height, dispatch:boolean=true) {
        var current_height = this.getDisplayHeight();
        new_height = Math.max(new_height, this.minHeight);
        if (this.bIncrHeightKeepInPos)
            this.board_y += (current_height-new_height)/2;
        this.container_div.style.setProperty("--scrollmap_height", new_height+'px');
        this.container_div.style.height =  'var(--scrollmap_height)';
        if (this.bIncrHeightGlobally){
            if (dispatch){
                scrollmapWithZoom.updateHeight(new_height);
            };
        }
    }
    static updateHeight(new_height: any) {
    }
;
    getDisplayHeight() {
        return parseFloat(window.getComputedStyle(this.container_div).height);
    };
    //////////////////////////////////////////////////
    //// Info button
    setupInfoButton(bConfigurableInUserPreference = false) {
        if (!this._btnInfo){
            var $btn = this._getButton("info");
            if ($btn === null){
                var info_id=this.container_div.id +"_info";
                var btnInfoDefault = `<i id=${info_id} class="info fa fa-question scrollmap_icon btn_pos_top_right"></i>`;
                this.container_div.insertAdjacentHTML("beforeend", btnInfoDefault);
                $btn = this._getButton("info");
            }
            this._btnInfo = $btn;
        }                
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
    };

    showInfoButton() {
        this._showButton("info");
    };

    hideInfoButton() {
        var btnsProps = this._getEnlargeReduceButtonsProps(this._bEnlargeReduceButtonsInsideMap);
        this._hideButton("info");
    };

    setInfoButtonTooltip() {
        var info = _('To scroll/pan: maintain the mouse button or 2 fingers pressed and move.');
        info += '<BR><BR>'+_('another way is to press the scroll/pan buttons (long press : continious scroll/pan).');
        if (this._bEnableZooming)
            info += '<BR><BR>'+_('To zoom: use the scroll wheel (with alt or ctrl or shift key) or pinch fingers.');
        if (this._bEnableZooming)
            info += '<BR><BR>'+_('another way is to press the zoom buttons (long press : continious zoom).');
        if (this._bConfigurableInUserPreference)
            info += _('This is configurable in user preference.');
        if (gameui!=null){

            gameui.addTooltip( this._btnInfo.id, info, '', 10);
            gameui.tooltips[this._btnInfo.id].bForceOpening = true;
        } else
            return info;
    }

}

dojo.require( "dojo.has" );
dojo.has.add('config-tlmSiblingOfDojo', 0, 0, 1);
define([
    "dojo", "dojo/_base/declare", "dijit/Tooltip", "dojo/aspect", "./long-press-event", "./core_patch_slideto"
], function() {ebg.scrollmapWithZoom=scrollmapWithZoom; return { scrollmapWithZoom};});