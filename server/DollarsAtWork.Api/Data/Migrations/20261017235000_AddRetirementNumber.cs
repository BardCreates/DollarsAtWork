using DollarsAtWork.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DollarsAtWork.Api.Data.Migrations
{
    /// <summary>The retirement number's inputs on the plan: birth year, retirement age, spending and other income then.</summary>
    [DbContext(typeof(AppDbContext))]
    [Migration("20261017235000_AddRetirementNumber")]
    public partial class AddRetirementNumber : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(name: "BirthYear", table: "Plans", type: "int", nullable: true);
            migrationBuilder.AddColumn<int>(name: "RetirementAge", table: "Plans", type: "int", nullable: true);
            migrationBuilder.AddColumn<decimal>(name: "RetirementSpendingMonthly", table: "Plans", type: "decimal(19,4)", precision: 19, scale: 4, nullable: true);
            migrationBuilder.AddColumn<decimal>(name: "RetirementIncomeMonthly", table: "Plans", type: "decimal(19,4)", precision: 19, scale: 4, nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "BirthYear", table: "Plans");
            migrationBuilder.DropColumn(name: "RetirementAge", table: "Plans");
            migrationBuilder.DropColumn(name: "RetirementSpendingMonthly", table: "Plans");
            migrationBuilder.DropColumn(name: "RetirementIncomeMonthly", table: "Plans");
        }
    }
}
