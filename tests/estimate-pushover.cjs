const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
for(const file of ['api/estimate.js','api/estimate/index.js','index.js']){
 test(file+' privacy and email-first delivery',async()=>{
 for(const mode of ['ok','missing','push-reject','push-timeout','email-reject','invalid','untrusted','location','bad-location']){
 const calls=[];let emailAccepted=false;let timeout;
 const env={RESEND_API_KEY:'test',...(mode==='missing'?{}:{PUSHOVER_APP_TOKEN:'private-token',PUSHOVER_USER_KEY:'private-user'})};
 const box={module:{exports:{}},process:{env},URL,console:{error(){}},AbortSignal:{timeout(ms){timeout=ms;return AbortSignal.timeout(ms)}},fetch:async(url,options)=>{
 const body=JSON.parse(options.body);calls.push({url,body});
 if(url.includes('resend')){emailAccepted=mode!=='email-reject';return {ok:emailAccepted,json:async()=>({id:'email-id'})};}
 assert.ok(emailAccepted,'push must follow email acceptance');assert.equal(timeout,3000);
 if(mode==='push-timeout')throw Error('timeout');return {ok:mode!=='push-reject',json:async()=>({status:mode==='push-reject'?0:1})};
 }};
 vm.runInNewContext(fs.readFileSync(file,'utf8'),box);
 let status,result;const res={setHeader(){},status(n){status=n;return this},json(v){result=v}};
 const fields={Name:'PRIVATE NAME',Phone:'4245550100',Email:'private@example.test','Property address':'PRIVATE ADDRESS',Message:'PRIVATE MESSAGE',Service:mode==='untrusted'?'PRIVATE SERVICE':'Pet odor removal'};
 if(mode==='location'){fields.City='Los Angeles';fields['ZIP/postal code']='90012';}
 if(mode==='bad-location'){fields.City='PRIVATE\nMESSAGE';fields['ZIP/postal code']='private@example.test';}
 await box.module.exports({method:'POST',headers:{cookie:'la_visitor_alert=1'},body:{fields:mode==='invalid'?{}:fields,chatHistory:['PRIVATE CHAT'],pageUrl:mode==='untrusted'?'https://evil.test/PRIVATE-PATH':'https://www.laodorpros.com/odor-removal-los-angeles?PRIVATE-QUERY#PRIVATE-HASH'}},res);
 assert.equal(status,mode==='invalid'?400:mode==='email-reject'?502:200);
 const pushes=calls.filter(c=>c.url.includes('pushover'));
 assert.equal(pushes.length,['invalid','email-reject','missing'].includes(mode)?0:1);
 if(pushes.length){const p=pushes[0].body;assert.equal(p.title,'LA ODOR PROS — Free Estimate request');assert.equal(p.priority,0);assert.equal(p.message,(mode==='untrusted'?'Service: Not specified\nPage: /':'Service: Pet Odor Removal\nPage: /odor-removal-los-angeles')+(mode==='location'?'\nCity: Los Angeles\nZIP/postal code: 90012':'\nCity: Not provided\nZIP/postal code: Not provided'));assert.deepEqual(Object.keys(p).sort(),['message','priority','title','token','user']);}
 if(status===200){assert.equal(result.ok,true);assert.equal(result.notification,mode==='missing'?'disabled':mode.startsWith('push-')?'failed':'accepted');}
 assert.ok(!JSON.stringify(result).includes('private-token'));
 if(mode==='ok')assert.ok(calls[0].body.html.includes('PRIVATE ADDRESS'),'email retains details');
 }
 });
}
