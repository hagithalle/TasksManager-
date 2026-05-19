using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TasksManager.API.Migrations
{
    /// <inheritdoc />
    public partial class AddUserSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "UserSettings",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    GoalCategoriesJson = table.Column<string>(type: "text", nullable: false,
                        defaultValue: """["home","work","health","personal"]"""),
                    CoachTone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false,
                        defaultValue: "encouraging"),
                    CoachFrequency = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false,
                        defaultValue: "daily"),
                    WorkStartHour = table.Column<int>(type: "integer", nullable: false,
                        defaultValue: 8),
                    WorkEndHour = table.Column<int>(type: "integer", nullable: false,
                        defaultValue: 20),
                    FirstDayOfWeek = table.Column<int>(type: "integer", nullable: false,
                        defaultValue: 0),
                    Language = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false,
                        defaultValue: "en"),
                    DefaultReminderMinutes = table.Column<int>(type: "integer", nullable: false,
                        defaultValue: 30),
                    PushNotificationsEnabled = table.Column<bool>(type: "boolean", nullable: false,
                        defaultValue: true),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserSettings", x => x.UserId);
                    table.ForeignKey(
                        name: "FK_UserSettings_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "UserSettings");
        }
    }
}
