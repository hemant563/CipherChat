import requests

BASE_URL = "http://localhost:5001"
TIMEOUT = 30

def test_get_api_chats_retrieve_chats():
    # First, register and login a test user to get a valid JWT token
    register_url = f"{BASE_URL}/api/auth/register"
    login_url = f"{BASE_URL}/api/auth/login"
    create_chat_url = f"{BASE_URL}/api/chats"
    get_chats_url = f"{BASE_URL}/api/chats"
    delete_chat_url = f"{BASE_URL}/api/chats"

    test_mobile = "9998887776"
    test_username = "testuser_tc008"
    test_password = "TestPassword123!"

    headers = {"Content-Type": "application/json"}

    # Register user
    register_payload = {
        "mobile": test_mobile,
        "username": test_username,
        "password": test_password
    }
    try:
        reg_resp = requests.post(register_url, json=register_payload, headers=headers, timeout=TIMEOUT)
        # 201 if new user created or 400 if user exists
        assert reg_resp.status_code in (201, 400)
    except Exception as e:
        raise AssertionError(f"Failed at user registration step: {e}")

    # Login user
    login_payload = {
        "username": test_username,
        "password": test_password
    }
    try:
        login_headers = {"Content-Type": "application/json"}
        login_resp = requests.post(login_url, json=login_payload, headers=login_headers, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
        token = login_resp.json().get("token")
        assert token, "No JWT token returned on login"
    except Exception as e:
        raise AssertionError(f"Failed at user login step: {e}")

    auth_headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # Create a new chat with self as participant to ensure at least one chat exists
    chat_payload = {
        "participants": [test_username]
    }

    chat_id = None
    try:
        create_resp = requests.post(create_chat_url, json=chat_payload, headers=auth_headers, timeout=TIMEOUT)
        assert create_resp.status_code == 201, f"Chat creation failed: {create_resp.status_code} {create_resp.text}"
        chat_data = create_resp.json()
        chat_id = chat_data.get("id") or chat_data.get("_id")
        assert chat_id, "Created chat ID not returned"

        # Now test retrieving chats list
        get_resp = requests.get(get_chats_url, headers=auth_headers, timeout=TIMEOUT)
        assert get_resp.status_code == 200, f"Get chats failed with status {get_resp.status_code}"

        chats_list = get_resp.json()
        assert isinstance(chats_list, list), "Chats response is not a list"
        # Assert that the created chat is included in the chats list by id or unique field
        chat_ids = {c.get("id") or c.get("_id") for c in chats_list}
        assert chat_id in chat_ids, "Created chat not found in chats list"

    finally:
        # Cleanup: delete the created chat if exists
        if chat_id:
            try:
                del_resp = requests.delete(f"{delete_chat_url}/{chat_id}", headers=auth_headers, timeout=TIMEOUT)
                assert del_resp.status_code in (200, 204, 202), f"Failed to delete chat: {del_resp.status_code}"
            except Exception:
                pass

test_get_api_chats_retrieve_chats()
