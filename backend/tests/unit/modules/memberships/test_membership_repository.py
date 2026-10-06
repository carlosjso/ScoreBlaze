import unittest
from types import SimpleNamespace

from modules.memberships.repositories import MembershipRepository


class MembershipRepositoryShirtNumberTest(unittest.TestCase):
    def _repository_with(self, *memberships):
        repository = object.__new__(MembershipRepository)
        repository.list_by_team = lambda _team_id: list(memberships)
        return repository

    def test_first_automatic_number_has_no_leading_zero(self):
        repository = self._repository_with()

        self.assertEqual(repository.next_available_shirt_number(10), "1")

    def test_automatic_number_skips_registered_numbers(self):
        repository = self._repository_with(
            SimpleNamespace(player_id=1, shirt_number="1"),
            SimpleNamespace(player_id=2, shirt_number="02"),
        )

        self.assertEqual(repository.next_available_shirt_number(10), "2")

    def test_leading_zero_is_preserved_as_an_explicit_different_number(self):
        repository = self._repository_with(
            SimpleNamespace(player_id=1, shirt_number="01"),
        )

        self.assertTrue(repository.is_shirt_number_available(10, "1"))
        self.assertFalse(repository.is_shirt_number_available(10, "01"))
        self.assertTrue(
            repository.is_shirt_number_available(
                10,
                "1",
                exclude_player_id=1,
            )
        )


if __name__ == "__main__":
    unittest.main()
