const SUPABASE_URL =
  "https://ynrqdbdgjzmucqcfsyvi.supabase.co";

const FUNCTION_BASE =
  SUPABASE_URL + "/functions/v1";

const MONETAG_ZONE_ID = "11747212";

const XCOIN_USDT_RATE = 1300;

const TIER_RULES = {
  FREE: {
    reward: 50,
    maxMines: 1,
    maxAds: 20
  },

  BRONZE: {
    reward: 100,
    maxMines: 3,
    maxAds: 20
  },

  SILVER: {
    reward: 200,
    maxMines: 6,
    maxAds: 30
  },

  GOLD: {
    reward: 400,
    maxMines: 12,
    maxAds: 50
  }
};

const SMARTLINK =
  "https://www.profitableratecpmnetwork.com/skzazzs529?key=b1a6eab3a3ea4f3a76a00dc123bde88f";

const tg =
  window.Telegram &&
  window.Telegram.WebApp
    ? window.Telegram.WebApp
    : null;

let telegramUser = null;
let currentUser = null;
let currentTier = "FREE";

let miningTimer = null;
let toastTimer = null;

let busyMining = false;
let busyVideo = false;
let busyCheckin = false;

const $ = (id) =>
  document.getElementById(id);

const qs = (selector) =>
  document.querySelector(selector);

const qsa = (selector) =>
  document.querySelectorAll(selector);

document.addEventListener(
  "DOMContentLoaded",
  init
);

async function init() {

  setupNavigation();
  setupButtons();

  if (tg) {
    tg.ready();
    tg.expand();

    try {
      tg.setHeaderColor("#050805");
      tg.setBackgroundColor("#050805");
    } catch (_) {}
  }

  telegramUser =
    tg &&
    tg.initDataUnsafe &&
    tg.initDataUnsafe.user
      ? tg.initDataUnsafe.user
      : null;

  if (!telegramUser) {

    showToast(
      "Telegram Required",
      "Open XEarn from Telegram."
    );

    hideLoading();
    return;
  }

  await authenticateUser();
}

async function callFunction(
  functionName,
  body = {}
) {

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

        body: JSON.stringify(body)
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

    const message =
      data &&
      (
        data.error ||
        data.message ||
        data.details
      );

    throw new Error(
      message ||
      "Request failed"
    );
  }

  return data;
}

async function authenticateUser() {

  try {

    const data =
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
      data.user ||
      data.data ||
      data;

    updateInterface();

    hideLoading();

  } catch (error) {

    console.error(
      "Authentication error:",
      error
    );

    showToast(
      "Connection Error",
      "Unable to load your XEarn account."
    );

    hideLoading();
  }
}

async function refreshUser() {

  if (!telegramUser) return;

  try {

    const data =
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
      data.user ||
      data.data ||
      data;

    updateInterface();

  } catch (error) {

    console.error(
      "Refresh error:",
      error
    );
  }
}

function getValue(
  object,
  names,
  fallback = 0
) {

  if (!object)
    return fallback;

  for (
    const name of names
  ) {

    if (
      object[name] !==
        undefined &&
      object[name] !== null
    ) {
      return object[name];
    }
  }

  return fallback;
}

function normalizeTier(value) {

  const tier =
    String(
      value || "FREE"
    )
      .trim()
      .toUpperCase();

  return TIER_RULES[tier]
    ? tier
    : "FREE";
}

function setText(
  id,
  value
) {

  const element = $(id);

  if (element) {
    element.textContent =
      value;
  }
}

