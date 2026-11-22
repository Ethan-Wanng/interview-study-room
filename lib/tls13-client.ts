// Minimal RFC 8446 TLS 1.3 client over WebCrypto (crypto.subtle) for Cloudflare Workers & Node.js.
// Supports TLS_AES_128_GCM_SHA256 (0x1301) and TLS_AES_256_GCM_SHA384 (0x1302) with ECDHE P-256 (0x0017).

export interface ByteStream {
 read(): Promise<Uint8Array | null>;
 write(data: Uint8Array): Promise<void>;
 close(): Promise<void>;
}

const enc = new TextEncoder();

function concatBytes(...parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
 let total = 0;
 for (const p of parts) total += p.length;
 const out = new Uint8Array(new ArrayBuffer(total));
 let off = 0;
 for (const p of parts) {
  out.set(p, off);
  off += p.length;
 }
 return out;
}

function toBuf(u: Uint8Array): Uint8Array<ArrayBuffer> {
 const out = new Uint8Array(new ArrayBuffer(u.length));
 out.set(u);
 return out;
}

function u16(n: number): Uint8Array<ArrayBuffer> {
 return new Uint8Array([n >>> 8, n & 0xff]);
}

function u24(n: number): Uint8Array<ArrayBuffer> {
 return new Uint8Array([(n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
}

function eqConstTime(a: Uint8Array, b: Uint8Array): boolean {
 if (a.length !== b.length) return false;
 let diff = 0;
 for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
 return diff === 0;
}

class BufferedReader {
 private readonly stream: ByteStream;
 private chunks: Uint8Array[] = [];
 private total = 0;
 private eof = false;

 constructor(stream: ByteStream) {
  this.stream = stream;
 }

 async readExact(n: number): Promise<Uint8Array<ArrayBuffer>> {
  while (this.total < n) {
   if (this.eof) throw new Error('TLS unexpected EOF');
   const c = await this.stream.read();
   if (!c || c.length === 0) {
    this.eof = true;
    throw new Error('TLS unexpected EOF');
   }
   this.chunks.push(c);
   this.total += c.length;
  }
  const out = new Uint8Array(new ArrayBuffer(n));
  let off = 0;
  while (off < n) {
   const head = this.chunks[0];
   const take = Math.min(head.length, n - off);
   out.set(head.subarray(0, take), off);
   off += take;
   this.total -= take;
   if (take === head.length) this.chunks.shift();
   else this.chunks[0] = head.subarray(take);
  }
  return out;
 }

 async readRecord(): Promise<{ type: number; payload: Uint8Array<ArrayBuffer> }> {
  const hdr = await this.readExact(5);
  const type = hdr[0];
  const len = (hdr[3] << 8) | hdr[4];
  if (len > 18432) throw new Error(`TLS record too large: ${len}`);
  const payload = await this.readExact(len);
  return { type, payload };
 }
}

type HashAlg = 'SHA-256' | 'SHA-384';

async function hashBytes(alg: HashAlg, data: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
 return new Uint8Array(await crypto.subtle.digest(alg, toBuf(data)));
}

async function hmac(alg: HashAlg, keyBytes: Uint8Array, data: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
 const key = await crypto.subtle.importKey('raw', toBuf(keyBytes), { name: 'HMAC', hash: alg }, false, ['sign']);
 return new Uint8Array(await crypto.subtle.sign('HMAC', key, toBuf(data)));
}

async function hkdfExtract(alg: HashAlg, salt: Uint8Array, ikm: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
 return hmac(alg, salt, ikm);
}

async function hkdfExpandLabel(
 alg: HashAlg,
 secret: Uint8Array,
 label: string,
 context: Uint8Array,
 length: number,
): Promise<Uint8Array<ArrayBuffer>> {
 const fullLabel = enc.encode('tls13 ' + label);
 const info = concatBytes(
  u16(length),
  new Uint8Array([fullLabel.length]),
  fullLabel,
  new Uint8Array([context.length]),
  context,
 );
 const hashLen = alg === 'SHA-384' ? 48 : 32;
 const blocks: Uint8Array[] = [];
 let prev: Uint8Array = new Uint8Array(0);
 let counter = 1;
 while (blocks.length * hashLen < length) {
  prev = await hmac(alg, secret, concatBytes(prev, info, new Uint8Array([counter++])));
  blocks.push(prev);
 }
 return concatBytes(...blocks).slice(0, length);
}

type TrafficKeys = {
 key: CryptoKey;
 iv: Uint8Array;
 seq: number;
};

async function makeTrafficKeys(alg: HashAlg, secret: Uint8Array, keyLen: number): Promise<TrafficKeys> {
 const rawKey = await hkdfExpandLabel(alg, secret, 'key', new Uint8Array(0), keyLen);
 const iv = await hkdfExpandLabel(alg, secret, 'iv', new Uint8Array(0), 12);
 const key = await crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
 return { key, iv, seq: 0 };
}

function buildNonce(iv: Uint8Array, seq: number): Uint8Array<ArrayBuffer> {
 const nonce = new Uint8Array(new ArrayBuffer(12));
 nonce.set(iv);
 let s = seq;
 for (let i = 11; i >= 4 && s > 0; i--) {
  nonce[i] ^= s & 0xff;
  s = Math.floor(s / 256);
 }
 return nonce;
}

async function encryptRecord(tk: TrafficKeys, innerType: number, payload: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
 const plain = concatBytes(payload, new Uint8Array([innerType]));
 const ctLen = plain.length + 16;
 const aad = new Uint8Array([0x17, 0x03, 0x03, (ctLen >>> 8) & 0xff, ctLen & 0xff]);
 const nonce = buildNonce(tk.iv, tk.seq);
 tk.seq += 1;
 const ct = new Uint8Array(
  await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, additionalData: aad, tagLength: 128 }, tk.key, plain),
 );
 return concatBytes(aad, ct);
}

async function decryptRecord(
 tk: TrafficKeys,
 outerType: number,
 payload: Uint8Array,
): Promise<{ innerType: number; data: Uint8Array<ArrayBuffer> }> {
 const aad = new Uint8Array([outerType, 0x03, 0x03, (payload.length >>> 8) & 0xff, payload.length & 0xff]);
 const nonce = buildNonce(tk.iv, tk.seq);
 tk.seq += 1;
 const plain = new Uint8Array(
  await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce, additionalData: aad, tagLength: 128 }, tk.key, toBuf(payload)),
 );
 let end = plain.length - 1;
 while (end >= 0 && plain[end] === 0) end--;
 if (end < 0) throw new Error('TLS empty inner plaintext');
 return { innerType: plain[end], data: plain.slice(0, end) };
}

