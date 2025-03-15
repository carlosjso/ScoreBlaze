using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ScoreBlaze.Models
{
    [Table("Jugadores")]
    public class Jugador
    {
        [Key]
        public long Id { get; set; }
        [StringLength(250)]
        public string Nombre { get; set; } = string.Empty;
        public int Num { get; set; }
        [Required]
        public long EquipoId { get; set; }
        public virtual Equipo Equipo { get; set; }
    }
}
