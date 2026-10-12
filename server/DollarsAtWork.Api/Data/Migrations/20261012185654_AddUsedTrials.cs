using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DollarsAtWork.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddUsedTrials : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "UsedTrials",
                columns: table => new
                {
                    EmailHash = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    UsedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UsedTrials", x => x.EmailHash);
                });

            // Everyone who already has an account has had their trial. The hash matches AccountSetup.HashEmail
            // (SHA-256 of the trimmed, upper-cased address as UTF-8).
            migrationBuilder.Sql(
                """
                INSERT INTO UsedTrials (EmailHash, UsedAt)
                SELECT DISTINCT CONVERT(varchar(64), HASHBYTES('SHA2_256', CAST(UPPER(LTRIM(RTRIM(Email))) AS varchar(256))), 2), SYSDATETIMEOFFSET()
                FROM AspNetUsers
                WHERE Email IS NOT NULL
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UsedTrials");
        }
    }
}
