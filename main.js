const form = document.getElementById('lead-form');
const statusMessage = document.getElementById('form-status');
const downloadLink = document.getElementById('download-link');

function normalizeScriptUrl(value) {
    if (!value) return '';

    const trimmedValue = value.trim();

    if (/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/(exec|dev)$/.test(trimmedValue)) {
        return trimmedValue;
    }

    const libraryMatch = trimmedValue.match(/https:\/\/script\.google\.com\/macros\/library\/d\/([^/]+)\//);
    if (libraryMatch) {
        return `https://script.google.com/macros/s/${libraryMatch[1]}/exec`;
    }

    if (/^[A-Za-z0-9-_]+$/.test(trimmedValue)) {
        return `https://script.google.com/macros/s/${trimmedValue}/exec`;
    }

    return trimmedValue;
}

if (form) {
    const scriptUrl = normalizeScriptUrl(form.dataset.scriptUrl || '');
    const ebookUrl = form.dataset.ebookUrl || '#';
    const consentCheckbox = form.querySelector('input[name="consentimento"]');

    if (downloadLink) {
        downloadLink.href = ebookUrl;
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (downloadLink) {
            downloadLink.style.display = 'none';
        }

        if (!consentCheckbox || !consentCheckbox.checked) {
            statusMessage.textContent = 'Você precisa concordar com a coleta e o uso dos seus dados para continuar.';
            return;
        }

        if (!scriptUrl || !scriptUrl.trim()) {
            statusMessage.textContent = 'Configure a URL do Apps Script no atributo data-script-url do formulário para ativar o envio.';
            return;
        }

        try {
            const parsedScriptUrl = new URL(scriptUrl);
            if (parsedScriptUrl.protocol !== 'https:') {
                throw new Error('URL inválida.');
            }
        } catch (error) {
            statusMessage.textContent = 'A URL do Apps Script informada é inválida.';
            return;
        }

        const formData = new FormData(form);
        const payload = new URLSearchParams(formData).toString();

        statusMessage.textContent = 'Enviando seus dados...';

        try {
            const response = await fetch(scriptUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: payload,
                mode: 'cors'
            });

            const responseText = await response.text();
            const normalizedText = responseText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            const isBackendError = !response.ok || /TypeError|Exception|Erro|Cannot read properties|appendRow/.test(normalizedText);

            if (isBackendError) {
                throw new Error(normalizedText || 'Erro ao enviar dados.');
            }

            statusMessage.textContent = 'Seu acesso foi liberado com sucesso! Use o botão abaixo para baixar o e-book.';
            if (downloadLink && ebookUrl && !ebookUrl.includes('COLOQUE')) {
                downloadLink.style.display = 'inline-block';
            }

            form.reset();
        } catch (error) {
            const details = error instanceof Error ? error.message : '';
            let message = 'Não foi possível concluir o envio agora. Verifique a URL do Apps Script.';

            if (details.includes('TypeError') || details.includes('appendRow') || details.includes('Cannot read properties')) {
                message = 'O Apps Script retornou um erro interno. Verifique a planilha, a aba e as permissões do script.';
            } else if (details.includes('not authorized') || details.includes('403')) {
                message = 'O Apps Script não está autorizado a receber este envio. Publique o projeto como Web App e permita o acesso.';
            }

            statusMessage.textContent = message;
        }
    });
}