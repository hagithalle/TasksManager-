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
            migrationBuilder.Sql(@"UPDATE ""Goals"" SET ""Category"" = LOWER(""Category"")");

            // Alter Category column: text → varchar(100)
            migrationBuilder.Sql(@"ALTER TABLE ""Goals"" ALTER COLUMN ""Category"" TYPE character varying(100) USING ""Category""::character varying(100)");

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

            migrationBuilder.Sql(@"ALTER TABLE ""Goals"" ALTER COLUMN ""Category"" TYPE text USING ""Category""::text");
        }
    }
}
