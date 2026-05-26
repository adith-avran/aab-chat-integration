import json
import urllib.request
import urllib.error
import urllib.parse
from datetime import datetime, timezone
import html

CLIENT_ID = "b98de9bff5d54cc69d5bba3d87d6a1c0"
CLIENT_SECRET = "7d9AB13C3bb84134a8422bECb2Ef9aC3"


CONTACT_API_URL = (
    "https://dev.cloudintegration02.abb.com/abb-sfdc-marketing-exp/api/contacts"
)
LEAD_CREATE_URL = (
    "https://dev.cloudintegration02.abb.com/abb-sfdc-marketing-exp/api/leads"
)
LEAD_UPDATE_URL = (
    "https://dev.cloudintegration02.abb.com/abb-sfdc-marketing-exp/api/leads"
)
LEAD_LOOKUP_URL = (
    "https://dev.cloudintegration02.abb.com/abb-sfdc-marketing-exp/api/leads"
)

BASE_HEADERS = {
    "client_id": CLIENT_ID,
    "client_secret": CLIENT_SECRET,
}


def extract_props(event):
    properties = event["requestBody"]["content"]["application/json"]["properties"]
    return {p["name"]: p["value"] for p in properties}


def build_response(event, status_code, body):
    return {
        "messageVersion": "1.0",
        "response": {
            "actionGroup": event["actionGroup"],
            "apiPath": event["apiPath"],
            "httpMethod": event["httpMethod"],
            "httpStatusCode": status_code,
            "responseBody": {"application/json": {"body": json.dumps(body)}},
        },
    }


def http_get(url, params=None, extra_headers=None):
    if params:
        url = f"{url}?{urllib.parse.urlencode({k: v for k, v in params.items() if v is not None})}"
    headers = {**BASE_HEADERS, **(extra_headers or {})}
    req = urllib.request.Request(url, headers=headers, method="GET")
    with urllib.request.urlopen(req) as resp:
        return resp.status, json.loads(resp.read().decode("utf-8"))


def http_put(url, payload, extra_headers=None):
    headers = {
        **BASE_HEADERS,
        "Content-Type": "application/json",
        **(extra_headers or {}),
    }
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="PUT"
    )
    with urllib.request.urlopen(req) as resp:
        return resp.status, resp.read().decode("utf-8")


def http_post(url, payload, extra_headers=None):
    headers = {
        **BASE_HEADERS,
        "Content-Type": "application/json",
        **(extra_headers or {}),
    }
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        return resp.status, resp.read().decode("utf-8")


def contact_lookup(event):
    props = extract_props(event)
    try:
        status, body = http_get(
            CONTACT_API_URL,
            params={
                "email": props.get("emailAddress"),
                "firstName": props.get("firstName"),
                "lastName": props.get("lastName"),
            },
        )
        return build_response(event, status, body)
    except urllib.error.HTTPError as e:
        error = json.dumps({"error": e.reason, "details": e.read().decode("utf-8")})
        return build_response(event, e.code, error)


def get_country_name(code):
    f = open("country_mapping.json", "r")
    data = json.load(f)
    f.close()
    return data[code]


def get_language_name(code):
    f = open("language_mapping.json", "r")
    data = json.load(f)
    f.close()
    return data[code]


