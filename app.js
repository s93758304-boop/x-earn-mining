/* =========================
   XEARN APP
   PART 1 — CORE SETUP
   ========================= */

const SUPABASE_URL =
  "https://ynrqdbdgjzmucqcfsyvi.supabase.co";

const FUNCTION_BASE =
  SUPABASE_URL + "/functions/v1";

const tg =
  window.Telegram &&
  window.Telegram.WebApp
    ? window.Telegram.WebApp
    : null;

let telegramUser = null;
let currentUser = null;


/* =========================
   LOADING SCREEN
   ========================= */

function hideLoading() {

  const loading =
    document.getElementById(
      "loading-screen"
    );

  if (loading) {
    loading.style.display = "none";
  }

}


/* =========================
   TOAST
   ========================= */

function showToast(
  title,
  message
) {

  const toast =
    document.getElementById(
      "toast"
    );

  if (!toast) {
    alert(
      title + "\n" + message
    );
    return;
  }

  const toastTitle =
    toast.querySelector(
      ".toast-title"
    );

  const toastMessage =
    toast.querySelector(
      ".toast-message"
    );

  if (toastTitle) {
    toastTitle.textContent =
      title;
  }

  if (toastMessage) {
    toastMessage.textContent =
      message;
  }

  toast.classList.add(
    "show"
  );

  setTimeout(() => {

    toast.classList.remove(
      "show"
    );

  }, 3000);

}


/* =========================
   TELEGRAM INITIALIZATION
   ========================= */

function initializeTelegram() {

  if (!tg) {

    console.error(
      "Telegram WebApp SDK not found."
    );

    hideLoading();

    showToast(
      "Telegram Required",
      "Open XEARN from inside Telegram."
    );

    return false;
  }

  try {

    tg.ready();

    tg.expand();

    telegramUser =
      tg.initDataUnsafe &&
      tg.initDataUnsafe.user
        ? tg.initDataUnsafe.user
        : null;

    console.log(
      "Telegram initialized:",
      telegramUser
    );

    if (
      !telegramUser ||
      !telegramUser.id
    ) {

      hideLoading();

      showToast(
        "Telegram Error",
        "Your Telegram account could not be detected."
      );

      return false;
    }

    return true;

  } catch (error) {

    console.error(
      "Telegram initialization error:",
      error
    );

    hideLoading();

    showToast(
      "Startup Error",
      "Unable to initialize XEARN."
    );

    return false;
  }

}


/* =========================
   API REQUEST
   ========================= */

async function callFunction(
  functionName,
  body = {},
  timeout = 10000
) {

  const controller =
    new AbortController();

  const timer =
    setTimeout(() => {
      controller.abort();
    }, timeout);

  try {

    const response =
      await fetch(
        FUNCTION_BASE +
          "/" +
          functionName,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(body),

          signal:
            controller.signal
        }
      );

    let data = null;

    try {

      data =
        await response.json();

    } catch (_) {

      data = null;

    }

    if (!response.ok) {

      throw new Error(
        data &&
        (
          data.error ||
          data.message ||
          data.details
        )
          ? (
              data.error ||
              data.message ||
              data.details
            )
          : "Server request failed"
      );

    }

    return data;

  } catch (error) {

    if (
      error.name ===
      "AbortError"
    ) {

      throw new Error(
        "Server connection timed out."
      );

    }

    throw error;

  } finally {

    clearTimeout(timer);

  }

}
/* =========================
   TELEGRAM AUTHENTICATION
   ========================= */

async function authenticateUser() {

  try {

    console.log(
      "Authenticating Telegram user..."
    );

    if (!telegramUser) {

      throw new Error(
        "Telegram user is missing."
      );

    }

    const result =
      await callFunction(
        "telegram-auth",
        {
          initData:
            tg.initData || "",

          telegram_id:
            telegramUser.id,

          user:
            telegramUser
        }
      );

    console.log(
      "Authentication response:",
      result
    );

    currentUser =
      result.user ||
      result.data ||
      result;

    if (!currentUser) {

      throw new Error(
        "No user data returned."
      );

    }

    console.log(
      "XEARN account loaded:",
      currentUser
    );

    hideLoading();

    updateInterface();

  } catch (error) {

    console.error(
      "Authentication failed:",
      error
    );

    hideLoading();

    showToast(
      "Connection Error",
      error.message ||
        "Unable to load your XEARN account."
    );

  }

}


/* =========================
   REFRESH USER
   ========================= */

async function refreshUser() {

  if (!telegramUser) {
    return;
  }

  try {

    const result =
      await callFunction(
        "telegram-auth",
        {
          initData:
            tg.initData || "",

          telegram_id:
            telegramUser.id,

          user:
            telegramUser
        }
      );

    currentUser =
      result.user ||
      result.data ||
      result;

    updateInterface();

  } catch (error) {

    console.error(
      "Refresh failed:",
      error
    );

  }

}
/* =========================
   INTERFACE UPDATE
   ========================= */

function updateInterface() {

  if (!currentUser) {
    return;
  }

  console.log(
    "Updating XEARN interface..."
  );

  const balance =
    Number(
      currentUser.balance_xcoin || 0
    );

  const totalEarned =
    Number(
      currentUser.total_earned_xcoin || 0
    );

  const referralEarnings =
    Number(
      currentUser.referral_earnings_xcoin || 0
    );

  const tier =
    currentUser.tier ||
    currentUser.plan ||
    "FREE";


  /* =========================
     BALANCE
     ========================= */

  setText(
    [
      "balance",
      "balance-value",
      "wallet-balance"
    ],
    formatXcoin(balance)
  );


  /* =========================
     TOTAL EARNED
     ========================= */

  setText(
    [
      "total-earned",
      "total-earned-value"
    ],
    formatXcoin(totalEarned)
  );


  /* =========================
     REFERRALS
     ========================= */

  setText(
    [
      "referral-earnings",
      "referral-balance"
    ],
    formatXcoin(referralEarnings)
  );


  /* =========================
     TIER
     ========================= */

  setText(
    [
      "user-tier",
      "current-tier",
      "tier-name"
    ],
    String(tier).toUpperCase()
  );


  /* =========================
     USERNAME
     ========================= */

  const displayName =
    currentUser.full_name ||
    currentUser.first_name ||
    currentUser.username ||
    telegramUser?.first_name ||
    "XEARN User";

  setText(
    [
      "user-name",
      "username",
      "profile-name"
    ],
    displayName
  );

}


/* =========================
   TEXT HELPER
   ========================= */

function setText(
  ids,
  value
) {

  if (!Array.isArray(ids)) {
    ids = [ids];
  }

  for (const id of ids) {

    const element =
      document.getElementById(id);

    if (element) {
      element.textContent = value;
      return;
    }

  }

}


/* =========================
   XCOIN FORMAT
   ========================= */

function formatXcoin(value) {

  const number =
    Number(value) || 0;

  return number.toLocaleString(
    "en-US",
    {
      maximumFractionDigits: 2
    }
  ) + " XCOIN";

}
/* =========================
   START XEARN
   ========================= */

async function startXEARN() {

  console.log("Starting XEARN...");

  try {

    const telegramReady =
      initializeTelegram();

    if (!telegramReady) {
      return;
    }

    await authenticateUser();

  } catch (error) {

    console.error(
      "XEARN startup error:",
      error
    );

    hideLoading();

    showToast(
      "Startup Error",
      error.message ||
        "Unable to start XEARN."
    );

  }

}


/* =========================
   PAGE START
   ========================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    startXEARN
  );

} else {

  startXEARN();

}
