// compatibility with/copied from https://github.com/indutny/elliptic/blob/master/lib/elliptic/ec/signature.js

'use strict';

import * as BN from 'bn.js';
import * as minUtils from './minimalisticUtils';
import { StaticHelpersElliptic } from './staticHelpers.elliptic';

export interface ISignature {
  r: BN;
  s: BN;
  recoveryParam?: number | null;
}

/**
 * compatibility with/copied from https://github.com/indutny/elliptic/blob/master/lib/elliptic/ec/signature.js
 * This is basically a direct clone of the original signature class and the _importDER() method has been moved into staticHelpers.elliptic.ts
 * The reason being was that the original ec.Signature class under Typescript was not allowing us to access the constructor or import function
 * whether directly or indirectly. I am not sure if there is a namespace collision between ec the class and ec the namespace. -JM
 * @param r
 * @param s
 * @param recoveryParam
 */
export class Signature implements ISignature {
  public r: BN;
  public s: BN;
  public recoveryParam?: number | null;
  constructor(
    from: string | Signature | ISignature | number[],
    enc?: 'hex' | number
  ) {
    if (from instanceof Signature) {
      this.r = from.r.clone();
      this.s = from.s.clone();
      this.recoveryParam = from.recoveryParam;
    } else if (typeof from === 'string') {
      const fromDer = StaticHelpersElliptic.importDER(from, enc);
      if (fromDer === false) {
        throw new Error('Invalid DER');
      }
      this.r = fromDer.r;
      this.s = fromDer.s;
      this.recoveryParam = fromDer.recoveryParam;
    } else if (Array.isArray(from)) {
      const fromDer = StaticHelpersElliptic.importDER(from, enc);
      if (fromDer === false) {
        throw new Error('Invalid DER');
      }
      this.r = fromDer.r;
      this.s = fromDer.s;
      this.recoveryParam = fromDer.recoveryParam;
    } else if (typeof from === 'object') {
      this.r = new BN(from.r, enc);
      this.s = new BN(from.s, enc);
      if (from.recoveryParam !== undefined)
        this.recoveryParam = from.recoveryParam;
    } else {
      throw new Error('Invalid signature');
    }
  }

  public toDER(enc?: 'hex') {
    let r: number[] = this.r.toArray();
    let s: number[] = this.s.toArray();

    // Pad values
    if (r[0] & 0x80) r = [0].concat(r);
    // Pad values
    if (s[0] & 0x80) s = [0].concat(s);

    r = StaticHelpersElliptic.rmPadding(r) as number[];
    s = StaticHelpersElliptic.rmPadding(s) as number[];

    if (r.length == 1 || s.length == 1) {
      throw new Error('Invalid signature');
    }

    while (!s[0] && !(s[1] & 0x80)) {
      s = s.slice(1);
    }
    let arr = [0x02];
    StaticHelpersElliptic.constructLength(arr, r.length);
    arr = arr.concat(r);
    arr.push(0x02);
    StaticHelpersElliptic.constructLength(arr, s.length);
    const backHalf = arr.concat(s);
    let res = [0x30];
    StaticHelpersElliptic.constructLength(res, backHalf.length);
    res = res.concat(backHalf);
    return minUtils.encode(res, enc);
  }
}
