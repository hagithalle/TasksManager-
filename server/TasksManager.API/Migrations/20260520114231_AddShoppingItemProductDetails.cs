using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TasksManager.API.Migrations
{
    /// <inheritdoc />
    public partial class AddShoppingItemProductDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AlternativeBrandsJson",
                table: "ShoppingItems",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                table: "ShoppingItems",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NoteForBuyer",
                table: "ShoppingItems",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PreferredBrand",
                table: "ShoppingItems",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AlternativeBrandsJson",
                table: "ShoppingItems");

            migrationBuilder.DropColumn(
                name: "ImageUrl",
                table: "ShoppingItems");

            migrationBuilder.DropColumn(
                name: "NoteForBuyer",
                table: "ShoppingItems");

            migrationBuilder.DropColumn(
                name: "PreferredBrand",
                table: "ShoppingItems");
        }
    }
}
