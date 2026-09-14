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
   UPGRADE STATE
===================================================== */
let selectedUpgradeTier = null;
let selectedPaymentAsset = "USDT";
let selectedPaymentNetwork = "TRC20";
let pendingUpgradeOrderId = null;
let pendingUpgradeTier = null;
let upgradeStatus = null;
let upgradeStatusPollTimer = null;
let upgradeApprovalNotified = false;
let upgradeModalCreated = false;


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
   UPGRADE SYSTEM
   PAYMENT -> PENDING -> ADMIN APPROVAL
===================================================== */

const XEARN_UPGRADE_TIERS = {
  BRONZE: { price: 5 },
  SILVER: { price: 15 },
  GOLD: { price: 30 }
};

const XEARN_PAYMENT_METHODS = {
  USDT: {
    BEP20: "0x5e0DA0068dcb929adfe27dEdB5FA8b5A86586995",
    ERC20: "0x5e0DA0068dcb929adfe27dEdB5FA8b5A86586995",
    TRC20: "TSvw8wApc97mYsq59eohym2Bv5jpxNAdTJ",
    TON: "UQB4IcjcNbzsQ-MRchgdspVZ4tPuFFM6CVRtfU709kelf2D",
    SOL: "CEPxJr7nhrne1Bnu1n2hXnZjYwawthy8xMEZxTc4Dztd"
  },
  USDC: {
    BEP20: "0x5e0DA0068dcb929adfe27dEdB5FA8b5A86586995",
    ERC20: "0x5e0DA0068dcb929adfe27dEdB5FA8b5A86586995"
  }
};

function savePendingUpgrade(orderId, tier) {
  pendingUpgradeOrderId = String(orderId || "");
  pendingUpgradeTier = String(tier || "").toUpperCase();
  upgradeStatus = "pending";

  try {
    localStorage.setItem(
      "xearn_pending_upgrade_order_id",
      pendingUpgradeOrderId
    );

    localStorage.setItem(
      "xearn_pending_upgrade_tier",
      pendingUpgradeTier
    );

    localStorage.setItem(
      "xearn_upgrade_status",
      "pending"
    );

  } catch (error) {

    console.error(
      "Unable to save upgrade state:",
      error
    );
  }
}

function loadPendingUpgrade() {

  try {

    pendingUpgradeOrderId =
      localStorage.getItem(
        "xearn_pending_upgrade_order_id"
      ) || null;

    pendingUpgradeTier =
      localStorage.getItem(
        "xearn_pending_upgrade_tier"
      ) || null;

    upgradeStatus =
      localStorage.getItem(
        "xearn_upgrade_status"
      ) || null;

  } catch (error) {

    console.error(
      "Unable to load upgrade state:",
      error
    );
  }

  if (!pendingUpgradeOrderId) {

    pendingUpgradeOrderId = null;
    pendingUpgradeTier = null;
    upgradeStatus = null;

  }
}

function clearPendingUpgrade() {

  pendingUpgradeOrderId = null;
  pendingUpgradeTier = null;
  upgradeStatus = null;
  upgradeApprovalNotified = false;

  try {

    localStorage.removeItem(
      "xearn_pending_upgrade_order_id"
    );

    localStorage.removeItem(
      "xearn_pending_upgrade_tier"
    );

    localStorage.removeItem(
      "xearn_upgrade_status"
    );

  } catch (error) {

    console.error(
      "Unable to clear upgrade state:",
      error
    );
  }
}

function getUpgradeStatusBox() {
  return $("xearnUpgradeStatus");
}

