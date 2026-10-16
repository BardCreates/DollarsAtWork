using DollarsAtWork.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DollarsAtWork.Api.Data.Migrations
{
    /// <summary>AppUser.OnboardingEmailsOff: set by the unsubscribe link in onboarding emails.</summary>
    [DbContext(typeof(AppDbContext))]
    [Migration("20261016200000_AddOnboardingEmailsOff")]
    public partial class AddOnboardingEmailsOff : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "OnboardingEmailsOff",
                table: "AspNetUsers",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OnboardingEmailsOff",
                table: "AspNetUsers");
        }
    }
}
