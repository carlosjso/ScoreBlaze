using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ScoreBlaze.Models
{
    [Table("Marcadores")]
    public class Marcador
    {
        [Key]
        public long Id { get; set; }
        [Required]
        public long PartidoId { get; set; }
        public virtual Partido Partido { get; set; }
        public int PuntosEquipoA { get; set; }
        public int PuntosEquipoB { get; set; }
        public int FoulsEquipoA { get; set; }
        public int FoulsEquipoB { get; set; }
        [Required]
        public long CuartoId { get; set; }
        public virtual Cuarto Cuarto { get; set; }
    }
}
