import requests

BASE_URL = "http://localhost:5001"
TIMEOUT = 30

# Using fixed user details for registration and login
USER_REGISTER_PAYLOAD = {
    "email": "testuser9@example.com",
    "password": "StrongPass!9",
    "role": "tenant",
    "name": "Test User 9"
}

GROUP_CREATE_PAYLOAD = {
    "name": "Test Group TC009",
    "description": "Test group for TC009 test case",
    "isPublic": True
}


def test_post_api_v1_groups_groupid_join_joingroup():
    session = requests.Session()
    user_token = None
    group_id = None

    try:
        # Register user
        resp_register = session.post(
            f"{BASE_URL}/api/v1/auth/register",
            json=USER_REGISTER_PAYLOAD,
            timeout=TIMEOUT
        )
        assert resp_register.status_code == 201, f"User registration failed: {resp_register.text}"

        # Login user
        login_payload = {
            "email": USER_REGISTER_PAYLOAD["email"],
            "password": USER_REGISTER_PAYLOAD["password"]
        }
        resp_login = session.post(
            f"{BASE_URL}/api/v1/auth/login",
            json=login_payload,
            timeout=TIMEOUT
        )
        assert resp_login.status_code == 200, f"User login failed: {resp_login.text}"
        login_data = resp_login.json()
        assert "token" in login_data, "No auth token in login response"
        user_token = login_data["token"]

        headers_auth = {
            "Authorization": f"Bearer {user_token}",
            "Content-Type": "application/json"
        }

        # Create a new group to have a valid groupId
        resp_create_group = session.post(
            f"{BASE_URL}/api/v1/groups",
            headers=headers_auth,
            json=GROUP_CREATE_PAYLOAD,
            timeout=TIMEOUT
        )
        assert resp_create_group.status_code == 201, f"Group creation failed: {resp_create_group.text}"
        created_group = resp_create_group.json()
        assert "id" in created_group or "_id" in created_group, "Group creation response missing id"
        group_id = created_group.get("id") or created_group.get("_id")
        assert group_id, "Group id is empty"

        # Join the created group
        resp_join = session.post(
            f"{BASE_URL}/api/v1/groups/{group_id}/join",
            headers=headers_auth,
            timeout=TIMEOUT
        )
        assert resp_join.status_code == 200, f"Join group failed: {resp_join.text}"

        # Optionally verify response content for membership confirmation
        join_resp_json = resp_join.json()
        assert (
            "membership" in join_resp_json or "message" in join_resp_json
        ), "Join group response missing confirmation"

    finally:
        # Cleanup: delete group if created
        if group_id and user_token:
            try:
                headers_auth = {"Authorization": f"Bearer {user_token}"}
                delete_resp = session.delete(
                    f"{BASE_URL}/api/v1/groups/{group_id}",
                    headers=headers_auth,
                    timeout=TIMEOUT,
                )
                # We do not assert here as cleanup may fail if not allowed
            except Exception:
                pass

        # Cleanup: delete user if possible (optional, no endpoint data available)
        # Skipping user deletion as PRD doesn't specify such endpoint


test_post_api_v1_groups_groupid_join_joingroup()