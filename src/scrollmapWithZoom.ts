/*global gameui, dojo, dijit*/
declare const define: Function;
declare const ebg: any;
declare const $: Function;
declare const dojo: any;
declare const dijit: any;
declare function _(str: string): string
declare function __(lanf: string, str: string): string
declare const g_gamethemeurl: string;
declare const gameui: any;
declare const toint: Function;
declare const aspect: any;

type _optionsChangedT = {
    bWheelZooming ? : boolean;
    wheelZooming ? : number;
    pinchZooming ? : boolean;
    btnsDivOnMap ? : boolean;
    btnsDivPositionOutsideMap ? : string;
    btns_visible ? : boolean;
    bRevertArrowsScroll ? : boolean;
    bOneFingerScrolling ? : boolean;
    bShowMoveCursor ? : boolean;
    bAutoCompensatePanelsHeight ? : boolean;
    bAutoCompensateChatIcon ? : boolean;
    bRestoreScrollPosition ? : boolean;
    bRestoreZoom ? : boolean;
    bUseOldTouchAndMouseEvent ? : boolean
};

interface Position {
    x: number;
    y: number;
}

/*
ScrollmapWithZoom version-x.x.x : Improved version of scrollmap used in multiple bga game
https://github.com/yansnow78/bga_scrollmap.git

# improvements
- add zoom capabilities
- add possibility to adjust pan delta to tile size when clicking on arrows
- add posbility to move buttons outside of the scrollable area by setting :
    btnsDivOnMap = false;
	btnsDivPositionOutsideMap = ScrollmapWithZoom.btnsDivPositionE.Right
- allow zoom with scroll Wheel
- allow zoom with keys
- allow pan/scrool and pinch zoom on smartphone
- allow pan/scrool with keys
- make clickable area of buttons a bit bigger on smartphone
- zooming with buttons doesn't drift the board anymore
- improve animation between game board and player bards tanks to an animation_div
- add support to long click on buttons/keys (continuous scroll or zoom or enlarge/reduce until button/keys released)
- add possibility to disable or select which key need to be pressed when zooming with wheel
- only allow 2 fingers scrolling by default, one finger is for page scrolling
- only allow zoom with wheel if alt or ctrl or shift are pressed by default, wheel+no key pressed scroll the page as usual.
- keep in memory zoom, pos for each game table between sessions via localStore
- adapt height automatically when adaptHeightAuto is set
- allow tooltips on any scrollmap layer
- ...
 * Coded by yannsnow
 * */
namespace ScrollmapWithZoomNS {
    class AppStorage {
        type: string = 'localStorage';
        constructor(type: string = 'localStorage') {
            this.type = type
        }
        getItem(key: string) {
            try {
                return (window[ < any > this.type] as unknown as Storage).getItem(key);
            } catch (e) {
                return null;
            }
        }

        removeItem(key: string) {
            try {
                (window[ < any > this.type] as unknown as Storage).removeItem(key);
            } catch (e) {}
            return;
        }

        setItem(key: string, value: string) {
            try {
                (window[ < any > this.type] as unknown as Storage).setItem(key, value);
            } catch (e) {}
            return;
        }

        storageAvailable(type: string) {
            let storage: Storage;
            try {
                storage = window[ < any > type] as unknown as Storage;
                const x = '__storage_test__';
                storage.setItem(x, x);
                storage.removeItem(x);
                return true;
            } catch (e) {
                return false;
            }
        }
    }

    //ScrollmapWithZoom.localStorageGameKey + ".en
    class Logger {
        localStorageKey: string = null;
        private _enPersistentLoaded: boolean = false;
        private _enViaHash: boolean = (window.location.hash.substring(1).split(',').includes('debugSWZ'));
        private _en: boolean = this._enViaHash;
        public set enPersistent(en: boolean) {
            if (!this.localStorageKey)
                throw "unknown localStorageKey";
            if (en != null)
                appLocalStorage.setItem(this.localStorageKey, en.toString());
            else
                appLocalStorage.removeItem(this.localStorageKey);
            this._en = en;
        };
        public set en(en: boolean) {
            this._en = en;
        };
        public get en(): boolean {
            if (!this._enViaHash) {
                if (!this._enPersistentLoaded) {
                    if (this.localStorageKey) {
                        var en = appLocalStorage.getItem(this.localStorageKey)
                        if (en !== null)
                            this._en = (en === "true");
                        this._enPersistentLoaded = true;
                    }
                }
            }
            return this._en;
        };
        public get log(): Function {
            return this.en ? console.debug.bind(window.console) : () => {};
        };
    }

    let appLocalStorage = new AppStorage();
    let debugSWZ = new Logger();
    export class ScrollmapWithZoom {
        version: String = 'version-x.x.x';
        public static get debugEnPersistent(): boolean {
            return debugSWZ.enPersistent;
        };
        public static set debugEnPersistent(en: boolean) {
            debugSWZ.enPersistent = en;
        };
        public static get debugEn(): boolean {
            return debugSWZ.en;
        };
        public static set debugEn(en: boolean) {
            debugSWZ.en = en;
        };
        public static get debug(): Function {
            if (!debugSWZ.localStorageKey && gameui)
                debugSWZ.localStorageKey = 'scrollmap_settings_' + gameui.game_id + '.debugEn';
            /*if (!debugSWZ.localStorageKey)
                return () => {};*/
            return debugSWZ.log;
        };
        private static count: number = 0;
        private static instances: Map < string,
        ScrollmapWithZoom > = new Map < string,
        ScrollmapWithZoom > ();
        private static _form: HTMLFormElement;
        private static _formDialog: any;
        private static _core_patched: boolean = false;
        /**
         * board properties
         */
        board_x: number = 0;
        board_y: number = 0;
        startPosition: Position = null;
        container_div: HTMLElement = null;
        container_subdiv: HTMLElement = null;
        scrollable_div: HTMLElement = null;
        surface_div: HTMLElement = null;
        onsurface_div: HTMLElement = null;
        clipped_div: HTMLElement = null;
        animation_div: HTMLElement = null;

        /**
         * zoom properties
         */
        zoom: number = 1;
        maxZoom: number = 2;
        minZoom: number = 0.1;
        defaultZoom: number = null;
        zoomingOptions: {
            bWheelZooming: boolean,
            wheelZooming: number;pinchZooming: boolean;
        } = {
            bWheelZooming: true,
            wheelZooming: ScrollmapWithZoom.wheelZoomingKeys.Alt,
            pinchZooming: true
        };
        zoomChangeHandler: Function = null;

        zoomPinchDelta: number = 0.005;
        zoomWheelDelta: number = 0.001;
        zoomDelta: number = 0.2;

        public get bEnableZooming(): boolean {
            return this._bEnableZooming;
        }
        public set bEnableZooming(value: boolean) {
            this._bEnableZooming = value;
            if (!this.container_div)
                return;
            if (!this._bEnableZooming) {
                this.hideOnScreenZoomButtons();
                SWZ.debug("bEnableZooming is false, hide zoom buttons");
            }
            var warning_touch = _("Use two fingers to begin moving the board. ");
            if (this._bEnableZooming)
                warning_touch += _("Pinch fingers to zoom");
            this.container_div.setAttribute("warning_touch", warning_touch);
            var keysStr = this.getWheelZoomingOptionTranslated();
            this.container_div.setAttribute("warning_scroll", dojo.string.substitute(_("Use ${keys} + Mouse Wheel to zoom the board"), { keys: keysStr }));
        }
        bRestoreZoom: boolean = true;

        /** 
         * scrolling properties
         */
        bEnableScrolling: boolean = true;
        scrollingOptions: {
            bOneFingerScrolling: boolean;
            bShowMoveCursor: boolean;
            bUseOldTouchAndMouseEvent: boolean;
        } = {
            bOneFingerScrolling: false,
            bShowMoveCursor: true,
            bUseOldTouchAndMouseEvent: false
        };
        bScrollDeltaAlignWithZoom: boolean = true;
        bRestoreScrollPosition: boolean = true;
        scrollDelta: number = 100;
        scrollingTresh: number = 30;
        defaultPosition: Position = null;
        centerPositionOffset: Position = {
            x: 0,
            y: 0
        };
        centerCssQuery: string = null;
        centerCalcUseAlsoOnsurface: boolean = true;
        public get bRevertArrowsScroll(): boolean {
            return this._bRevertArrowsScroll;
        }
        public set bRevertArrowsScroll(value: boolean) {
            if (this._bRevertArrowsScroll != value) {
                this._scrollDeltaAlignWithZoom = -this._scrollDeltaAlignWithZoom;
                this._longPressScrollOriented = -this._longPressScrollOriented;
            }
            this._bRevertArrowsScroll = value;
        }
        /** 
         * resizing properties
         */
        public defaultHeight: number = 0;
        public set minHeight(value: number) {
            this._orig_minHeight = value;
            this._minHeight = value;
            if (this.container_div)
                this._RepositionButtonsDiv();
        }
        public get minHeight(): number {
            return this._orig_minHeight;
        }
        incrHeightGlobalKey: string = null;
        incrHeightDelta: number = 100;
        bIncrHeightKeepInPos: boolean = true;
        bSaveHeight: boolean = true;
        bAdaptHeightAutoCompensateChatIcon: boolean = true;
        bAdaptHeightAutoCompensatePanelsHeight: boolean = false;
        bAdaptHeightAutoCompensateDivsAbove: boolean = true;
        public get bAdaptHeightAuto(): boolean {
            return this._bAdaptHeightAuto;
        }
        public set bAdaptHeightAuto(value: boolean) {
            this._bAdaptHeightAuto = value;
            if (!this.container_div)
                return;
        }
        public set adaptHeightCorrDivs(value) {
            this._adaptHeightCorrDivs = value;
            for (let i = 0; i < this.adaptHeightCorrDivs.length; i++) {
                if (this._resizeHeadersObserver)
                    this._resizeHeadersObserver.observe(this.adaptHeightCorrDivs[i]);
            }
        }
        public get adaptHeightCorrDivs() {
            return this._adaptHeightCorrDivs;
        }
        public get bIncrHeightGlobally(): boolean {
            return this._bIncrHeightGlobally;
        }
        public set bIncrHeightGlobally(value: boolean) {
            this._bIncrHeightGlobally = value;
            if (!this.container_div)
                return;
            if (this._bIncrHeightGlobally) {
                if (!document.body.style.getPropertyValue("--scrollmap_height"))
                    document.body.style.setProperty("--scrollmap_height", this.getDisplayHeight() + 'px');
                this.container_div.style.height = 'var(--scrollmap_height)';
            }
        }
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
        public get bIncrHeightBtnIsShort(): boolean {
            return this._bIncrHeightBtnIsShort;
        }
        public set bIncrHeightBtnIsShort(value: boolean) {
            this._bIncrHeightBtnIsShort = value;
        }
        public get bIncrHeightBtnGroupedWithOthers(): boolean {
            return this._bIncrHeightBtnGroupedWithOthers;
        }
        public set bIncrHeightBtnGroupedWithOthers(value: boolean) {
            this._bIncrHeightBtnGroupedWithOthers = value;
        }
        adaptHeightCorr: number = 0;
        public get bInfoBtnVisible(): boolean {
            return this._bInfoBtnVisible;
        }

        /**
         * enable/disble keys
         */
        public static get bEnableKeys(): boolean {
            return ScrollmapWithZoom._bEnableKeys;
        }
        public static set bEnableKeys(value: boolean) {
            ScrollmapWithZoom._bEnableKeys = value && (ScrollmapWithZoom.count == 1);
            for (let inst of ScrollmapWithZoom.instances.values()) {
                inst.setInfoButtonTooltip();
            }
        }
        bEnableKeysArrows: boolean = true;
        bEnableKeysPlusMinus: boolean = true;
        bEnableKeyHome: boolean = true;
        bEnableKeyEnd: boolean = true;
        /**
         * enable/disble long press on buttons
         */
        bEnableLongPress: boolean = true;

        /**
         * info button
         */
        public set bInfoBtnVisible(value: boolean) {
            this._bInfoBtnVisible = value;
            if (!this.container_div)
                return;
            if (!this._bInfoBtnVisible) {
                this.hideInfoButton();
            }
        }

        /**
         * buttons default classes
         */
        btnMoveRightClasses: string = 'fa fa-chevron-right';
        btnMoveLeftClasses: string = 'fa fa-chevron-left';
        btnMoveTopClasses: string = 'fa fa-chevron-up';
        btnMoveDownClasses: string = 'fa fa-chevron-down';
        btnZoomPlusClasses: string = 'fa fa-search-plus';
        btnZoomMinusClasses: string = 'fa fa-search-minus';
        btnResetClasses: string = 'fa6-solid fa6-arrows-to-dot';
        btnZoomToFitClasses: string = 'fa6-solid fa6-maximize';
        btnResetHeightClasses: string = 'fa6-solid fa6-arrows-up-down';
        btnMaximizeHeightClasses: string = '';
        btnIncreaseHeightClasses: string = 'fa6-solid fa6-arrow-down';
        btnDecreaseHeightClasses: string = 'fa6-solid fa6-arrow-up';
        btnToggleButtonsVisibilityClasses: string = "fa6-solid fa6-gear";
        btnSettingsClasses: string = "fa fa-bars";
        btnInfoClasses: string = 'fa fa-question';
        btnsDivClasses: string = 'scrollmap_btns_flex';
        btnMoveRightHtml: string = null;
        btnMoveLeftHtml: string = null;
        btnMoveTopHtml: string = null;
        btnMoveDownHtml: string = null;
        btnZoomPlusHtml: string = null;
        btnZoomMinusHtml: string = null;
        btnResetHtml: string = null;
        btnInfoHtml: string = null;
        btnZoomToFitHtml: string = null;
        btnIncreaseHeightHtml: string = null;
        btnDecreaseHeightHtml: string = null;
        btnIncreaseHeightShortHtml: string = null;
        btnDecreaseHeightShortHtml: string = null;
        btnResetHeightHtml: string = null;
        btnMaximizeHeightHtml: string = null;
        btnToggleButtonsVisibilityHtml: string = null;
        btnSettingsHtml: string = null;


        btnsDivPositionnable: boolean = true;
        btnsDivOnMap: boolean = true;
        btns2DivOnMap: boolean = true;
        btnsDivPositionOutsideMap: string = ScrollmapWithZoom.btnsDivPositionE.Right;
        btnsPositionClasses: string = 'btn_pos_top_right';
        btns2PositionClasses: string = '';
        btnsBackgroundColor: string = 'rgba(255,255,255,0.5)';
        btnsMarginX: string = '0px';
        btnsMarginY: string = '0px';
        btnsOffsetX: string = '8px';
        btnsOffsetY: string = '8px';
        btnsOutsideMapOffsetX: string = '8px';
        btnsOutsideMapOffsetY: string = '8px';
        btnsSize: string = '20px';
        btnsFontSize: string = '20px';
        btnsAroundSize: string = '6px';
        public get longPressScroll(): number {
            return this._longPressScroll;
        }
        public set longPressScroll(value: number) {
            if (this._bRevertArrowsScroll) {
                this._longPressScrollOriented = -value;
            }
            this._longPressScroll = value;
        }
        longPressZoom: number = 0.01;

        protected static _optionsChanged: _optionsChangedT = {};
        protected _cover_arrows: boolean = null;
        protected _x_extra_l: number = null;
        protected _x_extra_r: number = null;
        protected _y_extra_u: number = null;
        protected _y_extra_d: number = null;
        protected _prevZoom: number = 1;
        protected _bEnableZooming: boolean = true;
        protected _scrollDeltaAlignWithZoom: number = 0;
        protected _longPressScrollAlignWithZoom: number = 0;
        protected _bHeightChanged: boolean = false;
        protected _bMaxHeight: boolean = false;
        protected _minHeight: number = 300;
        protected _orig_minHeight: number = 300;
        protected _bAdaptHeightAuto: boolean = false;
        protected _adaptHeightCorrDivs: Array < HTMLDivElement > = [];
        protected _bIncrHeightGlobally: boolean = false;
        protected _bIncrHeightBtnVisible: boolean = true;
        protected _bIncrHeightBtnIsShort = true;
        protected _bIncrHeightBtnGroupedWithOthers = true;
        protected _bInfoBtnVisible: boolean = true;
        protected _bBtnsVisible: boolean = true;
        protected _pointers: Map < number,
        any > = new Map();
        protected _classNameSuffix: string = '';
        protected _longPress: boolean = false;
        // protected _longKeyPress: boolean = false;
        protected _keysPressed: Map < string,
        any > = new Map();
        protected static _bEnableKeys: boolean = true;
        protected _enableTooltipsAndClickTimerId: number = null;
        protected _enabledTooltips: boolean = true;
        protected _enabledClicks: boolean = true;
        protected _enableTooltipsAndClick_handler: (this: HTMLElement, ev: MouseEvent) => any = this._enableTooltipsAndClick.bind(this);
        protected _resizeObserver: ResizeObserver = (typeof ResizeObserver !== 'undefined') ? new ResizeObserver(entries => {
            this._onResize();
        }) : null;
        protected _resizeHeadersObserver: ResizeObserver = (typeof ResizeObserver !== 'undefined') ? new ResizeObserver(entries => {
            this.adaptHeight();
        }) : null;
        protected _onpointerdown_handler: (this: HTMLElement, ev: MouseEvent) => any = this._onPointerDown.bind(this);
        protected _onpointermove_handler: (this: HTMLElement, ev: MouseEvent) => any = this._onPointerMove.bind(this);
        protected _onpointerup_handler: (this: HTMLElement, ev: MouseEvent) => any = this._onPointerUp.bind(this);
        protected _onpointerup_handled: boolean = false;
        protected _onpointemove_handled: boolean = false;
        protected _suppressCLickEvent_handler: (this: HTMLElement, ev: MouseEvent) => any = this._suppressCLickEvent.bind(this);
        protected _touchInteracting: boolean = false;
        protected _setupDone: boolean = false;
        protected _zoomFitCalledDuringSetup: boolean = false;
        protected _adaptHeightDone: boolean = false;
        protected _titleHeight: number = 0;
        protected _bConfigurableInUserPreference: boolean = false;
        protected _btnMoveRight: HTMLElement = null;
        protected _btnMoveLeft: HTMLElement = null;
        protected _btnMoveTop: HTMLElement = null;
        protected _btnMoveDown: HTMLElement = null;
        protected _btnZoomPlus: HTMLElement = null;
        protected _btnZoomMinus: HTMLElement = null;
        protected _btnReset: HTMLElement = null;
        protected _btnInfo: HTMLElement = null;
        protected _btnZoomToFit: HTMLElement = null;
        protected _btnIncreaseHeight: HTMLElement = null;
        protected _btnDecreaseHeight: HTMLElement = null;
        protected _btnResetHeight: HTMLElement = null;
        protected _btnMaximizeHeight: HTMLElement = null;
        protected _btnToggleButtonsVisiblity: HTMLElement = null;
        protected _btnZoomPlusNames: string = 'zoomplus,zoom_plus,zoomin,zoom_in';
        protected _btnZoomMinusNames: string = 'zoomminus,zoom_minus,zoomout,zoom_out';
        protected _btnResetNames: string = 'reset,back_to_center,reset_map,map_reset,center,movehome';
        protected _btnZoomToFitNames: string = 'zoomtofit,fullscreen';
        protected _btnIncreaseHeightNames = "enlargedisplay";
        protected _btnDecreaseHeightNames = "reducedisplay,shrinkdisplay";
        protected _bEnlargeReduceButtonsInsideMap = true;
        protected _buttons_div: HTMLElement = null;
        protected _buttons_div2: HTMLElement = null;
        protected _buttons_divs_wrapper: HTMLElement = null;

