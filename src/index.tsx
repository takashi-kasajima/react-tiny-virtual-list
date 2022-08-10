import SizeAndPositionManager, { ItemSize } from "./SizeAndPositionManager";
import {
  ALIGNMENT,
  DIRECTION,
  SCROLL_CHANGE_REASON,
  marginProp,
  oppositeMarginProp,
  positionProp,
  scrollProp,
  sizeProp,
} from "./constants";
import React, { useState, useEffect, useRef, ReactNode } from "react";

export { DIRECTION as ScrollDirection } from "./constants";

export type ItemPosition = "absolute" | "sticky";

export interface ItemStyle {
  position: ItemPosition;
  top?: number;
  left: number;
  width: string | number;
  height?: number;
  marginTop?: number;
  marginLeft?: number;
  marginRight?: number;
  marginBottom?: number;
  zIndex?: number;
}

interface StyleCache {
  [id: number]: ItemStyle;
}

export interface ItemInfo {
  index: number;
  style: ItemStyle;
}

export interface RenderedRows {
  startIndex: number;
  stopIndex: number;
}

export interface Props {
  className?: string;
  estimatedItemSize?: number;
  height: number | string;
  itemCount: number;
  itemSize: ItemSize;
  overscanCount?: number;
  scrollOffset?: number;
  scrollToIndex?: number;
  scrollToAlignment?: ALIGNMENT;
  scrollDirection?: DIRECTION;
  stickyIndices?: number[];
  style?: React.CSSProperties;
  width?: number | string;
  onItemsRendered?({ startIndex, stopIndex }: RenderedRows): void;
  onScroll?(offset: number, event: UIEvent): void;
  renderItem(itemInfo: ItemInfo): React.ReactNode;
}

export interface State {
  offset: number;
  scrollChangeReason: SCROLL_CHANGE_REASON;
}

const STYLE_WRAPPER: React.CSSProperties = {
  overflow: "auto",
  willChange: "transform",
  WebkitOverflowScrolling: "touch",
};

const STYLE_INNER: React.CSSProperties = {
  position: "relative",
  width: "100%",
  minHeight: "100%",
};

const STYLE_ITEM: {
  position: ItemStyle["position"];
  top: ItemStyle["top"];
  left: ItemStyle["left"];
  width: ItemStyle["width"];
} = {
  position: "absolute" as ItemPosition,
  top: 0,
  left: 0,
  width: "100%",
};

const STYLE_STICKY_ITEM = {
  ...STYLE_ITEM,
  position: "sticky" as ItemPosition,
};

