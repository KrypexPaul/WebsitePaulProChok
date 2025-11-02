// ------------------ Warenkorb ------------------
let cart = [];
let discountPercent = 0;
let isRedeemed = false;
let wonRewardText = '';

const cartCount = document.getElementById('cartCount');
const cartContainer = document.getElementById('cartContainer');

/* ------------------ BUTTON-ANIMATION (+1) & WARENKORB ------------------ */
function addToCart(btn, name, imgSrc, price) {
    // --- Button-Animation (+1) ---
    const plus = btn.querySelector('.plusOne');
    btn.classList.add('animate');
    plus.classList.remove('hide');

    // kurz anzeigen, dann ausblenden
    setTimeout(() => plus.classList.add('hide'), 420);

    // Entferne animate-Klasse danach, damit Button wieder normal wird
    setTimeout(() => {
        btn.classList.remove('animate');
        plus.classList.remove('hide');
    }, 750);

    // --- Warenkorb-Logik ---
    let item = cart.find(i => i.name === name);
    if (item) item.quantity++;
    else cart.push({ name, img: imgSrc, price, quantity: 1 });

    // Update Zähler
    cartCount.textContent = cart.reduce((a, b) => a + b.quantity, 0);

    // kleine visuelle Rückmeldung am Warenkorb-Icon
    doCartPulse();
}

function doCartPulse() {
    cartContainer.classList.add('pulse');
    setTimeout(() => cartContainer.classList.remove('pulse'), 650);
}

/* ------------------ SCROLL-BUTTON ------------------ */
const scrollTopBtn = document.getElementById('scrollTopBtn');
window.addEventListener('scroll', () => {
    if (window.scrollY > 200) scrollTopBtn.classList.add('show');
    else scrollTopBtn.classList.remove('show');
});
scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ------------------ CHECKOUT OVERLAY ------------------ */
cartContainer.addEventListener('click', () => {
    // Warenkorb-Daten speichern
    localStorage.setItem('checkoutCart', JSON.stringify(cart));

    // Gewinninfos speichern
    localStorage.setItem('wonRewardText', wonRewardText);
    localStorage.setItem('discountPercent', discountPercent);

    // Checkout öffnen
    window.open('checkout.html', '_blank');
});

/* ------------------ CHECKOUT AKTUALISIEREN ------------------ */
function updateCheckout() {
    const itemsDiv = document.getElementById('checkoutItems');
    const totalDiv = document.getElementById('checkoutTotal');
    const discountDiv = document.getElementById('discountDisplay');
    const redeemButton = document.getElementById('redeemButton');
    const winList = document.getElementById('winList');

    itemsDiv.innerHTML = '';
    let total = 0;

    cart.forEach(item => {
        const div = document.createElement('div');
        div.className = 'checkout-item';
        const img = document.createElement('img'); img.src = item.img; div.appendChild(img);
        const spanName = document.createElement('span'); spanName.textContent = item.name + ' (' + item.quantity + 'x)'; div.appendChild(spanName);
        const spanPrice = document.createElement('span'); spanPrice.textContent = (item.price * item.quantity).toFixed(2) + '€'; div.appendChild(spanPrice);
        itemsDiv.appendChild(div);
        total += item.price * item.quantity;
    });

    totalDiv.textContent = 'Gesamt: ' + total.toFixed(2) + '€';

    if (wonRewardText) {
        winList.innerHTML = '';
        const li = document.createElement('li');
        li.textContent = wonRewardText;
        li.style.animation = 'popReward 0.6s forwards';
        winList.appendChild(li);
        // direkt speichern
        localStorage.setItem('wonRewardText', wonRewardText);
        localStorage.setItem('discountPercent', discountPercent);
    }

    redeemButton.addEventListener('click', () => {
        if (!discountPercent && !wonRewardText) return;
        isRedeemed = true;
        redeemButton.textContent = 'Eingelöst';
        redeemButton.classList.add('redeemed');
        localStorage.setItem('wonRewardText', wonRewardText);
        localStorage.setItem('discountPercent', discountPercent);
    });
}

/* ------------------ PAYMENT FORM ANZEIGEN ------------------ */
document.getElementById('proceedPayment').addEventListener('click', () => {
    document.getElementById('proceedPayment').style.display = 'none';
    document.getElementById('paymentForm').style.display = 'flex';
});

/* ------------------ BESTELLUNG ABSCHLIESSEN ------------------ */
document.getElementById('completeOrder').addEventListener('click', () => {
    const name = document.getElementById('name').value.trim();
    const address = document.getElementById('address').value.trim();
    const cardNumber = document.getElementById('cardNumber').value.trim();
    const expiry = document.getElementById('expiry').value.trim();
    const cvv = document.getElementById('cvv').value.trim();

    if (!name || !address || !cardNumber || !expiry || !cvv) {
        alert('Bitte alle Felder korrekt ausfüllen');
        return;
    }
    if (cardNumber.length !== 16 || cvv.length !== 3 || expiry.length !== 5) {
        alert('Bitte gültige Kreditkarteninformationen eingeben');
        return;
    }

    window.postMessage({ action: 'showThankYou' }, '*');
    document.getElementById('paymentForm').reset();
    document.getElementById('paymentForm').style.display = 'none';
    document.getElementById('proceedPayment').style.display = 'flex';
});

