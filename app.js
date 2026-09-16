/* =========================================================
   XEARN APP.JS — COMPLETE VERSION
   WITHDRAW + HISTORY INTEGRATED
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

/* =========================================================
   WITHDRAWAL SETTINGS
   ========================================================= */

const MIN_WITHDRAW_USDT = 10;
const WITHDRAWAL_FEE_RATE = 0.10;

const WITHDRAWAL_NETWORKS = [
    {
        asset: "USDT",
        network: "BEP20"
    },
    {
        asset: "USDC",
        network: "BEP20"
    },
    {
        asset: "USDT",
        network: "ERC20"
    },
    {
        asset: "USDC",
        network: "ERC20"
    },
    {
        asset: "USDT",
        network: "TON"
    },
    {
        asset: "USDT",
        network: "SOL"
    },
    {
        asset: "USDT",
        network: "TRC20"
    }
];

/* =========================================================
   EXISTING SETTINGS
   ========================================================= */

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

    if (!toast) {
        return;
    }

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
            5,

        referral_count:
            N/A,

        streak_days:
            1
    };

    updateInterface();
}


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
        .querySelectorAll(".screen")
        .forEach(screen => {
            screen.classList.remove(
                "active"
            );
        });

    const target =
        $(targetId);

    if (!target) {

        console.error(
            "Screen not found:",
            targetId
        );

        return;
    }

    target.classList.add(
        "active"
    );

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

    const tier =
        getTier();

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

    const videos =
        getVideoCount();

    const tasks =
        getTaskCount();

    const videoLimit =
        VIDEO_LIMITS[tier] ||
        20;

    const taskLimit =
        TASK_LIMITS[tier] ||
        10;

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
        formatNumber(
            totalEarned
        )
    );


    /* TASKS */

    const safeTasks =
        Math.min(
            tasks,
            taskLimit
        );

    setText(
        "tasksCount",
        formatNumber(
            safeTasks
        )
    );

    setText(
        "tasksCompleted",
        formatNumber(
            safeTasks
        )
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
            Math.min(
                100,
                (
                    safeTasks /
                    taskLimit
                ) *
                100
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
            Math.min(
                100,
                (
                    safeVideos /
                    videoLimit
                ) *
                100
            ) +
            "%";
    }


    /* STREAK */

    setText(
        "streakCount",
        formatNumber(
            streak
        )
    );


    /* REFERRALS */

    setText(
        "referralsCount",
        formatNumber(
            referrals
        )
    );

    setText(
        "referralTotal",
        formatNumber(
            referrals
        )
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


    /* MINING */

    const miningReward =
        MINING_REWARDS[tier] ||
        50;

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
        document.querySelector(
            ".avatar"
        );

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
        new Date(
            lastMine
        ).getTime();

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

    videoRunning =
        true;

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

            const videosAfter =
                getVideoCount();

            if (
                videosAfter >
                videosBefore
            ) {

                verified =
                    true;

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
   OPEN TASK
========================================================= */

async function openTaskList() {

    const modal = $("taskModal");
    const list = $("taskList");

    if (!modal || !list) {
        console.error("Task modal elements not found.");
        return;
    }

    modal.classList.add("show");

    list.innerHTML = `
        <div style="
            text-align:center;
            padding:30px;
            color:#9caea5;
        ">
            Loading available tasks...
        </div>
    `;

    try {

    const { data, error } = await supabase
            .from("tasks")
            .select("*")
            .eq("enabled", true)
            .order("created_at", {
                ascending: false
            });

        if (error) {
            throw error;
        }

        console.log("Available tasks:", data);

        if (!data || data.length === 0) {

            list.innerHTML = `
                <div style="
                    text-align:center;
                    padding:35px 20px;
                ">
                    <div style="font-size:42px;">
                        📋
                    </div>

                    <div style="
                        margin-top:10px;
                        font-size:16px;
                        font-weight:800;
                    ">
                        No tasks available
                    </div>

                    <div style="
                        margin-top:7px;
                        color:#91a99d;
                        font-size:12px;
                    ">
                        Please check back later.
                    </div>
                </div>
            `;

            return;
        }

        list.innerHTML = data.map(task => {

            const reward =
                Number(task.reward_xcoin || 0);

            return `
                <div class="task-row">

                    <div class="task-row-info">

                        <div class="task-row-title">
                            ${escapeHtml(
                                task.title ||
                                "Available Task"
                            )}
                        </div>

                        <div class="task-row-desc">
                            ${escapeHtml(
                                task.description ||
                                "Complete this task to earn XCOIN."
                            )}
                        </div>

                        <div class="task-row-reward">
                            +${reward} XCOIN
                        </div>

                    </div>

                    <button
                        type="button"
                        class="task-start-btn"
                        data-task-id="${task.id}"
                    >
                        START
                    </button>

                </div>
            `;

        }).join("");

        list
            .querySelectorAll(".task-start-btn")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        chooseTask(
                            button.dataset.taskId
                        );

                    }
                );

            });

    } catch (error) {

        console.error(
            "Task list error:",
            error
        );

        list.innerHTML = `
            <div style="
                text-align:center;
                padding:30px 20px;
            ">

                <div style="font-size:40px;">
                    ⚠️
                </div>

                <div style="
                    margin-top:10px;
                    font-weight:800;
                ">
                    Unable to load tasks
                </div>

                <div style="
                    margin-top:7px;
                    color:#91a99d;
                    font-size:12px;
                ">
                    ${escapeHtml(
                        error.message ||
                        "Please try again later."
                    )}
                </div>

            </div>
        `;
    }
}
/* =========================================================
   CHOOSE TASK
========================================================= */

