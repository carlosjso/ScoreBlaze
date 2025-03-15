using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ScoreBlaze.Models
{
    [Table("Equipos")]
    public class Equipo
    {
        [Key]
        public long Id { get; set; }
        [StringLength(250)]
        public string Nombre { get; set; } = string.Empty;
    }
}
