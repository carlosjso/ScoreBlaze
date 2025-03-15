using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ScoreBlaze.Models
{
    [Table("Cuartos")]
    public class Cuarto
    {
        [Key]
        public long Id { get; set; }
        [Required]
        public TipoCuarto Cuartoo { get; set; }
    }

    public enum TipoCuarto
    {
        Primer = 1,
        Segundo = 2,
        Tercer = 3,
        Cuarto = 4,
        Extra = 5
    }
}
