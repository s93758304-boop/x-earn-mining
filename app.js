/* =========================================================
   X EARN MINING
   Production Frontend Controller
   Monetag Rewarded Interstitial Integration
   ========================================================= */

"use strict";

/* =========================
   CONFIGURATION
   ========================= */

const SUPABASE_URL =
  "https://ynrqdbdgjzmucqcfsyvi.supabase.co";

const FUNCTIONS_URL =
  `${SUPABASE_URL}/functions/v1`;

const MONETAG_ZONE_ID = "11747212";

const WATCH_VIDEO_REWARD = 1.04;
const XCOIN_USDT_RATE = 1300;

const DAILY_CHECKIN_LINK =
  "https://www.profitableratecpmnetwork.com/skzazzs529?key=b1a6eab3a3ea4f3a76a00dc123bde88f";


/* =========================
   TELEGRAM
   ========================= */

const tg = window.Telegram && window.Telegram.WebApp
  ? window.Telegram.WebApp
  : null;

if (tg) {
  tg.ready();
  tg.expand();

  try {
    tg.setHeaderColor("#070910");
    tg.setBackgroundColor("#070910");
  } catch (_) {}
}


/* =========================
   APPLICATION STATE
   ========================= */

let currentUser = null;
let currentTier = null;
let isAuthenticated = false;
let isMining = false;
let isWatchingVideo = false;

let mineTimerInterval = null;
let refreshTimer = null;


/* =========================
   HELPERS
   ========================= */

