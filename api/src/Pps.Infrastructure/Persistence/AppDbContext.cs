namespace Pps.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;
using Pps.Domain.Auth;
using Pps.Domain.Catalog;
using Pps.Domain.Images;
using Pps.Domain.Annotations;
using Pps.Domain.Import;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Dataset> Datasets => Set<Dataset>();
    public DbSet<LabelClass> LabelClasses => Set<LabelClass>();
    public DbSet<MedicalImage> Images => Set<MedicalImage>();
    public DbSet<Annotation> Annotations => Set<Annotation>();
    public DbSet<ImportRecord> Imports => Set<ImportRecord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // 1. Users
        modelBuilder.Entity<User>(b =>
        {
            b.HasKey(u => u.Id);
            b.HasIndex(u => u.Username).IsUnique();
            b.Property(u => u.Username).HasMaxLength(100).IsRequired();
            b.Property(u => u.Role).HasMaxLength(50).IsRequired();
        });

        // 2. Projects
        modelBuilder.Entity<Project>(b =>
        {
            b.HasKey(p => p.Id);
            b.HasIndex(p => p.Name).IsUnique();
            b.Property(p => p.Name).HasMaxLength(200).IsRequired();
        });

        // 3. Datasets
        modelBuilder.Entity<Dataset>(b =>
        {
            b.HasKey(d => d.Id);
            b.Property(d => d.Name).HasMaxLength(200).IsRequired();
            b.HasOne(d => d.Project)
                .WithMany(p => p.Datasets)
                .HasForeignKey(d => d.ProjectId)
                .OnDelete(DeleteBehavior.Restrict);

            // Clave única alternativa para claves foráneas compuestas (ADR-07)
            b.HasAlternateKey(d => d.Id);
        });

        // 4. LabelClasses
        modelBuilder.Entity<LabelClass>(b =>
        {
            b.HasKey(c => c.Id);
            b.Property(c => c.Name).HasMaxLength(100).IsRequired();
            b.Property(c => c.Color).HasMaxLength(7).IsRequired();
            b.HasOne(c => c.Dataset)
                .WithMany(d => d.Classes)
                .HasForeignKey(c => c.DatasetId)
                .OnDelete(DeleteBehavior.Restrict);

            // Clave única alternativa para clave foránea compuesta desde Annotations
            b.HasAlternateKey(c => new { c.DatasetId, c.Id });
        });

        // 5. Images
        modelBuilder.Entity<MedicalImage>(b =>
        {
            b.HasKey(i => i.Id);
            b.Property(i => i.StorageKey).HasMaxLength(500).IsRequired();
            b.Property(i => i.OriginalFilename).HasMaxLength(500).IsRequired();
            b.Property(i => i.Kind).HasMaxLength(50).IsRequired();
            b.Property(i => i.Format).HasMaxLength(20).IsRequired().HasDefaultValue("png");
            b.Property(i => i.LevelCount).IsRequired().HasDefaultValue(1);
            b.HasOne(i => i.Dataset)
                .WithMany(d => d.Images)
                .HasForeignKey(i => i.DatasetId)
                .OnDelete(DeleteBehavior.Restrict);

            // Clave única alternativa para clave foránea compuesta desde Annotations
            b.HasAlternateKey(i => new { i.DatasetId, i.Id });

            // Restricción única para evitar registrar dos veces el mismo storageKey en el mismo dataset (ADR-07, OpenAPI 409 already-registered)
            b.HasIndex(i => new { i.DatasetId, i.StorageKey }).IsUnique();
        });

        // 6. Annotations
        modelBuilder.Entity<Annotation>(b =>
        {
            b.HasKey(a => a.Id);

            // Geometría en nivel 0 almacenada directamente en jsonb (ADR-07)
            b.Property(a => a.GeometryJson)
                .HasColumnType("jsonb")
                .IsRequired();

            b.Property(a => a.ProvenanceJson)
                .HasColumnType("jsonb");

            b.Property(a => a.Source).HasMaxLength(50).IsRequired();

            // Clave foránea compuesta hacia LabelClass: (dataset_id, class_id) -> label_classes(dataset_id, id)
            b.HasOne(a => a.Class)
                .WithMany()
                .HasForeignKey(a => new { a.DatasetId, a.ClassId })
                .HasPrincipalKey(c => new { c.DatasetId, c.Id })
                .OnDelete(DeleteBehavior.Restrict);

            // Clave foránea compuesta hacia MedicalImage: (dataset_id, image_id) -> images(dataset_id, id)
            b.HasOne(a => a.Image)
                .WithMany(i => i.Annotations)
                .HasForeignKey(a => new { a.DatasetId, a.ImageId })
                .HasPrincipalKey(i => new { i.DatasetId, i.Id })
                .OnDelete(DeleteBehavior.Restrict);

            // Autor
            b.HasOne(a => a.Author)
                .WithMany()
                .HasForeignKey(a => a.AuthorId)
                .OnDelete(DeleteBehavior.Restrict);

            // Concurrencia optimista / token de versión (ADR-07, §8.2)
            if (Database.IsNpgsql())
            {
                b.Property(a => a.Version).IsRowVersion();
            }
            else
            {
                b.Property(a => a.Version).HasDefaultValue(1u);
            }

            // Filtro global para borrado lógico (ADR-07)
            b.HasQueryFilter(a => a.DeletedAt == null);
        });

        // 7. Imports (ADR-09)
        modelBuilder.Entity<ImportRecord>(b =>
        {
            b.HasKey(i => i.Id);

            b.Property(i => i.Format).HasMaxLength(32).IsRequired();
            b.Property(i => i.Source).HasMaxLength(256).IsRequired();

            if (Database.IsNpgsql())
            {
                b.Property(i => i.ReportJson)
                    .HasColumnType("jsonb")
                    .IsRequired();
            }
            else
            {
                b.Property(i => i.ReportJson)
                    .IsRequired();
            }

            b.HasOne(i => i.Dataset)
                .WithMany()
                .HasForeignKey(i => i.DatasetId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasOne(i => i.ImportedBy)
                .WithMany()
                .HasForeignKey(i => i.ImportedById)
                .OnDelete(DeleteBehavior.Restrict);

            // Índice para acelerar consulta y verificación de fuentes ya importadas por dataset (409 already-imported)
            b.HasIndex(i => new { i.DatasetId, i.Source });
        });
    }
}
