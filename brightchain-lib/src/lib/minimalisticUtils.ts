// https://raw.githubusercontent.com/indutny/minimalistic-crypto-utils/master/lib/utils.js
'use strict';

export function toArray(
  msg: string | Array<number>,
  enc?: 'hex' | 'utf8' | number
): Array<number> {
  if (Array.isArray(msg)) return msg.slice();
  if (!msg) return [];
  const res = [];
  if (typeof msg !== 'string') {
    const mArray = msg as Array<number>;
    for (let i = 0; i < mArray.length; i++) res[i] = msg[i] | 0;
    return res;
  }
  if (enc && enc === 'hex') {
    msg = msg.replace(/[^a-z0-9]+/gi, '');
    if (msg.length % 2 !== 0) msg = '0' + msg;
    for (let i = 0; i < msg.length; i += 2)
      res.push(parseInt(msg[i] + msg[i + 1], 16));
  } else {
    for (let i = 0; i < msg.length; i++) {
      const c = msg.charCodeAt(i);
      const hi = c >> 8;
      const lo = c & 0xff;
      if (hi) res.push(hi, lo);
      else res.push(lo);
    }
  }
  return res;
}

export function zero2(word: string | Array<number>): string | Array<number> {
  if (word.length === 1) return '0' + word;
  else return word;
}

export function toHex(msg: string | Array<number>): string {
  let res = '';
  for (let i = 0; i < msg.length; i++) {
    if (typeof msg[i] === 'string') {
      res += zero2(msg[i].toString(16));
    } else {
      const mArray = msg as number[];
      res += zero2(mArray[i].toString(16));
    }
  }
  return res;
}

export function encode(
  arr: Array<number>,
  enc?: 'hex'
): string | Array<number> {
  if (enc && enc === 'hex') return toHex(arr);
  else return arr;
}