function ext(type: number, body: Uint8Array): Uint8Array<ArrayBuffer> {
 return concatBytes(u16(type), u16(body.length), body);
}

function buildClientHello(sni: string, pubKeyRaw: Uint8Array, alpn?: string[]): { hsMsg: Uint8Array<ArrayBuffer>; record: Uint8Array<ArrayBuffer> } {
 const clientRandom = crypto.getRandomValues(new Uint8Array(32));
 const sessionId = crypto.getRandomValues(new Uint8Array(32));
 const cipherSuites = new Uint8Array([0x13, 0x01, 0x13, 0x02]); // AES_128_GCM_SHA256, AES_256_GCM_SHA384

 const sniBytes = enc.encode(sni);
 const sniEntry = concatBytes(new Uint8Array([0x00]), u16(sniBytes.length), sniBytes);
 const sniExt = ext(0x0000, concatBytes(u16(sniEntry.length), sniEntry));

 const supportedVersions = ext(0x002b, new Uint8Array([0x02, 0x03, 0x04]));
 const supportedGroups = ext(0x000a, new Uint8Array([0x00, 0x02, 0x00, 0x17])); // secp256r1
 const sigAlgs = ext(
  0x000d,
  new Uint8Array([
   0x00, 0x0e,
   0x04, 0x03, // ecdsa_secp256r1_sha256
   0x05, 0x03, // ecdsa_secp384r1_sha384
   0x08, 0x04, // rsa_pss_rsae_sha256
   0x08, 0x05, // rsa_pss_rsae_sha384
   0x08, 0x06, // rsa_pss_rsae_sha512
   0x04, 0x01, // rsa_pkcs1_sha256
   0x05, 0x01, // rsa_pkcs1_sha384
  ]),
 );
 const ksEntry = concatBytes(u16(0x0017), u16(pubKeyRaw.length), pubKeyRaw);
 const keyShareExt = ext(0x0033, concatBytes(u16(ksEntry.length), ksEntry));

 const exts: Uint8Array[] = [sniExt, supportedVersions, supportedGroups, sigAlgs, keyShareExt];
 if (alpn && alpn.length > 0) {
  const protos = concatBytes(...alpn.map((p) => { const b = enc.encode(p); return concatBytes(new Uint8Array([b.length]), b); }));
  exts.push(ext(0x0010, concatBytes(u16(protos.length), protos)));
 }
 const extBlock = concatBytes(...exts);

 const body = concatBytes(
  new Uint8Array([0x03, 0x03]),
  clientRandom,
  new Uint8Array([sessionId.length]),
  sessionId,
  u16(cipherSuites.length),
  cipherSuites,
  new Uint8Array([0x01, 0x00]), // legacy compression = null
  u16(extBlock.length),
  extBlock,
 );
 const hsMsg = concatBytes(new Uint8Array([0x01]), u24(body.length), body);
 const record = concatBytes(new Uint8Array([0x16, 0x03, 0x01]), u16(hsMsg.length), hsMsg);
 return { hsMsg, record };
}

