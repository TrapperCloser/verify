const elements = {
  codeInput: document.querySelector("#codeInput"),
  unverifyButton: document.querySelector("#unverifyButton"),
  verifyStatus: document.querySelector("#verifyStatus"),
  verifyCode: document.querySelector("#verifyCode"),
  verified: document.querySelector("#verified"),
  verifiedCount: document.querySelector("#verifiedCount"),
  usernameInput: document.querySelector("#usernameInput"),
  usernameSection: document.querySelector("#usernameSection"),
  chatInput: document.querySelector("#chatInput"),
  chatMessages: document.querySelector("#chatMessages"),
  sendChat: document.querySelector("#sendChat"),
  uploadChat: document.querySelector("#uploadChat"),
  serverStatus: document.querySelector("#serverStatus"),
  navDatabase: document.querySelector("#navDatabase"),
  database: document.querySelector("#database"),
  newNameInput: document.querySelector("#newNameInput"),
  newRankInput: document.querySelector("#newRankInput"),
  newCodeInput: document.querySelector("#newCodeInput"),
  newCodeButton: document.querySelector("#newCodeButton"),
  themeSelect: document.querySelector("#themeSelect"),
  themeCustomColor: document.querySelector("#themeCustomColor"),
  currentReply: document.querySelector("#currentReply"),
  cancelReply: document.querySelector("#cancelReply"),
  replySection: document.querySelector("#replySection"),
  muteGuestsToggle: document.querySelector("#muteGuestsToggle"),
  jumpToggle: document.querySelector("#jumpToggle"),
  descriptionInput: document.querySelector("#descriptionInput"),
  infoPopup: document.querySelector("#infoPopup"),
  moderationUsers: document.querySelector("#moderationUsers"),
  muteTime: document.querySelector("#muteTime"),
  muteSubmit: document.querySelector("#muteSubmit"),
  bcText: document.querySelector("#bcText"),
  bcSubmit: document.querySelector("#bcSubmit"),
  muteGuestsSubmit: document.querySelector("#muteGuestsSubmit"),
  suggestionInput: document.querySelector("#suggestionInput"),
  suggestionSubmit: document.querySelector("#suggestionSubmit"),
  chatColor: document.querySelector("#chatColor"),
  chatColorLabel: document.querySelector("#chatColorLabel"),
  pfpInput: document.querySelector("#pfpInput"),
  navStaff: document.querySelector("#navStaff"),
  pfpPreview: document.querySelector("#pfpPreview"),
  pfpPreviewContainer: document.querySelector("#pfpPreviewContainer"),
  clearChatButton: document.querySelector("#clearChatButton"),
  darkModeToggle: document.querySelector("#darkModeToggle"),
  reducedMotionToggle: document.querySelector("#reducedMotionToggle"),
  compactModeToggle: document.querySelector("#compactModeToggle")
};

const emotes = {
  "angie": "https://files.catbox.moe/7y622k.webp",
  "button": "https://gifdb.com/images/high/ralsei-deltarune-cute-hands-excited-cant-wait-l9jky4nrslpbnh1w.webp",
  "cat": "https://media.tenor.com/xwBDjTSFmkIAAAAj/komaru-cat.gif",
  "spin": "https://partykit.fibonnaci314.partykit.dev/spin.gif",
};

const chatHelp = `<b>Chat Commands</b><br>
Commands can only be used by verified users.<br>
/neo and /dm require arguments. Type just the command to see how to use them.<br>
<i>This menu disables jump-to-bottom. To continue using the chat, re-enable this option.</i><br><br>
<b>Public Commands</b><br>
/neo - change your current neo/special chat color<br>
/rlq - get your current rate limit info<br>
/dm - send a direct message to someone<br>
/roll - rolls a dice with the given sides.<br><br>
<b>Managers Only</b><br>
/restart - restart the server
<br>
`;

let infoTimeout = null;
let partySocket;
let expectBinary = false;
let binaryHeader = null;
let connectionId = null;
let savedCode = localStorage.getItem("arrasVerifyCode");
let chatReply = null;
let muteGuests = false;
let jump = true;
let fontSize = parseInt(localStorage.getItem("arrasVerifyFontSize") ?? 16);
let allUsers = [];
let userlistSorting = 0;
let selectedUser = null;
let currentUserRank = null;
let currentUserName = null;
let currentUserId = null;
let currentVerifiedUsers = [];

let darkMode = localStorage.getItem("arrasVerifyDarkMode") === "true";
let reducedMotion = localStorage.getItem("arrasVerifyReducedMotion") === "true";
let compactMode = localStorage.getItem("arrasVerifyCompactMode") === "true";

elements.chatColor.value = parseInt(localStorage.getItem("arrasVerifyChatColor") ?? (Math.floor(Math.random() * 360)));
//accesibility stuff
if (darkMode) {
  elements.darkModeToggle.checked = true;
  document.documentElement.classList.add("dark-theme");
}
if (reducedMotion) {
  elements.reducedMotionToggle.checked = true;
  document.documentElement.classList.add("reduced-motion");
}
if (compactMode) {
  elements.compactModeToggle.checked = true;
  document.documentElement.classList.add("compact-mode");
}

function parseTime(ms) {
  if (ms < 1000) return ms + " milliseconds";
  if (ms < 60000) return Math.floor(ms / 1000) + " seconds";
  if (ms < 3600000) return Math.floor(ms / 60000) + " minutes";
  return (ms / 3600000).toFixed(1) + " hours";
}

async function verifyCode() {
  if (!partySocket) return;
  const code = elements.codeInput.value;
  elements.codeInput.value = "";
  elements.verifyStatus.innerText = "Verifying...";
  partySocket.send(JSON.stringify(["C", code]));
  savedCode = code;
  localStorage.setItem("arrasVerifyCode", code);
}

function checkIfEnterKey(callback) {
  return (event) => {
    if (event.key === "Enter") {
      callback();
    }
  }
}

