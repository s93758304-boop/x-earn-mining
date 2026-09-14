/* =========================================================
   XEARN APP.JS — COMPLETE CORRECTED VERSION
   ========================================================= */

const SUPABASE_URL = "https://ynrqdbdgjzmucqcfsyvi.supabase.co";
const XCOIN_PER_USDT = 1300;
const MONETAG_ZONE = "11747212";

let tg = null;
let telegramUser = null;
let currentUser = null;

let videoRunning = false;
let taskRunning = false;
let checkinRunning = false;
let miningRunning = false;

let selectedUpgradeTier = null;
let selectedPaymentAsset = "USDT";
let selectedPaymentNetwork = "TRC20";

const VIDEO_LIMITS = {
    FREE: 5,
    BRONZE: 20,
    SILVER: 30,
    GOLD: 50
};

const TASK_LIMITS = {
    FREE: 10,
    BRONZE: 20,
    SILVER: 30,
    GOLD: 50
};

const MINING_REWARDS = {
    FREE: 50,
    BRONZE: 200,
    SILVER: 300,
    GOLD: 650
};

const UPGRADE_TIERS = {
    BRONZE: 5,
    SILVER: 15,
    GOLD: 30
};

const PAYMENT_METHODS = {
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


/* =========================================================
   DOM HELPERS
   ========================================================= */

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
    return Number(value || 0).toLocaleString("en-US", {
        maximumFractionDigits: 2
    });
}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(title, message) {
    if (message === undefined) {
        message = title;
        title = "XEARN";
    }

    console.log(title + ":", message);

    const toast = $("toast");
    if (!toast) return;

    const titleElement = $("toastTitle");
    const messageElement = $("toastMessage");

    if (titleElement) {
        titleElement.textContent = title;
    }

    if (messageElement) {
        messageElement.textContent = message;
    }

    toast.classList.add("show");

    clearTimeout(window.xearnToastTimer);

    window.xearnToastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3500);
}


/* =========================================================
   LOADING
   ========================================================= */

function hideLoading() {
    const loading = $("loadingScreen");

    if (loading) {
        loading.style.display = "none";
    }
}


/* =========================================================
   TELEGRAM
   ========================================================= */

