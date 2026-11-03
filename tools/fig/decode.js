// Decode a Figma .fig canvas (fig-kiwi) into JSON.
const fs = require('fs');
const kiwi = require('kiwi-schema');
const fzstd = require('fzstd');
const pako = require('pako');
const [, , inPath, outPath] = process.argv;
const d = fs.readFileSync(inPath);
let i = 12; const chunks = [];
while (i < d.length) { const L = d.readUInt32LE(i); chunks.push(d.subarray(i + 4, i + 4 + L)); i += 4 + L; }
const un = b => (b[0] === 0x28 && b[1] === 0xb5) ? fzstd.decompress(b) : pako.inflateRaw(b);
const schema = kiwi.compileSchema(kiwi.decodeBinarySchema(un(chunks[0])));
const msg = schema.decodeMessage(un(chunks[1]));
fs.writeFileSync(outPath, JSON.stringify(msg, (k, v) => (v instanceof Uint8Array ? Buffer.from(v).toString('hex') : v)));
console.log('nodeChanges', msg.nodeChanges.length, 'blobs', (msg.blobs || []).length);