function chooseTask(taskId) {

    const task = document.querySelector(
        `.task-start-btn[data-task-id="${taskId}"]`
    );

    if (!task) {
        showToast(
            "Task Error",
            "Unable to find this task."
        );
        return;
    }

    const row = task.closest(".task-row");

    if (!row) {
        showToast(
            "Task Error",
            "Unable to open this task."
        );
        return;
    }

    const title =
        row.querySelector(".task-row-title")?.textContent.trim() ||
        "Task";

    const reward =
        row.querySelector(".task-row-reward")?.textContent.trim() ||
        "";

    const description =
        row.querySelector(".task-row-desc")?.textContent.trim() ||
        "";

    const confirmed = window.confirm(
        title +
        "\n\n" +
        description +
        "\n\n" +
        reward +
        "\n\n" +
        "Do you want to start this task?"
    );

    if (!confirmed) {
        return;
    }

    const taskUrl = task.dataset.taskUrl;

    if (taskUrl) {
        window.open(taskUrl, "_blank");
    } else {
        showToast(
            "Task Error",
            "This task does not have a URL."
        );
    }
}

/* =========================================================
   TASK
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

    taskRunning =
        true;

    try {

        const ymid =
            telegramUser.id +
            "_task_" +
            Date.now();

        showToast(
            "Task Started",
            "Complete the task exactly as instructed."
        );

        await window.show_11747212({
            type: "pop",
            ymid: ymid,
            requestVar: "task"
        });

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
   WITHDRAWAL HELPERS
   ========================================================= */

function getBalanceXcoin() {

    return Number(
        currentUser?.balance_xcoin ||
        0
    );
}


function getBalanceUsdt() {

    return (
        getBalanceXcoin() /
        XCOIN_PER_USDT
    );
}


function calculateWithdrawal(usdtAmount) {

    const amount =
        Number(
            usdtAmount
        );

    const fee =
        amount *
        WITHDRAWAL_FEE_RATE;

    const net =
        amount -
        fee;

    const xcoinAmount =
        amount *
        XCOIN_PER_USDT;

    const feeXcoin =
        fee *
        XCOIN_PER_USDT;

    const netXcoin =
        net *
        XCOIN_PER_USDT;

    return {
        usdtAmount: amount,
        feeUsdt: fee,
        netUsdt: net,
        amountXcoin: xcoinAmount,
        feeXcoin: feeXcoin,
        netXcoin: netXcoin
    };
}


/* =========================================================
   WITHDRAWAL STYLES
   ========================================================= */

