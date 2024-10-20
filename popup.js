const h1 = document.querySelector("h1");
const statusTxt = document.getElementById("status");
const savedStatusTxt = document.getElementById("saved-status");
const divIntro = document.getElementById("intro");
const divMultiple = document.getElementById("download-multiple");
const divSingle = document.getElementById("download-single");
const btnEmlZip = document.getElementById("download-eml-zip");
const btnMboxZip = document.getElementById("download-mbox-zip");
const btnMbox = document.getElementById("download-mbox");
const btnCsvZip = document.getElementById("download-csv-zip");
const btnCsv = document.getElementById("download-csv");
const btnEml = document.getElementById("download-eml");
const btnSave = /** @type {HTMLButtonElement?} */(document.getElementById("save-page"));
const form = document.forms[0];
const fieldSet = document.querySelector("fieldset");

form.addEventListener("change", renderUI);

const cpInbox = 'https://www.crowdproperty.com/account/messaging';
const cpInboxSingle = /https:\/\/www.crowdproperty.com\/account\/messaging\/(\d+)/;
const fromAddr = "website@crowdproperty.com";

const SAVE_KEY = "cpe.savedMessages";

const state = {
    pageMessageCount: 0,
    savedMessageCount: 0,
    /** @type {Message[]} */
    savedMessages: [],
};

try {
    const savedMessageStorage = localStorage.getItem(SAVE_KEY);
    if (savedMessageStorage) {
        const messages = JSON.parse(savedMessageStorage);
        if (Array.isArray(messages)) {
            state.savedMessages = messages;
            state.savedMessageCount = messages.length;
            renderUI();
        }
    }
} catch (e) {}

function renderUI () {
    form.querySelectorAll("input[type=radio]").forEach(el => {
        if (el instanceof HTMLInputElement) {
            const label = el.parentElement;
            if (label && label.nodeName === "LABEL") {
                label.classList.toggle("checked", el.checked);
            }
        }
    });

    const formData = new FormData(form);
    const isDownloadPage = formData.get("message-list") === "page";

    if (fieldSet) {
        fieldSet.disabled = (isDownloadPage ? state.pageMessageCount : state.savedMessageCount) === 0;
    }

    if (savedStatusTxt) {
        savedStatusTxt.textContent = `${state.savedMessageCount} messages`;
    }
}

async function getCurrentTab() {
    let queryOptions = { active: true, lastFocusedWindow: true };
    // `tab` will either be a `tabs.Tab` instance or `undefined`.
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab;
}

/**
 * @typedef Message
 * @property {number} id
 * @property {string} subject
 * @property {Date} date
 * @property {string} content
 * @property {boolean} read
 */

/**
 * Executed in page context
 * @returns {number}
 */
function countMessages () {
    const messages = document.querySelectorAll(".p-4");

    return messages.length;
}

/**
 * Executed in page context
 * @returns {Message[]}
 */
function getMessages () {
    const cpInbox = 'https://www.crowdproperty.com/account/messaging';
    const timeDelta = new Date().getTimezoneOffset() * 60 * 1000;

    /** @type {Message[]} */
    const messages = [];

    for (const el of document.querySelectorAll(".p-4")) {
        const id = +(el.querySelector("a")?.href.substring(cpInbox.length + 1) || NaN);
        const subjectEl = el.querySelector("strong");
        const subject = subjectEl?.textContent || "";
        const content = subjectEl?.nextSibling?.textContent?.substring(3) || "";
        // Expected date format: '14-Jun-23 09:13'
        const dateText = el.querySelector(".text-right strong")?.textContent || "";

        const dateTextHour = dateText.split(" ")[1].split(":")[0];

        // Time will be Europe/London.
        // (We'll  treat it as UTC - which is wrong half the year)
        let date = new Date(+new Date(dateText) - timeDelta);

        // Then check to see if it needs adjustment by generating the would-be
        // date in the correct time zone.
        const parsedHour = Intl.DateTimeFormat(void 0, { hour: "2-digit", timeZone: "Europe/London" }).format(date);
        if (parsedHour != dateTextHour) {
            // If they don't match then it means Europe/London was in Summer
            // time (and not UTC). Therefore the time in UTC was actually one
            // hour later.
            date = new Date(+date - 60 * 60 * 1000);
        }

        const read = !el.classList.contains("lightgrey-bg");

        messages.push({
            id,
            subject,
            date,
            // date: date.toISOString(),
            content,
            read,
        });
    }

    return messages;
}

