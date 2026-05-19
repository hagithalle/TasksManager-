using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TasksManager.API.Migrations
{
    /// <inheritdoc />
    public partial class AddRecurrenceAndReminder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Normalize Goal.Category to lowercase (was stored as PascalCase enum name)
            migrationBuilder.Sql(@"UPDATE ""Goals"" SET ""Category"" = LOWER(""Category"") WHERE ""Category"" ~ '[A-Z]'");

            // Alter Category column to allow any string (no constraint change needed – already varchar)
            migrationBuilder.AlterColumn<string>(
                name: "Category",
                table: "Goals",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            // Add ReminderAt to Tasks
            migrationBuilder.AddColumn<DateTime>(
                name: "ReminderAt",
                table: "Tasks",
                type: "timestamp with time zone",
                nullable: true);

            // Add RecurrenceType to Tasks
            migrationBuilder.AddColumn<string>(
                name: "RecurrenceType",
                table: "Tasks",
                type: "text",
                nullable: false,
                defaultValue: "None");

            // Add RecurrenceInterval to Tasks
            migrationBuilder.AddColumn<int>(
                name: "RecurrenceInterval",
                table: "Tasks",
                type: "integer",
                nullable: false,
                defaultValue: 1);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "ReminderAt",          table: "Tasks");
            migrationBuilder.DropColumn(name: "RecurrenceType",      table: "Tasks");
            migrationBuilder.DropColumn(name: "RecurrenceInterval",  table: "Tasks");

            migrationBuilder.AlterColumn<string>(
                name: "Category",
                table: "Goals",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100);
        }
    }
}