function formatNumber(number) {

  return (
    Number(number) || 0
  ).toLocaleString(
    "en-US",
    {
      maximumFractionDigits: 2
    }
  );
}
function updateInterface() {

  if (!currentUser) return;

  const balance =
    Number(
      getValue(
        currentUser,
        [
          "balance_xcoin",
          "balance",
          "xcoin_balance"
        ],
        0
      )
    );

  const tasks =
    Number(
      getValue(
        currentUser,
        [
          "tasks_completed",
          "completed_tasks",
          "task_count"
        ],
        0
      )
    );

  const referrals =
    Number(
      getValue(
        currentUser,
        [
          "referrals_count",
          "referral_count",
          "total_referrals"
        ],
        0
      )
    );

  const referralEarnings =
    Number(
      getValue(
        currentUser,
        [
          "referral_earnings_xcoin",
          "referral_earnings"
        ],
        0
      )
    );

  const streak =
    Number(
      getValue(
        currentUser,
        [
          "streak",
          "streak_days",
          "checkin_streak"
        ],
        0
      )
    );

  const videos =
    Number(
      getValue(
        currentUser,
        [
          "videos_completed",
          "ads_watched",
          "video_count"
        ],
        0
      )
    );

  currentTier =
    normalizeTier(
      getValue(
        currentUser,
        [
          "tier",
          "plan",
          "membership_tier"
        ],
        "FREE"
      )
    );

  setText(
    "balanceAmount",
    formatNumber(balance)
  );

  setText(
    "balanceUsdt",
    (
      balance /
      XCOIN_USDT_RATE
    ).toFixed(2)
  );

  setText(
    "tasksCount",
    formatNumber(tasks)
  );

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
    )
  );

  setText(
    "streakCount",
    formatNumber(streak)
  );

  setText(
    "currentTier",
    currentTier
  );

  setText(
    "tierBadge",
    currentTier
  );

  setText(
    "miningReward",
    "+" +
      TIER_RULES[
        currentTier
      ].reward +
      " XCOIN"
  );

  setText(
    "videosCompleted",
    formatNumber(videos)
  );

  setText(
    "videosLimit",
    TIER_RULES[
      currentTier
    ].maxAds
  );

  const name =
    getValue(
      currentUser,
      [
        "full_name",
        "name",
        "username"
      ],
      ""
    );

  const telegramName =
    telegramUser
      ? [
          telegramUser.first_name,
          telegramUser.last_name
        ]
          .filter(Boolean)
          .join(" ")
      : "";

  setText(
    "userName",
    name ||
      telegramName ||
      "XEARN User"
  );

  const username =
    telegramUser &&
    telegramUser.username
      ? "@" +
        telegramUser.username
      : telegramUser
        ? "ID: " +
          telegramUser.id
        : "";

  setText(
    "userTelegram",
    username
  );

  updateReferralLink();

  updateVideoProgress(
    videos
  );

  updateMiningUI();
}


/* =========================
   NAVIGATION
   ========================= */

function setupNavigation() {

  qsa("[data-target]")
    .forEach(
      (button) => {

        button.addEventListener(
          "click",
          () => {

            const target =
              button.dataset
                .target;

            navigateTo(
              target
            );
          }
        );

      }
    );
}

