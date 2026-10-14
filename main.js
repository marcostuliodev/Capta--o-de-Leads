const form = document.getElementById('lead-form');
const statusMessage = document.getElementById('form-status');
const downloadLink = document.getElementById('download-link');
const removalForm = document.getElementById('removal-form');
const removalStatus = document.getElementById('removal-status');

let formInteracted = false;
let leadSubmitted = false;
let abandonmentTracked = false;

function trackMetaEvent(eventName) {
    if (typeof window.fbq === 'function') {
        window.fbq('trackCustom', eventName);
    }
}

function normalizeScriptUrl(value) {
    if (!value) return '';
    const trimmedValue = value.trim();
    if (/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/(exec|dev)$/.test(trimmedValue)) return trimmedValue;
    const libraryMatch = trimmedValue.match(/https:\/\/script\.google\.com\/macros\/library\/d\/([^/]+)\//);
    if (libraryMatch) return `https://script.google.com/macros/s/${libraryMatch[1]}/exec`;
    if (/^[A-Za-z0-9-_]+$/.test(trimmedValue)) return `https://script.google.com/macros/s/${trimmedValue}/exec`;
    return trimmedValue;
}

function getDefaultScriptUrl() {
    const anyWithScript = document.querySelector('[data-script-url]');
    if (anyWithScript) return normalizeScriptUrl(anyWithScript.dataset.scriptUrl || '');
    const anyWithRemoval = document.querySelector('[data-removal-url]');
    if (anyWithRemoval) return normalizeScriptUrl(anyWithRemoval.dataset.removalUrl || '');
    return '';
}

if (form) {
    const scriptUrl = normalizeScriptUrl(form.dataset.scriptUrl || '') || getDefaultScriptUrl();
    const ebookUrl = form.dataset.ebookUrl || '#';
    const consentCheckbox = form.querySelector('input[name="consentimento"]');
    if (downloadLink) downloadLink.href = ebookUrl;
    const markFormInteraction = () => {
        if (!formInteracted) {
            formInteracted = true;
            trackMetaEvent('LeadFormStarted');
        }
    };
    form.addEventListener('focusin', markFormInteraction, { once: true });
    form.addEventListener('input', markFormInteraction, { once: true });
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (downloadLink) downloadLink.style.display = 'none';
        if (!consentCheckbox || !consentCheckbox.checked) {
            statusMessage.textContent = 'Você precisa concordar com a coleta e o uso dos seus dados para continuar.';
            statusMessage.className = 'form-status error';
            return;
        }
        if (!scriptUrl || !scriptUrl.trim()) {
            statusMessage.textContent = 'Configure a URL do Apps Script no atributo data-script-url do formulário para ativar o envio.';
            statusMessage.className = 'form-status error';
            return;
        }
        try {
            const parsedScriptUrl = new URL(scriptUrl);
            const isGoogleAppsScript = parsedScriptUrl.protocol === 'https:' && parsedScriptUrl.hostname === 'script.google.com' && /^\/macros\/s\/[^/]+\/(exec|dev)$/.test(parsedScriptUrl.pathname);
            if (!isGoogleAppsScript) throw new Error('URL inválida.');
        } catch (error) {
            statusMessage.textContent = 'A URL do Apps Script informada é inválida.';
            statusMessage.className = 'form-status error';
            return;
        }
        const formData = new FormData(form);
        const payload = new URLSearchParams(formData).toString();
        statusMessage.textContent = 'Enviando seus dados...';
        statusMessage.className = 'form-status';
        form.setAttribute('aria-busy', 'true');
        try {
            const response = await fetch(scriptUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: payload,
                mode: 'cors'
            });
            const responseText = await response.text();
            const normalizedText = responseText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            const isBackendError = !response.ok || /TypeError|Exception|Erro|Cannot read properties|appendRow/.test(normalizedText);
            if (isBackendError) throw new Error(normalizedText || 'Erro ao enviar dados.');
            statusMessage.textContent = 'Seu acesso foi liberado com sucesso! Use o botão abaixo para baixar o e-book.';
            statusMessage.className = 'form-status success';
            leadSubmitted = true;
            if (typeof window.fbq === 'function') window.fbq('track', 'Lead');
            if (downloadLink && ebookUrl) {
                downloadLink.style.display = 'inline-flex';
                downloadLink.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            form.reset();
        } catch (error) {
            const details = error instanceof Error ? error.message : '';
            let message = 'Não foi possível concluir o envio agora. Verifique a URL do Apps Script.';
            if (details.includes('TypeError') || details.includes('appendRow') || details.includes('Cannot read properties')) message = 'O Apps Script retornou um erro interno. Verifique a planilha, a aba e as permissões do script.';
            else if (details.includes('not authorized') || details.includes('403')) message = 'O Apps Script não está autorizado a receber este envio. Publique o projeto como Web App e permita o acesso.';
            statusMessage.textContent = message;
            statusMessage.className = 'form-status error';
        } finally {
            form.removeAttribute('aria-busy');
        }
    });
    window.addEventListener('pagehide', () => {
        if (leadSubmitted || abandonmentTracked) return;
        abandonmentTracked = true;
        trackMetaEvent(formInteracted ? 'LeadFormAbandoned' : 'LeadFormNotStarted');
    });
}

