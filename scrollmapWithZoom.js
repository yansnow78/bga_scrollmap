/*
ScrollmapWithZoom 1.32.7: Improved version of scrollmap used in multiple bga game
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
/*global gameui, dojo, dijit*/
var isDebug = window.location.host == 'studio.boardgamearena.com' || window.location.hash.indexOf('debug') > -1;
var debug = isDebug ? console.info.bind(window.console) : function() {};
var error = isDebug ? console.error.bind(window.console) : function() {};
class ScrollmapWithZoom {
    get bEnableZooming() {
        return this._bEnableZooming;
    }
    set bEnableZooming(value) {
        this._bEnableZooming = value;
        if (!this.container_div)
            return;
        if (!this._bEnableZooming) {
            this.hideOnScreenZoomButtons();
            debug("bEnableZooming is false, hide zoom buttons");
        }
        var warning_touch = _("Use two fingers to begin moving the board. ");
        if (this._bEnableZooming)
            warning_touch += _("Pinch fingers to zoom");
        this.container_div.setAttribute("warning_touch", warning_touch);
        var keysStr = this.getWheelZoomingOptionTranslated();
        this.container_div.setAttribute("warning_scroll", dojo.string.substitute(_("Use ${keys} + Mouse Wheel to zoom the board"), { keys: keysStr }));
    }
    get bRevertArrowsScroll() {
        return this._bRevertArrowsScroll;
    }
    set bRevertArrowsScroll(value) {
        if (this._bRevertArrowsScroll != value) {
            this._scrollDeltaAlignWithZoom = -this._scrollDeltaAlignWithZoom;
            this._longPressScrollOriented = -this._longPressScrollOriented;
        }
        this._bRevertArrowsScroll = value;
    }
    get bAdaptHeightAuto() {
        return this._bAdaptHeightAuto;
    }
    set bAdaptHeightAuto(value) {
        this._bAdaptHeightAuto = value;
        if (!this.container_div)
            return;
    }
    set adaptHeightCorrDivs(value) {
        this._adaptHeightCorrDivs = value;
        for (let i = 0; i < this.adaptHeightCorrDivs.length; i++) {
            this._resizeHeadersObserver.observe(this.adaptHeightCorrDivs[i]);
        }
    }
    get adaptHeightCorrDivs() {
        return this._adaptHeightCorrDivs;
    }
    get bIncrHeightGlobally() {
        return this._bIncrHeightGlobally;
    }
    set bIncrHeightGlobally(value) {
        this._bIncrHeightGlobally = value;
        if (!this.container_div)
            return;
        if (this._bIncrHeightGlobally) {
            if (!document.body.style.getPropertyValue("--scrollmap_height"))
                document.body.style.setProperty("--scrollmap_height", this.getDisplayHeight() + 'px');
            this.container_div.style.height = 'var(--scrollmap_height)';
        }
    }
    get bIncrHeightBtnVisible() {
        return this._bIncrHeightBtnVisible;
    }
    set bIncrHeightBtnVisible(value) {
        this._bIncrHeightBtnVisible = value;
        if (!this.container_div)
            return;
        if (!this._bIncrHeightBtnVisible) {
            this.hideEnlargeReduceButtons();
        }
    }
    get bIncrHeightBtnIsShort() {
        return this._bIncrHeightBtnIsShort;
    }
    set bIncrHeightBtnIsShort(value) {
        this._bIncrHeightBtnIsShort = value;
    }
    get bIncrHeightBtnGroupedWithOthers() {
        return this._bIncrHeightBtnGroupedWithOthers;
    }
    set bIncrHeightBtnGroupedWithOthers(value) {
        this._bIncrHeightBtnGroupedWithOthers = value;
    }
    get bInfoBtnVisible() {
        return this._bInfoBtnVisible;
    }
    /**
     * enable/disble keys
     */
    static get bEnableKeys() {
        return ScrollmapWithZoom._bEnableKeys;
    }
    static set bEnableKeys(value) {
        ScrollmapWithZoom._bEnableKeys = value && (ScrollmapWithZoom.count == 1);
        for (let inst of ScrollmapWithZoom.instances.values()) {
            inst.setInfoButtonTooltip();
        }
    }
    /**
     * info button
     */
    set bInfoBtnVisible(value) {
        this._bInfoBtnVisible = value;
        if (!this.container_div)
            return;
        if (!this._bInfoBtnVisible) {
            this.hideInfoButton();
        }
    }
    get longPressScroll() {
        return this._longPressScroll;
    }
    set longPressScroll(value) {
        if (this._bRevertArrowsScroll) {
            this._longPressScrollOriented = -value;
        }
        this._longPressScroll = value;
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
        /**
         * board properties
         */
        this.board_x = 0;
        this.board_y = 0;
        this.startPosition = null;
        this.container_div = null;
        this.container_subdiv = null;
        this.scrollable_div = null;
        this.surface_div = null;
        this.onsurface_div = null;
        this.clipped_div = null;
        this.animation_div = null;
        /**
         * zoom properties
         */
        this.zoom = 1;
        this.maxZoom = 2;
        this.minZoom = 0.1;
        this.defaultZoom = null;
        this.zoomingOptions = {
            bWheelZooming: true,
            wheelZooming: ScrollmapWithZoom.wheelZoomingKeys.Alt,
            pinchZooming: true
        };
        this.zoomChangeHandler = null;
        this.zoomPinchDelta = 0.005;
        this.zoomWheelDelta = 0.001;
        this.zoomDelta = 0.2;
        /**
         * scrolling properties
         */
        this.bEnableScrolling = true;
        this.scrollingOptions = {
            bOneFingerScrolling: false
        };
        this.bScrollDeltaAlignWithZoom = true;
        this.bRestoreScrollPosition = true;
        this.scrollDelta = 100;
        this.scrollingTresh = 30;
        this.defaultPosition = null;
        this.centerPositionOffset = {
            x: 0,
            y: 0
        };
        this.centerCssQuery = null;
        this.centerCalcUseAlsoOnsurface = true;
        /**
         * resizing properties
         */
        this.minHeight = 300;
        this.incrHeightGlobalKey = null;
        this.incrHeightDelta = 100;
        this.bIncrHeightKeepInPos = true;
        this.bAdaptHeightAutoCompensateChatIcon = true;
        this.adaptHeightCorr = 0;
        this.bEnableKeysArrows = true;
        this.bEnableKeysPlusMinus = true;
        this.bEnableKeyHome = true;
        this.bEnableKeyEnd = true;
        /**
         * enable/disble long press on buttons
         */
        this.bEnableLongPress = true;
        /**
         * buttons default classes
         */
        this.btnMoveRightClasses = 'fa fa-chevron-right';
        this.btnMoveLeftClasses = 'fa fa-chevron-left';
        this.btnMoveTopClasses = 'fa fa-chevron-up';
        this.btnMoveDownClasses = 'fa fa-chevron-down';
        this.btnZoomPlusClasses = 'fa fa-search-plus';
        this.btnZoomMinusClasses = 'fa fa-search-minus';
        this.btnResetClasses = 'fa6-solid fa6-arrows-to-dot';
        this.btnZoomToFitClasses = 'fa6-solid fa6-maximize';
        this.btnResetHeightClasses = 'fa6-solid fa6-arrows-up-down';
        this.btnMaximizeHeightClasses = '';
        this.btnIncreaseHeightClasses = 'fa6-solid fa6-arrow-down';
        this.btnDecreaseHeightClasses = 'fa6-solid fa6-arrow-up';
        this.btnToggleButtonsVisibilityClasses = "fa6-solid fa6-gear";
        this.btnSettingsClasses = "fa fa-bars";
        this.btnInfoClasses = 'fa fa-question';
        this.btnsDivClasses = 'scrollmap_btns_flex';
        this.btnMoveRightHtml = null;
        this.btnMoveLeftHtml = null;
        this.btnMoveTopHtml = null;
        this.btnMoveDownHtml = null;
        this.btnZoomPlusHtml = null;
        this.btnZoomMinusHtml = null;
        this.btnResetHtml = null;
        this.btnInfoHtml = null;
        this.btnZoomToFitHtml = null;
        this.btnIncreaseHeightHtml = null;
        this.btnDecreaseHeightHtml = null;
        this.btnIncreaseHeightShortHtml = null;
        this.btnDecreaseHeightShortHtml = null;
        this.btnResetHeightHtml = null;
        this.btnMaximizeHeightHtml = null;
        this.btnToggleButtonsVisibilityHtml = null;
        this.btnSettingsHtml = null;
        this.btnsDivPositionnable = true;
        this.btnsDivOnMap = true;
        this.btns2DivOnMap = true;
        this.btnsDivPositionOutsideMap = ScrollmapWithZoom.btnsDivPositionE.Right;
        this.btnsPositionClasses = 'btn_pos_top_right';
        this.btns2PositionClasses = '';
        this.btnsBackgroundColor = 'rgba(255,255,255,0.5)';
        this.btnsMarginX = '0px';
        this.btnsMarginY = '0px';
        this.btnsOffsetX = '8px';
        this.btnsOffsetY = '8px';
        this.btnsOutsideMapOffsetX = '8px';
        this.btnsOutsideMapOffsetY = '8px';
        this.btnsSize = '20px';
        this.btnsFontSize = '20px';
        this.btnsAroundSize = '6px';
        this.longPressZoom = 0.01;
        this._cover_arrows = null;
        this._x_extra_l = null;
        this._x_extra_r = null;
        this._y_extra_u = null;
        this._y_extra_d = null;
        this._prevZoom = 1;
        this._bEnableZooming = true;
        this._scrollDeltaAlignWithZoom = 0;
        this._longPressScrollAlignWithZoom = 0;
        this._bHeightChanged = false;
        this._bMaxHeight = false;
        this._bAdaptHeightAuto = false;
        this._adaptHeightCorrDivs = [];
        this._bIncrHeightGlobally = false;
        this._bIncrHeightBtnVisible = true;
        this._bIncrHeightBtnIsShort = true;
        this._bIncrHeightBtnGroupedWithOthers = true;
        this._bInfoBtnVisible = true;
        this._bBtnsVisible = true;
        this._pointers = new Map();
        this._classNameSuffix = '';
        this._longPress = false;
        // protected _longKeyPress: boolean = false;
        this._keysPressed = new Map();
        this._enableTooltipsAndClickTimerId = null;
        this._enabledTooltips = true;
        this._enabledClicks = true;
        this._enableTooltipsAndClick_handler = this._enableTooltipsAndClick.bind(this);
        this._resizeObserver = (typeof ResizeObserver !== 'undefined') ? new ResizeObserver(entries => {
            this._onResize();
        }) : null;
        this._resizeHeadersObserver = (typeof ResizeObserver !== 'undefined') ? new ResizeObserver(entries => {
            this._adaptHeight();
        }) : null;
        this._onpointermove_handler = this._onPointerMove.bind(this);
        this._onpointerup_handler = this._onPointerUp.bind(this);
        this._onpointerup_handled = false;
        this._suppressCLickEvent_handler = this._suppressCLickEvent.bind(this);
        this._touchInteracting = false;
        this._setupDone = false;
        this._zoomFitCalledDuringSetup = false;
        this._adaptHeightDone = false;
        this._titleHeight = 0;
        this._bConfigurableInUserPreference = false;
        this._btnMoveRight = null;
        this._btnMoveLeft = null;
        this._btnMoveTop = null;
        this._btnMoveDown = null;
        this._btnZoomPlus = null;
        this._btnZoomMinus = null;
        this._btnReset = null;
        this._btnInfo = null;
        this._btnZoomToFit = null;
        this._btnIncreaseHeight = null;
        this._btnDecreaseHeight = null;
        this._btnResetHeight = null;
        this._btnMaximizeHeight = null;
        this._btnToggleButtonsVisiblity = null;
        this._btnZoomPlusNames = 'zoomplus,zoom_plus,zoomin,zoom_in';
        this._btnZoomMinusNames = 'zoomminus,zoom_minus,zoomout,zoom_out';
        this._btnResetNames = 'reset,back_to_center,reset_map,map_reset,center';
        this._btnZoomToFitNames = 'zoomtofit,fullscreen';
        this._btnIncreaseHeightNames = "enlargedisplay";
        this._btnDecreaseHeightNames = "reducedisplay,shrinkdisplay";
        this._bEnlargeReduceButtonsInsideMap = true;
        this._buttons_div = null;
        this._buttons_div2 = null;
        this._buttons_divs_wrapper = null;
        // get LABEL_REDUCE_DISPLAY: string = _("Reduce"): string {
        //     return _("Reduce")`;
        // }
        this._defaultHeight = 0;
        this._xPrev = null;
        this._yPrev = null;
        this._xPrevMid = null;
        this._yPrevMid = null;
        this._scrolling = false;
        this._scrolltoBusy = false;
        this._startScrollAnimDuration = 5;
        this._passiveEventListener = {};
        this._notPassiveEventListener = {};
        this._scrolled = false;
        this._prevDist = -1;
        this._gestureStart = false;
        this._isScrolling = 0;
        // protected _longPressAnim: FrameRequestCallback(time: any, anim?: any) => void;
        this._resetMode = ScrollmapWithZoom.ResetMode.Scroll;
        this._bRevertArrowsScroll = false;
        this._longPressScroll = 3;
        this._longPressScrollOriented = 3;
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
    static onShowTooltip() {
        if (gameui.bHideTooltips && !this.bForceOpening)
            setTimeout(() => {
                this.set("state", "DORMANT");
            });
    }
    create(container_div, scrollable_div, surface_div, onsurface_div, clipped_div = null, animation_div = null, page = null, create_extra = null) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
        debug("ebg.ScrollmapWithZoom create");
        if (typeof gameui.bUseRelPosForObjPos == "undefined")
            gameui.bUseRelPosForObjPos = true;
        ScrollmapWithZoom.count++;
        ScrollmapWithZoom.instances.set(container_div.id, this);
        ScrollmapWithZoom.bEnableKeys = ScrollmapWithZoom._bEnableKeys;
        if (typeof gameui.calcScale == "undefined") {
            dojo.safeMixin(gameui, new ebg.core.core_patch_slideto());
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
        (_a = this.btnIncreaseHeightHtml) !== null && _a !== void 0 ? _a : (this.btnIncreaseHeightHtml = `<a class="enlargedisplay enlarge_or_reduce_as_text">↓  ${_("Enlarge")}  ↓</a>`);
        (_b = this.btnDecreaseHeightHtml) !== null && _b !== void 0 ? _b : (this.btnDecreaseHeightHtml = `<a class="reducedisplay enlarge_or_reduce_as_text">↑  ${_("Reduce")}  ↑</a>`);
        (_c = this.btnIncreaseHeightShortHtml) !== null && _c !== void 0 ? _c : (this.btnIncreaseHeightShortHtml = `<i class="enlargedisplay scrollmap_icon ${this.btnIncreaseHeightClasses}"></i>`);
        (_d = this.btnDecreaseHeightShortHtml) !== null && _d !== void 0 ? _d : (this.btnDecreaseHeightShortHtml = `<i class="reducedisplay scrollmap_icon ${this.btnDecreaseHeightClasses}"></i>`);
        (_e = this.btnResetHeightHtml) !== null && _e !== void 0 ? _e : (this.btnResetHeightHtml = `<i class="reset_height scrollmap_icon ${this.btnResetHeightClasses}"></i>`);
        (_f = this.btnMaximizeHeightHtml) !== null && _f !== void 0 ? _f : (this.btnMaximizeHeightHtml = this.btnMaximizeHeightClasses ? `<i class="maximize_height scrollmap_icon ${this.btnMaximizeHeightClasses}"></i>` :
            `<svg class="maximize_height scrollmap_icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 11 18.75" x="0px" y="0px">
            <title>${_("Maximize Height")}</title>
            <g><path d="M5.146,11.853a.518.518,0,0,0,.163.109.5.5,0,0,0,.382,0,.518.518,0,0,0,.163-.109l4-4a.5.5,0,0,0-.708-.708L6,10.293V.5a.5.5,0,0,0-1,0v9.793L1.854,7.146a.5.5,0,0,0-.708.708Z"/><path d="M10.5,14H.5a.5.5,0,0,0,0,1h10a.5.5,0,0,0,0-1Z"/></g>
            <text x="0" y="30" fill="#000000" font-size="5px" font-weight="bold" font-family="'Helvetica Neue', Helvetica, Arial-Unicode, Arial, Sans-serif">Created by syarip yunus</text>
            <text x="0" y="35" fill="#000000" font-size="5px" font-weight="bold" font-family="'Helvetica Neue', Helvetica, Arial-Unicode, Arial, Sans-serif">from the Noun Project</text>
            </svg>`);
        (_g = this.btnMoveLeftHtml) !== null && _g !== void 0 ? _g : (this.btnMoveLeftHtml = `<i class="moveleft scrollmap_icon ${this.btnMoveLeftClasses}"></i>`);
        (_h = this.btnMoveRightHtml) !== null && _h !== void 0 ? _h : (this.btnMoveRightHtml = `<i class="moveright scrollmap_icon ${this.btnMoveRightClasses}"></i>`);
        (_j = this.btnMoveTopHtml) !== null && _j !== void 0 ? _j : (this.btnMoveTopHtml = `<i class="movetop scrollmap_icon ${this.btnMoveTopClasses}"></i>`);
        (_k = this.btnMoveDownHtml) !== null && _k !== void 0 ? _k : (this.btnMoveDownHtml = `<i class="movedown scrollmap_icon ${this.btnMoveDownClasses}"></i>`);
        (_l = this.btnZoomPlusHtml) !== null && _l !== void 0 ? _l : (this.btnZoomPlusHtml = `<i class="zoomplus scrollmap_icon ${this.btnZoomPlusClasses}"></i>`);
        (_m = this.btnZoomMinusHtml) !== null && _m !== void 0 ? _m : (this.btnZoomMinusHtml = `<i class="zoomminus scrollmap_icon ${this.btnZoomMinusClasses}"></i>`);
        (_o = this.btnResetHtml) !== null && _o !== void 0 ? _o : (this.btnResetHtml = `<i class="reset scrollmap_icon ${this.btnResetClasses}"></i>`);
        (_p = this.btnZoomToFitHtml) !== null && _p !== void 0 ? _p : (this.btnZoomToFitHtml = `<i class="zoomtofit scrollmap_icon ${this.btnZoomToFitClasses}"></i>`);
        (_q = this.btnToggleButtonsVisibilityHtml) !== null && _q !== void 0 ? _q : (this.btnToggleButtonsVisibilityHtml = `<i class="toogle_buttons_visibility scrollmap_icon ${this.btnToggleButtonsVisibilityClasses}"></i>`);
        (_r = this.btnSettingsHtml) !== null && _r !== void 0 ? _r : (this.btnSettingsHtml = `<i class="show_settings scrollmap_icon ${this.btnSettingsClasses}"></i>`);
        (_s = this.btnInfoHtml) !== null && _s !== void 0 ? _s : (this.btnInfoHtml = `<i class="info scrollmap_icon ${this.btnInfoClasses}"></i>`);
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
            const styleSheetContent = css `

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
                    width: calc(var(--column_cnt) * (var(--icon_size_z) + 2 * var(--icon_around_size_z)));
                }

                .scrollmap_dialog button {
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
        var onPointerDown = this._onPointerDown.bind(this);
        //var onPointerEnter =this._onPointerEnter.bind(this);
        if (window.PointerEvent) {
            //this.surface_div.addEventListener('pointerenter', onPointerDown, this._passiveEventListener);
            this.surface_div.addEventListener('pointerdown', onPointerDown, this._passiveEventListener);
        } else {
            this.surface_div.addEventListener('mousedown', onPointerDown, this._passiveEventListener);
            this.surface_div.addEventListener('touchstart', onPointerDown, this._passiveEventListener);
        }
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
        this.setupEnlargeReduceButtons(this.incrHeightDelta, this.bIncrHeightKeepInPos, this.minHeight, this.bIncrHeightBtnIsShort, this.bIncrHeightBtnGroupedWithOthers);
        if (!this._bIncrHeightBtnVisible)
            this.hideEnlargeReduceButtons();
        this._RepositionButtonsDiv();
        this.bIncrHeightGlobally = this._bIncrHeightGlobally;
        this._defaultHeight = parseFloat(window.getComputedStyle(this.container_div).height);
        this.bEnableZooming = this._bEnableZooming;
        if (this.defaultZoom === null)
            this.defaultZoom = this.zoom;
        this.setMapZoom(this.zoom);
        this.scrollto(0, 0, 0, 0);
        if (this._resizeObserver)
            this._resizeObserver.observe(this.container_div);
        if (this._resizeHeadersObserver) {
            this._resizeHeadersObserver.observe($('log_history_status'));
            this._resizeHeadersObserver.observe($('page-title'));
            // this._resizeHeadersObserver.observe($('after-page-title'));
        }
        this._localStorageKey = 'scrollmap_' + gameui.table_id + '_' + gameui.player_id + '_' + this.container_div.id;
        if (!ScrollmapWithZoom._localStorageGameKey)
            ScrollmapWithZoom._localStorageGameKey = 'scrollmap_settings_' + gameui.game_id;
        this._localStorageOldKey = 'scrollmap_' + gameui.table_id + '_' + this.container_div.id;
        window.addEventListener('pagehide', (e) => {
            this._onbeforeunload_handler(e);
        });
        document.addEventListener('visibilitychange', this._onvisibility_changehandler.bind(this));
        window.addEventListener('load', (e) => {
            debug("document loaded"); /*this._adaptHeight();*/
        });
        dojo.connect(gameui, "onScreenWidthChange", this, dojo.hitch(this, '_adaptHeight'));
        dojo.require("dojo.aspect");
        dojo.aspect.after(ScrollmapWithZoom, "updateHeight", (new_height, incrHeightGlobalKey) => {
            if (this.incrHeightGlobalKey == incrHeightGlobalKey)
                this.setDisplayHeight(new_height, false);
        }, true);
        if (ScrollmapWithZoom.bEnableKeys && this.bEnableKeysArrows) {
            let warning_arrowkeys = _('press the arrow keys with ctrl key to scroll the board');
            this.container_div.setAttribute("warning_arrowkeys", warning_arrowkeys);
        }
        debug("ebg.ScrollmapWithZoom create end");
    }
    createCompletely(container_div, page = null, create_extra = null, bEnlargeReduceButtonsInsideMap = true) {
        debug("createCompletely");
        var tmplDisplayButtons = String.raw `
            ${this.btnIncreaseHeightHtml}
            ${this.btnDecreaseHeightHtml}
        `;
        var info_id = container_div.id + "_info";
        var tmpl = String.raw `
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
            tmpl = String.raw `
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
        this.create(container_div, scrollable_div, surface_div, onsurface_div, clipped_div, animation_div, page, create_extra);
    }
    _init() {}
    _RepositionButtonsDiv(options = { btnsDivOnMap: undefined, btnsDivPositionOutsideMap: undefined }) {
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
        }
    }
    _createForm() {
        var inputs = null;
        if (!ScrollmapWithZoom._formDialog) {
            var formTmpl = String.raw `
                <dialog class="scrollmap_dialog">
                    <form class="scrollmap_form">
                        <button name="close" aria-label="close">X</button>
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
                        ${this.btnsDivPositionnable ? String.raw `
                        <div>
                            <input type="checkbox" id="btnsDivOutsideMap" value="true">
                            <label for="btnsDivOutsideMap">${dojo.string.substitute(_("Place buttons outside scrollmap on ${position}"), { position: "<select name='btnsDivPositionOutsideMap'></select>" })}</label>
                        </div>
                        ` : ''}
                        <div>
                            <input type="checkbox" id="bRevertArrowsScroll" value="true">
                            <label for="bRevertArrowsScroll">${_("Revert scroll direction of arrows")}</label>
                        </div>
                        <div>
                            <button name="close2">${_("Cancel")}</button>
                            <button type="submit" name="confirm">${_("Confirm")}</button>
                        </div>
                    </form>
                </dialog>
            `;
            document.body.insertAdjacentHTML("beforeend", formTmpl);
            ScrollmapWithZoom._formDialog = document.body.lastElementChild;
            ScrollmapWithZoom._form = ScrollmapWithZoom._formDialog.firstElementChild;
            //this._form = < HTMLFormElement > this.container_div.lastElementChild;
            inputs = ScrollmapWithZoom._form.elements;
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
            }
        }
        if (!inputs)
            inputs = ScrollmapWithZoom._form.elements;
        inputs.namedItem("confirm").addEventListener("click", this._submitForm.bind(this));
        var closeFctBind = this._closeForm.bind(this);
        inputs.namedItem("close").addEventListener("click", closeFctBind);
        inputs.namedItem("close2").addEventListener("click", closeFctBind);
    }
    _showForm() {
        ScrollmapWithZoom._formDialog.showModal();
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
        var inputs = ScrollmapWithZoom._form.elements;
        inputs.namedItem("wheelZooming").checked = this.zoomingOptions.bWheelZooming;
        inputs.namedItem("wheelZoomingKey").value = '' + this.zoomingOptions.wheelZooming;
        inputs.namedItem("pinchZooming").checked = this.zoomingOptions.pinchZooming;
        inputs.namedItem("bOneFingerScrolling").checked = this.scrollingOptions.bOneFingerScrolling;
        if (this.btnsDivPositionnable) {
            inputs.namedItem("btnsDivOutsideMap").checked = !this.btnsDivOnMap;
            inputs.namedItem("btnsDivPositionOutsideMap").value = this.btnsDivPositionOutsideMap;
        }
        inputs.namedItem("bRevertArrowsScroll").checked = this.bRevertArrowsScroll;
    }
    _submitForm() {
        var inputs = ScrollmapWithZoom._form.elements;
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
        if (this == ScrollmapWithZoom.instances.values().next().value)
            ScrollmapWithZoom._saveGameSettings();
        ScrollmapWithZoom._formDialog.close();
        //this._form.style.display = "none";
        return false;
    }
    _closeForm() {
        ScrollmapWithZoom._formDialog.close();
        // this._form.style.display = "none";
        return false;
    }
    _adaptHeight() {
        window.requestAnimationFrame(() => {
            this._onResize();
            // your code
            debug("_adaptHeight");
            var pageZoom = this._getPageZoom();
            this._titleHeight = $('page-title').getBoundingClientRect().height / pageZoom;
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
            var container_pos = dojo.coords(this.container_div, false);
            screen_height /= pageZoom;
            var other_elements_height = this.adaptHeightCorr + container_pos.y + window.scrollY / pageZoom;
            for (let i = 0; i < this.adaptHeightCorrDivs.length; i++) {
                let float = window.getComputedStyle(this.adaptHeightCorrDivs[i]).float;
                if (float != "left" && float != "right") {
                    var corrCoord = dojo.coords(this.adaptHeightCorrDivs[i], true);
                    //if (corrCoord.y + 5 >= container_pos.y + container_pos.h)
                    var brect = this.adaptHeightCorrDivs[i].getBoundingClientRect();
                    //if (brect.top + 5 >= container_pos.y + container_pos.h)
                    other_elements_height += brect.height;
                }
            }
            // var $log_history_status = $('log_history_status'); 
            // if ($log_history_status)
            //     other_elements_height -= $log_history_status.getBoundingClientRect().height/gameui.gameinterface_zoomFactor;
            // var $connect_status = $('connect_status');
            // if ($connect_status)
            //     other_elements_height -= $connect_status.getBoundingClientRect().height / pageZoom;
            if (this.bAdaptHeightAutoCompensateChatIcon) {
                var $chatwindowavatar = document.querySelector(".chatwindowavatar");
                if ($chatwindowavatar)
                    other_elements_height += $chatwindowavatar.getBoundingClientRect().height / pageZoom;
            }
            var map_height = screen_height - other_elements_height;
            if (this.getDisplayHeight() != map_height) {
                this.setDisplayHeight(map_height);
            }
            this._disableButton(this._btnResetHeight);
        });
    }
    _onResize() {
        window.requestAnimationFrame(() => {
            if (!this._setupDone || (this.bAdaptHeightAuto && !this._adaptHeightDone)) {
                debug(this._setupDone ? "onResize after adaptHeight" : "1st onResize after setup");
                this._clearOldSettings();
                this._loadedSettings = this._loadSettings();
                if (!this._loadedSettings) {
                    if (this._resetMode != ScrollmapWithZoom.ResetMode.ScrollAndZoomFit && this._zoomFitCalledDuringSetup)
                        this.zoomToFit();
                    if (this.startPosition)
                        this.scrollto(-this.startPosition.x, -this.startPosition.y, 0, 0);
                    else
                        this.scrollto(0, 0, 0, 0);
                }
                setTimeout(() => {
                    var anim = dojo.fadeIn({ node: this.onsurface_div, duration: 1500, delay: 0 });
                    anim.play();
                    var anim = dojo.fadeIn({ node: this.scrollable_div, duration: 1500, delay: 0 });
                    anim.play();
                    var anim = dojo.fadeIn({ node: this.animation_div, duration: 1500, delay: 0 });
                    anim.play();
                }, 500);
            } else {
                this._scrollto(this.board_x, this.board_y, 0, 0);
            }
            var pageZoom = this._getPageZoom();
            if (pageZoom == 1) {
                var interfaceFactor = this._getInterfaceFactor();
                if (interfaceFactor < 1) {
                    debug("_adaptHeight use interfaceFactor ", interfaceFactor);
                    pageZoom = interfaceFactor;
                }
            }
            document.body.style.setProperty("--page_zoom", pageZoom.toString());
            this._setupDone = true;
        });
    }
    _clearOldSettings() {
        let keys = Object.keys(localStorage);
        let oldKeysCnt = 0;
        let oldest = null;
        let oldestKey = '';
        for (let key of keys) {
            if (key.startsWith('scrollmap')) {
                let oldSetting = JSON.parse(localStorage.getItem(key));
                if ((oldest == null) || oldSetting.time < oldest) {
                    oldestKey = key;
                    oldest = oldSetting.time;
                }
                oldKeysCnt++;
            }
            if (oldKeysCnt > 500) {
                localStorage.removeItem(oldestKey);
            }
        }
    }
    _loadSettings() {
        let scrolled = false;
        let settingsStr = localStorage.getItem(this._localStorageKey);
        if (settingsStr == null) {
            settingsStr = localStorage.getItem(this._localStorageOldKey);
            if (settingsStr != null) {
                localStorage.setItem(this._localStorageKey, settingsStr);
                localStorage.removeItem(this._localStorageOldKey);
            }
        }
        if (settingsStr != null) {
            let settings = JSON.parse(settingsStr);
            debug("_loadSettings", settings.board_x, settings.board_y);
            var height = this.getDisplayHeight();
            if (settings.height != null) {
                this.setDisplayHeight(settings.height);
            }
            if (settings.height_changed != null) {
                this._bHeightChanged = settings.height_changed;
            }
            if (settings.zoom != null) {
                this.setMapZoom(settings.zoom);
            }
            if (this.bRestoreScrollPosition && settings.board_x != null && settings.board_y != null) {
                this._scrolled = true;
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
        settingsStr = localStorage.getItem(ScrollmapWithZoom._localStorageGameKey);
        if (settingsStr != null) {
            let settings = JSON.parse(settingsStr);
            if (settings.optionsChanged != undefined) {
                var optionsChanged = settings.optionsChanged;
                ScrollmapWithZoom._optionsChanged = optionsChanged;
                if (optionsChanged.bWheelZooming != undefined)
                    this.zoomingOptions.bWheelZooming = optionsChanged.bWheelZooming;
                if (optionsChanged.wheelZooming != undefined)
                    this.zoomingOptions.wheelZooming = optionsChanged.wheelZooming;
                if (optionsChanged.pinchZooming != undefined)
                    this.zoomingOptions.pinchZooming = optionsChanged.pinchZooming;
                if (optionsChanged.bOneFingerScrolling != undefined)
                    this.scrollingOptions.bOneFingerScrolling = optionsChanged.bOneFingerScrolling;
                if (optionsChanged.btns_visible != null) {
                    this._setButtonsVisiblity(settings.btns_visible);
                }
                if (this.btnsDivPositionnable)
                    this._RepositionButtonsDiv(optionsChanged);
                if (optionsChanged.bRevertArrowsScroll != undefined) {
                    this.bRevertArrowsScroll = optionsChanged.bRevertArrowsScroll;
                }
            }
        }
        return scrolled;
    }
    _saveSettings() {
        debug("_saveSettings");
        let settings = {
            time: Date.now(),
            zoom: this.zoom,
            board_x: this._scrolled ? this.board_x : null,
            board_y: this._scrolled ? this.board_y : null,
            height: this.getDisplayHeight(),
            height_changed: this._bHeightChanged,
            btns_visible: this._bBtnsVisible,
        };
        localStorage.setItem(this._localStorageKey, JSON.stringify(settings));
    }
    static _saveGameSettings() {
        debug("_saveGameSettings");
        let gameSettings = {
            time: Date.now(),
            optionsChanged: this._optionsChanged
        };
        localStorage.setItem(ScrollmapWithZoom._localStorageGameKey, JSON.stringify(gameSettings));
    }
    _onvisibility_changehandler(e) {
        if (document.visibilityState === "hidden") {
            this._saveSettings();
        }
    }
    _onbeforeunload_handler(e) {
        this._saveSettings();
    }
    _updatePointers(event) {
        var prevEv;
        if (event.changedTouches) { // TouchEvent
            const changedTouches = Array.from(event.changedTouches);
            changedTouches.forEach(touch => {
                const id = touch.identifier;
                prevEv = this._pointers.get(id);
                this._pointers.set(id, touch);
            });
            return prevEv;
        } else {
            const id = (event.pointerId) ? event.pointerId : 0;
            prevEv = this._pointers.get(id);
            this._pointers.set(id, event);
            return prevEv;
        }
    }
    _removePointers(event) {
        if (event.changedTouches) { // TouchEvent
            const changedTouches = Array.from(event.changedTouches);
            changedTouches.forEach(touch => {
                const id = touch.identifier;
                this._pointers.delete(id);
            });
        } else {
            const id = (event.pointerId) ? event.pointerId : 0;
            this._pointers.delete(id);
        }
    }
    _getPageZoom() {
        var pageZoom = 1;
        if (gameui._zoomImplemented) {
            try {
                var pageZoomStr = $("page-content").style.getPropertyValue("zoom");
                if (pageZoomStr !== "")
                    pageZoom = parseFloat(pageZoomStr);
            } catch (error) {
                /* empty */
            }
        }
        return pageZoom;
    }
    _getInterfaceFactor() {
        return screen.width / gameui.interface_min_width;
    }
    _getXYCoord(ev, ev2) {
        var clientX = ev.clientX;
        var clientY = ev.clientY;
        if (typeof ev2 !== 'undefined') {
            clientX = (clientX + ev2.clientX) / 2;
            clientY = (clientY + ev2.clientY) / 2;
        }
        const pageZoom = this._getPageZoom();
        var x, y;
        if ((gameui !== null) && (typeof gameui.calcNewLocation === "function")) {
            [, , x, y] = gameui.calcNewLocation(this.surface_div, null, clientX / pageZoom, clientY / pageZoom, false, true);
        } else {
            const containerRect = this.clipped_div.getBoundingClientRect();
            x = (clientX / pageZoom - containerRect.x - containerRect.width / 2);
            y = (clientY / pageZoom - containerRect.y - containerRect.height / 2);
        }
        return [x, y];
    }
    _enableInteractions() {
        if (this._bEnableZooming && this.zoomingOptions.pinchZooming)
            this.container_div.classList.add("enable_zoom_interaction");
        if (this.bEnableScrolling)
            this.container_div.classList.add("enable_pan_interaction");
        // if (this.zoomingOptions.pinchZooming)
        //     this.container_div.style.touchAction = "none";
        // else
        //     this.container_div.style.touchAction = "pinch-zoom";
    }
    _disableInteractions() {
        this.container_div.classList.remove("enable_zoom_interaction");
        this.container_div.classList.remove("enable_pan_interaction");
        // this.container_div.style.touchAction = "auto";
    }
    _enableTooltipsAndClick() {
        if (isDebug)
            var debugMsg = "";
        if (!this._enabledTooltips) {
            if (isDebug)
                debugMsg += "tooltips";
            gameui.switchDisplayTooltips(false);
            this._enabledTooltips = true;
            this._enableTooltipsAndClickTimerId = null;
        }
        if (!this._enabledClicks) {
            if (isDebug)
                debugMsg += "click";
            setTimeout(() => {
                this._enabledClicks = true;
                this.onsurface_div.removeEventListener('click', this._suppressCLickEvent_handler, this._passiveEventListener);
            }, 200);
        }
        if (isDebug && debugMsg != "")
            debug("_enableTooltipsAndClick enable " + debugMsg);
    }
    _disableTooltipsAndClick(setTimer = false) {
        if (isDebug)
            var debugMsg = "";
        if (setTimer) {
            if (this._enableTooltipsAndClickTimerId != null)
                clearTimeout(this._enableTooltipsAndClickTimerId);
            this._enableTooltipsAndClickTimerId = setTimeout(this._enableTooltipsAndClick_handler, 500);
        }
        if (this._enabledTooltips && !gameui.bHideTooltips) {
            if (isDebug)
                debugMsg += "tooltips";
            gameui.switchDisplayTooltips(true);
            for (var i in gameui.tooltips) {
                gameui.tooltips[i]._setStateAttr("DORMANT");
            }
            this._enabledTooltips = false;
        }
        if (this._enabledClicks) {
            if (isDebug)
                debugMsg += "click";
            this._enabledClicks = false;
            this.surface_div.addEventListener('click', this._suppressCLickEvent_handler, this._passiveEventListener);
        }
        if (isDebug && debugMsg != "")
            debug("_disableTooltipsAndClick enable " + debugMsg);
    }
    _suppressCLickEvent(e) {
        debug("_suppressCLickEvent");
        this.surface_div.removeEventListener('click', this._suppressCLickEvent_handler, this._passiveEventListener);
        e.stopImmediatePropagation();
        e.stopPropagation();
    }
    _getTouchesDist(e) {
        if (e.touches.length == 1)
            return 0;
        else
            return Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    }
    _getTouchesMiddle(e) {
        if (e.touches.length == 1)
            return new DOMPoint(e.touches[0].clientX, e.touches[0].clientY);
        else
            return new DOMPoint((e.touches[0].clientX + e.touches[1].clientX) / 2, (e.touches[0].clientY + e.touches[1].clientY) / 2);
    }
    _handleTouch(e) {
        // var i, touch;
        if (e.type !== "touchmove" && e.type !== "touchstart") {
            // if (e.touches.length === 1 && !(this.bEnableScrolling && this.scrollingOptions.bOneFingerScrolling)) {
            //     this._touchInteracting = true;
            //     debug(e.touches.length);
            // }
            if (e.touches.length === 0)
                this._touchInteracting = false;
            //debug(e.touches.length);
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
            const touches = Array.from(e.touches);
            touches.forEach(touch => {
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
    }
    _onPointerEnter(ev) {
        // var new_evt = new PointerEvent("pointerenter", ev);
        // var canceled = !this.onsurface_div.dispatchEvent(new_evt);
    }
    _onPointerDown(ev) {
        // ev.preventDefault();
        if (!this.bEnableScrolling && !(this._bEnableZooming && this.zoomingOptions.pinchZooming))
            return;
        if ((ev.pointerType == "mouse") && (ev.button != 0)) //for mouse only accept left button
            return;
        if (this._onpointerup_handled == false) {
            this._onpointerup_handled = true;
            if (window.PointerEvent) {
                document.addEventListener("pointermove", this._onpointermove_handler /* , this._passiveEventListener */ );
                document.addEventListener("pointerup", this._onpointerup_handler, this._passiveEventListener);
                document.addEventListener("pointercancel", this._onpointerup_handler, this._passiveEventListener);
            } else {
                document.addEventListener("mousemove", this._onpointermove_handler, this._passiveEventListener);
                document.addEventListener("touchmove", this._onpointermove_handler, this._passiveEventListener);
                document.addEventListener("mouseup", this._onpointerup_handler, this._passiveEventListener);
                document.addEventListener("touchend", this._onpointerup_handler, this._passiveEventListener);
                document.addEventListener("touchcancel", this._onpointerup_handler, this._passiveEventListener);
            }
        }
        this._updatePointers(ev);
    }
    _onPointerMove(ev) {
        // debug("pointer move");
        // var new_evt = new PointerEvent("pointermove", ev);
        // var canceled = !this.scrollable_div.firstElementChild .dispatchEvent(new_evt);
        // debugger
        this._updatePointers(ev);
        // If one pointer is move, drag the map
        if (this._pointers.size === 1) {
            if (!this.bEnableScrolling ||
                ((ev.pointerType == 'touch' || ev.changedTouches) && !this._touchInteracting))
                return;
            if (this._xPrev === null)
                [this._xPrev, this._yPrev] = this._getXYCoord(ev);
            else {
                const [x, y] = this._getXYCoord(ev);
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
    _onPointerUp(ev) {
        this._removePointers(ev);
        // ev.preventDefault();
        // If no pointer left, stop drag or zoom the map
        if (this._pointers.size === 0) {
            this._onpointerup_handled = false;
            if (window.PointerEvent) {
                document.removeEventListener("pointermove", this._onpointermove_handler /* , this._passiveEventListener */ );
                document.removeEventListener("pointerup", this._onpointerup_handler, this._passiveEventListener);
                document.removeEventListener("pointercancel", this._onpointerup_handler, this._passiveEventListener);
            } else {
                document.removeEventListener("mousemove", this._onpointermove_handler, this._passiveEventListener);
                document.removeEventListener("touchmove", this._onpointermove_handler, this._passiveEventListener);
                document.removeEventListener("mouseup", this._onpointerup_handler, this._passiveEventListener);
                document.removeEventListener("touchend", this._onpointerup_handler, this._passiveEventListener);
                document.removeEventListener("touchcancel", this._onpointerup_handler, this._passiveEventListener);
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
    }
    _onWheel(evt) {
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
                }, 1000);
                this.container_div.classList.add("scrollmap_warning_scroll");
            }
            return;
        }
        this.container_div.classList.remove("scrollmap_warning_scroll");
        evt.preventDefault();
        const [x, y] = this._getXYCoord(evt);
        // debug("onwheel", evt.clientX, evt.clientY, x, y);
        this.changeMapZoom(evt.deltaY * -this.zoomWheelDelta, x, y);
        this._disableTooltipsAndClick(true);
    }
    scroll(dx, dy, duration, delay) {
        // debug("scroll", this.board_x, dx, this.board_y, dy);
        this._scrollto(this.board_x + dx, this.board_y + dy, duration, delay);
    }
    // Scroll the board to make it centered on given position
    scrollto(x, y, duration, delay) {
        // debug("scroll", this.board_x, dx, this.board_y, dy);
        this._scrollto(x * this.zoom, y * this.zoom, duration, delay);
    }
    scrolltoAndZoom(x, y, zoom, duration, delay) {
        // debug("scroll", this.board_x, dx, this.board_y, dy);
        this.setMapZoom(zoom);
        this._scrollto(x * zoom, y * zoom, duration, delay);
    }
    scrolltoObjectAndZoom(obj, zoom, duration, delay) {
        this.setMapZoom(zoom);
        this.scrolltoObject(obj, duration, delay);
    }
    scrolltoObject(obj, duration, delay) {
        if (typeof obj == "string")
            obj = $(obj);
        if (!obj)
            return;
        var objPos = obj.getBoundingClientRect();
        var mapPos = this.scrollable_div.getBoundingClientRect();
        // Coordinates (pixels left and top relative to map_scrollable_oversurface) of the player's frog
        var objLocation = {
            x: objPos.left + (objPos.width / 2) - mapPos.left,
            y: objPos.top + (objPos.height / 2) - mapPos.top
        };
        this._scrollto(-objLocation.x, -objLocation.y, duration, delay);
    }
    // Scroll the board to make it centered on given position
    _scrollto(x, y, duration, delay) {
        if (this._setupDone)
            this._scrolled = true;
        else
            this.startPosition = { x: -x / this.zoom, y: -y / this.zoom };
        // debug("scrollto", this.board_x, this.board_y);
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
        // debug("scrollto board_x, board_y=",board_x, board_y);
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
    zoomToFitAndScrollToCenter(custom_css_query, duration, delay, x_extra_l = null, x_extra_r = null, y_extra_u = null, y_extra_d = null, cover_arrows = null) {
        if (x_extra_l != null) {
            this._x_extra_l = x_extra_l;
            this._x_extra_r = x_extra_r;
            this._y_extra_u = y_extra_u;
            this._y_extra_d = y_extra_d;
        }
        this.zoomToFit(x_extra_l, x_extra_r, y_extra_u, y_extra_d, cover_arrows);
        return this.scrollToCenter(custom_css_query, duration, delay, x_extra_l, x_extra_r, y_extra_u, y_extra_d);
    }
    // Scroll map in order to center everything
    // By default, take all elements in movable_scrollmap
    //  you can also specify (optional) a custom CSS query to get all concerned DOM elements
    scrollToCenter(custom_css_query, duration, delay, x_extra_l = null, x_extra_r = null, y_extra_u = null, y_extra_d = null) {
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
        debug("scrollToCenter", center.x, center.y, x_extra_l, x_extra_r, y_extra_u, y_extra_d);
        this.scrollto(-center.x, -center.y, duration, delay);
        return {
            x: center.x,
            y: center.y
        };
    }
    reset(duration) {
        if (this._resetMode == ScrollmapWithZoom.ResetMode.ScrollAndZoom)
            this.setMapZoom(this.defaultZoom);
        if (this._resetMode == ScrollmapWithZoom.ResetMode.ScrollAndZoomFit)
            this.zoomToFit();
        if (this.defaultPosition)
            this.scrollto(-this.defaultPosition.x, -this.defaultPosition.y, duration);
        else
            this.scrollToCenter(null, duration);
    }
    _isRectInside(outerRect, innerRect) {
        return !(innerRect.left < outerRect.left ||
            innerRect.top < outerRect.top ||
            innerRect.right > outerRect.right ||
            innerRect.bottom > outerRect.bottom);
    }
    _intersect(rect1, rect2) {
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
    _adjustToContain(outerRect, innerRect, margin = 40) {
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
    isObjVisible(obj) {
        return this._isRectInside(this.clipped_div.getBoundingClientRect(), obj.getBoundingClientRect());
    }
    isVisible(x, y, w = 0, h = 0) {
        const s = window.getComputedStyle(this.clipped_div);
        const width = parseFloat(s.width);
        const height = parseFloat(s.height);
        const obj_rect = new DOMRect(x * this.zoom, y * this.zoom, w * this.zoom, h * this.zoom);
        const board_rect = new DOMRect(-this.board_x - width / 2, -this.board_y - height / 2, width, height);
        return this._isRectInside(board_rect, obj_rect);
    }
    _makeRectVisible(obj_rect, board_rect, centerOnIt = true, excl_width = 0, excl_height = 0, pos = "topleft") {
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
                        error("_makeRectVisible: wrong 'pos' argument value");
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
    makeObjVisible(obj, centerOnIt = false, excl_width = 0, excl_height = 0, pos = "topleft") {
        let board_rect = this.clipped_div.getBoundingClientRect();
        let obj_rect = obj.getBoundingClientRect();
        this._makeRectVisible(obj_rect, board_rect, centerOnIt, excl_width, excl_height, pos);
    }
    makeVisible(x, y, w = 0, h = 0, centerOnIt = false, excl_width = 0, excl_height = 0, pos = "topleft") {
        const s = window.getComputedStyle(this.clipped_div);
        const width = parseFloat(s.width);
        const height = parseFloat(s.height);
        var obj_rect = new DOMRect(x * this.zoom, y * this.zoom, w * this.zoom, h * this.zoom);
        var board_rect = new DOMRect(-this.board_x - width / 2, -this.board_y - height / 2, width, height);
        this._makeRectVisible(obj_rect, board_rect, centerOnIt, excl_width, excl_height, pos);
    }
    getMapLimits(custom_css_query = null) {
        // Get all elements inside and get their max x/y/w/h
        var max_x = null;
        var max_y = null;
        var min_x = null;
        var min_y = null;
        var scales = new Map();

        function calcMaxMin(node, top_div) {
            if (node.offsetParent == null) // element not displayed
                return;
            // debug(node);
            let s = window.getComputedStyle(node);
            if (s.left == "auto" /*  && s.position == "absolute" */ ) {
                Array.from(node.children).forEach((node) => {
                    calcMaxMin(node, top_div);
                });
                return;
            }
            let directParent = node.parentNode;
            let parent = directParent;
            let scaleTotal = scales.get(parent);
            if (!scaleTotal) {
                scaleTotal = 1;
                while (!parent.isEqualNode(top_div)) {
                    let transform = window.getComputedStyle(parent).transform;
                    let scale = 1;
                    if (transform !== "none") {
                        let matrix = new DOMMatrix(transform);
                        scale = Math.hypot(matrix.m11, matrix.m21, matrix.m31);
                    }
                    scaleTotal *= scale;
                    parent = parent.parentNode;
                }
                scales.set(directParent, scaleTotal);
                // debug("scaleTotal",scaleTotal);
            }
            let left = (node.offsetLeft * scaleTotal) || 0;
            let width = (parseFloat(s.width) * scaleTotal) || (node.offsetWidth * scaleTotal);
            max_x = (max_x !== null) ? Math.max(max_x, left + width) : left + width;
            min_x = (min_x !== null) ? Math.min(min_x, left) : left;
            let top = (node.offsetTop * scaleTotal) || 0;
            let height = (parseFloat(s.height) * scaleTotal) || (node.offsetHeight * scaleTotal);
            max_y = (max_y !== null) ? Math.max(max_y, top + height) : top + height;
            min_y = (min_y !== null) ? Math.min(min_y, top) : top;
            debug(node.id, left, top, left + width, top + height);
        }
        var css_query = ":scope > *";
        if (custom_css_query) {
            css_query = custom_css_query;
        }
        this.scrollable_div.querySelectorAll(css_query).forEach((node) => {
            calcMaxMin(node, this.scrollable_div);
        });
        if (this.centerCalcUseAlsoOnsurface)
            this.onsurface_div.querySelectorAll(css_query).forEach((node) => {
                calcMaxMin(node, this.onsurface_div);
            });
        debug("getMapLimits", min_x, max_x, min_y, max_y);
        return {
            min_x,
            max_x,
            min_y,
            max_y
        };
    }
    getMapCenter(custom_css_query = null) {
        var { min_x, max_x, min_y, max_y } = this.getMapLimits(custom_css_query);
        var center;
        var centerOffset = this.centerPositionOffset;
        if (min_x !== null || min_y !== null || max_x !== null || max_y !== null)
            center = {
                x: (min_x + max_x) / 2,
                y: (min_y + max_y) / 2
            };
        else if (this.startPosition) {
            debug("getMapCenter use startPosition");
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
        // debug("getMapCenter",  min_x,  max_x, min_y, max_y);
        debug("getMapCenter", center);
        return center;
    }
    zoomToFit(x_extra_l = null, x_extra_r = null, y_extra_u = null, y_extra_d = null, cover_arrows = null) {
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
        const { min_x, max_x, min_y, max_y } = this.getMapLimits();
        var container_width = this.clipped_div.clientWidth;
        if (cover_arrows === false)
            container_width -= 2 * this._btnMoveLeft.clientWidth;
        var container_height = this.clipped_div.clientHeight;
        if (cover_arrows === false)
            container_height -= 2 * this._btnMoveTop.clientHeight;
        const newZoom = Math.min(container_width / (max_x - min_x + x_extra_l + x_extra_r), container_height / (max_y - min_y + y_extra_u + y_extra_d));
        debug("zoomToFit", newZoom, min_x, max_x, min_y, max_y, x_extra_l, x_extra_r, y_extra_u, y_extra_d, cover_arrows);
        this.setMapZoom(newZoom);
        if (!this._setupDone)
            this._zoomFitCalledDuringSetup = true;
    }
    changeMapZoom(diff, x = 0, y = 0) {
        const newZoom = this.zoom + diff;
        this.setMapZoom(newZoom, x, y);
    }
    setMapZoom(zoom, x = 0, y = 0) {
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
        //debug(x+' '+ y+' '+ zoomDelta+' '+ this.zoom);
        this._scrollto((this.board_x * zoomDelta) + x * (1 - zoomDelta), (this.board_y * zoomDelta) + y * (1 - zoomDelta), 0, 0);
        this._prevZoom = this.zoom;
    }
    _setScale(elemId, scale) {
        $(elemId).style.transform = 'scale(' + scale + ')';
    }
    _getButton(btnNames, idSuffix = "") {
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
            //debug($btn);
            //debug('#' + this.container_div.id+idSuffix + ' .'+this._classNameSuffix+btnName);
            if ($btn === null)
                $btn = $(btnName);
            if ($btn) {
                debug(btnName + " found");
                return $btn;
            }
        }
        debug(btnNamesL.join(',') + " not found");
        return null;
    }
    _toggleButtonsVisiblity() {
        this._setButtonsVisiblity(!this._bBtnsVisible);
    }
    _setButtonsVisiblity(visible, dispatch = true) {
        this._bBtnsVisible = visible;
        if (!visible && !this.btnsDivOnMap)
            return;
        this.container_div.querySelectorAll(".scrollmap_button_wrapper").forEach((node) => {
            if (visible)
                node.classList.remove("scrollmap_btn_nodisplay");
            else if (!node.classList.contains("scrollmap_icon_always_visible"))
                node.classList.add("scrollmap_btn_nodisplay");
        });
    }
    static _toggleButtonsVisiblity() {
        for (let inst of ScrollmapWithZoom.instances.values()) {
            inst._toggleButtonsVisiblity();
        }
    }
    _hideButton($btn, idSuffix = "") {
        debug("_hideButton", $btn);
        if ($btn !== null)
            $btn.classList.add("scrollmap_btn_nodisplay");
    }
    _showButton($btn, idSuffix = "", display = 'block') {
        debug("_showButton", $btn);
        if ($btn !== null)
            $btn.classList.remove("scrollmap_btn_nodisplay");
    }
    _enableButton($btn, idSuffix = "") {
        debug("_enableButton", $btn);
        if ($btn !== null)
            $btn.classList.remove("scrollmap_btn_disabled");
    }
    _disableButton($btn, idSuffix = "", display = 'block') {
        debug("_disableButton", $btn);
        if ($btn !== null)
            $btn.classList.add("scrollmap_btn_disabled");
    }
    _createButton(button_code) {
        if (this.clipped_div) {
            this.clipped_div.insertAdjacentHTML("beforeend", button_code);
            return this.clipped_div.lastElementChild;
        } else {
            this.container_div.insertAdjacentHTML("beforeend", button_code);
            return this.container_div.lastElementChild;
        }
    }
    _initButton(btnNames, defaultButton, tooltip = '', onClick = null, onLongPressedAnim = null, destDiv = undefined, idSuffix = "", display = 'block') {
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
    _onButtonLongPress(onLongPressedAnim, evt) {
        // debug("onButtonLongPress");
        var _longPressAnim = (time, anim = onLongPressedAnim) => {
            anim();
            if (this._longPress)
                requestAnimationFrame(_longPressAnim);
        };
        this._longPress = true;
        evt.preventDefault();
        requestAnimationFrame(_longPressAnim);
    }
    _onButtonLongPressEnd(evt) {
        //this.onMoveTop();
        //debug("onButtonLongPressEnd");
        this._longPress = false;
    }
    //////////////////////////////////////////////////
    //// Scroll/zoom with keys
    setupKeys() {
        if (ScrollmapWithZoom.bEnableKeys) {
            document.addEventListener("keydown", (e) => {
                this._onKeyDown(e);
            });
            document.addEventListener("keyup", (e) => {
                this._onKeyUp(e);
            });
        }
    }
    _onKeyDown(e) {
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
            console.log("onKeyDown", e.key);
            this._keysPressed.get(e.key).timer = setTimeout(() => {
                this._onKeyLongPress(e.key);
            }, 500);
        }
    }
    _onKeyLongPress(key) {
        console.log("onKeyLongPress");
        if (!this._keysPressed.get(key))
            return false;
        this._keysPressed.get(key).timer = null;
        var _longPressAnim = (time) => {
            this._onKeyLongPressAnim(key);
            if (this._keysPressed.get(key))
                requestAnimationFrame(_longPressAnim);
        };
        // this._longKeyPress = true;
        requestAnimationFrame(_longPressAnim);
    }
    _onKeyLongPressAnim(key) {
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
    _onKeyUp(e) {
        if (!ScrollmapWithZoom.bEnableKeys || ScrollmapWithZoom.count != 1)
            return;
        setTimeout(() => { this.container_div.classList.remove("scrollmap_warning_arrowkeys"); }, 2000);
        if (!this._keysPressed.get(e.key))
            return;
        console.log("onKeyUp", e.key);
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
    setupOnScreenArrows(scrollDelta, bScrollDeltaAlignWithZoom = true) {
        debug("setupOnScreenArrows");
        this.scrollDelta = scrollDelta;
        this.bScrollDeltaAlignWithZoom = bScrollDeltaAlignWithZoom;
        var _btnsMoveHelp = dojo.string.substitute(_("Scroll display (you can also use ${keys} + arrow keys)"), { keys: _("alt") });
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
    _onMoveTop(evt = null) {
        //debug("onMoveTop");
        if (evt)
            evt.preventDefault();
        this.scroll(0, this._scrollDeltaAlignWithZoom);
    }
    _onMoveLeft(evt = null) {
        // debug("onMoveLeft");
        if (evt)
            evt.preventDefault();
        this.scroll(this._scrollDeltaAlignWithZoom, 0);
    }
    _onMoveRight(evt = null) {
        // debug("onMoveRight");
        if (evt)
            evt.preventDefault();
        this.scroll(-this._scrollDeltaAlignWithZoom, 0);
    }
    _onMoveDown(evt = null) {
        // debug("onMoveDown");
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
        debug("setupOnScreenZoomButtons");
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
    _onZoomIn(evt = null) {
        if (evt)
            evt.preventDefault();
        this.changeMapZoom(this.zoomDelta);
    }
    _onZoomOut(evt = null) {
        if (evt)
            evt.preventDefault();
        this.changeMapZoom(-this.zoomDelta);
    }
    //////////////////////////////////////////////////
    //// Reset with buttons
    setupOnScreenResetButtons(resetMode = ScrollmapWithZoom.ResetMode.Scroll) {
        this._resetMode = resetMode;
        debug("setupOnScreenResetButtons");
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
    onReset() {
        this.reset();
    }
    //////////////////////////////////////////////////
    //// Increase/decrease display height with buttons
    _getEnlargeReduceButtonsProps(bInsideMap) {
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
    _setupEnlargeReduceButtons(bInsideMap, bShort = true, destDiv = null) {
        // this._bIncrHeightBtnIsShort = bShort;
        // this._bIncrHeightBtnGroupedWithOthers = bGroupedWithOthers;
        var btnsProps = this._getEnlargeReduceButtonsProps(bInsideMap);
        if (!this._btnIncreaseHeight)
            this._btnIncreaseHeight = this._initButton(this._btnIncreaseHeightNames, bInsideMap ? (bShort ? this.btnIncreaseHeightShortHtml : this.btnIncreaseHeightHtml) : null, _('Increase height'), this._onIncreaseDisplayHeight, () => {
                this.changeDisplayHeight(5);
            }, bShort ? destDiv : null, btnsProps.idSuffix, btnsProps.display);
        if (!this._btnDecreaseHeight)
            this._btnDecreaseHeight = this._initButton(this._btnDecreaseHeightNames, bInsideMap ? (bShort ? this.btnDecreaseHeightShortHtml : this.btnDecreaseHeightHtml) : null, _('Decrease height'), this._onDecreaseDisplayHeight, () => {
                this.changeDisplayHeight(-5);
            }, bShort ? destDiv : null, btnsProps.idSuffix, btnsProps.display);
        if (this._btnDecreaseHeight || this._btnIncreaseHeight) {
            this._bEnlargeReduceButtonsInsideMap = bInsideMap;
            return true;
        }
        return false;
    }
    setupEnlargeReduceButtons(incrHeightDelta, bIncrHeightKeepInPos = true, minHeight = null, bShort = true, bGroupedWithOthers = true) {
        debug("setupEnlargeReduceButtons");
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
    _onResetHeight(evt) {
        this._bMaxHeight = false;
        this._bHeightChanged = false;
        if (this.bAdaptHeightAuto)
            this._adaptHeight();
        else
            this.setDisplayHeight(this._defaultHeight);
        this._disableButton(this._btnResetHeight);
        this._enableButton(this._btnMaximizeHeight);
    }
    _onMaximizeHeight(evt) {
        this._bMaxHeight = this.changeDisplayHeight(5000);
        this._disableButton(this._btnMaximizeHeight);
        this._enableButton(this._btnResetHeight);
    }
    _onIncreaseDisplayHeight(evt) {
        evt.preventDefault();
        this._bMaxHeight = this.changeDisplayHeight(this.incrHeightDelta);
    }
    _onDecreaseDisplayHeight(evt) {
        evt.preventDefault();
        this.changeDisplayHeight(-this.incrHeightDelta);
    }
    changeDisplayHeight(delta) {
        this._bHeightChanged = true;
        var current_height = this.getDisplayHeight();
        // this._hideButton('maximize_height');
        return this.setDisplayHeight(current_height + delta);
    }
    setDisplayHeight(new_height, dispatch = true) {
        var screen_height = document.documentElement.clientHeight ||
            document.body.clientHeight || window.innerHeight;
        var pageZoom = this._getPageZoom();
        screen_height /= pageZoom;
        var current_height = this.getDisplayHeight();
        var maxHeight = screen_height - this._titleHeight;
        new_height = Math.min(Math.max(new_height, this.minHeight), maxHeight);
        if (this.bIncrHeightKeepInPos && this._setupDone)
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
        } else if (new_height == this.minHeight) {
            this._disableButton(this._btnDecreaseHeight);
        } else {
            this._enableButton(this._btnIncreaseHeight);
            this._enableButton(this._btnDecreaseHeight);
        }
        return (new_height == maxHeight);
    }
    static updateHeight(new_height, incrHeightGlobalKey) {}
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
        debug("setupInfoButton");
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
        if (ScrollmapWithZoom.bEnableKeys && this.bEnableKeysArrows)
            info += '<li>' + _('press the arrow keys with alt key (long press : continious scroll/pan).') + '</li>';
        info += '</ul>';
        if (this._bEnableZooming) {
            info += '<BR>';
            info += _('To zoom, do one of the folowing things:');
            info += '<ul>';
            var keysStr = this.getWheelZoomingOptionTranslated();
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
    getWheelZoomingOptionTranslated() {
        var keystr = "";
        var altstr = _("alt");
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
                keystr = nonestr + " " + orstr + " " + anystr;
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
ScrollmapWithZoom.count = 0;
ScrollmapWithZoom.instances = new Map();
ScrollmapWithZoom._optionsChanged = {};
ScrollmapWithZoom._bEnableKeys = true;
(function(ScrollmapWithZoom) {
    let wheelZoomingKeys;
    (function(wheelZoomingKeys) {
        wheelZoomingKeys[wheelZoomingKeys["Any"] = 1] = "Any";
        wheelZoomingKeys[wheelZoomingKeys["None"] = 2] = "None";
        wheelZoomingKeys[wheelZoomingKeys["AnyOrNone"] = 3] = "AnyOrNone";
        wheelZoomingKeys[wheelZoomingKeys["Ctrl"] = 4] = "Ctrl";
        wheelZoomingKeys[wheelZoomingKeys["Alt"] = 8] = "Alt";
        wheelZoomingKeys[wheelZoomingKeys["Shift"] = 16] = "Shift";
        wheelZoomingKeys[wheelZoomingKeys["Meta"] = 32] = "Meta";
    })(wheelZoomingKeys = ScrollmapWithZoom.wheelZoomingKeys || (ScrollmapWithZoom.wheelZoomingKeys = {}));
    let ResetMode;
    (function(ResetMode) {
        ResetMode[ResetMode["Scroll"] = 0] = "Scroll";
        ResetMode[ResetMode["ScrollAndZoom"] = 1] = "ScrollAndZoom";
        ResetMode[ResetMode["ScrollAndZoomFit"] = 2] = "ScrollAndZoomFit";
    })(ResetMode = ScrollmapWithZoom.ResetMode || (ScrollmapWithZoom.ResetMode = {}));
    let btnsDivPositionE;
    (function(btnsDivPositionE) {
        btnsDivPositionE["Top"] = "scrollmap_btns_top";
        btnsDivPositionE["Bottom"] = "scrollmap_btns_bottom";
        btnsDivPositionE["Left"] = "scrollmap_btns_left";
        btnsDivPositionE["Right"] = "scrollmap_btns_right";
        btnsDivPositionE["Center"] = "scrollmap_btns_center";
    })(btnsDivPositionE = ScrollmapWithZoom.btnsDivPositionE || (ScrollmapWithZoom.btnsDivPositionE = {}));
})(ScrollmapWithZoom || (ScrollmapWithZoom = {}));
dojo.require("dojo.has");
dojo.has.add('config-tlmSiblingOfDojo', 0, 0, 1);
define([
    "dojo", "dojo/_base/declare", "dijit/Tooltip", "dojo/aspect", "./long-press-event", "./core_patch_slideto"
], function() {
    ebg.scrollmapWithZoom = ScrollmapWithZoom;
    return ScrollmapWithZoom;
});