function $(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

function showElement(id) {
  const el = $(id);
  if (el) el.style.display = "";
}

function hideElement(id) {
  const el = $(id);
  if (el) el.style.display = "none";
}

function formatNumber(value) {
  const number = Number(value || 0);

  return number.toLocaleString("en-US", {
    maximumFractionDigits: 2
  });
}

function formatXcoin(value) {
  return formatNumber(value);
}

function xcoinToUsd(value) {
  return Number(value || 0) / XCOIN_USDT_RATE;
}

function formatUsd(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* =========================
   TOAST
   ========================= */

function toast(message, type = "normal") {
  const el = $("toast");

  if (!el) {
    console.log(message);
    return;
  }

  el.textContent = message;

  el.classList.remove(
    "show",
    "success",
    "error",
    "warning"
  );

  if (type === "success") {
    el.classList.add("success");
  }

  if (type === "error") {
    el.classList.add("error");
  }

  if (type === "warning") {
    el.classList.add("warning");
  }

  requestAnimationFrame(() => {
    el.classList.add("show");
  });

  clearTimeout(el._toastTimer);

  el._toastTimer = setTimeout(() => {
    el.classList.remove("show");
  }, 3200);
}


/* =========================
   LOADING STATUS
   ========================= */

function setAuthStatus(message) {
  const el = $("authStatus");

  if (el) {
    el.textContent = message;
  }
}


/* =========================
   TELEGRAM INIT DATA
   ========================= */

function getInitData() {
  if (!tg) return "";

  return tg.initData || "";
}

function getTelegramUser() {
  if (!tg || !tg.initDataUnsafe) return null;

  return tg.initDataUnsafe.user || null;
}


/* =========================
   SUPABASE FUNCTION CALL
   ========================= */

async function callFunction(functionName, body = {}) {
  const response = await fetch(
    `${FUNCTIONS_URL}/${functionName}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );

  let data = null;

  try {
    data = await response.json();
  } catch (_) {
    data = null;
  }

  if (!response.ok) {
    const message =
      data?.error ||
      data?.message ||
      `Request failed (${response.status})`;

    throw new Error(message);
  }

  return data;
}


/* =========================
   AUTHENTICATION
   ========================= */

async function authenticate() {
  const initData = getInitData();

  if (!initData) {
    setAuthStatus("Open X Earn Mining inside Telegram.");
    toast(
      "Open the Mini App from Telegram.",
      "warning"
    );
    return false;
  }

  setAuthStatus("Connecting...");

  try {
    const data = await callFunction(
      "telegram-auth",
      {
        initData
      }
    );

    if (!data || !data.user) {
      throw new Error("Invalid authentication response.");
    }

    currentUser = data.user;
    currentTier = data.tier || null;
    isAuthenticated = true;

    setAuthStatus("");

    renderUser();

    startMiningTimer();

    return true;

  } catch (error) {
    console.error("Authentication error:", error);

    setAuthStatus("Unable to connect.");

    toast(
      error.message || "Unable to connect to the server.",
      "error"
    );

    return false;
  }
}


/* =========================
   USER RENDERING
   ========================= */

function renderUser() {
  if (!currentUser) return;

  const user = currentUser;
  const tier = currentTier || {};

  const fullName =
    user.full_name ||
    user.name ||
    getTelegramUser()?.first_name ||
    "X Earn User";

  const username =
    user.username ||
    getTelegramUser()?.username ||
    "";

  const telegramId =
    user.telegram_id ||
    getTelegramUser()?.id ||
    "";

  const balance =
    Number(user.balance_xcoin || 0);

  const totalEarned =
    Number(user.total_earned_xcoin || 0);

  const referralEarned =
    Number(
      user.referral_earnings_xcoin ||
      user.ref_earned_xcoin ||
      0
    );

  const mineCount =
    Number(
      user.mines_count ||
      user.mine_count ||
      0
    );

  const adsToday =
    Number(
      user.ads_today ||
      user.ad_count_today ||
      0
    );

  /* Profile */

  setText("profileName", fullName);

  setText(
    "profileId",
    telegramId ? `ID: ${telegramId}` : ""
  );

  /* Avatar */

  const avatar = $("avatar");

  if (avatar) {
    const firstLetter =
      String(fullName)
        .trim()
        .charAt(0)
        .toUpperCase() || "X";

    avatar.textContent = firstLetter;
  }

  /* Tier */

  const tierName =
    tier.name ||
    tier.tier_name ||
    user.tier ||
    "FREE";

  setText(
    "tierPill",
    String(tierName).toUpperCase()
  );

  /* Balance */

  setText(
    "balance",
    formatXcoin(balance)
  );

  setText(
    "usdBalance",
    formatUsd(xcoinToUsd(balance))
  );

  setText(
    "totalEarned",
    formatXcoin(totalEarned)
  );

  setText(
    "refEarned",
    formatXcoin(referralEarned)
  );

  /* Mining */

  const mineLimit =
    Number(
      tier.mines_per_cycle ||
      tier.mine_limit ||
      tier.mines ||
      1
    );

  setText(
    "mineStat",
    `${mineCount} / ${mineLimit}`
  );

  /* Ads */

  const adLimit =
    Number(
      tier.ads_per_day ||
      tier.daily_ads ||
      tier.ads_limit ||
      10
    );

  setText(
    "adsStat",
    `${adsToday} / ${adLimit}`
  );

  const progress =
    adLimit > 0
      ? Math.min(100, (adsToday / adLimit) * 100)
      : 0;

  const progressBar = $("adProgressBar");

  if (progressBar) {
    progressBar.style.width = `${progress}%`;
  }

  /* Mining subtitle */

  const mineSub = $("mineSub");

  if (mineSub) {
    if (mineCount >= mineLimit) {
      mineSub.textContent =
        "Mining limit reached";
    } else {
      mineSub.textContent =
        "Mine and earn XCOIN";
    }
  }

  /* Watch video button */

  const adsButton = $("adsBtn");

  if (adsButton && !isWatchingVideo) {
    adsButton.disabled = false;
  }
}


/* =========================
   REFRESH USER DATA
   ========================= */

async function refreshUser(showMessage = false) {
  if (!isAuthenticated) return false;

  const initData = getInitData();

  if (!initData) return false;

  try {
    const data = await callFunction(
      "telegram-auth",
      {
        initData
      }
    );

    if (data?.user) {
      currentUser = data.user;
      currentTier = data.tier || currentTier;

      renderUser();

      if (showMessage) {
        toast(
          "Balance updated.",
          "success"
        );
      }

      return true;
    }

  } catch (error) {
    console.error(
      "Refresh error:",
      error
    );
  }

  return false;
}


/* =========================
   MINING
   ========================= */

async function mineXcoin() {
  if (!isAuthenticated) {
    toast(
      "Please wait for authentication.",
      "warning"
    );
    return;
  }

  if (isMining) return;

  const button = $("mineBtn");

  if (button) {
    button.disabled = true;
  }

  isMining = true;

  try {
    const data = await callFunction(
      "mine-xcoin",
      {
        initData: getInitData()
      }
    );

    if (data?.user) {
      currentUser = data.user;
    }

    if (data?.tier) {
      currentTier = data.tier;
    }

    renderUser();

    toast(
      data?.message ||
      "Mining completed.",
      "success"
    );

    startMiningTimer();

  } catch (error) {
    console.error(
      "Mining error:",
      error
    );

    toast(
      error.message ||
      "Mining could not be completed.",
      "error"
    );

  } finally {
    isMining = false;

    if (button) {
      button.disabled = false;
    }
  }
}


/* =========================
   MINING TIMER
   ========================= */

function getNextMineTimestamp() {
  if (!currentUser) return null;

  const values = [
    currentUser.next_mine_at,
    currentUser.mine_next_at,
    currentUser.next_mining_at
  ];

  for (const value of values) {
    if (value) {
      const time = new Date(value).getTime();

      if (!Number.isNaN(time)) {
        return time;
      }
    }
  }

  return null;
}

function startMiningTimer() {
  clearInterval(mineTimerInterval);

  updateMiningTimer();

  mineTimerInterval = setInterval(
    updateMiningTimer,
    1000
  );
}

function updateMiningTimer() {
  const timer = $("mineTimer");
  const button = $("mineBtn");

  if (!timer) return;

  const next = getNextMineTimestamp();

  if (!next) {
    timer.textContent = "Ready";
    if (button) button.disabled = false;
    return;
  }

  const remaining =
    Math.max(0, next - Date.now());

  if (remaining <= 0) {
    timer.textContent = "Ready";

    if (button) {
      button.disabled = false;
    }

    return;
  }

  if (button) {
    button.disabled = true;
  }

  const totalSeconds =
    Math.floor(remaining / 1000);

  const hours =
    Math.floor(totalSeconds / 3600);

  const minutes =
    Math.floor(
      (totalSeconds % 3600) / 60
    );

  const seconds =
    totalSeconds % 60;

  timer.textContent =
    `${String(hours).padStart(2, "0")}:` +
    `${String(minutes).padStart(2, "0")}:` +
    `${String(seconds).padStart(2, "0")}`;
}


/* =========================
   MONETAG EVENT ID
   ========================= */

function createYmid() {
  const telegramId =
    getTelegramUser()?.id ||
    currentUser?.telegram_id ||
    "user";

  let uniquePart = "";

  if (
    window.crypto &&
    typeof window.crypto.randomUUID === "function"
  ) {
    uniquePart = window.crypto.randomUUID();
  } else {
    uniquePart =
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;
  }

  return `watch_video_${telegramId}_${uniquePart}`;
}


/* =========================
   MONETAG SDK CHECK
   ========================= */

function getMonetagFunction() {
  const functionName =
    `show_${MONETAG_ZONE_ID}`;

  const adFunction =
    window[functionName];

  if (typeof adFunction !== "function") {
    return null;
  }

  return adFunction;
}


/* =========================
   WATCH VIDEO
   ========================= */

async function watchVideo() {
  if (!isAuthenticated) {
    toast(
      "Please wait for authentication.",
      "warning"
    );
    return;
  }

  if (isWatchingVideo) return;

  const showAd =
    getMonetagFunction();

  if (!showAd) {
    toast(
      "Video is temporarily unavailable. Please try again.",
      "warning"
    );

    console.error(
      `Monetag function show_${MONETAG_ZONE_ID} is unavailable.`
    );

    return;
  }

  const button = $("adsBtn");

  isWatchingVideo = true;

  if (button) {
    button.disabled = true;
    button.dataset.originalText =
      button.textContent;

    button.textContent =
      "LOADING...";
  }

  const ymid = createYmid();

  try {
    /*
      The reward is NOT credited here.

      Monetag sends the verified event to our
      Supabase postback. The backend then decides
      whether 1.04 XCOIN should be credited.
    */

    await showAd({
      ymid,
      requestVar: "watch_video"
    });

    toast(
      "Video completed. Your reward is being verified.",
      "success"
    );

    /*
      Give the postback time to reach Supabase,
      then refresh the account several times.
    */

    setTimeout(
      () => refreshUser(false),
      2500
    );

    setTimeout(
      () => refreshUser(false),
      6000
    );

    setTimeout(
      () => refreshUser(false),
      10000
    );

  } catch (error) {
    console.error(
      "Video ad error:",
      error
    );

    toast(
      "The video could not be completed. Please try again.",
      "error"
    );

  } finally {
    isWatchingVideo = false;

    if (button) {
      button.disabled = false;

      const original =
        button.dataset.originalText;

      button.textContent =
        original || "WATCH VIDEO";
    }
  }
}


/* =========================
   REWARDED POPUP / TASK
   ========================= */

async function openRewardedTask() {
  if (!isAuthenticated) {
    toast(
      "Please wait for authentication.",
      "warning"
    );
    return;
  }

  const showAd =
    getMonetagFunction();

  if (!showAd) {
    toast(
      "Task is temporarily unavailable.",
      "warning"
    );
    return;
  }

  const ymid =
    createYmid()
      .replace("watch_video_", "task_");

  try {
    /*
      Rewarded Popup is opened only from
      a direct user action.

      Its Promise is not treated as proof
      of a completed reward. Monetag postback
      remains responsible for verified reward
      processing.
    */

    await showAd({
      type: "pop",
      ymid,
      requestVar: "task"
    });

    toast(
      "Task opened.",
      "success"
    );

  } catch (error) {
    console.error(
      "Task error:",
      error
    );

    toast(
      "Task could not be opened.",
      "error"
    );
  }
}


/* =========================
   IN-APP INTERSTITIAL
   ========================= */

function startInAppAds() {
  const showAd =
    getMonetagFunction();

  if (!showAd) return;

  /*
    In-App Interstitial is NOT rewarded.
    It must never directly add XCOIN.
  */

  try {
    showAd({
      type: "inApp",
      inAppSettings: {
        frequency: 2,
        capping: 0.1,
        interval: 30,
        timeout: 5,
        everyPage: false
      }
    }).catch((error) => {
      console.log(
        "In-app ad unavailable:",
        error
      );
    });

  } catch (error) {
    console.log(
      "In-app ad error:",
      error
    );
  }
}


/* =========================
   DAILY CHECK-IN
   ========================= */

function openDailyCheckin() {
  /*
    This link is a normal external monetization link.

    It does NOT automatically credit XCOIN.
  */

  if (tg && typeof tg.openLink === "function") {
    tg.openLink(DAILY_CHECKIN_LINK);
  } else {
    window.open(
      DAILY_CHECKIN_LINK,
      "_blank",
      "noopener,noreferrer"
    );
  }
}


/* =========================
   MODAL SYSTEM
   ========================= */

function closeModal() {
  const modal = $("modal");

  if (modal) {
    modal.classList.remove("show");
    modal.style.display = "none";
  }
}

function openModal(title, content) {
  const modal = $("modal");
  const modalContent = $("modalContent");

  if (!modal || !modalContent) {
    return;
  }

  modalContent.innerHTML = `
    <div class="modal-header">
      <h2>${escapeHtml(title)}</h2>
      <button
        type="button"
        class="modal-close"
        id="modalCloseBtn"
        aria-label="Close"
      >
        Close
      </button>
    </div>

    <div class="modal-body">
      ${content}
    </div>
  `;

  modal.style.display = "flex";

  requestAnimationFrame(() => {
    modal.classList.add("show");
  });

  const closeButton =
    $("modalCloseBtn");

  if (closeButton) {
    closeButton.addEventListener(
      "click",
      closeModal
    );
  }
}


/* =========================
   BALANCE MODAL
   ========================= */

function showBalance() {
  const balance =
    Number(currentUser?.balance_xcoin || 0);

  const total =
    Number(currentUser?.total_earned_xcoin || 0);

  openModal(
    "Balance",
    `
      <div class="detail-row">
        <span>Available Balance</span>
        <strong>${formatXcoin(balance)} XCOIN</strong>
      </div>

      <div class="detail-row">
        <span>USDT Value</span>
        <strong>${formatUsd(xcoinToUsd(balance))}</strong>
      </div>

      <div class="detail-row">
        <span>Total Earned</span>
        <strong>${formatXcoin(total)} XCOIN</strong>
      </div>

      <div class="modal-note">
        Conversion rate: 1,300 XCOIN = $1 USDT.
      </div>
    `
  );
}


/* =========================
   PROFILE MODAL
   ========================= */

function showProfile() {
  const user =
    getTelegramUser();

  const name =
    currentUser?.full_name ||
    currentUser?.name ||
    user?.first_name ||
    "X Earn User";

  const username =
    currentUser?.username ||
    user?.username ||
    "Not available";

  const id =
    currentUser?.telegram_id ||
    user?.id ||
    "Not available";

  openModal(
    "Profile",
    `
      <div class="profile-detail">
        <strong>${escapeHtml(name)}</strong>
        <span>@${escapeHtml(username)}</span>
      </div>

      <div class="detail-row">
        <span>Telegram ID</span>
        <strong>${escapeHtml(id)}</strong>
      </div>

      <div class="detail-row">
        <span>Tier</span>
        <strong>
          ${escapeHtml(
            currentTier?.name ||
            currentTier?.tier_name ||
            currentUser?.tier ||
            "FREE"
          )}
        </strong>
      </div>
    `
  );
}


/* =========================
   REFERRAL MODAL
   ========================= */

function showReferral() {
  const id =
    currentUser?.telegram_id ||
    getTelegramUser()?.id;

  if (!id) {
    toast(
      "Referral information is unavailable.",
      "warning"
    );
    return;
  }

  const botUsername =
    "XEarnmining_bot";

  const referralLink =
    `https://t.me/${botUsername}?start=ref_${id}`;

  openModal(
    "Referrals",
    `
      <div class="modal-note">
        Invite users with your referral link.
      </div>

      <div class="copy-box">
        <input
          id="referralLinkInput"
          type="text"
          readonly
          value="${escapeHtml(referralLink)}"
        >

        <button
          type="button"
          id="copyReferralBtn"
        >
          Copy
        </button>
      </div>
    `
  );

  const copyButton =
    $("copyReferralBtn");

  if (copyButton) {
    copyButton.addEventListener(
      "click",
      async () => {
        try {
          await navigator.clipboard.writeText(
            referralLink
          );

          toast(
            "Referral link copied.",
            "success"
          );

        } catch (_) {
          const input =
            $("referralLinkInput");

          if (input) {
            input.select();
            document.execCommand("copy");
          }

          toast(
            "Referral link copied.",
            "success"
          );
        }
      }
    );
  }
}


/* =========================
   WITHDRAW MODAL
   ======================*/
   function showWithdraw() {
  const balance =
    Number(currentUser?.balance_xcoin || 0);

  openModal(
    "Withdraw",
    `
      <div class="modal-note">
        Minimum withdrawal: $10 USDT.
        A 1,300 XCOIN withdrawal fee applies.
      </div>

      <div class="detail-row">
        <span>Available</span>
        <strong>${formatXcoin(balance)} XCOIN</strong>
      </div>

      <div class="modal-note">
        Withdrawal processing will be connected
        to the secure withdrawal system.
      </div>
    `
  );
}


/* =========================
   UPGRADE MODAL
   ========================= */

function showUpgrade() {
  const tiers = [
    {
      name: "BRONZE",
      price: "$5",
      mines: "3 mines / 6h",
      reward: "30 XCOIN / mine",
      ads: "20 ads / day"
    },
    {
      name: "SILVER",
      price: "$15",
      mines: "6 mines / 6h",
      reward: "60 XCOIN / mine",
      ads: "30 ads / day"
    },
    {
      name: "GOLD",
      price: "$30",
      mines: "12 mines / 6h",
      reward: "120 XCOIN / mine",
      ads: "50 ads / day"
    }
  ];

  const html =
    tiers.map((tier) => `
      <div class="tier-option">
        <div>
          <strong>${tier.name}</strong>
          <span>${tier.price}</span>
        </div>

        <p>${tier.mines}</p>
        <p>${tier.reward}</p>
        <p>${tier.ads}</p>

        <button
          type="button"
          class="upgrade-tier-btn"
          data-tier="${tier.name}"
        >
          Select ${tier.name}
        </button>
      </div>
    `).join("");

  openModal(
    "Upgrade Your Tier",
    html
  );

  document
    .querySelectorAll(".upgrade-tier-btn")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          toast(
            "Tier upgrades will be enabled through the secure upgrade system.",
            "warning"
          );
        }
      );
    });
}


