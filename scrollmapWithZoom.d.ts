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
declare class ScrollmapWithZoom {
    /**
     * board properties
     */
    board_x: number;
    board_y: number;
    startPosition: Position;
    container_div: HTMLElement;
    scrollable_div: HTMLElement;
    surface_div: HTMLElement;
    onsurface_div: HTMLElement;
    clipped_div: HTMLElement;
    animation_div: HTMLElement;
    /**
     * zoom properties
     */
    zoom: number;
    maxZoom: number;
    minZoom: number;
    defaultZoom: number;
    zoomingOptions: {
        wheelZoming: ScrollmapWithZoom.wheelZoomingKeys;
        pinchZooming: boolean;
    };
    zoomChangeHandler: Function;
    zoomPinchDelta: number;
    zoomWheelDelta: number;
    zoomDelta: number;
    get bEnableZooming(): boolean;
    set bEnableZooming(value: boolean);
    /**
     * scrolling properties
     */
    bEnableScrolling: boolean;
    scrollingOptions: {
        bOneFingerScrolling: boolean;
    };
    bScrollDeltaAlignWithZoom: boolean;
    scrollDelta: number;
    scrollPosInitial: object;
    scrollingTresh: number;
    defaultPosition: Position;
    centerCalcUseAlsoOnsurface: boolean;
    /**
     * resizing properties
     */
    minHeight: number;
    incrHeightGlobalKey: string;
    incrHeightDelta: number;
    bIncrHeightKeepInPos: boolean;
    get bAdaptHeightAuto(): boolean;
    set bAdaptHeightAuto(value: boolean);
    get bIncrHeightGlobally(): boolean;
    set bIncrHeightGlobally(value: boolean);
    get bIncrHeightBtnVisible(): boolean;
    set bIncrHeightBtnVisible(value: boolean);
    adaptHeightCorr: number;
    get bInfoBtnVisible(): boolean;
    /**
     * enable/disble long press on buttons
     */
    bEnableLongPress: boolean;
    /**
     * info button
     */
    set bInfoBtnVisible(value: boolean);
    /**
     * buttons default classes
     */
    btnMoveRightClasses: string;
    btnMoveLeftClasses: string;
    btnMoveTopClasses: string;
    btnMoveDownClasses: string;
    btnZoomPlusClasses: string;
    btnZoomMinusClasses: string;
    btnResetClasses: string;
    btnsPositionClasses: string;
    protected _prevZoom: number;
    protected _bEnableZooming: boolean;
    protected _scrollDeltaAlignWithZoom: number;
    protected _bHeightChanged: boolean;
    protected _bAdaptHeightAuto: boolean;
    protected _bIncrHeightGlobally: boolean;
    protected _bIncrHeightBtnVisible: boolean;
    protected _bInfoBtnVisible: boolean;
    protected _pointers: Map<any, any>;
    protected _classNameSuffix: string;
    protected _longPress: boolean;
    protected _enableTooltipsAndClickTimerId: number;
    protected _enabledTooltips: boolean;
    protected _enabledClicks: boolean;
    protected _enableTooltipsAndClick_handler: (this: HTMLElement, ev: MouseEvent) => any;
    protected _resizeObserver: ResizeObserver;
    protected _resizeHeadersObserver: ResizeObserver;
    protected _onpointermove_handler: (this: HTMLElement, ev: MouseEvent) => any;
    protected _onpointerup_handler: (this: HTMLElement, ev: MouseEvent) => any;
    protected _onpointerup_handled: boolean;
    protected _suppressCLickEvent_handler: (this: HTMLElement, ev: MouseEvent) => any;
    protected _touchInteracting: boolean;
    protected _setupDone: boolean;
    protected _bConfigurableInUserPreference: boolean;
    protected _btnMoveRight: HTMLElement;
    protected _btnMoveLeft: HTMLElement;
    protected _btnMoveTop: HTMLElement;
    protected _btnMoveDown: HTMLElement;
    protected _btnZoomPlus: HTMLElement;
    protected _btnZoomMinus: HTMLElement;
    protected _btnZoomPlusNames: string;
    protected _btnZoomMinusNames: string;
    protected _btnReset: HTMLElement;
    protected _btnResetNames: string;
    protected _btnInfo: HTMLElement;
    protected _btnBackToCenter: HTMLElement;
    protected _bEnlargeReduceButtonsInsideMap: boolean;
    protected _btnIncreaseHeight: HTMLElement;
    protected _btnDecreaseHeight: HTMLElement;
    protected _xPrev: number;
    protected _yPrev: number;
    protected _xPrevMid: number;
    protected _yPrevMid: number;
    protected _scrolling: boolean;
    protected _scrolltoBusy: boolean;
    protected _startScrollAnimDuration: number;
    protected _passiveEventListener: {};
    protected _notPassiveEventListener: {};
    protected _loadedSettings: boolean;
    protected _localStorageKey: string;
    protected _localStorageOldKey: string;
    protected _scrolled: boolean;
    protected _prevDist: number;
    protected _gestureStart: boolean;
    protected _prevTouchesDist: number;
    protected _prevTouchesMiddle: DOMPoint;
    protected _custom_css_query: string;
    protected _isScrolling: number;
    protected _resetZoom: boolean;
    protected get _btnIncreaseHeightDefault(): string;
    protected get _btnDecreaseHeightDefault(): string;
    protected get _btnMoveLeftDefault(): string;
    protected get _btnMoveTopDefault(): string;
    protected get _btnMoveRightDefault(): string;
    protected get _btnMoveDownDefault(): string;
    protected get _btnZoomPlusDefault(): string;
    protected get _btnZoomMinusDefault(): string;
    protected get _btnResetDefault(): string;
    constructor();
    protected static onShowTooltip(this: typeof dijit.Tooltip): void;
    create(container_div: HTMLElement, scrollable_div: HTMLElement, surface_div: HTMLElement, onsurface_div: HTMLElement, clipped_div?: HTMLElement, animation_div?: HTMLElement, page?: any, create_extra?: Function): void;
    createCompletely(container_div: any, page?: any, create_extra?: any, bEnlargeReduceButtonsInsideMap?: boolean): void;
    protected _init(): void;
    protected _adaptHeight(): void;
    protected _onResize(): void;
    protected _clearOldSettings(): void;
    protected _loadSettings(): boolean;
    protected _saveSettings(): void;
    protected _onvisibilty_changehandler(e: any): void;
    protected _onbeforeunload_handler(e: any): void;
    protected _updatePointers(event: any): any;
    protected _removePointers(event: any): void;
    protected _getPageZoom(): number;
    protected _getXYCoord(ev: any, ev2?: any): any[];
    protected _enableInteractions(): void;
    protected _disableInteractions(): void;
    protected _enableTooltipsAndClick(): void;
    protected _disableTooltipsAndClick(setTimer?: boolean): void;
    protected _suppressCLickEvent(e: any): void;
    protected _getTouchesDist(e: any): number;
    protected _getTouchesMiddle(e: any): DOMPoint;
    protected _handleTouch(e: any): void;
    protected _onPointerEnter(ev: any): void;
    protected _onPointerDown(ev: any): void;
    protected _onPointerMove(ev: any): void;
    protected _onPointerUp(ev: any): void;
    protected _onWheel(evt: any): void;
    scroll(dx: any, dy: any, duration?: any, delay?: any): void;
    scrollto(x: any, y: any, duration?: any, delay?: any): void;
    scrollToCenter(custom_css_query?: any, duration?: any, delay?: any): {
        x: number;
        y: number;
    };
    getMapCenter(custom_css_query: any): any;
    changeMapZoom(diff: any, x?: number, y?: number): void;
    setMapZoom(zoom: any, x?: number, y?: number): void;
    protected _setScale(elemId: any, scale: any): void;
    protected _getButton(btnNames: any, idSuffix?: string): HTMLElement;
    protected _hideButton(btnNames: any, idSuffix?: string): void;
    protected _showButton(btnNames: any, idSuffix?: string, display?: string): void;
    protected _initButton(btnName: any, defaultButton: any, onClick: any, onLongPressedAnim?: any, idSuffix?: string, display?: string): HTMLElement;
    protected _onButtonLongPress(onLongPressedAnim: any, evt: any): void;
    protected _onButtonLongPressEnd(evt: any): void;
    setupOnScreenArrows(scrollDelta: any, bScrollDeltaAlignWithZoom?: boolean): void;
    showOnScreenArrows(): void;
    hideOnScreenArrows(): void;
    protected _onMoveTop(evt: any): void;
    protected _onMoveLeft(evt: any): void;
    protected _onMoveRight(evt: any): void;
    protected _onMoveDown(evt: any): void;
    isVisible(x: any, y: any): boolean;
    enableScrolling(): void;
    disableScrolling(): void;
    setupOnScreenZoomButtons(zoomDelta?: number): void;
    showOnScreenZoomButtons(): void;
    hideOnScreenZoomButtons(): void;
    protected _onZoomIn(evt: any): void;
    protected _onZoomOut(evt: any): void;
    setupOnScreenResetButtons(resetZoom?: boolean): void;
    showOnScreenResetButtons(): void;
    hideOnScreenResetButtons(): void;
    protected _onReset(evt: any): void;
    protected _getEnlargeReduceButtonsProps(bInsideMap: any): {
        idSuffix: string;
        display: string;
    };
    protected _setupEnlargeReduceButtons(bInsideMap: any): boolean;
    setupEnlargeReduceButtons(incrHeightDelta: any, bIncrHeightKeepInPos: any, minHeight: any): void;
    showEnlargeReduceButtons(): void;
    hideEnlargeReduceButtons(): void;
    protected _onIncreaseDisplayHeight(evt: any): void;
    protected _onDecreaseDisplayHeight(evt: any): void;
    changeDisplayHeight(delta: any): void;
    setDisplayHeight(new_height: any, dispatch?: boolean): void;
    static updateHeight(new_height: number, incrHeightGlobalKey: string): void;
    getDisplayHeight(): number;
    setupInfoButton(bConfigurableInUserPreference?: boolean): any;
    showInfoButton(): void;
    hideInfoButton(): void;
    setInfoButtonTooltip(): any;
}
declare namespace ScrollmapWithZoom {
    enum wheelZoomingKeys {
        Disabled = 0,
        Any = 1,
        None = 2,
        Ctrl = 4,
        Alt = 8,
        Shift = 16,
        AnyOrNone = 32
    }
}
