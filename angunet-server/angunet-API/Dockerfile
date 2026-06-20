FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["angunet-API/angunet-API.csproj", "angunet-API/"]
RUN dotnet restore "angunet-API/angunet-API.csproj"

COPY . .
WORKDIR /src/angunet-API
RUN dotnet publish "angunet-API.csproj" \
    --configuration Release \
    --output /app/publish \
    --no-restore \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
EXPOSE 8080

COPY --from=build /app/publish .

USER app
ENTRYPOINT ["dotnet", "angunet-API.dll"]
