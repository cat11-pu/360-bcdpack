// bcdrun.js：按处理预算处理并留账，收尾不限预算把账做完
import { pairOf, leftOf } from "./bcd.js";

const DEFAULT_STATE = { bytes: [], buffer: "", ledger: [], applied: [] };

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function cloneState(state) {
  const src = state || DEFAULT_STATE;
  return {
    bytes: Array.isArray(src.bytes) ? src.bytes.slice() : [],
    buffer: src.buffer == null ? "" : String(src.buffer),
    ledger: Array.isArray(src.ledger) ? src.ledger.map(function (row) { return row.slice(); }) : [],
    applied: Array.isArray(src.applied) ? src.applied.slice() : []
  };
}

function budgetOf(spec) {
  const value = Math.trunc(Number(spec.budget));
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

// 结构与数字先校验：结构不合法 E_BAD_EVENT，带非数字字符 E_BAD_DIGIT
function inspect(event, spec) {
  const badEvent = spec.event_error_code || "E_BAD_EVENT";
  const badDigit = spec.bad_digit_code || "E_BAD_DIGIT";
  if (event == null || typeof event !== "object" || Array.isArray(event)) {
    throw fail(badEvent, "事件不是对象");
  }
  if (event.kind === "feed") {
    if (typeof event.text !== "string") throw fail(badEvent, "feed 缺少 text");
    if (!/^[0-9]*$/.test(event.text)) throw fail(badDigit, "数据块含非数字字符");
    return true;
  }
  if (event.kind === "pack") {
    if ("text" in event && event.text !== undefined) throw fail(badEvent, "pack 不带参数");
    return false;
  }
  throw fail(badEvent, "未知事件类型");
}

function applyEvent(event, isFeed, state, spec) {
  if (isFeed) {
    state.buffer = state.buffer + event.text;
    return;
  }
  const pair = pairOf(state.buffer);
  if (pair === "") {
    throw fail(spec.short_code || "E_SHORT", "缓冲不足两位");
  }
  state.bytes.push(pair);
  state.buffer = leftOf(state.buffer);
}

export function step(spec) {
  const input = spec || {};
  const events = Array.isArray(input.events) ? input.events : [];
  const state = cloneState(input.state);
  let budget = budgetOf(input);
  let served = 0;
  let judged = 0;
  const before = state.ledger.length;

  for (const event of events) {
    const isFeed = inspect(event, input);
    const marker = event == null ? null : event.id;
    if (marker != null && state.applied.indexOf(marker) !== -1) {
      continue;
    }
    judged += 1;
    if (budget > 0) {
      budget -= 1;
      applyEvent(event, isFeed, state, input);
      served += 1;
      if (marker != null) state.applied.push(marker);
    } else {
      // 预算用尽：没处理的连着载压账
      state.ledger.push(isFeed ? ["feed", event.text] : ["pack", ""]);
      if (marker != null) state.applied.push(marker);
    }
  }

  return {
    state: state,
    served: served,
    ledger_before: state.ledger.length,
    ledger: state.ledger,
    judged: judged,
    judged_bound: events.length
  };
}

// 收尾：不限预算把账做完，返回补齐条数
export function close(spec) {
  const input = spec || {};
  const state = cloneState(input.state);
  let catchup = 0;

  while (state.ledger.length > 0) {
    const row = state.ledger.shift();
    const isFeed = row[0] === "feed";
    const event = isFeed ? { kind: "feed", text: row[1] } : { kind: "pack" };
    applyEvent(event, isFeed, state, input);
    catchup += 1;
  }

  return { state: state, catchup: catchup };
}
