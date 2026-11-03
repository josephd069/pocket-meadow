import { mkdir, copyFile, readFile } from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const files=[['build/three.module.js','three.module.js'],['build/three.core.js','three.core.js'],['examples/jsm/loaders/GLTFLoader.js','addons/loaders/GLTFLoader.js'],['examples/jsm/utils/BufferGeometryUtils.js','addons/utils/BufferGeometryUtils.js'],['LICENSE','THREE-LICENSE.txt']];
for(const [source,target] of files){const dest=path.join(root,'dist/vendor',target);await mkdir(path.dirname(dest),{recursive:true});await copyFile(path.join(root,'node_modules/three',source),dest);}
for(const file of ['index.html','main.js','game-core.js','style.css','assets/meadow-kit.glb'])await readFile(path.join(root,'dist',file));
console.log('Pocket Meadow is ready in dist/ (Three.js 0.180.0 and original Blender assets).');
