'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var React = require('react');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var React__default = /*#__PURE__*/_interopDefaultLegacy(React);

var ALIGNMENT;

(function (ALIGNMENT) {
  ALIGNMENT["AUTO"] = "auto";
  ALIGNMENT["START"] = "start";
  ALIGNMENT["CENTER"] = "center";
  ALIGNMENT["END"] = "end";
})(ALIGNMENT || (ALIGNMENT = {}));

exports.ScrollDirection = void 0;

(function (DIRECTION) {
  DIRECTION["HORIZONTAL"] = "horizontal";
  DIRECTION["VERTICAL"] = "vertical";
})(exports.ScrollDirection || (exports.ScrollDirection = {}));

var SCROLL_CHANGE_REASON;

(function (SCROLL_CHANGE_REASON) {
  SCROLL_CHANGE_REASON["OBSERVED"] = "observed";
  SCROLL_CHANGE_REASON["REQUESTED"] = "requested";
})(SCROLL_CHANGE_REASON || (SCROLL_CHANGE_REASON = {}));

const scrollProp = {
  [exports.ScrollDirection.VERTICAL]: "scrollTop",
  [exports.ScrollDirection.HORIZONTAL]: "scrollLeft"
};
const sizeProp = {
  [exports.ScrollDirection.VERTICAL]: "height",
  [exports.ScrollDirection.HORIZONTAL]: "width"
};
const positionProp = {
  [exports.ScrollDirection.VERTICAL]: "top",
  [exports.ScrollDirection.HORIZONTAL]: "left"
};
const marginProp = {
  [exports.ScrollDirection.VERTICAL]: "marginTop",
  [exports.ScrollDirection.HORIZONTAL]: "marginLeft"
};
const oppositeMarginProp = {
  [exports.ScrollDirection.VERTICAL]: "marginBottom",
  [exports.ScrollDirection.HORIZONTAL]: "marginRight"
};

/* Forked from react-virtualized 💖 */
class SizeAndPositionManager {
  constructor({
    itemCount,
    itemSizeGetter,
    estimatedItemSize
  }) {
    this.itemSizeGetter = itemSizeGetter;
    this.itemCount = itemCount;
    this.estimatedItemSize = estimatedItemSize; // Cache of size and position data for items, mapped by item index.

    this.itemSizeAndPositionData = {}; // Measurements for items up to this index can be trusted; items afterward should be estimated.

    this.lastMeasuredIndex = -1;
  }

  updateConfig({
    itemCount,
    itemSizeGetter,
    estimatedItemSize
  }) {
    if (itemCount != null) {
      this.itemCount = itemCount;
    }

    if (estimatedItemSize != null) {
      this.estimatedItemSize = estimatedItemSize;
    }

    if (itemSizeGetter != null) {
      this.itemSizeGetter = itemSizeGetter;
    }
  }

  getLastMeasuredIndex() {
    return this.lastMeasuredIndex;
  }
  /**
   * This method returns the size and position for the item at the specified index.
   * It just-in-time calculates (or used cached values) for items leading up to the index.
   */


  getSizeAndPositionForIndex(index) {
    if (index < 0 || index >= this.itemCount) {
      throw Error(`Requested index ${index} is outside of range 0..${this.itemCount}`);
    }

    if (index > this.lastMeasuredIndex) {
      const lastMeasuredSizeAndPosition = this.getSizeAndPositionOfLastMeasuredItem();
      let offset = lastMeasuredSizeAndPosition.offset + lastMeasuredSizeAndPosition.size;

      for (let i = this.lastMeasuredIndex + 1; i <= index; i++) {
        const size = this.itemSizeGetter(i);

        if (size == null || isNaN(size)) {
          throw Error(`Invalid size returned for index ${i} of value ${size}`);
        }

        this.itemSizeAndPositionData[i] = {
          offset,
          size
        };
        offset += size;
      }

      this.lastMeasuredIndex = index;
    }

    return this.itemSizeAndPositionData[index];
  }

  getSizeAndPositionOfLastMeasuredItem() {
    return this.lastMeasuredIndex >= 0 ? this.itemSizeAndPositionData[this.lastMeasuredIndex] : {
      offset: 0,
      size: 0
    };
  }
  /**
   * Total size of all items being measured.
   * This value will be completedly estimated initially.
   * As items as measured the estimate will be updated.
   */


