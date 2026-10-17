using DollarsAtWork.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DollarsAtWork.Api.Data.Migrations
{
    /// <summary>Debt.PromoApr and Debt.PromoEndsMonth: a promotional rate (a 0% balance transfer) and its last month.</summary>
    [DbContext(typeof(AppDbContext))]
    [Migration("20261017230000_AddDebtPromo")]
    public partial class AddDebtPromo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "PromoApr",
                table: "Debts",
                type: "decimal(19,4)",
                precision: 19,
                scale: 4,
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "PromoEndsMonth",
                table: "Debts",
                type: "date",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PromoApr",
                table: "Debts");

            migrationBuilder.DropColumn(
                name: "PromoEndsMonth",
                table: "Debts");
        }
    }
}
