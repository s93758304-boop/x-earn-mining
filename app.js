/* =========================================================
   XEARN APP.JS
   Matched to current XEARN index.html
   ========================================================= */


/* =========================================================
   CONFIG
   ========================================================= */

const SUPABASE_URL =
  "https://ynrqdbdgjzmucqcfsyvi.supabase.co";

const XCOIN_PER_USDT = 1300;

const MONETAG_ZONE = "11747212";


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let tg = null;

let telegramUser = null;

let currentUser = null;

let videoRunning = false;

let taskRunning = false;

let checkinRunning = false;

let miningRunning = false;


/* =========================================================
   DOM HELPER
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}


/* =========================================================
   TEXT HELPER
   ========================================================= */

function setText(id, value) {

  const element = $(id);

  if (!element) {
    return;
  }

  element.textContent = value;
}


/* =========================================================
   NUMBER FORMAT
   ========================================================= */

function formatNumber(value) {

  const number =
    Number(value || 0);

  return number.toLocaleString(
    "en-US",
    {
      maximumFractionDigits: 2
    }
  );
}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(title, message) {

  console.log(
    title + ":",
    message
  );

  const toast =
    $("toast");

  if (!toast) {
    return;
  }

  const titleElement =
    $("toastTitle");

  const messageElement =
    $("toastMessage");

  if (titleElement) {

    titleElement.textContent =
      title;

  }

  if (messageElement) {

    messageElement.textContent =
      message;

  }

  toast.classList.add("show");

  clearTimeout(
    window.xearnToastTimer
  );

  window.xearnToastTimer =
    setTimeout(
      () => {

        toast.classList.remove(
          "show"
        );

      },
      3500
    );
}


/* =========================================================
   LOADING
   ========================================================= */

function hideLoading() {

  const loading =
    $("loadingScreen");

  if (!loading) {
    return;
  }

  loading.style.display =
    "none";
}


/* =========================================================
   TELEGRAM INITIALIZATION
   ========================================================= */

function initializeTelegram() {

  try {

    if (
      window.Telegram &&
      window.Telegram.WebApp
    ) {

      tg =
        window.Telegram.WebApp;

      tg.ready();

      tg.expand();

      telegramUser =
        tg.initDataUnsafe?.user ||
        null;

      console.log(
        "Telegram user:",
        telegramUser
      );

      return true;
    }


    console.warn(
      "Telegram WebApp SDK not available."
    );

    return false;

  } catch (error) {

    console.error(
      "Telegram initialization error:",
      error
    );

    return false;
  }
}


/* =========================================================
   SUPABASE EDGE FUNCTION
   ========================================================= */

async function callFunction(
  functionName,
  body
) {

  const response =
    await fetch(
      SUPABASE_URL +
      "/functions/v1/" +
      functionName,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify(body)
      }
    );


  let data = null;


  try {

    data =
      await response.json();

  } catch {

    data = null;

  }


  if (!response.ok) {

    const message =
      data?.message ||
      data?.error ||
      "Request failed.";

    throw new Error(
      message
    );
  }


  return data;
}


/* =========================================================
   AUTHENTICATE USER
   ========================================================= */

async function authenticateUser() {

  if (!telegramUser) {

    createFallbackUser();

    return;
  }


  try {

    const result =
      await callFunction(
        "telegram-auth",
        {
          telegram_id:
            telegramUser.id,

          username:
            telegramUser.username ||
            null,

          first_name:
            telegramUser.first_name ||
            null,

          last_name:
            telegramUser.last_name ||
            null,

          photo_url:
            telegramUser.photo_url ||
            null
        }
      );


    currentUser =
      result?.user ||
      result ||
      null;


    if (!currentUser) {

      throw new Error(
        "User authentication failed."
      );

    }


    console.log(
      "XEARN user authenticated:",
      currentUser
    );


    updateInterface();

  } catch (error) {

    console.error(
      "Authentication error:",
      error
    );


    createFallbackUser();

  }
}


/* =========================================================
   FALLBACK USER
   ========================================================= */

function createFallbackUser() {

  currentUser = {

    telegram_id:
      telegramUser?.id ||
      null,

    username:
      telegramUser?.username ||
      null,

    first_name:
      telegramUser?.first_name ||
      "XEARN User",

    last_name:
      telegramUser?.last_name ||
      "",

    tier:
      "FREE",

    balance_xcoin:
      0,

    total_earned_xcoin:
      0,

    referral_earnings_xcoin:
      0,

    videos_watched_today:
      0,

    tasks_completed_today:
      0,

    referral_count:
      0,

    streak_days:
      0
  };


  updateInterface();
}


