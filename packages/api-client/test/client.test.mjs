import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApiClient} from '../src/index.ts';
test('rejects invalid capability and unavailable responses',async()=>{
 for (const response of [new Response('{}'),new Response('{"data":{"contractVersion":"v1","modules":[{"id":"catalog","enabled":"yes"}]}}'),new Response('offline',{status:503})]) {
  await assert.rejects(createApiClient('/api/v1',async()=>response).capabilities());
 }
});
test('uses the versioned endpoint without mutating status',async()=>{
 const payload={data:{contractVersion:'v1',modules:[{id:'catalog',enabled:false}]}};
 const client=createApiClient('/api/v1/',async(url)=>{assert.equal(url,'/api/v1/capabilities');return Response.json(payload)});
 assert.deepEqual(await client.capabilities(),payload);
});
