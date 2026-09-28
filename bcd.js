// bcd.js：两位数字打包与残留
export function pairOf(buffer) {
  const text = String(buffer);
  if (text.length < 2) return "";
  const byte = Number(text[0]) * 16 + Number(text[1]);
  return byte.toString(16).padStart(2, "0");
}

export function leftOf(buffer) {
  const text = String(buffer);
  if (text.length < 2) return text;
  return text.slice(2);
}
