using DollarsAtWork.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DollarsAtWork.Api.Data.Migrations
{
    /// <summary>
    /// InvestmentAccount.PayrollMonthly: what already goes into the account from the paycheck (added on top of the plan).
    /// InvestmentAccount.MatchSalaryYearly: the salary before taxes that an employer's match limit is a percent of.
    /// Plan.RaiseToInvestments: each yearly raise is added to the Investments amount instead of Remaining.
    /// </summary>
    [DbContext(typeof(AppDbContext))]
    [Migration("20261017200000_AddPayrollAndRaise")]
    public partial class AddPayrollAndRaise : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "PayrollMonthly",
                table: "InvestmentAccounts",
                type: "decimal(19,4)",
                precision: 19,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "MatchSalaryYearly",
                table: "InvestmentAccounts",
                type: "decimal(19,4)",
                precision: 19,
                scale: 4,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "RaiseToInvestments",
                table: "Plans",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PayrollMonthly",
                table: "InvestmentAccounts");

            migrationBuilder.DropColumn(
                name: "MatchSalaryYearly",
                table: "InvestmentAccounts");

            migrationBuilder.DropColumn(
                name: "RaiseToInvestments",
                table: "Plans");
        }
    }
}