  getTotalSize() {
    const lastMeasuredSizeAndPosition = this.getSizeAndPositionOfLastMeasuredItem();
    return lastMeasuredSizeAndPosition.offset + lastMeasuredSizeAndPosition.size + (this.itemCount - this.lastMeasuredIndex - 1) * this.estimatedItemSize;
  }
  /**
   * Determines a new offset that ensures a certain item is visible, given the alignment.
   *
   * @param align Desired alignment within container; one of "start" (default), "center", or "end"
   * @param containerSize Size (width or height) of the container viewport
   * @return Offset to use to ensure the specified item is visible
   */


  getUpdatedOffsetForIndex({
    align = ALIGNMENT.START,
    containerSize,
    currentOffset,
    targetIndex
  }) {
    if (containerSize <= 0) {
      return 0;
    }

    const datum = this.getSizeAndPositionForIndex(targetIndex);
    const maxOffset = datum.offset;
    const minOffset = maxOffset - containerSize + datum.size;
    let idealOffset;

    switch (align) {
      case ALIGNMENT.END:
        idealOffset = minOffset;
        break;

      case ALIGNMENT.CENTER:
        idealOffset = maxOffset - (containerSize - datum.size) / 2;
        break;

      case ALIGNMENT.START:
        idealOffset = maxOffset;
        break;

      default:
        idealOffset = Math.max(minOffset, Math.min(maxOffset, currentOffset));
    }

    const totalSize = this.getTotalSize();
    return Math.max(0, Math.min(totalSize - containerSize, idealOffset));
  }

  getVisibleRange({
    containerSize,
    offset,
    overscanCount
  }) {
    const totalSize = this.getTotalSize();

    if (totalSize === 0) {
      return {};
    }

    const maxOffset = offset + containerSize;
    let start = this.findNearestItem(offset);

    if (typeof start === 'undefined') {
      throw Error(`Invalid offset ${offset} specified`);
    }

    const datum = this.getSizeAndPositionForIndex(start);
    offset = datum.offset + datum.size;
    let stop = start;

    while (offset < maxOffset && stop < this.itemCount - 1) {
      stop++;
      offset += this.getSizeAndPositionForIndex(stop).size;
    }

    if (overscanCount) {
      start = Math.max(0, start - overscanCount);
      stop = Math.min(stop + overscanCount, this.itemCount - 1);
    }

    return {
      start,
      stop
    };
  }
  /**
   * Clear all cached values for items after the specified index.
   * This method should be called for any item that has changed its size.
   * It will not immediately perform any calculations; they'll be performed the next time getSizeAndPositionForIndex() is called.
   */


  resetItem(index) {
    this.lastMeasuredIndex = Math.min(this.lastMeasuredIndex, index - 1);
  }
  /**
   * Searches for the item (index) nearest the specified offset.
   *
   * If no exact match is found the next lowest item index will be returned.
   * This allows partially visible items (with offsets just before/above the fold) to be visible.
   */


  findNearestItem(offset) {
    if (isNaN(offset)) {
      throw Error(`Invalid offset ${offset} specified`);
    } // Our search algorithms find the nearest match at or below the specified offset.
    // So make sure the offset is at least 0 or no match will be found.


    offset = Math.max(0, offset);
    const lastMeasuredSizeAndPosition = this.getSizeAndPositionOfLastMeasuredItem();
    const lastMeasuredIndex = Math.max(0, this.lastMeasuredIndex);

    if (lastMeasuredSizeAndPosition.offset >= offset) {
      // If we've already measured items within this range just use a binary search as it's faster.
      return this.binarySearch({
        high: lastMeasuredIndex,
        low: 0,
        offset
      });
    } else {
      // If we haven't yet measured this high, fallback to an exponential search with an inner binary search.
      // The exponential search avoids pre-computing sizes for the full set of items as a binary search would.
      // The overall complexity for this approach is O(log n).
      return this.exponentialSearch({
        index: lastMeasuredIndex,
        offset
      });
    }
  }

  binarySearch({
    low,
    high,
    offset
  }) {
    let middle = 0;
    let currentOffset = 0;

    while (low <= high) {
      middle = low + Math.floor((high - low) / 2);
      currentOffset = this.getSizeAndPositionForIndex(middle).offset;

      if (currentOffset === offset) {
        return middle;
      } else if (currentOffset < offset) {
        low = middle + 1;
      } else if (currentOffset > offset) {
        high = middle - 1;
      }
    }

    if (low > 0) {
      return low - 1;
    }

    return 0;
  }

