declare var isDebug: boolean;
declare var debug: any;
declare const define: Function;
declare const ebg: any;
declare const $: Function;
declare const dojo: any;
declare const dijit: any;
declare function _(str: string): string;
declare const g_gamethemeurl: string;
declare const gameui: any;
declare const toint: Function;
declare const aspect: any;
interface Position {
    x: number;
    y: number;
}
declare class ScrollmapWithZoom {
    private static count;
    private static instances;
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
        wheelZoming: number;
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
    scrollingTresh: number;
    defaultPosition: Position;
    centerPositionOffset: Position;
    centerCalcUseAlsoOnsurface: boolean;
    /**
     * resizing properties
     */
    minHeight: number;
    incrHeightGlobalKey: string;
    incrHeightDelta: number;
    bIncrHeightKeepInPos: boolean;
    bAdaptHeightAutoCompensateChatIcon: boolean;
    get bAdaptHeightAuto(): boolean;
    set bAdaptHeightAuto(value: boolean);
    set adaptHeightCorrDivs(value: HTMLDivElement[]);
    get adaptHeightCorrDivs(): HTMLDivElement[];
    get bIncrHeightGlobally(): boolean;
    set bIncrHeightGlobally(value: boolean);
    get bIncrHeightBtnVisible(): boolean;
    set bIncrHeightBtnVisible(value: boolean);
    get bIncrHeightBtnIsShort(): boolean;
    set bIncrHeightBtnIsShort(value: boolean);
    get bIncrHeightBtnGroupedWithOthers(): boolean;
    set bIncrHeightBtnGroupedWithOthers(value: boolean);
    adaptHeightCorr: number;
    get bInfoBtnVisible(): boolean;
    /**
     * enable/disble long press on buttons
     */
    static get bEnableKeys(): boolean;
    static set bEnableKeys(value: boolean);
    bEnableKeysArrows: boolean;
    bEnableKeysPlusMinus: boolean;
    bEnableKeyHome: boolean;
    bEnableKeyEnd: boolean;
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
    btnZoomToFitClasses: string;
    btnIncreaseHeightClasses: string;
    btnDecreaseHeightClasses: string;
    btnsPositionClasses: string;
    btnsBackgroundColor: string;
    btnsMarginX: string;
    btnsMarginY: string;
    btnsOffsetX: string;
    btnsOffsetY: string;
    btnsSize: string;
    btnsFontSize: string;
    btnsAroundSize: string;
    longPressScroll: number;
    longPressZoom: number;
    protected _prevZoom: number;
    protected _bEnableZooming: boolean;
    protected _scrollDeltaAlignWithZoom: number;
    protected _bHeightChanged: boolean;
    protected _bAdaptHeightAuto: boolean;
    protected _adaptHeightCorrDivs: Array<HTMLDivElement>;
    protected _bIncrHeightGlobally: boolean;
    protected _bIncrHeightBtnVisible: boolean;
    protected _bIncrHeightBtnIsShort: boolean;
    protected _bIncrHeightBtnGroupedWithOthers: boolean;
    protected _bInfoBtnVisible: boolean;
    protected _pointers: Map<number, any>;
    protected _classNameSuffix: string;
    protected _longPress: boolean;
    protected _keysPressed: Map<string, any>;
    protected static _bEnableKeys: boolean;
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
    protected _adaptHeightDone: boolean;
    protected _bConfigurableInUserPreference: boolean;
    protected _btnMoveRight: HTMLElement;
    protected _btnMoveLeft: HTMLElement;
    protected _btnMoveTop: HTMLElement;
    protected _btnMoveDown: HTMLElement;
    protected _btnsMoveHelp: string;
    protected _btnZoomPlus: HTMLElement;
    protected _btnZoomMinus: HTMLElement;
    protected _btnZoomPlusNames: string;
    protected _btnZoomMinusNames: string;
    protected _btnReset: HTMLElement;
    protected _btnResetNames: string;
    protected _btnInfo: HTMLElement;
    protected _btnZoomToFit: HTMLElement;
    protected _btnZoomToFitNames: string;
    protected _btnIncreaseHeightNames: string;
    protected _btnDecreaseHeightNames: string;
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
    protected _resetMode: ScrollmapWithZoom.ResetMode;
    protected get _btnIncreaseHeightDefault(): string;
    protected get _btnDecreaseHeightDefault(): string;
    protected _btnIncreaseHeightPosClasses(): string;
    protected get _btnIncreaseHeightDefaultShort(): string;
    protected get _btnDecreaseHeightDefaultShort(): string;
    protected get _btnMoveLeftDefault(): string;
    protected get _btnMoveTopDefault(): string;
    protected get _btnMoveRightDefault(): string;
    protected get _btnMoveDownDefault(): string;
    protected get _btnZoomPlusDefault(): string;
    protected get _btnZoomMinusDefault(): string;
    protected get _btnResetDefault(): string;
    protected get _btnZoomToFitDefault(): string;
    constructor();
    protected static onShowTooltip(this: typeof dijit.Tooltip): void;
    create(container_div: HTMLElement, scrollable_div: HTMLElement, surface_div: HTMLElement, onsurface_div: HTMLElement, clipped_div?: HTMLElement, animation_div?: HTMLElement, page?: object, create_extra?: Function): void;
    createCompletely(container_div: HTMLElement, page?: object, create_extra?: Function, bEnlargeReduceButtonsInsideMap?: boolean): void;
    protected _init(): void;
    protected _adaptHeight(entries: ResizeObserverEntry[]): void;
    protected _onResize(entries: ResizeObserverEntry[]): void;
    protected _clearOldSettings(): void;
    protected _loadSettings(): boolean;
    protected _saveSettings(): void;
    protected _onvisibilty_changehandler(e: Event): void;
    protected _onbeforeunload_handler(e: Event): void;
    protected _updatePointers(event: PointerEvent | TouchEvent | MouseEvent): any;
    protected _removePointers(event: PointerEvent | TouchEvent | MouseEvent): void;
    protected _getPageZoom(): number;
    protected _getInterfaceFactor(): number;
    protected _getXYCoord(ev: PointerEvent | Touch | MouseEvent, ev2?: PointerEvent | Touch | MouseEvent): any[];
    protected _enableInteractions(): void;
    protected _disableInteractions(): void;
    protected _enableTooltipsAndClick(): void;
    protected _disableTooltipsAndClick(setTimer?: boolean): void;
    protected _suppressCLickEvent(e: Event): void;
    protected _getTouchesDist(e: TouchEvent): number;
    protected _getTouchesMiddle(e: TouchEvent): DOMPoint;
    protected _handleTouch(e: TouchEvent): void;
    protected _onPointerEnter(ev: PointerEvent): void;
    protected _onPointerDown(ev: PointerEvent): void;
    protected _onPointerMove(ev: PointerEvent | TouchEvent | MouseEvent): void;
    protected _onPointerUp(ev: PointerEvent | TouchEvent | MouseEvent): void;
    protected _onWheel(evt: WheelEvent): void;
    scroll(dx: number, dy: number, duration?: number, delay?: number): void;
    scrollto(x: number, y: number, duration?: number, delay?: number): void;
    scrolltoAndZoom(x: number, y: number, zoom: number, duration?: number, delay?: number): void;
    scrolltoObjectAndZoom(obj: HTMLElement | string, zoom: number, duration?: number, delay?: number): void;
    scrolltoObject(obj: HTMLElement | string, duration?: number, delay?: number): void;
    _scrollto(x: number, y: number, duration?: number, delay?: number): void;
    zoomToFitAndScrollToCenter(custom_css_query?: string, duration?: number, delay?: number, x_extra_l?: number, x_extra_r?: number, y_extra_u?: number, y_extra_d?: number): {
        x: number;
        y: number;
    };
    scrollToCenter(custom_css_query?: string, duration?: number, delay?: number, x_extra_l?: number, x_extra_r?: number, y_extra_u?: number, y_extra_d?: number): {
        x: number;
        y: number;
    };
    getMapLimits(custom_css_query?: string): {
        min_x: number;
        max_x: number;
        min_y: number;
        max_y: number;
    };
    getMapCenter(custom_css_query?: string): {
        x: number;
        y: number;
    };
    zoomToFit(x_extra_l?: number, x_extra_r?: number, y_extra_u?: number, y_extra_d?: number): void;
    changeMapZoom(diff: number, x?: number, y?: number): void;
    setMapZoom(zoom: number, x?: number, y?: number): void;
    protected _setScale(elemId: HTMLElement, scale: number): void;
    protected _getButton(btnNames: string, idSuffix?: string): HTMLElement;
    protected _hideButton(btnNames: string, idSuffix?: string): void;
    protected _showButton(btnNames: string, idSuffix?: string, display?: string): void;
    protected _initButton(btnName: string, defaultButton: string, onClick: Function, onLongPressedAnim?: Function, idSuffix?: string, display?: string): HTMLElement;
    protected _onButtonLongPress(onLongPressedAnim: Function, evt: Event): void;
    protected _onButtonLongPressEnd(evt: Event): void;
    setupKeys(): void;
    protected _onKeyDown(e: KeyboardEvent): void;
    protected _onKeyLongPress(key: string): boolean;
    protected _onKeyLongPressAnim(key: string): void;
    protected _onKeyUp(e: KeyboardEvent): void;
    setupOnScreenArrows(scrollDelta: number, bScrollDeltaAlignWithZoom?: boolean): void;
    showOnScreenArrows(): void;
    hideOnScreenArrows(): void;
    protected _onMoveTop(evt?: Event): void;
    protected _onMoveLeft(evt?: Event): void;
    protected _onMoveRight(evt?: Event): void;
    protected _onMoveDown(evt?: Event): void;
    isVisible(x: number, y: number): boolean;
    enableScrolling(): void;
    disableScrolling(): void;
    setupOnScreenZoomButtons(zoomDelta?: number): void;
    showOnScreenZoomButtons(): void;
    hideOnScreenZoomButtons(): void;
    protected _onZoomIn(evt?: Event): void;
    protected _onZoomOut(evt?: Event): void;
    setupOnScreenResetButtons(resetMode?: ScrollmapWithZoom.ResetMode): void;
    showOnScreenResetButtons(): void;
    hideOnScreenResetButtons(): void;
    protected onReset(evt: Event): void;
    protected _getEnlargeReduceButtonsProps(bInsideMap: boolean): {
        idSuffix: string;
        display: string;
    };
    protected _setupEnlargeReduceButtons(bInsideMap: boolean, bShort?: boolean, bGroupedWithOthers?: boolean): boolean;
    setupEnlargeReduceButtons(incrHeightDelta: number, bIncrHeightKeepInPos?: boolean, minHeight?: number, bShort?: boolean, bGroupedWithOthers?: boolean): void;
    showEnlargeReduceButtons(): void;
    hideEnlargeReduceButtons(): void;
    protected _onIncreaseDisplayHeight(evt: Event): void;
    protected _onDecreaseDisplayHeight(evt: Event): void;
    changeDisplayHeight(delta: number): void;
    setDisplayHeight(new_height: number, dispatch?: boolean): void;
    static updateHeight(new_height: number, incrHeightGlobalKey: string): void;
    getDisplayHeight(): number;
    setupInfoButton(bConfigurableInUserPreference?: boolean): string;
    showInfoButton(): void;
    hideInfoButton(): void;
    setInfoButtonTooltip(): string;
    getWheelZoomingOptionTranslated(): string;
}
declare namespace ScrollmapWithZoom {
    enum wheelZoomingKeys {
        Disabled = 0,
        Any = 1,
        None = 2,
        AnyOrNone = 3,
        Ctrl = 4,
        Alt = 8,
        Shift = 16,
        Meta = 32
    }
    enum ResetMode {
        Scroll = 0,
        ScrollAndZoom = 1,
        ScrollAndZoomFit = 2
    }
}
