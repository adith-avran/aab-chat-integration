function injectChatInterface() {
  const modal = document.createElement("div");
  modal.id = "custom-chat-modal";
  modal.innerHTML = `
<div id="custom-chat-modal-content" style="background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);">
    <div style="padding-inline: 24px;display: flex;align-items: center;gap: 10px;">
      <img style="width: auto;height: 18px;" src="https://abb.my.site.com/resource/1738743454000/ABBlogoforMessaging" >
      <h3 style='line-height: 31px;color: #ff0000; font-weight: 100'>Chat</h3>          
    </div>

    <iframe style="border-width: 0px; width: 100%; height: 550px;"  id="custom-chat-iframe" src="http://localhost:5174"></iframe>
</div>
`;
  document.querySelector(".container").appendChild(modal);
}

if (
  document.readyState === "complete" ||
  document.readyState === "interactive"
) {
  injectChatInterface();
} else {
  window.addEventListener("load", injectChatInterface);
}
