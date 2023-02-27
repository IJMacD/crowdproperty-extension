const h1 = document.querySelector("h1");
const divIntro = document.getElementById("intro");
const divMultiple = document.getElementById("download-multiple");
const divSingle = document.getElementById("download-single");
const btnEmlZip = document.getElementById("download-eml-zip");
const btnMboxZip = document.getElementById("download-mbox-zip");
const btnMbox = document.getElementById("download-mbox");
const btnEml = document.getElementById("download-eml");

const cpInbox = 'https://www.crowdproperty.com/account/messaging';
const cpInboxSingle = /https:\/\/www.crowdproperty.com\/account\/messaging\/(\d+)/;
const fromAddr = "website@crowdproperty.com";

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
 * @property {string} date  ISO 8601
 * @property {string} content
 */

/**
 * Executed in page context
 * @returns {number}
 */
function countMessages () {
    const messages = document.querySelectorAll(".p-4");

    console.log(`${messages.length} messages`);

    return messages.length;
}

/**
 * Executed in page context
 * @returns {Message[]}
 */
function getMessages () {
    const cpInbox = 'https://www.crowdproperty.com/account/messaging';
    const timeDelta = 8 * 60 * 60 * 1000;

    /** @type {Message[]} */
    const messages = [];

    for (const el of document.querySelectorAll(".p-4")) {
        const id = +(el.querySelector("a")?.href.substring(cpInbox.length + 1) || NaN);
        const subjectEl = el.querySelector("strong");
        const subject = subjectEl?.textContent || "";
        const content = subjectEl?.nextSibling?.textContent?.substring(3) || "";
        const dateText = el.querySelector(".text-right strong")?.textContent || "";
        const date = new Date(+new Date(dateText) + timeDelta).toISOString();

        messages.push({
            id,
            subject,
            date,
            content,
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
    const timeDelta = 8 * 60 * 60 * 1000;

    const match = cpInboxSingle.exec(window.location.toString());

    if (match) {
        const id = +match[1];
        const subject = document.getElementsByClassName("section-title")[1].textContent || "";
        const btnEl = document.querySelector(".btn-no-style");
        const containerEl = btnEl?.parentElement;
        const dateTitleText = btnEl?.dataset['originalTitle'] || "";
        const dateMatch = /<h4>([^<]+)<\/h4>/.exec(dateTitleText);
        const d = dateMatch ? dateMatch[1] : "";
        const date = `${d.substring(6, 10)}-${d.substring(3, 5)}-${d.substring(0,2)}T${d.substring(11)}Z`;

        btnEl?.remove();
        const content = containerEl?.textContent?.trim() || "";
        btnEl && containerEl?.prepend(btnEl);

        return {
            id,
            subject,
            date,
            content,
        };
    }

    throw new Error("Not a message page");
}

divMultiple && (divMultiple.style.display = "none");
divSingle && (divSingle.style.display = "none");

getCurrentTab().then(tab => {
    if (cpInboxSingle.test(tab.url || "")) {
        divIntro && (divIntro.style.display = "none");
        divSingle && (divSingle.style.display = "");

        btnEml && btnEml.addEventListener("click", () => {
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
                        divIntro.firstElementChild.textContent = "Error getting message";
                    }
                }
            });

        });
    }
    else if (tab.url?.startsWith(cpInbox)) {
        divIntro && (divIntro.style.display = "none");

        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: countMessages
        })
        .then(results => {
            for (const { result } of results) {
                h1 && (h1.textContent = `${result} messages`);
                if (result > 0) {
                    divMultiple && (divMultiple.style.display = "");
                }
            }
        });

        [btnEmlZip, btnMbox, btnMboxZip].forEach(btn => {
            btn.addEventListener("click", () => {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: getMessages
                })
                .then(results => {
                    for (const { result } of results) {
                        console.log(result);

                        if (btn === btnEmlZip) {
                            const zip = new JSZip();

                            for (const message of result) {
                                zip.file(`message-${message.id}.eml`, makeMessage(message));
                            }

                            zip.generateAsync({ type: "blob" })
                            .then(blob => {
                                downloadFile("emails.zip", blob);
                            });
                        }
                        else  {
                            const mboxList = [];

                            for (const message of result) {
                                mboxList.push(`From ${fromAddr} ${asctime(new Date(message.date))}\n${makeMessage(message)}`);
                            }

                            const mbox = mboxList.join("\n\n");

                            if (btn === btnMboxZip) {
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
                });

            });
        });
    }
});


/**
 * @param {{ id: number, subject: string, date: string, content: string}} message
 */
function makeMessage (message) {
    return `MIME-Version: 1.0
Date: ${rfc2822UTC(new Date(message.date))}
From: CrowdProperty <${fromAddr}>
Message-ID: <message-${message.id}@crowdproperty.com>
Subject: ${message.subject}
Thread-Topic: ${message.subject}
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