function initializeTelegram() {
    try {
        if (
            window.Telegram &&
            window.Telegram.WebApp
        ) {
            tg = window.Telegram.WebApp;

            tg.ready();
            tg.expand();

            telegramUser =
                tg.initDataUnsafe?.user || null;

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

async function callFunction(functionName, body) {
    const response = await fetch(
        SUPABASE_URL +
        "/functions/v1/" +
        functionName,
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
    } catch {
        data = null;
    }

    if (!response.ok) {
        throw new Error(
            data?.message ||
            data?.error ||
            "Request failed."
        );
    }

    return data;
}


/* =========================================================
   AUTHENTICATION
   ========================================================= */

async function authenticateUser() {
    if (!telegramUser) {
        createFallbackUser();
        return;
    }

    try {
        const result = await callFunction(
            "telegram-auth",
            {
                telegram_id: telegramUser.id,
                username: telegramUser.username || null,
                first_name: telegramUser.first_name || null,
                last_name: telegramUser.last_name || null,
                photo_url: telegramUser.photo_url || null
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

        updateInterface();

    } catch (error) {
        console.error(
            "Authentication error:",
            error
        );

        createFallbackUser();
    }
}


function createFallbackUser() {
    currentUser = {
        telegram_id:
            telegramUser?.id || null,

        username:
            telegramUser?.username || null,

        first_name:
            telegramUser?.first_name ||
            "XEARN User",

        last_name:
            telegramUser?.last_name || "",

        tier: "FREE",

        balance_xcoin: 0,

        total_earned_xcoin: 0,

        referral_earnings_xcoin: 0,

        videos_watched_today: 0,

        tasks_completed_today: 0,

        referral_count: 0,

        streak_days: 0
    };

    updateInterface();
}


async function refreshUser() {
    if (!telegramUser) {
        return;
    }

    try {
        const result = await callFunction(
            "telegram-auth",
            {
                telegram_id: telegramUser.id,
                username: telegramUser.username || null,
                first_name: telegramUser.first_name || null,
                last_name: telegramUser.last_name || null,
                photo_url: telegramUser.photo_url || null
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
    const screenMap = {
        home: "homeScreen",
        earn: "earnScreen",
        upgrade: "upgradeScreen",
        refer: "referScreen",
        account: "accountScreen"
    };

    const targetId =
        screenMap[screenName] ||
        screenName;

    document
        .querySelectorAll(".screen")
        .forEach(screen => {
            screen.classList.remove("active");
        });

    const target = $(targetId);

    if (!target) {
        console.error(
            "Screen not found:",
            targetId
        );
        return;
    }

    target.classList.add("active");

    document
        .querySelectorAll(
            ".bottom-nav .nav-item"
        )
        .forEach(item => {
            item.classList.remove("active");

            if (
                item.dataset.target ===
                screenName
            ) {
                item.classList.add("active");
            }
        });
}


/* =========================================================
   CURRENT USER DATA
   ========================================================= */

function getTier() {
    return String(
        currentUser?.tier ||
        currentUser?.plan ||
        "FREE"
    ).toUpperCase();
}

function getVideoCount() {
    return Number(
        currentUser?.videos_watched_today ??
        currentUser?.videos_completed ??
        currentUser?.video_count ??
        0
    );
}

function getTaskCount() {
    return Number(
        currentUser?.tasks_completed_today ??
        currentUser?.tasks_completed ??
        currentUser?.completed_tasks ??
        0
    );
}


/* =========================================================
   UPDATE INTERFACE
   ========================================================= */

function updateInterface() {
    if (!currentUser) {
        return;
    }

    const tier = getTier();

    const balance =
        Number(
            currentUser.balance_xcoin || 0
        );

    const totalEarned =
        Number(
            currentUser.total_earned_xcoin || 0
        );

    const videos =
        getVideoCount();

    const tasks =
        getTaskCount();

    const videoLimit =
        VIDEO_LIMITS[tier] || 20;

    const taskLimit =
        TASK_LIMITS[tier] || 10;

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


    /* BALANCE */

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


    /* TOTAL */

    setText(
        "totalEarned",
        formatNumber(totalEarned)
    );


    /* TASKS */

    const safeTasks =
        Math.min(
            tasks,
            taskLimit
        );

    setText(
        "tasksCount",
        formatNumber(safeTasks)
    );

    setText(
        "tasksCompleted",
        formatNumber(safeTasks)
    );

    setText(
        "tasksLimit",
        taskLimit
    );

    setText(
        "taskCounter",
        safeTasks +
        "/" +
        taskLimit
    );

    setText(
        "tasksCounter",
        safeTasks +
        "/" +
        taskLimit
    );


    const taskProgress =
        $("taskProgress");

    if (taskProgress) {
        taskProgress.style.width =
            (
                Math.min(
                    100,
                    (
                        safeTasks /
                        taskLimit
                    ) *
                    100
                )
            ) +
            "%";
    }


    /* VIDEOS */

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

    setText(
        "videoCounter",
        safeVideos +
        "/" +
        videoLimit
    );

    setText(
        "videosCounter",
        safeVideos +
        "/" +
        videoLimit
    );


    const videoProgress =
        $("videoProgress");

    if (videoProgress) {
        videoProgress.style.width =
            (
                Math.min(
                    100,
                    (
                        safeVideos /
                        videoLimit
                    ) *
                    100
                )
            ) +
            "%";
    }


    /* STREAK */

    setText(
        "streakCount",
        formatNumber(streak)
    );


    /* REFERRALS */

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


    /* TIER */

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


    /* MINING REWARD */

    const miningReward =
        MINING_REWARDS[tier] || 50;

    setText(
        "miningReward",
        "+" +
        miningReward +
        " XCOIN"
    );


    /* REFERRAL LINK */

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


    /* USER NAME */

    const name =
        currentUser.full_name ||
        currentUser.first_name ||
        telegramUser?.first_name ||
        "XEARN User";

    setText(
        "userName",
        name
    );


    /* USERNAME */

    setText(
        "userTelegram",

        telegramUser?.username
            ? "@" +
              telegramUser.username
            : "Telegram User"
    );


    /* AVATAR */

    const avatar =
        document.querySelector(".avatar");

    if (avatar) {
        avatar.textContent =
            (
                currentUser.first_name ||
                "X"
            )
                .charAt(0)
                .toUpperCase();
    }


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
                "100%";
        }

        if (countdown) {
            countdown.textContent =
                "Ready";
        }

        return;
    }

    const lastTime =
        new Date(lastMine).getTime();

    if (!Number.isFinite(lastTime)) {
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

    const elapsed =
        Date.now() -
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
                ) *
                100
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


setInterval(() => {
    if (currentUser) {
        updateMiningDisplay();
    }
}, 1000);


/* =========================================================
   WATCH VIDEO
   MONETAG REWARDED INTERSTITIAL
   ========================================================= */

async function watchVideo() {
    if (videoRunning) {
        return;
    }

    if (!telegramUser?.id) {
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
        getTier();

    const videoLimit =
        VIDEO_LIMITS[tier] ||
        20;

    const videosBefore =
        getVideoCount();

    if (
        videosBefore >=
        videoLimit
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

        showToast(
            "Video Finished",
            "Waiting for reward verification..."
        );

        let verified = false;

        for (
            let attempt = 0;
            attempt < 10;
            attempt++
        ) {
            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        2000
                    )
            );

            await refreshUser();

            const videosAfter =
                getVideoCount();

            console.log(
                "Video verification:",
                {
                    attempt:
                        attempt + 1,
                    before:
                        videosBefore,
                    after:
                        videosAfter
                }
            );

            if (
                videosAfter >
                videosBefore
            ) {
                verified = true;

                break;
            }
        }

        if (verified) {
            showToast(
                "Video Reward",
                "Your video reward has been credited."
            );
        } else {
            showToast(
                "Reward Pending",
                "Your reward is still being verified."
            );
        }

    } catch (error) {
        console.error(
            "Video error:",
            error
        );

        showToast(
            "Video Not Completed",
            "No reward was confirmed."
        );

    } finally {
        videoRunning =
            false;

        if (button) {
            button.disabled =
                false;
        }

        await refreshUser();
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

    if (!telegramUser?.id) {
        showToast(
            "Telegram Required",
            "Please open XEARN from Telegram."
        );
        return;
    }

    if (
        typeof window.show_11747212 !==
        "function"
    ) {
        showToast(
            "Task Unavailable",
            "The task service is temporarily unavailable."
        );
        return;
    }

    const tier =
        getTier();

    const taskLimit =
        TASK_LIMITS[tier] ||
        10;

    const tasksBefore =
        getTaskCount();

    if (
        tasksBefore >=
        taskLimit
    ) {
        showToast(
            "Daily Limit",
            "You have reached today's task limit."
        );
        return;
    }


    const confirmed =
        window.confirm(
            "TASK NOTICE\n\n" +
            "Complete the task exactly as instructed.\n\n" +
            "Tasks that are not fully completed will NOT be approved and no reward will be credited.\n\n" +
            "Only successfully completed and verified tasks are eligible for a reward.\n\n" +
            "Do you want to continue?"
        );

    if (!confirmed) {
        return;
    }


    taskRunning = true;

    try {
        const ymid =
            telegramUser.id +
            "_task_" +
            Date.now();

        showToast(
            "Task Started",
            "Complete the task exactly as instructed."
        );


        const adResult =
            await window.show_11747212({
                type: "pop",
                ymid: ymid,
                requestVar: "task"
            });

        console.log(
            "Monetag task result:",
            adResult
        );


        showToast(
            "Task Submitted",
            "Waiting for completion verification..."
        );


        let verified =
            false;

        for (
            let attempt = 0;
            attempt < 10;
            attempt++
        ) {
            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        2000
                    )
            );

            await refreshUser();

            const tasksAfter =
                getTaskCount();

            console.log(
                "Task verification:",
                {
                    attempt:
                        attempt + 1,
                    before:
                        tasksBefore,
                    after:
                        tasksAfter
                }
            );

            if (
                tasksAfter >
                tasksBefore
            ) {
                verified =
                    true;

                break;
            }
        }


        if (verified) {
            showToast(
                "Task Verified",
                "Your task reward has been credited."
            );

            await refreshUser();

        } else {
            showToast(
                "Task Pending",
                "Complete the task fully. Your reward will be added only after successful verification."
            );
        }

    } catch (error) {
        console.error(
            "Task error:",
            error
        );

        showToast(
            "Task Not Completed",
            "The task could not be completed or verified."
        );

    } finally {
        taskRunning =
            false;

        await refreshUser();
    }
}


/* =========================================================
   DAILY CHECK-IN
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
   MINING
   ========================================================= */

async function mineXcoin() {
    if (miningRunning) {
        return;
    }

    if (!telegramUser?.id) {
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
            "Mining Complete",
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
        miningRunning =
            false;

        if (button) {
            button.disabled =
                false;
        }
    }
}


/* =========================================================
   REFERRAL
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

        showToast(
            "Referral Link",
            link
        );
    }
}


/* =========================================================
   CREATE UPGRADE MODAL
   ========================================================= */

function createUpgradeModal() {
    if ($("xearnUpgradeModal")) {
        return;
    }

    const modal =
        document.createElement("div");

    modal.id =
        "xearnUpgradeModal";

    modal.style.display =
        "none";

    modal.innerHTML = `
        <div class="xearn-upgrade-overlay">

            <div class="xearn-upgrade-box">

                <div class="xearn-upgrade-header">

                    <div>

                        <div class="xearn-upgrade-title">
                            Upgrade
                        </div>

                        <div class="xearn-upgrade-subtitle">
                            Choose a tier to unlock higher earning limits.
                        </div>

                    </div>

                    <button
                        type="button"
                        id="xearnUpgradeClose"
                        class="xearn-upgrade-close"
                    >
                        ×
                    </button>

                </div>


                <div class="xearn-upgrade-section">

                    <div class="xearn-upgrade-label">
                        Select Tier
                    </div>

                    <div class="xearn-tier-grid">

                        <button
                            type="button"
                            class="xearn-tier-option"
                            data-upgrade-tier="BRONZE"
                        >
                            <strong>BRONZE</strong>
                            <span>$5</span>
                        </button>

                        <button
                            type="button"
                            class="xearn-tier-option"
                            data-upgrade-tier="SILVER"
                        >
                            <strong>SILVER</strong>
                            <span>$15</span>
                        </button>

                        <button
                            type="button"
                            class="xearn-tier-option"
                            data-upgrade-tier="GOLD"
                        >
                            <strong>GOLD</strong>
                            <span>$30</span>
                        </button>

                    </div>

                </div>


                <div
                    id="xearnUpgradePaymentArea"
                    style="display:none;"
                >

                    <div class="xearn-upgrade-selected">

                        Selected:

                        <strong
                            id="xearnSelectedTier"
                        >
                            -
                        </strong>

                    </div>


                    <div class="xearn-upgrade-section">

                        <div class="xearn-upgrade-label">
                            Payment Asset
                        </div>

                        <div class="xearn-payment-grid">

                            <button
                                type="button"
                                class="xearn-payment-option"
                                data-payment-asset="USDT"
                            >
                                USDT
                            </button>

                            <button
                                type="button"
                                class="xearn-payment-option"
                                data-payment-asset="USDC"
                            >
                                USDC
                            </button>

                        </div>

                    </div>


                    <div
                        id="xearnNetworkArea"
                        class="xearn-upgrade-section"
                        style="display:none;"
                    >

                        <div class="xearn-upgrade-label">
                            Network
                        </div>

                        <div
                            id="xearnNetworkGrid"
                            class="xearn-network-grid"
                        ></div>

                    </div>


                    <div
                        id="xearnWalletArea"
                        style="display:none;"
                    >

                        <div class="xearn-wallet-card">

                            <div class="xearn-wallet-label">
                                Send payment to:
                            </div>

                            <div
                                id="xearnWalletNetwork"
                                class="xearn-wallet-network"
                            >
                                -
                            </div>

                            <div
                                id="xearnWalletAddress"
                                class="xearn-wallet-address"
                            >
                                -
                            </div>

                            <button
                                type="button"
                                id="xearnCopyWallet"
                                class="xearn-copy-wallet"
                            >
                                Copy Address
                            </button>

                        </div>


                        <div class="xearn-payment-warning">

                            Send exactly the required amount
                            on the selected network.

                            <br><br>

                            After sending the payment,
                            submit your transaction ID below.

                        </div>


                        <div class="xearn-tx-section">

                            <label
                                for="xearnTxid"
                                class="xearn-upgrade-label"
                            >
                                Transaction ID / TXID
                            </label>

                            <input
                                id="xearnTxid"
                                type="text"
                                placeholder="Paste your transaction ID"
                                autocomplete="off"
                            />

                            <button
                                type="button"
                                id="xearnSubmitUpgrade"
                                class="xearn-submit-upgrade"
                            >
                                I've Paid
                            </button>

                        </div>

                    </div>

                </div>

            </div>

        </div>
    `;

    document.body.appendChild(
        modal
    );

    injectUpgradeStyles();

    $("xearnUpgradeClose")
        ?.addEventListener(
            "click",
            closeUpgradeModal
        );

    modal
        .querySelector(
            ".xearn-upgrade-overlay"
        )
        ?.addEventListener(
            "click",
            event => {
                if (
                    event.target.classList.contains(
                        "xearn-upgrade-overlay"
                    )
                ) {
                    closeUpgradeModal();
                }
            }
        );

    modal
        .querySelectorAll(
            "[data-upgrade-tier]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {
                    selectUpgradeTier(
                        button.dataset.upgradeTier
                    );
                }
            );

        });

    modal
        .querySelectorAll(
            "[data-payment-asset]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {
                    selectPaymentAsset(
                        button.dataset.paymentAsset
                    );
                }
            );

        });

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
}