function injectWithdrawalStyles() {

    if ($("xearnWithdrawalStyles")) {
        return;
    }

    const style =
        document.createElement(
            "style"
        );

    style.id =
        "xearnWithdrawalStyles";

    style.textContent = `

        #xearnWithdrawalModal,
        #xearnHistoryModal {
            position: fixed;
            inset: 0;
            z-index: 100000;
            display: none;
        }

        .xearn-withdraw-overlay,
        .xearn-history-overlay {
            position: absolute;
            inset: 0;
            background: rgba(0,0,0,.84);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 15px;
            overflow-y: auto;
        }

        .xearn-withdraw-box,
        .xearn-history-box {
            width: 100%;
            max-width: 500px;
            max-height: 92vh;
            overflow-y: auto;
            background: #07130e;
            border: 1px solid rgba(98,239,156,.18);
            border-radius: 22px;
            color: #fff;
            box-shadow: 0 25px 80px rgba(0,0,0,.7);
        }

        .xearn-withdraw-header,
        .xearn-history-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 12px;
            padding: 20px;
            border-bottom: 1px solid rgba(255,255,255,.07);
        }

        .xearn-withdraw-title,
        .xearn-history-title {
            font-size: 22px;
            font-weight: 900;
        }

        .xearn-withdraw-subtitle,
        .xearn-history-subtitle {
            margin-top: 5px;
            color: #91a99d;
            font-size: 12px;
            line-height: 1.5;
        }

        .xearn-withdraw-close,
        .xearn-history-close {
            width: 36px;
            height: 36px;
            border: 0;
            border-radius: 50%;
            background: rgba(255,255,255,.08);
            color: #fff;
            font-size: 24px;
            cursor: pointer;
            flex-shrink: 0;
        }

        .xearn-withdraw-body {
            padding: 18px 20px 22px;
        }

        .xearn-balance-box {
            padding: 15px;
            border-radius: 15px;
            background: rgba(98,239,156,.07);
            border: 1px solid rgba(98,239,156,.12);
            margin-bottom: 18px;
        }

        .xearn-balance-label {
            color: #91a99d;
            font-size: 12px;
        }

        .xearn-balance-main {
            margin-top: 5px;
            font-size: 20px;
            font-weight: 900;
        }

        .xearn-balance-usdt {
            margin-top: 4px;
            color: #62ef9c;
            font-size: 13px;
            font-weight: 700;
        }

        .xearn-field {
            margin-bottom: 16px;
        }

        .xearn-field label {
            display: block;
            margin-bottom: 8px;
            color: #b8c9c0;
            font-size: 12px;
            font-weight: 800;
        }

        .xearn-field input,
        .xearn-field select {
            width: 100%;
            box-sizing: border-box;
            padding: 13px;
            border-radius: 11px;
            border: 1px solid rgba(255,255,255,.10);
            background: #050b08;
            color: #fff;
            outline: none;
            font-size: 13px;
        }

        .xearn-field input:focus,
        .xearn-field select:focus {
            border-color: #62ef9c;
        }

        .xearn-network-grid-withdraw {
            display: grid;
            grid-template-columns: repeat(2,1fr);
            gap: 8px;
        }

        .xearn-withdraw-network {
            padding: 11px 7px;
            border-radius: 11px;
            border: 1px solid rgba(255,255,255,.09);
            background: #0d2118;
            color: #fff;
            cursor: pointer;
            font-size: 12px;
            font-weight: 800;
        }

        .xearn-withdraw-network.selected {
            border-color: #62ef9c;
            background: #123522;
            color: #62ef9c;
        }

        .xearn-fee-box {
            margin: 5px 0 17px;
            padding: 14px;
            border-radius: 13px;
            background: #0a1c13;
            border: 1px solid rgba(255,255,255,.07);
        }

        .xearn-fee-row {
            display: flex;
            justify-content: space-between;
            gap: 15px;
            margin-bottom: 9px;
            font-size: 12px;
            color: #9caea5;
        }

        .xearn-fee-row:last-child {
            margin-bottom: 0;
            padding-top: 9px;
            border-top: 1px solid rgba(255,255,255,.07);
            color: #fff;
            font-weight: 900;
        }

        .xearn-fee-value {
            text-align: right;
            color: #fff;
        }

        .xearn-net-value {
            color: #62ef9c;
        }

        .xearn-withdraw-submit {
            width: 100%;
            padding: 14px;
            border: 0;
            border-radius: 12px;
            background: #62ef9c;
            color: #06120b;
            font-size: 14px;
            font-weight: 900;
            cursor: pointer;
        }

        .xearn-withdraw-submit:disabled {
            opacity: .5;
            cursor: not-allowed;
        }

        .xearn-withdraw-note {
            margin-top: 12px;
            color: #788c82;
            font-size: 11px;
            line-height: 1.5;
            text-align: center;
        }

        .xearn-history-body {
            padding: 15px 20px 22px;
        }

        .xearn-history-loading,
        .xearn-history-empty {
            padding: 35px 15px;
            text-align: center;
            color: #91a99d;
            font-size: 13px;
        }

        .xearn-history-item {
            padding: 14px;
            margin-bottom: 9px;
            border-radius: 14px;
            background: #0a1c13;
            border: 1px solid rgba(255,255,255,.07);
        }

        .xearn-history-top {
            display: flex;
            justify-content: space-between;
            gap: 10px;
        }

        .xearn-history-name {
            font-size: 13px;
            font-weight: 900;
        }

        .xearn-history-amount {
            font-size: 13px;
            font-weight: 900;
            color: #62ef9c;
        }

        .xearn-history-desc {
            margin-top: 5px;
            color: #91a99d;
            font-size: 11px;
            line-height: 1.45;
        }

        .xearn-history-status {
            display: inline-block;
            margin-top: 9px;
            padding: 4px 8px;
            border-radius: 20px;
            background: rgba(255,255,255,.07);
            color: #c7d5ce;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
        }

        .xearn-history-date {
            margin-top: 7px;
            color: #687b72;
            font-size: 10px;
        }

        @media(max-width:360px) {

            .xearn-network-grid-withdraw {
                grid-template-columns: 1fr;
            }
        }
    `;

    document.head.appendChild(
        style
    );
}

/* =========================================================
   CREATE WITHDRAWAL MODAL
========================================================= */

