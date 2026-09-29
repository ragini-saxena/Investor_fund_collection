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

const IFC_PROTECTED_PAGES = [
    'investor dashboard.html',
    'investor profile.html',
    'investor logged in page.html',
    'payment 1.html'
];

function protectPage() {
    const currentPage = window.location.pathname
        .split('/')
        .pop()
        .toLowerCase();

    const protectedPage = IFC_PROTECTED_PAGES.some(
        page => page.toLowerCase() === currentPage
    );

    if (!protectedPage) {
        return;
    }

    if (!isInvestorLoggedIn()) {
        window.location.replace('login investor.html');
    }
}

const IFC_TOKEN_KEY = 'ifc_access_token';
const IFC_PROFILE_KEY = 'ifc_profile';

function isInvestorLoggedIn() {
    return Boolean(localStorage.getItem(IFC_TOKEN_KEY));
}

function logoutInvestor() {
    localStorage.removeItem(IFC_TOKEN_KEY);
    localStorage.removeItem(IFC_PROFILE_KEY);

    window.location.replace('home.html');
}

function setupAuthUI() {
    const loggedIn = isInvestorLoggedIn();

    // Header Login / Logout button
    const authButton = document.getElementById('ifcAuthButton');

    if (authButton) {
        if (loggedIn) {
            authButton.textContent = 'Log Out';

            authButton.onclick = function () {
                logoutInvestor();
            };
        } else {
            authButton.textContent = 'Log In';

            authButton.onclick = function () {
                window.location.href = 'login investor.html';
            };
        }
    }

    // Guest-only "Become an Investor" CTA
    const becomeInvestorButton =
        document.getElementById('ifcBecomeInvestorButton');

    if (becomeInvestorButton) {
        becomeInvestorButton.style.display =
            loggedIn ? 'none' : '';
    }
}

async function loadPagePartials() {
    protectPage();

    await Promise.all([
        loadPartial('[data-include="header"]', 'partials/header.html'),
        loadPartial('[data-include="footer"]', 'partials/footer.html'),
        loadPartial('[data-include="admin-sidebar"]', 'partials/admin-sidebar.html')
    ]);

    updateActiveAdminSidebar();
    setupAuthUI();

    if (window.IFCTranslate && typeof window.IFCTranslate.init === 'function') {
        window.IFCTranslate.init();
    }
}

document.addEventListener('DOMContentLoaded', loadPagePartials);