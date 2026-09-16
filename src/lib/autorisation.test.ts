import { test } from 'node:test';
import assert from 'node:assert/strict';
import { echapperHtml, htmlAutorisations } from './autorisation.ts';

test('echapperHtml : neutralise le HTML d’un nom d’établissement', () => {
  assert.equal(
    echapperHtml('Collège <script>alert("x")</script> & Cie'),
    'Collège &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; Cie',
  );
});

test('htmlAutorisations : une page par code', () => {
  const html = htmlAutorisations(['ABCDEF2345', 'GHJKLM6789'], {
    etablissement: 'Collège A',
    classe: '6e B',
  });
  assert.equal(html.match(/class="page/g)?.length, 2);
  assert.ok(html.includes('ABCDEF2345'));
  assert.ok(html.includes('GHJKLM6789'));
  assert.ok(html.includes('classe 6e B'));
});

test('htmlAutorisations : la dernière page ne force pas de saut', () => {
  const html = htmlAutorisations(['ABCDEF2345'], { etablissement: 'Collège A', classe: null });
  assert.ok(html.includes('class="page derniere"'));
});

test('htmlAutorisations : sans classe, aucune mention de classe', () => {
  const html = htmlAutorisations(['ABCDEF2345'], { etablissement: 'Collège A', classe: null });
  assert.ok(!html.includes('classe '));
});

test('htmlAutorisations : le nom de l’établissement est échappé', () => {
  const html = htmlAutorisations(['ABCDEF2345'], { etablissement: 'A & <b>B</b>', classe: null });
  assert.ok(html.includes('A &amp; &lt;b&gt;B&lt;/b&gt;'));
  assert.ok(!html.includes('<b>B</b>'));
});
