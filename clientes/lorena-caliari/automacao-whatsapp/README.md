# Agente de WhatsApp com agenda (n8n) · Lorena Caliari Estética Avançada

Atendente virtual no WhatsApp da clínica. A Lorena é a única profissional, então o agente cuida da recepção: recebe os leads, tira dúvidas, consulta a agenda, agenda, remarca e cancela no Google Agenda e chama a Lorena quando a conversa precisa dela.

## Arquivos
| Arquivo | O que é |
|---|---|
| `workflows/01-agente-whatsapp.json` | Workflow principal: WhatsApp → planilha de leads → agente de IA → resposta. **É o que fica ativo.** |
| `workflows/02-ferramentas-agenda.json` | Sub-workflow chamado pelas ferramentas do agente: consultar horários, agendar, listar, cancelar, chamar a Lorena. **Precisa ser publicado** (no n8n 2.x, sub-workflow não publicado não pode ser chamado). |
| `planilha-leads-modelo.csv` | Cabeçalho da planilha de leads (importar no Google Planilhas, aba `Leads`). |
| `src/` | Código de cada nó "Code" e o prompt do agente. **Edite aqui**, não nos JSON. |
| `scripts/gerar-workflows.mjs` | Monta os dois JSON a partir de `src/` (`npm run gerar`). |
| `tests/` | Testes da lógica de agenda, dos comandos e da estrutura dos JSON (`npm test`). |

## Como funciona

```
WhatsApp (API oficial)
  └─ Normalizar ── ignora status de entrega, reações e figurinhas
       ├─ comando da Lorena (#pausar / #retomar) → planilha → confirma para ela
       ├─ áudio → baixa → transcreve (Whisper) ─┐
       └─ texto, imagem, botão ────────────────┴─ Mensagem pronta
            → Buscar lead (planilha) → Situação do lead → Registrar lead
            → Assistente ativo? (a Lorena não pausou este número)
            → Agente de atendimento (GPT-4o-mini + memória por telefone)
                 ferramentas → workflow 02:
                   consultar_horarios · agendar · listar_meus_agendamentos
                   cancelar_agendamento · chamar_lorena
            → Responder paciente
```

### Regras que ficam no código (não dependem da IA)
- **Horários livres** são calculados pelo workflow 02: expediente, duração do procedimento, folga de 15 min entre atendimentos, antecedência mínima e limite de dias. A IA só escolhe entre os horários que recebeu.
- **Sem horário duplicado:** antes de criar o evento, a agenda é consultada de novo.
- **Cada paciente só vê e cancela os próprios agendamentos.** O telefone vai fixo do WhatsApp para as ferramentas (não passa pela IA) e fica gravado no evento.
- **Cancelamento em cima da hora** (menos de 12 h, valor de exemplo) não é feito pelo assistente: ele chama a Lorena.
- **Remarcar** = agendar o novo horário e só depois cancelar o antigo.
- **Chamar a Lorena** pausa o assistente para aquele número (coluna `bot_pausado` = `sim`) e manda um aviso para o WhatsApp pessoal dela, com o link da conversa.
- A Lorena recebe aviso de cada agendamento e cancelamento. O evento também aparece no Google Agenda dela.

### Comandos da Lorena
Do WhatsApp pessoal dela (o número em `LORENA_WHATSAPP`) para o número da clínica:
- `#pausar 5531999999999` — ela assume a conversa; o assistente para de responder esse número.
- `#retomar 5531999999999` — o assistente volta a responder.

Também dá para mudar `bot_pausado` direto na planilha (`sim` ou vazio).

## Implantação passo a passo

### 1. Antes de tudo (com a Lorena)
- Número de WhatsApp da clínica na **API oficial da Meta** (WhatsApp Cloud API). Não use API não oficial: números já foram banidos. Se a Lorena quiser continuar respondendo pelo app WhatsApp Business no mesmo número, confira no cadastro da Meta a opção de usar o app e a API juntos (coexistência).
- Teste primeiro com **um número separado**, nunca com pacientes reais.
- Confirme os itens da seção **Pendências** abaixo.

### 2. Google
1. Crie uma planilha no Google Planilhas com uma aba chamada **`Leads`** e cole o cabeçalho de `planilha-leads-modelo.csv`. Formate a coluna `telefone` como **texto simples**.
2. Na agenda da Lorena: compromissos pessoais, almoço, folgas e férias entram como eventos **Ocupado**. Evento de dia inteiro vem como **Livre** no Google; mude para **Ocupado** para bloquear o dia.
3. Opcional: crie uma agenda separada "Atendimentos" e cole o ID dela em `agendaId` no nó **Config** (workflow 02).

### 3. n8n
1. **Importe o workflow 02** (menu ⋯ > Import from file). Copie o ID dele (o código na URL, depois de `/workflow/`).
2. No workflow 02:
   - nó **Config**: ajuste expediente, durações e regras (estão com valores de EXEMPLO);
   - nós HTTP de agenda: escolha a credencial **Google Calendar OAuth2 API**;
   - nós **Avisar Lorena**: credencial **WhatsApp API** (token permanente da Meta);
   - nó **Pausar assistente**: credencial do Google Sheets e a planilha `Leads`;
   - salve e **publique** (botão *Publish*). Sem isso, o agente recebe o erro "Workflow is not active". Depois de qualquer mudança no 02, publique de novo.