function updateUpgradeStatusUI(
  status,
  tier,
  note = ""
) {

  const box =
    getUpgradeStatusBox();

  const button =
    $("xearnSubmitUpgrade");

  const txidInput =
    $("xearnTxid");

  const normalizedStatus =
    String(status || "")
      .trim()
      .toLowerCase();

  const normalizedTier =
    String(
      tier ||
      pendingUpgradeTier ||
      selectedUpgradeTier ||
      ""
    ).toUpperCase();

  if (!box) {
    return;
  }

  box.style.display = "block";

  box.className =
    "xearn-upgrade-status xearn-status-" +
    (normalizedStatus || "pending");

  if (
    normalizedStatus ===
    "approved"
  ) {

    box.innerHTML =
      "<strong>Upgrade Approved</strong>" +
      "<span>Your " +
      normalizedTier +
      " upgrade has been approved and activated.</span>";

    if (button) {
      button.disabled = true;
      button.textContent =
        "Upgrade Approved";
    }

    if (txidInput) {
      txidInput.disabled = true;
    }

    return;
  }

  if (
    normalizedStatus ===
    "rejected"
  ) {

    box.innerHTML =
      "<strong>Upgrade Rejected</strong>" +
      "<span>" +
      (
        note ||
        "Your payment could not be approved. Please check your transaction details and submit again."
      ) +
      "</span>";

    if (button) {
      button.disabled = false;
      button.textContent =
        "I've Paid";
    }

    if (txidInput) {
      txidInput.disabled = false;
    }

    return;
  }

  if (
    normalizedStatus ===
    "cancelled"
  ) {

    box.innerHTML =
      "<strong>Upgrade Cancelled</strong>" +
      "<span>This upgrade request was cancelled.</span>";

    if (button) {
      button.disabled = false;
      button.textContent =
        "I've Paid";
    }

    if (txidInput) {
      txidInput.disabled = false;
    }

    return;
  }

  box.innerHTML =
    "<strong>Pending Approval</strong>" +
    "<span>Your " +
    normalizedTier +
    " upgrade is waiting for admin payment verification.</span>";

  if (button) {
    button.disabled = true;
    button.textContent =
      "Pending Approval";
  }

  if (txidInput) {
    txidInput.disabled = true;
  }
}

async function checkUpgradeStatus(
  showMessages = true
) {

  if (
    !telegramUser ||
    !pendingUpgradeOrderId
  ) {
    return null;
  }

  try {

    const result =
      await callFunction(
        "get-upgrade-status",
        {
          telegram_id:
            Number(
              telegramUser.id
            ),

          order_id:
            String(
              pendingUpgradeOrderId
            )
        },
        15000
      );

    if (!result?.success) {

      throw new Error(
        result?.message ||
        "Unable to check upgrade status."
      );
    }

    const status =
      String(
        result.status ||
        "pending"
      ).toLowerCase();

    const tier =
      String(
        result.requested_tier ||
        pendingUpgradeTier ||
        ""
      ).toUpperCase();

    upgradeStatus =
      status;

    pendingUpgradeTier =
      tier;

    try {

      localStorage.setItem(
        "xearn_upgrade_status",
        status
      );

      localStorage.setItem(
        "xearn_pending_upgrade_tier",
        tier
      );

    } catch (_) {}

    updateUpgradeStatusUI(
      status,
      tier,
      result.admin_note || ""
    );

    if (
      status ===
      "approved"
    ) {

      if (
        !upgradeApprovalNotified &&
        showMessages
      ) {

        upgradeApprovalNotified =
          true;

        showToast(
          "Upgrade Successful",
          "Your " +
          tier +
          " upgrade has been approved and activated."
        );
      }

      await refreshUser();

      clearPendingUpgrade();

      stopUpgradeStatusPolling();

      const box =
        getUpgradeStatusBox();

      if (box) {

        box.style.display =
          "block";

        box.className =
          "xearn-upgrade-status xearn-status-approved";

        box.innerHTML =
          "<strong>Upgrade Successful</strong>" +
          "<span>Your " +
          tier +
          " plan is now active.</span>";
      }

      const button =
        $("xearnSubmitUpgrade");

      if (button) {

        button.disabled =
          true;

        button.textContent =
          "Upgrade Approved";
      }

      const txidInput =
        $("xearnTxid");

      if (txidInput) {
        txidInput.disabled =
          true;
      }

      return result;
    }

    if (
      status ===
      "rejected"
    ) {

      if (showMessages) {

        showToast(
          "Upgrade Rejected",
          result.admin_note ||
          "Your upgrade payment was not approved."
        );
      }

      clearPendingUpgrade();

      stopUpgradeStatusPolling();

      updateUpgradeStatusUI(
        "rejected",
        tier,
        result.admin_note || ""
      );

      return result;
    }

    if (
      status ===
      "cancelled"
    ) {

      if (showMessages) {

        showToast(
          "Upgrade Cancelled",
          "Your upgrade request was cancelled."
        );
      }

      clearPendingUpgrade();

      stopUpgradeStatusPolling();

      updateUpgradeStatusUI(
        "cancelled",
        tier
      );

      return result;
    }

    return result;

  } catch (error) {

    console.error(
      "Upgrade status check failed:",
      error
    );

    /*
      Do not erase a pending order because
      of a temporary network/server error.
    */

    return null;
  }
}