/* =========================================================
   UPGRADE STYLES
   ========================================================= */

function injectUpgradeStyles() {
    if ($("xearnUpgradeStyles")) {
        return;
    }

    const style =
        document.createElement("style");

    style.id =
        "xearnUpgradeStyles";

    style.textContent = `

        #xearnUpgradeModal {
            position: fixed;
            inset: 0;
            z-index: 99999;
        }

        .xearn-upgrade-overlay {
            position: absolute;
            inset: 0;
            background: rgba(0,0,0,.80);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            overflow-y: auto;
        }

        .xearn-upgrade-box {
            width: 100%;
            max-width: 480px;
            max-height: 92vh;
            overflow-y: auto;
            background: #07130e;
            border: 1px solid rgba(95,255,157,.18);
            border-radius: 22px;
            box-shadow: 0 25px 80px rgba(0,0,0,.6);
            color: #fff;
        }

        .xearn-upgrade-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 15px;
            padding: 20px;
            border-bottom: 1px solid rgba(255,255,255,.07);
        }

        .xearn-upgrade-title {
            font-size: 23px;
            font-weight: 800;
        }

        .xearn-upgrade-subtitle {
            margin-top: 5px;
            color: #9caea5;
            font-size: 13px;
            line-height: 1.5;
        }

        .xearn-upgrade-close {
            width: 36px;
            height: 36px;
            border: 0;
            border-radius: 50%;
            background: rgba(255,255,255,.08);
            color: #fff;
            font-size: 25px;
            cursor: pointer;
        }

        .xearn-upgrade-section {
            padding: 18px 20px;
        }

        .xearn-upgrade-label {
            font-size: 13px;
            font-weight: 700;
            color: #b8c9c0;
            margin-bottom: 10px;
        }

        .xearn-tier-grid {
            display: grid;
            grid-template-columns: repeat(3,1fr);
            gap: 9px;
        }

        .xearn-tier-option,
        .xearn-payment-option,
        .xearn-network-option {
            border: 1px solid rgba(255,255,255,.09);
            background: #0d2118;
            color: #fff;
            border-radius: 13px;
            padding: 13px 8px;
            cursor: pointer;
        }

        .xearn-tier-option {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        .xearn-tier-option strong {
            font-size: 13px;
        }

        .xearn-tier-option span {
            font-size: 12px;
            color: #91a99d;
        }

        .xearn-tier-option.selected,
        .xearn-payment-option.selected,
        .xearn-network-option.selected {
            border-color: #62ef9c;
            background: #123522;
            box-shadow: 0 0 0 1px rgba(98,239,156,.15);
        }

        .xearn-upgrade-payment-area {
            border-top: 1px solid rgba(255,255,255,.06);
        }

        .xearn-upgrade-selected {
            margin: 0 20px;
            padding: 12px 14px;
            border-radius: 12px;
            background: rgba(98,239,156,.07);
            color: #a7b8af;
            font-size: 13px;
        }

        .xearn-upgrade-selected strong {
            color: #62ef9c;
        }

        .xearn-payment-grid {
            display: grid;
            grid-template-columns: repeat(2,1fr);
            gap: 10px;
        }

        .xearn-payment-option {
            font-weight: 800;
            font-size: 14px;
        }

        .xearn-network-grid {
            display: grid;
            grid-template-columns: repeat(2,1fr);
            gap: 9px;
        }

        .xearn-network-option {
            font-size: 12px;
            font-weight: 700;
        }

        .xearn-wallet-card {
            margin: 0 20px 15px;
            padding: 16px;
            background: #0a1c13;
            border: 1px solid rgba(98,239,156,.12);
            border-radius: 15px;
        }

        .xearn-wallet-label {
            font-size: 12px;
            color: #91a99d;
        }

        .xearn-wallet-network {
            margin-top: 5px;
            font-size: 13px;
            font-weight: 800;
            color: #62ef9c;
        }

        .xearn-wallet-address {
            margin-top: 10px;
            padding: 12px;
            background: #050b08;
            border-radius: 10px;
            word-break: break-all;
            font-size: 12px;
            line-height: 1.5;
            color: #e9f5ef;
        }

        .xearn-copy-wallet {
            width: 100%;
            margin-top: 10px;
            padding: 11px;
            border: 0;
            border-radius: 10px;
            background: #153b27;
            color: #8dffb7;
            font-weight: 700;
            cursor: pointer;
        }

        .xearn-payment-warning {
            margin: 0 20px 15px;
            padding: 13px;
            border-radius: 12px;
            background: rgba(255,193,7,.06);
            border: 1px solid rgba(255,193,7,.1);
            color: #bfcac4;
            font-size: 12px;
            line-height: 1.55;
        }

        .xearn-tx-section {
            padding: 0 20px 20px;
        }

        #xearnTxid {
            width: 100%;
            box-sizing: border-box;
            padding: 13px;
            border-radius: 11px;
            border: 1px solid rgba(255,255,255,.1);
            background: #050b08;
            color: #fff;
            outline: none;
            font-size: 13px;
        }

        #xearnTxid:focus {
            border-color: #62ef9c;
        }

        .xearn-submit-upgrade {
            width: 100%;
            margin-top: 12px;
            padding: 14px;
            border: 0;
            border-radius: 12px;
            background: #62ef9c;
            color: #06120b;
            font-size: 14px;
            font-weight: 900;
            cursor: pointer;
        }

        .xearn-submit-upgrade:disabled {
            opacity: .5;
            cursor: not-allowed;
        }

        @media(max-width:360px) {
            .xearn-tier-grid {
                grid-template-columns: 1fr;
            }

            .xearn-network-grid {
                grid-template-columns: 1fr;
            }
        }
    `;

    document.head.appendChild(
        style
    );
}


