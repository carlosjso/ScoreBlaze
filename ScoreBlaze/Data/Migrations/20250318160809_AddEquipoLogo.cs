using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ScoreBlaze.Migrations
{
    /// <inheritdoc />
    public partial class AddEquipoLogo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<byte[]>(
                name: "Logo",
                table: "Equipos",
                type: "longblob",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Logo",
                table: "Equipos");
        }
    }
}