        // get LABEL_REDUCE_DISPLAY: string = _("Reduce"): string {
        //     return _("Reduce")`;
        // }
        protected _loaded_x: number = null;
        protected _loaded_y: number = null;
        protected _xPrev: number = null;
        protected _yPrev: number = null;
        protected _xPrevMid: number = null;
        protected _yPrevMid: number = null;
        protected _scrolling: boolean = false;
        protected _scrolltoBusy: boolean = false;
        protected _startScrollAnimDuration: number = 5;
        protected _passiveEventListener = {};
        protected _notPassiveEventListener = {};
        protected _loadedSettings: boolean = false;
        public static localStorageGameKey: string;
        protected _localStorageKey: string;
        protected _localStorageOldKey: string;
        protected _scrolled: boolean = false;
        protected _prevDist: number = -1;
        protected _gestureStart: boolean = false;
        protected _prevTouchesDist: number;
        protected _prevTouchesMiddle: DOMPoint;
        protected _isScrolling: number = 0;
        // protected _longPressAnim: FrameRequestCallback(time: any, anim?: any) => void;
        protected _resetMode: ScrollmapWithZoom.ResetMode = ScrollmapWithZoom.ResetMode.Scroll;
        protected _bRevertArrowsScroll: boolean = false;
        protected _longPressScroll: number = 3;
        protected _longPressScrollOriented: number = 3;

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
            const descr = Object.getOwnPropertyDescriptor(dijit.Tooltip.prototype, "onShow");
            if (descr.writable) {
                dijit.Tooltip.prototype.onShow = ScrollmapWithZoom.onShowTooltip;
                Object.defineProperty(dijit.Tooltip.prototype, "onShow", {
                    writable: false
                });
            }

            /* Feature detection */

            // Test via a getter in the options object to see if the passive property is accessed
            let passiveEventListener = {};
            let notPassiveEventListener = {};
            try {
                var opts = Object.defineProperty({}, 'passive', {
                    get: function() {
                        passiveEventListener = {
                            passive: true,
                            capture: true
                        };
                        notPassiveEventListener = {
                            passive: false
                        };
                        return true;
                    }
                });
                window.addEventListener("testPassive", null, opts);
                window.removeEventListener("testPassive", null, opts);
                this._passiveEventListener = passiveEventListener;
                this._notPassiveEventListener = notPassiveEventListener;
            } catch (e) {
                /**/
            }
        }

        protected static onShowTooltip(this: typeof dijit.Tooltip): void {
            if (gameui.bHideTooltips && !this.bForceOpening)
                setTimeout(() => {
                    this.set("state", "DORMANT");
                });
        }

