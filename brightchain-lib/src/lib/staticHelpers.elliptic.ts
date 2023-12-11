// compatibility with/copied from https://github.com/indutny/elliptic/blob/master/lib/elliptic/ec/signature.js

import { ec as EC } from 'elliptic';
import { Position } from './interfaces/position';
import { ISignature, Signature } from './signature';
import * as minUtils from './minimalisticUtils';
import BN = require('bn.js');
import { StaticHelpersKeyPair } from './staticHelpers.keypair';

export abstract class StaticHelpersElliptic {
  /**
   * Appears to conver a number to an array of its bytes
   * @param arr
   * @param len
   * @returns
   */
  public static constructLength(arr: number[], len: number) {
    if (len < 0x80) {
      arr.push(len);
      return;
    }
    let octets = 1 + ((Math.log(len) / Math.LN2) >>> 3);
    arr.push(octets | 0x80);
    while (--octets) {
      arr.push((len >>> (octets << 3)) & 0xff);
    }
    arr.push(len);
  }

  public static getLength(buf: number[], p: Position) {
    const initial = buf[p.place++];
    if (!(initial & 0x80)) {
      return initial;
    }
    const octetLen = initial & 0xf;

    // Indefinite length or overflow
    if (octetLen === 0 || octetLen > 4) {
      return false;
    }

    let val = 0;
    let off = p.place;
    for (let i = 0; i < octetLen; i++, off++) {
      val <<= 8;
      val |= buf[off];
      val >>>= 0;
    }

    // Leading zeroes
    if (val <= 0x7f) {
      return false;
    }

    p.place = off;
    return val;
  }

  public static rmPadding(buf: string | number[]): string | number[] {
    if (typeof buf === 'string') {
      let i = 0;
      const len = buf.length - 1;
      while (!buf[i] && !(buf[i + 1].charCodeAt(0) & 0x80) && i < len) {
        i++;
      }
      if (i === 0) {
        return buf;
      }
      return buf.slice(i);
    } else {
      let i = 0;
      const len = buf.length - 1;
      while (!buf[i] && !(buf[i + 1] & 0x80) && i < len) {
        i++;
      }
      if (i === 0) {
        return buf;
      }
      return buf.slice(i);
    }
  }

  public static importDER(
    data: string | number[],
    enc?: 'hex' | number
  ): ISignature | false {
    data = minUtils.toArray(data, enc);
    const p: Position = { place: 0 };
    if (data[p.place++] !== 0x30) {
      return false;
    }
    const len = StaticHelpersElliptic.getLength(data, p);
    if (len === false) {
      return false;
    }
    if (len + p.place !== data.length) {
      return false;
    }
    if (data[p.place++] !== 0x02) {
      return false;
    }
    const rlen = StaticHelpersElliptic.getLength(data, p);
    if (rlen === false) {
      return false;
    }
    let r = data.slice(p.place, rlen + p.place);
    p.place += rlen;
    if (data[p.place++] !== 0x02) {
      return false;
    }
    const slen = StaticHelpersElliptic.getLength(data, p);
    if (slen === false) {
      return false;
    }
    if (data.length !== slen + p.place) {
      return false;
    }
    let s = data.slice(p.place, slen + p.place);
    if (r[0] === 0) {
      if (r[1] & 0x80) {
        r = r.slice(1);
      } else {
        // Leading zeroes
        return false;
      }
    }
    if (s[0] === 0) {
      if (s[1] & 0x80) {
        s = s.slice(1);
      } else {
        // Leading zeroes
        return false;
      }
    }

    return {
      r: new BN(r),
      s: new BN(s),
      recoveryParam: null,
    };
  }

  public static verifySignature(
    data: Buffer,
    signature: EC.Signature,
    publicKey: Buffer
  ): boolean {
    const ec = new EC(StaticHelpersKeyPair.DefaultECMode);
    const pubKey = ec.keyFromPublic(publicKey.toString('hex'), 'hex');
    return pubKey.verify(data, signature.toDER('hex'));
  }

  public static ourECfromEC(sig: EC.Signature): Signature {
    return new Signature({
      r: sig.r,
      s: sig.s,
      recoveryParam: sig.recoveryParam,
    });
  }

  public static ECfromOurEC(sig: Signature): EC.Signature {
    const iSig: ISignature = {
      r: sig.r,
      s: sig.s,
      recoveryParam: sig.recoveryParam,
    };
    return iSig as EC.Signature;
  }
}
