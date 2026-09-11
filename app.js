/* =========================================================
   XEARN — APP.JS
   Clean replacement
   ========================================================= */

/* =========================================================
   CONFIG
   ========================================================= */

const SUPABASE_URL =
  "https://ynrqdbdgjzmucqcfsyvi.supabase.co";

const SUPABASE_ANON_KEY =
  window.SUPABASE_ANON_KEY ||
  "";

const MONETAG_ZONE =
  "11747212";

const XCOIN_PER_USDT =
  1300;


/* =========================================================
   TELEGRAM
   ========================================================= */

let tg = null;
let telegramUser = null;


/* =========================================================
   USER STATE
   ========================================================= */

let currentUser = null;


/* =========================================================
   RUNNING STATES
   ========================================================= */

let videoRunning = false;
let taskRunning = false;
let checkinRunning = false;
let miningRunning = false;


/* =========================================================
   HELPERS
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}


function setText(id, value) {

  const element = $(id);

  if (!element) {
    return;
  }

  element.textContent = value;
}


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
    toast.querySelector(
      ".toast-title"
    );

  const messageElement =
    toast.querySelector(
      ".toast-message"
    );

  if (titleElement) {
    titleElement.textContent =
      title;
  }

  if (messageElement) {
    messageElement.textContent =
      message;
  }

  toast.classList.add(
    "show"
  );

  setTimeout(() => {

    toast.classList.remove(
      "show"
    );

  }, 3500);
}


function hideLoading() {

  const loading =
    $("loadingScreen");

  if (loading) {

    loading.style.display =
      "none";

  }
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
      "Telegram WebApp unavailable."
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
   SUPABASE FUNCTION CALL
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
      "Authenticated user:",
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

  const screens =
    document.querySelectorAll(
      ".screen"
    );

  screens.forEach(screen => {

    screen.classList.remove(
      "active"
    );

  });


  const target =
    $(screenName);

  if (target) {

    target.classList.add(
      "active"
    );

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


  if (
    typeof window.show_11747212 ===
    "function"
  ) {

    try {

      window.show_11747212({

        type: "inApp",

        inAppSettings: {

          frequency: 2,

          capping: 0.1,

          interval: 30,

          timeout: 5,

          everyPage: false

        }

      });

    } catch (error) {

      console.log(
        "In-app ad:",
        error
      );

    }

  }
}


/* =========================================================
   UPDATE INTERFACE
   ========================================================= */

