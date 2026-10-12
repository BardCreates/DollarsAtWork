using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DollarsAtWork.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddNetWorth : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DebtDoneDestination",
                table: "Plans",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Investments");

            migrationBuilder.AddColumn<decimal>(
                name: "IncomeGrowthRate",
                table: "Plans",
                type: "decimal(19,4)",
                precision: 19,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "InflationRate",
                table: "Plans",
                type: "decimal(19,4)",
                precision: 19,
                scale: 4,
                nullable: false,
                defaultValue: 3m);

            migrationBuilder.AddColumn<string>(
                name: "SavingsDoneDestination",
                table: "Plans",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Investments");

            migrationBuilder.CreateTable(
                name: "NetWorthSnapshots",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    Assets = table.Column<decimal>(type: "decimal(19,4)", precision: 19, scale: 4, nullable: false),
                    Liabilities = table.Column<decimal>(type: "decimal(19,4)", precision: 19, scale: 4, nullable: false),
                    NetWorth = table.Column<decimal>(type: "decimal(19,4)", precision: 19, scale: 4, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NetWorthSnapshots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NetWorthSnapshots_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OtherItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    Kind = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Type = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Value = table.Column<decimal>(type: "decimal(19,4)", precision: 19, scale: 4, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OtherItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OtherItems_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NetWorthSnapshots_UserId_Date",
                table: "NetWorthSnapshots",
                columns: new[] { "UserId", "Date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OtherItems_UserId_SortOrder",
                table: "OtherItems",
                columns: new[] { "UserId", "SortOrder" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NetWorthSnapshots");

            migrationBuilder.DropTable(
                name: "OtherItems");

            migrationBuilder.DropColumn(
                name: "DebtDoneDestination",
                table: "Plans");

            migrationBuilder.DropColumn(
                name: "IncomeGrowthRate",
                table: "Plans");

            migrationBuilder.DropColumn(
                name: "InflationRate",
                table: "Plans");

            migrationBuilder.DropColumn(
                name: "SavingsDoneDestination",
                table: "Plans");
        }
    }
}
