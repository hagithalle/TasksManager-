using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TasksManager.API.Migrations
{
    /// <inheritdoc />
    public partial class AddReminderOffsetAndLastCompleted : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "LastCompletedDate",
                table: "Tasks",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ReminderOffsetMinutes",
                table: "Tasks",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LastCompletedDate",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "ReminderOffsetMinutes",
                table: "Tasks");
        }
    }
}