function updateInterface() {

  if (!currentUser) {
    return;
  }


  /* =====================================================
     BASIC USER DATA
     ===================================================== */

  const balance =
    Number(
      currentUser.balance_xcoin ||
      0
    );


  const tasks =
    Number(
      currentUser.tasks_completed_today ||
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


  /* =====================================================
     BALANCE
     ===================================================== */

  setText(
    "balanceAmount",
    formatNumber(balance)
  );


  setText(
    "balanceUsdt",
    "$" +
    (balance / XCOIN_PER_USDT)
      .toFixed(4)
  );


  setText(
    "totalEarned",
    formatNumber(
      currentUser.total_earned_xcoin ||
      0
    )
  );


  /* =====================================================
     TASKS
     ===================================================== */

  setText(
    "tasksCount",
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


  /* =====================================================
     MINING REWARD
     ===================================================== */

  const miningRewards = {

    FREE: 50,

    BRONZE: 100,

    SILVER: 200,

    GOLD: 400

  };


  setText(
    "miningReward",
    "+" +
    (
      miningRewards[tier] ||
      miningRewards.FREE
    ) +
    " XCOIN"
  );


  /* =====================================================
     ACCOUNT
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


  setText(
    "userTelegram",

    telegramUser?.username

      ? "@" +
        telegramUser.username

      : "Telegram User"

  );


  /* =====================================================
     DAILY VIDEOS
     ===================================================== */

  const videos =
    Number(
      currentUser.videos_watched_today ||
      0
    );


  const videoLimits = {

    FREE: 20,

    BRONZE: 20,

    SILVER: 30,

    GOLD: 50

  };


  const videoLimit =
    videoLimits[tier] ||
    20;


  const safeVideoCount =
    Math.min(
      videos,
      videoLimit
    );


  setText(
    "videosCompleted",
    safeVideoCount
  );


  setText(
    "videosLimit",
    videoLimit
  );


  const videoPercentage =
    Math.min(
      100,

      (
        safeVideoCount /
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
     DAILY TASKS
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


  const safeTaskCount =
    Math.min(
      tasks,
      taskLimit
    );


  setText(
    "tasksCompleted",
    safeTaskCount
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
          safeTaskCount /
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
     PROFILE PHOTO
     ===================================================== */

  const photo =
    currentUser.photo_url ||
    telegramUser?.photo_url ||
    "";


  document
    .querySelectorAll(
      "[data-user-photo]"
    )
    .forEach(element => {

      if (photo) {

        element.src =
          photo;

      }

    });

}


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


  const limits = {

    FREE: 20,

    BRONZE: 20,

    SILVER: 30,

    GOLD: 50

  };


  const currentVideos =
    Number(
      currentUser?.videos_watched_today ||
      0
    );


  const dailyLimit =
    limits[tier] ||
    20;


  if (
    currentVideos >=
    dailyLimit
  ) {

    showToast(
      "Daily Limit",
      "You have reached today's video limit."
    );

    return;

  }


  videoRunning = true;


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

      type: "end",

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
   TASK
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


  const currentTasks =
    Number(
      currentUser?.tasks_completed_today ||
      0
    );


  const dailyLimit =
    taskLimits[tier] ||
    10;


  if (
    currentTasks >=
    dailyLimit
  ) {

    showToast(
      "Daily Limit",
      "You have reached today's task limit."
    );

    return;

  }


  taskRunning =
    true;


  const button =
    $("taskItem");


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
      "_task_" +
      Date.now();


    await window.show_11747212({

      type: "pop",

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


    if (button) {

      button.disabled =
        false;

    }

  }

}


/* =========================================================
   DAILY CHECK-IN
   MONETAG IN-APP INTERSTITIAL
   NO AUTOMATIC REWARD
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


  const button =
    $("checkinButton");


  if (button) {

    button.disabled =
      true;

  }


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


        if (button) {

          button.disabled =
            false;

        }

      },
      2000
    );

  }

}


/* =========================================================
   MINING
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
      "Copy error:",
      error
    );


    const input =
      document.createElement(
        "textarea"
      );


    input.value =
      link;


    document.body.appendChild(
      input
    );


    input.select();


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


    input.remove();

  }

}


/* =========================================================
   SETUP BUTTONS
   ========================================================= */

function setupButtons() {

  /* =====================================================
     BOTTOM NAVIGATION
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

          if (target) {

            showScreen(
              target
            );

          }

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
     WATCH VIDEO
     ===================================================== */

  $("watchVideoButton")
    ?.addEventListener(
      "click",
      watchVideo
    );


  /* =====================================================
     EARN VIDEO ITEM
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
     TASK
     ===================================================== */

  $("taskItem")
    ?.addEventListener(
      "click",
      startTask
    );


  /* =====================================================
     CHECK-IN BUTTON
     ===================================================== */

  $("checkinButton")
    ?.addEventListener(
      "click",
      claimDailyCheckin
    );


  /* =====================================================
     CHECK-IN ITEM
     ===================================================== */

  $("checkinItem")
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
     REFERRAL
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

  $("upgradeButton")
    ?.addEventListener(
      "click",
      () => {

        showScreen(
          "upgrade"
        );

      }
    );


  $("upgradeNavButton")
    ?.addEventListener(
      "click",
      () => {

        showScreen(
          "upgrade"
        );

      }
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


  showScreen(
    "home"
  );


  try {

    const ready =
      initializeTelegram();


    if (!ready) {

      createFallbackUser();

      return;

    }


    setupButtons();


    await authenticateUser();


  } catch (error) {

    console.error(
      "Startup error:",
      error
    );


    createFallbackUser();

  } finally {

    hideLoading();

  }

}


/* =========================================================
   AUTOMATIC USER REFRESH
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
