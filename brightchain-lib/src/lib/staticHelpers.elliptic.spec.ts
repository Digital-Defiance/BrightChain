import BN = require('bn.js');
import { randomBytes } from 'crypto';
import { ec } from 'elliptic';
import { Signature } from './signature';
import { StaticHelpersElliptic } from './staticHelpers.elliptic';
import { StaticHelpersKeyPair } from './staticHelpers.keypair';

describe('brightchain staticHelpers.elliptic', () => {
  it('should convert between EC classes', () => {
    const data = Buffer.from('hello world');
    const keyPair = StaticHelpersKeyPair.generateSigningKeyPair();
    const signature: ec.Signature = StaticHelpersKeyPair.signWithSigningKey(
      keyPair.keyPair,
      data
    );
    const ourSignature: Signature =
      StaticHelpersElliptic.ourECfromEC(signature);
    const theirSignature: ec.Signature =
      StaticHelpersElliptic.ECfromOurEC(ourSignature);
    expect(theirSignature.r.toString()).toBe(signature.r.toString());
    expect(theirSignature.s.toString()).toBe(signature.s.toString());
    expect(theirSignature.recoveryParam).toBe(signature.recoveryParam);
  });
  it('should test constructLength', () => {
    let arr = [0x02];
    const r: number[] = new BN(0x7f).toArray();
    const s: number[] = new BN(0x7f).toArray();
    StaticHelpersElliptic.constructLength(arr, r.length);
    arr = arr.concat(r);
    arr.push(0x02);
    StaticHelpersElliptic.constructLength(arr, s.length);
    const backHalf = arr.concat(s);
    let res = [0x30];
    StaticHelpersElliptic.constructLength(res, backHalf.length);
    res = res.concat(backHalf);
    expect(res).toEqual([0x30, 0x06, 0x02, 0x01, 0x7f, 0x02, 0x01, 0x7f]);
  });
  it('should test constructLength when length > 128', () => {
    let arr = [0x02];
    // need to construct a BN with an array length > 128
    const rBuf = randomBytes(129);
    const sBuf = randomBytes(129);
    const r: number[] = new BN(rBuf).toArray();
    const s: number[] = new BN(sBuf).toArray();
    StaticHelpersElliptic.constructLength(arr, r.length);
    arr = arr.concat(r);
    arr.push(0x02);
    StaticHelpersElliptic.constructLength(arr, s.length);
    const backHalf = arr.concat(s);
    let res = [0x30];
    StaticHelpersElliptic.constructLength(res, backHalf.length);
    res = res.concat(backHalf);
    expect(res.length).toBe(268); // (129 + 5 + 1) * 2 ?
  });
  it('should test getLength', () => {
    const data = [129, 0x06, 0x02, 0x01, 0x7f, 0x02, 0x01, 0x7f];
    const p = { place: 0 };
    const rlen = StaticHelpersElliptic.getLength(data, p);
    expect(rlen).toBe(false);
    expect(p.place).toBe(1);
    p.place++;
    const slen = StaticHelpersElliptic.getLength(data, p);
    expect(slen).toBe(2);
    expect(p.place).toBe(3);
  });
  it('should test getLength', () => {
    const data = [0x30, 0x06, 0x02, 0x01, 0x7f, 0x02, 0x01, 0x7f];
    const p = { place: 0 };
    const rlen = StaticHelpersElliptic.getLength(data, p);
    expect(rlen).toBe(48);
    expect(p.place).toBe(1);
  });
  it('should test getLength', () => {
    const data = [0x85, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
    const p = { place: 0 };
    const rlen = StaticHelpersElliptic.getLength(data, p);
    expect(rlen).toBe(false);
    expect(p.place).toBe(1);
  });
  it('should test getLength', () => {
    const data = [0x84, 0x7f, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01];
    const p = { place: 0 };
    const rlen = StaticHelpersElliptic.getLength(data, p);
    expect(rlen).toBe(2130772225);
    expect(p.place).toBe(5);
  });
  it('should test rmPadding', () => {
    const data = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
    const res = StaticHelpersElliptic.rmPadding(data);
    expect(res).toEqual([0x00]);
  });
  it('should test rmPadding as string', () => {
    const data = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
    const dataString = data.map((x) => String.fromCharCode(x)).join('');
    const res = StaticHelpersElliptic.rmPadding(dataString);
    expect(res).toEqual(dataString);
  });
  it('should test rmPadding as string', () => {
    const data = [0x00, 0x01, 0x81].map((c) => String.fromCharCode(c)).join('');
    const res = StaticHelpersElliptic.rmPadding(data);
    expect(res).toEqual(data);
  });
  it('should test rmPadding with no data', () => {
    const data: number[] = [];
    const res = StaticHelpersElliptic.rmPadding(data);
    expect(res).toEqual(data);
  });
  it('should throw an error when an empty string is given to rmPadding', () => {
    const data = '';
    expect(() => StaticHelpersElliptic.rmPadding(data)).toThrow();
  });
  it('should test rmPadding with no data as string', () => {
    const data = String.fromCharCode(0x80);
    const res = StaticHelpersElliptic.rmPadding(data);
    expect(res).toEqual(data);
  });
  it('should exercise rmPadding with a string', () => {
    const data: string = [0x00, 0x81, 0x83]
      .map((x) => String.fromCharCode(x))
      .join('');
    const res = StaticHelpersElliptic.rmPadding(data);
    expect(res).toEqual(data);
  });
});