function createWithdrawalModal() {

    if ($("xearnWithdrawalModal")) {
        return;
    }

    /* =========================
       WITHDRAWAL STYLES
    ========================= */

    if (!$("xearnWithdrawalStyle")) {

        const style = document.createElement("style");

        style.id = "xearnWithdrawalStyle";

        style.textContent = `

            #xearnWithdrawalModal {
                position: fixed;
                inset: 0;
                z-index: 99999;
                display: none;
                font-family:
                    Inter,
                    -apple-system,
                    BlinkMacSystemFont,
                    "Segoe UI",
                    Arial,
                    sans-serif;
            }

            .xearn-withdraw-overlay {
                position: absolute;
                inset: 0;
                overflow-y: auto;
                padding: 18px 14px 35px;
                background: #111318;
            }

            .xearn-withdraw-modal {
                width: 100%;
                max-width: 520px;
                min-height: 100%;
                margin: auto;
            }

            .xearn-withdraw-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 18px;
            }

            .xearn-withdraw-title {
                color: #fff;
                font-size: 27px;
                font-weight: 900;
            }

            .xearn-withdraw-subtitle {
                margin-top: 4px;
                color: #858995;
                font-size: 11px;
            }

            .xearn-withdraw-close {
                width: 42px;
                height: 42px;
                border: 1px solid #292d36;
                border-radius: 50%;
                background: #1d2028;
                color: #fff;
                font-size: 27px;
                line-height: 1;
            }

            .xearn-withdraw-balance {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                padding: 21px 20px;
                border: 1px solid #292d36;
                border-radius: 25px;
                background: #1b1e25;
            }

            .xearn-withdraw-balance span {
                display: block;
                color: #8e929d;
                font-size: 13px;
                font-weight: 700;
            }

            .xearn-withdraw-balance strong {
                display: block;
                margin-top: 8px;
                color: #fff;
                font-size: 23px;
                font-weight: 900;
            }

            .xearn-withdraw-field {
                margin-top: 24px;
            }

            .xearn-withdraw-field label {
                display: block;
                margin: 0 0 10px 2px;
                color: #9b9fa9;
                font-size: 13px;
                font-weight: 800;
            }

            #xearnWithdrawAmount,
            #xearnWithdrawAddress {
                width: 100%;
                box-sizing: border-box;
                border: 1px solid #2a2e37;
                outline: none;
                background: #20232b;
                color: #fff;
            }

            #xearnWithdrawAmount {
                height: 70px;
                padding: 0 75px 0 20px;
                border-radius: 27px;
                font-size: 27px;
                font-weight: 900;
            }

            #xearnWithdrawAddress {
                height: 64px;
                padding: 0 18px;
                border-radius: 24px;
                font-size: 12px;
            }

            #xearnWithdrawAmount:focus,
            #xearnWithdrawAddress:focus {
                border-color: #4387ff;
            }

            .xearn-withdraw-network-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
            }

            .xearn-withdraw-network {
                min-height: 76px;
                padding: 11px;
                display: flex;
                align-items: center;
                gap: 10px;
                text-align: left;
                border: 1px solid #292d36;
                border-radius: 21px;
                background: #191c22;
                color: #fff;
            }

            .xearn-withdraw-network.selected {
                border-color: #4387ff;
                background: #1c2a47;
            }

            .xearn-network-icon {
                width: 43px;
                height: 43px;
                flex-shrink: 0;
                display: grid;
                place-items: center;
                border-radius: 50%;
                background: #29c28a;
                color: #fff;
                font-size: 17px;
                font-weight: 900;
            }

            .xearn-network-icon.usdc {
                background: #3189ef;
            }

            .xearn-network-info {
                min-width: 0;
            }

            .xearn-network-name {
                color: #fff;
                font-size: 12px;
                font-weight: 900;
            }

            .xearn-network-min {
                margin-top: 4px;
                color: #858a96;
                font-size: 9px;
                font-weight: 700;
            }

            .xearn-withdraw-summary {
                margin-top: 20px;
                padding: 17px 18px;
                border: 1px solid #292d36;
                border-radius: 21px;
                background: #191c22;
            }

            .xearn-fee-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                min-height: 34px;
                color: #9297a2;
                font-size: 12px;
                font-weight: 700;
            }

            .xearn-fee-value {
                color: #fff;
                font-weight: 900;
            }

            .xearn-net-value {
                color: #52d99a;
                font-size: 14px;
            }

            .xearn-withdraw-submit {
                width: 100%;
                height: 64px;
                margin-top: 16px;
                border: 0;
                border-radius: 23px;
                background: linear-gradient(
                    135deg,
                    #4d91ff,
                    #3174df
                );
                color: #fff;
                font-size: 17px;
                font-weight: 900;
            }

            .xearn-withdraw-submit:disabled {
                opacity: .55;
            }

            .xearn-withdraw-note {
                margin: 14px 5px 0;
                text-align: center;
                color: #6f7480;
                font-size: 9px;
                line-height: 1.5;
            }

        `;

        document.head.appendChild(style);
    }


    /* =========================
       MODAL HTML
    ========================= */

    const modal = document.createElement("div");

    modal.id = "xearnWithdrawalModal";

    modal.innerHTML = `

        <div class="xearn-withdraw-overlay">

            <div class="xearn-withdraw-modal">

                <div class="xearn-withdraw-header">

                    <div>

                        <div class="xearn-withdraw-title">
                            Withdraw
                        </div>

                        <div class="xearn-withdraw-subtitle">
                            Withdraw your available XEARN balance
                        </div>

                    </div>

                    <button
                        type="button"
                        id="xearnWithdrawClose"
                        class="xearn-withdraw-close"
                    >
                        ×
                    </button>

                </div>


                <div class="xearn-withdraw-balance">

                    <div>

                        <span>
                            Available
                        </span>

                        <strong id="withdrawBalanceXcoin">
                            0 XCOIN
                        </strong>

                    </div>

                    <div>

                        <span>
                            USDT Value
                        </span>

                        <strong id="withdrawBalanceUsdt">
                            $0.00
                        </strong>

                    </div>

                </div>


                <div class="xearn-withdraw-field">

                    <label>
                        Withdrawal amount
                    </label>

                    <div style="position:relative;">

                        <input
                            type="number"
                            id="xearnWithdrawAmount"
                            placeholder="10.00"
                            min="10"
                            step="0.01"
                            inputmode="decimal"
                        >

                        <span
                            style="
                                position:absolute;
                                right:22px;
                                top:50%;
                                transform:translateY(-50%);
                                color:#9296a0;
                                font-size:16px;
                                font-weight:900;
                                pointer-events:none;
                            "
                        >
                            USDT
                        </span>

                    </div>

                </div>


                <div class="xearn-withdraw-field">

                    <label>
                        Select network
                    </label>

                    <div
                        id="xearnWithdrawNetworkGrid"
                        class="xearn-withdraw-network-grid"
                    ></div>

                </div>


                <div class="xearn-withdraw-field">

                    <label>
                        Wallet
                    </label>

                    <input
                        type="text"
                        id="xearnWithdrawAddress"
                        placeholder="Paste your wallet address"
                        autocomplete="off"
                    >

                </div>


                <div class="xearn-withdraw-summary">

                    <div class="xearn-fee-row">

                        <span>
                            Requested
                        </span>

                        <span
                            id="withdrawSummaryRequested"
                            class="xearn-fee-value"
                        >
                            $0.00
                        </span>

                    </div>


                    <div class="xearn-fee-row">

                        <span>
                            Fee (10%)
                        </span>

                        <span
                            id="withdrawSummaryFee"
                            class="xearn-fee-value"
                        >
                            $0.00
                        </span>

                    </div>


                    <div class="xearn-fee-row">

                        <span>
                            You receive
                        </span>

                        <span
                            id="withdrawSummaryNet"
                            class="xearn-fee-value xearn-net-value"
                        >
                            $0.00
                        </span>

                    </div>

                </div>


                <button
                    type="button"
                    id="xearnSubmitWithdrawal"
                    class="xearn-withdraw-submit"
                >
                    Withdraw
                </button>


                <div class="xearn-withdraw-note">

                    Minimum withdrawal is $10.
                    A 10% withdrawal fee applies.
                    Your request will be reviewed manually by XEARN admin.

                </div>

            </div>

        </div>

    `;

    document.body.appendChild(modal);


    /* =========================
       NETWORK BUTTONS
    ========================= */

    const networkGrid =
        $("xearnWithdrawNetworkGrid");

    if (networkGrid) {

        WITHDRAWAL_NETWORKS.forEach(option => {

            const button =
                document.createElement("button");

            button.type = "button";

            button.className =
                "xearn-withdraw-network";

            button.dataset.asset =
                option.asset;

            button.dataset.network =
                option.network;


            const icon =
                document.createElement("div");

            icon.className =
                "xearn-network-icon " +
                (
                    option.asset === "USDC"
                        ? "usdc"
                        : ""
                );

            icon.textContent =
                option.asset === "USDC"
                    ? "$"
                    : "₮";


            const info =
                document.createElement("div");

            info.className =
                "xearn-network-info";

            info.innerHTML = `

                <div class="xearn-network-name">
                    ${option.asset} ${option.network}
                </div>

                <div class="xearn-network-min">
                    min. $10 ${option.asset}
                </div>

            `;


            button.appendChild(icon);

            button.appendChild(info);


            button.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(
                            "#xearnWithdrawNetworkGrid .xearn-withdraw-network"
                        )
                        .forEach(item => {

                            item.classList.remove(
                                "selected"
                            );

                        });


                    button.classList.add(
                        "selected"
                    );

                }
            );


            networkGrid.appendChild(
                button
            );

        });

    }


    /* =========================
       CLOSE
    ========================= */

    $("xearnWithdrawClose")
        ?.addEventListener(
            "click",
            closeWithdrawalModal
        );


    modal
        .querySelector(
            ".xearn-withdraw-overlay"
        )
        ?.addEventListener(
            "click",
            event => {

                if (
                    event.target.classList.contains(
                        "xearn-withdraw-overlay"
                    )
                ) {

                    closeWithdrawalModal();

                }

            }
        );


    /* =========================
       AMOUNT CALCULATION
    ========================= */

    $("xearnWithdrawAmount")
        ?.addEventListener(
            "input",
            updateWithdrawalPreview
        );


    /* =========================
       SUBMIT
    ========================= */

    $("xearnSubmitWithdrawal")
        ?.addEventListener(
            "click",
            submitWithdrawal
        );

}


