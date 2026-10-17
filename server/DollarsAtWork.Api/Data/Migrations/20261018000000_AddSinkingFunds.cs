using DollarsAtWork.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DollarsAtWork.Api.Data.Migrations
{
    /// <summary>SavingsGoal.RepeatMonths: a sinking fund for a bill that comes back every so many months.</summary>
    [DbContext(typeof(AppDbContext))]
    [Migration("20261018000000_AddSinkingFunds")]
    public partial class AddSinkingFunds : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(name: "RepeatMonths", table: "SavingsGoals", type: "int", nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "RepeatMonths", table: "SavingsGoals");
        }
    }
}
