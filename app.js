/* =====================================================
   XEARN — FINAL APP.JS
===================================================== */

const SUPABASE_URL =
  "https://ynrqdbdgjzmucqcfsyvi.supabase.co";

const FUNCTION_BASE =
  SUPABASE_URL + "/functions/v1";

let tg = null;
let telegramUser = null;
let currentUser = null;

let videoRunning = false;
let taskRunning = false;
let miningRunning = false;
let checkinRunning = false;


/* =====================================================
   HELPERS
===================================================== */

function $(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const element = $(id);

  if (element) {
    element.textContent = value;
  }
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString(
    "en-US",
    {
      maximumFractionDigits: 2
    }
  );
}

function hideLoading() {
  const loader = $("loadingScreen");

  if (loader) {
    loader.style.display = "none";
  }
}

function showToast(title, message) {

  const toast = $("toast");

  if (!toast) {
    console.log(title, message);
    return;
  }

  setText("toastTitle", title);
  setText("toastMessage", message);

  toast.classList.add("show");

  clearTimeout(
    window.xearnToastTimer
  );

  window.xearnToastTimer =
    setTimeout(() => {
      toast.classList.remove("show");
    }, 3500);
}


/* =====================================================
   API
===================================================== */

async function callFunction(
  functionName,
  body = {},
  timeout = 15000
) {

  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () => controller.abort(),
      timeout
    );

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

    let data = {};

    try {
      data =
        await response.json();
    } catch (_) {}

    if (!response.ok) {

      throw new Error(
        data?.error ||
        data?.message ||
        "Server request failed."
      );
    }

    return data;

  } finally {

    clearTimeout(timer);

  }
}


/* =====================================================
   TELEGRAM
===================================================== */

function initializeTelegram() {

  tg =
    window.Telegram?.WebApp ||
    null;

  if (!tg) {

    /*
      IMPORTANT:
      Do NOT keep the application
      stuck on loading.
    */

    hideLoading();

    showToast(
      "Telegram Required",
      "Open XEARN inside Telegram."
    );

    return false;
  }

  try {

    tg.ready();
    tg.expand();

    telegramUser =
      tg.initDataUnsafe?.user ||
      null;

    if (!telegramUser?.id) {

      hideLoading();

      showToast(
        "Telegram Error",
        "Your Telegram account was not detected."
      );

      return false;
    }

    return true;

  } catch (error) {

    console.error(
      "Telegram initialization:",
      error
    );

    hideLoading();

    return false;
  }
}


/* =====================================================
   USER AUTH
===================================================== */

async function authenticateUser() {

  if (!telegramUser) {
    return false;
  }

  try {

    const result =
      await callFunction(
        "telegram-auth",
        {
          initData:
            tg?.initData || "",

          telegram_id:
            telegramUser.id,

          user:
            telegramUser
        }
      );

    currentUser =
      result?.user ||
      result?.data ||
      result;

    if (!currentUser) {
      return false;
    }

    updateInterface();

    return true;

  } catch (error) {

    /*
      The dashboard remains usable even
      if the backend is temporarily unavailable.
    */

    console.error(
      "Authentication error:",
      error
    );

    createFallbackUser();

    return false;
  }
}


/* =====================================================
   FALLBACK USER
===================================================== */

function createFallbackUser() {

  if (!telegramUser) {
    return;
  }

  currentUser = {

    telegram_id:
      telegramUser.id,

    first_name:
      telegramUser.first_name ||
      "XEARN User",

    username:
      telegramUser.username ||
      "",

    balance_xcoin: 0,

    total_earned_xcoin: 0,

    referral_earnings_xcoin: 0,

    referral_count: 0,

    tasks_completed: 0,

    streak_days: 0,

    tier: "FREE",

    videos_completed: 0

  };

  updateInterface();
}


/* =====================================================
   REFRESH USER
===================================================== */

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
            tg?.initData || "",

          telegram_id:
            telegramUser.id,

          user:
            telegramUser
        }
      );

    currentUser =
      result?.user ||
      result?.data ||
      result;

    if (currentUser) {
      updateInterface();
    }

  } catch (error) {

    console.error(
      "Refresh failed:",
      error
    );
  }
}


/* =====================================================
   UPDATE UI
===================================================== */

