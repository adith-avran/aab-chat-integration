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
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    width: 90%;
    max-width: 30vw;
    height: 54px;
    background: #ffffff;
    border: 0.5px solid #ff000e;
    border-radius: 27px;
    box-shadow: 0px 3px 24px rgb(255 0 0 / 10%);
    display: flex;
    align-items: center;
    padding: 0 24px;
    cursor: pointer;
    z-index: 999999;
    color: #879596;
    transition: all 0.2s cubic-bezier(0.165, 0.84, 0.44, 1);
    user-select: none;
}
#custom-chat-launcher:hover {
    box-shadow: -2px 7px 15px rgb(255 0 0 / 18%);
    transform: translateX(-50%) translateY(-2px);
}
#custom-chat-launcher:active {
    transform: translateX(-50%) translateY(0);
}

#custom-chat-modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgb(0 0 0 / 40%);
    
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
    width: 95%;
    max-width: 900px;
    height: 75vh;
    background: #ffffff;
    border-radius: 16px;
    pointer-events: auto;
    overflow: hidden;
    box-shadow: 0 20px 50px rgba(0,0,0,0.3);
}
#custom-chat-modal-close {
    font-size: 24px;
    cursor: pointer;
    color: #545b64;
    height: 32px;
    width: 32px;
    border-radius: 50%;
    text-align: center;
}
#custom-chat-modal-close:hover {
    background: #eaeded;
}

#custom-chat-iframe {
    width: 100%;
    height: 100%;
    border: none;
}

.custom-chat-modal-header {
    position: relative;
}

.custom-chat-modal-header > div {
        position: absolute;
    top: 10px;
    right: 20px;
}

`;

function injectChatInterface() {
  const style = document.createElement("style");
  style.innerHTML = injectedCSS;
  document.head.appendChild(style);

  const launcher = document.createElement("div");
  launcher.id = "custom-chat-launcher";
  launcher.innerHTML = `
<div style='width: 100%; display: flex; justify-content: space-between;align-items: center;'>
    <span>Talk to us...</span>
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-chat-dots" viewBox="0 0 16 16">
        <path d="M5 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0m4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0m3 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2"/>
        <path d="m2.165 15.803.02-.004c1.83-.363 2.948-.842 3.468-1.105A9 9 0 0 0 8 15c4.418 0 8-3.134 8-7s-3.582-7-8-7-8 3.134-8 7c0 1.76.743 3.37 1.97 4.6a10.4 10.4 0 0 1-.524 2.318l-.003.011a11 11 0 0 1-.244.637c-.079.186.074.394.273.362a22 22 0 0 0 .693-.125m.8-3.108a1 1 0 0 0-.287-.801C1.618 10.83 1 9.468 1 8c0-3.192 3.004-6 7-6s7 2.808 7 6-3.004 6-7 6a8 8 0 0 1-2.088-.272 1 1 0 0 0-.711.074c-.387.196-1.24.57-2.634.893a11 11 0 0 0 .398-2"/>
    </svg>
</div>
`;
  document.body.appendChild(launcher);

  const modal = document.createElement("div");
  modal.id = "custom-chat-modal";
  const lang = window.CHAT_SESSION_LANGUAGE || "en_US";
  const country = window.CHAT_SESSION_COUNTRY || "US";
  const iframeUrl = `https://dg3aic71lh9nz.cloudfront.net?lang=${lang}&country=${country}`;
  modal.innerHTML = `
<div id="custom-chat-modal-content">
    
    <div class="custom-chat-modal-header" >
        <div style='line-height: 38px;' id="custom-chat-modal-close">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 256 256">
            <path fill="#ff0000" d="M128,188a11.96187,11.96187,0,0,1-8.48535-3.51465l-80-80a12.0001,12.0001,0,0,1,16.9707-16.9707L128,159.0293l71.51465-71.51465a12.0001,12.0001,0,0,1,16.9707,16.9707l-80,80A11.96187,11.96187,0,0,1,128,188Z"/>
          </svg>
        </div>
    </div>
  
    <iframe id="custom-chat-iframe" src="${iframeUrl}"></iframe>
</div>
`;
  document.body.appendChild(modal);

  launcher.addEventListener("click", () => {
    modal.style.display = "flex";
    modal.offsetHeight;
    modal.classList.add("active");
    launcher.style.display = "none";
  });

  document
    .getElementById("custom-chat-modal-close")
    .addEventListener("click", () => {
      modal.classList.remove("active");
      modal.style.display = "none";
      launcher.style.display = "flex";
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
