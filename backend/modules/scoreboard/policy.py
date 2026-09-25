from core.exceptions import NotFoundException, ValidationException
from modules.matches.repositories import MatchRepository


class ScoreboardPolicy:
    def __init__(self, match_repo: MatchRepository):
        self.match_repo = match_repo

    def get_existing_match(self, match_id: int):
        match = self.match_repo.get(match_id)
        if not match:
            raise NotFoundException("Match not found")
        return match

    @staticmethod
    def ensure_scoreboard_open(match) -> None:
        league = getattr(match, "league", None)
        if str(getattr(match, "status", "scheduled")) == "finished":
            raise ValidationException(
                "El partido ya esta finalizado. Corrige el resultado desde Partidos para mantener sincronizada la llave."
            )
        if league is not None and str(getattr(league, "status", "")) == "Finalizada":
            raise ValidationException("La competencia esta finalizada y su marcador ya no admite cambios.")
        if (
            league is not None
            and str(getattr(league, "competition_type", "")) == "ELIMINATION"
            and not getattr(league, "bracket_state", None)
            and getattr(match, "bracket_round", None) is None
        ):
            raise ValidationException("Este cruce aun es un borrador. Pulsa Listo en Llaves antes de abrir el marcador.")
        match_stage = str(getattr(match, "competition_stage", "REGULAR_SEASON"))
        if league is not None and match_stage in {"REGULAR_SEASON", "GROUP_STAGE"} and getattr(league, "bracket_state", None):
            stage_label = "fase de grupos" if match_stage == "GROUP_STAGE" else "fase regular"
            raise ValidationException(
                f"La {stage_label} esta cerrada porque la llave ya fue generada. El marcador ya no puede alterar la tabla."
            )