function startUpgradeStatusPolling() {

  stopUpgradeStatusPolling();

  if (
    !telegramUser ||
    !pendingUpgradeOrderId
  ) {
    return;
  }

  checkUpgradeStatus(false);

  upgradeStatusPollTimer =
    setInterval(() => {

      if (
        !telegramUser ||
        !pendingUpgradeOrderId
      ) {

        stopUpgradeStatusPolling();

        return;
      }

      checkUpgradeStatus(true);

    }, 15000);
}

function stopUpgradeStatusPolling() {

  if (upgradeStatusPollTimer) {

    clearInterval(
      upgradeStatusPollTimer
    );

    upgradeStatusPollTimer =
      null;
  }
}

function getPaymentNetworks(
  asset
) {

  const methods =
    XEARN_PAYMENT_METHODS[
      asset
    ] || {};

  return Object.keys(
    methods
  );
}

function updateUpgradeWallet() {

  const assetSelect =
    $("xearnPaymentAsset");

  const networkSelect =
    $("xearnPaymentNetwork");

  const wallet =
    $("xearnWalletAddress");

  if (
    !assetSelect ||
    !networkSelect ||
    !wallet
  ) {
    return;
  }

  selectedPaymentAsset =
    String(
      assetSelect.value ||
      "USDT"
    ).toUpperCase();

  const networks =
    getPaymentNetworks(
      selectedPaymentAsset
    );

  const currentNetwork =
    String(
      networkSelect.value ||
      selectedPaymentNetwork ||
      ""
    ).toUpperCase();

  networkSelect.innerHTML =
    networks
      .map(
        network =>
          '<option value="' +
          network +
          '">' +
          network +
          "</option>"
      )
      .join("");

  if (
    networks.includes(
      currentNetwork
    )
  ) {

    networkSelect.value =
      currentNetwork;

  } else if (
    networks.length
  ) {

    networkSelect.value =
      networks[0];
  }

  selectedPaymentNetwork =
    String(
      networkSelect.value ||
      ""
    ).toUpperCase();

  wallet.textContent =
    XEARN_PAYMENT_METHODS[
      selectedPaymentAsset
    ]?.[
      selectedPaymentNetwork
    ] ||
    "Payment address unavailable";
}

async function copyUpgradeWallet() {

  const wallet =
    $("xearnWalletAddress")
      ?.textContent
      ?.trim();

  if (
    !wallet ||
    wallet ===
      "Payment address unavailable"
  ) {
    return;
  }

  try {

    await navigator.clipboard.writeText(
      wallet
    );

    showToast(
      "Wallet Copied",
      "Payment address copied."
    );

  } catch (_) {

    showToast(
      "Payment Address",
      wallet
    );
  }
}

function closeUpgradeModal() {

  const overlay =
    $("xearnUpgradeModal");

  if (overlay) {

    overlay.classList.remove(
      "show"
    );
  }

  if (pendingUpgradeOrderId) {

    updateUpgradeStatusUI(
      upgradeStatus ||
        "pending",

      pendingUpgradeTier ||
        selectedUpgradeTier
    );
  }
}

