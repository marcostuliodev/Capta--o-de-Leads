const form = document.getElementById('lead-form');
const statusMessage = document.getElementById('form-status');
const downloadLink = document.getElementById('download-link');

if (form) {
    const scriptUrl = form.dataset.scriptUrl || '';
    const ebookUrl = form.dataset.ebookUrl || '#';

    if (downloadLink) {
        downloadLink.href = ebookUrl;
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!scriptUrl || scriptUrl.includes('COLOQUE_A_URL')) {
            statusMessage.textContent = 'Configure a URL do Apps Script no atributo data-script-url do formulário para ativar o envio.';
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

            if (!response.ok) {
                throw new Error('Erro ao enviar dados.');
            }

            statusMessage.textContent = 'Seu acesso foi liberado com sucesso! Use o botão abaixo para baixar o e-book.';
            if (downloadLink && ebookUrl && !ebookUrl.includes('COLOQUE')) {
                downloadLink.style.display = 'inline-block';
            }

            form.reset();
        } catch (error) {
            statusMessage.textContent = 'Não foi possível concluir o envio agora. Verifique a URL do Apps Script.';
        }
    });
}