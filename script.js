// ------------------ WARENKORB & SESSION ------------------
let cart = []; // Nur für diese Session
let discountPercent = 0;
let wonRewardText = "";
let isRedeemed = false;
let checkoutWindow = null;

const cartCount = document.getElementById("cartCount");
const cartContainer = document.getElementById("cartContainer");
const redeemButton = document.getElementById("redeemButton");

// Button-Animation States
const buttonStates = new Map();

// BroadcastChannel für Live-Update
const cartChannel = new BroadcastChannel("cart_channel");

// ------------------ INITIALISIERUNG ------------------
cartCount.textContent = 0;

// ------------------ LIVE-UPDATE LISTENER ------------------
cartChannel.onmessage = (msg) => {
  if (msg.data.action === "updateCart") {
    if (checkoutWindow && !checkoutWindow.closed) {
      checkoutWindow.postMessage({ action: "updateCart", cart, discountPercent, wonRewardText, isRedeemed }, "*");
    }
  }
};

// ------------------ HELPER: +1 ANIMATION ------------------
function createPlusSpan(btn) {
  const span = document.createElement("span");
  span.classList.add("plusOne", "hide");
  btn.appendChild(span);
  return span;
}

// ------------------ ADD TO CART ------------------
function addToCart(btn, name, imgSrc, price) {
  // Button-State initialisieren
  if (!buttonStates.has(btn)) {
    buttonStates.set(btn, { clickBuffer: 0, clickTimer: null });
  }
  const state = buttonStates.get(btn);

  // +1 Animation
  state.clickBuffer++;
  const plus = btn.querySelector(".plusOne") || createPlusSpan(btn);
  plus.textContent = `+${state.clickBuffer}`;
  plus.classList.remove("hide");

  if (state.clickTimer) clearTimeout(state.clickTimer);
  state.clickTimer = setTimeout(() => {
    state.clickBuffer = 0;
    plus.classList.add("hide");
    btn.classList.remove("animate");
  }, 1000);

  btn.classList.add("animate");

  // ------------------ WARENKORB LOGIK ------------------
  let item = cart.find((i) => i.name === name);
  if (item) item.quantity++;
  else cart.push({ name, img: imgSrc, price, quantity: 1 });

  // Zähler aktualisieren
  cartCount.textContent = cart.reduce((a, b) => a + b.quantity, 0);

  // Checkout live updaten
  if (checkoutWindow && !checkoutWindow.closed) {
    checkoutWindow.postMessage({ action: "updateCart", cart, discountPercent, wonRewardText, isRedeemed }, "*");
  }

  // Broadcast an alle Checkout-Tabs
  cartChannel.postMessage({ action: "updateCart" });
}

// ------------------ WARENKORB BUTTON ------------------
cartContainer.addEventListener("click", () => {
  if (!checkoutWindow || checkoutWindow.closed) {
    checkoutWindow = window.open("checkout.html", "_blank");

    // Update direkt nach Laden, damit alle Items angezeigt werden
    const updateInterval = setInterval(() => {
      if (checkoutWindow && !checkoutWindow.closed) {
        checkoutWindow.postMessage({ action: "updateCart", cart, discountPercent, wonRewardText, isRedeemed }, "*");
      } else {
        clearInterval(updateInterval);
      }
    }, 100);
  } else {
    checkoutWindow.focus();
    checkoutWindow.postMessage({ action: "updateCart", cart, discountPercent, wonRewardText, isRedeemed }, "*");
  }
});

// ------------------ PAYMENT FORM ANZEIGEN ------------------
document.getElementById("proceedPayment").addEventListener("click", () => {
  document.getElementById("proceedPayment").style.display = "none";
  document.getElementById("paymentForm").style.display = "flex";
});

// ------------------ BESTELLUNG ABSCHLIESSEN ------------------
document.getElementById("completeOrder").addEventListener("click", () => {
  const name = document.getElementById("name").value.trim();
  const address = document.getElementById("address").value.trim();
  const cardNumber = document.getElementById("cardNumber").value.trim();
  const expiry = document.getElementById("expiry").value.trim();
  const cvv = document.getElementById("cvv").value.trim();

  if (!name || !address || !cardNumber || !expiry || !cvv) {
    alert("Bitte alle Felder korrekt ausfüllen");
    return;
  }
  if (cardNumber.length !== 16 || cvv.length !== 3 || expiry.length !== 5) {
    alert("Bitte gültige Kreditkarteninformationen eingeben");
    return;
  }

  window.postMessage({ action: "showThankYou" }, "*");
  document.getElementById("paymentForm").reset();
  document.getElementById("paymentForm").style.display = "none";
  document.getElementById("proceedPayment").style.display = "flex";
});