function openUpgradeModal(
  tier = null
) {

  createUpgradeModal();

  loadPendingUpgrade();

  if (pendingUpgradeOrderId) {

    selectedUpgradeTier =
      pendingUpgradeTier ||
      tier ||
      "";

    const overlay =
      $("xearnUpgradeModal");

    const title =
      $("xearnUpgradeTitle");

    const price =
      $("xearnUpgradePrice");

    if (title) {

      title.textContent =
        "Upgrade to " +
        String(
          selectedUpgradeTier
        ).toUpperCase();
    }

    if (price) {

      price.textContent =
        "$" +
        (
          XEARN_UPGRADE_TIERS[
            selectedUpgradeTier
          ]?.price ||
          ""
        );
    }

    updateUpgradeStatusUI(
      upgradeStatus ||
        "pending",

      selectedUpgradeTier
    );

    if (overlay) {

      overlay.classList.add(
        "show"
      );
    }

    startUpgradeStatusPolling();

    return;
  }

  selectedUpgradeTier =
    String(
      tier ||
      selectedUpgradeTier ||
      "BRONZE"
    ).toUpperCase();

  if (
    !XEARN_UPGRADE_TIERS[
      selectedUpgradeTier
    ]
  ) {

    selectedUpgradeTier =
      "BRONZE";
  }

  const overlay =
    $("xearnUpgradeModal");

  const title =
    $("xearnUpgradeTitle");

  const price =
    $("xearnUpgradePrice");

  const txidInput =
    $("xearnTxid");

  const button =
    $("xearnSubmitUpgrade");

  const statusBox =
    $("xearnUpgradeStatus");

  if (title) {

    title.textContent =
      "Upgrade to " +
      selectedUpgradeTier;
  }

  if (price) {

    price.textContent =
      "$" +
      XEARN_UPGRADE_TIERS[
        selectedUpgradeTier
      ].price;
  }

  if (txidInput) {

    txidInput.value =
      "";

    txidInput.disabled =
      false;
  }

  if (button) {

    button.disabled =
      false;

    button.textContent =
      "I've Paid";
  }

  if (statusBox) {

    statusBox.style.display =
      "none";

    statusBox.innerHTML =
      "";
  }

  selectedPaymentAsset =
    "USDT";

  selectedPaymentNetwork =
    "TRC20";

  const assetSelect =
    $("xearnPaymentAsset");

  if (assetSelect) {

    assetSelect.value =
      "USDT";
  }

  updateUpgradeWallet();

  if (overlay) {

    overlay.classList.add(
      "show"
    );
  }
}

function openUpgradeScreen(
  tier = null
) {

  showScreen(
    "upgrade"
  );

  if (tier) {

    selectedUpgradeTier =
      String(
        tier
      ).toUpperCase();
  }

  openUpgradeModal(
    selectedUpgradeTier ||
    null
  );
}