/**
 * Executed in page context
 * @returns {Message?}
 */
function getSingleMessage () {
    debugger;
    const cpInboxSingle = /https:\/\/www.crowdproperty.com\/account\/messaging\/(\d+)/;

    const match = cpInboxSingle.exec(window.location.toString());

    if (match) {
        const id = +match[1];
        const subject = document.getElementsByClassName("section-title")[1].textContent || "";
        /** @type {HTMLElement?} */
        const btnEl = document.querySelector(".btn-no-style");
        const containerEl = btnEl?.parentElement;
        const dateTitleText = btnEl?.dataset['originalTitle'] || "";
        // Expected format: '<h4>14/06/2023 08:11:46</h4>'
        const dateMatch = /<h4>([^<]+)<\/h4>/.exec(dateTitleText);
        const d = dateMatch ? dateMatch[1] : "";
        const h = d.substring(0, 2);
        let date = new Date(`${d.substring(6, 10)}-${d.substring(3, 5)}-${h}T${d.substring(11)}Z`);
        // Check to see if we need to adjust the date for Europe/London Summer time.
        const parsedHour = Intl.DateTimeFormat(void 0, { hour: "2-digit", timeZone: "Europe/London" }).format(date);
        if (h != parsedHour) {
            date = new Date(+date - 60 * 60 * 1000);
        }

        btnEl?.remove();
        const content = containerEl?.textContent?.trim() || "";
        btnEl && containerEl?.prepend(btnEl);

        return {
            id,
            subject,
            date,
            // date: date.toISOString(),
            content,
            read: true,
        };
    }

    throw new Error("Not a message page");
}

divMultiple && (divMultiple.style.display = "none");
divSingle && (divSingle.style.display = "none");

getCurrentTab().then(tab => {
    if (!tab) return;

    if (cpInboxSingle.test(tab.url || "")) {
        divIntro && (divIntro.style.display = "none");
        divSingle && (divSingle.style.display = "");

        btnEml && btnEml.addEventListener("click", () => {
            if (tab.id) {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: getSingleMessage
                })
                .then(results => {
                    for (const { result: message } of results) {
                        if (message) {
                            const blob = new Blob([makeMessage(message)]);

                            downloadFile(`message-${message.id}.eml`, blob);
                        }
                        else {
                            divIntro && (divIntro.style.display = "");
                            divSingle && (divSingle.style.display = "none");
                            if (divIntro?.firstElementChild) {
                                divIntro.firstElementChild.textContent = "Error getting message";
                            }
                        }
                    }
                });
            }
        });
    }
    else if (tab.url?.startsWith(cpInbox)) {
        divIntro && (divIntro.style.display = "none");

        if (tab.id) {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: countMessages
            })
            .then(results => {
                for (const { result } of results) {
                    state.pageMessageCount = result;
                    statusTxt && (statusTxt.textContent = `${result} messages`);
                    if (result > 0) {
                        divMultiple && (divMultiple.style.display = "");
                    }
                    renderUI();
                }
            });

            [
                btnEmlZip,
                btnMbox,
                btnMboxZip,
                btnCsv,
                btnCsvZip
            ].forEach(btn => {
                btn && btn.addEventListener("click", e => {
                    e.preventDefault();

                    const format = (btn === btnEmlZip ? "eml" : ((btn === btnCsv || btn === btnCsvZip) ? "csv" : "mbox"));
                    const zipped = [btnCsvZip, btnEmlZip, btnMboxZip].includes(btn);

                    const formData = new FormData(form);
                    const isDownloadPage = formData.get("message-list") === "page";

                    if (isDownloadPage && tab.id) {
                        chrome.scripting.executeScript({
                            target: { tabId: tab.id },
                            func: getMessages
                        })
                        .then(results => {
                            if (results[0]) {
                                /** @type {Message[]} */
                                const messages = results[0].result;
                                downloadMessages(messages, format, zipped);
                            }
                        });
                    }
                    else {
                        downloadMessages(state.savedMessages, format, zipped);
                    }
                });
            });

            if (btnSave){
                btnSave.disabled = false;
                btnSave.addEventListener("click", e => {
                    e.preventDefault();

                    if (tab.id) {
                        chrome.scripting.executeScript({
                            target: { tabId: tab.id },
                            func: getMessages
                        })
                        .then(results => {
                            if (results[0]) {
                                /** @type {Message[]} */
                                const messages = results[0].result;

                                const map = {};

                                for (const message of state.savedMessages) {
                                    map[message.id] = message;
                                }

                                // Update duplicates
                                for (const message of messages) {
                                    map[message.id] = message;
                                }

                                state.savedMessages = Object.values(map);

                                state.savedMessageCount = state.savedMessages.length;

                                localStorage.setItem(SAVE_KEY, JSON.stringify(state.savedMessages));

                                renderUI();
                            }
                        });
                    }

                });
            }
        }
    }
});



