/* =========================================
   XEARN APP
   PART 1 — CORE
========================================= */

const SUPABASE_URL = "https://ynrqdbdgjzmucqcfsyvi.supabase.co";
const FUNCTION_BASE = SUPABASE_URL + "/functions/v1";

const tg = window.Telegram?.WebApp || null;

let telegramUser = null;
let currentUser = null;

const $ = (id) => document.getElementById(id);

/* ---------- UI ---------- */

function hideLoading() {
  const loader = $("loadingScreen");
  if (loader) loader.style.display = "none";
}

function showToast(title, message) {
  const toast = $("toast");
  if (!toast) return;

  $("toastTitle").textContent = title;
  $("toastMessage").textContent = message;

  toast.classList.add("show");

  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

/* ---------- API ---------- */

async function callFunction(name, body = {}) {
  const response = await fetch(`${FUNCTION_BASE}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  let data = {};
  try {
    data = await response.json();
  } catch (_) {}

  if (!response.ok) {
    throw new Error(
      data.error ||
      data.message ||
      "Request failed"
    );
  }

  return data;
}

/* ---------- TELEGRAM ---------- */

function initializeTelegram() {
  if (!tg) {
    hideLoading();
    showToast(
      "Telegram Required",
      "Open XEARN from Telegram."
    );
    return false;
  }

  tg.ready();
  tg.expand();

  telegramUser =
    tg.initDataUnsafe?.user || null;

  if (!telegramUser) {
    hideLoading();
    showToast(
      "Account Error",
      "Telegram user not found."
    );
    return false;
  }
   /* =========================================
   XEARN APP
   PART 1 — CORE
========================================= */

const SUPABASE_URL = "https://ynrqdbdgjzmucqcfsyvi.supabase.co";
const FUNCTION_BASE = SUPABASE_URL + "/functions/v1";

const tg = window.Telegram?.WebApp || null;

let telegramUser = null;
let currentUser = null;

const $ = (id) => document.getElementById(id);

/* ---------- UI ---------- */

function hideLoading() {
  const loader = $("loadingScreen");
  if (loader) loader.style.display = "none";
}

function showToast(title, message) {
  const toast = $("toast");
  if (!toast) return;

  $("toastTitle").textContent = title;
  $("toastMessage").textContent = message;

  toast.classList.add("show");

  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

/* ---------- API ---------- */

async function callFunction(name, body = {}) {
  const response = await fetch(`${FUNCTION_BASE}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  let data = {};
  try {
    data = await response.json();
  } catch (_) {}

  if (!response.ok) {
    throw new Error(
      data.error ||
      data.message ||
      "Request failed"
    );
  }

  return data;
}

/* ---------- TELEGRAM ---------- */

function initializeTelegram() {
  if (!tg) {
    hideLoading();
    showToast(
      "Telegram Required",
      "Open XEARN from Telegram."
    );
    return false;
  }

  tg.ready();
  tg.expand();

  telegramUser =
    tg.initDataUnsafe?.user || null;

  if (!telegramUser) {
    hideLoading();
    showToast(
      "Account Error",
      "Telegram user not found."
    );
    return false;
  }

  return true;
}

  return true;
}
/* =========================================
   PART 3 — NAVIGATION & EARN SYSTEM
========================================= */

const SCREENS = {
  home: "homeScreen",
  earn: "earnScreen",
  upgrade: "upgradeScreen",
  refer: "referScreen",
  account: "accountScreen"
};


/* ---------- SCREEN NAVIGATION ---------- */

function showScreen(name) {
  const screenId = SCREENS[name];

  if (!screenId) return;

  document
    .querySelectorAll(".screen")
    .forEach(screen => {
      screen.classList.remove("active");
    });

  const target = $(screenId);

  if (target) {
    target.classList.add("active");
  }

  document
    .querySelectorAll(".bottom-nav .nav-item")
    .forEach(item => {
      item.classList.remove("active");

      if (item.dataset.target === name) {
        item.classList.add("active");
      }
    });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* ---------- BOTTOM NAV ---------- */

function setupNavigation() {

  document
    .querySelectorAll(".bottom-nav .nav-item")
    .forEach(button => {

      button.addEventListener("click", () => {

        const target =
          button.dataset.target;

        if (target) {
          showScreen(target);
        }

      });

    });


  /* Center Upgrade button */

  const upgradeButton =
    document.querySelector(
      ".upgrade-nav-button"
    );

  if (upgradeButton) {

    upgradeButton.addEventListener(
      "click",
      () => {
        showScreen("upgrade");
      }
    );

  }
}


/* ---------- MONETAG ---------- */

let videoRunning = false;
let taskRunning = false;


/* ---------- WATCH VIDEO ---------- */

async function watchVideo() {

  if (videoRunning) return;

  if (!telegramUser) {
    showToast(
      "Telegram Required",
      "Open XEARN inside Telegram."
    );
    return;
  }

  if (
    typeof window.show_11747212 !==
    "function"
  ) {
    showToast(
      "Video Unavailable",
      "Please try again shortly."
    );
    return;
  }

  videoRunning = true;

  const button =
    $("watchVideoButton");

  if (button) {
    button.disabled = true;
  }

  try {

    const ymid =
      `${telegramUser.id}_video_${Date.now()}`;

    await window.show_11747212({
      type: "end",
      ymid: ymid,
      requestVar: "video"
    });

    /*
      Monetag postback verifies the reward.
      We do NOT add XCOIN here.
    */

    await new Promise(resolve =>
      setTimeout(resolve, 2000)
    );

    await refreshUser();

    showToast(
      "Video Completed",
      "Your reward is being verified."
    );

  } catch (error) {

    console.error(
      "Watch video error:",
      error
    );

    showToast(
      "Video Not Completed",
      "No reward was added."
    );

  } finally {

    videoRunning = false;

    if (button) {
      button.disabled = false;
    }

  }
}


/* ---------- TASK ---------- */

async function startTask() {

  if (taskRunning) return;

  if (!telegramUser) {
    showToast(
      "Telegram Required",
      "Open XEARN inside Telegram."
    );
    return;
  }

  if (
    typeof window.show_11747212 !==
    "function"
  ) {
    showToast(
      "Task Unavailable",
      "Please try again shortly."
    );
    return;
  }

  taskRunning = true;

  try {

    const ymid =
      `${telegramUser.id}_task_${Date.now()}`;

    await window.show_11747212({
      type: "pop",
      ymid: ymid,
      requestVar: "task"
    });

    await new Promise(resolve =>
      setTimeout(resolve, 2000)
    );

    await refreshUser();

    showToast(
      "Task Submitted",
      "Your task result is being verified."
    );

  } catch (error) {

    console.error(
      "Task error:",
      error
    );

    showToast(
      "Task Not Completed",
      "Please try again."
    );

  } finally {

    taskRunning = false;

  }
}


/* ---------- EARN BUTTON ---------- */

function setupEarnButtons() {

  const watchButton =
    $("watchVideoButton");

  if (watchButton) {
    watchButton.addEventListener(
      "click",
      watchVideo
    );
  }


  const taskItem =
    $("taskItem");

  if (taskItem) {
    taskItem.addEventListener(
      "click",
      startTask
    );
  }


  const earnButton =
    $("earnButton");

  if (earnButton) {
    earnButton.addEventListener(
      "click",
      () => {
        showScreen("earn");
      }
    );
  }

}


/* ---------- OTHER BUTTONS ---------- */

function setupGeneralButtons() {

  const withdrawButton =
    $("withdrawButton");

  if (withdrawButton) {

    withdrawButton.addEventListener(
      "click",
      () => {
        showToast(
          "Withdraw",
          "Withdrawal system is being prepared."
        );
      }
    );

  }


  const historyButton =
    $("historyButton");

  if (historyButton) {

    historyButton.addEventListener(
      "click",
      () => {
        showToast(
          "History",
          "Transaction history will appear here."
        );
      }
    );

  }


  const supportButton =
    $("supportButton");

  if (supportButton) {

    supportButton.addEventListener(
      "click",
      () => {

        if (tg) {
          tg.openTelegramLink(
            "https://t.me/"
          );
        }

      }
    );

  }

}


/* ---------- ALL BUTTONS ---------- */

function setupAppEvents() {

  setupNavigation();

  setupEarnButtons();

  setupGeneralButtons();

       }
/* =========================================
   PART 4 — MINING, CHECK-IN & STARTUP
========================================= */

const MINING_RULES = {
  FREE: {
    reward: 50,
    maxClaims: 1
  },

  BRONZE: {
    reward: 100,
    maxClaims: 3
  },

  SILVER: {
    reward: 200,
    maxClaims: 6
  },

  GOLD: {
    reward: 400,
    maxClaims: 12
  }
};


/* ---------- MINING ---------- */

let miningRunning = false;

async function mineXcoin() {

  if (miningRunning) return;

  if (!telegramUser) {
    showToast(
      "Telegram Required",
      "Open XEARN inside Telegram."
    );
    return;
  }

  miningRunning = true;

  const button =
    $("mineButton");

  if (button) {
    button.disabled = true;
  }

  try {

    const result =
      await callFunction(
        "mine-xcoin",
        {
          telegram_id:
            telegramUser.id
        }
      );

    const reward =
      Number(
        result.reward_xcoin ||
        result.reward ||
        0
      );

    if (reward <= 0) {
      throw new Error(
        result.message ||
        "Mining reward was not confirmed."
      );
    }

    await refreshUser();

    showToast(
      "Mining Complete!",
      "+" +
        formatNumber(reward) +
        " XCOIN"
    );

  } catch (error) {

    console.error(
      "Mining error:",
      error
    );

    showToast(
      "Mining Unavailable",
      error.message ||
        "Unable to complete mining."
    );

  } finally {

    miningRunning = false;

    if (button) {
      button.disabled = false;
    }

  }
}


/* ---------- DAILY CHECK-IN ---------- */

let checkinRunning = false;

async function claimDailyCheckin() {

  if (checkinRunning) return;

  if (!telegramUser) {
    showToast(
      "Telegram Required",
      "Open XEARN inside Telegram."
    );
    return;
  }

  checkinRunning = true;

  const button =
    $("checkinButton");

  if (button) {
    button.disabled = true;
  }

  try {

    /*
      Daily Check-in currently opens
      the configured earning link.

      No XCOIN is added here directly.
    */

    const checkinUrl =
      "https://www.profitableratecpmnetwork.com/skzazzs529?key=b1a6eab3a3ea4f3a76a00dc123bde88f";

    if (tg) {
      tg.openLink(checkinUrl);
    } else {
      window.open(
        checkinUrl,
        "_blank"
      );
    }

    showToast(
      "Daily Check-in",
      "Check-in opened successfully."
    );

  } catch (error) {

    console.error(
      "Check-in error:",
      error
    );

    showToast(
      "Check-in Error",
      "Unable to open check-in."
    );

  } finally {

    setTimeout(() => {
      checkinRunning = false;

      if (button) {
        button.disabled = false;
      }
    }, 2000);

  }
}


/* ---------- MINING BUTTON ---------- */

function setupMining() {

  const button =
    $("mineButton");

  if (button) {

    button.addEventListener(
      "click",
      mineXcoin
    );

  }

}


/* ---------- CHECK-IN BUTTON ---------- */

function setupCheckin() {

  const button =
    $("checkinButton");

  if (button) {

    button.addEventListener(
      "click",
      claimDailyCheckin
    );

  }

}


/* ---------- START APPLICATION ---------- */

async function startXEARN() {

  console.log(
    "Starting XEARN..."
  );

  try {

    const telegramReady =
      initializeTelegram();

    if (!telegramReady) {
      return;
    }

    setupAppEvents();

    setupMining();

    setupCheckin();

    await startAuthentication();

    showScreen("home");

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


/* ---------- AUTO REFRESH ---------- */

setInterval(() => {

  if (
    telegramUser &&
    currentUser
  ) {
    refreshUser();
  }

}, 30000);


/* ---------- BOOT ---------- */

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
