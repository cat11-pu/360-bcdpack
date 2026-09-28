// bcd.js：两位数字打包与残留
export function pairOf(buffer) {
  const text = String(buffer == null ? "" : buffer);
  if (text.length < 2 || !/^\d{2}/.test(text)) return "";
  return (Number(text[0]) * 16 + Number(text[1])).toString(16).padStart(2, "0").toUpperCase();
}

export function leftOf(buffer) {
  const text = String(buffer == null ? "" : buffer);
  if (text.length < 2) return text;
  return text.slice(2);
}
