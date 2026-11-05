// Confere os JSON gerados: estão atualizados, os nomes são únicos,
// toda conexão aponta para um nó que existe e todo código compila.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const ler = (f) => readFileSync(new URL(`../workflows/${f}`, import.meta.url), 'utf8');
const ARQUIVOS = ['01-agente-whatsapp.json', '02-ferramentas-agenda.json'];

test('JSON gerados estão em dia com src/', () => {
  const antes = ARQUIVOS.map(ler);
  execFileSync('node', [new URL('../scripts/gerar-workflows.mjs', import.meta.url).pathname]);
  assert.deepEqual(ARQUIVOS.map(ler), antes, 'rode: npm run gerar');
});

for (const arquivo of ARQUIVOS) {
  test(`${arquivo}: estrutura`, () => {
    const wf = JSON.parse(ler(arquivo));
    const nomes = wf.nodes.map((n) => n.name);
    assert.equal(new Set(nomes).size, nomes.length, 'nomes repetidos');
    assert.equal(new Set(wf.nodes.map((n) => n.id)).size, nomes.length, 'ids repetidos');

    const destinos = new Set();
    for (const [de, tipos] of Object.entries(wf.connections)) {
      assert.ok(nomes.includes(de), `origem inexistente: ${de}`);
      for (const saidas of Object.values(tipos)) for (const s of saidas) for (const c of s) {
        assert.ok(nomes.includes(c.node), `destino inexistente: ${c.node}`);
        destinos.add(c.node);
      }
    }
    // Todo nó (menos gatilho e notas) recebe alguma conexão ou é sub-nó de IA.
    for (const n of wf.nodes) {
      if (/Trigger|stickyNote/i.test(n.type)) continue;
      const ehSubNo = n.type.startsWith('@n8n/n8n-nodes-langchain.') && !n.type.endsWith('.agent');
      assert.ok(destinos.has(n.name) || ehSubNo, `nó solto: ${n.name}`);
    }

    // Código dos nós compila e referências $('Nó') existem.
    for (const n of wf.nodes.filter((x) => x.type === 'n8n-nodes-base.code')) {
      assert.doesNotThrow(() => new Function('$input', '$', '$json', 'DateTime', n.parameters.jsCode), n.name);
    }
    const texto = JSON.stringify(wf);
    for (const [, ref] of texto.matchAll(/\$\(\\?'([^'\\]+)\\?'\)/g)) {
      assert.ok(nomes.includes(ref), `referência a nó inexistente: ${ref}`);
    }
  });
}

test('Ferramentas do agente passam o telefone fixo (não vem da IA)', () => {
  const wf = JSON.parse(ler('01-agente-whatsapp.json'));
  const tools = wf.nodes.filter((n) => n.type.endsWith('toolWorkflow'));
  assert.equal(tools.length, 5);
  for (const t of tools) {
    assert.match(t.parameters.name || '', /^[a-z_]+$/, `ferramenta sem nome: ${t.name}`);
    const v = t.parameters.workflowInputs.value;
    assert.match(v.telefone, /Situação do lead/);
    assert.doesNotMatch(v.telefone, /fromAI/);
  }
});
