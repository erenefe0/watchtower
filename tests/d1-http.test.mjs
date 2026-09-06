import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createD1 } from '../scripts/d1-http.mjs';
const config = {accountId:'a'.repeat(32),databaseId:'12345678-1234-1234-1234-123456789012',token:'test-only'};
test('D1 adapter preserves parameter binding, results, changes and batches', async () => {
  let sent;
  const db=createD1({...config, request:async (_url,opts)=>{
    sent=JSON.parse(opts.body);
    return Response.json({success:true,result:sent.map(()=>({success:true,results:[{n:2}],meta:{changes:1}}))});
  }});
  assert.deepEqual(await db.prepare('SELECT ? n').bind("a'b").first(),{n:2});
  assert.deepEqual(sent,[{sql:'SELECT ? n',params:["a'b"]}]);
  assert.equal((await db.prepare('UPDATE x SET y=?').bind(3).run()).meta.changes,1);
  assert.equal((await db.batch([db.prepare('SELECT 1'),db.prepare('SELECT 2')])).length,2);
});
test('D1 errors fail closed without printing credentials or response content', async () => {
  const db=createD1({...config, request:async()=>Response.json({success:false,errors:[{message:'private response'}]})});
  await assert.rejects(db.prepare('SELECT 1').all(),{message:'D1 query failed.'});
});