/* =========================================================
   OPEN WITHDRAWAL
========================================================= */

function openWithdrawalModal() {

    createWithdrawalModal();

    const modal =
        $("xearnWithdrawalModal");

    if (!modal) {
        return;
    }

    modal.style.display = "block";


    updateWithdrawalBalance();


    const amount =
        $("xearnWithdrawAmount");

    const address =
        $("xearnWithdrawAddress");


    if (amount) {
        amount.value = "";
    }

    if (address) {
        address.value = "";
    }


    document
        .querySelectorAll(
            "#xearnWithdrawNetworkGrid .xearn-withdraw-network"
        )
        .forEach(item => {

            item.classList.remove(
                "selected"
            );

        });


    updateWithdrawalPreview();

}


/* =========================================================
   CLOSE WITHDRAWAL
========================================================= */

function closeWithdrawalModal() {

    const modal =
        $("xearnWithdrawalModal");

    if (modal) {

        modal.style.display =
            "none";

    }

}


/* =========================================================
   WITHDRAWAL BALANCE
========================================================= */

function updateWithdrawalBalance() {

    const balance =
        getBalanceXcoin();

    const usdt =
        getBalanceUsdt();


    setText(
        "withdrawBalanceXcoin",
        formatNumber(balance) +
        " XCOIN"
    );


    setText(
        "withdrawBalanceUsdt",
        "$" +
        usdt.toFixed(4)
    );

}


