#!/usr/bin/env python3
"""Enforce build/module isolation, not merely a suggested folder convention."""
import json, re, subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[1]
errors=[]
prefix='github.com/saintjanney/wolly/backend/go/internal/'
raw=subprocess.check_output(['go','list','-json','./internal/...'],cwd=root/'backend/go',text=True)
decoder=json.JSONDecoder();pos=0
while pos<len(raw):
    if raw[pos].isspace():pos+=1;continue
    pkg,n=decoder.raw_decode(raw,pos);pos=n
    own=pkg['ImportPath'].removeprefix(prefix).split('/')[0]
    for dep in pkg.get('Imports',[]):
        if not dep.startswith(prefix):continue
        other=dep.removeprefix(prefix).split('/')[0]
        if own not in ['app'] and other not in [own,'platform']:errors.append(f"{pkg['ImportPath']} imports foreign module {dep}; use a consumer-owned port wired in app")
        if '/domain' in pkg['ImportPath'] and other=='platform':errors.append(f"domain imports infrastructure: {pkg['ImportPath']}")
for base in ['apps','packages','services','backend']:
    for p in (root/base).rglob('*'):
        if not p.is_file() or any(x in p.parts for x in ['node_modules','.next','.dart_tool','build','.git']):continue
        if p.suffix not in ['.ts','.tsx','.js','.mjs','.dart','.go','.json','.yaml','.gradle']:continue
        text=p.read_text(errors='replace')
        if re.search(r"(?:from\s+|import\s+|require\()\s*['\"](?:firebase(?:[-/][^'\"]*)?|cloud_firestore|package:firebase[^'\"]*|package:cloud_firestore[^'\"]*)['\"]",text) or re.search(r'"firebase(?:-[^"]+)?"\s*:',text) or re.search(r'^\s*(?:firebase_\w+|cloud_firestore):',text,re.M):errors.append(f'Active cloud SDK dependency: {p.relative_to(root)}')
        for imp in re.findall(r"(?:from\s+|import\s+|require\()\s*['\"]([^'\"]+)['\"]",text):
            if imp.startswith('.'):
                target=(p.parent/imp).resolve()
                try:
                    relative=target.relative_to(root)
                except ValueError:continue
                if relative.parts[0]=='legacy':errors.append(f'Reference import: {p.relative_to(root)}')
                if base=='apps' and relative.parts[0]=='apps' and relative.parts[1]!=p.relative_to(root).parts[1]:errors.append(f'Cross-app import: {p.relative_to(root)}')
            if imp in ['@wolly/creator-hub','@wolly/backoffice','@wolly/blog','@wolly/storefront']:
                errors.append(f'Cross-app package dependency: {p.relative_to(root)}')
if errors:raise SystemExit('\n'.join(errors))
print('Go module, frontend and legacy boundaries passed.')