function createUpgradeModal() {

  if (
    upgradeModalCreated ||
    $("xearnUpgradeModal")
  ) {

    upgradeModalCreated =
      true;

    return;
  }

  const style =
    document.createElement(
      "style"
    );

  style.textContent = `
    #xearnUpgradeModal {
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: none;
      align-items: flex-end;
      justify-content: center;
      background: rgba(0,0,0,.72);
      padding: 14px;
    }

    #xearnUpgradeModal.show {
      display: flex;
    }

    .xearn-upgrade-modal-card {
      width: min(100%, 460px);
      max-height: 92vh;
      overflow-y: auto;
      background: #07130f;
      color: #fff;
      border: 1px solid rgba(88,255,145,.18);
      border-radius: 22px;
      box-shadow: 0 24px 80px rgba(0,0,0,.55);
      padding: 20px;
    }

    .xearn-upgrade-modal-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 15px;
      margin-bottom: 18px;
    }

    .xearn-upgrade-modal-head h3 {
      margin: 0;
      font-size: 20px;
    }

    .xearn-upgrade-close {
      width: 36px;
      height: 36px;
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 10px;
      background: rgba(255,255,255,.05);
      color: #fff;
      font-size: 20px;
      cursor: pointer;
    }

    .xearn-upgrade-price {
      color: #58ff91;
      font-size: 26px;
      font-weight: 900;
      margin-top: 3px;
    }

    .xearn-upgrade-label {
      display: block;
      margin: 15px 0 7px;
      color: #a9b5af;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .5px;
    }

    .xearn-upgrade-select,
    .xearn-upgrade-input {
      width: 100%;
      min-height: 48px;
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 12px;
      background: #0c1d16;
      color: #fff;
      padding: 0 13px;
      outline: none;
      font: inherit;
    }

    .xearn-upgrade-select:focus,
    .xearn-upgrade-input:focus {
      border-color: #58ff91;
    }

    .xearn-wallet-box {
      margin-top: 12px;
      padding: 13px;
      border-radius: 12px;
      background: #0c1d16;
      border: 1px solid rgba(88,255,145,.12);
    }

    .xearn-wallet-address {
      word-break: break-all;
      color: #dfffea;
      font-size: 12px;
      line-height: 1.55;
      margin-bottom: 10px;
    }

    .xearn-copy-wallet {
      width: 100%;
      min-height: 42px;
      border: 0;
      border-radius: 10px;
      background: #58ff91;
      color: #06100c;
      font-weight: 900;
      cursor: pointer;
    }

    .xearn-submit-upgrade {
      width: 100%;
      min-height: 52px;
      margin-top: 15px;
      border: 0;
      border-radius: 13px;
      background: #58ff91;
      color: #06100c;
      font-weight: 900;
      cursor: pointer;
      font-size: 15px;
    }

    .xearn-submit-upgrade:disabled {
      opacity: .55;
      cursor: not-allowed;
    }

    .xearn-upgrade-note {
      color: #87968f;
      font-size: 11px;
      line-height: 1.55;
      margin-top: 12px;
    }

    .xearn-upgrade-status {
      display: none;
      margin-top: 14px;
      padding: 13px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,.1);
      background: rgba(255,255,255,.04);
    }

    .xearn-upgrade-status strong,
    .xearn-upgrade-status span {
      display: block;
    }

    .xearn-upgrade-status strong {
      font-size: 13px;
      margin-bottom: 4px;
    }

    .xearn-upgrade-status span {
      color: #aebbb5;
      font-size: 11px;
      line-height: 1.5;
    }

    .xearn-status-pending {
      border-color: rgba(255,204,92,.25);
    }

    .xearn-status-pending strong {
      color: #ffcc5c;
    }

    .xearn-status-approved {
      border-color: rgba(88,255,145,.28);
    }

    .xearn-status-approved strong {
      color: #58ff91;
    }

    .xearn-status-rejected,
    .xearn-status-cancelled {
      border-color: rgba(255,100,100,.25);
    }

    .xearn-status-rejected strong,
    .xearn-status-cancelled strong {
      color: #ff7f7f;
    }

    @media (min-width: 700px) {
      #xearnUpgradeModal {
        align-items: center;
      }
    }
  `;

  document.head.appendChild(
    style
  );

  const overlay =
    document.createElement(
      "div"
    );

  overlay.id =
    "xearnUpgradeModal";

  overlay.innerHTML = `
    <div class="xearn-upgrade-modal-card" role="dialog" aria-modal="true">
      <div class="xearn-upgrade-modal-head">
        <div>
          <h3 id="xearnUpgradeTitle">Upgrade to BRONZE</h3>
          <div class="xearn-upgrade-price" id="xearnUpgradePrice">$5</div>
        </div>

        <button
          type="button"
          class="xearn-upgrade-close"
          id="xearnUpgradeClose"
        >×</button>
      </div>

      <label
        class="xearn-upgrade-label"
        for="xearnPaymentAsset"
      >
        Payment Asset
      </label>

      <select
        class="xearn-upgrade-select"
        id="xearnPaymentAsset"
      >
        <option value="USDT">
          USDT
        </option>

        <option value="USDC">
          USDC
        </option>
      </select>

      <label
        class="xearn-upgrade-label"
        for="xearnPaymentNetwork"
      >
        Network
      </label>

      <select
        class="xearn-upgrade-select"
        id="xearnPaymentNetwork"
      ></select>

      <div class="xearn-wallet-box">

        <div
          class="xearn-upgrade-label"
          style="margin-top:0"
        >
          Payment Address
        </div>

        <div
          class="xearn-wallet-address"
          id="xearnWalletAddress"
        >
          Loading...
        </div>

        <button
          type="button"
          class="xearn-copy-wallet"
          id="xearnCopyWallet"
        >
          COPY ADDRESS
        </button>

      </div>

      <label
        class="xearn-upgrade-label"
        for="xearnTxid"
      >
        Transaction ID / TXID
      </label>

      <input
        class="xearn-upgrade-input"
        id="xearnTxid"
        type="text"
        autocomplete="off"
        placeholder="Enter your transaction ID"
      >

      <div
        id="xearnUpgradeStatus"
        class="xearn-upgrade-status"
      ></div>

      <button
        type="button"
        class="xearn-submit-upgrade"
        id="xearnSubmitUpgrade"
      >
        I've Paid
      </button>

      <div class="xearn-upgrade-note">
        Send the exact upgrade amount to the selected address and network. Enter the transaction ID after payment. Your upgrade remains pending until an admin verifies the payment.
      </div>

    </div>
  `;

  document.body.appendChild(
    overlay
  );

  $("xearnUpgradeClose")
    ?.addEventListener(
      "click",
      closeUpgradeModal
    );

  overlay.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        overlay
      ) {

        closeUpgradeModal();

      }

    }
  );

  $("xearnPaymentAsset")
    ?.addEventListener(
      "change",
      () => {

        selectedPaymentAsset =
          String(
            $("xearnPaymentAsset")
              .value ||
            "USDT"
          ).toUpperCase();

        updateUpgradeWallet();

      }
    );

  $("xearnPaymentNetwork")
    ?.addEventListener(
      "change",
      () => {

        selectedPaymentNetwork =
          String(
            $("xearnPaymentNetwork")
              .value ||
            ""
          ).toUpperCase();

        updateUpgradeWallet();

      }
    );

  $("xearnCopyWallet")
    ?.addEventListener(
      "click",
      copyUpgradeWallet
    );

  $("xearnSubmitUpgrade")
    ?.addEventListener(
      "click",
      submitUpgradeOrder
    );

  upgradeModalCreated =
    true;

  updateUpgradeWallet();
}

