FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY Frovollseter.sln .
COPY src/Frovollseter.Domain/Frovollseter.Domain.csproj src/Frovollseter.Domain/
COPY src/Frovollseter.Infrastructure/Frovollseter.Infrastructure.csproj src/Frovollseter.Infrastructure/
COPY src/Frovollseter.Application/Frovollseter.Application.csproj src/Frovollseter.Application/
COPY src/Frovollseter.Api/Frovollseter.Api.csproj src/Frovollseter.Api/

COPY . .
RUN dotnet publish src/Frovollseter.Api/Frovollseter.Api.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

RUN useradd -m appuser && chown -R appuser /app
USER appuser

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "Frovollseter.Api.dll"]
