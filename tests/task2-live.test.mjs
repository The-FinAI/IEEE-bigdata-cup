import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Task 2 renders twelve data task states with ranking in the same page',()=>{
  const page=fs.readFileSync('out/task2/index.html','utf8');
  const table=page.split('aria-label="Data publication task status"')[1]?.split('</table>')[0];
  assert.ok(table,'publication table must be present even before any release');
  assert.equal((table.match(/scope="row"/g)||[]).length,12);
  for(const text of ['New York release','News window','Action due','Publication status','Files'])assert.ok(table.includes(text));
  assert.ok(page.includes('Cumulative-return (CR) ranking'));
  assert.ok(page.includes('https://huggingface.co/datasets/CarolynJiang/Market-Neutral-Hedging-live-trading'));
  assert.ok(page.includes('Open public submission records on Hugging Face'));
  assert.ok(page.includes('administrator-only'));
});