function parseServerHello(hsMsg: Uint8Array): { cipherSuite: number; serverPubKey: Uint8Array<ArrayBuffer> } {
 if (hsMsg.length < 40 || hsMsg[0] !== 0x02) throw new Error(`Expected ServerHello, got type ${hsMsg[0]}`);
 let off = 4 + 2 + 32; // type(1)+len(3)+legacy_version(2)+random(32)
 const sidLen = hsMsg[off++];
 off += sidLen;
 const cipherSuite = (hsMsg[off] << 8) | hsMsg[off + 1];
 off += 3; // cipher(2) + compression(1)
 if (off + 2 > hsMsg.length) throw new Error('ServerHello missing extensions');
 const extTotal = (hsMsg[off] << 8) | hsMsg[off + 1];
 off += 2;
 const end = off + extTotal;
 let version = 0;
 let serverPubKey: Uint8Array<ArrayBuffer> | null = null;
 while (off + 4 <= end) {
  const eType = (hsMsg[off] << 8) | hsMsg[off + 1];
  const eLen = (hsMsg[off + 2] << 8) | hsMsg[off + 3];
  off += 4;
  const slice = hsMsg.subarray(off, off + eLen);
  off += eLen;
  if (eType === 0x002b && eLen >= 2) {
   version = (slice[0] << 8) | slice[1];
  } else if (eType === 0x0033 && eLen >= 4) {
   const group = (slice[0] << 8) | slice[1];
   const kLen = (slice[2] << 8) | slice[3];
   if (group !== 0x0017) throw new Error(`Unsupported TLS 1.3 key_share group: 0x${group.toString(16)}`);
   serverPubKey = toBuf(slice.subarray(4, 4 + kLen));
  }
 }
 if (version !== 0x0304) throw new Error(`Server did not negotiate TLS 1.3 (version=0x${version.toString(16)})`);
 if (!serverPubKey) throw new Error('ServerHello missing P-256 key_share');
 return { cipherSuite, serverPubKey };
}

export class Tls13Stream implements ByteStream {
 private readonly raw: ByteStream;
 private readonly reader: BufferedReader;
 private readKeys!: TrafficKeys;
 private writeKeys!: TrafficKeys;
 private closed = false;
 private pendingPlain: Uint8Array[] = [];

 private constructor(raw: ByteStream, reader: BufferedReader) {
  this.raw = raw;
  this.reader = reader;
 }

