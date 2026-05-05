import base64
import unittest

from core.exceptions import AppException
from utils.media import decode_base64_payload


class MediaUtilsTest(unittest.TestCase):
    def test_decode_base64_payload_accepts_plain_payload(self):
        payload = base64.b64encode(b"scoreblaze").decode("ascii")

        self.assertEqual(decode_base64_payload(payload, "Invalid"), b"scoreblaze")

    def test_decode_base64_payload_accepts_data_url_payload(self):
        payload = base64.b64encode(b"logo").decode("ascii")

        self.assertEqual(decode_base64_payload(f"data:image/png;base64,{payload}", "Invalid"), b"logo")

    def test_decode_base64_payload_returns_none_for_empty_value(self):
        self.assertIsNone(decode_base64_payload(None, "Invalid"))
        self.assertIsNone(decode_base64_payload("", "Invalid"))

    def test_decode_base64_payload_rejects_invalid_value(self):
        with self.assertRaisesRegex(AppException, "Invalid media"):
            decode_base64_payload("not-base64", "Invalid media")


if __name__ == "__main__":
    unittest.main()
