import hashlib
import hmac
import os


PBKDF2_ALGORITHM = "sha256"
PBKDF2_ITERATIONS = 390000
SALT_SIZE = 16


def hash_password(password: str) -> str:
    if not password:
        raise ValueError("Password is required")

    salt = os.urandom(SALT_SIZE)
    derived_key = hashlib.pbkdf2_hmac(
        PBKDF2_ALGORITHM,
        password.encode("utf-8"),
        salt,
        PBKDF2_ITERATIONS,
    )
    return (
        f"pbkdf2_{PBKDF2_ALGORITHM}$"
        f"{PBKDF2_ITERATIONS}$"
        f"{salt.hex()}$"
        f"{derived_key.hex()}"
    )


def verify_password(password: str, encoded_password: str) -> bool:
    try:
        scheme, iterations_str, salt_hex, hash_hex = encoded_password.split("$", maxsplit=3)
    except ValueError:
        return False

    if scheme != f"pbkdf2_{PBKDF2_ALGORITHM}":
        return False

    try:
        iterations = int(iterations_str)
        salt = bytes.fromhex(salt_hex)
        expected_hash = bytes.fromhex(hash_hex)
    except ValueError:
        return False

    calculated_hash = hashlib.pbkdf2_hmac(
        PBKDF2_ALGORITHM,
        password.encode("utf-8"),
        salt,
        iterations,
    )
    return hmac.compare_digest(calculated_hash, expected_hash)
