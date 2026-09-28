// bcdrun.js：按处理预算处理并留账
import { pairOf, leftOf } from "./bcd.js";

function error(spec, name, fallback) {
  const code = (spec && spec[name]) || fallback;
  return Object.assign(new Error(code), { code });
}

function entryOf(event) {
  const entry = [event.kind, event.kind === "feed" ? String(event.text) : ""];
  // 数组的非下标属性不会进 JSON，账上仍是干净的 [kind, text] 二元组；
  // 它给 close 之后的重放识别留一个事件凭据。
  if (event.id !== undefined) entry.id = event.id;
  return entry;
}

function identityOf(event) {
  return event.id !== undefined ? "id:" + event.id
    : event.kind + ":" + (event.kind === "feed" ? String(event.text) : "");
}

function cloneState(state) {
  const source = state || {};
  return {
    bytes: Array.isArray(source.bytes) ? source.bytes.slice() : [],
    buffer: source.buffer != null ? String(source.buffer) : "",
    ledger: Array.isArray(source.ledger) ? source.ledger.map((row) => {
      const copy = row.slice();
      if (row.id !== undefined) copy.id = row.id;
      return copy;
    }) : [],
    applied: Array.isArray(source.applied) ? source.applied.slice() : []
  };
}

// 先把整批事件的结构与数字全部校验完，再开始花预算处理。
function validate(spec, events) {
  for (const event of events) {
    if (!event || typeof event !== "object"
        || (event.kind !== "feed" && event.kind !== "pack")) {
      throw error(spec, "event_error_code", "E_BAD_EVENT");
    }
  }
  for (const event of events) {
    if (event.kind === "feed") {
      if (typeof event.text !== "string") {
        throw error(spec, "event_error_code", "E_BAD_EVENT");
      }
      if (!/^[0-9]*$/.test(event.text)) {
        throw error(spec, "bad_digit_code", "E_BAD_DIGIT");
      }
    }
  }
}

export function step(spec) {
  const events = (spec && spec.events) || [];
  validate(spec, events);

  const state = cloneState(spec.state);
  const budget = Math.max(0, Number((spec && spec.budget) || 0));

  let served = 0;
  let spent = 0;
  // 已处理过的同批事件重放时不再花预算：按事件凭据（id，缺失时退回 kind:text）销历史账。
  const history = state.applied.slice();

  for (const event of events) {
    const identity = identityOf(event);
    if (history.includes(identity)) {
      continue;
    }
    if (spent >= budget) {
      state.ledger.push(entryOf(event));
      continue;
    }
    spent += 1;
    served += 1;
    if (event.kind === "feed") {
      state.buffer += event.text;
    } else {
      const pair = pairOf(state.buffer);
      if (pair === "") throw error(spec, "short_code", "E_SHORT");
      state.bytes.push(pair);
      state.buffer = leftOf(state.buffer);
    }
    state.applied.push(identity);
  }

  return {
    state,
    served,
    ledger_before: state.ledger.length,
    ledger: state.ledger.map((row) => row.slice()),
    judged: served,
    judged_bound: events.length
  };
}

export function close(spec) {
  const state = cloneState(spec.state);
  let catchup = 0;

  // 收尾不限预算，把压着的账按顺序做完，结构同样要校验。
  while (state.ledger.length > 0) {
    const entry = state.ledger.shift();
    const event = { id: entry.id, kind: entry[0], text: entry[1] };
    validate(spec, [event]);
    if (entry[0] === "feed") {
      state.buffer += entry[1];
    } else {
      const pair = pairOf(state.buffer);
      if (pair === "") throw error(spec, "short_code", "E_SHORT");
      state.bytes.push(pair);
      state.buffer = leftOf(state.buffer);
    }
    state.applied.push(identityOf(event));
    catchup += 1;
  }

  return { state, catchup };
}
