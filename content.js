const s = document.createElement("script");
s.src = chrome.runtime.getURL("content-inline.js");
document.documentElement.appendChild(s);