/* =========================================================
   WITHDRAWAL PREVIEW
========================================================= */

function updateWithdrawalPreview() {

    const amountInput =
        $("xearnWithdrawAmount");

    const amount =
        Number(
            amountInput?.value || 0
        );


    const fee =
        amount *
        WITHDRAWAL_FEE_RATE;


    const net =
        Math.max(
            0,
            amount - fee
        );


    setText(
        "withdrawSummaryRequested",
        "$" +
        amount.toFixed(2)
    );


    setText(
        "withdrawSummaryFee",
        "$" +
        fee.toFixed(2)
    );


    setText(
        "withdrawSummaryNet",
        "$" +
        net.toFixed(2)
    );

}


/* =========================================================
   SUBMIT WITHDRAWAL
========================================================= */
async function submitWithdrawal() {

    try {

        /* =========================================
           GET VALUES
        ========================================= */

        const amountInput =
            $("xearnWithdrawAmount");

        const addressInput =
            $("xearnWithdrawAddress");

        const amount =
            Number(
                amountInput?.value
            ) || 0;

        const address =
            addressInput?.value
                ?.trim() || "";


        /* =========================================
           SELECTED NETWORK
        ========================================= */

        const selectedNetwork =
            document.querySelector(
                "#xearnWithdrawNetworkGrid .xearn-withdraw-network.selected"
            );


        /* =========================================
           BASIC VALIDATION
        ========================================= */

        if (amount <= 0) {

            showToast(
                "Withdrawal",
                "Please enter a withdrawal amount."
            );

            return;
        }


        if (amount < MIN_WITHDRAW_USDT) {

            showToast(
                "Minimum withdrawal",
                "Minimum withdrawal is $10 USDT."
            );

            return;
        }


        if (!selectedNetwork) {

            showToast(
                "Select network",
                "Please select your withdrawal network."
            );

            return;
        }


        if (!address) {

            showToast(
                "Wallet required",
                "Please enter your withdrawal wallet address."
            );

            return;
        }


        /* =========================================
           CURRENT BALANCE
        ========================================= */

        const currentBalance =
            Number(
                currentUser?.balance_xcoin
            ) || 0;


        const requiredXcoin =
            amount *
            XCOIN_PER_USDT;


        if (
            currentBalance <
            requiredXcoin
        ) {

            showToast(
                "Insufficient balance",
                "You do not have enough XCOIN for this withdrawal."
            );

            return;
        }


        /* =========================================
           CALCULATE FEE
        ========================================= */

        const fee =
            amount *
            WITHDRAWAL_FEE_RATE;

        const net =
            amount -
            fee;


        /* =========================================
           NETWORK VALUE
        ========================================= */

        const withdrawalNetwork =
            selectedNetwork.dataset.asset +
            "-" +
            selectedNetwork.dataset.network;


        /* =========================================
           CONFIRMATION
        ========================================= */

        const confirmed =
            window.confirm(
                "Confirm withdrawal\\n\\n" +

                "Requested: $" +
                amount.toFixed(2) +
                "\\n" +

                "Fee (10%): $" +
                fee.toFixed(2) +
                "\\n" +

                "You receive: $" +
                net.toFixed(2) +
                "\\n\\n" +

                "Network: " +
                withdrawalNetwork +
                "\\n\\n" +

                "Submit this withdrawal request?"
            );


        if (!confirmed) {
            return;
        }


        /* =========================================
           DISABLE BUTTON
        ========================================= */

        const submitButton =
            $("xearnSubmitWithdrawal");

        if (submitButton) {

            submitButton.disabled = true;

            submitButton.textContent =
                "Submitting...";
        }


        /* =========================================
           SEND TO SUPABASE
        ========================================= */

        const result =
            await callFunction(
                "create-withdrawal",
                {
                    telegram_id:
                        Number(
                            telegramUser.id
                        ),

                    init_data:
                        tg?.initData || "",

                    amount_usdt:
                        amount,

                    network:
                        withdrawalNetwork,

                    address:
                        address
                }
            );


        /* =========================================
           CHECK RESPONSE
        ========================================= */

        if (
            !result ||
            !result.success
        ) {

            throw new Error(
                result?.error ||
                "Withdrawal could not be submitted."
            );
        }


        /* =========================================
           SUCCESS
        ========================================= */

        showToast(
            "Withdrawal submitted",
            "Your withdrawal request has been submitted successfully. You should receive your payout within 24–48 hours after approval."
        );


        /* =========================================
           REFRESH USER BALANCE
        ========================================= */

        await refreshUser();


        /* =========================================
           CLEAR FORM
        ========================================= */

        if (amountInput) {
            amountInput.value = "";
        }

        if (addressInput) {
            addressInput.value = "";
        }


        document
            .querySelectorAll(
                "#xearnWithdrawNetworkGrid .xearn-withdraw-network"
            )
            .forEach(
                button => {

                    button.classList.remove(
                        "selected"
                    );

                }
            );


        /* RESET SUMMARY */

        if ($("withdrawSummaryRequested")) {

            $("withdrawSummaryRequested")
                .textContent =
                "$0.00";
        }

        if ($("withdrawSummaryFee")) {

            $("withdrawSummaryFee")
                .textContent =
                "$0.00";
        }

        if ($("withdrawSummaryNet")) {

            $("withdrawSummaryNet")
                .textContent =
                "$0.00";
        }


        /* =========================================
           CLOSE MODAL AFTER SUCCESS
        ========================================= */

        setTimeout(
            () => {

                closeWithdrawalModal();

            },
            1800
        );


    } catch (error) {

        console.error(
            "Withdrawal error:",
            error
        );


        showToast(
            "Withdrawal failed",
            error?.message ||
            "Unable to submit your withdrawal. Please try again."
        );


    } finally {

        const submitButton =
            $("xearnSubmitWithdrawal");

        if (submitButton) {

            submitButton.disabled = false;

            submitButton.textContent =
                "Withdraw";
        }

    }

}
/* =========================================================
   HISTORY MODAL
   ========================================================= */

