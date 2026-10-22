# Etapa 1: Build y compilación con el SDK completo de .NET 10
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /app

# Copiar archivos de solución y proyectos para optimizar el caché de capas de Docker
COPY PpsPlatform.sln ./
COPY src/Pps.Domain/Pps.Domain.csproj src/Pps.Domain/
COPY src/Pps.Infrastructure/Pps.Infrastructure.csproj src/Pps.Infrastructure/
COPY src/Pps.Api/Pps.Api.csproj src/Pps.Api/
COPY tests/Pps.Domain.Tests/Pps.Domain.Tests.csproj tests/Pps.Domain.Tests/

RUN dotnet restore

# Copiar el código fuente completo y compilar
COPY src/ src/
WORKDIR /app/src/Pps.Api
RUN dotnet publish -c Release -o /app/out --no-restore

# Etapa 2: Runtime ligero de ASP.NET Core 10 con curl para healthcheck (§7.1)
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/out ./

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

ENTRYPOINT ["dotnet", "Pps.Api.dll"]
