using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ScoreBlaze.Models
{
    [Table("JugadorPartidos")]
    public class JugadorPartido
    {
        [Key]
        public long Id { get; set; }
        [Required]
        public long JugadorId { get; set; }
        public virtual Jugador Jugador { get; set; }
        [Required]
        public long PartidoId { get; set; }
        public virtual Partido Partido { get; set; }
        [Required]
        public long MarcadorId { get; set; }
        public virtual Marcador Marcador { get; set; }
    }
}
