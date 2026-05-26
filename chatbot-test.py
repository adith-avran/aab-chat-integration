import requests
import json
import csv
import time
from datetime import datetime

url = "https://d3kg6m1lbsayn8.cloudfront.net/api/chatAPI"


def json_data(msg_content):
    return {
        "intent": "SendMessage",
        "messageContent": msg_content,
        "countryCode": "US",
        "languageCode": "en_US",
    }


messages_to_send = [
    # "Hello",
    "I am looking for RHD500 rotary actuator for purchase",
    "eugeneduncan5656@example.org, Aaron Anthony",
]
output_file = 'output_log.csv'


for i in range(1):
    session = requests.Session()
    for msg in messages_to_send:
        start = time.perf_counter()
        response = session.post(
            url,
            json=json_data(msg),
        )
        elapsed = time.perf_counter() - start
        server_time = response.elapsed.total_seconds()
        total_time = elapsed

        with open(output_file, 'a') as f:
            writer = csv.writer(f)
            writer.writerow([datetime.now().replace(microsecond=0).isoformat(), msg, response.status_code, f'{total_time:.2f}s {total_time:.2f}s', response.text, json.dumps(session.cookies.get_dict())])
