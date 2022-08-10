import * as React from "react";
import { render } from "react-dom";
import { render as testingLibRender, waitFor } from "@testing-library/react";
import VirtualList from "../src";
import "@testing-library/jest-dom";

const HEIGHT = 100;
const ITEM_HEIGHT = 10;

interface ItemAttributes {
  index: number;
  style: React.CSSProperties;
  className?: string;
}

describe("VirtualList", () => {
  let node: HTMLDivElement;
  function renderItem({ index, style, ...props }: ItemAttributes) {
    return (
      <div className="item" key={index} style={style} {...props}>
        Item #{index}
      </div>
    );
  }
  function getComponent(props = {}) {
    return (
      <VirtualList
        height={HEIGHT}
        overscanCount={0}
        itemSize={ITEM_HEIGHT}
        itemCount={500}
        renderItem={renderItem}
        {...props}
      />
    );
  }

  beforeEach(() => {
    node = document.createElement("div");
  });

  describe("number of rendered children", () => {
    it("renders enough children to fill the view", async () => {
      render(getComponent(), node);
      await waitFor(() => {
        expect(node.querySelectorAll(".item")).toHaveLength(
          HEIGHT / ITEM_HEIGHT
        );
      });
    });

    it("does not render more children than available if the list is not filled", async () => {
      render(getComponent({ itemCount: 5 }), node);

      await waitFor(() => {
        expect(node.querySelectorAll(".item")).toHaveLength(5);
      });
    });

    it("handles dynamically updating the number of items", async () => {
      const { getByTestId, rerender } = testingLibRender(
        getComponent({ itemCount: 0 })
      );
      for (var itemCount = 0; itemCount < 5; itemCount++) {
        rerender(getComponent({ itemCount }));
        await waitFor(() => {
          expect(getByTestId("container").childElementCount).toBe(itemCount);
        });
      }
    });

    describe("stickyIndices", () => {
      const stickyIndices = [0, 10, 20, 30, 50];

      function itemRenderer({ index, style }) {
        return renderItem({
          index,
          style,
          className: stickyIndices.includes(index) ? "item sticky" : "item",
        });
      }

      it("renders all sticky indices when scrollTop is zero", async () => {
        render(
          getComponent({
            itemCount: 100,
            stickyIndices,
            renderItem: itemRenderer,
          }),
          node
        );
        await waitFor(() => {
          expect(node.querySelectorAll(".sticky")).toHaveLength(
            stickyIndices.length
          );
        });
      });

      it("keeps sticky indices rendered when scrolling", async () => {
        render(
          getComponent({
            itemCount: 100,
            stickyIndices,
            renderItem: itemRenderer,
            scrollOffset: 500,
          }),
          node
        );

        await waitFor(() => {
          expect(node.querySelectorAll(".sticky")).toHaveLength(
            stickyIndices.length
          );
        });
      });
    });
  });

  /** Test scrolling via initial props */
  describe("scrollToIndex", () => {
    it("scrolls to the top", async () => {
      render(getComponent({ scrollToIndex: 0 }), node);

      await waitFor(() => {
        expect(node.textContent).toContain("Item #0");
      });
    });

    it("scrolls down to the middle", async () => {
      render(getComponent({ scrollToIndex: 49 }), node);

      await waitFor(() => {
        expect(node.textContent).toContain("Item #49");
      });
    });

    it("scrolls to the bottom", async () => {
      render(getComponent({ scrollToIndex: 99 }), node);

      await waitFor(() => {
        expect(node.textContent).toContain("Item #99");
      });
    });

    it('scrolls to the correct position for :scrollToAlignment "start"', async () => {
      render(
        getComponent({
          scrollToAlignment: "start",
          scrollToIndex: 49,
        }),
        node
      );

      // 100 items * 10 item height = 1,000 total item height; 10 items can be visible at a time.
      await waitFor(() => {
        expect(node.textContent).toContain("Item #49");
        expect(node.textContent).toContain("Item #58");
      });
    });

    it('scrolls to the correct position for :scrollToAlignment "end"', () => {
      const { getByText, rerender } = testingLibRender(
        getComponent({
          scrollToIndex: 99,
        })
      );
      rerender(
        getComponent({
          scrollToAlignment: "end",
          scrollToIndex: 49,
        })
      );

      // 100 items * 10 item height = 1,000 total item height; 10 items can be visible at a time.
      expect(getByText("Item #40")).toBeInTheDocument();
      expect(getByText("Item #49")).toBeInTheDocument();
    });

    it('scrolls to the correct position for :scrollToAlignment "center"', () => {
      const { getByText, rerender } = testingLibRender(
        getComponent({
          scrollToIndex: 99,
        })
      );
      rerender(
        getComponent({
          scrollToAlignment: "center",
          scrollToIndex: 49,
        })
      );

      // 100 items * 10 item height = 1,000 total item height; 11 items can be visible at a time (the first and last item are only partially visible)
      expect(getByText("Item #44")).toBeInTheDocument();
      expect(getByText("Item #54")).toBeInTheDocument();
    });
  });

  describe("property updates", () => {
    it("updates :scrollToIndex position when :itemSize changes", async () => {
      render(getComponent({ scrollToIndex: 50 }), node);
      await waitFor(() => {
        expect(node.textContent).toContain("Item #50");
      });

      // Making rows taller pushes name off/beyond the scrolled area
      render(getComponent({ scrollToIndex: 50, itemSize: 20 }), node);
      await waitFor(() => {
        expect(node.textContent).toContain("Item #50");
      });
    });

    it("updates :scrollToIndex position when :height changes", async () => {
      render(getComponent({ scrollToIndex: 50 }), node);
      await waitFor(() => {
        expect(node.textContent).toContain("Item #50");
      });

      // Making the list shorter leaves only room for 1 item
      render(getComponent({ scrollToIndex: 50, height: 20 }), node);
      await waitFor(() => {
        expect(node.textContent).toContain("Item #50");
      });
    });

    it("updates :scrollToIndex position when :scrollToIndex changes", async () => {
      const { queryByText, rerender } = testingLibRender(getComponent());

      expect(queryByText("Item #50")).not.toBeInTheDocument();

      rerender(getComponent({ scrollToIndex: 50 }));
      expect(queryByText("Item #50")).toBeInTheDocument();
    });

    it("updates scroll position if size shrinks smaller than the current scroll", () => {
      render(getComponent({ scrollToIndex: 500 }), node);
      render(getComponent({ scrollToIndex: 500, itemCount: 10 }), node);

      expect(node.textContent).toContain("Item #9");
    });
  });

  describe(":scrollOffset property", () => {
    it("renders correctly when an initial :scrollOffset property is specified", async () => {
      const { getByTestId } = testingLibRender(
        getComponent({
          scrollOffset: 100,
        })
      );
      let items = getByTestId("container").children;
      let first = items[0];
      let last = items[items.length - 1];

      await waitFor(() => {
        expect(first.textContent).toContain("Item #10");
        expect(last.textContent).toContain("Item #19");
      });
    });

    it("renders correctly when an :scrollOffset property is specified after the component has initialized", () => {
      const { getByTestId, rerender } = testingLibRender(getComponent());
      let items = getByTestId("container").children;
      let first = items[0];
      let last = items[items.length - 1];

      expect(first).toHaveTextContent("Item #0");
      expect(last).toHaveTextContent("Item #9");

      rerender(getComponent({ scrollOffset: 100 }));
      items = getByTestId("container").children;
      first = items[0];
      last = items[items.length - 1];

      expect(first).toHaveTextContent("Item #10");
      expect(last).toHaveTextContent("Item #19");
    });
  });
});