/* =========================================================
   OPEN UPGRADE MODAL
   ========================================================= */

function openUpgradeModal() {
    createUpgradeModal();

    const modal =
        $("xearnUpgradeModal");

    if (!modal) {
        return;
    }

    modal.style.display =
        "block";

    selectedUpgradeTier =
        null;

    selectedPaymentAsset =
        "USDT";

    selectedPaymentNetwork =
        "TRC20";

    const paymentArea =
        $("xearnUpgradePaymentArea");

    if (paymentArea) {
        paymentArea.style.display =
            "none";
    }

    document
        .querySelectorAll(
            ".xearn-tier-option"
        )
        .forEach(button => {
            button.classList.remove(
                "selected"
            );
        });

    document
        .querySelectorAll(
            ".xearn-payment-option"
        )
        .forEach(button => {
            button.classList.remove(
                "selected"
            );
        });

    const networkArea =
        $("xearnNetworkArea");

    if (networkArea) {
        networkArea.style.display =
            "none";
    }

    const walletArea =
        $("xearnWalletArea");

    if (walletArea) {
        walletArea.style.display =
            "none";
    }

    const txid =
        $("xearnTxid");

    if (txid) {
        txid.value = "";
    }
}


/* =========================================================
   CLOSE UPGRADE MODAL
   ========================================================= */

