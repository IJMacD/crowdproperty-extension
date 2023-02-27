const messages = document.querySelectorAll(".p-4");

console.log(`${messages.length} messages`);

// `document.querySelector` may return null if the selector doesn't match anything.
// if (messages.length) {