function createHistoryModal() {

    if ($("xearnHistoryModal")) {
        return;
    }

    injectWithdrawalStyles();

    const modal =
        document.createElement(
            "div"
        );

    modal.id =
        "xearnHistoryModal";

    modal.innerHTML = `

        <div class="xearn-history-overlay">

            <div class="xearn-history-box">

                <div class="xearn-history-header">

                    <div>
                        <div class="xearn-history-title">
                            Transaction History
                        </div>

                        <div class="xearn-history-subtitle">
                            Your recent earning and withdrawal activity.
                        </div>
                    </div>

                    <button
                        type="button"
                        id="xearnHistoryClose"
                        class="xearn-history-close"
                    >
                        ×
                    </button>

                </div>


                <div
                    id="xearnHistoryBody"
                    class="xearn-history-body"
                >
                    <div class="xearn-history-loading">
                        Loading history...
                    </div>
                </div>

            </div>

        </div>
    `;

    document.body.appendChild(
        modal
    );


    $("xearnHistoryClose")
        ?.addEventListener(
            "click",
            closeHistoryModal
        );


    modal
        .querySelector(
            ".xearn-history-overlay"
        )
        ?.addEventListener(
            "click",
            event => {

                if (
                    event.target.classList.contains(
                        "xearn-history-overlay"
                    )
                ) {

                    closeHistoryModal();
                }
            }
        );
}


/* =========================================================
   OPEN HISTORY
   ========================================================= */

async function openHistoryModal() {

    createHistoryModal();

    const modal =
        $("xearnHistoryModal");

    if (!modal) {
        return;
    }

    modal.style.display =
        "block";

    const body =
        $("xearnHistoryBody");

    if (body) {

        body.innerHTML =
            `
            <div class="xearn-history-loading">
                Loading history...
            </div>
            `;
    }

    await loadHistory();
}


/* =========================================================
   CLOSE HISTORY
   ========================================================= */

function closeHistoryModal() {

    const modal =
        $("xearnHistoryModal");

    if (modal) {

        modal.style.display =
            "none";
    }
}


/* =========================================================
   LOAD HISTORY
   ========================================================= */

async function loadHistory() {

    if (!telegramUser?.id) {

        renderHistoryMessage(
            "Open XEARN inside Telegram to view your history."
        );

        return;
    }

    try {

        const result =
            await callFunction(
                "get-history",
                {
                    telegram_id:
                        Number(
                            telegramUser.id
                        )
                }
            );


        console.log(
            "History response:",
            result
        );


        const transactions =
            Array.isArray(
                result?.transactions
            )
                ? result.transactions
                : [];


        const withdrawals =
            Array.isArray(
                result?.withdrawals
            )
                ? result.withdrawals
                : [];


        renderHistory(
            transactions,
            withdrawals
        );


    } catch (error) {

        console.error(
            "History error:",
            error
        );

        renderHistoryMessage(
            error?.message ||
            "Unable to load transaction history."
        );
    }
}


/* =========================================================
   RENDER HISTORY
   ========================================================= */