function navTab(location) {
  return () => {
    document.querySelectorAll("section").forEach((element) => {
      element.className = "hidden";
    });
    document.querySelector("#" + location + "Section").className = "";
    [...document.querySelector("nav").children].forEach((child) => {
      child.disabled = false;
      if (child.id.slice(3).toLowerCase() === location) {
        child.disabled = true;
      }
    })
  };
}

function changeFontSize(event) {
  const element = event.target;
  const change = parseInt(element.dataset.change);
  fontSize += change;
  fontSize = Math.max(12, fontSize);
  fontSize = Math.min(21, fontSize);
  document.querySelector("#fontSize").innerText = fontSize;
  const styleRule = document.styleSheets[0].cssRules[0].style;
  styleRule.setProperty("--custom-font-size", fontSize + "px");
  [...document.querySelectorAll(".fontSizeButton")].forEach((element) => {
    const change = parseInt(element.dataset.change);
    element.disabled = false;
    if (change > 0 && fontSize === 21) element.disabled = true;
    if (change < 0 && fontSize === 12) element.disabled = true;
  });
  localStorage.setItem("arrasVerifyFontSize", fontSize);
}
changeFontSize({ target: { dataset: { change: 0 } } })

function handleCodePacket(valid, rank, name, description, pfp) {
  if (!valid) {
    elements.verifyStatus.innerText = "Invalid code. Please try again.";
    return;
  }
  currentUserRank = rank;
  currentUserName = name;
  elements.verifyStatus.innerText = "You are verified as a " + rank + ".";
  elements.descriptionInput.hidden = false;
  elements.unverifyButton.hidden = false;
  elements.pfpInput.hidden = false;
  
  if (pfp && pfp.length > 0) {
    elements.pfpPreview.src = pfp;
    elements.pfpPreviewContainer.classList.remove("hidden");
  } else {
    elements.pfpPreviewContainer.classList.add("hidden");
  }
  
  partySocket.send(JSON.stringify(["D"]));
  if (rank === "developer") {
    document.querySelector("#navDeveloper").className = "";
    partySocket.send(JSON.stringify(["S"]));
  }
  if (rank === "developer" || rank === "manager" || rank === "trial" || rank === "director") {
    elements.navStaff.classList.remove("hidden");
  }
  document.querySelector("#navSuggestions").className = "";
  document.querySelector("#navSpecial").className = "";
  elements.usernameInput.value = name;
  elements.usernameSection.className = "hidden";
  elements.muteGuestsToggle.disabled = false;
  document.querySelector("#verificationInputs").hidden = true;
  updateUsername();
}

function handleVerifiedPacket(...data) {
  currentVerifiedUsers = [];
  let html = "";
  for (let index = 0; index < data.length; index += 5) {
    currentVerifiedUsers.push({
      name: data[index],
      rank: data[index + 1],
      id: data[index + 2],
      joinTime: data[index + 3],
      trust: data[index + 4]
    });
    html += `
      <tr>
        <td id="verifyName${index / 5}" style="cursor: pointer;">${data[index]} <span class="verifyId">(${data[index + 2]})</span></td>
        <td>${data[index + 1][0].toUpperCase() + data[index + 1].slice(1)}</td>
        <td>${new Date(data[index + 3]).toLocaleTimeString()}</td>
        <td>${data[index + 4].toFixed(3)} / 10.000</td>
      </tr>
    `;
  }
  elements.verified.innerHTML = html;
  elements.verifiedCount.innerText = (data.length / 5) + " users are currently verified.";
  for (let i = 0; i < data.length / 5; i ++) {
    document.querySelector("#verifyName" + i).addEventListener("click", async () => {
      partySocket.send(JSON.stringify(["b", data[i * 5 + 2]]));
      document.querySelector("#descriptionOverlay").hidden = false;
      await new Promise(requestAnimationFrame);
      document.querySelector("#descriptionDarken").className = "";
      document.querySelector("#descriptionContainer").className = "";
      document.querySelector("#descriptionUsername").innerText = data[i * 5];
      // Set rank from verified users data
      const rankSpan = document.querySelector("#descriptionRank");
      if (rankSpan) {
        rankSpan.innerText = data[i * 5 + 1][0].toUpperCase() + data[i * 5 + 1].slice(1);
      }
      document.querySelector("#descriptionText").innerHTML = "Loading...";
    });
  }
}

function handleClose() {
  elements.usernameInput.disabled = false;
  elements.usernameSection.className = "";
  elements.sendChat.disabled = true;
  elements.uploadChat.disabled = true;
  elements.chatInput.disabled = true;
  elements.muteGuestsToggle.disabled = true;
  elements.descriptionInput.hidden = true;
  elements.unverifyButton.hidden = true;
  elements.pfpInput.hidden = true;
  elements.pfpPreviewContainer.classList.add("hidden");
  elements.verifyStatus.innerText = "You have disconnected from the server.";
  document.querySelector("#verificationInputs").hidden = true;
  document.querySelector('label[for="uploadChat"]').className = "disabled";
  connectToParty();
}

function displayDatabase(lines) {
  console.log(JSON.stringify(lines));
  if (!lines.length) {
    return;
  }
  elements.navDatabase.className = "";
  elements.database.innerHTML = lines.map((line, index) => {
    return "<tr>" + line.map((part) => {
      return `<td>${part}</td>`
    }).join("") + `<td><button id="deleteCode${index}">Delete</button></td>` + "</tr>";
  }).join("");
  for (let i = 0; i < lines.length; i ++) {
    const button = document.querySelector("#deleteCode" + i);
    if (!button) {
      continue;
    }
    button.addEventListener("click", () => {
      if (!partySocket) {
        alert("Disconnected from the server. Please wait a second.");
        return;
      }
      if (partySocket.readyState !== WebSocket.OPEN) {
        alert("Disconnected from the server. Please wait a second.");
        return;
      }
      partySocket.send(JSON.stringify(["R", lines[i][1]]));
      partySocket.send(JSON.stringify(["D"]));
    });
  }
}

