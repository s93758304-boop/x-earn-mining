const SUPABASE_FUNCTION_BASE =
  "https://ynrqdbdgjzmucqcfsyvi.supabase.co/functions/v1";

const SMARTLINK =
  "https://www.profitableratecpmnetwork.com/skzazzs529?key=b1a6eab3a3ea4f3a76a00dc123bde88f";

const ADSGRAM_REWARD_BLOCK_ID = "46210";

const ADSGRAM_TASK_BLOCK_ID = "task-46211";

const RATE = 1300;

const tg = window.Telegram?.WebApp;

let initData = "";

let currentUser = null;


/* =========================
   TIER RULES
========================= */

const tierRules = {

  FREE: {
    maxMines: 1,
    reward: 10,
    maxAds: 10,
    minWithdraw: 10,
    maxWithdraw: 10
  },

  BRONZE: {
    maxMines: 3,
    reward: 30,
    maxAds: 20,
    minWithdraw: 10,
    maxWithdraw: 50
  },

  SILVER: {
    maxMines: 6,
    reward: 60,
    maxAds: 30,
    minWithdraw: 10,
    maxWithdraw: 200
  },

  GOLD: {
    maxMines: 12,
    reward: 120,
    maxAds: 50,
    minWithdraw: 10,
    maxWithdraw: null
  }

};


/* =========================
   ELEMENT HELPER
========================= */

function $(id) {

  return document.getElementById(id);

}


/* =========================
   TOAST
========================= */

function toast(message) {

  const element = $("toast");

  if (!element) return;

  element.textContent = message;

  element.classList.add("show");

  clearTimeout(window.__toastTimer);

  window.__toastTimer = setTimeout(() => {

    element.classList.remove("show");

  }, 2800);

}


/* =========================
   TELEGRAM
========================= */

function telegramReady() {

  try {

    if (tg) {

      tg.ready();

      tg.expand();

      if (tg.setHeaderColor) {

        tg.setHeaderColor("#070910");

      }

      if (tg.setBackgroundColor) {

        tg.setBackgroundColor("#070910");

      }

    }

    initData = tg?.initData || "";

    return Boolean(initData);

  } catch (error) {

    console.error(error);

    return false;

  }

}


/* =========================
   SUPABASE FUNCTION
========================= */

async function callFunction(functionName, body) {

  const response = await fetch(
    `${SUPABASE_FUNCTION_BASE}/${functionName}`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify(body)
    }
  );


  const data =
    await response.json().catch(() => ({}));


  if (!response.ok) {

    throw new Error(
      data.error ||
      data.message ||
      `Request failed (${response.status})`
    );

  }


  return data;

}


/* =========================
   TELEGRAM AUTH
========================= */

async function authenticate() {

  $("authStatus").textContent =
    "Authenticating...";


  if (!telegramReady()) {

    $("authStatus").textContent =
      "Open this app inside Telegram";

    toast(
      "Open X Earn Mining from Telegram."
    );

    return;

  }


  try {

    const data =
      await callFunction(
        "telegram-auth",
        {
          initData: initData
        }
      );


    currentUser =
      data.user ||
      data;


    renderUser();


    $("authStatus").textContent =
      "Telegram connected";


  } catch (error) {

    console.error(error);


    $("authStatus").textContent =
      "Authentication failed";


    toast(error.message);

  }

}


/* =========================
   RENDER USER
========================= */

function renderUser() {

  if (!currentUser) return;


  const firstName =
    currentUser.first_name || "";


  const lastName =
    currentUser.last_name || "";


  const username =
    currentUser.username
      ? "@" + currentUser.username
      : [firstName, lastName]
          .filter(Boolean)
          .join(" ") ||
        "Telegram User";


  $("profileName").textContent =
    username;


  $("profileId").textContent =
    `Telegram ID ${currentUser.telegram_id ?? "—"}`;


  $("avatar").textContent =
    (firstName || "X")
      .charAt(0)
      .toUpperCase();


  const tier =
    (currentUser.tier || "FREE")
      .toUpperCase();


  $("tierPill").textContent =
    tier;


  const balance =
    Number(
      currentUser.balance_xcoin || 0
    );


  $("balance").textContent =
    balance.toLocaleString(
      undefined,
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    );


  $("usdBalance").textContent =
    `≈ $${(
      balance / RATE
    ).toFixed(2)} USDT`;


  $("totalEarned").textContent =
    Number(
      currentUser.total_earned_xcoin || 0
    ).toLocaleString();


  $("refEarned").textContent =
    `${Number(
      currentUser.referral_earnings_xcoin || 0
    ).toLocaleString()} XCOIN`;


  const rules =
    tierRules[tier] ||
    tierRules.FREE;


  const mines =
    Number(
      currentUser.mines_in_cycle || 0
    );


  const ads =
    Number(
      currentUser.ads_watched_today || 0
    );


  $("mineStat").textContent =
    `${mines} / ${rules.maxMines}`;


  $("adsStat").textContent =
    `${ads} / ${rules.maxAds}`;


  $("adProgress").textContent =
    `${ads} / ${rules.maxAds}`;


  $("adProgressBar").style.width =
    `${Math.min(
      100,
      (ads / rules.maxAds) * 100
    )}%`;


  $("mineSub").textContent =
    `Earn ${rules.reward} XCOIN per mine`;


  startMineTimer();

}


