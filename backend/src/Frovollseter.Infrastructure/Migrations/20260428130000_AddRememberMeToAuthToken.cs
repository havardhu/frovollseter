using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Frovollseter.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRememberMeToAuthToken : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "RememberMe",
                table: "AuthTokens",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RememberMe",
                table: "AuthTokens");
        }
    }
}