function closeUpgradeModal() {
    const modal =
        $("xearnUpgradeModal");

    if (modal) {
        modal.style.display =
            "none";
    }
}


/* =========================================================
   SELECT UPGRADE TIER
   ========================================================= */

function selectUpgradeTier(tier) {
    if (!UPGRADE_TIERS[tier]) {
        return;
    }

    selectedUpgradeTier =
        tier;

    document
        .querySelectorAll(
            ".xearn-tier-option"
        )
        .forEach(button => {
            button.classList.toggle(
                "selected",
                button.dataset.upgradeTier ===
                tier
            );
        });

    setText(
        "xearnSelectedTier",
        tier +
        " - $" +
        UPGRADE_TIERS[tier]
    );

    const paymentArea =
        $("xearnUpgradePaymentArea");

    if (paymentArea) {
        paymentArea.style.display =
            "block";
    }

    selectPaymentAsset(
        selectedPaymentAsset
    );
}


/* =========================================================
   SELECT PAYMENT ASSET
   ========================================================= */

function selectPaymentAsset(asset) {
    if (!PAYMENT_METHODS[asset]) {
        return;
    }

    if (!selectedUpgradeTier) {
        showToast(
            "Upgrade",
            "Select a tier first."
        );
        return;
    }

    selectedPaymentAsset =
        asset;

    selectedPaymentNetwork =
        null;

    document
        .querySelectorAll(
            ".xearn-payment-option"
        )
        .forEach(button => {
            button.classList.toggle(
                "selected",
                button.dataset.paymentAsset ===
                asset
            );
        });

    renderPaymentNetworks(
        asset
    );
}


