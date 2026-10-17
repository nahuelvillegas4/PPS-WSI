# Etapa 1: Build y compilación con el SDK completo de .NET 8
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

# Copiar archivos de solución y proyectos para optimizar el caché de capas de Docker
COPY PpsPlatform.sln ./
COPY src/Pps.Domain/Pps.Domain.csproj src/Pps.Domain/
COPY src/Pps.Infrastructure/Pps.Infrastructure.csproj src/Pps.Infrastructure/
COPY src/Pps.Api/Pps.Api.csproj src/Pps.Api/

RUN dotnet restore

# Copiar el código fuente completo y compilar
COPY src/ src/
WORKDIR /app/src/Pps.Api
RUN dotnet publish -c Release -o /app/out --no-restore

# Etapa 2: Runtime ligero de ASP.NET Core 8
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/out ./

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Development

ENTRYPOINT ["dotnet", "Pps.Api.dll"]
