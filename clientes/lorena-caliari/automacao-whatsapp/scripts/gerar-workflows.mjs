// Gera os dois JSON de workflow do n8n a partir dos arquivos em src/.
// Uso: node scripts/gerar-workflows.mjs
// Edite o código dos nós e o prompt em src/ e rode de novo; não edite os JSON à mão.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const ler = (p) => readFileSync(join(raiz, 'src', p), 'utf8');

const uuid = (s) => {
  const h = createHash('sha1').update(s).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

// ---------------------------------------------------------------- ajudantes
const PLANILHA = 'COLE_AQUI_O_ID_DA_PLANILHA';
const SUBWORKFLOW = 'COLE_AQUI_O_ID_DO_WORKFLOW_DE_FERRAMENTAS';
const GOOGLE_API = 'https://www.googleapis.com/calendar/v3';
const GRAPH_API = 'https://graph.facebook.com/v23.0';

function no(nome, type, typeVersion, position, parameters, extra = {}) {
  return { parameters, id: uuid(nome), name: nome, type, typeVersion, position, ...extra };
}
const codigo = (nome, pos, arquivo, porItem = false) =>
  no(nome, 'n8n-nodes-base.code', 2, pos, porItem ? { mode: 'runOnceForEachItem', jsCode: ler(arquivo) } : { jsCode: ler(arquivo) });

const nota = (nome, pos, width, height, content, color = 7) =>
  no(nome, 'n8n-nodes-base.stickyNote', 1, pos, { content, width, height, color });

const condicao = (id, leftValue, operator, rightValue = '') => ({ id: uuid(id), leftValue, rightValue, operator });
const seVerdadeiro = (nome, pos, expr) =>
  no(nome, 'n8n-nodes-base.if', 2.2, pos, {
    conditions: {
      options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
      conditions: [condicao(nome, expr, { type: 'boolean', operation: 'true', singleValue: true })],
      combinator: 'and',
    },
    options: {},
  });

const desvio = (nome, pos, campo, saidas) =>
  no(nome, 'n8n-nodes-base.switch', 3.2, pos, {
    rules: {
      values: saidas.map((s) => ({
        conditions: {
          options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
          conditions: [condicao(`${nome}-${s}`, `={{ $json.${campo} }}`, { type: 'string', operation: 'equals' }, s)],
          combinator: 'and',
        },
        renameOutput: true,
        outputKey: s,
      })),
    },
    options: {},
  });

const googleHttp = (nome, pos, method, url, extra = {}, opcoes = {}) =>
  no(nome, 'n8n-nodes-base.httpRequest', 4.2, pos, {
    method,
    url,
    authentication: 'predefinedCredentialType',
    nodeCredentialType: 'googleCalendarOAuth2Api',
    ...extra,
    options: opcoes,
  });
const corpoJson = (expr) => ({ sendBody: true, specifyBody: 'json', jsonBody: `={{ JSON.stringify(${expr}) }}` });
const query = (pares) => ({ sendQuery: true, queryParameters: { parameters: pares.map(([name, value]) => ({ name, value })) } });

const whatsapp = (nome, pos, phoneNumberId, para, texto, extra = {}) =>
  no(nome, 'n8n-nodes-base.whatsApp', 1, pos, {
    resource: 'message',
    operation: 'send',
    phoneNumberId,
    recipientPhoneNumber: para,
    textBody: texto,
    additionalFields: {},
  }, extra);

const colunaSchema = (id) => ({ id, displayName: id, required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true, removed: false });
const planilhaUpsert = (nome, pos, valores, extra = {}) =>
  no(nome, 'n8n-nodes-base.googleSheets', 4.5, pos, {
    operation: 'appendOrUpdate',
    documentId: { __rl: true, value: PLANILHA, mode: 'id' },
    sheetName: { __rl: true, value: 'Leads', mode: 'name' },
    columns: {
      mappingMode: 'defineBelow',
      value: valores,
      matchingColumns: ['telefone'],
      schema: Object.keys(valores).map(colunaSchema),
      attemptToConvertTypes: false,
      convertFieldsToString: true,
    },
    options: { cellFormat: 'RAW' },
  }, extra);

const liga = (conexoes, de, para, saida = 0, tipo = 'main') => {
  conexoes[de] ??= {};
  conexoes[de][tipo] ??= [];
  while (conexoes[de][tipo].length <= saida) conexoes[de][tipo].push([]);
  conexoes[de][tipo][saida].push({ node: para, type: tipo, index: 0 });
};

// ===================================================== 02 · ferramentas da agenda
const ENTRADAS = ['acao', 'telefone', 'nome', 'procedimento', 'data_inicio', 'data_fim', 'inicio', 'evento_id', 'motivo', 'phone_number_id', 'lorena_whatsapp'];

function ferramentas() {
  const cfgExpr = "$('Config').first().json";
  const calUrl = `${GOOGLE_API}/calendars/{{ encodeURIComponent(${cfgExpr}.cfg.agendaId) }}/events`;
  const avisar = (nome, pos, textoExpr) =>
    whatsapp(nome, pos, `={{ ${cfgExpr}.phone_number_id }}`, `={{ ${cfgExpr}.lorena_whatsapp }}`, `={{ ${textoExpr} }}`,
      { onError: 'continueRegularOutput' });

  const nodes = [
    nota('Nota: configuração', [-260, -260], 620, 320,
      '## Ferramentas da agenda · Lorena Caliari\nEste workflow é chamado pelas ferramentas do agente (workflow 01). Não precisa ser ativado.\n\n1. Ajuste expediente, durações e regras no nó **Config** (valores de EXEMPLO).\n2. Selecione a credencial **Google Calendar OAuth2** em todos os nós HTTP.\n3. Selecione a credencial **WhatsApp** nos nós "Avisar Lorena".\n4. No nó **Pausar assistente**, escolha a planilha de leads (aba "Leads").\n5. Copie o ID deste workflow (na URL) e cole nas 5 ferramentas do workflow 01.', 4),
    no('Quando chamado pelo agente', 'n8n-nodes-base.executeWorkflowTrigger', 1.1, [0, 400], {
      workflowInputs: { values: ENTRADAS.map((name) => ({ name, type: 'string' })) },
    }),
    codigo('Config', [220, 400], 'agenda/config.js'),
    desvio('Ação', [440, 400], 'acao', ['consultar', 'agendar', 'listar', 'cancelar', 'chamar_lorena']),

    // consultar
    codigo('Montar consulta', [700, 0], 'agenda/montar-consulta.js'),
    googleHttp('Livre/ocupado (consulta)', [920, 0], 'POST', `${GOOGLE_API}/freeBusy`, corpoJson('$json.freebusy')),
    codigo('Calcular horários livres', [1140, 0], 'agenda/calcular-horarios.js'),

    // agendar
    codigo('Validar pedido', [700, 240], 'agenda/validar-pedido.js'),
    seVerdadeiro('Pedido válido?', [920, 240], '={{ $json.ok }}'),
    googleHttp('Livre/ocupado (agendar)', [1140, 200], 'POST', `${GOOGLE_API}/freeBusy`, corpoJson('$json.freebusy')),
    codigo('Conferir conflito', [1360, 200], 'agenda/conferir-conflito.js'),
    seVerdadeiro('Horário livre?', [1580, 200], '={{ $json.livre }}'),
    googleHttp('Criar evento', [1800, 160], 'POST', `=${calUrl}`, corpoJson("$('Validar pedido').first().json.evento")),
    avisar('Avisar Lorena (agendamento)', [2020, 160], "$('Validar pedido').first().json.aviso_lorena"),
    codigo('Retorno agendado', [2240, 160], 'agenda/retorno-agendado.js'),
    codigo('Devolver mensagem', [2020, 440], 'agenda/devolver.js'),

    // listar
    googleHttp('Buscar agendamentos', [700, 560], 'GET', `=${calUrl}`, query([
      ['privateExtendedProperty', '=telefone={{ $json.telefone }}'],
      ['timeMin', '={{ $now.toISO() }}'],
      ['singleEvents', 'true'],
      ['orderBy', 'startTime'],
      ['maxResults', '10'],
    ])),
    codigo('Formatar agendamentos', [920, 560], 'agenda/formatar-agendamentos.js'),

    // cancelar
    googleHttp('Buscar evento', [700, 780], 'GET', `=${calUrl}/{{ encodeURIComponent($json.evento_id || 'sem-id') }}`, {},
      { response: { response: { fullResponse: true, neverError: true } } }),
    codigo('Conferir dono', [920, 780], 'agenda/conferir-dono.js'),
    seVerdadeiro('Pode cancelar?', [1140, 780], '={{ $json.ok }}'),
    googleHttp('Apagar evento', [1360, 740], 'DELETE', `=${calUrl}/{{ encodeURIComponent($json.evento_id) }}`, query([['sendUpdates', 'none']])),
    avisar('Avisar Lorena (cancelamento)', [1580, 740], "$('Conferir dono').first().json.aviso_lorena"),
    codigo('Retorno cancelado', [1800, 740], 'agenda/retorno-cancelado.js'),

    // chamar a Lorena
    codigo('Montar chamado', [700, 1000], 'agenda/montar-chamado.js'),
    planilhaUpsert('Pausar assistente', [920, 1000], {
      telefone: '={{ $json.telefone }}',
      bot_pausado: 'sim',
      observacao: "={{ $json.agora + ' · ' + $json.motivo }}",
    }, { onError: 'continueRegularOutput' }),
    avisar('Avisar Lorena (atendimento)', [1140, 1000], "$('Montar chamado').first().json.aviso_lorena"),
    codigo('Retorno chamado', [1360, 1000], 'agenda/retorno-chamado.js'),
  ];

  const c = {};
  liga(c, 'Quando chamado pelo agente', 'Config');
  liga(c, 'Config', 'Ação');
  liga(c, 'Ação', 'Montar consulta', 0);
  liga(c, 'Ação', 'Validar pedido', 1);
  liga(c, 'Ação', 'Buscar agendamentos', 2);
  liga(c, 'Ação', 'Buscar evento', 3);
  liga(c, 'Ação', 'Montar chamado', 4);
  liga(c, 'Montar consulta', 'Livre/ocupado (consulta)');
  liga(c, 'Livre/ocupado (consulta)', 'Calcular horários livres');
  liga(c, 'Validar pedido', 'Pedido válido?');
  liga(c, 'Pedido válido?', 'Livre/ocupado (agendar)', 0);
  liga(c, 'Pedido válido?', 'Devolver mensagem', 1);
  liga(c, 'Livre/ocupado (agendar)', 'Conferir conflito');
  liga(c, 'Conferir conflito', 'Horário livre?');
  liga(c, 'Horário livre?', 'Criar evento', 0);
  liga(c, 'Horário livre?', 'Devolver mensagem', 1);
  liga(c, 'Criar evento', 'Avisar Lorena (agendamento)');
  liga(c, 'Avisar Lorena (agendamento)', 'Retorno agendado');
  liga(c, 'Buscar agendamentos', 'Formatar agendamentos');
  liga(c, 'Buscar evento', 'Conferir dono');
  liga(c, 'Conferir dono', 'Pode cancelar?');
  liga(c, 'Pode cancelar?', 'Apagar evento', 0);
  liga(c, 'Pode cancelar?', 'Devolver mensagem', 1);
  liga(c, 'Apagar evento', 'Avisar Lorena (cancelamento)');
  liga(c, 'Avisar Lorena (cancelamento)', 'Retorno cancelado');
  liga(c, 'Montar chamado', 'Pausar assistente');
  liga(c, 'Pausar assistente', 'Avisar Lorena (atendimento)');
  liga(c, 'Avisar Lorena (atendimento)', 'Retorno chamado');

  return {
    name: 'Lorena Caliari · 02 Ferramentas da agenda',
    nodes,
    connections: c,
    active: false,
    settings: { executionOrder: 'v1', callerPolicy: 'workflowsFromSameOwner' },
    pinData: {},
  };
}

// ===================================================== 01 · agente do WhatsApp
function agente() {
  const lead = "$('Situação do lead').item.json";
  const fromAI = (chave, desc) => `={{ $fromAI('${chave}', '${desc.replace(/'/g, "\\'")}', 'string') }}`;
  const fixos = { telefone: `={{ ${lead}.telefone }}`, phone_number_id: `={{ ${lead}.phone_number_id }}`, lorena_whatsapp: `={{ ${lead}.lorena_whatsapp }}` };
  const PROC = 'Um destes: avaliacao, retorno, bioestimuladores, skinbooster, harmonizacao_facial, limpeza_de_pele, peeling, microagulhamento. Paciente nova: avaliacao.';

  const ferramenta = (nome, pos, descricao, valores) =>
    no(nome, '@n8n/n8n-nodes-langchain.toolWorkflow', 2.1, pos, {
      description: descricao,
      workflowId: { __rl: true, value: SUBWORKFLOW, mode: 'id' },
      workflowInputs: {
        mappingMode: 'defineBelow',
        value: valores,
        matchingColumns: [],
        schema: ENTRADAS.map((id) => ({ ...colunaSchema(id), canBeUsedToMatch: false, removed: !(id in valores) })),
        attemptToConvertTypes: false,
        convertFieldsToString: false,
      },
    });

  const norm = "$('Normalizar').item.json";
  const nodes = [
    nota('Nota: como configurar', [-300, -320], 700, 420,
      '## Agente de WhatsApp · Lorena Caliari Estética Avançada\nRecebe os leads no WhatsApp (API oficial da Meta), registra na planilha, tira dúvidas, consulta a agenda, agenda, remarca e cancela no Google Agenda e chama a Lorena quando precisa.\n\n1. Importe antes o workflow **02 Ferramentas da agenda** e copie o ID dele.\n2. Cole o ID nas 5 ferramentas (consultar_horarios, agendar, listar_meus_agendamentos, cancelar_agendamento, chamar_lorena).\n3. No nó **Normalizar**, troque `LORENA_WHATSAPP` pelo número pessoal da Lorena.\n4. Credenciais: WhatsApp Trigger, WhatsApp, OpenAI, Google Sheets.\n5. Escolha a planilha nos nós de planilha (aba "Leads").\n6. Teste com um número separado antes de ativar.\n\nComandos da Lorena (do número pessoal para o número da clínica):\n`#pausar 5531999999999` · `#retomar 5531999999999`', 4),
    no('WhatsApp Trigger', 'n8n-nodes-base.whatsAppTrigger', 1, [0, 300], { updates: ['messages'] }, { webhookId: uuid('webhook-whatsapp-lorena') }),
    codigo('Normalizar', [220, 300], 'agente/normalizar.js'),
    desvio('Rota', [440, 300], 'rota', ['comando', 'audio', 'texto']),

    // comandos da Lorena
    seVerdadeiro('Comando válido?', [680, 40], '={{ $json.comando_valido }}'),
    planilhaUpsert('Pausar ou retomar', [900, -20], {
      telefone: '={{ $json.comando_alvo }}',
      bot_pausado: '={{ $json.comando_pausar }}',
    }),
    whatsapp('Responder Lorena', [1120, 40], `={{ ${norm}.phone_number_id }}`, `={{ ${norm}.telefone }}`, `={{ ${norm}.resposta_comando }}`),

    // áudio
    no('URL do áudio', 'n8n-nodes-base.httpRequest', 4.2, [680, 300], {
      url: `=${GRAPH_API}/{{ $json.midia_id }}`,
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'whatsAppApi',
      options: {},
    }, { onError: 'continueRegularOutput' }),
    no('Baixar áudio', 'n8n-nodes-base.httpRequest', 4.2, [900, 300], {
      url: '={{ $json.url }}',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'whatsAppApi',
      options: { response: { response: { responseFormat: 'file' } } },
    }, { onError: 'continueRegularOutput' }),
    codigo('Nomear arquivo', [1120, 300], 'agente/nomear-audio.js', true),
    no('Transcrever áudio', 'n8n-nodes-base.httpRequest', 4.2, [1340, 300], {
      method: 'POST',
      url: 'https://api.openai.com/v1/audio/transcriptions',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'openAiApi',
      sendBody: true,
      contentType: 'multipart-form-data',
      bodyParameters: {
        parameters: [
          { parameterType: 'formBinaryData', name: 'file', inputDataFieldName: 'data' },
          { name: 'model', value: 'whisper-1' },
          { name: 'language', value: 'pt' },
        ],
      },
      options: {},
    }, { onError: 'continueRegularOutput' }),
    codigo('Texto do áudio', [1560, 300], 'agente/texto-audio.js', true),

    // conversa
    no('Mensagem pronta', 'n8n-nodes-base.noOp', 1, [1780, 520], {}),
    no('Buscar lead', 'n8n-nodes-base.googleSheets', 4.5, [2000, 520], {
      operation: 'read',
      documentId: { __rl: true, value: PLANILHA, mode: 'id' },
      sheetName: { __rl: true, value: 'Leads', mode: 'name' },
      filtersUI: { values: [{ lookupColumn: 'telefone', lookupValue: '={{ $json.telefone }}' }] },
      options: {},
    }, { alwaysOutputData: true }),
    codigo('Situação do lead', [2220, 520], 'agente/situacao-lead.js'),
    planilhaUpsert('Registrar lead', [2440, 520], {
      telefone: '={{ $json.telefone }}',
      nome_whatsapp: '={{ $json.nome }}',
      primeiro_contato: '={{ $json.primeiro_contato }}',
      ultimo_contato: '={{ $json.ultimo_contato }}',
      ultima_mensagem: '={{ $json.texto.slice(0, 300) }}',
    }, { onError: 'continueRegularOutput' }),
    no('Assistente ativo?', 'n8n-nodes-base.if', 2.2, [2660, 520], {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
        conditions: [condicao('assistente-ativo', `={{ ${lead}.bot_pausado }}`, { type: 'boolean', operation: 'false', singleValue: true })],
        combinator: 'and',
      },
      options: {},
    }),
    no('Agente de atendimento', '@n8n/n8n-nodes-langchain.agent', 1.7, [2900, 500], {
      promptType: 'define',
      text: `={{ ${lead}.texto }}`,
      options: { systemMessage: '=' + ler('agente/prompt-sistema.md'), maxIterations: 10 },
    }),
    no('OpenAI', '@n8n/n8n-nodes-langchain.lmChatOpenAi', 1.2, [2700, 780], {
      model: { __rl: true, value: 'gpt-4o-mini', mode: 'list', cachedResultName: 'gpt-4o-mini' },
      options: { temperature: 0.3 },
    }),
    no('Memória da conversa', '@n8n/n8n-nodes-langchain.memoryBufferWindow', 1.3, [2860, 780], {
      sessionIdType: 'customKey',
      sessionKey: `={{ ${lead}.telefone }}`,
      contextWindowLength: 20,
    }),
    ferramenta('consultar_horarios', [3020, 780],
      'Consulta os horários livres na agenda da Lorena para um procedimento, num período de até 14 dias. Use antes de oferecer qualquer horário.', {
        acao: 'consultar',
        ...fixos,
        procedimento: fromAI('procedimento', PROC),
        data_inicio: fromAI('data_inicio', 'Primeiro dia do período, no formato AAAA-MM-DD.'),
        data_fim: fromAI('data_fim', 'Último dia do período, no formato AAAA-MM-DD (no máximo 14 dias depois do início).'),
      }),
    ferramenta('agendar', [3180, 780],
      'Agenda um horário na agenda da Lorena. Só use depois que a paciente confirmar procedimento, dia e horário.', {
        acao: 'agendar',
        ...fixos,
        nome: fromAI('nome', 'Nome completo da paciente.'),
        procedimento: fromAI('procedimento', PROC),
        inicio: fromAI('inicio', 'Código do horário exatamente como veio de consultar_horarios, formato AAAA-MM-DDTHH:MM.'),
      }),
    ferramenta('listar_meus_agendamentos', [3340, 780],
      'Lista os próximos agendamentos desta paciente (deste número de WhatsApp), com o evento_id de cada um.', {
        acao: 'listar',
        ...fixos,
      }),
    ferramenta('cancelar_agendamento', [3500, 780],
      'Cancela um agendamento desta paciente. Só use depois que ela confirmar qual agendamento quer cancelar.', {
        acao: 'cancelar',
        ...fixos,
        evento_id: fromAI('evento_id', 'evento_id do agendamento, como veio de listar_meus_agendamentos.'),
      }),
    ferramenta('chamar_lorena', [3660, 780],
      'Avisa a Lorena para assumir esta conversa pessoalmente e pausa o assistente para esta paciente.', {
        acao: 'chamar_lorena',
        ...fixos,
        nome: `={{ ${lead}.nome }}`,
        motivo: fromAI('motivo', 'Motivo em uma frase. Comece com URGENTE se houver reação ou complicação.'),
      }),
    whatsapp('Responder paciente', [3300, 500], `={{ ${lead}.phone_number_id }}`, `={{ ${lead}.telefone }}`, '={{ $json.output }}'),
  ];

  const c = {};
  liga(c, 'WhatsApp Trigger', 'Normalizar');
  liga(c, 'Normalizar', 'Rota');
  liga(c, 'Rota', 'Comando válido?', 0);
  liga(c, 'Rota', 'URL do áudio', 1);
  liga(c, 'Rota', 'Mensagem pronta', 2);
  liga(c, 'Comando válido?', 'Pausar ou retomar', 0);
  liga(c, 'Comando válido?', 'Responder Lorena', 1);
  liga(c, 'Pausar ou retomar', 'Responder Lorena');
  liga(c, 'URL do áudio', 'Baixar áudio');
  liga(c, 'Baixar áudio', 'Nomear arquivo');
  liga(c, 'Nomear arquivo', 'Transcrever áudio');
  liga(c, 'Transcrever áudio', 'Texto do áudio');
  liga(c, 'Texto do áudio', 'Mensagem pronta');
  liga(c, 'Mensagem pronta', 'Buscar lead');
  liga(c, 'Buscar lead', 'Situação do lead');
  liga(c, 'Situação do lead', 'Registrar lead');
  liga(c, 'Registrar lead', 'Assistente ativo?');
  liga(c, 'Assistente ativo?', 'Agente de atendimento', 0);
  liga(c, 'Agente de atendimento', 'Responder paciente');
  liga(c, 'OpenAI', 'Agente de atendimento', 0, 'ai_languageModel');
  liga(c, 'Memória da conversa', 'Agente de atendimento', 0, 'ai_memory');
  for (const t of ['consultar_horarios', 'agendar', 'listar_meus_agendamentos', 'cancelar_agendamento', 'chamar_lorena']) {
    liga(c, t, 'Agente de atendimento', 0, 'ai_tool');
  }

  return {
    name: 'Lorena Caliari · 01 Agente de WhatsApp',
    nodes,
    connections: c,
    active: false,
    settings: { executionOrder: 'v1' },
    pinData: {},
  };
}

// ---------------------------------------------------------------- gravar
const pasta = join(raiz, 'workflows');
mkdirSync(pasta, { recursive: true });
for (const [arquivo, wf] of [['01-agente-whatsapp.json', agente()], ['02-ferramentas-agenda.json', ferramentas()]]) {
  writeFileSync(join(pasta, arquivo), JSON.stringify(wf, null, 2) + '\n');
  console.log(`${arquivo}: ${wf.nodes.length} nós`);
}
