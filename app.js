/* =========================================
   XEARN APP
   PART 1 — CORE SETUP
========================================= */

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


/* =========================================
   BASIC UI HELPERS
========================================= */

function hideLoading() {
  const loading =
    document.getElementById("loading-screen");

  if (loading) {
    loading.style.display = "none";
  }
}


function showToast(title, message) {
  const toast =
    document.getElementById("toast");

  if (!toast) {
    console.log(title, message);
    return;
  }

  const toastTitle =
    toast.querySelector(".toast-title");

  const toastMessage =
    toast.querySelector(".toast-message");

  if (toastTitle) {
    toastTitle.textContent = title;
  }

  if (toastMessage) {
    toastMessage.textContent = message;
  }

  toast.classList.add("show");

  clearTimeout(window.xearnToastTimer);

  window.xearnToastTimer =
    setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
}


function setText(ids, value) {
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


function formatXcoin(value) {
  const number =
    Number(value) || 0;

  return (
    number.toLocaleString("en-US", {
      maximumFractionDigits: 2
    }) +
    " XCOIN"
  );
}


/* =========================================
   TELEGRAM INITIALIZATION
========================================= */

function initializeTelegram() {
  if (!tg) {
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

    document.body.classList.add(
      "telegram-app"
    );

    telegramUser =
      tg.initDataUnsafe &&
      tg.initDataUnsafe.user
        ? tg.initDataUnsafe.user
        : null;

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


/* =========================================
   SUPABASE EDGE FUNCTION CALL
========================================= */

async function callFunction(
  functionName,
  body = {},
  timeout = 15000
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
/* =========================================
   TELEGRAM AUTHENTICATION
========================================= */

async function authenticateUser() {
  try {
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

    updateInterface();

    hideLoading();

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


/* =========================================
   REFRESH USER DATA
========================================= */

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
      "User refresh failed:",
      error
    );
  }
}


/* =========================================
   UPDATE DASHBOARD
========================================= */

function updateInterface() {
  if (!currentUser) {
    return;
  }

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


  /* BALANCE */

  setText(
    [
      "balance",
      "balance-value",
      "wallet-balance"
    ],
    formatXcoin(balance)
  );


  /* TOTAL EARNED */

  setText(
    [
      "total-earned",
      "total-earned-value"
    ],
    formatXcoin(totalEarned)
  );


  /* REFERRAL EARNINGS */

  setText(
    [
      "referral-earnings",
      "referral-balance"
    ],
    formatXcoin(
      referralEarnings
    )
  );


  /* TIER */

  setText(
    [
      "user-tier",
      "current-tier",
      "tier-name"
    ],
    String(tier).toUpperCase()
  );


  /* USER NAME */

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


  /* PROFILE USERNAME */

  if (
    telegramUser &&
    telegramUser.username
  ) {

    setText(
      [
        "profile-username",
        "user-username"
      ],
      "@" +
      telegramUser.username
    );
  }
}
/* =========================================
   MINING CONFIG
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

const MINING_WINDOW_MS =
  2 * 60 * 60 * 1000;


/* =========================================
   MINING
========================================= */

async function mineXcoin() {
  if (!telegramUser) {
    showToast(
      "Telegram Required",
      "Open XEARN inside Telegram."
    );
    return;
  }

  const button =
    document.getElementById("mine-btn");

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
        reward.toLocaleString("en-US") +
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

    if (button) {
      button.disabled = false;
    }
  }
}


/* =========================================
   WATCH VIDEO
   ========================================= */

let videoRewardRunning = false;

async function watchVideo() {

  if (videoRewardRunning) {
    return;
  }

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

  videoRewardRunning = true;

  const button =
    document.getElementById("watch-video-btn");

  if (button) {
    button.disabled = true;
  }

  try {

    /*
      Monetag Rewarded Interstitial.

      The ad itself does NOT directly
      change the XEARN balance.

      The server-side Monetag postback
      is responsible for the actual reward.
    */

    const ymid =
      String(telegramUser.id) +
      "_" +
      Date.now();

    await window.show_11747212({
      type: "end",
      ymid: ymid,
      requestVar: "video"
    });

    /*
      Give the postback a moment to reach
      Supabase before refreshing the balance.
    */

    await new Promise(
      resolve =>
        setTimeout(resolve, 1500)
    );

    await refreshUser();

    showToast(
      "Video Completed",
      "Your reward is being verified."
    );

  } catch (error) {

    console.error(
      "Video error:",
      error
    );

    showToast(
      "Video Not Completed",
      "No reward was added."
    );

  } finally {

    videoRewardRunning = false;

    if (button) {
      button.disabled = false;
    }
  }
}


/* =========================================
   REWARDED TASK
========================================= */

let taskRunning = false;

async function startTask() {

  if (taskRunning) {
    return;
  }

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
      String(telegramUser.id) +
      "_task_" +
      Date.now();

    await window.show_11747212(
      "pop"
    );

    await new Promise(
      resolve =>
        setTimeout(resolve, 1500)
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


/* =========================================
   DAILY CHECK-IN
========================================= */

async function claimDailyCheckin() {

  showToast(
    "Daily Check-in",
    "Check-in verification is being prepared."
  );
}


/* =========================================
   NAVIGATION
========================================= */

function setupNavigation() {

  const navButtons =
    document.querySelectorAll(
      ".bottom-nav .nav-item"
    );

  navButtons.forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const target =
          button.dataset.target;

        if (!target) {
          return;
        }

        document
          .querySelectorAll(
            ".nav-item"
          )
          .forEach(item =>
            item.classList.remove(
              "active"
            )
          );

        button.classList.add(
          "active"
        );

        const section =
          document.getElementById(
            target
          );

        if (section) {

          section.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      }
    );
  });
}


/* =========================================
   BUTTON EVENTS
========================================= */

function setupButtons() {

  const mineButton =
    document.getElementById(
      "mine-btn"
    );

  if (mineButton) {
    mineButton.addEventListener(
      "click",
      mineXcoin
    );
  }


  const videoButton =
    document.getElementById(
      "watch-video-btn"
    );

  if (videoButton) {
    videoButton.addEventListener(
      "click",
      watchVideo
    );
  }


  const taskButton =
    document.getElementById(
      "special-task-btn"
    );

  if (taskButton) {
    taskButton.addEventListener(
      "click",
      startTask
    );
  }


  const checkinButton =
    document.getElementById(
      "checkin-claim-btn"
    );

  if (checkinButton) {
    checkinButton.addEventListener(
      "click",
      claimDailyCheckin
    );
  }
}


/* =========================================
   INITIAL EVENT SETUP
========================================= */

function setupAppEvents() {

  setupNavigation();

  setupButtons();
}
/* =========================================
   XEARN STARTUP
========================================= */

async function startXEARN() {

  console.log("Starting XEARN...");

  try {

    const telegramReady =
      initializeTelegram();

    if (!telegramReady) {
      return;
    }

    setupAppEvents();

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


/* =========================================
   AUTOMATIC USER REFRESH
========================================= */

setInterval(
  () => {

    if (
      telegramUser &&
      currentUser
    ) {
      refreshUser();
    }

  },
  30000
);


/* =========================================
   START WHEN PAGE LOADS
========================================= */

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