3. **Importe o workflow 01.** Nele:
   - nas 5 ferramentas (`consultar_horarios`, `agendar`, `listar_meus_agendamentos`, `cancelar_agendamento`, `chamar_lorena`): selecione o workflow 02 no campo *Workflow* (ou cole o ID). Se os campos não aparecerem, clique em atualizar o esquema de entradas;
   - nó **Normalizar**: troque `LORENA_WHATSAPP` pelo número pessoal da Lorena (só dígitos, com 55 e DDD);
   - **WhatsApp Trigger**: credencial *WhatsApp OAuth* (App ID e App Secret da Meta);
   - nós **WhatsApp** e **URL do áudio / Baixar áudio**: credencial *WhatsApp API*;
   - **OpenAI** e **Transcrever áudio**: credencial OpenAI;
   - nós de planilha (**Buscar lead**, **Registrar lead**, **Pausar ou retomar**): planilha `Leads`;
   - complete as informações entre colchetes no prompt do **Agente de atendimento** (endereço, valores, pagamento, política de faltas).
4. Ative o workflow 01. O WhatsApp Trigger registra o webhook na Meta sozinho (o n8n precisa estar num endereço HTTPS público).

### 4. Testes antes de ligar para pacientes
Faça pelo menos estas 3 conversas reais, do número de teste:
1. **Lead novo do site:** "Olá, Lorena! Quero saber mais sobre bioestimuladores." → explica, oferece avaliação, consulta horários, pede nome, confirma e agenda. Conferir o evento no Google Agenda e o aviso no WhatsApp da Lorena.
2. **Remarcar e cancelar:** "Preciso mudar meu horário" → lista, agenda o novo, cancela o antigo. Depois "quero cancelar" → confirma e cancela.
3. **Caso que exige a Lorena:** "Estou grávida, posso fazer skinbooster?" ou um áudio pedindo desconto → não responde sobre o caso, chama a Lorena, pausa. Testar `#retomar`.

Também: mandar duas mensagens seguidas, um áudio, uma foto, e tentar cancelar com outro número um evento que não é dele.

Os testes automáticos da lógica (sem n8n): `npm install` e `npm test`.

### O que já foi verificado
- Testes da lógica de agenda, comandos, áudio e estrutura dos JSON (`npm test`, 21 testes).
- Tipos, versões e nomes de parâmetros dos 54 nós conferidos contra o n8n 2.46.6 instalado.
- Os dois JSON importam no n8n 2.46.6 (`n8n import:workflow`), e o workflow 02 executou de verdade, chamado por outro workflow, nos caminhos que não precisam de credencial (nome faltando, domingo, data inválida), devolvendo a mensagem certa.
- Não testado aqui (precisa das contas reais): Google Agenda, Google Planilhas, WhatsApp, OpenAI e o agente conversando. É o que os 3 testes acima cobrem.

## Limites conhecidos e próximos passos
- **Janela de 24 h da Meta:** mensagem livre só é entregue a quem falou com o número da clínica nas últimas 24 h. Os avisos para a Lorena chegam sempre que ela tiver mandado algo para o número da clínica nesse período (um comando já conta). Para garantir, crie um **modelo de mensagem aprovado** na Meta para os avisos ou troque os nós "Avisar Lorena" por e-mail.
- **Lembrete na véspera** para a paciente: precisa de modelo de mensagem aprovado (fora da janela de 24 h). Próximo workflow sugerido: gatilho diário às 18 h → lista eventos de amanhã com `origem = assistente-whatsapp` → envia o modelo.
- **Mensagens picadas:** se a pessoa mandar 3 mensagens seguidas, o agente responde 3 vezes. Melhoria: juntar mensagens com uma espera de poucos segundos (Redis ou tabela do n8n).
- **Memória da conversa** fica na memória do n8n: some ao reiniciar o servidor e não funciona em modo fila. Para produção, trocar por memória Postgres ou Redis (mesma chave: telefone). Os agendamentos não se perdem, ficam no Google Agenda.
- **Agendamentos feitos pela Lorena à mão** não aparecem para o assistente cancelar (não têm o telefone gravado). Ele encaminha para ela.
- **LGPD:** a planilha guarda nome do perfil, telefone e o trecho da última mensagem (até 300 caracteres), que pode conter informação de saúde. Restringir o acesso da planilha à Lorena e informar a política de privacidade no site.
- O modelo é o GPT-4o-mini (barato). Dá para trocar o nó **OpenAI** por outro modelo de chat sem mudar o resto.

## Pendências (dependem da Lorena — não inventar)
- Número oficial da clínica na API da Meta e número pessoal da Lorena (`LORENA_WHATSAPP`).
- Expediente real, pausas e dias de atendimento (nó **Config**).
- Duração de cada procedimento e se há "retorno" (nó **Config**).
- Antecedência mínima para agendar e política de cancelamento (hoje 2 h e 12 h, de exemplo).
- Endereço, valores (ou se continua "valores na avaliação"), formas de pagamento e política de atraso e falta (prompt).
- Revisar a descrição dos tratamentos no prompt (veio do site, também pendente de validação).
- Confirmar com o CRF as regras de publicidade e atendimento em saúde para mensagens automáticas.