/* ------------------ THANK YOU MESSAGE ------------------ */
window.addEventListener('message', event => {
    if (event.data.action === 'showThankYou') {
        const msg = document.getElementById('thankyouMessage');
        msg.classList.add('show');
        setTimeout(() => msg.classList.remove('show'), 4000);
        document.getElementById('checkoutOverlay').style.display = 'none';
        cart = [];
        cartCount.textContent = 0;
        updateCheckout();
    }
});

/* ------------------ MINI-SPIEL ------------------ */
const bombGrid = document.getElementById('bombGrid');
const gameOverMsg = document.getElementById('gameOverMsg');
const bombArea = document.getElementById('bombArea');
const totalFields = 24;
const bombCount = 4;
let bombIndices = [];
let revealedSafeCount = 0;
let gameOver = false;

// zufällige Bomben
while (bombIndices.length < bombCount) {
    const rand = Math.floor(Math.random() * totalFields);
    if (!bombIndices.includes(rand)) bombIndices.push(rand);
}

// Spielfeld erzeugen
for (let i = 0; i < totalFields; i++) {
    const img = document.createElement('img');
    img.src = 'bombe.png';
    img.classList.add('bomb');
    img.dataset.index = i;
    bombGrid.appendChild(img);
}

// Belohnungstext
function getRewardText(count) {
    if (count <= 10) {
        discountPercent = count * 5;
        return discountPercent + '% Rabatt';
    }
    if (count < 20) return '🍫 1 Gratis Schokolade!';
    if (count === 20) return '🎁 Probierpaket GRATIS!';
    return '';
}

// Klick auf Feld
bombGrid.addEventListener('click', e => {
    const target = e.target;
    if (!target.classList.contains('bomb') || gameOver) return;
    const index = parseInt(target.dataset.index);
    target.style.pointerEvents = 'none';

    if (bombIndices.includes(index)) {
        target.src = 'explosion.png';
        target.style.animation = 'explosionAnim 0.8s forwards';
        bombArea.style.backgroundColor = 'rgba(128,128,128,0.5)';
        gameOver = true;
        redeemButton.classList.add('disabled');
        gameOverMsg.classList.add('show');
        return;
    }

    revealedSafeCount++;
    target.src = 'schokolade(1).png';
    target.style.width = '50%';
    target.style.animation = 'popTafel 0.6s forwards';

    const rewardText = getRewardText(revealedSafeCount);
    if (rewardText) {
        const winList = document.getElementById('winList');
        winList.innerHTML = '';
        const li = document.createElement('li');
        li.textContent = rewardText;
        li.style.animation = 'popReward 0.6s forwards';
        winList.appendChild(li);
        wonRewardText = rewardText;

        localStorage.setItem('wonRewardText', wonRewardText);
        localStorage.setItem('discountPercent', discountPercent);
    }
});

/* ------------------ REDEEM BUTTON ------------------ */
redeemButton.addEventListener('click', () => {
    if (isRedeemed || gameOver) return;
    isRedeemed = true;
    redeemButton.textContent = 'Eingelöst';
    redeemButton.classList.add('redeemed');
    localStorage.setItem('wonRewardText', wonRewardText);
    localStorage.setItem('discountPercent', discountPercent);
});

/* ------------------ SCROLL ANIMATION ------------------ */
const faders = document.querySelectorAll('.fade-in');
const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
    });
}, { threshold: 0.2 });
faders.forEach(fader => observer.observe(fader));

/* ------------------ ABOUT US ANIMATION ------------------ */
const aboutText = document.getElementById('aboutText');
const aboutObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) aboutText.classList.add('visible');
    });
}, { threshold: 0.3 });
aboutObserver.observe(aboutText);

/* ------------------ GAME TITLE ANIMATION ------------------ */
const gameTitle = document.getElementById('gameTitle');
const titleObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) gameTitle.classList.add('visible');
    });
}, { threshold: 0.3 });
titleObserver.observe(gameTitle);

const showBtn = document.getElementById('showImpressum');
const impressumPage = document.getElementById('impressumPage');
const closeBtn = document.getElementById('closeImpressum');
const normalSections = document.querySelectorAll('section, #page3-4-wrapper, .checkout-overlay, .thankyou-message');

showBtn.addEventListener('click', (e) => {
    e.preventDefault();
    normalSections.forEach(el => el.style.display = 'none');
    impressumPage.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

closeBtn.addEventListener('click', () => {
    impressumPage.style.display = 'none';
    normalSections.forEach(el => el.style.display = '');
});