function updateInterface() {

  if (!currentUser) {
    return;
  }

  const balance =
    Number(
      currentUser.balance_xcoin || 0
    );

  const tasks =
    Number(
      currentUser.tasks_completed ||
      currentUser.completed_tasks ||
      0
    );

  const streak =
    Number(
      currentUser.streak_days ||
      currentUser.checkin_streak ||
      0
    );

  const referrals =
    Number(
      currentUser.referral_count ||
      currentUser.total_referrals ||
      0
    );

  const referralEarnings =
    Number(
      currentUser.referral_earnings_xcoin ||
      0
    );

  const tier =
    String(
      currentUser.tier ||
      currentUser.plan ||
      "FREE"
    ).toUpperCase();


  /* Balance */

  setText(
    "balanceAmount",
    formatNumber(balance)
  );

  setText(
    "balanceUsdt",
    "$" +
    (balance / 1300).toFixed(4)
  );


  /* Stats */

  setText(
    "tasksCount",
    formatNumber(tasks)
  );

  setText(
    "streakCount",
    formatNumber(streak)
  );

  setText(
    "referralsCount",
    formatNumber(referrals)
  );


  /* Tier */

  setText(
    "tierBadge",
    tier
  );

  setText(
    "currentTier",
    tier
  );


  /* Mining */

  const rewards = {
    FREE: 50,
    BRONZE: 100,
    SILVER: 200,
    GOLD: 400
  };

  setText(
    "miningReward",
    "+" +
    (rewards[tier] || 50) +
    " XCOIN"
  );


  /* Referral */

  setText(
    "referralTotal",
    formatNumber(referrals)
  );

  setText(
    "referralEarnings",
    formatNumber(
      referralEarnings
    ) +
    " XCOIN"
  );


  /* Account */

  const name =
    currentUser.full_name ||
    currentUser.first_name ||
    telegramUser?.first_name ||
    "XEARN User";

  setText(
    "userName",
    name
  );

  setText(
    "userTelegram",
    telegramUser?.username
      ? "@" +
        telegramUser.username
      : "Telegram User"
  );


  /* Videos */

  const videos =
    Number(
      currentUser.videos_completed ||
      currentUser.video_count ||
      0
    );

  const limits = {
    FREE: 20,
    BRONZE: 20,
    SILVER: 30,
    GOLD: 50
  };

  const limit =
    limits[tier] || 20;

  setText(
    "videosCompleted",
    videos
  );

  setText(
    "videosLimit",
    limit
  );

  const percentage =
    Math.min(
      100,
      (videos / limit) * 100
    );

  const progress =
    $("videoProgress");

  if (progress) {
    progress.style.width =
      percentage + "%";
  }


  /* Referral link */

  const referralLink =
    $("referralLink");

  if (referralLink) {

    referralLink.textContent =
      "https://t.me/XEarnmining_bot?start=ref_" +
      telegramUser.id;

  }
}


/* =====================================================
   NAVIGATION
===================================================== */

const SCREENS = {
  home: "homeScreen",
  earn: "earnScreen",
  upgrade: "upgradeScreen",
  refer: "referScreen",
  account: "accountScreen"
};

function showScreen(name) {

  const target =
    SCREENS[name];

  if (!target) {
    return;
  }

  document
    .querySelectorAll(".screen")
    .forEach(screen => {
      screen.classList.remove(
        "active"
      );
    });

  const screen =
    $(target);

  if (screen) {
    screen.classList.add(
      "active"
    );
  }

  document
    .querySelectorAll(
      ".bottom-nav .nav-item"
    )
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.target ===
          name
      );

    });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =====================================================
   MONETAG — WATCH VIDEO
===================================================== */

async function watchVideo() {

  if (videoRunning) {
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

  videoRunning = true;

  const button =
    $("watchVideoButton");

  if (button) {
    button.disabled = true;
  }

  const oldBalance =
    Number(
      currentUser?.balance_xcoin || 0
    );

  try {

    const ymid =
      telegramUser.id +
      "_video_" +
      Date.now();

    await window.show_11747212({
      type: "end",
      ymid: ymid,
      requestVar: "video"
    });


    /*
      DO NOT CREDIT HERE.

      Monetag -> postback ->
      Supabase -> verified reward.
    */

    let verified = false;

    for (
      let i = 0;
      i < 5;
      i++
    ) {

      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            1500
          )
      );

      await refreshUser();

      const newBalance =
        Number(
          currentUser?.balance_xcoin ||
          0
        );

      if (
        newBalance >
        oldBalance
      ) {

        verified = true;

        const earned =
          newBalance -
          oldBalance;

        showToast(
          "Awesome!",
          "+" +
          formatNumber(earned) +
          " XCOIN"
        );

        break;
      }
    }

    if (!verified) {

      showToast(
        "Video Completed",
        "Reward is still being verified."
      );

    }

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

    videoRunning = false;

    if (button) {
      button.disabled = false;
    }
  }
}