/* =========================================================
   RENDER PAYMENT NETWORKS
   ========================================================= */

function renderPaymentNetworks(asset) {
    const networkGrid =
        $("xearnNetworkGrid");

    const networkArea =
        $("xearnNetworkArea");

    const walletArea =
        $("xearnWalletArea");

    if (!networkGrid) {
        return;
    }

    networkGrid.innerHTML =
        "";

    const networks =
        Object.keys(
            PAYMENT_METHODS[asset]
        );

    networks.forEach(
        network => {

            const button =
                document.createElement(
                    "button"
                );

            button.type =
                "button";

            button.className =
                "xearn-network-option";

            button.dataset.network =
                network;

            button.textContent =
                network;

            button.addEventListener(
                "click",
                () => {
                    selectPaymentNetwork(
                        network
                    );
                }
            );

            networkGrid.appendChild(
                button
            );
        }
    );

    if (networkArea) {
        networkArea.style.display =
            "block";
    }

    if (walletArea) {
        walletArea.style.display =
            "none";
    }
}


/* =========================================================
   SELECT PAYMENT NETWORK
   ========================================================= */

function selectPaymentNetwork(network) {
    if (!selectedPaymentAsset) {
        return;
    }

    const wallet =
        PAYMENT_METHODS[
            selectedPaymentAsset
        ]?.[network];

    if (!wallet) {
        showToast(
            "Network Error",
            "This payment network is not available."
        );
        return;
    }

    selectedPaymentNetwork =
        network;

    document
        .querySelectorAll(
            ".xearn-network-option"
        )
        .forEach(button => {
            button.classList.toggle(
                "selected",
                button.dataset.network ===
                network
            );
        });

    setText(
        "xearnWalletNetwork",
        selectedPaymentAsset +
        " " +
        network
    );

    setText(
        "xearnWalletAddress",
        wallet
    );

    const walletArea =
        $("xearnWalletArea");

    if (walletArea) {
        walletArea.style.display =
            "block";
    }
}