/**
 * @param {Message[]} messages
 * @param {string} format
 * @param {boolean} zipped
 */
function downloadMessages(messages, format, zipped) {

    if (format === "eml") {
        // @ts-ignore
        const zip = new JSZip();

        for (const message of messages) {
            zip.file(`message-${message.id}.eml`, makeMessage(message));
        }

        zip.generateAsync({ type: "blob" })
            .then(blob => {
                downloadFile("emails.zip", blob);
            });
    }
    else if (format === "csv") {
        const csv = makeCsv(messages);

        if (zipped) {
            // @ts-ignore
            const zip = new JSZip();

            zip.file(`emails.csv`, csv);

            zip.generateAsync({ type: "blob" })
                .then(blob => {
                    downloadFile("emails.zip", blob);
                });
        }
        else {
            const blob = new Blob([csv]);
            downloadFile("emails.csv", blob);
        }
    }
    else {
        const mboxList = [];

        for (const message of messages) {
            const thread = getThread(message, messages);

            mboxList.push(`From ${fromAddr} ${asctime(new Date(message.date))}\n${makeMessage(message, thread)}`);
        }

        const mbox = mboxList.join("\n\n");

        if (zipped) {
            // @ts-ignore
            const zip = new JSZip();

            zip.file(`emails.mbox`, mbox);

            zip.generateAsync({ type: "blob" })
                .then(blob => {
                    downloadFile("emails.zip", blob);
                });
        }
        else {
            const blob = new Blob([mbox]);
            downloadFile("emails.mbox", blob);
        }
    }
}

/**
 * @param {Message} message
 * @param {Message[]} messages
 */
function getThread (message, messages) {
    let project;
    if (message.subject.startsWith("Project Update - ")) {
        project = message.subject.substring(17);
    }
    else if (message.subject.startsWith("Project Repayment - ")) {
        project = message.subject.substring(20);
    }
    else if (message.subject.startsWith("Partial Repayment - ")) {
        project = message.subject.substring(20);
    }

    if (project) {
        const msgs = messages
            .filter(m => m.subject.includes(project))
            .filter(m => m.date < message.date);

        return msgs.sort((a, b) => +a.date - +b.date);
        // return msgs.sort((a, b) => a.date.localeCompare(b.date));
    }

    return [];
}