/* =====================================================
   MONETAG — TASK
===================================================== */

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

  const oldBalance =
    Number(
      currentUser?.balance_xcoin || 0
    );

  try {

    const ymid =
      telegramUser.id +
      "_task_" +
      Date.now();

    await window.show_11747212({
      type: "pop",
      ymid: ymid,
      requestVar: "task"
    });


    let verified = false;

    for (
      let i = 0;
      i < 5;
      i++
    ) {

      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            1500
          )
      );

      await refreshUser();

      const newBalance =
        Number(
          currentUser?.balance_xcoin ||
          0
        );

      if (
        newBalance >
        oldBalance
      ) {

        verified = true;

        const earned =
          newBalance -
          oldBalance;

        showToast(
          "Task Completed!",
          "+" +
          formatNumber(earned) +
          " XCOIN"
        );

        break;
      }
    }

    if (!verified) {

      showToast(
        "Task Submitted",
        "Your reward is being verified."
      );

    }

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


/* =====================================================
   DAILY CHECK-IN
   MONETAG IN-APP INTERSTITIAL
   NO AUTOMATIC REWARD
===================================================== */

async function claimDailyCheckin() {

  if (checkinRunning) {
    return;
  }

  if (
    typeof window.show_11747212 !==
    "function"
  ) {
    showToast(
      "Check-in Unavailable",
      "Please try again shortly."
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

    await window.show_11747212({

      type: "inApp",

      inAppSettings: {

        frequency: 2,

        capping: 0.1,

        interval: 30,

        timeout: 5,

        everyPage: false

      }

    });

    showToast(
      "Daily Check-in",
      "Today's check-in has been opened."
    );

  } catch (error) {

    console.error(
      "Check-in error:",
      error
    );

    showToast(
      "Check-in",
      "Please try again later."
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


/* =====================================================
   MINING
===================================================== */

async function mineXcoin() {

  if (miningRunning) {
    return;
  }

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
        result?.reward_xcoin ||
        result?.reward ||
        0
      );

    if (reward <= 0) {

      throw new Error(
        result?.message ||
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


/* =====================================================
   COPY REFERRAL
===================================================== */

async function copyReferral() {

  const link =
    $("referralLink")?.textContent;

  if (!link) {
    return;
  }

  try {

    await navigator.clipboard.writeText(
      link
    );

    showToast(
      "Copied!",
      "Referral link copied."
    );

  } catch (_) {

    showToast(
      "Referral Link",
      link
    );
  }
}


/* =====================================================
   BUTTONS
===================================================== */

function setupButtons() {

  /* Navigation */

  document
    .querySelectorAll(
      ".bottom-nav .nav-item"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          showScreen(
            button.dataset.target
          );

        }
      );

    });


  /* Home Earn */

  $("earnButton")
    ?.addEventListener(
      "click",
      () => showScreen("earn")
    );


  /* Video */

  $("watchVideoButton")
    ?.addEventListener(
      "click",
      watchVideo
    );


  $("earnVideoItem")
    ?.addEventListener(
      "click",
      watchVideo
    );


  /* Task */

  $("taskItem")
    ?.addEventListener(
      "click",
      startTask
    );


  /* Check-in */

  $("checkinButton")
    ?.addEventListener(
      "click",
      claimDailyCheckin
    );


  $("checkinItem")
    ?.addEventListener(
      "click",
      claimDailyCheckin
    );


  /* Mining */

  $("mineButton")
    ?.addEventListener(
      "click",
      mineXcoin
    );


  /* Referral */

  $("copyReferralButton")
    ?.addEventListener(
      "click",
      copyReferral
    );


  /* Withdraw */

  $("withdrawButton")
    ?.addEventListener(
      "click",
      () => {
        showToast(
          "Withdraw",
          "Withdrawal section is being connected."
        );
      }
    );


  $("withdrawAccountButton")
    ?.addEventListener(
      "click",
      () => {
        showToast(
          "Withdraw",
          "Withdrawal section is being connected."
        );
      }
    );


  /* History */

  $("historyButton")
    ?.addEventListener(
      "click",
      () => {
        showToast(
          "History",
          "Transaction history is being connected."
        );
      }
    );
}


/* =====================================================
   START XEARN
===================================================== */

async function startXEARN() {

  console.log(
    "XEARN starting..."
  );

  /*
    CRITICAL:
    The dashboard is shown immediately.
    Authentication happens afterwards.

    This means a temporary Supabase
    problem can NEVER trap the user
    on the loading screen.
  */

  hideLoading();

  showScreen("home");

  try {

    const ready =
      initializeTelegram();

    if (!ready) {
      return;
    }

    setupButtons();

    /*
      Authenticate in the background.
    */

    await authenticateUser();

  } catch (error) {

    console.error(
      "Startup error:",
      error
    );

    createFallbackUser();

  } finally {

    /*
      Absolute fail-safe.
    */

    hideLoading();

  }
}


/* =====================================================
   REFRESH EVERY 30 SECONDS
===================================================== */

setInterval(() => {

  if (
    telegramUser &&
    currentUser
  ) {

    refreshUser();

  }

}, 30000);


/* =====================================================
   BOOT
===================================================== */

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
