import unittest

from pydantic import ValidationError

from modules.players.schemas import PlayerCreate


def build_player_payload(**overrides):
    return {
        "name": "Alex Rivera",
        "email": "alex@example.com",
        "sex": None,
        **overrides,
    }


class PlayerSexSchemaTests(unittest.TestCase):
    def test_accepts_supported_or_empty_values(self):
        for sex in (None, "Masculino", "Femenino", ""):
            with self.subTest(sex=sex):
                player = PlayerCreate.model_validate(build_player_payload(sex=sex))

                self.assertEqual(player.sex, sex or None)

    def test_rejects_unknown_values(self):
        with self.assertRaises(ValidationError):
            PlayerCreate.model_validate(build_player_payload(sex="Mixto"))


if __name__ == "__main__":
    unittest.main()