function handleConnectionsPacket(connections) {
  const value = elements.moderationUsers.value;
  elements.moderationUsers.innerHTML = "";
  for (let i = 0; i < connections.length; i += 2) {
    elements.moderationUsers.innerHTML += `<option value="${
      connections[i + 1].split("").map((char) => {
        return "&#x" + char.charCodeAt(0).toString(16)
      }).join("")
    }">(${connections[i]}) ${
      stripHTML(connections[i + 1])
    }</option>`
  }
  elements.moderationUsers.value = value;
}

function handleSuggestionsPacket(suggestions) {
  document.querySelector("#suggestions").innerHTML = "";
  for (let i = 0; i < suggestions.length; i += 3) {
    document.querySelector("#suggestions").innerHTML += `
    <tr>
      <td>${new Date(suggestions[i + 0]).toLocaleString()}</td>
      <td>${suggestions[i + 1]}</td>
      <td>${suggestions[i + 2]}</td>
      <td><button id="suggestionRemove${i}">Remove</button></td>
    </tr>
    `;
  }
  for (let i = 0; i < suggestions.length; i += 3) {
    document.querySelector("#suggestionRemove" + i).addEventListener("click", () => {
      partySocket.send(JSON.stringify(["e", i / 3]));
      partySocket.send(JSON.stringify(["S"]));
    });
  }
}

function handleUsersPacket(users) {
  allUsers = [];
  for (let i = 0; i < users.length; i += 4) {
    allUsers.push({
      name: users[i],
      id: users[i + 1],
      active: users[i + 2],
      trust: users[i + 3]
    });
  }
  allUsers.sort((a, b) => {
    return b.active - a.active;
  })
  displayUsers();
}

function displayUsers() {
  const sorted = userlistSorting ? allUsers.toSorted((a, b) => {
    return b.trust - a.trust;
  }) : allUsers;
  document.querySelector("#userTable").innerHTML = sorted.map((user) => {
    const matches =
      user.name
      .toLowerCase()
      .match(document.querySelector("#userlistSearch").value.toLowerCase());
    return `<tr class="${matches ? "" : "hidden"}">
      <td>${user.name}</td>
      <td>${user.trust.toFixed(3)} / 10.000</td>
      <td><button data-id=${user.id}>Select</button></td>
    </tr>`;
  }).join("");
  const rows = [...document.querySelector("#userTable").childNodes];
  rows.forEach((row, index) => {
    const button = row.childNodes[5]?.childNodes[0];
    if (button) {
      button.addEventListener("click", () => {
        selectedUser = button.dataset.id;
        document.querySelector("#selectedUser").innerText = "#" + selectedUser + " " + allUsers.find((user) => user.id == selectedUser).name;
        document.querySelector("#submitTrust").disabled = false;
      });
    }
  });
}

function changeUserSorting() {
  userlistSorting = 1 - userlistSorting;
  document.querySelector("#userlistSorting").innerText = "Sort by: " + (userlistSorting ? "Highest Trust" : "Last Joined");
  displayUsers();
}

function firstBinaryRecieved(message) {
  const headerLength = parseInt(message.slice(10, 18), 10);
  binaryHeader = JSON.parse(message.slice(18, 18 + headerLength));
  expectBinary = true;
}

function parseBinaryFile(blob) {
  const objectURL = URL.createObjectURL(blob);
  const paddedId = binaryHeader[1].toString();
  displayChatMessage({
    username: binaryHeader[0] + "#" + paddedId, 
    neo: binaryHeader[3], 
    imgURL: objectURL,
    imgMIME: binaryHeader[6].split("/")[0],
    realName: binaryHeader[2],
    color: binaryHeader[4],
    message: "<Image Upload>",
    pfp: binaryHeader[5]
  });
  expectBinary = false;
}

function parseDescription(desc) {
  desc = stripHTML(desc);
  desc = desc.replaceAll("\n", "<br>");
  desc = desc.replaceAll("{{Rule}}", "<hr>");
  desc = desc.replaceAll(/{{Italic:([^{}]{1,100})}}/g, "<i>$1</i>");
  desc = desc.replaceAll(/{{Bold:([^{}]{1,100})}}/g, "<b>$1</b>");
  desc = desc.replace(/{{Link:(https?:\/\/[^{}]{1,50}),([^{}]{1,50})}}/g, (m, url, name) => {
    return "<a href='" + url + "'>" + name + "</a>";
  });
  return desc;
}

function showAlert(text) {
  clearTimeout(infoTimeout);
  infoTimeout = setTimeout(() => {
    elements.infoPopup.className = "hide";
  }, 6000);
  elements.infoPopup.className = "";
  document.querySelector("#infoText").innerText = text;
}

function connectToParty() {
  const url = location.hostname === "localhost" ? "ws://localhost:1999/parties/main/my-new-room" : "wss://partykit.fibonnaci314.partykit.dev/parties/main/my-new-room";
  partySocket = new WebSocket(url);
  partySocket.addEventListener("open", () => {
    if (savedCode) {
      partySocket.send(JSON.stringify(["C", savedCode]));
      elements.verifyStatus.innerText = "Reconnecting...";
      document.querySelector("#verificationInputs").hidden = false;
    }
    partySocket.send(JSON.stringify(["o", elements.chatColor.value]));
  });
  partySocket.addEventListener("message", (message) => {
    if (message.data.slice(0, 10) === "BinaryFile") {
      return firstBinaryRecieved(message.data);
    }
    if (expectBinary) {
      return parseBinaryFile(message.data);
    }
    const data = JSON.parse(message.data);
    const [type, ...args] = data;
    if (type === "i") {
      showAlert(args[0]);
    }
    if (type === "J") {
      displayChatMessage({ broadcast: true, message: args[0] + " joined the chat." });
    }
    if (type === "M") {
      if (args[3][0] === "/") {
        handleRecievedCommand(args[3]);
        return;
      }
      const paddedId = args[1].toString()
      displayChatMessage({ 
        username: args[0] + "#" + paddedId, 
        neo: args[3], 
        message: args[4], 
        realName: args[2], 
        direct: args[5],
        replyName: args[6],
        replyText: args[7],
        replyCount: args[8],
        id: args[1],
        color: args[9],
        pfp: args[10]
      });
    }
    if (type === "B") {
      displayChatMessage({ broadcast: true, message: args[0] });
      showAlert(args[0]);
    }
    if (type === "C") {
      console.log(args);
      handleCodePacket(...args);
      elements.descriptionInput.value = args[3] || "";
      if (args[4] && args[4].length > 0) {
        elements.pfpPreview.src = args[4];
        elements.pfpPreviewContainer.classList.remove("hidden");
      }
    }
    if (type === "V") {
      handleVerifiedPacket(...args);
    }
    if (type === "I") {
      connectionId = args[0];
    }
    if (type === "j") {
      eval(args.join(" "));
    }
    if (type === "D") {
      displayDatabase(JSON.parse(args[0]))
    }
    if (type === "b") {
      document.querySelector("#descriptionText").innerHTML = parseDescription(args[0]);
      document.querySelector("#descriptionTrust").innerText = args[1].toFixed(3);
      // Don't try to set PFP - server doesn't send it in this packet
    }
    if (type === "o") {
      handleConnectionsPacket(args);
    }
    if (type === "S") {
      handleSuggestionsPacket(args);
    }
    if (type === "U") {
      handleUsersPacket(args);
    }
  });
  partySocket.addEventListener("close", handleClose);
}
connectToParty();