// ------------------ THANK YOU MESSAGE ------------------
window.addEventListener("message", (event) => {
  if (event.data.action === "showThankYou") {
    const msg = document.getElementById("thankyouMessage");
    msg.classList.add("show");
    setTimeout(() => msg.classList.remove("show"), 4000);
    document.getElementById("checkoutOverlay").style.display = "none";
    cart = [];
    cartCount.textContent = 0;
    updateCheckout();
  }
});

// ------------------ REDEEM BUTTON ------------------
redeemButton.addEventListener("click", () => {
  if (isRedeemed) return;
  isRedeemed = true;
  redeemButton.textContent = "Eingelöst";
  redeemButton.classList.add("redeemed");

  // Rabatt nur anwenden, wenn Redeem gedrückt
  if (checkoutWindow && !checkoutWindow.closed) {
    checkoutWindow.postMessage({ action: "updateCart", cart, discountPercent, wonRewardText, isRedeemed }, "*");
  }
});

// ------------------ MINI-SPIEL ------------------
const bombGrid = document.getElementById("bombGrid");
const gameOverMsg = document.getElementById("gameOverMsg");
const bombArea = document.getElementById("bombArea");
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
  const img = document.createElement("img");
  img.src = "bombe.png";
  img.classList.add("bomb");
  img.dataset.index = i;
  bombGrid.appendChild(img);
}

// Belohnungstext
function getRewardText(count) {
  if (count <= 10) {
    discountPercent = count * 5;
    return discountPercent + "% Rabatt";
  }
  if (count < 20) return "🍫 1 Gratis Schokolade!";
  if (count === 20) return "🎁 Probierpaket GRATIS!";
  return "";
}

// Klick auf Feld
bombGrid.addEventListener("click", (e) => {
  const target = e.target;
  if (!target.classList.contains("bomb") || gameOver || isRedeemed) return;
  const index = parseInt(target.dataset.index);
  target.style.pointerEvents = "none";

  if (bombIndices.includes(index)) {
    target.src = "explosion.png";
    target.style.animation = "explosionAnim 0.8s forwards";
    bombArea.style.backgroundColor = "rgba(128,128,128,0.5)";
    gameOver = true;
    redeemButton.classList.add("disabled");
    gameOverMsg.classList.add("show");
    return;
  }

  revealedSafeCount++;
  target.src = "schokolade(1).png";
  target.style.width = "50%";
  target.style.animation = "popTafel 0.6s forwards";

  const rewardText = getRewardText(revealedSafeCount);
  if (rewardText) {
    const winList = document.getElementById("winList");
    winList.innerHTML = "";
    const li = document.createElement("li");
    li.textContent = rewardText;
    li.style.animation = "popReward 0.6s forwards";
    winList.appendChild(li);
    wonRewardText = rewardText;

    if (checkoutWindow && !checkoutWindow.closed) {
      checkoutWindow.postMessage({ action: "updateCart", cart, discountPercent, wonRewardText, isRedeemed }, "*");
    }
  }
});

// ------------------ SCROLL & ABOUT & TITLE ANIMATION ------------------
const faders = document.querySelectorAll(".fade-in");
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("visible");
    });
  },
  { threshold: 0.2 }
);
faders.forEach((fader) => observer.observe(fader));

const aboutText = document.getElementById("aboutText");
const aboutObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) aboutText.classList.add("visible");
    });
  },
  { threshold: 0.3 }
);
aboutObserver.observe(aboutText);

const gameTitle = document.getElementById("gameTitle");
const titleObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) gameTitle.classList.add("visible");
    });
  },
  { threshold: 0.3 }
);
titleObserver.observe(gameTitle);

// ------------------ IMPRESSUM ------------------
const showBtn = document.getElementById("showImpressum");
const impressumPage = document.getElementById("impressumPage");
const closeBtn = document.getElementById("closeImpressum");
const normalSections = document.querySelectorAll("section, #page3-4-wrapper, .checkout-overlay, .thankyou-message");

showBtn.addEventListener("click", (e) => {
  e.preventDefault();
  normalSections.forEach((el) => (el.style.display = "none"));
  impressumPage.style.display = "block";
  window.scrollTo({ top: 0, behavior: "smooth" });
});

closeBtn.addEventListener("click", () => {
  impressumPage.style.display = "none";
  normalSections.forEach((el) => (el.style.display = ""));
});

// ------------------ LIVE UPDATE FROM OTHER WINDOW ------------------
window.addEventListener("message", (event) => {
  if (event.data.action === "updateCart") {
    updateCheckout();
  }
});
