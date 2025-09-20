import {cp, mkdir} from 'node:fs/promises';
await mkdir('public/assets', {recursive:true});
await cp('assets', 'public/assets', {recursive:true});
await mkdir('public/src/styles', {recursive:true});
await cp('src/styles/site.css', 'public/src/styles/site.css');
await mkdir('public/src/js', {recursive:true});
await cp('src/js', 'public/src/js', {recursive:true});
console.log('Synced assets & source to public/');