/* =========================================================
   COPY UPGRADE WALLET
   ========================================================= */

async function copyUpgradeWallet() {
    if (
        !selectedPaymentAsset ||
        !selectedPaymentNetwork
    ) {
        showToast(
            "Payment",
            "Select a payment network first."
        );
        return;
    }

    const wallet =
        PAYMENT_METHODS[
            selectedPaymentAsset
        ]?.[
            selectedPaymentNetwork
        ];

    if (!wallet) {
        return;
    }

    try {
        await navigator.clipboard.writeText(
            wallet
        );

        showToast(
            "Copied",
            "Wallet address copied."
        );

    } catch {
        showToast(
            "Wallet Address",
            wallet
        );
    }
}


/* =========================================================
   SUBMIT UPGRADE
   ========================================================= */

async function submitUpgradeOrder() {
    console.log(
        "XEARN upgrade submit clicked"
    );

    if (
        !telegramUser ||
        !telegramUser.id
    ) {
        showToast(
            "Error",
            "Telegram account not detected."
        );
        return;
    }

    const txidInput =
        $("xearnTxid");

    if (!txidInput) {
        showToast(
            "Error",
            "TXID field not found."
        );
        return;
    }

    const txid =
        txidInput.value.trim();

    if (!txid) {
        showToast(
            "TXID Required",
            "Please enter your transaction ID."
        );
        return;
    }

    if (txid.length < 8) {
        showToast(
            "Invalid TXID",
            "Please enter a valid transaction ID."
        );
        return;
    }

    if (!selectedUpgradeTier) {
        showToast(
            "Select Tier",
            "Please select an upgrade tier."
        );
        return;
    }

    if (!selectedPaymentAsset) {
        showToast(
            "Select Payment",
            "Please select USDT or USDC."
        );
        return;
    }

    if (!selectedPaymentNetwork) {
        showToast(
            "Select Network",
            "Please select a payment network."
        );
        return;
    }

    const button =
        $("xearnSubmitUpgrade");

    if (button) {
        button.disabled =
            true;

        button.textContent =
            "Submitting...";
    }

    try {
        const payload = {
            telegram_id:
                Number(
                    telegramUser.id
                ),

            requested_tier:
                String(
                    selectedUpgradeTier
                ).toUpperCase(),

            payment_asset:
                String(
                    selectedPaymentAsset
                ).toUpperCase(),

            payment_network:
                String(
                    selectedPaymentNetwork
                ).toUpperCase(),

            txid:
                txid
        };

        const result =
            await callFunction(
                "create-upgrade-order",
                payload
            );

        console.log(
            "XEARN upgrade response:",
            result
        );

        if (
            result &&
            result.success === true
        ) {
            showToast(
                "Payment Submitted",
                "Your payment is pending admin verification."
            );

            txidInput.value =
                "";

            setTimeout(
                () => {
                    closeUpgradeModal();
                },
                1800
            );

            return;
        }

        throw new Error(
            result?.message ||
            result?.error ||
            "The upgrade order could not be submitted."
        );

    } catch (error) {
        console.error(
            "XEARN upgrade error:",
            error
        );

        showToast(
            "Submission Failed",
            error?.message ||
            "Unable to submit your upgrade."
        );

    } finally {
        if (button) {
            button.disabled =
                false;

            button.textContent =
                "I've Paid";
        }
    }
}


