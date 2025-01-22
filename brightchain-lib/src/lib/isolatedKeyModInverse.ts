export function modInverse(a: bigint, m: bigint): bigint {
  const egcd = (a: bigint, b: bigint): [bigint, bigint, bigint] => {
    if (a === 0n) return [b, 0n, 1n];
    const [g, x, y] = egcd(b % a, a);
    return [g, y - (b / a) * x, x];
  };

  a = ((a % m) + m) % m;
  const [g, x] = egcd(a, m);
  if (g !== 1n) {
    throw new Error('Modular multiplicative inverse does not exist');
  }
  return ((x % m) + m) % m;
}