/* =========================================================
   REFRESH USER
   ========================================================= */

async function refreshUser() {

  if (!telegramUser) {
    return;
  }


  try {

    const result =
      await callFunction(
        "telegram-auth",
        {
          telegram_id:
            telegramUser.id,

          username:
            telegramUser.username ||
            null,

          first_name:
            telegramUser.first_name ||
            null,

          last_name:
            telegramUser.last_name ||
            null,

          photo_url:
            telegramUser.photo_url ||
            null
        }
      );


    const refreshedUser =
      result?.user ||
      result ||
      null;


    if (refreshedUser) {

      currentUser =
        refreshedUser;

      updateInterface();

    }

  } catch (error) {

    console.error(
      "Refresh user error:",
      error
    );

  }
}


/* =========================================================
   SCREEN NAVIGATION
   ========================================================= */

function showScreen(screenName) {

  /*
     IMPORTANT:
     HTML uses:
     homeScreen
     earnScreen
     upgradeScreen
     referScreen
     accountScreen

     Navigation uses:
     home
     earn
     upgrade
     refer
     account
  */

  const screenMap = {

    home:
      "homeScreen",

    earn:
      "earnScreen",

    upgrade:
      "upgradeScreen",

    refer:
      "referScreen",

    account:
      "accountScreen"

  };


  const targetId =
    screenMap[screenName] ||
    screenName;


  document
    .querySelectorAll(
      ".screen"
    )
    .forEach(screen => {

      screen.classList.remove(
        "active"
      );

    });


  const target =
    $(targetId);


  if (target) {

    target.classList.add(
      "active"
    );

  } else {

    console.error(
      "Screen not found:",
      targetId
    );

    return;
  }


  document
    .querySelectorAll(
      ".bottom-nav .nav-item"
    )
    .forEach(item => {

      item.classList.remove(
        "active"
      );


      if (
        item.dataset.target ===
        screenName
      ) {

        item.classList.add(
          "active"
        );

      }

    });
}


/* =========================================================
   UPDATE INTERFACE
   ========================================================= */

