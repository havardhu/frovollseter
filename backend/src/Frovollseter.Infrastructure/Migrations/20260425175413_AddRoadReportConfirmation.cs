using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Frovollseter.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRoadReportConfirmation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ConfirmedAt",
                table: "RoadReports",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ConfirmedById",
                table: "RoadReports",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_RoadReports_ConfirmedById",
                table: "RoadReports",
                column: "ConfirmedById");

            migrationBuilder.AddForeignKey(
                name: "FK_RoadReports_Users_ConfirmedById",
                table: "RoadReports",
                column: "ConfirmedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_RoadReports_Users_ConfirmedById",
                table: "RoadReports");

            migrationBuilder.DropIndex(
                name: "IX_RoadReports_ConfirmedById",
                table: "RoadReports");

            migrationBuilder.DropColumn(
                name: "ConfirmedAt",
                table: "RoadReports");

            migrationBuilder.DropColumn(
                name: "ConfirmedById",
                table: "RoadReports");
        }
    }
}
