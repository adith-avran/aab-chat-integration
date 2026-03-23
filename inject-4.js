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

  launcher.addEventListener("click", () => {
    const url = "http://localhost:5173";
    window.open(
      url,
      "LiveChat",
      "width=485,height=600,resizable=yes,scrollbars=yes",
    );
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
