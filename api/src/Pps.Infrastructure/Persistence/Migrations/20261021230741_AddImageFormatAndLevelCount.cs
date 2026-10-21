using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pps.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddImageFormatAndLevelCount : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "format",
                table: "images",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "png");

            migrationBuilder.AddColumn<int>(
                name: "level_count",
                table: "images",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.CreateIndex(
                name: "ix_images_dataset_id_storage_key",
                table: "images",
                columns: new[] { "dataset_id", "storage_key" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_images_dataset_id_storage_key",
                table: "images");

            migrationBuilder.DropColumn(
                name: "format",
                table: "images");

            migrationBuilder.DropColumn(
                name: "level_count",
                table: "images");
        }
    }
}
