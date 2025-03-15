using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ScoreBlaze.Models
{
    [Table("Fouls")]
    public class Foul
    {
        [Key]
        public long Id { get; set; }
        [Required]
        [ForeignKey("JugadorPartido")]
        public long JugadorPId { get; set; }
        public virtual JugadorPartido JugadorPartido { get; set; }
        public int foul { get; set; }
    }
}