/* =========================================================
   OPEN UPGRADE SCREEN
   ========================================================= */

function openUpgradeScreen() {
    showScreen(
        "upgrade"
    );

    openUpgradeModal();
}


/* =========================================================
   BUTTON SETUP
   ========================================================= */

function setupButtons() {

    console.log(
        "Setting up XEARN buttons..."
    );


    /* BOTTOM NAV */

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

                    if (
                        target ===
                        "upgrade"
                    ) {
                        openUpgradeScreen();
                    } else {
                        showScreen(
                            target
                        );
                    }
                }
            );

        });


    /* EARN */

    $("earnButton")
        ?.addEventListener(
            "click",
            () => {
                showScreen(
                    "earn"
                );
            }
        );


    /* WATCH VIDEO */

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


    /* TASK */

    $("taskItem")
        ?.addEventListener(
            "click",
            startTask
        );

    $("earnTaskItem")
        ?.addEventListener(
            "click",
            startTask
        );


    /* CHECK-IN */

    $("checkinItem")
        ?.addEventListener(
            "click",
            claimDailyCheckin
        );

    $("earnCheckinItem")
        ?.addEventListener(
            "click",
            claimDailyCheckin
        );


    /* MINING */

    $("mineButton")
        ?.addEventListener(
            "click",
            mineXcoin
        );


    /* REFERRAL */

    $("copyReferralButton")
        ?.addEventListener(
            "click",
            copyReferral
        );


    /* WITHDRAW */

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


    /* HISTORY */

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


    /* UPGRADE */

    $("upgradeButton")
        ?.addEventListener(
            "click",
            openUpgradeScreen
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

    createUpgradeModal();

    showScreen(
        "home"
    );

    try {

        const ready =
            initializeTelegram();

        setupButtons();

        if (!ready) {
            createFallbackUser();
            return;
        }

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
