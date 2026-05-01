using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Frovollseter.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class NewsPostAssociationOptional : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop the existing FK so we can change the cascade behaviour.
            migrationBuilder.DropForeignKey(
                name: "FK_NewsPosts_Associations_AssociationId",
                table: "NewsPosts");

            // Make the column nullable. Existing rows keep their value.
            migrationBuilder.AlterColumn<System.Guid>(
                name: "AssociationId",
                table: "NewsPosts",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(System.Guid),
                oldType: "uuid");

            // Re-add the FK as optional with SET NULL so deleting an association
            // doesn't cascade-delete its news posts.
            migrationBuilder.AddForeignKey(
                name: "FK_NewsPosts_Associations_AssociationId",
                table: "NewsPosts",
                column: "AssociationId",
                principalTable: "Associations",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_NewsPosts_Associations_AssociationId",
                table: "NewsPosts");

            // Restore NOT NULL. Any existing global posts (NULL) would block this –
            // callers must handle that before rolling back.
            migrationBuilder.AlterColumn<System.Guid>(
                name: "AssociationId",
                table: "NewsPosts",
                type: "uuid",
                nullable: false,
                defaultValue: System.Guid.Empty,
                oldClrType: typeof(System.Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_NewsPosts_Associations_AssociationId",
                table: "NewsPosts",
                column: "AssociationId",
                principalTable: "Associations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
