using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ScoreBlaze.Models
{
    [Table("Resultados")]
    public class Resultado
    {
        [Key] 
        public int Id { get; set; }
        [Required]
        public long PartidoId { get; set; }
        public virtual Partido Partido { get; set; }
        public int PuntosEquipoA { get; set; }
        public int PuntosEquipoB { get; set; }
        [Required]
        public long MarcadorId { get; set; }
        public virtual Marcador Marcador { get; set; }
    }
}
