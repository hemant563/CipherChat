import requests
import uuid
import random
import string

BASE_URL = "http://localhost:5001"
TIMEOUT = 30

def random_mobile_number():
    return "999" + "".join(random.choices(string.digits, k=7))

def random_username():
    return "user_" + uuid.uuid4().hex[:8]

def register_user(mobile, username, password):
    url = f"{BASE_URL}/api/auth/register"
    payload = {
        "mobile": mobile,
        "username": username,
        "password": password
    }
    response = requests.post(url, json=payload, timeout=TIMEOUT)
    response.raise_for_status()
    assert response.status_code == 201
    return response.json()

def login_user(username, password):
    url = f"{BASE_URL}/api/auth/login"
    payload = {
        "username": username,
        "password": password
    }
    response = requests.post(url, json=payload, timeout=TIMEOUT)
    response.raise_for_status()
    assert response.status_code == 200
    token = response.json().get("token")
    assert token and isinstance(token, str)
    return token

def create_chat(token, participants):
    url = f"{BASE_URL}/api/chats"
    headers = {
        "Authorization": f"Bearer {token}"
    }
    payload = {
        "participants": participants
    }
    response = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    return response

def delete_chat(token, chat_id):
    url = f"{BASE_URL}/api/chats/{chat_id}"
    headers = {
        "Authorization": f"Bearer {token}"
    }
    # Assuming DELETE method is available to delete chat, if not skip
    try:
        response = requests.delete(url, headers=headers, timeout=TIMEOUT)
        if response.status_code not in (200, 204, 404):
            response.raise_for_status()
    except requests.HTTPError:
        pass

def test_post_api_chats_create_chat():
    password = "Passw0rd!23"
    # Register two users to create a chat between them
    mobile1 = random_mobile_number()
    username1 = random_username()
    register_user(mobile1, username1, password)

    mobile2 = random_mobile_number()
    username2 = random_username()
    register_user(mobile2, username2, password)

    # Login first user to get JWT token
    token = login_user(username1, password)

    chat_id = None
    try:
        # Create chat with the second user as participant by username
        # Using usernames as participant identifiers to preserve privacy per PRD
        response = create_chat(token, [username2])
        assert response.status_code == 201
        chat = response.json()
        # Validate chat details structure minimally
        assert "id" in chat and isinstance(chat["id"], str)
        assert "participants" in chat and isinstance(chat["participants"], list)
        assert username1 in chat["participants"] or username2 in chat["participants"]
        chat_id = chat["id"]
    finally:
        if chat_id:
            delete_chat(token, chat_id)

test_post_api_chats_create_chat()