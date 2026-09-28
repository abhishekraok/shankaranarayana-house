// Turns the local model notes (N key) into a pose file that capture-fidelity.cjs can render:
// node tools/notes-to-poses.cjs && POSE_FILE=checks/model-notes-poses.json PHOTO_NAMES='note-abc' node tools/capture-fidelity.cjs batch
const fs = require('node:fs');
const path = require('node:path');
const src = process.env.NOTES_FILE || 'F:/Shankaranarayana/align-model-notes.json';
const out = path.resolve(__dirname, '..', 'checks', 'model-notes-poses.json');
const notes = JSON.parse(fs.readFileSync(src, 'utf8')).notes;
fs.mkdirSync(path.dirname(out), {recursive: true});
fs.writeFileSync(out, JSON.stringify({schema: 'shankaranarayana-photo-poses', poses: notes.map(n => ({id: n.id, filename: n.id + '.jpg', notes: n.text, camera: n.camera}))}, null, 1));
for (const n of notes) console.log(`${n.id}  ${n.place || ''}  ${n.text}`);
console.log(`\n${notes.length} notes -> ${out}`);
