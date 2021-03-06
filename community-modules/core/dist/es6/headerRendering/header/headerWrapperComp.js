/**
 * @ag-grid-community/core - Advanced Data Grid / Data Table supporting Javascript / React / AngularJS / Web Components
 * @version v24.1.0
 * @link http://www.ag-grid.com/
 * @license MIT
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Autowired, PreDestroy } from "../../context/context";
import { Column } from "../../entities/column";
import { DragAndDropService, DragSourceType } from "../../dragAndDrop/dragAndDropService";
import { Constants } from "../../constants/constants";
import { CssClassApplier } from "../cssClassApplier";
import { Events } from "../../events";
import { HoverFeature } from "../hoverFeature";
import { SetLeftFeature } from "../../rendering/features/setLeftFeature";
import { SelectAllFeature } from "./selectAllFeature";
import { RefSelector } from "../../widgets/componentAnnotations";
import { TouchListener } from "../../widgets/touchListener";
import { TooltipFeature } from "../../widgets/tooltipFeature";
import { AbstractHeaderWrapper } from "./abstractHeaderWrapper";
import { setAriaSort, getAriaSortState, removeAriaSort } from "../../utils/aria";
import { addCssClass, addOrRemoveCssClass, removeCssClass, setDisplayed } from "../../utils/dom";
import { KeyCode } from '../../constants/keyCode';
var HeaderWrapperComp = /** @class */ (function (_super) {
    __extends(HeaderWrapperComp, _super);
    function HeaderWrapperComp(column, pinned) {
        var _this = _super.call(this, HeaderWrapperComp.TEMPLATE) || this;
        _this.headerCompVersion = 0;
        _this.refreshFunctions = [];
        _this.column = column;
        _this.pinned = pinned;
        return _this;
    }
    HeaderWrapperComp.prototype.postConstruct = function () {
        _super.prototype.postConstruct.call(this);
        this.colDefVersion = this.columnController.getColDefVersion();
        this.updateState();
        this.appendHeaderComp();
        this.setupWidth();
        this.setupMovingCss();
        this.setupTooltip();
        this.setupResize();
        this.setupMenuClass();
        this.setupSortableClass();
        this.addColumnHoverListener();
        this.addActiveHeaderMouseListeners();
        this.createManagedBean(new HoverFeature([this.column], this.getGui()));
        this.addManagedListener(this.column, Column.EVENT_FILTER_ACTIVE_CHANGED, this.onFilterChanged.bind(this));
        this.onFilterChanged();
        this.createManagedBean(new SelectAllFeature(this.cbSelectAll, this.column));
        this.createManagedBean(new SetLeftFeature(this.column, this.getGui(), this.beans));
        this.addAttributes();
        CssClassApplier.addHeaderClassesFromColDef(this.column.getColDef(), this.getGui(), this.gridOptionsWrapper, this.column, null);
        this.addManagedListener(this.eventService, Events.EVENT_NEW_COLUMNS_LOADED, this.onNewColumnsLoaded.bind(this));
        this.addManagedListener(this.eventService, Events.EVENT_COLUMN_VALUE_CHANGED, this.onColumnValueChanged.bind(this));
    };
    HeaderWrapperComp.prototype.onColumnValueChanged = function () {
        // display name can change if aggFunc different, eg sum(Gold) is now max(Gold)
        if (this.displayName !== this.calculateDisplayName()) {
            this.refresh();
        }
    };
    HeaderWrapperComp.prototype.updateState = function () {
        var colDef = this.column.getColDef();
        this.sortable = colDef.sortable;
        this.displayName = this.calculateDisplayName();
        this.draggable = this.workOutDraggable();
    };
    HeaderWrapperComp.prototype.calculateDisplayName = function () {
        return this.columnController.getDisplayNameForColumn(this.column, 'header', true);
    };
    HeaderWrapperComp.prototype.onNewColumnsLoaded = function () {
        var colDefVersionNow = this.columnController.getColDefVersion();
        if (colDefVersionNow != this.colDefVersion) {
            this.colDefVersion = colDefVersionNow;
            this.refresh();
        }
    };
    HeaderWrapperComp.prototype.refresh = function () {
        this.updateState();
        var colDef = this.column.getColDef();
        var newHeaderCompConfigured = this.colDefHeaderComponent != colDef.headerComponent
            || this.colDefHeaderComponentFramework != colDef.headerComponentFramework;
        var headerCompRefreshed = newHeaderCompConfigured ? false : this.attemptHeaderCompRefresh();
        if (headerCompRefreshed) {
            var dragSourceIsMissing = this.draggable && !this.dragAndDropService;
            var dragSourceNeedsRemoving = !this.draggable && this.dragAndDropService;
            if (dragSourceIsMissing || dragSourceNeedsRemoving) {
                this.attachDraggingToHeaderComp();
            }
        }
        else {
            this.appendHeaderComp();
        }
        this.refreshFunctions.forEach(function (f) { return f(); });
    };
    HeaderWrapperComp.prototype.destroyHeaderComp = function () {
        if (this.headerComp) {
            this.getGui().removeChild(this.headerCompGui);
            this.headerComp = this.destroyBean(this.headerComp);
            this.headerCompGui = undefined;
        }
        this.removeMoveDragSource();
    };
    HeaderWrapperComp.prototype.removeMoveDragSource = function () {
        if (this.moveDragSource) {
            this.dragAndDropService.removeDragSource(this.moveDragSource);
            this.moveDragSource = undefined;
        }
    };
    HeaderWrapperComp.prototype.attemptHeaderCompRefresh = function () {
        // if no header comp created yet, it's cos of async creation, so first version is yet
        // to get here, in which case we return true to say 'no need to refresh'.
        if (!this.headerComp) {
            return true;
        }
        // if no refresh method, then we want to replace the headerComp
        if (!this.headerComp.refresh) {
            return false;
        }
        // if the cell renderer has a refresh method, we call this instead of doing a refresh
        var params = this.createParams();
        // take any custom params off of the user
        var finalParams = this.userComponentFactory.createFinalParams(this.getComponentHolder(), 'headerComponent', params);
        var res = this.headerComp.refresh(finalParams);
        return res;
    };
    HeaderWrapperComp.prototype.addActiveHeaderMouseListeners = function () {
        var _this = this;
        var listener = function (e) { return _this.setActiveHeader(e.type === 'mouseenter'); };
        this.addManagedListener(this.getGui(), 'mouseenter', listener);
        this.addManagedListener(this.getGui(), 'mouseleave', listener);
    };
    HeaderWrapperComp.prototype.setActiveHeader = function (active) {
        addOrRemoveCssClass(this.getGui(), 'ag-header-active', active);
    };
    HeaderWrapperComp.prototype.onFocusIn = function (e) {
        if (!this.getGui().contains(e.relatedTarget)) {
            var headerRow = this.getParentComponent();
            this.focusController.setFocusedHeader(headerRow.getRowIndex(), this.getColumn());
        }
        this.setActiveHeader(true);
    };
    HeaderWrapperComp.prototype.onFocusOut = function (e) {
        if (this.getGui().contains(e.relatedTarget)) {
            return;
        }
        this.setActiveHeader(false);
    };
    HeaderWrapperComp.prototype.handleKeyDown = function (e) {
        var headerComp = this.headerComp;
        if (!headerComp) {
            return;
        }
        if (e.keyCode === KeyCode.SPACE) {
            var checkbox = this.cbSelectAll;
            if (checkbox.isDisplayed() && !checkbox.getGui().contains(document.activeElement)) {
                e.preventDefault();
                checkbox.setValue(!checkbox.getValue());
            }
        }
        if (e.keyCode === KeyCode.ENTER) {
            if (e.ctrlKey || e.metaKey) {
                if (this.menuEnabled && headerComp.showMenu) {
                    e.preventDefault();
                    headerComp.showMenu();
                }
            }
            else if (this.sortable) {
                var multiSort = e.shiftKey;
                this.sortController.progressSort(this.column, multiSort, "uiColumnSorted");
            }
        }
    };
    HeaderWrapperComp.prototype.onTabKeyDown = function () { };
    HeaderWrapperComp.prototype.getComponentHolder = function () {
        return this.column.getColDef();
    };
    HeaderWrapperComp.prototype.addColumnHoverListener = function () {
        this.addManagedListener(this.eventService, Events.EVENT_COLUMN_HOVER_CHANGED, this.onColumnHover.bind(this));
        this.onColumnHover();
    };
    HeaderWrapperComp.prototype.onColumnHover = function () {
        var isHovered = this.columnHoverService.isHovered(this.column);
        addOrRemoveCssClass(this.getGui(), 'ag-column-hover', isHovered);
    };
    HeaderWrapperComp.prototype.setupSortableClass = function () {
        var _this = this;
        var eGui = this.getGui();
        var updateSortableCssClass = function () {
            addOrRemoveCssClass(eGui, 'ag-header-cell-sortable', _this.sortable);
        };
        var updateAriaSort = function () {
            if (_this.sortable) {
                setAriaSort(eGui, getAriaSortState(_this.column));
            }
            else {
                removeAriaSort(eGui);
            }
        };
        updateSortableCssClass();
        updateAriaSort();
        this.refreshFunctions.push(updateSortableCssClass);
        this.refreshFunctions.push(updateAriaSort);
        this.addManagedListener(this.column, Column.EVENT_SORT_CHANGED, updateAriaSort.bind(this));
    };
    HeaderWrapperComp.prototype.onFilterChanged = function () {
        var filterPresent = this.column.isFilterActive();
        addOrRemoveCssClass(this.getGui(), 'ag-header-cell-filtered', filterPresent);
    };
    HeaderWrapperComp.prototype.appendHeaderComp = function () {
        this.headerCompVersion++;
        var colDef = this.column.getColDef();
        this.colDefHeaderComponent = colDef.headerComponent;
        this.colDefHeaderComponentFramework = colDef.headerComponentFramework;
        var params = this.createParams();
        var callback = this.afterHeaderCompCreated.bind(this, this.headerCompVersion);
        this.userComponentFactory.newHeaderComponent(params).then(callback);
    };
    HeaderWrapperComp.prototype.createParams = function () {
        var _this = this;
        var colDef = this.column.getColDef();
        this.menuEnabled = this.menuFactory.isMenuEnabled(this.column) && !colDef.suppressMenu;
        var params = {
            column: this.column,
            displayName: this.displayName,
            enableSorting: colDef.sortable,
            enableMenu: this.menuEnabled,
            showColumnMenu: function (source) {
                _this.gridApi.showColumnMenuAfterButtonClick(_this.column, source);
            },
            progressSort: function (multiSort) {
                _this.sortController.progressSort(_this.column, !!multiSort, "uiColumnSorted");
            },
            setSort: function (sort, multiSort) {
                _this.sortController.setSortForColumn(_this.column, sort, !!multiSort, "uiColumnSorted");
            },
            api: this.gridApi,
            columnApi: this.columnApi,
            context: this.gridOptionsWrapper.getContext()
        };
        return params;
    };
    HeaderWrapperComp.prototype.afterHeaderCompCreated = function (version, headerComp) {
        if (version != this.headerCompVersion || !this.isAlive()) {
            this.destroyBean(headerComp);
            return;
        }
        this.destroyHeaderComp();
        this.headerComp = headerComp;
        this.headerCompGui = headerComp.getGui();
        this.getGui().appendChild(this.headerCompGui);
        this.attachDraggingToHeaderComp();
    };
    HeaderWrapperComp.prototype.onColumnMovingChanged = function () {
        // this function adds or removes the moving css, based on if the col is moving.
        // this is what makes the header go dark when it is been moved (gives impression to
        // user that the column was picked up).
        if (this.column.isMoving()) {
            addCssClass(this.getGui(), 'ag-header-cell-moving');
        }
        else {
            removeCssClass(this.getGui(), 'ag-header-cell-moving');
        }
    };
    HeaderWrapperComp.prototype.workOutDraggable = function () {
        var colDef = this.column.getColDef();
        var isSuppressMovableColumns = this.gridOptionsWrapper.isSuppressMovableColumns();
        var colCanMove = !isSuppressMovableColumns && !colDef.suppressMovable && !colDef.lockPosition;
        // we should still be allowed drag the column, even if it can't be moved, if the column
        // can be dragged to a rowGroup or pivot drop zone
        return colCanMove || colDef.enableRowGroup || colDef.enablePivot;
    };
    HeaderWrapperComp.prototype.attachDraggingToHeaderComp = function () {
        var _this = this;
        this.removeMoveDragSource();
        if (!this.draggable) {
            return;
        }
        this.moveDragSource = {
            type: DragSourceType.HeaderCell,
            eElement: this.headerCompGui,
            defaultIconName: DragAndDropService.ICON_HIDE,
            getDragItem: function () { return _this.createDragItem(); },
            dragItemName: this.displayName,
            onDragStarted: function () { return _this.column.setMoving(true, "uiColumnMoved"); },
            onDragStopped: function () { return _this.column.setMoving(false, "uiColumnMoved"); }
        };
        this.dragAndDropService.addDragSource(this.moveDragSource, true);
    };
    HeaderWrapperComp.prototype.createDragItem = function () {
        var visibleState = {};
        visibleState[this.column.getId()] = this.column.isVisible();
        return {
            columns: [this.column],
            visibleState: visibleState
        };
    };
    HeaderWrapperComp.prototype.setupResize = function () {
        var _this = this;
        var colDef = this.getComponentHolder();
        var destroyResizeFuncs = [];
        var canResize;
        var canAutosize;
        var addResize = function () {
            setDisplayed(_this.eResize, canResize);
            if (!canResize) {
                return;
            }
            var finishedWithResizeFunc = _this.horizontalResizeService.addResizeBar({
                eResizeBar: _this.eResize,
                onResizeStart: _this.onResizeStart.bind(_this),
                onResizing: _this.onResizing.bind(_this, false),
                onResizeEnd: _this.onResizing.bind(_this, true)
            });
            destroyResizeFuncs.push(finishedWithResizeFunc);
            if (canAutosize) {
                var skipHeaderOnAutoSize_1 = _this.gridOptionsWrapper.isSkipHeaderOnAutoSize();
                var autoSizeColListener_1 = function () {
                    _this.columnController.autoSizeColumn(_this.column, skipHeaderOnAutoSize_1, "uiColumnResized");
                };
                _this.eResize.addEventListener('dblclick', autoSizeColListener_1);
                var touchListener_1 = new TouchListener(_this.eResize);
                touchListener_1.addEventListener(TouchListener.EVENT_DOUBLE_TAP, autoSizeColListener_1);
                _this.addDestroyFunc(function () {
                    _this.eResize.removeEventListener('dblclick', autoSizeColListener_1);
                    touchListener_1.removeEventListener(TouchListener.EVENT_DOUBLE_TAP, autoSizeColListener_1);
                    touchListener_1.destroy();
                });
            }
        };
        var removeResize = function () {
            destroyResizeFuncs.forEach(function (f) { return f(); });
            destroyResizeFuncs.length = 0;
        };
        var refresh = function () {
            var resize = _this.column.isResizable();
            var autoSize = !_this.gridOptionsWrapper.isSuppressAutoSize() && !colDef.suppressAutoSize;
            var propertyChange = resize !== canResize || autoSize !== canAutosize;
            if (propertyChange) {
                canResize = resize;
                canAutosize = autoSize;
                removeResize();
                addResize();
            }
        };
        refresh();
        this.addDestroyFunc(removeResize);
        this.refreshFunctions.push(refresh);
    };
    HeaderWrapperComp.prototype.onResizing = function (finished, resizeAmount) {
        var resizeAmountNormalised = this.normaliseResizeAmount(resizeAmount);
        var columnWidths = [{ key: this.column, newWidth: this.resizeStartWidth + resizeAmountNormalised }];
        this.columnController.setColumnWidths(columnWidths, this.resizeWithShiftKey, finished, "uiColumnDragged");
        if (finished) {
            removeCssClass(this.getGui(), 'ag-column-resizing');
        }
    };
    HeaderWrapperComp.prototype.onResizeStart = function (shiftKey) {
        this.resizeStartWidth = this.column.getActualWidth();
        this.resizeWithShiftKey = shiftKey;
        addCssClass(this.getGui(), 'ag-column-resizing');
    };
    HeaderWrapperComp.prototype.getTooltipParams = function () {
        var colDef = this.getComponentHolder();
        return {
            location: 'header',
            colDef: colDef,
            column: this.getColumn(),
            value: this.getTooltipText(),
        };
    };
    HeaderWrapperComp.prototype.getTooltipText = function () {
        return this.getComponentHolder().headerTooltip;
    };
    HeaderWrapperComp.prototype.setupTooltip = function () {
        var _this = this;
        var tooltipFeature;
        var tooltipText;
        var usingBrowserTooltips = this.gridOptionsWrapper.isEnableBrowserTooltips();
        var removeTooltip = function () {
            if (usingBrowserTooltips) {
                _this.getGui().removeAttribute('title');
            }
            else {
                if (tooltipFeature) {
                    tooltipFeature = _this.destroyBean(tooltipFeature);
                }
            }
        };
        var addTooltip = function () {
            if (usingBrowserTooltips) {
                _this.getGui().setAttribute('title', tooltipText);
            }
            else {
                tooltipFeature = _this.createBean(new TooltipFeature(_this));
            }
        };
        var refresh = function () {
            var newTooltipText = _this.getTooltipText();
            if (tooltipText != newTooltipText) {
                if (tooltipText) {
                    removeTooltip();
                }
                tooltipText = newTooltipText;
                if (tooltipText) {
                    addTooltip();
                }
            }
        };
        refresh();
        this.addDestroyFunc(removeTooltip);
        this.refreshFunctions.push(refresh);
    };
    HeaderWrapperComp.prototype.setupMovingCss = function () {
        this.addManagedListener(this.column, Column.EVENT_MOVING_CHANGED, this.onColumnMovingChanged.bind(this));
        this.onColumnMovingChanged();
    };
    HeaderWrapperComp.prototype.addAttributes = function () {
        this.getGui().setAttribute("col-id", this.column.getColId());
    };
    HeaderWrapperComp.prototype.setupWidth = function () {
        this.addManagedListener(this.column, Column.EVENT_WIDTH_CHANGED, this.onColumnWidthChanged.bind(this));
        this.onColumnWidthChanged();
    };
    HeaderWrapperComp.prototype.setupMenuClass = function () {
        this.addManagedListener(this.column, Column.EVENT_MENU_VISIBLE_CHANGED, this.onMenuVisible.bind(this));
    };
    HeaderWrapperComp.prototype.onMenuVisible = function () {
        this.addOrRemoveCssClass('ag-column-menu-visible', this.column.isMenuVisible());
    };
    HeaderWrapperComp.prototype.onColumnWidthChanged = function () {
        this.getGui().style.width = this.column.getActualWidth() + 'px';
    };
    // optionally inverts the drag, depending on pinned and RTL
    // note - this method is duplicated in RenderedHeaderGroupCell - should refactor out?
    HeaderWrapperComp.prototype.normaliseResizeAmount = function (dragChange) {
        var result = dragChange;
        if (this.gridOptionsWrapper.isEnableRtl()) {
            // for RTL, dragging left makes the col bigger, except when pinning left
            if (this.pinned !== Constants.PINNED_LEFT) {
                result *= -1;
            }
        }
        else {
            // for LTR (ie normal), dragging left makes the col smaller, except when pinning right
            if (this.pinned === Constants.PINNED_RIGHT) {
                result *= -1;
            }
        }
        return result;
    };
    HeaderWrapperComp.TEMPLATE = "<div class=\"ag-header-cell\" role=\"columnheader\" unselectable=\"on\" tabindex=\"-1\">\n            <div ref=\"eResize\" class=\"ag-header-cell-resize\" role=\"presentation\"></div>\n            <ag-checkbox ref=\"cbSelectAll\" class=\"ag-header-select-all\" role=\"presentation\"></ag-checkbox>\n        </div>";
    __decorate([
        Autowired('gridOptionsWrapper')
    ], HeaderWrapperComp.prototype, "gridOptionsWrapper", void 0);
    __decorate([
        Autowired('dragAndDropService')
    ], HeaderWrapperComp.prototype, "dragAndDropService", void 0);
    __decorate([
        Autowired('columnController')
    ], HeaderWrapperComp.prototype, "columnController", void 0);
    __decorate([
        Autowired('horizontalResizeService')
    ], HeaderWrapperComp.prototype, "horizontalResizeService", void 0);
    __decorate([
        Autowired('menuFactory')
    ], HeaderWrapperComp.prototype, "menuFactory", void 0);
    __decorate([
        Autowired('gridApi')
    ], HeaderWrapperComp.prototype, "gridApi", void 0);
    __decorate([
        Autowired('columnApi')
    ], HeaderWrapperComp.prototype, "columnApi", void 0);
    __decorate([
        Autowired('sortController')
    ], HeaderWrapperComp.prototype, "sortController", void 0);
    __decorate([
        Autowired('userComponentFactory')
    ], HeaderWrapperComp.prototype, "userComponentFactory", void 0);
    __decorate([
        Autowired('columnHoverService')
    ], HeaderWrapperComp.prototype, "columnHoverService", void 0);
    __decorate([
        Autowired('beans')
    ], HeaderWrapperComp.prototype, "beans", void 0);
    __decorate([
        RefSelector('eResize')
    ], HeaderWrapperComp.prototype, "eResize", void 0);
    __decorate([
        RefSelector('cbSelectAll')
    ], HeaderWrapperComp.prototype, "cbSelectAll", void 0);
    __decorate([
        PreDestroy
    ], HeaderWrapperComp.prototype, "destroyHeaderComp", null);
    return HeaderWrapperComp;
}(AbstractHeaderWrapper));
export { HeaderWrapperComp };
