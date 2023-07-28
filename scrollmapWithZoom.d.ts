declare var isDebug: boolean;
declare var debug: any;
declare const define: any;
declare const ebg: any;
declare const $: any;
declare const dojo: any;
declare const dijit: any;
declare const _: any;
declare const g_gamethemeurl: any;
declare const gameui: any;
declare const toint: any;
declare const aspect: any;
interface Position {
    x: number;
    y: number;
}
declare class scrollmapWithZoom {
    board_x: number;
    board_y: number;
    defaultPosition: Position;
    container_div: HTMLElement;
    scrollable_div: HTMLElement;
    surface_div: HTMLElement;
    onsurface_div: HTMLElement;
    clipped_div: HTMLElement;
    animation_div: HTMLElement;
    private _btnInfo;
    zoom: number;
    maxZoom: number;
    minZoom: number;
    defaultZoom: number;
    private _prevZoom;
    zoomPinchDelta: number;
    zoomWheelDelta: number;
    zoomDelta: number;
    wheelZoomingKeys: {
        Disabled: number;
        Any: number;
        None: number;
        Ctrl: number;
        Alt: number;
        Shift: number;
        AnyOrNone: number;
    };
    zoomingOptions: {
        wheelZoming: number;
        pinchZooming: boolean;
    };
    zoomChangeHandler: Function;
    private _bEnableZooming;
    get bEnableZooming(): boolean;
    set bEnableZooming(value: boolean);
    bEnableScrolling: boolean;
    scrollingOptions: {
        bOneFingerScrolling: boolean;
    };
    bScrollDeltaAlignWithZoom: boolean;
    scrollDelta: number;
    private _scrollDeltaAlignWithZoom;
    scrollPosInitial: object;
    bHeightChanged: boolean;
    minHeight: number;
    incrHeightDelta: number;
    bIncrHeightKeepInPos: boolean;
    private _bAdaptHeightAuto;
    get bAdaptHeightAuto(): boolean;
    set bAdaptHeightAuto(value: boolean);
    private _bIncrHeightGlobally;
    get bIncrHeightGlobally(): boolean;
    set bIncrHeightGlobally(value: boolean);
    private _bIncrHeightBtnVisible;
    get bIncrHeightBtnVisible(): boolean;
    set bIncrHeightBtnVisible(value: boolean);
    adaptHeightCorr: number;
    private _bInfoBtnVisible;
    get bInfoBtnVisible(): boolean;
    set bInfoBtnVisible(value: boolean);
    bEnableLongPress: boolean;
    private _pointers;
    private _classNameSuffix;
    private _longPress;
    private _enableTooltipsAndClickTimerId;
    private _enabledTooltips;
    private _enabledClicks;
    private _enableTooltipsAndClick_handler;
    private _resizeObserver;
    private _resizeHeadersObserver;
    private _onpointermove_handler;
    private _onpointerup_handler;
    private _onpointerup_handled;
    private _suppressCLickEvent_handler;
    private _touchInteracting;
    private _setupDone;
    private _bConfigurableInUserPreference;
    private _btnMoveRight;
    btnMoveRightClasses: string;
    private _btnMoveLeft;
    btnMoveLeftClasses: string;
    private _btnMoveTop;
    btnMoveTopClasses: string;
    private _btnMoveDown;
    btnMoveDownClasses: string;
    private _btnZoomPlus;
    private _btnZoomMinus;
    private _btnZoomPlusNames;
    btnZoomPlusClasses: string;
    private _btnZoomMinusNames;
    btnZoomMinusClasses: string;
    private _btnReset;
    private _btnResetNames;
    btnResetClasses: string;
    private _btnBackToCenter;
    private _bEnlargeReduceButtonsInsideMap;
    private _btnIncreaseHeight;
    private _btnDecreaseHeight;
    private _xPrev;
    private _yPrev;
    private _xPrevMid;
    private _yPrevMid;
    private _scrolling;
    scrollingTresh: number;
    scrolltoBusy: boolean;
    startScrollDuration: number;
    passiveEventListener: {};
    notPassiveEventListener: {};
    loadedSettings: boolean;
    startPosition: Position;
    private _localStorageKey;
    private _scrolled;
    private _prevDist;
    private _gestureStart;
    private _prevTouchesDist;
    private _prevTouchesMiddle;
    private _custom_css_query;
    private _isScrolling;
    private _resetZoom;
    get _btnIncreaseHeightDefault(): string;
    get _btnDecreaseHeightDefault(): string;
    get _btnMoveLeftDefault(): string;
    get _btnMoveTopDefault(): string;
    get _btnMoveRightDefault(): string;
    get _btnMoveDownDefault(): string;
    get _btnZoomPlusDefault(): string;
    get _btnZoomMinusDefault(): string;
    get _btnResetDefault(): string;
    constructor();
    static onShowTooltip(this: typeof dijit.Tooltip): void;
    create(container_div: HTMLElement, scrollable_div: HTMLElement, surface_div: HTMLElement, onsurface_div: HTMLElement, clipped_div?: HTMLElement, animation_div?: HTMLElement, page?: any, create_extra?: Function): void;
    createCompletely(container_div: any, page?: any, create_extra?: any, bEnlargeReduceButtonsInsideMap?: boolean): void;
    _init(): void;
    _adaptHeight(): void;
    onResize(): void;
    _clearOldSettings(): void;
    _loadSettings(): boolean;
    _saveSettings(): void;
    _onvisibilty_changehandler(e: any): void;
    _onbeforeunload_handler(e: any): void;
    _updatePointers(event: any): any;
    _removePointers(event: any): void;
    _getPageZoom(): number;
    _getXYCoord(ev: any, ev2?: any): any[];
    _enableInteractions(): void;
    _disableInteractions(): void;
    _enableTooltipsAndClick(): void;
    _disableTooltipsAndClick(setTimer?: boolean): void;
    _suppressCLickEvent(e: any): void;
    _getTouchesDist(e: any): number;
    _getTouchesMiddle(e: any): DOMPoint;
    _handleTouch(e: any): void;
    _onPointerEnter(ev: any): void;
    _onPointerDown(ev: any): void;
    _onPointerMove(ev: any): void;
    _onPointerUp(ev: any): void;
    _onWheel(evt: any): void;
    scroll(dx: any, dy: any, duration?: any, delay?: any): void;
    scrollto(x: any, y: any, duration?: any, delay?: any): void;
    scrollToCenter(custom_css_query?: any, duration?: any, delay?: any): {
        x: number;
        y: number;
    };
    getMapCenter(custom_css_query: any): {
        x: number;
        y: number;
    };
    changeMapZoom(diff: any, x?: number, y?: number): void;
    setMapZoom(zoom: any, x?: number, y?: number): void;
    _setScale(elemId: any, scale: any): void;
    _getButton(btnNames: any, idSuffix?: string): any;
    _hideButton(btnNames: any, idSuffix?: string): void;
    _showButton(btnNames: any, idSuffix?: string, display?: string): void;
    _initButton(btnName: any, defaultButton: any, onClick: any, onLongPressedAnim?: any, idSuffix?: string, display?: string): any;
    _onButtonLongPress(onLongPressedAnim: any, evt: any): void;
    _onButtonLongPressEnd(evt: any): void;
    setupOnScreenArrows(scrollDelta: any, bScrollDeltaAlignWithZoom?: boolean): void;
    showOnScreenArrows(): void;
    hideOnScreenArrows(): void;
    _onMoveTop(evt: any): void;
    _onMoveLeft(evt: any): void;
    _onMoveRight(evt: any): void;
    _onMoveDown(evt: any): void;
    isVisible(x: any, y: any): boolean;
    enableScrolling(): void;
    disableScrolling(): void;
    setupOnScreenZoomButtons(zoomDelta?: number): void;
    showOnScreenZoomButtons(): void;
    hideOnScreenZoomButtons(): void;
    _onZoomIn(evt: any): void;
    _onZoomOut(evt: any): void;
    setupOnScreenResetButtons(resetZoom?: boolean): void;
    showOnScreenResetButtons(): void;
    hideOnScreenResetButtons(): void;
    _onReset(evt: any): void;
    _getEnlargeReduceButtonsProps(bInsideMap: any): {
        idSuffix: string;
        display: string;
    };
    _setupEnlargeReduceButtons(bInsideMap: any): boolean;
    setupEnlargeReduceButtons(incrHeightDelta: any, bIncrHeightKeepInPos: any, minHeight: any): void;
    showEnlargeReduceButtons(): void;
    hideEnlargeReduceButtons(): void;
    _onIncreaseDisplayHeight(evt: any): void;
    _onDecreaseDisplayHeight(evt: any): void;
    changeDisplayHeight(delta: any): void;
    setDisplayHeight(new_height: any, dispatch?: boolean): void;
    static updateHeight(new_height: any): void;
    getDisplayHeight(): number;
    setupInfoButton(bConfigurableInUserPreference?: boolean): any;
    showInfoButton(): void;
    hideInfoButton(): void;
    setInfoButtonTooltip(): any;
}