/* =========================
   TASK CENTER
   ========================= */

function showTasks() {
  openModal(
    "Task Center",
    `
      <div class="task-item">
        <div>
          <strong>Watch Video</strong>
          <p>Watch a rewarded video and earn 1.04 XCOIN when the event is verified.</p>
        </div>

        <button
          type="button"
          id="taskWatchVideoBtn"
        >
          WATCH
        </button>
      </div>

      <div class="task-item">
        <div>
          <strong>Rewarded Task</strong>
          <p>Open a rewarded task and complete the available interaction.</p>
        </div>

        <button
          type="button"
          id="rewardedTaskBtn"
        >
          OPEN
        </button>
      </div>
    `
  );

  const watchButton =
    $("taskWatchVideoBtn");

  if (watchButton) {
    watchButton.addEventListener(
      "click",
      () => {
        closeModal();
        watchVideo();
      }
    );
  }

  const taskButton =
    $("rewardedTaskBtn");

  if (taskButton) {
    taskButton.addEventListener(
      "click",
      openRewardedTask
    );
  }
}


/* =========================
   LEADERBOARD
   ========================= */

function showLeaderboard() {
  openModal(
    "Leaderboard",
    `
      <div class="modal-note">
        Leaderboard data will be displayed here
        once the leaderboard endpoint is connected.
      </div>
    `
  );
}


