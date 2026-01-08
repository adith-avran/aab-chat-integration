window.onload = () => {
    const onlineBtn = document.querySelector('div.rectangle-button[id^="liveagent_button_online_"]')
    if (onlineBtn) {
        onlineBtn.addEventListener('click', () => {
            const url = "http://localhost:5173/?language=eu&displayName=adith.%20%20%20Manu";
            window.open(url, "LiveChat", "width=485,height=450,resizable=yes,scrollbars=yes");
        })
    }
}