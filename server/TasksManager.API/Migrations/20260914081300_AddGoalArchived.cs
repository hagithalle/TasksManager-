using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TasksManager.API.Migrations
{
    /// <inheritdoc />
    public partial class AddGoalArchived : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ArchivedAt",
                table: "Goals",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsArchived",
                table: "Goals",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ArchivedAt",
                table: "Goals");

            migrationBuilder.DropColumn(
                name: "IsArchived",
                table: "Goals");
        }
    }
}
