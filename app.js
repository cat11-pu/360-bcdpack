// app.js：渲染结果（十八个键，bytes/buffer/joined 打头，full_diff 收尾）
import { step, close } from "./bcdrun.js";

export function render(spec) {
  const input = spec || {};
  const events = input.events || [];
  const half = Math.ceil(events.length / 2);
  const first = step(input);
  const closed = close(Object.assign({}, input, { state: first.state }));
  const r1 = step(Object.assign({}, input, { events: events.slice(0, half) }));
  const r2 = step(Object.assign({}, input, { state: r1.state, events: events.slice(half) }));
  const closedTwo = close(Object.assign({}, input, { state: r2.state }));
  const replay = step(Object.assign({}, input, { state: closed.state }));
  const wide = step(Object.assign({}, input, { budget: input.budget + 2 }));
  const full = step(Object.assign({}, input, { events: events, budget: events.length + 2 }));
  const fullClosed = close(Object.assign({}, input, { state: full.state }));
  const fingerprint = function (state) {
    return JSON.stringify({
      bytes: state.bytes, buffer: state.buffer,
      ledger: state.ledger, applied: state.applied.length
    });
  };
  return { bytes: closed.state.bytes.slice(),
           buffer: closed.state.buffer,
           joined: closed.state.bytes.join(""),
           count: closed.state.bytes.length,
           served_first: first.served, served_wide: wide.served,
           pair_differs: first.served !== wide.served,
           ledger_before: first.ledger_before, ledger: first.ledger,
           catchup: closed.catchup, ledger_after: closed.state.ledger.length,
           mid_differs: fingerprint(r2.state) !== fingerprint(first.state),
           closed_equal: fingerprint(closedTwo.state) === fingerprint(closed.state),
           replay_new: replay.served, judged: first.judged, judged_bound: first.judged_bound,
           count_events: events.length,
           full_diff: fingerprint(closed.state) === fingerprint(fullClosed.state) ? 0 : 1 };
}