def create_lead(event):
    props = extract_props(event)
    print("COUNTRY", get_country_name(props.get("country")))

    dt = datetime.now(timezone.utc)
    # timestamp_now = dt.replace(
    #     microsecond=0
    # ).isoformat()  # 2025-01-15T14:23:45+00:00
    timestamp_now = dt.strftime("%d/%m/%Y %H:%M:%S UTC")

    payload = [
        {
            "street": props.get("street"),
            "city": props.get("city"),
            "state": props.get("state"),
            "postalCode": props.get("postalCode"),
            "division": props.get("division", "ZC"),
            # 'businessUnitInter':  props.get('businessUnitInter'),
            "company": props.get("company"),
            "country": get_country_name(props.get("country")),
            "originatingCountry": get_country_name(props.get("originatingCountry")),
            "email": props.get("email"),
            "firstName": props.get("firstName"),
            "requestType": props.get("requestType", "General"),
            "lastName": props.get("lastName"),
            # lead subject
            # 'leadOrigin':         props.get('leadOrigin', 'Chatbot'),
            "leadOrigin": "Chatbot",
            "leadSource": "Contact Center",
            "description": f"<p>[{timestamp_now}]</p><p>{html.escape(props.get('description'))}</p>",
            "enableMarketingAutomationProcess": True,
            "preferredLanguage": get_language_name(
                props.get("preferredLanguage").split("_")[0]
            ),
            "phone": props.get("phone"),
        }
    ]
    try:
        status, body = http_post(LEAD_CREATE_URL, payload)
        resp = build_response(event, status, body)
        print(resp)
        return resp
    except urllib.error.HTTPError as e:
        error = json.dumps({"error": e.reason, "details": e.read().decode("utf-8")})
        resp = build_response(event, e.code, error)
        print(resp)
        return resp


def update_lead(event):
    props = extract_props(event)
    lead_number = props.get("leadNumber")
    try:
        status, body = http_get(
            LEAD_LOOKUP_URL,
            params={
                "leadQuery": f"Select id, Name,Lead_Number__c, Description from Lead where Lead_Number__c = '{lead_number}'",
            },
        )
        if len(body) == 0:
            error = json.dumps(
                {"error": "Lead doesn't exist", "details": e.read().decode("utf-8")}
            )
            return build_response(event, e.code, error)

        existing_description = body[0]["Description"]

        dt = datetime.now(timezone.utc)
        # timestamp_now = dt.replace(
        #     microsecond=0
        # ).isoformat()  # 2025-01-15T14:23:45+00:00
        timestamp_now = dt.strftime("%d/%m/%Y %H:%M:%S UTC")

        new_description = (
            existing_description
            + "<p><br></p>"
            + f"<p>[{timestamp_now}]</p><p>{html.escape(props.get('description'))}</p>"
        )

        # <p>udpated from GCC chat bot</p><p><br></p><p>[2026-04-13T12:51:46+00:00]</p><p>This is a new field in the lead</p>

        payload = [
            {
                "leadNumber": lead_number,
                "description": new_description,
            }
        ]
        status, body = http_put(LEAD_UPDATE_URL, payload)
        print(body)
        return build_response(event, status, body)
    except urllib.error.HTTPError as e:
        error = json.dumps({"error": e.reason, "details": e.read().decode("utf-8")})
        return build_response(event, e.code, error)


ROUTES = {
    ("/contact/lookup", "GET"): contact_lookup,
    ("/lead/create", "POST"): create_lead,
    ("/lead/update", "PUT"): update_lead,
}


def lambda_handler(event, context):
    print(json.dumps(event))
    key = (event.get("apiPath"), event.get("httpMethod", "").upper())
    handler = ROUTES.get(key)
    if not handler:
        return build_response(event, 404, {"error": f"Unknown route: {key}"})
    return handler(event)


# update_lead('20260331-yACiF')


for i in range(10):
    lambda_handler(
        {
            "messageVersion": "1.0",
            "parameters": [],
            "inputText": '{"label": "lead_update", "CustomerQuery": "update this data in descrption for lead 20260331-yACiF"}',
            "sessionAttributes": {},
            "promptSessionAttributes": {},
            "sessionId": "9bca4c0b-553a-43b6-af11-97abb43f1858",
            "agent": {
                "name": "euw-apm0018724-01-SIT-Bedrock-Escalation-Agent-02",
                "version": "4",
                "id": "W88TH3LYPA",
                "alias": "QT7NJHZB2U",
            },
            "httpMethod": "PUT",
            "actionGroup": "LeadUpdate",
            "apiPath": "/lead/update",
            "requestBody": {
                "content": {
                    "application/json": {
                        "properties": [
                            {
                                "name": "description",
                                "type": "string",
                                "value": f"continuation from API - {i+1}",
                            },
                            {
                                "name": "leadNumber",
                                "type": "string",
                                "value": "20260331-yACiF",
                            },
                        ]
                    }
                }
            },
        },
        {},
    )
