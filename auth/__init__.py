"""
JWT-based authentication with bcrypt password hashing.
"""
from __future__ import annotations

import os
import time
import bcrypt
import jwt

JWT_SECRET = os.environ.get("JWT_SECRET", "radiomed-dev-secret-change-in-prod")
JWT_ALG = "HS256"
JWT_TTL_HOURS = 24


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except Exception:
        return False


def issue_token(user_id: int, email: str, name: str, role: str) -> str:
    now = int(time.time())
    payload = {
        "sub": str(user_id),
        "uid": user_id,
        "email": email,
        "name": name,
        "role": role,
        "iat": now,
        "exp": now + JWT_TTL_HOURS * 3600,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def verify_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        if "uid" in payload and "sub" not in payload:
            payload["sub"] = payload["uid"]
        elif "sub" in payload:
            try:
                payload["sub"] = int(payload["sub"])
            except (TypeError, ValueError):
                pass
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
