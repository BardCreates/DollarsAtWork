using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DollarsAtWork.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSnapshotBreakdown : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "Debts",
                table: "NetWorthSnapshots",
                type: "decimal(19,4)",
                precision: 19,
                scale: 4,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Investments",
                table: "NetWorthSnapshots",
                type: "decimal(19,4)",
                precision: 19,
                scale: 4,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Savings",
                table: "NetWorthSnapshots",
                type: "decimal(19,4)",
                precision: 19,
                scale: 4,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Debts",
                table: "NetWorthSnapshots");

            migrationBuilder.DropColumn(
                name: "Investments",
                table: "NetWorthSnapshots");

            migrationBuilder.DropColumn(
                name: "Savings",
                table: "NetWorthSnapshots");
        }
    }
}