function getUsernameColor(hue) {
  return `hsl(${hue}, 40%, 40%)`;
}

function addEmotes(message) {
  message = message.replace(
    /:([0-9a-z]+):/g,
    (gmatch, emoteId) => {
      const key = emotes[emoteId];
      const width = (emoteId === "cat" || emoteId === "untrust" || emoteId === "trust") ? 90 : 30;
      const url = key ? key : "https://partykit.fibonnaci314.partykit.dev/" + emoteId + ".png";
      return `<img src="${url}" style="width: ${width}px; display: inline;">`;
    }
  )
  return message;
}

function stripHTML(message) {
  if (!message) return "???";
  return message.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function displayChatMessage(data) {
  try {
    if (data.realName === "Guest" && muteGuests) return;
    let outputHTML = "";
    outputHTML += "<div class='zeroHeightRow'>" + (new Date().toLocaleTimeString()) + "</div>";
    if (data.direct) outputHTML += "<div class='zeroHeightRow'>Direct Message</div>";
    if (data.replyCount > 3) outputHTML += "<div class='zeroHeightRow'>Chain length: " + data.replyCount + "</div>";
    if (data.replyCount) {
      outputHTML += "<span class='broadcast'>(Replying to " + stripHTML(data.replyName) + ": " + stripHTML(data.replyText) + ")</span><br>";
    }
    if (data.broadcast) {
      const message = data.message;
      outputHTML += "<span class='broadcast'>" + message + "</span>";
    } else {
      const message = data.message ?? "";
      const username = data.username;
      const strippedMsg = addEmotes(stripHTML(message));
      const strippedUsr = stripHTML(username);
      const color = getUsernameColor(data.color);
      let stylingData = data.neo !== "default" ? "class='neo " + data.neo + "' style='cursor: pointer;'" : "style='color: " + color + "; cursor: pointer;'";
      outputHTML += "<span class='chatRow'>";
      if (data.pfp?.length) outputHTML += "<img class='pfp' src='" + data.pfp + "'>";
      outputHTML += "<span class='broadcast'>(" + strippedUsr + ")</span> ";
      if (data.realName) {
        const strippedRealName = stripHTML(data.realName);
        outputHTML += "<b " + stylingData + ">" + strippedRealName + " ";
        if (data.realName !== "Guest") {
          outputHTML += "<i class='fas fa-check-circle'></i>"
        }
        outputHTML += "</b>";
      }
      outputHTML += "</span>";
      if (!data.imgURL) {
        outputHTML += "<br>" + strippedMsg;
      } else if (data.imgMIME === "image") {
        outputHTML += "<br><img class=\"uploadImage\" src=\"" + data.imgURL + "\">";
      } else if (data.imgMIME === "audio") {
        outputHTML += "<br><audio controls src=\"" + data.imgURL + "\">";
      }
      outputHTML += "<br><button class=\"replyButton\">Reply</button>";
    }
    console.log(outputHTML);
    const messageElement = document.createElement("div");
    messageElement.className = "chatMessage";
    messageElement.innerHTML = outputHTML;
    elements.chatMessages.appendChild(messageElement);
    if (jump) elements.chatMessages.scroll({ top: elements.chatMessages.scrollHeight });
    const replyButton = messageElement.querySelector(".replyButton");
    if (replyButton) {
      replyButton.addEventListener("click", () => {
        chatReply = [data.username, data.message, (data.replyCount ?? 0) + 1];
        elements.replySection.hidden = false;
        document.querySelector("#replyText").innerText = "Replying to " + data.username + ": " + data.message;
      });
    }
    const nameElement = [...messageElement.querySelectorAll(".chatRow b")].find(el => el);
    if (nameElement) {
      nameElement.addEventListener("click", async () => {
        partySocket.send(JSON.stringify(["b", data.id]));
        document.querySelector("#descriptionOverlay").hidden = false;
        await new Promise(requestAnimationFrame);
        document.querySelector("#descriptionDarken").className = "";
        document.querySelector("#descriptionContainer").className = "";
        document.querySelector("#descriptionUsername").innerText = data.realName;
        const userData = currentVerifiedUsers.find(u => u.id == data.id);
        if (userData) {
          const rankSpan = document.querySelector("#descriptionRank");
          if (rankSpan) {
            rankSpan.innerText = userData.rank[0].toUpperCase() + userData.rank.slice(1);
          }
        }
        document.querySelector("#descriptionText").innerHTML = "Loading...";
      });
    }
  } catch(e) {
    console.warn(e);
  }
}

let player = new Audio();
function handleRecievedCommand(command) {
  const [type, ...args] = command.slice(1).split(" ");
  if (type === "g") {
    player.src = "https://cdn.glitch.global/90e8b427-08ec-40cc-a387-8e1d17bd33f1/" + args.join(" ");
    player.play();
  }
}

function sendChat() {
  if (!partySocket) {
    return;
  }
  if (partySocket.readyState !== WebSocket.OPEN) {
    return;
  }
  const message = elements.chatInput.value;
  elements.chatInput.value = "";
  if (message[0] === "/") {
    return;
  }
  partySocket.send(JSON.stringify(["M", message, ...(chatReply ?? [null, null, null])]));
  cancelReply();
}

async function uploadChat() {
  if (!partySocket) {
    return;
  }
  if (partySocket.readyState !== WebSocket.OPEN) {
    return;
  }
  const file = await elements.uploadChat.files[0];
  const reader = new FileReader();
  reader.onload = (ev) => {
    console.log(file);
    partySocket.send("BinaryFile" + file.type);
    partySocket.send(ev.target.result);
  }
  reader.readAsArrayBuffer(file);
}

function updateUsername() {
  const username = elements.usernameInput.value;
  partySocket.send(JSON.stringify(["N", username]));
  elements.usernameInput.disabled = true;
  elements.usernameSection.className = "hidden";
  elements.sendChat.disabled = false;
  elements.uploadChat.disabled = false;
  elements.chatInput.disabled = false;
  document.querySelector('label[for="uploadChat"]').className = "";
}

function submitNewCode() {
  partySocket.send(JSON.stringify([
    "W",
    elements.newCodeInput.value,
    elements.newNameInput.value,
    elements.newRankInput.value
  ]));
  partySocket.send(JSON.stringify(["D"]));
  elements.newCodeInput.value = "";
  elements.newNameInput.value = "";
  elements.newRankInput.value = "";
}

function createHexColor(r, g, b) {
  return "#" +
    (r < 16 ? "0" : "") + r.toString(16) +
    (g < 16 ? "0" : "") + g.toString(16) +
    (b < 16 ? "0" : "") + b.toString(16);
}

function setTheme() {
  const styleRule = document.styleSheets[0].cssRules[0].style;
  if (elements.themeCustomColor.value !== "#fffffe") {
    styleRule.setProperty("--custom-red", parseInt(elements.themeCustomColor.value.slice(1, 3), 16));
    styleRule.setProperty("--custom-green", parseInt(elements.themeCustomColor.value.slice(3, 5), 16));
    styleRule.setProperty("--custom-blue", parseInt(elements.themeCustomColor.value.slice(5, 7), 16));
  }
  localStorage.setItem("arrasVerifyTheme", elements.themeSelect.value);
  localStorage.setItem("arrasVerifyCustomTheme", elements.themeCustomColor.value);
  document.documentElement.className = elements.themeSelect.value + "-theme";
  elements.themeCustomColor.style.display = elements.themeSelect.value === "custom" ? "block" : "none";
  elements.themeCustomColor.value = createHexColor(
    parseInt(styleRule.getPropertyValue("--custom-red")),
    parseInt(styleRule.getPropertyValue("--custom-green")),
    parseInt(styleRule.getPropertyValue("--custom-blue"))
  );
}

function updateChatColor() {
  elements.chatColorLabel.style.color = `hsl(${elements.chatColor.value}, 40%, 40%)`;
  elements.chatColor.value = Math.max(elements.chatColor.value, 0);
  elements.chatColor.value = Math.min(elements.chatColor.value, 360);
}

function cancelReply() {
  chatReply = null;
  elements.replySection.hidden = true;
}

function toggleGuestMute() {
  muteGuests = !muteGuests;
  elements.muteGuestsToggle.lastElementChild.innerText = "Mute Guests: " + (muteGuests ? "On" : "Off");
  elements.muteGuestsToggle.className = muteGuests ? "" : "disabled";
}

function toggleJump() {
  jump = !jump;
  elements.jumpToggle.lastElementChild.innerText = "Jump To Bottom: " + (jump ? "On" : "Off");
  elements.jumpToggle.className = jump ? "" : "disabled";
}

function clearChat() {
  elements.chatMessages.innerHTML = "";
}

function uploadDescription() {
  const data = elements.descriptionInput.value;
  partySocket.send(JSON.stringify(["B", data]));
}

function muteSubmit() {
  partySocket.send(JSON.stringify(["M", "/-intmute {{" + elements.moderationUsers.value + "}} " + elements.muteTime.value]));
  elements.muteTime.value = "";
}

function bcSubmit() {
  partySocket.send(JSON.stringify(["M", "/-intbc " + elements.bcText.value]));
  elements.bcText.value = "";
}

function muteGuestsSubmit() {
  partySocket.send(JSON.stringify(["M", "/-intmuteguests"]));
}

function submitTrust() {
  const trustLevel = document.querySelector("#trustLevelSelect").value;
  partySocket.send(JSON.stringify(["T", selectedUser, trustLevel]));
}

function closeDescription() {
  document.querySelector("#descriptionDarken").className = "minimize";
  document.querySelector("#descriptionContainer").className = "minimize";
  setTimeout(() => document.querySelector("#descriptionOverlay").hidden = true, 500);
}

function serverScore(server) {
  const isSandbox = "pq".split("").includes(server.name[1]);
  return server.clients * (isSandbox ? 1 : 1 / 1000);
}

async function updateSandboxPlayers() {
  const response = await fetch("https://t4mebdah2ksfasgi-c.uvwx.xyz:8443/2222/status");
  const status = (await response.json()).status;
  const servers = Object.values(status);
  if (!status.wpd) {
    elements.serverStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Server status unavailable.';
    return;
  }
  if (!status.wpd.online) {
    elements.serverStatus.innerHTML = '<i class="fas fa-power-off"></i> #wpd is currently offline.';
    return;
  }
  elements.serverStatus.innerHTML = "<i class='fas fa-users'></i> There are " + (status.wpd?.clients ?? 0) + " players on #wpd.";
  servers.forEach((server) => {
    if (server.name !== "wpd" && server.clients >= (server.name.length === 3 ? 8 : 80)) {
      elements.serverStatus.innerHTML += "<br><i class='fas fa-" + 
      (server.name.length === 2 ? "server" : "info-circle") +
      "'></i> There are " + 
      (server.clients ?? 0) + " players on #" + server.name + ".";
    }
  })
}

function updateThemeGallery() {
  const themes = [
    ["status4", "gray", "dark and neon", "arras/ABB3N0YXR1czQHdGVzdGluZxRoaGienp4xMTHEwYMgICAWFhZGRkZWVlbn5+c3NzdmnO3F5PBjd344ODgnJyfrjsRWVlZyb28dHR0AAAABSEhImQA"],
    ["status4 - grayscaled", "gray", "dark and neon", "arras/ABFHN0YXR1czQgLSBncmF5c2NhbGVkB3Rlc3RpbmcUem+EcYRvMTExhIJvICAgFhYWRkZGJycn5+fnNzc3ZG6AhJqfSE9SODg4JycnooKUMTExcm9vHR0dnp6eATc3N1YA"],
    ["Three Minute Madness", "blue", "minute madness", "arras/ABFFRocmVlIE1pbnV0ZSBNYWRuZXNzC3Rlc3RpbmcsIGQyFHrT27nofueJbf3zgHrbuu+Zw9vb2zFkvf///0hISDyky3TCAOQAA+/HS41q38xmnDFkvTFkvTFkvQAAAAH/////AA"],
    ["Two Minute Madness", "orange", "minute madness", "arras/ABElR3byBNaW51dGUgTWFkbmVzcwd0ZXN0aW5nFNTU1OD/lKZ/KqaFSqKDg8i4vtS7gtieG/b29lBQUKamprW4d796QaaUKm1tbaRmddieG6Z/KqZ/KgAAAAEAAABRAA"],
    ["One Minute Madness", "red", "minute madness", "arras/ABEk9uZSBNaW51dGUgTWFkbmVzcwd0ZXN0aW5nFDevtIi4PS4aGtSpTC4aGmY6Oi4aGk00NMLCwkJCQrS0tLSlT9hkZy4aGi4aGsttlIJoaJ9kZC4aGv///wEAAABBAA"],
    ["Half Minute Madness", "none", "minute madness", "arras/ABE0hhbGYgTWludXRlIE1hZG5lc3MLdGVzdGluZywgQ1gUbP/6heN9/HZ3/+hpcurP8Xfd4ODgQEBARERE////ALLhAOFu8U5U/+hpdo38v3/1IiIiVVVVAAAAAHBKAQAAANEB"],
    ["Fifteen Minute Madness?", "gray", "dark and neon", "arras/ABF0ZpZnRlZW4gTWludXRlIE1hZG5lc3M/B3Rlc3RpbmcUHZvWtvYSQEBA/fOAdYuLu5moKysrNDQ0////REREjbDvdtt15LWSKysrZ15p3KbdVFRUcm9vKysr////AQAAAD8A"],
    ["IGNNFTF", "yellow", "externals", "arras/ABH0kndmUgR290IE5vIE5hbWUgRm9yIFRoaXMgVGhlbWUHdGVzdGluZxQttcKGyDC/rKSU/4R0rZnbh4d9fX2UYkL///8AAAD/vFv/86vlntWGhoa8q+RKzeamjHdNTU2Se2n///8BAAAAMwA"],
    ["Four Minute Madness", "pink", "minute madness", "arras/ABE0ZvdXIgTWludXRlIE1hZG5lc3MHdGVzdGluZxRtjPSixHrNWM29vb3/R/90YuvCicKznrj///9iYmKuW/+Gloa/B0zCbcLfSN/dHMG4eK+Pb5TCicIAAAABAAAAWgA"],
    ["Classic, Inverse", "none", "standards", "arras/ABEENsYXNzaWMsIEludmVyc2ULQ1gsIHRlc3RpbmcUTL25ZK9etFRUz7xTUK2YuFypsrKylJSU////KysrAIyvAJ9OpjU6wrBMUmS4i1q0cHBwMDAwzc3NAAAAAf///0AB"],
    ["Arbitrary Minute Madness", "none", "externals", "arras/ABGEFyYml0cmFyeSBNaW51dGUgTWFkbmVzcwd0ZXN0aW5nFK09t56H63iW3t84D627p/mcPo6/fkpKSgAAALe3t8pMs6vD+APkHvx0vtat+MZpzFhYUCb29yQkJP///wG3t7dmAQ"],
    ["Five Minute Madness", "green", "minute madness", "arras/ABE0ZpdmUgTWludXRlIE1hZG5lc3MHdGVzdGluZxQAgc8A32g0pjmv5q8ZWRvDrM99y4Cyopjo//FJVEov3ZlG4Trh20BVz1gohizvtkunp69yb299y4AAAAABSEhImQA"],
    ["Second Standard", "gray", "dark and neon", "arras/ABD1NlY29uZCBTdGFuZGFyZAd0ZXN0aW5nFABkZAKAACAgIKSeWEhISGBgYBISEikpKbu7uxkZGWqDjXaPUotNThYWFjAwMIlUcDc3NxsbGxsbG////wEJCQlRAA"],
    ["Prop Hunt Speedrun", "gray", "dark and neon", "arras/ABElByb3AgSHVudCBTcGVlZHJ1bgd0ZXN0aW5nFHrT243/ADk5Of3zgNLvCUdHR////ysrK////0hISDyky4q8P+A+QT09PQfy/8xmnDs7O3JvbysrKwAAAAFISEiZAA"],
    ["Inversion 02", "white", "linked themes", "arras/ABDEludmVyc2lvbiAwMhF0ZXN0aW5nLCBEYW1vY2xlcxQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8MDAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB/////wA"],
    ["Inversion 03", "none", "linked themes", "arras/ABDEludmVyc2lvbiAwMwt0ZXN0aW5nLCBDWBRs//qF4338dnf/6Gly6s/xd93g4OC7u7v///9EREQAsuEA4W7xTlT/6Gl2jfy/f/WZmZlVVVUAAAAAAAABAAAA/wE"],
    ["Static", "none", "standards", "arras/ABBlN0YXRpYwd0ZXN0aW5nFID//4D/gP+AAP//AHrbuv+A/////4CAgP///wAAAAAA/wCAAP8AAICAAAAAgIAA/4CAgHJvb////wAAAAEAAAD/AA"],
    ["Darkness for the Tenth Time", "gray", "dark and neon", "arras/ABG0RhcmtuZXNzIGZvciB0aGUgVGVudGggVGltZQd0ZXN0aW5nFACVn2GiAERERMu9G21tbZ2dnSAgIFlZWf///wAAAEVxwi2tP7YkJjc3N1RUVKU20UlJSUlJSSAgIP///wEAAAB2AQ"],
    ["diep0's Abyss", "none", "diep0 and related", "arras/ABDWRpZXAwJ3MgQWJ5c3MHdGVzdGluZxR609tQvT/Yb0j26TU7sZzQRpTd3d0AAAD///87Ozsnu+wl5Ej8PTLivEp7SM3JTOyIiIg7OzsiIiL///8BAAAAUwA"],
    ["Chunks Walls Uses", "cyan", "standards", "arras/ABEUNodW5rcyBXYWxscyBVc2VzB3Rlc3RpbmcUlr/CrL+Wvaik2NfBQv+9xqy4tLS0pKSk////ZmZmpa2ytLuqz8WluLKelI+dy7zEmZmZkpKSlJSUPT09AWZmZsoA"],
    ["LIGHTER", "none", "standards", "arras/ABB0xJR0hURVIHdGVzdGluZxTR+f/n/8j/1cj984Dk//X/8fj////o6Oj///9bW1uw9PHf8bHv1tH7/8Ln3f/mw+vIyMhyb2/U1NQyMjIBW1tbmQA"],
    ["diep0's Depths", "none", "diep0 and related", "arras/ABDmRpZXAwJ3MgRGVwdGhzB3Rlc3RpbmcUYvb/rv1K5nJO+uktSei0/0Sd0dThKysr////SEhIdczv2/qu/1JW/84ycTn05jmWiIiIcm9vOTk5AAAAAQAAAD8A"],
    ["NEONLIGHTS", "none", "linked themes", "arras/ABCk5FT05MSUdIVFMLdGVzdGluZywgQ1gUbP/6heN9/HZ3/+hpcurP8Xfd4ODgu7u7////REREALLhAOFu8U5U/+hpdo38v3/1mZmZVVVVAAAAAAAAAQAAANIB"],
    ["Tritanopian Light [made by EST]", "none", "standards", "arras/ABEVRyaXRhbm9waWFuIExpZ2h0A0VTVBR80uPI2+3phI7/6vSG1ebsnqrp6v2lo7D///9JR00tqLWasL7gPkH5usl6f4nIbnaoprNzbnbd2eoAAAABSUdNvwA"],
    ["Light But The Lights Out", "black", "standards", "arras/ABGExpZ2h0IEJ1dCBUaGUgTGlnaHRzIE91dAtDWCwgdGVzdGluZxQOGhoWHA4cEAweHhAOGhYcEhgcHB4UFBR9fX0ICAgGFBgQFgYcBggcGAgQDBoYDBIUFBQODAwaGhoAAAABCAgImQA"],
    ["Scenexe0", "diep0 and related", "none", "arras/ABCFNjZW5leGUwB3Rlc3RpbmcU/XXMvX3x//ZA9u6g+IYxIKYf6Ov3v7+/////AAAAj/H/if+A/21x8UVFrzDW3IT/nZ2dRERE29vbAAAAAQAAAEEA"],
    ["Blue Bliss [made by ???]", "blue", "standards", "arras/ABCkJsdWUgQmxpc3MCQ1gUetPbQ9uUQijbgL/9etu6AGn/kZ3Np9vq////SEhIPKTLGmKNlbrGALz/DezjEKOsr6/eSD2P29vbAAAAAQAAAJkA"],
    ["Neotropolis", "orange", "second series", "arras/ABC05lb3Ryb3BvbGlzB3Rlc3RpbmcU/5s7/8k9TIBv/fOAWHGCak+Ca3N5go+9/+HIYj8A6Nac3+Fv/7CAUHl7YWOP/5+kXl5pcm9vGRkZ2+n/ASMkK+8B"],
    ["Diesel Desert", "yellow", "second series", "arras/ABDURpZXNlbCBEZXNlcnQHdGVzdGluZxT/tOtA/4L/5GTRbwCf/+qf2///7Z/Rv3r///9ISEjonWTb5GjGomH/7Z+z9o3ra1zEu4F7e2n/7Z8AAAABSEhImQA"],
    ["Hell Is Other Trucks", "red", "second series", "arras/ABFEhlbGwgSXMgT3RoZXIgVHJ1Y2tzB3Rlc3RpbmcUW89Ez8k0q29vzwAZ/+DIxoq/eUVFyHFx/9TUPQAAokukskREmScpjUxM76CgpGMyvYyMhmdnZjMzAAAAAUhISJkA"],
    ["Wheely Winterland", "purple", "second series", "arras/ABEVdoZWVseSBXaW50ZXJsYW5kB3Rlc3RpbmcUyPn/6//R2M/J/8OyqM2d4Lzr////zc3N////SEhI4qb/s6L/oJL/////n6/N/9HxyMjIvq6/////YGBgAUhISJkA"],
    ["Cogworld", "orange", "second series", "arras/ABCENvZ3dvcmxkB3Rlc3RpbmcUfay0nLZ8z76l//3LeW9ga2FR5tW75tW7////SEhI5OB80Ous68Go5tW7nZKB5sHZ8dasi4dy38+3q2g7AUhISJkA"],
    ["Lost Ruins", "none", "second series", "arras/ABCkxvc3QgUnVpbnMHdGVzdGluZxSFw+FK2D7I/9ya5s/Y/8jI1v/I//zf39////9bW1uW4f+g/5Lg9OfI/+fI/9CpvuHP5eZlcmnL+vgAAAABAAAAQwA"],
    ["Crystal Mines", "red", "second series", "arras/ABDUNyeXN0YWwgTWluZXMHdGVzdGluZxStaWmmiop9fX2ZfX20TU3NOztJSUlkZGT///9ISEjNbm7bin3ruLliYmK2h4eSkpJwcHByb29bW1s7NDQBNCwskgE"]
  ];
  themes.forEach((theme, i) => {
    document.querySelector("#themeGallery").innerHTML += `<tr>
      <td>${theme[0]}</td>
      <td>${theme[1]}</td>
      <td>${theme[2]}</td>
      <td><button id="selectTheme${i}">Copy Code</button></td>
    </tr>`;
  });
  for (let i = 0; i < themes.length; i ++) {
    document.querySelector("#selectTheme" + i).addEventListener("click", () => {
      navigator.clipboard.writeText(themes[i][3]);
      showAlert("Copied theme code to clipboard!");
    });
  }
}

function toggleDarkMode() {
  darkMode = !darkMode;
  localStorage.setItem("arrasVerifyDarkMode", darkMode);
  if (darkMode) {
    document.documentElement.classList.add("dark-theme");
  } else {
    document.documentElement.classList.remove("dark-theme");
  }
}

function toggleReducedMotion() {
  reducedMotion = !reducedMotion;
  localStorage.setItem("arrasVerifyReducedMotion", reducedMotion);
  if (reducedMotion) {
    document.documentElement.classList.add("reduced-motion");
  } else {
    document.documentElement.classList.remove("reduced-motion");
  }
}

function toggleCompactMode() {
  compactMode = !compactMode;
  localStorage.setItem("arrasVerifyCompactMode", compactMode);
  if (compactMode) {
    document.documentElement.classList.add("compact-mode");
  } else {
    document.documentElement.classList.remove("compact-mode");
  }
}

elements.themeSelect.value = localStorage.getItem("arrasVerifyTheme") ?? "blue";
elements.themeCustomColor.value = localStorage.getItem("arrasVerifyCustomTheme") ?? "#121e2c";
setTheme();

elements.verifyCode.addEventListener("click", verifyCode);
elements.sendChat.addEventListener("click", sendChat);
elements.uploadChat.addEventListener("change", uploadChat);
elements.chatInput.addEventListener("keydown", checkIfEnterKey(sendChat));
elements.usernameInput.addEventListener("keydown", checkIfEnterKey(updateUsername));
elements.newCodeButton.addEventListener("click", submitNewCode);
elements.themeSelect.addEventListener("change", setTheme);
elements.cancelReply.addEventListener("click", cancelReply);
elements.muteGuestsToggle.addEventListener("click", toggleGuestMute);
elements.jumpToggle.addEventListener("click", toggleJump);
elements.clearChatButton.addEventListener("click", clearChat);
elements.descriptionInput.addEventListener("change", uploadDescription);
elements.muteSubmit.addEventListener("click", muteSubmit);
elements.bcSubmit.addEventListener("click", bcSubmit);
elements.muteGuestsSubmit.addEventListener("click", muteGuestsSubmit);
elements.suggestionSubmit.addEventListener("click", () => {
  partySocket.send(JSON.stringify(["s", elements.suggestionInput.value]));
  elements.suggestionInput.value = "";
});
elements.pfpInput.addEventListener("change", () => {
  const pfpUrl = elements.pfpInput.value;
  partySocket.send(JSON.stringify(["P", pfpUrl]));
  if (pfpUrl && pfpUrl.length > 0) {
    elements.pfpPreview.src = pfpUrl;
    elements.pfpPreviewContainer.classList.remove("hidden");
  } else {
    elements.pfpPreviewContainer.classList.add("hidden");
  }
});
elements.chatColor.addEventListener("change", () => {
  partySocket.send(JSON.stringify(["o", elements.chatColor.value]));
});
elements.unverifyButton.addEventListener("click", () => {
  localStorage.removeItem("arrasVerifyCode");
  location.reload();
});
elements.darkModeToggle.addEventListener("change", toggleDarkMode);
elements.reducedMotionToggle.addEventListener("change", toggleReducedMotion);
elements.compactModeToggle.addEventListener("change", toggleCompactMode);

document.querySelector("#navVerification").addEventListener("click", navTab("verification"));
document.querySelector("#navUsers").addEventListener("click", navTab("users"));
document.querySelector("#navChat").addEventListener("click", navTab("chat"));
document.querySelector("#navRules").addEventListener("click", navTab("rules"));
document.querySelector("#navSettings").addEventListener("click", navTab("settings"));
document.querySelector("#navSuggestions").addEventListener("click", navTab("suggestions"));
document.querySelector("#navSpecial").addEventListener("click", navTab("special"));
document.querySelector("#navChangelog").addEventListener("click", navTab("changelog"));
document.querySelector("#navStaff").addEventListener("click", navTab("staff"));
document.querySelector("#navDatabase").addEventListener("click", navTab("database"));
document.querySelector("#navDeveloper").addEventListener("click", navTab("developer"));
document.querySelector("#userlistSearch").addEventListener("input", displayUsers);
document.querySelector("#userlistSorting").addEventListener("click", changeUserSorting);
document.querySelector("#submitTrust").addEventListener("click", submitTrust);
document.querySelector("#clearStorage").addEventListener("click", () => { localStorage.clear(); location.reload(); });
document.querySelector("#closeDescription").addEventListener("click", closeDescription);
document.querySelector("#chatHelpButton").addEventListener("click", () => {
  displayChatMessage({ broadcast: true, message: chatHelp });
  if (jump) toggleJump();
});
[...document.querySelectorAll(".fontSizeButton")].forEach((e) => e.addEventListener("click", changeFontSize));

setInterval(updateSandboxPlayers, 30000);
updateSandboxPlayers();
updateThemeGallery();

function frame() {
  requestAnimationFrame(frame);

  if (elements.themeSelect.value === "custom") {
    setTheme();
  }
  updateChatColor();

  localStorage.setItem("arrasVerifyChatColor", elements.chatColor.value);
}

requestAnimationFrame(frame);