        create(container_div: HTMLElement, scrollable_div: HTMLElement, surface_div: HTMLElement, onsurface_div: HTMLElement, clipped_div: HTMLElement = null, animation_div: HTMLElement = null, page: object = null, create_extra: Function = null) {
            ScrollmapWithZoom.localStorageGameKey = 'scrollmap_settings_' + gameui.game_id;
            SWZ.debug("ebg.ScrollmapWithZoom create");
            if (typeof gameui.bUseRelPosForObjPos == "undefined")
                gameui.bUseRelPosForObjPos = true;
            ScrollmapWithZoom.count++;
            ScrollmapWithZoom.instances.set(container_div.id, this);
            ScrollmapWithZoom.bEnableKeys = ScrollmapWithZoom._bEnableKeys;
            if (!ScrollmapWithZoom._core_patched) {
                dojo.safeMixin(gameui, new ebg.core.core_patch_slideto());
                ScrollmapWithZoom._core_patched = true;
            }

            if (surface_div)
                surface_div.classList.add("scrollmap_surface");
            if (onsurface_div) {
                onsurface_div.classList.add("scrollmap_onsurface");
                surface_div.insertBefore(onsurface_div, surface_div.firstElementChild);
            }
            if (scrollable_div) {
                scrollable_div.classList.add("scrollmap_scrollable");
                surface_div.insertBefore(scrollable_div, surface_div.firstElementChild);
            }
            if (!animation_div) {
                animation_div = document.createElement('div');
                container_div.insertBefore(animation_div, container_div.firstElementChild);
            }
            animation_div.classList.add("scrollmap_anim");
            if (!clipped_div) {
                clipped_div = document.createElement('div');
                container_div.insertBefore(clipped_div, animation_div);
            }
            clipped_div.classList.add("scrollmap_overflow_clipped");


            container_div.classList.add("scrollmap_container");
            var container_subdiv = document.createElement('div');
            container_subdiv.classList.add("scrollmap_container_subdiv");
            Array.from(container_div.children).forEach((child) => {
                container_subdiv.appendChild(child);
            });
            container_div.insertBefore(container_subdiv, null);

            Array.from(container_subdiv.children).forEach((child) => {
                //let child = children[i]; //second console o
                if (!child.classList.contains("scrollmap_anim") && !child.classList.contains("scrollmap_overflow_clipped"))
                    clipped_div.appendChild(child);
            });
            onsurface_div.style.opacity = "0";
            scrollable_div.style.opacity = "0";
            animation_div.style.opacity = "0";

            // clipped_div.appendChild(surface_div);
            this.container_div = container_div;
            this.container_subdiv = container_subdiv;
            this.scrollable_div = scrollable_div;
            this.surface_div = surface_div;
            this.onsurface_div = onsurface_div;
            this.clipped_div = clipped_div;
            this.animation_div = animation_div;

            this._createForm();
            this.btnIncreaseHeightHtml ??= `<a class="enlargedisplay enlarge_or_reduce_as_text">↓  ${_("Enlarge")}  ↓</a>`;
            this.btnDecreaseHeightHtml ??= `<a class="reducedisplay enlarge_or_reduce_as_text">↑  ${_("Reduce")}  ↑</a>`
            this.btnIncreaseHeightShortHtml ??= `<i class="enlargedisplay scrollmap_icon ${this.btnIncreaseHeightClasses}"></i>`;
            this.btnDecreaseHeightShortHtml ??= `<i class="reducedisplay scrollmap_icon ${this.btnDecreaseHeightClasses}"></i>`
            this.btnResetHeightHtml ??= `<i class="reset_height scrollmap_icon ${this.btnResetHeightClasses}"></i>`
            this.btnMaximizeHeightHtml ??= this.btnMaximizeHeightClasses ? `<i class="maximize_height scrollmap_icon ${this.btnMaximizeHeightClasses}"></i>` :
                `<svg class="maximize_height scrollmap_icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 11 18.75" x="0px" y="0px">
                <title>${_("Maximize Height")}</title>
                <g><path d="M5.146,11.853a.518.518,0,0,0,.163.109.5.5,0,0,0,.382,0,.518.518,0,0,0,.163-.109l4-4a.5.5,0,0,0-.708-.708L6,10.293V.5a.5.5,0,0,0-1,0v9.793L1.854,7.146a.5.5,0,0,0-.708.708Z"/><path d="M10.5,14H.5a.5.5,0,0,0,0,1h10a.5.5,0,0,0,0-1Z"/></g>
                <text x="0" y="30" fill="#000000" font-size="5px" font-weight="bold" font-family="'Helvetica Neue', Helvetica, Arial-Unicode, Arial, Sans-serif">Created by syarip yunus</text>
                <text x="0" y="35" fill="#000000" font-size="5px" font-weight="bold" font-family="'Helvetica Neue', Helvetica, Arial-Unicode, Arial, Sans-serif">from the Noun Project</text>
                </svg>`;
            this.btnMoveLeftHtml ??= `<i class="moveleft scrollmap_icon ${this.btnMoveLeftClasses}"></i>`;
            this.btnMoveRightHtml ??= `<i class="moveright scrollmap_icon ${this.btnMoveRightClasses}"></i>`;
            this.btnMoveTopHtml ??= `<i class="movetop scrollmap_icon ${this.btnMoveTopClasses}"></i>`;
            this.btnMoveDownHtml ??= `<i class="movedown scrollmap_icon ${this.btnMoveDownClasses}"></i>`;
            this.btnZoomPlusHtml ??= `<i class="zoomplus scrollmap_icon ${this.btnZoomPlusClasses}"></i>`;
            this.btnZoomMinusHtml ??= `<i class="zoomminus scrollmap_icon ${this.btnZoomMinusClasses}"></i>`;
            this.btnResetHtml ??= `<i class="reset scrollmap_icon ${this.btnResetClasses}"></i>`;
            this.btnZoomToFitHtml ??= `<i class="zoomtofit scrollmap_icon ${this.btnZoomToFitClasses}"></i>`;
            this.btnToggleButtonsVisibilityHtml ??= `<i class="toogle_buttons_visibility scrollmap_icon ${this.btnToggleButtonsVisibilityClasses}"></i>`;
            this.btnSettingsHtml ??= `<i class="show_settings scrollmap_icon ${this.btnSettingsClasses}"></i>`;
            this.btnInfoHtml ??= `<i class="info scrollmap_icon ${this.btnInfoClasses}"></i>`

            this._buttons_divs_wrapper = document.createElement('div');
            this._buttons_divs_wrapper.classList.add("scrollmap_btns_flex", "scrollmap_btns_divs_wrapper");
            this.container_div.insertBefore(this._buttons_divs_wrapper, this.container_subdiv);
            this._buttons_div = document.createElement('div');
            this._buttons_div.classList.add(this.btnsPositionClasses);
            this._buttons_div.classList.add(this.btnsDivClasses);
            this.clipped_div.appendChild(this._buttons_div);
            this._buttons_div2 = document.createElement('div');
            if (!this.btns2PositionClasses) {
                if (this.btnsPositionClasses == 'btn_pos_top_right')
                    this.btns2PositionClasses = 'btn_pos_top_left';
                if (this.btnsPositionClasses == 'btn_pos_top_left')
                    this.btns2PositionClasses = 'btn_pos_top_right';
            }
            this._buttons_div2.classList.add(this.btns2PositionClasses);
            this._buttons_div2.classList.add(this.btnsDivClasses);
            this.clipped_div.appendChild(this._buttons_div2);

            var styleElt = document.createElement("style");
            var enl_xpos = "calc(50% + var(--icon_size_z)/2 + 16px)";

            if (!$("css-scrollmap")) {
                const css = String.raw;
                const styleSheetContent = css`

                    @keyframes scrollmap_warning_fadein {
                        0% {
                        opacity: 0; }
                        100% {
                        opacity: 1; }
                    }

                    @keyframes scrollmap_warning_fadeout {
                        0% {
                        opacity: 1; }
                        100% {
                        opacity: 0; }
                    }

                    :root {
                        --scrollmap_zoomed_transform: ;
                        --scrollmap_zoom: ;
                        --scrollmap_unzoomed_transform: ;
                        --scrollmap_height: ;
                        --z_index_anim: 10;
                        --page_zoom: 1;
                    }

                    .scrollmap_container {
                        --icon_size:${this.btnsSize};
                        --icon_font_size:${this.btnsFontSize};
                        --icon_around_size:${this.btnsAroundSize};
                        --icon_size_z: calc(var(--icon_size)/var(--page_zoom));
                        --icon_font_size_z: calc(var(--icon_font_size)/var(--page_zoom));
                        --icon_around_size_z : calc(var(--icon_around_size)/var(--page_zoom));
                        --btns_offset_x: ${this.btnsOffsetX};
                        --btns_offset_y: ${this.btnsOffsetY};
                        --y_pos: var(--btns_offset_y);
                        --x_pos: var(--btns_offset_x);
                        z-index: var(--z_index_anim);
                        touch-action: initial !important;
                        user-select:none;
                        ${this.clipped_div ? "overflow: visible;" : ""};
                        display: flex;
                        flex-direction: column;
                    }

                    .scrollmap_container.scrollmap_btns_left{
                        flex-direction: row;
                    }
                
                    .scrollmap_container.scrollmap_btns_top{
                        flex-direction: column;
                    }

                    .scrollmap_container.scrollmap_btns_right{
                        flex-direction: row-reverse;
                    }

                    .scrollmap_container.scrollmap_btns_bottom{
                        flex-direction: column-reverse;
                    }

                    .scrollmap_container.scrollmap_btns_center{
                        align-items: center;
                    }


                    .scrollmap_container *{
                        touch-action: unset !important;
                    }

                    .scrollmap_overflow_clipped {
                        overflow: hidden;
                    }

                    .scrollmap_container .scrollmap_overflow_clipped, .scrollmap_container_subdiv {
                        position: relative;
                        width: 100%;
                        height: 100%;
                    }

                    .scrollmap_container_subdiv {
                        min-height : 0px;
                        min-width : 0px;
                    }

                    .scrollmap_scrollable, .scrollmap_onsurface, .scrollmap_anim {
                        position: absolute;
                        transform-origin: left top;
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

                    .scrollmap_tooltip ul{
                        list-style: disc;
                    }
                    
                    .scrollmap_tooltip li{
                        list-style: unset;
                        margin-left: 20px;
                    }

                    .scrollmap_zoomed{
                        transform: var(--scrollmap_zoomed_transform);
                    }
                    
                    .scrollmap_unzoomed{
                        transform: var(--scrollmap_unzoomed_transform);
                    }

                    .scrollmap_container:after {
                        animation: scrollmap_warning_fadein 0.8s backwards;
                        color: #fff;
                        font-family: "Roboto", Arial, sans-serif;
                        font-size: 22px;
                        justify-content: center;
                        display: flex;
                        flex-direction: row;
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
                    .scrollmap_warning_scroll:after,
                    .scrollmap_warning_arrowkeys:after, 
                    .scrollmap_warning_plusminuskeys:after {
                        animation: scrollmap_warning_fadein 0.8s forwards; }

                    .scrollmap_warning_touch:after {
                        content: attr(warning_touch);
                    }

                    .scrollmap_warning_scroll:after {
                        content: attr(warning_scroll);
                    }

                    .scrollmap_warning_arrowkeys:after {
                        content: attr(warning_arrowkeys);
                    }

                    .scrollmap_warning_plusminuskeys:after {
                        content: attr(warning_plusminuskeys);
                    }

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
                        filter: unset;
                        opacity: 0.3;
                        cursor: not-allowed !important;
                    }

                    .scrollmap_btn_disabled:active {
                        pointer-events: none;
                    }

                    .scrollmap_btn_nodisplay {
                        display: none !important;
                    }

                    .scrollmap_container .movetop, .scrollmap_container #movetop {
                        position: absolute;
                        top: 0px;
                        left: 50%;
                        margin-left: 0px;
                        transform: translateX(-50%)
                    }

                    .scrollmap_container .movedown, .scrollmap_container #movedown {
                        position: absolute;
                        bottom: 0px;
                        left: 50%;
                        margin-left: 0px;
                        transform: translateX(-50%)
                    }

                    .scrollmap_container .moveleft, .scrollmap_container #moveleft {
                        position: absolute;
                        left: 0px;
                        top: 50%;
                        margin-top: 0px;
                        transform: translateY(-50%)
                    }

                    .scrollmap_container .moveright, .scrollmap_container #moveright {
                        position: absolute;
                        right: 0px;
                        top: 50%;
                        margin-top: 0px;
                        transform: translateY(-50%)
                    }

                    .scrollmap_container .scrollmap_icon {
                        --margin_x: ${this.btnsMarginX};
                        --margin_y: ${this.btnsMarginY};
                        --margin_x_z: calc(var(--margin_x)/var(--page_zoom));
                        --margin_y_z: calc(var(--margin_y)/var(--page_zoom));
                        --index_x: 0;
                        --index_y: 0;
                        --y_pos: calc((var(--icon_size_z) + 2 * var(--icon_around_size_z) + var(--margin_y_z)) * var(--index_y) + var(--btns_offset_y));
                        --x_pos: calc((var(--icon_size_z) + 2 * var(--icon_around_size_z) + var(--margin_x_z)) * var(--index_x) + var(--btns_offset_x));
                        display: block;
                        text-align: center;
                        /*overflow: hidden;*/
                        font-size: var(--icon_font_size_z);
                        line-height: var(--icon_size_z);
                        width: var(--icon_size_z);
                        height: var(--icon_size_z);
                        position: static;
                    }

                    /*@media (pointer: coarse) {*/
                        /*:is(.scrollmap_icon)::after {
                            content:'';
                            position:absolute;
                            top    : calc(-1 * var(--icon_around_size_z));
                            bottom : calc(-1 * var(--icon_around_size_z)); 
                            left   : calc(-1 * var(--icon_around_size_z));
                            right  : calc(-1 * var(--icon_around_size_z)); 
                        }*/
                    /*}*/
                    .scrollmap_button_wrapper {
                        display: flex;
                        --button_size : calc(var(--icon_size_z) + 2 * var(--icon_around_size_z));
                        width : var(--button_size);
                        height: var(--button_size);
                    }

                    .scrollmap_button_wrapper > * {
                        position: static;
                        margin: auto;
                    }

                    .scrollmap_icon {
                        z-index: var(--z_index_anim);
                        background-image: none;
                        background-color: ${this.btnsBackgroundColor};
                        color: black;
                        border-radius: 100%;
                    }

                    .scrollmap_btns_flex {
                        display : flex;
                        flex-shrink : 0;
                        flex-wrap: wrap;
                    }
                    
                    .scrollmap_container > .scrollmap_btns_flex {
                        background-color: ${this.btnsBackgroundColor};
                        border-radius: 5px;
                        margin-bottom: 5px;
                    }

                    .scrollmap_container .scrollmap_btns_flex {
                        max-width: fit-content;
                        max-height: var(--scrollmap_height);
                        height: fit-content;
                    }

                    .scrollmap_container.scrollmap_btns_left > .scrollmap_btns_flex,
                    .scrollmap_container.scrollmap_btns_right > .scrollmap_btns_flex {
                        margin-top: calc(var(--btns_offset_y));
                    }

                    .scrollmap_container.scrollmap_btns_left > .scrollmap_btns_divs_wrapper {
                        margin-right: 5px;
                    }
                    .scrollmap_container.scrollmap_btns_right > .scrollmap_btns_divs_wrapper {
                        margin-left: 5px;
                    }
                    .scrollmap_container.scrollmap_btns_top > .scrollmap_btns_divs_wrapper {
                        margin-bottom: 5px;
                    }
                    .scrollmap_container.scrollmap_btns_bottom > .scrollmap_btns_divs_wrapper {
                        margin-top: 5px;
                    }
                    .scrollmap_container.scrollmap_btns_left > .scrollmap_btns_divs_wrapper,
                    .scrollmap_container.scrollmap_btns_left > .scrollmap_btns_divs_wrapper .scrollmap_btns_flex {
                        flex-direction: column;
                    }
                    .scrollmap_container.scrollmap_btns_right > .scrollmap_btns_divs_wrapper,
                    .scrollmap_container.scrollmap_btns_right > .scrollmap_btns_divs_wrapper > .scrollmap_btns_flex {
                        flex-direction: column;
                    }
                    .scrollmap_container.scrollmap_btns_top > .scrollmap_btns_divs_wrapper,
                    .scrollmap_container.scrollmap_btns_top > .scrollmap_btns_divs_wrapper > .scrollmap_btns_flex {
                        flex-direction: row;
                    }
                    .scrollmap_container.scrollmap_btns_bottom > .scrollmap_btns_divs_wrapper,
                    .scrollmap_container.scrollmap_btns_bottom > .scrollmap_btns_divs_wrapper > .scrollmap_btns_flex {
                        flex-direction: row;
                    }

                    .scrollmap_overflow_clipped > .scrollmap_btns_flex {
                        --column_cnt : 2;
                        width: calc(var(--column_cnt) * (var(--icon_size_z) + 2 * var(--icon_around_size_z)) + 1px);
                    }

                    .scrollmap_form button {
                        width: fit-content;
                        padding: 5px;
                        border: 1px solid;
                        border-radius: 5px;
                        appearance: auto;
                    }

                    .scrollmap_form > div:first-of-type  {
                        margin-top: 25px;
                        position : relative;
                    }
                    .scrollmap_form > div {
                        margin-bottom: 10px;
                        position : relative;
                    }

                    .scrollmap_form [name="close"]{
                        /*float: right;*/
                        position: absolute;
                        right: 5px;
                        top: 5px;
                        appearance: none;
                    }

                    .scrollmap_form [ type="submit"]{
                    background-color: lightblue;
                    }

                    .scrollmap_form select{
                        border: solid blue;
                        font-size: 16px;
                    }

                    .reset.fa6-arrows-to-circle {
                        font-size: 25px;
                    }
                    /**************************
                    * positioning of buttons  *
                    ***************************/
                    .scrollmap_overflow_clipped .btn_pos_top_right{
                        position : absolute;
                        top: var(--y_pos);
                        right: var(--x_pos);
                        left: unset;
                        bottom: unset;
                    }
                    .scrollmap_overflow_clipped .btn_pos_top_left{
                        position : absolute;
                        top: var(--y_pos);
                        left: var(--x_pos);
                        right: unset;
                        bottom: unset;
                    }


                    .scrollmap_overflow_clipped .btn_pos_top_left > .show_settings{
                        top: 0px;
                        position: absolute;
                        right: 0px;
                        left: calc(2 * var(--button_size));
                    }

                    .scrollmap_overflow_clipped .btn_pos_top_right > .show_settings{
                        top: 0px;
                        position: absolute;
                        right: 0px;
                        right: calc(2 * var(--button_size));
                    }


                    .scrollmap_footer, .scrollmap_header {
                        text-align: center;
                    }

                    .scrollmap_container .enlarge_or_reduce_as_text{
                        position: absolute;
                        background-color: rgba(255,255,255,0.5);
                        font-size: 110%;
                        line-height: 24px;
                        text-decoration: none;
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
                    .scrollmap_container .movetop.fa,
                    .scrollmap_container .moveleft.fa,
                    .scrollmap_container .moveright.fa,
                    .scrollmap_container .movedown.fa{
                        position: absolute;
                    }
                    .scrollmap_container .movetop.fa,
                    .scrollmap_container .moveleft.fa,
                    .scrollmap_container .moveright.fa,
                    .scrollmap_container .movedown.fa{
                        background-color: rgba(255,255,255,0.5);
                        border-radius: 100%;
                    }

                    .scrollmap_container .movetop.fa {
                        border-radius: 0 0 100% 100%;
                    }

                    .scrollmap_container .moveleft.fa {
                        border-radius: 0 100% 100% 0;
                    }

                    .scrollmap_container .moveright.fa {
                        border-radius: 100% 0 0 100%;
                    }

                    .scrollmap_container .movedown.fa {
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

            this._pointersInit();

            this.container_div.addEventListener('wheel', this._onWheel.bind(this), this._notPassiveEventListener);
            var _handleTouch = this._handleTouch.bind(this);
            this.container_div.addEventListener("touchstart", _handleTouch, this._passiveEventListener);
            this.container_div.addEventListener("touchmove", _handleTouch, this._notPassiveEventListener);
            document.addEventListener("touchend", _handleTouch, this._passiveEventListener);
            document.addEventListener("touchcancel", _handleTouch, this._passiveEventListener);

            this.setupKeys();
            this.setupInfoButton();
            if (!this._bInfoBtnVisible)
                this.hideInfoButton();
            this._btnToggleButtonsVisiblity = this._initButton('toogle_buttons_visibility', this.btnToggleButtonsVisibilityHtml, _('Hide buttons'), ScrollmapWithZoom._toggleButtonsVisiblity);
            if (this.btnsDivOnMap) {
                this._btnToggleButtonsVisiblity.classList.add("scrollmap_icon_always_visible");
            }
            var btn = this._initButton('show_settings', this.btnSettingsHtml, _('Settings'), this._showForm);
            btn.classList.add("scrollmap_icon_always_visible");
            this.setupOnScreenArrows(this.scrollDelta, this.bScrollDeltaAlignWithZoom);
            this.setupOnScreenZoomButtons(this.zoomDelta);
            if (!this._bEnableZooming)
                this.hideOnScreenZoomButtons();
            this.setupOnScreenResetButtons();
            this.setupEnlargeReduceButtons(this.incrHeightDelta, this.bIncrHeightKeepInPos, this._minHeight, this.bIncrHeightBtnIsShort, this.bIncrHeightBtnGroupedWithOthers);
            if (!this._bIncrHeightBtnVisible)
                this.hideEnlargeReduceButtons();

            this._RepositionButtonsDiv();
            this.setBShowMoveCursor();

            this.bIncrHeightGlobally = this._bIncrHeightGlobally;
            if (!this.defaultHeight) {
                this.defaultHeight = parseFloat(window.getComputedStyle(this.container_div).height);
                if (!this.defaultHeight)
                    this.defaultHeight = this.minHeight;
            }
            this.setDisplayHeight(this.defaultHeight);
            this.bEnableZooming = this._bEnableZooming;
            if (this.defaultZoom === null)
                this.defaultZoom = this.zoom;
            this.setMapZoom(this.zoom);

            if (this.startPosition)
                this.scrollto(-this.startPosition.x, -this.startPosition.y, 0, 0);
            else
                this.scrollToCenter(null, 0, 0);
            if (this._resizeObserver)
                this._resizeObserver.observe(this.container_div);
            if (this._resizeHeadersObserver) {
                this._resizeHeadersObserver.observe($('log_history_status'));
                this._resizeHeadersObserver.observe($('page-title'));
                // this._resizeHeadersObserver.observe($('after-page-title'));
            }

            this._localStorageKey = 'scrollmap_' + gameui.table_id + '_' + gameui.player_id + '_' + this.container_div.id;
            this._localStorageOldKey = 'scrollmap_' + gameui.table_id + '_' + this.container_div.id;
            window.addEventListener('pagehide', (e) => {
                this._onbeforeunload_handler(e);
            });
            document.addEventListener('visibilitychange', this._onvisibility_changehandler.bind(this));
            window.addEventListener('load', (e) => {
                SWZ.debug("document loaded"); /*this.adaptHeight();*/
            });
            dojo.connect(gameui, "onScreenWidthChange", this, dojo.hitch(this, 'adaptHeight'));
            dojo.require("dojo.aspect");
            dojo.aspect.after(ScrollmapWithZoom, "updateHeight", (new_height: number, incrHeightGlobalKey: string) => {
                if (this.incrHeightGlobalKey == incrHeightGlobalKey)
                    this.setDisplayHeight(new_height, false);
            }, true);
            dojo.aspect.after(ScrollmapWithZoom, "resetHeight", (new_height: number, incrHeightGlobalKey: string) => {
                if (this.incrHeightGlobalKey == incrHeightGlobalKey && this.bAdaptHeightAuto)
                    this._onResetHeight(null, false);
            }, true);
            if (ScrollmapWithZoom.bEnableKeys && this.bEnableKeysArrows) {
                let warning_arrowkeys = _('press the arrow keys with ctrl key to scroll the board');
                this.container_div.setAttribute("warning_arrowkeys", warning_arrowkeys);
            }
            SWZ.debug("ebg.ScrollmapWithZoom create end");
        }

        createCompletely(container_div: HTMLElement, page: object = null, create_extra: Function = null, bEnlargeReduceButtonsInsideMap: boolean = true) {
            SWZ.debug("createCompletely");
            var tmplDisplayButtons = String.raw`
                ${this.btnIncreaseHeightHtml}
                ${this.btnDecreaseHeightHtml}
            `;
            var info_id = container_div.id + "_info";

            var tmpl = String.raw`
                <div class="scrollmap_overflow_clipped">
                    <div class="scrollmap_scrollable"></div>
                    <div class="scrollmap_surface" ></div>
                    <div class="scrollmap_onsurface"></div>
                </div>
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

            if (!bEnlargeReduceButtonsInsideMap) {
                tmpl = String.raw`
                <div id="${container_div.id}_header" class="whiteblock scrollmap_header">
                    ${tmplDisplayButtons}
                </div>`;
                var parent = container_div.parentNode;
                var tmplNode = document.createElement("div");
                if (parent) {
                    parent.insertBefore(tmplNode, container_div);
                }
                tmplNode.outerHTML = tmpl;
            }

            this.create(container_div, < HTMLElement > scrollable_div, < HTMLElement > surface_div, < HTMLElement > onsurface_div, < HTMLElement > clipped_div, < HTMLElement > animation_div, page, create_extra);
        }

        protected _init() {}

        protected _RepositionButtonsDiv(options: { btnsDivOnMap ? : boolean, btnsDivPositionOutsideMap ? : string } = { btnsDivOnMap: undefined, btnsDivPositionOutsideMap: undefined }) {
            var btnsDivOnMapPrev = this.btnsDivOnMap;
            var btnsDivPositionOutsideMapPrev = this.btnsDivPositionOutsideMap;
            if (options.btnsDivOnMap != undefined)
                this.btnsDivOnMap = options.btnsDivOnMap;
            if (options.btnsDivPositionOutsideMap != undefined)
                this.btnsDivPositionOutsideMap = options.btnsDivPositionOutsideMap;
            var classList = btnsDivPositionOutsideMapPrev.split(' ');
            for (const posClass of classList) {
                if (posClass)
                    this.container_div.classList.remove(posClass);
            }
            if (this.btnsDivOnMap) {
                this.clipped_div.appendChild(this._buttons_div);
                this.clipped_div.appendChild(this._buttons_div2);
                this.container_div.style.setProperty('--btns_offset_x', this.btnsOffsetX);
                this.container_div.style.setProperty('--btns_offset_y', this.btnsOffsetY);
                this._btnToggleButtonsVisiblity.classList.add("scrollmap_icon_always_visible");
                this._btnToggleButtonsVisiblity.classList.remove("scrollmap_btn_nodisplay");
                this._minHeight = this._orig_minHeight;
            } else {
                classList = this.btnsDivPositionOutsideMap.split(' ');
                for (const posClass of classList) {
                    if (posClass)
                        this.container_div.classList.add(posClass);
                }
                // switch (this.btnsDivPositionOutsideMap) {
                //     case ScrollmapWithZoom.btnsDivPositionE.Left:
                //     case ScrollmapWithZoom.btnsDivPositionE.Right:
                //         this._buttons_div.classList.add('flex_direction_column');
                // }
                this._buttons_divs_wrapper.appendChild(this._buttons_div);
                this._buttons_divs_wrapper.appendChild(this._buttons_div2);
                this.container_div.style.setProperty('--btns_offset_x', this.btnsOutsideMapOffsetX);
                this.container_div.style.setProperty('--btns_offset_y', this.btnsOutsideMapOffsetY);

                this._setButtonsVisiblity(true, false);
                this._btnToggleButtonsVisiblity.classList.add("scrollmap_btn_nodisplay");

                this._minHeight = Math.max(this._orig_minHeight, gameui.getBoundingClientRectIgnoreZoom(this._buttons_divs_wrapper).height + 2);
                if (this._minHeight > this.getDisplayHeight())
                    this.setDisplayHeight(this._minHeight);
            }
        }

        protected _createForm() {
            var inputs = null;
            if (!ScrollmapWithZoom._formDialog) {
                var formTmpl = String.raw`
                        <form class="scrollmap_form">
                            <div>
                                <input type="checkbox" id="wheelZooming" value="true">
                                <label for="wheelZooming">${dojo.string.substitute(_("Zoom with mouse wheel + ${key}"), { key: "<select name='wheelZoomingKey'></select>" })}</label>
                            </div>
                            <div>
                                <input type="checkbox" id="pinchZooming" value="true">
                                <label for="pinchZooming">${_("Pinch fingers to zoom")}</label>
                            </div>
                            <div>
                                <input type="checkbox" id="bOneFingerScrolling" value="true">
                                <label for="bOneFingerScrolling">${_("One finger scrolling")}</label>
                            </div>
                            <div>
                                <input type="checkbox" id="bShowMoveCursor" value="true">
                                <label for="bShowMoveCursor">${_("Show move cursor")}</label>
                            </div>
                            ${this.btnsDivPositionnable ? String.raw`
                            <div>
                                <input type="checkbox" id="btnsDivOutsideMap" value="true">
                                <label for="btnsDivOutsideMap">${dojo.string.substitute(_("Place buttons outside scrollmap on ${position}"), { position: "<select id='btnsDivPositionOutsideMap' name='btnsDivPositionOutsideMap'></select>" })}</label>
                            </div>
                            ` : ''}
                            <div>
                                <input type="checkbox" id="bRevertArrowsScroll" value="true">
                                <label for="bRevertArrowsScroll">${_("Revert scroll direction of arrows")}</label>
                            </div>
                            <div>
                                <input type="checkbox" id="bTakeIntoAccountPanelsHeight" value="true">
                                <label for="bTakeIntoAccountPanelsHeight">${_("Take into account players panels height")}</label>
                            </div>
                            <div>
                                <input type="checkbox" id="bAutoCompensateChatIcon" value="true">
                                <label for="bAutoCompensateChatIcon">${_("Take into account chat icon")}</label>
                            </div>
                            <div>
                                <input type="checkbox" id="bRestoreScrollPosition" value="true">
                                <label for="bRestoreScrollPosition">${_("Restore scroll position")}</label>
                            </div>
                            <div>
                                <input type="checkbox" id="bRestoreZoom" value="true">
                                <label for="bRestoreZoom">${_("Restore zoom level")}</label>
                            </div>
                            <div>
                                <input type="checkbox" id="bUseOldTouchAndMouseEvent" value="true">
                                <label for="bUseOldTouchAndMouseEvent">${_("Use old touch and mouse events")}</label>
                            </div>
                            <div>
                                <button name="close2">${_("Cancel")}</button>
                                <button type="submit" name="confirm">${_("Confirm")}</button>
                            </div>
                        </form>
                `;
                // document.body.insertAdjacentHTML("beforeend", formTmpl);
                // ScrollmapWithZoom._formDialog = < HTMLDialogElement > document.body.lastElementChild;
                ScrollmapWithZoom._formDialog = new ebg.popindialog();
                ScrollmapWithZoom._formDialog.create('scrollmap_dialog');
                ScrollmapWithZoom._formDialog.setTitle(_("Board preferences"));
                ScrollmapWithZoom._formDialog.setContent(formTmpl);
                ScrollmapWithZoom._formDialog.bCloseIsHiding = true;
                // ScrollmapWithZoom._form = < HTMLFormElement > ScrollmapWithZoom._formDialog.firstElementChild;
                ScrollmapWithZoom._form = $('popin_' + ScrollmapWithZoom._formDialog.id + '_contents').firstElementChild;
                inputs = < HTMLCollectionOf < HTMLInputElement > /*  & { [index: string]: string } */ > ScrollmapWithZoom._form.elements;
                ScrollmapWithZoom._form.onsubmit = () => { return false; };
                var keys = new Map([
                    [ScrollmapWithZoom.wheelZoomingKeys.Alt, _("alt")],
                    [ScrollmapWithZoom.wheelZoomingKeys.Ctrl, _("ctrl")],
                    [ScrollmapWithZoom.wheelZoomingKeys.Shift, _("shift")],
                    [ScrollmapWithZoom.wheelZoomingKeys.Meta, _("meta")],
                    [ScrollmapWithZoom.wheelZoomingKeys.None, _("no keys")]
                ]);
                var wheelZoomingKeySel = inputs.namedItem("wheelZoomingKey");
                for (const [key, value] of keys.entries()) {
                    var option = document.createElement("option");
                    option.value = '' + key;
                    option.text = value;
                    wheelZoomingKeySel.appendChild(option);
                }

                if (this.btnsDivPositionnable) {
                    var keys2 = new Map([
                        [ScrollmapWithZoom.btnsDivPositionE.Right, _("right")],
                        [ScrollmapWithZoom.btnsDivPositionE.Left, _("left")],
                        [ScrollmapWithZoom.btnsDivPositionE.Top, _("top")],
                    ]);
                    var btnsDivPositionsSel = inputs.namedItem("btnsDivPositionOutsideMap");
                    for (const [key, value] of keys2.entries()) {
                        var option = document.createElement("option");
                        option.value = '' + key;
                        option.text = value;
                        btnsDivPositionsSel.appendChild(option);
                    }
                    btnsDivPositionsSel.onmousedown = (event: MouseEvent) => { event.stopPropagation(); };
                    btnsDivPositionsSel.onclick = (event: MouseEvent) => { event.stopPropagation(); };
                    inputs.namedItem("btnsDivPositionOutsideMap").onclick = (event: MouseEvent) => {
                        event.preventDefault();
                        event.stopPropagation();
                    };
                }
            }
            if (!inputs)
                inputs = < HTMLCollectionOf < HTMLInputElement > /*  & { [index: string]: string } */ > ScrollmapWithZoom._form.elements;
            inputs.namedItem("confirm").addEventListener("click", this._submitForm.bind(this));
            var closeFctBind = this._closeForm.bind(this);
            // inputs.namedItem("close").addEventListener("click", closeFctBind);
            inputs.namedItem("close2").addEventListener("click", closeFctBind);
        }

        protected _showForm() {
            ScrollmapWithZoom._formDialog.show();
            //this._form.style.display = "block";
            // interface HTMLCollectionOf2<T extends Element>  {
            //     readonly length: number;
            //     item(index: number): T | null;
            //     [index: number]: T;
            //     [index: string]: T;
            // }
            // interface HTMLFormControlsCollectionExt<T extends Element> extends HTMLCollectionBase {
            //     item(index: number): T | null;
            //     namedItem(name: string): T | null;
            //     [index: number]: T;.
            // }
            // interface HTMLFormElemnts extends HTMLFormControlsCollection {
            //     [key: string | number]: HTMLElement;
            //   }
            var inputs = < HTMLCollectionOf < HTMLInputElement > /*  & { [index: string]: string } */ > ScrollmapWithZoom._form.elements;
            inputs.namedItem("wheelZooming").checked = this.zoomingOptions.bWheelZooming;
            inputs.namedItem("wheelZoomingKey").value = '' + this.zoomingOptions.wheelZooming;
            inputs.namedItem("pinchZooming").checked = this.zoomingOptions.pinchZooming;
            inputs.namedItem("bOneFingerScrolling").checked = this.scrollingOptions.bOneFingerScrolling;
            inputs.namedItem("bShowMoveCursor").checked = this.scrollingOptions.bShowMoveCursor;
            if (this.btnsDivPositionnable) {
                inputs.namedItem("btnsDivOutsideMap").checked = !this.btnsDivOnMap;
                inputs.namedItem("btnsDivPositionOutsideMap").value = this.btnsDivPositionOutsideMap;
            }
            inputs.namedItem("bRevertArrowsScroll").checked = this.bRevertArrowsScroll;
            inputs.namedItem("bTakeIntoAccountPanelsHeight").checked = this.bAdaptHeightAutoCompensatePanelsHeight;
            inputs.namedItem("bAutoCompensateChatIcon").checked = this.bAdaptHeightAutoCompensateChatIcon;
            if (dojo.hasClass('ebd-body', 'mobile_version') && this._bAdaptHeightAuto) {
                inputs.namedItem("bTakeIntoAccountPanelsHeight").parentElement.style.display = "";
                inputs.namedItem("bAutoCompensateChatIcon").parentElement.style.display = "";
            } else {
                inputs.namedItem("bTakeIntoAccountPanelsHeight").parentElement.style.display = "none";
                inputs.namedItem("bAutoCompensateChatIcon").parentElement.style.display = "none";
            }
            inputs.namedItem("bRestoreScrollPosition").checked = this.bRestoreScrollPosition;
            inputs.namedItem("bRestoreZoom").checked = this.bRestoreZoom;
            inputs.namedItem("bUseOldTouchAndMouseEvent").checked = this.scrollingOptions.bUseOldTouchAndMouseEvent;
        }

        protected _submitForm() {
            var inputs = < HTMLCollectionOf < HTMLInputElement >> ScrollmapWithZoom._form.elements;
            var bWheelZooming = inputs.namedItem("wheelZooming").checked;
            if (this.zoomingOptions.bWheelZooming != bWheelZooming) {
                this.zoomingOptions.bWheelZooming = bWheelZooming;
                ScrollmapWithZoom._optionsChanged.bWheelZooming = bWheelZooming;
            }
            var wheelZooming = toint(inputs.namedItem("wheelZoomingKey").value);
            if (this.zoomingOptions.wheelZooming != wheelZooming) {
                this.zoomingOptions.wheelZooming = wheelZooming;
                ScrollmapWithZoom._optionsChanged.wheelZooming = wheelZooming;
            }
            var pinchZooming = inputs.namedItem("pinchZooming").checked;
            if (this.zoomingOptions.pinchZooming != pinchZooming) {
                this.zoomingOptions.pinchZooming = pinchZooming;
                ScrollmapWithZoom._optionsChanged.pinchZooming = pinchZooming;
            }
            var bOneFingerScrolling = inputs.namedItem("bOneFingerScrolling").checked;
            if (this.scrollingOptions.bOneFingerScrolling != bOneFingerScrolling) {
                this.scrollingOptions.bOneFingerScrolling = bOneFingerScrolling;
                ScrollmapWithZoom._optionsChanged.bOneFingerScrolling = bOneFingerScrolling;
            }
            var bShowMoveCursor = inputs.namedItem("bShowMoveCursor").checked;
            if (this.scrollingOptions.bShowMoveCursor != bShowMoveCursor) {
                this.scrollingOptions.bShowMoveCursor = bShowMoveCursor;
                ScrollmapWithZoom._optionsChanged.bShowMoveCursor = bShowMoveCursor;
                this.setBShowMoveCursor();
            }
            if (this.btnsDivPositionnable) {
                var btnsDivOnMap = !inputs.namedItem("btnsDivOutsideMap").checked;
                if (this.btnsDivOnMap != btnsDivOnMap) {
                    ScrollmapWithZoom._optionsChanged.btnsDivOnMap = btnsDivOnMap;
                }
                var btnsDivPositionOutsideMap = inputs.namedItem("btnsDivPositionOutsideMap").value;
                if (this.btnsDivPositionOutsideMap != btnsDivPositionOutsideMap) {
                    ScrollmapWithZoom._optionsChanged.btnsDivPositionOutsideMap = btnsDivPositionOutsideMap;
                }
                this._RepositionButtonsDiv(ScrollmapWithZoom._optionsChanged);
            }
            var bRevertArrowsScroll = inputs.namedItem("bRevertArrowsScroll").checked;
            if (this.bRevertArrowsScroll != bRevertArrowsScroll) {
                this.bRevertArrowsScroll = bRevertArrowsScroll;
                ScrollmapWithZoom._optionsChanged.bRevertArrowsScroll = bRevertArrowsScroll;
            }
            var addHeightNeeded = false;
            var bAutoCompensatePanelsHeight = inputs.namedItem("bTakeIntoAccountPanelsHeight").checked;
            if (this.bAdaptHeightAutoCompensatePanelsHeight != bAutoCompensatePanelsHeight) {
                this.bAdaptHeightAutoCompensatePanelsHeight = bAutoCompensatePanelsHeight;
                ScrollmapWithZoom._optionsChanged.bAutoCompensatePanelsHeight = bAutoCompensatePanelsHeight;
                addHeightNeeded = true;
            }
            var bAutoCompensateChatIcon = inputs.namedItem("bAutoCompensateChatIcon").checked;
            if (this.bAdaptHeightAutoCompensateChatIcon != bAutoCompensateChatIcon) {
                this.bAdaptHeightAutoCompensateChatIcon = bAutoCompensateChatIcon;
                ScrollmapWithZoom._optionsChanged.bAutoCompensateChatIcon = bAutoCompensateChatIcon;
                addHeightNeeded = true;
            }
            var bRestoreScrollPosition = inputs.namedItem("bRestoreScrollPosition").checked;
            if (this.bRestoreScrollPosition != bRestoreScrollPosition) {
                this.bRestoreScrollPosition = bRestoreScrollPosition;
                ScrollmapWithZoom._optionsChanged.bRestoreScrollPosition = bRestoreScrollPosition;
            }
            var bRestoreZoom = inputs.namedItem("bRestoreZoom").checked;
            if (this.bRestoreZoom != bRestoreZoom) {
                this.bRestoreZoom = bRestoreZoom;
                ScrollmapWithZoom._optionsChanged.bRestoreZoom = bRestoreZoom;
            }
            var bUseOldTouchAndMouseEvent = inputs.namedItem("bUseOldTouchAndMouseEvent").checked;
            if (this.scrollingOptions.bUseOldTouchAndMouseEvent != bUseOldTouchAndMouseEvent) {
                this.scrollingOptions.bUseOldTouchAndMouseEvent = bUseOldTouchAndMouseEvent;
                this._pointersInit();
                ScrollmapWithZoom._optionsChanged.bUseOldTouchAndMouseEvent = bUseOldTouchAndMouseEvent;
            }
            if (addHeightNeeded)
                this.adaptHeight();

            if (this == ScrollmapWithZoom.instances.values().next().value)
                ScrollmapWithZoom._saveGameSettings();
            // ScrollmapWithZoom._formDialog.close();
            ScrollmapWithZoom._formDialog.hide();
            return false;
        }

        protected _closeForm() {
            // ScrollmapWithZoom._formDialog.close();
            ScrollmapWithZoom._formDialog.hide();
            return false;
        }

        protected adaptHeight() {
            window.requestAnimationFrame(() => {
                this._onResize();
                // your code
                SWZ.debug("adaptHeight");
                this._titleHeight = gameui.getBoundingClientRectIgnoreZoom($('page-title')).height;
                if (!this.bAdaptHeightAuto)
                    return;
                if (this._setupDone)
                    setTimeout(() => {
                        this._adaptHeightDone = true;
                        this._zoomFitCalledDuringSetup = false;
                    }, 3000);

                if (this._bHeightChanged)
                    return;
                var screen_height = document.documentElement.clientHeight ||
                    document.body.clientHeight || window.innerHeight;
                var container_pos = gameui.getBoundingClientRectIncludeZoom(this.container_div);
                var other_elements_height = this.adaptHeightCorr * gameui.calcCurrentCSSZoom($('page-content')) + container_pos.y + window.scrollY;

                var pageContentCoord;
                if (!this.bAdaptHeightAutoCompensateDivsAbove) {
                    if (!pageContentCoord)
                        pageContentCoord = gameui.getBoundingClientRectIncludeZoom($("page-content"));
                    other_elements_height -= container_pos.y - pageContentCoord.y;
                }

                if (!this.bAdaptHeightAutoCompensatePanelsHeight && dojo.hasClass('ebd-body', 'mobile_version')) {
                    var page_title = $("page-title");
                    var pageTitleCoord = gameui.getBoundingClientRectIncludeZoom(page_title);
                    if (!pageContentCoord)
                        pageContentCoord = gameui.getBoundingClientRectIncludeZoom($("page-content"));
                    other_elements_height -= pageContentCoord.y + window.scrollY;
                    other_elements_height += pageTitleCoord.height;
                }
                for (let i = 0; i < this.adaptHeightCorrDivs.length; i++) {
                    let brect = gameui.getBoundingClientRectIncludeZoom(this.adaptHeightCorrDivs[i]);
                    if (brect.top + 5 >= container_pos.y + container_pos.height)
                        other_elements_height += brect.height;
                }
                // var $log_history_status = $('log_history_status'); 
                // if ($log_history_status)
                //     other_elements_height -= $log_history_status.getBoundingClientRect().height/gameui.gameinterface_zoomFactor;
                // var $connect_status = $('connect_status');
                // if ($connect_status)
                //     other_elements_height -= $connect_status.getBoundingClientRect().height / pageZoom;
                if (this.bAdaptHeightAutoCompensateChatIcon && dojo.hasClass('ebd-body', 'mobile_version')) {
                    var $chatwindowavatar = document.querySelector(".chatwindowavatar");
                    // debugger;
                    if ($chatwindowavatar) {
                        let brect = gameui.getBoundingClientRectIncludeZoom($chatwindowavatar);
                        if (brect.height > 0) {
                            let bheight = window.innerHeight - brect.top;
                            if (bheight < 120)
                                other_elements_height += bheight;
                        }
                    }
                }
                var map_height = (screen_height - other_elements_height) / gameui.calcCurrentCSSZoom(this.container_div);

                if (this.getDisplayHeight() != map_height) {
                    this.setDisplayHeight(map_height);
                }
                this._disableButton(this._btnResetHeight);
                this._RepositionButtonsDiv();
            });

        }

        protected _onResize() {
            window.requestAnimationFrame(() => {
                if (!this._setupDone || (this.bAdaptHeightAuto && !this._adaptHeightDone)) {
                    SWZ.debug(this._setupDone ? "onResize after adaptHeight" : "1st onResize after setup");
                    this._clearOldSettings();
                    if (!this._setupDone)
                        this._loadedSettings = this._loadSettings();
                    if (!this._loadedSettings) {
                        if (this._resetMode != ScrollmapWithZoom.ResetMode.ScrollAndZoomFit && this._zoomFitCalledDuringSetup)
                            this.zoomToFit();
                        if (this.startPosition)
                            this.scrollto(-this.startPosition.x, -this.startPosition.y, 0, 0);
                        else
                            this.scrollToCenter(null, 0, 0);
                    }
                    if (!this._setupDone)
                        setTimeout(() => {
                            var animA = dojo.fadeIn({ node: this.onsurface_div, duration: 1500, delay: 0 });
                            var animB = dojo.fadeIn({ node: this.scrollable_div, duration: 1500, delay: 0 });
                            var animC = dojo.fadeIn({ node: this.animation_div, duration: 1500, delay: 0 });
                            dojo.fx.combine([animA, animB, animC]).play();
                        }, 500);
                } else {
                    this._scrollto(this.board_x, this.board_y, 0, 0);
                }
                var pageZoom = this._getPageZoom();
                if (pageZoom == 1) {
                    var interfaceFactor = this._getInterfaceFactor();
                    if (interfaceFactor < 1) {
                        SWZ.debug("adaptHeight use interfaceFactor ", interfaceFactor);
                        pageZoom = interfaceFactor;
                    }
                }
                document.body.style.setProperty("--page_zoom", pageZoom.toString());
                setTimeout(() => {
                    this._setupDone = true;
                }, 100);
            });
        }

        protected _clearOldSettings() {
            let keys = Object.keys(appLocalStorage);
            let oldKeysCnt = 0;
            let oldest = null;
            let oldestKey = '';
            for (let key of keys) {
                if (key.startsWith('scrollmap')) {
                    let oldSetting = JSON.parse(appLocalStorage.getItem(key));
                    if ((oldest == null) || oldSetting.time < oldest) {
                        oldestKey = key;
                        oldest = oldSetting.time;
                    }
                    oldKeysCnt++;
                }
                if (oldKeysCnt > 500) {
                    appLocalStorage.removeItem(oldestKey);
                }
            }
        }
        protected _loadSettings() {
            let scrolled = false;
            let settingsStr = appLocalStorage.getItem(ScrollmapWithZoom.localStorageGameKey);
            if (settingsStr != null) {
                let settings = JSON.parse(settingsStr);
                if (settings.optionsChanged != undefined) {
                    var optionsChanged = < _optionsChangedT > settings.optionsChanged;
                    ScrollmapWithZoom._optionsChanged = optionsChanged;
                    if (optionsChanged.bWheelZooming != undefined)
                        this.zoomingOptions.bWheelZooming = optionsChanged.bWheelZooming;
                    if (optionsChanged.wheelZooming != undefined)
                        this.zoomingOptions.wheelZooming = optionsChanged.wheelZooming;
                    if (optionsChanged.pinchZooming != undefined)
                        this.zoomingOptions.pinchZooming = optionsChanged.pinchZooming;
                    if (optionsChanged.bOneFingerScrolling != undefined)
                        this.scrollingOptions.bOneFingerScrolling = optionsChanged.bOneFingerScrolling;
                    if (optionsChanged.bShowMoveCursor != undefined) {
                        this.scrollingOptions.bShowMoveCursor = optionsChanged.bShowMoveCursor;
                        this.setBShowMoveCursor();
                    }
                    if (optionsChanged.btns_visible != null) {
                        this._setButtonsVisiblity(settings.btns_visible);
                    }
                    if (this.btnsDivPositionnable)
                        this._RepositionButtonsDiv(optionsChanged);
                    if (optionsChanged.bRevertArrowsScroll != undefined) {
                        this.bRevertArrowsScroll = optionsChanged.bRevertArrowsScroll;
                    }
                    var adaptHeightNeeded = false;
                    if (optionsChanged.bAutoCompensatePanelsHeight != null) {
                        this.bAdaptHeightAutoCompensatePanelsHeight = optionsChanged.bAutoCompensatePanelsHeight;
                        adaptHeightNeeded = true;
                    }
                    if (optionsChanged.bAutoCompensateChatIcon != null) {
                        this.bAdaptHeightAutoCompensateChatIcon = optionsChanged.bAutoCompensateChatIcon;
                        adaptHeightNeeded = true;
                    }
                    if (optionsChanged.bUseOldTouchAndMouseEvent != null) {
                        this.scrollingOptions.bUseOldTouchAndMouseEvent = optionsChanged.bUseOldTouchAndMouseEvent;
                        this._pointersInit();
                    }
                    if (optionsChanged.bRestoreScrollPosition != null) {
                        this.bRestoreScrollPosition = optionsChanged.bRestoreScrollPosition;
                    }
                    if (optionsChanged.bRestoreZoom != null) {
                        this.bRestoreZoom = optionsChanged.bRestoreZoom;
                    }
                    if (adaptHeightNeeded)
                        this.adaptHeight();
                }
            }
            settingsStr = appLocalStorage.getItem(this._localStorageKey);
            if (settingsStr == null) {
                settingsStr = appLocalStorage.getItem(this._localStorageOldKey);
                if (settingsStr != null) {
                    appLocalStorage.setItem(this._localStorageKey, settingsStr);
                    appLocalStorage.removeItem(this._localStorageOldKey);
                }
            }
            if (settingsStr != null) {
                let settings = JSON.parse(settingsStr);
                SWZ.debug("_loadSettings", settings.board_x, settings.board_y);
                this._loaded_x = settings.board_x;
                this._loaded_y = settings.board_y;
                var height = this.getDisplayHeight();
                if (settings.height != null && this.bSaveHeight) {
                    this.setDisplayHeight(settings.height);
                }
                if (settings.height_changed != null) {
                    this._bHeightChanged = settings.height_changed;
                }
                if (this.bRestoreZoom && settings.zoom != null) {
                    this.setMapZoom(settings.zoom);
                }
                if (this.bRestoreScrollPosition && settings.board_x != null && settings.board_y != null) {
                    this._scrollto(settings.board_x, settings.board_y, 0, 0);
                    scrolled = true;
                }
                if ((this.bAdaptHeightAuto && !this._bHeightChanged) || !this.bIncrHeightBtnVisible)
                    this.setDisplayHeight(height);
                if (this._bHeightChanged) {
                    this._enableButton(this._btnResetHeight);
                } else
                    this._disableButton(this._btnResetHeight);
            }
            return scrolled;
        }
        protected saveSettings() {
            let settings = {
                time: Date.now(),
                zoom: this.zoom,
                board_x: this._scrolled ? this.board_x : this._loaded_x,
                board_y: this._scrolled ? this.board_y : this._loaded_y,
                height: this.getDisplayHeight(),
                height_changed: this._bHeightChanged,
                btns_visible: this._bBtnsVisible,
            };
            SWZ.debug("saveSettings", settings.board_x, settings.board_y);
            appLocalStorage.setItem(this._localStorageKey, JSON.stringify(settings));
        }
        protected static _saveGameSettings() {
            SWZ.debug("_saveGameSettings");
            let gameSettings = {
                time: Date.now(),
                optionsChanged: this._optionsChanged
            };
            appLocalStorage.setItem(ScrollmapWithZoom.localStorageGameKey, JSON.stringify(gameSettings));
        }
        protected _onvisibility_changehandler(e: Event) {
            if (document.visibilityState === "hidden") {
                this.saveSettings();
            }
        }

        protected _onbeforeunload_handler(e: Event) {
            this.saveSettings();
        }

        protected _updatePointers(event: PointerEvent | TouchEvent | MouseEvent) {
            var prevEv;
            if ((event as TouchEvent).changedTouches) { // TouchEvent
                const changedTouches: Touch[] = Array.from((event as TouchEvent).changedTouches);
                changedTouches.forEach(touch => {
                    const id = touch.identifier;
                    prevEv = this._pointers.get(id);
                    this._pointers.set(id, touch);
                });
                return prevEv;
            } else {
                const id = ((event as PointerEvent).pointerId) ? (event as PointerEvent).pointerId : 0;
                prevEv = this._pointers.get(id);
                this._pointers.set(id, event);
                return prevEv;
            }
        }

        protected _removePointers(event: PointerEvent | TouchEvent | MouseEvent) {
            if ((event as TouchEvent).changedTouches) { // TouchEvent
                const changedTouches: Touch[] = Array.from((event as TouchEvent).changedTouches);
                changedTouches.forEach(touch => {
                    const id = touch.identifier;
                    this._pointers.delete(id);
                });
            } else {
                const id = ((event as PointerEvent).pointerId) ? (event as PointerEvent).pointerId : 0;
                this._pointers.delete(id);
            }
        }

        protected _getPageZoom() {
            var pageZoom = 1;
            // @ts-ignore
            if (typeof document.body.style.zoom !== "undefined") {
                try {
                    var pageZoomStr = window.getComputedStyle($("page-content")).getPropertyValue("zoom");
                    if (pageZoomStr !== "")
                        pageZoom = parseFloat(pageZoomStr);
                } catch (error) {
                    /* empty */
                }
            }
            return pageZoom;
        }

        protected _getInterfaceFactor() {
            return screen.width / window.innerWidth;
        }

        protected _getXYCoord(ev: PointerEvent | Touch | MouseEvent, ev2 ? : PointerEvent | Touch | MouseEvent) {
            var clientX = ev.clientX;
            var clientY = ev.clientY;
            if (typeof ev2 !== 'undefined') {
                clientX = (clientX + ev2.clientX) / 2;
                clientY = (clientY + ev2.clientY) / 2;
            }
            var x, y;
            [, , x, y] = gameui.calcNewLocation(this.surface_div, null, clientX, clientY, false, true);
            return [x, y];
        }

        protected _enableInteractions() {
            if (this._bEnableZooming && this.zoomingOptions.pinchZooming)
                this.container_div.classList.add("enable_zoom_interaction");
            if (this.bEnableScrolling)
                this.container_div.classList.add("enable_pan_interaction");
            // if (this.zoomingOptions.pinchZooming)
            //     this.container_div.style.touchAction = "none";
            // else
            //     this.container_div.style.touchAction = "pinch-zoom";
        }


        protected _disableInteractions() {
            this.container_div.classList.remove("enable_zoom_interaction");
            this.container_div.classList.remove("enable_pan_interaction");
            // this.container_div.style.touchAction = "auto";
        }

        protected _enableTooltipsAndClick() {
            if (SWZ.debugEn)
                var debugMsg = "";
            if (!this._enabledTooltips) {
                if (SWZ.debugEn)
                    debugMsg += "tooltips";
                gameui.switchDisplayTooltips(false);
                this._enabledTooltips = true;
                this._enableTooltipsAndClickTimerId = null;
            }
            if (!this._enabledClicks) {
                if (SWZ.debugEn)
                    debugMsg += "click";
                setTimeout(() => {
                    this._enabledClicks = true;
                    this.surface_div.removeEventListener('click', this._suppressCLickEvent_handler, this._passiveEventListener);
                }, 200);
            }
            if (SWZ.debugEn && debugMsg != "")
                SWZ.debug("_enableTooltipsAndClick enable " + debugMsg);
        }
        protected _disableTooltipsAndClick(setTimer = false) {
            if (SWZ.debugEn)
                var debugMsg = "";
            if (setTimer) {
                if (this._enableTooltipsAndClickTimerId != null)
                    clearTimeout(this._enableTooltipsAndClickTimerId);
                this._enableTooltipsAndClickTimerId = setTimeout(this._enableTooltipsAndClick_handler, 500);
            }
            if (this._enabledTooltips && !gameui.bHideTooltips) {
                if (SWZ.debugEn)
                    debugMsg += "tooltips";
                gameui.switchDisplayTooltips(true);
                for (var i in gameui.tooltips) {
                    gameui.tooltips[i]._setStateAttr("DORMANT");
                }
                this._enabledTooltips = false;
            }
            if (this._enabledClicks) {
                if (SWZ.debugEn)
                    debugMsg += "click";
                this._enabledClicks = false;
                this.surface_div.addEventListener('click', this._suppressCLickEvent_handler, this._passiveEventListener);
            }
            if (SWZ.debugEn && debugMsg != "")
                SWZ.debug("_disableTooltipsAndClick enable " + debugMsg);
        }

        protected _suppressCLickEvent(e: Event) {
            SWZ.debug("_suppressCLickEvent");
            this.surface_div.removeEventListener('click', this._suppressCLickEvent_handler, this._passiveEventListener);
            e.stopImmediatePropagation();
            e.stopPropagation();
        }

        protected _getTouchesDist(e: TouchEvent) {
            if (e.touches.length == 1)
                return 0;
            else
                return Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
        }

        protected _getTouchesMiddle(e: TouchEvent) {
            if (e.touches.length == 1)
                return new DOMPoint(e.touches[0].clientX, e.touches[0].clientY);
            else
                return new DOMPoint(
                    (e.touches[0].clientX + e.touches[1].clientX) / 2,
                    (e.touches[0].clientY + e.touches[1].clientY) / 2
                );
        }

        protected _handleTouch(e: TouchEvent) {
            // var i, touch;
            if (e.type !== "touchmove" && e.type !== "touchstart") {
                // if (e.touches.length === 1 && !(this.bEnableScrolling && this.scrollingOptions.bOneFingerScrolling)) {
                //     this._touchInteracting = true;
                //     SWZ.debug(e.touches.length);
                // }
                if (e.touches.length === 0)
                    this._touchInteracting = false;
                //SWZ.debug(e.touches.length);
            }
            if ((e.type !== "touchmove" && e.type !== "touchstart") ||
                !((this.bEnableScrolling) || (this._bEnableZooming && this.zoomingOptions.pinchZooming))) {
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
                const touches: Touch[] = Array.from(e.touches);
                touches.forEach(touch => {
                    if (!this.container_div.contains(touch.target as Node))
                        this._gestureStart = false;
                });
                // if (!this._gestureStart)
                //     SWZ.debug( this._gestureStart, e.touches.length, e.targetTouches.length);
                // const date = Date.now();
                // let currentDate = null;
                // do {
                //     currentDate = Date.now();
                // } while (currentDate - date < 40);
            }
            if (e.type === "touchmove") {
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
                        if (!this._touchInteracting) {
                            this._touchInteracting = true;
                            const touches: Touch[] = Array.from(e.touches);
                            touches.forEach(touch => {
                                if (!this.container_div.contains(touch.target as Node))
                                    this._touchInteracting = false;
                            });
                        }
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
                        //  SWZ.debug("touchmove", scrollX+scrollY, scrolling, "   ", touchesDistDiff, zooming);
                        //     if ((scrolling && this.bEnableScrolling) || 
                        //         (zooming && this._bEnableZooming && this.zoomingOptions.pinchZooming)) {
                        //         this.container_div.classList.remove("scrollmap_warning_touch");
                        //         this._touchInteracting = true;
                        //         SWZ.debug('start interacting');
                        //     }
                        this._enableInteractions();
                        // e.stopImmediatePropagation();
                        // e.preventDefault();
                    }
                    // SWZ.debug(this._touchInteracting);
                    //this._prevTouchesDist = touchesDist;
                    //this._prevTouchesMiddle = touchesMiddle;
                }
            }
        }
        protected _onPointerEnter(ev: PointerEvent) {
            // var new_evt = new PointerEvent("pointerenter", ev);
            // var canceled = !this.onsurface_div.dispatchEvent(new_evt);
        }

        protected _pointersInit() {
            this.surface_div.removeEventListener("pointerdown", this._onpointerdown_handler, this._passiveEventListener);
            this.surface_div.removeEventListener("mousedown", this._onpointerdown_handler, this._passiveEventListener);
            this.surface_div.removeEventListener("touchstart", this._onpointerdown_handler, this._passiveEventListener);
            this._pointers.clear();
            if (window.PointerEvent && !this.scrollingOptions.bUseOldTouchAndMouseEvent) {
                //this.surface_div.addEventListener('pointerenter', onPointerDown, this._passiveEventListener);
                this.surface_div.addEventListener('pointerdown', this._onpointerdown_handler, this._passiveEventListener);
            } else {
                this.surface_div.addEventListener('mousedown', this._onpointerdown_handler, this._passiveEventListener);
                this.surface_div.addEventListener('touchstart', this._onpointerdown_handler, this._passiveEventListener);
            }
        }

        protected _onPointerDown(ev: PointerEvent | TouchEvent | MouseEvent) {
            // ev.preventDefault();
            if (!this.bEnableScrolling && !(this._bEnableZooming && this.zoomingOptions.pinchZooming))
                return;
            if ((ev instanceof MouseEvent) && (ev.button != 0)) //for mouse only accept left button
                return;

            this._updatePointers(ev);
            if (this._onpointerup_handled == false) {
                this._onpointerup_handled = true;
                if (window.PointerEvent && !this.scrollingOptions.bUseOldTouchAndMouseEvent) {
                    document.addEventListener("pointerup", this._onpointerup_handler, this._passiveEventListener);
                    document.addEventListener("pointercancel", this._onpointerup_handler, this._passiveEventListener);
                } else {
                    document.addEventListener("mouseup", this._onpointerup_handler, this._passiveEventListener);
                    document.addEventListener("touchend", this._onpointerup_handler, this._passiveEventListener);
                    document.addEventListener("touchcancel", this._onpointerup_handler, this._passiveEventListener);
                }
            }
            if (!this._onpointemove_handled) {
                this._onpointemove_handled = true;
                if (window.PointerEvent && !this.scrollingOptions.bUseOldTouchAndMouseEvent) {
                    document.addEventListener("pointermove", this._onpointermove_handler /* , this._passiveEventListener */ );
                } else {
                    document.addEventListener("mousemove", this._onpointermove_handler /*,  this._passiveEventListener */ );
                    document.addEventListener("touchmove", this._onpointermove_handler /*, this._passiveEventListener */ );
                }
            }
        }

        protected _onPointerMove(ev: PointerEvent | TouchEvent | MouseEvent) {
            // SWZ.debug("pointer move");
            // var new_evt = new PointerEvent("pointermove", ev);
            // var canceled = !this.scrollable_div.firstElementChild .dispatchEvent(new_evt);
            // debugger

            this._updatePointers(ev);

            // If one pointer is move, drag the map
            if (this._pointers.size === 1) {
                if (!this.bEnableScrolling ||
                    ((( < PointerEvent > ev).pointerType == 'touch' || ( < TouchEvent > ev).changedTouches) && !this._touchInteracting))
                    return;
                if (this._xPrev === null)
                    [this._xPrev, this._yPrev] = this._getXYCoord( < PointerEvent | MouseEvent > ev);
                else {
                    const [x, y] = this._getXYCoord( < PointerEvent | MouseEvent > ev);
                    if (((Math.hypot(x - this._xPrev, y - this._yPrev) > this.scrollingTresh) || this._scrolling) && (!this._scrolltoBusy)) {
                        this.scroll(x - this._xPrev, y - this._yPrev, this._scrolling ? 0 : this._startScrollAnimDuration, 0);
                        this._scrolling = true;
                        this._xPrev = x;
                        this._yPrev = y;
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
            else if (this._pointers.size === 2 && this._touchInteracting) {

                // Calculate the distance between the two _pointers
                const it = this._pointers.values();
                const ev1 = it.next().value;
                const ev2 = it.next().value;
                const curDist = Math.hypot(ev2.clientX - ev1.clientX, ev2.clientY - ev1.clientY);
                const [x, y] = this._getXYCoord(ev1, ev2);
                // SWZ.debug(x, y);
                if (this._prevDist > 0.0) {
                    // const diff = curDist - this._prevDist;
                    // newZoom = this.zoom * (1 + this.zoomPinchDelta * diff);
                    const newZoom = this.zoom * (curDist / this._prevDist);
                    if (this._bEnableZooming && this.zoomingOptions.pinchZooming)
                        this.setMapZoom(newZoom, x, y);
                    if (this._xPrevMid === null) {
                        [this._xPrevMid, this._yPrevMid] = this._getXYCoord(ev1, ev2);
                    } else {
                        const scrollingDist = Math.hypot(x - this._xPrevMid, y - this._yPrevMid);
                        if ((scrollingDist > this.scrollingTresh) || this._scrolling)
                            if (((Math.hypot(x - this._xPrevMid, y - this._yPrevMid) > this.scrollingTresh) || this._scrolling) && !this._scrolltoBusy) {
                                if (this.bEnableScrolling) {
                                    this.scroll(x - this._xPrevMid, y - this._yPrevMid, this._scrolling ? 0 : this._startScrollAnimDuration, 0);
                                    this._xPrevMid = x;
                                    this._yPrevMid = y;
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
        }

        protected _onPointerUp(ev: PointerEvent | TouchEvent | MouseEvent) {
            this._removePointers(ev);
            // ev.preventDefault();
            // If no pointer left, stop drag or zoom the map
            if (this._pointers.size === 0) {
                this._onpointerup_handled = false;
                this._onpointemove_handled = false;
                //if (window.PointerEvent && !this.scrollingOptions.bUseOldTouchAndMouseEvent) {
                document.removeEventListener("pointermove", this._onpointermove_handler /* , this._passiveEventListener */ );
                document.removeEventListener("pointerup", this._onpointerup_handler, this._passiveEventListener);
                document.removeEventListener("pointercancel", this._onpointerup_handler, this._passiveEventListener);
                //} else {
                document.removeEventListener("mousemove", this._onpointermove_handler /* , this._passiveEventListener */ );
                document.removeEventListener("touchmove", this._onpointermove_handler /* , this._passiveEventListener */ );
                document.removeEventListener("mouseup", this._onpointerup_handler, this._passiveEventListener);
                document.removeEventListener("touchend", this._onpointerup_handler, this._passiveEventListener);
                document.removeEventListener("touchcancel", this._onpointerup_handler, this._passiveEventListener);
                //}
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

        }

        protected _onWheel(evt: WheelEvent) {
            if (!this._bEnableZooming)
                return;
            var wheelZoom = false;
            if (this.zoomingOptions.bWheelZooming) {
                switch (this.zoomingOptions.wheelZooming) {
                    // Zoom with scroll wheel

                    case ScrollmapWithZoom.wheelZoomingKeys.None:
                        wheelZoom = !(evt.ctrlKey || evt.altKey || evt.metaKey || evt.shiftKey);
                        break;

                    case ScrollmapWithZoom.wheelZoomingKeys.AnyOrNone:
                        wheelZoom = true;
                        break;

                    case ScrollmapWithZoom.wheelZoomingKeys.Any:
                        wheelZoom = (evt.ctrlKey || evt.altKey || evt.metaKey || evt.shiftKey);
                        break;

                    case ScrollmapWithZoom.wheelZoomingKeys.Ctrl:
                        wheelZoom = evt.ctrlKey;
                        break;

                    case ScrollmapWithZoom.wheelZoomingKeys.Shift:
                        wheelZoom = evt.shiftKey;
                        break;

                    case ScrollmapWithZoom.wheelZoomingKeys.Alt:
                        wheelZoom = evt.altKey;
                        break;

                    case ScrollmapWithZoom.wheelZoomingKeys.Meta:
                        wheelZoom = evt.metaKey;
                        break;
                }
            }

            if (!wheelZoom) {
                if (this.zoomingOptions.bWheelZooming && !this._isScrolling) {
                    // Set a timeout to run after scrolling ends
                    this._isScrolling = setTimeout(() => {
                        this.container_div.classList.remove("scrollmap_warning_scroll");
                        clearTimeout(this._isScrolling);
                        // this._isScrolling = 0;
                    }, 3000);
                    this.container_div.classList.add("scrollmap_warning_scroll");
                }
                return;
            }
            this.container_div.classList.remove("scrollmap_warning_scroll");
            evt.preventDefault();
            const [x, y] = this._getXYCoord(evt);
            // SWZ.debug("onwheel", evt.clientX, evt.clientY, x, y);
            this.changeMapZoom(evt.deltaY * -this.zoomWheelDelta, x, y);
            this._disableTooltipsAndClick(true);
        }

        scroll(dx: number, dy: number, duration ? : number, delay ? : number) {
            // SWZ.debug("scroll", this.board_x, dx, this.board_y, dy);
            this._scrollto(this.board_x + dx, this.board_y + dy, duration, delay);
        }

        // Scroll the board to make it centered on given position
        scrollto(x: number, y: number, duration ? : number, delay ? : number) {
            // SWZ.debug("scroll", this.board_x, dx, this.board_y, dy);
            this._scrollto(x * this.zoom, y * this.zoom, duration, delay, true);
        }

        scrolltoAndZoom(x: number, y: number, zoom: number, duration ? : number, delay ? : number) {
            // SWZ.debug("scroll", this.board_x, dx, this.board_y, dy);
            this.setMapZoom(zoom);
            this._scrollto(x * zoom, y * zoom, duration, delay, true);
        }

        scrolltoObjectAndZoom(obj: HTMLElement | string, zoom: number, duration ? : number, delay ? : number) {
            this.setMapZoom(zoom);
            this.scrolltoObject(obj, duration, delay);
        }

        scrolltoObject(obj: HTMLElement | string, duration ? : number, delay ? : number) {
            if (typeof obj == "string")
                obj = < HTMLElement > $(obj);
            if (!obj)
                return
            var objPos = gameui.getBoundingClientRectIgnoreZoom(obj);
            var mapPos = gameui.getBoundingClientRectIgnoreZoom(this.scrollable_div);

            // Coordinates (pixels left and top relative to map_scrollable_oversurface) of the player's frog
            var objLocation = {
                x: objPos.left + (objPos.width / 2) - mapPos.left,
                y: objPos.top + (objPos.height / 2) - mapPos.top
            };

            this._scrollto(-objLocation.x, -objLocation.y, duration, delay, true);
        }

        // Scroll the board to make it centered on given position
        protected _scrollto(x: number, y: number, duration ? : number, delay ? : number, setStartPositionIfNeeded ? : boolean) {
            if (this._setupDone)
                this._scrolled = true;
            else if (setStartPositionIfNeeded)
                this.startPosition = { x: -x / this.zoom, y: -y / this.zoom };
            // SWZ.debug("scrollto", this.board_x, this.board_y);
            if (duration == null) {
                duration = 350; // Default duration
            }
            if (delay == null) {
                delay = 0; // Default delay
            }
            if (!this._setupDone) {
                duration = 0;
                delay = 0;
            }
            const s = window.getComputedStyle(this.clipped_div);
            const width = parseFloat(s.width);
            const height = parseFloat(s.height);

            const board_x = toint(x + width / 2);
            const board_y = toint(y + height / 2);
            // SWZ.debug("scrollto board_x, board_y=",board_x, board_y);

            this.board_x = x;
            this.board_y = y;

            if ((duration == 0) && (delay == 0)) {
                if (this.animation_div !== null) {
                    this.animation_div.style.left = board_x + "px";
                    this.animation_div.style.top = board_y + "px";
                }
                this.scrollable_div.style.left = board_x + "px";
                this.onsurface_div.style.left = board_x + "px";
                this.scrollable_div.style.top = board_y + "px";
                this.onsurface_div.style.top = board_y + "px";
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
            if (this.animation_div !== null) {
                var anim3 = dojo.fx.slideTo({
                    node: this.animation_div,
                    top: board_y,
                    left: board_x,
                    unit: "px",
                    duration: duration,
                    delay: delay
                });
                anims = [anim1, anim2, anim3];
            } else
                anims = [anim1, anim2];
            var anim = dojo.fx.combine(anims);
            anim.play();
            this._scrolltoBusy = true;
            setTimeout(() => {
                this._scrolltoBusy = false;
            }, duration + delay);
        }


        zoomToFitAndScrollToCenter(custom_css_query ? : string, duration ? : number, delay ? : number,
            x_extra_l: number = null, x_extra_r: number = null, y_extra_u: number = null, y_extra_d: number = null, cover_arrows: boolean = null): {
            x: number;y: number;
        } {
            if (x_extra_l != null) {
                this._x_extra_l = x_extra_l;
                this._x_extra_r = x_extra_r;
                this._y_extra_u = y_extra_u;
                this._y_extra_d = y_extra_d;
            }
            this.zoomToFit(x_extra_l, x_extra_r, y_extra_u, y_extra_d, cover_arrows);
            return this.scrollToCenter(custom_css_query, duration, delay,
                x_extra_l, x_extra_r, y_extra_u, y_extra_d);
        }

        // Scroll map in order to center everything
        // By default, take all elements in movable_scrollmap
        //  you can also specify (optional) a custom CSS query to get all concerned DOM elements
        scrollToCenter(custom_css_query ? : string, duration ? : number, delay ? : number,
            x_extra_l: number = null, x_extra_r: number = null, y_extra_u: number = null, y_extra_d: number = null): {
            x: number;y: number;
        } {
            if (this.defaultPosition) {
                this.scrollto(-this.defaultPosition.x, -this.defaultPosition.y, duration);
                return;
            }
            if (this._x_extra_l != null && x_extra_l == null) {
                x_extra_l = this._x_extra_l;
                x_extra_r = this._x_extra_r;
                y_extra_u = this._y_extra_u;
                y_extra_d = this._y_extra_d;
            }
            if (x_extra_l == null) {
                x_extra_l = 0;
                x_extra_r = 0;
                y_extra_u = 0;
                y_extra_d = 0;
            }
            if (!custom_css_query)
                custom_css_query = this.centerCssQuery;
            const center = this.getMapCenter(custom_css_query);
            center.x += (x_extra_r - x_extra_l) / 2;
            center.y += (y_extra_d - y_extra_u) / 2;
            SWZ.debug("scrollToCenter", center.x, center.y, x_extra_l, x_extra_r, y_extra_u, y_extra_d);
            this.scrollto(-center.x, -center.y, duration, delay);
            return {
                x: center.x,
                y: center.y
            };
        }

        protected reset(duration ? : number) {
            if (this._resetMode == ScrollmapWithZoom.ResetMode.ScrollAndZoom)
                this.setMapZoom(this.defaultZoom);
            if (this._resetMode == ScrollmapWithZoom.ResetMode.ScrollAndZoomFit)
                this.zoomToFit();
            this.scrollToCenter(null, duration);
        }

        protected _isRectInside(outerRect: DOMRectReadOnly, innerRect: DOMRectReadOnly): boolean {
            return !(
                innerRect.left < outerRect.left ||
                innerRect.top < outerRect.top ||
                innerRect.right > outerRect.right ||
                innerRect.bottom > outerRect.bottom
            );
        }

        protected _intersect(rect1: DOMRectReadOnly, rect2: DOMRectReadOnly): boolean {
            // Vérifier si rect1 est à gauche de rect2
            const isLeft = rect1.right < rect2.left;

            // Vérifier si rect1 est à droite de rect2
            const isRight = rect1.left > rect2.right;

            // Vérifier si rect1 est au-dessus de rect2
            const isAbove = rect1.bottom < rect2.top;

            // Vérifier si rect1 est en dessous de rect2
            const isBelow = rect1.top > rect2.bottom;

            // Si l'une de ces conditions est vraie, les rectangles ne s'intersectent pas
            return !(isLeft || isRight || isAbove || isBelow);
        }

        protected _adjustToContain(outerRect: DOMRect, innerRect: DOMRect, margin: number = 40): { x: number, y: number } {
            let deltaX = 0;
            let deltaY = 0;

            if (innerRect.left < outerRect.left) {
                deltaX = outerRect.left - innerRect.left + margin;
            } else if (innerRect.right > outerRect.right) {
                deltaX = outerRect.right - innerRect.right - margin;
            }

            if (innerRect.top < outerRect.top) {
                deltaY = outerRect.top - innerRect.top + margin;
            } else if (innerRect.bottom > outerRect.bottom) {
                deltaY = outerRect.bottom - innerRect.bottom - margin;
            }

            return { x: deltaX, y: deltaY };
        }

        isObjVisible(obj: HTMLElement) {
            return this._isRectInside(this.clipped_div.getBoundingClientRect(), obj.getBoundingClientRect());
        }

        isVisible(x: number, y: number, w: number = 0, h: number = 0) {
            const s = window.getComputedStyle(this.clipped_div);
            const width = parseFloat(s.width);
            const height = parseFloat(s.height);

            const obj_rect = new DOMRect(x * this.zoom, y * this.zoom, w * this.zoom, h * this.zoom);
            const board_rect = new DOMRect(-this.board_x - width / 2, -this.board_y - height / 2, width, height);
            return this._isRectInside(board_rect, obj_rect);

        }

        _makeRectVisible(obj_rect: DOMRect, board_rect: DOMRect, centerOnIt: boolean = true, excl_width: number = 0, excl_height: number = 0, pos: "topleft" | "topright" | "bottomleft" | "bottomright" = "topleft") {
            if (centerOnIt) {
                if (!this._isRectInside(board_rect, obj_rect)) {
                    const { x, y, width, height } = obj_rect;
                    this.scrollto(-x - width / 2, -y - height / 2);
                }
            } else {
                let delta = this._adjustToContain(board_rect, obj_rect);
                if ((excl_width != 0 || excl_height != 0)) {
                    const { left: b_left, right: b_right, top: b_top, bottom: b_bottom, width: b_width, height: b_height } = board_rect;
                    let excl_rect;
                    switch (pos) {
                        case "topright":
                            excl_rect = new DOMRect(b_right - excl_width, b_top, excl_width, excl_height);
                            break;
                        case "bottomleft":
                            excl_rect = new DOMRect(b_left, b_bottom - excl_height, excl_width, excl_height);
                            break;
                        case "bottomright":
                            excl_rect = new DOMRect(b_right - excl_width, b_bottom - excl_height, excl_width, excl_height);
                            break;
                        case "topleft":
                            excl_rect = new DOMRect(b_left, b_top, excl_width, excl_height);
                            break;
                        default:
                            excl_rect = null;
                            console.error("_makeRectVisible: wrong 'pos' argument value");
                            break;
                    }
                    obj_rect.x += delta.x;
                    obj_rect.y += delta.y;
                    if (excl_rect && this._intersect(excl_rect, obj_rect)) {
                        let board_rect1;
                        let board_rect2;
                        switch (pos) {
                            case "topright":
                                board_rect1 = new DOMRect(b_left, b_top, b_width - excl_width, b_height);
                                board_rect2 = new DOMRect(b_left, b_top + excl_height, b_width, b_height - excl_height);
                                break;
                            case "bottomleft":
                                board_rect1 = new DOMRect(b_left + excl_width, b_top, b_width - excl_width, b_height);
                                board_rect2 = new DOMRect(b_left, b_top, b_width, b_height - excl_height);
                                break;
                            case "bottomright":
                                board_rect1 = new DOMRect(b_left, b_top, b_width - excl_width, b_height);
                                board_rect2 = new DOMRect(b_left, b_top, b_width, b_height - excl_height);
                                break;
                            default:
                                board_rect1 = new DOMRect(b_left + excl_width, b_top, b_width - excl_width, b_height);
                                board_rect2 = new DOMRect(b_left, b_top + excl_height, b_width, b_height - excl_height);
                                break;
                        }
                        let delta1 = this._adjustToContain(board_rect1, obj_rect);
                        let delta2 = this._adjustToContain(board_rect2, obj_rect);
                        if (Math.hypot(delta.x + delta1.x, delta.y + delta1.y) < Math.hypot(delta.x + delta2.x, delta.y + delta2.y)) {
                            delta.x += delta1.x;
                            delta.y += delta1.y;
                        } else {
                            delta.x += delta2.x;
                            delta.y += delta2.y;
                        }
                    }
                }
                if (delta.x != 0 || delta.y != 0)
                    this.scroll(delta.x, delta.y);
            }
        }


        makeObjVisible(obj: HTMLElement, centerOnIt: boolean = false, excl_width: number = 0, excl_height: number = 0, pos: "topleft" | "topright" | "bottomleft" | "bottomright" = "topleft") {
            let board_rect = gameui.getBoundingClientRectIgnoreZoom(this.clipped_div);
            let obj_rect = gameui.getBoundingClientRectIgnoreZoom(obj);
            this._makeRectVisible(obj_rect, board_rect, centerOnIt, excl_width, excl_height, pos);
        }
        makeVisible(x: number, y: number, w: number = 0, h: number = 0, centerOnIt: boolean = false, excl_width: number = 0, excl_height: number = 0, pos: "topleft" | "topright" | "bottomleft" | "bottomright" = "topleft") {
            const s = window.getComputedStyle(this.clipped_div);
            const width = parseFloat(s.width);
            const height = parseFloat(s.height);
            var obj_rect = new DOMRect(x * this.zoom, y * this.zoom, w * this.zoom, h * this.zoom);
            var board_rect = new DOMRect(-this.board_x - width / 2, -this.board_y - height / 2, width, height);
            this._makeRectVisible(obj_rect, board_rect, centerOnIt, excl_width, excl_height, pos);
        }
        getMapLimits(custom_css_query: string = null): {
            min_x: number;max_x: number;min_y: number;max_y: number;
        } {
            // Get all elements inside and get their max x/y/w/h
            var max_x: number = null;
            var max_y: number = null;
            var min_x: number = null;
            var min_y: number = null;

            var scales = new Map();

            function calcMaxMin(node: HTMLElement, top_div: HTMLElement) {
                if (node.offsetParent == null) // element not displayed
                    return;
                // SWZ.debug(node);
                let s = window.getComputedStyle(node);
                if (s.left == "auto" /*  && s.position == "absolute" */ ) {
                    Array.from(node.children).forEach((node) => {
                        calcMaxMin( < HTMLElement > node, top_div);
                    });
                    return;
                }
                let directParent = node.parentNode;
                let parent = directParent;
                let scaleTotal = scales.get(parent);
                if (!scaleTotal) {
                    scaleTotal = 1;
                    while (!parent.isEqualNode(top_div)) {
                        let transform = window.getComputedStyle( < HTMLElement > parent).transform;
                        let scale = 1;
                        if (transform !== "none") {
                            let matrix = new DOMMatrix(transform);
                            scale = Math.hypot(matrix.m11, matrix.m21, matrix.m31);
                        }
                        scaleTotal *= scale;
                        parent = parent.parentNode;
                    }
                    scales.set(directParent, scaleTotal);
                    // SWZ.debug("scaleTotal",scaleTotal);
                }
                let left = (node.offsetLeft * scaleTotal) || 0;
                let width = (parseFloat(s.width) * scaleTotal) || (node.offsetWidth * scaleTotal);
                max_x = (max_x !== null) ? Math.max(max_x, left + width) : left + width;
                min_x = (min_x !== null) ? Math.min(min_x, left) : left;

                let top = (node.offsetTop * scaleTotal) || 0;
                let height = (parseFloat(s.height) * scaleTotal) || (node.offsetHeight * scaleTotal);
                max_y = (max_y !== null) ? Math.max(max_y, top + height) : top + height;
                min_y = (min_y !== null) ? Math.min(min_y, top) : top;
                SWZ.debug(node.id, left, top, left + width, top + height);
            }
            var css_query = ":scope > *";
            if (custom_css_query) {
                css_query = custom_css_query;
            }
            this.scrollable_div.querySelectorAll(css_query).forEach((node) => {
                calcMaxMin( < HTMLElement > node, this.scrollable_div);
            });
            if (this.centerCalcUseAlsoOnsurface)
                this.onsurface_div.querySelectorAll(css_query).forEach((node) => {
                    calcMaxMin( < HTMLElement > node, this.onsurface_div);
                });
            SWZ.debug("getMapLimits", min_x, max_x, min_y, max_y);
            return {
                min_x,
                max_x,
                min_y,
                max_y
            };
        }

        getMapCenter(custom_css_query: string = null): {
            x: number;y: number;
        } {
            var {
                min_x,
                max_x,
                min_y,
                max_y
            } = this.getMapLimits(custom_css_query);
            var center;
            var centerOffset = this.centerPositionOffset;
            if (min_x !== null || min_y !== null || max_x !== null || max_y !== null)
                center = {
                    x: (min_x + max_x) / 2,
                    y: (min_y + max_y) / 2
                };
            else if (this.startPosition) {
                SWZ.debug("getMapCenter use startPosition");
                center = this.startPosition;
            } else {
                center = {
                    x: 0,
                    y: 0
                };
                centerOffset = {
                    x: 0,
                    y: 0
                };
            }
            center.x = center.x + centerOffset.x;
            center.y = center.y + centerOffset.y;
            // SWZ.debug("getMapCenter",  min_x,  max_x, min_y, max_y);
            SWZ.debug("getMapCenter", center);

            return center;
        }

        zoomToFit(x_extra_l: number = null, x_extra_r: number = null, y_extra_u: number = null, y_extra_d: number = null, cover_arrows: boolean = null) {
            if (this._x_extra_l != null && x_extra_l == null) {
                x_extra_l = this._x_extra_l;
                x_extra_r = this._x_extra_r;
                y_extra_u = this._y_extra_u;
                y_extra_d = this._y_extra_d;
            }
            if (x_extra_l == null) {
                x_extra_l = 0;
                x_extra_r = 0;
                y_extra_u = 0;
                y_extra_d = 0;
            }
            if (cover_arrows !== null)
                this._cover_arrows = cover_arrows;
            else
                cover_arrows = this._cover_arrows;
            const {
                min_x,
                max_x,
                min_y,
                max_y
            } = this.getMapLimits();
            var container_width = this.clipped_div.clientWidth;
            if (cover_arrows === false)
                container_width -= 2 * this._btnMoveLeft.clientWidth;
            var container_height = this.clipped_div.clientHeight;
            if (cover_arrows === false)
                container_height -= 2 * this._btnMoveTop.clientHeight;
            const newZoom = Math.min(container_width / (max_x - min_x + x_extra_l + x_extra_r),
                container_height / (max_y - min_y + y_extra_u + y_extra_d));
            SWZ.debug("zoomToFit", newZoom, min_x, max_x, min_y, max_y, x_extra_l, x_extra_r, y_extra_u, y_extra_d, cover_arrows);
            this.setMapZoom(newZoom);
            if (!this._setupDone)
                this._zoomFitCalledDuringSetup = true;
        }

        changeMapZoom(diff: number, x = 0, y = 0) {
            const newZoom = this.zoom * (1 + diff);
            this.setMapZoom(newZoom, x, y);
        }


        setMapZoom(zoom: number, x = 0, y = 0) {
            if (zoom >= this.maxZoom) {
                zoom = this.maxZoom;
                this._disableButton(this._btnZoomPlus);
            } else if (zoom <= this.minZoom) {
                zoom = this.minZoom;
                this._disableButton(this._btnZoomMinus);
            } else {
                if (this._btnZoomMinus && (this._prevZoom <= this.minZoom))
                    this._enableButton(this._btnZoomMinus);
                if (this._btnZoomPlus && (this._prevZoom >= this.maxZoom))
                    this._enableButton(this._btnZoomPlus);
            }
            this.zoom = zoom;

            if (this.bScrollDeltaAlignWithZoom) {
                this._scrollDeltaAlignWithZoom = this.scrollDelta * zoom;
                //this._longPressScrollAlignWithZoom = this.longPressScroll * zoom;
            } else {
                this._scrollDeltaAlignWithZoom = this.scrollDelta;
                //this._longPressScrollAlignWithZoom = this.longPressScroll;
            }
            if (this._bRevertArrowsScroll) {
                this._scrollDeltaAlignWithZoom = -this._scrollDeltaAlignWithZoom;
                //this._longPressScrollAlignWithZoom = -this._longPressScrollAlignWithZoom;
            }

            this._setScale(this.scrollable_div, this.zoom);
            this._setScale(this.onsurface_div, this.zoom);
            if (this.animation_div !== null)
                this._setScale(this.animation_div, this.zoom);
            this.container_div.style.setProperty("--scrollmap_zoomed_transform", `scale(${this.zoom})`);
            this.container_div.style.setProperty("--scrollmap_unzoomed_transform", `scale(${1 / this.zoom})`);
            this.container_div.style.setProperty("--scrollmap_zoom", `${this.zoom}`);
            document.body.style.setProperty("--scrollmap_zoomed_transform", `scale(${this.zoom})`);
            document.body.style.setProperty("--scrollmap_unzoomed_transform", `scale(${1 / this.zoom})`);
            document.body.style.setProperty("--scrollmap_zoom", `${this.zoom}`);
            if (this._prevZoom == this.zoom)
                return;
            if (this.zoomChangeHandler)
                this.zoomChangeHandler(this.zoom);
            const zoomDelta = this.zoom / this._prevZoom;
            //SWZ.debug(x+' '+ y+' '+ zoomDelta+' '+ this.zoom);
            this._scrollto((this.board_x * zoomDelta) + x * (1 - zoomDelta), (this.board_y * zoomDelta) + y * (1 - zoomDelta), 0, 0);
            this._prevZoom = this.zoom;
        }

        protected _setScale(elemId: HTMLElement, scale: number) {
            $(elemId).style.transform = 'scale(' + scale + ')';
        }

        protected _getButton(btnNames: string[] | string, idSuffix = ""): HTMLElement {
            var btnNamesL = (typeof btnNames === "string") ? btnNames.split(',') : btnNames;
            for (let i in btnNamesL) {
                let btnName = btnNamesL[i];
                var $btn = null;
                var $querydiv;
                if (idSuffix == "")
                    $querydiv = this.container_div;
                else
                    $querydiv = document.getElementById(this.container_div.id + idSuffix);
                if ($querydiv != null)
                    $btn = $querydiv.querySelector('.' + this._classNameSuffix + btnName);
                //SWZ.debug($btn);
                //SWZ.debug('#' + this.container_div.id+idSuffix + ' .'+this._classNameSuffix+btnName);
                if ($btn === null)
                    $btn = $(btnName);
                if ($btn) {
                    SWZ.debug(btnName + " found");
                    return $btn;
                }
            }
            SWZ.debug(btnNamesL.join(',') + " not found");
            return null;
        }

        protected _toggleButtonsVisiblity() {
            this._setButtonsVisiblity(!this._bBtnsVisible);
        }

        protected _setButtonsVisiblity(visible: boolean, dispatch = true) {
            this._bBtnsVisible = visible;
            if (!visible && !this.btnsDivOnMap)
                return;
            this.container_div.querySelectorAll(".scrollmap_button_wrapper").forEach((node: HTMLElement) => {
                if (visible && !node.classList.contains("scrollmap_icon_always_invisible"))
                    node.classList.remove("scrollmap_btn_nodisplay");
                else if (!node.classList.contains("scrollmap_icon_always_visible"))
                    node.classList.add("scrollmap_btn_nodisplay");
            });
        }


        private static _toggleButtonsVisiblity() {
            for (let inst of ScrollmapWithZoom.instances.values()) {
                inst._toggleButtonsVisiblity();
            }
        }

        protected _hideButton($btn: HTMLElement, idSuffix = "") {
            if ($btn !== null && !$btn.classList.contains("scrollmap_btn_nodisplay")) {
                SWZ.debug("_hideButton", $btn);
                $btn.classList.add("scrollmap_btn_nodisplay");
                $btn.classList.add("scrollmap_icon_always_invisible");
            }
        }

        protected _showButton($btn: HTMLElement, idSuffix = "", display = 'block') {
            if ($btn !== null && $btn.classList.contains("scrollmap_btn_nodisplay")) {
                SWZ.debug("_showButton", $btn);
                $btn.classList.remove("scrollmap_btn_nodisplay");
                $btn.classList.add("scrollmap_icon_always_invisible");
            }
        }

        protected _enableButton($btn: HTMLElement, idSuffix = "") {
            if ($btn !== null && $btn.classList.contains("scrollmap_btn_disabled")) {
                SWZ.debug("_enableButton", $btn);
                $btn.classList.remove("scrollmap_btn_disabled");
            }
        }

        protected _disableButton($btn: HTMLElement, idSuffix = "", display = 'block') {
            if ($btn !== null && !$btn.classList.contains("scrollmap_btn_disabled")) {
                SWZ.debug("_disableButton", $btn);
                $btn.classList.add("scrollmap_btn_disabled");
            }
        }

        protected _createButton(button_code: string): HTMLElement {
            if (this.clipped_div) {
                this.clipped_div.insertAdjacentHTML("beforeend", button_code);
                return < HTMLElement > this.clipped_div.lastElementChild;
            } else {
                this.container_div.insertAdjacentHTML("beforeend", button_code);
                return < HTMLElement > this.container_div.lastElementChild;
            }
        }

        protected _initButton(btnNames: string, defaultButton: string, tooltip: string = '', onClick: Function = null, onLongPressedAnim: Function = null, destDiv: HTMLElement = undefined, idSuffix = "", display = 'block'): HTMLElement {
            var btnNamesL = btnNames.split(",");
            var $btn = this._getButton(btnNamesL, idSuffix);
            if ($btn)
                $btn.style.display = "none";
            if (!defaultButton)
                return null;
            $btn = this._createButton(defaultButton);
            if (!$btn)
                return null;
            $btn.classList.add("scrollmap_icon");
            if (tooltip) {
                if ($btn.title == "") {
                    $btn.title = tooltip;
                }
                //gameui.addTooltip($btn.id, tooltip)
            }
            if ((typeof destDiv === 'undefined') || (destDiv != null)) {
                var btnWrapper = document.createElement('div');
                var btnName = btnNamesL[0];
                // btnWrapper.id = this.container_div.id + "_" + btnName + "_wrapper";
                btnWrapper.appendChild($btn);
                btnWrapper.classList.add(btnName);
                btnWrapper.classList.add('scrollmap_button_wrapper');
                if (typeof destDiv === 'undefined')
                    destDiv = this._buttons_div;
                destDiv.appendChild(btnWrapper);
                $btn = btnWrapper;
            }
            if (onClick) {
                onClick = onClick.bind(this);
                $btn.addEventListener('click', (e) => {
                    onClick(e);
                    e.stopPropagation();
                }, true);
            }
            $btn.style.cursor = 'pointer';
            // $btn.style.display = display;
            if (this.bEnableLongPress && onLongPressedAnim != null) {
                $btn.removeAttribute("href");
                $btn.setAttribute("data-long-press-delay", "500");
                $btn.addEventListener('long-press', this._onButtonLongPress.bind(this, onLongPressedAnim));
                $btn.addEventListener('long-press-end', this._onButtonLongPressEnd.bind(this));
            }
            return $btn;
        }

        //////////////////////////////////////////////////
        //// Long press handling on buttons

        protected _onButtonLongPress(onLongPressedAnim: Function, evt: Event) {
            // SWZ.debug("onButtonLongPress");
            var _longPressAnim = (time: number, anim = onLongPressedAnim) => {
                anim();
                if (this._longPress)
                    requestAnimationFrame(_longPressAnim);
            };
            this._longPress = true;
            evt.preventDefault();
            requestAnimationFrame(_longPressAnim);
        }

        protected _onButtonLongPressEnd(evt: Event) {
            //this.onMoveTop();
            //SWZ.debug("onButtonLongPressEnd");
            this._longPress = false;
        }

        //////////////////////////////////////////////////
        //// Scroll/zoom with keys

        setupKeys() {
            if (ScrollmapWithZoom.bEnableKeys) {
                document.addEventListener("keydown", (e) => {
                    this._onKeyDown(e)
                });
                document.addEventListener("keyup", (e) => {
                    this._onKeyUp(e)
                });
            }
        }


        protected _onKeyDown(e: KeyboardEvent) {
            if (!ScrollmapWithZoom.bEnableKeys || ScrollmapWithZoom.count != 1)
                return;
            if (gameui.chatbarWindows['table_' + gameui.table_id].status == 'expanded')
                return;
            if (!this._keysPressed.get(e.key))
                this._keysPressed.set(e.key, {
                    pressed: true
                });
            // this._longKeyPress = false;
            switch (e.key) {
                case "ArrowLeft":
                case "ArrowRight":
                case "ArrowUp":
                case "ArrowDown":
                case "Home":
                case "End":
                    if (e.ctrlKey) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        break;
                    } else {
                        this.container_div.classList.add("scrollmap_warning_arrowkeys");
                    }
                    return;
                case "+":
                case "-":
                    if (this._keysPressed.size == 1) { // only this key pressed
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        break;
                    }
                    return;
                default:
                    return;

            }
            if (typeof this._keysPressed.get(e.key).timer === "undefined") {
                SWZ.debug("onKeyDown", e.key);
                this._keysPressed.get(e.key).timer = setTimeout(() => {
                    this._onKeyLongPress(e.key);
                }, 500);
            }
        }

        protected _onKeyLongPress(key: string) {
            SWZ.debug("onKeyLongPress");
            if (!this._keysPressed.get(key))
                return false;
            this._keysPressed.get(key).timer = null;
            var _longPressAnim = (time: number) => {
                this._onKeyLongPressAnim(key);
                if (this._keysPressed.get(key))
                    requestAnimationFrame(_longPressAnim);
            };
            // this._longKeyPress = true;
            requestAnimationFrame(_longPressAnim);
        }

        protected _onKeyLongPressAnim(key: string) {
            var handled = true;
            switch (key) {
                case "ArrowLeft":
                    if (this.bEnableKeysArrows && this._keysPressed.get("Control"))
                        this.scroll(this._longPressScrollOriented, 0, 0, 0);
                    break;
                case "ArrowRight":
                    if (this.bEnableKeysArrows && this._keysPressed.get("Control"))
                        this.scroll(-this._longPressScrollOriented, 0, 0, 0);
                    break;
                case "ArrowUp":
                    if (this.bEnableKeysArrows && this._keysPressed.get("Control"))
                        this.scroll(0, this._longPressScrollOriented, 0, 0);
                    break;
                case "ArrowDown":
                    if (this.bEnableKeysArrows && this._keysPressed.get("Control"))
                        this.scroll(0, -this._longPressScrollOriented, 0, 0);
                    break;
                case "+":
                    if (this.bEnableKeysPlusMinus)
                        this.changeMapZoom(this._longPressScrollOriented);
                    break;
                case "-":
                    if (this.bEnableKeysPlusMinus)
                        this.changeMapZoom(-this._longPressScrollOriented);
                    break;
                default:
                    handled = false;
            }
            return handled;
        }

        protected _onKeyUp(e: KeyboardEvent) {
            if (!ScrollmapWithZoom.bEnableKeys || ScrollmapWithZoom.count != 1)
                return;
            setTimeout(() => { this.container_div.classList.remove("scrollmap_warning_arrowkeys"); }, 3000);
            if (!this._keysPressed.get(e.key))
                return;
            SWZ.debug("onKeyUp", e.key);
            var timer = this._keysPressed.get(e.key).timer;
            this._keysPressed.delete(e.key);
            if (!timer) {
                return;
            } else
                clearTimeout(timer);

            var handled = true;
            switch (e.key) {
                case "ArrowLeft":
                    if (this.bEnableKeysArrows && this._keysPressed.get("Control"))
                        this._onMoveLeft(e);
                    break;
                case "ArrowRight":
                    if (this.bEnableKeysArrows && this._keysPressed.get("Control"))
                        this._onMoveRight(e);
                    break;
                case "ArrowUp":
                    if (this.bEnableKeysArrows && this._keysPressed.get("Control"))
                        this._onMoveTop(e);
                    break;
                case "ArrowDown":
                    if (this.bEnableKeysArrows && this._keysPressed.get("Control"))
                        this._onMoveDown(e);
                    break;
                case "+":
                    if (this.bEnableKeysPlusMinus)
                        this._onZoomIn(e);
                    break;
                case "-":
                    if (this.bEnableKeysPlusMinus)
                        this._onZoomOut(e);
                    break;
                case "Home":
                    if (this.bEnableKeyHome && this._keysPressed.get("Control"))
                        this.scrollToCenter();
                    break;
                case "End":
                    if (this.bEnableKeyEnd && this._keysPressed.get("Control"))
                        this.zoomToFit();
                    break;
                default:
                    handled = false;
            }
            if (handled) {
                e.preventDefault();
                e.stopImmediatePropagation();
            }
        }

        //////////////////////////////////////////////////
        //// Scroll with buttons

        // Optional: setup on screen arrows to scroll the board
        setupOnScreenArrows(scrollDelta: number, bScrollDeltaAlignWithZoom = true) {
            SWZ.debug("setupOnScreenArrows");
            this.scrollDelta = scrollDelta;
            this.bScrollDeltaAlignWithZoom = bScrollDeltaAlignWithZoom;
            var _btnsMoveHelp = dojo.string.substitute(_("Scroll display (you can also use ${keys} + arrow keys)"), { keys: _("ctrl") });
            if (this.bScrollDeltaAlignWithZoom)
                this._scrollDeltaAlignWithZoom = scrollDelta * this.zoom;
            else
                this._scrollDeltaAlignWithZoom = scrollDelta;
            if (!this._btnMoveTop) {
                this._btnMoveTop = this._initButton('movetop', this.btnMoveTopHtml, _btnsMoveHelp, this._onMoveTop, () => {
                    this.scroll(0, this._longPressScrollOriented, 0, 0);
                }, null);
                this._btnMoveTop.classList.add('scrollmap_icon_always_visible');
            }
            if (!this._btnMoveDown) {
                this._btnMoveDown = this._initButton('movedown', this.btnMoveDownHtml, _btnsMoveHelp, this._onMoveDown, () => {
                    this.scroll(0, -this._longPressScrollOriented, 0, 0);
                }, null);
                this._btnMoveDown.classList.add('scrollmap_icon_always_visible');
            }
            if (!this._btnMoveLeft) {
                this._btnMoveLeft = this._initButton('moveleft', this.btnMoveLeftHtml, _btnsMoveHelp, this._onMoveLeft, () => {
                    this.scroll(this._longPressScrollOriented, 0, 0, 0);
                }, null);
                this._btnMoveLeft.classList.add('scrollmap_icon_always_visible');
            }
            if (!this._btnMoveRight) {
                this._btnMoveRight = this._initButton('moveright', this.btnMoveRightHtml, _btnsMoveHelp, this._onMoveRight, () => {
                    this.scroll(-this._longPressScrollOriented, 0, 0, 0);
                }, null);
                this._btnMoveRight.classList.add('scrollmap_icon_always_visible');
            }
        }

        showOnScreenArrows() {
            this._showButton(this._btnMoveTop);
            this._showButton(this._btnMoveDown);
            this._showButton(this._btnMoveLeft);
            this._showButton(this._btnMoveRight);
        }

        hideOnScreenArrows() {
            this._hideButton(this._btnMoveTop);
            this._hideButton(this._btnMoveDown);
            this._hideButton(this._btnMoveLeft);
            this._hideButton(this._btnMoveRight);
        }

        protected _onMoveTop(evt: Event = null) {
            //SWZ.debug("onMoveTop");
            if (evt)
                evt.preventDefault();
            this.scroll(0, this._scrollDeltaAlignWithZoom);
        }

        protected _onMoveLeft(evt: Event = null) {
            // SWZ.debug("onMoveLeft");
            if (evt)
                evt.preventDefault();
            this.scroll(this._scrollDeltaAlignWithZoom, 0);
        }

        protected _onMoveRight(evt: Event = null) {
            // SWZ.debug("onMoveRight");
            if (evt)
                evt.preventDefault();
            this.scroll(-this._scrollDeltaAlignWithZoom, 0);
        }

        protected _onMoveDown(evt: Event = null) {
            // SWZ.debug("onMoveDown");
            if (evt)
                evt.preventDefault();
            this.scroll(0, -this._scrollDeltaAlignWithZoom);
        }

        ///////////////////////////////////////////////////
        ///// Enable / disable scrolling
        enableScrolling() {
            if (!this.bEnableScrolling) {
                this.bEnableScrolling = true;
            }
            this.showOnScreenArrows();
        }

        disableScrolling() {
            if (this.bEnableScrolling) {
                this.bEnableScrolling = false;
            }
            // hide arrows
            this.hideOnScreenArrows();
        }

        //////////////////////////////////////////////////
        //// Zoom with buttons
        setupOnScreenZoomButtons(zoomDelta = 0.2) {
            SWZ.debug("setupOnScreenZoomButtons");
            this.zoomDelta = zoomDelta;
            if (!this._btnZoomPlus) {
                this._btnZoomPlus = this._initButton(this._btnZoomPlusNames, this.btnZoomPlusHtml, _("Zoom in"), this._onZoomIn, () => {
                    this.changeMapZoom(this.longPressZoom);
                });
            }
            if (!this._btnZoomMinus) {
                this._btnZoomMinus = this._initButton(this._btnZoomMinusNames, this.btnZoomMinusHtml, _("Zoom out"), this._onZoomOut, () => {
                    this.changeMapZoom(-this.longPressZoom);
                });
            }
            //this.showOnScreenZoomButtons();

        }

        showOnScreenZoomButtons() {
            this._showButton(this._btnZoomPlus);
            this._showButton(this._btnZoomMinus);
        }

        hideOnScreenZoomButtons() {
            this._hideButton(this._btnZoomPlus);
            this._hideButton(this._btnZoomMinus);
        }

        protected _onZoomIn(evt: Event = null) {
            if (evt)
                evt.preventDefault();
            this.changeMapZoom(this.zoomDelta);
        }

        protected _onZoomOut(evt: Event = null) {
            if (evt)
                evt.preventDefault();
            this.changeMapZoom(-this.zoomDelta);
        }

        //////////////////////////////////////////////////
        //// Reset with buttons
        setupOnScreenResetButtons(resetMode = ScrollmapWithZoom.ResetMode.Scroll) {
            this._resetMode = resetMode;
            SWZ.debug("setupOnScreenResetButtons");
            if (!this._btnReset) {
                this._btnReset = this._initButton(this._btnResetNames, this.btnResetHtml, _("Center"), this.onReset);
            }
            if (!this._btnZoomToFit)
                this._btnZoomToFit = this._initButton(this._btnZoomToFitNames, this.btnZoomToFitHtml, _('Fit map to display area'), () => this.zoomToFitAndScrollToCenter());
            // this.showOnScreenResetButtons();
        }

        showOnScreenResetButtons() {
            this._showButton(this._btnReset);
            this._showButton(this._btnZoomToFit);
        }

        hideOnScreenResetButtons() {
            this._hideButton(this._btnReset);
            this._hideButton(this._btnZoomToFit);
        }

        protected onReset() {
            this.reset();
        }

        //////////////////////////////////////////////////
        //// Increase/decrease display height with buttons
        protected _getEnlargeReduceButtonsProps(bInsideMap: boolean) {
            var idSuffix = "",
                display = 'block';
            if (!bInsideMap) {
                idSuffix = "_header", display = 'initial';
            }
            return {
                idSuffix,
                display
            };
        }

        protected _setupEnlargeReduceButtons(bInsideMap: boolean, bShort: boolean = true, destDiv: HTMLElement = null) {
            // this._bIncrHeightBtnIsShort = bShort;
            // this._bIncrHeightBtnGroupedWithOthers = bGroupedWithOthers;
            var btnsProps = this._getEnlargeReduceButtonsProps(bInsideMap);
            if (!this._btnIncreaseHeight)
                this._btnIncreaseHeight = this._initButton(this._btnIncreaseHeightNames, bInsideMap ? (bShort ? this.btnIncreaseHeightShortHtml : this.btnIncreaseHeightHtml) : null,
                    _('Increase height'), this._onIncreaseDisplayHeight, () => {
                        this.changeDisplayHeight(5);
                    }, bShort ? destDiv : null, btnsProps.idSuffix, btnsProps.display);

            if (!this._btnDecreaseHeight)
                this._btnDecreaseHeight = this._initButton(this._btnDecreaseHeightNames, bInsideMap ? (bShort ? this.btnDecreaseHeightShortHtml : this.btnDecreaseHeightHtml) : null,
                    _('Decrease height'), this._onDecreaseDisplayHeight, () => {
                        this.changeDisplayHeight(-5);
                    }, bShort ? destDiv : null, btnsProps.idSuffix, btnsProps.display);
            if (this._btnDecreaseHeight || this._btnIncreaseHeight) {
                this._bEnlargeReduceButtonsInsideMap = bInsideMap;
                return true;
            }
            return false;
        }


        setupEnlargeReduceButtons(incrHeightDelta: number, bIncrHeightKeepInPos: boolean = true, minHeight: number = null, bShort: boolean = true, bGroupedWithOthers = true) {
            SWZ.debug("setupEnlargeReduceButtons");
            var buttonsDiv;
            if (!bGroupedWithOthers && this.btns2PositionClasses != null) {
                buttonsDiv = this._buttons_div2;
                buttonsDiv.style.setProperty('--column_cnt', '1');
            } else {
                buttonsDiv = this._buttons_div;
            }

            // if (!this._setupEnlargeReduceButtons(false)) {
            //     this._setupEnlargeReduceButtons(true, bShort, buttonsDiv);
            // }
            this._setupEnlargeReduceButtons(true, bShort, buttonsDiv);
            this._btnResetHeight = this._initButton("reset_height", this.btnResetHeightHtml, _("Reset Height"), this._onResetHeight, null, buttonsDiv);
            this._btnMaximizeHeight = this._initButton("maximize_height", this.btnMaximizeHeightHtml, _("Maximize Height"), this._onMaximizeHeight, null, buttonsDiv);
            if (this._bMaxHeight) {
                this._enableButton(this._btnResetHeight);
                this._disableButton(this._btnMaximizeHeight);
            } else if (!this._bHeightChanged) {
                this._disableButton(this._btnResetHeight);
                this._enableButton(this._btnMaximizeHeight);
            }
            this.incrHeightDelta = incrHeightDelta;
            this.bIncrHeightKeepInPos = bIncrHeightKeepInPos;
            if (minHeight)
                this.minHeight = minHeight;
        }

        showEnlargeReduceButtons() {
            var btnsProps = this._getEnlargeReduceButtonsProps(this._bEnlargeReduceButtonsInsideMap);
            this._showButton(this._btnIncreaseHeight, btnsProps.idSuffix, btnsProps.display);
            this._showButton(this._btnDecreaseHeight, btnsProps.idSuffix, btnsProps.display);
            this._showButton(this._btnResetHeight);
            this._showButton(this._btnMaximizeHeight);
            if (this._bMaxHeight) {
                this._enableButton(this._btnResetHeight);
                this._disableButton(this._btnMaximizeHeight);
            } else if (!this._bHeightChanged) {
                this._disableButton(this._btnResetHeight);
                this._enableButton(this._btnMaximizeHeight);
            }
            this._showButton(this._bMaxHeight ? this._btnResetHeight : this._btnMaximizeHeight);
        }

        hideEnlargeReduceButtons() {
            var btnsProps = this._getEnlargeReduceButtonsProps(this._bEnlargeReduceButtonsInsideMap);
            this._hideButton(this._btnIncreaseHeight, btnsProps.idSuffix);
            this._hideButton(this._btnDecreaseHeight, btnsProps.idSuffix);
            this._hideButton(this._btnResetHeight);
            this._hideButton(this._btnMaximizeHeight);
        }

        protected _onResetHeight(evt: Event, dispatch: boolean = true) {
            this._bMaxHeight = false;
            this._bHeightChanged = false;
            if (this.bAdaptHeightAuto)
                this.adaptHeight();
            else
                this.setDisplayHeight(this.defaultHeight);
            this._disableButton(this._btnResetHeight);
            this._enableButton(this._btnMaximizeHeight);
            if (this.bIncrHeightGlobally) {
                if (dispatch) {
                    ScrollmapWithZoom.resetHeight(this.incrHeightGlobalKey);
                }
            }
        }

        protected _onMaximizeHeight(evt: Event) {
            this._bMaxHeight = this.changeDisplayHeight(5000);
            this._disableButton(this._btnMaximizeHeight);
            this._enableButton(this._btnResetHeight);
        }

        protected _onIncreaseDisplayHeight(evt: Event) {
            evt.preventDefault();
            this._bMaxHeight = this.changeDisplayHeight(this.incrHeightDelta);
        }

        protected _onDecreaseDisplayHeight(evt: Event) {
            evt.preventDefault();
            this.changeDisplayHeight(-this.incrHeightDelta);
        }

        changeDisplayHeight(delta: number) {
            this._bHeightChanged = true;
            var current_height = this.getDisplayHeight();
            // this._hideButton('maximize_height');
            return this.setDisplayHeight(current_height + delta);
        }
        setDisplayHeight(new_height: number, dispatch: boolean = true) {
            var screen_height = document.documentElement.clientHeight ||
                document.body.clientHeight || window.innerHeight;
            screen_height /= gameui.calcCurrentCSSZoom(this.container_div);
            var current_height = this.getDisplayHeight();
            var maxHeight = screen_height - this._titleHeight;
            new_height = Math.min(Math.max(new_height, this._minHeight), maxHeight);
            if (this.bIncrHeightKeepInPos && gameui.isLoadingComplete)
                this.board_y += (current_height - new_height) / 2;
            this.container_div.style.setProperty("--scrollmap_height", new_height + 'px');
            this.container_div.style.height = 'var(--scrollmap_height)';
            if (this.bIncrHeightGlobally) {
                if (dispatch) {
                    ScrollmapWithZoom.updateHeight(new_height, this.incrHeightGlobalKey);
                }
            }
            if (new_height == maxHeight) {
                this._disableButton(this._btnMaximizeHeight);
            } else {
                this._enableButton(this._btnMaximizeHeight);
            }
            this._enableButton(this._btnResetHeight);

            if (new_height == maxHeight) {
                this._disableButton(this._btnIncreaseHeight);
            } else {
                this._enableButton(this._btnIncreaseHeight);
            }
            if (new_height == this._minHeight) {
                this._disableButton(this._btnDecreaseHeight);
            } else {
                this._enableButton(this._btnDecreaseHeight);
            }
            return (new_height == maxHeight);
        }
        static updateHeight(new_height: number, incrHeightGlobalKey: string) {}
        static resetHeight(incrHeightGlobalKey: string) {}
        getDisplayHeight() {
            return parseFloat(window.getComputedStyle(this.container_div).height);
        }
        //////////////////////////////////////////////////
        //// Info button
        setupInfoButton(bConfigurableInUserPreference = false) {
            if (!this._btnInfo) {
                let $btn = this._initButton('info', this.btnInfoHtml);
                $btn.classList.add('scrollmap_icon_always_visible');
                $btn.id = this.container_div.id + "_info";
                this._btnInfo = $btn;
            }
            SWZ.debug("setupInfoButton");
            // this._btnInfo.style.cursor = 'pointer';
            // this._btnInfo.style.display = 'block';
            this._bConfigurableInUserPreference = bConfigurableInUserPreference;
            // if (!this._onClickBtnInfo){
            //     this._onClickBtnInfo = (e) => {
            //         debugger;
            //         var tootip = gameui.tooltips[ this._btnInfo.id ];
            //         if (tootip.open) tootip.open(this._btnInfo);
            //     }
            //     this._btnInfo.addEventListener('click', this._onClickBtnInfo);
            // }
            return this.setInfoButtonTooltip();
        }

        showInfoButton() {
            this._showButton(this._btnInfo);
        }

        hideInfoButton() {
            this._hideButton(this._btnInfo);
        }

        getInfoButtonTooltip() {
            var canbemodfied = _(" ( modifiable in scrollmap settings )");
            var info = '<div class="scrollmap_tooltip">';
            info += _('To show/hide controls click on the wheel');
            info += '<BR>';
            info += _('To scroll/pan, do one of the folowing things:');
            info += '<ul>';
            info += '<li>' + _('maintain the mouse button or 2 fingers pressed and move.') + '</li>';
            info += '<li>' + _('press the scroll/pan buttons (long press : continious scroll/pan).') + '</li>';
            if (ScrollmapWithZoom.bEnableKeys && this.bEnableKeysArrows) {
                let keysStr = _("ctrl");
                info += '<li>' + dojo.string.substitute(_('press the arrow keys with ${keys} (long press : continious scroll/pan).'), { keys: keysStr }) + '</li>';
            }
            info += '</ul>';
            if (this._bEnableZooming) {
                info += '<BR>';
                info += _('To zoom, do one of the folowing things:');
                info += '<ul>';
                let keysStr = this.getWheelZoomingOptionTranslated();
                info += '<li>';
                info += `<span style="${this.zoomingOptions.bWheelZooming ? "" : "text-decoration: line-through;"}">` + dojo.string.substitute(_("use the mouse wheel with ${keys}"), { keys: keysStr }) + '</span>';
                info += canbemodfied;
                info += '</li>';
                info += '<li>' + `<span style="${this.zoomingOptions.pinchZooming ? "" : "text-decoration: line-through;"}">` + _("pinch fingers.") + '</span>' + canbemodfied + '</li>';
                info += '<li>' + _('press the zoom buttons (long press : continious zoom).') + '</li>';
                if (ScrollmapWithZoom.bEnableKeys && this.bEnableKeysPlusMinus)
                    info += '<li>' + _('press the +/- keys (long press : continious zoom).') + '</li>';
                info += '</ul>';
            }
            info += '<BR>' + _('To recenter, do one of the folowing things:');
            info += '<ul>';
            info += '<li>' + _('use the recenter button');
            if (ScrollmapWithZoom.bEnableKeys && this.bEnableKeyHome)
                info += '<li>' + _('press the home key with ctrl key') + '</li>';
            info += '</ul>';
            if (ScrollmapWithZoom.bEnableKeys && this.bEnableKeyEnd)
                info += '<BR>' + _('To fit to content : press the end key with ctrl key');
            if (this._bConfigurableInUserPreference)
                info += _('This is configurable in user preference.');
            info += '<BR>' + '(v ' + this.version + ')';
            info += '</div>';
            return info;
        }

        setInfoButtonTooltip() {
            if (!this._btnInfo)
                return;
            if (gameui != null) {
                gameui.addTooltipHtml(this._btnInfo.id, '', 10);
                gameui.tooltips[this._btnInfo.id].bForceOpening = true;
                gameui.tooltips[this._btnInfo.id].getContent = () => { return this.getInfoButtonTooltip(); };
            }
        }

        setBShowMoveCursor() {
            this.surface_div.style.cursor = (this.scrollingOptions.bShowMoveCursor ? "" : "unset");
        }

        getWheelZoomingOptionTranslated() {
            var keystr = "";
            var altstr: string = _("alt");
            var ctrlstr = _("ctrl");
            var shiftstr = _("shift");
            var metastr = _("meta");
            var orstr = _("or");
            var nonestr = _("no keys");
            var anystr = [ctrlstr, altstr, shiftstr, metastr].join(" " + orstr + " ");

            switch (this.zoomingOptions.wheelZooming) {
                // Zoom with scroll wheel
                case ScrollmapWithZoom.wheelZoomingKeys.None:
                    keystr = nonestr;
                    break;

                case ScrollmapWithZoom.wheelZoomingKeys.AnyOrNone:
                    keystr = nonestr + " " + orstr + " " + anystr
                    break;

                case ScrollmapWithZoom.wheelZoomingKeys.Any:
                    keystr = anystr;
                    break;

                case ScrollmapWithZoom.wheelZoomingKeys.Ctrl:
                    keystr = ctrlstr;
                    break;

                case ScrollmapWithZoom.wheelZoomingKeys.Shift:
                    keystr = shiftstr;
                    break;

                case ScrollmapWithZoom.wheelZoomingKeys.Alt:
                    keystr = altstr;
                    break;

                case ScrollmapWithZoom.wheelZoomingKeys.Meta:
                    keystr = metastr;
                    break;

            }
            return keystr;
        }

    }

    export namespace ScrollmapWithZoom {
        export enum wheelZoomingKeys {
            Any = 1, None = 2, AnyOrNone = 3, Ctrl = 4, Alt = 8, Shift = 16, Meta = 32
        }
        export enum ResetMode {
            Scroll = 0, ScrollAndZoom = 1, ScrollAndZoomFit = 2
        }
        export enum btnsDivPositionE {
            Top = 'scrollmap_btns_top', Bottom = 'scrollmap_btns_bottom', Left = 'scrollmap_btns_left', Right = 'scrollmap_btns_right', Center = 'scrollmap_btns_center'
        }
    }
    // if (window.location.hash.substring(1).split(',').includes('debugSWZ'))
    //     ScrollmapWithZoom.debugEn = true;
    var SWZ = ScrollmapWithZoom;
}


dojo.require("dojo.has");
dojo.has.add('config-tlmSiblingOfDojo', 0, 0, 1);
define([
    "dojo", "dojo/_base/declare", "dijit/Tooltip", "dojo/aspect", "./long-press-event", "./core_patch_slideto"
], function() {
    ebg.scrollmapWithZoom = ScrollmapWithZoomNS.ScrollmapWithZoom;
    return ebg.scrollmapWithZoom;
});