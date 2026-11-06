import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mergeNotebook,saveNotebook,NotebookConflictError,type NotebookBlock} from '../apps/web/lib/notebook-save';

const note=(id='note',content='原始记录'):NotebookBlock=>({id,kind:'speech',title:'讨论',speakerId:'fwl',content});
const question=():NotebookBlock=>({...note('question','请逐人回答'),kind:'question',questionId:7,questionRevision:1,status:'open',answers:[{id:'one',speakerId:'lxg',content:'第一位回答'}]});
const clone=<T>(value:T):T=>structuredClone(value);

test('ordinary editing and repeated saves use the acknowledged baseline',async()=>{
 let server={record:{revision:1},blocks:[note()]};let base=clone(server.blocks);
 for(const content of ['第一次修改','第二次修改','第三次修改']){
  const local=clone(base);local[0].content=content;
  const saved=await saveNotebook({base,local,read:async()=>clone(server),write:async body=>{
   assert.equal(body.revision,server.record.revision);server={record:{revision:body.revision+1},blocks:clone(body.blocks)};return {revision:server.record.revision,blocks:clone(server.blocks)};
  }});
  base=saved.blocks;assert.equal(server.blocks[0].content,content);
 }
 assert.equal(server.record.revision,4);
});

test('stale tabs merge separate fields, remote-only sections and independent answers',()=>{
 const base=[note(),question()],local=clone(base),remote=clone(base);
 local[0].content='本页改了正文';remote[0].title='另一页面修改标题';
 local[1].answers![0].content='本页补充第一位回答';remote[1].status='tracking';remote[1].questionRevision=9;
 remote[1].answers!.push({id:'two',speakerId:'sya',content:'另一页面记录第二位回答'});remote.push(note('extra','新增分析'));
 const merged=mergeNotebook(base,local,remote);
 assert.deepEqual(merged.conflicts,[]);assert.equal(merged.blocks[0].content,'本页改了正文');assert.equal(merged.blocks[0].title,'另一页面修改标题');
 assert.equal(merged.blocks[1].status,'tracking');assert.equal(merged.blocks[1].questionRevision,9);
 assert.deepEqual(merged.blocks[1].answers!.map(a=>a.content),['本页补充第一位回答','另一页面记录第二位回答']);
 assert.equal(merged.blocks[2].id,'extra');assert.deepEqual(base,[note(),question()],'merge never mutates the baseline');
});

test('only real conflicts need a choice and neither choice discards unrelated edits',async()=>{
 const base=[note()],local=[{...note(),content:'本页版本'}],remote=[{...note(),title:'服务器新标题',content:'服务器版本'}];
 let writes=0;
 await assert.rejects(saveNotebook({base,local,read:async()=>({record:{revision:8},blocks:remote}),write:async()=>{writes++;throw Error('must not write');}}),NotebookConflictError);
 assert.equal(writes,0);assert.equal(local[0].content,'本页版本');
 for(const choice of ['local','remote'] as const){
  const result=mergeNotebook(base,local,remote,choice);
  assert.equal(result.conflicts.length,1);assert.equal(result.blocks[0].title,'服务器新标题');
  assert.equal(result.blocks[0].content,choice==='local'?'本页版本':'服务器版本');
 }
});

test('moving or removing a section preserves other authors additions; removal versus edit requires a choice',()=>{
 const base=[note('a'),note('b'),note('c')],local=[base[2],base[0]],remote=[base[0],note('new','新内容'),base[1],base[2]];
 const result=mergeNotebook(base,local,remote);assert.deepEqual(result.conflicts,[]);
 assert.deepEqual(result.blocks.map(b=>b.id),['c','a','new']);
 const edited=clone(base);edited[1].content='另一页面改了即将移除的段落';
 assert.ok(mergeNotebook(base,local,edited).conflicts.length);
 assert.ok(mergeNotebook(base,local,edited,'remote').blocks.some(b=>b.id==='b'&&b.content===edited[1].content));
 assert.ok(!mergeNotebook(base,local,edited,'local').blocks.some(b=>b.id==='b'));
});

test('a save racing another request retries against the new revision and latest question state',async()=>{
 const base=[note(),question()],local=clone(base);local[0].content='需要保存的文字';
 let server={record:{revision:4},blocks:clone(base)},writes=0;
 const saved=await saveNotebook({base,local,read:async()=>clone(server),write:async body=>{
  writes++;
  if(writes===1){server.record.revision++;server.blocks[1].status='resolved';server.blocks[1].questionRevision=12;throw Object.assign(Error('race'),{status:409});}
  assert.equal(body.revision,5);assert.equal(body.blocks[1].questionRevision,12);assert.equal(body.blocks[1].status,'resolved');
  return {blocks:body.blocks,revision:6};
 }});
 assert.equal(writes,2);assert.equal(saved.blocks[0].content,'需要保存的文字');
});

test('removing a presentation clears obsolete links on independently added questions',()=>{
 const presentation={...note('presentation'),kind:'presentation'};
 const remoteQuestion={...question(),relatedBlockId:presentation.id};
 const result=mergeNotebook([presentation],[],[presentation,remoteQuestion]);
 assert.equal(result.conflicts.length,0);assert.equal(result.blocks.length,1);
 assert.equal(result.blocks[0].id,'question');assert.equal(result.blocks[0].relatedBlockId,undefined);
 assert.equal(remoteQuestion.relatedBlockId,'presentation','server snapshot stays unchanged');
});

test('retry after a lost save response reuses generated question IDs without duplicating questions',async()=>{
 const draft={...question(),questionId:undefined,questionRevision:undefined},base=[{...draft,content:'',answers:[]}],local=[draft];
 const committed={...draft,questionId:20,questionRevision:0};
 const saved=await saveNotebook({base,local,read:async()=>({record:{revision:3},blocks:[committed]}),write:async body=>{
  assert.equal(body.blocks[0].questionId,20);assert.equal(body.blocks[0].questionRevision,0);return {revision:4,blocks:body.blocks};
 }});
 assert.equal(saved.blocks[0].questionId,20);
});

test('permission and network failures preserve the draft and are not retried as conflicts',async()=>{
 const base=[note()],local=[{...note(),content:'网络失败也不能丢失'}];let writes=0;
 await assert.rejects(saveNotebook({base,local,read:async()=>({record:{revision:2},blocks:base}),write:async()=>{writes++;throw Object.assign(Error('没有权限'),{status:403});}}),/没有权限/);
 assert.equal(writes,1);assert.equal(local[0].content,'网络失败也不能丢失');
});