async function submitUpgradeOrder() {

  const button =
    $("xearnSubmitUpgrade");

  const txidInput =
    $("xearnTxid");

  const assetSelect =
    $("xearnPaymentAsset");

  const networkSelect =
    $("xearnPaymentNetwork");

  if (!telegramUser?.id) {

    showToast(
      "Telegram Required",
      "Open XEARN inside Telegram."
    );

    return;
  }

  if (pendingUpgradeOrderId) {

    showToast(
      "Pending Upgrade",
      "You already have an upgrade waiting for approval."
    );

    updateUpgradeStatusUI(
      upgradeStatus ||
        "pending",
      pendingUpgradeTier
    );

    startUpgradeStatusPolling();

    return;
  }

  const tier =
    String(
      selectedUpgradeTier ||
      ""
    ).toUpperCase();

  const txid =
    String(
      txidInput?.value ||
      ""
    ).trim();

  const payment_asset =
    String(
      assetSelect?.value ||
      selectedPaymentAsset ||
      ""
    )
      .trim()
      .toUpperCase();

  const payment_network =
    String(
      networkSelect?.value ||
      selectedPaymentNetwork ||
      ""
    )
      .trim()
      .toUpperCase();

  if (
    !XEARN_UPGRADE_TIERS[
      tier
    ]
  ) {

    showToast(
      "Select Upgrade",
      "Please select a valid upgrade tier."
    );

    return;
  }

  if (
    !payment_asset ||
    !payment_network
  ) {

    showToast(
      "Payment Details",
      "Please select a payment asset and network."
    );

    return;
  }

  if (
    txid.length <
    8
  ) {

    showToast(
      "Transaction ID Required",
      "Please enter a valid transaction ID."
    );

    txidInput?.focus();

    return;
  }

  selectedPaymentAsset =
    payment_asset;

  selectedPaymentNetwork =
    payment_network;

  if (button) {

    button.disabled =
      true;

    button.textContent =
      "Submitting...";
  }

  try {

    const result =
      await callFunction(
        "create-upgrade-order",
        {
          telegram_id:
            Number(
              telegramUser.id
            ),

          requested_tier:
            tier,

          payment_asset:
            payment_asset,

          payment_network:
            payment_network,

          txid:
            txid
        },
        20000
      );

    if (!result?.success) {

      throw new Error(
        result?.message ||
        "Unable to submit upgrade."
      );
    }

    const orderId =
      result?.order_id ||
      result?.orderId ||
      result?.id ||
      result?.result?.order_id ||
      result?.result?.orderId ||
      result?.result?.id;

    if (!orderId) {

      throw new Error(
        "The upgrade was submitted but no order ID was returned."
      );
    }

    savePendingUpgrade(
      orderId,
      tier
    );

    upgradeApprovalNotified =
      false;

    if (txidInput) {

      txidInput.value =
        "";

      txidInput.disabled =
        true;
    }

    updateUpgradeStatusUI(
      "pending",
      tier
    );

    showToast(
      "Upgrade Submitted",
      "Thank you. Your payment is pending admin verification."
    );

    startUpgradeStatusPolling();

    setTimeout(
      () => {
        closeUpgradeModal();
      },
      3500
    );

  } catch (error) {

    console.error(
      "Upgrade submission error:",
      error
    );

    if (button) {

      button.disabled =
        false;

      button.textContent =
        "I've Paid";
    }

    if (txidInput) {
      txidInput.disabled =
        false;
    }

    showToast(
      "Upgrade Failed",
      error?.message ||
      "Unable to submit your upgrade. Please try again."
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
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            showScreen(
              button.dataset.target
            );

            if (
              button.dataset.target ===
              "upgrade"
            ) {

              openUpgradeScreen();

            }

          }
        );

      }
    );


  /* Home Earn */

  $("earnButton")
    ?.addEventListener(
      "click",
      () =>
        showScreen(
          "earn"
        )
    );


  /* Upgrade navigation */

  document
    .querySelectorAll(
      '[data-target="upgrade"], #upgradeButton'
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          event => {

            event.preventDefault();

            openUpgradeScreen();

          }
        );

      }
    );


  /* Upgrade tier cards */

  document
    .querySelectorAll(
      ".plan-card[data-plan]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const tier =
              String(
                button.dataset.plan ||
                ""
              ).toUpperCase();

            openUpgradeScreen(
              tier
            );

          }
        );

      }
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
  */

  hideLoading();

  showScreen(
    "home"
  );

  try {

    const ready =
      initializeTelegram();

    if (!ready) {
      return;
    }

    createUpgradeModal();

    loadPendingUpgrade();

    setupButtons();

    /*
      Authenticate in the background.
    */

    await authenticateUser();

    /*
      If a user submitted an upgrade before closing
      the Mini App, continue checking it automatically.
    */

    if (
      pendingUpgradeOrderId
    ) {

      updateUpgradeStatusUI(
        upgradeStatus ||
          "pending",
        pendingUpgradeTier
      );

      startUpgradeStatusPolling();

    }

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


/* =====================================================
   REFRESH EVERY 30 SECONDS
===================================================== */

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
