using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TasksManager.API.Migrations
{
    /// <inheritdoc />
    public partial class AddShareInvites : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ShareInvites",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Token = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ResourceType = table.Column<string>(type: "text", nullable: false),
                    ResourceId = table.Column<Guid>(type: "uuid", nullable: false),
                    OwnerId = table.Column<Guid>(type: "uuid", nullable: false),
                    AcceptedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    AcceptedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShareInvites", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShareInvites_Users_AcceptedByUserId",
                        column: x => x.AcceptedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ShareInvites_Users_OwnerId",
                        column: x => x.OwnerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ShareInvites_AcceptedByUserId",
                table: "ShareInvites",
                column: "AcceptedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ShareInvites_OwnerId",
                table: "ShareInvites",
                column: "OwnerId");

            migrationBuilder.CreateIndex(
                name: "IX_ShareInvites_Token",
                table: "ShareInvites",
                column: "Token",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ShareInvites");
        }
    }
}
