import unittest

from core.exceptions import ConflictException, NotFoundException, ValidationException


class AppExceptionsTest(unittest.TestCase):
    def test_exception_status_codes(self):
        self.assertEqual(ValidationException("Invalid").status_code, 400)
        self.assertEqual(NotFoundException("Missing").status_code, 404)
        self.assertEqual(ConflictException("Duplicate").status_code, 409)


if __name__ == "__main__":
    unittest.main()