 static async connect(raw: ByteStream, sni: string, opts?: { alpn?: string[] }): Promise<Tls13Stream> {
  const reader = new BufferedReader(raw);
  const tls = new Tls13Stream(raw, reader);

  const kp = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair;
  const pubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
  const { hsMsg: chMsg, record: chRec } = buildClientHello(sni, pubRaw, opts?.alpn);
  await raw.write(chRec);

  const transcript: Uint8Array[] = [chMsg];

  // Read ServerHello (plain handshake record)
  let shMsg: Uint8Array | null = null;
  let hsBuf: Uint8Array<ArrayBuffer> = new Uint8Array(new ArrayBuffer(0));
  while (!shMsg) {
   const rec = await reader.readRecord();
   if (rec.type === 0x15) {
    throw new Error(`TLS alert before ServerHello: level=${rec.payload[0]} desc=${rec.payload[1]}`);
   }
   if (rec.type === 0x14) continue; // ChangeCipherSpec
   if (rec.type !== 0x16) throw new Error(`Unexpected record type ${rec.type} before ServerHello`);
   hsBuf = concatBytes(hsBuf, rec.payload);
   if (hsBuf.length >= 4) {
    const mLen = (hsBuf[1] << 16) | (hsBuf[2] << 8) | hsBuf[3];
    if (hsBuf.length >= 4 + mLen) {
     shMsg = hsBuf.slice(0, 4 + mLen);
     hsBuf = hsBuf.slice(4 + mLen);
    }
   }
  }
  transcript.push(shMsg);
  const { cipherSuite, serverPubKey } = parseServerHello(shMsg);

  let alg: HashAlg;
  let keyLen: number;
  if (cipherSuite === 0x1301) {
   alg = 'SHA-256';
   keyLen = 16;
  } else if (cipherSuite === 0x1302) {
   alg = 'SHA-384';
   keyLen = 32;
  } else {
   throw new Error(`Unsupported TLS 1.3 cipher suite: 0x${cipherSuite.toString(16)}`);
  }
  const hashLen = alg === 'SHA-384' ? 48 : 32;
  const zeros = new Uint8Array(new ArrayBuffer(hashLen));

  const peerKey = await crypto.subtle.importKey('raw', serverPubKey, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: peerKey }, kp.privateKey, 256));

  const emptyHash = await hashBytes(alg, new Uint8Array(0));
  const earlySecret = await hkdfExtract(alg, zeros, zeros);
  const derived1 = await hkdfExpandLabel(alg, earlySecret, 'derived', emptyHash, hashLen);
  const hsSecret = await hkdfExtract(alg, derived1, sharedSecret);

  const chShHash = await hashBytes(alg, concatBytes(...transcript));
  const clientHsSecret = await hkdfExpandLabel(alg, hsSecret, 'c hs traffic', chShHash, hashLen);
  const serverHsSecret = await hkdfExpandLabel(alg, hsSecret, 's hs traffic', chShHash, hashLen);
  const derived2 = await hkdfExpandLabel(alg, hsSecret, 'derived', emptyHash, hashLen);
  const masterSecret = await hkdfExtract(alg, derived2, zeros);

  const sHsKeys = await makeTrafficKeys(alg, serverHsSecret, keyLen);
  const cHsKeys = await makeTrafficKeys(alg, clientHsSecret, keyLen);

  // Read encrypted server handshake flight until Finished (type 0x14 = 20)
  let encHsBuf: Uint8Array<ArrayBuffer> = new Uint8Array(new ArrayBuffer(0));
  let serverFinishedSeen = false;
  while (!serverFinishedSeen) {
   const rec = await reader.readRecord();
   if (rec.type === 0x14) continue; // middlebox ChangeCipherSpec
   if (rec.type === 0x15) throw new Error(`TLS plain alert: level=${rec.payload[0]} desc=${rec.payload[1]}`);
   if (rec.type !== 0x17) throw new Error(`Expected encrypted handshake record (23), got ${rec.type}`);
   const dec = await decryptRecord(sHsKeys, rec.type, rec.payload);
   if (dec.innerType === 0x15) {
    throw new Error(`TLS encrypted alert during handshake: level=${dec.data[0]} desc=${dec.data[1]}`);
   }
   if (dec.innerType !== 0x16) throw new Error(`Expected handshake inner type (22), got ${dec.innerType}`);
   encHsBuf = concatBytes(encHsBuf, dec.data);

   while (encHsBuf.length >= 4) {
    const mType = encHsBuf[0];
    const mLen = (encHsBuf[1] << 16) | (encHsBuf[2] << 8) | encHsBuf[3];
    if (encHsBuf.length < 4 + mLen) break;
    const msg = encHsBuf.slice(0, 4 + mLen);
    encHsBuf = encHsBuf.slice(4 + mLen);

    if (mType === 0x14) {
     // Verify server Finished
     const preFinHash = await hashBytes(alg, concatBytes(...transcript));
     const finKey = await hkdfExpandLabel(alg, serverHsSecret, 'finished', new Uint8Array(0), hashLen);
     const expectedVerify = await hmac(alg, finKey, preFinHash);
     const actualVerify = msg.subarray(4);
     if (!eqConstTime(expectedVerify, actualVerify)) {
      throw new Error('TLS server Finished verification failed');
     }
     transcript.push(msg);
     serverFinishedSeen = true;
     break;
    } else {
     transcript.push(msg);
    }
   }
  }

  const sfHash = await hashBytes(alg, concatBytes(...transcript));
  const clientAppSecret = await hkdfExpandLabel(alg, masterSecret, 'c ap traffic', sfHash, hashLen);
  const serverAppSecret = await hkdfExpandLabel(alg, masterSecret, 's ap traffic', sfHash, hashLen);

  // Send ChangeCipherSpec + encrypted Client Finished
  const cFinKey = await hkdfExpandLabel(alg, clientHsSecret, 'finished', new Uint8Array(0), hashLen);
  const cVerify = await hmac(alg, cFinKey, sfHash);
  const cFinMsg = concatBytes(new Uint8Array([0x14]), u24(cVerify.length), cVerify);
  const ccs = new Uint8Array([0x14, 0x03, 0x03, 0x00, 0x01, 0x01]);
  const encFin = await encryptRecord(cHsKeys, 0x16, cFinMsg);
  await raw.write(concatBytes(ccs, encFin));

  tls.writeKeys = await makeTrafficKeys(alg, clientAppSecret, keyLen);
  tls.readKeys = await makeTrafficKeys(alg, serverAppSecret, keyLen);
  return tls;
 }

 async write(data: Uint8Array): Promise<void> {
  if (this.closed) throw new Error('TLS stream closed');
  const maxChunk = 15800;
  for (let off = 0; off < data.length; off += maxChunk) {
   const slice = data.subarray(off, Math.min(data.length, off + maxChunk));
   const rec = await encryptRecord(this.writeKeys, 0x17, slice);
   await this.raw.write(rec);
  }
 }

 async read(): Promise<Uint8Array | null> {
  if (this.pendingPlain.length > 0) return this.pendingPlain.shift()!;
  if (this.closed) return null;
  for (;;) {
   let rec: { type: number; payload: Uint8Array<ArrayBuffer> };
   try {
    rec = await this.reader.readRecord();
   } catch {
    this.closed = true;
    return null;
   }
   if (rec.type === 0x14) continue; // ChangeCipherSpec
   if (rec.type === 0x15) {
    this.closed = true;
    return null;
   }
   if (rec.type !== 0x17) continue;
   const dec = await decryptRecord(this.readKeys, rec.type, rec.payload);
   if (dec.innerType === 0x17) {
    if (dec.data.length > 0) return dec.data;
    continue;
   }
   if (dec.innerType === 0x16) {
    // Post-handshake messages like NewSessionTicket — ignore safely
    continue;
   }
   if (dec.innerType === 0x15) {
    // Alert (e.g. close_notify desc=0)
    this.closed = true;
    return null;
   }
  }
 }

 async close(): Promise<void> {
  if (this.closed) return;
  this.closed = true;
  try {
   if (this.writeKeys) {
    const closeNotify = await encryptRecord(this.writeKeys, 0x15, new Uint8Array([0x01, 0x00]));
    await this.raw.write(closeNotify);
   }
  } catch {}
  await this.raw.close().catch(() => {});
 }
}
