using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ScoreBlaze.Models
{
    [Table("Puntos")]
    public class Punto
    {
        [Key]
        public long Id { set; get; }
        [Required]
        [ForeignKey("JugadorPartido")]
        public long JugadorPId { get; set; }
        public virtual JugadorPartido JugadorPartido { get; set; }
        public int Puntos { get; set; }
    }
}
