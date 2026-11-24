const test=require('node:test');
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
test('visitor notification delivery and guards',async()=>{
for(const scenario of ['ok','missing','foreign','cookie','bot','failed','timeout']){
 let calls=[];const s={module:{exports:{}},process:{env:scenario==='missing'?{}:{PUSHOVER_APP_TOKEN:'test-token',PUSHOVER_USER_KEY:'test-user'}},AbortSignal,fetch:async(u,o)=>{calls.push({url:u,...JSON.parse(o.body)});if(scenario==='timeout')throw Error('timeout');return {ok:scenario!=='failed',json:async()=>({status:scenario==='failed'?0:1})}}};
 vm.runInNewContext(fs.readFileSync('api/visitor.js','utf8'),s);
 let status;const headers={};const res={setHeader(k,v){headers[k]=v},status(n){status=n;return this},json(){},end(){}};
 const req={method:'POST',headers:{origin:scenario==='foreign'?'https://other.example':'https://www.laodorpros.com','user-agent':scenario==='bot'?'Googlebot':'Browser',cookie:scenario==='cookie'?'la_visitor_alert=1':''},body:{path:'/about?private=example'}};
 await s.module.exports(req,res);
 assert.equal(status,{ok:200,missing:503,foreign:403,cookie:204,bot:204,failed:502,timeout:502}[scenario]);
 assert.equal(calls.length,['ok','failed','timeout'].includes(scenario)?1:0);
 if(calls.length){assert.equal(calls[0].message,'A visitor opened /about');assert.equal(calls[0].priority,0);assert.equal(calls[0].url,'https://api.pushover.net/1/messages.json');}
 if(scenario==='ok'){
 assert.ok(headers['Set-Cookie'].includes('HttpOnly'));
 await s.module.exports(req,res);assert.equal(status,204);assert.equal(calls.length,1);
 }
}
});
