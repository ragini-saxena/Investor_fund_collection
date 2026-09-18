async function loadPartial(selector, file) {
    const element = document.querySelector(selector);

    if (!element) {
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

function updateActiveAdminSidebar() {
    const sidebar = document.querySelector('[data-include="admin-sidebar"]');
    if (!sidebar) return;

    const currentPath = window.location.pathname.split('/').pop().toLowerCase();
    const links = sidebar.querySelectorAll('.admin-nav-item');

    links.forEach(link => {
        const route = (link.getAttribute('data-admin-page') || link.getAttribute('href') || '').toLowerCase();
        
        const isActive = (
            currentPath === route ||
            (currentPath === '' && route === 'admin-dashboard.html') ||
            (currentPath === 'admin-investor-details.html' && route === 'admin-registered-investors.html') ||
            (currentPath === 'admin-communication-modals.html' && route === 'contact-messaging.html')
        );

        if (isActive) {
            link.classList.add('active', 'text-white', 'bg-[#102340]');
            link.classList.remove('text-slate-400');
        } else {
            link.classList.remove('active', 'text-white', 'bg-[#102340]');
            link.classList.add('text-slate-400');
        }
    });
}

async function loadPagePartials() {
    await Promise.all([
        loadPartial('[data-include="header"]', 'partials/header.html'),
        loadPartial('[data-include="footer"]', 'partials/footer.html'),
        loadPartial('[data-include="admin-sidebar"]', 'partials/admin-sidebar.html')
    ]);

    // Update active admin sidebar styling
    updateActiveAdminSidebar();

    // Partials now exist in the DOM.
    // Initialize translation after they have been injected.
    if (window.IFCTranslate && typeof window.IFCTranslate.init === 'function') {
        window.IFCTranslate.init();
    }
}

document.addEventListener('DOMContentLoaded', loadPagePartials);