function getMessageID (message) {
    return `<message-${message.id}@crowdproperty.com>`;
}

/**
 * @param {Message} message
 * @param {Message[]} [thread]
 */
function makeMessage (message, thread) {
    const subject = message.subject.replace(/\n/g, "");

    let threadHeaders = "";
    if (thread && thread.length > 0) {
        threadHeaders += `References: ${thread.map(m => getMessageID(m)).join(" ")}\n`;
        threadHeaders += `In-Reply-To: ${getMessageID(thread[thread.length - 1])}\n`;
    }

    return `MIME-Version: 1.0
Date: ${rfc2822UTC(new Date(message.date))}
From: CrowdProperty <${fromAddr}>
Message-ID: ${getMessageID(message)}
Subject: ${subject}
Thread-Topic: ${subject}
${threadHeaders}X-Mozilla-Status: ${message.read?"0001":"0000"}
Content-Transfer-Encoding: quoted-printable
Content-Type: text/html; charset="utf-8"

<html>
<head>
<body>
${message.content.split("\n").map(l => `<p>${l}</p>`).join("\n")}
</body>
</html>
`;
}

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/**
 * @param {Date} date
 */
function rfc2822 (date) {
    const offset = -date.getTimezoneOffset();
    const offsetSign = offset < 0 ? "-" : "+";
    const offsetAbs = Math.abs(offset);
    const offsetHours = Math.floor(offsetAbs / 60);
    const offsetMinutes = offsetAbs % 60;
    return `${DAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())} ${offsetSign}${pad2(offsetHours)}:${pad2(offsetMinutes)}`;
}
/**
 * @param {Date} date
 */
function rfc2822UTC (date) {
    return `${DAYS[date.getUTCDay()]}, ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()} ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(date.getUTCSeconds())} +00:00`;
}

/**
 * @param {Date} date
 */
function asctime (date) {
    return `${DAYS[date.getDay()]} ${MONTHS[date.getMonth()]} ${date.getDate().toString().padStart(2, "0")} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())} ${date.getFullYear()}`;
}

/**
 * @param {Date} date
 */
function asctimeUTC (date) {
    return `${DAYS[date.getUTCDay()]} ${MONTHS[date.getUTCMonth()]} ${date.getUTCDate().toString().padStart(2, "0")} ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(date.getUTCSeconds())} ${date.getUTCFullYear()}`;
}

/**
 * @param {number} n
 */
function pad2 (n) {
    return n.toString().padStart(2, "0");
}

/**
 * @param {string} filename
 * @param {string|Blob} content
 */
function downloadFile (filename, content) {
    const a = document.createElement("a");
    a.download = filename;
    const blob = new Blob([content]);
    const url = URL.createObjectURL(blob);
    a.href = url;
    document.body.append(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Note: Outlook may want BOM
 * Note: No date information
 * @param {Message[]} messages
 */
function makeCsv (messages) {
    // "Subject","Body","From: (Name)","From: (Address)","From: (Type)","To: (Name)","To: (Address)","To: (Type)","CC: (Name)","CC: (Address)","CC: (Type)","BCC: (Name)","BCC: (Address)","BCC: (Type)","Billing Information","Categories","Importance","Mileage","Sensitivity"
    const header = `"Subject","Body","From: (Name)","From: (Address)","From: (Type)","To: (Name)","To: (Address)","To: (Type)"`;

    const lines = [ header, ...messages.map(m => {
        const fields = [
            m.subject.trim(),
            m.content.trim(),
            "CrowdProperty",
            fromAddr,
            "SMTP",
            "",
            "",
            ""
        ];

        const escapedFields = fields
            .map(f => f.replace(/\n/g, `\t \r\n`))
            .map(f => f.replace(/"/g, `""`))
            .map(f => f.length ? `"${f}"` : "");

        return escapedFields.join(",");
    })];

    const BOM = `\ufeff`;

    return BOM + lines.join("\r\n");
}