  exponentialSearch({
    index,
    offset
  }) {
    let interval = 1;

    while (index < this.itemCount && this.getSizeAndPositionForIndex(index).offset < offset) {
      index += interval;
      interval *= 2;
    }

    return this.binarySearch({
      high: Math.min(index, this.itemCount - 1),
      low: Math.floor(index / 2),
      offset
    });
  }

}

const STYLE_WRAPPER = {
  overflow: "auto",
  willChange: "transform",
  WebkitOverflowScrolling: "touch"
};
const STYLE_INNER = {
  position: "relative",
  width: "100%",
  minHeight: "100%"
};
const STYLE_ITEM = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%"
};
const STYLE_STICKY_ITEM = { ...STYLE_ITEM,
  position: "sticky"
};
function VirtualList(props) {
  const {
    estimatedItemSize,
    height,
    itemCount,
    itemSize,
    onScroll,
    onItemsRendered,
    overscanCount = 3,
    renderItem,
    scrollOffset,
    scrollToIndex,
    scrollToAlignment,
    scrollDirection = exports.ScrollDirection.VERTICAL,
    stickyIndices,
    style,
    width = "100%",
    ...rest
  } = props;
  const [sizeAndPositionManager] = React.useState(() => new SizeAndPositionManager({
    itemCount,
    itemSizeGetter: itemSizeGetter(itemSize),
    estimatedItemSize: getEstimatedItemSize()
  }));
  const [offset, setOffset] = React.useState(scrollOffset || scrollToIndex != null && getOffsetForIndex(scrollToIndex) || 0);
  const [scrollChangeReason, setScrollChangeReason] = React.useState(SCROLL_CHANGE_REASON.REQUESTED);
  const [currentItem, setCurrentItem] = React.useState({
    scrollToIndex,
    scrollToAlignment,
    itemCount,
    itemSize,
    estimatedItemSize
  });

  function itemSizeGetter(itemSize) {
    return index => getSize(index, itemSize);
  }

  const rootRef = React.useRef(null);
  let styleCache = {};
  React.useEffect(() => {
    rootRef.current?.addEventListener("scroll", handleScroll, {
      passive: true
    });

    if (scrollOffset != null) {
      scrollTo(scrollOffset);
    } else if (scrollToIndex != null) {
      scrollTo(getOffsetForIndex(scrollToIndex));
    }

    return () => rootRef.current?.removeEventListener("scroll", handleScroll);
  }, []);
  React.useEffect(() => {
    const scrollPropsHaveChanged = scrollToIndex !== currentItem.scrollToIndex || scrollToAlignment !== currentItem.scrollToAlignment;
    const itemPropsHaveChanged = itemCount !== currentItem.itemCount || itemSize !== currentItem.itemSize || estimatedItemSize !== currentItem.estimatedItemSize;
    const item = {
      estimatedItemSize,
      itemCount,
      itemSize,
      scrollOffset,
      scrollToAlignment,
      scrollToIndex
    };

    if (itemSize !== currentItem.itemSize) {
      sizeAndPositionManager.updateConfig({
        itemSizeGetter: itemSizeGetter(itemSize)
      });
    }

    if (itemCount !== currentItem.itemCount || estimatedItemSize !== estimatedItemSize) {
      sizeAndPositionManager.updateConfig({
        itemCount,
        estimatedItemSize: getEstimatedItemSize(item)
      });
    }

    if (itemPropsHaveChanged) {
      recomputeSizes();
    }

    if (scrollOffset !== currentItem.scrollOffset) {
      setOffset(scrollOffset || 0);
      setScrollChangeReason(SCROLL_CHANGE_REASON.REQUESTED);
    } else if (typeof scrollToIndex === "number" && (scrollPropsHaveChanged || itemPropsHaveChanged)) {
      setOffset(getOffsetForIndex(scrollToIndex, scrollToAlignment, itemCount));
      setScrollChangeReason(SCROLL_CHANGE_REASON.REQUESTED);
    }

    setCurrentItem(item);
  }, [estimatedItemSize, itemCount, itemSize, scrollOffset, scrollToAlignment, scrollToIndex]);
  React.useEffect(() => {
    if (scrollChangeReason === SCROLL_CHANGE_REASON.REQUESTED) {
      scrollTo(offset);
    }
  }, [offset]);

  function getEstimatedItemSize(item) {
    if (!item) {
      item = props;
    }

    return item.estimatedItemSize || typeof item.itemSize === "number" && item.itemSize || 50;
  }

  function getOffsetForIndex(index, newScrollToAlignment = scrollToAlignment, newItemCount = itemCount) {
    const {
      scrollDirection = exports.ScrollDirection.VERTICAL
    } = props;

    if (index < 0 || index >= newItemCount) {
      index = 0;
    }

    return sizeAndPositionManager.getUpdatedOffsetForIndex({
      align: newScrollToAlignment,
      containerSize: props[sizeProp[scrollDirection]],
      currentOffset: offset || 0,
      targetIndex: index
    });
  }

  function recomputeSizes(startIndex = 0) {
    styleCache = {};
    sizeAndPositionManager.resetItem(startIndex);
  }

  function scrollTo(value) {
    const {
      scrollDirection = exports.ScrollDirection.VERTICAL
    } = props;
    if (!rootRef.current) return;
    rootRef.current[scrollProp[scrollDirection]] = value;
  }

  const {
    start,
    stop
  } = sizeAndPositionManager.getVisibleRange({
    containerSize: props[sizeProp[scrollDirection]] || 0,
    offset,
    overscanCount
  }); // const items: React.ReactNode[] = [];

  const [items, setItems] = React.useState([]);
  const wrapperStyle = { ...STYLE_WRAPPER,
    ...style,
    height,
    width
  };
  const innerStyle = { ...STYLE_INNER,
    [sizeProp[scrollDirection]]: sizeAndPositionManager.getTotalSize()
  };
  React.useEffect(() => {
    const tempItems = [];

    if (stickyIndices != null && stickyIndices.length !== 0) {
      stickyIndices.forEach(index => tempItems.push(renderItem({
        index,
        style: getStyle(index, true)
      })));

      if (scrollDirection === exports.ScrollDirection.HORIZONTAL) {
        innerStyle.display = "flex";
      }
    }

    if (typeof start !== "undefined" && typeof stop !== "undefined") {
      for (let index = start; index <= stop; index++) {
        if (stickyIndices != null && stickyIndices.includes(index)) {
          continue;
        }

        tempItems.push(renderItem({
          index,
          style: getStyle(index, false)
        }));
      }

      if (typeof onItemsRendered === "function") {
        onItemsRendered({
          startIndex: start,
          stopIndex: stop
        });
      }
    }

    setItems(tempItems);
  }, [stickyIndices, scrollDirection, renderItem, start, stop, onItemsRendered]);

  function handleScroll(event) {
    const newOffset = getNodeOffset();

    if (newOffset < 0 || offset === newOffset || event.target !== rootRef.current) {
      return;
    }

    setOffset(newOffset);
    setScrollChangeReason(SCROLL_CHANGE_REASON.OBSERVED);

    if (typeof onScroll === "function") {
      onScroll(newOffset, event);
    }
  }

  function getNodeOffset() {
    const {
      scrollDirection = exports.ScrollDirection.VERTICAL
    } = props;
    return rootRef.current?.[scrollProp[scrollDirection]];
  }

  function getSize(index, itemSize) {
    if (typeof itemSize === "function") {
      return itemSize(index);
    }

    return Array.isArray(itemSize) ? itemSize[index] : itemSize;
  }

  function getStyle(index, sticky) {
    const style = styleCache[index];

    if (style) {
      return style;
    }

    const {
      scrollDirection = exports.ScrollDirection.VERTICAL
    } = props;
    const {
      size,
      offset
    } = sizeAndPositionManager.getSizeAndPositionForIndex(index);
    return styleCache[index] = sticky ? { ...STYLE_STICKY_ITEM,
      [sizeProp[scrollDirection]]: size,
      [marginProp[scrollDirection]]: offset,
      [oppositeMarginProp[scrollDirection]]: -(offset + size),
      zIndex: 1
    } : { ...STYLE_ITEM,
      [sizeProp[scrollDirection]]: size,
      [positionProp[scrollDirection]]: offset
    };
  }

  return React__default["default"].createElement("div", {
    ref: rootRef,
    ...rest,
    style: wrapperStyle
  }, React__default["default"].createElement("div", {
    style: innerStyle,
    "data-testid": "container"
  }, items));
}

exports["default"] = VirtualList;