/* =========================
   MINING TIMER
========================= */

function startMineTimer() {

  if (!currentUser) return;


  const lastMine =
    currentUser.last_mine_time
      ? new Date(
          currentUser.last_mine_time
        ).getTime()
      : 0;


  const tier =
    (currentUser.tier || "FREE")
      .toUpperCase();


  const rules =
    tierRules[tier] ||
    tierRules.FREE;


  const mines =
    Number(
      currentUser.mines_in_cycle || 0
    );


  if (
    mines >= rules.maxMines
  ) {

    $("mineTimer").textContent =
      "Cycle limit reached";

    return;

  }


  if (!lastMine) {

    $("mineTimer").textContent =
      "Ready";

    return;

  }


  const cycleTime =
    6 * 60 * 60 * 1000;


  const remaining =
    Math.max(
      0,
      lastMine +
        cycleTime -
        Date.now()
    );


  if (remaining <= 0) {

    $("mineTimer").textContent =
      "Ready";

    return;

  }


  const hours =
    Math.floor(
      remaining / 3600000
    );


  const minutes =
    Math.floor(
      (remaining % 3600000) /
      60000
    );


  $("mineTimer").textContent =
    `Next in ${String(hours).padStart(
      2,
      "0"
    )}h ${String(minutes).padStart(
      2,
      "0"
    )}m`;

}


/* =========================
   MINE XCOIN
========================= */

async function mine() {

  if (!initData) {

    toast(
      "Telegram authentication is required."
    );

    return;

  }


  $("mineBtn").disabled = true;


  try {

    const data =
      await callFunction(
        "mine-xcoin",
        {
          initData: initData
        }
      );


    currentUser =
      data.user ||
      data;


    renderUser();


    const tier =
      (
        currentUser.tier ||
        "FREE"
      ).toUpperCase();


    const reward =
      data.reward ??
      tierRules[tier].reward;


    toast(
      `Mining successful: ${reward} XCOIN added.`
    );


  } catch (error) {

    console.error(error);

    toast(error.message);

    $("mineBtn").disabled = false;

  }

}


/* =========================
   WATCH ADS
========================= */

async function watchAd() {

  if (!initData) {

    toast(
      "Telegram authentication is required."
    );

    return;

  }


  if (!window.Adsgram) {

    toast(
      "Ads service is still loading."
    );

    return;

  }


  $("adsBtn").disabled = true;


  try {

    const controller =
      window.Adsgram.init({

        blockId:
          ADSGRAM_REWARD_BLOCK_ID

      });


    await controller.show();


    /*
      IMPORTANT:

      The browser does NOT directly
      add XCOIN.

      The completed ad must be
      verified server-side before
      the user's balance changes.
    */


    toast(
      "Ad completed. Reward verification is processing."
    );


  } catch (error) {

    console.error(error);

    toast(
      "Ad was skipped or unavailable."
    );

  } finally {

    $("adsBtn").disabled = false;

  }

}


/* =========================
   ADSGRAM TASK
========================= */

async function openAdsGramTask() {

  if (!initData) {

    toast(
      "Telegram authentication is required."
    );

    return;

  }


  if (!window.Adsgram) {

    toast(
      "Task service is still loading."
    );

    return;

  }


  try {

    const controller =
      window.Adsgram.init({

        blockId:
          ADSGRAM_TASK_BLOCK_ID

      });


    await controller.show();


    /*
      IMPORTANT:

      Task completion must be
      verified server-side before
      XCOIN is credited.

      No balance is changed here.
    */


    toast(
      "Task completed. Verification is processing."
    );


  } catch (error) {

    console.error(error);

    toast(
      "Task was skipped or unavailable."
    );

  }

}


/* =========================
   OPEN MODAL
========================= */

function openModal(
  title,
  content
) {

  $("modalContent").innerHTML =
    `
      <h2>${title}</h2>
      ${content}
    `;


  $("modal").classList.add(
    "open"
  );

}


/* =========================
   CLOSE MODAL
========================= */

function closeModal() {

  $("modal").classList.remove(
    "open"
  );

}


/* =========================
   SCREENS
========================= */

