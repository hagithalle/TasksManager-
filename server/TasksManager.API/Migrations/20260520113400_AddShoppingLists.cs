using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TasksManager.API.Migrations
{
    /// <inheritdoc />
    public partial class AddShoppingLists : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ListType",
                table: "PersonalLists",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "ShoppingItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PersonalListId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Quantity = table.Column<decimal>(type: "numeric(10,3)", precision: 10, scale: 3, nullable: true),
                    Unit = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Department = table.Column<string>(type: "text", nullable: false),
                    ItemType = table.Column<string>(type: "text", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsBought = table.Column<bool>(type: "boolean", nullable: false),
                    BoughtAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    LastBoughtAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShoppingItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShoppingItems_PersonalLists_PersonalListId",
                        column: x => x.PersonalListId,
                        principalTable: "PersonalLists",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ShoppingListSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PersonalListId = table.Column<Guid>(type: "uuid", nullable: false),
                    EnableSmartSuggestions = table.Column<bool>(type: "boolean", nullable: false),
                    OccasionalIntervalDays = table.Column<int>(type: "integer", nullable: false),
                    GroupByDepartment = table.Column<bool>(type: "boolean", nullable: false),
                    ShowBoughtSection = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShoppingListSettings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShoppingListSettings_PersonalLists_PersonalListId",
                        column: x => x.PersonalListId,
                        principalTable: "PersonalLists",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ShoppingItems_PersonalListId",
                table: "ShoppingItems",
                column: "PersonalListId");

            migrationBuilder.CreateIndex(
                name: "IX_ShoppingListSettings_PersonalListId",
                table: "ShoppingListSettings",
                column: "PersonalListId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ShoppingItems");

            migrationBuilder.DropTable(
                name: "ShoppingListSettings");

            migrationBuilder.DropColumn(
                name: "ListType",
                table: "PersonalLists");
        }
    }
}
