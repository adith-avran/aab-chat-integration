import socket
import threading
import logging
from zeroconf import Zeroconf, ServiceInfo
import platform
import uuid

logging.basicConfig(level=logging.DEBUG)

PORT = 7000
SERVICE_TYPE = "_airplay._tcp.local."
SERVICE_NAME = f"{platform.node()}._airplay._tcp.local."

DEVICE_ID = ":".join(uuid.getnode().to_bytes(6, "big").hex()[i:i+2] for i in range(0, 12, 2))

TXT_RECORDS = {
    b"deviceid": DEVICE_ID.encode(),
    b"features": b"0x5A7FFFF7,0x1E",
    b"model": platform.node().encode(),
    b"srcvers": b"220.68",
    b"vv": b"2",
}


def handle_client(conn, addr):
    try:
        logging.debug(f"Client connected: {addr}")
        data = b""
        while b"\r\n\r\n" not in data:
            chunk = conn.recv(4096)
            if not chunk:
                return
            data += chunk

        request = data.decode(errors="ignore")
        lines = request.split("\r\n")
        request_line = lines[0]

        if request_line.startswith("OPTIONS"):
            cseq = None
            for line in lines:
                if line.lower().startswith("cseq:"):
                    cseq = line.split(":", 1)[1].strip()

            response = (
                "RTSP/1.0 200 OK\r\n"
                f"CSeq: {cseq}\r\n"
                "Public: ANNOUNCE, SETUP, GET_PARAMETER, SET_PARAMETER, TEARDOWN, /pair-setup, /pair-verify\r\n"
                "\r\n"
            )
            conn.sendall(response.encode())

    except Exception as e:
        logging.exception("Client error")
    finally:
        conn.close()


def start_server():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(("", PORT))
    server.listen(5)

    logging.info(f"RTSP server listening on port {PORT}")

    while True:
        conn, addr = server.accept()
        threading.Thread(target=handle_client, args=(conn, addr), daemon=True).start()


def register_mdns():
    zeroconf = Zeroconf()
    info = ServiceInfo(
        SERVICE_TYPE,
        SERVICE_NAME,
        addresses=[socket.inet_aton(socket.gethostbyname(socket.gethostname()))],
        port=PORT,
        properties=TXT_RECORDS,
        server=f"{platform.node()}.local.",
    )

    zeroconf.register_service(info)
    logging.info("mDNS AirPlay service registered")

    return zeroconf


if __name__ == "__main__":
    zeroconf = register_mdns()
    try:
        start_server()
    except KeyboardInterrupt:
        pass
    finally:
        zeroconf.close()
