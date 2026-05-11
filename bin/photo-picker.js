#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');

const [, , srcArg, dstArg, portArg] = process.argv;
const port = parseInt(portArg, 10) || 3000;

if (!srcArg || !dstArg) {
  console.error('Usage: npx photo-picker <source-dir> <dest-dir> [port]');
  process.exit(1);
}

const srcDir = path.resolve(srcArg);
const dstDir = path.resolve(dstArg);

if (srcDir === dstDir) {
  console.error('Source and destination directories must be different.');
  process.exit(1);
}

if (!fs.existsSync(srcDir)) {
  console.error(`Source directory not found: ${srcDir}`);
  process.exit(1);
}

if (!fs.existsSync(dstDir)) {
  fs.mkdirSync(dstDir, { recursive: true });
}

const IMAGE_EXTS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.bmp', '.tiff', '.tif',
]);

const MIME_TYPES = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif',
  '.bmp': 'image/bmp', '.tiff': 'image/tiff', '.tif': 'image/tiff',
};

function getImages() {
  const results = [];
  function walk(dir, prefix) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { return; }
    for (const e of entries) {
      const rel = prefix ? prefix + '/' + e.name : e.name;
      if (e.isDirectory()) walk(path.join(dir, e.name), rel);
      else if (e.isFile() && IMAGE_EXTS.has(path.extname(e.name).toLowerCase())) results.push(rel);
    }
  }
  walk(srcDir, '');
  return results.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function flattenPath(rel) {
  return rel.replace(/\//g, '_');
}

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>photo picker</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;overflow:hidden;background:#111;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
  body{display:flex;justify-content:center;align-items:center}
  #img{max-width:100vw;max-height:100vh;object-fit:contain;display:block}
  #bar{position:fixed;bottom:0;left:0;right:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;padding:10px 16px;gap:10px;backdrop-filter:blur(4px)}
  #bar button{background:rgba(255,255,255,0.12);color:#fff;border:1px solid rgba(255,255,255,0.25);padding:8px 18px;border-radius:6px;cursor:pointer;font-size:14px;transition:background .15s;white-space:nowrap}
  #bar button:hover{background:rgba(255,255,255,0.25)}
  #bar button:active{background:rgba(255,255,255,0.35)}
  #copyBtn{background:rgba(76,175,80,0.5);border-color:rgba(76,175,80,0.7)}
  #copyBtn:hover{background:rgba(76,175,80,0.75)}
  #copyBtn.copied{background:rgba(255,193,7,0.7);border-color:rgba(255,193,7,0.85)}
  .kbd{display:inline-block;background:rgba(255,255,255,0.15);padding:1px 5px;border-radius:3px;font-size:11px;margin-left:4px;font-family:inherit}
  .sep{width:1px;height:22px;background:rgba(255,255,255,0.15)}
  #counter{color:rgba(255,255,255,0.6);font-size:13px;margin-left:6px}
  #empty{color:rgba(255,255,255,0.5);font-size:18px}
</style>
</head>
<body>
<img id="img" alt="" style="display:none">
<div id="empty">No images found in source directory</div>
<div id="bar" style="display:none">
  <button id="prevBtn">\u25c0 Prev <span class="kbd">\u2190</span></button>
  <div class="sep"></div>
  <button id="copyBtn">Copy & Next <span class="kbd">Space</span></button>
  <div class="sep"></div>
  <button id="nextBtn">Next \u25b6 <span class="kbd">\u2192</span></button>
  <span id="counter"></span>
</div>
<script>
var images=[], idx=0;
var img=document.getElementById('img'), bar=document.getElementById('bar');
var empty=document.getElementById('empty'), counter=document.getElementById('counter');
var prevBtn=document.getElementById('prevBtn'), nextBtn=document.getElementById('nextBtn'), copyBtn=document.getElementById('copyBtn');

fetch('/images').then(function(r){return r.json()}).then(function(list){
  images=list;
  if(images.length){
    empty.style.display='none';
    img.style.display='block';
    bar.style.display='flex';
    var start=parseInt(location.hash.slice(1),10);
    show(isNaN(start)||start>=images.length?0:start);
  }
}).catch(function(e){console.error(e)});

var updatingHash=false;
function show(i){
  idx=i;
  img.src='/files/'+encodeURIComponent(images[i]);
  counter.textContent=(i+1)+'/'+images.length;
  updatingHash=true;
  location.hash='#'+i;
}

function resetCopyBtn(){
  copyBtn.innerHTML='Copy & Next <span class="kbd">Space</span>';
  copyBtn.classList.remove('copied');
}

function doCopy(){
  if(!images.length)return;
  var fn=images[idx];
  fetch('/copy/'+encodeURIComponent(fn),{method:'POST'}).then(function(r){
    if(r.ok){
      copyBtn.innerHTML='\u2713 Copied <span class="kbd">Space</span>';
      copyBtn.classList.add('copied');
      setTimeout(resetCopyBtn,400);
    }
  }).catch(function(e){console.error(e)});
  if(idx<images.length-1)show(idx+1);
}

function prev(){if(idx>0)show(idx-1)}
function next(){if(idx<images.length-1)show(idx+1)}

prevBtn.onclick=prev;
nextBtn.onclick=next;
copyBtn.onclick=doCopy;

document.addEventListener('keydown',function(e){
  if(e.key==='ArrowLeft'){e.preventDefault();prev()}
  else if(e.key==='ArrowRight'){e.preventDefault();next()}
  else if(e.key===' '||e.key==='Spacebar'){e.preventDefault();doCopy()}
});

window.addEventListener('hashchange',function(){
  if(updatingHash){updatingHash=false;return}
  if(!images.length)return;
  var i=parseInt(location.hash.slice(1),10);
  if(!isNaN(i)&&i>=0&&i<images.length&&i!==idx)show(i);
});
</script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;

  if (p === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(HTML);
  } else if (p === '/images') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getImages()));
  } else if (p.startsWith('/files/')) {
    const name = decodeURIComponent(p.slice(7));
    const fp = path.resolve(srcDir, name);
    if (!fp.startsWith(srcDir)) { res.writeHead(403); res.end('Forbidden'); return; }
    const mime = MIME_TYPES[path.extname(name).toLowerCase()] || 'application/octet-stream';
    const s = fs.createReadStream(fp);
    s.on('open', () => { res.writeHead(200, { 'Content-Type': mime }); s.pipe(res); });
    s.on('error', e => { res.writeHead(e.code === 'ENOENT' ? 404 : 500); res.end('Error'); });
  } else if (p.startsWith('/copy/')) {
    if (req.method !== 'POST') { res.writeHead(405); res.end('Method not allowed'); return; }
    const name = decodeURIComponent(p.slice(6));
    const src = path.resolve(srcDir, name);
    const dst = path.resolve(dstDir, flattenPath(name));
    if (!src.startsWith(srcDir)) { res.writeHead(403); res.end('Forbidden'); return; }
    try {
      fs.copyFileSync(src, dst);
      res.writeHead(200); res.end('Copied');
    } catch (e) {
      res.writeHead(500); res.end(e.message);
    }
  } else {
    res.writeHead(404); res.end('Not found');
  }
});

const { exec } = require('child_process');

function openBrowser(url) {
  const cmd = process.platform === 'darwin' ? 'open' :
              process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(cmd + ' ' + url, () => {});
}

server.listen(port, () => {
  const url = 'http://localhost:' + port;
  console.log('photo picker running at ' + url);
  console.log('Source: ' + srcDir);
  console.log('Dest:   ' + dstDir);
  openBrowser(url);
});
