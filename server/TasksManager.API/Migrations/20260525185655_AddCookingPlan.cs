using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TasksManager.API.Migrations
{
    /// <inheritdoc />
    public partial class AddCookingPlan : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CookingItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PersonalListId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    RecipeUrl = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    IngredientsJson = table.Column<string>(type: "text", nullable: true),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    PlannedDate = table.Column<DateOnly>(type: "date", nullable: true),
                    TagsJson = table.Column<string>(type: "text", nullable: true),
                    LinkedShoppingListId = table.Column<Guid>(type: "uuid", nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CookingItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CookingItems_PersonalLists_PersonalListId",
                        column: x => x.PersonalListId,
                        principalTable: "PersonalLists",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CookingItems_PersonalListId",
                table: "CookingItems",
                column: "PersonalListId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CookingItems");
        }
    }
}
