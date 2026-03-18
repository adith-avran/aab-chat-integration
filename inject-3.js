// window.onload = () => {
//     const onlineBtn = document.querySelector('div.rectangle-button[id^="liveagent_button_online_"]')
//     if (onlineBtn) {
//         onlineBtn.addEventListener('click', () => {
//             const url = "http://localhost:5173/?language=eu&displayName=adith.%20%20%20Manu";
//             window.open(url, "LiveChat", "width=485,height=450,resizable=yes,scrollbars=yes");
//         })
//     }
// }

const injectedCSS = `
#custom-chat-launcher {
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 20px;
    width: 15px;
    height: 15px;
    background: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 50%;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    display: flex;
    align-items: center;
    cursor: pointer;
    z-index: 999999;
    color: #879596;
    user-select: none;
}
#custom-chat-launcher svg {
    transform: scale(1.4);
    transform-origin: center;
}
#custom-chat-launcher:hover {
    box-shadow: 0 12px 32px rgba(0,0,0,0.18);
    border-color: #d1d1d1;
}

#custom-chat-modal {
    display: none;
    position: fixed;
    right: 20px;
    bottom: 90px;
    z-index: 1000000;
    justify-content: center;
    align-items: center;
    pointer-events: none;
}
#custom-chat-modal.active {
    display: flex;

}
#custom-chat-modal-content {

    display: flex;
    flex-direction: column;
    width: 400px;
    height: 75vh;
    background: #ffffff;
    border-radius: 10px;
    pointer-events: auto;
    overflow: hidden;
    box-shadow: -20px 17px 50px rgba(0, 0, 0, 0.3);
}

#custom-chat-iframe {
    width: 100%;
    height: 100%;
    border: none;
}

.custom-chat-modal-header {
    display: flex;
    justify-content: space-between;
    margin: 20px;
}

.custom-chat-modal-header  h3 {
    margin: 0;
    color: #ff0000;
    font-weight: 100
}
`;

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#ff0000" class="bi bi-chat-dots" viewBox="0 0 16 16">
        <path d="M5 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0m4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0m3 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2"/>
        <path d="m2.165 15.803.02-.004c1.83-.363 2.948-.842 3.468-1.105A9 9 0 0 0 8 15c4.418 0 8-3.134 8-7s-3.582-7-8-7-8 3.134-8 7c0 1.76.743 3.37 1.97 4.6a10.4 10.4 0 0 1-.524 2.318l-.003.011a11 11 0 0 1-.244.637c-.079.186.074.394.273.362a22 22 0 0 0 .693-.125m.8-3.108a1 1 0 0 0-.287-.801C1.618 10.83 1 9.468 1 8c0-3.192 3.004-6 7-6s7 2.808 7 6-3.004 6-7 6a8 8 0 0 1-2.088-.272 1 1 0 0 0-.711.074c-.387.196-1.24.57-2.634.893a11 11 0 0 0 .398-2"/>
    </svg>`;

function injectChatInterface() {
  const style = document.createElement("style");
  style.innerHTML = injectedCSS;
  document.head.appendChild(style);

  const launcher = document.createElement("div");
  launcher.id = "custom-chat-launcher";
  launcher.innerHTML = `
<div style='width: 100%; display: flex; justify-content: center; align-items: center;'>
    <div>${SVG}</div>
</div>
`;
  document.body.appendChild(launcher);

  const modal = document.createElement("div");
  modal.id = "custom-chat-modal";
  modal.innerHTML = `
<div id="custom-chat-modal-content">
    <div class="custom-chat-modal-header">
        <div style="display: flex;align-items: center;gap: 10px;">
          <img style="width: auto;height: 18px;" src="https://abb.my.site.com/resource/1738743454000/ABBlogoforMessaging" >
          <h3 style='line-height: 31px;'>Chat</h3>
        </div>
    </div>
    <iframe id="custom-chat-iframe" src="http://localhost:5174"></iframe>
</div>
`;
  document.body.appendChild(modal);

  launcher.addEventListener("click", () => {
    if (!modal.classList.contains("active")) {
      modal.style.display = "flex";
      modal.offsetHeight;
      modal.classList.add("active");
      launcher.querySelector(
        "div > div",
      ).innerHTML = `<div style="font-size: 24px;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256">
              <path fill="#ff0000" d="M128,188a11.96187,11.96187,0,0,1-8.48535-3.51465l-80-80a12.0001,12.0001,0,0,1,16.9707-16.9707L128,159.0293l71.51465-71.51465a12.0001,12.0001,0,0,1,16.9707,16.9707l-80,80A11.96187,11.96187,0,0,1,128,188Z"/>
            </svg></div>`;
    } else {
      modal.offsetHeight;
      modal.classList.remove("active");
      modal.style.display = "none";
      launcher.querySelector("div > div").innerHTML = SVG;
    }
  });
}

if (
  document.readyState === "complete" ||
  document.readyState === "interactive"
) {
  injectChatInterface();
} else {
  window.addEventListener("load", injectChatInterface);
}