export default function VirtualList(props: Props) {
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
    scrollDirection = DIRECTION.VERTICAL,
    stickyIndices,
    style,
    width = "100%",
    ...rest
  } = props;
  const [sizeAndPositionManager] = useState(
    () =>
      new SizeAndPositionManager({
        itemCount,
        itemSizeGetter: itemSizeGetter(itemSize),
        estimatedItemSize: getEstimatedItemSize(),
      })
  );
  const [offset, setOffset] = useState(
    scrollOffset ||
      (scrollToIndex != null && getOffsetForIndex(scrollToIndex)) ||
      0
  );
  const [scrollChangeReason, setScrollChangeReason] = useState(
    SCROLL_CHANGE_REASON.REQUESTED
  );

  const [currentItem, setCurrentItem] = useState<Partial<Props>>({
    scrollToIndex,
    scrollToAlignment,
    itemCount,
    itemSize,
    estimatedItemSize,
  });

  function itemSizeGetter(itemSize: Props["itemSize"]) {
    return (index) => getSize(index, itemSize);
  }

  const rootRef = useRef<HTMLDivElement>(null);

  let styleCache: StyleCache = {};

  useEffect(() => {
    rootRef.current?.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    if (scrollOffset != null) {
      scrollTo(scrollOffset);
    } else if (scrollToIndex != null) {
      scrollTo(getOffsetForIndex(scrollToIndex));
    }
    return () => rootRef.current?.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const scrollPropsHaveChanged =
      scrollToIndex !== currentItem.scrollToIndex ||
      scrollToAlignment !== currentItem.scrollToAlignment;
    const itemPropsHaveChanged =
      itemCount !== currentItem.itemCount ||
      itemSize !== currentItem.itemSize ||
      estimatedItemSize !== currentItem.estimatedItemSize;
    const item = {
      estimatedItemSize,
      itemCount,
      itemSize,
      scrollOffset,
      scrollToAlignment,
      scrollToIndex,
    };

    if (itemSize !== currentItem.itemSize) {
      sizeAndPositionManager.updateConfig({
        itemSizeGetter: itemSizeGetter(itemSize),
      });
    }

    if (
      itemCount !== currentItem.itemCount ||
      estimatedItemSize !== estimatedItemSize
    ) {
      sizeAndPositionManager.updateConfig({
        itemCount,
        estimatedItemSize: getEstimatedItemSize(item),
      });
    }

    if (itemPropsHaveChanged) {
      recomputeSizes();
    }

    if (scrollOffset !== currentItem.scrollOffset) {
      setOffset(scrollOffset || 0);
      setScrollChangeReason(SCROLL_CHANGE_REASON.REQUESTED);
    } else if (
      typeof scrollToIndex === "number" &&
      (scrollPropsHaveChanged || itemPropsHaveChanged)
    ) {
      setOffset(getOffsetForIndex(scrollToIndex, scrollToAlignment, itemCount));
      setScrollChangeReason(SCROLL_CHANGE_REASON.REQUESTED);
    }

    setCurrentItem(item);
  }, [
    estimatedItemSize,
    itemCount,
    itemSize,
    scrollOffset,
    scrollToAlignment,
    scrollToIndex,
  ]);

  useEffect(() => {
    if (scrollChangeReason === SCROLL_CHANGE_REASON.REQUESTED) {
      scrollTo(offset);
    }
  }, [offset]);

  function getEstimatedItemSize(item?) {
    if (!item) {
      item = props;
    }
    return (
      item.estimatedItemSize ||
      (typeof item.itemSize === "number" && item.itemSize) ||
      50
    );
  }

  function getOffsetForIndex(
    index: number,
    newScrollToAlignment = scrollToAlignment,
    newItemCount: number = itemCount
  ): number {
    const { scrollDirection = DIRECTION.VERTICAL } = props;

    if (index < 0 || index >= newItemCount) {
      index = 0;
    }

    return sizeAndPositionManager.getUpdatedOffsetForIndex({
      align: newScrollToAlignment,
      containerSize: props[sizeProp[scrollDirection]],
      currentOffset: offset || 0,
      targetIndex: index,
    });
  }

  function recomputeSizes(startIndex = 0) {
    styleCache = {};
    sizeAndPositionManager.resetItem(startIndex);
  }

  function scrollTo(value: number) {
    const { scrollDirection = DIRECTION.VERTICAL } = props;

    if (!rootRef.current) return;

    rootRef.current[scrollProp[scrollDirection]] = value;
  }

  const { start, stop } = sizeAndPositionManager.getVisibleRange({
    containerSize: props[sizeProp[scrollDirection]] || 0,
    offset,
    overscanCount,
  });

  // const items: React.ReactNode[] = [];
  const [items, setItems] = useState<ReactNode[]>([]);
  const wrapperStyle = { ...STYLE_WRAPPER, ...style, height, width };
  const innerStyle = {
    ...STYLE_INNER,
    [sizeProp[scrollDirection]]: sizeAndPositionManager.getTotalSize(),
  };

  useEffect(() => {
    const tempItems: ReactNode[] = [];
    if (stickyIndices != null && stickyIndices.length !== 0) {
      stickyIndices.forEach((index: number) =>
        tempItems.push(
          renderItem({
            index,
            style: getStyle(index, true),
          })
        )
      );

      if (scrollDirection === DIRECTION.HORIZONTAL) {
        innerStyle.display = "flex";
      }
    }

    if (typeof start !== "undefined" && typeof stop !== "undefined") {
      for (let index = start; index <= stop; index++) {
        if (stickyIndices != null && stickyIndices.includes(index)) {
          continue;
        }

        tempItems.push(
          renderItem({
            index,
            style: getStyle(index, false),
          })
        );
      }

      if (typeof onItemsRendered === "function") {
        onItemsRendered({
          startIndex: start,
          stopIndex: stop,
        });
      }
    }
    setItems(tempItems);
  }, [
    stickyIndices,
    scrollDirection,
    renderItem,
    start,
    stop,
    onItemsRendered,
  ]);

  function handleScroll(event: UIEvent) {
    const newOffset = getNodeOffset();

    if (
      newOffset < 0 ||
      offset === newOffset ||
      event.target !== rootRef.current
    ) {
      return;
    }

    setOffset(newOffset);
    setScrollChangeReason(SCROLL_CHANGE_REASON.OBSERVED);

    if (typeof onScroll === "function") {
      onScroll(newOffset, event);
    }
  }

  function getNodeOffset() {
    const { scrollDirection = DIRECTION.VERTICAL } = props;

    return rootRef.current?.[scrollProp[scrollDirection]];
  }

  function getSize(index: number, itemSize) {
    if (typeof itemSize === "function") {
      return itemSize(index);
    }

    return Array.isArray(itemSize) ? itemSize[index] : itemSize;
  }

  function getStyle(index: number, sticky: boolean) {
    const style = styleCache[index];

    if (style) {
      return style;
    }

    const { scrollDirection = DIRECTION.VERTICAL } = props;
    const { size, offset } =
      sizeAndPositionManager.getSizeAndPositionForIndex(index);

    return (styleCache[index] = sticky
      ? {
          ...STYLE_STICKY_ITEM,
          [sizeProp[scrollDirection]]: size,
          [marginProp[scrollDirection]]: offset,
          [oppositeMarginProp[scrollDirection]]: -(offset + size),
          zIndex: 1,
        }
      : {
          ...STYLE_ITEM,
          [sizeProp[scrollDirection]]: size,
          [positionProp[scrollDirection]]: offset,
        });
  }

  return (
    <div ref={rootRef} {...rest} style={wrapperStyle}>
      <div style={innerStyle} data-testid="container">
        {items}
      </div>
    </div>
  );
}
