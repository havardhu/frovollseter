using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Frovollseter.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class WebcamAccessLevels : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop the per-association access-grant table - we now use a simple
            // 3-level access enum on the WebcamStream itself.
            migrationBuilder.DropTable(name: "WebcamAccessGrants");

            // Add the new AccessLevel column. Default existing rows based on the
            // old IsPublic flag (true -> Public, false -> Members).
            migrationBuilder.AddColumn<string>(
                name: "AccessLevel",
                table: "WebcamStreams",
                type: "text",
                nullable: false,
                defaultValue: "Members");

            migrationBuilder.Sql(
                "UPDATE \"WebcamStreams\" SET \"AccessLevel\" = CASE WHEN \"IsPublic\" THEN 'Public' ELSE 'Members' END;");

            // Drop the old boolean column.
            migrationBuilder.DropColumn(
                name: "IsPublic",
                table: "WebcamStreams");

            // Add a FeedType column to distinguish static images from live video feeds.
            migrationBuilder.AddColumn<string>(
                name: "FeedType",
                table: "WebcamStreams",
                type: "text",
                nullable: false,
                defaultValue: "StaticImage");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsPublic",
                table: "WebcamStreams",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.Sql(
                "UPDATE \"WebcamStreams\" SET \"IsPublic\" = (\"AccessLevel\" = 'Public');");

            migrationBuilder.DropColumn(
                name: "AccessLevel",
                table: "WebcamStreams");

            migrationBuilder.DropColumn(
                name: "FeedType",
                table: "WebcamStreams");

            migrationBuilder.CreateTable(
                name: "WebcamAccessGrants",
                columns: table => new
                {
                    WebcamId = table.Column<System.Guid>(type: "uuid", nullable: false),
                    AssociationId = table.Column<System.Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WebcamAccessGrants", x => new { x.WebcamId, x.AssociationId });
                    table.ForeignKey(
                        name: "FK_WebcamAccessGrants_Associations_AssociationId",
                        column: x => x.AssociationId,
                        principalTable: "Associations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_WebcamAccessGrants_WebcamStreams_WebcamId",
                        column: x => x.WebcamId,
                        principalTable: "WebcamStreams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WebcamAccessGrants_AssociationId",
                table: "WebcamAccessGrants",
                column: "AssociationId");
        }
    }
}
