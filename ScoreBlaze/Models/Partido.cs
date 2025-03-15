using Microsoft.AspNetCore.Antiforgery;
using Microsoft.VisualBasic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ScoreBlaze.Models
{
    [Table("Partidos")]
    public class Partido
    {
        [Key]
        public long Id { get; set; }
        [Required]
        [ForeignKey("EquipoA")]
        public long EquipoAId { get; set; }
        public virtual Equipo EquipoA { get; set; }
        [Required]
        [ForeignKey("EquipoB")]
        public long EquipoBId { get; set; }
        public virtual Equipo EquipoB { get; set; }
        public DateTime Fecha { get; set; }  
    }
}
