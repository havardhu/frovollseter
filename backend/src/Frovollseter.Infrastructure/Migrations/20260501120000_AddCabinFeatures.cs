using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Frovollseter.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCabinFeatures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Cabin
            migrationBuilder.CreateTable(
                name: "Cabins",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    CreatedById = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Cabins", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Cabins_Users_CreatedById",
                        column: x => x.CreatedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Cabins_CreatedById",
                table: "Cabins",
                column: "CreatedById");

            // CabinMembership — composite PK
            migrationBuilder.CreateTable(
                name: "CabinMemberships",
                columns: table => new
                {
                    CabinId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Role = table.Column<string>(type: "text", nullable: false),
                    JoinedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    AddedById = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CabinMemberships", x => new { x.CabinId, x.UserId });
                    table.ForeignKey(
                        name: "FK_CabinMemberships_Cabins_CabinId",
                        column: x => x.CabinId,
                        principalTable: "Cabins",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CabinMemberships_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CabinMemberships_Users_AddedById",
                        column: x => x.AddedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CabinMemberships_UserId",
                table: "CabinMemberships",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_CabinMemberships_AddedById",
                table: "CabinMemberships",
                column: "AddedById");

            // CabinStorage
            migrationBuilder.CreateTable(
                name: "CabinStorages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CabinId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Icon = table.Column<string>(type: "text", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    IsTempControlled = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CabinStorages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CabinStorages_Cabins_CabinId",
                        column: x => x.CabinId,
                        principalTable: "Cabins",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CabinStorages_CabinId_SortOrder",
                table: "CabinStorages",
                columns: new[] { "CabinId", "SortOrder" });

            // CabinGroceryItem — the "invisible dictionary" per cabin
            migrationBuilder.CreateTable(
                name: "CabinGroceryItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CabinId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    NormalizedName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    LastUsedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UseCount = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CabinGroceryItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CabinGroceryItems_Cabins_CabinId",
                        column: x => x.CabinId,
                        principalTable: "Cabins",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CabinGroceryItems_CabinId_NormalizedName",
                table: "CabinGroceryItems",
                columns: new[] { "CabinId", "NormalizedName" },
                unique: true);

            // InventoryItem
            migrationBuilder.CreateTable(
                name: "InventoryItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CabinId = table.Column<Guid>(type: "uuid", nullable: false),
                    StorageId = table.Column<Guid>(type: "uuid", nullable: false),
                    GroceryItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    ExpiryDate = table.Column<DateOnly>(type: "date", nullable: true),
                    AddedById = table.Column<Guid>(type: "uuid", nullable: false),
                    AddedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InventoryItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InventoryItems_Cabins_CabinId",
                        column: x => x.CabinId,
                        principalTable: "Cabins",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_InventoryItems_CabinStorages_StorageId",
                        column: x => x.StorageId,
                        principalTable: "CabinStorages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_InventoryItems_CabinGroceryItems_GroceryItemId",
                        column: x => x.GroceryItemId,
                        principalTable: "CabinGroceryItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_InventoryItems_Users_AddedById",
                        column: x => x.AddedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_InventoryItems_CabinId_StorageId_ExpiryDate",
                table: "InventoryItems",
                columns: new[] { "CabinId", "StorageId", "ExpiryDate" });

            migrationBuilder.CreateIndex(
                name: "IX_InventoryItems_CabinId_GroceryItemId",
                table: "InventoryItems",
                columns: new[] { "CabinId", "GroceryItemId" });

            migrationBuilder.CreateIndex(
                name: "IX_InventoryItems_StorageId",
                table: "InventoryItems",
                column: "StorageId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryItems_GroceryItemId",
                table: "InventoryItems",
                column: "GroceryItemId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryItems_AddedById",
                table: "InventoryItems",
                column: "AddedById");

            // ShoppingListItem
            migrationBuilder.CreateTable(
                name: "ShoppingListItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CabinId = table.Column<Guid>(type: "uuid", nullable: false),
                    GroceryItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    Note = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    AddedById = table.Column<Guid>(type: "uuid", nullable: false),
                    AddedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    PurchasedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    PurchasedById = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShoppingListItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShoppingListItems_Cabins_CabinId",
                        column: x => x.CabinId,
                        principalTable: "Cabins",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ShoppingListItems_CabinGroceryItems_GroceryItemId",
                        column: x => x.GroceryItemId,
                        principalTable: "CabinGroceryItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ShoppingListItems_Users_AddedById",
                        column: x => x.AddedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ShoppingListItems_Users_PurchasedById",
                        column: x => x.PurchasedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            // Filtered index for the dominant query: "active items for this cabin".
            migrationBuilder.CreateIndex(
                name: "IX_ShoppingListItems_CabinId_Active",
                table: "ShoppingListItems",
                column: "CabinId",
                filter: "\"PurchasedAt\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_ShoppingListItems_CabinId_PurchasedAt",
                table: "ShoppingListItems",
                columns: new[] { "CabinId", "PurchasedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ShoppingListItems_GroceryItemId",
                table: "ShoppingListItems",
                column: "GroceryItemId");

            migrationBuilder.CreateIndex(
                name: "IX_ShoppingListItems_AddedById",
                table: "ShoppingListItems",
                column: "AddedById");

            migrationBuilder.CreateIndex(
                name: "IX_ShoppingListItems_PurchasedById",
                table: "ShoppingListItems",
                column: "PurchasedById");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "ShoppingListItems");
            migrationBuilder.DropTable(name: "InventoryItems");
            migrationBuilder.DropTable(name: "CabinGroceryItems");
            migrationBuilder.DropTable(name: "CabinStorages");
            migrationBuilder.DropTable(name: "CabinMemberships");
            migrationBuilder.DropTable(name: "Cabins");
        }
    }
}