function screen(name) {

  document
    .querySelectorAll(".nav-item")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.screen === name
      );

    });


  if (name === "home") {

    window.scrollTo({

      top: 0,

      behavior: "smooth"

    });

    return;

  }


  const tier =
    currentUser?.tier ||
    "FREE";


  const rules =
    tierRules[tier] ||
    tierRules.FREE;


  const content = {


    mining: `

      <p>
        Your mining rewards and limits
        are controlled by your current tier.
      </p>

      <div class="modal-list">

        <div class="modal-row">
          <b>Current tier</b>
          <span>${tier}</span>
        </div>

        <div class="modal-row">
          <b>Reward per mine</b>
          <span>${rules.reward} XCOIN</span>
        </div>

        <div class="modal-row">
          <b>Mines per cycle</b>
          <span>${rules.maxMines}</span>
        </div>

        <div class="modal-row">
          <b>Cycle duration</b>
          <span>6 hours</span>
        </div>

      </div>

    `,


    upgrade: `

      <p>
        Upgrade your tier to unlock
        higher earning limits.
      </p>

      <div class="modal-list">

        <div class="modal-row">
          <b>BRONZE</b>
          <span>$5</span>
        </div>

        <div class="modal-row">
          <b>SILVER</b>
          <span>$15</span>
        </div>

        <div class="modal-row">
          <b>GOLD</b>
          <span>$30</span>
        </div>

      </div>

    `,


    wallet: `

      <p>
        Your current XCOIN wallet balance.
      </p>

      <div class="modal-list">

        <div class="modal-row">

          <b>
            Balance
          </b>

          <span>
            ${Number(
              currentUser?.balance_xcoin || 0
            ).toLocaleString()}
            XCOIN
          </span>

        </div>


        <div class="modal-row">

          <b>
            USDT value
          </b>

          <span>
            $${(
              Number(
                currentUser?.balance_xcoin || 0
              ) / RATE
            ).toFixed(2)}
          </span>

        </div>

      </div>

    `,


    withdraw: `

      <p>
        The secure withdrawal system
        will be connected before withdrawals
        are enabled.
      </p>

    `,


    referral: `

      <p>
        Your Telegram referral information
        is connected to the account system.
      </p>

      <div class="modal-list">

        <div class="modal-row">

          <b>
            Referral earnings
          </b>

          <span>
            ${Number(
              currentUser?.referral_earnings_xcoin || 0
            ).toLocaleString()}
            XCOIN
          </span>

        </div>

      </div>

    `,


    leaderboard: `

      <p>
        The secure leaderboard query
        will be connected to the database
        next.
      </p>

    `,


    tasks: `

      <p>
        Complete available tasks through
        AdsGram. Task rewards will only be
        credited after secure verification.
      </p>

      <div class="modal-list">

        <div class="modal-row">

          <div>

            <b>
              AdsGram Task
            </b>

            <span>
              Complete available task
            </span>

          </div>


          <button
            class="outline-btn"
            id="startAdsTaskBtn"
          >
            OPEN TASK
          </button>

        </div>

      </div>

    `,


    profile: `

      <p>
        Your Telegram account information.
      </p>

      <div class="modal-list">

        <div class="modal-row">

          <b>
            Name
          </b>

          <span>
            ${currentUser?.first_name || ""}
            ${currentUser?.last_name || ""}
          </span>

        </div>


        <div class="modal-row">

          <b>
            Telegram ID
          </b>

          <span>
            ${currentUser?.telegram_id || "—"}
          </span>

        </div>


        <div class="modal-row">

          <b>
            Tier
          </b>

          <span>
            ${currentUser?.tier || "FREE"}
          </span>

        </div>

      </div>

    `

  };


  openModal(

    name.charAt(0).toUpperCase() +
      name.slice(1),

    content[name] ||
      "<p>Coming soon.</p>"

  );


  const taskButton =
    $("startAdsTaskBtn");


  if (taskButton) {

    taskButton.addEventListener(
      "click",
      openAdsGramTask
    );

  }

}


/* =========================
   EVENT LISTENER
========================= */

document.addEventListener(
  "click",
  event => {

    const screenButton =
      event.target.closest(
        "[data-screen]"
      );


    if (screenButton) {

      screen(
        screenButton.dataset.screen
      );

    }


    if (
      event.target.matches(
        "[data-close-modal]"
      )
    ) {

      closeModal();

    }

  }
);


/* =========================
   MAIN BUTTONS
========================= */

$("mineBtn").addEventListener(
  "click",
  mine
);


$("adsBtn").addEventListener(
  "click",
  watchAd
);


/* =========================
   REFRESH
========================= */

$("refreshBtn").addEventListener(
  "click",
  authenticate
);


/* =========================
   UPGRADE
========================= */

$("upgradeBtn").addEventListener(
  "click",
  () => {

    screen("upgrade");

  }
);


/* =========================
   SMARTLINK
========================= */

$("smartLinkBtn").href =
  SMARTLINK;


/* =========================
   START APP
========================= */

authenticate();


/* =========================
   TIMER UPDATE
========================= */

setInterval(() => {

  if (currentUser) {

    startMineTimer();

  }

}, 60000);