if (removalForm) {
    let removalScriptUrl = normalizeScriptUrl(removalForm.dataset.removalUrl || '');
    if (!removalScriptUrl && form) removalScriptUrl = normalizeScriptUrl(form.dataset.scriptUrl || '');
    if (!removalScriptUrl) removalScriptUrl = getDefaultScriptUrl();
    removalForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!removalScriptUrl || !removalScriptUrl.trim()) {
            removalStatus.textContent = 'Configure a URL do Apps Script para ativar a remoção automática dos dados.';
            removalStatus.className = 'removal-status error';
            return;
        }
        try {
            const parsedScriptUrl = new URL(removalScriptUrl);
            const isGoogleAppsScript = parsedScriptUrl.protocol === 'https:' && parsedScriptUrl.hostname === 'script.google.com' && /^\/macros\/s\/[^/]+\/(exec|dev)$/.test(parsedScriptUrl.pathname);
            if (!isGoogleAppsScript) throw new Error('URL inválida.');
        } catch (error) {
            removalStatus.textContent = 'A URL do Apps Script informada é inválida.';
            removalStatus.className = 'removal-status error';
            return;
        }
        const formData = new FormData(removalForm);
        formData.append('action', 'remove');
        const payload = new URLSearchParams(formData).toString();
        removalStatus.textContent = 'Processando solicitação de exclusão...';
        removalStatus.className = 'removal-status';
        removalForm.setAttribute('aria-busy', 'true');
        try {
            const response = await fetch(removalScriptUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: payload,
                mode: 'cors'
            });
            const responseText = await response.text();
            const normalizedText = responseText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            let data;
            try { data = JSON.parse(normalizedText); } catch (e) { throw new Error(normalizedText || 'Erro ao processar resposta.'); }
            if (!response.ok || data.status === 'error') throw new Error(data.message || 'Erro ao remover dados.');
            if (data.status === 'not_found') {
                removalStatus.textContent = 'Email não encontrado em nossos registros.';
                removalStatus.className = 'removal-status error';
            } else {
                removalStatus.textContent = 'Seus dados foram removidos com sucesso dos nossos registros.';
                removalStatus.className = 'removal-status success';
                removalForm.reset();
            }
        } catch (error) {
            const details = error instanceof Error ? error.message : '';
            let message = 'Não foi possível concluir a solicitação agora. Tente novamente mais tarde.';
            if (details.includes('not authorized') || details.includes('403')) message = 'O Apps Script não está autorizado. Publique o projeto como Web App e permita o acesso.';
            removalStatus.textContent = details || message;
            removalStatus.className = 'removal-status error';
        } finally {
            removalForm.removeAttribute('aria-busy');
        }
    });
}
