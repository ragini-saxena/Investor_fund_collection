async function loadPartial(selector, file) {
    const element = document.querySelector(selector);

    if (!element) {
        console.warn(`Include target not found: ${selector}`);
        return;
    }

    try {
        const response = await fetch(file);

        if (!response.ok) {
            throw new Error(`Failed to load ${file}: ${response.status}`);
        }

        element.innerHTML = await response.text();

    } catch (error) {
        console.error(`Error loading ${file}:`, error);
    }
}

async function loadPagePartials() {
    await Promise.all([
        loadPartial('[data-include="header"]', 'partials/header.html'),
        loadPartial('[data-include="footer"]', 'partials/footer.html')
    ]);

    // Partials now exist in the DOM.
    // Initialize translation after they have been injected.
    if (window.IFCTranslate && typeof window.IFCTranslate.init === 'function') {
        window.IFCTranslate.init();
    }
}

document.addEventListener('DOMContentLoaded', loadPagePartials);