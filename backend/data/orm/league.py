import base64

from sqlalchemy import BigInteger, Boolean, CheckConstraint, Column, Date, Integer, JSON, LargeBinary, String
from sqlalchemy.orm import relationship

from database.alchemy import Base


class League(Base):
    __tablename__ = "leagues"
    __table_args__ = (
        CheckConstraint("length(name) > 0", name="ck_leagues_name_not_empty"),
        CheckConstraint("length(category) > 0", name="ck_leagues_category_not_empty"),
        CheckConstraint("start_date <= end_date", name="ck_leagues_schedule"),
        CheckConstraint(
            "status IN ('Sin empezar', 'En curso', 'Finalizada')",
            name="ck_leagues_status",
        ),
        CheckConstraint(
            "competition_type IN ('LEAGUE', 'ELIMINATION')",
            name="ck_leagues_competition_type",
        ),
        CheckConstraint(
            (
                "final_phase_preset IN ("
                "'TOP_4_SINGLE_GAME', "
                "'TOP_8_SINGLE_GAME', "
                "'TOP_8_HOME_AWAY', "
                "'TOP_6_SINGLE_GAME_WITH_BYES', "
                "'TOP_16_SINGLE_GAME', "
                "'TOP_32_SINGLE_GAME', "
                "'NBA_PLAY_IN_TOP_10', "
                "'DOUBLE_ELIMINATION_TOP_8', "
                "'DOUBLE_ELIMINATION_TOP_16', "
                "'CUSTOM'"
                ")"
            ),
            name="ck_leagues_final_phase_preset",
        ),
        CheckConstraint(
            "final_phase_qualified_teams BETWEEN 2 AND 32",
            name="ck_leagues_final_phase_qualified_teams",
        ),
        CheckConstraint(
            "final_phase_byes >= 0 AND final_phase_byes < final_phase_qualified_teams",
            name="ck_leagues_final_phase_byes",
        ),
        CheckConstraint(
            "final_phase_format IN ('SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'PLAY_IN_PLUS_BRACKET')",
            name="ck_leagues_final_phase_format",
        ),
        CheckConstraint(
            "final_phase_round_best_of IN (1, 3, 5, 7)",
            name="ck_leagues_final_phase_round_best_of",
        ),
        CheckConstraint(
            "final_phase_final_best_of IN (1, 3, 5, 7)",
            name="ck_leagues_final_phase_final_best_of",
        ),
        CheckConstraint(
            "final_phase_play_in_slots >= 0 AND final_phase_play_in_slots < final_phase_qualified_teams",
            name="ck_leagues_final_phase_play_in_slots",
        ),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    name = Column(String(80), nullable=False, unique=True, index=True)
    responsible_name = Column(String(100), nullable=False)
    responsible_email = Column(String(120), nullable=False)
    category = Column(String(80), nullable=False)
    status = Column(String(20), nullable=False, default="Sin empezar", server_default="Sin empezar", index=True)
    competition_type = Column(String(20), nullable=False, default="LEAGUE", server_default="LEAGUE", index=True)
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=False, index=True)
    logo = Column(LargeBinary, nullable=True)
    tracked_stats = Column(JSON, nullable=False, default=list)
    final_phase_enabled = Column(Boolean, nullable=False, default=False, server_default="false")
    final_phase_preset = Column(
        String(40),
        nullable=False,
        default="TOP_8_SINGLE_GAME",
        server_default="TOP_8_SINGLE_GAME",
    )
    final_phase_qualified_teams = Column(Integer, nullable=False, default=8, server_default="8")
    final_phase_byes = Column(Integer, nullable=False, default=0, server_default="0")
    final_phase_format = Column(
        String(40),
        nullable=False,
        default="SINGLE_ELIMINATION",
        server_default="SINGLE_ELIMINATION",
    )
    final_phase_two_legs = Column(Boolean, nullable=False, default=False, server_default="false")
    final_phase_third_place_match = Column(Boolean, nullable=False, default=False, server_default="false")
    final_phase_seeded_home_advantage = Column(Boolean, nullable=False, default=True, server_default="true")
    final_phase_play_in_slots = Column(Integer, nullable=False, default=0, server_default="0")
    final_phase_round_best_of = Column(Integer, nullable=False, default=1, server_default="1")
    final_phase_final_best_of = Column(Integer, nullable=False, default=1, server_default="1")
    final_phase_reseed_each_round = Column(Boolean, nullable=False, default=False, server_default="false")
    final_phase_grand_final_reset = Column(Boolean, nullable=False, default=False, server_default="false")

    team_memberships = relationship(
        "LeagueTeamMembership",
        back_populates="league",
        cascade="all, delete-orphan",
        order_by="LeagueTeamMembership.sort_order",
    )
    matches = relationship("Match", back_populates="league")
    stat_snapshot = relationship(
        "LeagueStat",
        back_populates="league",
        uselist=False,
        cascade="all, delete-orphan",
    )

    @property
    def logo_base64(self) -> str | None:
        if self.logo is None:
            return None
        return base64.b64encode(self.logo).decode("utf-8")

    @property
    def team_ids(self) -> list[int]:
        return [membership.team_id for membership in self.team_memberships]

    def __repr__(self) -> str:  # pragma: no cover
        return f"League(id={self.id}, name={self.name})"
