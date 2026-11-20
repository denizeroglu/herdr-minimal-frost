// A pane's header, for layouts that frame their panes:
//   { "tab": "active", "pane": { "header": { "content": { "mod": "frost-pane-header" } } } }
// Shows the program's icon (the app's program table), the agent's name or
// the terminal's title, the folder, and the agent's status; buttons split, zoom and close
// this pane. Props from the app: { pane, terminal }. Click: focus the pane.

import { View, div, svg, image } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { panes, props, run, theme, home, layout, window, shared, setShared, readTextFile, appHome } from "herdr";

// Minimal Frost, when the join-tabs mod is installed: press this title row (or,
// on a one-pane tab, the grip like Herdr's own) and drag to the tab bar.
// Dropped on a tab, the pane joins it; dropped on empty space in the tab bar,
// a pane from a split tab moves out to a tab of its own. Herdr's own grip on
// split panes still rearranges panes inside the tab. The drag is shared state
// ("frost.drag") the tab bar reads.
// Windows draws text thinner than macOS, so text is one weight step heavier there.
const fw = (n) => window()?.platform === "windows" ? n + 100 : n;

// Match the first visible tab frame, including the active child of a stack.
function paneFrame(node) {
  if (!node || node.hidden) return null;
  if (node.content?.tab && node.content.pane) return node.content.pane;
  let children = node.children ?? [];
  if (node.type === "stack") {
    const visible = children.filter(child => !child.hidden);
    children = [visible.find(child => child.id === node.active) ?? visible[0]];
  }
  for (const child of children) {
    const frame = paneFrame(child);
    if (frame) return frame;
  }
  return null;
}

function icon(p, size, color) {
  if (!p?.icon) return null;
  return p.tint ? svg(p.icon).size(size).flex_none().text_color(color) : image(p.icon).w(size).h(size).flex_none();
}

function folder(cwd) {
  if (!cwd) return "";
  const h = home();
  return cwd === h ? "~" : cwd.startsWith(h + "/") ? "~" + cwd.slice(h.length) : cwd;
}

export default class Pane extends View {
  init(_props, cx) {
    this.hovered = false;
    this.canJoin = false;
    cx.spawn(async (cx) => {
      this.canJoin = Boolean(await readTextFile(`${appHome()}/mods/join-tabs/main.js`).catch(() => null));
      cx.notify();
    });
  }

  grip(t, p) {
    // Drawn like Herdr's own pane grip: a dark 28×20 box, six 2 pt dots 5 pt apart.
    const dots = () => h_flex().gap(3).children([0, 1, 2].map(() => div().size(2).rounded_full().bg("#ffffff73")));
    return div().absolute().top(0).bottom(0).left(0).right(0).flex().items_center().justify_center()
      .child(v_flex().id(`ph-grip-${p.pane}`).w(28).h(20).gap(3).items_center().justify_center().rounded(6).bg("#00000033").cursor_grab()
        .hover((s) => s.bg("#00000047"))
        .tooltip("Drag onto a tab to join it")
        .on_mouse_down("left", (_e, cx) => {
          cx.stop_propagation();
          setShared("frost.drag", { terminal: p.terminal, tab: p.tab, at: Date.now() });
          cx.notify();
        })
        // Let go on the grip itself: it was a click, not a drag.
        .on_mouse_up("left", (_e, cx) => { setShared("frost.drag", null); cx.notify(); })
        .child(dots()).child(dots()));
  }

  me() {
    return panes().find((p) => p.pane === props()?.pane);
  }

  button(t, id, icon, command, args) {
    return div()
      .id(id)
      .p(3)
      .rounded(4)
      .text_color(t.dim)
      .hover((s) => s.bg(t.hover).text_color(t.foreground))
      .on_click((_e, cx) => {
        cx.stop_propagation();
        run(command, args);
      })
      .child(svg(`mods/frost-pane-header/${icon}.svg`).size(14));
  }

  render(cx) {
    const t = theme();
    const p = this.me();
    if (!p) return div();
    const name = ((p.program?.agent || p.program?.shell) && p.program.name) || p.title || p.program?.name || "shell";
    const pic = icon(p.program, 14, t.dim);
    const st = p.status;
    const pane = p.pane;
    const bottom = paneFrame(layout())?.header?.position === "bottom";
    const alone = panes().filter((x) => x.tab === p.tab).length === 1 && !p.zoomed;
    const drag = shared("frost.drag");
    const dragging = drag?.terminal === p.terminal;
    const startDrag = () => setShared("frost.drag", { terminal: p.terminal, tab: p.tab, at: Date.now() });
    return h_flex()
      .id(`pane-head-${pane}`)
      .relative()
      .size_full()
      .px(10)
      .gap(8)
      .items_center()
      .when(bottom, el => el.border_t(1))
      .when(!bottom, el => el.border_b(1))
      .border_color(t.border)
      .text_size(12)
      .on_hover((hovered, cx) => { this.hovered = hovered; cx.notify(); })
      .on_click(() => run("pane.focus", { pane }))
      .when(this.canJoin && Boolean(p.terminal), (el) => el.cursor_grab()
        .on_mouse_down("left", (_e, cx) => { startDrag(); cx.notify(); }))
      // Released on its own title row: a click, not a drag.
      .on_mouse_up("left", (_e, cx) => { if (shared("frost.drag")?.terminal === p.terminal) { setShared("frost.drag", null); cx.notify(); } })
      .when(Boolean(pic), (el) => el.child(pic))
      .child(div().flex_none().truncate().max_w(260).font_weight(fw(500)).text_color(t.foreground).child(name))
      .child(div().flex_1().truncate().text_color(t.dim).child(folder(p.cwd)))
      .when(st === "working", el => el.child(svg("mods/workspace-chrome/spinner.svg").size(12).flex_none().text_color(t.working).spin(900)))
      .when(st === "blocked", el => el.child(div().flex_none().px(6).h(18).flex().items_center().rounded(5).bg(t.blocked + "26").text_size(10.5).font_weight(fw(600)).text_color(t.blocked).child("Needs you")))
      .when(st === "done", el => el.child(div().size(7).flex_none().rounded(4).bg(t.done)))
      .when(this.canJoin && alone && Boolean(p.terminal) && (this.hovered || dragging), (el) => el.child(this.grip(t, p)))
      .when(this.hovered, el => el
        .child(this.button(t, `ph-r-${pane}`, "split-right", "pane.split", { direction: "right", pane }))
        .child(this.button(t, `ph-d-${pane}`, "split-down", "pane.split", { direction: "down", pane }))
        .child(this.button(t, `ph-z-${pane}`, p.zoomed ? "unzoom" : "zoom", "pane.zoom", { pane }))
        .child(this.button(t, `ph-x-${pane}`, "close", "pane.close", { pane })));
  }
}

// Plain text inherits the root weight: Medium on Windows, Regular elsewhere.
const render = Pane.prototype.render;
Pane.prototype.render = function (...args) {
  const el = render.apply(this, args);
  return fw(400) !== 400 && el?.font_weight ? el.font_weight(fw(400)) : el;
};
