(() => {
  const form = document.getElementById("inquiry-form");
  if (!form) return;

  const TO = "inquiries@ilmrr.com";
  const TYPES = {
    partnership: "Partnership",
    enterprise: "Enterprise",
    research: "Research collaboration"
  };
  const NAME = /^[\p{L}\p{M}][\p{L}\p{M} .'\-]{1,79}$/u;
  const ORG = /^[\p{L}\p{M}0-9][\p{L}\p{M}0-9 .,&'()\-]{1,119}$/u;
  const EMAIL = /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,253}\.[A-Za-z]{2,24}$/;
  const COOLDOWN_MS = 12000;
  const openedAt = performance.now();
  let lockedUntil = 0;

  const status = document.getElementById("form-status");
  const count = document.getElementById("char-count");
  const message = document.getElementById("message");
  const submit = document.getElementById("inquiry-submit");
  const copy = document.getElementById("inquiry-copy");

  const fields = {
    name: document.getElementById("name"),
    organization: document.getElementById("organization"),
    email: document.getElementById("email"),
    message
  };

  const errors = {
    name: document.getElementById("name-error"),
    organization: document.getElementById("organization-error"),
    email: document.getElementById("email-error"),
    type: document.getElementById("type-error"),
    message: document.getElementById("message-error")
  };

  function singleLine(value) {
    return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
  }

  function cleanMessage(value) {
    return value.replace(/\r\n/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  }

  function setError(key, text) {
    const node = errors[key];
    if (!node) return;
    node.textContent = text;
    const input = fields[key];
    if (input) input.setAttribute("aria-invalid", text ? "true" : "false");
    if (key === "type") {
      form.querySelectorAll("input[name='inquiry_type']").forEach((radio) => {
        radio.setAttribute("aria-invalid", text ? "true" : "false");
      });
    }
  }

  function clearErrors() {
    Object.keys(errors).forEach((key) => setError(key, ""));
  }

  function setStatus(text, kind) {
    if (!status) return;
    status.textContent = text;
    status.classList.remove("is-ok", "is-err");
    if (kind) status.classList.add(kind);
  }

  function selectedType() {
    const chosen = form.querySelector("input[name='inquiry_type']:checked");
    return chosen ? chosen.value : "";
  }

  function readInquiry() {
    clearErrors();
    const name = singleLine(fields.name.value);
    const organization = singleLine(fields.organization.value);
    const email = singleLine(fields.email.value);
    const type = selectedType();
    const body = cleanMessage(fields.message.value);
    let ok = true;
    let focus = null;

    if (!NAME.test(name)) {
      setError("name", "Enter your name using letters, spaces, apostrophes, periods, or hyphens.");
      ok = false;
      focus = focus || fields.name;
    }
    if (organization && !ORG.test(organization)) {
      setError("organization", "Use letters, numbers, and basic punctuation for the organization.");
      ok = false;
      focus = focus || fields.organization;
    }
    if (email.length > 254 || !EMAIL.test(email) || email.includes("..")) {
      setError("email", "Enter a valid email address.");
      ok = false;
      focus = focus || fields.email;
    }
    if (!Object.prototype.hasOwnProperty.call(TYPES, type)) {
      setError("type", "Choose partnership, enterprise, or research.");
      ok = false;
    }
    const lineBreaks = (body.match(/\n/g) || []).length;
    if (body.length < 20 || body.length > 1500 || lineBreaks > 40) {
      setError("message", "Write between 20 and 1,500 characters.");
      ok = false;
      focus = focus || fields.message;
    }
    if (!ok && focus) focus.focus();
    if (!ok) return null;

    const lines = [
      "Inquiry type: " + TYPES[type],
      "Name: " + name,
      organization ? "Organization: " + organization : "",
      "Email: " + email,
      "",
      body
    ].filter((line, index, all) => line !== "" || all[index - 1] !== "");

    return {
      type,
      text: lines.join("\n")
    };
  }

  function trapOrCooldown() {
    const honeypot = document.getElementById("company-url");
    const tooFast = performance.now() - openedAt < 1200;
    if (honeypot && honeypot.value.trim() !== "" && tooFast) return "trap";
    if (Date.now() < lockedUntil) return "wait";
    return "";
  }

  function lock() {
    lockedUntil = Date.now() + COOLDOWN_MS;
    if (submit) submit.disabled = true;
    if (copy) copy.disabled = true;
    window.setTimeout(() => {
      if (submit) submit.disabled = false;
      if (copy) copy.disabled = false;
    }, COOLDOWN_MS);
  }

  function updateCount() {
    if (!count || !message) return;
    const length = cleanMessage(message.value).length;
    count.textContent = length + " / 1500";
  }

  if (message) message.addEventListener("input", updateCount);
  updateCount();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const gate = trapOrCooldown();
    if (gate === "trap") {
      setStatus("Your email app should open with this inquiry. This website does not store the message.", "is-ok");
      form.reset();
      updateCount();
      return;
    }
    if (gate === "wait") {
      setStatus("Please wait a few seconds before another inquiry.", "is-err");
      return;
    }
    const inquiry = readInquiry();
    if (!inquiry) {
      setStatus("Check the highlighted fields.", "is-err");
      return;
    }
    const subject = "ilmrr inquiry — " + TYPES[inquiry.type];
    const href = "mailto:" + TO + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(inquiry.text);
    if (href.length > 1900) {
      setStatus("That message is too long to open in an email app. Shorten it and try again.", "is-err");
      return;
    }
    const link = document.createElement("a");
    link.href = href;
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();
    lock();
    setStatus("Your email app should open with this inquiry. This website does not store the message.", "is-ok");
  });

  if (copy) {
    copy.addEventListener("click", async () => {
      const gate = trapOrCooldown();
      if (gate === "wait") {
        setStatus("Please wait a few seconds before another inquiry.", "is-err");
        return;
      }
      if (gate === "trap") {
        setStatus("Inquiry copied. This website does not store the message.", "is-ok");
        return;
      }
      const inquiry = readInquiry();
      if (!inquiry) {
        setStatus("Check the highlighted fields.", "is-err");
        return;
      }
      try {
        await navigator.clipboard.writeText(inquiry.text);
        lock();
        setStatus("Inquiry copied. This website does not store the message.", "is-ok");
      } catch (error) {
        setStatus("Clipboard is unavailable. Email inquiries@ilmrr.com from your own mail app.", "is-err");
      }
    });
  }
})();