function navigateTo(
  screenName
) {

  qsa(".screen")
    .forEach(
      (screen) => {

        screen.classList
          .remove("active");

      }
    );

  const screen =
    $(
      screenName +
      "Screen"
    );

  if (screen) {
    screen.classList
      .add("active");
  }

  qsa(".nav-item")
    .forEach(
      (button) => {

        button.classList
          .toggle(
            "active",
            button.dataset
              .target ===
              screenName
          );

      }
    );

  qsa(
    ".upgrade-nav-button"
  )
    .forEach(
      (button) => {

        button.classList
          .toggle(
            "active",
            button.dataset
              .target ===
              screenName
          );

      }
    );

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================
   BUTTONS
   ========================= */

function setupButtons() {

  $("earnButton")
    ?.addEventListener(
      "click",
      () => navigateTo("earn")
    );

  $("withdrawButton")
    ?.addEventListener(
      "click",
      openWithdraw
    );

  $("withdrawAccountButton")
    ?.addEventListener(
      "click",
      openWithdraw
    );

  $("mineButton")
    ?.addEventListener(
      "click",
      mine
    );

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

  $("taskItem")
    ?.addEventListener(
      "click",
      openTask
    );

  $("checkinButton")
    ?.addEventListener(
      "click",
      dailyCheckin
    );

  $("checkinItem")
    ?.addEventListener(
      "click",
      dailyCheckin
    );

  $("refreshBalance")
    ?.addEventListener(
      "click",
      async () => {

        await refreshUser();

        showToast(
          "Balance Updated",
          "Your account has been refreshed."
        );

      }
    );

  $("copyReferralButton")
    ?.addEventListener(
      "click",
      copyReferral
    );

  $("historyButton")
    ?.addEventListener(
      "click",
      openHistory
    );

  $("supportButton")
    ?.addEventListener(
      "click",
      openSupport
    );

  $("notificationButton")
    ?.addEventListener(
      "click",
      () => {

        showToast(
          "Notifications",
          "You're all caught up."
        );

      }
    );

  qsa(".plan-card")
    .forEach(
      (card) => {

        card.addEventListener(
          "click",
          () => {

            openUpgrade(
              card.dataset.plan
            );

          }
        );

      }
    );

  $("modalClose")
    ?.addEventListener(
      "click",
      closeModal
    );

  $("modalAction")
    ?.addEventListener(
      "click",
      closeModal
    );

  $("modalOverlay")
    ?.addEventListener(
      "click",
      (event) => {

        if (
          event.target ===
          $("modalOverlay")
        ) {
          closeModal();
        }

      }
    );
}


/* =========================
   MINING
   ========================= */

async function mine() {

  if (busyMining)
    return;

  if (!telegramUser) {

    showToast(
      "Telegram Required",
      "Open the app from Telegram."
    );

    return;
  }

  busyMining = true;

  const button =
    $("mineButton");

  if (button)
    button.disabled = true;

  setText(
    "mineButtonText",
    "MINING..."
  );

  try {

    const result =
      await callFunction(
        "mine-xcoin",
        {
          telegram_id:
            telegramUser.id
        }
      );

    if (
      result &&
      (
        result.success ===
          false ||
        result.error
      )
    ) {
      throw new Error(
        result.error ||
        "Mining failed."
      );
    }

    await refreshUser();

    const reward =
      Number(
        result?.reward_xcoin ||
        result?.reward ||
        TIER_RULES[
          currentTier
        ].reward
      );

    showSuccess(
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
        "Please try again later."
    );

  } finally {

    busyMining = false;

    if (button)
      button.disabled = false;

    setText(
      "mineButtonText",
      "MINE"
    );

    await refreshUser();
  }
}


/* =========================
   MINING STATUS
   ========================= */

function updateMiningUI() {

  if (!currentUser)
    return;

  const lastMine =
    getValue(
      currentUser,
      [
        "last_mine_at",
        "last_mining_at"
      ],
      null
    );

  if (!lastMine) {

    setText(
      "miningStatus",
      "Ready to mine"
    );

    setText(
      "mineCountdown",
      "Ready"
    );

    setProgress(
      "mineProgress",
      100
    );

    return;
  }

  const lastTime =
    new Date(
      lastMine
    ).getTime();

  if (
    !Number.isFinite(
      lastTime
    )
  )
    return;

  const cooldown =
    2 *
    60 *
    60 *
    1000;

  const elapsed =
    Date.now() -
    lastTime;

  const remaining =
    cooldown -
    elapsed;

  if (remaining <= 0) {

    setText(
      "miningStatus",
      "Ready to mine"
    );

    setText(
      "mineCountdown",
      "Ready"
    );

    setProgress(
      "mineProgress",
      100
    );

    return;
  }

  setText(
    "miningStatus",
    "Mining cooldown active"
  );

  updateMineCountdown(
    remaining,
    elapsed,
    cooldown
  );

  clearInterval(
    miningTimer
  );

  miningTimer =
    setInterval(
      () => {

        const left =
          cooldown -
          (
            Date.now() -
            lastTime
          );

        if (left <= 0) {

          clearInterval(
            miningTimer
          );

          setText(
            "miningStatus",
            "Ready to mine"
          );

          setText(
            "mineCountdown",
            "Ready"
          );

          setProgress(
            "mineProgress",
            100
          );

          return;
        }

        updateMineCountdown(
          left,
          Date.now() -
            lastTime,
          cooldown
        );

      },
      1000
    );
}

function updateMineCountdown(
  remaining,
  elapsed,
  cooldown
) {

  const seconds =
    Math.ceil(
      remaining / 1000
    );

  const hours =
    Math.floor(
      seconds / 3600
    );

  const minutes =
    Math.floor(
      (seconds % 3600) /
      60
    );

  const secs =
    seconds % 60;

  setText(
    "mineCountdown",
    pad(hours) +
      ":" +
      pad(minutes) +
      ":" +
      pad(secs)
  );

  setProgress(
    "mineProgress",
    (
      elapsed /
      cooldown
    ) * 100
  );
}

function pad(number) {

  return String(number)
    .padStart(2, "0");
}
/* =========================
   MONETAG ID
   ========================= */

function createYMID() {

  const id =
    telegramUser
      ? telegramUser.id
      : "unknown";

  const random =
    Math.random()
      .toString(36)
      .slice(2, 12);

  return (
    "xearn_" +
    id +
    "_" +
    Date.now() +
    "_" +
    random
  );
}


/* =========================
   WATCH VIDEO
   ========================= */

async function watchVideo() {

  if (busyVideo)
    return;

  if (!telegramUser) {

    showToast(
      "Telegram Required",
      "Open the app from Telegram."
    );

    return;
  }

  const completed =
    Number(
      getValue(
        currentUser,
        [
          "videos_completed",
          "ads_watched",
          "video_count"
        ],
        0
      )
    );

  const limit =
    TIER_RULES[
      currentTier
    ].maxAds;

  if (completed >= limit) {

    showToast(
      "Daily Limit Reached",
      "Your video limit resets daily."
    );

    return;
  }

  if (
    typeof window
      .show_11747212 !==
    "function"
  ) {

    showToast(
      "Video Unavailable",
      "Please try again shortly."
    );

    return;
  }

  busyVideo = true;

  const button =
    $("watchVideoButton");

  if (button)
    button.disabled = true;

  const ymid =
    createYMID();

  try {

    await window
      .show_11747212({
        type: "end",
        ymid: ymid,
        requestVar:
          "watch_video"
      });

    setText(
      "watchVideoButton",
      "VERIFYING..."
    );

    const verified =
      await waitForVideoVerification(
        15000
      );

    if (verified) {

      await refreshUser();

      showSuccess(
        "Video Complete!",
        "Your XCOIN reward has been credited."
      );

    } else {

      showToast(
        "Verification Pending",
        "Your reward will appear after verification."
      );

      await refreshUser();
    }

  } catch (error) {

    console.error(
      "Video error:",
      error
    );

    showToast(
      "Video Not Completed",
      "Please complete the video and try again."
    );

  } finally {

    busyVideo = false;

    if (button)
      button.disabled = false;

    setText(
      "watchVideoButton",
      "WATCH"
    );
  }
}


/* =========================
   VIDEO VERIFICATION
   ========================= */

async function waitForVideoVerification(
  timeout
) {

  const start =
    Date.now();

  const oldBalance =
    Number(
      getValue(
        currentUser,
        [
          "balance_xcoin",
          "balance",
          "xcoin_balance"
        ],
        0
      )
    );

  const oldVideos =
    Number(
      getValue(
        currentUser,
        [
          "videos_completed",
          "ads_watched",
          "video_count"
        ],
        0
      )
    );

  while (
    Date.now() -
      start <
    timeout
  ) {

    await sleep(2500);

    await refreshUser();

    const newBalance =
      Number(
        getValue(
          currentUser,
          [
            "balance_xcoin",
            "balance",
            "xcoin_balance"
          ],
          0
        )
      );

    const newVideos =
      Number(
        getValue(
          currentUser,
          [
            "videos_completed",
            "ads_watched",
            "video_count"
          ],
          0
        )
      );

    if (
      newBalance >
        oldBalance ||
      newVideos >
        oldVideos
    ) {
      return true;
    }
  }

  return false;
}


/* =========================
   VIDEO PROGRESS
   ========================= */

function updateVideoProgress(
  completed
) {

  const limit =
    TIER_RULES[
      currentTier
    ].maxAds;

  const percent =
    limit > 0
      ? (
          completed /
          limit
        ) * 100
      : 0;

  setProgress(
    "videoProgress",
    percent
  );
}


/* =========================
   TASK
   ========================= */

async function openTask() {

  if (!telegramUser) {

    showToast(
      "Telegram Required",
      "Open the app from Telegram."
    );

    return;
  }

  if (
    typeof window
      .show_11747212 !==
    "function"
  ) {

    showToast(
      "Task Unavailable",
      "Please try again shortly."
    );

    return;
  }

  const ymid =
    createYMID();

  try {

    await window
      .show_11747212({
        type: "pop",
        ymid: ymid,
        requestVar:
          "task"
      });

    showToast(
      "Task Submitted",
      "Waiting for verification."
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
  }
}


/* =========================
   DAILY CHECK-IN
   ========================= */

async function dailyCheckin() {

  if (busyCheckin)
    return;

  if (!telegramUser) {

    showToast(
      "Telegram Required",
      "Open the app from Telegram."
    );

    return;
  }

  busyCheckin = true;

  const button =
    $("checkinButton");

  if (button)
    button.disabled = true;

  try {

    openExternalLink(
      SMARTLINK
    );

    showToast(
      "Daily Check-in",
      "Check-in page opened."
    );

  } catch (error) {

    console.error(
      "Check-in error:",
      error
    );

    showToast(
      "Check-in Error",
      "Please try again."
    );

  } finally {

    setTimeout(
      () => {

        busyCheckin = false;

        if (button)
          button.disabled = false;

      },
      2000
    );
  }
}


/* =========================
   REFERRAL
   ========================= */

function updateReferralLink() {

  if (!telegramUser)
    return;

  const bot =
    "XEarnmining_bot";

  const link =
    "https://t.me/" +
    bot +
    "?start=ref_" +
    telegramUser.id;

  setText(
    "referralLink",
    link
  );
}


async function copyReferral() {

  const element =
    $("referralLink");

  const link =
    element
      ? element.textContent
      : "";

  if (!link)
    return;

  try {

    await navigator
      .clipboard
      .writeText(link);

    showToast(
      "Copied",
      "Referral link copied."
    );

  } catch (error) {

    showToast(
      "Copy Failed",
      "Please copy the link manually."
    );
  }
}


/* =========================
   WITHDRAW
   ========================= */

function openWithdraw() {

  const balance =
    Number(
      getValue(
        currentUser,
        [
          "balance_xcoin",
          "balance",
          "xcoin_balance"
        ],
        0
      )
    );

  const minimum =
    10 * XCOIN_USDT_RATE;

  if (
    balance <
    minimum
  ) {

    showModal(
      "Withdrawal Locked",
      "You need at least " +
        formatNumber(
          minimum
        ) +
        " XCOIN ($10.00) to withdraw.",
      "OK"
    );

    return;
  }

  showModal(
    "Withdrawal",
    "Your balance is eligible for withdrawal.",
    "OK"
  );
}


/* =========================
   HISTORY
   ========================= */

function openHistory() {

  showModal(
    "Transaction History",
    "Your verified transactions will appear here.",
    "OK"
  );
}


/* =========================
   SUPPORT
   ========================= */

function openSupport() {

  openExternalLink(
    "https://t.me/XEarnmining_bot"
  );
}


/* =========================
   UPGRADE
   ========================= */

function openUpgrade(plan) {

  const tier =
    normalizeTier(plan);

  const prices = {
    BRONZE: "$5",
    SILVER: "$15",
    GOLD: "$30"
  };

  showModal(
    tier + " Upgrade",
    tier +
      " upgrade price: " +
      prices[tier] +
      ".",
    "OK"
  );
}


/* =========================
   MODAL
   ========================= */

function showModal(
  title,
  message,
  buttonText
) {

  setText(
    "modalTitle",
    title
  );

  setText(
    "modalMessage",
    message
  );

  setText(
    "modalAction",
    buttonText || "OK"
  );

  const modal =
    $("modalOverlay");

  if (!modal)
    return;

  modal.classList.add(
    "show"
  );

  modal.setAttribute(
    "aria-hidden",
    "false"
  );
}


function closeModal() {

  const modal =
    $("modalOverlay");

  if (!modal)
    return;

  modal.classList.remove(
    "show"
  );

  modal.setAttribute(
    "aria-hidden",
    "true"
  );
}


/* =========================
   SUCCESS
   ========================= */

function showSuccess(
  title,
  message
) {

  setText(
    "toastTitle",
    title
  );

  setText(
    "toastMessage",
    message
  );

  const toast =
    $("toast");

  if (!toast)
    return;

  toast.classList.add(
    "show"
  );

  clearTimeout(
    toastTimer
  );

  toastTimer =
    setTimeout(
      () => {

        toast.classList.remove(
          "show"
        );

      },
      3500
    );
}


/* =========================
   TOAST
   ========================= */

function showToast(
  title,
  message
) {

  setText(
    "toastTitle",
    title
  );

  setText(
    "toastMessage",
    message
  );

  const toast =
    $("toast");

  if (!toast)
    return;

  toast.classList.add(
    "show"
  );

  clearTimeout(
    toastTimer
  );

  toastTimer =
    setTimeout(
      () => {

        toast.classList.remove(
          "show"
        );

      },
      3500
    );
       }
/* =========================
   PROGRESS BAR
   ========================= */

function setProgress(
  id,
  percent
) {

  const element =
    $(id);

  if (!element)
    return;

  const value =
    Math.min(
      100,
      Math.max(
        0,
        Number(percent) || 0
      )
    );

  element.style.width =
    value + "%";
}


/* =========================
   LOADING SCREEN
   ========================= */

function hideLoading() {

  const loading =
    $("loadingScreen");

  if (!loading)
    return;

  setTimeout(
    () => {

      loading.classList.add(
        "hidden"
      );

    },
    250
  );
}


/* =========================
   EXTERNAL LINK
   ========================= */

function openExternalLink(
  url
) {

  try {

    if (
      tg &&
      typeof tg.openLink ===
        "function"
    ) {

      tg.openLink(url);

    } else {

      window.open(
        url,
        "_blank"
      );

    }

  } catch (error) {

    window.open(
      url,
      "_blank"
    );
  }
}


/* =========================
   WAIT
   ========================= */

function sleep(ms) {

  return new Promise(
    (resolve) => {

      setTimeout(
        resolve,
        ms
      );

    }
  );
}


/* =========================
   TELEGRAM BACK BUTTON
   ========================= */

if (tg) {

  try {

    tg.BackButton.onClick(
      () => {

        navigateTo(
          "home"
        );

        tg.BackButton.hide();

      }
    );

  } catch (error) {

    console.log(
      "Telegram BackButton unavailable"
    );

  }
}


/* =========================
   PREVENT DOUBLE TAP ZOOM
   ========================= */

let lastTouchEnd = 0;

document.addEventListener(
  "touchend",
  (event) => {

    const now =
      Date.now();

    if (
      now -
      lastTouchEnd <=
      300
    ) {

      event.preventDefault();

    }

    lastTouchEnd =
      now;

  },
  {
    passive: false
  }
);


/* =========================
   INITIAL MONETAG CHECK
   ========================= */

window.addEventListener(
  "load",
  () => {

    if (
      typeof window
        .show_11747212 !==
      "function"
    ) {

      console.warn(
        "Monetag SDK not ready."
      );

    }

  }
);


/* =========================
   ERROR PROTECTION
   ========================= */

window.addEventListener(
  "error",
  (event) => {

    console.error(
      "XEARN error:",
      event.error ||
        event.message
    );

  }
);


/* =========================
   FINISHED
   ========================= */
