/* The Daily Grind Café - shared JavaScript
   Features: active nav link, menu ordering (cart), form validation. */
'use strict';

document.addEventListener('DOMContentLoaded', function () {
    highlightActiveNav();
    initSearch();
    if (document.querySelector('[data-page="menu"]')) initOrdering();
    document.querySelectorAll('form[data-validate]').forEach(initFormValidation);
});

/* ---------- 1. Highlight the current page in the nav ---------- */
function highlightActiveNav() {
    var current = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('nav a').forEach(function (link) {
        var target = link.getAttribute('href').split('/').pop();
        if (target === current) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
            link.style.fontWeight = 'bold';
        }
    });
}

/* ---------- 2. Menu ordering ---------- */
var ORDER_KEY = 'dailyGrindOrder';
var order = loadOrder();               // { "Item name": { price: 38, qty: 2 } }

function loadOrder() {
    try { return JSON.parse(localStorage.getItem(ORDER_KEY)) || {}; }
    catch (e) { return {}; }
}
function saveOrder() {
    try { localStorage.setItem(ORDER_KEY, JSON.stringify(order)); } catch (e) { /* ignore */ }
}
function formatRand(amount) {
    return 'R' + amount.toFixed(2);
}

function initOrdering() {
    var main = document.querySelector('main');
    var panel = buildOrderPanel();
    main.appendChild(panel);

    main.querySelectorAll('button[type="button"]').forEach(function (btn) {
        if (btn.closest('#order-panel')) return;
        btn.addEventListener('click', function () {
            var card = btn.closest('div');
            var name = card.querySelector('h3').textContent.trim();
            var match = card.querySelector('strong').textContent.match(/R\s*([\d.,]+)/);
            var price = match ? parseFloat(match[1].replace(',', '.')) : 0;

            if (order[name]) order[name].qty += 1;
            else order[name] = { price: price, qty: 1 };

            saveOrder();
            renderOrder();

            btn.textContent = 'Added ✓';
            btn.disabled = true;
            setTimeout(function () { btn.textContent = 'Add to Order'; btn.disabled = false; }, 800);
        });
    });

    renderOrder();
}

function buildOrderPanel() {
    var panel = document.createElement('aside');
    panel.id = 'order-panel';
    panel.setAttribute('aria-live', 'polite');
    panel.innerHTML =
        '<hr><h2>Your Order</h2>' +
        '<p id="order-empty">Your order is empty. Add something tasty!</p>' +
        '<ul id="order-list"></ul>' +
        '<p><strong id="order-total"></strong></p>' +
        '<p id="order-actions">' +
        '<button type="button" id="order-place">Place Order</button> ' +
        '<button type="button" id="order-clear">Clear Order</button></p>' +
        '<p id="order-message" role="status"></p>';

    panel.querySelector('#order-clear').addEventListener('click', function () {
        order = {}; saveOrder(); renderOrder();
        panel.querySelector('#order-message').textContent = '';
    });
    panel.querySelector('#order-place').addEventListener('click', function () {
        var summary = orderSummary();
        order = {}; saveOrder(); renderOrder();
        panel.querySelector('#order-message').textContent =
            'Thank you! Your order of ' + summary.count + ' item(s) totalling ' +
            formatRand(summary.total) + ' has been received.';
    });
    return panel;
}

function orderSummary() {
    var count = 0, total = 0;
    Object.keys(order).forEach(function (name) {
        count += order[name].qty;
        total += order[name].qty * order[name].price;
    });
    return { count: count, total: total };
}

function renderOrder() {
    var list = document.getElementById('order-list');
    list.innerHTML = '';

    Object.keys(order).forEach(function (name) {
        var item = order[name];
        var li = document.createElement('li');
        li.append(name + ' × ' + item.qty + ' — ' + formatRand(item.qty * item.price) + ' ');

        li.append(makeQtyButton('−', 'Remove one ' + name, function () {
            item.qty -= 1;
            if (item.qty <= 0) delete order[name];
            saveOrder(); renderOrder();
        }));
        li.append(makeQtyButton('+', 'Add one ' + name, function () {
            item.qty += 1; saveOrder(); renderOrder();
        }));
        list.appendChild(li);
    });

    var summary = orderSummary();
    var empty = summary.count === 0;
    document.getElementById('order-empty').hidden = !empty;
    document.getElementById('order-actions').hidden = empty;
    document.getElementById('order-total').textContent =
        empty ? '' : 'Total (' + summary.count + ' items): ' + formatRand(summary.total);
}

function makeQtyButton(label, ariaLabel, onClick) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.setAttribute('aria-label', ariaLabel);
    b.addEventListener('click', onClick);
    return b;
}

/* ---------- 3. Form validation (contact + enquiry) ---------- */
function initFormValidation(form) {
    form.noValidate = true;            // use our own messages instead of browser pop-ups

    var status = document.createElement('p');
    status.setAttribute('role', 'status');
    form.appendChild(status);

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        var firstBad = null;

        form.querySelectorAll('input[required], textarea[required], select[required]').forEach(function (field) {
            var message = validateField(field);
            showFieldError(field, message);
            if (message && !firstBad) firstBad = field;
        });

        if (firstBad) {
            status.textContent = 'Please fix the highlighted fields and try again.';
            firstBad.focus();
            return;
        }

        var who = form.querySelector('input[type="text"]').value.trim();
        status.textContent = 'Thank you, ' + who + '! Your ' +
            (form.dataset.validate || 'message') + ' has been sent. We will be in touch soon.';
        form.reset();
        form.querySelectorAll('.field-error').forEach(function (e) { e.remove(); });
    });

    // Clear an error as soon as the user fixes the field
    form.addEventListener('input', function (event) {
        if (event.target.matches('input, textarea, select')) {
            showFieldError(event.target, validateField(event.target));
        }
    });
}

