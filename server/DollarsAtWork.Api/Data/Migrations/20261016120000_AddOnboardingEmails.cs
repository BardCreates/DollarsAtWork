using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DollarsAtWork.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddOnboardingEmails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "NudgeEmailSentAt",
                table: "AspNetUsers",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "WelcomeEmailSentAt",
                table: "AspNetUsers",
                type: "datetimeoffset",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NudgeEmailSentAt",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "WelcomeEmailSentAt",
                table: "AspNetUsers");
        }
    }
}
