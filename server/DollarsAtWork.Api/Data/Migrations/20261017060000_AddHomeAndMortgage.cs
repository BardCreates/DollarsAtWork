using DollarsAtWork.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DollarsAtWork.Api.Data.Migrations
{
    /// <summary>
    /// OtherItem.YearlyChangePercent: how a home or car moves in value each year (0 keeps it flat).
    /// Debt.MinimumOnly: a mortgage that stays out of the payoff order and only ever gets its minimum.
    /// </summary>
    [DbContext(typeof(AppDbContext))]
    [Migration("20261017060000_AddHomeAndMortgage")]
    public partial class AddHomeAndMortgage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "YearlyChangePercent",
                table: "OtherItems",
                type: "decimal(19,4)",
                precision: 19,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<bool>(
                name: "MinimumOnly",
                table: "Debts",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "YearlyChangePercent",
                table: "OtherItems");

            migrationBuilder.DropColumn(
                name: "MinimumOnly",
                table: "Debts");
        }
    }
}
