using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Pps.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddImportsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "imports",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    dataset_id = table.Column<long>(type: "bigint", nullable: false),
                    format = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    source = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    imported_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    imported_by_id = table.Column<long>(type: "bigint", nullable: false),
                    images_found = table.Column<int>(type: "integer", nullable: false),
                    images_registered = table.Column<int>(type: "integer", nullable: false),
                    images_skipped = table.Column<int>(type: "integer", nullable: false),
                    classes_matched = table.Column<int>(type: "integer", nullable: false),
                    classes_created = table.Column<int>(type: "integer", nullable: false),
                    annotations_created = table.Column<int>(type: "integer", nullable: false),
                    annotations_skipped = table.Column<int>(type: "integer", nullable: false),
                    report_json = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_imports", x => x.id);
                    table.ForeignKey(
                        name: "fk_imports_datasets_dataset_id",
                        column: x => x.dataset_id,
                        principalTable: "datasets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_imports_users_imported_by_id",
                        column: x => x.imported_by_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_imports_dataset_id_source",
                table: "imports",
                columns: new[] { "dataset_id", "source" });

            migrationBuilder.CreateIndex(
                name: "ix_imports_imported_by_id",
                table: "imports",
                column: "imported_by_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "imports");
        }
    }
}