/* =========================
   EVENT BINDING
   ========================= */

function bindClick(id, handler) {
  const el = $(id);

  if (!el) return;

  el.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      handler(event);
    }
  );
}


/* =========================
   INITIALIZE BUTTONS
   ========================= */

function bindButtons() {

  /* Main actions */

  bindClick(
    "mineBtn",
    mineXcoin
  );

  bindClick(
    "adsBtn",
    watchVideo
  );

  bindClick(
    "watchVideoBtn",
    watchVideo
  );

  bindClick(
    "refreshBtn",
    () => refreshUser(true)
  );

  bindClick(
    "upgradeBtn",
    showUpgrade
  );

  bindClick(
    "smartLinkBtn",
    openDailyCheckin
  );

  /* Navigation */

  bindClick(
    "balanceBtn",
    showBalance
  );

  bindClick(
    "withdrawBtn",
    showWithdraw
  );

  bindClick(
    "referralBtn",
    showReferral
  );

  bindClick(
    "leaderboardBtn",
    showLeaderboard
  );

  bindClick(
    "taskBtn",
    showTasks
  );

  bindClick(
    "profileBtn",
    showProfile
  );

  bindClick(
    "walletBtn",
    showBalance
  );

  /* Generic modal close */

  const modal =
    $("modal");

  if (modal) {
    modal.addEventListener(
      "click",
      (event) => {
        if (
          event.target === modal
        ) {
          closeModal();
        }
      }
    );
  }

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") {
        closeModal();
      }
    }
  );
}


/* =========================
   PAGE VISIBILITY
   ========================= */

document.addEventListener(
  "visibilitychange",
  () => {
    if (
      document.visibilityState ===
      "visible"
    ) {
      refreshUser(false);
    }
  }
);


/* =========================
   APP START
   ========================= */

async function startApp() {

  bindButtons();

  const authenticated =
    await authenticate();

  if (!authenticated) {
    return;
  }

  /*
    Start normal non-rewarded
    in-app advertising after the
    application has initialized.
  */

  setTimeout(
    startInAppAds,
    6000
  );

  /*
    Periodic account refresh.
    The frontend never credits rewards;
    it only refreshes the server state.
  */

  clearInterval(refreshTimer);

  refreshTimer =
    setInterval(
      () => refreshUser(false),
      30000
    );
}


/* =========================
   START
   ========================= */

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    startApp
  );
} else {
  startApp();
}
