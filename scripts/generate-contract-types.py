#!/usr/bin/env python3
"""Generate the supported wire DTOs from the executable OpenAPI schema."""
import json
from pathlib import Path
import sys
root=Path(__file__).resolve().parents[1]
spec=json.loads((root/'contracts/openapi/wolly.v1.json').read_text())
def ts(schema):
    if '$ref' in schema:return schema['$ref'].rsplit('/',1)[1]
    if 'const' in schema:return json.dumps(schema['const'])
    kind=schema.get('type')
    if kind=='array':return f"Array<{ts(schema['items'])}>"
    if kind=='object':
        required=schema.get('required',[])
        return '{ '+ '; '.join(f'{k}{"" if k in required else "?"}: {ts(v)}' for k,v in schema.get('properties',{}).items())+' }'
    if kind in ['string','boolean']:return kind
    if kind in ['integer','number']:return 'number'
    raise ValueError(f'Unsupported schema must be implemented deliberately: {schema}')
output='// Generated from contracts/openapi/wolly.v1.json. Do not edit.\n'+'\n'.join(f'export type {name} = {ts(value)};' for name,value in spec['components']['schemas'].items())+'\n'
target=root/'packages/api-client/src/generated.ts'
if '--check' in sys.argv:
    if not target.exists() or target.read_text()!=output:raise SystemExit('Contract types drifted. Run npm run contracts:generate.')
else:target.write_text(output)