function renderHistory(
    transactions,
    withdrawals
) {

    const body =
        $("xearnHistoryBody");

    if (!body) {
        return;
    }


    const items = [];


    transactions.forEach(
        transaction => {

            items.push({
                kind:
                    "transaction",

                title:
                    transaction.type ||
                    "Earning",

                description:
                    transaction.description ||
                    "Account transaction",

                amount:
                    Number(
                        transaction.amount_xcoin ||
                        0
                    ),

                status:
                    "Completed",

                date:
                    transaction.created_at
            });
        }
    );


    withdrawals.forEach(
        withdrawal => {

            items.push({
                kind:
                    "withdrawal",

                title:
                    "Withdrawal",

                description:
                    (
                        withdrawal.network ||
                        ""
                    ) +
                    " • " +
                    (
                        withdrawal.address ||
                        ""
                    ),

                amount:
                    Number(
                        withdrawal.usdt_amount ||
                        0
                    ),

                status:
                    withdrawal.status ||
                    "Pending",

                date:
                    withdrawal.created_at
            });
        }
    );


    items.sort(
        (a, b) => {

            return (
                new Date(
                    b.date ||
                    0
                ).getTime()
            ) -
            (
                new Date(
                    a.date ||
                    0
                ).getTime()
            );
        }
    );


    if (!items.length) {

        body.innerHTML =
            `
            <div class="xearn-history-empty">
                No transactions yet.
            </div>
            `;

        return;
    }


    body.innerHTML =
        "";


    items.forEach(
        item => {

            const element =
                document.createElement(
                    "div"
                );

            element.className =
                "xearn-history-item";


            const formattedDate =
                item.date
                    ? new Date(
                        item.date
                    ).toLocaleString(
                        "en-US",
                        {
                            dateStyle:
                                "medium",
                            timeStyle:
                                "short"
                        }
                    )
                    : "";


            if (
                item.kind ===
                "withdrawal"
            ) {

                element.innerHTML =
                    `
                    <div class="xearn-history-top">

                        <div class="xearn-history-name">
                            Withdrawal
                        </div>

                        <div class="xearn-history-amount">
                            -$${Number(
                                item.amount || 0
                            ).toFixed(2)}
                        </div>

                    </div>

                    <div class="xearn-history-desc">
                        ${escapeHtml(
                            item.description
                        )}
                    </div>

                    <div class="xearn-history-status">
                        ${escapeHtml(
                            String(
                                item.status
                            )
                        )}
                    </div>

                    <div class="xearn-history-date">
                        ${escapeHtml(
                            formattedDate
                        )}
                    </div>
                    `;

            } else {

                element.innerHTML =
                    `
                    <div class="xearn-history-top">

                        <div class="xearn-history-name">
                            ${escapeHtml(
                                item.title
                            )}
                        </div>

                        <div class="xearn-history-amount">
                            +${formatNumber(
                                item.amount
                            )} XCOIN
                        </div>

                    </div>

                    <div class="xearn-history-desc">
                        ${escapeHtml(
                            item.description
                        )}
                    </div>

                    <div class="xearn-history-status">
                        Completed
                    </div>

                    <div class="xearn-history-date">
                        ${escapeHtml(
                            formattedDate
                        )}
                    </div>
                    `;
            }


            body.appendChild(
                element
            );
        }
    );
}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(value) {

    return String(
        value ??
        ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


/* =========================================================
   HISTORY MESSAGE
   ========================================================= */

function renderHistoryMessage(
    message
) {

    const body =
        $("xearnHistoryBody");

    if (!body) {
        return;
    }

    body.innerHTML =
        `
        <div class="xearn-history-empty">
            ${escapeHtml(message)}
        </div>
        `;
}


/* =========================================================
   UPGRADE MODAL
   ========================================================= */

function createUpgradeModal() {

    if ($("xearnUpgradeModal")) {
        return;
    }

    const modal =
        document.createElement(
            "div"
        );

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
        document.createElement(
            "style"
        );

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
   OPEN UPGRADE
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
        .forEach(
            button => {
                button.classList.remove(
                    "selected"
                );
            }
        );

    document
        .querySelectorAll(
            ".xearn-payment-option"
        )
        .forEach(
            button => {
                button.classList.remove(
                    "selected"
                );
            }
        );

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
   CLOSE UPGRADE
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
        .forEach(
            button => {

                button.classList.toggle(
                    "selected",
                    button.dataset.upgradeTier ===
                    tier
                );
            }
        );

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
        .forEach(
            button => {

                button.classList.toggle(
                    "selected",
                    button.dataset.paymentAsset ===
                    asset
                );
            }
        );

    renderPaymentNetworks(
        asset
    );
}


/* =========================================================
   RENDER PAYMENT NETWORKS
   ========================================================= */

function renderPaymentNetworks(
    asset
) {

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

function selectPaymentNetwork(
    network
) {

    if (!selectedPaymentAsset) {
        return;
    }

    const wallet =
        PAYMENT_METHODS[
            selectedPaymentAsset
        ]?.[
            network
        ];

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
        .forEach(
            button => {

                button.classList.toggle(
                    "selected",
                    button.dataset.network ===
                    network
                );
            }
        );

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
        .forEach(
            button => {

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
            }
        );


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
   $("taskItem")?.addEventListener("click", openTaskList);
$("earnTaskItem")?.addEventListener("click", openTaskList);

$("closeTaskModal")?.addEventListener("click", closeTaskList);

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
            openWithdrawalModal
        );

    $("withdrawAccountButton")
        ?.addEventListener(
            "click",
            openWithdrawalModal
        );


    /* HISTORY */

    $("historyButton")
        ?.addEventListener(
            "click",
            openHistoryModal
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

    createWithdrawalModal();

    createHistoryModal();

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
