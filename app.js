const STATUS_LABEL = {
  passed: 'Passou',
  failed: 'Falhou',
  timedOut: 'Timeout',
  skipped: 'Pulado',
  interrupted: 'Interrompido',
};

function formatDate(iso) {
  if (!iso) return 'Ainda sem execução registrada';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatDuration(ms) {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function renderSummary(summary) {
  const root = document.getElementById('summary');
  const items = [
    { label: 'Total', value: summary.total ?? 0, className: '' },
    { label: 'Passou', value: summary.passed ?? 0, className: 'ok' },
    { label: 'Falhou', value: summary.failed ?? 0, className: 'fail' },
    { label: 'Console / HTTP', value: summary.consoleErrors ?? 0, className: 'fail' },
  ];

  root.innerHTML = items
    .map(
      (item) => `
      <article class="stat ${item.className}">
        <span class="label">${item.label}</span>
        <span class="value">${item.value}</span>
      </article>`,
    )
    .join('');
}

function kindLabel(kind) {
  if (kind === 'network') return 'Rede';
  if (kind === 'console') return 'Console';
  if (kind === 'pageerror') return 'JS';
  if (kind === 'test') return 'Teste';
  return kind || 'Erro';
}

function renderErrors(errors, title = 'Erros do teste') {
  if (!errors?.length) {
    return `<p class="muted-note">Nenhum erro de ${title.toLowerCase()}.</p>`;
  }

  return `
    <div class="errors">
      ${errors
        .map(
          (err) => `
        <div class="error">
          <div class="error-kind">${escapeHtml(kindLabel(err.kind))}${
            err.status ? ` · HTTP ${escapeHtml(String(err.status))}` : ''
          }</div>
          <pre>${escapeHtml(err.message || 'Erro sem mensagem')}</pre>
          ${
            err.url
              ? `<p class="error-url">${escapeHtml(err.url)}</p>`
              : ''
          }
          ${
            err.body
              ? `<pre class="error-body">${escapeHtml(err.body)}</pre>`
              : ''
          }
        </div>`,
        )
        .join('')}
    </div>`;
}

function renderSteps(steps) {
  if (!steps?.length) {
    return `<p class="muted-note">Sem passos detalhados nesta execução.</p>`;
  }

  return `
    <ul class="steps">
      ${steps
        .map((step) => {
          const status = step.status || 'passed';
          return `
            <li class="${status}">
              <span class="dot ${status}" aria-hidden="true"></span>
              <span>${escapeHtml(step.title || 'Passo')}</span>
            </li>`;
        })
        .join('')}
    </ul>`;
}

function renderProcesses(processes) {
  const list = document.getElementById('process-list');
  const empty = document.getElementById('empty-state');

  if (!processes?.length) {
    list.innerHTML = '';
    empty.hidden = false;
    empty.textContent =
      'Nenhum processo encontrado. Rode `npm run test:status` para gerar o relatório.';
    return;
  }

  empty.hidden = true;
  list.innerHTML = processes
    .map((proc) => {
      const status = proc.status || 'failed';
      return `
        <article class="card">
          <div class="card-head">
            <div>
              <h3>${escapeHtml(proc.title || 'Processo')}</h3>
              <p class="file">${escapeHtml(proc.file || '')} · ${escapeHtml(proc.project || '—')} · ${formatDuration(proc.durationMs)}</p>
            </div>
            <span class="badge ${status}">${STATUS_LABEL[status] || status}</span>
          </div>
          <div class="card-body">
            <div class="block">
              <h4>Processos / passos</h4>
              ${renderSteps(proc.steps)}
            </div>
            <div class="block">
              <h4>Erros do teste</h4>
              ${renderErrors(proc.errors, 'teste')}
            </div>
            <div class="block">
              <h4>Erros de console / rede (ex.: HTTP 400)</h4>
              ${renderErrors(proc.consoleErrors, 'console')}
            </div>
          </div>
        </article>`;
    })
    .join('');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function main() {
  const res = await fetch('./data/latest.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Falha ao carregar latest.json (${res.status})`);
  const data = await res.json();

  document.getElementById('generated-at').textContent = data.generatedAt
    ? `Última execução: ${formatDate(data.generatedAt)}`
    : data.message || 'Ainda sem execução registrada';

  if (data.baseURL) {
    const link = document.getElementById('target-link');
    link.href = data.baseURL;
  }

  renderSummary(data.summary || {});
  renderProcesses(data.processes || []);
}

main().catch((err) => {
  document.getElementById('generated-at').textContent = `Erro ao carregar dados: ${err.message}`;
  document.getElementById('empty-state').hidden = false;
  document.getElementById('empty-state').textContent =
    'Não foi possível ler site/data/latest.json. Gere o relatório com npm run report:status.';
});