function validateField(field) {
    var value = field.value.trim();
    if (value === '') return 'This field is required.';
    if (field.type === 'text' && value.length < 2) return 'Please enter at least 2 characters.';
    if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
        return 'Please enter a valid email address (e.g. name@example.com).';
    }
    if (field.tagName === 'TEXTAREA' && value.length < 10) {
        return 'Please write at least 10 characters.';
    }
    return '';
}

function showFieldError(field, message) {
    var existing = field.parentElement.querySelector('.field-error');
    if (existing) existing.remove();
    field.removeAttribute('aria-invalid');
    field.style.outline = '';

    if (message) {
        var span = document.createElement('span');
        span.className = 'field-error';
        span.setAttribute('role', 'alert');
        span.style.color = '#b00020';
        span.style.display = 'block';
        span.textContent = message;
        field.insertAdjacentElement('afterend', span);
        field.setAttribute('aria-invalid', 'true');
        field.style.outline = '2px solid #b00020';
    }
}

/* ---------- 4. Click-to-enlarge pictures (lightbox) ---------- */
document.addEventListener('DOMContentLoaded', initLightbox);

function initLightbox() {
    var overlay = document.createElement('div');
    overlay.id = 'lightbox';
    overlay.hidden = true;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Enlarged picture');
    overlay.innerHTML =
        '<button type="button" id="lightbox-close" aria-label="Close picture">&times;</button>' +
        '<figure><img id="lightbox-img" alt="">' +
        '<figcaption id="lightbox-caption"></figcaption></figure>';
    document.body.appendChild(overlay);
    var bigImg = overlay.querySelector('#lightbox-img');
    var caption = overlay.querySelector('#lightbox-caption');
    var closeBtn = overlay.querySelector('#lightbox-close');
    var lastClicked = null;
    function openLightbox(img) {
        lastClicked = img;
        bigImg.src = img.currentSrc || img.src;
        bigImg.alt = img.alt || '';
        var card = img.closest('div');
        var heading = card ? card.querySelector('h3') : null;
        caption.textContent = heading ? heading.textContent.trim() : (img.alt || '');
        overlay.hidden = false;
        document.body.style.overflow = 'hidden';
        closeBtn.focus();
    }
    function closeLightbox() {
        overlay.hidden = true;
        bigImg.src = '';
        document.body.style.overflow = '';
        if (lastClicked) lastClicked.focus();
    }
    document.querySelectorAll('main img, section img').forEach(function (img) {
        img.classList.add('zoomable');
        img.tabIndex = 0;
        img.setAttribute('role', 'button');
        img.addEventListener('click', function () { openLightbox(img); });
        img.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(img); }
        });
    });
    overlay.addEventListener('click', function (e) {
        if (e.target === overlay || e.target === closeBtn) closeLightbox();
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !overlay.hidden) closeLightbox();
    });
}

/* ---------- 5. Search bar (filters the item cards on the page) ---------- */
function initSearch() {
    // Item cards = the <div> blocks that hold an <h3> (index + menu pages)
    var cards = Array.prototype.slice.call(
        document.querySelectorAll('main > div, section > div')
    ).filter(function (card) { return card.querySelector('h3'); });
    if (cards.length === 0) return;               // no items on this page, so no search bar

    // Build the search bar
    var box = document.createElement('div');
    box.id = 'search-box';
    box.setAttribute('role', 'search');
    box.innerHTML =
        '<label for="search-input">Search our items</label> ' +
        '<input type="search" id="search-input" placeholder="e.g. latte, croissant, muffin" autocomplete="off"> ' +
        '<p id="search-status" role="status" aria-live="polite"></p>';

    // Place it above the first group of items
    var group = cards[0].parentElement;
    if (group.tagName === 'SECTION') {
        group.parentElement.insertBefore(box, group);      // menu page: above the first section
    } else {
        group.insertBefore(box, group.firstElementChild);  // home page: above the heading
    }

    var input = box.querySelector('#search-input');
    var status = box.querySelector('#search-status');

    // Pre-compute the searchable text of each card (name + description, not buttons)
    var texts = cards.map(function (card) {
        var parts = [];
        card.querySelectorAll('h3, p').forEach(function (el) { parts.push(el.textContent); });
        return parts.join(' ').toLowerCase();
    });

    function runSearch() {
        var query = input.value.trim().toLowerCase();
        var words = query === '' ? [] : query.split(/\s+/);
        var shown = 0;

        cards.forEach(function (card, i) {
            var match = words.every(function (w) { return texts[i].indexOf(w) !== -1; });
            card.hidden = !match;
            if (match) shown++;
        });

        // Hide whole sections (e.g. "Hot Beverages") that have no matching items
        document.querySelectorAll('main > section').forEach(function (section) {
            var hasCards = section.querySelector('div h3');
            if (hasCards) section.hidden = !section.querySelector('div:not([hidden]) h3');
        });

        if (query === '') status.textContent = '';
        else if (shown === 0) status.textContent = 'No items found for "' + input.value.trim() + '".';
        else status.textContent = 'Showing ' + shown + ' of ' + cards.length + ' items.';
    }

    input.addEventListener('input', runSearch);
    box.addEventListener('submit', function (e) { e.preventDefault(); });
}