function updateInterface() {

  if (!currentUser) {
    return;
  }


  /* =====================================================
     BASIC DATA
     ===================================================== */

  const balance =
    Number(
      currentUser.balance_xcoin ||
      0
    );


  const totalEarned =
    Number(
      currentUser.total_earned_xcoin ||
      0
    );


  const tasks =
    Number(
      currentUser.tasks_completed_today ||
      currentUser.tasks_completed ||
      currentUser.completed_tasks ||
      0
    );


  const videos =
    Number(
      currentUser.videos_watched_today ||
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


  const streak =
    Number(
      currentUser.streak_days ||
      currentUser.checkin_streak ||
      0
    );


  const tier =
    String(
      currentUser.tier ||
      currentUser.plan ||
      "FREE"
    ).toUpperCase();


  /* =====================================================
     BALANCE
     ===================================================== */

  setText(
    "balanceAmount",
    formatNumber(balance)
  );


  setText(
    "balanceUsdt",
    "≈ $" +
    (
      balance /
      XCOIN_PER_USDT
    ).toFixed(4)
  );


  /* =====================================================
     TOTAL EARNED
     ===================================================== */

  setText(
    "totalEarned",
    formatNumber(totalEarned)
  );


  /* =====================================================
     TASKS
     ===================================================== */

  setText(
    "tasksCount",
    formatNumber(tasks)
  );


  setText(
    "tasksCompleted",
    formatNumber(tasks)
  );


  /* =====================================================
     STREAK
     ===================================================== */

  setText(
    "streakCount",
    formatNumber(streak)
  );


  /* =====================================================
     REFERRALS
     ===================================================== */

  setText(
    "referralsCount",
    formatNumber(referrals)
  );


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


  /* =====================================================
     TIER
     ===================================================== */

  setText(
    "tierBadge",
    tier
  );


  setText(
    "currentTier",
    tier
  );


  setText(
    "miningTier",
    tier
  );


  /* =====================================================
     MINING REWARD
     ===================================================== */

  const miningRewards = {

    FREE: 50,

    BRONZE: 100,

    SILVER: 200,

    GOLD: 400

  };


  const miningReward =
    miningRewards[tier] ||
    50;


  setText(
    "miningReward",
    "+" +
    miningReward +
    " XCOIN"
  );


  /* =====================================================
     VIDEO LIMIT
     ===================================================== */

  const videoLimits = {

    FREE: 20,

    BRONZE: 20,

    SILVER: 30,

    GOLD: 50

  };


  const videoLimit =
    videoLimits[tier] ||
    20;


  const safeVideos =
    Math.min(
      videos,
      videoLimit
    );


  setText(
    "videosCompleted",
    safeVideos
  );


  setText(
    "videosLimit",
    videoLimit
  );


  /* =====================================================
     VIDEO PROGRESS
     ===================================================== */

  const videoPercentage =
    Math.min(
      100,
      (
        safeVideos /
        videoLimit
      ) * 100
    );


  const videoProgress =
    $("videoProgress");


  if (videoProgress) {

    videoProgress.style.width =
      videoPercentage +
      "%";

  }


  /* =====================================================
     TASK LIMIT
     ===================================================== */

  const taskLimits = {

    FREE: 10,

    BRONZE: 20,

    SILVER: 30,

    GOLD: 50

  };


  const taskLimit =
    taskLimits[tier] ||
    10;


  const safeTasks =
    Math.min(
      tasks,
      taskLimit
    );


  setText(
    "tasksCompleted",
    safeTasks
  );


  setText(
    "tasksLimit",
    taskLimit
  );


  const taskProgress =
    $("taskProgress");


  if (taskProgress) {

    const percentage =
      Math.min(
        100,
        (
          safeTasks /
          taskLimit
        ) * 100
      );


    taskProgress.style.width =
      percentage +
      "%";

  }


  /* =====================================================
     REFERRAL LINK
     ===================================================== */

  const referralLink =
    $("referralLink");


  if (
    referralLink &&
    telegramUser?.id
  ) {

    referralLink.textContent =
      "https://t.me/XEarnmining_bot?start=ref_" +
      telegramUser.id;

  }


  /* =====================================================
     USER NAME
     ===================================================== */

  const name =
    currentUser.full_name ||
    currentUser.first_name ||
    telegramUser?.first_name ||
    "XEARN User";


  setText(
    "userName",
    name
  );


  /* =====================================================
     TELEGRAM USERNAME
     ===================================================== */

  setText(
    "userTelegram",

    telegramUser?.username

      ? "@" +
        telegramUser.username

      : "Telegram User"

  );


  /* =====================================================
     AVATAR
     ===================================================== */

  const avatar =
    document.querySelector(
      ".avatar"
    );


  if (avatar) {

    const firstLetter =
      (
        currentUser.first_name ||
        "X"
      )
      .charAt(0)
      .toUpperCase();


    avatar.textContent =
      firstLetter;

  }


  /* =====================================================
     MINE PROGRESS
     ===================================================== */

  updateMiningDisplay();

}


/* =========================================================
   MINING DISPLAY
   ========================================================= */

function updateMiningDisplay() {

  if (!currentUser) {
    return;
  }


  const lastMine =
    currentUser.last_mine_time;


  const progressBar =
    $("mineProgressBar");


  const countdown =
    $("mineCountdown");


  if (!lastMine) {

    if (progressBar) {

      progressBar.style.width =
        "0%";

    }


    if (countdown) {

      countdown.textContent =
        "Ready";

    }

    return;
  }


  const lastTime =
    new Date(
      lastMine
    )
    .getTime();


  if (
    !Number.isFinite(
      lastTime
    )
  ) {

    if (countdown) {

      countdown.textContent =
        "Ready";

    }

    return;

  }


  const cycle =
    2 *
    60 *
    60 *
    1000;


  const now =
    Date.now();


  const elapsed =
    now -
    lastTime;


  if (elapsed >= cycle) {

    if (progressBar) {

      progressBar.style.width =
        "100%";

    }


    if (countdown) {

      countdown.textContent =
        "Ready";

    }

    return;

  }


  const remaining =
    cycle -
    elapsed;


  const percentage =
    Math.max(
      0,
      Math.min(
        100,
        (
          elapsed /
          cycle
        ) * 100
      )
    );


  if (progressBar) {

    progressBar.style.width =
      percentage +
      "%";

  }


  const hours =
    Math.floor(
      remaining /
      3600000
    );


  const minutes =
    Math.floor(
      (
        remaining %
        3600000
      ) /
      60000
    );


  const seconds =
    Math.floor(
      (
        remaining %
        60000
      ) /
      1000
    );


  if (countdown) {

    countdown.textContent =
      String(hours)
        .padStart(2, "0") +
      ":" +
      String(minutes)
        .padStart(2, "0") +
      ":" +
      String(seconds)
        .padStart(2, "0");

  }

}


/* =========================================================
   MINING COUNTDOWN REFRESH
   ========================================================= */

setInterval(
  () => {

    if (currentUser) {

      updateMiningDisplay();

    }

  },
  1000
);


/* =========================================================
   WATCH VIDEO
   MONETAG REWARDED INTERSTITIAL
   ========================================================= */

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


  const tier =
    String(
      currentUser?.tier ||
      "FREE"
    ).toUpperCase();


  const videoLimits = {

    FREE: 20,

    BRONZE: 20,

    SILVER: 30,

    GOLD: 50

  };


  const videoLimit =
    videoLimits[tier] ||
    20;


  const videos =
    Number(
      currentUser?.videos_watched_today ||
      0
    );


  if (
    videos >=
    videoLimit
  ) {

    showToast(
      "Daily Limit",
      "You have reached today's video limit."
    );

    return;

  }


  videoRunning =
    true;


  const button =
    $("watchVideoButton");


  if (button) {

    button.disabled =
      true;

  }


  const oldBalance =
    Number(
      currentUser?.balance_xcoin ||
      0
    );


  try {

    const ymid =
      telegramUser.id +
      "_video_" +
      Date.now();


    await window.show_11747212({

      type:
        "end",

      ymid:
        ymid,

      requestVar:
        "video"

    });


    let verified =
      false;


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

        verified =
          true;


        const earned =
          newBalance -
          oldBalance;


        showToast(
          "Awesome!",
          "+" +
          formatNumber(
            earned
          ) +
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

    videoRunning =
      false;


    if (button) {

      button.disabled =
        false;

    }

  }

}


/* =========================================================
   START TASK
   MONETAG REWARDED POPUP
   ========================================================= */

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


  const tier =
    String(
      currentUser?.tier ||
      "FREE"
    ).toUpperCase();


  const taskLimits = {

    FREE: 10,

    BRONZE: 20,

    SILVER: 30,

    GOLD: 50

  };


  const taskLimit =
    taskLimits[tier] ||
    10;


  const tasks =
    Number(
      currentUser?.tasks_completed_today ||
      0
    );


  if (
    tasks >=
    taskLimit
  ) {

    showToast(
      "Daily Limit",
      "You have reached today's task limit."
    );

    return;

  }


  taskRunning =
    true;


  const oldBalance =
    Number(
      currentUser?.balance_xcoin ||
      0
    );


  try {

    const ymid =
      telegramUser.id +
      "_task_" +
      Date.now();


    await window.show_11747212({

      type:
        "pop",

      ymid:
        ymid,

      requestVar:
        "task"

    });


    let verified =
      false;


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

        verified =
          true;


        const earned =
          newBalance -
          oldBalance;


        showToast(
          "Task Completed!",
          "+" +
          formatNumber(
            earned
          ) +
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

    taskRunning =
      false;

  }

}


/* =========================================================
   DAILY CHECK-IN
   MONETAG IN-APP INTERSTITIAL
   NO AUTOMATIC XCOIN REWARD
   ========================================================= */

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


  checkinRunning =
    true;


  try {

    await window.show_11747212({

      type:
        "inApp",

      inAppSettings: {

        frequency:
          2,

        capping:
          0.1,

        interval:
          30,

        timeout:
          5,

        everyPage:
          false

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

    setTimeout(
      () => {

        checkinRunning =
          false;

      },
      2000
    );

  }

}


/* =========================================================
   MINE XCOIN
   ========================================================= */

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


  miningRunning =
    true;


  const button =
    $("mineButton");


  if (button) {

    button.disabled =
      true;

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
      formatNumber(
        reward
      ) +
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

    miningRunning =
      false;


    if (button) {

      button.disabled =
        false;

    }

  }

}


/* =========================================================
   COPY REFERRAL
   ========================================================= */

async function copyReferral() {

  if (!telegramUser?.id) {

    showToast(
      "Referral",
      "Telegram account not available."
    );

    return;

  }


  const link =
    "https://t.me/XEarnmining_bot?start=ref_" +
    telegramUser.id;


  try {

    await navigator.clipboard.writeText(
      link
    );


    showToast(
      "Copied",
      "Your referral link has been copied."
    );

  } catch (error) {

    console.error(
      "Clipboard error:",
      error
    );


    const textarea =
      document.createElement(
        "textarea"
      );


    textarea.value =
      link;


    textarea.style.position =
      "fixed";


    textarea.style.opacity =
      "0";


    document.body.appendChild(
      textarea
    );


    textarea.select();


    try {

      document.execCommand(
        "copy"
      );


      showToast(
        "Copied",
        "Your referral link has been copied."
      );

    } catch {

      showToast(
        "Referral Link",
        link
      );

    }


    textarea.remove();

  }

}


/* =========================================================
   SETUP BUTTONS
   ========================================================= */

function setupButtons() {

  console.log(
    "Setting up XEARN buttons..."
  );


  /* =====================================================
     BOTTOM NAV
     ===================================================== */

  document
    .querySelectorAll(
      ".bottom-nav .nav-item"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const target =
            button.dataset.target;

          if (!target) {
            return;
          }

          showScreen(
            target
          );

        }
      );

    });


  /* =====================================================
     EARN BUTTON
     ===================================================== */

  $("earnButton")
    ?.addEventListener(
      "click",
      () => {

        showScreen(
          "earn"
        );

      }
    );


  /* =====================================================
     WATCH VIDEO BUTTON
     ===================================================== */

  $("watchVideoButton")
    ?.addEventListener(
      "click",
      watchVideo
    );


  /* =====================================================
     ALL VIDEO ITEMS
     Handles duplicate earnVideoItem IDs safely
     ===================================================== */

  document
    .querySelectorAll(
      "#earnVideoItem"
    )
    .forEach(element => {

      element.addEventListener(
        "click",
        watchVideo
      );

    });


  /* =====================================================
     TASK HOME ITEM
     ===================================================== */

  $("taskItem")
    ?.addEventListener(
      "click",
      startTask
    );


  /* =====================================================
     TASK EARN ITEM
     ===================================================== */

  $("earnTaskItem")
    ?.addEventListener(
      "click",
      startTask
    );


  /* =====================================================
     CHECK-IN HOME ITEM
     ===================================================== */

  $("checkinItem")
    ?.addEventListener(
      "click",
      claimDailyCheckin
    );


  /* =====================================================
     CHECK-IN EARN ITEM
     ===================================================== */

  $("earnCheckinItem")
    ?.addEventListener(
      "click",
      claimDailyCheckin
    );


  /* =====================================================
     MINING
     ===================================================== */

  $("mineButton")
    ?.addEventListener(
      "click",
      mineXcoin
    );


  /* =====================================================
     COPY REFERRAL
     ===================================================== */

  $("copyReferralButton")
    ?.addEventListener(
      "click",
      copyReferral
    );


  /* =====================================================
     WITHDRAW
     ===================================================== */

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


  /* =====================================================
     HISTORY
     ===================================================== */

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


  /* =====================================================
     UPGRADE
     ===================================================== */

  document
    .querySelectorAll(
      '[data-target="upgrade"]'
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          showScreen(
            "upgrade"
          );

        }
      );

    });


  $("upgradeButton")
    ?.addEventListener(
      "click",
      () => {

        showScreen(
          "upgrade"
        );

      }
    );


  /* =====================================================
     SPECIAL OFFERS
     ===================================================== */

  $("specialOffersItem")
    ?.addEventListener(
      "click",
      () => {

        showScreen(
          "earn"
        );

        showToast(
          "Special Offers",
          "Available offers will appear here."
        );

      }
    );


  console.log(
    "XEARN buttons ready."
  );
}


/* =========================================================
   START XEARN
   ========================================================= */

async function startXEARN() {

  console.log(
    "XEARN starting..."
  );


  hideLoading();


  /*
     IMPORTANT:
     Use "home", because showScreen()
     translates it to "homeScreen".
  */

  showScreen(
    "home"
  );


  try {

    const ready =
      initializeTelegram();


    if (!ready) {

      createFallbackUser();

      setupButtons();

      return;

    }


    setupButtons();


    await authenticateUser();

  } catch (error) {

    console.error(
      "XEARN startup error:",
      error
    );


    createFallbackUser();

  } finally {

    hideLoading();

  }

}


/* =========================================================
   REFRESH USER EVERY 30 SECONDS
   ========================================================= */

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


/* =========================================================
   BOOT
   ========================================================= */

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
