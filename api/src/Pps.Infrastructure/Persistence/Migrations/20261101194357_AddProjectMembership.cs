using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pps.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectMembership : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "project_members",
                columns: table => new
                {
                    project_id = table.Column<long>(type: "bigint", nullable: false),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    role = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    granted_by_user_id = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_project_members", x => new { x.project_id, x.user_id });
                    table.CheckConstraint("ck_project_members_role", "role IN ('viewer', 'annotator', 'project-admin')");
                    table.ForeignKey(
                        name: "fk_project_members_projects_project_id",
                        column: x => x.project_id,
                        principalTable: "projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_project_members_users_granted_by_user_id",
                        column: x => x.granted_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_project_members_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_project_members_granted_by_user_id",
                table: "project_members",
                column: "granted_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_project_members_user_id",
                table: "project_members",
                column: "user_id");

            // El UPDATE va ANTES del CHECK: con filas 'annotator' existentes, agregar primero ck_users_role fallaría.
            // Todo lo que no sea 'admin' pasa a 'user'. No se rellenan membresías: se parte de cero (ADR-15).
            migrationBuilder.Sql("UPDATE users SET role = 'user' WHERE role <> 'admin';");

            migrationBuilder.AddCheckConstraint(
                name: "ck_users_role",
                table: "users",
                sql: "role IN ('admin', 'user')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_users_role",
                table: "users");

            // Se restablece el rol global anterior. Las membresías se pierden al borrar la tabla.
            migrationBuilder.Sql("UPDATE users SET role = 'annotator' WHERE role = 'user';");

            migrationBuilder.DropTable(
                name: "project_members");
        }
    }
}
